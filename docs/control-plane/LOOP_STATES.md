# StudioPilot Loop States (SP-201)

This document defines contract-level state semantics for the StudioPilot loop. The repo now contains passive schemas and implemented dry-run control-plane scripts for validation, rendering, state preview, operator inbox preview, HumanGate decision candidates, authorized-action preview, and in-memory loop checks. Those tools do not create an active runtime, Codex execution path, autonomous agent, workflow, or gameplay integration.

All transitions remain subject to HumanGate authority. GPT review is advisory and non-binding.

## Global Rules

- No path may bypass `HUMAN_DECIDED`.
- No autonomous retry loop is authorized.
- Rollbacks are human-directed state corrections, not automatic loops.
- Codex execution artifacts are implementation outputs, not canonical evidence by themselves.
- Schemas are PASSIVE contracts; passing schema validation does not authorize execution, activation, merge, promotion, or claims.
- Dry-run script outputs are local previews unless HumanGate explicitly promotes a narrower artifact.
- `claim_posture: NO_CLAIM_ALLOWED` and `no_global_ready_verdict: true` must remain preserved across state previews.
- Search remains final gameplay authority; Neural remains proposal/rerank only.

## Current Tooling Boundary

| State support surface | Status | Boundary |
| --- | --- | --- |
| TaskPacket / ExecutionReport validation | IMPLEMENTED | Local validation only; no Codex or GitHub call. |
| Studio state delta/current-state preview | IMPLEMENTED | Dry-run and explicit-write tooling exist; current state remains local ignored state. |
| Mission, operator inbox, HumanGate decision, and action-plan previews | IMPLEMENTED | Stdout-only/dry-run candidates; no execution or persistence authority. |
| Semi-auto and full in-memory loop checks | TESTED | In-memory harness checks loop shape and forbidden persistence boundaries. |
| Runtime activation | BLOCKED | No gameplay/runtime transition is authorized. |
| Roadmap/campaign items | DOCUMENTED_ONLY | Planning-only until separate HumanGate approval. |

## State Definitions

### IDEA
- Description: Human intention exists but is not yet operationalized.
- Entry criteria: A human objective or problem statement is declared.
- Exit criteria: A bounded work order is drafted.
- Allowed actions: Clarify scope, identify constraints, define intended outcome.
- Forbidden actions: Direct implementation, merge actions, promotion or claim decisions.
- Expected artifact: Intent statement or issue note.
- Blocker examples: Missing owner, ambiguous objective, conflicting priority.

### WORK_ORDER
- Description: The idea is formalized into an actionable work order.
- Entry criteria: IDEA has sufficient clarity for scoping.
- Exit criteria: TaskPacket is fully specified and reviewed for completeness.
- Allowed actions: Scope boundaries, non-goals, acceptance constraints, risk notes.
- Forbidden actions: Direct code mutation without a validated packet.
- Expected artifact: Work order document and draft TaskPacket.
- Blocker examples: Undefined constraints, contradictory scope, missing acceptance conditions.

### TASK_PACKET_VALIDATED
- Description: The TaskPacket is bounded, coherent, and mechanically acceptable.
- Entry criteria: Work order exists and packet fields are complete enough for execution.
- Exit criteria: A Codex task is created from the validated packet.
- Allowed actions: Policy validation, boundary checks, route planning.
- Forbidden actions: Runtime mutation outside packet scope, autonomous expansion of scope.
- Expected artifact: Validated TaskPacket record.
- Blocker examples: Missing required fields, policy violations, unsafe requested actions.

### CODEX_TASK_CREATED
- Description: Bounded implementation task is assigned to Codex.
- Entry criteria: TaskPacket is validated and routed.
- Exit criteria: A working branch with relevant edits is prepared.
- Allowed actions: Focused implementation, doc/code edits within scope, local checks allowed by scope.
- Forbidden actions: Self-approval, claim authorization, unsanctioned policy or runtime mutation.
- Expected artifact: Task execution log and changed files on branch.
- Blocker examples: Missing repository permissions, unresolved dependency for scoped task, conflicting branch state.

### BRANCH_READY
- Description: Candidate branch exists with scoped changes and commit history.
- Entry criteria: Codex task execution completed for current iteration.
- Exit criteria: Mechanical checks are run and recorded.
- Allowed actions: Commit, push, draft PR creation, prepare check execution.
- Forbidden actions: Auto-ready, auto-merge, bypassing check gates.
- Expected artifact: Branch head SHA and draft PR reference.
- Blocker examples: Commit failure, push failure, missing PR metadata.

### MECHANICAL_CHECKED
- Description: Defined mechanical checks completed with results captured.
- Entry criteria: Branch and PR exist for review surface.
- Exit criteria: Review-ready check summary is available.
- Allowed actions: Run configured checks in scope, collect logs and statuses.
- Forbidden actions: Treating checks as claim proof, skipping failed mandatory gates.
- Expected artifact: Check status rollup with traceable outputs.
- Blocker examples: Failing required check, missing workflow completion, policy gate failure.

### GPT_REVIEWED
- Description: GPT-based review feedback is attached as advisory input.
- Entry criteria: Mechanical check outcomes are available.
- Exit criteria: Human receives advisory review context for decision.
- Allowed actions: Risk commentary, design critique, requested follow-up suggestions.
- Forbidden actions: Authorization of merge, claim, or promotion.
- Expected artifact: GPT advisory review note.
- Blocker examples: Review unavailable, insufficient context for meaningful advisory review.

### HUMAN_DECIDED
- Description: HumanGate records the final branch outcome decision.
- Entry criteria: Mechanical and advisory context available, or explicit human override documented.
- Exit criteria: One terminal decision is selected: MERGED, REJECTED, or FROZEN.
- Allowed actions: Accept, reject, freeze; request further bounded changes before decision.
- Forbidden actions: Delegating final authority to GPT/Codex/automation.
- Expected artifact: Human decision record with rationale.
- Blocker examples: Decision deferred, unresolved risk requiring additional work, unclear ownership.

### MERGED
- Description: Human-approved changes are merged.
- Entry criteria: `HUMAN_DECIDED` outcome is merge.
- Exit criteria: Learning event is recorded.
- Allowed actions: Merge execution, post-merge trace recording.
- Forbidden actions: Retroactive claim inflation without evidence process.
- Expected artifact: Merge commit reference and merge metadata.
- Blocker examples: Merge conflict unresolved, protected branch policy denial.

### REJECTED
- Description: Human rejects the change for current form.
- Entry criteria: `HUMAN_DECIDED` outcome is reject.
- Exit criteria: Learning event is recorded.
- Allowed actions: Close PR or retain for audit, note rejection reasons.
- Forbidden actions: Silent disposal without rationale capture.
- Expected artifact: Rejection rationale record.
- Blocker examples: Missing reason, unresolved accountability for follow-up.

### FROZEN
- Description: Human freezes the change pending future conditions.
- Entry criteria: `HUMAN_DECIDED` outcome is freeze.
- Exit criteria: Learning event is recorded and freeze conditions tracked.
- Allowed actions: Preserve branch/PR context, define thaw criteria.
- Forbidden actions: Implicit merge, implicit rejection without decision update.
- Expected artifact: Freeze rationale and thaw conditions.
- Blocker examples: No owner for thaw decision, missing freeze criteria.

### LEARNING_EVENT_RECORDED
- Description: Outcome and lessons are recorded in the learning log.
- Entry criteria: Terminal decision (`MERGED`, `REJECTED`, or `FROZEN`) exists.
- Exit criteria: Learning event is stored and trace-linked to artifacts.
- Allowed actions: Capture lessons, failure modes, next-step proposals.
- Forbidden actions: Directly applying changes from BoosterSystem proposals.
- Expected artifact: LearningEvent entry with links to decision and evidence.
- Blocker examples: Missing decision reference, missing check artifacts, incomplete event fields.

## BLOCKED State Semantics

- `BLOCKED` is an overlay semantic, not a terminal outcome.
- Any active state may become blocked when entry/exit criteria cannot be satisfied.
- Unblocking requires explicit corrective action and state re-validation.
- `BLOCKED` does not authorize autonomous retries or scope expansion.

## UNKNOWN State Semantics

- `UNKNOWN` indicates insufficient observability to determine current state.
- `UNKNOWN` must trigger human/operator diagnosis before transition continues.
- `UNKNOWN` cannot transition directly to terminal states without restoration of traceability.

## Rollback Note

- Rollback is a human-directed correction to the latest valid traceable state.
- Rollback must preserve auditability and may not erase decision history.
- Rollback actions remain bounded by the same authority matrix constraints.

## Explicit Near-Term Forbiddance

- active StudioPilot runtime
- Codex SDK adapter
- MCP write tools
- auto-ready
- auto-merge
- prompt auto-mutation
- ML training
- fine-tuning
- runtime/search/neural refactor through StudioPilot
- `.studio_state/inbox.json` creation
- `latest.json` creation
- `lab/runs/RUN_*` creation
- `lab/puzzles` creation
- dataset generation or reset
- benchmark execution
- model checkpoint creation or promotion

## Verdict Boundaries

- software_verdict: CONTROL_PLANE_DRY_RUN_STATES_STABILIZED
- evidence_verdict: DOCUMENTED_ONLY_STATE_CONTRACT_WITH_IMPLEMENTED_DRY_RUN_TOOLING_READBACK
- claim_verdict: NO_CLAIM_ALLOWED

