# ENGINE SEARCH NEURAL SPLIT INVENTORY GATE PACKET V0

Status: docs/test stabilization neural split inventory and gate packet
Scope: NeuralAgent split stabilization only
Primary source: live code readback at `6fb4dc63708f33738b7fc834a61de21380607396`

## 1. Purpose and non-goals

This document records the current Rust neural split after the first extraction wave.
It inventories implemented split boundaries and the remaining active `NeuralAgent` ownership.
It does not authorize neural, ML, or runtime implementation.
It does not authorize activation of `DecisionController` or `SearchBackend`.
It does not authorize PP18 implementation or roadmap fusion.

Required gates:
- implementation_allowed_now: NO
- behavior_change_allowed_now: NO
- activation_allowed_now: NO
- neural_changes_allowed_now: NO
- ml_changes_allowed_now: NO
- neural_authority_expansion_allowed_now: NO
- pp18_allowed_now: NO
- master_roadmap_fusion_allowed_now: NO
- claim_verdict: NO_CLAIM_ALLOWED

Non-goals:
- no runtime behavior change
- no neural bridge/protocol/model/dataset/training/inference change
- no `DecisionController` activation
- no `SearchBackend` activation
- no readiness/strength/performance/scientific-proof claim

## 2. Preflight snapshot

- branch: main
- main_synced: LOCAL_AHEAD_ORIGIN_BY_1
- working_tree_clean_before: YES
- latest_local_sha: 6fb4dc63708f33738b7fc834a61de21380607396
- extracted_neural_modules_present: YES
- runtime_split_allowed_now: NO

## 3. Active neural surface map

Current active surfaces and couplings:
- `src/agents/neural_agent.rs` as current active final-selection owner (`NeuralAgent`)
- `src/agents/neural_protocol.rs` as extracted protocol parser/types
- `src/agents/neural_telemetry.rs` as extracted runtime counters/log helpers
- `src/agents/neural_bridge.rs` as extracted Python process bridge
- `src/agents/neural_fallback.rs` as extracted fallback/rerank labels and boundary enums
- `src/agents/neural_legal.rs` as extracted legal UCI/action helper boundary
- `src/agents/neural_context.rs` as extracted contextual profile/rerank context boundary
- `src/agents/neural_config.rs` as extracted env/path config boundary
- `src/chess/decision.rs` neural route
- `ml/infer_policy.py` bridge service
- `ml/move_vocab.py` move-index identity
- `ml/dataset_loader.py` tensor/data coupling
- `ml/train.py` training coupling
- `ml/dataset_decision_router.py` admission/routing coupling
- `ml/experiment_analytics.py` and `ml/generate_report.py` telemetry/reporting coupling

## 4. Neural responsibility clusters

Current extracted responsibilities:
- `src/agents/neural_protocol.rs`: IMPLEMENTED / TESTED. Owns `MemoryHints`, `PythonPrediction`, response parsing, and memory-hint parsing.
- `src/agents/neural_telemetry.rs`: IMPLEMENTED / TESTED. Owns runtime counters, stats snapshots, status labels, average shortlist calculation, and bridge log helper strings.
- `src/agents/neural_bridge.rs`: IMPLEMENTED / TESTED. Owns Python process lifecycle, READY wait, query path, timeout handling, and drop/restart mechanics. Bridge behavior remains active and must not be altered by split stabilization.
- `src/agents/neural_fallback.rs`: IMPLEMENTED / TESTED for labels/types only. Owns fallback reasons, selected-source labels, rerank pool labels, and rerank fallback-cause labels. It does not own fallback branch bodies.
- `src/agents/neural_legal.rs`: IMPLEMENTED / TESTED. Owns legal action to UCI conversion helpers, legal UCI checks, candidate shortlist filtering, selected action lookup, legal fallback action lookup, and selected-policy rank rules.
- `src/agents/neural_context.rs`: IMPLEMENTED / TESTED. Owns `RerankContext`, contextual move profile labels, contextual profile detection, and retrieval phase labels.
- `src/agents/neural_config.rs`: IMPLEMENTED / TESTED. Owns environment flag/value parsing and Python/script/model/project-root resolution.

Remaining clustered responsibilities inside `src/agents/neural_agent.rs`:
- `select_action` final `Action` return
- fallback branch bodies and their counter/purity/runtime-line side effects
- `select_move_with_rerank`
- scoring formulas and score-loop ordering
- purity/counter-sensitive behavior
- memory/retrieval bias application inside active rerank scoring
- finish/pressure/anti-stall scoring formulas
- private board/FEN/UCI helpers used by scoring
- Python policy output consumption and selected move identity tracking

Previously extracted from `neural_agent.rs`:
- Python process lifecycle: `src/agents/neural_bridge.rs`
- path/env/model/script resolution: `src/agents/neural_config.rs`
- bridge response protocol parsing: `src/agents/neural_protocol.rs`
- policy scoring: Python policy output handling and selected move identity tracking
- rerank: shortlist and full-legal rerank path with contextual scoring
- fallback: no-uci, predicted-not-found, and bridge-failure fallback paths
- telemetry: runtime counters and bridge log helpers extracted; move runtime/rerank/diagnostic emission remains partly in `neural_agent.rs`
- memory/retrieval hooks: optional memory payload and retrieval-weighted contextual bias
- contextual profile selection: labels/profile detection extracted; profile-weight scoring hook remains in `neural_agent.rs`
- ML coupling: policy tensorization, move indexing, dataset and train assumptions
- analytics/reporting coupling: runtime signal parsing and report summarization

## 5. Rust/Python protocol inventory

Current protocol inventory:
- request format: `fen|move1|move2|...`
- response format: `best_move|policy_index|shortlist`
- optional payload: `best_move|policy_index|shortlist|memory_json`
- error behavior: `ERROR|...` line returned from Python path
- startup handshake: `READY`
- timeout/retry/drop/restart behavior:
- startup and query timeouts are bounded (`TCS_BRIDGE_STARTUP_TIMEOUT_MS`, `TCS_BRIDGE_TIMEOUT_MS`)
- first query failure may trigger one retry and process drop/restart cycle
- failed or stale bridge path can terminate the child and respawn on next query
- parser owner: `src/agents/neural_protocol.rs` IMPLEMENTED / TESTED
- process owner: `src/agents/neural_bridge.rs` IMPLEMENTED / TESTED

Why this must not change during stabilization:
- protocol strings and field positions are consumed by current Rust parser logic
- bridge lifecycle behavior is coupled to fallback and runtime contamination accounting
- changing protocol shape would be runtime behavior work, not split stabilization

## 6. Rerank/fallback inventory

Current rerank/fallback inventory:
- legality check of Python move is enforced against legal UCI move set
- rerank pools:
- shortlist pool from candidate list when usable
- full-legal pool fallback when shortlist path cannot safely decide
- contextual scoring hooks remain active in rerank selection
- fallback reasons:
- `no_uci_moves`
- `predicted_move_not_found`
- `python_bridge_failed`
- strict-mode purity contamination counters exist and are consumed in runtime summaries
- fallback/rerank label owner: `src/agents/neural_fallback.rs` IMPLEMENTED / TESTED for labels/types only
- legal shortlist/action helper owner: `src/agents/neural_legal.rs` IMPLEMENTED / TESTED
- active fallback branch-body owner: `src/agents/neural_agent.rs` IMPLEMENTED / BLOCKED_FOR_SPLIT
- active rerank scoring owner: `src/agents/neural_agent.rs` IMPLEMENTED / BLOCKED_FOR_SPLIT

Why these remain unchanged:
- they are active runtime safety semantics
- they are tied to telemetry strings and analytics/reporting consumers
- next runtime split is BLOCKED until characterization tests exist for these boundaries

## 7. Telemetry/logging inventory

Current telemetry/logging signals include:
- `BRIDGE_*` runtime lines (`BRIDGE_OK`, `BRIDGE_TIMEOUT`, `BRIDGE_RETRY`, `BRIDGE_FAIL`, payload/status lines)
- `NEURAL_MOVE_RUNTIME|...`
- `NEURAL_MATCH_RUNTIME|...` consumer-side summary contract
- `RERANK_*` runtime lines
- `MOVE_DIAG|...`
- `policy_index` lines
- retrieval lines
- runtime counters (`selection_calls`, `successful_inferences`, `fallback_events`, fallback-reason counters, retries/recoveries)
- analytics/reporting consumers in `ml/experiment_analytics.py` and `ml/generate_report.py`
- counter/stat owner: `src/agents/neural_telemetry.rs` IMPLEMENTED / TESTED
- move-runtime/rerank/diagnostic line owner: `src/agents/neural_agent.rs` IMPLEMENTED / BLOCKED_FOR_SPLIT

Why telemetry string contracts are fragile:
- downstream parsing relies on exact prefixes and key naming
- metric rollups assume stable status/reason vocabulary
- format drift can silently corrupt analytics and contamination interpretation

## 8. Memory/retrieval and profile inventory

Current memory/retrieval and profile inventory:
- `TCS_RETRIEVAL`
- `TCS_MEMORY_CORE`
- memory hints from Python payload (`memory_json` when memory core is enabled)
- Rust-side memory/retrieval bonus rules remain in active rerank scoring path
- memory payload parser owner: `src/agents/neural_protocol.rs` IMPLEMENTED / TESTED
- retrieval phase label owner: `src/agents/neural_context.rs` IMPLEMENTED / TESTED
- retrieval query and bias application owner: `src/agents/neural_agent.rs` IMPLEMENTED / BLOCKED_FOR_SPLIT
- contextual profiles:
- `Opening`
- `Middlegame`
- `EqualEndgame`
- `WinningEndgame`
- `LosingEndgame`
- `TCS_NEURAL_PROFILE`
- `TCS_MODEL_PATH`

## 9. ML coupling inventory

Current ML coupling inventory:
- `PolicyValueNet`
- `fen_to_tensor`
- `try_move_to_index`
- `dataset_loader` / `train` / `dataset_decision_router` assumptions remain coupled to move identity and runtime outputs
- move-index identity risk: runtime and data tooling both depend on stable move-to-index mapping
- stable `ActionId` / `LegalAction` / `ActionMask` dependency remains a prerequisite before dataset/training changes

## 10. Split matrix

| Responsibility | Current owner | Future candidate boundary | Risk | PP17 action | Implementation allowed now |
| --- | --- | --- | --- | --- | --- |
| bridge/process lifecycle | `src/agents/neural_bridge.rs` + `ml/infer_policy.py` | passive neural bridge boundary (future decision only) | HIGH | IMPLEMENTED / TESTED Rust bridge extraction | NO |
| inference protocol/schema | `src/agents/neural_protocol.rs` + `ml/infer_policy.py` | explicit protocol boundary (future decision only) | HIGH | IMPLEMENTED / TESTED Rust parser extraction | NO |
| model/path resolution | `src/agents/neural_config.rs` + `infer_policy.py` model resolution | model locator boundary (future decision only) | HIGH | IMPLEMENTED / TESTED Rust config extraction | NO |
| policy scoring | `ml/infer_policy.py` + Rust consumer in `neural_agent.rs` | passive policy-value interface candidate (future decision only) | HIGH | inventory/gate only | NO |
| rerank | `src/agents/neural_agent.rs` + `src/agents/neural_legal.rs` labels/helpers | bounded rerank policy boundary (future decision only) | HIGH | helpers IMPLEMENTED / TESTED; scoring BLOCKED | NO |
| fallback | `src/agents/neural_agent.rs` + `src/agents/neural_fallback.rs` labels | explicit fallback contract boundary (future decision only) | HIGH | labels IMPLEMENTED / TESTED; branch bodies BLOCKED | NO |
| telemetry | `src/agents/neural_telemetry.rs` + active runtime lines + ML analytics/reporting consumers | telemetry contract boundary (future decision only) | HIGH | counters/log helpers IMPLEMENTED / TESTED; move lines BLOCKED | NO |
| memory/retrieval | `src/agents/neural_agent.rs` + payload hints from Python | memory/retrieval advisory boundary (future decision only) | HIGH | inventory/gate only | NO |
| profile selection | `src/agents/neural_context.rs` plus scoring hook in `src/agents/neural_agent.rs` and env profile in Python | profile selector boundary (future decision only) | MEDIUM | labels/detection IMPLEMENTED / TESTED; scoring hook BLOCKED | NO |
| move vocabulary | `ml/move_vocab.py` + runtime assumptions | stable move-identity boundary (future decision only) | HIGH | inventory/gate only | NO |
| dataset loading | `ml/dataset_loader.py` | dataset contract boundary (future decision only) | HIGH | inventory/gate only | NO |
| training | `ml/train.py` | training contract boundary (future decision only) | HIGH | inventory/gate only | NO |
| analytics/reporting | `ml/experiment_analytics.py` + `ml/generate_report.py` | reporting contract boundary (future decision only) | MEDIUM | inventory/gate only | NO |

## 11. Future passive NeuralPolicyValue gate

- PP18 may only decide whether a passive `NeuralPolicyValue` interface can be added.
- PP18 must not load models, train, change Python bridge, change runtime route, or claim readiness.
- Any future neural interface must remain bounded guidance.
- Search remains final authority.
- Neural never decides alone.

## 12. Forbidden surfaces

Explicitly forbidden for the next runtime split until characterization exists:
- moving fallback branch bodies
- moving rerank scoring formulas
- moving retrieval bias application
- moving finish/pressure/anti-stall scoring formulas
- moving final `Action` return wrappers
- changing any final selection behavior
- changing any scoring formula
- changing any fallback branch behavior

Forbidden source surfaces for this stabilization except narrow `#[cfg(test)]` characterization in `src/agents/neural_agent.rs`:
- `src/chess/decision.rs`
- `src/chess/decision_controller_adapter.rs`
- `src/chess/search_backend_adapter.rs`
- `ml/infer_policy.py`
- `ml/move_vocab.py`
- `ml/dataset_loader.py`
- `ml/train.py`
- `ml/dataset_decision_router.py`
- `ml/experiment_analytics.py`
- `ml/generate_report.py`
- `tests/**`
- `scripts/**`
- `.github/workflows/**`
- `lab/**`
- generated outputs

## 13. Stop conditions

Stop immediately if any of the following occurs:
- any non-doc file touched outside narrow `#[cfg(test)]` characterization in `src/agents/neural_agent.rs`
- any active runtime logic change
- any `ml/` / external `tests/` / `scripts/` / workflow / `lab` change
- any neural bridge/protocol/model/dataset/training/inference change
- any decision routing change
- any `SearchBackend` / `DecisionController` activation
- any neural authority expansion
- any runtime behavior change
- any benchmark/performance/readiness/scientific claim
- any PP18 implementation
- any roadmap fusion

## 14. Validation policy

Stabilization validation:
- `git status --short --branch`
- `git rev-parse HEAD`
- `rustfmt --check --config skip_children=true` on touched Rust files
- targeted neural module tests
- decision boundary tests requested by the stabilization packet
- `git diff --check`
- readback of `docs/control-plane/ENGINE_SEARCH_NEURAL_SPLIT_INVENTORY_GATE_PACKET_V0.md`
- forbidden-surface check
- `rg` marker checks

## 15. Final verdicts

software_verdict: DOCS_TESTS_STABILIZATION_ONLY
evidence_verdict: STATIC_SPLIT_ALIGNMENT_AND_TARGETED_TESTS_ONLY
claim_verdict: NO_CLAIM_ALLOWED
human_gate_required: YES
implementation_allowed_now: NO
behavior_change_allowed_now: NO
activation_allowed_now: NO
neural_changes_allowed_now: TESTS_ONLY_IN_NEURAL_AGENT
ml_changes_allowed_now: NO
neural_authority_expansion_allowed_now: NO
pp18_allowed_now: NO
master_roadmap_fusion_allowed_now: NO
