# CHARTER IMP-096 — Smoke level gate dans autoloop-start avant run_chain()
# Lane : SAFE_AUTO
# Fichiers autorisés : autopilot.py
# claim_verdict: NO_CLAIM_ALLOWED

## CONTEXTE
L'auto-loop du studio exécute une chaîne de fonctions pour générer et traiter les IMPs. Avant d'exécuter la chaîne complète, il est crucial d'inclure un niveau de vérification (level gate) pour s'assurer que toutes les conditions sont remplies avant de lancer run_chain(). Cette étape préventive évite des erreurs coûteuses et garantit la qualité du processus.

## OBJECTIF
Ajouter une fonction de level gate dans le début de autoloop_start() pour vérifier que toutes les conditions nécessaires sont remplies avant d'exécuter run_chain().

## SPEC
1. Ajoutez une nouvelle fonction `check_autoloop_conditions()` qui vérifie si toutes les conditions requises (à définir) sont satisfaites.
2. Appelez cette fonction juste après le démarrage de autoloop_start().
3. Si la fonction retourne False, arrêtez l'exécution et affichez un message d'erreur clair.

## VALIDATION
.venv312\Scripts\python.exe -m py_compile autopilot.py
Grep "check_autoloop_conditions" autopilot.py → au moins une occurrence

## RAPPORT FINAL
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED