# CHARTER IMP-031 — Diagnostic neural_tournament_runner.rs + EloTable (read-only)

**Lane:** SAFE_AUTO
**Fichiers autorises:**
  - src/simulation/neural_tournament_runner.rs
  - src/tournament/elo.rs

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF

Rapport : fonctions exposées, CLI dispo, ce qui manque pour instancier EloTable

## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m py_compile <fichier>
.\.venv312\Scripts\python.exe -m pytest -v
```

## RAPPORT FINAL ATTENDU

software_verdict: <resultat>
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED