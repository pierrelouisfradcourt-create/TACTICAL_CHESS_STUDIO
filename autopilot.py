#!/usr/bin/env python3
"""
TCS Autopilote — Tactical Chess Studio
Pilote local : LM Studio + chaînes Kaizen + mémoire studio
Lancer : python autopilot.py
Ouvre automatiquement http://localhost:7331
"""

import base64
import collections
import difflib
import hashlib
import http.server
import json
import os
import re
import struct
import subprocess
import sys
import threading
import time
import webbrowser
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime
import socketserver
from executor_report import analyse_report

# ── CONFIG ──────────────────────────────────────────────────────────────────
REPO     = Path(r"C:\TACTICAL_CHESS_STUDIO")
PORT     = 7331
LM_HOST  = "http://localhost:1234"
LM_MODEL         = "qwen2.5-14b-instruct"  # Director — décisions opérationnelles
LM_MODEL_CEO     = "qwen3.6-27b"           # CEO Brain — raisonnement profond (IMP-047)
MEMORY_FILE = Path(__file__).parent / "studio_memory.json"

# Chemins repo utiles
LEDGER   = REPO / "lab/chains/IMPROVEMENT_LEDGER.yaml"
KAIZEN   = REPO / "lab/chains/kaizen_loop.py"
HYGIENE  = REPO / "lab/chains/doc_hygiene_chain.py"
CHAINS_DIR = REPO  # audit Claude Code 2026-06-02 : pas de sous-dossier repos/games/
# Autorité Python pour GET /api/chains (B2) — miroir de CHAINS_DEF JS
CHAINS_PYTHON: dict = {
    "recall":  {"label": "Recall",          "lane": "SAFE_AUTO",      "cmd": ".venv312/Scripts/python.exe lab/chains/kaizen_loop.py recall"},
    "audit":   {"label": "Audit hygiène",   "lane": "SAFE_AUTO",      "cmd": ".venv312/Scripts/python.exe lab/chains/doc_hygiene_chain.py --audit"},
    "propose": {"label": "Propose",         "lane": "SAFE_AUTO",      "cmd": ".venv312/Scripts/python.exe lab/chains/kaizen_loop.py propose"},
    "metrics": {"label": "Métriques",       "lane": "SAFE_AUTO",      "cmd": ".venv312/Scripts/python.exe lab/chains/kaizen_loop.py metrics"},
    "smoke":   {"label": "Smoke benchmark", "lane": "AUDIT_REQUIRED", "cmd": "powershell -ExecutionPolicy Bypass -File .\\scripts\\studioV2\\run_benchmark.ps1 -Smoke -RunClass exploration_only"},
    "coach":   {"label": "Coach Rocky",     "lane": "AUDIT_REQUIRED", "cmd": "powershell -ExecutionPolicy Bypass -Command \"$env:TCS_MINIMAX_DEPTH=\\\"3\\\"; cargo run --release -- simulate_chess960 518 3\""},
    "tests":   {"label": "Cargo tests",     "lane": "AUDIT_REQUIRED", "cmd": "cargo test 2>&1"},
}
CHAIN_HISTORY = REPO / "lab/chains/CHAIN_HISTORY.jsonl"
STATE_FILE     = REPO / "00_STUDIO_CONTROL/00_MASTER_DOCS/07_CURRENT_STATE.md"
UX_RUNS_FILE   = REPO / "lab/datasets/ux_claude_runs.jsonl"
STATE_UPDATER  = REPO / "state_updater.py"
IDEAS_FILE     = REPO / "lab/chains/ideas.json"

# IMP-094 : claim_verdict lu depuis CLAIM_MATRIX.md au démarrage
_CLAIM_VERDICT = "NO_CLAIM_ALLOWED"
try:
    _cm = (REPO / "00_STUDIO_CONTROL/01_SYSTEM/boundaries/CLAIM_MATRIX.md").read_text(encoding="utf-8")
    _m_cv = re.search(r"claim_verdict:\s*(\S+)", _cm)
    if _m_cv:
        _CLAIM_VERDICT = _m_cv.group(1)
except Exception:
    pass
print(f"[claim] verdict lu : {_CLAIM_VERDICT}", flush=True)

# IMP-098 : tool_permission_matrix chargée au démarrage
_TOOL_PERMISSION_MATRIX: dict = {}
try:
    _pm_path = REPO / "lab/agent_policy/tool_permission_matrix.json"
    _TOOL_PERMISSION_MATRIX = json.loads(_pm_path.read_text(encoding="utf-8"))
    print(f"[perm] tool_permission_matrix chargée — deny_by_default={_TOOL_PERMISSION_MATRIX.get('deny_by_default')}", flush=True)
except Exception:
    print("[perm] tool_permission_matrix introuvable — gate désactivé", flush=True)

# Mapping chain_id → tool name dans la matrice
_CHAIN_TOOL_MAP: dict = {
    "audit":   "run_hygiene_check",
    "metrics": "run_json_parse",
    "smoke":   "run_benchmark",
    "coach":   "run_gameplay_loop",
}

ledger_cache: dict = {}  # {"open": N, "closed": M, "next": {}, "ts": "..."}
_ceo_brief_cache: dict = {}  # {"brief": {...}, "ts": float}
_ceo_assign_cache: dict = {}  # {"lanes": [...], "ts": float, "ledger_mtime": float}
DEDUP_LOG       = REPO / "lab/chains/reports/dedup_log.jsonl"
_dedup_exclusion_count: int = 0  # compteur session, remis à zéro au restart
_LANE_COLORS = ["var(--amber)", "var(--green)", "#e06c75",
                "var(--blue)", "var(--purple)", "var(--text2)"]

# ── DEVSTRAL TELEMETRY ────────────────────────────────────────────────────────
tokens_session: int = 0
_current_task: dict = {}   # muté sur place — jamais réassigné
_lm_log_lock = threading.Lock()

# ── AUTOLOOP STATE (multi-lane) ───────────────────────────────────────────────
AUTOLOOP_LANES = ("rocky_moteur", "ia_apprentissage", "decisions_pendantes")

# Mapping UI lane → valeur lane ledger (SAFE_AUTO / AUDIT_REQUIRED / …)
AUTOLOOP_LANE_MAP: dict = {
    "rocky_moteur":        "SAFE_AUTO",
    "ia_apprentissage":    "SAFE_AUTO",
    "decisions_pendantes": "AUDIT_REQUIRED",
}

_autoloop_processes: dict = {lane: None for lane in AUTOLOOP_LANES}
_autoloop_statuses: dict = {
    lane: {
        "state": "idle", "pid": None, "dry_run": True,
        "last_result": None, "started_at": None,
        "ledger_lane": AUTOLOOP_LANE_MAP.get(lane, "SAFE_AUTO"),
    }
    for lane in AUTOLOOP_LANES
}
_autoloop_lock = threading.Lock()
_autoloop_logs: dict = {lane: [] for lane in AUTOLOOP_LANES}  # max 100 lignes/lane
_lane_today_date: str = datetime.now().strftime("%Y-%m-%d")
_lane_today_runs: dict = {lane: 0 for lane in AUTOLOOP_LANES}

# ── IDEA PIPELINE STATE ──────────────────────────────────────────────────────
_idea_pipeline_state: dict = {
    "step": "", "progress": 0, "idea_id": "", "running": False,
    "result": None, "error": None,
}
_idea_pipeline_lock = threading.Lock()
_ideas_lock = threading.Lock()

# ── WEBSOCKET TERMINAL STATE ──────────────────────────────────────────────────
_WS_MAGIC = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
_ws_terminals: dict = {}  # n → {"proc": PtyProcess, "alive": bool}
_ws_terminal_lock = threading.Lock()

# ── IDEAS PERSISTENCE ────────────────────────────────────────────────────────
_DEFAULT_IDEAS: list = [
    {"id": 2,  "chain": "studio", "status": "backlog", "title": "Mode éphémère — sessions de réflexion sans persistence",             "roi": "med",  "lane": "safe",  "desc": "Garder uniquement les fusions avec utilité mesurable. Évite l'accumulation de docs inutiles.", "issue": ""},
    {"id": 3,  "chain": "studio", "status": "backlog", "title": "Hygiène automatique : doc → vérité → commit → push",                  "roi": "high", "lane": "human", "desc": "Étendre chain_hygiene.ps1 pour validation cohérence doc/code puis déclencher commit + push quand tout est vert.", "issue": ""},
    {"id": 6,  "chain": "ia",     "status": "backlog", "title": "Mode éphémère dataset : plus de tests, moins de sauvegarde",          "roi": "high", "lane": "audit", "desc": "Tourner des parties de test sans sauvegarder le dataset. Conserver uniquement rapports métriques/stats.", "issue": "NEW-03"},
    {"id": 8,  "chain": "ia",     "status": "backlog", "title": "Cartes variantes Rocky — architecture et dataset",                    "roi": "med",  "lane": "safe",  "desc": "Plan-cartes visuels des variantes Search-only, Search+Neural, Search+Neural+LLM et variantes dataset.", "issue": ""},
    {"id": 9,  "chain": "ia",     "status": "backlog", "title": "Stats, télémétrie et triage dataset — freeze baselines",             "roi": "high", "lane": "audit", "desc": "Draw rate par phase, conversion rate, ELO delta par run. Triage statistique. Freezer baselines d'appel.", "issue": "#3"},
    {"id": 10, "chain": "jv",     "status": "backlog", "title": "Manifeste de création de jeu + manifeste de règles via Godot",       "roi": "high", "lane": "safe",  "desc": "Deux manifestes = successions de prompts. Commencer par les échecs pour valider la méthode.", "issue": ""},
    {"id": 11, "chain": "jv",     "status": "backlog", "title": "Adaptateur Rocky → Godot — pipeline complet avec auto-amélioration", "roi": "high", "lane": "human", "desc": "Adaptateur complet Rocky (Rust) ↔ Godot. Auto-amélioration intégrée avant validation.", "issue": ""},
    {"id": 12, "chain": "jv",     "status": "backlog", "title": "Matrice cartes/nom → prompt génération modèles Godot",               "roi": "med",  "lane": "safe",  "desc": "Matrice structurée : (nom + type + faction + budget) → prompt génère modèle Godot de qualité.", "issue": ""},
]

def load_ideas() -> list:
    with _ideas_lock:
        if IDEAS_FILE.exists():
            try:
                data = json.loads(IDEAS_FILE.read_text(encoding="utf-8"))
                if isinstance(data, list):
                    return data
            except Exception:
                pass
        ideas = [dict(i) for i in _DEFAULT_IDEAS]
        try:
            IDEAS_FILE.write_text(json.dumps(ideas, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass
        return ideas

def save_ideas(ideas: list) -> None:
    with _ideas_lock:
        try:
            IDEAS_FILE.write_text(json.dumps(ideas, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass

def update_idea_status(idea_id: str, new_status: str) -> bool:
    ideas = load_ideas()
    found = False
    for idea in ideas:
        if str(idea.get("id")) == str(idea_id):
            idea["status"] = new_status
            found = True
            break
    if found:
        save_ideas(ideas)
    return found


# ── AUTOLOOP STDOUT READER ───────────────────────────────────────────────────
def _read_stdout(process, lane: str) -> None:
    """Thread daemon — lit stdout du process autoloop et remplit _autoloop_logs[lane]."""
    try:
        for raw in iter(process.stdout.readline, ""):
            line = raw.strip()
            if not line:
                continue
            entry = {"ts": datetime.now().strftime("%H:%M:%S"), "line": line}
            with _autoloop_lock:
                _autoloop_logs[lane].append(entry)
                if len(_autoloop_logs[lane]) > 100:
                    _autoloop_logs[lane].pop(0)
    except Exception:
        pass


# ── WEBSOCKET HELPERS (RFC 6455 minimal) ─────────────────────────────────────
def _ws_recv_exact(fobj, n: int):
    """Read exactly n bytes from a file-like object."""
    chunks = []
    remaining = n
    while remaining > 0:
        chunk = fobj.read(remaining)
        if not chunk:
            return None
        chunks.append(chunk)
        remaining -= len(chunk)
    return b"".join(chunks)


def _ws_recv_frame(rfile):
    """Read one WebSocket frame from rfile. Returns (opcode, payload) or (None, None)."""
    h = _ws_recv_exact(rfile, 2)
    if not h:
        return None, None
    opcode = h[0] & 0x0F
    masked = (h[1] & 0x80) != 0
    length = h[1] & 0x7F
    if length == 126:
        ext = _ws_recv_exact(rfile, 2)
        if not ext:
            return None, None
        length = struct.unpack("!H", ext)[0]
    elif length == 127:
        ext = _ws_recv_exact(rfile, 8)
        if not ext:
            return None, None
        length = struct.unpack("!Q", ext)[0]
    mask_key = b""
    if masked:
        mask_key = _ws_recv_exact(rfile, 4)
        if not mask_key:
            return None, None
    payload = _ws_recv_exact(rfile, length) if length else b""
    if payload is None:
        return None, None
    if masked:
        payload = bytes(b ^ mask_key[i % 4] for i, b in enumerate(payload))
    return opcode, payload


def _ws_send_frame(sock, data: bytes, opcode: int = 0x02) -> bool:
    """Send a WebSocket frame (server→client, unmasked)."""
    length = len(data)
    header = bytes([0x80 | opcode])
    if length < 126:
        header += bytes([length])
    elif length < 65536:
        header += bytes([126]) + struct.pack("!H", length)
    else:
        header += bytes([127]) + struct.pack("!Q", length)
    try:
        sock.sendall(header + data)
        return True
    except OSError:
        return False


def _ws_handshake(handler):
    """Perform WebSocket upgrade handshake. Returns raw socket or None."""
    key = handler.headers.get("Sec-WebSocket-Key", "").strip()
    if not key:
        handler.send_response(400)
        handler.end_headers()
        return None
    accept = base64.b64encode(
        hashlib.sha1((key + _WS_MAGIC).encode()).digest()
    ).decode()
    handler.send_response(101, "Switching Protocols")
    handler.send_header("Upgrade", "websocket")
    handler.send_header("Connection", "Upgrade")
    handler.send_header("Sec-WebSocket-Accept", accept)
    handler.end_headers()
    handler.wfile.flush()
    return handler.connection


def _run_ws_terminal(n: int, sock, rfile) -> None:
    """Spawn PowerShell in a real Windows ConPTY via pywinpty, piped to WebSocket session n."""
    with _ws_terminal_lock:
        old = _ws_terminals.get(n)
        if old:
            try:
                old["proc"].terminate(force=True)
            except Exception:
                pass
    try:
        from winpty import PtyProcess
        proc = PtyProcess.spawn(
            ["powershell.exe", "-NoLogo", "-NoExit", "-Command",
             "Remove-Module PSReadLine -ErrorAction SilentlyContinue;"
             "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8;"
             "[Console]::InputEncoding=[System.Text.Encoding]::UTF8"],
            dimensions=(24, 220)
        )
    except Exception as exc:
        _ws_send_frame(sock, f"\r\n[Erreur lancement PTY : {exc}]\r\n".encode(), opcode=0x01)
        return
    _lines: collections.deque = collections.deque(maxlen=200)
    with _ws_terminal_lock:
        _ws_terminals[n] = {"proc": proc, "alive": True, "lines": _lines}

    _ANSI_RE = re.compile(r'\x1b\[[0-9;]*[A-Za-z]|\x1b\][^\x07]*\x07|\x1b.')

    def _pump_stdout():
        _partial = ""
        try:
            while proc.isalive():
                data = proc.read(4096)
                if data:
                    _ws_send_frame(sock, data.encode() if isinstance(data, str) else data, opcode=0x02)
                    clean = _ANSI_RE.sub('', data if isinstance(data, str) else data.decode('utf-8', errors='replace'))
                    _partial += clean
                    while '\n' in _partial:
                        line, _partial = _partial.split('\n', 1)
                        _lines.append(line.rstrip('\r'))
        except Exception:
            pass
        if _partial.strip():
            _lines.append(_partial.rstrip('\r'))
        _ws_send_frame(sock, "[Processus termine]\r\n".encode(), opcode=0x02)
        with _ws_terminal_lock:
            if n in _ws_terminals:
                _ws_terminals[n]["alive"] = False

    threading.Thread(target=_pump_stdout, daemon=True).start()

    try:
        while True:
            opcode, data = _ws_recv_frame(rfile)
            if opcode is None or opcode == 0x08:
                break
            if opcode in (0x01, 0x02) and data:
                if data[:1] == b'{':
                    try:
                        msg = json.loads(data)
                        if msg.get('type') == 'resize':
                            cols = int(msg.get('cols', 80))
                            rows = int(msg.get('rows', 24))
                            proc.setwinsize(rows, cols)
                    except Exception:
                        pass
                    continue
                try:
                    text = data.decode('utf-8', errors='replace') if isinstance(data, bytes) else data
                    proc.write(text)
                except Exception:
                    break
    except Exception:
        pass
    finally:
        try:
            proc.terminate(force=True)
        except Exception:
            pass
        with _ws_terminal_lock:
            if n in _ws_terminals:
                _ws_terminals[n]["alive"] = False


# ── MÉMOIRE STUDIO ───────────────────────────────────────────────────────────
def load_memory():
    if MEMORY_FILE.exists():
        try:
            return json.loads(MEMORY_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {
        "sessions": [],
        "fusions": [],
        "ideas": [],
        "corpus": [],
        "decisions": [],
        "created": datetime.now().isoformat()
    }

def save_memory(mem):
    MEMORY_FILE.write_text(json.dumps(mem, ensure_ascii=False, indent=2), encoding="utf-8")

memory = load_memory()

# ── P1 : STUDIO_CONTEXT injection ────────────────────────────────────────────
def build_system_prompt(base_prompt: str) -> str:
    ctx_candidates = [
        REPO / "lab/chains/studio_context.md",
        REPO / "lab/chains/STUDIO_CONTEXT.md",
        REPO / "00_STUDIO_CONTROL/00_MASTER_DOCS/04_STUDIO.md",
    ]
    for p in ctx_candidates:
        if p.exists():
            try:
                ctx = p.read_text(encoding="utf-8")[:2000]
                return (ctx + "\n\n" + base_prompt) if base_prompt else ctx
            except Exception:
                break
    return base_prompt


# ── DEVSTRAL HELPERS ─────────────────────────────────────────────────────────
def _infer_task_type(system: str, prompt: str) -> str:
    t = (system + " " + prompt[:200]).lower()
    if "ceo" in t:                  return "ceo_brief"
    if "fusion" in t:
        return "fusion_deep" if ("complet" in t or "full" in t or "profond" in t) else "fusion"
    if "résumé" in t or "session" in t: return "résumé"
    if "coach" in t:                return "coaching"
    return "call"


def _route_model(task_type: str) -> str:
    """Dual-model router (IMP-047): CEO (Qwen3.6) pour analyses profondes, Director (Qwen2.5) sinon."""
    if task_type in ("ceo_brief", "fusion_deep"):
        return LM_MODEL_CEO
    return LM_MODEL


def _log_lm_call(task_type: str, prompt: str, tokens_approx: int, duration_ms: int, result_preview: str = "") -> None:
    entry = {
        "ts":            datetime.now().isoformat(),
        "type":          task_type,
        "source":        "lm",
        "prompt_preview": prompt[:60].replace("\n", " "),
        "tokens_approx": tokens_approx,
        "duration_ms":   duration_ms,
    }
    try:
        with open(UX_RUNS_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        pass
    try:
        ts = entry["ts"][:19]
        lc = dict(ledger_cache) if ledger_cache else get_ledger_counts()
        ledger_line = f"Open: {lc.get('open', '?')} | Closed: {lc.get('closed', '?')}"
        nxt = lc.get("next", {})
        if nxt and nxt.get("id"):
            ledger_line += f" | Next: {nxt['id']} — {nxt.get('title', '')}"
        chains = read_chain_history(3)
        chains_txt = "\n".join(
            f"  - {c.get('ts','')[:19]} {c.get('imp_id') or c.get('chain') or c.get('cmd','?')} → {c.get('status','?')}"
            for c in chains
        ) or "  (aucune)"
        live = (
            f"# Studio Memory — {ts}\n"
            f"## Dernier appel Devstral\n"
            f"Type: {task_type} | Tokens: {tokens_approx} | Durée: {duration_ms}ms\n"
            f"Preview: {prompt[:80].replace(chr(10), ' ')}\n"
            f"Résultat: {result_preview[:200] if result_preview else '[streaming]'}\n"
            f"## Ledger\n"
            f"{ledger_line}\n"
            f"## Dernières chaînes\n"
            f"{chains_txt}\n"
        )
        (REPO / "STUDIO_CONTEXT_LIVE.md").write_text(live, encoding="utf-8")
    except Exception:
        pass
    write_studio_state()


def _read_lm_history(n: int = 10) -> list:
    if not UX_RUNS_FILE.exists():
        return []
    try:
        lines = UX_RUNS_FILE.read_text(encoding="utf-8").strip().split("\n")
        result: list = []
        for line in reversed(lines):
            if not line.strip():
                continue
            try:
                e = json.loads(line)
                if e.get("source") == "lm":
                    result.append(e)
            except Exception:
                pass
            if len(result) >= n:
                break
        return result
    except Exception:
        return []


# ── LM STUDIO BRIDGE ─────────────────────────────────────────────────────────
def lm_call(prompt: str, system: str = "", max_tokens: int = 800, model: str = "") -> str:
    """
    LM Studio bridge — dual-model (IMP-047).
    model="" → router automatique (CEO pour ceo_brief/fusion_deep, Director sinon).
    Endpoints : /api/v1/chat (natif) + /v1/chat/completions (OpenAI-compat).
    """
    global tokens_session
    t0 = time.time()
    task_type = _infer_task_type(system, prompt)
    active_model = model or _route_model(task_type)
    with _lm_log_lock:
        _current_task.clear()
        _current_task.update({
            "type": task_type, "model": active_model,
            "started_at": datetime.now().isoformat(), "tokens_so_far": 0,
        })
    result = "[LM Studio indisponible]"
    try:
        sys_prompt = build_system_prompt(system)
        messages = []
        if sys_prompt:
            messages.append({"role": "system", "content": sys_prompt})
        messages.append({"role": "user", "content": prompt})
        payload = {
            "model": active_model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.4,
            "stream": False
        }
        # LM Studio expose /api/v1/chat (natif) ET /v1/chat/completions (OpenAI-compat)
        endpoints = [
            f"{LM_HOST}/api/v1/chat",
            f"{LM_HOST}/v1/chat/completions",
        ]
        last_err = ""
        for url in endpoints:
            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode(),
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=300) as r:  # 300s = 2000 tokens à 8 t/s
                    data = json.loads(r.read())
                    if "choices" in data:
                        msg = data["choices"][0]["message"]
                        result = (msg.get("content") or msg.get("reasoning_content") or "").strip()
                    elif "content" in data:
                        result = str(data["content"]).strip()
                    else:
                        result = json.dumps(data, ensure_ascii=False)
                    break
            except urllib.error.HTTPError as e:
                last_err = f"HTTP {e.code} {e.reason} sur {url}"
                continue
            except Exception as e:
                last_err = str(e)
                continue
        else:
            result = f"[LM Studio indisponible] {last_err}"
    finally:
        duration_ms = int((time.time() - t0) * 1000)
        tok = len(prompt.split()) + len(result.split())
        with _lm_log_lock:
            tokens_session += tok
            _current_task.clear()
        _log_lm_call(task_type, prompt, tok, duration_ms,
                     result[:200] if result and not result.startswith("[LM") else "")
    return result

def lm_status() -> dict:
    ok, models = False, []
    for url in [f"{LM_HOST}/api/v1/models", f"{LM_HOST}/v1/models"]:
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=6) as r:
                data = json.loads(r.read())
                models = [m["id"] for m in data.get("data", [])]
                ok = True
                break
        except Exception:
            continue
    ctx_loaded = any(p.exists() for p in [
        REPO / "lab/chains/studio_context.md",
        REPO / "lab/chains/STUDIO_CONTEXT.md",
        REPO / "00_STUDIO_CONTROL/00_MASTER_DOCS/04_STUDIO.md",
    ])
    with _lm_log_lock:
        task = dict(_current_task) if _current_task else None
        tok_sess = tokens_session
    return {
        "ok":             ok,
        "models":         models,
        "current_task":   task,
        "queue":          [],
        "history":        _read_lm_history(10),
        "tokens_session": tok_sess,
        "context_loaded": ctx_loaded,
        "brain": {
            "director": LM_MODEL,
            "ceo":      LM_MODEL_CEO,
        },
    }


# ── P9 : STREAMING ────────────────────────────────────────────────────────────
def lm_stream_to(prompt: str, system: str, max_tokens: int, wfile, model: str = "") -> None:
    global tokens_session
    t0 = time.time()
    task_type = _infer_task_type(system, prompt)
    active_model = model or _route_model(task_type)
    with _lm_log_lock:
        _current_task.clear()
        _current_task.update({
            "type": task_type, "model": active_model,
            "started_at": datetime.now().isoformat(), "tokens_so_far": 0,
        })
    _tok = [0]  # compteur mutable accessible depuis le finally
    try:
        sys_prompt = build_system_prompt(system)
        messages = []
        if sys_prompt:
            messages.append({"role": "system", "content": sys_prompt})
        messages.append({"role": "user", "content": prompt})
        payload = {
            "model": active_model, "messages": messages,
            "max_tokens": max_tokens, "temperature": 0.4, "stream": True,
        }
        endpoints = [f"{LM_HOST}/api/v1/chat", f"{LM_HOST}/v1/chat/completions"]
        for url in endpoints:
            try:
                req = urllib.request.Request(
                    url, data=json.dumps(payload).encode(),
                    headers={"Content-Type": "application/json"}, method="POST")
                with urllib.request.urlopen(req, timeout=300) as resp:
                    ct = resp.headers.get("Content-Type", "")
                    if "event-stream" in ct or "text/event-stream" in ct:
                        for raw in resp:
                            line = raw.decode("utf-8", errors="replace").rstrip()
                            if not line.startswith("data: "):
                                continue
                            data_s = line[6:]
                            if data_s.strip() == "[DONE]":
                                wfile.write(b"data: [DONE]\n\n"); wfile.flush(); return
                            try:
                                chunk = json.loads(data_s)
                                content = chunk["choices"][0]["delta"].get("content", "")
                                if content:
                                    _tok[0] += len(content.split())
                                    with _lm_log_lock:
                                        _current_task["tokens_so_far"] = _tok[0]
                                    sse = json.dumps({"content": content}, ensure_ascii=False)
                                    wfile.write(f"data: {sse}\n\n".encode()); wfile.flush()
                            except Exception:
                                pass
                    else:
                        # Non-streaming fallback — send as one chunk
                        data = json.loads(resp.read())
                        text = (data.get("choices", [{}])[0].get("message", {}).get("content")
                                or data.get("content") or json.dumps(data))
                        sse = json.dumps({"content": str(text).strip()}, ensure_ascii=False)
                        wfile.write(f"data: {sse}\n\n".encode())
                        wfile.write(b"data: [DONE]\n\n"); wfile.flush()
                return
            except Exception:
                continue
        err = json.dumps({"error": "LM Studio indisponible"})
        wfile.write(f"data: {err}\n\n".encode())
        wfile.write(b"data: [DONE]\n\n"); wfile.flush()
    finally:
        duration_ms = int((time.time() - t0) * 1000)
        tok = len(prompt.split()) + max(_tok[0], max_tokens // 4)
        with _lm_log_lock:
            tokens_session += tok
            _current_task.clear()
        _log_lm_call(task_type, prompt, tok, duration_ms)




# ── CHAIN RUNNER ─────────────────────────────────────────────────────────────
log_buffer = []

def build_cmd(cmd: str) -> str:
    """Normalise une commande pour Windows :
    - .venv312/Scripts/python.exe → chemin absolu Windows avec guillemets
    - lab/chains/xxx.py → lab\\chains\\xxx.py (backslashes Windows)
    """
    venv_py = str(REPO / ".venv312" / "Scripts" / "python.exe").replace('/', '\\')
    # 1. Remplacer le chemin venv relatif par le chemin absolu
    cmd = cmd.replace(".venv312/Scripts/python.exe", f'"{venv_py}"')
    cmd = cmd.replace(".venv312\\\\Scripts\\\\python.exe", f'"{venv_py}"')
    # 2. Convertir lab/chains/... en lab\chains\... (Windows)
    def slash_to_backslash(m):
        return m.group(0).replace("/", "\\")
    cmd = re.sub(r'lab/chains/[^ ]+', slash_to_backslash, cmd)
    return cmd

def run_chain(cmd: str, cwd: str = None) -> dict:
    cmd = build_cmd(cmd)  # normaliser chemins Windows
    entry = {"ts": datetime.now().isoformat(), "cmd": cmd, "output": "", "error": "", "rc": -1}
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True,
            cwd=cwd or str(CHAINS_DIR), timeout=120
        )
        entry["output"] = result.stdout[-4000:] if result.stdout else ""
        entry["error"]  = result.stderr[-2000:] if result.stderr else ""
        entry["rc"]     = result.returncode
    except subprocess.TimeoutExpired:
        entry["error"] = "Timeout 120s"
    except Exception as e:
        entry["error"] = str(e)
    log_buffer.append(entry)
    if len(log_buffer) > 50:
        log_buffer.pop(0)
    write_studio_state()
    run_state_updater_async()
    return entry

# ── P2 : JSON CHAIN RUNNER ───────────────────────────────────────────────────
def run_chain_json(cmd: str) -> dict:
    json_cmd = build_cmd(cmd.rstrip() + " --json")
    try:
        result = subprocess.run(
            json_cmd, shell=True, capture_output=True, text=True,
            cwd=str(CHAINS_DIR), timeout=30)
        stdout = result.stdout.strip()
        if stdout:
            try:
                return json.loads(stdout)
            except json.JSONDecodeError:
                return {"raw": stdout}
        return {"raw": result.stderr or ""}
    except Exception as e:
        return {"error": str(e)}


# ── STATE_UPDATER HOOK ───────────────────────────────────────────────────────
def run_state_updater_async() -> None:
    """Lance state_updater.py en tâche de fond (non-bloquant) après chaque action significative."""
    if not STATE_UPDATER.exists():
        return
    def _worker() -> None:
        try:
            py_exe = str(REPO / ".venv312" / "Scripts" / "python.exe")
            subprocess.run(
                [py_exe, str(STATE_UPDATER)],
                cwd=str(REPO),
                timeout=30,
                capture_output=True,
            )
        except Exception:
            pass
    threading.Thread(target=_worker, daemon=True).start()


# ── WORKFLOW IMP — charter generation (IMP-059) ───────────────────────────────
def _parse_imp_from_ledger(imp_id: str) -> dict:
    if not LEDGER.exists():
        return {}
    try:
        text = LEDGER.read_text(encoding="utf-8")
        for block in re.split(r'\n- id:\s*', text)[1:]:
            m = re.match(r'(IMP-[\w-]+)', block)
            if not m or m.group(1) != imp_id:
                continue
            imp: dict = {"id": imp_id}
            m_title = re.search(r"title:\s*([^\n]+)", block)
            if m_title:
                imp["title"] = m_title.group(1).strip().strip("'\"")
            m_lane = re.search(r'lane:\s*(\S+)', block)
            if m_lane:
                imp["lane"] = m_lane.group(1)
            m_status = re.search(r'status:\s*(\S+)', block)
            if m_status:
                imp["status"] = m_status.group(1)
            m_acc = re.search(r'acceptance:\s*([\s\S]*?)(?=\n\s*\w[\w_]*:|$)', block)
            if m_acc:
                imp["acceptance"] = re.sub(r'\s+', ' ', m_acc.group(1)).strip()
            m_notes = re.search(r'notes:\s*([\s\S]*?)(?=\n\s*\w[\w_]*:|$)', block)
            if m_notes:
                imp["notes"] = re.sub(r'\s+', ' ', m_notes.group(1)).strip().strip("'\"")
            m_files = re.search(r'[ \t]*files:\n((?:\s*- .+\n?)*)', block)
            if m_files:
                imp["files"] = [
                    re.sub(r'^\s*-\s*', '', ln).strip()
                    for ln in m_files.group(1).strip().split("\n") if ln.strip()
                ]
            else:
                imp["files"] = []
            m_domain = re.search(r"domain:\s*['\"]?([^'\"\n]*)['\"]?", block)
            if m_domain:
                imp["domain"] = m_domain.group(1).strip()
            m_blocked = re.search(r'blocked_by:\n((?:\s*- .+\n?)*)', block)
            if m_blocked:
                imp["blocked_by"] = [
                    re.sub(r'^\s*-\s*', '', ln).strip()
                    for ln in m_blocked.group(1).strip().split("\n") if ln.strip()
                ]
            else:
                imp["blocked_by"] = []
            return imp
    except Exception:
        pass
    return {}


def _find_source_idea(imp_id: str) -> dict:
    """Trouve l'idée humaine source d'un IMP via ROADMAP_PROPOSALS → ideas.json."""
    imp = _parse_imp_from_ledger(imp_id)
    imp_title = imp.get("title", "").lower().strip()
    if not imp_title:
        return {}
    proposals_path = REPO / "lab/chains/ROADMAP_PROPOSALS.yaml"
    if not proposals_path.exists():
        return {}
    try:
        text = proposals_path.read_text(encoding="utf-8")
        for block in re.split(r'\n- prop_id:', text)[1:]:
            m_task = re.search(r"source_task:\s*['\"]?([^'\"\n]+)['\"]?", block)
            if not m_task:
                continue
            if m_task.group(1).lower().strip() != imp_title:
                continue
            m_idea = re.search(r"source_idea_id:\s*['\"]?(\d+)['\"]?", block)
            if not m_idea:
                continue
            idea_id = int(m_idea.group(1))
            for idea in load_ideas():
                if idea.get("id") == idea_id:
                    return idea
    except Exception:
        pass
    return {}


def _check_lane_guard(imp_id: str) -> tuple:
    if not re.match(r'^IMP-[\w-]+$', imp_id or ""):
        return (True, None)
    imp = _parse_imp_from_ledger(imp_id)
    lane = imp.get("lane", "")
    if lane in ("FORBIDDEN", "HUMAN_REQUIRED"):
        print(f"[GUARD] {imp_id} bloqué (lane {lane})", flush=True)
        return (False, f"Lane {lane} — exécution bloquée côté serveur")
    return (True, None)


def _check_tool_permission(chain_id: str) -> tuple:
    if not _TOOL_PERMISSION_MATRIX:
        return (True, None)
    tool = _CHAIN_TOOL_MAP.get(chain_id or "")
    if not tool:
        return (True, None)
    rules = _TOOL_PERMISSION_MATRIX.get("tool_rules", [])
    for rule in rules:
        if rule.get("tool") == tool and rule.get("effect") == "ALLOW":
            return (True, None)
    print(f"[PERM] chain={chain_id} tool={tool} DENY (aucun ALLOW dans tool_permission_matrix)", flush=True)
    return (False, f"tool={tool} DENY dans tool_permission_matrix — exécution bloquée")


def verify_tool_permission_matrix(chain_id: str) -> bool:
    """API publique booléenne — vérifie que chain_id est autorisé avant exécution."""
    ok, _ = _check_tool_permission(chain_id)
    return ok


def _check_smoke_level(lane: str) -> tuple:
    """Pre-check smoke level avant autoloop. Lit AUTOMATION_SMOKE_MATRIX.md si présent."""
    smoke_matrix = REPO / "00_STUDIO_CONTROL/00_MASTER_DOCS/AUTOMATION_SMOKE_MATRIX.md"
    if not smoke_matrix.exists():
        print("[SMOKE] matrix absente — gate désactivé", flush=True)
        return (True, "")
    if lane == "SAFE_AUTO":
        return (True, "")
    if lane == "AUDIT_REQUIRED":
        try:
            res = subprocess.run(
                ["cargo", "check"],
                cwd=str(REPO),
                capture_output=True,
                timeout=60,
            )
            if res.returncode == 0:
                print("[SMOKE] AUDIT_REQUIRED — cargo check OK", flush=True)
                return (True, "")
            stderr_preview = (res.stderr or b"").decode("utf-8", errors="replace")[:200]
            print(f"[SMOKE] AUDIT_REQUIRED — cargo check FAIL rc={res.returncode}", flush=True)
            return (False, f"cargo check échoué — corrige src/ avant de lancer l'autoloop\n{stderr_preview}")
        except subprocess.TimeoutExpired:
            print("[SMOKE] AUDIT_REQUIRED — cargo check timeout 60s", flush=True)
            return (False, "cargo check timeout 60s")
        except FileNotFoundError:
            print("[SMOKE] AUDIT_REQUIRED — cargo non trouvé dans PATH", flush=True)
            return (False, "cargo non trouvé — installe Rust")
        except Exception as e:
            print(f"[SMOKE] AUDIT_REQUIRED — erreur: {e}", flush=True)
            return (False, f"cargo check erreur: {e}")
    return (True, "")


def get_lane_stats() -> dict:
    """Retourne modèle LLM, nb_runs_today et last_run_timestamp pour chaque lane active."""
    global _lane_today_date, _lane_today_runs
    today = datetime.now().strftime("%Y-%m-%d")
    if today != _lane_today_date:
        _lane_today_date = today
        _lane_today_runs = {lane: 0 for lane in AUTOLOOP_LANES}
    result = {}
    for lane in AUTOLOOP_LANES:
        st = _autoloop_statuses[lane]
        ledger_lane = st.get("ledger_lane", AUTOLOOP_LANE_MAP.get(lane, "SAFE_AUTO"))
        model = LM_MODEL_CEO if ledger_lane == "HUMAN_REQUIRED" else LM_MODEL
        result[lane] = {
            "model":               model,
            "nb_runs_today":       _lane_today_runs.get(lane, 0),
            "last_run_timestamp":  st.get("started_at"),
            "state":               st.get("state", "idle"),
            "ledger_lane":         ledger_lane,
        }
    return result


def _build_minimal_charter_local(imp: dict) -> str:
    files = imp.get("files", [])
    files_str = "\n".join(f"  - {f}" for f in files) if files else "  (aucun fichier spécifié)"
    val_lines = [
        r".venv312\Scripts\python.exe -m py_compile " + f
        for f in files if f.endswith(".py")
    ]
    if not val_lines:
        val_lines = [r".venv312\Scripts\python.exe -m py_compile autopilot.py"]
    return "\n".join([
        f"# CHARTER {imp.get('id','?')} — {imp.get('title','?')}",
        "",
        f"**Lane:** {imp.get('lane','?')}",
        "**Fichiers autorisés:**",
        files_str,
        "",
        "## RÈGLES ABSOLUES",
        "",
        "- Aucun git write.",
        "- Tests obligatoires.",
        f"- claim_verdict: {_CLAIM_VERDICT}",
        "",
        "## OBJECTIF",
        "",
        imp.get("acceptance", "Voir ledger."),
        "",
        "## NOTES",
        "",
        imp.get("notes", ""),
        "",
        "## VALIDATION",
        "",
        "```powershell",
        "\n".join(val_lines),
        "```",
        "",
        "## RAPPORT FINAL",
        "",
        "software_verdict: OK",
        "evidence_verdict: MECHANICAL_VALIDATION_ONLY",
        f"claim_verdict: {_CLAIM_VERDICT}",
    ])


_CHARTER_STACK_MAP = {
    "studio":           "Lane STUDIO : autopilot.py (~5200 lignes), Flask + HTML inline dans strings Python. Qwen3.6 INTERDIT pour JSON. Ne jamais créer de nouveaux fichiers. Ne pas toucher src/.",
    "rocky_moteur":     "Lane ROCKY_MOTEUR : moteur src/chess/ en Rust. Ne pas toucher autopilot.py. Validation : cargo build --release && cargo test.",
    "ia_apprentissage": r"Lane IA_APPRENTISSAGE : dossier ml/ et lab/. venv .venv312\Scripts\python.exe. Ne pas toucher autopilot.py ni src/.",
    "jeux":             r"Lane JEUX : lab/chess_fantasy/. Tests : .venv312\Scripts\python.exe -m pytest lab/chess_fantasy/tests/ -v. Ne pas toucher src/ ni autopilot.py.",
}

_CHARTER_VALIDATION_BY_LANE = {
    "SAFE_AUTO":      r".venv312\Scripts\python.exe -m py_compile autopilot.py",
    "AUDIT_REQUIRED": "cargo build --release && cargo test",
    "HUMAN_REQUIRED": "# Validation manuelle HumanGate requise avant exécution",
    "FORBIDDEN":      "# FORBIDDEN — ne pas exécuter sans HumanGate explicite",
}

_CHARTER_ONE_SHOT = """\
# CHARTER IMP-089 — Ajouter attribut title aux boutons LLM dans autopilot.py
# Lane : SAFE_AUTO
# Fichiers autorisés : autopilot.py
# claim_verdict: NO_CLAIM_ALLOWED

## CONTEXTE
Le studio utilise Qwen2.5-14B pour plusieurs actions (CEO Brief, autoloop, roadmap).
Les boutons HTML n'indiquent pas quel modèle est utilisé ni la durée estimée.
L'utilisateur ne sait pas ce qu'il déclenche au survol.

## OBJECTIF
Ajouter un attribut title HTML sur chaque bouton qui appelle lm_call() ou un
endpoint LLM dans autopilot.py. Visible au survol de la souris (native browser tooltip).

## SPEC
1. Identifier tous les boutons HTML dans autopilot.py qui déclenchent un appel LLM :
   CEO Brief, Roadmap, Analyser, Transformer en IMPs, autoloop Start...
2. Ajouter title="Qwen2.5-14B - ~3s" sur chaque bouton standard
3. CEO Brief : title="Qwen2.5-14B - CEO Brief (~3s)"
4. Autoloop : title="Qwen2.5-14B - autoloop lane"
5. Ne pas toucher aux boutons sans appel LLM

## VALIDATION
.venv312\\Scripts\\python.exe -m py_compile autopilot.py
Grep "title=" autopilot.py → au moins 5 occurrences sur boutons LLM

## RAPPORT FINAL
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED"""


def _generate_charter_qwen(imp_id: str) -> str:
    """Génère un charter complet via Qwen2.5-14B avec one-shot IMP-089 + STACK_MAP."""
    imp = _parse_imp_from_ledger(imp_id)
    if not imp:
        return _build_minimal_charter_local({"id": imp_id, "title": "?", "lane": "?", "files": []})

    lane   = imp.get("lane", "SAFE_AUTO")
    domain = imp.get("domain", "").strip().strip("'\"")

    # Infer domain if empty
    if not domain or domain not in _CHARTER_STACK_MAP:
        domain = _imp_domain(imp)
    if domain == "decisions_pendantes":
        domain = "studio"

    stack_section = _CHARTER_STACK_MAP.get(domain, _CHARTER_STACK_MAP["studio"])

    # Validation command by lane
    val_cmd = _CHARTER_VALIDATION_BY_LANE.get(lane, _CHARTER_VALIDATION_BY_LANE["SAFE_AUTO"])
    if imp.get("files") and lane == "SAFE_AUTO":
        py_files = [f for f in imp["files"] if f.endswith(".py")]
        if py_files:
            val_cmd = r".venv312\Scripts\python.exe -m py_compile " + " ".join(py_files)

    # Human anchor
    source_idea = _find_source_idea(imp_id)
    if source_idea:
        human_anchor = (
            f"Idée humaine originale : {source_idea.get('title', '')}\n"
            f"{source_idea.get('desc', '')[:300]}"
        )
    else:
        human_anchor = f"Intention : {imp.get('title', imp_id)}"

    files_str   = ", ".join(imp.get("files", [])) or "(à déterminer selon domain)"
    blocked_str = ", ".join(imp.get("blocked_by", [])) or "aucun"

    sys_prompt = (
        f"Tu es générateur de charters pour le Tactical Chess Studio.\n"
        f"Produis des charters COMPLETS et EXÉCUTABLES — zéro contenu générique.\n"
        f"claim_verdict: {_CLAIM_VERDICT}\n\n"
        f"EXEMPLE DE CHARTER BIEN FORMÉ :\n{_CHARTER_ONE_SHOT}"
    )

    user_prompt = (
        f"INTENTION HUMAINE (ancre constante) :\n{human_anchor}\n\n"
        f"IMP : {imp_id}\n"
        f"Titre : {imp.get('title', '?')}\n"
        f"Domain : {domain}\n"
        f"Lane : {lane}\n"
        f"Fichiers : {files_str}\n"
        f"Acceptance : {imp.get('acceptance', 'TBD')}\n"
        f"Notes : {imp.get('notes', '') or 'aucune'}\n"
        f"Blocked_by : {blocked_str}\n\n"
        f"Contraintes stack :\n{stack_section}\n\n"
        f"Format OBLIGATOIRE (même structure que l'exemple) :\n"
        f"# CHARTER {imp_id} — {imp.get('title', '?')}\n"
        f"# Lane : {lane}\n"
        f"# Fichiers autorisés : {files_str}\n"
        f"# claim_verdict: {_CLAIM_VERDICT}\n\n"
        "## CONTEXTE\n[2-4 phrases concrètes sur le contexte studio et pourquoi cet IMP]\n\n"
        "## OBJECTIF\n[Ce que Claude Code doit faire — actionnable et précis]\n\n"
        "## SPEC\n[Fonctions à créer/modifier avec signatures. Numéroter les étapes.]\n\n"
        "## VALIDATION\n"
        f"{val_cmd}\n"
        "[Critère acceptance testable — commande ou vérification concrète]\n\n"
        "## RAPPORT FINAL\n"
        "software_verdict: OK\n"
        "evidence_verdict: MECHANICAL_VALIDATION_ONLY\n"
        f"claim_verdict: {_CLAIM_VERDICT}\n\n"
        "Retourne UNIQUEMENT le charter, rien d'autre."
    )

    result = lm_call(user_prompt, system=sys_prompt, max_tokens=1500, model=LM_MODEL)
    if not result or result.startswith("[LM Studio"):
        return _build_minimal_charter_local(imp)
    return result


def _get_closed_imps_for_files(files: list, limit: int = 10) -> str:
    """Retourne les titres des derniers IMPs CLOSED touchant ces fichiers."""
    if not LEDGER.exists() or not files:
        return ""
    try:
        text = LEDGER.read_text(encoding="utf-8")
        results = []
        for block in re.split(r'\n- id:\s*', text)[1:]:
            m_id = re.match(r'(IMP-[\w-]+)', block)
            if not m_id:
                continue
            m_status = re.search(r'status:\s*(\S+)', block)
            if not m_status or m_status.group(1).upper() != 'CLOSED':
                continue
            m_files = re.search(r'[ \t]*files:\n((?:\s*- .+\n?)*)', block)
            imp_files = []
            if m_files:
                imp_files = [re.sub(r'^\s*-\s*', '', ln).strip()
                             for ln in m_files.group(1).splitlines() if ln.strip()]
            if any(f in imp_files for f in files):
                m_title = re.search(r"title:\s*([^\n]+)", block)
                title = m_title.group(1).strip().strip("'\"") if m_title else "?"
                results.append(f"- {m_id.group(1)} : {title}")
                if len(results) >= limit:
                    break
        return "\n".join(results)
    except Exception:
        return ""


def _get_closed_imp_titles() -> list:
    """Retourne [(imp_id, title)] pour tous les IMPs CLOSED du ledger."""
    if not LEDGER.exists():
        return []
    try:
        text = LEDGER.read_text(encoding="utf-8")
        results = []
        for block in re.split(r'\n- id:\s*', text)[1:]:
            m_id = re.match(r'(IMP-[\w-]+)', block)
            if not m_id:
                continue
            m_status = re.search(r'status:\s*(\S+)', block)
            if not m_status or m_status.group(1).upper() != 'CLOSED':
                continue
            m_title = re.search(r"title:\s*([^\n]+)", block)
            if m_title:
                results.append((m_id.group(1), m_title.group(1).strip().strip("'\"")))
        return results
    except Exception:
        return []


def _generate_charter_claude(imp_id: str) -> str:
    """Génère un charter via Claude Code CLI (claude --print). Fallback → Qwen2.5."""
    imp = _parse_imp_from_ledger(imp_id)
    if not imp:
        return _build_minimal_charter_local({"id": imp_id, "title": "?", "lane": "?", "files": []})

    lane      = imp.get("lane", "SAFE_AUTO")
    files_str = ", ".join(imp.get("files", [])) or "(à déterminer)"
    val_cmd   = _CHARTER_VALIDATION_BY_LANE.get(lane, _CHARTER_VALIDATION_BY_LANE["SAFE_AUTO"])
    if imp.get("files") and lane == "SAFE_AUTO":
        py_files = [f for f in imp["files"] if f.endswith(".py")]
        if py_files:
            val_cmd = r".venv312\Scripts\python.exe -m py_compile " + " ".join(py_files)

    # Extrait roadmap (30 lignes max, optionnel)
    roadmap_section = ""
    for roadmap_candidate in [
        REPO / "STUDIO_ROADMAP_AUTOAMELIORATION.md",
        REPO / "00_STUDIO_CONTROL" / "00_MASTER_DOCS" / "01_ROADMAP.md",
    ]:
        if roadmap_candidate.exists():
            lines = roadmap_candidate.read_text(encoding="utf-8").splitlines()[:30]
            roadmap_section = "ROADMAP STUDIO (contexte) :\n" + "\n".join(lines) + "\n\n"
            break

    # Context injection : extrait code + IMPs CLOSED sur ces fichiers
    file_context_section = ""
    _re_def      = re.compile(r'^(?:async )?def ')
    _re_route    = re.compile(r'elif path ==')
    _re_html_id  = re.compile(r'\bid=')
    for f in imp.get("files", []):
        target = REPO / f
        if target.exists() and target.is_file():
            try:
                src_lines = target.read_text(encoding="utf-8").splitlines()
                if len(src_lines) > 500:
                    # Fichier large : extraction ciblée (signatures + routes + ids HTML)
                    targeted = [
                        l for l in src_lines
                        if _re_def.match(l) or _re_route.search(l) or _re_html_id.search(l)
                    ]
                    excerpt = "\n".join(targeted)
                else:
                    head = src_lines[:100]
                    tail = src_lines[-100:] if len(src_lines) > 200 else []
                    excerpt = "\n".join(head)
                    if tail:
                        excerpt += f"\n... [{len(src_lines) - 200} lignes omises] ...\n" + "\n".join(tail)
                file_context_section += f"\nCode existant dans {f} :\n```\n{excerpt[:3000]}\n```\n"
            except Exception:
                pass
    closed_on_files = _get_closed_imps_for_files(imp.get("files", []))
    if closed_on_files:
        file_context_section += f"\nIMPs déjà fermés sur ce(s) fichier(s) :\n{closed_on_files}\n"

    prompt_text = (
        f"Tu es générateur de charters pour le Tactical Chess Studio.\n"
        f"Produis un charter COMPLET et EXÉCUTABLE — zéro contenu générique.\n"
        f"claim_verdict: {_CLAIM_VERDICT}\n\n"
        f"EXEMPLE DE CHARTER BIEN FORMÉ :\n{_CHARTER_ONE_SHOT}\n\n"
        f"CONVENTIONS STUDIO :\n"
        f"- claim_verdict: NO_CLAIM_ALLOWED dans tous les rapports\n"
        f"- Séparer software_verdict / evidence_verdict / claim_verdict\n"
        f"- HumanGate décide merge/reject/freeze — pas Claude Code\n"
        f"- Lane SAFE_AUTO : fichier unique autopilot.py, validation py_compile\n\n"
        + roadmap_section
        + file_context_section
        + f"IMP : {imp_id}\n"
        f"Titre : {imp.get('title', '?')}\n"
        f"Lane : {lane}\n"
        f"Fichiers autorisés : {files_str}\n"
        f"Acceptance : {imp.get('acceptance', 'TBD')}\n"
        f"Notes : {imp.get('notes', '') or 'aucune'}\n"
        f"Blocked_by : {', '.join(imp.get('blocked_by', [])) or 'aucun'}\n\n"
        f"Génère le charter avec ce format EXACTEMENT :\n"
        f"# CHARTER {imp_id} — {imp.get('title', '?')}\n"
        f"# Lane : {lane}\n"
        f"# Fichiers autorisés : {files_str}\n"
        f"# claim_verdict: {_CLAIM_VERDICT}\n\n"
        "## CONTEXTE\n[2-4 phrases concrètes sur le contexte studio]\n\n"
        "## OBJECTIF\n[Ce que Claude Code doit faire — actionnable et précis]\n\n"
        "## SPEC\n[Étapes numérotées avec signatures de fonctions]\n\n"
        "## VALIDATION\n"
        f"{val_cmd}\n\n"
        "## RAPPORT FINAL\n"
        "software_verdict: OK\n"
        "evidence_verdict: MECHANICAL_VALIDATION_ONLY\n"
        f"claim_verdict: {_CLAIM_VERDICT}\n\n"
        "Retourne UNIQUEMENT le charter, rien d'autre."
    )

    charters_dir = REPO / "lab/chains/charters"
    charters_dir.mkdir(parents=True, exist_ok=True)
    charter_path = charters_dir / f"{imp_id}_charter.md"

    try:
        proc = subprocess.run(
            ["claude", "--print", "--dangerously-skip-permissions", prompt_text],
            cwd=REPO, capture_output=True, text=True,
            encoding="utf-8", timeout=120
        )
        result = proc.stdout.strip()
        if result:
            charter_path.write_text(result, encoding="utf-8")
            print(f"[CHARTER] {imp_id} généré par claude-code")
            return result
        print(f"[CHARTER] {imp_id} claude-code stdout vide — fallback qwen2.5")
    except FileNotFoundError:
        print(f"[CHARTER] {imp_id} claude non disponible — fallback qwen2.5")
    except subprocess.TimeoutExpired:
        print(f"[CHARTER] {imp_id} claude-code timeout — fallback qwen2.5")
    except Exception as e:
        print(f"[CHARTER] {imp_id} claude-code erreur ({e}) — fallback qwen2.5")

    return _generate_charter_qwen(imp_id)


def api_generate_charter(imp_id: str, force: bool = False) -> dict:
    imp = _parse_imp_from_ledger(imp_id)
    if not imp:
        return {"error": f"{imp_id} introuvable dans le ledger"}
    charter_path = REPO / "lab/chains/charters" / f"{imp_id}_charter.md"
    if not force and charter_path.exists():
        try:
            charter_text = charter_path.read_text(encoding="utf-8")
        except Exception:
            charter_text = _generate_charter_claude(imp_id)
    else:
        charter_text = _generate_charter_claude(imp_id)
    return {
        "imp_id":  imp_id,
        "title":   imp.get("title", ""),
        "lane":    imp.get("lane", ""),
        "charter": charter_text,
    }


def _stage_proposals(idea_id: str, idea_title: str, imps: list,
                     idea_desc: str = "", roadmap: str = "",
                     redteam: str = "", fusion: str = "") -> None:
    """Append proposals to ROADMAP_PROPOSALS.yaml with humangate_verdict: null."""
    proposals_path = REPO / "lab/chains/ROADMAP_PROPOSALS.yaml"
    next_num = 1
    if proposals_path.exists():
        try:
            text = proposals_path.read_text(encoding="utf-8")
            ids = re.findall(r'prop_id:\s*PROP-(\d+)', text)
            if ids:
                next_num = max(int(x) for x in ids) + 1
        except Exception:
            pass
    lines: list = []
    # FIX 3 (IMP-089): reasoning_trace fields — computed once for all IMPs in this batch
    _anchor_title = idea_title.replace("'", "''")
    _anchor_desc  = _yaml_oneliner(idea_desc, 200) if idea_desc else ""
    _tr_roadmap   = _yaml_oneliner(roadmap,   400) if roadmap   else ""
    _tr_critique  = _yaml_oneliner(redteam,   400) if redteam   else ""
    _tr_fusion    = _yaml_oneliner(fusion,     400) if fusion    else ""
    for imp in imps:
        title = str(imp.get("title", idea_title)).replace("'", "''")
        lane   = imp.get("lane", "SAFE_AUTO")
        impact = imp.get("impact", "HIGH")
        effort = imp.get("effort", "MEDIUM")
        domain = imp.get("domain", "") or "studio"
        if domain not in ("rocky_moteur", "ia_apprentissage", "studio", "jeux"):
            domain = "studio"
        files_raw = imp.get("files") or []
        if not isinstance(files_raw, list):
            files_raw = []
        files_yaml = "[" + ", ".join(f'"{str(f)}"' for f in files_raw[:8] if isinstance(f, str) and f) + "]"
        acceptance_raw = str(imp.get("acceptance") or "TBD").replace("'", "''")[:200]
        blocked_raw = imp.get("blocked_by") or []
        if not isinstance(blocked_raw, list):
            blocked_raw = []
        blocked_yaml = "[" + ", ".join(f'"{str(b)}"' for b in blocked_raw if isinstance(b, str) and b) + "]"
        block = (
            f"- prop_id: PROP-{next_num:03d}\n"
            f"  source_phase: idea-to-imp\n"
            f"  source_task: '{idea_title.replace(chr(39), chr(39)*2)}'\n"
            f"  source_idea_id: '{idea_id}'\n"
            f"  qwen_used: true\n"
            f"  humangate_verdict: null\n"
        )
        if _anchor_title:
            block += f"  human_anchor_title: '{_anchor_title}'\n"
        if _anchor_desc:
            block += f"  human_anchor_desc: '{_anchor_desc}'\n"
        if _tr_roadmap:
            block += f"  reasoning_roadmap: '{_tr_roadmap}'\n"
        if _tr_critique:
            block += f"  reasoning_critique: '{_tr_critique}'\n"
        if _tr_fusion:
            block += f"  reasoning_fusion: '{_tr_fusion}'\n"
        block += (
            f"  imp:\n"
            f"    title: '{title}'\n"
            f"    type: feature\n"
            f"    lane: {lane}\n"
            f"    impact: {impact}\n"
            f"    effort: {effort}\n"
            f"    domain: {domain}\n"
            f"    files: {files_yaml}\n"
            f"    acceptance: '{acceptance_raw}'\n"
            f"    blocked_by: {blocked_yaml}\n"
            f"    notes: 'Pipeline idea-to-imp — idée {idea_id}'\n"
        )
        lines.append(block)
        next_num += 1
    try:
        if proposals_path.exists():
            existing = proposals_path.read_text(encoding="utf-8")
            proposals_path.write_text(existing.rstrip() + "\n" + "".join(lines), encoding="utf-8")
        else:
            proposals_path.write_text("proposals:\n" + "".join(lines), encoding="utf-8")
    except Exception:
        pass


def _extract_json_array(raw: str) -> list:
    """Scan raw_decode : retient le premier '[' qui parse en liste de dicts.
    Saute les crochets de prose ([analyse], [étape]) du raisonnement Qwen."""
    raw = re.sub(r'^```(?:json)?\s*|\s*```$', '', (raw or "").strip())
    dec = json.JSONDecoder()
    for i, ch in enumerate(raw):
        if ch == '[':
            try:
                val, _ = dec.raw_decode(raw[i:])
                if isinstance(val, list) and val and isinstance(val[0], dict):
                    return val
            except Exception:
                continue
    return []


def _check_needs_human(raw: str) -> tuple:
    """Returns (True, reason) if LM signals needs_human, else (False, '')."""
    if '"needs_human"' not in raw:
        return False, ""
    try:
        m = re.search(r'\{[^{}]*"needs_human"\s*:\s*true[^{}]*\}', raw, re.DOTALL | re.IGNORECASE)
        if m:
            obj = json.loads(m.group(0))
            if obj.get("needs_human"):
                return True, str(obj.get("reason", "Idée trop vague"))
    except Exception:
        pass
    return False, ""


def _yaml_oneliner(text: str, maxlen: int = 400) -> str:
    """Collapse multiline text to a single YAML-safe quoted value."""
    return text.replace("\n", " | ").replace("'", "''")[:maxlen]


def _build_extract_prompt_for_claude(idea_title: str, plan_text: str) -> str:
    """Build the Claude fallback prompt for IMP extraction (FIX 5, IMP-089)."""
    return (
        f"Tu es décomposeur IMP solo-dev. MAX 4 IMPs.\n"
        f"Idée humaine : {idea_title}\n"
        f"Plan :\n{plan_text}\n\n"
        f"INTERDIT : formation, support, déploiement, DevOps, gestion équipe\n"
        f"MAX 4 IMPs. 1 IMP = 1 fichier + 1 fonction.\n"
        f"Stack : Rust + Python + LM Studio local\n"
        "Retourne JSON array uniquement :\n"
        '[{"title":"Ajouter fn X dans fichier Y.py","lane":"SAFE_AUTO","impact":"HIGH",'
        '"effort":"SMALL","domain":"studio","files":["fichier.py"],'
        '"acceptance":"critère","blocked_by":[]}]'
    )


def _run_idea_pipeline(idea_id: str, idea_title: str, idea_content: str) -> None:
    """Thread worker — pipeline idée→IMP.
    IMP-089: FIX 1 ancre humaine tous steps | FIX 2 interdictions EXTRACT |
    FIX 3 reasoning_trace | FIX 4 garde-fou needs_human | model=CEO pour EXTRACT.
    """
    global _idea_pipeline_state
    idea_desc = idea_content[:200]
    # FIX 4 (IMP-089): garde-fou needs_human — ajouté en fin de chaque prompt texte
    _needs_human_prompt = (
        "\nSi l'idée est trop vague ou tu n'es pas certain, retourne UNIQUEMENT :\n"
        '{"needs_human": true, "reason": "explication courte"}\n'
        "Sinon, réponds normalement."
    )
    roadmap = redteam = fusion = ""
    try:
        # Step 1 — ROADMAP (FIX 1: ancre humaine + contraintes solo-dev)
        with _idea_pipeline_lock:
            _idea_pipeline_state.update({"step": "roadmap", "progress": 1, "running": True})
        roadmap = lm_call(
            f"Tu es architecte solo-dev du Tactical Chess Studio (1 seul développeur, pas d'équipe).\n"
            f"IDÉE HUMAINE : {idea_title}\n"
            f"Détails : {idea_desc}\n\n"
            f"CONTRAINTES : max 3 étapes. Chaque étape = 1 fichier Rust/Python précis.\n"
            f"INTERDIT : formation, support, déploiement, gestion d'équipe.\n"
            f"Format : liste numérotée, chaque ligne = 'Modifier fichier X : action Y'."
            + _needs_human_prompt,
            max_tokens=500
        )
        nh, nh_reason = _check_needs_human(roadmap)
        if nh:
            with _idea_pipeline_lock:
                _idea_pipeline_state.update({"running": False, "error": None, "result": {
                    "ok": False, "needs_human": True, "reason": nh_reason, "step": "roadmap",
                    "idea_title": idea_title, "imps_staged": [],
                    "extract_prompt": _build_extract_prompt_for_claude(idea_title, idea_content),
                }})
            return

        # Step 2 — REDTEAM (FIX 1: ancre humaine + contraintes solo-dev)
        with _idea_pipeline_lock:
            _idea_pipeline_state.update({"step": "redteam", "progress": 2})
        redteam = lm_call(
            f"Tu es l'avocat du diable d'un studio solo-dev (1 dev, pas d'équipe).\n"
            f"IDÉE HUMAINE : {idea_title}\n"
            f"Détails : {idea_desc}\n"
            f"Roadmap proposée : {roadmap}\n\n"
            f"Identifie max 3 risques TECHNIQUES concrets (complexité, dépendances, fichiers Rust/Python).\n"
            f"INTERDIT : critiques organisationnelles, formation, support, déploiement.\n"
            f"Format : 3 critiques max, chacune = 'Risque: X | Fichier: Y'."
            + _needs_human_prompt,
            max_tokens=350
        )
        nh, nh_reason = _check_needs_human(redteam)
        if nh:
            with _idea_pipeline_lock:
                _idea_pipeline_state.update({"running": False, "error": None, "result": {
                    "ok": False, "needs_human": True, "reason": nh_reason, "step": "redteam",
                    "idea_title": idea_title, "imps_staged": [],
                    "extract_prompt": _build_extract_prompt_for_claude(idea_title, roadmap),
                }})
            return

        # Step 3 — FUSION (FIX 1: mission réaliser l'idée humaine, pas fusionner deux textes)
        with _idea_pipeline_lock:
            _idea_pipeline_state.update({"step": "fusion", "progress": 3})
        fusion = lm_call(
            f"Tu es arbitre technique solo-dev. Ta mission : réaliser L'IDÉE HUMAINE\n"
            f"en intégrant les critiques — pas fusionner deux textes machine.\n"
            f"IDÉE HUMAINE : {idea_title}\n"
            f"Détails : {idea_desc}\n"
            f"Roadmap : {roadmap}\n"
            f"Critiques : {redteam}\n\n"
            f"RÈGLES : max 3 étapes dans le plan final. Chaque étape = fichier précis + action.\n"
            f"Supprimer toute étape hors-scope solo-dev.\n"
            f"Format : liste numérotée d'étapes bornées."
            + _needs_human_prompt,
            max_tokens=500
        )
        nh, nh_reason = _check_needs_human(fusion)
        if nh:
            with _idea_pipeline_lock:
                _idea_pipeline_state.update({"running": False, "error": None, "result": {
                    "ok": False, "needs_human": True, "reason": nh_reason, "step": "fusion",
                    "idea_title": idea_title, "imps_staged": [],
                    "extract_prompt": _build_extract_prompt_for_claude(idea_title, roadmap),
                }})
            return

        # Step 4 — EXTRACT (FIX 1+2: ancre + interdictions | model=CEO | IMP-089)
        with _idea_pipeline_lock:
            _idea_pipeline_state.update({"step": "extract", "progress": 4})
        _open_imps = build_fusion_context().get("open_imps", [])
        _open_imps_ctx = "\n".join(
            f"  - {i['id']} [{i.get('lane','?')}] {i.get('title','')}"
            for i in _open_imps[:15]
        ) or "  (aucun)"
        extract_raw = lm_call(
            f"Tu es décomposeur IMP d'un studio SOLO-DEV (1 seul développeur, pas d'équipe).\n"
            f"IDÉE HUMAINE À RÉALISER : {idea_title}\n"
            f"Détails : {idea_desc}\n\n"
            f"IMPs déjà OPEN dans le ledger (éviter doublons, calculer blocked_by) :\n"
            f"{_open_imps_ctx}\n\n"
            f"INTERDICTIONS ABSOLUES — rejeter tout IMP contenant :\n"
            f"  formation, tutoriel, support utilisateur, déploiement, DevOps,\n"
            f"  packaging, release, gestion d'équipe, chef de projet.\n\n"
            f"RÈGLES DE GRANULARITÉ :\n"
            f"  - MAX 4 IMPs (pas plus)\n"
            f"  - 1 IMP = 1 fichier précis + 1 fonction précise\n"
            f"  - title : verbe + objet + fichier (ex: 'Ajouter fn X dans fichier Y.py')\n\n"
            f"CONTRAINTES STACK :\n"
            f"  - Pas d'API Claude externe — LM Studio local uniquement\n"
            f"  - Pas de cron (autoloop existe déjà)\n"
            f"  - Stack : Rust (moteur) + Python (ML/studio) + LM Studio\n\n"
            f"Domaines :\n"
            f"  rocky_moteur: moteur Rust, eval, search, ELO, benchmark\n"
            f"  ia_apprentissage: LoRA, dataset, training, neural, Qwen\n"
            f"  jeux: Chess Fantasy, Snake, Belote, TCG, variantes\n"
            f"  studio: autopilot, pipeline, kaizen, docs, UI, workflow\n\n"
            f"Si l'idée est trop vague pour décomposer en IMPs concrets, retourne UNIQUEMENT :\n"
            '{"needs_human": true, "reason": "explication"}\n\n'
            f"Sinon, retourne UNIQUEMENT un JSON array valide, max 4 éléments :\n"
            '[\n'
            '  {\n'
            '    "title": "Ajouter fn X dans fichier Y.py",\n'
            '    "lane": "SAFE_AUTO",\n'
            '    "impact": "HIGH",\n'
            '    "effort": "SMALL",\n'
            '    "domain": "studio",\n'
            '    "files": ["chemin/exact/fichier.py"],\n'
            '    "acceptance": "critère mesurable en 1 ligne",\n'
            '    "blocked_by": []\n'
            '  }\n'
            ']\n\n'
            f"Plan à décomposer :\n"
            f"{fusion}\n\n"
            f"claim_verdict: {_CLAIM_VERDICT}",
            max_tokens=900,
        )
        nh, nh_reason = _check_needs_human(extract_raw)
        if nh:
            with _idea_pipeline_lock:
                _idea_pipeline_state.update({"running": False, "error": None, "result": {
                    "ok": False, "needs_human": True, "reason": nh_reason, "step": "extract",
                    "idea_title": idea_title, "imps_staged": [],
                    "extract_prompt": _build_extract_prompt_for_claude(idea_title, fusion),
                }})
            return

        imps_staged = _extract_json_array(extract_raw)

        # Dedup : exclure IMPs dont le titre ressemble >70% à un IMP CLOSED
        if imps_staged:
            global _dedup_exclusion_count
            _closed_titles = _get_closed_imp_titles()
            _dedup_result = []
            for _imp in imps_staged:
                _title = _imp.get("title", "")
                _dupe = next(
                    (
                        (cid, ct, difflib.SequenceMatcher(None, _title.lower(), ct.lower()).ratio())
                        for cid, ct in _closed_titles
                        if difflib.SequenceMatcher(None, _title.lower(), ct.lower()).ratio() > 0.70
                    ),
                    None
                )
                if _dupe:
                    print(f"[DEDUP] '{_title}' ~ {_dupe[0]} '{_dupe[1]}' ({_dupe[2]:.0%}) — exclu")
                    _dedup_exclusion_count += 1
                    try:
                        DEDUP_LOG.parent.mkdir(parents=True, exist_ok=True)
                        with open(DEDUP_LOG, "a", encoding="utf-8") as _dlf:
                            _dlf.write(json.dumps({
                                "timestamp": datetime.now().isoformat(),
                                "idea_title": idea_title,
                                "excluded_imp_title": _title,
                                "matched_imp": _dupe[0],
                                "matched_imp_title": _dupe[1],
                                "ratio": round(_dupe[2], 4),
                                "action": "excluded",
                            }, ensure_ascii=False) + "\n")
                    except Exception:
                        pass
                else:
                    _dedup_result.append(_imp)
            if len(_dedup_result) < len(imps_staged):
                print(f"[DEDUP] {len(imps_staged) - len(_dedup_result)} IMP(s) dédupliqué(s)")
            imps_staged = _dedup_result

        # Zone 7 — Ghost file verification : fichiers cités par EXTRACT vs repo réel
        if imps_staged:
            _repo_files: set = set()
            for _ext in ['.py', '.rs', '.yaml', '.json', '.md']:
                _repo_files.update(
                    str(p.relative_to(REPO)).replace('\\', '/')
                    for p in REPO.rglob(f'*{_ext}')
                    if '.git' not in str(p)
                )
            _matrix_text = ""
            _matrix_path = REPO / "00_STUDIO_CONTROL/00_MASTER_DOCS/AUTOMATION_LANE_MATRIX.md"
            if _matrix_path.exists():
                try:
                    _matrix_text = _matrix_path.read_text(encoding="utf-8")
                except Exception:
                    pass
            _ghost_total = 0
            for _imp in imps_staged:
                _clean: list = []
                for _f in _imp.get("files", []):
                    _fn = _f.replace('\\', '/')
                    if _fn in _repo_files or _fn in _matrix_text:
                        _clean.append(_f)
                    else:
                        print(f"[EXTRACT] {_imp.get('title', '?')} fichier fantôme : {_f}")
                        _ghost_total += 1
                _imp["files"] = _clean
            print(f"[EXTRACT] {_ghost_total} fichier(s) fantôme(s) détecté(s) sur {len(imps_staged)} IMP(s)")

        needs_claude_fallback = not imps_staged
        if needs_claude_fallback:
            print("[extract] aucun tableau JSON d'objets trouvé dans la réponse")

        # Step 5 — STAGE (FIX 3: reasoning_trace passé à _stage_proposals)
        with _idea_pipeline_lock:
            _idea_pipeline_state.update({"step": "staged", "progress": 5})
        if imps_staged:
            _stage_proposals(idea_id, idea_title, imps_staged,
                             idea_desc=idea_desc, roadmap=roadmap,
                             redteam=redteam, fusion=fusion)
            if idea_id and idea_id not in ("manual", ""):
                update_idea_status(idea_id, "pipeline_done")

        result = {
            "ok": True,
            "needs_human": needs_claude_fallback,
            "idea_title": idea_title,
            "roadmap": roadmap,
            "redteam": redteam,
            "fusion": fusion,
            "imps_staged": imps_staged,
            "proposals_file": "lab/chains/ROADMAP_PROPOSALS.yaml",
            "extract_prompt": _build_extract_prompt_for_claude(idea_title, fusion),
        }
        with _idea_pipeline_lock:
            _idea_pipeline_state.update({"running": False, "result": result, "error": None})
    except Exception as e:
        with _idea_pipeline_lock:
            _idea_pipeline_state.update({"running": False, "error": str(e), "result": None})


def close_imp(imp_id: str) -> dict:
    """Marque un IMP OPEN/DEFERRED comme CLOSED dans le ledger et déclenche state_updater."""
    result: dict = {"ok": False, "imp_id": imp_id, "error": ""}
    if not LEDGER.exists():
        result["error"] = "LEDGER not found"
        run_state_updater_async()
        return result
    try:
        lines = LEDGER.read_text(encoding="utf-8").splitlines(keepends=True)
        in_block = False
        found = False
        new_lines = []
        today = datetime.now().strftime("%Y-%m-%d")
        for line in lines:
            stripped = line.rstrip()
            if re.match(rf"^- id:\s*{re.escape(imp_id)}\s*$", stripped):
                in_block = True
            elif re.match(r"^- id:\s*IMP-[\w-]+", stripped) and in_block:
                in_block = False
            if in_block and re.match(r"^\s+status:\s+(OPEN|DEFERRED|IN_PROGRESS)", stripped):
                line = re.sub(r"(status:\s+)\w+", r"\g<1>CLOSED", line)
                found = True
            new_lines.append(line)
        if found:
            LEDGER.write_text("".join(new_lines), encoding="utf-8")
            ledger_cache.clear()
            result["ok"] = True
            result["closed_session"] = today
            try:
                gc_result = subprocess.run(
                    [sys.executable, "lab/chains/golden_collector.py",
                     "collect", "--imp", imp_id],
                    cwd=str(REPO), timeout=30, capture_output=True, text=True)
                if gc_result.returncode == 0:
                    print(f"[golden] {imp_id} archivé")
                else:
                    print(f"[golden] skip (pas de charter) — {gc_result.stderr.strip()[:120]}")
            except Exception:
                pass
        else:
            result["error"] = f"{imp_id} not found or already CLOSED"
    except Exception as e:
        result["error"] = str(e)
    run_state_updater_async()
    return result


_watcher_active: bool = False
_watcher_last_check: float = 0.0
_watcher_last_processed: str | None = None


_diag_stagnation: dict = {}  # {open_imp_count: first_seen_ts}


def _diagnosis_inject(title: str, desc: str) -> None:
    """Ajoute une idée système dans le pool si elle n'existe pas déjà."""
    try:
        ideas = load_ideas()
        for idea in ideas:
            if idea.get("title") == title:
                return
        new_id = max((i.get("id", 0) for i in ideas), default=0) + 1
        ideas.append({
            "id": new_id,
            "chain": "studio",
            "status": "backlog",
            "title": title,
            "roi": "high",
            "lane": "safe",
            "desc": desc,
            "issue": "auto:diagnosis",
        })
        save_ideas(ideas)
        print(f"[DIAGNOSIS] idee injectee : {title}", flush=True)
    except Exception as exc:
        print(f"[DIAGNOSIS] erreur injection : {exc}", flush=True)


def _diagnosis_thread() -> None:
    """Thread daemon : lit metrics.json toutes les 60 min et injecte des idees systeme."""
    import time as _time
    _time.sleep(60)  # attendre que le serveur soit pret
    while True:
        try:
            mp = REPO / "lab" / "chains" / "metrics.json"
            if mp.exists():
                raw = json.loads(mp.read_text(encoding="utf-8"))
                kaizen = raw.get("kaizen", {})
                dr = raw.get("draw_rate", {})
                try:
                    pct_closed = float(kaizen.get("pct_closed", 100))
                except (TypeError, ValueError):
                    pct_closed = 100.0
                try:
                    draw_pct = float(dr.get("pct", 0))
                except (TypeError, ValueError):
                    draw_pct = 0.0
                # read open_imp_count from phi_history
                try:
                    open_imp = int(kaizen.get("open", 0))
                except (TypeError, ValueError):
                    open_imp = 0
                phi_path = REPO / "lab" / "chains" / "phi_history.jsonl"
                if phi_path.exists():
                    lines = [l for l in phi_path.read_text(encoding="utf-8").splitlines() if l.strip()]
                    if lines:
                        raw_open = json.loads(lines[-1]).get("open_imp_count", open_imp)
                        try:
                            open_imp = int(raw_open)
                        except (TypeError, ValueError):
                            pass
                if pct_closed < 70:
                    _diagnosis_inject(
                        "Auto-diagnosis : taux succes charters < 70%",
                        f"pct_closed={pct_closed}% — revoir criteres acceptance ou decharger les IMPs OPEN en DEFERRED.",
                    )
                if draw_pct > 20:
                    _diagnosis_inject(
                        "Auto-diagnosis : draw_rate > 20%",
                        f"draw_rate={draw_pct}% (seuil 20%) — verifier pool, TurnLimit vs Draw, panics recuperes.",
                    )
                # stagnation : open_imp inchange depuis > 7 jours
                now_ts = _time.time()
                prev = _diag_stagnation.get("last_open")
                if prev is None or prev != open_imp:
                    _diag_stagnation["last_open"] = open_imp
                    _diag_stagnation["since_ts"] = now_ts
                elif now_ts - _diag_stagnation.get("since_ts", now_ts) > 7 * 86400:
                    _diagnosis_inject(
                        "Auto-diagnosis : open_imp_count stagne > 7 jours",
                        f"open_imp_count={open_imp} inchange depuis > 7 jours — forcer un sprint ou archiver les IMPs bloques.",
                    )
        except Exception as exc:
            print(f"[DIAGNOSIS] erreur lecture metrics : {exc}", flush=True)
        _time.sleep(3600)


def _report_watcher_thread() -> None:
    """Thread daemon : surveille lab/chains/reports/ toutes les 5 s."""
    global _watcher_active, _watcher_last_check, _watcher_last_processed
    reports_dir = REPO / "lab/chains/reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    _watcher_active = True
    while True:
        _watcher_last_check = time.time()
        files = list(reports_dir.glob("IMP-*_report.md"))
        print(f"[WATCHER] poll — {len(files)} fichier(s) : {[f.name for f in files]}")
        try:
            for p in sorted(reports_dir.glob("IMP-*_report.md")):
                result = _auto_close_from_report(str(p))
                print(f"[DEBUG] result: {result}", flush=True)
                if result.get("ok"):
                    _watcher_last_processed = result.get("imp_id")
        except Exception as exc:
            print(f"[WATCHER] erreur iteration : {exc}", flush=True)
        time.sleep(5)


def _auto_close_from_report(report_path: str) -> dict:
    """Ferme automatiquement un IMP quand un rapport valide est détecté.

    Attend un fichier nommé IMP-XXX_report.md dans lab/chains/reports/.
    Déplace le rapport vers lab/chains/reports/processed/ après traitement.
    """
    result: dict = {"ok": False, "imp_id": "", "error": ""}
    path = Path(report_path)
    m = re.match(r"(IMP-[\w-]+)_report\.md$", path.name, re.IGNORECASE)
    if not m:
        result["error"] = f"nom de fichier non reconnu : {path.name}"
        return result
    imp_id = m.group(1).upper()
    result["imp_id"] = imp_id
    if not path.exists():
        result["error"] = f"rapport introuvable : {report_path}"
        return result
    # Parser le fichier en dict avant d appeler analyse_report
    report_dict = {}
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            report_dict[k.strip()] = v.strip()
    if not analyse_report(report_dict):
        result["error"] = f"{imp_id} : rapport invalide (verdicts manquants ou incorrects)"
        return result
    close_result = close_imp(imp_id)
    if not close_result.get("ok"):
        result["error"] = close_result.get("error", "close_imp a échoué")
        return result
    print(f"[AUTO-CLOSE] {imp_id} fermé depuis rapport")
    processed_dir = REPO / "lab/chains/reports/processed"
    processed_dir.mkdir(parents=True, exist_ok=True)
    dest = processed_dir / path.name
    try:
        path.rename(dest)
    except Exception as e:
        result["error"] = f"déplacement échoué : {e}"
        return result
    result["ok"] = True
    result["processed_path"] = str(dest)
    return result


# ── LEDGER / HISTORY UTILS ────────────────────────────────────────────────────
def get_ledger_counts() -> dict:
    if not LEDGER.exists():
        return {"open": 0, "closed": 0, "next": {}, "open_imps": []}
    try:
        text = LEDGER.read_text(encoding="utf-8")
        open_count = text.count("status: OPEN") + text.count("status: IN_PROGRESS")
        closed_count = text.count("status: CLOSED") + text.count("status: DONE")
        next_imp = {}
        m = re.search(r'- id:\s*(IMP-[\w-]+).*?title:\s*"([^"]+)".*?status:\s*OPEN',
                      text, re.DOTALL)
        if m:
            next_imp = {"id": m.group(1), "title": m.group(2)}
        open_imps: list = []
        for block in re.split(r'\n- id:\s*', text)[1:]:
            m_st = re.search(r'status:\s*(\w+)', block)
            if not m_st or m_st.group(1) not in ("OPEN", "IN_PROGRESS"):
                continue
            entry: dict = {}
            m_id = re.match(r'(IMP-[\w-]+)', block)
            if m_id:
                entry["id"] = m_id.group(1)
            m_tit = re.search(r"title:\s*([^\n]+)", block)
            if m_tit:
                entry["title"] = m_tit.group(1).strip().strip("'\"")
            m_ln = re.search(r'lane:\s*(\S+)', block)
            if m_ln:
                entry["lane"] = m_ln.group(1)
            m_dom = re.search(r'domain:\s*(\S+)', block)
            if m_dom:
                dom_raw = m_dom.group(1).strip("'\"")
                if dom_raw:
                    entry["domain"] = dom_raw
            if entry.get("id"):
                open_imps.append(entry)
        # Enrichir next_imp avec lane depuis open_imps (le regex ci-dessus ne capture pas lane)
        if open_imps and not next_imp.get("lane"):
            first = open_imps[0]
            next_imp = {k: first[k] for k in ("id", "title", "lane") if k in first}
        return {"open": open_count, "closed": closed_count, "next": next_imp, "open_imps": open_imps}
    except Exception:
        return {"open": 0, "closed": 0, "next": {}, "open_imps": []}


def read_chain_history(n: int = 3) -> list:
    if not CHAIN_HISTORY.exists():
        return []
    try:
        lines = CHAIN_HISTORY.read_text(encoding="utf-8").strip().split("\n")
        entries = []
        for line in reversed(lines):
            if not line.strip():
                continue
            try:
                entries.append(json.loads(line))
            except Exception:
                pass
            if len(entries) >= n:
                break
        return entries
    except Exception:
        return []


def _ledger_refresh_worker():
    time.sleep(2)
    while True:
        try:
            counts = get_ledger_counts()
            ledger_cache.update(counts)
            ledger_cache["ts"] = datetime.now().isoformat()
        except Exception:
            pass
        time.sleep(60)


# ── P4 : HEALTH + STALENESS ───────────────────────────────────────────────────
def get_health() -> dict:
    venv_path = REPO / ".venv312" / "Scripts" / "python.exe"
    lm = lm_status()
    return {
        "venv":           venv_path.exists(),
        "lm_studio":      lm["ok"],
        "venv_path":      str(venv_path),
        "lm_model":       LM_MODEL,
        "lm_model_ceo":   LM_MODEL_CEO,
        "lm_models":      lm.get("models", []),
    }


def get_staleness() -> dict:
    result = {"state_days": None, "history_days": None}
    now = datetime.now()
    for path, key in [(STATE_FILE, "state_days"), (CHAIN_HISTORY, "history_days")]:
        if path.exists():
            try:
                mtime = datetime.fromtimestamp(path.stat().st_mtime)
                result[key] = (now - mtime).days
            except Exception:
                pass
    return result


# ── P5 : METRICS ──────────────────────────────────────────────────────────────
def get_metrics() -> dict:
    result: dict = {"elo": {}, "draw_rate": None, "benchmark": {}, "is_fallback": True}
    report_dir = REPO / "lab/reports"
    for fname in ["latest_benchmark_summary.json", "bench_rocky_p4_holdout_v2.json",
                  "bench_rocky_p4_holdout.json", "bench_rocky_p4_train_v2.json"]:
        p = report_dir / fname
        if p.exists():
            try:
                data = json.loads(p.read_text(encoding="utf-8"))
                result["draw_rate"] = data.get("draw_rate") or data.get("draw_rate_neural")
                result["elo"] = {
                    "teacher_uci": data.get("elo_teacher_uci") or data.get("teacher_uci_elo") or 1424,
                    "heuristic":   data.get("elo_heuristic")   or data.get("heuristic_elo")   or 1200,
                    "neural":      data.get("elo_neural")       or data.get("neural_elo")       or 975,
                    "date": data.get("date") or data.get("timestamp") or "",
                }
                result["benchmark"] = {"file": fname, "status": "ok"}
                result["is_fallback"] = False
                break
            except Exception:
                pass
    draw = result.get("draw_rate") or 0
    try:
        neural_st = "WEAK" if draw and float(draw) > 0.5 else "STABLE"
    except Exception:
        neural_st = "STABLE"
    result["agents"] = [
        {"id": "teacher_uci", "arch": "Search · Stockfish UCI",    "status": "STABLE"},
        {"id": "heuristic",   "arch": "Search only · eval.rs",     "status": "STABLE"},
        {"id": "neural",      "arch": "Search + Neural · PyTorch", "status": neural_st},
    ]
    counts = get_ledger_counts()
    result["open"] = counts["open"]
    result["closed"] = counts["closed"]
    return result


# ── P6 : DATASET STATUS ───────────────────────────────────────────────────────
def get_dataset_status() -> dict:
    result: dict = {"active_path": None, "active_exists": False,
                    "corrupt": False, "corrupt_reason": "", "pools": [], "reports": []}
    active_txt = REPO / "lab/ACTIVE_DATASET.txt"
    if active_txt.exists():
        try:
            p = active_txt.read_text(encoding="utf-8").strip()
            result["active_path"] = p
            result["active_exists"] = Path(p).exists() if p else False
        except Exception:
            pass
    report_dir = REPO / "lab/reports"
    for fname in ["latest_benchmark_summary.json", "bench_rocky_p4_holdout_v2.json",
                  "bench_rocky_p4_holdout.json"]:
        fp = report_dir / fname
        if fp.exists():
            try:
                data = json.loads(fp.read_text(encoding="utf-8"))
                dr = data.get("draw_rate") or data.get("draw_rate_neural") or 0
                if float(dr) > 0.9:
                    result["corrupt"] = True
                    result["corrupt_reason"] = f"draw_rate {float(dr)*100:.0f}% dans {fname}"
            except Exception:
                pass
    datasets_dir = REPO / "lab/datasets"
    if datasets_dir.exists():
        for item in sorted(datasets_dir.iterdir()):
            try:
                if item.is_dir():
                    size = sum(f.stat().st_size for f in item.iterdir() if f.is_file())
                else:
                    size = item.stat().st_size
                label = f"{size//1024}KB" if size < 1024*1024 else f"{size//(1024*1024)}MB"
                result["pools"].append({"name": item.name, "size": label})
            except Exception:
                pass
    if report_dir.exists():
        result["reports"] = [f.name for f in sorted(report_dir.glob("*.json"))]
    return result


# ── FUSION CONTEXT ───────────────────────────────────────────────────────────
def build_fusion_context() -> dict:
    ctx: dict = {
        "open_imps": [],
        "roadmap": "",
        "metrics": {},
        "chain_history": [],
        "fusion_log": [],
        "ideas": [],
    }
    # 1. Open IMPs from IMPROVEMENT_LEDGER.yaml
    if LEDGER.exists():
        blocks = []
        try:
            text = LEDGER.read_text(encoding="utf-8")
            blocks = re.split(r'\n- id:\s*', text)
        except Exception:
            pass
        for block in blocks[1:]:
            try:
                m_status = re.search(r'status:\s*(\w+)', block)
                if not m_status or m_status.group(1) not in ("OPEN", "IN_PROGRESS"):
                    continue
                entry: dict = {}
                m_id = re.match(r'(IMP-[\w-]+)', block)
                if m_id:
                    entry["id"] = m_id.group(1)
                m_title = re.search(r"title:\s*['\"]?([^'\"\n]+)['\"]?", block)
                if m_title:
                    entry["title"] = m_title.group(1).strip()
                m_lane = re.search(r'lane:\s*(\w+)', block)
                if m_lane:
                    entry["lane"] = m_lane.group(1)
                m_domain = re.search(r'domain:\s*(\S+)', block)
                if m_domain:
                    entry["domain"] = m_domain.group(1)
                m_impact = re.search(r'impact:\s*(\w+)', block)
                if m_impact:
                    entry["roi"] = m_impact.group(1)
                entry["status"] = m_status.group(1)
                if entry.get("id"):
                    ctx["open_imps"].append(entry)
            except Exception:
                pass
    # 2. Roadmap (2000 chars)
    roadmap_path = REPO / "00_STUDIO_CONTROL/00_MASTER_DOCS/01_ROADMAP.md"
    if roadmap_path.exists():
        try:
            ctx["roadmap"] = roadmap_path.read_text(encoding="utf-8")[:2000]
        except Exception:
            pass
    # 3. Metrics
    m = get_metrics()
    active_txt = REPO / "lab/ACTIVE_DATASET.txt"
    dataset_actif = None
    if active_txt.exists():
        try:
            dataset_actif = active_txt.read_text(encoding="utf-8").strip()
        except Exception:
            pass
    ctx["metrics"] = {
        "elo_teacher": m.get("elo", {}).get("teacher_uci"),
        "elo_neural":  m.get("elo", {}).get("neural"),
        "draw_rate":   m.get("draw_rate"),
        "dataset_actif": dataset_actif,
    }
    # 4. Chain history (3 dernières)
    ctx["chain_history"] = read_chain_history(3)
    # 5. Fusion log (3 dernières)
    fusion_log_path = REPO / "lab/chains/FUSION_LOG.jsonl"
    if fusion_log_path.exists():
        try:
            lines = [l for l in fusion_log_path.read_text(encoding="utf-8").strip().split("\n") if l.strip()]
            entries: list = []
            for line in reversed(lines):
                try:
                    entries.append(json.loads(line))
                except Exception:
                    pass
                if len(entries) >= 3:
                    break
            ctx["fusion_log"] = entries
        except Exception:
            pass
    # 6. Ideas from studio_memory.json
    mem = load_memory()
    ctx["ideas"] = [
        {"type": f.get("type"), "content": f.get("content", "")[:200], "tags": f.get("tags", [])}
        for f in mem.get("fusions", [])[:10]
    ]
    return ctx


def _extract_sprint_objective(roadmap_text: str) -> str:
    """Return 'Phase N — objectif' for the first phase that has an IN_PROGRESS task."""
    phase = ""
    obj = ""
    for line in roadmap_text.splitlines():
        m_phase = re.match(r'^## (Phase \d+ [—-].+)', line)
        if m_phase:
            phase = m_phase.group(1)
            obj = ""
        m_obj = re.match(r'^Objectif\s*:\s*(.+)', line)
        if m_obj:
            obj = m_obj.group(1).strip()
        if "IN_PROGRESS" in line and phase:
            return f"{phase} — {obj}" if obj else phase
    return phase or "Phase courante non déterminée"


# ── IMP TRIAGE — classification par domaine ──────────────────────────────────
def _imp_domain(entry: dict) -> str:
    if entry.get("lane") in ("AUDIT_REQUIRED", "FORBIDDEN", "HUMAN_REQUIRED"):
        return "decisions_pendantes"
    d = entry.get("domain", "")
    if d and d not in ("''", '""') and d in ("rocky_moteur", "ia_apprentissage", "studio", "jeux"):
        return d
    title = entry.get("title", "").lower()
    if any(k in title for k in ("chess fantasy", "puzzle", "carte", "tcg", "snake", "belote")):
        return "jeux"
    if any(k in title for k in ("lora", "dataset", "training", "devstral", "neural", "model", "teacher", "sf_dataset", "pool")):
        return "ia_apprentissage"
    if any(k in title for k in ("autopilot", "pipeline", "kaizen", "ui", "workflow", "roadmap", "ledger", "charter")):
        return "studio"
    if any(k in title for k in ("eval", "search", "elo", "benchmark", "moteur", "rocky")):
        return "rocky_moteur"
    return "studio"


def imp_triage() -> dict:
    domains: dict = {
        "rocky_moteur": [], "ia_apprentissage": [], "studio": [],
        "jeux": [], "decisions_pendantes": [],
    }
    if not LEDGER.exists():
        return {"domains": domains, "total_open": 0, "error": "ledger absent"}
    try:
        text = LEDGER.read_text(encoding="utf-8")
        blocks = re.split(r'\n- id:\s*', text)
    except Exception as exc:
        return {"domains": domains, "total_open": 0, "error": str(exc)}
    for block in blocks[1:]:
        try:
            m_status = re.search(r'status:\s*(\S+)', block)
            status = m_status.group(1) if m_status else ""
            if status not in ("OPEN", "IN_PROGRESS", "DEFERRED"):
                continue
            entry: dict = {"status": status}
            m_id = re.match(r'(IMP-[\w-]+)', block)
            if m_id:
                entry["id"] = m_id.group(1)
            m_title = re.search(r"title:\s*['\"]?([^'\"\n]+)['\"]?", block)
            if m_title:
                entry["title"] = m_title.group(1).strip()
            m_lane = re.search(r'lane:\s*(\S+)', block)
            if m_lane:
                entry["lane"] = m_lane.group(1)
            m_domain = re.search(r'domain:\s*(\S+)', block)
            if m_domain:
                dom_raw = m_domain.group(1).strip("'\"")
                if dom_raw:
                    entry["domain"] = dom_raw
            m_impact = re.search(r'impact:\s*(\w+)', block)
            if m_impact:
                entry["impact"] = m_impact.group(1)
            if entry.get("id"):
                dom = _imp_domain(entry)
                domains[dom].append(entry)
        except Exception:
            pass
    total = sum(len(v) for v in domains.values())
    return {"domains": domains, "total_open": total, "claim_verdict": _CLAIM_VERDICT}


def _ceo_assign_lanes() -> list:
    """Greedy graph-coloring: OPEN SAFE_AUTO IMPs → conflict-free lanes (no shared files)."""
    charters_dir = REPO / "lab/chains/charters"
    if not LEDGER.exists():
        return []
    try:
        text = LEDGER.read_text(encoding="utf-8")
    except Exception:
        return []
    open_imps: list = []
    for block in re.split(r'\n- id:\s*', text)[1:]:
        try:
            m_st = re.search(r'status:\s*(\S+)', block)
            if not m_st or m_st.group(1) != "OPEN":
                continue
            m_ln = re.search(r'lane:\s*(\S+)', block)
            if not m_ln or m_ln.group(1) != "SAFE_AUTO":
                continue
            m_id = re.match(r'(IMP-[\w-]+)', block)
            if not m_id:
                continue
            imp_id = m_id.group(1)
            m_title = re.search(r"title:\s*['\"]?([^'\"\n]+)['\"]?", block)
            title = m_title.group(1).strip() if m_title else ""
            files: list = []
            m_files = re.search(r'\n[ \t]*files:((?:\s*\n[ \t]+-[ \t]+[^\n]+)*)', block)
            if m_files:
                for fline in m_files.group(1).split('\n'):
                    fline = fline.strip()
                    if fline.startswith('- '):
                        files.append(fline[2:].strip())
            charter_ready = (charters_dir / f"{imp_id}_charter.md").exists()
            open_imps.append({
                "imp_id": imp_id,
                "title": title,
                "files": files,
                "charter_ready": charter_ready,
            })
        except Exception:
            pass
    open_imps = sorted(open_imps, key=lambda x: tuple(sorted(x["files"])))
    lanes: list = []
    for imp in open_imps:
        imp_files = set(imp["files"])
        placed = False
        for lane in lanes:
            if not (imp_files & lane["_files_set"]):
                lane["imps"].append(imp)
                lane["_files_set"].update(imp_files)
                placed = True
                break
        if not placed:
            idx = len(lanes)
            lanes.append({
                "id": f"L{idx + 1}",
                "label": f"Lane {idx + 1}",
                "color": _LANE_COLORS[idx % len(_LANE_COLORS)],
                "imps": [imp],
                "_files_set": imp_files.copy(),
            })
    for lane in lanes:
        lane["files_locked"] = sorted(lane.pop("_files_set"))
    # Cap to max 5 lanes, most-loaded first
    lanes.sort(key=lambda l: len(l["imps"]), reverse=True)
    lanes = lanes[:5]
    for i, lane in enumerate(lanes):
        lane["id"] = f"L{i + 1}"
        lane["label"] = f"Lane {i + 1}"
        lane["color"] = _LANE_COLORS[i % len(_LANE_COLORS)]
        imps = lane["imps"]
        lane["active"] = imps[0] if imps else None
        lane["queued"] = imps[1:] if len(imps) > 1 else []
        active_id = imps[0]["imp_id"] if imps else "—"
        queued_ids = ", ".join(x["imp_id"] for x in imps[1:])
        lane["recommendation"] = (
            f"▶ {active_id}" + (f" · queued: {queued_ids}" if queued_ids else "")
            if imps else "Lane libre"
        )
    return lanes


# ── MEMORY DATA — lit les fichiers sources réels ──────────────────────────────
def get_memory_data() -> dict:
    result: dict = {
        "fusions": [],
        "decisions_humangate": [],
        "golden_examples": 0,
        "ux_runs": 0,
        "finetune_examples": 0,
        "last_chains": [],
        "studio_memory_size": None,
    }
    # 1. FUSION_LOG.jsonl
    fusion_log = REPO / "lab/chains/FUSION_LOG.jsonl"
    if fusion_log.exists():
        try:
            for line in fusion_log.read_text(encoding="utf-8").strip().split("\n"):
                if line.strip():
                    try:
                        result["fusions"].append(json.loads(line))
                    except Exception:
                        pass
        except Exception:
            pass
    # 2. HUMANGATE_DECISION_LOG.yaml — parse HGD-* entries
    hg_log = REPO / "lab/chains/HUMANGATE_DECISION_LOG.yaml"
    if hg_log.exists():
        try:
            text = hg_log.read_text(encoding="utf-8")
            blocks = re.split(r'\n  - decision_id:\s*', text)
            for block in blocks[1:]:
                entry: dict = {}
                m = re.match(r'(HGD-\d+)', block)
                if m:
                    entry["id"] = m.group(1)
                m2 = re.search(r'title:\s*"([^"]+)"', block)
                if m2:
                    entry["question"] = m2.group(1)
                m3 = re.search(r'verdict:\s*(\w+)', block)
                if m3:
                    entry["decision"] = m3.group(1)
                m4 = re.search(r'approved_at:\s*"([^"]+)"', block)
                if m4:
                    entry["date"] = m4.group(1)
                if entry.get("id"):
                    result["decisions_humangate"].append(entry)
        except Exception:
            pass
    # 3. golden_examples.jsonl
    golden = REPO / "lab/chains/golden_examples.jsonl"
    if golden.exists():
        try:
            result["golden_examples"] = sum(1 for l in golden.read_text(encoding="utf-8").split("\n") if l.strip())
        except Exception:
            pass
    # 4. ux_claude_runs.jsonl
    if UX_RUNS_FILE.exists():
        try:
            result["ux_runs"] = sum(1 for l in UX_RUNS_FILE.read_text(encoding="utf-8").split("\n") if l.strip())
        except Exception:
            pass
    # 5. ux_finetune_*.jsonl cumulés
    ft_dir = REPO / "lab/datasets"
    if ft_dir.exists():
        for fp in sorted(ft_dir.glob("ux_finetune_*.jsonl")):
            try:
                result["finetune_examples"] += sum(1 for l in fp.read_text(encoding="utf-8").split("\n") if l.strip())
            except Exception:
                pass
    # 6. 5 dernières CHAIN_HISTORY
    result["last_chains"] = read_chain_history(5)
    # 7. studio_memory.json taille en KB
    if MEMORY_FILE.exists():
        try:
            result["studio_memory_size"] = round(MEMORY_FILE.stat().st_size / 1024, 1)
        except Exception:
            pass
    # 8. 3 derniers IMPs fermés (pour workflow)
    closed_imps: list = []
    if LEDGER.exists():
        try:
            text = LEDGER.read_text(encoding="utf-8")
            for block in re.split(r'\n- id:\s*', text)[1:]:
                m_st = re.search(r'status:\s*(\w+)', block)
                if not m_st or m_st.group(1) not in ("CLOSED", "DONE"):
                    continue
                entry: dict = {}
                m_id = re.match(r'(IMP-[\w-]+)', block)
                if m_id:
                    entry["id"] = m_id.group(1)
                m_tit = re.search(r"title:\s*([^\n]+)", block)
                if m_tit:
                    entry["title"] = m_tit.group(1).strip().strip("'\"")
                m_cs = re.search(r"closed_session:\s*['\"]?([^\s'\"]+)['\"]?", block)
                if m_cs:
                    entry["closed_session"] = m_cs.group(1)
                if entry.get("id"):
                    closed_imps.append(entry)
        except Exception:
            pass
    result["last_closed_imps"] = list(reversed(closed_imps))[:3]
    return result


# ── P15 : SESSION CONTEXT ─────────────────────────────────────────────────────
def get_session_context() -> dict:
    history = read_chain_history(3)
    state_mtime = None
    if STATE_FILE.exists():
        try:
            state_mtime = datetime.fromtimestamp(STATE_FILE.stat().st_mtime).isoformat()
        except Exception:
            pass
    mem = load_memory()
    return {
        "chain_history": history,
        "ledger": dict(ledger_cache) if ledger_cache else get_ledger_counts(),
        "state_file_mtime": state_mtime,
        "recent_fusions": mem.get("fusions", [])[:3],
    }


def _compute_surfaces() -> dict:
    """Statuts dynamiques des 5 surfaces pour /api/studio-state."""
    active_txt = REPO / "lab/ACTIVE_DATASET.txt"
    active_exists = False
    corrupt = False
    if active_txt.exists():
        try:
            p = active_txt.read_text(encoding="utf-8").strip()
            active_exists = Path(p).exists() if p else False
        except Exception:
            pass
    report_dir = REPO / "lab/reports"
    for fname in ["latest_benchmark_summary.json", "bench_rocky_p4_holdout_v2.json", "bench_rocky_p4_holdout.json"]:
        fp = report_dir / fname
        if fp.exists():
            try:
                data = json.loads(fp.read_text(encoding="utf-8"))
                dr = data.get("draw_rate") or data.get("draw_rate_neural") or 0
                if float(dr) > 0.9:
                    corrupt = True
            except Exception:
                pass
    lora_cfg = REPO / "ml" / "lora_config.yaml"
    golden = REPO / "lab" / "chains" / "golden_examples.jsonl"
    golden_count = 0
    if golden.exists():
        try:
            golden_count = sum(1 for l in golden.read_text(encoding="utf-8").split("\n") if l.strip())
        except Exception:
            pass
    has_benchmark = any(
        (report_dir / f).exists()
        for f in ["latest_benchmark_summary.json", "bench_rocky_p4_holdout_v2.json", "bench_rocky_p4_holdout.json"]
    )
    if active_exists and not corrupt:
        ds_status = "IMPLEMENTED"
    elif active_exists:
        ds_status = "PARTIAL"
    else:
        ds_status = "NOT_STARTED"
    if lora_cfg.exists() and golden_count >= 10:
        lora_status = "IMPLEMENTED"
    elif golden_count > 0:
        lora_status = "PARTIAL"
    else:
        lora_status = "NOT_STARTED"
    return {
        "moteur_rust": "IMPLEMENTED",
        "dataset":     ds_status,
        "autopilote":  "IMPLEMENTED",
        "lora":        lora_status,
        "benchmark":   "IMPLEMENTED" if has_benchmark else "NOT_STARTED",
    }


def _get_sprint_objective() -> str:
    """Lit l'objectif de sprint courant depuis ROADMAP.md (non-bloquant)."""
    roadmap_path = REPO / "00_STUDIO_CONTROL/00_MASTER_DOCS/01_ROADMAP.md"
    if not roadmap_path.exists():
        return ""
    try:
        return _extract_sprint_objective(roadmap_path.read_text(encoding="utf-8")[:3000])
    except Exception:
        return ""


def write_studio_state():
    """Écrit studio_state.json après chaque action significative."""
    lc = dict(ledger_cache) if ledger_cache else get_ledger_counts()
    lm = lm_status()
    state = {
        "ts": datetime.now().isoformat(),
        "ledger": {
            "open":   lc.get("open", 0),
            "closed": lc.get("closed", 0),
            "next":   lc.get("next", {})
        },
        "lm": {
            "ok":             lm.get("ok", False),
            "model":          LM_MODEL,
            "model_ceo":      LM_MODEL_CEO,
            "tokens_session": tokens_session,
        },
        "humangate_pending": any(
            i.get("lane") in ("HUMAN_REQUIRED", "FORBIDDEN")
            for i in lc.get("open_imps", [])
        ),
        "last_cycle": datetime.now().isoformat(),
        "surfaces": _compute_surfaces(),
        "sprint_objective": _get_sprint_objective(),
    }
    try:
        (Path(__file__).parent / "studio_state.json").write_text(
            json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except Exception:
        pass


_DEFAULT_VISION_LANES = {
    "rocky":  {"phase": 0, "phases": ["UCI+HTTP", "Self-play", "Fort"],       "milestone": "Rocky répond via HTTP"},
    "jeux":   {"phase": 0, "phases": ["UI chess", "Multi-jeux", "Tournois"],   "milestone": "Partie jouable"},
    "agent":  {"phase":-1, "phases": ["Self-play", "LoRA", "Fort"],            "milestone": "Attend Rocky"},
    "studio": {"phase": 1, "phases": ["Infra", "Métriques", "Réflexion", "Executor"], "milestone": "Factory autonome"},
}


def _get_vision_state() -> dict:
    p = Path(__file__).parent / "studio_state.json"
    st: dict = {}
    try:
        if p.exists():
            st = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        pass
    lanes = st.get("lanes", _DEFAULT_VISION_LANES)
    sprint = st.get("sprint") or st.get("sprint_objective") or ""
    hg_pending = bool(st.get("humangate_pending", False))
    open_count = 0
    last_closed: dict = {}
    try:
        text = LEDGER.read_text(encoding="utf-8")
        open_count = text.count("status: OPEN") + text.count("status: IN_PROGRESS")
        for block in re.split(r'\n- id:\s*', text)[1:]:
            m_st = re.search(r'status:\s*(\w+)', block)
            if not m_st or m_st.group(1) not in ("CLOSED", "DONE"):
                continue
            entry: dict = {}
            m_id = re.match(r'(IMP-[\w-]+)', block)
            if m_id:
                entry["id"] = m_id.group(1)
            m_tit = re.search(r"title:\s*([^\n]+)", block)
            if m_tit:
                entry["title"] = m_tit.group(1).strip().strip("'\"")
            m_cs = re.search(r"closed_session:\s*'?([^'\n]+)'?", block)
            if m_cs:
                entry["closed_session"] = m_cs.group(1).strip()
            if entry.get("id"):
                last_closed = entry
    except Exception:
        pass
    metrics: dict = {}
    try:
        mp = Path(__file__).parent / "lab" / "chains" / "metrics.json"
        if mp.exists():
            raw = json.loads(mp.read_text(encoding="utf-8"))
            elo = raw.get("elo", {})
            dr = raw.get("draw_rate", {})
            kaizen = raw.get("kaizen", {})
            metrics = {
                "elo_teacher": elo.get("teacher_uci"),
                "elo_heuristic": elo.get("heuristic"),
                "elo_neural": elo.get("neural"),
                "draw_rate_pct": dr.get("pct"),
                "draw_rate_warn": dr.get("status") == "WARN",
                "kaizen_pct_closed": kaizen.get("pct_closed"),
                "kaizen_by_lane": kaizen.get("by_lane", {}),
                "velocity": None,
            }
            phi_path = Path(__file__).parent / "lab" / "chains" / "phi_history.jsonl"
            if phi_path.exists():
                lines = [l for l in phi_path.read_text(encoding="utf-8").splitlines() if l.strip()]
                if lines:
                    last_phi = json.loads(lines[-1])
                    metrics["velocity"] = last_phi.get("velocity")
    except Exception:
        pass
    return {
        "lanes": lanes,
        "sprint": sprint,
        "open_count": open_count,
        "last_closed_imp": last_closed,
        "humangate_pending": hg_pending,
        "metrics": metrics,
    }


# ── HTML UI ──────────────────────────────────────────────────────────────────
HTML = r"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TCS Autopilote</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Geist+Mono:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/static/xterm.min.css">
<script src="/static/xterm.min.js"></script>
<style>
:root {
  --bg:       #0b0c0e;
  --bg2:      #111318;
  --bg3:      #181c23;
  --bg4:      #1e2330;
  --border:   #252c3a;
  --border2:  #2e374d;
  --text:     #d4dff0;
  --text2:    #6e84a8;
  --text3:    #3d4f6a;
  --amber:    #f0a030;
  --amber2:   #c07a10;
  --amber-bg: #1a1205;
  --green:    #22d47a;
  --green-bg: #091a10;
  --red:      #e85050;
  --red-bg:   #1a0808;
  --blue:     #4a8fff;
  --blue-bg:  #081428;
  --purple:   #9470ff;
  --purple-bg:#110a28;
  --font-d:   'Syne', sans-serif;
  --font-m:   'Geist Mono', monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:var(--bg);color:var(--text);font-family:var(--font-m);font-size:13px;overflow:hidden}

/* GRAIN OVERLAY */
body::before{content:'';position:fixed;inset:0;pointer-events:none;z-index:999;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  opacity:.4}

/* LAYOUT */
.shell{display:flex;height:100vh}
.rail{width:56px;flex-shrink:0;background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;align-items:center;padding:16px 0;gap:4px}
.sidebar{width:200px;flex-shrink:0;background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.topbar{height:44px;flex-shrink:0;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:16px}
.content{flex:1;overflow-y:auto;padding:20px 24px}

/* RAIL NAV */
.rail-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;color:var(--text3);transition:all .15s;border:1px solid transparent;position:relative}
.rail-icon:hover{background:var(--bg3);color:var(--text2);border-color:var(--border)}
.rail-icon.active{background:var(--amber-bg);color:var(--amber);border-color:var(--amber2)}
.rail-sep{width:24px;height:1px;background:var(--border);margin:6px 0}
.rail-tip{position:absolute;left:44px;background:var(--bg4);border:1px solid var(--border2);padding:4px 10px;border-radius:4px;white-space:nowrap;font-size:11px;color:var(--text);pointer-events:none;opacity:0;transition:opacity .15s;z-index:100}
.rail-icon:hover .rail-tip{opacity:1}

/* SIDEBAR */
.sb-header{padding:16px 14px 10px;border-bottom:1px solid var(--border)}
.sb-title{font-family:var(--font-d);font-size:15px;font-weight:800;color:var(--text);letter-spacing:.02em}
.sb-sub{font-size:10px;color:var(--text3);margin-top:2px}
.sb-section{padding:10px 14px 4px;font-size:9px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.12em}
.sb-item{display:flex;align-items:center;gap:8px;padding:6px 14px;cursor:pointer;color:var(--text2);transition:all .12s;font-size:12px;border-left:2px solid transparent}
.sb-item:hover{background:var(--bg3);color:var(--text)}
.sb-item.active{background:var(--bg3);color:var(--text);border-left-color:var(--amber)}
.sb-item .ico{font-size:13px;width:16px;text-align:center}
.sb-badge{margin-left:auto;font-size:9px;padding:1px 5px;border-radius:3px;font-weight:600}
.badge-red{background:var(--red-bg);color:var(--red)}
.badge-amber{background:var(--amber-bg);color:var(--amber)}
.badge-green{background:var(--green-bg);color:var(--green)}
.sb-footer{margin-top:auto;padding:12px 14px;border-top:1px solid var(--border)}
.gate-row{display:flex;align-items:center;gap:6px;margin-top:6px}
.gate-dot{width:6px;height:6px;border-radius:50%}
.gate-dot.on{background:var(--green);box-shadow:0 0 6px var(--green);animation:pulse 2s infinite}
.gate-dot.off{background:var(--red)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

/* TOPBAR */
.tb-logo{font-family:var(--font-d);font-size:13px;font-weight:700;color:var(--amber);letter-spacing:.08em;text-transform:uppercase}
.tb-sep{width:1px;height:20px;background:var(--border)}
.tb-stat{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text3)}
.tb-stat .val{color:var(--text2)}
.tb-right{margin-left:auto;display:flex;align-items:center;gap:10px}
.tb-lm{display:flex;align-items:center;gap:6px;font-size:11px;padding:4px 10px;border-radius:4px;border:1px solid var(--border);background:var(--bg3)}
.tb-lm.online{border-color:var(--green);color:var(--green)}
.tb-lm.offline{border-color:var(--red);color:var(--red)}
.tb-time{font-size:11px;color:var(--text3)}
.tb-hg-badge{display:none;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--red);background:var(--red-bg);border:1px solid var(--red);padding:3px 9px;border-radius:4px;animation:pulse 2s infinite}
.tb-prop-badge{display:none;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--amber);background:rgba(240,160,48,.15);border:1px solid var(--amber);padding:3px 9px;border-radius:4px;cursor:pointer}
#tcs-toast{position:fixed;bottom:24px;right:24px;background:var(--bg2);border:1px solid var(--green);color:var(--green);padding:8px 16px;border-radius:6px;font-size:12px;font-weight:600;z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none}
#tcs-toast.show{opacity:1}

/* PAGES */
.page{display:none}.page.active{display:block}

/* CARDS */
.card{background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:16px;margin-bottom:12px}
.card-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.card-title{font-family:var(--font-d);font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.1em}

/* STAT BLOCKS */
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
.stat-blk{background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:14px 16px;position:relative;overflow:hidden}
.stat-blk::after{content:'';position:absolute;top:0;left:0;right:0;height:2px}
.stat-blk.amber::after{background:var(--amber)}
.stat-blk.green::after{background:var(--green)}
.stat-blk.red::after{background:var(--red)}
.stat-blk.blue::after{background:var(--blue)}
.stat-lbl{font-size:9px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}
.stat-val{font-family:var(--font-d);font-size:28px;font-weight:800;color:var(--text);line-height:1}
.stat-sub{font-size:10px;color:var(--text3);margin-top:5px}

/* PILLS */
.pill{display:inline-block;padding:1px 7px;border-radius:3px;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.p-impl{background:var(--green-bg);color:var(--green)}
.p-done{background:var(--green-bg);color:var(--green)}
.p-blocked{background:var(--red-bg);color:var(--red)}
.p-broken{background:var(--red-bg);color:var(--red)}
.p-progress{background:var(--blue-bg);color:var(--blue)}
.p-doc{background:var(--amber-bg);color:var(--amber)}
.p-todo{background:var(--bg3);color:var(--text3)}
.p-safe{background:var(--green-bg);color:var(--green)}
.p-audit{background:var(--amber-bg);color:var(--amber)}
.p-human{background:var(--purple-bg);color:var(--purple)}
.p-forbidden{background:var(--red-bg);color:var(--red)}
.p-high{background:var(--red-bg);color:var(--red)}
.p-med{background:var(--amber-bg);color:var(--amber)}
.p-low{background:var(--bg3);color:var(--text3)}
.p-studio{background:var(--purple-bg);color:var(--purple)}
.p-ia{background:var(--green-bg);color:var(--green)}
.p-jv{background:42170a;color:#f07040}

/* TABLES */
table{width:100%;border-collapse:collapse;font-size:12px}
th{text-align:left;padding:6px 10px;color:var(--text3);font-size:9px;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid var(--border);font-weight:600}
td{padding:7px 10px;border-bottom:1px solid var(--border);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:var(--bg3)}

/* BUTTONS */
.btn{padding:6px 14px;border:1px solid var(--border2);border-radius:4px;background:var(--bg3);color:var(--text2);cursor:pointer;font-size:12px;font-family:var(--font-m);transition:all .12s;display:inline-flex;align-items:center;gap:6px}
.btn:hover{background:var(--bg4);color:var(--text);border-color:var(--border2)}
.btn:active{transform:scale(.98)}
.btn-amber{background:var(--amber-bg);color:var(--amber);border-color:var(--amber2)}
.btn-amber:hover{background:#251a00;color:var(--amber)}
.btn-green{background:var(--green-bg);color:var(--green);border-color:#0a3018}
.btn-green:hover{background:#0a2518;color:var(--green)}
.btn-red{background:var(--red-bg);color:var(--red);border-color:#3a1010}
.btn-sm{padding:3px 9px;font-size:11px}

/* CHAIN CARDS */
.chain-card{background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;transition:border-color .15s}
.chain-card:hover{border-color:var(--border2)}
.chain-card.running{border-color:var(--amber);background:var(--amber-bg)}
.chain-card.done{border-color:var(--green)}
.chain-card.error{border-color:var(--red)}
.chain-name{font-family:var(--font-d);font-size:13px;font-weight:600;color:var(--text);flex:1}
.chain-cmd{font-size:10px;color:var(--text3);margin-top:2px}
.chain-status{font-size:10px;font-weight:600}
.chain-status.running{color:var(--amber);animation:blink 1s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.5}}
.chain-status.done{color:var(--green)}
.chain-status.error{color:var(--red)}
.chain-status.idle{color:var(--text3)}

/* LOG TERMINAL */
.terminal{background:#060708;border:1px solid var(--border);border-radius:6px;padding:12px 14px;font-family:var(--font-m);font-size:11px;line-height:1.8;height:300px;overflow-y:auto;color:#7aff8a}
.terminal .ts{color:var(--text3)}
.terminal .cmd-line{color:var(--amber)}
.terminal .err-line{color:var(--red)}
.terminal .ok-line{color:var(--green)}
/* AUTOLOOP TERMINAL (IMP-061) */
.autoloop-terminal{background:var(--bg);font-family:var(--font-m);font-size:10px;max-height:150px;overflow-y:auto;padding:6px;border:1px solid var(--border);border-radius:4px;margin-top:6px}

/* IDEA CARDS */
.idea-card{background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:12px 14px;margin-bottom:8px;border-left:3px solid;transition:all .15s;cursor:pointer}
.idea-card:hover{background:var(--bg3)}
.idea-card.chain-studio{border-left-color:var(--purple)}
.idea-card.chain-ia{border-left-color:var(--green)}
.idea-card.chain-jv{border-left-color:#f07040}
.idea-title{font-family:var(--font-d);font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px}
.idea-desc{font-size:11px;color:var(--text2);line-height:1.6}
.idea-tags{display:flex;gap:5px;flex-wrap:wrap;margin:5px 0}
.idea-actions{display:flex;gap:6px;margin-top:8px}

/* MEMORY CARDS */
.mem-card{background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:12px 14px;margin-bottom:8px;border-left:3px solid var(--amber)}
.mem-ts{font-size:10px;color:var(--text3);margin-bottom:4px}
.mem-content{font-size:12px;color:var(--text2);line-height:1.6}
.mem-tag{display:inline-block;font-size:9px;padding:1px 6px;border-radius:3px;background:var(--amber-bg);color:var(--amber);margin-right:4px}

/* ROADMAP BLOCK */
.roadmap-out{background:#060708;border:1px solid var(--border);border-radius:6px;padding:14px;font-size:12px;color:var(--green);font-family:var(--font-m);line-height:1.8;min-height:120px;white-space:pre-wrap;word-break:break-word}

/* FORM */
.form-group{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
.form-group label{font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;font-weight:600}
.form-group input,.form-group select,.form-group textarea{background:var(--bg3);border:1px solid var(--border2);border-radius:4px;padding:7px 10px;color:var(--text);font-family:var(--font-m);font-size:12px}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{outline:none;border-color:var(--amber)}
.form-group textarea{min-height:80px;resize:vertical}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* HUMANGATE MODAL */
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:500;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.modal-overlay.open{display:flex}
.modal{background:var(--bg2);border:1px solid var(--amber);border-radius:8px;padding:24px;width:480px;max-width:95vw;box-shadow:0 0 40px rgba(240,160,48,.1)}
.modal-title{font-family:var(--font-d);font-size:16px;font-weight:800;color:var(--amber);margin-bottom:6px}
.modal-sub{font-size:12px;color:var(--text2);margin-bottom:16px}
.modal-cmd{background:#060708;border:1px solid var(--border);border-radius:4px;padding:10px 12px;font-size:12px;color:var(--amber);font-family:var(--font-m);margin-bottom:16px;word-break:break-all}
.modal-actions{display:flex;gap:8px;justify-content:flex-end}

/* SCROLLBAR */
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:var(--bg2)}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

/* FILTER ROW */
.filter-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.filter-btn{padding:4px 10px;border-radius:3px;border:1px solid var(--border);background:transparent;cursor:pointer;font-size:10px;font-family:var(--font-m);color:var(--text3);text-transform:uppercase;letter-spacing:.06em;transition:all .12s}
.filter-btn:hover{border-color:var(--border2);color:var(--text2)}
.filter-btn.active{background:var(--amber-bg);color:var(--amber);border-color:var(--amber2)}

/* SECTION DIVIDER */
.divider{display:flex;align-items:center;gap:10px;margin:16px 0 10px;font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;font-weight:600}
.divider::after{content:'';flex:1;height:1px;background:var(--border)}

/* PROGRESS BAR */
.prog-wrap{background:var(--bg3);border-radius:2px;height:4px;overflow:hidden;margin-top:4px}
.prog-bar{height:100%;border-radius:2px;transition:width .6s ease}

/* TOGGLE */
.toggle{display:flex;align-items:center;gap:8px;cursor:pointer;padding:5px 0}
.toggle-track{width:32px;height:17px;border-radius:9px;background:var(--bg4);border:1px solid var(--border2);position:relative;transition:all .2s;flex-shrink:0}
.toggle-track.on{background:var(--amber-bg);border-color:var(--amber2)}
.toggle-knob{width:11px;height:11px;border-radius:50%;background:var(--text3);position:absolute;top:2px;left:2px;transition:all .2s}
.toggle-track.on .toggle-knob{left:17px;background:var(--amber)}
.toggle-label{font-size:11px;color:var(--text2)}

/* STALENESS BANNER */
.staleness-banner{padding:5px 20px;font-size:11px;color:var(--amber);background:var(--amber-bg);border-bottom:1px solid var(--amber2)}

/* HEALTH DOTS */
.hc-row{display:flex;gap:12px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)}
.hc-item{display:flex;align-items:center;gap:5px}
.hc-dot{width:8px;height:8px;border-radius:50%;background:var(--text3);transition:background .3s}
.hc-dot.ok{background:var(--green)}
.hc-dot.ko{background:var(--red)}

/* METRICS / DATASET PAGES */
.elo-row{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
.elo-agent{background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:12px 16px;min-width:130px}
.elo-name{font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px}
.elo-val{font-family:var(--font-d);font-size:26px;font-weight:800}
.draw-bar-wrap{background:var(--bg3);border-radius:4px;height:12px;overflow:hidden;margin:8px 0}
.draw-bar{height:100%;border-radius:4px;transition:width .6s ease}
.arch-badge{font-size:18px}
.forbidden-doc{background:var(--red-bg);border:1px solid var(--red);border-radius:6px;padding:14px;margin-top:12px}

/* SESSION CTX */
.sess-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.sess-lbl{font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px}
.sess-val{font-size:12px;color:var(--text2);line-height:1.5}

/* FORBIDDEN MODAL */
.modal.forbidden{border-color:var(--red)}
.modal.forbidden .modal-title{color:var(--red)}
.modal.forbidden .modal-cmd{border-color:var(--red);color:var(--red)}

/* CLAUDE MODE TOGGLE */
.tb-claude-toggle{padding:3px 10px;border-radius:4px;border:1px solid var(--border2);background:var(--bg3);color:var(--text3);cursor:pointer;font-size:10px;font-family:var(--font-m);font-weight:600;letter-spacing:.06em;text-transform:uppercase;transition:all .2s}
.tb-claude-toggle:hover{border-color:var(--border2);color:var(--text2)}
.tb-claude-toggle.claude-on{background:var(--blue-bg);color:var(--blue);border-color:var(--blue)}
.cm-steps{display:flex;gap:16px;margin-bottom:10px;flex-wrap:wrap}
.cm-step{font-size:11px;color:var(--text3);transition:color .2s}
.cm-step.active{color:var(--amber)}
.cm-step.done{color:var(--green)}

/* AGENT CARDS */
.agent-card{background:var(--bg2);border:1px solid var(--border);border-radius:6px;margin-bottom:10px;overflow:hidden;transition:border-color .15s}
.agent-card:hover{border-color:var(--border2)}
.agent-card-header{display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer;user-select:none}
.agent-card-header:hover{background:var(--bg3)}
.agent-elo-bar-wrap{background:var(--bg3);border-radius:3px;height:6px;overflow:hidden;flex:1;min-width:60px}
.agent-elo-bar{height:100%;border-radius:3px;transition:width .6s ease}
.agent-body{display:none;padding:12px 16px;border-top:1px solid var(--border)}
.agent-body.open{display:block}
.agent-new{border:1px dashed var(--border2)!important;cursor:pointer;background:transparent!important}
.agent-new:hover{border-color:var(--amber2)!important;background:var(--amber-bg)!important}

/* LIGUE */
.ligue-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.ligue-col{background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:14px}
.ligue-col-title{font-family:var(--font-d);font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)}
.division-card{border:1px solid var(--border);border-left-width:3px;border-radius:4px;padding:8px 10px;margin-bottom:8px}
.div-alpha{border-left-color:var(--amber)}
.div-beta{border-left-color:var(--blue)}
.div-gamma{border-left-color:var(--text3)}
.bracket-match{display:flex;align-items:center;justify-content:space-between;padding:5px 8px;border-radius:4px;margin-bottom:4px;font-size:11px}
.match-done{background:var(--green-bg);color:var(--green)}
.match-next{background:var(--amber-bg);border:1px solid var(--amber2);color:var(--amber)}
.match-planned{background:var(--bg3);color:var(--text3)}
.rule-item{display:flex;gap:8px;margin-bottom:6px;font-size:11px;color:var(--text2);line-height:1.5}
.rule-num{color:var(--amber);font-weight:700;flex-shrink:0}

/* LANE CARDS (autoloop multi-lane) */
.lane-card{background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:10px 12px}
.lane-card-title{font-family:var(--font-d);font-size:11px;font-weight:700;color:var(--text2);margin-bottom:5px}

/* IDEA PIPELINE */
.pipeline-steps{display:flex;gap:6px;margin:12px 0;flex-wrap:wrap}
.pipe-step{padding:4px 10px;border-radius:3px;border:1px solid var(--border);font-size:10px;color:var(--text3);font-family:var(--font-m);transition:all .3s}
.pipe-step.active{background:var(--amber-bg);color:var(--amber);border-color:var(--amber2)}
.pipe-step.done{background:var(--green-bg);color:var(--green);border-color:#0a3018}
.imp-list-item{display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--border);border-radius:4px;margin-bottom:6px;background:var(--bg3)}
.imp-list-item input[type=checkbox]{accent-color:var(--amber);width:14px;height:14px;flex-shrink:0}
.imp-list-title{flex:1;font-size:12px;color:var(--text)}

/* ROADMAP GAMES */
.game-row{background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:14px 16px;margin-bottom:10px}
.game-title{font-family:var(--font-d);font-size:14px;font-weight:700;color:var(--text);margin-bottom:10px}
.game-tracks{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.track-card{background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:10px 12px}
.track-label{font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px;font-weight:600}
</style>
</head>
<body>
<div class="shell">

<!-- SIDEBAR -->
<nav class="sidebar">
  <div class="sb-header">
    <div class="sb-title">AUTOPILOTE</div>
    <div class="sb-sub">Tactical Chess Studio</div>
  </div>

  <div class="sb-section">Vue</div>
  <div class="sb-item" onclick="nav('vision')"><span class="ico">◈</span> Vision <span class="sb-badge badge-amber" id="badge-hg-vision" style="display:none">!</span></div>
  <div class="sb-item active" onclick="nav('pilote')"><span class="ico">⬡</span> Pilote <span class="sb-badge badge-amber" id="badge-actions">0</span></div>
  <div class="sb-item" onclick="nav('chains')"><span class="ico">⛓</span> Chaînes</div>
  <div class="sb-item" onclick="nav('logs')"><span class="ico">▶</span> Logs</div>

  <div class="sb-section">Studio</div>
  <div class="sb-item" onclick="nav('memory')"><span class="ico">◈</span> Mémoire</div>
  <div class="sb-item" onclick="nav('ideas')"><span class="ico">◎</span> Idées <span class="sb-badge badge-amber" id="badge-ideas">12</span></div>
  <div class="sb-item" onclick="nav('map')"><span class="ico">◉</span> Chain Map</div>
  <div class="sb-item" onclick="nav('roadmap-domaine')"><span class="ico">🗂</span> Roadmap domaines</div>

  <div class="sb-item" onclick="nav('metrics')"><span class="ico">📊</span> Métriques</div>
  <div class="sb-item" onclick="nav('dataset')"><span class="ico">🧠</span> Dataset & IA</div>

  <div class="sb-section">IA Joueur</div>
  <div class="sb-item" onclick="nav('agents')"><span class="ico">🤖</span> Agents</div>
  <div class="sb-item" onclick="nav('ligue')"><span class="ico">🏆</span> Ligue</div>
  <div class="sb-item" onclick="nav('roadmap-domaine')"><span class="ico">🗺</span> Roadmap IA</div>

  <div class="sb-section">Création JV</div>
  <div class="sb-item" onclick="nav('moteur')"><span class="ico">💻</span> Moteur &amp; code</div>
  <div class="sb-item" onclick="nav('design')"><span class="ico">🎨</span> Design &amp; assets</div>
  <div class="sb-item" onclick="nav('roadmap-jeux')"><span class="ico">🗾</span> Roadmap jeux</div>

  <div class="sb-section">Config</div>
  <div class="sb-item" onclick="nav('config')"><span class="ico">⚙</span> Config</div>
  <div class="sb-item" onclick="nav('studio-os')"><span class="ico">⬡</span> Studio OS</div>
  <div class="sb-item" onclick="nav('workflow')"><span class="ico">⬡</span> Workflow IMP</div>

  <div class="sb-footer">
    <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.1em">HumanGate</div>
    <div class="gate-row">
      <div class="gate-dot on" id="gate-dot"></div>
      <span style="font-size:11px;color:var(--text2)" id="gate-label">Autorité active</span>
    </div>
    <div style="margin-top:6px;font-size:9px;color:var(--text3)">claim_verdict: NO_CLAIM_ALLOWED</div>
    <div style="margin-top:8px">
      <div class="toggle" onclick="toggleAutoMode()">
        <div class="toggle-track" id="auto-track"><div class="toggle-knob"></div></div>
        <span class="toggle-label" id="auto-label">Mode manuel</span>
      </div>
    </div>
    <div class="hc-row">
      <div class="hc-item">
        <div class="hc-dot" id="hc-venv"></div>
        <span style="font-size:10px;color:var(--text3)">venv312</span>
      </div>
      <div class="hc-item">
        <div class="hc-dot" id="hc-lm"></div>
        <span style="font-size:10px;color:var(--text3)">LM Studio</span>
      </div>
    </div>
  </div>
</nav>

<!-- MAIN -->
<div class="main">
  <!-- TOPBAR -->
  <div class="topbar">
    <span class="tb-logo">TCS //</span>
    <div class="tb-sep"></div>
    <div class="tb-stat">Repo <span class="val" id="tb-repo">C:\TACTICAL_CHESS_STUDIO</span></div>
    <div class="tb-sep"></div>
    <div class="tb-stat">Sprint <span class="val" id="tb-sprint">—</span></div>
    <div class="tb-sep"></div>
    <div class="tb-stat">Ledger <span class="val" id="tb-ledger">--/--</span></div>
    <div class="tb-sep"></div>
    <div class="tb-stat">Tokens <span class="val" id="tb-tokens">0</span></div>
    <div class="tb-right">
      <div class="tb-prop-badge" id="tb-prop-badge" onclick="nav('ideas')" title="Proposals en attente d\'approbation HumanGate">◈ Proposals</div>
      <div class="tb-hg-badge" id="tb-hg-badge" onclick="nav('sos')" style="cursor:pointer">⚠ HumanGate</div>
      <div id="tb-dedup-badge" style="display:none;align-items:center;gap:4px;font-size:11px;font-weight:600;color:var(--amber);background:rgba(240,160,48,.12);border:1px solid var(--amber);padding:3px 9px;border-radius:4px;" title="IMPs exclus par déduplication cette session">⊘ <span id="tb-dedup-count">0</span> dédup</div>
      <div class="tb-lm offline" id="lm-indicator">
        <span id="lm-dot">○</span>
        <span id="lm-text">LM Studio</span>
      </div>
      <div class="tb-time" id="clock"></div>
    </div>
  </div>

  <!-- STALENESS BANNER -->
  <div class="staleness-banner" id="staleness-banner" style="display:none">
    <span id="staleness-text">⚠ Docs non mises à jour</span>
  </div>

  <!-- CONTENT -->
  <div class="content">

    <!-- ── VISION (IMP-B1) ── -->
    <div id="page-vision" class="page">
      <div class="divider">Vision du projet</div>
      <div style="text-align:center;padding:20px 0 6px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--text3)">UN JEU OÙ DES IAS JOUENT ET APPRENNENT</div>
      <div id="vision-lanes" style="display:flex;flex-direction:column;gap:8px;max-width:640px;margin:16px auto 0;padding:0 16px"></div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;max-width:640px;margin:16px auto 0;padding:0 16px">
        <div class="stat-blk" style="flex:1;min-width:180px">
          <div class="stat-lbl">Sprint actuel</div>
          <div class="stat-val" style="font-size:12px;font-weight:600;line-height:1.4" id="vision-sprint">—</div>
        </div>
        <div class="stat-blk" style="flex:1;min-width:180px">
          <div class="stat-lbl">Dernier IMP fermé</div>
          <div class="stat-val" style="font-size:12px" id="vision-last-imp">—</div>
          <div class="stat-sub" id="vision-imp-age"></div>
        </div>
        <div class="stat-blk amber" id="vision-hg-blk" style="flex:0 0 auto;display:none">
          <div class="stat-lbl">HumanGate</div>
          <div class="stat-val" style="font-size:12px">EN ATTENTE</div>
        </div>
      </div>
      <!-- IMP-C2 : métriques -->
      <div style="display:flex;flex-wrap:wrap;gap:12px;max-width:640px;margin:10px auto 0;padding:0 16px">
        <div class="stat-blk" style="flex:1;min-width:140px">
          <div class="stat-lbl">ELO Rocky</div>
          <div class="stat-val" id="vision-elo-teacher">—</div>
          <div class="stat-sub" id="vision-elo-sub">Heuristique — · Neural —</div>
        </div>
        <div class="stat-blk" id="vision-draw-blk" style="flex:1;min-width:140px">
          <div class="stat-lbl">Draw rate <span id="vision-draw-badge" style="display:none;background:#e57c00;color:#fff;font-size:9px;padding:1px 5px;border-radius:3px;margin-left:4px">WARN</span></div>
          <div class="stat-val" id="vision-draw-rate">—</div>
          <div class="stat-sub">seuil &lt; 20%</div>
        </div>
        <div class="stat-blk" style="flex:1;min-width:140px">
          <div class="stat-lbl">Velocity</div>
          <div class="stat-val" id="vision-velocity">—</div>
          <div class="stat-sub">IMP/session · <span id="vision-kaizen-pct">—</span>% fermés</div>
        </div>
        <div class="stat-blk" style="flex:1;min-width:180px">
          <div class="stat-lbl">IMPs par lane</div>
          <div id="vision-by-lane" style="font-size:10px;color:var(--text2);margin-top:4px;line-height:1.7">—</div>
        </div>
      </div>
    </div>

    <!-- ── PILOTE ── -->
    <div id="page-pilote" class="page active">
      <div class="stats-row">
        <div class="stat-blk amber">
          <div class="stat-lbl">Prochaine action</div>
          <div class="stat-val" style="font-size:18px;padding-top:4px" id="next-action">—</div>
          <div class="stat-sub" id="next-lane">Lancer un audit pour proposer</div>
          <button class="btn btn-amber btn-sm" style="margin-top:6px;font-size:10px" onclick="openImpInWorkflow(document.getElementById('next-action').textContent)">&#8599; Workflow IMP</button>
        </div>
        <div class="stat-blk red">
          <div class="stat-lbl">Issues HIGH</div>
          <div class="stat-val" id="pilote-issues-count">3</div>
          <div class="stat-sub" id="pilote-issues-labels">NEW-02 · NEW-03 · NEW-05</div>
        </div>
        <div class="stat-blk green">
          <div class="stat-lbl">ELO teacher_uci</div>
          <div class="stat-val" id="pilote-elo-teacher">—</div>
          <div class="stat-sub" id="pilote-elo-sub">Neural : — · Draw rate —</div>
        </div>
        <div class="stat-blk blue">
          <div class="stat-lbl">Mémoire studio</div>
          <div class="stat-val" id="mem-count">0</div>
          <div class="stat-sub">fusions capturées</div>
        </div>
      </div>

      <div class="divider">Fusion IA</div>
      <div class="card" style="padding:10px 14px">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <button class="btn btn-amber" id="btn-fusion" onclick="launchFusion()">⬡ Fusion</button>
          <span style="font-size:10px;color:var(--text3)">IDEAS×LEDGER · ROI_CASCADE · REDTEAM · Devstral local</span>
        </div>
        <div id="fusion-out" style="display:none;margin-top:10px" class="roadmap-out"></div>
      </div>

      <div class="divider">CEO Brief</div>
      <div class="card" style="padding:10px 14px" id="ceo-brief-card">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <button class="btn btn-amber" onclick="loadCeoBrief()" title="Qwen2.5-14B - CEO Brief (~3s)">⬡ CEO Brief (LM)</button>
          <button class="btn btn-sm" onclick="loadCeoTriage()">🗂 Triage statique</button>
          <span style="font-size:10px;color:var(--text3)">claim_verdict: NO_CLAIM_ALLOWED</span>
        </div>
        <div id="ceo-triage-out" style="display:none;margin-top:10px"></div>
        <div id="ceo-brief-out" style="display:none;margin-top:10px"></div>
      </div>

      <div class="divider">Où j'en étais</div>
      <div class="card" id="session-ctx-card">
        <div style="font-size:12px;color:var(--text3)">Chargement session précédente...</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <div class="divider">Actions rapides HumanGate</div>
          <div class="card" style="padding:10px">
            <div id="quick-actions">
              <div class="chain-card" onclick="triggerChain('recall')">
                <div><div class="chain-name">① Recall</div><div class="chain-cmd">kaizen_loop.py recall</div></div>
                <span class="pill p-safe">SAFE_AUTO</span>
                <div class="chain-status idle" id="st-recall">idle</div>
              </div>
              <div class="chain-card" onclick="triggerChain('audit')">
                <div><div class="chain-name">② Audit hygiène</div><div class="chain-cmd">doc_hygiene_chain.py --audit</div></div>
                <span class="pill p-safe">SAFE_AUTO</span>
                <div class="chain-status idle" id="st-audit">idle</div>
              </div>
              <div class="chain-card" onclick="triggerChain('propose')">
                <div><div class="chain-name">③ Propose</div><div class="chain-cmd">kaizen_loop.py propose</div></div>
                <span class="pill p-safe">SAFE_AUTO</span>
                <div class="chain-status idle" id="st-propose">idle</div>
              </div>
              <div class="chain-card" onclick="confirmChain('smoke')">
                <div><div class="chain-name">④ Smoke benchmark</div><div class="chain-cmd">run_benchmark.ps1 -Smoke</div></div>
                <span class="pill p-audit">AUDIT_REQUIRED</span>
                <div class="chain-status idle" id="st-smoke">idle</div>
              </div>
              <div class="chain-card" onclick="confirmChain('coach')">
                <div><div class="chain-name">⑤ Coach Rocky</div><div class="chain-cmd">simulate_chess960 518 3</div></div>
                <span class="pill p-audit">AUDIT_REQUIRED</span>
                <div class="chain-status idle" id="st-coach">idle</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="divider" id="pilote-repo-divider">État repo</div>
          <div class="card">
            <table>
              <thead><tr><th>Surface</th><th>Statut</th></tr></thead>
              <tbody id="pilote-surfaces-body">
                <tr><td>Moteur Rust</td><td><span class="pill p-impl">IMPLEMENTED</span></td></tr>
                <tr><td>NeuralAgent câblé</td><td><span class="pill p-done">DONE c0ebf62</span></td></tr>
                <tr><td>Coach v0 (LLM)</td><td><span class="pill p-done">DONE fd88b97</span></td></tr>
                <tr><td>EvaluationSystem</td><td><span class="pill p-done">DONE T2-T6</span></td></tr>
                <tr><td>Dataset actif</td><td><span class="pill p-broken">BROKEN NEW-03</span></td></tr>
                <tr><td>Chess 960</td><td><span class="pill p-blocked">BLOCKED HG</span></td></tr>
                <tr><td>CI/PR/push</td><td><span class="pill p-blocked">BLOCKED money/CI</span></td></tr>
                <tr><td>LoRA</td><td><span class="pill p-todo">NOT_STARTED</span></td></tr>
              </tbody>
            </table>
          </div>

          <div class="divider">Demander à l'IA</div>
          <div class="card">
            <div class="form-group">
              <label>Question (analyse, audit, brainstorm)</label>
              <textarea id="lm-quick-input" placeholder="ex: Analyse l'issue NEW-02 et propose 3 approches pour le draw structurel..."></textarea>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <button class="btn btn-amber" id="ai-send-btn" onclick="aiSend()">⚡ Envoyer</button>
              <span id="lm-quick-status" style="font-size:11px;color:var(--text3)"></span>
            </div>
            <div id="lm-quick-out" style="display:none;margin-top:10px" class="roadmap-out"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── CHAÎNES ── -->
    <div id="page-chains" class="page">
      <div class="divider">Boucle Kaizen</div>
      <div class="card" style="padding:12px 14px" id="autoloop-card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
          <span style="font-size:10px;color:var(--text3)">dry_run=true · HumanGate requis pour exécution réelle</span>
          <button class="btn btn-sm" id="btn-pause-autoloop" onclick="toggleAutoloopPause()" style="margin-left:auto" title="Pause le refresh des terminaux">&#9646;&#9646; Pause</button>
          <button class="btn btn-sm" onclick="copierCharter()" title="Copie le dernier charter généré dans le presse-papier">&#128203; Copier charter</button>
          <button class="btn btn-sm" onclick="autoloopStopAll()">&#9632; Stop tout</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
          <div class="lane-card">
            <div class="lane-card-title">&#x1F3F0; Rocky / Moteur</div>
            <div id="al-state-rocky_moteur" class="chain-status idle">idle</div>
            <div id="al-last-rocky_moteur" style="font-size:10px;color:var(--text3);margin-top:3px"></div>
            <label style="font-size:9px;color:var(--text3);margin-top:5px;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="drcheck-rocky_moteur" style="accent-color:var(--amber)"> Exécution réelle <span style="color:var(--red)">(désactive dry_run — HumanGate)</span></label>
            <div style="display:flex;gap:6px;margin-top:6px">
              <button class="btn btn-green btn-sm" id="btn-start-rocky_moteur" onclick="autoloopStart('rocky_moteur')" title="Qwen2.5-14B - autoloop lane">&#9654; Start</button>
              <button class="btn btn-sm" id="btn-stop-rocky_moteur" style="display:none" onclick="autoloopStop('rocky_moteur')">&#9632; Stop</button>
              <button class="btn btn-sm" style="margin-left:auto" onclick="nav('workflow')">&#8599; Workflow</button>
            </div>
            <div class="autoloop-terminal" id="terminal-rocky_moteur"></div>
          </div>
          <div class="lane-card">
            <div class="lane-card-title">&#x1F9E0; IA / Apprentissage</div>
            <div id="al-state-ia_apprentissage" class="chain-status idle">idle</div>
            <div id="al-last-ia_apprentissage" style="font-size:10px;color:var(--text3);margin-top:3px"></div>
            <label style="font-size:9px;color:var(--text3);margin-top:5px;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="drcheck-ia_apprentissage" style="accent-color:var(--amber)"> Exécution réelle <span style="color:var(--red)">(désactive dry_run — HumanGate)</span></label>
            <div style="display:flex;gap:6px;margin-top:6px">
              <button class="btn btn-green btn-sm" id="btn-start-ia_apprentissage" onclick="autoloopStart('ia_apprentissage')" title="Qwen2.5-14B - autoloop lane">&#9654; Start</button>
              <button class="btn btn-sm" id="btn-stop-ia_apprentissage" style="display:none" onclick="autoloopStop('ia_apprentissage')">&#9632; Stop</button>
              <button class="btn btn-sm" style="margin-left:auto" onclick="nav('workflow')">&#8599; Workflow</button>
            </div>
            <div class="autoloop-terminal" id="terminal-ia_apprentissage"></div>
          </div>
          <div class="lane-card">
            <div class="lane-card-title">&#x2696; D&eacute;cisions pendantes</div>
            <div id="al-state-decisions_pendantes" class="chain-status idle">idle</div>
            <div id="al-last-decisions_pendantes" style="font-size:10px;color:var(--text3);margin-top:3px"></div>
            <label style="font-size:9px;color:var(--text3);margin-top:5px;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="drcheck-decisions_pendantes" style="accent-color:var(--amber)"> Exécution réelle <span style="color:var(--red)">(désactive dry_run — HumanGate)</span></label>
            <div style="display:flex;gap:6px;margin-top:6px">
              <button class="btn btn-green btn-sm" id="btn-start-decisions_pendantes" onclick="autoloopStart('decisions_pendantes')" title="Qwen2.5-14B - autoloop lane">&#9654; Start</button>
              <button class="btn btn-sm" id="btn-stop-decisions_pendantes" style="display:none" onclick="autoloopStop('decisions_pendantes')">&#9632; Stop</button>
              <button class="btn btn-sm" style="margin-left:auto" onclick="nav('workflow')">&#8599; Workflow</button>
            </div>
            <div class="autoloop-terminal" id="terminal-decisions_pendantes"></div>
          </div>
        </div>
      </div>

      <div class="divider">Chaînes disponibles</div>
      <div id="chains-list"></div>

      <div class="divider">Séquence Kaizen complète</div>
      <div class="card">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <button class="btn btn-amber" onclick="runKaizenSequence()">▶ Lancer séquence recall → audit → propose</button>
          <button class="btn" onclick="triggerChain('metrics')">metrics</button>
          <button class="btn" onclick="triggerChain('tests')">cargo tests</button>
        </div>
        <div style="font-size:11px;color:var(--text3)">recall → audit → propose → <span style="color:var(--amber)">HumanGate</span> → execute → re-audit → close → metrics</div>
      </div>
    </div>

    <!-- ── LOGS ── -->
    <div id="page-logs" class="page">
      <div class="divider">Devstral — Contrôle</div>
      <div class="card" style="padding:12px 14px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px">
          <div id="ds-session-line" style="font-size:12px;color:var(--text2)">Chargement...</div>
          <div id="ds-task-badge" style="display:none">
            <span class="pill p-audit" id="ds-task-pill">⟳ Tâche en cours</span>
          </div>
          <button class="btn btn-sm" onclick="loadDevstralStatus()" style="margin-left:auto">↻ Rafraîchir</button>
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr><th>Heure</th><th>Type</th><th>Tokens</th><th>Durée</th><th>Aperçu prompt</th></tr>
            </thead>
            <tbody id="ds-history-body">
              <tr><td colspan="5" style="color:var(--text3);text-align:center;padding:12px">Aucun appel enregistré</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="divider">Terminal — sorties en temps réel</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <button class="btn" onclick="refreshLogs()">↻ Rafraîchir</button>
        <button class="btn btn-red btn-sm" onclick="clearLogs()">✕ Vider</button>
        <div class="toggle" onclick="toggleAutoRefresh()" style="margin-left:auto">
          <div class="toggle-track on" id="autorefresh-track"><div class="toggle-knob" style="left:17px;background:var(--amber)"></div></div>
          <span class="toggle-label">Auto-refresh 3s</span>
        </div>
      </div>
      <div class="terminal" id="terminal-out">Aucune sortie — lance une chaîne pour voir les logs ici.</div>
    </div>

    <!-- ── MÉMOIRE ── -->
    <div id="page-memory" class="page">
      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
        <button class="btn btn-amber" onclick="showMemModal()">+ Capturer une fusion</button>
        <button class="btn" onclick="exportMemory()">↓ Exporter STUDIO_MEMORY.md</button>
        <button class="btn btn-amber" onclick="lmSynthesizeMemory()" title="Qwen2.5-14B - ~3s">⚡ LM Studio — synthèse corpus</button>
        <button class="btn" onclick="renderMemory()">↻ Rafraîchir</button>
      </div>

      <div class="divider">Fusions capturées</div>
      <div id="mem-list">
        <div style="font-size:12px;color:var(--text3);padding:20px 0">Chargement...</div>
      </div>

      <div class="divider">Décisions HumanGate</div>
      <div id="decisions-list">
        <div style="font-size:12px;color:var(--text3);padding:10px 0">Chargement...</div>
      </div>

      <div class="divider">Dataset studio</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
        <div class="stat-blk green"><div class="stat-lbl">Golden examples</div><div class="stat-val" id="ds-golden">—</div></div>
        <div class="stat-blk blue"><div class="stat-lbl">UX runs</div><div class="stat-val" id="ds-ux-runs">—</div></div>
        <div class="stat-blk amber"><div class="stat-lbl">Finetune examples</div><div class="stat-val" id="ds-finetune">—</div></div>
      </div>

      <div class="divider">Dernières chaînes</div>
      <div id="mem-chains-list">
        <div style="font-size:12px;color:var(--text3);padding:10px 0">Chargement...</div>
      </div>
    </div>

    <!-- ── IDÉES ── -->
    <div id="page-ideas" class="page">
      <div style="display:flex;gap:10px;margin-bottom:14px">
        <button class="btn btn-amber" onclick="showIdeaModal()">+ Nouvelle idée</button>
        <button class="btn btn-amber" onclick="lmAnalyzeIdeas()" title="Qwen2.5-14B - analyse backlog">⚡ LM Studio — analyser et prioriser</button>
      </div>
      <div class="filter-row" id="idea-filters">
        <button class="filter-btn active" onclick="filterIdeas('all')">Tout</button>
        <button class="filter-btn" onclick="filterIdeas('studio')">Studio</button>
        <button class="filter-btn" onclick="filterIdeas('ia')">IA Joueur</button>
        <button class="filter-btn" onclick="filterIdeas('jv')">Création JV</button>
        <button class="filter-btn" onclick="filterIdeas('backlog')">Backlog</button>
        <button class="filter-btn" onclick="filterIdeas('wip')">En cours</button>
      </div>
      <details style="margin-bottom:14px">
        <summary style="cursor:pointer;font-size:12px;color:var(--text2);padding:8px 0;user-select:none">⚡ Générer Roadmap — développer une idée via LM Studio</summary>
        <div class="card" style="margin-top:8px">
          <div class="form-row">
            <div class="form-group">
              <label>Titre de l'idée</label>
              <input type="text" id="rm-title" placeholder="ex: Chaîne Red Team + Fusion pour les 3 pipes...">
            </div>
            <div class="form-group">
              <label>Chaîne cible</label>
              <select id="rm-chain">
                <option value="studio">🏢 Studio</option>
                <option value="ia">🎮 IA Joueur</option>
                <option value="jv">🕹 Création JV</option>
                <option value="meta">Meta / Transversal</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Contexte (problème, objectif, contraintes)</label>
            <textarea id="rm-context" placeholder="ex: Les sessions de brainstorming ne sont pas capitalisées. On veut un mode Red Team qui challenge nos décisions et une fusion qui garde les insights utiles, sans accumuler du bruit..."></textarea>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn btn-amber" onclick="generateRoadmap()" title="Générer Roadmap">⚡ Générer via LM Studio</button>
            <button class="btn" onclick="saveRoadmapToMemory()">◈ Sauver en mémoire</button>
            <span id="rm-status" style="font-size:11px;color:var(--text3)"></span>
          </div>
          <div id="rm-output" class="roadmap-out" style="margin-top:10px">La sortie LM Studio apparaît ici...</div>
        </div>
      </details>
      <div id="ideas-grid"></div>
    </div>

    <!-- ── MÉTRIQUES ── -->
    <div id="page-metrics" class="page">
      <div class="divider">ELO Leaderboard</div>
      <div class="card" id="metrics-elo">
        <div class="elo-row">
          <div class="elo-agent"><div class="elo-name">teacher_uci</div><div class="elo-val" style="color:var(--amber)" id="elo-teacher">1424</div></div>
          <div class="elo-agent"><div class="elo-name">heuristic</div><div class="elo-val" style="color:var(--blue)" id="elo-heuristic">1200</div></div>
          <div class="elo-agent"><div class="elo-name">neural</div><div class="elo-val" style="color:var(--text2)" id="elo-neural">975</div></div>
        </div>
        <div style="font-size:10px;color:var(--text3)" id="elo-date">Date inconnue</div>
      <div id="elo-fallback-note" style="display:none;font-size:10px;color:var(--amber);margin-top:3px">⚠ fallback — aucun benchmark mesuré</div>
      </div>
      <div class="divider">Draw Rate</div>
      <div class="card" id="metrics-draw">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
          <div style="font-family:var(--font-d);font-size:32px;font-weight:800" id="draw-pct">—</div>
          <div id="draw-label" style="font-size:11px;color:var(--text3)">Non mesuré</div>
        </div>
        <div class="draw-bar-wrap"><div class="draw-bar" id="draw-bar" style="width:0%;background:var(--text3)"></div></div>
      </div>
      <div class="divider">Progression Kaizen</div>
      <div class="card" id="metrics-kaizen">
        <div style="display:flex;gap:24px">
          <div><div class="stat-lbl">Open</div><div class="stat-val" id="kz-open" style="font-size:32px;color:var(--amber)">—</div></div>
          <div><div class="stat-lbl">Closed</div><div class="stat-val" id="kz-closed" style="font-size:32px;color:var(--green)">—</div></div>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn" onclick="loadMetrics()">↻ Rafraîchir</button>
      </div>
    </div>

    <!-- ── DATASET & IA ── -->
    <div id="page-dataset" class="page">
      <div class="divider">Dataset actif</div>
      <div class="card" id="dataset-active-card">
        <div style="font-size:12px;color:var(--text3)">Chargement...</div>
      </div>
      <div class="divider">Architecture IA</div>
      <div class="card">
        <table>
          <thead><tr><th>Composant</th><th>Statut</th><th>Notes</th></tr></thead>
          <tbody id="dataset-arch-body">
            <tr><td>Search (Negamax)</td><td><span class="pill p-done">✅ ACTIF</span></td><td>IMP-014 timeout</td></tr>
            <tr><td>Neural bridge</td><td><span class="pill p-done">✅ ACTIF</span></td><td>câblé c0ebf62</td></tr>
            <tr><td>Value head</td><td><span class="pill p-audit">⚠ PARTIEL</span></td><td>inutilisée en pratique</td></tr>
            <tr><td>Dataset pool</td><td><span class="pill p-broken">🔴 CORROMPU</span></td><td>draw_rate 94–100%</td></tr>
            <tr><td>LLM Coach v0</td><td><span class="pill p-done">✅ ACTIF</span></td><td>fd88b97</td></tr>
          </tbody>
        </table>
      </div>
      <div class="divider">Pools datasets</div>
      <div class="card" id="dataset-pools-card">
        <div style="font-size:12px;color:var(--text3)">Chargement...</div>
      </div>
      <div class="forbidden-doc">
        <div style="font-weight:700;color:var(--red);font-size:13px;margin-bottom:6px">🚫 DOCTRINE FORBIDDEN</div>
        <div style="font-size:12px;color:var(--red)">Training / dataset reset = FORBIDDEN sans HumanGate explicite.</div>
        <div style="font-size:11px;color:var(--text2);margin-top:4px">Référence : KAIZEN_PROTOCOL.md — aucun item FORBIDDEN ne s'automatise jamais.</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px">
        <button class="btn" onclick="loadDataset()">↻ Rafraîchir</button>
      </div>
    </div>

    <!-- ── CONFIG ── -->
    <div id="page-config" class="page">
      <div class="card">
        <div class="card-header"><div class="card-title">Configuration Autopilote</div></div>
        <div class="form-row">
          <div class="form-group">
            <label>Chemin repo</label>
            <input type="text" id="cfg-repo" value="C:\TACTICAL_CHESS_STUDIO">
          </div>
          <div class="form-group">
            <label>LM Studio host</label>
            <input type="text" id="cfg-lmhost" value="http://localhost:1234">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Modèle LM Studio</label>
            <input type="text" id="cfg-model" value="devstral-small-2507" placeholder="ex: devstral-small-2507 ou mistral-7b-instruct-v0.3">
          </div>
          <div class="form-group">
            <label>Port serveur autopilote</label>
            <input type="text" id="cfg-port" value="7331">
          </div>
        </div>
        <button class="btn btn-amber" onclick="saveConfig()">Sauver config</button>
        <span id="cfg-status" style="font-size:11px;color:var(--text3);margin-left:10px"></span>
      </div>

      <div class="divider">Test LM Studio</div>
      <div class="card">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <button class="btn btn-green" onclick="probeLM()">○ Ping LM Studio (rapide)</button>
          <button class="btn btn-amber" onclick="testLM()">⚡ Test inférence (lent — cold start)</button>
        </div>
        <div id="lm-test-out" style="font-size:12px;color:var(--text2)"></div>
        <div style="margin-top:8px;font-size:11px;color:var(--text3)">
          ℹ Ping vérifie juste que LM Studio répond. Test inférence envoie un vrai prompt — peut prendre 30-90s au premier appel (cold start Devstral).
        </div>
      </div>

      <div class="divider">Sync & Commit (assisté HumanGate)</div>
      <div class="card">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <button class="btn" onclick="showGitStatus()">📄 Voir fichiers modifiés</button>
          <button class="btn" onclick="runDocHygiene()">🔍 Audit hygiène docs</button>
        </div>
        <div id="git-status-out" class="terminal" style="display:none;height:160px;margin-bottom:12px"></div>
        <div class="form-group">
          <label>Message de commit</label>
          <input type="text" id="commit-msg" value="">
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-amber" onclick="copyGitCmd()">📋 Copier la commande git</button>
          <span style="font-size:11px;color:var(--red)">⚠ Exécuter manuellement dans votre terminal</span>
        </div>
      </div>

      <div class="divider">Pipeline CMD — PowerShell</div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">Endpoints depuis PowerShell</div>
          <span class="pill p-safe">CMD</span>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:12px">Tous les endpoints sont appelables directement depuis PowerShell / scripts / cron — sans UI.</div>
        <div class="form-group">
          <label>Fusion Devstral — UI &amp; PowerShell</label>
          <div style="display:flex;gap:6px;align-items:center">
            <input type="text" id="cmd-fusion-devstral" readonly value="Invoke-RestMethod -Uri 'http://localhost:7331/api/fusion-cmd' -Method POST -ContentType 'application/json' -Body '{&quot;backend&quot;:&quot;devstral&quot;,&quot;mode&quot;:&quot;full&quot;}'">
            <button class="btn btn-sm" onclick="copyCmd('cmd-fusion-devstral')">📋</button>
          </div>
        </div>
      </div>
    </div>


    <!-- ── AGENTS ── -->
    <div id="page-agents" class="page">
      <div class="divider">Agents IA — Feuilles de personnage</div>
      <div id="agents-grid">
        <div style="font-size:12px;color:var(--text3);padding:16px 0">Chargement des agents...</div>
      </div>
      <div class="agent-card agent-new" onclick="sendPromptClaude('Je veux créer un nouvel agent IA pour le Tactical Chess Studio. Architecture souhaitée : ')">
        <div style="text-align:center;padding:24px">
          <div style="font-size:28px;color:var(--text3);margin-bottom:8px">＋</div>
          <div style="font-size:13px;color:var(--text3);font-family:var(--font-d);font-weight:600">Nouvel agent</div>
          <div style="font-size:10px;color:var(--text3);margin-top:4px">→ Ouvre un prompt Claude</div>
        </div>
      </div>
    </div>

    <!-- ── LIGUE ── -->
    <div id="page-ligue" class="page">
      <div class="divider">Ligue — Tableau de bord</div>
      <div class="ligue-grid">
        <div class="ligue-col">
          <div class="ligue-col-title">Divisions</div>
          <div class="division-card div-alpha">
            <div style="font-family:var(--font-d);font-size:13px;font-weight:700;color:var(--amber)">Alpha</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px">Référence — agents stables</div>
            <div style="margin-top:6px"><span class="pill p-done" id="ligue-elo-teacher">teacher_uci ELO —</span></div>
          </div>
          <div class="division-card div-beta">
            <div style="font-family:var(--font-d);font-size:13px;font-weight:700;color:var(--blue)">Beta</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px">Compétition — agents actifs</div>
            <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">
              <span class="pill p-progress" id="ligue-elo-heuristic">heuristic ELO —</span>
              <span class="pill p-todo" id="ligue-elo-neural">neural ELO —</span>
            </div>
          </div>
          <div class="division-card div-gamma">
            <div style="font-family:var(--font-d);font-size:13px;font-weight:700;color:var(--text3)">Gamma</div>
            <div style="font-size:10px;color:var(--text3);margin-top:2px">Futur — entrée ELO ≥ 800</div>
            <div style="margin-top:6px"><span class="pill p-todo">Aucun agent</span></div>
          </div>
        </div>
        <div class="ligue-col">
          <div class="ligue-col-title">Bracket Round-robin</div>
          <div id="ligue-bracket">
            <div style="font-size:12px;color:var(--text3)">Chargement...</div>
          </div>
        </div>
        <div class="ligue-col">
          <div class="ligue-col-title">Comment ça marche</div>
          <div class="rule-item"><span class="rule-num">1.</span><span>Round-robin complet entre tous les agents d'une division.</span></div>
          <div class="rule-item"><span class="rule-num">2.</span><span>Système ELO K=24 — chaque match met à jour les scores en temps réel.</span></div>
          <div class="rule-item"><span class="rule-num">3.</span><span>Promotion / relégation automatique entre Alpha, Beta et Gamma selon classement final.</span></div>
          <div class="rule-item"><span class="rule-num">4.</span><span>Nouvelle saison déclenchée par HumanGate uniquement — validation manuelle requise.</span></div>
          <div class="rule-item"><span class="rule-num">5.</span><span>Entrée en division Gamma : ELO ≥ 800 minimum à la première qualification.</span></div>
        </div>
      </div>
    </div>

    <!-- ── MOTEUR & CODE ── -->
    <div id="page-moteur" class="page">
      <div class="divider">Moteur &amp; code — État des surfaces</div>
      <div class="card">
        <table>
          <thead><tr><th>Fonctionnalité</th><th>Statut</th><th>Notes</th></tr></thead>
          <tbody>
            <tr>
              <td>Chess classique</td>
              <td><span class="pill p-impl">IMPLEMENTED</span></td>
              <td style="color:var(--text3)">Moteur Rust complet — Rocky opérationnel</td>
            </tr>
            <tr>
              <td>Chess 960</td>
              <td><span class="pill p-blocked">BLOCKED</span></td>
              <td style="color:var(--text3)">HumanGate requis — IMP en attente</td>
            </tr>
            <tr>
              <td>Chess Fantasy</td>
              <td><span class="pill p-todo">NOT_STARTED</span></td>
              <td style="color:var(--text3)">Dépend Chess classique stable</td>
            </tr>
            <tr>
              <td>Rocky muté → Fantasy</td>
              <td><span class="pill p-todo">NOT_STARTED</span></td>
              <td style="color:var(--text3)">Après Chess Fantasy moteur validé</td>
            </tr>
            <tr>
              <td>Godot bridge UCI</td>
              <td><span class="pill p-todo">NOT_STARTED</span></td>
              <td style="color:var(--text3)">Protocole UCI → Godot via socket</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div id="moteur-imps"></div>
    </div>

    <!-- ── DESIGN & ASSETS ── -->
    <div id="page-design" class="page">
      <div class="divider">Design &amp; assets — État des livrables</div>
      <div class="card">
        <table>
          <thead><tr><th>Livrable</th><th>Statut</th><th>Notes</th></tr></thead>
          <tbody>
            <tr>
              <td>Manifeste création jeu Godot</td>
              <td><span class="pill p-todo">NOT_STARTED</span></td>
              <td style="color:var(--text3)">Succession de prompts Godot</td>
            </tr>
            <tr>
              <td>Manifeste règles</td>
              <td><span class="pill p-todo">NOT_STARTED</span></td>
              <td style="color:var(--text3)">Règles Chess Fantasy à formaliser</td>
            </tr>
            <tr>
              <td>Matrice cartes → prompt Godot</td>
              <td><span class="pill p-todo">NOT_STARTED</span></td>
              <td style="color:var(--text3)">(nom + type + faction + budget) → modèle 3D</td>
            </tr>
            <tr>
              <td>Générateur cartes TCG</td>
              <td><span class="pill p-todo">UNKNOWN</span></td>
              <td style="color:var(--text3)">Périmètre à définir</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div id="design-imps"></div>
    </div>

    <!-- ── ROADMAP JEUX ── -->
    <div id="page-roadmap-jeux" class="page">
      <div class="divider">Roadmap jeux — Moteur vs Design</div>
      <div class="game-row">
        <div class="game-title">♟ Chess classique</div>
        <div class="game-tracks">
          <div class="track-card" style="border-left:3px solid var(--green)">
            <div class="track-label">Moteur</div>
            <span class="pill p-impl">IMPLEMENTED</span>
            <div style="font-size:11px;color:var(--text3);margin-top:6px">Rust complet — Rocky opérationnel</div>
          </div>
          <div class="track-card" style="border-left:3px solid var(--amber)">
            <div class="track-label">Design &amp; assets</div>
            <span class="pill p-audit">EN COURS</span>
            <div style="font-size:11px;color:var(--text3);margin-top:6px">UI minimaliste — manifeste en attente</div>
          </div>
        </div>
      </div>
      <div class="game-row">
        <div class="game-title">♜ Chess 960</div>
        <div class="game-tracks">
          <div class="track-card" style="border-left:3px solid var(--amber)">
            <div class="track-label">Moteur</div>
            <span class="pill p-blocked">BLOCKED HumanGate</span>
            <div style="font-size:11px;color:var(--text3);margin-top:6px">IMP en attente — Chess classique stable prérequis</div>
          </div>
          <div class="track-card" style="border-left:3px solid var(--border2)">
            <div class="track-label">Design &amp; assets</div>
            <span class="pill p-todo">NOT_STARTED</span>
            <div style="font-size:11px;color:var(--text3);margin-top:6px">Bloqué par moteur</div>
          </div>
        </div>
      </div>
      <div class="game-row">
        <div class="game-title">🃏 Chess Fantasy</div>
        <div class="game-tracks">
          <div class="track-card" style="border-left:3px solid var(--border2)">
            <div class="track-label">Moteur</div>
            <span class="pill p-todo">NOT_STARTED</span>
            <div style="font-size:11px;color:var(--text3);margin-top:6px">Attend Chess 960 stable + HumanGate</div>
          </div>
          <div class="track-card" style="border-left:3px solid var(--border2)">
            <div class="track-label">Design &amp; assets</div>
            <span class="pill p-todo">NOT_STARTED</span>
            <div style="font-size:11px;color:var(--text3);margin-top:6px">Attend moteur + manifeste règles</div>
          </div>
        </div>
      </div>
      <div id="jeux-imps"></div>
    </div>

    <!-- ── CHAIN MAP (IMP-088) ── -->
    <div id="page-map" class="page">
      <div class="divider">Chaîne idée → IMP — Carte &amp; Calibration</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div id="map-version" style="font-size:11px;color:var(--text3)">Chargement...</div>
        <button class="btn btn-sm" onclick="loadChainMap()">⟳ Recharger</button>
      </div>
      <div id="map-chain-visual" style="display:flex;gap:8px;align-items:center;padding:10px 0;flex-wrap:wrap;margin-bottom:4px"></div>
      <div class="divider">Synthèse par step</div>
      <div class="card" style="padding:0;overflow-x:auto"><div id="map-table"></div></div>
      <div class="divider">Zones d'ombre</div>
      <div class="card"><div id="map-zones"></div></div>
      <div class="divider">Architecture idéale — 3 steps cibles</div>
      <div class="card"><div id="map-arch" style="display:flex;gap:12px;flex-wrap:wrap"></div></div>
      <div class="divider">Agents à calibrer</div>
      <div class="card"><div id="map-agents"></div></div>
      <div class="divider">Recommandations</div>
      <div class="card"><div id="map-top3"></div></div>
    </div>

    <!-- ── ROADMAP DOMAINES ── -->
    <div id="page-roadmap-domaine" class="page">
      <div class="divider">Roadmap par domaine — IMPs OPEN/DEFERRED</div>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
        <button class="btn btn-amber btn-sm" onclick="loadRoadmapDomaine()">&#8635; Rafraîchir</button>
        <span id="rd-total" style="font-size:10px;color:var(--text3)"></span>
      </div>
      <div id="rd-domains" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="card" style="padding:10px"><span style="color:var(--text3)">Chargement...</span></div>
      </div>
    </div>

    <!-- ── STUDIO OS ── -->
    <div id="page-studio-os" class="page">

      <!-- Section 1 : Surfaces studio -->
      <div class="divider">Surfaces studio</div>
      <div class="card">
        <table>
          <thead><tr><th>Surface</th><th>Statut</th></tr></thead>
          <tbody id="sos-surfaces-body">
            <tr><td colspan="2" style="color:var(--text3);text-align:center;padding:12px">Chargement...</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Section 2 : Boucle Kaizen live -->
      <div class="divider">Boucle Kaizen live</div>
      <div class="card">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:12px">
          <div>
            <div class="stat-lbl">Ledger</div>
            <div id="sos-ledger-line" style="font-size:14px;font-family:var(--font-d);font-weight:700;color:var(--text2)">—</div>
          </div>
          <div>
            <div class="stat-lbl">Next IMP</div>
            <div id="sos-next-imp" style="font-size:13px;font-family:var(--font-d);font-weight:600;color:var(--amber)">—</div>
            <div id="sos-next-lane" style="font-size:10px;color:var(--text3);margin-top:2px"></div>
            <button class="btn btn-amber btn-sm" style="margin-top:5px;font-size:10px" onclick="openImpInWorkflow(document.getElementById('sos-next-imp').textContent)">&#8599; Workflow IMP</button>
          </div>
        </div>
        <div style="margin-bottom:12px">
          <div class="stat-lbl">Autoloop</div>
          <div id="sos-autoloop-state" style="font-size:12px;color:var(--text2);margin-top:3px">idle</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <button class="btn btn-green" onclick="sosDryRun()">&#9654; Dry-run</button>
          <span id="sos-dryrun-status" style="font-size:11px;color:var(--text3)"></span>
        </div>
      </div>

      <!-- Section 3 : HumanGate -->
      <div class="divider">HumanGate</div>
      <div class="card">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;flex-wrap:wrap">
          <div>
            <div class="stat-lbl">Pending</div>
            <div id="sos-hg-pending" class="pill p-todo" style="margin-top:4px">—</div>
          </div>
          <div style="flex:1"></div>
          <button class="btn btn-amber btn-sm" onclick="nav('pilote');loadCeoBrief()" title="Qwen2.5-14B - CEO Brief (~3s)">&#11041; Lancer CEO Brief</button>
        </div>
        <div class="stat-lbl" style="margin-bottom:6px">Dernières décisions HumanGate</div>
        <div id="sos-hg-decisions">
          <div style="font-size:12px;color:var(--text3)">Chargement...</div>
        </div>
      </div>

      <!-- Section 4 : Corpus LoRA -->
      <div class="divider">Corpus LoRA</div>
      <div class="card">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px">
          <div class="stat-blk green">
            <div class="stat-lbl">Golden examples</div>
            <div class="stat-val" id="sos-golden">—</div>
            <div class="stat-sub">/ 50 cible</div>
          </div>
          <div class="stat-blk blue">
            <div class="stat-lbl">Finetune examples</div>
            <div class="stat-val" id="sos-finetune">—</div>
          </div>
          <div class="stat-blk amber">
            <div class="stat-lbl">LoRA status</div>
            <div style="margin-top:8px"><span class="pill p-todo" id="sos-lora-status">PENDING</span></div>
          </div>
        </div>
        <div class="stat-lbl">Progression corpus (/ 50)</div>
        <div class="prog-wrap" style="height:8px;margin-top:6px">
          <div class="prog-bar" id="sos-lora-bar" style="width:0%;background:var(--text3)"></div>
        </div>
        <div id="sos-lora-bar-label" style="font-size:10px;color:var(--text3);margin-top:4px">0 / 50 exemples</div>
      </div>

      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn" onclick="loadStudioOs()">&#8635; Rafraîchir</button>
      </div>
    </div>

    <!-- ── WORKFLOW IMP ── -->
    <div id="page-workflow" class="page">

      <!-- Section 0 : Cockpit Lanes (CEO Brief arbitre) -->
      <div class="divider">Cockpit Lanes
        <button class="btn btn-sm btn-amber" onclick="loadCockpitLanes()" style="font-size:10px;padding:2px 8px;text-transform:none;letter-spacing:0">⟳ Régénérer</button>
      </div>
      <div id="cockpit-ts" style="font-size:10px;color:var(--text3);margin-bottom:6px;padding:0 2px"></div>
      <div id="cockpit-lanes" style="display:flex;gap:10px;margin-bottom:8px">
        <div style="color:var(--text3);font-size:11px;padding:10px">Chargement assignments...</div>
      </div>

      <!-- Section 3 : Rapport Claude Code (3 lanes) -->
      <div class="divider">Rapport Claude Code</div>
      <div id="wf-report-lanes" style="display:flex;gap:10px;margin-bottom:8px">
        <div style="color:var(--text3);font-size:11px;padding:10px">Chargez les lanes cockpit d'abord (⟳ Régénérer ci-dessus).</div>
      </div>

      <!-- Section 4 : Historique -->
      <div class="divider">Historique (3 derniers IMPs fermés)</div>
      <div class="card">
        <div id="wf-history"><div style="color:var(--text3);font-size:12px">Chargement...</div></div>
      </div>

    </div>

  </div><!-- /content -->
</div><!-- /main -->
</div><!-- /shell -->

<!-- HUMANGATE CONFIRM MODAL -->
<div class="modal-overlay" id="hg-modal">
  <div class="modal">
    <div class="modal-title">⬡ HumanGate — Confirmation requise</div>
    <div class="modal-sub">Lane <span id="hg-lane-label" class="pill">AUDIT_REQUIRED</span> — une confirmation est nécessaire avant d'exécuter.</div>
    <div class="modal-cmd" id="hg-cmd-display"></div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal('hg-modal')">Annuler</button>
      <button class="btn btn-amber" onclick="confirmAndRun()">✓ Autoriser l'exécution</button>
    </div>
  </div>
</div>

<!-- FORBIDDEN MODAL -->
<div class="modal-overlay" id="forbidden-modal">
  <div class="modal forbidden">
    <div class="modal-title">🚫 Action FORBIDDEN</div>
    <div class="modal-sub" style="color:var(--red)">Cette action est FORBIDDEN selon la doctrine HumanGate.</div>
    <div class="modal-cmd" id="forbidden-cmd-display"></div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:16px;line-height:1.7">
      <strong>Raison :</strong> training / benchmark / dataset reset sans autorisation explicite.<br>
      <strong>Référence :</strong> KAIZEN_PROTOCOL.md — Aucun item FORBIDDEN ne s'automatise jamais.
    </div>
    <div class="modal-actions">
      <button class="btn btn-red" onclick="closeModal('forbidden-modal')">✗ Annuler</button>
    </div>
  </div>
</div>

<!-- MEMORY CAPTURE MODAL -->
<div class="modal-overlay" id="mem-modal">
  <div class="modal">
    <div class="modal-title">◈ Capturer une fusion</div>
    <div class="modal-sub">Ce qui mérite d'être gardé dans le corpus studio.</div>
    <div class="form-group">
      <label>Type</label>
      <select id="mem-type">
        <option value="fusion">Fusion d'idées</option>
        <option value="decision">Décision HumanGate</option>
        <option value="insight">Insight technique</option>
        <option value="pattern">Pattern réutilisable</option>
      </select>
    </div>
    <div class="form-group">
      <label>Contenu</label>
      <textarea id="mem-content" placeholder="Ce qui doit rester dans la mémoire du studio..."></textarea>
    </div>
    <div class="form-group">
      <label>Tags (séparés par virgule)</label>
      <input type="text" id="mem-tags" placeholder="ex: rocky, dataset, architecture">
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal('mem-modal')">Annuler</button>
      <button class="btn btn-amber" onclick="saveMemory()">◈ Capturer</button>
    </div>
  </div>
</div>

<!-- PIPELINE HUMANGATE MODAL -->
<div class="modal-overlay" id="pipeline-modal">
  <div class="modal" style="width:560px;max-height:80vh;display:flex;flex-direction:column">
    <div class="modal-title" id="pipeline-modal-title">⚡ Pipeline Idée → IMP</div>
    <div class="modal-sub" id="pipeline-modal-sub">Pipeline en cours...</div>
    <div class="pipeline-steps" id="pipeline-steps">
      <span class="pipe-step" id="ps-roadmap">1 Roadmap</span>
      <span class="pipe-step" id="ps-redteam">2 RedTeam</span>
      <span class="pipe-step" id="ps-fusion">3 Fusion</span>
      <span class="pipe-step" id="ps-extract">4 Extract</span>
      <span class="pipe-step" id="ps-staged">5 Stage</span>
    </div>
    <div id="pipeline-imp-list" style="overflow-y:auto;flex:1;display:none;margin-bottom:10px"></div>
    <div class="modal-actions" id="pipeline-modal-actions" style="display:none">
      <button class="btn" onclick="closeModal('pipeline-modal')">Fermer</button>
      <button class="btn btn-amber" onclick="approvePipelineAll()">✓ Approuver tout → inject</button>
    </div>
  </div>
</div>

<!-- IDEA MODAL -->
<div class="modal-overlay" id="idea-modal">
  <div class="modal" style="width:520px">
    <div class="modal-title">◎ Nouvelle idée</div>
    <div class="form-row" style="margin-top:10px">
      <div class="form-group" style="grid-column:1/-1">
        <label>Titre</label>
        <input type="text" id="im-title" placeholder="Nom de l'idée...">
      </div>
      <div class="form-group">
        <label>Chaîne</label>
        <select id="im-chain">
          <option value="studio">🏢 Studio</option>
          <option value="ia">🎮 IA Joueur</option>
          <option value="jv">🕹 Création JV</option>
        </select>
      </div>
      <div class="form-group">
        <label>Lane</label>
        <select id="im-lane">
          <option value="safe">SAFE_AUTO</option>
          <option value="audit">AUDIT_REQUIRED</option>
          <option value="human">HUMAN_REQUIRED</option>
        </select>
      </div>
      <div class="form-group">
        <label>ROI estimé</label>
        <select id="im-roi">
          <option value="high">🔴 Haut</option>
          <option value="med">🟡 Moyen</option>
          <option value="low">🟢 Bas</option>
        </select>
      </div>
      <div class="form-group">
        <label>Issue liée</label>
        <input type="text" id="im-issue" placeholder="ex: NEW-02">
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label>Description</label>
        <textarea id="im-desc" placeholder="Contexte, approche, contraintes..."></textarea>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn" onclick="closeModal('idea-modal')">Annuler</button>
      <button class="btn btn-amber" onclick="addIdea()">Capturer</button>
    </div>
  </div>
</div>

<script>
// ── STATE ─────────────────────────────────────────────────────────────────
const S = {
  autoMode: false,
  autoRefresh: true,
  claudeMode: false,
  lmOnline: false,
  pendingChain: null,
  pendingAutoloopLane: null,
  memory: { fusions: [], decisions: [] },
  ideas: [],
  ideaFilter: 'all',
  ideaCounter: 0,
  chainStates: {}
};

const CHAINS_DEF = {
  recall:  {label:'Recall',         lane:'SAFE_AUTO',     cmd:'.venv312/Scripts/python.exe lab/chains/kaizen_loop.py recall'},
  audit:   {label:'Audit hygiène',  lane:'SAFE_AUTO',     cmd:'.venv312/Scripts/python.exe lab/chains/doc_hygiene_chain.py --audit'},
  propose: {label:'Propose',        lane:'SAFE_AUTO',     cmd:'.venv312/Scripts/python.exe lab/chains/kaizen_loop.py propose'},
  metrics: {label:'Métriques',      lane:'SAFE_AUTO',     cmd:'.venv312/Scripts/python.exe lab/chains/kaizen_loop.py metrics'},
  smoke:   {label:'Smoke benchmark',lane:'AUDIT_REQUIRED',cmd:'powershell -ExecutionPolicy Bypass -File .\\scripts\\studioV2\\run_benchmark.ps1 -Smoke -RunClass exploration_only'},
  coach:   {label:'Coach Rocky',    lane:'AUDIT_REQUIRED',cmd:'powershell -ExecutionPolicy Bypass -Command "$env:TCS_MINIMAX_DEPTH=\\"3\\"; cargo run --release -- simulate_chess960 518 3"'},
  tests:   {label:'Cargo tests',    lane:'AUDIT_REQUIRED',cmd:'cargo test 2>&1'},
};

const laneClass = {SAFE_AUTO:'p-safe',AUDIT_REQUIRED:'p-audit',HUMAN_REQUIRED:'p-human'};
const chainLabels = {studio:'🏢 Studio',ia:'🎮 IA Joueur',jv:'🕹 JV'};
const roiColors = {high:'p-high',med:'p-med',low:'p-low'};

// ── NAVIGATION ────────────────────────────────────────────────────────────
function nav(id) {
  document.querySelectorAll('.sb-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.querySelector(`.sb-item[onclick="nav('${id}')"]`)?.classList.add('active');
  document.getElementById(`page-${id}`)?.classList.add('active');
  if (id === 'vision') loadVision();
  if (id === 'ideas') loadIdeas();
  if (id === 'chains') loadChains();
  if (id === 'memory') renderMemory();
  if (id === 'logs') { refreshLogs(); loadDevstralStatus(); }
  if (id === 'metrics' || id === 'ligue') loadMetrics();
  if (id === 'ligue') loadLigue();
  if (id === 'dataset') { loadDataset(); loadDatasetArch(); }
  if (id === 'pilote') { loadSessionContext(); loadPiloteSurfaces(); loadIssuesHigh(); }
  if (id === 'agents') loadAgents();
  if (id === 'studio-os') loadStudioOs();
  if (id === 'workflow') loadWorkflow();
  if (id === 'roadmap-domaine') loadRoadmapDomaine();
  if (id === 'map') loadChainMap();
  if (id === 'moteur') loadDomainImps('rocky_moteur', 'moteur-imps');
  if (id === 'design') loadDomainImps('jeux', 'design-imps');
  if (id === 'roadmap-jeux') loadDomainImps('jeux', 'jeux-imps');
}

// ── CHAIN MAP (IMP-088) ──────────────────────────────────────────────────
async function loadChainMap() {
  const ver = document.getElementById('map-version');
  try {
    const data = await fetch('/api/chain-map').then(r => r.json());
    if (!data || !data.chain) { if(ver) ver.textContent = '✗ Erreur chargement'; return; }
    if(ver) ver.textContent = 'v' + data.version + ' · ' + data.generated_at + ' · ' + (data.source||'');

    // Carte visuelle de la chaîne
    const visual = document.getElementById('map-chain-visual');
    if (visual) visual.innerHTML = data.chain.map((s, i) => {
      const vc = s.value_rating?.startsWith('haute') ? 'var(--green)'
               : s.value_rating?.startsWith('quasi') ? '#c0392b' : 'var(--amber)';
      const modelShort = s.model === 'python_pur' ? 'Python' : (s.model||'').split('-').slice(0,2).join('-');
      return `${i>0?'<span style="color:var(--text3);font-size:18px;line-height:1;align-self:center">→</span>':''}
        <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:8px 12px;text-align:center;min-width:88px">
          <div style="font-size:9px;color:var(--text3)">Step ${s.step}</div>
          <div style="font-weight:600;color:${vc};font-size:12px">${s.name.toUpperCase()}</div>
          <div style="font-size:9px;color:var(--text3);margin-top:2px">${modelShort}</div>
          <div style="font-size:9px;color:var(--text3)">${s.max_tokens_current??'—'} tok</div>
          ${(s.blind_spots||[]).length?`<div style="font-size:9px;color:var(--amber);margin-top:2px">${(s.blind_spots||[]).length} zones</div>`:''}
        </div>`;
    }).join('');

    // Table synthèse
    const tbl = document.getElementById('map-table');
    if (tbl) tbl.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead><tr style="color:var(--text3);border-bottom:1px solid var(--border2)">
        <th style="text-align:left;padding:6px 8px">Step</th>
        <th style="text-align:left;padding:6px 8px">Modèle</th>
        <th style="text-align:left;padding:6px 8px">Rôle actuel</th>
        <th style="text-align:left;padding:6px 8px">Temp / Tok</th>
        <th style="text-align:left;padding:6px 8px">Valeur</th>
        <th style="text-align:left;padding:6px 8px">Zones d'ombre</th>
      </tr></thead><tbody>${data.chain.map(s => {
        const vc = s.value_rating?.startsWith('haute') ? 'var(--green)' : 'var(--amber)';
        return `<tr style="border-bottom:1px solid var(--border)">
          <td style="padding:6px 8px;font-weight:600;color:var(--amber)">${s.step}. ${s.name}</td>
          <td style="padding:6px 8px;color:var(--text2);font-size:10px">${(s.model||'').split('-').slice(0,2).join('-')}</td>
          <td style="padding:6px 8px;color:var(--text2)">${escHtml((s.role_current||'').slice(0,55))}</td>
          <td style="padding:6px 8px;color:var(--text3)">${s.temperature_current??'—'} / ${s.max_tokens_current??'—'}</td>
          <td style="padding:6px 8px;color:${vc}">${escHtml((s.value_rating||'').slice(0,22))}</td>
          <td style="padding:6px 8px;color:var(--text3)">${(s.blind_spots||[]).slice(0,2).map(b=>`<div style="font-size:10px">░ ${escHtml(b.slice(0,50))}</div>`).join('')}</td>
        </tr>`;
      }).join('')}</tbody></table>`;

    // Zones d'ombre
    const zones = document.getElementById('map-zones');
    if (zones) {
      const adressed = data.zones_ombre_adressees_imp089||[];
      zones.innerHTML =
        (data.zones_ombre||[]).map(z=>`<div style="padding:3px 0;font-size:11px;color:var(--text3)">░ ${escHtml(z)}</div>`).join('') +
        (adressed.length ? `<div style="margin-top:10px;font-size:10px;color:var(--green);margin-bottom:4px">✓ Adressées par IMP-089</div>`
          + adressed.map(z=>`<div style="padding:2px 0;font-size:11px;color:var(--green)">✓ ${escHtml(z)}</div>`).join('') : '');
    }

    // Architecture idéale
    const arch = document.getElementById('map-arch');
    if (arch) arch.innerHTML = (data.architecture_ideale||[]).map(s=>
      `<div style="background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:10px 14px;min-width:130px">
        <div style="font-size:9px;color:var(--text3)">Step ${s.step}</div>
        <div style="font-weight:600;color:var(--amber);margin:3px 0">${s.name?.toUpperCase()}</div>
        <div style="font-size:10px;color:var(--text2)">${escHtml(s.role||'')}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:4px">${(s.model||'').split('-').slice(0,2).join('-')} · ${s.max_tokens} tok · t=${s.temperature}</div>
        ${s.note?`<div style="font-size:9px;color:var(--text3);margin-top:3px;font-style:italic">${escHtml(s.note)}</div>`:''}
      </div>`).join('');

    // Agents
    const agts = document.getElementById('map-agents');
    if (agts) agts.innerHTML = (data.agents_a_creer||[]).map(a=>
      `<div style="display:flex;align-items:flex-start;gap:10px;padding:5px 0;border-bottom:1px solid var(--border);font-size:11px">
        <div style="width:120px;font-weight:600;color:var(--amber)">${escHtml(a.name||'')}</div>
        <div style="flex:1;color:var(--text2)">${escHtml((a.role||'').slice(0,65))}</div>
        <div style="width:110px;color:var(--text3);font-size:10px">${escHtml(a.model||'')}</div>
        <div style="width:80px;color:${a.a_calibrer?'var(--amber)':'var(--text3)'}">${a.a_calibrer?'⚡ calibrer':'✓ OK'}</div>
      </div>`).join('');

    // Top 3 recommandations
    const top3 = document.getElementById('map-top3');
    if (top3) top3.innerHTML =
      '<div style="font-size:11px;color:var(--text3);margin-bottom:4px">Faites :</div>' +
      (data.top3_recommandations||[]).map(r=>`<div style="padding:2px 0;font-size:11px;color:var(--green)">✓ ${escHtml(r)}</div>`).join('') +
      '<div style="font-size:11px;color:var(--text3);margin:8px 0 4px">Restantes :</div>' +
      (data.top3_recommandations_restantes||[]).map(r=>`<div style="padding:2px 0;font-size:11px;color:var(--amber)">→ ${escHtml(r)}</div>`).join('');

  } catch(e) {
    if(ver) ver.textContent = '✗ ' + e.message;
  }
}

// ── CLOCK ─────────────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent =
    now.toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
setInterval(updateClock, 1000); updateClock();

// ── LM STUDIO STATUS ──────────────────────────────────────────────────────
async function checkLM() {
  try {
    const r = await fetch('/api/lm-status');
    const d = await r.json();
    S.lmOnline = d.ok;
    const el = document.getElementById('lm-indicator');
    const dot = document.getElementById('lm-dot');
    const txt = document.getElementById('lm-text');
    if (d.ok) {
      el.className = 'tb-lm online';
      dot.textContent = '●';
      txt.textContent = (d.models?.[0] || 'LM Studio').split('/').pop();
    } else {
      el.className = 'tb-lm offline';
      dot.textContent = '○';
      txt.textContent = 'LM Studio';
    }
    // Fix 8 — Tokens session dans topbar
    const tokEl = document.getElementById('tb-tokens');
    if (tokEl && d.tokens_session != null) tokEl.textContent = d.tokens_session.toLocaleString('fr-FR');
  } catch(e) {}
}
setInterval(checkLM, 15000); checkLM();

// ── ESCALATION STATUS (HumanGate badge topbar) ────────────────────────────
async function checkEscalation() {
  try {
    const d = await fetch('/api/escalation-status').then(r => r.json());
    const badge = document.getElementById('tb-hg-badge');
    if (!badge) return;
    badge.style.display = d.pending ? 'flex' : 'none';
    badge.title = d.reason || '';
  } catch(e) {}
}
setInterval(checkEscalation, 10000); checkEscalation();

// ── WATCHER POLL — refresh cockpit si IMP fermé ───────────────────────────
let _cockpitWatcherLast = null;
async function checkWatcherStatus() {
  if (!document.getElementById('page-workflow')?.classList.contains('active')) return;
  try {
    const d = await fetch('/api/watcher-status').then(r => r.json());
    if (_cockpitWatcherLast !== null && d.last_processed && d.last_processed !== _cockpitWatcherLast) {
      await loadCockpitLanes();
      showToast('✓ ' + d.last_processed + ' fermé · cockpit mis à jour');
    }
    _cockpitWatcherLast = d.last_processed;
  } catch(e) {}
}
setInterval(checkWatcherStatus, 15000); checkWatcherStatus();

// ── PROPOSALS EN ATTENTE badge topbar ────────────────────────────────────
async function checkPendingProposals() {
  try {
    const d = await fetch('/api/pending-proposals-count').then(r => r.json());
    const badge = document.getElementById('tb-prop-badge');
    if (!badge) return;
    if (d.count > 0) {
      badge.style.display = 'flex';
      badge.textContent = '◈ ' + d.count + ' proposal' + (d.count > 1 ? 's' : '');
    } else {
      badge.style.display = 'none';
    }
  } catch(e) {}
}
setInterval(checkPendingProposals, 30000); checkPendingProposals();

// ── DEDUP EXCLUSION badge topbar ──────────────────────────────────────────
async function checkDedupCount() {
  try {
    const d = await fetch('/api/dedup-count').then(r => r.json());
    const badge = document.getElementById('tb-dedup-badge');
    const count = document.getElementById('tb-dedup-count');
    if (!badge || !count) return;
    if (d.count > 0) {
      badge.style.display = 'flex';
      count.textContent = d.count;
    } else {
      badge.style.display = 'none';
    }
  } catch(e) {}
}
setInterval(checkDedupCount, 30000); checkDedupCount();

// ── AUTO-MODE TOGGLE ──────────────────────────────────────────────────────
function toggleClaudeMode() {}

function toggleAutoMode() {
  S.autoMode = !S.autoMode;
  const track = document.getElementById('auto-track');
  const label = document.getElementById('auto-label');
  const knob  = track.querySelector('.toggle-knob');
  track.classList.toggle('on', S.autoMode);
  knob.style.left = S.autoMode ? '17px' : '2px';
  knob.style.background = S.autoMode ? 'var(--amber)' : 'var(--text3)';
  label.textContent = S.autoMode ? 'Mode auto (SAFE_AUTO)' : 'Mode manuel';
}

function toggleAutoRefresh() {
  S.autoRefresh = !S.autoRefresh;
}

// ── CHAIN RUNNER ──────────────────────────────────────────────────────────
function setChainState(id, state) {
  S.chainStates[id] = state;
  const el = document.getElementById(`st-${id}`);
  if (el) {
    el.className = `chain-status ${state}`;
    el.textContent = state;
    const card = el.closest('.chain-card');
    if (card) {
      card.className = 'chain-card';
      if (state === 'running') card.classList.add('running');
      else if (state === 'done') card.classList.add('done');
      else if (state === 'error') card.classList.add('error');
    }
  }
}

async function triggerChain(id) {
  const def = CHAINS_DEF[id];
  if (!def) return;
  if (def.lane === 'FORBIDDEN') { showForbiddenModal(def.label, def.cmd); return; }
  if (def.lane !== 'SAFE_AUTO' && !S.autoMode) {
    confirmChain(id); return;
  }
  setChainState(id, 'running');
  try {
    const r = await fetch('/api/run-chain', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({id, cmd: def.cmd})
    });
    const d = await r.json();
    setChainState(id, d.rc === 0 ? 'done' : 'error');
    setTimeout(() => setChainState(id, 'idle'), 4000);
    refreshLogs();
  } catch(e) {
    setChainState(id, 'error');
  }
}

function confirmChain(id) {
  const def = CHAINS_DEF[id];
  S.pendingChain = id;
  document.getElementById('hg-cmd-display').textContent = def.cmd;
  const laneEl = document.getElementById('hg-lane-label');
  laneEl.className = 'pill ' + (laneClass[def.lane] || 'p-audit');
  laneEl.textContent = def.lane;
  document.getElementById('hg-modal').classList.add('open');
}

async function confirmAndRun() {
  closeModal('hg-modal');
  if (S.pendingAutoloopLane) {
    const {lane, dry_run} = S.pendingAutoloopLane;
    S.pendingAutoloopLane = null;
    await _doAutoloopStart(lane, dry_run);
  } else if (S.pendingChain) {
    await triggerChain(S.pendingChain);
    S.pendingChain = null;
  }
}

async function runKaizenSequence() {
  const b = event.currentTarget;
  const orig = b.textContent;
  b.textContent = '⟳ Séquence...';
  b.disabled = true;
  try {
    for (const id of ['recall','audit','propose']) {
      await triggerChain(id);
      await new Promise(r => setTimeout(r, 800));
    }
  } finally {
    b.textContent = orig;
    b.disabled = false;
  }
}

// ── CHAINS LIST ───────────────────────────────────────────────────────────
function renderChains() {
  const el = document.getElementById('chains-list');
  if (!el) return;
  el.innerHTML = Object.entries(CHAINS_DEF).map(([id, def]) => `
    <div class="chain-card" id="cc-${id}" onclick="${def.lane==='SAFE_AUTO'||S.autoMode?`triggerChain('${id}')`:`confirmChain('${id}')`}">
      <div style="flex:1">
        <div class="chain-name">${def.label}</div>
        <div class="chain-cmd">${def.cmd}</div>
      </div>
      <span class="pill ${laneClass[def.lane]}">${def.lane}</span>
      <div class="chain-status idle" id="st-${id}">${S.chainStates[id]||'idle'}</div>
    </div>`).join('');
}

// ── DEVSTRAL STATUS ───────────────────────────────────────────────────────
async function loadDevstralStatus() {
  try {
    const r = await fetch('/api/lm-status');
    const d = await r.json();
    const sessionLine = document.getElementById('ds-session-line');
    const taskBadge   = document.getElementById('ds-task-badge');
    const taskPill    = document.getElementById('ds-task-pill');
    const histBody    = document.getElementById('ds-history-body');
    if (!sessionLine) return;
    const ctxOk  = d.context_loaded;
    const ctxTxt = ctxOk ? '✓ CHARGÉ' : '✗ ABSENT';
    const ctxCol = ctxOk ? 'var(--green)' : 'var(--red)';
    sessionLine.innerHTML = 'Devstral — <strong>' + (d.tokens_session ?? 0) + '</strong> tokens cette session · contexte <span style="color:' + ctxCol + '">' + ctxTxt + '</span>';
    if (taskBadge) {
      if (d.current_task) {
        taskBadge.style.display = 'inline-block';
        if (taskPill) taskPill.textContent = '⟳ ' + (d.current_task.type || 'call') + ' — ' + (d.current_task.tokens_so_far ?? 0) + ' tokens';
      } else {
        taskBadge.style.display = 'none';
      }
    }
    if (histBody) {
      if (!d.history || !d.history.length) {
        histBody.innerHTML = '<tr><td colspan="5" style="color:var(--text3);text-align:center;padding:12px">Aucun appel enregistré</td></tr>';
      } else {
        histBody.innerHTML = d.history.map(h => {
          const heure = (h.ts || '').slice(11, 19);
          const dur   = h.duration_ms != null ? (h.duration_ms >= 1000 ? Math.round(h.duration_ms / 1000) + 's' : h.duration_ms + 'ms') : '—';
          const tCol  = (h.tokens_approx || 0) > 500 ? 'var(--amber)' : 'var(--text2)';
          return '<tr>' +
            '<td style="color:var(--text3);white-space:nowrap">' + heure + '</td>' +
            '<td><span class="pill" style="background:var(--bg4);color:var(--text2)">' + escHtml(h.type || 'call') + '</span></td>' +
            '<td style="color:' + tCol + ';font-family:var(--font-d);font-weight:600">' + (h.tokens_approx ?? '—') + '</td>' +
            '<td style="color:var(--text3)">' + dur + '</td>' +
            '<td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text3)">' + escHtml(h.prompt_preview || '') + '</td>' +
          '</tr>';
        }).join('');
      }
    }
  } catch(e) {}
}

// ── LOGS ──────────────────────────────────────────────────────────────────
async function refreshLogs() {
  try {
    const r = await fetch('/api/logs');
    const d = await r.json();
    const out = document.getElementById('terminal-out');
    if (!out) return;
    if (!d.logs || d.logs.length === 0) {
      out.textContent = 'Aucune sortie — lance une chaîne.';
      return;
    }
    out.innerHTML = d.logs.map(l => `
      <div><span class="ts">[${l.ts.slice(0,19)}]</span> <span class="cmd-line">$ ${l.cmd.slice(0,80)}</span></div>
      ${l.output ? l.output.split('\n').map(line=>`<div class="ok-line">${escHtml(line)}</div>`).join('') : ''}
      ${l.error ? l.error.split('\n').map(line=>`<div class="err-line">${escHtml(line)}</div>`).join('') : ''}
      <div style="margin:4px 0;border-top:1px solid var(--border)"></div>
    `).join('');
    out.scrollTop = out.scrollHeight;
  } catch(e) {}
}
async function clearLogs() {
  await fetch('/api/logs', {method:'DELETE'});
  document.getElementById('terminal-out').textContent = 'Logs vidés.';
}
setInterval(() => {
  if (S.autoRefresh && document.getElementById('page-logs')?.classList.contains('active')) {
    refreshLogs();
    loadDevstralStatus();
  }
}, 5000);

// ── PANNEAU IA UNIFIÉ ─────────────────────────────────────────────────────
function updateEngineUI() {}

async function aiSend() {
  await lmQuickAsk();
}


// ── LM STUDIO CALLS ───────────────────────────────────────────────────────
async function lmQuickAsk() {
  const prompt = document.getElementById('lm-quick-input').value.trim();
  if (!prompt) return;
  const status = document.getElementById('lm-quick-status');
  const out = document.getElementById('lm-quick-out');
  const SYS = 'Tu es le manager opérationnel du Tactical Chess Studio (studio solo, 1 dev : Pierre).\n' +
    'Rocky (Rust+neural+coach v0), 3 chaînes Kaizen, Devstral 8t/s, lanes SAFE_AUTO/AUDIT/HUMAN/FORBIDDEN.\n' +
    'Issues HIGH : NEW-02 draw, NEW-03 dataset corrompu, NEW-05 curriculum absent.\n' +
    'Réponds de façon concise et actionnable. claim_verdict: NO_CLAIM_ALLOWED.';
  status.textContent = '⚡ En cours...';
  out.style.display = 'block';
  out.textContent = '';
  const result = await lmStreamCall(prompt, SYS, 300, out, status);
  if (result === null) {
    out.textContent = '...';
    try {
      const r = await fetch('/api/lm-ask', {method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({prompt, system:SYS, max_tokens:300})});
      const d = await r.json();
      out.textContent = d.response || d.error || 'Pas de réponse';
      status.textContent = d.error ? '✗ Erreur' : '✓ Réponse reçue';
    } catch(e) { out.textContent = 'Erreur de connexion à LM Studio'; status.textContent = '✗ Erreur'; }
  }
}

async function generateRoadmap() {
  const title = document.getElementById('rm-title').value.trim();
  const context = document.getElementById('rm-context').value.trim();
  const rmStatus = document.getElementById('rm-status');
  const out = document.getElementById('rm-output');
  if (!title) { rmStatus.textContent = 'Titre requis'; return; }
  // Même modal d'injection que les cartes Idées
  const modal = document.getElementById('pipeline-modal');
  const titleEl = document.getElementById('pipeline-modal-title');
  const sub   = document.getElementById('pipeline-modal-sub');
  const impList = document.getElementById('pipeline-imp-list');
  const actions = document.getElementById('pipeline-modal-actions');
  titleEl.textContent = '⚡ Pipeline : ' + title;
  sub.textContent = 'Étape 1/5 — Génération roadmap...';
  impList.style.display = 'none';
  impList.innerHTML = '';
  actions.style.display = 'none';
  ['ps-roadmap','ps-redteam','ps-fusion','ps-extract','ps-staged'].forEach(sid => {
    const el = document.getElementById(sid); if (el) el.className = 'pipe-step';
  });
  modal.classList.add('open');
  rmStatus.textContent = '⚡ Démarrage pipeline...';
  out.textContent = '';
  try {
    const r = await fetch('/api/idea-to-imp', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({idea_id: 'manual', idea_title: title, idea_content: context})
    });
    const d = await r.json();
    if (!d.ok || !d.started) {
      rmStatus.textContent = '✗ ' + (d.error || 'Erreur démarrage');
      modal.classList.remove('open');
      return;
    }
    rmStatus.textContent = '⟳ Pipeline en cours (5 étapes)...';
    await _pollPipelineIntoModal(sub, impList, actions);
    // Populate rm-output from result
    try {
      const s = await fetch('/api/idea-pipeline-status').then(r => r.json());
      if (s.result) {
        out.textContent = [
          '=== FUSION ===', s.result.fusion || '',
          '', '=== IMPs STAGÉS ===',
          (s.result.imps_staged||[]).map((x,i) => (i+1)+'. '+x.title).join('\n'),
          '', 'Proposals: '+(s.result.proposals_file||''),
        ].join('\n');
        out.__lastOutput = out.textContent;
        rmStatus.textContent = '✓ Terminé — voir le modal pour injecter dans le ledger';
      }
    } catch(e) {}
  } catch(e) { rmStatus.textContent = '✗ Erreur connexion'; out.textContent = String(e); }
}

function saveRoadmapToMemory() {
  const content = document.getElementById('rm-output').__lastOutput || document.getElementById('rm-output').textContent;
  const title = document.getElementById('rm-title').value.trim();
  if (!content || content === '...') return;
  document.getElementById('im-title') && (document.getElementById('im-title').value = title);
  document.getElementById('mem-content').value = content;
  document.getElementById('mem-tags').value = 'roadmap,' + document.getElementById('rm-chain').value;
  document.getElementById('mem-type').value = 'fusion';
  showMemModal();
}

async function lmAnalyzeIdeas() {
  const ideas = S.ideas.filter(i => i.status === 'backlog').map(i => `- ${i.title} [ROI:${i.roi}] [${i.chain}]`).join('\n');
  const prompt = `Voici les idées backlog du Tactical Chess Studio :\n${ideas}\n\nPriorise-les par ROI réel (impact/effort) et identifie les 3 qui se combinent le mieux pour former quelque chose de plus puissant. Explique les synergies.`;
  const sys = `Tu es architecte du Tactical Chess Studio (solo, Pierre). Repo : Rocky (Rust+Python+LLM), 3 chaînes Kaizen, LM Studio local Devstral. Issues HIGH : NEW-02/03/05. Lanes : SAFE_AUTO/AUDIT_REQUIRED/HUMAN_REQUIRED/FORBIDDEN. claim_verdict: NO_CLAIM_ALLOWED.`;
  const out = document.getElementById('rm-output');
  nav('ideas');
  document.getElementById('rm-title').value = 'Analyse et priorisation des idées backlog';
  if (out) out.textContent = 'Analyse en cours...';
  const sink = {get textContent(){return '';}, set textContent(v){}};
  const res = await lmStreamCall(prompt, sys, 600, out, sink);
  if (res === null) {
    try {
      const r = await fetch('/api/lm-ask', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt, system:sys, max_tokens:600})});
      const d = await r.json();
      if (out) out.textContent = d.response || d.error;
    } catch(e) { if (out) out.textContent = 'Erreur'; }
  }
}

async function lmSynthesizeMemory() {
  const fusions = S.memory.fusions.map(f => f.content).join('\n\n---\n\n');
  if (!fusions) { alert('Aucune fusion à synthétiser'); return; }
  const prompt = `Voici les fusions capturées dans la mémoire du studio :\n\n${fusions}\n\nFais une synthèse du corpus : patterns récurrents, insights clés, décisions structurantes, et ce qui pourrait alimenter un LoRA fine-tuning.`;
  const sys = `Tu es architecte du Tactical Chess Studio (solo, Pierre). Repo : Rocky (Rust+Python+LLM), 3 chaînes Kaizen, LM Studio local Devstral. Issues HIGH : NEW-02/03/05. Lanes : SAFE_AUTO/AUDIT_REQUIRED/HUMAN_REQUIRED/FORBIDDEN. claim_verdict: NO_CLAIM_ALLOWED.`;
  const out = document.getElementById('rm-output');
  nav('ideas');
  document.getElementById('rm-title').value = 'Synthèse corpus mémoire studio';
  if (out) out.textContent = '';
  const sink = {get textContent(){return '';}, set textContent(v){}};
  const res = await lmStreamCall(prompt, sys, 800, out, sink);
  if (res === null) {
    try {
      const r = await fetch('/api/lm-ask', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt, system:sys, max_tokens:800})});
      const d = await r.json();
      if (out) out.textContent = d.response || d.error;
    } catch(e) {}
  }
}

async function probeLM() {
  const out = document.getElementById('lm-test-out');
  out.style.color = 'var(--text2)';
  out.textContent = 'Ping en cours...';
  try {
    const r = await fetch('/api/lm-probe');
    const d = await r.json();
    out.style.color = d.ok ? 'var(--green)' : 'var(--red)';
    out.textContent = d.msg + (d.models?.length ? ' — Modèles : ' + d.models.join(', ') : '');
  } catch(e) {
    out.style.color = 'var(--red)';
    out.textContent = 'Erreur : ' + e;
  }
}

async function testLM() {
  const out = document.getElementById('lm-test-out');
  out.textContent = 'Test en cours...';
  try {
    const r = await fetch('/api/lm-ask', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:'Réponds juste "TCS Autopilote opérationnel." pour confirmer la connexion.',max_tokens:20})});
    const d = await r.json();
    out.style.color = d.error ? 'var(--red)' : 'var(--green)';
    out.textContent = d.response || d.error || 'Pas de réponse';
  } catch(e) { out.style.color='var(--red)'; out.textContent = 'Erreur connexion'; }
}

// ── MEMORY ────────────────────────────────────────────────────────────────
function showMemModal() { document.getElementById('mem-modal').classList.add('open'); }
async function saveMemory() {
  const content = document.getElementById('mem-content').value.trim();
  if (!content) return;
  const entry = {
    id: Date.now(),
    type: document.getElementById('mem-type').value,
    content,
    tags: document.getElementById('mem-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    ts: new Date().toISOString()
  };
  S.memory.fusions.unshift(entry);
  document.getElementById('mem-count').textContent = S.memory.fusions.length;
  closeModal('mem-modal');
  document.getElementById('mem-content').value = '';
  document.getElementById('mem-tags').value = '';
  renderMemory();
  // Persist via API
  try { await fetch('/api/memory', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(entry)}); } catch(e) {}
}
async function renderMemory() {
  try {
    const r = await fetch('/api/memory');
    const d = await r.json();

    // Garder S.memory.fusions pour lmSynthesizeMemory (contenu brut)
    if (d.fusions) S.memory.fusions = d.fusions;
    const cnt = document.getElementById('mem-count');
    if (cnt) cnt.textContent = (d.fusions||[]).length;

    // ── Section 1 : Fusions capturées (FUSION_LOG.jsonl) ──
    const memEl = document.getElementById('mem-list');
    if (memEl) {
      if (!d.fusions || !d.fusions.length) {
        memEl.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:16px 0">Aucune entrée dans FUSION_LOG.jsonl.</div>';
      } else {
        memEl.innerHTML = d.fusions.map(f => {
          const ts = (f.ts||'').slice(0,19).replace('T',' ');
          const action = f.prochaine_action ? escHtml(f.prochaine_action) : escHtml(JSON.stringify(f).slice(0,200));
          return `<div class="mem-card">
            <div class="mem-ts">${ts}</div>
            <div class="mem-content">
              ${f.nb_fusions != null ? `<span class="mem-tag">${f.nb_fusions} fusions</span> ` : ''}${action}
            </div>
          </div>`;
        }).join('');
      }
    }

    // ── Section 2 : Décisions HumanGate ──
    const decEl = document.getElementById('decisions-list');
    if (decEl) {
      if (!d.decisions_humangate || !d.decisions_humangate.length) {
        decEl.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:10px 0">Aucune décision trouvée.</div>';
      } else {
        decEl.innerHTML = '<table><thead><tr><th>ID</th><th>Titre</th><th>Décision</th><th>Date</th></tr></thead><tbody>' +
          d.decisions_humangate.map(hgd => {
            const pilCls = hgd.decision==='APPROVED' ? 'p-done' : hgd.decision==='REJECTED' ? 'p-blocked' : 'p-audit';
            return `<tr>
              <td><span class="pill p-human">${escHtml(hgd.id||'')}</span></td>
              <td style="max-width:240px;word-break:break-word">${escHtml(hgd.question||'')}</td>
              <td><span class="pill ${pilCls}">${escHtml(hgd.decision||'')}</span></td>
              <td style="color:var(--text3)">${escHtml(hgd.date||'')}</td>
            </tr>`;
          }).join('') + '</tbody></table>';
      }
    }

    // ── Section 3 : Dataset studio ──
    const setDs = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v ?? '—'; };
    setDs('ds-golden',  d.golden_examples  ?? '—');
    setDs('ds-ux-runs', d.ux_runs          ?? '—');
    setDs('ds-finetune',d.finetune_examples ?? '—');

    // ── Section 4 : Dernières chaînes ──
    const chainsEl = document.getElementById('mem-chains-list');
    if (chainsEl) {
      if (!d.last_chains || !d.last_chains.length) {
        chainsEl.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:10px 0">Aucune chaîne dans CHAIN_HISTORY.</div>';
      } else {
        chainsEl.innerHTML = d.last_chains.map(c => {
          const ts = (c.timestamp||c.ts||'').replace('T',' ').slice(0,16);
          const okCol = (c.status==='SUCCESS'||c.status==='ok') ? 'var(--green)' : 'var(--amber)';
          const laneKey = c.lane==='SAFE_AUTO' ? 'safe' : c.lane==='AUDIT_REQUIRED' ? 'audit' : 'todo';
          return `<div class="chain-card" style="margin-bottom:6px">
            <div style="flex:1">
              <div class="chain-name">${escHtml(c.imp_id||c.chain||c.cmd||'')}</div>
              <div class="chain-cmd">${escHtml(c.imp_title||c.chain||'')}${ts?' — '+ts:''}</div>
            </div>
            ${c.lane?`<span class="pill p-${laneKey}">${escHtml(c.lane)}</span>`:''}
            <div class="chain-status" style="color:${okCol}">${escHtml(c.status||'')}</div>
          </div>`;
        }).join('');
      }
    }
  } catch(e) {}
}
async function exportMemory() {
  try {
    const r = await fetch('/api/memory/export', {method:'POST'});
    const d = await r.json();
    alert(d.ok ? `Exporté : ${d.path}` : d.error);
  } catch(e) { alert('Erreur export'); }
}

// ── IDEAS ─────────────────────────────────────────────────────────────────
async function loadIdeas() {
  try {
    const ideas = await fetch('/api/ideas').then(r => r.json());
    if (Array.isArray(ideas)) {
      S.ideas = ideas;
      S.ideaCounter = ideas.reduce((m, i) => Math.max(m, i.id || 0), 0);
      const badge = document.getElementById('badge-ideas');
      if (badge) badge.textContent = ideas.filter(i => !['applied','pipeline_done'].includes(i.status)).length;
      renderIdeas();
    }
  } catch(e) {}
}
function showIdeaModal() { document.getElementById('idea-modal').classList.add('open'); }
function filterIdeas(f) {
  S.ideaFilter = f;
  document.querySelectorAll('#idea-filters .filter-btn').forEach((b,i) => b.classList.toggle('active',['all','studio','ia','jv','backlog','wip'][i]===f));
  renderIdeas();
}
async function addIdea() {
  const title = document.getElementById('im-title').value.trim();
  if (!title) return;
  if (S.ideas.some(i => (i.title || '').toLowerCase() === title.toLowerCase())) {
    alert('Une idée avec ce titre existe déjà.');
    return;
  }
  const idea = {
    chain: document.getElementById('im-chain').value,
    status: 'backlog',
    title,
    roi: document.getElementById('im-roi').value,
    lane: document.getElementById('im-lane').value,
    desc: document.getElementById('im-desc').value.trim(),
    issue: document.getElementById('im-issue').value.trim()
  };
  closeModal('idea-modal');
  ['im-title','im-desc','im-issue'].forEach(id => document.getElementById(id).value='');
  try {
    await fetch('/api/ideas', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(idea)});
  } catch(e) {}
  await loadIdeas();
}
async function cycleIdeaStatus(id) {
  const idea = S.ideas.find(i => i.id === id);
  if (!idea) return;
  if (['applied', 'pipeline_done'].includes(idea.status)) return;
  const next = idea.status === 'backlog' ? 'wip' : idea.status === 'wip' ? 'done' : 'backlog';
  try {
    await fetch('/api/ideas/status', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({idea_id: String(id), status: next})});
  } catch(e) {}
  await loadIdeas();
}
function openIdeaInRoadmap(id) {
  const idea = S.ideas.find(i=>i.id===id);
  if (!idea) return;
  document.getElementById('rm-title').value = idea.title;
  document.getElementById('rm-context').value = idea.desc;
  document.getElementById('rm-chain').value = idea.chain;
  const det = document.querySelector('#page-ideas details');
  if (det) det.open = true;
  nav('ideas');
}
function renderIdeas() {
  const el = document.getElementById('ideas-grid');
  if (!el) return;
  const filtered = S.ideas.filter(i => {
    const f = S.ideaFilter;
    if (f==='all') return !['applied','pipeline_done'].includes(i.status);
    if (f==='backlog') return i.status==='backlog';
    if (f==='wip') return i.status==='wip';
    return i.chain===f && !['applied','pipeline_done'].includes(i.status);
  });
  el.innerHTML = filtered.map(idea => {
    const dotColor = idea.status==='wip'?'var(--amber)':['done','applied','pipeline_done'].includes(idea.status)?'var(--green)':'var(--border2)';
    return `<div class="idea-card chain-${idea.chain}">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:5px">
        <div style="width:7px;height:7px;border-radius:50%;background:${dotColor};margin-top:5px;flex-shrink:0"></div>
        <div style="flex:1">
          <div class="idea-title">${idea.title}</div>
          <div class="idea-tags">
            <span class="pill" style="background:var(--bg3);color:var(--text2)">${chainLabels[idea.chain]}</span>
            <span class="pill ${idea.lane==='safe'?'p-safe':idea.lane==='audit'?'p-audit':'p-human'}">${idea.lane==='safe'?'SAFE_AUTO':idea.lane==='audit'?'AUDIT_REQUIRED':'HUMAN_REQUIRED'}</span>
            <span class="pill ${roiColors[idea.roi]}">ROI ${idea.roi}</span>
            ${idea.issue?`<span class="pill" style="background:var(--blue-bg);color:var(--blue)">${idea.issue}</span>`:''}
          </div>
        </div>
      </div>
      ${idea.desc?`<div class="idea-desc">${idea.desc}</div>`:''}
      <div class="idea-actions">
        ${idea.status!=='applied'?`<button class="btn btn-sm" onclick="cycleIdeaStatus(${idea.id})">&#8635; Changer statut</button>`:''}
        ${!['applied','pipeline_done'].includes(idea.status)?`<button class="btn btn-sm btn-amber" onclick="startIdeaPipeline(${idea.id})" title="Qwen2.5-14B - pipeline 5 steps (~30s)">&#8599; Transformer en IMPs</button>`:''}
      </div>
    </div>`;
  }).join('') || '<div style="font-size:12px;color:var(--text3);padding:16px 0">Aucune idée dans ce filtre.</div>';
}

// ── CONFIG ────────────────────────────────────────────────────────────────
async function saveConfig() {
  const cfg = {
    repo: document.getElementById('cfg-repo').value,
    lm_host: document.getElementById('cfg-lmhost').value,
    model: document.getElementById('cfg-model').value,
  };
  try {
    const r = await fetch('/api/config', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cfg)});
    const d = await r.json();
    document.getElementById('cfg-status').textContent = d.ok ? '✓ Sauvegardé' : '✗ Erreur';
  } catch(e) { document.getElementById('cfg-status').textContent = '✗ Erreur'; }
}

// ── UTILS ─────────────────────────────────────────────────────────────────
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
async function updateNextAction() {
  try {
    const d = await fetch('/api/ledger-status').then(r => r.json());
    const nxt = d.next || {};
    const el = document.getElementById('next-action');
    const ln = document.getElementById('next-lane');
    if (el) el.textContent = nxt.id ? nxt.id + ' — ' + (nxt.title || '') : '—';
    if (ln) ln.textContent = nxt.lane || 'Ledger vide';
  } catch(e) {
    const el = document.getElementById('next-action');
    if (el) el.textContent = 'Erreur ledger';
  }
}

// ── CONFIG LOAD (B1/B6/B7/B8) ────────────────────────────────────────────
async function loadConfig() {
  try {
    const d = await fetch('/api/config').then(r => r.json());
    const setVal = (id, v) => { const e = document.getElementById(id); if (e && v != null) e.value = v; };
    setVal('cfg-repo',   d.repo);
    setVal('cfg-lmhost', d.lm_host);
    setVal('cfg-model',  d.lm_model);
    // B1 — tb-repo depuis config live
    const tbRepo = document.getElementById('tb-repo');
    if (tbRepo && d.repo) tbRepo.textContent = d.repo;
  } catch(e) {}
}

// ── CHAINS depuis backend (B2) ────────────────────────────────────────────
async function loadChains() {
  try {
    const d = await fetch('/api/chains').then(r => r.json());
    for (const [k, v] of Object.entries(d)) {
      if (CHAINS_DEF[k]) Object.assign(CHAINS_DEF[k], v);
      else CHAINS_DEF[k] = v;
    }
  } catch(e) {}
  renderChains();
}

// ── ARCHITECTURE IA (B3) ─────────────────────────────────────────────────
async function loadDatasetArch() {
  try {
    const s = await fetch('/api/studio-state').then(r => r.json());
    const body = document.getElementById('dataset-arch-body');
    if (!body || !s.surfaces) return;
    const SURFACE_MAP = {
      moteur_rust: {label:'Moteur Rust (Negamax+PST+Quiescence)', note:'IMP-014 timeout · eval.rs'},
      dataset:     {label:'Dataset pool',         note:'ACTIVE_DATASET.txt'},
      autopilote:  {label:'Coach v0 (LLM)',        note:'fd88b97 · LM Studio local'},
      lora:        {label:'LoRA / Neural',          note:'lora_config.yaml + golden_examples'},
      benchmark:   {label:'Benchmark',             note:'latest_benchmark_summary.json'},
    };
    const pillFor = v => {
      const cls = v==='IMPLEMENTED'?'p-impl':v==='PARTIAL'?'p-audit':'p-todo';
      const lbl = v==='IMPLEMENTED'?'✅ ACTIF':v==='PARTIAL'?'⚠ PARTIEL':'—';
      return '<span class="pill '+cls+'">'+lbl+'</span>';
    };
    body.innerHTML = Object.entries(SURFACE_MAP).map(([k, {label, note}]) => {
      const st = s.surfaces[k] || 'NOT_STARTED';
      return '<tr><td>'+label+'</td><td>'+pillFor(st)+'</td><td style="color:var(--text3)">'+note+'</td></tr>';
    }).join('');
  } catch(e) {}
}

// ── LIGUE BRACKET dynamique (B5) ─────────────────────────────────────────
async function loadLigue() {
  try {
    const d = await fetch('/api/metrics').then(r => r.json());
    const elo = d.elo || {};
    const T = elo.teacher_uci ?? 1424, H = elo.heuristic ?? 1200, N = elo.neural ?? 975;
    const dateTxt = elo.date ? ' <span style="font-size:9px;color:var(--text3)">mesuré '+elo.date.slice(0,10)+'</span>' : '';
    const bracket = document.getElementById('ligue-bracket');
    if (!bracket) return;
    const matchDone = (a, aE, b, bE) =>
      '<div class="bracket-match match-done"><span>'+a+' vs '+b+'</span>' +
      '<span style="font-weight:700">'+aE+(aE>=bE?' &gt; ':' &lt; ')+bE+' ✓'+dateTxt+'</span></div>';
    bracket.innerHTML =
      '<div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Terminés</div>' +
      matchDone('teacher_uci', T, 'heuristic', H) +
      matchDone('teacher_uci', T, 'neural', N) +
      '<div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin:8px 0 6px">Prochain</div>' +
      '<div class="bracket-match match-next"><span>heuristic vs neural</span><span>⏳ planifié</span></div>' +
      '<div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin:8px 0 6px">Planifiés</div>' +
      '<div class="bracket-match match-planned"><span>Nouvelle saison</span><span>HumanGate requis</span></div>';
  } catch(e) {}
}

// ── INIT ──────────────────────────────────────────────────────────────────
document.getElementById('mem-count').textContent = S.memory.fusions.length;
updateNextAction();
setInterval(updateNextAction, 60000);
loadIdeas();

// Commit message default
const commitEl = document.getElementById('commit-msg');
if (commitEl) commitEl.value = 'docs: mise à jour ' + new Date().toISOString().slice(0,10) + ' — session autopilote';

// Charger mémoire depuis API (renderMemory gère tout)
renderMemory();

// Charger session context au boot
loadSessionContext();
loadMetrics();
loadPiloteSurfaces();
loadIssuesHigh();
// B1/B6/B7/B8 — config live au boot
loadConfig();
// B2 — synchroniser CHAINS_DEF depuis backend au boot
loadChains();
// B3 — Architecture IA dynamique au boot
loadDatasetArch();

// ── STREAMING ─────────────────────────────────────────────────────────────
async function lmStreamCall(prompt, system, maxTokens, outputEl, statusEl) {
  try {
    const r = await fetch('/api/lm-stream', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({prompt, system, max_tokens: maxTokens})
    });
    if (!r.ok || !r.body) return null;
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buf = '', full = '';
    statusEl.textContent = '⟳ Génération en cours...';
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      buf += decoder.decode(value, {stream: true});
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const d = line.slice(6).trim();
        if (d === '[DONE]') { statusEl.textContent = '✓ Réponse reçue'; return full; }
        try {
          const c = JSON.parse(d);
          if (c.content) { full += c.content; outputEl.textContent = full; outputEl.scrollTop = outputEl.scrollHeight; }
          if (c.error) { statusEl.textContent = '✗ ' + c.error; return full; }
        } catch(e) {}
      }
    }
    statusEl.textContent = '✓ Réponse reçue';
    return full;
  } catch(e) { return null; }
}

// ── LEDGER STATUS (P2/P3) ─────────────────────────────────────────────────
async function checkLedger() {
  try {
    const r = await fetch('/api/ledger-status');
    const d = await r.json();
    const el = document.getElementById('tb-ledger');
    if (el) el.textContent = (d.open ?? '--') + ' open / ' + (d.closed ?? '--') + ' closed';
  } catch(e) {}
  // Fix 4 — Sprint date depuis studio-state
  try {
    const s = await fetch('/api/studio-state').then(r => r.json());
    const spEl = document.getElementById('tb-sprint');
    if (spEl && s.sprint_objective) spEl.textContent = s.sprint_objective.slice(0, 35);
  } catch(e) {}
}
setInterval(checkLedger, 30000); checkLedger();

// ── HEALTH CHECK (P4) ─────────────────────────────────────────────────────
async function checkHealth() {
  try {
    const r = await fetch('/api/health');
    const d = await r.json();
    const v = document.getElementById('hc-venv');
    const l = document.getElementById('hc-lm');
    if (v) { v.className = 'hc-dot ' + (d.venv ? 'ok' : 'ko'); }
    if (l) { l.className = 'hc-dot ' + (d.lm_studio ? 'ok' : 'ko'); }
  } catch(e) {}
}
setInterval(checkHealth, 30000); checkHealth();

// ── STALENESS (P8) ────────────────────────────────────────────────────────
async function checkStaleness() {
  try {
    const r = await fetch('/api/staleness');
    const d = await r.json();
    const banner = document.getElementById('staleness-banner');
    const text   = document.getElementById('staleness-text');
    if (!banner) return;
    const stale = (d.state_days != null && d.state_days > 7) || (d.history_days != null && d.history_days > 3);
    if (stale) {
      const parts = [];
      if (d.state_days > 7)   parts.push('CURRENT_STATE.md non mis à jour depuis ' + d.state_days + 'j');
      if (d.history_days > 3) parts.push('CHAIN_HISTORY.jsonl non mis à jour depuis ' + d.history_days + 'j');
      text.textContent = '⚠ ' + parts.join(' — ') + ' — penser à synchroniser';
      banner.style.display = 'block';
    } else {
      banner.style.display = 'none';
    }
  } catch(e) {}
}
setInterval(checkStaleness, 3600000); checkStaleness();

// ── FORBIDDEN MODAL (P8) ──────────────────────────────────────────────────
function showForbiddenModal(label, cmd) {
  document.getElementById('forbidden-cmd-display').textContent = label + '\n' + cmd;
  document.getElementById('forbidden-modal').classList.add('open');
}

// ── MÉTRIQUES PAGE (P5) ───────────────────────────────────────────────────
async function loadMetrics() {
  try {
    const r = await fetch('/api/metrics');
    const d = await r.json();
    const nowMs = Date.now();
    // ELO
    const elo = d.elo || {};
    const setEl = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v ?? '—'; };
    setEl('elo-teacher', elo.teacher_uci ?? 1424);
    setEl('elo-heuristic', elo.heuristic ?? 1200);
    setEl('elo-neural', elo.neural ?? 975);
    if (elo.date) {
      const days = Math.floor((nowMs - new Date(elo.date)) / 86400000);
      const dateEl = document.getElementById('elo-date');
      if (dateEl) dateEl.innerHTML = elo.date.slice(0,10) + (days > 7 ? ' <span class="pill p-blocked">STALE ' + days + 'j</span>' : '');
    }
    // P1/P3 — signal fallback si aucun benchmark mesuré
    const fbNote = document.getElementById('elo-fallback-note');
    if (fbNote) fbNote.style.display = d.is_fallback ? 'block' : 'none';
    // Draw rate
    const pct = d.draw_rate != null ? Math.round(d.draw_rate * 100) : null;
    const color = pct == null ? 'var(--text3)' : pct > 50 ? 'var(--red)' : pct > 20 ? 'var(--amber)' : 'var(--green)';
    const pctEl = document.getElementById('draw-pct');
    const lblEl = document.getElementById('draw-label');
    const barEl = document.getElementById('draw-bar');
    if (pctEl) { pctEl.textContent = pct != null ? pct + '%' : '—'; pctEl.style.color = color; }
    if (lblEl) lblEl.textContent = pct == null ? 'Non mesuré' : pct > 50 ? '🔴 CRITIQUE' : pct > 20 ? '🟡 ÉLEVÉ' : '🟢 OK';
    if (barEl) { barEl.style.width = (pct ?? 0) + '%'; barEl.style.background = color; }
    // Kaizen
    setEl('kz-open', d.open ?? '—');
    setEl('kz-closed', d.closed ?? '—');
    // Pilote page ELO stat
    const pT = document.getElementById('pilote-elo-teacher');
    if (pT) pT.textContent = elo.teacher_uci ?? 1424;
    const pSub = document.getElementById('pilote-elo-sub');
    if (pSub) pSub.textContent = 'Neural : ' + (elo.neural ?? 975) + ' · Draw rate ' + (pct != null ? pct + '%' : '—');
    // Ligue division ELO pills
    const lT = document.getElementById('ligue-elo-teacher');
    if (lT) lT.textContent = 'teacher_uci ELO ' + (elo.teacher_uci ?? 1424);
    const lH = document.getElementById('ligue-elo-heuristic');
    if (lH) lH.textContent = 'heuristic ELO ' + (elo.heuristic ?? 1200);
    const lN = document.getElementById('ligue-elo-neural');
    if (lN) lN.textContent = 'neural ELO ' + (elo.neural ?? 975);
  } catch(e) {}
}

// ── DATASET PAGE (P6) ─────────────────────────────────────────────────────
async function loadDataset() {
  try {
    const r = await fetch('/api/dataset-status');
    const d = await r.json();
    const activeCard = document.getElementById('dataset-active-card');
    if (activeCard) {
      const status = d.corrupt ? '🔴 CORROMPU' : d.active_exists ? '🟢 SAIN' : '🟡 INCONNU';
      const col = d.corrupt ? 'var(--red)' : d.active_exists ? 'var(--green)' : 'var(--amber)';
      activeCard.innerHTML = '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="font-size:20px;font-weight:800;font-family:var(--font-d);color:' + col + '">' + status + '</div>' +
        '<div style="font-size:11px;color:var(--text2);font-family:var(--font-m);word-break:break-all">' + escHtml(d.active_path || 'Chemin inconnu') + '</div>' +
        '</div>' + (d.corrupt_reason ? '<div style="font-size:11px;color:var(--red);margin-top:6px">Raison : ' + escHtml(d.corrupt_reason) + '</div>' : '');
    }
    const poolsCard = document.getElementById('dataset-pools-card');
    if (poolsCard) {
      poolsCard.innerHTML = d.pools && d.pools.length ?
        '<table><thead><tr><th>Nom</th><th>Taille</th></tr></thead><tbody>' +
        d.pools.map(p => '<tr><td>' + escHtml(p.name) + '</td><td style="color:var(--text2)">' + escHtml(p.size) + '</td></tr>').join('') +
        '</tbody></table>' : '<div style="font-size:12px;color:var(--text3)">Aucun pool trouvé</div>';
    }
  } catch(e) {}
}

// ── SESSION CONTEXT (P15) ─────────────────────────────────────────────────
async function loadSessionContext() {
  try {
    const r = await fetch('/api/session-context');
    const d = await r.json();
    renderSessionContext(d);
  } catch(e) {}
}

function renderSessionContext(d) {
  const el = document.getElementById('session-ctx-card');
  if (!el) return;
  const history = d.chain_history || [];
  const ledger  = d.ledger || {};
  const fusions = d.recent_fusions || [];
  if (!history.length && !ledger.open && !ledger.closed) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text3)">Aucune session précédente trouvée.</div>';
    return;
  }
  const last = history[0] || {};
  const histHtml = last.ts ? '<div class="sess-lbl">Dernière chaîne</div>' +
    '<div class="sess-val">' + escHtml(last.chain || last.cmd || 'N/A') +
    ' — <span style="color:' + (last.status==='ok'?'var(--green)':'var(--amber)') + '">' + escHtml(last.status||'?') + '</span>' +
    '<div style="font-size:10px;color:var(--text3)">' + (last.ts||'').slice(0,19).replace('T',' ') + '</div></div>' : '';
  const ledgerHtml = ledger.open != null ? '<div class="sess-lbl" style="margin-top:8px">Ledger</div>' +
    '<div class="sess-val"><span style="color:var(--amber)">' + ledger.open + ' open</span> / <span style="color:var(--green)">' + ledger.closed + ' closed</span>' +
    (ledger.next && ledger.next.title ? '<br><span style="font-size:10px;color:var(--text3)">Next: ' + escHtml(ledger.next.title) + '</span>' : '') + '</div>' : '';
  const stateHtml = d.state_file_mtime ? '<div class="sess-lbl" style="margin-top:8px">CURRENT_STATE.md</div>' +
    '<div class="sess-val" style="font-size:11px">' + d.state_file_mtime.slice(0,19).replace('T',' ') + '</div>' : '';
  const fusHtml = fusions.length ? '<div class="sess-lbl">Dernières fusions</div>' +
    fusions.slice(0,3).map(f => '<div style="font-size:11px;color:var(--text2);padding:2px 0;border-bottom:1px solid var(--border)">' +
      escHtml((f.content||'').slice(0,80)) + '…</div>').join('') : '';
  el.innerHTML = '<div class="sess-grid"><div>' + histHtml + ledgerHtml + stateHtml + '</div>' +
    '<div>' + fusHtml + '<button class="btn btn-amber btn-sm" style="margin-top:8px" onclick="lmSessionSummary()">⚡ Résumé session via Devstral</button>' +
    '<div id="session-summary-out" style="display:none;margin-top:8px" class="roadmap-out"></div></div></div>';
}

async function lmSessionSummary() {
  const el = document.getElementById('session-summary-out');
  if (!el) return;
  el.style.display = 'block';
  el.textContent = '';
  const sink = {get textContent(){return '';}, set textContent(v){}};
  try {
    const ctxR = await fetch('/api/session-context');
    const ctx  = await ctxR.json();
    const hist = (ctx.chain_history||[]).map(e => '- ' + (e.ts||'').slice(0,19) + ' ' + escHtml(e.chain||e.cmd||'') + ' → ' + escHtml(e.status||'')).join('\n');
    const next = (ctx.ledger&&ctx.ledger.next&&ctx.ledger.next.title) || 'inconnu';
    const prompt = 'Dernières chaînes :\n' + hist + '\n\nProchaine action : ' + next + '\n\nRésume en 5 bullets ce qui a été fait et ce qu\'il faut faire ensuite. Sois concis.';
    const sys = 'Tu es le manager du Tactical Chess Studio. Sois concis. claim_verdict: NO_CLAIM_ALLOWED.';
    const res = await lmStreamCall(prompt, sys, 400, el, sink);
    if (res === null) {
      el.textContent = '⟳ Génération...';
      const r = await fetch('/api/lm-ask', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,system:sys,max_tokens:400})});
      const d = await r.json();
      el.textContent = d.response || d.error || 'Pas de réponse';
    }
  } catch(e) { el.textContent = 'Erreur : ' + e.message; }
}

// ── Fix 5 — PILOTE SURFACES dynamiques ───────────────────────────────────
async function loadPiloteSurfaces() {
  try {
    const s = await fetch('/api/studio-state').then(r => r.json());
    const body = document.getElementById('pilote-surfaces-body');
    if (!body || !s.surfaces) return;
    const LABELS = {
      moteur_rust: 'Moteur Rust', dataset: 'Dataset actif',
      autopilote: 'Autopilote', lora: 'LoRA', benchmark: 'Benchmark'
    };
    const pillFor = v => {
      const cls = v==='IMPLEMENTED'?'p-impl':v==='PARTIAL'?'p-audit':'p-todo';
      return '<span class="pill '+cls+'">'+escHtml(v||'—')+'</span>';
    };
    // P2 — merger 5 lignes dynamiques + 5 lignes statiques (NeuralAgent, Coach, etc.)
    const dynamicRows = Object.entries(LABELS).map(([k, label]) =>
      '<tr><td>'+label+'</td><td>'+pillFor(s.surfaces[k]||'UNKNOWN')+'</td></tr>'
    ).join('');
    const staticRows = [
      '<tr><td>NeuralAgent câblé</td><td><span class="pill p-done">DONE c0ebf62</span></td></tr>',
      '<tr><td>Coach v0 (LLM)</td><td><span class="pill p-done">DONE fd88b97</span></td></tr>',
      '<tr><td>EvaluationSystem</td><td><span class="pill p-done">DONE T2–T6</span></td></tr>',
      '<tr><td>Chess 960</td><td><span class="pill p-blocked">BLOCKED HG</span></td></tr>',
      '<tr><td>CI/PR/push</td><td><span class="pill p-blocked">BLOCKED budget/CI</span></td></tr>',
    ].join('');
    body.innerHTML = dynamicRows + staticRows;
    const div = document.getElementById('pilote-repo-divider');
    if (div && s.sprint_objective) div.textContent = 'État repo — ' + s.sprint_objective.slice(0, 30);
  } catch(e) {}
}

// ── Fix 7 — ISSUES HIGH dynamiques ───────────────────────────────────────
async function loadIssuesHigh() {
  try {
    const d = await fetch('/api/ledger-status').then(r => r.json());
    const blocked = (d.open_imps || []).filter(i =>
      i.lane === 'FORBIDDEN' || i.lane === 'HUMAN_REQUIRED' || i.lane === 'AUDIT_REQUIRED'
    );
    const el  = document.getElementById('pilote-issues-count');
    const sub = document.getElementById('pilote-issues-labels');
    if (el)  el.textContent  = blocked.length;
    if (sub) sub.textContent = blocked.slice(0, 5).map(i => i.id).join(' · ') || 'Aucune issue bloquante';
  } catch(e) {}
}

// ── FUSION ────────────────────────────────────────────────────────────────
async function launchFusion() {
  const btn = document.getElementById('btn-fusion');
  const out = document.getElementById('fusion-out');
  if (!out) return;
  if (btn) { btn.disabled = true; btn.textContent = '⟳ Fusion...'; }
  out.style.display = 'block';
  out.textContent = '⟳ Devstral génère la fusion...';
  try {
    const r = await fetch('/api/fusion-cmd', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({backend: 'devstral', mode: 'full'})
    });
    const d = await r.json();
    const result = d.result || {};
    if (result.fusions && result.fusions.length) {
      const typeColors = {'IDEAS×LEDGER':'var(--blue)','ROADMAP×RÉALITÉ':'var(--amber)','ROI_CASCADE':'var(--green)','REDTEAM':'var(--red)'};
      let html = '';
      for (const f of result.fusions) {
        const col = typeColors[f.type] || 'var(--text2)';
        const findings = (f.findings||[]).map(x=>`<li>${escHtml(x)}</li>`).join('');
        const contras  = (f.contradictions||[]).map(x=>escHtml(x)).join(' · ');
        html += `<div style="border-left:3px solid ${col};margin-bottom:8px;padding:8px 12px;background:var(--bg3);border-radius:4px">
          <div style="font-weight:700;color:${col};font-size:11px;margin-bottom:4px">${escHtml(f.type||'')}</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.6">${escHtml(f.synthese||f.summary||'')}</div>
          ${findings?`<ul style="margin:4px 0 0 14px;font-size:11px;color:var(--text3)">${findings}</ul>`:''}
          ${contras?`<div style="font-size:10px;color:var(--red);margin-top:3px">⚠ ${contras}</div>`:''}
        </div>`;
      }
      if (result.prochaine_action) html += `<div style="font-size:12px;color:var(--amber);padding:6px 0">→ <strong>Prochaine action :</strong> ${escHtml(result.prochaine_action)}</div>`;
      if (d.fusion_log_appended) html += `<div style="font-size:10px;color:var(--green);margin-top:4px">✓ FUSION_LOG.jsonl mis à jour · claim_verdict: NO_CLAIM_ALLOWED</div>`;
      out.innerHTML = html;
      if (d.fusion_log_appended) renderMemory();
    } else if (result.sections && result.sections.length) {
      out.innerHTML = result.sections.map(s=>`<div style="margin-bottom:10px;padding:8px 12px;background:var(--bg3);border-radius:4px;border-left:3px solid var(--amber);white-space:pre-wrap;font-size:12px;color:var(--text2)">${escHtml(s)}</div>`).join('')
        + (d.fusion_log_appended ? '<div style="font-size:10px;color:var(--green);margin-top:4px">✓ FUSION_LOG.jsonl mis à jour · claim_verdict: NO_CLAIM_ALLOWED</div>' : '');
      if (d.fusion_log_appended) renderMemory();
    } else {
      out.textContent = result.raw || JSON.stringify(result, null, 2) || 'Pas de résultat';
    }
  } catch(e) {
    out.textContent = 'Erreur : ' + e.message;
  }
  if (btn) { btn.disabled = false; btn.textContent = '⬡ Fusion'; }
}

// ── CEO BRIEF v2 ──────────────────────────────────────────────────────────
function _ceoLanePill(lane) {
  const cls = (lane||'').toLowerCase().includes('safe') ? 'safe' : 'audit';
  return `<span class="pill p-${cls}">${escHtml(lane||'')}</span>`;
}
function _ceoLaneHtml(label, l, laneKey) {
  if (!l) return '';
  const startBtn = laneKey
    ? `<button class="btn btn-green btn-sm" style="margin-top:5px" onclick="autoloopStart('${laneKey}')" title="Qwen2.5-14B - autoloop lane">&#9654; autoloop</button>`
    : '';
  const action = l.imp_id
    ? `<span style="font-family:var(--font-m);color:var(--amber)">${escHtml(l.imp_id)}</span> ${escHtml(l.title||'')}`
    : escHtml(l.next_action || l.title || '—');
  return `<div style="margin:6px 0 2px 0;font-size:11px;font-weight:600;color:var(--text3)">${escHtml(label)}</div>`
    + `<div style="margin-bottom:4px">${action} ${_ceoLanePill(l.lane_tag||l.lane)}</div>`
    + `<div style="font-size:10px;color:var(--text2)">`
    + (l.blocker  ? `⚠ Blocker: ${escHtml(l.blocker)}<br>` : '')
    + (l.risk     ? `Risk: ${escHtml(l.risk)}<br>` : '')
    + (l.recommendation ? `Rec: ${escHtml(l.recommendation)}` : '')
    + `</div>`
    + startBtn;
}
async function loadCeoBrief() {
  const out = document.getElementById('ceo-brief-out');
  out.style.display = 'block';
  out.innerHTML = '<span style="color:var(--text3)">Devstral analyse 5 lanes...</span>';
  try {
    const d = await fetch('/api/ceo-brief', {method:'POST',
      headers:{'Content-Type':'application/json'}, body:'{}'}).then(r=>r.json());
    const b = d.brief || {};
    const lanes = b.lanes;
    if (lanes) {
      const obj = escHtml(b.sprint_objective || d.sprint_objective || '');
      out.innerHTML = (obj ? `<div style="font-size:11px;color:var(--text3);margin-bottom:6px">Sprint : <b>${obj}</b></div>` : '')
        + `<div style="border-left:2px solid var(--amber);padding-left:8px">`
        + _ceoLaneHtml('Rocky / Moteur', lanes.rocky_moteur, 'rocky_moteur')
        + _ceoLaneHtml('Studio', lanes.studio, 'studio')
        + _ceoLaneHtml('Jeux', lanes.jeux, 'jeux')
        + _ceoLaneHtml('IA / Apprentissage', lanes.ia_apprentissage, 'ia_apprentissage')
        + _ceoLaneHtml('Décisions pendantes', lanes.decisions_pendantes, 'decisions_pendantes')
        + `</div>`
        + `<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px">`
        + `<button class="btn btn-sm btn-green" onclick="nav('workflow');setTimeout(loadCockpitLanes,120)">`
        + `→ Appliquer au cockpit</button>`
        + `</div>`;
    } else {
      out.innerHTML = `<pre style="font-size:10px">${escHtml(JSON.stringify(b,null,2))}</pre>`
        + `<div style="margin-top:8px">`
        + `<button class="btn btn-sm btn-green" onclick="nav('workflow');setTimeout(loadCockpitLanes,120)">`
        + `→ Appliquer au cockpit</button></div>`;
    }
  } catch(e) {
    out.innerHTML = '<span style="color:var(--red)">Erreur CEO Brief</span>';
  }
}

// ── CLAUDE MODE — 3 PASSES ────────────────────────────────────────────────
// supprimé — système local Devstral uniquement
async function launchFusionComplete() { return; }

// ── IMP TRIAGE PAR DOMAINE ────────────────────────────────────────────────
const _RD_LABELS = {
  rocky_moteur: 'Rocky / Moteur', ia_apprentissage: 'IA / ML',
  studio: 'Studio / Infra', jeux: 'Jeux', decisions_pendantes: 'Décisions pendantes',
};
const _RD_COLORS = {
  rocky_moteur: 'var(--green)', ia_apprentissage: 'var(--blue)',
  studio: 'var(--amber)', jeux: 'var(--red)', decisions_pendantes: '#888',
};

function _rdImpPill(status) {
  if (status === 'DEFERRED') return '<span class="pill" style="background:rgba(120,120,120,.15);color:#888">DEFERRED</span>';
  return '<span class="pill p-impl">OPEN</span>';
}

function _rdDomainCard(key, imps) {
  const label = _RD_LABELS[key] || key;
  const color = _RD_COLORS[key] || 'var(--text3)';
  const rows = imps.length
    ? imps.map(i => `<tr><td style="font-family:var(--font-m);font-size:11px;color:var(--amber)">${escHtml(i.id||'')}</td>`
        + `<td style="font-size:11px">${escHtml(i.title||'')}</td>`
        + `<td>${_rdImpPill(i.status)}</td></tr>`).join('')
    : `<tr><td colspan="3" style="color:var(--text3);padding:6px">(aucun IMP actif)</td></tr>`;
  return `<div class="card" style="padding:10px;border-left:3px solid ${color}">`
    + `<div style="font-size:11px;font-weight:700;color:${color};margin-bottom:6px">${escHtml(label)}`
    + ` <span style="font-size:10px;font-weight:400;color:var(--text3)">${imps.length} IMP(s)</span></div>`
    + `<table style="width:100%"><thead><tr><th>ID</th><th>Titre</th><th>Statut</th></tr></thead><tbody>${rows}</tbody></table>`
    + `</div>`;
}

async function loadRoadmapDomaine() {
  const el = document.getElementById('rd-domains');
  const tot = document.getElementById('rd-total');
  if (!el) return;
  el.innerHTML = '<div class="card" style="padding:10px"><span style="color:var(--text3)">Chargement...</span></div>';
  try {
    const d = await fetch('/api/imp-triage').then(r => r.json());
    const doms = d.domains || {};
    const order = ['rocky_moteur','ia_apprentissage','studio','jeux','decisions_pendantes'];
    el.innerHTML = order.map(k => _rdDomainCard(k, doms[k] || [])).join('');
    if (tot) tot.textContent = `${d.total_open || 0} IMP(s) actifs · claim_verdict: NO_CLAIM_ALLOWED`;
  } catch(e) {
    el.innerHTML = '<div class="card" style="padding:10px"><span style="color:var(--red)">Erreur chargement triage</span></div>';
  }
}

async function loadDomainImps(domain, elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  try {
    const d = await fetch('/api/imp-triage').then(r => r.json());
    const items = (d.domains || {})[domain] || [];
    if (!items.length) {
      el.innerHTML = '<div style="font-size:11px;color:var(--text3);padding:6px">(aucun IMP actif)</div>';
      return;
    }
    const color = _RD_COLORS[domain] || 'var(--text3)';
    const rows = items.map(i => `<tr><td style="font-family:var(--font-m);font-size:11px;color:var(--amber)">${escHtml(i.id||'')}</td>`
      + `<td style="font-size:11px">${escHtml(i.title||'')}</td>`
      + `<td>${_rdImpPill(i.status)}</td></tr>`).join('');
    el.innerHTML = `<div class="divider">IMPs actifs (${items.length})</div>`
      + `<div class="card" style="padding:10px;border-left:3px solid ${color}">`
      + `<table style="width:100%"><thead><tr><th>ID</th><th>Titre</th><th>Statut</th></tr></thead><tbody>${rows}</tbody></table>`
      + `</div>`;
  } catch(e) {
    el.innerHTML = '<div style="font-size:11px;color:var(--red);padding:6px">Erreur chargement IMPs</div>';
  }
}

async function loadCeoTriage() {
  const out = document.getElementById('ceo-triage-out');
  if (!out) return;
  out.style.display = 'block';
  out.innerHTML = '<span style="color:var(--text3)">Chargement triage statique...</span>';
  try {
    const d = await fetch('/api/imp-triage').then(r => r.json());
    const doms = d.domains || {};
    const order = ['rocky_moteur','ia_apprentissage','studio','jeux','decisions_pendantes'];
    const lines = order.map(k => {
      const imps = doms[k] || [];
      const color = _RD_COLORS[k] || 'var(--text3)';
      const label = _RD_LABELS[k] || k;
      const summary = imps.length ? imps.map(i => escHtml(i.id + (i.title ? ' — '+i.title.substring(0,40) : ''))).join('<br>') : '(aucun)';
      return `<div style="margin:4px 0"><span style="font-size:10px;font-weight:700;color:${color}">${escHtml(label)}</span>`
        + ` <span style="font-size:10px;color:var(--text3)">(${imps.length})</span><br>`
        + `<span style="font-size:10px;color:var(--text2);padding-left:8px">${summary}</span></div>`;
    });
    out.innerHTML = `<div style="border-left:2px solid var(--border);padding-left:8px">${lines.join('')}</div>`
      + `<div style="font-size:9px;color:var(--text3);margin-top:6px">claim_verdict: NO_CLAIM_ALLOWED · ${d.total_open||0} actifs</div>`;
  } catch(e) {
    out.innerHTML = '<span style="color:var(--red)">Erreur triage</span>';
  }
}

// ── VISION (IMP-B1) ───────────────────────────────────────────────────────
function _visionRelTime(dt) {
  const diff = Date.now() - dt.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

async function loadVision() {
  const lanesEl  = document.getElementById('vision-lanes');
  const sprintEl = document.getElementById('vision-sprint');
  const lastEl   = document.getElementById('vision-last-imp');
  const ageEl    = document.getElementById('vision-imp-age');
  const hgBlk    = document.getElementById('vision-hg-blk');
  const hgBadge  = document.getElementById('badge-hg-vision');
  if (!lanesEl) return;
  let d;
  try { d = await fetch('/api/vision-state').then(r => r.json()); }
  catch(e) { lanesEl.innerHTML = '<div style="color:var(--text3);font-size:12px">Erreur chargement vision-state</div>'; return; }
  const META = {
    rocky:  {label:'ROCKY',  ico:'💻'},
    jeux:   {label:'JEUX',   ico:'🎮'},
    agent:  {label:'AGENT',  ico:'🤖'},
    studio: {label:'STUDIO', ico:'🏭'},
  };
  lanesEl.innerHTML = '';
  for (const [key, meta] of Object.entries(META)) {
    const lane  = (d.lanes || {})[key] || {phase:-1, phases:[], milestone:''};
    const ph    = typeof lane.phase === 'number' ? lane.phase : -1;
    const total = (lane.phases || []).length || 1;
    const filled = Math.max(0, ph);
    const bars  = Array.from({length: total}, (_, i) =>
      `<span style="color:${i < filled ? 'var(--amber)' : 'var(--border)'};font-size:14px">█</span>`
    ).join('');
    const phLabel = ph >= 0 ? `Phase ${ph + 1}` : 'Non démarré';
    const phName  = ph >= 0 && lane.phases[ph] ? ` · ${lane.phases[ph]}` : '';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--bg2);border-radius:6px;border:1px solid var(--border)';
    row.innerHTML =
      `<span style="font-size:15px">${meta.ico}</span>`
      + `<span style="width:48px;font-size:10px;font-weight:700;letter-spacing:.06em;color:var(--text1)">${meta.label}</span>`
      + `<span style="font-family:monospace;letter-spacing:-2px">${bars}</span>`
      + `<span style="font-size:10px;color:var(--text2);flex:1">${escHtml(phLabel + phName)}</span>`
      + `<span style="font-size:9px;color:var(--text3);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(lane.milestone || '')}</span>`;
    lanesEl.appendChild(row);
  }
  if (sprintEl) sprintEl.textContent = d.sprint || '—';
  if (lastEl && d.last_closed_imp && d.last_closed_imp.id) {
    const imp = d.last_closed_imp;
    lastEl.textContent = imp.id + (imp.title ? ' — ' + imp.title : '');
    if (ageEl && imp.closed_session) {
      const dt = new Date(imp.closed_session);
      ageEl.textContent = isNaN(dt.getTime()) ? imp.closed_session : _visionRelTime(dt);
    }
  }
  const pending = !!d.humangate_pending;
  if (hgBlk)   hgBlk.style.display   = pending ? 'flex'   : 'none';
  if (hgBadge) hgBadge.style.display = pending ? 'inline' : 'none';
  // IMP-C2 : métriques
  const m = d.metrics || {};
  const eloTeacher = document.getElementById('vision-elo-teacher');
  const eloSub     = document.getElementById('vision-elo-sub');
  const drawRateEl = document.getElementById('vision-draw-rate');
  const drawBadge  = document.getElementById('vision-draw-badge');
  const velEl      = document.getElementById('vision-velocity');
  const kaizenPct  = document.getElementById('vision-kaizen-pct');
  const byLaneEl   = document.getElementById('vision-by-lane');
  if (eloTeacher) eloTeacher.textContent = m.elo_teacher != null ? m.elo_teacher : '—';
  if (eloSub) eloSub.textContent = 'Heuristique ' + (m.elo_heuristic != null ? m.elo_heuristic : '—') + ' · Neural ' + (m.elo_neural != null ? m.elo_neural : '—');
  if (drawRateEl) drawRateEl.textContent = m.draw_rate_pct != null ? m.draw_rate_pct + '%' : '—';
  if (drawBadge)  drawBadge.style.display = m.draw_rate_warn ? 'inline' : 'none';
  if (velEl) velEl.textContent = m.velocity != null ? m.velocity.toFixed(3) : '—';
  if (kaizenPct) kaizenPct.textContent = m.kaizen_pct_closed != null ? m.kaizen_pct_closed : '—';
  if (byLaneEl && m.kaizen_by_lane) {
    byLaneEl.innerHTML = Object.entries(m.kaizen_by_lane)
      .map(([k,v]) => `<span style="color:var(--text3)">${k}:</span> <b>${v}</b>`)
      .join(' &nbsp;·&nbsp; ') || '—';
  }
}

// ── SYNC & COMMIT (P10) ───────────────────────────────────────────────────
async function showGitStatus() {
  const out = document.getElementById('git-status-out');
  if (!out) return;
  out.style.display = 'block';
  out.textContent = 'Chargement git status...';
  try {
    const r = await fetch('/api/git-status', {method:'POST'});
    const d = await r.json();
    out.textContent = d.output || 'Aucun fichier modifié';
  } catch(e) { out.textContent = 'Erreur git status'; }
}

async function runDocHygiene() {
  const out = document.getElementById('git-status-out');
  if (!out) return;
  out.style.display = 'block';
  out.textContent = 'Audit hygiène en cours...';
  try {
    const r = await fetch('/api/doc-hygiene', {method:'POST'});
    const d = await r.json();
    out.textContent = d.output || 'Audit terminé (rc=' + d.rc + ')';
  } catch(e) { out.textContent = 'Erreur audit'; }
}

function copyGitCmd() {
  const msg = (document.getElementById('commit-msg')?.value||'').trim() ||
    ('docs: mise à jour ' + new Date().toISOString().slice(0,10) + ' — session autopilote');
  const cmd = 'git add -A && git commit -m "' + msg + '"';
  const btn = event.currentTarget;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(cmd).then(() => {
      const orig = btn.textContent;
      btn.textContent = '✓ Copié!';
      setTimeout(() => btn.textContent = orig, 2000);
    }).catch(() => prompt('Copiez manuellement :', cmd));
  } else {
    prompt('Copiez manuellement :', cmd);
  }
}

function copyCmd(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const val = el.value;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(val).then(() => {
      const btn = el.parentElement.querySelector('.btn');
      if (btn) { const t = btn.textContent; btn.textContent = '✓'; setTimeout(() => btn.textContent = t, 1500); }
    }).catch(() => prompt('Copiez manuellement :', val));
  } else {
    prompt('Copiez manuellement :', val);
  }
}

// ── AGENTS ────────────────────────────────────────────────────────────────
const AGENTS_DEF = [
  {id:'teacher_uci', label:'teacher_uci', icon:'♟', color:'var(--amber)',
   arch:'Search · Stockfish', dataset:'pool_2400.jsonl', status:'STABLE',
   tags:['Reference', 'Alpha']},
  {id:'heuristic',   label:'heuristic',   icon:'⚙', color:'var(--blue)',
   arch:'Search only · eval.rs', dataset:'Heuristique pure', status:'STABLE',
   tags:['Beta', 'SAFE_AUTO']},
  {id:'neural',      label:'neural',      icon:'🧠', color:'var(--text2)',
   arch:'Search + Neural · PyTorch', dataset:'pool_2400.jsonl', status:'WEAK',
   tags:['Beta', 'AUDIT_REQUIRED', 'draw_rate ⚠']},
];

async function loadAgents() {
  const grid = document.getElementById('agents-grid');
  if (!grid) return;
  let elo = {teacher_uci:1424, heuristic:1200, neural:975};
  let drawRate = null;
  const backendAgents = {};
  try {
    const r = await fetch('/api/metrics');
    const d = await r.json();
    if (d.elo) { if (d.elo.teacher_uci) elo.teacher_uci = d.elo.teacher_uci;
                 if (d.elo.heuristic)   elo.heuristic   = d.elo.heuristic;
                 if (d.elo.neural)      elo.neural       = d.elo.neural; }
    drawRate = d.draw_rate ?? null;
    // P4 — arch/status depuis backend (agents field)
    if (d.agents) d.agents.forEach(a => { backendAgents[a.id] = a; });
  } catch(e) {}
  const maxElo = Math.max(elo.teacher_uci, elo.heuristic, elo.neural, 1);
  grid.innerHTML = AGENTS_DEF.map(a => {
    // P4 — arch/status depuis backend si disponible
    const bk       = backendAgents[a.id] || {};
    const arch     = bk.arch   || a.arch;
    const status   = bk.status || a.status;
    const agentElo = elo[a.id] || 0;
    const pct      = Math.round((agentElo / maxElo) * 100);
    const sCls     = status === 'STABLE' ? 'p-done' : 'p-blocked';
    const drHtml   = (a.id === 'neural' && drawRate != null)
      ? '<div style="font-size:10px;color:' + (drawRate > 0.5 ? 'var(--red)' : 'var(--amber)') +
        ';margin-top:4px">Draw rate : ' + Math.round(drawRate * 100) + '%</div>' : '';
    return '<div class="agent-card" id="ac-' + a.id + '">' +
      '<div class="agent-card-header" onclick="toggleAgentCard(\'' + a.id + '\')">' +
        '<div style="font-size:22px;width:32px;text-align:center">' + a.icon + '</div>' +
        '<div style="flex:1">' +
          '<div style="font-family:var(--font-d);font-size:14px;font-weight:700;color:var(--text)">' + a.label + '</div>' +
          '<div style="font-size:10px;color:var(--text3);margin-top:1px">' + arch + '</div>' +
          '<div style="display:flex;align-items:center;gap:10px;margin-top:7px">' +
            '<div class="agent-elo-bar-wrap"><div class="agent-elo-bar" style="width:' + pct + '%;background:' + a.color + '"></div></div>' +
            '<span style="font-family:var(--font-d);font-size:15px;font-weight:800;color:' + a.color + ';white-space:nowrap">ELO ' + agentElo + '</span>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">' +
          '<span class="pill ' + sCls + '">' + status + '</span>' +
          '<span style="font-size:14px;color:var(--text3)" id="ac-arrow-' + a.id + '">▸</span>' +
        '</div>' +
      '</div>' +
      '<div class="agent-body" id="ab-' + a.id + '">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">' +
          '<div><div class="stat-lbl">Architecture</div><div style="font-size:12px;color:var(--text2);margin-top:3px">' + arch + '</div></div>' +
          '<div><div class="stat-lbl">Dataset</div><div style="font-size:12px;color:var(--text2);margin-top:3px">' + a.dataset + '</div></div>' +
          '<div><div class="stat-lbl">ELO</div><div style="font-family:var(--font-d);font-size:22px;font-weight:800;color:' + a.color + ';margin-top:3px">' + agentElo + '</div></div>' +
          '<div><div class="stat-lbl">Statut</div><div style="margin-top:3px"><span class="pill ' + sCls + '">' + status + '</span></div></div>' +
        '</div>' +
        drHtml +
        '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px">' +
          a.tags.map(t => '<span class="pill" style="background:var(--bg4);color:var(--text3)">' + escHtml(t) + '</span>').join('') +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function toggleAgentCard(id) {
  const body  = document.getElementById('ab-'       + id);
  const arrow = document.getElementById('ac-arrow-' + id);
  if (!body) return;
  const open = body.classList.toggle('open');
  if (arrow) arrow.textContent = open ? '▾' : '▸';
}

function sendPromptClaude(prompt) {
  const input = document.getElementById('lm-quick-input');
  if (input) input.value = prompt;
  nav('pilote');
  setTimeout(() => { const el = document.getElementById('lm-quick-input'); if (el) el.focus(); }, 200);
}

// ── AUTOLOOP MULTI-LANE ───────────────────────────────────────────────────────
const AUTOLOOP_LANES = ['rocky_moteur', 'ia_apprentissage', 'decisions_pendantes'];

function _terminalLine(entry) {
  const div = document.createElement('div');
  div.style.color = entry.line.startsWith('[OK]') ? 'var(--green)'
                  : entry.line.startsWith('[!]')  ? 'var(--amber)'
                  : entry.line.startsWith('[X]')  ? 'var(--red)'
                  : 'var(--text2)';
  div.textContent = entry.ts + ' ' + entry.line;
  return div;
}

function loadAutoloopLogs(lane) {
  fetch('/api/autoloop-logs?lane=' + lane)
    .then(r => r.json())
    .then(d => {
      const t = document.getElementById('terminal-' + lane);
      if (!t || !d.logs) return;
      t.innerHTML = '';
      d.logs.forEach(e => t.appendChild(_terminalLine(e)));
      t.scrollTop = t.scrollHeight;
    }).catch(() => {});
}

function startAutoloopStream(lane) {
  const t = document.getElementById('terminal-' + lane);
  if (!t) return;
  const es = new EventSource('/api/autoloop-stream?lane=' + lane);
  es.onmessage = (ev) => {
    try {
      const d = JSON.parse(ev.data);
      if (d.done) { es.close(); return; }
      t.appendChild(_terminalLine(d));
      t.scrollTop = t.scrollHeight;
    } catch(e) {}
  };
  es.onerror = () => es.close();
}

async function _doAutoloopStart(lane, dry_run) {
  const r = await fetch('/api/autoloop-start', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({lane, dry_run, once: true})
  }).then(r => r.json());
  if (r.ok) {
    _updateLaneUI(lane, {state: 'running', pid: r.pid, dry_run: r.dry_run, last_result: null});
    const t = document.getElementById('terminal-' + lane);
    if (t) t.innerHTML = '';
    startAutoloopStream(lane);
    _pollAutoloop();
  } else {
    const stEl = document.getElementById('al-state-' + lane);
    if (stEl) { stEl.textContent = 'Erreur: ' + (r.error || '?'); stEl.className = 'chain-status error'; }
  }
}

async function autoloopStart(lane) {
  // Fix 6 — dry_run depuis la checkbox, HumanGate si exécution réelle
  const drCheck = document.getElementById('drcheck-' + lane);
  const dry_run = !drCheck || !drCheck.checked;
  if (!dry_run) {
    document.getElementById('hg-cmd-display').textContent = 'autoloop ' + lane + ' — exécution RÉELLE (dry_run=false)\nIMP actionnable sera exécuté via Claude Code.';
    const laneEl = document.getElementById('hg-lane-label');
    if (laneEl) { laneEl.className = 'pill p-audit'; laneEl.textContent = 'AUDIT_REQUIRED'; }
    S.pendingAutoloopLane = {lane, dry_run: false};
    document.getElementById('hg-modal').classList.add('open');
    return;
  }
  await _doAutoloopStart(lane, dry_run);
}

async function autoloopStop(lane) {
  const stEl = document.getElementById('al-state-' + lane);
  if (stEl) stEl.textContent = 'stopping...';
  await fetch('/api/autoloop-stop', {method: 'POST',
    headers: {'Content-Type': 'application/json'}, body: JSON.stringify({lane})});
  refreshAutoloopStatus();
}

async function autoloopStopAll() {
  const b = event.currentTarget;
  const orig = b.textContent;
  b.textContent = '⟳ Stop...';
  b.disabled = true;
  try {
    await fetch('/api/autoloop-stop', {method: 'POST',
      headers: {'Content-Type': 'application/json'}, body: '{}'});
  } finally {
    b.textContent = orig;
    b.disabled = false;
    refreshAutoloopStatus();
  }
}

function _updateLaneUI(lane, st) {
  const stEl   = document.getElementById('al-state-' + lane);
  const lastEl = document.getElementById('al-last-' + lane);
  const btnS   = document.getElementById('btn-start-' + lane);
  const btnX   = document.getElementById('btn-stop-' + lane);
  if (!stEl) return;
  const running = st.state === 'running';
  stEl.className = 'chain-status ' + (running ? 'running' : 'idle');
  stEl.textContent = st.state + (st.pid ? ' · PID ' + st.pid : '') +
    (st.dry_run !== undefined ? ' · dry_run=' + st.dry_run : '') +
    (st.ledger_lane ? ' · ' + st.ledger_lane : '');
  if (lastEl) lastEl.textContent = st.last_result ? 'last: ' + st.last_result : '';
  if (btnS) btnS.style.display = running ? 'none' : '';
  if (btnX) btnX.style.display = running ? '' : 'none';
}

async function refreshAutoloopStatus() {
  try {
    const d = await fetch('/api/autoloop-status').then(r => r.json());
    for (const lane of AUTOLOOP_LANES) {
      if (d[lane]) _updateLaneUI(lane, d[lane]);
      loadAutoloopLogs(lane);
    }
    const alEl = document.getElementById('sos-autoloop-state');
    if (alEl) {
      const running = AUTOLOOP_LANES.filter(l => d[l] && d[l].state === 'running');
      alEl.textContent = running.length ? running.join(', ') + ' running' : 'idle';
      alEl.style.color = running.length ? 'var(--amber)' : 'var(--text2)';
    }
  } catch(e) {}
}

let _autoloop_paused = false;
let _al_poll_iv = null;

function _pollAutoloop() {
  _al_poll_iv = setInterval(async () => {
    if (_autoloop_paused) return;
    await refreshAutoloopStatus();
    try {
      const d = await fetch('/api/autoloop-status').then(r => r.json());
      const anyRunning = AUTOLOOP_LANES.some(l => d[l] && d[l].state === 'running');
      if (!anyRunning) { clearInterval(_al_poll_iv); _al_poll_iv = null; }
    } catch(e) { clearInterval(_al_poll_iv); _al_poll_iv = null; }
  }, 3000);
}

function toggleAutoloopPause() {
  _autoloop_paused = !_autoloop_paused;
  const btn = document.getElementById('btn-pause-autoloop');
  if (!btn) return;
  if (_autoloop_paused) {
    btn.textContent = '▶ Reprendre';
    btn.classList.add('btn-amber');
  } else {
    btn.innerHTML = '&#9646;&#9646; Pause';
    btn.classList.remove('btn-amber');
    refreshAutoloopStatus();
  }
}

function copierCharter() {
  const charter = document.getElementById('wf-charter-out');
  const text = charter ? charter.value.trim() : '';
  if (!text || text.startsWith('✟') || text.startsWith('⟳')) {
    alert('Aucun charter disponible — génère-en un dans l\'onglet Workflow.');
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('#autoloop-card button[onclick="copierCharter()"]');
    if (btn) {
      const orig = btn.innerHTML;
      btn.textContent = '✓ Copié';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }
  }).catch(() => alert('Clipboard non disponible (HTTPS requis).'));
}

refreshAutoloopStatus();
setInterval(refreshAutoloopStatus, 15000);

// ── STUDIO OS ─────────────────────────────────────────────────────────────────
async function loadStudioOs() {
  // --- Section 1 : Surfaces (depuis /api/studio-state) ---
  let state = {};
  try { state = await fetch('/api/studio-state').then(r => r.json()); } catch(e) {}
  const surfBody = document.getElementById('sos-surfaces-body');
  if (surfBody) {
    const s = state.surfaces || {};
    const LABELS = {moteur_rust:'Moteur Rust', dataset:'Dataset', autopilote:'Autopilote', lora:'LoRA', benchmark:'Benchmark'};
    const pillFor = v => {
      const cls = v==='IMPLEMENTED'?'p-impl':v==='PARTIAL'?'p-audit':'p-todo';
      return '<span class="pill ' + cls + '">' + (v||'—') + '</span>';
    };
    const keys = ['moteur_rust','dataset','autopilote','lora','benchmark'];
    if (Object.keys(s).length) {
      surfBody.innerHTML = keys.map(k =>
        '<tr><td>' + LABELS[k] + '</td><td>' + pillFor(s[k]) + '</td></tr>'
      ).join('');
    } else {
      surfBody.innerHTML = '<tr><td colspan="2" style="color:var(--text3);text-align:center">Données non disponibles</td></tr>';
    }
  }

  // HumanGate pending (depuis studio-state)
  const hgPending = document.getElementById('sos-hg-pending');
  if (hgPending) {
    const pending = !!state.humangate_pending;
    hgPending.className = 'pill ' + (pending ? 'p-human' : 'p-done');
    hgPending.textContent = pending ? 'OUI — en attente' : 'Non';
  }

  // --- Section 2 : Boucle Kaizen live ---
  try {
    const lc = await fetch('/api/ledger-status').then(r => r.json());
    const ledgerLine = document.getElementById('sos-ledger-line');
    const nextImp    = document.getElementById('sos-next-imp');
    const nextLane   = document.getElementById('sos-next-lane');
    if (ledgerLine) ledgerLine.textContent = (lc.open ?? '?') + ' open / ' + (lc.closed ?? '?') + ' closed';
    const nxt = lc.next || {};
    if (nextImp) nextImp.textContent = nxt.id ? nxt.id + ' — ' + (nxt.title || '') : '—';
    if (nextLane) nextLane.textContent = nxt.lane || '';
  } catch(e) {}

  try {
    const al = await fetch('/api/autoloop-status').then(r => r.json());
    const alEl = document.getElementById('sos-autoloop-state');
    if (alEl) {
      const runningLanes = AUTOLOOP_LANES.filter(l => al[l] && al[l].state === 'running');
      alEl.textContent = runningLanes.length ? runningLanes.join(', ') + ' running' : 'idle';
      alEl.style.color = runningLanes.length ? 'var(--amber)' : 'var(--text2)';
    }
  } catch(e) {}

  // --- Section 3 & 4 : memory ---
  try {
    const mem = await fetch('/api/memory').then(r => r.json());

    // Décisions HumanGate
    const decEl = document.getElementById('sos-hg-decisions');
    if (decEl) {
      const decisions = mem.decisions_humangate || [];
      if (!decisions.length) {
        decEl.innerHTML = '<div style="font-size:12px;color:var(--text3)">Aucune décision enregistrée.</div>';
      } else {
        decEl.innerHTML = '<table><thead><tr><th>ID</th><th>Titre</th><th>Décision</th><th>Date</th></tr></thead><tbody>' +
          decisions.slice(0, 5).map(hgd => {
            const pilCls = hgd.decision==='APPROVED'?'p-done':hgd.decision==='REJECTED'?'p-blocked':'p-audit';
            return '<tr>' +
              '<td><span class="pill p-human">' + escHtml(hgd.id||'') + '</span></td>' +
              '<td style="max-width:200px;word-break:break-word">' + escHtml(hgd.question||'') + '</td>' +
              '<td><span class="pill ' + pilCls + '">' + escHtml(hgd.decision||'') + '</span></td>' +
              '<td style="color:var(--text3)">' + escHtml(hgd.date||'') + '</td>' +
            '</tr>';
          }).join('') + '</tbody></table>';
      }
    }

    // Corpus LoRA
    const TARGET = 50;
    const golden  = mem.golden_examples  || 0;
    const finetune = mem.finetune_examples || 0;
    const pct = Math.min(100, Math.round((golden / TARGET) * 100));
    const setEl = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    setEl('sos-golden', golden);
    setEl('sos-finetune', finetune);
    const bar = document.getElementById('sos-lora-bar');
    if (bar) {
      bar.style.width = pct + '%';
      bar.style.background = pct >= 100 ? 'var(--green)' : pct > 0 ? 'var(--amber)' : 'var(--text3)';
    }
    const lbl = document.getElementById('sos-lora-bar-label');
    if (lbl) lbl.textContent = golden + ' / ' + TARGET + ' exemples';
    const loraStatus = document.getElementById('sos-lora-status');
    if (loraStatus) {
      const isReady = golden >= TARGET;
      loraStatus.className = 'pill ' + (isReady ? 'p-impl' : 'p-audit');
      loraStatus.textContent = isReady ? 'READY_FOR_HUMANGATE' : 'PENDING';
    }
  } catch(e) {}
}

async function sosDryRun() {
  const statusEl = document.getElementById('sos-dryrun-status');
  if (statusEl) statusEl.textContent = '&#8987; Lancement rocky_moteur...';
  try {
    const r = await fetch('/api/autoloop-start', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({lane: 'rocky_moteur', dry_run: true, once: true})
    });
    const d = await r.json();
    if (statusEl) statusEl.textContent = d.ok ? '&#10003; Lancé (PID ' + d.pid + ')' : '&#10005; ' + (d.error || 'Erreur');
    setTimeout(loadStudioOs, 2000);
  } catch(e) {
    if (statusEl) statusEl.textContent = '&#10005; Erreur connexion';
  }
}

// Polling auto toutes les 30s sur studio-os
setInterval(() => {
  if (document.getElementById('page-studio-os')?.classList.contains('active')) loadStudioOs();
}, 30000);

// ── COCKPIT LANES ────────────────────────────────────────────────────────────
const _cockpitTerms = {};
const _cockpitWs    = {};
const _cockpitReportPaths = {};
const _cockpitImpIds = {};
const _cockpitLaunchPollers = {};

function copyReportPath(n) {
  const p = _cockpitReportPaths[n];
  if (!p) return;
  navigator.clipboard.writeText(p).then(() => showToast('Chemin copié · ' + p));
}

async function copyCockpitCharter(n) {
  const ta = document.getElementById('cockpit-charter-' + n);
  if (!ta || !ta.value.trim() || ta.value === '⟳ Chargement...') return;
  try {
    await navigator.clipboard.writeText(ta.value);
    const btn = document.getElementById('cockpit-copy-btn-' + n);
    if (btn) { const orig = btn.textContent; btn.textContent = '✓ Copié'; setTimeout(() => { btn.textContent = orig; }, 2000); }
  } catch(e) {}
}

function showToast(msg, duration=4000) {
  const el = document.getElementById('tcs-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._tid);
  el._tid = setTimeout(() => el.classList.remove('show'), duration);
}

async function loadCockpitLanes() {
  const el = document.getElementById('cockpit-lanes');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--text3);font-size:11px;padding:10px">Chargement...</div>';
  // Cleanup orphaned terminals from previous render
  Object.keys(_cockpitTerms).forEach(n => {
    try { _cockpitTerms[n].dispose(); } catch(e) {}
    delete _cockpitTerms[n];
  });
  Object.keys(_cockpitWs).forEach(n => {
    try { _cockpitWs[n].close(); } catch(e) {}
    delete _cockpitWs[n];
  });
  try {
    const d = await fetch('/api/ceo-lane-assignment').then(r => r.json());
    const lanes = d.lanes || [];
    const reportEl = document.getElementById('wf-report-lanes');
    // FIX 3 — timestamp CEO Brief
    const tsEl = document.getElementById('cockpit-ts');
    if (tsEl) {
      if (d.generated_at) {
        const ageS = Math.round(Date.now() / 1000 - d.generated_at);
        const ageStr = ageS < 60 ? 'à l\'instant'
          : ageS < 3600 ? `il y a ${Math.round(ageS / 60)}min`
          : `il y a ${Math.round(ageS / 3600)}h`;
        tsEl.textContent = `Assigné par CEO Brief · ${ageStr}`;
      } else {
        tsEl.textContent = '';
      }
    }
    if (!lanes.length) {
      el.innerHTML = '<div style="color:var(--text3);font-size:11px;padding:10px">Aucun IMP SAFE_AUTO OPEN — ledger vide ou tous fermés.</div>';
      if (reportEl) reportEl.innerHTML = '<div style="color:var(--text3);font-size:11px;padding:10px">Aucune lane active.</div>';
      return;
    }
    el.innerHTML = lanes.map((lane, idx) => {
      const n = idx + 1;
      const color = lane.color || 'var(--text3)';
      const label = escHtml(lane.label || lane.id);
      const imps = lane.imps || [];
      const active = lane.active || (imps.length ? imps[0] : null);
      const queued = lane.queued || [];
      const impId = active ? active.imp_id : '';
      const charterReady = active && active.charter_ready;
      const charterBadge = charterReady
        ? '<span style="font-size:9px;color:var(--green);margin-left:6px">✓ charter</span>' : '';
      const impPills = active
        ? '<span class="pill p-impl" style="font-size:10px">' + escHtml(active.imp_id) + '</span>'
        : '';
      const queuedLine = queued.length
        ? '<div style="font-size:9px;color:var(--text3);margin-top:2px">⏳ ' + queued.map(i => escHtml(i.imp_id)).join(' · ') + '</div>'
        : '';
      const filesLocked = lane.files_locked || [];
      const filesStr = filesLocked.length
        ? '<div style="font-size:9px;color:var(--text3);margin-top:4px;font-family:var(--font-d)">🔒 '
          + filesLocked.map(f => escHtml(f)).join(' · ') + '</div>'
        : '<div style="font-size:9px;color:var(--text3);margin-top:3px;opacity:0.45">🔒 aucun fichier verrouillé</div>';
      // FIX 2 — narrative CEO par lane
      const rec = lane.recommendation || '';
      const recEl = rec
        ? '<div style="font-size:9px;color:var(--text3);margin-top:3px;opacity:0.8">💬 ' + escHtml(rec) + '</div>'
        : '';
      const rpath = impId ? 'lab/chains/reports/' + impId + '_report.md' : '';
      _cockpitReportPaths[n] = rpath;
      const rpathLine = rpath
        ? '<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:2px">'
          + '<span style="font-family:var(--font-d)">📄 ' + escHtml(rpath) + '</span>'
          + '<button class="btn btn-sm" style="font-size:9px;padding:1px 5px" onclick="copyReportPath(' + n + ')">📋</button>'
          + '</div>'
        : '';
      const reportSection = '<div style="margin-top:6px;font-size:9px;color:var(--text3)">'
        + rpathLine
        + '<div style="font-size:8px;font-family:var(--font-d);opacity:0.65;line-height:1.6">'
        + 'software_verdict: OK|FAIL|BLOCKED<br>'
        + 'evidence_verdict: MECHANICAL_VALIDATION_ONLY<br>'
        + 'claim_verdict: NO_CLAIM_ALLOWED</div>'
        + '</div>';
      return `<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
        <div class="card" style="padding:8px 10px;border-left:3px solid ${color}">
          <span style="font-size:11px;font-weight:700;color:${color}">${label}</span>
          <span style="margin-left:6px">${impPills}</span>
          ${charterBadge}
          ${queuedLine}
          ${recEl}
          ${filesStr}
        </div>
        <div class="card" style="padding:8px">
          <textarea id="cockpit-charter-${n}"
            style="width:100%;height:90px;background:var(--bg3);color:var(--text2);border:1px solid var(--border);border-radius:3px;padding:6px;font-size:10px;font-family:var(--font-d);resize:vertical;box-sizing:border-box"
            placeholder="— charter —"></textarea>
          <div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap">
            <button class="btn btn-sm btn-amber" onclick="loadCockpitCharter(${n},'${escHtml(impId)}')">Charger charter</button>
            <button class="btn btn-sm" id="cockpit-copy-btn-${n}" onclick="copyCockpitCharter(${n})">📋 Copier</button>
            <button class="btn btn-sm btn-green" id="cockpit-launch-btn-${n}" onclick="launchClaudeCode(${n},'${escHtml(impId)}')" ${impId ? '' : 'disabled'}>▶ Lancer</button>
          </div>
        </div>
        <div class="card" style="padding:6px">
          <div style="font-size:9px;color:var(--text3);margin-bottom:4px">Terminal · ${label}</div>
          <div id="cockpit-term-${n}" style="height:180px;background:#000;border-radius:3px;overflow:hidden"></div>
          ${reportSection}
        </div>
      </div>`;
    }).join('');
    lanes.forEach((_, idx) => initCockpitTerminal(idx + 1));

    // Section rapport N colonnes — alignée sur les lanes
    if (reportEl) {
      reportEl.innerHTML = lanes.map((lane, idx) => {
        const n = idx + 1;
        const color = lane.color || 'var(--text3)';
        const label = escHtml(lane.label || lane.id);
        const imps = lane.imps || [];
        const impId = imps.length ? imps[0].imp_id : '';
        _cockpitImpIds[n] = impId;
        const impBadge = impId
          ? '<span class="pill p-impl" style="margin-left:6px;font-size:10px">' + escHtml(impId) + '</span>'
          : '';
        const btnLabel = impId ? '&#10003; Valider et fermer ' + escHtml(impId) : '&#10003; Valider';
        const btnDisabled = impId ? '' : 'disabled';
        return `<div style="flex:1;min-width:0">
          <div class="card" style="padding:8px 10px;border-left:3px solid ${color};margin-bottom:6px">
            <span style="font-size:11px;font-weight:700;color:${color}">Rapport · ${label}</span>
            ${impBadge}
          </div>
          <div class="card" style="padding:8px">
            <textarea id="wf-report-lane-${n}"
              style="width:100%;height:120px;background:var(--bg3);color:var(--text2);border:1px solid var(--border);border-radius:3px;padding:6px;font-size:10px;font-family:var(--font-d);resize:vertical;box-sizing:border-box"
              placeholder="software_verdict: OK&#10;evidence_verdict: MECHANICAL_VALIDATION_ONLY&#10;claim_verdict: NO_CLAIM_ALLOWED"></textarea>
            <div style="display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap">
              <button class="btn btn-sm btn-amber" onclick="generateReportFromTerminal(${n})">📋 Générer rapport</button>
              <button class="btn btn-sm btn-green" id="wf-report-lane-btn-${n}" ${btnDisabled}
                onclick="validateAndCloseImpLane(${n})">${btnLabel}</button>
              <span id="wf-report-lane-status-${n}" style="font-size:10px"></span>
            </div>
          </div>
        </div>`;
      }).join('');
    }
  } catch(e) {
    el.innerHTML = '<div style="color:var(--red);font-size:11px;padding:10px">Erreur: ' + escHtml(e.message) + '</div>';
  }
}

async function loadCockpitCharter(n, impId) {
  const el = document.getElementById(`cockpit-charter-${n}`);
  if (!el || !impId) return;
  el.value = '⟳ Chargement...';
  try {
    const d = await fetch('/api/generate-charter?imp_id=' + encodeURIComponent(impId)).then(r => r.json());
    el.value = d.charter || d.error || '(vide)';
  } catch(e) {
    el.value = '✗ Erreur: ' + e.message;
  }
}

async function launchClaudeCode(n, impId) {
  if (!impId) return;
  const btn = document.getElementById(`cockpit-launch-btn-${n}`);
  const ws = _cockpitWs[n];
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    showToast('⚠ Terminal lane ' + n + ' non connecté — initialiser le terminal d\'abord');
    return;
  }
  // Load charter if textarea is still empty
  const ta = document.getElementById(`cockpit-charter-${n}`);
  if (ta && !ta.value.trim()) {
    await loadCockpitCharter(n, impId);
  }
  // Save charter to disk before launching
  const charterContent = ta ? ta.value : '';
  try {
    const saved = await fetch('/api/save-charter', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({imp_id: impId, charter: charterContent}),
    }).then(r => r.json());
    if (!saved.ok) { showToast('✗ save-charter échoué · ' + (saved.error || '')); return; }
  } catch(e) { showToast('✗ save-charter erreur · ' + e.message); return; }
  // Snapshot current last_processed to detect new completion only
  let prevProcessed = null;
  try {
    const s = await fetch('/api/watcher-status').then(r => r.json());
    prevProcessed = s.last_processed || null;
  } catch(e) {}
  // Send command to terminal
  ws.send('npx @anthropic-ai/claude-code --dangerously-skip-permissions lab/chains/charters/' + impId + '_charter.md\r\n');
  if (btn) { btn.textContent = '⟳ En cours...'; btn.disabled = true; }
  // Clear any stale poller for this lane
  if (_cockpitLaunchPollers[n]) { clearInterval(_cockpitLaunchPollers[n]); delete _cockpitLaunchPollers[n]; }
  const startTs = Date.now();
  _cockpitLaunchPollers[n] = setInterval(async () => {
    try {
      const timedOut = Date.now() - startTs > 600000;
      const d = await fetch('/api/watcher-status').then(r => r.json());
      const done = d.last_processed && d.last_processed !== prevProcessed && d.last_processed === impId;
      if (done || timedOut) {
        clearInterval(_cockpitLaunchPollers[n]);
        delete _cockpitLaunchPollers[n];
        if (btn) { btn.textContent = '▶ Lancer'; btn.disabled = false; }
        if (done) {
          showToast('✓ ' + impId + ' fermé automatiquement');
          loadCockpitLanes();
        } else {
          showToast('⏱ Timeout · ' + impId);
        }
      }
    } catch(e) {}
  }, 5000);
}

async function generateReportFromTerminal(n) {
  const impId = _cockpitImpIds[n] || '';
  const url = '/api/terminal-buffer/' + n + (impId ? '?imp_id=' + encodeURIComponent(impId) : '');
  try {
    const d = await fetch(url).then(r => r.json());
    if (d.software_verdict && d.evidence_verdict && d.claim_verdict) {
      const ta = document.getElementById('wf-report-lane-' + n);
      if (ta) {
        ta.value = 'software_verdict: ' + d.software_verdict + '\n'
                 + 'evidence_verdict: ' + d.evidence_verdict + '\n'
                 + 'claim_verdict: '    + d.claim_verdict;
      }
      if (d.report_written) showToast('✓ Rapport écrit : ' + d.report_path);
    } else {
      showToast('Patterns non détectés dans le terminal');
    }
  } catch(e) {
    showToast('Erreur lecture buffer terminal : ' + e.message);
  }
}

function initCockpitTerminal(n) {
  const el = document.getElementById(`cockpit-term-${n}`);
  if (!el) return;
  if (_cockpitTerms[n]) {
    try { _cockpitTerms[n].dispose(); } catch(e) {}
    delete _cockpitTerms[n];
  }
  if (_cockpitWs[n]) {
    try { _cockpitWs[n].close(); } catch(e) {}
    delete _cockpitWs[n];
  }
  if (typeof Terminal === 'undefined') {
    el.innerHTML = '<div style="color:#666;padding:8px;font-size:10px">xterm.js non chargé</div>';
    return;
  }
  const term = new Terminal({
    cols: 80, rows: 10,
    theme: { background: '#0b0c0e', foreground: '#d4d4d4', cursor: '#f0a030' },
    fontSize: 11,
    fontFamily: '"Geist Mono", monospace',
    scrollback: 200,
    cursorBlink: true,
    allowProposedApi: true,
    macOptionIsMeta: true,
    rightClickSelectsWord: true,
  });
  term.open(el);
  _cockpitTerms[n] = term;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws/terminal/${n}`);
  ws.binaryType = 'arraybuffer';
  _cockpitWs[n] = ws;
  term.onResize(({cols, rows}) => {
    if (ws.readyState === WebSocket.OPEN)
      ws.send(JSON.stringify({type:'resize', cols, rows}));
  });
  ws.onopen  = () => term.write('\x1b[32mConnecté — PowerShell lane ' + n + '\x1b[0m\r\n');
  ws.onmessage = e => {
    const data = e.data instanceof ArrayBuffer
      ? new TextDecoder().decode(e.data) : e.data;
    term.write(data);
  };
  ws.onerror = () => term.write('\r\n\x1b[31m[WS erreur]\x1b[0m\r\n');
  ws.onclose = () => term.write('\r\n\x1b[33m[Session fermée]\x1b[0m\r\n');
  // PTY mode : relay brut — le PTY gère écho, édition ligne, curseur, séquences escape
  term.onData(data => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  });
  term.attachCustomKeyEventHandler(e => {
    if (e.type !== 'keydown') return true;
    if (e.ctrlKey && e.key === 'v') {
      navigator.clipboard.readText().then(text => {
        if (ws.readyState === WebSocket.OPEN) ws.send(text);
      }).catch(() => {});
      return false;
    }
    if (e.ctrlKey && e.key === 'l') { term.clear(); return false; }
    return true;
  });
}

// ── WORKFLOW IMP (IMP-059 + IMP-060) ─────────────────────────────────────────
async function openImpInWorkflow(rawId) {
  const impId = (rawId || '').split('—')[0].trim();
  // Navigation manuelle pour pouvoir await loadWorkflow() sans double-appel
  document.querySelectorAll('.sb-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.querySelector(`.sb-item[onclick="nav('workflow')"]`)?.classList.add('active');
  document.getElementById('page-workflow')?.classList.add('active');
  await loadWorkflow();
  if (impId && impId !== '—') {
    const sel = document.getElementById('wf-imp-select');
    if (sel) sel.value = impId;
  }
}

async function loadWorkflow() {
  try {
    const d = await fetch('/api/imp-triage').then(r => r.json());
    const sel = document.getElementById('wf-imp-select');
    if (sel) {
      const doms = d.domains || {};
      const domainMeta = [
        { key: 'rocky_moteur',        label: '🦾 Rocky / Moteur' },
        { key: 'ia_apprentissage',    label: '🧠 IA / Apprentissage' },
        { key: 'jeux',                label: '🎮 Jeux' },
        { key: 'studio',              label: '⚙ Studio' },
        { key: 'decisions_pendantes', label: '⚠ Décisions' },
      ];
      let html = '<option value="">— Choisir un IMP —</option>';
      for (const {key, label} of domainMeta) {
        const items = doms[key] || [];
        if (!items.length) continue;
        html += `<optgroup label="${label}">`;
        html += items.map(i => `<option value="${escHtml(i.id)}">${escHtml(i.id)} — ${escHtml(i.title||'')} [${escHtml(i.lane||'')}]</option>`).join('');
        html += '</optgroup>';
      }
      sel.innerHTML = html;
    }
  } catch(e) { console.error('loadWorkflow', e); }
  renderWorkflowHistory();
  loadCockpitLanes();
}

async function generateCharter(force=false) {
  const sel = document.getElementById('wf-imp-select');
  const impId = sel ? sel.value : '';
  if (!impId) { alert('Sélectionner un IMP d\'abord.'); return; }
  const btn = document.getElementById('wf-btn-generate');
  const out = document.getElementById('wf-charter-out');
  const titleEl = document.getElementById('wf-charter-title');
  if (btn) btn.disabled = true;
  if (out) out.value = force ? '⟳ Régénération via Qwen2.5 (30-60s)...' : '⟳ Chargement charter...';
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 60000);
  try {
    const url = '/api/generate-charter?imp_id=' + encodeURIComponent(impId) + (force ? '&force=1' : '');
    const d = await fetch(url, {signal: ctrl.signal}).then(r => r.json());
    clearTimeout(tid);
    if (d.error) {
      if (out) out.value = '✗ ' + d.error;
    } else {
      if (titleEl) titleEl.textContent = d.imp_id + ' — ' + (d.title || '') + ' [' + (d.lane || '') + ']';
      if (out) out.value = d.charter || '';
      const sec = document.getElementById('wf-section-charter');
      if (sec) sec.style.display = 'block';
    }
  } catch(e) {
    clearTimeout(tid);
    if (out) out.value = e.name === 'AbortError' ? '✗ Timeout (60s) — LM Studio indisponible ou trop lent' : '✗ Erreur: ' + e.message;
  } finally {
    if (btn) btn.disabled = false;
  }
}

function copyCharter() {
  const out = document.getElementById('wf-charter-out');
  if (!out || !out.value) return;
  navigator.clipboard.writeText(out.value).then(() => {
    const lbl = document.getElementById('wf-copy-label');
    if (lbl) {
      lbl.textContent = '✓ Copié !';
      setTimeout(() => { lbl.textContent = 'Colle ce charter dans Claude Code'; }, 2000);
    }
  });
}

async function validateAndCloseImpLane(n) {
  const impId = _cockpitImpIds[n] || '';
  const report = document.getElementById('wf-report-lane-' + n)?.value || '';
  const statusEl = document.getElementById('wf-report-lane-status-' + n);
  const btn = document.getElementById('wf-report-lane-btn-' + n);
  if (!impId) {
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--red)">✗ Pas d\'IMP assigné</span>';
    return;
  }
  if (!report.includes('software_verdict:')) {
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--red)">✗ software_verdict manquant</span>';
    return;
  }
  if (!report.includes('claim_verdict: NO_CLAIM_ALLOWED')) {
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--red)">✗ claim_verdict: NO_CLAIM_ALLOWED manquant</span>';
    return;
  }
  if (btn) btn.disabled = true;
  if (statusEl) statusEl.innerHTML = '⟳ Fermeture...';
  try {
    const d = await fetch('/api/close-imp', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({imp_id: impId})
    }).then(r => r.json());
    if (d.ok) {
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--green)">✓ ' + escHtml(impId) + ' fermé</span>';
      const ta = document.getElementById('wf-report-lane-' + n);
      if (ta) ta.value = '';
      showToast('✓ ' + impId + ' fermé · cockpit mis à jour');
      setTimeout(loadCockpitLanes, 800);
    } else {
      if (statusEl) statusEl.innerHTML = '<span style="color:var(--red)">✗ ' + escHtml(d.error || 'Erreur') + '</span>';
      if (btn) btn.disabled = false;
    }
  } catch(e) {
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--red)">✗ Erreur connexion</span>';
    if (btn) btn.disabled = false;
  }
}

async function validateAndCloseImp() {
  const sel = document.getElementById('wf-imp-select');
  const impId = sel ? sel.value : '';
  const report = document.getElementById('wf-report-in')?.value || '';
  const status = document.getElementById('wf-close-status');
  if (!impId) { alert('Sélectionner un IMP.'); return; }
  if (!report.includes('software_verdict: OK')) {
    if (status) status.innerHTML = '<span style="color:var(--red)">✗ Rapport doit contenir "software_verdict: OK"</span>';
    return;
  }
  if (!report.includes('claim_verdict: NO_CLAIM_ALLOWED')) {
    if (status) status.innerHTML = '<span style="color:var(--red)">✗ Rapport doit contenir "claim_verdict: NO_CLAIM_ALLOWED"</span>';
    return;
  }
  const btn = document.getElementById('wf-btn-close');
  if (btn) btn.disabled = true;
  // Sauvegarder le charter édité avant de fermer l'IMP
  const charterText = document.getElementById('wf-charter-out')?.value || '';
  if (charterText && !charterText.startsWith('✗') && !charterText.startsWith('⟳')) {
    try {
      await fetch('/api/save-charter', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({imp_id: impId, charter: charterText})
      });
    } catch(e) { /* non-bloquant */ }
  }
  try {
    const d = await fetch('/api/close-imp', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({imp_id: impId})
    }).then(r => r.json());
    if (d.ok) {
      if (status) status.innerHTML = '<span style="color:var(--green)">✓ ' + escHtml(impId) + ' fermé</span>'
        + ' &nbsp;<button class="btn btn-amber btn-sm" onclick="nav(\'pilote\');loadCeoBrief()">→ CEO Brief</button>';
      document.getElementById('wf-report-in').value = '';
      document.getElementById('wf-section-charter').style.display = 'none';
      loadWorkflow();
    } else {
      if (status) status.innerHTML = '<span style="color:var(--red)">✗ ' + escHtml(d.error || 'Erreur') + '</span>';
    }
  } catch(e) {
    if (status) status.innerHTML = '<span style="color:var(--red)">✗ Erreur connexion</span>';
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function renderWorkflowHistory() {
  const container = document.getElementById('wf-history');
  if (!container) return;
  try {
    const d = await fetch('/api/memory').then(r => r.json());
    const items = d.last_closed_imps || [];
    if (!items.length) {
      container.innerHTML = '<div style="color:var(--text3);font-size:12px">Aucun IMP fermé récemment.</div>';
      return;
    }
    container.innerHTML = items.map(i =>
      `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
        <span class="pill p-safe" style="font-size:10px">${escHtml(i.id)}</span>
        <span style="font-size:12px;color:var(--text2);flex:1">${escHtml(i.title||'')}</span>
        <span style="font-size:10px;color:var(--text3)">${escHtml(i.closed_session||'')}</span>
      </div>`
    ).join('');
  } catch(e) {
    container.innerHTML = '<div style="color:var(--text3);font-size:12px">Erreur chargement historique.</div>';
  }
}


// ── IDEA PIPELINE ─────────────────────────────────────────────────────────
function ideaStartBtn(id) {
  cycleIdeaStatus(id);
}

function _findIdeaBtn(ideaId) {
  return document.querySelector(`.idea-actions button[onclick="ideaStartBtn(${ideaId})"]`);
}

async function startIdeaPipeline(id) {
  // Guard — vérifie si un pipeline est déjà en cours avant tout
  try {
    const statusCheck = await fetch('/api/idea-pipeline-status').then(r => r.json());
    if (statusCheck.running) {
      alert('Pipeline déjà en cours — attendre la fin avant de relancer.');
      return;
    }
  } catch(e) {}

  const idea = S.ideas.find(i => i.id === id);
  if (!idea) return;

  // Désactiver le bouton dès le premier clic
  const triggerBtn = _findIdeaBtn(id);
  if (triggerBtn) { triggerBtn.disabled = true; triggerBtn.textContent = '⟳ En cours...'; }

  const modal = document.getElementById('pipeline-modal');
  const title = document.getElementById('pipeline-modal-title');
  const sub   = document.getElementById('pipeline-modal-sub');
  const impList = document.getElementById('pipeline-imp-list');
  const actions = document.getElementById('pipeline-modal-actions');
  title.textContent = '⚡ Pipeline : ' + idea.title;
  sub.textContent = 'Étape 1/5 — Génération roadmap...';
  impList.style.display = 'none';
  impList.innerHTML = '';
  actions.style.display = 'none';
  ['ps-roadmap','ps-redteam','ps-fusion','ps-extract','ps-staged'].forEach(sid => {
    const el = document.getElementById(sid);
    if (el) { el.className = 'pipe-step'; }
  });
  modal.classList.add('open');
  try {
    const r = await fetch('/api/idea-to-imp', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({idea_id: String(idea.id), idea_title: idea.title, idea_content: idea.desc || ''})
    });
    const d = await r.json();
    if (!d.ok || !d.started) {
      sub.textContent = '✗ ' + (d.error || 'Erreur démarrage');
      if (triggerBtn) { triggerBtn.disabled = false; triggerBtn.textContent = '→ Démarrer'; }
      return;
    }
    await _pollPipelineIntoModal(sub, impList, actions);
  } catch(e) {
    sub.textContent = '✗ Erreur connexion';
  } finally {
    // Réactiver le bouton dans tous les cas (terminé ou erreur)
    if (triggerBtn) { triggerBtn.disabled = false; triggerBtn.textContent = '→ Démarrer'; }
  }
}

const PIPE_STEP_LABELS = {
  init:    [0, ''],
  roadmap: [1, 'ps-roadmap'],
  redteam: [2, 'ps-redteam'],
  fusion:  [3, 'ps-fusion'],
  extract: [4, 'ps-extract'],
  staged:  [5, 'ps-staged'],
};
const PIPE_STEP_NAMES = {roadmap:'Roadmap',redteam:'RedTeam',fusion:'Fusion',extract:'Extract',staged:'Staged'};

async function _pollPipelineIntoModal(subEl, impListEl, actionsEl) {
  for (let i = 0; i < 300; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const s = await fetch('/api/idea-pipeline-status').then(r => r.json());
      const [prog, stepId] = PIPE_STEP_LABELS[s.step] || [0, ''];
      Object.entries(PIPE_STEP_LABELS).forEach(([k, [p, sid]]) => {
        if (!sid) return;
        const el = document.getElementById(sid);
        if (!el) return;
        if (p < prog) el.className = 'pipe-step done';
        else if (p === prog) el.className = 'pipe-step active';
        else el.className = 'pipe-step';
      });
      const nhFlag = s.result?.needs_human;
      if (subEl) subEl.textContent = s.running
        ? 'Étape ' + s.progress + '/5 — ' + (PIPE_STEP_NAMES[s.step] || s.step) + '...'
        : (s.error ? '✗ ' + s.error : nhFlag ? '⚠ Validation humaine requise' : '✓ Pipeline terminé — ' + (s.result?.imps_staged?.length || 0) + ' IMP(s) générés');
      if (!s.running) {
        loadIdeas();
        // FIX 5 (IMP-089): needs_human ou 0 IMPs → bouton Ouvrir dans Claude
        if (nhFlag || (s.result && !(s.result.imps_staged?.length))) {
          const reason = s.result?.reason || '';
          const extractPrompt = s.result?.extract_prompt || '';
          const ideaTitle = s.result?.idea_title || '';
          const stepName = s.result?.step || '';
          impListEl.innerHTML =
            (nhFlag
              ? `<div style="font-size:12px;color:var(--amber);padding:8px 12px;background:var(--bg3);border-radius:4px;margin-bottom:10px;border-left:3px solid var(--amber)">⚠ Validation requise${stepName?' ('+escHtml(stepName)+')':''}<br>Raison : ${escHtml(reason)}</div>`
              : '<div style="font-size:12px;color:var(--text3);margin-bottom:10px">Aucun IMP extrait par Qwen.</div>'
            ) +
            `<div style="font-size:11px;color:var(--text3);margin-bottom:4px">→ Copier le prompt, coller dans claude.ai, récupérer le JSON :</div>
            <textarea id="claude-export-prompt" readonly style="width:100%;height:72px;font-size:10px;background:var(--bg2);color:var(--text2);border:1px solid var(--border2);border-radius:4px;padding:6px;resize:none;box-sizing:border-box">${escHtml(extractPrompt)}</textarea>
            <button class="btn btn-sm" style="margin:4px 0 8px" onclick="navigator.clipboard.writeText(document.getElementById('claude-export-prompt').value).then(()=>{this.textContent='✓ Copié';setTimeout(()=>{this.textContent='⎘ Copier le prompt'},1500)})">⎘ Copier le prompt</button>
            <div style="font-size:11px;color:var(--text3);margin-bottom:4px;margin-top:4px">Colle ici le JSON retourné par Claude :</div>
            <textarea id="claude-json-paste" placeholder='[{"title":"Ajouter fn X dans Y.py",...}]' style="width:100%;height:72px;font-size:10px;background:var(--bg2);color:var(--text2);border:1px solid var(--border2);border-radius:4px;padding:6px;resize:none;box-sizing:border-box"></textarea>
            <button class="btn btn-amber btn-sm" style="margin-top:6px" data-idea-id="${escHtml(String(s.idea_id||''))}" data-idea-title="${escHtml(ideaTitle)}" onclick="injectClaudeJson(this)">↓ Injecter ce JSON</button>`;
        } else if (s.result?.imps_staged?.length) {
          impListEl.innerHTML = '<div style="font-size:11px;color:var(--text3);margin-bottom:8px">IMPs à injecter dans le ledger :</div>' +
            s.result.imps_staged.map((imp, i) =>
              `<div class="imp-list-item"><input type="checkbox" id="pimp-${i}" checked><label for="pimp-${i}" class="imp-list-title">${escHtml(imp.title||'')}</label><span class="pill p-safe" style="font-size:9px">${imp.lane||'SAFE_AUTO'}</span><span class="pill p-high" style="font-size:9px">${imp.impact||'HIGH'}</span></div>`
            ).join('');
        } else {
          impListEl.innerHTML = '<div style="font-size:12px;color:var(--text3)">Aucun IMP extrait.</div>';
        }
        impListEl.style.display = 'block';
        actionsEl.style.display = 'flex';
        return;
      }
    } catch(e) {}
  }
}

async function injectClaudeJson(btn) {
  // FIX 5 (IMP-089): bypass Qwen2.5 — injecte le JSON Claude dans le staging
  const ideaId    = btn.dataset.ideaId    || '';
  const ideaTitle = btn.dataset.ideaTitle || '';
  const ta = document.getElementById('claude-json-paste');
  if (!ta || !ta.value.trim()) { alert("Colle le JSON Claude avant d'injecter."); return; }
  const sub = document.getElementById('pipeline-modal-sub');
  btn.disabled = true; btn.textContent = '⟳ Staging...';
  try {
    const r = await fetch('/api/idea-inject-json', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({idea_id: ideaId, idea_title: ideaTitle, json_raw: ta.value})
    });
    const d = await r.json();
    if (d.ok) {
      if (sub) sub.textContent = '✓ ' + d.count + ' IMP(s) stagés — cliquer Approuver pour injecter dans le ledger';
      const s2 = await fetch('/api/idea-pipeline-status').then(r => r.json());
      const impListEl = document.getElementById('pipeline-imp-list');
      if (impListEl && s2.result?.imps_staged?.length) {
        impListEl.innerHTML = '<div style="font-size:11px;color:var(--text3);margin-bottom:8px">IMPs à injecter dans le ledger :</div>' +
          s2.result.imps_staged.map((imp, i) =>
            `<div class="imp-list-item"><input type="checkbox" id="pimp-${i}" checked><label for="pimp-${i}" class="imp-list-title">${escHtml(imp.title||'')}</label><span class="pill p-safe" style="font-size:9px">${imp.lane||'SAFE_AUTO'}</span><span class="pill p-high" style="font-size:9px">${imp.impact||'HIGH'}</span></div>`
          ).join('');
      }
      await loadIdeas();
    } else {
      alert('Erreur : ' + (d.error || 'Inconnue'));
      btn.disabled = false; btn.textContent = '↓ Injecter ce JSON';
    }
  } catch(e) {
    alert('Erreur connexion');
    btn.disabled = false; btn.textContent = '↓ Injecter ce JSON';
  }
}

async function _pollPipelineIntoElement(outEl, statusEl, showResult) {
  for (let i = 0; i < 300; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const s = await fetch('/api/idea-pipeline-status').then(r => r.json());
      if (statusEl) statusEl.textContent = s.running
        ? '⟳ Étape ' + s.progress + '/5 — ' + (PIPE_STEP_NAMES[s.step] || s.step) + '...'
        : (s.error ? '✗ ' + s.error : '✓ Terminé');
      if (!s.running) {
        if (showResult && s.result) {
          outEl.textContent = [
            '=== ROADMAP ===', s.result.roadmap,
            '', '=== RED TEAM ===', s.result.redteam,
            '', '=== FUSION ===', s.result.fusion,
            '', '=== IMPs STAGÉS ===',
            (s.result.imps_staged||[]).map((x,i)=>`${i+1}. ${x.title}`).join('\n'),
            '', 'Fichier : ' + (s.result.proposals_file||''),
          ].join('\n');
          outEl.__lastOutput = outEl.textContent;
        }
        return;
      }
    } catch(e) {}
  }
}

async function approvePipelineAll() {
  const btn = document.querySelector('#pipeline-modal-actions .btn-amber');
  if (btn) btn.textContent = '⟳ Injection...';
  let sessionId = '';
  try {
    const st = await fetch('/api/idea-pipeline-status').then(r => r.json());
    sessionId = String(st.idea_id || '');
  } catch(e) {}
  try {
    const r = await fetch('/api/idea-inject', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({session_id: sessionId})});
    const d = await r.json();
    const sub = document.getElementById('pipeline-modal-sub');
    if (d.ok && d.refresh_ceo_brief) {
      const onPilote = document.getElementById('page-pilote')?.classList.contains('active');
      if (onPilote) {
        if (sub) sub.textContent = 'IMPs injectés — CEO Brief mis à jour';
        loadCeoBrief();
      } else {
        if (sub) sub.innerHTML = 'IMPs injectés — CEO Brief mis à jour &nbsp;<button class="btn btn-amber btn-sm" onclick="nav(\'pilote\');loadCeoBrief()">Voir CEO Brief →</button>'
          + '&nbsp;<button class="btn btn-sm" onclick="nav(\'workflow\')">&#8599; Workflow IMP</button>';
      }
    } else {
      if (d.ok) {
        if (sub) sub.innerHTML = '✓ IMPs injectés dans le ledger &nbsp;<button class="btn btn-sm" onclick="nav(\'workflow\')">&#8599; Workflow IMP</button>';
      } else {
        if (sub) sub.textContent = '✗ Erreur : ' + d.error;
      }
    }
    if (btn) btn.textContent = d.ok ? '✓ Injecté' : '✗ Erreur';
    if (d.ok) { ledger_cache_bust = true; setTimeout(updateNextAction, 1000); await loadIdeas(); }
  } catch(e) {
    const btn2 = document.querySelector('#pipeline-modal-actions .btn-amber');
    if (btn2) btn2.textContent = '✗ Erreur';
  }
}

</script>
<div id="tcs-toast"></div>
</body>
</html>"""

# ── HTTP SERVER ───────────────────────────────────────────────────────────────
class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass  # silence logs

    def send_json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, content):
        body = content.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length)) if length else {}

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0]

        if path in ("/", "/index.html"):
            self.send_html(HTML)

        elif path == "/api/lm-status":
            self.send_json(lm_status())

        elif path == "/api/chain-map":
            map_path = REPO / "lab/chains/prompt_chain_map.json"
            if map_path.exists():
                try:
                    self.send_json(json.loads(map_path.read_text(encoding="utf-8")))
                except Exception as e:
                    self.send_json({"error": str(e)}, 500)
            else:
                self.send_json({"error": "prompt_chain_map.json introuvable"}, 404)

        elif path == "/api/lm-probe":
            # Ping léger : juste /api/v1/models sans inférence
            s = lm_status()
            if s["ok"]:
                self.send_json({"ok": True, "models": s["models"], "msg": "LM Studio répond — modèle prêt"})
            else:
                self.send_json({"ok": False, "models": [], "msg": "LM Studio injoignable — vérifier qu'il tourne et qu'un modèle est chargé"})

        elif path == "/api/logs":
            self.send_json({"logs": log_buffer[-20:]})

        elif path == "/api/memory":
            self.send_json(get_memory_data())

        elif path == "/api/ledger-status":
            if ledger_cache:
                self.send_json(ledger_cache)
            else:
                self.send_json(get_ledger_counts())

        elif path == "/api/imp-triage":
            self.send_json(imp_triage())

        elif path.startswith("/static/"):
            filename = path[len("/static/"):]
            if "/" in filename or ".." in filename:
                self.send_response(403)
                self.end_headers()
                return
            static_path = REPO / "lab" / "static" / filename
            if not static_path.exists():
                self.send_response(404)
                self.end_headers()
                return
            ext = static_path.suffix.lower()
            ct = {"js": "application/javascript", "css": "text/css"}.get(ext[1:], "application/octet-stream")
            data = static_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", ct)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "max-age=86400")
            self.end_headers()
            self.wfile.write(data)

        elif path == "/api/ceo-lane-assignment":
            global _ceo_assign_cache
            ledger_mtime = LEDGER.stat().st_mtime if LEDGER.exists() else 0.0
            cache_age = time.time() - _ceo_assign_cache.get("ts", 0.0)
            if cache_age > 60 or _ceo_assign_cache.get("ledger_mtime") != ledger_mtime:
                lanes_data = _ceo_assign_lanes()
                _ceo_assign_cache = {
                    "lanes": lanes_data,
                    "ts": time.time(),
                    "ledger_mtime": ledger_mtime,
                }
            self.send_json({
                "ok": True,
                "lanes": _ceo_assign_cache["lanes"],
                "cache_age_s": int(cache_age),
                "generated_at": _ceo_assign_cache.get("ts", 0),
                "claim_verdict": _CLAIM_VERDICT,
            })

        elif path == "/api/health":
            self.send_json(get_health())

        elif path == "/api/watcher-status":
            self.send_json({
                "active": _watcher_active,
                "last_check": _watcher_last_check,
                "last_processed": _watcher_last_processed,
            })

        elif path == "/api/pending-proposals-count":
            count = 0
            proposals_path = REPO / "lab/chains/ROADMAP_PROPOSALS.yaml"
            if proposals_path.exists():
                try:
                    count = proposals_path.read_text(encoding="utf-8").count("humangate_verdict: null")
                except Exception:
                    pass
            self.send_json({"count": count})

        elif path == "/api/dedup-count":
            self.send_json({"count": _dedup_exclusion_count})

        elif path == "/api/staleness":
            self.send_json(get_staleness())

        elif path == "/api/metrics":
            self.send_json(get_metrics())

        elif path == "/api/dataset-status":
            self.send_json(get_dataset_status())

        elif path == "/api/session-context":
            self.send_json(get_session_context())

        elif path == "/api/escalation-status":
            p = Path(__file__).parent / "studio_state.json"
            try:
                st = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
                pending = bool(st.get("humangate_pending", False))
                reason  = "IMPs HUMAN_REQUIRED ou FORBIDDEN en attente" if pending else ""
                self.send_json({"pending": pending, "reason": reason})
            except Exception as e:
                self.send_json({"pending": False, "reason": str(e)})

        elif path == "/api/studio-state":
            p = Path(__file__).parent / "studio_state.json"
            if p.exists():
                self.send_json(json.loads(p.read_text(encoding="utf-8")))
            else:
                write_studio_state()
                p2 = Path(__file__).parent / "studio_state.json"
                self.send_json(json.loads(p2.read_text(encoding="utf-8")))

        elif path == "/api/vision-state":
            self.send_json(_get_vision_state())

        elif path == "/api/autoloop-logs":
            qs = self.path.split("?", 1)[1] if "?" in self.path else ""
            lane = ""
            for part in qs.split("&"):
                if part.startswith("lane="):
                    lane = part[5:]
            if lane not in AUTOLOOP_LANES:
                self.send_json({"error": f"lane inconnue: {lane}"}, 400)
                return
            with _autoloop_lock:
                logs = list(_autoloop_logs[lane][-50:])
            self.send_json({"lane": lane, "logs": logs})

        elif path == "/api/autoloop-stream":
            qs = self.path.split("?", 1)[1] if "?" in self.path else ""
            lane = ""
            for part in qs.split("&"):
                if part.startswith("lane="):
                    lane = part[5:]
            if lane not in AUTOLOOP_LANES:
                self.send_json({"error": f"lane inconnue: {lane}"}, 400)
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()
            sent = 0
            try:
                while True:
                    with _autoloop_lock:
                        logs = list(_autoloop_logs[lane])
                        proc = _autoloop_processes[lane]
                    new_entries = logs[sent:]
                    for entry in new_entries:
                        msg = json.dumps(entry, ensure_ascii=False)
                        self.wfile.write(f"data: {msg}\n\n".encode("utf-8"))
                    self.wfile.flush()
                    sent += len(new_entries)
                    idle = proc is None or proc.poll() is not None
                    if idle and not new_entries:
                        self.wfile.write(b'data: {"done":true}\n\n')
                        self.wfile.flush()
                        break
                    time.sleep(0.5)
            except Exception:
                pass

        elif path == "/api/autoloop-status":
            with _autoloop_lock:
                for lane in AUTOLOOP_LANES:
                    proc = _autoloop_processes[lane]
                    if proc is not None:
                        ret = proc.poll()
                        if ret is not None:
                            _autoloop_statuses[lane]["state"] = "idle"
                            _autoloop_statuses[lane]["last_result"] = f"exit {ret}"
                            _autoloop_statuses[lane]["pid"] = None
                self.send_json({lane: dict(st) for lane, st in _autoloop_statuses.items()})

        elif path == "/api/lane-stats":
            self.send_json(get_lane_stats())

        elif path == "/api/brain-status":
            s = lm_status()
            self.send_json({
                "director": {
                    "model": LM_MODEL,
                    "role":  "decisions_operationnelles",
                    "tasks": ["fusion", "session", "coaching", "call"],
                },
                "ceo": {
                    "model": LM_MODEL_CEO,
                    "role":  "raisonnement_profond",
                    "tasks": ["ceo_brief", "fusion_deep"],
                },
                "lm_studio_ok":   s.get("ok", False),
                "models_loaded":  s.get("models", []),
                "claim_verdict":  _CLAIM_VERDICT,
            })

        elif path == "/api/config":
            # B6/B7/B8 — lecture live de la config backend
            self.send_json({
                "repo":         str(REPO),
                "lm_host":      LM_HOST,
                "lm_model":     LM_MODEL,
                "lm_model_ceo": LM_MODEL_CEO,
            })

        elif path == "/api/chains":
            # B2 — chaînes depuis l'autorité Python (CHAINS_PYTHON)
            self.send_json(CHAINS_PYTHON)

        elif path.startswith("/api/terminal-buffer/"):
            try:
                n = int(path.split("/api/terminal-buffer/", 1)[1].split("?")[0])
            except Exception:
                self.send_json({"error": "n invalide"}, 400)
                return
            qs = self.path.split("?", 1)[1] if "?" in self.path else ""
            params: dict = {}
            for part in qs.split("&"):
                if "=" in part:
                    k, v = part.split("=", 1)
                    params[k] = v.replace("%2D", "-").replace("+", " ")
            imp_id = params.get("imp_id", "").strip()
            with _ws_terminal_lock:
                state = _ws_terminals.get(n)
            lines = list(state["lines"]) if state else []
            buffer_text = "\n".join(lines)
            sv = re.search(r'software_verdict:\s*(OK|FAIL|BLOCKED)', buffer_text)
            ev = re.search(r'evidence_verdict:\s*(\S+)', buffer_text)
            cv = re.search(r'claim_verdict:\s*(\S+)', buffer_text)
            report_written = False
            report_path_str = ""
            if sv and ev and cv and imp_id:
                report_content = (
                    f"software_verdict: {sv.group(1)}\n"
                    f"evidence_verdict: {ev.group(1)}\n"
                    f"claim_verdict: {cv.group(1)}\n"
                )
                reports_dir = REPO / "lab/chains/reports"
                reports_dir.mkdir(parents=True, exist_ok=True)
                rp = reports_dir / f"{imp_id}_report.md"
                try:
                    rp.write_text(report_content, encoding="utf-8")
                    report_written = True
                    report_path_str = f"lab/chains/reports/{imp_id}_report.md"
                    print(f"[REPORT] {imp_id} rapport écrit depuis PTY buffer")
                except Exception as e:
                    print(f"[REPORT] erreur écriture rapport: {e}")
            self.send_json({
                "buffer": buffer_text[-5000:],
                "software_verdict": sv.group(1) if sv else None,
                "evidence_verdict": ev.group(1) if ev else None,
                "claim_verdict": cv.group(1) if cv else None,
                "report_written": report_written,
                "report_path": report_path_str,
            })

        elif path.startswith("/api/generate-charter"):
            qs = self.path.split("?", 1)[1] if "?" in self.path else ""
            params: dict = {}
            for part in qs.split("&"):
                if "=" in part:
                    k, v = part.split("=", 1)
                    params[k] = v.replace("%2D", "-").replace("+", " ")
            imp_id = params.get("imp_id", "").strip()
            force  = params.get("force", "0") == "1"
            if not imp_id:
                self.send_json({"error": "imp_id requis (?imp_id=IMP-XXX)"}, 400)
                return
            self.send_json(api_generate_charter(imp_id, force=force))

        elif path == "/api/idea-pipeline-status":
            with _idea_pipeline_lock:
                state = dict(_idea_pipeline_state)
            self.send_json(state)

        elif path == "/api/ideas":
            self.send_json(load_ideas())

        elif path.startswith("/ws/terminal/"):
            n_str = path.split("/")[-1]
            try:
                n = int(n_str)
            except ValueError:
                self.send_response(400)
                self.end_headers()
                return
            if n not in (1, 2, 3):
                self.send_response(400)
                self.end_headers()
                return
            if self.headers.get("Upgrade", "").lower() != "websocket":
                self.send_response(426, "Upgrade Required")
                self.send_header("Upgrade", "websocket")
                self.end_headers()
                return
            sock = _ws_handshake(self)
            if sock:
                _run_ws_terminal(n, sock, self.rfile)

        else:
            self.send_json({"error": "not found"}, 404)

    def do_POST(self):
        global LM_HOST, LM_MODEL, LM_MODEL_CEO, REPO
        path = self.path
        body = self.read_body()

        if path == "/api/run-chain":
            cmd  = body.get("cmd", "")
            cid  = body.get("id", "")
            ok, reason = _check_lane_guard(cid)
            if not ok:
                self.send_json({"ok": False, "error": reason}, 403)
                return
            ok, reason = _check_tool_permission(cid)  # IMP-098
            if not ok:
                self.send_json({"ok": False, "error": reason}, 403)
                return
            result = run_chain(cmd, cwd=str(CHAINS_DIR))
            self.send_json(result)

        elif path == "/api/lm-ask":
            prompt = body.get("prompt", "")
            system = body.get("system", "")
            max_tokens = body.get("max_tokens", 800)
            response = lm_call(prompt, system=system, max_tokens=max_tokens)
            self.send_json({"response": response})

        elif path == "/api/memory":
            mem = load_memory()
            entry = body
            entry.setdefault("ts", datetime.now().isoformat())
            mem.setdefault("fusions", []).insert(0, entry)
            save_memory(mem)
            # Aussi écrire dans FUSION_LOG.jsonl pour que renderMemory() l'affiche
            try:
                fusion_log_path = REPO / "lab/chains/FUSION_LOG.jsonl"
                log_entry = {
                    "ts":            entry.get("ts", datetime.now().isoformat()),
                    "backend":       "humangate_capture",
                    "nb_fusions":    0,
                    "synthese":      entry.get("content", "")[:200],
                    "type":          entry.get("type", "fusion"),
                    "tags":          entry.get("tags", []),
                    "claim_verdict": _CLAIM_VERDICT,
                }
                with open(fusion_log_path, "a", encoding="utf-8") as fh:
                    fh.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
            except Exception:
                pass
            self.send_json({"ok": True})

        elif path == "/api/memory/export":
            try:
                mem = load_memory()
                lines = ["# STUDIO_MEMORY — Tactical Chess Studio\n",
                         f"Généré : {datetime.now().isoformat()}\n\n"]
                for f in mem.get("fusions", []):
                    lines.append(f"## [{f.get('type','fusion')}] {f.get('ts','')[:19]}\n")
                    if f.get("tags"):
                        lines.append(f"Tags : {', '.join(f['tags'])}\n\n")
                    lines.append(f.get("content", "") + "\n\n---\n\n")
                out_path = Path(__file__).parent / "STUDIO_MEMORY.md"
                out_path.write_text("".join(lines), encoding="utf-8")
                self.send_json({"ok": True, "path": str(out_path)})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)})

        elif path == "/api/lm-stream":
            prompt     = body.get("prompt", "")
            system     = body.get("system", "")
            max_tokens = int(body.get("max_tokens", 800))
            req_model  = body.get("model", "")  # optionnel — "" = routing auto
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()
            try:
                lm_stream_to(prompt, system, max_tokens, self.wfile, model=req_model)
            except Exception:
                pass

        elif path == "/api/git-status":
            try:
                result = subprocess.run(
                    "git status --porcelain", shell=True, capture_output=True,
                    text=True, cwd=str(REPO), timeout=15)
                files = [l.strip() for l in result.stdout.strip().split("\n") if l.strip()]
                self.send_json({"output": result.stdout or "Aucun fichier modifié", "files": files})
            except Exception as e:
                self.send_json({"error": str(e), "output": "", "files": []})

        elif path == "/api/doc-hygiene":
            result = run_chain(f'python "{HYGIENE}" --audit', cwd=str(CHAINS_DIR))
            self.send_json({"output": result.get("output") or result.get("error") or "OK", "rc": result.get("rc", -1)})

        elif path == "/api/save-charter":
            imp_id  = body.get("imp_id", "").strip()
            charter = body.get("charter", "").strip()
            if not imp_id or not re.match(r'^IMP-[\w-]+$', imp_id):
                self.send_json({"ok": False, "error": "imp_id invalide"}, 400)
                return
            if not charter:
                self.send_json({"ok": False, "error": "charter vide"}, 400)
                return
            try:
                charter_path = REPO / "lab/chains/charters" / f"{imp_id}_charter.md"
                charter_path.parent.mkdir(parents=True, exist_ok=True)
                charter_path.write_text(charter, encoding="utf-8")
                self.send_json({"ok": True, "path": str(charter_path)})
            except Exception as e:
                self.send_json({"ok": False, "error": str(e)}, 500)

        elif path == "/api/close-imp":
            imp_id = body.get("imp_id", "").strip()
            if not imp_id:
                self.send_json({"ok": False, "error": "imp_id requis"}, 400)
                return
            res = close_imp(imp_id)
            res["state_updater_triggered"] = True
            self.send_json(res)


        elif path in ("/api/claude-annotate", "/api/claude-fuse",
                      "/api/claude-fusion-complete", "/api/claude-mode-run"):
            self.send_json({"error": "backend Claude supprimé — système local Devstral uniquement"}, 410)
            return

        elif path == "/api/fusion-cmd":
            mode       = body.get("mode", "quick")
            max_tokens = 500 if mode == "quick" else 3000
            if True:  # devstral local — seul backend disponible
                ctx = build_fusion_context()
                open_imps_str = ", ".join(
                    f"{e.get('id','?')} {e.get('title','')}" for e in ctx.get("open_imps", [])[:10]
                ) or "aucun"
                metrics = ctx.get("metrics", {})
                if mode == "quick":
                    prompt = (
                        f"Tactical Chess Studio — FusionAuditor rapide\n"
                        f"IMPs OPEN : {open_imps_str}\n"
                        f"Draw rate : {metrics.get('draw_rate','?')} — ELO neural : {metrics.get('elo_neural','?')}\n\n"
                        "3 insights clés + prochaine action prioritaire.\n"
                        f"claim_verdict: {_CLAIM_VERDICT}"
                    )
                    sys_ = f"Tu es FusionAuditor du Tactical Chess Studio. Sois concis. claim_verdict: {_CLAIM_VERDICT}"
                else:
                    ctx_json = json.dumps(
                        {"open_imps": ctx["open_imps"], "metrics": ctx["metrics"], "chain_history": ctx["chain_history"]},
                        ensure_ascii=False, indent=2
                    )[:3000]
                    prompt = (
                        f"Tactical Chess Studio — Fusion complète\n\n{ctx_json}\n\n"
                        "Effectue 4 fusions :\n"
                        "1. IDEAS×LEDGER : doublons, lacunes, IMPs FORBIDDEN\n"
                        "2. ROADMAP×RÉALITÉ : décalages roadmap vs métriques\n"
                        "3. ROI_CASCADE : ROI effectif par IMP OPEN\n"
                        "4. REDTEAM : angles morts, biais, risques cachés\n"
                        "Pour chaque : synthèse + findings + contradictions.\n"
                        f"claim_verdict: {_CLAIM_VERDICT}"
                    )
                    sys_ = f"Tu es FusionAuditor du Tactical Chess Studio. claim_verdict: {_CLAIM_VERDICT}"
                raw = lm_call(prompt, system=sys_, max_tokens=max_tokens)
                # Parse structured JSON if Devstral returns one
                parsed: dict = {}
                try:
                    m = re.search(r'\{[\s\S]*\}', raw)
                    if m:
                        parsed = json.loads(m.group(0))
                except Exception:
                    pass
                synthese = (parsed.get("summary") or parsed.get("synthese") or raw[:200]).replace("\n", " ")
                nb_fusions = len(parsed.get("fusions", [])) if "fusions" in parsed else 0
                sections = [s.strip() for s in raw.split("---") if s.strip()] if not parsed and "---" in raw else []
                # Write to FUSION_LOG.jsonl
                fusion_log_appended = False
                if raw and not raw.startswith("[LM Studio"):
                    try:
                        log_entry = {
                            "ts":            datetime.now().isoformat(),
                            "backend":       "devstral",
                            "nb_fusions":    nb_fusions,
                            "synthese":      synthese[:200],
                            "claim_verdict": _CLAIM_VERDICT,
                        }
                        fusion_log_path = REPO / "lab/chains/FUSION_LOG.jsonl"
                        with open(fusion_log_path, "a", encoding="utf-8") as fh:
                            fh.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
                        fusion_log_appended = True
                    except Exception:
                        pass
                result_ds: dict = parsed if parsed else ({"sections": sections, "raw": raw} if sections else {"raw": raw})
                self.send_json({
                    "backend": "devstral", "mode": mode,
                    "result": result_ds, "fusion_log_appended": fusion_log_appended,
                    "claim_verdict": _CLAIM_VERDICT,
                })

        elif path == "/api/config":
            LM_HOST      = body.get("lm_host", LM_HOST)
            LM_MODEL     = body.get("model", LM_MODEL)
            LM_MODEL_CEO = body.get("model_ceo", LM_MODEL_CEO)
            if body.get("repo"):
                REPO = Path(body["repo"])
            self.send_json({"ok": True, "director": LM_MODEL, "ceo": LM_MODEL_CEO})

        elif path == "/api/autoloop-start":
            with _autoloop_lock:
                lane = body.get("lane", "rocky_moteur")
                if lane not in AUTOLOOP_LANES:
                    self.send_json({"ok": False, "error": f"lane inconnue: {lane}"})
                    return
                if not verify_tool_permission_matrix(lane):
                    self.send_json({"ok": False, "error": f"lane={lane} DENY dans tool_permission_matrix"})
                    return
                proc = _autoloop_processes[lane]
                if proc is not None and proc.poll() is None:
                    self.send_json({"ok": False, "error": f"autoloop {lane} déjà en cours"})
                    return
                dry_run     = body.get("dry_run", True)
                once        = body.get("once", True)
                ledger_lane = AUTOLOOP_LANE_MAP.get(lane, "SAFE_AUTO")
                ok_smoke, smoke_reason = _check_smoke_level(ledger_lane)
                if not ok_smoke:
                    self.send_json({"ok": False, "error": smoke_reason})
                    return
                py_exe  = str(REPO / ".venv312" / "Scripts" / "python.exe")
                script  = str(REPO / "lab" / "chains" / "kaizen_autoloop.py")
                cmd = [py_exe, script, "--lane", ledger_lane]
                if dry_run:
                    cmd.append("--dry-run")
                if once:
                    cmd.append("--once")
                try:
                    _autoloop_logs[lane].clear()
                    _autoloop_processes[lane] = subprocess.Popen(
                        cmd, cwd=str(REPO),
                        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                        text=True, encoding="utf-8", errors="replace"
                    )
                    threading.Thread(
                        target=_read_stdout,
                        args=(_autoloop_processes[lane], lane),
                        daemon=True,
                    ).start()
                    _autoloop_statuses[lane].update({
                        "state":        "running",
                        "started_at":   datetime.now().isoformat(),
                        "dry_run":      dry_run,
                        "pid":          _autoloop_processes[lane].pid,
                        "last_result":  None,
                        "ledger_lane":  ledger_lane,
                    })
                    get_lane_stats()  # reset date si minuit passé, puis incrémenter
                    _lane_today_runs[lane] = _lane_today_runs.get(lane, 0) + 1
                    self.send_json({"ok": True, "pid": _autoloop_processes[lane].pid,
                                    "dry_run": dry_run, "lane": lane})
                except Exception as e:
                    self.send_json({"ok": False, "error": str(e)})

        elif path == "/api/autoloop-stop":
            with _autoloop_lock:
                lane = body.get("lane", "")
                lanes_to_stop = [lane] if lane in AUTOLOOP_LANES else list(AUTOLOOP_LANES)
                stopped = []
                for ln in lanes_to_stop:
                    proc = _autoloop_processes[ln]
                    if proc is not None and proc.poll() is None:
                        try:
                            proc.terminate()
                            stopped.append(ln)
                        except Exception:
                            pass
                    _autoloop_statuses[ln].update({
                        "state": "idle",
                        "last_result": "stopped_by_humangate",
                        "pid": None,
                    })
                self.send_json({"ok": True, "stopped": stopped})

        elif path == "/api/ideas":
            idea = body
            if not idea.get("title"):
                self.send_json({"ok": False, "error": "title requis"}, 400)
                return
            ideas = load_ideas()
            title_lower = idea.get("title", "").strip().lower()
            if any(i.get("title", "").strip().lower() == title_lower for i in ideas):
                self.send_json({"ok": False, "error": "Idée avec ce titre déjà existante"}, 409)
                return
            max_id = max((i.get("id", 0) for i in ideas), default=0)
            idea["id"] = max_id + 1
            idea.setdefault("status", "backlog")
            idea.setdefault("ts", datetime.now().isoformat())
            ideas.insert(0, idea)
            save_ideas(ideas)
            self.send_json({"ok": True, "idea": idea})

        elif path == "/api/ideas/status":
            idea_id = str(body.get("idea_id", ""))
            new_status = body.get("status", "")
            if not idea_id or not new_status:
                self.send_json({"ok": False, "error": "idea_id et status requis"}, 400)
                return
            found = update_idea_status(idea_id, new_status)
            self.send_json({"ok": found, "idea_id": idea_id, "status": new_status})

        elif path == "/api/idea-to-imp":
            idea_id      = body.get("idea_id", "manual")
            idea_title   = body.get("idea_title", "").strip()
            idea_content = body.get("idea_content", "").strip()
            if not idea_title:
                self.send_json({"ok": False, "error": "idea_title requis"}, 400)
                return
            with _idea_pipeline_lock:
                if _idea_pipeline_state.get("running"):
                    self.send_json({"ok": False, "error": "Pipeline déjà en cours"}, 409)
                    return
                _idea_pipeline_state.update({
                    "step": "init", "progress": 0, "idea_id": str(idea_id),
                    "running": True, "result": None, "error": None,
                })
            threading.Thread(
                target=_run_idea_pipeline,
                args=(str(idea_id), idea_title, idea_content),
                daemon=True,
            ).start()
            self.send_json({"ok": True, "started": True, "idea_id": idea_id})

        elif path == "/api/idea-inject":
            session_id = str(body.get("session_id", "")).strip()
            py_exe = str(REPO / ".venv312" / "Scripts" / "python.exe")
            script = str(REPO / "lab" / "chains" / "roadmap_to_ledger.py")
            if session_id and session_id not in ("manual", ""):
                # Sanitize: only word chars and hyphens
                sid = re.sub(r'[^\w\-]', '', session_id)[:32]
                cmd = f'"{py_exe}" "{script}" --inject-staged "{sid}"'
            else:
                cmd = f'"{py_exe}" "{script}" --inject'
            result = run_chain(cmd, cwd=str(REPO))
            inject_ok = result.get("rc", -1) == 0
            if inject_ok:
                ledger_cache.update(get_ledger_counts())
                if session_id and session_id not in ("manual", ""):
                    update_idea_status(session_id, "applied")
            self.send_json({
                "ok": inject_ok,
                "output": result.get("output", ""),
                "error": result.get("error", ""),
                "rc": result.get("rc", -1),
                "refresh_ceo_brief": inject_ok,
            })

        elif path == "/api/idea-inject-json":
            # FIX 5 (IMP-089): bypass Qwen2.5 — injecte le JSON collé depuis Claude
            json_raw   = str(body.get("json_raw",   "")).strip()
            idea_id    = str(body.get("idea_id",    "manual")).strip()
            idea_title = str(body.get("idea_title", "")).strip()
            imps = _extract_json_array(json_raw)
            if not imps:
                self.send_json({"ok": False, "error": "JSON invalide ou aucun IMP trouvé"}, 400)
                return
            _stage_proposals(idea_id, idea_title, imps)
            with _idea_pipeline_lock:
                existing = dict(_idea_pipeline_state.get("result") or {})
                existing.update({"imps_staged": imps, "ok": True, "needs_human": False})
                _idea_pipeline_state["result"] = existing
            if idea_id and idea_id not in ("manual", ""):
                update_idea_status(idea_id, "pipeline_done")
            self.send_json({"ok": True, "count": len(imps)})

        elif path == "/api/ceo-brief":
            state_path = Path(__file__).parent / "studio_state.json"
            state_str = ""
            if state_path.exists():
                try:
                    state_str = state_path.read_text(encoding="utf-8")[:1500]
                except Exception:
                    pass
            lc = dict(ledger_cache) if ledger_cache else get_ledger_counts()
            open_ctx = build_fusion_context()
            roadmap_text = open_ctx.get("roadmap", "")
            sprint_objective = _extract_sprint_objective(roadmap_text)
            imps = open_ctx.get("open_imps", [])

            _dom = {i["id"]: _imp_domain(i) for i in imps if i.get("id")}
            moteur_imps  = [i for i in imps if _dom.get(i.get("id")) == "rocky_moteur"]
            studio_imps  = [i for i in imps if _dom.get(i.get("id")) == "studio"]
            jeux_imps    = [i for i in imps if _dom.get(i.get("id")) == "jeux"]
            ml_imps      = [i for i in imps if _dom.get(i.get("id")) == "ia_apprentissage"]
            pending_imps = [i for i in imps if _dom.get(i.get("id")) == "decisions_pendantes"]

            def _fmt(lst: list) -> str:
                return "\n".join(f"  - {i['id']} [{i.get('lane','?')}] {i.get('title','')}" for i in lst) or "  (aucun)"

            roadmap_decisions = ""
            m_dec = re.search(r'## Décisions ouvertes.*?\n([\s\S]*?)(?=\n##|\Z)', roadmap_text)
            if m_dec:
                roadmap_decisions = m_dec.group(1).strip()[:600]

            prompt = (
                f"/no_think\nTactical Chess Studio — CEO Brief v3\n\n"
                f"Sprint objectif : {sprint_objective}\n\n"
                f"=== Lane rocky_moteur (moteur Rust uniquement) ===\n{_fmt(moteur_imps)}\n\n"
                f"=== Lane studio (autopilot.py / pipeline / UI) ===\n{_fmt(studio_imps)}\n\n"
                f"=== Lane jeux (Chess Fantasy / Puzzles) ===\n{_fmt(jeux_imps)}\n\n"
                f"=== Lane ia_apprentissage (ML / LoRA / dataset) ===\n{_fmt(ml_imps)}\n\n"
                f"=== Lane decisions_pendantes (HumanGate / FORBIDDEN) ===\n{_fmt(pending_imps)}\n"
                f"Décisions roadmap en attente :\n{roadmap_decisions}\n\n"
                f"Ledger : {lc.get('open',0)} OPEN / {lc.get('closed',0)} CLOSED\n"
                f"Studio state :\n{state_str}\n\n"
                "Retourne UNIQUEMENT ce JSON (aucun texte avant ou après) :\n"
                "{\n"
                '  "sprint_objective": "texte court",\n'
                '  "lanes": {\n'
                '    "rocky_moteur":        { "imp_id": "IMP-XXX ou null", "title": "...", "lane_tag": "SAFE_AUTO", "priority": 1, "risk": "...", "recommendation": "..." },\n'
                '    "studio":              { "imp_id": "IMP-XXX ou null", "title": "...", "lane_tag": "SAFE_AUTO", "priority": 1, "risk": "...", "recommendation": "..." },\n'
                '    "jeux":                { "imp_id": "IMP-XXX ou null", "title": "...", "lane_tag": "SAFE_AUTO", "priority": 1, "risk": "...", "recommendation": "..." },\n'
                '    "ia_apprentissage":    { "imp_id": "IMP-XXX ou null", "title": "...", "lane_tag": "SAFE_AUTO", "priority": 1, "risk": "...", "recommendation": "..." },\n'
                '    "decisions_pendantes": { "imp_id": null, "title": "...", "lane_tag": "AUDIT_REQUIRED", "priority": 1, "blocker": "...", "recommendation": "..." }\n'
                '  },\n'
                f'  "claim_verdict": "{_CLAIM_VERDICT}"\n'
                "}\n"
            )
            system = (
                "Tu es le CEO IA du Tactical Chess Studio. "
                "Tu analyses l'état du studio sur 5 lanes simultanées et retournes uniquement un JSON structuré. "
                f"claim_verdict: {_CLAIM_VERDICT}"
            )
            raw = lm_call(prompt, system=system, max_tokens=1200, model=LM_MODEL)
            parsed_v3: dict = {}
            try:
                m3 = re.search(r'\{[\s\S]*\}', raw)
                if m3:
                    parsed_v3 = json.loads(m3.group(0))
            except Exception:
                pass
            if not parsed_v3.get("lanes"):
                parsed_v3 = {"raw": raw}
            else:
                _ceo_brief_cache.update({"brief": parsed_v3, "ts": time.time()})
            self.send_json({
                "ok": bool(parsed_v3.get("lanes")),
                "brief": parsed_v3,
                "sprint_objective": sprint_objective,
                "model_used": LM_MODEL,
                "claim_verdict": _CLAIM_VERDICT
            })

        else:
            self.send_json({"error": "not found"}, 404)

    def do_DELETE(self):
        if self.path == "/api/logs":
            log_buffer.clear()
            self.send_json({"ok": True})
        else:
            self.send_json({"error": "not found"}, 404)


# ── THREADED SERVER ──────────────────────────────────────────────────────────
class ThreadingTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


# ── MAIN ──────────────────────────────────────────────────────────────────────
def main():
    import sys
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    print(f"""
╔══════════════════════════════════════════════╗
║   TCS AUTOPILOTE  v0.1                       ║
║   Tactical Chess Studio                      ║
╠══════════════════════════════════════════════╣
║  Serveur  : http://localhost:{PORT}           ║
║  Repo     : {str(REPO)[:40]}   ║
║  LM Studio: {LM_HOST}          ║
║  Mémoire  : {str(MEMORY_FILE)[:40]} ║
╚══════════════════════════════════════════════╝

Ctrl+C pour arrêter.
""")
    # P3 : auto-recall au démarrage (non-bloquant)
    threading.Thread(target=_ledger_refresh_worker, daemon=True).start()

    # IMP-104 : watchdog rapports auto-close
    (REPO / "lab/chains/reports").mkdir(parents=True, exist_ok=True)
    threading.Thread(target=_report_watcher_thread, daemon=True).start()

    # IMP-D2 : diagnosis toutes les heures
    threading.Thread(target=_diagnosis_thread, daemon=True).start()

    # Ouvre le navigateur après 1 seconde
    def open_browser():
        import time
        time.sleep(1)
        webbrowser.open(f"http://localhost:{PORT}")
    threading.Thread(target=open_browser, daemon=True).start()

    with ThreadingTCPServer(("", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nArrêt autopilote.")

if __name__ == "__main__":
    main()
