# Lot V3 — « le jeu produit est le jeu décrit par la WireMap » (assemblage runtime réel)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. TDD strict, fixtures
> RÉELLES (build du run 5 = le défaut), jamais de commit par un sous-agent (un seul commit de clôture, gate Pierre).

*Date : 2026-08-22 · Source : session Fable, orientation Pierre (fin de session 2026-08-22). Périmètre ÉTROIT :
ni système de contenu, ni oracle généraliste, ni couche. Trois pièces : contrat Builder → Runtime · Builder
qui assemble · oracles qui chargent le VRAI `main.tscn`. Question du test : la Forge produit-elle un jeu, ou
une représentation de jeu ?*

**Défaut mesuré (run 5, `kitten_clicker-20260821e`, verdict authentique FAIL/BLOCKED)** : 110 fichiers, 17 SVG
importés, registres, adaptateur audio, 3 volets GPU OK, s10c isomorphe, solvabilité 20/20 — et `main.tscn` =
`Node2D` + HUD statique ; aucun `_process`/Timer ; `load_registries()` sans appelant ; `play_sfx` appelé par
son seul oracle ; `07_TESTS/oracle/main_screen_render.gd` assemble sa propre scène (`draw_hud(12345, 678)`) ;
`preuve` de 3 lignes cite `core_hud.gd`/`core_economy.gd`/`core_rarity_dist.gd` inexistants. Capture GPU de la
vraie scène : « 0 ronrons / 0 /sec ». **Un oracle qui reconstruit son environnement peut prouver un jeu qui
n'existe pas.**

## Doctrine d'exécution (go Pierre 2026-08-22)
**Task 1 est LE test** ; Tasks 2-5 ne servent qu'à le rendre impossible à contourner. Ordre : 1 (sonde sur le
VRAI build run 5 → FAIL attendu = baseline) → 3 (volets ne reconstruisent plus leur scène) → 4 (`preuve` →
fichier réel) → 5 (s9 explicite sur l'assemblage) → 2 (gate) → tests → run 6 → vrai `main.tscn` →
`runtime_alive` → capture → playtest humain. **`runtime_alive` reste pauvre** : il ne juge ni le fun ni la
complétude — seulement « la scène produite vit-elle et réagit-elle à une interaction réelle ? » (60 frames,
clic réel, image/état change : OUI/NON). Le NON du run 5 est la baseline que V3 doit éliminer.

**V3 PASS CONDITION** = `main.tscn` réel + systèmes réellement instanciés + interaction réelle + oracle qui
charge CE `main.tscn` + `preuve` → fichiers réels + capture du runtime + playtest humain.
Hors V3 (PASSIVE / DOCUMENTED_ONLY / BLOCKED, ne contaminent pas le lot) : solvabilité hors scène ·
vocabulaire STANDARD/Prisme · reuse_ratio · red-team Qwen · nouvelle famille de preuves · nouvelle station.
Aucun commit/push implicite ; aucun verdict global « ready ».

## Global Constraints
- Jamais `git commit/push` par un agent ; jamais `git add -A` ; zone `tests/**` racine intouchée.
- `driver.py` ne contient jamais `subprocess`/`Popen`/`os.system`/`anthropic` (invariant) — le spawn vit dans
  `product_oracle_godot.py` (déjà le cas) ; le driver n'appelle que des fonctions de module.
- Aucune nouvelle station, aucun nouveau profil, aucune extension de `expected_proof.kind`.
- Fail-closed honnête : une mesure impossible (Godot absent) = `NOT_MEASURED` flaggé, jamais un OK.
- `claim_verdict: NO_CLAIM_ALLOWED` partout.

## Ancrages mesurés (ne pas redécouvrir)
| Pièce | Où | Fait |
|---|---|---|
| contrat s9 | `scripts/forge/contracts/s9-build-godot-standard.yaml` — `objectif` l.69-74, `in_scope` l.77-83, `gardeFou` l.107-119, `success_criteria` l.122-136, `tests_oracles` l.137-143, `output_contract` l.169-174 | **0 occurrence** de `main.tscn`, « scène jouable », instanciation, `_process` |
| volets produit | `scripts/forge/product_oracle_godot.py` : `discover_oracle_files` l.161, `_default_gpu_runner` l.247 (`GPU_WINDOW_FLAGS` l.96), `run_godot_product_oracle` l.290, résultat par volet l.419-427 `{status, passed, checked, fails, fichier, mode_execution, payload}` ; protocole stdout `FORGE_ORACLE <nom> {json}` (regex l.71) | aucune garde statique sur le contenu des volets ; les 2 volets réels lus (kitten, bomberman) assemblent leur scène par `preload` d'adaptateurs |
| driver s10a | `driver.py` l.1838-1860 (activation produit, `self.product_oracle_godot_runner(self.game_dir)`, advisory) ; agrégation l.1972-1976 : `elif (status == "FAIL" or not e2e_ok or not solvability["passed"] or not harness_flags["passed"] or receipt.receipt.status != "OK"): final = "FAIL"` | le résultat produit n'entre pas dans `final` |
| garde anti-gaming existante | `static_oracles._check_e2e_harness_godot` l.444-484 : `_strip_gd_comments` + tokens `_GODOT_SCENETREE`, `_GODOT_TEST_DISCOVERY`, `_GODOT_ANTI_FAKE_GREEN` | patron à copier pour les volets |
| sonde externe | `scripts/forge/asset_geometry/godot_probe/probe.gd` lancée `[godot, "--headless", "--script", <abs>, "--", <asset>]`, émet `GODOT_PROBE|{json}` (test_asset_geometry.py l.426-437) | précédent d'un script Godot HORS projet |
| `preuve` | `static_oracles._wiremap_entries` + `check_wiremap` l.263-330 : `preuve` non vide, `fichiers` existants, `fonction` définie | le fichier nommé par `preuve` n'est jamais résolu ; SCHEMA.md §3 : `preuve` = prose v1 conservée, `expected_proof` = `{kind, statement}` sans chemin |
| main_scene | `godot_oracle.mjs` l.167-181 `hasMainScene` lit `run/main_scene` de `project.godot` | seule mention de `main.tscn` dans la chaîne d'oracle : détecteur, jamais chargé |

---

### Task 1 — Sonde runtime externe `runtime_alive` (la mesure qui manquait)

**Files:** Create `scripts/forge/godot_probes/runtime_alive.gd` · Modify `scripts/forge/product_oracle_godot.py`
(ajout `run_runtime_alive`) · Test `scripts/forge/tests/test_runtime_alive_probe.py`.

**Interfaces — Produces:** `run_runtime_alive(game_dir: Path, *, binary_resolver=None, gpu_runner=None,
timeout_s: int = 90) -> dict` même forme qu'un volet : `{status: "OK"|"FAIL"|"NOT_MEASURED", passed: bool,
checked: bool, fails: [str], payload: dict, mode_execution: "gpu_window", fichier: str}`. Payload attendu du
script : `{"ok", "fails", "data": {scene, loaded, root_children, nodes_total, scripted_nodes, system_scripts,
nonmonochrome, changed_after_click, frames}}`.

- [ ] **Step 1 — test rouge** :
```python
# scripts/forge/tests/test_runtime_alive_probe.py
import json, re, shutil
from pathlib import Path
import pytest
from forge import product_oracle_godot as pog

REPO = Path(__file__).resolve().parents[3]
PROBE = REPO / "scripts/forge/godot_probes/runtime_alive.gd"

def _line(data, ok=True, fails=()):
    return "FORGE_ORACLE runtime_alive " + json.dumps({"ok": ok, "fails": list(fails), "data": data})

def test_la_sonde_existe_et_charge_la_vraie_scene():
    src = PROBE.read_text(encoding="utf-8")
    assert "extends SceneTree" in src
    assert 'load("res://main.tscn")' in src or "run/main_scene" in src
    assert "InputEventMouseButton" in src          # le clic est injecté, pas simulé par un appel direct
    assert "get_image()" in src                     # capture réelle

def test_ok_quand_la_scene_vit(tmp_path):
    stdout = _line({"scene": "res://main.tscn", "loaded": True, "root_children": 1, "nodes_total": 9,
                    "scripted_nodes": 5, "system_scripts": 4, "nonmonochrome": True,
                    "changed_after_click": True, "frames": 120})
    r = pog.run_runtime_alive(tmp_path, binary_resolver=lambda: "godot",
                              gpu_runner=lambda *a, **k: {"returncode": 0, "stdout": stdout, "stderr": ""})
    assert r["passed"] is True and r["status"] == "OK" and r["mode_execution"] == "gpu_window"
    assert r["payload"]["data"]["changed_after_click"] is True

def test_fail_quand_l_ecran_ne_change_pas_apres_le_clic(tmp_path):
    stdout = _line({"scene": "res://main.tscn", "loaded": True, "root_children": 1, "nodes_total": 2,
                    "scripted_nodes": 1, "system_scripts": 0, "nonmonochrome": True,
                    "changed_after_click": False, "frames": 120}, ok=False,
                   fails=["aucun changement d'image apres le clic"])
    r = pog.run_runtime_alive(tmp_path, binary_resolver=lambda: "godot",
                              gpu_runner=lambda *a, **k: {"returncode": 1, "stdout": stdout, "stderr": ""})
    assert r["passed"] is False and "clic" in " ".join(r["fails"])

def test_not_measured_sans_godot(tmp_path):
    r = pog.run_runtime_alive(tmp_path, binary_resolver=lambda: None)
    assert r["checked"] is False and r["status"] == "NOT_MEASURED" and r["passed"] is False

def test_sortie_sans_marqueur_est_un_fail_honnete(tmp_path):
    r = pog.run_runtime_alive(tmp_path, binary_resolver=lambda: "godot",
                              gpu_runner=lambda *a, **k: {"returncode": 0, "stdout": "Godot Engine v4\n", "stderr": ""})
    assert r["passed"] is False and r["checked"] is True

@pytest.mark.skipif(not (REPO / "scripts/forge/godot.config.json").exists(), reason="binaire Godot absent sur ce poste")
def test_fixture_reelle_run5_le_jeu_est_statique():
    """Le build du run 5 (archivé) est LA fixture du défaut : scène chargée, rien ne change au clic."""
    for cand in (REPO / "games/kitten_clicker", REPO / "lab/forge_runs/kitten_clicker/_run5_20260821e/game_build5"):
        if (cand / "project.godot").exists():
            r = pog.run_runtime_alive(cand)
            assert r["checked"] is True
            assert r["payload"]["data"]["loaded"] is True
            assert r["passed"] is False and r["payload"]["data"]["changed_after_click"] is False
            return
    pytest.skip("build du run 5 introuvable")
```
- [ ] **Step 2 — rouge** : `PYTHONPATH=scripts .venv312/Scripts/python.exe -m pytest scripts/forge/tests/test_runtime_alive_probe.py -q` → `AttributeError: run_runtime_alive` / fichier sonde absent.
- [ ] **Step 3 — la sonde** `scripts/forge/godot_probes/runtime_alive.gd` :
```gdscript
extends SceneTree
# runtime_alive — sonde Forge HORS projet (lancee `--path <jeu> --script <chemin absolu>` en fenetre GPU).
# Charge la VRAIE scene principale (run/main_scene), la laisse vivre, injecte UN clic au centre,
# et mesure si l'image change. Ne construit aucune scene. Emet une ligne FORGE_ORACLE (protocole
# product_oracle_godot). Decision Pierre 2026-08-22 : un oracle qui reconstruit son environnement
# peut prouver un jeu qui n'existe pas.
const FRAMES_SETTLE := 60
const FRAMES_AFTER_CLICK := 60
var _frames := 0
var _img_a: Image = null
var _data := {"scene": "", "loaded": false, "root_children": 0, "nodes_total": 0, "scripted_nodes": 0,
              "system_scripts": 0, "nonmonochrome": false, "changed_after_click": false, "frames": 0}
var _fails: Array[String] = []

func _init() -> void:
	var scene_path: String = ProjectSettings.get_setting("run/main_scene", "res://main.tscn")
	_data["scene"] = scene_path
	var packed = load(scene_path)
	if packed == null or not (packed is PackedScene):
		_fails.append("scene principale introuvable : %s" % scene_path)
		_emit(); return
	var inst: Node = packed.instantiate()
	get_root().add_child(inst)
	_data["loaded"] = true

func _process(_delta: float) -> bool:
	_frames += 1
	_data["frames"] = _frames
	if _frames == FRAMES_SETTLE:
		_inventory()
		_img_a = _capture()
		_data["nonmonochrome"] = _nonmonochrome(_img_a)
		var vp := get_root()
		var center: Vector2 = vp.get_visible_rect().size / 2.0
		var press := InputEventMouseButton.new()
		press.button_index = MOUSE_BUTTON_LEFT; press.pressed = true; press.position = center
		var release := InputEventMouseButton.new()
		release.button_index = MOUSE_BUTTON_LEFT; release.pressed = false; release.position = center
		Input.parse_input_event(press); Input.parse_input_event(release)
	elif _frames == FRAMES_SETTLE + FRAMES_AFTER_CLICK:
		var img_b := _capture()
		_data["changed_after_click"] = _img_a != null and img_b.get_data() != _img_a.get_data()
		if not _data["nonmonochrome"]:
			_fails.append("image monochrome avant le clic")
		if not _data["changed_after_click"]:
			_fails.append("aucun changement d'image apres le clic (jeu statique)")
		if _data["scripted_nodes"] == 0:
			_fails.append("aucun noeud scripte dans la scene chargee")
		_emit()
	return false

func _inventory() -> void:
	var root := get_root()
	_data["root_children"] = root.get_child_count()
	var stack: Array = [root]; var total := 0; var scripted := 0; var sys := 0
	while not stack.is_empty():
		var n: Node = stack.pop_back(); total += 1
		var s = n.get_script()
		if s != null:
			scripted += 1
			var p: String = s.resource_path
			if p.begins_with("res://05_SYSTEMS") or p.begins_with("res://06_RUNTIME"): sys += 1
		for c in n.get_children(): stack.push_back(c)
	_data["nodes_total"] = total; _data["scripted_nodes"] = scripted; _data["system_scripts"] = sys

func _capture() -> Image:
	return get_root().get_texture().get_image()

func _nonmonochrome(img: Image) -> bool:
	if img == null: return false
	var first := img.get_pixel(0, 0); var step := maxi(1, img.get_width() / 32)
	for y in range(0, img.get_height(), step):
		for x in range(0, img.get_width(), step):
			if img.get_pixel(x, y).is_equal_approx(first) == false: return true
	return false

func _emit() -> void:
	var ok := _fails.is_empty() and _data["loaded"]
	print("FORGE_ORACLE runtime_alive " + JSON.stringify({"ok": ok, "fails": _fails, "data": _data}))
	quit(0 if ok else 1)
```
- [ ] **Step 4 — côté Python** (`product_oracle_godot.py`, après `run_godot_product_oracle`) :
```python
RUNTIME_ALIVE_PROBE = Path(__file__).resolve().parent / "godot_probes" / "runtime_alive.gd"

def run_runtime_alive(game_dir: Path, *, binary_resolver=None, gpu_runner=None,
                      timeout_s: int = 90) -> dict:
    """Charge la VRAIE scène principale du jeu en fenêtre GPU via la sonde externe
    `godot_probes/runtime_alive.gd` (jamais un volet du jeu : un volet peut se construire sa
    propre scène — décision Pierre 2026-08-22). NOT_MEASURED honnête sans binaire ; FAIL si la
    sonde ne rend aucune ligne FORGE_ORACLE (une sortie muette n'est pas une preuve)."""
    resolver = binary_resolver or _resolve_binary          # même résolveur que les volets
    binary = resolver()
    base = {"fichier": str(RUNTIME_ALIVE_PROBE), "mode_execution": "gpu_window"}
    if not binary:
        return {**base, "status": "NOT_MEASURED", "passed": False, "checked": False,
                "fails": ["binaire Godot introuvable"], "payload": {}}
    runner = gpu_runner or _default_gpu_runner
    out = runner(binary, Path(game_dir), str(RUNTIME_ALIVE_PROBE), timeout_s=timeout_s)
    payload = _parse_forge_oracle_line(out.get("stdout", "")) if isinstance(out, dict) else None
    if payload is None:
        return {**base, "status": "FAIL", "passed": False, "checked": True,
                "fails": ["sonde sans ligne FORGE_ORACLE (sortie muette, rc=%s)" % out.get("returncode")],
                "payload": {"stdout_tail": str(out.get("stdout", ""))[-400:]}}
    ok = bool(payload.get("ok"))
    return {**base, "status": "OK" if ok else "FAIL", "passed": ok, "checked": True,
            "fails": list(payload.get("fails", [])), "payload": payload}
```
Vérifier que `_default_gpu_runner` accepte un chemin de script ABSOLU (il passe `--script <script_res_path>` tel
quel ; Godot 4 accepte un chemin absolu — le précédent `godot_probe/probe.gd` le prouve, sans `--path` ; ici
AVEC `--path` pour que `res://` du jeu résolve). Si `_parse_forge_oracle_line` exige un nom précis, réutiliser.
Si `_resolve_binary` n'existe pas sous ce nom, utiliser la fonction de résolution déjà employée par
`run_godot_product_oracle` (`binary_resolver` par défaut) — ne pas dupliquer.
- [ ] **Step 5 — vert** : 5 tests unitaires + fixture réelle (Godot présent : doit rendre `passed False,
changed_after_click False` sur le build du run 5 — c'est la preuve que la sonde voit le défaut).
- [ ] **Step 6** : `git diff --check` ; pas de commit.

### Task 2 — Gate s10a : le runtime mort = FAIL (jamais un OK par absence)

**Files:** Modify `scripts/forge/driver.py` (l.~1838-1860 et l.~1972-1976) · Test
`scripts/forge/tests/test_driver_runtime_alive_gate.py`.

- [ ] **Step 1 — test rouge** : patron de `test_driver_amont_traversal_advisory.py` (`ForgeDriver.__new__`,
monkeypatch). Cas : (a) `runtime_alive_runner` injecté rend `passed False` → `_run_code_oracle` finit `FAIL`
même si e2e/solvabilité/mutation sont verts ; (b) `checked False` (NOT_MEASURED) → statut inchangé, mais
`detail["runtime_alive"]["status"] == "NOT_MEASURED"` et `detail["humangate_flags"]` (ou le champ équivalent)
porte « runtime non mesuré » ; (c) projet sans `run/main_scene` (module bibliothèque, cf. `hasMainScene`)
→ sonde non lancée, `detail["runtime_alive"] = {"status": "SKIPPED", "reason": "pas de main_scene"}`.
- [ ] **Step 2 — implémentation** : dans le bloc `if proof_descriptor_ok and godot_capacity_ok:` ajouter
`detail["runtime_alive"] = self.runtime_alive_runner(self.game_dir)` (attribut injectable, défaut
`product_oracle_godot.run_runtime_alive`, même patron que `product_oracle_godot_runner`) ; condition
`main_scene` lue dans `project.godot` (`run/main_scene=`) ; puis dans l'agrégation :
```python
        runtime = detail.get("runtime_alive") or {}
        runtime_dead = runtime.get("checked") is True and not runtime.get("passed")
        ...
        elif (status == "FAIL" or not e2e_ok or not solvability["passed"]
              or not harness_flags["passed"] or receipt.receipt.status != "OK" or runtime_dead):
            final = "FAIL"  # rouge mécanique => alimente la boucle d'escalade
```
Interdit d'ajouter `subprocess` au driver (la sonde spawne dans `product_oracle_godot`).
- [ ] **Step 3 — vert + non-régression** `test_driver.py` (19), `test_driver_product_oracle*.py`,
`test_driver_amont_traversal_advisory.py`.

### Task 3 — Les volets chargent la vraie scène (garde statique anti-gaming)

**Files:** Modify `scripts/forge/product_oracle_godot.py` (dans `run_godot_product_oracle`, avant exécution
d'un volet) · Test `scripts/forge/tests/test_volets_load_real_scene.py`.

- [ ] **Step 1 — test rouge** : volet tmp sans `res://main.tscn` → résultat `{status: FAIL, checked: True,
mode_execution: "static_guard", fails: ["volet construit sa propre scène : aucun chargement de
res://main.tscn (décision Pierre 2026-08-22)"]}` et le runner N'EST PAS appelé ; volet avec
`load("res://main.tscn")` → runner appelé ; mention UNIQUEMENT en commentaire → FAIL (commentaires retirés,
réutiliser `static_oracles._strip_gd_comments`) ; fixture réelle : les 3 volets de
`games/kitten_clicker/07_TESTS/oracle/` (ou `_run5_…/game_build5`) → 3 FAIL statiques.
- [ ] **Step 2 — implémentation** : `_VOLET_REAL_SCENE = re.compile(r'(?:pre)?load\(\s*"res://main\.tscn"\s*\)|ResourceLoader\.load\(\s*"res://main\.tscn"|run/main_scene')` ; pour chaque volet découvert, si le source sans commentaires ne matche pas → résultat FAIL statique, sans spawn.
- [ ] **Step 3 — vert** + non-régression `test_product_oracle_godot*.py`, `test_driver_product_oracle_godot_wiring.py`.

### Task 4 — `preuve` de WireMap résout un fichier existant

**Files:** Modify `scripts/forge/static_oracles.py` (`check_wiremap`) · Test `scripts/forge/tests/test_wiremap_preuve_resolue.py`.

- [ ] **Step 1 — test rouge** : entrée `preuve: "core_hud.gd"` sans fichier → `preuves_absentes` contient
`"<feature>: preuve cite core_hud.gd, absent du dépôt"` et `passed False` ; `preuve: "tests/run_tests.gd VERT 73/73"`
avec fichier présent → OK ; prose sans `.gd` → inchangé ; fixture réelle `games/kitten_clicker/09_WIREMAP/
wiremap.json` (ou archive run 5) → 3 preuves absentes nommées.
- [ ] **Step 2 — implémentation** : `_PREUVE_GD = re.compile(r"[\w./-]+\.gd\b")` ; pour chaque token :
existe si `(src_root / tok).exists()` ou, sans `/`, si `any(src_root.rglob(tok))`. Ne change rien d'autre.
- [ ] **Step 3 — vert** + `test_static_oracles.py`, `test_wiremap_v2_accepted.py`.

### Task 5 — Contrat s9 : livrer un jeu, pas des pièces (texte) + tâche s9

**Files:** Modify `scripts/forge/contracts/s9-build-godot-standard.yaml` · Modify
`lab/forge_runs/kitten_clicker/tasks.json` (clé `s9-build-godot-standard`) · Test : `test_contract_sync.py`
+ `scripts/forge/tests/test_s9_contract_runtime_rule.py` (le contrat cite `main.tscn`, « point d'entrée
jouable », `runtime_alive`).

- [ ] **Step 1** — ajouts de texte (sans retirer une ligne existante) :
  - `objectif` : « … et ASSEMBLER ces lignes en un jeu : `main.tscn` (scène `run/main_scene`) est le point
    d'entrée JOUABLE ; il instancie (ou charge dans `_ready`) chaque adaptateur `system.adapter` et le
    contrôleur qui fait tourner la boucle (`_process`/Timer) ; un clic réel au centre de l'écran doit modifier
    l'état et l'image. »
  - `gardeFou` (h) : « PAS DE PIÈCES SANS ASSEMBLAGE. Un fichier écrit mais jamais atteint depuis `main.tscn`
    n'existe pas pour le joueur. Le registre de monde est chargé au boot, l'audio est déclenché par les
    événements du jeu, pas par son oracle. »
  - `success_criteria` (5) : « la sonde `scripts/forge/godot_probes/runtime_alive.gd` (fenêtre GPU, vraie
    scène, un clic injecté) rend OK : scène chargée, nœuds scriptés, image non monochrome qui CHANGE après le
    clic. » (6) : « chaque volet `07_TESTS/oracle/*.gd` charge `res://main.tscn` — un volet qui assemble sa
    propre scène est rejeté statiquement. » (7) : « toute `preuve` qui nomme un fichier `.gd` pointe un fichier
    existant. »
  - `tests_oracles` : ajouter `product_oracle_godot.run_runtime_alive`.
- [ ] **Step 2** — `tasks.json` s9 : ajouter « ASSEMBLAGE OBLIGATOIRE : main.tscn → GameController (script) →
instancie ronrons/chatons/production/upgrades/lieux/quêtes/audio/progression ; `_process` fait tourner la
production ; un clic sur le coussin central passe par l'input adapter et incrémente les ronrons VISIBLEMENT ;
`load_registries()` appelé au boot ; `play_sfx` appelé sur clic/achat/déblocage/prestige ; les 3 volets
chargent res://main.tscn et inspectent la scène réelle ; aucune preuve ne cite un fichier absent. »
- [ ] **Step 3** — `python -m forge.dispatch --dry-run --profile full_godot_content` → 17 étapes, contrat valide.

### Task 6 — Clôture du lot, run 6, mesure

- [ ] Revalidation orchestrateur : nouveaux tests + `test_driver.py` + `test_static_oracles.py` + node 828 +
  dry-run + `git diff --check` ; UN commit de clôture (Pierre).
- [ ] Archiver run 5 + build (`_run5_20260821e/` + `game_build5/`, déplacement) ; `games/kitten_clicker/` vide.
- [ ] Run 6 `kitten_clicker-20260821f`, profil `full_godot_content`, sans `--charter`, depuis la session,
  moniteur. Coût attendu 30-60 $, 2-3 h (amont ≈ 10 $, build 25-50 $).
- [ ] Critères (contre run 5) : `runtime_alive` **OK** (scène chargée, ≥ 1 script `05_SYSTEMS`/`06_RUNTIME`,
  image non monochrome, **change au clic**) · 3 volets passent la garde statique ET leur mesure · `check_wiremap`
  sans preuve absente · sonde amont toujours à BUILD · verdict authentique · capture GPU de `main.tscn` montre
  coussin + chaton + compteur qui bouge · **playtest Pierre** : HumanGate à côté du verdict.
- [ ] Ce que ce lot NE fait PAS (mesuré, passif) : le bot de solvabilité appelle les systèmes directement
  (tier 3, sans prestige) — « le bot joue la scène » est un lot V3.1 ; vocabulaire STANDARD ≠ Prisme (s10s) ;
  reuse_ratio legacy ; red-team Qwen PASSIVE.

## Self-review
- Couverture des 3 pièces de Pierre : contrat (T5) · builder (T5 tâche + gate T2 qui le force) · oracles
  (T1 sonde réelle, T3 volets, T4 preuve). Aucun système nouveau : une sonde de 80 lignes hors projet (précédent
  `godot_probe`), deux gardes, une règle de contrat.
- Fixture réelle à chaque task = le build du run 5 (le défaut), jamais une fixture inventée.
- Types : `run_runtime_alive` → même forme que les volets ; `detail["runtime_alive"]` ; `runtime_dead` ;
  `mode_execution: "static_guard"` ; `preuves_absentes` (bucket existant).
