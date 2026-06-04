# CHARTER IMP-043 — Valider pool_sf draw_rate < 20% sur 500 parties reelles

**Lane:** AUDIT_REQUIRED
**Fichiers autorises:**
  (aucun fichier specifie)

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF

Valider que pool_sf.jsonl atteint draw_rate < 20% sur 500 parties réelles.
Ou, si le critère est inatteignable, décider d'abandonner pool_sf comme source.

## NOTES

**Diagnostic IMP-043 — 2026-06-03**

État observé : pool_sf_manifest.json → nb_games=50, draw_rate=0.94 (47/50 draws).

Cause racine : `sf_dataset_generator.py` utilise un seul processus SF avec
`Skill Level: 15` pour les deux camps. L'asymétrie (depth=14 fort vs time=1.0s faible)
est insuffisante — SF à 1 seconde reste extrêmement fort → parties quasi-nulles.

Régénération possible uniquement avec deux moteurs séparés à niveaux très différents
(ex. Skill 15/depth14 vs Skill 3/depth1), non disponibles dans l'infrastructure actuelle.

**Décision HumanGate (2026-06-03) : Option B — Abandonner pool_sf**

Les 4 pools existants (dataset_a_rocky, _b_quality, _c_elite, _d_puzzles + pool_2400)
couvrent la diversité requise. pool_sf exclu du pipeline ML.

**Tests (116 passed, 4 failed pré-existants, non liés à IMP-043)**

## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m pytest -v
```

## RAPPORT FINAL ATTENDU

software_verdict: ABANDONED — pool_sf exclu du pipeline (draw_rate=94%, critère <20% non atteint, régénération impossible sans infra SF asymétrique)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED
