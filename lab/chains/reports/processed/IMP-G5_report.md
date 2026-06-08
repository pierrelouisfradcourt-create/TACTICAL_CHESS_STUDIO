# IMP-G5 — neural_tournament_runner.rs : hard-fail + CSV provenance

## Contexte
Lane B — src/simulation/neural_tournament_runner.rs + src/tournament/export.rs

## Problèmes identifiés
1. `GameRecord` n'avait pas de champ `game_source` → impossible d'identifier dans le CSV les
   parties issues d'un panic récupéré (match_failed) vs parties normales.
2. Pas de hard-fail per-matchup : un matchup entier pouvait être contaminé sans alerte explicite.
3. Les panics convertis en `MatchTermination::Draw` gonflaient silencieusement le draw_rate.

## Patches appliqués

### neural_tournament_runner.rs
- Ajout `pub game_source: String` dans struct `GameRecord`
- Détection via `summary.winner_reason.starts_with("match_failed:")` → `"panic_recovered"` / `"normal"`
- Compteur `panic_count_block` par matchup + emission `BENCHMARK_HARD_FAIL|block=...|panic_count=N`
- 3 constructions GameRecord mises à jour (run_with_details x2, run_smoke_with_details)

### export.rs
- Colonne `game_source` ajoutée dans `export_games_csv` (header + write)
- Colonne `game_source` ajoutée dans `export_games_detailed_csv` (header + write)

## Erreurs évitées
- Ne pas casser le format CSV existant (ajout en fin de ligne, backward-compatible pour lecteurs partiels)
- Ne pas changer `run_match_resilient` (blast radius trop large — elle retourne MatchSummary)
- Pas de nouveau fichier créé

## Validation
cargo test : 6 passed, 1 failed (pré-existant identique)

software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
