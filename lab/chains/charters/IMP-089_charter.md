# CHARTER IMP-089 — Ajouter attribut title aux boutons LLM dans autopilot.py
# Lane : SAFE_AUTO
# Fichier autorise : autopilot.py uniquement
# claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF
Ajouter un attribut title HTML sur chaque bouton qui appelle lm_call()
ou un endpoint LLM dans autopilot.py. Visible au survol de la souris.
Format : "Qwen2.5-14B - ~3s" ou "Qwen2.5-14B - CEO Brief"

## SPEC
1. Identifier tous les boutons HTML dans autopilot.py qui declenchent
   un appel LLM : CEO Brief, Roadmap, Analyser, Transformer en IMPs...
2. Ajouter attribut title="Qwen2.5-14B - ~3s" sur chacun
3. Pour le CEO Brief : title="Qwen2.5-14B - CEO Brief (~3s)"
4. Pour l autoloop : title="Qwen2.5-14B - autoloop lane"

## VALIDATION
.venv312\Scripts\python.exe -m py_compile autopilot.py

## RAPPORT FINAL
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
