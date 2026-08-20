# GENRE BIBLE — TETRIS (V1, PROPOSITION)

*Produite le 2026-08-03. **Statut : NON_RATIFIEE_PROPOSITION.** Source amont :
`games/tetris/GAME_REFERENCE/` (World Scan, oracle `check_worldscan` OK, 2 jeux /
9 sources). Gabarit : `docs/forge/GENRE_BIBLE_BREAKOUT_V1_PROPOSED.md`.*

## À quoi sert ce document

Une Genre Bible énonce **ce sans quoi le jeu cesse d'appartenir à son genre**. Elle
n'équilibre rien et ne décide d'aucune valeur. Chaque règle est rattachée à une ligne
de wiremap : une règle que personne n'applique est une lettre morte, et c'est
exactement ce que la Forge refuse.

Le tri appliqué ici est celui du World Scan : **constitutif** (points 1-5 de
`mechanics_analysis.md`) versus **variante** (le tableau des écarts Guideline / NES).
Les variantes ne sont PAS des règles de genre — elles sont listées en §3 comme
décisions ouvertes, et c'est Pierre qui tranche.

## §1 — Les 10 règles constitutives

| # | id | énoncé | ligne de wiremap |
|---|---|---|---|
| 1 | `genre.tetris.discrete_gravity` | La pièce active descend d'exactement une case à intervalle régulier, sans intervention du joueur. | `core.gravity` |
| 2 | `genre.tetris.irreversible_stack` | Une pièce figée ne bouge plus jamais. Aucune action ne peut la déplacer, la retirer ou l'annuler. | `core.lock_rules` |
| 3 | `genre.tetris.line_clear_compaction` | Une rangée entièrement remplie disparaît et tout ce qui est au-dessus descend d'autant. C'est le SEUL moyen de libérer de l'espace. | `core.line_clear` |
| 4 | `genre.tetris.seven_tetrominoes` | L'ensemble des pièces est exactement les 7 tetrominos (I, O, T, S, Z, J, L). Aucune autre forme n'apparaît. | `core.piece_bag` |
| 5 | `genre.tetris.rotation_bounded_by_terrain` | Une rotation dont la position résultante collisionne est refusée. Le terrain contraint la rotation ; la rotation ne déforme jamais le terrain. | `core.rotation_rules` |
| 6 | `genre.tetris.player_controls_active_piece_only` | Le joueur n'agit que sur la pièce active : translation horizontale, rotation, accélération de chute. Jamais sur la pile. | `core.input_rules` |
| 7 | `genre.tetris.loss_by_blocking` | La partie se termine lorsqu'une pièce entrante ne peut pas apparaître légalement. La défaite est une conséquence de l'état, jamais un compteur qui expire. | `core.game_state` |
| 8 | `genre.tetris.no_victory_in_marathon` | Il n'existe pas d'état gagné en mode marathon. Toute partie se termine par une perte ou un plafond. Cette asymétrie est constitutive, pas un manque. | `core.game_state` |
| 9 | `genre.tetris.superlinear_multi_clear_reward` | Nettoyer N lignes simultanément rapporte strictement plus **par ligne** que de les nettoyer séparément. Le rapport crée la tension ; sa valeur est un équilibrage. | `core.scoring` |
| 10 | `genre.tetris.full_information_single_screen` | L'état nécessaire à la décision (terrain, pièce active, aperçu, score) est visible en permanence, sans action du joueur. | `render.playfield` |

## §2 — Règles candidates REJETÉES, et pourquoi

Le rejet est documenté au même titre que l'acceptation : c'est l'ADN du genre qui se
lit dans les deux colonnes.

| candidate | rejetée parce que |
|---|---|
| « la pièce suivante est affichée » | **variante** : le NES n'affiche qu'une pièce, le standard plusieurs. Un Tetris sans aperçu reste un Tetris. |
| « le joueur dispose d'une réserve (hold) » | **variante** : absente du NES, présente dans le Guideline. |
| « une rotation contre un mur est rattrapée (wall kick) » | **variante** : introduite en 2001 seulement. Élever le SRS au rang de règle de genre daterait le genre de 2001, ce qui est faux. |
| « le terrain fait 10 colonnes sur 20 lignes » | **paramètre**, pas règle. Le Guideline documente 10×40 dont 20 visibles ; la dimension est un réglage, pas une identité. |
| « la gravité augmente avec le niveau » | **progression**, pas genre. Un Tetris à gravité constante reste un Tetris (plus ennuyeux). |
| « le score sature à 999 999 » | **artefact d'implémentation** d'une version précise. |

## §3 — Décisions ouvertes (gate Pierre)

Ces quatre points sont des variantes assumées. La Forge ne les tranche pas.

1. **Wall kick** : SRS complet, ou rotation stricte façon NES ?
2. **Réserve (hold)** : présente ou absente ?
3. **Profondeur d'aperçu** : 0, 1, ou N pièces ?
4. **Condition de fin haute** : blocage seul, ou plafond de score ?

## §4 — Limites déclarées

- Aucune règle ici n'est issue d'un playtest. Toutes proviennent de documentation
  mécanique citée par URL.
- Les valeurs numériques du World Scan (barème NES, paliers de niveau) sont
  **volontairement absentes** de cette bible : elles appartiennent à une version
  précise et les transposer serait une promesse trop forte.
- `status: NON_RATIFIEE_PROPOSITION` jusqu'à décision explicite de Pierre.

claim_verdict: NO_CLAIM_ALLOWED
