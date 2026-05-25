# UxPilote Studio Garden Models Names-Only Audit V0

Task ID: UXPILOTE-STUDIO-GARDEN-MODELS-NAMES-ONLY-AUDIT-V0

## Status and authority

- Status: DOCUMENTED_ONLY
- Surface: roadmap_docs_only
- Runtime authority: NONE
- Claim posture: NO_CLAIM_ALLOWED
- Owner authority: HumanGate
- Human gate required: true

This report is a routed roadmap-only, names-only audit of `C:/TACTICAL_CHESS_STUDIO/models`. It does not authorize model/checkpoint content reading, model loading, model evaluation, model benchmark, benchmark, model creation, checkpoint creation, model promotion, checkpoint promotion, training, dataset generation, cleanup, deletion, movement, copying, archiving, recursive scan, PureLab inspection, secrets access, runtime execution, Git activity, Godot execution, agent activation, Chess960 activation, DecisionController activation, or any global ready claim.

## Purpose

Create a read-only names-only audit of:

```text
C:/TACTICAL_CHESS_STUDIO/models
```

The purpose is to determine whether the models area exists and what top-level model/checkpoint candidates are present without reading, loading, benchmarking, evaluating, creating, or promoting models.

## Audit scope

- Only top-level entries inside models if present.
- No recursive scan.
- No model/checkpoint content read.
- No model loading.
- No model evaluation.
- No benchmark.
- No model benchmark.
- No model or checkpoint creation.
- No model promotion.
- No checkpoint promotion.
- No training.
- No dataset generation.
- No secrets access.
- No PureLab content inspection.
- No file moves.
- No file copy, rename, delete, archive, cleanup, hash calculation, recursive size calculation, Git command, Godot command, test command, latest manifest creation, run folder creation, model/checkpoint creation, or model promotion.

## Command used

```powershell
if (Test-Path 'C:/TACTICAL_CHESS_STUDIO/models') { Get-ChildItem -LiteralPath 'C:/TACTICAL_CHESS_STUDIO/models' -Force | Select-Object Name, FullName, PSIsContainer, LastWriteTime }
```

Constraints enforced:

- `-Recurse` was not used.
- `Get-Content` was not run on model/checkpoint files.
- Models were not loaded, evaluated, benchmarked, created, or promoted.
- Checkpoints were not created or promoted.
- Training was not run.
- Dataset generation was not run.
- Hashes and recursive sizes were not calculated.
- Secrets and PureLab paths were not inspected.

## Models path result

- Path: `C:/TACTICAL_CHESS_STUDIO/models`
- Exists: true
- Top-level entries observed: 3
- Inspection depth: one bounded level only
- Model/checkpoint content read: none
- Model loading: none
- Benchmark or evaluation: none
- Model/checkpoint creation or promotion: none

## Entries observed

| name | path | is_directory | last_write_time | initial_classification | evidence_type | human_gate_question |
| --- | --- | --- | --- | --- | --- | --- |
| `chess` | `C:/TACTICAL_CHESS_STUDIO/models/chess` | true | 2026-05-16 13:09:08 | model_candidate | name/path/type/last_write_time only | Is this a passive chess model area, and should any future review remain names-only unless HumanGate authorizes a model-specific static inventory? |
| `lmstudio` | `C:/TACTICAL_CHESS_STUDIO/models/lmstudio` | true | 2026-05-20 04:52:44 | embedding_or_vector_candidate | name/path/type/last_write_time only | Does this contain LM Studio model material, embeddings, vectors, or local model assets that must remain blocked from loading and benchmarking? |
| `quarantine` | `C:/TACTICAL_CHESS_STUDIO/models/quarantine` | true | 2026-05-16 13:09:08 | archive_model_candidate | name/path/type/last_write_time only | Is this quarantined model/checkpoint material that should remain blocked_do_not_touch until HumanGate defines preservation and review rules? |

All classifications are initial, names-only, and candidate-only. If uncertain, classification remains UNKNOWN or candidate-only and requires HumanGate review.

## Initial classification

| classification | entries | basis |
| --- | --- | --- |
| model_candidate | `chess` | Name suggests model material related to chess; no contents were inspected or loaded. |
| checkpoint_candidate | none observed | No top-level name clearly indicated checkpoint material from name/type evidence only. |
| embedding_or_vector_candidate | `lmstudio` | Name suggests local model tooling or assets; no model loading, file content read, or embedding/vector inspection occurred. |
| archive_model_candidate | `quarantine` | Name suggests quarantine or preservation boundary; no archive action is authorized. |
| unknown_model_candidate | none observed | Current top-level names allowed candidate labels, but labels remain name-only. |
| blocked_do_not_touch | none observed | No top-level name was promoted to blocked_do_not_touch from name alone; loading, content read, promotion, and mutation remain globally blocked. |

## Unknowns and HumanGate questions

- Which model candidate directories are privacy-sensitive, license-sensitive, security-sensitive, or blocked_do_not_touch before any content review?
- Should `lmstudio` be handled under a local-model-specific HumanGate task before any deeper inspection?
- Should `quarantine` remain fully blocked from content read, model loading, and cleanup by default?
- Does `chess` contain model/checkpoint assets, configuration, or passive placeholders?
- Should any future model audit remain names-only, or allow a narrowly scoped metadata-only inspection?
- Should the next step consolidate datasets/models truth, or pause for HumanGate review before any deeper data/model audit?

## What was not inspected

- No model/checkpoint contents were read.
- No model was loaded.
- No model evaluation was run.
- No benchmark was run.
- No model benchmark was run.
- No model or checkpoint was created.
- No model or checkpoint was promoted.
- No child directory contents were inspected.
- No recursive scan was performed.
- No hashes were calculated.
- No recursive sizes were calculated.
- No training was run.
- No dataset generation was run.
- No secrets path was inspected; the secrets path was not inspected.
- No TacticalChessPureLab repo contents were inspected.
- No files under `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab` were read, listed, modified, copied, moved, renamed, deleted, or executed.
- No Godot `.gd` or `.tscn` files were inspected or modified.
- No Git status, Git history, tests, builds, latest manifests, run folders, datasets, models, or checkpoints were generated.

## Blocked actions

```yaml
file_move: BLOCKED
file_delete: BLOCKED
file_rename: BLOCKED
file_copy: BLOCKED
recursive_scan: BLOCKED
content_read: BLOCKED
model_loading: BLOCKED
model_evaluation: BLOCKED
benchmark: BLOCKED
model_or_checkpoint_creation: BLOCKED
model_promotion: BLOCKED
checkpoint_promotion: BLOCKED
training: BLOCKED
dataset_generation: BLOCKED
dataset_reset: BLOCKED
secrets_access: BLOCKED
repo_scan: BLOCKED
runtime_change: BLOCKED
agent_activation: BLOCKED
latest_manifest_creation: BLOCKED
run_folder_creation: BLOCKED
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

Recommended next option: consolidate datasets/models truth into a short HumanGate decision map before any deeper data or model audit.

If HumanGate wants another names-only slice first, a narrow tools top-level audit may help clarify tool/model boundaries before any `lmstudio` or model-specific review.

## Status by surface

| Surface | Status | Notes |
| --- | --- | --- |
| active_runtime_code | PASSIVE | Not inspected, modified, executed, or authorized. |
| tests | PASSIVE | Not inspected, modified, or run. |
| artifacts_runtime_outputs | PASSIVE | Model names were observed as candidate model/checkpoint surfaces only; no content read, load, benchmark, creation, or promotion occurred. |
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

Evidence is limited to exact preflight path checks, explicit source readback, the allowed top-level `Get-ChildItem` command for `models`, this report write, and docs-only readback validation. It does not include model/checkpoint-content evidence, recursive model evidence, model quality evidence, benchmark evidence, evaluation evidence, loading evidence, secrets evidence, PureLab evidence, Godot evidence, Git evidence, runtime evidence, test evidence, training evidence, dataset evidence, generated-model evidence, or checkpoint evidence.

## Claim verdict

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

Claim posture remains `NO_CLAIM_ALLOWED`. This report claims only that a top-level names-only read-only audit of `models` was performed and documented under the routed roadmap destination.

## No global ready verdict

no_global_ready_verdict: true

No global ready or not-ready verdict is made. Verdicts are split by surface only.
