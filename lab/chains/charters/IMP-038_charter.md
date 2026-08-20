# CHARTER IMP-038 — sf_dataset_generator.py — Pool-SF Stockfish depth 14

**Lane:** AUDIT_REQUIRED
**Fichiers autorises:**
  - ml/sf_dataset_generator.py
  - lab/datasets/pool/pool_sf.jsonl

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF

500+ parties SF vs SF, engine_eval CP non-null, draw_rate < 20%

## NOTES

HumanGate 2026-06-02 : draw_rate observé 93.1% != critère. Acceptance relevé à <20%. Statut rouvert — pool_sf à régénérer (SF vs SF positions variées).

## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m py_compile ml/sf_dataset_generator.py
.\.venv312\Scripts\python.exe -m pytest -v
```

## RAPPORT FINAL ATTENDU

software_verdict: <resultat>
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED