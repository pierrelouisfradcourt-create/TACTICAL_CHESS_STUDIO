# IMP-G7 — neural_agent.rs : AUDIT lecture seule

## Contexte
Lane C — src/agents/neural_agent.rs — AUDIT ONLY, aucun patch

## Fonctions exposées (pub)
- `NeuralAgent::new()` — construit l'agent, warm index si TCS_RETRIEVAL=1
- `NeuralAgent::health_check()` — vérifie que le bridge Python est vivant
- `NeuralAgent::reset_runtime_stats()` — remet les compteurs atomiques à zéro
- `NeuralAgent::runtime_stats_snapshot()` — snapshot des counters (NeuralRuntimeStats)
- `NeuralAgent::purity_violations_snapshot()` — lecture directe atomic purity_violations
- `NeuralAgent::select_action()` — sélection de coup, point d'entrée principal
- `NeuralAgent::name()` — retourne "neural" (jamais appelée — dead code warning)

## Architecture
- **Bridge Python** : process persistant (NeuralBridge), query via stdin/stdout
- **Retry** : 1 retry automatique (drop_process + re-query) sur première erreur
- **Fallback chain** : NoUciMoves → PythonBridgeFailed → PredictedMoveNotFound → FallbackLegalFirst
- **Reranking** : `select_move_with_rerank()` applique scoring contextuel (phase, material, mode)
- **Modes** : finish_mode, pressure_mode, trade_rerank — tous activables via env var
- **Rules** : AntiRepetition, ConversionBonus, OpeningTempo — tous DEFAULT OFF

## Issues trouvées (dead code)
- `name()` : pub mais jamais appelée (warning cargo)
- `NeuralRuntimeStats.purity_violations` : field never read (warning cargo)
- `NEURAL_RUNTIME_COUNTERS.shortlist_used_count` : jamais lu dans snapshot
- Toutes les rules (anti_repetition, conversion_bonus, opening_tempo) : `enabled: false` par défaut

## Points forts
- Isolation correcte via env vars (TCS_BENCHMARK_PURITY, TCS_VERBOSE_NEURAL)
- Compteurs atomiques thread-safe
- Fallback exhaustif — jamais de crash sans coup de secours

## Verdict audit
Aucun patch requis — architecture saine, warning flags uniquement dead code cosmétique.

software_verdict: OK (audit)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
