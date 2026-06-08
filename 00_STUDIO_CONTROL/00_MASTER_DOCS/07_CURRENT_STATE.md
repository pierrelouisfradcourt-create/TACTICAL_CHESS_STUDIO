# Current State

Date : 2026-06-08 — sprint update : 2026-06-03/04

---

## Ledger — état 2026-06-04

| Métrique | Valeur |
|---|---|
| Total IMPs | 116 |
| CLOSED | 126 |
| OPEN | 16 |
| DEFERRED | 1 |

### IMPs OPEN

| ID | Titre | Lane | Impact |
|---|---|---|---|
| IMP-008 | Dataset rebuild (teacher_samples corrompu) | FORBIDDEN | CRITICAL |
| IMP-047 | Architecture dual-model brain/router dans autopilot.py | SAFE_AUTO | HIGH |

### IMPs DEFERRED

| ID | Titre | Raison |
|---|---|---|
| IMP-011 | Value head inutilisée #NEW-04 | Bloqué par IMP-008 (dataset rebuild requis) |

---

## Moteur Rocky — état 2026-06-03

### ELO post-39-IMPs (benchmark 110 parties, 2026-06-03)

| Joueur | ELO |
|---|---|
| teacher_uci | 1351 |
| hybrid | 1188 |
| heuristic | 1183 |
| neural | 1079 |

- **draw_rate** : 0.68 (était 0.94 en mai — amélioration structurelle IMP-007/014/041)
- **Parties mesurées** : 110 parties réelles

### Améliorations moteur (sessions 2026-06-01/02/03)

- **PST** : tables positionnelles par type de pièce (IMP-015)
- **Livre d'ouvertures** : 50-200 coups (IMP-016)
- **Quiescence** : sans cap + delta pruning (IMP-017)
- **Sécurité roi** : zone attack count (IMP-018)
- **Pseudo-mobilité** : dans eval au lieu de legal_actions (IMP-019)
- **SEE complet** : récursif (IMP-020)
- **Développement** : pénalité pièces mineures case départ (IMP-021)
- **Pion arrière** : détection et pénalité (IMP-022)
- **Futility pruning** : depth 1-2 dans negamax (IMP-023)
- **Répétition early detection** : avant game_over (IMP-024)
- **Finales KR vs K** : bonus conversion (IMP-025)
- **Activation roi fin** : basée sur matériel non-pions (IMP-026)
- **Outposts** : knight/bishop dans eval (IMP-027)
- **Pénalité même pièce** : deux fois en ouverture (IMP-028)
- **draw_score calibration** : selon phase de jeu (IMP-029)
- **play_fen CLI** : JSON move/score/depth (IMP-030)
- **SearchTraceSchema** : pv_changes, DepthSnapshot, nodes_per_root_move (IMP-010)
- **FEN en passant** : rank 3/6 uniquement (KI-25 CLOSED, commit 5eb2459)
- **Historique coups** : passé à play_fen pour détection répétition (IMP-041)

---

## Dataset — état 2026-06-04

| Pool | Statut | Taille | draw_rate |
|---|---|---|---|
| pool_2400.jsonl | ACTIF | 1,002,503 parties | 8.8% |
| pool_sf.jsonl | ABANDONNÉ | 50 parties | 94% |
| teacher_samples.jsonl | ARCHIVÉ (corrompu) | 553 lignes | 100% |

- **ACTIVE_DATASET.txt** → pool_2400.jsonl (HumanGate 2026-06-02)
- **IMP-008** : FORBIDDEN — rebuild teacher_samples bloqué jusqu'à Stockfish disponible
- **sf_dataset_generator.py** : corrigé (positions aléatoires 8-16 demi-coups), pool_sf non récupérable (IMP-043 Option B — HumanGate)

### Puzzles holdout

- `lab/puzzles/holdout_level1.jsonl` : 1 000 positions L1
- `lab/puzzles/holdout_level2.jsonl` : 1 000 positions L2
- `lab/puzzles/holdout_level3.jsonl` : 1 000 positions L3

---

## Autopilote — autopilot.py

- **Lignes** : ~7424 (refactorisé 2026-06-03, retrait complet Claude API)
- **LM_MODEL** : `qwen2.5-14b-instruct` (LM Studio, port 1234)
- **Port** : 7331

### Endpoints (2026-06-03/04)

| Endpoint | Fonction |
|---|---|
| /api/studio-state | État complet studio (ledger + chaînes) |
| /api/ceo-brief | Brief CEO via Qwen3.6-27B |
| /api/autoloop-start | Lance kaizen_autoloop.py |
| /api/autoloop-stop | Arrête la boucle |
| /api/autoloop-status | État de la boucle |

- **studio_state.json** : écrit après chaque action
- **golden_collector hook** : close_imp() → archive auto dans golden_examples.jsonl
- **Page Studio OS** : cockpit unifié surfaces + boucle + HumanGate (IMP-044 CLOSED)

---

## LoRA — état 2026-06-04

| Champ | Valeur |
|---|---|
| Adaptateur | lab/runs/lora_devstral_tcs_v1/ |
| Base model | devstral-small-2507 |
| Corpus golden | 57 exemples (golden_collector_v1) |
| Total exemples | 57 (+ mode_claude_run + autodev) |
| Config | rank=8, alpha=16, epochs=3, lr=2e-4 |
| Status | READY_FOR_HUMANGATE — dry-run validé |

- **Dry-run** : 38 exemples validés, VRAM estimée 17.1 GB (fp16) / 6.6 GB (4-bit)
- **HumanGate IMP-045** : approuvé 2026-06-03 — training réel nécessite `--model-path <devstral_local>`
- **Prochaine étape** : `python ml/lora_train_devstral.py --train --model-path <chemin>`

### Répartition du corpus

| Source | Exemples |
|---|---|
| golden_collector_v1 (charters closés) | 38 |
| mode_claude_run | 10 |
| autodev_session_IMP-010-025-027 | 9 |
| **Total** | **57** |

---

## Infrastructure ML

| Composant | Version |
|---|---|
| PyTorch | 2.13.0+cu132 (CUDA 13.2, RTX 5080 sm_120) |
| PEFT | 0.19.1 |
| Transformers | 5.10.1 |
| Accelerate | 1.13.0 |

### Modèles disponibles

| Modèle | Rôle | Statut |
|---|---|---|
| Qwen2.5-14B-Instruct (LM Studio) | Director — décisions opérationnelles | ACTIF |
| Qwen3.6-27B (LM Studio) | CEO Brain — analyses profondes | DISPONIBLE |
| devstral-small-2507 (HF local) | Base training LoRA | READY_FOR_TRAIN |

---

## Engine status (2026-06-04)

- `src/chess/search.rs` : iterative deepening, SEARCH_DEADLINE thread-local, aspiration windows, TT, killer moves, history heuristic, quiescence sans cap + delta pruning, futility pruning depth 1-2, répétition early detection, light LMR, Zobrist-hash TT
- Root selection : pure argmax alpha-beta
- Tactical layer : SEE complet récursif, hanging detection, mate urgency, trade sanity, reply scan
- Eval : PST, sécurité roi, pseudo-mobilité, développement, pion arrière, draw_score calibration, finales KR vs K, outposts knight/bishop
- Search diagnostics : SearchTraceSchema complet (IMP-010)
- Opening book : 50-200 coups
- FEN en passant : rank 3/6 validé (KI-25)

---

## Evidence-plane status

Claim posture : `NO_CLAIM_ALLOWED` | `no_global_ready_verdict: true`

---

## Next steps

1. Lancer training LoRA réel (`python ml/lora_train_devstral.py --train --model-path <devstral_local>`)
2. Benchmark puzzles holdout L1/L2/L3 post-moteur
3. Implémenter IMP-047 (architecture dual-model brain/router)
4. Nouveau pool SF avec deux moteurs asymétriques (quand disponible)
5. IMP-008 dataset rebuild (HumanGate requis, Stockfish requis)
