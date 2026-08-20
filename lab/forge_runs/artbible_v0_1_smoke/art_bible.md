---
styles: [pixel-art, flat-side-scroller]
mood_keywords: [arcade, lisible, reactif, colore, retro, sans-friction]
---

# Art Bible — Collect Runner (s2.5)

> Source : `lab/forge_runs/collect_runner/product_snapshot.md` (étape 1, réel).
> Oracle de conformité : `scripts/forge/check_artbible.mjs` (non-LLM, structurel).
> Ce document fixe une identité visuelle actionnable ; il ne certifie aucune qualité
> esthétique (jugement Pierre, cf. section RATIONALE, note de fog).

## 1. IDENTITÉ VISUELLE

**Vue et cadrage.** Jeu de course/évitement 2D à **défilement latéral** (le niveau
scrolle de gauche à droite, le joueur reste dans le tiers gauche du canvas). Toute la
grammaire visuelle est donc de profil (side-view), jamais de dessus : le sol est une
ligne d'horizon basse lisible d'un coup d'œil, les silhouettes se lisent latéralement.

**Style graphique.** `pixel-art` net à faible résolution logique, upscalé au pixel entier
(pas d'anti-aliasing flou) pour un rendu arcade rétro assumé. Sprites de gameplay
(personnage, pièces, obstacles) sur une grille cohérente. Sol et décor en bandes de
`flat-side-scroller` (aplats simples, une couche de gameplay + un fond parallax discret).

**Palette (hiérarchie par la fonction, pas par le goût).** Trois familles de couleur
séparées pour que la lisibilité soit mécanique, pas décorative :
- Personnage : teinte franche et saturée unique (ex. cyan/bleu vif) — jamais réutilisée
  ailleurs, pour que le joueur retrouve son avatar instantanément.
- Pièces : or/jaune chaud lumineux, contour sombre — signal « récompense, va vers ça ».
- Obstacles : rouge/magenta agressif à contour dur — signal « danger, évite ça ». Le
  contraste pièce↔obstacle est le contrat de lisibilité central du jeu (voir RATIONALE).
- Sol/décor : tons désaturés froids (gris-bleu) en retrait, pour ne jamais concurrencer
  les éléments de gameplay au premier plan.

**HUD et écrans.** Compteur de pièces en typographie pixel bitmap haute lisibilité, coin
haut de l'écran, contour/ombre porté pour rester lisible sur tout fond. Écrans de victoire
et de défaite plein cadre, chacun avec une couleur dominante propre (victoire = chaud
positif ; défaite = rouge sanction) pour que l'issue soit lue avant même le texte.

**Mouvement.** Lisibilité de l'état avant tout : le personnage a une pose « au sol » et une
pose « en saut » nettement distinctes (l'état `onGround` doit se voir), une pièce ramassée
disparaît franchement (pas de fondu ambigu), un contact obstacle déclenche un flash net.

## 2. RATIONALE

Chaque choix ci-dessus est ancré dans une section observable du product_snapshot, pas
dans une préférence esthétique :

- **Défilement latéral de profil** ← « le niveau défile sous lui » + R1 (avance auto en
  `x`) : la vue de côté est imposée par la mécanique, ce n'est pas un parti pris libre.
  C'est aussi pourquoi les styles déclarés sont side-view et **non** top-down (voir la
  note de fog ci-dessous : le catalogue actuel n'a que du top-down, ce qui produira une
  résolution `BLOCKED` advisory assumée, pas un défaut de couverture).
- **Contraste pièce↔obstacle maximal** ← Ressent « satisfaction immédiate et lisible à
  chaque pièce » + « sanction claire et immédiate au contact » + R7/R8 : la couleur doit
  faire porter la décision gauche/droite/saut à l'instant, sans lecture consciente.
- **Personnage en teinte unique réservée** ← R2/R3/R4 (le joueur pilote la trajectoire) :
  l'avatar doit rester repérable en permanence pendant que le décor défile.
- **Poses au sol / en saut distinctes** ← R4/R5/R6 (bascule `onGround`, pas de double
  saut) : l'état de saut est une information de gameplay, donc une information visuelle.
- **Sol comme ligne de gameplay** ← R6 (« se repose au sol ») : le terrain n'est pas du
  décor cosmétique, c'est la surface de référence de la mécanique de saut.
- **Compteur toujours lisible** ← « compteur affiché, mis à jour en temps réel » + R7 :
  feedback permanent, donc contour/ombre pour tenir sur n'importe quel fond.
- **Écrans victoire/défaite à dominante colorée** ← R11 (victoire) / R8 (défaite) : l'issue
  d'une partie est un état terminal du jeu, la couleur la signale avant le texte.
- **Décor de fond désaturé et optionnel** ← rien dans les Règles observables ne dépend du
  fond : il est classé `required:false` (cosmétique véritable), sans jamais servir à
  « couvrir » une entité de gameplay réelle.

**Note de fog (jugement Pierre, jamais un claim).** La conformité *esthétique* réelle
(est-ce que ces sprites sont « beaux » / dans le bon style au-delà des tags) n'est pas
évaluable mécaniquement — `style_tag_match` compare des chaînes, pas des pixels
(cf. docs/forge/ASSET_CONTRACT_V0.md). De plus, le catalogue actuel n'expose que des
assets `flat-top-down` (vue de dessus), incompatibles de *viewpoint* avec ce jeu à
défilement latéral ; la résolution de ces requêtes contre le catalogue sera donc
`BLOCKED` en **statistique advisory** — c'est un fait légitime (catalogue incomplet →
sourcing HumanGate), pas une couverture manquante ni une erreur de contrat.

## 3. BESOINS VISUELS

Un besoin par entité visuelle distincte identifiée dans le product_snapshot. `required`
est explicite : `true` pour toute entité citée par une Règle observable (Rn) ou centrale
à une condition de victoire/défaite/score ; `false` uniquement pour du décor cosmétique.

```json
{
  "visual_requirements": [
    {
      "id": "vr-player",
      "entity_role": "player",
      "required": true,
      "description": "Personnage jouable de profil, poses distinctes au sol et en saut (état onGround visible) — central à R1..R6. Teinte franche réservée, jamais réutilisée."
    },
    {
      "id": "vr-coin",
      "entity_role": "collectible",
      "required": true,
      "description": "Pièce (coin) à ramasser, or/jaune lumineux à contour sombre — cible de collecte de R7 (incrémente le compteur, se retire des pièces actives)."
    },
    {
      "id": "vr-obstacle",
      "entity_role": "obstacle",
      "required": true,
      "description": "Obstacle à éviter, rouge/magenta agressif à contour dur — déclencheur de défaite R8/R9. Silhouette de danger lisible immédiatement à l'approche."
    },
    {
      "id": "vr-terrain",
      "entity_role": "terrain",
      "required": true,
      "description": "Sol / ligne de gameplay sur laquelle le joueur se repose (onGround) — surface de référence du saut R6, pas du décor. Tuiles side-scroller à bord franc."
    },
    {
      "id": "vr-hud-counter",
      "entity_role": "ui",
      "required": true,
      "description": "Compteur de pièces affiché en temps réel (R7), typographie pixel bitmap avec contour/ombre pour rester lisible sur tout fond, coin haut de l'écran."
    },
    {
      "id": "vr-victory-screen",
      "entity_role": "ui",
      "required": true,
      "description": "Écran de victoire plein cadre affiché en fin du dernier niveau (R11), dominante colorée chaude positive signalant l'issue avant le texte."
    },
    {
      "id": "vr-defeat-screen",
      "entity_role": "ui",
      "required": true,
      "description": "Écran de défaite plein cadre au contact d'un obstacle (R8), dominante rouge de sanction, cause de défaite non ambiguë (Ressent)."
    },
    {
      "id": "vr-background",
      "entity_role": "environment",
      "required": false,
      "description": "Décor de fond parallax désaturé, purement cosmétique — aucune Règle observable n'en dépend. Ne doit jamais concurrencer les éléments de gameplay au premier plan."
    }
  ]
}
```
