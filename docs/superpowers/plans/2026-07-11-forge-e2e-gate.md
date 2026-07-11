# Forge e2e Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la preuve « le jeu tourne vraiment » (e2e click-through navigateur) obligatoire et infalsifiable dans la forge, avec auto-correction bornée.

**Architecture:** Une garde structurelle déterministe (`check_e2e_harness`) rejette tout jeu dont l'`e2e.mjs` est absent, non câblé dans `run-oracle.mjs`, ou coquille (imprime PASS sans piloter). Le contrat s9 exige l'e2e ; le skill `/forge` branche la garde dans `oracle_ok` au step s10a, ce qui déclenche la boucle d'escalade EXISTANTE (haiku→sonnet→opus, cap `MAX_ESCALATIONS`=3). Aucune orchestration nouvelle.

**Tech Stack:** Python 3.12 (`.venv312`), pytest ; regex déterministe (aucune dépendance) ; Node/Playwright pour l'e2e des jeux (existant).

## Global Constraints

- Verdict discipline : `claim_verdict: NO_CLAIM_ALLOWED` ; séparer software/evidence/claim.
- Zone protégée `tests/**` (racine repo) jamais modifiée. Les tests forge vivent sous `scripts/forge/tests/` (hors zone protégée) — autorisés.
- Oracles = déterministes non-LLM ; aucune garde ne fait appel à un LLM.
- Encodage `utf-8` explicite sur tout `open()`/read/write Python. Chemins repo-relatifs.
- Pas de commit/push sans go explicite Pierre (CLAUDE.md) — les steps « Commit » sont **préparés mais non exécutés** sans son go.
- `K = _E2E_MIN_ASSERTIONS = 3` (assertions d'état minimales). `N = MAX_ESCALATIONS = 3`.

---

### Task 1: Garde structurelle e2e `check_e2e_harness` (C3) — le cœur

**Files:**
- Modify: `scripts/forge/static_oracles.py` (ajout d'une fonction + constantes)
- Test: `scripts/forge/tests/test_e2e_harness.py` (nouveau)

**Interfaces:**
- Consumes : `_read(path)` (déjà dans `static_oracles.py`).
- Produces : `check_e2e_harness(src_root: Path) -> dict` retournant `{"passed": bool, "raisons": list[str]}`. `passed=True` ssi `raisons` vide.

- [ ] **Step 1: Écrire les tests qui échouent**

`scripts/forge/tests/test_e2e_harness.py` :

```python
"""Garde structurelle e2e (C3) — rejette un e2e absent / non câblé / coquille."""
from pathlib import Path

from forge.static_oracles import check_e2e_harness

REPO_ROOT = Path(__file__).resolve().parents[3]


def _write(d: Path, name: str, txt: str) -> None:
    (d / name).write_text(txt, encoding="utf-8")


def test_legacy_harness_reel_passe():
    # Le jeu legacy a un vrai e2e Playwright câblé dans run-oracle -> PASS.
    res = check_e2e_harness(REPO_ROOT / "games" / "collect_runner_legacy")
    assert res["passed"] is True, res["raisons"]


def test_reforge_sans_e2e_rejetee():
    # Les re-forges fraîches n'ont pas d'e2e.mjs -> REJET (la régression mesurée).
    res = check_e2e_harness(REPO_ROOT / "games" / "collect_runner_r1")
    assert res["passed"] is False
    assert any("e2e.mjs absent" in r for r in res["raisons"])


def test_stub_e2e_rejetee(tmp_path):
    # e2e.mjs coquille : imprime PASS sans lancer de navigateur ni piloter -> REJET.
    _write(tmp_path, "run-oracle.mjs", 'import "./e2e.mjs";\n')
    _write(tmp_path, "e2e.mjs", 'console.log("RESULT: PASS");\n')
    res = check_e2e_harness(tmp_path)
    assert res["passed"] is False
    assert any("navigateur" in r for r in res["raisons"])
    assert any("entrée" in r for r in res["raisons"])
    assert any("état" in r for r in res["raisons"])


def test_e2e_present_mais_non_cable_rejete(tmp_path):
    # Un vrai e2e existe mais run-oracle ne l'appelle jamais -> le gate ne le lance pas.
    _write(tmp_path, "run-oracle.mjs", 'import "./logic.test.mjs";\n')
    _write(
        tmp_path,
        "e2e.mjs",
        'import { chromium } from "playwright";\n'
        'await page.keyboard.down("ArrowRight");\n'
        'if (window.__game.x < 0) throw new Error("x");\n'
        'if (!document.querySelector("#overlay")) throw new Error("o");\n'
        'if (!document.querySelector("#restart")) throw new Error("r");\n',
    )
    res = check_e2e_harness(tmp_path)
    assert res["passed"] is False
    assert any("n'invoque pas e2e.mjs" in r for r in res["raisons"])


def test_e2e_reel_minimal_passe(tmp_path):
    # e2e câblé, navigateur, entrée, >=3 observations d'état -> PASS.
    _write(tmp_path, "run-oracle.mjs", 'import "./e2e.mjs";\n')
    _write(
        tmp_path,
        "e2e.mjs",
        'import { chromium } from "playwright";\n'
        'await page.keyboard.press("Space");\n'
        'if (window.__game.over) throw new Error("a");\n'
        'if (window.__game.coins < 0) throw new Error("b");\n'
        'await page.click("#restart");\n',
    )
    res = check_e2e_harness(tmp_path)
    assert res["passed"] is True, res["raisons"]
```

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `.venv312/Scripts/python.exe -m pytest scripts/forge/tests/test_e2e_harness.py -q`
Expected: FAIL — `ImportError: cannot import name 'check_e2e_harness'`

- [ ] **Step 3: Implémenter la garde**

Ajouter à la fin de `scripts/forge/static_oracles.py` :

```python
# --- garde structurelle e2e (C3) : l'oracle d'un JEU à UI DOIT prouver la
# jouabilité par un click-through navigateur RÉEL. Ce check déterministe (aucun
# run, aucun LLM) rejette un e2e "coquille" (imprime PASS sans piloter) et un
# run-oracle qui n'appelle jamais l'e2e. Équivalent e2e du mutation-testing. ---
_E2E_MIN_ASSERTIONS = 3
_E2E_BROWSER = re.compile(r"\b(chromium|playwright|firefox|webkit)\b")
_E2E_INPUT = re.compile(r"keyboard\.(?:down|up|press)|\.click\(")
_E2E_STATE_TOKEN = re.compile(r"__game\b|#overlay|#restart")


def check_e2e_harness(src_root: Path) -> dict:
    """Le jeu a-t-il un e2e RÉEL, câblé dans son run-oracle ?

    Retourne {passed, raisons[]}. PASS = run-oracle.mjs invoque un e2e.mjs qui
    lance un vrai navigateur, envoie de vraies entrées, et observe au moins
    _E2E_MIN_ASSERTIONS fois l'état du jeu (window.__game / #overlay / #restart).
    """
    src_root = Path(src_root)
    raisons: list[str] = []

    runner = src_root / "run-oracle.mjs"
    if not runner.exists():
        raisons.append("run-oracle.mjs absent")
    elif "e2e.mjs" not in _read(runner):
        raisons.append("run-oracle.mjs n'invoque pas e2e.mjs (volet e2e absent du gate)")

    e2e = src_root / "e2e.mjs"
    if not e2e.exists():
        raisons.append("e2e.mjs absent")
        return {"passed": False, "raisons": raisons}

    text = _read(e2e)
    if not _E2E_BROWSER.search(text):
        raisons.append("e2e.mjs ne lance aucun navigateur réel (chromium/playwright)")
    if not _E2E_INPUT.search(text):
        raisons.append("e2e.mjs n'envoie aucune entrée réelle (clavier/clic)")
    n = len(_E2E_STATE_TOKEN.findall(text))
    if n < _E2E_MIN_ASSERTIONS:
        raisons.append(
            f"e2e.mjs n'observe pas assez l'état ({n} réf. window.__game/#overlay/#restart"
            f" < {_E2E_MIN_ASSERTIONS}) — coquille probable"
        )

    return {"passed": not raisons, "raisons": raisons}
```

- [ ] **Step 4: Lancer les tests, vérifier le succès**

Run: `.venv312/Scripts/python.exe -m pytest scripts/forge/tests/test_e2e_harness.py -q`
Expected: PASS (5 passed)

- [ ] **Step 5: Non-régression forge complète**

Run: `.venv312/Scripts/python.exe -m pytest scripts/forge/tests/ -q`
Expected: PASS (tous verts, dont les 5 nouveaux)

- [ ] **Step 6: Commit (préparé — attendre go Pierre)**

```bash
git add scripts/forge/static_oracles.py scripts/forge/tests/test_e2e_harness.py
git commit -m "feat(forge): garde structurelle e2e — rejette e2e absent/non-câblé/coquille"
```

---

### Task 2: Contrat de jouabilité (C1) + durcissement s9 (C2)

**Files:**
- Create: `scripts/forge/contracts/PLAYABLE_CONTRACT.md`
- Modify: `scripts/forge/contracts/s9-build.yaml` (champs `success_criteria`, `tests_oracles`, `output_contract`)

**Interfaces:**
- Consumes : rien (documents/contrat).
- Produces : la convention que la garde C3 (Task 1) et le build s9 partagent — les tokens `window.__game`, `window.__game_debug`, `#overlay`, `#restart`, log serveur `interface jouable`.

- [ ] **Step 1: Créer le contrat de jouabilité**

`scripts/forge/contracts/PLAYABLE_CONTRACT.md` :

```markdown
# Contrat de jouabilité — jeux web forgés

Toute UI de jeu produite par la forge DOIT respecter ces conventions, pour qu'un
e2e générique puisse la piloter et que la garde `check_e2e_harness` la valide.

## Serveur
- `server.mjs` log `interface jouable` sur stdout quand le serveur est prêt à servir.

## État exposé (pilotable par l'e2e)
- `window.__game` : objet d'état lisible. Au minimum les scalaires pilotés par les
  règles (position joueur, compteur/score, `over: bool`, `level: number`).
- `window.__game_debug` : hooks de test déterministes. Au minimum de quoi FORCER une
  fin de partie sans dépendre du timing réel (ex. `hit()` → défaite).

## DOM
- `#overlay` : écran de fin de partie ; classe `hidden` quand caché.
- `#restart` : bouton rejouer (remet l'état à la partie initiale).

## Preuve e2e attendue (cf. games/collect_runner_legacy/e2e.mjs)
Le `e2e.mjs` lance un vrai navigateur (Playwright/chromium), envoie de vraies
touches/clics, observe `window.__game`, force une fin via `window.__game_debug`,
vérifie `#overlay` puis clique `#restart`, et finit par `RESULT: PASS` / `FAIL`.
Il est câblé dans `run-oracle.mjs` (exit 0 seulement si tout passe).
```

- [ ] **Step 2: Durcir `success_criteria` de s9**

Dans `scripts/forge/contracts/s9-build.yaml`, remplacer le bloc `success_criteria:` (lignes 52-55) par :

```yaml
success_criteria: >-
  Code dans l'ownership (aucun fichier hors périmètre modifié) ; oracle code vert ;
  WireMap à jour. Pour un JEU (objectif/condition de victoire joueur) : oracle de
  SOLVABILITÉ vert (un bot joue et GAGNE réellement) ET preuve e2e verte (click-through
  navigateur réel, cf. scripts/forge/contracts/PLAYABLE_CONTRACT.md).
```

- [ ] **Step 3: Durcir `tests_oracles` de s9**

Remplacer la fin du bloc `tests_oracles:` (après « …doit gagner. Modèle : scripts/forge/templates/solvability.template.mjs. ») en ajoutant :

```yaml
  Le volet mesure l'enveloppe d'action réelle du moteur, vérifie que les
  objectifs requis y sont, et fait JOUER un bot qui doit gagner. Modèle :
  scripts/forge/templates/solvability.template.mjs. L'oracle CODE d'un JEU inclut
  AUSSI OBLIGATOIREMENT un volet e2e (e2e.mjs, click-through navigateur réel câblé
  dans run-oracle.mjs) conforme au contrat de jouabilité
  (scripts/forge/contracts/PLAYABLE_CONTRACT.md) : la garde structurelle
  forge.static_oracles.check_e2e_harness REJETTE un e2e absent, non câblé, ou
  coquille (qui imprime PASS sans piloter).
```

- [ ] **Step 4: Durcir `output_contract` de s9**

Remplacer le bloc `output_contract:` (lignes 71-74) par :

```yaml
output_contract: >-
  diff (micro-commits) + WireMap à jour (colonnes fichiers/fonction/version/preuve/
  statut). Pour un JEU : un volet solvability.mjs (bot-joue-et-gagne) ET un e2e.mjs
  (click-through navigateur réel, contrat de jouabilité) tous deux câblés dans
  run-oracle.mjs, en plus des mécaniques.
```

- [ ] **Step 5: Vérifier que le contrat reste valide (schéma 16 champs remplis)**

Run: `.venv312/Scripts/python.exe -c "import yaml; d=yaml.safe_load(open('scripts/forge/contracts/s9-build.yaml',encoding='utf-8')); assert d['success_criteria'] and 'e2e' in d['success_criteria']; assert 'e2e' in d['output_contract']; print('s9 OK, champs remplis')"`
Expected: `s9 OK, champs remplis`

- [ ] **Step 6: Commit (préparé — attendre go Pierre)**

```bash
git add scripts/forge/contracts/PLAYABLE_CONTRACT.md scripts/forge/contracts/s9-build.yaml
git commit -m "feat(forge): contrat de jouabilité + s9 exige la preuve e2e"
```

---

### Task 3: Brancher la garde dans le gate (C4/C5) — skill s10a

**Files:**
- Modify: `.claude/skills/forge/skill.md` (step s10a-oracle-code)

**Interfaces:**
- Consumes : `check_e2e_harness` (Task 1), `forge_gate` (existant), `escalation_decision` (existant).
- Produces : la règle d'orchestration qui fait `oracle_ok = code.ok AND e2e_guard.passed` pour un jeu.

- [ ] **Step 1: Ajouter la garde e2e au step s10a**

Dans `.claude/skills/forge/skill.md`, sous la puce `s10a-oracle-code`, après la note sur le click-through Playwright, ajouter ce paragraphe :

```markdown
   > **Gate e2e déterministe (renfort 2026-07-11)** : la doctrine Playwright ci-dessus
   > est désormais APPLIQUÉE. Pour un JEU, avant de conclure l'oracle-code, lance la
   > garde structurelle non-LLM :
   > ```python
   > from forge.static_oracles import check_e2e_harness
   > e2e_guard = check_e2e_harness(Path("games/<projet>"))
   > oracle_ok = code.ok and e2e_guard["passed"]   # e2e coquille/absent => oracle rouge
   > ```
   > Si `not e2e_guard["passed"]` : traite l'oracle comme ÉCHOUÉ (raisons =
   > `e2e_guard["raisons"]`), ce qui alimente la boucle d'escalade existante ci-dessous
   > (ré-spawn du contrat s9, modèle ↑, cap MAX_ESCALATIONS). Au sommet toujours rouge :
   > verdict BLOCKED + `humangate_flags: ["e2e non prouvé"]`. La garde rejette : e2e.mjs
   > absent, non câblé dans run-oracle.mjs, ou coquille (< 3 observations d'état).
```

- [ ] **Step 2: Vérifier la cohérence du branchement dans la boucle d'escalade**

Relire le passage escalade (skill.md, `escalation_decision(..., oracle_ok=code.ok, ...)`) et confirmer qu'`oracle_ok` y reçoit bien la valeur combinée (`code.ok and e2e_guard["passed"]`), pas `code.ok` seul. Corriger l'appel si nécessaire pour référencer la variable combinée.

Run: `grep -n "oracle_ok\|check_e2e_harness\|e2e_guard" .claude/skills/forge/skill.md`
Expected: la garde apparaît AVANT `escalation_decision`, et `oracle_ok` combine les deux.

- [ ] **Step 3: Commit (préparé — attendre go Pierre)**

```bash
git add .claude/skills/forge/skill.md
git commit -m "feat(forge): skill s10a branche la garde e2e dans oracle_ok (gate + auto-correct)"
```

---

### Task 4: Preuve d'acceptation sur données réelles (les 5 jeux)

**Files:**
- Test: `scripts/forge/tests/test_e2e_harness_acceptance.py` (nouveau)

**Interfaces:**
- Consumes : `check_e2e_harness` (Task 1) ; les jeux réels du repo (`games/*`).
- Produces : preuve que la garde attrape EXACTEMENT la régression mesurée (legacy verts, re-forges rouges).

- [ ] **Step 1: Écrire le test d'acceptation sur les jeux réels**

`scripts/forge/tests/test_e2e_harness_acceptance.py` :

```python
"""Acceptation : la garde e2e reproduit le verdict de l'audit de re-forge —
legacy (avec e2e) verts, re-forges fraîches (sans e2e) rouges."""
from pathlib import Path

import pytest

from forge.static_oracles import check_e2e_harness

REPO_ROOT = Path(__file__).resolve().parents[3]
GAMES = REPO_ROOT / "games"


@pytest.mark.parametrize("jeu", ["collect_runner_legacy", "survival_arena_legacy"])
def test_legacy_avec_e2e_passe(jeu):
    if not (GAMES / jeu).exists():
        pytest.skip(f"{jeu} absent")
    res = check_e2e_harness(GAMES / jeu)
    assert res["passed"] is True, res["raisons"]


@pytest.mark.parametrize("jeu", ["collect_runner_r1", "collect_runner_r2", "survival_arena_r1"])
def test_reforge_sans_e2e_bloquee(jeu):
    if not (GAMES / jeu).exists():
        pytest.skip(f"{jeu} absent")
    res = check_e2e_harness(GAMES / jeu)
    assert res["passed"] is False
    assert res["raisons"]
```

- [ ] **Step 2: Lancer, vérifier que ça prouve la régression**

Run: `.venv312/Scripts/python.exe -m pytest scripts/forge/tests/test_e2e_harness_acceptance.py -v`
Expected: legacy PASS, re-forges PASS (assert rouge) — la garde discrimine correctement.

- [ ] **Step 3: Non-régression forge complète finale**

Run: `.venv312/Scripts/python.exe -m pytest scripts/forge/tests/ -q`
Expected: PASS (tout vert).

- [ ] **Step 4: Commit (préparé — attendre go Pierre)**

```bash
git add scripts/forge/tests/test_e2e_harness_acceptance.py
git commit -m "test(forge): acceptation garde e2e sur données réelles (legacy vs re-forges)"
```

---

## Self-Review

**Spec coverage :**
- C1 contrat de jouabilité → Task 2 Step 1. ✓
- C2 s9 durci → Task 2 Steps 2-4. ✓
- C3 garde structurelle → Task 1. ✓
- C4 volet e2e dans l'oracle → Task 3 (oracles.json pointe déjà run-oracle.mjs ; le branchement `oracle_ok` est Task 3). ✓
- C5 boucle auto-correct → Task 3 (réutilise escalation_decision existant). ✓
- Preuve 1 (unitaire C3) → Task 1 Step 1. Preuve 2/3 (acceptation données réelles) → Task 4. La preuve « re-forge réel avec agents+navigateur » est laissée en aval sous l'œil de Pierre (spawn d'agents + Playwright, hors périmètre de cette session déterministe). ✓

**Placeholder scan :** aucun TODO/TBD ; tout le code est complet.

**Type consistency :** `check_e2e_harness(src_root) -> {"passed", "raisons"}` cohérent entre Task 1 (def), Task 3 (usage `e2e_guard["passed"]`/`["raisons"]`), Task 4 (usage). ✓
