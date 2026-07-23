"""Dispatch gouverné de la chaîne Forge — la porte unique.

`prepare_dispatch(etape)` charge le contrat de l'étape, le valide (refuse si
incomplet), fabrique le payload borné et APPEND un enregistrement d'audit. Il ne
spawn AUCUN agent : l'orchestrateur (le skill /forge) réalise le spawn réel avec
le payload retourné. Le contrat reste la porte de contrôle, chaque dispatch est
auditable (connecteur 2 léger + auditabilité connecteur 3).

Enforcement doctrinal (ADR-002 gate 2) : aucun sous-agent Forge ne doit être
lancé sans passer par cette fonction. Le durcissement « hook » est ultérieur.
"""
from __future__ import annotations

import json
import logging
import time
from pathlib import Path

from forge.contract import (
    REPO_ROOT,
    ContractIncomplete,
    DispatchPayload,
    build_dispatch_payload,
    load_contract,
)

# La couche « fichier d'audit » (événements, enregistrement signé, écriture, lecture)
# vit dans `forge.audit`, module STDLIB-ONLY. Raison : le garde de spawn
# (`forge.hook_guard`) est fail-CLOSED en périmètre Forge — s'il ne peut pas s'importer,
# il refuse TOUT spawn Forge. Il ne doit donc pas traverser ce module-ci, qui dépend de
# `forge.contract` -> `yaml` (absent hors venv, c.-à-d. dans les worktrees).
# Les noms ci-dessous sont RÉ-EXPORTÉS : `from forge.dispatch import DEFAULT_AUDIT /
# EVENT_* / verify_audit_line / append_spawn_event / spawn_proof / ...` reste valide
# (driver.py et les tests existants en dépendent), avec exactement le même objet.
from forge.audit import (  # noqa: F401 — ré-exports d'API historique, usage indirect
    DEFAULT_AUDIT,
    EVENT_AUTHORIZED,
    EVENT_EXECUTED,
    EVENT_PREPARED,
    SPAWN_EVENTS,
    DispatchRecord,
    _append_audit,
    _iter_audit_records,
    append_spawn_event,
    sign_audit_record,
    spawn_proof,
    verify_audit_line,
)

logger = logging.getLogger(__name__)

# Ordre logique de la chaîne (les 13 étapes-agents qui ont un contrat).
ORDER = [
    "s0-contrat",
    "s1-prisme",
    "s2-worldscan",
    "s3-decompo",
    "s4-archi",
    "s5-wiremap",
    "s6-redteam-plan",
    "s9-build",
    "s10a-oracle-code",
    "s10b-oracle-archi",
    "s10c-oracle-wiremap",
    "s11-redteam-code",
    "s12-verdict",
]

# Étapes déterministes (non-LLM) : exécutées par oracle, pas par un agent LLM.
# Invariant couvert par un test existant (test_dispatch.test_order_covers_the_agent_steps) :
# DETERMINISTIC ⊆ ORDER. Reste vrai ICI — les 4 étapes ci-dessous sont toutes des membres
# canoniques de "full". Une étape déterministe qui vit HORS ORDER (profil dédié) va dans
# DEDICATED_DETERMINISTIC_STEPS ci-dessous, PAS ici : mélanger casserait à la fois cet
# invariant et `plan_chain(profile="full")` (qui n'a que les étapes de ORDER).
DETERMINISTIC = ("s10a-oracle-code", "s10b-oracle-archi", "s10c-oracle-wiremap", "s12-verdict")

# Étapes déterministes qui vivent HORS de ORDER, jumelles de DEDICATED_PROFILE_STEPS mais
# pour la catégorie « oracle non-LLM » plutôt que « agent LLM ». s10s-oracle-standard (les
# six oracles du STANDARD, scripts/forge/standard_oracles.py) n'est dispatchable que via le
# profil dédié `standard` (cf. DEDICATED_PROFILE_STEPS et PROFILES["standard"] plus bas) —
# jamais dans `full`. Séparée de DETERMINISTIC pour ne PAS casser l'invariant DETERMINISTIC
# ⊆ ORDER ci-dessus (contrat déjà vérifié par un test existant, non modifiable). Utiliser
# `is_deterministic_step(etape)` pour tester l'UNE ou l'AUTRE catégorie.
DEDICATED_DETERMINISTIC_STEPS = ("s10s-oracle-standard",)


def is_deterministic_step(etape: str) -> bool:
    """Vrai si `etape` est un oracle non-LLM — canonique (DETERMINISTIC, dans ORDER)
    OU dédié (DEDICATED_DETERMINISTIC_STEPS, hors ORDER, profil dédié uniquement)."""
    return etape in DETERMINISTIC or etape in DEDICATED_DETERMINISTIC_STEPS

# Étapes délibérément HORS de ORDER (la chaîne canonique greenfield "full") mais
# réellement contractualisées, prouvées en vivo, et dispatchables via un profil
# DÉDIÉ — jamais silencieusement incluses dans "full". Une étape n'entre ici
# qu'après une preuve en vivo distincte (cf. FORGE_STATE_SNAPSHOT/notes du contrat) ;
# rester hors de ORDER est une décision de portée, pas un oubli. `s2.5-artbible`
# (Tier 3 #7, Art Director) : 6 runs réels (2 non-adversariaux + 4 adversariaux) +
# gate 4 Qwen + fix v0.1 + preuve v0.1 finale, cf. docs/forge/S2_5_ARTBIBLE_*.md.
# `s9-build-standard` / `s10s-oracle-standard` (curriculum de jeux, 2026-07-22) : la
# variante STANDARD contrat/repo/wiremap du build et de son oracle — dispatchable
# UNIQUEMENT via le profil dédié `standard`, jamais mêlée à "full" (le squelette gelé
# est un mode opératoire distinct du greenfield Prisme->WireMap classique).
DEDICATED_PROFILE_STEPS = ("s2.5-artbible", "s9-build-standard", "s10s-oracle-standard")

# Profils de chaîne — sous-ensembles de ORDER (ou de DEDICATED_PROFILE_STEPS ci-dessus)
# pour des usages plus courts que le greenfield complet. `patch` = un fix sur un projet
# existant (build -> oracle code -> red-team code -> verdict) : les oracles archi/
# wiremap n'y sont pas applicables et seront émis SKIPPED (reçu signé) au verdict.
# `review` = red-team d'un plan seul. `artbible` = Art Director seul (Tier 3 #7) : un
# profil dédié, PAS ajouté à `full` — décision explicite de portée (Pierre,
# 2026-07-14), suppose product_snapshot.md déjà produit (même convention que `review`
# qui suppose blueprint/wiremap déjà produits).
PROFILES = {
    "full": tuple(ORDER),
    "patch": ("s9-build", "s10a-oracle-code", "s11-redteam-code", "s12-verdict"),
    "review": ("s6-redteam-plan",),
    # micro : une tâche triviale (fonction pure, one-liner). Proportionnalité : pas
    # de red-team ni de design — build -> oracle code -> verdict. Évite la cérémonie
    # 13 étapes sur 78 lignes (finding red-team chesscolor). archi/wiremap = SKIPPED.
    "micro": ("s9-build", "s10a-oracle-code", "s12-verdict"),
    "artbible": ("s2.5-artbible",),
    # increment : un incrément sur un projet existant dont le corpus de design (bibles)
    # est déjà la source de vérité — saute s0/s1/s2 (charter/prisme/world scan, déjà
    # couverts) mais REFAIT archi/wiremap contrairement à `patch`, parce qu'un moteur
    # multi-incréments a justement le plus besoin de deps_interdites et de wiremap à
    # jour à chaque incrément (cf. FORGE_PLAN_PROPOSAL.md §5 R1, ratifié Pierre 2026-07-19).
    "increment": (
        "s3-decompo",
        "s4-archi",
        "s5-wiremap",
        "s6-redteam-plan",
        "s9-build",
        "s10a-oracle-code",
        "s10b-oracle-archi",
        "s10c-oracle-wiremap",
        "s11-redteam-code",
        "s12-verdict",
    ),
    # standard : curriculum de jeux (Pong -> ...) sur squelette gelé (scripts/forge/standard/).
    # Remplace s9-build par son jumeau STANDARD (s9-build-standard, hors ORDER par décision
    # explicite — cf. DEDICATED_PROFILE_STEPS) ; GARDE s10a-oracle-code (le gate mutation/
    # e2e/solvabilité générique reste applicable) et AJOUTE s10s-oracle-standard (les six
    # oracles du squelette, jumeau déterministe de s9-build-standard, également hors ORDER) ;
    # garde s11-redteam-code (advisory) et s12-verdict (agrégation signée) de la chaîne
    # canonique. Pas d'archi/wiremap génériques (s10b/s10c) : c'est s10s qui en tient lieu
    # pour cette variante — décision de portée, ratifiée Pierre 2026-07-22, PAS dans "full".
    "standard": (
        "s9-build-standard",
        "s10a-oracle-code",
        "s10s-oracle-standard",
        "s11-redteam-code",
        "s12-verdict",
    ),
}


def order_for_profile(profile: str = "full") -> list[str]:
    """Étapes d'un profil, dans l'ordre. Profil inconnu => ValueError (fail-fast)."""
    try:
        return list(PROFILES[profile])
    except KeyError:
        raise ValueError(f"profil inconnu {profile!r} (attendu: {', '.join(PROFILES)})")


def profile_allowed_for_contract(etape: str, profile: str) -> bool:
    """Vrai ssi `etape` appartient au `profile` — appartenance profil->étapes (D1).

    Source de vérité UNIQUE : `order_for_profile` (les PROFILES déjà testés). Pas de
    2e source divergente (pas de champ `allowed_profiles` dans les contrats YAML).
    Profil inconnu => ValueError propagé (fail-fast, comme `order_for_profile`).
    """
    return etape in order_for_profile(profile)


def prepare_dispatch(
    etape: str,
    run_id: str,
    caps_path: Path | None = None,
    audit_path: Path | None = None,
    *,
    profile: str | None = None,
    attempt: int = 0,
    allow_unprofiled: bool = False,
) -> DispatchPayload:
    """Valide le contrat de l'étape, fabrique le payload borné, trace l'audit.

    Ne spawn rien : retourne le payload que l'orchestrateur donnera au sous-agent.

    Appartenance profil (D1) : si `profile` est fourni ET que `etape` n'en fait pas
    partie ET que `allow_unprofiled` est faux => `ContractIncomplete` (contrat non
    dispatchable dans ce profil). `allow_unprofiled=True` autorise la dérogation et
    l'inscrit (`unprofiled: true`) dans le corps SIGNÉ de la ligne d'audit. `profile=None`
    => aucun contrôle (comportement historique strictement inchangé, rétro-compat totale).
    `attempt` corrèle la ligne au triplet du marqueur de spawn (unicité D4).
    """
    contract = load_contract(etape)
    payload = build_dispatch_payload(contract, etape=etape, caps_path=caps_path)
    unprofiled = False
    if profile is not None and not profile_allowed_for_contract(etape, profile):
        if not allow_unprofiled:
            raise ContractIncomplete(
                f"étape {etape!r} hors du profil {profile!r} "
                f"(non membre de order_for_profile({profile!r})) — dispatch refusé ; "
                f"utilise allow_unprofiled=True pour un run hors-profil assumé"
            )
        unprofiled = True
    _append_audit(
        DispatchRecord(
            run_id=run_id,
            etape=etape,
            capability_role=contract["capability_role"],
            model=payload.model,
            provider=payload.provider,
            allowed_tools=payload.allowed_tools,
            ts=time.time(),
            event="spawn_prepared",
            attempt=attempt,
            unprofiled=unprofiled,
        ),
        audit_path,
    )
    logger.info("dispatch préparé : run=%s étape=%s modèle=%s", run_id, etape, payload.model)
    return payload


def plan_chain(
    run_id: str = "dryrun",
    caps_path: Path | None = None,
    audit_path: Path | None = None,
    profile: str = "full",
) -> list[DispatchPayload]:
    """Dry-run : prépare le dispatch des étapes du profil, sans spawn. Preuve de câblage."""
    return [prepare_dispatch(e, run_id, caps_path=caps_path, audit_path=audit_path)
            for e in order_for_profile(profile)]


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Dispatch gouverné de la chaîne Forge.")
    parser.add_argument("--dry-run", action="store_true", help="planifie la chaîne sans spawn")
    parser.add_argument("--profile", default="full", choices=sorted(PROFILES),
                        help="profil de chaîne (full / patch / review / micro / artbible)")
    parser.add_argument("--spawn-proof", metavar="RUN_ID",
                        help="preuve d'action d'un run : préparés / autorisés / exécutés")
    parser.add_argument("--audit", metavar="PATH", default=None,
                        help=f"fichier d'audit à lire (défaut: {DEFAULT_AUDIT})")
    args = parser.parse_args()
    if args.spawn_proof:
        proof = spawn_proof(args.spawn_proof,
                            audit_path=Path(args.audit) if args.audit else None)
        print(json.dumps(proof, ensure_ascii=False, indent=2))
    elif args.dry_run:
        audit = REPO_ROOT / "lab" / "forge_evidence" / "dispatch_dryrun.jsonl"
        plan = plan_chain(run_id="dryrun", audit_path=audit, profile=args.profile)
        print(f"Chaîne Forge [{args.profile}] — {len(plan)} étapes planifiées (aucun spawn) :")
        for p in plan:
            kind = "déterministe" if is_deterministic_step(p.etape) else "LLM"
            print(f"  {p.etape:22} [{kind:12}] -> {p.model}")
        print(f"Audit : {audit}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
