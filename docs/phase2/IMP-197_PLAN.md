# PLAN — IMP-197 : Agent Factory (capabilities.lock.json + 5 templates)

**Lane:** SAFE_AUTO · **oracle_type:** structure · **Impact:** MEDIUM
**blocked_by (matérialisé):** IMP-199 (sera CLOSED juste avant, cette phase).
**Acceptance:** `schema valide + instanciation testée (Planner/Executor/RedTeam/Explorer/Reviewer)`

> SAFE_AUTO → implémente + teste + commit + close. **Après IMP-199 vert.**

## Contexte

Les 5 templates ont été draftés en PREP Phase 0 (`docs/orchestration/agent_templates.md` :
role+goal+tools+constraints+output_schema+failure_policy). IMP-197 les **matérialise** en
`capabilities.lock.json` + un loader + un schéma, chaque instanciation validée par `governor.check()`.

## Design

### NOUVEAU `governance/capabilities.lock.json`
Les 5 rôles (Planner/Executor/RedTeam/Explorer/Reviewer), chacun :
`{role, goal, tools{read,write,exec,forbidden_write}, constraints[], output_schema{...},
failure_policy[], default_action{lane,mission}}` + `forbidden_globs[]` + `claim_posture` +
`version`. `default_action` = l'action gouvernée par défaut du rôle (sert au governor.check).

### NOUVEAU `schemas/capabilities.schema.json` (draft-07)
Valide la structure du lock : exactement les champs requis par rôle, `claim_posture` fixé,
`forbidden_globs` présents, output_schema objet, failure_policy array non vide.

### NOUVEAU `governance/agent_factory.py`
```python
class FactoryError(Exception): ...
class CapabilityViolation(FactoryError): ...   # governor BLOCK -> instanciation refusée

@dataclass(frozen=True) AgentInstance: role:str; template:dict; action:dict; decision:Decision

def load_capabilities(path=LOCK) -> dict           # charge + valide via jsonschema
def roles(caps) -> list[str]
def instantiate(role: str, caps: dict, *, action: dict | None = None) -> AgentInstance:
    # 1. role inconnu -> FactoryError
    # 2. action = action or template["default_action"]
    # 3. governor.check(action) -> not allowed -> CapabilityViolation (refus dur)
    # 4. structural guard: les write globs du rôle ne croisent pas forbidden_globs
    # 5. renvoie AgentInstance
```
- governor importé via `sys.path` (même dossier governance/).

## Ce qui NE change PAS

- `governor.py`, `ecg.py`, `soa_router.py`, `ledger_writer.py` non modifiés (réutilisés).
- `agent_templates.md` reste la doc lisible ; le lock.json en est la version machine.
- `autopilot.py` non touché.

## Risques (RED TEAM)

- **R1 lock ↛ schéma** : test de validation jsonschema (valide + invalide).
- **R2 governor non appelé** : instantiate DOIT appeler governor.check ; test qu'une action
  FORBIDDEN_MISSION / lane inconnue → CapabilityViolation (refus dur), SAFE_AUTO → OK.
- **R3 drift forbidden_globs vs doctrine** : forbidden_globs alignés sur tests/ eval/ oracle/
  bench/ puzzles/ .github/ ; test garde-fou.
- **R4 default_action incohérent** : chaque rôle a un default_action gouvernable (Executor close
  SAFE_AUTO ; pas de mission interdite par défaut). Test des 5.
- **R5 claim_posture** : doit rester NO_CLAIM_ALLOWED ; test.

## Oracle pytest exact

```powershell
.venv312/Scripts/python.exe -m pytest scripts/phase2_tests/test_imp197_factory.py -v
```
Cas : lock.json valide vs schéma ; 5 rôles présents + instanciables ; instantiate appelle
governor.check (action FORBIDDEN → CapabilityViolation ; SAFE_AUTO → OK) ; rôle inconnu → erreur ;
forbidden_globs couvrent les zones FORBIDDEN ; claim_posture=NO_CLAIM_ALLOWED ; output_schema/
failure_policy non vides pour chaque rôle.

---

## RÉVISION RED TEAM (intégrée)

- **RT-197-1 CRITICAL — governor.check à l'instanciation = tautologie** (SAFE_AUTO toujours ALLOW)
  OU bloque le Reviewer/Executor-audit si on encode leur vraie autorité. **Fix** : gouvernance
  **par-action au runtime**. `default_action` honnête et SAFE_AUTO+mission non-interdite (rôle
  instanciable) ; `instantiate(role, action=None)` valide `action or default` via governor, et
  surtout accepte une **action runtime spécifique** : une action `HUMAN_REQUIRED`/`AUDIT_REQUIRED`/
  mission FORBIDDEN → `CapabilityViolation` (refus dur). Le test prouve un **vrai BLOCK** (pas
  tautologie). Jamais `agent_activation`/`runtime_activation` en mission par défaut (FORBIDDEN).
- **RT-197-2 HIGH — schéma trop lâche** : draft-07 avec `if/then` par `role` (clés output requises
  spécifiques, ex. Reviewer→`claim_verdict`, Executor→`closed`), `minProperties≥1` sur output_schema,
  enum des 5 rôles exact, `failure_policy` non vide. Test négatif : output_schema vide → FAIL.
- **RT-197-3 HIGH — forbidden_globs illusoire / drift** : le **pre-commit hook** n'inclut PAS
  `.github/` ; governor n'a AUCUNE logique de glob. **Fix** : le test lit `.claude/hooks/pre-commit`
  et assert `lock.forbidden_globs ⊇ FORBIDDEN_du_hook`. `.github/**` gardé dans le lock (surensemble
  doctrinal — résidu : non enforced par le hook, signalé). Globs dynamiques de l'Executor (charter)
  → check **runtime** `validate_write_target(instance, paths)` (le garde statique est vacant pour eux).
- **RT-197-4 HIGH — DREAMS.md / close authority bypass HumanGate** : le Reviewer ne reçoit PAS un
  write glob DREAMS.md « nu » ; son action de ratification = `HUMAN_REQUIRED` → governor BLOCK
  autonome (gate-only, documenté). Executor `close SAFE_AUTO_only` = honnête (le close passe par
  cmd_close ECG+single-writer, IMP-203 — code committé, ratification 203 pendante : documenté).
  Test : action ratification Reviewer (HUMAN_REQUIRED) → CapabilityViolation.
- **RT-197-5 MEDIUM — 197←199 non fonctionnel** : la factory n'importe pas soa_router (concepts
  orthogonaux : agents-modèles vs rôles). Dépendance **advisory** documentée (pas de wire artificiel).
- **RT-197-6 LOW** : `encoding='utf-8'` + `safe_load` ; fixtures tmp ; ne pas muter le vrai
  capabilities.yaml/ledger/DREAMS ; le lock vit dans `governance/` (pas un artefact runtime).
