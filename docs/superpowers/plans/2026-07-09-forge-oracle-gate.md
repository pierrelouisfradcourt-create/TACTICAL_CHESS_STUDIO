# Forge Oracle Gate (PROUVER + FORCER) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `scripts/forge/` core that resolves a project's deterministic non-LLM oracle, runs it, captures raw evidence, and emits an HMAC-signed software/evidence/claim verdict that refuses to pass without a green oracle.

**Architecture:** A small, self-contained Python package (`scripts/forge/`, stdlib only) with three focused modules — `oracle.py` (resolve + run), `verdict.py` (signed verdict, `NO_CLAIM_ALLOWED`), `gate.py` (ties them, returns OK only on green). Per-project oracle commands live in a data file `oracles.json`, so this is the "oracle par-projet" **without touching** `scripts/studio_meta.py` (that integration is a later, Pierre-gated plan).

**Tech Stack:** Python 3.12 (`.venv312`), stdlib only (`json`, `subprocess`, `hmac`, `hashlib`, `dataclasses`, `pathlib`, `logging`), pytest.

## Global Constraints

- Python interpreter: `.venv312\Scripts\python.exe` (repo-relative). Never a system Python.
- Type hints on every public function (project rule `python-ml.md`).
- No `print()` — use the `logging` module (project rule `python-ml.md`).
- Every `open()` passes `encoding="utf-8"` explicitly (CLAUDE.md incident rule).
- All paths repo-relative, derived from `REPO_ROOT`; never absolute or user paths (CLAUDE.md).
- Verdict separation is mandatory: `software_verdict` / `evidence_verdict` / `claim_verdict`, and `claim_verdict` is ALWAYS `NO_CLAIM_ALLOWED` (CLAUDE.md).
- DO NOT touch `autopilot.py`, `src/`, `scripts/studio_meta.py`, or the root `tests/` directory (protected zones). All new tests live under `scripts/forge/tests/`.
- **Commits:** CLAUDE.md forbids `git commit`/`push` without Pierre's explicit go. The "Commit" steps below prepare the staged change + message but are executed ONLY after an explicit go. In practice: stage, show the diff, ask.

---

### Task 1: Package scaffold + oracle resolver

**Files:**
- Create: `scripts/forge/__init__.py`
- Create: `scripts/forge/oracle.py`
- Create: `scripts/forge/oracles.json`
- Create: `scripts/forge/tests/conftest.py`
- Test: `scripts/forge/tests/test_oracle_resolve.py`

**Interfaces:**
- Produces: `OracleSpec(project: str, cwd: Path, command: list[str])`; `resolve_oracle(project: str, config_path: Path | None = None) -> OracleSpec`; `OracleNotFound(Exception)`; module constant `REPO_ROOT: Path`.

- [ ] **Step 1: Create the package marker and test path shim**

Create `scripts/forge/__init__.py`:

```python
"""forge — the /forge engineering-loop core (PROUVER + FORCER bricks)."""
```

Create `scripts/forge/tests/conftest.py` so `import forge` resolves from the repo:

```python
import sys
from pathlib import Path

# scripts/forge/tests/conftest.py -> parents[2] == scripts/  (so `forge` is importable)
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
```

- [ ] **Step 2: Write the failing test**

Create `scripts/forge/tests/test_oracle_resolve.py`:

```python
import json

import pytest

from forge.oracle import OracleNotFound, OracleSpec, resolve_oracle


def _write_config(tmp_path):
    cfg = {"demo": {"cwd": ".", "command": ["echo", "hi"]}}
    path = tmp_path / "oracles.json"
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(cfg, fh)
    return path


def test_resolve_known_project(tmp_path):
    spec = resolve_oracle("demo", config_path=_write_config(tmp_path))
    assert isinstance(spec, OracleSpec)
    assert spec.project == "demo"
    assert spec.command == ["echo", "hi"]
    assert spec.cwd.is_absolute()


def test_resolve_unknown_project_raises(tmp_path):
    with pytest.raises(OracleNotFound):
        resolve_oracle("nope", config_path=_write_config(tmp_path))
```

- [ ] **Step 3: Run test to verify it fails**

Run: `.venv312\Scripts\python.exe -m pytest scripts/forge/tests/test_oracle_resolve.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'forge.oracle'`.

- [ ] **Step 4: Write minimal implementation**

Create `scripts/forge/oracle.py`:

```python
"""Per-project oracle resolution and execution.

The oracle is the deterministic, non-LLM verification command for a project.
Nothing here calls an LLM. Each project has its own oracle — no project inherits
another's — resolved from a data-driven config so we never touch studio_meta.py.
"""
from __future__ import annotations

import json
import logging
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
    return OracleSpec(
        project=project,
        cwd=(REPO_ROOT / entry["cwd"]).resolve(),
        command=list(entry["command"]),
    )
```

Create `scripts/forge/oracles.json` (Leviathan wired in Task 5; start with the forge self-oracle):

```json
{
  "forge": {
    "cwd": ".",
    "command": [".venv312/Scripts/python.exe", "-m", "pytest", "scripts/forge/tests/", "-q"]
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `.venv312\Scripts\python.exe -m pytest scripts/forge/tests/test_oracle_resolve.py -v`
Expected: PASS (2 passed).

- [ ] **Step 6: Commit (after explicit go from Pierre)**

```bash
git add scripts/forge/__init__.py scripts/forge/oracle.py scripts/forge/oracles.json scripts/forge/tests/conftest.py scripts/forge/tests/test_oracle_resolve.py
git commit -m "feat(forge): per-project oracle resolver (PROUVER brick)"
```

---

### Task 2: Oracle runner + evidence capture

**Files:**
- Modify: `scripts/forge/oracle.py` (append `OracleResult` + `run_oracle`)
- Test: `scripts/forge/tests/test_oracle_run.py`

**Interfaces:**
- Consumes: `OracleSpec`, `REPO_ROOT` from Task 1.
- Produces: `OracleResult(spec: OracleSpec, passed: bool, returncode: int, evidence_path: Path)`; `run_oracle(spec: OracleSpec, evidence_dir: Path | None = None) -> OracleResult`.

- [ ] **Step 1: Write the failing test**

Create `scripts/forge/tests/test_oracle_run.py`:

```python
import sys

from forge.oracle import OracleSpec, run_oracle


def _spec(tmp_path, code, returncode):
    # A cross-platform fake oracle: run this interpreter with -c.
    return OracleSpec(
        project="fake",
        cwd=tmp_path,
        command=[sys.executable, "-c", f"import sys; print({code!r}); sys.exit({returncode})"],
    )


def test_run_green_oracle_passes(tmp_path):
    result = run_oracle(_spec(tmp_path, "hello-green", 0), evidence_dir=tmp_path / "ev")
    assert result.passed is True
    assert result.returncode == 0
    assert result.evidence_path.exists()
    with open(result.evidence_path, encoding="utf-8") as fh:
        assert "hello-green" in fh.read()


def test_run_red_oracle_fails_and_still_captures(tmp_path):
    result = run_oracle(_spec(tmp_path, "boom", 1), evidence_dir=tmp_path / "ev")
    assert result.passed is False
    assert result.returncode == 1
    assert result.evidence_path.exists()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv312\Scripts\python.exe -m pytest scripts/forge/tests/test_oracle_run.py -v`
Expected: FAIL with `ImportError: cannot import name 'run_oracle'`.

- [ ] **Step 3: Write minimal implementation**

Append to `scripts/forge/oracle.py`:

```python
import subprocess  # add near the other stdlib imports at top of the file


@dataclass(frozen=True)
class OracleResult:
    spec: OracleSpec
    passed: bool
    returncode: int
    evidence_path: Path


def run_oracle(spec: OracleSpec, evidence_dir: Path | None = None) -> OracleResult:
    """Run the oracle command, capture raw stdout/stderr as evidence, return the result."""
    evidence_dir = evidence_dir or (REPO_ROOT / "lab" / "forge_evidence")
    evidence_dir.mkdir(parents=True, exist_ok=True)
    evidence_path = evidence_dir / f"oracle_{spec.project}.log"
    completed = subprocess.run(
        spec.command,
        cwd=str(spec.cwd),
        capture_output=True,
        text=True,
    )
    with open(evidence_path, "w", encoding="utf-8") as fh:
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
    )
```

Move `import subprocess` up with the other imports so the top of the file reads
`import json`, `import logging`, `import subprocess`.

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv312\Scripts\python.exe -m pytest scripts/forge/tests/test_oracle_run.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit (after explicit go from Pierre)**

```bash
git add scripts/forge/oracle.py scripts/forge/tests/test_oracle_run.py
git commit -m "feat(forge): oracle runner + raw evidence capture"
```

---

### Task 3: Signed verdict (`NO_CLAIM_ALLOWED`)

**Files:**
- Create: `scripts/forge/verdict.py`
- Test: `scripts/forge/tests/test_verdict.py`

**Interfaces:**
- Produces: `Verdict(project, software_verdict, evidence_verdict, claim_verdict, returncode, evidence_path)` (all `str` except `returncode: int`); `build_verdict(project: str, passed: bool, returncode: int, evidence_path: Path) -> Verdict`; `sign_verdict(verdict: Verdict, key_file: Path | None = None) -> str`; `verify_verdict(verdict: Verdict, signature: str, key_file: Path | None = None) -> bool`.

- [ ] **Step 1: Write the failing test**

Create `scripts/forge/tests/test_verdict.py`:

```python
from pathlib import Path

from forge.verdict import build_verdict, sign_verdict, verify_verdict


def test_green_verdict_is_ok_but_never_claims(tmp_path):
    v = build_verdict("demo", passed=True, returncode=0, evidence_path=Path("ev.log"))
    assert v.software_verdict == "OK"
    assert v.claim_verdict == "NO_CLAIM_ALLOWED"
    assert v.evidence_verdict == "MECHANICAL_VALIDATION_ONLY"


def test_red_verdict_is_fail(tmp_path):
    v = build_verdict("demo", passed=False, returncode=1, evidence_path=Path("ev.log"))
    assert v.software_verdict == "FAIL"
    assert v.claim_verdict == "NO_CLAIM_ALLOWED"


def test_signature_roundtrips(tmp_path):
    key = tmp_path / "k"
    v = build_verdict("demo", passed=True, returncode=0, evidence_path=Path("ev.log"))
    sig = sign_verdict(v, key_file=key)
    assert verify_verdict(v, sig, key_file=key) is True


def test_tampered_verdict_fails_verification(tmp_path):
    key = tmp_path / "k"
    v = build_verdict("demo", passed=True, returncode=0, evidence_path=Path("ev.log"))
    sig = sign_verdict(v, key_file=key)
    forged = build_verdict("demo", passed=False, returncode=1, evidence_path=Path("ev.log"))
    assert verify_verdict(forged, sig, key_file=key) is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv312\Scripts\python.exe -m pytest scripts/forge/tests/test_verdict.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'forge.verdict'`.

- [ ] **Step 3: Write minimal implementation**

Create `scripts/forge/verdict.py`:

```python
"""Signed forge verdict — the anti-over-claim epistemology brick.

Separates software / evidence / claim. ``claim_verdict`` is ALWAYS
``NO_CLAIM_ALLOWED``: the agent may never assert success. Only the deterministic
oracle speaks (``software_verdict``), and the verdict is HMAC-signed so it cannot
be forged after the fact.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
from dataclasses import asdict, dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_KEY_FILE = REPO_ROOT / "scripts" / "forge" / ".forge_key"

CLAIM_VERDICT = "NO_CLAIM_ALLOWED"
EVIDENCE_VERDICT = "MECHANICAL_VALIDATION_ONLY"


@dataclass(frozen=True)
class Verdict:
    project: str
    software_verdict: str
    evidence_verdict: str
    claim_verdict: str
    returncode: int
    evidence_path: str


def build_verdict(project: str, passed: bool, returncode: int, evidence_path: Path) -> Verdict:
    return Verdict(
        project=project,
        software_verdict="OK" if passed else "FAIL",
        evidence_verdict=EVIDENCE_VERDICT,
        claim_verdict=CLAIM_VERDICT,
        returncode=returncode,
        evidence_path=str(evidence_path),
    )


def _load_key(key_file: Path) -> bytes:
    if key_file.exists():
        return key_file.read_bytes()
    key = os.urandom(32)
    key_file.parent.mkdir(parents=True, exist_ok=True)
    key_file.write_bytes(key)
    logger.info("generated new forge signing key at %s", key_file)
    return key


def sign_verdict(verdict: Verdict, key_file: Path | None = None) -> str:
    key = _load_key(key_file or DEFAULT_KEY_FILE)
    payload = json.dumps(asdict(verdict), sort_keys=True).encode("utf-8")
    return hmac.new(key, payload, hashlib.sha256).hexdigest()


def verify_verdict(verdict: Verdict, signature: str, key_file: Path | None = None) -> bool:
    expected = sign_verdict(verdict, key_file)
    return hmac.compare_digest(expected, signature)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv312\Scripts\python.exe -m pytest scripts/forge/tests/test_verdict.py -v`
Expected: PASS (4 passed).

- [ ] **Step 5: Ignore the generated key file**

Append a line to `.gitignore` (repo root) so signing keys never get committed:

```
scripts/forge/.forge_key
lab/forge_evidence/
```

- [ ] **Step 6: Commit (after explicit go from Pierre)**

```bash
git add scripts/forge/verdict.py scripts/forge/tests/test_verdict.py .gitignore
git commit -m "feat(forge): HMAC-signed software/evidence/claim verdict (NO_CLAIM_ALLOWED)"
```

---

### Task 4: `forge_gate` — the FORCER (tie oracle → verdict, block on red)

**Files:**
- Create: `scripts/forge/gate.py`
- Test: `scripts/forge/tests/test_gate.py`

**Interfaces:**
- Consumes: `resolve_oracle`, `run_oracle`, `OracleNotFound` (Task 1-2); `Verdict`, `build_verdict`, `sign_verdict` (Task 3).
- Produces: `GateResult(verdict: Verdict, signature: str, ok: bool)`; `forge_gate(project: str, config_path: Path | None = None, key_file: Path | None = None, evidence_dir: Path | None = None) -> GateResult`.

- [ ] **Step 1: Write the failing test**

Create `scripts/forge/tests/test_gate.py`:

```python
import json
import sys

from forge.gate import forge_gate


def _config(tmp_path, returncode):
    cfg = {
        "fake": {
            "cwd": ".",
            "command": [sys.executable, "-c", f"import sys; sys.exit({returncode})"],
        }
    }
    path = tmp_path / "oracles.json"
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(cfg, fh)
    return path


def test_gate_green_is_ok_and_signed(tmp_path):
    res = forge_gate(
        "fake",
        config_path=_config(tmp_path, 0),
        key_file=tmp_path / "k",
        evidence_dir=tmp_path / "ev",
    )
    assert res.ok is True
    assert res.verdict.software_verdict == "OK"
    assert res.signature  # non-empty


def test_gate_red_is_not_ok(tmp_path):
    res = forge_gate(
        "fake",
        config_path=_config(tmp_path, 1),
        key_file=tmp_path / "k",
        evidence_dir=tmp_path / "ev",
    )
    assert res.ok is False
    assert res.verdict.software_verdict == "FAIL"


def test_gate_unknown_project_is_blocked(tmp_path):
    res = forge_gate(
        "missing",
        config_path=_config(tmp_path, 0),
        key_file=tmp_path / "k",
        evidence_dir=tmp_path / "ev",
    )
    assert res.ok is False
    assert res.verdict.software_verdict == "BLOCKED"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv312\Scripts\python.exe -m pytest scripts/forge/tests/test_gate.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'forge.gate'`.

- [ ] **Step 3: Write minimal implementation**

Create `scripts/forge/gate.py`:

```python
"""forge_gate — the FORCER brick.

Ties oracle resolution + execution + signed verdict into one gate. Green oracle
=> signed OK verdict. Red or missing oracle => FAIL / BLOCKED. The caller (the
/forge skill) MUST NOT proceed past a non-OK gate: that runtime enforcement is
what superpowers does not provide.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from forge.oracle import OracleNotFound, resolve_oracle, run_oracle
from forge.verdict import (
    CLAIM_VERDICT,
    EVIDENCE_VERDICT,
    Verdict,
    build_verdict,
    sign_verdict,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class GateResult:
    verdict: Verdict
    signature: str
    ok: bool


def forge_gate(
    project: str,
    config_path: Path | None = None,
    key_file: Path | None = None,
    evidence_dir: Path | None = None,
) -> GateResult:
    try:
        spec = resolve_oracle(project, config_path=config_path)
    except OracleNotFound:
        logger.warning("no oracle for %s -> BLOCKED", project)
        verdict = Verdict(
            project=project,
            software_verdict="BLOCKED",
            evidence_verdict=EVIDENCE_VERDICT,
            claim_verdict=CLAIM_VERDICT,
            returncode=-1,
            evidence_path="",
        )
        return GateResult(verdict=verdict, signature=sign_verdict(verdict, key_file), ok=False)

    result = run_oracle(spec, evidence_dir=evidence_dir)
    verdict = build_verdict(project, result.passed, result.returncode, result.evidence_path)
    signature = sign_verdict(verdict, key_file)
    return GateResult(verdict=verdict, signature=signature, ok=result.passed)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `.venv312\Scripts\python.exe -m pytest scripts/forge/tests/test_gate.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Run the whole forge suite**

Run: `.venv312\Scripts\python.exe -m pytest scripts/forge/tests/ -v`
Expected: PASS (11 passed total).

- [ ] **Step 6: Commit (after explicit go from Pierre)**

```bash
git add scripts/forge/gate.py scripts/forge/tests/test_gate.py
git commit -m "feat(forge): forge_gate ties oracle to signed verdict, blocks on red"
```

---

### Task 5: Wire the Leviathan oracle + prove the gate end-to-end

**Files:**
- Modify: `scripts/forge/oracles.json`
- Create: `scripts/forge/README.md`

**Interfaces:**
- Consumes: `forge_gate` (Task 4).

- [ ] **Step 1: Add Leviathan to the oracle config**

Replace `scripts/forge/oracles.json` contents with:

```json
{
  "forge": {
    "cwd": ".",
    "command": [".venv312/Scripts/python.exe", "-m", "pytest", "scripts/forge/tests/", "-q"]
  },
  "leviathan": {
    "cwd": "games/leviathan",
    "command": ["npm", "test", "--", "--run"]
  }
}
```

- [ ] **Step 2: Prove the gate on the forge project itself (deterministic, no node needed)**

Run from repo root:

```bash
.venv312/Scripts/python.exe -c "from pathlib import Path; import sys; sys.path.insert(0, 'scripts'); from forge.gate import forge_gate; r = forge_gate('forge'); print('ok=', r.ok, 'software=', r.verdict.software_verdict); print('evidence=', r.verdict.evidence_path)"
```

Expected: `ok= True software= OK` and an evidence path under `lab/forge_evidence/oracle_forge.log`. Open that log and confirm it contains the pytest summary line (the raw proof).

- [ ] **Step 3: Prove the gate on Leviathan (integration — needs Node installed)**

Run from repo root:

```bash
.venv312/Scripts/python.exe -c "import sys; sys.path.insert(0, 'scripts'); from forge.gate import forge_gate; r = forge_gate('leviathan'); print('ok=', r.ok, 'software=', r.verdict.software_verdict)"
```

Expected: `ok= True software= OK` if Leviathan's vitest suite is green. If Node is not on PATH, the oracle returns non-zero and the gate correctly reports `FAIL` — that is the gate working, not a bug. Record which happened.

- [ ] **Step 4: Write the module README**

Create `scripts/forge/README.md`:

```markdown
# forge — oracle gate (PROUVER + FORCER)

`forge_gate(project)` resolves the project's deterministic oracle from
`oracles.json`, runs it, captures raw output under `lab/forge_evidence/`, and
returns an HMAC-signed verdict. `claim_verdict` is always `NO_CLAIM_ALLOWED`.
A non-green oracle yields `ok=False` — callers must not proceed.

Add a project by adding an entry to `oracles.json`:
`"<project>": {"cwd": "<repo-relative dir>", "command": [<argv>]}`.

This deliberately does NOT touch `scripts/studio_meta.py`. Replacing the global
ELO gate with this per-project gate is a separate, Pierre-gated change.
```

- [ ] **Step 5: Commit (after explicit go from Pierre)**

```bash
git add scripts/forge/oracles.json scripts/forge/README.md
git commit -m "feat(forge): wire leviathan oracle + module README"
```

---

## Follow-up plans (NOT this plan)

- **Repo Blueprint + architecture oracle** (`ARCHITECTURE`): derive `blueprint.yaml` from the plan
  (modules, responsibilities, allowed/forbidden dependencies, ownership); an `architecture` oracle
  that checks forbidden-dependency absence + per-module test presence. NB: the architecture oracle is
  just another entry in `oracles.json` — this plan's resolver already supports it; the follow-up
  builds the dependency-check command + the blueprint artifact.
- **WireMap + WireMap oracle** (`SOURCE DE VÉRITÉ FONCTIONNELLE`): `.forge/wiremap.*` table
  (feature · main call · files · landmark fn · version · expected proof · status) inserted between
  roadmap and architecture, auto-updated on every artifact change; a `wiremap` oracle (just another
  `oracles.json` entry — this plan's gate already supports it) that checks files/landmark-functions/
  proofs exist and status is coherent, flagging missing-feature / renamed-function / stale-wiremap /
  missing-proof.
- **PILOU v0** (`SE SOUVENIR`): `facts.json` / `decisions.json` / `postmortems.json` with confidence, written at loop close, read at re-plan.
- **Confidence graph** (`MONTRER`): pure `artefacts -> colours` function + builder llm-lego view.
- **`/forge` skill** (the thin orchestrator): the Claude Code skill that weaves superpowers skills + these bricks and enforces the transition invariants (contract → plan → world-scan → architecture → red-team → blueprint gate → create → delegate-by-ownership → execute → oracle(code+archi) → red-team code → verdict → human gate → memory).
- **studio_meta per-project gate** (Pierre-gated): replace the stale global ELO gate in `scripts/studio_meta.py` with the `forge_gate` per-project resolver.
