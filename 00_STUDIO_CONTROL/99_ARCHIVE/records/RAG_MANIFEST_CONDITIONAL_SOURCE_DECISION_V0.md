# RAG Manifest Conditional Source Decision V0

Status: DOCUMENTED_ONLY
Task ID: RAG-MANIFEST-CONDITIONAL-SOURCE-DECISION-048
Surface: canonical_docs
Owner: HumanGate
Runtime authority: NONE
Agent activation: BLOCKED
Training/benchmark/dataset/model: BLOCKED
Claim posture: NO_CLAIM_ALLOWED
No global ready verdict: true

## Purpose

Record the first HumanGate decision for the future RAG source-pack manifest conditional-source policy.

The first manifest policy is a minimal stable source pack. It includes only stable source buckets and defers untracked conditional sources until a later HumanGate decision tracks, archives, or explicitly allows local-only source-pack inclusion.

This record is a decision record only. It does not write a RAG manifest, create a RAG index, generate embeddings, create a vector database, call an LLM/model, promote sources, clean files, stage files, commit, or push.

## Decision

HumanGate decision:

```yaml
first_manifest_policy: "minimal stable source pack"
include_buckets:
  - stable_core
  - studio_control_canonical
  - registered_tracked_candidates
deferred_conditional_sources_included_in_first_manifest: false
no_RAG_index: true
no_embeddings: true
no_vector_database: true
no_LLM_model_call: true
no_source_promotion: true
no_cleanup: true
no_staging_commit_push: true
```

Rationale:

The first RAG manifest should be minimal, stable, and source-truth conservative. Conditional untracked sources remain deferred until HumanGate later tracks, archives, or explicitly allows local-only inclusion.

## Included Source Buckets For First Manifest

The first written RAG manifest may include these buckets only:

- `stable_core`
- `studio_control_canonical`
- `registered_tracked_candidates`

These bucket names reference the dry-run manifest candidate from `RAG-SOURCE-PACK-MANIFEST-DRY-RUN-ONLY-047`. This decision record does not itself write that manifest, register sources, or load any source into project truth.

## Deferred Conditional Sources

Deferred conditional sources are not included in first manifest:

- `00_STUDIO_CONTROL/01_MAPS/SCRIPTS_ROUTE_ALIGNMENT_CHARTER_V0.md`
- `00_STUDIO_CONTROL/01_MAPS/UXPILOTE_3D_WORLD_GRAPH_MODEL_V0.md`
- `00_STUDIO_CONTROL/01_MAPS/UXPILOTE_FUSION_MATRIX_VISUAL_SPEC_V0.md`
- `00_STUDIO_CONTROL/05_STATUS/STUDIO_TASK_DASHBOARD_INDEX_V0.yaml`

Deferral reason:

These sources are registered/readable candidates, but they are still untracked residual local files. They need a later HumanGate decision before future source-pack write or indexing can treat them as included source-pack material.

## Explicit Exclusions

The first manifest excludes:

- `.venv312/`
- `scripts/uxpilote/`
- `00_STUDIO_CONTROL/10_ROADMAP/`
- `00_STUDIO_CONTROL/05_STATUS/AUDIT_*.md`
- `00_STUDIO_CONTROL/05_STATUS/*REPORT*.md`
- generated artifacts
- `latest.json`
- `lab/runs/RUN_*`
- dataset directories
- model/checkpoint directories

These exclusions do not delete, archive, clean, or modify those paths. They only define first-manifest policy.

## Source-State Policy

Core source-state rule:

```text
created != registered != loaded != enforced != evidenced
```

For this decision record:

```yaml
source_state:
  created: DOCUMENTED_ONLY
  registered: UNKNOWN
  loaded: DOCUMENTED_ONLY by local readback in the creating task
  enforced: DOCUMENTED_ONLY by the bounded task scope
  evidenced: DOCUMENTED_ONLY by readback, git diff check, and final report
```

File existence does not create source truth, registration, project-source loading, runtime authority, source promotion, RAG authority, or claim authority.

## Boundaries / Non-Authorization

- Runtime authority: NONE
- Agent activation: BLOCKED
- Training/benchmark/dataset/model: BLOCKED
- RAG manifest write: BLOCKED
- RAG index: BLOCKED
- Embeddings: BLOCKED
- Vector database: BLOCKED
- LLM/model call: BLOCKED
- Source promotion: BLOCKED
- Registry/source-index/upload-checklist mutation: BLOCKED
- Task matrix mutation: BLOCKED
- Cleanup: BLOCKED
- Archive creation: BLOCKED
- File deletion: BLOCKED
- Staging, commit, push: BLOCKED
- Pull, merge, rebase, restore, reset, clean: BLOCKED
- `latest.json` creation: BLOCKED
- `lab/runs/RUN_*` creation: BLOCKED
- Chess960 activation: BLOCKED
- DecisionController activation: BLOCKED
- Claim posture: NO_CLAIM_ALLOWED
- No global ready verdict: true

## Status By Surface

```yaml
status_by_surface:
  active_runtime_code: PASSIVE
  tests: PASSIVE
  artifacts_runtime_outputs: PASSIVE
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE
```

## Verdicts

```yaml
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
  canonical_docs: DOCUMENTED_ONLY
  roadmap_docs_only: PASSIVE
  inference: PASSIVE

claim_verdict:
  active_runtime_code: NO_CLAIM_ALLOWED
  tests: NO_CLAIM_ALLOWED
  artifacts_runtime_outputs: NO_CLAIM_ALLOWED
  canonical_docs: NO_CLAIM_ALLOWED
  roadmap_docs_only: NO_CLAIM_ALLOWED
  inference: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
```

## Recommended Next Task

Create a separate bounded docs-only task to write the first RAG source-pack manifest file using only:

- `stable_core`
- `studio_control_canonical`
- `registered_tracked_candidates`

That later task must keep RAG indexing, embeddings, vector database creation, LLM/model calls, source promotion, cleanup, staging, commit, and push blocked unless separately authorized by HumanGate.
