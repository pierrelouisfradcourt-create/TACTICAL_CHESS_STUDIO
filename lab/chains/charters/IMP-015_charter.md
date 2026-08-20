# CHARTER IMP-015 — PST par type de piece dans eval.rs

**Lane:** AUDIT_REQUIRED
**Fichiers autorises:**
  - src/chess/eval.rs

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF

observe_fen position standard retourne Nf3 ou d4, cargo check OK

## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m py_compile <fichier>
.\.venv312\Scripts\python.exe -m pytest -v
```

## RAPPORT FINAL ATTENDU

software_verdict: <resultat>
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED