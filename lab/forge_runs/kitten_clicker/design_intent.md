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

## Direction produit V1 — ratifiée Pierre 2026-08-23 (après HumanGate FAIL du run 9)
Source : studio_brain/gamedesign/kitten_clicker_direction_produit_v1.md. Le build du run 9 est la BASELINE PRODUIT
(prototype mécanique avec habillage). Quatre causes à corriger, dans le produit : chatons décoratifs · prestige = bouton ·
espace pauvre · guidage illisible. Décisions ratifiées :
1. Les chatons non gagnés n'apparaissent QUE sous forme de silhouettes « ? » dans un album ; la scène ne montre que ce qui est
   réellement débloqué (aucun chaton visible au départ).
2. NIVEAU 1 = possibilités nouvelles : pelote → ronrons → ADOPTER (le chaton occupe une place) → l'affordance « placer »
   apparaît → acheter une PLACE → OUVRIR LE JARDIN (+3 places, ×1,5 pour les chatons qui y sont) → 5 chatons placés + jardin
   ouvert ⇒ l'affordance PRESTIGE apparaît (elle n'existe pas avant).
3. PRESTIGE (« nouvelle portée ») = reset observable (ronrons 0, chatons retirés, places 1, lieux refuge seul, améliorations 0)
   + album conservé + cœurs : +1 par portée, chaque cœur = +25 % ronrons (clic ET production), lisible dans le HUD + la partie
   suivante est différente (grenier achetable, chatons rares adoptables).
4. NIVEAU 2 (portée ≥ 2) = nouvelle ressource CROQUETTES (produites par le jardin seulement) + nouvelle décision : développer le
   JARDIN (croquettes → chatons rares) OU le GRENIER (+places, ronrons ×1,5), non achetables ensemble au seuil courant.
5. ESPACE = règle lisible : HUD `places` (occupées/totales) ; « impossible d'adopter » affiche sa raison ET la possibilité qui
   la lève (ouvrir un lieu) ; chaque chaton est un nœud placé dans un lieu.
6. GUIDAGE = hiérarchie OBJECTIF (en haut, plus grande police, contraste maximal) → ACTION (seule affordance mise en
   évidence) → CONSÉQUENCE (coût ET effet sous chaque bouton, sans chevauchement) → PROCHAINE POSSIBILITÉ (« Ensuite : … »).
Mesure inchangée (loop.json A→J + DECISION, sondes, gates). Ce que le bot mesure : la décision du niveau 1 ; ce que seul le
HumanGate mesure (P5) : « après le premier prestige, ai-je spontanément envie de continuer ? ».

