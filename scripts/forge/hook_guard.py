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
MARKER_TOKEN = "FORGE_DISPATCH"
SPAWN_TOOLS = ("Task", "Agent")


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


def hook_decision(tool: str, prompt: str, audit_path: Path | None = None) -> tuple[int, str]:
    """Décision du hook PreToolUse : 0 = autoriser, 2 = bloquer.

    Fail-OPEN hors périmètre Forge (autre outil, ou aucun marqueur) : le hook ne
    gêne jamais les usages non-Forge de l'outil Agent. Fail-CLOSED SUR le périmètre
    Forge : dès qu'un marqueur ``FORGE_DISPATCH`` est présent, toute impossibilité
    de vérifier (garde qui lève, audit illisible) => refus (2), jamais un
    laissez-passer silencieux. C'est la correction du fail-open aveugle.
    """
    if tool not in SPAWN_TOOLS:
        return 0, "outil hors périmètre"
    if MARKER_TOKEN not in (prompt or ""):
        return 0, "non-forge (aucun marqueur)"
    # Périmètre Forge : à partir d'ici, toute erreur bloque (fail-closed).
    try:
        allow, reason = check_spawn(prompt, audit_path=audit_path)
    except Exception as exc:  # noqa: BLE001 — en périmètre Forge, l'incertitude = refus
        return 2, f"forge: vérification impossible ({exc}) -> refus fail-closed"
    return (0, reason) if allow else (2, reason)
