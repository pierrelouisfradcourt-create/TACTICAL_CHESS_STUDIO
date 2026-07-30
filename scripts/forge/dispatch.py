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
# `s9-build-godot-standard` (curriculum de jeux, cible Godot ratifiée Pierre 2026-07-28) :
# jumeau Godot de s9-build-standard — dispatchable UNIQUEMENT via le profil dédié
# `standard_godot`, jamais mêlée à "full". `s9-build-godot` (étape 0, brique M01, contrat
# historique du 2026-07-21) reste HORS de tout profil : il n'appartient ni à ORDER, ni à
# DEDICATED_PROFILE_STEPS — c'est une trace figée, pas un builder de curriculum.
DEDICATED_PROFILE_STEPS = (
    "s2.5-artbible",
    "s9-build-standard",
    "s10s-oracle-standard",
    "s9-build-godot-standard",
)

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
    # standard_godot : jumeau Godot de `standard` (cible Godot ratifiée Pierre 2026-07-28).
    # CE QUI CHANGE vs `standard` : s9-build-standard (web/JS) est remplacé par son jumeau
    # s9-build-godot-standard (GDScript, projet Godot, oracle headless) — hors ORDER par la
    # même décision de portée (cf. DEDICATED_PROFILE_STEPS). CE QUI NE CHANGE PAS : s10a-
    # oracle-code reste applicable (gate mutation/e2e/solvabilité générique, ici sur du
    # GDScript) ; s10s-oracle-standard porte toujours les six oracles du squelette gelé
    # (line_states, placement, collisions, index, contract_completeness, budget), agnostiques
    # du runtime du builder ; s11-redteam-code reste advisory ; s12-verdict reste
    # l'agrégation signée. Pas d'archi/wiremap génériques (s10b/s10c), exactement comme
    # `standard` — c'est s10s qui en tient lieu. `s9-build-godot` (étape 0, brique M01)
    # n'appartient à AUCUN profil, ni celui-ci ni "full" : trace historique intacte.
    "standard_godot": (
        "s9-build-godot-standard",
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
    run_dir: Path | None = None,
    *,
    profile: str | None = None,
    attempt: int = 0,
    allow_unprofiled: bool = False,
    model_executed: str | None = None,
) -> DispatchPayload:
    """Valide le contrat de l'étape, fabrique le payload borné, trace l'audit.

    Ne spawn rien : retourne le payload que l'orchestrateur donnera au sous-agent.

    ``run_dir`` (Context Manifest, docs/forge/CONTEXT_LOOP_V1_1_FRESHNESS.md §7) :
    optionnel — dérivé depuis ``run_id`` via ``context_manifest.default_run_dir``
    si non fourni. N'affecte QUE l'emplacement de la mesure advisory ; le dispatch
    lui-même n'en dépend pas.

    ``model_executed`` (0.5.d) : optionnel — le modèle RÉELLEMENT exécutant cette
    tentative quand il diffère du modèle résolu par le contrat (ex. l'override
    d'escalade côté driver). N'affecte QUE le champ additif ``model_executed`` de
    la ligne Context Manifest ``kind: dispatch`` (voir
    ``context_manifest.build_dispatch_manifest_record``) — jamais le ``model`` du
    contrat, jamais la ligne d'audit (`DispatchRecord`), jamais le dispatch lui-même.

    Appartenance profil (D1) : si `profile` est fourni ET que `etape` n'en fait pas
    partie ET que `allow_unprofiled` est faux => `ContractIncomplete` (contrat non
    dispatchable dans ce profil). `allow_unprofiled=True` autorise la dérogation et
    l'inscrit (`unprofiled: true`) dans le corps SIGNÉ de la ligne d'audit. `profile=None`
    => aucun contrôle (comportement historique strictement inchangé, rétro-compat totale).
    `attempt` corrèle la ligne au triplet du marqueur de spawn (unicité D4).
    """
    contract = load_contract(etape)
    # R2 (audit branchements 2026-07-24) : run_id transite jusqu'à _render_prompt
    # pour que le prompt porte SYSTÉMATIQUEMENT son marqueur FORGE_DISPATCH — la
    # porte n'a plus besoin que l'orchestrateur l'appose à la main.
    payload = build_dispatch_payload(contract, etape=etape, caps_path=caps_path, run_id=run_id)
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

    # Context Manifest (kind "dispatch") : MESURE advisory, jamais bloquante.
    # Une exception ici (I/O, résolution de source, table absente...) ne doit
    # JAMAIS faire échouer un dispatch déjà validé — best-effort strict.
    try:
        from forge import context_manifest
        effective_run_dir = run_dir if run_dir is not None else context_manifest.default_run_dir(run_id)
        context_manifest.append_dispatch_manifest(
            etape, run_id, payload, contract, run_dir=effective_run_dir,
            caps_path=caps_path, model_executed=model_executed,
        )
    except Exception:
        logger.warning(
            "context manifest (dispatch) non écrit pour run=%s étape=%s (advisory, non bloquant)",
            run_id, etape, exc_info=True,
        )

    # Tool Observability (étape 4, charter V2 — docs/fvl/FVL_PHASE_0_5_CHARTER.md
    # §4) : mesure ADDITIVE des maillons 1 (déclaration typée skill/plugin) et 2
    # (chargement réel via forge.run_real._STEP_TOOLS), dans SON PROPRE fichier
    # (jamais context_manifest, jamais audit.py, jamais payload.allowed_tools).
    # Même garantie best-effort que ci-dessus : observer, jamais gêner un
    # dispatch déjà validé. Bloc SÉPARÉ du précédent (pas de dépendance à sa
    # réussite) : re-dérive son propre `effective_run_dir` au besoin, pour que
    # cette trace-ci existe même si le Context Manifest a échoué juste avant.
    try:
        from forge import context_manifest as _cm
        from forge import tool_observability as _tool_obs
        tool_obs_run_dir = run_dir if run_dir is not None else _cm.default_run_dir(run_id)
        _tool_obs.append_tool_observability_record(
            etape, run_id, contract, run_dir=tool_obs_run_dir,
        )
    except Exception:
        logger.warning(
            "tool observability non écrite pour run=%s étape=%s (advisory, non bloquant)",
            run_id, etape, exc_info=True,
        )

    # Reasoning Observability (étape 5, charter V2 — docs/fvl/FVL_PHASE_0_5_CHARTER.md
    # §4, ligne « 5. RAISONNEMENT ») : mesure ADDITIVE du maillon 1 SEUL (déclaré —
    # `reasoning` du modèle résolu pour le `capability_role` de cette étape), dans
    # SON PROPRE fichier (jamais context_manifest, jamais audit.py, jamais
    # payload.allowed_tools/model). Les maillons 2/3/4 sont des mesures repo-wide ou
    # nécessitant un appel réel : ils vivent dans leurs propres CLI/fixtures
    # (forge.reasoning_observability scan-readers / tests), pas dans ce bloc par-run.
    # Même garantie best-effort que les deux blocs ci-dessus : observer, jamais gêner
    # un dispatch déjà validé.
    try:
        from forge import context_manifest as _cm2
        from forge import reasoning_observability as _reasoning_obs
        reasoning_run_dir = run_dir if run_dir is not None else _cm2.default_run_dir(run_id)
        _reasoning_obs.append_reasoning_observability_record(
            etape, run_id, contract, run_dir=reasoning_run_dir,
        )
    except Exception:
        logger.warning(
            "reasoning observability non écrite pour run=%s étape=%s (advisory, non bloquant)",
            run_id, etape, exc_info=True,
        )

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
