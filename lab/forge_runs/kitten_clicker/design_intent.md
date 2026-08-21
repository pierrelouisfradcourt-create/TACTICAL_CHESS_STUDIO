# Kitten Clicker — design intent (Pierre, 2026-08-21)

reference_jeu : Cookie Clicker (boucle incrémentale / progression / paliers) + Neko Atsume (collection de chatons / attractivité / identité mignonne)
plateforme_cible : Godot 4.6.3 (desktop, fenêtre GPU)

## Demande
Produis un petit clicker de chatons mignons, jouable plusieurs heures, avec une boucle de
progression et une méta-progression cohérentes.

## Concept
Le joueur nourrit une colonie de chatons en cliquant sur une grosse pelote de laine /
pâtée / coussin central. Chaque action produit des ronrons.
CLICK → RONRONS → CHATONS → PRODUCTION AUTOMATIQUE → AMÉLIORATIONS → NOUVEAUX CHATONS /
LIEUX → META-PROGRESSION

## Ce que la Forge doit démontrer
- World Scan : boucle principale du genre clicker, conditions de progression, objectifs
  joueur, boucles de récompense, références visuelles, conventions du genre, risques de
  monotonie. Il doit produire explicitement : conditions_victoire, conditions_defaite,
  objectifs_joueur, progression, boucles_recompense — et ces informations doivent être
  CONSOMMÉES en aval, pas seulement présentes dans le document.
- Histoire / monde : refuge de chatons, personnages, lieux, objets, petites quêtes,
  descriptions assez précises pour générer les assets.
- Game Master : Grey Blocks — click, production, upgrades, déblocages, événements,
  quêtes, méta-progression, contraintes de jouabilité. Plusieurs compétences doivent être
  réellement reconnaissables, pas seulement déclarées.
- WireMap : réconcilie intention visuelle ↔ architecture technique ↔ données ↔ runtime Godot.
- Builder : réutilise les composants existants de la Forge quand ils sont compatibles.

## Ce que le run mesure
Que conditions de victoire/défaite, objectifs joueur, progression et contraintes
narratives produites en amont atteignent réellement les Grey Blocks, la WireMap, le
Builder et les oracles (sonde check_amont_traversal.mjs, advisory).
