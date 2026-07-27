"""Oracle PRODUIT (n3-oracle-produit-minimal) — les 3 volets déterministes qui
couvrent les 7 adaptateurs `system.adapter` sortis du gate mutation (décision
U-2, `forge.mutation_proof.MOTIF_EXCLUSION_PRESENTATION_RUNTIME`).

Discipline TDD stricte (contrat) : CHAQUE volet est montré ROUGE sur un cas
FABRIQUÉ (copie de fixture patchée) avant d'être accepté VERT sur le jeu réel
(games/pong). Aucun test ici ne modifie games/pong/** — les cas rouges
travaillent sur des COPIES écrites sous tmp_path (jamais git stash/checkout/
restore sur le dépôt réel).

NOT_MEASURED ≠ OK (garde-fou du contrat) : `check_visual_capture` ne rend
JAMAIS `status == "OK"` quand un volet n'a pas pu être mesuré — vérifié
explicitement ici via un fixture SANS capture_godot.mjs (le champ godot est
alors "ran: False", jamais confondu avec un vert).
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from forge.product_oracle import (  # noqa: E402
    check_auto_session,
    check_browser_import_safety,
    check_visual_capture,
    run_product_oracle,
)

_REPO_ROOT = Path(__file__).resolve().parents[3]
_PONG = _REPO_ROOT / "games" / "pong"
_PRESENTATION = _PONG / "06_RUNTIME" / "adapters" / "presentation"

pytestmark = pytest.mark.skipif(
    shutil.which("node") is None, reason="node introuvable sur ce poste — oracle produit inexécutable")


# ============================================================================
# helpers de fixture — COPIENT le vrai code de Pong sous tmp_path (jamais de
# modification du dépôt réel), préservant la structure relative nécessaire aux
# imports ES relatifs.
# ============================================================================

def _copy(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def _copy_browser_graph(tmp_path: Path) -> Path:
    """Copie le graphe RÉEL atteint depuis l'entrée navigateur (main.mjs + ses
    4 dépendances directes/transitives). Retourne le chemin de l'entrée copiée."""
    game = tmp_path / "pong_copy"
    pres = "06_RUNTIME/adapters/presentation"
    for rel in (
        f"{pres}/browser/main.mjs", f"{pres}/draw.mjs",
        f"{pres}/audio.mjs", f"{pres}/exit.mjs",
        "05_SYSTEMS/game_loop/loop.mjs", "05_SYSTEMS/game_state/state.mjs",
        "05_SYSTEMS/input/input.mjs",
    ):
        _copy(_PONG / rel, game / rel)
    return game / pres / "browser" / "main.mjs"


def _copy_pure_logic(tmp_path: Path) -> Path:
    """Copie SEULEMENT la logique pure (loop/state/input) — ce qu'utilise
    auto_session (3b), jamais un adaptateur de présentation."""
    game = tmp_path / "pong_copy"
    for rel in ("05_SYSTEMS/game_loop/loop.mjs", "05_SYSTEMS/game_state/state.mjs",
                "05_SYSTEMS/input/input.mjs"):
        _copy(_PONG / rel, game / rel)
    return game


def _copy_capture_graph(tmp_path: Path) -> Path:
    """Copie ce qu'exerce capture_browser.mjs (3c, volet navigateur) : lui-même,
    draw.mjs, raster.mjs, + la logique pure dont il dépend. PAS capture_godot.mjs
    (volontairement absent : ce test n'exerce QUE le volet navigateur)."""
    game = tmp_path / "pong_copy"
    pres = "06_RUNTIME/adapters/presentation"
    for rel in (
        f"{pres}/capture_browser.mjs", f"{pres}/draw.mjs", f"{pres}/raster.mjs",
        "05_SYSTEMS/game_loop/loop.mjs", "05_SYSTEMS/game_state/state.mjs",
        "05_SYSTEMS/input/input.mjs",
    ):
        _copy(_PONG / rel, game / rel)
    return game / pres


# ============================================================================
# 3a — browser_import_safety
# ============================================================================

def test_3a_rouge_import_node_reintroduit(tmp_path):
    """Réintroduit EXACTEMENT le défaut réel corrigé le 2026-07-26 : un import
    STATIQUE de `node:fs` dans un fichier atteint depuis l'entrée navigateur
    (audio.mjs). Le volet DOIT rougir — c'est le défaut que capture_browser.mjs
    ne pouvait structurellement pas voir (il ne charge jamais main.mjs)."""
    entry = _copy_browser_graph(tmp_path)
    audio_copy = entry.parent.parent / "audio.mjs"
    original = audio_copy.read_text(encoding="utf-8")
    bugged = "import { existsSync as _regression } from 'node:fs';\n" + original
    audio_copy.write_text(bugged, encoding="utf-8")

    result = check_browser_import_safety(entry)
    print("RED 3a (node: réintroduit):", json.dumps(result, ensure_ascii=False, indent=1))

    assert result["passed"] is False
    specs = {h["specifier"] for h in result["node_imports_atteignables"]}
    assert "node:fs" in specs
    assert any(str(audio_copy) == h["fichier"] for h in result["node_imports_atteignables"])


def test_3a_rouge_process_non_garde(tmp_path):
    """Réintroduit l'AUTRE défaut réel corrigé le 2026-07-26 : `process` référencé
    sans garde `typeof process !== 'undefined'` (exit.mjs avant fix)."""
    entry = _copy_browser_graph(tmp_path)
    exit_copy = entry.parent.parent / "exit.mjs"
    bugged = exit_copy.read_text(encoding="utf-8").replace(
        "if (typeof process !== 'undefined' && typeof process.exit === 'function') {\n"
        "    process.exit(0);\n"
        "  }",
        "process.exit(0);",
    )
    assert "process.exit(0);" in bugged and "typeof process.exit === 'function'" not in bugged
    exit_copy.write_text(bugged, encoding="utf-8")

    result = check_browser_import_safety(entry)
    print("RED 3a (process non gardé):", json.dumps(result, ensure_ascii=False, indent=1))

    assert result["passed"] is False
    assert any(str(exit_copy) == h["fichier"] for h in result["process_non_gardes"])


def test_3a_vert_sur_pong_reel():
    """Contrôle positif : le graphe RÉEL de Pong (post-fix 2026-07-26) est propre."""
    entry = _PRESENTATION / "browser" / "main.mjs"
    result = check_browser_import_safety(entry)
    print("GREEN 3a (Pong réel):", json.dumps(result, ensure_ascii=False, indent=1))

    assert result["passed"] is True
    assert result["node_imports_atteignables"] == []
    assert result["process_non_gardes"] == []
    # les 4 adaptateurs atteints depuis l'entrée navigateur sont bien scannés
    visited_names = {Path(f).name for f in result["fichiers_analyses"]}
    assert visited_names >= {"main.mjs", "draw.mjs", "audio.mjs", "exit.mjs"}
    # capture_browser.mjs/capture_godot.mjs/raster.mjs ne sont PAS atteints depuis
    # l'entrée navigateur (ce sont des outils Node séparés) — limite assumée du volet.
    assert "capture_browser.mjs" not in visited_names
    assert "raster.mjs" not in visited_names


def test_3a_entree_absente_blocked():
    result = check_browser_import_safety(Path("nawak/nexistepas/main.mjs"))
    assert result["passed"] is False
    assert result["checked"] is False


# ============================================================================
# 3b — auto_session
# ============================================================================

def test_3b_rouge_score_gele(tmp_path):
    """Fabrique un score GELÉ : le bloc d'incrémentation de score de loop.mjs est
    neutralisé (`if (false && scored)`), la partie ne peut plus jamais finir ni
    évoluer. max_ticks volontairement petit pour un test rapide."""
    game = _copy_pure_logic(tmp_path)
    loop_copy = game / "05_SYSTEMS" / "game_loop" / "loop.mjs"
    original = loop_copy.read_text(encoding="utf-8")
    assert "if (scored) {" in original
    bugged = original.replace("if (scored) {", "if (false && scored) {", 1)
    loop_copy.write_text(bugged, encoding="utf-8")

    result = check_auto_session(
        loop_copy, game / "05_SYSTEMS" / "game_state" / "state.mjs",
        game / "05_SYSTEMS" / "input" / "input.mjs",
        max_ticks=500, timeout_s=15,
    )
    print("RED 3b (score gelé):", json.dumps(result, ensure_ascii=False, indent=1))

    assert result["passed"] is False
    assert result["score_evolves"] is False
    assert result["finished"] is False


def test_3b_rouge_exception(tmp_path):
    """Fabrique une EXCEPTION à l'exécution (step() lève) : le volet doit la
    rapporter, jamais l'avaler en silence."""
    game = _copy_pure_logic(tmp_path)
    loop_copy = game / "05_SYSTEMS" / "game_loop" / "loop.mjs"
    original = loop_copy.read_text(encoding="utf-8")
    bugged = original.replace(
        "export function step(state, action = { p1: 0, p2: 0 }) {",
        "export function step(state, action = { p1: 0, p2: 0 }) {\n"
        "  throw new Error('regression fabriquee test 3b');",
        1,
    )
    loop_copy.write_text(bugged, encoding="utf-8")

    result = check_auto_session(
        loop_copy, game / "05_SYSTEMS" / "game_state" / "state.mjs",
        game / "05_SYSTEMS" / "input" / "input.mjs",
        max_ticks=500, timeout_s=15,
    )
    print("RED 3b (exception):", json.dumps(result, ensure_ascii=False, indent=1))

    assert result["passed"] is False
    assert result["no_exception"] is False
    assert "regression fabriquee test 3b" in (result["error"] or "")


def test_3b_vert_sur_pong_reel():
    result = check_auto_session(
        _PONG / "05_SYSTEMS" / "game_loop" / "loop.mjs",
        _PONG / "05_SYSTEMS" / "game_state" / "state.mjs",
        _PONG / "05_SYSTEMS" / "input" / "input.mjs",
        max_ticks=20000, timeout_s=30,
    )
    print("GREEN 3b (Pong réel):", json.dumps(result, ensure_ascii=False, indent=1))

    assert result["passed"] is True
    assert result["finished"] is True
    assert result["score_evolves"] is True
    assert result["no_exception"] is True
    assert result["duration_bounded"] is True
    assert result["final_score"]["p1"] + result["final_score"]["p2"] >= 3


def test_3b_fichier_absent_blocked(tmp_path):
    result = check_auto_session(tmp_path / "absent.mjs", tmp_path / "b.mjs", tmp_path / "c.mjs")
    assert result["passed"] is False
    assert result["checked"] is False


# ============================================================================
# 3c — visual_capture
# ============================================================================

def test_3c_rouge_captures_identiques(tmp_path):
    """Fabrique DEUX captures IDENTIQUES (capture_browser.mjs patché pour rendre
    le même état deux fois) : le critère pixel doit rougir. capture_godot.mjs
    est volontairement ABSENT de cette fixture — ce test isole le volet navigateur."""
    pres = _copy_capture_graph(tmp_path)
    cb = pres / "capture_browser.mjs"
    original = cb.read_text(encoding="utf-8")
    assert "const b = render(midGameState(1, 45));" in original
    bugged = original.replace(
        "const b = render(midGameState(1, 45));", "const b = render(boot(1));", 1)
    cb.write_text(bugged, encoding="utf-8")

    result = check_visual_capture(pres, timeout_s=60)
    print("RED 3c (captures identiques):", json.dumps(result, ensure_ascii=False, indent=1))

    assert result["status"] == "FAIL"
    assert result["passed"] is False
    assert result["browser"]["json"]["differ"] is False


def test_3c_not_measured_jamais_ok_quand_godot_absent(tmp_path):
    """godot absent de la fixture (capture_godot.mjs n'existe pas) : le volet
    NE PEUT PAS revendiquer OK sur la moitié Godot. Ici la moitié navigateur est
    VERTE (fixture non patchée) — vérifie que godot.ran est False et que le
    statut global n'est jamais confondu avec OK par la seule vertu du navigateur."""
    pres = _copy_capture_graph(tmp_path)
    assert not (pres / "capture_godot.mjs").exists()

    result = check_visual_capture(pres, timeout_s=60)
    print("check 3c (godot absent de la fixture):", json.dumps(result, ensure_ascii=False, indent=1))

    assert result["browser"]["json"]["passed"] is True     # navigateur mesuré vert
    assert result["godot"]["ran"] is False                  # godot jamais mesuré
    # Le statut global ne doit JAMAIS être "OK" quand godot n'a pas tourné du tout —
    # ici il tombe en NOT_MEASURED (godot.get("json") is None => branche NOT_MEASURED).
    assert result["status"] == "NOT_MEASURED"
    assert result["passed"] is False


def test_3c_vert_sur_pong_reel():
    """Contrôle positif RÉEL : appelle les VRAIES capture_browser.mjs/capture_godot.mjs
    de Pong. Sur CE poste, un binaire Godot est configuré (scripts/forge/godot.config.json)
    et une fenêtre GPU réelle est disponible (RTX 5080, Vulkan) — donc mesuré, pas
    NOT_MEASURED. Si l'environnement change (Godot non configuré ailleurs), ce test
    est légitimement amené à voir godot passer en NOT_MEASURED : on l'assert donc de
    façon tolérante (jamais un FAIL confondu avec une absence de mesure)."""
    result = check_visual_capture(_PRESENTATION, timeout_s=150)
    print("GREEN 3c (Pong réel):", json.dumps(
        {k: v for k, v in result.items() if k != "godot"} |
        {"godot_summary": {kk: result["godot"].get(kk) for kk in ("ran", "returncode")}},
        ensure_ascii=False, indent=1))

    assert result["browser"]["json"]["passed"] is True
    assert result["status"] in ("OK", "NOT_MEASURED")
    assert result["status"] != "FAIL"


# ============================================================================
# Agrégat (utilisé par le driver, s10a)
# ============================================================================

def test_run_product_oracle_sur_pong_reel():
    result = run_product_oracle(_PONG, auto_session_timeout_s=30, visual_capture_timeout_s=150)
    assert set(result) == {"browser_import_safety", "auto_session", "visual_capture"}
    assert result["browser_import_safety"]["passed"] is True
    assert result["auto_session"]["passed"] is True
    assert result["visual_capture"]["status"] in ("OK", "NOT_MEASURED")


# ============================================================================
# Contre-vérification P7 (supervision, 2026-07-27) — NOT_MEASURED ≠ OK, appliqué
# STRICTEMENT : une entrée illisible/inexistante/non-fichier ne doit JAMAIS
# rendre `passed: true`. Défaut trouvé : `check_browser_import_safety(Path
# ('games/pong'))` (un DOSSIER, pas un fichier) rendait `passed: true,
# checked: true` — la lecture échouait (PermissionError sur un dossier),
# `_read_text` avalait l'échec en `""`, un texte vide n'a "aucun defaut" par
# construction. Chaque test ci-dessous est ROUGE contre le code d'AVANT ce
# correctif (vérifié empiriquement par la supervision et reproduit ici), puis
# VERT après.
# ============================================================================

def test_p7_3a_dossier_comme_entree_jamais_vert():
    """LE défaut trouvé : un DOSSIER passé comme entrée navigateur (au lieu d'un
    fichier) ne doit JAMAIS rendre passed=True — la lecture échoue silencieusement
    et un texte vide n'a « aucun défaut » que par construction, pas par mesure."""
    result = check_browser_import_safety(_PONG)  # _PONG est un DOSSIER, pas un fichier
    print("P7 3a (dossier comme entrée):", json.dumps(result, ensure_ascii=False, indent=1))
    assert result["checked"] is False
    assert result["passed"] is False
    assert result["fichiers_analyses"] == []


def test_p7_3a_zero_fichier_analyse_jamais_vert(monkeypatch):
    """Garde-fou 2 explicite : même si l'entrée EST un fichier réel, si AUCUN
    fichier n'a pu être effectivement LU (permission refusée en cours de route,
    etc.), `fichiers_analyses` vide ne doit jamais valoir « aucun défaut trouvé »."""
    import forge.product_oracle as po
    monkeypatch.setattr(po, "_read_text", lambda path: None)
    entry = _PRESENTATION / "browser" / "main.mjs"
    assert entry.is_file()  # l'entrée EST un vrai fichier — seule la LECTURE échoue
    result = po.check_browser_import_safety(entry)
    print("P7 3a (zéro fichier lisible):", json.dumps(result, ensure_ascii=False, indent=1))
    assert result["checked"] is False
    assert result["passed"] is False


def test_p7_3b_dossier_comme_fichier_logique_checked_false():
    """Un DOSSIER passé comme fichier logique doit être rejeté EXPLICITEMENT
    (checked=False, motif clair) — pas seulement « accidentellement rouge » parce
    que Node lève une erreur ESM en aval (fragile : dépend du comportement d'
    import de Node, pas d'une vérification déterministe du driver)."""
    result = check_auto_session(_PONG, _PONG, _PONG, max_ticks=200, timeout_s=10)
    print("P7 3b (dossier comme fichier logique):", json.dumps(result, ensure_ascii=False, indent=1))
    assert result["passed"] is False
    assert result["checked"] is False


def test_p7_3c_entree_manquante_est_not_measured_jamais_ok_ni_fail():
    """Un `presentation_dir` inexistant (donc capture_browser.mjs introuvable) est
    une ABSENCE DE MESURE, pas un critère pixel rouge mesuré — le statut doit être
    NOT_MEASURED (jamais OK, et jamais FAIL non plus : FAIL affirmerait à tort
    qu'une mesure a eu lieu et a échoué)."""
    result = check_visual_capture(_REPO_ROOT / "games" / "pong_does_not_exist_p7", timeout_s=10)
    print("P7 3c (presentation_dir inexistant):", json.dumps(
        {k: v for k, v in result.items() if k not in ("browser", "godot")},
        ensure_ascii=False, indent=1))
    assert result["status"] == "NOT_MEASURED"
    assert result["passed"] is False


def test_p7_driver_ne_lit_jamais_passed_seul(tmp_path):
    """Point 5 de la contre-vérification : le driver lit-il `passed` en ignorant
    `checked` ? Réponse mécanique : `detail["product_oracle"]` est porté TEL QUEL
    (`self.product_oracle_runner(self.game_dir)`, driver.py) sans qu'aucune ligne
    du driver ne teste `["passed"]` sur ce dict — grep négatif ci-dessous. Le
    driver ne consomme donc PAS ces champs pour décider quoi que ce soit (100%
    advisory, transmission brute) : le risque décrit au point 5 ne s'est pas
    encore matérialisé, mais le deviendra le jour où quelqu'un lira
    `detail["product_oracle"][...]["passed"]` sans vérifier `checked`/`status`
    d'abord — à surveiller à la promotion en gate dur (hors périmètre ici)."""
    driver_src = (_REPO_ROOT / "scripts" / "forge" / "driver.py").read_text(encoding="utf-8")
    # aucune ligne du driver n'indexe ["passed"] sur le résultat product_oracle
    assert 'product_oracle"]["passed"]' not in driver_src.replace("'", '"')
    assert "self.product_oracle_runner(self.game_dir)" in driver_src
