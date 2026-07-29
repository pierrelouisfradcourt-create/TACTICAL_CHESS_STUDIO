# product_snapshot — snake

- run_id : `snake-20260728-091302`
- marqueur : `FORGE_DISPATCH:s1-prisme:snake-20260728-091302`
- ancre : `lab/forge_runs/snake/charter.yaml` — **version 2** (révisions Pierre D1→D6 + règle de wiremap)
- oracle de forme : `node scripts/forge/prisme/check_prisme.mjs lab/forge_runs/snake/product_snapshot.md`
- posture : produit FINI décrit tel que le joueur le vit. Aucun chemin de fabrication, aucun choix
  d'architecture, aucune décomposition en features (étapes 3 et 4).
- convention merge_prisme : chaque règle de la section 4 cite entre backticks le TAG EXACT du
  critère `criteres_succes[]` (ou `criteres_demo[]`) du charter v2 qu'elle couvre.
- révision v2 de cet artefact : la cible est le **moteur Godot 4.x en application de bureau** (plus
  de navigateur), la **pause** existe et est neutre, le **meilleur score** est persistant et étanche,
  et la vitesse **accélère par paliers** depuis 200 ms/case jusqu'à un plancher de 80 ms. Tous les
  chiffres cités proviennent de `parametres_de_design` du charter v2 — aucun n'est inventé ici.

---

## 1. CE QUE LE JOUEUR VOIT

Le joueur lance une application de bureau. Une fenêtre s'ouvre, et le jeu est déjà en train de se
jouer : pas de menu, pas d'écran de chargement, pas de bouton « Jouer », pas de connexion. L'image
tient entière dans la fenêtre.

**Le plateau.** Au centre, une grille carrée de 20 × 20 cases (400 cases), délimitée par une
bordure épaisse et continue qui matérialise les quatre murs. La grille est visuellement quadrillée
(lignes fines, contraste faible) : le joueur compte les cases à l'œil, il ne devine pas où finit
une case et où commence la suivante. Tout est dessiné par les primitives du moteur — aucune image
importée, aucune texture, aucune police tierce.

**Le serpent.** Un corps de cases pleines qui se suivent. La tête est distincte du reste : couleur
plus claire et un liseré marqué. Le corps est d'une seule teinte, uniforme, cases jointives. À la
première image, le serpent fait 3 segments, il est posé au centre de la grille et il regarde vers
la droite. Il est déjà en mouvement : le joueur n'a rien à presser pour que la partie commence.

**La nourriture.** Une case unique, d'une couleur franchement différente du serpent et du fond,
posée quelque part sur une case libre. Il y en a toujours exactement une à l'écran tant que la
partie est en cours.

**Le bandeau d'état.** Au-dessus de la grille, en chiffres arabes lisibles, quatre informations
tiennent sur une ligne :

- `Score : 0`, `Score : 1`, `Score : 2`… — le nombre de nourritures mangées, 1 point par nourriture.
- `Longueur : 3 / 25` — la longueur courante ET la cible de victoire déclarée. Le joueur sait en
  permanence où il en est et combien il lui reste.
- `Record : 0` — le meilleur score jamais atteint sur cette machine. Il est là dès la première
  seconde, à côté du score courant, et il ne bouge que lorsque le joueur bat son propre record.
- `Vitesse : palier 1` — l'indicateur de cadence. Il change de valeur au moment exact où le jeu
  accélère, et c'est la contrepartie lisible de ce que le joueur ressent dans ses doigts.

**Le remplissage.** À mesure que la partie avance, le joueur voit littéralement la grille se
charger : la traînée du corps occupe de plus en plus de cases, les couloirs libres se resserrent.
La contrainte d'espace est une image, pas un calcul caché.

**L'accélération, à l'écran.** Toutes les 5 nourritures, le serpent se met visiblement à filer plus
vite et l'indicateur de palier avance d'un cran. La période de déplacement part de 200 ms par case
et se réduit de 8 % à chaque palier (elle est multipliée par 0,92) ; elle ne descend jamais sous le
plancher de 80 ms par case, quelle que soit la durée de la partie. L'accélération est donc perçue
ET affichée.

**L'écran de pause.** Quand le joueur met en pause, tout s'immobilise et un panneau sobre affiche
`PAUSE` par-dessus le plateau, qui reste visible et parfaitement figé : le serpent est arrêté sur la
case où il était, la nourriture n'a pas bougé, le score et le palier sont inchangés. Rien ne
clignote, rien ne se recharge en arrière-plan.

**L'écran de fin.** Quand le serpent meurt, la partie s'arrête net sur l'image de la collision, et
un panneau se superpose au plateau : le mot `PERDU`, le score final en chiffres, la longueur
finale en chiffres, la cause de la mort en clair (`mur` ou `ton propre corps`), le record — signalé
comme battu s'il vient de l'être — et l'invite `Rejouer`. Le plateau reste visible derrière le
panneau : le joueur voit où il s'est tué.

**L'écran de victoire.** Si le serpent atteint la longueur cible déclarée du jeu — 25 segments,
soit 22 nourritures mangées — le même panneau s'affiche avec `GAGNÉ`, le score final, le record et
la même invite `Rejouer`.

**Ce que le joueur revoit le lendemain.** Il ferme l'application, la rouvre plus tard : le plateau
est neuf, le score est à 0, le serpent fait 3 segments — et le record affiché est exactement celui
qu'il avait laissé. C'est la seule chose qui traverse les sessions.

---

## 2. CE QUE LE JOUEUR FAIT

**Il ne fait qu'une chose : il tourne.** Le serpent avance seul, d'une case à chaque tick, du début
à la fin de la partie. Le joueur n'accélère pas lui-même, ne freine pas, ne saute pas, ne tire pas.
Il choisit uniquement la direction — c'est le jeu qui décide de la cadence.

**Les commandes.** Quatre touches fléchées (↑ ↓ ← →). Les touches Z/Q/S/D et W/A/S/D font la même
chose, pour un joueur qui ne quitte pas la main gauche du clavier. `P` (ou `Espace`) met en pause et
reprend. `Échap` termine la partie en cours. `R` relance depuis l'écran de fin. Rien d'autre n'est
branché : appuyer sur une autre touche ne produit aucun effet et n'interrompt pas la partie.

**Le geste de base.** Le joueur presse une flèche ; au tick suivant — au plus une période de
déplacement plus tard — la tête part dans cette direction. C'est perceptible immédiatement : il n'y
a pas d'inertie, pas de courbe, pas de temps de réaction supplémentaire. Plus la partie avance, plus
ce délai raccourcit, parce que la cadence accélère.

**Le geste refusé.** Presser la direction exactement opposée à celle du déplacement courant ne fait
rien du tout : le serpent continue tout droit. Un joueur qui, dans la panique, tape la mauvaise
flèche ne se tue jamais par retournement dans son propre cou.

**Manger.** Le joueur n'a aucune commande pour manger. Il amène la tête sur la case de la
nourriture ; c'est le seul acte de collecte du jeu. Au même tick, le corps gagne un segment, le
score gagne 1, et une nouvelle nourriture apparaît ailleurs sur une case libre. Une nourriture sur
cinq déclenche en plus un changement de palier de vitesse.

**Mettre en pause.** Un appui suspend la partie ; le mot `PAUSE` s'affiche. Le joueur peut aller
répondre au téléphone : à son retour, un second appui relance la partie exactement là où elle en
était — même case, même direction, même score, même palier, et le serpent fait UN pas, pas dix. Le
jeu ne rattrape jamais le temps passé en pause.

**Mourir.** Le joueur n'a aucune commande pour mourir. Il amène la tête sur un mur ou sur une case
occupée par son propre corps.

**Recommencer.** Depuis l'écran de fin, un seul geste — `R` ou `Espace` — relance une partie neuve :
serpent de 3 segments au centre, score à 0, palier de vitesse revenu à 200 ms par case, une
nourriture, plateau vide de toute trace de la partie précédente. Seul le record reste affiché,
inchangé ou fraîchement battu.

**Quitter / arrêter.** Le joueur arrête la partie en cours par `Échap` : la boucle s'arrête, l'écran
de fin s'affiche avec le score atteint et l'invite de relance. La commande a un effet visible
immédiat ; il n'existe aucune commande affichée qui ne fasse rien.

**Ce qu'il n'a pas à faire.** Aucun menu, aucun réglage, aucun tutoriel, aucune console, aucun
outil de développement, aucun appui préalable pour lancer la partie, aucune installation de
contenu, aucune connexion réseau.

---

## 3. CE QUE LE JOUEUR RESSENT

**Les 5 premières secondes : « j'ai compris ».** Le serpent bouge déjà, la nourriture est évidente,
la bordure dit où sont les murs, le bandeau dit où il en est (`3 / 25`). Le joueur n'a rien lu. Il
presse une flèche, la tête tourne, le contrat est signé. La boucle entière — avancer, manger,
grandir, mourir, rejouer, viser mieux — se lit dans les quelques secondes qui suivent, sans une
ligne de texte d'aide.

**Pendant la partie : la maîtrise, puis le double étau.** Au début, 400 cases pour un corps de 3 :
le joueur se promène, il fonce sur la nourriture en ligne droite, il se sent large. À 10 segments,
il regarde devant lui. À 20, il planifie deux ou trois virages à l'avance et il longe les bords pour
garder le centre libre. La tension vient de deux choses en même temps, et le joueur les sent
distinctement : l'espace qui disparaît, et le rythme qui monte. Le jeu devient plus étroit ET plus
rapide. À chaque palier franchi il y a une micro-seconde de recalibrage — « ah, ça va plus vite » —
puis une cadence de nouveau stable, tenable, jamais un emballement continu.

**La pause : une respiration sans prix à payer.** Le joueur met en pause sans redouter le retour.
Il sait qu'il ne mourra pas pendant l'écran de pause, qu'il ne perdra pas son avance, et que rien
ne va se rattraper d'un coup à la reprise. La pause est un droit, pas un risque.

**Au moment de la mort : « c'est ma faute ».** La mort est toujours lisible et toujours imputable.
Le joueur voit la case où il s'est encastré, la cause est écrite, et il sait qu'il aurait pu tourner
un tick plus tôt. Jamais l'impression d'avoir été tué par le jeu, par une touche perdue, par un
retournement accidentel ou par une accélération qu'il n'a pas vue venir. C'est la condition du
« encore une ».

**Après la mort : la relance réflexe, et une trace.** Un geste, une partie neuve, aucun écran
intermédiaire, aucune pénalité, aucun compte à rebours. La partie repart propre. Mais quelque chose
subsiste, une seule chose : le record. Il donne à la relance un but immédiat — battre le chiffre
d'à côté — sans jamais rendre la nouvelle partie plus facile ni plus difficile.

**La cible : un horizon, pas une punition.** `25` est écrit au-dessus du plateau depuis la première
seconde. Le joueur sait qu'il y a une fin gagnable, et il mesure sa progression vers elle à chaque
nourriture. La partie n'est pas une dérive infinie : elle a un verdict.

**Le rythme d'ensemble.** Une partie dure de quelques dizaines de secondes à quelques minutes. La
courbe émotionnelle est toujours la même : détente → concentration → crispation → verdict net →
relance. Aucun temps mort, aucune phase d'attente, aucune récompense différée.

**Ce que le joueur ne ressent jamais.** Il ne se sent pas trahi par les commandes, il n'attend
jamais que quelque chose se charge, il ne se demande jamais si la partie est finie ou non, il ne se
demande jamais quel est son score, et il ne perd jamais son record par accident.

---

## 4. RÈGLES OBSERVABLES

Chaque règle décrit un comportement du produit fini, observable par un joueur ou par un lecteur
mécanique branché sur le runtime réel du moteur, donc falsifiable. Le TAG cité entre backticks est
le critère du charter v2 couvert.

- **R1 — Le serpent avance seul, une case par tick, sans intervention.** Dès l'ouverture de
  l'application et jusqu'à la fin de la partie, la tête change de case exactement une fois par
  période de tick. Observable : la position de tête à deux instants séparés de N périodes diffère de
  N pas de grille. Couvre `DEMARRAGE VISIBLE`, `DEMARRAGE IMMEDIAT`.

- **R2 — La partie est jouable sans aucun geste préalable.** Entre le lancement de l'application et
  le premier mouvement du serpent, le nombre de menus, d'écrans de chargement et d'appuis requis est
  exactement 0. Observable : chronométrage du premier déplacement à partir de l'ouverture de la
  fenêtre, sans entrée injectée. Couvre `DEMARRAGE IMMEDIAT`, `DEMARRAGE VISIBLE`.

- **R3 — La période de déplacement part de 200 ms par case et reste dans une bande déclarée.** À
  chaque nouvelle partie, la période vaut 200 ms par case ; sur toute la durée d'une partie, elle
  reste comprise entre cette valeur initiale et le plancher de 80 ms par case, bornes incluses.
  Aucune valeur hors bande n'est jamais observée. Couvre `BANDE DE VITESSE JOUABLE DECLAREE ET VERIFIEE`.

- **R4 — Le jeu accélère par paliers, et jamais dans l'autre sens.** Tous les 5 fruits mangés, la
  période de déplacement est multipliée par 0,92 (−8 %). La période est monotone non croissante du
  premier au dernier tick d'une partie, et elle sature strictement au plancher de 80 ms : une fois
  le plancher atteint, un palier supplémentaire ne la change plus. Observable : période mesurée
  juste avant, exactement à, et juste après chaque seuil de palier. Couvre `ACCELERATION PROGRESSIVE TESTEE`.

- **R5 — L'accélération repart de zéro à chaque partie.** Après une relance, la période de
  déplacement est exactement la période initiale et l'indicateur de palier est revenu à son premier
  cran, quel que soit le palier atteint à la partie précédente. Observable : égalité stricte des
  valeurs de cadence au premier tick de la partie N+1 et au premier tick de la partie 1. Couvre `ACCELERATION PROGRESSIVE TESTEE`, `REJOUER EN UN GESTE`.

- **R6 — L'accélération est lisible à l'écran, pas seulement dans les doigts.** L'indicateur de
  cadence affiché change de valeur au tick exact où le palier est franchi, et cette valeur
  correspond strictement au palier interne. Observable : lecture simultanée de l'affichage et de
  l'état exposé au tick du franchissement. Couvre `PROGRESSION VISIBLE DE DIFFICULTE`, `VITESSE JOUABLE RESSENTIE`.

- **R7 — Une flèche change la direction au tick suivant, jamais plus tard.** L'entrée pressée
  pendant un tick est appliquée au tick immédiatement suivant. Aucune entrée valide n'est perdue,
  aucune n'est différée de deux ticks, à n'importe quel palier de vitesse. Couvre `DIRECTION REACTIVE`.

- **R8 — La direction exactement opposée est refusée.** Une commande opposée à la dernière
  direction effectuée est ignorée : la direction retenue au tick suivant reste la direction
  courante, et la tête n'entre jamais dans la case du cou par ce chemin. Observable : direction
  stricte au tick suivant. Couvre `DEMI-TOUR REFUSE`.

- **R9 — Toucher un mur tue, immédiatement et visiblement.** Si le pas suivant sort de la grille
  20 × 20, la partie s'arrête à ce tick, le serpent n'avance pas hors du plateau, et l'état final
  s'affiche avec la cause `mur`. Observable : statut perdu + panneau affiché au tick de sortie.
  Couvre `COLLISION EXACTE`, `MORT LISIBLE`.

- **R10 — Toucher son propre corps tue, sans faux positif ni faux négatif.** La tête qui entre sur
  une case occupée par un segment du corps met fin à la partie. La case que la queue libère au même
  tick n'est PAS une case occupée : y entrer ne tue pas. Le coin de grille et la case du cou
  immédiat sont traités comme des cas stricts, morts ou vivants, jamais approximés. Couvre `COLLISION EXACTE`, `MORT LISIBLE`.

- **R11 — Manger allonge le corps et augmente le score AU MÊME TICK.** Quand la tête entre sur la
  case de la nourriture, au terme de ce tick la longueur vaut exactement longueur précédente + 1 et
  le score vaut exactement score précédent + 1 (1 point par nourriture). Ni au tick d'avant, ni au
  tick d'après, ni « au moins ». Couvre `CROISSANCE ET SCORE AU MEME TICK`, `CROISSANCE OBSERVABLE`.

- **R12 — Il y a toujours exactement une nourriture, jamais sur le serpent.** À la consommation, une
  nouvelle nourriture apparaît au même tick sur une case libre, c'est-à-dire hors de toutes les
  cases du corps et de la tête. Observable : comptage = 1 et appartenance de sa case au complément
  du corps. Couvre `CROISSANCE ET SCORE AU MEME TICK`, `CROISSANCE OBSERVABLE`.

- **R13 — Le score affiché à l'écran est le score interne, en chiffres.** Le bandeau montre le
  score, la longueur, la cible et le record en chiffres arabes lisibles, jamais uniquement en pips,
  points ou formes, et chaque nombre affiché est strictement égal à la valeur interne à chaque tick.
  Couvre `SCORE EN CHIFFRES`, `CONTRAT DE JOUABILITE RESPECTE`.

- **R14 — La progression vers la victoire est chiffrée en permanence.** La cible de victoire
  (longueur 25, soit 22 nourritures depuis une longueur initiale de 3) est affichée pendant toute la
  partie à côté de la longueur courante. Observable : les deux nombres sont présents à chaque image
  d'une partie en cours. Couvre `CONDITION DE FIN ET PROGRESSION MESURABLE`, `LISIBILITE DU GAMEPLAY`.

- **R15 — Une partie se termine toujours par un verdict explicite, gagné ou perdu.** Le statut de
  partie prend une valeur parmi quatre, mutuellement exclusives : en cours, en pause, perdu, gagné.
  Aucune partie ne quitte l'état « en cours » sans afficher `PERDU` ou `GAGNÉ` avec son score final,
  et l'application reste réactive. Couvre `CONDITION DE FIN ET PROGRESSION MESURABLE`, `MORT LISIBLE`.

- **R16 — La pause arrête tout et se voit.** Sur commande de pause, l'écran affiche explicitement
  l'état de pause, et le nombre de ticks appliqués tant que la pause dure est exactement 0 : le
  serpent, la nourriture, le score et le palier ne bougent pas d'un pixel ni d'une unité. Couvre `PAUSE OBSERVABLE ET NEUTRE`, `PAUSE FONCTIONNELLE`.

- **R17 — La reprise repart du même état, sans rattrapage.** Après une reprise, l'état de partie est
  strictement égal à l'état d'avant la pause (position de chaque segment, direction, score,
  longueur, position de la nourriture, période de tick), à l'indicateur de pause près, et la
  première trame de reprise applique exactement 1 tick — jamais plusieurs. Observable : comparaison
  profonde des deux états et comptage des ticks à la reprise. Couvre `PAUSE OBSERVABLE ET NEUTRE`, `PAUSE FONCTIONNELLE`.

- **R18 — Le record survit à la fermeture de l'application.** Le meilleur score est affiché à côté
  du score courant, se met à jour visiblement au moment où le joueur dépasse son ancien record, et
  se retrouve à l'identique après fermeture puis réouverture de l'application. Observable : lecture
  de l'affichage avant fermeture et après relancement du processus. Couvre `MEILLEUR SCORE PERSISTANT ET ETANCHE`, `SAUVEGARDE DU MEILLEUR SCORE`.

- **R19 — Le record ne change aucune règle du jeu.** À record 0 ou à record 40, une même suite
  d'entrées sur la même graine produit exactement la même partie : mêmes positions, même score, même
  cadence, même issue. Le record est un affichage, jamais un modificateur. Couvre `MEILLEUR SCORE PERSISTANT ET ETANCHE`.

- **R20 — Le jeu démarre même si le record est illisible.** Sauvegarde absente, vide, corrompue ou
  non inscriptible : l'application s'ouvre quand même, affiche `Record : 0` et se joue normalement,
  sans message d'erreur bloquant ni interruption. Observable : lancement du jeu dans chacun de ces
  quatre états de sauvegarde. Couvre `MEILLEUR SCORE PERSISTANT ET ETANCHE`.

- **R21 — Rejouer en un geste remet tout à zéro, record excepté.** Un seul appui depuis l'écran de
  fin démarre une partie neuve : longueur 3, score 0, position centrale, direction droite, période
  initiale, une nourriture. Aucune valeur de la partie précédente ne subsiste, à la seule exception
  du record, qui vit hors de l'état de partie. Couvre `REJOUER EN UN GESTE`.

- **R22 — Aucune commande affichée n'est inerte.** Toute commande exposée au joueur — relancer,
  mettre en pause, quitter — produit un effet visible dans le runtime au moment où elle est
  actionnée. La touche Échap arrête la boucle et affiche l'écran de fin avec le score atteint. Couvre `QUITTER OBSERVABLE`.

- **R23 — Une partie complète se joue au clavier, sans aucun outil.** Démarrage, croissance, pause,
  reprise, mort, écran de fin, relance : la séquence entière est accessible à un humain avec les
  seules touches du jeu, sans console, sans bot, sans argument de ligne de commande. Couvre `PARTIE SOLO COMPLETE SANS OUTIL`, `PREUVE PAR LECTEUR REEL`.

- **R24 — La victoire est un état atteignable et déclaré, dans les conditions réelles de jeu.** Le
  jeu déclare une condition de victoire : atteindre la longueur 25 sans collision. Cette condition
  est atteignable sur la grille 20 × 20 avec l'accélération active, et un pilote déterministe
  utilisant les mêmes touches que le joueur y parvient réellement. Couvre `SOLVABILITE PROUVEE`.

- **R25 — Deux parties identiques donnent le même résultat, paliers compris.** À état initial
  identique, graine de nourriture identique et suite d'entrées identique, l'état final est
  strictement identique (positions du corps, score, longueur, période de tick, issue), sur une durée
  franchissant au moins deux paliers d'accélération. Couvre `DETERMINISME PROUVE PAR REPLAY`.

- **R26 — L'état du jeu est lisible de l'extérieur pendant la partie.** Le jeu expose en permanence
  un point d'observation de debug donnant la longueur, le score, le meilleur score, la position de
  la tête, la position de la nourriture, la période de tick courante et le statut (en cours, en
  pause, perdu, gagné), plus les éléments d'interface d'état de fin et de relance. Ces valeurs
  reflètent l'état réel au tick près. Couvre `CONTRAT DE JOUABILITE RESPECTE`, `PREUVE PAR LECTEUR REEL`.

- **R27 — L'état du jeu ne dépend d'aucun élément d'affichage.** Score, longueur, positions,
  cadence, collisions et issue existent et évoluent indépendamment de ce qui est dessiné :
  l'affichage lit l'état, l'état n'interroge jamais l'affichage. Observable : l'état avance
  identiquement que la fenêtre soit au premier plan, redimensionnée ou masquée. Couvre `LOGIQUE SEPAREE DU RENDU`.

- **R28 — Changer une valeur d'équilibrage change le jeu vu par le joueur, et rien d'autre.**
  Modifier la période initiale, le pas d'accélération, le palier, le plancher, la taille de grille ou
  la cible de victoire produit un comportement observablement différent à l'écran sans qu'aucun
  écran, aucune commande ni aucun affichage ne cesse de fonctionner. Couvre `PARAMETRES DE JEU ISOLES ET NOMMES`, `ARCHITECTURE EXTENSIBLE PROUVEE`.

- **R29 — Les moments marquants de la partie sont annoncés par le jeu lui-même.** Nourriture mangée,
  palier d'accélération franchi, fin de partie : chacun de ces instants est signalé sous forme
  d'information consommable, ce qui permet à l'écran de réagir au même tick que la règle. Observable :
  simultanéité stricte entre l'événement et son effet affiché. Couvre `ARCHITECTURE EXTENSIBLE PROUVEE`, `OBSERVABLE PAR LE JOUEUR DES LA WIREMAP`.

- **R30 — La grille se distingue à l'œil en quatre catégories.** Tête, corps, nourriture et murs sont
  visuellement séparables sans ambiguïté (teinte et forme), et l'occupation croissante du plateau est
  perceptible sans lire le score. Couvre `LISIBILITE DE LA GRILLE`, `LISIBILITE DU GAMEPLAY`.

- **R31 — La boucle complète se comprend sans un mot d'explication.** Un joueur qui découvre le jeu
  identifie en quelques secondes où va le serpent, ce qu'il doit atteindre, ce qui le tue, où il en
  est de sa progression et comment il relance — sans texte d'aide ni tutoriel. Observable : un
  observateur neuf décrit la boucle après une courte session, sans qu'on la lui explique. Couvre `COMPREHENSION DE LA BOUCLE EN QUELQUES SECONDES`, `LISIBILITE DU GAMEPLAY`.

- **R32 — Tout ce que le produit contient a une manifestation visible.** Chaque élément du jeu se
  traduit par quelque chose que le joueur voit ou subit à l'écran ; un élément sans manifestation
  visible justifie explicitement son existence. Couvre `OBSERVABLE PAR LE JOUEUR DES LA WIREMAP`, `REUTILISATION NOMMEE AVANT PRODUCTION`.

- **R33 — Le jeu tourne hors-ligne, sans réseau et sans dépendance externe.** Lancé sur une machine
  câble débranché, sans installation complémentaire, le jeu démarre et une partie se joue de bout en
  bout. Aucune ressource distante, aucun compte, aucun classement en ligne, aucun greffon tiers.
  Couvre `CONTRAT DE JOUABILITE RESPECTE`.

- **R34 — Aucun chiffre affiché au joueur n'est décoratif.** Score, longueur, cible, record et palier
  de cadence sont les seules valeurs numériques montrées, et chacune correspond exactement à une
  quantité du jeu portant le nom de ce qu'elle mesure. Aucune mesure interne n'est promue en
  information joueur sans cette correspondance. Couvre `VARIANCE PROUVEE AVANT USAGE`, `SCORE EN CHIFFRES`.

- **R35 — La vitesse reste conduisible par un humain à tous les paliers.** Une partie complète, du
  démarrage à la mort ou à la victoire, se joue au clavier par un humain sans que la cadence rende la
  conduite impossible ; la cadence est stable entre deux paliers et l'accélération reste tenable
  jusqu'au plancher déclaré. Couvre `VITESSE JOUABLE RESSENTIE`, `PARTIE SOLO COMPLETE SANS OUTIL`.

- **R36 — Chaque comportement de cette liste est constatable par exécution, pas par lecture.** Toute
  règle R1 à R35 se vérifie en faisant tourner le jeu réel dans une fenêtre du moteur et en observant
  l'écran ou l'état exposé, jamais en lisant une déclaration. Couvre `PREUVE PAR LECTEUR REEL`, `PREUVE MECANIQUE FOURNIE`, `TESTS A MUTATION FORTS`.

---

### Traçabilité charter v2 → règles

| TAG `criteres_succes[]` | Règles |
|---|---|
| SOLVABILITE PROUVEE | R24 |
| LOGIQUE SEPAREE DU RENDU | R27 |
| DETERMINISME PROUVE PAR REPLAY | R25 |
| COLLISION EXACTE | R9, R10 |
| CROISSANCE ET SCORE AU MEME TICK | R11, R12 |
| DEMI-TOUR REFUSE | R8 |
| BANDE DE VITESSE JOUABLE DECLAREE ET VERIFIEE | R3 |
| ACCELERATION PROGRESSIVE TESTEE | R4, R5 |
| PARAMETRES DE JEU ISOLES ET NOMMES | R28 |
| PAUSE OBSERVABLE ET NEUTRE | R16, R17 |
| MEILLEUR SCORE PERSISTANT ET ETANCHE | R18, R19, R20 |
| CONDITION DE FIN ET PROGRESSION MESURABLE | R14, R15 |
| ARCHITECTURE EXTENSIBLE PROUVEE | R28, R29 |
| CONTRAT DE JOUABILITE RESPECTE | R13, R26, R33 |
| PREUVE PAR LECTEUR REEL | R23, R26, R36 |
| TESTS A MUTATION FORTS | R36 |
| REUTILISATION NOMMEE AVANT PRODUCTION | R32 |
| TAUX DE REUTILISATION MESURE ET RAPPORTE | non couvert — mesure d'usine, invisible au joueur ; portée par la wiremap (s4+) |
| OBSERVABLE PAR LE JOUEUR DES LA WIREMAP | R29, R32 |
| PREUVE MECANIQUE FOURNIE | R36 |
| VARIANCE PROUVEE AVANT USAGE | R34 |
| CHARTER COMPLET | non couvert — propriété de l'étape 0, hors périmètre du produit fini |

| TAG `criteres_demo[]` | Règles |
|---|---|
| DEMARRAGE VISIBLE | R1, R2 |
| DIRECTION REACTIVE | R7 |
| CROISSANCE OBSERVABLE | R11, R12 |
| SCORE EN CHIFFRES | R13, R34 |
| MORT LISIBLE | R9, R10, R15 |
| REJOUER EN UN GESTE | R5, R21 |
| QUITTER OBSERVABLE | R22 |
| VITESSE JOUABLE RESSENTIE | R6, R35 |
| LISIBILITE DE LA GRILLE | R30 |
| PARTIE SOLO COMPLETE SANS OUTIL | R23, R35 |
| DEMARRAGE IMMEDIAT | R1, R2 |
| LISIBILITE DU GAMEPLAY | R14, R30, R31 |
| PAUSE FONCTIONNELLE | R16, R17 |
| SAUVEGARDE DU MEILLEUR SCORE | R18 |
| PROGRESSION VISIBLE DE DIFFICULTE | R6 |
| COMPREHENSION DE LA BOUCLE EN QUELQUES SECONDES | R31 |
</content>
</invoke>
