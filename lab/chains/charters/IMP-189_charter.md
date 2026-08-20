# CHARTER IMP-189 — studio_core --ir PATH au CLI + sweep balance sur variants/*.json

**Lane:** SAFE_AUTO
**Fichiers autorises:**
  - studio_core/main.py
  - studio_core/sim/headless_sim.py

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF

main.py accepte --ir PATH et le forwarde a run_simulation(ir_path); les 10 variants/*.json sont simulables et un sweep produit une table de flags balance par variant

## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m py_compile studio_core/main.py
.\.venv312\Scripts\python.exe -m py_compile studio_core/sim/headless_sim.py
.\.venv312\Scripts\python.exe -m pytest -v
```

## RAPPORT FINAL ATTENDU

software_verdict: <resultat>
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED