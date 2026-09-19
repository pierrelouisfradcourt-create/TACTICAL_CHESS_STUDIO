# DIRECTION ARTISTIQUE — LE DOMAINE QUI GRANDIT (tableau vivant, âges 0 → 4)
Date : 2026-09-18. Source : orchestrateur, sur exigence de Pierre (« un superbe château complet qui fait rêver,
tours, murailles, soldats, forgeron et magasins dans les murs, pont-levis, et de la hauteur avec les niveaux »).
Statut : proposition d'implémentation. Rien n'est ratifié. Rendu : Canvas 2D, aucune bibliothèque, entiers,
déterministe (aucune valeur tirée au hasard à l'affichage : tout dérive de l'état et de l'heure simulée).

## 0. Le principe qui commande tout
Une seule scène sert trois usages : écran d'accueil, vignette widget (160 px), plus tard fond d'écran animé.
Elle doit donc être **lisible à trois distances**. On ne dessine pas « un château », on dessine une SILHOUETTE
qui se complexifie. Test d'acceptation : réduite à 160 px de large et floutée, la scène doit rester
identifiable en moins d'une seconde, et son âge reconnaissable.

## 1. Caméra : le domaine s'étend, la silhouette monte
Repère logique 800 × 460. La caméra recule par palier d'âge pour laisser le ciel s'ouvrir.
| Âge | Nom | Zoom | Ligne de sol (y) | Ciel disponible | Hauteur max de silhouette |
|---|---|---|---|---|---|
| 0 | Campement | 100 | 300 | 300 | 60 |
| 1 | Hameau | 94 | 315 | 315 | 90 |
| 2 | Bourg | 86 | 330 | 330 | 140 |
| 3 | Ville fortifiée | 78 | 345 | 345 | 210 |
| 4 | Château | 70 | 360 | 360 | 300 |
Zoom en centièmes, appliqué aux coordonnées de dessin (entiers, division par 100). Au passage d'âge, la caméra
glisse vers sa nouvelle valeur en 1 200 ms, courbe d'accélération simple, instantané sous prefers-reduced-motion.

## 2. Les bâtiments entrent dans les murs
Chaque bâtiment possède TROIS ancrages, et son ancrage effectif dépend de l'âge :
* `plain` (âges 0-1) : dispersé en plaine, comme aujourd'hui.
* `near` (âge 2) : resserré autour du hall, derrière la palissade.
* `court` (âges 3-4) : en cour, à l'intérieur de l'enceinte, adossé aux courtines.
Au passage d'âge, chaque bâtiment glisse de son ancien ancrage au nouveau pendant la même seconde que la caméra :
**on voit le village se resserrer et les murs se refermer sur lui.** C'est le moment le plus important du jeu,
il mérite ses 1 200 ms.
Disposition de cour (âge 4), enceinte 520 × 260 centrée : donjon au fond centre · forge à gauche avec sa cheminée
contre la courtine · taverne à droite de la porte (lanternes) · marché en halle ouverte le long du mur sud ·
entrepôt adossé au mur nord · infirmerie près de la chapelle · chapelle contre la tour est. Les quartiers
personnels des amis sortent hors les murs, en faubourg, reliés par la route.

## 3. Verticalité : la hauteur raconte le niveau
Hauteur d'un bâtiment = `base + niveau × pas` (unités logiques, entiers).
| Élément | base | pas | âge 4, niveau 4 |
|---|---|---|---|
| Donjon (hall) | 40 | 26 | 144 + flèche 40 + bannière 18 |
| Tour d'angle | 30 | 18 | 102, toit conique 22 |
| Tours de porte (×2) | 26 | 14 | 82, mâchicoulis |
| Courtine | 22 | 6 | 46, créneaux 8 |
| Forge | 18 | 8 | 50 + cheminée 26 (fumée) |
| Autres bâtiments | 16 | 6 | 40, toits variés |
Règle de composition : le donjon est toujours le point le plus haut, les tours d'angle à 70 % de sa hauteur, les
bâtiments de cour sous la ligne des créneaux. Un bâtiment qui dépasserait est plafonné. La silhouette totale
grandit de 60 à 300 unités entre le premier et le dernier jour : c'est le trophée des trente jours.

## 4. L'enceinte, la porte, le pont-levis
* Âge 2 : palissade de pieux, porte simple, deux gardes.
* Âge 3 : courtine de pierre, créneaux, deux tours de porte, chemin de ronde praticable, quatre soldats.
* Âge 4 : enceinte fermée, quatre tours d'angle, corps de garde, **douve** (bande d'eau de 26 unités) et
  **pont-levis** : abaissé de 8 h à 20 h (heure simulée), relevé la nuit, bascule animée en 1 500 ms avec deux
  chaînes visibles au niveau de détail le plus fin. Les héros qui partent en expédition le franchissent.
* Bannière de guilde sur le donjon ; une bannière de trophée sur le corps de garde par dragon abattu (5 max).

## 5. Les soldats
Nombre = gardes de l'âge (0, 0, 2, 4, 6). Deux rôles : faction (immobiles de part et d'autre de la porte, lance
verticale) et ronde (le long du chemin de ronde). Position d'un soldat de ronde = fonction entière de l'heure
simulée et de son index, donc identique sur tous les téléphones. Aux niveaux de détail réduits, ils deviennent
des points de 3 px, puis disparaissent : ils ne portent aucune information de jeu, seulement de la vie.

## 6. Trois niveaux de détail
| Niveau | Largeur | Ce qui est dessiné |
|---|---|---|
| LOD 2 | < 220 px (widget) | silhouette pleine, douve, porte, bannière, fenêtres allumées la nuit. Rien d'autre. |
| LOD 1 | 220 → 700 px (mobile) | + toits, créneaux, pont-levis, figurines des héros, soldats en points, fumée statique |
| LOD 0 | ≥ 700 px (bureau) | + pierres, mâchicoulis, reflets de douve, chaînes, halos de torches, rondes animées, étincelles de forge |
La silhouette est la MÊME aux trois niveaux : on ajoute du détail, on ne change jamais la forme. C'est ce qui
rend la vignette fidèle à l'écran.

## 7. Jour, nuit, saisons de la partie
**Mise à jour 2026-09-19 — LE SOLEIL COMPTE LES JOUEURS (demande de Pierre).** Le soleil n'est plus piloté par
l'heure seule : **sa course EST l'avancement du tour de table**. La scène porte le compteur sans qu'on lise un mot.

* **La règle.** `t = joueurs ayant joué / joueurs de la guilde` (mon héros compris). `t = 0` → aube rasante à
  l'est ; `t = 1` → soleil couchant à l'ouest ; la résolution du soir bascule la scène à la nuit. L'heure
  affichée dans la pastille suit la même valeur : `heure = 8 + 12 t`, donc 8 h → 20 h, une heure lisible.
  À cinq joueurs : 0/5 = 8 h · 1/5 = 10 h 24 · 2/5 = 12 h 48 · 3/5 = 15 h 12 · 4/5 = 17 h 36 · 5/5 = 20 h.
* **Le jour t'attend.** Tant que MON héros n'a pas joué, la course est retenue au seuil bas `SUN_HOLD = 0,8`
  (17 h 36, marge nette au-dessus de l'horizon) : le soleil s'y arrête et y reste, un halo respire sous lui
  (immobile sous `prefers-reduced-motion`) et la pastille dit « le jour attend » au lieu d'une heure figée.
  Dès que je joue, la course s'achève et le soir peut tomber.
* **L'horloge simulée garde un seul rôle** : révéler les amis à leur heure déterministe
  (`8 h + fnv1a(graine:jour:manager) % 12`). C'est la révélation qui fait avancer le compteur, donc le soleil.
  « Passer » révèle tout le monde d'un coup ; le soleil rejoint sa position finale **en glissant** (900 ms,
  instantané sous `prefers-reduced-motion`).
* **La course.** Arc d'est en ouest, `x` de 212 à 676 (dégagé de la montagne et du donjon lointain), hauteur
  `hz − (0,2 hz + 16) − sin(π t) × 0,52 hz`, où `hz` est la ligne d'horizon de la caméra de l'âge : la garde
  au-dessus de l'horizon reste proportionnelle quand la caméra recule. Les nuages se tiennent hors de cet arc et
  le dragon des jours d'attaque tourne sous lui : rien ne voile le compteur.
* **Tout suit cette valeur** : gamme du ciel (aube froide, plein jour, soir doré à 20 h, nuit bleue), direction
  ET longueur des ombres portées, lumière rasante sur la face des tours et des courtines, fenêtres en or,
  torches, pont-levis, position des soldats de ronde. Un ami qui joue fait bouger la lumière sur le château.
* **Trois distances, un seul soleil.** L'aperçu widget et les trois niveaux de détail rendent la même course, à
  la même position relative ; à la vignette (LOD 2) le disque est dessiné un tiers plus gros pour que la HAUTEUR
  du soleil reste lisible à 160 px.
* Le texte « N / 5 ont joué » reste, mais en confirmation : la source d'information est le ciel.

La nuit, fenêtres en or, torches aux tours, forge rougeoyante si une commande est en cours,
douve sombre. Les jours de dragon, le ciel prend la teinte du biome et la silhouette se découpe en contre-jour.
Jour noir après un ravage : un bâtiment brûlé garde sa cicatrice jusqu'à sa reconstruction.

## 8. Chantiers visibles
Le bâtiment en travaux porte un échafaudage dont la hauteur suit l'avancement, une grue au-delà du niveau 3, et
des ouvriers aux heures ouvrées. C'est la promesse tenue : on voit ce que la guilde a décidé hier.

## 9. Preuve mécanique attendue
`ui_chateau_check.mjs` : les cinq âges rendus et capturés ; hauteur mesurée de la silhouette croissante et
conforme au tableau du §3 ; bâtiments effectivement à l'intérieur de l'enceinte aux âges 3 et 4 (test de
contenance des boîtes) ; pont-levis abaissé à 12 h et relevé à 23 h ; nombre de soldats = gardes de l'âge ;
scène identique à deux exécutions (déterminisme) ; lisible à 400 px et à 160 px sans débordement ;
aucune erreur console en thème clair et sombre ; silhouette identique entre les trois niveaux de détail.
`ui_soleil_check.mjs` (2026-09-19) : la course du soleil EST le tour de table — aube à l'est quand personne n'a
joué, avancement (`t`, `x`, heure) strictement croissant à chaque joueur révélé, arc dont la hauteur monte puis
descend, course retenue au seuil bas tant que mon héros n'a pas joué (pastille « le jour attend »), course
achevée dès qu'il joue, « Passer » qui glisse au lieu de sauter, ombres qui tournent et s'allongent, gamme du
ciel, lumière rasante et lampes qui suivent la même valeur, vignette 160 px mesurée dans les pixels au même
endroit que la grande scène, deux chargements identiques au pixel près.
Gate fun, réservé à Pierre : au jour 30, la capture du château donne-t-elle envie de la montrer à quelqu'un ?
