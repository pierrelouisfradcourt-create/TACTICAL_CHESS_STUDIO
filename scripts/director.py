#!/usr/bin/env python3
"""director.py — Director v0, Runtime Observer (IMP-177).

Observateur runtime READ-ONLY du studio. Agrège l'état courant à partir de
plusieurs sources et produit deux rapports :

    lab/reports/director_status.json   — état machine
    lab/reports/director_report.md     — état lisible

Sources lues (aucune n'est modifiée) :
    ledger        lab/chains/IMPROVEMENT_LEDGER.yaml
    current_state .studio_state/current_state.json
    events        lab/events.jsonl
    studio_meta   lab/reports/studio_meta_latest.json
    services      probe TCP des ports studio (claude_proxy, canvas_gateway, ...)

v0 n'exécute AUCUNE action et n'écrit RIEN hors les deux rapports.

Usage :
    python scripts/director.py --dry-run
    python scripts/director.py --out-json lab/reports/director_status.json \
                               --out-md   lab/reports/director_report.md
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import socket
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

REPO_ROOT = Path(__file__).resolve().parent.parent

LEDGER_PATH       = REPO_ROOT / "lab/chains/IMPROVEMENT_LEDGER.yaml"
CURRENT_STATE_PATH = REPO_ROOT / ".studio_state/current_state.json"
EVENTS_PATH       = REPO_ROOT / "lab/events.jsonl"
STUDIO_META_PATH  = REPO_ROOT / "lab/reports/studio_meta_latest.json"

DEFAULT_OUT_JSON = "lab/reports/director_status.json"
DEFAULT_OUT_MD   = "lab/reports/director_report.md"

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

    if not obs:
        obs.append("aucun signal — tout nominal")
    return obs


# ---------------------------------------------------------------------------
# Rendu
# ---------------------------------------------------------------------------

def build_status(dry_run: bool) -> dict[str, Any]:
    status: dict[str, Any] = {
        "timestamp": _now().isoformat(),
        "director_version": "v0",
        "mode": "dry-run" if dry_run else "observe",
        "ledger": load_ledger(LEDGER_PATH),
        "current_state": load_current_state(CURRENT_STATE_PATH),
        "events": load_events(EVENTS_PATH),
        "studio_meta": load_studio_meta(STUDIO_META_PATH),
        "services": probe_services(SERVICE_PORTS),
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

def main(argv: Optional[list[str]] = None) -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description="Director v0 — Runtime Observer (read-only)")
    parser.add_argument("--dry-run", action="store_true",
                        help="mode observation strict — aucun effet hors les 2 rapports (v0 par défaut)")
    parser.add_argument("--out-json", default=DEFAULT_OUT_JSON)
    parser.add_argument("--out-md", default=DEFAULT_OUT_MD)
    args = parser.parse_args(argv)

    status = build_status(dry_run=args.dry_run)
    markdown = render_markdown(status)

    out_json = REPO_ROOT / args.out_json
    out_md = REPO_ROOT / args.out_md
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_md.parent.mkdir(parents=True, exist_ok=True)

    out_json.write_text(json.dumps(status, indent=2, ensure_ascii=False), encoding="utf-8")
    out_md.write_text(markdown, encoding="utf-8")

    up = sum(1 for s in status["services"] if s["up"])
    log.info("mode=%s services=%d/%d up observations=%d",
             status["mode"], up, len(status["services"]), len(status["observations"]))
    for obs in status["observations"]:
        log.info("OBS: %s", obs)
    log.info("→ %s", out_json)
    log.info("→ %s", out_md)
    return 0


if __name__ == "__main__":
    sys.exit(main())
