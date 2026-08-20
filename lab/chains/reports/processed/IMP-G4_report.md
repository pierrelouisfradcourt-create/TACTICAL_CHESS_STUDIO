# IMP-G4 — simulation_runner.rs : TurnLimit vs Draw

## Contexte
Lane B — src/simulation/simulation_runner.rs

## Bug identifié
Dans `run_match_with_agents()`, la branche GAME_ANALYSIS_SUMMARY classifiait
`MatchTermination::TurnLimit` avec `result = "draw"`. Cela polluait les métriques d'analyse :
les parties dépassant la limite de 200 coups étaient comptées comme de vraies nullités.

## Patch appliqué
Ligne 1721 :
```
Avant : MatchTermination::TurnLimit => ("draw".to_string(), "turn_limit".to_string()),
Après : MatchTermination::TurnLimit => ("turn_limit".to_string(), "turn_limit".to_string()),
```

## Erreurs évitées
- Ne pas toucher le CSV export (TurnLimit déjà correctement libellé dans termination/termination_type)
- Ne pas modifier le comptage draws dans neural_tournament_runner.rs (autre IMP)
- Une seule ligne modifiée, zéro blast radius supplémentaire

## Validation
cargo test : 6 passed, 1 failed (pré-existant: AAA_TACTICAL_CORE_ARCHITECTURE.md introuvable)
Zéro régression sur les tests existants.

software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
