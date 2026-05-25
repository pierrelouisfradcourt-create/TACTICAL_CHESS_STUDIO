# REPO_HYGIENE

status: DOCUMENTED_ONLY

Active repo path:

```text
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\
```

## Rules

- No archives, datasets, models, or runs inside the active repo.
- No old venv, caches, builds, or logs copied into the active repo.
- No Git mutation unless explicitly authorized.
- No push, PR, or CI unless HumanGate authorizes it.
- Local 44 commits must be pushed or restored by verified bundle before Kenpachi clone can be trusted.
- `00_STUDIO_CONTROL/` is intentionally local-only and untracked by HumanGate decision; GitHub presence is not expected.

## Runtime Doctrine

- Rust is runtime truth.
- Python is ML, inference, and tooling.
- Search remains final authority.
- Neural proposes and reranks; it does not decide alone.

## Control Room Hygiene Report

A separate `REPO_HYGIENE_REPORT.md` was not created because this file already owns the routed hygiene boundary role and the noise gate blocks duplicate hygiene reports.

### Local-Only Control Room Policy

`00_STUDIO_CONTROL/` is the local-only control cockpit. Its Git policy is `LOCAL_ONLY_UNTRACKED`, GitHub presence is `NOT_EXPECTED` in prose, and its control-room status is `PASSIVE`.

`?? 00_STUDIO_CONTROL/` is `INFO_ONLY` and must not be reported as a critical sync defect. Local cleanliness is the target; GitHub sync is not required.

Do not git add, commit, push, branch, PR, or track `00_STUDIO_CONTROL/` unless HumanGate explicitly authorizes it later.

Strict hygiene still applies: duplicate docs, unregistered local control files, placeholder records, invalid statuses, runtime changes, test or CI changes, and model/dataset/LoRA changes are `BLOCKED`; missing owner, consumer, or route evidence is `UNKNOWN` and therefore blocked for actions.

### Duplicate Or Overlapping Docs

| Item | Evidence | Status | Action |
| --- | --- | --- | --- |
| Requested `CONTROL_ROOM.md` versus existing `00_INDEX/CONTROL_INDEX.md` | `CONTROL_INDEX.md` already owns the control entrypoint role. | BLOCKED | Update existing entrypoint instead of creating duplicate. |
| Requested `WORLD_MAP.md` versus existing `01_MAPS/STUDIO_MAP.md` | `STUDIO_MAP.md` already owns the world-map role. | BLOCKED | Update existing map instead of creating duplicate. |
| Requested `REPO_HYGIENE_REPORT.md` versus existing `04_BOUNDARIES/REPO_HYGIENE.md` | `REPO_HYGIENE.md` already owns hygiene rules. | BLOCKED | Update existing hygiene doc instead of creating duplicate. |

### Orphan Docs

| Path or identifier | Floating type | Current surface | Suspected role | Evidence | Recommended action | Allowed action now | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `document_work` | orphan_output | artifacts_runtime_outputs | document work area | Preflight git status showed untracked directory. | Register or quarantine only with HumanGate. | report_only | PASSIVE |
| `tools` | orphan_output | inference | helper scripts and recovery tools | Preflight git status showed untracked directory. | Register in tool registry if retained. | report_only | UNKNOWN |
| `00_STUDIO_CONTROL` | local_control_cockpit | canonical_docs | local-only Studio Control surface | Preflight git status shows untracked directory by HumanGate decision. | Keep local-only unless HumanGate explicitly authorizes tracking later. | report_only | PASSIVE |

### Orphan Outputs

| Path or identifier | Floating type | Current surface | Suspected role | Evidence | Recommended action | Allowed action now | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `outputs/security_pack/SECURITY_PACK_SECRETS_SUPPLYCHAIN.md` | orphan_output | artifacts_runtime_outputs | generated security report | Found by repo file listing; not changed by this task. | Register as passive artifact or leave unpromoted. | report_only | PASSIVE |
| `runtime_outputs` | orphan_output | artifacts_runtime_outputs | runtime outputs root | Root directory exists; not inspected or mutated. | Register output routing before use. | mark_UNKNOWN | UNKNOWN |

### Stale Or Unverified Docs

| Path or identifier | Floating type | Current surface | Suspected role | Evidence | Recommended action | Allowed action now | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `00_STUDIO_CONTROL/12_PIPELINE_OPENING_LEGACY` | stale_doc | canonical_docs | legacy pipeline opening trace | Routing policy marks this surface PASSIVE legacy traceability. | Keep passive unless HumanGate authorizes migration. | mark_PASSIVE | PASSIVE |
| Required GPT Navigator root sources | stale_doc | canonical_docs | expected project-source anchors | Exact-name search did not find root files. | Mark NOT_FOUND for this task. | mark_BLOCKED | NOT_FOUND |

### Roadmap Mixed With Canonical Docs

Roadmap material must stay in `00_STUDIO_CONTROL/10_ROADMAP` and remain `DOCUMENTED_ONLY`. `ROADMAP_INDEX.md` groups roadmap files and blocks runtime authority.

### Architecture Plans Without Index

Architecture material is indexed by `00_STUDIO_CONTROL/01_MAPS/ARCHITECTURE_PLANS_INDEX.md`. Unindexed future architecture docs are `BLOCKED` until routed and indexed.

### Agents Without Launch Card

Conversation-only agent names are `BLOCKED`. Agents must be present in `00_STUDIO_CONTROL/03_REGISTRIES/AGENT_REGISTRY.yaml` with reads, writes, forbidden actions, must-read sources, and blocked conditions before launch can even be considered.

### Loops Without Routes

Conversation-only loops are `BLOCKED`. Loops must be present in `00_STUDIO_CONTROL/03_REGISTRIES/LOOP_REGISTRY.yaml` with sequence, reads, writes, output routes, and blocked conditions.

### Floating Items

The floating-item definition is: an element present in the repo or workflow language that lacks route, owner, consumer, status, evidence, or declared reason for existence.

For registered control-room files, `00_STUDIO_CONTROL/03_REGISTRIES/FILE_REGISTRY.yaml` is the route, owner, consumer, status, and evidence authority when local file metadata is incomplete. Documentation, policy, registry, template, roadmap, and plan edits remain `DOCUMENTED_ONLY`; `IMPLEMENTED` requires active runtime code evidence, and `TESTED` requires validation or test evidence for the relevant surface.

Default handling is report-only. Deletion, movement, archiving, canonical rewrites, invented owners, invented consumers, and silent ignores are blocked.

### Noise Gate Blocks

- Creating duplicate `CONTROL_ROOM.md`: BLOCKED; updated `CONTROL_INDEX.md` instead.
- Creating duplicate `WORLD_MAP.md`: BLOCKED; updated `STUDIO_MAP.md` instead.
- Creating duplicate `REPO_HYGIENE_REPORT.md`: BLOCKED; updated `REPO_HYGIENE.md` instead.
- Treating `?? 00_STUDIO_CONTROL/` as a critical GitHub sync defect: BLOCKED; it is local-only, untracked, INFO_ONLY/PASSIVE by HumanGate decision.
- Git add, commit, push, branch, PR, or tracking for `00_STUDIO_CONTROL/`: BLOCKED unless HumanGate explicitly authorizes it later.
- Runtime activation, code edits, test edits, CI edits, model files, datasets, training, LoRA creation, dataset promotion, benchmark proof claims, and autonomous agent activation: BLOCKED.
