# CHARTER IMP-014 — Fix teacher_uci : brancher random_opening + augmenter turn_cap

**Lane:** AUDIT_REQUIRED
**Fichiers autorises:**
  - src/simulation/simulation_runner.rs

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF

random_opening=true dans teacher_uci et benchmark, lab_hard_turn_cap >= 200, parties avec vrais resultats

## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m py_compile <fichier>
.\.venv312\Scripts\python.exe -m pytest -v
```

## RAPPORT FINAL ATTENDU

software_verdict: <resultat>
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED