# RUNTIME_INVENTORY_ORACLE_AUDIT_V1

*2026-08-04. **Audit lecture seule.** Aucun runtime créé, aucun agent, aucun contrat
modifié. `roles.yaml`, `capabilities.json`, `agent_recipes.json` non touchés. Ce document
est une **mesure**, pas une décision.*

---

> **Correction du 2026-08-04 (même jour)** — ce rapport affirme plus bas que les deux
> écarts réels sont « hors périmètre Forge ». **C'est faux pour `scripts/council.py`** :
> `scripts/forge/runtime.py:64` fait `from council import QwenAdapter`, et c'est par là que
> passe l'exécution Qwen du rôle déclaré `redteam_reviewer`. Ce n'est pas un vestige, c'est
> une dépendance non déclarée du runtime de la Forge. Détail et options dans
> `external_runtime_inventory.md`. Le reste du rapport tient.

## STATUS

```
Déclaré : 16 rôles runtime          Observé par événement : 12
Code scanné : 229 fichiers          Candidats retenus : 36

DECLARED_AND_OBSERVED : 12
DECLARED_NOT_OBSERVED : 4    (observation_window_required = true)
OBSERVED_NOT_DECLARED : 0    au sens des événements
                        2    au sens du CODE — et c'est le cas critique
```

Le périmètre **Forge est propre**. Les deux écarts réels sont hors Forge.

---

## DECLARED_RUNTIME

| runtime | rôle / modèle | source | observed | evidence |
|---|---|---|---|---|
| `architect` | `claude-opus-4-8` | roles.yaml (1 contrat) | ✅ événement | `dispatch.prepared` ×4 |
| `art_director` | `claude-opus-4-8` | roles.yaml (1 contrat) | ❌ | — |
| `builder` | `claude-haiku-4-5` | roles.yaml (2 contrats) | ✅ événement | ×16 |
| `contract_author` | `claude-opus-4-8` | roles.yaml (1) | ✅ événement | ×4 |
| `decompose` | `claude-opus-4-8` | roles.yaml (1) | ✅ événement | ×4 |
| `deterministic` | `non-llm` | roles.yaml (6) | ✅ événement | ×100 |
| `forge_toolsmith` | `claude-sonnet-5` | roles.yaml (**20 contrats**) | ❌ | — |
| `game_forger` | `claude-opus-4-8` | roles.yaml (2) | ✅ événement | ×28 |
| `orchestrator` | `claude-fable-5` | roles.yaml (0 contrat, **descriptif assumé**) | ❌ | — |
| `prisme` | `claude-opus-4-8` | roles.yaml (5) | ✅ événement | ×4 |
| `redteam_code` | `claude-opus-4-8` | roles.yaml (1) | ✅ événement | ×20 |
| `redteam_reviewer` | `qwen2.5-14b-instruct` | roles.yaml (2) | ✅ événement | ×4 |
| **`repair_runtime`** | `qwen2.5-14b-instruct` | roles.yaml + **`runtime_contracts`** | ✅ événement | `dispatch.prepared/executed` ×4 SIGNED + `repair.result` ×2 |
| `run_orchestrator` | `claude-opus-4-8` | roles.yaml (1) | ❌ | — |
| `wiremap` | `claude-opus-4-8` | roles.yaml (4) | ✅ événement | ×12 |
| `worldscan` | `claude-haiku-4-5` | roles.yaml (1) | ✅ événement | ×4 |

**Un seul rôle sur 16 déclare un `entrypoint`, un `adapter` et un `kill_switch`** :
`repair_runtime` (`scripts/forge/repair_step.mjs` · `repair_runtime_adapter.mjs` ·
`FORGE_REPAIR=0`). Les 15 autres ne déclarent qu'un modèle. **Conséquence directe : pour
eux, la comparaison code↔déclaration ne peut pas être faite par identité d'entrypoint —
seulement par observation.**

Rattachement au catalogue : `worldscan` → `instance_separation`, `repair_runtime` →
`targeted_field_repair`. Les 14 autres n'ont **aucune capacité** dans `capabilities.json`
et n'apparaissent dans **aucune recette**.

---

## CODE_RUNTIME_INVENTORY

36 fichiers retenus sur 229 (critère : mention d'un modèle, ou `subprocess`+écriture).
Après vérification manuelle de chaque candidat citant un modèle :

### A. Appellent réellement un modèle, AU SERVICE d'un rôle déclaré — pas une dérive

| entrypoint | model | writer | evidence |
|---|---|---|---|
| `scripts/forge/run_real.py` | `claude` CLI (`_CLAUDE_CMD`, l.77, `subprocess.run`) | oui | exécute les étapes dont le `capability_role` est déclaré |
| `scripts/forge/runtime.py` | LM Studio via `run_qwen_step()` (l.114) | non | route le provider `lmstudio` pour `redteam_reviewer` |
| `scripts/forge/repair_step.mjs` | LM Studio (`/v1/chat/completions`) | oui | **déclaré depuis le 2026-08-04** — `repair_runtime` |

### B. Appellent réellement un modèle, SANS aucun runtime déclaré — **le cas critique**

| entrypoint | model | writer | evidence |
|---|---|---|---|
| `scripts/council.py` | **Qwen** (`requests.post` LM Studio :1234, l.292) **+ Gemini Flash** (`requests.post GEMINI_URL`, l.333, clé via `os.getenv`) | oui (`PLAN.md`, `CONSENSUS.md`) | 572 lignes, dernière modif 2026-06-30 |
| `scripts/claude_proxy.py` | `claude --print` (`subprocess.run`, l.119), servi en HTTP :8765 | non | 263 lignes, dernière modif 2026-06-26 |

Les deux sont **hors périmètre Forge** (lane STUDIO / legacy — `/council` est gelé depuis
le triage du 2026-07-19). Aucun n'est appelé par `run_real.py`. Aucun ne passe par la
porte de dispatch, donc aucun n'apparaît dans un `events.jsonl`.

`council.py` porte en plus un fait à connaître, non corrigé ici : il appelle une **API LLM
externe** (Gemini). Ce n'est pas l'API Anthropic externe que la doctrine interdit
nommément, mais c'est une sortie réseau vers un fournisseur tiers, dans un script qu'aucun
contrat ne décrit.

### C. Faux positifs du scan — vérifiés un par un, aucun appel de modèle

`cockpit_server.py` (table de ports), `dispatch_bridge.py` (check de service `:1234`),
`forge/contract.py` (nom de provider), `forge/reasoning_observability.py` (classifieur de
chaîne), `observer/adapters/forge_evidence.py` + `forge_run.py` (`_actor_kind_for_model`
teste la sous-chaîne « claude »), et 4 fichiers de `scripts/phase2_tests` /
`phase3_tests`. **9 faux positifs sur 14 candidats** — le taux dit tout de la valeur d'un
scan par expression régulière laissé seul.

---

## DRIFT_FOUND

### DECLARED_NOT_OBSERVED (4) — `observation_window_required = true`

```
art_director · forge_toolsmith · orchestrator · run_orchestrator
```

**Ne jamais conclure « mort ».** Trois lectures distinctes, à ne pas confondre :

- `orchestrator` — `roles.yaml` le déclare lui-même **purement descriptif** : aucun code
  ne le résout, la session l'incarne. Il sera *toujours* dans cette liste. Ce n'est pas
  une dérive, c'est une entrée documentaire.
- `forge_toolsmith` — **20 contrats** le déclarent, plus que tout autre rôle. Zéro
  observation. L'explication la plus probable est la fenêtre : les 4 projets observés
  sont des runs de jeu, pas des missions d'outillage.
- `art_director`, `run_orchestrator` — 1 contrat chacun, hors des 4 runs observés.

### OBSERVED_NOT_DECLARED

```
par événement : 0
par code      : 2   → scripts/council.py · scripts/claude_proxy.py
```

**Aucune correction appliquée.** Aucun rôle créé, aucun fichier déplacé, aucune
suppression. Ce sont deux faits, remontés à Pierre.

---

## OBSERVER_COVERAGE

Les deux ensembles sont **séparés**, jamais fusionnés :

```
OBSERVED_BY_EVENT (12 rôles)
  architect · builder · contract_author · decompose · deterministic · game_forger
  prisme · redteam_code · redteam_reviewer · repair_runtime · wiremap · worldscan
  → source : lab/reports/observer/*/events.jsonl (reçus signés + traces mécaniques)

OBSERVED_BY_CODE (2 entrypoints)
  scripts/council.py · scripts/claude_proxy.py
  → source : lecture du code. AUCUN événement. Présence ≠ exécution.
```

La distinction est la seule chose qui empêche l'audit de mentir dans les deux sens : un
rôle vu par événement **a tourné** ; un entrypoint vu par code **peut appeler un modèle**,
sans qu'on sache s'il l'a jamais fait.

Modèles observés (11 686 événements) : `claude-opus-4-8` 4 557 · `claude-haiku-4-5` 722 ·
`claude-sonnet-5` 430 · `claude-opus-5` 268 · `non-llm` 75 · **`qwen2.5-14b-instruct` 11**
· `sonnet` 4 · `<synthetic>` 2.

Entrypoints présents dans les événements : `claude-desktop` (51), **`scripts/forge/repair_step.mjs`
(2)**. Un seul runtime publie son entrypoint dans sa trace — celui qui a été câblé ce
matin. Les autres ne le publient pas, donc l'oracle ne peut pas les rapprocher du code.

---

## LIMITATIONS

**Fenêtre temporelle inconnue** — 4 projets observés (`breakout_v2`, `pong`, `tetris`,
`p5_gridnav`) + `repair_runtime_v1`. Aucune fenêtre n'est définie : « jamais observé »
signifie ici « absent de ces runs-là », pas « inactif depuis N jours ». C'est le pré-requis
non tranché de `RUNTIME_DRIFT_ORACLE_CONTRACT_V1`, et cet audit en est la démonstration
directe : `repair_runtime` était `DECLARED_NOT_OBSERVED` il y a trois heures.

**Extracteurs non validés** — le scan de code est une heuristique par expression
régulière (mentions de modèle, `subprocess`, écritures). Il n'a pas été validé contre un
corpus de référence. Mesuré aujourd'hui : **9 faux positifs sur 14** candidats citant un
modèle. Chacun a été vérifié à la main ; à la prochaine passe, ce ne sera peut-être plus
le cas.

**Faux positifs possibles** — un fichier qui *nomme* un modèle dans une chaîne, un
commentaire, une table de ports ou un classifieur est indiscernable, en regex, d'un
fichier qui l'appelle. `observer/adapters/forge_evidence.py` en est l'exemple parfait :
il matche « claude » parce qu'il **classe** les noms de modèles.

**Faux négatifs certains** — un runtime qui appellerait un modèle par un chemin non
couvert par les motifs (client wrappé, variable d'environnement, import dynamique,
binaire tiers) resterait invisible aux deux méthodes. L'audit ne prouve pas qu'il n'y en a
pas.

**Code non exécuté ≠ runtime actif** — `council.py` et `claude_proxy.py` sont présents et
capables d'appeler un modèle. Rien ici ne dit qu'ils ont tourné récemment, ni qu'ils
tourneront. Inversement, rien ne dit qu'ils ne tournent pas : ils n'émettent aucune trace.

**Non mesuré** — `scripts/studioV2/` (lane gelée) a été scanné mais aucun de ses fichiers
n'appelle de modèle selon les motifs ; `autopilot.py` (9 029 lignes, hors `scripts/`) n'a
pas été scanné, la mission bornant le périmètre à `scripts/`. Il consomme
`lab/agent_policy/*.json` et pourrait contenir des appels de modèle non inventoriés ici.

---

## VERDICT

```
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

La Forge peut désormais répondre mécaniquement :

- **Quels runtimes existent réellement ?** 3 entrypoints appellent un modèle au service de
  rôles déclarés, 2 le font sans aucun rôle (hors Forge).
- **Lesquels sont déclarés ?** 16 rôles, dont 1 seul avec entrypoint + adapter + kill_switch.
- **Lesquels sont observés ?** 12 par événement, 2 par code seulement.
- **Quels écarts ?** 4 déclarés-non-observés (fenêtre requise), 0 observé-non-déclaré par
  événement, **2 par code**.
