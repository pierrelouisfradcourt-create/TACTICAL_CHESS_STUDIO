# UxPilote Studio Garden Datasets Names-Only Audit V0

Task ID: UXPILOTE-STUDIO-GARDEN-DATASETS-NAMES-ONLY-AUDIT-V0

## Status and authority

- Status: DOCUMENTED_ONLY
- Surface: roadmap_docs_only
- Runtime authority: NONE
- Claim posture: NO_CLAIM_ALLOWED
- Owner authority: HumanGate
- Human gate required: true

This report is a routed roadmap-only, names-only audit of `C:/TACTICAL_CHESS_STUDIO/datasets`. It does not authorize dataset content reading, dataset parsing, dataset validation, dataset generation, dataset reset, dataset split, dataset merge, dataset transform, dataset normalization, dataset promotion, training, model/checkpoint action, cleanup, deletion, movement, copying, archiving, recursive scan, PureLab inspection, secrets access, runtime execution, Git activity, Godot execution, benchmark, agent activation, Chess960 activation, DecisionController activation, or any global ready claim.

## Purpose

Create a read-only names-only audit of:

```text
C:/TACTICAL_CHESS_STUDIO/datasets
```

The purpose is to determine whether the datasets area exists and what top-level dataset candidates are present without reading contents or performing dataset operations.

## Audit scope

- Only top-level entries inside datasets if present.
- No recursive scan.
- No dataset content read.
- No dataset parsing.
- No dataset validation.
- No dataset generation.
- No dataset reset.
- No dataset split, merge, transform, normalize, or promote action.
- No training.
- No secrets access.
- No PureLab content inspection.
- No file moves.
- No file copy, rename, delete, archive, cleanup, hash calculation, recursive size calculation, Git command, Godot command, test command, benchmark, latest manifest creation, run folder creation, model/checkpoint creation, or model promotion.

## Command used

```powershell
if (Test-Path 'C:/TACTICAL_CHESS_STUDIO/datasets') { Get-ChildItem -LiteralPath 'C:/TACTICAL_CHESS_STUDIO/datasets' -Force | Select-Object Name, FullName, PSIsContainer, LastWriteTime }
```

Constraints enforced:

- `-Recurse` was not used.
- `Get-Content` was not run on dataset files.
- Dataset files were not parsed, validated, generated, reset, split, merged, transformed, normalized, or promoted.
- Training was not run.
- Hashes and recursive sizes were not calculated.
- Secrets and PureLab paths were not inspected.

## Datasets path result

- Path: `C:/TACTICAL_CHESS_STUDIO/datasets`
- Exists: true
- Top-level entries observed: 6
- Inspection depth: one bounded level only
- Dataset content read: none
- Dataset operations performed: none
- Training: none

## Entries observed

| name | path | is_directory | last_write_time | initial_classification | evidence_type | human_gate_question |
| --- | --- | --- | --- | --- | --- | --- |
| `blocked_future_sensitive` | `C:/TACTICAL_CHESS_STUDIO/datasets/blocked_future_sensitive` | true | 2026-05-16 13:09:08 | blocked_do_not_touch | name/path/type/last_write_time only | Does this name indicate sensitive future dataset material that must remain blocked from any content read until a dedicated HumanGate task? |
| `chess` | `C:/TACTICAL_CHESS_STUDIO/datasets/chess` | true | 2026-05-16 13:09:08 | dataset_candidate | name/path/type/last_write_time only | Is this a passive chess dataset area, and should any future audit remain names-only or allow a narrower metadata/content scope? |
| `cyberdefense` | `C:/TACTICAL_CHESS_STUDIO/datasets/cyberdefense` | true | 2026-05-16 13:09:08 | unknown_dataset_candidate | name/path/type/last_write_time only | Is this security-sensitive dataset material requiring cyberdefense-specific HumanGate rules before any deeper inspection? |
| `quarantine` | `C:/TACTICAL_CHESS_STUDIO/datasets/quarantine` | true | 2026-05-16 13:09:08 | archive_dataset_candidate | name/path/type/last_write_time only | Is this a quarantine or preservation area that should remain blocked from general audit until HumanGate sets intake rules? |
| `tactical_core` | `C:/TACTICAL_CHESS_STUDIO/datasets/tactical_core` | true | 2026-05-16 13:09:08 | training_data_candidate | name/path/type/last_write_time only | Does this name imply candidate training or core tactical data, and should training/data-promotion remain blocked until a separate task? |
| `telemetry_sanitized` | `C:/TACTICAL_CHESS_STUDIO/datasets/telemetry_sanitized` | true | 2026-05-16 13:09:08 | evaluation_data_candidate | name/path/type/last_write_time only | Does this contain sanitized telemetry or evaluation-style data, and what privacy boundary applies before any content read? |

All classifications are initial, names-only, and candidate-only. If uncertain, classification remains UNKNOWN or candidate-only and requires HumanGate review.

## Initial classification

| classification | entries | basis |
| --- | --- | --- |
| dataset_candidate | `chess` | Name suggests dataset material, but no contents were inspected. |
| training_data_candidate | `tactical_core` | Name may imply core/tactical training-style material; no training authority is granted. |
| evaluation_data_candidate | `telemetry_sanitized` | Name may imply telemetry/evaluation-style data; no content or privacy claim is made. |
| archive_dataset_candidate | `quarantine` | Name suggests quarantine/preservation boundary; no archive action is authorized. |
| unknown_dataset_candidate | `cyberdefense` | Name suggests a specialized or security-sensitive zone; name-only evidence is insufficient. |
| blocked_do_not_touch | `blocked_future_sensitive` | Name explicitly suggests blocked/sensitive future material; content read remains blocked. |

## Unknowns and HumanGate questions

- Which dataset candidate directories are privacy-sensitive, security-sensitive, or blocked_do_not_touch before any content review?
- Should `blocked_future_sensitive` remain fully blocked from content read by default?
- Should `cyberdefense` require a cyberdefense-specific task before any deeper inspection?
- Should `quarantine` be treated as preserved evidence rather than ordinary dataset material?
- Does `tactical_core` imply future training data, and should any training-related interpretation remain blocked?
- Does `telemetry_sanitized` have enough privacy guarantees to permit metadata-only review later, or should it remain names-only?
- Should the next audit inspect models names-only next, or pause for HumanGate review of datasets first?

## What was not inspected

- No dataset contents were read.
- No child directory contents were inspected.
- No recursive scan was performed.
- No dataset parsing was performed.
- No dataset validation was performed.
- No dataset generation was performed.
- No dataset reset was performed.
- No dataset split, merge, transform, normalize, or promotion was performed.
- No training was run.
- No secrets path was inspected; the secrets path was not inspected.
- No TacticalChessPureLab repo contents were inspected.
- No files under `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab` were read, listed, modified, copied, moved, renamed, deleted, or executed.
- No Godot `.gd` or `.tscn` files were inspected or modified.
- No file hashes, recursive sizes, dependency graphs, Git status, Git history, tests, builds, benchmarks, latest manifests, run folders, models, or checkpoints were inspected or generated.

## Blocked actions

```yaml
file_move: BLOCKED
file_delete: BLOCKED
file_rename: BLOCKED
file_copy: BLOCKED
recursive_scan: BLOCKED
content_read: BLOCKED
dataset_parse: BLOCKED
dataset_validation: BLOCKED
dataset_generation: BLOCKED
dataset_reset: BLOCKED
dataset_split: BLOCKED
dataset_merge: BLOCKED
dataset_transform: BLOCKED
dataset_normalization: BLOCKED
dataset_promotion: BLOCKED
training: BLOCKED
secrets_access: BLOCKED
repo_scan: BLOCKED
runtime_change: BLOCKED
agent_activation: BLOCKED
benchmark: BLOCKED
latest_manifest_creation: BLOCKED
run_folder_creation: BLOCKED
model_or_checkpoint_creation: BLOCKED
model_promotion: BLOCKED
chess960_activation: BLOCKED
decision_controller_activation: BLOCKED
real_approval_workflow: BLOCKED
real_hygiene_scan: BLOCKED
real_truth_agent: BLOCKED
real_build_execution: BLOCKED
real_archive_action: BLOCKED
real_tool_launch: BLOCKED
commit: BLOCKED
push: BLOCKED
branch_creation: BLOCKED
pull_request_creation: BLOCKED
```

## Next recommended audit slice

Recommended next option: pause for HumanGate review of these six dataset candidates before any deeper datasets audit.

If HumanGate wants the next truth slice immediately, the safest next audit is models names-only, using the same top-level-only pattern and preserving model/checkpoint creation, promotion, and training as BLOCKED.

## Status by surface

| Surface | Status | Notes |
| --- | --- | --- |
| active_runtime_code | PASSIVE | Not inspected, modified, executed, or authorized. |
| tests | PASSIVE | Not inspected, modified, or run. |
| artifacts_runtime_outputs | PASSIVE | Dataset names were observed as candidate artifact/data surfaces only; no dataset content or generated artifact was created. |
| canonical_docs | PASSIVE | Source anchors and templates were read as reference only; no canonical docs were modified. |
| roadmap_docs_only | DOCUMENTED_ONLY | This routed audit report was created as the only output. |
| inference | PASSIVE | Classifications are candidate-only and require HumanGate review. |

## Software verdict

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

## Evidence verdict

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

Evidence is limited to exact preflight path checks, explicit source readback, the allowed top-level `Get-ChildItem` command for `datasets`, this report write, and docs-only readback validation. It does not include dataset-content evidence, recursive dataset evidence, dataset quality evidence, secrets evidence, PureLab evidence, Godot evidence, Git evidence, runtime evidence, test evidence, benchmark evidence, training evidence, model evidence, or checkpoint evidence.

## Claim verdict

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

Claim posture remains `NO_CLAIM_ALLOWED`. This report claims only that a top-level names-only read-only audit of `datasets` was performed and documented under the routed roadmap destination.

## No global ready verdict

no_global_ready_verdict: true

No global ready or not-ready verdict is made. Verdicts are split by surface only.
