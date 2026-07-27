# Ratifications Pierre — 2026-07-26 (PROMU)

> **PROMU au decision-log le 2026-07-26** (les 3 entrées copiées verbatim dans
> `decision-log.md`) par la session Troisième Cerveau sur go explicite Pierre — JALON 0
> décision ①. Cette promotion vaut ratification du protocole V1/V1.1 (destination D4).
> Ce fichier reste comme trace de rédaction — ne plus le modifier.

> Rédigé au format du `decision-log.md`, **à promouvoir par Pierre lui-même** (le log stipule
> « Seul Pierre peut ajouter/modifier des entrées »). Source : session de consolidation du
> 2026-07-26, analyse comparative des contrats YAML Codex (dormants) vs contrats Forge (vivants).

---

## 2026-07-26 — Trois primitives méthodologiques reprises au corpus Codex (CODEX_METHOD_SALVAGE_V1)

**Décision** : sur les ~14 primitives du corpus Codex `00_STUDIO_CONTROL/01_SYSTEM/`, trois sont
retenues, dans cet ordre de priorité, et le reste est explicitement abandonné.

1. **`skipped_validation[]` structuré** — *gain élevé, coût faible*. Généralise aux 21 contrats
   une pratique déjà validée pour le seul `orchestrator.yaml` (« puis une section "ce que je n'ai
   PAS prouvé", explicite »). **GO.**
2. **Enrichissement de `pending_review_decisions.jsonl`** — *gain élevé, coût modéré*. Rend les
   décisions exploitables par les étapes suivantes (aujourd'hui on enregistre QUE Pierre a tranché,
   pas ce que la décision autorise ensuite). **GO.**
3. **Registre de claims nommés** — **CONDITIONNEL** : uniquement si chaque claim possède un
   **vérificateur mécanique exécuté par s12**. Sans cela, le coût de maintenance dépasse le
   bénéfice. **Pas de go tant que la condition n'est pas remplie.**

**Contexte** : le corpus Codex (43 YAML, mai 2026) est **déjà présent dans master à l'identique**
mais **DORMANT** — aucun lecteur hors `scripts/studioV2/` (lane gelée), et `studioctl.py` n'en fait
qu'un readback texte en redéclarant le schéma en dur. `LOOP_REGISTRY.yaml` déclare ses 5 étapes en
`DOCUMENTED_ONLY` : par sa propre déclaration, la boucle n'a jamais tourné. Il n'y avait donc rien
à récupérer en fichiers — seulement de la méthode.

**Alternatives rejetées** (et pourquoi) :
- *Queue + matrice de priorité* (`TASK_QUEUE`, `TASK_PRIORITY_MATRIX`) → double la couche kaizen
  gelée ; la liste `tasks:` du gabarit est vide (aucune preuve qu'elle ait jamais ordonné quoi que
  ce soit) ; ses 5 scores sont remplis par un LLM sans preuve de variance (cf. règle de variance).
- *Registres* (`AGENT_REGISTRY`/`LOOP_REGISTRY`/`FILE_REGISTRY`) → `contracts/*.yaml` + `roles.yaml`
  + `dispatch.PROFILES` sont les mêmes objets, en exécutable ; `FILE_REGISTRY` (41 Ko) double git.
- *Verdict par surface* → ontologie de salle de contrôle documentaire, pas de jeu ; Forge a déjà
  le détail par oracle + `is_clean_pass()`.
- *Boucle enseignant/élève* → couverte en mieux par pool + escalade bornée + red-team advisory +
  journal d'erreurs relu au retry. De plus Codex donne à `codex_teacher` une `truth_authority`,
  c'est-à-dire un LLM-juge — contraire à l'invariant ADR-002.
- *Échelle `created/registered/loaded/enforced/evidenced`* → Codex ne la résout pas non plus
  (auto-déclarée `UNKNOWN` par l'agent) ; adopter le vocabulaire sans la preuve reproduirait
  « déclaré ≠ exécuté » sous un nouveau nom.

**Garde-fou de mise en œuvre (dérivé du mode de panne observé)** : le corpus Codex est mort d'avoir
été déclaratif sans lecteur. Toute primitive reprise doit donc arriver avec **son point de mesure**.
Pour la primitive 1 : la règle est injectée dans le prompt ET l'adoption est **mesurée** (le champ
est-il réellement rempli par les agents ?), en **advisory d'abord** — le passage en gate dur est une
décision Pierre distincte, prise au vu des chiffres d'adoption. Même exigence que celle posée par
Pierre pour la primitive 3.

**Critères de révision** : si la mesure d'adoption de `skipped_validation[]` montre que les agents
ne le remplissent pas (ou le remplissent vide systématiquement), la primitive est à requalifier —
pas à durcir en gate.

---

## 2026-07-26 — L'unité d'observation devient `subject(type, id)` (LEARNING_SUBJECT_MODEL_V1)

**Décision** : généraliser la clé de la courbe d'apprentissage. `brick_id` (seule unité aujourd'hui)
devient un **sujet typé** — `subject: {type, id}` avec `type ∈ {brick, game}` — sans casser les
entrées existantes, qui restent lisibles telles quelles.

**Contexte (découvert par un branchement réel, pas par un audit sur pièces)** : `learning_metrics`
était écrit, testé et appelé par personne. Une fois branché, le backfill sur les 7 runs archivés a
produit **0 ligne** : la courbe est indexée par `brick_id`, c'est-à-dire les briques de
`knowledge_base/systems/` issues du pipeline d'ingestion KB, alors que tous les runs Forge
produisent un **jeu**. La mesure n'était pas cassée — elle observait une autre unité que celle
qu'on voulait suivre. Vérifié : les grandeurs sous-jacentes portent bien de l'information
(`reuseRatio` = 3 valeurs distinctes sur 6 jeux : 0 · 0,059 · **0,333 pour `kb_tactics`**, seul jeu
assemblé par import réel de briques ; `oracle_iterations` = {1, 1, 5, 6}).

**Ce qui a été validé au passage** : l'agent a REFUSÉ de forcer le nom du jeu dans `brick_id`
(règle anti-invention). Un système moins mûr aurait produit un joli tableau de bord alimenté par
une donnée inventée, et toutes les décisions suivantes auraient reposé dessus. « Pas de preuve =>
pas de donnée » est une propriété de qualité, pas un échec.

**Alternatives rejetées** :
- *Un fichier séparé par famille* (`game_metrics.jsonl`, `agent_metrics.jsonl`…) → demain il y aura
  jeux, outils, agents, pipelines, briques ; on recréerait N fichiers plus un agrégateur.
- *Promouvoir tous les jeux en briques du catalogue* → séduisant mais destructeur du modèle mental :
  **une brique est une capacité réutilisable, un jeu est un produit assemblé**. Les confondre casse
  la sémantique du catalogue.

**Garde-fou** : `type` est une énumération contrainte, jamais un champ libre — sinon la
prolifération qu'on refuse au niveau des fichiers revient au niveau des valeurs. La
rétro-compatibilité se fait par **normalisation à la lecture**, patron déjà établi dans le dépôt
(`hook_guard.marker_key` pour le marqueur 2-champs vs triplet ; `premortem` pour les entrées de
journal sans `resolution`/`status`). La ligne historique n'est jamais réécrite.

**Critère de succès, falsifiable** : après ce changement, le backfill doit passer de **0 ligne à N
lignes réelles** sur les runs archivés. Si le compte reste à 0, le modèle de sujet n'est pas la
cause du blocage et le diagnostic est à reprendre.

**Ordre ratifié pour la suite** : (1) modèle de sujet · (2) brancher les deux sources (KB reuse +
métriques de production Forge, dont `s10s-oracle-standard` aujourd'hui non couvert) ·
(3) `learning_event` au-dessus · (4) règles candidates. Pas d'anticipation d'étape.

---

## 2026-07-26 — D1→D6 + go M1 : cadre du Troisième Cerveau tranché (THIRD_BRAIN_DECISIONS_V1)

**Décisions prononcées explicitement par Pierre en session (verbatim résumé)** :
- **D4** — les ratifications HumanGate quittent `DREAMS.md` (legacy) ; destination canonique =
  `studio_brain/decisions/decision-log.md` versionné. Appliqué au skill `/gate` le jour même.
- **D1** — échelle mécanique retenue : `Declared → Referenced → Executed → Verified`
  (l'échelle 0-5 est abandonnée, cran « optimisé » invérifiable).
- **D3** — `review_by` par défaut : **30 jours** (sunset : une règle expire sauf reconduction).
- **D6** — go commit en 3 lots séparés (doctrine/protocole · mémoire/handoff · code livré) ;
  **pas de push sans validation séparée**.
- **D2** — principe d'un plafond de tokens par run avec conséquence pré-écrite : **ACCEPTÉ** ;
  la valeur est volontairement différée après M1 (donnée actuelle biaisée : succès seulement).
- **D5** — direction acceptée : `mandatory_read` évolue vers une injection mesurée via le
  Context Manifest ; **exécution différée après M1** (une variable à la fois).
- **M1** — go pour PRÉPARER la mission télémétrie d'échec (préparation ≠ exécution ;
  le lancement du run reste une validation séparée).

**Contexte** : audit de décision du 2026-07-26 (stratégie confrontée à l'état réel du dépôt,
23 fichiers en pile, distribution tokens 44 k→1,8 M succès-seulement, `/gate` vérifié pointant
encore DREAMS.md). Suppressions éditoriales appliquées le jour même : arbre de triage unique
(§7.5), roadmap canonique unique (V1 §6), cran « optimisé » retiré, item redondant retiré.

**À promouvoir par Pierre au decision-log** (destination D4) — ce fichier reste PROPOSED
jusqu'à cette promotion, qui vaudra aussi ratification du protocole V1/V1.1.
