# CHARTER IMP-004 — Implémenter scripts_route_chain (audit chain)

**Lane:** SAFE_AUTO
**Fichiers autorises:**
  - lab/chains/scripts_route_chain.py

## REGLES ABSOLUES

- Aucun git write.
- Tests obligatoires.
- claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF

Lit scripts/uxpilote, scripts/studioV2, scripts/control_plane. Détecte path drift, candidates, stale refs. Produit scripts_route_packet.

## VALIDATION

```powershell
.\.venv312\Scripts\python.exe -m py_compile lab/chains/scripts_route_chain.py
.\.venv312\Scripts\python.exe -m pytest -v
```

## RAPPORT FINAL ATTENDU

software_verdict: <resultat>
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict:    NO_CLAIM_ALLOWED