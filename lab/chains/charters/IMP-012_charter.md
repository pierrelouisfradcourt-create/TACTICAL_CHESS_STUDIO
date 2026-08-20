# CHARTER IMP-012 — STUDIO_CONTEXT.md auto-genere pour Mistral/Devstral

**Lane:** SAFE_AUTO
**Fichiers autorises:**
  - lab/chains/studio_context_builder.py

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF

Script qui derive STUDIO_CONTEXT.md depuis ledger+manifest. Injecte en tete prompts Mistral. Regenere a chaque kaizen metrics.

## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m py_compile lab/chains/studio_context_builder.py
.\.venv312\Scripts\python.exe -m pytest -v
```

## RAPPORT FINAL ATTENDU

software_verdict: <resultat>
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED