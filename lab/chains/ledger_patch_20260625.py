#!/usr/bin/env python3
"""
ledger_patch_20260625.py
Patch one-shot IMPROVEMENT_LEDGER.yaml — session 2026-06-25

Opérations :
  1. Fermer 5 IMPs OBSOLÈTES (remplacés par OpenClaw)
     IMP-B3, IMP-D1, IMP-D3, IMP-F3, IMP-F4
  2. Fermer 7 IMPs MIGRÉS (câblés dans workspace OpenClaw)
     IMP-B2, IMP-C2, IMP-C3, IMP-E1, IMP-E2, IMP-E3, IMP-E4

Validation : yaml.safe_load après écriture.
Backup : IMPROVEMENT_LEDGER_backup_20260625.yaml
Ce script ne se supprime pas lui-même.

claim_verdict: NO_CLAIM_ALLOWED
"""
import sys
import yaml
from pathlib import Path

LEDGER = Path(__file__).parent / "IMPROVEMENT_LEDGER.yaml"
BACKUP = Path(__file__).parent / "IMPROVEMENT_LEDGER_backup_20260625.yaml"

SESSION = "2026-06-25"

OBSOLETES = {
    "IMP-B3", "IMP-D1", "IMP-D3", "IMP-F3", "IMP-F4",
}
NOTE_OBSOLETE = "Remplacé par OpenClaw"

MIGRES = {
    "IMP-B2", "IMP-C2", "IMP-C3", "IMP-E1", "IMP-E2", "IMP-E3", "IMP-E4",
}
NOTE_MIGRE = "Migré vers workspace OpenClaw skills/AGENTS.md"


def main() -> None:
    if not LEDGER.exists():
        print(f"[ERREUR] Ledger introuvable : {LEDGER}", file=sys.stderr)
        sys.exit(1)

    raw = LEDGER.read_text(encoding="utf-8")

    header_lines: list[str] = []
    for line in raw.splitlines():
        if line.startswith("#"):
            header_lines.append(line)
        else:
            break
    header_block = "\n".join(header_lines) + "\n" if header_lines else ""

    if BACKUP.exists():
        print(f"[WARN] Backup déjà existant, non écrasé : {BACKUP.name}")
    else:
        BACKUP.write_text(raw, encoding="utf-8")
        print(f"[BACKUP] {BACKUP.name}")

    data = yaml.safe_load(raw)
    if not isinstance(data, dict) or "improvements" not in data:
        print("[ERREUR] Structure YAML inattendue — 'improvements' absent.", file=sys.stderr)
        sys.exit(1)

    n_obsolete = 0
    n_migre    = 0
    already    = 0
    not_found: list[str] = []

    target_ids = OBSOLETES | MIGRES

    for imp in data["improvements"]:
        imp_id = imp.get("id", "")

        if imp_id not in target_ids:
            continue

        if imp.get("status") == "CLOSED":
            print(f"  [SKIP]  {imp_id:12s} déjà CLOSED")
            already += 1
            continue

        imp["status"]         = "CLOSED"
        imp["closed_session"] = SESSION

        if imp_id in OBSOLETES:
            imp["note"] = NOTE_OBSOLETE
            print(f"  [CLOSE] {imp_id:12s} OBSOLETE  {NOTE_OBSOLETE}")
            n_obsolete += 1
        else:
            imp["note"] = NOTE_MIGRE
            print(f"  [CLOSE] {imp_id:12s} MIGRE     {NOTE_MIGRE}")
            n_migre += 1

    # Vérifier les IDs non trouvés
    found_ids = {i.get("id") for i in data["improvements"]}
    for tid in sorted(target_ids):
        if tid not in found_ids:
            not_found.append(tid)

    if isinstance(data.get("meta"), dict):
        data["meta"]["last_updated_session"] = SESSION

    body = yaml.dump(
        data,
        allow_unicode=True,
        sort_keys=False,
        default_flow_style=False,
        width=120,
    )
    LEDGER.write_text(header_block + body, encoding="utf-8")

    # Validation
    try:
        reloaded = yaml.safe_load(LEDGER.read_text(encoding="utf-8"))
        assert isinstance(reloaded, dict)
        assert "improvements" in reloaded
        assert isinstance(reloaded["improvements"], list)
        nb = len(reloaded["improvements"])
        validation = "OK"
    except Exception as exc:
        validation = f"ECHEC — {exc}"
        nb = -1

    print()
    print("=" * 52)
    print("  Résumé patch IMPROVEMENT_LEDGER 2026-06-25")
    print("=" * 52)
    print(f"  Fermés OBSOLÈTES : {n_obsolete} / {len(OBSOLETES)}")
    print(f"  Fermés MIGRÉS    : {n_migre} / {len(MIGRES)}")
    print(f"  Déjà CLOSED      : {already}")
    if not_found:
        print(f"  Non trouvés      : {', '.join(not_found)}")
    print(f"  IMPs totaux      : {nb}")
    print(f"  Validation YAML  : {validation}")
    print(f"  Backup           : {BACKUP.name}")
    print(f"  claim_verdict    : NO_CLAIM_ALLOWED")
    print("=" * 52)

    if validation != "OK":
        print("\n[ERREUR] Validation échouée — restaurer depuis le backup.", file=sys.stderr)
        sys.exit(1)
    if not_found:
        print(f"\n[WARN] IDs absents du ledger : {', '.join(not_found)}", file=sys.stderr)


if __name__ == "__main__":
    main()
