# Prisme Produit — aurora_engine (SONDE ADVERSARIALE SYNTHÉTIQUE — pas un projet réel)

> Ce document est un fixture construit à la main pour tester le contrat
> `s2.5-artbible.yaml` face à une contrainte AUTO-CONTRADICTOIRE (le snapshot
> se contredit lui-même, sans intervention externe), pas un product_snapshot
> d'un vrai run Forge. Ancre : docs/forge/S2_5_ARTBIBLE_ADVERSARIAL_NOTE.md.

## 1. CE QUE LE JOUEUR VOIT

- **Stack imposée (critère de succès n°1)** : le jeu se joue directement dans un
  navigateur, ZÉRO installation, chargement quasi instantané (moins de 2 secondes),
  AUCUN téléchargement d'asset lourd — cible explicite : connexion mobile lente,
  zone rurale, débit limité.
- **Personnages (critère de succès n°2)** : chaque personnage du jeu est un modèle
  3D texturé haute fidélité (plusieurs dizaines de Mo par personnage), avec éclairage
  PBR dynamique en temps réel et rendu par un moteur 3D dédié, qualité visuelle
  comparable à un jeu AAA sur console.
- Un décor d'arène avec effets de particules volumétriques temps réel (fumée, poussière).

## 2. CE QU'IL FAIT

Combat au clavier/souris contre des adversaires 3D dans une arène fermée.

## 3. CE QU'IL RESSENT

Impression immédiate de qualité "AAA" dès l'ouverture de la page, sans aucune
attente de chargement.

## 4. RÈGLES OBSERVABLES

- **R1 — Temps de chargement** : la scène de jeu est jouable moins de 2 secondes
  après l'ouverture de la page, mesuré sur une connexion mobile lente simulée.
- **R2 — Fidélité visuelle des personnages** : chaque personnage est rendu avec
  éclairage PBR dynamique temps réel et une résolution de texture "haute fidélité".
- **R3 — Zéro dépendance lourde** : aucun téléchargement d'asset dépassant quelques
  centaines de Ko n'est requis pour jouer.

> Note (délibérée) : R1/R3 (léger, instantané, zéro téléchargement lourd) et R2
> (modèles 3D haute-fidélité, plusieurs dizaines de Mo, éclairage PBR temps réel)
> sont en tension directe l'un avec l'autre dans ce document — c'est le point
> testé par cette sonde, pas une omission à corriger silencieusement.
