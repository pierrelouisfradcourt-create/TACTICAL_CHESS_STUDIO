---
styles: [flat-top-down, flat-color-procedural]
mood_keywords: [exploration-libre, lisibilite-immediate, contraste-garanti, aplats-de-couleur, top-down]
---

## 1. IDENTITÉ VISUELLE

`voxel_frontier` a une identité visuelle **plate et lisible en vue de dessus**, tenue
par deux registres complémentaires qui partagent la même règle : *tout doit rester
lisible d'un coup d'œil, quel que soit ce qui est généré dessous*.

- **Registre `flat-color-procedural` — le décor.** Le terrain (herbe, sable, eau peu
  profonde, roche) est dessiné au runtime en aplats de couleur pleins via primitives
  canvas, jamais chargé comme asset. Palette de biomes distincte et saturée pour que
  chaque biome se distingue à la seule couleur ; aucun détail de texture, aucune
  ambiguïté décor/interactif. Ce registre est une **décision de style, pas une
  demande d'asset** : il ne produit aucune `asset_request` (le terrain n'a besoin
  d'aucun octet externe, cf. règle observable R1 du prisme produit).
- **Registre `flat-top-down` — les acteurs.** Personnage joueur, créatures et icônes
  d'inventaire sont des sprites plats vus de dessus, à silhouette nette et bord franc,
  posés PAR-DESSUS le terrain. Contraste et saturation choisis pour ressortir sur
  n'importe quelle couleur de biome généré (R2). Deux types de créature au minimum,
  chacun avec sa propre silhouette et sa propre palette pour rester distinguables
  l'un de l'autre (R3). Les icônes d'inventaire partagent ce même langage plat pour
  qu'une icône donnée reste stable et reconnaissable à chaque apparition (R4).

Le liant entre les deux registres est le **contraste** : le décor est volontairement
plat et sobre pour que les acteurs (le seul contenu interactif) captent l'attention.
C'est une identité de clarté fonctionnelle avant d'être décorative.

## 2. RATIONALE

Le choix de `flat-top-down` pour les acteurs découle directement du prisme produit :
vue de dessus sur canvas HTML5, runtime `html`, format `2D`. C'est le seul style du
catalogue (`knowledge_base/catalog.json`) cohérent avec ce runtime ; `lowpoly` et
`photoscan-pbr` sont `3D`/`godot` et sont écartés mécaniquement (mauvais runtime), pas
par goût. Le style plat sert aussi R2 : un sprite à bord franc et forte saturation se
détache d'un aplat de couleur uni mieux qu'un rendu texturé.

Le registre `flat-color-procedural` du terrain n'est PAS traduit en `asset_request` :
c'est le cœur de cette itération « procédurale partielle ». Le terrain est du code de
rendu (déterministe, seedé), pas de la donnée à sourcer — le sortir en demande d'asset
serait une erreur de périmètre. D'où un `no_assets_needed: false` global (le jeu a bien
besoin d'assets) alors même que le besoin visuel le plus visible à l'écran (le sol)
n'en génère aucun.

**Tension non tranchée mécaniquement, remontée explicitement (fog, pas claim) :**

- *Nombre d'icônes d'inventaire indéterminé.* Le prisme dit que le nombre de types
  d'objets ramassables n'est pas figé cette itération et peut évoluer. Je ne l'invente
  pas silencieusement. Je pose UNE `asset_request` d'icône qui fixe le **contrat de
  style** de l'inventaire (langage plat, stable) ; le **nombre** d'icônes distinctes
  reste ouvert et fera croître le nombre d'instances de requête aux itérations
  suivantes, sans changer ce contrat de style. C'est une décision de forme, pas de
  quantité.

- *Distinction visuelle réelle des acteurs — hors oracle.* R2 (lisibilité du perso sur
  tout terrain), R3 (créature terrestre vs aérienne réellement distinctes) et R4
  (stabilité d'icône) sont des propriétés de **pixels**, pas de tags. L'oracle
  `check_artbible.mjs` / `asset_request.mjs` compare des `style_tag` (métadonnées),
  jamais des images (cf. Asset Contract V0, « Ce que ce contrat ne fait jamais »). Une
  `asset_request` de créature « aérienne » peut se résoudre mécaniquement sur un sprite
  du catalogue par simple égalité de tag de style, sans garantir qu'il *ressemble* à
  une créature aérienne distincte de la terrestre. Cette conformité esthétique-là
  relève du jugement de Pierre (HumanGate), pas d'un claim de cet agent.
