"""Per-project oracle resolution and execution.

The oracle is the deterministic, non-LLM verification command for a project.
Nothing here calls an LLM. Each project has its own oracle — no project inherits
another's — resolved from a data-driven config so we never touch studio_meta.py.
"""
from __future__ import annotations

import json
import logging
import os
import subprocess
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

# scripts/forge/oracle.py -> parents[2] == repo root
REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = REPO_ROOT / "scripts" / "forge" / "oracles.json"


class OracleNotFound(Exception):
    """Raised when a project has no oracle configured."""


@dataclass(frozen=True)
class OracleSpec:
    project: str
    cwd: Path
    command: list[str]


def resolve_oracle(project: str, config_path: Path | None = None) -> OracleSpec:
    """Return the oracle command for ``project`` from the config file."""
    path = config_path or DEFAULT_CONFIG
    with open(path, encoding="utf-8") as fh:
        config = json.load(fh)
    if project not in config:
        raise OracleNotFound(f"no oracle configured for project {project!r}")
    entry = config[project]
    # Windows CreateProcess (no shell) fails to resolve a relative executable
    # path that uses forward slashes (e.g. ".venv312/Scripts/python.exe"),
    # even though the identical path works from a shell. Normalize only the
    # executable (argv[0]); os.path.normpath is a no-op for bare names like
    # "npm" that must still be resolved via PATH.
    command = list(entry["command"])
    if command:
        command[0] = os.path.normpath(command[0])
    return OracleSpec(
        project=project,
        cwd=(REPO_ROOT / entry["cwd"]).resolve(),
        command=command,
    )


_SUMMARY_PREFIX = "FORGE_ORACLE_SUMMARY "


def extract_summary(stdout: object) -> dict | None:
    """Résumé structuré émis par `godot_oracle.mjs`, extrait d'un flux BRUITÉ.

    BEST-EFFORT STRICT : `None` si absent, illisible, ou si ce n'est pas un mapping — jamais
    une exception. Un oracle qui n'émet pas de résumé (jeu non-Godot, version antérieure)
    ne doit pas devenir un échec de parsing. Le DERNIER résumé gagne : un run peut relancer
    une étape, c'est l'état final qui fait foi.
    """
    if not isinstance(stdout, str) or _SUMMARY_PREFIX not in stdout:
        return None
    trouve = None
    for ligne in stdout.splitlines():
        if not ligne.startswith(_SUMMARY_PREFIX):
            continue
        try:
            obj = json.loads(ligne[len(_SUMMARY_PREFIX):])
        except ValueError:
            continue
        if isinstance(obj, dict):
            trouve = obj
    return trouve


@dataclass(frozen=True)
class OracleResult:
    spec: OracleSpec
    passed: bool
    returncode: int
    evidence_path: Path
    # Le processus a-t-il été TUÉ avant de conclure ? `passed=False` recouvrait deux
    # situations OPPOSÉES — « l'oracle a jugé et condamné » et « l'oracle est mort sans
    # juger » — et seul `returncode == -2`, un nombre magique, les distinguait. Rien
    # n'obligeait l'aval à l'interpréter, et il ne l'interprétait pas : `verdict.py`
    # rendait FAIL dans les deux cas. Le fait devient un champ NOMMÉ (règle studio
    # « aucune décision dans un commentaire », et pas davantage dans un code magique).
    # `OracleResult` n'est PAS signé : l'ajouter ici est sans effet sur les signatures.
    timed_out: bool = False
    # RÉSUMÉ STRUCTURÉ de l'oracle (frontière 2, 2026-08-18). La mesure existait déjà —
    # `FORGE_ORACLE_SUMMARY` depuis abd0504 — mais elle mourait dans `evidence/*.log`,
    # exclu par `.gitignore:81`, et le driver ne gardait que `returncode` +
    # `evidence_path`. Le studio conservait des verdicts SANS les mesures qui les
    # fondent, donc ne pouvait pas ré-instruire ses propres décisions.
    # On ne recopie JAMAIS le stdout brut : c'est le résumé STRUCTURÉ qui voyage, sinon
    # bannière moteur et warnings entreraient dans un `detail` SIGNÉ.
    summary: dict | None = None


def run_oracle(
    spec: OracleSpec,
    evidence_dir: Path | None = None,
    timeout: float | None = 300,
) -> OracleResult:
    """Run the oracle command, capture raw stdout/stderr as evidence, return the result.

    A hung oracle process must never hang the gate forever (CLAUDE.md: "un
    process lance -> timeout actif"). On timeout, the process's partial output
    (if any) is still captured as evidence and the result is reported as failed.
    """
    evidence_dir = evidence_dir or (REPO_ROOT / "lab" / "forge_evidence")
    evidence_dir.mkdir(parents=True, exist_ok=True)
    evidence_path = evidence_dir / f"oracle_{spec.project}.log"
    try:
        completed = subprocess.run(
            spec.command,
            cwd=str(spec.cwd),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired as exc:
        # `newline=""` : voir `mutation_proof` — le CRLF de Windows casserait le sceau
        # `evidence_sha256` des le commit, sans qu'aucune donnee soit alteree.
        with open(evidence_path, "w", encoding="utf-8", newline="") as fh:
            fh.write(f"$ {' '.join(spec.command)}\n(cwd={spec.cwd})\n\n")
            fh.write(f"--- TIMEOUT after {timeout}s ---\n")
            fh.write("--- stdout (partial) ---\n")
            fh.write(exc.stdout or "")
            fh.write("\n--- stderr (partial) ---\n")
            fh.write(exc.stderr or "")
        logger.warning("oracle %s timed out after %ss", spec.project, timeout)
        return OracleResult(
            spec=spec,
            timed_out=True,   # le fait est POSÉ ici, là où il est connu — jamais deviné en aval
            passed=False,
            returncode=-2,
            evidence_path=evidence_path,
            # Meme sur TIMEOUT : la sortie partielle peut deja porter un resume (la
            # mecanique a pu conclure avant que la solvabilite ne soit tuee). Le jeter
            # perdrait la seule information exploitable d'un run interrompu.
            summary=extract_summary(exc.stdout),
        )
    with open(evidence_path, "w", encoding="utf-8", newline="") as fh:
        fh.write(f"$ {' '.join(spec.command)}\n(cwd={spec.cwd})\n\n")
        fh.write("--- stdout ---\n")
        fh.write(completed.stdout)
        fh.write("\n--- stderr ---\n")
        fh.write(completed.stderr)
    logger.info("oracle %s returncode=%s", spec.project, completed.returncode)
    return OracleResult(
        spec=spec,
        passed=completed.returncode == 0,
        returncode=completed.returncode,
        evidence_path=evidence_path,
        summary=extract_summary(completed.stdout),
    )
