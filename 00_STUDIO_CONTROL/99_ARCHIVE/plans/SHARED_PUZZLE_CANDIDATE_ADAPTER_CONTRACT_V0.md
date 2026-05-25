# Shared PuzzleCandidate Adapter Contract V0

Status: DOCUMENTED_ONLY  
Surface: roadmap_docs_only  
Runtime authority: NONE  
Training: BLOCKED  
Benchmark: BLOCKED  
Dataset generation: BLOCKED  
Dataset promotion: BLOCKED  
Agent activation: BLOCKED  
Claim posture: NO_CLAIM_ALLOWED  
HumanGate: REQUIRED

## Purpose

This contract defines a future shared candidate format for two pedagogical puzzle sources:

1. Existing RNG/tutorial `PuzzleCase` records.
2. Future Rocky observed-error-derived puzzle candidates.

The goal is a shared `PuzzleCandidate` boundary that preserves the old tutorial/RNG puzzle work while making room for a later error-to-puzzle curriculum. This document is roadmap documentation only. It does not implement the adapter, modify tests, generate puzzles, run evaluation, create datasets, train models, run benchmarks, or activate runtime features.

## Current Evidence Summary

| Surface | Status | Evidence summary |
|---|---:|---|
| `PuzzleCase` | IMPLEMENTED | `src/chess/puzzle.rs` defines `case_id`, `fen`, `side_to_move`, `theme`, `best_moves`, `seed`, `difficulty`, and `validation`. |
| `puzzle_rng` | IMPLEMENTED | `src/tool/puzzle_rng.rs` maps `PuzzleTheme` plus count/seed into `PuzzleCase` JSONL records. |
| `puzzle_rng` route | PASSIVE | Current output route is `lab/puzzles/puzzle_rng_{theme}_seed{seed}.jsonl`; this is not the future error-puzzle sandbox route. |
| `puzzle_eval` | IMPLEMENTED | `src/tool/puzzle_eval.rs` evaluates `PuzzleCase` JSONL and supports `solved`, `partial`, and `failed`. |
| `conversion_suite` | IMPLEMENTED | `src/tool/conversion_suite.rs` provides related `solved`, `partial`, `failed`, `improved`, `stagnated`, and `regressed` classification evidence. |
| Learning fixtures | DOCUMENTED_ONLY | `lab/learning/fixtures/concepts/fork.json` and `lab/learning/fixtures/drills/fork_execution_001.json` provide partial vocabulary and lesson material for the fork concept. |
| Observed Rocky error source | NOT_FOUND | No structured observed-error input was found for `source_game_id`, `source_ply`, and `observed_bad_move`. |
| Error-to-puzzle adapter | NOT_FOUND | No existing adapter maps observed errors into `PuzzleCandidate`. |

## Source Types

| Source type | Status | Contract meaning |
|---|---:|---|
| `rng_tutorial_source` | DOCUMENTED_ONLY | Existing `PuzzleCase` records can be mapped into `PuzzleCandidate` for tutorial and RNG-generated puzzles. |
| `rocky_error_source` | BLOCKED | Future observed-error candidates are blocked until structured observed errors exist. |

`rng_tutorial_source` may map existing `PuzzleCase` fields into `PuzzleCandidate` without treating them as dataset rows.

`rocky_error_source` is BLOCKED until a separate source contract defines structured observed errors, provenance, legal/search evidence, and HumanGate handling.

## Shared PuzzleCandidate Contract

Future `PuzzleCandidate` records should use these fields:

| Field | Required meaning | Default or gate |
|---|---|---|
| `puzzle_id` | Stable candidate identifier. | Required. |
| `source_type` | One of `rng_tutorial_source` or `rocky_error_source`. | Required. |
| `source_game_id` | Source game or observation id when available. | Required for `rocky_error_source`; NOT_FOUND for current RNG records. |
| `source_ply` | Source ply or step when available. | Required for `rocky_error_source`; NOT_FOUND for current RNG records. |
| `fen` | Captured chess position. | Required. |
| `side_to_move` | Side to move in the captured position. | Required. |
| `observed_bad_move` | Move observed from Rocky or another source that caused the diagnostic case. | BLOCKED for `rocky_error_source` until structured input exists; NOT_FOUND for RNG records. |
| `candidate_better_move` | Candidate corrective move. | For RNG, candidate from `best_moves`; for Rocky errors, BLOCKED until legal/search adapter exists. |
| `solution_line` | Candidate solution moves. | Can map from `best_moves` for RNG. |
| `theme` | Pedagogical or tactical theme. | Required when known. |
| `difficulty_level` | Difficulty label or numeric level. | Can map from `difficulty`. |
| `error_type` | Diagnostic error classification. | Optional for RNG; required later for observed errors. |
| `vocabulary_tags` | Vocabulary/concept tags. | DOCUMENTED_ONLY; can later use learning fixtures. |
| `lesson_tags` | Pedagogical lesson tags. | DOCUMENTED_ONLY; can later use learning fixtures. |
| `source_report` | Source observation or generator metadata. | Required when available. |
| `search_evidence` | Search or validation evidence. | Diagnostic only. |
| `neural_context` | Neural proposal/rerank context if present. | UNKNOWN by default; neural is not authority. |
| `explanation_md` | Human explanation placeholder or path. | DOCUMENTED_ONLY until an explanation lane exists. |
| `replay_status` | Candidate lifecycle state. | Must start as `candidate`. |
| `solved_count` | Replay solved count. | Starts at `0`. |
| `failed_count` | Replay failed count. | Starts at `0`. |
| `regressed_count` | Replay regression count. | Starts at `0`. |
| `last_seen_head` | Last git HEAD used for replay observation. | Empty or explicit SHA. |
| `humangate_required` | HumanGate requirement flag. | Must be `true`. |
| `dataset_admissible` | Dataset admission flag. | Must be `false`. |

## Field Mapping

### `PuzzleCase` to `PuzzleCandidate`

| `PuzzleCase` field | `PuzzleCandidate` field | Status | Notes |
|---|---|---:|---|
| `case_id` | `puzzle_id` | DOCUMENTED_ONLY | Direct adapter mapping. |
| `fen` | `fen` | DOCUMENTED_ONLY | Direct adapter mapping. |
| `side_to_move` | `side_to_move` | DOCUMENTED_ONLY | Direct adapter mapping. |
| `theme` | `theme` | DOCUMENTED_ONLY | Direct adapter mapping. |
| `best_moves` | `solution_line` | DOCUMENTED_ONLY | Preserve all candidate best moves as the solution line. |
| `best_moves` | `candidate_better_move` | DOCUMENTED_ONLY | Candidate may be first or explicitly selected best move; this must remain diagnostic, not label truth. |
| `difficulty` | `difficulty_level` | DOCUMENTED_ONLY | Numeric difficulty can be preserved or rendered as a string level. |
| `validation` | `search_evidence` or `validation_evidence` | DOCUMENTED_ONLY | Validation evidence is diagnostic only. |
| `seed` | `source_report` or `rng_metadata` | DOCUMENTED_ONLY | Preserve generator seed and source route. |

### Missing Fields for `rng_tutorial_source`

| Field | Required status | Notes |
|---|---:|---|
| `observed_bad_move` | NOT_FOUND | RNG/tutorial puzzles do not represent an observed Rocky error. |
| `source_game_id` | NOT_FOUND | Current `PuzzleCase` has `case_id`, not source game provenance. |
| `source_ply` | NOT_FOUND | Current `PuzzleCase` has no source ply. |
| `neural_context` | UNKNOWN | No neural context is present in `PuzzleCase`. |
| `explanation_md` | DOCUMENTED_ONLY | Future explanation placeholder only. |
| `humangate_required` | IMPLEMENTED by future adapter requirement | Must be set to `true`. |
| `dataset_admissible` | IMPLEMENTED by future adapter requirement | Must be set to `false`. |
| `replay_status` | IMPLEMENTED by future adapter requirement | Must start as `candidate`. |

### Blocked Fields for `rocky_error_source`

| Field | Status | Blocker |
|---|---:|---|
| `source_game_id` | BLOCKED | Blocked until structured error input exists. |
| `source_ply` | BLOCKED | Blocked until structured error input exists. |
| `observed_bad_move` | BLOCKED | Blocked until structured error input exists. |
| `candidate_better_move` | BLOCKED | Blocked until a legal/search adapter exists. |
| `source_report` | BLOCKED | Blocked until an observation source contract exists. |

## Invariants

Any future integration must preserve:

- `humangate_required: true`
- `dataset_admissible: false`
- `replay_status` starts as `candidate`
- selected move is not label truth
- search move is not automatically dataset truth
- neural move is not authority
- puzzle is diagnostic/pedagogical artifact only
- no dataset row creation
- no training readiness implied
- no benchmark proof
- no model promotion
- no `latest.json`
- no `lab/runs/RUN_*`

## Future Implementation Lanes

These lanes are future options only. They are not authorized by this contract.

| Lane | Status | Future scope |
|---|---:|---|
| Lane A | DOCUMENTED_ONLY | Tests-only schema fixture for `PuzzleCandidate`. |
| Lane B | DOCUMENTED_ONLY | Adapter from `PuzzleCase` to `PuzzleCandidate` for `rng_tutorial_source`. |
| Lane C | BLOCKED | Observation/error source contract for `rocky_error_source`. |
| Lane D | BLOCKED | One-pass sandbox dry run under `lab/gameplay_observation/sandbox_outputs/error_puzzles/`. |
| Lane E | DOCUMENTED_ONLY | Replay/eval linkage without dataset promotion. |

## Dormant Agent Review

Dormant roles are passive review lenses only. They are not activated agents.

| Role | Responsibility | Blocked authority |
|---|---|---|
| Producer / Planner | Review scope, lane order, routing, and HumanGate questions. | No execution, approval, merge, claim, activation, branch, PR, or publication authority. |
| Puzzle / Curriculum Specialist | Review theme, difficulty, vocabulary, lesson tags, and explanation placeholder shape. | No puzzle generation, puzzle promotion, dataset row creation, or training signal authority. |
| Error Extraction Specialist | Review future observed-error input requirements and ambiguity rejection criteria. | No runtime mutation, source fabrication, dataset generation, or label authority. |
| Dataset Gate Specialist | Review `humangate_required`, `dataset_admissible`, provenance, ActionId, LegalAction, and ActionMask prerequisites. | No dataset promotion, dataset reset, training, or model promotion authority. |
| Quality / Evidence Director | Review diagnostic evidence limits and replay/eval interpretation. | No benchmark proof, public claim approval, release authority, or Rocky improvement claim. |
| Memory / Evidence Director | Review source anchoring, provenance, and document drift. | No source mutation outside scope, dataset promotion, training approval, or automatic rule mutation. |
| Architecture Director | Review Rust/Python boundary and adapter placement. | No runtime patch, Chess960 activation, ActionMask activation, DecisionController activation, or runtime authority change. |

## Non-Authorization

This contract does not authorize:

- runtime implementation
- test modification
- puzzle generation
- dataset generation
- dataset promotion
- training
- benchmark
- `latest.json`
- `lab/runs/RUN_*`
- model/checkpoint creation
- model promotion
- agent activation
- Chess960 activation
- ActionMask activation
- DecisionController activation
- commit
- push
- branch
- PR

## Output Routing

produced_file_type: "roadmap documentation contract"  
intended_surface: "roadmap_docs_only"  
canonical_destination: "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/10_ROADMAP/SHARED_PUZZLE_CANDIDATE_ADAPTER_CONTRACT_V0.md"  
temporary_destination: ""  
forbidden_destinations:

- "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/"
- "C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/12_PIPELINE_OPENING_LEGACY/"
- "C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab/lab/"
- "latest.json"
- "lab/runs/RUN_*"
- "dataset directories"
- "model or checkpoint directories"

registration_required: false  
project_source_upload_required: true  
promotion_gate: "HumanGate"

Routing note: the exact `canonical_destination` above is the only authorized write target for this docs-only task. The broad forbidden destinations remain blocked for all other outputs.

## Verdicts

software_verdict:

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

evidence_verdict:

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: TESTED
- inference: PASSIVE

claim_verdict:

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

claim_posture: "NO_CLAIM_ALLOWED"
