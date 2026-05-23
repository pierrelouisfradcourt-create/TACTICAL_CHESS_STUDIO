# ActionMask Authority Contract V0

## Status

- status: DOCUMENTED_ONLY
- scope: minimal ActionMask authority contract
- implementation status: AM-5/AM-7 technical code may exist
- runtime status: technical ActionMask chain exists, dataset authority remains blocked
- Python dataset admission status: AM-DATA-5 completed locally; fail-closed gate exists
- Standard move-vocab parity: AM-DATA-8 completed locally; TESTED for current Python helper policy
- Rust-generated legal-action sample parity: AM-DATA-10 completed locally; IMPLEMENTED_AND_TESTED
- HEAD after AM-DATA-10: eddf4fac
- local main: 37 commits ahead of origin/main, 0 behind
- GitHub main: NOT_FOUND for the local AM/Data stack
- CI/PR/push: BLOCKED by money/CI constraints
- claim verdict: NO_CLAIM_ALLOWED

This document is a contract document only. It does not implement or activate `ActionMask`.

It does not activate dataset labels, training, Chess960, DecisionController, neural authority, schemas, benchmark proof, or any runtime behavior.

## Implementation Status After AM-5/AM-7

AM-5/AM-7 may provide technical runtime code for:

- core `ActionMask` construction;
- the thin chess adapter path `Engine::legal_actions -> LegalAction -> ActionMask`;
- `action_mask_version`;
- `move_vocab_fingerprint`.

This technical chain does not authorize dataset labels, dataset promotion, training, Chess960 runtime, DecisionController activation, or neural authority.

Dataset authority remains blocked until provenance and `HumanGate` requirements are satisfied fail-closed.

## Source Of Truth

The future `ActionMask` authority source of truth is Rust Engine legal action generation.

Python helpers, reports, logs, benchmarks, generated artifacts, `latest.json`, legacy branches, neural output, or search output are not legality authority.

## Required Future Inputs

Any future authoritative `ActionMask` construction must bind these inputs:

- `position`
- side to move
- ruleset
- variant
- legal action list
- `ActionId` version
- `LegalAction` version
- `ActionMask` version
- `move_vocab_fingerprint`

## Required Future Outputs

Any future authoritative `ActionMask` output must include:

- versioned `ActionMask`
- legal `ActionId` set
- policy-index projection if available
- unencodable move list
- provenance metadata

## Provenance And HumanGate Requirements

Provenance carry field names and fail-closed boundaries are documented in `docs/evidence/ACTIONMASK_PROVENANCE_CARRY_CONTRACT_V0.md`. Local Rust `ActionMaskProvenance` exists as a helper, but dataset sufficiency remains BLOCKED.

Any future dataset-authoritative row must include all of these provenance and gate fields:

- `decision_mode`
- `authority_source`
- `final_selected_move`
- `search_selected_move`
- `search_best_move`
- `neural_predicted_move`
- `neural_policy_index` / `policy_index`
- `rerank_status`
- `fallback_reason`
- `legal_move_source`
- `legal_action_version`
- `action_mask_version`
- `move_vocab_fingerprint`
- `ruleset`
- `variant`
- `human_gate_authorization`

`human_gate_authorization` is required before any observation, selected move, search move, neural proposal, policy index, or legal mask context becomes dataset or training material.

The required provenance fields identify authority, attribution, legality, vocabulary compatibility, rerank/fallback contamination, ruleset, variant, and HumanGate status. They do not prove strength, readiness, scientific validity, or dataset quality.

## Fail-Closed Behavior

The contract must fail closed:

- illegal move: never included
- unencodable move: blocks dataset promotion
- missing `move_vocab` entry: blocks dataset promotion
- `policy_index = -1`: blocks dataset promotion
- missing `HumanGate`: blocks dataset promotion
- missing `legal_action_version`: blocks dataset promotion
- missing `action_mask_version`: blocks dataset promotion
- missing `move_vocab_fingerprint`: blocks dataset promotion
- selected move not in legal `ActionMask`: blocks dataset promotion
- fallback or rerank contamination without metadata: blocks dataset promotion
- Chess960 variant without action identity contract: blocks dataset promotion and runtime activation

## Promotion Behavior

Promotion labels must use explicit UCI promotion suffixes:

- `q`
- `r`
- `b`
- `n`

Missing promotion suffixes are invalid for promotion labels.

## Standard Castling Behavior

Standard classical castling uses UCI king-destination form only:

- `e1g1`
- `e1c1`
- `e8g8`
- `e8c8`

## Chess960 Behavior

Chess960 `ActionMask` use is blocked until a FEN, castling, and action identity contract exists.

This document does not activate Chess960 runtime, Chess960 evidence, Chess960 dataset use, or Chess960 training.

## Python Relation

Python `legal_mask` is helper and compatibility code only.

Python legal_mask authority: PASSIVE helper only / not authority.

Python `move_vocab` may validate projection compatibility.

Python move_vocab standard helper: IMPLEMENTED / TESTED.

Standard move-vocab parity: TESTED for current Python helper policy.

Rust-generated legal-action sample parity: IMPLEMENTED_AND_TESTED.

Rust/Python standard move compatibility: TESTED_SAMPLE_ONLY.

Policy index compatibility: TESTED_SAMPLE_ONLY.

sample position count: 5.

Rust-generated key count: 16.

promotions covered: TESTED.

castling covered: TESTED.

captures covered: TESTED.

debug fallback unencodable: TESTED fail-closed.

all sampled keys policy-encodable: YES.

all sampled indices roundtrip: YES.

legal_action_version: legal_action_v0.

action_mask_version: action_mask_v0_skeleton.

move_vocab size: 4164.

move_vocab fingerprint: 690ce94afd536cba509442f7c184da0e9c6a765a226d6350d259f4a88e54f18c.

coordinate entries: 3988.

promotion entries: 176.

classical castling keys: TESTED.

debug/malformed keys: TESTED fail-closed.

full Python vocab roundtrip: TESTED.

duplicate indices: TESTED, none found.

Standard move-vocab parity is standard-UCI helper compatibility only.

Standard move-vocab parity is not a legality oracle.

Standard move-vocab parity is not exhaustive Rust generator proof.

Rust-generated legal-action sample parity is representative sample only.

Rust-generated legal-action sample parity is not exhaustive Rust generator proof.

Rust-generated legal-action sample parity is Not ActionMask authority.

Python is not runtime legality authority.

Python `validate_am_dataset_admission(row)` is IMPLEMENTED / TESTED / fail-closed locally.

`AdmissionResult` is IMPLEMENTED / TESTED locally.

`DatasetAdmissionError` is IMPLEMENTED locally.

`TeacherDataset admission gate` is IMPLEMENTED_AND_TESTED locally.

`train.py` is PASSIVE unchanged; protected by TeacherDataset boundary before checkpoint writes.

The Python gate blocks unsafe data; it does not make training ready.

Rust/Python ActionMask compatibility: UNKNOWN/BLOCKED.

Rust/Python ActionMask authority: BLOCKED/UNKNOWN.

## Dataset And Training Relation

No dataset label promotion is allowed without all of:

- `ActionId`
- `LegalAction`
- `ActionMask`
- provenance
- `HumanGate`

The presence of a technical `ActionMask` is not enough. Dataset label authority requires versioned legal-action identity, versioned mask construction, move vocabulary fingerprinting, complete provenance, and explicit HumanGate authorization.

This document does not promote labels and does not authorize training.

Dataset label readiness: BLOCKED.

Training readiness: BLOCKED.

No admissible dataset row path exists yet.

Dataset/training: BLOCKED.

No training run is allowed now.

No dataset generation/reset is allowed now.

Future dataset admission requires explicit HumanDecision/HumanGate promotion path and Rust/Python compatibility contract.

Future Rust/Python ActionMask authority requires a separate versioned compatibility contract and broader coverage.

Future admissible rows must include ActionId, LegalAction, ActionMask/provenance, HumanGate state, move_vocab_fingerprint, ruleset, variant, and contamination status.

ActionMask dataset authority: BLOCKED.

HumanGate promotion authority: BLOCKED.

Chess960 dataset/runtime: BLOCKED.

AM-DATA-10 does not authorize dataset labels, training, Chess960, neural authority, or product/scientific/strength/readiness claims.

Rust-generated sample parity is frozen unless explicit HumanDecision reopens it.

AM-DATA standard vocab parity is frozen unless explicit HumanDecision reopens it.

Future Chess960 requires explicit FEN/castling/action identity contracts.

Next safe actions are read-only audit for exhaustive Rust legal-action coverage feasibility, tests-only expansion if explicitly chosen, docs sync, or local archive if requested.

Runtime patches for dataset admission allow-path, training, Chess960, or ActionMask authority remain BLOCKED unless explicitly authorized.

Benchmark/log/report artifacts remain passive evidence only.

This docs update does not promote local state to GitHub main truth.

Local tests are local evidence only.

## Forbidden Interpretations

The following interpretations are forbidden:

- `selected_move` is not label truth.
- `neural_predicted_move` is not authority.
- search move is not automatic label.
- `policy_index` is not label truth by itself.
- benchmark, log, report, or `latest.json` is not proof.
- Python `legal_mask` is helper-only and not legality authority.
- Technical `ActionMask` existence is not dataset authority.
- HumanGate presence is required but does not prove quality or readiness.

## Component Status

| Component | Status | Boundary |
| --- | --- | --- |
| Contract document | DOCUMENTED_ONLY | Defines future authority requirements only. |
| Rust legal action generation | IMPLEMENTED | Source of truth for future ActionMask legality. |
| Rust `ActionMask` core | IMPLEMENTED | Technical chain only; not dataset authority. |
| Rust chess adapter | IMPLEMENTED | `Engine::legal_actions -> LegalAction -> ActionMask`; not dataset authority. |
| `legal_action_version` | IMPLEMENTED / TESTED locally | `legal_action_v0` exists locally; required but not sufficient for dataset label authority. |
| `action_mask_version` | IMPLEMENTED | Required but not sufficient for dataset label authority. |
| `move_vocab_fingerprint` | IMPLEMENTED | Required but not sufficient for dataset label authority. |
| ActionMaskProvenance | IMPLEMENTED / TESTED locally | Rust helper exists; dataset sufficiency remains BLOCKED. |
| Provenance fields | IMPLEMENTED / TESTED locally as helper metadata | Required but not sufficient for dataset label authority. |
| HumanGate / HumanDecision | IMPLEMENTED minimal / PASSIVE locally | Minimal Rust types exist; promotion authority and dataset admission remain BLOCKED. |
| Python `legal_mask` | PASSIVE | Helper/compatibility only. |
| Python move_vocab standard helper | IMPLEMENTED / TESTED | Standard-UCI helper compatibility only; not a legality oracle. |
| Standard move-vocab parity | TESTED | Current Python helper policy only; not exhaustive Rust generator proof. |
| Rust-generated legal-action sample parity | IMPLEMENTED_AND_TESTED | Representative sample only; not exhaustive Rust generator proof and Not ActionMask authority. |
| Rust/Python standard move compatibility | TESTED_SAMPLE_ONLY | sample position count: 5; Rust-generated key count: 16. |
| Policy index compatibility | TESTED_SAMPLE_ONLY | all sampled keys policy-encodable: YES; all sampled indices roundtrip: YES. |
| promotions/castling/captures covered | TESTED | Representative sample covers promotions, castling, and captures. |
| debug fallback unencodable | TESTED fail-closed | Debug fallback remains unencodable. |
| `legal_action_version` | TESTED | `legal_action_v0`. |
| `action_mask_version` | TESTED | `action_mask_v0_skeleton`. |
| move_vocab size | TESTED | 4164 entries; fingerprint `690ce94afd536cba509442f7c184da0e9c6a765a226d6350d259f4a88e54f18c`. |
| coordinate entries | TESTED | 3988 entries. |
| promotion entries | TESTED | 176 entries. |
| classical castling keys | TESTED | `e1g1`, `e1c1`, `e8g8`, `e8c8`. |
| debug/malformed keys | TESTED fail-closed | Debug and malformed keys rejected. |
| full Python vocab roundtrip | TESTED | Current Python vocab roundtrip passed locally. |
| duplicate indices | TESTED | None found. |
| Python validate_am_dataset_admission(row) | IMPLEMENTED / TESTED / fail-closed | Blocks unsafe rows; does not make training ready. |
| AdmissionResult | IMPLEMENTED / TESTED | Local Python admission result. |
| DatasetAdmissionError | IMPLEMENTED | Local Python admission failure surface. |
| TeacherDataset admission gate | IMPLEMENTED_AND_TESTED | Protects `train.py` before checkpoint writes. |
| `train.py` | PASSIVE unchanged | Protected by TeacherDataset boundary before checkpoint writes. |
| Python `move_vocab` projection | PASSIVE | May validate compatibility, not legality. |
| Dataset labels | BLOCKED | Require ActionId, LegalAction, ActionMask, provenance, and HumanGate. |
| Training | BLOCKED | No training activation. |
| Chess960 action identity | BLOCKED | Requires FEN/castling/action identity contract. |
| Rust/Python ActionMask compatibility: UNKNOWN/BLOCKED | UNKNOWN/BLOCKED | No compatibility contract authorizes dataset use. |
| Rust/Python ActionMask authority: BLOCKED/UNKNOWN | BLOCKED/UNKNOWN | Separate versioned compatibility contract still required. |
| Neural authority | BLOCKED | Neural may propose or rerank only. |
