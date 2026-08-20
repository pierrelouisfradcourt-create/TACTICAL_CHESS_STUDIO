I now have my anchors: the agent-contract schema, the `game_contract` standard, and the charter (inline). My lens is **CEO/produit**, and my dispatch task confirms this is a **narrative artifact — no file is written** (the driver materializes it from my output, same pattern as the worldscan sibling step). I produce the CEO-lens contribution to `product_snapshot.md`, describing the **finished product** with strictly observable rules.

Note on scope discipline: the charter explicitly reserves numeric **design parameters** (exact scoring values, gravity curve, precise dimensions) to step s0. So I fix the observable **behaviours** (documented Tetris Guideline facts + genre invariants I'm entitled to cite) and route the numeric **calibration** to HumanGate as fog — never inventing a value s0 owns, never writing "à définir".

---

# product_snapshot.md — TETRIS (nœud 4)
### Facette CEO / produit — le produit fini tel que le joueur le vit

> **Ancre unique** : `charter.yaml` (étape s0, seule vérité validée) — `game_id: tetris`, `node: 4`, `runtimes: [rules, godot]`, grille discrète, `genre.tetris.no_victory_in_marathon` (pas d'état gagné en marathon), rendu par primitives (`assets.plan: cc0`).
> **Faits de genre cités** (documentés, non inventés — cf. mission de dispatch : « les règles du Tetris Guideline sont des FAITS documentés ») : chute de tétrominos, verrouillage sur contact, effacement de ligne pleine, aperçu de la pièce suivante, top-out. Les **valeurs numériques** (barème, courbe de vitesse, hauteur exacte) sont de la calibration s0 → remontées en `fog`, jamais fixées ici.
> **Angle imposé** : CEO/produit — valeur, positionnement, problème joueur résolu.

---

## 1. Ce que le joueur VOIT

- Un **puits vertical** (playfield en grille discrète) occupant le centre de l'écran, plus haut que large, dans lequel des pièces tombent depuis le haut.
- Des **tétrominos** — pièces de 4 cases, dans les 7 formes canoniques (I, O, T, S, Z, J, L) — chacune d'une couleur constante et distincte, rendues en primitives du moteur (aucun asset externe).
- Un **empilement** au fond du puits : les pièces déjà posées forment un relief de cases colorées que le joueur lit d'un coup d'œil.
- Un **encart « pièce suivante »** (next) affichant la ou les prochaines pièces à venir.
- Un **compteur de score** et un **compteur de lignes/niveau** lisibles en permanence, hors du puits.
- Une **ligne pleine qui disparaît** : quand une rangée est complète, elle s'efface visiblement et tout ce qui était au-dessus descend.
- Un **écran de fin de partie** (top-out) quand l'empilement atteint le haut du puits, affichant le score final atteint.

*Lecture CEO* : tout l'état de jeu tient dans un seul écran fixe, sans caméra ni défilement — le coût cognitif d'entrée est quasi nul, ce qui est précisément la valeur produit du genre (compris en 5 secondes, sans tutoriel).

## 2. Ce que le joueur FAIT

- Il **déplace latéralement** la pièce qui tombe (gauche/droite) pour choisir sa colonne.
- Il **fait pivoter** la pièce (rotation) pour l'orienter dans l'empilement.
- Il **accélère la descente** (soft drop) ou **la fait tomber d'un coup** (hard drop) pour poser plus vite.
- Il **remplit des rangées horizontales complètes** pour les effacer et faire baisser la hauteur de l'empilement.
- Il **gère un rythme qui s'accélère** : plus il progresse, plus les pièces tombent vite, et il doit décider plus rapidement.
- Il **relance une partie** immédiatement après un top-out.

*Lecture CEO* : une seule verbe-noyau (placer une pièce) répété, à difficulté auto-croissante — le produit ne dépend d'aucun contenu à produire (pas de niveaux, pas de narration), donc sa durée de vie est structurellement infinie pour un coût de contenu nul. C'est le meilleur ratio rétention/coût de contenu du curriculum jusqu'à ce nœud.

## 3. Ce que le joueur RESSENT

- **Maîtrise immédiate, plafond lointain** : il comprend tout en une partie, mais ne « finit » jamais — la tension monte à mesure que la vitesse croît.
- **Pression montante** : la partie devient progressivement plus rapide ; le joueur sent l'étau se resserrer sans qu'un texte le lui dise.
- **Soulagement / satisfaction à l'effacement** : faire disparaître une (ou plusieurs) ligne(s) est le pic de récompense de la boucle — la hauteur redescend, le danger recule.
- **Responsabilité de sa défaite** : le top-out n'est jamais ressenti comme injuste (aucun hasard adverse, aucune mort surprise hors-écran) — le joueur sait que c'est son placement qui a échoué, ce qui alimente le « encore une partie ».
- **Envie de rejouer** : la défaite est instantanée et sans punition (relance immédiate), ce qui transforme l'échec en relance plutôt qu'en frustration.

*Lecture CEO* : le problème joueur résolu, c'est **« j'ai 3 minutes et je veux un défi propre, sans engagement, que je maîtrise mais ne domine jamais »**. Le positionnement produit est l'archétype du casual-skill : accessible en une partie, jamais épuisé. Sa valeur pour le studio n'est pas commerciale mais **capitalistique** — c'est le premier nœud du curriculum posé sur grille discrète, donc le premier candidat sérieux à léguer un système réutilisable (générateur de pièces, logique de grille) aux jeux suivants.

## 4. Règles OBSERVABLES (chacune testable par un oracle en aval)

> Convention : chaque règle est formulée comme un comportement vérifiable du produit fini. Les seuils numériques (marqués **[calibration s0 → fog]**) ne sont pas fixés ici — seul le comportement l'est.

1. **R-VISIBILITÉ-PIÈCE** — À tout instant d'une partie active, il existe exactement une pièce « active » sous contrôle du joueur, affichée dans le puits.
2. **R-7-FORMES** — Toute pièce active est l'une des 7 formes de tétromino canoniques (I, O, T, S, Z, J, L) ; aucune autre forme n'apparaît jamais.
3. **R-SAC-DE-7 (7-bag)** — Sur toute séquence de 7 pièces consécutives générées, les 7 formes apparaissent chacune exactement une fois (aucune forme répétée ou absente dans une fenêtre de 7). *Fait de genre documenté.*
4. **R-CHUTE** — En l'absence d'action du joueur, la pièce active descend d'une rangée à intervalle régulier. *(Cadence exacte : **[calibration s0 → fog]**.)*
5. **R-DÉPLACEMENT-BORNÉ** — Une commande gauche/droite déplace la pièce d'exactement une colonne, et jamais au-delà des parois ni dans une case déjà occupée (le mouvement illégal est refusé, pas exécuté).
6. **R-ROTATION** — Une commande de rotation change l'orientation de la pièce ; si l'orientation cible entre en collision, elle est refusée (ou résolue par un décalage déterministe de type wall-kick — *variante SRS, fait de genre documenté*). Aucune rotation ne place jamais la pièce dans une case occupée ou hors du puits.
7. **R-VERROUILLAGE** — Quand la pièce active ne peut plus descendre (paroi basse ou case occupée dessous), elle se verrouille dans la grille et cesse d'être contrôlable ; une nouvelle pièce apparaît en haut.
8. **R-EFFACEMENT-LIGNE** — Dès qu'une rangée horizontale est entièrement remplie, elle est effacée et toutes les cases situées au-dessus descendent d'un nombre de rangées égal au nombre de lignes effacées. Une rangée non pleine n'est jamais effacée.
9. **R-APERÇU-SUIVANT** — La (ou les) prochaine(s) pièce(s) est affichée avant son entrée, et la pièce qui entre est exactement celle qui était annoncée.
10. **R-SCORE-MONOTONE** — Le score n'augmente que lors d'un effacement de ligne (et éventuellement d'un hard drop), n'est jamais négatif, et ne diminue jamais au cours d'une partie. *(Barème exact : **[calibration s0 → fog]**.)*
11. **R-ACCÉLÉRATION** — La cadence de chute est monotone non-décroissante au fil de la partie (elle augmente ou reste égale, jamais ne ralentit) en fonction de la progression. *(Courbe exacte : **[calibration s0 → fog]**.)*
12. **R-TOP-OUT** — Quand une pièce nouvellement générée ne peut pas être placée sans chevaucher l'empilement existant, la partie se termine (top-out) et l'écran de fin affiche le score atteint.
13. **R-PAS-DE-VICTOIRE-MARATHON** — En mode marathon, il n'existe aucun état « gagné » : la partie ne se termine que par top-out ou abandon, jamais par une condition de victoire. *(Invariant de genre imposé par le charter — `genre.tetris.no_victory_in_marathon`.)*
14. **R-RELANCE-PROPRE** — Après un top-out, relancer produit un puits vide et un état de départ identique à toute première partie (score à zéro, aucun résidu de la partie précédente).
15. **R-DÉTERMINISME-ENTRÉE** — À état de grille identique, pièce active identique et commande identique, le résultat (position/orientation/verrouillage) est identique — aucune part de hasard hors de la génération des pièces.

---

## RAPPORT FINAL (restitution standard)

**Ancre citée** : `charter.yaml` (étape s0) — l'unique source de vérité déjà validée que j'ai consommée, complétée par les faits de genre Tetris Guideline explicitement qualifiés de « documentés » dans ma commande de dispatch. Aucune autre lens ni aucun contrôle n'a été lu (contexte vierge, conforme à l'angle imposé).

**Cohérence avec le charter** : les 4 sections décrivent le produit FINI (jamais le chemin de fabrication) ; chaque règle de la §4 est formulée comme un comportement observable → testable en aval par un oracle. L'invariant charter `no_victory_in_marathon` est porté explicitement (R-PAS-DE-VICTOIRE-MARATHON). Le rendu par primitives (`assets.plan: cc0`) est respecté dans la §1 (aucun asset externe décrit).

**Nature de la preuve** : artefact **narratif** — il n'existe **aucun oracle mécanique** capable de valider une vision produit. Je ne peux donc pas auto-certifier que cette vision est « la bonne ».
- `software_verdict`: n/a (aucun oracle applicable à un artefact narratif)
- `evidence_verdict`: n/a
- `claim_verdict`: **NO_CLAIM_ALLOWED**

**Besoin HumanGate (fog → Pierre)** — ce qui relève du jugement humain, pas d'un oracle :
1. **Calibration des seuils numériques** (marqués `[calibration s0 → fog]`) : cadence de chute initiale, courbe d'accélération, barème de score, hauteur/largeur exactes du puits, nombre de pièces affichées en « next ». Ce sont des paramètres de design que le charter réserve explicitement à l'étape s0 — je les signale, je ne les fixe pas.
2. **Portée du produit** : présence ou non des mécaniques Guideline optionnelles **hold** (réserve) et **wall-kick/SRS** dans le périmètre du nœud 4. Je les mentionne comme faits de genre (R-6), mais leur inclusion est une décision de périmètre produit, pas une propriété mesurable.
3. **Définition de « solvabilité »** : le charter note que Tetris n'ayant pas d'état gagné, la solvabilité devra être redéfinie (survivre N pièces / nettoyer N lignes). C'est une décision ouverte que je confirme comme relevant du jugement, cohérente avec mes règles R-12/R-13.

**SKIPPED_VALIDATION** :
- **item** : validation mécanique du contenu narratif · **où** : product_snapshot.md (facette CEO) · **statut** : non fait · **raison** : aucun oracle non-LLM n'existe pour une vision produit ; l'ancre est la cohérence au charter, non une exécution de code (conforme au champ ORACLES/TESTS de mon contrat).
- **item** : cohérence inter-lens (front/back/game_designer/joueur/contrôle) · **où** : synthèse s1-prisme · **statut** : non fait (hors périmètre) · **raison** : contexte vierge imposé — je ne vois pas les autres lenses ; la fusion/adjudication est la charge de l'étape de contrôle/synthèse, pas de cette facette.
- **item** : fixation des paramètres de design chiffrés · **où** : §4 règles marquées `[calibration s0 → fog]` · **statut** : volontairement non fait · **raison** : ces valeurs appartiennent à s0 (garde-fou anti-usurpation d'étape) ; les fixer ici répéterait l'anti-pattern « un bootstrap qui joue les étapes à la place des agents » signalé dans le charter.