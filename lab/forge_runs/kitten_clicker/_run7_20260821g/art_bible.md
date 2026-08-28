---
styles: [flat-cute-svg, cozy-pastel]
mood_keywords: [mignon, chaleureux, cosy, pastel, doux, lisible, arrondi, rassurant, zen]
---

## 1. IDENTITÉ VISUELLE

**Style directeur : `flat-cute-svg`** — aplat vectoriel mignon, formes arrondies, contour doux,
zéro texture bruitée. Tout est dessiné en **SVG** (primitives simples : cercles, ellipses,
rectangles arrondis, quelques courbes), car le studio n'a **aucun générateur d'images 2D** : le
builder écrit lui-même chaque fichier `04_ASSETS/sprites/<id>.svg`, importé par Godot 4 comme
texture. La contrainte de production est donc *dessinable en primitives* — chaque asset ci-dessous
est décrit en formes géométriques, jamais en pixel-art, jamais en photo.

**Palette `cozy-pastel`** (chaleureuse, faible contraste agressif, aucune couleur alarmante — le
product_snapshot §3 impose « doux et zen, pas d'alarme, pas de menace ») :
- Fond / refuge : crème `#FFF3E0`, bois clair `#E8C9A0`, tapis `#F4B9B0`.
- Chatons (robes de base) : roux `#F0A860`, gris-bleu `#B8C0C8`, crème `#FBE7C6`,
  noir doux `#4A4A55`, siamois `#EAD9C0` + points chocolat `#8A6B52`.
- Accents chaleureux : ronron/laine `#F49AC1` (rose laine), UI menthe `#A8D8C8`.
- Or de rareté légendaire : `#FFD24C` avec halo `#FFE9A8`.
Aucun rouge vif ni forme acérée : rien à l'écran ne doit évoquer le danger (il n'existe aucun
état de défaite, R16).

**Lisibilité 640×480 — règle dure de cadrage.** Le jeu tourne en 640×480. Chaque entité doit
rester lisible à cette résolution : silhouette pleine reconnaissable en un coup d'œil, trait de
contour ≥ 2 px à l'échelle d'affichage, aucun détail plus fin que ~4 px, un chaton occupe une
boîte d'au moins ~48×48 px à l'écran, la pelote centrale ~120 px. La mignonnerie passe par la
**forme** (grosse tête, grands yeux, corps rond), pas par la densité de détail.

**Langage de rareté (lecture « à l'œil », R6).** R6 exige ≥6 chatons nommés, chacun avec une
identité visuelle distincte *selon sa rareté*, reconnaissable sans lire de texte. La rareté se lit
par **deux** signaux cumulés : (a) une robe/couleur propre à chaque chaton, (b) un cadre/halo
partagé (`rarity_frame_set`) posé derrière le chaton :
- `common` → cadre gris-menthe simple, pas de halo.
- `rare` → cadre bleu `#7EC8E3` + fines étoiles d'angle.
- `legendary` → cadre or `#FFD24C` + halo rayonnant `#FFE9A8`.
Deux chatons de rareté différente diffèrent donc visiblement même à silhouette proche.

**Animation d'inactivité (product_snapshot §1).** Chaque chaton « joue une petite animation
d'inactivité (respiration, remue-queue) ». Ce n'est **pas** un asset séparé : c'est une animation
moteur (scale/rotation légère de la tête et de la queue) appliquée par Godot au sprite SVG du
chaton. La bible garantit seulement que chaque SVG de chaton isole une tête et une queue
identifiables pour que le moteur puisse les animer. Idem pour le rebond de la pelote (R2).

**Références de style (advisory, jamais un oracle).** Neko Atsume (chatons ronds attachants,
palette douce, gardien invisible) ; Cookie Clicker (objet-amorce central, gros compteur) ;
iconographie flat-design arrondie type material/emoji-cat. Ces références orientent le trait,
elles ne sont **pas** vérifiées mécaniquement (`style_tag_match` compare des tags, pas des pixels
— cf. docs/forge/ASSET_CONTRACT_V0.md). La conformité esthétique reste un fog HumanGate.

## 2. RATIONALE

Chaque choix découle du `product_snapshot.md` (sections VOIT / FAIT / RESSENT et Règles R1–R16),
jamais d'un goût esthétique libre.

- **Cosy, mignon, sans menace** vient du RESSENT (« doux et zen — pas d'alarme, pas de menace, pas
  d'échec ») et de R16 (aucun état de défaite). D'où une palette pastel chaude et l'interdiction de
  tout signal visuel d'alerte (rouge agressif, formes acérées).
- **La pelote centrale** (`wool_ball`) est l'objet d'amorçage du FAIT (« le joueur clique la
  pelote ») et de R1 (chaque clic incrémente strictement les ronrons) : grosse, centrée, avec un
  feedback de clic immédiat dans la même frame (R2). Son rebond est une animation moteur ; le
  « pop » de particules est un asset dédié (`click_feedback_pop`, R2).
- **Six chatons distincts par rareté** répondent au VOIT (« les chatons achetés apparaissent
  visiblement… on reconnaît un rare d'un commun sans lire de texte »), à R5 (le premier achat fait
  APPARAÎTRE un sprite là où il n'y en avait aucun) et à R6 (≥6 chatons nommés, identité visuelle
  distincte par rareté). La Story Bible n'ancre **aucun nom propre de chaton** (matière narrative
  pauvre, cf. product_snapshot fog) : je définis donc des **designs** distincts (robe/couleur)
  rangés par tier de rareté — l'axe qui EST ancré par R6 — sans inventer de lore. Six designs sur
  trois tiers (3 common, 2 rare, 1 legendary) satisfont R5/R6.
- **Le cadre de rareté** (`rarity_frame_set`) est le second signal de R6 : il garantit que la
  rareté se lit même quand deux robes sont proches. Posé derrière le chaton par le moteur.
- **Deux lieux à décor distinct** (`refuge_start`, `place_garden_unlocked`) matérialisent R7 (≥2
  lieux, dont le refuge de départ et ≥1 débloqué par le prestige) et R13 (le prestige fait passer
  le nombre de lieux de 1 à 2). Passer de l'un à l'autre change visiblement l'arrière-plan
  (intérieur cosy → jardin extérieur).
- **Trois objets** (`object_scratching_post`, `object_food_bowl`, `object_yarn_basket`) répondent
  à R8 (le refuge affiche ≥3 objets distincts : jouets, accessoires ou meubles). Silhouettes
  mutuellement distinctes ; ce sont des possessions visibles du refuge, donc `required:true`.
- **Icônes d'améliorations** (`upgrade_icon_set`) soutiennent le FAIT « achète des améliorations »
  et R4 (l'achat fait strictement monter le taux/seconde) : chaque amélioration a une pastille
  reconnaissable dans la boutique.
- **Feedback de clic** (`click_feedback_pop`) porte R2 (chaque clic produit dans la même frame un
  feedback visuel détectable au niveau des pixels) : un pop de ronron + particules superposé au
  point de clic, animé par le moteur (scale/fade).
- **Chrome d'UI** (`ui_panel_frame`) porte le panneau de quêtes (R9, ≥3 quêtes avec objectif +
  progression), l'objectif courant permanent (R14), le compteur de collection « possédés / total »
  (R15), le compteur de lieux, ainsi que la barre ronrons + taux/seconde. Les **nombres, textes et
  barres de valeur** eux-mêmes sont du texte/Control **dessiné par le moteur**, pas un asset image
  — seule la *chrome* (cadres, gouttières, barre) est un asset. Ce n'est pas dissimuler une entité
  de gameplay : aucun compteur n'est une créature ni un obstacle.

**Ce qui n'est PAS un besoin visuel (déclaré, pas silencieux).**
- **Le joueur n'a pas d'avatar.** Comme Neko Atsume, le gardien est invisible (product_snapshot :
  aucun personnage-joueur à l'écran) → aucune `asset_request` `player`, ce n'est pas un oubli.
- **R10 (sons distincts par événement) est hors périmètre de l'Art Director** : l'audio n'est pas
  une entité *visuelle*. R10 est cité par le product_snapshot et journalisé par
  `07_TESTS/oracle/core_audio.gd` — il appartient à l'étape build/audio, pas à la bible visuelle.
  Signalé ici pour traçabilité, absent des BESOINS VISUELS par nature (fog vers l'aval).
- **R3/R11/R12 (production passive, courbe de paliers, solvabilité bot)** sont de la logique, pas
  du visuel : aucun asset dédié ; leur affichage passe par la chrome et le texte moteur.

**Ce que cette bible NE fait pas.** Elle ne juge aucune beauté (fog HumanGate) ; elle ne génère ni
ne télécharge aucun octet ; elle traduit des besoins en requêtes structurées vérifiables.

## 3. BESOINS VISUELS

Chaque entité visuelle distincte du `product_snapshot.md` est listée ci-dessous. `required:true`
dès qu'une Règle observable (Rn) ou une condition centrale la cite ; `required:false` seulement
pour du décor purement cosmétique. Chaque entité `required:true` a une `asset_request` de même
`entity_role` dans `asset_requests.json`. Descriptions données en **formes simples** pour un tracé
SVG direct par le builder.

```json
{
  "visual_requirements": [
    {
      "id": "wool_ball",
      "entity_role": "item",
      "required": true,
      "description": "Pelote de laine centrale, cliquable (R1 incrémente les ronrons, R2 feedback même frame). Boule rose laine (#F49AC1) : un grand cercle plein (~120 px), 3 arcs fins plus clairs enroulés en spirale, un petit brin de fil qui pend. Centrée, contour doux ≥2 px. Base cosy sous elle. Tête/masse isolables pour le rebond moteur."
    },
    {
      "id": "kitten_tabby_common",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton commun roux tigré (R5 apparaît au 1er achat, R6 distinct par rareté). Corps ovale roux (#F0A860), grosse tête ronde, deux oreilles triangulaires arrondies, grands yeux ronds, 3 rayures dorsales, museau rose. Assis de face. Tier common (cadre gris-menthe, pas de halo). Tête + queue isolées pour l'animation d'inactivité."
    },
    {
      "id": "kitten_gray_common",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton commun gris (R5/R6). Même gabarit rond, robe gris-bleu (#B8C0C8), ventre plus clair, yeux verts ronds, petites moustaches. Distinct du roux par couleur + ventre bicolore. Tier common. Tête + queue isolées."
    },
    {
      "id": "kitten_calico_common",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton commun calico tricolore (R5/R6). Base crème (#FBE7C6) avec deux taches, une rousse (#F0A860) sur l'œil, une noire douce (#4A4A55) sur le dos. Yeux ambre. Distinct par les taches asymétriques. Tier common. Tête + queue isolées."
    },
    {
      "id": "kitten_tuxedo_rare",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton rare smoking (R5/R6). Robe noir doux (#4A4A55), plastron et pattes blanc crème (#FBE7C6), nœud papillon menthe. Yeux bleus. Tier rare : cadre bleu (#7EC8E3) + étoiles d'angle. Silhouette bicolore nette. Tête + queue isolées."
    },
    {
      "id": "kitten_siamese_rare",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton rare siamois (R5/R6). Corps crème (#EAD9C0), points chocolat (#8A6B52) sur oreilles, museau et pattes, grands yeux bleus en amande. Tier rare (cadre bleu + étoiles). Distinct par le contraste des points sombres. Tête + queue isolées."
    },
    {
      "id": "kitten_golden_legendary",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton légendaire doré (R5/R6). Robe or (#FFD24C), petites touffes brillantes, yeux ambre pétillants, minuscule couronne optionnelle. Tier legendary : cadre or + halo rayonnant (#FFE9A8). Le plus lumineux de la collection, immédiatement identifiable comme le plus rare. Tête + queue isolées."
    },
    {
      "id": "rarity_frame_set",
      "entity_role": "ui",
      "required": true,
      "description": "Jeu de cadres/badges de rareté posés derrière chaque chaton (R6, second signal de rareté). Trois variantes empaquetées dans un même SVG : cadre gris-menthe (common), cadre bleu (#7EC8E3) + étoiles d'angle (rare), cadre or (#FFD24C) + halo (#FFE9A8) (legendary). Rectangles/ellipses arrondis concentriques, coins ornés simples."
    },
    {
      "id": "refuge_start",
      "entity_role": "environment",
      "required": true,
      "description": "Décor du refuge de départ (R7 lieu 1). Intérieur cosy plein écran 640x480 : mur crème (#FFF3E0), sol bois clair (#E8C9A0), un tapis rose (#F4B9B0), une fenêtre ronde avec ciel doux, un coussin. Grands aplats rectangulaires arrondis, aucun élément menaçant. Zone centrale dégagée pour la pelote et les chatons."
    },
    {
      "id": "place_garden_unlocked",
      "entity_role": "environment",
      "required": true,
      "description": "Second lieu débloqué par le prestige (R7 lieu 2, R13 le compteur de lieux passe 1→2) : jardin cosy. Ciel pastel simple, pelouse menthe (#A8D8C8), quelques buissons ronds, une clôture basse en bois, un rayon de soleil. Arrière-plan visiblement différent du refuge (extérieur vs intérieur), même cadrage 640x480."
    },
    {
      "id": "object_scratching_post",
      "entity_role": "item",
      "required": true,
      "description": "Objet du refuge : arbre à chat / griffoir (R8, objet distinct 1/3). Poteau vertical beige entouré de corde (traits obliques), une plateforme ronde en haut, socle carré. Silhouette haute et étroite, distincte des deux autres objets. Dérivable en petite icône."
    },
    {
      "id": "object_food_bowl",
      "entity_role": "item",
      "required": true,
      "description": "Objet du refuge : gamelle de croquettes (R8, objet distinct 2/3). Bol arrondi menthe (#A8D8C8) rempli de petits ronds bruns, reflet clair. Silhouette basse et large, distincte du griffoir et du panier. Lisible en icône."
    },
    {
      "id": "object_yarn_basket",
      "entity_role": "item",
      "required": true,
      "description": "Objet du refuge : panier de pelotes (R8, objet distinct 3/3). Panier tressé (arcs horizontaux ocre) contenant deux petites pelotes rose/menthe. Silhouette ronde-trapue, distincte des deux autres objets par forme et contenu."
    },
    {
      "id": "upgrade_icon_set",
      "entity_role": "icon",
      "required": true,
      "description": "Pastilles d'améliorations pour la boutique (R4 : l'achat fait monter le taux/seconde). SVG regroupant 3 icônes rondes distinctes sur fond pastel : une patte (production), une flèche montante (taux), une étoile (bonus). Cercle + glyphe simple chacune, lisibles à ~24 px."
    },
    {
      "id": "click_feedback_pop",
      "entity_role": "effect",
      "required": true,
      "description": "Feedback visuel du clic sur la pelote (R2 : détectable au niveau des pixels dans la même frame). Petit 'pop' : un symbole ronron/cœur rose (#F49AC1) + 3 particules rondes qui s'éloignent + un texte '+N'. Sprite léger superposé au point de clic, animable par le moteur (scale/fade)."
    },
    {
      "id": "ui_panel_frame",
      "entity_role": "ui",
      "required": true,
      "description": "Chrome d'interface commune (R9 panneau de quêtes, R14 objectif courant permanent, R15 compteur collection possédés/total, + barre ronrons et taux/seconde + compteur de lieux). Cadre de panneau en rectangle arrondi crème à bordure menthe, une barre supérieure de compteurs et une barre de progression (gouttière + remplissage menthe). Les nombres/textes/barres de VALEUR sont dessinés par le moteur ; seule la chrome est cet asset."
    },
    {
      "id": "ambient_decor_props",
      "entity_role": "environment",
      "required": false,
      "description": "Petits props d'ambiance purement cosmétiques (coussins supplémentaires, plante en pot, jouet au sol) posés dans les lieux pour la chaleur. Aucune Règle observable ne les cite : optionnels, pas de requête d'asset dédiée (décor non requis)."
    }
  ]
}
```
