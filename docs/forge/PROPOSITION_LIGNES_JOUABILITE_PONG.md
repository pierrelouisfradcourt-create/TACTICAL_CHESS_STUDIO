# PROPOSITION — lignes de jouabilité de la wiremap Pong (étape 4 du niveau 1)

Date : 2026-07-27 · Auteur : session Troisième Cerveau · Statut : **PROPOSED — attend la
ratification de Pierre (gate U-3 / G-3)**. Aucune modification n'a été appliquée à
`games/pong/09_WIREMAP/wiremap.json`.
`claim_verdict: NO_CLAIM_ALLOWED`.

---

## 1. CORRECTION de mes rapports précédents (lecture directe de la wiremap, ce jour)

Mes rapports A1 et le rapport de décision annonçaient « 3 constats jamais spécifiés ». **C'est
inexact, et l'erreur est significative.** Lecture des 13 lignes et de leurs `expected_proof` :

| Constat de Pierre | Ligne existante | Ce que la wiremap dit déjà | Diagnostic **corrigé** |
|---|---|---|---|
| Quitter inerte | **`core.exit` existe** (`system.adapter`) | preuve = « processus terminé, code 0 », réalisée par `spawnSync('node exit.mjs') → status=0` | **spécifié pour le MAUVAIS RUNTIME** : l'intention est écrite dans le vocabulaire d'un processus Node, pas d'un joueur en navigateur. Preuve tautologique (= F6 du red-team) |
| Vitesse injouable | `play.ball` existe | preuve = « NO-TUNNEL à toute vitesse », testée de 10 à 900 | **jamais spécifié comme bande jouable** — et le test prouve l'inverse : la robustesse *à toute* vitesse, donc il ne peut structurellement pas détecter « trop rapide pour un humain » |
| Pas d'adversaire solo | **aucune ligne** | — | **jamais spécifié** (confirmé) |
| Score illisible | `play.score` existe | preuve = « exactement un point pour le camp opposé, score **affiché** » — mais la preuve réelle est un comptage d'événements (`score_exactly_one_per_point`) | **spécifié en intention, preuve non observable** : le mot « affiché » est dans l'énoncé, rien ne le vérifie |
| Pas de fin / rejouer | **`core.end_condition` ET `core.restart` existent, IMPLEMENTED** | preuves par bot : partie complète en 99 ticks, `restart == premier boot` | **spécifié ET PROUVÉ mécaniquement** — mais par un bot en Node. Aucun écran, donc rien d'observable par un joueur. Les deux affirmations sont vraies en même temps |

**Ce que cette correction change** : sur 5 constats, **2 sont réellement absents** (adversaire
solo, bande de vitesse jouable). Les **3 autres sont spécifiés, parfois même prouvés**, avec une
preuve qui n'est **pas observable par un joueur**.

Donc l'étape 4 n'est pas « ajouter 5 lignes » : c'est **2 lignes nouvelles + 3 preuves à
requalifier**. Et cela renforce le diagnostic de Pierre en le précisant :

> Le studio sait spécifier et prouver la **mécanique**. Il ne sait pas spécifier l'**expérience**.

Le champ `observable_by_player` devient donc le cœur du sujet, pas un ajout cosmétique — il est
exactement ce qui manque aux 3 lignes déjà présentes.

**Bonne nouvelle collatérale** : le champ **`source_role` existe DÉJÀ** dans le schéma de chaque
ligne (`"source_role": null` sur les 13). Le lot N2-1 est donc moins cher que je l'ai chiffré :
le champ est là, c'est sa **population** par le Prisme qui manque, pas sa création.

---

## 2. Les 2 lignes NOUVELLES proposées

Format strictement conforme au schéma lu (`id · source · source_role · reference · category ·
provides · requires · owner · system_parent · address · expected_proof{kind,statement} · state ·
reason · until · decider · write_order · fichiers[] · fonction · preuve · statut`), **plus** le
champ neuf `observable_by_player`.

### 2.1 `play.solo_opponent` — mode solo contre adversaire automatique

| Champ | Valeur proposée |
|---|---|
| `id` | `play.solo_opponent` |
| `source` | `ADDITIONS` (payée par le budget d'empilement — à vérifier au gel) |
| `source_role` | `player_reviewer` *(première population réelle du champ)* |
| `reference` | `playtest-2026-07-27` (entrée `error_journal/playtest.jsonl`) |
| `category` | `system` |
| `provides` | `["game.solo_opponent"]` |
| `requires` | `["game.state", "game.loop"]` |
| `system_parent` | `input` (l'adversaire est une source d'entrée substituée) |
| `address` | `05_SYSTEMS/input/` |
| `expected_proof` | `kind: bot_action` — « Une partie SOLO complète se joue de bout en bout : le joueur humain contrôle un seul camp, l'autre est piloté automatiquement, la partie atteint une fin. » |
| `observable_by_player` | **`true`** |
| `state` | `REQUIRED` (à construire) |
| **Garde-fou imposé** | l'adversaire du mode solo est **distinct du bot de solvabilité** (celui-ci a une latence de réaction nulle : c'est un outil de test, une borne supérieure de performance, jamais un adversaire jouable). La preuve doit citer les deux séparément. |

### 2.2 `play.playable_speed` — bande de vitesse jouable

| Champ | Valeur proposée |
|---|---|
| `id` | `play.playable_speed` |
| `source` | `ADDITIONS` |
| `source_role` | `gameplay_programmer` |
| `reference` | `playtest-2026-07-27` |
| `category` | `system` |
| `provides` | `["game.playable_speed"]` |
| `requires` | `["game.loop"]` |
| `system_parent` | `game_loop` |
| `address` | `05_SYSTEMS/game_loop/` |
| `expected_proof` | `kind: test` — « Le temps de traversée du terrain à la vitesse de service est ≥ un seuil déclaré (bande jouable), calculé depuis les constantes ; une vitesse hors bande FAIT ÉCHOUER le test. » |
| `observable_by_player` | **`true`** |
| `state` | `REQUIRED` |
| **Valeur à trancher par Pierre** | le seuil. Mesure actuelle : **~0,52 s** de traversée (`BALL_VX=3`, `FIELD_W=200`, 60 fps). Référence de genre à confirmer par World Scan : les Pong jouables se situent plutôt autour de **1,0-1,5 s** au service. **Je ne fixe pas ce chiffre** — c'est une décision de game design, et ce serait précisément le genre de valeur qu'une Genre Bible devrait fournir avec sa provenance. |
| **Note anti-contradiction** | cette ligne **ne contredit pas** `play.ball` (« NO-TUNNEL à toute vitesse ») : l'une prouve la robustesse du moteur à toute vitesse, l'autre contraint la vitesse **de service** offerte au joueur. Les deux doivent coexister. |

---

## 3. Les 3 preuves à REQUALIFIER (lignes existantes, `expected_proof` réécrite)

Aucune ligne ajoutée : on change ce que la preuve doit démontrer.

### 3.1 `core.exit` — de « le processus se termine » à « le joueur voit la sortie »

- **Aujourd'hui** : `bot_action` — « Sortie demandée → processus terminé, code 0 », réalisée par
  `spawnSync('node exit.mjs')`.
- **Proposé** : `expected_proof` **par runtime**, et `observable_by_player: true` —
  « Le comportement de sortie est défini pour CHAQUE runtime cible. En navigateur : un clic réel
  sur Quitter produit un effet **visible** (arrêt de la boucle + état final affiché) ; le chemin
  processus (code 0) reste valable pour les runtimes CLI/Godot. »
- **Pourquoi** : `window.close()` est ignoré par les navigateurs sur un onglet non ouvert par
  script — l'implémentation actuelle ne peut pas marcher, et la preuve actuelle ne peut pas le
  voir (elle teste un autre runtime). C'est le finding F6 du red-team, resté inaudible.

### 3.2 `play.score` — de « exactement un point » à « le score affiché est lisible et juste »

- **Aujourd'hui** : `bot_action` — « exactement un point pour le camp opposé, score affiché ». Le
  mot « affiché » est dans l'énoncé ; rien ne le vérifie (la preuve compte des événements).
- **Proposé** : conserver l'invariant de comptage **et** ajouter, avec
  `observable_by_player: true` — « L'état décisif est **lisible par un joueur** : le score est
  rendu en **chiffres** (pas en pips seuls), et le score affiché **correspond** au score d'état. »
- **Pourquoi** : le score est actuellement dessiné en pips ; 0/3 mutants tués sur ce dessin —
  personne ne vérifie que ce qui est affiché correspond à l'état.

### 3.3 `core.end_condition` + `core.restart` — de « prouvé par un bot » à « visible par un joueur »

- **Aujourd'hui** : prouvés, correctement, par `solvability.mjs` (fin de partie atteinte,
  `restart == premier boot`). **Ces preuves restent** — elles sont bonnes.
- **Proposé** : **ajouter** un volet observable, `observable_by_player: true` —
  « À la fin d'une partie, un **état final explicite** est affiché (qui gagne), et une **relance**
  est offerte au joueur et fonctionne. »
- **Pourquoi** : la mécanique existe et est prouvée ; l'expérience n'existe pas. C'est le cas
  d'école du diagnostic « mécaniquement OK, visuellement mort ».

---

## 4. Vérifications à faire AVANT le build (et non après)

| # | Vérification | Instrument | Pourquoi avant |
|---|---|---|---|
| 1 | budget d'empilement tient avec 2 lignes `ADDITIONS` | oracle standard, volet `budget`, **mode « au gel »** | le budget est déjà rouge (`game_loop` non déposé) : en ajouter sans vérifier casserait le run |
| 2 | placement cohérent des 2 nouvelles adresses | volet `placement` | c'était l'un des 2 rouges de `pong_r2`, réglé — ne pas le re-casser |
| 3 | aucune ligne ne reste `REQUIRED` après build | volet `line_states` (`frozen="built"`) | 2 lignes neuves en `REQUIRED` doivent être honorées par le builder, sinon FAIL légitime |
| 4 | les 4 règles observables du playtest sont couvertes | lecture croisée `playtest.jsonl` ↔ wiremap | c'est la démonstration du passage **constat joueur → règle de fabrication** que Pierre attend |

---

## 5. Ce que cette étape démontre (au-delà de Pong)

Pierre l'a formulé ainsi : *« la première démonstration du passage constat joueur → règle de
fabrication »*. Concrètement, la chaîne est désormais traçable de bout en bout :

```
playtest Pierre (4 constats)
   → error_journal/playtest.jsonl (4 règles observables)   [FAIT, vérifié : le pré-mortem les lit]
   → 2 lignes de wiremap + 3 preuves requalifiées          [CETTE PROPOSITION, attend ratification]
   → build contraint par des preuves observables
   → oracle produit qui peut les constater                 [étape 3 du niveau 1]
```

Et le champ `observable_by_player` n'est pas un ornement : **il est la seule chose qui distingue,
dans cette wiremap, une mécanique prouvée d'une expérience jouable.** Les 3 lignes à requalifier
en sont la preuve — elles étaient vertes et le jeu était injouable.

## 6. Décision attendue (gate)

**G-3 / U-3** : ratifies-tu (a) les 2 lignes nouvelles telles que rédigées, (b) les 3
requalifications de preuve, (c) la valeur du seuil de vitesse jouable — que je n'ai
volontairement pas fixée ? Sans (c), la ligne `play.playable_speed` reste non gelable.
