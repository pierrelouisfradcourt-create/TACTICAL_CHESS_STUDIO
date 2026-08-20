#!/usr/bin/env python3
"""IMP-252 — verrou de session ledger : preuve DEUX vrais processus (AUDIT_REQUIRED).

Acceptance IMP-252 : « Deux processus simulés -> le second se voit refuser l'écriture
avec ConcurrentWriteError ; pas de corruption. »

Les tests IMP-194 (scripts/phase0_tests/test_imp194_single_writer.py) couvrent déjà le
verrou en simulation MONO-processus (writelock écrit avec son propre os.getpid()). Ce
module ajoute ce qui manquait :

  1. Deux VRAIS processus OS concurrents (subprocess, PID distincts, psutil-liveness réelle).
  2. Une assertion anti-corruption au niveau OCTET du contenu du ledger.

Oracle:
  .venv312/Scripts/python.exe -m pytest scripts/phase3_tests/test_imp252_two_process_lock.py -v

Tous les tests opèrent sur un ledger temporaire (jamais le vrai IMPROVEMENT_LEDGER.yaml).
"""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

import pytest

_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_ROOT / "governance"))
import ledger_writer as lw  # noqa: E402

_WORKER = Path(__file__).with_name("_imp252_worker.py")
_HANDSHAKE_TIMEOUT = 15.0   # attente max du signal "verrou pris" côté test
_PROC_TIMEOUT = 30.0        # attente max de la terminaison d'un sous-processus


def _wait_for(flag: Path, timeout_s: float) -> bool:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if flag.exists():
            return True
        time.sleep(0.01)
    return False


def _canonical_bytes(tmp_path: Path, name: str, content: str) -> bytes:
    """Octets EXACTS que guarded_write produirait pour `content` (neutralise CRLF Windows)."""
    ctrl = tmp_path / name
    lw.guarded_write(ctrl, content)
    return ctrl.read_bytes()


def _terminate(proc: subprocess.Popen) -> None:
    if proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


# ── Test 1 : deux vrais processus, le second est refusé, ledger intact ─────────

def test_two_real_processes_second_writer_refused(tmp_path):
    ledger = tmp_path / "L.yaml"
    lw.guarded_write(ledger, "improvements:\n- id: IMP-000\n  status: OPEN\n")
    intact = ledger.read_bytes()  # état de référence AVANT toute tentative concurrente

    ready = tmp_path / "ready.flag"
    release = tmp_path / "release.flag"
    writelock = tmp_path / "L.yaml.writelock"

    holder = subprocess.Popen(
        [sys.executable, str(_WORKER), "hold", str(ledger), str(ready), str(release), "30"]
    )
    try:
        assert _wait_for(ready, _HANDSHAKE_TIMEOUT), "le processus 1 n'a pas pris le verrou"
        assert writelock.exists(), "writelock absent alors que le processus 1 le détient"
        assert holder.poll() is None, "le processus 1 est mort avant l'assertion"

        # Processus 2 (ce test) : écriture refusée proprement, sans exception opaque.
        with pytest.raises(lw.ConcurrentWriteError):
            lw.guarded_write(ledger, "improvements:\n- id: IMP-INTRUS\n  status: OPEN\n")

        # Anti-corruption : le ledger est byte-for-byte identique à l'état de référence.
        assert ledger.read_bytes() == intact, "le ledger a été corrompu par une écriture refusée"
        # Le writer refusé n'a pas volé le verrou d'autrui ni laissé de tmp orphelin.
        assert writelock.exists(), "le writer refusé a supprimé le verrou d'un writer vivant"
        assert not list(tmp_path.glob("L.yaml.*.tmp")), "fichier temporaire orphelin après refus"

        # Libération : le processus 1 relâche, la voie se rouvre.
        release.write_text("go", encoding="utf-8")
        holder.wait(timeout=_PROC_TIMEOUT)
        assert holder.returncode == 0, f"processus 1 sortie anormale rc={holder.returncode}"
    finally:
        _terminate(holder)

    assert not writelock.exists(), "writelock non nettoyé après libération"
    lw.guarded_write(ledger, "improvements:\n- id: IMP-APRES\n  status: OPEN\n")
    assert "IMP-APRES" in ledger.read_text(encoding="utf-8")


# ── helpers course ─────────────────────────────────────────────────────────────

def _outcome(result_file: Path) -> str:
    """1er token du fichier résultat : OK | CONCURRENT | ERR:..."""
    return result_file.read_text(encoding="utf-8").split()[0]


# ── Test 2a : contention FORCÉE — N racers tirent dans la fenêtre d'un verrou tenu ─
#
# Rendre la branche concurrente déterministe (et non dépendante du hasard du timing) :
# un holder détient le writelock ; PENDANT qu'il le tient, N racers tentent tous d'écrire.
# `_acquire_writelock` ne bloque pas en attente -> chaque tentative voit le verrou vivant
# et renvoie None -> ConcurrentWriteError. Les N attempts se chevauchent dans la MÊME
# fenêtre de verrou (le holder ne relâche qu'APRÈS collecte des N résultats).

def test_pileup_writers_refused_under_held_lock(tmp_path):
    ledger = tmp_path / "L.yaml"
    lw.guarded_write(ledger, "improvements: []\n")
    intact = ledger.read_bytes()

    ready = tmp_path / "ready.flag"
    release = tmp_path / "release.flag"
    go = tmp_path / "go.flag"
    writelock = tmp_path / "L.yaml.writelock"
    n_racers = 6

    holder = subprocess.Popen(
        [sys.executable, str(_WORKER), "hold", str(ledger), str(ready), str(release), "30"]
    )
    racers: list[subprocess.Popen] = []
    results = [tmp_path / f"res_{i}.txt" for i in range(n_racers)]
    try:
        assert _wait_for(ready, _HANDSHAKE_TIMEOUT), "le holder n'a pas pris le verrou"
        assert writelock.exists()

        # Les N racers démarrent et se bloquent sur `go`, TANT QUE le holder tient le verrou.
        for i in range(n_racers):
            racers.append(subprocess.Popen(
                [sys.executable, str(_WORKER), "race", str(ledger),
                 f"improvements:\n- id: IMP-{i:03d}\n  status: OPEN\n", str(results[i]), str(go), "30"]
            ))
        time.sleep(0.3)  # laisse les N atteindre l'attente du go
        assert holder.poll() is None, "le holder est mort avant la contention"

        go.write_text("go", encoding="utf-8")  # les N tirent SIMULTANÉMENT dans la fenêtre du verrou
        for r in results:
            assert _wait_for(r, _HANDSHAKE_TIMEOUT), "un racer n'a pas rendu de résultat"
        for p in racers:
            p.wait(timeout=_PROC_TIMEOUT)

        # Le holder tient TOUJOURS -> les N tentatives ont réellement chevauché le verrou
        # et sont TOUTES tombées dans la branche concurrente.
        outcomes = [_outcome(r) for r in results]
        assert outcomes == ["CONCURRENT"] * n_racers, f"branche concurrente non exercée: {outcomes}"

        # Anti-corruption : le refus collectif n'a pas touché le ledger.
        assert ledger.read_bytes() == intact, "ledger corrompu pendant le refus collectif"
        assert not list(tmp_path.glob("L.yaml.*.tmp")), "tmp orphelin après refus collectif"

        release.write_text("go", encoding="utf-8")
        holder.wait(timeout=_PROC_TIMEOUT)
        assert holder.returncode == 0, f"holder sortie anormale rc={holder.returncode}"
    finally:
        _terminate(holder)
        for p in racers:
            _terminate(p)

    # Le verrou se rouvre après libération : une écriture repasse.
    assert not writelock.exists(), "writelock non nettoyé après libération"
    lw.guarded_write(ledger, "improvements:\n- id: IMP-FINAL\n  status: OPEN\n")
    assert "IMP-FINAL" in ledger.read_text(encoding="utf-8")


# ── Test 2b : course libre — deux writers, aucune corruption (sérialisation sûre) ─

def test_concurrent_writers_serialize_without_corruption(tmp_path):
    ledger = tmp_path / "L.yaml"
    lw.guarded_write(ledger, "improvements: []\n")

    content_a = "improvements:\n- id: IMP-AAA\n  status: OPEN\n"
    content_b = "improvements:\n- id: IMP-BBB\n  status: CLOSED\n"
    expected_a = _canonical_bytes(tmp_path, "ctrl_a.yaml", content_a)
    expected_b = _canonical_bytes(tmp_path, "ctrl_b.yaml", content_b)

    go = tmp_path / "go.flag"
    res_a = tmp_path / "res_a.txt"
    res_b = tmp_path / "res_b.txt"
    writelock = tmp_path / "L.yaml.writelock"

    procs = [
        subprocess.Popen(
            [sys.executable, str(_WORKER), "race", str(ledger), content_a, str(res_a), str(go), "30"]
        ),
        subprocess.Popen(
            [sys.executable, str(_WORKER), "race", str(ledger), content_b, str(res_b), str(go), "30"]
        ),
    ]
    try:
        time.sleep(0.2)
        go.write_text("go", encoding="utf-8")
        for p in procs:
            try:
                p.wait(timeout=_PROC_TIMEOUT)
            except subprocess.TimeoutExpired:
                pytest.fail("un racer ne s'est pas terminé dans les temps")
    finally:
        for p in procs:
            _terminate(p)

    outcomes = {_outcome(res_a), _outcome(res_b)}
    assert outcomes <= {"OK", "CONCURRENT"}, f"issue inattendue d'un racer: {outcomes}"
    assert "OK" in outcomes, "aucun des deux writers n'a réussi — deadlock/refus mutuel"

    # Anti-corruption : contenu final EXACTEMENT celui d'un writer, jamais un mélange.
    final = ledger.read_bytes()
    assert final in (expected_a, expected_b), "contenu final corrompu (ni A ni B intacts)"
    assert not writelock.exists(), "writelock orphelin après la course"
    assert not list(tmp_path.glob("L.yaml.*.tmp")), "tmp orphelin après la course"
