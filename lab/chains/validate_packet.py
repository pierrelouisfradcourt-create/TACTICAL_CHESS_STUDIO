"""
validate_packet.py — Validateur de truth packet (fail-closed)
Usage: python lab/chains/validate_packet.py path/to/packet.yaml
Exit 0 si valide, exit 1 si invalide.
"""

import sys
import yaml

REQUIRED_FIELDS = ["task_summary", "objective", "claim_verdict"]

def validate(path: str) -> None:
    try:
        with open(path, "r", encoding="utf-8") as f:
            packet = yaml.safe_load(f)
    except Exception as e:
        print(f"ERREUR lecture fichier : {e}")
        sys.exit(1)

    if not isinstance(packet, dict):
        print("ERREUR : le packet doit être un dictionnaire YAML")
        sys.exit(1)

    missing = [field for field in REQUIRED_FIELDS if field not in packet]
    if missing:
        print(f"ERREUR : champs manquants : {', '.join(missing)}")
        sys.exit(1)

    if packet["claim_verdict"] != "NO_CLAIM_ALLOWED":
        print(f"ERREUR : claim_verdict doit être 'NO_CLAIM_ALLOWED', trouvé : '{packet['claim_verdict']}'")
        sys.exit(1)

    print(f"OK : packet valide — {packet['task_summary']}")
    sys.exit(0)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage : python {sys.argv[0]} path/to/packet.yaml")
        sys.exit(1)
    validate(sys.argv[1])
