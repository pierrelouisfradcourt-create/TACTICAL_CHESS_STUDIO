## 1. CE QUE LE JOUEUR VOIT

L'écran affiche une arène de jeu rectangulaire avec un arrière-plan neutre (noir ou dégradé). En bas, le **vaisseau du joueur** : un petit sprite triangulaire pointant vers le haut, centré sur l'axe horizontal. Des **ennemis** descendent du haut en formations régulières — des carrés ou hexagones rouges/orange, espacés pour être distingués.

Un **HUD** occupe le coin supérieur : nombre d'ennemis restants, score, santé du vaisseau (barre ou nombre de vies). Chaque projectile tiré apparaît comme un trait blanc remontant du vaisseau vers les ennemis.

Quand un projectile frappe un ennemi : **flash blanc rapide** + disparition de l'ennemi + incrementeur de score. Quand le vaisseau est touché : **flash rouge**, indicateur visuel de "dégâts". Quand tous les ennemis sont détruits : **écran transparent de victoire** affichant "WAVE CLEAR" + compteur (ex: "20/20 destroyed"), bouton pour passer à la vague suivante.

Quand le vaisseau perd : **écran GAME OVER** semi-opaque couvre le jeu, affiche le score final, et expose un bouton `#restart` au centre.

## 2. CE QUE LE JOUEUR FAIT

Le joueur **contrôle le vaisseau horizontalement** : clics souris gauche/droite, ou touches clavier (A/D, flèches) pour glisser le vaisseau dans les limites de l'arène (bords bloquants).

Le joueur **tire automatiquement ou manuellement** : projectiles émis en continu (ou au clic) qui remontent tout droit depuis le vaisseau. Aucun délai de rechargement, tir fluide.

Le joueur **anticipe et réagit** : observe le pattern de descente des ennemis, ajuste la position du vaisseau pour être en dessous des ennemis au moment du tir, évite les ennemis qui tombent près de lui.

Quand la partie est perdue (vaisseau détruit), le joueur clique le bouton `#restart` dans l'overlay `#overlay` — la même vague recommence avec le même pattern (même seed).

Le joueur peut aussi **inspecter l'état du jeu en direct** via console : `window.__game` expose positions, vies, vague, score pour audit externe.

## 3. CE QUE LE JOUEUR RESSENT

**Clarté immédiate** : chaque action (mouvement, tir, collision) a un feedback visuel/auditif instantané. Le joueur sait ce qu'il fait à chaque instant.

**Contrôle absolu** : le vaisseau obéit sans latence, sans surprise mécanique. Le joueur sent qu'il maîtrise — ses erreurs sont les siennes, pas celle du jeu.

**Progression mesurable** : le score monte à chaque ennemi détruit, le HUD montre combien en restent. Sensation d'avancer, de se rapprocher de la victoire.

**Équité d'apprentissage** : puisque le pattern est identique à chaque vague (déterministe), le joueur peut **apprendre et adapter** sa stratégie d'une tentative à l'autre, sans frustration d'aléa injuste.

**Petite victoire euphorique** : quand tous les ennemis disparaissent et l'écran passe au vert/victoire, satisfaction nette et envie d'une vague plus difficile.

## 4. RÈGLES OBSERVABLES

- **R1 — Le vaisseau se déplace horizontalement librement, jamais en dehors de l'arène** : limites visuelles fermes, aucune wrapping.

- **R2 — Un projectile qui touche un ennemi le détruit** : l'ennemi disparaît, l'explosion joue, le score augmente de 1 point.

- **R3 — Un ennemi qui touche le vaisseau inflige des dégâts** : le vaisseau perd une vie (ou une certaine quantité de santé), l'ennemi disparaît aussi, feedback rouge visuel.

- **R4 — Quand le vaisseau atteint zéro vie, la partie est perdue** : overlay game-over affiche le score, bouton `#restart` activé et clickable.

- **R5 — Chaque vague suit un pattern déterministe** : même seed d'initialisation = exactement les mêmes positions, trajectoires, timings des ennemis, chaque réexécution.

- **R6 — Quand tous les ennemis d'une vague sont détruits, la vague est complète** : overlay de victoire s'affiche (transparent par-dessus l'arène), HUD affiche "N/N destroyed", joueur peut passer à la vague suivante.

- **R7 — La solvabilité est mathématiquement garantie** : il existe au moins une séquence de mouvements et de tirs qui détruit tous les ennemis avant que l'un ne touche le vaisseau (proven by bot victory).

- **R8 — L'état du jeu est inspecté via `window.__game`** : objet exposé en JavaScript contient state, positions, ennemis vifs, santé du vaisseau, score — pour validation et audit déterministe.