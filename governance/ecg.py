#!/usr/bin/env python3
"""ecg.py — Engine de Cycle de vie Gouverné / state machine ECG (IMP-195).

State machine à 7 états, transitions gardées (aucune hors table). Code PUR, style governor :
  - aucune inférence LM, aucun I/O, aucun subprocess dans le cœur ;
  - décision reproductible : même (src, dst) -> même verdict.

États : PROPOSED -> PLANNED -> TEST_SPECCED -> IN_PROGRESS -> ORACLE_PENDING
        -> VERDICT_SIGNED -> CLOSED. Seul VERDICT_SIGNED mène à CLOSED -> l'oracle n'est
        jamais contournable. Deux arêtes de rework (oracle rouge / gate reject) -> IN_PROGRESS.

⚠️ ADVISORY (RT-195-2) : l'ECG VALIDE les transitions mais n'est PAS encore l'autorité
d'écriture exclusive. close_imp (autopilot.py:1684, write_text) et cmd_close (kaizen_loop)
mutent `status` SANS appeler can_transition. Câbler les chemins de close à l'ECG +
ledger_writer = suivi GATÉ (l'enforcer maintenant casserait les closes directs legacy
PROPOSED->CLOSED, ex. ratification Pierre). Voir docs/phase1/IMP-195_PLAN.md.

Rétro-compat : les IMPs existants n'ont pas de champ `ecg_state` -> état dérivé du `status`
legacy via DEFAULT_FROM_STATUS. Statut inconnu -> UNKNOWN (non-transitionable, fail-closed).
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

ALLOW = "ALLOW"
BLOCK = "BLOCK"

# 7 états ECG, ordre canonique (pipeline de vie d'un IMP).
ECG_STATES: tuple[str, ...] = (
    "PROPOSED", "PLANNED", "TEST_SPECCED", "IN_PROGRESS",
    "ORACLE_PENDING", "VERDICT_SIGNED", "CLOSED",
)

# Sentinelle fail-closed : un état non reconnu ne peut transiter vers rien.
UNKNOWN = "UNKNOWN"

# Transitions gardées — aucune transition hors de cette table. CLOSED est terminal.
TRANSITIONS: dict[str, frozenset[str]] = {
    "PROPOSED":       frozenset({"PLANNED"}),
    "PLANNED":        frozenset({"TEST_SPECCED"}),
    "TEST_SPECCED":   frozenset({"IN_PROGRESS"}),
    "IN_PROGRESS":    frozenset({"ORACLE_PENDING"}),
    "ORACLE_PENDING": frozenset({"VERDICT_SIGNED", "IN_PROGRESS"}),  # oracle rouge -> rework
    "VERDICT_SIGNED": frozenset({"CLOSED", "IN_PROGRESS"}),           # gate reject -> rework
    "CLOSED":         frozenset(),                                    # terminal
}

# Mapping legacy status -> état ECG par défaut (rétro-compat des 212 IMPs existants).
# Élargi aux statuts réellement présents (OPEN/CLOSED/FAIL) + valeurs historiques.
DEFAULT_FROM_STATUS: dict[str, str] = {
    "OPEN":        "PROPOSED",
    "IN_PROGRESS": "IN_PROGRESS",
    "CLOSED":      "CLOSED",
    "DONE":        "CLOSED",        # get_ledger_counts compte DONE comme closed
    "BLOCKED":     "PROPOSED",
    "DEFERRED":    "PROPOSED",
    "FAIL":        "IN_PROGRESS",   # oracle échoué -> retour au travail (IMP-175)
}

VALID_ORACLE_TYPES: frozenset[str] = frozenset({"code", "structure", "humangate", "none"})


@dataclass(frozen=True)
class Decision:
    """Verdict de transition déterministe (même API que governor.Decision)."""
    verdict: str
    reason: str

    @property
    def allowed(self) -> bool:
        return self.verdict == ALLOW

    def __bool__(self) -> bool:
        return self.allowed


def validate_state(state: str) -> bool:
    """True si `state` est un état ECG connu."""
    return state in ECG_STATES


def can_transition(src: str, dst: str) -> Decision:
    """Verdict déterministe pour la transition src -> dst. Fail-closed."""
    if src not in TRANSITIONS:
        return Decision(BLOCK, f"etat source inconnu: {src!r} — fail-closed")
    if dst not in ECG_STATES:
        return Decision(BLOCK, f"etat cible inconnu: {dst!r} — fail-closed")
    if dst not in TRANSITIONS[src]:
        return Decision(BLOCK, f"transition interdite: {src} -> {dst}")
    return Decision(ALLOW, f"transition autorisee: {src} -> {dst}")


def current_state(imp: dict[str, Any]) -> str:
    """État ECG d'un IMP : champ `ecg_state` explicite (si valide), sinon mapping legacy
    depuis `status`. Fail-closed : `ecg_state` ou `status` inconnu -> UNKNOWN."""
    explicit = imp.get("ecg_state")
    if explicit is not None:
        return explicit if explicit in ECG_STATES else UNKNOWN
    return DEFAULT_FROM_STATUS.get(imp.get("status"), UNKNOWN)


# ── Matérialisation oracle_type + blocked_by depuis `notes` (fonctions pures) ──
#
# Les notes des IMPs orchestration portent : "... | oracle_type=code | blocked_by=IMP-x,IMP-y
# | ex-label=..." (ou blocked_by=none). On matérialise ces métadonnées en champs structurés.

_ORACLE_TYPE_RE = re.compile(r"oracle_type=([a-z_]+)")
_BLOCKED_SEGMENT_RE = re.compile(r"blocked_by=([^|]*)")
_IMP_ID_RE = re.compile(r"IMP-\d+")


def parse_notes_meta(notes: str) -> dict[str, Any]:
    """Extrait {oracle_type?, blocked_by} depuis les notes. blocked_by ancré sur IMP-\\d+
    (donc `blocked_by=none` -> []). Pur et idempotent."""
    meta: dict[str, Any] = {}
    if not notes:
        return meta
    m = _ORACLE_TYPE_RE.search(notes)
    if m and m.group(1) in VALID_ORACLE_TYPES:
        meta["oracle_type"] = m.group(1)
    seg = _BLOCKED_SEGMENT_RE.search(notes)
    if seg is not None:
        meta["blocked_by"] = _IMP_ID_RE.findall(seg.group(1))  # [] si 'none'/vide
    return meta


def materialize_entry(imp: dict[str, Any]) -> dict[str, Any]:
    """COPIE de l'IMP avec oracle_type/blocked_by matérialisés depuis notes.

    - ajoute `oracle_type` si présent en notes ET absent du champ ;
    - peuple `blocked_by` UNIQUEMENT s'il est vide (ne clobbe jamais un blocked_by déjà
      structuré — ex. legacy IMP-005) ;
    - idempotent : re-matérialiser ne change rien.
    """
    meta = parse_notes_meta(imp.get("notes", "") or "")
    out = dict(imp)
    if meta.get("oracle_type") and not out.get("oracle_type"):
        out["oracle_type"] = meta["oracle_type"]
    if meta.get("blocked_by") and not out.get("blocked_by"):
        out["blocked_by"] = list(meta["blocked_by"])
    return out


def materialize_ledger(data: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    """Applique materialize_entry à chaque IMP. Renvoie (data_modifie, ids_modifies).
    Pur : ne mute pas l'entrée d'origine."""
    changed: list[str] = []
    new_imps: list[dict[str, Any]] = []
    for imp in data.get("improvements", []):
        m = materialize_entry(imp)
        if m != imp:
            changed.append(imp.get("id", "?"))
        new_imps.append(m)
    out = dict(data)
    out["improvements"] = new_imps
    return out, changed
