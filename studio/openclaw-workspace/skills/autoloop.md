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

**Deux modes :**
- **Interactif** (défaut, sans flag) : demande "Soumettre ?" et "Continuer ?" à chaque étape. Comportement historique, inchangé.
- **Non-attendu** (`--unattended`) : enchaîne la file SAFE_AUTO sans intervention. Sélectionne le #1, soumet à `/imp-auto --unattended`, re-boucle sur oracle vert. Conçu pour tourner la nuit. Pierre reçoit un rapport consolidé au réveil ; les merges restent gatés.

---

## Hard rules

- Ne jamais choisir un IMP avec `lane ≠ SAFE_AUTO`.
- Ne jamais choisir un IMP avec `blocked_by ≠ []`.
- Ne jamais modifier les zones FORBIDDEN : `tests/ eval/ oracle/ bench/ puzzles/ .github/`
- Toujours afficher la file complète avant de soumettre — Pierre voit ce qui arrive (même en `--unattended`, la file est loguée dans le rapport).
- Un seul IMP à la fois — attendre la notification avant de passer au suivant.
- Si aucun IMP éligible → stopper et rapporter à Pierre.
- **Oracle rouge → HARD-STOP**, dans les deux modes. Ne jamais continuer à muter le repo après un échec non compris.
- En `--unattended` : **cap par session = 3 IMP**. Au-delà, fin + rapport, même si la file n'est pas vide.

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

Afficher la file (toujours — c'est la trace que Pierre relit) :

```
AUTOLOOP — file SAFE_AUTO (N IMPs éligibles)
─────────────────────────────────────────────
  #1  IMP-XXX  [CRITICAL]  <titre>
  #2  IMP-YYY  [HIGH]      <titre>
  ...
─────────────────────────────────────────────
Prochain : IMP-XXX — <titre>
```

### Mode interactif (défaut)

Ajouter `Soumettre ? (go / stop / skip <IMP-ID>)` et **attendre la réponse de Pierre** :

- **go** → soumettre IMP-XXX à `/imp-auto`
- **stop** → arrêter l'autoloop
- **skip IMP-ID** → exclure cet IMP et choisir le suivant, réafficher

### Mode `--unattended`

Ne **pas** demander "Soumettre ?". Sélectionner directement le **#1** (tri impact↓) et
soumettre à `/imp-auto --unattended <IMP-ID>`. Logger la ligne sélectionnée dans le
rapport de session. Aucune attente Pierre.

---

## Phase 3 — Soumission à /imp-auto

Appeler `/imp-auto <IMP-ID>` (interactif) ou `/imp-auto --unattended <IMP-ID>` (non-attendu)
avec l'IMP sélectionné.

`/imp-auto` gère intégralement la planification, le spawn worker, et la notification.
Ne pas re-implémenter sa logique ici. Le flag `--unattended` est propagé tel quel.

---

## Phase 4 — Attente et rapport

Attendre la notification du worker (via `openclaw message`).

### Oracle vert

```
✅ AUTOLOOP — IMP-XXX vert
Oracle OK — gate merge en attente Pierre.
File restante : N-1 IMPs éligibles.
```

- **Mode interactif** : ajouter `Continuer ? (go / stop)` et attendre Pierre.
  go → repartir en Phase 1 ; stop → fin de session.
- **Mode `--unattended`** : accumuler la ligne au rapport de session, incrémenter le
  compteur d'IMP traités, puis **re-boucler automatiquement en Phase 1** (re-lire le
  ledger — l'IMP vient d'être fermé). Aucune attente Pierre.
  Conditions d'arrêt de la boucle non-attendue :
  - **cap atteint** (3 IMP traités) → fin + rapport matin consolidé.
  - **file vide** (0 IMP éligible restant) → fin + rapport matin consolidé.

### Oracle rouge — HARD-STOP (les deux modes)

```
❌ AUTOLOOP — IMP-XXX rouge
Rollback effectué. Détail : <première ligne erreur oracle>
Autoloop suspendu — intervention Pierre requise.
```

Stopper immédiatement. Ne pas passer au prochain IMP, même en `--unattended`.
Consigner l'échec dans le rapport de session.

---

## Rapport matin consolidé (`--unattended`)

À la fin de la boucle non-attendue (cap, file vide, ou hard-stop), émettre **un seul**
rapport listant **tout** ce qui s'est passé — pas seulement les succès :

```
🌙 AUTOLOOP nocturne — rapport (session du <date>)
─────────────────────────────────────────────
Traités : N IMP
  ✅ IMP-XXX  vert   → gate merge PENDING (HGD-xxx)
  ✅ IMP-YYY  vert   → gate merge PENDING (HGD-yyy)
  ❌ IMP-ZZZ  rouge  → rollback, autoloop suspendu : <erreur>
Arrêt : <cap 3 atteint | file vide | hard-stop rouge>
File SAFE_AUTO restante : M IMP
─────────────────────────────────────────────
Action Pierre : relire et approuver les gates merge PENDING dans le Canvas.
```

Aucune dérive silencieuse : un vert non mergé, un rouge, un skip → tout figure au rapport.

---

## Cas d'erreur

| Situation | Action |
|---|---|
| Aucun IMP éligible | Rapporter : "File vide — aucun SAFE_AUTO sans bloqueur" |
| /imp-auto retourne une erreur de vérification | Afficher le motif, proposer "skip" à Pierre |
| Worker timeout > 15 min | Signaler à Pierre, suspendre l'autoloop |
| IMP fermé entre deux itérations | Normal — re-lire le ledger filtre automatiquement |
