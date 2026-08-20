# PLAN — IMP-196 : Event log append-only HMAC + projection model

**Lane:** AUDIT_REQUIRED · **Impact:** HIGH · **Effort:** MEDIUM
**Dépend de (notes→matérialisé par 195):** IMP-195
**Acceptance (ledger):** `pytest: replay depuis zero = meme etat`

> AUDIT_REQUIRED — implémenter + tester + commit local scope-strict, **NE PAS FERMER**.

## Contexte (substrat existant)

`lab/events.jsonl` existe déjà : append-only, **HMAC par ligne** (`scripts/ingest_event.py`,
durci IMP-192 `compare_digest` + rejet dur), schema-lock IMP-154 (`version` + champs autorisés),
idempotence IMP-155 (`task_id`). `assert_projection_consistency` (ingest_event:386) vérifie déjà
que chaque `applied_delta_id` de l'état trace vers le log.

Manque (livrable IMP-196) : un **modèle de projection** explicite et déterministe — `state(t) =
fold(events[0..t])` — avec preuve `rejouer depuis zéro = même état`.

## Design

### NOUVEAU `governance/projection.py` (réducteur pur)
- `EVENT_LOG = lab/events.jsonl` (paramétrable pour les tests).
- `load_events(path) -> list[dict]` : lit le log, **vérifie l'HMAC** (réutilise
  `ingest_event.verify_event_log(raise_on_fail=True)` → tamper = exception, pas de projection
  sur un log corrompu), renvoie les events dans l'**ordre du fichier** (déterminisme).
- `reduce_event(state: dict, event: dict) -> dict` : fonction PURE qui applique un event à l'état.
  Projection minimale et déterministe par `type` :
  - `imp_closed` → `state["imps"][imp_id] = {"ecg_state": "CLOSED", "last_event": ts}`
  - `elo_match` / `lichess_eval` → `state["oracles"][oracle_id] = {"ts": ts, "task_id": ...}`
  - type inconnu → no-op tracé dans `state["_skipped"]` (forward-compat, pas d'exception)
- `project(events) -> dict` : `functools.reduce(reduce_event, events, initial_state())`.
- `replay(path) -> dict` : `project(load_events(path))`. **Déterministe** : fold pur + ordre fichier.
- `initial_state() -> dict` : état vide canonique (clés triées).

### Déterminisme garanti par
1. ordre de lecture = ordre d'append du fichier (jamais de tri non-stable) ;
2. `reduce_event` pur (aucune horloge, aucun random, aucune I/O) ;
3. sérialisation canonique pour comparaison (`json.dumps(state, sort_keys=True)`).

## Ce qui NE change PAS

- Format de `lab/events.jsonl` **inchangé** → signatures HMAC existantes valides, **aucune
  re-migration**. (Le hash-chain ordering-tamper-evidence est un durcissement **hors scope** :
  il changerait le format et invaliderait le log existant — candidat suivi, noté.)
- `ingest_event.py` non modifié (réutilisé en lecture seule). `autopilot.py` non touché.
- La projection est **dérivée/lecture seule** : elle ne réécrit jamais le log ni l'état.

## Risques (RED TEAM)

- **R1 replay non déterministe** : neutralisé par réducteur pur + ordre fichier + compare
  canonique. Test : `project(events) == project(events)` et `replay(p) == project(load_events(p))`.
- **R2 legacy entries** : events pré-IMP-154 sans `version` → `verify_event_log` les rejette
  (schema-lock). `migrate_event_log` (existant) les estampille. Test : log legacy migré → replay OK ;
  log non migré → exception claire (pas de projection silencieuse fausse).
- **R3 ordre/duplication** : idempotence IMP-155 (task_id) → re-append du même event = no-op à
  l'ingestion ; côté projection, un event dupliqué doit donner le même état (reduce idempotent par
  task_id). Test dédié.
- **R4 type inconnu** : no-op tracé, pas d'exception (forward-compat) — testé.
- **R5 log tampered** : HMAC vérifié avant projection → exception, jamais d'état projeté faux.

## Oracle pytest exact

```powershell
.venv312/Scripts/python.exe -m pytest scripts/phase1_tests/test_imp196_projection.py -v
```
Cas : replay depuis zéro == projection complète ; déterminisme (2 projections identiques) ;
append puis re-replay = état étendu cohérent ; event dupliqué (idempotence) = même état ;
type inconnu = no-op ; log HMAC-tampered → exception (pas de projection) ; log vide → état initial.

---

## RÉVISION RED TEAM (intégrée)

- **RT-196-1 CRITICAL — `ingest_event.verify_event_log` n'a PAS de paramètre path** (lit toujours
  le `lab/events.jsonl` global) → vérifierait le mauvais fichier, le test tamper serait du théâtre.
  **Fix : `projection.py` est AUTONOME** — il lit un **snapshot d'octets unique** du chemin qu'il
  projette et vérifie l'HMAC ligne-à-ligne sur CE snapshot (réutilise `ingest_event._hmac` +
  `_validate_event_schema` pour la cohérence de construction, mais sur ses propres octets).
  `ingest_event.py` **non modifié**.
- **RT-196-2 HIGH — append concurrent → ligne partielle finale = faux "tamper".** Lecture en **un
  seul snapshot** ; une dernière ligne SANS `\n` terminal qui ne parse pas = **queue partielle
  tolérée** (ignorée, tracée) ≠ tamper. JSON invalide en milieu de fichier OU HMAC mismatch sur
  une ligne complète = tamper (exception).
- **RT-196-3 MEDIUM — déterminisme.** `_skipped` = **list ordonnée** (ordre fichier), jamais set.
  Réducteur **pur** : n'utilise QUE les champs de l'event (`ts` de l'event), aucune horloge/uuid.
  Test : `project(events)` deux fois → `json.dumps(sort_keys=True)` byte-identique.
- **RT-196-4 MEDIUM — idempotence reformulée.** Projection = **last-write-wins par entité,
  déterministe selon l'ordre fichier** (pas d'idempotence task_id au niveau projection — ça vit à
  l'ingestion, IMP-155). Test reopen/reclose (même imp_id, deux ts) = dernier gagne.
- **RT-196-5 MEDIUM — contradiction "no re-migration".** Précondition **assertée** : log 100% v1
  (vérifié : 5/5 lignes `version:1`). Pas d'appel à `migrate_event_log`. Test garde-fou.
- **RT-196-6 HIGH — aucun producteur d'event `imp_closed`** (le log ne contient que des
  `elo_match` ; ni `close_imp` ni `cmd_close` n'émettent). **Scope honnête** : le MODÈLE de
  projection est déterministe pour tout type ; la branche `imp_closed`→`ecg_state:CLOSED` est
  **forward-ready** (producteur = suivi GATÉ : câbler `cmd_close`→`ingest_event.adapt_imp_closed`,
  qui existe mais n'est jamais invoqué). Les tests **synthétisent des events `imp_closed` signés**
  pour prouver le réducteur ; en prod la projection `imps` reste vide jusqu'au câblage du producteur.
