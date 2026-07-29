"""Oracles statiques déterministes de Forge — ARCHI (s10b) + WIREMAP (s10c).

Non-LLM, reproductibles. Multi-langages : Python via AST ; Rust / TypeScript /
JavaScript / GDScript via regex déterministe (aucune dépendance externe).

- ``check_architecture`` : les imports réels du code violent-ils une dépendance
  interdite du blueprint ? (« ui ne doit pas importer engine »).
- ``check_wiremap`` : chaque feature du tableau WireMap pointe-t-elle une
  fonction qui existe vraiment ? (isomorphisme WireMap ↔ code).

Ces oracles PROUVENT (PASS/FAIL) ; ils ne jugent jamais (aucun LLM).
"""
from __future__ import annotations

import ast
import json
import logging
import re
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

logger = logging.getLogger(__name__)

# Extensions source couvertes (les stacks du studio). .mjs/.cjs inclus : les jeux
# web forgés sont en modules ES (.mjs) — les omettre = oracle aveugle (faux négatif
# réel sur collect_runner : fichiers jamais analysés).
SOURCE_EXTS = {".py", ".rs", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".gd"}
_TS_EXTS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}

# Mots-clés de chemin de module à ignorer (Rust).
_RUST_PATH_KW = {"crate", "super", "self", "std", "core", "alloc"}

# --- regex par langage (déterministes) ---
_RUST_USE = re.compile(r"^\s*(?:pub\s+)?use\s+([\w:]+)", re.M)
# Statement `use` COMPLET jusqu'au `;` (DOTALL) : capture les imports groupés
# `use crate::{ui, engine};` et multi-lignes — que _RUST_USE (arrêté à `{`) ratait.
_RUST_USE_STMT = re.compile(r"\buse\s+(.+?);", re.S)
_IDENT = re.compile(r"[A-Za-z_]\w*")
_RUST_MOD = re.compile(r"^\s*(?:pub\s+)?mod\s+(\w+)", re.M)
_RUST_DEF = re.compile(r"\b(?:fn|struct|enum|trait)\s+(\w+)")

_TS_FROM = re.compile(r"""from\s+['"]([^'"]+)['"]""")
_TS_REQUIRE = re.compile(r"""require\(\s*['"]([^'"]+)['"]""")
_TS_IMPORT_BARE = re.compile(r"""import\s+['"]([^'"]+)['"]""")
_TS_DYN = re.compile(r"""import\(\s*['"]([^'"]+)['"]""")  # import() dynamique (faux POSITIF corrigé)
_TS_FUNC = re.compile(r"\bfunction\s+(\w+)")
_TS_ASSIGN = re.compile(r"\b(?:const|let|var)\s+(\w+)\s*=")
_TS_CLASS = re.compile(r"\bclass\s+(\w+)")
# Méthode de classe `name(args) {` (B4 corrigé) — les mots-clés de contrôle sont filtrés.
# Le corps de la parenthèse tolère `{`/`}`/`=` : défauts objets (`opts = {}`) et
# params déstructurés (`{x, y}`) sont idiomatiques — les exclure = faux positif
# « fonction renommée » (bug trouvé in vivo sur games/collect_runner : step/applyInput
# avec `input = {}`). On borne au `)` fermant et on interdit `;` (frontière de statement).
_TS_METHOD = re.compile(r"^[ \t]*(?:public |private |protected |static |async |get |set |\*\s*)*([A-Za-z_$][\w$]*)\s*\([^;)]*\)\s*\{", re.M)
_JS_NONMETHOD = {"if", "for", "while", "switch", "catch", "return", "function", "do", "else", "with"}

_GD_LOAD = re.compile(r"""(?:preload|load)\(\s*['"]([^'"]+)['"]""")
_GD_EXTENDS = re.compile(r"^\s*extends\s+(.+?)\s*$", re.M)
_GD_DEF = re.compile(r"^\s*(?:static\s+)?func\s+(\w+)", re.M)
_GD_CLASSNAME = re.compile(r"^\s*class_name\s+(\w+)", re.M)
_GD_SIGNAL = re.compile(r"^\s*signal\s+(\w+)", re.M)


def _read(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError) as exc:
        logger.warning("oracle statique: lecture échouée sur %s (%s)", path, exc)
        return ""


def _module_of(path: Path, src_root: Path) -> str:
    """Module d'un fichier = son premier dossier sous src_root (ui/view.rs -> 'ui')."""
    rel = path.relative_to(src_root)
    return rel.parts[0] if len(rel.parts) > 1 else rel.stem


def _path_segments(spec: str) -> set[str]:
    """Segments significatifs d'un chemin d'import ('../engine/board' -> {engine, board})."""
    spec = spec.replace("res://", "")
    segs: set[str] = set()
    for part in re.split(r"[\\/]", spec):
        part = part.strip()
        if not part or part in (".", ".."):
            continue
        segs.add(Path(part).stem)  # 'board.ts' -> 'board'
    return segs


def _imports(path: Path) -> set[str]:
    """Tokens de modules importés par un fichier (candidats à matcher un module du blueprint)."""
    ext = path.suffix
    text = _read(path)
    if not text:
        return set()

    if ext == ".py":
        try:
            tree = ast.parse(text)
        except (SyntaxError, ValueError):
            return set()
        pkgs: set[str] = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    pkgs.add(alias.name.split(".")[0])
            elif isinstance(node, ast.ImportFrom):
                # Absolu (`from engine import x`) ET relatif (`from ..engine import x`,
                # level>=1) : le 1er segment du module cible matche un module blueprint.
                if node.module:
                    pkgs.add(node.module.split(".")[0])
                elif node.level:  # `from . import engine` — cible dans les names
                    for alias in node.names:
                        pkgs.add(alias.name.split(".")[0])
        return pkgs

    if ext == ".rs":
        out: set[str] = set()
        # Tokenise le corps de chaque `use ...;` (gère groupes/imbrications/multi-lignes).
        for body in _RUST_USE_STMT.findall(text):
            for tok in _IDENT.findall(body):
                if tok not in _RUST_PATH_KW:
                    out.add(tok)
        out.update(_RUST_MOD.findall(text))
        return out

    if ext in _TS_EXTS:
        out = set()
        specs = (_TS_FROM.findall(text) + _TS_REQUIRE.findall(text)
                 + _TS_IMPORT_BARE.findall(text) + _TS_DYN.findall(text))
        for spec in specs:
            if spec.startswith("."):
                out |= _path_segments(spec)          # import local -> segments de chemin
            else:
                out.add(spec.split("/")[0])           # package -> 1er segment
        return out

    if ext == ".gd":
        out = set()
        for spec in _GD_LOAD.findall(text):
            out |= _path_segments(spec)
        for ext_target in _GD_EXTENDS.findall(text):
            if "/" in ext_target or "res://" in ext_target:
                out |= _path_segments(ext_target.strip("'\""))
            else:
                out.add(ext_target.strip("'\""))
        return out

    return set()


def _defined_names(path: Path) -> set[str]:
    """Noms de fonctions/types définis dans un fichier (par langage)."""
    ext = path.suffix
    text = _read(path)
    if not text:
        return set()

    if ext == ".py":
        try:
            tree = ast.parse(text)
        except (SyntaxError, ValueError):
            return set()
        names: set[str] = set()
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                names.add(node.name)
        return names

    if ext == ".rs":
        return set(_RUST_DEF.findall(text))

    if ext in _TS_EXTS:
        methods = {m for m in _TS_METHOD.findall(text) if m not in _JS_NONMETHOD}
        return (set(_TS_FUNC.findall(text)) | set(_TS_ASSIGN.findall(text))
                | set(_TS_CLASS.findall(text)) | methods)

    if ext == ".gd":
        return set(_GD_DEF.findall(text)) | set(_GD_CLASSNAME.findall(text)) | set(_GD_SIGNAL.findall(text))

    return set()


def _is_test_file(path: Path) -> bool:
    name = path.name.lower()
    return "test" in name or "spec" in name


def _source_files(src_root: Path):
    for path in src_root.rglob("*"):
        if path.is_file() and path.suffix in SOURCE_EXTS:
            yield path


def check_architecture(blueprint: dict, src_root: Path) -> dict:
    """Vérifie les dépendances réelles contre les deps_interdites du blueprint.

    Multi-langages. Retourne {passed, deps_interdites_violées[], modules_sans_test[],
    debordements_ownership[]}. PASS = aucune dépendance interdite violée.
    """
    src_root = Path(src_root)
    modules = set(blueprint.get("modules", []))
    # F2b (red-team, 2026-07-14) : un deps_interdites malformé (ex. la str
    # 'ui->engine' au lieu de la paire ['ui', 'engine']) levait ValueError au
    # dépaquetage — l'exception traversait le driver (crash-loop : s10b RUNNING
    # rejoué à chaque reprise). Un oracle ne lève JAMAIS sur son entrée : entrée
    # malformée => FAIL honnête avec raison explicite (jamais un faux vert).
    deps_raw = blueprint.get("deps_interdites", [])
    malformes: list[str] = []
    forbidden: set[tuple[str, str]] = set()
    if not isinstance(deps_raw, list):
        malformes.append(repr(deps_raw))
    else:
        for pair in deps_raw:
            if (isinstance(pair, (list, tuple)) and len(pair) == 2
                    and all(isinstance(x, str) for x in pair)):
                forbidden.add((pair[0], pair[1]))
            else:
                malformes.append(repr(pair))
    if malformes:
        return {
            "passed": False,
            "raison": ("deps_interdites malformées — paire [source, cible] (str) "
                       f"attendue, reçu : {', '.join(malformes)}"),
            "deps_interdites_violées": [],
            "modules_sans_test": [],
            "debordements_ownership": {"checked": False, "items": []},
        }

    violations: list[list[str]] = []
    modules_with_files: set[str] = set()
    tested: set[str] = set()

    for path in _source_files(src_root):
        src_mod = _module_of(path, src_root)
        imported = _imports(path) & modules
        if _is_test_file(path):
            tested |= imported
            continue
        modules_with_files.add(src_mod)
        for target in imported:
            if (src_mod, target) in forbidden:
                edge = [src_mod, target]
                if edge not in violations:
                    violations.append(edge)

    modules_sans_test = sorted(m for m in modules if m in modules_with_files and m not in tested)

    return {
        "passed": not violations,
        "deps_interdites_violées": violations,
        "modules_sans_test": modules_sans_test,
        # Honnêteté : un stub non implémenté se DÉCLARE (checked:False), il n'a pas
        # la même forme qu'un vrai résultat vide. L'implémentation réelle est un
        # chantier séparé — ici on ne prétend pas avoir vérifié l'ownership.
        "debordements_ownership": {"checked": False, "items": []},
    }


def check_wiremap(wiremap: dict, src_root: Path) -> dict:
    """Vérifie l'isomorphisme WireMap ↔ code réel (multi-langages).

    Retourne {passed, features_manquantes[], fonctions_renommées[], obsoletes[],
    preuves_absentes[]}. PASS = aucune feature manquante/renommée ni preuve absente.
    """
    src_root = Path(src_root)
    features_manquantes: list[str] = []
    fonctions_renommees: list[str] = []
    obsoletes: list[str] = []
    preuves_absentes: list[str] = []

    for feat in wiremap.get("features", []):
        name = feat.get("feature", "?")
        fonction = feat.get("fonction", "")
        fichiers = feat.get("fichiers", []) or []

        if not str(feat.get("preuve", "")).strip():
            preuves_absentes.append(name)

        existing_files = [f for f in fichiers if (src_root / f).exists()]
        obsoletes.extend(f for f in fichiers if f not in existing_files)

        if not existing_files:
            # Aucun fichier existant — OU aucun fichier déclaré (fichiers:[]) : une
            # feature qui ne pointe rien de réel ne peut pas être prouvée verte.
            features_manquantes.append(name)
            continue

        if fonction:
            found = any(fonction in _defined_names(src_root / f) for f in existing_files)
            if not found:
                fonctions_renommees.append(f"{name}:{fonction}")

    passed = not (features_manquantes or fonctions_renommees or preuves_absentes)
    return {
        "passed": passed,
        "features_manquantes": features_manquantes,
        "fonctions_renommées": fonctions_renommees,
        "obsoletes": obsoletes,
        "preuves_absentes": preuves_absentes,
    }


# --- garde structurelle e2e (C3) : l'oracle d'un JEU à UI DOIT prouver la
# jouabilité par un click-through navigateur RÉEL. Ce check déterministe (aucun
# run, aucun LLM) rejette un e2e "coquille" (imprime PASS sans piloter) et un
# run-oracle qui n'appelle jamais l'e2e. Équivalent e2e du mutation-testing.
#
# Anti-gaming : les commentaires JS sont retirés avant analyse — un token en
# commentaire ne prouve rien. Le câblage exige un VERBE d'exécution devant
# e2e.mjs (une simple mention dans un log/commentaire ne câble aucun oracle).
# Limite connue (résiduelle, non fermée ici) : un token présent dans une chaîne
# littérale d'exécution (`console.log("__game")`) reste comptable — acceptable
# car les builders forge ne sont pas adversariaux et HumanGate reste terminal. ---
_E2E_MIN_ASSERTIONS = 3
_E2E_BROWSER = re.compile(r"\b(chromium|playwright|firefox|webkit)\b")
_E2E_INPUT = re.compile(r"keyboard\.(?:down|up|press|type|insertText)|\.click\(|\.tap\(")
_E2E_STATE_TOKEN = re.compile(r"__game(?:_debug)?\b|#overlay|#restart")
# run-oracle doit INVOQUER e2e.mjs (spawn/run/import/node…), pas seulement le
# mentionner : une occurrence en log/commentaire ne câble rien au gate.
_E2E_WIRED = re.compile(r"(?:run|spawn|exec|execFile|fork|import|node)\b[^\n]*?e2e\.mjs")

# Retrait des commentaires JS. Le lookbehind (?<!:) épargne les '//' d'URL
# (http://localhost) pour ne pas tronquer une ligne de code réelle.
_JS_BLOCK_COMMENT = re.compile(r"/\*.*?\*/", re.S)
_JS_LINE_COMMENT = re.compile(r"(?<!:)//[^\n]*")


def _strip_js_comments(text: str) -> str:
    return _JS_LINE_COMMENT.sub(" ", _JS_BLOCK_COMMENT.sub(" ", text))


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
    elif not _E2E_WIRED.search(_strip_js_comments(_read(runner))):
        raisons.append("run-oracle.mjs n'invoque pas e2e.mjs (volet e2e absent du gate)")

    e2e = src_root / "e2e.mjs"
    if not e2e.exists():
        raisons.append("e2e.mjs absent")
        return {"passed": False, "raisons": raisons}

    text = _strip_js_comments(_read(e2e))
    if not text.strip():
        raisons.append("e2e.mjs vide ou illisible")
        return {"passed": False, "raisons": raisons}
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


# --- garde structurelle solvabilité (P2, leçon survival_arena/collect_runner) -----
# Le contrat s9-build EXIGE la solvabilité en prose (tests_oracles : « solvability.mjs
# câblé dans run-oracle.mjs » ; success_criteria : « un bot joue et GAGNE ») mais
# AUCUNE garde mécanique ne la vérifiait : deux jeux injouables ont passé tous les
# gates verts. MIROIR structurel de check_e2e_harness : mêmes helpers
# (_read/_strip_js_comments), même verbe d'exécution exigé, même niveau de
# strictesse — ni plus, ni moins. Limite connue assumée (identique à _E2E_WIRED,
# résiduelle, non fermée ici) : un token dans une chaîne littérale d'exécution
# (`console.log("solvability.mjs")` sur une ligne portant un verbe) reste comptable
# — acceptable car les builders forge ne sont pas adversariaux et HumanGate reste
# terminal. Cette garde prouve le CÂBLAGE (le harnais existe et le gate l'exécute),
# jamais que le bot gagne réellement — ça, seule l'exécution de run-oracle.mjs le
# prouve (elle échoue alors mécaniquement si le harnais est câblé : d'où ce check).
_SOLVABILITY_WIRED = re.compile(r"(?:run|spawn|exec|execFile|fork|import|node)\b[^\n]*?solvability\.mjs")


# C3 — DEUX TOPOLOGIES COEXISTENT, aucune ne remplace l'autre :
#   * LEGACY (games/collect_runner, games/shmup_slice, games/kb_tactics…) : harnais à la
#     RACINE du jeu (run-oracle.mjs + solvability.mjs) ;
#   * STANDARD (curriculum de jeux, scripts/forge/standard/repo_map.yaml — table FIGÉE) :
#     la preuve de solvabilité vit en `07_TESTS/oracle/solvability.mjs` (catégorie
#     `test.solvability`) et il n'y a PAS de run-oracle.mjs — le rôle de « runner qui
#     câble la preuve au gate » est tenu par la COMMANDE D'ORACLE du projet (oracles.json,
#     celle-là même que forge_gate exécute).
# La garde ne bascule donc pas de l'une à l'autre : elle reçoit du driver un champ
# STRUCTURÉ (`standard_topology`) — jamais un sniff de dossier — et applique la
# vérification correspondante. Même exigence dans les deux cas : le fichier existe, il
# n'est pas vide, ET l'exécutant du gate l'invoque réellement.
_STANDARD_SOLVABILITY_REL = "07_TESTS/oracle/solvability.mjs"

# Racine du dépôt — même convention que driver.py (`_REPO_ROOT`), nécessaire pour
# résoudre un wrapper cité dans `runner_argv` par un chemin relatif au dépôt
# (ex. "scripts/forge/godot_oracle.mjs", résolu depuis cwd="." dans oracles.json),
# distinct du chemin de l'entrée déclarée qui, lui, est relatif à `root` (le jeu).
_REPO_ROOT = Path(__file__).resolve().parents[2]

# Extensions de wrapper considérées lisibles pour la recherche de câblage du
# descripteur (mêmes langages que run-oracle.mjs/godot_oracle.mjs).
_WRAPPER_EXTS = (".mjs", ".js", ".cjs")


def check_solvability_wired(
    root: Path, *, standard_topology: bool = False,
    runner_argv: Sequence[str] = (),
    proof: dict | None = None,
) -> dict:
    """Le jeu a-t-il un harnais de solvabilité, câblé dans ce qui exécute le gate ?

    Retourne {passed, raisons[], checked} homogène aux autres gardes (+ `topology`
    quand elle est nommée : la forme du reçu LEGACY (`proof=None`, hors STANDARD)
    reste inchangée au champ près — un test l'assert en égalité stricte).

    PASS (topologie LEGACY, défaut, comportement INCHANGÉ) = solvability.mjs existe à la
    racine, non vide, ET run-oracle.mjs l'INVOQUE via un verbe d'exécution (commentaires
    JS retirés avant analyse — une mention en commentaire/log ne câble aucun oracle).
    PASS (topologie STANDARD, `standard_topology=True`, `proof=None`) =
    `07_TESTS/oracle/solvability.mjs` existe, non vide, ET `runner_argv` (la commande
    d'oracle réellement résolue pour ce projet) l'invoque.
    PASS (descripteur, `proof` fourni et non None — CONTRAT_PREUVE_MUTATION_V1.md,
    `proof.solvability`) = voir `_check_solvability_descriptor` : un jeu qui déclare son
    entrée de solvabilité (ex. GDScript `solvability.gd`, Snake) n'est plus jugé sur
    l'hypothèse web-only `07_TESTS/oracle/solvability.mjs`. `proof` a TOUJOURS priorité
    sur `standard_topology` quand il est fourni (il est plus spécifique : un descripteur
    de contrat prime sur l'hypothèse de topologie) ; `proof=None` (défaut) laisse le
    comportement historique STRICTEMENT inchangé, dans les deux topologies.
    checked est toujours True : la garde est purement statique.
    """
    root = Path(root)
    if proof is not None:
        return _check_solvability_descriptor(root, proof, tuple(runner_argv or ()))
    if standard_topology:
        return _check_solvability_standard(root, tuple(runner_argv or ()))
    raisons: list[str] = []

    runner = root / "run-oracle.mjs"
    if not runner.exists():
        raisons.append("run-oracle.mjs absent")
    elif not _SOLVABILITY_WIRED.search(_strip_js_comments(_read(runner))):
        raisons.append(
            "run-oracle.mjs n'invoque pas solvability.mjs (volet solvabilité absent du gate)")

    solv = root / "solvability.mjs"
    if not solv.exists():
        raisons.append("solvability.mjs absent")
        return {"passed": False, "raisons": raisons, "checked": True}

    if not _strip_js_comments(_read(solv)).strip():
        raisons.append("solvability.mjs vide ou illisible")

    # Forme du reçu LEGACY inchangée au champ près (test_driver_solvability l'assert en
    # égalité stricte) : la topologie n'est nommée que là où elle est nouvelle.
    return {"passed": not raisons, "raisons": raisons, "checked": True}


def _check_solvability_standard(root: Path, runner_argv: tuple) -> dict:
    """Volet solvabilité pour la topologie STANDARD (cf. commentaire ci-dessus).

    `runner_argv` = la commande d'oracle RÉSOLUE du projet (forge.oracle.resolve_oracle),
    c'est-à-dire exactement ce que forge_gate lance. L'invocation est cherchée dans les
    ARGUMENTS (pas dans un fichier source) : c'est là que vit le câblage en topologie
    STANDARD. `runner_argv` vide (oracle non résolu) => câblage NON prouvé, jamais un
    vert par défaut."""
    raisons: list[str] = []
    solv = root / "07_TESTS" / "oracle" / "solvability.mjs"

    if not any("solvability.mjs" in str(a) for a in runner_argv):
        raisons.append(
            f"la commande d'oracle du projet n'invoque pas {_STANDARD_SOLVABILITY_REL} "
            f"(volet solvabilité absent du gate) — argv={list(runner_argv)}")

    if not solv.exists():
        raisons.append(f"{_STANDARD_SOLVABILITY_REL} absent (topologie STANDARD)")
        return {"passed": False, "raisons": raisons, "checked": True,
                "topology": "standard"}

    if not _strip_js_comments(_read(solv)).strip():
        raisons.append(f"{_STANDARD_SOLVABILITY_REL} vide ou illisible")

    return {"passed": not raisons, "raisons": raisons, "checked": True,
            "topology": "standard"}


def _resolve_wrapper_script(root: Path, runner_argv: tuple) -> Path | None:
    """Localise, parmi les arguments de `runner_argv`, le premier script wrapper
    existant réellement sur disque (ex. `scripts/forge/godot_oracle.mjs` pour un
    jeu Godot). `runner_argv` porte des chemins relatifs au dépôt (résolus par
    `oracles.json`, `cwd` variable selon le projet) — jamais relatifs à `root`
    (qui est le jeu, pas le dépôt) : deux bases sont donc essayées, dépôt
    d'abord (cas réel mesuré : Snake, cwd="."), puis `root` en repli pour un
    futur jeu dont l'oracle serait câblé relativement à lui-même. Ne retourne
    RIEN (None) si aucun token de `runner_argv` ne désigne un fichier existant
    d'extension wrapper connue — jamais une devinette.
    """
    for token in runner_argv:
        if not isinstance(token, str) or not token.endswith(_WRAPPER_EXTS):
            continue
        token_path = Path(token)
        candidates = (token_path,) if token_path.is_absolute() else (
            _REPO_ROOT / token_path, root / token_path)
        for candidate in candidates:
            if candidate.exists() and candidate.is_file():
                return candidate
    return None


def _check_solvability_descriptor(root: Path, proof: dict, runner_argv: tuple) -> dict:
    """Volet solvabilité quand le contrat de jeu porte un descripteur
    `proof.solvability` (CONTRAT_PREUVE_MUTATION_V1.md, `entry`) — remplace
    l'hypothèse web-only figée (`07_TESTS/oracle/solvability.mjs`) par une LECTURE
    du descripteur pour les runtimes non-web (ex. Godot/GDScript : `solvability.gd`).

    PASS ssi (1) `proof.solvability.entry` est un chemin déclaré, exploitable ;
    (2) le fichier existe sous `root` (le jeu) et n'est ni vide ni illisible ;
    (3) le câblage est prouvé : un WRAPPER localisé dans `runner_argv`
    (`_resolve_wrapper_script`) référence littéralement le NOM (basename) de
    l'entrée déclarée, commentaires JS retirés avant recherche.

    LIMITE ASSUMÉE, à ne jamais taire (mission 2026-07-29) : une correspondance
    textuelle sur un nom de fichier n'est pas une trace d'EXÉCUTION — elle pourrait
    vivre dans une constante jamais utilisée, ou désigner un homonyme sans rapport.
    C'est le même niveau de garantie que `_SOLVABILITY_WIRED` en topologie LEGACY
    (qui exige un verbe d'exécution sur la même ligne) : ici, aucun verbe d'exécution
    n'est exigé, parce que le wrapper mesuré (godot_oracle.mjs) référence l'entrée via
    une CONSTANTE indirecte (`const SOLVABILITY_SCRIPT = 'res://solvability.gd'`) puis
    l'utilise plus loin dans l'appel — un `run|spawn|exec` immédiatement adjacent au nom
    de fichier n'existe pas dans ce style d'écriture. Durcir cette garde (par ex. exiger
    aussi la variable de la constante soit RÉUTILISÉE dans un appel spawn) est un choix
    conscient à faire séparément, pas un accident de cette mission.

    `runner_argv` vide, wrapper introuvable, ou wrapper ne référençant pas l'entrée
    => câblage NON prouvé, jamais un vert par défaut.
    """
    raisons: list[str] = []
    entry = proof.get("entry") if isinstance(proof, dict) else None
    if not entry or not isinstance(entry, str):
        raisons.append(
            "descripteur proof.solvability sans champ 'entry' exploitable "
            f"(reçu: {entry!r})")
        return {"passed": False, "raisons": raisons, "checked": True,
                "topology": "descripteur"}

    entry_path = root / entry
    if not entry_path.exists():
        raisons.append(f"entrée déclarée '{entry}' absente sous {root}")
        return {"passed": False, "raisons": raisons, "checked": True,
                "topology": "descripteur"}

    if not _read(entry_path).strip():
        raisons.append(f"entrée déclarée '{entry}' vide ou illisible")

    entry_name = Path(entry).name
    wrapper = _resolve_wrapper_script(root, runner_argv)
    if wrapper is None:
        raisons.append(
            f"aucun script wrapper localisable dans runner_argv={list(runner_argv)} "
            "— câblage non prouvé")
    else:
        wrapper_text = _strip_js_comments(_read(wrapper))
        if entry_name not in wrapper_text:
            raisons.append(
                f"{wrapper} ne référence pas '{entry_name}' (entrée déclarée) "
                "— câblage non prouvé")

    return {"passed": not raisons, "raisons": raisons, "checked": True,
            "topology": "descripteur"}


# --- garde structurelle reuse_ratio (Tier 1 #2, renfort 2026-07-13) ---------------
# Le contrat s9-build (§2bis) DEMANDE au builder de citer scripts/forge/reuse_ratio.mjs
# dans son final_report, mais rien n'obligeait MÉCANIQUEMENT le run-oracle à l'exécuter
# — un builder pouvait citer la mesure sans jamais l'avoir lancée. Cette garde vérifie
# seulement que run-oracle.mjs INVOQUE réellement reuse_ratio.mjs (même verbe d'exécution
# que _E2E_WIRED) ; advisory, jamais gating : reuse_ratio ne juge pas (un ratio bas n'est
# pas une erreur, cf. reuse_ratio.mjs), seule l'ABSENCE de mesure est rapportée ici.
_REUSE_RATIO_WIRED = re.compile(r"(?:run|spawn|exec|execFile|fork|import|node)\b[^\n]*?reuse_ratio\.mjs")


def check_reuse_ratio_wired(src_root: Path) -> dict:
    """run-oracle.mjs invoque-t-il réellement reuse_ratio.mjs ?

    Retourne {passed, raisons[]}. Advisory (n'affecte jamais oracle_ok) : contrairement
    à check_e2e_harness, l'absence de câblage est un FAIT à remonter à HumanGate, pas un
    FAIL mécanique — reuse_ratio mesure, il ne prouve rien qui gate le code.
    """
    src_root = Path(src_root)
    runner = src_root / "run-oracle.mjs"
    if not runner.exists():
        return {"passed": False, "raisons": ["run-oracle.mjs absent"]}
    if not _REUSE_RATIO_WIRED.search(_strip_js_comments(_read(runner))):
        return {"passed": False, "raisons": [
            "run-oracle.mjs n'invoque pas reuse_ratio.mjs (mesure de réutilisation "
            "jamais exécutée mécaniquement — citation du builder non vérifiable)"]}
    return {"passed": True, "raisons": []}


# --- garde anti-théâtre des harnais (R1, FORGE_V2_CONSOLIDATION.md §4-A) -----------
# Pattern bi-projet constaté (audit P1) : un harnais/oracle qui ÉCRIT son statut de
# succès en LITTÉRAL (`passed: true`, `ok: true`...) au lieu de le CALCULER est un
# théâtre d'oracle — il rougit ici (s10a, driver), pas 10 étapes plus tard via un
# red-team tardif. MIROIR structurel de check_e2e_harness : mêmes helpers
# (_read/_strip_js_comments), même forme {passed, raisons[]}, jamais d'exception sur
# entrée malformée (fichier illisible => simplement rien à y trouver, pas un crash).
_HARNESS_SUCCESS_KEYS = (
    "allMovesLegal", "passed", "ok", "success", "solved", "solvable", "won",
    "valid", "legal", "reachable", "verified", "complete", "completed",
)
_HARNESS_KEYS_ALT = "|".join(_HARNESS_SUCCESS_KEYS)
# `key: true` (objet littéral) — sans ambiguïté, `:` n'introduit jamais une comparaison.
_HARNESS_KEY_COLON = re.compile(rf"\b(?:{_HARNESS_KEYS_ALT})\s*:\s*true\b", re.I)
# `key = true` (affectation) — négation devant `=` : exclut `==`/`===` (comparaisons,
# pas des affectations) via le lookahead qui refuse un second `=` immédiat.
_HARNESS_KEY_ASSIGN = re.compile(rf"\b(?:{_HARNESS_KEYS_ALT})\s*=(?!=)\s*true\b", re.I)

_HARNESS_FIXED_NAMES = ("run-oracle.mjs", "solvability.mjs")
_HARNESS_DIR_NAME = "harness"


def _harness_files(src_root: Path) -> list[Path]:
    """Fichiers harnais/oracle scannés : run-oracle.mjs, solvability.mjs (racine),
    harness/*.mjs — la surface exacte visée par le renfort R1."""
    root = Path(src_root)
    files = [root / name for name in _HARNESS_FIXED_NAMES if (root / name).exists()]
    harness_dir = root / _HARNESS_DIR_NAME
    if harness_dir.is_dir():
        files.extend(sorted(p for p in harness_dir.glob("*.mjs") if p.is_file()))
    return files


def check_harness_no_hardcoded_flags(src_root: Path) -> dict:
    """Un harnais/oracle de jeu écrit-il un flag de succès en DUR au lieu de le calculer ?

    Retourne {passed, raisons[]}. Heuristique : une clé de succès connue
    (allMovesLegal/passed/ok/success/solved/solvable/won/valid/legal/reachable/
    verified/complete/completed) affectée au littéral booléen `true` SANS expression
    (ni comparaison, ni calcul) est suspecte — un harnais sain CALCULE son statut
    (`passed: bot.won`, `const ok = moves.every(isLegal)`), il ne l'écrit jamais en
    dur. Les commentaires JS sont retirés avant analyse (un flag en commentaire ne
    prouve rien, même esprit que check_e2e_harness/check_solvability_wired).

    Aucun fichier harnais trouvé (run-oracle.mjs/solvability.mjs/harness/*.mjs tous
    absents) => rien à scanner ici : PASS vacueux. L'ABSENCE du harnais est déjà le
    rôle de check_e2e_harness / check_solvability_wired — ce n'est pas celui-ci qui
    la re-signale (pas de double-comptage d'une même faute).
    """
    src_root = Path(src_root)
    raisons: list[str] = []
    for f in _harness_files(src_root):
        text = _strip_js_comments(_read(f))
        for pattern in (_HARNESS_KEY_COLON, _HARNESS_KEY_ASSIGN):
            for m in pattern.finditer(text):
                line_no = text.count("\n", 0, m.start()) + 1
                try:
                    rel = f.relative_to(src_root)
                except ValueError:
                    rel = f
                raisons.append(
                    f"{rel}:{line_no} — flag littéral suspect « {m.group(0).strip()} » "
                    "(statut écrit en dur, pas calculé)"
                )
    return {"passed": not raisons, "raisons": raisons}


# Chemin par défaut du log d'auto-journalisation de knowledge_base/search.mjs (miroir
# Python de searchLogSince en JS). scripts/forge/static_oracles.py -> parents[2] == repo root.
_SEARCH_LOG_DEFAULT = Path(__file__).resolve().parents[2] / "knowledge_base" / "search_log.jsonl"


def utc_iso_now() -> str:
    """Horodatage UTC ISO 8601 millisecondes + suffixe 'Z' — MÊME format que
    `new Date().toISOString()` en JS (search.mjs), pour que la comparaison lexicale
    `ts >= since` reste valide entre les deux langages (évite le piège '+00:00' vs 'Z',
    qui ne trient PAS pareil en ASCII)."""
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def check_search_consulted(since_iso: str, log_path: Path | None = None) -> dict:
    """`knowledge_base/search.mjs` a-t-il été appelé au moins une fois depuis `since_iso` ?

    Retourne {passed, raisons[], count}. Advisory (n'affecte jamais oracle_ok), même esprit
    que `check_reuse_ratio_wired` : le contrat s9-build DIT au builder de chercher avant
    d'écrire, mais c'est une consigne de prompt, pas une preuve. `search.mjs` s'auto-
    journalise à chaque appel CLI (best-effort, JSONL) ; on lit cette trace en lecture
    seule ici — jamais on ne fait confiance à la seule citation du builder. Absence de
    fichier de log = jamais recherché (ou log gitignoré non présent) : FAIL informatif,
    pas une erreur (peut être légitime si aucune brique ne pouvait matcher).
    """
    path = log_path or _SEARCH_LOG_DEFAULT
    if not path.exists():
        return {"passed": False, "count": 0,
                "raisons": ["aucune recherche journalisée (search_log.jsonl absent)"]}
    count = 0
    for line in _read(path).splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue  # ligne corrompue : ignorée, jamais fatale (même esprit que searchLogSince)
        ts = record.get("ts")
        if isinstance(ts, str) and ts >= since_iso:
            count += 1
    if count == 0:
        return {"passed": False, "count": 0, "raisons": [
            f"aucune recherche journalisée depuis {since_iso} (contrat s9-build §2bis "
            "non respecté, ou aucune brique ne pouvait matcher)"]}
    return {"passed": True, "count": count, "raisons": []}


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

    Retourne {passed, checked, ajoutees[], supprimees[]}. PASS = ensembles égaux
    ET bien formés. frozen_features None OU VIDE (référence absente ou jeu à zéro
    règle) => checked False, passed False : une traçabilité non ancrée n'est pas
    prouvée (jamais un faux vert). Un `feature` vide (règle sans identité) ou un
    doublon (masque une suppression) rend l'ancre malformée => passed False.
    """
    if not frozen_features:  # None ou [] : pas d'ancre valide (zéro règle inclus)
        return {"passed": False, "checked": False, "ajoutees": [], "supprimees": []}
    current = frozen_features_from_wiremap(wiremap)
    # Intégrité : le `feature` est l'identité d'une règle. Vide => règle sans identité ;
    # doublon => set() le collapse et masquerait une suppression. Malformé => pas un vert.
    malformed = (
        "" in current or "" in frozen_features
        or len(current) != len(set(current))
        or len(frozen_features) != len(set(frozen_features))
    )
    cur, frozen = set(current), set(frozen_features)
    ajoutees = sorted(cur - frozen)
    supprimees = sorted(frozen - cur)
    return {
        "passed": not (ajoutees or supprimees or malformed),
        "checked": True,
        "ajoutees": ajoutees,
        "supprimees": supprimees,
    }


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
    triage_perimes[], exception, triaged_survivors[]}. Un survivant (name,line) est justifié
    ssi une entrée de triage a la même clé ET une justification non vide. total==0 =>
    checked False, passed False.

    Doctrine P0.3 (ratifiée Pierre 2026-07-11) : le triage reste autorisé (le gate est
    FRANCHI) mais devient une EXCEPTION TRACÉE, pas une preuve d'équivalence. `exception`
    vaut True ssi le gate est franchi AVEC au moins un survivant trié (=> jamais un OK
    propre en aval : HumanGate obligatoire). 100% tués => exception False.

    Garde-fou (name,line non unique) : `name` est la RÈGLE de mutation (ex. 'ge->gt') et
    `line` sans colonne — deux mutants sur la même ligne partagent la clé. Une clé partagée
    par plusieurs survivants n'est PAS triable par (name,line) (un triage masquerait un vrai
    bug) : ces survivants restent non justifiés (marqués « ambigu »). Fix amont = index
    d'occurrence dans mutation.generate_mutants (hors périmètre axe 3).
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
    counts = Counter((s.get("name"), s.get("line")) for s in survivors)
    ambigus = {k for k, c in counts.items() if c > 1}   # clé partagée => non triable
    non_tries: set[str] = set()
    for s in survivors:
        key = (s.get("name"), s.get("line"))
        if key in justified and key not in ambigus:
            continue
        label = f"{s.get('name')}@L{s.get('line')}"
        if key in ambigus:
            label += " (ambigu: plusieurs mutants même (name,line) — triage impossible)"
        non_tries.add(label)
    triage_perimes = sorted(
        f"{t.get('name')}@L{t.get('line')}"
        for t in triage
        if (t.get("name"), t.get("line")) not in set(counts)
    )
    passed = not non_tries
    # Exception de triage : gate franchi ALORS QUE des mutants ont survécu (tous
    # triés). Ce n'est jamais un OK propre — la couche verdict impose HumanGate.
    triaged = sorted(f"{s.get('name')}@L{s.get('line')}" for s in survivors) if (passed and survivors) else []
    return {
        "passed": passed,
        "checked": True,
        "survivants_non_tries": sorted(non_tries),
        "triage_perimes": triage_perimes,
        "exception": bool(triaged),
        "triaged_survivors": triaged,
    }


# --- oracle CHARTER (R7, FORGE_V2_CONSOLIDATION.md §4-A) --------------------------
# Le contrat s0-contrat EXIGE en prose que charter.yaml porte 4 champs originaux
# (objectif, hors_scope[], criteres_succes[], actions_interdites[]) PLUS 3 champs de
# design-intent (plateforme_cible, reference_jeu, criteres_demo[] — R7) sans aucun
# « à définir » résiduel, mais rien ne le vérifiait MÉCANIQUEMENT : appelé par
# l'orchestrateur à s0 (comme le validateur ad-hoc du run card_engine).
_CHARTER_STRING_FIELDS = ("objectif", "plateforme_cible", "reference_jeu")
_CHARTER_LIST_FIELDS = ("hors_scope", "criteres_succes", "actions_interdites", "criteres_demo")
_TODO_PLACEHOLDER = "a definir"


def _normalize_accents_casse(value: str) -> str:
    """Neutralise accents ET casse (« À Définir » / « a definir » -> même forme)."""
    decomposed = unicodedata.normalize("NFKD", value)
    ascii_only = "".join(c for c in decomposed if not unicodedata.combining(c))
    return ascii_only.lower()


def _is_todo_placeholder(value: str) -> bool:
    return _TODO_PLACEHOLDER in _normalize_accents_casse(value)


def check_charter(charter: dict) -> dict:
    """charter.yaml porte-t-il TOUS ses champs obligatoires, remplis, sans « à
    définir » résiduel — design-intent (R7) inclus ?

    Retourne {passed, raisons[]}. Jamais d'exception sur entrée malformée (charter
    n'est pas un mapping, champ d'un type inattendu...) — FAIL honnête avec raison
    explicite, même doctrine que check_architecture sur un blueprint malformé.

    Champs requis :
    - chaînes non vides : objectif, plateforme_cible, reference_jeu
    - listes NON VIDES de chaînes non vides : hors_scope, criteres_succes,
      actions_interdites, criteres_demo (le design-intent R7)

    « à définir » est détecté insensible aux accents ET à la casse (« À Définir »,
    « a definir »... tous rejetés) dans N'IMPORTE QUELLE valeur (scalaire ou item de
    liste). N'évalue AUCUNE provenance (qui a choisi reference_jeu, Pierre ou
    l'agent) — c'est un fait de gate humain, pas de schéma ; cette limite est
    assumée, pas cachée (cf. gardeFou du contrat s0-contrat : une provenance
    absente/douteuse remonte en fog HumanGate, pas un rejet mécanique de ce
    validateur).
    """
    if not isinstance(charter, dict):
        return {"passed": False,
                "raisons": [f"charter n'est pas un mapping (reçu {type(charter).__name__})"]}

    raisons: list[str] = []

    for field in _CHARTER_STRING_FIELDS:
        value = charter.get(field)
        if not isinstance(value, str) or not value.strip():
            raisons.append(f"'{field}' absent ou vide")
        elif _is_todo_placeholder(value):
            raisons.append(f"'{field}' contient un « à définir » résiduel : {value!r}")

    for field in _CHARTER_LIST_FIELDS:
        value = charter.get(field)
        if not isinstance(value, list) or not value:
            raisons.append(f"'{field}' absent ou vide (liste non vide attendue)")
            continue
        for i, item in enumerate(value):
            if not isinstance(item, str) or not item.strip():
                raisons.append(f"'{field}[{i}]' absent ou vide")
            elif _is_todo_placeholder(item):
                raisons.append(f"'{field}[{i}]' contient un « à définir » résiduel : {item!r}")

    return {"passed": not raisons, "raisons": raisons}
