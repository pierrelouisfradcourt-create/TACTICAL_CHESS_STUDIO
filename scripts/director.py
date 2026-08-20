#!/usr/bin/env python3
"""director.py — Director v1, Runtime Observer + Scheduler (IMP-177).

Observateur runtime READ-ONLY du studio. Agrège l'état courant à partir de
plusieurs sources et produit trois rapports :

    lab/reports/director_status.json   — état machine
    lab/reports/director_report.md     — état lisible
    lab/reports/director_schedule.json — 3 prochains IMPs recommandés + raison

Sources lues (aucune n'est modifiée) :
    ledger        lab/chains/IMPROVEMENT_LEDGER.yaml
    current_state .studio_state/current_state.json
    events        lab/events.jsonl
    studio_meta   lab/reports/studio_meta_latest.json
    services      probe TCP des ports studio (claude_proxy, canvas_gateway, ...)

v1 reste READ-ONLY sur le ledger : le scheduler RECOMMANDE seulement, il ne
modifie jamais IMPROVEMENT_LEDGER.yaml et ne lance aucune action. La sélection
des IMPs est déterministe (filtre + tri stable), sans inférence LM.

Schedule (director_schedule.json) :
    {timestamp, recommended_imps: [{id, title, impact, effort, reason}],
     next_action: "autoloop"}  # "idle" si aucun IMP éligible

Usage :
    python scripts/director.py --dry-run
    python scripts/director.py --schedule              # daemon scheduler, 10 min, → director.log
    python scripts/director.py --daemon --interval 600
    python scripts/director.py --out-json lab/reports/director_status.json \
                               --out-md   lab/reports/director_report.md
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import re
import socket
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

REPO_ROOT = Path(__file__).resolve().parent.parent

LEDGER_PATH       = REPO_ROOT / "lab/chains/IMPROVEMENT_LEDGER.yaml"
CURRENT_STATE_PATH = REPO_ROOT / ".studio_state/current_state.json"
EVENTS_PATH       = REPO_ROOT / "lab/events.jsonl"
STUDIO_META_PATH  = REPO_ROOT / "lab/reports/studio_meta_latest.json"

DEFAULT_OUT_JSON     = "lab/reports/director_status.json"
DEFAULT_OUT_MD       = "lab/reports/director_report.md"
DEFAULT_OUT_SCHEDULE = "lab/reports/director_schedule.json"

# Scheduler — critères de recommandation (déterministe, read-only)
SCHEDULE_TOP_N      = 3
SCHEDULE_LANE       = "SAFE_AUTO"
SCHEDULE_STATUS     = "OPEN"
SCHEDULE_NEXT_ACTION = "autoloop"   # action proposée quand au moins 1 IMP recommandé
SCHEDULE_NEXT_ACTION_IDLE = "idle"  # état vide — rien d'éligible, pas d'autoloop
# Tri primaire : impact décroissant (HIGH > MEDIUM > LOW).
IMPACT_RANK = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
IMPACT_RANK_UNKNOWN = 99
# Tri secondaire : effort croissant (quick wins d'abord — SMALL > MEDIUM > LARGE), puis id stable.
EFFORT_RANK = {"TRIVIAL": 0, "SMALL": 1, "MEDIUM": 2, "LARGE": 3, "XL": 4}
EFFORT_RANK_UNKNOWN = 99
# Zones FORBIDDEN (AGENTS.md / CLAUDE.md) — un IMP qui touche l'une d'elles
# n'est jamais recommandé en SAFE_AUTO : il exige une gate Pierre explicite.
FORBIDDEN_PREFIXES = ("tests/", "eval/", "oracle/", "bench/", "puzzles/", ".github/")

# Daemon — intervalle par défaut 10 min
DEFAULT_INTERVAL_S = 600
# Journal daemon — append-only, séparé des rapports d'état
DEFAULT_LOG = "lab/reports/director.log"

# Ports studio — alignés sur scripts/healthcheck.py (SERVICES)
SERVICE_PORTS = [
    ("claude_proxy",     8765),
    ("canvas_gateway",   8766),
    ("openclaw_gateway", 18789),
    ("autopilot",        7331),
]

CONNECT_TIMEOUT_S = 2
STALE_THRESHOLD_H = 2.0

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger("director")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_ts(value: Optional[str]) -> Optional[datetime]:
    """Parse un timestamp ISO 8601 tolérant (suffixe Z accepté)."""
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _age_hours(ts: Optional[datetime]) -> Optional[float]:
    if ts is None:
        return None
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return round((_now() - ts).total_seconds() / 3600.0, 2)


def _mtime_age_hours(path: Path) -> Optional[float]:
    if not path.exists():
        return None
    mtime = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
    return round((_now() - mtime).total_seconds() / 3600.0, 2)


def _write_atomic(path: Path, content: str) -> None:
    """Écrit via fichier temporaire + rename — pas de lecteur sur un état partiel.

    En cas d'échec, le fichier cible existant reste intact (le tmp est nettoyé).
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    try:
        tmp.write_text(content, encoding="utf-8")
        os.replace(tmp, path)
    except OSError:
        if tmp.exists():
            try:
                tmp.unlink()
            except OSError:
                pass
        raise


# ---------------------------------------------------------------------------
# Loaders (défensifs — fichier absent/corrompu => available:false, jamais crash)
# ---------------------------------------------------------------------------

_IMP_RE = re.compile(r"^- id:\s*(\S+)\s*$", re.MULTILINE)
_STATUS_RE = re.compile(r"^\s+status:\s*(\S+)\s*$", re.MULTILINE)
_LAST_UPDATED_RE = re.compile(r"^\s+last_updated_session:\s*['\"]?([^'\"\n]+)['\"]?\s*$", re.MULTILINE)


def _ledger_from_text(text: str) -> dict[str, Any]:
    """Fallback sans PyYAML : associe chaque `- id:` au prochain `status:`.

    Le ledger est une liste plate d'improvements ; chaque entrée déclare son id
    puis son status. On apparie par position dans le texte.
    """
    ids = [(m.start(), m.group(1)) for m in _IMP_RE.finditer(text)]
    statuses = [(m.start(), m.group(1)) for m in _STATUS_RE.finditer(text)]

    by_status: dict[str, list[str]] = {}
    for idx, (pos, imp_id) in enumerate(ids):
        next_pos = ids[idx + 1][0] if idx + 1 < len(ids) else len(text)
        status = next((s for sp, s in statuses if pos < sp < next_pos), "UNKNOWN")
        by_status.setdefault(status, []).append(imp_id)

    m = _LAST_UPDATED_RE.search(text)
    return {
        "available": True,
        "source": "regex_fallback",
        "total": len(ids),
        "by_status": {k: len(v) for k, v in by_status.items()},
        "open_ids": by_status.get("OPEN", []),
        "last_updated": m.group(1).strip() if m else None,
    }


def load_ledger(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"available": False, "reason": "fichier absent"}
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        return {"available": False, "reason": f"lecture impossible: {exc}"}

    try:
        import yaml
    except ImportError:
        # PyYAML absent (python système) — fallback regex robuste
        return _ledger_from_text(text)
    try:
        data = yaml.safe_load(text) or {}
    except yaml.YAMLError as exc:
        return {"available": False, "reason": f"YAML invalide: {exc}"}

    imps = data.get("improvements", [])
    by_status: dict[str, list[str]] = {}
    for imp in imps:
        status = imp.get("status", "UNKNOWN")
        by_status.setdefault(status, []).append(imp.get("id", "?"))

    return {
        "available": True,
        "source": "pyyaml",
        "total": len(imps),
        "by_status": {k: len(v) for k, v in by_status.items()},
        "open_ids": by_status.get("OPEN", []),
        "last_updated": data.get("meta", {}).get("last_updated_session"),
    }


# ---------------------------------------------------------------------------
# Scheduler (Director v1) — recommandation déterministe, read-only
# ---------------------------------------------------------------------------

def _load_improvements_full(path: Path) -> dict[str, Any]:
    """Charge les IMPs avec leurs champs structurés (impact/lane/blocked_by).

    Nécessite PyYAML : le fallback regex de load_ledger() n'extrait pas de
    façon fiable des champs imbriqués comme blocked_by. Si PyYAML est absent
    ou le fichier illisible, on renvoie available:false (jamais de crash) et
    le scheduler produit une liste vide plutôt qu'une recommandation hasardeuse.
    """
    if not path.exists():
        return {"available": False, "reason": "fichier absent", "improvements": []}
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        return {"available": False, "reason": f"lecture impossible: {exc}", "improvements": []}
    try:
        import yaml
    except ImportError:
        return {"available": False, "reason": "PyYAML absent — scheduler requiert yaml",
                "improvements": []}
    try:
        data = yaml.safe_load(text) or {}
    except yaml.YAMLError as exc:
        return {"available": False, "reason": f"YAML invalide: {exc}", "improvements": []}

    return {"available": True, "reason": None,
            "improvements": data.get("improvements", []) or []}


def _effort_rank(effort: Optional[str]) -> int:
    return EFFORT_RANK.get((effort or "").upper(), EFFORT_RANK_UNKNOWN)


def _impact_rank(impact: Optional[str]) -> int:
    return IMPACT_RANK.get((impact or "").upper(), IMPACT_RANK_UNKNOWN)


def _imp_forbidden_hits(imp: dict[str, Any]) -> list[str]:
    """Liste les fichiers de l'IMP qui tombent dans une zone FORBIDDEN.

    Tolérant : `files` peut être absent, None, une str unique ou une liste.
    Les chemins sont normalisés (backslash → slash, `./` retiré) avant test.
    """
    files = imp.get("files")
    if files is None:
        return []
    if isinstance(files, str):
        files = [files]
    hits: list[str] = []
    for f in files:
        if not isinstance(f, str):
            continue
        norm = f.replace("\\", "/").lstrip("./")
        if any(norm.startswith(p) for p in FORBIDDEN_PREFIXES):
            hits.append(f)
    return hits


def _imp_matches(imp: dict[str, Any]) -> bool:
    """Critères Director v1 : OPEN · lane SAFE_AUTO · non bloqué · hors FORBIDDEN.

    L'impact n'est PAS un filtre — il sert uniquement de tri (HIGH > MEDIUM > LOW).
    """
    if imp.get("status") != SCHEDULE_STATUS:
        return False
    if imp.get("lane") != SCHEDULE_LANE:
        return False
    if imp.get("blocked_by") or []:
        return False
    if _imp_forbidden_hits(imp):
        return False
    return True


def _schedule_reason(imp: dict[str, Any]) -> str:
    impact = imp.get("impact") or "?"
    effort = imp.get("effort") or "?"
    return (f"impact {impact} · effort {effort} · lane {SCHEDULE_LANE} · "
            f"aucun blocage · hors FORBIDDEN — prêt à planifier")


def schedule_next_imps(ledger_path: Path = LEDGER_PATH,
                       top_n: int = SCHEDULE_TOP_N) -> dict[str, Any]:
    """Retourne les `top_n` prochains IMPs prioritaires + raison.

    Filtre : status OPEN, lane SAFE_AUTO, blocked_by vide, hors zones FORBIDDEN.
    Tri déterministe : impact décroissant (HIGH > MEDIUM > LOW), puis effort
    croissant (quick wins — SMALL > MEDIUM > LARGE), puis id (ordre stable).
    Read-only — ne modifie jamais le ledger.
    """
    loaded = _load_improvements_full(ledger_path)
    eligible = [imp for imp in loaded["improvements"] if _imp_matches(imp)]

    eligible.sort(key=lambda i: (_impact_rank(i.get("impact")),
                                 _effort_rank(i.get("effort")),
                                 str(i.get("id"))))
    selected = eligible[:top_n]

    recommended_imps = [
        {
            "id": imp.get("id"),
            "title": imp.get("title"),
            "impact": imp.get("impact"),
            "effort": imp.get("effort"),
            "reason": _schedule_reason(imp),
        }
        for imp in selected
    ]

    return {
        "available": loaded["available"],
        "reason": loaded["reason"],
        "criteria": {
            "status": SCHEDULE_STATUS,
            "lane": SCHEDULE_LANE,
            "blocked_by": "empty",
            "forbidden_zones": list(FORBIDDEN_PREFIXES),
            "sort": "impact desc, effort asc, then id",
        },
        "eligible_count": len(eligible),
        "recommended_imps": recommended_imps,
        "next_action": SCHEDULE_NEXT_ACTION if recommended_imps else SCHEDULE_NEXT_ACTION_IDLE,
    }


def build_schedule() -> dict[str, Any]:
    sched = schedule_next_imps()
    sched["timestamp"] = _now().isoformat()
    sched["director_version"] = "v1"
    return sched


def load_current_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"available": False, "reason": "fichier absent"}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        return {"available": False, "reason": f"JSON invalide: {exc}"}

    updated_at = data.get("updated_at")
    return {
        "available": True,
        "claim_posture": data.get("claim_posture"),
        "updated_at": updated_at,
        "age_h": _age_hours(_parse_ts(updated_at)),
        "blocked_surfaces": data.get("blocked_surfaces", []),
        "status_by_surface": data.get("status_by_surface", {}),
        "open_blockers": [b.get("summary") for b in data.get("open_blockers", [])],
        "open_risks": [r.get("summary") for r in data.get("open_risks", [])],
        "humangate_required": [h.get("summary") for h in data.get("humangate_required_items", [])],
        "next_best_mission": data.get("next_best_mission"),
    }


def load_events(path: Path, tail: int = 10) -> dict[str, Any]:
    if not path.exists():
        return {"available": False, "reason": "fichier absent"}
    try:
        lines = [ln for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    except OSError as exc:
        return {"available": False, "reason": f"lecture impossible: {exc}"}

    recent: list[dict[str, Any]] = []
    for ln in lines[-tail:]:
        try:
            recent.append(json.loads(ln))
        except json.JSONDecodeError:
            continue

    last = recent[-1] if recent else None
    last_ts = last.get("ts") if last else None
    return {
        "available": True,
        "count": len(lines),
        "last_event": {"type": last.get("type"), "oracle_id": last.get("oracle_id"),
                       "ts": last_ts} if last else None,
        "last_ts": last_ts,
        "last_age_h": _age_hours(_parse_ts(last_ts)),
    }


def load_studio_meta(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"available": False, "reason": "fichier absent"}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        return {"available": False, "reason": f"JSON invalide: {exc}"}

    ts = data.get("timestamp")
    return {
        "available": True,
        "timestamp": ts,
        "age_h": _age_hours(_parse_ts(ts)),
        "global_verdict": data.get("global_verdict"),
        "elo_live": data.get("elo_live"),
        "blockers": data.get("blockers", []),
        "pending_gates": [g.get("gate_id") for g in data.get("pending_gates", [])],
    }


def probe_services(ports: list[tuple[str, int]]) -> list[dict[str, Any]]:
    """Probe TCP non bloquant (timeout court) de chaque service. Read-only."""
    results: list[dict[str, Any]] = []
    for name, port in ports:
        up = False
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=CONNECT_TIMEOUT_S):
                up = True
        except OSError:
            up = False
        results.append({"name": name, "port": port, "up": up})
    return results


# ---------------------------------------------------------------------------
# Observations dérivées (signaux non destructifs)
# ---------------------------------------------------------------------------

def derive_observations(status: dict[str, Any]) -> list[str]:
    obs: list[str] = []

    meta = status["studio_meta"]
    if not meta.get("available"):
        obs.append(f"studio_meta indisponible ({meta.get('reason')})")
    else:
        age = meta.get("age_h")
        if age is not None and age > STALE_THRESHOLD_H:
            obs.append(f"studio_meta stale ({age}h > {STALE_THRESHOLD_H}h)")
        if meta.get("global_verdict") not in (None, "PASS"):
            obs.append(f"studio_meta global_verdict = {meta.get('global_verdict')}")

    cs = status["current_state"]
    if not cs.get("available"):
        obs.append(f"current_state indisponible ({cs.get('reason')})")
    else:
        age = cs.get("age_h")
        if age is not None and age > STALE_THRESHOLD_H:
            obs.append(f"current_state stale ({age}h > {STALE_THRESHOLD_H}h)")
        for surf in cs.get("blocked_surfaces", []):
            obs.append(f"surface BLOCKED: {surf}")
        if cs.get("humangate_required"):
            obs.append(f"HumanGate requis: {len(cs['humangate_required'])} item(s)")

    down = [s["name"] for s in status["services"] if not s["up"]]
    if down:
        obs.append(f"services DOWN: {', '.join(down)}")

    ledger = status["ledger"]
    if ledger.get("available") and ledger.get("open_ids"):
        obs.append(f"IMP ouverts: {len(ledger['open_ids'])} ({', '.join(ledger['open_ids'])})")

    events = status["events"]
    if not events.get("available"):
        obs.append(f"events.jsonl indisponible ({events.get('reason')})")

    sched = status.get("schedule", {})
    rec = sched.get("recommended_imps", [])
    if rec:
        ids = ", ".join(str(r.get("id")) for r in rec)
        obs.append(f"scheduler: {len(rec)} IMP recommandé(s) ({ids}) "
                   f"sur {sched.get('eligible_count')} éligible(s) → {sched.get('next_action')}")
    elif sched.get("available"):
        obs.append("scheduler: aucun IMP éligible (SAFE_AUTO · non bloqué · hors FORBIDDEN)")

    if not obs:
        obs.append("aucun signal — tout nominal")
    return obs


# ---------------------------------------------------------------------------
# Rendu
# ---------------------------------------------------------------------------

def build_status(dry_run: bool) -> dict[str, Any]:
    status: dict[str, Any] = {
        "timestamp": _now().isoformat(),
        "director_version": "v1",
        "mode": "dry-run" if dry_run else "observe",
        "ledger": load_ledger(LEDGER_PATH),
        "current_state": load_current_state(CURRENT_STATE_PATH),
        "events": load_events(EVENTS_PATH),
        "studio_meta": load_studio_meta(STUDIO_META_PATH),
        "services": probe_services(SERVICE_PORTS),
        "schedule": build_schedule(),
        "freshness": {
            "ledger_mtime_age_h": _mtime_age_hours(LEDGER_PATH),
            "current_state_mtime_age_h": _mtime_age_hours(CURRENT_STATE_PATH),
            "studio_meta_mtime_age_h": _mtime_age_hours(STUDIO_META_PATH),
            "events_mtime_age_h": _mtime_age_hours(EVENTS_PATH),
        },
    }
    status["observations"] = derive_observations(status)
    return status


def _yes_no(flag: bool) -> str:
    return "UP" if flag else "DOWN"


def render_markdown(status: dict[str, Any]) -> str:
    lines: list[str] = []
    lines.append("# Director v0 — Runtime Status")
    lines.append("")
    lines.append(f"- Généré : `{status['timestamp']}`")
    lines.append(f"- Mode : `{status['mode']}` · version `{status['director_version']}`")
    lines.append("")

    # Observations
    lines.append("## Observations")
    for obs in status["observations"]:
        lines.append(f"- {obs}")
    lines.append("")

    # Services
    lines.append("## Services")
    lines.append("")
    lines.append("| Service | Port | État |")
    lines.append("|---|---|---|")
    for svc in status["services"]:
        lines.append(f"| {svc['name']} | {svc['port']} | {_yes_no(svc['up'])} |")
    lines.append("")

    # studio_meta
    meta = status["studio_meta"]
    lines.append("## studio_meta")
    if meta.get("available"):
        lines.append(f"- global_verdict : **{meta.get('global_verdict')}**")
        lines.append(f"- âge : {meta.get('age_h')}h")
        elo = meta.get("elo_live") or {}
        if elo:
            lines.append(f"- ELO : hybrid={elo.get('hybrid')} heuristic={elo.get('heuristic')} "
                         f"neural={elo.get('neural')} delta={elo.get('delta')} ({elo.get('verdict')})")
        if meta.get("blockers"):
            lines.append("- blockers :")
            for b in meta["blockers"]:
                lines.append(f"  - {b}")
        if meta.get("pending_gates"):
            lines.append(f"- pending_gates : {', '.join(meta['pending_gates'])}")
    else:
        lines.append(f"- indisponible ({meta.get('reason')})")
    lines.append("")

    # current_state
    cs = status["current_state"]
    lines.append("## current_state")
    if cs.get("available"):
        lines.append(f"- claim_posture : {cs.get('claim_posture')}")
        lines.append(f"- âge : {cs.get('age_h')}h")
        if cs.get("blocked_surfaces"):
            lines.append(f"- blocked_surfaces : {', '.join(cs['blocked_surfaces'])}")
        if cs.get("open_blockers"):
            lines.append("- open_blockers :")
            for b in cs["open_blockers"]:
                lines.append(f"  - {b}")
        if cs.get("open_risks"):
            lines.append("- open_risks :")
            for r in cs["open_risks"]:
                lines.append(f"  - {r}")
        if cs.get("humangate_required"):
            lines.append(f"- HumanGate requis : {len(cs['humangate_required'])} item(s)")
    else:
        lines.append(f"- indisponible ({cs.get('reason')})")
    lines.append("")

    # ledger
    ledger = status["ledger"]
    lines.append("## ledger")
    if ledger.get("available"):
        lines.append(f"- total : {ledger.get('total')} · last_updated : {ledger.get('last_updated')}")
        lines.append(f"- by_status : {ledger.get('by_status')}")
        if ledger.get("open_ids"):
            lines.append(f"- OPEN : {', '.join(ledger['open_ids'])}")
    else:
        lines.append(f"- indisponible ({ledger.get('reason')})")
    lines.append("")

    # scheduler
    sched = status.get("schedule", {})
    lines.append("## scheduler — prochains IMPs")
    if sched.get("available"):
        rec = sched.get("recommended_imps", [])
        lines.append(f"- critères : OPEN · {SCHEDULE_LANE} · non bloqué · hors FORBIDDEN")
        lines.append("- tri : impact↓ (HIGH>MEDIUM>LOW) puis effort↑ (SMALL>MEDIUM>LARGE)")
        lines.append(f"- éligibles : {sched.get('eligible_count')} · recommandés : {len(rec)} "
                     f"· next_action : `{sched.get('next_action')}`")
        for r in rec:
            lines.append(f"- **{r.get('id')}** [{r.get('impact')}/{r.get('effort')}] — {r.get('title')}")
            lines.append(f"  - {r.get('reason')}")
        if not rec:
            lines.append("- aucun IMP éligible")
    else:
        lines.append(f"- indisponible ({sched.get('reason')})")
    lines.append("")

    # events
    events = status["events"]
    lines.append("## events")
    if events.get("available"):
        lines.append(f"- count : {events.get('count')}")
        last = events.get("last_event")
        if last:
            lines.append(f"- dernier : `{last.get('type')}` / `{last.get('oracle_id')}` "
                         f"@ {last.get('ts')} (âge {events.get('last_age_h')}h)")
    else:
        lines.append(f"- indisponible ({events.get('reason')})")
    lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run_once(args: argparse.Namespace) -> dict[str, Any]:
    """Un cycle complet : observe + planifie + écrit les 3 rapports (atomique)."""
    status = build_status(dry_run=args.dry_run)
    markdown = render_markdown(status)

    out_json     = REPO_ROOT / args.out_json
    out_md       = REPO_ROOT / args.out_md
    out_schedule = REPO_ROOT / args.out_schedule

    _write_atomic(out_json, json.dumps(status, indent=2, ensure_ascii=False))
    _write_atomic(out_md, markdown)
    _write_atomic(out_schedule, json.dumps(status["schedule"], indent=2, ensure_ascii=False))

    up = sum(1 for s in status["services"] if s["up"])
    rec = status["schedule"].get("recommended_imps", [])
    log.info("mode=%s services=%d/%d up observations=%d recommended=%d",
             status["mode"], up, len(status["services"]),
             len(status["observations"]), len(rec))
    for obs in status["observations"]:
        log.info("OBS: %s", obs)
    log.info("→ %s", out_json)
    log.info("→ %s", out_md)
    log.info("→ %s", out_schedule)

    # Pont observe→agir (IMP-181) — opt-in seulement. Sans --dispatch, le
    # director reste un observateur strictement read-only. Avec --dispatch mais
    # sans --dispatch-execute, on planifie (dry-run) sans rien exécuter.
    if getattr(args, "dispatch", False):
        _maybe_dispatch(out_schedule, execute=getattr(args, "dispatch_execute", False))

    return status


def _maybe_dispatch(schedule_path: Path, execute: bool) -> None:
    """Délègue au dispatch_bridge (import paresseux — read-only si indisponible).

    Ne lève jamais : un bridge absent ou en erreur ne doit pas tuer le director.
    """
    try:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import dispatch_bridge
    except ImportError as exc:
        log.warning("dispatch_bridge indisponible (%s) — observe-only", exc)
        return
    try:
        outcome = dispatch_bridge.maybe_dispatch(schedule_path=schedule_path, execute=execute)
        log.info("dispatch: action=%s imp=%s", outcome.get("action"), outcome.get("imp_id"))
    except Exception:  # noqa: BLE001 — le dispatch ne doit jamais faire tomber l'observateur
        log.exception("dispatch_bridge a échoué — observe-only")


def _attach_file_logging(log_path: str) -> None:
    """Ajoute un handler fichier (append, utf-8) sur lab/reports/director.log.

    Idempotent : ne ré-attache pas deux fois le même fichier. Si l'ouverture
    échoue (disque, permission), on log l'erreur sur la console et on continue
    sans handler fichier — le daemon ne doit pas mourir pour un log indisponible.
    """
    target = (REPO_ROOT / log_path).resolve()
    for h in log.handlers:
        if isinstance(h, logging.FileHandler) and Path(getattr(h, "baseFilename", "")) == target:
            return
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        handler = logging.FileHandler(target, encoding="utf-8")
        handler.setFormatter(logging.Formatter("%(asctime)s  %(levelname)s  %(message)s"))
        log.addHandler(handler)
        log.info("journal daemon → %s", target)
    except OSError as exc:
        log.warning("journal fichier indisponible (%s) — daemon sans log fichier", exc)


def run_daemon(args: argparse.Namespace) -> int:
    """Boucle toutes les `interval` secondes. Un cycle qui échoue n'arrête pas
    le daemon — l'erreur est loggée et le cycle suivant est tenté."""
    interval = max(1, args.interval)
    log.info("Director v1 scheduler daemon démarré — intervalle %ds (Ctrl+C pour arrêter)", interval)
    try:
        while True:
            try:
                run_once(args)
            except Exception:  # noqa: BLE001 — un cycle isolé ne doit pas tuer le daemon
                log.exception("cycle échoué — on réessaie au prochain intervalle")
            time.sleep(interval)
    except KeyboardInterrupt:
        log.info("arrêt demandé (KeyboardInterrupt) — fin propre du daemon")
        return 0


def main(argv: Optional[list[str]] = None) -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description="Director v1 — Runtime Observer + Scheduler (read-only)")
    parser.add_argument("--dry-run", action="store_true",
                        help="mode observation strict — aucun effet hors les rapports")
    parser.add_argument("--daemon", action="store_true",
                        help="boucle en continu (intervalle --interval, défaut 600s)")
    parser.add_argument("--schedule", action="store_true",
                        help="mode scheduler daemon — boucle toutes les 10 min, "
                             f"journalise dans {DEFAULT_LOG}")
    parser.add_argument("--interval", type=int, default=DEFAULT_INTERVAL_S,
                        help=f"intervalle daemon en secondes (défaut {DEFAULT_INTERVAL_S})")
    parser.add_argument("--log", default=DEFAULT_LOG,
                        help=f"fichier journal du daemon (défaut {DEFAULT_LOG})")
    parser.add_argument("--out-json", default=DEFAULT_OUT_JSON)
    parser.add_argument("--out-md", default=DEFAULT_OUT_MD)
    parser.add_argument("--out-schedule", default=DEFAULT_OUT_SCHEDULE)
    parser.add_argument("--dispatch", action="store_true",
                        help="après l'observation, déléguer au dispatch_bridge "
                             "(plan dry-run par défaut — n'exécute rien)")
    parser.add_argument("--dispatch-execute", dest="dispatch_execute", action="store_true",
                        help="avec --dispatch : EXÉCUTE réellement le 1er IMP recommandé "
                             "si les services sont UP (sinon plan seulement)")
    args = parser.parse_args(argv)

    if args.daemon or args.schedule:
        _attach_file_logging(args.log)
        return run_daemon(args)
    run_once(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
