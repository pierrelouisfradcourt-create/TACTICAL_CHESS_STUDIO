# CostSearch V0 Freeze Status

Status: DOCUMENTED_ONLY
Surface: canonical_docs
Runtime authority: NONE
Search authority changed: NO
Neural authority changed: NO
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation: BLOCKED
Agent activation: BLOCKED
Chess960 activation: BLOCKED
DecisionController activation: BLOCKED
Claim posture: NO_CLAIM_ALLOWED
Recommendation: stop_at_V0

---

## 1. Purpose

This document freezes the verified CostSearch V0 state for TacticalChessPureLab.

It is a canonical docs-only status record. It does not authorize runtime changes, test changes, CLI wiring, Search wiring, selfplay wiring, tournament wiring, training, benchmarks, dataset generation, model creation, artifact generation, agent activation, Chess960 activation, DecisionController activation, commits, pushes, branches, pull requests, or claim escalation.

Future CostSearch work requires HumanGate.

---

## 2. CostSearch V0 Boundary

CostSearch V0 is observation-only.

The implemented boundary is:

- Rust remains runtime truth.
- Search remains final authority.
- Neural may propose or rerank only where already authorized by existing code.
- CostSearch does not decide moves.
- CostSearch does not change scoring, ordering, legality, Search authority, or Neural authority.
- CostSearch reports are not benchmark proof.
- CostSearch reports are not dataset labels.
- CostSearch reports are not model evidence.
- CostSearch reports are not strength or Elo claims.

---

## 3. Implemented Surfaces

| Surface | Status | Evidence |
| --- | --- | --- |
| Helper module | IMPLEMENTED | `src/chess/cost_search_observability.rs` |
| Helper export | IMPLEMENTED | `src/chess/mod.rs` exports `cost_search_observability` |
| Writer | IMPLEMENTED | `CostSearchReportWriter` |
| Safe route guard | IMPLEMENTED | `validate_cost_search_output_dir` |
| `latest.json` rejection | IMPLEMENTED | `LatestJsonForbidden` and latest alias rejection |
| `lab/runs/RUN_*` rejection | IMPLEMENTED | `LabRunsRunStarForbidden` |
| Game 1 detail limiter | IMPLEMENTED | `allows_cost_search_detail_report(game_id)` permits detail only for `game_id == 1` |
| Simulation runner wiring | IMPLEMENTED | `src/simulation/simulation_runner.rs` uses an opt-in writer after decision selection |

---

## 4. Tested Surfaces

| Surface | Status | Evidence |
| --- | --- | --- |
| Helper safe route acceptance | TESTED | `tests/cost_search_observability.rs` |
| Helper `latest.json` rejection | TESTED | `tests/cost_search_observability.rs` |
| Helper `lab/runs/RUN_*` rejection | TESTED | `tests/cost_search_observability.rs` |
| Helper game 1 detail limiter | TESTED | `tests/cost_search_observability.rs` |
| Helper non-game-1 detail skip | TESTED | `tests/cost_search_observability.rs` |
| Simulation default disabled | TESTED | `src/simulation/simulation_runner.rs` test module |
| Simulation safe route through wiring | TESTED | `src/simulation/simulation_runner.rs` test module |
| Simulation forbidden routes through wiring | TESTED | `src/simulation/simulation_runner.rs` test module |
| Simulation selected action unchanged | TESTED | `src/simulation/simulation_runner.rs` test module |
| Simulation non-search diagnostics not fabricated | TESTED | `src/simulation/simulation_runner.rs` test module |

---

## 5. Passive Artifact State

CostSearch V0 can emit observation detail only when explicitly enabled by a safe output directory.

Default behavior:

- default disabled: YES
- opt-in gate: `TCS_COST_SEARCH_OUTPUT_DIR`
- safe output route required: `lab/gameplay_observation/sandbox_outputs/rocky_cost_search/<run_id>/`
- detail limiter: `game_id == 1`
- non-game-1 detail: PASSIVE summary-only behavior for detail writer

Forbidden output state:

- `latest.json`: BLOCKED
- latest alias: BLOCKED
- `lab/runs/RUN_*`: BLOCKED
- datasets: BLOCKED
- models/checkpoints: BLOCKED
- runtime outputs promoted as source: BLOCKED

No runtime artifact is created by this freeze document.

---

## 6. Blocked Surfaces

| Surface | Status | Reason |
| --- | --- | --- |
| CLI wiring | PASSIVE / NOT_DONE | `run_search_profile` output shape remains outside V0 freeze scope |
| `src/chess/search.rs` wiring | BLOCKED | Search authority must remain side-effect-free for CostSearch V0 |
| selfplay wiring | BLOCKED | No V0 safe trace/diagnostics contract for selfplay |
| tournament wiring | BLOCKED | Tournament and benchmark surfaces must not gain CostSearch claims |
| benchmarks | BLOCKED | No benchmark authorization |
| training | BLOCKED | No training authorization |
| dataset generation | BLOCKED | No dataset authorization |
| Chess960 activation | BLOCKED | No activation authorization |
| DecisionController activation | BLOCKED | No activation authorization |
| agent activation | BLOCKED | No activation authorization |

---

## 7. Authority And Claims

Gameplay authority changed: NO

Search authority changed: NO

Neural authority changed: NO

CLI authority changed: NO

Tournament authority changed: NO

Claim verdict: NO_CLAIM_ALLOWED

CostSearch V0 evidence supports only the statement that the helper and bounded simulation observability wiring exist and are tested. It does not support gameplay, strength, benchmark, dataset, model, or production-readiness claims.

---

## 8. Stop Recommendation

Recommended state: stop_at_V0

Rationale:

- The helper is implemented and tested.
- The safest simulation wiring point is implemented and tested.
- The default path remains disabled.
- Output is safe-route gated.
- Forbidden latest and lab run routes are blocked.
- Search and Neural authority remain unchanged.
- CLI, Search, selfplay, and tournament wiring remain passive or blocked.

Next work should not proceed without an explicit HumanGate task. A later CLI command is possible only if separately authorized with a narrow output contract that preserves `NO_CLAIM_ALLOWED`, rejects `latest.json`, rejects `lab/runs/RUN_*`, and does not promote runtime artifacts as source.

---

## 9. Final Status By Surface

| Surface | Status |
| --- | --- |
| active_runtime_code | IMPLEMENTED |
| tests | TESTED |
| artifacts_runtime_outputs | PASSIVE |
| canonical_docs | DOCUMENTED_ONLY |
| roadmap_docs_only | DOCUMENTED_ONLY |
| inference | PASSIVE |

---

## 10. Final Verdicts

software_verdict: COSTSEARCH_V0_HELPER_AND_BOUNDED_SIMULATION_OBSERVABILITY_IMPLEMENTED_STOP_AT_V0

evidence_verdict: HELPER_AND_SIMULATION_WIRING_TESTED_FOR_SAFE_ROUTE_FORBIDDEN_ROUTES_GAME_1_LIMITER_AND_NO_FABRICATED_NON_SEARCH_DIAGNOSTICS

claim_verdict: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
