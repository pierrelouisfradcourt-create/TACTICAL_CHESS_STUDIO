# Forge Mutation Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le mutation testing des jeux devient un gate « 100% ou survivant justifié » qui alimente l'auto-correction, au lieu d'un score manuel ignoré (68% qui passe en silence).

**Architecture:** `check_mutation_gate` (déterministe, dans `static_oracles.py` avec les autres gardes) compare les survivants renvoyés par `run_mutation_test` à un fichier de triage `games/<projet>/mutation_triage.json`. Un survivant non justifié → oracle rouge → boucle d'escalade existante. `mutation.py` (moteur) non touché.

**Tech Stack:** Python 3.12 (`.venv312`), pytest ; `json` + `set` ; `forge.mutation.run_mutation_test` (existant) pour l'intégration ; node pour le test d'intégration.

## Global Constraints

- Verdict discipline : `claim_verdict: NO_CLAIM_ALLOWED` ; séparer software/evidence/claim.
- Zone protégée `tests/**` (racine repo) jamais modifiée ; tests forge sous `scripts/forge/tests/` autorisés.
- `mutation.py` **non modifié** (il porte une modif `.mutbak` non commitée hors-axe, à trier séparément).
- Oracles = déterministes non-LLM. Encodage `utf-8` explicite. Chemins repo-relatifs.
- Pas de commit/push sans go explicite Pierre — steps « Commit » préparés, exécutés sur go.
- Critère de passage = « 100% ou survivant justifié » ; `total == 0` = échec (jamais un faux vert).
- Réutilise `MAX_ESCALATIONS` (=3) ; aucune orchestration nouvelle.

---

### Task 1: Gate mutation + triage (`check_mutation_gate`, `load_mutation_triage`)

**Files:**
- Modify: `scripts/forge/static_oracles.py` (2 fonctions ; `import json` déjà présent depuis l'axe 2)
- Test: `scripts/forge/tests/test_mutation_gate.py` (nouveau)

**Interfaces:**
- Consumes : stdlib (`json`, `Path` déjà importés).
- Produces :
  - `load_mutation_triage(game_dir: Path | str) -> list[dict] | None`
  - `check_mutation_gate(mutation_result: dict, triage_entries: list[dict] | None) -> dict`
    retournant `{"passed": bool, "checked": bool, "survivants_non_tries": list[str], "triage_perimes": list[str]}`.

- [ ] **Step 1: Écrire les tests qui échouent**

`scripts/forge/tests/test_mutation_gate.py` :

```python
"""Gate mutation « 100% ou survivant justifié » (C1/C2)."""
import json

from forge.static_oracles import check_mutation_gate, load_mutation_triage


def _res(total, survivors):
    killed = total - len(survivors)
    return {"total": total, "killed": killed, "survived": len(survivors),
            "score": round(killed / total, 3) if total else 1.0, "survivors": survivors}


def test_cent_pourcent_passe():
    res = _res(10, [])
    out = check_mutation_gate(res, None)
    assert out["passed"] is True and out["checked"] is True
    assert out["survivants_non_tries"] == []


def test_survivant_sans_triage_echoue():
    res = _res(10, [{"name": "cmp>=->>", "line": 3}])
    out = check_mutation_gate(res, None)
    assert out["passed"] is False
    assert out["survivants_non_tries"] == ["cmp>=->>@L3"]


def test_survivant_justifie_passe():
    res = _res(10, [{"name": "cmp>=->>", "line": 3}])
    triage = [{"name": "cmp>=->>", "line": 3, "justification": "mutant équivalent : borne inclusive jamais atteinte"}]
    out = check_mutation_gate(res, triage)
    assert out["passed"] is True
    assert out["survivants_non_tries"] == []


def test_justification_vide_echoue():
    res = _res(10, [{"name": "cmp>=->>", "line": 3}])
    triage = [{"name": "cmp>=->>", "line": 3, "justification": "   "}]
    out = check_mutation_gate(res, triage)
    assert out["passed"] is False
    assert out["survivants_non_tries"] == ["cmp>=->>@L3"]


def test_total_zero_checked_false():
    res = _res(0, [])
    out = check_mutation_gate(res, None)
    assert out["passed"] is False and out["checked"] is False


def test_triage_perime_note_non_bloquant():
    # Survivant unique justifié => PASS ; une entrée de triage sans survivant => périmée.
    res = _res(10, [{"name": "A", "line": 3}])
    triage = [
        {"name": "A", "line": 3, "justification": "équivalent"},
        {"name": "B", "line": 9, "justification": "tué depuis / disparu"},
    ]
    out = check_mutation_gate(res, triage)
    assert out["passed"] is True
    assert out["triage_perimes"] == ["B@L9"]


def test_load_triage(tmp_path):
    entries = [{"name": "A", "line": 3, "justification": "x"}]
    (tmp_path / "mutation_triage.json").write_text(json.dumps(entries), encoding="utf-8")
    assert load_mutation_triage(tmp_path) == entries


def test_load_triage_absent_none(tmp_path):
    assert load_mutation_triage(tmp_path) is None


def test_load_triage_corrompu_none(tmp_path):
    (tmp_path / "mutation_triage.json").write_text("{pas json", encoding="utf-8")
    assert load_mutation_triage(tmp_path) is None


def test_load_triage_non_liste_none(tmp_path):
    (tmp_path / "mutation_triage.json").write_text(json.dumps({"a": 1}), encoding="utf-8")
    assert load_mutation_triage(tmp_path) is None
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/test_mutation_gate.py -q`
Expected: FAIL — `ImportError: cannot import name 'check_mutation_gate'`

- [ ] **Step 3: Implémenter (fin de `static_oracles.py`)**

```python
# --- gate mutation (C1/C2, axe 3) : le mutation testing d'un JEU passe ssi tous
# les mutants sont tués OU chaque survivant est explicitement trié comme équivalent
# (justification non vide). total==0 (aucun mutant) => échec : rien n'a été prouvé. ---
def load_mutation_triage(game_dir) -> list[dict] | None:
    """Lit <game_dir>/mutation_triage.json ; None si absent/illisible/non-liste."""
    path = Path(game_dir) / "mutation_triage.json"
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return data if isinstance(data, list) else None


def check_mutation_gate(mutation_result: dict, triage_entries: list[dict] | None) -> dict:
    """« 100% ou survivant justifié ». Retourne {passed, checked, survivants_non_tries[],
    triage_perimes[]}. Un survivant (name,line) est justifié ssi une entrée de triage a la
    même clé ET une justification non vide. total==0 => checked False, passed False.
    """
    if mutation_result.get("total", 0) == 0:
        return {"passed": False, "checked": False, "survivants_non_tries": [], "triage_perimes": []}
    triage = triage_entries or []
    justified = {
        (t.get("name"), t.get("line"))
        for t in triage
        if str(t.get("justification", "")).strip()
    }
    survivors = mutation_result.get("survivors", [])
    survivor_keys = {(s.get("name"), s.get("line")) for s in survivors}
    survivants_non_tries = sorted(
        f"{s.get('name')}@L{s.get('line')}"
        for s in survivors
        if (s.get("name"), s.get("line")) not in justified
    )
    triage_perimes = sorted(
        f"{t.get('name')}@L{t.get('line')}"
        for t in triage
        if (t.get("name"), t.get("line")) not in survivor_keys
    )
    return {
        "passed": not survivants_non_tries,
        "checked": True,
        "survivants_non_tries": survivants_non_tries,
        "triage_perimes": triage_perimes,
    }
```

- [ ] **Step 4: Lancer, vérifier le succès**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/test_mutation_gate.py -q`
Expected: PASS (10 passed)

- [ ] **Step 5: Non-régression forge complète**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/ -q`
Expected: PASS (tout vert)

- [ ] **Step 6: Commit (préparé — attendre go Pierre)**

```bash
git add scripts/forge/static_oracles.py scripts/forge/tests/test_mutation_gate.py
git commit -m "feat(forge): gate mutation — 100% ou survivant justifié (check_mutation_gate)"
```

---

### Task 2: Brancher s10a (moteur + gate) + durcir s9

**Files:**
- Modify: `.claude/skills/forge/skill.md` (step s10a)
- Modify: `scripts/forge/contracts/s9-build.yaml` (`tests_oracles` / `success_criteria`)

**Interfaces:**
- Consumes : `run_mutation_test` (mutation.py), `check_mutation_gate`, `load_mutation_triage` (Task 1) ; `oracle_ok`, `escalation_decision` (existant).
- Produces : la règle d'orchestration s10a (mutation dans `oracle_ok`) + l'exigence contractuelle s9.

- [ ] **Step 1: s10a — lancer moteur + gate, fold dans `oracle_ok`**

Dans `.claude/skills/forge/skill.md`, sous le bloc du **gate e2e** de `s10a-oracle-code`, ajouter :

```markdown
     > **Gate mutation (renfort 2026-07-11, axe 3) — « 100% ou survivant justifié ».** Pour un JEU, après l'oracle-code, mute la logique et vérifie que les tests l'attrapent :
     > ```python
     > from forge.mutation import run_mutation_test
     > from forge.static_oracles import check_mutation_gate, load_mutation_triage
     > mut = run_mutation_test("games/<projet>/game.mjs",
     >                         ["node", "--test", "logic.test.mjs", "properties.test.mjs"],
     >                         cwd="games/<projet>")
     > mgate = check_mutation_gate(mut, load_mutation_triage("games/<projet>"))
     > oracle_ok = code.ok and e2e_guard["passed"] and wire["passed"] and mgate["passed"]
     > ```
     > `not mgate["passed"]` (survivant non justifié, ou `total==0` source non mutable) alimente la boucle d'escalade (2. ci-dessus) → ré-spawn s9 « tue le survivant `name@line` par un test, OU triage-le équivalent avec justification dans `mutation_triage.json` », cap `MAX_ESCALATIONS`. Fini le 68% qui passe en silence.
```

- [ ] **Step 2: Mettre à jour le commentaire `oracle_ok` combiné (escalade)**

Dans le bloc escalade (step 2 du skill), la ligne commentaire game de `oracle_ok` doit refléter les 4 gardes. Remplacer :

```python
   # pour un JEU : oracle_ok = code.ok and e2e_guard["passed"] and wire["passed"] and mgate["passed"]
   #   (e2e s10a + wiremap s10c + mutation s10a ; le gel du jeu de règles est un STOP séparé, cf. s10c)
```

- [ ] **Step 3: Réconcilier la ligne « oracle rouge → STOP » (ajouter le cas mutation)**

Remplacer la parenthèse des exceptions dans la ligne STOP pour inclure la mutation :

```markdown
   Oracle rouge (`ok is False` / `passed is False`) → **STOP**, ne passe pas les étapes suivantes — **SAUF les cas d'auto-correction bornée** (renfort 2026-07-11) : (a) garde e2e rouge (s10a), (b) WireMap rouge à jeu de règles gelé intact (s10c), (c) gate mutation rouge à survivant non justifié (s10a) alimentent la boucle d'escalade `escalation_decision` (ré-spawn s9, cap `MAX_ESCALATIONS`) au lieu de STOP. Restent des STOP durs : oracle-code/archi rouges, gel du jeu de règles violé, snapshot de gel absent, mutation `total==0`, et sommet d'escalade atteint.
```

- [ ] **Step 4: Durcir `tests_oracles` de s9**

Dans `scripts/forge/contracts/s9-build.yaml`, à la fin du bloc `tests_oracles:` (après la phrase e2e ajoutée à l'axe 1), ajouter :

```yaml
  Enfin, pour un JEU, l'oracle-code inclut un GATE MUTATION (forge.mutation.run_mutation_test
  sur game.mjs + forge.static_oracles.check_mutation_gate) : « 100% des mutants tués OU chaque
  survivant trié équivalent avec justification dans games/<projet>/mutation_triage.json ».
  Un survivant non justifié => oracle rouge (auto-correction).
```

- [ ] **Step 5: Vérifier YAML + cohérence skill**

Run: `.venv312/Scripts/python.exe -c "import yaml; d=yaml.safe_load(open('scripts/forge/contracts/s9-build.yaml',encoding='utf-8')); assert 'MUTATION' in d['tests_oracles']; print('s9 OK mutation')"`
Then: `grep -n "mgate\|check_mutation_gate\|run_mutation_test" .claude/skills/forge/skill.md`
Expected: `s9 OK mutation` ; le gate mutation apparaît à s10a et `oracle_ok` combine `mgate["passed"]`.

- [ ] **Step 6: Commit (préparé — attendre go Pierre)**

```bash
git add .claude/skills/forge/skill.md scripts/forge/contracts/s9-build.yaml
git commit -m "feat(forge): skill s10a branche le gate mutation + s9 exige 100%-ou-triage"
```

---

### Task 3: Preuve d'intégration réelle (moteur → gate, node)

**Files:**
- Test: `scripts/forge/tests/test_mutation_gate_integration.py` (nouveau)

**Interfaces:**
- Consumes : `run_mutation_test` (mutation.py), `check_mutation_gate` (Task 1).
- Produces : preuve que le gate consomme la VRAIE sortie du mutateur (pas un dict fabriqué).

- [ ] **Step 1: Écrire le test d'intégration (node requis, sinon skip)**

`scripts/forge/tests/test_mutation_gate_integration.py` :

```python
"""Intégration : un vrai run_mutation_test alimente check_mutation_gate de bout en bout."""
import shutil

import pytest

from forge.mutation import run_mutation_test
from forge.static_oracles import check_mutation_gate

pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="node absent")


def _mini_jeu(tmp_path):
    # Source mutable (a >= b) + test FAIBLE (n'assère rien) => tous les mutants survivent.
    (tmp_path / "game.mjs").write_text(
        "export function cmp(a, b) { return a >= b; }\n", encoding="utf-8"
    )
    (tmp_path / "weak.test.mjs").write_text(
        'import { test } from "node:test";\ntest("noop", () => {});\n', encoding="utf-8"
    )


def test_tests_faibles_laissent_survivre_puis_gate_rouge(tmp_path):
    _mini_jeu(tmp_path)
    res = run_mutation_test(tmp_path / "game.mjs", ["node", "--test", "weak.test.mjs"],
                            cwd=tmp_path, timeout=30)
    assert res["total"] >= 1, "le mutateur doit produire au moins un mutant sur '>='"
    assert res["survived"] >= 1, "un test faible ne tue aucun mutant"
    out = check_mutation_gate(res, None)
    assert out["checked"] is True
    assert out["passed"] is False
    assert out["survivants_non_tries"], "les survivants réels doivent remonter dans le gate"


def test_meme_survivants_tries_font_passer_le_gate(tmp_path):
    # Réconciliation : on TRIE les survivants réels du run précédent => gate PASS.
    _mini_jeu(tmp_path)
    res = run_mutation_test(tmp_path / "game.mjs", ["node", "--test", "weak.test.mjs"],
                            cwd=tmp_path, timeout=30)
    triage = [{"name": s["name"], "line": s["line"], "justification": "équivalent (test factice)"}
              for s in res["survivors"]]
    out = check_mutation_gate(res, triage)
    assert out["passed"] is True
    assert out["survivants_non_tries"] == []
```

- [ ] **Step 2: Lancer, vérifier l'intégration**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/test_mutation_gate_integration.py -v`
Expected: 2 passed (ou skipped si node absent) — le vrai run produit des survivants, le gate les remonte puis les accepte une fois triés.

- [ ] **Step 3: Non-régression forge complète finale**

Run: `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/ -q`
Expected: PASS (tout vert).

- [ ] **Step 4: Commit (préparé — attendre go Pierre)**

```bash
git add scripts/forge/tests/test_mutation_gate_integration.py
git commit -m "test(forge): intégration gate mutation — vrai mutateur -> gate (node)"
```

---

## Self-Review

**Spec coverage :**
- C1 `check_mutation_gate` → Task 1. ✓
- C2 `load_mutation_triage` + format triage → Task 1. ✓
- C3 branchement s10a + s9 → Task 2. ✓
- Preuve 1/2 (unitaire) → Task 1 Step 1. Preuve 3 (intégration réelle) → Task 3. ✓
- `total==0` = échec → Task 1 `test_total_zero_checked_false` + impl. ✓

**Placeholder scan :** aucun TODO/TBD ; code complet.

**Type consistency :** `check_mutation_gate(result, triage) -> {passed, checked, survivants_non_tries, triage_perimes}` cohérent Task 1 (def) / Task 3 (usage) ; `load_mutation_triage(game_dir) -> list|None` cohérent ; `oracle_ok` combine `mgate["passed"]` en accord avec axes 1&2 ; `run_mutation_test(source, test_argv, *, cwd, timeout)` conforme à la signature réelle de `mutation.py`. ✓
