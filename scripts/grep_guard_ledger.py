#!/usr/bin/env python3
"""grep_guard_ledger.py — garde single-writer du ledger (IMP-205, suivi IMP-194).

Invariant gardé : **aucun fichier .py de l'arbre principal n'écrit
`IMPROVEMENT_LEDGER.yaml` en dehors de `governance/ledger_writer.guarded_write`**.

Pourquoi AST et pas grep (cf RED TEAM IMP-205) :
  - C1 — un grep mono-ligne est aveugle à l'idiome atomique du repo
    `tmp.write_text(...); os.replace(tmp, LEDGER)` : la primitive d'écriture vise `tmp`
    (aucune réf ledger sur la ligne) et la mutation réelle est `os.replace(..., LEDGER)`.
  - C2 — un grep « primitive d'écriture + réf ledger dans le même fichier » faux-positive
    `golden_collector.py` (LIT le ledger, ÉCRIT golden_examples.jsonl), `sync_memory.py`,
    `autopilot.py`, etc. Un garde qui échoue dès le 1er run sur du code propre est désactivé.

Détection (résout la CIBLE d'écriture, jamais les lectures) :
  1. Noms liés au ledger : toute affectation `X = <... "IMPROVEMENT_LEDGER.yaml" ...>`
     (Constant str contenant le nom, ou BinOp `/` Path avec un opérande littéral ledger).
  2. VIOLATION ssi la cible résolue d'une ÉCRITURE est le ledger :
     - `LEDGER.write_text(...)` / `.write_bytes(...)`
     - `open(LEDGER, "w"|"a"|"x"...)` / `LEDGER.open("w"...)`
     - `os.replace(_, LEDGER)` / `os.rename(_, LEDGER)` / `shutil.move|copy*(_, LEDGER)`
       / `tmp.replace(LEDGER)` (Path.replace : l'argument est la destination)
     - `yaml.dump(_, LEDGER...)` / `json.dump(_, LEDGER...)` (2e arg = stream cible)
  3. `guarded_write(...)` = route sanctionnée → jamais flaggé. Les LECTURES
     (`"r"`, `read_text`, `read_bytes`, `safe_load`) ne comptent jamais.

Allowlist : `governance/ledger_writer.py` (seul writer bas-niveau sanctionné).
Exclus du scan : `worktrees/`, fichiers de test (`test_*.py`, dossiers `*_tests`/`tests`),
ce garde lui-même, et les arbres non-source (`.venv*`, `.git`, `__pycache__`,
`node_modules`, `site-packages`, `build`, `dist`, `target`).

Limite connue (M4 RED TEAM) : `worktrees/` est exclu par design ; un merge de worktree
peut donc réintroduire un bypass que ce garde n'aura pas vu sur la branche worktree.
À relancer sur le résultat de merge.

Usage :
  python scripts/grep_guard_ledger.py            # scanne le repo, exit 1 si VIOLATION
  python scripts/grep_guard_ledger.py --root .    # racine explicite
  python scripts/grep_guard_ledger.py --json      # sortie machine

claim_verdict: NO_CLAIM_ALLOWED
"""
from __future__ import annotations

import argparse
import ast
import json
import sys
from pathlib import Path
from typing import NamedTuple

LEDGER_FILENAME = "IMPROVEMENT_LEDGER.yaml"

# Seul writer bas-niveau autorisé (chemins POSIX, relatifs au repo root).
ALLOWLIST = {"governance/ledger_writer.py"}

# Répertoires jamais scannés.
PRUNE_DIRS = {
    ".git", "__pycache__", "node_modules", "site-packages",
    "build", "dist", "target", ".mypy_cache", ".pytest_cache", ".ruff_cache",
    "worktrees",
}

WRITE_MODE_CHARS = set("wax+")  # un mode contenant l'un de ceux-ci écrit.
OS_WRITE_FLAGS = {"O_WRONLY", "O_RDWR", "O_APPEND", "O_CREAT", "O_TRUNC"}  # os.open bas niveau


class Violation(NamedTuple):
    path: str       # chemin POSIX relatif au root
    line: int
    primitive: str  # ex. "open(...,'w')", "os.replace(dst=ledger)"
    detail: str


# ── résolution « cette expression désigne-t-elle le ledger ? » ─────────────────

def _str_is_ledger(value: object) -> bool:
    return isinstance(value, str) and LEDGER_FILENAME in value


def _const_str(node: ast.AST) -> str | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return None


def _contains_ledger_literal(node: ast.AST) -> bool:
    """True si l'expression embarque un littéral chaîne contenant le nom du ledger,
    à n'importe quelle profondeur. Couvre `Path("…/IMPROVEMENT_LEDGER.yaml")`,
    `base / "IMPROVEMENT_LEDGER.yaml"`, ou le littéral nu. Le backup
    (`…_backup_*.yaml`) ne contient PAS la sous-chaîne `IMPROVEMENT_LEDGER.yaml`."""
    for sub in ast.walk(node):
        if isinstance(sub, ast.Constant) and _str_is_ledger(sub.value):
            return True
    return False


def _collect_ledger_names(tree: ast.AST) -> set[str]:
    """Noms (à n'importe quel scope) affectés à une expression contenant le chemin
    ledger littéral (ex. `LEDGER = Path(...) / "IMPROVEMENT_LEDGER.yaml"`)."""
    names: set[str] = set()
    for node in ast.walk(tree):
        if not isinstance(node, (ast.Assign, ast.AnnAssign)):
            continue
        value = node.value
        if value is None or not _contains_ledger_literal(value):
            continue
        targets = node.targets if isinstance(node, ast.Assign) else [node.target]
        for tgt in targets:
            if isinstance(tgt, ast.Name):
                names.add(tgt.id)
    return names


def _expr_is_ledger(node: ast.AST, ledger_names: set[str]) -> bool:
    """L'expression `node` désigne-t-elle le ledger (nom lié OU littéral embarqué) ?"""
    if isinstance(node, ast.Name) and node.id in ledger_names:
        return True
    return _contains_ledger_literal(node)


def _mode_is_write(node: ast.AST | None) -> bool:
    """Un argument mode (str) implique-t-il une écriture ?"""
    s = _const_str(node) if node is not None else None
    if s is None:
        return False
    return any(c in WRITE_MODE_CHARS for c in s)


def _os_flags_write(node: ast.AST | None) -> bool:
    """Les flags d'un os.open impliquent-ils une écriture ? (O_RDONLY seul = lecture → False)"""
    if node is None:
        return False
    for sub in ast.walk(node):
        if isinstance(sub, ast.Attribute) and sub.attr in OS_WRITE_FLAGS:
            return True
        if isinstance(sub, ast.Name) and sub.id in OS_WRITE_FLAGS:
            return True
    return False


def _attr_name(func: ast.AST) -> str | None:
    return func.attr if isinstance(func, ast.Attribute) else None


def _dotted(func: ast.AST) -> str:
    """Reconstitue un nom pointé approximatif (`os.replace`, `shutil.move`)."""
    if isinstance(func, ast.Attribute):
        base = _dotted(func.value)
        return f"{base}.{func.attr}" if base else func.attr
    if isinstance(func, ast.Name):
        return func.id
    return ""


# ── scan d'un fichier ──────────────────────────────────────────────────────────

def scan_file(path: Path, rel: str) -> list[Violation]:
    try:
        source = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return []
    try:
        tree = ast.parse(source, filename=str(path))
    except SyntaxError:
        return []  # fichier non parsable : ignoré (jamais un faux échec dur)

    ledger_names = _collect_ledger_names(tree)
    # Court-circuit : aucun nom ledger ET aucun littéral ledger → rien à flagger.
    if not ledger_names and LEDGER_FILENAME not in source:
        return []

    out: list[Violation] = []
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        func = node.func
        attr = _attr_name(func)
        dotted = _dotted(func)
        line = getattr(node, "lineno", 0)

        def _is_ledger(n):  # noqa: E306 — closure locale sur ledger_names
            return n is not None and _expr_is_ledger(n, ledger_names)

        # --- 1) fonctions-module dont la DESTINATION (2e arg) est le ledger.
        #     Traitées AVANT la branche méthode `.replace` car `os.replace` a aussi
        #     attr == "replace" (sinon os.replace serait pris pour un Path.replace).
        if dotted in {"os.replace", "os.rename", "shutil.move",
                      "shutil.copy", "shutil.copy2", "shutil.copyfile"}:
            dest = node.args[1] if len(node.args) > 1 else _kw(node, "dst")
            if _is_ledger(dest):
                out.append(Violation(rel, line, dotted + "(dst=ledger)",
                                     "remplacement/copie atomique ciblant le ledger"))
            continue
        # --- 1bis) os.open(ledger, flags-écriture) : bypass bas niveau (IMP-206).
        if dotted == "os.open":
            target = node.args[0] if node.args else None
            flags = node.args[1] if len(node.args) > 1 else None
            if _is_ledger(target) and _os_flags_write(flags):
                out.append(Violation(rel, line, "os.open(ledger,O_WRONLY)",
                                     "ouverture bas niveau en écriture du ledger"))
            continue
        if dotted in {"yaml.dump", "json.dump"}:
            stream = node.args[1] if len(node.args) > 1 else _kw(node, "stream")
            if _is_ledger(stream):
                out.append(Violation(rel, line, dotted + "(stream=ledger)",
                                     "dump direct dans le ledger"))
            continue

        # --- 2) builtin open(target, mode-écriture) ciblant le ledger.
        if isinstance(func, ast.Name) and func.id == "open":
            target = node.args[0] if node.args else None
            mode = node.args[1] if len(node.args) > 1 else _kw(node, "mode")
            if _is_ledger(target) and _mode_is_write(mode):
                out.append(Violation(rel, line, "open(ledger,'w')",
                                     "ouverture en écriture du ledger"))
            continue

        # --- 3) méthodes sur un récepteur ledger : X.write_text/.write_bytes/.open(w)
        if isinstance(func, ast.Attribute):
            if attr in {"write_text", "write_bytes"} and _is_ledger(func.value):
                out.append(Violation(rel, line, f".{attr}()",
                                     f"écriture directe du ledger via .{attr}()"))
                continue
            if attr == "open" and _is_ledger(func.value):
                mode = node.args[0] if node.args else _kw(node, "mode")
                if _mode_is_write(mode):
                    out.append(Violation(rel, line, "Path.open('w')",
                                         "ouverture en écriture du ledger"))
                continue
            # Path.replace(dest) : 1 seul argument positionnel = la destination
            # (distingue de str.replace(a, b) qui en a 2). Idiome atomique tmp.replace(LEDGER).
            if attr == "replace" and len(node.args) == 1 and _is_ledger(node.args[0]):
                out.append(Violation(rel, line, "Path.replace(ledger)",
                                     "remplacement atomique ciblant le ledger"))
                continue

    return out


def _kw(node: ast.Call, name: str) -> ast.AST | None:
    for kw in node.keywords:
        if kw.arg == name:
            return kw.value
    return None


# ── scan d'un arbre ──────────────────────────────────────────────────────────

def _is_test_path(rel: str) -> bool:
    parts = rel.split("/")
    if parts and parts[-1].startswith("test_"):
        return True
    return any(p == "tests" or p.endswith("_tests") for p in parts)


def scan(root: Path) -> list[Violation]:
    root = Path(root).resolve()
    guard_rel = "scripts/grep_guard_ledger.py"
    violations: list[Violation] = []
    for path in _iter_py(root):
        rel = path.relative_to(root).as_posix()
        if rel == guard_rel or rel in ALLOWLIST or _is_test_path(rel):
            continue
        violations.extend(scan_file(path, rel))
    violations.sort(key=lambda v: (v.path, v.line))
    return violations


def _iter_py(root: Path):
    for child in sorted(root.iterdir(), key=lambda p: p.name):
        name = child.name
        if child.is_dir():
            if name in PRUNE_DIRS or name.startswith(".venv") or name.endswith(".egg-info"):
                continue
            yield from _iter_py(child)
        elif child.suffix == ".py":
            yield child


# ── CLI ────────────────────────────────────────────────────────────────────────

def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Garde single-writer du ledger (IMP-205).")
    ap.add_argument("--root", default=None, help="Racine du repo (défaut: 2 niveaux au-dessus du script)")
    ap.add_argument("--json", action="store_true", help="Sortie JSON machine")
    args = ap.parse_args(argv)

    root = Path(args.root) if args.root else Path(__file__).resolve().parents[1]
    violations = scan(root)

    if args.json:
        print(json.dumps([v._asdict() for v in violations], ensure_ascii=False, indent=2))
    else:
        if not violations:
            print(f"[OK] grep-guard ledger : 0 bypass. Seul {sorted(ALLOWLIST)[0]} + guarded_write écrivent le ledger.")
        else:
            print(f"[X] grep-guard ledger : {len(violations)} bypass du single-writer detecte(s) :")
            for v in violations:
                print(f"  {v.path}:{v.line}  {v.primitive}  — {v.detail}")
            print("  -> Router via governance/ledger_writer.guarded_write (cf IMP-194/IMP-205).")
        print("claim_verdict: NO_CLAIM_ALLOWED")

    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
