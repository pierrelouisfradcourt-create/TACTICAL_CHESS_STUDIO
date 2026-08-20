from __future__ import annotations

from typing import Any, Dict

from .phase import detect_phase
from .plans import select_plans
from .tags import extract_tags


def retrieve_memory(fen: str) -> Dict[str, Any]:
    phase = detect_phase(fen)
    tags = extract_tags(fen)
    plans = select_plans(phase, tags)
    return {
        "phase": phase,
        "tags": tags,
        "plans": plans,
    }
