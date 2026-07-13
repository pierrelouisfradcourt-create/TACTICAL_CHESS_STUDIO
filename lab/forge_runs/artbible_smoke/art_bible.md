---
styles: [flat-arcade, flat-ui]
mood_keywords: [kinetic, bright, readable, playful, snappy]
---

# Art Bible — Collect Runner

## 1. IDENTITÉ VISUELLE

Collect Runner est un runner 2D à défilement latéral (vue de profil, gauche → droite)
jouable au clavier dans un canvas HTML5. Son identité visuelle repose sur un unique
langage cohérent, le style **flat-arcade** : formes vectorielles plates, aplats de
couleur saturés, silhouettes épaisses et lisibles à pleine vitesse, contours nets sans
dégradé complexe. Le personnage, les pièces à collecter et les obstacles partagent cette
grammaire — même épaisseur de trait, même palette chaude/saturée — pour que l'œil
distingue instantanément « ramassable » (pièces, teintes or/jaune lumineux) de
« mortel » (obstacles, teintes rouge/orange saturé) pendant que le décor défile. Le sol
et l'arrière-plan restent volontairement sobres (aplats désaturés, faible détail) pour ne
jamais concurrencer les éléments d'action au premier plan.

La couche interface — compteur de pièces, écrans de victoire et de défaite — suit un
sous-style dédié **flat-ui** : pictogrammes plats à fort contraste, cohérents avec le
monde mais posés sur des panneaux neutres, pensés pour la lisibilité immédiate d'un état
(score qui monte, victoire, sanction). Palette de référence : or/jaune lumineux
(collecte), rouge/orange saturé (danger), bleu-nuit désaturé (fond), blanc cassé
(interface et compteur).

## 2. RATIONALE

Chaque choix découle directement du product_snapshot (s1). Le snapshot impose une lecture
instantanée sous contrainte de temps : « satisfaction immédiate et lisible à chaque pièce
ramassée » et « sanction claire et immédiate au contact d'un obstacle, pas d'ambiguïté sur
la cause de la défaite ». Le style flat-arcade sert exactement cet objectif — des aplats
saturés à haut contraste et des silhouettes épaisses restent déchiffrables à la vitesse de
défilement automatique, là où un rendu détaillé ou texturé brouillerait la décision
gauche/droite/saut. Le codage couleur (or = collecte, rouge = danger) matérialise
visuellement la dichotomie mécanique R7 (collecte) vs R8 (collision → défaite) sans texte.

Le choix d'une vue de profil plate — et non d'un rendu vu de dessus — est dicté par la
mécanique du snapshot : avance latérale continue, saut avec gravité et retombée au sol
(R1, R4, R6). Une perspective de profil est la seule qui rende lisibles un saut et une
hauteur de pièce ; c'est pourquoi l'identité NE réutilise PAS le langage top-down, même
lorsqu'il existe déjà dans le catalogue — la cohérence perspective/mécanique prime sur la
disponibilité. Le sous-style flat-ui isole la couche HUD (compteur temps réel, écrans
victoire/défaite du snapshot) pour qu'un changement d'état soit signalé sans rompre la
lisibilité du terrain de jeu. Conformité esthétique finale des assets : non évaluée ici
(jugement Pierre requis — la résolution mécanique compare des tags, pas des pixels).
