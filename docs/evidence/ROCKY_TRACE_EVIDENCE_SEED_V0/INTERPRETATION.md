# INTERPRETATION

"This artifact does not prove that Rocky is strong. It only shows that Rocky can produce inspectable decision traces on a bounded case."

## What Is Observed

- The command completed with `status":"ok"` in the final JSON row.
- The final JSON row records the input FEN, side to move, legal move count, selected move, candidate count, completed depth, and search score fields.
- The raw output contains root decision rows including `ROOT_DECISION_SIGNAL`, `ROOT_DECISION_AUDIT`, `ROOT_CANDIDATE_SCORE`, and `ROOT_DECISION_SELECTED`.
- The raw output contains runtime/search context rows including `SEARCH_RUNTIME_DIAG`, `SEARCH_TRACE`, and `SEARCH_SUMMARY`.
- The selected move visible in the raw output is `d1c1`.

## What Is Not Observed

- No benchmark campaign is observed.
- No repeated-case evaluation is observed.
- No win-rate is observed.
- No Elo is observed.
- No comparative engine-strength result is observed.
- No training run is observed.
- No neural model mode is observed.
- No Chess960 activation is observed.
- No scientific validation procedure is observed.

## What Cannot Be Inferred

This artifact cannot be used to infer that Rocky is strong, improved, validated, ready, better than another engine, product-ready, scientifically validated, or Chess960-ready. It cannot be used as benchmark evidence or as a basis for Elo, win-rate, promotion, or comparative strength claims.
