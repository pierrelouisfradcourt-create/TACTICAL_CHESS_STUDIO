# PR65 Local MASTER_DOCS Salvage

Date: 2026-05-06  
Branch: `docs-pr65-salvage-local-master-docs-updates`

## Scope

Review remaining local tracked noise in selected `MASTER_DOCS` files and salvage only doc updates consistent with latest `main` truth.

Reviewed files:
- `MASTER_DOCS/03_KNOWN_ISSUES.md`
- `MASTER_DOCS/07_PROJECT_HISTORY.md`
- `MASTER_DOCS/CURRENT_CODE_AUDIT_AND_KNOWN_ISSUES.md`
- `MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md`

## Preconditions

- PR64 / #123 is present on latest `main` (`151e919f` merge commit).
- `lab/gameplay_observation/PR64_LOCAL_TRACKED_NOISE_AUDIT.md` exists.
- PR64 audit explicitly lists local tracked noise in the four `MASTER_DOCS` files.

## Per-file Diff Summary And Decisions

### 1) `MASTER_DOCS/03_KNOWN_ISSUES.md`

Diff size: `193 insertions, 143 deletions`

KEEP:
- Canonical active known-issues framing and claim-safe language.
- Updated issue structure with explicit "status/evidence/recommendation" sections.
- Corrections aligning with current code truth:
  - `src/chess/search.rs` root clone ceiling wording.
  - dataset router vs loader mismatch (directory input semantics).
  - FEN serialization asymmetry (`engine_to_fen` normalization vs parser support).
  - confidence filtering exists in `ml/adaptive_dataset.py`.
- No Elo/strength/promotion/scientific-proof framing.

EDIT_FOR_ACCURACY:
- Replaced unverified "tests passed in this refresh" statements with source-inspection wording where direct PR65 test evidence was not part of the required validation run.
- Changed "REDUCED BY THIS MERGE" to "REDUCED BY THIS UPDATE".
- Added explicit doctrine line: automation/evidence-plane is partial control-plane only, not a finished autonomous system.

DROP_STALE:
- Removed stale known-issue wording carried from prior state:
  - "no confidence filtering yet"
  - "python bridge removed `.venv312` candidates"
  - legacy duplicate-known-issues posture

UNCERTAIN_KEEP_OUT:
- Did not add any new claim about adaptive learning quality, strength gain, Elo improvement, benchmark proof, or promotion.

### 2) `MASTER_DOCS/07_PROJECT_HISTORY.md`

Diff size: `0 insertions, 1 deletion`

KEEP:
- Removed `MASTER_DOCS/CURRENT_CODE_AUDIT_AND_KNOWN_ISSUES.md` from active docs list.

DROP_STALE:
- Dropped stale listing of the now-pointer document as an active issue source.

UNCERTAIN_KEEP_OUT:
- No additional historical claims were introduced.

### 3) `MASTER_DOCS/CURRENT_CODE_AUDIT_AND_KNOWN_ISSUES.md`

Diff size: `15 insertions, 532 deletions`

KEEP:
- Converted to a short pointer document.
- Canonicalized active issue authority to `MASTER_DOCS/03_KNOWN_ISSUES.md`.
- Added explicit claim control (`NO_CLAIM_ALLOWED` posture).

DROP_STALE:
- Removed stale duplicate issue registry that had drifted from current source truth.

UNCERTAIN_KEEP_OUT:
- Did not retain broad historical audit content that could diverge again from current source.

### 4) `MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md`

Diff size: `8 insertions, 10 deletions`

KEEP:
- Corrected path references from `src/chess/search/` and old split module paths to `src/chess/search.rs`.
- Updated known-issues pointer from `CURRENT_CODE_AUDIT...` to `03_KNOWN_ISSUES.md`.
- Updated risk wording to reflect current sorted `legal_actions` behavior while keeping `ActionId` gap called out.

DROP_STALE:
- Removed stale file-path references and stale pre-sort legal-actions warning text.

UNCERTAIN_KEEP_OUT:
- Did not introduce any "AAA implemented" or "automation complete" language.

## Explicit `latest_benchmark_summary.json` Handling

- `lab/reports/latest_benchmark_summary.json` was inspected only.
- It was **not edited**, **not staged**, and will **not be committed** in PR65.

## Commands Run

```powershell
git fetch origin --prune
git switch main
git pull --ff-only origin main
git status --short
git status --porcelain
git log --oneline -20
Test-Path 'lab/gameplay_observation/PR64_LOCAL_TRACKED_NOISE_AUDIT.md'
rg -n "MASTER_DOCS/" lab/gameplay_observation/PR64_LOCAL_TRACKED_NOISE_AUDIT.md
git switch -c docs-pr65-salvage-local-master-docs-updates
git diff -- MASTER_DOCS/03_KNOWN_ISSUES.md
git diff -- MASTER_DOCS/07_PROJECT_HISTORY.md
git diff -- MASTER_DOCS/CURRENT_CODE_AUDIT_AND_KNOWN_ISSUES.md
git diff -- MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md
rg --files src/chess | rg "search"
rg -n "legal_actions\(|action_key|sort" src/engine/engine.rs src/chess/search.rs src/agents/neural_agent.rs ml/adaptive_dataset.py ml/dataset_decision_router.py
rg -n "search_root_with_context|let mut engine = engine.clone\(\)" src/chess/search.rs
rg -n "engine_to_fen|engine_from_fen|halfmove|fullmove" src/chess/fen.rs
rg -n "\.venv312|PYTHON_SELECTED\||PYTHON_PATH_INVALID\|" src/agents/neural_agent.rs
.\.venv312\Scripts\python.exe -c "import sys; from pathlib import Path; sys.path.insert(0, 'ml'); import dataset_loader; print(dataset_loader.validate_training_dataset_path(Path('lab/dataset')))"
.\.venv312\Scripts\python.exe ml\dataset_decision_router.py --input lab\dataset
.\.venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty
.\.venv312\Scripts\python.exe scripts/report_local_agent_session.py --pretty
cargo check
cargo test fen_round_trip -- --nocapture
cargo test root_decision -- --nocapture
```

## Validation Results

- `check_workspace_hygiene.py --pretty`: `hygiene_verdict=CLEAN`, no blocked reasons.
- `report_local_agent_session.py --pretty`: confirms local tracked noise set and `claim_verdict=NO_CLAIM_ALLOWED`.
- `cargo check`: passed (warnings only).
- `cargo test fen_round_trip -- --nocapture`: passed (`fen_round_trip` tests green).
- `cargo test root_decision -- --nocapture`: passed (root decision tests green).

## Skipped Validation

- None from the required PR65 validation list.

## Risks

Behavior risk:
- Documentation-only changes; runtime behavior unchanged.

Evidence risk:
- Doc statements rely on source inspection plus targeted command/test evidence; no benchmark/performance claim accepted as proof.

Claim risk:
- Mitigated by explicit no-claim language and preservation of `NO_CLAIM_ALLOWED`.

## Verdicts

- software_verdict: `LOCAL_MASTER_DOCS_UPDATES_SALVAGED`
- evidence_verdict: `DOCUMENTATION_ONLY`
- claim_verdict: `NO_CLAIM_ALLOWED`
