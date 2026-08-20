Both candidate paths (`prisme/` and run root) were declined by the permission layer — the write to `product_snapshot.md` is not being granted in this dispatch, so I cannot persist the artifact to disk. I won't thrash across more paths. The artifact is fully drafted; I'm returning it inline so the orchestrator loses nothing, and flagging the write as a blocker.

---

## RAPPORT FINAL — s1-prisme · lens=back · shmup_slice-20260714a

**Ancre** : `lab/forge_runs/shmup_slice/charter.yaml` (étape 0, seule source de vérité validée) + `scripts/forge/contracts/SCHEMA.md` (lus tous deux avant action).

**Livrable** : `product_snapshot.md` — 4 sections obligatoires remplies, aucun « à définir ». Contenu prêt (ci-dessous), point de vue **produit fini / back-logique**.

### ⚠ Blocker d'exécution (fog harnais)
- **F-back-0 — Écriture refusée.** Le `Write` de `product_snapshot.md` a été refusé par la couche de permission aux deux emplacements plausibles :
  - `lab/forge_runs/shmup_slice/prisme/product_snapshot.md`
  - `lab/forge_runs/shmup_slice/product_snapshot.md`

  Mon contrat autorise `write/create: product_snapshot.md uniquement` mais la porte de dispatch n'a pas ouvert le grant. → **HumanGate / orchestrateur** : confirmer le chemin canonique attendu et accorder le write. La convention observée du panel est `prisme/prisme_lens_<lens>.md` (peers : ceo, front, game_designer) — si le collecteur attend `prisme_lens_back.md`, il faut m'autoriser ce nom exact, qui contredit le libellé littéral de mon `output_contract`. **À trancher, pas à deviner.**

### Contenu de l'artefact (product_snapshot)

**1. Ce que le joueur voit** — canvas vertical unique ; son vaisseau en bas (primitives canvas, jamais hors bornes) ; ennemis en formations à trajectoires lisibles et répétables (colonne invaders, sinusoïde, plongée kamikaze, tireurs périodiques) ; projectiles joueur↑ / ennemis↓ avec plafond simultané fixe ; un fond distinct par map ; HUD score + vies (3) + HP boss ; un boss unique/distinct par map ; overlay VICTOIRE (boss 3) / DÉFAITE (vies 0) + bouton Rejouer ; 3 maps réellement distinctes. Jamais : menu, difficulté, 2ᵉ arme, power-up, son.

**2. Ce qu'il fait** — déplace (2D clavier borné), tire (1 tir ↑), esquive (esquive toujours possible par construction), détruit ennemis (+score exact), abat chaque boss → transition immédiate score/vies conservés, encaisse (−1 vie exacte + invincibilité brève), gagne au 3ᵉ boss / perd à 0 vie, rejoue le run entier (map 1, score 0, 3 vies). Une session = un run.

**3. Ce qu'il ressent** — fiabilité (déterminisme + esquivabilité ⇒ mort = « j'ai raté », jamais piégé) ; montée en tension vers chaque boss ; continuité/enjeu (score+vies capitalisés, défaite renvoie au début) ; lisibilité (peu d'éléments, plafond de projectiles) ; accomplissement terminal franc (pas de « presque gagné »).

**4. Règles observables** — R1..R18, chacune ancrée à un critère de succès du charter (bornes vaisseau, 1 tir, destruction+score exact, −1 vie+i-frames, score monotone+conservé, vies=3 non-résurrection+conservées, HP boss exact jamais négatif, boss vaincu⇒level+1, victoire ssi boss 3⇒WON terminal + pas de map 4, défaite ssi vies==0, Rejouer=run entier, 3 maps distinctes en données, patterns esquivables toute frame, run solvable bout-en-bout, déterminisme de trace seed+inputs, plafond projectiles, hors-ligne sans persistance, onglet inactif=pause propre). Toutes formulées pour être testables plus tard par oracle.

### Fogs produit remontés (jugement Pierre, non tranchés en douce)
- **F-back-1** — valeurs de score par type d'ennemi (non fixées par le charter).
- **F-back-2** — durée exacte de l'invincibilité post-impact (« brève » qualitatif).
- **F-back-3** — aucun oracle de cohérence narrative à s1 ; validation = lecture humaine du charter.

### Verdicts
```
software_verdict : BLOCKED   (livrable non persisté — write product_snapshot.md refusé par la porte de permission ; F-back-0)
evidence_verdict : (non applicable — artefact narratif, aucune validation mécanique à s1)
claim_verdict    : NO_CLAIM_ALLOWED
```

Aucune règle inventée hors charter, aucun champ placeholder. **Action requise avant de clore s1** : accorder le write sur le chemin canonique de `product_snapshot.md` (voir F-back-0), puis je persiste l'artefact tel quel.