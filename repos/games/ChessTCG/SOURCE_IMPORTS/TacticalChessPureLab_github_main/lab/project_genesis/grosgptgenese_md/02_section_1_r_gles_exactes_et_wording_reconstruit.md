# SECTION 1 - — RÈGLES EXACTES ET WORDING RECONSTRUIT
1.1 Règle générale de plateau
[Décidé]
Le jeu se joue sur un plateau de 64 cases maximum, de structure de type échiquier. Le plateau compétitif standard est 8×8.

[Décidé]
Les deux premières rangées de chaque joueur sont réservées au placement initial et ne peuvent contenir ni trous, ni obstacles, ni buissons.

[Décidé]
Le plateau est déterminé avant la draft.

[Décidé]
Les plateaux compétitifs doivent rester symétriques, afin de ne pas avantager structurellement les blancs.

1.2 Déplacement
Règle générale
[Décidé]
Les pièces se déplacent selon leur nature d’échecs, sauf si leur carte modifie explicitement leur comportement.

Pion
[Décidé]
Le pion se déplace comme un pion d’échecs.

il avance d’1 case

il peut avancer de 2 cases au premier déplacement si la voie est libre

il capture en diagonale

[Décidé]
Les pions ne sont pas des supports. Ils doivent rester des pièces de progression et d’affrontement.

[Décidé]
Des exceptions limitées sont autorisées sur certains pions spéciaux :

javelot

cartouche

+1 mouvement

petit effet offensif

Cavalier
[Décidé]
Le cavalier se déplace en L comme aux échecs.

[Décidé]
Le cavalier saute les obstacles, les unités et les lignes.

Fou
[Décidé]
Le fou se déplace en diagonale comme aux échecs.

Tour
[Décidé]
La tour se déplace en ligne droite comme aux échecs.

Reine
[Décidé]
La reine se déplace comme aux échecs.

Roi
[Décidé]
Le roi se déplace d’1 case.

[Décidé]
Les rois ne peuvent jamais être adjacents.
Wording probable :

Un roi ne peut pas se déplacer sur une case adjacente au roi adverse. Deux rois ne peuvent jamais occuper des cases qui se contrôlent mutuellement.

1.3 Attaque
Règle générale
[Implicite fort]
Une unité attaque selon :

sa zone d’attaque

sa portée

ses règles de ligne de vue

ses règles de traversée

ses éventuels effets à l’impact.

Capture
[Implicite fort]
Une capture fonctionne comme dans les échecs : si l’unité cible est détruite, l’unité attaquante occupe sa case, sauf si une règle spécifique l’en empêche.

[Incertain]
Dans certains cas de Brawl ou d’attaque géométrique, la “prise” classique peut être remplacée par une résolution simultanée ou par une simple application de dégâts sans déplacement. Cela doit être verrouillé en prototype.

1.4 Défense
[Décidé]
Le jeu conserve un principe de défense de case comme aux échecs.

[Implicite fort]
Une pièce “défendue” n’empêche pas d’être attaquée, mais rend l’attaque plus risquée, plus coûteuse ou modifie la résolution.

[Décidé]
Certains cavaliers peuvent renforcer la défense d’une unité qu’ils couvrent, par exemple :

réduction des dégâts reçus

soin

bonus offensif de contre-pression

Wording probable :

Une unité est défendue si au moins une unité alliée contrôle sa case selon ses règles normales d’attaque ou de défense.

1.5 Attaques d’opportunité
Déclenchement
[Décidé]
Si une unité traverse une zone attaquable par une unité ennemie, elle peut subir une attaque d’opportunité.

Ligne de vue
[Décidé]
Une attaque d’opportunité ne se déclenche pas si la cible n’est pas visible.

Exemple explicitement donné :
si un pion bloque déjà la diagonale d’un fou, le fou ne déclenche pas d’attaque d’opportunité derrière ce pion.

Cavalier
[Décidé]
Le cavalier ignore les opportunités pendant son saut ; il ne peut subir une attaque d’opportunité que sur la case d’arrivée.

Limitation
[Décidé]
Il n’y a pas de restriction supplémentaire du type “1 seule opportunité par unité et par tour” comme règle verrouillée, car :

une seule pièce bouge par tour

la complexité supplémentaire a été jugée peu nécessaire.

Wording probable :

Lorsqu’une unité traverse une case ou une ligne contrôlée par une unité ennemie, cette unité ennemie peut lui infliger immédiatement une attaque d’opportunité, à condition de disposer d’une ligne de vue valide sur la case traversée ou la case d’arrivée. Le cavalier ignore ces attaques durant son saut et ne peut être affecté que sur sa case d’arrivée.

1.6 Ligne de vue
[Décidé]
Une ligne de vue est bloquée par :

une unité

un obstacle

un élément de terrain bloquant explicitement la vision

[Décidé]
Les buissons modifient la visibilité dans certaines variantes.

[Implicite fort]
Tous les systèmes de traversée, de sniper, de mage, d’opportunité et de géométrie doivent être évalués après application des règles de ligne de vue.

1.7 Pression du roi
[Décidé]
Le roi accumule de la pression.

Seuils
[Décidé]

Roi mage : 3

Roi hybride/tacticien : 4

Roi combat/tank : 4

Sources de pression
[Décidé]
Une attaque reçue = 1 pression

[Décidé]
Certaines altérations comptent aussi pour la pression, selon leur gravité.

[Décidé]
Le poison a été recalibré pour ne pas créer de double peine excessive ; il ne doit pas compter comme une pression abusive supplémentaire en plus de ses autres bénéfices.

Wording probable :

Lorsqu’un roi subit une attaque, il gagne 1 point de pression. Certaines altérations majeures peuvent également lui infliger de la pression. Si la pression d’un roi atteint son seuil, il entre dans une situation critique susceptible de provoquer un mat forcé selon l’état du plateau.

[Incertain]
La condition finale exacte “pression = défaite immédiate” ou “pression + roi attaquable = défaite” reste à revalider dans le prototype.

1.8 Sorts
Lanceur
[Décidé]
Les sorts sont lancés par le joueur, pas par le roi ni par une unité.

Limite
[Décidé]
Un joueur peut lancer 1 sort par tour.

Disponibilité
[Décidé]
Le joueur ne choisit pas 3 sorts fixes avant la partie.
Il peut jouer parmi tous les sorts draftés disponibles dans sa zone de draft / réserve.

Restriction de ciblage
[Décidé]
Les sorts ne peuvent pas cibler les deux premières rangées de chaque joueur.

Mages
[Décidé]
Les rois mages peuvent avoir, au minimum, une option du type :

jouer un 4e sort dans la partie

ou jouer 2 sorts dans un même tour, une seule fois

Wording probable :

Les sorts sont des ressources stratégiques conservées dans la zone de draft. Un joueur peut lancer au maximum un sort par tour. Les sorts ne peuvent pas cibler les deux premières rangées de chaque joueur. Certains effets de roi mage peuvent exceptionnellement permettre de dépasser cette limite selon des conditions précises.

1.9 Promotion
[Décidé]
La promotion des pions est un système central.

[Implicite fort]
Deux voies ont été considérées comme compatibles selon les versions :

promotion à la dernière rangée

promotion via level-up / capacité de roi tacticien

[Décidé]
Le roi tacticien peut, sur certains level-up, promouvoir un pion de la bonne faction, avec la limite :

pas plus d’une promotion par niveau

[Incertain]
La règle finale unique de promotion n’a pas été figée sous une seule forme de wording. La version la plus cohérente est :

Un pion peut être promu lorsqu’il atteint la rangée finale adverse. Certains effets de roi tacticien ou de set peuvent également promouvoir un pion allié de la faction appropriée. Une promotion spéciale accordée par un roi ne peut se produire qu’une fois par niveau obtenu.

1.10 Fusion
Types autorisés
[Décidé]

pion + pion

pion + backline

backline + backline

Timing
[Décidé]
La fusion Roi + Reine n’existe qu’avant la phase d’échecs.

[Décidé]
Les autres fusions sont jouées si leurs prérequis sont présents sur le board, via une carte de fusion.

Coût
[Décidé]

pion + pion : candidate naturelle à être gratuite

pion + backline : coûte potentiellement un sort

backline + backline : coûte potentiellement un sort

Conservation
[Décidé]
La fusion conserve :

PV perdus

buffs

altérations

Roque
[Décidé]
Une fusion ne peut pas roquer

Dégâts sur unité fusionnée
[Décidé]
Si une fusion occupe plusieurs cases, une même source de dégâts ne la touche qu’une seule fois.

Wording probable :

Pour jouer une fusion, le joueur doit révéler une carte de fusion et vérifier que les deux pièces requises sont présentes sur le plateau et satisfont les prérequis. La fusion remplace les pièces d’origine, conserve les PV restants, buffs et altérations applicables, et ne peut jamais roquer. Si plusieurs cases de la fusion sont affectées par une même source de dégâts, cette source n’est appliquée qu’une seule fois.

1.11 Restrictions de plateau et blocage
[Décidé]

64 cases max

2 premières rangées libres

au moins 2 colonnes ouvertes au déplacement

plateau symétrique

déterminé avant la draft

Traversée / blocage
[Décidé]
Les unités non cavalières suivent les règles normales de traversée :

elles ne passent pas à travers les unités

elles subissent les contraintes de ligne de vue / obstacle

[Décidé]
Le cavalier saute.

