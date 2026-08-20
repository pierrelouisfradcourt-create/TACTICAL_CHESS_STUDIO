# ENGINE SEARCH NEURAL DECOMPOSITION ROADMAP V0

Status: docs-only roadmap
Scope: AAA architecture debt planning for engine/search/neural decomposition
implementation_allowed_now: NO
claim_verdict: NO_CLAIM_ALLOWED

## 1) Purpose

This document is a docs-only roadmap for PatchPack sequencing.
Its goal is monolith decomposition discipline, not an AlphaStar claim.
No runtime/search/neural/ML implementation is authorized in this document.

Required posture:
- `implementation_allowed_now: NO`
- `claim_verdict: NO_CLAIM_ALLOWED`

## 2) Non-goals

This roadmap does not authorize:
- engine refactor
- search refactor
- neural refactor
- ML or training changes
- FEN parser or serializer implementation
- castling runtime implementation
- benchmark/performance claim
- AlphaStar-like proof claim

## 3) Authoritative Sources

Primary source: `PATCHPACK_9_PREFLIGHT_REPORT` provided for this phase.

From that preflight packet, this roadmap treats the following as authoritative boundaries:
- `HYBRID_GAME_AI_PLATFORM_PLAN` as implementation-order roadmap
- `AAA_TACTICAL_CORE_ARCHITECTURE` as long-term tactical-core doctrine
- `05_ARCHITECTURE`, `03_KNOWN_ISSUES`, and `DOCS_STATUS` as current truth and claim constraints
- control-plane V1.1 as governance boundary

Preflight carry-over used in this roadmap:
- branch was `main`
- `main_synced: YES`
- `working_tree_clean: YES`
- `latest_main_sha: d186f97f`
- PR `#231` through `#236` present on main
- Chess960 setup/factory/FEN contract/FEN decision controlled
- FEN parser/serializer remains blocked
- current priority pivots to AAA architecture debt: engine/search/neural decomposition

## 4) Decomposition Doctrine

Doctrine for this roadmap:
- no one-shot rewrite
- extract -> isolate -> encapsulate -> stabilize -> redirect
- runtime chess remains operational throughout
- standard behavior must stay unchanged
- search remains final authority
- neural never decides alone
- data/training must wait for stable `ActionId` / `LegalAction` / `ActionMask`

Rocky trace observation and dataset-safety guidance is documented in `docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md`; it is guidance only and does not authorize implementation.

## 5) Current Monolith Surfaces

Current surfaces to freeze before implementation:
- engine surface: `src/engine/engine.rs`
- search surface: `src/chess/search.rs` and `src/chess/search/`
- decision routing surface: `src/chess/decision.rs`
- neural surface: `src/agents/neural_agent.rs`
- ML coupling: `ml/infer_policy.py`, `ml/move_vocab.py`, `ml/dataset_loader.py`, `ml/train.py`, `ml/dataset_decision_router.py`

Highest-risk files/surfaces from preflight characterization:
- `src/chess/search.rs`
- `src/chess/decision.rs`
- `src/agents/neural_agent.rs`
- `ml/dataset_decision_router.py`
- FEN parser/serializer boundary (blocked)

## 6) Already Passive Or Partially Decomposed Surfaces

Preflight-noted passive or partially decomposed surfaces:
- passive `SearchBackend`
- `PolicyGuide`
- `DecisionController`
- `TacticalEnv`
- `ActionId`
- `LegalAction`
- `ChessVariant` metadata
- Chess960 generator
- passive Chess960 factory
- root decision extraction (where already present)

## 7) Chess960/FEN Implication

Chess960 exposure has surfaced assumptions across setup, variant boundaries, FEN contract, castling, search keying, and neural compatibility.
FEN parser/serializer remains blocked.
Any Chess960-ready claim remains forbidden.
Chess960 work currently supports decomposition discipline by forcing explicit variant boundaries.

## 8) PP10-PP18 Roadmap

### PP10 - Engine/Search/Neural Surface Inventory
- type: docs-only
- goal: freeze current surfaces and exact boundaries before code
- risk: LOW
- forbidden: no source/test/runtime edits

### PP11 - Engine Determinism Characterization
- type: tests-only
- goal: cover legal action ordering, simulate/undo restore, FEN key shape, standard castling invariants
- risk: MEDIUM
- forbidden: no behavior changes

### PP12 - Passive Engine LegalAction Adapter
- type: code-bounded
- goal: expose narrow adapter from existing legal actions to `LegalAction`/`ActionId`
- risk: MEDIUM
- forbidden: no replacement of `Action`, move generation, execution, or search routing

### PP13 - Search Root Boundary Characterization
- type: tests-only
- goal: lock current root search result/diagnostic behavior and root clone boundary
- risk: MEDIUM
- forbidden: no search tuning, benchmark, or strength claim

### PP14 - Passive SearchBackend Adapter
- type: code-bounded
- goal: wrap existing search behind passive `SearchBackend` tests without changing active runtime path
- risk: HIGH
- forbidden: no broad `search.rs` rewrite or default routing switch

### PP15 - Decision Routing Contract Plan
- type: docs-only
- goal: map legacy `src/chess/decision.rs` to future `DecisionController` without activation
- risk: MEDIUM
- forbidden: no active router mutation

### PP16 - Passive DecisionController Adapter
- type: code-bounded
- goal: add passive/test-only controller adapter preserving search authority
- risk: HIGH
- forbidden: no default Hybrid behavior change and no neural authority expansion

### PP17 - Neural Split Inventory and Gate Packet
- type: docs-only
- goal: split neural responsibilities on paper: bridge, scoring, rerank, fallback, telemetry, memory
- risk: HIGH
- forbidden: no `neural_agent.rs`, Python, model, dataset, or inference mutation

### PP18 - NeuralPolicyValue Passive Interface Decision
- type: docs-only
- goal: prepare HumanDecision for whether passive neural interface can be added
- risk: HIGH
- forbidden: no training, model loading, Python bridge changes, or neural readiness claim

## 9) HumanDecision Gates

HumanDecision is required before:
- any source refactor
- any `SearchBackend` activation
- any `DecisionController` activation
- any neural interface activation
- any ML/dataset/training change
- any benchmark/performance claim
- any AlphaStar-like public claim

## 10) Stop Conditions

Stop and escalate if any of the following occur:
- any `src/`, `ml/`, `tests/`, `scripts/`, `schemas/`, or workflow surfaces are touched in PP9 scope
- any parser/serializer work begins
- any runtime behavior changes
- any benchmark/performance/readiness claim appears
- any PatchPack 10 implementation begins
- any ambiguity appears around HumanDecision gates

---

software_verdict: DOCS_ONLY_ROADMAP_PACKET
evidence_verdict: PREFLIGHT_SCOPED_PLANNING_ONLY
claim_verdict: NO_CLAIM_ALLOWED
