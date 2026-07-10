"""Garde de spawn Forge — la logique du hook dur (ADR-002 connecteur 2).

Un sous-agent Forge s'annonce par un marqueur ``FORGE_DISPATCH:<etape>:<run_id>``
dans son prompt (posé par le skill /forge). Le garde n'autorise ce spawn que si
un dispatch validé correspondant a bien été enregistré dans l'audit (donc que le
contrat est passé par la porte ``dispatch.prepare_dispatch``).

Sans marqueur => spawn hors Forge => TOUJOURS autorisé : le hook ne gêne jamais
les autres usages de l'outil Agent. Pur (pas d'I/O réseau, pas de spawn).
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from forge.dispatch import DEFAULT_AUDIT

MARKER = re.compile(r"FORGE_DISPATCH:([\w.\-]+):([\w.\-]+)")


def check_spawn(prompt: str, audit_path: Path | None = None) -> tuple[bool, str]:
    """Retourne (autorisé, raison). Sans marqueur Forge => autorisé."""
    match = MARKER.search(prompt or "")
    if not match:
        return True, "non-forge (aucun marqueur)"

    etape, run_id = match.group(1), match.group(2)
    path = Path(audit_path or DEFAULT_AUDIT)
    if not path.exists():
        return False, f"forge {etape}/{run_id} : audit absent -> spawn hors contrat"

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        if rec.get("etape") == etape and rec.get("run_id") == run_id:
            return True, f"dispatch validé {etape}/{run_id}"

    return False, f"forge {etape}/{run_id} : aucun dispatch validé -> spawn hors contrat"
