# WIREMAP PONG V2 — proposition finale (lignes wiremap)

Date : 2026-07-27 · Mission : `scripts/forge/contracts/p1-lignes-wiremap-et-genre-bible.yaml`
(actions 1 et 3 du retour de validation niveau 1 de Pierre) · Statut : **PROPOSED — attend
ratification Pierre**. **Aucune modification n'a été appliquée à `games/pong/09_WIREMAP/wiremap.json`**
ni à aucun autre artefact vivant. Ce document finalise
`docs/forge/PROPOSITION_LIGNES_JOUABILITE_PONG.md` (proposition intermédiaire, lue intégralement,
conservée telle quelle — ce document-ci en est la version prête à ratifier, avec le JSON exact,
validé par parsing, et deux corrections structurelles trouvées en le finalisant, cf. §5).

`claim_verdict: NO_CLAIM_ALLOWED` · `evidence_verdict: MECHANICAL_VALIDATION_ONLY`.

---

## 0. Traçabilité — playtest → lignes (garde-fou 7)

Les 4 constats de `lab/reports/error_journal/playtest.jsonl` (`run_id: playtest-2026-07-27`) et
la ligne qu'ils font naître ou requalifier :

| # | ts | Constat (résumé) | Ligne(s) concernée(s) |
|---|---|---|---|
| 1 | 1785149949 | Quitter cliquable mais sans effet observable | `core.exit` (requalifiée) |
| 2 | 1785149992 | Vitesse initiale trop élevée (~0,52 s de traversée) | `play.playable_speed` (nouvelle) |
| 3 | 1785149992 | Aucun adversaire automatique (validation solo impossible) | `play.solo_opponent` (nouvelle) |
| 4 | 1785150036 | Score en pips (illisible), aucune fin/rejouer observable | `play.score`, `core.end_condition`, `core.restart` (requalifiées) |

Le constat #4 couvre à lui seul 3 lignes (score, fin de partie, rejouer) — c'est le même
enregistrement `playtest.jsonl` qui les cite toutes les trois, pas une extension de ma part.

---

## 1. Les 2 lignes NOUVELLES

### 1.1 `play.solo_opponent`

**Chaîne** : intention joueur *« je veux jouer seul contre une IA »* → observable *« je clique
Solo, je joue une partie complète contre un adversaire qui bouge, la partie se termine »* →
implémentation *une IA de jeu dans le système `input`, distincte du bot de test* → preuve
*partie solo bout-en-bout, citant explicitement les deux entités (IA jouable vs bot de
solvabilité) séparément*.

```json
{
  "id": "play.solo_opponent", "source": "ADDITIONS", "source_role": "joueur", "reference": "playtest-2026-07-27",
  "category": "system", "provides": ["game.solo_opponent"], "requires": ["game.state"], "owner": true,
  "system_parent": "input",
  "address": "05_SYSTEMS/input/",
  "expected_proof": {"kind": "bot_action", "statement": "Une partie SOLO complete se joue de bout en bout : le joueur humain controle un seul camp, l'autre camp est pilote par une IA de jeu DISTINCTE du bot de solvabilite (celui-ci a une latence de reaction NULLE et sert uniquement d'outil de test interne, cf. core.boot/play.ball -- jamais un adversaire jouable), et la partie atteint un etat de fin (P1_WIN ou P2_WIN)."},
  "observable_by_player": true,
  "state": "REQUIRED", "reason": null, "until": null, "decider": null, "write_order": null,
  "fichiers": [],
  "fonction": "",
  "preuve": "",
  "statut": "REQUIRED"
}
```

**Garde-fou (6) respecté explicitement** : la formule `expected_proof.statement` nomme les deux
entités et dit noir sur blanc que le bot de solvabilité n'est « jamais un adversaire jouable ».
Toute preuve future qui se contenterait de relancer `solvability.mjs` sans IA distincte
échouerait ce test par construction.

### 1.2 `play.playable_speed`

**Chaîne** : intention joueur *« je veux avoir le temps de réagir »* → observable *«au service,
la balle met un temps mesurable à traverser le terrain»* → implémentation *un test dérivant
`ball_crossing_time` des constantes (`BALL_VX`, `FIELD_W`, fps)* → preuve *le temps calculé tombe
dans la bande déclarée par la Genre Bible, sinon FAIL*.

```json
{
  "id": "play.playable_speed", "source": "ADDITIONS", "source_role": "gd", "reference": "playtest-2026-07-27",
  "category": "system", "provides": ["game.playable_speed"], "requires": ["game.loop"], "owner": true,
  "system_parent": "game_loop",
  "address": "05_SYSTEMS/game_loop/",
  "expected_proof": {"kind": "test", "statement": "Le temps de traversee du terrain a la vitesse de service (ball_crossing_time, derive de BALL_VX et FIELD_W) est compris dans la bande jouable declaree par la Genre Bible Pong (docs/forge/GENRE_BIBLE_PONG_V1_PROPOSED.md, regle genre.pong.playable_speed_range) ; une vitesse hors bande FAIT ECHOUER ce test, y compris si play.ball (NO-TUNNEL a toute vitesse) reste vert."},
  "observable_by_player": true,
  "state": "REQUIRED", "reason": null, "until": null, "decider": null, "write_order": null,
  "fichiers": [],
  "fonction": "",
  "preuve": "",
  "statut": "REQUIRED"
}
```

**Paramètre de design associé (format imposé par Pierre)** — voir §4 pour la remarque de
provenance sur `source` :

```yaml
play.playable_speed:
  metric: ball_crossing_time
  target_range: "1.0-1.5s"
  rationale: "temps d'anticipation permettant plusieurs echanges"
  source: "decision Pierre 2026-07-27, a etayer par un World Scan"
```

**Garde-fou (5) — non-contradiction avec `play.ball` (une phrase)** : `play.ball` prouve que le
moteur ne laisse JAMAIS traverser une raquette, quelle que soit la vitesse (robustesse du moteur,
testée 10..900) ; `play.playable_speed` contraint une vitesse différente — celle **offerte au
joueur au service** — donc les deux propositions portent sur deux variables distinctes
(robustesse du moteur vs paramètre de service) et ne peuvent structurellement pas se contredire.

---

## 2. Les 4 REQUALIFICATIONS

Aucune ligne supprimée. Ce qui change : `expected_proof.statement` (ajout d'une clause
observable) et `observable_by_player` (nouveau champ). **Choix éditorial à valider par
Pierre** : je fais passer `state`/`statut` de `IMPLEMENTED` à `REQUIRED` sur les 4, parce que
`expected_proof` porte désormais une clause non encore prouvée — la preuve mécanique existante
reste vraie et est conservée verbatim dans `fonction`/`preuve` (rien n'est perdu, rien n'est
présenté comme acquis qui ne l'est pas). Alternative envisagée et écartée : garder `IMPLEMENTED`
et loger l'écart ailleurs — écartée parce que la convention du studio dit explicitement
« `IMPLEMENTED` = fait ET prouvé » (`scripts/forge/standard/SCHEMA.md`), et qu'une preuve
partielle affichée comme totale est précisément le défaut diagnostiqué par Pierre. **Si ce choix
est jugé trop fort, la question reste ouverte : Pierre peut préférer geler ces 4 lignes en
`IMPLEMENTED` avec un sous-état non encore normalisé — je ne tranche pas, je signale.**

### 2.1 `core.exit` — du processus qui se termine au joueur qui voit la sortie

```json
{
  "id": "core.exit", "source": "CORE", "source_role": null, "reference": null,
  "category": "system.adapter", "provides": ["game.exit"], "requires": [], "owner": true,
  "system_parent": "presentation",
  "address": "06_RUNTIME/adapters/presentation/",
  "expected_proof": {"kind": "bot_action", "statement": "Sortie demandee -> comportement defini PAR RUNTIME. CLI/Godot : processus termine, code de sortie 0 (invariant conserve). NAVIGATEUR : un CLIC REEL sur le bouton Quitter produit un effet VISIBLE (arret de la boucle de jeu + etat final affiche a l'ecran) -- window.close() seul ne suffit pas, il est ignore par le navigateur sur un onglet non ouvert par script."},
  "observable_by_player": true,
  "state": "REQUIRED", "reason": null, "until": null, "decider": null, "write_order": null,
  "fichiers": [{"path": "06_RUNTIME/adapters/presentation/exit.mjs", "category": "system.adapter"}],
  "fonction": "requestExit() : node/godot -> process.exit(0) (preuve mecanique CONSERVEE, inchangee). Volet navigateur (clic reel -> arret boucle + etat final affiche) NON ENCORE PROUVE : c'est le delta qui fait passer cette ligne de IMPLEMENTED a REQUIRED.",
  "preuve": "MECANIQUE (conservee) : spawnSync('node exit.mjs') -> status=0, stdout 'sortie propre, code 0'. OBSERVABLE (a produire) : capture/e2e d'un clic reel sur le bouton Quitter en navigateur constatant l'arret de la boucle et l'affichage d'un etat final -- absent aujourd'hui (finding F6 red-team, constat playtest-2026-07-27 'Quitter inerte').",
  "statut": "REQUIRED"
}
```

**Chaîne** : intention *« quitter doit quitter »* → observable *effet visible en navigateur* →
implémentation *chemin par runtime dans `exit.mjs`* → preuve *mécanique conservée (CLI/Godot) +
e2e navigateur à produire*.

### 2.2 `play.score` — de « exactement un point » à « lisible et juste »

```json
{
  "id": "play.score", "source": "EXPECTED", "source_role": "charter",
  "reference": "Pong (Atari, 1972) : un point est marque quand la balle sort du cote adverse ; le score est affiche.",
  "category": "system", "provides": ["play.score"], "requires": ["play.ball"], "owner": true,
  "system_parent": "game_loop",
  "address": "05_SYSTEMS/game_loop/",
  "expected_proof": {"kind": "bot_action", "statement": "Balle sortie d'un cote -> exactement un point pour le camp oppose (invariant de comptage CONSERVE). ET l'etat decisif est LISIBLE par un joueur : le score est rendu en CHIFFRES (pas en pips seuls), et le score affiche correspond EXACTEMENT au score d'etat interne a chaque tick."},
  "observable_by_player": true,
  "state": "REQUIRED", "reason": null, "until": null, "decider": null, "write_order": null,
  "fichiers": [{"path": "05_SYSTEMS/game_loop/loop.mjs", "category": "system"}],
  "fonction": "step : sortie a gauche/droite -> +1 pour le camp oppose EXACTEMENT (preuve mecanique CONSERVEE, inchangee). Rendu en CHIFFRES lisibles NON ENCORE FAIT : score actuellement dessine en pips (draw.mjs, hors fichiers de cette ligne), 0/3 mutants tues sur ce dessin -- personne ne verifie que l'affiche correspond a l'etat. C'est le delta qui fait passer cette ligne de IMPLEMENTED a REQUIRED.",
  "preuve": "MECANIQUE (conservee) : node solvability.mjs -> checks.score_exactly_one_per_point=true ; node --test loop.test.mjs 'play.score : ... EXACTEMENT un point' PASS. OBSERVABLE (a produire) : test/capture constatant un rendu en chiffres correspondant a l'etat, remplacant le rendu en pips actuel (constat playtest-2026-07-27 'Score illisible').",
  "statut": "REQUIRED"
}
```

**Chaîne** : intention *« je veux voir le score »* → observable *chiffres, pas pips, et exacts* →
implémentation *rendu à écrire (hors périmètre de cette ligne : `core.render`/`draw.mjs`)* →
preuve *comptage conservé + constat visuel à produire*. **Note de dépendance honnête** :
satisfaire pleinement cette preuve touchera probablement `core.render` (le rendu du score vit
dans `draw.mjs`, pas dans `loop.mjs`) — je ne modifie pas `requires`/`fichiers` de `core.render`
ici (ce serait une décision de build, pas de spécification), mais je le signale pour que le
builder ne découvre pas la dépendance au moment de coder.

### 2.3 `core.end_condition` — de « prouvé par un bot » à « visible par un joueur »

```json
{
  "id": "core.end_condition", "source": "CORE", "source_role": null, "reference": null,
  "category": "system", "provides": ["game.end"], "requires": ["game.state", "play.score"], "owner": true,
  "system_parent": "game_state",
  "address": "05_SYSTEMS/game_state/",
  "expected_proof": {"kind": "bot_action", "statement": "Un bot atteint une fin de partie ; l'etat final est gagne ou perdu, jamais indefini (invariant CONSERVE). ET un ETAT FINAL EXPLICITE est affiche a l'ecran, lisible par un joueur (qui gagne, qui perd)."},
  "observable_by_player": true,
  "state": "REQUIRED", "reason": null, "until": null, "decider": null, "write_order": null,
  "fichiers": [{"path": "05_SYSTEMS/game_state/state.mjs", "category": "system"}],
  "fonction": "endStatus(score)/isOver : premier a WIN_SCORE=3 gagne ; issue toujours definie (preuve mecanique CONSERVEE, inchangee, par bot). Ecran de fin explicite (qui gagne, affiche a l'ecran) NON ENCORE FAIT.",
  "preuve": "MECANIQUE (conservee) : node solvability.mjs -> game_finishes=true, winner=p1, status=P1_WIN, end_never_undefined=true. OBSERVABLE (a produire) : capture constatant un etat final explicite affiche a l'ecran (constat playtest-2026-07-27 'aucune condition de fin ... observable par le joueur').",
  "statut": "REQUIRED"
}
```

### 2.4 `core.restart` — de « prouvé par un bot » à « rejouable par un joueur »

```json
{
  "id": "core.restart", "source": "CORE", "source_role": null, "reference": null,
  "category": "system", "provides": ["game.restart"], "requires": ["game.state"], "owner": true,
  "system_parent": "game_state",
  "address": "05_SYSTEMS/game_state/",
  "expected_proof": {"kind": "bot_action", "statement": "Apres une fin de partie, relance -> etat identique au premier demarrage, aucun residu (invariant CONSERVE). ET une RELANCE est OFFERTE au joueur (action/bouton visible) et fonctionne reellement quand le joueur la declenche."},
  "observable_by_player": true,
  "state": "REQUIRED", "reason": null, "until": null, "decider": null, "write_order": null,
  "fichiers": [{"path": "05_SYSTEMS/game_state/state.mjs", "category": "system"}],
  "fonction": "restart(seed) -> initialState(seed) : nouvel etat propre, aucun residu (preuve mecanique CONSERVEE, inchangee, par bot). Relance offerte au JOUEUR (bouton/action visible, declenchee par un clic reel) NON ENCORE FAITE.",
  "preuve": "MECANIQUE (conservee) : node solvability.mjs -> restart.finishedBeforeRestart=true & restart.restartEqualsFirstBoot=true. OBSERVABLE (a produire) : e2e d'un clic reel sur un bouton Rejouer, constatant l'etat identique au premier demarrage (constat playtest-2026-07-27, meme entree que core.end_condition).",
  "statut": "REQUIRED"
}
```

`core.end_condition` et `core.restart` sont requalifiées ensemble parce qu'elles répondent au
même constat #4 (« aucune condition de fin ni écran de rejouer n'est observable ») et qu'elles
sont liées mécaniquement (le rejouer suppose une fin déjà atteinte).

---

## 3. Validation mécanique effectuée

Les 6 objets JSON ci-dessus ont été extraits et parsés avec
`python -c "json.load(...)"` : **parsing OK, 6/6**. Vérification supplémentaire faite : l'ordre
des clés de chaque ligne est identique à celui des 13 lignes existantes de
`games/pong/09_WIREMAP/wiremap.json`, avec un seul ajout — `observable_by_player`, inséré juste
après `expected_proof` (choix éditorial : le champ qualifie directement la preuve qui le précède ;
non prescrit par le schéma actuel, à confirmer par Pierre s'il doit vivre ailleurs).

**Vérification `allowed_deps` (passe 1 de la wiremap, non demandée explicitement par le contrat
mais nécessaire pour que le JSON soit réellement conforme, pas juste syntaxiquement valide)** :
la proposition intermédiaire (`PROPOSITION_LIGNES_JOUABILITE_PONG.md`) donnait à
`play.solo_opponent` `requires: ["game.state", "game.loop"]` avec `system_parent: "input"`. Or
`input.allowed_deps = ["game_state"]` (passe 1, `wiremap.json` L8) — `game.loop` n'y figure pas.
**J'ai corrigé `requires` à `["game.state"]` seul** dans ce document : l'IA solo lit l'état pour
décider, elle n'a pas besoin de la capacité `game.loop` elle-même (par analogie avec
`core.input`, même `system_parent`, qui ne requiert que `game.state`). Signalé ici plutôt que
silencieusement modifié pour que Pierre puisse vérifier mon raisonnement.

---

## 4. Remarque de provenance (garde-fou 3)

L'exemple donné par Pierre pour `play.playable_speed` porte `source: "Genre Bible Pong"`. C'est
**auto-référentiel** : la Genre Bible citerait sa propre existence comme preuve de la valeur
qu'elle avance, ce qui ne constitue pas une provenance externe. La provenance honnête de la
fourchette `1.0-1.5s`, telle que je la comprends, est : **décision de Pierre du 2026-07-27**
(consignée dans ce contrat et dans la proposition intermédiaire), **non encore étayée par un
World Scan**. J'ai donc écrit `source: "décision Pierre 2026-07-27, à étayer par un World Scan"`
dans le bloc YAML du §1.2, plutôt que de recopier l'exemple tel quel. **Je ne tranche pas cette
correction** — je la propose ; si Pierre préfère garder `"Genre Bible Pong"` en attendant que la
Genre Bible elle-même cite une source externe (auquel cas l'auto-référence se résorbe d'elle-même
dès qu'une entrée sourcée existe dans `GENRE_BIBLE_PONG_V1_PROPOSED.md`), c'est un choix
legitimate aussi. Voir aussi `docs/forge/GENRE_BIBLE_PONG_V1_PROPOSED.md` §6 pour le même point,
côté bible.

---

## 5. Ce qui a été corrigé en finalisant (transparence)

1. `play.solo_opponent.requires` : `["game.state","game.loop"]` → `["game.state"]` (§3, violation
   `allowed_deps` sinon).
2. `source_role` : la proposition intermédiaire utilisait `player_reviewer` et
   `gameplay_programmer`, deux libellés absents de la taxonomie canonique du Prisme
   (`ceo / gd / front / back / joueur`, `docs/forge/FORGE_STANDARD_v1.md` §4). Je les ai
   remappés à `joueur` (solo_opponent — le constat vient d'une observation de jeu) et `gd`
   (playable_speed — c'est un paramètre de design chiffré, pas une implémentation). **Question
   ouverte pour Pierre** : ces deux lignes ne viennent pas d'un run Prisme réel (le Prisme est
   éteint sur ce nœud, `wiremap.json` L4) mais du playtest + de cette session de rédaction — le
   remapping est donc une approximation de ma part, pas une valeur mesurée. Si un vocabulaire
   distinct pour « origine = playtest » est souhaité, il reste à créer (gate Pierre).
3. `state`/`statut` des 4 requalifications : passés de `IMPLEMENTED` à `REQUIRED` — motivé et
   signalé comme question ouverte au §2.

---

## 6. Vérifications restant à faire AVANT tout build (reprises de la proposition intermédiaire,
non refaites ici — hors périmètre de rédaction de cette mission)

Reprises telles quelles de `PROPOSITION_LIGNES_JOUABILITE_PONG.md` §4 : budget d'empilement au
gel, placement des 2 nouvelles adresses, aucune ligne `REQUIRED` non honorée après build, lecture
croisée `playtest.jsonl` ↔ wiremap. Ces vérifications supposent un run Forge réel (`node
scripts/forge/...`) — **hors périmètre de cette mission de rédaction** (`out_of_scope` :
`scripts/forge/**`).

---

## 7. Section `skipped_validation`

- Je n'ai PAS exécuté `node scripts/forge/standard_oracles.py` (ou équivalent) sur le JSON
  proposé fusionné dans une copie de `wiremap.json` — le contrat interdit d'écrire dans
  `games/pong/**`, et je n'ai pas identifié de mode « dry-run sur fichier hors-arbre » pour cet
  oracle dans le temps imparti. La validation effectuée est : parsing JSON pur + relecture
  manuelle des règles `allowed_deps`/`repo_map.yaml` (§3). Une vérification par l'oracle réel
  reste à faire au moment du run.
- Je n'ai pas vérifié si un futur `check_wiremap`/`standard_oracles.py` accepte déjà le champ
  `observable_by_player` sans le rejeter comme clé inconnue — grep effectué (`observable_by_player`
  absent de `scripts/forge/standard_oracles.py`) : le champ n'est aujourd'hui lu par aucun oracle.
  C'est cohérent avec `docs/forge/COMPARATIF_SCHEMA_VS_REEL_2026-07-27.md` (proposition S2,
  décision D-2 encore en attente) — je ne l'invente pas, je le rattache à une proposition déjà
  connue du studio.

---

## Décision attendue (gate)

Ratifies-tu (a) les 2 lignes nouvelles telles que corrigées (§1, avec la correction `requires`
du §3), (b) les 4 requalifications et leur passage à `REQUIRED` (§2, ou préfères-tu les garder
`IMPLEMENTED` — question ouverte), (c) le remapping des `source_role` (§5.2), (d) la provenance
corrigée de la fourchette de vitesse (§4) ?
