# Docs Kenpachi Duplicate Route Audit V0

task_id: DOCS-KENPACHI-DUPLICATE-ROUTE-001
status: DOCUMENTED_ONLY
surface: artifacts_runtime_outputs
owner: HumanGate
claim_posture: NO_CLAIM_ALLOWED
no_global_ready_verdict: true

## executive_summary

This is a read-only duplicate route audit for the exact duplicate pair:

- `docs/control-plane/KENPACHI_CODEX_LOCAL_PARAMETERS.md`
- `00_STUDIO_CONTROL/06_CODEX/KENPACHI_CODEX_LOCAL_PARAMETERS.md`

Both files exist, have identical size, have identical SHA256 hash, and have no content diff by `git diff --no-index`.

Recommended canonical route:

- `00_STUDIO_CONTROL/06_CODEX/KENPACHI_CODEX_LOCAL_PARAMETERS.md`

Reason:

- `00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` routes Codex operating docs to `00_STUDIO_CONTROL/06_CODEX`.
- The file body is a Codex local startup parameter sheet for the Kenpachi workstation.
- `docs/control-plane/` is a broader repo control-plane documentation surface, while this duplicate is specifically a Codex operating/local-parameter document.

No delete, move, rename, archive creation, existing-doc edit, registry edit, source-index edit, commit, push, branch, PR, runtime command, test, training, or benchmark was performed.

## preflight

codex_runtime:

- requested_model: gpt-5.5
- requested_reasoning_effort: medium
- task_class: repo_audit
- actual_runtime: UNKNOWN
- runtime_status: BLOCKED
- runtime_claim_rule: Do not claim exact runtime unless exposed.

repository:

- pwd: `C:\TACTICAL_CHESS_STUDIO`
- git_toplevel: `C:/TACTICAL_CHESS_STUDIO`
- branch: `master`
- head: `82d07447022d2963964ef9589b38ecc986751c4f`
- worktree_status_before_report: PASSIVE
- pre_existing_changes:
  - `?? scripts/uxpilote/`

scope notes:

- `scripts/uxpilote/`: UNKNOWN, out of scope, not inspected.
- Target report existed before task: `False`

## source_state

created:

- `00_STUDIO_CONTROL/05_STATUS/DOCS_KENPACHI_DUPLICATE_ROUTE_AUDIT_V0.md`: DOCUMENTED_ONLY

registered:

- New audit report: NOT_FOUND
- `docs/control-plane/KENPACHI_CODEX_LOCAL_PARAMETERS.md`: NOT_FOUND in `FILE_REGISTRY.yaml` by exact-name search.
- `00_STUDIO_CONTROL/06_CODEX/KENPACHI_CODEX_LOCAL_PARAMETERS.md`: NOT_FOUND in `FILE_REGISTRY.yaml` by exact-name search.
- Both target paths: NOT_FOUND in `GPT_NAVIGATOR_SOURCE_INDEX_V0.md` by exact-name search.
- Registration edits were BLOCKED by task scope.

loaded:

- `AGENTS.md`: DOCUMENTED_ONLY, read by `Get-Content`.
- `00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md`: DOCUMENTED_ONLY, read by `Get-Content`.
- `00_STUDIO_CONTROL/03_REGISTRIES/FILE_REGISTRY.yaml`: DOCUMENTED_ONLY, read by `Get-Content`.
- `docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md`: DOCUMENTED_ONLY, read by `Get-Content`.
- `00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md`: DOCUMENTED_ONLY, read by `Get-Content`.
- `docs/control-plane/KENPACHI_CODEX_LOCAL_PARAMETERS.md`: DOCUMENTED_ONLY, read by `Get-Content`.
- `00_STUDIO_CONTROL/06_CODEX/KENPACHI_CODEX_LOCAL_PARAMETERS.md`: DOCUMENTED_ONLY, read by `Get-Content`.

enforced:

- Output route for this audit report was enforced by writing only `00_STUDIO_CONTROL/05_STATUS/DOCS_KENPACHI_DUPLICATE_ROUTE_AUDIT_V0.md`: DOCUMENTED_ONLY.
- Existing target documents were not edited: BLOCKED.
- Delete, move, rename, archive creation, registry/source-index edits, commit, push, branch, PR, runtime commands, tests, training, and benchmarks remained BLOCKED.

evidenced:

- Preflight, read-first load, target readback, size/hash/content comparison, route recommendation, validation, and final worktree status are recorded in this report: DOCUMENTED_ONLY.

Core rule preserved:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

## duplicate_pair_evidence

| path | status | size_bytes | sha256 |
| --- | --- | ---: | --- |
| `docs/control-plane/KENPACHI_CODEX_LOCAL_PARAMETERS.md` | DOCUMENTED_ONLY | 5274 | `EB6901A533526E8B24988206F4BEF6DA8A814F001B2A7923DC2066A1B4516986` |
| `00_STUDIO_CONTROL/06_CODEX/KENPACHI_CODEX_LOCAL_PARAMETERS.md` | DOCUMENTED_ONLY | 5274 | `EB6901A533526E8B24988206F4BEF6DA8A814F001B2A7923DC2066A1B4516986` |

Comparison result:

- size_match: true
- hash_match: true
- content_diff: NOT_FOUND by `git diff --no-index -- docs/control-plane/KENPACHI_CODEX_LOCAL_PARAMETERS.md 00_STUDIO_CONTROL/06_CODEX/KENPACHI_CODEX_LOCAL_PARAMETERS.md`
- duplicate_class: exact_duplicate

## route_check

Target document type:

- Codex local startup parameters for the Kenpachi workstation.

Candidate route: `docs/control-plane/KENPACHI_CODEX_LOCAL_PARAMETERS.md`

- surface: canonical_docs or reference control-plane docs candidate.
- route_fit: WEAK
- reason: `docs/control-plane/` is a broad repo control-plane documentation area. The exact file is not listed in the GPT Navigator source index by exact-name search and is not registered in the Studio file registry by exact-name search.

Candidate route: `00_STUDIO_CONTROL/06_CODEX/KENPACHI_CODEX_LOCAL_PARAMETERS.md`

- surface: canonical_docs candidate inside local Studio Control.
- route_fit: STRONG
- reason: `STUDIO_OUTPUT_ROUTING_POLICY_V0.md` states Codex operating docs belong in `00_STUDIO_CONTROL/06_CODEX`.
- recommendation: KEEP_CANONICAL_ROUTE_PENDING_HUMANGATE

Recommendation:

- canonical_route: `00_STUDIO_CONTROL/06_CODEX/KENPACHI_CODEX_LOCAL_PARAMETERS.md`
- duplicate_route_to_demote_after_HumanGate: `docs/control-plane/KENPACHI_CODEX_LOCAL_PARAMETERS.md`
- action_now: DOCUMENTED_ONLY; no deletion, move, rename, archive, or edit.

## output_routing_result

- produced_file_type: read_only_duplicate_route_audit
- intended_surface: artifacts_runtime_outputs
- actual_destination: `00_STUDIO_CONTROL/05_STATUS/DOCS_KENPACHI_DUPLICATE_ROUTE_AUDIT_V0.md`
- promotion_gate: HumanGate
- retention_policy: passive audit evidence only; not canonical truth unless HumanGate promotes.
- registration_required_now: false by task scope.
- project_source_upload_required_now: false by task scope.

## files_changed

| path | surface | change_status | operation |
| --- | --- | --- | --- |
| `00_STUDIO_CONTROL/05_STATUS/DOCS_KENPACHI_DUPLICATE_ROUTE_AUDIT_V0.md` | artifacts_runtime_outputs | DOCUMENTED_ONLY | created |

Existing target documents were not modified.

## commands_run

Preflight:

- `Get-Location` -> DOCUMENTED_ONLY; returned `C:\TACTICAL_CHESS_STUDIO`.
- `git rev-parse --show-toplevel` -> DOCUMENTED_ONLY; returned `C:/TACTICAL_CHESS_STUDIO`.
- `git rev-parse --abbrev-ref HEAD` -> DOCUMENTED_ONLY; returned `master`.
- `git rev-parse HEAD` -> DOCUMENTED_ONLY; returned `82d07447022d2963964ef9589b38ecc986751c4f`.
- `git status --short --branch` -> DOCUMENTED_ONLY; returned `## master...origin/master` and pre-existing `?? scripts/uxpilote/`.

Read-first and target readback:

- `Get-Content AGENTS.md` -> DOCUMENTED_ONLY.
- `Get-Content 00_STUDIO_CONTROL/05_STATUS/DOCS_ROADMAP_ARCHITECTURE_CONSOLIDATION_AUDIT_V0.md` -> DOCUMENTED_ONLY.
- `Get-Content 00_STUDIO_CONTROL/03_REGISTRIES/FILE_REGISTRY.yaml` -> DOCUMENTED_ONLY.
- `Get-Content docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md` -> DOCUMENTED_ONLY.
- `Get-Content 00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` -> DOCUMENTED_ONLY.
- `Get-Content docs/control-plane/KENPACHI_CODEX_LOCAL_PARAMETERS.md` -> DOCUMENTED_ONLY.
- `Get-Content 00_STUDIO_CONTROL/06_CODEX/KENPACHI_CODEX_LOCAL_PARAMETERS.md` -> DOCUMENTED_ONLY.

Duplicate and registration checks:

- `Test-Path 00_STUDIO_CONTROL/05_STATUS/DOCS_KENPACHI_DUPLICATE_ROUTE_AUDIT_V0.md` -> DOCUMENTED_ONLY; returned `False` before creation.
- `Get-Item docs/control-plane/KENPACHI_CODEX_LOCAL_PARAMETERS.md` -> DOCUMENTED_ONLY; returned size `5274`.
- `Get-Item 00_STUDIO_CONTROL/06_CODEX/KENPACHI_CODEX_LOCAL_PARAMETERS.md` -> DOCUMENTED_ONLY; returned size `5274`.
- `Get-FileHash docs/control-plane/KENPACHI_CODEX_LOCAL_PARAMETERS.md` -> DOCUMENTED_ONLY; returned SHA256 `EB6901A533526E8B24988206F4BEF6DA8A814F001B2A7923DC2066A1B4516986`.
- `Get-FileHash 00_STUDIO_CONTROL/06_CODEX/KENPACHI_CODEX_LOCAL_PARAMETERS.md` -> DOCUMENTED_ONLY; returned SHA256 `EB6901A533526E8B24988206F4BEF6DA8A814F001B2A7923DC2066A1B4516986`.
- `Select-String -Path 00_STUDIO_CONTROL/03_REGISTRIES/FILE_REGISTRY.yaml -Pattern "KENPACHI_CODEX_LOCAL_PARAMETERS"` -> NOT_FOUND.
- `Select-String -Path docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md -Pattern "KENPACHI_CODEX_LOCAL_PARAMETERS"` -> NOT_FOUND.
- `git status --short -- docs/control-plane/KENPACHI_CODEX_LOCAL_PARAMETERS.md 00_STUDIO_CONTROL/06_CODEX/KENPACHI_CODEX_LOCAL_PARAMETERS.md 00_STUDIO_CONTROL/05_STATUS/DOCS_KENPACHI_DUPLICATE_ROUTE_AUDIT_V0.md` -> DOCUMENTED_ONLY; no target duplicate modifications before report creation.
- `git diff --no-index -- docs/control-plane/KENPACHI_CODEX_LOCAL_PARAMETERS.md 00_STUDIO_CONTROL/06_CODEX/KENPACHI_CODEX_LOCAL_PARAMETERS.md` -> DOCUMENTED_ONLY; exit code 0 and no diff output.
- `git status --short --branch` -> DOCUMENTED_ONLY; pre-report status still showed only pre-existing `?? scripts/uxpilote/`.

Validation:

- `Test-Path 00_STUDIO_CONTROL/05_STATUS/DOCS_KENPACHI_DUPLICATE_ROUTE_AUDIT_V0.md` -> DOCUMENTED_ONLY; returned `True`.
- `Get-Content 00_STUDIO_CONTROL/05_STATUS/DOCS_KENPACHI_DUPLICATE_ROUTE_AUDIT_V0.md -TotalCount 80` -> DOCUMENTED_ONLY; first 80 lines read back successfully.
- `git diff --check` -> DOCUMENTED_ONLY; no whitespace errors reported.
- `git status --short --branch` -> DOCUMENTED_ONLY; returned new report as untracked and pre-existing `scripts/uxpilote/` as untracked.

## validation

Expected level: DOCUMENTED_ONLY.

| command | result_status | evidence |
| --- | --- | --- |
| `Test-Path 00_STUDIO_CONTROL/05_STATUS/DOCS_KENPACHI_DUPLICATE_ROUTE_AUDIT_V0.md` | DOCUMENTED_ONLY | returned `True` |
| `Get-Content 00_STUDIO_CONTROL/05_STATUS/DOCS_KENPACHI_DUPLICATE_ROUTE_AUDIT_V0.md -TotalCount 80` | DOCUMENTED_ONLY | first 80 lines read back successfully |
| `git diff --check` | DOCUMENTED_ONLY | no whitespace errors reported |
| `git status --short --branch` | DOCUMENTED_ONLY | `?? 00_STUDIO_CONTROL/05_STATUS/DOCS_KENPACHI_DUPLICATE_ROUTE_AUDIT_V0.md`; pre-existing `?? scripts/uxpilote/` still present |

## skipped_validation

- Runtime commands: BLOCKED by task scope.
- Tests: BLOCKED by task scope.
- Benchmarks: BLOCKED by task scope.
- Training: BLOCKED by task scope.
- Dataset commands: BLOCKED by task scope.
- Existing-doc edit validation: BLOCKED because no existing docs were edited.
- Delete, move, rename, archive validation: BLOCKED because no such action was authorized or performed.
- `scripts/uxpilote/` inspection: BLOCKED by task scope; status UNKNOWN.

## risks

- Both duplicates contain old nested target path language: `C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab`. This audit did not edit it.
- Neither duplicate route was found in `FILE_REGISTRY.yaml` or `GPT_NAVIGATOR_SOURCE_INDEX_V0.md` by exact-name search. That is registration/listing evidence only, not proof of absence from every possible source system.
- Choosing `00_STUDIO_CONTROL/06_CODEX` as canonical is a route recommendation, not a performed promotion.
- The duplicate under `docs/control-plane/` remains on disk until HumanGate authorizes a separate action.
- Exact runtime model remains UNKNOWN.

## status_by_surface

| surface | status |
| --- | --- |
| active_runtime_code | PASSIVE |
| tests | PASSIVE |
| artifacts_runtime_outputs | DOCUMENTED_ONLY |
| canonical_docs | PASSIVE |
| roadmap_docs_only | PASSIVE |
| inference | PASSIVE |

## software_verdict

| surface | status |
| --- | --- |
| active_runtime_code | PASSIVE |
| tests | PASSIVE |
| artifacts_runtime_outputs | DOCUMENTED_ONLY |
| canonical_docs | PASSIVE |
| roadmap_docs_only | PASSIVE |
| inference | PASSIVE |

## evidence_verdict

| surface | status |
| --- | --- |
| active_runtime_code | PASSIVE |
| tests | PASSIVE |
| artifacts_runtime_outputs | DOCUMENTED_ONLY |
| canonical_docs | DOCUMENTED_ONLY |
| roadmap_docs_only | PASSIVE |
| inference | PASSIVE |

## claim_verdict

| surface | status |
| --- | --- |
| active_runtime_code | NO_CLAIM_ALLOWED |
| tests | NO_CLAIM_ALLOWED |
| artifacts_runtime_outputs | NO_CLAIM_ALLOWED |
| canonical_docs | NO_CLAIM_ALLOWED |
| roadmap_docs_only | NO_CLAIM_ALLOWED |
| inference | NO_CLAIM_ALLOWED |

## no_global_ready_verdict

true

No global ready or not-ready verdict is made.
