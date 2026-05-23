# PR-AUTO-GUARD-002 GPT Platform Bridge Lane

## Objective

Update `scripts/auto_merge_guard.py` narrowly so PR-AUTO-005 GPT Platform
Bridge docs can pass as a docs-only automation control-plane PR when all other
guard gates and required checks pass.

## Files Changed

Allowed files:

- `scripts/auto_merge_guard.py`
- `lab/gameplay_observation/PR_AUTO_GUARD_002_GPT_PLATFORM_BRIDGE_LANE.md`

No source, test, CI, ML, runtime, benchmark, holdout, dataset, run-bundle, or
`latest.json` surfaces are changed by this PR.

## Guard Change

The guard now allows this docs-lane software verdict:

```text
AUTOMATION_GPT_PLATFORM_BRIDGE_ADDED
```

The change is limited to the docs-lane software verdict allowlist. It does not
change forbidden paths, protected control-plane script detection, claim verdict
requirements, evidence verdict requirements, check requirements, expected-head
matching, mergeability checks, or merge execution behavior.

## Boundaries Preserved

This PR preserves these boundaries:

- `scripts/**` auto-merge remains disallowed.
- `.github/**` auto-merge remains disallowed.
- `src/**` runtime behavior changes remain disallowed unless an existing
  passive-runtime lane explicitly permits them.
- `ml/**` remains disallowed.
- `lab/runs/**` remains disallowed.
- `latest.json` remains disallowed.
- `claim_verdict` must remain exactly `NO_CLAIM_ALLOWED`.
- Protected control-plane scripts remain manual-review-required.
- This PR modifies `scripts/auto_merge_guard.py`, so this PR must not
  auto-merge itself.

Behavior-risk detection is not weakened for `src/**`, `scripts/**`,
`.github/**`, `ml/**`, runtime files, or forbidden paths.

## Validation Plan

Required validation:

```powershell
.\.venv312\Scripts\python.exe -m py_compile scripts\auto_merge_guard.py
.\.venv312\Scripts\python.exe scripts\auto_merge_guard.py --repo pierrelouisfradcourt-create/TacticalChessPureLab --pr 180 --expected-head 15ec11259716b35b3c128797d15aa4d2ac3c2581 --pretty
.\.venv312\Scripts\python.exe scripts\check_workspace_hygiene.py --pretty
.\.venv312\Scripts\python.exe scripts\report_local_agent_session.py --pretty
.\.venv312\Scripts\python.exe scripts\prepare_docs_update_pr.py --ignore-local-benchmark-noise --pretty
```

Expected PR #180 behavior after this patch and after required checks pass:

```text
software_verdict: AUTO_MERGE_READY_DRY_RUN
blocked_reasons: []
```

Explicitly skipped validation:

- benchmark;
- holdout;
- gameplay loop;
- `--allow-merge`.

These are skipped because this PR changes guard policy narrowly and must not
create performance, holdout, gameplay, strength, promotion, or proof evidence.
`--allow-merge` is skipped because this guard PR must not merge anything.

## Risks

- Software risk: medium; the guard allowlist changes, but only for one
  docs-lane software verdict.
- Evidence risk: low; the change affects mechanical PR gate routing only and
  creates no canonical evidence.
- Claim risk: low; `claim_verdict` remains `NO_CLAIM_ALLOWED`.
- Merge risk: manual merge required because this PR modifies
  `scripts/auto_merge_guard.py`.

## Required PR Verdicts

software_verdict: AUTO_MERGE_GUARD_GPT_PLATFORM_BRIDGE_LANE_ADDED
evidence_verdict: MECHANICAL_PR_GATE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
