"""
Tests pour state_updater.py — IMP-048
Compatible : .venv312/Scripts/python.exe -m pytest lab/tests/test_state_updater.py
"""

import json
import sys
import tempfile
from pathlib import Path

# Ajout du root repo au path pour import
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import state_updater as su


# ──────────────────────────────────────────────────────────────────────────────
# parse_ledger
# ──────────────────────────────────────────────────────────────────────────────

SAMPLE_LEDGER = """
meta:
  ledger_version: v0
improvements:
- id: IMP-001
  title: Fix foo
  status: CLOSED
  lane: SAFE_AUTO
- id: IMP-002
  title: Fix bar
  status: OPEN
  lane: FORBIDDEN
- id: IMP-003
  title: Fix baz
  status: DEFERRED
  lane: SAFE_AUTO
- id: IMP-004
  title: Fix qux
  status: CLOSED
  lane: SAFE_AUTO
"""


def test_parse_ledger_counts():
    result = su.parse_ledger(SAMPLE_LEDGER)
    assert result["total"] == 4
    assert result["closed"] == 2
    assert result["open"] == 1
    assert result["deferred"] == 1


def test_parse_ledger_open_items():
    result = su.parse_ledger(SAMPLE_LEDGER)
    assert len(result["open_items"]) == 2
    ids = {item["id"] for item in result["open_items"]}
    assert "IMP-002" in ids
    assert "IMP-003" in ids


def test_parse_ledger_empty():
    result = su.parse_ledger("")
    assert result["total"] == 0
    assert result["closed"] == 0
    assert result["open"] == 0


# ──────────────────────────────────────────────────────────────────────────────
# parse_benchmark
# ──────────────────────────────────────────────────────────────────────────────

SAMPLE_BENCHMARK = json.dumps({
    "draw_rate": 0.68,
    "elo_heuristic": 1183,
    "elo_neural": 1079,
    "elo_teacher_uci": 1351,
    "games": 110,
    "date": "2026-06-03",
    "source": "benchmark_post_39_imps",
})


def test_parse_benchmark_fields():
    result = su.parse_benchmark(SAMPLE_BENCHMARK)
    assert result["draw_rate"] == 0.68
    assert result["elo_teacher_uci"] == 1351
    assert result["elo_heuristic"] == 1183
    assert result["elo_neural"] == 1079
    assert result["games"] == 110


def test_parse_benchmark_invalid_json():
    result = su.parse_benchmark("not-json{{{")
    assert result == {}


# ──────────────────────────────────────────────────────────────────────────────
# parse_lora_status
# ──────────────────────────────────────────────────────────────────────────────

SAMPLE_LORA = """
status: READY_FOR_HUMANGATE
dataset:
  total_examples: 57
  threshold_to_train: 50
model:
  target_model: "devstral-tcs-v1"
"""


def test_parse_lora_status_fields():
    result = su.parse_lora_status(SAMPLE_LORA)
    assert result["status"] == "READY_FOR_HUMANGATE"
    assert result["total_examples"] == 57
    assert result["threshold"] == 50
    assert result["target_model"] == "devstral-tcs-v1"


def test_parse_lora_status_missing():
    result = su.parse_lora_status("")
    assert result["status"] == "UNKNOWN"
    assert result["total_examples"] is None


# ──────────────────────────────────────────────────────────────────────────────
# count_lines
# ──────────────────────────────────────────────────────────────────────────────

def test_count_lines_temp_file():
    with tempfile.NamedTemporaryFile(mode="w", suffix=".jsonl", delete=False, encoding="utf-8") as f:
        f.write('{"a": 1}\n{"b": 2}\n{"c": 3}\n')
        tmp = Path(f.name)
    try:
        assert su.count_lines(tmp) == 3
    finally:
        tmp.unlink(missing_ok=True)


def test_count_lines_missing_file():
    result = su.count_lines(Path("/nonexistent/path/file.txt"))
    assert result is None


# ──────────────────────────────────────────────────────────────────────────────
# collect_state — structure obligatoire
# ──────────────────────────────────────────────────────────────────────────────

def test_state_required_keys():
    state = su.collect_state()
    for key in ("date", "claim_verdict", "ledger", "benchmark", "golden_examples", "lora", "autopilot_lines"):
        assert key in state, f"Clé manquante dans state: {key}"
    assert state["claim_verdict"] == "NO_CLAIM_ALLOWED"


def test_state_ledger_keys():
    state = su.collect_state()
    for key in ("total", "closed", "open", "deferred", "open_items"):
        assert key in state["ledger"], f"Clé manquante dans ledger: {key}"


# ──────────────────────────────────────────────────────────────────────────────
# update_markdown — sur fichier temporaire
# ──────────────────────────────────────────────────────────────────────────────

SAMPLE_STATE_DOC = """\
# Current State

Date : 2026-01-01 — sprint update

## Ledger — état 2026-01-01

| Métrique | Valeur |
|---|---|
| Total IMPs | 10 |
| CLOSED | 8 |
| OPEN | 1 |
| DEFERRED | 1 |

## Moteur Rocky

| Joueur | ELO |
|---|---|
| teacher_uci | 1000 |
| heuristic | 900 |
| neural | 800 |

- **draw_rate** : 0.50 (était 0.94 en mai)

## LoRA

| Corpus golden | 10 exemples (golden_collector_v1) |
| Total exemples | 20 (+ mode_claude_run + autodev) |

## Autopilote

- **Lignes** : ~1000 (refactorisé)
"""


def test_update_markdown_ledger_counts():
    state = {
        "date": "2026-06-04",
        "ledger": {"total": 48, "closed": 45, "open": 2, "deferred": 1},
        "benchmark": {},
        "golden_examples": None,
        "lora": {},
        "autopilot_lines": None,
    }
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False, encoding="utf-8") as f:
        f.write(SAMPLE_STATE_DOC)
        tmp = Path(f.name)
    try:
        result = su.update_markdown(state, doc_path=tmp)
        assert result is True
        updated = tmp.read_text(encoding="utf-8")
        assert "| Total IMPs | 48 |" in updated
        assert "| CLOSED | 45 |" in updated
        assert "| OPEN | 2 |" in updated
        assert "2026-06-04" in updated
        assert "| Total IMPs | 48 ||" not in updated
    finally:
        tmp.unlink(missing_ok=True)


def test_update_markdown_elo():
    state = {
        "date": "2026-06-04",
        "ledger": {},
        "benchmark": {"elo_teacher_uci": 1351, "elo_heuristic": 1183, "elo_neural": 1079, "draw_rate": 0.68},
        "golden_examples": None,
        "lora": {},
        "autopilot_lines": None,
    }
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False, encoding="utf-8") as f:
        f.write(SAMPLE_STATE_DOC)
        tmp = Path(f.name)
    try:
        su.update_markdown(state, doc_path=tmp)
        updated = tmp.read_text(encoding="utf-8")
        assert "| teacher_uci | 1351 |" in updated
        assert "| heuristic | 1183 |" in updated
        assert "| neural | 1079 |" in updated
        assert "**draw_rate** : 0.68" in updated
        assert "| teacher_uci | 1351 ||" not in updated
    finally:
        tmp.unlink(missing_ok=True)


def test_update_markdown_elo_idempotent_with_corrupt_pipes():
    corrupted = SAMPLE_STATE_DOC.replace(
        "| teacher_uci | 1000 |", "| teacher_uci | 1000 ||"
    )
    state = {
        "date": "2026-06-04",
        "ledger": {},
        "benchmark": {"elo_teacher_uci": 1351, "elo_heuristic": None, "elo_neural": None, "draw_rate": None},
        "golden_examples": None,
        "lora": {},
        "autopilot_lines": None,
    }
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False, encoding="utf-8") as f:
        f.write(corrupted)
        tmp = Path(f.name)
    try:
        su.update_markdown(state, doc_path=tmp)
        updated = tmp.read_text(encoding="utf-8")
        assert "| teacher_uci | 1351 |" in updated
        assert "| teacher_uci | 1351 ||" not in updated
    finally:
        tmp.unlink(missing_ok=True)


def test_update_markdown_golden():
    state = {
        "date": "2026-06-04",
        "ledger": {},
        "benchmark": {},
        "golden_examples": 42,
        "lora": {},
        "autopilot_lines": None,
    }
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False, encoding="utf-8") as f:
        f.write(SAMPLE_STATE_DOC)
        tmp = Path(f.name)
    try:
        su.update_markdown(state, doc_path=tmp)
        updated = tmp.read_text(encoding="utf-8")
        assert "42 exemples (golden_collector_v1)" in updated
    finally:
        tmp.unlink(missing_ok=True)


def test_update_markdown_autopilot_lines():
    state = {
        "date": "2026-06-04",
        "ledger": {},
        "benchmark": {},
        "golden_examples": None,
        "lora": {},
        "autopilot_lines": 3725,
    }
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False, encoding="utf-8") as f:
        f.write(SAMPLE_STATE_DOC)
        tmp = Path(f.name)
    try:
        su.update_markdown(state, doc_path=tmp)
        updated = tmp.read_text(encoding="utf-8")
        assert "**Lignes** : ~3725" in updated
    finally:
        tmp.unlink(missing_ok=True)


# ──────────────────────────────────────────────────────────────────────────────
# write_snapshot
# ──────────────────────────────────────────────────────────────────────────────

def test_write_snapshot_creates_valid_json():
    state = {
        "date": "2026-06-04",
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "ledger": {"total": 48},
        "benchmark": {"elo_teacher_uci": 1351},
        "golden_examples": 42,
        "lora": {"status": "READY_FOR_HUMANGATE"},
        "autopilot_lines": 3725,
    }
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as f:
        tmp = Path(f.name)
    try:
        su.write_snapshot(state, path=tmp)
        loaded = json.loads(tmp.read_text(encoding="utf-8"))
        assert loaded["claim_verdict"] == "NO_CLAIM_ALLOWED"
        assert loaded["ledger"]["total"] == 48
        assert loaded["golden_examples"] == 42
    finally:
        tmp.unlink(missing_ok=True)
