# Roadmap — Tactical Chess Studio

status: CANONICAL
date: 2026-06-04
authority: HumanGate
no_global_ready_verdict: true

---

## Phase 1 — Rocky jouable et explicable

Objectif : démo Rocky vs Humain avec commentaires LLM.
Livrable commercial : SDK Rocky / licence.

| Tâche | Statut | Priorité |
|---|---|---|
| Brancher LM Studio sur le decision tree de Rocky | DONE — coach v0 opérationnel + autoloop câblé | P2 |
| UxPilote v1 — cockpit lecture seule | DONE — autopilot.py (3164 lignes, port 7331) | P4 |
| Rocky explique ses coups en langage naturel | IN_PROGRESS — coach v0 opérationnel, qualité LLM à affiner (prompt) | P3 |
| Régénérer promoted_pedagogy_pack.jsonl via Stockfish teacher | BLOCKED — IMP-008 FORBIDDEN, Stockfish requis | P0 |
| Activer Chess 960 (HumanGate requis) | BLOCKED — en attente décision | P1 |

---

## Phase 2 — Chess Fantasy + Studio

Objectif : Chess Fantasy jouable, studio pilotable.

| Tâche | Statut | Priorité |
|---|---|---|
| Pipeline de dev stabilisé | IN_PROGRESS — kaizen_autoloop câblé, 44/47 IMPs CLOSED | P4 |
| LM Studio pilote tâches studio | IN_PROGRESS — autoloop câblé, boucle complète opérationnelle | P3 |
| LoRA fine-tuning | IN_PROGRESS — v1 dry-run validé (57 exemples), training réel à lancer | P2 |
| Chess Fantasy runtime minimal (règles core) | DOCUMENTED_ONLY | P0 |
| Rocky muté pour Chess Fantasy | NOT_STARTED | P1 |
| Puzzles : 3 niveaux + from errors + vocabulaire officiel | NOT_STARTED | P3 |

---

## Phase 3 — Multi-jeux + Commercial (ongoing)

| Tâche | Statut |
|---|---|
| Architecture multi-agent CEO/Director/Router/Worker | PLANNED — IMP-047 OPEN (SAFE_AUTO) |
| LoRA Devstral TCS v2 (training réel + évaluation) | PLANNED |
| Coaching IA rétro-engineering | NOT_STARTED |
| Snake autour du monde | NOT_STARTED |
| Belote | NOT_STARTED |
| App seniors (guidage vocal/visuel) | NOT_STARTED |
| Ligue / selfplay avancé | NOT_STARTED |

---

## Décisions ouvertes (HumanGate)

| Décision | Options | Urgence |
|---|---|---|
| Training LoRA réel | `--model-path <devstral_local>` fourni → lancer | Immédiat |
| IMP-047 — dual-model brain/router | Qwen3.6 CEO + Qwen2.5 Director dans autopilot.py | Phase 2 |
| Stockfish installation | Chemin TCS_STOCKFISH_PATH — débloque IMP-008 | Phase 2 |
| Chess 960 activation | Activer maintenant ou après dataset ? | Phase 1 |
| Générateur cartes TCG | Récupérer ancien disque dur ou reconstruire ? | Phase 2 |

---

## Ce qui est sain maintenant

```
✅ Moteur Rust — compile, 44 IMPs CLOSED
✅ ELO post-39-IMPs mesuré (teacher_uci=1351, heuristic=1183, neural=1079)
✅ draw_rate 0.68 (vs 0.94 en mai)
✅ pool_2400.jsonl actif (1M parties, 8.8% draws)
✅ Autopilote opérationnel (kaizen_autoloop, CEO Brief, Page Studio OS)
✅ golden_collector → 57 exemples archivés (38 charters + 19 autres)
✅ LoRA dry-run validé, HumanGate approuvé (IMP-045)
✅ Architecture governance — AGENTS.md, HumanGate, evidence-plane
✅ Holdout puzzles L1/L2/L3 (1 000 positions chacun)
✅ LM Studio dual-model (Qwen2.5-14B Director + Qwen3.6-27B CEO Brain)
```
