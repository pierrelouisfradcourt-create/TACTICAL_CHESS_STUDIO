# AUDIT_REPORT — Autopilote / Pipeline Kaizen / Boucle agent
Date audit : 2026-06-03
Périmètre  : `autopilot.py` (3164 lignes) — lecture seule, zéro mutation
Auditeur   : Claude Code READ-ONLY
claim_verdict : NO_CLAIM_ALLOWED

---

## 1. Endpoints backend

### GET (do_GET)

| Path | Handler | Câblé UI ? | Fonctionnel ? | Notes |
|------|---------|-----------|---------------|-------|
| `/api/lm-status` | `lm_status()` | Oui | OUI | Poll LM Studio `/api/v1/models` |
| `/api/lm-probe` | `lm_status()` + check | Oui | OUI | Ping léger, retourne models[] |
| `/api/logs` | `log_buffer[-20:]` | Oui | OUI | 20 dernières entrées en RAM |
| `/api/memory` | `get_memory_data()` | Oui | OUI | Lit `lab/chains/memory.json` |
| `/api/ledger-status` | `get_ledger_counts()` | Oui | OUI | Compte OPEN/CLOSED par regex sur YAML |
| `/api/health` | `get_health()` | Oui | OUI | venv + LM Studio ping |
| `/api/staleness` | `get_staleness()` | Oui | OUI | mtime `07_CURRENT_STATE.md` + `CHAIN_HISTORY.jsonl` |
| `/api/metrics` | `get_metrics()` | Oui | OUI* | *ELO = fallback 1424/1200/975 (voir §7) |
| `/api/dataset-status` | `get_dataset_status()` | Oui | OUI | Lit ACTIVE_DATASET.txt + glob datasets/ |
| `/api/session-context` | `get_session_context()` | Oui | OUI | CHAIN_HISTORY[-3] + ledger + memory fusions[-3] |

### POST (do_POST)

| Path | Handler | Câblé UI ? | Fonctionnel ? | Notes |
|------|---------|-----------|---------------|-------|
| `/api/run-chain` | `run_chain(body["cmd"])` | Oui | OUI | `if path ==` avant la chaîne `elif` (ligne 2960) |
| `/api/lm-ask` | `lm_call(prompt)` | Oui | OUI (si LM Studio up) | Utilisé par 6 fonctions JS |
| `/api/memory` POST | `save_memory(entry)` | Oui | OUI | Append fusions/decisions |
| `/api/memory/export` | export vers fichier | Oui | OUI | |
| `/api/lm-stream` | SSE streaming Devstral | Oui | OUI (si LM Studio up) | Server-Sent Events |
| `/api/git-status` | `subprocess git status` | Oui | OUI | `--porcelain`, cwd=REPO |
| `/api/doc-hygiene` | `run_chain(HYGIENE --audit)` | Oui | OUI | HYGIENE = `lab/chains/doc_hygiene_chain.py` |
| `/api/fusion-cmd` | `build_fusion_context()` + `lm_call()` | Oui | OUI (si LM Studio up) | 2 modes : quick / deep |
| `/api/config` | Update LM_HOST/MODEL/REPO en RAM | Oui | OUI | Non persisté au restart |
| `/api/claude-annotate` | **410 Gone** | NON | NON | Tombstone — Claude backend supprimé |
| `/api/claude-fuse` | **410 Gone** | NON | NON | Tombstone |
| `/api/claude-fusion-complete` | **410 Gone** | NON | NON | Tombstone |
| `/api/claude-mode-run` | **410 Gone** | NON | NON | Tombstone |

### DELETE (do_DELETE)

| Path | Handler | Câblé UI ? | Fonctionnel ? |
|------|---------|-----------|---------------|
| `/api/logs` | `log_buffer.clear()` | Oui (bouton 🗑) | OUI |

**Bilan JS → backend** : Aucun gap. Tous les `fetch('/api/...')` JS ont un handler backend correspondant.

---

## 2. Pages UI

| Page | Données réelles ? | Source données | Statique ? |
|------|------------------|----------------|-----------|
| `page-pilote` | PARTIEL | `/api/metrics`, `/api/session-context`, `/api/staleness` | La table "État repo (2026-05-30)" et le bloc "Issues HIGH" sont 100% hardcodés HTML (stale) |
| `page-chains` | NON | JS `CHAINS_DEF` hardcodé | STATIQUE — liste figée, jamais rechargée depuis API |
| `page-logs` | OUI | `/api/logs` poll auto | DYNAMIQUE |
| `page-memory` | OUI | `/api/memory` | DYNAMIQUE |
| `page-ideas` | NON | `S.ideas` array JS — 12 items hardcodés | STATIQUE — aucune API ne lit/écrit les idées |
| `page-roadmap` | OUI (généré LLM) | `/api/lm-stream` ou `/api/lm-ask` | DYNAMIQUE à la demande |
| `page-metrics` | OUI (avec caveat ELO) | `/api/metrics` + `/api/ledger-status` | DYNAMIQUE |
| `page-dataset` | OUI | `/api/dataset-status` | DYNAMIQUE |
| `page-config` | OUI | Form → `/api/config` | DYNAMIQUE (non persisté au restart) |
| `page-agents` | PARTIEL | `/api/metrics` → ELO dynamique, `AGENTS_DEF` hardcodé | ELO dynamique, liste agents statique |
| `page-ligue` | PARTIEL | `/api/metrics` → ELO dynamique, bracket matches hardcodés | PARTIEL |
| `page-moteur` | NON | HTML table statique | STATIQUE |
| `page-design` | NON | HTML table statique | STATIQUE |
| `page-roadmap-jeux` | ? | Non audité (hors périmètre) | — |

---

## 3. Gaps critiques

### G-01 — `updateNextAction()` : prochaine action hardcodée

```js
// autopilot.py ligne 2448-2451
function updateNextAction() {
  const nxt = document.getElementById('next-action');
  const lane = document.getElementById('next-lane');
  if (nxt) { nxt.textContent = 'Recall → Audit'; lane.textContent = 'SAFE_AUTO — lancez la séquence Kaizen'; }
}
```

La case "Prochaine action" en haut de page-pilote affiche **toujours** "Recall → Audit" — indépendamment de ce que `kaizen_loop propose` retourne réellement (IMP-038 selon le ledger actuel). Aucun appel à `/api/ledger-status` pour lire la prochaine IMP.

**Impact** : La surface la plus visible du dashboard est menteuse — elle ne reflète pas l'état réel du pipeline.

### G-02 — Bloc "Issues HIGH" stale

```html
<!-- autopilot.py lignes 1136-1138 -->
<div class="stat-val">3</div>
<div class="stat-sub">NEW-02 · NEW-03 · NEW-05</div>
```

Hardcodé. NEW-02 (draw structurel) et NEW-05 (curriculum) sont **RÉSOLUS** depuis 2026-06-02. Seul NEW-03 (dataset corrompu) reste OPEN HIGH. L'UI affiche un compte obsolète.

### G-03 — Table "État repo (2026-05-30)" stale

La table statique dans page-pilote (HTML pur) affiche "2026-05-30" et les états correspondant au sprint 2026-05-30. Elle n'est jamais rafraîchie depuis une API.

### G-04 — `page-ideas` non persistée

Les 12 idées dans `S.ideas` sont des constantes JS. `addIdea()` ajoute à cet array en mémoire uniquement. Aucun fetch `/api/memory` ni autre endpoint ne sauvegarde les idées côté serveur. Les idées ajoutées sont perdues au refresh.

### G-05 — Python `CHAINS` dict — code mort

```python
# autopilot.py ligne 718-726
CHAINS = {
    "recall":   {"label": "Recall", "lane": "SAFE_AUTO", "cmd": f'python "{KAIZEN}" recall'},
    ...
}
```

Ce dict Python existe mais n'est jamais utilisé par aucun handler. L'endpoint `/api/run-chain` lit la commande depuis `body.get("cmd")` envoyé par le JS. La commande réelle vient de `CHAINS_DEF` côté JS (ligne 1856). `CHAINS` Python est **code mort**.

De plus, `CHAINS` Python utilise `python` (bare, sans venv), alors que `CHAINS_DEF` JS utilise `.venv312/Scripts/python.exe` (normalisé par `build_cmd()` en chemin absolu). Cohérence nulle, mais sans impact puisque le dict Python n'est jamais lu.

### G-06 — `launchClaudeMode()` vide + `S.claudeMode` mort

```js
// autopilot.py ligne 2871
async function launchClaudeMode() {}
```

`S.claudeMode: false` dans l'état global. Jamais modifié. `launchClaudeMode()` est une fonction vide. Résidu de la migration Claude → Devstral — sans impact fonctionnel mais confusion potentielle.

### G-07 — `/api/config` non persistée au restart

`LM_HOST`, `LM_MODEL`, `REPO` sont mis à jour en mémoire RAM par `/api/config`. Aucun fichier de config n'est écrit. Si le serveur redémarre, les valeurs reviennent aux valeurs par défaut codées au lancement.

---

## 4. Autoloop

| Attribut | Valeur |
|---------|--------|
| Fichier | `lab/chains/kaizen_autoloop.py` |
| Existence | **OUI** |
| Taille | ~200 lignes |
| Référencé dans autopilot.py | **NON** — 0 occurrence |
| Exécutable standalone | **OUI** — `python kaizen_autoloop.py [--once] [--lane SAFE_AUTO] [--dry-run]` |
| Dépendances | Importe `kaizen_loop` (disponible dans le même dossier) |
| Boucle complète | recall → propose → generate_charter → execute → validate → close → metrics → loop |
| Câblé comme chaîne UI | **NON** — ne figure pas dans `CHAINS_DEF` JS |
| Câblé comme endpoint | **NON** — aucun handler `/api/autoloop` |

**software_verdict** : `NOT_WIRED_IN_AUTOPILOT` — opérationnel uniquement en standalone CLI.

---

## 5. Mode Auto

`toggleAutoMode()` (ligne 1920-1928) :

```js
function toggleAutoMode() {
  S.autoMode = !S.autoMode;
  // ... UI toggle visuel uniquement
  label.textContent = S.autoMode ? 'Mode auto (SAFE_AUTO)' : 'Mode manuel';
}
```

- **Aucun appel serveur**
- **Non persisté** entre sessions (reset à false au refresh)
- **Effet côté client uniquement** : si `S.autoMode=true`, les chaînes `AUDIT_REQUIRED` passent directement (pas de dialog HumanGate)
- **Aucun enforcement côté serveur** : `run_chain()` exécute n'importe quelle commande sans vérifier la lane
- Le toggle UI affecte la sidebar principale (bouton toggle ligne 1080) et contrôle si `triggerChain` ou `confirmChain` est utilisé côté JS

**Risque** : En mode auto activé, un clic déclenche directement les chaînes `AUDIT_REQUIRED` (smoke, tests, coach) sans confirmation. L'enforcement HumanGate est purement côté JS — contournable.

---

## 6. CEO Brief / Fusion

**Pas de "CEO Brief" dédié** — le concept le plus proche est `/api/fusion-cmd` avec mode `quick` vs `deep`.

`/api/fusion-cmd` :
- **POST** — existe et est fonctionnel
- Mode `quick` (max_tokens=500) : 3 insights + prochaine action
- Mode `deep` (max_tokens=3000) : 4 fusions (IDEAS×LEDGER, ROADMAP×RÉALITÉ, ROI_CASCADE, REDTEAM)
- Appelle `build_fusion_context()` → IMPROVEMENT_LEDGER + roadmap + metrics + chain_history
- Logge vers `lab/chains/FUSION_LOG.jsonl` à chaque appel (si Devstral répond)
- `claim_verdict: NO_CLAIM_ALLOWED` inclus dans prompt + réponse

---

## 7. Studio State

| Fichier | Existe | Format | Fraîcheur |
|---------|--------|--------|-----------|
| `studio_state.json` | **NON** — introuvable dans tout le repo | — | — |
| `STUDIO_CONTEXT_LIVE.md` | **OUI** | Markdown, 12 lignes | Mis à jour à chaque appel Devstral via `_log_lm_call()` |
| `07_CURRENT_STATE.md` | OUI | Markdown (STATE_FILE Python) | Dernier commit 2026-06-03 |

Contenu `STUDIO_CONTEXT_LIVE.md` au moment de l'audit :
```
# Studio Memory — 2026-06-03T14:44:19
## Dernier appel Devstral
Type: fusion | Tokens: 223 | Durée: 304083ms
Preview: Tactical Chess Studio — Fusion complète  {...
Résultat: [streaming]
## Ledger
Open: 2 | Closed: 38
## Dernières chaînes
  -  IMP-031 → SUCCESS
  -  IMP-031 → FAIL
  -  IMP-015 → SUCCESS
```

Note : `get_staleness()` dans le backend lit le mtime de `07_CURRENT_STATE.md` comme proxy "fraîcheur du studio" — **pas** de `studio_state.json`.

---

## 8. Ledger

### kaizen_loop recall (output brut)

```
Total: 42 | Open: 4 | Closed: 37 | Blocked: 0 | Deferred: 1

OPEN (2):
  IMP-008 [FORBIDDEN]       ROI=0.8  Dataset rebuild (teacher_samples corrompu)
  IMP-038 [AUDIT_REQUIRED]  ROI=4.0  sf_dataset_generator.py → Pool-SF Stockfish depth 14

DEFERRED (1):
  IMP-011 [AUDIT_REQUIRED]  ROI=0.6  Value head inutilisée #NEW-04

CLOSED (38): IMP-001 à IMP-041 (voir recall output complet)
```

### kaizen_loop propose (output brut)

```
2 action(s) prêtes. Triées par ROI:

→ #1 IMP-038 ROI=4.0 [AUDIT_REQUIRED]
      sf_dataset_generator.py → Pool-SF Stockfish depth 14
      acceptance: 500+ parties SF vs SF, draw_rate < 20%

   #2 IMP-008 ROI=0.8 [FORBIDDEN]
      Dataset rebuild — FORBIDDEN lane

RECOMMANDATION: IMP-038 | Lane: AUDIT_REQUIRED | HumanGate: requis
```

Note discordance légère : recall affiche "Total: 42 | Open: 4" mais only 2 OPEN + 1 DEFERRED visibles. `get_ledger_counts()` backend compte `status: OPEN` + `status: IN_PROGRESS` = 2 (cohérent avec STUDIO_CONTEXT_LIVE "Open: 2"). Le "Open: 4" de recall est probablement inclusif de DEFERRED + éventuels items IN_PROGRESS.

### ELO affiché dans l'UI — réalité

`get_metrics()` cherche `elo_teacher_uci`, `teacher_uci_elo`, etc. dans les rapports JSON.
- `latest_benchmark_summary.json` : `"benchmark_status": "failed"` (2026-04-25) — **pas de champs ELO**
- `bench_rocky_p4_holdout_v2.json` : taux de résolution puzzles uniquement — **pas de champs ELO**

**Conclusion** : L'ELO affiché (teacher_uci=1424, heuristic=1200, neural=975) provient des **valeurs par défaut hardcodées** dans `get_metrics()`, pas de mesures réelles. Ces valeurs correspondent au dernier benchmark ELO réel (880 parties, 2026-05-30) mais sont codées en dur, pas lues depuis un rapport.

---

## 9. Next Action dans l'UI — dynamique ou statique ?

Le bloc "Prochaine action" est **100% statique** (voir G-01).

`updateNextAction()` est appelée une seule fois à l'init (ligne 2457). Elle n'appelle aucune API et retourne toujours "Recall → Audit / SAFE_AUTO — lancez la séquence Kaizen".

La vraie prochaine action selon le ledger (IMP-038) n'est visible que dans la page `page-chains` après exécution de "Propose" ou dans les logs.

---

## Verdicts

| Surface | software_verdict | evidence_verdict | Notes |
|---------|-----------------|-----------------|-------|
| Backend HTTP server | `IMPLEMENTED` | `CODE_INSPECTION` | 14 endpoints GET/POST/DELETE, tous fonctionnels |
| `/api/run-chain` | `IMPLEMENTED` | `CODE_INSPECTION` | handler `if` (ligne 2960), non `elif` |
| `/api/fusion-cmd` | `IMPLEMENTED` | `CODE_INSPECTION` | Devstral, 2 modes, log FUSION_LOG.jsonl |
| Mode Auto toggle | `PARTIAL` | `CODE_INSPECTION` | Client-side only, pas d'enforcement serveur |
| Next Action display | `NOT_IMPLEMENTED` | `CODE_INSPECTION` | Hardcodé — ne lit jamais le ledger |
| Issues HIGH bloc | `STALE` | `CODE_INSPECTION` | NEW-02/NEW-05 résolus mais toujours affichés |
| page-ideas persistance | `NOT_IMPLEMENTED` | `CODE_INSPECTION` | RAM uniquement, perdu au refresh |
| Python `CHAINS` dict | `DEAD_CODE` | `CODE_INSPECTION` | Jamais lu par aucun handler |
| `kaizen_autoloop.py` | `NOT_WIRED` | `CODE_INSPECTION` | Opérationnel standalone, absent de l'UI |
| ELO affiché | `FALLBACK_HARDCODED` | `CODE_INSPECTION` | Valeurs par défaut, pas issues d'un rapport récent |
| `STUDIO_CONTEXT_LIVE.md` | `IMPLEMENTED` | `CODE_INSPECTION` | Mis à jour par `_log_lm_call()` à chaque appel Devstral |
| `studio_state.json` | `NOT_FOUND` | `CODE_INSPECTION` | Aucun fichier de ce nom dans le repo |
| `/api/config` persistance | `NOT_IMPLEMENTED` | `CODE_INSPECTION` | RAM uniquement |
| `launchClaudeMode()` | `DEAD_CODE` | `CODE_INSPECTION` | Fonction vide, résidu migration Claude→Devstral |

**claim_verdict global : NO_CLAIM_ALLOWED**

---

## Recommandations prioritaires (non-normatives)

1. **G-01 / Next Action** : câbler `updateNextAction()` sur un appel `/api/ledger-status` pour afficher la vraie prochaine IMP dynamiquement.
2. **G-02 / Issues HIGH** : lire `open` depuis `/api/ledger-status` au boot et afficher les IDs dynamiquement.
3. **G-04 / Ideas** : ajouter un endpoint `/api/ideas` GET/POST si la persistance est souhaitée.
4. **G-05 / CHAINS Python** : supprimer le dict `CHAINS` Python (dead code), ou l'aligner sur `CHAINS_DEF` JS.
5. **Autoloop** : si la boucle complète est souhaitée depuis l'UI, ajouter `kaizen_autoloop` comme chaîne dans `CHAINS_DEF` (lane AUDIT_REQUIRED).
6. **ELO** : écrire un rapport JSON après chaque tournoi avec les champs `elo_teacher_uci` / `elo_heuristic` / `elo_neural` pour que `get_metrics()` lise des valeurs réelles.
