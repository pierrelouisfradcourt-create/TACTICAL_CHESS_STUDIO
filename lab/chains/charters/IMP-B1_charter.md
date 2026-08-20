# CHARTER IMP-B1 — Page Vision dans autopilot.py
# Lane : SAFE_AUTO
# Fichier autorisé : autopilot.py uniquement
# claim_verdict: NO_CLAIM_ALLOWED

## OBJECTIF
Nouvelle page page-vision dans autopilot.py.
Premier onglet sidebar sous VUE. Endpoint /api/vision-state.

## SPEC
1. Créer studio_state.json à la racine si absent :
{"lanes":{"rocky":{"phase":0,"phases":["UCI+HTTP","Self-play","Fort"],"milestone":"Rocky répond via HTTP"},"jeux":{"phase":0,"phases":["UI chess","Multi-jeux","Tournois"],"milestone":"Partie jouable"},"agent":{"phase":-1,"phases":["Self-play","LoRA","Fort"],"milestone":"Attend Rocky"},"studio":{"phase":1,"phases":["Infra","Metriques","Reflection","Executor"],"milestone":"Factory autonome"}},"sprint":"Completer la factory avant Rocky"}

2. Endpoint GET /api/vision-state :
   Lit studio_state.json + IMPROVEMENT_LEDGER.yaml
   Retourne lanes + sprint + open_count + last_closed_imp

3. Page page-vision dans autopilot.py :
   - Sidebar : ajouter Vision en premier sous VUE
   - Tagline : "UN JEU OÙ DES IAS JOUENT ET APPRENNENT"
   - 4 barres de progression (phase/len(phases)*100%) :
     ROCKY ██░░ Phase 1 · milestone
     JEUX  ██░░ Phase 1 · milestone
     AGENT ░░░░ Non démarré
     STUDIO███░ Phase 2 · milestone
   - Sprint actuel depuis studio_state.json
   - Dernier IMP fermé + il y a Xmin depuis ledger
   - Badge orange si humangate_pending > 0

## VALIDATION
.venv312\Scripts\python.exe -m py_compile autopilot.py

## RAPPORT FINAL
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED