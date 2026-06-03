# CHARTER IMP-036 — Audit puzzles existants + distributions AAA teacher_*

**Lane:** SAFE_AUTO
**Fichiers autorises:**
  - lab/datasets/candidate_games_for_triage.csv
  - lab/pedagogy_db/PEDAGOGICAL_DB_TACTICS.pgn

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF

Format CSV identifié, nb puzzles, thèmes présents, distributions top_gap/aaa_confidence teacher_*

## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m py_compile <fichier>
.\.venv312\Scripts\python.exe -m pytest -v
```

## RAPPORT FINAL ATTENDU

software_verdict: <resultat>
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED