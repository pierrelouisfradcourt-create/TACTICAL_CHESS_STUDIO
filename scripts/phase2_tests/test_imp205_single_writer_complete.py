#!/usr/bin/env python3
"""IMP-205 — single-writer COMPLET : router roadmap_to_ledger + ledger_patch_* +
grep-guard AST (suivi IMP-194, AUDIT_REQUIRED, non fermé).

Acceptance : aucun writer du ledger hors guarded_write (grep-guard PASS sur l'arbre réel) ;
roadmap route via guarded_write avec concurrence optimiste ; one-shots routés sans crash.

Oracle : .venv312/Scripts/python.exe -m pytest scripts/phase2_tests/test_imp205_single_writer_complete.py -v
Tous les tests opèrent sur un répertoire temporaire (jamais le vrai ledger), sauf
test_real_tree_no_bypass qui SCANNE (lecture seule) le vrai arbre.
"""
from __future__ import annotations

import sys
import textwrap
from pathlib import Path

import pytest

_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_ROOT / "scripts"))
sys.path.insert(0, str(_ROOT / "governance"))
sys.path.insert(0, str(_ROOT / "lab" / "chains"))

import grep_guard_ledger as gg  # noqa: E402
import ledger_writer as lw      # noqa: E402


def _w(path: Path, src: str) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(textwrap.dedent(src), encoding="utf-8")
    return path


# ── grep-guard : DÉTECTION (vrais bypass → VIOLATION) ──────────────────────────

def test_detect_write_text(tmp_path):
    f = _w(tmp_path / "bad.py", '''
        from pathlib import Path
        LEDGER = Path(__file__).parent / "IMPROVEMENT_LEDGER.yaml"
        LEDGER.write_text("x", encoding="utf-8")
    ''')
    v = gg.scan_file(f, "bad.py")
    assert len(v) == 1 and v[0].primitive == ".write_text()"


def test_detect_open_w(tmp_path):
    f = _w(tmp_path / "bad.py", '''
        LEDGER_PATH = "lab/chains/IMPROVEMENT_LEDGER.yaml"
        with open(LEDGER_PATH, "w", encoding="utf-8") as fh:
            fh.write("x")
    ''')
    v = gg.scan_file(f, "bad.py")
    assert len(v) == 1 and "open" in v[0].primitive


def test_detect_atomic_replace_idiom(tmp_path):
    """C1 RED TEAM — l'idiome atomique tmp + os.replace(_, LEDGER) doit être vu."""
    f = _w(tmp_path / "bad.py", '''
        import os
        from pathlib import Path
        LEDGER = Path("x/IMPROVEMENT_LEDGER.yaml")
        tmp = Path("x/tmp")
        tmp.write_text("x", encoding="utf-8")
        os.replace(tmp, LEDGER)
    ''')
    v = gg.scan_file(f, "bad.py")
    prims = {x.primitive for x in v}
    assert any("os.replace" in p for p in prims), prims


def test_detect_path_replace_method(tmp_path):
    """Path.replace(LEDGER) : l'argument est la destination."""
    f = _w(tmp_path / "bad.py", '''
        from pathlib import Path
        LEDGER = Path("IMPROVEMENT_LEDGER.yaml")
        tmp = Path("tmp")
        tmp.replace(LEDGER)
    ''')
    v = gg.scan_file(f, "bad.py")
    assert any("replace" in x.primitive for x in v)


def test_detect_os_open_w(tmp_path):
    """IMP-206 — os.open(LEDGER, O_WRONLY) est un bypass bas niveau et doit être vu."""
    f = _w(tmp_path / "bad.py", '''
        import os
        LEDGER = "lab/chains/IMPROVEMENT_LEDGER.yaml"
        fd = os.open(LEDGER, os.O_WRONLY | os.O_CREAT)
        os.write(fd, b"x")
    ''')
    v = gg.scan_file(f, "bad.py")
    assert len(v) == 1 and "os.open" in v[0].primitive, [x.primitive for x in v]


def test_os_open_readonly_not_flagged(tmp_path):
    """IMP-206 — os.open(LEDGER, O_RDONLY) est une LECTURE → pas de violation (anti faux positif)."""
    f = _w(tmp_path / "reader.py", '''
        import os
        LEDGER = "lab/chains/IMPROVEMENT_LEDGER.yaml"
        fd = os.open(LEDGER, os.O_RDONLY)
        os.read(fd, 10)
    ''')
    assert gg.scan_file(f, "reader.py") == []


# ── grep-guard : NON-DÉTECTION (faux positifs interdits — C2 RED TEAM) ──────────

def test_ignore_read_only_writer_of_other_file(tmp_path):
    """golden_collector-like : LIT le ledger, ÉCRIT un autre fichier → 0 violation."""
    f = _w(tmp_path / "reader.py", '''
        from pathlib import Path
        LEDGER = Path("IMPROVEMENT_LEDGER.yaml")
        GOLDEN = Path("golden_examples.jsonl")
        data = LEDGER.read_text(encoding="utf-8")          # lecture
        with open(LEDGER, "r", encoding="utf-8") as fh:     # lecture
            _ = fh.read()
        GOLDEN.write_text(data, encoding="utf-8")           # écrit AUTRE fichier
    ''')
    assert gg.scan_file(f, "reader.py") == []


def test_ignore_guarded_write(tmp_path):
    """La route sanctionnée guarded_write n'est jamais flaggée."""
    f = _w(tmp_path / "ok.py", '''
        from ledger_writer import guarded_write
        from pathlib import Path
        LEDGER = Path("IMPROVEMENT_LEDGER.yaml")
        guarded_write(LEDGER, "improvements: []\\n", expected_fingerprint=None)
    ''')
    assert gg.scan_file(f, "ok.py") == []


def test_ignore_backup_write(tmp_path):
    """Écrire le fichier de backup (..._backup_*.yaml) ≠ écrire le ledger."""
    f = _w(tmp_path / "patch.py", '''
        from pathlib import Path
        LEDGER = Path("IMPROVEMENT_LEDGER.yaml")
        BACKUP = Path("IMPROVEMENT_LEDGER_backup_20260625.yaml")
        BACKUP.write_text(LEDGER.read_text(encoding="utf-8"), encoding="utf-8")
    ''')
    assert gg.scan_file(f, "patch.py") == []


# ── grep-guard : EXCLUSIONS / ALLOWLIST (logique scan d'arbre) ──────────────────

_BAD_SRC = '''
    from pathlib import Path
    LEDGER = Path("IMPROVEMENT_LEDGER.yaml")
    LEDGER.write_text("x", encoding="utf-8")
'''


def test_allowlist_ledger_writer(tmp_path):
    _w(tmp_path / "governance" / "ledger_writer.py", _BAD_SRC)
    assert gg.scan(tmp_path) == []  # le writer sanctionné est allowlisté


def test_exclude_worktrees(tmp_path):
    _w(tmp_path / "worktrees" / "dur" / "x.py", _BAD_SRC)
    assert gg.scan(tmp_path) == []


def test_exclude_tests(tmp_path):
    _w(tmp_path / "test_something.py", _BAD_SRC)
    _w(tmp_path / "phase9_tests" / "t.py", _BAD_SRC)
    assert gg.scan(tmp_path) == []


def test_scan_reports_non_excluded_bypass(tmp_path):
    _w(tmp_path / "lab" / "x.py", _BAD_SRC)
    v = gg.scan(tmp_path)
    assert len(v) == 1 and v[0].path == "lab/x.py"


# ── ACCEPTANCE : l'arbre réel n'a AUCUN bypass (lecture seule) ──────────────────

def test_real_tree_no_bypass():
    violations = gg.scan(_ROOT)
    assert violations == [], "bypass single-writer detecte(s): " + "; ".join(
        f"{v.path}:{v.line} {v.primitive}" for v in violations
    )


# ── roadmap_to_ledger : routage + concurrence optimiste ─────────────────────────

def _seed_ledger(path: Path, ids):
    import yaml
    data = {"meta": {"v": 1}, "improvements": [
        {"id": i, "title": i, "status": "OPEN"} for i in ids
    ]}
    path.write_text(yaml.dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")


def test_roadmap_write_routes_guarded(tmp_path, monkeypatch):
    import roadmap_to_ledger as r2l
    ledger = tmp_path / "IMPROVEMENT_LEDGER.yaml"
    _seed_ledger(ledger, ["IMP-001"])
    monkeypatch.setattr(r2l, "LEDGER_PATH", ledger)

    data, fp = r2l._load_ledger_guarded()
    data["improvements"].append({"id": "IMP-002", "title": "new", "status": "OPEN"})
    r2l._write_ledger(data, expected_fingerprint=fp)

    import yaml
    reloaded = yaml.safe_load(ledger.read_text(encoding="utf-8"))
    ids = {i["id"] for i in reloaded["improvements"]}
    assert ids == {"IMP-001", "IMP-002"}
    assert ledger.read_text(encoding="utf-8").startswith("# IMPROVEMENT_LEDGER.yaml")
    assert not (tmp_path / "IMPROVEMENT_LEDGER.yaml.writelock").exists()


def test_roadmap_concurrent_write_rejected(tmp_path, monkeypatch):
    """fp capturé au load ; si le fichier bouge sous le writer → ConcurrentWriteError."""
    import roadmap_to_ledger as r2l
    ledger = tmp_path / "IMPROVEMENT_LEDGER.yaml"
    _seed_ledger(ledger, ["IMP-001"])
    monkeypatch.setattr(r2l, "LEDGER_PATH", ledger)

    data, fp = r2l._load_ledger_guarded()
    # Un autre writer commit entre notre load et notre write :
    _seed_ledger(ledger, ["IMP-001", "IMP-999"])
    with pytest.raises(lw.ConcurrentWriteError):
        r2l._write_ledger(data, expected_fingerprint=fp)


def test_roadmap_load_fp_matches_bytes(tmp_path, monkeypatch):
    import hashlib
    import roadmap_to_ledger as r2l
    ledger = tmp_path / "IMPROVEMENT_LEDGER.yaml"
    _seed_ledger(ledger, ["IMP-001"])
    monkeypatch.setattr(r2l, "LEDGER_PATH", ledger)
    _, fp = r2l._load_ledger_guarded()
    assert fp == hashlib.sha256(ledger.read_bytes()).hexdigest()


# ── one-shots : routage fonctionnel (pas de NameError H1, write via guarded) ─────

def test_oneshot_20260625_runs_guarded(tmp_path, monkeypatch, capsys):
    import importlib
    import yaml
    mod = importlib.import_module("ledger_patch_20260625")
    ledger = tmp_path / "IMPROVEMENT_LEDGER.yaml"
    backup = tmp_path / "IMPROVEMENT_LEDGER_backup_20260625.yaml"
    # IMP-B3 ∈ OBSOLETES (ciblé par le one-shot), seedé OPEN.
    data = {"meta": {}, "improvements": [
        {"id": "IMP-B3", "title": "obsolete", "status": "OPEN"},
        {"id": "IMP-XYZ", "title": "autre", "status": "OPEN"},
    ]}
    ledger.write_text(yaml.dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")
    monkeypatch.setattr(mod, "LEDGER", ledger)
    monkeypatch.setattr(mod, "BACKUP", backup)

    mod.main()  # ne doit pas lever (H1 : pas de NameError REPO_ROOT)

    reloaded = yaml.safe_load(ledger.read_text(encoding="utf-8"))
    by_id = {i["id"]: i for i in reloaded["improvements"]}
    assert by_id["IMP-B3"]["status"] == "CLOSED"
    assert by_id["IMP-XYZ"]["status"] == "OPEN"        # non ciblé, intact
    assert not (tmp_path / "IMPROVEMENT_LEDGER.yaml.writelock").exists()


def test_oneshots_source_no_direct_write(tmp_path):
    """Garantie statique : plus de write_text direct, présence de guarded_write."""
    for name in ("ledger_patch_20260608.py", "ledger_patch_20260625.py"):
        src = (_ROOT / "lab" / "chains" / name).read_text(encoding="utf-8")
        assert "LEDGER.write_text(" not in src, name
        assert "guarded_write(" in src, name
        assert "expected_fingerprint=" in src, name
