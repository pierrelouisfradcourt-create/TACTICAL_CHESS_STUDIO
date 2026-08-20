# CHARTER IMP-032 — Inspecter schéma teacher_tactical/solid/positional/finisher

**Lane:** SAFE_AUTO
**Fichiers autorises:**
  - lab/datasets/teacher_tactical.jsonl
  - lab/datasets/teacher_solid.jsonl
  - lab/datasets/teacher_positional.jsonl
  - lab/datasets/teacher_finisher.jsonl

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF

Rapport JSON : champs présents, % results non-draw, aaa_* non-null, décision RECYCLE/REGENERATE

## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m py_compile <fichier>
.\.venv312\Scripts\python.exe -m pytest -v
```

## RAPPORT FINAL ATTENDU

software_verdict: <resultat>
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED