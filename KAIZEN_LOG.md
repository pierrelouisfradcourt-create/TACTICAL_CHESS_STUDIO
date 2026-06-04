# KAIZEN_LOG.md — Journal des sessions

Historique des sessions Kaizen Tactical Chess Studio.
claim_verdict: NO_CLAIM_ALLOWED

---

## Session 2026-06-03/04

### IMPs fermés

| IMP | Titre | Fermé |
|---|---|---|
| IMP-010 | SearchTraceSchema (3 ajouts search.rs) | 2026-06-03 |
| IMP-025 | Finales élémentaires KR vs K | 2026-06-03 |
| IMP-027 | Outposts et cases faibles | 2026-06-03 |
| IMP-038 | sf_dataset_generator.py — Pool-SF Stockfish depth 14 | 2026-06-03 |
| IMP-042 | Benchmark ELO post-39-IMPs | 2026-06-03 |
| IMP-043 | Valider pool_sf draw_rate < 20% sur 500 parties réelles | 2026-06-03 |
| IMP-044 | Page Studio OS — cockpit unifié surfaces + boucle + HumanGate | 2026-06-03 |
| IMP-045 | LoRA training Devstral sur 57 exemples golden | 2026-06-03 |
| IMP-046 | Switcher LM_MODEL Qwen3.6 27B + tester CEO Brief | 2026-06-04 |

### Infrastructure créée

- **studio_state.json** : écrit après chaque action autopilot (état persistant)
- **CEO Brief** : endpoint /api/ceo-brief — Qwen3.6-27B analyse profonde
- **Autoloop câblé** : /api/autoloop-start/stop/status dans autopilot.py
- **Page Studio OS** : cockpit unifié surfaces + boucle + HumanGate (IMP-044)
- **golden_collector hook** : close_imp() → archive auto dans golden_examples.jsonl
- **studio_context_builder** : STUDIO_CONTEXT.md dérivé du ledger (IMP-012)
- **lora_train_devstral.py** : script dry-run + training LoRA (IMP-045)
- **lora_config.yaml** : config complète — base=devstral-small-2507, rank=8, epochs=3

### Décisions HumanGate

| Décision | Verdict | Notes |
|---|---|---|
| pool_sf validation (IMP-043) | Option B — ABANDONNÉ | draw_rate=94%, régénération impossible sans SF asymétriques |
| LoRA training IMP-045 | APPROUVÉ | Dry-run OK, training réel nécessite --model-path |
| LM_MODEL actif | Qwen2.5-14B-Instruct | Director opérationnel |
| Qwen3.6-27B CEO | DISPONIBLE | Analyses profondes via /api/ceo-brief |

### Métriques de clôture

| Métrique | Avant session | Après session |
|---|---|---|
| IMPs CLOSED | 37 | 44 |
| draw_rate | 0.94 (mai) | 0.68 |
| ELO neural | 975 | 1079 |
| ELO teacher_uci | 1424 | 1351 |
| golden_examples | 0 | 38 (57 total corpus) |

---

## Session 2026-06-02

### IMPs fermés

IMP-031 (diagnostic neural), IMP-032 (audit teacher_*), IMP-033/034/035 (EloTable K=24),
IMP-036 (audit puzzles), IMP-037 (pool_2400.jsonl), IMP-038 (sf_dataset_generator — rouvert),
IMP-039 (dataset_builder_v3), IMP-040 (train_player.py), IMP-041 (play_fen historique)

### Infrastructure créée

- pool_2400.jsonl : 1,002,503 parties, draw_rate=8.8% (pgn_to_jsonl.py)
- dataset_builder_v3.py : 4 pools produits
- train_player.py : checkpoints dans lab/runs/
- EloTable K=24 câblée dans NeuralTournamentRunner

### Décisions HumanGate

- ACTIVE_DATASET.txt → pool_2400.jsonl (teacher_samples archivé, 100% draws)
- pool_sf draw_rate=94% → IMP-038 rouvert (critère <20% non atteint)

---

## Session 2026-06-01

### IMPs fermés

IMP-012 (studio_context_builder), IMP-013 (golden_collector),
IMP-014 (random_opening), IMP-015 (PST), IMP-016 (opening book),
IMP-017 (quiescence), IMP-018 (sécurité roi), IMP-019 (pseudo-mobilité),
IMP-020 (SEE), IMP-021 (développement), IMP-022 (pion arrière),
IMP-023 (futility pruning), IMP-024 (répétition early), IMP-026 (activation roi),
IMP-028 (pénalité même pièce), IMP-029 (draw_score), IMP-030 (play_fen CLI)

### Moteur Rocky — améliorations

14 IMP moteur : PST, opening book, quiescence, sécurité roi, pseudo-mobilité,
SEE, développement, pion arrière, futility pruning, répétition early detection,
activation roi, outposts, pénalité même pièce, draw_score calibration, play_fen CLI.

---

## Session 2026-05-31

### IMPs fermés

IMP-001 (detect_lane), IMP-002 (HUMANGATE_DECISION_LOG),
IMP-003 (lane conflict checker), IMP-004 (scripts_route_chain),
IMP-005 (fusion_matrix_chain), IMP-007 (draw structurel),
IMP-009 (run_chain opt1-4)

### Infrastructure créée

- IMPROVEMENT_LEDGER.yaml : SSOT kaizen (seed initial 11 IMPs)
- HUMANGATE_DECISION_LOG.yaml : schema décisions
- lane_conflict_checker.py : détection conflits multi-lanes
- scripts_route_chain.py + fusion_matrix_chain.py
- run_chain.py amélioré (opt1-4 : memory-aware + lane-aware)
