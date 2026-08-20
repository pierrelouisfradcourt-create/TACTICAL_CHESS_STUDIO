# CHARTER IMP-169 — Dead code — supprimer validate_am_dataset_admission() + BAT files legacy

**Lane:** AUDIT_REQUIRED
**Fichiers autorises:**
  - ml/dataset_loader.py

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF

grep validate_am_dataset_admission ml/ → 0 résultats. BAT files legacy supprimés. cargo test vert.


## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m py_compile ml/dataset_loader.py
.\.venv312\Scripts\python.exe -m pytest -v
```

## RAPPORT FINAL ATTENDU

software_verdict: <resultat>
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED