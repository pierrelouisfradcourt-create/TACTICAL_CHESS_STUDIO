"""Per-project oracle resolution and execution.

The oracle is the deterministic, non-LLM verification command for a project.
Nothing here calls an LLM. Each project has its own oracle — no project inherits
another's — resolved from a data-driven config so we never touch studio_meta.py.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

# scripts/forge/oracle.py -> parents[2] == repo root
REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = REPO_ROOT / "scripts" / "forge" / "oracles.json"


class OracleNotFound(Exception):
    """Raised when a project has no oracle configured."""


@dataclass(frozen=True)
class OracleSpec:
    project: str
    cwd: Path
    command: list[str]


def resolve_oracle(project: str, config_path: Path | None = None) -> OracleSpec:
    """Return the oracle command for ``project`` from the config file."""
    path = config_path or DEFAULT_CONFIG
    with open(path, encoding="utf-8") as fh:
        config = json.load(fh)
    if project not in config:
        raise OracleNotFound(f"no oracle configured for project {project!r}")
    entry = config[project]
    return OracleSpec(
        project=project,
        cwd=(REPO_ROOT / entry["cwd"]).resolve(),
        command=list(entry["command"]),
    )
