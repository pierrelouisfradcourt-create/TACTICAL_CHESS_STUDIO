# HumanGate Authorization Contract V0

## Status

- status: DOCUMENTED_ONLY
- scope: HumanGate authorization contract for dataset and training audit semantics
- type names: `HumanGateAuthorization`, `HumanDecision`
- implementation status: IMPLEMENTED minimal / PASSIVE locally
- dataset admission gate status: BLOCKED
- dataset label status: BLOCKED
- training status: BLOCKED
- Chess960 runtime status: BLOCKED
- DecisionController status: BLOCKED
- Python dataset admission status: AM-DATA-5 completed locally; fail-closed gate exists
- HEAD after AM-DATA-5: 52419437
- local main: 33 commits ahead of origin/main, 0 behind
- GitHub main: NOT_FOUND for the local AM/Data stack
- CI/PR/push: BLOCKED by money/CI constraints
- claim verdict: NO_CLAIM_ALLOWED

This document is docs-only.

Local Rust `HumanGateAuthorization` and `HumanDecision` types exist as minimal/passive helpers. This document does not activate dataset admission gates, schemas, runtime behavior, tooling behavior, or promotion authority.

It does not authorize dataset labels, dataset promotion, training, Chess960 runtime, DecisionController activation, benchmark proof, scientific validation, product readiness, or any readiness, strength, dataset, or claim escalation.

## Purpose

`human_gate_authorization` as a boolean is compatibility metadata only. A bare boolean is not enough for future dataset or training audit semantics.

`HumanGateAuthorization` is the local Rust helper and contract name for a structured human authorization record.

`HumanDecision` is the local Rust helper and contract name for the human decision value and its audit context.

HumanGate is necessary but insufficient for dataset labels, training admission, Chess960 activation, DecisionController activation, or claim publication.

## Required Future Fields

Any future `HumanGateAuthorization` record must carry:

- `authorized`
- `decision`
- `reason`
- `operator_source`
- `trace_id`
- `created_at`
- `scope`

Field meanings:

- `authorized`: explicit boolean authorization status.
- `decision`: one allowed `HumanDecision` value.
- `reason`: non-empty human-readable authorization reason.
- `operator_source`: operator identity source or review authority source.
- `trace_id`: stable trace, review, or evidence identifier.
- `created_at`: authorization creation timestamp.
- `scope`: one allowed authorization scope value.

## Optional Future Fields

Future records may carry:

- `review_packet_id`
- `dataset_candidate_id`
- `notes`
- `expires_at`

Optional fields do not replace any required field and do not relax fail-closed behavior.

## Allowed Decision Values

Allowed `decision` values:

- `approve_for_observation_only`
- `approve_for_dataset_candidate`
- `reject`
- `defer`
- `revoke`

Any unknown decision value must fail closed for dataset and training use.

## Allowed Scope Values

Allowed `scope` values:

- `observation`
- `dataset_candidate`
- `dataset_label_promotion`
- `training_admission`
- `chess960_activation`
- `claim_publication`

Any unknown or mismatched scope must fail closed for dataset and training use.

## Fail-Closed Rules

Any future dataset, promotion, or training path must fail closed when:

- missing `HumanGate` blocks dataset use;
- false `authorized` blocks dataset use;
- mismatched `scope` blocks dataset use;
- missing `reason` blocks dataset use;
- missing `trace_id` blocks dataset use;
- missing `operator_source` blocks dataset use;
- expired authorization blocks dataset use;
- unknown `decision` blocks dataset use;
- unknown `scope` blocks dataset use.

Fail-closed means no dataset label promotion, no training use, no Chess960 activation, no DecisionController activation, and no claim escalation.

## Relation To ActionMaskProvenance

Current `human_gate_authorization` boolean metadata is compatibility metadata only.

Local `ActionMaskProvenance` may carry HumanGate authorization status and optional structured `HumanGateAuthorization` metadata through `ActionMaskHumanGateAuthorizationState`.

The supported provenance-side states are missing authorization, passive authorization, and promotion authorization required. Missing authorization blocks dataset use. Passive/minimal authorization does not imply promotion authority. Promotion authorization required is an audit state, not a dataset admission decision.

HumanGate is necessary but insufficient for dataset labels or training. Action identity, legal action identity, mask compatibility, provenance, and a separate dataset admission gate remain required.

## Relation To Dataset Admission

A separate dataset admission gate is still required.

HumanGate alone does not create label truth.

HumanGate alone does not promote selected moves, search moves, neural proposals, policy indices, legal masks, observations, reports, logs, benchmarks, or runtime outputs into dataset labels.

AM-DATA-5 completed locally with a fail-closed Python dataset admission boundary:

- Python `validate_am_dataset_admission(row)`: IMPLEMENTED / TESTED / fail-closed.
- `AdmissionResult`: IMPLEMENTED / TESTED.
- `DatasetAdmissionError`: IMPLEMENTED.
- `TeacherDataset admission gate`: IMPLEMENTED_AND_TESTED.
- `train.py`: PASSIVE unchanged; protected by TeacherDataset boundary before checkpoint writes.

The Python gate blocks unsafe data; it does not make training ready.

Dataset label readiness: BLOCKED.

Training readiness: BLOCKED.

No admissible dataset row path exists yet.

No training run is allowed now.

No dataset generation/reset is allowed now.

Future dataset admission requires explicit HumanDecision/HumanGate promotion path and Rust/Python compatibility contract.

Future admissible rows must include ActionId, LegalAction, ActionMask/provenance, HumanGate state, move_vocab_fingerprint, ruleset, variant, and contamination status.

Python legal_mask authority: PASSIVE helper only / not authority.

Rust/Python ActionMask compatibility: UNKNOWN/BLOCKED.

ActionMask dataset authority: BLOCKED.

HumanGate promotion authority: BLOCKED.

Chess960 dataset/runtime: BLOCKED.

Benchmark/log/report artifacts remain passive evidence only.

This docs update does not promote local state to GitHub main truth.

Local tests are local evidence only.

## Forbidden Interpretations

The following interpretations are forbidden:

- `selected_move` is not label truth.
- `policy_index` is not label truth.
- `neural_predicted_move` is not authority.
- search move is not automatic label truth.
- benchmark, log, report, or `latest.json` is not proof.
- Python `legal_mask` is helper-only.
- Python is not runtime legality authority.
- Chess960 remains blocked.
- HumanGate presence is not dataset admission.
- HumanGate presence is not training admission.
- HumanGate presence is not claim permission.

## Component Status

| Component | Status | Boundary |
| --- | --- | --- |
| Contract document | DOCUMENTED_ONLY | Defines future HumanGate authorization semantics only. |
| `HumanGateAuthorization` type | IMPLEMENTED minimal / PASSIVE locally | Rust helper exists; not promotion authority. |
| `HumanDecision` type | IMPLEMENTED minimal / PASSIVE locally | Rust helper exists; not final authorization by itself. |
| HumanGate runtime/core object | IMPLEMENTED minimal / PASSIVE locally | No dataset admission or promotion authority from this document. |
| Python validate_am_dataset_admission(row) | IMPLEMENTED / TESTED / fail-closed | Blocks unsafe rows; does not make training ready. |
| AdmissionResult | IMPLEMENTED / TESTED | Local Python admission result. |
| DatasetAdmissionError | IMPLEMENTED | Local Python admission failure surface. |
| TeacherDataset admission gate | IMPLEMENTED_AND_TESTED | Protects `train.py` before checkpoint writes. |
| `train.py` | PASSIVE unchanged | Protected by TeacherDataset boundary before checkpoint writes. |
| Dataset admission gate | IMPLEMENTED_AND_TESTED locally / BLOCKED for allow-path | Fail-closed boundary exists; no admissible dataset row path exists yet. |
| ActionMaskProvenance relation | IMPLEMENTED / TESTED locally as helper metadata | Structured link exists; dataset sufficiency remains BLOCKED. |
| Dataset labels | BLOCKED | Require ActionId, LegalAction, ActionMask, provenance, HumanGate, and admission gate. |
| Training | BLOCKED | No training authorization. |
| Chess960 runtime | BLOCKED | No Chess960 activation. |
| Rust/Python ActionMask compatibility: UNKNOWN/BLOCKED | UNKNOWN/BLOCKED | No compatibility contract authorizes dataset use. |
| DecisionController | BLOCKED | No activation. |
| Claims | BLOCKED | `NO_CLAIM_ALLOWED`. |
