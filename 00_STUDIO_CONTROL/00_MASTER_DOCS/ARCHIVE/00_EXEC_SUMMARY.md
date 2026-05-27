# TacticalChessPureLab - Executive Summary

## What this project is

TacticalChessPureLab is a Rust chess runtime with a Python ML stack.
Rust owns move legality, search, practical policy, tournaments, telemetry, and runtime truth.
Python owns dataset loading, dataset validation, adaptive dataset refresh, training, and neural inference.

The project is no longer only a classical chess engine. It is now an adaptive chess-AI laboratory built around:

- search + neural rerank
- shared practical policy
- tactical safety checks
- reverse dataset memory
- weakness logging
- adaptive training queue
- retrieval-assisted move selection

Core loop target:

`play -> detect weakness -> log -> cluster -> prioritize -> train -> retrieve -> improve`

Scientific posture:

- code and latest committed artifacts beat older doc claims
- the adaptive loop and automation loop have scaffolding and local control surfaces
- neither loop is supported by repeated strength evidence or autonomous-execution evidence
- the conversion suite is a targeted metric, not an Elo claim
- smoke benchmark health is not evidence of playing strength

## 2026-05-07 PR76 automation consolidation sync

The project now has an updated automation/evidence baseline through PR #138.

Current role split remains strict:

- Codex implements bounded tasks.
- Local scripts and GitHub CI provide mechanical validation.
- GPT critiques and routes only.
- The human remains merge, reject, freeze, promotion, and claim authority.

Current merged checkpoints relevant to this state:

- PR #129: passive `SearchBackend` boundary
- PR #132: passive `PolicyGuide` boundary
- PR #133: passive `DecisionController` boundary
- PR #134: `auto_merge_guard` self-modification hardening
- PR #135: `auto_merge_guard` verdict/check policy hardening
- PR #137: passive `TacticalEnv` boundary
- PR #138: auto-merge forensic evidence comment support

Current verified status:

- Repository state is ready for bounded automated extraction work.
- Active chess runtime remains implementation authority.
- Passive boundaries are scaffolding and extraction surfaces, not runtime behavior claims.
- `auto_merge_guard` can automate bounded passive-boundary merges under policy gates.
- Protected control-plane script changes require manual review and manual merge.
- The forensic marker `AUTO_MERGED_BY_GUARD` is expected on guard-performed merges.
- No scientific, performance, Elo, strength, or promotion claims are authorized.

Verdict separation remains mandatory:

- `software_verdict`
- `evidence_verdict`
- `claim_verdict`

Default:

- `claim_verdict: NO_CLAIM_ALLOWED`

## 2026-05-19 control-plane state stabilization

Live branch, HEAD, and ahead/behind state must be read from Git during each task. Older SHA and ahead-count examples are intentionally not repeated here because they became stale.

Current control-plane interpretation:

- active runtime code: IMPLEMENTED, with Rust as runtime truth
- tests: TESTED only for the narrow validations actually run or recorded
- tools/scripts: IMPLEMENTED for the local control-plane dry-run/state loop
- artifacts/runtime outputs: TESTED for local state boundaries; runtime artifacts remain non-claim evidence
- canonical docs: DOCUMENTED_ONLY
- roadmap/docs-only: DOCUMENTED_ONLY
- inference: PASSIVE

The Studio state loop now has implemented local Python tooling for status rendering, state-delta derivation, state-delta dry-run application, current-state candidate updates, mission candidate compilation, operator inbox compilation, HumanGate decision candidates, authorized-action plans, semi-auto dry-run chaining, and full in-memory loop checks.

## Studio Loop V1 Freeze

Status date: 2026-05-19.

The current Studio loop V1 surface is frozen as documentation state, not runtime activation:

- active_runtime_code: IMPLEMENTED
- tests: TESTED
- tools_scripts: IMPLEMENTED
- artifacts_runtime_outputs: TESTED
- canonical_docs: DOCUMENTED_ONLY
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE
- schemas: PASSIVE
- runtime_activation: BLOCKED
- dataset/training/benchmark/model: BLOCKED
- claim_posture: NO_CLAIM_ALLOWED
- no_global_ready_verdict: true

Git-backed scope:

- full loop in-memory harness
- current-state, mission, inbox, HumanGate, and action-plan dry-run tooling
- control-plane schemas and docs
- docs stabilization at `da0a86d0c922f79fa4fbbd955058b5a51df1fee9`

Local/passive scope:

- `.studio_state/current_state.json` remains ignored local operational state.
- Dry-run stdout candidates and generated reports are not canonical evidence by themselves.
- The current local state file still has `UNKNOWN` for some surfaces; this docs freeze records the canonical docs posture and does not modify that file.

Evidence basis:

- full loop in-memory harness: Git-backed
- current_state local write: TESTED
- current_state -> mission -> inbox -> HumanGate -> plan dry-run: TESTED
- artifacts smoke: validated
- docs stabilization committed

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

Required warning:

- Schemas remain PASSIVE contracts.
- Dry-run scripts are IMPLEMENTED tooling, not active runtime.
- `.studio_state/current_state.json` remains local ignored operational state unless a separate HumanGate process promotes a narrower artifact.
- Do not treat local archive, reports, logs, dry-run stdout, or benchmark summaries as implementation proof or claim evidence.
- Repo inspection remains required before future claims.
- Runtime activation, Codex execution, inbox persistence, `latest.json`, lab runs, lab puzzles, training, benchmarks, dataset generation/reset, model promotion, Chess960 activation, ActionMask authority, and DecisionController activation remain BLOCKED unless explicitly requested and gated.
- HumanGate remains required.

Status language:

- tests: TESTED only by previously reported targeted cargo commands
- artifacts/runtime outputs: PASSIVE local archive only
- canonical docs: DOCUMENTED_ONLY where applicable
- roadmap/docs-only: DOCUMENTED_ONLY
- inference: PASSIVE
- dataset/training: BLOCKED
- Chess960 runtime: BLOCKED
- ActionMask dataset authority: BLOCKED
- HumanGate promotion authority: PASSIVE / BLOCKED unless explicitly activated by HumanDecision
- claim verdict: NO_CLAIM_ALLOWED
- no_global_ready_verdict: true

Next work remains component-scoped. No global ready verdict is allowed.

## What works now

- Legal chess runtime exists and includes castling, en passant, underpromotion, fifty-move rule, threefold repetition, and insufficient material detection.
- Castling / roque was specifically locked with regression tests, and the FEN castling-rights serializer bug was corrected.
- FEN serialization is useful operational state, but `src/chess/fen.rs` currently normalizes en-passant to `-` and halfmove/fullmove to `0 1` on serialization, so it is not complete runtime truth for those counters/targets.
- Search uses root cloning, then simulate/undo inside deeper search.
- Shared practical policy exists in `src/chess/practical_policy.rs` and is used by search and neural rerank.
- Tactical core is wired:
  - SEE-lite capture scoring
  - hanging-piece guard
  - mate urgency
  - trade sanity
  - quiet-nonsense penalties
  - opponent reply scan
- Neural bridge payload format is now `fen|move1|move2|...` and is instrumented with `BRIDGE_PAYLOAD` / `PYTHON_RECEIVED` style diagnostics.
- Python bridge startup can reach `READY` when invoked with the stable VLEF path.
- Bridge failure path is safer than before: timeout, retry, fallback, and graceful shutdown paths exist.
- Viewer is authoritative-FEN based, not local-move-simulation based, so castling display no longer needs viewer-side castling logic.
- Teacher export, dataset validation, training, and neural inference are live.
- AAA decision trace fields flow from teacher export into loader and training.
- Conversion suite exists and emits stable reports:
  - `cargo run -- conversion_suite N`
  - `lab/reports/conversion_suite_v1_latest.md`
- Bounded smoke benchmark exists:
  - 2 games
  - 40-turn cap
  - isolated outputs under `lab/smoke_benchmark/tournaments/`
- Benchmark timeout persistence works.
- Official command cheatsheet:
  - `MASTER_DOCS/02_COMMAND_CHEATSHEET.md`

## Adaptive dataset state

Dataset work moved from static training data toward an adaptive system.

Current dataset components:

- phase split: opening / midgame / endgame
- positive samples
- negative samples
- mirror samples for white/black symmetry
- reverse dataset under `lab/reverse_dataset/`
- weakness log at `lab/reverse_dataset/weakness_log.jsonl`
- priority training queue
- adaptive state / learning progress reports
- retrieval index used by neural move selection when enabled
- active dataset pointer at `lab/ACTIVE_DATASET.txt` can now point to an adaptive dataset root such as `lab/dataset/`, not only to one JSONL file

The intended training mix is:

- 70% priority weaknesses
- 20% elite data
- 10% general / diversity data

Important: this is an adaptive learning direction, not yet evidence of Elo improvement.

## Biggest blocker

The project has moved past the old "does Python start?" and "does the engine compile?" phase, but it is not yet a stable performance-evidenced engine.

Current blockers:

1. Runtime / benchmark robustness still needs hardening under longer runs.
2. Smoke benchmark is a health check, not strength evidence.
3. Latest committed smoke benchmark artifact currently reports failure, so benchmark truth must be read from that failed artifact before any older successful smoke note.
4. Adaptive learning loop exists, but repeated improvement over runs is not yet demonstrated.
5. Neural gameplay remains drawish / weak in bounded smoke.
6. Dataset router and dataset loader semantics are not fully aligned when the active dataset is a directory/adaptive root.

## Next 30 days

- Stabilize bridge and benchmark execution until smoke and longer benchmark runs complete cleanly without panic, broken stdout, or environment drift.
- Run repeated smoke cycles and verify that `weakness_log.jsonl`, adaptive queue, and learning progress reports change as expected.
- Add confidence filtering so low-confidence weakness signals do not poison priority training.
- Prove that retrieval and priority training reduce repeated errors over time.
- Keep conversion suite as a targeted metric, not an Elo claim.
- Only make strength claims after clean benchmark evidence.

## Evidence Gaps

- adaptive loop not demonstrated by repeated improvement yet
- AAA is operational in export/load/train plumbing, but not supported as strength gain yet
- conversion suite correlation with Elo is not established
- smoke benchmark health does not imply strength

## Refresh From External Discussions

External discussion artifacts reviewed on 2026-04-26 are useful as project memory, not as direct truth.

Accepted as current doctrine:

- bounded patches beat repo-wide rewrites
- benchmark evidence beats architectural confidence
- `src/chess/search.rs` has matured substantially, but engine-level move application remains the deeper performance ceiling
- dataset quality should include behavioral termination truth, not only JSONL structure

Preserved as idea dump / roadmap:

- AAA tactical core migration toward reusable tactical/card-game engine architecture
- autobattler / draft / controlled-RNG / faction / terrain / effect systems
- future deterministic simulation and content-validation tooling

Not accepted as evidence:

- claims that the neural agent is strong
- claims that AAA supports strength claims without benchmark-grade evidence
- product-roadmap material as current runtime implementation

## Why it matters

The project now has a rare structure for a solo lab:

- deterministic Rust runtime
- Python ML stack
- tactical policy layer
- reverse dataset
- negative examples
- adaptive training loop
- retrieval memory

The value is not only the current chess strength. The value is the possibility of a data-efficient engine that learns from its own mistakes.

## VLEF / VENV / POWERSHELL ISSUE

VLEF = Very Lightweight Execution Flow.
This is the stable operational rule for Windows execution in this repo.

Rule:

- do not rely on `activate.ps1`
- do not rely on `pip` being on `PATH`
- do not rely on ambient PowerShell environment activation

Why:

- PowerShell can block venv activation scripts because of execution policy.
- `pip` may appear missing even when the venv is valid.
- This is not a project bug; it is an environment behavior.

Use these commands directly instead:

- `.\.venv\Scripts\python.exe ml/infer_policy.py --serve`
- `.\.venv\Scripts\python.exe ml/train.py`
- `.\.venv\Scripts\python.exe -m pip install <pkg>`
- `.\.venv\Scripts\python.exe -m py_compile ml\dataset_loader.py ml\train.py ml\infer_policy.py`

Keywords:

- `vlef`
- `venv`
- `powershell issue`
