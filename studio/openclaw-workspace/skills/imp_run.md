---
name: /imp-run
args: "<IMP-ID>"
provider: claude-proxy
---

# Skill /imp-run — Exécution autonome d'un IMP

Lance @producteur_dur sur un IMP du ledger de bout en bout.
Gate Pierre obligatoire avant exécution + validation finale.

## Pré-conditions (vérifier avant toute action)

1. `lab/chains/IMPROVEMENT_LEDGER.yaml` accessible
2. IMP cible : `status: OPEN` et `lane: SAFE_AUTO`
3. `blocked_by: []` (sinon stop — débloquer d'abord)
4. Worktree `/dur/` propre (`git status` = clean)

Si une pré-condition échoue → rapport d'échec + stop. Ne pas continuer.

## Séquence

### Phase 1 — Lecture et analyse (automatique)

```
1. Lire l'IMP dans IMPROVEMENT_LEDGER.yaml (id, title, files, acceptance)
2. Lire chaque fichier listé dans files[]
3. Vérifier que les fichiers cibles ne sont PAS dans FORBIDDEN
   (tests/ eval/ oracle/ bench/ puzzles/ .github/)
4. Identifier les oracles requis (cargo test / pytest / elo_match.sh)
```

### Phase 2 — Plan (soumettre à Pierre)

Produire un PLAN au format standard :

```
PLAN : [titre de l'IMP]
IMP : [IMP-ID] — [title]
Acceptance : [critère exact du champ acceptance du ledger]

Étapes :
  1. [action] → [fichier:ligne] [S/M/L]
  2. ...

Oracle : [commande exacte qui validera]
Rollback : git stash (avant step 1) — git stash pop si oracle rouge

Gates Pierre : [lister toute action irréversible]
Risques : [mitigation]
Go ?
```

**Attendre "go" explicite avant de passer à la phase 3.**

### Phase 3 — Exécution (après go)

```bash
# 0. Snapshot de sécurité
git stash push -m "pre-imp-run [IMP-ID] $(date -u +%Y%m%dT%H%M%SZ)"

# 1. Modifier les fichiers selon le plan
#    (un seul fichier à la fois — committer mentalement chaque étape)

# 2. Oracle
cargo test          # si Rust
pytest              # si Python
# (selon les fichiers modifiés)
```

### Phase 4 — Oracle vert → rapport

Si oracle vert :

```
RAPPORT IMP-[ID]
Statut     : ORACLE VERT
Oracle     : [commande] — [résumé output]
Fichiers   : [liste des fichiers modifiés]
Git diff   : [résumé des changements]
Acceptance : [critère] → SATISFAIT / PARTIELLEMENT / NON

Gate Pierre : merge + close IMP dans le ledger ?
```

### Phase 4b — Oracle rouge → rollback + rapport

Si oracle rouge :

```bash
git stash pop  # retour à l'état pré-IMP
```

```
RAPPORT IMP-[ID]
Statut   : ORACLE ROUGE — ROLLBACK EFFECTUÉ
Oracle   : [commande] — [output d'erreur]
Cause    : [diagnostic]
Rollback : git stash pop — repo restauré
Action   : [proposition de fix ou escalade @council]
```

**Stop total. Ne pas relancer sans nouveau go Pierre.**

## Règles non négociables

- FORBIDDEN inviolable même si l'IMP l'indique (escalader à Pierre)
- Jamais de `unwrap()` sans SAFETY, `panic!()` prod, magic numbers
- Un seul IMP par invocation (pas de batch)
- `intention_racine` du paquet reçu transmis intact dans le rapport
- Lane autre que SAFE_AUTO → gate Pierre obligatoire avant phase 2

## Exemple d'invocation

```
@producteur_dur /imp-run IMP-045
```

Produit : analyse → PLAN → [go Pierre] → exécution → oracle → rapport gate.
