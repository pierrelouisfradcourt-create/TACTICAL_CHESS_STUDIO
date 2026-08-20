---
name: monitor
description: "Probe santé des services studio — ports 8765/8766/7331/1234. Affiche statut, alerte si un service critique est down."
metadata:
  {
    "openclaw":
      {
        "emoji": "🩺",
        "requires":
          {
            "anyBins": ["curl"],
          },
      },
  }
---

# /monitor

Sonde l'état de santé des services studio en interrogeant leurs health
endpoints. Source de vérité des ports : `infrastructure/ports.yaml`.

---

## Services à sonder

| Service | Port | Health endpoint | Critique | Relance |
|---|---|---|---|---|
| claude_proxy | 8765 | `http://127.0.0.1:8765/health` | Oui | `python scripts/claude_proxy.py` |
| canvas_gateway | 8766 | `http://127.0.0.1:8766/health` | Oui | `python scripts/canvas_gateway.py` |
| autopilot | 7331 | `http://localhost:7331/api/health` | Non | `python autopilot.py` |
| LM Studio | 1234 | `http://localhost:1234/v1/models` | Non | GUI Windows (manuel) |

> `canvas_gateway` dépend de `claude_proxy` — si 8765 est down, 8766 le sera
> probablement aussi. Diagnostiquer 8765 en premier.

---

## Probe

Pour chaque service, envoyer une requête HTTP avec un timeout court (3 s) et ne
lire que le code de statut :

```bash
for svc in "claude_proxy 127.0.0.1 8765 /health" \
           "canvas_gateway 127.0.0.1 8766 /health" \
           "autopilot localhost 7331 /api/health" \
           "lm_studio localhost 1234 /v1/models"; do
  set -- $svc
  name="$1"; host="$2"; port="$3"; path="$4"
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://$host:$port$path" 2>/dev/null || echo 000)"
  if [ "$code" = "200" ]; then echo "$name $port UP"; else echo "$name $port DOWN ($code)"; fi
done
```

- Code `200` → `UP`
- Timeout, refus de connexion ou code ≠ 200 → `DOWN` (le code brut `000`
  signale un port fermé / service non démarré)

---

## Affichage attendu

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

Ligne de synthèse finale obligatoire : compter les services **critiques** down.
- `Critique DOWN : 0` → studio opérationnel.
- `Critique DOWN : ≥1` → afficher en alerte, lister les services concernés.

---

## Alertes et relance

- **Service critique DOWN** (8765 / 8766) : signaler en rouge et **proposer** la
  commande de relance correspondante. Ne jamais relancer automatiquement.
- **LM Studio DOWN** (1234) : rappeler qu'il se démarre manuellement (GUI
  Windows) avant les autres services.
- **autopilot DOWN** (7331) : non bloquant — `python autopilot.py` depuis la
  racine du repo si Pierre le souhaite.

Décision de relance = Pierre. Le skill affiche, il n'agit pas.

---

## Verdict

```
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
