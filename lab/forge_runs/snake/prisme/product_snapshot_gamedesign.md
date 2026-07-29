---
lens: gamedesign
run_id: snake-20260728-091302
marqueur: FORGE_DISPATCH:s1-prisme-lens-gamedesign:snake-20260728-091302
statut: PROPOSED
version_artefact: 2
date: 2026-07-28
revise_depuis: "v1 (2026-07-28) — révision imposée par charter.yaml version 2, décisions Pierre D1→D6 + règle de wiremap"
ancre: lab/forge_runs/snake/charter.yaml v2 (source de vérité) · docs/forge/GENRE_BIBLE_SNAKE_V1_PROPOSED.md (RATIFIÉE D4, source de compréhension) · lab/forge_runs/snake/GAME_REFERENCE/{progression_map.md, mechanics_analysis.md}
checklist: scripts/forge/prisme/design_review_checklist.yaml — catégories game_design, metagame, game_feel (lens: gamedesign)
claim_verdict: NO_CLAIM_ALLOWED
evidence_verdict: MECHANICAL_VALIDATION_ONLY
---

# PRODUCT SNAPSHOT — lentille GAME DESIGN — Snake (run snake-20260728-091302) — v2

Ce document décrit **le produit FINI** : le Snake du charter v2 tel qu'un joueur le vit,
une fois posé devant lui, sur une **application de bureau Godot** lancée hors-ligne.
Pas le chemin pour y arriver, pas l'implémentation.
Chaque règle de la §4 cite le TAG EXACT (texte MAJUSCULE avant les deux-points) du
critère `criteres_succes[]` ou `criteres_demo[]` du charter v2 qu'elle couvre — convention
mécanique de recombinaison `merge_prisme`.

**Ce qui a changé depuis la v1** (décisions Pierre du 2026-07-28, `charter.yaml.revisions`) :
la plateforme est le moteur Godot et non plus une page navigateur ; la vitesse n'est plus
fixe mais **accélère par paliers** et cette montée est un **pilier de design**, pas un
détail de réglage ; la **pause** existe ; le **meilleur score est persistant entre les
sessions** ; le jeu porte une **condition de victoire** et une progression chiffrée.
Les chiffres cités ci-dessous sont ceux de `charter.yaml.parametres_de_design` — cette
lentille ne les réinvente pas, elle décrit ce qu'ils produisent côté joueur.

---

## 1. CE QUE LE JOUEUR VOIT

**Une fenêtre, un seul écran, aucun menu préalable.** Le joueur lance l'application et
l'image est déjà celle d'une partie en cours : une grille carrée de 20 × 20 cases aux
bords matérialisés par un cadre plein, un serpent court de 3 segments posé sur la grille,
une pastille de nourriture ailleurs, et une ligne de chiffres au-dessus du plateau.
Il n'y a ni écran-titre, ni tutoriel écrit, ni bouton « Jouer », ni écran de chargement :
le serpent avance déjà tout seul, ce qui répond à la question « qu'est-ce que je dois
faire ? » avant que le joueur ait eu le temps de la poser.
*(tags charter `DEMARRAGE VISIBLE`, `DEMARRAGE IMMEDIAT` ; checklist `gd.action_30s`)*

**Quatre objets visuellement distincts, jamais confondables** : la tête du serpent
(cellule pleine, teinte la plus contrastée de l'écran), le corps (cellules pleines d'une
teinte plus sourde, la tête restant identifiable au premier coup d'œil), la nourriture
(forme et couleur qui n'existent nulle part ailleurs sur la grille), et les murs (cadre
continu, sans trou, qui dit visuellement « ici on meurt »). Le fond de la grille est
neutre et légèrement quadrillé, ce qui rend comptable à l'œil la distance qui reste
entre la tête et un obstacle. Tout est dessiné par primitives du moteur : aucune image,
aucune texture, aucune police tierce — la lisibilité vient de la forme et du contraste,
pas de l'illustration. *(tag charter `LISIBILITE DE LA GRILLE`)*

**Une ligne d'état en chiffres, lisible sans effort, à quatre informations.**
Le **score courant**, le **meilleur score** conservé, la **progression vers la cible de
victoire** (longueur atteinte sur longueur cible) et un **indicateur de cadence** (palier
d'accélération courant, ou période de tick). Ces quatre nombres sont écrits en chiffres
arabes, jamais en pips ni en jauges décoratives, et chacun correspond exactement à la
valeur interne du jeu au moment où il s'affiche.
*(tags charter `SCORE EN CHIFFRES`, `CONDITION DE FIN ET PROGRESSION MESURABLE`, `SAUVEGARDE DU MEILLEUR SCORE`)*

**Le remplissage de la grille est la première information de difficulté.** À mesure que le
corps s'allonge, le joueur voit littéralement l'espace libre se réduire : les cellules
occupées ne sont pas un chiffre caché dans un panneau, c'est l'image elle-même.
*(tag charter `LISIBILITE DE LA GRILLE`)*

**La montée de cadence est la seconde information de difficulté, et elle est visible.**
Le jeu démarre à une cadence lisible (200 ms par case, valeur de départ du charter) et
accélère par paliers au fil des prises de nourriture. Le joueur ne découvre pas cette
montée après coup : l'indicateur de cadence change de valeur au moment où le palier est
franchi, et il le voit. L'accélération n'est donc jamais une sensation qu'on lui demande
de croire sur parole — c'est un chiffre à l'écran doublé d'un ressenti.
*(tags charter `PROGRESSION VISIBLE DE DIFFICULTE`, `ACCELERATION PROGRESSIVE TESTEE`)*

**En pause : l'écran le dit, et il ne bouge plus.** Quand le joueur met en pause, le
plateau se fige entièrement — pas un segment ne se déplace — et un indicateur explicite
apparaît par-dessus la grille. La pause est un état lisible du jeu, pas une absence
d'animation qu'il faudrait deviner.
*(tags charter `PAUSE FONCTIONNELLE`, `PAUSE OBSERVABLE ET NEUTRE`)*

**À la fin : un écran explicite par-dessus la grille figée.** Le plateau reste visible en
arrière-plan dans son état exact au moment de la fin — le joueur voit *où* il s'est tué.
Par-dessus : le mot qui dit l'issue (perdu ou gagné, les deux existent et se distinguent),
le score final en chiffres, la longueur atteinte, le meilleur score après mise à jour
éventuelle, et une invite de relance en un geste. Rien ne clignote en silence, rien ne
continue à bouger derrière.
*(tags charter `MORT LISIBLE`, `CONDITION DE FIN ET PROGRESSION MESURABLE`, `REJOUER EN UN GESTE`)*

**Le meilleur score, affiché à côté du score courant, survit à la fermeture du jeu.**
C'est le seul élément qui traverse les parties *et* les sessions : le joueur ferme
l'application, revient le lendemain, et son record est toujours là. Il vit hors de l'état
de partie, ne se mélange jamais au score courant, et ne modifie aucune règle : il ne
donne ni bonus, ni handicap, ni changement de vitesse — juste une cible.
*(tags charter `SAUVEGARDE DU MEILLEUR SCORE`, `MEILLEUR SCORE PERSISTANT ET ETANCHE`)*

**Ce que le joueur ne voit jamais** : aucun panneau de développement, aucune commande dont
l'appui ne produit rien, aucun message d'erreur technique — y compris quand le fichier de
record est absent, vide ou illisible : dans ce cas le jeu s'ouvre normalement avec un
meilleur score à `0`, sans rien exiger du joueur.
*(tags charter `QUITTER OBSERVABLE`, `OBSERVABLE PAR LE JOUEUR DES LA WIREMAP`, `MEILLEUR SCORE PERSISTANT ET ETANCHE`)*

---

## 2. CE QUE LE JOUEUR FAIT

**Un verbe principal : tourner.** Le joueur n'a pas de bouton d'action, pas de tir, pas de
frein, pas d'accélération volontaire. Il appuie sur une des quatre flèches et le serpent
prend cette direction. C'est tout le vocabulaire de conduite du jeu, et c'est volontaire :
la profondeur ne vient pas du nombre de touches, elle vient de l'endroit où l'on choisit
de tourner. *(tag charter `DIRECTION REACTIVE` ; checklist `gd.action_30s`)*

**Deux commandes de session, hors conduite : mettre en pause, et quitter.** Elles ne
servent jamais à jouer mieux — la pause ne donne aucun avantage tactique puisqu'elle rend
exactement l'état d'avant — elles servent à ce que le joueur reste maître de son temps.
*(tags charter `PAUSE FONCTIONNELLE`, `QUITTER OBSERVABLE`)*

**Le serpent avance sans lui, de plus en plus vite.** Le joueur ne décide pas *quand* le
jeu avance : il décide seulement *dans quelle direction* le prochain pas se fera. La
cadence de départ (200 ms par case) est confortable et lisible ; elle se resserre d'un
cran tous les 5 fruits mangés, d'environ 8 % de la période à chaque palier, et ne descend
jamais sous le plancher déclaré (80 ms). Le joueur ne subit donc jamais une vitesse
non conduisible : il subit une vitesse qui **monte tant qu'il réussit**.
*(tags charter `ACCELERATION PROGRESSIVE TESTEE`, `BANDE DE VITESSE JOUABLE DECLAREE ET VERIFIEE`, `VITESSE JOUABLE RESSENTIE`)*

**Il réapprend sa conduite à chaque palier, et c'est le cœur de l'apprentissage.**
Un palier franchi ne change aucune règle : mêmes touches, même grille, mêmes collisions.
Il change seulement le temps disponible pour décider. Ce que le joueur acquiert d'un
palier au suivant, c'est de décider **plus tôt** — regarder deux cases plus loin, choisir
le virage avant d'y être. La difficulté ne se déguise jamais en changement de règles.
*(tags charter `PROGRESSION VISIBLE DE DIFFICULTE`, `ACCELERATION PROGRESSIVE TESTEE`)*

**Le demi-tour ne le tue jamais par accident.** S'il appuie sur la flèche exactement
opposée à sa direction courante — geste réflexe de panique quand un mur arrive, et geste
d'autant plus fréquent que la cadence monte —, la commande est simplement ignorée : le
serpent continue tout droit. La seule mort possible est une mort qu'il a conduite.
*(tags charter `DEMI-TOUR REFUSE`, `DIRECTION REACTIVE`)*

**Il mange, il grandit, il perd de la place, il accélère.** La seule interaction positive
du jeu est d'amener la tête sur la nourriture. Au moment même où il y arrive, le corps
gagne un segment et le score gagne un point — les deux dans le même battement, jamais
l'un après l'autre. Une nouvelle nourriture apparaît immédiatement ailleurs, jamais sous
le corps du serpent, donc toujours réellement atteignable. Chaque prise le rapproche
aussi du palier de vitesse suivant : manger est à la fois la récompense et la source de
la contrainte. *(tags charter `CROISSANCE OBSERVABLE`, `CROISSANCE ET SCORE AU MEME TICK`)*

**Il vise une fin, pas seulement un chiffre.** Le jeu déclare une cible de victoire
(longueur 25, soit 22 nourritures depuis une longueur initiale de 3) et l'affiche.
Le joueur sait donc, à tout instant, où il en est d'un objectif atteignable — et une
partie peut se terminer par un **gagné**, pas seulement par un mort.
*(tags charter `CONDITION DE FIN ET PROGRESSION MESURABLE`, `SOLVABILITE PROUVEE`)*

**Il planifie sa queue.** Le geste qui distingue un joueur débutant d'un joueur qui
progresse n'est pas la vitesse de doigt : c'est la capacité à savoir où sera sa propre
queue dans trois pas. Comme la queue se libère au même pas que celui où la tête y entre,
un couloir qui semblait fermé peut s'ouvrir juste à temps — et c'est cette lecture-là que
le joueur apprend à faire.
*(tags charter `COLLISION EXACTE`, `PARTIE SOLO COMPLETE SANS OUTIL` ; checklist `gd.comprehension_amelioration`)*

**Il met en pause sans payer.** Un appui suspend la partie ; un second la reprend
exactement là où elle s'était arrêtée : même position, même direction, même longueur,
même cadence de palier. Aucun rattrapage de temps ne le rattrape à la reprise — le jeu ne
lui vole pas les pas qu'il n'a pas joués, et ne le tue jamais pendant qu'il ne regardait
pas. *(tag charter `PAUSE OBSERVABLE ET NEUTRE`)*

**Il meurt, il relance, en un geste.** À la fin, un seul appui redémarre une partie neuve :
serpent de 3 segments, score à 0, grille vide, cadence revenue à sa valeur de départ.
Rien de la partie précédente ne fuit dans la nouvelle — à l'unique exception, nommée et
assumée, du meilleur score. Le joueur n'a jamais à relancer l'application, à naviguer
dans un menu, ni à confirmer quoi que ce soit.
*(tag charter `REJOUER EN UN GESTE` ; règle de genre `genre.snake.zero_penalty_instant_restart`)*

**Il joue une partie entière au clavier, seul.** Démarrage, croissance, paliers,
frôlements, pause, fin, écran final, relance : le cycle complet se fait avec les quatre
flèches, une touche de pause et une touche de relance, sans console, sans outil, sans bot.
*(tag charter `PARTIE SOLO COMPLETE SANS OUTIL`)*

**Ce que le joueur ne fait pas, et c'est un choix de design assumé** : il n'affronte
personne (pas de multijoueur), il ne ramasse aucun bonus (pas de power-up), il ne débloque
aucun contenu, il ne collectionne rien, il ne consulte aucun classement en ligne. Le
charter place ces axes hors de la tranche verticale, et le produit fini les assume comme
absence, pas comme manque à combler plus tard.
*(checklist `meta.collection`, `meta.deblocages` — répondus **non**, raison : `hors_scope` du charter)*

---

## 3. CE QUE LE JOUEUR RESSENT

**Les 30 premières secondes : « c'est facile, je gère ».** Le serpent est court, la grille
est vide, la première nourriture tombe en quelques secondes, et la cadence de départ est
lente. Le joueur obtient une récompense presque immédiate et apprend la causalité complète
du jeu — je vais dessus, je grandis, le chiffre monte — sans qu'on la lui explique. Comme
aucun menu ne s'interpose et que le serpent bouge déjà, il comprend la boucle entière
(avancer, manger, grandir, mourir, rejouer, viser mieux) avant d'avoir formulé une
question.
*(tags charter `DEMARRAGE VISIBLE`, `DEMARRAGE IMMEDIAT`, `COMPREHENSION DE LA BOUCLE EN QUELQUES SECONDES`, `CROISSANCE OBSERVABLE` ; checklist `gd.action_30s`, `feel.recompenses_frequentes`)*

**Le premier palier : « tiens, ça a bougé ».** Au cinquième fruit, la cadence se resserre
d'un cran. Le pas est assez petit pour ne pas casser la conduite, assez net pour être
perçu — et l'indicateur à l'écran confirme ce que la main vient de sentir. C'est le
premier moment où le jeu dit au joueur : *tu progresses, donc j'accélère*. La montée est
un dialogue, pas une punition.
*(tags charter `PROGRESSION VISIBLE DE DIFFICULTE`, `ACCELERATION PROGRESSIVE TESTEE`)*

**La minute suivante : la tension entre par deux portes en même temps.** Vers 10-15
segments, le joueur commence à frôler son propre corps *et* il a déjà franchi deux ou
trois paliers. Le sentiment dominant bascule de « je gère » à « j'ai failli ». Les deux
sources de difficulté sont de nature différente et le joueur les distingue : l'espace
qui manque est une contrainte qu'il a **fabriquée lui-même** en mangeant ; la vitesse qui
monte est une contrainte que le **jeu applique en réponse** à sa réussite. Aucune des deux
ne triche : la signature émotionnelle du genre — on perd contre soi-même — reste intacte.
*(tags charter `LISIBILITE DE LA GRILLE`, `PROGRESSION VISIBLE DE DIFFICULTE` ; règle de genre `genre.snake.space_as_primary_antagonist`)*

**La fin de partie soutenue : concentration serrée, respiration courte.** Quand la grille
est occupée à un tiers et que quatre paliers sont franchis, chaque pas coûte une décision
et le temps de la prendre a fondu. Le joueur ne pense plus « où est la nourriture » mais
« par où je sors après ». Le plancher de cadence déclaré garantit que cette tension reste
**physiquement conduisible** : le jeu se durcit, il ne devient jamais un tirage au sort de
réflexe. *(tags charter `VITESSE JOUABLE RESSENTIE`, `BANDE DE VITESSE JOUABLE DECLAREE ET VERIFIEE`)*

**La pause : un soulagement sans culpabilité.** Le joueur peut s'arrêter au pire moment
sans rien perdre et sans rien gagner. Il sait, parce que la reprise est strictement
identique, qu'il ne triche pas en respirant — et le jeu ne le punit pas d'avoir eu une
vie autour de l'écran. C'est ce qui rend une partie longue supportable.
*(tags charter `PAUSE FONCTIONNELLE`, `PAUSE OBSERVABLE ET NEUTRE`)*

**La mort : nette, jamais injuste.** Le joueur voit exactement la case où il s'est tué, la
partie s'arrête franchement, et le chiffre final est là. Trois garanties nourrissent ce
sentiment de justice : le demi-tour réflexe ne tue jamais, la détection de collision est
exacte au coin de grille et à la case de queue près, et la vitesse au moment de la mort
est celle qu'il a lui-même déclenchée en mangeant — jamais un pic surprise.
*(tags charter `MORT LISIBLE`, `DEMI-TOUR REFUSE`, `COLLISION EXACTE`)*

**La victoire : une fin, pas un écran de fatigue.** Atteindre la cible déclarée termine la
partie sur un **gagné** explicite. Le jeu peut donc se finir autrement que par un échec —
ce qui change la nature de l'effort : le joueur ne joue pas jusqu'à ce qu'il craque, il
joue vers quelque chose.
*(tags charter `CONDITION DE FIN ET PROGRESSION MESURABLE`, `SOLVABILITE PROUVEE`)*

**Juste après la fin : « encore une ».** La relance coûte un geste et zéro seconde
d'attente, la cadence repart à son point lisible, et rien n'est perdu. Le meilleur score
affiché à côté transforme l'échec en cible chiffrée immédiate.
*(tag charter `REJOUER EN UN GESTE` ; checklist `meta.retention`)*

**Le lendemain : le record est encore là.** C'est la seule promesse que ce jeu fait au-delà
de la session, et elle est tenue littéralement : un entier survit à la fermeture de
l'application. Ce n'est pas un métagame, c'est une **mémoire minimale de progression** —
mais elle suffit à transformer « j'ai bien joué hier » en une raison concrète de rouvrir
le jeu. La rétention inter-session de ce produit repose entièrement sur ce chiffre, et
c'est un choix explicite, pas un oubli.
*(tags charter `SAUVEGARDE DU MEILLEUR SCORE`, `MEILLEUR SCORE PERSISTANT ET ETANCHE` ; checklist `gd.boucles`, `meta.retention`, `meta.objectif_long_terme`)*

**Sur une dizaine de parties : le sentiment de progresser, sur un axe honnête.** Le joueur
mesure son amélioration sur un seul chiffre non falsifiable : le score, doublé du palier
de vitesse qu'il a su tenir. Comme le jeu est déterministe hors position d'apparition de
la nourriture, et qu'aucun bonus aléatoire ne vient sauver ou punir une partie, un
meilleur score signifie exactement une chose — **il a mieux joué**.
*(tags charter `DETERMINISME PROUVE PAR REPLAY`, `SCORE EN CHIFFRES` ; checklist `gd.progression_visible`, `gd.comprehension_amelioration`, `meta.maitrise`)*

**Le jeu peut être re-réglé sans être re-appris.** Les quatre chiffres qui font la
difficulté — cadence de départ, taille du palier, pas d'accélération, plancher — sont des
molettes de design, pas des propriétés gravées du jeu. Côté joueur, cela se traduit par
une promesse simple : si la montée est trop raide ou trop molle au playtest, c'est la
montée qui change, pas les règles qu'il a apprises.
*(tag charter `PARAMETRES DE JEU ISOLES ET NOMMES`)*

**Point de design à remonter en fog HumanGate — la montée n'atteint pas son plancher.**
Avec les valeurs initiales du charter (palier tous les 5 fruits, −8 % par palier, cible de
victoire à 22 nourritures), une partie gagnante franchit **4 paliers** et se termine autour
de 143 ms par case : le plancher de 80 ms n'est **jamais atteint dans une partie
victorieuse**. Ce n'est pas un défaut d'implémentation, c'est un arbitrage de courbe :
soit la montée est volontairement douce jusqu'à la victoire et le plancher ne sert que de
garde-fou pour les parties très longues, soit la cible de victoire ou le pas
d'accélération doivent bouger pour que le joueur ressente vraiment le haut de la bande.
Cette lentille ne tranche pas — les trois valeurs sont marquées `A_EQUILIBRER` dans le
charter et l'arbitrage appartient au playtest de Pierre.
*(tags charter `ACCELERATION PROGRESSIVE TESTEE`, `VITESSE JOUABLE RESSENTIE`)*

**Point de feel non couvert, remonté en fog HumanGate** : le produit décrit ici confirme
chaque événement clé (prise de nourriture, franchissement de palier, pause, fin de partie)
**visuellement et numériquement**, mais **sans aucun retour sonore** — le charter n'en
demande aucun et n'en interdit aucun. La question « ce Snake a-t-il besoin d'un son de
prise, d'un son de palier et d'un son de mort pour être satisfaisant ? » est une question
de joueur, pas d'oracle.
*(checklist `feel.feedback_sonore`, répondu **non** — raison : absent du charter, arbitrage joueur)*

---

## 4. RÈGLES OBSERVABLES

Chaque règle est vérifiable **en regardant l'écran ou en tenant le clavier**, sans lire
le code. Chaque règle cite le TAG EXACT du critère charter v2 qu'elle couvre.

### Démarrage et boucle principale

- **R1** — Au lancement de l'application, sans aucune action du joueur, la grille 20 × 20, un serpent de 3 segments, une nourriture et un score à `0` sont affichés, et le serpent avance déjà d'une case par pas de temps. *(charter `criteres_demo` : `DEMARRAGE VISIBLE`)*
- **R2** — Entre le lancement de l'application et le premier mouvement jouable, le nombre de gestes exigés du joueur est exactement zéro : aucun menu, aucun écran de chargement, aucun appui préalable. *(charter `criteres_demo` : `DEMARRAGE IMMEDIAT`)*
- **R3** — Une pression sur une flèche fait tourner le serpent au pas de temps suivant, de façon perceptible à l'écran, sans délai supplémentaire. *(charter `criteres_demo` : `DIRECTION REACTIVE`)*
- **R4** — Une pression sur la flèche exactement opposée à la direction courante n'a aucun effet : le serpent poursuit tout droit et ne rentre jamais dans son cou. *(charter `criteres_succes` : `DEMI-TOUR REFUSE`)*
- **R5** — L'intervalle entre deux pas du serpent vaut 200 ms par case au premier pas de chaque partie, et reste à tout instant compris entre cette valeur de départ et le plancher déclaré de 80 ms : jamais plus lent que le départ, jamais plus rapide que le plancher. *(charter `criteres_succes` : `BANDE DE VITESSE JOUABLE DECLAREE ET VERIFIEE`)*
- **R6** — L'intervalle entre deux pas se réduit par paliers au fil de la partie — un palier tous les 5 fruits mangés, environ 8 % de période en moins par palier — ne remonte jamais pendant une partie, sature au plancher, et repart à 200 ms au premier pas de la partie suivante. *(charter `criteres_succes` : `ACCELERATION PROGRESSIVE TESTEE`)*
- **R7** — Le joueur perçoit l'accélération à la conduite ET la lit à l'écran : un indicateur de cadence ou de palier change de valeur visible au moment exact où un palier est franchi. *(charter `criteres_demo` : `PROGRESSION VISIBLE DE DIFFICULTE`)*
- **R8** — Au pas de temps où la tête atteint la nourriture, le joueur voit dans le même battement : le corps gagner exactement un segment ET le score afficher exactement un point de plus. Jamais l'un sans l'autre, jamais l'un après l'autre. *(charter `criteres_succes` : `CROISSANCE ET SCORE AU MEME TICK`)*
- **R9** — Immédiatement après une prise, une nouvelle nourriture est visible sur une case libre — jamais sous un segment du serpent, donc toujours atteignable. *(charter `criteres_demo` : `CROISSANCE OBSERVABLE`)*
- **R10** — Toucher un mur ou un segment de son propre corps arrête la partie sur ce pas de temps : le serpent cesse de bouger et l'état de fin s'affiche. Le jeu ne continue jamais en silence après une collision et ne fige jamais l'application. *(charter `criteres_demo` : `MORT LISIBLE`)*
- **R11** — Aucune collision fantôme et aucune collision manquée : passer au coin de la grille sans toucher le cadre ne tue pas, entrer sur la case que la queue vient de libérer au même pas ne tue pas, et toucher réellement le corps tue toujours — y compris au palier de vitesse le plus rapide atteint. *(charter `criteres_succes` : `COLLISION EXACTE`)*

### Lisibilité et affichage

- **R12** — Tête, corps, nourriture et murs sont distinguables au premier coup d'œil par quatre traitements visuels différents ; la tête reste identifiable même quand le corps est long, et l'occupation croissante de la grille est visible à l'écran, pas déduite d'un chiffre. *(charter `criteres_demo` : `LISIBILITE DE LA GRILLE`)*
- **R13** — Un observateur qui n'a jamais vu le jeu peut dire, à tout instant et sans explication, où va le serpent, ce qu'il doit atteindre et où il en est de sa progression. *(charter `criteres_demo` : `LISIBILITE DU GAMEPLAY`)*
- **R14** — Le score et le meilleur score sont affichés en chiffres arabes lisibles, jamais en pips ni en formes, et les nombres affichés sont à tout instant exactement les valeurs internes correspondantes. *(charter `criteres_demo` : `SCORE EN CHIFFRES`)*
- **R15** — La cible de victoire est affichée au joueur et sa progression vers elle est lisible en chiffres pendant la partie ; une partie ne se termine jamais sans afficher explicitement laquelle des deux issues — perdu ou gagné — a été atteinte. *(charter `criteres_succes` : `CONDITION DE FIN ET PROGRESSION MESURABLE`)*
- **R16** — L'écran de fin affiche l'issue, le score final en chiffres, la longueur atteinte et le meilleur score, par-dessus la grille figée dans son état de fin, de sorte que le joueur voit où la partie s'est arrêtée. *(charter `criteres_demo` : `MORT LISIBLE`)*

### Pause

- **R17** — Une commande de pause suspend la partie : le serpent ne se déplace plus d'une seule case, et l'écran indique explicitement que le jeu est en pause. *(charter `criteres_demo` : `PAUSE FONCTIONNELLE`)*
- **R18** — À la reprise, la partie repart exactement de l'état d'avant pause — même position, même direction, même longueur, même score, même cadence — et exactement un pas est appliqué à la reprise : aucun rattrapage du temps passé en pause, aucune mort survenue pendant l'attente. *(charter `criteres_succes` : `PAUSE OBSERVABLE ET NEUTRE`)*

### Relance, mémoire et session

- **R19** — Depuis l'écran de fin, un seul geste démarre une partie neuve, sans passer par un menu ni relancer l'application. *(charter `criteres_demo` : `REJOUER EN UN GESTE`)*
- **R20** — La partie relancée repart à score `0`, longueur 3, grille vide et cadence de départ : aucune valeur de la partie précédente n'apparaît dans la nouvelle, à l'unique exception du meilleur score, qui vit hors de l'état de partie. *(charter `criteres_succes` : `MEILLEUR SCORE PERSISTANT ET ETANCHE`)*
- **R21** — Le meilleur score s'affiche à côté du score courant, se met à jour visiblement à l'instant où le joueur bat son record, et se retrouve inchangé après avoir fermé puis rouvert l'application. *(charter `criteres_demo` : `SAUVEGARDE DU MEILLEUR SCORE`)*
- **R22** — Le meilleur score ne modifie aucune règle de jeu : à meilleur score différent, une même séquence de touches produit la même partie. Et si l'enregistrement du record est absent, vide, illisible ou impossible à écrire, le jeu démarre quand même, avec un meilleur score à `0`, sans message d'erreur ni blocage. *(charter `criteres_succes` : `MEILLEUR SCORE PERSISTANT ET ETANCHE`)*
- **R23** — Toute commande proposée au joueur produit un effet visible quand il l'active : en particulier, la commande de sortie arrête la boucle et affiche l'état final. Aucune commande inerte n'existe dans le produit. *(charter `criteres_demo` : `QUITTER OBSERVABLE`)*
- **R24** — Le cycle complet — démarrage, croissance, paliers d'accélération, pause, fin, écran final, relance — se joue intégralement au clavier par un humain seul, sans console de debug, sans outil externe et sans le bot de test. *(charter `criteres_demo` : `PARTIE SOLO COMPLETE SANS OUTIL`)*
- **R25** — Un joueur qui découvre le jeu comprend la boucle complète — avancer, manger, grandir, accélérer, mourir, rejouer, viser mieux — en quelques secondes de jeu, sans lire de texte d'aide. *(charter `criteres_demo` : `COMPREHENSION DE LA BOUCLE EN QUELQUES SECONDES`)*

### Équité et lisibilité du résultat

- **R26** — Deux parties conduites avec la même séquence de touches depuis le même état initial se déroulent exactement de la même façon à l'écran, paliers d'accélération compris : aucun aléa caché ne sauve ni ne punit le joueur, hors position d'apparition de la nourriture. *(charter `criteres_succes` : `DETERMINISME PROUVE PAR REPLAY`)*
- **R27** — L'objectif de victoire est réellement atteignable en conduisant le serpent avec les seules touches de direction, dans les conditions réelles de jeu — accélération active, pas à vitesse de départ gelée. *(charter `criteres_succes` : `SOLVABILITE PROUVEE`)*
- **R28** — Le score est le seul axe de résultat du jeu, et il dépend uniquement de la conduite du joueur : aucun bonus, aucun malus, aucun multiplicateur, aucun déblocage n'intervient dans son évolution. *(charter `criteres_demo` : `SCORE EN CHIFFRES`)*
- **R29** — Aucun état décisif pour le joueur — score, meilleur score, longueur, position, cadence courante, issue de la partie, état de pause, possibilité de relancer — n'existe uniquement dans un canal invisible : chacun a une contrepartie affichée à l'écran. *(charter `criteres_succes` : `CONTRAT DE JOUABILITE RESPECTE`)*
- **R30** — Aucun système du jeu n'est invisible au joueur sans justification : chaque bloc de la wiremap déclare ce que le joueur en voit, et l'accélération, la pause et le meilleur score en font partie dès la conception, pas en finition. *(charter `criteres_succes` : `OBSERVABLE PAR LE JOUEUR DES LA WIREMAP`)*
- **R31** — Régler la difficulté ne change pas le jeu que le joueur a appris : cadence de départ, taille de palier, pas d'accélération et plancher sont les seules molettes de difficulté, et les modifier ne modifie ni les touches, ni les règles de collision, ni la condition de victoire. *(charter `criteres_succes` : `PARAMETRES DE JEU ISOLES ET NOMMES`)*

### Réponses de checklist portées par la lentille (statut explicite, jamais le silence)

| id checklist | statut | ce que le produit fini oppose | changement v1 → v2 |
|---|---|---|---|
| `gd.action_30s` | oui | R1, R2, R3 — le serpent avance seul dès l'ouverture, une flèche suffit à comprendre | inchangé (renforcé par R2) |
| `gd.boucles` | oui | boucle minute (R8), boucle session (R19-R21), et raison de revenir demain = record persistant (R21) | **v1 : partiel** — la raison de revenir existe désormais (D5) |
| `gd.progression_visible` | oui | R14, R15, R7 — score, meilleur score, progression vers la cible, palier de cadence | inchangé (élargi à la cible et au palier) |
| `gd.comprehension_amelioration` | oui | R26, R28 — sans aléa ni bonus, un meilleur score signifie une meilleure conduite | inchangé |
| `meta.objectif_long_terme` | oui | R15, R21, R27 — cible de victoire déclarée et record qui survit aux sessions | **v1 : partiel** — l'objectif traverse maintenant les sessions |
| `meta.collection` | non | aucune collection — `hors_scope` du charter (power-ups, cosmétiques) | inchangé |
| `meta.deblocages` | non | aucun déblocage — `hors_scope` du charter | inchangé |
| `meta.maitrise` | oui | R11, R12, R6 — profondeur = lecture spatiale de sa propre queue sous cadence croissante | inchangé (l'accélération ajoute un axe de maîtrise) |
| `meta.retention` | oui | R21 — rétention inter-session minimale par le meilleur score persistant ; rétention intra-session par R19 | **v1 : partiel + fog** — le fog est fermé par D5 |
| `feel.actions_satisfaisantes` | oui | R3, R5, R18 — réponse au pas suivant, cadence bornée et conduisible, pause sans rattrapage | inchangé (pause ajoutée) |
| `feel.feedback_visuel` | oui | R7, R8, R10, R16, R17, R21 — croissance, palier, arrêt net, écran de fin, pause, record battu | inchangé (3 événements de plus) |
| `feel.feedback_sonore` | non | aucun retour sonore ; absent du charter — arbitrage joueur, fog HumanGate | inchangé |
| `feel.recompenses_frequentes` | oui | R8, R9 — première prise en quelques secondes, prise suivante toujours atteignable | inchangé |
