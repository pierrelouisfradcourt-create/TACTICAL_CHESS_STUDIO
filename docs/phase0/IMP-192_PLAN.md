# PLAN — IMP-192 : HMAC compare_digest enforcement dans ingest_event.py

**Lane:** SAFE_AUTO · **Impact:** HIGH · **Effort:** SMALL
**Acceptance (ledger):** `pytest: forge HMAC invalide -> exception (rejet dur signature invalide)`

## Contexte (état actuel)

`scripts/ingest_event.py` signe chaque ligne de `lab/events.jsonl` via `_hmac()` puis
re-vérifie tout le log dans `verify_event_log()` avant chaque écriture.

Deux faiblesses sur le chemin de vérification :

1. **Comparaison timing-unsafe** — `scripts/ingest_event.py:262`
   ```python
   if stored_hmac != expected:
   ```
   Comparaison `!=` de chaînes : court-circuite au premier octet différent → fuite de timing
   exploitable pour forger un HMAC octet par octet.

2. **Rejet "mou"** — `verify_event_log()` renvoie `False` ; `ingest_event()` traduit en
   `return 6`. Aucune exception : un appelant qui ignore le code retour continue sur un log
   corrompu. L'acceptance exige un **rejet dur = exception**.

## Changements exacts (fichier:ligne)

### `scripts/ingest_event.py`

1. **Import** (après `import hashlib`, ~ligne 23) : ajouter `import hmac`.

2. **Nouvelle exception** (zone helpers, après `_hmac`, ~ligne 65) :
   ```python
   class EventLogIntegrityError(Exception):
       """events.jsonl tampered/off-schema/HMAC mismatch — hard reject."""
   ```

3. **`verify_event_log()` (ligne ~235)** — signature :
   `def verify_event_log(raise_on_fail: bool = False) -> bool:`
   - Comparaison constante : remplacer `if stored_hmac != expected:` par
     `if not hmac.compare_digest(stored_hmac, expected):`
   - Chaque chemin d'échec (JSON invalide, schema invalide, HMAC manquant, mismatch) :
     si `raise_on_fail` → `raise EventLogIntegrityError(msg)` ; sinon comportement actuel
     (`print` stderr + `return False`). **Aucun changement de comportement par défaut.**
   - `compare_digest` exige deux `str` (ou deux `bytes`) ; `stored_hmac` peut être non-str
     si la ligne est forgée → caster défensivement : `str(stored_hmac)`.

4. **`ingest_event()` (ligne ~418)** — le garde devient un rejet dur :
   ```python
   try:
       verify_event_log(raise_on_fail=True)
   except EventLogIntegrityError as exc:
       print(f"[backbone] ABORT: {exc}", file=sys.stderr)
       return 6
   ```
   Le code retour 6 reste inchangé pour le pipeline ; le mécanisme interne est désormais
   une exception (rejet dur), conforme à l'acceptance.

## Ce qui NE change PAS

- `_hmac()` garde la construction `sha256(key + payload)` → **aucune migration** de
  `events.jsonl`, signatures existantes toujours valides. (La faiblesse length-extension de
  cette construction est hors scope — voir Risques, candidat IMP-196.)
- Codes retour de `ingest_event` (0..7) inchangés.
- `migrate_event_log`, adapters, schema lock IMP-154, idempotence IMP-155 : intacts.
- Signature d'appel publique : `verify_event_log()` sans argument fonctionne comme avant.

## Risques

- **R1 — length extension** : `sha256(key+payload)` n'est pas un vrai HMAC. compare_digest
  ne corrige pas ça. Hors scope IMP-192 ; à porter en IMP-196 (event log HMAC, AUDIT) car
  migrer la construction invalide tout `events.jsonl` existant. → noté pour Pierre.
- **R2 — type de `stored_hmac`** : si la ligne forgée met `hmac: 123` (int), `compare_digest`
  lève `TypeError`. Mitigé par cast `str()` + le schema-lock IMP-154 qui n'autorise que des
  champs connus (mais pas leur type). Test dédié.
- **R3 — régression appelants** : tout code qui fait `if not verify_event_log()` continue de
  marcher (défaut `raise_on_fail=False`). Vérifié : seul `ingest_event` appelle la fonction.

## Oracle pytest exact

```powershell
.\.venv312\Scripts\python.exe -m pytest scripts/phase0_tests/test_imp192_hmac.py -v
```

Cas couverts :
- log sain → `verify_event_log()` True, `raise_on_fail=True` ne lève pas
- HMAC forgé (1 octet modifié) → `EventLogIntegrityError`
- HMAC manquant → `EventLogIntegrityError`
- `hmac` non-str (forge typée) → `EventLogIntegrityError` (pas `TypeError`)
- `verify_event_log()` (défaut) renvoie toujours `False` sur log corrompu (compat)
- comparaison utilise bien `hmac.compare_digest` (anti-régression timing : assert d'appel)

---

## RÉVISION RED TEAM (post-adversaire)

- **RT-192-2 (HIGH) — `compare_digest` lève `TypeError` sur str non-ASCII.** `str(stored_hmac)`
  ne suffit pas (`"café"` reste non-ASCII). **Fix retenu :** avant `compare_digest`, garde
  `if not (isinstance(stored_hmac, str) and stored_hmac.isascii()): raise EventLogIntegrityError`.
  Couvre None/int/list/dict/empty/non-ASCII d'un coup. Tests ajoutés : `hmac` non-ASCII,
  `hmac=""`, `hmac=[...]`.
- **RT-192-1 (CRITICAL) — le "hard reject" reste avalé en `return 6`, et le seul appelant prod
  (`kaizen_autoloop._ingest_imp_closed`) ignore le `returncode`.** Décision : l'acceptance
  ("forge → exception") est satisfaite au niveau unitaire (`verify_event_log(raise_on_fail=True)`
  lève). Le `return 6` du pipeline reste le contrat. Le fait que `_ingest_imp_closed` ignore
  rc≠0 est **hors scope IMP-192** (fichier kaizen_autoloop) → **nouveau candidat IMP** consigné
  dans DREAMS pour Pierre. On n'élargit pas le scope.
- **RT-192-3 (MEDIUM) — clé par défaut `studio-dev`.** L'intégrité dépend de `STUDIO_HMAC_KEY`.
  Justification réelle = défense-en-profondeur + correction timing-safe, **pas** un "forge par
  timing local" (surestimé). Reformulé. Pas de warning runtime (bruit/scope).
- **RT-192-4/5 (LOW) — `--migrate` re-signe sans vérifier (laundering).** Hors scope, résidu
  documenté.
