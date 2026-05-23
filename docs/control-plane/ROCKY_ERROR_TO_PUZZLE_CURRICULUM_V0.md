# Rocky Error-To-Puzzle Curriculum V0

Status: DOCUMENTED_ONLY
Surface: roadmap_docs_only
Runtime authority: NONE
Implementation claim: NO
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation: BLOCKED
Agent activation: BLOCKED
Claim posture: NO_CLAIM_ALLOWED

## 1. Purpose

This document preserves and formalizes the recovered Rocky auto-puzzle idea:

`error -> position -> puzzle -> replay test -> human explanation -> correction tracking`

This is a development microscope and a future curriculum layer. It is meant to turn real Rocky failures into inspectable puzzle/replay cases, explanations, and correction tracking.

This is not random puzzle generation.

This is not direct dataset generation.

This is not training.

This is error-driven curriculum infrastructure:

`real Rocky error -> critical position -> puzzle/replay test -> explanation -> solved/failed/regressed tracking`

Related principles:

- prioritized replay
- teacher-student curriculum
- search-control from states of interest
- engine-evaluated puzzle generation

## 2. Reference Repo Bricks For Future Verification

| Surface | Status | Notes |
|---|---:|---|
| `src/tool/puzzle_rng.rs` | PASSIVE | Reference brick to verify in a separate code inspection; no claim made by this doc. |
| `src/tool/puzzle_eval.rs` | PASSIVE | Reference brick to verify in a separate code inspection; no claim made by this doc. |
| `src/tool/conversion_suite.rs` | PASSIVE | Conversion-style evaluation exists and can classify solved/partial/failed, but is not the error-to-puzzle loop. |
| `lab/reverse_dataset/weakness_log.jsonl` | PASSIVE | Weakness memory surface reference only; this spec does not promote it to training. |
| `ml/adaptive_dataset.py` | PASSIVE | Python ML/tooling reference only; no dataset generation is authorized. |
| `ml/priority_training_queue.py` | PASSIVE | Priority queue reference only; training remains blocked. |
| ActionMask / LegalAction / HumanGate | PASSIVE | Guardrail reference only; no activation or dataset claim is made here. |
| Opponent response mask / MirrorRisk | PASSIVE | Useful for future risk evidence; not authority by itself. |
| Auto-puzzle end-to-end from real Rocky errors | NOT_FOUND | Missing loop targeted by this document. |
| Failure -> regression puzzle | DOCUMENTED_ONLY | Related classification/replay ideas are roadmap-only here; no complete automated failure-to-puzzle pipeline is claimed. |
| Dataset non-mutating safety | BLOCKED | Requires separate safety review before any dataset-facing use. |

## 3. Missing End-To-End Pipeline

Target pipeline:

1. Ingest a game or match error.
2. Extract the failed position.
3. Record `observed_bad_move`.
4. Identify `candidate_better_move`.
5. Classify theme.
6. Classify difficulty level: `1`, `2`, or `3`.
7. Write puzzle JSON and Markdown explanation.
8. Replay as a test.
9. Track status: `candidate`, `accepted`, `solved`, `failed`, `regressed`, `rejected`.

The pipeline must preserve provenance. The selected move, search move, or neural move is not label truth.

## 4. Difficulty Levels

### Level 1

Local tactical error.

Examples:

- mate in 1 missed
- hanging piece
- obvious capture
- simple defensive tactic
- short replay test

### Level 2

Repeated or clustered failure pattern.

Examples:

- repeated pattern
- conversion failure
- drawish or repetition behavior
- bad exchange pattern
- neural rerank or fallback pattern
- clustered replay group

### Level 3

Long scenario or strategic failure.

Examples:

- long scenario
- strategic failure
- exploiter or adversary style weakness
- opening or middlegame plan failure
- requires human explanation

## 5. Schema Proposal

Proposed record fields:

```json
{
  "puzzle_id": "string",
  "source_game_id": "string",
  "source_ply": 0,
  "fen": "string",
  "side_to_move": "white_or_black",
  "observed_bad_move": "uci",
  "candidate_better_move": "uci",
  "solution_line": ["uci"],
  "theme": "string",
  "difficulty_level": 1,
  "error_type": "string",
  "source_report": "string",
  "search_evidence": {},
  "neural_context": {},
  "explanation_md": "string",
  "replay_status": "candidate",
  "solved_count": 0,
  "failed_count": 0,
  "regressed_count": 0,
  "last_seen_head": "git_sha",
  "humangate_required": true,
  "dataset_admissible": false
}
```

Required invariants:

- `humangate_required` must be `true`.
- `dataset_admissible` must be `false`.
- Puzzle records must not be interpreted as dataset rows.
- Replay status must not imply training readiness.

## 6. Relationship To Observability

Observability layers:

- A: lightweight summary for all games.
- B: detail for `game_id=1`.
- C: anomaly reports.
- D: auto-puzzle curriculum from selected failures.

Layer D consumes selected failures from A/B/C. It must remain a sandboxed curriculum and diagnostic layer until a later HumanGate-approved promotion path exists.

## 7. Guardrails

- Puzzle is not a dataset row.
- Selected move is not label truth.
- Search move is not automatically label truth.
- Neural move is not authority.
- Report/log/latest is not proof.
- Training remains BLOCKED.
- Dataset promotion remains BLOCKED.
- HumanGate is required before any training candidate.
- Do not create `latest.json`.
- Do not create `lab/runs/RUN_*`.
- Future outputs, if built later under a separate task, must be sandboxed under `lab/gameplay_observation/sandbox_outputs/`.

## 8. Future Implementation Lanes

Do not implement in this task.

Order:

1. Docs-only spec.
2. Tests-only schema fixture.
3. Read-only extractor audit.
4. Small generator behind explicit flag.
5. Replay-test runner.
6. Human explanation Markdown.
7. Solved/failed/regressed tracking.
8. Only later: dataset/training candidate gate.

No lane may activate training, dataset promotion, Chess960, DecisionController, benchmark, or dataset reset without an explicit separate request.

## 9. Doc Drift Note

`MASTER_DOCS/LEARNING_TRACE_V1_STANDARD.md` may be stale or scoped narrowly because puzzle RNG/eval surfaces are referenced elsewhere while that document states there is no puzzle/training implementation.

Do not edit `MASTER_DOCS/LEARNING_TRACE_V1_STANDARD.md` in this task unless explicitly requested later.

## 10. Final Status Block

software_verdict: ROCKY_ERROR_TO_PUZZLE_CURRICULUM_DOCS_ONLY

evidence_verdict: EXISTING_PUZZLE_AND_WEAKNESS_BRICKS_MAPPED_AUTO_PUZZLE_LOOP_NOT_FOUND

claim_verdict: NO_CLAIM_ALLOWED
