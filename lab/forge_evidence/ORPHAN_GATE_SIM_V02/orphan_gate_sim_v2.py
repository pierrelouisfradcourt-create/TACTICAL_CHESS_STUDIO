"""
ORPHAN-GATE SIM V0.2 -- prototype de detecteur "artefact sans consommateur", AMELIORE.
PROTOTYPE JETABLE. Ne modifie rien dans scripts/forge, scripts/observer, .claude/hooks, games/, tests/.
Ne modifie PAS ORPHAN_GATE_SIM_V01 (reste la baseline de comparaison).
Ecrit uniquement dans lab/forge_evidence/ORPHAN_GATE_SIM_V02/.

Corrections vs V01 (mesure : lab/forge_evidence/ORPHAN_GATE_SIM_V01/RAPPORT.md) :
  1. Resolution QUALIFIEE des consommateurs (fini la recherche par nom nu).
  2. Exclusions EXPLICITES et comptees (dunders, handlers de framework, fixtures/mocks/migration).
  3. Detection d'auto-declaration NOT_WIRED en prose (docstring/commentaire), SANS creer de registre.

Usage:
    python orphan_gate_sim_v2.py commit <sha>          -> rejoue un commit donne (diff)
    python orphan_gate_sim_v2.py sweep_worktree         -> balayage etat disque actuel (working tree)
    python orphan_gate_sim_v2.py sweep_head             -> balayage etat HEAD (git show, pas le disque)

Sortie: JSON sur stdout (liste de dicts ORPHAN_CHECK_V2) + le detail des exclusions.
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
# Classification derivee du chemin (INCHANGE vs V01 -- corrections 1/2/3 ne
# touchent pas cette regle, hors-scope de la commande)
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
# CORRECTION 2 -- exclusions explicites, visibles, comptees
# ---------------------------------------------------------------------------
FRAMEWORK_HANDLER_NAMES = {
    "do_GET", "do_POST", "do_PUT", "do_DELETE", "do_PATCH", "do_HEAD", "do_OPTIONS",
    "log_message", "log_request", "log_error",
    "setUp", "tearDown", "setUpClass", "tearDownClass", "setUpModule", "tearDownModule",
    "run", "main",  # note: 'run'/'main' NE sont PAS ici exclus par nom seul -- volontairement absents,
    # cf. rapport section "ce qui n'est PAS exclu" -- un vrai run()/main() orphelin doit rester visible.
}
FRAMEWORK_HANDLER_NAMES.discard("run")
FRAMEWORK_HANDLER_NAMES.discard("main")

PYTEST_HOOK_RE = re.compile(r"^pytest_[a-zA-Z_]+$")

MOCK_NAME_RE = re.compile(r"^(Mock|Fake|Stub|mock_|fake_|stub_)", re.I)

TEST_SUPPORT_PATH_RE = re.compile(
    r"(_fixtures\.(py|mjs|js)$|test_support|conftest\.py$|fixtures\.mjs$|/fixtures/|^fixtures/)",
    re.I,
)

MIGRATION_PATH_RE = re.compile(r"(/|^)migrat(e|ion)s?(/|_|\.)", re.I)


def classify_exclusion(name: str, filepath: str, is_dunder_capable: bool, decorators: list[str]) -> str | None:
    """Returns an exclusion category name, or None if not excluded.
    Every category here is auditable: it appears in the report with its own count.
    This function NEVER silently drops a symbol from the tally -- callers must log it
    under its category even when excluded from would_block.
    """
    p = filepath.replace("\\", "/")

    # 1. Python dunders
    if is_dunder_capable and name.startswith("__") and name.endswith("__") and len(name) > 4:
        return "python_dunder"

    # 2. Framework handlers / lifecycle hooks (BaseHTTPRequestHandler, unittest, pytest hooks)
    if name in FRAMEWORK_HANDLER_NAMES:
        return "framework_handler"
    if PYTEST_HOOK_RE.match(name):
        return "framework_handler"

    # 3. Decorator-based fixtures / routes (best effort: decorator name contains 'fixture' or a route verb)
    for d in decorators:
        dl = d.lower()
        if "fixture" in dl:
            return "pytest_fixture_decorator"
        if any(v in dl for v in (".route", ".get(", ".post(", ".put(", ".delete(", "app.errorhandler")):
            return "framework_route_decorator"

    # 4. Mocks / fakes / stubs
    if MOCK_NAME_RE.match(name):
        return "mock_or_fake"
    if "mock" in Path(p).name.lower():
        return "mock_support_file"

    # 5. Test-support paths (fixtures modules, conftest, test_support)
    if TEST_SUPPORT_PATH_RE.search(p):
        return "test_support_path"

    # 6. Migration tooling
    if MIGRATION_PATH_RE.search(p):
        return "migration_tool"

    return None


# ---------------------------------------------------------------------------
# git plumbing
# ---------------------------------------------------------------------------
def sh(args, cwd=REPO):
    r = subprocess.run(args, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.stdout


def git_diff_added_lines(rev_range):
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
                cur_line = int(m.group(1))
        elif line.startswith("+") and not line.startswith("+++"):
            if cur_file is not None and cur_line is not None:
                added[cur_file].add(cur_line)
                cur_line += 1
        elif line.startswith("-") and not line.startswith("---"):
            pass
    return added


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


def git_ls_tree_head(roots):
    """List files tracked at HEAD under given roots (no working-tree read)."""
    out = sh(["git", "ls-tree", "-r", "--name-only", "HEAD"] + list(roots))
    return [l.strip() for l in out.splitlines() if l.strip()]


# ---------------------------------------------------------------------------
# Python: symbol extraction + docstring/decorator capture
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


def _decorator_names(node):
    out = []
    for d in getattr(node, "decorator_list", []):
        try:
            out.append(ast.unparse(d))
        except Exception:
            out.append("<decorator>")
    return out


def python_top_level_defs(tree, src_lines):
    """Module-level functions/classes AND class-level methods. Captures docstring
    (function's own) + decorator source text, needed for exclusion classification
    and NOT_WIRED prose detection."""
    defs = []

    def walk(body, in_class, class_name):
        for node in body:
            if isinstance(node, ast.ClassDef):
                doc = ast.get_docstring(node) or ""
                defs.append({
                    "name": node.name, "line": node.lineno, "kind": "class",
                    "docstring": doc, "decorators": _decorator_names(node), "class_name": None,
                })
                walk(node.body, in_class=True, class_name=node.name)
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                kind = "method" if in_class else "function"
                doc = ast.get_docstring(node) or ""
                defs.append({
                    "name": node.name, "line": node.lineno, "kind": kind,
                    "docstring": doc, "decorators": _decorator_names(node),
                    "class_name": class_name if in_class else None,
                })
    walk(tree.body, in_class=False, class_name=None)
    return defs


def _annotation_type_name(annotation):
    """Best-effort base type name out of a parameter annotation node: `Foo` -> 'Foo',
    `mod.Foo` -> 'Foo', `Optional[Foo]`/`list[Foo]` -> 'Foo' (first name found), else None."""
    if annotation is None:
        return None
    if isinstance(annotation, ast.Name):
        return annotation.id
    if isinstance(annotation, ast.Attribute):
        return annotation.attr
    if isinstance(annotation, ast.Subscript):
        return _annotation_type_name(annotation.slice)
    if isinstance(annotation, ast.Tuple) and annotation.elts:
        return _annotation_type_name(annotation.elts[0])
    return None


def collect_typed_params(tree):
    """HEURISTIC (not real type inference, documented as such in RAPPORT.md):
    {param_name: set(type_name)} unioned across every function signature in the file.
    File-wide, not per-scope -- a parameter name reused for a different type elsewhere
    in the same file would over-match; accepted risk, given this repo's convention of
    consistent, descriptive parameter names (`ctx: ObserverContext` everywhere, never
    `ctx: SomethingElse`), and given CLAUDE.md's own rule (python-ml.md) requiring type
    hints on public functions -- this repo's own convention is what makes the heuristic
    viable here specifically."""
    typed = {}
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            args = list(node.args.args) + list(node.args.posonlyargs) + list(node.args.kwonlyargs)
            for a in args:
                tname = _annotation_type_name(a.annotation)
                if tname:
                    typed.setdefault(a.arg, set()).add(tname)
    return typed


def leading_comment_block(src_lines, def_lineno, max_lines=6):
    """Grab up to max_lines of '#'-comment immediately above the def line (1-indexed)."""
    out = []
    i = def_lineno - 2  # line before 'def' line, 0-indexed
    # skip decorator lines directly above (they start with '@')
    while i >= 0 and src_lines[i].strip().startswith("@"):
        i -= 1
    count = 0
    while i >= 0 and count < max_lines:
        line = src_lines[i].strip()
        if line.startswith("#"):
            out.insert(0, line.lstrip("#").strip())
            i -= 1
            count += 1
        else:
            break
    return "\n".join(out)


# ---------------------------------------------------------------------------
# Python: import graph (CORRECTION 1)
# ---------------------------------------------------------------------------
def module_dotted_candidates(relpath):
    """For a .py file's repo-relative path, return the set of dotted module strings
    a real import could plausibly use in this repo, given the observed pattern
    (scripts/forge/driver.py does `from forge.audit import ...`, i.e. scripts/ is on
    sys.path and the package root is 'forge'). We generate ALL dot-joined suffixes
    of the path so any of scripts.forge.audit / forge.audit / audit resolve."""
    p = relpath.replace("\\", "/")
    if p.endswith(".py"):
        p = p[:-3]
    parts = p.split("/")
    if parts and parts[-1] == "__init__":
        parts = parts[:-1]
    candidates = set()
    for i in range(len(parts)):
        candidates.add(".".join(parts[i:]))
    return candidates


def parse_python_imports(tree, relpath):
    """Return:
      name_bindings: {local_name: set(dotted_module_candidates)}   -- 'import X [as Y]'
      from_bindings: {local_name: (set(dotted_module_candidates), orig_symbol)} -- 'from X import Y [as Z]'
      star_modules: set(dotted_module_candidates)                  -- 'from X import *'
    Relative imports (level>0) are resolved against the importing file's own package path.
    """
    name_bindings = {}
    from_bindings = {}
    star_modules = set()

    pkg_parts = relpath.replace("\\", "/")
    if pkg_parts.endswith(".py"):
        pkg_parts = pkg_parts[:-3]
    pkg_parts = pkg_parts.split("/")[:-1]  # containing directory parts

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                dotted = alias.name
                local = alias.asname or dotted.split(".")[0]
                cands = set()
                pparts = dotted.split(".")
                for i in range(len(pparts)):
                    cands.add(".".join(pparts[i:]))
                name_bindings.setdefault(local, set()).update(cands)
        elif isinstance(node, ast.ImportFrom):
            if node.level and node.level > 0:
                # relative import: resolve against this file's own directory
                up = node.level - 1
                base = pkg_parts[: len(pkg_parts) - up] if up <= len(pkg_parts) else []
                mod_root = ".".join(base + ([node.module] if node.module else []))
            else:
                mod_root = node.module or ""
            mparts = mod_root.split(".") if mod_root else []
            mod_cands = set()
            for i in range(len(mparts)):
                mod_cands.add(".".join(mparts[i:]))
            if mod_root:
                mod_cands.add(mod_root)
            for alias in node.names:
                if alias.name == "*":
                    star_modules.update(mod_cands)
                    continue
                local = alias.asname or alias.name
                from_bindings.setdefault(local, (set(), alias.name))
                from_bindings[local][0].update(mod_cands)
                # `from pkg import submod` ALSO binds `submod` (or its alias) as a
                # reference to the submodule object itself when submod is a module of
                # pkg, not a symbol inside it (e.g. `from observer.adapters import
                # forge_run` then `forge_run.collect(...)`). We cannot cheaply tell
                # apart "symbol" vs "submodule" at parse time, so we register BOTH
                # interpretations; module-attribute matching still requires the
                # specific attribute name to match, so this does not by itself create
                # false consumer matches -- verified manually (observer/fleet.py case).
                if mod_root:
                    submod_dotted = f"{mod_root}.{alias.name}"
                    submod_parts = submod_dotted.split(".")
                    submod_cands = {".".join(submod_parts[i:]) for i in range(len(submod_parts))}
                    name_bindings.setdefault(local, set()).update(submod_cands)
    return name_bindings, from_bindings, star_modules


# ---------------------------------------------------------------------------
# .mjs: symbol extraction + import graph (CORRECTION 1)
# ---------------------------------------------------------------------------
MJS_EXPORT_FN_RE = re.compile(r"^\s*export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(", re.M)
MJS_EXPORT_CONST_RE = re.compile(r"^\s*export\s+const\s+([A-Za-z0-9_$]+)\s*=", re.M)
MJS_IMPORT_NAMED_RE = re.compile(
    r"import\s*\{([^}]*)\}\s*from\s*['\"](\.[^'\"]+)['\"]"
)
MJS_IMPORT_STAR_RE = re.compile(
    r"import\s*\*\s*as\s+([A-Za-z0-9_$]+)\s*from\s*['\"](\.[^'\"]+)['\"]"
)
MJS_IMPORT_DEFAULT_RE = re.compile(
    r"import\s+([A-Za-z0-9_$]+)\s*from\s*['\"](\.[^'\"]+)['\"]"
)


def mjs_top_level_defs(text):
    defs = []
    lines = text.splitlines()
    for m in MJS_EXPORT_FN_RE.finditer(text):
        line = text.count("\n", 0, m.start()) + 1
        header = "\n".join(l.strip().lstrip("/*").strip() for l in lines[max(0, line - 6):line - 1] if l.strip().startswith(("//", "*", "/*")))
        defs.append({"name": m.group(1), "line": line, "kind": "function", "docstring": header, "decorators": []})
    for m in MJS_EXPORT_CONST_RE.finditer(text):
        line = text.count("\n", 0, m.start()) + 1
        header = "\n".join(l.strip().lstrip("/*").strip() for l in lines[max(0, line - 6):line - 1] if l.strip().startswith(("//", "*", "/*")))
        defs.append({"name": m.group(1), "line": line, "kind": "const", "docstring": header, "decorators": []})
    return defs


def resolve_mjs_relative(importer_relpath, rel_import):
    base = (REPO / importer_relpath).parent
    target = (base / rel_import).resolve()
    if target.suffix != ".mjs":
        cand = target.with_suffix(".mjs")
        if cand.exists():
            target = cand
    try:
        return str(target.relative_to(REPO)).replace("\\", "/")
    except ValueError:
        return None


def parse_mjs_imports(text, importer_relpath):
    """Return list of {kind: 'named'|'star'|'default', local, orig, resolved_file}."""
    out = []
    for m in MJS_IMPORT_NAMED_RE.finditer(text):
        names_blob, rel = m.group(1), m.group(2)
        resolved = resolve_mjs_relative(importer_relpath, rel)
        for part in names_blob.split(","):
            part = part.strip()
            if not part:
                continue
            if " as " in part:
                orig, local = [x.strip() for x in part.split(" as ", 1)]
            else:
                orig = local = part
            out.append({"kind": "named", "local": local, "orig": orig, "resolved_file": resolved})
    for m in MJS_IMPORT_STAR_RE.finditer(text):
        local, rel = m.group(1), m.group(2)
        resolved = resolve_mjs_relative(importer_relpath, rel)
        out.append({"kind": "star", "local": local, "orig": None, "resolved_file": resolved})
    for m in MJS_IMPORT_DEFAULT_RE.finditer(text):
        local, rel = m.group(1), m.group(2)
        resolved = resolve_mjs_relative(importer_relpath, rel)
        out.append({"kind": "default", "local": local, "orig": "default", "resolved_file": resolved})
    return out


def strip_js_comment(line):
    idx = line.find("//")
    if idx == -1:
        return line
    before = line[:idx]
    if before.count('"') % 2 == 0 and before.count("'") % 2 == 0 and before.count("`") % 2 == 0:
        return before
    return line


def mjs_identifier_lines(text):
    """{identifier: set(line numbers)} for all bare identifier occurrences outside comments."""
    ident_re = re.compile(r"[A-Za-z_$][A-Za-z0-9_$]*")
    idx = {}
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
            idx.setdefault(m.group(0), set()).add(i)
    return idx


def mjs_attribute_lines(text, attr_name):
    """Lines where `<something>.<attr_name>` appears (namespace-import usage detector)."""
    pattern = re.compile(r"([A-Za-z_$][A-Za-z0-9_$]*)\s*\.\s*" + re.escape(attr_name) + r"\b")
    hits = {}
    for i, raw in enumerate(text.splitlines(), start=1):
        code = strip_js_comment(raw)
        for m in pattern.finditer(code):
            hits.setdefault(m.group(1), set()).add(i)
    return hits


# ---------------------------------------------------------------------------
# Production file roots (unchanged vs V01)
# ---------------------------------------------------------------------------
SKIP_DIRS = {".git", "node_modules", ".venv312", ".venv", "target", "__pycache__",
             ".playwright-mcp", "worktrees", "site-packages", "dist", "build"}

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


# ---------------------------------------------------------------------------
# CORRECTION 1 -- qualified consumer search, built once as a cache
# ---------------------------------------------------------------------------
_PY_FILES_CACHE = None   # {relpath: (tree, text, name_bindings, from_bindings, star_modules)}
_MJS_FILES_CACHE = None  # {relpath: (text, imports, ident_lines)}


def _build_caches():
    global _PY_FILES_CACHE, _MJS_FILES_CACHE
    if _PY_FILES_CACHE is not None:
        return
    _PY_FILES_CACHE = {}
    for py_path in iter_production_files({".py"}):
        rel = str(py_path.relative_to(REPO)).replace("\\", "/")
        if is_test_path(rel) or is_doc_path(rel):
            continue
        try:
            src = py_path.read_text(encoding="utf-8", errors="replace")
            tree = ast.parse(src, filename=rel)
        except (SyntaxError, UnicodeDecodeError):
            continue
        name_bindings, from_bindings, star_modules = parse_python_imports(tree, rel)
        main_ranges = python_main_block_ranges(tree)
        typed_params = collect_typed_params(tree)

        # single ast.walk per file: build name-load index + attribute index (with base name)
        def_names_at_line = {}
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                def_names_at_line[node.lineno] = node.name

        name_load_index = {}   # {name: [linenos]}
        attr_index = {}        # {attr: [(base_name_or_None, lineno)]}
        main_guard_calls = set()  # names invoked as bare Call(func=Name) INSIDE the __main__ guard
        for node in ast.walk(tree):
            lineno = getattr(node, "lineno", None)
            if lineno is None:
                continue
            if _in_main(main_ranges, lineno):
                if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                    main_guard_calls.add(node.func.id)
                continue
            if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
                if def_names_at_line.get(lineno) == node.id:
                    continue
                name_load_index.setdefault(node.id, []).append(lineno)
            elif isinstance(node, ast.Attribute):
                if def_names_at_line.get(lineno) == node.attr:
                    continue
                base = node.value.id if isinstance(node.value, ast.Name) else None
                attr_index.setdefault(node.attr, []).append((base, lineno))

        _PY_FILES_CACHE[rel] = {
            "name_bindings": name_bindings,
            "from_bindings": from_bindings, "star_modules": star_modules,
            "main_ranges": main_ranges,
            "name_load_index": name_load_index, "attr_index": attr_index,
            "main_guard_calls": main_guard_calls, "typed_params": typed_params,
        }

    _MJS_FILES_CACHE = {}
    for mjs_path in iter_production_files({".mjs"}):
        rel = str(mjs_path.relative_to(REPO)).replace("\\", "/")
        if is_test_path(rel) or is_doc_path(rel):
            continue
        try:
            text = mjs_path.read_text(encoding="utf-8", errors="replace")
        except UnicodeDecodeError:
            continue
        imports = parse_mjs_imports(text, rel)
        idents = mjs_identifier_lines(text)
        _MJS_FILES_CACHE[rel] = {"text": text, "imports": imports, "idents": idents}


def _in_main(main_ranges, lineno):
    return any(a <= lineno <= b for a, b in main_ranges)


def find_consumers_python(symbol_name, def_file, def_line, class_name=None):
    """Qualified search across all cached python files, using the per-file indices
    built once in _build_caches (O(1) dict lookups per file, not a fresh ast.walk
    per symbol -- V01's perf lesson re-learned: a per-symbol re-walk of ~1450 symbols
    over the whole production tree does not finish in reasonable time).
    For methods (class_name set), ALSO checks two class-qualified proof kinds:
      - class_static_attr: `ClassName.method(...)` where ClassName is imported from
        def_file's module (classmethod/staticmethod call pattern).
      - typed_instance_attr: `var.method(...)` where `var` is a parameter annotated
        `var: ClassName` somewhere in the calling file AND ClassName is imported from
        def_file's module. HEURISTIC, not real type inference (see collect_typed_params).
        This is the dominant real-world call pattern for instance methods and is the
        single biggest source of residual false positives when absent (measured: see
        RAPPORT.md, scripts/observer/sources.py::ObserverContext methods).
    Returns list of proof dicts: {file, line, kind: same_file|from_import|module_attr|
    star_import|class_static_attr|typed_instance_attr}"""
    _build_caches()
    def_cands = module_dotted_candidates(def_file)
    proofs = []

    for rel, info in _PY_FILES_CACHE.items():
        same_file = (rel == def_file)
        name_load_index = info["name_load_index"]
        attr_index = info["attr_index"]

        if same_file:
            for ln in name_load_index.get(symbol_name, ()):
                if ln == def_line:
                    continue
                proofs.append({"file": rel, "line": ln, "kind": "same_file"})
            for base, ln in attr_index.get(symbol_name, ()):
                if ln == def_line:
                    continue
                proofs.append({"file": rel, "line": ln, "kind": "same_file"})
            continue

        from_bindings = info["from_bindings"]
        name_bindings = info["name_bindings"]
        star_modules = info["star_modules"]

        qualifies_via_from = None
        for local, (mod_cands, orig_symbol) in from_bindings.items():
            if orig_symbol == symbol_name and (mod_cands & def_cands):
                qualifies_via_from = local
                break
        qualifies_via_module = None
        for local, mod_cands in name_bindings.items():
            if mod_cands & def_cands:
                qualifies_via_module = local
                break
        star_qualifies = bool(star_modules & def_cands)

        if class_name:
            class_local = None
            for local, (mod_cands, orig_symbol) in from_bindings.items():
                if orig_symbol == class_name and (mod_cands & def_cands):
                    class_local = local
                    break
            if class_local:
                for base, ln in attr_index.get(symbol_name, ()):
                    if base == class_local:
                        proofs.append({"file": rel, "line": ln, "kind": "class_static_attr", "via": class_local})
                typed_params = info.get("typed_params", {})
                typed_locals = {p for p, tnames in typed_params.items() if class_name in tnames}
                for base, ln in attr_index.get(symbol_name, ()):
                    if base in typed_locals:
                        proofs.append({"file": rel, "line": ln, "kind": "typed_instance_attr", "via": base})

        if qualifies_via_from:
            for ln in name_load_index.get(qualifies_via_from, ()):
                proofs.append({"file": rel, "line": ln, "kind": "from_import", "as": qualifies_via_from})
        if qualifies_via_module:
            for base, ln in attr_index.get(symbol_name, ()):
                if base == qualifies_via_module:
                    proofs.append({"file": rel, "line": ln, "kind": "module_attr", "via": qualifies_via_module})
        if star_qualifies:
            for ln in name_load_index.get(symbol_name, ()):
                proofs.append({"file": rel, "line": ln, "kind": "star_import"})
    return proofs


def find_consumers_mjs(symbol_name, def_file, def_line):
    _build_caches()
    proofs = []
    def_abs_matches = {def_file}
    for rel, info in _MJS_FILES_CACHE.items():
        same_file = (rel == def_file)
        text = info["text"]
        idents = info["idents"]
        if same_file:
            for ln in idents.get(symbol_name, ()):
                if ln == def_line:
                    continue
                proofs.append({"file": rel, "line": ln, "kind": "same_file"})
            continue
        for imp in info["imports"]:
            if imp["resolved_file"] not in def_abs_matches:
                continue
            if imp["kind"] == "named" and imp["orig"] == symbol_name:
                for ln in idents.get(imp["local"], ()):
                    proofs.append({"file": rel, "line": ln, "kind": "named_import", "as": imp["local"]})
            elif imp["kind"] == "default" and symbol_name == "default":
                for ln in idents.get(imp["local"], ()):
                    proofs.append({"file": rel, "line": ln, "kind": "default_import"})
            elif imp["kind"] == "star":
                attr_hits = mjs_attribute_lines(text, symbol_name)
                for ln in attr_hits.get(imp["local"], ()):
                    proofs.append({"file": rel, "line": ln, "kind": "star_namespace_attr", "via": imp["local"]})
    return proofs


# ---------------------------------------------------------------------------
# CORRECTION 3 -- NOT_WIRED prose self-declaration detection (no new registry)
# ---------------------------------------------------------------------------
NOT_WIRED_PHRASES = [
    "appele a la main", "appelee a la main", "appele manuellement",
    "jamais depuis un autre script", "jamais appele depuis",
    "advisory",
    "mesure, il ne juge pas", "mesure il ne juge pas",
    "propose-only", "propose only", "propose seulement",
    "pas encore branche", "pas encore cable", "non branche", "non cable",
    "not_wired", "not wired",
    "manual only", "called manually", "not yet called", "not yet wired",
    "pas encore consomme", "aucun consommateur",
]


def _normalize(s: str) -> str:
    s = s.lower()
    repl = {"é": "e", "è": "e", "ê": "e", "à": "a", "ô": "o", "î": "i", "ï": "i", "ç": "c", "û": "u", "ù": "u"}
    for a, b in repl.items():
        s = s.replace(a, b)
    return s


def detect_not_wired_prose(docstring: str, header_comment: str):
    blob = _normalize((docstring or "") + "\n" + (header_comment or ""))
    hits = []
    raw_combo = (docstring or "") + "\n" + (header_comment or "")
    for phrase in NOT_WIRED_PHRASES:
        if phrase in blob:
            # extract a verbatim snippet around the match from the raw (non-normalized) text
            norm_idx = blob.find(phrase)
            snippet = raw_combo[max(0, norm_idx - 20): norm_idx + len(phrase) + 40].strip().replace("\n", " ")
            hits.append({"phrase": phrase, "verbatim": snippet})
    return hits


# ---------------------------------------------------------------------------
# Driver: collect added symbols
# ---------------------------------------------------------------------------
def collect_added_symbols(file_added_lines: dict, whole_files: set, use_commit=None):
    symbols = []
    for relpath, added in file_added_lines.items():
        if relpath is None:
            continue
        if not (relpath.endswith(".py") or relpath.endswith(".mjs")):
            continue
        if is_test_path(relpath):
            continue
        whole = relpath in whole_files
        text = read_at_commit(use_commit, relpath) if use_commit else read_repo_file(relpath)
        if text is None:
            continue
        if relpath.endswith(".py"):
            try:
                tree = ast.parse(text, filename=relpath)
            except SyntaxError:
                continue
            lines = text.splitlines()
            for d in python_top_level_defs(tree, lines):
                if whole or d["line"] in added:
                    d2 = dict(d)
                    d2["file"] = relpath
                    d2["lang"] = "py"
                    d2["header_comment"] = leading_comment_block(lines, d["line"])
                    symbols.append(d2)
        else:
            for d in mjs_top_level_defs(text):
                if whole or d["line"] in added:
                    d2 = dict(d)
                    d2["file"] = relpath
                    d2["lang"] = "mjs"
                    d2["header_comment"] = d.get("docstring", "")
                    symbols.append(d2)
    return symbols


def collect_symbols_from_source(relpath, text):
    symbols = []
    if relpath.endswith(".py"):
        try:
            tree = ast.parse(text, filename=relpath)
        except SyntaxError:
            return []
        lines = text.splitlines()
        for d in python_top_level_defs(tree, lines):
            d2 = dict(d)
            d2["file"] = relpath
            d2["lang"] = "py"
            d2["header_comment"] = leading_comment_block(lines, d["line"])
            symbols.append(d2)
    elif relpath.endswith(".mjs"):
        for d in mjs_top_level_defs(text):
            d2 = dict(d)
            d2["file"] = relpath
            d2["lang"] = "mjs"
            d2["header_comment"] = d.get("docstring", "")
            symbols.append(d2)
    return symbols


# ---------------------------------------------------------------------------
# Orphan checks with exclusions + qualified resolution + NOT_WIRED prose
# ---------------------------------------------------------------------------
def is_cli_main_entrypoint(filepath, name, lang):
    """4th exclusion category, discovered EMPIRICALLY during manual verification of this
    run (not part of the original 4-category list, added transparently -- see RAPPORT.md):
    a function whose only self-invocation is a bare call inside its own file's
    `if __name__ == "__main__":` guard. That guard is Python's own dispatch mechanism
    (comparable to BaseHTTPRequestHandler's do_GET dispatch, already excluded as
    'framework_handler') -- the qualified-import fix (Correction 1) correctly stopped
    counting unrelated homonyms as consumers, which unmasked ~30 CLI entrypoints
    (mostly named `main`) as false 'orphans': they were never truly unconsumed, they were
    invoked by the interpreter's own script-execution convention, which Correction-1's
    'exclude the __main__ block from consumer evidence' rule (inherited from V01,
    correct for its original purpose: it stops a script's own `if __name__=='__main__':`
    smoke-test call from masking a genuinely unconsumed helper) does not credit as usage."""
    if lang != "py":
        return False
    _build_caches()
    info = _PY_FILES_CACHE.get(filepath)
    if not info:
        return False
    return name in info.get("main_guard_calls", ())


def run_orphan_checks_v2(symbols):
    results = []
    exclusion_counts = {}
    for sym in symbols:
        cls = classify_path(sym["file"])
        excl = classify_exclusion(sym["name"], sym["file"], sym["lang"] == "py", sym.get("decorators", []))
        if not excl and is_cli_main_entrypoint(sym["file"], sym["name"], sym["lang"]):
            excl = "cli_main_entrypoint"
        if excl:
            exclusion_counts[excl] = exclusion_counts.get(excl, 0) + 1
            results.append({
                "artifact": sym["name"], "file": f'{sym["file"]}:{sym["line"]}', "class": cls,
                "excluded": True, "exclusion_category": excl,
                "consumer_found": None, "consumers": [], "would_block": False,
            })
            continue

        if sym["lang"] == "py":
            proofs = find_consumers_python(sym["name"], sym["file"], sym["line"], sym.get("class_name"))
        else:
            proofs = find_consumers_mjs(sym["name"], sym["file"], sym["line"])
        consumer_found = len(proofs) > 0
        would_block = (cls == "OPERATIONAL") and (not consumer_found)

        not_wired_hits = []
        if would_block:
            not_wired_hits = detect_not_wired_prose(sym.get("docstring", ""), sym.get("header_comment", ""))

        results.append({
            "artifact": sym["name"], "file": f'{sym["file"]}:{sym["line"]}', "class": cls,
            "excluded": False, "exclusion_category": None,
            "consumer_found": consumer_found,
            "consumers": proofs[:10],
            "consumer_proof_kinds": sorted(set(p["kind"] for p in proofs)),
            "would_block": would_block,
            "not_wired_self_declared": bool(not_wired_hits),
            "not_wired_evidence": not_wired_hits[:3],
        })
    return results, exclusion_counts


# ---------------------------------------------------------------------------
# Entry points
# ---------------------------------------------------------------------------
def mode_commit(sha):
    added = git_diff_added_lines([f"{sha}^", sha])
    symbols = collect_added_symbols(added, set(), use_commit=sha)
    return run_orphan_checks_v2(symbols)


def mode_sweep_worktree():
    symbols = []
    for root in ["scripts/forge", "scripts/observer"]:
        for p in iter_repo_files({".py", ".mjs"}, roots=[REPO / root]):
            rel = str(p.relative_to(REPO)).replace("\\", "/")
            if is_test_path(rel):
                continue
            text = read_repo_file(rel)
            if text is None:
                continue
            symbols.extend(collect_symbols_from_source(rel, text))
    return run_orphan_checks_v2(symbols)


def mode_sweep_head():
    symbols = []
    files = git_ls_tree_head(["scripts/forge", "scripts/observer"])
    for rel in files:
        if not (rel.endswith(".py") or rel.endswith(".mjs")):
            continue
        if is_test_path(rel):
            continue
        text = read_at_commit("HEAD", rel)
        if text is None:
            continue
        symbols.extend(collect_symbols_from_source(rel, text))
    return run_orphan_checks_v2(symbols)


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "sweep_worktree"
    if mode == "commit":
        res, excl = mode_commit(sys.argv[2])
    elif mode == "sweep_worktree":
        res, excl = mode_sweep_worktree()
    elif mode == "sweep_head":
        res, excl = mode_sweep_head()
    else:
        print("unknown mode", mode, file=sys.stderr)
        sys.exit(1)
    print(json.dumps({"results": res, "exclusion_counts": excl}, indent=2, ensure_ascii=False))
    sys.exit(0)
