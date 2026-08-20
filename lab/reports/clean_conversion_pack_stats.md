# Clean Conversion Pack Stats

Source dataset: `lab/pedagogy_db/promoted_pedagogy_pack.jsonl`
Output dataset: `lab/datasets/clean_conversion_pack.jsonl`

Rules:
- decisive games only: `True`
- opening max ply: `20`
- minimum final-phase ply: `25`
- final N plies: `12`

Before:
- rows: 263
- avg ply: 45,32
- opening rows: 60

After:
- rows: 35
- avg ply: 83,57
- opening rows: 0

Delta:
- rows kept: 35
- rows removed: 228
- opening contamination removed %: 100,00

Game summary:
- games considered: 3
- games kept: 3
- games skipped after phase filter: 0
