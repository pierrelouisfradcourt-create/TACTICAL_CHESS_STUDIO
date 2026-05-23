# Human Command Vocabulary V0

Human Command Vocabulary V0 defines short, explicit control instructions for StudioPilot/Codex workflow routing. These commands are control-plane records only. They do not execute work, start an autonomous runner, call Codex, call OpenAI, call GitHub, create pull requests, mark work ready, merge work, run benchmarks, train models, or change runtime behavior.

HumanGate remains the final authority. A command can reduce scope, freeze a surface, or permit bounded local implementation inside an explicit scope, but it cannot silently expand authority. If commands conflict, the safer command wins and unresolved ambiguity is held or blocked for human review.

## Command Types

- `READ_ONLY_ONLY`: permits inspection and reporting only. It prevents edits, file writes, patching, auto-ready, auto-merge, benchmark automation, training, and claim escalation.
- `PLAN_ONLY`: permits planning and task decomposition only. It does not authorize patching or execution.
- `BUILD_ALLOWED`: permits bounded implementation only inside the named `target_scope` and only while all freezes and forbidden actions remain honored.
- `REVIEW_ONLY`: permits inspection, diff review, and risk reporting. It does not authorize patching.
- `STOP_AUTOMATION`: halts automation and allows only stopped-state reporting unless a later HumanGate decision reopens the scope.
- `FREEZE_SCOPE`: applies one or more `FREEZE_*` targets to block sensitive surfaces such as runtime, search, neural, ML, dataset, CI, claims, guard, or automation.

## Freeze Targets

`FREEZE_RUNTIME`, `FREEZE_SEARCH`, `FREEZE_NEURAL`, `FREEZE_ML`, `FREEZE_DATASET`, `FREEZE_CI`, `FREEZE_GUARD`, `FREEZE_CLAIMS`, and `FREEZE_AUTOMATION` block actions touching those surfaces. Runtime, search, neural, and ML work remains blocked unless the human explicitly scopes it later.

## Conflict Rules

The resolver is conservative:

- `STOP_AUTOMATION` overrides every other command.
- `READ_ONLY_ONLY` overrides `BUILD_ALLOWED`.
- `FREEZE_*` blocks actions touching the frozen scope.
- `BUILD_ALLOWED` plus a frozen runtime/search/neural/ML scope becomes `BLOCKED`.
- `BUILD_ALLOWED` plus another frozen target becomes `HOLD` when the conflict can be safely paused for human review.
- HumanGate must remain true.
- `auto_merge_allowed` and `auto_ready_allowed` must remain false.
- `claim_scope` resolves to the most restrictive command and cannot escalate above `NO_CLAIM_ALLOWED`, `HEALTH_ONLY`, or `EVIDENCE_ONLY`.

## Boundaries

These tools are local validators and resolvers. They do not use subprocesses, network calls, GitHub API calls, OpenAI API calls, Codex API calls, secrets, file writes, benchmarks, training, runtime tests, or autonomous agents.

The vocabulary is intended for future integration with `CampaignPlan`, `PRQueue`, `TaskPacket`, and `HumanDecision`. That integration must still preserve HumanGate, no auto-ready, no auto-merge, no benchmark automation, and no runtime/ML changes unless explicitly scoped by the human.

software_verdict: CONTROL_PLANE_HUMAN_COMMAND_VOCABULARY_ONLY

evidence_verdict: HUMAN_GATE_COMMANDS_LOCAL_ONLY

claim_verdict: NO_CLAIM_ALLOWED
