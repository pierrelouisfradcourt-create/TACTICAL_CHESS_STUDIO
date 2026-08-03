Both candidate paths were declined by the permission layer — the write grant for `product_snapshot.md` was not opened in this dispatch (same behavior as the shmup_slice precedent). I won't thrash across more paths. The artifact is fully drafted; I return it inline so the orchestrator loses nothing, and flag the write as a blocker.

---

## RAPPORT FINAL — s1-prisme · lens=back · tetris-witness-20260803-175558

**Ancre** : `charter.yaml` (étape 0, seule source de vérité fournie au dispatch) + `games/tetris/01_DESIGN/genre_bible.json` (codifie les `genre.tetris.*` que le charter cite par identifiant) + `SCHEMA.md` (`contracts/` et `standard/`, lus avant action). Je n'ai **pas** lu le travail des autres lenses ni le contrôle (interdit — contexte vierge respecté).

### ⚠ Blocker d'exécution (fog harnais) — F-back-0
- **Écriture refusée.** Le `Write` a été refusé par la couche de permission aux deux noms/emplacements plausibles :
  - `lab/forge_runs/tetris/prisme/prisme_lens_back.md` (convention observée des peers `ceo`/`front`/`game_designer`)
  - `lab/forge_runs/tetris/prisme/product_snapshot.md` (nom **littéral** de mon `output_contract`)
- Mon contrat autorise `write/create: product_snapshot.md uniquement`, mais la porte de dispatch n'a pas ouvert le grant. → **HumanGate / orchestrateur** : confirmer le chemin+nom canonique et accorder le write ; je persiste alors l'artefact **tel quel**, sans le retoucher.

### Contenu de l'artefact `product_snapshot` (4 sections obligatoires, prêt)

**1. Ce que le joueur voit** — l'écran EST l'état, rendu en permanence sans action (`full_information_single_screen`) : une **grille discrète** (chaque cellule vide/occupée, jamais fractionnaire) ; une **pièce active** (1 des 7 tetrominos) distincte de la **pile figée** immobile ; l'**aperçu** de la prochaine pièce ; **score + compteur de lignes** ; à la fin, un état de **défaite** (jamais de victoire — `no_victory_in_marathon`).

**2. Ce qu'il fait** — jeu **fermé** de 3 transitions, toutes sur la **seule pièce active**, jamais sur la pile (`player_controls_active_piece_only`) : translater (borné murs+pile), tourner (refusée si collision — `rotation_bounded_by_terrain`), accélérer la chute. Le reste (gravité 1 case/tick, figement, spawn, clear) arrive sans lui. But observable : compléter des rangées (seul moyen de libérer de l'espace — `line_clear_compaction`) pour repousser la fin et maximiser le score, avec l'arbitrage du multi-clear superlinéaire.

**3. Ce qu'il ressent** — chaque ressenti naît d'un invariant : **équité/poids de la décision** (pile irréversible + gravité déterministe ⇒ aucun hasard qui triche) ; **tension spatiale croissante** (seul relâchement = line clear) ; **gourmandise sous risque** (récompense superlinéaire vs blocage) ; **fatalité assumée** (pas de victoire, on retarde l'inévitable) ; **lisibilité totale** (toute mort = « ma faute »).

**4. Règles observables (testables)** — R1 grille discrète [charter] · R2 gravité 1 case/tick [`discrete_gravity`] · R3 pile figée ne change que par line-clear [`irreversible_stack`] · R4 rangée pleine disparaît + compaction, seul moyen de vider [`line_clear_compaction`] · R5 pièce ∈ {I,O,T,S,Z,J,L} exact [`seven_tetrominoes`] · R6 rotation refusée si collision, état inchangé [`rotation_bounded_by_terrain`] · R7 entrées joueur ∈ {translation, rotation, accélération}, aucune sur la pile [`player_controls_active_piece_only`] · R8 pièce qui ne peut plus descendre → fige puis nouvelle pièce [`irreversible_stack`] · R9 fin **ssi** une pièce entrante ne peut pas apparaître légalement [`loss_by_blocking`] · R10 aucun état « gagné » en marathon [`no_victory_in_marathon`] · R11 score/ligne strictement croissant avec N [`superlinear_multi_clear_reward`] · R12 état de décision exposé en permanence [`full_information_single_screen`] · R13 déterminisme : graine+inputs fixés → trace identique [back-lens, prérequis du descripteur `proof:`]. *Distinction tenue :* R5 fixe l'**ensemble** des pièces, pas leur **distribution** (sac-de-7 = fog F-back-4).

### Besoin HumanGate — fogs produit (jugement Pierre, non tranchés en douce)
Aucun oracle mécanique ne valide un artefact narratif à s1 ; validation = cohérence charter jugée par un humain. Non fermé par les ancres, donc **non inventé** :
- **F-back-1** dimensions grille (W×H) · **F-back-2** aperçu/hold/couleurs · **F-back-3** courbe de vitesse gravité/niveaux · **F-back-4** distribution du générateur (seul le set de 7 est genre ; sac-de-7 = candidat `adds` à trancher s3/s4) · **F-back-5** système de rotation exact (wall-kicks) · **F-back-6** spec exacte du déterminisme (source graine RNG) — requise pour que `proof.mutation`/`proof.solvability` soient interprétables avant s9 · **F-back-7** **définition de la solvabilité** (charter la déclare décision ouverte : survie N pièces vs N lignes) · **F-back-8** lock delay · **F-back-9** *structurel* : charter ET genre_bible sont tous deux `PROPOSITION/NON_RATIFIÉE` ⇒ la ratification du terrain sous ce snapshot est elle-même un HumanGate amont · **F-back-10** nom/chemin canonique du livrable (voir F-back-0).

### Verdicts
```
software_verdict : BLOCKED   (livrable NON persisté — write product_snapshot.md refusé par la
                              porte de permission aux deux noms plausibles ; F-back-0. Le contenu
                              est complet et prêt, il ne manque que le grant d'écriture.)
evidence_verdict : MECHANICAL_VALIDATION_ONLY  (seul fait mécanique disponible à s1 = existence/
                              structure du fichier ; aucun oracle de cohérence narrative n'existe.)
claim_verdict    : NO_CLAIM_ALLOWED  (justesse du snapshot vs intention produit = jugement humain,
                              remonté en fog à HumanGate, jamais auto-certifié.)
```

### SKIPPED_VALIDATION
| Item (quoi) | Périmètre (où) | Statut | Raison (pourquoi) |
|---|---|---|---|
| Persistance disque du livrable | `prisme/product_snapshot.md` | **non fait — bloqué** | write refusé par la porte de permission aux 2 noms (F-back-0) ; contenu prêt, en attente du grant. |
| Validation de cohérence narrative charter ↔ snapshot par oracle | product_snapshot / lens back | non fait | aucun oracle mécanique pour un artefact narratif à s1 ; validation = lecture humaine (F-back-9). Décision assumée. |
| Fermeture des paramètres de design non fixés (dimensions, vitesse, rotation, distribution, lock delay, solvabilité) | sections 1–2 + R-observables | non fait (volontaire) | hors périmètre s1 (décompo = s3, design = étapes ultérieures) ET non fixés par les ancres → remontés en fog F-back-1..8 plutôt qu'inventés. |
| Vérification API réelle de la brique `sys-grid-nav-m01` vs besoin grille | budget / réutilisation | hors périmètre | le charter la place « à trancher à l'étape s3/s4, sur lecture du code », pas à s1. |

**Action requise avant de clore s1** : accorder le write sur le chemin/nom canonique de `product_snapshot.md` (F-back-0/F-back-10), après quoi je persiste l'artefact ci-dessus **inchangé**. Aucune règle inventée hors charter/genre_bible ; aucun champ « à définir ».