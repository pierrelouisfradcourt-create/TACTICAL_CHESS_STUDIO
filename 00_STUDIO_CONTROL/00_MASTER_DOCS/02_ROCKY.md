# Rocky — État et prochaines étapes

status: CANONICAL
date: 2026-06-04
authority: HumanGate
no_global_ready_verdict: true

---

## Ce qu'est Rocky

Couche IA au-dessus du moteur Rust.
Objectif final : joueur adversaire, partenaire, coach, meta-testeur.

Architecture cible (inspirée AlphaStar) :
```
Search (autorité finale tactique)
  + Neural (propose, rerank — jamais décide seul)
  + Practical Policy (heuristiques partagées)
  + LLM local (coaching, explication, draft, pre-move analysis)
```

---

## ELO — benchmark post-39-IMPs (2026-06-03)

| Joueur | ELO | Δ vs baseline (2026-05-30) |
|---|---|---|
| teacher_uci | 1351 | −73 (baseline : 1424) |
| hybrid | 1188 | −12 (baseline : 1200) |
| heuristic | 1183 | −17 (baseline : 1200) |
| neural | 1079 | **+104** (baseline : 975) |

- **Parties** : 110 parties réelles (2026-06-03)
- **draw_rate** : **0.68** (était 0.94 en mai — amélioration structurelle IMP-007/014/041)

---

## État actuel du moteur

| Surface | Statut | Notes |
|---|---|---|
| Moteur Rust (chess/) | IMPLEMENTED | Compile, tests passent |
| Search (alpha-beta, ID, killers, LMR, quiescence) | IMPLEMENTED | Quiescence sans cap + futility pruning |
| PST par type de pièce | IMPLEMENTED | IMP-015 |
| Livre d'ouvertures | IMPLEMENTED | 50-200 coups (IMP-016) |
| SEE complet récursif | IMPLEMENTED | IMP-020 |
| Sécurité roi | IMPLEMENTED | Zone attack count (IMP-018) |
| Outposts knight/bishop | IMPLEMENTED | IMP-027 |
| Finales KR vs K | IMPLEMENTED | Bonus conversion (IMP-025) |
| SearchTraceSchema | IMPLEMENTED | pv_changes, DepthSnapshot, nodes_per_root_move (IMP-010) |
| play_fen CLI | IMPLEMENTED | JSON move/score/depth (IMP-030) |
| FEN en passant validation | IMPLEMENTED | rank 3/6 uniquement (KI-25) |
| Historique coups play_fen | IMPLEMENTED | Détection répétition longue partie (IMP-041) |
| Neural bridge | IMPLEMENTED | Instable sur Windows — à surveiller |
| Chess 960 | BLOCKED | Architecture prête, HumanGate requis |
| Dataset actif | REPLACED | teacher_samples archivé → pool_2400.jsonl actif |

---

## Dataset — état réel

| Pool | Statut | Taille | draw_rate |
|---|---|---|---|
| pool_2400.jsonl | ACTIF | 1,002,503 parties | 8.8% |
| pool_sf.jsonl | ABANDONNÉ | 50 parties | 94% |
| teacher_samples.jsonl | ARCHIVÉ | 553 lignes | 100% |

- **ACTIVE_DATASET.txt** → pool_2400.jsonl (HumanGate 2026-06-02)
- **sf_dataset_generator.py** : corrigé (positions aléatoires 8-16 demi-coups), pool_sf abandonné (IMP-043 Option B)
- **IMP-008** : FORBIDDEN — rebuild teacher_samples bloqué, Stockfish requis

### Puzzles holdout

- `lab/puzzles/holdout_level1.jsonl` : 1 000 positions L1
- `lab/puzzles/holdout_level2.jsonl` : 1 000 positions L2
- `lab/puzzles/holdout_level3.jsonl` : 1 000 positions L3
- Benchmarks : `lab/reports/bench_rocky_p4_holdout*.json`

---

## LLM intégration — état

Rocky joue → decision tree enregistre → LLM local lit le tree →
explique le coup en langage naturel → Coaching contextuel.

- Coach v0 : opérationnel (FEN dans MOVE_DIAG)
- Autoloop : kaizen_autoloop.py câblé depuis autopilot.py
- Director : Qwen2.5-14B-Instruct (décisions opérationnelles)
- CEO Brain : Qwen3.6-27B (analyses profondes, disponible)

---

## Architecture cible — deux vitesses

### Fast path (temps réel)

```
GameState
→ LegalActions
→ NeuralProposal      (intuition, policy/value)
→ SearchResult        (calcul tactique, meilleur coup robuste)
→ CriticVerdict       (filtre avant exécution)
→ AuthorityDecision   (tranche une seule action finale)
→ ValidatedAction
→ Executor.apply()
→ Telemetry
```

### Slow path (hors temps réel)

```
Telemetry / Replays / Errors
→ LLM analyst (Qwen2.5-14B Director / Qwen3.6-27B CEO Brain)
→ hypothèses / tâches kaizen
→ HumanGate
→ Claude Code bounded patch → tests
→ Feedback / Memory / Curriculum
```

Le LLM ne fait jamais : choisir le coup final, bypass Search, activer training/dataset.

---

## Prochaines étapes

1. Benchmark puzzles holdout L1/L2/L3 (mesure qualité tactique Rocky)
2. Nouveau pool SF (deux moteurs asymétriques, quand disponible)
3. IMP-047 — architecture dual-model brain/router dans autopilot.py
4. IMP-008 — dataset rebuild (Stockfish requis, HumanGate requis)
5. Training LoRA réel (IMP-045 HumanGate approuvé)
