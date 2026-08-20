# studio/factory — couche d'orchestration de l'usine (IMP-188)

Pipeline : `IR → template_engine → llm_logic_engine → oracle_sim → registry`.

## Ce que c'est (et ce que ce n'est pas)

`studio/factory` **n'est pas un nouveau moteur**. C'est une couche
d'orchestration qui *wrappe* `studio_core/` (la seule source de vérité du
runtime : `ir/`, `compiler/`, `runtime/`, `sim/`). Décision actée pour éviter
deux moteurs IR/sim qui divergeraient.

| Fichier | Rôle | Frontière |
|---|---|---|
| `ir_schema_v1.json` | Schéma JSON universel d'IR de jeu (Draft-07). Généralise les deux formats préexistants (snake `studio_core/ir` + chess `studio_core/factory/manifest.py`). | Valide la **structure** seulement. |
| `template_engine.py` | IR → squelette structurel **déterministe**. | **Zéro LLM.** Chaque règle reçoit un slot `logic = None`. |
| `llm_logic_engine.py` | Remplit le slot `logic` via `claude_proxy:8765`. | **Ne touche jamais la structure.** Dégradation gracieuse si proxy down. |
| `oracle_sim.py` | Oracle à code de sortie (PASS=0 / FAIL=1 / UNAVAILABLE=2). | **Zéro LLM.** Un oracle qui consulte un LLM n'est pas un oracle. |
| `factory_loop.py` | Orchestrateur. `governor.check()` avant action ; promote registry **uniquement** sur oracle vert ; registry signé HMAC. | Aucun git, aucun push. |

## Oracle — état honnête

- **Aujourd'hui** : `HeadlessSimOracle` exécute N sessions *seedées* (déterministe)
  du runtime `studio_core/sim/headless_sim.py`. C'est le seul oracle qui **tourne
  réellement**, et il ne s'applique qu'aux IR jouables par ce runtime (type snake).
- **Limite à connaître** : cet oracle atteste le **runtime studio_core**, pas la
  logique générée par le LLM. Un `PROMOTED` avec `logic_complete: false` signifie
  « runtime vert, logique LLM non encore remplie » — c'est tracé tel quel dans le
  registry (`logic_complete`, `scaffold_sha256`).
- **Seam Godot** : `GodotHeadlessOracle` est le point de branchement de la cible
  doctrinale (« build Godot headless exit 0 »). Il se déclare `UNAVAILABLE` tant
  qu'aucun `project.godot` + binaire Godot n'existe — **jamais un faux PASS**.

## Usage

```bash
# Pipeline complet sur l'IR snake jouable (oracle réel) :
.venv312/Scripts/python.exe studio/factory/factory_loop.py

# Sur un IR donné :
.venv312/Scripts/python.exe studio/factory/factory_loop.py --ir <chemin.json>

# Oracle seul (code de sortie) :
.venv312/Scripts/python.exe studio/factory/oracle_sim.py <chemin.json>

# Tests :
.venv312/Scripts/python.exe -m pytest studio/factory/tests/ -v
```

`STUDIO_HMAC_KEY` dans l'environnement → le registry est signé (`registry.json.hmac`).

## Prochaines briques (hors IMP-188)

- IR Chess Fantasy authoré en `ir_schema_v1` + pont Rocky (Rust) → Python.
- Projet Godot réel + `GodotHeadlessOracle` câblé (exit 0).
