# Vision — Tactical Chess Studio

status: CANONICAL
date: 2026-05-27
authority: HumanGate

---

## Ce que c'est

Un studio de création de jeux vidéo AI-gouverné, piloté par un opérateur humain solo,
avec une IA joueur/coach/meta-testeur (Rocky) au centre.

Le studio produit des jeux, des outils, et des modules commercialisables.

---

## Modèle commercial

| Produit | Forme | Phase |
|---|---|---|
| Rocky SDK / licence | Module IA joueur + coach explicable | Phase 1 |
| Chess Fantasy | Jeu tactique standalone | Phase 2 |
| Chess TCG | Jeu de cartes tactique | Phase 2-3 |
| Autres jeux | Snake, Belote, etc. | Phase 3 |
| App seniors | Guidage vocal/visuel smartphone | Projet parallèle |

---

## Doctrine fondatrice

Tiré du Paradoxe Skynet :

```
IA-jardinier, pas Skynet-ingénieur.
Le studio reste ouvert, adaptatif, nourri par du feedback réel.
L'humain (HumanGate) reste autorité finale.
```

Conséquences :
- Rocky apprend des vrais joueurs, pas seulement de lui-même
- Le studio s'auto-améliore mais ne décide pas seul
- Les jeux sont des systèmes vivants, pas des produits figés

---

## Architecture Rocky — deux vitesses

Inspirée d'AlphaStar — agile, multi-jeux.

### Fast path (temps réel)

```
GameState
→ LegalActions
→ NeuralProposal      (intuition, guidance)
→ SearchResult        (calcul tactique, autorité finale)
→ CriticVerdict       (filtre — bloque les incohérences)
→ AuthorityDecision   (tranche une seule action)
→ ValidatedAction
→ Executor.apply()
→ Telemetry
```

### Slow path (hors temps réel)

```
Telemetry / Replays / Errors
→ LLM analyst (LM Studio — Devstral/Mistral)
→ explications / curriculum / tâches
→ HumanGate
→ amélioration bornée
→ Feedback / Memory
```

Règle d'autorité centrale :
- Search = autorité tactique finale
- Neural = propose, ne décide jamais seul
- Critic = filtre, ne joue pas
- LLM = slow path uniquement — jamais dans la boucle de coups
- HumanGate = autorité finale sur tout

---

## Intégration LLM — rôles précis

Le LLM (LM Studio local) intervient **hors boucle critique** :

| Rôle | Description |
|---|---|
| Coach | Explique les coups de Rocky via le decision tree |
| Analyste | Lit replays, traces, anomalies |
| Curriculum builder | Erreur Rocky → puzzle → replay test → explication |
| Audit studio | Review L1 packs avant exécution Codex |
| Draft assistant | Analyse board Chess 960 avant premier coup (pre-move) |

Le LLM ne fait jamais :
- Choisir le coup final
- Bypass Search ou Critic
- Activer training / dataset / model promotion
- Décider une claim

---

## Vision studio — petite entreprise auto-apprenante

```
Rocky        = employé spécialisé (jeu)
LLM local    = manager opérationnel
UxPilote     = tableau de bord direction
HumanGate    = PDG (toi)
Pipeline     = process qualité
```

Le studio s'améliore progressivement via :
- Rocky qui joue et génère des erreurs
- LLM qui analyse et construit le curriculum
- HumanGate qui valide les patches
- LoRA pour affiner le LLM local sur le corpus studio

---

## Projet coaching "rétro-engineering"

Rocky démarre nerfé selon le niveau du joueur.
Quand le joueur monte de niveau, Rocky récupère progressivement son code.
Il s'adapte via le dataset co-créé avec le joueur.
Le decision tree de Rocky est lu par le LLM pour expliquer chaque décision.
Concept : le joueur déblocke l'intelligence de Rocky.
