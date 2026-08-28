# product_snapshot — kitten_clicker

Le produit fini est un **clicker/idle de collection de chatons** : un écran unique dominé par un chaton central que l'on caresse, une économie de caresses qui croît à la fois par le geste et toute seule, une galerie de chatons à débloquer, et une boucle marathon sans état perdu où l'on revient pour découvrir ce qui a poussé pendant l'absence. Ci-dessous, le produit décomposé en ce que le joueur voit, fait, ressent, puis les règles observables qui le rendent testable.

## 1. CE QUE LE JOUEUR VOIT

Au lancement, l'écran est occupé par un **gros chaton central** cliquable et par un **compteur de caresses** lisible en permanence, placé en zone focale — c'est l'objet du regard avant tout menu. À chaque caresse, un **feedback visuel immédiat** accompagne l'incrément (nombre flottant / petite animation), reprenant le ressort « le numéro qui monte » observé comme première raison de retour dans le worldscan (Cookie Clicker).

Sur les côtés, un **panneau de producteurs** (chatteries, gamelles, arbres à chat…) affiche chacun son coût courant et sa production ; le coût affiché grimpe visiblement à mesure qu'on rachète le même producteur. Une **galerie de collection** montre les chatons sous forme d'entrées **verrouillées (silhouette)** ou **débloquées**, chacune portant un **badge de rareté**. Par intermittence apparaît un **objet-bonus éphémère** (analogue du Golden Cookie) visible seulement dans une courte fenêtre. À la réouverture après une absence, un **panneau de gains hors-ligne** annonce les caresses accumulées pendant que l'app était fermée. Un **indicateur de prestige** signale quand le reset devient possible et affiche le multiplicateur permanent acquis. Aucun écran de défaite, aucune barre de vie, aucun compte à rebours de fin n'existe.

## 2. CE QUE LE JOUEUR FAIT

Le joueur **caresse le chaton central** pour gagner des caresses (le geste-cœur, actif). Il **dépense ces caresses** dans des producteurs automatiques pour que la ressource monte **sans clic**, faisant glisser la boucle de l'actif vers l'idle. Il **rachète** ces producteurs en acceptant un coût croissant à chaque unité. Il **débloque et collectionne des chatons** de rareté croissante, ce qui alimente l'objectif long-terme (comme la collecte des 66 chats de Neko Atsume citée par le worldscan). 

Par moments il **clique l'objet-bonus éphémère** dans sa fenêtre de vie pour empocher un bonus temporaire, ou l'ignore sans pénalité. Quand la production est mûre, il **déclenche le prestige** : il remet à zéro la production courante en échange d'un **multiplicateur permanent** qui relance la boucle plus fort. Enfin, il **ferme et rouvre le jeu** : rouvrir n'est pas neutre, c'est l'action qui révèle et encaisse les gains hors-ligne. Le joueur ne perd jamais rien qu'il ait déjà obtenu.

## 3. CE QUE LE JOUEUR RESSENT

Le ressenti dominant est le **calme récompensant** : chaque geste renvoie un gain lisible immédiat (contrôle direct), et l'économie qui monte toute seule donne une sensation d'**effort sans effort** — la progression avance même pendant le sommeil, comme le note le worldscan pour Neko Atsume. L'absence structurelle de défaite produit une **détente sans enjeu subi** : on ne peut pas rater, on ne peut rien casser, on n'a rien à défendre.

Par-dessus ce socle apaisant, deux moteurs d'engagement : la **curiosité de collection** (quel chaton rare va apparaître, comment le débloquer) et le **plaisir d'échelle** de la croissance exponentielle, où chaque palier semble être la fin jusqu'à en découvrir un plus grand. L'objet-bonus éphémère injecte de courtes **pointes d'attention** volontaires, jamais imposées par une notification agressive. Le prestige offre la satisfaction du **recommencer-plus-fort** : sacrifier une progression pour revenir la traverser plus vite. Le ton visuel — chatons, caresses — vise la **douceur**, pas la tension.

## 4. RÈGLES OBSERVABLES

Chaque règle est formulée pour être testée plus tard par un bot, un oracle ou une capture ; elle décrit le produit fini, pas le chemin de fabrication.

- **R1** — Caresser le chaton central incrémente le compteur de caresses d'une valeur strictement positive à chaque clic, affichée immédiatement.
- **R2** — Après achat d'au moins un producteur automatique, le compteur de caresses augmente au fil du temps sans aucun clic du joueur.
- **R3** — Aucun événement subi (temps écoulé, absence, action) ne retire un chaton déjà débloqué ni ne déclenche d'écran de défaite : la collection est monotone non décroissante.
- **R4** — À la réouverture après une fermeture de durée D, le jeu calcule et affiche des gains hors-ligne strictement positifs, ajoutés au total.
- **R5** — La galerie de collection affiche chaque chaton avec un état (verrouillé/débloqué) et un palier de rareté visible ; débloquer un chaton fait passer son état à débloqué de façon permanente.
- **R6** — Déclencher le prestige remet à zéro la production courante mais applique un multiplicateur permanent (>1) qui persiste après le reset et augmente le gain de base.
- **R7** — Le coût d'un producteur donné augmente strictement à chaque achat de ce producteur (coût_après > coût_avant).
- **R8** — Un objet-bonus éphémère apparaît par intermittence, reste cliquable pendant une durée bornée puis disparaît ; le cliquer dans la fenêtre octroie un bonus temporaire mesurable, ne pas le cliquer n'entraîne aucune pénalité.
- **R9** — L'écran principal affiche en permanence un compteur de caresses lisible et un chaton central cliquable en zone focale ; chaque clic produit un feedback visuel immédiat.
- **R10** — Dès la fin du chargement de la scène principale, le chaton central est cliquable et le premier clic produit un gain, sans écran de configuration bloquant préalable.
