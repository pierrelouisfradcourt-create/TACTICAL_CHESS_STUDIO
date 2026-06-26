---
name: autoloop
description: "Lit le ledger, choisit le prochain IMP SAFE_AUTO sans bloqueur, le soumet à /imp-auto et reporte le résultat à Pierre."
metadata:
  {
    "openclaw":
      {
        "emoji": "🔄",
        "requires":
          {
            "anyBins": ["claude"],
            "config": ["skills.entries.imp-auto.enabled"],
          },
      },
  }
---

# /autoloop

Sélectionne automatiquement le prochain IMP éligible dans `IMPROVEMENT_LEDGER.yaml` et le délègue à `/imp-auto`. Conçu pour les sessions d'automatisation continue.

---

## Hard rules

- Ne jamais choisir un IMP avec `lane ≠ SAFE_AUTO`.
- Ne jamais choisir un IMP avec `blocked_by ≠ []`.
- Ne jamais modifier les zones FORBIDDEN : `tests/ eval/ oracle/ bench/ puzzles/ .github/`
- Toujours afficher la file complète avant de soumettre — Pierre voit ce qui arrive.
- Un seul IMP à la fois — attendre la notification avant de passer au suivant.
- Si aucun IMP éligible → stopper et rapporter à Pierre.

---

## Phase 1 — Lecture du ledger

Lire `lab/chains/IMPROVEMENT_LEDGER.yaml`.

Filtrer les entrées qui répondent **toutes** aux conditions suivantes :

| Champ | Valeur attendue |
|---|---|
| `status` | `OPEN` |
| `lane` | `SAFE_AUTO` |
| `blocked_by` | `[]` (liste vide) |

Exclure tout IMP dont les `files:` chevauchent une zone FORBIDDEN :
```
tests/  eval/  oracle/  bench/  puzzles/  .github/
```

---

## Phase 2 — Tri et affichage de la file

Trier les IMPs éligibles par :
1. `impact` décroissant : `CRITICAL > HIGH > MEDIUM > LOW`
2. Ordre d'apparition dans le ledger (stable sort)

Afficher à Pierre :

```
AUTOLOOP — file SAFE_AUTO (N IMPs éligibles)
─────────────────────────────────────────────
  #1  IMP-XXX  [CRITICAL]  <titre>
  #2  IMP-YYY  [HIGH]      <titre>
  ...
─────────────────────────────────────────────
Prochain : IMP-XXX — <titre>
Soumettre ? (go / stop / skip <IMP-ID>)
```

Attendre la réponse de Pierre avant de continuer.

- **go** → soumettre IMP-XXX à `/imp-auto`
- **stop** → arrêter l'autoloop
- **skip IMP-ID** → exclure cet IMP et choisir le suivant, réafficher

---

## Phase 3 — Soumission à /imp-auto

Après "go" de Pierre, appeler `/imp-auto <IMP-ID>` avec l'IMP sélectionné.

`/imp-auto` gère intégralement la planification, le spawn worker, et la notification.
Ne pas re-implémenter sa logique ici.

---

## Phase 4 — Attente et rapport

Attendre la notification du worker (via `openclaw message`).

**Oracle vert :**
```
✅ AUTOLOOP — IMP-XXX vert
Oracle OK — gate merge en attente Pierre.
File restante : N-1 IMPs éligibles.
Continuer ? (go / stop)
```

Si Pierre dit **go** → repartir en Phase 1 (re-lire le ledger, l'IMP vient d'être fermé).
Si Pierre dit **stop** → fin de session autoloop.

**Oracle rouge :**
```
❌ AUTOLOOP — IMP-XXX rouge
Rollback effectué. Détail : <première ligne erreur oracle>
Autoloop suspendu — intervention Pierre requise.
```

Stopper immédiatement. Ne pas passer au prochain IMP.

---

## Cas d'erreur

| Situation | Action |
|---|---|
| Aucun IMP éligible | Rapporter : "File vide — aucun SAFE_AUTO sans bloqueur" |
| /imp-auto retourne une erreur de vérification | Afficher le motif, proposer "skip" à Pierre |
| Worker timeout > 15 min | Signaler à Pierre, suspendre l'autoloop |
| IMP fermé entre deux itérations | Normal — re-lire le ledger filtre automatiquement |
