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
from dataclasses import asdict, dataclass
from pathlib import Path

from forge.contract import (
    REPO_ROOT,
    DispatchPayload,
    build_dispatch_payload,
    load_contract,
)

logger = logging.getLogger(__name__)

DEFAULT_AUDIT = REPO_ROOT / "lab" / "forge_evidence" / "dispatch_audit.jsonl"

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
DETERMINISTIC = ("s10a-oracle-code", "s10b-oracle-archi", "s10c-oracle-wiremap", "s12-verdict")

# Profils de chaîne — sous-ensembles de ORDER pour des usages plus courts que le
# greenfield complet. `patch` = un fix sur un projet existant (build -> oracle code
# -> red-team code -> verdict) : les oracles archi/wiremap n'y sont pas applicables
# et seront émis SKIPPED (reçu signé) au verdict. `review` = red-team d'un plan seul.
PROFILES = {
    "full": tuple(ORDER),
    "patch": ("s9-build", "s10a-oracle-code", "s11-redteam-code", "s12-verdict"),
    "review": ("s6-redteam-plan",),
    # micro : une tâche triviale (fonction pure, one-liner). Proportionnalité : pas
    # de red-team ni de design — build -> oracle code -> verdict. Évite la cérémonie
    # 13 étapes sur 78 lignes (finding red-team chesscolor). archi/wiremap = SKIPPED.
    "micro": ("s9-build", "s10a-oracle-code", "s12-verdict"),
}


def order_for_profile(profile: str = "full") -> list[str]:
    """Étapes d'un profil, dans l'ordre. Profil inconnu => ValueError (fail-fast)."""
    try:
        return list(PROFILES[profile])
    except KeyError:
        raise ValueError(f"profil inconnu {profile!r} (attendu: {', '.join(PROFILES)})")


@dataclass(frozen=True)
class DispatchRecord:
    run_id: str
    etape: str
    capability_role: str
    model: str
    provider: str
    allowed_tools: tuple[str, ...]
    ts: float


def sign_audit_record(rec: dict, key_file: Path | None = None) -> dict:
    """Ajoute un HMAC à un enregistrement d'audit — une ligne forgée à la main
    (sans la clé) ne pourra pas se faire passer pour un dispatch validé."""
    from forge.verdict import _sign_mapping
    signed = dict(rec)
    signed["hmac"] = _sign_mapping(rec, key_file)
    return signed


def verify_audit_line(rec: dict, key_file: Path | None = None) -> bool:
    """Vrai ssi la ligne porte un HMAC valide sur son contenu (hors champ hmac)."""
    from forge.verdict import _verify_mapping
    sig = rec.get("hmac")
    if not sig:
        return False
    body = {k: v for k, v in rec.items() if k != "hmac"}
    return _verify_mapping(body, sig, key_file)


def _append_audit(record: DispatchRecord, audit_path: Path | None,
                  key_file: Path | None = None) -> None:
    path = audit_path or DEFAULT_AUDIT
    path.parent.mkdir(parents=True, exist_ok=True)
    signed = sign_audit_record(asdict(record), key_file)
    with open(path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(signed, ensure_ascii=False, sort_keys=True) + "\n")


def prepare_dispatch(
    etape: str,
    run_id: str,
    caps_path: Path | None = None,
    audit_path: Path | None = None,
) -> DispatchPayload:
    """Valide le contrat de l'étape, fabrique le payload borné, trace l'audit.

    Ne spawn rien : retourne le payload que l'orchestrateur donnera au sous-agent.
    """
    contract = load_contract(etape)
    payload = build_dispatch_payload(contract, etape=etape, caps_path=caps_path)
    _append_audit(
        DispatchRecord(
            run_id=run_id,
            etape=etape,
            capability_role=contract["capability_role"],
            model=payload.model,
            provider=payload.provider,
            allowed_tools=payload.allowed_tools,
            ts=time.time(),
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
                        help="profil de chaîne (full / patch / review)")
    args = parser.parse_args()
    if args.dry_run:
        audit = REPO_ROOT / "lab" / "forge_evidence" / "dispatch_dryrun.jsonl"
        plan = plan_chain(run_id="dryrun", audit_path=audit, profile=args.profile)
        print(f"Chaîne Forge [{args.profile}] — {len(plan)} étapes planifiées (aucun spawn) :")
        for p in plan:
            kind = "déterministe" if p.etape in DETERMINISTIC else "LLM"
            print(f"  {p.etape:22} [{kind:12}] -> {p.model}")
        print(f"Audit : {audit}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
