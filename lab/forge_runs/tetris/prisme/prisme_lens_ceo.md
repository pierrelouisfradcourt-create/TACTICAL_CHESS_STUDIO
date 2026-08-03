All anchors verified. I have the 10 genre rules (with IDs) and the advisory world-scan. I'll now emit the CEO-lens `product_snapshot.md` **as my response text** — the panel executor persists it to `prisme_lens_ceo.md`. Structured to pass `check_prisme.mjs` (4 `## N.` sections, rules as `- **Rn`, no placeholder markers inside the sections) and `merge_prisme.mjs` (rules under `## 4.`, report after `## Traçabilité`).

---

# product_snapshot — TETRIS (nœud 4) · lens CEO/produit

> Artefact s1-prisme, angle **CEO/produit** (valeur business, positionnement, problème joueur résolu). Contexte vierge : seul le charter s0 m'est fourni. `claim_verdict : NO_CLAIM_ALLOWED` — je décris le produit *fini*, je ne certifie ni « fun » ni « jouable ».

**Positionnement (thèse CEO).** Tetris est le premier jeu du curriculum dont la proposition de valeur tient en une phrase lisible sans marketing : *empiler des pièces qui tombent, nettoyer des lignes, tenir le plus longtemps possible*. C'est un produit à **reconnaissance instantanée mondiale**, **coût d'onboarding nul** (aucun texte à lire), **coût d'asset quasi nul** (rendu par primitives, `assets.plan: cc0`), et **rejouabilité infinie sans contenu à produire** (la difficulté vient de la vitesse et du hasard des pièces, pas d'un tapis roulant de niveaux). Le problème joueur qu'il résout : *une tension/relâchement immédiate, en session courte, en pur skill, sans progression à débloquer*. Pour le studio, le nœud 4 apporte une **propriété mécanique neuve et réutilisable** — la *dette spatiale irréversible* (une pièce figée ne bouge plus jamais) couplée au *nettoyage-compactage* (seul moyen de libérer l'espace).

**Note de variante (remontée, non tranchée).** Le world scan documente deux références réelles — *Tetris Guideline (2001+)* et *NES Tetris (1989)* — qui divergent (aperçu multiple, hold, wall-kicks, barème). Le charter s0 n'a **pas** tranché la variante. Je décris donc uniquement le **noyau commun aux deux**, et je remonte le reste en fog (voir plus bas). Aucune facette ci-dessous ne suppose une variante précise.

## 1. CE QUE LE JOUEUR VOIT

Un seul écran, tout visible en permanence, aucun menu à traverser pour comprendre l'état de jeu :

- Un **puits vertical** (grille de cases discrètes), plus haut que large — l'aire de jeu.
- **Une pièce active** en train de tomber, faite d'exactement 4 cases, avec une couleur qui la distingue.
- La **pile** de pièces déjà figées, accumulée depuis le bas.
- Un **aperçu de la prochaine pièce**, hors du puits.
- Un **HUD** de score et de lignes nettoyées (et, selon la variante, un niveau).
- Quand une rangée se remplit entièrement, elle **s'efface** et la pile au-dessus **redescend**.
- Quand la pile atteint le sommet, un **écran de fin de partie** (game-over) avec le score final.

*Angle CEO :* l'écran se lit en moins d'une seconde, sans tutoriel — c'est ce qui rend le produit universel et démontrable sans explication. La lisibilité totale de l'état est une **exigence produit**, pas un détail d'UI.

## 2. CE QUE LE JOUEUR FAIT

Un jeu de commandes minimal, apprenable en une partie :

- **Déplacer** la pièce active à gauche / à droite.
- **Tourner** la pièce active.
- **Accélérer sa chute** (descente rapide).
- **Recommencer** après un game-over.

Le joueur n'agit **jamais** sur la pile figée : toute sa décision se concentre sur *où et comment poser la pièce qui tombe* pour compléter des rangées horizontales et empêcher la pile de monter jusqu'en haut. Il n'y a **pas d'état gagné** en marathon : l'objectif est de durer et de scorer, pas d'atteindre une fin.

*Angle CEO :* toute la valeur du produit est dans une seule micro-décision répétée (« ce trou, cette rotation, maintenant »). Zéro complexité de commandes = zéro barrière d'entrée, tout en laissant un plafond de maîtrise très haut. C'est le rapport le plus rentable qui soit entre surface d'apprentissage et profondeur.

## 3. CE QUE LE JOUEUR RESSENT

> Facette **non oracle-able** : ce qui suit est une hypothèse de réalisateur, escaladée en fog-D et à confirmer au playtest. Je ne la certifie pas.

- Une **tension croissante** à mesure que la pile monte et que les pièces tombent plus vite.
- Un **soulagement net** et une petite décharge de satisfaction quand une ou plusieurs lignes s'effacent d'un coup — d'autant plus fort qu'on en a nettoyé plusieurs ensemble.
- Une **appropriation de l'échec** : quand la partie se termine, le joueur sait que c'est *lui* qui a mal empilé (pas la faute au hasard), ce qui alimente le « encore une partie ».
- Le **pull de la session courte** : une partie perdue relance immédiatement, le score visible donne un objectif à battre sans rien à débloquer.

*Angle CEO — point dur :* cette boucle tension → soulagement **EST** le produit. Un Tetris mécaniquement correct mais plat émotionnellement n'a pas de valeur. La tension du multi-nettoyage dépend d'une courbe de barème et de vitesse qui reste hors du périmètre V1 (fog-B) : je remonte donc le risque que le noyau V1 livre la *mécanique* de Tetris sans encore garantir sa *tension signature*.

## 4. RÈGLES OBSERVABLES

Chaque règle est testable par observation d'une partie ou d'une exécution déterministe, et ancrée à une source non-LLM (table de traçabilité ci-dessous). Elles décrivent le **noyau commun aux deux variantes** — aucune ne dépend d'un choix laissé en fog.

- **R1** — Information complète sur un seul écran : puits, pièce active, aperçu et score sont visibles à chaque instant, sans action du joueur. *(Observable : une capture à n'importe quelle frame de jeu montre les quatre.)*
- **R2** — L'ensemble des pièces est exactement les 7 tetrominos (I, O, T, S, Z, J, L), chacun de 4 cases ; aucune autre forme n'apparaît. *(Observable : énumérer les pièces apparues sur une partie → sous-ensemble des 7, chacune 4 cases.)*
- **R3** — Gravité discrète : sans intervention, la pièce active descend d'exactement une case à intervalle régulier. *(Observable : aucun input pendant T → l'indice de rangée baisse d'exactement ⌊T/intervalle⌋.)*
- **R4** — Le joueur n'agit que sur la pièce active (translation, rotation, accélération) ; jamais sur la pile. *(Observable : n'importe quel input laisse toutes les cases figées inchangées.)*
- **R5** — Une rotation dont la position résultante entre en collision est refusée ; le terrain contraint la rotation, jamais l'inverse. *(Observable : tenter une rotation vers une case occupée → pièce et pile inchangées.)*
- **R6** — Pile irréversible : une pièce se fige dès qu'elle ne peut plus descendre, puis ne bouge plus jamais ; aucune action ne la déplace, la retire ou l'annule. *(Observable : après figeage, aucune commande ne la relocalise.)*
- **R7** — Nettoyage-compactage : une rangée entièrement remplie disparaît et tout ce qui est au-dessus descend d'autant ; c'est le seul moyen de libérer de l'espace. *(Observable : remplir une rangée → cette rangée retirée, les rangées au-dessus décalées d'une case.)*
- **R8** — Récompense multi-ligne supra-linéaire : nettoyer N lignes simultanément rapporte strictement plus **par ligne** que de les nettoyer séparément. *(Observable ordinalement : score(N-d'un-coup)/N > score(1-ligne) ; la valeur exacte est un équilibrage, fog-B.)*
- **R9** — Défaite par blocage, sans état gagné : la partie se termine si et seulement si une pièce entrante ne peut pas apparaître légalement ; il n'existe aucun état de victoire en marathon. *(Observable : une exécution n'émet jamais de « win » et ne s'arrête que sur collision au spawn.)*
- **R10** — Déterminisme du noyau règles : même graine + même séquence d'inputs ⇒ même suite de pièces et même plateau final. *(Observable : deux exécutions headless identiques → hash de plateau identique — ancre des oracles mutation/solvabilité.)*
- **R11** — Redémarrage à l'identique : après un game-over, relancer ramène à un puits vide et des compteurs à zéro, identiques au tout premier démarrage. *(Observable : plateau + compteurs après restart == état initial.)*
- **R12** — Aperçu véridique : la pièce montrée dans l'aperçu est bien celle qui apparaît ensuite. *(Observable : enregistrer l'aperçu au moment du figeage → il correspond à la pièce suivante réellement engendrée.)*

## Traçabilité & ancrage

| Règle | Ancre non-LLM | Statut de l'ancre |
|---|---|---|
| R1 | `genre.tetris.full_information_single_screen` (`genre_bible.json`) | advisory (NON_RATIFIEE_PROPOSITION) |
| R2 | `genre.tetris.seven_tetrominoes` | advisory |
| R3 | `genre.tetris.discrete_gravity` | advisory |
| R4 | `genre.tetris.player_controls_active_piece_only` | advisory |
| R5 | `genre.tetris.rotation_bounded_by_terrain` | advisory |
| R6 | `genre.tetris.irreversible_stack` | advisory |
| R7 | `genre.tetris.line_clear_compaction` | advisory |
| R8 | `genre.tetris.superlinear_multi_clear_reward` | advisory (valeur = équilibrage → fog-B) |
| R9 | `genre.tetris.loss_by_blocking` + `genre.tetris.no_victory_in_marathon` | advisory |
| R10 | `game_contract.yaml` `runtimes:[rules,godot]` + descripteur `proof` (mutation/solvabilité) | mécanique (bootstrap NON_RATIFIÉ) |
| R11 | Convention produit studio `core.restart` (`standard/SCHEMA.md` §3, wiremap v2) | standard studio |
| R12 | `genre.tetris.full_information_single_screen` (aperçu) + world scan `observation_manifest.json` | advisory |

Sections §1/§2/§4 : dérivations directes des 10 règles de genre et du `game_contract`. §3 : hypothèses de réalisateur, ancrées descriptivement au `retention_answer` du world scan mais **non certifiées**.

## Verdicts

- **software_verdict : BLOCKED** — l'oracle structurel `scripts/forge/prisme/check_prisme.mjs` (déterministe, non-LLM) existe mais je ne l'ai **pas exécuté** (permissions du contrat `run: aucun`). L'artefact est écrit conforme par construction au schéma 4-sections, mais sa validation mécanique revient à l'exécuteur/appelant Forge.
- **evidence_verdict : MECHANICAL_VALIDATION_ONLY** — ne s'applique qu'aux faits documentés cités (`genre_bible.json`, `observation_manifest.json`, `game_contract.yaml node:4`), pas au ressenti §3.
- **claim_verdict : NO_CLAIM_ALLOWED** — je ne certifie ni « jouable » ni « fun » ni le ressenti §3 ; toutes les indéterminations sont remontées en fog, non affirmées.

## Fog → HumanGate (jugement Pierre)

- **fog-A** — Variante Guideline 2001+ vs NES 1989 (aperçu multiple, hold, wall-kicks, barème). Non tranchée en s0 ; j'ai décrit le noyau commun, pas choisi. (Leçon AutoBattler : ne pas choisir une variante à la place de Pierre.)
- **fog-B** — Courbe de barème / vitesse : garantit ou non la *tension signature* du multi-nettoyage. Hors périmètre V1, mais conditionne la valeur produit (§3).
- **fog-C** — Hard-drop (confort moderne) inclus ou non dans le jeu de commandes §2.
- **fog-D** — Validation du ressenti §3 : non oracle-able, à trancher au playtest.
- **fog-E** (structurel, hérité de s0) — Le `00_CHARTER/charter.yaml` narratif **n'a jamais été persisté sur disque** (write s0 resté « pending »). J'ai ancré au `game_contract.yaml` bootstrap (NON_RATIFIÉ) + au rapport s0, pas à un charter ratifié. La cohérence du snapshot avec le charter *final* ne pourra être vérifiée qu'une fois ce fichier écrit.

## SKIPPED_VALIDATION

- **item** : exécution de l'oracle structurel `check_prisme.mjs` · **où** : cet artefact `product_snapshot.md` · **statut** : non fait · **raison** : permissions du contrat `run: aucun` — à lancer par l'exécuteur du panel Prisme.
- **item** : vérification de cohérence contre le `charter.yaml` ratifié · **où** : `games/tetris/00_CHARTER/charter.yaml` · **statut** : non faisable · **raison** : le fichier charter narratif n'existe pas sur disque (fog-E) ; ancrage de repli sur `game_contract.yaml` bootstrap + rapport s0, cohérence vérifiée manuellement seulement.
- **item** : oracle mécanique du ressenti §3 · **où** : §3 · **statut** : non applicable · **raison** : facette narrative, aucun oracle non-LLM disponible → NO_CLAIM_ALLOWED.
- **item** : ratification de `genre_bible.json` et du world scan · **où** : `01_DESIGN/genre_bible.json`, `GAME_REFERENCE/observation_manifest.json` · **statut** : non fait · **raison** : statut `NON_RATIFIEE_PROPOSITION` / `advisory: true`, utilisés en advisory ; leur ratification est une gate Pierre distincte.