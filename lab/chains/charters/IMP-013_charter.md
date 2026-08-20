# CHARTER IMP-013 — Collecte automatique golden_examples.jsonl

**Lane:** SAFE_AUTO
**Fichiers autorises:**
  - lab/chains/golden_collector.py

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF

Quand autoloop close un IMP, le charter est archive dans golden_examples.jsonl. Base du futur LoRA.

## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m py_compile lab/chains/golden_collector.py
.\.venv312\Scripts\python.exe -m pytest -v
```

## RAPPORT FINAL ATTENDU

software_verdict: <resultat>
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED