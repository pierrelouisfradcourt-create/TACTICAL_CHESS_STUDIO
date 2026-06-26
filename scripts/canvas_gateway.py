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
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting canvas-gateway on 127.0.0.1:%d", GW_PORT)
    logger.info("meta=%s | gate_log=%s | hmac=%s", META_PATH, GATE_LOG, bool(HMAC_KEY))
    uvicorn.run(app, host="127.0.0.1", port=GW_PORT)
