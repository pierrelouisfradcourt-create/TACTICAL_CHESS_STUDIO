# CHARTER IMP-005 — Implémenter fusion_matrix_chain (merge signaux)

**Lane:** SAFE_AUTO
**Fichiers autorises:**
  - lab/chains/fusion_matrix_chain.py

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF

Merge outputs de doc_hygiene + run_chain + scripts_route. Produit fusion_matrix (markdown table: verdict/evidence/risk/contradiction).

## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m py_compile lab/chains/fusion_matrix_chain.py
.\.venv312\Scripts\python.exe -m pytest -v
```

## RAPPORT FINAL ATTENDU

software_verdict: <resultat>
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED