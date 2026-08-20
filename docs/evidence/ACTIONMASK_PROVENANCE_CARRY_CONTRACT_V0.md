# ActionMask Provenance Carry Contract V0

## Status

- status: DOCUMENTED_ONLY
- scope: provenance carry contract for ActionMask metadata
- type name: `ActionMaskProvenance`
- implementation status: IMPLEMENTED / TESTED locally as Rust helper
- dataset status: BLOCKED
- training status: BLOCKED
- Chess960 runtime status: BLOCKED
- Python dataset admission status: AM-DATA-5 completed locally; fail-closed gate exists
- Standard move-vocab parity: AM-DATA-8 completed locally; TESTED for current Python helper policy
- Rust-generated legal-action sample parity: AM-DATA-10 completed locally; IMPLEMENTED_AND_TESTED
- HEAD after AM-DATA-10: eddf4fac
- local main: 37 commits ahead of origin/main, 0 behind
- GitHub main: NOT_FOUND for the local AM/Data stack
- CI/PR/push: BLOCKED by money/CI constraints
- claim verdict: NO_CLAIM_ALLOWED

This document is docs-only. Local Rust `ActionMaskProvenance` exists as a helper, but this document does not activate it as dataset authority.

It does not authorize dataset labels, dataset promotion, training, Chess960 runtime, DecisionController activation, HumanGate implementation, schemas, benchmark proof, scientific validation, product readiness, or any runtime behavior.

Structured HumanGate authorization semantics are documented in `docs/evidence/HUMANGATE_AUTHORIZATION_CONTRACT_V0.md`. The current `human_gate_authorization` boolean is compatibility metadata only; local provenance can also carry structured `HumanGateAuthorization` metadata through `ActionMaskHumanGateAuthorizationState`, but dataset sufficiency remains BLOCKED.

## Purpose

`ActionMaskProvenance` is the local Rust helper and contract name for carrying version and compatibility metadata alongside an `ActionMask`.

The purpose is to preserve enough metadata for later fail-closed review without making the technical `ActionMask` dataset-authoritative by itself.

## Required Future Fields

Any future `ActionMaskProvenance` record must carry:

- `action_id_version`
- `legal_action_version`
- `action_mask_version`
- `move_vocab_fingerprint`
- `legal_move_source`
- `ruleset`
- `variant`
- `policy_indices`
- `unencodable_action_ids`
- `human_gate_authorization`
- `human_gate_authorization_state`

These fields identify action identity, legal-action compatibility, mask construction compatibility, policy vocabulary compatibility, legal source, rules context, variant context, projection state, unencodable legal actions, legacy HumanGate authorization status, and structured HumanGate authorization metadata.

They do not prove strength, dataset quality, scientific validity, training readiness, Chess960 readiness, or product readiness.

## Optional Diagnostic Fields

Future records may carry diagnostic context when visible:

- `decision_mode`
- `authority_source`
- `final_selected_move`
- `search_selected_move`
- `search_best_move`
- `neural_predicted_move`
- `rerank_status`
- `fallback_reason`

These fields are diagnostic attribution and contamination metadata only. They do not become labels without a separate admission gate and explicit HumanGate authorization.

## Fail-Closed Blockers

Any future dataset or promotion path using this contract must fail closed on:

- missing `ACTION_ID_VERSION`
- missing `LEGAL_ACTION_VERSION`
- missing `ACTION_MASK_VERSION`
- missing `move_vocab_fingerprint` for dataset use
- duplicate `ActionId`
- selected move not legal
- unencodable action for dataset promotion
- missing or false `HumanGate`
- missing structured `HumanGateAuthorization` metadata for any path that wants to reason about promotion authority
- passive/minimal `HumanGateAuthorization` for dataset label promotion
- missing `ruleset`
- missing `variant`
- Chess960 without FEN, castling, and action identity contract

Fail-closed means no dataset label promotion, no training use, no Chess960 activation, and no claim escalation.

## Relation To ActionMask

`ActionMaskProvenance` snapshots metadata about an `ActionMask`.

It may reference or carry the mask version, legal action identifiers, policy projection state, unencodable action identifiers, and move vocabulary fingerprint.

Provenance does not make `ActionMask` dataset-authoritative by itself. A technical `ActionMask` remains a compatibility and legality-support surface until a separate dataset admission gate and HumanGate authorization exist.

## Relation To Python

Python `move_vocab` may validate policy projection compatibility.

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

Python `legal_mask` remains helper-only.

Python legal_mask authority: PASSIVE helper only / not authority.

Python is not legality authority. Rust engine legal action generation remains the legality source for future ActionMask authority.

Python `validate_am_dataset_admission(row)` is IMPLEMENTED / TESTED / fail-closed locally.

`AdmissionResult` is IMPLEMENTED / TESTED locally.

`DatasetAdmissionError` is IMPLEMENTED locally.

`TeacherDataset admission gate` is IMPLEMENTED_AND_TESTED locally.

`train.py` is PASSIVE unchanged; protected by TeacherDataset boundary before checkpoint writes.

The Python gate blocks unsafe data; it does not make training ready.

Rust/Python ActionMask compatibility: UNKNOWN/BLOCKED.

Rust/Python ActionMask authority: BLOCKED/UNKNOWN.

## Relation To Dataset Labels

Provenance is necessary but insufficient for dataset labels.

A separate dataset admission gate remains required before any selected move, search move, neural proposal, policy index, legal mask context, or trace observation can become dataset or training material.

`human_gate_authorization` must be explicit for dataset use. Its presence records authorization status only; it does not prove label quality, strength, readiness, or scientific validity.

Structured `HumanGateAuthorization` metadata may be carried as missing, passive, or promotion-authorization-required state. These states remain metadata for review and do not create a dataset-ready path without a separate dataset admission gate.

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

AM-DATA-10 does not authorize dataset labels, training, Chess960, neural authority, or product/scientific/strength/readiness claims.

Rust-generated sample parity is frozen unless explicit HumanDecision reopens it.

AM-DATA standard vocab parity is frozen unless explicit HumanDecision reopens it.

Future Chess960 requires explicit FEN/castling/action identity contracts.

Next safe actions are read-only audit for exhaustive Rust legal-action coverage feasibility, tests-only expansion if explicitly chosen, docs sync, or local archive if requested.

Runtime patches for dataset admission allow-path, training, Chess960, or ActionMask authority remain BLOCKED unless explicitly authorized.

Benchmark/log/report artifacts remain passive evidence only.

This docs update does not promote local state to GitHub main truth.

Local tests are local evidence only.

## Chess960 Boundary

Chess960 remains blocked.

No Chess960 dataset use, runtime activation, evidence activation, or training use is allowed from this contract.

Any future Chess960 use requires explicit FEN, castling, ruleset, variant, and action identity contracts before mask or provenance data can be considered.

## Forbidden Interpretations

The following interpretations are forbidden:

- `selected_move` is not label truth.
- `neural_predicted_move` is not authority.
- search move is not automatic label truth.
- `policy_index` is not label truth.
- benchmark, log, report, or `latest.json` is not proof.
- Python `legal_mask` is not legality authority.
- technical `ActionMask` existence is not dataset authority.
- provenance existence is not dataset authority.
- HumanGate presence is required but does not prove quality or readiness.
- Chess960 remains blocked.

## Component Status

| Component | Status | Boundary |
| --- | --- | --- |
| Contract document | DOCUMENTED_ONLY | Defines future carry fields only. |
| `ActionMaskProvenance` type | IMPLEMENTED / TESTED locally | Rust helper exists; this document does not make it dataset-authoritative. |
| Provenance carry implementation | IMPLEMENTED / TESTED locally | Helper metadata exists, including structured HumanGate metadata; dataset sufficiency remains BLOCKED. |
| Python move_vocab standard helper | IMPLEMENTED / TESTED | Standard-UCI helper compatibility only; not a legality oracle. |
| Standard move-vocab parity | TESTED | Current Python helper policy only; not exhaustive Rust generator proof. |
| Rust-generated legal-action sample parity | IMPLEMENTED_AND_TESTED | Representative sample only; not exhaustive Rust generator proof and Not ActionMask authority. |
| Rust/Python standard move compatibility | TESTED_SAMPLE_ONLY | sample position count: 5; Rust-generated key count: 16. |
| Policy index compatibility | TESTED_SAMPLE_ONLY | all sampled keys policy-encodable: YES; all sampled indices roundtrip: YES. |
| promotions/castling/captures covered | TESTED | Representative sample covers promotions, castling, and captures. |
| debug fallback unencodable | TESTED fail-closed | Debug fallback remains unencodable. |
| legal_action_version | TESTED | `legal_action_v0`. |
| action_mask_version | TESTED | `action_mask_v0_skeleton`. |
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
| Dataset admission gate | IMPLEMENTED_AND_TESTED locally / BLOCKED for allow-path | Fail-closed boundary exists; no admissible dataset row path exists yet. |
| HumanGate / HumanDecision | IMPLEMENTED minimal / PASSIVE locally | Required but not sufficient before dataset or training use. |
| Dataset labels | BLOCKED | Provenance is necessary but insufficient. |
| Training | BLOCKED | No training authorization. |
| Chess960 runtime | BLOCKED | Requires explicit FEN, castling, ruleset, variant, and action identity contracts. |
| Rust/Python ActionMask compatibility: UNKNOWN/BLOCKED | UNKNOWN/BLOCKED | No compatibility contract authorizes dataset use. |
| Rust/Python ActionMask authority: BLOCKED/UNKNOWN | BLOCKED/UNKNOWN | Separate versioned compatibility contract still required. |
| DecisionController | BLOCKED | No activation from this contract. |
| Claims | BLOCKED | `NO_CLAIM_ALLOWED`. |
