#!/usr/bin/env python3
"""IMP-193 — .autoloop.lock TTL + auto-release (PID mort / age>30min).

Acceptance ledger: pytest: simule crash (PID mort / age>30min) -> recovery auto-release.

Oracle: .venv312/Scripts/python.exe -m pytest scripts/phase0_tests/test_imp193_lock.py -v
Tous les tests opèrent sur un lock temporaire (jamais le vrai lab/.autoloop.lock).

RT-193-1 : _pid_alive(os.getpid()) ne doit JAMAIS tuer le runner (pas d'os.kill).
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import pytest

# lab/chains sur le path pour importer kaizen_autoloop (qui importe kaizen_loop+governor).
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "lab" / "chains"))
import kaizen_autoloop as ka  # noqa: E402


@pytest.fixture
def lock(tmp_path):
    return tmp_path / ".autoloop.lock"


def _write(lock: Path, content: str) -> None:
    lock.write_text(content, encoding="utf-8")


def _age(lock: Path, seconds: float) -> None:
    """Vieillit le mtime du fichier de `seconds`."""
    t = time.time() - seconds
    os.utime(lock, (t, t))


# ── _pid_alive : sûreté Windows (ne tue pas) + PID-reuse ──────────────────────

def test_pid_alive_self_does_not_kill_runner():
    # Si _pid_alive utilisait os.kill, ce test terminerait pytest sur Windows.
    assert ka._pid_alive(os.getpid()) is True


def test_pid_alive_invalid():
    assert ka._pid_alive(-1) is False
    assert ka._pid_alive(0) is False
    assert ka._pid_alive(None) is False
    assert ka._pid_alive(2**31 - 1) is False  # PID quasi-certainement mort


def test_pid_alive_create_time_mismatch_is_reuse():
    # Même PID vivant mais create_time qui ne colle pas -> PID recyclé -> mort.
    assert ka._pid_alive(os.getpid(), create_time=1.0) is False


# ── acquisition nominale ──────────────────────────────────────────────────────

def test_acquire_when_absent(lock):
    assert ka.acquire_lock(lock) is True
    info = ka._parse_lock(lock.read_text(encoding="utf-8"))
    assert info["pid"] == os.getpid()
    assert info["ts"] is not None


def test_held_by_live_fresh_returns_false(lock):
    # Lock frais détenu par CE process (vivant) -> non volable.
    _write(lock, ka._lock_content())
    assert ka.acquire_lock(lock) is False


# ── recovery : PID mort ───────────────────────────────────────────────────────

def test_dead_pid_auto_release(lock):
    _write(lock, f"pid={2**31 - 1} ts={time.time()} iso=2026-06-29T00:00:00")
    assert ka.acquire_lock(lock) is True  # stale (pid mort) -> recovered
    assert ka._parse_lock(lock.read_text(encoding="utf-8"))["pid"] == os.getpid()


def test_legacy_format_dead_pid_auto_release(lock):
    # Ancien format positionnel 'pid=N <iso>' avec PID mort.
    _write(lock, f"pid={2**31 - 1} 2026-06-29T00:00:00\n")
    assert ka.acquire_lock(lock) is True


# ── recovery : age > TTL (même PID vivant) ────────────────────────────────────

def test_old_ttl_auto_release(lock):
    old = time.time() - (ka.LOCK_TTL_SECONDS + 60)
    # PID vivant (le nôtre) mais ts plus vieux que le TTL -> stale par age.
    _write(lock, f"pid={os.getpid()} ts={old} iso=2020-01-01T00:00:00")
    assert ka.acquire_lock(lock) is True


def test_fresh_ttl_not_stolen(lock):
    recent = time.time() - 5
    _write(lock, f"pid={os.getpid()} ts={recent} create={_self_create()} iso=x")
    assert ka.acquire_lock(lock) is False


# ── contenu illisible / write partiel (RT-193-3) ──────────────────────────────

def test_empty_lock_fresh_mtime_not_stolen(lock):
    _write(lock, "")               # write partiel : créé mais pas encore rempli
    _age(lock, 1)                  # mtime frais (< GRACE)
    assert ka.acquire_lock(lock) is False   # fail-closed : on ne vole pas


def test_empty_lock_old_mtime_stolen(lock):
    _write(lock, "")
    _age(lock, ka.GRACE_SECONDS + 30)       # vieux : créateur clairement mort
    assert ka.acquire_lock(lock) is True


def test_garbage_old_mtime_stolen(lock):
    _write(lock, "????corrupt????")
    _age(lock, ka.GRACE_SECONDS + 30)
    assert ka.acquire_lock(lock) is True


# ── release ───────────────────────────────────────────────────────────────────

def test_release_lock(lock):
    assert ka.acquire_lock(lock) is True
    ka.release_lock(lock)
    assert not lock.exists()
    ka.release_lock(lock)          # no-op idempotent


def _self_create() -> float:
    import psutil
    return psutil.Process(os.getpid()).create_time()
