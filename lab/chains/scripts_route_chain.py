#!/usr/bin/env python3
"""
scripts_route_chain.py — Audit chain pour la route scripts/

Lit scripts/uxpilote, scripts/studioV2, scripts/studioV2/control_plane.
Détecte path drift, candidates, stale refs.
Produit un scripts_route_packet.

Doctrine:
- Read-only. Aucune mutation.
- claim_verdict = NO_CLAIM_ALLOWED toujours.
"""

import hashlib
import json
import re
import sys
from pathlib import Path

# ── Constants ──────────────────────────────────────────────

SCHEMA_VERSION = "scripts_route_chain.v0"
CHAIN_ID       = "scripts_route_chain"

SCRIPTS_DIRS = {
    "uxpilote":      "scripts/uxpilote",
    "studioV2":      "scripts/studioV2",
    "control_plane": "scripts/studioV2/control_plane",
}

BLOCKED_ACTIONS = [
    "script_execution",
    "silent_path_substitution",
    "file_move_or_rename",
    "CI_mutation",
    "CODEOWNERS_mutation",
    "shim_creation",
]

# Stale ref: référence à "scripts/control_plane/..." sans préfixe studioV2
_STALE_CP = re.compile(r'["\']([^"\']*scripts/control_plane[^"\']*)["\']')


# ── Core functions ─────────────────────────────────────────

def scan_scripts_dir(root: Path) -> list:
    """Retourne la liste triée des fichiers .py directement dans root."""
    if not root.exists():
        return []
    return sorted(p for p in root.glob("*.py") if p.is_file())


def classify_route_role(path: Path) -> str:
    """Classifie un script selon son rôle dans la route."""
    name = path.stem
    if any(name.startswith(p) for p in ("run_", "build_", "compile_", "render_", "prepare_")):
        return "official_implementation_candidate"
    if any(name.startswith(p) for p in ("smoke_", "validate_", "check_")):
        return "validation_candidate"
    return "UNKNOWN"


def detect_path_drift(scripts_by_dir: dict, repo_root: Path) -> list:
    """
    Détecte les fichiers avec le même nom dans plusieurs répertoires.
    Indique un drift potentiel (copie/migration).
    """
    by_name: dict = {}
    for label, paths in scripts_by_dir.items():
        for p in paths:
            by_name.setdefault(p.name, []).append((label, p))

    drift = []
    for name, entries in by_name.items():
        if len(entries) < 2:
            continue
        for i, (label_a, p_a) in enumerate(entries):
            for label_b, p_b in entries[i + 1:]:
                try:
                    h_a = hashlib.sha256(p_a.read_bytes()).hexdigest()
                    h_b = hashlib.sha256(p_b.read_bytes()).hexdigest()
                    status = "matching_sha256" if h_a == h_b else "drifted"
                except Exception:
                    status = "unknown"
                drift.append({
                    "filename": name,
                    "path_a": str(p_a.relative_to(repo_root)),
                    "path_b": str(p_b.relative_to(repo_root)),
                    "dir_a": label_a,
                    "dir_b": label_b,
                    "status": status,
                    "humangate_question": f"Which is source truth for {name}?",
                })
    return drift


def detect_stale_refs(scripts_by_dir: dict, repo_root: Path) -> list:
    """
    Scans chaque script pour des références à scripts/control_plane/
    sans préfixe studioV2 — chemin inexistant sur disque.
    """
    all_scripts = []
    for paths in scripts_by_dir.values():
        all_scripts.extend(paths)

    seen = set()
    stale = []
    for script in all_scripts:
        try:
            content = script.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        for match in _STALE_CP.finditer(content):
            ref = match.group(1)
            if "studioV2" in ref:
                continue
            key = (str(script), ref)
            if key in seen:
                continue
            seen.add(key)
            stale.append({
                "referencing_file": str(script.relative_to(repo_root)),
                "stale_ref": ref,
                "status": "not_found",
            })
    return stale


def build_scripts_route_packet(repo_root: Path = None) -> dict:
    """Point d'entrée principal. Scanne, détecte, produit le packet."""
    if repo_root is None:
        repo_root = Path(__file__).resolve().parent.parent.parent

    scripts_by_dir: dict = {}
    roots_scanned = []
    for label, rel_path in SCRIPTS_DIRS.items():
        root = repo_root / rel_path
        scripts = scan_scripts_dir(root)
        scripts_by_dir[label] = scripts
        roots_scanned.append({
            "label": label,
            "path": rel_path,
            "exists": root.exists(),
            "count": len(scripts),
        })

    content_scripts: dict = {}
    for label, scripts in scripts_by_dir.items():
        content_scripts[label] = [
            {
                "file": str(p.relative_to(repo_root)),
                "name": p.name,
                "route_role": classify_route_role(p),
            }
            for p in scripts
        ]

    path_drift = detect_path_drift(scripts_by_dir, repo_root)
    stale_refs = detect_stale_refs(scripts_by_dir, repo_root)

    total = sum(len(v) for v in scripts_by_dir.values())

    return {
        "schema_version": SCHEMA_VERSION,
        "chain_id": CHAIN_ID,
        "authority": "read_only",
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "blocked_actions": BLOCKED_ACTIONS,
        "content": {
            "roots_scanned": roots_scanned,
            "scripts": content_scripts,
            "total_scripts": total,
        },
        "path_drift_candidates": path_drift,
        "stale_refs": stale_refs,
        "summary": {
            "scripts_uxpilote_count":      len(scripts_by_dir.get("uxpilote", [])),
            "scripts_studioV2_count":      len(scripts_by_dir.get("studioV2", [])),
            "scripts_control_plane_count": len(scripts_by_dir.get("control_plane", [])),
            "path_drift_count":            len(path_drift),
            "stale_refs_count":            len(stale_refs),
        },
    }


# ── CLI ────────────────────────────────────────────────────

def main() -> None:
    packet = build_scripts_route_packet()
    print(json.dumps(packet, indent=2, ensure_ascii=False))
    s = packet["summary"]
    print(f"\n[OK] scripts_route_packet produit.")
    print(f"  uxpilote      : {s['scripts_uxpilote_count']} scripts")
    print(f"  studioV2      : {s['scripts_studioV2_count']} scripts")
    print(f"  control_plane : {s['scripts_control_plane_count']} scripts")
    print(f"  path_drift    : {s['path_drift_count']} candidats")
    print(f"  stale_refs    : {s['stale_refs_count']} references")
    print(f"\n  claim_verdict : {packet['claim_verdict']}")
    print(f"  authority     : {packet['authority']}")


if __name__ == "__main__":
    main()
