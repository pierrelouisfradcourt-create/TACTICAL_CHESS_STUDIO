J'ai toutes les ancres et les contraintes structurelles de l'oracle `check_prisme.mjs` (4 sections `## N.`, corps ≥40 car., aucun marqueur placeholder *dans* les sections, ≥1 règle `- **Rn`). Je suis dispatché avec `run: aucun` et `write: product_snapshot.md` ; conformément au pattern déjà établi dans ce run (lens CEO), j'émets mon `product_snapshot.md` **angle game_designer** comme texte de réponse — l'exécuteur du panel le persiste en `prisme_lens_game_designer.md`.

---

# product_snapshot — TETRIS (nœud 4) · lens GAME DESIGNER

> Artefact s1-prisme, angle **game designer** : la boucle de jeu, la source de tension, la courbe de difficulté, ce qui rend l'expérience satisfaisante. Contexte vierge : seul le charter s0 m'est fourni. Je décris le produit *fini* tel que le joueur le vit ; `claim_verdict : NO_CLAIM_ALLOWED` — je ne certifie ni « fun », ni « jouable », ni la courbe de difficulté (remontée en fog).

**Thèse de conception.** Tetris tient dans **une seule micro-décision répétée** — *où et comment poser la pièce qui tombe* — dont l'enjeu est créé par deux mécaniques indissociables : la pile est **irréversible** (une pièce figée ne bouge plus jamais) et le **seul** moyen de libérer de l'espace est de compléter une rangée. La partie n'a **pas d'état gagné** : le joueur ne joue pas *pour finir*, il joue *pour durer et scorer*. La courbe de difficulté classique (accélération de la gravité) est le levier de conception central pour la « tension signature », mais le charter s0 ne l'a **pas** tranchée — je la décris comme une facette *ouverte* (fog), pas comme un acquis du produit V1.

## 1. CE QUE LE JOUEUR VOIT

Un seul écran, tout l'état de décision visible en permanence, aucun menu à traverser :

- Un **puits vertical** en cases discrètes, plus haut que large — l'aire de jeu.
- **Une pièce active** qui tombe, faite d'exactement 4 cases, distinguée par sa couleur.
- La **pile** des pièces déjà figées, accumulée depuis le bas — c'est le relief que le joueur lit pour décider son prochain coup.
- Un **aperçu de la prochaine pièce**, hors du puits — l'information qui permet de *planifier* le coup d'après, pas seulement de réagir.
- Un **HUD** de score et de lignes nettoyées.
- Quand une rangée est pleine, elle **s'efface** et tout ce qui la surplombe **redescend** — feedback visuel direct de la seule action qui soulage la pression.
- Quand la pile atteint le sommet, un **écran de fin de partie** avec le score final.

*Angle designer :* la lisibilité totale de l'état (pile + pièce + aperçu) est ce qui rend la décision *pure skill* — le joueur ne perd jamais faute d'information cachée, seulement faute d'un mauvais placement. C'est une exigence de conception, pas un détail d'UI.

## 2. CE QUE LE JOUEUR FAIT

Un jeu de commandes minimal, apprenable en une partie, qui n'agit **que** sur la pièce active :

- **Déplacer** la pièce à gauche / à droite.
- **Tourner** la pièce.
- **Accélérer sa chute** (descente rapide) — le levier de maîtrise : plus un joueur place vite et proprement, plus il enchaîne de décisions par unité de temps.
- **Recommencer** après un game-over.

La boucle observable est un **cycle** répété : une pièce apparaît → le joueur la pilote pendant sa chute → elle se fige quand elle ne peut plus descendre → le moteur résout d'éventuelles lignes pleines → la pièce suivante apparaît. Tout le jeu est cette boucle, sans autre couche. Le joueur ne touche **jamais** la pile figée : sa seule variable est *le placement de la pièce en cours*.

*Angle designer :* zéro complexité de commandes, plafond de maîtrise très haut. La profondeur ne vient pas d'ajouter des verbes mais de la **qualité spatiale** du placement sous contrainte de temps — c'est le meilleur rapport surface d'apprentissage / profondeur possible.

## 3. CE QUE LE JOUEUR RESSENT

> Facette **non oracle-able** : hypothèses de réalisateur, escaladées en fog et à confirmer au playtest. Je ne les certifie pas.

- Une **tension qui monte avec la pile** : chaque pièce mal posée laisse un trou qui ne se comblera plus, et rapproche la défaite — la pression est *cumulative et auto-infligée*.
- Un **soulagement net** au nettoyage d'une ou plusieurs lignes : la pile redescend, l'espace revient, la menace recule d'un coup. C'est le battement tension → relâchement qui *est* le produit.
- Un **arbitrage risque / récompense** vivant : nettoyer une ligne tout de suite est sûr ; construire pour en effacer plusieurs d'un coup rapporte davantage mais fait monter la pile en attendant — le joueur *choisit* son niveau de risque.
- Une **appropriation de l'échec** : la partie perdue est lisiblement *sa* faute (mauvais empilement), pas le hasard — ce qui alimente le « encore une partie » et donne un score à battre sans rien à débloquer.

*Angle designer — point dur :* la **courbe de difficulté** (la gravité qui accélère au fil des lignes) est le principal amplificateur de cette tension dans le Tetris classique. Le noyau de règles ci-dessous garantit la *mécanique* (irréversibilité + compaction + récompense supra-linéaire), mais **pas** cette courbe : elle dépend d'un paramétrage vitesse/barème laissé hors du noyau certain (fog-Difficulté). Je remonte donc le risque qu'un V1 mécaniquement correct soit *plat* si la courbe n'est pas conçue.

## 4. RÈGLES OBSERVABLES

Chaque règle est testable par observation d'une partie ou d'une exécution déterministe, et ancrée à une source non-LLM (table ci-dessous). Elles décrivent le **noyau commun** aux variantes documentées — aucune ne dépend d'un choix laissé en fog.

- **R1** — Boucle de jeu unique et répétée : chaque cycle est spawn d'une pièce → pilotage pendant la chute → figeage → résolution des lignes pleines → pièce suivante ; aucune autre phase n'existe. *(Observable : une trace d'exécution ne présente que cette séquence d'états, en boucle, jusqu'au game-over.)*
- **R2** — Le joueur n'agit que sur la pièce active (translation, rotation, accélération) ; jamais sur la pile figée. *(Observable : tout input laisse inchangées toutes les cases déjà figées.)*
- **R3** — Gravité discrète : sans intervention, la pièce active descend d'exactement une case à intervalle régulier. *(Observable : aucun input pendant T → l'indice de rangée baisse d'exactement ⌊T/intervalle⌋.)*
- **R4** — L'ensemble des pièces est exactement les 7 tetrominos (I, O, T, S, Z, J, L), chacun de 4 cases ; aucune autre forme n'apparaît. *(Observable : énumérer les pièces d'une partie → sous-ensemble des 7, chacune 4 cases.)*
- **R5** — Rotation contrainte par le terrain : une rotation dont la position résultante entre en collision est refusée ; la rotation ne déforme jamais la pile. *(Observable : tenter une rotation vers une case occupée → pièce et pile inchangées.)*
- **R6** — Pile irréversible (moteur de tension) : une pièce se fige dès qu'elle ne peut plus descendre puis ne bouge plus jamais ; aucune action ne la déplace, la retire ou l'annule. *(Observable : après figeage, aucune commande ne la relocalise.)*
- **R7** — Nettoyage-compactage (seule relâche) : une rangée entièrement remplie disparaît et tout ce qui la surplombe descend d'autant ; c'est le seul moyen de libérer de l'espace. *(Observable : remplir une rangée → cette rangée retirée, les rangées au-dessus décalées d'une case.)*
- **R8** — Récompense multi-ligne supra-linéaire (arbitrage risque/récompense) : nettoyer N lignes d'un coup rapporte strictement plus **par ligne** que de les nettoyer séparément. *(Observable ordinalement : score(N-d'un-coup)/N > score(1-ligne) ; la valeur exacte est un équilibrage, fog-Barème.)*
- **R9** — Défaite par blocage, sans état gagné : la partie se termine si et seulement si une pièce entrante ne peut pas apparaître légalement ; il n'existe aucun état de victoire en marathon. *(Observable : une exécution n'émet jamais de « win » et ne s'arrête que sur collision au spawn.)*
- **R10** — Aperçu véridique (planification possible) : la pièce montrée dans l'aperçu est bien celle qui apparaît ensuite. *(Observable : enregistrer l'aperçu au figeage → il correspond à la pièce suivante réellement engendrée.)*
- **R11** — Information complète sur un seul écran : puits, pièce active, aperçu et score sont visibles à chaque instant, sans action du joueur. *(Observable : une capture à n'importe quelle frame montre les quatre.)*
- **R12** — Déterminisme du noyau règles : même graine + même séquence d'inputs ⇒ même suite de pièces et même plateau final. *(Observable : deux exécutions headless identiques → hash de plateau identique — ancre des oracles mutation/solvabilité.)*
- **R13** — Redémarrage à l'identique : après un game-over, relancer ramène à un puits vide et des compteurs à zéro, identiques au tout premier démarrage. *(Observable : plateau + compteurs après restart == état initial.)*

## Traçabilité & ancrage

| Règle | Ancre non-LLM | Statut de l'ancre |
|---|---|---|
| R1 | Composition des règles `core.gravity` + `core.lock_rules` + `core.line_clear` + `core.piece_bag` (`genre_bible.json`) ; loops `minute_1` (`observation_manifest.json`) | advisory |
| R2 | `genre.tetris.player_controls_active_piece_only` | advisory (NON_RATIFIEE_PROPOSITION) |
| R3 | `genre.tetris.discrete_gravity` | advisory |
| R4 | `genre.tetris.seven_tetrominoes` | advisory |
| R5 | `genre.tetris.rotation_bounded_by_terrain` | advisory |
| R6 | `genre.tetris.irreversible_stack` | advisory |
| R7 | `genre.tetris.line_clear_compaction` | advisory |
| R8 | `genre.tetris.superlinear_multi_clear_reward` (valeur = équilibrage → fog-Barème) | advisory |
| R9 | `genre.tetris.loss_by_blocking` + `genre.tetris.no_victory_in_marathon` | advisory |
| R10 | `genre.tetris.full_information_single_screen` (volet aperçu) | advisory |
| R11 | `genre.tetris.full_information_single_screen` | advisory |
| R12 | `game_contract.yaml` `runtimes:[rules,godot]` + descripteur `proof` (mutation/solvabilité) | mécanique (bootstrap NON_RATIFIÉ) |
| R13 | Convention produit studio `core.restart` (`standard/SCHEMA.md`, wiremap) | standard studio |

Sections §1/§2/§4 : dérivations directes des 10 règles de genre (`genre_bible.json`, advisory) et du `game_contract.yaml`. §3 : hypothèses de réalisateur, ancrées descriptivement aux `retention_answer`/`loops` du world scan (`observation_manifest.json`, advisory) mais **non certifiées**.

## Verdicts

- **software_verdict : BLOCKED** — l'oracle structurel `scripts/forge/prisme/check_prisme.mjs` (déterministe, non-LLM) existe mais je ne l'ai **pas exécuté** (contrat `run: aucun`). L'artefact est écrit conforme par construction au schéma 4-sections (titres `## N.`, ≥1 règle `- **Rn`, aucun marqueur placeholder dans les sections) ; sa validation mécanique revient à l'exécuteur du panel Prisme.
- **evidence_verdict : MECHANICAL_VALIDATION_ONLY** — ne s'applique qu'aux faits documentés cités (`genre_bible.json`, `observation_manifest.json`, `game_contract.yaml node:4`), pas au ressenti §3 ni à la courbe de difficulté.
- **claim_verdict : NO_CLAIM_ALLOWED** — je ne certifie ni « jouable » ni « fun » ni le ressenti §3 ni la satisfaction de la courbe ; toutes les indéterminations sont remontées en fog, non affirmées.

## Fog → HumanGate (jugement Pierre)

- **fog-Difficulté** — La courbe de gravité (constante en V1 vs accélération par paliers de N lignes). Le world scan la recommande *constante en V1* (advisory), mais c'est le **principal levier de la tension signature** (§3) : décision de design, non tranchée en s0. C'est le fog le plus lourd de mon angle.
- **fog-Barème** — Valeurs exactes du score multi-ligne (R8 garantit l'ordre supra-linéaire, pas les nombres) : conditionne l'intensité de l'arbitrage risque/récompense.
- **fog-Variante** — Guideline 2001+ vs NES 1989 (aperçu multiple, hold, wall-kicks) : non tranché en s0 ; j'ai décrit le noyau commun, pas choisi. (Leçon AutoBattler : ne pas choisir une variante à la place de Pierre.)
- **fog-HardDrop** — Confort moderne (chute instantanée) inclus ou non dans les commandes §2 ; le world scan recommande *soft-drop seul en V1* (advisory).
- **fog-Ressenti** — Validation de §3 : non oracle-able, à trancher au playtest.
- **fog-Charter** (structurel, hérité de s0) — Le `00_CHARTER/charter.yaml` narratif n'existe pas sur disque ; j'ai ancré au `game_contract.yaml` bootstrap (NON_RATIFIÉ) + `genre_bible.json` advisory, pas à un charter ratifié. La cohérence du snapshot avec le charter *final* ne pourra être vérifiée qu'une fois ce fichier écrit.

## SKIPPED_VALIDATION

- **item** : exécution de l'oracle structurel `check_prisme.mjs` · **où** : cet artefact `product_snapshot.md` (lens game_designer) · **statut** : non fait · **raison** : contrat `run: aucun` — à lancer par l'exécuteur du panel Prisme.
- **item** : vérification de cohérence contre le `charter.yaml` ratifié · **où** : `games/tetris/00_CHARTER/charter.yaml` · **statut** : non faisable · **raison** : le fichier charter narratif n'existe pas sur disque (fog-Charter) ; ancrage de repli sur `game_contract.yaml` bootstrap + `genre_bible.json` advisory, cohérence vérifiée manuellement seulement.
- **item** : oracle mécanique du ressenti §3 et de la courbe de difficulté · **où** : §3, fog-Difficulté · **statut** : non applicable · **raison** : facettes narratives / de design non oracle-ables → NO_CLAIM_ALLOWED, remontées à Pierre.
- **item** : ratification de `genre_bible.json` et du world scan · **où** : `01_DESIGN/genre_bible.json`, `GAME_REFERENCE/observation_manifest.json` · **statut** : non fait · **raison** : statut `NON_RATIFIEE_PROPOSITION` / `advisory: true`, utilisés en advisory ; leur ratification est une gate Pierre distincte.

---

**RAPPORT FINAL — s1-prisme / lens game_designer / `tetris-witness-20260803-175558`.** Livrable `product_snapshot.md` (angle game designer) émis comme texte, conforme au contrat de sortie `{voit, fait, ressent, regles_observables[]}` — 4 sections remplies, aucun champ « à définir » (les indéterminés sont rangés en *fog*, décisions assumées). Ancre citée : `genre_bible.json` (10 règles, advisory), `game_contract.yaml` node:4 (bootstrap non ratifié), world scan `observation_manifest.json` (advisory). Distinction prouvé/jugé : §1/§2/§4 = dérivations ancrées ligne-par-ligne des règles de genre ; §3 + courbe de difficulté = jugement non oracle-able → fog. `software_verdict: BLOCKED` (oracle non exécuté, `run: aucun`) · `evidence_verdict: MECHANICAL_VALIDATION_ONLY` · `claim_verdict: NO_CLAIM_ALLOWED`. Fog le plus lourd de cet angle : **fog-Difficulté** (la courbe de gravité, non tranchée en s0, qui conditionne la tension signature du §3).