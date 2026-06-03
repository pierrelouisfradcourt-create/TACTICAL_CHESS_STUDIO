# Current State

Date baseline: 2026-05-07 — last sprint update: 2026-06-02

---

## Sprint 2026-06-02

### Moteur Rocky — 14 IMP closées (commit ecee966)

- **PST** : tables positionnelles par type de pièce dans `eval.rs` (IMP-015)
- **Opening book** : `src/chess/opening_book.rs` + `lab/data/opening_book.jsonl` (IMP-016)
- **Quiescence** : sans cap de profondeur + delta pruning (IMP-017)
- **Sécurité roi** : zone attack count (IMP-018)
- **Pseudo-mobilité** : dans eval au lieu de legal_actions (IMP-019)
- **SEE complet** : récursif dans `practical_policy.rs` (IMP-020)
- **Développement** : pénalité pièces mineures sur case départ (IMP-021)
- **Pion arrière** : détection et pénalité (IMP-022)
- **Futility pruning** : depth 1-2 dans negamax (IMP-023)
- **Répétition early detection** : avant game_over (IMP-024)
- **Activation roi fin** : basée sur matériel non-pions (IMP-026)
- **Pénalité même pièce** : deux fois en ouverture (IMP-028)
- **draw_score calibration** : selon phase de jeu (IMP-029)
- **play_fen CLI** : retourne JSON move/score/depth (IMP-030)
- **Search timeout** : thread-local SEARCH_DEADLINE dans negamax (commit 1ac638f)
- **Random opening** : activé dans simulation + benchmark, MAX_STEPS=200 (IMP-014, commit d692ac6)

### Draw structurel — RÉSOLU

100% draws heuristic/heuristic et neural/heuristic depuis position symétrique : RÉSOLU via IMP-007 (ouverture aléatoire 2-8 plies dans simulation_runner.rs) + IMP-014 (random_opening=true dans teacher_uci, commit d692ac6). Les parties ont maintenant de vraies fins.

### Neural et ELO

- Premier checkpoint Neural sauvé (commit 71df945, skip_am_gate)
- EloTable K=24 câblée dans NeuralTournamentRunner, leaderboard() utilisé (IMP-033/034/035)
- ELO baseline pré-améliorations : teacher_uci=1424 / heuristic=1200 / neural=975
- ELO post-améliorations Rocky : non mesuré (benchmark à relancer)

### Pool dataset pipeline (CLOSED 2026-06-02)

- `ml/pgn_to_jsonl.py` EXÉCUTÉ — pool_2400.jsonl : 43.3M lignes, 1,002,503 parties, draw_rate=8.8% ✓ (IMP-037 CLOSED)
- `ml/sf_dataset_generator.py` EXÉCUTÉ — pool_sf.jsonl : 6,272 lignes, 50 parties, draw_rate=94% ⚠ critère <30% non atteint (IMP-038 CLOSED ledger, qualité insuffisante)
- `ml/dataset_builder_v3.py` CRÉÉ ET EXÉCUTÉ — 4 pools produits : dataset_a_rocky, dataset_b_quality, dataset_c_elite, dataset_d_puzzles (IMP-039 CLOSED)
- `ml/train_player.py` CRÉÉ — script opérationnel, checkpoints disponibles dans `lab/runs/` (IMP-040 CLOSED)

### play_fen — historique coups pour répétition (IMP-041 CLOSED 2026-06-02)

- `src/tool/cli.rs` : passe l'historique des coups à play_fen pour que la détection de répétition fonctionne en partie longue

---

## Sprint 2026-05-30

### Fixes committés

**c0ebf62 — fix(simulation): route neural agent through NeuralAgent::select_action**
- Neural infère réellement depuis ce commit. Avant : search jouait à la place de neural.
- selection_calls=20, successful_inferences=16, status=clean (smoke vérifié)
- Impact : tous les benchmarks précédents mesuraient heuristic_vs_heuristic

**T2 — feat(evaluation): EvalRunResult + RunIdentity + baseline snapshot**
- `src/evaluation/mod.rs` créé
- `lab/reports/eval_smoke_baseline.json` : première baseline traçable
- git=c0ebf62, draws=2, draw_rate=1.0

**T3/T4 — feat(evaluation): RegressionGuard PASS/FAIL/INCONCLUSIVE**
- GuardThresholds : min_games=10, draw_rate +20%, win_rate -15%, elo -30pts
- 6 tests de caractérisation, tous verts

**T5/T6 — feat(evaluation): fixtures CI + learning_progress v2**
- `src/evaluation/fixtures.rs` : 4 fixtures déterministes
- `lab/reports/learning_progress.json` : schema v2, generated_at 2026-05-30
- 13 tests evaluation au total, tous verts

**Charter A — fix(eval): reward calibration**
- repetition_signal : 1/2 → 120/60
- mobilité active toute la partie (x2 ouverture, x4 finale)
- is_winning_endgame : ≤16 pièces / +100cp (était ≤10 / +180)

### Résultats mesurés (post-session 2026-05-30)

- 160 parties neural vs heuristic : 0 victoires, 160 draws (draw_rate = 1.0) — problème structurel, RÉSOLU depuis
- ELO leaderboard (880 parties) : teacher_uci=1424 / heuristic=1200 / hybrid=1200 / neural=975

### Découvertes architecturales

- `src/tournament/elo.rs` = EloTable complète (câblée K=24 dans IMP-033/035)
- Value head calculée à chaque inférence mais jamais utilisée (IMP-011 DEFERRED)
- 15 input channels sans historique → neural ne voit pas les répétitions

---

## Evidence-plane status

Date update: 2026-05-07

PR merged through #138. Evidence-plane doctrine:

- CI pass is mechanical only.
- Default claim posture : `claim_verdict: NO_CLAIM_ALLOWED`.
- No automation/control-plane PR authorizes scientific, performance, Elo, strength, or promotion claims.

Publication status : PR creation, push, CI trigger — BLOCKED by money/CI constraints.

---

## Studio Loop V1 Freeze

Status date: 2026-05-19.

| Surface | Status |
| --- | --- |
| active_runtime_code | IMPLEMENTED |
| tests | TESTED |
| tools_scripts | IMPLEMENTED |
| inference | PASSIVE |
| runtime_activation | BLOCKED |
| dataset/training/benchmark/model | BLOCKED |

Claim posture: `NO_CLAIM_ALLOWED`. `no_global_ready_verdict: true`.

---

## AM stack status (frozen at AM-DATA-10 / AM-SEARCH-12)

| Surface | Status |
| --- | --- |
| ActionMask | IMPLEMENTED / TESTED Rust helper; not search authority |
| Python `validate_am_dataset_admission(row)` | IMPLEMENTED / TESTED / fail-closed |
| move_vocab size | 4164 (fingerprint: 690ce94a…) |
| Chess960 runtime | BLOCKED |
| ActionMask dataset authority | BLOCKED |
| Dataset label readiness | BLOCKED |
| Training readiness | BLOCKED |
| claim verdict | NO_CLAIM_ALLOWED |

---

## Engine status (2026-06-02)

- `src/chess/search.rs` : iterative deepening, thread-local SEARCH_DEADLINE, aspiration windows, TT, killer moves, history heuristic, quiescence sans cap + delta pruning, futility pruning depth 1-2, répétition early detection, light LMR, Zobrist-hash TT.
- Root selection : pure argmax alpha-beta. S-7 pipeline supprimé (90fe323).
- Tactical layer : SEE complet récursif (IMP-020), hanging detection, mate urgency, trade sanity, reply scan.
- Eval : PST par type de pièce (IMP-015), sécurité roi (IMP-018), pseudo-mobilité (IMP-019), développement (IMP-021), pion arrière (IMP-022), draw_score calibration (IMP-029).
- Opening book : `src/chess/opening_book.rs`, 50-200 coups (IMP-016).
- FEN round-trip faithful. Repetition key = Zobrist u64 (standard-compliant, exclut halfmove_clock).
- Performance : `current_repetition_key` = Zobrist u64, `Unit::template_name` = Arc<str>.

---

## AI / neural status

- NeuralAgent::select_action correctement câblé depuis c0ebf62. Premier checkpoint sauvé (71df945).
- EloTable K=24 câblée dans NeuralTournamentRunner (IMP-033/035).
- Neural runtime opérationnel, strength encore faible.

---

## Dataset status

- `lab/ACTIVE_DATASET.txt` → `lab/datasets/teacher_samples.jsonl` (553 lignes, 100% draws — **corrompu**, HumanGate requis pour redirection)
- Pool pipeline EXÉCUTÉ (2026-06-02) :
  - `lab/datasets/pool/pool_2400.jsonl` : 43.3M lignes, 1,002,503 parties, draw_rate=8.8% ✓
  - `lab/datasets/pool/pool_sf.jsonl` : 6,272 lignes, 50 parties, draw_rate=94% ⚠
  - `lab/datasets/pool/dataset_a_rocky.jsonl` : 7,002 lignes, draw_rate=0% ✓
  - `lab/datasets/pool/dataset_b_quality.jsonl`, `dataset_c_elite.jsonl`, `dataset_d_puzzles.jsonl` : générés
- Adaptive dataset system : phase split, positive/negative, mirror, weakness_log.

---

## Benchmark truth

- Last result : smoke benchmark timeout 2026-05-05T14:57:03+00:00 (180s, 2 games).
- Draw structurel RÉSOLU depuis IMP-007/014 — benchmark à relancer.
- Conversion suite : total=5, improved=5 — métrique ciblée, pas Elo.

---

## Current next steps

1. Rediriger `ACTIVE_DATASET.txt` vers un pool propre (HumanGate requis — IMP-008 FORBIDDEN lane).
2. Investiguer pool_sf draw_rate=94% — critère <30% non atteint, SF depth 14 trop défensif.
3. Relancer benchmark smoke pour mesurer ELO Rocky post-14 IMP.
4. Décider checkpoint à promouvoir depuis `lab/runs/` (HumanGate requis).

## Evidence Gaps

- Rocky strength gains post-14 IMP not yet measured (benchmark à relancer).
- pool_sf draw_rate=94% dépasse le critère d'acceptance <30%.
- ACTIVE_DATASET.txt pointe toujours sur teacher_samples corrompu — transition vers pool propre bloquée HumanGate.
- Adaptive loop improvement not yet demonstrated cross-runs.
- smoke benchmark health ≠ strength.
