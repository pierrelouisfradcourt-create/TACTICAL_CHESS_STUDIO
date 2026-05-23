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
TEXT_REPORT_EXTENSIONS = {".md", ".markdown", ".txt", ".yaml", ".yml"}
DEFAULT_STATUS_BY_SURFACE = {surface: "PASSIVE" for surface in ALL_SURFACES}
DEFAULT_STATUS_BY_SURFACE["roadmap_docs_only"] = "DOCUMENTED_ONLY"
DEFAULT_STATUS_BY_SURFACE["secrets"] = "BLOCKED"


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


    evidence_parser = subparsers.add_parser("evidence", help="Evidence aggregation views.")
    evidence_subparsers = evidence_parser.add_subparsers(dest="evidence_command", required=True)
    board_parser = evidence_subparsers.add_parser("board", help="Show the read-only evidence board.")
    board_parser.add_argument("--json", action="store_true")

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
    routes_parser = subparsers.add_parser("routes", help="Route policy checks.")
    route_subparsers = routes_parser.add_subparsers(dest="route_command", required=True)
    check_parser = route_subparsers.add_parser("check", help="Check a candidate output route without creating it.")
    check_parser.add_argument("--surface", required=True, help="Intended output surface.")
    check_parser.add_argument("--output", required=True, help="Candidate output path to evaluate.")
    check_parser.add_argument("--json", action="store_true", help="Emit JSON output.")
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
    if args.command == "evidence" and args.evidence_command == "board":
        payload = build_evidence_board_payload()
        write_payload(payload, args.json, render_evidence_board_text)
        return 0
    if args.command == "charter" and args.charter_command == "render":
        payload = build_charter_render_payload(args)
        write_payload(payload, args.json, render_charter_text)
        return 0 if payload["status"] != "BLOCKED" else 2
    if args.command == "report" and args.report_command == "inspect":
        payload = build_report_inspect_payload(args.path)
        write_payload(payload, args.json, render_report_inspect_text)
        return 0 if payload["status"] != "BLOCKED" else 2
    if args.command == "routes" and args.route_command == "check":
        payload = build_route_payload(args.surface, args.output)
        write_payload(payload, args.json, render_route_text)
        return 0 if payload["destination_allowed"] else 2
    parser.error("unsupported command")
    return 64


if __name__ == "__main__":
    raise SystemExit(main())
