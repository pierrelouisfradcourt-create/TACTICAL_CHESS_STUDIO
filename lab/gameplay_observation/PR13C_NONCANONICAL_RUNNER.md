# PR-13C / PR-13E / PR-13G / PR-13I / PR-14 Non-Canonical Gameplay Observation Runner

Status: non-canonical runner only  
Theme: search behavior in non-converting positions  
Claim status: no claim allowed

## Purpose

PR-13C added a minimal runner for gameplay observation packets.

PR-13E connected that runner to the `observe_fen` runtime entrypoint introduced in PR-13D.

PR-13G records the search metadata exposed by PR-13F: `completed_depth`, `search_score`, and `selection_source`.

PR-13I records the candidate diagnostics exposed by PR-13H: `candidates`, `candidate_count`, `best_score`, `second_best_score`, `score_gap`, and `candidate_diagnostics_note`.

PR-14 adds a richer non-canonical gameplay surface and keeps shallow non-canonical depth sweeps so the runner can observe whether selected moves remain stable or change across small depths.

The runner can produce a non-canonical observation report from the PR-13B and PR-14 surfaces while remaining outside canonical evidence.

## Runner

```text
scripts/run_gameplay_observation.py
```

Default behavior:

```text
python scripts/run_gameplay_observation.py --pretty
```

This validates the surface, creates a sandbox report, and marks observations as `NOT_RUN` for the default depth sweep.

Optional local execution:

```text
python scripts/run_gameplay_observation.py --execute --pretty
```

This calls:

```text
cargo run --quiet -- observe_fen <FEN> --depth <N>
```

for each FEN and each requested depth in the PR-13B surface and records structured runtime observation fields.

Optional PR-14 surface run:

```text
python scripts/run_gameplay_observation.py --surface lab/gameplay_observation/non_converting_positions/pr14_gameplay_surface.json --depths 1,2 --execute --pretty
```

Depth controls:

```text
--depth 1       # run a single depth
--depths 1,2    # run a comma-separated non-canonical depth sweep
```

## Output

The runner writes only to:

```text
lab/gameplay_observation/sandbox_outputs/pr13j_depth_sweep/observation_report.pr13j.json
```

This output is non-canonical and must not be treated as evidence.

## Recorded observation fields

For each position/depth, the report records:

```text
position_id
fen
command
depth
exit_code
observation_status
side_to_move
legal_moves_count
selected_move
runtime_status
completed_depth
search_score
selection_source
candidates
candidate_count
best_score
second_best_score
score_gap
candidate_diagnostics_note
stdout_excerpt
stderr_excerpt
error
notes
```

The report also includes `depth_summaries` with:

```text
position_id
depths_observed
all_observations_passed
selected_by_depth
scores_by_depth
unique_selected_moves
stable_selected_move
notes
```

## Boundaries

PR-14 does not:

- modify chess runtime behavior;
- modify engine/search/neural logic;
- run a benchmark;
- create `lab/runs/RUN_*`;
- update `latest.json`;
- access holdout data;
- reset datasets;
- authorize claims;
- authorize promotion.

## Report interpretation

- `stable_selected_move` means descriptive stability only.
- `changed_selected_move` means candidate for future targeted investigation only.
- `score_gap` and `candidates` are observation metadata only.
- No benchmark claim is allowed from this output.
- No scientific proof is established by this output.
- No promotion evidence is produced by this output.

## Known limitation

Depth-sweep stability and candidate diagnostics are descriptive observation only. They are not benchmark evidence and cannot support claims without a future protocol lock, dataset/surface registry, baseline, uncertainty policy, and human claim decision.

## Expected interpretation

```text
software_verdict: GAMEPLAY_OBSERVATION_BATCH_ADDED
evidence_verdict: NON_CANONICAL_OBSERVATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
