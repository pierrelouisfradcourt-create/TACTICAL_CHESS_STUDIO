# CHARTER IMP-007 — Fix draw structurel #NEW-02 (ouverture aléatoire)

**Lane:** AUDIT_REQUIRED
**Fichiers autorises:**
  - src/simulation/simulation_runner.rs

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF

Brancher ouverture aléatoire 2-8 plies dans le benchmark pour casser le 100% draws search vs search.

## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m py_compile <fichier>
.\.venv312\Scripts\python.exe -m pytest -v
```

## RAPPORT FINAL ATTENDU

software_verdict: <resultat>
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED