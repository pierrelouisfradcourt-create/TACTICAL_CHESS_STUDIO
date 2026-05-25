# STUDIOV2 ROOT FUSION MANIFEST V0

status: DOCUMENTED_ONLY
created_at: 2026-05-23
task: Root fusion migration manifest for studioV2 into `C:\TACTICAL_CHESS_STUDIO`
ROOT: `C:\TACTICAL_CHESS_STUDIO`
STAGING: `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2`
intended_final_root: `C:\TACTICAL_CHESS_STUDIO`
temporary_restored_source: `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2`
no_global_ready_verdict: true

## Runtime

| Field | Value |
| --- | --- |
| requested_model | GPT-5.5-Codex or strongest available Codex reasoning model |
| requested_reasoning_effort | high |
| actual_runtime | UNKNOWN exact model identifier |
| actual_runtime_evidence | Current session identifies as Codex coding agent; exact deployment/model identifier is not exposed. |
| runtime_status | BLOCKED for exact model claim only |

## Preflight

| Check | Result | Status |
| --- | --- | --- |
| ROOT exists | `Test-Path -LiteralPath 'C:\TACTICAL_CHESS_STUDIO'` returned `True`. | IMPLEMENTED |
| STAGING exists | `Test-Path -LiteralPath 'C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2'` returned `True`. | IMPLEMENTED |
| Root is intended final studioV2 root | Enforced by task instruction. | DOCUMENTED_ONLY |
| STAGING is temporary restored source/staging | Enforced by task instruction. | DOCUMENTED_ONLY |
| Read-only migration boundary | No migration, copy, deletion, move, install, test, or Git mutation was performed. | DOCUMENTED_ONLY |
| Secret boundary | `secrets` content was not listed, hashed, opened, copied, or inspected. | BLOCKED for secret-surface inventory details |
| Recovered/template boundary | No `Recovered_*` or installer-template material was used as active truth. | DOCUMENTED_ONLY |

## Route Check

| Item | Result | Status |
| --- | --- | --- |
| Output type | Status/migration manifest. | DOCUMENTED_ONLY |
| Required destination | `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\STUDIOV2_ROOT_FUSION_MANIFEST_V0.md` | DOCUMENTED_ONLY |
| Destination policy | `STUDIO_OUTPUT_ROUTING_POLICY_V0.md` routes status reports and topology migration status to `00_STUDIO_CONTROL\05_STATUS`. | IMPLEMENTED |
| Forbidden destinations avoided | No output was written into source, tests, lab, runtime outputs, archives, or repos. | IMPLEMENTED |
| Output path pre-check | `Test-Path` returned `False`; no existing same-name report was overwritten. | IMPLEMENTED |

## Classification Buckets

| Bucket | Surfaces |
| --- | --- |
| already_at_root | `.cargo`, `.github`, `AI_MEMORY`, `db`, `docs`, `MASTER_DOCS`, `ml`, `schemas`, `src`, `tests` |
| missing_at_root | `AGENTS.md`, `Cargo.lock`, `Cargo.toml`, `README.md`, `requirements.txt`, `requirements-control-plane.txt`, `SECURITY_AUTOMATION_AUDIT.md`, `SECURITY_BOUNDARY.md`, `THREAT_MODEL.md`, `viewer.html` |
| copied_but_unverified | None. Non-secret surfaces either compared equal, were missing at root, or were classified as collision/passive/should-not-migrate. |
| collision | `scripts` |
| should_not_migrate | `00_STUDIO_CONTROL`, `models`, `datasets`, `secrets`, `tools`, `document_work`, `repos` |
| passive_hold | `.studio_state`, `lab`, `memory_core`, `patches` |
| unknown_blocked | `secrets` inventory/hash details; any decision depending on exact secret contents, hidden runtime model identity, runtime/test validity, or Git provenance |

## Migration Manifest Table

| Surface | source_path | destination_path | source_exists | destination_exists | file_count_source | file_count_destination | hash_equal_if_applicable | recommended_action | risk | status |
| --- | --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- |
| `.cargo` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\.cargo` | `C:\TACTICAL_CHESS_STUDIO\.cargo` | true | true | 1 | 1 | TRUE | Hold; already byte-identical at root. | Low; config already duplicated at intended root. | DOCUMENTED_ONLY |
| `.github` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\.github` | `C:\TACTICAL_CHESS_STUDIO\.github` | true | true | 7 | 7 | TRUE | Hold; already byte-identical at root, do not run CI or Git mutation. | Medium; workflows are present but execution/versioning remains out of scope. | DOCUMENTED_ONLY |
| `.studio_state` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\.studio_state` | `C:\TACTICAL_CHESS_STUDIO\.studio_state` | true | true | 2 | 2 | TRUE | Passive hold at root; do not promote as active truth without HumanGate. | Medium; local state may be stale or machine-specific. | PASSIVE |
| `AGENTS.md` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\AGENTS.md` | `C:\TACTICAL_CHESS_STUDIO\AGENTS.md` | true | false | 1 | 0 | NOT_APPLICABLE_MISSING_PATH | Candidate root-copy in a future bounded patch after HumanGate. | Medium; root lacks agent instructions for fused layout. | NOT_FOUND |
| `AI_MEMORY` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\AI_MEMORY` | `C:\TACTICAL_CHESS_STUDIO\AI_MEMORY` | true | true | 1 | 1 | TRUE | Hold; already byte-identical, keep passive. | Medium; memory surfaces are not source truth by default. | PASSIVE |
| `Cargo.lock` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\Cargo.lock` | `C:\TACTICAL_CHESS_STUDIO\Cargo.lock` | true | false | 1 | 0 | NOT_APPLICABLE_MISSING_PATH | Candidate root-copy with `Cargo.toml` in future bounded patch. | High; root Rust project identity incomplete without lockfile. | NOT_FOUND |
| `Cargo.toml` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\Cargo.toml` | `C:\TACTICAL_CHESS_STUDIO\Cargo.toml` | true | false | 1 | 0 | NOT_APPLICABLE_MISSING_PATH | Candidate root-copy with `Cargo.lock` in future bounded patch. | High; root Rust project identity incomplete without manifest. | NOT_FOUND |
| `db` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\db` | `C:\TACTICAL_CHESS_STUDIO\db` | true | true | 9 | 9 | TRUE | Hold; already byte-identical at root. | Low; migrations already present, execution not validated. | DOCUMENTED_ONLY |
| `docs` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\docs` | `C:\TACTICAL_CHESS_STUDIO\docs` | true | true | 210 | 210 | TRUE | Hold; already byte-identical at root. | Medium; docs may contain stale snapshots and remain docs-only unless promoted. | DOCUMENTED_ONLY |
| `lab` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\lab` | `C:\TACTICAL_CHESS_STUDIO\lab` | true | true | 375 | 375 | TRUE | Passive hold; do not treat lab outputs as active truth. | Medium; lab/runtime artifacts require explicit promotion. | PASSIVE |
| `MASTER_DOCS` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\MASTER_DOCS` | `C:\TACTICAL_CHESS_STUDIO\MASTER_DOCS` | true | true | 58 | 58 | TRUE | Hold; already byte-identical at root. | Medium; roadmap material remains documented-only. | DOCUMENTED_ONLY |
| `memory_core` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\memory_core` | `C:\TACTICAL_CHESS_STUDIO\memory_core` | true | true | 5 | 5 | TRUE | Passive hold; do not promote memory as active truth. | Medium; memory state can be stale or contextual. | PASSIVE |
| `ml` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\ml` | `C:\TACTICAL_CHESS_STUDIO\ml` | true | true | 23 | 23 | TRUE | Hold; already byte-identical, no training/inference activation. | Medium; ML tooling exists but activation is blocked. | DOCUMENTED_ONLY |
| `patches` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\patches` | `C:\TACTICAL_CHESS_STUDIO\patches` | true | true | 1 | 1 | TRUE | Passive hold; do not apply automatically. | Medium; patch artifacts are not active truth without review. | PASSIVE |
| `README.md` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\README.md` | `C:\TACTICAL_CHESS_STUDIO\README.md` | true | false | 1 | 0 | NOT_APPLICABLE_MISSING_PATH | Candidate root-copy in future bounded patch. | High; root lacks project entrypoint/readme. | NOT_FOUND |
| `requirements.txt` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\requirements.txt` | `C:\TACTICAL_CHESS_STUDIO\requirements.txt` | true | false | 1 | 0 | NOT_APPLICABLE_MISSING_PATH | Candidate root-copy in future bounded patch. | Medium; root Python dependency declaration missing. | NOT_FOUND |
| `requirements-control-plane.txt` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\requirements-control-plane.txt` | `C:\TACTICAL_CHESS_STUDIO\requirements-control-plane.txt` | true | false | 1 | 0 | NOT_APPLICABLE_MISSING_PATH | Candidate root-copy in future bounded patch. | Medium; control-plane dependency declaration missing. | NOT_FOUND |
| `schemas` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\schemas` | `C:\TACTICAL_CHESS_STUDIO\schemas` | true | true | 35 | 35 | TRUE | Hold; already byte-identical at root. | Low; schemas are passive contracts unless enforced separately. | DOCUMENTED_ONLY |
| `scripts` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\scripts` | `C:\TACTICAL_CHESS_STUDIO\scripts` | true | true | 93 | 1 | FALSE | Collision; require HumanGate decision before bounded merge. Preserve root-only `scripts\security_supplychain_audit.ps1`. | High; blind copy would overwrite or bury a root-only security script. | BLOCKED |
| `src` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\src` | `C:\TACTICAL_CHESS_STUDIO\src` | true | true | 136 | 136 | TRUE | Hold; already byte-identical at root. | Medium; code presence is not compile/test proof. | DOCUMENTED_ONLY |
| `tests` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\tests` | `C:\TACTICAL_CHESS_STUDIO\tests` | true | true | 57 | 57 | TRUE | Hold; already byte-identical at root. | Medium; tests were inventoried but not run. | DOCUMENTED_ONLY |
| `SECURITY_AUTOMATION_AUDIT.md` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\SECURITY_AUTOMATION_AUDIT.md` | `C:\TACTICAL_CHESS_STUDIO\SECURITY_AUTOMATION_AUDIT.md` | true | false | 1 | 0 | NOT_APPLICABLE_MISSING_PATH | Candidate root-copy in future bounded security-doc patch. | Medium; security audit doc missing at root. | NOT_FOUND |
| `SECURITY_BOUNDARY.md` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\SECURITY_BOUNDARY.md` | `C:\TACTICAL_CHESS_STUDIO\SECURITY_BOUNDARY.md` | true | false | 1 | 0 | NOT_APPLICABLE_MISSING_PATH | Candidate root-copy in future bounded security-doc patch. | High; root lacks repo-local security boundary. | NOT_FOUND |
| `THREAT_MODEL.md` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\THREAT_MODEL.md` | `C:\TACTICAL_CHESS_STUDIO\THREAT_MODEL.md` | true | false | 1 | 0 | NOT_APPLICABLE_MISSING_PATH | Candidate root-copy in future bounded security-doc patch. | Medium; root lacks threat model. | NOT_FOUND |
| `viewer.html` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\viewer.html` | `C:\TACTICAL_CHESS_STUDIO\viewer.html` | true | false | 1 | 0 | NOT_APPLICABLE_MISSING_PATH | Candidate root-copy in future bounded patch. | Medium; root viewer entrypoint missing. | NOT_FOUND |
| `00_STUDIO_CONTROL` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\00_STUDIO_CONTROL` | `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL` | false | true | 0 | 160 | NOT_APPLICABLE_MISSING_PATH | Do not migrate from staging; keep root control room as local-only authority. | High; copying control docs from staging would create authority confusion. | PASSIVE |
| `models` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\models` | `C:\TACTICAL_CHESS_STUDIO\models` | false | true | 0 | 2 | NOT_APPLICABLE_SKIPPED_BY_SCOPE | Should not migrate from staging; hold root models passive. | High; model/checkpoint promotion is blocked. | PASSIVE |
| `datasets` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\datasets` | `C:\TACTICAL_CHESS_STUDIO\datasets` | false | true | 0 | 0 | NOT_APPLICABLE_SKIPPED_BY_SCOPE | Should not migrate from staging; keep dataset generation/reset blocked. | High; dataset surfaces require explicit routing and provenance. | PASSIVE |
| `secrets` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\secrets` | `C:\TACTICAL_CHESS_STUDIO\secrets` | false | true | BLOCKED_SECRET_BOUNDARY | BLOCKED_SECRET_BOUNDARY | BLOCKED_SECRET_BOUNDARY | Do not migrate, list, hash, copy, or inspect. Require HumanGate for any secret decision. | Critical; secret inspection/copying is forbidden. | BLOCKED |
| `tools` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\tools` | `C:\TACTICAL_CHESS_STUDIO\tools` | false | true | 0 | 22 | NOT_APPLICABLE_MISSING_PATH | Do not migrate from staging; root tool surface needs separate registry decision if retained. | Medium; orphan tool surface was previously classified UNKNOWN/PASSIVE. | PASSIVE |
| `document_work` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\document_work` | `C:\TACTICAL_CHESS_STUDIO\document_work` | false | true | 0 | 17 | NOT_APPLICABLE_MISSING_PATH | Do not migrate from staging; hold as artifact work area pending routing. | Medium; orphan output surface should not be promoted silently. | PASSIVE |
| `repos` | `C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\repos` | `C:\TACTICAL_CHESS_STUDIO\repos` | false | true | 0 | 2218 | NOT_APPLICABLE_MISSING_PATH | Do not fuse nested repos into root; keep as workspace/repo container. | High; previous split architecture is not final physical truth unless separately evidenced. | PASSIVE |

## Status By Surface

| Surface Group | Status | Evidence |
| --- | --- | --- |
| active_runtime_code | DOCUMENTED_ONLY | `src` exists at root, 136 files, byte-identical to staging; no build/test run. |
| tests | DOCUMENTED_ONLY | `tests` exists at root, 57 files, byte-identical to staging; tests were not run. |
| canonical_docs | DOCUMENTED_ONLY | `docs`, `MASTER_DOCS`, and routed control sources were read/inventoried; missing root entrypoint docs remain NOT_FOUND. |
| roadmap_docs_only | PASSIVE | Roadmap docs remain docs-only; no promotion. |
| artifacts_runtime_outputs | PASSIVE | `lab`, `document_work`, models/datasets-like surfaces are passive or should-not-migrate. |
| inference | PASSIVE | ML/memory surfaces are present or held but not activated. |
| secret_surface | BLOCKED | Secret details intentionally not inspected. |
| git_routing | DOCUMENTED_ONLY | Root branch `master`; `repos/` is ignored by `.gitignore:14`; no Git mutation. |

## Blocked Decisions

| Decision | Status | Reason |
| --- | --- | --- |
| Exact runtime model claim | BLOCKED | Exact Codex deployment/model identifier is not exposed. |
| Secret migration or inventory | BLOCKED | Secret boundary forbids printing, copying, archiving, or inspecting secrets. |
| `scripts` fusion | BLOCKED | Root has a root-only security script while staging has 93 different script files; merge policy requires HumanGate. |
| STAGING cleanup | BLOCKED | Task explicitly says not to recommend deleting STAGING; cleanup, if needed, must be HOLD rename only. |
| Git tracking/versioning | BLOCKED | Git mutation was out of scope; root `repos/` ignore remains policy evidence only. |
| Runtime/test readiness | BLOCKED | No tests, installs, compilation, or runtime validation were performed. |
| Models/datasets promotion | BLOCKED | Training, model/checkpoint creation or promotion, and dataset generation/reset are out of scope. |

## Recommended Next Patch Scope

1. HumanGate-authorized bounded root-copy patch for missing root files only: `AGENTS.md`, `Cargo.toml`, `Cargo.lock`, `README.md`, `requirements.txt`, `requirements-control-plane.txt`, `SECURITY_AUTOMATION_AUDIT.md`, `SECURITY_BOUNDARY.md`, `THREAT_MODEL.md`, and `viewer.html`.
2. Separate HumanGate decision for `scripts`: merge staging scripts without overwriting root-only `scripts\security_supplychain_audit.ps1`, or route the root security script elsewhere first.
3. Keep `lab`, `.studio_state`, `AI_MEMORY`, `memory_core`, `patches`, `models`, `datasets`, `tools`, `document_work`, and `repos` on passive hold unless a narrower task promotes a specific surface.
4. Do not delete STAGING. If cleanup is later required, use a HOLD rename plan only after a separate manifest and HumanGate authorization.

## Skipped Validation

| Validation | Status | Reason |
| --- | --- | --- |
| Copy/migration dry run | BLOCKED | No copying or migration commands allowed. |
| Runtime tests | BLOCKED | `cargo test` and `pytest` are forbidden by task. |
| Dependency install | BLOCKED | Installs are forbidden by task. |
| Secret inventory/hash | BLOCKED | Secret boundary forbids inspection. |
| Model/dataset hash validation | BLOCKED | Should-not-migrate surfaces; no promotion or deep validation. |
| Git mutation | BLOCKED | `git add`, `commit`, `init`, and `reset` are forbidden by task. |

## Risks

| Risk | Surface | Status | Mitigation |
| --- | --- | --- | --- |
| Root is partially fused but missing root project entrypoint files. | root files | NOT_FOUND | Future bounded copy patch for missing files only. |
| `scripts` has a real collision. | scripts | BLOCKED | HumanGate merge decision; preserve root-only security script. |
| Root control room is local-only and should not be confused with staging truth. | `00_STUDIO_CONTROL` | PASSIVE | Keep root control docs in place; do not import control docs from staging. |
| Secrets exist at root but cannot be inspected. | `secrets` | BLOCKED | No secret handling without HumanGate. |
| Root Git sees many fused root surfaces as untracked. | git_routing | DOCUMENTED_ONLY | No Git action in this task; separate policy required. |
| Hash equality proves byte identity only, not functional validity. | code/tests/docs | DOCUMENTED_ONLY | Separate validation task required after migration decisions. |

## Commands Run

| Command | Working directory | Purpose | Result status |
| --- | --- | --- | --- |
| `Test-Path -LiteralPath 'C:\TACTICAL_CHESS_STUDIO'` | `C:\TACTICAL_CHESS_STUDIO` | Confirm ROOT exists. | IMPLEMENTED |
| `Test-Path -LiteralPath 'C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2'` | `C:\TACTICAL_CHESS_STUDIO` | Confirm STAGING exists. | IMPLEMENTED |
| `Get-Content -LiteralPath ...READ_FIRST.md` | `C:\TACTICAL_CHESS_STUDIO` | Load control entrypoint. | DOCUMENTED_ONLY |
| `Get-Content -LiteralPath ...STUDIO_OUTPUT_ROUTING_POLICY_V0.md` | `C:\TACTICAL_CHESS_STUDIO` | Load routing policy. | DOCUMENTED_ONLY |
| `Get-Content -LiteralPath ...STUDIO_SOURCE_ANCHORING_V0.md` | `C:\TACTICAL_CHESS_STUDIO` | Load source anchoring rules. | DOCUMENTED_ONLY |
| `Get-Content -LiteralPath ...PATH_BOUNDARY.md` | `C:\TACTICAL_CHESS_STUDIO` | Load path boundary. | DOCUMENTED_ONLY |
| `Get-Content -LiteralPath ...REPO_HYGIENE.md` | `C:\TACTICAL_CHESS_STUDIO` | Load repo hygiene boundary. | DOCUMENTED_ONLY |
| `Get-Content -LiteralPath ...SECRET_BOUNDARY.md` | `C:\TACTICAL_CHESS_STUDIO` | Load secret boundary policy. | DOCUMENTED_ONLY |
| `Get-Content -LiteralPath ...EXECUTOR_REPORT_TEMPLATE_V0.yaml` | `C:\TACTICAL_CHESS_STUDIO` | Load report template. | DOCUMENTED_ONLY |
| `Get-Content -LiteralPath ...STUDIOV2_FULL_TRUTH_AUDIT_V0.md` | `C:\TACTICAL_CHESS_STUDIO` | Load active audit report. | DOCUMENTED_ONLY |
| `Get-ChildItem` / `Get-FileHash` inventory script over named non-secret surfaces | `C:\TACTICAL_CHESS_STUDIO` | Count files and compare source/destination hashes. | DOCUMENTED_ONLY |
| `git status --short --branch` | `C:\TACTICAL_CHESS_STUDIO` | Read-only Git status. | DOCUMENTED_ONLY |
| `git check-ignore -v repos/games/studioV2/Cargo.toml` | `C:\TACTICAL_CHESS_STUDIO` | Confirm staging ignore policy. | DOCUMENTED_ONLY |
| `Test-Path -LiteralPath 'C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\STUDIOV2_ROOT_FUSION_MANIFEST_V0.md'` | `C:\TACTICAL_CHESS_STUDIO` | Check output collision before report creation. | IMPLEMENTED |
| `Get-ChildItem -LiteralPath 'C:\TACTICAL_CHESS_STUDIO\scripts' -Recurse -File -Force` | `C:\TACTICAL_CHESS_STUDIO` | Inspect root `scripts` collision shape. | DOCUMENTED_ONLY |
| `Test-Path -LiteralPath 'C:\TACTICAL_CHESS_STUDIO\repos\games\studioV2\scripts\security_supplychain_audit.ps1'` | `C:\TACTICAL_CHESS_STUDIO` | Confirm root-only colliding script is absent from staging scripts. | DOCUMENTED_ONLY |

All read-only shell commands required escalation because the Windows sandbox setup failed before PowerShell execution. No forbidden command was run.

## Files Changed

| Path | Operation | Surface | Status |
| --- | --- | --- | --- |
| `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\05_STATUS\STUDIOV2_ROOT_FUSION_MANIFEST_V0.md` | created | status/migration manifest | DOCUMENTED_ONLY |

No source, test, lab, runtime output, staging, secret, Git, dependency, or migration surface was changed.
