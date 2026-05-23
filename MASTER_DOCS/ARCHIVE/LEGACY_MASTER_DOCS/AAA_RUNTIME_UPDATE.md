# AAA Runtime Update - 2026-04-22

## Purpose

This document records the practical runtime update completed around `2026-04-22`.
It is doc-ready, but intentionally conservative:

- code-level facts are marked as confirmed when present in the active repo
- tuning outcomes are described as observed local results, not final scientific proof
- future architecture is separated from implemented runtime code

## Executive Summary

The project did not receive only a local patch.

Two tracks moved forward together:

- the Rust search/runtime became more credible and more conversion-oriented
- the AAA supervision pipeline was connected from engine decision traces to Python training

In short:

```text
stronger search
+ richer decision signal
+ safer teacher/training plumbing
= a more serious TacticalChessPureLab runtime
```

## Confirmed Engine/Search Changes

The active source confirms a major maturation of `src/chess/search.rs`.

Confirmed search features include:

- iterative root deepening over an adaptive depth
- transposition table entries with `Exact`, `Lower`, and `Upper` bounds
- TT `best_move` reuse for ordering
- killer moves
- history heuristic
- bounded quiescence search
- light LMR-style reductions
- TT pruning / memory management
- richer root diagnostics and counters

The search now exposes structured root output through:

- `RootSearchResult`
- `RootSearchDiagnostics`
- `DecisionMetrics`

This is a meaningful improvement over a simple artisanal selector.

## Confirmed Conversion-Oriented Work

The search layer also contains explicit conversion and anti-sterility logic.

Confirmed functions / concepts include:

- `draw_score(...)`
- `progress_move_score(...)`
- `is_conversion_move(...)`
- `shuffle_penalty(...)`
- `ROOT_PRACTICAL_MARGIN`
- root decision alternatives and decision breakdowns

The practical direction is clear:

```text
make the engine less sterile and better at finishing favorable positions
```

The local working interpretation is:

- Phase 1 conversion tuning was useful
- a heavier punitive Phase 2A overshot
- the next healthy step should be finer mirrored penalties, not larger global hammers

Important caveat:

- these style improvements still need durable A/B evidence before being treated as final strength gains

## Structural Performance Ceiling

One major ceiling remains unchanged:

```text
engine.clone() -> apply_action()
```

The current search is more serious, but the runtime still does not appear to have a true `make_move / unmake_move` architecture.

That means search quality improved before the deepest performance bottleneck was removed.

## Confirmed AAA Decision Layer

The active repo now contains:

- `src/chess/decision.rs`
- `DecisionMode`
- `DecisionTrace`
- `choose_best_action_with_trace(...)`

The decision layer can route through modes such as random, heuristic, neural, minimax, and hybrid.

This gives the project a clearer boundary between:

- legal move generation
- search result
- selected action
- traceable decision metadata

## Confirmed AAA Teacher Export

The teacher runner now imports and uses decision traces:

- `choose_best_action_with_trace`
- `DecisionTrace`

Confirmed exported AAA fields include:

- `aaa_alt_moves`
- `aaa_alt_decision_scores`
- `aaa_confidence`
- `aaa_used_search`

The teacher no longer only says:

```text
this is the best move
```

It can now begin to say:

```text
this is the best move
these were the important alternatives
this is how strong the decision looked
```

## Confirmed Python Loader / Trainer Integration

The Python side now recognizes and consumes the AAA fields.

Confirmed in `ml/dataset_loader.py`:

- validation of `aaa_alt_moves`
- validation of `aaa_alt_decision_scores`
- defensive `parse_boolish(...)`
- `aaa_confidence` clamping
- `aaa_used_search` parsing
- optional AAA policy-target enrichment
- expanded batch contract including `aaa_confidence`

Confirmed in `ml/train.py`:

- defensive bool parsing
- AAA dataset statistics
- `avg_aaa_confidence`
- `aaa_used_search` counting
- batch contract check for 7 tensors
- policy sample weighting multiplied by `aaa_confidence`
- manifest fields documenting AAA batch and training behavior

Confirmed in `ml/export_dataset_check.py`:

- AAA field awareness
- schema version reporting

## Corrected Risk Areas

The update also addressed safety issues around the AAA patch.

Confirmed corrected or mitigated areas include:

- bool-like field parsing for string values such as `"false"`
- more defensive confidence handling
- clearer dataset/training reporting
- explicit batch contract expectations
- termination reason reporting in training metadata

Current status should be described as:

```text
deploy with reservations
```

not:

```text
fully proven
```

## Architecture Doctrine Clarified

The strategic architecture direction was clarified as:

```text
StrategicState -> PolicyWeights -> Search modulation -> Root arbitration
```

However, this is a target doctrine, not fully implemented runtime code today.

The minimal intended future state is:

- phase
- band
- tension

The intended future policy modulation surface is:

- draw penalty
- quiet malus
- shuffle penalty
- trade bias
- passed pawn urgency
- root margin
- small depth bonus

This should be treated as the next admissible architecture layer, not as already completed.

## Honest Final Status

Confirmed:

- search is much more credible than before
- conversion pressure is materially more explicit
- root diagnostics are richer
- AAA decision traces exist
- teacher export carries richer decision signals
- dataset loader and trainer consume AAA metadata
- several dangerous parsing / weighting risks were reduced

Still open:

- no true `make_move / unmake_move` performance architecture yet
- AAA signal value still needs A/B validation
- conversion tuning still needs durable benchmark proof
- `StrategicState / PolicyWeights` remains a design direction, not active code
- move vocabulary coverage remains important for training quality

## Short Version

```text
On 2026-04-22, TacticalChessPureLab moved from a stronger but local search patch
to a more coherent AAA runtime chain: search decisions can now produce traces,
teacher export can write richer alternatives/confidence fields, and the Python
training path can consume those signals with safer parsing and weighting.
```
