# CHARTER IMP-105 — Ajouter endpoint /api/lane-stats dans autopilot.py
# Lane : SAFE_AUTO
# Fichiers autorisés : autopilot.py
# claim_verdict: NO_CLAIM_ALLOWED

## CONTEXTE
Le studio nécessite des informations en temps réel sur l'état des lanes d'exécution. Actuellement, il n'y a pas de moyen facile pour obtenir ces données directement via un endpoint API.

## OBJECTIF
Ajouter un nouvel endpoint `/api/lane-stats` dans autopilot.py qui retourne les statistiques des lanes en cours d'exécution telles que le modèle LLM utilisé, le nombre de runs effectués aujourd'hui et la date du dernier run pour chaque lane.

## SPEC
1. Ajoutez une nouvelle fonction `get_lane_stats()` dans `autopilot.py` avec la signature suivante :
   ```python
   def get_lane_stats() -> dict:
       pass
   ```
2. Cette fonction doit parcourir les lanes actives et collecter les informations suivantes pour chaque lane :
   - Le modèle LLM utilisé (par exemple, "Qwen2.5-14B")
   - Le nombre de runs effectués aujourd'hui (`nb_runs_today`)
   - La date du dernier run (`last_run_timestamp` en format ISO 8601)
3. Ajoutez un nouvel endpoint `/api/lane-stats` dans `autopilot.py` qui appelle la fonction `get_lane_stats()` et retourne les données sous forme de JSON.
4. Assurez-vous que l'endpoint est correctement documenté et intégré au reste du code.

## VALIDATION
```bash
.venv312\Scripts\python.exe -m py_compile autopilot.py
curl http://localhost:7331/api/lane-stats | jq .
```

## RAPPORT FINAL
software_verdict: OK  
evidence_verdict: MECHANICAL_VALIDATION_ONLY  
claim_verdict: NO_CLAIM_ALLOWED