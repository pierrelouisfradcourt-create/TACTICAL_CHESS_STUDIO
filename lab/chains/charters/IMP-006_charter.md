# CHARTER IMP-006 — puzzle_eval --output flag

**Lane:** AUDIT_REQUIRED
**Fichiers autorises:**
  - src/tool/puzzle_eval.rs

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF

Ajouter flag --output <path> à puzzle_eval pour écrire le rapport JSON à un chemin custom.

## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m py_compile <fichier>
.\.venv312\Scripts\python.exe -m pytest -v
```

## RAPPORT FINAL ATTENDU

software_verdict: <resultat>
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED