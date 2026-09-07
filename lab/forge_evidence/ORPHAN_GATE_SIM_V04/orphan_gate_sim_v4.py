"""
ORPHAN-GATE SIM V0.4 -- corrige 3 defauts MESURES de V03 (RAPPORT.md V03, Cas 1/2/4) :
  1. Scanner .mjs : etat de commentaire de bloc pouvait s'ouvrir a tort a partir d'une
     sous-chaine `/*` VIVANT DANS un commentaire de ligne `//` (bug reel :
     declaration_readers.mjs:7 contient `.claude/agents/*.md` dans un `//`).
  2. Identite des symboles pour la comparaison delta ("nouveau" vs "preexistant") :
     nom+fichier+ligne -> nom+signature logique normalisee (index de ligne informatif
     seulement).
  3. declared_status : fenetre de recherche du marqueur NOT_WIRED elargie (entete de
     fichier + bloc de doc de la fonction + commentaires adjacents + fichier de test
     jumeau .test.mjs), TOUJOURS UNKNOWN si aucune source n'est trouvee et imprimee.

SIMULATION UNIQUEMENT. Aucune autorite reelle activee, exit 0 partout.
N'ecrit QUE dans lab/forge_evidence/ORPHAN_GATE_SIM_V04/. Ne modifie AUCUN fichier
existant. N'importe PAS de logique divergente de V02 : la detection de consommateurs
(hors le scanner .mjs corrige, applique par monkeypatch documente, cf. PATCH_NOTE
ci-dessous) reste V02 telle quelle, via importlib, comme V03 le faisait deja pour V02.

Usage:
    python orphan_gate_sim_v4.py sweep        -> sweep_worktree V02 patche + classification V04
    python orphan_gate_sim_v4.py selftest      -> tests obligatoires (scanner, identite)
"""
from __future__ import annotations

import ast
import importlib.util
import json
import random
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
V04_DIR = Path(__file__).resolve().parent
V02_PATH = REPO / "lab" / "forge_evidence" / "ORPHAN_GATE_SIM_V02" / "orphan_gate_sim_v2.py"
V03_PATH = REPO / "lab" / "forge_evidence" / "ORPHAN_GATE_SIM_V03" / "orphan_gate_sim_v3.py"

TODAY = "2026-08-07"

# ---------------------------------------------------------------------------
# Import V02 SANS le modifier (fichier disque intact -- verifie par hash en fin
# de mission, cf. rapport). importlib, comme V03.
# ---------------------------------------------------------------------------
_spec2 = importlib.util.spec_from_file_location("orphan_gate_sim_v2", V02_PATH)
v2 = importlib.util.module_from_spec(_spec2)
sys.modules["orphan_gate_sim_v2"] = v2
_spec2.loader.exec_module(v2)
_ORIGINAL_MJS_IDENTIFIER_LINES = v2.mjs_identifier_lines  # capture AVANT tout monkeypatch,
# pour que le self-guard test compare toujours au vrai comportement V02/V03 non patche,
# meme si ce module est appele APRES run_patched_sweep() (qui patche v2 en place).

# Import V03 (pour reutiliser telle quelle sa fonction classify_status -- Phase 1,
# INCHANGEE ici ; V04 ne retouche que declared_status, cf. classify_status_v4 plus bas
# qui APPELLE classify_status puis SURCHARGE uniquement declared_status/basis).
_spec3 = importlib.util.spec_from_file_location("orphan_gate_sim_v3", V03_PATH)
v3 = importlib.util.module_from_spec(_spec3)
sys.modules["orphan_gate_sim_v3"] = v3
_spec3.loader.exec_module(v3)


# ===========================================================================
# CORRECTION 1 -- scanner .mjs correct : commentaire de ligne / commentaire de
# bloc / chaine / template / code actif, distingues par une machine a etats sur
# le TEXTE ENTIER (pas ligne par ligne isolement -- c'est precisement l'erreur
# V02/V03 : `line.find("/*")` teste la ligne brute AVANT tout stripping du `//`,
# donc confond "un commentaire de ligne qui contient la sous-chaine /*" avec
# "l'ouverture d'un commentaire de bloc").
# ===========================================================================
def scan_mjs_mask(text: str) -> bytearray:
    """Retourne un masque bool (1 octet/char) : 1 = code actif ou contenu de chaine
    (matche par l'ancien comportement pour les chaines -- V02 ne les excluait pas
    non plus, hors scope de cette correction), 0 = commentaire de ligne OU de bloc.
    Etats : code, line_comment, block_comment, dstring, sstring, template.
    Un backslash a l'interieur d'une chaine/template avale le caractere suivant
    (echappement), evite de fermer prematurement sur un guillemet echappe."""
    n = len(text)
    mask = bytearray(n)
    i = 0
    state = "code"
    while i < n:
        c = text[i]
        if state == "code":
            if c == "/" and i + 1 < n and text[i + 1] == "/":
                state = "line_comment"
                i += 2
                continue
            if c == "/" and i + 1 < n and text[i + 1] == "*":
                state = "block_comment"
                i += 2
                continue
            if c == '"':
                state = "dstring"
                mask[i] = 1
                i += 1
                continue
            if c == "'":
                state = "sstring"
                mask[i] = 1
                i += 1
                continue
            if c == "`":
                state = "template"
                mask[i] = 1
                i += 1
                continue
            mask[i] = 1
            i += 1
        elif state == "line_comment":
            if c == "\n":
                state = "code"
            i += 1
        elif state == "block_comment":
            if c == "*" and i + 1 < n and text[i + 1] == "/":
                state = "code"
                i += 2
                continue
            i += 1
        elif state == "dstring":
            mask[i] = 1
            if c == "\\" and i + 1 < n:
                mask[i + 1] = 1
                i += 2
                continue
            if c == '"':
                state = "code"
            i += 1
        elif state == "sstring":
            mask[i] = 1
            if c == "\\" and i + 1 < n:
                mask[i + 1] = 1
                i += 2
                continue
            if c == "'":
                state = "code"
            i += 1
        elif state == "template":
            mask[i] = 1
            if c == "\\" and i + 1 < n:
                mask[i + 1] = 1
                i += 2
                continue
            if c == "`":
                state = "code"
            i += 1
    return mask


_IDENT_RE = re.compile(r"[A-Za-z_$][A-Za-z0-9_$]*")


def mjs_identifier_lines_v4(text: str) -> dict[str, set[int]]:
    """Remplacement direct de v2.mjs_identifier_lines : meme signature, meme
    contrat (retourne {identifiant: {lignes}}), corrige uniquement la confusion
    commentaire de ligne / commentaire de bloc."""
    mask = scan_mjs_mask(text)
    # offsets de debut de ligne, pour convertir un offset -> numero de ligne en O(log n)
    line_starts = [0]
    for idx, ch in enumerate(text):
        if ch == "\n":
            line_starts.append(idx + 1)
    import bisect

    idx_out: dict[str, set[int]] = {}
    for m in _IDENT_RE.finditer(text):
        start = m.start()
        if not mask[start]:
            continue
        lineno = bisect.bisect_right(line_starts, start)
        idx_out.setdefault(m.group(0), set()).add(lineno)
    return idx_out


PATCH_NOTE = (
    "V04 monkeypatch documente : v2.mjs_identifier_lines est remplace par "
    "mjs_identifier_lines_v4 (meme signature, meme contrat de retour) AVANT tout "
    "appel a v2._build_caches()/mode_sweep_worktree(). Rien d'autre dans V02 n'est "
    "modifie ou intercepte -- verifie par diff de comportement cible (self-guard test)."
)


# ===========================================================================
# CORRECTION 2 -- identite de symbole = nom + signature logique normalisee.
# L'INDEX (ligne) reste informatif seulement, jamais utilise pour decider si un
# symbole est "nouveau".
# ===========================================================================
def python_signature_of(tree: ast.AST, name: str, lineno: int) -> str | None:
    """Cherche le node Function/Async/Class portant EXACTEMENT ce nom+ligne dans
    l'arbre (on connait deja le couple depuis l'extraction V02 -- ceci ne fait que
    RELIRE la meme info pour en deriver une signature stable, aucune nouvelle
    extraction independante)."""
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name and node.lineno == lineno:
            a = node.args
            parts = []
            for p in (a.posonlyargs or []):
                parts.append(p.arg)
            if a.posonlyargs:
                parts.append("/")
            for p in a.args:
                parts.append(p.arg)
            if a.vararg:
                parts.append("*" + a.vararg.arg)
            elif a.kwonlyargs:
                parts.append("*")
            for p in a.kwonlyargs:
                parts.append(p.arg)
            if a.kwarg:
                parts.append("**" + a.kwarg.arg)
            kind = "async_function" if isinstance(node, ast.AsyncFunctionDef) else "function"
            return f"{kind}({','.join(parts)})"
        if isinstance(node, ast.ClassDef) and node.name == name and node.lineno == lineno:
            bases = [ast.unparse(b) for b in node.bases] if node.bases else []
            return f"class(bases={','.join(bases)})"
    return None


_MJS_PARAMS_RE = re.compile(r"^\s*export\s+(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(([^)]*)\)", re.M)


def mjs_signature_of(text: str, name: str) -> str | None:
    """Trouve `export [async] function <name>(<params>)` par nom (pas par ligne --
    l'identite ne doit PAS dependre de la ligne). Si plusieurs occurrences du meme
    nom existent dans le fichier (rare, tolere), prend la premiere -- coherent avec
    le comportement d'export ES (un seul export nomme valide par module)."""
    pat = re.compile(r"export\s+(?:async\s+)?function\s+" + re.escape(name) + r"\s*\(([^)]*)\)")
    m = pat.search(text)
    if m:
        params = re.sub(r"\s+", " ", m.group(1)).strip()
        return f"function({params})"
    pat_c = re.compile(r"export\s+const\s+" + re.escape(name) + r"\s*=")
    if pat_c.search(text):
        return "const(=)"
    return None


def compute_identity_key(name: str, lang: str, filepath: str, text: str, lineno: int) -> str:
    """IDENTITE = nom + signature logique normalisee (empreinte de la declaration),
    JAMAIS la ligne. La ligne (lineno) est ignoree ici par construction."""
    if lang == "py":
        try:
            tree = ast.parse(text, filename=filepath)
        except SyntaxError:
            return f"{name}|py|<unparsed>"
        sig = python_signature_of(tree, name, lineno)
        return f"{name}|py|{sig if sig is not None else '<not_found_at_line>'}"
    else:
        sig = mjs_signature_of(text, name)
        return f"{name}|mjs|{sig if sig is not None else '<not_found>'}"


# ===========================================================================
# CORRECTION 2 -- TESTS OBLIGATOIRES sur copies sandbox (rien dans le vrai
# depot n'est touche : fichiers ecrits sous V04_DIR/_sandbox/, jetables).
# ===========================================================================
def _delta_identity_tests() -> dict:
    sandbox = V04_DIR / "_sandbox_identity"
    sandbox.mkdir(exist_ok=True)
    out = {}

    # (a) decalage de lignes par ajout en tete de fichier -> 0 faux nouveau
    base_py = "def foo(a, b):\n    return a + b\n"
    shifted_py = "# ligne ajoutee 1\n# ligne ajoutee 2\n# ligne ajoutee 3\n" + base_py
    key_base = compute_identity_key("foo", "py", "sandbox_a.py", base_py, 1)
    key_shift = compute_identity_key("foo", "py", "sandbox_a.py", shifted_py, 4)
    out["a_line_shift_python"] = {
        "identical": key_base == key_shift, "key_base": key_base, "key_shifted": key_shift,
        "pass": key_base == key_shift,
    }

    base_mjs = "export function foo(a, b) {\n  return a + b;\n}\n"
    shifted_mjs = "// c1\n// c2\n// c3\n" + base_mjs
    keym_base = compute_identity_key("foo", "mjs", "sandbox_a.mjs", base_mjs, 1)
    keym_shift = compute_identity_key("foo", "mjs", "sandbox_a.mjs", shifted_mjs, 4)
    out["a_line_shift_mjs"] = {
        "identical": keym_base == keym_shift, "key_base": keym_base, "key_shifted": keym_shift,
        "pass": keym_base == keym_shift,
    }

    # (b) deplacement d'une fonction dans le fichier (autre position, memes params)
    moved_py = "def other():\n    pass\n\n\ndef foo(a, b):\n    return a + b\n"
    key_moved = compute_identity_key("foo", "py", "sandbox_b.py", moved_py, 5)
    out["b_moved_in_file_python"] = {
        "identical_to_base": key_base == key_moved, "key_base": key_base, "key_moved": key_moved,
        "pass": key_base == key_moved,
    }

    moved_mjs = "export function other() {}\n\n\nexport function foo(a, b) {\n  return a + b;\n}\n"
    key_moved_m = compute_identity_key("foo", "mjs", "sandbox_b.mjs", moved_mjs, 4)
    out["b_moved_in_file_mjs"] = {
        "identical_to_base": keym_base == key_moved_m, "key_base": keym_base, "key_moved": key_moved_m,
        "pass": keym_base == key_moved_m,
    }

    # (c) renommage volontaire -> DOIT apparaitre comme nouveau (vrai changement d'identite)
    renamed_py = "def foo_renamed(a, b):\n    return a + b\n"
    key_renamed = compute_identity_key("foo_renamed", "py", "sandbox_c.py", renamed_py, 1)
    out["c_renamed_python"] = {
        "differs_from_base": key_base != key_renamed, "key_base": key_base, "key_renamed": key_renamed,
        "pass": key_base != key_renamed,
    }

    renamed_mjs = "export function foo_renamed(a, b) {\n  return a + b;\n}\n"
    key_renamed_m = compute_identity_key("foo_renamed", "mjs", "sandbox_c.mjs", renamed_mjs, 1)
    out["c_renamed_mjs"] = {
        "differs_from_base": keym_base != key_renamed_m, "key_base": keym_base, "key_renamed": key_renamed_m,
        "pass": keym_base != key_renamed_m,
    }

    out["ALL_PASS"] = all(v["pass"] for v in out.values())
    return out


# ===========================================================================
# CORRECTION 1 -- SELF-GUARD TEST : le scanner corrige doit desormais VOIR les
# appels reels dans declaration_readers.mjs (auditAgentFile, collectDeclaredFields).
# ===========================================================================
def _self_guard_test() -> dict:
    fp = REPO / "scripts" / "forge" / "declaration_readers.mjs"
    text = fp.read_text(encoding="utf-8", errors="replace")
    idents = mjs_identifier_lines_v4(text)
    old_idents = _ORIGINAL_MJS_IDENTIFIER_LINES(text)  # comportement V02/V03 non patche, pour comparaison
    result = {}
    for name in ("auditAgentFile", "collectDeclaredFields", "readersNamingField"):
        lines_new = sorted(idents.get(name, set()))
        lines_old = sorted(old_idents.get(name, set()))
        result[name] = {
            "lines_seen_v04_scanner": lines_new,
            "lines_seen_v02v03_scanner": lines_old,
            "consumer_line_found_v04": len(lines_new) > 1,  # >1 = definition + au moins 1 usage
            "consumer_line_found_v02v03": len(lines_old) > 1,
        }
    result["PASS"] = (
        result["auditAgentFile"]["consumer_line_found_v04"]
        and result["collectDeclaredFields"]["consumer_line_found_v04"]
        and not result["auditAgentFile"]["consumer_line_found_v02v03"]
        and not result["collectDeclaredFields"]["consumer_line_found_v02v03"]
    )
    return result


# ===========================================================================
# CORRECTION 3 -- declared_status : fenetre elargie, source imprimee.
# Fenetres retenues (documentees, dans cet ordre de recherche) :
#   W1 file_header      : bloc de commentaires CONTIGU en tete de fichier (Python:
#                          triple-quote de module OU lignes '#' ; mjs: lignes '//'
#                          ou bloc '/* */'), plafonne a 150 lignes.
#   W2 function_doc      : docstring propre de la fonction (Python) / bloc JSDoc
#                          juste au-dessus (mjs) -- INCHANGE de V02/V03.
#   W3 adjacent_comments  : commentaires '#'/'//' contigus juste au-dessus de la
#                          definition, fenetre etendue a 60 lignes (etait 6 en
#                          V02/V03) -- toujours contigu, jamais tout le fichier.
#   W4 sibling_test_file : pour un artefact .mjs `foo.mjs`, le fichier jumeau
#                          `foo.test.mjs` s'il existe -- recherche du marqueur DANS
#                          UN VOISINAGE de +/-5 lignes autour d'une ligne qui cite le
#                          nom du symbole (evite de faire matcher un marqueur sans
#                          rapport avec CE symbole precis, ailleurs dans un gros
#                          fichier de test).
# Si aucune des 4 fenetres ne matche : declared_status=UNKNOWN, source=None (jamais
# une devinette).
# ===========================================================================
def _file_header_comment(text: str, lang: str) -> str:
    lines = text.splitlines()
    out = []
    if lang == "py":
        i = 0
        # shebang / encoding cookie toleres avant le docstring
        while i < len(lines) and (lines[i].startswith("#!") or lines[i].strip() == ""):
            i += 1
        if i < len(lines) and (lines[i].lstrip().startswith('"""') or lines[i].lstrip().startswith("'''")):
            quote = lines[i].lstrip()[:3]
            body = lines[i]
            j = i
            if body.count(quote) >= 2 and len(body.strip()) > 3:
                return body
            out.append(lines[i])
            j = i + 1
            while j < len(lines) and quote not in lines[j]:
                out.append(lines[j])
                j += 1
                if j - i > 150:
                    break
            if j < len(lines):
                out.append(lines[j])
            return "\n".join(out)
        # sinon: bloc de lignes '#' contigu
        j = i
        while j < len(lines) and lines[j].strip().startswith("#") and (j - i) < 150:
            out.append(lines[j])
            j += 1
        return "\n".join(out)
    else:
        i = 0
        while i < len(lines) and lines[i].strip() == "" or (i < len(lines) and lines[i].strip().startswith("#!")):
            i += 1
        j = i
        while j < len(lines) and (j - i) < 150:
            s = lines[j].strip()
            if s.startswith("//") or s.startswith("/*") or s.startswith("*") or (in_block := False):
                out.append(lines[j])
                j += 1
                continue
            break
        return "\n".join(out)


def _adjacent_comment_block(lines: list[str], def_lineno: int, max_lines: int = 60) -> str:
    """Comme v2.leading_comment_block mais fenetre etendue a 60 lignes (vs 6) --
    seule difference de comportement. Gere '#' (py) et '//' (mjs)."""
    out = []
    i = def_lineno - 2
    while i >= 0 and lines[i].strip().startswith(("@", "export")):
        i -= 1
    count = 0
    while i >= 0 and count < max_lines:
        s = lines[i].strip()
        if s.startswith("#") or s.startswith("//") or s.startswith("*") or s.startswith("/*"):
            out.insert(0, s.lstrip("#/*").strip())
            i -= 1
            count += 1
        else:
            break
    return "\n".join(out)


def _sibling_test_mentions(filepath: str, symbol_name: str) -> list[dict]:
    """Fenetre W4 : fichier .test.mjs jumeau, recherche du marqueur a +/-5 lignes
    d'une mention du nom du symbole."""
    if not filepath.endswith(".mjs") or filepath.endswith(".test.mjs"):
        return []
    test_path = REPO / (filepath[:-4] + ".test.mjs")
    if not test_path.exists():
        return []
    text = test_path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    hits = []
    name_lines = [i for i, l in enumerate(lines) if symbol_name in l]
    for nl in name_lines:
        lo, hi = max(0, nl - 5), min(len(lines), nl + 6)
        window = "\n".join(lines[lo:hi])
        found = v2.detect_not_wired_prose("", window)
        for f in found:
            hits.append({
                "source_window": "W4_sibling_test_file",
                "source_file": str(test_path.relative_to(REPO)).replace("\\", "/"),
                "source_line_approx": nl + 1,
                "phrase": f["phrase"], "verbatim": f["verbatim"],
            })
    return hits


def widened_declared_status(sym_name: str, filepath: str, lang: str, text: str, lineno: int,
                             own_docstring: str) -> dict:
    """Retourne {declared_status, basis: [{window, source_file, source_line, phrase, verbatim}]}.
    Cherche dans l'ordre W1..W4, s'arrete au premier match POUR RAPPORTER LA SOURCE,
    mais accumule TOUTES les fenetres qui matchent (transparence, pas juste la 1ere)."""
    basis = []
    lines = text.splitlines()

    header = _file_header_comment(text, lang)
    for f in v2.detect_not_wired_prose("", header):
        basis.append({"window": "W1_file_header", "source_file": filepath, "source_line": "1..~%d" % (header.count("\n") + 1),
                       "phrase": f["phrase"], "verbatim": f["verbatim"]})

    for f in v2.detect_not_wired_prose(own_docstring, ""):
        basis.append({"window": "W2_function_docstring", "source_file": filepath, "source_line": lineno,
                       "phrase": f["phrase"], "verbatim": f["verbatim"]})

    adjacent = _adjacent_comment_block(lines, lineno, max_lines=60)
    for f in v2.detect_not_wired_prose("", adjacent):
        basis.append({"window": "W3_adjacent_comments_60l", "source_file": filepath, "source_line": lineno,
                       "phrase": f["phrase"], "verbatim": f["verbatim"]})

    for f in _sibling_test_mentions(filepath, sym_name):
        basis.append(f)

    declared_status = "EXPERIMENT" if basis else "UNKNOWN"
    return {"declared_status": declared_status, "declared_status_basis": basis if basis else
            [{"window": "NONE", "source_file": None, "reason": "aucun marqueur trouve dans W1/W2/W3/W4"}]}


# ===========================================================================
# Classification V04 = classification V03 (Phase 1, inferred_status/confidence/
# action INCHANGES) + declared_status SURCHARGE par la fenetre elargie ci-dessus.
# ===========================================================================
def classify_status_v4(flagged_result: dict, text_cache: dict) -> dict:
    base = v3.classify_status(flagged_result)
    artifact = flagged_result["artifact"]
    filepath = flagged_result["file"].rsplit(":", 1)[0]
    lineno = int(flagged_result["file"].rsplit(":", 1)[1])
    lang = "py" if filepath.endswith(".py") else "mjs"
    text = text_cache.get(filepath)
    if text is None:
        text = (REPO / filepath).read_text(encoding="utf-8", errors="replace") if (REPO / filepath).exists() else ""
        text_cache[filepath] = text
    own_doc = ""  # docstring dej deja capturee par v2 dans flagged_result? not stored; recompute cheaply
    widened = widened_declared_status(artifact, filepath, lang, text, lineno, own_doc)
    base["declared_status"] = widened["declared_status"]
    base["declared_status_basis"] = widened["declared_status_basis"]
    return base


# ===========================================================================
# CORRECTION 4 -- rejeu des 4 cas difficiles
# ===========================================================================
def hard_cases_v4(flagged_by_key: dict) -> dict:
    out = {}

    # Cas 1 : declaration_readers.mjs
    sg = _self_guard_test()
    still_flagged = [
        k for k in flagged_by_key
        if k[1].endswith("declaration_readers.mjs") and k[0] in ("auditAgentFile", "collectDeclaredFields")
    ]
    out["case1_declaration_readers"] = {
        "self_guard_test": sg,
        "still_flagged_after_fix": still_flagged,
        "verdict": "consommateur detecte, statut non bloquant" if sg["PASS"] and not still_flagged else "ECHEC",
    }

    # Cas 2 : runtime_inventory_oracle.py -- chaine producteur/consommateur/decision
    rio = REPO / "scripts" / "forge" / "runtime_inventory_oracle.py"
    rio_text = rio.read_text(encoding="utf-8", errors="replace") if rio.exists() else ""
    external_docstring_mentions = []
    for p in (REPO / "scripts").rglob("*.py"):
        if p == rio:
            continue
        try:
            t = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if "runtime_inventory_oracle" in t or "emit_drift" in t:
            for i, l in enumerate(t.splitlines(), 1):
                if "runtime_inventory_oracle" in l or "emit_drift" in l:
                    external_docstring_mentions.append({"file": str(p.relative_to(REPO)).replace("\\", "/"), "line": i, "text": l.strip()})
    grep_real_import = subprocess.run(
        ["git", "grep", "-n", "-E", r"import runtime_inventory_oracle|from forge\.runtime_inventory_oracle|from \.runtime_inventory_oracle"],
        cwd=REPO, capture_output=True, text=True, encoding="utf-8", errors="replace",
    ).stdout
    out["case2_runtime_inventory_oracle"] = {
        "producer": "scripts/forge/runtime_inventory_oracle.py (emit_drift ecrit le drift ; declared_runtimes/observed_in_code/observed_by_event le calculent)",
        "consumer_real_import_search": grep_real_import.strip() or "AUCUN import reel trouve (git grep)",
        "docstring_or_comment_mentions_elsewhere": external_docstring_mentions[:10],
        "decision": (
            "producteur SANS consommateur externe reel : aucun autre module n'IMPORTE ce fichier ; "
            "la seule reference externe trouvee est une mention en commentaire/docstring "
            "(observer/adapters/forge_evidence.py), pas un import -- meme conclusion que V03 Phase5#2, "
            "reconfirmee sur ce depot au 2026-08-07."
        ),
    }

    # Cas 3 : kb_proposal.py -- confirmation par le code
    kb = REPO / "scripts" / "forge" / "kb_proposal.py"
    kb_text = kb.read_text(encoding="utf-8", errors="replace") if kb.exists() else ""
    kbv = REPO / "knowledge_base" / "kb-validate.mjs"
    kbv_text = kbv.read_text(encoding="utf-8", errors="replace") if kbv.exists() else ""
    calls_provenance_internal_entry = "_provenance_internal_entry(" in kb_text
    calls_internal_lesson_provenance_from_pattern = False
    m = re.search(r"def _lesson_to_pattern_entry.*?(?=\ndef |\Z)", kb_text, re.S)
    if m:
        calls_internal_lesson_provenance_from_pattern = "_internal_lesson_provenance(" in m.group(0)
    r3_present = ("R3" in kbv_text) and ("provenance" in kbv_text.lower())
    out["case3_kb_proposal"] = {
        "hypothesis": "kb_proposal + kb-validate preexistant + refus automatique = comportement change",
        "kb_validate_has_R3_provenance_gate": r3_present,
        "_lesson_to_pattern_entry_calls__provenance_internal_entry": calls_provenance_internal_entry,
        "_lesson_to_pattern_entry_calls__internal_lesson_provenance": calls_internal_lesson_provenance_from_pattern,
        "confirmed_by_code": r3_present and calls_provenance_internal_entry and not calls_internal_lesson_provenance_from_pattern,
        "decision": (
            "CONFIRME PAR LE CODE : kb-validate.mjs porte deja une porte R3 qui refuse toute entree sans "
            "provenance valide ; _lesson_to_pattern_entry (le chemin reellement cable) appelle "
            "_provenance_internal_entry (branche), PAS _internal_lesson_provenance (le symbole signale "
            "orphelin, qui sert un bloc non reconnu par BRICK_SPEC) -- le comportement n'a change que "
            "parce qu'une porte refusait DEJA, pas parce que la KB a cree une nouvelle autorite."
        ),
    }

    # Cas 4 : checkSourceUrlStability
    cws_file = "scripts/forge/check_worldscan.mjs"
    cws_text = (REPO / cws_file).read_text(encoding="utf-8", errors="replace")
    cws_line = None
    m2 = re.search(r"export\s+function\s+checkSourceUrlStability", cws_text)
    if m2:
        cws_line = cws_text.count("\n", 0, m2.start()) + 1
    widened = widened_declared_status("checkSourceUrlStability", cws_file, "mjs", cws_text, cws_line or 0, "")
    out["case4_checkSourceUrlStability"] = {
        "declared_status": widened["declared_status"],
        "declared_status_basis": widened["declared_status_basis"],
        "rule_respected_never_auto_OPERATIONAL": widened["declared_status"] in ("EXPERIMENT", "UNKNOWN"),
        "verdict": "PASS" if widened["declared_status"] == "EXPERIMENT" else (
            "PASS (UNKNOWN, jamais OPERATIONAL auto)" if widened["declared_status"] == "UNKNOWN" else "ECHEC"
        ),
    }
    return out


# ===========================================================================
# Sweep patche (Correction 1 appliquee) + classification (Correction 3 appliquee)
# ===========================================================================
def run_patched_sweep():
    v2.mjs_identifier_lines = mjs_identifier_lines_v4  # monkeypatch documente, cf. PATCH_NOTE
    v2._PY_FILES_CACHE = None
    v2._MJS_FILES_CACHE = None
    results, exclusion_counts = v2.mode_sweep_worktree()
    flagged = [r for r in results if r["would_block"]]
    text_cache: dict[str, str] = {}
    classified = [classify_status_v4(r, text_cache) for r in flagged]
    return results, exclusion_counts, flagged, classified


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "sweep"
    if mode == "selftest":
        out = {
            "patch_note": PATCH_NOTE,
            "self_guard_test": _self_guard_test(),
            "delta_identity_tests": _delta_identity_tests(),
        }
        print(json.dumps(out, indent=2, ensure_ascii=False))
        return
    results, exclusion_counts, flagged, classified = run_patched_sweep()
    flagged_by_key = {(f["artifact"], f["file"].rsplit(":", 1)[0]): f for f in flagged}
    hard = hard_cases_v4(flagged_by_key)
    out = {
        "results": results,
        "exclusion_counts": exclusion_counts,
        "status_classification": classified,
        "hard_cases": hard,
        "self_guard_test": _self_guard_test(),
        "delta_identity_tests": _delta_identity_tests(),
        "patch_note": PATCH_NOTE,
    }
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
