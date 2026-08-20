# Conversion Audit

Date: 2026-04-24
Dataset audited: `lab/pedagogy_db/promoted_pedagogy_pack.jsonl`
Objective: audit the selected dataset for real conversion rows and extract a fixed candidate subset if the issue is real.

Findings:
- Total rows in active promoted pack: 1227
- Rows tagged `candidate_family_guess = conversion`: 263
- Conversion-tagged rows at opening ply <= 20: 60
- Conversion-tagged rows at ply >= 25: 191
- This confirms a real labeling problem: game-level conversion identity was propagated to early opening plies like `e4`, `c5`, `Nf3`, `d4`.

Conservative fix used for extraction:
- Keep only decisive rows (`1-0` or `0-1`) from conversion-tagged games.
- For each such game, extract only the final 12 plies as safely late conversion/conclusion phase rows.
- This avoids claiming that the whole game is conversion phase from move 1.

Extracted candidate rows: 36
Output file: `lab/datasets/conversion_fixed_candidates_20260424.jsonl`

Per-game extracted counts:
- PEDAGOGICAL_DB_CONVERSION.pgn game 1: 12 rows (ply 78-89)
- human_conversion_patterns.pgn game 1: 12 rows (ply 68-79)
- human_conversion_patterns.pgn game 3: 12 rows (ply 88-100)
