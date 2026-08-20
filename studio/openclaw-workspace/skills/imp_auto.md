---
name: imp-auto
description: "Execute a SAFE_AUTO IMP via coding-agent background worker: Claw plans synchronously via claude_proxy, delegates execution to claude --bypassPermissions, notifies on oracle result."
metadata:
  {
    "openclaw":
      {
        "emoji": "⚙️",
        "requires":
          {
            "anyBins": ["claude"],
            "config": ["skills.entries.coding-agent.enabled"],
          },
      },
  }
---

# /imp-auto \<IMP-ID\>

Exécute un IMP `lane: SAFE_AUTO` en deux temps : planification synchrone via claude_proxy, puis délégation à un worker `claude --bypassPermissions` en background. La notification revient à Claw quand l'oracle est vert ou rouge.

---

## Hard rules

- Vérifier **toutes** les pré-conditions avant de déléguer. Zéro exception.
- Le worker tourne avec `bypassPermissions` — les zones FORBIDDEN doivent être hardcodées dans le prompt worker, pas seulement dans le PLAN.
- Ne jamais déléguer si `lane ≠ SAFE_AUTO` ou `blocked_by ≠ []`.
- Toujours capturer une `notifyChannel` + `notifyTarget` avant de spawner.
- Le worker doit envoyer **exactement un** message `openclaw message send` à la fin (succès ou échec).
- Si le worker échoue ou est tué : ne pas re-implémenter manuellement — respawn ou escalade Pierre.

---

## Phase 1 — Vérification synchrone (via claude_proxy)

Lire `lab/chains/IMPROVEMENT_LEDGER.yaml` et extraire l'entrée `IMP-ID`.

Vérifier dans l'ordre :

1. `status: OPEN` — sinon stopper : "IMP-ID n'est pas OPEN"
2. `lane: SAFE_AUTO` — sinon stopper : "lane=X nécessite gate Pierre explicite"
3. `blocked_by: []` — sinon lister les bloqueurs et stopper
4. Les `files:` de l'IMP ne chevauchent **aucune** zone FORBIDDEN :
   ```
   tests/  eval/  oracle/  bench/  puzzles/  .github/
   ```
   Si chevauchement → stopper : "IMP-ID FORBIDDEN — escalade Pierre"

Si toutes les vérifications passent : produire le PLAN (Phase 2).

---

## Phase 2 — PLAN + gate Pierre

Produire le PLAN dans ce format exact et attendre le "go" de Pierre avant de continuer :

```
PLAN : IMP-ID — <titre de l'IMP>
Étapes :
  1. git stash push -m "pre-imp-auto-IMP-ID"
  2. <liste des fichiers à modifier avec description courte> (S/M/L)
  3. oracle : <cargo test | pytest | les deux>
  4. Si vert : rapport + gate merge
  5. Si rouge : git stash pop + rapport d'échec
Worker : claude --permission-mode bypassPermissions --print (background)
Oracle attendu : <commande exacte>
Go ?
```

Ne pas spawner le worker avant le "go" explicite.

---

## Phase 3 — Construction du prompt worker

Après le "go" de Pierre, construire le prompt worker et le spawner.

### Template prompt worker

Écrire dans un fichier temp :

```bash
PROMPT=$(mktemp -t openclaw-imp-auto.XXXXXX)
cat >"$PROMPT" <<'WORKER_EOF'
Tu es @producteur_dur, bras exécutant du Tactical Chess Studio.
Repo : /mnt/c/TACTICAL_CHESS_STUDIO
Tu as accès complet au repo avec --permission-mode bypassPermissions.

## IMP à exécuter

IMP-ID : <IMP-ID>
Titre   : <title>
Objectif: <objective>
Fichiers : <files list>
Tests attendus : <expected_tests>

## FORBIDDEN — NE JAMAIS TOUCHER

tests/  eval/  oracle/  bench/  puzzles/  .github/

Toute modification dans ces zones = arrêt immédiat + rapport d'échec.

## Règles code

Rust (src/) :
- Pas de unwrap() sans // SAFETY: <raison>
- Pas de panic!() en production
- Pas de magic numbers — constantes nommées

Python (ml/, scripts/) :
- Type hints sur toutes les fonctions publiques
- Pas de print() → logging

## Étapes d'exécution

1. Vérifier que le worktree est propre (git status). Si modifié → stopper, rapport.
2. git stash push -m "pre-imp-auto-<IMP-ID>"
3. Implémenter les changements dans les fichiers listés ci-dessus.
4. Lancer l'oracle :
   <oracle_command>
5. Si oracle VERT :
   - Ne pas merger.
   - Appeler : curl -s -X POST http://127.0.0.1:8766/api/refresh
   - Envoyer notification de succès (voir bloc ci-dessous).
6. Si oracle ROUGE :
   - git stash pop
   - Appeler : curl -s -X POST http://127.0.0.1:8766/api/refresh
   - Envoyer notification d'échec avec sortie oracle (voir bloc ci-dessous).

## Ne pas merger — gate Pierre obligatoire après oracle vert.

<NOTIFICATION_BLOCK>
WORKER_EOF
printf 'prompt file: %s\n' "$PROMPT"
```

### Substitutions à effectuer avant d'écrire le fichier

| Placeholder | Source |
|---|---|
| `<IMP-ID>` | Argument de la commande `/imp-auto` |
| `<title>` | Champ `title:` de l'entrée YAML |
| `<objective>` | Champ `objective:` de l'entrée YAML |
| `<files list>` | Champ `files:` de l'entrée YAML, un par ligne |
| `<expected_tests>` | Champ `expected_tests:` ou `oracle:` de l'entrée YAML |
| `<oracle_command>` | Déduire du type de fichiers : `cargo test` (src/), `pytest` (ml/), les deux si mixte |
| `<NOTIFICATION_BLOCK>` | Bloc de notification (voir ci-dessous) |

### Bloc de notification

```text
Notification route:
- channel: <notifyChannel>
- target: <notifyTarget>

Quand terminé, envoyer EXACTEMENT UN message :

Si oracle vert :
  openclaw message send --channel <channel> --target '<target>' \
    --message '✅ <IMP-ID> vert — oracle OK — gate merge en attente Pierre'

Si oracle rouge :
  openclaw message send --channel <channel> --target '<target>' \
    --message '❌ <IMP-ID> rouge — rollback effectué — <première ligne erreur oracle>'

Ne pas utiliser openclaw system event ou heartbeat.
```

---

## Phase 4 — Spawn du worker

```bash
bash background:true workdir:/mnt/c/TACTICAL_CHESS_STUDIO \
  command:"claude --permission-mode bypassPermissions --print < \"$PROMPT\""
```

Confirmer à Pierre :

```
Worker spawné — sessionId: <sessionId>
IMP-ID : <IMP-ID>
Oracle attendu : <oracle_command>
Suivi : process log <sessionId>
Notification : <notifyChannel> → <notifyTarget>
```

---

## Phase 5 — Réception notification

Quand le message de notification arrive :

**Oracle vert :**
1. Afficher le rapport succès à Pierre.
2. Proposer la gate merge :
   ```yaml
   - decision_id: HGD-XXX
     title: "Merge IMP-ID — oracle vert"
     agent: producteur_dur
     category: human_gate
     zone: <zone IMP>
     verdict: PENDING
     source_state:
       created: "<date>"
     evidence_refs:
       - "oracle cargo test / pytest vert — sessionId: <sessionId>"
   ```
3. Écrire cette entrée dans `lab/chains/HUMANGATE_DECISION_LOG.yaml`.
4. `curl -s -X POST http://127.0.0.1:8766/api/refresh` pour afficher la gate dans le Canvas.

**Oracle rouge :**
1. Afficher le rapport d'échec avec la sortie oracle.
2. Ne pas proposer de merge.
3. Marquer l'IMP comme `status: BLOCKED` dans le ledger si l'échec est reproductible.
4. Escalade Pierre avec le détail de l'erreur.

---

## Surveillance worker

```bash
# Voir la sortie live
process log <sessionId>

# Vérifier statut
process poll <sessionId>

# Arrêter si nécessaire
process kill <sessionId>
```

---

## Cas d'erreur

| Situation | Action |
|---|---|
| Worker hangs > 10 min | `process log` pour diagnostiquer, puis `process kill` + respawn ou escalade |
| Worker sort sans notification | Lire `process log`, extraire le résultat oracle manuellement |
| oracle_command inconnu | Demander à Pierre avant de déléguer |
| Worktree sale au démarrage | Stopper — ne pas stash sans comprendre l'état |
| IMP modifie src/ ET ml/ | Oracle = `cargo test && pytest` — les deux doivent être verts |
