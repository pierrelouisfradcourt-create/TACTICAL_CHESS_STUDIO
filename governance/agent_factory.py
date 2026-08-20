#!/usr/bin/env python3
"""agent_factory.py — Agent Factory (IMP-197).

Charge capabilities.lock.json (validé par schéma), instancie un rôle borné, et valide
CHAQUE action via governor.check() au runtime.

Gouvernance par-action (RT-197-1) : `default_action` est l'opération autonome minimale et
honnête du rôle (SAFE_AUTO + mission non-interdite) -> le rôle est instanciable. Mais
`instantiate(role, action=...)` valide AUSSI une action runtime spécifique : une action
HUMAN_REQUIRED / AUDIT_REQUIRED / mission FORBIDDEN -> CapabilityViolation (refus dur).
Le garde n'est donc pas tautologique : il bloque réellement les actions élevées.

Code pur (aucun I/O réseau / subprocess). governor importé depuis le même dossier.
"""
from __future__ import annotations

import fnmatch
import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import jsonschema

_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))
import governor  # noqa: E402

LOCK = _HERE / "capabilities.lock.json"
SCHEMA = _HERE.parent / "schemas" / "capabilities.schema.json"

ROLE_NAMES = ("Planner", "Executor", "RedTeam", "Explorer", "Reviewer")


class FactoryError(Exception):
    """Lock invalide / rôle inconnu."""


class CapabilityViolation(FactoryError):
    """Action refusée par le governor, ou écriture dans une zone interdite."""


@dataclass(frozen=True)
class AgentInstance:
    role: str
    template: dict[str, Any]
    action: dict[str, Any]
    decision: governor.Decision


def load_capabilities(path: Path | str = LOCK, schema_path: Path | str = SCHEMA) -> dict[str, Any]:
    """Charge + valide le lock contre le schéma JSON (lève jsonschema.ValidationError si invalide)."""
    caps = json.loads(Path(path).read_text(encoding="utf-8"))
    schema = json.loads(Path(schema_path).read_text(encoding="utf-8"))
    jsonschema.validate(caps, schema)
    return caps


def roles(caps: dict[str, Any]) -> list[str]:
    return list(caps.get("roles", {}).keys())


def instantiate(role: str, caps: dict[str, Any], *, action: dict[str, Any] | None = None) -> AgentInstance:
    """Instancie un rôle. Valide `action` (ou la default_action du rôle) via governor.check().

    Action gouvernée refusée (FORBIDDEN / HUMAN_REQUIRED / AUDIT sans audit_passed / lane
    inconnue) -> CapabilityViolation (refus dur)."""
    templates = caps.get("roles", {})
    if role not in templates:
        raise FactoryError(f"role inconnu: {role!r}")
    tmpl = templates[role]
    act = action if action is not None else tmpl["default_action"]
    decision = governor.check(act)
    if not decision.allowed:
        raise CapabilityViolation(f"{role}: action refusee par le governor ({decision.reason})")
    return AgentInstance(role=role, template=tmpl, action=act, decision=decision)


def _forbidden_prefixes(caps: dict[str, Any]) -> list[str]:
    # "tests/**" -> "tests/" (sémantique prefix, alignée sur le pre-commit hook grep "^path").
    return [g.replace("**", "") for g in caps.get("forbidden_globs", [])]


def validate_write_target(caps: dict[str, Any], paths: list[str]) -> None:
    """RT-197-3 — garde runtime : refuse tout chemin tombant dans une zone interdite.

    Nécessaire car les write globs dynamiques (charter de l'Executor) ne sont pas connus au
    lock-time ; ce garde s'applique quand les chemins réels sont connus."""
    prefixes = _forbidden_prefixes(caps)
    globs = caps.get("forbidden_globs", [])
    for p in paths:
        norm = p.replace("\\", "/")
        if norm.startswith("./"):      # ne strip QUE le préfixe "./" (pas les '.' de .github)
            norm = norm[2:]
        if any(norm.startswith(pre) for pre in prefixes) or any(fnmatch.fnmatch(norm, g) for g in globs):
            raise CapabilityViolation(f"write interdit: {p} (zone FORBIDDEN)")
