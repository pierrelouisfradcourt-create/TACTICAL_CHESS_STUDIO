# CHARTER IMP-016 — Livre d ouvertures minimal 50-200 coups

**Lane:** AUDIT_REQUIRED
**Fichiers autorises:**
  - src/chess/opening_book.rs
  - lab/data/opening_book.jsonl

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF

Rocky joue e4 ou d4 au coup 1, moves coherents 10 premiers coups, cargo check OK

## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m py_compile <fichier>
.\.venv312\Scripts\python.exe -m pytest -v
```

## RAPPORT FINAL ATTENDU

software_verdict: <resultat>
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED