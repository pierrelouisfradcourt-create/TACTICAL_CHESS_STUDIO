# PLAN — IMP-203 : ECG enforcing (router les closes + producteur imp_closed)

**Lane:** AUDIT_REQUIRED · **Impact:** HIGH · **Effort:** MEDIUM
**blocked_by (notes):** IMP-195, IMP-196
**Acceptance:** `pytest: close legale OK / close illegale rejetee / event imp_closed emis + projection reflete / legacy tolere / non-regression`

> AUDIT_REQUIRED — implémenter + tester + commit local scope-strict, **NE PAS FERMER**.
> Prérequis ledger 195/196 CLOSED **non vérifié** (toujours OPEN, commits Phase 1 non poussés) :
> le travail dépend de leur CODE committé (`ecg.py`, `projection.py`), présent. Signalé.

## Objectif

Transformer l'ECG d'**advisory** (Phase 1) en **autorité de transition** :
(a) tout close passe par `ecg.can_transition` + le single-writer `ledger_writer` (refus dur si
illégal), legacy toléré ; (b) chaque close émet un event `imp_closed` signé dans `events.jsonl`
→ la projection (IMP-196) n'est plus vide.

## (a) Enforcement dans `kaizen_loop.cmd_close` (ligne 225)

```python
state = ecg.current_state(imp)
is_legacy = imp.get("ecg_state") is None     # pré-ECG : pas encore entré dans le cycle
if not is_legacy:
    d = ecg.can_transition(state, "CLOSED")
    if not d.allowed:
        print(f"{BLOCK} ECG: transition illegale {state}->CLOSED ({d.reason}).")
        sys.exit(2)                           # refus DUR
    imp["ecg_state"] = "CLOSED"
# legacy : toléré, close ancien schéma sans enforcement (rétro-compat — sinon
# PROPOSED->CLOSED illégal casserait TOUS les closes directs legacy / ratification Pierre).
```
- Placé **avant** toute mutation. `save_ledger` (→ `guarded_write`, IMP-194) reste le seul writer.
- Légalité : un IMP **ECG-managed** (champ `ecg_state` présent) ne peut clore que depuis
  `VERDICT_SIGNED` (seule arête →CLOSED). Sinon `sys.exit(2)`.
- Légalité legacy : aucun IMP actuel ne porte `ecg_state` → tous tolérés (comportement inchangé,
  zéro nouveau champ écrit pour le legacy).

## (b) Producteur d'event — NOUVEAU `ingest_event.emit_imp_closed` (additif)

```python
def emit_imp_closed(imp_id, closed_at=None, oracle_verdict="PASS") -> str | None:
    ts = closed_at or _now()
    adapted = adapt_imp_closed({"id": imp_id, "closed_at": ts, "oracle_verdict": oracle_verdict})
    task_id = adapted["task_id"]                 # "imp_closed:<id>:<ts>"
    verify_event_log(raise_on_fail=True)         # intégrité avant écriture (rejet dur)
    if _is_already_ingested(task_id):
        return None                              # idempotence (IMP-155)
    append_event_log("imp_closed", task_id)      # ligne signée HMAC -> events.jsonl
    return task_id
```
- Écrit **uniquement** `events.jsonl` (pas le pipeline studio-state lourd). Réutilise
  `adapt_imp_closed` (existant mais jamais invoqué) + `append_event_log` + `verify_event_log`.
- `cmd_close` l'appelle **après** `save_ledger` (ledger = source de vérité ; event = feed projection),
  en **best-effort loud** : échec d'émission → warning, le close persiste (divergence résiduelle
  documentée).
- Projection (IMP-196) `reduce_event` type `imp_closed` → `imps[id] = {ecg_state: CLOSED}` → plus vide.

## (c) Router `autopilot.py:1684` (close_imp) — AUTORISÉ ce soir, scope strict

Le close cockpit fait un `LEDGER.write_text` ligne-à-ligne (bypass ledger_writer/ECG/event).
Pour que l'ECG soit la **SEULE autorité**, `close_imp` **délègue** au CLI durci :
```python
r = subprocess.run([sys.executable, str(REPO/"lab/chains/kaizen_loop.py"),
                    "close", imp_id, "--session", today], cwd=REPO, capture_output=True, text=True)
if r.returncode == 0:
    result["ok"] = True; result["closed_session"] = today
    # golden_collector (conservé)
else:
    result["error"] = (r.stderr or r.stdout).strip()
```
- Remplace UNIQUEMENT le bloc read/modify/write_text. Conserve `golden_collector`,
  `run_state_updater_async`, `ledger_cache.clear()`, le contrat de retour `dict`.
- Effet : le bouton cockpit hérite de l'ECG + single-writer + émission d'event. Plus de bypass.
- **Signalé** : seule modification de autopilot.py, localisée à close_imp (lane studio, cockpit
  déjà committé).

## Ce qui NE change PAS

- `ecg.py`, `projection.py` (Phase 1) inchangés (réutilisés).
- `governor.py`, `ledger_writer.py` inchangés.
- Format ledger : seul `ecg_state: CLOSED` ajouté aux IMPs **ECG-managed** fermés (legacy: rien).
- Format `events.jsonl` inchangé (append d'une ligne `imp_closed` au format existant).

## Risques (RED TEAM)

- **R1 legacy cassé** : enforcement seulement si `ecg_state` présent → legacy intact. À prouver.
- **R2 divergence ledger/event** : close persiste mais emit échoue → projection en retard. Best-effort
  loud + résidu documenté. Réconciliation = suivi.
- **R3 double event** : autopilot (subprocess→cmd_close) + cmd_close = un seul emit (autopilot
  délègue, n'émet pas lui-même). Idempotence task_id si même ts. À vérifier.
- **R4 autopilot subprocess** : latence/erreur du bouton cockpit ; mapping rc→result. Tester rc≠0.
- **R5 récursion** : autopilot→subprocess kaizen_loop close ; kaizen_loop n'appelle pas autopilot → pas de boucle.
- **R6 tests polluent le vrai events.jsonl** : TOUS les tests close doivent monkeypatch
  `ingest_event.EVENT_LOG` vers tmp. Critique.
- **R7 sys.exit dans cmd_close** : testé via `pytest.raises(SystemExit)`.

## Oracle pytest exact

```powershell
.venv312/Scripts/python.exe -m pytest scripts/phase2_tests/test_imp203_ecg_enforce.py -v
```
Cas : close legacy (no ecg_state) OK + event émis ; close ECG-managed VERDICT_SIGNED→CLOSED OK +
ecg_state=CLOSED + event ; close ECG-managed illégale (PROPOSED/IN_PROGRESS→CLOSED) → SystemExit,
rien écrit ; projection après close reflète imps[id]=CLOSED ; idempotence (re-close déjà CLOSED) ;
emit best-effort sur log tampered → warning, close persiste ; non-régression complète (109+).

---

## RÉVISION RED TEAM (intégrée)

- **RT-203-1 CRITICAL — enforcement = dead code sur données réelles** (rien ne stampe un
  `ecg_state` non-CLOSED → tous les IMPs réels sont legacy → check ECG sauté). **Pas de
  surclaim.** Reformulation honnête : ce livrable apporte (1) un **chokepoint de close unique**
  (plus de bypass après routage autopilot) et (2) un **refus dur des transitions illégales pour
  les IMPs ECG-managed** (ecg_state valide+cohérent). Le full enforcement par IMP s'active quand
  le wiring de cycle de vie stampera les états intermédiaires (**suivi GATÉ**). Le test sur fixture
  managed prouve le mécanisme du garde, pas une activation prod universelle.
- **RT-203-2/3/4 HIGH — brick au reopen / ecg_state corrompu / ratification cassée.** Règle
  fail-open robuste : `managed = ecg_state ∈ ECG_STATES ET NON (ecg_state==CLOSED ET status!=CLOSED)`.
  Absent / hors-enum / desync (CLOSED mais statut rouvert) → **legacy toléré** (jamais brické).
  `ecg_state=CLOSED` stampé **uniquement** sur close managed (legacy : aucun champ ajouté).
  **`--ratify`** : override HumanGate qui saute l'enforcement (note d'audit) → la ratification
  Pierre d'un futur PROPOSED-managed ne casse pas.
- **RT-203-5 HIGH — `import ingest_event` échoue** (scripts/ pas sur sys.path de kaizen_loop).
  Fix : `sys.path.insert(scripts)` + import en tête ; échec d'emit = **ERROR loud** (stderr), pas avalé.
- **RT-203-6 HIGH — verify post-commit inutile.** Politique explicite : **ledger = source de
  vérité** ; emit best-effort **loud** après save ; sur log tampered → warning + close persiste
  (divergence résiduelle documentée, réconciliation = suivi). On ne couple PAS la gouvernance du
  ledger à l'état du log d'events.
- **RT-203-7/8 — subprocess autopilot** : `timeout=30` (+ `TimeoutExpired`→erreur propre) et
  interpréteur **`.venv312`** (pas `sys.executable`).
- **RT-203-9/10 — tests** : chemin autopilot testé via `subprocess.run` monkeypatché (argv/cwd/
  timeout/rc-mapping) — **jamais** de vrai close spawné ; emit/replay sur chemins **tmp explicites**.
- **RT-203-11 MEDIUM — élargissement** : l'ancienne regex cockpit ne fermait que OPEN|DEFERRED|
  IN_PROGRESS ; via cmd_close le cockpit peut désormais fermer un **BLOCKED**. Signalé pour gate Pierre.
- **RT-203-12 LOW** : rejet ECG → stderr ; `LedgerWriteError` capturé dans cmd_close → message
  propre + exit code (pas de traceback dans le cockpit).
