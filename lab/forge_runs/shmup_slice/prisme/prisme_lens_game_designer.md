Both write attempts are declined by the runtime permission gate — the identical blocker the prior **ceo** lens and **control** passes hit (they reported the same in `prisme/prisme_lens_ceo.md` and `prisme/prisme_control.md`). I won't retry verbatim. My artifact is **finalized**; I deliver it here for the orchestrator to persist, and I raise the write-path blocker as a fog.

---

## Prisme Produit (s1) — shmup_slice · lens = **game_designer**

**Ancre** : `lab/forge_runs/shmup_slice/charter.yaml` (s0, verdict OK). Sources obligatoires lues avant toute action : `scripts/forge/contracts/SCHEMA.md` + charter s0. Cadre strictement tenu au scope figé (3 maps × 3 boss en données, UN tir joueur, primitives canvas, aucun son, hors-ligne, déterministe/solvable).

**Angle imposé (game designer)** — le snapshot est structuré autour de la **boucle** (`bouger → tirer → esquiver → tuer → boss → map suivante`, ×3, une seule fin gagnante), de la **courbe de difficulté** (trois arches tension→dénouement, escalade d'ensemble vers le boss 3) et de **ce qui rend l'expérience satisfaisante** (maîtrise attribuable, danger *loyal* esquivable par construction, progression qui pèse, équité seedée apprenable).

**Livrable prêt à poser** : `product_snapshot.md`, **4 sections obligatoires remplies** (`ce_que_le_joueur_voit`, `ce_qu_il_fait`, `ce_qu_il_ressent`, `regles_observables[]` = **R1..R29**), **zéro champ « à définir »**. Chaque règle est observable → testable en aval (bot de solvabilité, vérif d'esquivabilité, propriétés seedées, e2e Playwright, archi statique, égalités strictes). Chaque règle cite son ancre charter (`obj` / `CS-n` / `AI-n`). Le contenu intégral est écrit ci-dessus dans les deux tentatives d'écriture (identique dans les deux) — prêt à déposer sans modification à `lab/forge_runs/shmup_slice/product_snapshot.md`.

**Garde-fou respecté** : produit FINI décrit, jamais le chemin ; aucune décomposition en features (s3), aucune décision d'archi/code (s4), aucun world scan (s2) ; aucune extension du scope figé.

### Verdicts
- `software_verdict` : **sans objet** — aucun code produit à s1.
- `evidence_verdict` : **sans objet** — aucun oracle mécanique ne s'exécute sur un artefact narratif à s1.
- `claim_verdict` : **NO_CLAIM_ALLOWED**.

### fog → HumanGate (Pierre)
Aucun oracle mécanique ne certifie un artefact narratif à s1. Relèvent du **jugement humain** :
1. **Blocage d'écriture (opérationnel)** — la porte runtime refuse l'écriture de `product_snapshot.md` (racine run) **et** du fichier lens dans `prisme/`. Même blocage que les passes ceo/control. À trancher : accorder la permission d'écriture sur le chemin de sortie, OU officialiser une convention de dépôt. Le contenu est finalisé, prêt à poser tel quel.
2. **Cohérence narrative** Voit/Fait/Ressent ↔ charter (ancre non mécanique).
3. **Valeurs de design bornées mais non fixées par le charter** — pas de déplacement, cadence de tir joueur, période de tir ennemi, durée d'invincibilité, HP par boss, score par ennemi, valeur du plafond de projectiles. Le charter impose « déterministe, exact, esquivable par construction », **pas la valeur** → à trancher en s3/s4, jamais inventée ici.
4. **Densité par map** — nombre de vagues/formations, borné par R8 (esquivabilité) et R29 (solvabilité), non chiffré.
5. **Réglage de la courbe de difficulté** — l'escalade map 1→2→3 est un choix de *feel*, à valider au playtest, hors oracle.
6. **Esthétique fine des primitives canvas / fonds** — dans « primitives uniquement, aucun asset externe ».

**Vocabulaire de verdict** : OK / FAIL / BLOCKED uniquement.