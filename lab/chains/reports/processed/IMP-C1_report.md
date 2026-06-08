# Rapport charter IMP-C1 — metrics.json structure

**Date :** 2026-06-08  
**Exécutant :** Claude Code (lifecycle manager)  
**Lane :** SAFE_AUTO  
**IMP :** IMP-C1 — metrics.json structure

---

## Acceptance criteria

> Créer `lab/chains/metrics.json` avec un schéma structuré pouvant être lu par IMP-C2 (Métriques dans Vision) et alimenté par IMP-C3 (Self-play metrics).

---

## Travail réalisé

### Fichier créé

`lab/chains/metrics.json` — schéma `metrics_v1`

### Sections du schéma

| Section | Clés principales | Source des données |
|---|---|---|
| `kaizen` | total/open/closed/pct_closed/by_lane/by_domain/next_actionable | kaizen_loop.py metrics |
| `elo` | teacher_uci/heuristic/neural/date/games/is_fallback | lab/reports/latest_benchmark_summary.json |
| `draw_rate` | value/pct/threshold/ok/status | lab/reports/latest_benchmark_summary.json |
| `self_play` | available/games/win_rate/draw_rate/elo_progression | placeholder IMP-C3 |
| `agents` | id/arch/status/elo par agent | dérivé elo + draw_rate |
| `thresholds` | draw_rate_max/elo_neural_min/kaizen_pct_target | valeurs actuelles du projet |
| `sprint` | current/objective/humangate_pending | studio_state.json |

### Valeurs peuplées (état 2026-06-08)

```
kaizen.total         : 135
kaizen.open          : 17
kaizen.closed        : 117
kaizen.pct_closed    : 87%
kaizen.by_lane       : SAFE_AUTO=16, FORBIDDEN=1
elo.teacher_uci      : 1351
elo.heuristic        : 1183
elo.neural           : 1079
draw_rate.value      : 0.68 (68%)
draw_rate.ok         : false — seuil 20% non atteint
draw_rate.status     : WARN
self_play.available  : false (IMP-C3 pending)
```

### Validation mécanique

```
$ .venv312\Scripts\python.exe lab/chains/kaizen_loop.py metrics

Total improvements : 135
  OPEN        : 17
  CLOSED      : 117  (87% du backlog)
  DEFERRED    : 1
  SAFE_AUTO   : 16 actionnables
  FORBIDDEN   : 1 (IMP-008)

claim_verdict: NO_CLAIM_ALLOWED
```

Les valeurs dans `metrics.json` correspondent exactement aux sorties de `kaizen_loop.py metrics`.

### Dépendances débloquées

- **IMP-C2** (Métriques dans Vision) : peut maintenant lire `metrics.json` depuis autopilot.py pour afficher ELO + draw_rate + kaizen sur la page Vision.
- **IMP-C3** (Self-play metrics) : a un réceptacle structuré `self_play` à alimenter. Le flag `available: false` permet à l'UI de détecter l'absence de données.
- **IMP-D1** (Thresholds configurables) : les valeurs sont dans `thresholds` — il suffit de les exposer dans l'UI.

---

## Verdicts

```
software_verdict:  OK
evidence_verdict:  MECHANICAL_VALIDATION_ONLY
claim_verdict:     NO_CLAIM_ALLOWED
```

**Preuve d'exécution :**  
- Fichier `lab/chains/metrics.json` créé, schéma `metrics_v1`  
- Valeurs kaizen vérifiées via `kaizen_loop.py metrics` — correspondance exacte  
- Valeurs ELO/draw_rate tirées de `lab/reports/latest_benchmark_summary.json` (source authoritative)

---

## Prochaine étape recommandée

**IMP-C2** — câbler la lecture de `lab/chains/metrics.json` dans `autopilot.py` pour la page Vision (à la place ou en complément de `get_metrics()` qui lit directement les benchmarks).
