# MEMORY.md — Mémoire studio (claimed_until_verdict)

## ELO (baselines vérifiées)
- Heuristique : ~1195 ELO (référence stable)
- Hybride : ~1214 ELO (hybride +19.3 vs heuristique)
- Neural seul : ~992 ELO + taux de nulle élevé
- Objectif hybride : heuristique + 20 minimum
- Dernier bench/elo_match.sh : LANCÉ — HMAC opérationnelle

## Ancres
- Stockfish depth-14 : oracle de distillation (TCS_STOCKFISH_PATH requis)
- Lichess puzzles : lab/puzzles/level1-3.jsonl + holdout_level1-3.jsonl (CC0)
  · L1 98% / L2 3.5% / L3 14% — last run session 2026-05-31
  · Seuils cibles : L1≥80% / L2≥10% / L3≥20%
- League (V1/Aggressive/Defensive/Rapid) — draw_rate fix IMP-007 CLOSED
- Dernier /reanchor : jamais (à planifier dès P1)

## Stack — état réel (2026-06-26)
- Rust engine/search/decision-tree : IMPLÉMENTÉ (cargo build clean)
- SearchTraceSchema (IMP-010 CLOSED 2026-06-03) :
  · pv_changes ✓ · DepthSnapshot ✓ · nodes_per_root_move ✓
  · Trous φ comblés — bloqueur levé côté Rust
- Python ML : IMPLÉMENTÉ
  · pool_2400.jsonl ✓ · dataset_a/b/c/d ✓
  · pool_sf.jsonl INVALIDE (draw_rate 94% — IMP-043 verdict INVALID)
  · ACTIVE_DATASET.txt → pool_selfplay.jsonl (draw_rate 22%)
  · teacher_samples.jsonl ARCHIVÉ (IMP-008 CLOSED)
- φ Encoder / Clustering / LoRA / loss augmentée : NOT_STARTED (P4)

## Infra studio (2026-06-26)
- studio/openclaw-workspace/* : DÉPLOYÉ dans le repo
- bench/elo_match.sh + bench/lichess_eval.sh : CRÉÉS (premier lancement requis)
- scripts/studio_meta.py : CRÉÉ (P1 — lancer après bench)
- ~/.openclaw/ : À déployer depuis WSL (/openclaw-install)

## Règle mémoire
CLAIMED = dans les logs journaliers uniquement.
VÉRIFIÉ = oracle vert + HMAC → peut monter dans MEMORY.md.
