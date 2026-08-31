# Carte des sources d'audit de la Forge

- **Date** : 2026-08-31
- **Statut** : index de navigation — **aucune conclusion, aucune décision**
- **claim_verdict** : NO_CLAIM_ALLOWED

Ce fichier ne documente pas la Forge : il dit **où se trouve l'autorité** et **par quelle
commande la re-dériver**. Toute ligne ci-dessous est vérifiable sans faire confiance à ce
fichier. En cas de désaccord entre ce document et le code, **le code gagne** — signalez
l'écart, ne l'harmonisez pas.

**Interpréteur** : les commandes Python ci-dessous exigent le venv du dépôt
(`.venv312/Scripts/python.exe`) — `dispatch` importe `yaml`, absent du Python système.
Vérifié le 2026-08-31 : `python -c "..."` échoue en `ModuleNotFoundError: No module named 'yaml'`.

## Catégories employées

| Catégorie | Sens |
|---|---|
| `CANONICAL_SOURCE` | fait autorité ; le comportement en découle |
| `ARCHITECTURAL_DOC` | explique une intention ; peut avoir dérivé du code |
| `AUDIT_RECORD` | constat daté, reproductible, contradictoire |
| `RUN_EVIDENCE` | sortie d'exécution ; preuve d'un run, pas d'une règle |
| `HISTORICAL_RECORD` | état passé, conservé pour la lignée |
| `GENERATED_DOC` | produit par un script ; se régénère |

## 1. Sources d'autorité (`CANONICAL_SOURCE`)

| Question | Fichier | Re-dérivation |
|---|---|---|
| Quelles étapes, dans quel ordre ? | `scripts/forge/dispatch.py` → `ORDER` | `.venv312/Scripts/python.exe -c "import sys;sys.path.insert(0,'scripts');from forge import dispatch as d;print(d.ORDER)"` |
| Quels profils de chaîne ? | `scripts/forge/dispatch.py` → `PROFILES` | idem, `print(d.PROFILES)` |
| Quelles étapes sont non-LLM ? | `dispatch.py` → `DETERMINISTIC`, `DEDICATED_DETERMINISTIC_STEPS` | `d.is_deterministic_step(<etape>)` |
| Quelles étapes vivent hors `ORDER` ? | `dispatch.py` → `DEDICATED_PROFILE_STEPS` | `print(d.DEDICATED_PROFILE_STEPS)` |
| Quel modèle exécute quelle étape ? | `dispatch.py::plan_chain` + `contracts/roles.yaml` | `for p in d.plan_chain(profile="full"): print(p.etape, p.model)` |
| Que promet chaque étape ? | `scripts/forge/contracts/<etape>.yaml` | lecture directe ; schéma dans `contracts/SCHEMA.md` |
| Quel artefact chaque étape matérialise ? | `scripts/forge/run_real.py` → `_ARTIFACT_BY_STEP` | lecture directe |
| Comment un run s'exécute réellement ? | `scripts/forge/run_real.py` → `ForgeDriver` (`driver.py`) | cf. `docs/adr/ADR-003` §1 |
| Quelles suites d'oracle existent ? | `scripts/forge/oracles.json` | lecture directe |
| Qui garde le dispatch ? | `dispatch.py::prepare_dispatch`, `.claude/hooks/pretool_forge_guard.py` | `.claude/settings.json` |
| Comment un verdict est re-vérifié ? | `scripts/forge/verify_run.py` | lecture directe |

## 2. Contrats — exécutables vs dormants

Un contrat n'est **dispatchable** que si son id apparaît dans `ORDER` ou
`DEDICATED_PROFILE_STEPS`. Re-dérivation mécanique de la couverture :

```
etapes = set().union(*dispatch.PROFILES.values())
actifs = {p.stem for p in Path("scripts/forge/contracts").glob("*.yaml")}
orphelins = actifs - {e.replace("-r2","") for e in etapes}
```

Un contrat hors profil n'est pas forcément mort : il peut être un contrat **méta**
(`orchestrator.yaml`, `roles.yaml`), servir une **autre lane** (`s-asset-*` →
`asset_producer/asset_dispatch.py`), ou être une **trace figée** (`s9-build-godot`).
Pour trancher, chercher un consommateur **dans le code** :

```
grep -rn "<contrat>" --include=*.py --include=*.mjs --include=*.json scripts/ .claude/
```

Un contrat cité **uniquement** par `.claude/skills/forge/skill.md` est cité par de la
documentation, pas par un exécutant.

## 3. Limite cryptographique du HMAC — fait structurel

La clé de signature `scripts/forge/.forge_key` est **gitignorée** et n'a **jamais** été
commitée (`git log --all -- scripts/forge/.forge_key` → vide). Conséquence directe et
non contournable :

> Un verdict signé est vérifiable **sur le poste qui détient la clé**, et par personne
> d'autre. La signature atteste l'intégrité locale d'un reçu, **jamais** son authenticité
> auprès d'un tiers. Un auditeur externe ne peut donc pas valider une signature — il doit
> **ré-exécuter les oracles**.

Ceci est une propriété du dispositif, pas un défaut de publication. Ne pas pousser la clé.

## 4. Ce qui n'est pas dans le dépôt

- `scripts/forge/.forge_key` — secret, gitignoré (cf. §3).
- `scripts/forge/blender.config.json`, `godot.config.json` — configuration locale du poste ;
  gabarits versionnés : `*.config.example.json`.
- Mémoire persistante de session (`~/.claude/.../memory/`) — hors dépôt. Les doctrines
  ratifiées qui comptent sont dans `studio_brain/decisions/decision-log.md` et les ADR.
- Une partie des preuves de run (`lab/forge_evidence/`, `lab/forge_runs/`) est
  volontairement non versionnée — `RUN_EVIDENCE`, pas une règle.
