#!/usr/bin/env python3
"""Oracle IMP-D2 (non-FORBIDDEN, hors tests/) — smoke test du diagnostic studio.

Vérifie que autopilot._generate_diagnosis_report() :
  - produit un fichier lab/reports/diagnosis_YYYYMMDD.json,
  - contenant un JSON avec les clés de schéma attendues,
  - dont les sections d'anomalies (ELO, IMPs bloqués, services) sont cohérentes.

Exit 0 si tout passe, sinon exit 1 + log de l'échec.
Lancement : python lab/chains/test_diagnosis_smoke.py
"""
import importlib
import json
import logging
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger("test_diagnosis_smoke")

REQUIRED_KEYS = {
    "date",
    "generated_at",
    "source",
    "elo",
    "imps_blocked",
    "services",
    "anomalies",
    "anomaly_count",
}


def _load_autopilot():
    """Importe autopilot et épingle ses chemins repo sur la racine réelle du test.

    En prod, autopilot.REPO pointe sur le chemin Windows codé en dur ; pour que
    l'oracle soit reproductible sur tout hôte (WSL, CI), on repointe REPO et les
    chemins dérivés sur la racine du repo de ce test, sans modifier autopilot.py.
    """
    repo_root = Path(__file__).resolve().parents[2]
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))
    autopilot = importlib.import_module("autopilot")
    autopilot.REPO = repo_root
    autopilot.STUDIO_META_PATH = repo_root / "lab" / "reports" / "studio_meta_latest.json"
    autopilot.LEDGER = repo_root / "lab" / "chains" / "IMPROVEMENT_LEDGER.yaml"
    return autopilot


def check_report(report: dict) -> bool:
    """Valide le schéma et la cohérence du rapport de diagnostic."""
    missing = REQUIRED_KEYS - set(report)
    if missing:
        log.error("clés manquantes dans le rapport : %s", sorted(missing))
        return False
    if not isinstance(report["anomalies"], list):
        log.error("'anomalies' n'est pas une liste")
        return False
    if report.get("anomaly_count") != len(report["anomalies"]):
        log.error(
            "anomaly_count (%s) != len(anomalies) (%d)",
            report.get("anomaly_count"), len(report["anomalies"]),
        )
        return False
    if not isinstance(report["services"], list) or not report["services"]:
        log.error("'services' absent ou vide (probe ports attendu)")
        return False
    probed = {s.get("port") for s in report["services"]}
    if not {8765, 8766} <= probed:
        log.error("ports 8765/8766 non probés (trouvés : %s)", sorted(probed))
        return False
    if not isinstance(report.get("elo"), dict) or "regressed" not in report["elo"]:
        log.error("section 'elo' incomplète")
        return False
    if not isinstance(report["imps_blocked"], list):
        log.error("'imps_blocked' n'est pas une liste")
        return False
    return True


def main() -> int:
    try:
        autopilot = _load_autopilot()
    except Exception as exc:  # noqa: BLE001 — smoke test : tout échec import = rouge
        log.error("import autopilot impossible : %s", exc)
        return 1

    try:
        path: Path = autopilot._generate_diagnosis_report()
    except Exception as exc:  # noqa: BLE001
        log.error("_generate_diagnosis_report() a levé : %s", exc)
        return 1

    if not path.exists():
        log.error("rapport non écrit : %s", path)
        return 1
    if not path.name.startswith("diagnosis_") or path.suffix != ".json":
        log.error("nom de fichier inattendu : %s", path.name)
        return 1

    try:
        report = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        log.error("rapport JSON invalide (%s) : %s", path, exc)
        return 1

    if not check_report(report):
        return 1

    log.info(
        "diagnosis OK : %s — %d anomalie(s), %d service(s) probé(s)",
        path.name, report["anomaly_count"], len(report["services"]),
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
