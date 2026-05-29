# Rocky — État et prochaines étapes

status: CANONICAL
date: 2026-05-27
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

## État actuel

| Surface | Statut | Notes |
|---|---|---|
| Moteur Rust (chess/) | IMPLEMENTED | Compile, tests passent |
| Search (alpha-beta, ID, killers, LMR, quiescence) | IMPLEMENTED | Clone root = plafond perf, non bloquant |
| Practical Policy | IMPLEMENTED | SEE-lite, hanging-piece, mate urgency, trade sanity |
| Neural bridge (Python↔Rust) | IMPLEMENTED | Instable sur Windows — à surveiller |
| Decision tree / traces | IMPLEMENTED | AAA signals dans export/loader/training |
| LLM branché sur decision tree | IN_PROGRESS — ml/coach.py v0 cree | Phase 1 P2 |
| Chess 960 | BLOCKED | Architecture prête, activation HumanGate requise |
| Dataset actif | BROKEN | promoted_pedagogy_pack.jsonl manquant — à régénérer |
| Selfplay / ligue | DOCUMENTED_ONLY | Pipeline existe, dataset requis |

---

## Dataset — état réel

Sources disponibles dans le repo :
```
lab/datasets/linked_pedagogy/
  ├── 2024-fide-chess-world-championship.pgn  (36 KB — Ding vs Gukesh)
  ├── Ding_vs_Gukesh_*.pgn                    (6 parties)
  ├── [World Cup 2023 PGN files]              (~700 KB total)
  └── 4FktECSUMctPekzB8E8C.pgn               (333 KB — corpus principal)

lab/pedagogy_db/
  ├── PEDAGOGICAL_DB_CONVERSION.pgn
  ├── PEDAGOGICAL_DB_ENDGAMES.pgn
  ├── PEDAGOGICAL_DB_TACTICS.pgn
  └── candidate_games_for_triage.csv          (1.2 MB)
```

Pour régénérer : Stockfish + teacher_uci_runner + dataset_phase_builder.
ACTIVE_DATASET.txt doit pointer vers un vrai .jsonl une fois régénéré.

---

## Puzzles — architecture cible

3 systèmes distincts (non implémentés) :

1. Puzzles par difficulté (3 niveaux) — positions tactiques bornées
2. Puzzles from errors — générés depuis les erreurs de Rocky en partie
3. Puzzles vocabulaire — explique les concepts (fourchette, clouage, etc.) avec 3 niveaux

Note : puzzle_rng.rs existe mais n'est pas la bonne approche pour les niveaux.

---

## LLM intégration — vision

Rocky joue → decision tree enregistre le raisonnement →
LLM local lit le tree → explique le coup en langage naturel →
Coaching contextuel au niveau du joueur.

Phase draft (Chess 960, Chess Fantasy) :
LLM analyse le board avant le premier coup et propose une stratégie.

---

## Prochaine étape concrète

1. Installer Stockfish (définir TCS_STOCKFISH_PATH)
2. Lancer teacher_uci_runner sur les PGN champions du monde
3. Régénérer promoted_pedagogy_pack.jsonl
4. Mettre à jour ACTIVE_DATASET.txt
5. Valider pipeline ML end-to-end

---

## Architecture cible — deux vitesses

Source : discussions ChatGPT récupérées (2026-05-26), non encore formalisées localement.

### Fast path (temps réel)

```
GameState
→ LegalActions
→ NeuralProposal      (intuition, policy/value, priorisation)
→ SearchResult        (calcul tactique, meilleur coup robuste)
→ CriticVerdict       (filtre avant exécution)
→ AuthorityDecision   (tranche une seule action finale)
→ ValidatedAction
→ Executor.apply()    (applique — ne réfléchit pas)
→ Telemetry
```

### Rôles précis

**Critic** — filtre, ne choisit pas :
- Vérifie légalité, ActionMask, Chess960 castling rights
- Détecte désaccord Search/Neural, fallback suspect
- Produit : PASS / WARN / BLOCK / ESCALATE
- Ne produit jamais final_move

**Authority** — tranche :
- Search gagne si tactiquement clair
- Critic peut bloquer
- Neural ne bypass jamais
- Fallback sûr si incertitude

**Executor** — applique seulement :
- Refuse toute action non validée par Authority
- Logue pour telemetry/feedback/memory

### Slow path (hors temps réel)

```
Telemetry / Replays / Errors
→ LLM analyst (LM Studio)
→ hypothèses / explications / tâches Codex
→ HumanGate
→ Codex bounded patch → tests
→ Feedback / Memory / Curriculum
```

Le LLM ne fait jamais :
- Choisir le coup final
- Bypass Search ou Critic
- Activer training / dataset / model
- Décider une claim

---

## Specs à créer (Phase 1)

Ces fichiers sont référencés dans les discussions mais n'existent pas encore localement :

```
REALTIME_HYBRID_PLAYER_ARCHITECTURE_V0.md
HYBRID_CHESS960_AGENT_ARCHITECTURE_V0.md
PLAYER_IMPROVEMENT_TASK_QUEUE_V0.yaml
LORA_READINESS_PLAN_V0.md
```
