---
styles: [kawaii-chibi, candy-pop, pop-vfx, chunky-hud]
mood_keywords: [mignon, sature, rond, chibi, bonbon, nuage, petillant, expressif, lisible, dangereux-mais-adorable, primaire]
---

# Art Bible — shmup_slice (Pop'n TwinBee kawaii)

> Run : shmup_slice_art-20260718a · etape s2.5-artbible
> Source de verite (product_snapshot.md absent pour ce run) : lab/forge_runs/shmup_slice/charter.yaml
> (objectif + criteres_succes) et lab/forge_runs/shmup_slice/wiremap.json (26 features R1..R26).
> Direction imposee (HumanGate Pierre, playtest du build primitives-canvas) : « Pop'n TwinBee kawaii ».
> Gate Pierre explicite : le hors_scope original « rendu = primitives canvas » est LEVE pour cette
> etape — ce document produit de VRAIES demandes de sprites/assets (asset_requests.json).
> Ce document ne juge JAMAIS l'esthetique d'un asset resolu (comparaison de tags, pas de pixels).

## 1. IDENTITE VISUELLE

Identite : **shoot'em up vertical « bonbon menaçant »** — la lecon de Pierre est que *mignon ne
veut pas dire facile*. Le vocabulaire visuel est celui de Pop'n TwinBee : silhouettes **rondes,
chibi, sans arete agressive**, couleurs **primaires sursaturees** posees en aplats francs avec un
contour epais lisible, et un peril reel qui se lit dans le mouvement et la densite de projectiles,
jamais dans une palette sombre. Le danger est chorégraphié, pas grisaille.

**Palette directrice** (aplats primaires satures + contour) :
- Joueur : cyan/blanc pétillant, cockpit rose bonbon — reconnaissable au premier coup d'oeil.
- Ennemis : jaune citron / orange mandarine (INVADERS_DESCENT) et vert pomme / turquoise
  (SINE_WEAVE) — deux familles chromatiques distinctes pour que les deux formations R3/R4 se
  distinguent sans lire le pattern.
- Boss : magenta (boss 1), bleu roi (boss 2), rouge cerise (boss 3) — un boss = une couleur
  dominante propre, rond et expressif (gros yeux, moue), mais dont les projectiles saturent
  l'ecran (spiral / wide_spread — cf. wiremap R14/R15/R16).
- Projectiles joueur : blanc/cyan lumineux, formes d'etoiles/coeurs — lisibles sur tout fond.
- Projectiles ennemis/boss : orange/magenta chauds a halo — **contraste chaud/froid** impose pour
  que le joueur distingue au premier regard un tir dangereux d'un tir ami.
- Fonds : un decor **distinct par map** (R11/R12/R13) — map 1 ciel de nuages creme, map 2 pays de
  bonbons/reglisse, map 3 crepuscule stellaire sucre — jamais trois teintes d'un meme fond.

**Formes** : rondeurs partout (coins arrondis, cercles, bulles), zero pointe menaçante ; les
silhouettes ennemies restent adorables meme en attaquant. **HUD** : gros chiffres arrondis,
icones ludiques (vies = petites bouilles du vaisseau, HP boss = jauge bonbon), lisibilite maximale
sur fond charge.

**Style tags declares** (compares MOT-A-MOT au catalogue, jamais un jugement « ça ressemble ») :
`kawaii-chibi` (personnages/ennemis/boss), `pop-vfx` (tirs et explosions), `candy-pop` (fonds de
map), `chunky-hud` (HUD, ecrans, bouton). Ces tags sont une CLE MECANIQUE de resolution, pas une
promesse de beaute (cf. §RATIONALE et le fog de conformite esthetique).

## 2. RATIONALE

Chaque choix se rattache a une source de verite du run, pas a une preference gratuite :

- **Silhouettes rondes chibi + primaires saturees** ← direction Pierre imposee « Pop'n TwinBee
  kawaii » (HumanGate), reponse directe au verdict de playtest « aucun rendu, primitives brutes ».
- **Deux familles chromatiques ennemies distinctes** ← wiremap R3 `INVADERS_DESCENT` et R4
  `SINE_WEAVE` sont deux formations declarees en donnees, VISUELLEMENT distinctes exigees.
- **Contraste chaud/froid tir ami vs tir hostile** ← criteres_succes collisions R6/R7/R8 : le
  joueur doit lire instantanement ce qui le tue (tir ennemi/contact) de ce qu'il tire ; la
  lisibilite du danger sert l'esquivabilite prouvee (CS-2, R23 `hasSafeCorridor`).
- **Un boss = une couleur + une bouille propre** ← wiremap R14/R15/R16 : trois boss distincts,
  1 pattern chacun (spiral vs wide_spread declares distincts) ; « rond et expressif mais dangereux »
  = mignon n'annule pas la charge de projectiles esquivable par construction.
- **Un fond distinct par map** ← wiremap R11/R12/R13 (MAP_1/2/3 declarations propres distinctes) +
  direction Pierre « fonds nuages/bonbons distincts par map ». Le defilement reste cosmetique (hors
  logique pure, charter §hors_scope) ; seul le decor change.
- **HUD lisible et ludique + ecrans victoire/defaite + restart** ← contrat de jouabilite R26
  (`#overlay`, `#restart`, hooks {level,lives,score,bossHp}) et R18/R19/R20. Vies en petites
  bouilles, jauge HP boss en bonbon : le HUD porte l'information de jeu, il doit rester lisible sur
  un fond sature.
- **Explosion/pop de destruction** ← R6 (destruction ennemi) : le playtest a juge le rendu « mort » ;
  un feedback de destruction (pop kawaii) est le juice minimal qui manquait, meme si l'oracle de
  jeu ne teste que la mecanique (memoire studio : « mechanical OK, visually dead »).

**Ce que ce document N'affirme PAS** : il ne certifie aucune conformite esthetique. La resolution
mecanique de chaque requete compare des TAGS de metadonnees au catalogue (`style_tag_match`), pas
des pixels — un asset peut resoudre et decevoir a l'oeil. La question « est-ce vraiment joli / dans
le bon esprit TwinBee » reste un **fog HumanGate** (jugement Pierre), jamais un claim de cet agent.
Le catalogue actuel ne contient AUCUN tag `kawaii-chibi`/`candy-pop`/`pop-vfx`/`chunky-hud` : les
requetes resolvent donc `BLOCKED` (advisory) — c'est un fait legitime (catalogue incomplet pour
cette direction neuve), pas un defaut de contrat, et ce document ne relache aucune contrainte pour
forcer un OK de resolution.

## 3. BESOINS VISUELS

Chaque entite visuelle distincte du jeu, tiree feature par feature de la wiremap (R1..R26) et de
la direction Pierre. `required:true` des qu'une Regle observable ou une condition de
victoire/defaite/score/HUD la cite ; `required:false` uniquement pour du decor purement cosmetique.

```json
{
  "visual_requirements": [
    { "id": "vr-player-ship", "entity_role": "player", "required": true, "description": "Vaisseau joueur chibi rond, cyan/blanc a cockpit rose — R1 deplacement 2D borne, R2 tir vers le haut ; silhouette reconnaissable au premier regard." },
    { "id": "vr-player-shot", "entity_role": "effect", "required": true, "description": "Projectile joueur montant (etoile/coeur blanc-cyan lumineux) — R2 ; doit rester lisible sur tout fond, distinct visuellement des tirs hostiles." },
    { "id": "vr-enemy-invaders", "entity_role": "enemy", "required": true, "description": "Creature ennemie de la formation INVADERS_DESCENT (R3), famille chromatique jaune/orange, chibi et adorable meme en descente ; distincte de SINE_WEAVE." },
    { "id": "vr-enemy-sine", "entity_role": "enemy", "required": true, "description": "Creature ennemie de la formation SINE_WEAVE (R4), famille chromatique vert/turquoise, silhouette distincte de la formation invaders pour lecture immediate." },
    { "id": "vr-enemy-shot", "entity_role": "effect", "required": true, "description": "Projectile ennemi descendant (R5, tir periodique vers le bas), teinte chaude a halo — contraste chaud/froid impose vs tir joueur pour lisibilite du danger." },
    { "id": "vr-boss-1", "entity_role": "boss", "required": true, "description": "Boss de fin de map 1 (R14), rond et expressif, dominante magenta, HP propre + pattern propre esquivable ; mignon mais dangereux." },
    { "id": "vr-boss-2", "entity_role": "boss", "required": true, "description": "Boss de fin de map 2 (R15), distinct du boss 1 (dominante bleu roi, pattern spiral), gros yeux expressifs, silhouette ronde propre." },
    { "id": "vr-boss-3", "entity_role": "boss", "required": true, "description": "Boss final de map 3 (R16), distinct des boss 1/2 (dominante rouge cerise, pattern wide_spread) ; sa defaite declenche l'ecran de victoire (R18)." },
    { "id": "vr-boss-shot", "entity_role": "effect", "required": true, "description": "Projectiles de boss (patterns spiral/wide_spread des R14-R16), halo chaud sature qui remplit l'ecran ; distinct des tirs d'ennemis simples pour lecture du peril de boss." },
    { "id": "vr-explosion", "entity_role": "effect", "required": true, "description": "Pop/explosion kawaii a la destruction d'un ennemi ou boss (R6) — feedback de juice qui manquait au build primitives (memoire studio 'visually dead')." },
    { "id": "vr-bg-map1", "entity_role": "environment", "required": true, "description": "Fond de la map 1 (R11), ciel de nuages creme kawaii ; decor distinct des maps 2/3, defilement cosmetique hors logique pure." },
    { "id": "vr-bg-map2", "entity_role": "environment", "required": true, "description": "Fond de la map 2 (R12), pays de bonbons/reglisse ; visuellement distinct des maps 1/3 (exigence de map distincte en donnees)." },
    { "id": "vr-bg-map3", "entity_role": "environment", "required": true, "description": "Fond de la map 3 (R13), crepuscule stellaire sucre ; distinct des maps 1/2, cloture du run avant l'ecran de victoire." },
    { "id": "vr-hud-life", "entity_role": "ui", "required": true, "description": "Icone de vie du HUD (R10 3 vies, R26 hook lives) — petite bouille du vaisseau, lisible sur fond sature, ludique." },
    { "id": "vr-hud-bosshp", "entity_role": "ui", "required": true, "description": "Jauge HP de boss (R14-R16, hook bossHp) en 'bonbon' — decroit visiblement jusqu'a la defaite du boss ; element de HUD lisible." },
    { "id": "vr-screen-victory", "entity_role": "ui", "required": true, "description": "Habillage de l'ecran/overlay de victoire (R18, #overlay) — celebration kawaii apres la defaite du boss 3." },
    { "id": "vr-screen-defeat", "entity_role": "ui", "required": true, "description": "Habillage de l'ecran/overlay de defaite (R19, vies==0, #overlay) — ton doux, jamais punitif, coherent avec la direction mignonne." },
    { "id": "vr-btn-restart", "entity_role": "ui", "required": true, "description": "Bouton #restart (R20, relance du run entier) — icone/bouton rond et lisible, coherent avec le HUD chunky." },
    { "id": "vr-hud-frame", "entity_role": "ui", "required": false, "description": "Cadre/panneau decoratif optionnel derriere le HUD — purement cosmetique, non cite par une regle ; le HUD reste lisible sans lui. Aucune requete produite (decision assumee)." }
  ]
}
```
