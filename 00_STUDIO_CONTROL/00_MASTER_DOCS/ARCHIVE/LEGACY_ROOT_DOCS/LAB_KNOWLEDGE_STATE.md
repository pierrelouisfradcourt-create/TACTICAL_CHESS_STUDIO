# LAB KNOWLEDGE STATE — Tactical Chess Studio

## 1. CONFIRMED TRUTHS

### System
- Deterministic engine operational
- Training pipeline operational
- Neural inference bridge operational
- Tournament runtime operational
- Runtime impurity tracking exists in the neural path
- Neural tournament startup is guarded by a bridge health check

### Active repo truth
- Active repo root: `TacticalChessPureLab`
- Active code roots:
  - `src/`
  - `ml/`
  - `models/`
  - `lab/`

### Active dataset markers
- `lab/ACTIVE_DATASET.txt` exists as the canonical active dataset pointer
- Current pointer value must be read from live repo state before stronger claims are made

### Dataset / training contract reality
- Current training entrypoint: `ml/train.py`
- Current dataset path resolution: `ml/dataset_loader.py`
- If `--input` is omitted, training falls back to `lab/ACTIVE_DATASET.txt`
- Current train-consumable contract still expects row-wise teacher-style data with:
  - `fen`
  - `best_move`
  - `result` or `engine_eval`
  - optional `legal_moves`
  - optional `top_moves`
  - optional `top_scores`

### Pedagogy DB
The following pedagogy curation artifacts exist in the active repo:
- `lab/pedagogy_db/candidate_games_for_triage.csv`
- `lab/pedagogy_db/triaged_pedagogy_candidates.csv`
- `lab/pedagogy_db/promoted_pedagogy_pack.csv`

### Critical interpretation
- The promoted pedagogy pack is a promoted curation artifact
- It is not automatically the same thing as a train-consumable ML dataset
- Active dataset marker truth and train-contract truth are separate layers
- A canonical pointer does not by itself prove compatibility with the active loader

### Runtime guard rails
Confirmed in active source:
- bridge startup health checks exist
- READY handshake is required for neural bridge startup
- benchmark-sensitive impurity tracking exists
- tournament entry can be cancelled if bridge startup fails
- runtime path resolution is more explicit than older hardcoded assumptions

---

## 2. PARTIAL TRUTHS

### Generator hygiene
Source-proven:
- family-based theme sampling exists
- curriculum family weights exist
- difficulty weights exist
- repeated failures can disable a theme at runtime

Not yet source-proven as complete:
- localized runtime theme state
- non-misleading active-theme truth
- richer runtime summary fields such as:
  - `attempts_by_theme`
  - `failures_by_theme`
  - `disabled_by_runtime`
- differentiated stage weights across early / mid / late

### Active dataset operationality
- active dataset pointer exists
- fallback resolution exists
- train-consumable status of the pointed artifact must still be verified from the actual file format and row contract

---

## 3. INVALID OR OVERSTATED INTERPRETATIONS

- `lab/ACTIVE_DATASET.txt` does not by itself prove that the pointed artifact is trainable
- A promoted pedagogy CSV must not be described as a valid ML dataset unless it satisfies the active loader contract
- Presence of curation artifacts does not prove end-to-end dataset materialization into train-ready JSONL
- Infrastructure truth does not equal model-strength validation

---

## 4. CURRENT LIMITATIONS

### Scientific
- Single-run temptation remains dangerous
- Benchmark truth must stay above narrative
- Curation DB and trainable ML dataset are still separate concepts

### Dataset operational
- Loader fallback exists, but pointed artifact compatibility remains a gate
- The bridge from pedagogy curation to trainable ML samples is not yet fully closed

---

## 5. TRUTH LAYER CLASSIFICATION

The lab now distinguishes four different truth layers:

1. Marker truth
   Example:
   - `lab/ACTIVE_DATASET.txt`
   - `lab/ACTIVE_EXPERIMENT.txt`

2. Contract truth
   Example:
   - active loader schema
   - active train contract
   - move vocabulary contract

3. Runtime truth
   Example:
   - what code paths actually execute
   - what files are actually written
   - what failures are actually surfaced

4. Scientific truth
   Example:
   - validated benchmark gains
   - reproducible dataset health
   - repeatable model improvement

Operational rule:
- a higher truth layer must not be inferred automatically from a lower one

Examples:
- marker truth does not prove contract truth
- contract truth does not prove runtime success
- runtime success does not prove scientific validity

---

## 6. CONCLUSION

The lab is:
- operational at runtime
- stricter in provenance than before
- clearer about active markers
- still unresolved at the boundary between pedagogy curation and trainable ML data

The most important current truth is:

`active marker != guaranteed train contract`
