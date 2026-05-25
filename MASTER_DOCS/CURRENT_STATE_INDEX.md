# Current State Index

## 1. Purpose and limits

This file is a navigation and classification index only.

It does not create a new control-plane. It does not create a new SSOT family. It does not create implementation authority, runtime authority, benchmark authority, promotion authority, or claim authority.

It exists to reduce Markdown sprawl ambiguity after PP9-PP19 and the main docs synchronization.

claim_verdict: NO_CLAIM_ALLOWED

## 2. Repo truth order

1. Active source/runtime truth outranks documentation.
2. Runtime, build, and valid evidence outputs outrank roadmap text.
3. Current docs outrank historical, archive, pointer, and generated docs.
4. HumanDecision remains final authority for merge, reject, freeze, promotion, activation, and claim status.

## 3. First docs to read

- `AGENTS.md`
- `README.md`
- `MASTER_DOCS/DOCS_STATUS.md`
- `MASTER_DOCS/00_EXEC_SUMMARY.md`
- `MASTER_DOCS/01_CURRENT_STATE.md`
- `MASTER_DOCS/02_COMMAND_CHEATSHEET.md`
- `MASTER_DOCS/03_KNOWN_ISSUES.md`
- `MASTER_DOCS/05_ARCHITECTURE.md`
- `MASTER_DOCS/LOCAL_HISTORY_ROADMAP_STATUS.md`

## 4. Active canonical docs

Classification: ACTIVE_CANONICAL

These are the current entry points and current truth summaries that future Codex runs should read first.

- `AGENTS.md`
- `README.md`
- `MASTER_DOCS/DOCS_STATUS.md`
- `MASTER_DOCS/00_EXEC_SUMMARY.md`
- `MASTER_DOCS/01_CURRENT_STATE.md`
- `MASTER_DOCS/02_COMMAND_CHEATSHEET.md`
- `MASTER_DOCS/03_KNOWN_ISSUES.md`
- `MASTER_DOCS/05_ARCHITECTURE.md`
- `MASTER_DOCS/LOCAL_HISTORY_ROADMAP_STATUS.md`

## 4A. Local AM stack historical reference

Classification: HISTORICAL_REFERENCE_LOCAL_STATUS_NOTE

Current-state authority note:

- This section is historical/reference context only. Its hardcoded branch, remote, SHA, path, ahead/behind, local-readiness, and local-history statements must not be treated as current repo truth.
- Live Git preflight is the current truth source for branch, HEAD, remote, ahead/behind, and path statements. For this cleanup pass, live preflight was branch `master`, HEAD `dd9a7400528c36c79437d493a54cb0f82ea4e7c9`, status `## master...origin/master`.
- Runtime, test, dataset, training, Chess960, neural, benchmark, product, scientific, strength, and readiness claims are not altered or promoted by this reference demotion.
- claim_verdict remains `NO_CLAIM_ALLOWED`.

PACK 9D is merged on GitHub. After PACK 9D, local `main` accumulated 37 commits ahead of `origin/main` and 0 behind.

Current split:

- local HEAD after AM-DATA-10: `eddf4fac`
- GitHub `origin/main`: `6a3314b573cb33350ad3a08a97112683d1ce4112`
- GitHub main does not yet contain the AM stack.
- GitHub main: NOT_FOUND for the local AM stack.
- clean clone PACK7B does not contain `eddf4fac`.
- PR, push, and CI are BLOCKED by money/CI constraints.
- local archive: `LOCAL_ARCHIVE/AM_SYNC_3L_22_COMMITS_NO_CI/`, PASSIVE local archive only.

AM stack includes ActionMask authority docs, minimal Rust ActionMask skeleton, chess legal-action adapter, ActionId / LegalAction constants, ActionMask provenance snapshot, HumanGate contract and minimal core, opponent response mask helper, MirrorRiskSummary, bounded root mirror ordering, mirror/root ordering diagnostics, search mirror ordering extraction, root ordering extraction, search diagnostics structs extraction, search diagnostics accumulators extraction, search diagnostics builders/emission extraction through AM-SEARCH-12, AM helper stack fail-closed hardening through AM-CORE-6, Python dataset admission fail-closed gate through AM-DATA-5, standard Python move_vocab helper parity evidence through AM-DATA-8, and representative Rust-generated legal-action sample parity evidence through AM-DATA-10.

AM helper stack frozen locally:

- AM-DATA-10 completed locally.
- HEAD after AM-DATA-10: `eddf4fac`.
- Local `main` is 37 commits ahead of `origin/main` and 0 behind.
- GitHub main is NOT_FOUND for the local AM stack.
- GitHub main is NOT_FOUND for the local AM/Data stack.
- CI/PR/push are BLOCKED by money/CI constraints.

AM search decomposition status:

- search decomposition: IMPLEMENTED_AND_TARGET_TESTED locally through AM-SEARCH-12
- new module: `src/chess/search_diagnostics_builders.rs`
- moved responsibilities: `build_root_mate_diagnostics`, `build_root_diagnostics`, `maybe_emit_runtime_diagnostics`, `search_runtime_diagnostics_enabled`, and related diagnostics-local builders/helpers
- `src/chess/search.rs` retains public search entrypoints, root loop, negamax, quiescence, transposition table integration, killer/history heuristics, budget/depth/node guards, ordering calls, and result assembly
- diagnostics builders split: IMPLEMENTED / TESTED locally
- deeper search splits: DEFERRED unless explicitly reopened
- negamax/quiescence/TT/killer-history splits: DEFERRED

Surface status:

- active runtime code: IMPLEMENTED locally / NOT_FOUND on GitHub main
- tests: TESTED only by previously reported targeted cargo commands
- artifacts/runtime outputs: PASSIVE local archive only
- canonical docs: DOCUMENTED_ONLY where applicable
- roadmap/docs-only: DOCUMENTED_ONLY
- inference: PASSIVE
- ActionId: IMPLEMENTED / TESTED locally for standard runtime identity; dataset labels BLOCKED
- LegalAction: IMPLEMENTED / TESTED locally; minimal `action_id` + `action_key`; no explicit actor/target/provenance fields
- Chess LegalAction adapter: IMPLEMENTED / TESTED locally
- ActionMask: IMPLEMENTED / TESTED Rust helper; not search authority; dataset authority BLOCKED
- ActionMaskProvenance: IMPLEMENTED / TESTED locally; dataset sufficiency BLOCKED
- HumanGate metadata link: IMPLEMENTED / TESTED locally
- HumanGate promotion authority: BLOCKED
- Python `legal_mask` authority: PASSIVE helper / not authority
- Python legal_mask authority: PASSIVE helper only / not authority
- Python validate_am_dataset_admission(row): IMPLEMENTED / TESTED / fail-closed
- AdmissionResult: IMPLEMENTED / TESTED
- DatasetAdmissionError: IMPLEMENTED
- TeacherDataset admission gate: IMPLEMENTED_AND_TESTED
- train.py: PASSIVE unchanged; protected by TeacherDataset boundary before checkpoint writes
- Python move_vocab standard helper: IMPLEMENTED / TESTED
- Standard move-vocab parity: TESTED for current Python helper policy
- Rust-generated legal-action sample parity: IMPLEMENTED_AND_TESTED
- Rust/Python standard move compatibility: TESTED_SAMPLE_ONLY
- Policy index compatibility: TESTED_SAMPLE_ONLY
- sample position count: 5
- Rust-generated key count: 16
- promotions covered: TESTED
- castling covered: TESTED
- captures covered: TESTED
- debug fallback unencodable: TESTED fail-closed
- all sampled keys policy-encodable: YES
- all sampled indices roundtrip: YES
- legal_action_version: legal_action_v0
- action_mask_version: action_mask_v0_skeleton
- move_vocab size: 4164
- move_vocab fingerprint: 690ce94afd536cba509442f7c184da0e9c6a765a226d6350d259f4a88e54f18c
- coordinate entries: 3988
- promotion entries: 176
- classical castling keys: TESTED
- debug/malformed keys: TESTED fail-closed
- full Python vocab roundtrip: TESTED
- duplicate indices: TESTED, none found
- Search boundary: IMPLEMENTED; search remains final authority
- Search decomposition: IMPLEMENTED_AND_TARGET_TESTED locally / frozen
- GitHub main local AM stack: NOT_FOUND
- CI/PR/push: BLOCKED by money/CI constraints
- Dataset admission: fail-closed / BLOCKED
- Dataset label readiness: BLOCKED
- Training readiness: BLOCKED
- No admissible dataset row path exists yet.
- No training run is allowed now.
- No dataset generation/reset is allowed now.
- Non-UCI/debug/unencodable actions: fail-closed / TESTED
- dataset/training: BLOCKED
- Chess960 runtime: BLOCKED
- Chess960 labels: BLOCKED
- Chess960 dataset/runtime: BLOCKED
- ActionMask dataset authority: BLOCKED
- Rust/Python ActionMask compatibility: UNKNOWN/BLOCKED
- Rust/Python ActionMask authority: BLOCKED/UNKNOWN
- Neural authority: PASSIVE / proposal-rerank only
- claim verdict: NO_CLAIM_ALLOWED

Warnings:

- Do not treat the local AM stack as shared canonical repo truth until push, PR, and merge are authorized.
- Local AM helper stack freeze does not mean shared GitHub main truth.
- This docs update does not promote the local stack to shared GitHub main truth.
- This docs update does not promote local state to GitHub main truth.
- Local AM helper implementation does not equal shared GitHub main truth.
- Local AM helper implementation does not authorize dataset labels, training, Chess960 runtime, neural authority, or readiness claims.
- AM-DATA-8 does not authorize dataset labels, training, Chess960, neural authority, or product/scientific/strength/readiness claims.
- AM-DATA-10 does not authorize dataset labels, training, Chess960, neural authority, or product/scientific/strength/readiness claims.
- Rust-generated legal-action sample parity is representative sample only.
- Rust-generated legal-action sample parity is not exhaustive Rust generator proof.
- Rust-generated legal-action sample parity is Not ActionMask authority.
- Rust/Python standard move compatibility is TESTED_SAMPLE_ONLY.
- Policy index compatibility is TESTED_SAMPLE_ONLY.
- Local docs are not GitHub main truth until push/PR/merge is authorized.
- Standard move-vocab parity is standard-UCI helper compatibility only.
- Standard move-vocab parity is not a legality oracle.
- Standard move-vocab parity is not exhaustive Rust generator proof.
- The Python gate blocks unsafe data; it does not make training ready.
- Local test reports are local evidence only.
- Local archive/reports/logs remain passive evidence.
- Do not treat local archive, reports, logs, or benchmark summaries as implementation proof.
- Benchmark/log/report artifacts remain passive evidence only.
- Repo inspection remains required before future claims.
- No dataset label promotion, training, Chess960 runtime, neural authority, product/scientific/strength/readiness claim is authorized.
- Dataset/training: BLOCKED.
- Future dataset admission requires explicit HumanDecision/HumanGate promotion path and Rust/Python compatibility contract.
- Future Rust/Python ActionMask authority requires a separate versioned compatibility contract and broader coverage.
- Future admissible rows must include ActionId, LegalAction, ActionMask/provenance, HumanGate state, move_vocab_fingerprint, ruleset, variant, and contamination status.
- Future Chess960 work requires explicit FEN/castling/action identity contracts.
- Rust-generated sample parity is frozen unless explicit HumanDecision reopens it.
- AM-DATA standard vocab parity is frozen unless explicit HumanDecision reopens it.
- AM-DATA runtime wiring is frozen after AM-DATA-8 unless explicitly reopened.
- Next safe actions are read-only audit for exhaustive Rust legal-action coverage feasibility, tests-only expansion if explicitly chosen, docs sync, or local archive if requested.
- Runtime patches for dataset admission allow-path, training, Chess960, or ActionMask authority remain BLOCKED unless explicitly authorized.

## 5. Active reference docs

Classification: ACTIVE_REFERENCE

These docs remain useful active references, but they are not the first authority surface.

- `MASTER_DOCS/06_DECISION_LOG.md`
- `MASTER_DOCS/07_PROJECT_HISTORY.md`
- `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md`
- `MASTER_DOCS/AUTOMATION_OPERATING_NOTICE.md`
- `MASTER_DOCS/TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md`
- `docs/control-plane/README.md`
- `AI_MEMORY/README.md`
- `templates/README.md`

Kenpachi duplicate routing note:

- `00_STUDIO_CONTROL/06_CODEX/KENPACHI_CODEX_LOCAL_PARAMETERS.md` is the canonical route for `KENPACHI_CODEX_LOCAL_PARAMETERS.md`.
- The former control-plane duplicate was removed after HumanGate cleanup authorization; remaining references to that removed duplicate belong to historical cleanup evidence only.
- This note does not authorize delete, move, rename, archive, registry update, source-index update, runtime action, or claim escalation.
- claim_verdict remains `NO_CLAIM_ALLOWED`.

## 6. Passive boundary docs

Classification: PASSIVE_BOUNDARY_DOC

These docs describe passive boundaries, contracts, adapters, policies, matrices, schemas, or gate packets. They do not activate runtime behavior by themselves.

- `LAB_POLICY_BOOTSTRAP.md`
- `SECURITY_BOUNDARY.md`
- `THREAT_MODEL.md`
- `MASTER_DOCS/AUTOMATION_CONTROLLER_CONTRACT.md`
- `MASTER_DOCS/AUTOMATION_BATCH_CONTROLLER.md`
- `MASTER_DOCS/AUTOMATION_GPT_PLATFORM_BRIDGE.md`
- `MASTER_DOCS/AUTOMATION_LANE_MATRIX.md`
- `MASTER_DOCS/AUTOMATION_SMOKE_MATRIX.md`
- `MASTER_DOCS/LEARNING_TRACE_V1_STANDARD.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_DECISION_ROUTING_CONTRACT_PLAN_V0.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_SPLIT_INVENTORY_GATE_PACKET_V0.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_POLICY_VALUE_PASSIVE_INTERFACE_DECISION_V0.md`
- `docs/control-plane/*CONTRACT*`
- `docs/control-plane/*POLICY*`
- `docs/control-plane/*MATRIX*`
- `docs/control-plane/*BOUNDARY*`
- `docs/control-plane/*PACKET*`
- `docs/control-plane/*SCHEMA*`

## 7. Planning roadmap docs

Classification: PLANNING_ROADMAP

These docs are roadmap and future-direction material only. They are not proof of implementation.

- `MASTER_DOCS/02_ROADMAP_90D.md`
- `MASTER_DOCS/09_ROCKY_VARIANT_FREEZE.md`
- `MASTER_DOCS/AAA_TACTICAL_CORE_ARCHITECTURE.md`
- `MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md`
- `MASTER_DOCS/29_FREE_CLEAN_OPERATOR_PACK.md`
- `MASTER_DOCS/LEARNING_SYSTEM_FOUNDATIONS_EVIDENCE_INDEX.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_DECOMPOSITION_ROADMAP_V0.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md`
- `docs/control-plane/CHESS960_CAMPAIGNPLAN_DRAFT_V0.md`
- `docs/control-plane/PATCHPACK_CAMPAIGN_PLAN_V0.md`

## 8. Archive/context docs

Classifications: STALE_DO_NOT_USE, ARCHIVE_CONTEXT_ONLY

These docs can preserve history, pointers, old audits, old reprise prompts, local notes, product-roadmap context, or legacy trace. They should not guide current work unless a current active doc explicitly points to them for historical context.

- `MASTER_DOCS/CURRENT_CODE_AUDIT_AND_KNOWN_ISSUES.md`
- `MASTER_DOCS/08_REPRISE_PROMPT.md`
- `MASTER_DOCS/11_GPT55_BROWSER_REPRISE_PROMPT.md`
- `MASTER_DOCS/16_MULTI_AGENT_STUDIO_CONSTITUTION.md`
- `MASTER_DOCS/17_PR_AGENT_TUTORIAL.md`
- `MASTER_DOCS/18_AGENT_REGISTRY.md`
- `MASTER_DOCS/19_AGENT_GUARDRAIL_POLICY.md`
- `MASTER_DOCS/20_LOCAL_AGENT_PR_OPERATOR.md`
- `MASTER_DOCS/28_AI_REVIEW_COUNCIL.md`
- `MASTER_DOCS/AUTOBATTLER_RELECTURE_2026_04_26/*.md`
- `MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/*.md`
- `MASTER_DOCS/ARCHIVE/LEGACY_ROOT_DOCS/*.md`

## 9. Generated/evidence docs

Classification: GENERATED_OR_EVIDENCE

Generated, reporting, benchmark, audit, lab, and evidence Markdown must not be treated as active implementation authority.

- `MASTER_DOCS/04_BENCHMARK_LEDGER.md`
- `SECURITY_AUTOMATION_AUDIT.md`
- `lab/**/*.md`
- `lab/reports/*.md`
- `lab/gameplay_observation/*.md`
- `lab/ci/*.md`
- `lab/gates/**/*.md`
- `lab/claim_data_gates/**/*.md`
- `lab/gpt_audit/**/*.md`
- `lab/run_contracts/**/*.md`
- `docs/evidence/ACTIONMASK_AUTHORITY_CONTRACT_V0.md` - docs-only ActionMask authority contract; AM-5/AM-7 technical ActionMask chain may exist; dataset authority/training and Chess960 remain blocked; provenance and HumanGate required; claim_verdict: NO_CLAIM_ALLOWED.
- `docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md`

## 10. Current PP9-PP19 status

- PP9-PP19 track closed.
- LegalAction / ActionId adapter remains passive.
- SearchBackend remains passive.
- DecisionController remains passive.
- NeuralPolicyValue remains a paper-only candidate.
- No runtime activation is authorized by this index.
- No neural activation is authorized by this index.
- No ML activation is authorized by this index.

claim_verdict: NO_CLAIM_ALLOWED

## 11. Future doc workflow

- Update this index after major documentation tracks.
- Use `MASTER_DOCS/DOC_ARCHIVE_DEMOTION_MAP.md` before moving, deleting, renaming, or physically archiving docs.
- Do not physically archive docs without a separate HumanDecision.
- Do not treat navigation updates as implementation evidence.

## 12. Final verdicts

implementation_allowed_now: NO
runtime_changes_allowed_now: NO
neural_changes_allowed_now: NO
ml_changes_allowed_now: NO
new_control_plane_allowed_now: NO
file_moves_allowed_now: NO
file_deletions_allowed_now: NO
physical_archive_allowed_now: NO
claim_verdict: NO_CLAIM_ALLOWED
