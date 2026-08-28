---
styles: [flat-cute-svg, cozy-pastel]
mood_keywords: [mignon, chaleureux, cosy, pastel, doux, lisible, arrondi, rassurant]
---

## 1. IDENTITÉ VISUELLE

**Style directeur : `flat-cute-svg`** — un aplat vectoriel mignon, formes arrondies, contour
doux, zéro texture bruitée. Tout est dessiné en **SVG** (formes simples : cercles, ellipses,
rectangles arrondis, quelques courbes), car le studio n'a pas de générateur d'images 2D : le
builder écrit lui-même chaque fichier `04_ASSETS/sprites/<id>.svg`, importé par Godot 4 comme
texture. La contrainte de production est donc *dessinable en primitives* — chaque asset ci-dessous
est décrit en formes géométriques, pas en pixel-art.

**Palette `cozy-pastel`** (chaleureuse, faible contraste agressif, aucune couleur alarmante) :
- Fond / refuge : crème `#FFF3E0`, bois clair `#E8C9A0`, tapis `#F4B9B0`.
- Chatons (base) : roux `#F0A860`, gris `#B8C0C8`, crème `#FBE7C6`, noir doux `#4A4A55`,
  siamois `#EAD9C0` + points chocolat `#8A6B52`.
- Accents chaleureux : ronron/laine `#F49AC1` (rose laine), UI menthe `#A8D8C8`.
- Or de rareté légendaire : `#FFD24C` avec halo `#FFE9A8`.

**Lisibilité 640×480 — règle dure de cadrage.** Le jeu tourne en 640×480. Chaque entité doit
rester lisible à cette résolution : silhouette pleine et reconnaissable en un coup d'œil, trait de
contour ≥ 2 px à l'échelle d'affichage, aucun détail plus fin que ~4 px, un sprite de chaton
occupe une boîte d'au moins ~48×48 px à l'écran. Pas de dégradé fin ni de micro-détail : la
mignonnerie passe par la **forme** (grosse tête, grands yeux, corps rond), pas par la densité.

**Langage de rareté (lecture « à l'œil », R9/R14).** La rareté se lit par **trois** signaux
cumulés portés par un cadre/halo partagé (`rarity_frame_set`) posé derrière/autour du chaton :
- `common` → cadre gris-menthe simple, pas de halo.
- `rare` → cadre bleu `#7EC8E3` + fines étoiles d'angle.
- `legendary` → cadre or `#FFD24C` + halo rayonnant `#FFE9A8`.
Deux chatons de rareté différente diffèrent donc visiblement même à silhouette proche.

**Références de style (advisory, jamais un oracle).** Neko Atsume (chatons ronds attachants,
palette douce, observateur invisible) ; iconographie flat-design arrondie type material/emoji-cat.
Ces références orientent le trait, elles ne sont pas vérifiées mécaniquement.

## 2. RATIONALE

Chaque choix découle du `product_snapshot.md` (sections VOIT / FAIT / RESSENT et Règles Rn), pas
d'un goût esthétique libre.

- **Cosy, mignon, sans menace** vient directement du RESSENT (« ton cosy et mignon hérité de Neko
  Atsume, pas de timer, pas de pression ») et de R23/coherence_rules (« la colonie ne peut jamais
  être perdue »). D'où une palette pastel chaude et l'interdiction de tout signal visuel d'alerte
  (rouge agressif, formes acérées) : rien à l'écran ne doit évoquer le danger.
- **La pelote centrale** est l'objet d'amorçage du FAIT (« le joueur clique la pelote ») et de R1 :
  elle est au centre, grosse, avec un feedback de clic immédiat (`click_feedback_pop`, R15).
- **Chatons distincts par rareté** répond au VOIT (« chaque chaton acheté apparaît comme un sprite
  distinct et persistant, sa rareté se lit à l'œil ») et aux R8 (≥6 distincts), R9 (≥3 raretés
  représentées), R14/R16 (traitement visuel distinct, sprites reconnaissables sans lire le nom).
  La Story Bible n'ancre **aucun nom propre de chaton** (« nommer un chaton serait du remplissage »),
  seulement la quantité, la rareté et le principe d'identité visuelle par rareté : je définis donc
  des **designs** distincts (robe/couleur) rangés par tier de rareté — l'axe ancré — sans inventer
  de lore. Six designs sur trois tiers (3 common, 2 rare, 1 legendary) satisfont R8/R9/R16.
- **Deux lieux à décor distinct** (`refuge_start`, `place_garden_unlocked`) matérialisent R10/R17 :
  passer d'un lieu à l'autre change visiblement l'arrière-plan (déblocage par palier de
  méta-progression, VOIT « quand la méta-progression débloque un second lieu, l'arrière-plan change »).
- **Trois objets** (`object_*`) répondent à R11/R18 : chacun a une icône visible et un effet
  observable ; ce sont des possessions du refuge, pas du décor pur, donc `required:true`.
- **Icônes d'améliorations** (`upgrade_icon_set`) soutiennent le FAIT « achète des améliorations »
  et R4 (le taux augmente) : chaque amélioration a une pastille reconnaissable dans la boutique.
- **Chrome d'UI** (`ui_panel_frame`) porte la boutique, le panneau de quêtes (R12), le compteur de
  collection (R13) et la barre permanente ronrons + taux/seconde (R25) dans un cadre cohérent et
  lisible à 640×480. Les nombres et barres de progression eux-mêmes sont du **texte/Control dessiné
  par le moteur**, pas un asset image — seule la *chrome* (cadres, barre, gouttières) est un asset.
  Ce n'est pas dissimuler une entité de gameplay : aucun compteur n'est une créature ou un obstacle.

**Ce que cette bible NE fait pas.** Elle ne juge aucune beauté (fog HumanGate) ; elle ne génère ni
ne télécharge aucun octet ; elle traduit des besoins en requêtes structurées vérifiables.

## 3. BESOINS VISUELS

Chaque entité visuelle distincte du `product_snapshot.md` est listée ci-dessous. `required:true`
dès qu'une Règle observable (Rn) ou une condition centrale la cite ; `required:false` seulement
pour du décor purement cosmétique. Chaque entité `required:true` a une `asset_request` de même
`entity_role` dans `asset_requests.json`. Descriptions données en **formes simples** pour un tracé
SVG direct.

```json
{
  "visual_requirements": [
    {
      "id": "wool_ball",
      "entity_role": "item",
      "required": true,
      "description": "Pelote de laine centrale, cliquable (R1, R15). Boule rose laine (#F49AC1) : un grand cercle plein, 3 arcs fins plus clairs enroulés en spirale, un petit brin de fil qui pend. Grosse (~120 px), centrée, contour doux. Base cosy sous elle."
    },
    {
      "id": "kitten_tabby_common",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton commun roux tigré (R8/R9/R16). Corps ovale roux (#F0A860), grosse tête ronde, deux oreilles triangulaires arrondies, grands yeux ronds, 3 rayures dorsales, museau rose. Assis de face. Tier commun (cadre gris-menthe, pas de halo)."
    },
    {
      "id": "kitten_gray_common",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton commun gris (R8/R9/R16). Même gabarit rond, robe gris-bleu (#B8C0C8), ventre plus clair, yeux verts ronds, petites moustaches. Distinct du roux par couleur + ventre bicolore. Tier commun."
    },
    {
      "id": "kitten_calico_common",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton commun calico tricolore (R8/R9/R16). Base crème (#FBE7C6) avec deux taches, une rousse (#F0A860) sur l'oeil, une noire douce (#4A4A55) sur le dos. Yeux ambre. Distinct par les taches asymétriques. Tier commun."
    },
    {
      "id": "kitten_tuxedo_rare",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton rare smoking (R8/R9/R14/R16). Robe noir doux (#4A4A55), plastron et pattes blanc crème (#FBE7C6), noeud papillon menthe. Yeux bleus. Tier rare : cadre bleu (#7EC8E3) + étoiles d'angle. Silhouette bicolore nette."
    },
    {
      "id": "kitten_siamese_rare",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton rare siamois (R8/R9/R14/R16). Corps crème (#EAD9C0), points chocolat (#8A6B52) sur oreilles, museau et pattes, grands yeux bleus en amande. Tier rare (cadre bleu + étoiles). Distinct par le contraste points sombres."
    },
    {
      "id": "kitten_golden_legendary",
      "entity_role": "collectible",
      "required": true,
      "description": "Chaton légendaire doré (R8/R9/R14/R16). Robe or (#FFD24C), petites touffes brillantes, yeux ambre pétillants, minuscule couronne optionnelle. Tier legendary : cadre or + halo rayonnant (#FFE9A8). Le plus lumineux de la collection."
    },
    {
      "id": "rarity_frame_set",
      "entity_role": "ui",
      "required": true,
      "description": "Jeu de cadres/badges de rareté posés derrière chaque chaton (R9, R14). Trois variantes empaquetées dans un même SVG : cadre gris-menthe (common), cadre bleu (#7EC8E3) + étoiles (rare), cadre or (#FFD24C) + halo (#FFE9A8) (legendary). Rectangles arrondis concentriques, coins ornés simples."
    },
    {
      "id": "refuge_start",
      "entity_role": "environment",
      "required": true,
      "description": "Décor du refuge de départ (R10, R17). Intérieur cosy 640x480 : mur crème (#FFF3E0), sol bois clair (#E8C9A0), un tapis rose (#F4B9B0), une fenêtre ronde avec ciel doux, un coussin. Composé de grands aplats rectangulaires arrondis, aucun élément menaçant."
    },
    {
      "id": "place_garden_unlocked",
      "entity_role": "environment",
      "required": true,
      "description": "Second lieu débloqué par palier (R10, R17) : jardin cosy. Ciel pastel dégradé simple, pelouse menthe (#A8D8C8), quelques buissons ronds, une clôture basse en bois, un rayon de soleil. Arrière-plan visiblement différent du refuge (extérieur vs intérieur)."
    },
    {
      "id": "object_scratching_post",
      "entity_role": "item",
      "required": true,
      "description": "Objet : arbre à chat / griffoir (R11, R18). Poteau vertical beige entouré de corde (traits obliques), une plateforme ronde en haut, socle carré. Icône dérivable en petit. Effet observable quand possédé (ex. bonus affiché)."
    },
    {
      "id": "object_food_bowl",
      "entity_role": "item",
      "required": true,
      "description": "Objet : gamelle de croquettes (R11, R18). Bol arrondi menthe (#A8D8C8) rempli de petits ronds bruns, reflet clair. Forme simple lisible en icône. Effet observable à l'activation."
    },
    {
      "id": "object_yarn_basket",
      "entity_role": "item",
      "required": true,
      "description": "Objet : panier de pelotes (R11, R18). Panier tressé (arcs horizontaux ocre) contenant deux petites pelotes roses/menthe. Distinct des deux autres objets par silhouette. Effet observable à l'activation."
    },
    {
      "id": "upgrade_icon_set",
      "entity_role": "icon",
      "required": true,
      "description": "Pastilles d'améliorations pour la boutique (R4). SVG regroupant ~3 icônes rondes distinctes sur fond pastel : une patte (production), une flèche montante (taux), une étoile (bonus). Cercle + glyphe simple chacune, lisibles à ~24 px."
    },
    {
      "id": "click_feedback_pop",
      "entity_role": "effect",
      "required": true,
      "description": "Feedback visuel du clic sur la pelote (R15). Petit 'pop' de ronrons : un symbole ronron/coeur rose (#F49AC1) + 3 particules rondes qui s'éloignent, plus un texte '+N' stylé. Sprite léger superposé au point de clic, animable par le moteur (scale/fade)."
    },
    {
      "id": "ui_panel_frame",
      "entity_role": "ui",
      "required": true,
      "description": "Chrome d'interface commune (R12 quêtes, R13 collection, R25 compteurs). Cadre de panneau en rectangle arrondi crème à bordure menthe, plus une barre supérieure pour total ronrons + taux/seconde et une barre de progression (gouttière + remplissage menthe). Les nombres/barres de valeur sont dessinés par le moteur ; seule la chrome est cet asset."
    },
    {
      "id": "ambient_decor_props",
      "entity_role": "environment",
      "required": false,
      "description": "Petits props d'ambiance purement cosmétiques (coussins, plante en pot, jouet au sol) posés dans les lieux pour la chaleur. Aucune Règle observable ne les cite : optionnels. Pas de requête d'asset dédiée (décor non requis)."
    }
  ]
}
```
