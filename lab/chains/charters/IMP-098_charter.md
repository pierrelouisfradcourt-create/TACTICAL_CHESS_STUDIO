# CHARTER IMP-098 — Verification tool_permission_matrix avant chain run
# Lane : SAFE_AUTO
# Fichiers autorisés : autopilot.py
# claim_verdict: NO_CLAIM_ALLOWED

## CONTEXTE
Le studio Tactical Chess nécessite une vérification rigoureuse des permissions avant l'exécution de chaînes d'outils pour assurer la sécurité et l'intégrité du système. Cette vérification est cruciale pour éviter les exécutions non autorisées qui pourraient compromettre le pipeline de développement.

## OBJECTIF
Ajouter une vérification des permissions avant l'exécution de chaînes d'outils dans `autopilot.py`. Cette vérification doit s'assurer que chaque outil utilisé dans la chaîne a les permissions nécessaires en fonction du contexte actuel (par exemple, SAFE_AUTO).

## SPEC
1. Créer une nouvelle fonction `verify_tool_permission_matrix(chain)` qui prend en paramètre une chaîne d'outils et vérifie si chaque outil est autorisé à être exécuté dans le contexte actuel.
2. Ajouter cette fonction avant l'exécution de toute chaîne d'outils existante dans `autopilot.py`.
3. Assurez-vous que la fonction retourne un booléen indiquant si toutes les vérifications sont passées.

## VALIDATION
.venv312\Scripts\python.exe -m py_compile autopilot.py
Grep "verify_tool_permission_matrix" autopilot.py → au moins une occurrence

## RAPPORT FINAL
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED