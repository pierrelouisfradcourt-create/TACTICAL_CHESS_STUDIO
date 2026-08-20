---
styles: [flat-primitive, hud-flat]
mood_keywords: [readable, deterministic, focused, snappy, clean]
---

# Art Bible — Casse-briques (breakout)

## 1. IDENTITÉ VISUELLE

Breakout est un casse-briques HTML5 en canvas plein écran, piloté au clavier, dont TOUT
le rendu est produit par des **primitives canvas** (`fillRect` pour les rectangles,
`arc` pour la balle) — aucun octet d'asset externe, aucune texture, aucune image. Son
identité visuelle est donc un langage de **formes géométriques pures**, désigné ici
**flat-primitive** : aplats de couleur unis, contours nets sans dégradé ni ombre portée,
silhouettes strictement rectangulaires (raquette, briques, murs) plus un unique disque
(la balle). La grammaire est minimale et fonctionnelle : chaque forme = un rôle
mécanique unique, jamais décoratif.

Palette de référence, choisie pour la lisibilité immédiate exigée par le snapshot :
fond bleu-nuit très sombre (aire de jeu neutre, ne concurrence jamais l'action) ;
raquette blanc cassé (l'objet piloté, le plus contrasté au bas de l'écran) ; balle blanc
pur (le mobile à suivre en permanence) ; briques réparties sur une rampe de teintes
saturées **codant leur rangée / valeur** (ex. rouge et orange en haut = valeur haute,
jaune et vert vers le bas), de sorte que la position dans le mur soit lisible à l'instant.
Le codage couleur est un signal, pas un ornement : deux briques de valeur différente ne
partagent jamais la même teinte.

La couche HUD (vies, score, numéro de niveau, briques restantes) et l'overlay
(`#overlay` : VICTOIRE / DÉFAITE / PAUSE, trois libellés distincts) suivent un sous-langage
**hud-flat** : texte et panneaux plats à fort contraste sur le fond sombre, sans habillage
graphique, pensés pour qu'un changement d'état (fin de partie, pause) soit lu sans
ambiguïté. Rien n'est dessiné qui ne corresponde à un état lu dans `window.__game_debug` :
le rendu lit l'état, il ne l'invente jamais.

## 2. RATIONALE

Chaque choix découle directement du product_snapshot (étape 1) et de sa contrainte de
charter la plus structurante : « HTML5 canvas [...] aucun asset externe : tout est dessiné
en primitives canvas — rectangles et arcs » (§1) et « sans dépendance externe, sans temps
de chargement d'assets » (§3). L'identité ne PEUT donc pas reposer sur des sprites ou des
textures — elle est, par construction, un langage de formes primitives. C'est pourquoi ce
run déclare `no_assets_needed: true` : il n'existe aucun besoin visuel qui exige de
résoudre un asset dans le catalogue. Ce n'est pas une absence d'identité visuelle, c'est
une identité visuelle **entièrement primitive**, spécifiée ici en termes de formes, de
palette et de rôles.

Le codage couleur des briques par rangée sert la mécanique observable du snapshot : la
victoire de niveau est conditionnée au comptage strict des briques cassables restantes
(R13) et le score augmente d'une valeur déterministe par brique (R8) ; donner à chaque
rang une teinte propre rend ce comptage et cette hiérarchie de valeur lisibles sans texte.
Le contraste maximal raquette/balle sur fond sombre sert le ressenti « contrôle et
responsabilité » et « lisibilité immédiate » du snapshot (§3) : le joueur doit suivre la
balle et sa raquette en permanence, sans jamais les perdre. Le sous-langage hud-flat isole
les états de fin et la pause (R16) pour qu'ils soient signalés sans rompre la lisibilité de
l'aire de jeu. Aucune conformité esthétique n'est certifiée ici : la palette et les formes
sont un cadre de direction artistique, dont le rendu final relève du jugement de Pierre
(la résolution mécanique compare des tags, pas des pixels) — et ici, aucun asset n'étant
demandé, il n'y a même pas de tag d'asset à résoudre.
