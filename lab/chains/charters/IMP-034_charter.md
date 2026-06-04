# Charter IMP-034 — Câbler EloTable dans NeuralTournamentRunner (K=24, unifier 3 implémentations)

## Status
CLOSED — stub auto-genere depuis ledger

## Lane
AUDIT_REQUIRED

## Impact / Effort / ROI
Impact: HIGH | Effort: SMALL | ROI: -

## Acceptance criteria
EloTable::new instanciée, update_elo_pair remplacé par update_match, leaderboard() utilisé, cargo test OK, K=24 canonique

## Files
- src/simulation/neural_tournament_runner.rs
- src/tournament/elo.rs

## Notes
Fermeture documentee en session: 2026-06-02
