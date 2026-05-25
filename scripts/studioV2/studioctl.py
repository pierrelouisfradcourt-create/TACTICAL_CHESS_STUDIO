from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ROUTE_POLICY_PATH = PROJECT_ROOT / "00_STUDIO_CONTROL" / "01_MAPS" / "STUDIO_OUTPUT_ROUTING_POLICY_V0.md"
CLAIM_POSTURE = "NO_CLAIM_ALLOWED"
STATUS_VALUES = {"IMPLEMENTED", "TESTED", "DOCUMENTED_ONLY", "PASSIVE", "BLOCKED", "NOT_FOUND", "UNKNOWN"}
ALL_SURFACES = (
    "active_runtime_code",
    "tests",
    "artifacts_runtime_outputs",
    "canonical_docs",
    "roadmap_docs_only",
    "inference",
    "lab",
    "schemas",
    "scripts_tooling",
    "models_datasets",
    "secrets",
)
CANONICAL_SURFACES = (
    "active_runtime_code",
    "tests",
    "artifacts_runtime_outputs",
    "canonical_docs",
    "roadmap_docs_only",
    "inference",
)
NON_ROUTABLE_SURFACES = {"lab", "schemas", "models_datasets", "secrets"}
ROUTABLE_SURFACES = set(ALL_SURFACES) - NON_ROUTABLE_SURFACES
PROFILE_DEFAULTS = {
    "hygiene": {
        "task_class": "repo_audit",
        "action_mode": "inspect",
        "task_intent": "diagnose",
        "validation_mode": "readback",
        "mutation_policy": "forbidden",
        "file_producing": False,
    },
    "truth": {
        "task_class": "repo_audit",
        "action_mode": "validate_evidence",
        "task_intent": "validate",
        "validation_mode": "readback",
        "mutation_policy": "forbidden",
        "file_producing": False,
    },
    "upgrade": {
        "task_class": "patch_tooling",
        "action_mode": "prepare_patch",
        "task_intent": "prepare_patch",
        "validation_mode": "targeted_check",
        "mutation_policy": "humangate_required",
        "file_producing": True,
    },
}
TASK_CLASS_REASONING_DEFAULTS = {
    "docs_workflow": "medium",
    "repo_audit": "high",
    "patch_tooling": "high",
    "runtime_patch": "high",
    "red_team": "high",
}
FILE_PRODUCING_TASK_CLASSES = {"patch_tooling", "runtime_patch"}
CHARTER_RENDER_BLOCKED_ACTIONS = [
    "Do not execute the rendered charter.",
    "Do not write rendered charter to file.",
    "Do not modify templates.",
    "Do not execute runtime/gameplay code.",
    "Do not run cargo test or full pytest.",
    "Do not inspect secrets.",
    "Do not create lab runs, latest.json, datasets, models, checkpoints.",
    "Do not modify reports, templates, source registry, or upload checklist.",
    "Do not commit, push, create branch, or PR.",
    "Do not claim readiness.",
    "Do not produce a global ready/not-ready verdict.",
]
CHARTER_RENDER_FINAL_REPORT_REQUIRED = [
    "preflight",
    "runtime_gate_result",
    "files_changed",
    "commands_run",
    "validation",
    "skipped_validation",
    "risks",
    "cli_behavior_summary",
    "blocked_actions_preserved",
    "status_by_surface",
    "software_verdict",
    "evidence_verdict",
    "claim_verdict",
    "no_global_ready_verdict: true",
]
KNOWN_REPORTS = {
    "current_truth_map": PROJECT_ROOT / "00_STUDIO_CONTROL" / "05_STATUS" / "CURRENT_TRUTH_MAP_V0.md",
    "audit_01": PROJECT_ROOT / "00_STUDIO_CONTROL" / "05_STATUS" / "AUDIT_01_STUDIO_CONTROL_WORKFLOW_MAP.md",
    "audit_02": PROJECT_ROOT / "00_STUDIO_CONTROL" / "05_STATUS" / "AUDIT_02_STUDIOV2_ROOT_RUNTIME_TRUTH_MAP.md",
    "audit_03": PROJECT_ROOT / "00_STUDIO_CONTROL" / "05_STATUS" / "AUDIT_03_STUDIO_DEV_WORKBENCH_UXPILOTE_REQUIREMENTS.md",
    "audit_04": PROJECT_ROOT / "00_STUDIO_CONTROL" / "05_STATUS" / "AUDIT_04_STUDIOCTL_PHASE1_TASK_CHARTER.md",
}
SOURCE_ANCHORS = [
    ("AGENTS.md", "canonical_docs"),
    ("README.md", "canonical_docs"),
    ("00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md", "canonical_docs"),
    ("00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md", "canonical_docs"),
    ("00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md", "canonical_docs"),
    ("00_STUDIO_CONTROL/07_FORMS/TASK_CHARTER_TEMPLATE_V0.yaml", "canonical_docs"),
    ("00_STUDIO_CONTROL/07_FORMS/EXECUTOR_REPORT_TEMPLATE_V0.yaml", "canonical_docs"),
    ("00_STUDIO_CONTROL/07_FORMS/ANALYSIS_AGENT_RECORD_TEMPLATE_V0.yaml", "canonical_docs"),
    ("docs/gpt-navigator/GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md", "canonical_docs"),
    ("docs/gpt-navigator/GPT_NAVIGATOR_REPO_NOTICE_V0.md", "canonical_docs"),
    ("docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md", "canonical_docs"),
]

REGISTRATION_REFERENCE_PATHS = [
    PROJECT_ROOT / "docs" / "gpt-navigator" / "GPT_NAVIGATOR_SOURCE_INDEX_V0.md",
    PROJECT_ROOT / "docs" / "gpt-navigator" / "GPT_NAVIGATOR_UPLOAD_CHECKLIST_V0.md",
    PROJECT_ROOT / "00_STUDIO_CONTROL" / "02_NAVIGATION" / "STUDIO_SOURCE_ANCHORING_V0.md",
    PROJECT_ROOT / "00_STUDIO_CONTROL" / "03_REGISTRIES" / "FILE_REGISTRY.yaml",
]

ENFORCED_SOURCE_PATHS = {
    "AGENTS.md",
    "00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md",
    "00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md",
    "00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md",
    "docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md",
}
REPORT_REQUIRED_FIELDS = {
    "preflight": ("preflight",),
    "source_state": ("source_state", "source state"),
    "route_check": ("route_check", "route check"),
    "output_routing_result": ("output_routing_result", "output routing result"),
    "files_changed": ("files_changed", "files changed", "files_touched", "files touched"),
    "commands_run": ("commands_run", "commands run"),
    "validation_or_skipped_validation": ("validation", "skipped_validation", "skipped validation"),
    "risks": ("risks",),
    "status_by_surface": ("status_by_surface", "status by surface", "surface_status", "surface status"),
    "software_verdict": ("software_verdict", "software verdict"),
    "evidence_verdict": ("evidence_verdict", "evidence verdict"),
    "claim_verdict": ("claim_verdict", "claim verdict"),
    "no_global_ready_verdict": ("no_global_ready_verdict", "no global ready verdict"),
}
STRUCTURED_FIELD_GROUPS = {
    "preflight": ("preflight",),
    "source_state": ("source_state", "source state"),
    "route_check": ("route_check", "route check"),
    "output_routing_result": ("output_routing_result", "output routing result"),
    "files_changed": ("files_changed", "files changed", "files_touched", "files touched"),
    "commands_run": ("commands_run", "commands run"),
    "validation_or_skipped_validation": ("validation", "skipped_validation", "skipped validation"),
    "risks": ("risks",),
    "status_by_surface": ("status_by_surface", "status by surface", "surface_status", "surface status"),
    "software_verdict": ("software_verdict", "software verdict"),
    "evidence_verdict": ("evidence_verdict", "evidence verdict"),
    "claim_verdict": ("claim_verdict", "claim verdict"),
    "no_global_ready_verdict": ("no_global_ready_verdict", "no global ready verdict"),
}
EXECUTOR_REPORT_FIELD_PATHS = {
    "task_id": ("task_id",),
    "codex_runtime.requested_model": ("codex_runtime", "requested_model"),
    "codex_runtime.actual_runtime": ("codex_runtime", "actual_runtime"),
    "codex_runtime.runtime_status": ("codex_runtime", "runtime_status"),
    "preflight.cwd": ("preflight", "cwd"),
    "preflight.repo_root": ("preflight", "repo_root"),
    "preflight.branch": ("preflight", "branch"),
    "preflight.HEAD": ("preflight", "HEAD"),
    "preflight.worktree_status": ("preflight", "worktree_status"),
    "source_state": ("source_state",),
    "route_check.status": ("route_check", "status"),
    "output_routing_result.actual_destination": ("output_routing_result", "actual_destination"),
    "files_changed": ("files_changed",),
    "commands_run": ("commands_run",),
    "validation.status": ("validation", "status"),
    "skipped_validation": ("skipped_validation",),
    "risks": ("risks",),
    "status_by_surface": ("status_by_surface",),
    "software_verdict": ("software_verdict",),
    "evidence_verdict": ("evidence_verdict",),
    "claim_verdict": ("claim_verdict",),
    "no_global_ready_verdict": ("no_global_ready_verdict",),
    "recommended_next_tasks": ("recommended_next_tasks",),
}
EXECUTOR_REPORT_FIELD_ALIASES = {
    "preflight.cwd": (
        ("preflight", "cwd"),
        ("repo_reference", "cwd"),
        ("repo_reference", "path"),
        ("repo_reference", "git_root"),
    ),
    "preflight.repo_root": (
        ("preflight", "repo_root"),
        ("repo_reference", "repo_root"),
        ("repo_reference", "git_root"),
        ("repo_reference", "path"),
    ),
    "preflight.branch": (("preflight", "branch"), ("repo_reference", "branch")),
    "preflight.HEAD": (("preflight", "HEAD"), ("repo_reference", "head")),
    "preflight.worktree_status": (
        ("preflight", "worktree_status"),
        ("repo_reference", "worktree_status"),
        ("repo_reference", "worktree_status_before_changes"),
    ),
    "validation.status": (
        ("validation", "status"),
        ("validation", "result"),
        ("validation", "diff_check"),
        ("validation", "readback"),
    ),
    "files_changed": (
        ("files_changed",),
        ("files_changed", "by_this_task"),
        ("files_changed", "repo_source_test_docs_runtime"),
        ("files_touched",),
    ),
    "recommended_next_tasks": (("recommended_next_tasks",), ("next_tasks",)),
}
UNKNOWN_VALUE = "UNKNOWN"
TEXT_REPORT_EXTENSIONS = {".md", ".markdown", ".txt", ".yaml", ".yml"}
DEFAULT_STATUS_BY_SURFACE = {surface: "PASSIVE" for surface in ALL_SURFACES}
DEFAULT_STATUS_BY_SURFACE["roadmap_docs_only"] = "DOCUMENTED_ONLY"
DEFAULT_STATUS_BY_SURFACE["secrets"] = "BLOCKED"
LOGISTIC_BLOCKED_ACTIONS = {
    "autonomous_agent_activation": "BLOCKED",
    "background_work": "BLOCKED",
    "self_execution": "BLOCKED",
    "git_mutation": "BLOCKED",
    "task_matrix_write": "BLOCKED",
    "source_registration_write": "BLOCKED",
    "registry_write": "BLOCKED",
    "llm_call": "BLOCKED",
    "rag_indexing": "BLOCKED",
    "model_call": "BLOCKED",
    "runtime_execution": "BLOCKED",
    "training": "BLOCKED",
    "benchmark": "BLOCKED",
    "dataset_generation": "BLOCKED",
    "dataset_reset": "BLOCKED",
    "model_or_checkpoint_creation": "BLOCKED",
    "model_promotion": "BLOCKED",
    "latest_json_creation": "BLOCKED",
    "lab_run_creation": "BLOCKED",
    "chess960_activation": "BLOCKED",
    "decision_controller_activation": "BLOCKED",
}
LOGISTIC_STATUS_BY_SURFACE = {
    "active_runtime_code": "PASSIVE",
    "tests": "PASSIVE",
    "artifacts_runtime_outputs": "PASSIVE",
    "canonical_docs": "DOCUMENTED_ONLY",
    "roadmap_docs_only": "PASSIVE",
    "inference": "PASSIVE",
}
UXPILOTE_AUDIT_CHAIN_CATALOG_RELATIVE = "00_STUDIO_CONTROL/01_MAPS/UXPILOTE_AUDIT_CHAIN_CATALOG_V0.md"
UXPILOTE_AUDIT_CHAIN_CATALOG_PATH = PROJECT_ROOT / UXPILOTE_AUDIT_CHAIN_CATALOG_RELATIVE
UXPILOTE_AUDIT_CHAIN_BLOCKED_ACTIONS = {
    "runtime_execution": "BLOCKED",
    "training": "BLOCKED",
    "benchmark": "BLOCKED",
    "dataset_generation": "BLOCKED",
    "dataset_reset": "BLOCKED",
    "latest_json_creation": "BLOCKED",
    "lab_run_creation": "BLOCKED",
    "model_or_checkpoint_creation": "BLOCKED",
    "model_promotion": "BLOCKED",
    "agent_activation": "BLOCKED",
    "chess960_activation": "BLOCKED",
    "decision_controller_activation": "BLOCKED",
    "commit_push_branch_PR": "BLOCKED",
    "unknown_script_execution": "BLOCKED",
}
UXPILOTE_GRAPH_PLANES = ("physical", "authority", "evidence", "routing", "tools")
UXPILOTE_GRAPH_SOURCE_STATE_DEFAULT = {
    "created": "UNKNOWN",
    "registered": "UNKNOWN",
    "loaded": "UNKNOWN",
    "enforced": "UNKNOWN",
    "evidenced": "UNKNOWN",
}
UXPILOTE_GRAPH_READONLY_ACTIONS = ["inspect", "readback", "prepare charter"]
UXPILOTE_GRAPH_BLOCKED_ACTIONS = [
    "execute audits",
    "mutate files",
    "activate runtime",
    "validate claims",
    "run benchmark",
    "run gameplay",
    "train",
    "generate datasets",
    "create lab/runs",
    "create latest.json",
    "create models/checkpoints",
    "commit/push/branch/PR",
]
SURFACE_MAP_ENTRIES = (
    {
        "surface": "active_runtime_code",
        "path": "src",
        "status": "PASSIVE",
        "owner_hint": "runtime_engine_owners",
        "authority_boundary": "Rust runtime truth; no mutation or validation by studioctl.",
        "read_policy": "path_exists_only",
        "write_policy": "BLOCKED",
    },
    {
        "surface": "tests",
        "path": "tests",
        "status": "PASSIVE",
        "owner_hint": "test_owners",
        "authority_boundary": "Tests are validation assets; studioctl reports boundaries only.",
        "read_policy": "path_exists_only",
        "write_policy": "BLOCKED",
    },
    {
        "surface": "artifacts_runtime_outputs",
        "path": "lab/gameplay_observation/sandbox_outputs",
        "status": "PASSIVE",
        "owner_hint": "sandbox_artifact_owners",
        "authority_boundary": "Generated outputs are non-canonical unless separately routed.",
        "read_policy": "path_exists_only",
        "write_policy": "BLOCKED",
    },
    {
        "surface": "canonical_docs",
        "path": "00_STUDIO_CONTROL",
        "status": "DOCUMENTED_ONLY",
        "owner_hint": "HumanGate",
        "authority_boundary": "Canonical docs inform tasks but do not activate runtime behavior.",
        "read_policy": "path_exists_only",
        "write_policy": "HumanGate_required",
    },
    {
        "surface": "roadmap_docs_only",
        "path": "00_STUDIO_CONTROL/05_STATUS",
        "status": "PASSIVE",
        "owner_hint": "HumanGate",
        "authority_boundary": "Status and roadmap reports are passive evidence records.",
        "read_policy": "path_exists_only",
        "write_policy": "HumanGate_required",
    },
    {
        "surface": "scripts_tooling",
        "path": "scripts/studioV2",
        "status": "IMPLEMENTED",
        "owner_hint": "tooling_owners",
        "authority_boundary": "Tooling may inspect and render bounded outputs; it does not decide claims.",
        "read_policy": "path_exists_only",
        "write_policy": "HumanGate_required",
    },
    {
        "surface": "inference",
        "path": "inference",
        "status": "PASSIVE",
        "owner_hint": "ml_inference_owners",
        "authority_boundary": "Python inference may propose or rerank; it does not decide alone.",
        "read_policy": "path_exists_only",
        "write_policy": "BLOCKED",
    },
    {
        "surface": "lab",
        "path": "lab",
        "status": "PASSIVE",
        "owner_hint": "lab_owners",
        "authority_boundary": "Lab outputs are non-canonical and cannot prove readiness.",
        "read_policy": "path_exists_only",
        "write_policy": "BLOCKED",
    },
    {
        "surface": "schemas",
        "path": "schemas",
        "status": "PASSIVE",
        "owner_hint": "schema_owners",
        "authority_boundary": "Schemas define structure only and do not create runtime authority.",
        "read_policy": "path_exists_only",
        "write_policy": "HumanGate_required",
    },
    {
        "surface": "models_datasets",
        "path": "models",
        "status": "PASSIVE",
        "owner_hint": "ml_data_owners",
        "authority_boundary": "Models and datasets are not inspected or validated by studioctl.",
        "read_policy": "path_exists_only_no_content_read",
        "write_policy": "BLOCKED",
    },
    {
        "surface": "secrets",
        "path": "secrets",
        "status": "BLOCKED",
        "owner_hint": "secret_owners",
        "authority_boundary": "Secrets are forbidden for studioctl inspection.",
        "read_policy": "path_exists_only_no_recurse_no_content_read",
        "write_policy": "BLOCKED",
    },
)


def run_git(args: list[str]) -> tuple[int, str, str]:
    try:
        completed = subprocess.run(
            ["git", *args],
            cwd=PROJECT_ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
    except OSError as exc:
        return 127, "", str(exc)
    return completed.returncode, completed.stdout.strip(), completed.stderr.strip()


def git_branch() -> str:
    code, stdout, _stderr = run_git(["branch", "--show-current"])
    if code == 0 and stdout:
        return stdout
    code, stdout, _stderr = run_git(["status", "--short", "--branch"])
    if code == 0 and stdout:
        first = stdout.splitlines()[0]
        return first.removeprefix("## ").strip() or "UNKNOWN"
    return "UNKNOWN"


def git_head() -> str:
    code, stdout, _stderr = run_git(["rev-parse", "HEAD"])
    return stdout if code == 0 and stdout else "UNKNOWN"


def git_status_lines() -> list[str]:
    code, stdout, _stderr = run_git(["status", "--short"])
    if code != 0 or not stdout:
        return []
    return stdout.splitlines()


def known_report_status(path: Path) -> str:
    return "DOCUMENTED_ONLY" if path.exists() else "NOT_FOUND"


def surface_map_entry(entry: dict[str, str]) -> dict[str, Any]:
    path = PROJECT_ROOT / entry["path"]
    return {
        "surface": entry["surface"],
        "path": entry["path"],
        "exists": path.exists(),
        "status": entry["status"] if path.exists() else "NOT_FOUND",
        "owner_hint": entry["owner_hint"],
        "authority_boundary": entry["authority_boundary"],
        "read_policy": entry["read_policy"],
        "write_policy": entry["write_policy"],
    }


def build_surface_map_payload() -> dict[str, Any]:
    surfaces = [surface_map_entry(entry) for entry in SURFACE_MAP_ENTRIES]
    return {
        "schema_version": "studioctl_surface_map.v0",
        "command": "surface map",
        "claim_posture": CLAIM_POSTURE,
        "no_global_ready_verdict": True,
        "runtime_claim_gate": runtime_claim_gate(),
        "secrets_boundary": {
            "path": "secrets",
            "read_policy": "path_exists_only_no_recurse_no_content_read",
            "content_read_attempted": False,
            "recursive_scan_attempted": False,
            "status": "BLOCKED",
        },
        "surfaces": surfaces,
        "status_by_surface": {item["surface"]: item["status"] for item in surfaces},
    }


def build_status_payload() -> dict[str, Any]:
    changes = git_status_lines()
    return {
        "schema_version": "studioctl_status.v0",
        "command": "status",
        "cwd": str(PROJECT_ROOT),
        "branch": git_branch(),
        "head": git_head(),
        "worktree_status": "PASSIVE" if changes else "DOCUMENTED_ONLY",
        "pre_existing_changes": changes,
        "runtime_claim_gate": {
            "actual_runtime": "UNKNOWN",
            "runtime_status": "BLOCKED",
            "exact_runtime_claim_allowed": False,
            "rule": "Do not claim the exact runtime model unless Codex exposes it explicitly.",
        },
        "claim_posture": CLAIM_POSTURE,
        "known_reports": {name: known_report_status(path) for name, path in KNOWN_REPORTS.items()},
        "status_by_surface": dict(DEFAULT_STATUS_BY_SURFACE),
        "no_global_ready_verdict": True,
    }


def read_text_if_exists(path: Path) -> tuple[str | None, str | None]:
    if not path.exists():
        return None, "NOT_FOUND"
    try:
        return path.read_text(encoding="utf-8"), None
    except OSError as exc:
        return None, f"READ_ERROR: {exc}"


def registration_corpus() -> str:
    chunks: list[str] = []
    for path in REGISTRATION_REFERENCE_PATHS:
        text, error = read_text_if_exists(path)
        if text is not None:
            chunks.append(text)
        elif error and error != "NOT_FOUND":
            chunks.append(error)
    return "\n".join(chunks).lower()


def source_registered(relative_path: str, corpus: str) -> bool:
    normalized = relative_path.replace("\\", "/")
    absolute = str((PROJECT_ROOT / normalized).resolve()).replace("\\", "/")
    name = Path(normalized).name
    candidates = {normalized.lower(), absolute.lower(), name.lower()}
    return any(candidate in corpus for candidate in candidates)


def source_registration_method(relative_path: str, corpus: str) -> str:
    if source_registered(relative_path, corpus):
        return "heuristic_text_reference_match"
    return "heuristic_text_reference_not_found"


def source_entry(relative_path: str, surface: str, corpus: str) -> dict[str, Any]:
    normalized = relative_path.replace("\\", "/")
    path = PROJECT_ROOT / normalized
    text, error = read_text_if_exists(path)
    exists = path.exists()
    loaded = "DOCUMENTED_ONLY" if text is not None else "NOT_FOUND"
    evidence: list[str] = ["fixed_anchor_set"]
    if exists:
        evidence.append("path_exists")
    if text is not None:
        evidence.append("readback_succeeded")
    elif error:
        evidence.append(error)
    registration_method = source_registration_method(normalized, corpus)
    registered = "DOCUMENTED_ONLY" if registration_method == "heuristic_text_reference_match" else "UNKNOWN"
    if registered == "DOCUMENTED_ONLY":
        evidence.append("registration_reference_match")
    enforced = "DOCUMENTED_ONLY" if normalized in ENFORCED_SOURCE_PATHS else "PASSIVE"
    if enforced == "DOCUMENTED_ONLY":
        evidence.append("rule_applied_by_studioctl_sources_scan")
    return {
        "source_path": normalized,
        "surface": surface,
        "created": "IMPLEMENTED" if exists else "NOT_FOUND",
        "registered": registered,
        "registration_method": registration_method,
        "registration_confidence": "HEURISTIC",
        "loaded": loaded,
        "enforced": enforced,
        "evidenced": "DOCUMENTED_ONLY",
        "evidence": evidence,
    }


def build_sources_payload() -> dict[str, Any]:
    corpus = registration_corpus()
    sources = [source_entry(path, surface, corpus) for path, surface in SOURCE_ANCHORS]
    return {
        "schema_version": "studioctl_sources_scan.v0",
        "command": "sources scan",
        "claim_posture": CLAIM_POSTURE,
        "no_global_ready_verdict": True,
        "sources": sources,
        "status_by_surface": dict(DEFAULT_STATUS_BY_SURFACE),
    }


def count_values(items: list[dict[str, Any]], field: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for item in items:
        value = str(item.get(field, "UNKNOWN"))
        counts[value] = counts.get(value, 0) + 1
    return dict(sorted(counts.items()))


def build_source_state_summary(sources_payload: dict[str, Any]) -> dict[str, Any]:
    sources = sources_payload["sources"]
    missing = [item["source_path"] for item in sources if item["created"] == "NOT_FOUND"]
    return {
        "evidence_source_type": "source_readback",
        "total_sources": len(sources),
        "created": count_values(sources, "created"),
        "registered": count_values(sources, "registered"),
        "registration_method": count_values(sources, "registration_method"),
        "registration_confidence": count_values(sources, "registration_confidence"),
        "loaded": count_values(sources, "loaded"),
        "enforced": count_values(sources, "enforced"),
        "evidenced": count_values(sources, "evidenced"),
        "missing_sources": missing,
        "claim_posture": CLAIM_POSTURE,
    }


def build_route_state_summary(route_payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "evidence_source_type": "route_check",
        "candidate_output": route_payload["candidate_output"],
        "intended_surface": route_payload["intended_surface"],
        "route_required": route_payload["route_required"],
        "route_present": route_payload["route_present"],
        "surface_known": route_payload["surface_known"],
        "surface_routable": route_payload["surface_routable"],
        "destination_allowed": route_payload["destination_allowed"],
        "forbidden_destination_hits": route_payload["forbidden_destination_hits"],
        "promotion_gate": route_payload["promotion_gate"],
        "claim_posture": CLAIM_POSTURE,
    }


def build_evidence_board_payload() -> dict[str, Any]:
    status_payload = build_status_payload()
    route_payload = build_route_payload("roadmap_docs_only", "00_STUDIO_CONTROL/05_STATUS/EXAMPLE.md")
    sources_payload = build_sources_payload()
    status_by_surface = dict(status_payload["status_by_surface"])
    status_by_surface["roadmap_docs_only"] = "PASSIVE"
    status_by_surface["scripts_tooling"] = "IMPLEMENTED"
    return {
        "schema_version": "studioctl_evidence_board.v0",
        "command": "evidence board",
        "claim_posture": CLAIM_POSTURE,
        "runtime_claim_gate": status_payload["runtime_claim_gate"],
        "no_global_ready_verdict": True,
        "status_by_surface": status_by_surface,
        "source_state_summary": build_source_state_summary(sources_payload),
        "route_state_summary": build_route_state_summary(route_payload),
        "evidence_sources": [
            {"type": "git_status", "claim_posture": CLAIM_POSTURE},
            {"type": "known_report_presence", "claim_posture": CLAIM_POSTURE},
            {"type": "route_check", "claim_posture": CLAIM_POSTURE},
            {"type": "source_readback", "claim_posture": CLAIM_POSTURE},
        ],
    }


def path_within_project(path: Path) -> bool:
    try:
        path.resolve().relative_to(PROJECT_ROOT)
    except ValueError:
        return False
    return True


def report_forbidden_path_hits(path: Path) -> list[str]:
    hits: list[str] = []
    parts = relative_parts(path)
    if not path_within_project(path):
        hits.append("outside_project_root")
    if "secrets" in parts:
        hits.append("secrets")
    return sorted(set(hits))


def normalized_report_label(value: str) -> str:
    value = re.sub(r"^\s*\d+(?:\.\d+)*\.?\s+", "", value.strip())
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def markdown_headings(text: str) -> set[str]:
    headings: set[str] = set()
    for line in text.splitlines():
        match = re.match(r"^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$", line)
        if match:
            headings.add(normalized_report_label(match.group(1)))
    return headings


def yaml_keys(text: str) -> set[str]:
    keys: set[str] = set()
    for line in text.splitlines():
        match = re.match(r"^\s{0,12}([A-Za-z][A-Za-z0-9_ -]*)\s*:", line)
        if match:
            keys.add(normalized_report_label(match.group(1)))
    return keys


def report_field_present(text: str, markers: tuple[str, ...]) -> bool:
    lowered = text.lower()
    return any(marker.lower() in lowered for marker in markers)


def report_field_structured(text: str, markers: tuple[str, ...]) -> bool:
    structured_labels = markdown_headings(text) | yaml_keys(text)
    return any(normalized_report_label(marker) in structured_labels for marker in markers)


def no_global_ready_true(text: str) -> bool:
    return bool(re.search(r"no[_\s-]*global[_\s-]*ready[_\s-]*verdict\s*[:=]\s*(true|yes)\b", text, re.IGNORECASE))


def claim_verdict_no_claim_allowed(text: str) -> bool:
    lowered = text.lower()
    claim_index = lowered.find("claim_verdict")
    if claim_index == -1:
        claim_index = lowered.find("claim verdict")
    if claim_index == -1:
        return False
    claim_section = text[claim_index:claim_index + 2000]
    return "NO_CLAIM_ALLOWED" in claim_section.upper()


def build_report_inspect_payload(path_text: str) -> dict[str, Any]:
    candidate = normalize_candidate(path_text)
    forbidden_hits = report_forbidden_path_hits(candidate)
    forbidden = bool(forbidden_hits)
    base_payload: dict[str, Any] = {
        "schema_version": "studioctl_report_inspect.v0",
        "command": "report inspect",
        "claim_posture": CLAIM_POSTURE,
        "no_global_ready_verdict": True,
        "report_path": path_text,
        "report_path_resolved": str(candidate),
        "exists": False,
        "forbidden_path": forbidden,
        "forbidden_path_hits": forbidden_hits,
        "read_attempted": False,
        "field_present": {field: False for field in REPORT_REQUIRED_FIELDS},
        "field_structured": {field: False for field in STRUCTURED_FIELD_GROUPS},
        "required_fields": {field: False for field in STRUCTURED_FIELD_GROUPS},
        "missing_fields": list(STRUCTURED_FIELD_GROUPS),
        "no_global_ready_verdict_true": False,
        "claim_verdict_no_claim_allowed": False,
        "commands_run_present": False,
        "skipped_validation_present": False,
        "risks_present": False,
        "status": "BLOCKED" if forbidden else "UNKNOWN",
        "reasons": [],
    }
    if forbidden:
        base_payload["reasons"].append("FORBIDDEN_PATH_NOT_READ")
        return base_payload
    if candidate.suffix.lower() not in TEXT_REPORT_EXTENSIONS:
        base_payload["exists"] = candidate.exists()
        base_payload["status"] = "BLOCKED"
        base_payload["reasons"].append("UNSUPPORTED_REPORT_EXTENSION")
        return base_payload
    if not candidate.exists():
        base_payload["status"] = "NOT_FOUND"
        base_payload["reasons"].append("REPORT_NOT_FOUND")
        return base_payload
    text, error = read_text_if_exists(candidate)
    base_payload["exists"] = True
    base_payload["read_attempted"] = True
    if text is None:
        base_payload["status"] = "BLOCKED"
        base_payload["reasons"].append(error or "READ_FAILED")
        return base_payload
    field_present = {
        field: report_field_present(text, markers)
        for field, markers in REPORT_REQUIRED_FIELDS.items()
    }
    field_structured = {
        field: report_field_structured(text, markers)
        for field, markers in STRUCTURED_FIELD_GROUPS.items()
    }
    missing_fields = [field for field, structured in field_structured.items() if not structured]
    base_payload.update({
        "field_present": field_present,
        "field_structured": field_structured,
        "required_fields": field_structured,
        "missing_fields": missing_fields,
        "no_global_ready_verdict_true": no_global_ready_true(text),
        "claim_verdict_no_claim_allowed": claim_verdict_no_claim_allowed(text),
        "commands_run_present": field_structured["commands_run"],
        "skipped_validation_present": report_field_structured(text, ("skipped_validation", "skipped validation")),
        "risks_present": field_structured["risks"],
        "status": "DOCUMENTED_ONLY" if not missing_fields else "UNKNOWN",
        "reasons": ["REPORT_READBACK_SUCCEEDED"],
    })
    return base_payload


def report_clean_lines(text: str) -> list[str]:
    lines: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("```"):
            continue
        if stripped.startswith("#"):
            continue
        lines.append(line.rstrip())
    return lines


def yamlish_key(raw_key: str) -> str:
    return raw_key.strip().replace(" ", "_")


def yamlish_scalar(value: str) -> Any:
    cleaned = value.strip()
    if not cleaned:
        return UNKNOWN_VALUE
    if cleaned in {"[]", "null", "None", "~"}:
        return [] if cleaned == "[]" else UNKNOWN_VALUE
    if (cleaned.startswith('"') and cleaned.endswith('"')) or (cleaned.startswith("'") and cleaned.endswith("'")):
        cleaned = cleaned[1:-1]
    lowered = cleaned.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False
    return cleaned


def next_yamlish_child_is_list(lines: list[str], start_index: int, parent_indent: int) -> bool:
    for line in lines[start_index + 1:]:
        if not line.strip():
            continue
        indent = len(line) - len(line.lstrip(" "))
        if indent <= parent_indent:
            return False
        return line.lstrip().startswith("- ")
    return False


def parse_yamlish_report(text: str) -> dict[str, Any]:
    lines = report_clean_lines(text)
    root: dict[str, Any] = {}
    stack: list[tuple[int, Any]] = [(-1, root)]
    key_matcher = re.compile(r"^(\s*)([A-Za-z][A-Za-z0-9_ .-]*)\s*:\s*(.*)$")
    list_matcher = re.compile(r"^(\s*)-\s+(.*)$")

    for index, line in enumerate(lines):
        if not line.strip():
            continue
        list_match = list_matcher.match(line)
        if list_match:
            indent = len(list_match.group(1))
            item_text = list_match.group(2).strip()
            while len(stack) > 1 and stack[-1][0] >= indent:
                stack.pop()
            parent = stack[-1][1]
            if isinstance(parent, list):
                nested_key = key_matcher.match(item_text)
                if nested_key:
                    key = yamlish_key(nested_key.group(2))
                    value_text = nested_key.group(3)
                    item: dict[str, Any] = {key: yamlish_scalar(value_text)}
                    parent.append(item)
                    stack.append((indent, item))
                else:
                    parent.append(yamlish_scalar(item_text))
            continue

        key_match = key_matcher.match(line)
        if not key_match:
            continue
        indent = len(key_match.group(1))
        key = yamlish_key(key_match.group(2))
        value_text = key_match.group(3)
        while len(stack) > 1 and stack[-1][0] >= indent:
            stack.pop()
        parent = stack[-1][1]
        if value_text.strip():
            value: Any = yamlish_scalar(value_text)
        else:
            value = [] if next_yamlish_child_is_list(lines, index, indent) else {}
        if isinstance(parent, dict):
            parent[key] = value
        elif isinstance(parent, list):
            parent.append({key: value})
        if isinstance(value, (dict, list)):
            stack.append((indent, value))
    return root


def normalized_lookup_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def mapping_find_case_insensitive(mapping: dict[str, Any], key: str) -> tuple[Any, bool]:
    if key in mapping:
        return mapping[key], True
    target = normalized_lookup_key(key)
    for candidate_key, value in mapping.items():
        if normalized_lookup_key(str(candidate_key)) == target:
            return value, True
    return UNKNOWN_VALUE, False


def mapping_get_case_insensitive(mapping: dict[str, Any], key: str) -> Any:
    value, _found = mapping_find_case_insensitive(mapping, key)
    return value


def get_nested_value_with_found(data: dict[str, Any], path: tuple[str, ...]) -> tuple[Any, bool]:
    current: Any = data
    for key in path:
        if not isinstance(current, dict):
            return UNKNOWN_VALUE, False
        value, found = mapping_find_case_insensitive(current, key)
        if not found:
            return UNKNOWN_VALUE, False
        current = value
    return current, True


def get_nested_value(data: dict[str, Any], path: tuple[str, ...]) -> Any:
    value, _found = get_nested_value_with_found(data, path)
    return value


def set_nested_value(data: dict[str, Any], path: tuple[str, ...], value: Any) -> None:
    current = data
    for key in path[:-1]:
        current = current.setdefault(key, {})
    current[path[-1]] = value


def is_unknown_value(value: Any) -> bool:
    return value in (UNKNOWN_VALUE, "", None, [], {})


def list_value(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if is_unknown_value(value):
        return []
    return [value]


def validation_status_value(value: Any) -> Any:
    if isinstance(value, dict):
        for key in ("status", "result", "result_status"):
            nested = mapping_get_case_insensitive(value, key)
            if isinstance(nested, str) and nested in STATUS_VALUES:
                return nested
        return UNKNOWN_VALUE
    if isinstance(value, list):
        for item in value:
            status = validation_status_value(item)
            if isinstance(status, str) and status in STATUS_VALUES:
                return status
        return UNKNOWN_VALUE
    if isinstance(value, str):
        normalized = value.strip()
        if normalized in STATUS_VALUES:
            return normalized
    return UNKNOWN_VALUE


def normalize_files_changed_value(value: Any) -> Any:
    if isinstance(value, dict):
        for key in ("by_this_task", "repo_source_test_docs_runtime", "paths", "files"):
            nested = mapping_get_case_insensitive(value, key)
            if not is_unknown_value(nested):
                return list_value(nested)
        return UNKNOWN_VALUE
    return list_value(value) if isinstance(value, list) else value


def normalize_commands_run_value(value: Any) -> Any:
    commands = list_value(value)
    normalized: list[Any] = []
    for item in commands:
        if isinstance(item, dict):
            command = mapping_get_case_insensitive(item, "command")
            normalized.append(command if not is_unknown_value(command) else item)
        else:
            normalized.append(item)
    return normalized


def resolve_report_value(parsed: dict[str, Any], field_name: str, path: tuple[str, ...]) -> tuple[Any, bool]:
    for candidate_path in EXECUTOR_REPORT_FIELD_ALIASES.get(field_name, (path,)):
        value, found = get_nested_value_with_found(parsed, candidate_path)
        if found:
            if field_name == "validation.status":
                return validation_status_value(value), True
            if field_name == "files_changed":
                return normalize_files_changed_value(value), True
            if field_name == "commands_run":
                return normalize_commands_run_value(value), True
            return value, True
    return UNKNOWN_VALUE, False


def report_file_producing(fields: dict[str, Any]) -> bool:
    files_changed = list_value(fields.get("files_changed", UNKNOWN_VALUE))
    return any(str(item).strip() and str(item).strip() not in {"[]", "none", "UNKNOWN"} for item in files_changed)


def normalize_executor_report_fields(parsed: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    fields: dict[str, Any] = {}
    missing: list[str] = []
    for field_name, path in EXECUTOR_REPORT_FIELD_PATHS.items():
        value, found = resolve_report_value(parsed, field_name, path)
        if not found:
            value = UNKNOWN_VALUE
            missing.append(field_name)
        set_nested_value(fields, path, value)
    return fields, missing


def executor_report_policy_results(fields: dict[str, Any], missing_fields: list[str]) -> dict[str, Any]:
    reasons: list[str] = []
    strict_missing = {
        "no_global_ready_verdict": "MISSING_NO_GLOBAL_READY_VERDICT",
        "claim_verdict": "MISSING_CLAIM_VERDICT",
        "status_by_surface": "MISSING_STATUS_BY_SURFACE",
    }
    for field_name, reason in strict_missing.items():
        if field_name in missing_fields:
            reasons.append(reason)
    if fields["codex_runtime"]["actual_runtime"] == UNKNOWN_VALUE:
        fields["codex_runtime"]["runtime_status"] = "BLOCKED"
        reasons.append("ACTUAL_RUNTIME_UNKNOWN")
    if report_file_producing(fields):
        if fields["route_check"]["status"] == UNKNOWN_VALUE:
            reasons.append("FILE_PRODUCING_WITHOUT_ROUTE_CHECK")
        if fields["output_routing_result"]["actual_destination"] == UNKNOWN_VALUE:
            reasons.append("FILE_PRODUCING_WITHOUT_OUTPUT_ROUTING_RESULT")
    return {
        "status": "BLOCKED" if reasons else ("UNKNOWN" if missing_fields else "DOCUMENTED_ONLY"),
        "reasons": sorted(set(reasons)) if reasons else ["REPORT_PARSED"],
        "missing_required_fields": missing_fields,
        "file_producing_report": report_file_producing(fields),
    }


def build_report_parse_payload(path_text: str) -> dict[str, Any]:
    candidate = normalize_candidate(path_text)
    forbidden_hits = report_forbidden_path_hits(candidate)
    base_payload: dict[str, Any] = {
        "schema_version": "studioctl_report_parse.v0",
        "command": "report parse",
        "claim_posture": CLAIM_POSTURE,
        "no_global_ready_verdict": True,
        "report_path": path_text,
        "report_path_resolved": str(candidate),
        "exists": candidate.exists(),
        "forbidden_path": bool(forbidden_hits),
        "forbidden_path_hits": forbidden_hits,
        "read_attempted": False,
        "status": "BLOCKED" if forbidden_hits else "UNKNOWN",
        "reasons": [],
        "fields": {},
        "missing_required_fields": list(EXECUTOR_REPORT_FIELD_PATHS),
        "policy_results": {},
        "writes_file": False,
        "task_matrix_write": "BLOCKED",
        "source_registration_write": "BLOCKED",
    }
    if forbidden_hits:
        base_payload["reasons"].append("FORBIDDEN_PATH_NOT_READ")
        return base_payload
    if candidate.suffix.lower() not in TEXT_REPORT_EXTENSIONS:
        base_payload["status"] = "BLOCKED"
        base_payload["reasons"].append("UNSUPPORTED_REPORT_EXTENSION")
        return base_payload
    if not candidate.exists():
        base_payload["status"] = "NOT_FOUND"
        base_payload["reasons"].append("REPORT_NOT_FOUND")
        return base_payload
    text, error = read_text_if_exists(candidate)
    base_payload["read_attempted"] = True
    if text is None:
        base_payload["status"] = "BLOCKED"
        base_payload["reasons"].append(error or "READ_FAILED")
        return base_payload

    parsed = parse_yamlish_report(text)
    fields, missing_fields = normalize_executor_report_fields(parsed)
    policy = executor_report_policy_results(fields, missing_fields)
    base_payload.update({
        "fields": fields,
        "missing_required_fields": missing_fields,
        "policy_results": policy,
        "status": policy["status"],
        "reasons": policy["reasons"],
    })
    return base_payload


def primary_surface_from_fields(fields: dict[str, Any]) -> str:
    status_by_surface = fields.get("status_by_surface", {})
    if isinstance(status_by_surface, dict):
        for surface in CANONICAL_SURFACES:
            value = status_by_surface.get(surface)
            if isinstance(value, str) and value in STATUS_VALUES and value not in {"PASSIVE", "UNKNOWN"}:
                return surface
    return "canonical_docs"


def candidate_status(parse_payload: dict[str, Any], primary_surface: str) -> str:
    if parse_payload["status"] == "BLOCKED":
        return "BLOCKED"
    fields = parse_payload["fields"]
    status_by_surface = fields.get("status_by_surface", {})
    if isinstance(status_by_surface, dict):
        surface_status = status_by_surface.get(primary_surface)
        if isinstance(surface_status, str) and surface_status in STATUS_VALUES:
            return surface_status
    validation_status = fields.get("validation", {}).get("status", UNKNOWN_VALUE)
    return validation_status if validation_status in STATUS_VALUES else "UNKNOWN"


def candidate_evidence_strength(fields: dict[str, Any], primary_surface: str, status: str) -> str:
    evidence_verdict = fields.get("evidence_verdict", {})
    if isinstance(evidence_verdict, dict):
        value = evidence_verdict.get(primary_surface)
        if isinstance(value, str) and value in STATUS_VALUES:
            return value
    validation_status = fields.get("validation", {}).get("status", UNKNOWN_VALUE)
    if validation_status in STATUS_VALUES:
        return validation_status
    return status if status in STATUS_VALUES else "UNKNOWN"


def first_next_step(fields: dict[str, Any]) -> str:
    steps = list_value(fields.get("recommended_next_tasks", UNKNOWN_VALUE))
    return str(steps[0]) if steps else UNKNOWN_VALUE


def build_report_matrix_candidate_payload(path_text: str) -> dict[str, Any]:
    parse_payload = build_report_parse_payload(path_text)
    fields = parse_payload.get("fields", {})
    if not fields:
        fields = {
            "task_id": UNKNOWN_VALUE,
            "files_changed": [],
            "commands_run": [],
            "validation": {"status": UNKNOWN_VALUE},
            "skipped_validation": [],
            "risks": [],
            "software_verdict": UNKNOWN_VALUE,
            "evidence_verdict": UNKNOWN_VALUE,
            "claim_verdict": "BLOCKED",
            "no_global_ready_verdict": "BLOCKED",
            "recommended_next_tasks": [],
            "status_by_surface": "BLOCKED",
        }
    primary_surface = primary_surface_from_fields(fields)
    status = candidate_status(parse_payload, primary_surface)
    return {
        "schema_version": "studioctl_task_matrix_candidate.v0",
        "command": "report matrix-candidate",
        "claim_posture": CLAIM_POSTURE,
        "task_id": fields.get("task_id", UNKNOWN_VALUE),
        "source_report_path": path_text,
        "primary_surface": primary_surface,
        "status": status,
        "evidence_strength": candidate_evidence_strength(fields, primary_surface, status),
        "files_changed": list_value(fields.get("files_changed", UNKNOWN_VALUE)),
        "commands_run": list_value(fields.get("commands_run", UNKNOWN_VALUE)),
        "validation_status": fields.get("validation", {}).get("status", UNKNOWN_VALUE),
        "skipped_validation": list_value(fields.get("skipped_validation", UNKNOWN_VALUE)),
        "risks": list_value(fields.get("risks", UNKNOWN_VALUE)),
        "HumanGate_required": True,
        "next_step_candidate": first_next_step(fields),
        "software_verdict": fields.get("software_verdict", UNKNOWN_VALUE),
        "evidence_verdict": fields.get("evidence_verdict", UNKNOWN_VALUE),
        "claim_verdict": fields.get("claim_verdict", "BLOCKED"),
        "no_global_ready_verdict": fields.get("no_global_ready_verdict", "BLOCKED"),
        "parse_status": parse_payload["status"],
        "parse_reasons": parse_payload["reasons"],
        "task_matrix_write": "BLOCKED",
        "source_registration_write": "BLOCKED",
    }


def logistic_paths() -> dict[str, Path]:
    return {
        "task_matrix": PROJECT_ROOT
        / "00_STUDIO_CONTROL"
        / "05_STATUS"
        / "STUDIO_MASTER_TASK_MATRIX_V0.yaml",
        "file_registry": PROJECT_ROOT / "00_STUDIO_CONTROL" / "03_REGISTRIES" / "FILE_REGISTRY.yaml",
        "source_registration_plan": PROJECT_ROOT
        / "00_STUDIO_CONTROL"
        / "05_STATUS"
        / "STUDIO_SOURCE_REGISTRATION_PLAN_V0.yaml",
        "uxpilote_scripts": PROJECT_ROOT / "scripts" / "uxpilote",
        "venv312": PROJECT_ROOT / ".venv312",
        "dashboard_preview": PROJECT_ROOT
        / "00_STUDIO_CONTROL"
        / "05_STATUS"
        / "UXPILOTE_DASHBOARD_PREVIEW_V0.html",
        "bounded_preview": PROJECT_ROOT
        / "00_STUDIO_CONTROL"
        / "05_STATUS"
        / "UXPILOTE_READONLY_BOUNDED_EXECUTION_PREVIEW_V0.html",
        "roadmap": PROJECT_ROOT / "00_STUDIO_CONTROL" / "10_ROADMAP",
    }


def logistic_input_state(name: str, path: Path) -> dict[str, Any]:
    return {
        "name": name,
        "path": str(path.relative_to(PROJECT_ROOT)) if path.is_relative_to(PROJECT_ROOT) else str(path),
        "exists": path.exists(),
        "status": "DOCUMENTED_ONLY" if path.exists() else "NOT_FOUND",
        "read_mode": "stdlib_text_read" if path.is_file() else "path_exists_only",
    }


def unquote_scalar(value: str) -> str:
    stripped = value.strip()
    if len(stripped) >= 2 and stripped[0] == stripped[-1] and stripped[0] in {'"', "'"}:
        return stripped[1:-1]
    return stripped


def logistic_matrix_entries(text: str) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    current_indent = 0
    for line in text.splitlines():
        task_match = re.match(r"^(\s*)-\s+task_id:\s*(.+?)\s*$", line)
        if task_match:
            if current is not None:
                entries.append(current)
            current = {"task_id": unquote_scalar(task_match.group(2))}
            current_indent = len(task_match.group(1))
            continue
        if current is None:
            continue
        field_match = re.match(r"^(\s+)([A-Za-z_][A-Za-z0-9_]*):\s*(.*?)\s*$", line)
        if not field_match or len(field_match.group(1)) <= current_indent:
            continue
        key = field_match.group(2)
        if key in {
            "source_report_path",
            "primary_surface",
            "surface",
            "status",
            "current_status",
            "evidence_strength",
            "validation_status",
            "runtime_status_reason",
            "HumanGate_required",
        }:
            value = unquote_scalar(field_match.group(3))
            if value.lower() == "true":
                current[key] = True
            elif value.lower() == "false":
                current[key] = False
            else:
                current[key] = value
    if current is not None:
        entries.append(current)
    return entries


def build_logistic_matrix_snapshot(matrix_path: Path) -> dict[str, Any]:
    text, error = read_text_if_exists(matrix_path)
    if text is None:
        return {
            "path": str(matrix_path.relative_to(PROJECT_ROOT)) if matrix_path.is_relative_to(PROJECT_ROOT) else str(matrix_path),
            "status": error or "NOT_FOUND",
            "entries_total": 0,
            "entries": [],
            "blocked_due_actual_runtime_unknown": [],
        }
    entries = logistic_matrix_entries(text)
    blocked_due_runtime = [
        entry
        for entry in entries
        if (entry.get("status") == "BLOCKED" or entry.get("current_status") == "BLOCKED")
        and entry.get("runtime_status_reason") == "ACTUAL_RUNTIME_UNKNOWN"
    ]
    status_counts: dict[str, int] = {}
    for entry in entries:
        status = str(entry.get("current_status") or entry.get("status") or "UNKNOWN")
        status_counts[status] = status_counts.get(status, 0) + 1
    return {
        "path": str(matrix_path.relative_to(PROJECT_ROOT)),
        "status": "DOCUMENTED_ONLY",
        "entries_total": len(entries),
        "status_counts": status_counts,
        "entries": entries,
        "blocked_due_actual_runtime_unknown": [
            {
                "task_id": entry.get("task_id", UNKNOWN_VALUE),
                "source_report_path": entry.get("source_report_path", UNKNOWN_VALUE),
                "primary_surface": entry.get("primary_surface", entry.get("surface", UNKNOWN_VALUE)),
                "HumanGate_required": entry.get("HumanGate_required", True),
            }
            for entry in blocked_due_runtime
        ],
    }


def build_logistic_registry_snapshot(registry_path: Path) -> dict[str, Any]:
    text, error = read_text_if_exists(registry_path)
    if text is None:
        return {
            "path": str(registry_path.relative_to(PROJECT_ROOT)) if registry_path.is_relative_to(PROJECT_ROOT) else str(registry_path),
            "status": error or "NOT_FOUND",
            "registered_path_count": 0,
        }
    registered_paths = re.findall(r"^\s*-\s+path:\s*(.+?)\s*$", text, flags=re.MULTILINE)
    return {
        "path": str(registry_path.relative_to(PROJECT_ROOT)),
        "status": "DOCUMENTED_ONLY",
        "registered_path_count": len(registered_paths),
        "claim_posture_mentions": text.count(CLAIM_POSTURE),
        "contains_task_matrix": "STUDIO_MASTER_TASK_MATRIX_V0.yaml" in text,
        "contains_source_registration_plan": "STUDIO_SOURCE_REGISTRATION_PLAN_V0.yaml" in text,
    }


def logistic_candidate(
    candidate_id: str,
    title: str,
    surface: str,
    status: str,
    reason: str,
    candidate_type: str,
    suggested_task_class: str,
    validation_level: str,
    blocked_actions: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "candidate_id": candidate_id,
        "candidate_type": candidate_type,
        "title": title,
        "surface": surface,
        "status": status,
        "reason": reason,
        "blocked_actions": blocked_actions or [
            "git_mutation",
            "task_matrix_write",
            "registry_write",
            "agent_activation",
            "runtime_execution",
        ],
        "HumanGate_required": True,
        "suggested_task_class": suggested_task_class,
        "validation_level": validation_level,
    }


def build_logistic_candidates(
    matrix_snapshot: dict[str, Any],
    registry_snapshot: dict[str, Any],
    paths: dict[str, Path],
) -> list[dict[str, Any]]:
    candidates = [
        logistic_candidate(
            "residual-worktree-audit",
            "Audit residual local-only and passive artifacts before any cleanup or registration.",
            "canonical_docs",
            "PASSIVE",
            "Residual local signals can be inspected without mutation.",
            "residual_worktree_audit",
            "audit_repo",
            "PASSIVE",
        )
    ]
    if matrix_snapshot["blocked_due_actual_runtime_unknown"]:
        candidates.append(
            logistic_candidate(
                "blocked-matrix-runtime-review",
                "Review matrix entries blocked by ACTUAL_RUNTIME_UNKNOWN before any apply or claim.",
                "canonical_docs",
                "BLOCKED",
                "Existing matrix entries preserve blocked runtime posture and need HumanGate for any next step.",
                "apply_matrix_candidate",
                "docs_workflow",
                "DOCUMENTED_ONLY",
                ["task_matrix_write", "claim_promotion", "runtime_claim", "agent_activation"],
            )
        )
    if registry_snapshot["status"] == "DOCUMENTED_ONLY":
        candidates.append(
            logistic_candidate(
                "register-later-candidates",
                "Triage candidate control docs for a later selective registration task.",
                "canonical_docs",
                "DOCUMENTED_ONLY",
                "FILE_REGISTRY exists and can support a later HumanGate-routed registration batch.",
                "register_later_candidates",
                "docs_workflow",
                "DOCUMENTED_ONLY",
                ["registry_write", "source_index_write", "upload_checklist_write"],
            )
        )
    else:
        candidates.append(
            logistic_candidate(
                "registry-not-found-review",
                "Resolve missing FILE_REGISTRY before source registration planning.",
                "canonical_docs",
                "NOT_FOUND",
                "Registry input was not found, so registration proposals must stay UNKNOWN-safe.",
                "register_later_candidates",
                "audit_repo",
                "PASSIVE",
                ["registry_write", "source_registration_write"],
            )
        )
    if paths["uxpilote_scripts"].exists():
        candidates.append(
            logistic_candidate(
                "local-only-uxpilote-review",
                "Review scripts/uxpilote as local-only tooling without activation.",
                "canonical_docs",
                "PASSIVE",
                "scripts/uxpilote exists locally and remains outside autonomous execution.",
                "local_only_tooling_review",
                "audit_repo",
                "PASSIVE",
                ["scripts_uxpilote_execution", "agent_activation", "git_mutation"],
            )
        )
    if paths["venv312"].exists() or paths["dashboard_preview"].exists() or paths["bounded_preview"].exists():
        candidates.append(
            logistic_candidate(
                "cleanup-passive-artifacts",
                "Prepare a separate cleanup or archive decision for passive local artifacts.",
                "artifacts_runtime_outputs",
                "PASSIVE",
                ".venv312 or HTML preview artifacts are present but cleanup is blocked here.",
                "cleanup_passive_artifacts",
                "audit_repo",
                "PASSIVE",
                ["file_delete", "cleanup", "archive_creation"],
            )
        )
    candidates.append(
        logistic_candidate(
            "rag-readiness-audit",
            "Audit Local RAG readiness without indexing, retrieval, or model calls.",
            "inference",
            "BLOCKED",
            "RAG/LLM/model calls are explicitly blocked; only a future read-only readiness audit is safe.",
            "rag_readiness_audit",
            "audit_repo",
            "PASSIVE",
            ["rag_indexing", "llm_call", "model_call", "network_access"],
        )
    )
    candidates.append(
        logistic_candidate(
            "parser-hardening-followup",
            "Review report parser edge cases from future real reports if needed.",
            "active_runtime_code",
            "PASSIVE",
            "Parser hardening remains bounded tooling work and must not execute report content.",
            "parser_hardening",
            "patch_runtime",
            "TESTED",
            ["report_execution", "task_matrix_write", "registry_write"],
        )
    )
    return candidates


def build_logistic_proposal_payload() -> dict[str, Any]:
    paths = logistic_paths()
    matrix_snapshot = build_logistic_matrix_snapshot(paths["task_matrix"])
    registry_snapshot = build_logistic_registry_snapshot(paths["file_registry"])
    local_signals = {
        "uxpilote_scripts_present": paths["uxpilote_scripts"].exists(),
        "venv312_present": paths["venv312"].exists(),
        "dashboard_preview_present": paths["dashboard_preview"].exists(),
        "bounded_preview_present": paths["bounded_preview"].exists(),
        "roadmap_dir_present": paths["roadmap"].exists(),
    }
    return {
        "schema_version": "studioctl_logistic_proposal.v0",
        "command": "logistic propose-next",
        "mode": "PASSIVE",
        "write_access": "BLOCKED",
        "agent_activation": "BLOCKED",
        "task_matrix_write": "BLOCKED",
        "source_registration_write": "BLOCKED",
        "claim_posture": CLAIM_POSTURE,
        "no_global_ready_verdict": True,
        "summary": {
            "text": "Passive deterministic next-step proposal only; no autonomous loop, no execution, no writes.",
            "local_signals": local_signals,
        },
        "inputs": {
            key: logistic_input_state(key, path)
            for key, path in (
                ("task_matrix", paths["task_matrix"]),
                ("file_registry", paths["file_registry"]),
            )
        },
        "source_state": {
            "rule": "created != registered != loaded != enforced != evidenced",
            "created": "DOCUMENTED_ONLY",
            "registered": "UNKNOWN",
            "loaded": "DOCUMENTED_ONLY",
            "enforced": "DOCUMENTED_ONLY",
            "evidenced": "DOCUMENTED_ONLY",
        },
        "matrix_snapshot": matrix_snapshot,
        "registry_snapshot": registry_snapshot,
        "next_step_candidates": build_logistic_candidates(matrix_snapshot, registry_snapshot, paths),
        "blocked_actions": dict(LOGISTIC_BLOCKED_ACTIONS),
        "HumanGate_required": True,
        "status_by_surface": dict(LOGISTIC_STATUS_BY_SURFACE),
        "software_verdict": dict(LOGISTIC_STATUS_BY_SURFACE),
        "evidence_verdict": {
            **LOGISTIC_STATUS_BY_SURFACE,
            "active_runtime_code": "TESTED",
            "tests": "TESTED",
            "canonical_docs": "TESTED",
        },
        "claim_verdict": {surface: CLAIM_POSTURE for surface in CANONICAL_SURFACES},
    }


def render_logistic_proposal_text(payload: dict[str, Any]) -> str:
    rows = [
        ("schema_version", payload["schema_version"]),
        ("command", payload["command"]),
        ("mode", payload["mode"]),
        ("write_access", payload["write_access"]),
        ("agent_activation", payload["agent_activation"]),
        ("task_matrix_write", payload["task_matrix_write"]),
        ("source_registration_write", payload["source_registration_write"]),
        ("claim_posture", payload["claim_posture"]),
        ("HumanGate_required", payload["HumanGate_required"]),
        ("next_step_candidates", [candidate["candidate_id"] for candidate in payload["next_step_candidates"]]),
        ("no_global_ready_verdict", payload["no_global_ready_verdict"]),
    ]
    return render_table("studioctl logistic propose-next", rows)


def runtime_claim_gate() -> dict[str, Any]:
    return {
        "actual_runtime": "UNKNOWN",
        "runtime_status": "BLOCKED",
        "exact_runtime_claim_allowed": False,
        "rule": "Do not claim the exact runtime model unless Codex exposes it explicitly.",
        "passive_or_proposal_task_allowed": True,
    }


def charter_scope_for_profile(profile: str, target: str) -> tuple[list[str], list[str], list[str]]:
    if profile == "hygiene":
        scope_in = [
            "Inspect hygiene, routing, blocked actions, and evidence completeness for the target.",
            "Produce a proposal-only task charter candidate to stdout.",
        ]
    elif profile == "truth":
        scope_in = [
            "Inspect source/evidence/claim separation for the target.",
            "Produce a proposal-only task charter candidate to stdout.",
        ]
    else:
        scope_in = [
            "Prepare a bounded future patch proposal for the target.",
            "Preserve HumanGate before any implementation or file mutation.",
        ]
    scope_out = [
        "No runtime/gameplay code execution.",
        "No broad test suite execution.",
        "No secret inspection.",
        "No training, benchmark, dataset/model action, latest.json, lab/runs creation, or agent activation.",
        "No commit, push, branch, or PR.",
        "No global ready/not-ready verdict.",
    ]
    target_files = [target] if profile == "upgrade" else []
    return scope_in, scope_out, target_files


def build_charter_render_payload(args: Any) -> dict[str, Any]:
    profile_defaults = PROFILE_DEFAULTS[args.profile]
    task_class = args.task_class or profile_defaults["task_class"]
    reasoning_effort = args.reasoning_effort or TASK_CLASS_REASONING_DEFAULTS.get(task_class, "UNKNOWN")
    surface_known = args.surface in ALL_SURFACES
    task_class_known = task_class in TASK_CLASS_REASONING_DEFAULTS
    file_producing = profile_defaults["file_producing"] or task_class in FILE_PRODUCING_TASK_CLASSES
    route_check_result: dict[str, Any] | None = None
    reasons: list[str] = []
    status = "DOCUMENTED_ONLY"

    if not surface_known:
        status = "BLOCKED"
        reasons.append("UNKNOWN_SURFACE")
    if not task_class_known:
        status = "BLOCKED"
        reasons.append("UNKNOWN_TASK_CLASS")
    if task_class_known and not args.reasoning_effort:
        reasons.append("DEFAULT_REASONING_EFFORT_APPLIED")
    if file_producing and not args.output_route:
        status = "BLOCKED"
        reasons.append("OUTPUT_ROUTE_REQUIRED_FOR_FILE_PRODUCING_TASK")
    if args.output_route:
        route_check_result = build_route_payload(args.surface, args.output_route)
        if route_check_result["status"] == "BLOCKED":
            status = "BLOCKED"
            reasons.append("ROUTE_CHECK_BLOCKED")

    scope_in, scope_out, target_files = charter_scope_for_profile(args.profile, args.target)
    status_by_surface = dict(DEFAULT_STATUS_BY_SURFACE)
    status_by_surface["roadmap_docs_only"] = "PASSIVE"
    status_by_surface["scripts_tooling"] = "IMPLEMENTED"
    validation_level = "DOCUMENTED_ONLY" if args.profile in {"hygiene", "truth"} else "TESTED"
    validation_plan = {
        "expected_level": validation_level,
        "commands": [
            "Read back changed files if a later HumanGate-approved task mutates files.",
            "Run the smallest targeted validation authorized by the future task.",
            "Run git diff --check.",
            "Run git status --short --branch.",
        ],
        "readback_required": True,
        "blocked_validation": [
            "cargo test unless explicitly authorized",
            "full pytest unless explicitly authorized",
            "runtime/gameplay execution",
            "benchmark",
            "training",
            "dataset/model commands",
            "secret reads",
        ],
    }
    task_charter_candidate = {
        "record_type": "task_charter_input",
        "contract_version": "V0",
        "language": "English",
        "task_id": args.task_id,
        "title": args.title,
        "profile": args.profile,
        "target": args.target,
        "surface": args.surface,
        "status": status,
        "codex_runtime": {
            "requested_model": "gpt-5.5",
            "requested_reasoning_effort": reasoning_effort,
            "task_class": task_class,
            "fallback_policy": {
                "if_requested_model_unavailable": "STOP_AND_REPORT",
                "if_actual_model_identifier_hidden": "actual_runtime: UNKNOWN",
                "unknown_runtime_status": "BLOCKED",
            },
            "actual_runtime": "UNKNOWN",
            "runtime_status": "BLOCKED",
            "runtime_claim_rule": "Do not claim the exact runtime model unless Codex exposes it explicitly.",
        },
        "operator_goal": {
            "summary": args.title,
            "purpose": "Prepare a bounded proposal-only task charter candidate.",
            "success_condition": "HumanGate has enough routed scope, validation, and blocked-action context to decide.",
            "claim_posture": CLAIM_POSTURE,
            "human_gate_required": True,
        },
        "uxpilote_chain": {
            "chain_type": args.profile,
            "zone": "studio_control",
            "subzone": "studioctl_charter_render",
            "action_mode": profile_defaults["action_mode"],
            "authority_level": "patch_proposal" if args.profile == "upgrade" else "read_only",
            "qui": {"actor": "codex", "role": "planner", "authority": "patch_proposal"},
            "quoi": {
                "target_object": args.target,
                "task_intent": profile_defaults["task_intent"],
                "expected_output": "task_charter",
            },
            "comment": {
                "allowed_actions": ["Read files.", "Run scoped non-mutating inspection.", "Render candidate to stdout only."],
                "blocked_actions": CHARTER_RENDER_BLOCKED_ACTIONS,
                "validation_mode": profile_defaults["validation_mode"],
                "mutation_policy": profile_defaults["mutation_policy"],
            },
            "ou": {
                "target_path": args.target,
                "output_route": args.output_route or "STDOUT_ONLY",
            },
            "pourquoi": {
                "reason": "Reduce manual Codex task construction while preserving HumanGate.",
                "implementation_rule": "Proposal-only render; do not execute or write the charter.",
                "success_condition": "Bounded candidate rendered for human review.",
                "human_gate_required": True,
            },
        },
        "scope_in": scope_in,
        "scope_out": scope_out,
        "target_files": target_files,
        "output_routing": {
            "produced_file_type": "task_charter_candidate",
            "intended_surface": args.surface,
            "canonical_destination": "NONE",
            "temporary_destination": "STDOUT_ONLY",
            "actual_destination": "STDOUT_ONLY",
            "output_route": args.output_route or "",
            "registration_required": False,
            "project_source_upload_required": False,
            "retention_policy": "stdout-only proposal pending HumanGate",
            "promotion_gate": "HumanGate",
        },
        "blocked_actions": CHARTER_RENDER_BLOCKED_ACTIONS,
        "validation_plan": validation_plan,
        "final_report_required": CHARTER_RENDER_FINAL_REPORT_REQUIRED,
        "status_by_surface": status_by_surface,
        "claim_posture": CLAIM_POSTURE,
        "human_gate_required": True,
        "no_global_ready_verdict": True,
    }
    return {
        "schema_version": "studioctl_charter_render.v0",
        "command": "charter render",
        "status": status,
        "reasons": reasons,
        "claim_posture": CLAIM_POSTURE,
        "runtime_claim_gate": runtime_claim_gate(),
        "no_global_ready_verdict": True,
        "surface_known": surface_known,
        "task_class_known": task_class_known,
        "file_producing": file_producing,
        "writes_file": False,
        "executes_charter": False,
        "task_charter_candidate": task_charter_candidate,
        "route_check_result": route_check_result,
        "blocked_actions": CHARTER_RENDER_BLOCKED_ACTIONS,
        "validation_plan": validation_plan,
        "final_report_required": CHARTER_RENDER_FINAL_REPORT_REQUIRED,
        "status_by_surface": status_by_surface,
    }


def normalize_candidate(path_text: str) -> Path:
    raw_path = Path(path_text)
    if raw_path.is_absolute():
        return raw_path.resolve()
    return (PROJECT_ROOT / raw_path).resolve()


def relative_parts(path: Path) -> tuple[str, ...]:
    try:
        relative = path.resolve().relative_to(PROJECT_ROOT)
    except ValueError:
        return tuple(part.lower() for part in path.resolve().parts)
    return tuple(part.lower() for part in relative.parts)


def path_is_direct_child_of_control_root(parts: tuple[str, ...]) -> bool:
    return len(parts) == 2 and parts[0] == "00_studio_control"


def forbidden_destination_hits(candidate: Path) -> list[str]:
    parts = relative_parts(candidate)
    hits: list[str] = []
    if not path_within_project(candidate):
        hits.append("outside_project_root")
    if not parts:
        hits.append("UNKNOWN_PATH")
        return hits
    if "secrets" in parts:
        hits.append("secrets")
    if parts[0] == "src":
        hits.append("runtime_source_directory")
    if parts[0] == "tests":
        hits.append("test_directory")
    if parts[0] == "lab":
        hits.append("lab")
    if len(parts) >= 3 and parts[0] == "lab" and parts[1] == "runs" and parts[2].startswith("run_"):
        hits.append("lab/runs/RUN_*")
    if parts[0] == "datasets" or "datasets" in parts:
        hits.append("dataset_directory")
    if parts[0] == "models" or "models" in parts:
        hits.append("model_or_checkpoint_directory")
    if any(part == "latest.json" for part in parts):
        hits.append("latest.json")
    if len(parts) >= 2 and parts[0] == "00_studio_control" and parts[1] == "12_pipeline_opening_legacy":
        hits.append("00_STUDIO_CONTROL/12_PIPELINE_OPENING_LEGACY")
    if path_is_direct_child_of_control_root(parts):
        hits.append("00_STUDIO_CONTROL_root")
    return sorted(set(hits))


def known_allowed_destination(candidate: Path, surface: str) -> bool:
    parts = relative_parts(candidate)
    if len(parts) >= 3 and parts[0] == "00_studio_control" and parts[1] == "05_status":
        return surface in {"roadmap_docs_only", "canonical_docs", "artifacts_runtime_outputs"}
    if len(parts) >= 2 and parts[0] == "scripts" and surface in {"active_runtime_code", "scripts_tooling"}:
        return True
    if len(parts) >= 2 and parts[0] == "schemas" and surface == "canonical_docs":
        return True
    return False


def build_route_payload(surface: str, output: str) -> dict[str, Any]:
    candidate = normalize_candidate(output)
    hits = forbidden_destination_hits(candidate)
    route_present = bool(output.strip() and surface.strip())
    surface_known = surface in ALL_SURFACES
    surface_routable = surface in ROUTABLE_SURFACES
    destination_allowed = bool(route_present and surface_routable and not hits and known_allowed_destination(candidate, surface))
    reasons: list[str] = []
    if not surface_known:
        reasons.append("UNKNOWN_SURFACE")
    if surface_known and not surface_routable:
        reasons.append("NON_ROUTABLE_SURFACE")
    if hits:
        reasons.append("FORBIDDEN_DESTINATION")
    if route_present and surface_routable and not hits and not destination_allowed:
        reasons.append("DESTINATION_NOT_RECOGNIZED_FOR_SURFACE")
    if destination_allowed:
        reasons.append("DESTINATION_ALLOWED_BY_PHASE1_RULES")
    status = "DOCUMENTED_ONLY" if destination_allowed else "BLOCKED"
    return {
        "schema_version": "studioctl_route_check.v0",
        "command": "routes check",
        "candidate_output": output,
        "candidate_output_resolved": str(candidate),
        "intended_surface": surface,
        "route_policy_path": str(ROUTE_POLICY_PATH),
        "route_required": True,
        "route_present": route_present,
        "surface_known": surface_known,
        "surface_routable": surface_routable,
        "output_routing_required": True,
        "output_routing_present": route_present,
        "destination_allowed": destination_allowed,
        "forbidden_destination_hits": hits,
        "promotion_gate": "HumanGate",
        "human_gate_required": True,
        "creates_file": False,
        "creates_directory": False,
        "would_create_file": False,
        "directory_creation_attempted": False,
        "claim_posture": CLAIM_POSTURE,
        "registration_required": False,
        "project_source_upload_required": False,
        "status": status,
        "reasons": reasons,
        "no_global_ready_verdict": True,
    }


def relative_path_status(path_text: str, default_status: str = "PASSIVE") -> dict[str, Any]:
    path = PROJECT_ROOT / path_text
    return {
        "path": path_text,
        "exists": path.exists(),
        "status": default_status if path.exists() else "NOT_FOUND",
    }


def canonical_graph_surface(surface: str) -> str:
    if surface in CANONICAL_SURFACES:
        return surface
    if surface in {"scripts_tooling", "schemas"}:
        return "artifacts_runtime_outputs"
    if surface in {"models_datasets"}:
        return "inference"
    if surface in {"lab", "secrets"}:
        return "artifacts_runtime_outputs"
    return "artifacts_runtime_outputs"


def source_state(
    *,
    created: str = "UNKNOWN",
    registered: str = "UNKNOWN",
    loaded: str = "UNKNOWN",
    enforced: str = "UNKNOWN",
    evidenced: str = "UNKNOWN",
) -> dict[str, str]:
    return {
        "created": created,
        "registered": registered,
        "loaded": loaded,
        "enforced": enforced,
        "evidenced": evidenced,
    }


def evidence_item(source: str, command: str, status: str) -> dict[str, str]:
    return {"source": source, "command": command, "status": status}


def graph_node(
    *,
    node_id: str,
    label: str,
    graph_plane: str,
    zone: str,
    surface: str,
    status: str,
    path: str = "",
    node_source_state: dict[str, str] | None = None,
    evidence: list[dict[str, str]] | None = None,
    risk: str = "",
    allowed_actions: list[str] | None = None,
    blocked_actions: list[str] | None = None,
    humangate_required: bool = True,
) -> dict[str, Any]:
    return {
        "id": node_id,
        "label": label,
        "graph_plane": graph_plane,
        "zone": zone,
        "surface": canonical_graph_surface(surface),
        "status": status if status in STATUS_VALUES else "UNKNOWN",
        "path": path,
        "source_state": dict(node_source_state or UXPILOTE_GRAPH_SOURCE_STATE_DEFAULT),
        "evidence": evidence or [],
        "risk": risk,
        "allowed_actions": allowed_actions or list(UXPILOTE_GRAPH_READONLY_ACTIONS),
        "blocked_actions": blocked_actions or list(UXPILOTE_GRAPH_BLOCKED_ACTIONS),
        "humangate_required": humangate_required,
    }


def graph_edge(
    *,
    edge_id: str,
    from_node: str,
    to_node: str,
    kind: str,
    truth_level: str,
    status: str,
    evidence: list[dict[str, str]] | None = None,
    display_style: str | None = None,
    explanation: str = "",
    unsafe_to_render_as_active: bool = False,
) -> dict[str, Any]:
    if display_style is None:
        display_style = {
            "observed": "solid",
            "tested": "solid",
            "documented": "dashed",
            "inferred": "dotted",
            "unknown": "warning",
            "blocked": "blocked",
        }.get(truth_level, "warning")
    return {
        "id": edge_id,
        "from": from_node,
        "to": to_node,
        "kind": kind,
        "truth_level": truth_level,
        "status": status if status in STATUS_VALUES else "UNKNOWN",
        "evidence": evidence or [],
        "display_style": display_style,
        "explanation": explanation,
        "unsafe_to_render_as_active": unsafe_to_render_as_active,
    }


def audit_chain_read(path_or_command: str) -> dict[str, Any]:
    return {"path_or_command": path_or_command, "source_state_required": True}


def audit_chain_product(artifact_type: str, surface: str) -> dict[str, Any]:
    return {"artifact_type": artifact_type, "surface": surface, "canonical": False}


def audit_chain_entry(
    *,
    chain_id: str,
    label: str,
    purpose: str,
    primary_surface: str,
    reads: list[str],
    produces: str,
    ux_targets: list[str],
    blocked_actions: list[str],
    humangate_question: str,
    risk: str,
) -> dict[str, Any]:
    return {
        "id": chain_id,
        "label": label,
        "purpose": purpose,
        "authority": "read_only",
        "primary_surface": primary_surface,
        "status": "DOCUMENTED_ONLY",
        "reads": [audit_chain_read(item) for item in reads],
        "produces": [audit_chain_product(produces, primary_surface)],
        "ux_targets": ux_targets,
        "blocked_actions": blocked_actions,
        "humangate_question": humangate_question,
        "risk": risk,
        "safe_to_run_now": False,
    }


def build_uxpilote_audit_chains_payload() -> dict[str, Any]:
    catalog_exists = UXPILOTE_AUDIT_CHAIN_CATALOG_PATH.exists()
    chains = [
        audit_chain_entry(
            chain_id="system_truth_chain",
            label="System Truth Chain",
            purpose="Separate real, documented, inferred, unknown, and blocked surfaces.",
            primary_surface="canonical_docs",
            reads=[
                "MASTER_DOCS/DOCS_STATUS.md",
                "00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md",
                "00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md",
                "python scripts/studioV2/studioctl.py status --json",
                "python scripts/studioV2/studioctl.py evidence board --json",
                "python scripts/studioV2/studioctl.py surface map --json",
            ],
            produces="truth_packet",
            ux_targets=["Preuves & affirmations", "Cartes systemes / Vue Preuves"],
            blocked_actions=[
                "claim_validation",
                "source_promotion",
                "runtime_activation",
                "benchmark_as_proof",
            ],
            humangate_question=(
                "Which observations are sufficient to prepare a bounded next decision, and which claims remain blocked?"
            ),
            risk="Observations, reports, logs, and local command output can be mistaken for proof.",
        ),
        audit_chain_entry(
            chain_id="scripts_route_chain",
            label="Scripts Route Chain",
            purpose="Resolve scripts/studioV2, control_plane, operator, and uxpilote path drift.",
            primary_surface="artifacts_runtime_outputs",
            reads=[
                "00_STUDIO_CONTROL/01_MAPS/SCRIPTS_ROUTE_ALIGNMENT_CHARTER_V0.md",
                "python scripts/studioV2/studioctl.py uxpilote scripts-control --json",
            ],
            produces="route_alignment_packet",
            ux_targets=["Chemins casses / chemins candidats", "Scripts Control"],
            blocked_actions=[
                "script_execution",
                "silent_path_substitution",
                "file_move_or_rename",
                "CI_mutation",
                "CODEOWNERS_mutation",
            ],
            humangate_question="Which scripts path is source truth, and what remains UNKNOWN until HumanGate decides?",
            risk="Path candidates can be silently promoted or substituted without route authority.",
        ),
        audit_chain_entry(
            chain_id="fusion_matrix_chain",
            label="Fusion Matrix Chain",
            purpose="Merge Cartographer, HygieneAgent, TruthAgent, and RedTeam signals before HumanGate.",
            primary_surface="canonical_docs",
            reads=[
                "00_STUDIO_CONTROL/01_MAPS/UXPILOTE_FUSION_MATRIX_VISUAL_SPEC_V0.md",
                "00_STUDIO_CONTROL/01_MAPS/UXPILOTE_CHAIN_CONTROL_UX_AND_FRAGMENTED_AUDIT_PIPELINE_V0.md",
            ],
            produces="fusion_packet",
            ux_targets=["Fusion Matrix", "A faire maintenant"],
            blocked_actions=[
                "approve_execution",
                "mutate_files",
                "activate_runtime",
                "approve_claims",
                "replace_HumanGate",
            ],
            humangate_question="Should HumanGate approve one bounded next step, block, or request revision?",
            risk="A synthesized packet can be misread as approval instead of pre-HumanGate context.",
        ),
        audit_chain_entry(
            chain_id="humangate_queue_chain",
            label="HumanGate Queue Chain",
            purpose="Convert unresolved risks and source-state gaps into explicit HumanGate decisions.",
            primary_surface="canonical_docs",
            reads=[
                "00_STUDIO_CONTROL/01_MAPS/UXPILOTE_HUMANGATE_QUEUE_SPEC_V0.md",
                "fusion_packet",
            ],
            produces="humangate_decision_queue",
            ux_targets=["A faire maintenant", "HumanGate Queue"],
            blocked_actions=[
                "make_decision",
                "record_actual_decision",
                "execute_decision",
                "mutate_files",
                "trigger_tools",
            ],
            humangate_question=(
                "Which pending decision should be selected by the human, deferred, blocked, or returned for revision?"
            ),
            risk="Decision display can be mistaken for a recorded HumanGate decision.",
        ),
        audit_chain_entry(
            chain_id="tool_catalog_chain",
            label="Tool Catalog Chain",
            purpose="List control tools, what they read, what they produce, and their risks.",
            primary_surface="artifacts_runtime_outputs",
            reads=[
                "docs/studioV2/STUDIOCTL_USAGE_V0.md",
                "python scripts/studioV2/studioctl.py status --json",
                "python scripts/studioV2/studioctl.py evidence board --json",
                "python scripts/studioV2/studioctl.py surface map --json",
                "python scripts/studioV2/studioctl.py uxpilote scripts-control --json",
            ],
            produces="tool_catalog_packet",
            ux_targets=["Outils de controle disponibles"],
            blocked_actions=[
                "execute_tool_from_dashboard",
                "run_unknown_script",
                "create_logs",
                "mutate_files",
                "claim_tool_output_as_proof",
            ],
            humangate_question="Which tool card is safe to inspect, and which action still requires HumanGate?",
            risk="A displayed tool can look like an executable dashboard control.",
        ),
        audit_chain_entry(
            chain_id="llm_lora_guard_chain",
            label="LLM / LoRA Guard Chain",
            purpose="Show future LLM/LoRA support status without allowing training or dataset generation.",
            primary_surface="inference",
            reads=[
                "AGENTS.md",
                "MASTER_DOCS/DOCS_STATUS.md",
                "docs/status/audit files if present",
            ],
            produces="inference_readiness_blocked_packet",
            ux_targets=["LLM / LoRA"],
            blocked_actions=[
                "training",
                "dataset_generation",
                "dataset_reset",
                "model_or_checkpoint_creation",
                "model_promotion",
                "LLM_final_authority",
            ],
            humangate_question=(
                "Should a future LLM/LoRA charter remain blocked, be revised, or be approved as docs-only planning?"
            ),
            risk="Inference planning can drift into dataset, model, checkpoint, training, or authority claims.",
        ),
        audit_chain_entry(
            chain_id="runtime_guard_chain",
            label="Runtime Guard Chain",
            purpose=(
                "Prevent hidden activation of runtime, benchmark, latest.json, lab/runs, model promotion, "
                "Chess960, or DecisionController."
            ),
            primary_surface="active_runtime_code",
            reads=[
                "AGENTS.md",
                "00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md",
                "00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md",
                "00_STUDIO_CONTROL/05_STATUS/SEARCH_003_AUTHORITY_TRACE_SCOPE_CHARTER_V0.yaml if present",
                "00_STUDIO_CONTROL/05_STATUS/HUMANGATE_DECISION_SEARCH_003_AUTHORITY_TRACE_PATCH_V0.yaml if present",
            ],
            produces="blocked_action_packet",
            ux_targets=["Blocages critiques", "Commandes bloquees"],
            blocked_actions=list(UXPILOTE_AUDIT_CHAIN_BLOCKED_ACTIONS),
            humangate_question=(
                "Which blocked action remains locked, and what explicit HumanGate authorization would be required?"
            ),
            risk="Runtime, benchmark, Git, model, or artifact actions can be activated outside a bounded task.",
        ),
    ]
    status_by_surface = {surface: "PASSIVE" for surface in CANONICAL_SURFACES}
    status_by_surface["artifacts_runtime_outputs"] = "IMPLEMENTED"
    status_by_surface["canonical_docs"] = "DOCUMENTED_ONLY"
    return {
        "schema_version": "studioctl_uxpilote_audit_chains.v0",
        "command": "uxpilote audit-chains",
        "cwd": str(PROJECT_ROOT),
        "generated_by": "scripts/studioV2/studioctl.py",
        "source_catalog": {
            "path": UXPILOTE_AUDIT_CHAIN_CATALOG_RELATIVE,
            "exists": catalog_exists,
            "status": "DOCUMENTED_ONLY" if catalog_exists else "NOT_FOUND",
            "registered": "UNKNOWN",
        },
        "chains": chains,
        "chain_groups": {
            "truth": ["system_truth_chain"],
            "routing": ["scripts_route_chain"],
            "fusion": ["fusion_matrix_chain"],
            "humangate": ["humangate_queue_chain"],
            "tools": ["tool_catalog_chain"],
            "inference": ["llm_lora_guard_chain"],
            "runtime_guard": ["runtime_guard_chain"],
        },
        "blocked_actions": dict(UXPILOTE_AUDIT_CHAIN_BLOCKED_ACTIONS),
        "status_by_surface": status_by_surface,
        "claim_posture": CLAIM_POSTURE,
        "no_global_ready_verdict": True,
    }


def build_uxpilote_scripts_control_payload() -> dict[str, Any]:
    blocked_actions = {
        "benchmark": "BLOCKED",
        "gameplay_execution": "BLOCKED",
        "PR_GitHub_automation": "BLOCKED",
        "auto_merge": "BLOCKED",
        "dataset_generation_reset": "BLOCKED",
        "model_checkpoint_creation_promotion": "BLOCKED",
        "lab_runs_creation": "BLOCKED",
        "latest_json_creation": "BLOCKED",
        "commit_push_branch_PR": "BLOCKED",
        "unknown_script_execution": "BLOCKED",
    }
    allowed_actions = ["inspect", "readback", "prepare charter"]
    node_families = {
        "studioctl": {
            "label": "studioctl",
            "paths": [relative_path_status("scripts/studioV2/studioctl.py", "IMPLEMENTED")],
            "surface": "scripts_tooling",
            "status": "IMPLEMENTED" if (PROJECT_ROOT / "scripts/studioV2/studioctl.py").exists() else "NOT_FOUND",
            "evidence": "path_exists_only",
            "risk": "Read-only output must not be treated as runtime authority.",
            "allowed_actions": allowed_actions,
            "blocked_actions": blocked_actions,
        },
        "validators": {
            "label": "validators",
            "paths": [
                relative_path_status("scripts/studioV2/check_workspace_hygiene.py"),
                relative_path_status("scripts/studioV2/validate_control_plane_json.py"),
            ],
            "surface": "scripts_tooling",
            "status": "PASSIVE",
            "evidence": "path_exists_only",
            "risk": "Validator presence is not validation evidence unless separately executed.",
            "allowed_actions": allowed_actions,
            "blocked_actions": blocked_actions,
        },
        "control_plane": {
            "label": "control_plane",
            "paths": [
                relative_path_status("scripts/control_plane", "UNKNOWN"),
                relative_path_status("scripts/studioV2/control_plane", "UNKNOWN"),
            ],
            "surface": "scripts_tooling",
            "status": "UNKNOWN",
            "evidence": "path_exists_only",
            "risk": "Path drift requires HumanGate resolution before source truth.",
            "allowed_actions": allowed_actions,
            "blocked_actions": blocked_actions,
        },
        "operator": {
            "label": "operator",
            "paths": [
                relative_path_status("scripts/operator", "UNKNOWN"),
                relative_path_status("scripts/studioV2/operator", "UNKNOWN"),
            ],
            "surface": "scripts_tooling",
            "status": "UNKNOWN",
            "evidence": "path_exists_only",
            "risk": "Path drift requires HumanGate resolution before source truth.",
            "allowed_actions": allowed_actions,
            "blocked_actions": blocked_actions,
        },
        "uxpilote": {
            "label": "uxpilote",
            "paths": [relative_path_status("scripts/uxpilote", "UNKNOWN")],
            "surface": "inference",
            "status": "UNKNOWN",
            "evidence": "Candidate-only until HumanGate registration decision.",
            "risk": "Local prototype material is not canonical truth by existence.",
            "allowed_actions": allowed_actions,
            "blocked_actions": blocked_actions,
        },
        "blocked_runners": {
            "label": "blocked_runners",
            "paths": [
                relative_path_status("scripts/studioV2/run_benchmark.ps1", "BLOCKED"),
                relative_path_status("scripts/studioV2/run_gameplay_observation.py", "BLOCKED"),
                relative_path_status("scripts/studioV2/agent_pr_operator.py", "BLOCKED"),
                relative_path_status("scripts/studioV2/auto_merge_guard.py", "BLOCKED"),
            ],
            "surface": "artifacts_runtime_outputs",
            "status": "BLOCKED",
            "evidence": "Blocked runner classes are displayed only.",
            "risk": "Runner execution can create runtime evidence, GitHub actions, or claims.",
            "allowed_actions": allowed_actions,
            "blocked_actions": blocked_actions,
        },
        "legacy_root_compatibility": {
            "label": "legacy_root_compatibility",
            "paths": [
                relative_path_status("scripts", "DOCUMENTED_ONLY"),
                relative_path_status("scripts/studioV2", "IMPLEMENTED"),
            ],
            "surface": "scripts_tooling",
            "status": "UNKNOWN",
            "evidence": "Path comparison only.",
            "risk": "Compatibility paths must not be silently promoted.",
            "allowed_actions": allowed_actions,
            "blocked_actions": blocked_actions,
        },
    }
    path_drift = [
        {
            "id": "scripts_root_vs_studioV2",
            "root_path": relative_path_status("scripts", "DOCUMENTED_ONLY"),
            "studioV2_path": relative_path_status("scripts/studioV2", "IMPLEMENTED"),
            "status": "PASSIVE",
            "rule": "Display both paths; do not silently substitute one for the other.",
        },
        {
            "id": "control_plane_root_vs_studioV2",
            "root_path": relative_path_status("scripts/control_plane", "UNKNOWN"),
            "studioV2_path": relative_path_status("scripts/studioV2/control_plane", "UNKNOWN"),
            "status": "UNKNOWN",
            "rule": "HumanGate decides active, legacy, absent, or drift status.",
        },
        {
            "id": "operator_root_vs_studioV2",
            "root_path": relative_path_status("scripts/operator", "UNKNOWN"),
            "studioV2_path": relative_path_status("scripts/studioV2/operator", "UNKNOWN"),
            "status": "UNKNOWN",
            "rule": "HumanGate decides active, legacy, absent, or drift status.",
        },
        {
            "id": "scripts_uxpilote_registration",
            "path": relative_path_status("scripts/uxpilote", "UNKNOWN"),
            "status": "UNKNOWN",
            "rule": "scripts/uxpilote stays UNKNOWN until HumanGate registration decision.",
        },
    ]
    status_by_surface = dict(DEFAULT_STATUS_BY_SURFACE)
    status_by_surface["roadmap_docs_only"] = "PASSIVE"
    status_by_surface["scripts_tooling"] = "IMPLEMENTED"
    return {
        "schema_version": "studioctl_uxpilote_scripts_control.v0",
        "command": "uxpilote scripts-control",
        "cwd": str(PROJECT_ROOT),
        "generated_by": "scripts/studioV2/studioctl.py",
        "node_families": node_families,
        "path_drift": path_drift,
        "known_readonly_entrypoints": [
            "python scripts\\studioV2\\studioctl.py status",
            "python scripts\\studioV2\\studioctl.py evidence board",
            "python scripts\\studioV2\\studioctl.py surface map",
            "python scripts\\studioV2\\studioctl.py status --json",
            "python scripts\\studioV2\\studioctl.py evidence board --json",
            "python scripts\\studioV2\\studioctl.py surface map --json",
        ],
        "blocked_runners": blocked_actions,
        "selected_node_inspector_schema": {
            "path": "",
            "family": "studioctl | validators | control_plane | operator | uxpilote | blocked_runners | legacy_root_compatibility",
            "surface": "active_runtime_code | tests | artifacts_runtime_outputs | canonical_docs | roadmap_docs_only | inference | scripts_tooling",
            "status": "IMPLEMENTED | TESTED | DOCUMENTED_ONLY | PASSIVE | BLOCKED | NOT_FOUND | UNKNOWN",
            "evidence": "",
            "risk": "",
            "allowed_actions": allowed_actions,
            "blocked_actions": list(blocked_actions),
            "next_humangate_question": "",
        },
        "scripts_uxpilote_status": "UNKNOWN",
        "next_humangate_questions": [
            "Should scripts/uxpilote be registered, loaded, enforced, evidenced, archived, quarantined, or discarded?",
            "Which scripts/control_plane versus scripts/studioV2/control_plane path is source truth?",
            "Which scripts/operator versus scripts/studioV2/operator path is source truth?",
            "Which blocked runner classes should remain hidden versus visible as blocked controls?",
        ],
        "status_by_surface": status_by_surface,
        "claim_posture": CLAIM_POSTURE,
        "no_global_ready_verdict": True,
    }


def build_uxpilote_graph_payload() -> dict[str, Any]:
    status_payload = build_status_payload()
    evidence_payload = build_evidence_board_payload()
    surface_payload = build_surface_map_payload()
    scripts_payload = build_uxpilote_scripts_control_payload()
    audit_payload = build_uxpilote_audit_chains_payload()

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []
    source_state_gaps: list[dict[str, str]] = []

    def add_node(node: dict[str, Any]) -> None:
        nodes.append(node)
        for field, value in node["source_state"].items():
            if value == "UNKNOWN":
                source_state_gaps.append(
                    {
                        "node_id": node["id"],
                        "field": field,
                        "status": "UNKNOWN",
                        "reason": "Source-state field is not established by current studioctl graph data.",
                    }
                )

    def path_state(path_text: str, default_status: str = "PASSIVE") -> tuple[bool, str]:
        item = relative_path_status(path_text, default_status)
        return bool(item["exists"]), str(item["status"])

    physical_specs = [
        ("physical_00_studio_control", "00_STUDIO_CONTROL", "00_STUDIO_CONTROL", "studio_control", "canonical_docs", "DOCUMENTED_ONLY"),
        ("physical_01_maps", "00_STUDIO_CONTROL/01_MAPS", "00_STUDIO_CONTROL/01_MAPS", "studio_control", "canonical_docs", "DOCUMENTED_ONLY"),
        ("physical_05_status", "00_STUDIO_CONTROL/05_STATUS", "00_STUDIO_CONTROL/05_STATUS", "studio_control", "roadmap_docs_only", "PASSIVE"),
        ("physical_10_roadmap", "00_STUDIO_CONTROL/10_ROADMAP", "00_STUDIO_CONTROL/10_ROADMAP", "studio_control", "roadmap_docs_only", "PASSIVE"),
        ("physical_scripts", "scripts", "scripts", "scripts", "artifacts_runtime_outputs", "PASSIVE"),
        ("physical_scripts_studiov2", "scripts/studioV2", "scripts/studioV2", "scripts", "artifacts_runtime_outputs", "IMPLEMENTED"),
        ("physical_scripts_uxpilote", "scripts/uxpilote", "scripts/uxpilote", "scripts", "inference", "UNKNOWN"),
        ("physical_src", "src", "src", "runtime", "active_runtime_code", "PASSIVE"),
        ("physical_tests", "tests", "tests", "tests", "tests", "PASSIVE"),
        ("physical_lab_runs", "lab/runs", "lab/runs", "runtime_outputs", "artifacts_runtime_outputs", "PASSIVE"),
        ("physical_models", "models", "models", "inference", "inference", "PASSIVE"),
        ("physical_datasets", "datasets", "datasets", "inference", "inference", "PASSIVE"),
        ("physical_github", ".github", ".github", "repo_automation", "canonical_docs", "PASSIVE"),
    ]
    for node_id, label, path_text, zone, surface, default_status in physical_specs:
        exists, status = path_state(path_text, default_status)
        add_node(
            graph_node(
                node_id=node_id,
                label=label,
                graph_plane="physical",
                zone=zone,
                surface=surface,
                status=status,
                path=path_text,
                node_source_state=source_state(
                    created="IMPLEMENTED" if exists else "NOT_FOUND",
                    registered="UNKNOWN",
                    loaded="DOCUMENTED_ONLY",
                    enforced="PASSIVE",
                    evidenced="DOCUMENTED_ONLY",
                ),
                evidence=[evidence_item("filesystem", "path_exists_only", status)],
                risk="Path existence is not source authority.",
            )
        )

    physical_contains = [
        ("edge_contains_control_maps", "physical_00_studio_control", "physical_01_maps"),
        ("edge_contains_control_status", "physical_00_studio_control", "physical_05_status"),
        ("edge_contains_control_roadmap", "physical_00_studio_control", "physical_10_roadmap"),
        ("edge_contains_scripts_studiov2", "physical_scripts", "physical_scripts_studiov2"),
        ("edge_contains_scripts_uxpilote", "physical_scripts", "physical_scripts_uxpilote"),
    ]
    for edge_id, from_node, to_node in physical_contains:
        edges.append(
            graph_edge(
                edge_id=edge_id,
                from_node=from_node,
                to_node=to_node,
                kind="contains",
                truth_level="observed",
                status="PASSIVE",
                evidence=[evidence_item("filesystem", "Get-ChildItem/Test-Path equivalent", "PASSIVE")],
                explanation="Observed parent-child relationship on disk.",
            )
        )

    authority_nodes = [
        ("authority_humangate", "HumanGate", "human_gate", "canonical_docs", "DOCUMENTED_ONLY", "Final human authority for mutation, promotion, activation, and claims."),
        ("authority_uxpilote", "UxPilote", "cockpit", "inference", "UNKNOWN", "Visualizes and prepares only; candidate-only until HumanGate."),
        ("authority_codex", "Codex", "executor", "inference", "PASSIVE", "Executes only bounded authorized tasks."),
        ("authority_studioctl", "studioctl", "tooling", "artifacts_runtime_outputs", "IMPLEMENTED", "Read-only structured data provider."),
        ("authority_search", "Search", "runtime_authority", "active_runtime_code", "DOCUMENTED_ONLY", "Documented final gameplay decision authority."),
        ("authority_neural", "Neural", "inference", "inference", "PASSIVE", "Proposes and reranks only."),
        ("authority_llm", "LLM", "inference", "inference", "PASSIVE", "Support/planning only; no final authority."),
        ("authority_rust_runtime", "Rust runtime", "runtime", "active_runtime_code", "PASSIVE", "Runtime truth, not changed by studioctl."),
        ("authority_python_tooling", "Python tooling", "tooling", "artifacts_runtime_outputs", "PASSIVE", "Tooling and inference helpers."),
    ]
    for node_id, label, zone, surface, status, risk in authority_nodes:
        add_node(
            graph_node(
                node_id=node_id,
                label=label,
                graph_plane="authority",
                zone=zone,
                surface=surface,
                status=status,
                node_source_state=source_state(
                    created="DOCUMENTED_ONLY",
                    registered="UNKNOWN",
                    loaded="DOCUMENTED_ONLY",
                    enforced="DOCUMENTED_ONLY",
                    evidenced="DOCUMENTED_ONLY",
                ),
                evidence=[evidence_item("doctrine", "AGENTS.md and UxPilote docs", status)],
                risk=risk,
            )
        )

    edges.extend(
        [
            graph_edge(
                edge_id="edge_humangate_authorizes_claims",
                from_node="authority_humangate",
                to_node="authority_uxpilote",
                kind="authorizes",
                truth_level="documented",
                status="DOCUMENTED_ONLY",
                evidence=[evidence_item("AGENTS.md", "readback", "DOCUMENTED_ONLY")],
                explanation="HumanGate decides mutation, promotion, activation, and claim status.",
            ),
            graph_edge(
                edge_id="edge_search_decides_gameplay",
                from_node="authority_search",
                to_node="authority_rust_runtime",
                kind="authorizes",
                truth_level="documented",
                status="DOCUMENTED_ONLY",
                evidence=[evidence_item("AGENTS.md", "readback", "DOCUMENTED_ONLY")],
                explanation="Search remains final gameplay decision authority.",
            ),
            graph_edge(
                edge_id="edge_neural_proposes_to_search",
                from_node="authority_neural",
                to_node="authority_search",
                kind="prepares",
                truth_level="documented",
                status="DOCUMENTED_ONLY",
                evidence=[evidence_item("AGENTS.md", "readback", "DOCUMENTED_ONLY")],
                explanation="Neural proposes/reranks and does not decide alone.",
            ),
            graph_edge(
                edge_id="edge_llm_final_authority_blocked",
                from_node="authority_llm",
                to_node="authority_rust_runtime",
                kind="blocks",
                truth_level="blocked",
                status="BLOCKED",
                evidence=[evidence_item("AGENTS.md", "readback", "BLOCKED")],
                explanation="LLM final gameplay authority is blocked.",
                unsafe_to_render_as_active=True,
            ),
        ]
    )

    evidence_nodes = [
        ("evidence_tests", "tests", "tests", "tests", "PASSIVE", "Validation assets; not run by graph command."),
        ("evidence_executor_reports", "executor reports", "reports", "artifacts_runtime_outputs", "PASSIVE", "Reports are observation records."),
        ("evidence_status_reports", "status reports", "reports", "roadmap_docs_only", "PASSIVE", "Status files are observations."),
        ("evidence_logs_reports", "logs/reports", "reports", "artifacts_runtime_outputs", "PASSIVE", "Logs/reports are not proof of activation."),
        ("evidence_benchmark_summaries", "benchmark summaries", "reports", "artifacts_runtime_outputs", "BLOCKED", "Benchmark proof claims are blocked."),
        ("evidence_studioctl_json", "studioctl JSON", "tooling", "artifacts_runtime_outputs", "IMPLEMENTED", "Structured read-only command output."),
        ("evidence_humangate_records", "HumanGate records", "human_gate", "canonical_docs", "DOCUMENTED_ONLY", "Decision records are separate HumanGate artifacts."),
        ("evidence_canonical_docs", "canonical docs", "docs", "canonical_docs", "DOCUMENTED_ONLY", "Docs inform, but do not activate runtime."),
    ]
    for node_id, label, zone, surface, status, risk in evidence_nodes:
        add_node(
            graph_node(
                node_id=node_id,
                label=label,
                graph_plane="evidence",
                zone=zone,
                surface=surface,
                status=status,
                evidence=[evidence_item("studioctl evidence board", "internal payload", status)],
                risk=risk,
            )
        )

    edges.extend(
        [
            graph_edge(
                edge_id="edge_studioctl_json_observes_status",
                from_node="evidence_studioctl_json",
                to_node="evidence_status_reports",
                kind="observes",
                truth_level="tested",
                status="TESTED",
                evidence=[evidence_item("studioctl", "uxpilote graph aggregates status/evidence/surface payloads", "TESTED")],
                explanation="Graph command built from existing internal JSON payload builders.",
            ),
            graph_edge(
                edge_id="edge_report_log_claim_blocked",
                from_node="evidence_logs_reports",
                to_node="authority_humangate",
                kind="claims",
                truth_level="blocked",
                status="BLOCKED",
                evidence=[evidence_item("AGENTS.md", "readback", "BLOCKED")],
                explanation="Reports/logs/benchmarks are observations, not claim proof.",
                unsafe_to_render_as_active=True,
            ),
        ]
    )

    routing_paths = [
        ("routing_scripts_root", "scripts/", "scripts", "scripts", "artifacts_runtime_outputs", "DOCUMENTED_ONLY"),
        ("routing_scripts_studiov2", "scripts/studioV2/", "scripts/studioV2", "scripts", "artifacts_runtime_outputs", "IMPLEMENTED"),
        ("routing_control_plane_root", "scripts/control_plane/", "scripts/control_plane", "scripts", "artifacts_runtime_outputs", "UNKNOWN"),
        ("routing_control_plane_studiov2", "scripts/studioV2/control_plane/", "scripts/studioV2/control_plane", "scripts", "artifacts_runtime_outputs", "UNKNOWN"),
        ("routing_operator_root", "scripts/operator/", "scripts/operator", "scripts", "artifacts_runtime_outputs", "UNKNOWN"),
        ("routing_operator_studiov2", "scripts/studioV2/operator/", "scripts/studioV2/operator", "scripts", "artifacts_runtime_outputs", "UNKNOWN"),
        ("routing_scripts_uxpilote", "scripts/uxpilote/", "scripts/uxpilote", "scripts", "inference", "UNKNOWN"),
        ("routing_maps", "00_STUDIO_CONTROL/01_MAPS", "00_STUDIO_CONTROL/01_MAPS", "studio_control", "canonical_docs", "DOCUMENTED_ONLY"),
        ("routing_status", "00_STUDIO_CONTROL/05_STATUS", "00_STUDIO_CONTROL/05_STATUS", "studio_control", "roadmap_docs_only", "PASSIVE"),
        ("routing_roadmap", "00_STUDIO_CONTROL/10_ROADMAP", "00_STUDIO_CONTROL/10_ROADMAP", "studio_control", "roadmap_docs_only", "PASSIVE"),
    ]
    for node_id, label, path_text, zone, surface, default_status in routing_paths:
        exists, status = path_state(path_text, default_status)
        if default_status == "UNKNOWN" and exists:
            status = "UNKNOWN"
        add_node(
            graph_node(
                node_id=node_id,
                label=label,
                graph_plane="routing",
                zone=zone,
                surface=surface,
                status=status,
                path=path_text,
                node_source_state=source_state(
                    created="IMPLEMENTED" if exists else "NOT_FOUND",
                    registered="UNKNOWN",
                    loaded="DOCUMENTED_ONLY",
                    enforced="UNKNOWN" if status == "UNKNOWN" else "DOCUMENTED_ONLY",
                    evidenced="DOCUMENTED_ONLY",
                ),
                evidence=[evidence_item("scripts-control", "uxpilote scripts-control --json", status)],
                risk="Route path existence is not source truth.",
            )
        )

    for drift in scripts_payload["path_drift"]:
        drift_id = drift["id"]
        if drift_id == "scripts_root_vs_studioV2":
            from_node, to_node = "routing_scripts_root", "routing_scripts_studiov2"
        elif drift_id == "control_plane_root_vs_studioV2":
            from_node, to_node = "routing_control_plane_root", "routing_control_plane_studiov2"
        elif drift_id == "operator_root_vs_studioV2":
            from_node, to_node = "routing_operator_root", "routing_operator_studiov2"
        else:
            from_node, to_node = "routing_scripts_uxpilote", "authority_humangate"
        truth_level = "unknown" if drift["status"] == "UNKNOWN" else "observed"
        edges.append(
            graph_edge(
                edge_id=f"edge_route_{drift_id}",
                from_node=from_node,
                to_node=to_node,
                kind="routes_to",
                truth_level=truth_level,
                status=drift["status"],
                evidence=[evidence_item("scripts-control", "uxpilote scripts-control --json", drift["status"])],
                explanation=drift["rule"],
                unsafe_to_render_as_active=drift["status"] == "UNKNOWN",
            )
        )

    tool_commands = [
        ("tool_status", "studioctl status", "status", "IMPLEMENTED"),
        ("tool_evidence_board", "studioctl evidence board", "evidence", "IMPLEMENTED"),
        ("tool_surface_map", "studioctl surface map", "surface", "IMPLEMENTED"),
        ("tool_scripts_control", "studioctl uxpilote scripts-control", "scripts", "IMPLEMENTED"),
        ("tool_audit_chains", "studioctl uxpilote audit-chains", "tools", "IMPLEMENTED"),
        ("tool_graph", "studioctl uxpilote graph", "tools", "IMPLEMENTED"),
        ("tool_dashboard", "UxPilote dashboard", "dashboard", "artifacts_runtime_outputs", "UNKNOWN"),
    ]
    for item in tool_commands:
        if len(item) == 4:
            node_id, label, zone, status = item
            surface = "artifacts_runtime_outputs"
        else:
            node_id, label, zone, surface, status = item
        add_node(
            graph_node(
                node_id=node_id,
                label=label,
                graph_plane="tools",
                zone=zone,
                surface=surface,
                status=status,
                evidence=[evidence_item("studioctl", "internal command registry", status)],
                risk="Tool output is local evidence only, not runtime truth.",
            )
        )

    for chain in audit_payload["chains"]:
        add_node(
            graph_node(
                node_id=f"tool_chain_{chain['id']}",
                label=chain["label"],
                graph_plane="tools",
                zone="audit_chain",
                surface=chain["primary_surface"],
                status=chain["status"],
                evidence=[evidence_item("audit-chains", "uxpilote audit-chains --json", chain["status"])],
                risk=chain["risk"],
                blocked_actions=list(chain["blocked_actions"]),
            )
        )
        edges.append(
            graph_edge(
                edge_id=f"edge_graph_reads_{chain['id']}",
                from_node="tool_graph",
                to_node=f"tool_chain_{chain['id']}",
                kind="reads",
                truth_level="tested",
                status="TESTED",
                evidence=[evidence_item("studioctl", "uxpilote graph --json", "TESTED")],
                explanation="Graph command aggregates audit-chain JSON payload data without executing the chain.",
            )
        )
        edges.append(
            graph_edge(
                edge_id=f"edge_chain_runs_command_blocked_{chain['id']}",
                from_node=f"tool_chain_{chain['id']}",
                to_node="authority_python_tooling",
                kind="blocks",
                truth_level="blocked",
                status="BLOCKED",
                evidence=[evidence_item("audit-chains", "safe_to_run_now false", "BLOCKED")],
                explanation="Audit-chain cards are references only and must not execute commands.",
                unsafe_to_render_as_active=True,
            )
        )

    edges.extend(
        [
            graph_edge(
                edge_id="edge_graph_reads_status",
                from_node="tool_graph",
                to_node="tool_status",
                kind="reads",
                truth_level="tested",
                status="TESTED",
                evidence=[evidence_item("studioctl", status_payload["schema_version"], "TESTED")],
                explanation="Graph backend aggregates status payload.",
            ),
            graph_edge(
                edge_id="edge_graph_reads_evidence",
                from_node="tool_graph",
                to_node="tool_evidence_board",
                kind="reads",
                truth_level="tested",
                status="TESTED",
                evidence=[evidence_item("studioctl", evidence_payload["schema_version"], "TESTED")],
                explanation="Graph backend aggregates evidence board payload.",
            ),
            graph_edge(
                edge_id="edge_graph_reads_surface",
                from_node="tool_graph",
                to_node="tool_surface_map",
                kind="reads",
                truth_level="tested",
                status="TESTED",
                evidence=[evidence_item("studioctl", surface_payload["schema_version"], "TESTED")],
                explanation="Graph backend aggregates surface map payload.",
            ),
            graph_edge(
                edge_id="edge_graph_reads_scripts_control",
                from_node="tool_graph",
                to_node="tool_scripts_control",
                kind="reads",
                truth_level="tested",
                status="TESTED",
                evidence=[evidence_item("studioctl", scripts_payload["schema_version"], "TESTED")],
                explanation="Graph backend aggregates scripts-control payload.",
            ),
            graph_edge(
                edge_id="edge_dashboard_renders_studioctl_json",
                from_node="tool_dashboard",
                to_node="evidence_studioctl_json",
                kind="renders",
                truth_level="documented",
                status="DOCUMENTED_ONLY",
                evidence=[evidence_item("docs", "scripts/uxpilote README and prior validation", "DOCUMENTED_ONLY")],
                explanation="Dashboard renders studioctl JSON in prior bounded preview tasks, but is not source truth.",
                unsafe_to_render_as_active=True,
            ),
            graph_edge(
                edge_id="edge_uxpilote_executes_audits_blocked",
                from_node="authority_uxpilote",
                to_node="tool_audit_chains",
                kind="blocks",
                truth_level="blocked",
                status="BLOCKED",
                evidence=[evidence_item("audit-chains", "safe_to_run_now false", "BLOCKED")],
                explanation="UxPilote must not execute audits.",
                unsafe_to_render_as_active=True,
            ),
            graph_edge(
                edge_id="edge_dashboard_html_canonical_truth_blocked",
                from_node="tool_dashboard",
                to_node="evidence_canonical_docs",
                kind="claims",
                truth_level="blocked",
                status="BLOCKED",
                evidence=[evidence_item("output routing", "dashboard preview is artifact", "BLOCKED")],
                explanation="Generated dashboard HTML is not canonical truth.",
                unsafe_to_render_as_active=True,
            ),
            graph_edge(
                edge_id="edge_lab_models_datasets_readiness_blocked",
                from_node="physical_lab_runs",
                to_node="evidence_benchmark_summaries",
                kind="claims",
                truth_level="blocked",
                status="BLOCKED",
                evidence=[evidence_item("AGENTS.md", "guardrails", "BLOCKED")],
                explanation="lab/runs/latest.json/models/datasets cannot prove readiness.",
                unsafe_to_render_as_active=True,
            ),
            graph_edge(
                edge_id="edge_scripts_uxpilote_registered_truth_unknown",
                from_node="routing_scripts_uxpilote",
                to_node="authority_humangate",
                kind="depends_on",
                truth_level="unknown",
                status="UNKNOWN",
                evidence=[evidence_item("scripts-control", "scripts_uxpilote_status UNKNOWN", "UNKNOWN")],
                explanation="scripts/uxpilote registration/source-truth decision is unresolved.",
                unsafe_to_render_as_active=True,
            ),
        ]
    )

    blocked_edges = [edge for edge in edges if edge["truth_level"] == "blocked" or edge["status"] == "BLOCKED"]
    unsafe_edges = [edge for edge in edges if edge["unsafe_to_render_as_active"]]
    humangate_questions = [
        {"source": "scripts-control", "question": question, "status": "UNKNOWN"}
        for question in scripts_payload["next_humangate_questions"]
    ]
    humangate_questions.extend(
        {
            "source": "audit-chains",
            "chain_id": chain["id"],
            "question": chain["humangate_question"],
            "status": "UNKNOWN",
        }
        for chain in audit_payload["chains"]
    )

    status_by_surface = {surface: "PASSIVE" for surface in CANONICAL_SURFACES}
    status_by_surface["artifacts_runtime_outputs"] = "IMPLEMENTED"
    status_by_surface["canonical_docs"] = "DOCUMENTED_ONLY"

    return {
        "schema_version": "studioctl_uxpilote_graph.v0",
        "command": "uxpilote graph",
        "cwd": str(PROJECT_ROOT),
        "generated_by": "scripts/studioV2/studioctl.py",
        "graph_planes": list(UXPILOTE_GRAPH_PLANES),
        "nodes": nodes,
        "edges": edges,
        "blocked_edges": blocked_edges,
        "unsafe_edges": unsafe_edges,
        "source_state_gaps": source_state_gaps,
        "humangate_questions": humangate_questions,
        "status_by_surface": status_by_surface,
        "claim_posture": CLAIM_POSTURE,
        "no_global_ready_verdict": True,
    }


def render_table(title: str, rows: list[tuple[str, Any]]) -> str:
    key_width = max(len(key) for key, _value in rows) if rows else 0
    lines = [title]
    for key, value in rows:
        if isinstance(value, (list, dict)):
            rendered = json.dumps(value, sort_keys=True)
        else:
            rendered = str(value)
        lines.append(f"{key.ljust(key_width)} : {rendered}")
    return "\n".join(lines) + "\n"


def render_status_text(payload: dict[str, Any]) -> str:
    rows = [
        ("cwd", payload["cwd"]),
        ("branch", payload["branch"]),
        ("head", payload["head"]),
        ("worktree_status", payload["worktree_status"]),
        ("pre_existing_changes", payload["pre_existing_changes"]),
        ("runtime_claim_gate", payload["runtime_claim_gate"]),
        ("claim_posture", payload["claim_posture"]),
        ("known_reports", payload["known_reports"]),
        ("no_global_ready_verdict", payload["no_global_ready_verdict"]),
    ]
    return render_table("studioctl status", rows)


def render_route_text(payload: dict[str, Any]) -> str:
    rows = [
        ("candidate_output", payload["candidate_output"]),
        ("intended_surface", payload["intended_surface"]),
        ("route_required", payload["route_required"]),
        ("route_present", payload["route_present"]),
        ("surface_known", payload["surface_known"]),
        ("surface_routable", payload["surface_routable"]),
        ("destination_allowed", payload["destination_allowed"]),
        ("forbidden_destination_hits", payload["forbidden_destination_hits"]),
        ("promotion_gate", payload["promotion_gate"]),
        ("creates_file", payload["creates_file"]),
        ("creates_directory", payload["creates_directory"]),
        ("claim_posture", payload["claim_posture"]),
        ("status", payload["status"]),
        ("no_global_ready_verdict", payload["no_global_ready_verdict"]),
    ]
    return render_table("studioctl routes check", rows)


def render_sources_text(payload: dict[str, Any]) -> str:
    lines = ["studioctl sources scan"]
    for item in payload["sources"]:
        lines.append(
            " - "
            + item["source_path"]
            + f" | surface={item['surface']}"
            + f" | created={item['created']}"
            + f" | registered={item['registered']}"
            + f" | registration_method={item['registration_method']}"
            + f" | loaded={item['loaded']}"
            + f" | enforced={item['enforced']}"
            + f" | evidenced={item['evidenced']}"
        )
    lines.extend(
        [
            f"claim_posture: {payload['claim_posture']}",
            f"no_global_ready_verdict: {payload['no_global_ready_verdict']}",
        ]
    )
    return "\n".join(lines) + "\n"


def render_surface_map_text(payload: dict[str, Any]) -> str:
    lines = ["studioctl surface map"]
    for item in payload["surfaces"]:
        lines.append(
            " - "
            + item["surface"]
            + f" | path={item['path']}"
            + f" | exists={item['exists']}"
            + f" | status={item['status']}"
            + f" | owner_hint={item['owner_hint']}"
            + f" | authority_boundary={item['authority_boundary']}"
            + f" | read_policy={item['read_policy']}"
            + f" | write_policy={item['write_policy']}"
        )
    lines.extend(
        [
            f"secrets_boundary: {json.dumps(payload['secrets_boundary'], sort_keys=True)}",
            f"claim_posture: {payload['claim_posture']}",
            f"no_global_ready_verdict: {payload['no_global_ready_verdict']}",
        ]
    )
    return "\n".join(lines) + "\n"


def render_evidence_board_text(payload: dict[str, Any]) -> str:
    source_summary = payload["source_state_summary"]
    route_summary = payload["route_state_summary"]
    sections = [
        "studioctl evidence board\n",
        render_table("claim_posture", [
            ("claim_posture", payload["claim_posture"]),
            ("runtime_claim_gate", payload["runtime_claim_gate"]),
            ("no_global_ready_verdict", payload["no_global_ready_verdict"]),
        ]),
        render_table("status_by_surface", list(payload["status_by_surface"].items())),
        render_table("source_state_summary", [
            ("evidence_source_type", source_summary["evidence_source_type"]),
            ("total_sources", source_summary["total_sources"]),
            ("created", source_summary["created"]),
            ("registered", source_summary["registered"]),
            ("registration_method", source_summary["registration_method"]),
            ("registration_confidence", source_summary["registration_confidence"]),
            ("loaded", source_summary["loaded"]),
            ("enforced", source_summary["enforced"]),
            ("evidenced", source_summary["evidenced"]),
            ("missing_sources", source_summary["missing_sources"]),
            ("claim_posture", source_summary["claim_posture"]),
        ]),
        render_table("route_state_summary", [
            ("evidence_source_type", route_summary["evidence_source_type"]),
            ("candidate_output", route_summary["candidate_output"]),
            ("intended_surface", route_summary["intended_surface"]),
            ("route_required", route_summary["route_required"]),
            ("route_present", route_summary["route_present"]),
            ("surface_known", route_summary["surface_known"]),
            ("surface_routable", route_summary["surface_routable"]),
            ("destination_allowed", route_summary["destination_allowed"]),
            ("forbidden_destination_hits", route_summary["forbidden_destination_hits"]),
            ("promotion_gate", route_summary["promotion_gate"]),
            ("claim_posture", route_summary["claim_posture"]),
        ]),
        render_table(
            "evidence_sources",
            [(item["type"], item["claim_posture"]) for item in payload["evidence_sources"]],
        ),
    ]
    return "\n".join(sections)


def render_report_inspect_text(payload: dict[str, Any]) -> str:
    rows = [
        ("report_path", payload["report_path"]),
        ("exists", payload["exists"]),
        ("forbidden_path", payload["forbidden_path"]),
        ("forbidden_path_hits", payload["forbidden_path_hits"]),
        ("read_attempted", payload["read_attempted"]),
        ("field_present", payload["field_present"]),
        ("field_structured", payload["field_structured"]),
        ("missing_fields", payload["missing_fields"]),
        ("no_global_ready_verdict_true", payload["no_global_ready_verdict_true"]),
        ("claim_verdict_no_claim_allowed", payload["claim_verdict_no_claim_allowed"]),
        ("commands_run_present", payload["commands_run_present"]),
        ("skipped_validation_present", payload["skipped_validation_present"]),
        ("risks_present", payload["risks_present"]),
        ("claim_posture", payload["claim_posture"]),
        ("status", payload["status"]),
        ("reasons", payload["reasons"]),
        ("no_global_ready_verdict", payload["no_global_ready_verdict"]),
    ]
    return render_table("studioctl report inspect", rows)


def render_charter_text(payload: dict[str, Any]) -> str:
    candidate = payload["task_charter_candidate"]
    rows = [
        ("task_id", candidate["task_id"]),
        ("title", candidate["title"]),
        ("profile", candidate["profile"]),
        ("target", candidate["target"]),
        ("surface", candidate["surface"]),
        ("status", payload["status"]),
        ("reasons", payload["reasons"]),
        ("file_producing", payload["file_producing"]),
        ("writes_file", payload["writes_file"]),
        ("executes_charter", payload["executes_charter"]),
        ("claim_posture", payload["claim_posture"]),
        ("runtime_claim_gate", payload["runtime_claim_gate"]),
        ("route_check_result", payload["route_check_result"]),
        ("blocked_actions", payload["blocked_actions"]),
        ("validation_plan", payload["validation_plan"]),
        ("final_report_required", payload["final_report_required"]),
        ("no_global_ready_verdict", payload["no_global_ready_verdict"]),
    ]
    return render_table("studioctl charter render", rows)


def render_uxpilote_scripts_control_text(payload: dict[str, Any]) -> str:
    rows = [
        ("schema_version", payload["schema_version"]),
        ("command", payload["command"]),
        ("cwd", payload["cwd"]),
        ("generated_by", payload["generated_by"]),
        ("node_families", list(payload["node_families"])),
        ("blocked_runners", payload["blocked_runners"]),
        ("scripts_uxpilote_status", payload["scripts_uxpilote_status"]),
        ("next_humangate_questions", payload["next_humangate_questions"]),
        ("claim_posture", payload["claim_posture"]),
        ("no_global_ready_verdict", payload["no_global_ready_verdict"]),
    ]
    return render_table("studioctl uxpilote scripts-control", rows)


def render_uxpilote_audit_chains_text(payload: dict[str, Any]) -> str:
    chain_summary = [
        {
            "id": chain["id"],
            "label": chain["label"],
            "surface": chain["primary_surface"],
            "status": chain["status"],
            "safe_to_run_now": chain["safe_to_run_now"],
        }
        for chain in payload["chains"]
    ]
    rows = [
        ("schema_version", payload["schema_version"]),
        ("command", payload["command"]),
        ("cwd", payload["cwd"]),
        ("generated_by", payload["generated_by"]),
        ("source_catalog", payload["source_catalog"]),
        ("chains", chain_summary),
        ("chain_groups", payload["chain_groups"]),
        ("blocked_actions", payload["blocked_actions"]),
        ("claim_posture", payload["claim_posture"]),
        ("no_global_ready_verdict", payload["no_global_ready_verdict"]),
    ]
    return render_table("studioctl uxpilote audit-chains", rows)


def render_uxpilote_graph_text(payload: dict[str, Any]) -> str:
    truth_counts: dict[str, int] = {}
    for edge in payload["edges"]:
        truth_counts[edge["truth_level"]] = truth_counts.get(edge["truth_level"], 0) + 1
    rows = [
        ("schema_version", payload["schema_version"]),
        ("command", payload["command"]),
        ("cwd", payload["cwd"]),
        ("generated_by", payload["generated_by"]),
        ("graph_planes", payload["graph_planes"]),
        ("nodes", len(payload["nodes"])),
        ("edges", len(payload["edges"])),
        ("edge_truth_levels", truth_counts),
        ("blocked_edges", len(payload["blocked_edges"])),
        ("unsafe_edges", len(payload["unsafe_edges"])),
        ("source_state_gaps", len(payload["source_state_gaps"])),
        ("humangate_questions", len(payload["humangate_questions"])),
        ("claim_posture", payload["claim_posture"]),
        ("no_global_ready_verdict", payload["no_global_ready_verdict"]),
    ]
    return render_table("studioctl uxpilote graph", rows)


def write_payload(payload: dict[str, Any], as_json: bool, text_renderer: Any) -> None:
    if as_json:
        sys.stdout.write(json.dumps(payload, indent=2, sort_keys=True) + "\n")
        return
    sys.stdout.write(text_renderer(payload))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Read-only Studio Control CLI.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    status_parser = subparsers.add_parser("status", help="Report read-only repo and runtime-claim gate status.")
    status_parser.add_argument("--json", action="store_true", help="Emit JSON output.")

    sources_parser = subparsers.add_parser("sources", help="Source anchoring checks.")
    source_subparsers = sources_parser.add_subparsers(dest="source_command", required=True)
    scan_parser = source_subparsers.add_parser("scan", help="Read fixed source anchors and report source state.")
    scan_parser.add_argument("--json", action="store_true", help="Emit JSON output.")

    surface_parser = subparsers.add_parser("surface", help="Repository surface views.")
    surface_subparsers = surface_parser.add_subparsers(dest="surface_command", required=True)
    map_parser = surface_subparsers.add_parser("map", help="Show read-only repo surface boundaries.")
    map_parser.add_argument("--json", action="store_true", help="Emit JSON output.")

    evidence_parser = subparsers.add_parser("evidence", help="Evidence aggregation views.")
    evidence_subparsers = evidence_parser.add_subparsers(dest="evidence_command", required=True)
    board_parser = evidence_subparsers.add_parser("board", help="Show the read-only evidence board.")
    board_parser.add_argument("--json", action="store_true")

    logistic_parser = subparsers.add_parser("logistic", help="Passive Local Logistic Agent proposal views.")
    logistic_subparsers = logistic_parser.add_subparsers(dest="logistic_command", required=True)
    propose_next_parser = logistic_subparsers.add_parser(
        "propose-next",
        help="Emit deterministic next-step candidates to stdout only.",
    )
    propose_next_parser.add_argument("--json", action="store_true", help="Emit JSON output.")

    charter_parser = subparsers.add_parser("charter", help="Proposal-only task charter rendering.")
    charter_subparsers = charter_parser.add_subparsers(dest="charter_command", required=True)
    render_parser = charter_subparsers.add_parser("render", help="Render a task-charter candidate to stdout only.")
    render_parser.add_argument("--profile", choices=sorted(PROFILE_DEFAULTS), required=True)
    render_parser.add_argument("--task-id", required=True)
    render_parser.add_argument("--title", required=True)
    render_parser.add_argument("--target", required=True)
    render_parser.add_argument("--surface", required=True)
    render_parser.add_argument("--output-route")
    render_parser.add_argument("--reasoning-effort")
    render_parser.add_argument("--task-class")
    render_parser.add_argument("--json", action="store_true", help="Emit JSON output.")

    report_parser = subparsers.add_parser("report", help="Read-only report inspection.")
    report_subparsers = report_parser.add_subparsers(dest="report_command", required=True)
    inspect_parser = report_subparsers.add_parser("inspect", help="Inspect report field presence without editing it.")
    inspect_parser.add_argument("path", help="Report path to inspect.")
    inspect_parser.add_argument("--json", action="store_true", help="Emit JSON output.")
    parse_parser = report_subparsers.add_parser("parse", help="Parse an executor report to normalized stdout JSON.")
    parse_parser.add_argument("path", help="Executor report path to parse.")
    parse_parser.add_argument("--json", action="store_true", help="Accepted for consistency; output is always JSON.")
    matrix_candidate_parser = report_subparsers.add_parser(
        "matrix-candidate",
        help="Emit a task-matrix candidate from an executor report to stdout JSON only.",
    )
    matrix_candidate_parser.add_argument("path", help="Executor report path to parse.")
    matrix_candidate_parser.add_argument(
        "--json",
        action="store_true",
        help="Accepted for consistency; output is always JSON.",
    )
    routes_parser = subparsers.add_parser("routes", help="Route policy checks.")
    route_subparsers = routes_parser.add_subparsers(dest="route_command", required=True)
    check_parser = route_subparsers.add_parser("check", help="Check a candidate output route without creating it.")
    check_parser.add_argument("--surface", required=True, help="Intended output surface.")
    check_parser.add_argument("--output", required=True, help="Candidate output path to evaluate.")
    check_parser.add_argument("--json", action="store_true", help="Emit JSON output.")
    uxpilote_parser = subparsers.add_parser("uxpilote", help="UxPilote read-only data views.")
    uxpilote_subparsers = uxpilote_parser.add_subparsers(dest="uxpilote_command", required=True)
    scripts_control_parser = uxpilote_subparsers.add_parser(
        "scripts-control",
        help="Show UxPilote Scripts Control View data.",
    )
    scripts_control_parser.add_argument("--json", action="store_true", help="Emit JSON output.")
    audit_chains_parser = uxpilote_subparsers.add_parser(
        "audit-chains",
        help="Show UxPilote audit/control chain catalog data.",
    )
    audit_chains_parser.add_argument("--json", action="store_true", help="Emit JSON output.")
    graph_parser = uxpilote_subparsers.add_parser(
        "graph",
        help="Show UxPilote read-only graph backend data.",
    )
    graph_parser.add_argument("--json", action="store_true", help="Emit JSON output.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if args.command == "status":
        payload = build_status_payload()
        write_payload(payload, args.json, render_status_text)
        return 0
    if args.command == "sources" and args.source_command == "scan":
        payload = build_sources_payload()
        write_payload(payload, args.json, render_sources_text)
        return 0
    if args.command == "surface" and args.surface_command == "map":
        payload = build_surface_map_payload()
        write_payload(payload, args.json, render_surface_map_text)
        return 0
    if args.command == "evidence" and args.evidence_command == "board":
        payload = build_evidence_board_payload()
        write_payload(payload, args.json, render_evidence_board_text)
        return 0
    if args.command == "logistic" and args.logistic_command == "propose-next":
        payload = build_logistic_proposal_payload()
        write_payload(payload, args.json, render_logistic_proposal_text)
        return 0
    if args.command == "charter" and args.charter_command == "render":
        payload = build_charter_render_payload(args)
        write_payload(payload, args.json, render_charter_text)
        return 0 if payload["status"] != "BLOCKED" else 2
    if args.command == "report" and args.report_command == "inspect":
        payload = build_report_inspect_payload(args.path)
        write_payload(payload, args.json, render_report_inspect_text)
        return 0 if payload["status"] != "BLOCKED" else 2
    if args.command == "report" and args.report_command == "parse":
        payload = build_report_parse_payload(args.path)
        sys.stdout.write(json.dumps(payload, indent=2, sort_keys=True) + "\n")
        return 0 if payload["status"] != "BLOCKED" else 2
    if args.command == "report" and args.report_command == "matrix-candidate":
        payload = build_report_matrix_candidate_payload(args.path)
        sys.stdout.write(json.dumps(payload, indent=2, sort_keys=True) + "\n")
        return 0 if payload["status"] != "BLOCKED" else 2
    if args.command == "routes" and args.route_command == "check":
        payload = build_route_payload(args.surface, args.output)
        write_payload(payload, args.json, render_route_text)
        return 0 if payload["destination_allowed"] else 2
    if args.command == "uxpilote" and args.uxpilote_command == "scripts-control":
        payload = build_uxpilote_scripts_control_payload()
        write_payload(payload, args.json, render_uxpilote_scripts_control_text)
        return 0
    if args.command == "uxpilote" and args.uxpilote_command == "audit-chains":
        payload = build_uxpilote_audit_chains_payload()
        write_payload(payload, args.json, render_uxpilote_audit_chains_text)
        return 0
    if args.command == "uxpilote" and args.uxpilote_command == "graph":
        payload = build_uxpilote_graph_payload()
        write_payload(payload, args.json, render_uxpilote_graph_text)
        return 0
    parser.error("unsupported command")
    return 64


if __name__ == "__main__":
    raise SystemExit(main())
