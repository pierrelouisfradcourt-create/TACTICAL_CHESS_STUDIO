# CHARTER IMP-113 — Identifier les surfaces critiques avec script Python
# Lane : SAFE_AUTO
# Fichiers autorisés : scripts/identify_critical_surfaces.py
# claim_verdict: NO_CLAIM_ALLOWED

## CONTEXTE
Le studio Tactical Chess nécessite une analyse approfondie de ses composants critiques pour optimiser son pipeline et sa gestion. Identifier les surfaces d'interaction clés permettra d'améliorer la maintenance et l'évolution du système.

## OBJECTIF
Créer un script Python qui identifie et documente les surfaces critiques du studio, en spécifiant leur nature (API, fichier de configuration, etc.), leur autorité (qui gère cette surface) et leur impact en aval dans le pipeline.

## SPEC
1. Créer une fonction `identify_critical_surfaces()` dans scripts/identify_critical_surfaces.py.
2. La fonction doit analyser autopilot.py pour identifier les surfaces critiques.
3. Chaque surface critique doit être documentée avec :
   - Nom de la surface
   - Son type (API, fichier, etc.)
   - L'autorité qui gère cette surface
   - Un bref des conséquences en aval si elle change

## VALIDATION
.venv312\Scripts\python.exe -m py_compile scripts/identify_critical_surfaces.py
Grep "identify_critical_surfaces" scripts/identify_critical_surfaces.py → au moins 5 surfaces critiques identifiées et documentées

## RAPPORT FINAL
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED