# Automation Lane Matrix

Status: lane matrix
Scope: automation, Learning/Puzzle/Train, runtime, scripts, CI, guard, ML,
datasets, and evidence surfaces
Evidence status: documentation only

This matrix defines which surfaces may be handled by bounded automation and
which surfaces require audit, human review, or an explicit future human policy
change. It does not authorize runtime behavior changes, benchmark claims,
holdout use, dataset resets, promotion, Elo claims, strength claims, or
scientific proof.

Core role separation:

```text
Browser GPT plans.
Automation Controller coordinates.
Codex Builder implements bounded diffs.
GPT Auditor audits and routes only.
Scripts and CI verify mechanical behavior only.
auto_merge_guard is the only automation merge path.
The human controls policy, guard, CI, claims, merge override, freeze, reject,
promotion, and claim status.
```

OpenAI Platform and GPT audit are routing and audit surfaces only. They are not
merge authority, not claim authority, and not canonical evidence.

## 1. Lane Definitions

### SAFE_AUTO

SAFE_AUTO work may be implemented by Codex Builder and may use the automation
controller flow when the active task explicitly allows the files, the workspace
is clean, validation passes, the PR remains draft by default, and
`claim_verdict` remains `NO_CLAIM_ALLOWED`.

SAFE_AUTO surfaces:

- docs/control-plane docs;
- `MASTER_DOCS/**` docs that describe automation boundaries, evidence planes,
  operating notices, or policy summaries without changing executable behavior;
- `lab/learning/fixtures/**`;
- `lab/learning/schemas/**`;
- `lab/learning/specs/**`;
- non-canonical observation reports under `lab/gameplay_observation/**`;
- PR-local reports that record commands, validation, skipped validation, risks,
  and verdicts without creating canonical evidence.

SAFE_AUTO does not mean auto-claim. It means the surface is eligible for bounded
automation when task scope, validation, and guard policy agree.

### AUDIT_REQUIRED

AUDIT_REQUIRED work may be implemented only as a bounded PR that receives
explicit audit attention before merge. Automation may prepare the diff and run
approved mechanical checks, but the result is not safe for unattended merge
unless a future guard policy explicitly allows the lane.

AUDIT_REQUIRED surfaces:

- `src/learning/**`;
- `src/puzzle/**`;
- `src/train/**`;
- learning validators, parsers, and classifiers;
- scripted smokes that do not touch protected `scripts/**` or `.github/**`
  surfaces;
- data-shape or schema-adjacent behavior that can affect learning, puzzle, or
  train interpretation even when it appears mechanically small.

AUDIT_REQUIRED output remains mechanical evidence only. It must not be treated
as strength, Elo, promotion, scientific, or holdout evidence.

### HUMAN_REQUIRED

HUMAN_REQUIRED work may not be merged by ordinary automation. Codex Builder may
prepare a bounded proposal only when the human explicitly asks for it, and the
human retains policy, guard, CI, runtime, and claim authority.

HUMAN_REQUIRED surfaces:

- `scripts/**`;
- `.github/**`;
- `scripts/auto_merge_guard.py`;
- policy changes;
- guard changes;
- CI changes;
- runtime behavior wiring;
- automation merge rules;
- changes that alter what validation means, what evidence is accepted, or what
  claims are permitted.

HUMAN_REQUIRED work must be reviewed as policy or behavior authority work, not
as a routine docs-only or mechanical lane.

### FORBIDDEN

The following actions and evidence uses are forbidden unless a future explicit
human policy changes them:

- push `main`;
- force push;
- benchmark as proof;
- holdout;
- dataset reset;
- create `lab/runs/RUN_*`;
- create or use `latest.json` as evidence;
- strength claims;
- Elo claims;
- promotion claims;
- scientific proof claims.

FORBIDDEN items are stop conditions for automation. They must be reported, not
worked around.

## 2. Surface Matrix

| Surface | Lane | Automation Boundary |
| --- | --- | --- |
| Automation control-plane docs | SAFE_AUTO | Docs-only updates may define boundaries, roles, reports, and verdicts. |
| Non-canonical observation reports | SAFE_AUTO | May record local commands, validation, risks, and verdicts without creating canonical evidence. |
| `lab/learning/fixtures/**` | SAFE_AUTO | Fixture additions or edits may be automated when explicitly allowed and mechanically validated. |
| `lab/learning/schemas/**` | SAFE_AUTO | Schema documents may be automated when explicitly allowed and mechanically validated. |
| `lab/learning/specs/**` | SAFE_AUTO | Learning specs may be automated when explicitly allowed and mechanically validated. |
| `src/learning/**` | AUDIT_REQUIRED | Requires audit because behavior interpretation can change. |
| `src/puzzle/**` | AUDIT_REQUIRED | Requires audit because puzzle selection, parsing, or classification can change. |
| `src/train/**` | AUDIT_REQUIRED | Requires audit because training behavior or data handling can change. |
| Learning validators/parsers/classifiers | AUDIT_REQUIRED | Requires audit even when the edit is small or mechanical. |
| Scripted smokes outside protected surfaces | AUDIT_REQUIRED | May be proposed when they do not modify protected scripts, CI, guard, runtime, ML, or dataset authority. |
| `scripts/**` | HUMAN_REQUIRED | Human policy review required. Automation must not treat script changes as routine. |
| `.github/**` | HUMAN_REQUIRED | Human CI review required. Automation must not change CI authority unattended. |
| `scripts/auto_merge_guard.py` | HUMAN_REQUIRED | Human guard review required. Automation must not patch its own merge authority. |
| Policy, guard, or CI changes | HUMAN_REQUIRED | Human controls these authority surfaces. |
| Runtime behavior wiring | HUMAN_REQUIRED | Human review required because runtime behavior authority changes. |
| ML model/training authority | HUMAN_REQUIRED | Human review required; mechanical validation is not strength evidence. |
| Dataset authority | HUMAN_REQUIRED | Human review required; dataset reset remains forbidden. |
| `lab/runs/RUN_*` | FORBIDDEN | Do not create during automation lanes. |
| `latest.json` | FORBIDDEN | Do not create or use as canonical evidence. |
| Benchmark or holdout evidence | FORBIDDEN | Do not use as proof for automation, PR, strength, promotion, or scientific claims. |
| Main or force-push operations | FORBIDDEN | Automation may push only a dedicated PR branch and must not force-push. |
| Strength, Elo, promotion, or scientific claims | FORBIDDEN | Claim authority remains human-controlled and currently disallowed. |

## 3. Authority Boundaries

Browser GPT may plan and critique workflow options. It does not implement,
merge, validate, or claim.

Automation Controller coordinates bounded task flow, stop conditions, validation
sequence, branch discipline, and report shape. It does not own claims or policy.

Codex Builder implements bounded diffs only inside the active allowed-file list.
It may run approved local mechanical validation, commit to a dedicated PR
branch, push that branch, and open a draft PR.

GPT Auditor audits and routes. It may identify risks, missing evidence, policy
conflicts, or stop conditions. It is not merge authority, claim authority, or
canonical evidence.

Scripts and CI verify mechanical behavior only. Passing checks do not prove
engine strength, Elo, promotion readiness, holdout quality, or scientific
claims.

`auto_merge_guard` may merge only when invoked explicitly, the expected head
matches, allowed paths match, checks pass, verdicts are valid, and guard policy
returns a merge-ready result.

The human controls policy, guard, CI, claims, merge override, freeze, reject,
promotion, and claim status.

## 4. Evidence Rules

Allowed automation evidence is mechanical and local to the PR:

- workspace hygiene output;
- local agent session report output;
- docs update readiness output;
- CI check status;
- guard dry-run output;
- guard merge output when the guard is explicitly invoked in merge mode;
- non-canonical PR observation notes.

Forbidden evidence uses:

- benchmark as proof;
- holdout as proof;
- gameplay loop as proof;
- `latest.json` as canonical evidence;
- `lab/runs/RUN_*` as an automation-created proof bundle;
- GPT audit as canonical evidence;
- OpenAI Platform output as merge or claim authority;
- CI pass as strength, Elo, promotion, or scientific proof.

## 5. Stop Conditions

Automation must stop and report if:

- the requested edit touches a surface outside the active allowed-file list;
- the requested edit touches HUMAN_REQUIRED or FORBIDDEN surfaces without
  explicit human policy for that task;
- validation fails, is skipped unexpectedly, or cannot run;
- GitHub verification is unavailable;
- branch or expected-head state is ambiguous;
- PR verdicts are missing or invalid;
- `claim_verdict` is not exactly `NO_CLAIM_ALLOWED`;
- benchmark, holdout, dataset reset, `lab/runs/RUN_*`, or `latest.json` is
  requested;
- strength, Elo, promotion, or scientific proof is requested;
- `auto_merge_guard` does not return an explicit merge-ready verdict for an
  automation merge.

## 6. Required Verdicts

For this lane matrix:

```text
software_verdict: AUTOMATION_LANE_MATRIX_ADDED
evidence_verdict: DOCUMENTATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
