#!/usr/bin/env python3
"""
state_updater.py — TCS Studio State Updater
Lit les sources réelles (ledger, benchmark, golden, lora, autopilot) et met à jour :
  - 07_CURRENT_STATE.md  (champs structurés uniquement)
  - lab/studio_state_snapshot.json  (snapshot automation)

Contraintes :
  - Aucun accès git write
  - Compatible Windows PowerShell
  - claim_verdict: NO_CLAIM_ALLOWED | no_global_ready_verdict: true
  - Markers ASCII : [OK] [!] [X]
"""

import json
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).parent

LEDGER_PATH    = REPO / "lab" / "chains" / "IMPROVEMENT_LEDGER.yaml"
BENCHMARK_PATH = REPO / "lab" / "reports" / "latest_benchmark_summary.json"
GOLDEN_PATH    = REPO / "lab" / "chains" / "golden_examples.jsonl"
ACTIVE_DS_PATH = REPO / "lab" / "ACTIVE_DATASET.txt"
LORA_CFG_PATH  = REPO / "ml" / "lora_config.yaml"
AUTOPILOT_PATH = REPO / "autopilot.py"
STATE_DOC_PATH = REPO / "00_STUDIO_CONTROL" / "00_MASTER_DOCS" / "07_CURRENT_STATE.md"
SNAPSHOT_PATH  = REPO / "lab" / "studio_state_snapshot.json"


def read_file_safe(path: Path, encoding: str = "utf-8") -> "str | None":
    try:
        return path.read_text(encoding=encoding, errors="replace")
    except Exception as e:
        print(f"[X] Lecture échouée : {path.name} — {e}")
        return None


def count_lines(path: Path) -> "int | None":
    try:
        n = 0
        with path.open(encoding="utf-8", errors="replace") as f:
            for _ in f:
                n += 1
        return n
    except Exception as e:
        print(f"[X] Comptage lignes échoué : {path.name} — {e}")
        return None


def parse_ledger(content: str) -> dict:
    ids = re.findall(r"^- id: (IMP-\d+)", content, re.MULTILINE)
    statuses = re.findall(r"^\s+status:\s+(\w+)", content, re.MULTILINE)
    counts = Counter(statuses)
    open_items = []
    for block in re.split(r"^- id:", content, flags=re.MULTILINE)[1:]:
        bid = re.match(r"\s*(IMP-\d+)", block)
        btitle = re.search(r"^\s+title:\s+(.+)", block, re.MULTILINE)
        bstatus = re.search(r"^\s+status:\s+(\w+)", block, re.MULTILINE)
        blane = re.search(r"^\s+lane:\s+(\S+)", block, re.MULTILINE)
        if bid and bstatus and bstatus.group(1) in ("OPEN", "DEFERRED"):
            open_items.append({
                "id": bid.group(1).strip(),
                "title": btitle.group(1).strip() if btitle else "?",
                "status": bstatus.group(1),
                "lane": blane.group(1) if blane else "?",
            })
    return {
        "total": len(ids),
        "closed": counts.get("CLOSED", 0),
        "open": counts.get("OPEN", 0),
        "deferred": counts.get("DEFERRED", 0),
        "open_items": open_items,
    }


def parse_benchmark(content: str) -> dict:
    try:
        data = json.loads(content.lstrip("﻿"))
        return {
            "draw_rate": data.get("draw_rate"),
            "elo_teacher_uci": data.get("elo_teacher_uci"),
            "elo_heuristic": data.get("elo_heuristic"),
            "elo_neural": data.get("elo_neural"),
            "games": data.get("games"),
            "date": data.get("date"),
            "source": data.get("source"),
        }
    except Exception as e:
        print(f"[!] Parse benchmark échoué : {e}")
        return {}


def parse_lora_status(content: str) -> dict:
    status_m    = re.search(r"^status:\s+(\S+)", content, re.MULTILINE)
    total_m     = re.search(r"total_examples:\s+(\d+)", content)
    threshold_m = re.search(r"threshold_to_train:\s+(\d+)", content)
    target_m    = re.search(r'target_model:\s+"?([^"\n]+)"?', content)
    return {
        "status":         status_m.group(1) if status_m else "UNKNOWN",
        "total_examples": int(total_m.group(1)) if total_m else None,
        "threshold":      int(threshold_m.group(1)) if threshold_m else None,
        "target_model":   target_m.group(1).strip() if target_m else "UNKNOWN",
    }


def collect_state() -> dict:
    today = datetime.now().strftime("%Y-%m-%d")
    state: dict = {"date": today, "claim_verdict": "NO_CLAIM_ALLOWED"}

    raw = read_file_safe(LEDGER_PATH)
    if raw:
        state["ledger"] = parse_ledger(raw)
        l = state["ledger"]
        print(f"[OK] Ledger : {l['total']} IMPs — {l['closed']} CLOSED, {l['open']} OPEN, {l['deferred']} DEFERRED")
    else:
        state["ledger"] = {}
        print("[X] Ledger non lisible")

    raw = read_file_safe(BENCHMARK_PATH)
    if raw:
        state["benchmark"] = parse_benchmark(raw)
        b = state["benchmark"]
        print(f"[OK] Benchmark : ELO teacher={b.get('elo_teacher_uci')} "
              f"heuristic={b.get('elo_heuristic')} neural={b.get('elo_neural')} "
              f"draw_rate={b.get('draw_rate')} ({b.get('games')} parties)")
    else:
        state["benchmark"] = {}
        print("[X] Benchmark non lisible")

    golden = count_lines(GOLDEN_PATH)
    state["golden_examples"] = golden
    if golden is not None:
        print(f"[OK] Golden examples : {golden} lignes")
    else:
        print("[X] Golden examples non lisible")

    raw = read_file_safe(ACTIVE_DS_PATH)
    state["active_dataset"] = raw.strip() if raw else None
    if state["active_dataset"]:
        print(f"[OK] ACTIVE_DATASET : {state['active_dataset']}")
    else:
        print("[!] ACTIVE_DATASET.txt absent ou vide")

    raw = read_file_safe(LORA_CFG_PATH)
    if raw:
        state["lora"] = parse_lora_status(raw)
        lo = state["lora"]
        print(f"[OK] LoRA : {lo['status']}, {lo['total_examples']} exemples, seuil {lo['threshold']}")
    else:
        state["lora"] = {}
        print("[X] LoRA config non lisible")

    ap = count_lines(AUTOPILOT_PATH)
    state["autopilot_lines"] = ap
    if ap is not None:
        print(f"[OK] autopilot.py : {ap} lignes")
    else:
        print("[X] autopilot.py non lisible")

    return state


def _replace_table_field(doc: str, label: str, value: "int | float | str") -> str:
    pattern = rf"(\| {re.escape(label)} \| )[^\|]*\|+"
    replacement = rf"\g<1>{value} |"
    return re.sub(pattern, replacement, doc)


def update_markdown(state: dict, doc_path: Path = STATE_DOC_PATH) -> bool:
    raw = read_file_safe(doc_path)
    if not raw:
        print(f"[X] {doc_path.name} non lisible — abandon update markdown")
        return False

    doc = raw
    today = state["date"]

    doc = re.sub(r"(Date : )\d{4}-\d{2}-\d{2}", rf"\g<1>{today}", doc)

    ledger = state.get("ledger", {})
    for label, key in [
        ("Total IMPs", "total"),
        ("CLOSED",     "closed"),
        ("OPEN",       "open"),
        ("DEFERRED",   "deferred"),
    ]:
        val = ledger.get(key)
        if val is not None:
            doc = _replace_table_field(doc, label, val)

    bench = state.get("benchmark", {})
    for agent_label, bench_key in [
        ("teacher_uci", "elo_teacher_uci"),
        ("heuristic",   "elo_heuristic"),
        ("neural",      "elo_neural"),
    ]:
        val = bench.get(bench_key)
        if val is not None:
            doc = _replace_table_field(doc, agent_label, val)

    dr = bench.get("draw_rate")
    if dr is not None:
        doc = re.sub(r"(\*\*draw_rate\*\* : )[\d\.]+", rf"\g<1>{dr}", doc)

    golden = state.get("golden_examples")
    if golden is not None:
        doc = re.sub(
            r"(\| Corpus golden \| )\d+ exemples[^\|]*",
            rf"\g<1>{golden} exemples (golden_collector_v1) ",
            doc,
        )

    ap = state.get("autopilot_lines")
    if ap is not None:
        doc = re.sub(r"(\*\*Lignes\*\* : ~?)\d+", rf"\g<1>{ap}", doc)

    if doc != raw:
        doc_path.write_text(doc, encoding="utf-8")
        print(f"[OK] {doc_path.name} mis à jour")
        return True

    print(f"[!] {doc_path.name} — aucun changement détecté (valeurs déjà à jour ou patterns introuvables)")
    return False


def write_snapshot(state: dict, path: Path = SNAPSHOT_PATH) -> None:
    try:
        path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[OK] Snapshot écrit : {path.name}")
    except Exception as e:
        print(f"[X] Écriture snapshot échouée : {e}")


def main() -> int:
    print("=" * 60)
    print("TCS State Updater — mise à jour docs studio")
    print(f"Date : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    print()

    state = collect_state()
    print()

    update_markdown(state)
    write_snapshot(state)

    print()
    print("=" * 60)
    print("Rapport final")
    print(f"  software_verdict : state_updater.py exécuté")
    print(f"  evidence_verdict : sources lues depuis fichiers réels")
    print(f"  claim_verdict    : NO_CLAIM_ALLOWED")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
