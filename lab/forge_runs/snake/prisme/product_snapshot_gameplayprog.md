# PRODUCT SNAPSHOT — Snake, lentille PROGRAMMEUR GAMEPLAY

Run : `snake-20260728-091302` · Mission : `FORGE_DISPATCH:s1-prisme-lens-gameplayprog:snake-20260728-091302`
Date : 2026-07-28 · **Révision v2** (charter v2, décisions Pierre D1→D6 + règle de wiremap).
Statut : lentille du Prisme (entrée de `merge_prisme`), pas une décision.

`claim_verdict: NO_CLAIM_ALLOWED` · `evidence_verdict: MECHANICAL_VALIDATION_ONLY`.

**Point de vue imposé** : le Snake du charter, FINI, décrit par ce qui doit être VRAI à
l'exécution pour que le joueur le vive. Pas d'architecture, pas de nom de fichier, pas de nom de
fonction, pas de métagame — seulement le comportement runtime observable et ses cas limites.

**Ce qui a changé depuis la v1** (charter `revisions.version: 2`) : la cible est le **moteur
Godot desktop** et non le navigateur (D1) ; la vitesse **accélère par paliers** au lieu d'être
fixe (D3) ; la **pause** est CONSERVÉE par Pierre — le rejet v1 est levé, et les invariants de
pause redeviennent centraux (D5) ; le **meilleur score persistant** entre dans le périmètre avec
une exigence d'étanchéité (D5) ; la V1 porte une **condition de fin** et une **progression
mesurable** (D2). Les règles v1 qui supposaient une cadence constante ou une absence de pause
sont réécrites, pas retirées.

**Sources des valeurs chiffrées** : `lab/forge_runs/snake/charter.yaml` (champ
`parametres_de_design`) et `docs/forge/GENRE_BIBLE_SNAKE_V1_PROPOSED.md` (§6.1 vitesse, §6.2
lisibilité, §6.3 latence), RATIFIÉE par Pierre le 2026-07-28 (D4). Les chiffres d'accélération
(palier 5 fruits, pas −8 %, plancher 80 ms) portent le statut charter `A_EQUILIBRER` : ils sont
repris ici **comme valeurs de test exactes**, pas comme normes de genre. Toute grandeur que la
Genre Bible marque `A_MESURER` est reprise avec la même marque, jamais consolidée en norme.
Aucune valeur nouvelle n'a été inventée.

---

## 1. CE QUE LE JOUEUR VOIT

Une fenêtre d'application de bureau, sans navigateur, sans menu, sans écran de chargement. Dedans,
une grille carrée de 20 × 20 cases (charter `parametres_de_design.grille`, décision Pierre D2),
entièrement visible d'un seul coup d'œil : pas de défilement, pas de caméra qui suit, pas de
portion cachée. Le joueur voit la totalité de l'espace de jeu et de ses murs dès la première image.
La taille de cellule en pixels reste, elle, une grandeur **à mesurer** sur le build réel : la Genre
Bible §6.2 ne fournit sur ce point aucune valeur vérifiée HTTP 200.

Sur cette grille, quatre choses se distinguent sans ambiguïté au premier regard : le **mur/bord**
(limite du plateau), la **tête** du serpent (rendue différemment du reste du corps, elle indique la
direction courante), le **corps** (chaîne de segments alignés sur les cases), et la **nourriture**
(une seule à l'écran à la fois, sur une case libre). Un joueur ne doit jamais confondre sa tête avec
sa queue au moment de décider.

Le mouvement est **discret par cases** : à chaque tick, la tête saute d'une case entière, le corps
suit. Il n'y a ni interpolation physique ni position fractionnaire — ce que le joueur voit est
exactement l'état logique, case par case.

La cadence, elle, **n'est plus constante**. La partie démarre à une vitesse lisible (200 ms par
case) et **accélère par paliers** au fil des nourritures mangées, jusqu'à un plancher borné où elle
cesse de descendre. Entre deux paliers la cadence est stable — le joueur ne subit jamais une dérive
continue et invisible : il franchit des marches. Et cette accélération n'est pas seulement
ressentie : l'écran affiche un **indicateur de cadence ou de palier**, en chiffres, qui change au
moment exact où la marche est franchie.

Deux chiffres cohabitent en permanence hors de l'aire de jeu, en caractères lisibles : le **score
courant** et le **meilleur score**. Les deux sont des nombres, pas des pastilles ni des formes. Le
score affiché est le score interne, sans approximation. Le meilleur score est celui de toutes les
parties passées, y compris celles jouées avant la dernière fermeture de l'application : quand le
joueur rouvre le jeu, son record est toujours là. Quand il le bat, le chiffre change visiblement
pendant la partie.

La **progression vers l'objectif** est lisible en chiffres pendant la partie : le joueur voit où il
en est par rapport à la cible de victoire déclarée, il n'a pas à la deviner.

En **pause**, l'écran le dit explicitement — une mention de pause visible, pas seulement un serpent
qui s'arrête. Le plateau reste affiché, intact : le joueur voit exactement la position qu'il
retrouvera. Rien ne bouge, aucun segment, aucune nourriture.

À la fin de partie, un **écran de fin explicite** se superpose : issue, score final en chiffres,
meilleur score, et une commande de relance. Le jeu s'arrête visiblement — le serpent ne continue pas
d'avancer en silence derrière l'écran, et la fenêtre ne se fige pas. Si l'objectif de victoire est
atteint, l'écran de fin affiche un état terminal **distinct** de la défaite : le joueur voit qu'il a
gagné, il ne voit pas « perdu ».

Il n'y a rien d'autre à l'écran : pas de menu à traverser avant de jouer, pas de console de debug
visible, pas de compteur technique. Ce que le jeu montre est ce qui décide la partie.

## 2. CE QUE LE JOUEUR FAIT

Il appuie sur une flèche. C'est le seul verbe du jeu pendant la partie.

Le serpent avance tout seul dès l'ouverture de l'application ; le joueur n'a rien à démarrer — zéro
geste avant le premier mouvement jouable. Il ne peut pas ralentir, accélérer ni arrêter le serpent
tant que la partie tourne. Sa seule autorité en jeu est de choisir la direction du **prochain**
déplacement parmi les quatre directions cardinales — pas de diagonale, pas d'action secondaire.

Concrètement, la boucle d'action tient en trois gestes qui se répètent :

1. **Anticiper** — le joueur regarde où sera sa tête dans deux ou trois cases et où est la
   nourriture, pendant que le serpent avance.
2. **Tourner au bon moment** — il appuie sur une flèche ; le virage se produit au tick suivant, au
   plus tard une période de tick après l'appui — 200 ms en début de partie, moins après chaque
   palier franchi. L'appui n'est jamais perdu dans le vide : la dernière direction demandée pendant
   l'intervalle courant est celle qui sera appliquée.
3. **Encaisser** — soit il attrape la nourriture (le corps s'allonge, le score monte, une nouvelle
   nourriture apparaît ailleurs), soit il touche un mur ou son propre corps, et la partie s'arrête.

Un geste est **explicitement refusé** : le demi-tour. Demander la direction exactement opposée à
celle du dernier déplacement effectué ne fait rien du tout — le serpent poursuit sa route. Ce refus
est une protection du joueur, pas une punition : il rend impossible la mort par erreur de doigt dans
son propre cou.

À côté du verbe de jeu, le joueur dispose de **commandes de session**, distinctes du pilotage :

- **Mettre en pause et reprendre.** Un appui suspend la partie : le serpent ne bouge plus du tout,
  l'écran dit qu'on est en pause. Un second appui reprend exactement là où il s'était arrêté —
  même position, même direction, même longueur, même score, même cadence. Pas de saut, pas de
  rattrapage des ticks perdus, pas de mort surprise à la reprise. Ce que le joueur demande pendant
  la pause n'est pas mémorisé : il reprend la main au premier tick d'après, comme s'il n'avait pas
  quitté.
- **Rejouer.** Après la fin de partie, **un seul geste** relance une partie neuve : score à zéro,
  serpent à sa longueur de départ, cadence revenue à 200 ms. Aucune confirmation, aucun menu
  intermédiaire, aucun report de la partie précédente — à la seule exception du meilleur score, qui
  n'est pas un état de partie et qui reste affiché.
- **Quitter.** La commande de sortie produit un effet visible à chaque appui réel : la boucle
  s'arrête et l'état final s'affiche. Une commande cliquable sans effet observable est un défaut,
  pas une option (leçon playtest Pong 2026-07-27).

Une partie entière — démarrage, croissance, accélération, mort ou victoire, écran de fin, relance —
se joue au clavier, sans console de debug, sans bot, sans outil.

## 3. CE QUE LE JOUEUR RESSENT

**Le contrôle est honnête.** Le joueur sent que le serpent lui obéit parce que le délai entre
l'appui et le virage est court, borné et *toujours d'un tick* — quelle que soit la cadence du
moment. Ce qui tue la confiance dans un jeu à tick n'est pas la latence : c'est sa variabilité. Ici
il n'y a pas de « parfois ça passe » : soit la direction est légale et elle s'applique au tick
suivant, soit c'est un demi-tour et il ne se passe rien de visible. Le joueur apprend cette
frontière en trois virages.

**L'accélération se sent comme une marche, pas comme une trahison.** La vitesse ne dérive pas
continûment sous les doigts du joueur : elle change d'un coup, au moment où il vient de manger, et
reste ensuite stable assez longtemps pour qu'il se recale. Le jeu monte la pression *devant lui*,
pas derrière son dos — et l'indicateur de cadence le lui confirme en chiffres. La difficulté vient
donc de deux sources qu'il perçoit distinctement : son propre corps qui étrangle l'espace, et le
tempo qui monte par marches. Le plancher de cadence est la promesse implicite que le jeu ne
deviendra jamais injouable : passé un point, il ne va plus jamais plus vite.

**Il ne meurt jamais par surprise technique.** Toutes les morts sont lisibles a posteriori : « j'ai
touché le mur », « j'ai coupé ma propre queue ». Aucune ne relève du moteur — pas de mort au moment
où la fenêtre revient au premier plan après avoir été minimisée, pas de rafale de ticks après une
pause, pas de serpent deux fois plus rapide après une relance. La règle ressentie est : *si je suis
mort, c'est ma faute*, et c'est exactement ce qui donne envie de relancer.

**La pause est un vrai refuge.** Le joueur peut lâcher le clavier au pire moment — serpent long,
cadence haute, tête à une case du mur — et revenir. Il retrouve la situation exactement telle qu'il
l'a laissée. Une pause qui rattrape le temps perdu, ou qui rejoue une touche pressée par distraction
pendant l'arrêt, transformerait ce refuge en piège : c'est ce que la section 4 verrouille.

**La causalité est instantanée.** Manger, grandir et voir le score monter arrivent dans le même
instant — pas de délai, pas d'animation qui décale la récompense. Le joueur relie sans effort son
geste à son gain.

**Il y a un cap, et il y a une trace.** Contrairement à une boucle infinie, la partie a une fin
gagnable : le joueur sait vers quoi il court et voit sa progression chiffrée. Et le meilleur score
survit à la fermeture de l'application — la session d'hier compte encore. C'est une mémoire
minimale, mais elle transforme « encore une » en « encore une, pour battre ça ».

**La relance ne coûte rien.** L'écran de fin donne l'issue, le score, le record et un geste. La
friction de rentrée est nulle, il n'y a rien à re-configurer : « encore une » est le mouvement par
défaut (Genre Bible `genre.snake.zero_penalty_instant_restart`).

**Ce qui casserait ce ressenti** — et que la section 4 verrouille — tient en une phrase : un jeu
dont le tick dérive hors de ses paliers déclarés, dont l'entrée se perd ou double, dont la pause
rattrape le temps, dont la mort arrive une case trop tôt, se ressent comme injuste avant même d'être
diagnostiqué comme buggé.

## 4. RÈGLES OBSERVABLES

Invariants d'exécution du produit fini. Chaque règle est formulée pour être convertie directement en
assertion d'oracle : elle porte une **valeur stricte**, un **comptage exact** ou un **comportement
binaire**. Aucune n'utilise un seuil relâché de type `>=` là où le comportement observable impose
une égalité (pré-mortem PILOU ②, charter `actions_interdites`). Chaque règle cite entre crochets, sur
une seule ligne, le ou les TAGs EXACTS du charter v2 qu'elle couvre.

Convention de valeurs pour l'accélération, reprise du charter `parametres_de_design` (statut
`A_EQUILIBRER` — ces chiffres peuvent bouger au playtest, les règles restent vraies avec les
nouvelles valeurs) : période initiale **200 ms**, palier tous les **5 fruits**, pas **×0,92**
(−8 %), plancher **80 ms**. Suite de référence : 200 · 184 · 169,28 · 155,7376 · 143,278…, plancher
atteint au 11ᵉ palier (55 fruits, valeur calculée 79,93 ramenée à 80).

### 4.1 Cadence, accélération, paliers

- **R1** — La période de tick au premier tick d'une partie est **strictement égale** à 200 ms, pour
  toute partie, quelle que soit la partie précédente, quel que soit le meilleur score enregistré.
  Falsification : une seconde partie qui démarre à une autre valeur ⇒ FAIL.
  [BANDE DE VITESSE JOUABLE DECLAREE ET VERIFIEE] [ACCELERATION PROGRESSIVE TESTEE]

- **R2** — Seuil de palier, valeur exacte de part et d'autre. À 4 nourritures mangées la période est
  **strictement égale** à 200 ms ; à exactement 5 nourritures elle est **strictement égale** à
  184 ms ; à 6 nourritures elle vaut encore **strictement** 184 ms. Même triplet au palier suivant :
  9 → 184 ms, 10 → 169,28 ms, 11 → 169,28 ms. Aucune assertion d'intervalle, aucun « a diminué ».
  [ACCELERATION PROGRESSIVE TESTEE]

- **R3** — La période ne change **qu'aux** multiples du palier déclaré. Sur une partie de N
  nourritures, le nombre de ticks où la période change alors que le compteur de nourritures n'est pas
  un multiple de 5 est **exactement 0**, et le nombre total de changements de période est
  **exactement** ⌊N/5⌋ tant que le plancher n'est pas atteint.
  [ACCELERATION PROGRESSIVE TESTEE] [PROGRESSION VISIBLE DE DIFFICULTE]

- **R4** — Monotonie stricte au sens non croissant : pour deux ticks consécutifs, période(t+1) ≤
  période(t), et le nombre de ticks où période(t+1) > période(t) sur une partie entière est
  **exactement 0**. Une accélération qui « respire » (période qui remonte) est un FAIL, pas un
  réglage.
  [ACCELERATION PROGRESSIVE TESTEE] [VITESSE JOUABLE RESSENTIE]

- **R5** — Saturation au plancher, valeur exacte. À 50 nourritures la période est **strictement
  égale** à 86,878 ms (valeur produite par la règle déclarée) ; à 55 nourritures elle est
  **strictement égale** à 80 ms (valeur calculée 79,93 ramenée au plancher) ; à 60 et 65 nourritures
  elle vaut encore **strictement** 80 ms. Le nombre de ticks dont la période est inférieure à 80 ms
  sur toute exécution est **exactement 0**. Note d'honnêteté : avec la cible de victoire déclarée
  (22 nourritures), le plancher n'est **pas** atteignable dans une partie gagnée — cette règle se
  teste sur la règle pure, et l'affirmer observable en partie serait une promesse plus forte que la
  mesure.
  [ACCELERATION PROGRESSIVE TESTEE] [BANDE DE VITESSE JOUABLE DECLAREE ET VERIFIEE]

- **R6** — Bande de vitesse bornée aux deux bouts. Sur toute la durée d'une partie, le nombre de
  lectures de période hors de l'intervalle fermé [80 ms, 200 ms] est **exactement 0**. Les deux
  bornes sont des constantes nommées lisibles depuis le code, pas des mesures d'horloge murale. La
  dérive réelle mesurée au mur sur un run complet est une grandeur **à mesurer**, rapportée telle
  quelle, jamais transformée en note.
  [BANDE DE VITESSE JOUABLE DECLAREE ET VERIFIEE]

- **R7** — Remise à zéro de l'accélération à chaque nouvelle partie. Après relance, la période est
  **strictement égale** à 200 ms et le compteur de paliers franchis est **strictement égal** à 0,
  même si la partie précédente s'est terminée au plancher.
  [ACCELERATION PROGRESSIVE TESTEE] [REJOUER EN UN GESTE]

- **R8** — Aucun rattrapage de temps, quelle que soit la cause de la privation d'exécution. Si la
  boucle est privée d'exécution pendant une durée D (fenêtre minimisée, perte de focus, pause du
  système d'exploitation, gel du processus), le nombre de ticks appliqués à la première trame de
  reprise est **exactement 1**, jamais ⌊D / période⌋. Falsification : suspendre la boucle 5 s, puis
  compter les ticks de la première trame ; toute valeur ≠ 1 ⇒ FAIL. C'est le mode de panne qui tue le
  joueur pendant qu'il ne regarde pas.
  [VITESSE JOUABLE RESSENTIE] [DETERMINISME PROUVE PAR REPLAY]

- **R9** — La logique de jeu ne lit aucune horloge et n'appelle aucune API du moteur. Le tick est une
  fonction de l'état courant et de l'entrée retenue vers un nouvel état ; appelée deux fois sur des
  états égaux, elle produit deux états **strictement égaux**. Le nombre d'appels à une source de
  temps du moteur, à un aléa non seedé ou à une API de présentation depuis la logique pure est
  **exactement 0**.
  [DETERMINISME PROUVE PAR REPLAY] [LOGIQUE SEPAREE DU RENDU]

- **R10** — L'indicateur de cadence affiché est la cadence réelle. À chaque tick où la période
  change, la valeur (période ou numéro de palier) lue à l'écran et la valeur lue dans l'état exposé
  sont **strictement égales**. Un indicateur décoratif qui ne suit pas la valeur interne est un FAIL.
  [PROGRESSION VISIBLE DE DIFFICULTE] [PREUVE PAR LECTEUR REEL]

### 4.2 Entrée — latence, refus, cas limites

- **R11** — Latence bornée à un tick, exactement. Entre le tick où une direction légale est acceptée
  et le tick où la tête se déplace effectivement dans cette direction, il s'écoule **exactement 1
  tick**, à toutes les cadences, y compris au plancher. Assertion sur le compte de ticks, jamais sur
  « au plus quelques ticks ».
  [DIRECTION REACTIVE] [CONTRAT DE JOUABILITE RESPECTE]

- **R12** — Une seule direction appliquée par tick, quelle que soit la rafale. Si N appuis (N ≥ 2)
  surviennent dans le même intervalle de tick, le nombre de changements de direction appliqués au
  tick suivant est **exactement 1**, et la direction appliquée est celle du **dernier** appui légal
  de l'intervalle. La profondeur de file d'entrée vaut donc 1 : la Genre Bible §6.3 observe deux
  modèles concurrents (direct Nokia / bufferisé Google) et qualifie explicitement le bénéfice de la
  bufferisation profonde de non chiffré (`hyp.snake.input_buffering_unquantified_benefit`) — une
  profondeur > 1 serait une décision de design à trancher par Pierre, pas un défaut d'implémentation.
  [DIRECTION REACTIVE] [DEMI-TOUR REFUSE]

- **R13** — Le refus du demi-tour se compare à la direction du **dernier déplacement effectué**, pas
  à une direction en attente. Cas limite falsifiant, à couvrir explicitement : serpent se déplaçant
  vers la droite, appui « haut » puis appui « gauche » dans le même intervalle de tick. Résultat
  attendu strict : la direction appliquée au tick suivant est **gauche**, et le statut reste **en
  cours** — la tête ne rentre jamais dans le cou. Une implémentation qui applique la direction dès
  l'appui produit ici une mort instantanée : c'est le test qui la démasque.
  [DEMI-TOUR REFUSE] [COLLISION EXACTE] [DIRECTION REACTIVE]

- **R14** — Une commande de demi-tour est **ignorée, pas mise en file**. Après un appui opposé à la
  direction courante, la direction appliquée au tick suivant est **strictement égale** à la direction
  courante, et cette commande refusée n'est pas rejouée plus tard.
  [DEMI-TOUR REFUSE]

- **R15** — Après la fin de partie, l'entrée de pilotage n'a plus aucun effet sur l'état de jeu.
  Toute séquence de flèches postérieure à la fin laisse la position de la tête, la longueur, le score
  et la période **strictement identiques** à leurs valeurs au tick terminal. Seules la commande de
  relance et la commande de sortie répondent.
  [MORT LISIBLE] [CONTRAT DE JOUABILITE RESPECTE]

### 4.3 Collision, bord, croissance

- **R16** — Bord : la tête ne prend **jamais** une coordonnée hors du plateau 20 × 20, y compris au
  tick de la fin. Sur toute la durée d'une partie, le nombre de lectures de position de tête hors de
  l'intervalle des cases valides est **exactement 0** ; le tick où la tête tenterait de sortir produit
  l'état terminal perdu, sans état intermédiaire hors-grille observable. Cas limite : les quatre coins
  du plateau.
  [COLLISION EXACTE] [MORT LISIBLE]

- **R17** — Auto-collision, cas du cou immédiat : impossible à provoquer par l'entrée (conséquence de
  R13/R14). Le nombre de fins de partie attribuées à une case de cou sur un run piloté par des
  entrées légales est **exactement 0**.
  [COLLISION EXACTE] [DEMI-TOUR REFUSE]

- **R18** — Auto-collision, cas de la queue qui se libère au même tick : en mouvement normal (sans
  nourriture consommée à ce tick), entrer sur la case occupée au tick précédent par le **dernier**
  segment ne met pas fin à la partie. Assertion stricte sur la fixture : après ce tick, statut = en
  cours et longueur inchangée. Cas symétrique falsifiant : si la nourriture est consommée au même
  tick, la queue ne se libère pas — mais cette configuration ne peut pas se produire, la nourriture
  n'apparaissant jamais sur une case du corps (R21).
  [COLLISION EXACTE] [CROISSANCE ET SCORE AU MEME TICK]

- **R19** — Zéro faux positif de collision : sur un run complet piloté par des entrées qui ne touchent
  ni mur ni corps, le nombre de fins de partie par collision est **exactement 0**. Zéro faux négatif :
  sur chaque fixture de collision (coin, mur droit, corps), la fin de partie survient au tick
  **exact** de l'entrée dans la case fatale, pas un tick plus tard. Cette exactitude est indépendante
  de la cadence : la même fixture rejouée à 200 ms et à 80 ms produit un état final **strictement
  égal**.
  [COLLISION EXACTE] [ACCELERATION PROGRESSIVE TESTEE]

- **R20** — Croissance et score au même tick. Sur une fixture tête-sur-nourriture, l'état après le
  tick vérifie deux **égalités strictes** : longueur = longueur avant + 1 et score = score avant + 1
  (incrément déclaré, `parametres_de_design.points_par_nourriture`). Aucune assertion de type « a
  augmenté ». Aucun délai, aucune animation n'intercale de tick entre la collision et ces deux mises à
  jour, et le franchissement éventuel d'un palier d'accélération se produit lui aussi à ce tick-là.
  [CROISSANCE ET SCORE AU MEME TICK] [CROISSANCE OBSERVABLE]

- **R21** — Toute nourriture apparue est sur une case libre. Sur un run complet, le nombre de
  positions de nourriture coïncidant avec une case du corps ou de la tête est **exactement 0**, et il
  y a **exactement 1** nourriture présente à tout tick où le statut est « en cours » ou « en pause ».
  [CROISSANCE ET SCORE AU MEME TICK] [SOLVABILITE PROUVEE]

- **R22** — Le choix de la case de nourriture termine toujours. Sur un état à **exactement 1** case
  libre, l'apparition retourne cette case en un nombre borné d'opérations. Sur un état à **0** case
  libre, elle ne boucle pas : elle renvoie l'état terminal de grille pleine. Falsification : un tirage
  par rejet non borné se manifeste ici par un blocage, jamais par un résultat.
  [SOLVABILITE PROUVEE] [DETERMINISME PROUVE PAR REPLAY]

### 4.4 Machine à états — pause, fin, victoire, relance

- **R23** — Quatre statuts, mutuellement exclusifs et exhaustifs : **en cours**, **en pause**,
  **terminé-perdu**, **terminé-gagné**. À tout instant, le statut lisible vaut **exactement une** de
  ces quatre valeurs ; aucune combinaison n'est observable, et le nombre de chemins de sortie de la
  boucle de jeu sans statut terminal est **exactement 0**.
  [CONDITION DE FIN ET PROGRESSION MESURABLE] [PAUSE OBSERVABLE ET NEUTRE]

- **R24** — La pause est un état de la machine à états, pas un gel d'horloge de présentation. Pendant
  la pause, le compteur de ticks lu après une attente réelle de 5 s est **strictement égal** à sa
  valeur au moment du passage en pause, et le nombre de mutations de l'état de partie appliquées
  pendant cette attente est **exactement 0**. Falsification : une implémentation qui se contente
  d'arrêter le rendu laisse le compteur avancer — le test la démasque.
  [PAUSE OBSERVABLE ET NEUTRE] [PAUSE FONCTIONNELLE]

- **R25** — Reprise strictement identique. L'état de partie capturé juste avant la pause et l'état de
  partie capturé juste après la reprise sont **profondément égaux** sur tous les champs (positions de
  tous les segments, direction effectuée, direction en attente, position de la nourriture, score,
  longueur, période de tick, compteur de paliers, compteur de ticks), à la seule exception de
  l'indicateur de pause lui-même. Aucune direction demandée pendant la pause n'est appliquée à la
  reprise : la direction en attente après reprise est **strictement égale** à celle d'avant pause.
  [PAUSE OBSERVABLE ET NEUTRE] [PAUSE FONCTIONNELLE]

- **R26** — Reprise sans rattrapage. Le nombre de ticks appliqués à la première trame après la
  reprise est **exactement 1**, quelle que soit la durée de la pause (cas de test : 0,1 s, 5 s, 60 s).
  L'intervalle jusqu'au premier tick d'après est une période de tick courante, jamais la durée de la
  pause (corollaire de R8).
  [PAUSE OBSERVABLE ET NEUTRE] [PAUSE FONCTIONNELLE]

- **R27** — La pause est observable à l'écran. Quand le statut vaut « en pause », le nombre de
  mentions de pause lisibles dans l'image rendue est **exactement 1**, et le plateau reste affiché.
  Un serpent qui s'arrête sans que l'écran le dise est un FAIL — indistinguable, pour le joueur, d'un
  jeu planté.
  [PAUSE FONCTIONNELLE] [PREUVE PAR LECTEUR REEL]

- **R28** — Le tick n'avance pas dans un état terminal. Après passage en terminé-perdu ou
  terminé-gagné, le compteur de ticks lu après une attente réelle est **strictement égal** à sa valeur
  au moment du passage.
  [MORT LISIBLE] [CONDITION DE FIN ET PROGRESSION MESURABLE]

- **R29** — La victoire est un état terminal distinct de la défaite. Lorsque la longueur atteint la
  cible de victoire déclarée (constante nommée, valeur initiale 25 segments soit 22 nourritures,
  charter `parametres_de_design.cible_de_victoire`, statut `A_EQUILIBRER`), le statut lisible vaut
  **exactement** terminé-gagné et l'écran de fin affiche une mention différente de celle de la
  défaite. Falsification : un bot qui atteint la cible et lit « perdu » ⇒ FAIL.
  [CONDITION DE FIN ET PROGRESSION MESURABLE] [SOLVABILITE PROUVEE]

- **R30** — La progression est lisible en chiffres à tout tick de partie : la valeur de progression
  affichée et la valeur interne (longueur courante rapportée à la cible) sont **strictement égales**,
  et la cible affichée est **strictement égale** à la constante nommée. Aucune progression n'est
  seulement suggérée par une barre sans chiffre.
  [CONDITION DE FIN ET PROGRESSION MESURABLE] [LISIBILITE DU GAMEPLAY]

- **R31** — Relance sans fuite d'état, avec une exception NOMMÉE et une seule. Après relance, l'état
  initial vérifie des **égalités strictes** : score = 0, longueur = 3 (longueur initiale déclarée),
  compteur de ticks = 0, compteur de paliers = 0, période = 200 ms, statut = en cours. Le nombre de
  champs de l'état de partie qui survivent d'une partie à l'autre est **exactement 0**. Le meilleur
  score survit, mais il ne fait pas partie de l'état de partie : il est la **seule** exception
  déclarée de l'oracle de non-fuite, et cette exception est nommée dans l'oracle, jamais implicite.
  [REJOUER EN UN GESTE] [MEILLEUR SCORE PERSISTANT ET ETANCHE]

- **R32** — Relance sans accumulation de boucle. Après N relances successives (N ≥ 3), le nombre de
  ticks appliqués par seconde au démarrage de la partie est **strictement égal** à celui de la
  première partie (5 ticks/s à 200 ms). Falsification directe du défaut classique « boucle non
  arrêtée » : un serpent deux fois plus rapide à la deuxième partie.
  [REJOUER EN UN GESTE] [BANDE DE VITESSE JOUABLE DECLAREE ET VERIFIEE]

### 4.5 Meilleur score — persistance et étanchéité

- **R33** — Mise à jour exacte, une seule fois par partie. À l'entrée dans un statut terminal, le
  meilleur score après mise à jour est **strictement égal** au maximum entre l'ancien meilleur score
  et le score final, et le nombre de mises à jour du meilleur score pendant une partie est au plus 1.
  Falsification : un score final inférieur au record qui écrase le record ⇒ FAIL.
  [MEILLEUR SCORE PERSISTANT ET ETANCHE] [SAUVEGARDE DU MEILLEUR SCORE]

- **R34** — Étanchéité stricte : le meilleur score n'influence **aucune** règle de jeu. Falsification
  mécanique : rejouer le même replay (même état initial, même graine, même séquence d'entrées) une
  fois avec un meilleur score enregistré à 0 et une fois à 999 ; les deux états finaux sont
  **strictement égaux** sur tous les champs de l'état de partie. Le nombre de lectures du meilleur
  score depuis la logique de partie est **exactement 0**.
  [MEILLEUR SCORE PERSISTANT ET ETANCHE] [DETERMINISME PROUVE PAR REPLAY]

- **R35** — Persistance entre sessions. Après fermeture puis réouverture de l'application, la valeur
  de meilleur score lue est **strictement égale** à celle affichée avant la fermeture. Falsification :
  une valeur remise à 0 à la réouverture, ou une valeur conservée seulement en mémoire de session.
  [MEILLEUR SCORE PERSISTANT ET ETANCHE] [SAUVEGARDE DU MEILLEUR SCORE]

- **R36** — Dégradation propre sur sauvegarde inutilisable. Pour chacun des quatre cas — fichier
  absent, fichier vide, fichier au contenu corrompu, emplacement non inscriptible — le jeu démarre, le
  meilleur score affiché est **strictement égal à 0**, la partie est jouable, et le nombre
  d'exceptions non gérées remontées à l'utilisateur est **exactement 0**. La dégradation est
  silencieuse côté joueur et journalisée côté debug.
  [MEILLEUR SCORE PERSISTANT ET ETANCHE] [SAUVEGARDE DU MEILLEUR SCORE]

- **R37** — Le meilleur score affiché est le meilleur score interne. À chaque tick où il change, le
  chiffre lu à l'écran et la valeur lue dans l'état exposé sont **strictement égaux**, et le meilleur
  score est visible en même temps que le score courant, pas seulement sur l'écran de fin.
  [SAUVEGARDE DU MEILLEUR SCORE] [SCORE EN CHIFFRES]

### 4.6 Observabilité par un lecteur réel

- **R38** — Le chiffre de score affiché est le score interne. À chaque tick où le score change, le
  texte lu à l'écran et la valeur lue dans l'état exposé sont **strictement égaux** — comparaison de
  valeurs, pas « le score est affiché ».
  [SCORE EN CHIFFRES] [PREUVE PAR LECTEUR REEL]

- **R39** — L'état exposé pour la lecture contient les grandeurs décisives et rien d'inventé :
  longueur, score, meilleur score, position de la tête, position de la nourriture, période de tick
  courante, statut (en cours / en pause / perdu / gagné). Chacune est lisible à tout tick, et l'oracle
  qui les lit passe par le runtime réel du moteur — instance réellement lancée, entrées réellement
  injectées, image réellement rendue dans une fenêtre GPU (le mode sans fenêtre rend une texture nulle
  sur ce poste, fait mesuré 2026-07-22) — jamais par un chemin exclusivement hors-moteur.
  [CONTRAT DE JOUABILITE RESPECTE] [PREUVE PAR LECTEUR REEL]

- **R40** — Toute commande exposée au joueur a un effet observable. Pour chaque commande présente
  (direction, pause, reprise, relance, sortie), un appui **réel** produit un changement d'état lisible
  à l'écran et dans l'état exposé. Le nombre de commandes sans effet observable est **exactement 0**.
  [QUITTER OBSERVABLE] [PREUVE PAR LECTEUR REEL]

- **R41** — Démarrage sans geste préalable. À l'ouverture de l'application, le nombre d'appuis ou de
  clics nécessaires avant que le serpent avance est **exactement 0** : le compteur de ticks progresse
  de lui-même, et la première image affichée contient déjà la grille, le serpent, une nourriture, le
  score et le meilleur score. Le nombre d'écrans de menu ou de chargement intercalés est **exactement
  0**.
  [DEMARRAGE IMMEDIAT] [DEMARRAGE VISIBLE]

- **R42** — Quatre catégories visuelles distinctes en permanence : mur, tête, corps, nourriture. Sur
  une image rendue, le nombre de ces catégories partageant la même valeur de remplissage est
  **exactement 0** — la tête n'est jamais rendue à l'identique d'un segment de corps. Les dimensions
  qui rendent cette distinction confortable (taille de cellule en pixels) sont **à mesurer** sur le
  build réel : la Genre Bible §6.2 ne fournit sur ce point aucune valeur vérifiée HTTP 200.
  [LISIBILITE DE LA GRILLE] [LISIBILITE DU GAMEPLAY]

- **R43** — Les cinq informations qui décident la partie sont lisibles simultanément sur une même
  image, sans interaction : direction courante (via la tête), cible à atteindre (nourriture), score,
  meilleur score, progression vers la cible de victoire. Le nombre de ces cinq informations absentes
  de l'image de jeu est **exactement 0**. Falsification : une information visible seulement sur
  l'écran de fin.
  [LISIBILITE DU GAMEPLAY] [COMPREHENSION DE LA BOUCLE EN QUELQUES SECONDES]

- **R44** — La boucle complète est traversable sans texte d'aide : depuis l'ouverture, une séquence
  d'entrées de longueur bornée mène successivement à avancer, manger, grandir, terminer, voir l'écran
  de fin, relancer — le nombre d'étapes de cette boucle qui exigent une explication écrite dans le jeu
  est **exactement 0**, et le nombre d'écrans d'aide affichés est **exactement 0**. Une partie entière
  se joue au clavier sans console de debug ni bot.
  [COMPREHENSION DE LA BOUCLE EN QUELQUES SECONDES] [PARTIE SOLO COMPLETE SANS OUTIL]

- **R45** — Le bot de solvabilité pilote par le **même canal d'entrée** que le clavier humain : aucune
  écriture directe dans l'état de jeu. Falsification : si le canal d'entrée est neutralisé, le bot ne
  progresse plus du tout. Sur la seed de référence et **avec l'accélération active**, il atteint le
  statut terminé-gagné ; sur une version volontairement cassée, l'oracle sort INJOUABLE avec un code
  de retour non nul.
  [SOLVABILITE PROUVEE]

- **R46** — Déterminisme par replay au travers des paliers : à état initial, graine de spawn et
  séquence d'entrées identiques, deux exécutions produisent un état final **strictement égal** (égalité
  profonde de toutes les grandeurs de R39, période et compteur de paliers compris). Le replay de
  référence est assez long pour franchir **au moins 2** paliers d'accélération, soit au moins 10
  nourritures mangées.
  [DETERMINISME PROUVE PAR REPLAY] [ACCELERATION PROGRESSIVE TESTEE]

### 4.7 Ce que l'exécution doit prouver de l'architecture

- **R47** — Un seul endroit porte les nombres du gameplay. Le nombre de littéraux numériques de
  gameplay (dimensions de grille, période initiale, palier, pas, plancher, longueur initiale, cible de
  victoire, points par nourriture) présents hors du bloc de constantes nommées est **exactement 0**, y
  compris dans les scripts de présentation et dans les tests. Preuve par l'effet : modifier la seule
  valeur de période initiale change la cadence observée au runtime, et le nombre d'autres fichiers
  modifiés pour obtenir cet effet est **exactement 0**.
  [PARAMETRES DE JEU ISOLES ET NOMMES] [ARCHITECTURE EXTENSIBLE PROUVEE]

- **R48** — Les événements de tick sont des données consommables par un observateur externe. Sur une
  partie où N nourritures sont mangées et P paliers franchis, un observateur de test branché sans que
  la logique connaisse son existence reçoit **exactement N** événements « nourriture mangée »,
  **exactement P** événements « palier franchi » et **exactement 1** événement « fin de partie ». Le
  nombre de références de la logique pure vers cet observateur est **exactement 0**. Un point non
  prouvé par ce branchement réel est rapporté comme non prouvé, jamais comme intention.
  [ARCHITECTURE EXTENSIBLE PROUVEE] [LOGIQUE SEPAREE DU RENDU]

- **R49** — Les invariants critiques de cette lentille sont ceux que la mutation doit tuer :
  détection de collision (R16-R19), incrément de longueur et de score au même tick (R20), refus du
  demi-tour (R13-R14), seuil et plancher d'accélération (R2, R5), statut terminal (R23, R29), mise à
  jour du meilleur score (R33). Pour chacun, un mutant survivant est trié avec une justification
  nommée ; le nombre de mutants survivants laissés sans justification est **exactement 0**.
  [TESTS A MUTATION FORTS] [PREUVE MECANIQUE FOURNIE]

- **R50** — Aucune grandeur d'exécution nommée « difficulté », « pression spatiale » ou « courbe
  d'accélération ressentie » n'est publiée sans preuve de variance préalable (≥ 2 valeurs distinctes
  non triviales sur échantillon). Le taux d'occupation de la grille et la période de tick sont
  publiables sous leur nom exact — ce qu'ils mesurent réellement. Cas d'école interne à ce jeu : le
  numéro de palier est une fonction déterministe du nombre de nourritures mangées ; le publier sous le
  nom « difficulté » serait exactement la panne grid-navigator (une grandeur qui reproduit une autre
  grandeur sous un nom plus ambitieux).
  [VARIANCE PROUVEE AVANT USAGE]

### 4.8 Ce que cette lentille ne tranche pas

Trois grandeurs restent ouvertes et ne sont **pas** comblées par invention : la taille de cellule en
pixels (Genre Bible §6.2, statut `A_MESURER`) ; les trois chiffres d'accélération (palier 5, pas
−8 %, plancher 80 ms) et la cible de victoire (25 segments), tous portés par le charter au statut
`A_EQUILIBRER` et déjà remontés en `question_ouverte_humangate` — les règles ci-dessus sont écrites
pour rester vraies si Pierre change ces valeurs, seules les constantes de test bougent ; la
profondeur de file d'entrée si Pierre préfère le modèle bufferisé Google au modèle direct (R12 fixe 1
et nomme l'alternative).

Sur les 38 TAGs du charter v2 (22 critères de succès + 16 critères de démo), 34 sont cités par au
moins une règle ci-dessus. Les 4 restants ne sont couverts par aucune règle de cette lentille, et
c'est volontaire : ils ne portent pas sur le comportement runtime observable par le joueur.
`REUTILISATION NOMMEE AVANT PRODUCTION`, `TAUX DE REUTILISATION MESURE ET RAPPORTE` et `OBSERVABLE
PAR LE JOUEUR DES LA WIREMAP` sont des exigences sur la wiremap (étape architecture, en amont du
runtime) ; `CHARTER COMPLET` porte sur le charter lui-même. Les deux TAGs de chaîne de preuve
(`PREUVE MECANIQUE FOURNIE`, `TESTS A MUTATION FORTS`) sont, eux, couverts par R49, qui nomme les
invariants d'exécution que la mutation doit tuer.
