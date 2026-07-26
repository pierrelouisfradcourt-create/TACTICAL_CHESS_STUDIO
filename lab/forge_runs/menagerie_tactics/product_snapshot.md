# Prisme Produit — Menagerie Tactics (s1)

Produit fini : un tactical-RPG de collection jouable dans le navigateur. Le joueur voit une grille 8×8 peuplée de bêtes (les siennes et l'ennemi), déplace ses bêtes tour par tour, exploite un cycle de 6 types, et — le cœur du jeu — **capture** des bêtes ennemies affaiblies en les encerclant. Une bataille se gagne quand l'ennemi n'a plus de bête active ; les bêtes KO ne meurent pas, elles reviennent cicatrisées.

## Voit
- Une grille 8×8 avec du terrain (cases normales, forêt, mur infranchissable).
- Ses bêtes (couleur alliée) et les bêtes ennemies (couleur adverse), chacune avec type, PV, et un liseré si elle est cicatrisée.
- La bête active du tour (surbrillance) et, quand elle est sélectionnée, ses cases de déplacement atteignables et ses cibles à portée.
- Les **zones de menace** ennemies (cases où une bête adverse peut frapper ce tour).
- Un indicateur de **capture en cours** sur une bête ennemie affaiblie encerclée.
- Un HUD : nombre de bêtes actives par camp, tour courant, nombre de captures réalisées.
- Un overlay de fin (VICTOIRE / DÉFAITE) avec un bouton Rejouer.

## Fait
- Sélectionne une de ses bêtes (clic), la déplace d'au plus sa portée de mouvement (clic sur une case atteignable).
- Attaque une bête ennemie à portée ; le résultat dépend du cycle de types et du terrain.
- Choisit d'**achever** un ennemi (sûr) ou de l'**affaiblir puis encercler** pour le capturer (risqué mais agrandit la meute).
- Termine son tour ; l'ennemi joue en réponse (IA déterministe).
- Rejoue une bataille (même seed => même bataille) ou une nouvelle (seed aléatoire).

## Ressent
- La tension du positionnement : encercler pour capturer expose ses propres bêtes.
- Le dilemme récurrent tuer-vs-capturer à chaque ennemi affaibli.
- Le poids d'un KO — pas une perte définitive, mais une cicatrice qui compte.
- La lisibilité immédiate du cycle de 6 types (avantage/désavantage clair).

## Règles observables
Correspondance 1:1 avec `wiremap.json` (une feature par règle R1..R13). Chaque règle est vérifiable par assertion mécanique sur le moteur pur.

1. **R1 — Grille & occupation** : le plateau est une grille 8×8 ; `cellOccupied(x,y)` est vrai ssi une bête active occupe (x,y) ; deux bêtes ne partagent jamais une case.
2. **R2 — Initiative par vitesse** : `turnOrder()` retourne les bêtes actives triées par vitesse décroissante, tie-break déterministe par identifiant croissant.
3. **R3 — Déplacement borné** : `moveBeast(beast, x, y)` réussit ssi la case cible est libre, non-mur, et à distance de Manhattan ≤ `beast.move` ; sinon la position ne change pas.
4. **R4 — Portée d'attaque** : `canAttack(attacker, target)` est vrai ssi `target` est une bête ennemie active à distance de Manhattan ≤ `attacker.range`.
5. **R5 — Cycle de types (6)** : `typeMultiplier(atk, def)` vaut 1.5 si `atk` bat `def` dans le cycle Braise→Ronce→Roche→Onde→Foudre→Givre→Braise, 0.5 si `atk` est battu, 1 sinon.
6. **R6 — Dégâts & PV plancher** : `computeDamage(attacker, target)` = `max(1, floor(attaque × multiplicateur de type))` après terrain ; les PV de la cible ne descendent jamais sous 0.
7. **R7 — KO → cicatrice (pas mort)** : `knockOut(beast)` retire la bête du combat (active=false) et la marque `scarred=true` ; elle n'est jamais supprimée de la collection.
8. **R8 — Terrain défensif** : `terrainMitigation(x,y,dmg)` réduit les dégâts de 1 (plancher 1) si (x,y) est une forêt ; une case mur est infranchissable au déplacement (R3).
9. **R9 — Zone de menace** : `threatenedCells(side)` retourne l'ensemble des cases qu'au moins une bête active du camp `side` peut atteindre-et-attaquer ce tour (portée move+range).
10. **R10 — Capture par encerclement** : `resolveCapture()` capture une bête ennemie ssi ses PV sont < `captureThreshold` ET elle est encerclée par ≥2 bêtes alliées orthogonalement adjacentes ET elle l'était déjà à la résolution précédente (tenue un tour). Une bête capturée rejoint la meute alliée.
11. **R11 — Victoire** : `checkVictory()` est vrai ssi aucune bête ennemie n'est active (toutes KO ou capturées).
12. **R12 — Défaite** : `checkDefeat()` est vrai ssi aucune bête alliée n'est active (toutes KO).
13. **R13 — Génération seedée déterministe** : `generateBattle(battleNumber, seed)` produit la disposition initiale (positions, types, vitesses, terrain) de façon déterministe : même seed => bataille identique.
