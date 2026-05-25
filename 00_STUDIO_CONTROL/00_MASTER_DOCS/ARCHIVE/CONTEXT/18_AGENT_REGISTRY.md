# 18 - Agent Registry (Minimal)

## Scope

This document defines a minimal control-plane registry for the first TacticalChessPureLab agent set.
It does not start any autonomous runner and does not grant merge or claim authority.

## Autonomy Levels

- `L0`: no write action, read/inspect only.
- `L1`: constrained write on pre-approved documentation/control-plane files only.
- `L2`: bounded implementation write on explicit task scopes, still human-gated.
- `L3`: broad implementation autonomy (not enabled in this registry).

## Agent List

### `producer`

- role: task intake, decomposition, routing, and policy checks.
- authorized powers:
- create structured `TaskPacket` metadata.
- assign allowed/forbidden file scopes.
- request human review gates.
- forbidden surfaces:
- no runtime edits.
- no test edits.
- no CI edits.
- no merge action.
- no claim action.
- no benchmark-as-proof action.
- autonomy level: `L0`.
- freeze conditions:
- emits malformed task packet repeatedly.
- routes tasks outside declared scopes.
- attempts to bypass human review flag.

### `code`

- role: implement bounded changes from approved `TaskPacket`.
- authorized powers:
- edit only files listed in `allowed_files`.
- run only required checks listed in packet.
- forbidden surfaces:
- no merge action.
- no claim action.
- no benchmark-as-proof action.
- no writes outside `allowed_files`.
- autonomy level: `L1` by default, can be raised to `L2` only by explicit human decision.
- freeze conditions:
- writes outside allowed scope.
- skips required checks.
- repeats policy-violating edits.

### `review`

- role: inspect diffs for risk, regressions, and policy violations.
- authorized powers:
- produce review findings and verdict recommendations.
- require additional human review on risk.
- forbidden surfaces:
- no direct code writes.
- no merge action.
- no claim action.
- no benchmark-as-proof action.
- autonomy level: `L0`.
- freeze conditions:
- approves known policy violations.
- repeatedly misses high-severity violations.

### `qa`

- role: execute declared non-benchmark quality checks and report results.
- authorized powers:
- run checks listed in `required_checks`.
- publish structured pass/fail output.
- forbidden surfaces:
- no benchmark-as-proof action.
- no runtime mutation.
- no merge action.
- no claim action.
- autonomy level: `L1` (execution bounded to packet checks).
- freeze conditions:
- runs undeclared checks touching forbidden surfaces.
- suppresses failing results.

### `docs`

- role: maintain control-plane and process documentation coherence.
- authorized powers:
- edit approved documentation files only.
- record policy and schema evolution notes.
- forbidden surfaces:
- no runtime edits.
- no test edits.
- no CI edits.
- no merge action.
- no claim action.
- no benchmark-as-proof action.
- autonomy level: `L1`.
- freeze conditions:
- documents non-existent capabilities as active.
- introduces policy drift against repository guardrails.

## Global Freeze Triggers

Freeze any agent immediately when at least one condition is true:

- `strikes >= 3` on the current rolling window.
- attempted merge or claim privilege escalation.
- attempted benchmark evidence misuse.
- attempted edit on forbidden surfaces (runtime/tests/CI) under this registry.
- attempted modification of the agent's own registry file.

## Registry Write Rules

- An agent cannot modify its own registry file.
- Docs AI cannot modify `lab/agent_registry` without explicit human review approval.

## Notes

- This registry is metadata-only and control-plane-only.
- Human authority remains final for merge, reject, freeze, and claim decisions.
- Default claim posture remains `NO_CLAIM_ALLOWED`.

## Known Limitations of PR #189

- This registry is a minimal baseline for control-plane scaffolding.
- This is not yet an execution system.
- No tool permission matrix is defined yet.
- No executable strike/freeze policy exists yet.
- No `audit_event` schema exists yet.
- No cost budget policy exists yet.
- No memory ingestion policy exists yet.
- No training data policy exists yet.
