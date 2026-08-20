#!/usr/bin/env python3
"""
ledger_patch_20260608.py
Patch one-shot IMPROVEMENT_LEDGER.yaml — session 2026-06-08

Opérations (dans l'ordre d'application) :
  1. Supprimer entrées dont note: contient "DUPLICATE"
  2. Annoter CLOSED + acceptance TBD/absent avec note: UNVERIFIABLE
  3. IMP-B3 : status CLOSED → OPEN (feature "page dédiée" non livrée)

Validation : yaml.safe_load après écriture.
Backup : IMPROVEMENT_LEDGER_backup_20260608.yaml (Pierre décide de le garder).
Ce script ne se supprime pas lui-même.

claim_verdict: NO_CLAIM_ALLOWED
"""
import hashlib
import sys
import yaml
from pathlib import Path
from datetime import datetime

LEDGER = Path(__file__).parent / "IMPROVEMENT_LEDGER.yaml"
BACKUP = Path(__file__).parent / "IMPROVEMENT_LEDGER_backup_20260608.yaml"

# IMP-205 — single-writer gardé. ledger_writer vit dans governance/ (repo_root/governance).
# parents[2] depuis lab/chains/ = repo root (one-shot sans REPO_ROOT défini — cf RED TEAM H1).
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "governance"))
from ledger_writer import guarded_write  # noqa: E402

UNVERIFIABLE_NOTE = "UNVERIFIABLE - acceptance non defini a la fermeture"
REOPEN_NOTE       = "Rouvert 2026-06-08 — feature page dedicee non livree selon audit"


def _acceptance_is_tbd(value) -> bool:
    if value is None:
        return True
    return str(value).strip() in ("", "TBD")


def main() -> None:
    if not LEDGER.exists():
        print(f"[ERREUR] Ledger introuvable : {LEDGER}", file=sys.stderr)
        sys.exit(1)

    _raw_bytes = LEDGER.read_bytes()
    raw = _raw_bytes.decode("utf-8")
    _ledger_fp = hashlib.sha256(_raw_bytes).hexdigest()  # IMP-205 concurrence optimiste

    # Extraire les lignes de commentaires du header (avant la première clé YAML)
    header_lines: list[str] = []
    for line in raw.splitlines():
        if line.startswith("#"):
            header_lines.append(line)
        else:
            break
    header_block = "\n".join(header_lines) + "\n" if header_lines else ""

    # Backup (ne pas écraser si déjà présent)
    if BACKUP.exists():
        print(f"[WARN] Backup déjà existant, non écrasé : {BACKUP.name}")
    else:
        BACKUP.write_text(raw, encoding="utf-8")
        print(f"[BACKUP] {BACKUP.name}")

    data = yaml.safe_load(raw)
    if not isinstance(data, dict) or "improvements" not in data:
        print("[ERREUR] Structure YAML inattendue — 'improvements' absent.", file=sys.stderr)
        sys.exit(1)

    improvements: list = data["improvements"]
    n_deleted   = 0
    n_annotated = 0
    n_reopened  = 0
    kept: list  = []

    for imp in improvements:
        imp_id = imp.get("id", "?")

        # ── Op 1 : Supprimer DUPLICATEs ──────────────────────────────────────
        raw_note = str(imp.get("note", "") or "")
        if "DUPLICATE" in raw_note.upper():
            print(f"  [DEL]   {imp_id:12s}  note={raw_note[:60]}")
            n_deleted += 1
            continue

        # ── Op 3 : Rouvrir IMP-B3 ────────────────────────────────────────────
        if imp_id == "IMP-B3":
            if imp.get("status") == "CLOSED":
                imp["status"] = "OPEN"
                imp.pop("closed_session", None)
                imp["note"] = REOPEN_NOTE
                print(f"  [REOPEN]{imp_id:12s}  CLOSED → OPEN")
                n_reopened += 1
            else:
                print(f"  [SKIP]  {imp_id:12s}  statut déjà {imp.get('status')} — rien à faire")

        # ── Op 2 : Annoter CLOSED + acceptance TBD/absent ────────────────────
        # (s'exécute après Op 3 : si IMP-B3 vient d'être rouvert, status == OPEN → skip)
        if imp.get("status") == "CLOSED" and _acceptance_is_tbd(imp.get("acceptance")):
            # Ne pas écraser une note de reouverture existante
            if "DUPLICATE" not in str(imp.get("note", "") or "").upper():
                imp["note"] = UNVERIFIABLE_NOTE
                print(f"  [ANNOT] {imp_id:12s}  acceptance={imp.get('acceptance')!r}")
                n_annotated += 1

        kept.append(imp)

    data["improvements"] = kept

    # Mettre à jour last_updated_session dans meta
    if isinstance(data.get("meta"), dict):
        data["meta"]["last_updated_session"] = datetime.now().strftime("%Y-%m-%d")

    # ── Écriture ─────────────────────────────────────────────────────────────
    body = yaml.dump(
        data,
        allow_unicode=True,
        sort_keys=False,
        default_flow_style=False,
    )
    # IMP-205 — single-writer gardé (governor + writelock + empreinte) au lieu de write_text direct.
    guarded_write(LEDGER, header_block + body, expected_fingerprint=_ledger_fp)

    # ── Validation PyYAML ─────────────────────────────────────────────────────
    try:
        reloaded = yaml.safe_load(LEDGER.read_text(encoding="utf-8"))
        assert isinstance(reloaded, dict),          "root n'est pas un dict"
        assert "improvements" in reloaded,          "'improvements' absent"
        assert isinstance(reloaded["improvements"], list), "'improvements' n'est pas une liste"
        nb_remaining = len(reloaded["improvements"])
        validation_status = "OK"
    except Exception as exc:
        validation_status = f"ECHEC — {exc}"
        nb_remaining = -1

    # ── Résumé ────────────────────────────────────────────────────────────────
    print()
    print("=" * 48)
    print("  Résumé patch IMPROVEMENT_LEDGER 2026-06-08")
    print("=" * 48)
    print(f"  Annotés UNVERIFIABLE : {n_annotated}")
    print(f"  Supprimés DUPLICATE  : {n_deleted}")
    print(f"  Rouverts             : {n_reopened}")
    print(f"  IMPs restants        : {nb_remaining}")
    print(f"  Validation PyYAML    : {validation_status}")
    print(f"  Backup               : {BACKUP.name}")
    print(f"  claim_verdict        : NO_CLAIM_ALLOWED")
    print("=" * 48)

    if validation_status != "OK":
        print("\n[ERREUR] Validation échouée — restaurer depuis le backup.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
