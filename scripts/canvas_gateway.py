#!/usr/bin/env python3
"""canvas_gateway.py — Micro-gateway HTTP pour le Canvas Pierre.

Routes :
  GET  /api/meta          → studio_meta_latest.json
  GET  /api/meta/stream   → SSE, réémet le JSON à chaque modification fichier
  POST /api/refresh       → relance studio_meta.py
  POST /api/gate/{id}     → décision Pierre → HUMANGATE_DECISION_LOG.yaml (signé HMAC)

Environment :
  CANVAS_GW_PORT        Port d'écoute (default: 8766)
  STUDIO_HMAC_KEY       Clé HMAC pour signer les décisions (optionnel)
  CANVAS_META_PATH      Chemin du JSON meta (default: lab/reports/studio_meta_latest.json)
  CANVAS_GATE_LOG_PATH  Chemin du log YAML (default: lab/chains/HUMANGATE_DECISION_LOG.yaml)
"""

import asyncio
import hashlib
import hmac as hmac_lib
import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import yaml
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="canvas-gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # canvas servi en file:// ou 127.0.0.1
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

_REPO_ROOT   = Path(__file__).resolve().parent.parent
GW_PORT      = int(os.getenv("CANVAS_GW_PORT", "8766"))
HMAC_KEY     = os.getenv("STUDIO_HMAC_KEY", "")
META_PATH    = _REPO_ROOT / os.getenv("CANVAS_META_PATH", "lab/reports/studio_meta_latest.json")
GATE_LOG     = _REPO_ROOT / os.getenv("CANVAS_GATE_LOG_PATH", "lab/chains/HUMANGATE_DECISION_LOG.yaml")

# ── Cockpit v2 — sources read-only servies en 8766 (IMP-191) ───────────────
# Le cockpit unifie ne tape JAMAIS autopilot:7331 directement : tout passe ici.
DIRECTOR_PATH = _REPO_ROOT / "lab/reports/director_status.json"
REGISTRY_PATH = _REPO_ROOT / "studio/factory/registry/registry.json"
ELO_PATH      = _REPO_ROOT / "lab/reports/elo_match_latest.json"
TEAM_PATH     = _REPO_ROOT / "studio/openclaw-workspace/openclaw-team.yaml"

# governor.check() vit a la racine du repo — l'exposer a l'import (fail-closed).
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _read_meta() -> dict:
    if not META_PATH.exists():
        return {"error": "studio_meta_latest.json absent — lancez python scripts/studio_meta.py"}
    return json.loads(META_PATH.read_text(encoding="utf-8"))


def _sign(payload: bytes) -> str:
    """Retourne le HMAC-SHA256 hex du payload si STUDIO_HMAC_KEY est défini."""
    if not HMAC_KEY:
        return ""
    return hmac_lib.new(HMAC_KEY.encode(), payload, hashlib.sha256).hexdigest()


def _load_gate_log() -> dict:
    if not GATE_LOG.exists():
        return {"meta": {"version": "v0", "claim_verdict": "NO_CLAIM_ALLOWED", "authority": "HumanGate"}, "decisions": []}
    return yaml.safe_load(GATE_LOG.read_text(encoding="utf-8")) or {}


def _save_gate_log(data: dict) -> None:
    GATE_LOG.write_text(
        yaml.dump(data, allow_unicode=True, default_flow_style=False, sort_keys=False),
        encoding="utf-8",
    )


def _next_hgd_id(decisions: list[dict]) -> str:
    nums = []
    for d in decisions:
        did = str(d.get("decision_id", ""))
        if did.startswith("HGD-"):
            try:
                nums.append(int(did[4:]))
            except ValueError:
                pass
    return f"HGD-{(max(nums) + 1) if nums else 1:03d}"


def _read_json_file(path: Path):
    """Lecture JSON tolerante : jamais d'exception, toujours un dict/list.
    Service DOWN cote donnee -> {available: False, error: ...} (offline-propre)."""
    if not path.exists():
        return {"available": False, "error": f"{path.name} absent"}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        return {"available": False, "error": str(exc)}


def _governor_ok(mission: str, lane: str = "SAFE_AUTO") -> tuple[bool, str]:
    """Gate de gouvernance fail-closed AVANT toute action mutante.
    Si governance.governor est introuvable -> BLOCK (fail-closed)."""
    try:
        from governance import governor
    except Exception as exc:  # noqa: BLE001
        return False, f"governor indisponible (fail-closed): {exc}"
    decision = governor.check({"lane": lane, "mission": mission})
    return decision.allowed, decision.reason


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "meta_exists": META_PATH.exists(),
        "gate_log_exists": GATE_LOG.exists(),
        "hmac_configured": bool(HMAC_KEY),
    }


@app.get("/api/meta")
def get_meta() -> dict:
    return _read_meta()


@app.get("/api/meta/stream")
async def stream_meta():
    """SSE — pousse le JSON meta dès que le fichier change (polling mtime)."""
    async def _generator():
        last_mtime: float = 0.0
        while True:
            try:
                mtime = META_PATH.stat().st_mtime if META_PATH.exists() else 0.0
                if mtime != last_mtime:
                    last_mtime = mtime
                    data = META_PATH.read_text(encoding="utf-8") if META_PATH.exists() else "{}"
                    yield f"data: {data}\n\n"
            except Exception as exc:
                logger.warning("SSE read error: %s", exc)
            await asyncio.sleep(2)

    return StreamingResponse(_generator(), media_type="text/event-stream")


class RefreshResponse(BaseModel):
    status: str
    returncode: int
    stderr: str


@app.post("/api/refresh")
def refresh_meta() -> RefreshResponse:
    """Relance studio_meta.py pour mettre à jour le JSON."""
    ok, reason = _governor_ok("studio_meta_refresh")
    if not ok:
        raise HTTPException(status_code=403, detail=f"governor BLOCK: {reason}")
    meta_script = _REPO_ROOT / "scripts" / "studio_meta.py"
    if not meta_script.exists():
        raise HTTPException(status_code=503, detail="scripts/studio_meta.py introuvable")

    logger.info("Refreshing studio_meta.py")
    env = {**os.environ}
    if HMAC_KEY:
        env["STUDIO_HMAC_KEY"] = HMAC_KEY

    result = subprocess.run(
        ["python3", str(meta_script)],
        capture_output=True,
        text=True,
        cwd=str(_REPO_ROOT),
        timeout=60,
        env=env,
    )
    logger.info("studio_meta.py exit=%d", result.returncode)
    return RefreshResponse(
        status="ok" if result.returncode == 0 else "error",
        returncode=result.returncode,
        stderr=result.stderr.strip(),
    )


class GateDecision(BaseModel):
    verdict: str           # "APPROVE" | "REJECT"
    justification: str | None = None


@app.post("/api/gate/{gate_id}")
def decide_gate(gate_id: str, body: GateDecision) -> dict:
    """Pierre approuve ou rejette une gate. Écrit dans HUMANGATE_DECISION_LOG.yaml signé HMAC."""
    if body.verdict not in ("APPROVE", "REJECT"):
        raise HTTPException(status_code=400, detail="verdict doit être APPROVE ou REJECT")

    ok, reason = _governor_ok("human_gate_record")
    if not ok:
        raise HTTPException(status_code=403, detail=f"governor BLOCK: {reason}")

    log = _load_gate_log()
    decisions: list[dict] = log.get("decisions", [])

    # Vérifier que la gate est bien PENDING
    pending = next((d for d in decisions if d.get("decision_id") == gate_id and d.get("verdict") == "PENDING"), None)

    now_iso = datetime.now(timezone.utc).isoformat()

    if pending:
        # Mise à jour de la gate existante
        pending["verdict"] = body.verdict
        pending["approved_by"] = "HumanGate"
        pending["approved_at"] = now_iso
        if body.justification:
            pending.setdefault("evidence_refs", []).append(body.justification)
        entry = pending
    else:
        # Nouvelle entrée (gate inconnue — gate ad-hoc Pierre)
        new_id = _next_hgd_id(decisions)
        entry = {
            "decision_id": new_id,
            "title": f"Gate {gate_id} — décision Pierre",
            "category": "human_gate",
            "zone": "canvas",
            "surface": "canvas_gateway",
            "source_state": {"created": now_iso},
            "verdict": body.verdict,
            "evidence_refs": [body.justification] if body.justification else [],
            "blocked_actions": [],
            "approved_by": "HumanGate",
            "approved_at": now_iso,
        }
        decisions.append(entry)

    log["decisions"] = decisions

    # Sérialiser et signer
    content = yaml.dump(log, allow_unicode=True, default_flow_style=False, sort_keys=False)
    sig = _sign(content.encode("utf-8"))
    if sig:
        # Stocker la signature dans le meta du log
        log.setdefault("meta", {})["last_sig"] = sig
        log["meta"]["last_sig_at"] = now_iso
        content = yaml.dump(log, allow_unicode=True, default_flow_style=False, sort_keys=False)

    _save_gate_log(log)
    logger.info("Gate %s → %s (hmac=%s)", gate_id, body.verdict, bool(sig))

    return {
        "gate_id": gate_id,
        "verdict": body.verdict,
        "decision_id": entry.get("decision_id"),
        "hmac_signed": bool(sig),
        "timestamp": now_iso,
    }


# ---------------------------------------------------------------------------
# Cockpit v2 — panels read-only (IMP-191). Tous tolerants au fichier absent.
# ---------------------------------------------------------------------------

@app.get("/api/director")
def get_director():
    """director_status.json : ledger, services up/down, elo_live, next autoloop."""
    return _read_json_file(DIRECTOR_PATH)


@app.get("/api/factory")
def get_factory():
    """Registry de l'usine : jeux generes + verdict oracle."""
    data = _read_json_file(REGISTRY_PATH)
    if isinstance(data, list):
        return {
            "available": True,
            "count": len(data),
            "last": data[-1] if data else None,
            "entries": data,
        }
    return data  # dict {available: False, error: ...}


@app.get("/api/neural")
def get_neural():
    """elo_match_latest.json : ELO panel (teacher/hybrid/heuristic/neural)."""
    return _read_json_file(ELO_PATH)


def _scan_yaml_block_keys(text: str, block: str) -> list[str]:
    """Fallback deterministe : extrait les cles indentees d'1 niveau sous un
    bloc top-level `block:`. Utilise quand safe_load echoue (team.yaml contient
    des flow-mappings `{id}` invalides dans gateway.endpoints — bug pre-existant,
    fichier sous gate Pierre, donc non corrige ici)."""
    keys: list[str] = []
    in_block = False
    for raw in text.splitlines():
        if raw.startswith("#") or not raw.strip():
            continue
        if raw.rstrip() == f"{block}:":
            in_block = True
            continue
        if in_block:
            # Nouvelle cle top-level (col 0, non-espace) -> fin du bloc.
            if raw[0] not in (" ", "\t"):
                break
            # Cle directe de niveau 1 : exactement 2 espaces puis 'name:'.
            if len(raw) > 2 and raw[:2] == "  " and raw[2] != " ":
                name = raw.strip().split(":", 1)[0].strip()
                if name and not name.startswith("-"):
                    keys.append(name)
    return keys


@app.get("/api/openclaw")
def get_openclaw():
    """Etat OpenClaw : services up/down (depuis director) + roster + skills."""
    director = _read_json_file(DIRECTOR_PATH)
    services = director.get("services", []) if isinstance(director, dict) else []
    agents: list[dict] = []
    skills: list[str] = []
    roster_source = "none"
    if TEAM_PATH.exists():
        text = TEAM_PATH.read_text(encoding="utf-8")
        try:
            team = yaml.safe_load(text) or {}
            for name, spec in (team.get("agents") or {}).items():
                spec = spec or {}
                agents.append({
                    "name": name,
                    "role": spec.get("role", ""),
                    "provider": spec.get("provider", ""),
                    "authority": spec.get("authority", ""),
                })
            skills = list((team.get("skills") or {}).keys())
            roster_source = "yaml"
        except Exception:  # noqa: BLE001 — team.yaml non parsable -> fallback scan
            agents = [{"name": n, "role": "", "provider": "", "authority": ""}
                      for n in _scan_yaml_block_keys(text, "agents")]
            skills = _scan_yaml_block_keys(text, "skills")
            roster_source = "linescan"
    return {
        "available": True,
        "services": services,
        "agents": agents,
        "skills": skills,
        "skills_count": len(skills),
        "roster_source": roster_source,
    }


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting canvas-gateway on 127.0.0.1:%d", GW_PORT)
    logger.info("meta=%s | gate_log=%s | hmac=%s", META_PATH, GATE_LOG, bool(HMAC_KEY))
    uvicorn.run(app, host="127.0.0.1", port=GW_PORT)
