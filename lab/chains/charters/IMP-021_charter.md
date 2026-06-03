# CHARTER IMP-021 — Developpement dans eval statique

**Lane:** AUDIT_REQUIRED
**Fichiers autorises:**
  - src/chess/eval.rs

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF

Rocky ne laisse pas pieces mineures sur cases depart au coup 10, cargo check OK

## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m py_compile <fichier>
.\.venv312\Scripts\python.exe -m pytest -v
```

## RAPPORT FINAL ATTENDU

software_verdict: <resultat>
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED