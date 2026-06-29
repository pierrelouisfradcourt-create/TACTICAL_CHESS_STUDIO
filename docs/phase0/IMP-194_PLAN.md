# PLAN — IMP-194 : Single-writer ledger — fermer les write paths non gouvernés

**Lane:** AUDIT_REQUIRED · **Impact:** HIGH · **Effort:** MEDIUM
**blocked_by:** IMP-192, IMP-193 (notes ledger)
**Acceptance (ledger):** `pytest: ecriture concurrente -> exception`

> ⚠️ AUDIT_REQUIRED — implémenter + tester + commit local, **NE PAS FERMER**.
> Gate Pierre obligatoire (la fermeture du write path autopilot touche un fichier hors scope).

## Contexte — les write paths du ledger (audit réel)

`grep save_ledger|IMPROVEMENT_LEDGER` → écrivains effectifs de `lab/chains/IMPROVEMENT_LEDGER.yaml` :

| # | Path | Mécanisme | Gouverné ? |
|---|------|-----------|-----------|
| 1 | `lab/chains/kaizen_loop.py:save_ledger` | `yaml.dump` (CLI close/add) | non |
| 2 | `kaizen_autoloop.close_imp` → subprocess `kaizen_loop.py close` | via #1 | non |
| 3 | `autopilot.py:1684` | `LEDGER.write_text("".join(new_lines))` **direct** | non |
| ? | `golden_collector.py`, `ledger_patch_*.py`, `roadmap_to_ledger.py`, `director.py` | divers | non |

Les 3 paths nommés par l'IMP : **watcher autopilot (#3), CLI kaizen_loop (#1), close_imp (#2)**.
#1 et #2 passent tous deux par `save_ledger`. #3 est un `write_text` direct dans `autopilot.py`.

**Contrainte de nuit : NE PAS TOUCHER autopilot.py** (build cockpit en cours, non committé).
→ Le path #3 ne peut pas être routé cette nuit. C'est précisément ce qui rend l'IMP
AUDIT_REQUIRED : router le watcher autopilot est une décision d'architecture pour Pierre.

## Stratégie : un writer gardé unique + concurrence détectée

Créer un **single-writer** gouverné que tous les écrivains doivent emprunter. Deux verrous :

1. **Gate de gouvernance** : `governor.check(action)` → BLOCK ⇒ exception (`GovernanceError`).
2. **Exclusion mutuelle + concurrence optimiste** : verrou exclusif `*.writelock` (O_EXCL)
   + empreinte (fingerprint sha256) du fichier lue à l'ouverture et re-vérifiée avant write.
   Écriture concurrente (lock tenu OU fingerprint changé sous le writer) ⇒ exception
   (`ConcurrentWriteError`). → satisfait l'acceptance "ecriture concurrente -> exception".

## Changements exacts (fichier:ligne)

### NOUVEAU `governance/ledger_writer.py`

```python
class LedgerWriteError(Exception): ...
class GovernanceError(LedgerWriteError): ...
class ConcurrentWriteError(LedgerWriteError): ...

def fingerprint(path: Path) -> str | None:    # sha256 du contenu, None si absent
def guarded_write(path, content, *, action, expected_fingerprint=None) -> None:
    # 1. governor.check(action) -> not allowed => GovernanceError
    # 2. O_EXCL sur <path>.writelock -> FileExistsError => ConcurrentWriteError
    # 3. try: if expected_fingerprint is not None and fingerprint(path) != expected_fingerprint:
    #              raise ConcurrentWriteError  (le fichier a bougé sous nous)
    #          écrire tmp + os.replace (atomique)
    #    finally: close + unlink writelock
```
- `action` par défaut côté ledger : `{"lane": "SAFE_AUTO", "mission": "ledger_write"}` → ALLOW.
  Un appelant passant une mission FORBIDDEN ou une lane inconnue est **bloqué** (preuve que le
  path est gouverné, pas juste décoratif).
- import `governor` via `sys.path` (même dossier `governance/`).

### `lab/chains/kaizen_loop.py:save_ledger` (ligne 81)

Router à travers `guarded_write` :
- ajouter `governance/` au `sys.path` (en tête) + `from ledger_writer import guarded_write`.
- `save_ledger(path, data, *, expected_fingerprint=None)` : construit le texte (header +
  `yaml.dump`) puis `guarded_write(path, text, action={"lane":"SAFE_AUTO","mission":"ledger_write"}, expected_fingerprint=expected_fingerprint)`.
- `load_ledger` : renvoyer aussi l'empreinte ? Non — garder l'API. `cmd_close`/`cmd_add`
  calculent l'empreinte juste après `load_ledger` et la passent à `save_ledger` (concurrence
  optimiste de bout en bout). Changement minimal : empreinte optionnelle, défaut None
  (= pas de check optimiste, seul le writelock protège).

> Garder `save_ledger` rétro-compatible : `expected_fingerprint` keyword optionnel.

## Ce qui NE change PAS (et résidus pour la gate Pierre)

- **autopilot.py NON MODIFIÉ** — path #3 reste non routé. Documenté comme **résidu** :
  Pierre décide en gate si le watcher autopilot doit appeler `guarded_write` (touche
  autopilot.py, hors scope nuit). Sans ça, le single-writer protège #1/#2 et **détecte**
  une écriture autopilot concurrente *côté kaizen_loop* via l'empreinte optimiste (si
  autopilot a écrit entre load et save, fingerprint mismatch → exception), mais n'empêche
  pas autopilot lui-même d'écrire.
- `golden_collector`, `ledger_patch_*`, `roadmap_to_ledger`, `director` : write paths
  supplémentaires non couverts ce soir — listés pour Pierre, hors des 3 nommés.
- Le format YAML produit (header + dump) — identique, byte-pour-byte, à l'actuel.

## Risques

- **R1 — autopilot non gouverné** : cœur du résidu AUDIT. Détecté (fingerprint) mais pas
  empêché. Décision Pierre.
- **R2 — writelock orphelin** : si guarded_write crashe entre O_EXCL et finally. Mitigation :
  le `finally` couvre tout sauf kill -9 ; un writelock orphelin bloquerait les writes
  suivants. → réutiliser le TTL/staleness d'IMP-193 ? Hors scope strict ; noté. Pour l'instant
  writelock = court-vécu (durée d'un dump), risque faible. À discuter en gate.
- **R3 — import croisé** : kaizen_loop (lab/chains) importe ledger_writer (governance) qui
  importe governor (governance). sys.path manipulé. Vérifier pas de cycle (aucun : governor
  pur, ledger_writer ne dépend que de governor).
- **R4 — perf** : sha256 du ledger à chaque write. Fichier ~quelques 100 ko → négligeable.

## Oracle pytest exact

```powershell
.\.venv312\Scripts\python.exe -m pytest scripts/phase0_tests/test_imp194_single_writer.py -v
```

Cas couverts (tous sur tmp_path, jamais le vrai ledger) :
- write normal (action SAFE_AUTO) → succès, contenu écrit
- writelock déjà tenu (simulate O_EXCL existant) → `ConcurrentWriteError`
- fingerprint changé sous le writer → `ConcurrentWriteError`
- action mission FORBIDDEN (`dataset_reset`) → `GovernanceError`
- action lane inconnue → `GovernanceError`
- `save_ledger` (kaizen_loop) avec fingerprint stale → exception propagée
- round-trip : write puis relire le YAML donne les mêmes improvements

---

## RÉVISION RED TEAM (post-adversaire)

- **RT-194-3 (HIGH) — TOCTOU sur fingerprint.** Ne PAS muter le dict `data` (casserait
  `test_imp060_domain` qui compare l'égalité). **Fix :** cache module-level
  `_LAST_READ_FINGERPRINT[str(path.resolve())] = sha256(bytes lus)` rempli par `load_ledger`
  (sur les **mêmes octets** qu'il parse). `save_ledger` lit ce cache comme `expected_fingerprint`
  par défaut. Dict pristine → zéro régression test, zéro fuite YAML.
- **RT-194-4 (HIGH) — writelock orphelin sans TTL → blocage permanent.** Le writelock porte
  désormais `pid+ts` et `guarded_write` applique une staleness (pid mort via psutil OU
  age > TTL) avant de lever `ConcurrentWriteError` ; un writelock stale est auto-recyclé.
  (Duplication assumée de la logique 193 ; refactor partagé = candidat futur.)
- **RT-194-6 (MEDIUM) — `os.replace` Windows + byte-for-byte.** tmp créé **dans le même
  répertoire** que le ledger (même volume). Écriture en **mode texte UTF-8** (même politique
  newline que l'actuel `open("w")` → CRLF préservé). Retry borné sur `PermissionError`
  (sharing violation Windows). Test d'idempotence byte-for-byte (re-save inchangé = octets
  identiques).
- **RT-194-7 (MEDIUM) — gate gouvernance "décorative".** Reformulé honnêtement : le gate
  enforce le **contrat** (toute écriture déclare une action gouvernée ; mission FORBIDDEN /
  lane inconnue → `GovernanceError`). Gating **par-lane-de-l'IMP volontairement ÉVITÉ** : il
  bloquerait les clôtures AUDIT légitimes (ratification Pierre via CLI ne passe pas
  `audit_passed`). Les "teeth" de l'acceptance = le verrou de concurrence, pas le gate.
- **RT-194-1 (CRITICAL) — `autopilot.py:1684` bypasse tout.** Garantie **PARTIELLE** assumée :
  protège #1/#2, **détecte** (fingerprint) mais n'**empêche pas** une écriture autopilot.
  Test ajouté démontrant le lost-update (write_text non gardé pendant writelock tenu). Décision
  d'architecture = **gate Pierre**.
- **RT-194-2 (HIGH) — guard opt-in.** Recommandation pour Pierre : grep-guard CI refusant tout
  write `IMPROVEMENT_LEDGER` hors `ledger_writer.py`. Liste complète des writers résiduels
  fournie. Pas de CI ce soir (scope).
- **RT-194-5 (MEDIUM) — `close_imp` rétrograde un échec en print mais `run_loop` log SUCCESS.**
  Hors scope 194 (fichier kaizen_autoloop) → candidat IMP consigné pour Pierre.
- **RT-194-8 (LOW) — import.** `ledger_writer` chargé via chemin ancré sur `__file__`
  (repo root = `parents[2]` depuis kaizen_loop), pas de pollution sys.path générique.
- **Test de NON-RÉGRESSION obligatoire :** `lab/chains/test_imp060_domain.py` (utilise
  save/load_ledger) doit rester vert après le reroutage.
