#!/usr/bin/env python3
"""
ledger_patch_20260708.py
Patch one-shot IMPROVEMENT_LEDGER.yaml — session 2026-07-08

Operation :
  Append (sans clobber) le diagnostic timeout au champ `notes` d'IMP-258.
  Aucune autre mutation (status/lane/acceptance inchanges).

Route par le single-writer garde (governor + writelock + empreinte optimiste),
identique au precedent ledger_patch_20260625.py. PAS une ecriture directe.
Validation : yaml.safe_load apres ecriture + assert que l'addendum est present.
Backup : IMPROVEMENT_LEDGER_backup_20260708.yaml
Idempotent : si l'addendum est deja present, ne re-append pas.

claim_verdict: NO_CLAIM_ALLOWED
"""
import hashlib
import sys
import yaml
from pathlib import Path

LEDGER = Path(__file__).parent / "IMPROVEMENT_LEDGER.yaml"
BACKUP = Path(__file__).parent / "IMPROVEMENT_LEDGER_backup_20260708.yaml"

# single-writer garde. ledger_writer vit dans governance/ (repo_root/governance).
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "governance"))
from ledger_writer import guarded_write  # noqa: E402

SESSION = "2026-07-08"
TARGET_ID = "IMP-258"
MARKER = "ADDENDUM 2026-07-08 (diagnostic timeout"

ADDENDUM = (
    " || ADDENDUM 2026-07-08 (diagnostic timeout, test proxy actif) : meme avec le "
    "proxy :8765 relance et sain (/health OK, appel claude reussi cote serveur), "
    "PLAN_REVIEW retombe en fallback Qwen -> collapsed RESTE True. CAUSE RACINE : "
    "_READ_TIMEOUT_S=110s (constante en dur dans council.py) < latence reelle de "
    "claude --print (~114s mesure ce jour, 60-160s historique log) -> requests leve "
    "ReadTimeout a 110s -> CouncilCallError -> fallback Qwen silencieux. Le flag "
    "timed_out NE se leve PAS car c'est une requests.ReadTimeout, PAS une "
    "asyncio.TimeoutError (seul le role-timeout de 120s met timed_out=True). Le "
    "fallback est donc doublement invisible. PREUVE : en relevant _READ_TIMEOUT_S a "
    "280s + role-timeout 300s, distinct_models=2, collapsed=False, PLAN_REVIEW=claude "
    "qui calcule juste (E=33.26 vs 50 annonce, cible ~66.5 tirages, hard pity 70 "
    "redondant car soft pity garantit au 69e, pire cas non borne) — meme qualite que "
    "Claude direct. Qwen (RED_TEAM) BLOQUE mais ne calcule jamais et conclut a "
    "l'envers (50 sous-estime). CORRECTIFS ATTENDUS (ajout a l'acceptance) : "
    "(a) relever _READ_TIMEOUT_S et le role-timeout coherent au-dessus de la latence "
    "CLI observee, idealement configurable par env ; (b) faire lever timed_out=True "
    "explicitement quand une ReadTimeout/CouncilCallError frappe le role primaire, "
    "pour que le fallback cesse d'etre invisible ; (c) alerte humaine des qu'un role "
    "critique passe en fallback."
)


def main() -> None:
    if not LEDGER.exists():
        print(f"[ERREUR] Ledger introuvable : {LEDGER}", file=sys.stderr)
        sys.exit(1)

    _raw_bytes = LEDGER.read_bytes()
    raw = _raw_bytes.decode("utf-8")
    _ledger_fp = hashlib.sha256(_raw_bytes).hexdigest()  # concurrence optimiste

    header_lines: list[str] = []
    for line in raw.splitlines():
        if line.startswith("#"):
            header_lines.append(line)
        else:
            break
    header_block = "\n".join(header_lines) + "\n" if header_lines else ""

    if BACKUP.exists():
        print(f"[WARN] Backup deja existant, non ecrase : {BACKUP.name}")
    else:
        BACKUP.write_text(raw, encoding="utf-8")
        print(f"[BACKUP] {BACKUP.name}")

    data = yaml.safe_load(raw)
    if not isinstance(data, dict) or "improvements" not in data:
        print("[ERREUR] Structure YAML inattendue — 'improvements' absent.", file=sys.stderr)
        sys.exit(1)

    target = next((i for i in data["improvements"] if i.get("id") == TARGET_ID), None)
    if target is None:
        print(f"[ERREUR] {TARGET_ID} introuvable dans le ledger.", file=sys.stderr)
        sys.exit(1)

    existing = target.get("notes", "") or ""
    if MARKER in existing:
        print(f"[SKIP] {TARGET_ID} : addendum deja present, aucune ecriture.")
        return

    target["notes"] = existing + ADDENDUM
    print(f"[PATCH] {TARGET_ID} : notes etendues (+{len(ADDENDUM)} chars).")

    if isinstance(data.get("meta"), dict):
        data["meta"]["last_updated_session"] = SESSION

    body = yaml.dump(data, allow_unicode=True, sort_keys=False, default_flow_style=False)
    guarded_write(LEDGER, header_block + body, expected_fingerprint=_ledger_fp)

    # Validation
    reloaded = yaml.safe_load(LEDGER.read_text(encoding="utf-8"))
    check = next((i for i in reloaded["improvements"] if i.get("id") == TARGET_ID), None)
    ok = check is not None and MARKER in (check.get("notes", "") or "")
    print()
    print("=" * 52)
    print("  Resume patch IMPROVEMENT_LEDGER 2026-07-08")
    print("=" * 52)
    print(f"  Cible            : {TARGET_ID}")
    print(f"  IMPs totaux      : {len(reloaded['improvements'])}")
    print(f"  Addendum present : {'OK' if ok else 'ECHEC'}")
    print(f"  Backup           : {BACKUP.name}")
    print(f"  claim_verdict    : NO_CLAIM_ALLOWED")
    print("=" * 52)
    if not ok:
        print("\n[ERREUR] Validation echouee — restaurer depuis le backup.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
