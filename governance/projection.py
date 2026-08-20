#!/usr/bin/env python3
"""projection.py — modèle de projection event-sourced (IMP-196).

    state(t) = fold(reduce_event, events[0..t], initial_state())

Rejouer depuis zéro == projeter tous les events == même état (déterministe).

Substrat : `lab/events.jsonl` — append-only, HMAC par ligne (durci IMP-192 : compare_digest +
rejet dur), schema-lock IMP-154 (`version` + champs autorisés). La projection est DÉRIVÉE et
en LECTURE SEULE : elle ne réécrit jamais le log ni l'état.

AUTONOME (RT-196-1) : on lit un **snapshot d'octets unique** du chemin projeté et on vérifie
l'HMAC sur CE snapshot (même construction qu'`ingest_event`, réutilisée pour la cohérence).
RT-196-2 : une dernière ligne sans '\\n' terminal qui ne parse pas = queue partielle d'un
append concurrent -> tolérée (ignorée), ≠ tamper. RT-196-3 : réducteur PUR (aucune horloge,
aucun uuid), `_skipped` = liste ordonnée -> projection byte-déterministe.

Périmètre honnête (RT-196-6) : `lab/events.jsonl` ne contient aujourd'hui que des events
oracle (`elo_match`). Aucun producteur n'émet encore `imp_closed` (câbler cmd_close ->
ingest_event.adapt_imp_closed = suivi GATÉ). La branche `imp_closed` du réducteur est donc
forward-ready et prouvée par des events synthétiques signés en test ; en prod la projection
`imps` reste vide jusqu'au câblage du producteur.
"""
from __future__ import annotations

import hmac as _hmaclib
import json
import sys
from pathlib import Path
from typing import Any

_HERE = Path(__file__).resolve().parent
REPO = _HERE.parent
sys.path.insert(0, str(REPO / "scripts"))
import ingest_event as ie  # noqa: E402  (réutilise _hmac, _validate_event_schema)

DEFAULT_EVENT_LOG = REPO / "lab" / "events.jsonl"

_ORACLE_TYPES = frozenset({"elo_match", "lichess_eval"})


class ProjectionError(Exception):
    """Log altéré / off-schema / non rejouable — pas de projection sur un log corrompu."""


# ── lecture + vérification (snapshot unique) ──────────────────────────────────

def _verify_line(raw_line: str, lineno: int) -> dict[str, Any]:
    """Vérifie JSON + schema-lock + HMAC d'une ligne complète. Renvoie l'entry sans `hmac`."""
    try:
        entry = json.loads(raw_line)
    except json.JSONDecodeError as exc:
        raise ProjectionError(f"events.jsonl:{lineno}: invalid JSON — tamper") from exc
    try:
        ie._validate_event_schema(entry, lineno)  # version requis + champs autorisés (IMP-154)
    except ValueError as exc:
        raise ProjectionError(f"events.jsonl:{lineno}: {exc}") from exc
    stored = entry.pop("hmac", None)
    if not (isinstance(stored, str) and stored.isascii()):
        raise ProjectionError(f"events.jsonl:{lineno}: HMAC malformed/missing — tamper")
    payload = json.dumps(entry, separators=(",", ":"), sort_keys=True)
    if not _hmaclib.compare_digest(stored, ie._hmac(payload)):
        raise ProjectionError(f"events.jsonl:{lineno}: HMAC mismatch — log tampered")
    return entry


def load_events(path: Path | str = DEFAULT_EVENT_LOG) -> list[dict[str, Any]]:
    """Snapshot unique du log -> events vérifiés, dans l'ordre du fichier.

    Tolère une dernière ligne partielle (append concurrent, pas de '\\n' terminal). Toute
    ligne COMPLÈTE invalide (JSON / schema / HMAC) lève ProjectionError (tamper)."""
    path = Path(path)
    if not path.exists():
        return []
    raw = path.read_bytes()                       # snapshot unique (RT-196-2)
    if not raw.strip():
        return []
    parts = raw.decode("utf-8").split("\n")
    # Le résidu après le dernier '\n' = queue. Vide si le log se termine par '\n' (cas normal).
    complete, tail = parts[:-1], parts[-1]
    if tail.strip():
        # ligne partielle finale (writer en cours) : tolérée, jamais traitée comme tamper.
        pass
    events: list[dict[str, Any]] = []
    for lineno, line in enumerate(complete, 1):
        line = line.strip()
        if not line:
            continue
        events.append(_verify_line(line, lineno))
    return events


# ── réducteur pur + projection ────────────────────────────────────────────────

def initial_state() -> dict[str, Any]:
    """État vide canonique."""
    return {"imps": {}, "oracles": {}, "_skipped": []}


def reduce_event(state: dict[str, Any], event: dict[str, Any]) -> dict[str, Any]:
    """Applique un event à l'état. PUR : n'utilise QUE les champs de l'event (pas d'horloge).

    Last-write-wins par entité (imp_id / oracle_id) — déterministe selon l'ordre fichier
    (RT-196-4 : l'idempotence task_id vit à l'ingestion IMP-155, pas ici)."""
    new = {
        "imps": dict(state["imps"]),
        "oracles": dict(state["oracles"]),
        "_skipped": list(state["_skipped"]),     # liste ordonnée (RT-196-3)
    }
    etype = event.get("type")
    ts = event.get("ts")
    task_id = event.get("task_id")
    if etype == "imp_closed":
        imp_id = event.get("imp_id")
        if imp_id:
            new["imps"][imp_id] = {"ecg_state": "CLOSED", "last_event_ts": ts, "task_id": task_id}
        else:
            new["_skipped"].append(task_id)
    elif etype in _ORACLE_TYPES:
        oid = event.get("oracle_id") or etype
        new["oracles"][oid] = {"last_ts": ts, "task_id": task_id}
    else:
        new["_skipped"].append(task_id)          # type inconnu : no-op tracé (forward-compat)
    return new


def project(events: list[dict[str, Any]]) -> dict[str, Any]:
    """Fold pur des events en un état. Déterministe."""
    state = initial_state()
    for ev in events:
        state = reduce_event(state, ev)
    return state


def replay(path: Path | str = DEFAULT_EVENT_LOG) -> dict[str, Any]:
    """state = project(load_events(path)). Rejoue depuis zéro."""
    return project(load_events(path))


def canonical(state: dict[str, Any]) -> str:
    """Sérialisation canonique pour comparaison déterministe d'états."""
    return json.dumps(state, sort_keys=True, separators=(",", ":"))


if __name__ == "__main__":
    st = replay()
    print(canonical(st))
