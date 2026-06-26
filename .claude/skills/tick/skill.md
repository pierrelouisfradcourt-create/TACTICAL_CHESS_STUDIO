---
name: tick
description: Tick du soir : fog + coût + cycles, puis /autoloop --unattended si ≥1 IMP SAFE_AUTO disponible. Cap 3 IMP/nuit, hard-stop oracle rouge, rapport matin consolidé.
---

# /tick

Bilan du soir + déclenchement conditionnel de la boucle nocturne.

---

## Phase 1 — Bilan studio

1. Lancer `python studio_meta.py IMPROVEMENT_LEDGER.yaml`.
   - Si exit ≠ 0 → afficher les anomalies et stopper `/tick` ici. Ne pas lancer l'autoloop.
2. Afficher le résumé studio_meta :

```
TICK — bilan du <date>
─────────────────────────────────────────────
FOG      : <fog_score> (<nb fichiers hors-trace>)
COÛT     : <coût session USD / cumulatif semaine>
CYCLES   : <nb IMP fermés ce jour> | open : <total OPEN>
─────────────────────────────────────────────
```

3. Mettre à jour `studio/openclaw-workspace/MEMORY.md` avec les métriques du jour (ligne datée, pas un bloc).

---

## Phase 2 — Comptage file SAFE_AUTO

Lire `lab/chains/IMPROVEMENT_LEDGER.yaml`.

Filtrer les entrées qui satisfont **les trois** conditions :

| Champ | Valeur attendue |
|---|---|
| `status` | `OPEN` |
| `lane` | `SAFE_AUTO` |
| `blocked_by` | `[]` |

Exclure tout IMP dont les `files:` chevauchent une zone FORBIDDEN :
```
tests/  eval/  oracle/  bench/  puzzles/  .github/
```

Afficher le compte :

```
File SAFE_AUTO : N IMP éligibles
```

---

## Phase 3 — Décision autoloop

### Si N = 0

```
File vide — aucun IMP SAFE_AUTO sans bloqueur.
Autoloop nocturne non lancé. Bonne nuit.
```

Fin de `/tick`.

### Si N ≥ 1

```
N IMP éligibles — lancement /autoloop --unattended.
Cap : 3 IMP / session. Hard-stop oracle rouge.
Rapport matin au réveil de Pierre.
```

Lancer `/autoloop --unattended` immédiatement.

`/autoloop --unattended` gère intégralement :
- La sélection par impact (CRITICAL > HIGH > MEDIUM > LOW)
- La soumission à `/imp-auto --unattended`
- Le cap 3 IMP par session
- Le hard-stop sur oracle rouge
- Le rapport matin consolidé

Ne pas ré-implémenter cette logique ici. Propagation transparente.

---

## Rapport matin (produit par /autoloop)

À la sortie de la boucle nocturne (cap, file vide ou hard-stop), `/autoloop` émet :

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

---

## Hard rules (tick)

- Oracle studio_meta rouge → ne **jamais** lancer l'autoloop.
- Ne **jamais** bypasser le comptage Phase 2 : l'autoloop ne démarre que sur N ≥ 1 éligibles confirmés.
- MEMORY.md mis à jour **avant** le lancement de l'autoloop — même si la session crash.
- Si studio_meta.py est absent ou cassé → escalader à Pierre, pas de workaround.

---

## Cas d'erreur

| Situation | Action |
|---|---|
| studio_meta.py exit ≠ 0 | Afficher anomalies, stopper — pas d'autoloop |
| IMPROVEMENT_LEDGER.yaml absent | Escalader Pierre — bloqueur |
| /autoloop retourne "aucun IMP éligible" malgré N ≥ 1 | Vérifier synchro ledger, rapporter l'écart |
| Worker autoloop killed / timeout | Rapport partiel au réveil — détail dans process log |
