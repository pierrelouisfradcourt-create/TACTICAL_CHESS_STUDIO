# PLAN — IMP-201 : Oracle semantic — HumanGate obligatoire design/balance/doc

**Lane:** AUDIT_REQUIRED · **oracle_type:** humangate · **Impact:** MEDIUM
**blocked_by (matérialisé):** IMP-195, IMP-196 — **tous deux encore OPEN** (gate Pierre pendante).
**Acceptance:** `checklist JSON schema validée + gate Pierre` · transition `ORACLE_PENDING→VERDICT_SIGNED`
bloquée sans ratification (pas d'auto-pass).

> AUDIT_REQUIRED → implémente + teste + **commit local**, **NE FERME PAS** (gate Pierre).
> Aucun push. `autopilot.py`, `ecg.py`, `governor.py` non touchés (le module compose par-dessus).

## Objectif (le sens, pas que le mécanisme)

Pour les IMP **design / balance / doc** non couverts par un oracle mécanique (cargo/pytest), il faut
un **oracle sémantique** : une **checklist JSON-schema validée** que **Pierre ratifie**. Règles dures :
1. **Tout IMP a EXACTEMENT un `oracle_type`** ∈ {code, structure, humangate, none} ; non-automatable
   ⇒ **humangate** (jamais `none` pour signer).
2. La transition ECG **`ORACLE_PENDING → VERDICT_SIGNED`** est **bloquée sans ratification** —
   **pas d'auto-pass** : humangate exige une checklist ratifiée ; code/structure exigent une preuve
   d'oracle mécanique passé.

## Design — `governance/semantic_oracle.py` (compose au-dessus de ecg, pur)

```python
import ecg                                   # state machine (IMP-195) — réutilisé, pas réécrit
VALID_ORACLE_TYPES = ecg.VALID_ORACLE_TYPES  # {code, structure, humangate, none}

CHECKLIST_SCHEMA = {...}                      # JSON Schema (draft-07) — artefact de ratification
  # required: imp_id, oracle_type, items[≥1]{id,question,checked:bool,evidence}, ratified_by, ratified_ts

class SemanticOracleError(Exception): ...
class OracleTypeError(SemanticOracleError): ...

def validate_checklist(obj) -> None                  # jsonschema si dispo, sinon validateur maison
def exactly_one_oracle_type(imp) -> str              # champ + notes ; exactement 1, valide, sinon raise
def requires_humangate(imp) -> bool                  # type/domain/title ∈ design|balance|doc
def can_sign_verdict(imp, ratification=None) -> ecg.Decision   # GATE ORACLE_PENDING->VERDICT_SIGNED
def oracle_type_violations(data) -> list[dict]       # IMPs sans oracle_type unique/valide (audit)
```

`can_sign_verdict(imp, ratification)` :
1. `base = ecg.can_transition(current_state(imp), "VERDICT_SIGNED")` ; si BLOCK → renvoyer BLOCK
   (donc seul un IMP en **ORACLE_PENDING** peut être signé — réutilise la garde ECG, pas de doublon).
2. `ot = exactly_one_oracle_type(imp)`.
   - `ot == "none"` → **BLOCK** « non-automatable → reclasser humangate » (règle 1, anti-`none`).
   - `ot == "humangate"` → `ratification` **obligatoire** : `validate_checklist` + `ratified_by`
     non vide + **tous** les items `checked` ; sinon **BLOCK** (pas d'auto-pass).
   - `ot ∈ {code, structure}` → `ratification.oracle_passed is True` requis (preuve mécanique) ;
     sinon **BLOCK** (jamais d'auto-pass non plus).

Pur : aucune horloge (ts dans la ratification), aucune I/O, déterministe.

## Ce qui NE change PAS / réutilisation skills

- Réutilise `ecg.can_transition` / `current_state` / `parse_notes_meta` (pas de réécriture).
- S'aligne sur la doctrine `verdict`/`smoke-check`/`gate` (cf. skills_reuse_map : Reviewer **appelle**
  l'oracle, ne le **substitue** jamais ; DREAMS = gate-only). Ce module = la brique « oracle
  sémantique » que le Reviewer/gate consomme pour les IMP non mécanisables.
- `claim_verdict` reste `NO_CLAIM_ALLOWED`. Aucune écriture ledger/DREAMS par ce module.

## Risques (RED TEAM — à intégrer après revue sous-agent RedTeam)

- **RT-201-1 CRITICAL — auto-pass humangate** : sans ratification, `can_sign_verdict` DOIT BLOCK.
  Test : humangate + ratification None → BLOCK ; + checklist incomplète (item non coché) → BLOCK.
- **RT-201-2 CRITICAL — bypass via oracle_type=none/manquant** : `none`/absent → BLOCK + violation
  signalée. Non-automatable (design/balance/doc) sans humangate → `requires_humangate` True ⇒ flag.
- **RT-201-3 HIGH — transition hors ORACLE_PENDING** : un IMP en IN_PROGRESS/CLOSED ne peut être
  signé (la garde ECG le refuse). Test : current_state ≠ ORACLE_PENDING → BLOCK.
- **RT-201-4 HIGH — checklist malformée acceptée** : schema strict (item sans `checked`, items vide,
  champ manquant) → `validate_checklist` raise. Tests.
- **RT-201-5 MEDIUM — oracle_type ambigu** (champ vs notes divergents) → `exactly_one_oracle_type`
  raise (pas de choix silencieux). Test divergence.
- **RT-201-6 MEDIUM — code/structure auto-pass** : sans preuve `oracle_passed` → BLOCK. Test.
- **RT-201-7 LOW — dépendance jsonschema** : fallback validateur maison si lib absente ; même verdict.

## Oracle (de CETTE IMP) — déclaré honnêtement

L'IMP-201 est `oracle_type=humangate` : sa **ratification finale** (que le mécanisme qu'elle installe
est le bon) revient à **Pierre**. Mais la **logique de gating est, elle, mécaniquement testable** :

```powershell
.venv312/Scripts/python.exe -m pytest scripts/phase2_tests/test_imp201_semantic_oracle.py -v
```
Cas : checklist valide OK / malformée → raise ; humangate sans ratification → BLOCK ; humangate
ratifiée complète → ALLOW ; checklist incomplète → BLOCK ; oracle_type none/absent/multiple → raise/
BLOCK ; transition hors ORACLE_PENDING → BLOCK ; code/structure sans preuve → BLOCK.
**software_verdict mécanique = OK** ; **claim final = HumanGate (Pierre)** → **commit, NE FERME PAS**.

---

## RÉVISION RED TEAM (sous-agent Factory, role RedTeam — intégrée)

10 findings (2 CRITICAL, 2 HIGH, 3 MEDIUM, 3 LOW). Corrigés dans le code + oracle (31/31) :
- **F1 CRITICAL — bypass design-as-code** : un IMP non-automatable déclaré `oracle_type=code`
  contournait la HumanGate (la garde routait sur le champ déclaré). **Fix** : `can_sign_verdict`
  applique `requires_humangate(imp) and ot != "humangate" → BLOCK`. Test `test_design_declared_as_code_blocked_at_gate`.
- **F2 CRITICAL — replay cross-IMP** : une checklist ratifiée pour IMP-X resignait IMP-Y (aucun
  binding). **Fix** : `ratification.imp_id == imp.id` obligatoire (humangate ET code/structure).
  Tests `test_humangate_imp_id_mismatch_blocked`, `test_code_proof_imp_id_mismatch_blocked`.
- **F3 HIGH — divergence jsonschema/fallback** : fallback plus faible (imp_id `startswith`, items
  non typés). **Fix** : parité (`^IMP-\d+$`, item.id/question str non vides) + param `prefer_fallback`
  pour tester la branche maison. Tests de parité.
- **F4 HIGH — preuve mécanique = booléen non authentifié** : atténué par le binding imp_id +
  `oracle_passed is True` (strict, pas truthy). **Résidu (fog → Pierre)** : pas de vérif HMAC ici —
  **déléguée à `verdict`/`smoke-check`** (doctrine Reviewer : appelle l'oracle signé, ne le
  substitue pas). Ne pas dupliquer la primitive HMAC dans ce module sans décision.
- **F6 MEDIUM — `all([])` vérité vacante** : `items` vides → BLOCK explicite (defense-in-depth) en
  plus du schema. Test `test_gate_empty_items_blocked`.
- **F7 MEDIUM — `ecg_state` falsifié vs `status`** : un IMP CLOSED réétiqueté `ecg_state=ORACLE_PENDING`
  passait. **Fix** : `_state_contradiction` BLOCK si `ecg_state` contredit `status` legacy sur CLOSED.
  Test `test_ecg_state_contradicts_closed_status_blocked`.
- **F9 LOW — exceptions non-typées s'échappaient** (`oracle_type=[…]` → TypeError). **Fix** : type-guard
  + `try/except Exception → BLOCK` (fail-closed, jamais de raise/ALLOW). Tests fail-closed.
- **F5 MEDIUM (résidu documenté — fog → Pierre)** : `requires_humangate` est une heuristique
  sous-chaîne (`design/balance/doc/ux/...`), évitable dans les deux sens (faux nég/pos). Pas de champ
  `category` structuré dans le ledger → corriger nécessiterait un champ ledger (décision Pierre).
- **F8 LOW (accepté)** : `import ecg` nu = **convention du repo** (`governor`/`soa_router`/`error_journal`
  font pareil ; `kaizen_loop` insère `governance/` dans `sys.path`). Cohérent, non modifié.
