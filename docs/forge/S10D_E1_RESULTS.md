# RÉSULTATS — E1 « intégration confirmatoire s10d » (contrat s10d-oracle-visual)

- **Date d'exécution** : 2026-07-12
- **Protocole** : `S10D_CONTRACT_PROPOSAL.md` v2 §6 (critères re-ratifiés Pierre — « go E1 »
  après lecture de la v2 amendée) ; adjudication red-team : `S10D_REDTEAM_ADJUDICATION.md`.
- **Exécutant** : orchestrateur, HORS contrat s10d (F-D7). E1 one-shot, exécutée une fois.

## Verdict calculé mécaniquement (critères §6 figés avant run)

```
experiment_outcome: SUCCESS
critère 1 — reproductibilité hash canonique : breakout IDENTIQUE ×2 (5ab458ef…118f)
                                              menagerie IDENTIQUE ×2 (60d1de3f…3602)
                                              re-runs techniques consommés : 0/1 par cible
critère 2 — couverture minimale : 4/4 familles measured non-null sur CHAQUE cible (×2 runs)
critère 3 — non-nuisance : manifestes lab/forge_runs/ (repo principal + worktree)
                           IDENTIQUES octet pre/post
critère 4 — comptabilité FP : 0 signal_detected dans le périmètre A1/A2/A3/A5
                              sur les 2 cibles → rien à classer (règle pré-enregistrée
                              sans objet, consigné)
préconditions : worktree présent, pinné 87e9ec4 · fixtures re-collectées + check exit 0
                aux DEUX bornes · P0 exit 0 ×2 (logs conservés)
gels : capteur 3/3 IDENTIQUE · jeux cibles IDENTIQUES (12 + 36 fichiers, hors e2e-shots) ·
       aucune divergence
```

## Conclusion (maximale autorisée §6 — rien de plus)

*L'intégration contractuelle de s10d est confirmée inoffensive et reproductible sur les
deux cibles déjà connues.* E1 était confirmatoire (rapports capteur préexistants déclarés,
§1 du contrat) : AUCUNE conclusion de détection, rien de généralisable.

## Notes de run (honnêteté d'exécution)

1. **Non-run environnemental documenté** : la première tentative P0 menagerie a échoué
   sur une erreur de chemin shell (`cd` relatif depuis un cwd précédent) — l'oracle n'a
   JAMAIS démarré (exit 1 du shell, pas du run-oracle). Relance immédiate chemin absolu :
   exit 0. Aucun budget re-run consommé (le re-run borné vise un oracle qui a tourné).
2. **Worktree menagerie** : pinné `87e9ec4` mais `games/menagerie_tactics/` y est
   **non tracké** (status consigné) — le pin git ne gèle donc pas le jeu ; le gel effectif
   est le manifeste sha256 des 36 fichiers (identique pre/post, critère satisfait).
3. `A1_contrast:#overlayTitle` = `metric_unavailable` sur breakout (élément masqué à la
   mesure) — identique à P1/P1.1, compté à part, ni signal ni FP. Menagerie : 0
   `metric_unavailable`.
4. Sorties vivantes réécrites comme déclaré (F-T5) : `lab/forge_sensors/breakout/` et
   `.../menagerie_tactics/`. L'évidence figée P1/P1.1 (`_p11_evidence/`, `_probe_*`)
   n'a pas été touchée.

## Preuves (toutes sous `lab/forge_sensors/_e1_evidence/`)

- `sha_capteur_pre.txt` / `sha_capteur_post.txt` — gel capteur 3 fichiers, identiques.
- `sha_depouilleur.txt` + `depouille_e1.mjs` — dépouilleur déterministe zéro-paramètre,
  écrit AVANT le premier run capteur (projection canonique §6 transcrite).
- `manifest_jeu_breakout_pre/post.txt` · `manifest_jeu_menagerie_pre/post.txt` — gels jeux.
- `manifest_forge_runs_main_pre/post.txt` · `manifest_forge_runs_worktree_pre/post.txt`
  — non-nuisance, deux arbres.
- `worktree_menagerie_pin.txt` / `worktree_menagerie_status.txt` — précondition + dirty state.
- `p0_breakout.log` / `p0_menagerie.log` — exit 0, séquentiel.
- `fixtures_recollect_pre/post.log` + `fixtures_check_pre/post.log` — bornes, exit 0.
- `collect_breakout_run1/2.log` · `collect_menagerie_run1/2.log` — les 4 runs capteur.
- `depouille_breakout_run1/2.json` · `depouille_menagerie_run1/2.json` — projections
  canoniques + hashes + couverture (rejouables).

## Rapport de charter

```
software_verdict: OK — exécution du capteur (rapports produits, invariants de format tenus,
  gels vérifiés) ; ne porte PAS sur la qualité des jeux (contrat s10d)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
advisory_only: true
experiment_outcome: SUCCESS (calculé mécaniquement, critères §6 v2)
```
