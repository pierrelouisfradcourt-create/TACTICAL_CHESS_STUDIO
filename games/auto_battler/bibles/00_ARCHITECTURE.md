# Architecture des Bibles — Auto Battler

**Date** : 2026-07-18
**Source** : session de co-conception Pierre × Claude (Fable 5)
**Statut** : RATIFIÉ par Pierre (HumanGate) — toute modification de ce document repasse par lui
**Rôle** : ce document est le contrat maître. Les bibles ne documentent pas seulement le jeu :
elles définissent des **contrats** entre le design, le moteur, les outils de validation,
les générateurs de contenu et les agents. C'est un langage formel de conception.

---

## 1. Liste canonique des bibles

Transversales (référence pour toutes les autres) :
- `00_ARCHITECTURE.md` — ce document
- `00_TEMPLATE.md` — gabarit commun obligatoire des bibles système
- `00_VOCABULARY.md` — Vocabulary Bible : langage officiel du projet (un mot = une notion)

Ordre ratifié (invariants → systèmes → contenu → validation → implémentation → déploiement) :

| # | Bible | Rôle en une ligne |
|---|---|---|
| 1 | Game | Vision et piliers — ce qu'est le jeu |
| 2 | Core Rules | Invariants : simulation pure, N sièges, boucle, tie-breaks |
| 3 | Decision | TOUTE décision automatique (unités, boutique, bots, ciblage, tie-breaks) |
| 4 | Combat | Résolution : déplacement, portée, mana, compétences, événements |
| 5 | Economy | Or, intérêts, boutique, pool partagé, niveaux |
| 6 | Meta | **Objectifs** du méta-jeu (archétypes viables, variance, pivots) |
| 7 | DSL | **Contraintes de création** — contrat générateurs ↔ moteur |
| 8 | Content | Unités, origines, classes, objets (écrits CONTRE 6 et 7) |
| 9 | Balance | **Manuel de maintenance** : mesurer, décider, leviers — AUCUN budget |
| 10 | Oracle | Comment savoir qu'une règle fonctionne (VALIDE le moteur) |
| 11 | Simulation | Comment produire de la connaissance (EXPLORE le moteur) |
| 12 | Technical | Implémentation : structures, ordre d'exécution |
| 13 | UX/UI | Interface, feedback joueur |
| 14 | Visual | Direction artistique, VFX, lisibilité |
| 15 | Platform | Décisions produit : solo, bots, matchmaking, réseau, sauvegarde |
| 16 | LiveOps | **PASSIVE** — réserve d'architecture pour extension sans réécriture |

## 2. Principes fondamentaux ratifiés

### P1 — Le moteur est une simulation pure
```
État(t) + Entrées(t) = État(t+1)
```
- Le RNG n'est pas un concept à part : `rng_state` est une **composante du GameState**.
  Le seed n'apparaît qu'à l'initialisation. Jamais de re-seed en cours de partie.
- Le moteur est une fonction pure `GameState -> GameState`.
- Pas de temps réel. Pas de dépendance graphique. Pas d'aléatoire caché. Pas de logique côté interface.
- Un replay = état initial + journal d'entrées. Rien d'autre.
- Ce principe rend possibles : replays, tests, campagnes IA, recherche de bugs, rollback, lockstep réseau.

### P2 — Le renderer est un lecteur d'événements
```
GameState → Simulation → Event Log → Renderer
```
- **Interdiction au renderer de lire le GameState.** Il ne connaît que le vocabulaire
  d'événements fermé (Spawn, Move, Attack, Cast, Damage, Death, Victory, …) défini
  dans la Combat Bible et le Vocabulary.
- Conséquences : changer toutes les animations ne change jamais un test ; replay = relecture
  du journal ; spectateur réseau = même flux ; export vidéo sans logique supplémentaire.
- L'oracle garde la simulation ; le playtest humain garde le renderer. Deux surfaces, deux juges.

### P3 — N sièges = invariant de design
- N (nombre de sièges du lobby) appartient aux **Core Rules**, pas à la Platform Bible.
- Il calibre : taille du pool, probabilités de boutique, durée, dégâts, pression économique,
  fréquence des contestations. Paramétrable, valeur de référence **N = 8**.
- L'incarnation des sièges (humains, bots, réseau) = Platform Bible.

### P4 — « Toutes les règles et probabilités sont connues »
- Remplace « information parfaite » (terme faux). C'est l'invariant testable :
  probabilités affichées = probabilités réelles.

### P5 — Où vivent les budgets
- **Meta Bible = objectifs** (ex. 8 archétypes viables, durée cible, variance cible,
  diversité, fréquence de pivot).
- **DSL Bible = contraintes de création** (nb max de capacités, coût max, complexité, vocabulaire).
- **Balance Bible = manuel de maintenance** : comment mesurer, comment décider d'un ajustement,
  quels leviers, dans quel ordre (comportement → interaction → statistiques). Aucun budget.
  Elle n'est pas une source de vérité.

### P6 — Decision Bible : ordre total obligatoire
- Chaque point de décision automatique du jeu y est énuméré ; chacun définit un **ordre total**.
- Jamais de « au hasard parmi les ex æquo » hors RNG d'état.
- Chaque point de décision énuméré devient un invariant Oracle (état donné → décision unique).

### P7 — Oracle valide, Simulation explore
- Oracle Bible → `software_verdict` (gate de merge). Déterministe, non-LLM.
- Simulation/Meta → connaissance **advisory** pour le HumanGate d'équilibrage. Jamais un gate de merge.
- Protocoles de mesure pré-enregistrés (pas de tuning post-hoc).
- Bot-méta ≠ méta humain : version et force des bots consignées avec chaque campagne.

### P8 — DSL monde fermé
- Whitelist de primitives. Aucune échappatoire vers du code arbitraire.
- Nouvelle primitive = gate HumanGate (agrandit la surface du moteur).
- Le validateur DSL est lui-même un oracle : fail-hard, non-LLM.
- LiveOps PASSIVE concrète : une saison = fichiers DSL nouveaux + fixtures oracle, zéro changement moteur.

### P9 — Pipeline de contenu
```
Méta cible → Budgets → Contenu → Simulation → Ajustement
```
Le contenu est une conséquence des objectifs de méta, jamais l'inverse.

### P10 — Propriété étanche des concepts *(ratifié HumanGate 2026-07-18, gate #3)*
Une bible ne peut définir que les concepts dont elle est propriétaire.
- Combat possède : Tick, Attack, Death (les règles et événements de résolution).
- Balance possède : coefficients, formules, constantes.
- DSL possède : les données.
Ainsi : Combat ne définit jamais un coefficient ; Balance ne définit jamais un événement ;
le DSL ne définit jamais une règle. Les responsabilités restent parfaitement étanches.
Corollaire (registre des Events) : la LISTE close des Events (INV-12) est un registre unique
tenu par les Core Rules ; chaque bible propriétaire définit les payloads de SES Events.

### P11 — Noyau content-agnostic *(ratifié HumanGate 2026-07-18, gate #4)*
Aucune logique métier du moteur ne peut dépendre d'un TYPE DE CONTENU futur. Le noyau de
simulation ne connaît ni `Warrior`, ni `Mage`, ni `Origin`, ni `Trait`, ni `Item` — il ne
manipule que des **abstractions génériques** (`EntityId`, `PlayerId`, `Input`, `Event`,
`State`, …). Le contenu concret arrive exclusivement par le DSL (P8), interprété au-dessus du
noyau. Conséquence directe : le moteur doit pouvoir faire tourner un Match composé d'états et
d'entrées **même si aucune règle de jeu n'est encore implémentée**. Ce principe empêche chaque
incrément de créer des dépendances vers les bibles futures ; sa violation (un identifiant de
contenu figé dans le noyau) = défaut d'architecture, attrapé par `check_architecture` /
`deps_interdites`.

## 3. Règles d'écriture
- Toutes les bibles système suivent `00_TEMPLATE.md` (sections identiques, y compris DSL Hooks :
  « voici ce que le DSL est autorisé à modifier » — les frontières restent explicites).
- Tous les termes canoniques viennent de `00_VOCABULARY.md`.
- Toute bible générée porte : date + source + statut (DRAFT tant que Pierre n'a pas ratifié).
- Les notes brutes de Pierre (`SOURCE_GAME_BIBLE_V1_PIERRE.md`) ne sont jamais réécrites.
- Toute décision de design nouvelle rencontrée en écrivant = marquée `[QUESTION → Pierre]`,
  jamais tranchée par un agent.
