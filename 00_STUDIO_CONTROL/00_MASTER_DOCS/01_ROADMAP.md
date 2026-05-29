# Roadmap — Tactical Chess Studio

status: CANONICAL
date: 2026-05-27
authority: HumanGate
no_global_ready_verdict: true

---

## Phase 1 — Rocky jouable et explicable (4-6 semaines)

Objectif : démo Rocky vs Humain avec commentaires LLM.
Livrable commercial : SDK Rocky / licence.

| Tâche | Statut | Priorité |
|---|---|---|
| Régénérer promoted_pedagogy_pack.jsonl via Stockfish teacher | BLOCKED — dataset manquant | P0 |
| Activer Chess 960 (HumanGate requis) | BLOCKED — en attente décision | P1 |
| Brancher LM Studio sur le decision tree de Rocky | IN_PROGRESS — ml/coach.py v0 operationnel, parsing log a affiner | P2 |
| Rocky explique ses coups en langage naturel | NOT_STARTED | P3 |
| UxPilote v1 — cockpit lecture seule | NOT_STARTED | P4 |

Prérequis bloquants :
- Stockfish installé sur le nouveau PC
- Dataset régénéré (teacher_uci_runner)
- LM Studio connecté au decision tree

---

## Phase 2 — Chess Fantasy + Studio (6-8 semaines)

Objectif : Chess Fantasy jouable, studio pilotable.

| Tâche | Statut | Priorité |
|---|---|---|
| Chess Fantasy runtime minimal (règles core) | DOCUMENTED_ONLY | P0 |
| Rocky muté pour Chess Fantasy | NOT_STARTED | P1 |
| Générateur de cartes TCG (récupérer depuis sauvegarde) | UNKNOWN | P2 |
| Puzzles : 3 niveaux + from errors + vocabulaire officiel | NOT_STARTED | P3 |
| Pipeline de dev stabilisé (HumanGates assouplis) | NOT_STARTED | P4 |

---

## Phase 3 — Multi-jeux + Commercial (ongoing)

| Tâche | Statut |
|---|---|
| Coaching IA rétro-engineering | NOT_STARTED |
| Snake autour du monde | NOT_STARTED |
| Belote | NOT_STARTED |
| LoRA sur LLM local | NOT_STARTED |
| App seniors (guidage vocal/visuel) | NOT_STARTED |
| Ligue / selfplay avancé | NOT_STARTED |

---

## Décisions ouvertes (HumanGate)

| Décision | Options | Urgence |
|---|---|---|
| Assouplir certains HumanGates | Quels gates ? Quelles règles ? | Phase 1 |
| Chess 960 activation | Activer maintenant ou après dataset ? | Phase 1 |
| Stockfish installation | Chemin TCS_STOCKFISH_PATH | Immédiat |
| Générateur cartes TCG | Récupérer ancien disque dur ou reconstruire ? | Phase 2 |

---

## Ce qui est sain maintenant

```
✅ Moteur Rust — compile, tests passent
✅ Repo propre — 7 commits de nettoyage (2026-05-27)
✅ LM Studio en place (Devstral/Mistral)
✅ Pipeline ML Python — existe, dataset à régénérer
✅ Sources PGN champions du monde — présentes dans le repo
✅ Architecture governance — AGENTS.md, HumanGate, evidence-plane
```
