"""
doc_hygiene_chain.py — Documentation hygiene audit chain (read-only git audit).
Local-only. No git writes. Outputs to lab/hygiene/ and lab/chains/CHAIN_HISTORY.jsonl.
"""

import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

import argparse
import json
import re
import subprocess
from datetime import datetime
from pathlib import Path, PurePosixPath

try:
    import yaml as _yaml
except ImportError:
    _yaml = None

# ── Constants ────────────────────────────────────────────────────────────────

MANIFEST_PATH = Path("FILE_ROUTING_MANIFEST.yaml")
HISTORY_FILE = Path("lab/chains/CHAIN_HISTORY.jsonl")
HYGIENE_DIR = Path("lab/hygiene")

# Lane priority order: index 0 = lowest, index 3 = highest
LANE_PRIORITY = ["SAFE_AUTO", "AUDIT_REQUIRED", "HUMAN_REQUIRED", "FORBIDDEN"]

# Anchored prefix lists per lane (highest-priority lanes checked first in _file_lane)
LANE_PREFIXES = {
    "FORBIDDEN": [
        ".git/",
        "secrets/",
        ".env",
    ],
    "HUMAN_REQUIRED": [
        "00_STUDIO_CONTROL/",
        "Cargo.toml",
        "Cargo.lock",
    ],
    "AUDIT_REQUIRED": [
        "src/",
        "ml/",
        "scripts/",
        "lab/chains/",
    ],
    "SAFE_AUTO": [
        "lab/",
        "docs/",
        "README",
        ".gitignore",
        ".gitattributes",
    ],
}

COMMIT_TYPES = {
    "feat", "fix", "chore", "docs", "style", "refactor", "perf",
    "test", "build", "ci", "revert", "chains", "lab", "ml", "arch",
}

_TYPE_SCOPE_RE = re.compile(
    r"^(?P<type>[a-zA-Z][a-zA-Z0-9_-]*)(?:\((?P<scope>[^)]+)\))?(?:\s*[:—\-]+\s*)"
)
_ISSUE_RE = re.compile(r"#(\d+)")


# ── Step 1: get_git_state ────────────────────────────────────────────────────

def _run(cmd: list) -> tuple:
    try:
        r = subprocess.run(
            cmd, capture_output=True, text=True, encoding="utf-8", errors="replace"
        )
        return r.stdout.strip(), r.returncode
    except Exception as e:
        return f"ERROR: {e}", 1


def get_git_state() -> dict:
    head_sha, _ = _run(["git", "rev-parse", "HEAD"])
    branch, _ = _run(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    last_msg, _ = _run(["git", "log", "-1", "--format=%B"])

    count_str, _ = _run(["git", "rev-list", "--count", "HEAD"])
    try:
        commit_count = int(count_str)
    except (ValueError, TypeError):
        commit_count = 0

    changed_files = []
    if commit_count >= 2:
        diff_out, _ = _run(["git", "diff", "--name-only", "HEAD~1", "HEAD"])
        if diff_out and not diff_out.startswith("ERROR"):
            changed_files = [f.strip() for f in diff_out.splitlines() if f.strip()]

    untracked_files = []
    status_out, _ = _run(["git", "status", "--porcelain"])
    if status_out and not status_out.startswith("ERROR"):
        for line in status_out.splitlines():
            if len(line) < 3:
                continue
            xy = line[:2]
            path_part = line[3:]
            # Renames: "R  old -> new" — take the new path
            if "R" in xy and " -> " in path_part:
                path_part = path_part.split(" -> ", 1)[1]
            if xy == "??":
                untracked_files.append(path_part.strip())

    return {
        "head_sha": head_sha,
        "branch": branch,
        "last_commit_msg": last_msg,
        "changed_files": changed_files,
        "untracked_files": untracked_files,
        "commit_count": commit_count,
    }


# ── Step 2: audit_commit_message ────────────────────────────────────────────

def audit_commit_message(msg: str) -> dict:
    if not msg or not msg.strip():
        return {
            "is_valid": False,
            "warnings": ["Commit message vide ou whitespace uniquement"],
            "issue_ref": None,
            "commit_type": None,
            "commit_scope": None,
        }

    first_line = msg.strip().splitlines()[0].strip()
    warnings = []
    commit_type = None
    commit_scope = None

    m = _TYPE_SCOPE_RE.match(first_line)
    if m:
        raw_type = m.group("type").lower()
        commit_scope = m.group("scope")
        commit_type = raw_type
        if raw_type not in COMMIT_TYPES:
            warnings.append(f"Type '{raw_type}' non-standard (acceptable, warn seulement)")
    else:
        warnings.append("Aucun type de commit detecte (ex: feat, fix, chore) — warn seulement")

    issue_m = _ISSUE_RE.search(msg)
    issue_ref = issue_m.group(1) if issue_m else None
    if not issue_ref:
        warnings.append("Aucune reference issue detectee (ex: #123) — optionnel")

    return {
        "is_valid": True,
        "warnings": warnings,
        "issue_ref": issue_ref,
        "commit_type": commit_type,
        "commit_scope": commit_scope,
    }


# ── Step 3: detect_lane ──────────────────────────────────────────────────────

def _normalize(path: str) -> str:
    return path.replace("\\", "/")


def _file_lane(filepath: str) -> str:
    norm = _normalize(filepath)
    for lane in reversed(LANE_PRIORITY):
        for prefix in LANE_PREFIXES.get(lane, []):
            if norm.startswith(prefix):
                return lane
    return "SAFE_AUTO"


def detect_lane(changed_files: list) -> str:
    if not changed_files:
        return "SAFE_AUTO"
    lanes = [_file_lane(f) for f in changed_files]
    best = "SAFE_AUTO"
    for lane in lanes:
        if LANE_PRIORITY.index(lane) > LANE_PRIORITY.index(best):
            best = lane
    return best


# ── Step 4: audit_file_routing ───────────────────────────────────────────────

def _load_manifest() -> tuple:
    if not MANIFEST_PATH.exists():
        return None, "MANIFEST_MISSING"
    if _yaml is None:
        return None, "YAML_UNAVAILABLE"
    try:
        with open(MANIFEST_PATH, encoding="utf-8") as f:
            data = _yaml.safe_load(f)
        return data, "OK"
    except Exception as e:
        return None, f"MANIFEST_ERROR: {e}"


def _match_pattern(filepath: str, pattern: str) -> bool:
    norm = _normalize(filepath)
    norm_pattern = _normalize(pattern)
    return PurePosixPath(norm).match(norm_pattern)


def _collect_patterns(manifest: dict) -> list:
    routing = manifest.get("routing", {})
    entries = []
    for section in ("tracked", "gitignored", "unrouted"):
        for entry in routing.get(section, []):
            entries.append(entry)
    return entries


def audit_file_routing(untracked_files: list) -> dict:
    manifest, status = _load_manifest()

    if manifest is None:
        return {
            "status": status,
            "routed": [],
            "orphaned": list(untracked_files),
            "recommendations": {
                f: ("DELETE" if _normalize(f).startswith("ml/") else "REVIEW")
                for f in untracked_files
            },
        }

    patterns = _collect_patterns(manifest)
    routed = []
    orphaned = []
    recommendations = {}

    for filepath in untracked_files:
        matched = any(_match_pattern(filepath, e.get("pattern", "")) for e in patterns)
        if matched:
            routed.append(filepath)
        else:
            orphaned.append(filepath)
            norm = _normalize(filepath)
            recommendations[filepath] = "DELETE" if norm.startswith("ml/") else "REVIEW"

    return {
        "status": "OK",
        "routed": routed,
        "orphaned": orphaned,
        "recommendations": recommendations,
    }


# ── Step 5: propose_doc_updates ──────────────────────────────────────────────

def propose_doc_updates(changed_files: list, lane: str):
    if lane in ("FORBIDDEN", "HUMAN_REQUIRED"):
        return "REQUIRES_HUMAN_REVIEW"

    proposals = []
    for filepath in changed_files:
        norm = _normalize(filepath)
        if norm.startswith("src/") or norm.endswith(".rs"):
            proposals.append({
                "file": "00_STUDIO_CONTROL/00_MASTER_DOCS/00_NAVIGATION_INDEX.md",
                "section": "Engine / Source",
                "reason": f"{filepath} modifie (code source Rust)",
            })
        if norm.startswith("ml/"):
            proposals.append({
                "file": "00_STUDIO_CONTROL/00_MASTER_DOCS/00_NAVIGATION_INDEX.md",
                "section": "ML Pipeline",
                "reason": f"{filepath} modifie (pipeline ML)",
            })
        if norm.startswith("lab/chains/"):
            proposals.append({
                "file": "00_STUDIO_CONTROL/00_MASTER_DOCS/00_NAVIGATION_INDEX.md",
                "section": "Chains / Agentic",
                "reason": f"{filepath} modifie (chaine agentic)",
            })

    seen = set()
    unique = []
    for p in proposals:
        key = (p["file"], p["section"])
        if key not in seen:
            seen.add(key)
            unique.append(p)
    return unique


# ── Step 6: assemble_verdicts ────────────────────────────────────────────────

def assemble_verdicts(commit_audit: dict, lane: str, routing_audit: dict, doc_proposals) -> dict:
    orphaned = routing_audit.get("orphaned", [])

    if not commit_audit["is_valid"]:
        sw = "BLOCKED_INVALID_COMMIT"
    elif lane == "FORBIDDEN":
        sw = "BLOCKED_FORBIDDEN_LANE"
    elif orphaned:
        sw = "BLOCKED_UNROUTED_FILES"
    elif lane == "HUMAN_REQUIRED":
        sw = "HUMAN_REVIEW_REQUIRED"
    elif lane == "SAFE_AUTO":
        sw = "DOCS_OK"
    else:
        sw = "AUDIT_REQUIRED_CHANGES"

    if lane in ("HUMAN_REQUIRED", "FORBIDDEN"):
        ev = "REQUIRES_HUMAN_REVIEW"
    elif isinstance(doc_proposals, list) and doc_proposals:
        ev = "DOCUMENTATION_ALIGNMENT_REQUIRED"
    else:
        ev = "MECHANICAL_VALIDATION_ONLY"

    ready = sw in ("DOCS_OK", "AUDIT_REQUIRED_CHANGES") and not orphaned

    return {
        "software_verdict": sw,
        "evidence_verdict": ev,
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "ready_for_pr": ready,
    }


# ── Step 7: generate_report ──────────────────────────────────────────────────

def generate_report(git_state: dict, commit_audit: dict, lane: str,
                    routing_audit: dict, doc_proposals, verdicts: dict) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    sha = git_state["head_sha"][:8] if git_state.get("head_sha") else "unknown"
    first_line = (git_state.get("last_commit_msg") or "").strip().splitlines()[0][:80] if git_state.get("last_commit_msg") else ""

    lines = [
        f"# Doc Hygiene Report — {sha} — {now}",
        "",
        "## Git State",
        f"- Branch: `{git_state.get('branch', '?')}`",
        f"- HEAD: `{git_state.get('head_sha', '?')}`",
        f"- Commit count: {git_state.get('commit_count', 0)}",
        f"- Last message: `{first_line}`",
        "",
        "## Commit Audit",
        f"- Valid: {'[OK]' if commit_audit['is_valid'] else '[X] BLOCKED'}",
        f"- Type: `{commit_audit['commit_type'] or 'none'}`",
        f"- Scope: `{commit_audit['commit_scope'] or 'none'}`",
        f"- Issue ref: `{commit_audit['issue_ref'] or 'none'}`",
    ]
    for w in commit_audit.get("warnings", []):
        lines.append(f"  - [!] {w}")

    lines += [
        "",
        "## Lane Detection",
        f"- Lane: **{lane}**",
        f"- Changed files ({len(git_state.get('changed_files', []))}):",
    ]
    for f in (git_state.get("changed_files") or [])[:20]:
        lines.append(f"  - `{f}`")

    lines += [
        "",
        "## File Routing Audit",
        f"- Manifest status: `{routing_audit['status']}`",
        f"- Untracked files: {len(git_state.get('untracked_files', []))}",
        f"- Routed: {len(routing_audit.get('routed', []))}",
        f"- Orphaned: {len(routing_audit.get('orphaned', []))}",
    ]
    for f in routing_audit.get("orphaned", []):
        rec = routing_audit.get("recommendations", {}).get(f, "REVIEW")
        lines.append(f"  - [X] `{f}` -> {rec}")

    lines += ["", "## Doc Update Proposals"]
    if doc_proposals == "REQUIRES_HUMAN_REVIEW":
        lines.append("- [!] REQUIRES_HUMAN_REVIEW (lane trop elevee)")
    elif isinstance(doc_proposals, list) and doc_proposals:
        for p in doc_proposals:
            lines.append(f"- `{p['file']}` [{p['section']}] — {p['reason']}")
    else:
        lines.append("- Aucune mise a jour documentaire requise.")

    lines += [
        "",
        "## Verdicts",
        f"- software_verdict: **{verdicts['software_verdict']}**",
        f"- evidence_verdict: **{verdicts['evidence_verdict']}**",
        f"- claim_verdict: **{verdicts['claim_verdict']}**",
        f"- ready_for_pr: `{verdicts['ready_for_pr']}`",
    ]
    return "\n".join(lines)


# ── Step 8: save_report + log_chain_event ────────────────────────────────────

def save_report(report_md: str, sha: str, doc_proposals) -> Path:
    HYGIENE_DIR.mkdir(parents=True, exist_ok=True)
    short_sha = sha[:8] if sha else "unknown"
    report_path = HYGIENE_DIR / f"hygiene_report_{short_sha}.md"
    report_path.write_text(report_md, encoding="utf-8")

    if isinstance(doc_proposals, list) and doc_proposals:
        proposals_path = HYGIENE_DIR / f"proposed_doc_updates_{short_sha}.md"
        plines = [f"# Proposed Doc Updates — {short_sha}", ""]
        for p in doc_proposals:
            plines += [f"## {p['file']}", f"- Section: {p['section']}", f"- Raison: {p['reason']}", ""]
        proposals_path.write_text("\n".join(plines), encoding="utf-8")

    return report_path


def log_chain_event(git_state: dict, verdicts: dict) -> None:
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "chain": "doc_hygiene_chain",
        "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S"),
        "sha": git_state.get("head_sha", ""),
        "branch": git_state.get("branch", ""),
        "software_verdict": verdicts.get("software_verdict"),
        "evidence_verdict": verdicts.get("evidence_verdict"),
        "claim_verdict": verdicts.get("claim_verdict"),
        "ready_for_pr": verdicts.get("ready_for_pr"),
    }
    with open(HISTORY_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Doc hygiene chain — read-only git audit")
    parser.add_argument("--audit-only", action="store_true",
                        help="Ne pas ecrire de fichier, ne pas logger")
    parser.add_argument("--verbose", action="store_true",
                        help="Afficher le rapport complet")
    args = parser.parse_args()

    if _yaml is None:
        print("pyyaml manquant — lancer: .\\.venv312\\Scripts\\python.exe -m pip install pyyaml")
        print("[!] Fonctionnement degrade : audit routage indisponible")

    print("[doc_hygiene_chain] Demarrage audit...")

    git_state = get_git_state()
    sha8 = git_state["head_sha"][:8] if git_state.get("head_sha") else "?"
    print(f"[OK] Git state: branch={git_state['branch']} sha={sha8} commits={git_state['commit_count']}")

    commit_audit = audit_commit_message(git_state["last_commit_msg"])
    vstatus = "[OK]" if commit_audit["is_valid"] else "[X]"
    print(f"{vstatus} Commit audit: valid={commit_audit['is_valid']} type={commit_audit['commit_type']}")
    for w in commit_audit["warnings"]:
        print(f"  [!] {w}")

    lane = detect_lane(git_state["changed_files"])
    print(f"[OK] Lane detected: {lane} ({len(git_state['changed_files'])} changed files)")

    routing_audit = audit_file_routing(git_state["untracked_files"])
    rs = routing_audit["status"]
    if rs == "MANIFEST_MISSING":
        print("[!] MANIFEST_MISSING — FILE_ROUTING_MANIFEST.yaml absent (HumanGate required)")
        if routing_audit["orphaned"]:
            print(f"[X] {len(routing_audit['orphaned'])} fichiers non routes (orphelins)")
    elif routing_audit["orphaned"]:
        print(f"[X] ORPHELINS DETECTES: {len(routing_audit['orphaned'])} fichiers non routes")
        for f in routing_audit["orphaned"]:
            rec = routing_audit["recommendations"].get(f, "REVIEW")
            print(f"    [X] {f} -> {rec}")
    else:
        print(f"[OK] Routing audit: {len(routing_audit['routed'])} routes, 0 orphelins")

    doc_proposals = propose_doc_updates(git_state["changed_files"], lane)
    if doc_proposals == "REQUIRES_HUMAN_REVIEW":
        print("[!] Doc proposals: REQUIRES_HUMAN_REVIEW")
    else:
        print(f"[OK] Doc proposals: {len(doc_proposals)} proposition(s)")

    verdicts = assemble_verdicts(commit_audit, lane, routing_audit, doc_proposals)
    print("\n[VERDICTS]")
    print(f"  software_verdict : {verdicts['software_verdict']}")
    print(f"  evidence_verdict : {verdicts['evidence_verdict']}")
    print(f"  claim_verdict    : {verdicts['claim_verdict']}")
    print(f"  ready_for_pr     : {verdicts['ready_for_pr']}")

    report_md = generate_report(git_state, commit_audit, lane, routing_audit, doc_proposals, verdicts)

    if args.verbose:
        print("\n" + "-" * 60)
        print(report_md)
        print("-" * 60)

    if not args.audit_only:
        rp = save_report(report_md, git_state["head_sha"], doc_proposals)
        log_chain_event(git_state, verdicts)
        print(f"\n[OK] Rapport ecrit: {rp}")
        print(f"[OK] Chain event logue dans {HISTORY_FILE}")
    else:
        print("\n[audit-only] Aucun fichier ecrit.")

    sw = verdicts["software_verdict"]
    if sw.startswith("BLOCKED"):
        print(f"\n[BLOCK] {sw}")
        sys.exit(2)
    elif sw == "HUMAN_REVIEW_REQUIRED":
        print(f"\n[!] {sw}")
        sys.exit(1)
    else:
        print(f"\n[OK] {sw}")
        sys.exit(0)


if __name__ == "__main__":
    main()
