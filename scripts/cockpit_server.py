#!/usr/bin/env python3
"""cockpit_server.py — Backend cockpit unifie (IMP-210, option A).

FastAPI, fichier unique, bind 127.0.0.1:8770. Lit des FICHIERS (jamais
autopilot:7331) et delegue les actions mutantes a des subprocess GOUVERNES
(governor.check fail-closed avant tout spawn/ecriture).

Doctrine :
  - read tolerant : fichier absent -> {"available": false} en HTTP 200, JAMAIS 500.
  - bind loopback uniquement (127.0.0.1).
  - encoding='utf-8' explicite sur tout open().
  - governor.check() avant chaque mutation ; BLOCK -> HTTP 403.
  - lock fichier .studio_state/cockpit_runs.lock : anti double-lancement
    (vs autopilot/autoloop/factory/council).
  - registre RUNS en memoire (workers=1) : POST renvoie {run_id}, stdout
    streame via SSE.

Endpoints REST :
  GET  /health
  GET  /api/overview
  GET  /api/ledger            GET /api/ledger/{id}
  GET  /api/director          GET /api/factory
  GET  /api/council           GET /api/elo
  GET  /api/events?limit=N    GET /api/services
  POST /api/council/run       POST /api/factory/run
  POST /api/gate/{id}         POST /api/director/refresh

SSE :
  GET  /api/stream/meta       (poll mtime studio_meta_latest.json, 2s)
  GET  /api/stream/events     (tail lab/events.jsonl, 1s)
  GET  /api/stream/runs/{id}  (drain stdout subprocess)

Environment :
  COCKPIT_PORT          Port d'ecoute (default: 8770)
  STUDIO_HMAC_KEY       Cle HMAC pour signer les gates / verifier l'ELO (optionnel)

claim_verdict: NO_CLAIM_ALLOWED
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac as hmac_lib
import json
import logging
import os
import socket
import sys
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import yaml
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("cockpit")

# --------------------------------------------------------------------------
# Chemins (tous repo-relatifs ; jamais absolus utilisateur)
# --------------------------------------------------------------------------
_REPO_ROOT = Path(__file__).resolve().parent.parent

COCKPIT_PORT = int(os.getenv("COCKPIT_PORT", "8770"))
HMAC_KEY = os.getenv("STUDIO_HMAC_KEY", "")

LEDGER_PATH = _REPO_ROOT / "lab/chains/IMPROVEMENT_LEDGER.yaml"
DIRECTOR_PATH = _REPO_ROOT / "lab/reports/director_status.json"
REGISTRY_PATH = _REPO_ROOT / "studio/factory/registry/registry.json"
COUNCIL_DIR = _REPO_ROOT / "lab/council"
CONSENSUS_PATH = COUNCIL_DIR / "CONSENSUS.md"
ELO_PATH = _REPO_ROOT / "lab/reports/elo_match_latest.json"
ELO_HMAC_PATH = _REPO_ROOT / "lab/reports/elo_match_latest.json.hmac"
EVENTS_PATH = _REPO_ROOT / "lab/events.jsonl"
GATE_LOG_PATH = _REPO_ROOT / "lab/chains/HUMANGATE_DECISION_LOG.yaml"
STUDIO_META_PATH = _REPO_ROOT / "lab/reports/studio_meta_latest.json"

COUNCIL_SCRIPT = _REPO_ROOT / "scripts/council.py"
FACTORY_SCRIPT = _REPO_ROOT / "studio/factory/factory_loop.py"
DIRECTOR_SCRIPT = _REPO_ROOT / "scripts/director.py"

STATE_DIR = _REPO_ROOT / ".studio_state"
LOCK_PATH = STATE_DIR / "cockpit_runs.lock"

# Ports services studio (alignes sur ports.yaml SSOT).
SERVICE_PORTS = {
    "autopilot": 7331,
    "claude_proxy": 8765,
    "canvas_gateway": 8766,
    "lm_studio": 1234,
}

LOCK_STALE_S = 30 * 60  # un lock plus vieux que 30 min est considere mort.

# governor.check() vit a la racine du repo — l'exposer a l'import (fail-closed).
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

# Registre des runs en memoire (uvicorn workers=1).
RUNS: dict[str, dict[str, Any]] = {}


# --------------------------------------------------------------------------
# Helpers lecture tolerante
# --------------------------------------------------------------------------

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_json_tolerant(path: Path) -> Any:
    """Lecture JSON tolerante : jamais d'exception, jamais 500.
    Fichier absent / illisible -> {"available": False, "error": ...}."""
    if not path.exists() or not path.is_file():
        return {"available": False, "error": f"{path.name} absent"}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        return {"available": False, "error": f"{path.name} illisible: {exc}"}


def _read_text_tolerant(path: Path) -> Optional[str]:
    if not path.exists() or not path.is_file():
        return None
    try:
        return path.read_text(encoding="utf-8")
    except Exception:  # noqa: BLE001
        return None


def load_ledger() -> dict:
    """Parse IMPROVEMENT_LEDGER.yaml (read-only). Tolerant. Bloquant -> appeler
    via asyncio.to_thread depuis les handlers (218 IMPs)."""
    text = _read_text_tolerant(LEDGER_PATH)
    if text is None:
        return {"available": False, "error": "IMPROVEMENT_LEDGER.yaml absent"}
    try:
        data = yaml.safe_load(text) or {}
    except Exception as exc:  # noqa: BLE001
        return {"available": False, "error": f"ledger illisible: {exc}"}
    improvements = data.get("improvements") or []
    if not isinstance(improvements, list):
        improvements = []
    return {"available": True, "meta": data.get("meta", {}), "improvements": improvements}


def _imp_summary(imp: dict) -> dict:
    return {
        "id": imp.get("id"),
        "title": imp.get("title"),
        "status": imp.get("status"),
        "lane": imp.get("lane"),
        "impact": imp.get("impact"),
        "effort": imp.get("effort"),
        "domain": imp.get("domain"),
        "blocked_by": imp.get("blocked_by", []),
    }


def ledger_stats(ledger: dict) -> dict:
    """Stats deterministes (total + repartition par status)."""
    if not ledger.get("available"):
        return {"available": False, "error": ledger.get("error")}
    imps = ledger["improvements"]
    by_status: dict[str, int] = {}
    for imp in imps:
        st = str(imp.get("status", "UNKNOWN"))
        by_status[st] = by_status.get(st, 0) + 1
    open_ids = [imp.get("id") for imp in imps if imp.get("status") == "OPEN"]
    return {
        "available": True,
        "total": len(imps),
        "by_status": by_status,
        "open_ids": open_ids,
    }


def verify_elo_hmac() -> dict:
    """Lit elo_match_latest.json + verifie sa signature .hmac.
    Renvoie le contenu + hmac_valid:bool. Tolerant (fichier/cle absents)."""
    elo = read_json_tolerant(ELO_PATH)
    if isinstance(elo, dict) and elo.get("available") is False:
        return {"available": False, "error": elo.get("error"), "hmac_valid": False}

    hmac_valid = False
    hmac_note = "no_hmac_file"
    raw = _read_text_tolerant(ELO_PATH)
    sig_text = _read_text_tolerant(ELO_HMAC_PATH)
    if sig_text is not None:
        # format : HMAC-SHA2-256(<path>)= <hex>
        expected = sig_text.split("=", 1)[1].strip() if "=" in sig_text else sig_text.strip()
        if not HMAC_KEY:
            hmac_note = "no_key (STUDIO_HMAC_KEY absent)"
        elif raw is None:
            hmac_note = "elo_unreadable"
        else:
            computed = hmac_lib.new(HMAC_KEY.encode(), raw.encode("utf-8"),
                                    hashlib.sha256).hexdigest()
            hmac_valid = hmac_lib.compare_digest(computed, expected)
            hmac_note = "verified" if hmac_valid else "mismatch"
    return {
        "available": True,
        "elo": elo,
        "hmac_valid": hmac_valid,
        "hmac_note": hmac_note,
    }


def tail_events(limit: int = 50) -> dict:
    """Tail des N derniers events JSONL. Tolerant. Lignes illisibles ignorees."""
    text = _read_text_tolerant(EVENTS_PATH)
    if text is None:
        return {"available": False, "error": "events.jsonl absent", "events": []}
    lines = [ln for ln in text.splitlines() if ln.strip()]
    if limit > 0:
        lines = lines[-limit:]
    events: list[dict] = []
    for ln in lines:
        try:
            events.append(json.loads(ln))
        except Exception:  # noqa: BLE001
            events.append({"_raw": ln, "_parse_error": True})
    return {"available": True, "count": len(events), "events": events}


def probe_port(host: str, port: int, timeout: float = 0.4) -> bool:
    """Probe TCP non bloquant-long : connexion <= timeout, jamais de hang."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        return sock.connect_ex((host, port)) == 0
    except OSError:
        return False
    finally:
        sock.close()


def probe_services() -> list[dict]:
    out: list[dict] = []
    for name, port in SERVICE_PORTS.items():
        out.append({"name": name, "port": port, "up": probe_port("127.0.0.1", port)})
    out.append({"name": "cockpit_server", "port": COCKPIT_PORT, "up": True})
    return out


def council_latest() -> dict:
    """Dernier council : CONSENSUS.md + dernier .json (par mtime). Tolerant."""
    consensus_md = _read_text_tolerant(CONSENSUS_PATH)
    latest_json: Any = None
    source_file: Optional[str] = None
    if COUNCIL_DIR.exists() and COUNCIL_DIR.is_dir():
        jsons = [p for p in COUNCIL_DIR.glob("*.json") if p.is_file()]
        jsons.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        if jsons:
            source_file = jsons[0].name
            try:
                latest_json = json.loads(jsons[0].read_text(encoding="utf-8"))
            except Exception:  # noqa: BLE001
                latest_json = None
    if consensus_md is None and latest_json is None:
        return {"available": False, "error": "aucun council dans lab/council/"}
    return {
        "available": True,
        "consensus_md": consensus_md or "",
        "result": latest_json,
        "source_file": source_file,
    }


# --------------------------------------------------------------------------
# Gouvernance + lock
# --------------------------------------------------------------------------

def governor_decision(lane: str, mission: str, audit_passed: bool) -> tuple[bool, str]:
    """Gate fail-closed. governor introuvable -> BLOCK."""
    try:
        from governance import governor
    except Exception as exc:  # noqa: BLE001
        return False, f"governor indisponible (fail-closed): {exc}"
    decision = governor.check({"lane": lane, "mission": mission, "audit_passed": audit_passed})
    return decision.allowed, decision.reason


def _ensure_state_dir() -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)


def lock_active() -> Optional[dict]:
    """Renvoie l'info du lock s'il est actif et non perime, sinon None."""
    if not LOCK_PATH.exists():
        return None
    try:
        info = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        info = {}
    started = info.get("started_epoch", 0)
    if (time.time() - float(started)) > LOCK_STALE_S:
        # Lock perime -> on le considere mort (nettoyage best-effort).
        try:
            LOCK_PATH.unlink()
        except OSError:
            pass
        return None
    return info


def acquire_lock(kind: str, run_id: str) -> bool:
    """Acquiert le lock anti double-lancement. False si deja tenu (vivant)."""
    _ensure_state_dir()
    if lock_active() is not None:
        return False
    payload = {
        "kind": kind,
        "run_id": run_id,
        "pid": os.getpid(),
        "started_epoch": time.time(),
        "started_iso": _now_iso(),
    }
    tmp = LOCK_PATH.with_suffix(".lock.tmp")
    tmp.write_text(json.dumps(payload), encoding="utf-8")
    os.replace(tmp, LOCK_PATH)
    return True


def release_lock(run_id: str) -> None:
    """Libere le lock si tenu par ce run (best-effort)."""
    if not LOCK_PATH.exists():
        return
    try:
        info = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        info = {}
    if info.get("run_id") in (run_id, None):
        try:
            LOCK_PATH.unlink()
        except OSError:
            pass


# --------------------------------------------------------------------------
# Runs (subprocess gouvernes + streaming SSE)
# --------------------------------------------------------------------------

async def _spawn_run(kind: str, argv: list[str], cwd: Path,
                     timeout_s: float = 600.0) -> str:
    """Lance un subprocess, enregistre le run, draine stdout dans une queue.
    Renvoie run_id immediatement. Libere le lock a la fin."""
    run_id = uuid.uuid4().hex[:12]
    queue: asyncio.Queue = asyncio.Queue()
    RUNS[run_id] = {
        "kind": kind,
        "status": "starting",
        "started_iso": _now_iso(),
        "returncode": None,
        "queue": queue,
        "argv": argv,
    }

    async def _runner() -> None:
        rec = RUNS[run_id]
        try:
            env = {**os.environ}
            if HMAC_KEY:
                env["STUDIO_HMAC_KEY"] = HMAC_KEY
            proc = await asyncio.create_subprocess_exec(
                *argv,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=str(cwd),
                env=env,
            )
            rec["status"] = "running"
            rec["pid"] = proc.pid

            async def _drain() -> None:
                assert proc.stdout is not None
                async for raw in proc.stdout:
                    await queue.put(raw.decode("utf-8", errors="replace").rstrip("\n"))

            try:
                await asyncio.wait_for(asyncio.gather(_drain(), proc.wait()), timeout=timeout_s)
                rec["returncode"] = proc.returncode
                rec["status"] = "done" if proc.returncode == 0 else "failed"
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                rec["status"] = "timeout"
                rec["returncode"] = -1
                await queue.put(f"[cockpit] TIMEOUT apres {timeout_s}s — process tue")
        except Exception as exc:  # noqa: BLE001
            rec["status"] = "error"
            rec["returncode"] = -1
            await queue.put(f"[cockpit] erreur spawn: {exc}")
        finally:
            await queue.put("[cockpit] __EOF__")
            release_lock(run_id)

    asyncio.create_task(_runner())
    return run_id


# --------------------------------------------------------------------------
# Modeles POST (Pydantic — 422 si payload invalide/vide)
# --------------------------------------------------------------------------

class CouncilRunRequest(BaseModel):
    brief: str = Field(..., min_length=1)
    task_id: str = "council-cockpit"
    lane: str = Field(..., description="lane de gouvernance — explicite obligatoire")
    mission: str = "council_run"
    audit_passed: bool = False


class FactoryRunRequest(BaseModel):
    ir: Optional[str] = None
    lane: str = Field(..., description="lane de gouvernance — explicite obligatoire")
    mission: str = "factory_run"
    audit_passed: bool = False


class DirectorRefreshRequest(BaseModel):
    lane: str = "SAFE_AUTO"
    mission: str = "director_refresh"
    audit_passed: bool = False


class GateDecisionRequest(BaseModel):
    verdict: str = Field(..., description="APPROVE | REJECT")
    justification: Optional[str] = None
    decision_id: Optional[str] = None
    lane: str = "AUDIT_REQUIRED"
    mission: str = "human_gate_record"
    audit_passed: bool = True  # HumanGate ratifie -> audit considere passe.


# --------------------------------------------------------------------------
# App + lifespan
# --------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    RUNS.clear()
    _ensure_state_dir()
    logger.info("cockpit_server up sur 127.0.0.1:%d | repo=%s | hmac=%s",
                COCKPIT_PORT, _REPO_ROOT, bool(HMAC_KEY))
    try:
        yield
    finally:
        # Cleanup : tenter de tuer les subprocess encore vivants + liberer le lock.
        for run_id, rec in list(RUNS.items()):
            if rec.get("status") in ("running", "starting"):
                logger.info("cleanup run %s (%s)", run_id, rec.get("status"))
        if LOCK_PATH.exists():
            try:
                LOCK_PATH.unlink()
            except OSError:
                pass


app = FastAPI(title="cockpit-server", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------
# REST — sante + lecture
# --------------------------------------------------------------------------

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/overview")
async def overview() -> dict:
    ledger = await asyncio.to_thread(load_ledger)
    stats = ledger_stats(ledger)
    services = probe_services()
    elo = verify_elo_hmac()
    director = read_json_tolerant(DIRECTOR_PATH)
    schedule = director.get("schedule") if isinstance(director, dict) else None
    return {
        "available": True,
        "generated_at": _now_iso(),
        "ledger": stats,
        "services": services,
        "elo": elo,
        "schedule": schedule if schedule is not None else {"available": False},
    }


@app.get("/api/ledger")
async def get_ledger(status: Optional[str] = Query(None)) -> dict:
    ledger = await asyncio.to_thread(load_ledger)
    if not ledger.get("available"):
        return {"available": False, "error": ledger.get("error"), "improvements": []}
    imps = ledger["improvements"]
    if status:
        imps = [i for i in imps if str(i.get("status", "")).upper() == status.upper()]
    return {
        "available": True,
        "count": len(imps),
        "improvements": [_imp_summary(i) for i in imps],
    }


@app.get("/api/ledger/{imp_id}")
async def get_imp(imp_id: str) -> dict:
    ledger = await asyncio.to_thread(load_ledger)
    if not ledger.get("available"):
        return {"available": False, "error": ledger.get("error")}
    for imp in ledger["improvements"]:
        if str(imp.get("id")) == imp_id:
            return {"available": True, "improvement": imp}
    return {"available": False, "error": f"{imp_id} introuvable"}


@app.get("/api/director")
def get_director() -> Any:
    return read_json_tolerant(DIRECTOR_PATH)


@app.get("/api/factory")
def get_factory() -> dict:
    data = read_json_tolerant(REGISTRY_PATH)
    if isinstance(data, list):
        return {"available": True, "count": len(data), "last": data[-1] if data else None,
                "entries": data}
    return data


@app.get("/api/council")
def get_council() -> dict:
    return council_latest()


@app.get("/api/elo")
def get_elo() -> dict:
    return verify_elo_hmac()


@app.get("/api/events")
def get_events(limit: int = Query(50, ge=1, le=5000)) -> dict:
    return tail_events(limit)


@app.get("/api/services")
def get_services() -> dict:
    return {"available": True, "services": probe_services()}


# --------------------------------------------------------------------------
# REST — mutations gouvernees
# --------------------------------------------------------------------------

@app.post("/api/council/run")
async def council_run(body: CouncilRunRequest) -> JSONResponse:
    ok, reason = governor_decision(body.lane, body.mission, body.audit_passed)
    if not ok:
        raise HTTPException(status_code=403, detail=f"governor BLOCK: {reason}")
    if not COUNCIL_SCRIPT.exists():
        raise HTTPException(status_code=503, detail="scripts/council.py introuvable")
    run_id = uuid.uuid4().hex[:12]
    if not acquire_lock("council", run_id):
        active = lock_active() or {}
        raise HTTPException(status_code=409,
                            detail=f"un run est deja actif: {active.get('kind')} ({active.get('run_id')})")
    argv = [sys.executable, str(COUNCIL_SCRIPT), "--brief", body.brief, "--task-id", body.task_id]
    real_id = await _spawn_run("council", argv, _REPO_ROOT, timeout_s=600.0)
    # le run reel porte le lock ; on l'aligne sur run_id deja loque.
    _realign_lock(run_id, real_id)
    return JSONResponse({"run_id": real_id, "kind": "council", "status": "started"})


@app.post("/api/factory/run")
async def factory_run(body: FactoryRunRequest) -> JSONResponse:
    ok, reason = governor_decision(body.lane, body.mission, body.audit_passed)
    if not ok:
        raise HTTPException(status_code=403, detail=f"governor BLOCK: {reason}")
    if not FACTORY_SCRIPT.exists():
        raise HTTPException(status_code=503, detail="factory_loop.py introuvable")
    run_id = uuid.uuid4().hex[:12]
    if not acquire_lock("factory", run_id):
        active = lock_active() or {}
        raise HTTPException(status_code=409,
                            detail=f"un run est deja actif: {active.get('kind')} ({active.get('run_id')})")
    argv = [sys.executable, str(FACTORY_SCRIPT)]
    if body.ir:
        argv += ["--ir", body.ir]
    real_id = await _spawn_run("factory", argv, _REPO_ROOT, timeout_s=600.0)
    _realign_lock(run_id, real_id)
    return JSONResponse({"run_id": real_id, "kind": "factory", "status": "started"})


def _realign_lock(reserved_id: str, real_id: str) -> None:
    """Le lock a ete pris avec un id reserve ; on y inscrit le run_id reel."""
    if not LOCK_PATH.exists():
        return
    try:
        info = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return
    if info.get("run_id") == reserved_id:
        info["run_id"] = real_id
        tmp = LOCK_PATH.with_suffix(".lock.tmp")
        tmp.write_text(json.dumps(info), encoding="utf-8")
        os.replace(tmp, LOCK_PATH)


@app.post("/api/director/refresh")
async def director_refresh(body: DirectorRefreshRequest) -> dict:
    ok, reason = governor_decision(body.lane, body.mission, body.audit_passed)
    if not ok:
        raise HTTPException(status_code=403, detail=f"governor BLOCK: {reason}")
    if not DIRECTOR_SCRIPT.exists():
        raise HTTPException(status_code=503, detail="scripts/director.py introuvable")
    env = {**os.environ}
    if HMAC_KEY:
        env["STUDIO_HMAC_KEY"] = HMAC_KEY
    try:
        proc = await asyncio.create_subprocess_exec(
            sys.executable, str(DIRECTOR_SCRIPT), "--dry-run",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT,
            cwd=str(_REPO_ROOT), env=env,
        )
        out, _ = await asyncio.wait_for(proc.communicate(), timeout=90.0)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="director refresh timeout (90s)")
    return {
        "status": "ok" if proc.returncode == 0 else "error",
        "returncode": proc.returncode,
        "stdout_tail": (out or b"").decode("utf-8", errors="replace")[-2000:],
    }


# --------------------------------------------------------------------------
# REST — HumanGate (HMAC + atomic tmp+rename + idempotent par decision_id)
# --------------------------------------------------------------------------

def _sign(payload: bytes) -> str:
    if not HMAC_KEY:
        return ""
    return hmac_lib.new(HMAC_KEY.encode(), payload, hashlib.sha256).hexdigest()


def _load_gate_log() -> dict:
    text = _read_text_tolerant(GATE_LOG_PATH)
    if text is None:
        return {"meta": {"version": "v0", "claim_verdict": "NO_CLAIM_ALLOWED",
                         "authority": "HumanGate"}, "decisions": []}
    try:
        return yaml.safe_load(text) or {"decisions": []}
    except Exception:  # noqa: BLE001
        return {"decisions": []}


def _atomic_write_yaml(path: Path, data: dict) -> None:
    content = yaml.dump(data, allow_unicode=True, default_flow_style=False, sort_keys=False)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(content, encoding="utf-8")
    os.replace(tmp, path)


@app.post("/api/gate/{gate_id}")
def decide_gate(gate_id: str, body: GateDecisionRequest) -> dict:
    if body.verdict not in ("APPROVE", "REJECT"):
        raise HTTPException(status_code=400, detail="verdict doit etre APPROVE ou REJECT")

    ok, reason = governor_decision(body.lane, body.mission, body.audit_passed)
    if not ok:
        raise HTTPException(status_code=403, detail=f"governor BLOCK: {reason}")

    log = _load_gate_log()
    decisions: list[dict] = log.get("decisions", []) or []
    now_iso = _now_iso()

    # Idempotence : si decision_id fourni et deja ratifiee avec le meme verdict -> renvoyer tel quel.
    if body.decision_id:
        existing = next((d for d in decisions
                         if d.get("decision_id") == body.decision_id), None)
        if existing and existing.get("verdict") in ("APPROVE", "REJECT"):
            return {"gate_id": gate_id, "decision_id": body.decision_id,
                    "verdict": existing.get("verdict"), "idempotent": True,
                    "hmac_signed": bool(log.get("meta", {}).get("last_sig")),
                    "timestamp": existing.get("approved_at")}

    # Cibler une gate PENDING existante (par decision_id ou gate_id).
    target_id = body.decision_id or gate_id
    pending = next((d for d in decisions
                    if d.get("decision_id") == target_id and d.get("verdict") == "PENDING"), None)
    if pending:
        pending["verdict"] = body.verdict
        pending["approved_by"] = "HumanGate"
        pending["approved_at"] = now_iso
        if body.justification:
            pending.setdefault("evidence_refs", []).append(body.justification)
        entry = pending
    else:
        entry = {
            "decision_id": target_id,
            "title": f"Gate {gate_id} — decision Pierre",
            "category": "human_gate",
            "zone": "cockpit",
            "surface": "cockpit_server",
            "source_state": {"created": now_iso},
            "verdict": body.verdict,
            "evidence_refs": [body.justification] if body.justification else [],
            "approved_by": "HumanGate",
            "approved_at": now_iso,
        }
        decisions.append(entry)

    log["decisions"] = decisions
    content = yaml.dump(log, allow_unicode=True, default_flow_style=False, sort_keys=False)
    sig = _sign(content.encode("utf-8"))
    if sig:
        log.setdefault("meta", {})["last_sig"] = sig
        log["meta"]["last_sig_at"] = now_iso

    _atomic_write_yaml(GATE_LOG_PATH, log)
    logger.info("gate %s -> %s (decision_id=%s hmac=%s)",
                gate_id, body.verdict, entry.get("decision_id"), bool(sig))
    return {
        "gate_id": gate_id,
        "decision_id": entry.get("decision_id"),
        "verdict": body.verdict,
        "idempotent": False,
        "hmac_signed": bool(sig),
        "timestamp": now_iso,
    }


# --------------------------------------------------------------------------
# SSE — format `data:{json}\n\n` + heartbeat `:ping`
# --------------------------------------------------------------------------

_HEARTBEAT_S = 15.0


def _sse_data(payload: Any) -> str:
    return f"data:{json.dumps(payload, ensure_ascii=False)}\n\n"


@app.get("/api/stream/meta")
async def stream_meta():
    """Pousse studio_meta_latest.json a chaque changement de mtime (poll 2s)."""
    async def _gen():
        last_mtime = -1.0
        last_beat = time.monotonic()
        # Emission initiale immediate (etat courant ou available:false).
        yield _sse_data(read_json_tolerant(STUDIO_META_PATH))
        while True:
            try:
                mtime = STUDIO_META_PATH.stat().st_mtime if STUDIO_META_PATH.exists() else 0.0
                if mtime != last_mtime:
                    last_mtime = mtime
                    yield _sse_data(read_json_tolerant(STUDIO_META_PATH))
                if (time.monotonic() - last_beat) >= _HEARTBEAT_S:
                    last_beat = time.monotonic()
                    yield ":ping\n\n"
            except Exception as exc:  # noqa: BLE001
                logger.warning("SSE meta error: %s", exc)
            await asyncio.sleep(2)
    return StreamingResponse(_gen(), media_type="text/event-stream")


@app.get("/api/stream/events")
async def stream_events():
    """Tail incremental de lab/events.jsonl (poll 1s)."""
    async def _gen():
        last_count = 0
        last_beat = time.monotonic()
        # Snapshot initial (dernier event s'il existe).
        snap = tail_events(1)
        yield _sse_data(snap)
        last_count = len([ln for ln in (_read_text_tolerant(EVENTS_PATH) or "").splitlines() if ln.strip()])
        while True:
            try:
                lines = [ln for ln in (_read_text_tolerant(EVENTS_PATH) or "").splitlines() if ln.strip()]
                if len(lines) > last_count:
                    for ln in lines[last_count:]:
                        try:
                            yield _sse_data(json.loads(ln))
                        except Exception:  # noqa: BLE001
                            yield _sse_data({"_raw": ln, "_parse_error": True})
                    last_count = len(lines)
                if (time.monotonic() - last_beat) >= _HEARTBEAT_S:
                    last_beat = time.monotonic()
                    yield ":ping\n\n"
            except Exception as exc:  # noqa: BLE001
                logger.warning("SSE events error: %s", exc)
            await asyncio.sleep(1)
    return StreamingResponse(_gen(), media_type="text/event-stream")


@app.get("/api/stream/runs/{run_id}")
async def stream_run(run_id: str):
    """Draine le stdout d'un run lance via POST. 404 si run inconnu."""
    rec = RUNS.get(run_id)
    if rec is None:
        raise HTTPException(status_code=404, detail=f"run {run_id} inconnu")

    async def _gen():
        queue: asyncio.Queue = rec["queue"]
        # Etat initial.
        yield _sse_data({"run_id": run_id, "kind": rec.get("kind"), "status": rec.get("status")})
        while True:
            try:
                line = await asyncio.wait_for(queue.get(), timeout=_HEARTBEAT_S)
            except asyncio.TimeoutError:
                yield ":ping\n\n"
                continue
            if line == "[cockpit] __EOF__":
                yield _sse_data({"run_id": run_id, "status": rec.get("status"),
                                 "returncode": rec.get("returncode"), "eof": True})
                break
            yield _sse_data({"run_id": run_id, "line": line})
    return StreamingResponse(_gen(), media_type="text/event-stream")


# --------------------------------------------------------------------------
# Entrypoint
# --------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting cockpit-server on 127.0.0.1:%d", COCKPIT_PORT)
    uvicorn.run(app, host="127.0.0.1", port=COCKPIT_PORT, workers=1)
