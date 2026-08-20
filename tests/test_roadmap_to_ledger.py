"""IMP-052 — Roadmap-to-Ledger : py_compile + logique parse/dedup/spec/proposals."""
import importlib.util
import py_compile
from pathlib import Path

import pytest

SCRIPT  = Path(__file__).resolve().parents[1] / "lab/chains/roadmap_to_ledger.py"
ROADMAP = Path(__file__).resolve().parents[1] / "00_STUDIO_CONTROL/00_MASTER_DOCS/01_ROADMAP.md"

_FAKE_ROADMAP = """\
## Phase 2 — Chess Fantasy + Studio

| Tâche | Statut | Priorité |
|---|---|---|
| Chess Fantasy runtime minimal (règles core) | DOCUMENTED_ONLY | P0 |
| Rocky muté pour Chess Fantasy | NOT_STARTED | P1 |
| Task with explicit IMP | IN_PROGRESS — IMP-047 OPEN (SAFE_AUTO) | P2 |
| Task IN_PROGRESS sans ref | IN_PROGRESS — en cours sans référence IMP | P3 |

## Phase 3 — Multi-jeux

| Tâche | Statut |
|---|---|
| LoRA Devstral TCS v2 | PLANNED |
"""


def _load():
    spec = importlib.util.spec_from_file_location("roadmap_to_ledger", SCRIPT)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


def test_script_compiles():
    py_compile.compile(str(SCRIPT), doraise=True)


def test_parse_extracts_target_statuses():
    mod   = _load()
    tasks = mod.parse_roadmap_tasks(_FAKE_ROADMAP)
    titles = [t["task"] for t in tasks]
    assert "Chess Fantasy runtime minimal (règles core)" in titles
    assert "Rocky muté pour Chess Fantasy" in titles
    assert "Task IN_PROGRESS sans ref" in titles
    assert "LoRA Devstral TCS v2" in titles


def test_parse_skips_in_progress_with_imp_ref():
    mod   = _load()
    tasks = mod.parse_roadmap_tasks(_FAKE_ROADMAP)
    titles = [t["task"] for t in tasks]
    assert "Task with explicit IMP" not in titles


def test_parse_on_real_roadmap():
    if not ROADMAP.exists():
        pytest.skip("01_ROADMAP.md absent")
    mod   = _load()
    tasks = mod.parse_roadmap_tasks(ROADMAP.read_text(encoding="utf-8"))
    assert len(tasks) > 0, "Doit extraire au moins une tâche du roadmap réel"
    for t in tasks:
        assert t["status"] in mod.TARGET_STATUSES
        assert t["task"]
        assert t["phase"]


def test_dedup_filters_high_overlap():
    mod = _load()
    existing = [{"title": "Chess Fantasy runtime minimal règles core", "id": "IMP-099"}]
    assert mod.is_duplicate("Chess Fantasy runtime minimal (règles core)", existing)


def test_dedup_passes_unrelated():
    mod = _load()
    existing = [{"title": "Chess Fantasy runtime minimal règles core", "id": "IMP-099"}]
    assert not mod.is_duplicate("Puzzles 3 niveaux vocabulaire officiel", existing)


def test_heuristic_spec_p0_critical():
    mod  = _load()
    task = {"task": "Chess Fantasy runtime minimal", "status": "DOCUMENTED_ONLY", "priority": "P0"}
    spec = mod.heuristic_spec(task)
    assert spec["impact"]  == "CRITICAL"
    assert spec["lane"]    in mod.VALID_LANES
    assert spec["effort"]  in mod.VALID_EFFORTS


def test_heuristic_spec_p3_medium():
    mod  = _load()
    task = {"task": "Puzzles 3 niveaux from errors", "status": "NOT_STARTED", "priority": "P3"}
    spec = mod.heuristic_spec(task)
    assert spec["impact"] == "MEDIUM"
    assert spec["effort"] in mod.VALID_EFFORTS


def test_proposals_structure():
    mod   = _load()
    tasks = mod.parse_roadmap_tasks(_FAKE_ROADMAP)
    proposals = mod.build_proposals(tasks, existing_imps=[], use_qwen=False)
    assert len(proposals) > 0
    required_top = {"prop_id", "source_phase", "source_task", "source_status",
                    "source_priority", "qwen_used", "humangate_verdict", "imp"}
    required_imp = {"title", "lane", "impact", "effort", "acceptance"}
    for p in proposals:
        assert required_top <= set(p.keys()), f"Clés manquantes dans {p.get('prop_id')}: {required_top - set(p.keys())}"
        assert p["humangate_verdict"] is None
        assert required_imp <= set(p["imp"].keys()), f"Clés imp manquantes : {required_imp - set(p['imp'].keys())}"
        assert p["imp"]["acceptance"] == "TBD"
        assert p["imp"]["lane"]   in mod.VALID_LANES
        assert p["imp"]["impact"] in mod.VALID_IMPACTS
        assert p["imp"]["effort"] in mod.VALID_EFFORTS


def test_proposals_no_duplicate_injected():
    mod  = _load()
    existing = [{"title": "Chess Fantasy runtime minimal règles core", "id": "IMP-099"}]
    tasks = mod.parse_roadmap_tasks(_FAKE_ROADMAP)
    proposals = mod.build_proposals(tasks, existing_imps=existing, use_qwen=False)
    titles = [p["source_task"] for p in proposals]
    assert "Chess Fantasy runtime minimal (règles core)" not in titles
