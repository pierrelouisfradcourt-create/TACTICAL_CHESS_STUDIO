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
from collections import Counter
from pathlib import Path

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
_TS_METHOD = re.compile(r"^[ \t]*(?:public |private |protected |static |async |get |set |\*\s*)*([A-Za-z_$][\w$]*)\s*\([^;={]*\)\s*\{", re.M)
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
    forbidden = {(a, b) for a, b in blueprint.get("deps_interdites", [])}

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
    triage_perimes[]}. Un survivant (name,line) est justifié ssi une entrée de triage a la
    même clé ET une justification non vide. total==0 => checked False, passed False.

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
    return {
        "passed": not non_tries,
        "checked": True,
        "survivants_non_tries": sorted(non_tries),
        "triage_perimes": triage_perimes,
    }
