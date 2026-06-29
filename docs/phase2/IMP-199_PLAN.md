# PLAN — IMP-199 : SOA execution router (MCP-registry aware, anti sur-orchestration)

**Lane:** SAFE_AUTO · **oracle_type:** code · **Impact:** HIGH
**blocked_by (matérialisé):** IMP-195, IMP-196 — **tous deux encore OPEN** (gate Pierre pendante).
**Acceptance:** `pytest: sur-orchestration détectée → refus ; routing nominal → OK`

> SAFE_AUTO → implémente + teste + commit + **close via kaizen_loop**. ⚠️ Signaler que les deps
> 195/196 sont OPEN au moment du close (inversion d'ordre — décision Pierre au push).

## Contexte — registre réel

`openclaw/capabilities.yaml` (SSOT machine-readable) : `models[]` (chacun avec `roles[]`,
`status`, `provider`) + `skills[]` (chacun `id`, `provider`, `status`). Statuts réels :
`AVAILABLE` / `ASSUMED_AVAILABLE` / `UNKNOWN`. Le SOA **lit les capacités réelles** : seuls les
agents/skills `AVAILABLE|ASSUMED_AVAILABLE` comptent (UNKNOWN = indisponible).

Modèle :
- **agent** = un `model.id` (ex. `custom/claude-code-cli`, `lmstudio/qwen2.5-14b-instruct`).
- **capacité** = un `role` de modèle OU un `skill.id`. Un agent "couvre" ses roles + les skills
  dont il est le `provider` (si skill et agent disponibles).

## Design — `governance/soa_router.py` (pur, déterministe)

```python
class SoaError(Exception): ...
class UnavailableCapabilityError(SoaError): ...
class OverOrchestrationError(SoaError): ...

@dataclass(frozen=True) Registry: agents: dict[str, frozenset[str]]   # agent_id -> caps (dispo only)
  .capabilities -> frozenset[str]                                      # union

@dataclass(frozen=True) ExecutionPlan: agents: tuple[str,...]; covered: frozenset[str]; reason: str

def load_registry(path=CAPS_YAML) -> Registry      # parse capabilities.yaml, filtre statut
def route(task: dict, registry: Registry) -> ExecutionPlan
```

`route` :
1. `needed = set(task["required_capabilities"])`.
2. `missing = needed - registry.capabilities` → **UnavailableCapabilityError** (refus dur).
3. `plan = _greedy_cover(needed, registry.agents)` — **plus petit nombre d'agents** (set-cover
   greedy, tie-break déterministe par (couverture desc, id) ).
4. **anti sur-orchestration** : `requested = task.get("requested_agents")` ; si
   `requested is not None and requested > len(plan)` → **OverOrchestrationError** (refus dur).
   Cas trivial : `needed == ∅` → `plan = ()` (inline) ; `requested > 0` → over-orchestration.
5. `max_agents` optionnel : `len(plan) > max_agents` → CapacityExceededError (distinct ; secondaire).
6. nominal → `ExecutionPlan(agents=plan, covered=needed, reason=...)`.

Déterminisme : tri stable des agents pour le cover ; aucune horloge/random.

## Ce qui NE change PAS

- `capabilities.yaml` lu en **lecture seule** (jamais réécrit).
- Aucun import de `ecg`/`projection` → SOA **autonome** (la dep 195/196 est advisory, pas un
  hard import — d'où le close possible malgré 195/196 OPEN).
- `autopilot.py`, `governor.py`, `ledger_writer.py` non touchés.

## Risques (RED TEAM)

- **R1 set-cover non déterministe** : tie-break explicite (couverture, puis id alpha). Test ×2.
- **R2 statut mal filtré** : UNKNOWN compté comme dispo → routerait vers un agent absent. Filtrer
  strict ; test `fog` (UNKNOWN) → indisponible.
- **R3 sur-orchestration non détectée** : trivial (∅) + requested>0, ou requested>min → refus dur. Tester.
- **R4 capability inexistante** : refus dur (UnavailableCapabilityError), pas de plan partiel silencieux.
- **R5 greedy sous-optimal** : greedy ≠ cover minimal exact (NP-hard). Acceptable ; documenter ;
  l'oracle teste des cas où greedy = optimal.
- **R6 YAML manquant/corrompu** : load_registry lève proprement (pas de crash nu).

## Oracle pytest exact

```powershell
.venv312/Scripts/python.exe -m pytest scripts/phase2_tests/test_imp199_soa.py -v
```
Cas : routing nominal 1 agent (caps couvertes par 1 modèle) ; cover 2 agents (caps réparties) ;
over-orchestration (requested>min → refus) ; trivial ∅ + requested>0 → refus ; capacité
inexistante → refus ; capacité UNKNOWN (`fog`) → indisponible → refus ; déterminisme (2 routes
identiques) ; load_registry lit le vrai capabilities.yaml (smoke).

---

## RÉVISION RED TEAM (intégrée)

- **RT-199-1 CRITICAL — bypass over-orchestration** : si `requested_agents` omis → check sauté ;
  le router calcule sans **lier** l'appelant. **Fix** : `requested_agents` **OBLIGATOIRE** (absent
  /None → `SoaError`, fail-closed). `route` renvoie l'ensemble **liant** minimal ; `requested >
  minimal` → `OverOrchestrationError` (refus dur) ; `requested < minimal` → `InsufficientAgentsError`
  (ne couvre pas le besoin) ; `requested == minimal` → OK. Test : omission → refus (pas skip).
- **RT-199-2 HIGH — greedy décoratif** sur le vrai registre (chaque capacité = 1 seul provider).
  Honnête : minimalité = « nb de providers distincts couvrant le besoin » ; la vraie protection
  = le binding (RT-199-1). **Test synthétique** : registre où une capacité est offerte par 2 agents
  → le cover en choisit le minimum (prouve la minimisation).
- **RT-199-3 MEDIUM — déterminisme** : clé de tri **explicite** `(-coverage, agent_id)`. Test avec
  ordre d'insertion **mélangé** → `ExecutionPlan` identique.
- **RT-199-4 MEDIUM — parsing skills** : un skill est dispo ssi `skill.status ∈ {AVAILABLE,
  ASSUMED_AVAILABLE}` **ET** son `provider` résout vers un modèle lui-même dispo. `provider:UNKNOWN`
  ou non résolu → **drop** (jamais de capacité fantôme). Tests : fog (UNKNOWN) drop ; skill AVAILABLE
  mais modèle provider UNKNOWN → drop ; provider inconnu → drop.
- **RT-199-5 MEDIUM — contrat d'entrée** : `task.get("required_capabilities")` ; absent/None/non-liste
  → `SoaError`. Sensible à la casse (documenté). Tests task malformée.
- **RT-199-6 LOW** : `yaml.safe_load` + `encoding='utf-8'` explicites ; champs numériques UNKNOWN
  (gemini) ignorés (on ne lit que roles/skills/status). Smoke test sur l'entrée gemini.
- **RT-199-7 LOW — VÉRIFIÉ SÛR** : aucun import `ecg`/`projection` → close possible malgré 195/196 OPEN.
