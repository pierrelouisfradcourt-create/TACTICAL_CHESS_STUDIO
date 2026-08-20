# Prisme Produit — voxel_frontier (SONDE ADVERSARIALE SYNTHÉTIQUE — pas un projet réel)

> Ce document est un fixture construit à la main pour tester le contrat
> `s2.5-artbible.yaml` sous ambiguïté (assets partiels + génération procédurale),
> pas un product_snapshot d'un vrai run Forge. Ancre : docs/forge/S2_5_ARTBIBLE_ADVERSARIAL_NOTE.md.

## 1. CE QUE LE JOUEUR VOIT

Un jeu de survie vu de dessus (top-down), sur un canvas HTML5 plein écran.

- **Le terrain** (herbe, sable, eau peu profonde, roche) est généré procéduralement au
  runtime par un bruit seedé et dessiné en aplats de couleur via primitives canvas
  (`fillRect`) — AUCUNE tuile ni texture externe n'est chargée pour le terrain, à
  aucun moment. Même seed => même disposition de terrain (déterminisme).
- **Le personnage joueur** est un sprite animé (4 directions de marche) qui doit
  rester lisible quel que soit le terrain généré dessous.
- **Des créatures ennemies** : au moins 2 types visuellement distincts (un type
  terrestre lent, un type aérien rapide), chacune avec son propre sprite reconnaissable.
- **Un HUD d'inventaire** affiche une icône par type d'objet ramassé. Le nombre total
  de types d'objets ramassables n'est pas encore fixé pour cette itération (peut
  évoluer au fil du développement).

## 2. CE QU'IL FAIT

Il déplace son personnage au clavier (haut/bas/gauche/droite) sur le terrain généré,
évite ou combat les créatures, ramasse des objets qui alimentent son inventaire.

## 3. CE QU'IL RESSENT

Exploration libre sur un terrain jamais identique d'une seed à l'autre, mais lisible
et cohérent ; clarté immédiate entre "ce qui est décor" (terrain procédural, jamais
un obstacle d'interaction directe) et "ce qui compte" (personnage, créatures, objets).

## 4. RÈGLES OBSERVABLES

- **R1 — Terrain déterministe** : à seed identique, la génération procédurale du
  terrain produit une disposition strictement identique (positions des biomes).
- **R2 — Lisibilité du personnage** : le sprite du personnage joueur reste identifiable
  par un contraste garanti face à n'importe quelle couleur de terrain généré.
- **R3 — Distinction des créatures** : les 2 types de créature sont visuellement
  distincts l'un de l'autre (silhouette et palette propres à chaque type).
- **R4 — Icônes d'inventaire cohérentes** : chaque type d'objet ramassé affiche une
  icône stable (la même icône à chaque apparition de ce type d'objet dans l'inventaire).
