---
styles: [cyberpunk-neon]
mood_keywords: [synthwave, neon-backlit, violet-cyan, rain-reflection, nocturnal-skyline, high-contrast]
---

## 1. IDENTITÉ VISUELLE

Signature unique et non négociable : **cyberpunk néon synthwave** en vue de côté 2D
(canvas HTML5). Palette dominante violet/cyan saturés, silhouettes rétroéclairées par
des enseignes néon, sol mouillé réfléchissant, arrière-plans de skyline nocturne
synthwave (dégradés magenta→indigo, soleil-grille à l'horizon). Un seul langage visuel
gouverne 100 % des sprites — héros et chaque type d'ennemi — conformément à R1
(cohérence stylistique stricte du product_snapshot) : aucun sprite dans un autre idiome
(pas de pixel-art rétro, pas de flat pastel, pas de réalisme). Tous les besoins d'asset
de ce produit portent donc le tag de style unique `cyberpunk-neon`, y compris le décor
défilant, afin que l'identité soit portée par l'ensemble du cadre et pas seulement par
les personnages.

## 2. RATIONALE

Le product_snapshot pose l'esthétique comme critère de succès explicite, à parité avec
le gameplay (« l'esthétique EST le produit ») : un seul style tag maximise la cohérence
demandée par R1 et évite la fragmentation stylistique qu'introduirait une palette de
tags multiples. Les mood_keywords traduisent la marque en repères actionnables (néon,
contre-jour, violet/cyan, reflets de pluie, skyline nocturne, fort contraste) sans jamais
juger « le beau » — la conformité esthétique finale reste un jugement humain (fog Pierre),
hors de portée d'un oracle mécanique.

**Tension non tranchée (remontée explicite, pas résolue en silence)** : R1 exige un
contre-jour néon strict sur toutes les silhouettes, tandis que R2 exige que héros et
ennemis restent discriminables à vitesse de jeu. Ces deux règles sont en tension directe
(le contre-jour aplatit les silhouettes en ombres, ce qui nuit à la lisibilité). Cette
tension relève d'un arbitrage de production visuelle (liseré de séparation, teinte
d'accent par camp, valeur de rim-light) que l'Art Director ne peut trancher par un oracle
mécanique — elle est remontée en fog à Pierre / à l'étape d'asset-spec, pas résolue
arbitrairement ici.

**Contrainte d'offre (fait mécanique, pas un défaut)** : le tag `cyberpunk-neon` n'existe
dans aucune entrée de `knowledge_base/catalog.json` (offre actuelle : `flat-top-down`,
`lowpoly`, `photoscan-pbr` uniquement). Les asset_requests ci-jointes sont donc attendues
en BLOCKED à la résolution mécanique. C'est un résultat légitime (BLOCKED ≠ FAIL, cf.
Asset Contract V0) : le catalogue n'a pas encore cet asset. Il ne serait PAS conforme au
garde-fou d'assouplir le style pour forcer un OK — la demande est rapportée telle quelle,
et la décision (sourcer/ingérer un asset néon, ou trancher que le style n'existe pas
encore) revient à HumanGate.
