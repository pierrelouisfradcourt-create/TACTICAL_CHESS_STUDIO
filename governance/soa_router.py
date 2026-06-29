#!/usr/bin/env python3
"""soa_router.py — SOA execution router (IMP-199).

Routing minimal, MCP-registry aware, anti sur-orchestration. Code PUR, déterministe :
  - lit les capacités RÉELLES depuis openclaw/capabilities.yaml (statut filtré) ;
  - calcule le plus petit ensemble d'agents couvrant le besoin (set-cover greedy) ;
  - refuse DUR la sur-orchestration : `requested_agents` est obligatoire et lie l'appelant ;
    demander plus d'agents que le minimum -> OverOrchestrationError.

Autonome : aucun import d'ecg/projection (la dépendance ledger 195/196 est narrative).

Modèle :
  - agent      = un `model.id` du registre (ex. custom/claude-code-cli).
  - capacité   = un `role` de modèle OU un `skill.id`.
  - un agent couvre ses roles + les skills dont il est le provider (skill ET modèle dispo).
  - dispo      = statut ∈ {AVAILABLE, ASSUMED_AVAILABLE} (UNKNOWN = indisponible).
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

_HERE = Path(__file__).resolve().parent
REPO = _HERE.parent
CAPS_YAML = REPO / "openclaw" / "capabilities.yaml"

_AVAILABLE = frozenset({"AVAILABLE", "ASSUMED_AVAILABLE"})


class SoaError(Exception):
    """Entrée invalide / registre illisible."""


class UnavailableCapabilityError(SoaError):
    """Une capacité requise n'existe pas / n'est pas disponible."""


class OverOrchestrationError(SoaError):
    """Plus d'agents demandés que le minimum nécessaire — refus dur."""


class InsufficientAgentsError(SoaError):
    """Moins d'agents demandés que le minimum nécessaire pour couvrir le besoin."""


@dataclass(frozen=True)
class Registry:
    agents: dict[str, frozenset[str]]   # agent_id -> capacités (agents disponibles uniquement)

    @property
    def capabilities(self) -> frozenset[str]:
        out: set[str] = set()
        for caps in self.agents.values():
            out |= caps
        return frozenset(out)


@dataclass(frozen=True)
class ExecutionPlan:
    agents: tuple[str, ...]       # ensemble LIANT minimal couvrant le besoin
    covered: frozenset[str]
    reason: str


def load_registry(path: Path | str = CAPS_YAML) -> Registry:
    """Parse capabilities.yaml -> Registry (agents disponibles + leurs capacités réelles)."""
    path = Path(path)
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise SoaError(f"registre introuvable: {path}") from exc
    except yaml.YAMLError as exc:
        raise SoaError(f"registre illisible: {exc}") from exc
    if not isinstance(raw, dict):
        raise SoaError("registre malforme: racine non-dict")

    models = raw.get("models") or []
    # statut par modèle (pour résoudre les providers de skills)
    model_status: dict[str, str] = {m.get("id"): m.get("status", "UNKNOWN") for m in models}

    agents: dict[str, set[str]] = {}
    for m in models:
        mid = m.get("id")
        if not mid or model_status.get(mid) not in _AVAILABLE:
            continue
        agents.setdefault(mid, set()).update(r for r in (m.get("roles") or []) if r)

    # skills : capacité = skill.id, couverte par le modèle provider SI les deux sont dispo.
    for s in raw.get("skills") or []:
        sid = s.get("id")
        provider = s.get("provider")
        if not sid:
            continue
        if s.get("status") not in _AVAILABLE:
            continue
        if provider not in model_status or model_status.get(provider) not in _AVAILABLE:
            continue  # provider UNKNOWN / non résolu -> drop (jamais de capacité fantôme)
        agents.setdefault(provider, set()).add(sid)

    return Registry(agents={a: frozenset(c) for a, c in agents.items()})


def _greedy_cover(needed: set[str], agents: dict[str, frozenset[str]]) -> list[str]:
    """Set-cover greedy déterministe. Tie-break explicite : (-couverture, agent_id)."""
    remaining = set(needed)
    chosen: list[str] = []
    while remaining:
        # meilleur agent : couvre le plus de capacités restantes ; égalité -> id alphabétique.
        best = min(
            agents.items(),
            key=lambda kv: (-len(kv[1] & remaining), kv[0]),
        )
        agent_id, caps = best
        gain = caps & remaining
        if not gain:
            # aucun agent ne couvre les capacités restantes (ne devrait pas arriver après
            # le filtre missing) -> garde-fou.
            raise UnavailableCapabilityError(f"non couvrable: {sorted(remaining)}")
        chosen.append(agent_id)
        remaining -= gain
    return sorted(chosen)


def route(task: dict[str, Any], registry: Registry) -> ExecutionPlan:
    """Route une tâche vers l'ensemble minimal d'agents. `requested_agents` OBLIGATOIRE.

    Refus durs : capacité indisponible (UnavailableCapabilityError), trop d'agents demandés
    (OverOrchestrationError), pas assez (InsufficientAgentsError), entrée invalide (SoaError).
    """
    if not isinstance(task, dict):
        raise SoaError(f"task invalide: attendu dict, recu {type(task).__name__}")
    caps_in = task.get("required_capabilities")
    if caps_in is None or not isinstance(caps_in, (list, tuple, set)):
        raise SoaError("task.required_capabilities manquant ou non-liste")
    requested = task.get("requested_agents")
    if requested is None or not isinstance(requested, int) or isinstance(requested, bool):
        # RT-199-1 : obligatoire et fail-closed (pas de skip silencieux du garde).
        raise SoaError("task.requested_agents obligatoire (int) — anti sur-orchestration")

    needed = set(caps_in)
    missing = needed - registry.capabilities
    if missing:
        raise UnavailableCapabilityError(f"capacites indisponibles: {sorted(missing)}")

    plan = _greedy_cover(needed, registry.agents) if needed else []
    minimal = len(plan)

    if requested > minimal:
        raise OverOrchestrationError(
            f"sur-orchestration: {requested} agents demandes, {minimal} suffisent "
            f"pour {sorted(needed)}")
    if requested < minimal:
        raise InsufficientAgentsError(
            f"insuffisant: {requested} agents demandes, {minimal} necessaires "
            f"pour {sorted(needed)}")

    return ExecutionPlan(
        agents=tuple(plan),
        covered=frozenset(needed),
        reason=f"{minimal} agent(s) couvrent {sorted(needed)}",
    )
