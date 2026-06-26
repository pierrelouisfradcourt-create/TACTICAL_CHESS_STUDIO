"""Oracle IMP-F1 — valide le corpus golden de charters.
Schéma exigé par entrée : {"input": <ledger_entry dict>, "output": <charter_text str>}.
Exit 0 si >= 10 entrées valides, sinon exit 1 + log de l'erreur.
"""
import json
import logging
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("validate_corpus")

CORPUS_PATH = Path(__file__).parent / "corpus" / "charters_golden.jsonl"
MIN_ENTRIES = 10


def validate_entry(obj: dict, lineno: int) -> bool:
    """Valide une entrée : input (dict non vide) + output (str non vide)."""
    if not isinstance(obj, dict):
        log.error("ligne %d: pas un objet JSON", lineno)
        return False
    if not isinstance(obj.get("input"), dict) or not obj["input"]:
        log.error("ligne %d: champ 'input' absent ou non-dict", lineno)
        return False
    out = obj.get("output")
    if not isinstance(out, str) or not out.strip():
        log.error("ligne %d: champ 'output' absent ou vide", lineno)
        return False
    return True


def validate_corpus(path: Path) -> int:
    """Retourne le nombre d'entrées valides; -1 si fichier illisible."""
    if not path.exists():
        log.error("corpus introuvable: %s", path)
        return -1
    valid = 0
    for i, line in enumerate(path.open(encoding="utf-8"), start=1):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError as exc:
            log.error("ligne %d: JSON invalide (%s)", i, exc)
            return -1
        if validate_entry(obj, i):
            valid += 1
    return valid


def main() -> int:
    valid = validate_corpus(CORPUS_PATH)
    if valid < 0:
        return 1
    if valid < MIN_ENTRIES:
        log.error("seulement %d entrées valides (< %d requis)", valid, MIN_ENTRIES)
        return 1
    log.info("corpus OK: %d entrées valides (>= %d)", valid, MIN_ENTRIES)
    return 0


if __name__ == "__main__":
    sys.exit(main())
