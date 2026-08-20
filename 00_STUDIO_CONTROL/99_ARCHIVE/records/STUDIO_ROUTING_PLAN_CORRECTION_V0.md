# Studio Routing Plan Correction V0

Status: DOCUMENTED_ONLY
Surface: canonical_docs
Scope: correction record for Studio routing plan materials
Runtime authority: BLOCKED
Agent activation: BLOCKED
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation: BLOCKED
Dataset reset: BLOCKED
Model promotion: BLOCKED
Claim posture: NO_CLAIM_ALLOWED

---

## 1. Purpose

This record corrects the prior Studio cleanup and routing plan so future implementation materials comply with the Studio AutoDev and GPT Navigator doctrine.

This is a bounded documentation and tooling correction record. It does not authorize physical cleanup, file moves, file deletion, archival, runtime implementation, training, benchmarks, dataset generation or reset, model or checkpoint creation, model promotion, agent activation, Chess960 activation, DecisionController activation, commits, pushes, branch creation, or pull request creation.

No global ready or not-ready verdict is allowed. All verdicts must be split by surface.

---

## 2. Approved Status Values

Canonical records created from this plan may use only these status values:

```text
IMPLEMENTED
TESTED
DOCUMENTED_ONLY
PASSIVE
BLOCKED
NOT_FOUND
UNKNOWN
```

Any non-approved status value is BLOCKED in canonical records.

---

## 3. Output Routing

```yaml
output_routing:
  produced_file_type: "studio_status_correction_record"
  intended_surface: "canonical_docs"
  canonical_destination: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/STUDIO_ROUTING_PLAN_CORRECTION_V0.md"
  temporary_destination: ""
  forbidden_destinations:
    - "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL"
    - "**/SOURCE_IMPORTS/**"
    - "**/LOCAL_ARCHIVE/**"
    - "**/BACKUPS/**"
    - "**/lab/**"
    - "**/latest.json"
    - "**/lab/runs/RUN_*"
    - "C:/TACTICAL_CHESS_STUDIO/datasets"
    - "C:/TACTICAL_CHESS_STUDIO/models"
  registration_required: true
  project_source_upload_required: false
  retention_policy: "canonical status record until superseded"
  promotion_gate: "HumanGate"
```

Template updates are routed to:

```yaml
output_routing:
  produced_file_type: "studio_autodev_template_update"
  intended_surface: "canonical_docs"
  canonical_destination: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS"
  temporary_destination: ""
  forbidden_destinations:
    - "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL"
    - "**/SOURCE_IMPORTS/**"
    - "**/LOCAL_ARCHIVE/**"
    - "**/BACKUPS/**"
    - "**/lab/**"
    - "**/latest.json"
    - "**/lab/runs/RUN_*"
    - "C:/TACTICAL_CHESS_STUDIO/datasets"
    - "C:/TACTICAL_CHESS_STUDIO/models"
  registration_required: true
  project_source_upload_required: false
  retention_policy: "canonical template until superseded"
  promotion_gate: "HumanGate"
```

The optional read-only routing guard is routed to:

```yaml
output_routing:
  produced_file_type: "read_only_local_routing_guard"
  intended_surface: "canonical_docs"
  canonical_destination: "C:/TACTICAL_CHESS_STUDIO/tools/scripts/check_studio_routing.py"
  temporary_destination: ""
  forbidden_destinations:
    - "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL"
    - "**/SOURCE_IMPORTS/**"
    - "**/LOCAL_ARCHIVE/**"
    - "**/BACKUPS/**"
    - "**/lab/**"
    - "**/latest.json"
    - "**/lab/runs/RUN_*"
    - "C:/TACTICAL_CHESS_STUDIO/datasets"
    - "C:/TACTICAL_CHESS_STUDIO/models"
  registration_required: false
  project_source_upload_required: false
  retention_policy: "read-only local routing guard"
  promotion_gate: "HumanGate"
```

---

## 4. Source Anchoring State

This correction preserves the Studio Source Anchoring rule:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

`source_read_route` is an extension field only. It is not a replacement for `output_routing`, and it does not override `STUDIO_SOURCE_ANCHORING_V0.md`.

Required source state reporting:

| Source | Created | Registered | Loaded | Enforced | Evidenced |
| --- | --- | --- | --- | --- | --- |
| `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab/AGENTS.md` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | TESTED |
| `docs/gpt-navigator/GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | TESTED |
| `docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | TESTED |
| `docs/gpt-navigator/GPT_NAVIGATOR_UPLOAD_CHECKLIST_V0.md` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | TESTED |
| `docs/gpt-navigator/GPT_NAVIGATOR_REPO_NOTICE_V0.md` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | TESTED |
| `docs/gpt-navigator/GPT_NAVIGATOR_PROJECT_INSTRUCTIONS_V0.md` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | TESTED |
| `00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | TESTED |
| `00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | TESTED |
| `00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | TESTED |
| `00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | TESTED |
| `00_STUDIO_CONTROL/07_FORMS/TASK_CHARTER_TEMPLATE_V0.yaml` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | TESTED |
| `00_STUDIO_CONTROL/07_FORMS/EXECUTOR_REPORT_TEMPLATE_V0.yaml` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | TESTED |
| `00_STUDIO_CONTROL/07_FORMS/ANALYSIS_AGENT_RECORD_TEMPLATE_V0.yaml` | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | IMPLEMENTED | TESTED |
| `00_STUDIO_CONTROL/05_STATUS/STUDIO_ROUTING_PLAN_CORRECTION_V0.md` | IMPLEMENTED | IMPLEMENTED | UNKNOWN | PASSIVE | TESTED |

```yaml
source_state:
  STUDIO_ROUTING_PLAN_CORRECTION_V0.md:
    created: IMPLEMENTED
    registered: IMPLEMENTED
    loaded: UNKNOWN
    enforced: PASSIVE
    evidenced: TESTED
```

Loaded means explicitly read in the active task or present in active project sources. For `STUDIO_ROUTING_PLAN_CORRECTION_V0.md`, loaded remains `UNKNOWN` for ChatGPT Project Source state unless a task separately inspects or proves that upload state. This record does not claim ChatGPT Project Source upload state.

---

## 5. Physical Migration Boundary

Physical migration is BLOCKED.

This correction authorizes only routed documentation/template updates and a read-only local routing guard. It does not authorize moving, renaming, deleting, archiving, or cleaning existing files.

First-pass allowed outputs:

- canonical status record under `00_STUDIO_CONTROL/05_STATUS`;
- template corrections under `00_STUDIO_CONTROL/07_FORMS`;
- read-only local routing guard under `tools/scripts`;
- passive inventory produced to stdout only.

---

## 6. Required Final Report Shape

Executor reports for this correction class must include:

- `preflight`
- `source_state`
- `route_check`
- `output_routing_result`
- `files_changed`
- `commands_run`
- `skipped_validation`
- `risks`
- `status_by_surface`
- `final_verdicts`
- `no_global_ready_verdict: true`

---

## 7. Status By Surface

```yaml
status_by_surface:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE
```

---

## 8. Final Verdicts

```yaml
final_verdicts:
  software_verdict:
    active_runtime_code: PASSIVE
    tests: PASSIVE
    artifacts_runtime_outputs: PASSIVE
    canonical_docs: DOCUMENTED_ONLY
    roadmap_docs_only: PASSIVE
    inference: PASSIVE
  evidence_verdict:
    active_runtime_code: PASSIVE
    tests: PASSIVE
    artifacts_runtime_outputs: PASSIVE
    canonical_docs: TESTED
    roadmap_docs_only: PASSIVE
    inference: PASSIVE
  claim_verdict:
    active_runtime_code: PASSIVE
    tests: PASSIVE
    artifacts_runtime_outputs: PASSIVE
    canonical_docs: DOCUMENTED_ONLY
    roadmap_docs_only: PASSIVE
    inference: PASSIVE
no_global_ready_verdict: true
```
