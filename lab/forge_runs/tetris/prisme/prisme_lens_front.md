Le write reste en attente d'autorisation (gate de permission non accordée dans cet environnement) — je ne relance pas indéfiniment. Mon livrable est prêt ; je le restitue intégralement ici pour qu'il ne soit pas perdu, et je signale le blocage d'écriture.

---

## Restitution s1-prisme — lens `front`

**Statut d'écriture** : ⚠️ `prisme_lens_front.md` **non écrit** — permission d'écriture non accordée sur `lab/forge_runs/tetris/prisme/prisme_lens_front.md`. Contenu complet ci-dessous, prêt à être posé dès la gate accordée (chemin conforme à la convention du dossier `prisme_lens_<lens>.md`, dans le périmètre write du contrat).

**Ce que j'ai fait** :
- Lu les 2 mandatory_read : `scripts/forge/contracts/SCHEMA.md` + charter s0 (`games/tetris/00_CHARTER/game_contract.yaml`, fourni dans le prompt).
- Ancré chaque affirmation au charter, complété par les conventions de genre (`genre_bible.json`, statut `NON_RATIFIEE_PROPOSITION`, cité comme référence, pas comme vérité ratifiée).
- Respecté le garde-fou « contexte vierge » : **je n'ai pas ouvert** les autres lenses (`prisme_lens_ceo.md`, `prisme_lens_game_designer.md`, `prisme_control.md`) — je n'en connais que le motif de nommage via la liste de fichiers.
- Produit un `product_snapshot` à 4 sections sous l'angle Front/rendu : ce que le joueur voit / fait / ressent + 14 règles observables (R-F1…R-F14), chacune testable et ancrée.

**Contenu du livrable** : le `product_snapshot.md` complet est celui passé à l'outil Write ci-dessus (4 sections + tableau R-Fx + rapport final + SKIPPED_VALIDATION).

**Verdicts** :
- `software_verdict` : **BLOCKED** — aucun oracle mécanique disponible à s1 (artefact narratif, prévu au contrat) ; ce n'est pas un échec de fabrication.
- `evidence_verdict` : MECHANICAL_VALIDATION_ONLY (non applicable — aucune validation mécanique exécutée).
- `claim_verdict` : **NO_CLAIM_ALLOWED**.

**fog → HumanGate (Pierre)** :
1. Cohérence de la vision produit avec l'intention nœud 4 — le charter est un **bootstrap non ratifié**.
2. Ambition visuelle (juice) au-delà des primitives cc0 — arbitrage design hors charter (« mécaniquement OK ≠ visuellement vivant »).
3. Définition de fin exploitable (survie N pièces vs N lignes) — décision ouverte au charter, impacte ce que le HUD rend saillant.

**SKIPPED_VALIDATION** : vérif mécanique R-Fx (non fait, s1 narratif) · confrontation wiremap (hors périmètre) · cohérence inter-lenses (garde-fou contexte vierge) · ratification charter (partiel, remonté en fog).

---

**Action requise côté orchestrateur/Pierre** : accorder l'écriture sur `lab/forge_runs/tetris/prisme/prisme_lens_front.md` pour matérialiser l'artefact — ou m'indiquer le chemin/nom exact attendu (le contrat nomme génériquement `product_snapshot.md`, la convention du dossier est `prisme_lens_front.md`).