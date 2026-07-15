La rédaction de `product_snapshot.md` est prête et complète, mais l'écriture attend ton autorisation (permission non accordée sur le chemin). Le contenu est finalisé — dès que tu valides l'écriture, il est posé à `lab/forge_runs/shmup_slice/product_snapshot.md`.

Voici la restitution standard, en attendant.

---

## Prisme Produit (s1) — shmup_slice

**Ancre** : `lab/forge_runs/shmup_slice/charter.yaml` (étape 0, verdict s0 = OK). J'ai lu les deux sources obligatoires — `scripts/forge/contracts/SCHEMA.md` et le charter s0 — avant toute action, et cadré l'artefact strictement sur le scope figé (3 maps × 3 boss, un seul tir joueur, primitives canvas, aucun son).

**Livrable** : `product_snapshot.md`, 4 sections obligatoires remplies, zéro champ « à définir » :
1. **Ce que le joueur voit** — canvas vertical, vaisseau/tirs/ennemis en formations/tirs ennemis/boss+HP, fond distinct par map, HUD, invincibilité visible, `#overlay`, `#restart`.
2. **Ce qu'il fait** — déplacement 2D clavier borné, tir unique vers le haut, esquive, encaisse 1 coup→1 vie + invincibilité, boss, progression score/vies conservés, victoire=boss 3, restart run entier.
3. **Ce qu'il ressent** — contrôle/responsabilité, danger loyal (esquivable par construction), tension→dénouement par map, progression qui compte, enjeu clair, équité seedée, hors-ligne.
4. **28 Règles observables (R1..R28)** — chacune adossée à un critère/objectif/action interdite du charter (table de traçabilité fournie), formulée pour être **strictement testable** en aval (assertions strictes `==`, oracle esquivabilité, solvabilité bot, e2e Playwright, archi statique).

**Garde-fou respecté** : produit FINI décrit, jamais le chemin ; chaque règle observable ; aucune extension de scope ; aucune décision d'architecture/code (réservée à s3/s4).

### Verdict
- `software_verdict` : sans objet (aucun code produit à l'étape 1).
- `evidence_verdict` : sans objet (aucun oracle mécanique ne s'exécute sur un artefact narratif).
- `claim_verdict` : **NO_CLAIM_ALLOWED**.

### fog → HumanGate (Pierre)
Aucun oracle mécanique ne certifie un artefact narratif à s1. Remontent au jugement humain :
1. Cohérence narrative Voit/Fait/Ressent ↔ charter.
2. **Valeurs de design bornées mais non fixées** par le charter (pas de déplacement, vitesses de tir, période tir ennemi, durée invincibilité, HP boss, score/ennemi, plafond projectiles) — le charter impose « déterministe et exact », pas la valeur.
3. Nombre de vagues/formations par map (borné par esquivabilité R8 + solvabilité R28).
4. Esthétique fine des primitives canvas / fonds.

**Action requise de ta part** : autoriser l'écriture du fichier `lab/forge_runs/shmup_slice/product_snapshot.md` (ou m'indiquer un autre chemin — j'ai suivi la convention des runs existantes : snapshot à la racine de la run, le dossier `prisme/` étant vide). Je le pose dès ton go.