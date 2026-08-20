#!/usr/bin/env python3
"""IMP-200 — Web Reality Agent (SAFE_AUTO, oracle code).

Acceptance: pytest source non vérifiée -> rejet.
Oracle: .venv312/Scripts/python.exe -m pytest scripts/phase2_tests/test_imp200_wra.py -v

Tout est offline & déterministe : fetchers factices injectés, now_ts/clock explicites.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_ROOT / "governance"))
import governor  # noqa: E402
import web_reality_agent as wra  # noqa: E402

NOW = 1_700_000_000  # référence temporelle fixe (déterminisme recency)


def _raw(source="github", url=None, rid="1", title="t", ts=NOW, pop=10, summary=""):
    defaults = {
        "github": "https://github.com/foo/bar",
        "hackernews": "https://news.ycombinator.com/item?id=1",
        "arxiv": "https://arxiv.org/abs/2401.00001",
    }
    return {"source": source, "id": rid, "title": title,
            "url": url if url is not None else defaults.get(source, "https://github.com/x/y"),
            "ts": ts, "popularity": pop, "summary": summary}


# ── RT-200-2 : source non vérifiée -> rejet DUR (acceptance) ──────────────────

def test_pirate_host_rejected():
    with pytest.raises(wra.SourceVerificationError):
        wra.coerce_and_verify(_raw(source="github", url="https://evil.example.com/x"))


def test_unknown_source_rejected():
    with pytest.raises(wra.SourceVerificationError):
        wra.coerce_and_verify(_raw(source="pastebin", url="https://github.com/foo/bar"))


def test_source_host_mismatch_rejected():
    # source 'arxiv' mais host github -> mismatch -> rejet
    with pytest.raises(wra.SourceVerificationError):
        wra.coerce_and_verify(_raw(source="arxiv", url="https://github.com/foo/bar"))


def test_missing_url_rejected():
    bad = _raw()
    del bad["url"]
    with pytest.raises(wra.SourceVerificationError):
        wra.coerce_and_verify(bad)


def test_missing_ts_rejected():
    bad = _raw()
    del bad["ts"]
    with pytest.raises(wra.SourceVerificationError):
        wra.coerce_and_verify(bad)


def test_negative_popularity_rejected():
    with pytest.raises(wra.SourceVerificationError):
        wra.coerce_and_verify(_raw(pop=-3))


def test_bool_id_rejected():
    bad = _raw()
    bad["id"] = True  # bool n'est pas un id valide
    with pytest.raises(wra.SourceVerificationError):
        wra.coerce_and_verify(bad)


def test_verify_batch_fails_closed_on_first_bad():
    raws = [_raw(rid="1"), _raw(source="evil", url="https://evil.com/x")]
    with pytest.raises(wra.SourceVerificationError):
        wra.verify_batch(raws)


def test_valid_records_pass_for_all_sources():
    for src in wra.SOURCES:
        rec = wra.coerce_and_verify(_raw(source=src))
        assert rec.source == src and rec.id == "1"


# ── RT-200-6 : scoring déterministe + bornes [0,1] ────────────────────────────

def test_score_in_unit_interval():
    rec = wra.coerce_and_verify(_raw(title="rust chess engine", pop=5000, ts=NOW))
    s = wra.score_record(rec, ("rust", "chess"), NOW, wra.DEFAULT)
    assert 0.0 <= s.score <= 1.0
    assert 0.0 <= s.components["relevance"] <= 1.0
    assert 0.0 <= s.components["popularity"] <= 1.0
    assert 0.0 <= s.components["recency"] <= 1.0


def test_relevance_counts_query_terms():
    rec = wra.coerce_and_verify(_raw(title="rust chess", summary="neural network", pop=0, ts=NOW))
    s = wra.score_record(rec, ("rust", "chess", "missing", "absent"), NOW, wra.DEFAULT)
    assert s.components["relevance"] == pytest.approx(0.5)  # 2/4 termes présents


def test_recency_decays_with_age():
    fresh = wra.coerce_and_verify(_raw(ts=NOW))
    old = wra.coerce_and_verify(_raw(ts=NOW - 30 * 86400))  # 30 jours
    sf = wra.score_record(fresh, (), NOW, wra.DEFAULT)
    so = wra.score_record(old, (), NOW, wra.DEFAULT)
    assert sf.components["recency"] > so.components["recency"]


def test_score_deterministic_repeat():
    rec = wra.coerce_and_verify(_raw(title="rust chess", pop=123, ts=NOW - 86400))
    a = wra.score_record(rec, ("rust",), NOW, wra.DEFAULT)
    b = wra.score_record(rec, ("rust",), NOW, wra.DEFAULT)
    assert a.score == b.score and a.components == b.components


def test_rank_deterministic_shuffled_input():
    recs = [
        wra.coerce_and_verify(_raw(source="github", rid="a", title="rust", pop=100, ts=NOW)),
        wra.coerce_and_verify(_raw(source="arxiv", rid="b", title="rust chess", pop=0, ts=NOW)),
        wra.coerce_and_verify(_raw(source="hackernews", rid="c", title="rust chess", pop=500, ts=NOW)),
    ]
    r1 = wra.rank(recs, "rust chess", NOW, wra.DEFAULT)
    r2 = wra.rank(list(reversed(recs)), "rust chess", NOW, wra.DEFAULT)
    assert [s.record.id for s in r1] == [s.record.id for s in r2]


# ── RT-200-3 / RT-200-4 : bornage (anti explosion + timeout) ──────────────────

def test_max_calls_bounds_fetcher_invocations():
    calls = {"n": 0}

    def make(src):
        def _f():
            calls["n"] += 1
            return [_raw(source=src, rid=str(calls["n"]))]
        return _f

    cfg = wra.WraConfig(max_calls=2)
    fetchers = [(f"f{i}", make("github")) for i in range(5)]
    wra.gather(fetchers, "x", NOW, cfg)
    assert calls["n"] == 2  # seulement 2 fetchers appelés malgré 5 fournis


def test_timeout_stops_further_calls():
    calls = {"n": 0}

    def _f():
        calls["n"] += 1
        return [_raw(rid=str(calls["n"]))]

    # clock factice : 0 (start), puis 100 -> dépasse timeout_s avant le 2e appel
    ticks = iter([0.0, 0.0, 100.0, 100.0, 100.0])
    clock = lambda: next(ticks)  # noqa: E731
    cfg = wra.WraConfig(timeout_s=10.0)
    fetchers = [("a", _f), ("b", _f), ("c", _f)]
    wra.gather(fetchers, "x", NOW, cfg, clock=clock)
    assert calls["n"] == 1  # timeout coupe après le 1er


def test_max_sources_truncates_result():
    def _f():
        return [_raw(rid=str(i)) for i in range(100)]

    cfg = wra.WraConfig(max_sources=5)
    out = wra.gather([("a", _f)], "x", NOW, cfg)
    assert len(out) == 5


def test_gather_rejects_unverified_batch():
    def _f():
        return [_raw(rid="ok"), _raw(source="evil", url="https://evil.com/x")]

    with pytest.raises(wra.SourceVerificationError):
        wra.gather([("a", _f)], "x", NOW, wra.DEFAULT)


# ── RT-200-1 : READ ONLY prouvé (aucune écriture, aucune exécution) ───────────

def test_gather_writes_nothing_to_disk(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)

    def _f():
        return [_raw(rid="1")]

    wra.gather([("a", _f)], "x", NOW, wra.DEFAULT)
    assert list(tmp_path.iterdir()) == []  # 0 fichier créé par gather


def test_malicious_content_is_inert_data():
    payload = "__import__('os').system('echo PWNED > pwned.txt')"
    rec = wra.coerce_and_verify(_raw(title=payload, summary=payload))
    s = wra.score_record(rec, ("os",), NOW, wra.DEFAULT)
    # le contenu malveillant est une simple string scorée, jamais exécutée
    assert s.record.title == payload
    assert not Path("pwned.txt").exists()


def test_module_source_has_no_exec_primitives():
    # Analyse AST (pas une recherche de sous-chaîne : la prose des docstrings est ignorée).
    import ast
    src = (_ROOT / "governance" / "web_reality_agent.py").read_text(encoding="utf-8")
    tree = ast.parse(src)

    banned_modules = {"subprocess", "os"}
    banned_calls = {"eval", "exec", "compile", "__import__"}
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                assert alias.name.split(".")[0] not in banned_modules, \
                    f"import interdit: {alias.name}"
        elif isinstance(node, ast.ImportFrom):
            assert (node.module or "").split(".")[0] not in banned_modules, \
                f"import-from interdit: {node.module}"
        elif isinstance(node, ast.Call):
            fn = node.func
            if isinstance(fn, ast.Name):
                assert fn.id not in banned_calls, f"appel interdit: {fn.id}"
            elif isinstance(fn, ast.Attribute):
                # interdit os.system / subprocess.* / __import__ via attribut
                assert fn.attr not in {"system", "popen", "Popen", "call", "run"} or \
                    not isinstance(fn.value, ast.Name) or fn.value.id not in banned_modules, \
                    f"appel d'exécution interdit: {fn.attr}"


# ── RT-200-5 : write_cache gardé par governor ─────────────────────────────────

def test_cache_mission_not_forbidden():
    assert wra.CACHE_MISSION not in governor.FORBIDDEN_MISSIONS


def test_write_cache_blocked_when_governor_blocks(tmp_path, monkeypatch):
    monkeypatch.setattr(
        wra.governor, "check",
        lambda action: governor.Decision(governor.BLOCK, "test-block"),
    )
    target = tmp_path / "cache.json"
    with pytest.raises(wra.CacheWriteBlocked):
        wra.write_cache([], target)
    assert not target.exists()  # side-effect nul quand BLOCK


def test_write_cache_allowed_writes_utf8(tmp_path):
    rec = wra.coerce_and_verify(_raw(title="rust échecs", pop=10, ts=NOW))
    ranked = wra.rank([rec], "rust", NOW, wra.DEFAULT)
    target = tmp_path / "cache.json"
    out = wra.write_cache(ranked, target, generated_ts=NOW)
    assert out.exists()
    import json
    data = json.loads(target.read_text(encoding="utf-8"))
    assert data["count"] == 1 and data["sources"][0]["title"] == "rust échecs"


# ── inject avant PLAN : brief déterministe ────────────────────────────────────

def test_council_brief_deterministic_and_readonly():
    recs = [wra.coerce_and_verify(_raw(source="github", rid="a", title="rust chess", pop=900, ts=NOW))]
    ranked = wra.rank(recs, "rust chess", NOW, wra.DEFAULT)
    b1 = wra.to_council_brief(ranked)
    b2 = wra.to_council_brief(ranked)
    assert b1 == b2
    assert "READ ONLY" in b1 and "rust chess" in b1


def test_council_brief_empty():
    assert "aucune source" in wra.to_council_brief([])
