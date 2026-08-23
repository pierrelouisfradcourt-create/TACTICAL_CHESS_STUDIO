# Kitten Clicker — Gameplay Loop & Content Contract V1.1b (Lot C.2, **RATIFIÉ Pierre 2026-08-23** — graine partagée Art ↔ GM du Lot F)
*V1.1b : 2ᵉ passe = 0 contradiction, 0 compteur ; §11.11-15 ferment les 4 questions de design restantes.*
*V1.1 : après test de reconstruction « scène » à contexte vierge (0 progression-compteur, 7 inventions, 3 contradictions) — jardin re-verrouillé (pas rétréci), exclusivité de la décision 1 précisée, preuve de P05 harmonisée, sonde + HumanGate par étape, layout du jardin, lucarne du grenier, §11 réponses.*
*Date : 2026-08-23 · Source : Fable, sur la correction Pierre après C.1/V2.1 (« assez de documentation économique, pas encore assez de
conception de jeu ») et sa vision : **construire progressivement un petit univers de chatons bienveillant, où chaque achat transforme
visiblement la scène et débloque de nouvelles possibilités de jeu, de collection et de progression.** L'économie est un MOYEN de faire
évoluer le monde, jamais le jeu lui-même. Aucun code. C.1 (progression) et V2.1 (nombres) seront RÉALIGNÉS sur ce contrat, pas l'inverse.*

## Règle maîtresse (contractuelle, non négociable)
```text
UNLOCK ≠ +X % d'un nombre.
UNLOCK = une possibilité PERCEPTIBLE : quelque chose de nouveau à VOIR (carte, objet, animation, chaton, skin)
         ET/OU à FAIRE (interaction, choix, capacité) — que le joueur n'avait pas l'instant d'avant.
Tout nombre qui monte sans rien changer à l'écran ni aux possibilités n'est pas une progression : c'est un compteur.
```
| Progression | INTERDIT (compteur) | EXIGÉ (possibilité perceptible) |
|---|---|---|
| Chaton | +0,5 R/s | un chaton sort du panier, s'installe, a un comportement propre (dort, joue, ronronne) |
| Jardin | ×1,5 | une nouvelle partie de la carte s'ouvre, avec ses emplacements et ses interactions |
| Objet | +10 % | un élément visible ET interactif (les chatons l'utilisent, le joueur peut cliquer dessus) |
| Amélioration | ×2 clic | une nouvelle façon de jouer avec les chatons (caresse longue, jouet lancé) |
| Compétence | +25 % | une capacité nouvelle (nourrir, appeler, brosser) |
| Prestige | reset | une nouvelle portée : nouvelle carte, nouveaux chatons, nouveaux objets, nouveaux skins |
| Niveau 2 | multiplicateur | nouvelle carte + nouvelle ressource + nouvelle décision |
| Rare | +X prod | un chaton unique, son animation, sa page d'album |

## 0. Le monde au départ (ce que le joueur voit AVANT le premier clic)
Une petite scène animée : un **refuge** (intérieur chaleureux), au centre un **panier** d'où dépasse une pelote de laine qui bouge
doucement, 1 **coussin** vide (= 1 emplacement), une fenêtre sur un jardin **fermé** (volets clos, grisé, « ? »), un panneau **album**
à 9 silhouettes « ? » (6 + 3 dorées). **Aucun chaton.** `hud.objectif` : « Accueille ton premier chaton » ; `hud.ensuite` : « Ensuite :
trouve-lui une place ». Le joueur comprend en 5 s : « je construis cet endroit et je fais apparaître des petits personnages ».

## 1. CORE LOOP — ce que le joueur fait toutes les secondes
```text
caresser la pelote (clic) → la pelote roule, un ronron monte (son), +1 ronron (hud.ronrons)
        → s'il y a des chatons : le plus proche lève la tête / miaule (réaction visible)
        → le clic suivant
```
Le clic n'est pas un bouton : c'est une caresse qui fait réagir le monde. Variante après l'amélioration « caresse longue » : maintenir
→ ronronnement continu + un chaton vient se frotter (nouvelle interaction, pas ×2).

## 2. PLAYER LOOP — ce qu'il cherche à accomplir en quelques minutes
```text
voir l'objectif (hud.objectif, en haut) → comprendre l'action (la seule affordance mise en évidence)
→ agir (caresser / accueillir / placer / aménager) → VOIR la scène changer → lire hud.ensuite → objectif suivant
```
Chaque objectif nomme une ACTION sur le monde (« Accueille », « Place », « Aménage », « Ouvre »), jamais un nombre à atteindre seul.

## 3. PROGRESSION LOOP — comment une étape ouvre la suivante (niveau 1, « Le refuge »)
| # | Objectif affiché | Action / affordance | Transformation VISIBLE de la scène | Possibilité nouvelle | Ce que mesure la Forge |
|---|---|---|---|---|---|
| P01 | « Accueille ton premier chaton » | caresser jusqu'au seuil (20 R) → `accueillir` | le panier s'ouvre, **un chaton en sort** (animation), s'assoit au centre | l'affordance `placer` apparaît | `appears:affordance` ; `hud.collection` 0→1 |
| P02 | « Trouve-lui une place » | `placer` → le coussin | le chaton va se coucher sur le coussin (animation), **le jardin se déverrouille visuellement** (volets s'entrouvrent, « Ouvre le jardin » lisible) | `ouvrir_jardin` apparaît (grisé avec coût) ; le coussin est occupé (1/1) | `hud.places` 1/1 ; `appears:affordance` |
| P03 | « Ouvre le jardin » | `ouvrir_jardin` (300 R) | **la carte s'agrandit** : le jardin devient visible (herbe, 3 emplacements de chatons vides, un arbre, 4 emplacements d'objets dédiés : banc, fleurs, jouet, niche — vides, discrets), un oiseau passe ; **la lucarne du grenier est visible au-dessus du jardin** (promesse, « ? ») | 3 emplacements ; `amenager` apparaît ; 2ᵉ chaton possible | `appears:lieu` ; `hud.places` +3 ; HumanGate 5 s |
| P04 | « Accueille un 2ᵉ chaton et place-le au jardin » | `accueillir` (60) → `placer` | 2ᵉ chaton, **autre robe**, va au jardin, **joue avec l'arbre** (comportement propre au lieu) | `decision_1` devient lisible : « Aménager le jardin ou apprendre la caresse longue ? » | `hud.collection` 2 ; `hud.taux` monte sans clic |
| P05 | DÉCISION 1 — « Aménage… ou apprends » | `amenager` (banc 60 R) **ou** `caresse_longue` (60 R) | A : **un banc apparaît**, un chaton s'y installe et dort (production passive : il ronronne en dormant) · B : **nouvelle interaction** : maintenir la pelote → un chaton vient se frotter, ronron continu | A ouvre les objets suivants (fleurs, jouet, niche) ; B ouvre « appeler » — exclusives AU SEUIL (60 R commun) : l'autre branche redevient achetable au seuil suivant, la décision est « laquelle d'abord », pas « laquelle pour toujours » | `decision:d_first_spend` (states_differ · futures_differ · nondominance A idle / B actif · objectifs différents) ; HumanGate 5 s |
| P06 | « Aménage le jardin » (fleurs 140, jouet 300) | `amenager` | **fleurs** (papillons), **jouet** (un chaton le poursuit : animation de course) ; chaque objet = un nouveau comportement visible | `niche` apparaît (600) ; 3ᵉ-4ᵉ chatons | `appears` objet (groupe `objet`) ; `hud.taux` |
| P07 | « Accueille 3 chatons de plus » | `accueillir` ×3 (140 · 300 · 600) | 3 robes différentes, chacune avec un comportement (grimpe, chasse les papillons, dort dans la niche) | `prestige` **apparaît** quand 5 chatons placés ET jardin ouvert | `appears:affordance` (prestige) |
| P08 | « Ton refuge est complet — une nouvelle portée t'attend » | `prestige` | **transformation** : les chatons partent (adoptés, animation de départ joyeuse), l'album se colore, **la carte change de saison** (portée 2 = printemps → été), un **grenier** apparaît fermé | voir §4 | `resets` ; `hud.coeurs` +1 ; `appears:lieu` (grenier fermé) ; HumanGate « envie de continuer ? » |

Preuves par défaut pour TOUTES les étapes (en plus de la colonne) : la **sonde** rejoue chaque step par les seules entrées du joueur (InputEvent
+ lecture des groupes `hud` / `affordance` / `lieu` / `objet`) ; le **HumanGate** juge la lisibilité de chaque écran en 5 s (« je sais quoi faire ? »)
et, au prestige, « ai-je envie de continuer ? ». Les Labels `hud.*` sont des MESURES : ils ne sont pas des progressions et ne sont pas soumis
à la règle maîtresse — une progression est ce qui apparaît ou change dans la scène, le HUD ne fait que le compter.

## 4. META LOOP — ce que le prestige transforme durablement
```text
RESET      ronrons 0 · chatons partis (adoptés : ils rejoignent l'album en couleur) · objets rangés (leurs silhouettes restent) · places 1 ·
           jardin RE-VERROUILLÉ : la carte ne rétrécit pas — le jardin reste visible, dans la nouvelle saison, volets clos et « ? » (état LOCKED)
CONSERVE   album (couleur) · cœurs (+1 : +25 % ronrons ET un ruban visible sur le panier) · le souvenir des objets (leurs silhouettes restent sur la carte)
TRANSFORME carte : nouvelle saison (couleurs, ciel, animations) · grenier (lieu 3, fermé, « ? ») · croquettes (le jardin en produit) ·
           3 chatons rares (silhouettes dorées actives) · skins : les chatons de la portée 2 ont un accessoire (ruban) — on VOIT qu'on en est à la 2ᵉ portée
RAISON     « Qu'est-ce qu'il y a derrière le grenier ? » + « Qui sont les trois dorés ? » — deux questions posées par la carte, pas par un texte
```
Portée 3 : album complet = écran « Refuge complet » ; pas de portées infinies (P0).

## 5. CONTENT LOOP — chaque progression produit du contenu (tableau d'exigence, par progression)
| Progression | Carte | Objet | Animation | Chaton | Skin | Interaction |
|---|---|---|---|---|---|---|
| chaton 1 | — | — | sortie du panier, assis | 1 (tabby) | — | le chaton réagit à la caresse |
| placer | coussin occupé | — | se couche, dort | — | — | cliquer un chaton endormi : il s'étire |
| jardin | **+ jardin** (herbe, arbre, 3 places, 4 emplacements d'objets) ; **lucarne du grenier visible « ? »** | — | oiseau, vent | — | — | `placer` au jardin |
| chaton 2 | — | — | joue avec l'arbre | 2 (gris) | — | — |
| décision A : banc | — | **banc** | un chaton dort sur le banc | — | — | — |
| décision B : caresse longue | — | — | un chaton vient se frotter | — | — | **maintenir** la pelote |
| fleurs | — | **fleurs** | papillons, un chaton les chasse | — | — | cliquer les fleurs : papillons s'envolent |
| jouet | — | **pelote-souris** | course d'un chaton | — | — | cliquer le jouet : le lancer |
| niche | — | **niche** | un chaton y dort la nuit (cycle jour/nuit léger) | — | — | — |
| chatons 3-5 | — | — | grimpe / chasse / dort | 3 (calico, tuxedo, siamois) | — | — |
| prestige | **saison suivante** ; grenier fermé | silhouettes des objets | départ joyeux ; album qui se colore | — | **ruban** (portée 2) | — |
| grenier (N2) | **+ grenier** (lieu 3, 3 places, lumière de lucarne) | — | poussière dans la lumière | — | — | — |
| croquettes (N2) | gamelle au jardin | **gamelle** | les chatons du jardin mangent | — | — | cliquer la gamelle : remplir |
| rare 1-3 (N2) | — | — | animation unique chacun | 3 dorés | — | page d'album |
Règle : une progression sans AU MOINS une case remplie dans ce tableau n'est pas une progression (elle ne passe pas le WireMap).

## 6. ECONOMY LOOP — l'économie comme moyen
```text
production (caresses + chatons qui ronronnent) → dépense (accueillir / ouvrir / aménager / apprendre)
→ TRANSFORMATION du monde (un chaton, un lieu, un objet, une interaction) → nouvelle capacité (le chaton produit, le lieu accueille,
l'objet anime, l'interaction rapporte) → nouvelle production → …
```
Invariants économiques = ceux de V2.1 (à réaligner sur les objets de ce contrat : le banc, les fleurs, le jouet, la niche REMPLACENT
les « améliorations » abstraites ; leurs coûts reprennent 60 · 140 · 300 · 600). Rien ne coûte sans transformer la scène.

## 7. SKILL / UPGRADE TREE — des possibilités, pas des multiplicateurs
```text
caresse (départ)
 ├── caresse longue (60)   → maintenir : ronron continu, un chaton vient se frotter      [actif]
 │     └── appeler (180)    → cliquer un lieu : les chatons s'y rassemblent (tous ronronnent)
 │           └── brosser (540) → cliquer un chaton : il ronronne ×2 pendant 10 s et un cœur flotte
 └── aménager (60, le banc) → objets : fleurs, jouet, niche                               [passif]
       └── nourrir (N2, gamelle) → croquettes : les chatons du jardin mangent → rares possibles
```
Chaque nœud = une interaction nouvelle OU un objet nouveau. Le multiplicateur est une CONSÉQUENCE (brosser ×2 pendant 10 s), jamais
le libellé.

## 8. ARTIST ↔ GM — l'échange (forme contractuelle, avant ET après le WireMap)
```text
GM → ART  (demande)
  id: garden · grey_block: LOCATION / PROGRESSION_GATE
  états requis: LOCKED (volets clos, « ? », raison visible « Place un chaton d'abord ») · AVAILABLE (volets entrouverts, coût lisible)
                · ACTIVE (ouvert, 3 emplacements, arbre) · FULL (3 chatons, animations de lieu)
  besoin joueur: « je comprends pourquoi je ne peux pas encore entrer, et ce que ça m'ouvrira »
  métrique/preuve: appears:lieu ; hud.places +3 ; HumanGate 5 s
ART → GM  (réponse)
  garden: états fournis LOCKED/AVAILABLE/ACTIVE/FULL · animations: oiseau, vent, chat qui joue avec l'arbre · limite: 3 emplacements ·
  contrainte: la lucarne du grenier est visible depuis le jardin dès la portée 1 (promesse)
GM vérifie: chaque état demandé existe, chaque animation correspond à un comportement du gameplay, la contrainte est intégrée
            (la promesse du grenier devient un objectif de portée 2)
```
Avant le WireMap : toutes les demandes ont une réponse et tous les gaps sont fermés (DESIGN FREEZE). Après le WireMap : l'Artiste vérifie
la cohérence visuelle, le GM la cohérence gameplay, chacun formule des demandes ciblées ; une réponse d'artefact ferme chaque demande.
Ici ce sont des ARTEFACTS (`artist_requirements` / `art_response`, Lot B) — pas une station nouvelle ; la boucle pré-WireMap est le
prochain lot d'architecture, à planifier séparément.

## 9. WIREMAP GATE — cinq questions, aucune WireMap sans les cinq réponses
Pour CHAQUE progression du §3 et du §5 : (1) qu'est-ce que le joueur FAIT ? (2) POURQUOI (objectif affiché) ? (3) qu'est-ce que ça
DÉBLOQUE (possibilité perceptible, case du §5) ? (4) qu'est-ce que le joueur VOIT (état visuel, animation) ? (5) qu'est-ce que le
SYSTÈME MESURE (hud/appears/sonde/HumanGate) ? Une progression à moins de 5 réponses ne passe pas.

## 11. Réponses aux questions du test de reconstruction (V1.1)
1. Jardin après prestige : RE-VERROUILLÉ, visible, saison nouvelle, volets clos « ? » — la carte n'oublie jamais ce qu'elle a été.
2. Décision 1 : exclusive AU SEUIL seulement ; l'autre branche revient au seuil suivant (« laquelle d'abord »).
3. Layout du jardin : 3 emplacements de chatons + 4 emplacements d'objets dédiés (banc, fleurs, jouet, niche), positions fixes, pas de concurrence d'espace.
4. `hud.*` = mesures, hors règle maîtresse (voir note avant §4).
5. Preuve des décisions harmonisée : `decision:<id>` avec ses 4 critères nommés.
6. Sonde + HumanGate 5 s sur TOUTES les étapes (note avant §4) ; HumanGate « envie de continuer » au prestige.
7. Cycle jour/nuit : GLOBAL et léger (lumière de toute la scène, ~2 min par cycle), introduit avec la niche (on le remarque parce qu'un chaton y dort la nuit).
8. Chatons rares : aucun hasard — condition = 400 R + 30 C chacun, disponibles dès la portée 2, adoptés un par un.
9. Échelle de prix partagée VOLONTAIREMENT par deux familles (chatons 20·60·140·300·600 ; objets banc 60 · fleurs 140 · jouet 300 · niche 600) : le joueur apprend UNE échelle, et chaque palier met un chaton et un objet en concurrence (c'est la décision récurrente).
10. Lucarne du grenier : ajoutée à P03 (promesse visible dès l'ouverture du jardin).
11. (2ᵉ passe) Objets de P06 (fleurs, jouet, niche) : achats LIBRES et séquentiels, non exclusifs — seules les décisions AU SEUIL (`decision_1`, `decision_2`) sont exclusives.
12. Portée 3 : aucun contenu nouveau, par design (P0 : pas de « plusieurs heures ») ; objectif = finir l'album ; écran « Refuge complet ».
13. `nourrir` = la gamelle, objet de la portée 2 : 140 R ; production 0,2 C/s par chaton placé au jardin (valeur V2.1) ; les rares coûtent 400 R + 30 C.
14. Une décision non résolue ne bloque rien : la core loop continue, la production continue ; seul `hud.objectif` rappelle le choix.
15. Hors périmètre de ce contrat (volontairement) : positions en pixels, palette, durées d'animation (Art Bible / Artiste), implémentation de la sonde et procédure du HumanGate (chaîne Forge).

## 10. Ce qui change par rapport à C.1 / V2.1 (à réaligner après ratification)
- Les « améliorations » abstraites (clic ×2) deviennent des OBJETS et des INTERACTIONS (§7) ; les coûts V2.1 sont conservés.
- Les 6 chatons décoratifs disparaissent ; le départ = panier + coussin + jardin fermé + album de silhouettes.
- La carte porte des ÉTATS (fermé / disponible / actif / plein ; saison par portée) : elle est un système de progression.
- Chaque step de C.1 gagne une colonne « transformation visible » et une case du §5 ; `appears` porte aussi sur les groupes `objet` et `lieu`.
- Test de reconstruction (§7 de C.1) étendu : un agent vierge doit pouvoir décrire la SCÈNE à chaque étape, pas seulement les nombres.
