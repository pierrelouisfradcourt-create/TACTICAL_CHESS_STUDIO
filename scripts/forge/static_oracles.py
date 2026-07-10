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
import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)

# Extensions source couvertes (les stacks du studio).
SOURCE_EXTS = {".py", ".rs", ".ts", ".tsx", ".js", ".jsx", ".gd"}
_TS_EXTS = {".ts", ".tsx", ".js", ".jsx"}

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
_TS_FUNC = re.compile(r"\bfunction\s+(\w+)")
_TS_ASSIGN = re.compile(r"\b(?:const|let|var)\s+(\w+)\s*=")
_TS_CLASS = re.compile(r"\bclass\s+(\w+)")

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
        for spec in _TS_FROM.findall(text) + _TS_REQUIRE.findall(text) + _TS_IMPORT_BARE.findall(text):
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
        return set(_TS_FUNC.findall(text)) | set(_TS_ASSIGN.findall(text)) | set(_TS_CLASS.findall(text))

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
