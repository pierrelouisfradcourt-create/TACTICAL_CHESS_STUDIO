# Docs Status

Status: active documentation index
Date: 2026-05-19
Rule: this file classifies docs only. It does not create runtime evidence, benchmark evidence, promotion authority, or claim authority.

## Active Docs

These files are the current resume/control surface after PP9-PP19 / PR #237-#247:

- `README.md`
- `MASTER_DOCS/00_EXEC_SUMMARY.md`
- `MASTER_DOCS/01_CURRENT_STATE.md`
- `MASTER_DOCS/02_COMMAND_CHEATSHEET.md`
- `MASTER_DOCS/03_KNOWN_ISSUES.md`
- `MASTER_DOCS/05_ARCHITECTURE.md`
- `MASTER_DOCS/08_REPRISE_PROMPT.md`
- `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md`
- `MASTER_DOCS/11_GPT55_BROWSER_REPRISE_PROMPT.md`
- `MASTER_DOCS/AAA_TACTICAL_CORE_ARCHITECTURE.md`
- `MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md`
- `MASTER_DOCS/TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md`

Current active truth:

- Live branch, ahead/behind, and HEAD truth must be verified with `git status --short --branch` and `git rev-parse HEAD`; this file no longer hardcodes SHA or ahead-count examples.
- PP9-PP19 / PR #237-#247 are present in the local history context, but current repo state still requires live Git verification.
- PP9-PP19 closed the engine/search/neural decomposition and roadmap fusion track as docs-only, tests-only, or passive adapter work only.
- Automation/control-plane tooling is partial and local-first: implemented scripts exist for validation, rendering, dry-run state deltas, current-state candidates, mission candidates, operator inbox candidates, HumanGate decision candidates, authorized-action plans, and in-memory loop tests.
- Dry-run tooling is not autonomous execution.
- JSON schemas are PASSIVE contracts.
- Runtime activation remains BLOCKED.
- AAA/Hybrid remains roadmap doctrine and passive scaffolding only; active runtime/source truth outranks docs.
- `SearchBackend` remains passive.
- `DecisionController` remains passive.
- `LegalAction` / `ActionId` adapter work remains passive.
- `NeuralPolicyValue` remains a paper-only candidate.
- `HumanDecision` remains final authority for merge, reject, freeze, promotion, activation, and claim status.
- `claim_verdict` remains `NO_CLAIM_ALLOWED`.
- `no_global_ready_verdict: true` remains required.

## Current Control-Plane Stabilization

| Surface | Status | Boundary |
| --- | --- | --- |
| active_runtime_code | IMPLEMENTED | Rust runtime truth; unchanged by docs stabilization. |
| tests | TESTED | Existing targeted/dry-run loop validations only; no benchmark or training claim. |
| tools_scripts | IMPLEMENTED | `scripts/control_plane/*` includes current-state, delta, mission, inbox, HumanGate, dry-run loop, and in-memory loop tooling. |
| artifacts_runtime_outputs | TESTED | Local `.studio_state/current_state.json` is ignored operational state; no inbox/latest/lab outputs are authorized by docs. |
| schemas | PASSIVE | Contracts for shape validation only. |
| canonical_docs | DOCUMENTED_ONLY | Docs classify and index state; they do not promote claims. |
| roadmap_docs_only | DOCUMENTED_ONLY | Planning remains gated. |
| inference | PASSIVE | Neural proposes/reranks only; Search remains final authority. |

## Studio Loop V1 Freeze

Status date: 2026-05-19.

Current surface status:

| Surface | Status | Boundary |
| --- | --- | --- |
| active_runtime_code | IMPLEMENTED | Git-backed Rust runtime remains runtime truth; no runtime mutation in this freeze. |
| tests | TESTED | Narrow control-plane and previously recorded targeted validations only; no benchmark proof. |
| tools_scripts | IMPLEMENTED | Git-backed `scripts/control_plane/*` tooling exists for dry-run/current-state/inbox/HumanGate/action-plan flow. |
| artifacts_runtime_outputs | TESTED | Local `.studio_state/current_state.json` write boundary was tested; generated artifacts remain non-canonical. |
| canonical_docs | DOCUMENTED_ONLY | `MASTER_DOCS/*` records the freeze; docs do not activate runtime or claims. |
| roadmap_docs_only | DOCUMENTED_ONLY | Roadmap options remain planning-only. |
| inference | PASSIVE | Neural may propose/rerank only; Search remains final authority. |
| schemas | PASSIVE | JSON schemas validate shapes only and do not authorize state transitions. |
| runtime_activation | BLOCKED | No Studio runtime, DecisionController activation, SearchBackend activation, or agent activation. |
| dataset/training/benchmark/model | BLOCKED | No dataset generation/reset, training, benchmark proof, checkpoint creation, or model promotion. |

What is Git-backed:
- Control-plane docs, schemas, fixtures, and Python dry-run scripts.
- Full loop in-memory harness: `scripts/control_plane/run_full_studio_loop_in_memory_test.py`.
- Mission, operator inbox, HumanGate decision, and authorized-action dry-run compilers.

What remains local/passive:
- `.studio_state/current_state.json` is ignored local operational state.
- Dry-run stdout candidates, local reports, and local archives are passive context unless HumanGate promotes a narrower artifact.
- Current local state still records several surfaces as `UNKNOWN`; this freeze documents canonical docs posture and does not rewrite `.studio_state/current_state.json`.

Evidence basis:
- full loop in-memory harness: Git-backed
- current_state local write: TESTED
- current_state -> mission -> inbox -> HumanGate -> plan dry-run: TESTED
- artifacts smoke: validated
- docs stabilization commit: `da0a86d0c922f79fa4fbbd955058b5a51df1fee9`

Explicit non-claims:
- no runtime activation
- no benchmark proof
- no training proof
- no dataset generation
- no model promotion
- no public claim

Next phase options:
- freeze/stabilize
- first HumanGate-approved Codex execution on docs/tooling only
- cost/observability plane

Claim posture: `NO_CLAIM_ALLOWED`.

`no_global_ready_verdict: true`.

## Recent PP9-PP19 Consolidation

| Track | PR | Status | Classification | Authority boundary |
| --- | --- | --- | --- | --- |
| PP9 engine/search/neural decomposition roadmap | #237 | merged | docs-only | no implementation authorized |
| PP10 surface inventory | #238 | merged | docs-only | active surfaces inventoried only |
| PP11 engine determinism characterization | #239 | merged | tests-only | no runtime activation |
| PP12 Engine LegalAction / ActionId adapter | #240 | merged | passive adapter | no action-flow replacement |
| PP13 search root boundary characterization | #241 | merged | tests-only | no search tuning |
| PP14 SearchBackend adapter | #242 | merged | passive adapter | no active route replacement |
| PP15 decision routing contract plan | #243 | merged | docs-only | no router mutation |
| PP16 DecisionController adapter | #244 | merged | passive adapter | no default routing activation |
| PP17 neural split inventory and gate packet | #245 | merged | docs-only | no neural mutation |
| PP18 NeuralPolicyValue passive interface decision | #246 | merged | docs-only / paper-only | no interface implementation |
| PP19 master roadmap fusion | #247 | merged | docs-only fusion | no new control-plane or SSOT family |

## Roadmap Docs

These are useful for direction and constraints, but they are not proof that target systems are implemented:

- `MASTER_DOCS/AAA_TACTICAL_CORE_ARCHITECTURE.md`
- `MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md`
- `MASTER_DOCS/02_ROADMAP_90D.md`
- `MASTER_DOCS/05_ARCHITECTURE.md`
- `MASTER_DOCS/09_ROCKY_VARIANT_FREEZE.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_DECOMPOSITION_ROADMAP_V0.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_DECISION_ROUTING_CONTRACT_PLAN_V0.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_SPLIT_INVENTORY_GATE_PACKET_V0.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_POLICY_VALUE_PASSIVE_INTERFACE_DECISION_V0.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md`

Use roadmap language such as `target`, `scaffold`, `passive`, `docs-only`, `paper-only`, `partial`, and `future`. Do not describe AAA, Hybrid, DecisionController, SearchBackend, NeuralPolicyValue, or autonomous automation as complete unless active code and validation prove the exact narrow claim.

## Stale PR #116 Docs

PR #116 is an open draft docs sync based before the current PR60 state.

Handling:

- Do not merge PR #116 as-is.
- Do not mutate PR #116 from docs cleanup work.
- Human should close it or replace it with a fresh docs PR based on current `main`.

## Claim Boundary

- `software_verdict` may describe docs or mechanical code state.
- `evidence_verdict` may describe documentation-only or mechanical validation evidence.
- `claim_verdict` defaults to `NO_CLAIM_ALLOWED`.
- No Elo, strength, promotion, AAA-completion, automation-completion, or scientific claim is allowed from documentation status.
