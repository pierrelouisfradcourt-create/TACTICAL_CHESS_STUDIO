# Automation Smoke Matrix

Status: smoke matrix
Scope: required local validation and smoke checks per automation lane
Evidence status: documentation only

This matrix defines the minimum local validation expected before automation
routes a bounded PR for review or guard dry-run. It does not authorize runtime
behavior changes, benchmark claims, holdout use, dataset resets, promotion,
Elo claims, strength claims, or scientific proof.

Tests, smokes, CI, and guard output prove mechanical stability only. They do
not prove strength, Elo, promotion readiness, or a scientific result.

## 1. Smoke Levels

### SMOKE_LEVEL_0

Docs, fixtures, and specs only.

Use this level when the change is limited to documentation, JSON fixtures,
schemas, or specs and does not wire runtime behavior.

### SMOKE_LEVEL_1

Passive boundary or code without runtime behavior wiring.

Use this level when the change adds passive boundaries, adapters, or code
surfaces that do not alter live runtime loops, policy authority, CI behavior,
guard behavior, or dataset authority.

### SMOKE_LEVEL_2

Learning/Puzzle/Train code lane with audit required.

Use this level when the change touches Learning, Puzzle, or Train code or
behavior-adjacent interpretation. GPT audit JSON is required before the guard
is consulted.

### SMOKE_LEVEL_MANUAL

Scripts, CI, guard, policy, and runtime-critical lanes.

Use this level when the change touches protected authority surfaces or runtime
critical behavior. These lanes require manual review and must not auto-merge.

## 2. Lane Smoke Requirements

| Lane | Smoke Level | Required Local Validation | Guard Route |
| --- | --- | --- | --- |
| SAFE_AUTO docs/control-plane | SMOKE_LEVEL_0 | Workspace hygiene, local agent session report, docs update readiness, GitHub PR view/checks/diff after PR creation | `auto_merge_guard` dry-run only |
| SAFE_AUTO fixtures | SMOKE_LEVEL_0 | JSON validation with `python -m json.tool`; verify fixture files only; no runtime loop | `auto_merge_guard` dry-run only |
| SAFE_AUTO specs | SMOKE_LEVEL_0 | Docs/spec review plus JSON validation when specs include JSON fixtures | `auto_merge_guard` dry-run only |
| Passive boundary code | SMOKE_LEVEL_1 | `cargo check`; relevant cargo tests only; no runtime behavior wiring | Audit route if behavior interpretation is ambiguous |
| AUDIT_REQUIRED Learning/Puzzle/Train | SMOKE_LEVEL_2 | `cargo check`; relevant cargo tests only; JSON validation if fixtures exist; GPT audit JSON required before guard | Guard only after audit packet exists |
| HUMAN_REQUIRED guard/policy/CI/scripts/runtime | SMOKE_LEVEL_MANUAL | Manual review required; automation may report mechanical checks only when explicitly requested | No auto-merge |

## 3. SAFE_AUTO Docs/Control-Plane

Required checks for automation control-plane documentation changes:

```powershell
git status --short
.\.venv312\Scripts\python.exe scripts\check_workspace_hygiene.py --pretty
.\.venv312\Scripts\python.exe scripts\report_local_agent_session.py --pretty
.\.venv312\Scripts\python.exe scripts\prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty
gh pr view <PR_NUMBER>
gh pr checks <PR_NUMBER>
gh pr diff <PR_NUMBER>
.\.venv312\Scripts\python.exe scripts\auto_merge_guard.py --repo pierrelouisfradcourt-create/TacticalChessPureLab --pr <PR_NUMBER> --expected-head <HEAD_SHA> --pretty
```

Docs/control-plane automation may proceed only when changed files remain inside
the active allowed-file list and the PR verdicts are present.

Required verdict shape:

```text
software_verdict: <docs-lane software result>
evidence_verdict: DOCUMENTATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

## 4. SAFE_AUTO Fixtures

Required checks for fixture-only changes:

```powershell
.\.venv312\Scripts\python.exe -m json.tool <fixture.json>
.\.venv312\Scripts\python.exe scripts\check_workspace_hygiene.py --pretty
.\.venv312\Scripts\python.exe scripts\report_local_agent_session.py --pretty
.\.venv312\Scripts\python.exe scripts\auto_merge_guard.py --repo pierrelouisfradcourt-create/TacticalChessPureLab --pr <PR_NUMBER> --expected-head <HEAD_SHA> --pretty
```

Fixture automation boundaries:

- fixture files only;
- no runtime loop;
- no benchmark;
- no holdout;
- no dataset reset;
- no `lab/runs/RUN_*`;
- no `latest.json`.

## 5. AUDIT_REQUIRED Learning/Puzzle/Train

Required checks for Learning, Puzzle, or Train code lanes:

```powershell
cargo check
cargo test <relevant test target or filter>
.\.venv312\Scripts\python.exe -m json.tool <fixture.json>
```

The JSON validation command is required only when the PR includes JSON
fixtures. The cargo test selection must stay relevant to the edited surface and
must not expand into benchmark, holdout, dataset reset, or gameplay-loop proof.

Before guard routing, the PR must include a GPT audit JSON packet or explicit
audit artifact required by the active task. The audit is routing evidence only;
it is not merge authority and not scientific evidence.

Forbidden for this lane:

- benchmark as proof;
- holdout;
- dataset reset;
- `lab/runs/RUN_*`;
- `latest.json`;
- strength, Elo, promotion, or scientific claims.

## 6. HUMAN_REQUIRED

HUMAN_REQUIRED lanes must not auto-merge.

Manual review is required for:

- `scripts/**`;
- `.github/**`;
- `scripts/auto_merge_guard.py`;
- guard changes;
- policy changes;
- CI changes;
- runtime behavior wiring;
- runtime-critical behavior;
- ML model or training authority;
- dataset authority.

Automation may prepare a bounded proposal only when explicitly requested by the
human. Guard, policy, CI, and scripts changes must not be treated as routine
automation docs lanes and must not auto-merge.

## 7. Forbidden Proof and Outputs

Forbidden proof:

- benchmark is not proof;
- holdout is not allowed;
- `latest.json` is not evidence;
- `lab/runs/RUN_*` is forbidden in automation docs lanes;
- gameplay loops are not proof for automation docs lanes;
- CI passing is not strength, Elo, promotion, or scientific proof.

Explicit output rule:

```text
Tests prove mechanical stability only, not strength/Elo/promotion/scientific result.
```

## 8. Required Verdicts

For this smoke matrix:

```text
software_verdict: AUTOMATION_SMOKE_MATRIX_ADDED
evidence_verdict: DOCUMENTATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
