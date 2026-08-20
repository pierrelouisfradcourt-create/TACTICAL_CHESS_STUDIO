# PLAN — IMP-195 : ECG state machine 7 états, transitions gardées

**Lane:** AUDIT_REQUIRED · **Impact:** HIGH · **Effort:** MEDIUM
**Dépend de (notes→à matérialiser):** IMP-192, IMP-193, IMP-194 (tous CLOSED ✓)
**Acceptance (ledger):** `schema JSON + pytest transitions (PROPOSED→PLANNED→TEST_SPECCED→IN_PROGRESS→ORACLE_PENDING→VERDICT_SIGNED→CLOSED)`

> AUDIT_REQUIRED — implémenter + tester + commit local scope-strict, **NE PAS FERMER**.

## Contexte

Le ledger porte un `status` à 5 valeurs (OPEN/IN_PROGRESS/CLOSED/DEFERRED/BLOCKED) lu par
**regex** (pas yaml) dans `autopilot.py` (`_parse_imp_from_ledger:758`, `get_ledger_counts:2186`).
L'ECG introduit un **cycle de vie à 7 états** plus fin, **additif** : nouveau champ optionnel
`ecg_state`, et `oracle_type` / `blocked_by` matérialisés depuis `notes`.

Audit reader autopilot (vérifié) :
- `blocked_by` regex = `blocked_by:\n((?:\s*- .+\n?)*)` → `[]` inline tombe dans le else
  (=[]) ; une liste bloc `blocked_by:\n  - IMP-x` matche → **populer est compatible**.
- nouveau champ `oracle_type:` ignoré par le reader (aucun regex ne le cible) → **ajout sûr**.
- `get_ledger_counts` compte `text.count("status: OPEN")` → inchangé par nos ajouts.
- Le ledger est déjà en forme `yaml.dump` canonique (closes Phase 0 = diffs 2 lignes) →
  re-sérialisation **idempotente**, diff minimal.

## Les 7 états + transitions (gardées — aucune hors table)

```
PROPOSED ─► PLANNED ─► TEST_SPECCED ─► IN_PROGRESS ─► ORACLE_PENDING ─► VERDICT_SIGNED ─► CLOSED(terminal)
                                            ▲                 │                  │
                                            └── rework ◄───────┘ (oracle rouge)   └── rework (gate reject)
```
```python
TRANSITIONS = {
  "PROPOSED":       {"PLANNED"},
  "PLANNED":        {"TEST_SPECCED"},
  "TEST_SPECCED":   {"IN_PROGRESS"},
  "IN_PROGRESS":    {"ORACLE_PENDING"},
  "ORACLE_PENDING": {"VERDICT_SIGNED", "IN_PROGRESS"},  # oracle rouge -> retour travail
  "VERDICT_SIGNED": {"CLOSED", "IN_PROGRESS"},           # gate reject -> rework
  "CLOSED":         set(),                                # terminal
}
```
Tout ce qui n'est pas dans `TRANSITIONS[src]` est **rejeté** (fail-closed). États inconnus rejetés.

## Mapping legacy par défaut (rétro-compat — 212 IMPs existants)

`current_state(imp) = imp.get("ecg_state") or DEFAULT_FROM_STATUS[imp["status"]]` :
```python
DEFAULT_FROM_STATUS = {
  "OPEN": "PROPOSED", "IN_PROGRESS": "IN_PROGRESS", "CLOSED": "CLOSED",
  "BLOCKED": "PROPOSED", "DEFERRED": "PROPOSED",
}
```
Aucun IMP existant ne porte `ecg_state` → tous dérivent un défaut, **rien ne casse**.

## Changements exacts

### NOUVEAU `governance/ecg.py` (code pur, style governor — aucun I/O dans le cœur)
- `ECG_STATES` (7, ordonnés), `TRANSITIONS`, `DEFAULT_FROM_STATUS`.
- `Decision` (ALLOW/BLOCK + reason) — réutilise le pattern governor.
- `can_transition(src, dst) -> Decision` (fail-closed états inconnus).
- `current_state(imp: dict) -> str`.
- `validate_state(state: str) -> bool`.
- **Matérialisation (fonctions pures sur un dict ledger)** :
  - `parse_notes_meta(notes: str) -> {oracle_type?: str, blocked_by: [str]}` (regex sur
    `oracle_type=...` et `blocked_by=IMP-...`).
  - `materialize_entry(imp: dict) -> dict` : ajoute `oracle_type` si présent en notes ;
    peuple `blocked_by` **uniquement si vide** (ne clobbe jamais un blocked_by déjà structuré).
  - idempotent : re-matérialiser ne change rien.

### NOUVEAU `schemas/ecg.schema.json`
JSON Schema validant `ecg_state ∈ ECG_STATES`, `oracle_type ∈ {code,structure,humangate,none}`,
`blocked_by: array[str IMP-id]`, + record de transition `{imp_id, from, to, ts, actor}`.

### NOUVEAU `governance/ecg_migrate.py` (runner mince, single-writer)
- charge via `kaizen_loop.load_ledger` (empreinte cache), applique `materialize_entry` à
  chaque IMP, persiste via `kaizen_loop.save_ledger` (→ `ledger_writer.guarded_write`, IMP-194 :
  **l'ECG n'écrit que par le single-writer**).
- `--dry-run` (défaut) : rapporte le diff sans écrire. `--write` : applique.
- scope migration mesuré : ~11 `oracle_type` + ~9 `blocked_by` (depuis notes). Diff minimal.

## Ce qui NE change PAS (rétro-compat stricte)

- **`autopilot.py` NON MODIFIÉ.** `/api/ledger-status`, `get_ledger_counts`,
  `_parse_imp_from_ledger` continuent de lire (vérifié regex-compatible).
- **`cmd_close` NON gardé par l'ECG.** Enforcer l'ECG dans close CASSERAIT les closes directs :
  un IMP legacy OPEN→défaut PROPOSED, et `PROPOSED→CLOSED` est illégal → la ratification Pierre
  (close direct d'un AUDIT) planterait. L'ECG est **autorité par API** ; le câblage dur en gate
  est un **suivi gaté** (nécessite un chemin lifecycle réel ou un flag legacy). Documenté.
- `status` legacy intact ; `ecg_state` est purement additif.
- Format YAML : seuls les champs ajoutés apparaissent (re-dump idempotent).

## Risques (à durcir par le RED TEAM)

- **R1 transitions illégales** : toute paire hors table rejetée ; états inconnus rejetés (fail-closed).
- **R2 écriture concurrente contournant l'ECG** : mitigée par le single-writer IMP-194 (writelock +
  empreinte) ; mais autopilot:1684 reste un bypass non gardé (résidu IMP-194, gate Pierre).
- **R3 legacy cassé** : mapping par défaut + ne clobbe jamais un blocked_by existant ; migration
  idempotente ; `--dry-run` par défaut ; vérif reader autopilot post-migration.
- **R4 re-sérialisation** : yaml.dump idempotent (prouvé Phase 0). Test byte-stabilité sur IMP non touché.

## Oracle pytest exact

```powershell
.venv312/Scripts/python.exe -m pytest scripts/phase1_tests/test_imp195_ecg.py -v
```
Cas : chaîne forward complète légale ; sauts illégaux rejetés (PROPOSED→CLOSED, →IN_PROGRESS,
CLOSED→*) ; rework edges légaux ; états inconnus rejetés ; mapping legacy (OPEN→PROPOSED,
CLOSED→CLOSED) ; matérialisation idempotente ; schema JSON valide/invalide ; migration sur
ledger tmp ne touche que oracle_type/blocked_by ; vérif regex autopilot sur ledger migré.

---

## RÉVISION RED TEAM (intégrée)

- **RT-195-1 CRITICAL — `status: FAIL` (IMP-175) → KeyError fail-open.** `current_state` doit
  être fail-closed : `DEFAULT_FROM_STATUS.get(imp.get("status"), "UNKNOWN")` où `UNKNOWN` n'est
  PAS dans `TRANSITIONS` → `can_transition` le rejette. Map élargie aux statuts réels :
  `{OPEN:PROPOSED, IN_PROGRESS:IN_PROGRESS, CLOSED:CLOSED, DONE:CLOSED, BLOCKED:PROPOSED,
  DEFERRED:PROPOSED, FAIL:IN_PROGRESS}`. Test sur TOUS les statuts présents (OPEN/CLOSED/FAIL).
- **RT-195-2 HIGH — claim "seule autorité" FAUX.** `close_imp` (autopilot:1684, write_text) et
  `cmd_close` ne consultent pas l'ECG et n'écrivent pas via guarded_write. **L'ECG est ADVISORY**
  (bibliothèque de validation) tant que les chemins de close ne sont pas câblés. Câbler =
  suivi GATÉ (casserait les closes directs legacy PROPOSED→CLOSED). Langage corrigé partout.
- **RT-195-3 MEDIUM — peupler blocked_by retire 197/199/200/202 (SAFE_AUTO) de l'actionable set
  autoloop** (deps OPEN). Comportement plus CORRECT (anti-pickup prématuré) mais immédiat → la
  migration **rapporte le delta actionable avant/après** ; gate review.
- **RT-195-4 MEDIUM — `blocked_by=none` ≠ `["none"]`.** Regex ancrée `IMP-\d+` (findall) sur le
  segment `blocked_by=...`. Tests : `none→[]`, `IMP-192,IMP-193→2 ids`.
- **RT-195-5 MEDIUM — migration vs autopilot race.** guarded_write fail-close (ConcurrentWriteError)
  si fingerprint change → migration abort propre + retry. Lancer `--write` studio quiescé (documenté).
- **RT-195-6/7 LOW — vérifiés SÛRS** (oracle non contournable, pas de boucle infinie ; round-trip
  yaml = 0 ligne de diff). Caveat CRLF : guarded_write écrit en mode texte → CRLF préservé.
  Test byte-stabilité sur entrée non touchée.
