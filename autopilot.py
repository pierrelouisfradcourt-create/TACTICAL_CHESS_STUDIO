#!/usr/bin/env python3
"""
TCS Autopilote — Tactical Chess Studio
Pilote local : LM Studio + chaînes Kaizen + mémoire studio
Lancer : python autopilot.py
Ouvre automatiquement http://localhost:7331
"""

import http.server
import json
import os
import re
import subprocess
import threading
import time
import webbrowser
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime
import socketserver

# ── CONFIG ──────────────────────────────────────────────────────────────────
REPO     = Path(r"C:\TACTICAL_CHESS_STUDIO")
PORT     = 7331
LM_HOST  = "http://localhost:1234"
LM_MODEL = "devstral-small-2507"  # nom exact vu dans LM Studio — changer si besoin dans Config
MEMORY_FILE = Path(__file__).parent / "studio_memory.json"

# Chemins repo utiles
LEDGER   = REPO / "lab/chains/IMPROVEMENT_LEDGER.yaml"
KAIZEN   = REPO / "lab/chains/kaizen_loop.py"
HYGIENE  = REPO / "lab/chains/doc_hygiene_chain.py"
CHAINS_DIR = REPO  # audit Claude Code 2026-06-02 : pas de sous-dossier repos/games/
CHAIN_HISTORY = REPO / "lab/chains/CHAIN_HISTORY.jsonl"
STATE_FILE    = REPO / "00_STUDIO_CONTROL/00_MASTER_DOCS/07_CURRENT_STATE.md"
UX_RUNS_FILE  = REPO / "lab/datasets/ux_claude_runs.jsonl"

ledger_cache: dict = {}  # {"open": N, "closed": M, "next": {}, "ts": "..."}

# ── DEVSTRAL TELEMETRY ────────────────────────────────────────────────────────
tokens_session: int = 0
_current_task: dict = {}   # muté sur place — jamais réassigné
_lm_log_lock = threading.Lock()


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
    if "fusion" in t:               return "fusion"
    if "résumé" in t or "session" in t: return "résumé"
    if "coach" in t:                return "coaching"
    return "call"


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
def lm_call(prompt: str, system: str = "", max_tokens: int = 800) -> str:
    """
    LM Studio Developer Logs montre /api/v1/chat comme endpoint natif.
    Fallback sur /v1/chat/completions (OpenAI-compatible).
    Modele exact vu dans les logs : devstral-small-2507
    """
    global tokens_session
    t0 = time.time()
    task_type = _infer_task_type(system, prompt)
    with _lm_log_lock:
        _current_task.clear()
        _current_task.update({"type": task_type, "started_at": datetime.now().isoformat(), "tokens_so_far": 0})
    result = "[LM Studio indisponible]"
    try:
        sys_prompt = build_system_prompt(system)
        messages = []
        if sys_prompt:
            messages.append({"role": "system", "content": sys_prompt})
        messages.append({"role": "user", "content": prompt})
        payload = {
            "model": LM_MODEL,
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
                        result = data["choices"][0]["message"]["content"].strip()
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
    }


# ── P9 : STREAMING ────────────────────────────────────────────────────────────
def lm_stream_to(prompt: str, system: str, max_tokens: int, wfile) -> None:
    global tokens_session
    t0 = time.time()
    task_type = _infer_task_type(system, prompt)
    with _lm_log_lock:
        _current_task.clear()
        _current_task.update({"type": task_type, "started_at": datetime.now().isoformat(), "tokens_so_far": 0})
    _tok = [0]  # compteur mutable accessible depuis le finally
    try:
        sys_prompt = build_system_prompt(system)
        messages = []
        if sys_prompt:
            messages.append({"role": "system", "content": sys_prompt})
        messages.append({"role": "user", "content": prompt})
        payload = {
            "model": LM_MODEL, "messages": messages,
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


# ── LEDGER / HISTORY UTILS ────────────────────────────────────────────────────
def get_ledger_counts() -> dict:
    if not LEDGER.exists():
        return {"open": 0, "closed": 0, "next": {}}
    try:
        text = LEDGER.read_text(encoding="utf-8")
        open_count = text.count("status: OPEN") + text.count("status: IN_PROGRESS")
        closed_count = text.count("status: CLOSED") + text.count("status: DONE")
        # Try to extract next open item title
        next_imp = {}
        m = re.search(r'- id:\s*(IMP-\d+).*?title:\s*"([^"]+)".*?status:\s*OPEN',
                      text, re.DOTALL)
        if m:
            next_imp = {"id": m.group(1), "title": m.group(2)}
        return {"open": open_count, "closed": closed_count, "next": next_imp}
    except Exception:
        return {"open": 0, "closed": 0, "next": {}}


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
        "venv": venv_path.exists(),
        "lm_studio": lm["ok"],
        "venv_path": str(venv_path),
        "lm_model": LM_MODEL,
        "lm_models": lm.get("models", []),
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
    result: dict = {"elo": {}, "draw_rate": None, "benchmark": {}}
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
                break
            except Exception:
                pass
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
                m_id = re.match(r'(IMP-\d+)', block)
                if m_id:
                    entry["id"] = m_id.group(1)
                m_title = re.search(r"title:\s*['\"]?([^'\"\n]+)['\"]?", block)
                if m_title:
                    entry["title"] = m_title.group(1).strip()
                m_lane = re.search(r'lane:\s*(\w+)', block)
                if m_lane:
                    entry["lane"] = m_lane.group(1)
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


# Chaînes prédéfinies
CHAINS = {
    "recall":   {"label": "Recall",        "lane": "SAFE_AUTO",    "cmd": f'python "{KAIZEN}" recall'},
    "audit":    {"label": "Audit hygiene", "lane": "SAFE_AUTO",    "cmd": f'python "{HYGIENE}" --audit'},
    "propose":  {"label": "Propose",       "lane": "SAFE_AUTO",    "cmd": f'python "{KAIZEN}" propose'},
    "metrics":  {"label": "Métriques",     "lane": "SAFE_AUTO",    "cmd": f'python "{KAIZEN}" metrics'},
    "smoke":    {"label": "Smoke benchmark","lane": "AUDIT_REQUIRED","cmd": r'powershell -ExecutionPolicy Bypass -File .\scripts\studioV2\run_benchmark.ps1 -Smoke -RunClass exploration_only'},
    "coach":    {"label": "Coach Rocky",   "lane": "AUDIT_REQUIRED","cmd": r'powershell -ExecutionPolicy Bypass -Command "$env:TCS_MINIMAX_DEPTH=\"3\"; $env:TCS_MOVE_TIME_MS=\"300\"; cargo run --release -- simulate_chess960 518 3 2>&1 | Out-File rocky_debug.log -Encoding utf8"'},
    "tests":    {"label": "Cargo tests",   "lane": "AUDIT_REQUIRED","cmd": "cargo test 2>&1"},
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
  <div class="sb-item active" onclick="nav('pilote')"><span class="ico">⬡</span> Pilote <span class="sb-badge badge-amber" id="badge-actions">0</span></div>
  <div class="sb-item" onclick="nav('chains')"><span class="ico">⛓</span> Chaînes</div>
  <div class="sb-item" onclick="nav('logs')"><span class="ico">▶</span> Logs</div>

  <div class="sb-section">Studio</div>
  <div class="sb-item" onclick="nav('memory')"><span class="ico">◈</span> Mémoire</div>
  <div class="sb-item" onclick="nav('ideas')"><span class="ico">◎</span> Idées <span class="sb-badge badge-amber" id="badge-ideas">12</span></div>
  <div class="sb-item" onclick="nav('roadmap')"><span class="ico">↗</span> Idée → Roadmap</div>

  <div class="sb-item" onclick="nav('metrics')"><span class="ico">📊</span> Métriques</div>
  <div class="sb-item" onclick="nav('dataset')"><span class="ico">🧠</span> Dataset & IA</div>

  <div class="sb-section">IA Joueur</div>
  <div class="sb-item" onclick="nav('agents')"><span class="ico">🤖</span> Agents</div>
  <div class="sb-item" onclick="nav('ligue')"><span class="ico">🏆</span> Ligue</div>
  <div class="sb-item" onclick="nav('roadmap-ia')"><span class="ico">🗺</span> Roadmap IA</div>

  <div class="sb-section">Création JV</div>
  <div class="sb-item" onclick="nav('moteur')"><span class="ico">💻</span> Moteur &amp; code</div>
  <div class="sb-item" onclick="nav('design')"><span class="ico">🎨</span> Design &amp; assets</div>
  <div class="sb-item" onclick="nav('roadmap-jeux')"><span class="ico">🗾</span> Roadmap jeux</div>

  <div class="sb-section">Config</div>
  <div class="sb-item" onclick="nav('config')"><span class="ico">⚙</span> Config</div>

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
    <div class="tb-stat">Sprint <span class="val">2026-05-30</span></div>
    <div class="tb-sep"></div>
    <div class="tb-stat">Ledger <span class="val" id="tb-ledger">--/--</span></div>
    <div class="tb-right">
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

    <!-- ── PILOTE ── -->
    <div id="page-pilote" class="page active">
      <div class="stats-row">
        <div class="stat-blk amber">
          <div class="stat-lbl">Prochaine action</div>
          <div class="stat-val" style="font-size:18px;padding-top:4px" id="next-action">—</div>
          <div class="stat-sub" id="next-lane">Lancer un audit pour proposer</div>
        </div>
        <div class="stat-blk red">
          <div class="stat-lbl">Issues HIGH</div>
          <div class="stat-val">3</div>
          <div class="stat-sub">NEW-02 · NEW-03 · NEW-05</div>
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
          <div class="divider">État repo (2026-05-30)</div>
          <div class="card">
            <table>
              <thead><tr><th>Surface</th><th>Statut</th></tr></thead>
              <tbody>
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
        <button class="btn btn-amber" onclick="lmSynthesizeMemory()">⚡ LM Studio — synthèse corpus</button>
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
        <button class="btn btn-amber" onclick="lmAnalyzeIdeas()">⚡ LM Studio — analyser et prioriser</button>
      </div>
      <div class="filter-row" id="idea-filters">
        <button class="filter-btn active" onclick="filterIdeas('all')">Tout</button>
        <button class="filter-btn" onclick="filterIdeas('studio')">Studio</button>
        <button class="filter-btn" onclick="filterIdeas('ia')">IA Joueur</button>
        <button class="filter-btn" onclick="filterIdeas('jv')">Création JV</button>
        <button class="filter-btn" onclick="filterIdeas('backlog')">Backlog</button>
        <button class="filter-btn" onclick="filterIdeas('wip')">En cours</button>
      </div>
      <div id="ideas-grid"></div>
    </div>

    <!-- ── IDÉE → ROADMAP ── -->
    <div id="page-roadmap" class="page">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Développer une idée en roadmap</div>
          <span class="pill p-audit">LM Studio</span>
        </div>
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
        <div class="form-row">
          <div class="form-group">
            <label>Type de sortie</label>
            <select id="rm-type">
              <option value="roadmap">Roadmap par phases</option>
              <option value="charter">Task Charter YAML</option>
              <option value="spec">Spec technique</option>
              <option value="analyse">Analyse + ROI</option>
              <option value="redteam">Red Team — challenges</option>
            </select>
          </div>
          <div class="form-group">
            <label>Profondeur</label>
            <select id="rm-depth">
              <option value="quick">Rapide (300 tokens)</option>
              <option value="normal" selected>Normale (~800 tokens, ~100s)</option>
              <option value="deep">Profonde (~2000 tokens, ~250s)</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-amber" onclick="generateRoadmap()">⚡ Générer via LM Studio</button>
          <button class="btn" onclick="saveRoadmapToMemory()">◈ Sauver en mémoire</button>
          <span id="rm-status" style="font-size:11px;color:var(--text3)"></span>
        </div>
      </div>

      <div class="divider">Sortie</div>
      <div id="rm-output" class="roadmap-out">La sortie LM Studio apparaît ici...</div>
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
          <tbody>
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
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Terminés</div>
          <div class="bracket-match match-done">
            <span>teacher_uci vs heuristic</span><span style="font-weight:700">1424 &gt; 1200 ✓</span>
          </div>
          <div class="bracket-match match-done">
            <span>teacher_uci vs neural</span><span style="font-weight:700">1424 &gt; 975 ✓</span>
          </div>
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin:8px 0 6px">Prochain</div>
          <div class="bracket-match match-next">
            <span>heuristic vs neural</span><span>⏳ planifié</span>
          </div>
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin:8px 0 6px">Planifiés</div>
          <div class="bracket-match match-planned">
            <span>Nouvelle saison</span><span>HumanGate requis</span>
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
  memory: { fusions: [], decisions: [] },
  ideas: [
    {id:1,chain:'studio',status:'backlog',title:'Chaîne Red Team + Fusion — interroger blocages des 3 pipes',roi:'high',lane:'audit',desc:'Ajouter aux 3 chaînes une couche Red Team + Fusion. Prompts types : blocage, brainstorm, calcul ROI automatisé.',issue:''},
    {id:2,chain:'studio',status:'backlog',title:'Mode éphémère — sessions de réflexion sans persistence',roi:'med',lane:'safe',desc:'Garder uniquement les fusions avec utilité mesurable. Évite l\'accumulation de docs inutiles.',issue:''},
    {id:3,chain:'studio',status:'backlog',title:'Hygiène automatique : doc → vérité → commit → push',roi:'high',lane:'human',desc:'Étendre chain_hygiene.ps1 pour validation cohérence doc/code puis déclencher commit + push quand tout est vert.',issue:''},
    {id:4,chain:'studio',status:'backlog',title:'LM Studio pilote les 3 lanes en local',roi:'high',lane:'human',desc:'Amener LM Studio à piloter le studio : review L1 packs, routing tâches, gestion chaînes. Phase 2 LLM documentée.',issue:''},
    {id:5,chain:'studio',status:'backlog',title:'Interface UxPilote consolidée',roi:'med',lane:'human',desc:'Roadmap générale, roadmaps individuelles, état chaînes. Phase 1 = cockpit lecture seule.',issue:''},
    {id:6,chain:'ia',status:'backlog',title:'Mode éphémère dataset : plus de tests, moins de sauvegarde',roi:'high',lane:'audit',desc:'Tourner des parties de test sans sauvegarder le dataset. Conserver uniquement rapports métriques/stats.',issue:'NEW-03'},
    {id:7,chain:'ia',status:'backlog',title:'LoRA sur corpus studio — contrôle flambée datasets',roi:'med',lane:'audit',desc:'Phase 3 LLM. Taille max, critère de rétention, purge auto des runs qui n\'ont pas passé RegressionGuard.',issue:''},
    {id:8,chain:'ia',status:'backlog',title:'Cartes variantes Rocky — architecture et dataset',roi:'med',lane:'safe',desc:'Plan-cartes visuels des variantes Search-only, Search+Neural, Search+Neural+LLM et variantes dataset.',issue:''},
    {id:9,chain:'ia',status:'backlog',title:'Stats, télémétrie et triage dataset — freeze baselines',roi:'high',lane:'audit',desc:'Draw rate par phase, conversion rate, ELO delta par run. Triage statistique. Freezer baselines d\'appel.',issue:'#3'},
    {id:10,chain:'jv',status:'backlog',title:'Manifeste de création de jeu + manifeste de règles via Godot',roi:'high',lane:'safe',desc:'Deux manifestes = successions de prompts. Commencer par les échecs pour valider la méthode.',issue:''},
    {id:11,chain:'jv',status:'backlog',title:'Adaptateur Rocky → Godot — pipeline complet avec auto-amélioration',roi:'high',lane:'human',desc:'Adaptateur complet Rocky (Rust) ↔ Godot. Auto-amélioration intégrée avant validation.',issue:''},
    {id:12,chain:'jv',status:'backlog',title:'Matrice cartes/nom → prompt génération modèles Godot',roi:'med',lane:'safe',desc:'Matrice structurée : (nom + type + faction + budget) → prompt génère modèle Godot de qualité.',issue:''},
  ],
  ideaFilter: 'all',
  ideaCounter: 12,
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
  if (id === 'roadmap-ia') id = 'metrics';
  if (id === 'ideas') renderIdeas();
  if (id === 'chains') renderChains();
  if (id === 'memory') renderMemory();
  if (id === 'logs') { refreshLogs(); loadDevstralStatus(); }
  if (id === 'metrics' || id === 'ligue') loadMetrics();
  if (id === 'dataset') loadDataset();
  if (id === 'pilote') loadSessionContext();
  if (id === 'agents') loadAgents();
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
  } catch(e) {}
}
setInterval(checkLM, 15000); checkLM(); // poll toutes les 15s — Devstral génère à 8 t/s

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
  if (S.pendingChain) { await triggerChain(S.pendingChain); S.pendingChain = null; }
}

async function runKaizenSequence() {
  for (const id of ['recall','audit','propose']) {
    await triggerChain(id);
    await new Promise(r => setTimeout(r, 800));
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
  const type = document.getElementById('rm-type').value;
  const depth = document.getElementById('rm-depth').value;
  const chain = document.getElementById('rm-chain').value;
  const status = document.getElementById('rm-status');
  const out = document.getElementById('rm-output');
  if (!title) { status.textContent = 'Titre requis'; return; }
  // Devstral context 32k, timeout 120s, 8 t/s = ~960 tokens max safe
// Mais on peut monter le timeout pour deep
const maxTokens = {quick:300,normal:800,deep:2000}[depth];
  const typePrompts = {
    roadmap: 'Génère une roadmap par phases avec étapes concrètes, statuts, priorités et dépendances.',
    charter: 'Génère un Task Charter YAML pour Claude Code avec: objective, allowed_files, lane, smoke_level, forbidden_surfaces.',
    spec: 'Génère une spécification technique détaillée avec architecture, contrats, et critères de succès.',
    analyse: 'Analyse cette idée : problème résolu, valeur ajoutée, ROI estimé (impact/effort), risques, alternatives.',
    redteam: 'Fais un Red Team de cette idée : challenges, angles morts, risques cachés, contre-arguments, questions sans réponse.',
  };
  const prompt = `Idée : "${title}"
Chaîne : ${chain}
Contexte : ${context || 'Tactical Chess Studio — studio AI-gouverné, Rocky = IA joueur Rust, LM Studio local, Kaizen loop.'}

${typePrompts[type]}

Contraintes : HumanGate requis pour training/benchmark/dataset reset/push main. claim_verdict: NO_CLAIM_ALLOWED.`;
  const fullSystem = 'Tu es architecte senior du Tactical Chess Studio (TCS).\n' +
    'Studio solo (1 dev : Pierre/HumanGate). Pas d\'équipe.\n' +
    '3 chaînes Kaizen : IA Joueur (Rocky), Studio, Création JV.\n' +
    'Rocky = Rust+neural+LLM coach. LM Studio = Devstral-small-2507 (8 t/s).\n' +
    'Lane matrix : SAFE_AUTO/AUDIT_REQUIRED/HUMAN_REQUIRED/FORBIDDEN.\n' +
    'IMPROVEMENT_LEDGER.yaml = SSOT (lab/chains/). CI/PR/push BLOQUÉS.\n' +
    'Issues HIGH : NEW-02 draw, NEW-03 dataset corrompu, NEW-05 curriculum absent.\n' +
    'Sois concis et actionnable. Utilise les vrais noms. claim_verdict: NO_CLAIM_ALLOWED.';
  status.textContent = '⚡ Génération... (~' + {quick:'40s',normal:'100s',deep:'250s'}[depth] + ')';
  out.textContent = '';
  document.getElementById('lm-text').textContent = '⟳ Génération...';
  const result = await lmStreamCall(prompt, fullSystem, maxTokens, out, status);
  if (result !== null) {
    document.getElementById('rm-output').__lastOutput = result;
    checkLM();
  } else {
    out.textContent = '⟳ Devstral génère à ~8 tokens/s...';
    try {
      const r = await fetch('/api/lm-ask', {method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({prompt, system:fullSystem, max_tokens:maxTokens})});
      const d = await r.json();
      out.textContent = d.response || d.error;
      status.textContent = d.error ? '✗ Erreur' : '✓ Généré';
      checkLM();
      document.getElementById('rm-output').__lastOutput = d.response || '';
    } catch(e) { out.textContent = 'Erreur connexion LM Studio'; status.textContent = '✗ Erreur'; }
  }
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
  nav('roadmap');
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
  nav('roadmap');
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
function showIdeaModal() { document.getElementById('idea-modal').classList.add('open'); }
function filterIdeas(f) {
  S.ideaFilter = f;
  document.querySelectorAll('#idea-filters .filter-btn').forEach((b,i) => b.classList.toggle('active',['all','studio','ia','jv','backlog','wip'][i]===f));
  renderIdeas();
}
function addIdea() {
  const title = document.getElementById('im-title').value.trim();
  if (!title) return;
  S.ideaCounter++;
  S.ideas.unshift({
    id:S.ideaCounter,
    chain:document.getElementById('im-chain').value,
    status:'backlog',
    title,
    roi:document.getElementById('im-roi').value,
    lane:document.getElementById('im-lane').value,
    desc:document.getElementById('im-desc').value.trim(),
    issue:document.getElementById('im-issue').value.trim()
  });
  document.getElementById('badge-ideas').textContent = S.ideas.length;
  closeModal('idea-modal');
  ['im-title','im-desc','im-issue'].forEach(id => document.getElementById(id).value='');
  renderIdeas();
}
function cycleIdeaStatus(id) {
  const idea = S.ideas.find(i=>i.id===id);
  if (!idea) return;
  idea.status = idea.status==='backlog'?'wip':idea.status==='wip'?'done':'backlog';
  renderIdeas();
}
function openIdeaInRoadmap(id) {
  const idea = S.ideas.find(i=>i.id===id);
  if (!idea) return;
  document.getElementById('rm-title').value = idea.title;
  document.getElementById('rm-context').value = idea.desc;
  document.getElementById('rm-chain').value = idea.chain;
  nav('roadmap');
}
function renderIdeas() {
  const el = document.getElementById('ideas-grid');
  if (!el) return;
  const filtered = S.ideas.filter(i => {
    const f = S.ideaFilter;
    if (f==='all') return true;
    if (f==='backlog') return i.status==='backlog';
    if (f==='wip') return i.status==='wip';
    return i.chain===f;
  });
  el.innerHTML = filtered.map(idea => {
    const dotColor = idea.status==='wip'?'var(--amber)':idea.status==='done'?'var(--green)':'var(--border2)';
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
        <button class="btn btn-sm ${idea.status==='wip'?'btn-amber':''}" onclick="cycleIdeaStatus(${idea.id})">${idea.status==='backlog'?'→ Démarrer':idea.status==='wip'?'✓ En cours':'↩ Backlog'}</button>
        <button class="btn btn-sm btn-amber" onclick="openIdeaInRoadmap(${idea.id})">↗ Générer roadmap</button>
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
function updateNextAction() {
  const nxt = document.getElementById('next-action');
  const lane = document.getElementById('next-lane');
  if (nxt) { nxt.textContent = 'Recall → Audit'; lane.textContent = 'SAFE_AUTO — lancez la séquence Kaizen'; }
}

// ── INIT ──────────────────────────────────────────────────────────────────
document.getElementById('mem-count').textContent = S.memory.fusions.length;
document.getElementById('badge-ideas').textContent = S.ideas.length;
updateNextAction();
renderIdeas();

// Commit message default
const commitEl = document.getElementById('commit-msg');
if (commitEl) commitEl.value = 'docs: mise à jour ' + new Date().toISOString().slice(0,10) + ' — session autopilote';

// Charger mémoire depuis API (renderMemory gère tout)
renderMemory();

// Charger session context au boot
loadSessionContext();
loadMetrics();

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

// ── CLAUDE MODE — 3 PASSES ────────────────────────────────────────────────
// supprimé — système local Devstral uniquement
async function launchFusionComplete() { return; }

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
  try {
    const r = await fetch('/api/metrics');
    const d = await r.json();
    if (d.elo) { if (d.elo.teacher_uci) elo.teacher_uci = d.elo.teacher_uci;
                 if (d.elo.heuristic)   elo.heuristic   = d.elo.heuristic;
                 if (d.elo.neural)      elo.neural       = d.elo.neural; }
    drawRate = d.draw_rate ?? null;
  } catch(e) {}
  const maxElo = Math.max(elo.teacher_uci, elo.heuristic, elo.neural, 1);
  grid.innerHTML = AGENTS_DEF.map(a => {
    const agentElo = elo[a.id] || 0;
    const pct      = Math.round((agentElo / maxElo) * 100);
    const sCls     = a.status === 'STABLE' ? 'p-done' : 'p-blocked';
    const drHtml   = (a.id === 'neural' && drawRate != null)
      ? '<div style="font-size:10px;color:' + (drawRate > 0.5 ? 'var(--red)' : 'var(--amber)') +
        ';margin-top:4px">Draw rate : ' + Math.round(drawRate * 100) + '%</div>' : '';
    return '<div class="agent-card" id="ac-' + a.id + '">' +
      '<div class="agent-card-header" onclick="toggleAgentCard(\'' + a.id + '\')">' +
        '<div style="font-size:22px;width:32px;text-align:center">' + a.icon + '</div>' +
        '<div style="flex:1">' +
          '<div style="font-family:var(--font-d);font-size:14px;font-weight:700;color:var(--text)">' + a.label + '</div>' +
          '<div style="font-size:10px;color:var(--text3);margin-top:1px">' + a.arch + '</div>' +
          '<div style="display:flex;align-items:center;gap:10px;margin-top:7px">' +
            '<div class="agent-elo-bar-wrap"><div class="agent-elo-bar" style="width:' + pct + '%;background:' + a.color + '"></div></div>' +
            '<span style="font-family:var(--font-d);font-size:15px;font-weight:800;color:' + a.color + ';white-space:nowrap">ELO ' + agentElo + '</span>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">' +
          '<span class="pill ' + sCls + '">' + a.status + '</span>' +
          '<span style="font-size:14px;color:var(--text3)" id="ac-arrow-' + a.id + '">▸</span>' +
        '</div>' +
      '</div>' +
      '<div class="agent-body" id="ab-' + a.id + '">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">' +
          '<div><div class="stat-lbl">Architecture</div><div style="font-size:12px;color:var(--text2);margin-top:3px">' + a.arch + '</div></div>' +
          '<div><div class="stat-lbl">Dataset</div><div style="font-size:12px;color:var(--text2);margin-top:3px">' + a.dataset + '</div></div>' +
          '<div><div class="stat-lbl">ELO</div><div style="font-family:var(--font-d);font-size:22px;font-weight:800;color:' + a.color + ';margin-top:3px">' + agentElo + '</div></div>' +
          '<div><div class="stat-lbl">Statut</div><div style="margin-top:3px"><span class="pill ' + sCls + '">' + a.status + '</span></div></div>' +
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

async function launchClaudeMode() {}
</script>
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

        elif path == "/api/health":
            self.send_json(get_health())

        elif path == "/api/staleness":
            self.send_json(get_staleness())

        elif path == "/api/metrics":
            self.send_json(get_metrics())

        elif path == "/api/dataset-status":
            self.send_json(get_dataset_status())

        elif path == "/api/session-context":
            self.send_json(get_session_context())

        else:
            self.send_json({"error": "not found"}, 404)

    def do_POST(self):
        global LM_HOST, LM_MODEL, REPO
        path = self.path
        body = self.read_body()

        if path == "/api/run-chain":
            cmd  = body.get("cmd", "")
            cid  = body.get("id", "")
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
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()
            try:
                lm_stream_to(prompt, system, max_tokens, self.wfile)
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
                        "claim_verdict: NO_CLAIM_ALLOWED"
                    )
                    sys_ = "Tu es FusionAuditor du Tactical Chess Studio. Sois concis. claim_verdict: NO_CLAIM_ALLOWED"
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
                        "claim_verdict: NO_CLAIM_ALLOWED"
                    )
                    sys_ = "Tu es FusionAuditor du Tactical Chess Studio. claim_verdict: NO_CLAIM_ALLOWED"
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
                            "claim_verdict": "NO_CLAIM_ALLOWED",
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
                    "claim_verdict": "NO_CLAIM_ALLOWED",
                })

        elif path == "/api/config":
            LM_HOST  = body.get("lm_host", LM_HOST)
            LM_MODEL = body.get("model", LM_MODEL)
            if body.get("repo"):
                REPO = Path(body["repo"])
            self.send_json({"ok": True})

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
