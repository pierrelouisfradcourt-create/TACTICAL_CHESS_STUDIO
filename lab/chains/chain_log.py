"""
chain_log.py — Journal des chaînes lancées
Ajoute une ligne à lab/chains/CHAIN_HISTORY.jsonl après chaque chaîne.
"""

import json
from datetime import datetime
from pathlib import Path

HISTORY_FILE = Path("lab/chains/CHAIN_HISTORY.jsonl")

def log_chain(envelope: dict) -> None:
    entry = {
        "chain_id":  envelope.get("chain_id"),
        "timestamp": envelope.get("timestamp", datetime.now().strftime("%Y%m%d_%H%M%S")),
        "objective": envelope.get("truth_packet", {}).get("objective", ""),
        "verdict":   envelope.get("redteam_output", {}).get("verdict", "UNKNOWN"),
        "files":     (
            envelope.get("engineer_proposal", {}).get("files_to_create", []) +
            envelope.get("engineer_proposal", {}).get("files_to_edit", [])
        ),
        "retried":   envelope.get("retried", False),
    }
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(HISTORY_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
