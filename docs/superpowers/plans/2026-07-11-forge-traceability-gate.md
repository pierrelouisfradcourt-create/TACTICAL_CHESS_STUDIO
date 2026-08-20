# Forge Traceability Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une WireMap rouge (fonctions renommées/manquantes) auto-corrige via la boucle de re-build existante, avec le jeu de règles (features R1..R12) gelé pour que l'auto-correction ne puisse jamais supprimer/ajouter une règle.

**Architecture:** Un check déterministe `check_feature_set_frozen` compare l'ensemble des features de la WireMap courante à une référence figée à s5 (`wiremap_frozen.json`). Le skill `/forge` s10c branche WireMap dans `oracle_ok` (renommage → escalade existante) et traite une violation du gel comme STOP dur → HumanGate.

**Tech Stack:** Python 3.12 (`.venv312`), pytest ; `json` + `set` (aucune dépendance).

## Global Constraints

- Verdict discipline : `claim_verdict: NO_CLAIM_ALLOWED` ; séparer software/evidence/claim.
- Zone protégée `tests/**` (racine repo) jamais modifiée ; les tests forge vivent sous `scripts/forge/tests/` (autorisés).
- Oracles = déterministes non-LLM ; aucune garde n'appelle un LLM.
- Encodage `utf-8` explicite sur tout accès fichier Python. Chemins repo-relatifs.
- Pas de commit/push sans go explicite Pierre — les steps « Commit » sont préparés, exécutés seulement sur go.
- Réutilise `MAX_ESCALATIONS` (=3) existant ; aucune nouvelle orchestration.
- Une règle = son champ `feature` (ex. `"R7 collecte piece -> compteur+1"`), identité stable posée à s5.

---

### Task 1: Helpers + gel du jeu de règles `check_feature_set_frozen` (C1/C2)

**Files:**
- Modify: `scripts/forge/static_oracles.py` (ajout `import json` + 3 fonctions)
- Test: `scripts/forge/tests/test_feature_set_frozen.py` (nouveau)

**Interfaces:**
- Consumes : rien (stdlib).
- Produces :
  - `frozen_features_from_wiremap(wiremap: dict) -> list[str]`
  - `load_frozen_features(run_dir: Path | str) -> list[str] | None`
  - `check_feature_set_frozen(wiremap: dict, frozen_features: list[str] | None) -> dict` retournant `{"passed": bool, "checked": bool, "ajoutees": list[str], "supprimees": list[str]}`.

- [ ] **Step 1: Écrire les tests qui échouent**

`scripts/forge/tests/test_feature_set_frozen.py` :

```python
"""Gel du jeu de règles (C1/C2) — l'auto-correction ne peut re-pointer que des
fonctions, jamais changer l'ensemble des règles (features)."""
import json
from pathlib import Path

from forge.static_oracles import (
    check_feature_set_frozen,
    frozen_features_from_wiremap,
    load_frozen_features,
)

WM = {
    "features": [
        {"feature": "R1 avance auto", "fonction": "step"},
        {"feature": "R2 saut", "fonction": "jump"},
        {"feature": "R3 collecte", "fonction": "collectCoin"},
    ]
}
FROZEN = ["R1 avance auto", "R2 saut", "R3 collecte"]


def test_extraction_features():
    assert frozen_features_from_wiremap(WM) == ["R1 avance auto", "R2 saut", "R3 collecte"]


def test_jeu_identique_passe():
    res = check_feature_set_frozen(WM, FROZEN)
    assert res["passed"] is True
    assert res["checked"] is True
    assert res["ajoutees"] == [] and res["supprimees"] == []


def test_regle_ajoutee_rejete():
    wm = {"features": WM["features"] + [{"feature": "R4 triche", "fonction": "x"}]}
    res = check_feature_set_frozen(wm, FROZEN)
    assert res["passed"] is False
    assert res["ajoutees"] == ["R4 triche"]
    assert res["supprimees"] == []


def test_regle_supprimee_rejete():
    wm = {"features": WM["features"][:2]}  # R3 collecte retirée
    res = check_feature_set_frozen(wm, FROZEN)
    assert res["passed"] is False
    assert res["supprimees"] == ["R3 collecte"]
    assert res["ajoutees"] == []


def test_reference_absente_checked_false():
    res = check_feature_set_frozen(WM, None)
    assert res["passed"] is False
    assert res["checked"] is False


def test_renommage_fonction_sans_toucher_regles_passe():
    # Le builder a renommé step->avancer : le jeu de règles est intact -> gel PASS
    # (c'est check_wiremap, séparé, qui signalera le renommage de fonction).
    wm = {"features": [
        {"feature": "R1 avance auto", "fonction": "avancer"},
        {"feature": "R2 saut", "fonction": "sauter"},
        {"feature": "R3 collecte", "fonction": "ramasser"},
    ]}
    res = check_feature_set_frozen(wm, FROZEN)
    assert res["passed"] is True


def test_load_frozen_features(tmp_path):
    (tmp_path / "wiremap_frozen.json").write_text(
        json.dumps({"features": FROZEN}), encoding="utf-8"
    )
    assert load_frozen_features(tmp_path) == FROZEN


def test_load_frozen_absent_renvoie_none(tmp_path):
    assert load_frozen_features(tmp_path) is None
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/test_feature_set_frozen.py -q`
Expected: FAIL — `ImportError: cannot import name 'check_feature_set_frozen'`

- [ ] **Step 3: Ajouter `import json` en tête de `static_oracles.py`**

Après `import ast` (ligne ~15), ajouter :

```python
import json
```

- [ ] **Step 4: Implémenter les 3 fonctions (fin de `static_oracles.py`)**

```python
# --- gel du jeu de règles (C1/C2, axe 2) : l'ensemble des features (R1..R12) est
# figé à s5. L'auto-correction d'une WireMap rouge peut RE-POINTER des fonctions
# (renommage), jamais SUPPRIMER/AJOUTER une règle — sinon la traçabilité devient
# une carte-tampon (une règle disparue re-verdirait la carte). ---
def frozen_features_from_wiremap(wiremap: dict) -> list[str]:
    """Liste ordonnée des noms de features (l'identité d'une règle) d'une WireMap."""
    return [f.get("feature", "") for f in wiremap.get("features", [])]


def load_frozen_features(run_dir) -> list[str] | None:
    """Lit <run_dir>/wiremap_frozen.json ; None si absent/illisible."""
    path = Path(run_dir) / "wiremap_frozen.json"
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    feats = data.get("features")
    return feats if isinstance(feats, list) else None


def check_feature_set_frozen(wiremap: dict, frozen_features: list[str] | None) -> dict:
    """Le jeu de règles courant est-il identique à la référence gelée ?

    Retourne {passed, checked, ajoutees[], supprimees[]}. PASS = ensembles égaux.
    frozen_features None (référence absente) => checked False, passed False : une
    traçabilité non ancrée n'est pas prouvée (jamais un faux vert).
    """
    if frozen_features is None:
        return {"passed": False, "checked": False, "ajoutees": [], "supprimees": []}
    current = set(frozen_features_from_wiremap(wiremap))
    frozen = set(frozen_features)
    ajoutees = sorted(current - frozen)
    supprimees = sorted(frozen - current)
    return {
        "passed": not (ajoutees or supprimees),
        "checked": True,
        "ajoutees": ajoutees,
        "supprimees": supprimees,
    }
```

- [ ] **Step 5: Lancer les tests, vérifier le succès**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/test_feature_set_frozen.py -q`
Expected: PASS (8 passed)

- [ ] **Step 6: Non-régression forge complète**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/ -q`
Expected: PASS (tout vert)

- [ ] **Step 7: Commit (préparé — attendre go Pierre)**

```bash
git add scripts/forge/static_oracles.py scripts/forge/tests/test_feature_set_frozen.py
git commit -m "feat(forge): gel du jeu de règles WireMap — check_feature_set_frozen"
```

---

### Task 2: Brancher s5 (snapshot) + s10c (auto-correction/stop) dans le skill

**Files:**
- Modify: `.claude/skills/forge/skill.md` (step s5-wiremap et step s10c-oracle-wiremap)

**Interfaces:**
- Consumes : `check_feature_set_frozen`, `load_frozen_features`, `frozen_features_from_wiremap` (Task 1) ; `check_wiremap`, `escalation_decision`, `oracle_ok` (existant, axe 1).
- Produces : la règle d'orchestration s5 (fige `wiremap_frozen.json`) et s10c (WireMap dans `oracle_ok` + STOP dur sur gel violé).

- [ ] **Step 1: s5 — figer le jeu de règles à la production de la WireMap**

Dans `.claude/skills/forge/skill.md`, sous le step `s5-wiremap` (production de la WireMap), ajouter :

```markdown
   > **Gel du jeu de règles (renfort 2026-07-11, axe 2)** : dès la WireMap produite, fige
   > l'ensemble des règles (immuable pour tout le reste du run) :
   > ```python
   > import json
   > from pathlib import Path
   > from forge.static_oracles import frozen_features_from_wiremap
   > run_dir = Path("lab/forge_runs/<projet>")
   > (run_dir / "wiremap_frozen.json").write_text(
   >     json.dumps({"features": frozen_features_from_wiremap(wiremap)}, ensure_ascii=False),
   >     encoding="utf-8")
   > ```
   > Le builder (s9) met à jour les COLONNES de la WireMap (fonction/fichiers/…) mais ne
   > touche JAMAIS `wiremap_frozen.json`. C'est l'ancre de traçabilité (quelles règles
   > doivent exister), dérivée du product_snapshot (R1..R12).
```

- [ ] **Step 2: s10c — brancher le gel + la WireMap dans l'auto-correction**

Sous le step `s10c-oracle-wiremap` (`wire = forge.static_oracles.check_wiremap(...)`), ajouter :

```markdown
   > **Auto-correction traçabilité (renfort 2026-07-11, axe 2)** : après `check_wiremap`,
   > vérifie le gel du jeu de règles puis décide :
   > ```python
   > from forge.static_oracles import check_feature_set_frozen, load_frozen_features
   > frozen = check_feature_set_frozen(wiremap, load_frozen_features(run_dir))
   > if not frozen["passed"]:
   >     # règle ajoutée/supprimée OU snapshot absent => NON auto-corrigeable
   >     # verdict BLOCKED + humangate_flags: ["jeu de règles modifié"] ; ne boucle pas.
   >     ...
   > else:
   >     # fonctions renommées/manquantes mais règles intactes => auto-corrigeable :
   >     oracle_ok = code.ok and e2e_guard["passed"] and wire["passed"]
   >     # (oracle_ok combiné alimente escalation_decision, 2. ci-dessus — re-dispatch s9
   >     #  avec rapport « rends carte↔code isomorphes, jeu de règles gelé », cap MAX_ESCALATIONS)
   > ```
   > `wire` rouge n'est donc plus un cul-de-sac : tant que le jeu de règles est intact,
   > un simple renommage déclenche un re-build ciblé au lieu d'un BLOCKED sec.
```

- [ ] **Step 3: Mettre à jour la ligne `oracle_ok` combiné (cohérence axe 1 + axe 2)**

Dans le bloc escalade (step 2 du skill), le commentaire de `oracle_ok` doit refléter les
trois oracles. Remplacer le commentaire game :

```python
   # pour un JEU : oracle_ok = code.ok and e2e_guard["passed"] and wire["passed"]  (e2e s10a + wiremap s10c)
```

Run: `grep -n "oracle_ok\|check_feature_set_frozen\|wiremap_frozen\|frozen\[" .claude/skills/forge/skill.md`
Expected: le gel apparaît à s5 (write) et s10c (check) ; `oracle_ok` combine `wire["passed"]`.

- [ ] **Step 4: Commit (préparé — attendre go Pierre)**

```bash
git add .claude/skills/forge/skill.md
git commit -m "feat(forge): skill s5 fige le jeu de règles + s10c auto-corrige la WireMap (gel gardé)"
```

---

### Task 3: Preuve d'acceptation sur données réelles

**Files:**
- Test: `scripts/forge/tests/test_feature_set_frozen_acceptance.py` (nouveau)

**Interfaces:**
- Consumes : `frozen_features_from_wiremap`, `check_feature_set_frozen`, `check_wiremap` (Task 1 + existant) ; le run réel `lab/forge_runs/collect_runner`.
- Produces : preuve que sur le cas réel, renommage = auto-corrigeable (gel PASS) et suppression = stop dur (gel FAIL).

- [ ] **Step 1: Écrire le test d'acceptation sur le run réel**

`scripts/forge/tests/test_feature_set_frozen_acceptance.py` :

```python
"""Acceptation : sur le run réel collect_runner (12 règles, fonctions renommées),
le gel du jeu de règles DISCRIMINE renommage (auto-corrigeable) vs suppression (stop)."""
import json
from pathlib import Path

import pytest

from forge.static_oracles import check_feature_set_frozen, frozen_features_from_wiremap

REPO_ROOT = Path(__file__).resolve().parents[3]
RUN = REPO_ROOT / "lab" / "forge_runs" / "collect_runner"


def _wiremap():
    p = RUN / "wiremap.json"
    if not p.exists():
        pytest.skip("run réel collect_runner absent")
    return json.loads(p.read_text(encoding="utf-8"))


def test_run_reel_a_douze_regles():
    wm = _wiremap()
    feats = frozen_features_from_wiremap(wm)
    assert len(feats) == 12, feats


def test_jeu_de_regles_intact_est_auto_corrigeable():
    # Gel = features réelles ; même WireMap => jeu intact => gel PASS (le renommage
    # de fonctions observé est auto-corrigeable, pas un stop dur).
    wm = _wiremap()
    frozen = frozen_features_from_wiremap(wm)
    res = check_feature_set_frozen(wm, frozen)
    assert res["passed"] is True and res["checked"] is True


def test_suppression_dune_regle_est_un_stop():
    # Retirer R7 du snapshot gelé (ici : de la WireMap) => supprimees non vide => stop dur.
    wm = _wiremap()
    frozen = frozen_features_from_wiremap(wm)
    amputee = {"features": [f for f in wm["features"] if not f["feature"].startswith("R7")]}
    res = check_feature_set_frozen(amputee, frozen)
    assert res["passed"] is False
    assert any(r.startswith("R7") for r in res["supprimees"])
```

- [ ] **Step 2: Lancer, vérifier la discrimination**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/test_feature_set_frozen_acceptance.py -v`
Expected: 3 passed (12 règles, jeu intact PASS, suppression FAIL).

- [ ] **Step 3: Non-régression forge complète finale**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/ -q`
Expected: PASS (tout vert).

- [ ] **Step 4: Commit (préparé — attendre go Pierre)**

```bash
git add scripts/forge/tests/test_feature_set_frozen_acceptance.py
git commit -m "test(forge): acceptation gel du jeu de règles (renommage vs suppression, run réel)"
```

---

## Self-Review

**Spec coverage :**
- C1 `check_feature_set_frozen` → Task 1. ✓
- C2 snapshot s5 + helpers `frozen_features_from_wiremap`/`load_frozen_features` → Task 1 (helpers) + Task 2 Step 1 (write s5). ✓
- C3 branchement s10c (oracle_ok + stop dur) → Task 2 Steps 2-3. ✓
- Preuve 1/2 (unitaire) → Task 1 Step 1. Preuve 3 (acceptation données réelles) → Task 3. ✓

**Placeholder scan :** aucun TODO/TBD ; tout le code est complet.

**Type consistency :** `check_feature_set_frozen(wiremap, frozen) -> {passed, checked, ajoutees, supprimees}` cohérent Task 1 (def) / Task 3 (usage) ; `load_frozen_features(run_dir) -> list|None` et `frozen_features_from_wiremap(wiremap) -> list` cohérents partout ; `oracle_ok` combine `wire["passed"]` en accord avec l'axe 1. ✓
