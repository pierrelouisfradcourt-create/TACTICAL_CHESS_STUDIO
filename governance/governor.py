#!/usr/bin/env python3
"""governor.py — gouvernance déterministe (IMP-160).

Extraction hors autopilot.py des règles de gouvernance, en code pur :
  - aucune inférence LM
  - aucun I/O réseau, aucun subprocess
  - décision reproductible : même action → même verdict

API :
    check(action: dict) -> Decision        # ALLOW | BLOCK + reason
    check(action).allowed -> bool

Une `action` est un dict décrivant ce qui est demandé :
    {
      "lane":    "SAFE_AUTO" | "AUDIT_REQUIRED" | "HUMAN_REQUIRED" | "FORBIDDEN",
      "mission": "<nom de mission>",   # optionnel
      "audit_passed": bool,            # optionnel — débloque AUDIT_REQUIRED
    }

Politique (fail-closed) :
  1. lane FORBIDDEN / HUMAN_REQUIRED         → BLOCK
  2. mission ∈ FORBIDDEN_MISSIONS            → BLOCK
  3. lane AUDIT_REQUIRED sans audit_passed    → BLOCK
  4. lane AUDIT_REQUIRED avec audit_passed    → ALLOW
  5. lane SAFE_AUTO (et rien d'interdit)      → ALLOW
  6. lane inconnue / absente                  → BLOCK (fail-closed)
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

ALLOW = "ALLOW"
BLOCK = "BLOCK"

# Doit rester aligné avec scripts/ingest_event.py:FORBIDDEN_MISSIONS.
FORBIDDEN_MISSIONS = frozenset({
    "runtime_activation", "agent_activation", "dataset_generation",
    "dataset_reset", "training", "benchmark", "model_checkpoint_creation",
    "model_promotion", "latest_json_creation", "lab_runs_creation", "public_claim",
})

KNOWN_LANES = frozenset({"SAFE_AUTO", "AUDIT_REQUIRED", "HUMAN_REQUIRED", "FORBIDDEN"})


@dataclass(frozen=True)
class Decision:
    verdict: str   # ALLOW | BLOCK
    reason: str

    @property
    def allowed(self) -> bool:
        return self.verdict == ALLOW

    def __bool__(self) -> bool:
        return self.allowed


def check(action: dict[str, Any]) -> Decision:
    """Verdict de gouvernance déterministe pour une action."""
    if not isinstance(action, dict):
        return Decision(BLOCK, f"action invalide: attendu dict, reçu {type(action).__name__}")

    lane = action.get("lane")
    mission = action.get("mission")

    # Règle 6 — fail-closed sur lane inconnue/absente.
    if lane not in KNOWN_LANES:
        return Decision(BLOCK, f"lane inconnue ou absente: {lane!r} — fail-closed")

    # Règle 1 — lanes verrouillées HumanGate.
    if lane in ("FORBIDDEN", "HUMAN_REQUIRED"):
        return Decision(BLOCK, f"lane {lane} — décision HumanGate requise")

    # Règle 2 — mission interdite, quelle que soit la lane.
    if mission in FORBIDDEN_MISSIONS:
        return Decision(BLOCK, f"mission interdite: {mission}")

    # Règle 3 / 4 — AUDIT_REQUIRED gardé par un audit préalable.
    if lane == "AUDIT_REQUIRED":
        if action.get("audit_passed") is True:
            return Decision(ALLOW, "AUDIT_REQUIRED — audit validé")
        return Decision(BLOCK, "AUDIT_REQUIRED — audit non validé (audit_passed != True)")

    # Règle 5 — SAFE_AUTO sans mission interdite.
    return Decision(ALLOW, "SAFE_AUTO — autorisé")


if __name__ == "__main__":
    import json
    import sys

    payload = json.loads(sys.stdin.read() or "{}")
    d = check(payload)
    print(json.dumps({"verdict": d.verdict, "reason": d.reason, "allowed": d.allowed}))
    sys.exit(0 if d.allowed else 1)
