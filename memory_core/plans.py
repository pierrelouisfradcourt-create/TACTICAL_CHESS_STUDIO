from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List


def _default_library_path() -> Path:
    return Path(__file__).resolve().parent / "plans_library.jsonl"


def load_plans_library(path: str | None = None) -> List[Dict[str, Any]]:
    library_path = Path(path) if path else _default_library_path()
    if not library_path.exists():
        return []

    plans: List[Dict[str, Any]] = []
    with library_path.open("r", encoding="utf-8") as f:
        for raw in f:
            line = raw.strip()
            if not line:
                continue
            obj = json.loads(line)
            if isinstance(obj, dict) and obj.get("id"):
                plans.append(obj)
    return plans


def select_plans(phase: str, tags: List[str], path: str | None = None) -> List[str]:
    tag_set = set(tags)
    selected: List[tuple[int, str]] = []

    for plan in load_plans_library(path):
        phases = set(plan.get("phases", []))
        required_tags = set(plan.get("required_tags", []))
        blocked_tags = set(plan.get("blocked_tags", []))

        if phases and phase not in phases:
            continue
        if required_tags and not required_tags.issubset(tag_set):
            continue
        if blocked_tags and blocked_tags.intersection(tag_set):
            continue

        selected.append((int(plan.get("priority", 100)), str(plan["id"])))

    selected.sort(key=lambda item: (item[0], item[1]))
    return [plan_id for _, plan_id in selected]
