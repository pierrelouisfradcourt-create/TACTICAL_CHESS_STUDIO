L'écriture de `product_snapshot.md` reste bloquée par une permission runtime non accordée (même blocage que le pass précédent consigné dans `prisme/prisme_control.md`). Mon contrat m'autorise le write sur ce fichier, mais la porte ne l'a pas encore laissé passer. Le contenu est **finalisé** — il se pose à `lab/forge_runs/shmup_slice/product_snapshot.md` dès autorisation. Restitution standard ci-dessous.

---

## Prisme Produit (s1) — shmup_slice · lens = CEO/produit

**Ancre** : `lab/forge_runs/shmup_slice/charter.yaml` (s0, verdict OK). Sources obligatoires lues avant toute action : `scripts/forge/contracts/SCHEMA.md` + charter s0. Artefact cadré strictement sur le scope figé (3 maps × 3 boss, un seul tir joueur, primitives canvas, aucun son, hors-ligne).

**Angle CEO** — valeur produit en un mot : **finissable et loyal**. Le problème joueur résolu = un shmup vertical nostalgie-arcade qui se lance en deux lignes, tient dans un onglet, tourne hors-ligne, et se **gagne** (3 maps, 3 boss, écran de victoire). Ce qui se vend n'est pas « ça compile » mais « ça se gagne » — garantie centrale : un bot déterministe **finit réellement** le run (démarcation nette vs survival_arena/collect_runner : verts en isolation, injouables au global).

**Livrable** : `product_snapshot.md`, 4 sections obligatoires remplies, zéro champ « à définir » :
1. **Ce que le joueur voit** — canvas vertical, vaisseau/tirs, ennemis en formations, tirs ennemis, boss+HP visible, fond distinct par map, HUD (score/vies/map), invincibilité visible, `#overlay`, `#restart`.
2. **Ce qu'il fait** — déplacement 2D clavier borné, tir unique vers le haut, esquive, encaisse 1 coup → 1 vie + invincibilité, affronte les boss, progression score/vies conservés, victoire = boss 3, restart run entier.
3. **Ce qu'il ressent** — contrôle/responsabilité, danger loyal (esquivable par construction), montée→dénouement ×3, poids de la progression, enjeu binaire clair, équité seedée, légèreté hors-ligne.
4. **28 règles observables (R1..R28)** — chacune adossée à un critère/objectif/action interdite du charter (traçabilité obj / CS-i / AI-i fournie), formulée pour être **strictement testable** en aval (égalités strictes `==`, oracle esquivabilité, bot de solvabilité, e2e Playwright, archi statique).

**Garde-fou respecté** : produit FINI décrit, jamais le chemin ; chaque règle observable ; aucune extension de scope ; aucune décision d'architecture/code ni décomposition en features (réservées à s3/s4).

### Verdicts
- `software_verdict` : sans objet (aucun code à s1).
- `evidence_verdict` : sans objet (aucun oracle mécanique sur un artefact narratif).
- `claim_verdict` : **NO_CLAIM_ALLOWED**.

### fog → HumanGate (Pierre)
Aucun oracle mécanique ne certifie un artefact narratif à s1. Relèvent du jugement humain :
1. Cohérence narrative Voit/Fait/Ressent ↔ charter.
2. **Valeurs de design bornées mais non fixées par le charter** (pas de déplacement, vitesses de tir, période tir ennemi, durée invincibilité, HP boss, score/ennemi, plafond projectiles) — le charter impose « déterministe et exact » + « esquivable par construction », pas la valeur numérique ; à trancher en s3/s4, jamais inventée ici.
3. Nombre de vagues/formations par map (borné par esquivabilité R8 + solvabilité R28, non chiffré).
4. Esthétique fine des primitives canvas / fonds (dans « primitives uniquement, aucun asset externe »).

### Action requise
**Autoriser l'écriture de `lab/forge_runs/shmup_slice/product_snapshot.md`** (chemin suivant la convention des runs existantes : snapshot à la racine de la run). Le contenu complet est prêt et sera posé sans modification dès le go.