La création de `product_snapshot.md` est en attente d'autorisation d'écriture (gate harnais). Le contenu est prêt et respecte le contrat ; dès que l'écriture est autorisée, l'artefact est livré tel quel.

## Restitution — étape s1-prisme (lens=joueur)

**Livrable** : `lab/forge_runs/shmup_slice/product_snapshot.md` — 4 sections remplies, aucun flou, aucun « à définir ».

**Ancre** : `charter.yaml` (étape 0). Chaque énoncé des 3 sections d'expérience et les **22 règles observables** sont rattachés à une clause précise du charter (colonne « Rattachement charter »).

**Contenu résumé** :
- **Ce que le joueur voit** — page-jeu web, vaisseau en primitives canvas, 3 décors distincts défilant de façon cosmétique, ennemis en formations à motifs lisibles, projectiles séparés haut/bas, score + vies, boss distinct à HP visible, clignotement d'invincibilité, écrans victoire/défaite + bouton restart, silence total.
- **Ce qu'il fait** — déplacement clavier 2D borné, tir unique vers le haut, esquive, destruction pour score, combats de boss, enchaînement immédiat des maps en conservant score/vies, restart du run entier à la défaite, victoire au 3e boss.
- **Ce qu'il ressent** — tension pré-boss, **équité totale** (esquive toujours possible = cœur du ressenti), progression qui compte, frustration lisible, lisibilité constante, variété des 3 maps, récompense finale nette.
- **Règles observables R1–R22** — chacune observable/testable (vies=3, bornes, tir unique, score exact/monotone, −1 vie exacte + invincibilité, boss HP exact jamais négatif, esquivabilité, transition immédiate, 3 maps/3 boss distincts, victoire/défaite terminales, restart run entier, pas de 4e map, clavier only, silence, primitives, déterminisme, plafond projectiles).

**Verdict (Règle de restitution)** — artefact narratif, **aucun oracle mécanique disponible** à cette étape :
```
claim_verdict: NO_CLAIM_ALLOWED
```
**Fogs → HumanGate (Pierre)** :
- **F1** — fidélité produit↔charter non prouvable mécaniquement (lecture humaine requise).
- **F2** — la section « ressenti » est intrinsèquement non testable (proxy mécanique unique : R11 esquivabilité) → à valider en playtest.
- **F3** — partis pris assumés par défaut du charter (jeu **silencieux**, **sans écran-titre/menu**) : confirmer ou amender le charter.
- **F4** — R21 (déterminisme) peu perceptible côté joueur : classée observable-par-test, pas ressenti — confirmer ce placement.

**Garde-fous respectés** : produit fini décrit (jamais le chemin) ; pas de décomposition en features (étape 3) ; pas d'architecture/code ; pas de world scan ; contexte vierge (autres lenses/contrôle non lus) ; écriture limitée à `product_snapshot.md`.

En attente : autorisation d'écriture pour matérialiser le fichier.