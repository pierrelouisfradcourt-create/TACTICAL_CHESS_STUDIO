---
name: monitor
description: Probe santé des services studio — ports 8765/8766/7331/1234. Affiche statut, alerte si down.
---

# /monitor

Vérifie l'état des services studio en sondant leurs health endpoints.

---

## Services à sonder

| Service | Port | Health endpoint | Critique |
|---|---|---|---|
| claude_proxy | 8765 | `GET http://127.0.0.1:8765/health` | Oui |
| canvas_gateway | 8766 | `GET http://127.0.0.1:8766/health` | Oui |
| autopilot | 7331 | `GET http://localhost:7331/api/health` | Non |
| LM Studio | 1234 | `GET http://localhost:1234/v1/models` | Non |

---

## Probe

Pour chaque service, envoyer la requête HTTP avec timeout 3s :

```bash
curl -s -o /dev/null -w "%{http_code}" --max-time 3 <url>
```

- Code 200 → `UP`
- Timeout ou code ≠ 200 → `DOWN`

---

## Affichage

```
MONITOR — état services (<heure>)
─────────────────────────────────────────────
claude_proxy   8765  ✅ UP   [critique]
canvas_gateway 8766  ✅ UP   [critique]
autopilot      7331  ⚠️ DOWN [non-critique]
LM Studio      1234  ✅ UP   [non-critique]
─────────────────────────────────────────────
Critique DOWN : 0 — studio opérationnel
```

---

## Alertes

- **Service critique DOWN** : afficher en rouge, proposer la commande de relance.
- **LM Studio DOWN** : rappeler "démarrer manuellement (GUI Windows)".
- **autopilot DOWN** : `python autopilot.py` depuis la racine du repo.

---

## Commandes de relance (référence)

```bash
# claude_proxy
python scripts/claude_proxy.py

# canvas_gateway
python scripts/canvas_gateway.py

# autopilot
python autopilot.py
```

Ne pas relancer automatiquement — afficher la commande, laisser Pierre décider.
