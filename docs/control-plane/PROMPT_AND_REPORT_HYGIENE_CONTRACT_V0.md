# Prompt And Report Hygiene Contract V0

## Purpose

Prompt And Report Hygiene Contract V0 defines the passive checks that should be
applied before a Codex prompt is launched and after a Codex report is returned.

The goal is to stop source drift, scope drift, missing output routing, forbidden
authority, and false claims before they enter the Studio pipeline.

This document is documentation only. It does not create scripts, agents,
registries, workflows, automation, Codex calls, OpenAI calls, GitHub calls,
runtime behavior, training, dataset generation, benchmark logic, Git actions,
or claim authority.

Default claim posture: `NO_CLAIM_ALLOWED`.

Default fallback: `UNKNOWN => BLOCKED`.

## Authority Boundary

Prompt hygiene and report hygiene are passive gates.

They may recommend:

- `PASS`
- `HOLD`
- `BLOCKED`
- `ESCALATE_TO_HUMANGATE`

They may not:

- execute Codex
- approve Codex execution
- mutate files
- modify prompts automatically
- approve runtime activation
- approve tests beyond the scoped task
- approve Git actions
- accept software claims
- accept evidence claims
- replace HumanGate

HumanGate remains final authority for execution, merge, promotion, claim status,
runtime activation, and any future active automation.

## Relationship To Existing Contracts

| Existing contract | Relationship |
| --- | --- |
| `GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md` | Source-backed gate before Navigator may generate Codex prompts. |
| `RENDER_CODEX_PROMPT.md` | Dry-run renderer for validated TaskPacket prompt text. |
| `STUDIOPILOT_PACKET_SCHEMAS.md` | Packet roles: TaskPacket, ExecutionReport, ReviewPacket, HumanDecision. |
| `EXECUTION_REPORT_INTAKE.md` | Dry-run intake checks for ExecutionReport and TaskPacket alignment. |
| `REVIEW_PACKET_DRY_RUN.md` | Non-binding ReviewPacket generation from validated reports. |
| `LM_STUDIO_REVIEW_CONTRACT_V0.md` | Optional passive local model critique of prompts and reports. |

This document is the shared hygiene vocabulary across those surfaces. It does
not replace them.

## Prompt Hygiene

A Codex prompt is hygiene-compliant only when it includes:

- human wording or explicit source of intent
- task class
- requested runtime/model posture, if relevant
- sources to read first
- exact files or directories in scope
- reference-only paths
- files or surfaces out of scope
- blocked actions
- output routing for any file-producing work
- expected validation
- skipped-validation reporting requirement
- required final report fields
- status-by-surface requirement
- `NO_CLAIM_ALLOWED`
- `no_global_ready_verdict: true`
- explicit instruction not to commit or push unless HumanGate requested it

A prompt is `BLOCKED` when:

- source anchors are missing, stale, or `UNKNOWN`
- output routing is missing for file-producing work
- scope is broad or implicit
- forbidden surfaces are not declared
- it requests runtime activation without explicit HumanGate scope
- it requests training, fine-tuning, dataset generation, or benchmark proof
- it requests automatic branch, commit, push, PR, ready, or merge
- it asks Codex to infer authority from memory or conversation
- it allows a global ready/not-ready verdict
- it allows claims above `NO_CLAIM_ALLOWED`

## Prompt Minimum Shape

```yaml
codex_prompt_hygiene:
  human_words:
  task_class:
  sources_to_read:
  scope_in:
  scope_out:
  reference_only:
  output_routing:
  blocked_actions:
  validation:
  final_report_required_fields:
    - commands_run
    - results
    - skipped_validation
    - risks
    - status_by_surface
    - software_verdict
    - evidence_verdict
    - claim_verdict
  claim_posture: NO_CLAIM_ALLOWED
  no_global_ready_verdict: true
```

Missing required fields should produce `BLOCKED`, not best-effort execution.

## Report Hygiene

A Codex report is hygiene-compliant only when it includes:

- branch, HEAD, worktree status, and changed files
- commands run
- results
- files changed
- validation run
- validation skipped and why
- risks
- status by surface
- software verdict
- evidence verdict
- claim verdict
- no global ready/not-ready verdict

For repo work, the report must separate:

- active runtime code
- tests
- outputs/runtime artifacts
- canonical docs
- roadmap/docs-only
- inference

A report is `BLOCKED` or requires correction when:

- it claims implementation without changed code evidence
- it claims tests without commands and results
- it claims benchmark, training, dataset, model quality, or performance proof
- it omits skipped validation
- it omits changed files
- it omits risk
- it merges docs-only and runtime status into one verdict
- it treats ReviewPacket, LocalReviewPack, or LM Studio output as final authority
- it reports a global ready/not-ready state
- `claim_verdict` is missing or not `NO_CLAIM_ALLOWED`

## Report Minimum Shape

```yaml
codex_report_hygiene:
  repo_state:
    branch:
    head:
    worktree_status:
    tracked_diff:
    staged_diff:
    untracked_non_ignored:
  files_changed:
  commands_run:
  results:
  skipped_validation:
  risks:
  status_by_surface:
    active_runtime_code:
    tests:
    artifacts_runtime_outputs:
    canonical_docs:
    roadmap_docs_only:
    inference:
  software_verdict:
  evidence_verdict:
  claim_verdict: NO_CLAIM_ALLOWED
  no_global_ready_verdict: true
```

## Hygiene Status Values

Allowed hygiene statuses:

- `PASS`
- `HOLD`
- `BLOCKED`
- `ESCALATE_TO_HUMANGATE`

Allowed surface statuses remain:

- `IMPLEMENTED`
- `TESTED`
- `DOCUMENTED_ONLY`
- `PASSIVE`
- `BLOCKED`
- `NOT_FOUND`
- `UNKNOWN`

Do not mix hygiene status with surface implementation status.

## Local Model Review

LM Studio, Mistral, or Devstral may be used to critique prompts and reports only
as passive review.

Allowed local model outputs:

- missing source notes
- prompt drift notes
- report claim gaps
- contradiction notes
- blocked-surface notes
- HumanGate questions

Forbidden local model outputs:

- final approval
- truth validation
- merge approval
- claim promotion
- runtime activation
- training or dataset recommendation as executable next step

## Passive Checker Usage

The passive checker is:

`scripts/control_plane/validate_prompt_report_hygiene.py`

It reads one prompt or report file and prints a JSON gate result. It does not
execute Codex, call a model, mutate files, write outputs, stage Git changes,
commit, push, or approve anything.

Prompt check:

```powershell
python scripts/control_plane/validate_prompt_report_hygiene.py path/to/prompt.md --mode prompt --pretty
```

Report check:

```powershell
python scripts/control_plane/validate_prompt_report_hygiene.py path/to/report.md --mode report --pretty
```

StudioPilot ExecutionReport JSON check:

```powershell
python scripts/control_plane/validate_prompt_report_hygiene.py docs/control-plane/fixtures/studiopilot_packets/valid/valid_execution_report_docs.json --pretty
```

Smoke check:

```powershell
python scripts/control_plane/smoke_prompt_report_hygiene.py --pretty
```

Result meanings:

- `PASS`: the checked file contains the required hygiene fields.
- `HOLD`: the file is not necessarily invalid, but HumanGate should inspect it.
- `BLOCKED`: required hygiene data is missing or forbidden authority appears.
- `ESCALATE_TO_HUMANGATE`: a human decision is required before proceeding.

For non-coders: `BLOCKED` means "stop and fix the request or report before
using it." `PASS` means "the shape is acceptable"; it does not mean the patch,
runtime, tests, benchmark, model, or claim is proven.

## HumanGate Escalation

Escalate to HumanGate when:

- source authority is unclear
- the user intent is ambiguous
- prompt scope crosses columns
- report evidence contradicts the claim
- output routing is missing
- forbidden surfaces were touched
- validation cannot be run
- a model review and Codex report disagree on authority or claims

Escalation does not mean approval. It means the lane is paused until the human
decides.

## Status By Surface

| Surface | Status | Boundary |
| --- | --- | --- |
| active_runtime_code | BLOCKED | Hygiene contract cannot authorize runtime work. |
| tests | UNKNOWN | This document does not run tests. |
| artifacts_runtime_outputs | BLOCKED | No runtime, dataset, benchmark, run-bundle, or latest output is authorized. |
| canonical_docs | DOCUMENTED_ONLY | This is control-plane hygiene policy, not canonical runtime truth. |
| roadmap_docs_only | DOCUMENTED_ONLY | Hygiene can classify roadmap prompts and reports only. |
| inference | PASSIVE | Local models may critique hygiene but cannot decide. |
| local_review_stack | PASSIVE | `studio_review/` may review prompts and reports as advisory input. |
| control_plane | DOCUMENTED_ONLY | This document defines a passive contract only. |
| agent_governance | PASSIVE | No active agent or automation is created. |
| git_authority | BLOCKED | No branch, commit, push, PR, ready, merge, or Git write authority. |

## Verdicts

software_verdict: CONTROL_PLANE_PROMPT_REPORT_HYGIENE_DOCS_ONLY

evidence_verdict: HYGIENE_CONTRACT_ONLY

claim_verdict: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
