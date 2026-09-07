"""
ORPHAN-GATE SIM V0.1 -- prototype de detecteur "artefact sans consommateur".
PROTOTYPE JETABLE. Ne modifie rien dans scripts/forge, scripts/observer, .claude/hooks, games/, tests/.
Ecrit uniquement dans lab/forge_evidence/ORPHAN_GATE_SIM_V01/.

Usage:
    python orphan_gate_sim.py worktree   -> mesure 1 (diff HEAD + fichiers untracked pertinents)
    python orphan_gate_sim.py commit <sha> -> mesure 2 (diff d'un commit donne)
    python orphan_gate_sim.py sweep    -> mesure 3 (balayage etat actuel scripts/forge + scripts/observer)

Sortie: liste de dicts ORPHAN_CHECK sur stdout (JSON) + resume.
"""
from __future__ import annotations
import ast
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]


# ---------------------------------------------------------------------------
# Classification derivee du chemin (regle a EPROUVER, pas a faire confiance)
# ---------------------------------------------------------------------------
def classify_path(path: str) -> str:
    p = path.replace("\\", "/")
    if p.startswith("scripts/forge/") or p.startswith("scripts/observer/") or p.startswith(".claude/hooks/"):
        return "OPERATIONAL"
    if p.startswith("lab/forge_evidence/"):
        return "EXPERIMENT"
    if p.startswith("lab/reports/") or p.startswith("docs/") or p.endswith(".md"):
        return "OBSERVATION"
    return "OBSERVATION"


def is_test_path(path: str) -> bool:
    p = path.replace("\\", "/")
    name = Path(p).name
    if "/tests/" in p or p.startswith("tests/"):
        return True
    if name.startswith("test_") or name.endswith("_test.py"):
        return True
    if name.endswith(".test.mjs") or name.endswith(".test.js"):
        return True
    return False


def is_doc_path(path: str) -> bool:
    p = path.replace("\\", "/")
    return p.endswith(".md") or p.startswith("docs/") or "/docs/" in p


# ---------------------------------------------------------------------------
# git plumbing
# ---------------------------------------------------------------------------
def sh(args, cwd=REPO):
    r = subprocess.run(args, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.stdout


def git_diff_added_lines(rev_range):
    """Parse `git diff <rev_range>` -> {file: set(added_line_numbers)}"""
    out = sh(["git", "diff", "--unified=0"] + rev_range)
    added = {}
    cur_file = None
    cur_line = None
    for line in out.splitlines():
        if line.startswith("+++ "):
            fp = line[4:].strip()
            if fp == "/dev/null":
                cur_file = None
            else:
                cur_file = fp[2:] if fp.startswith("b/") else fp
            added.setdefault(cur_file, set())
        elif line.startswith("@@"):
            m = re.search(r"\+(\d+)(?:,(\d+))?", line)
            if m:
                start = int(m.group(1))
                cur_line = start
        elif line.startswith("+") and not line.startswith("+++"):
            if cur_file is not None and cur_line is not None:
                added[cur_file].add(cur_line)
                cur_line += 1
        elif line.startswith("-") and not line.startswith("---"):
            pass
    return added


def git_untracked_files():
    out = sh(["git", "status", "--porcelain"])
    files = []
    for line in out.splitlines():
        if line.startswith("?? "):
            fp = line[3:].strip()
            full = REPO / fp
            if full.is_dir():
                for sub in full.rglob("*"):
                    if sub.is_file():
                        files.append(str(sub.relative_to(REPO)).replace("\\", "/"))
            else:
                files.append(fp)
    return files


def read_repo_file(path):
    fp = REPO / path
    try:
        return fp.read_text(encoding="utf-8", errors="replace")
    except (FileNotFoundError, IsADirectoryError):
        return None


def read_at_commit(sha, path):
    out = subprocess.run(["git", "show", f"{sha}:{path}"], cwd=REPO, capture_output=True,
                          text=True, encoding="utf-8", errors="replace")
    if out.returncode != 0:
        return None
    return out.stdout


# ---------------------------------------------------------------------------
# Python symbol extraction (AST-based) + main-block detection
# ---------------------------------------------------------------------------
def python_main_block_ranges(tree):
    ranges = []
    for node in ast.walk(tree):
        if isinstance(node, ast.If):
            test = node.test
            is_main_test = False
            if isinstance(test, ast.Compare):
                left, right = test.left, test.comparators[0] if test.comparators else None
                names = []
                for side in (left, right):
                    if isinstance(side, ast.Name):
                        names.append(side.id)
                    if isinstance(side, ast.Constant):
                        names.append(side.value)
                if "__name__" in names and "__main__" in names:
                    is_main_test = True
            if is_main_test:
                end = getattr(node, "end_lineno", node.lineno)
                ranges.append((node.lineno, end))
    return ranges


def python_top_level_defs(tree):
    """Module-level functions/classes AND class-level methods (both count as 'symbole exporte'
    per the mission spec). Does NOT descend into function bodies (closures/local helpers are not artifacts)."""
    defs = []

    def walk(body, in_class):
        for node in body:
            if isinstance(node, ast.ClassDef):
                defs.append((node.name, node.lineno, "class"))
                walk(node.body, in_class=True)
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                kind = "method" if in_class else "function"
                defs.append((node.name, node.lineno, kind))
                # do not descend into function bodies: nested defs are local closures, not artifacts

    walk(tree.body, in_class=False)
    return defs


def python_all_usages(tree, symbol):
    """Return list of (lineno, kind) for Name/Attribute references to symbol, excluding def statements themselves."""
    hits = []
    main_ranges = python_main_block_ranges(tree)

    def in_main(lineno):
        return any(a <= lineno <= b for a, b in main_ranges)

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and node.name == symbol:
            continue  # the definition itself, not a usage
        if isinstance(node, ast.Name) and node.id == symbol and isinstance(node.ctx, ast.Load):
            if not in_main(node.lineno):
                hits.append(node.lineno)
        elif isinstance(node, ast.Attribute) and node.attr == symbol:
            if not in_main(node.lineno):
                hits.append(node.lineno)
    return hits


# ---------------------------------------------------------------------------
# .mjs symbol extraction (regex-based, best effort)
# ---------------------------------------------------------------------------
MJS_EXPORT_FN_RE = re.compile(r"^\s*export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(", re.M)
MJS_EXPORT_CONST_RE = re.compile(r"^\s*export\s+const\s+([A-Za-z0-9_$]+)\s*=", re.M)


def mjs_top_level_defs(text):
    defs = []
    for m in MJS_EXPORT_FN_RE.finditer(text):
        line = text.count("\n", 0, m.start()) + 1
        defs.append((m.group(1), line, "function"))
    for m in MJS_EXPORT_CONST_RE.finditer(text):
        line = text.count("\n", 0, m.start()) + 1
        defs.append((m.group(1), line, "const"))
    return defs


def strip_js_comment(line):
    # crude: drop from first // not inside a string (good enough for this repo's style)
    idx = line.find("//")
    if idx == -1:
        return line
    # avoid stripping inside strings containing '//', best-effort: only strip if not inside quotes before idx
    before = line[:idx]
    if before.count('"') % 2 == 0 and before.count("'") % 2 == 0 and before.count("`") % 2 == 0:
        return before
    return line


def mjs_all_usages(text, symbol, def_line):
    hits = []
    in_block_comment = False
    pattern = re.compile(r"\b" + re.escape(symbol) + r"\b")
    for i, raw in enumerate(text.splitlines(), start=1):
        line = raw
        if in_block_comment:
            end = line.find("*/")
            if end == -1:
                continue
            line = line[end + 2:]
            in_block_comment = False
        start_bc = line.find("/*")
        if start_bc != -1 and "*/" not in line[start_bc:]:
            line = line[:start_bc]
            in_block_comment = True
        code = strip_js_comment(line)
        if i == def_line:
            continue
        if pattern.search(code):
            hits.append(i)
    return hits


# ---------------------------------------------------------------------------
# Consumer search across the repo
# ---------------------------------------------------------------------------
SKIP_DIRS = {".git", "node_modules", ".venv312", ".venv", "target", "__pycache__",
             ".playwright-mcp", "worktrees", "site-packages", "dist", "build"}

# Production-code search roots: the actual studio codebase, never vendored envs.
CONSUMER_SEARCH_ROOTS = [
    "scripts", "lab", "ml", "studio_core", "tools", "studio", "governance",
    "memory_core", "document_work", "control_plane", "studio_v2_ux", "src",
    "llm-lego", "infra", "games", ".claude/hooks", "autopilot.py",
]


def iter_repo_files(exts, roots=None):
    roots = roots or [REPO]
    for root in roots:
        for p in root.rglob("*"):
            if any(part in SKIP_DIRS for part in p.parts):
                continue
            if p.is_file() and p.suffix in exts:
                yield p


def iter_production_files(exts):
    for rel in CONSUMER_SEARCH_ROOTS:
        root = REPO / rel
        if root.is_file():
            if root.suffix in exts:
                yield root
            continue
        if root.is_dir():
            yield from iter_repo_files(exts, roots=[root])


_PY_NAME_INDEX = None   # {symbol: set("rel:line")}
_MJS_NAME_INDEX = None  # {symbol: set("rel:line")}
_MJS_DEF_LINES = None   # {(rel, line)} export def lines, to exclude from own-index hit


def _build_caches():
    """Single pass over production files builds a name -> usage-sites index, so a lookup
    per candidate symbol is O(1) instead of re-walking every file per symbol (was the
    perf bottleneck on scripts/forge+scripts/observer's ~1450 symbols)."""
    global _PY_NAME_INDEX, _MJS_NAME_INDEX
    if _PY_NAME_INDEX is not None:
        return
    _PY_NAME_INDEX = {}
    for py_path in iter_production_files({".py"}):
        rel = str(py_path.relative_to(REPO)).replace("\\", "/")
        if is_test_path(rel) or is_doc_path(rel):
            continue
        try:
            src = py_path.read_text(encoding="utf-8", errors="replace")
            tree = ast.parse(src, filename=rel)
        except (SyntaxError, UnicodeDecodeError):
            continue
        main_ranges = python_main_block_ranges(tree)

        def in_main(lineno, _ranges=main_ranges):
            return any(a <= lineno <= b for a, b in _ranges)

        def_names_at_line = {}  # lineno -> name, so we can skip def-statement self-hits
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                def_names_at_line[node.lineno] = node.name

        for node in ast.walk(tree):
            name = None
            if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
                name = node.id
            elif isinstance(node, ast.Attribute):
                name = node.attr
            if name is None:
                continue
            if def_names_at_line.get(node.lineno) == name:
                continue  # the def statement itself, not a usage
            if in_main(node.lineno):
                continue
            _PY_NAME_INDEX.setdefault(name, set()).add(f"{rel}:{node.lineno}")

    _MJS_NAME_INDEX = {}
    ident_re = re.compile(r"[A-Za-z_$][A-Za-z0-9_$]*")
    for mjs_path in iter_production_files({".mjs"}):
        rel = str(mjs_path.relative_to(REPO)).replace("\\", "/")
        if is_test_path(rel) or is_doc_path(rel):
            continue
        try:
            text = mjs_path.read_text(encoding="utf-8", errors="replace")
        except UnicodeDecodeError:
            continue
        in_block_comment = False
        for i, raw in enumerate(text.splitlines(), start=1):
            line = raw
            if in_block_comment:
                end = line.find("*/")
                if end == -1:
                    continue
                line = line[end + 2:]
                in_block_comment = False
            start_bc = line.find("/*")
            if start_bc != -1 and "*/" not in line[start_bc:]:
                line = line[:start_bc]
                in_block_comment = True
            code = strip_js_comment(line)
            for m in ident_re.finditer(code):
                _MJS_NAME_INDEX.setdefault(m.group(0), set()).add(f"{rel}:{i}")


def find_consumers(symbol, def_file, def_line, def_class_kind):
    """Search production code (not tests, not docs) for usages of symbol, excluding the def line itself;
    same-file usages elsewhere (e.g. a sibling function calling it) DO count as consumers.
    KNOWN LIMITATION (measured, see RAPPORT.md Mesure 2): lookup is by BARE NAME, unqualified —
    a common name (main, run, check, build...) collides with unrelated definitions elsewhere and
    is reported as 'consumed' when it is not. This under-reports orphans (false negatives)."""
    _build_caches()
    consumers = set()
    for loc in _PY_NAME_INDEX.get(symbol, ()):
        rel, ln = loc.rsplit(":", 1)
        if rel == def_file and int(ln) == def_line:
            continue
        consumers.add(loc)
    for loc in _MJS_NAME_INDEX.get(symbol, ()):
        rel, ln = loc.rsplit(":", 1)
        if rel == def_file and int(ln) == def_line:
            continue
        consumers.add(loc)
    return sorted(consumers)


# ---------------------------------------------------------------------------
# Driver: collect added symbols for a set of files+added-line-sets
# ---------------------------------------------------------------------------
def collect_added_symbols(file_added_lines: dict, whole_files: set, use_commit=None):
    """file_added_lines: {relpath: set(added line numbers) or None meaning 'whole file'}"""
    symbols = []
    for relpath, added in file_added_lines.items():
        if relpath is None:
            continue
        if not (relpath.endswith(".py") or relpath.endswith(".mjs")):
            continue
        if is_test_path(relpath):
            continue  # test files are not "artifacts" under measure
        whole = relpath in whole_files
        text = read_at_commit(use_commit, relpath) if use_commit else read_repo_file(relpath)
        if text is None:
            continue
        if relpath.endswith(".py"):
            try:
                tree = ast.parse(text, filename=relpath)
            except SyntaxError:
                continue
            for name, lineno, kind in python_top_level_defs(tree):
                if whole or lineno in added:
                    symbols.append({"name": name, "file": relpath, "line": lineno, "kind": kind, "lang": "py"})
        else:
            for name, lineno, kind in mjs_top_level_defs(text):
                if whole or lineno in added:
                    symbols.append({"name": name, "file": relpath, "line": lineno, "kind": kind, "lang": "mjs"})
    return symbols


def run_orphan_checks(symbols):
    results = []
    for sym in symbols:
        cls = classify_path(sym["file"])
        consumers = find_consumers(sym["name"], sym["file"], sym["line"], sym["kind"])
        consumer_found = len(consumers) > 0
        would_block = (cls == "OPERATIONAL") and (not consumer_found)
        results.append({
            "artifact": sym["name"],
            "file": f'{sym["file"]}:{sym["line"]}',
            "class": cls,
            "consumer_found": consumer_found,
            "consumers": consumers,
            "would_block": would_block,
        })
    return results


# ---------------------------------------------------------------------------
# Entry points
# ---------------------------------------------------------------------------
def mode_worktree():
    added = git_diff_added_lines(["HEAD"])
    untracked = git_untracked_files()
    whole_files = set()
    for f in untracked:
        if f.endswith(".py") or f.endswith(".mjs"):
            added.setdefault(f, set())
            whole_files.add(f)
    symbols = collect_added_symbols(added, whole_files)
    return run_orphan_checks(symbols)


def mode_commit(sha):
    added = git_diff_added_lines([f"{sha}^", sha])
    symbols = collect_added_symbols(added, set(), use_commit=sha)
    return run_orphan_checks(symbols)


def mode_sweep():
    """Balayage etat ACTUEL de scripts/forge/** et scripts/observer/** (pas de diff)."""
    symbols = []
    for root in ["scripts/forge", "scripts/observer"]:
        for p in iter_repo_files({".py", ".mjs"}, roots=[REPO / root]):
            rel = str(p.relative_to(REPO)).replace("\\", "/")
            if is_test_path(rel):
                continue
            text = read_repo_file(rel)
            if text is None:
                continue
            if rel.endswith(".py"):
                try:
                    tree = ast.parse(text, filename=rel)
                except SyntaxError:
                    continue
                for name, lineno, kind in python_top_level_defs(tree):
                    symbols.append({"name": name, "file": rel, "line": lineno, "kind": kind, "lang": "py"})
            else:
                for name, lineno, kind in mjs_top_level_defs(text):
                    symbols.append({"name": name, "file": rel, "line": lineno, "kind": kind, "lang": "mjs"})
    return run_orphan_checks(symbols)


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "worktree"
    if mode == "worktree":
        res = mode_worktree()
    elif mode == "commit":
        res = mode_commit(sys.argv[2])
    elif mode == "sweep":
        res = mode_sweep()
    else:
        print("unknown mode", mode, file=sys.stderr)
        sys.exit(1)
    print(json.dumps(res, indent=2, ensure_ascii=False))
    sys.exit(0)
