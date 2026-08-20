from __future__ import annotations

import argparse
import html
import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]
STUDIOCTL = PROJECT_ROOT / "scripts" / "studioV2" / "studioctl.py"
CLAIM_POSTURE = "NO_CLAIM_ALLOWED"
NO_GLOBAL_READY_VERDICT = True
SCRIPTS_UXPILOTE_STATUS = "UNKNOWN"
DEFAULT_WIDTH = 120

ALLOWED_STUDIOCTL_COMMANDS: tuple[tuple[str, ...], ...] = (
    ("status", "--json"),
    ("evidence", "board", "--json"),
    ("surface", "map", "--json"),
    ("uxpilote", "scripts-control", "--json"),
    ("uxpilote", "audit-chains", "--json"),
    ("uxpilote", "graph", "--json"),
)

CANONICAL_SURFACES = (
    "active_runtime_code",
    "tests",
    "artifacts_runtime_outputs",
    "canonical_docs",
    "roadmap_docs_only",
    "inference",
)

DEFAULT_STATUS_BY_SURFACE = {
    "active_runtime_code": "PASSIVE",
    "tests": "PASSIVE",
    "artifacts_runtime_outputs": "PASSIVE",
    "canonical_docs": "PASSIVE",
    "roadmap_docs_only": "PASSIVE",
    "inference": "PASSIVE",
}

BLOCKED_PROTOTYPE_ACTIONS = (
    "execute unknown scripts",
    "run cargo",
    "run Godot",
    "run frontend server",
    "run benchmark",
    "gameplay execution",
    "training",
    "dataset generation/reset",
    "model/checkpoint creation or promotion",
    "lab/runs creation",
    "latest.json creation",
    "commit/push/branch/PR",
    "source registration or promotion",
)

DECISION_QUEUE = (
    {
        "decision_id": "UXPILOTE_REGISTRATION",
        "title": "scripts/uxpilote registration/freeze/discard",
        "surface": "artifacts_runtime_outputs",
        "status": "UNKNOWN",
        "risk": "candidate prototype mistaken for source authority",
        "recommended_default": "defer",
        "next_humangate_question": "Should scripts/uxpilote be registered, frozen, discarded, or kept candidate-only?",
    },
    {
        "decision_id": "STUDIOV2_ROUTE_AUTHORITY",
        "title": "scripts/studioV2 route authority",
        "surface": "artifacts_runtime_outputs",
        "status": "UNKNOWN",
        "risk": "path drift can make compatibility paths look authoritative",
        "recommended_default": "request_revision",
        "next_humangate_question": "Should scripts/studioV2/** be the official implementation lane?",
    },
    {
        "decision_id": "CI_CODEOWNERS_ALIGNMENT",
        "title": "CI/CODEOWNERS alignment",
        "surface": "canonical_docs",
        "status": "BLOCKED",
        "risk": "CI or ownership edits can mutate project control without route authority",
        "recommended_default": "block",
        "next_humangate_question": "Which CI and CODEOWNERS path changes are authorized, if any?",
    },
    {
        "decision_id": "PROTOTYPE_CANDIDATE_ONLY",
        "title": "prototype status / candidate-only decision",
        "surface": "artifacts_runtime_outputs",
        "status": "UNKNOWN",
        "risk": "local viewer output can be overread as runtime proof",
        "recommended_default": "defer",
        "next_humangate_question": "What validation is required before any prototype promotion?",
    },
    {
        "decision_id": "LLM_LORA_CHARTER",
        "title": "LLM/LoRA future charter decision",
        "surface": "inference",
        "status": "BLOCKED",
        "risk": "authority can drift from Search to learned or language-model systems",
        "recommended_default": "block",
        "next_humangate_question": "What future charter keeps LLM / LoRA helper-only and blocked from final authority?",
    },
)

ZONE_STATUS = {
    "Studio Control": "DOCUMENTED_ONLY",
    "Scripts": "UNKNOWN",
    "Evidence": "PASSIVE",
    "Fusion Matrix": "PASSIVE",
    "HumanGate": "DOCUMENTED_ONLY",
    "Rocky": "PASSIVE",
    "LLM / LoRA": "BLOCKED",
    "Blocked Runners": "BLOCKED",
}


@dataclass(frozen=True)
class CommandResult:
    key: str
    args: tuple[str, ...]
    returncode: int | None
    payload: dict[str, Any]
    error: str

    @property
    def ok(self) -> bool:
        return self.returncode == 0 and not self.error


def command_key(args: tuple[str, ...]) -> str:
    if args[:1] == ("status",):
        return "status"
    if args[:2] == ("evidence", "board"):
        return "evidence_board"
    if args[:2] == ("surface", "map"):
        return "surface_map"
    if args[:2] == ("uxpilote", "scripts-control"):
        return "scripts_control"
    if args[:2] == ("uxpilote", "audit-chains"):
        return "audit_chains"
    if args[:2] == ("uxpilote", "graph"):
        return "graph"
    return "_".join(args).replace("-", "_")


def display_command(args: tuple[str, ...]) -> str:
    return "python scripts\\studioV2\\studioctl.py " + " ".join(args)


def run_studioctl(args: tuple[str, ...]) -> CommandResult:
    key = command_key(args)
    if args not in ALLOWED_STUDIOCTL_COMMANDS:
        return CommandResult(key, args, None, {}, "blocked_unapproved_studioctl_command")
    if not STUDIOCTL.exists():
        return CommandResult(key, args, None, {}, "scripts/studioV2/studioctl.py not found")

    try:
        completed = subprocess.run(
            [sys.executable, str(STUDIOCTL), *args],
            cwd=PROJECT_ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
    except OSError as exc:
        return CommandResult(key, args, None, {}, f"subprocess_error: {exc}")

    if completed.returncode != 0:
        return CommandResult(
            key,
            args,
            completed.returncode,
            {},
            completed.stderr.strip() or completed.stdout.strip() or "studioctl command failed",
        )

    try:
        payload = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        return CommandResult(key, args, completed.returncode, {}, f"json_decode_error: {exc}")

    return CommandResult(key, args, completed.returncode, payload, "")


def run_all_sources() -> dict[str, CommandResult]:
    return {command_key(args): run_studioctl(args) for args in ALLOWED_STUDIOCTL_COMMANDS}


def status_by_surface_from(results: dict[str, CommandResult]) -> dict[str, str]:
    merged = dict(DEFAULT_STATUS_BY_SURFACE)
    for key in ("status", "evidence_board", "surface_map", "scripts_control", "audit_chains", "graph"):
        source = results.get(key)
        if not source or not source.payload:
            continue
        for surface, status in source.payload.get("status_by_surface", {}).items():
            if surface in CANONICAL_SURFACES:
                merged[surface] = str(status)
            elif surface == "scripts_tooling" and status in {"IMPLEMENTED", "TESTED"}:
                merged["artifacts_runtime_outputs"] = str(status)
    return merged


def first_value(results: dict[str, CommandResult], field: str, default: Any = "UNKNOWN") -> Any:
    for key in ("status", "evidence_board", "surface_map", "scripts_control", "audit_chains", "graph"):
        result = results.get(key)
        if result and field in result.payload:
            return result.payload[field]
    return default


def command_status(results: dict[str, CommandResult]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for key in ("status", "evidence_board", "surface_map", "scripts_control", "audit_chains", "graph"):
        result = results[key]
        rows.append(
            {
                "view": key,
                "command": display_command(result.args),
                "status": "PASSIVE" if result.ok else "UNKNOWN",
                "returncode": result.returncode,
                "error": result.error,
            }
        )
    return rows


def scripts_path_drift(payload: dict[str, Any]) -> list[str]:
    rows: list[str] = []
    for item in payload.get("path_drift", []):
        item_id = item.get("id", "path_drift")
        status = item.get("status", "UNKNOWN")
        root_path = item.get("root_path", item.get("path", {}))
        studio_path = item.get("studioV2_path", {})
        if studio_path:
            rows.append(
                f"{item_id}: {root_path.get('path', 'UNKNOWN')} [{root_path.get('status', 'UNKNOWN')}]"
                f" vs {studio_path.get('path', 'UNKNOWN')} [{studio_path.get('status', 'UNKNOWN')}] -> {status}"
            )
        else:
            rows.append(f"{item_id}: {root_path.get('path', 'UNKNOWN')} [{root_path.get('status', 'UNKNOWN')}] -> {status}")
    return rows or ["path drift: UNKNOWN"]


def build_inspector(summary_seed: dict[str, Any], scripts_payload: dict[str, Any]) -> dict[str, Any]:
    uxpilote_family = scripts_payload.get("node_families", {}).get("uxpilote", {})
    question = summary_seed["decision_queue"][0]["next_humangate_question"]
    questions = scripts_payload.get("next_humangate_questions", [])
    if questions:
        question = str(questions[0])
    return {
        "selected_node": "scripts/uxpilote registration",
        "surface": "artifacts_runtime_outputs",
        "status": SCRIPTS_UXPILOTE_STATUS,
        "evidence": uxpilote_family.get("evidence", "candidate-only local path; HumanGate registration pending"),
        "risk": uxpilote_family.get("risk", "prototype material can be mistaken for canonical truth"),
        "allowed_actions": uxpilote_family.get("allowed_actions", ["inspect", "readback", "prepare charter"]),
        "blocked_actions": list(BLOCKED_PROTOTYPE_ACTIONS),
        "next_humangate_question": question,
    }


def build_summary(results: dict[str, CommandResult]) -> dict[str, Any]:
    status_payload = results["status"].payload
    evidence_payload = results["evidence_board"].payload
    scripts_payload = results["scripts_control"].payload
    blocked_runners = scripts_payload.get("blocked_runners", {})
    next_questions = scripts_payload.get("next_humangate_questions", [])
    summary_seed = {"decision_queue": [dict(item) for item in DECISION_QUEUE]}

    summary = {
        "schema_version": "uxpilote_local_readonly_cockpit.v1",
        "read_only": True,
        "writes_files": False,
        "runtime_authority": "NONE",
        "humangate_required_for_mutation": True,
        "candidate_only": True,
        "scripts_uxpilote_status": scripts_payload.get("scripts_uxpilote_status", SCRIPTS_UXPILOTE_STATUS),
        "cwd": status_payload.get("cwd", str(PROJECT_ROOT)),
        "branch": status_payload.get("branch", "UNKNOWN"),
        "head": status_payload.get("head", "UNKNOWN"),
        "worktree_status": status_payload.get("worktree_status", "UNKNOWN"),
        "claim_posture": first_value(results, "claim_posture", CLAIM_POSTURE),
        "no_global_ready_verdict": bool(first_value(results, "no_global_ready_verdict", NO_GLOBAL_READY_VERDICT)),
        "status_by_surface": status_by_surface_from(results),
        "studioctl_commands": command_status(results),
        "blocked_runners": blocked_runners,
        "next_humangate_questions": next_questions,
        "source_state_summary": evidence_payload.get("source_state_summary", {"status": "UNKNOWN"}),
        "route_state_summary": evidence_payload.get("route_state_summary", {"status": "UNKNOWN"}),
        "path_drift": scripts_path_drift(scripts_payload),
        "decision_queue": summary_seed["decision_queue"],
        "zone_statuses": dict(ZONE_STATUS),
        "blocked_claims": [
            "readiness",
            "release status",
            "promotion",
            "benchmark proof",
            "dataset proof",
            "model proof",
            "scientific proof",
        ],
        "blocked_prototype_actions": list(BLOCKED_PROTOTYPE_ACTIONS),
        "available_views": ["cockpit", "scripts", "decisions", "evidence"],
    }
    summary["selected_node_inspector"] = build_inspector(summary_seed, scripts_payload)
    return summary


def render_value(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (dict, list, tuple)):
        return json.dumps(value, sort_keys=True)
    return str(value)


def line(label: str, value: Any) -> str:
    return f"{label}: {render_value(value)}"


def clamp_width(width: int) -> int:
    return max(80, min(160, width))


def fit(text: str, width: int) -> str:
    clean = str(text).replace("\t", "    ")
    if len(clean) <= width:
        return clean.ljust(width)
    if width <= 3:
        return clean[:width]
    return clean[: width - 3] + "..."


def wrap_line(text: str, width: int) -> list[str]:
    words = str(text).split()
    if not words:
        return [""]
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        if len(current) + 1 + len(word) <= width:
            current += " " + word
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def bullet_lines(items: list[Any] | tuple[Any, ...], width: int, limit: int | None = None) -> list[str]:
    selected = list(items)
    if limit is not None:
        selected = selected[:limit]
    rows: list[str] = []
    for item in selected:
        rows.extend(wrap_line(f"- {item}", width))
    return rows or ["- UNKNOWN"]


def border(title: str, rows: list[str], width: int) -> str:
    width = clamp_width(width)
    inner = max(20, width - 4)
    title_text = f" {title} "
    top = "+" + title_text[:inner].ljust(inner, "-") + "+"
    bottom = "+" + "-" * inner + "+"
    rendered = [top]
    for row in rows:
        for wrapped in wrap_line(row, inner):
            rendered.append("| " + fit(wrapped, inner) + " |")
    rendered.append(bottom)
    return "\n".join(rendered)


def two_column(left: list[str], right: list[str], width: int) -> list[str]:
    width = clamp_width(width)
    gap = " | "
    left_width = max(28, min(44, width // 2 - 2))
    right_width = max(28, width - left_width - len(gap))
    height = max(len(left), len(right))
    rows: list[str] = []
    for idx in range(height):
        left_text = left[idx] if idx < len(left) else ""
        right_text = right[idx] if idx < len(right) else ""
        rows.append(fit(left_text, left_width) + gap + fit(right_text, right_width))
    return rows


def three_column(left: list[str], center: list[str], right: list[str], width: int) -> list[str]:
    width = clamp_width(width)
    gap = " | "
    left_width = max(18, min(24, width // 5))
    right_width = max(30, min(42, width // 3))
    center_width = max(30, width - left_width - right_width - (len(gap) * 2))
    height = max(len(left), len(center), len(right))
    rows: list[str] = []
    for idx in range(height):
        left_text = left[idx] if idx < len(left) else ""
        center_text = center[idx] if idx < len(center) else ""
        right_text = right[idx] if idx < len(right) else ""
        rows.append(
            fit(left_text, left_width)
            + gap
            + fit(center_text, center_width)
            + gap
            + fit(right_text, right_width)
        )
    return rows


def status_badge(status: str) -> str:
    return f"[{status}]"


def render_status_map(status_by_surface: dict[str, str]) -> list[str]:
    return [f"{surface}: {status_by_surface.get(surface, 'UNKNOWN')}" for surface in CANONICAL_SURFACES]


def render_blocked_runners(blocked_runners: dict[str, Any]) -> list[str]:
    if not blocked_runners:
        return ["UNKNOWN: blocked runner data unavailable"]
    return [f"{name}: {status}" for name, status in sorted(blocked_runners.items())]


def render_questions(questions: list[Any]) -> list[str]:
    if not questions:
        return ["UNKNOWN: no HumanGate questions available from source data"]
    return [str(question) for question in questions]


def top_bar(summary: dict[str, Any], width: int) -> str:
    head = str(summary["head"])
    if len(head) > 12:
        head = head[:12]
    rows = [
        "UXPILOTE READ-ONLY COCKPIT",
        line("cwd", summary["cwd"]),
        f"branch: {summary['branch']} | head: {head} | worktree_status: {summary['worktree_status']}",
        f"claim_posture: {summary['claim_posture']} | no_global_ready_verdict: {render_value(summary['no_global_ready_verdict'])}",
        "candidate-only | read_only: true | writes_files: false | runtime_authority: NONE | HumanGate required for mutation",
    ]
    return border("Top Bar", rows, width)


def render_command_failures(summary: dict[str, Any]) -> list[str]:
    failures = [row for row in summary["studioctl_commands"] if row["error"]]
    if not failures:
        return ["studioctl command failures: none"]
    rows = ["studioctl command failures:"]
    for row in failures:
        rows.append(f"- {row['command']} -> {row['error']}")
    return rows


def cockpit_columns(summary: dict[str, Any], width: int) -> str:
    left = [
        "Zones",
        *[f"{status_badge(status)} {name}" for name, status in summary["zone_statuses"].items()],
    ]

    center = [
        "Studio Control Map",
        f"{status_badge('DOCUMENTED_ONLY')} Studio Control -> {status_badge('PASSIVE')} Evidence -> {status_badge('DOCUMENTED_ONLY')} HumanGate",
        f"{status_badge('UNKNOWN')} Scripts -> {status_badge('UNKNOWN')} UxPilote -> {status_badge('DOCUMENTED_ONLY')} HumanGate",
        f"{status_badge('PASSIVE')} Rocky/Search -> {status_badge('PASSIVE')} Evidence",
        f"{status_badge('BLOCKED')} LLM / LoRA -> {status_badge('BLOCKED/PASSIVE')} no final authority",
        "",
        "Evidence / Claims",
        f"claim_posture: {summary['claim_posture']}",
        f"no_global_ready_verdict: {render_value(summary['no_global_ready_verdict'])}",
        "Fusion Matrix: PASSIVE synthesis placeholder",
        "HumanGate Queue: pending decisions only",
    ]

    inspector = summary["selected_node_inspector"]
    right = [
        "Inspector",
        line("selected_node", inspector["selected_node"]),
        line("surface", inspector["surface"]),
        line("status", inspector["status"]),
        line("evidence", inspector["evidence"]),
        line("risk", inspector["risk"]),
        line("allowed_actions", ", ".join(inspector["allowed_actions"])),
        line("blocked_actions", ", ".join(inspector["blocked_actions"][:5]) + ", ..."),
        line("next_humangate_question", inspector["next_humangate_question"]),
    ]

    return border("Cockpit Map / Scripts Control / Inspector", three_column(left, center, right, width - 4), width)


def decision_bar(summary: dict[str, Any], width: int, limit: int = 3) -> str:
    rows = ["HumanGate Queue"]
    for decision in summary["decision_queue"][:limit]:
        rows.append(
            f"{decision['decision_id']}: {decision['title']} [{decision['status']}] "
            f"default={decision['recommended_default']}"
        )
    return border("Bottom Decision Bar", rows, width)


def evidence_footer(summary: dict[str, Any], width: int) -> str:
    rows = [
        "Evidence / Claims",
        "status_by_surface:",
        *[f"- {row}" for row in render_status_map(summary["status_by_surface"])],
        "blocked claims: " + ", ".join(summary["blocked_claims"]),
        f"claim_posture: {summary['claim_posture']}",
        f"no_global_ready_verdict: {render_value(summary['no_global_ready_verdict'])}",
        *render_command_failures(summary),
    ]
    return border("Evidence Footer", rows, width)


def render_cockpit_view(summary: dict[str, Any], width: int) -> str:
    width = clamp_width(width)
    parts = [
        top_bar(summary, width),
        cockpit_columns(summary, width),
        decision_bar(summary, width, limit=3),
        evidence_footer(summary, width),
        "",
    ]
    return "\n".join(parts)


def render_scripts_view(summary: dict[str, Any], width: int) -> str:
    width = clamp_width(width)
    left = [
        "Scripts Control",
        f"scripts/uxpilote: {summary['scripts_uxpilote_status']} candidate-only",
        "allowed_actions: inspect, readback, prepare charter",
        "read_only: true",
        "writes_files: false",
        "claim_posture: NO_CLAIM_ALLOWED",
    ]
    right = [
        "Path drift",
        *summary["path_drift"],
        "",
        "Blocked Runners",
        *render_blocked_runners(summary["blocked_runners"]),
    ]
    rows = two_column(left, right, width - 4)
    questions = ["next decisions:", *bullet_lines(render_questions(summary["next_humangate_questions"]), width - 8)]
    return "\n".join(
        [
            top_bar(summary, width),
            border("Scripts Control", rows + questions, width),
            evidence_footer(summary, width),
            "",
        ]
    )


def render_decisions_view(summary: dict[str, Any], width: int) -> str:
    width = clamp_width(width)
    rows = ["HumanGate Queue", "HumanGate displays decisions but does not execute them."]
    for decision in summary["decision_queue"]:
        rows.append(
            f"{decision['decision_id']} | {decision['title']} | status={decision['status']} | "
            f"default={decision['recommended_default']}"
        )
        rows.append(f"risk: {decision['risk']}")
        rows.append(f"question: {decision['next_humangate_question']}")
    rows.extend(
        [
            "blocked_actions:",
            *bullet_lines(summary["blocked_prototype_actions"], width - 8, limit=10),
            f"no_global_ready_verdict: {render_value(summary['no_global_ready_verdict'])}",
        ]
    )
    return "\n".join([top_bar(summary, width), border("HumanGate Queue", rows, width), ""])


def render_evidence_view(summary: dict[str, Any], width: int) -> str:
    width = clamp_width(width)
    rows = [
        "Evidence / Claims",
        f"claim_posture: {summary['claim_posture']}",
        f"no_global_ready_verdict: {render_value(summary['no_global_ready_verdict'])}",
        "status_by_surface:",
        *[f"- {row}" for row in render_status_map(summary["status_by_surface"])],
        "blocked claims:",
        *bullet_lines(summary["blocked_claims"], width - 8),
        line("source_state_summary", summary["source_state_summary"]),
        line("route_state_summary", summary["route_state_summary"]),
        "Fusion Matrix: PASSIVE",
        "HumanGate Queue: pending human decisions only",
    ]
    return "\n".join([top_bar(summary, width), border("Evidence / Claims", rows, width), ""])


def render_view(summary: dict[str, Any], view: str, width: int) -> str:
    if view == "scripts":
        return render_scripts_view(summary, width)
    if view == "decisions":
        return render_decisions_view(summary, width)
    if view == "evidence":
        return render_evidence_view(summary, width)
    return render_cockpit_view(summary, width)


def html_escape(value: Any) -> str:
    return html.escape(render_value(value), quote=True)


def html_list(items: list[Any] | tuple[Any, ...], empty: str = "UNKNOWN", limit: int | None = None) -> str:
    selected = list(items)
    if limit is not None:
        selected = selected[:limit]
    if not selected:
        return f"<ul><li>{html_escape(empty)}</li></ul>"
    rows = "\n".join(f"<li>{html_escape(item)}</li>" for item in selected)
    return f"<ul>{rows}</ul>"


def html_kv(label: str, value: Any) -> str:
    return f"<div><span>{html_escape(label)}</span><strong>{html_escape(value)}</strong></div>"


def html_status_class(status: Any) -> str:
    clean = str(status).lower().replace("/", "-").replace("_", "-").replace(" ", "-")
    return f"status {html.escape(clean, quote=True)}"


def render_html_failure_card(summary: dict[str, Any]) -> str:
    failures = [row for row in summary["studioctl_commands"] if row["error"]]
    if not failures:
        return ""
    rows = "\n".join(
        "<li>"
        f"<strong>{html_escape(row['view'])}</strong>"
        f"<span>{html_escape(row['command'])}</span>"
        f"<em>{html_escape(row['error'])}</em>"
        "</li>"
        for row in failures
    )
    return f"""
    <section class="panel failure-card">
      <div class="panel-head">
        <p>Partial Source Failure</p>
        <span class="status unknown">UNKNOWN</span>
      </div>
      <ul class="failure-list">{rows}</ul>
    </section>
    """


def render_html_dashboard(summary: dict[str, Any]) -> str:
    head = str(summary["head"])
    if len(head) > 12:
        head = head[:12]
    status_cards = [
        ("Truth / Evidence", "Evidence remains observation only.", "PASSIVE"),
        ("UX Control", "candidate-only display aid.", "UNKNOWN"),
        ("Scripts", f"scripts/uxpilote: {summary['scripts_uxpilote_status']}", "UNKNOWN"),
        ("Fusion Matrix", "pre-HumanGate synthesis display.", "PASSIVE"),
        ("HumanGate Queue", "pending decisions only.", "DOCUMENTED_ONLY"),
        ("LLM / LoRA", "helper-only future charter blocked.", "BLOCKED"),
    ]
    cards_html = "\n".join(
        f"""
        <article class="card">
          <div class="card-title">{html_escape(title)}</div>
          <div class="{html_status_class(status)}">{html_escape(status)}</div>
          <p>{html_escape(body)}</p>
        </article>
        """
        for title, body, status in status_cards
    )
    status_rows = "\n".join(
        f"<tr><th>{html_escape(surface)}</th><td><span class=\"{html_status_class(status)}\">{html_escape(status)}</span></td></tr>"
        for surface, status in summary["status_by_surface"].items()
    )
    command_rows = "\n".join(
        f"<tr><th>{html_escape(row['view'])}</th><td>{html_escape(row['status'])}</td><td>{html_escape(row['returncode'])}</td></tr>"
        for row in summary["studioctl_commands"]
    )
    blocked_runner_rows = "\n".join(
        f"<li><span>{html_escape(name)}</span><strong>{html_escape(status)}</strong></li>"
        for name, status in sorted(summary["blocked_runners"].items())
    ) or "<li><span>blocked runner data</span><strong>UNKNOWN</strong></li>"
    decision_rows = "\n".join(
        f"""
        <li>
          <strong>{html_escape(decision['title'])}</strong>
          <span>{html_escape(decision['decision_id'])} | {html_escape(decision['status'])} | default={html_escape(decision['recommended_default'])}</span>
        </li>
        """
        for decision in summary["decision_queue"][:5]
    )
    source_state = summary.get("source_state_summary", {})
    route_state = summary.get("route_state_summary", {})
    inspector = summary["selected_node_inspector"]

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>UXPILOTE READ-ONLY DASHBOARD</title>
  <style>
    :root {{
      color-scheme: light;
      --ink: #202326;
      --muted: #606873;
      --line: #cfd6df;
      --panel: #ffffff;
      --bg: #eef2f5;
      --blue: #1f5f9f;
      --green: #257053;
      --yellow: #806000;
      --red: #9c2f2f;
      --gray: #66717d;
      --black: #252a30;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 15px;
      letter-spacing: 0;
      line-height: 1.45;
    }}
    header, main, footer {{
      width: min(1180px, calc(100% - 32px));
      margin: 0 auto;
    }}
    header {{
      padding: 28px 0 18px;
      border-bottom: 3px solid var(--ink);
    }}
    h1 {{
      margin: 0 0 14px;
      font-size: clamp(28px, 5vw, 52px);
      line-height: 1;
      letter-spacing: 0;
    }}
    h2 {{
      margin: 0;
      font-size: 20px;
      letter-spacing: 0;
    }}
    p {{ margin: 0; }}
    .meta-grid, .footer-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 8px;
    }}
    .meta-grid div, .footer-grid div, .kv div {{
      min-width: 0;
      border: 1px solid var(--line);
      background: var(--panel);
      padding: 9px 10px;
    }}
    .meta-grid span, .footer-grid span, .kv span {{
      display: block;
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
    }}
    .meta-grid strong, .footer-grid strong, .kv strong {{
      display: block;
      overflow-wrap: anywhere;
    }}
    .boundary-line {{
      margin-top: 10px;
      border: 1px solid var(--line);
      background: var(--panel);
      padding: 10px;
      font-weight: 700;
      overflow-wrap: anywhere;
    }}
    main {{
      display: grid;
      gap: 16px;
      padding: 18px 0 24px;
    }}
    .cards {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
    }}
    .card, .panel {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
    }}
    .card {{
      min-height: 132px;
      padding: 14px;
      display: grid;
      align-content: start;
      gap: 10px;
    }}
    .card-title {{
      font-weight: 700;
      font-size: 18px;
    }}
    .panel {{
      padding: 16px;
    }}
    .panel-head {{
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--line);
      margin-bottom: 12px;
    }}
    .panel-head p {{
      color: var(--muted);
    }}
    .map-grid {{
      display: grid;
      grid-template-columns: repeat(5, minmax(120px, 1fr));
      gap: 10px;
      align-items: center;
    }}
    .node {{
      border: 2px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      min-height: 74px;
      background: #f8fafc;
      font-weight: 700;
      text-align: center;
    }}
    .edge {{
      color: var(--muted);
      text-align: center;
      font-weight: 700;
    }}
    .two-col {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 16px;
    }}
    .script-list, .runner-list, .decision-list, .failure-list {{
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 8px;
    }}
    .script-list li, .runner-list li, .decision-list li, .failure-list li {{
      display: grid;
      gap: 2px;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 9px 10px;
      background: #f8fafc;
    }}
    .runner-list li {{
      grid-template-columns: 1fr auto;
      gap: 10px;
    }}
    .decision-list span, .failure-list span, .failure-list em {{
      color: var(--muted);
      overflow-wrap: anywhere;
    }}
    .matrix {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 8px;
    }}
    .matrix div {{
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 10px;
      background: #f8fafc;
      min-height: 72px;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
    }}
    th, td {{
      border-bottom: 1px solid var(--line);
      padding: 8px;
      text-align: left;
      vertical-align: top;
    }}
    .status {{
      display: inline-block;
      border-radius: 999px;
      padding: 3px 8px;
      color: #ffffff;
      background: var(--gray);
      font-size: 12px;
      font-weight: 700;
    }}
    .implemented {{ background: var(--green); }}
    .tested {{ background: var(--blue); }}
    .documented-only {{ background: var(--black); }}
    .passive {{ background: var(--gray); }}
    .blocked, .blocked-passive {{ background: var(--red); }}
    .unknown {{ background: var(--yellow); color: #ffffff; }}
    .not-found {{ background: #111111; }}
    .failure-card {{
      border-color: var(--red);
    }}
    footer {{
      padding: 18px 0 28px;
      border-top: 3px solid var(--ink);
    }}
    @media (max-width: 760px) {{
      header, main, footer {{ width: min(100% - 20px, 1180px); }}
      .map-grid {{ grid-template-columns: 1fr; }}
      .edge {{ text-align: left; padding-left: 12px; }}
      .panel-head {{ display: block; }}
      .two-col {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>
  <header>
    <h1>UXPILOTE READ-ONLY DASHBOARD</h1>
    <div class="meta-grid">
      {html_kv("cwd", summary["cwd"])}
      {html_kv("branch/head", f"{summary['branch']} / {head}")}
      {html_kv("worktree_status", summary["worktree_status"])}
      {html_kv("claim_posture", summary["claim_posture"])}
      {html_kv("no_global_ready_verdict", summary["no_global_ready_verdict"])}
    </div>
    <p class="boundary-line">no_global_ready_verdict: true | candidate-only | read_only: true | writes_files: false | runtime_authority: NONE</p>
  </header>
  <main>
    <section class="cards" aria-label="dashboard cards">
      {cards_html}
    </section>
    {render_html_failure_card(summary)}
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Studio Control</h2>
          <p>Main map: read-only route and evidence flow.</p>
        </div>
        <span class="status passive">PASSIVE</span>
      </div>
      <div class="map-grid">
        <div class="node">Studio Control</div><div class="edge">-&gt;</div><div class="node">Evidence</div><div class="edge">-&gt;</div><div class="node">HumanGate</div>
        <div class="node">Scripts</div><div class="edge">-&gt;</div><div class="node">UxPilote</div><div class="edge">-&gt;</div><div class="node">HumanGate</div>
        <div class="node">Rocky/Search</div><div class="edge">-&gt;</div><div class="node">Evidence</div><div class="edge"> </div><div class="node">Search final authority preserved</div>
        <div class="node">LLM/LoRA</div><div class="edge">-&gt;</div><div class="node">BLOCKED/PASSIVE</div><div class="edge"> </div><div class="node">no final authority</div>
        <div class="node">Blocked Runners</div><div class="edge">-&gt;</div><div class="node">BLOCKED</div><div class="edge"> </div><div class="node">HumanGate required</div>
      </div>
    </section>
    <section class="two-col">
      <article class="panel">
        <div class="panel-head">
          <div>
            <h2>Scripts Control</h2>
            <p>Known tooling families and blocked runner classes.</p>
          </div>
          <span class="status unknown">UNKNOWN</span>
        </div>
        <ul class="script-list">
          <li>studioctl</li>
          <li>validators</li>
          <li>control_plane</li>
          <li>operator</li>
          <li>uxpilote</li>
          <li>blocked_runners</li>
          <li>legacy/root compatibility</li>
        </ul>
      </article>
      <article class="panel">
        <div class="panel-head">
          <div>
            <h2>Evidence / Claims</h2>
            <p>NO_CLAIM_ALLOWED; reports/logs/benchmarks are observation only.</p>
          </div>
          <span class="status blocked">NO_CLAIM_ALLOWED</span>
        </div>
        <table>
          <tbody>{status_rows}</tbody>
        </table>
        <div class="kv">
          {html_kv("no_global_ready_verdict", summary["no_global_ready_verdict"])}
          {html_kv("reports/logs/benchmarks", "observation only")}
        </div>
      </article>
    </section>
    <section class="two-col">
      <article class="panel">
        <div class="panel-head">
          <div>
            <h2>Fusion Matrix</h2>
            <p>Fragmented audit synthesis before HumanGate.</p>
          </div>
          <span class="status passive">PASSIVE</span>
        </div>
        <div class="matrix">
          <div><strong>Cartographer</strong><p>scope and route</p></div>
          <div><strong>HygieneAgent</strong><p>fields and blocked actions</p></div>
          <div><strong>TruthAgent</strong><p>evidence, unknowns, claims</p></div>
          <div><strong>FusionAuditor</strong><p>synthesis packet</p></div>
          <div><strong>RedTeam</strong><p>objections and risks</p></div>
          <div><strong>HumanGate</strong><p>human decision input</p></div>
        </div>
      </article>
      <article class="panel">
        <div class="panel-head">
          <div>
            <h2>HumanGate Queue</h2>
            <p>Top pending decisions.</p>
          </div>
          <span class="status documented-only">DOCUMENTED_ONLY</span>
        </div>
        <ul class="decision-list">{decision_rows}</ul>
      </article>
    </section>
    <section class="two-col">
      <article class="panel">
        <div class="panel-head">
          <div>
            <h2>LLM / LoRA</h2>
            <p>Future helper charter only; final authority blocked.</p>
          </div>
          <span class="status blocked">BLOCKED</span>
        </div>
        <div class="kv">
          {html_kv("selected_node", inspector["selected_node"])}
          {html_kv("surface", inspector["surface"])}
          {html_kv("status", inspector["status"])}
          {html_kv("risk", inspector["risk"])}
        </div>
      </article>
      <article class="panel">
        <div class="panel-head">
          <div>
            <h2>Blocked Runners</h2>
            <p>Disabled controls; no execution authority.</p>
          </div>
          <span class="status blocked">BLOCKED</span>
        </div>
        <ul class="runner-list">{blocked_runner_rows}</ul>
      </article>
    </section>
    <section class="two-col">
      <article class="panel">
        <div class="panel-head">
          <div>
            <h2>Source State</h2>
            <p>created != registered; registered != loaded; loaded != enforced; enforced != evidenced.</p>
          </div>
          <span class="status unknown">UNKNOWN</span>
        </div>
        <div class="kv">
          {html_kv("source_state_summary", source_state)}
          {html_kv("route_state_summary", route_state)}
        </div>
      </article>
      <article class="panel">
        <div class="panel-head">
          <div>
            <h2>Studioctl Sources</h2>
            <p>Approved JSON commands; partial failures stay visible.</p>
          </div>
          <span class="status passive">PASSIVE</span>
        </div>
        <table>
          <thead><tr><th>view</th><th>status</th><th>returncode</th></tr></thead>
          <tbody>{command_rows}</tbody>
        </table>
      </article>
    </section>
  </main>
  <footer>
    <div class="footer-grid">
      {html_kv("read_only", True)}
      {html_kv("writes_files", False)}
      {html_kv("runtime_authority", "NONE")}
      {html_kv("candidate-only", True)}
      {html_kv("claim_verdict", CLAIM_POSTURE)}
    </div>
    <p class="boundary-line">read_only: true | writes_files: false | runtime_authority: NONE | candidate-only | claim_verdict: NO_CLAIM_ALLOWED</p>
  </footer>
</body>
</html>
"""


INCONNU = "INCONNU"

SURFACE_LABELS_FR = {
    "active_runtime_code": "Code runtime",
    "tests": "Tests",
    "artifacts_runtime_outputs": "Artefacts / outputs",
    "canonical_docs": "Docs canoniques",
    "roadmap_docs_only": "Roadmap / docs-only",
    "inference": "Inference",
}

EXPECTED_NODE_FAMILIES = (
    "studioctl",
    "validators",
    "control_plane",
    "operator",
    "uxpilote",
    "blocked_runners",
    "legacy_root_compatibility",
)


def missing(value: Any) -> str:
    if value is None or value == "":
        return INCONNU
    return render_value(value)


def bool_text(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    return missing(value)


def list_or_empty(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def dict_or_empty(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def top_items(mapping: dict[str, Any], limit: int | None = None) -> list[tuple[str, Any]]:
    rows = list(mapping.items())
    if limit is not None:
        rows = rows[:limit]
    return rows


def family_paths(family: dict[str, Any]) -> list[dict[str, Any]]:
    return [path for path in list_or_empty(family.get("paths")) if isinstance(path, dict)]


def count_pre_existing_changes(status_payload: dict[str, Any]) -> int | str:
    changes = status_payload.get("pre_existing_changes")
    if isinstance(changes, list):
        return len(changes)
    return INCONNU


def build_summary(results: dict[str, CommandResult]) -> dict[str, Any]:
    status_payload = results["status"].payload
    evidence_payload = results["evidence_board"].payload
    surface_payload = results["surface_map"].payload
    scripts_payload = results["scripts_control"].payload
    audit_chains_payload = results["audit_chains"].payload
    graph_payload = results["graph"].payload
    node_families = dict_or_empty(scripts_payload.get("node_families"))
    blocked_runners = dict_or_empty(scripts_payload.get("blocked_runners"))
    next_questions = list_or_empty(scripts_payload.get("next_humangate_questions"))
    audit_chains = list_or_empty(audit_chains_payload.get("chains"))
    audit_chain_groups = dict_or_empty(audit_chains_payload.get("chain_groups"))
    graph_nodes = [node for node in list_or_empty(graph_payload.get("nodes")) if isinstance(node, dict)]
    graph_edges = [edge for edge in list_or_empty(graph_payload.get("edges")) if isinstance(edge, dict)]
    graph_blocked_edges = [
        edge for edge in list_or_empty(graph_payload.get("blocked_edges")) if isinstance(edge, dict)
    ]
    graph_unsafe_edges = [
        edge for edge in list_or_empty(graph_payload.get("unsafe_edges")) if isinstance(edge, dict)
    ]
    graph_source_state_gaps = [
        gap for gap in list_or_empty(graph_payload.get("source_state_gaps")) if isinstance(gap, dict)
    ]
    graph_humangate_questions = [
        question for question in list_or_empty(graph_payload.get("humangate_questions")) if isinstance(question, dict)
    ]
    summary_seed = {"decision_queue": [dict(item) for item in DECISION_QUEUE]}

    summary = {
        "schema_version": "uxpilote_local_readonly_cockpit.real_data_fr.v1",
        "read_only": True,
        "writes_files": False,
        "runtime_authority": "NONE",
        "humangate_required_for_mutation": True,
        "candidate_only": True,
        "scripts_uxpilote_status": scripts_payload.get("scripts_uxpilote_status", SCRIPTS_UXPILOTE_STATUS),
        "cwd": status_payload.get("cwd", str(PROJECT_ROOT)),
        "branch": status_payload.get("branch", INCONNU),
        "head": status_payload.get("head", INCONNU),
        "worktree_status": status_payload.get("worktree_status", INCONNU),
        "pre_existing_changes_count": count_pre_existing_changes(status_payload),
        "pre_existing_changes": list_or_empty(status_payload.get("pre_existing_changes")),
        "claim_posture": first_value(results, "claim_posture", CLAIM_POSTURE),
        "no_global_ready_verdict": bool(first_value(results, "no_global_ready_verdict", NO_GLOBAL_READY_VERDICT)),
        "status_by_surface": status_by_surface_from(results),
        "status_by_surface_sources": {
            "status": dict_or_empty(status_payload.get("status_by_surface")),
            "evidence_board": dict_or_empty(evidence_payload.get("status_by_surface")),
            "surface_map": dict_or_empty(surface_payload.get("status_by_surface")),
            "scripts_control": dict_or_empty(scripts_payload.get("status_by_surface")),
            "audit_chains": dict_or_empty(audit_chains_payload.get("status_by_surface")),
            "graph": dict_or_empty(graph_payload.get("status_by_surface")),
        },
        "studioctl_commands": command_status(results),
        "graph": graph_payload,
        "graph_schema_version": graph_payload.get("schema_version", INCONNU),
        "graph_planes": list_or_empty(graph_payload.get("graph_planes")),
        "graph_nodes": graph_nodes,
        "graph_edges": graph_edges,
        "graph_blocked_edges": graph_blocked_edges,
        "graph_unsafe_edges": graph_unsafe_edges,
        "graph_source_state_gaps": graph_source_state_gaps,
        "graph_humangate_questions": graph_humangate_questions,
        "graph_counts": {
            "nodes": len(graph_nodes),
            "edges": len(graph_edges),
            "blocked_edges": len(graph_blocked_edges),
            "unsafe_edges": len(graph_unsafe_edges),
            "source_state_gaps": len(graph_source_state_gaps),
            "humangate_questions": len(graph_humangate_questions),
        },
        "node_families": node_families,
        "audit_chains": audit_chains,
        "audit_chain_groups": audit_chain_groups,
        "audit_chain_source_catalog": dict_or_empty(audit_chains_payload.get("source_catalog")),
        "audit_chain_blocked_actions": dict_or_empty(audit_chains_payload.get("blocked_actions")),
        "blocked_runners": blocked_runners,
        "next_humangate_questions": next_questions,
        "evidence_sources": list_or_empty(evidence_payload.get("evidence_sources")),
        "source_state_summary": evidence_payload.get("source_state_summary", {"status": INCONNU}),
        "route_state_summary": evidence_payload.get("route_state_summary", {"status": INCONNU}),
        "runtime_claim_gate": first_value(results, "runtime_claim_gate", {"runtime_status": "BLOCKED"}),
        "path_drift_entries": list_or_empty(scripts_payload.get("path_drift")),
        "path_drift": scripts_path_drift(scripts_payload),
        "surface_rows": list_or_empty(surface_payload.get("surfaces")),
        "surface_rows_total": len(list_or_empty(surface_payload.get("surfaces"))),
        "secrets_boundary": surface_payload.get("secrets_boundary", {"status": INCONNU}),
        "known_readonly_entrypoints": list_or_empty(scripts_payload.get("known_readonly_entrypoints")),
        "decision_queue": summary_seed["decision_queue"],
        "blocked_claims": [
            "readiness",
            "release status",
            "promotion",
            "benchmark proof",
            "dataset proof",
            "model proof",
            "scientific proof",
        ],
        "blocked_prototype_actions": list(BLOCKED_PROTOTYPE_ACTIONS),
        "available_views": ["cockpit", "scripts", "decisions", "evidence"],
    }
    summary["selected_node_inspector"] = build_inspector(summary_seed, scripts_payload)
    return summary


def repo_state_rows(summary: dict[str, Any]) -> list[str]:
    head = str(summary.get("head", INCONNU))
    if len(head) > 12:
        head = head[:12]
    return [
        line("Racine / cwd", summary.get("cwd", INCONNU)),
        line("Branche", summary.get("branch", INCONNU)),
        line("HEAD", head),
        line("Etat worktree", summary.get("worktree_status", INCONNU)),
        line("claim_posture", summary.get("claim_posture", INCONNU)),
        line("no_global_ready_verdict", summary.get("no_global_ready_verdict", INCONNU)),
        line("Nombre de changements pre-existants", summary.get("pre_existing_changes_count", INCONNU)),
    ]


def surface_status_rows(summary: dict[str, Any]) -> list[str]:
    statuses = summary.get("status_by_surface", {})
    return [
        f"{SURFACE_LABELS_FR[surface]} ({surface}): {statuses.get(surface, INCONNU)}"
        for surface in CANONICAL_SURFACES
    ]


def script_family_rows(summary: dict[str, Any], include_paths: bool = True) -> list[str]:
    rows: list[str] = []
    families = dict_or_empty(summary.get("node_families"))
    for name in EXPECTED_NODE_FAMILIES:
        family = dict_or_empty(families.get(name))
        paths = family_paths(family)
        rows.append(
            f"{name}: status={missing(family.get('status'))} | surface={missing(family.get('surface'))} | "
            f"chemins={len(paths)} | risque={missing(family.get('risk'))}"
        )
        if include_paths:
            for path in paths:
                rows.append(
                    f"  - {missing(path.get('path'))} | exists={bool_text(path.get('exists'))} | "
                    f"status={missing(path.get('status'))}"
                )
    return rows or ["node_families: INCONNU"]


def path_drift_rows(summary: dict[str, Any]) -> list[str]:
    rows: list[str] = []
    for item in list_or_empty(summary.get("path_drift_entries")):
        if not isinstance(item, dict):
            continue
        rows.append(f"{missing(item.get('id', 'path_drift'))}: status={missing(item.get('status'))}")
        root_path = dict_or_empty(item.get("root_path"))
        studio_path = dict_or_empty(item.get("studioV2_path"))
        single_path = dict_or_empty(item.get("path"))
        if root_path:
            rows.append(
                f"  root_path: {missing(root_path.get('path'))} | exists={bool_text(root_path.get('exists'))} | "
                f"status={missing(root_path.get('status'))}"
            )
        if studio_path:
            rows.append(
                f"  studioV2_path: {missing(studio_path.get('path'))} | exists={bool_text(studio_path.get('exists'))} | "
                f"status={missing(studio_path.get('status'))}"
            )
        if single_path:
            rows.append(
                f"  path: {missing(single_path.get('path'))} | exists={bool_text(single_path.get('exists'))} | "
                f"status={missing(single_path.get('status'))}"
            )
        rows.append(f"  rule: {missing(item.get('rule'))}")
    return rows or ["Derive de chemins: INCONNU"]


def blocked_runner_rows(summary: dict[str, Any]) -> list[str]:
    runners = dict_or_empty(summary.get("blocked_runners"))
    if not runners:
        return ["Commandes bloquees: INCONNU"]
    return [f"{name}: {status}" for name, status in sorted(runners.items())]


def humangate_question_rows(summary: dict[str, Any]) -> list[str]:
    graph_questions = [
        item
        for item in list_or_empty(summary.get("graph_humangate_questions"))
        if isinstance(item, dict) and item.get("question")
    ]
    if graph_questions:
        rows = ["Decisions HumanGate issues du graphe:"]
        for idx, item in enumerate(graph_questions, start=1):
            rows.append(
                f"{idx}. {missing(item.get('question'))} | source={missing(item.get('source'))} | "
                f"status={missing(item.get('status'))}"
            )
        return rows
    questions = list_or_empty(summary.get("next_humangate_questions"))
    if not questions:
        return ["Aucune question fournie par studioctl"]
    return [f"{idx}. {question}" for idx, question in enumerate(questions, start=1)]


def evidence_rows(summary: dict[str, Any]) -> list[str]:
    rows = [
        "Sources d'evidence:",
        *[
            f"- type={missing(source.get('type'))} | claim_posture={missing(source.get('claim_posture'))}"
            for source in list_or_empty(summary.get("evidence_sources"))
            if isinstance(source, dict)
        ],
        "Etat des sources:",
        line("source_state_summary", summary.get("source_state_summary", {"status": INCONNU})),
        "Etat du routage:",
        line("route_state_summary", summary.get("route_state_summary", {"status": INCONNU})),
        "runtime_claim_gate:",
        line("runtime_claim_gate", summary.get("runtime_claim_gate", {"status": INCONNU})),
        "Claims bloques:",
        *bullet_lines(summary.get("blocked_claims", []), 120),
        line("claim_posture", summary.get("claim_posture", INCONNU)),
        line("no_global_ready_verdict", summary.get("no_global_ready_verdict", INCONNU)),
    ]
    return rows


def surface_map_rows(summary: dict[str, Any], limit: int = 10) -> list[str]:
    surfaces = [row for row in list_or_empty(summary.get("surface_rows")) if isinstance(row, dict)]
    if not surfaces:
        return ["Surface Map: INCONNU"]
    rows = [f"Total surfaces: {len(surfaces)} | Affichees: {min(len(surfaces), limit)}"]
    for row in surfaces[:limit]:
        rows.append(
            f"{missing(row.get('surface'))}: path={missing(row.get('path'))} | exists={bool_text(row.get('exists'))} | "
            f"status={missing(row.get('status'))} | owner={missing(row.get('owner_hint'))}"
        )
        rows.append(f"  authority_boundary: {missing(row.get('authority_boundary'))}")
        rows.append(f"  read_policy: {missing(row.get('read_policy'))} | write_policy: {missing(row.get('write_policy'))}")
    if len(surfaces) > limit:
        rows.append(f"+ {len(surfaces) - limit} surfaces supplementaires non affichees")
    return rows


def llm_lora_rows() -> list[str]:
    return [
        "Entrainement: BLOCKED",
        "Dataset generation/reset: BLOCKED",
        "Checkpoints/model promotion: BLOCKED",
        "LLM support: PASSIVE",
    ]


def top_bar(summary: dict[str, Any], width: int) -> str:
    return border("Etat du repo", ["UXPILOTE DASHBOARD LOCAL - DONNEES REELLES FR", *repo_state_rows(summary)], width)


def render_command_failures(summary: dict[str, Any]) -> list[str]:
    failures = [row for row in summary["studioctl_commands"] if row["error"]]
    if not failures:
        return ["Echecs studioctl: aucun"]
    rows = ["Echecs studioctl:"]
    for row in failures:
        if row.get("view") == "audit_chains":
            rows.append("Catalogue des chaines indisponible")
        rows.append(f"- source: {row['command']} | status: UNKNOWN | erreur: {row['error']}")
    return rows


def render_cockpit_view(summary: dict[str, Any], width: int) -> str:
    width = clamp_width(width)
    rows = [
        top_bar(summary, width),
        border("Surfaces", surface_status_rows(summary), width),
        border("Scripts Control", script_family_rows(summary, include_paths=False), width),
        border("Decisions HumanGate en attente", humangate_question_rows(summary), width),
        border("Commandes bloquees", blocked_runner_rows(summary), width),
        border("Evidence / Claims", evidence_rows(summary)[:12], width),
        border("LLM / LoRA", llm_lora_rows(), width),
        border("Sources studioctl", render_command_failures(summary), width),
        "",
    ]
    return "\n".join(rows)


def render_scripts_view(summary: dict[str, Any], width: int) -> str:
    width = clamp_width(width)
    rows = [
        top_bar(summary, width),
        border("Scripts Control", script_family_rows(summary, include_paths=True), width),
        border("Outils de controle", audit_chain_brief_rows(summary), width),
        border("Derive de chemins / routage", path_drift_rows(summary), width),
        border("Commandes bloquees", blocked_runner_rows(summary), width),
        border("Decisions HumanGate en attente", humangate_question_rows(summary), width),
        "",
    ]
    return "\n".join(rows)


def render_decisions_view(summary: dict[str, Any], width: int) -> str:
    width = clamp_width(width)
    rows = [
        top_bar(summary, width),
        border("Decisions HumanGate en attente", humangate_question_rows(summary), width),
        border("HumanGate Chain", humangate_chain_rows(summary), width),
        border("Derive de chemins / routage", path_drift_rows(summary), width),
        border("Commandes bloquees", blocked_runner_rows(summary), width),
        "",
    ]
    return "\n".join(rows)


def render_evidence_view(summary: dict[str, Any], width: int) -> str:
    width = clamp_width(width)
    rows = [
        top_bar(summary, width),
        border("Surfaces", surface_status_rows(summary), width),
        border("Evidence / Claims", evidence_rows(summary), width),
        border("Surface Map", surface_map_rows(summary), width),
        border("LLM / LoRA", llm_lora_rows(), width),
        "",
    ]
    return "\n".join(rows)


def render_view(summary: dict[str, Any], view: str, width: int) -> str:
    if view == "scripts":
        return render_scripts_view(summary, width)
    if view == "decisions":
        return render_decisions_view(summary, width)
    if view == "evidence":
        return render_evidence_view(summary, width)
    return render_cockpit_view(summary, width)


def html_status_badge(status: Any) -> str:
    return f"<span class=\"{html_status_class(status)}\">{html_escape(status)}</span>"


def html_table(headers: list[str], rows: list[list[Any]]) -> str:
    head = "".join(f"<th>{html_escape(header)}</th>" for header in headers)
    body_rows = []
    for row in rows:
        body_rows.append("<tr>" + "".join(f"<td>{html_escape(value)}</td>" for value in row) + "</tr>")
    body = "\n".join(body_rows) or f"<tr><td colspan=\"{len(headers)}\">{INCONNU}</td></tr>"
    return f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"


def html_status_table(headers: list[str], rows: list[list[Any]], status_index: int) -> str:
    head = "".join(f"<th>{html_escape(header)}</th>" for header in headers)
    body_rows = []
    for row in rows:
        cells = []
        for idx, value in enumerate(row):
            if idx == status_index:
                cells.append(f"<td>{html_status_badge(value)}</td>")
            else:
                cells.append(f"<td>{html_escape(value)}</td>")
        body_rows.append("<tr>" + "".join(cells) + "</tr>")
    body = "\n".join(body_rows) or f"<tr><td colspan=\"{len(headers)}\">{INCONNU}</td></tr>"
    return f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"


def html_family_rows(summary: dict[str, Any]) -> list[list[Any]]:
    rows = []
    families = dict_or_empty(summary.get("node_families"))
    for name in EXPECTED_NODE_FAMILIES:
        family = dict_or_empty(families.get(name))
        paths = family_paths(family)
        path_text = "; ".join(
            f"{missing(path.get('path'))} (exists={bool_text(path.get('exists'))}, status={missing(path.get('status'))})"
            for path in paths
        ) or INCONNU
        rows.append(
            [
                name,
                missing(family.get("status")),
                missing(family.get("surface")),
                missing(family.get("risk")),
                len(paths),
                path_text,
            ]
        )
    return rows


def html_path_drift_rows(summary: dict[str, Any]) -> list[list[Any]]:
    rows = []
    for item in list_or_empty(summary.get("path_drift_entries")):
        if not isinstance(item, dict):
            continue
        root_path = dict_or_empty(item.get("root_path"))
        studio_path = dict_or_empty(item.get("studioV2_path"))
        single_path = dict_or_empty(item.get("path"))
        rows.append(
            [
                missing(item.get("id", "path_drift")),
                missing(root_path.get("path") if root_path else single_path.get("path")),
                bool_text(root_path.get("exists") if root_path else single_path.get("exists")),
                missing(root_path.get("status") if root_path else single_path.get("status")),
                missing(studio_path.get("path")),
                bool_text(studio_path.get("exists")) if studio_path else INCONNU,
                missing(studio_path.get("status")) if studio_path else INCONNU,
                missing(item.get("status")),
                missing(item.get("rule")),
            ]
        )
    return rows


def html_surface_rows(summary: dict[str, Any]) -> list[list[Any]]:
    return [
        [SURFACE_LABELS_FR[surface], surface, summary.get("status_by_surface", {}).get(surface, INCONNU)]
        for surface in CANONICAL_SURFACES
    ]


def html_surface_map_rows(summary: dict[str, Any], limit: int = 10) -> list[list[Any]]:
    rows = []
    for row in [item for item in list_or_empty(summary.get("surface_rows")) if isinstance(item, dict)][:limit]:
        rows.append(
            [
                missing(row.get("surface")),
                missing(row.get("path")),
                bool_text(row.get("exists")),
                missing(row.get("status")),
                missing(row.get("owner_hint")),
                missing(row.get("authority_boundary")),
                missing(row.get("read_policy")),
                missing(row.get("write_policy")),
            ]
        )
    return rows


def html_evidence_sources(summary: dict[str, Any]) -> str:
    rows = [
        [missing(source.get("type")), missing(source.get("claim_posture"))]
        for source in list_or_empty(summary.get("evidence_sources"))
        if isinstance(source, dict)
    ]
    return html_table(["type", "claim_posture"], rows)


def render_html_failure_card(summary: dict[str, Any]) -> str:
    failures = [row for row in summary["studioctl_commands"] if row["error"]]
    if not failures:
        return ""
    rows = "\n".join(
        "<li>"
        f"<strong>source: {html_escape(row['command'])}</strong>"
        f"<span>status: UNKNOWN</span>"
        f"<em>{html_escape(row['error'])}</em>"
        "</li>"
        for row in failures
    )
    return f"""
    <section class="panel warning">
      <div class="panel-head">
        <div><h2>Echecs studioctl</h2><p>Dashboard partiel; aucune relance en boucle.</p></div>
        {html_status_badge("UNKNOWN")}
      </div>
      <ul class="plain-list">{rows}</ul>
    </section>
    """


def render_html_dashboard(summary: dict[str, Any]) -> str:
    head = str(summary.get("head", INCONNU))
    if len(head) > 12:
        head = head[:12]
    cards = [
        ("Changements", summary.get("pre_existing_changes_count", INCONNU), "pre-existants"),
        ("Surfaces", len(CANONICAL_SURFACES), "canoniques"),
        ("Familles scripts", len(dict_or_empty(summary.get("node_families"))), "node_families"),
        ("Commandes bloquees", len(dict_or_empty(summary.get("blocked_runners"))), "runners"),
        ("Questions HumanGate", len(list_or_empty(summary.get("next_humangate_questions"))), "en attente"),
        ("Surface Map", summary.get("surface_rows_total", INCONNU), "entrees"),
    ]
    cards_html = "\n".join(
        f"<article class=\"card\"><p>{html_escape(title)}</p><strong>{html_escape(value)}</strong><span>{html_escape(label)}</span></article>"
        for title, value, label in cards
    )
    questions = list_or_empty(summary.get("next_humangate_questions"))
    question_html = (
        "<ol>" + "".join(f"<li>{html_escape(question)}</li>" for question in questions) + "</ol>"
        if questions
        else "<p>Aucune question fournie par studioctl</p>"
    )
    blocked_rows = [[name, status] for name, status in sorted(dict_or_empty(summary.get("blocked_runners")).items())]
    command_rows = [
        [row["view"], row["command"], row["status"], missing(row["returncode"]), row["error"] or ""]
        for row in summary["studioctl_commands"]
    ]
    surface_count_note = ""
    if summary.get("surface_rows_total", 0) > 10:
        surface_count_note = f"<p class=\"note\">+ {summary['surface_rows_total'] - 10} surfaces supplementaires non affichees.</p>"

    return f"""<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>UxPilote Dashboard donnees reelles FR</title>
  <style>
    :root {{
      color-scheme: light;
      --ink: #202326;
      --muted: #5d6670;
      --line: #cbd3dc;
      --panel: #ffffff;
      --bg: #eef2f5;
      --blue: #1f5f9f;
      --green: #257053;
      --yellow: #7b6100;
      --red: #9c2f2f;
      --gray: #66717d;
      --black: #252a30;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      line-height: 1.42;
      letter-spacing: 0;
    }}
    header, main, footer {{ width: min(1240px, calc(100% - 28px)); margin: 0 auto; }}
    header {{ padding: 22px 0 14px; border-bottom: 3px solid var(--ink); }}
    h1 {{ margin: 0 0 12px; font-size: clamp(28px, 5vw, 46px); line-height: 1; letter-spacing: 0; }}
    h2 {{ margin: 0; font-size: 20px; letter-spacing: 0; }}
    p {{ margin: 0; }}
    main {{ display: grid; gap: 14px; padding: 16px 0 24px; }}
    .meta-grid, .footer-grid, .cards, .two-col {{ display: grid; gap: 10px; }}
    .meta-grid, .footer-grid {{ grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }}
    .cards {{ grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }}
    .two-col {{ grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); }}
    .panel, .card, .meta-grid div, .footer-grid div {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
    }}
    .panel {{ padding: 14px; overflow-x: auto; }}
    .card {{ padding: 12px; min-height: 96px; }}
    .card p, .meta-grid span, .footer-grid span, .note {{ color: var(--muted); }}
    .card strong {{ display: block; font-size: 28px; line-height: 1.1; margin: 8px 0 4px; }}
    .card span {{ font-weight: 700; }}
    .meta-grid div, .footer-grid div {{ padding: 9px 10px; min-width: 0; }}
    .meta-grid span, .footer-grid span {{ display: block; font-size: 11px; text-transform: uppercase; }}
    .meta-grid strong, .footer-grid strong {{ display: block; overflow-wrap: anywhere; }}
    .panel-head {{ display: flex; justify-content: space-between; align-items: start; gap: 12px; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid var(--line); }}
    table {{ width: 100%; border-collapse: collapse; min-width: 720px; }}
    th, td {{ border-bottom: 1px solid var(--line); padding: 7px 8px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }}
    th {{ background: #f8fafc; }}
    ol {{ margin: 0; padding-left: 22px; }}
    .plain-list {{ margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }}
    .plain-list li {{ background: #f8fafc; border: 1px solid var(--line); border-radius: 6px; padding: 8px; }}
    .boundary-line {{ margin-top: 10px; border: 1px solid var(--line); background: var(--panel); padding: 10px; font-weight: 700; overflow-wrap: anywhere; }}
    .warning {{ border-color: var(--red); }}
    .status {{ display: inline-block; border-radius: 999px; padding: 3px 8px; color: #fff; background: var(--gray); font-size: 12px; font-weight: 700; white-space: nowrap; }}
    .implemented {{ background: var(--green); }}
    .tested {{ background: var(--blue); }}
    .documented-only {{ background: var(--black); }}
    .passive {{ background: var(--gray); }}
    .blocked, .blocked-passive {{ background: var(--red); }}
    .unknown {{ background: var(--yellow); }}
    .not-found {{ background: #111; }}
    @media (max-width: 760px) {{
      header, main, footer {{ width: min(100% - 18px, 1240px); }}
      .two-col {{ grid-template-columns: 1fr; }}
      .panel-head {{ display: block; }}
    }}
  </style>
</head>
<body>
  <header>
    <h1>UxPilote Dashboard local - donnees reelles</h1>
    <div class="meta-grid" aria-label="Etat du repo">
      {html_kv("Racine / cwd", summary.get("cwd", INCONNU))}
      {html_kv("Branche", summary.get("branch", INCONNU))}
      {html_kv("HEAD", head)}
      {html_kv("Etat worktree", summary.get("worktree_status", INCONNU))}
      {html_kv("claim_posture", summary.get("claim_posture", INCONNU))}
      {html_kv("no_global_ready_verdict", summary.get("no_global_ready_verdict", INCONNU))}
      {html_kv("Nombre de changements pre-existants", summary.get("pre_existing_changes_count", INCONNU))}
    </div>
    <p class="boundary-line">Etat du repo | read_only: true | writes_files: false except explicit --export-html target | runtime_authority: NONE | candidate-only | NO_CLAIM_ALLOWED | no_global_ready_verdict: true</p>
  </header>
  <main>
    <section class="cards">{cards_html}</section>
    {render_html_failure_card(summary)}
    <section class="panel">
      <div class="panel-head"><div><h2>Surfaces</h2><p>Valeurs status_by_surface derivees des sorties studioctl JSON.</p></div>{html_status_badge("PASSIVE")}</div>
      {html_status_table(["Libelle", "surface", "status"], html_surface_rows(summary), 2)}
    </section>
    <section class="panel">
      <div class="panel-head"><div><h2>Scripts Control</h2><p>node_families reels de uxpilote scripts-control.</p></div>{html_status_badge(summary.get("scripts_uxpilote_status", INCONNU))}</div>
      {html_status_table(["family", "status", "surface", "risk", "nb chemins", "paths"], html_family_rows(summary), 1)}
    </section>
    <section class="panel">
      <div class="panel-head"><div><h2>Derive de chemins / routage</h2><p>path_drift brut expose sans substitution silencieuse.</p></div>{html_status_badge("UNKNOWN")}</div>
      {html_status_table(["id", "root/path", "root exists", "root status", "studioV2 path", "studioV2 exists", "studioV2 status", "status", "rule"], html_path_drift_rows(summary), 7)}
    </section>
    <section class="two-col">
      <article class="panel">
        <div class="panel-head"><div><h2>Commandes bloquees</h2><p>blocked_runners depuis studioctl.</p></div>{html_status_badge("BLOCKED")}</div>
        {html_status_table(["commande", "status"], blocked_rows, 1)}
      </article>
      <article class="panel">
        <div class="panel-head"><div><h2>Decisions HumanGate en attente</h2><p>next_humangate_questions depuis studioctl.</p></div>{html_status_badge("DOCUMENTED_ONLY")}</div>
        {question_html}
      </article>
    </section>
    <section class="two-col">
      <article class="panel">
        <div class="panel-head"><div><h2>Evidence / Claims</h2><p>Observations seulement; aucune preuve de claim.</p></div>{html_status_badge(summary.get("claim_posture", INCONNU))}</div>
        <h3>Sources d'evidence</h3>
        {html_evidence_sources(summary)}
        <h3>Etat des sources</h3>
        <p>{html_escape(summary.get("source_state_summary", {"status": INCONNU}))}</p>
        <h3>Etat du routage</h3>
        <p>{html_escape(summary.get("route_state_summary", {"status": INCONNU}))}</p>
        <h3>Claims bloques</h3>
        {html_list(summary.get("blocked_claims", []))}
      </article>
      <article class="panel">
        <div class="panel-head"><div><h2>LLM / LoRA</h2><p>Statut passif/bloque sauf donnees reelles futures.</p></div>{html_status_badge("BLOCKED")}</div>
        {html_status_table(["surface", "status"], [["Entrainement", "BLOCKED"], ["Dataset generation/reset", "BLOCKED"], ["Checkpoints/model promotion", "BLOCKED"], ["LLM support", "PASSIVE"]], 1)}
        <h3>runtime_claim_gate</h3>
        <p>{html_escape(summary.get("runtime_claim_gate", {"status": INCONNU}))}</p>
      </article>
    </section>
    <section class="panel">
      <div class="panel-head"><div><h2>Surface Map</h2><p>Top 10 surfaces[] depuis studioctl surface map.</p></div>{html_status_badge("PASSIVE")}</div>
      {html_status_table(["surface", "path", "exists", "status", "owner_hint", "authority_boundary", "read_policy", "write_policy"], html_surface_map_rows(summary), 3)}
      {surface_count_note}
    </section>
    <section class="panel">
      <div class="panel-head"><div><h2>Sources studioctl</h2><p>Commandes JSON autorisees et statut de lecture.</p></div>{html_status_badge("PASSIVE")}</div>
      {html_status_table(["view", "command", "status", "returncode", "error"], command_rows, 2)}
    </section>
  </main>
  <footer>
    <div class="footer-grid">
      {html_kv("read_only", True)}
      {html_kv("writes_files", "false except explicit --export-html target")}
      {html_kv("runtime_authority", "NONE")}
      {html_kv("candidate-only", True)}
      {html_kv("claim_verdict", CLAIM_POSTURE)}
      {html_kv("no_global_ready_verdict", True)}
    </div>
    <p class="boundary-line">read_only: true | writes_files: false except explicit --export-html target | runtime_authority: NONE | candidate-only | NO_CLAIM_ALLOWED | no_global_ready_verdict: true</p>
  </footer>
</body>
</html>
"""


SURFACE_EXPLANATIONS_FR = {
    "active_runtime_code": "Rust runtime truth; aucune mutation par UxPilote.",
    "tests": "Assets de validation; lecture passive uniquement.",
    "artifacts_runtime_outputs": "Sorties et apercus locaux; non canoniques.",
    "canonical_docs": "Docs de controle; activation bloquee.",
    "roadmap_docs_only": "Files et statuts de pilotage; evidence passive.",
    "inference": "Aide/proposition uniquement; autorite finale bloquee.",
}


def first_status_count(summary: dict[str, Any], status: str) -> int:
    return sum(1 for value in dict_or_empty(summary.get("blocked_runners")).values() if value == status)


def compact_question_rows(summary: dict[str, Any], limit: int = 3) -> list[str]:
    questions = list_or_empty(summary.get("next_humangate_questions"))
    if not questions:
        return ["A faire maintenant: Aucune question fournie par studioctl"]
    rows = [f"{idx}. {question}" for idx, question in enumerate(questions[:limit], start=1)]
    remaining = len(questions) - limit
    if remaining > 0:
        rows.append(f"+{remaining} autres")
    return rows


def compact_repo_summary_rows(summary: dict[str, Any]) -> list[str]:
    return [
        f"Repo: {missing(summary.get('branch'))} @ {missing(str(summary.get('head', INCONNU))[:12])}",
        f"Worktree: {missing(summary.get('worktree_status'))} | changements pre-existants: {missing(summary.get('pre_existing_changes_count'))}",
        f"Claims: {missing(summary.get('claim_posture'))} | no_global_ready_verdict: {render_value(summary.get('no_global_ready_verdict', INCONNU))}",
        f"Blocages: {first_status_count(summary, 'BLOCKED')} commandes bloquees | scripts/uxpilote: {missing(summary.get('scripts_uxpilote_status'))}",
    ]


def render_cockpit_view(summary: dict[str, Any], width: int) -> str:
    width = clamp_width(width)
    rows = [
        border("UXPILOTE - TABLEAU DE BORD", compact_repo_summary_rows(summary), width),
        border("A faire maintenant", compact_question_rows(summary), width),
        border("Surfaces", surface_status_rows(summary), width),
        border("Routage scripts", path_drift_rows(summary)[:10], width),
        border("Commandes bloquees", blocked_runner_rows(summary), width),
        "",
    ]
    return "\n".join(rows)


def html_badge(status: Any, label: Any | None = None) -> str:
    text = status if label is None else label
    return f"<span class=\"{html_status_class(status)}\">{html_escape(text)}</span>"


def html_metric_card(title: str, value: Any, meta: str, status: str = "PASSIVE") -> str:
    return (
        f"<article class=\"metric-card tone-{html.escape(str(status).lower(), quote=True)}\">"
        f"<p>{html_escape(title)}</p>"
        f"<strong>{html_escape(value)}</strong>"
        f"<span>{html_escape(meta)}</span>"
        f"</article>"
    )


def html_surface_cards(summary: dict[str, Any]) -> str:
    cards = []
    statuses = dict_or_empty(summary.get("status_by_surface"))
    for surface in CANONICAL_SURFACES:
        status = statuses.get(surface, INCONNU)
        cards.append(
            "<article class=\"surface-card\">"
            f"<div class=\"card-top\"><h3>{html_escape(SURFACE_LABELS_FR[surface])}</h3>{html_badge(status)}</div>"
            f"<p class=\"mono\">{html_escape(surface)}</p>"
            f"<p>{html_escape(SURFACE_EXPLANATIONS_FR[surface])}</p>"
            "</article>"
        )
    return "\n".join(cards)


def html_question_cards(summary: dict[str, Any], limit: int = 3) -> str:
    questions = list_or_empty(summary.get("next_humangate_questions"))
    if not questions:
        return "<article class=\"decision-card\"><strong>1</strong><p>Aucune question fournie par studioctl</p></article>"
    cards = []
    for idx, question in enumerate(questions[:limit], start=1):
        cards.append(f"<article class=\"decision-card\"><strong>{idx}</strong><p>{html_escape(question)}</p></article>")
    remaining = len(questions) - limit
    if remaining > 0:
        cards.append(f"<article class=\"decision-card muted-card\"><strong>+{remaining}</strong><p>autres decisions en attente</p></article>")
    return "\n".join(cards)


def html_script_cards(summary: dict[str, Any]) -> str:
    cards = []
    families = dict_or_empty(summary.get("node_families"))
    for name in EXPECTED_NODE_FAMILIES:
        family = dict_or_empty(families.get(name))
        status = missing(family.get("status"))
        paths = family_paths(family)
        cards.append(
            f"<article class=\"script-card family-{html.escape(name.replace('_', '-'), quote=True)}\">"
            f"<div class=\"card-top\"><h3>{html_escape(name)}</h3>{html_badge(status)}</div>"
            f"<dl><dt>surface</dt><dd>{html_escape(missing(family.get('surface')))}</dd>"
            f"<dt>chemins</dt><dd>{len(paths)}</dd></dl>"
            f"<p>{html_escape(missing(family.get('risk')))}</p>"
            "</article>"
        )
    return "\n".join(cards)


def path_label(path: dict[str, Any]) -> str:
    if not path:
        return INCONNU
    return f"{missing(path.get('path'))} ({bool_text(path.get('exists'))}, {missing(path.get('status'))})"


def html_path_drift_cards(summary: dict[str, Any], limit: int = 8) -> str:
    entries = [item for item in list_or_empty(summary.get("path_drift_entries")) if isinstance(item, dict)]
    if not entries:
        return "<article class=\"drift-card\"><h3>INCONNU</h3><p>Aucune derive fournie par studioctl.</p></article>"
    cards = []
    for item in entries[:limit]:
        root_path = dict_or_empty(item.get("root_path"))
        studio_path = dict_or_empty(item.get("studioV2_path"))
        single_path = dict_or_empty(item.get("path"))
        cards.append(
            "<article class=\"drift-card\">"
            f"<div class=\"card-top\"><h3>{html_escape(missing(item.get('id')))}</h3>{html_badge(missing(item.get('status')))}</div>"
            "<div class=\"compare-grid\">"
            f"<div><span>root</span><strong>{html_escape(path_label(root_path or single_path))}</strong></div>"
            f"<div><span>studioV2</span><strong>{html_escape(path_label(studio_path))}</strong></div>"
            "</div>"
            f"<p>{html_escape(missing(item.get('rule')))}</p>"
            "</article>"
        )
    remaining = len(entries) - limit
    if remaining > 0:
        cards.append(f"<article class=\"drift-card muted-card\"><h3>+{remaining}</h3><p>derive(s) supplementaire(s)</p></article>")
    return "\n".join(cards)


def html_blocked_command_cards(summary: dict[str, Any]) -> str:
    runners = dict_or_empty(summary.get("blocked_runners"))
    if not runners:
        return f"<span class=\"blocked-pill\">{INCONNU}</span>"
    return "\n".join(
        f"<span class=\"blocked-pill\">{html_escape(name)} {html_badge(status)}</span>"
        for name, status in sorted(runners.items())
    )


def html_evidence_cards(summary: dict[str, Any]) -> str:
    sources = list_or_empty(summary.get("evidence_sources"))
    source_state = dict_or_empty(summary.get("source_state_summary"))
    route_state = dict_or_empty(summary.get("route_state_summary"))
    runtime_gate = dict_or_empty(summary.get("runtime_claim_gate"))
    source_types = ", ".join(missing(source.get("type")) for source in sources if isinstance(source, dict)) or INCONNU
    return "\n".join(
        [
            "<article class=\"evidence-card\">"
            "<h3>Sources d'evidence</h3>"
            f"<strong>{len(sources)}</strong><p>{html_escape(source_types)}</p>"
            "</article>",
            "<article class=\"evidence-card\">"
            "<h3>Etat des sources</h3>"
            f"<p>total_sources: {html_escape(missing(source_state.get('total_sources')))}</p>"
            f"<p>missing_sources: {html_escape(len(list_or_empty(source_state.get('missing_sources'))))}</p>"
            f"<p>evidence_source_type: {html_escape(missing(source_state.get('evidence_source_type')))}</p>"
            "</article>",
            "<article class=\"evidence-card\">"
            "<h3>Etat du routage</h3>"
            f"<p>destination_allowed: {html_escape(bool_text(route_state.get('destination_allowed')))}</p>"
            f"<p>surface: {html_escape(missing(route_state.get('intended_surface')))}</p>"
            f"<p>promotion_gate: {html_escape(missing(route_state.get('promotion_gate')))}</p>"
            "</article>",
            "<article class=\"evidence-card warning-card\">"
            "<h3>runtime_claim_gate</h3>"
            f"{html_badge(missing(runtime_gate.get('runtime_status')))}"
            f"<p>actual_runtime: {html_escape(missing(runtime_gate.get('actual_runtime')))}</p>"
            f"<p>exact_runtime_claim_allowed: {html_escape(bool_text(runtime_gate.get('exact_runtime_claim_allowed')))}</p>"
            "</article>",
            "<article class=\"evidence-card warning-card\">"
            "<h3>claim_posture</h3>"
            f"{html_badge(summary.get('claim_posture', INCONNU), summary.get('claim_posture', INCONNU))}"
            "<p>Observations seulement; aucune preuve de claim.</p>"
            "</article>",
        ]
    )


def render_html_failure_card(summary: dict[str, Any]) -> str:
    failures = [row for row in summary["studioctl_commands"] if row["error"]]
    if not failures:
        return ""
    cards = []
    for row in failures:
        if row.get("view") == "audit_chains":
            title = "Catalogue des chaines indisponible"
        elif row.get("view") == "graph":
            title = "Graphe indisponible"
        else:
            title = "Source indisponible"
        cards.append(
            "<article class=\"source-card warning-card\">"
            f"<h3>{html_escape(title)}</h3>"
            f"{html_badge('UNKNOWN')}"
            f"<p>{html_escape(row['command'])}</p>"
            f"<p>{html_escape(row['error'])}</p>"
            "</article>"
        )
    return f"<section class=\"panel source-failures\"><div class=\"section-head\"><h2>Source indisponible</h2></div><div class=\"source-grid\">{''.join(cards)}</div></section>"


def render_html_dashboard(summary: dict[str, Any]) -> str:
    head = str(summary.get("head", INCONNU))
    if len(head) > 12:
        head = head[:12]
    blocked_count = first_status_count(summary, "BLOCKED")
    questions = list_or_empty(summary.get("next_humangate_questions"))
    drift_count = len(list_or_empty(summary.get("path_drift_entries")))
    cards_html = "\n".join(
        [
            html_metric_card("Etat du repo", summary.get("worktree_status", INCONNU), f"{summary.get('pre_existing_changes_count', INCONNU)} changements", "PASSIVE"),
            html_metric_card("Risques / blocages", blocked_count, "commandes BLOCKED", "BLOCKED"),
            html_metric_card("Decisions HumanGate", len(questions), "questions", "DOCUMENTED_ONLY"),
            html_metric_card("Routage scripts", drift_count, "derives observees", "UNKNOWN"),
        ]
    )
    llm_rows = [
        ["Entrainement", "BLOCKED"],
        ["Dataset generation/reset", "BLOCKED"],
        ["Checkpoints/model promotion", "BLOCKED"],
        ["Support LLM", "PASSIVE"],
    ]

    return f"""<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>UXPILOTE - TABLEAU DE BORD</title>
  <style>
    :root {{
      color-scheme: light;
      --ink: #222831;
      --muted: #5d6670;
      --line: #d4d9df;
      --panel: #ffffff;
      --bg: #f1f3f5;
      --soft: #f8fafc;
      --green: #24734f;
      --blue: #23649a;
      --yellow: #946c00;
      --orange: #b35b00;
      --red: #a73535;
      --gray: #69737f;
      --black: #28303a;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      line-height: 1.35;
      letter-spacing: 0;
    }}
    header, main, footer {{ width: min(1280px, calc(100% - 28px)); margin: 0 auto; }}
    header {{
      margin-top: 14px;
      background: #ffffff;
      border: 1px solid var(--line);
      border-top: 6px solid var(--black);
      border-radius: 8px;
      padding: 16px;
    }}
    h1 {{ margin: 0 0 12px; font-size: clamp(28px, 5vw, 48px); line-height: 1; letter-spacing: 0; }}
    h2 {{ margin: 0; font-size: 22px; letter-spacing: 0; }}
    h3 {{ margin: 0; font-size: 16px; letter-spacing: 0; }}
    p {{ margin: 0; }}
    main {{ display: grid; gap: 16px; padding: 16px 0 24px; }}
    .header-strip {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 8px;
    }}
    .header-strip div, footer div {{
      background: var(--soft);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px 10px;
      min-width: 0;
    }}
    .header-strip span, footer span, .compare-grid span {{ display: block; color: var(--muted); font-size: 11px; text-transform: uppercase; }}
    .header-strip strong, footer strong, .compare-grid strong {{ display: block; overflow-wrap: anywhere; }}
    .hero-grid, .surface-grid, .script-grid, .drift-grid, .evidence-grid, .source-grid {{
      display: grid;
      gap: 12px;
    }}
    .hero-grid {{ grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }}
    .surface-grid {{ grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }}
    .script-grid {{ grid-template-columns: repeat(auto-fit, minmax(245px, 1fr)); }}
    .drift-grid {{ grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }}
    .evidence-grid {{ grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }}
    .panel, .metric-card, .surface-card, .script-card, .drift-card, .decision-card, .evidence-card, .source-card {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(0,0,0,.04);
    }}
    .panel {{ padding: 14px; }}
    .section-head {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--line);
    }}
    .metric-card {{ padding: 16px; min-height: 128px; border-top: 5px solid var(--gray); }}
    .metric-card p {{ color: var(--muted); font-weight: 700; }}
    .metric-card strong {{ display: block; font-size: 34px; line-height: 1; margin: 12px 0 8px; }}
    .metric-card span {{ font-weight: 700; }}
    .tone-blocked {{ border-top-color: var(--red); }}
    .tone-unknown {{ border-top-color: var(--yellow); }}
    .tone-documented_only, .tone-documented-only {{ border-top-color: var(--black); }}
    .tone-passive {{ border-top-color: var(--gray); }}
    .surface-card, .script-card, .drift-card, .decision-card, .evidence-card, .source-card {{ padding: 12px; }}
    .card-top {{ display: flex; justify-content: space-between; align-items: start; gap: 10px; margin-bottom: 10px; }}
    .mono {{ color: var(--muted); font-family: Consolas, 'Courier New', monospace; margin-bottom: 8px; }}
    .status {{ display: inline-block; border-radius: 999px; padding: 5px 10px; color: #fff; background: var(--gray); font-size: 12px; font-weight: 800; white-space: nowrap; }}
    .implemented {{ background: var(--green); }}
    .tested {{ background: var(--blue); }}
    .documented-only {{ background: var(--black); }}
    .passive {{ background: var(--gray); }}
    .blocked, .blocked-passive {{ background: var(--red); }}
    .unknown {{ background: var(--yellow); }}
    .not-found {{ background: #111; }}
    .no-claim-allowed {{ background: var(--red); }}
    .decision-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }}
    .decision-card {{
      display: grid;
      grid-template-columns: 48px 1fr;
      gap: 12px;
      align-items: start;
      border-left: 6px solid var(--orange);
    }}
    .decision-card strong {{
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: var(--orange);
      color: white;
      font-size: 20px;
    }}
    .muted-card {{ background: #f8fafc; color: var(--muted); }}
    .script-card {{ border-top: 5px solid var(--gray); }}
    .family-studioctl {{ border-top-color: var(--green); }}
    .family-validators {{ border-top-color: var(--blue); }}
    .family-control-plane, .family-operator, .family-uxpilote, .family-legacy-root-compatibility {{ border-top-color: var(--yellow); }}
    .family-blocked-runners {{ border-top-color: var(--red); }}
    dl {{ display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; margin: 0 0 10px; }}
    dt {{ color: var(--muted); }}
    dd {{ margin: 0; font-weight: 700; }}
    .compare-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }}
    .compare-grid div {{ background: var(--soft); border: 1px solid var(--line); border-radius: 6px; padding: 8px; }}
    .blocked-pills {{ display: flex; flex-wrap: wrap; gap: 8px; }}
    .blocked-pill {{ display: inline-flex; align-items: center; gap: 8px; border: 1px solid #efb4b4; background: #fff5f5; border-radius: 999px; padding: 7px 9px; font-weight: 700; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ border-bottom: 1px solid var(--line); padding: 8px; text-align: left; vertical-align: top; }}
    footer {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 8px; padding-bottom: 26px; }}
    .warning-card {{ border-color: #e49b9b; background: #fff8f8; }}
    @media (max-width: 760px) {{
      header, main, footer {{ width: min(100% - 18px, 1280px); }}
      .compare-grid, .decision-card {{ grid-template-columns: 1fr; }}
      .section-head {{ display: block; }}
    }}
  </style>
</head>
<body>
  <header>
    <h1>UXPILOTE - TABLEAU DE BORD</h1>
    <div class="header-strip">
      {html_kv("branch", summary.get("branch", INCONNU))}
      {html_kv("head", head)}
      {html_kv("worktree", summary.get("worktree_status", INCONNU))}
      {html_kv("claim posture", summary.get("claim_posture", INCONNU))}
      {html_kv("no_global_ready_verdict", summary.get("no_global_ready_verdict", INCONNU))}
      {html_kv("candidate-only", True)}
      {html_kv("read_only", True)}
    </div>
  </header>
  <main>
    <section class="hero-grid">{cards_html}</section>
    {render_html_failure_card(summary)}
    <section class="panel">
      <div class="section-head"><h2>A faire maintenant</h2>{html_badge("DOCUMENTED_ONLY")}</div>
      <div class="decision-grid">{html_question_cards(summary)}</div>
    </section>
    <section class="panel">
      <div class="section-head"><h2>Surfaces</h2>{html_badge("PASSIVE")}</div>
      <div class="surface-grid">{html_surface_cards(summary)}</div>
    </section>
    <section class="panel">
      <div class="section-head"><h2>Scripts Control</h2>{html_badge(summary.get("scripts_uxpilote_status", INCONNU))}</div>
      <div class="script-grid">{html_script_cards(summary)}</div>
    </section>
    <section class="panel">
      <div class="section-head"><h2>Derive de chemins / routage</h2>{html_badge("UNKNOWN")}</div>
      <div class="drift-grid">{html_path_drift_cards(summary)}</div>
    </section>
    <section class="panel">
      <div class="section-head"><h2>Commandes bloquees</h2>{html_badge("BLOCKED")}</div>
      <div class="blocked-pills">{html_blocked_command_cards(summary)}</div>
    </section>
    <section class="panel">
      <div class="section-head"><h2>Evidence / Claims</h2>{html_badge(summary.get("claim_posture", INCONNU))}</div>
      <div class="evidence-grid">{html_evidence_cards(summary)}</div>
    </section>
    <section class="panel">
      <div class="section-head"><h2>LLM / LoRA</h2>{html_badge("BLOCKED")}</div>
      {html_status_table(["surface", "status"], llm_rows, 1)}
    </section>
  </main>
  <footer>
    {html_kv("runtime_authority", "NONE")}
    {html_kv("writes_files", "false")}
    {html_kv("claim_verdict", CLAIM_POSTURE)}
    {html_kv("no_global_ready_verdict", True)}
    <div><span>boundary</span><strong>candidate-only | NO_CLAIM_ALLOWED | read_only: true | no_global_ready_verdict: true</strong></div>
  </footer>
</body>
</html>
"""
PILOT_ALLOWED_DECISIONS = (
    "garder UNKNOWN",
    "enregistrer candidat",
    "geler",
    "ecarter",
    "demander revision",
)

CRITICAL_BLOCKED_ACTIONS = (
    "benchmark",
    "gameplay_execution",
    "training",
    "dataset_generation_reset",
    "model_checkpoint_creation_promotion",
    "latest_json_creation",
    "lab_runs_creation",
    "commit_push_branch_PR",
)


def short_head(summary: dict[str, Any]) -> str:
    head = str(summary.get("head", INCONNU))
    return head[:12] if len(head) > 12 else head


def normalized_key(value: Any) -> str:
    return str(value).lower().replace("-", "_").replace(" ", "_").replace("/", "_")


def decision_title_fr(question: Any, idx: int) -> str:
    raw = str(question)
    key = normalized_key(raw)
    if "scripts_uxpilote" in key or "scripts/uxpilote" in key:
        return "Decider le statut de scripts/uxpilote"
    if "control_plane" in key:
        return "Decider le chemin officiel control_plane"
    if "operator" in key:
        return "Decider le chemin officiel operator"
    if "ci" in key or "codeowners" in key:
        return "Decider l'alignement CI / CODEOWNERS"
    if "prototype" in key or "candidate_only" in key or "candidate-only" in key:
        return "Decider si le prototype reste candidate-only"
    if "studiov2" in key or "studio_v2" in key:
        return "Decider l'autorite de route scripts/studioV2"
    if "llm" in key or "lora" in key:
        return "Decider le futur charter LLM / LoRA"
    return f"Decision HumanGate {idx}"


def decision_evidence(summary: dict[str, Any], question: Any) -> str:
    key = normalized_key(question)
    if "scripts_uxpilote" in key or "scripts/uxpilote" in key:
        return f"scripts/uxpilote: {missing(summary.get('scripts_uxpilote_status'))}; candidate-only"
    if "control_plane" in key or "operator" in key or "studiov2" in key or "studio_v2" in key:
        entries = [item for item in list_or_empty(summary.get("path_drift_entries")) if isinstance(item, dict)]
        if "control_plane" in key:
            for item in entries:
                item_id = normalized_key(item.get("id"))
                if "control_plane" in item_id:
                    return f"path_drift {missing(item.get('id'))}: {missing(item.get('status'))}"
        if "operator" in key:
            for item in entries:
                item_id = normalized_key(item.get("id"))
                if "operator" in item_id:
                    return f"path_drift {missing(item.get('id'))}: {missing(item.get('status'))}"
        for item in entries:
            item_id = normalized_key(item.get("id"))
            if ("studiov2" in key or "studio_v2" in key) and "studio" in item_id:
                return f"path_drift {missing(item.get('id'))}: {missing(item.get('status'))}"
    if "ci" in key or "codeowners" in key:
        return "CI / CODEOWNERS: mutation BLOCKED; route authority HumanGate requise"
    if "llm" in key or "lora" in key:
        return "LLM / LoRA: helper-only; entrainement et promotion BLOCKED"
    return f"claim_posture: {missing(summary.get('claim_posture'))}; no_global_ready_verdict: true"


def pilot_questions(summary: dict[str, Any]) -> list[Any]:
    graph_questions = [
        item.get("question")
        for item in list_or_empty(summary.get("graph_humangate_questions"))
        if isinstance(item, dict) and item.get("question")
    ]
    if graph_questions:
        return graph_questions
    questions = list_or_empty(summary.get("next_humangate_questions"))
    if questions:
        return questions
    return [item.get("next_humangate_question") for item in list_or_empty(summary.get("decision_queue")) if isinstance(item, dict)]


def critical_blocked_status(summary: dict[str, Any], action: str) -> str:
    runners = dict_or_empty(summary.get("blocked_runners"))
    action_key = normalized_key(action)
    for name, status in runners.items():
        name_key = normalized_key(name)
        if action_key in name_key or name_key in action_key:
            return str(status)
        if action == "gameplay_execution" and "gameplay" in name_key:
            return str(status)
        if action == "model_checkpoint_creation_promotion" and ("model" in name_key or "checkpoint" in name_key):
            return str(status)
        if action == "dataset_generation_reset" and "dataset" in name_key:
            return str(status)
        if action == "commit_push_branch_PR" and ("git" in name_key or "pr" in name_key):
            return str(status)
    return "BLOCKED"


def html_status_node(label: str, status: str, meta: str = "") -> str:
    meta_html = f"<p>{html_escape(meta)}</p>" if meta else ""
    return (
        "<article class=\"map-node\">"
        f"<div class=\"card-top\"><h3>{html_escape(label)}</h3>{html_badge(status)}</div>"
        f"{meta_html}"
        "</article>"
    )


def html_arrow() -> str:
    return "<span class=\"map-arrow\">-&gt;</span>"


def html_system_map(summary: dict[str, Any]) -> str:
    evidence_status = missing(dict_or_empty(summary.get("status_by_surface")).get("artifacts_runtime_outputs", "PASSIVE"))
    uxpilote_status = missing(summary.get("scripts_uxpilote_status"))
    blocked_status = critical_blocked_status(summary, "benchmark")
    rows = [
        [
            html_status_node("Studio Control", "DOCUMENTED_ONLY", "source: studioctl JSON"),
            html_arrow(),
            html_status_node("Evidence", evidence_status, "observations, pas preuve"),
            html_arrow(),
            html_status_node("HumanGate", "DOCUMENTED_ONLY", "decision humaine requise"),
        ],
        [
            html_status_node("Scripts", "PASSIVE", "surface outillage"),
            html_arrow(),
            html_status_node("UxPilote", uxpilote_status, "prototype candidate-only"),
            html_arrow(),
            html_status_node("HumanGate", "DOCUMENTED_ONLY", "register / freeze / discard"),
        ],
        [
            html_status_node("Rocky / Search", "PASSIVE", "Search reste autorite finale"),
            html_arrow(),
            html_status_node("Evidence", evidence_status, "traces et rapports observation"),
        ],
        [
            html_status_node("LLM / LoRA", "BLOCKED", "pas d'entrainement, pas de promotion"),
            html_arrow(),
            html_status_node("BLOCKED", "BLOCKED", "autorite runtime interdite"),
        ],
        [
            html_status_node("Blocked Runners", blocked_status, "runners desactives"),
            html_arrow(),
            html_status_node("BLOCKED", "BLOCKED", "aucune execution"),
        ],
    ]
    row_html = []
    for row in rows:
        row_html.append("<div class=\"map-row\">" + "".join(row) + "</div>")
    return "\n".join(row_html)


def html_allowed_decisions() -> str:
    return "<div class=\"decision-options\">" + "".join(
        f"<span>{html_escape(item)}</span>" for item in PILOT_ALLOWED_DECISIONS
    ) + "</div>"


def html_pilot_decision_cards(summary: dict[str, Any], limit: int = 3) -> str:
    questions = pilot_questions(summary)
    if not questions:
        return (
            "<article class=\"priority-card\">"
            "<strong>1</strong><div><h3>Aucune question fournie par studioctl</h3>"
            "<p>Evidence/status: INCONNU</p>"
            f"{html_allowed_decisions()}</div></article>"
        )
    cards = []
    for idx, question in enumerate(questions[:limit], start=1):
        cards.append(
            "<article class=\"priority-card\">"
            f"<strong>{idx}</strong>"
            "<div>"
            f"<h3>{html_escape(decision_title_fr(question, idx))}</h3>"
            f"<p>Evidence/status: {html_escape(decision_evidence(summary, question))}</p>"
            f"{html_allowed_decisions()}"
            "</div>"
            "</article>"
        )
    remaining = len(questions) - limit
    if remaining > 0:
        cards.append(f"<article class=\"priority-card more-card\"><strong>+{remaining}</strong><div><h3>autres decisions</h3><p>Voir les details HumanGate plus bas.</p></div></article>")
    return "\n".join(cards)


def html_critical_blockers(summary: dict[str, Any]) -> str:
    return "\n".join(
        "<article class=\"blocker-card\">"
        f"<h3>{html_escape(action)}</h3>"
        f"{html_badge(critical_blocked_status(summary, action))}"
        "</article>"
        for action in CRITICAL_BLOCKED_ACTIONS
    )


def html_situation_cards(summary: dict[str, Any]) -> str:
    drift_count = len(list_or_empty(summary.get("path_drift_entries")))
    questions_count = len(pilot_questions(summary))
    artifacts_status = dict_or_empty(summary.get("status_by_surface")).get("artifacts_runtime_outputs", INCONNU)
    cards = [
        html_metric_card("Etat repo", f"{missing(summary.get('branch'))} @ {short_head(summary)}", "branche / HEAD", "PASSIVE"),
        html_metric_card("Worktree", missing(summary.get("worktree_status")), f"{missing(summary.get('pre_existing_changes_count'))} changements", "UNKNOWN"),
        html_metric_card("Claims", missing(summary.get("claim_posture")), "NO_CLAIM_ALLOWED", "BLOCKED"),
        html_metric_card("Artefacts", artifacts_status, "surface artifacts_runtime_outputs", str(artifacts_status)),
        html_metric_card("Routage", drift_count, "derive(s) observee(s)", "UNKNOWN"),
        html_metric_card("HumanGate", questions_count, "decision(s) en attente", "DOCUMENTED_ONLY"),
    ]
    return "\n".join(cards)


def pilot_console_decision_rows(summary: dict[str, Any], limit: int = 3) -> list[str]:
    questions = pilot_questions(summary)
    if not questions:
        return ["1. Aucune question fournie par studioctl | Evidence/status: INCONNU"]
    rows = []
    for idx, question in enumerate(questions[:limit], start=1):
        rows.append(f"{idx}. {decision_title_fr(question, idx)}")
        rows.append(f"   Evidence/status: {decision_evidence(summary, question)}")
        rows.append("   Decisions permises: " + ", ".join(PILOT_ALLOWED_DECISIONS))
    remaining = len(questions) - limit
    if remaining > 0:
        rows.append(f"+{remaining} autres decisions en details")
    return rows


def pilot_console_map_rows(summary: dict[str, Any]) -> list[str]:
    evidence_status = missing(dict_or_empty(summary.get("status_by_surface")).get("artifacts_runtime_outputs", "PASSIVE"))
    return [
        f"Studio Control [DOCUMENTED_ONLY] -> Evidence [{evidence_status}] -> HumanGate [DOCUMENTED_ONLY]",
        f"Scripts [PASSIVE] -> UxPilote [{missing(summary.get('scripts_uxpilote_status'))}] -> HumanGate [DOCUMENTED_ONLY]",
        f"Rocky / Search [PASSIVE] -> Evidence [{evidence_status}]",
        "LLM / LoRA [BLOCKED] -> BLOCKED [BLOCKED]",
        f"Blocked Runners [{critical_blocked_status(summary, 'benchmark')}] -> BLOCKED [BLOCKED]",
    ]


def pilot_evidence_rows(summary: dict[str, Any]) -> list[str]:
    source_state = dict_or_empty(summary.get("source_state_summary"))
    route_state = dict_or_empty(summary.get("route_state_summary"))
    runtime_gate = dict_or_empty(summary.get("runtime_claim_gate"))
    rows = [
        f"claim_posture: {missing(summary.get('claim_posture'))}",
        f"no_global_ready_verdict: {render_value(summary.get('no_global_ready_verdict', INCONNU))}",
        f"source_state total_sources: {missing(source_state.get('total_sources'))}",
        f"route_state destination_allowed: {bool_text(route_state.get('destination_allowed'))}",
        f"runtime_claim_gate actual_runtime: {missing(runtime_gate.get('actual_runtime'))}",
        f"runtime_claim_gate exact_runtime_claim_allowed: {bool_text(runtime_gate.get('exact_runtime_claim_allowed'))}",
    ]
    rows.extend(surface_status_rows(summary)[:6])
    return rows


def render_cockpit_view(summary: dict[str, Any], width: int) -> str:
    width = clamp_width(width)
    situation = [
        f"Repo: {missing(summary.get('branch'))} @ {short_head(summary)}",
        f"Worktree: {missing(summary.get('worktree_status'))} | changements pre-existants: {missing(summary.get('pre_existing_changes_count'))}",
        f"Claims: {missing(summary.get('claim_posture'))} | candidate-only | read_only: true | no_global_ready_verdict: true",
    ]
    blocked_rows = [f"{action}: {critical_blocked_status(summary, action)}" for action in CRITICAL_BLOCKED_ACTIONS]
    rows = [
        border("UXPILOTE - PILOT VIEW", situation, width),
        border("Carte systeme", pilot_console_map_rows(summary), width),
        border("A faire maintenant", pilot_console_decision_rows(summary), width),
        border("Blocages critiques", blocked_rows, width),
        border("Surfaces", surface_status_rows(summary), width),
        border("Routage scripts", path_drift_rows(summary)[:10], width),
        border("Evidence / Claims", pilot_evidence_rows(summary)[:12], width),
        "",
    ]
    return "\n".join(rows)


def render_html_dashboard(summary: dict[str, Any]) -> str:
    return f"""<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>UXPILOTE - PILOT VIEW</title>
  <style>
    :root {{
      color-scheme: light;
      --ink: #20242a;
      --muted: #5e6875;
      --line: #d5dbe3;
      --panel: #ffffff;
      --bg: #eef1f4;
      --soft: #f8fafc;
      --green: #23754d;
      --blue: #2d648f;
      --amber: #a66b00;
      --orange: #bd5800;
      --red: #aa3030;
      --gray: #6f7782;
      --black: #27313d;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      line-height: 1.35;
      letter-spacing: 0;
    }}
    header, main, footer {{ width: min(1320px, calc(100% - 28px)); margin: 0 auto; }}
    header {{
      margin-top: 14px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-top: 8px solid var(--black);
      border-radius: 8px;
      padding: 16px;
    }}
    h1 {{ margin: 0 0 12px; font-size: clamp(30px, 4vw, 54px); line-height: 1; letter-spacing: 0; }}
    h2 {{ margin: 0; font-size: 23px; letter-spacing: 0; }}
    h3 {{ margin: 0; font-size: 16px; letter-spacing: 0; }}
    p {{ margin: 0; }}
    main {{ display: grid; gap: 16px; padding: 16px 0 24px; }}
    .header-strip, footer {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(155px, 1fr));
      gap: 8px;
    }}
    .header-strip div, footer div {{
      background: var(--soft);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px 10px;
      min-width: 0;
    }}
    .header-strip span, footer span, .compare-grid span {{
      display: block;
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
    }}
    .header-strip strong, footer strong, .compare-grid strong {{ display: block; overflow-wrap: anywhere; }}
    .pilot-grid {{ display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(320px, .9fr); gap: 16px; align-items: stretch; }}
    .panel, .pilot-panel, .metric-card, .map-node, .priority-card, .surface-card, .script-card, .drift-card, .evidence-card, .source-card, .blocker-card {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(0,0,0,.04);
    }}
    .panel, .pilot-panel {{ padding: 14px; }}
    .pilot-panel {{ min-height: 100%; }}
    .section-head {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--line);
    }}
    details.panel summary {{
      cursor: pointer;
      list-style-position: inside;
      font-size: 20px;
      font-weight: 800;
      margin-bottom: 12px;
    }}
    .map-stack {{ display: grid; gap: 10px; }}
    .map-row {{ display: grid; grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr) 28px minmax(0, 1fr); gap: 8px; align-items: center; }}
    .map-row:nth-child(3), .map-row:nth-child(4), .map-row:nth-child(5) {{ grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr); }}
    .map-node {{ padding: 12px; min-height: 86px; border-left: 5px solid var(--gray); }}
    .map-node p {{ color: var(--muted); margin-top: 6px; }}
    .map-arrow {{ text-align: center; font-size: 22px; font-weight: 900; color: var(--muted); }}
    .priority-stack {{ display: grid; gap: 10px; }}
    .priority-card {{
      display: grid;
      grid-template-columns: 52px 1fr;
      gap: 12px;
      padding: 12px;
      border-left: 7px solid var(--orange);
      align-items: start;
    }}
    .priority-card > strong {{
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: var(--orange);
      color: #fff;
      font-size: 22px;
    }}
    .priority-card p {{ margin: 7px 0; color: var(--muted); font-weight: 700; }}
    .decision-options {{ display: flex; flex-wrap: wrap; gap: 6px; }}
    .decision-options span {{
      border: 1px solid #f0c37a;
      background: #fff8eb;
      border-radius: 999px;
      padding: 5px 8px;
      font-size: 12px;
      font-weight: 800;
    }}
    .more-card {{ background: #f8fafc; color: var(--muted); }}
    .blockers-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px; }}
    .blocker-card {{ padding: 12px; border-left: 7px solid var(--red); background: #fff6f6; }}
    .blocker-card h3 {{ margin-bottom: 8px; overflow-wrap: anywhere; }}
    .hero-grid, .surface-grid, .script-grid, .drift-grid, .evidence-grid, .source-grid {{
      display: grid;
      gap: 12px;
    }}
    .hero-grid {{ grid-template-columns: repeat(auto-fit, minmax(205px, 1fr)); }}
    .surface-grid {{ grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }}
    .script-grid {{ grid-template-columns: repeat(auto-fit, minmax(245px, 1fr)); }}
    .drift-grid {{ grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }}
    .evidence-grid {{ grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }}
    .metric-card {{ padding: 15px; min-height: 118px; border-top: 5px solid var(--gray); }}
    .metric-card p {{ color: var(--muted); font-weight: 800; }}
    .metric-card strong {{ display: block; font-size: 26px; line-height: 1.08; margin: 10px 0 8px; overflow-wrap: anywhere; }}
    .metric-card span {{ font-weight: 800; }}
    .tone-blocked {{ border-top-color: var(--red); }}
    .tone-unknown {{ border-top-color: var(--amber); }}
    .tone-documented_only, .tone-documented-only {{ border-top-color: var(--blue); }}
    .tone-passive {{ border-top-color: var(--gray); }}
    .tone-implemented, .tone-tested {{ border-top-color: var(--green); }}
    .surface-card, .script-card, .drift-card, .evidence-card, .source-card {{ padding: 12px; }}
    .card-top {{ display: flex; justify-content: space-between; align-items: start; gap: 10px; margin-bottom: 10px; }}
    .mono {{ color: var(--muted); font-family: Consolas, 'Courier New', monospace; margin-bottom: 8px; overflow-wrap: anywhere; }}
    .status {{
      display: inline-block;
      border-radius: 999px;
      padding: 5px 10px;
      color: #fff;
      background: var(--gray);
      font-size: 12px;
      font-weight: 900;
      white-space: nowrap;
    }}
    .implemented {{ background: var(--green); }}
    .tested {{ background: var(--green); }}
    .documented-only {{ background: var(--blue); }}
    .passive {{ background: var(--gray); }}
    .blocked, .blocked-passive {{ background: var(--red); }}
    .unknown {{ background: var(--amber); }}
    .not-found {{ background: #111; }}
    .no-claim-allowed {{ background: var(--red); }}
    .script-card {{ border-top: 5px solid var(--gray); }}
    .family-studioctl {{ border-top-color: var(--green); }}
    .family-validators {{ border-top-color: var(--blue); }}
    .family-control-plane, .family-operator, .family-uxpilote, .family-legacy-root-compatibility {{ border-top-color: var(--amber); }}
    .family-blocked-runners {{ border-top-color: var(--red); }}
    dl {{ display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; margin: 0 0 10px; }}
    dt {{ color: var(--muted); }}
    dd {{ margin: 0; font-weight: 800; }}
    .compare-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }}
    .compare-grid div {{ background: var(--soft); border: 1px solid var(--line); border-radius: 6px; padding: 8px; }}
    .blocked-pills {{ display: flex; flex-wrap: wrap; gap: 8px; }}
    .blocked-pill {{ display: inline-flex; align-items: center; gap: 8px; border: 1px solid #efb4b4; background: #fff5f5; border-radius: 999px; padding: 7px 9px; font-weight: 800; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ border-bottom: 1px solid var(--line); padding: 8px; text-align: left; vertical-align: top; }}
    footer {{ padding-bottom: 26px; }}
    .warning-card {{ border-color: #e49b9b; background: #fff8f8; }}
    @media (max-width: 900px) {{
      .pilot-grid, .map-row, .map-row:nth-child(3), .map-row:nth-child(4), .map-row:nth-child(5), .priority-card, .compare-grid {{ grid-template-columns: 1fr; }}
      .map-arrow {{ transform: rotate(90deg); }}
    }}
    @media (max-width: 760px) {{
      header, main, footer {{ width: min(100% - 18px, 1320px); }}
      .section-head {{ display: block; }}
    }}
  </style>
</head>
<body>
  <header>
    <h1>UXPILOTE - PILOT VIEW</h1>
    <div class="header-strip">
      {html_kv("branch", summary.get("branch", INCONNU))}
      {html_kv("HEAD", short_head(summary))}
      {html_kv("worktree status", summary.get("worktree_status", INCONNU))}
      {html_kv("claim posture", summary.get("claim_posture", INCONNU))}
      {html_kv("candidate-only", True)}
      {html_kv("read_only: true", "")}
      {html_kv("no_global_ready_verdict: true", "")}
    </div>
  </header>
  <main>
    {render_html_failure_card(summary)}
    <section class="pilot-grid" aria-label="Pilot View">
      <section class="pilot-panel">
        <div class="section-head"><h2>Carte systeme</h2>{html_badge("PASSIVE")}</div>
        <div class="map-stack">{html_system_map(summary)}</div>
      </section>
      <section class="pilot-panel">
        <div class="section-head"><h2>A faire maintenant</h2>{html_badge("UNKNOWN", "decision requise")}</div>
        <div class="priority-stack">{html_pilot_decision_cards(summary)}</div>
      </section>
    </section>
    <section class="panel warning-card">
      <div class="section-head"><h2>Commandes bloquees / Blocages critiques</h2>{html_badge("BLOCKED")}</div>
      <div class="blockers-grid">{html_critical_blockers(summary)}</div>
    </section>
    <section class="hero-grid">{html_situation_cards(summary)}</section>
    <details class="panel" open>
      <summary>Surfaces</summary>
      <div class="surface-grid">{html_surface_cards(summary)}</div>
    </details>
    <details class="panel">
      <summary>Scripts Control</summary>
      <div class="script-grid">{html_script_cards(summary)}</div>
    </details>
    <details class="panel">
      <summary>Derive de chemins / routage</summary>
      <div class="drift-grid">{html_path_drift_cards(summary)}</div>
    </details>
    <details class="panel">
      <summary>Commandes bloquees</summary>
      <div class="blocked-pills">{html_blocked_command_cards(summary)}</div>
    </details>
    <details class="panel">
      <summary>Evidence / Claims</summary>
      <div class="evidence-grid">{html_evidence_cards(summary)}</div>
    </details>
    <section class="panel">
      <div class="section-head"><h2>LLM / LoRA</h2>{html_badge("BLOCKED")}</div>
      {html_status_table(["surface", "status"], [["Entrainement", "BLOCKED"], ["Dataset generation/reset", "BLOCKED"], ["Checkpoints/model promotion", "BLOCKED"], ["Support LLM", "PASSIVE"]], 1)}
    </section>
  </main>
  <footer>
    {html_kv("runtime_authority: NONE", "")}
    {html_kv("writes_files: false", "except explicit --export-html target")}
    {html_kv("claim_verdict", CLAIM_POSTURE)}
    {html_kv("no_global_ready_verdict: true", "")}
    <div><span>boundary</span><strong>candidate-only | NO_CLAIM_ALLOWED | read_only: true | writes_files: false | runtime_authority: NONE</strong></div>
  </footer>
</body>
</html>
"""


SYSTEM_FAMILY_LABELS_FR = {
    "active_runtime_code": "Code runtime",
    "tests": "Tests",
    "artifacts_runtime_outputs": "Outputs / rapports",
    "canonical_docs": "Docs de reference",
    "roadmap_docs_only": "Plans / roadmap",
    "inference": "IA / inference",
}

SYSTEM_FAMILY_HINTS_FR = {
    "active_runtime_code": "Ce qui peut changer le comportement runtime. Ici: lecture passive seulement.",
    "tests": "Validation ciblee ou fichiers de test. Aucune execution supplementaire ici.",
    "artifacts_runtime_outputs": "Rapports, exports et sorties locales. Non canoniques par defaut.",
    "canonical_docs": "Docs de reference et contrats. Ne prouvent pas une activation.",
    "roadmap_docs_only": "Plans et files de decision. HumanGate reste requis.",
    "inference": "IA, LLM, LoRA et aide analytique. Pas d'autorite finale.",
}

BLOCKED_EXPLANATIONS_FR = {
    "benchmark": (
        "Risque de faux signal de performance.",
        "Un score local peut etre pris pour une preuve de force.",
        "HumanGate + charte benchmark bornee.",
    ),
    "gameplay_execution": (
        "Execution runtime hors scope.",
        "Peut produire des traces ou comportements non autorises.",
        "HumanGate + tache gameplay explicite.",
    ),
    "training": (
        "Entrainement interdit sans charte.",
        "Peut modifier modeles, couts, donnees ou claims.",
        "HumanGate + charte entrainement.",
    ),
    "dataset_generation_reset": (
        "Risque donnees/provenance.",
        "Peut casser la tracabilite ActionId/LegalAction/ActionMask.",
        "HumanGate + contrat dataset.",
    ),
    "model_checkpoint_creation_promotion": (
        "Promotion modele interdite.",
        "Peut etre lue comme preuve de qualite ou activation.",
        "HumanGate + preuve et route modele.",
    ),
    "latest_json_creation": (
        "Manifeste interdit sans tache.",
        "Peut designer un artefact comme dernier et faire autorite.",
        "HumanGate + route de manifeste.",
    ),
    "lab_runs_creation": (
        "Output runtime interdit sans tache.",
        "Peut creer des sorties non canoniques difficiles a separer.",
        "HumanGate + route lab bornee.",
    ),
    "commit_push_branch_PR": (
        "Git action HumanGate only.",
        "Peut promouvoir un prototype ou des claims par erreur.",
        "HumanGate explicite.",
    ),
    "unknown_script_execution": (
        "Script non qualifie.",
        "Peut muter, executer ou lire hors cadre.",
        "HumanGate + qualification du script.",
    ),
    "PR_GitHub_automation": (
        "Automatisation GitHub bloquee.",
        "Peut ouvrir ou modifier une PR sans decision humaine.",
        "HumanGate explicite.",
    ),
    "auto_merge": (
        "Auto-merge bloque.",
        "Peut transformer un etat local en promotion repo.",
        "HumanGate explicite.",
    ),
}

CONTROL_TOOL_CARDS = (
    {
        "title": "Status Studio",
        "purpose": "Voir racine, branche, HEAD, worktree et posture de claim.",
        "command": "python scripts\\studioV2\\studioctl.py status --json",
        "risk": "bas",
        "status": "PASSIVE",
        "humangate": "non",
    },
    {
        "title": "Evidence Board",
        "purpose": "Separer sources, routage, observations et claims bloques.",
        "command": "python scripts\\studioV2\\studioctl.py evidence board --json",
        "risk": "bas",
        "status": "PASSIVE",
        "humangate": "non",
    },
    {
        "title": "Surface Map",
        "purpose": "Voir les familles du systeme, chemins, policies lecture/ecriture.",
        "command": "python scripts\\studioV2\\studioctl.py surface map --json",
        "risk": "bas",
        "status": "PASSIVE",
        "humangate": "non",
    },
    {
        "title": "Scripts Control",
        "purpose": "Inspecter familles scripts, chemins candidats et runners bloques.",
        "command": "python scripts\\studioV2\\studioctl.py uxpilote scripts-control --json",
        "risk": "moyen",
        "status": "PASSIVE",
        "humangate": "non pour lire; oui pour agir",
    },
    {
        "title": "Matrice de fusion",
        "purpose": "Assembler Cartographer, Hygiene, Truth, RedTeam avant HumanGate.",
        "command": "prompt type: fusion audit",
        "risk": "moyen",
        "status": "DOCUMENTED_ONLY",
        "humangate": "oui",
    },
    {
        "title": "Audit docs / roadmaps",
        "purpose": "Chercher drift, sources non chargees et docs qui ressemblent a la verite.",
        "command": "prompt type: docs/roadmap audit",
        "risk": "moyen",
        "status": "DOCUMENTED_ONLY",
        "humangate": "oui pour modifier",
    },
    {
        "title": "Audit LoRA",
        "purpose": "Qualifier uniquement la posture future IA/LoRA sans entrainer.",
        "command": "prompt type: LLM / LoRA charter audit",
        "risk": "haut",
        "status": "BLOCKED",
        "humangate": "oui",
    },
    {
        "title": "Stabilisation SEARCH-003",
        "purpose": "Preparer une tache bornee autour de l'autorite Search.",
        "command": "prompt type: SEARCH-003 bounded patch",
        "risk": "haut",
        "status": "DOCUMENTED_ONLY",
        "humangate": "oui",
    },
)


AUDIT_CHAIN_GROUP_LABELS_FR = {
    "truth": "Verite",
    "routing": "Routage",
    "fusion": "Fusion",
    "humangate": "HumanGate",
    "tools": "Outils",
    "inference": "Inference",
    "runtime_guard": "Garde runtime",
}

AUDIT_CHAIN_TILE_COPY_FR = {
    "system_truth_chain": {
        "title": "Verite systeme",
        "sert_a": "Comprendre la verite",
        "utility": "Comprendre la verite",
        "risk": "Risque claim",
        "tone": "verite",
    },
    "scripts_route_chain": {
        "title": "Routage scripts",
        "sert_a": "Corriger les chemins",
        "utility": "Corriger les chemins",
        "risk": "Risque routage",
        "tone": "routage",
    },
    "fusion_matrix_chain": {
        "title": "Matrice de fusion",
        "sert_a": "Voir les contradictions",
        "utility": "Voir les contradictions",
        "risk": "Risque decision",
        "tone": "fusion",
    },
    "humangate_queue_chain": {
        "title": "Decisions HumanGate",
        "sert_a": "Decider sans agir",
        "utility": "Decider sans agir",
        "risk": "Risque action",
        "tone": "humangate",
    },
    "tool_catalog_chain": {
        "title": "Catalogue outils",
        "sert_a": "Choisir un outil",
        "utility": "Choisir un outil",
        "risk": "Risque execution",
        "tone": "outils",
    },
    "llm_lora_guard_chain": {
        "title": "Garde LLM / LoRA",
        "sert_a": "Bloquer entrainement",
        "utility": "Bloquer entrainement",
        "risk": "Risque inference",
        "tone": "inference",
    },
    "runtime_guard_chain": {
        "title": "Garde runtime",
        "sert_a": "Bloquer activation",
        "utility": "Bloquer activation",
        "risk": "Risque runtime",
        "tone": "runtime",
    },
}


AUDIT_SELECTOR_GUIDE_FR = (
    (
        "Je ne sais pas ce qui est vrai",
        "system_truth_chain",
        "Separe reel, documente, deduit, inconnu et bloque.",
    ),
    (
        "Je ne comprends pas les chemins ou scripts",
        "scripts_route_chain",
        "Explique scripts/, scripts/studioV2/, control_plane, operator, uxpilote.",
    ),
    (
        "Les audits ou rapports se contredisent",
        "fusion_matrix_chain",
        "Fusionne les signaux et fait remonter les contradictions.",
    ),
    (
        "Je dois decider quoi faire ensuite",
        "humangate_queue_chain",
        "Transforme les risques en decisions humaines.",
    ),
    (
        "Je cherche quel outil lancer",
        "tool_catalog_chain",
        "Liste les outils de controle et leur usage.",
    ),
    (
        "Ca touche LLM, LoRA ou entrainement",
        "llm_lora_guard_chain",
        "Garde training, datasets, checkpoints et promotion bloques.",
    ),
    (
        "Ca risque d'activer le runtime",
        "runtime_guard_chain",
        "Bloque benchmark, gameplay, latest.json, lab/runs, model promotion.",
    ),
)


def decision_copy_fr(summary: dict[str, Any], question: Any, idx: int) -> dict[str, str]:
    title = decision_title_fr(question, idx)
    key = normalized_key(question)
    situation = decision_evidence(summary, question)
    if "scripts_uxpilote" in key or "scripts/uxpilote" in key:
        why = "Evite qu'un prototype local soit confondu avec une source officielle."
        possible = "garder UNKNOWN, enregistrer candidat, geler, ecarter, demander revision"
    elif "control_plane" in key:
        why = "Evite de choisir silencieusement entre chemin racine et chemin scripts/studioV2."
        possible = "garder UNKNOWN, enregistrer candidat, geler, demander revision"
    elif "operator" in key:
        why = "Evite de creer un shim ou de re-router CI/docs sans decision humaine."
        possible = "garder UNKNOWN, enregistrer candidat, demander revision"
    elif "ci" in key or "codeowners" in key:
        title = "Decider alignement CI / CODEOWNERS"
        situation = "CI / CODEOWNERS: mutation BLOCKED; references anciennes possibles."
        why = "Les workflows et ownership changent l'automatisation du repo."
        possible = "bloquer, demander revision, approuver une tache bornee"
    elif "blocked_runner" in key or "blocked runner" in key or "hidden_versus_visible" in key:
        title = "Decider quelles commandes bloquees restent visibles"
        situation = "Commandes bloquees: BLOCKED; affichage autorise comme reference seulement."
        why = "Evite qu'un bouton ou une carte soit compris comme une commande executable."
        possible = "garder visible bloque, masquer, demander revision"
    elif "prototype" in key or "candidate_only" in key or "candidate-only" in key:
        title = "Decider si le prototype reste candidate-only"
        situation = "Prototype: UNKNOWN / candidate-only; aucune autorite runtime."
        why = "Evite qu'un apercu HTML soit lu comme preuve d'activation."
        possible = "garder candidate-only, geler, ecarter, demander revision"
    else:
        why = "La decision garde le routage, les claims et les actions bloquees explicites."
        possible = ", ".join(PILOT_ALLOWED_DECISIONS)
    return {"title": title, "situation": situation, "possible": possible, "why": why}


def merged_pilot_questions(summary: dict[str, Any], limit: int = 5) -> list[Any]:
    merged: list[Any] = []
    seen: set[str] = set()
    for idx, question in enumerate(pilot_questions(summary), start=1):
        key = normalized_key(question)
        title_key = normalized_key(decision_copy_fr(summary, question, idx)["title"])
        if key and key not in seen and title_key not in seen:
            merged.append(question)
            seen.add(key)
            seen.add(title_key)
    for item in list_or_empty(summary.get("decision_queue")):
        if not isinstance(item, dict):
            continue
        question = item.get("next_humangate_question")
        key = normalized_key(question)
        title_key = normalized_key(decision_copy_fr(summary, question, len(merged) + 1)["title"])
        if question and key not in seen and title_key not in seen:
            merged.append(question)
            seen.add(key)
            seen.add(title_key)
    return merged[:limit]


def html_flow_node(label: str, status: str, detail: str) -> str:
    return (
        "<article class=\"flow-node\">"
        f"<div class=\"card-top\"><h3>{html_escape(label)}</h3>{html_badge(status)}</div>"
        f"<p>{html_escape(detail)}</p>"
        "</article>"
    )


def html_flow_row(nodes: list[tuple[str, str, str]]) -> str:
    parts: list[str] = []
    for idx, node in enumerate(nodes):
        if idx:
            parts.append(html_arrow())
        parts.append(html_flow_node(*node))
    return "<div class=\"flow-row\">" + "".join(parts) + "</div>"


def html_system_maps_v4(summary: dict[str, Any]) -> str:
    evidence_status = missing(dict_or_empty(summary.get("status_by_surface")).get("artifacts_runtime_outputs", "PASSIVE"))
    ux_status = missing(summary.get("scripts_uxpilote_status"))
    commandement = "\n".join(
        [
            html_flow_row([
                ("Studio Control", "DOCUMENTED_ONLY", "statut repo et routage"),
                ("Evidence", evidence_status, "observations qualifiees"),
                ("HumanGate", "DOCUMENTED_ONLY", "decide avant mutation"),
            ]),
            html_flow_row([
                ("Scripts", "PASSIVE", "outillage inspecte"),
                ("UxPilote", ux_status, "visualise / prepare"),
                ("HumanGate", "DOCUMENTED_ONLY", "register / freeze / discard"),
            ]),
            html_flow_row([
                ("Rocky / Search", "PASSIVE", "Search garde l'autorite gameplay"),
                ("Evidence", evidence_status, "rapports et traces observes"),
            ]),
            html_flow_row([
                ("LLM / LoRA", "BLOCKED", "pas d'entrainement"),
                ("BLOCKED", "BLOCKED", "pas d'autorite runtime"),
            ]),
            html_flow_row([
                ("Blocked Runners", "BLOCKED", "commandes desactivees"),
                ("BLOCKED", "BLOCKED", "execution interdite"),
            ]),
        ]
    )
    flux = "\n".join(
        [
            html_flow_row([
                ("Neural", "PASSIVE", "propose"),
                ("Search", "DOCUMENTED_ONLY", "decide gameplay"),
                ("Evidence", evidence_status, "qualifie"),
            ]),
            html_flow_row([
                ("HumanGate", "DOCUMENTED_ONLY", "autorise"),
                ("Codex", "PASSIVE", "execute borne"),
                ("UxPilote", ux_status, "visualise / prepare"),
            ]),
        ]
    )
    preuves = (
        "<div class=\"proof-grid\">"
        "<article><h3>Prouve</h3><p>Les commandes studioctl autorisees retournent des donnees locales lisibles.</p></article>"
        "<article><h3>Observe</h3><p>Worktree, surfaces, chemins, sources et runners bloques sont affiches comme observations.</p></article>"
        "<article><h3>Non prouve / claim bloque</h3><p>Activation, force, performance, promotion modele et readiness restent NO_CLAIM_ALLOWED.</p></article>"
        "</div>"
        "<p class=\"explain\">Un rapport ou un log est une observation, pas une preuve d'activation.</p>"
    )
    routage = (
        "<p class=\"explain\">Certains documents ou CI pointent vers d'anciens chemins. Cette vue compare l'ancien chemin, le chemin candidat, et la decision HumanGate requise.</p>"
        f"<div class=\"drift-grid compact\">{html_path_drift_cards(summary, limit=4)}</div>"
    )
    outils = (
        "<p class=\"explain\">Ces tuiles sont des outils de pilotage. Elles n'executent rien. Elles indiquent quel audit ou quelle decision preparer.</p>"
        f"{html_control_tool_cards(summary)}"
    )
    panels = [
        ("Vue Commandement", "DOCUMENTED_ONLY", commandement),
        ("Vue Flux / Autorite", "PASSIVE", flux),
        ("Vue Preuves", "PASSIVE", preuves),
        ("Vue Routage", "UNKNOWN", routage),
        ("Vue Outils", "DOCUMENTED_ONLY", outils),
    ]
    return "\n".join(
        "<section class=\"map-tab\">"
        f"<div class=\"tab-title\"><h3>{html_escape(title)}</h3>{html_badge(status)}</div>"
        f"{content}"
        "</section>"
        for title, status, content in panels
    )


def html_system_family_cards(summary: dict[str, Any]) -> str:
    statuses = dict_or_empty(summary.get("status_by_surface"))
    cards = []
    for surface in CANONICAL_SURFACES:
        status = statuses.get(surface, INCONNU)
        cards.append(
            "<article class=\"surface-card\">"
            f"<div class=\"card-top\"><h3>{html_escape(SYSTEM_FAMILY_LABELS_FR[surface])}</h3>{html_badge(status)}</div>"
            f"<p>{html_escape(SYSTEM_FAMILY_HINTS_FR[surface])}</p>"
            f"<p class=\"mono\">{html_escape(surface)}</p>"
            "</article>"
        )
    return "\n".join(cards)


def html_decision_cards_v4(summary: dict[str, Any]) -> str:
    cards = []
    for idx, question in enumerate(merged_pilot_questions(summary), start=1):
        copy = decision_copy_fr(summary, question, idx)
        cards.append(
            "<article class=\"decision-v4-card\">"
            f"<strong>{idx}</strong>"
            "<div>"
            f"<h3>{html_escape(copy['title'])}</h3>"
            f"<p><span>Situation actuelle</span>{html_escape(copy['situation'])}</p>"
            f"<p><span>Decision possible</span>{html_escape(copy['possible'])}</p>"
            f"<p><span>Pourquoi c'est important</span>{html_escape(copy['why'])}</p>"
            "</div>"
            "</article>"
        )
    if not cards:
        return "<article class=\"decision-v4-card\"><strong>1</strong><div><h3>Aucune question fournie par studioctl</h3><p><span>Situation actuelle</span>INCONNU</p></div></article>"
    return "\n".join(cards)


def html_blocked_action_detail_cards(summary: dict[str, Any]) -> str:
    runners = dict_or_empty(summary.get("blocked_runners"))
    keys = list(dict.fromkeys([*CRITICAL_BLOCKED_ACTIONS, *sorted(str(key) for key in runners.keys())]))
    cards = []
    for key in keys:
        status = critical_blocked_status(summary, key)
        why, risk, auth = BLOCKED_EXPLANATIONS_FR.get(
            key,
            ("Commande bloquee par posture read-only.", "Risque d'action hors cadre.", "HumanGate explicite."),
        )
        cards.append(
            "<article class=\"blocked-detail-card\">"
            f"<div class=\"card-top\"><h3>{html_escape(key)}</h3>{html_badge(status)}</div>"
            f"<p><span>Pourquoi c'est bloque</span>{html_escape(why)}</p>"
            f"<p><span>Risque si lance sans cadre</span>{html_escape(risk)}</p>"
            f"<p><span>Autorisation requise</span>{html_escape(auth)}</p>"
            "</article>"
        )
    return "\n".join(cards)


def html_evidence_claims_v4(summary: dict[str, Any]) -> str:
    sources = list_or_empty(summary.get("evidence_sources"))
    route_state = dict_or_empty(summary.get("route_state_summary"))
    source_state = dict_or_empty(summary.get("source_state_summary"))
    proved = [
        f"{len(sources)} source(s) d'evidence listee(s)",
        f"source_state total_sources: {missing(source_state.get('total_sources'))}",
        f"destination_allowed: {bool_text(route_state.get('destination_allowed'))}",
    ]
    observed = [
        f"worktree_status: {missing(summary.get('worktree_status'))}",
        f"scripts/uxpilote: {missing(summary.get('scripts_uxpilote_status'))}",
        f"claim_posture: {missing(summary.get('claim_posture'))}",
    ]
    blocked = [
        "activation runtime",
        "preuve benchmark / performance",
        "promotion modele ou dataset",
        "readiness globale",
    ]
    return (
        "<p class=\"explain\">Un rapport ou un log est une observation, pas une preuve d'activation.</p>"
        "<div class=\"proof-grid\">"
        f"<article><h3>Prouve</h3>{html_list(proved)}</article>"
        f"<article><h3>Observe</h3>{html_list(observed)}</article>"
        f"<article><h3>Non prouve / claim bloque</h3>{html_list(blocked)}{html_badge(summary.get('claim_posture', INCONNU))}</article>"
        "</div>"
    )


def chain_by_id(summary: dict[str, Any]) -> dict[str, dict[str, Any]]:
    chains: dict[str, dict[str, Any]] = {}
    for chain in list_or_empty(summary.get("audit_chains")):
        if isinstance(chain, dict) and chain.get("id"):
            chains[str(chain["id"])] = chain
    return chains


def audit_chain_blocked_summary(chain: dict[str, Any], limit: int = 4) -> str:
    blocked = [str(item) for item in list_or_empty(chain.get("blocked_actions"))]
    if not blocked:
        return INCONNU
    suffix = f" +{len(blocked) - limit}" if len(blocked) > limit else ""
    return ", ".join(blocked[:limit]) + suffix


def audit_chain_tile_copy(chain: dict[str, Any]) -> dict[str, str]:
    chain_id = str(chain.get("id", ""))
    fallback = {
        "title": missing(chain.get("label")),
        "sert_a": missing(chain.get("purpose")),
        "utility": "Reference",
        "risk": "Risque",
        "tone": "default",
    }
    copy = AUDIT_CHAIN_TILE_COPY_FR.get(chain_id, fallback)
    return {key: str(value) for key, value in copy.items()}


def html_audit_chain_card(chain: dict[str, Any], group_label: str | None = None) -> str:
    safe_to_run = bool(chain.get("safe_to_run_now"))
    ux_targets = ", ".join(str(item) for item in list_or_empty(chain.get("ux_targets"))) or INCONNU
    copy = audit_chain_tile_copy(chain)
    safe_badge = "REFERENCE SEULEMENT / ne lance rien" if not safe_to_run else "lecture seule"
    group = group_label or INCONNU
    return (
        f"<article class=\"tool-tile tile-{html_escape(copy['tone'])}\">"
        "<div class=\"tile-head\">"
        f"<h3>{html_escape(copy['title'])}</h3>"
        f"{html_badge(chain.get('status', INCONNU))}"
        "</div>"
        f"<p class=\"tile-purpose\"><span>Sert a</span>{html_escape(copy['sert_a'])}</p>"
        "<div class=\"tile-badges\">"
        f"<span class=\"mini-badge risk-badge\">{html_escape(copy['risk'])}</span>"
        f"<span class=\"mini-badge utility-badge\">{html_escape(copy['utility'])}</span>"
        f"<span class=\"mini-badge reference-badge\">{html_escape(safe_badge)}</span>"
        "</div>"
        "<details class=\"tile-details\">"
        "<summary>details techniques</summary>"
        f"<p><span>original label</span>{html_escape(chain.get('label', INCONNU))}</p>"
        f"<p><span>Groupe</span>{html_escape(group)}</p>"
        f"<p><span>authority</span>{html_escape(chain.get('authority', INCONNU))}</p>"
        f"<p><span>primary_surface</span><code>{html_escape(chain.get('primary_surface', INCONNU))}</code></p>"
        f"<p><span>safe_to_run_now</span>{html_escape(bool_text(safe_to_run))}</p>"
        f"<p><span>ux_targets</span>{html_escape(ux_targets)}</p>"
        f"<p><span>humangate_question</span>{html_escape(chain.get('humangate_question', INCONNU))}</p>"
        f"<p><span>blocked_actions summary</span>{html_escape(audit_chain_blocked_summary(chain))}</p>"
        "</details>"
        "</article>"
    )


def html_audit_selector_guide(summary: dict[str, Any]) -> str:
    chains = chain_by_id(summary)
    cards: list[str] = []
    for problem, chain_id, why in AUDIT_SELECTOR_GUIDE_FR:
        chain = chains.get(chain_id, {"id": chain_id})
        copy = audit_chain_tile_copy(chain)
        status = missing(chain.get("status", "DOCUMENTED_ONLY"))
        cards.append(
            "<article class=\"selector-card\">"
            "<div class=\"selector-problem\">"
            "<span>Probleme</span>"
            f"<strong>{html_escape(problem)}</strong>"
            "</div>"
            "<div class=\"selector-target\">"
            "<span>Audit conseille</span>"
            f"<strong>{html_escape(copy['title'])}</strong>"
            f"{html_badge(status)}"
            "</div>"
            f"<p>{html_escape(why)}</p>"
            "<div class=\"selector-badges\">"
            "<span>REFERENCE SEULEMENT</span>"
            "<span>ne lance rien</span>"
            "<span>HumanGate requis si mutation</span>"
            "</div>"
            "</article>"
        )
    return (
        "<section class=\"panel audit-selector\">"
        f"<div class=\"section-head\"><h2>Quel audit utiliser ?</h2>{html_badge('DOCUMENTED_ONLY')}</div>"
        "<p class=\"explain\">Choisis selon le probleme que tu veux eclaircir. Ces cartes ne lancent rien.</p>"
        "<div class=\"selector-grid\">"
        + "".join(cards)
        + "</div>"
        "</section>"
    )


def html_control_tool_cards(summary: dict[str, Any] | None = None) -> str:
    if summary is not None:
        chains = chain_by_id(summary)
        groups = dict_or_empty(summary.get("audit_chain_groups"))
        if chains:
            cards: list[str] = []
            used: set[str] = set()
            for group_id, chain_ids in groups.items():
                for chain_id in list_or_empty(chain_ids):
                    chain = chains.get(str(chain_id))
                    if not chain:
                        continue
                    used.add(str(chain_id))
                    cards.append(html_audit_chain_card(chain, AUDIT_CHAIN_GROUP_LABELS_FR.get(str(group_id), str(group_id))))
            remaining = [chain for chain_id, chain in chains.items() if chain_id not in used]
            cards.extend(html_audit_chain_card(chain) for chain in remaining)
            return "<div class=\"tool-tile-grid\">" + "".join(cards) + "</div>"
        failure = next((row for row in summary.get("studioctl_commands", []) if row.get("view") == "audit_chains" and row.get("error")), None)
        if failure:
            return (
                "<article class=\"tool-card warning-card\">"
                "<div class=\"card-top\"><h3>Catalogue des chaines indisponible</h3>"
                f"{html_badge('UNKNOWN')}</div>"
                f"<p><span>source</span>{html_escape(failure.get('command', INCONNU))}</p>"
                f"<p><span>erreur</span>{html_escape(failure.get('error', INCONNU))}</p>"
                "</article>"
            )
    return "\n".join(
        "<article class=\"tool-card\">"
        f"<div class=\"card-top\"><h3>{html_escape(tool['title'])}</h3>{html_badge(tool['status'])}</div>"
        f"<p><span>A quoi ca sert</span>{html_escape(tool['purpose'])}</p>"
        f"<p><span>Commande / prompt type</span><code>{html_escape(tool['command'])}</code></p>"
        f"<p><span>Risk level</span>{html_escape(tool['risk'])}</p>"
        f"<p><span>HumanGate required</span>{html_escape(tool['humangate'])}</p>"
        "</article>"
        for tool in CONTROL_TOOL_CARDS
    )


def console_system_maps_v4(summary: dict[str, Any]) -> list[str]:
    evidence_status = missing(dict_or_empty(summary.get("status_by_surface")).get("artifacts_runtime_outputs", "PASSIVE"))
    return [
        "Vue Commandement:",
        f"  Studio Control [DOCUMENTED_ONLY] -> Evidence [{evidence_status}] -> HumanGate [DOCUMENTED_ONLY]",
        f"  Scripts [PASSIVE] -> UxPilote [{missing(summary.get('scripts_uxpilote_status'))}] -> HumanGate [DOCUMENTED_ONLY]",
        f"  Rocky / Search [PASSIVE] -> Evidence [{evidence_status}]",
        "  LLM / LoRA [BLOCKED] -> BLOCKED [BLOCKED]",
        "  Blocked Runners [BLOCKED] -> BLOCKED [BLOCKED]",
        "Vue Flux / Autorite:",
        "  Neural propose -> Search decide gameplay -> Evidence qualifie",
        "  HumanGate autorise -> Codex execute borne -> UxPilote visualise / prepare",
        "Vue Preuves: rapport/log = observation, pas preuve d'activation",
        "Vue Routage: ancien chemin vs chemin candidat vs decision HumanGate",
        "Vue Outils: references de controle visibles, aucune execution",
    ]


def console_decision_rows_v4(summary: dict[str, Any]) -> list[str]:
    rows: list[str] = []
    for idx, question in enumerate(merged_pilot_questions(summary, limit=5), start=1):
        copy = decision_copy_fr(summary, question, idx)
        rows.append(f"{idx}. {copy['title']}")
        rows.append(f"   Situation actuelle: {copy['situation']}")
        rows.append(f"   Decision possible: {copy['possible']}")
        rows.append(f"   Pourquoi c'est important: {copy['why']}")
    return rows or ["1. Aucune question fournie par studioctl"]


def console_system_family_rows_v4(summary: dict[str, Any]) -> list[str]:
    statuses = dict_or_empty(summary.get("status_by_surface"))
    return [
        f"{SYSTEM_FAMILY_LABELS_FR[surface]} ({surface}): {statuses.get(surface, INCONNU)}"
        for surface in CANONICAL_SURFACES
    ]


def render_cockpit_view(summary: dict[str, Any], width: int) -> str:
    width = clamp_width(width)
    situation = [
        f"Repo: {missing(summary.get('branch'))} @ {short_head(summary)}",
        f"Worktree: {missing(summary.get('worktree_status'))} | changements pre-existants: {missing(summary.get('pre_existing_changes_count'))}",
        f"Claims: {missing(summary.get('claim_posture'))} | candidate-only | read_only: true | no_global_ready_verdict: true",
    ]
    blocked_rows = [
        f"{action}: {critical_blocked_status(summary, action)} | {BLOCKED_EXPLANATIONS_FR.get(action, ('bloque', '', ''))[0]}"
        for action in CRITICAL_BLOCKED_ACTIONS
    ]
    return "\n".join(
        [
            border("Pilot View", situation, width),
            border("Cartes systemes", console_system_maps_v4(summary), width),
            border("A faire maintenant", console_decision_rows_v4(summary), width),
            border("Blocages critiques", blocked_rows, width),
            border("Familles du systeme", console_system_family_rows_v4(summary), width),
            border("Chemins casses / chemins candidats", path_drift_rows(summary)[:10], width),
            border("Preuves & affirmations", pilot_evidence_rows(summary)[:12], width),
            "",
        ]
    )


def render_html_dashboard(summary: dict[str, Any]) -> str:
    return f"""<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>UXPILOTE - PILOT VIEW</title>
  <style>
    :root {{
      color-scheme: light;
      --ink: #20242a;
      --muted: #5e6875;
      --line: #d5dbe3;
      --panel: #ffffff;
      --bg: #eef1f4;
      --soft: #f8fafc;
      --green: #23754d;
      --blue: #2d648f;
      --amber: #a66b00;
      --orange: #bd5800;
      --red: #aa3030;
      --gray: #6f7782;
      --black: #27313d;
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; background: var(--bg); color: var(--ink); font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.35; letter-spacing: 0; }}
    header, main, footer {{ width: min(1340px, calc(100% - 28px)); margin: 0 auto; }}
    header {{ margin-top: 14px; background: var(--panel); border: 1px solid var(--line); border-top: 8px solid var(--black); border-radius: 8px; padding: 16px; }}
    h1 {{ margin: 0 0 12px; font-size: clamp(30px, 4vw, 54px); line-height: 1; letter-spacing: 0; }}
    h2 {{ margin: 0; font-size: 23px; letter-spacing: 0; }}
    h3 {{ margin: 0; font-size: 16px; letter-spacing: 0; }}
    p {{ margin: 0; }}
    code {{ font-family: Consolas, 'Courier New', monospace; overflow-wrap: anywhere; }}
    main {{ display: grid; gap: 16px; padding: 16px 0 24px; }}
    .header-strip, footer {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)); gap: 8px; }}
    .header-strip div, footer div {{ background: var(--soft); border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; min-width: 0; }}
    .header-strip span, footer span, .compare-grid span, .tool-card span, .blocked-detail-card span, .decision-v4-card span {{ display: block; color: var(--muted); font-size: 11px; text-transform: uppercase; font-weight: 800; margin-bottom: 2px; }}
    .header-strip strong, footer strong, .compare-grid strong {{ display: block; overflow-wrap: anywhere; }}
    .pilot-grid {{ display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(340px, .9fr); gap: 16px; align-items: start; }}
    .panel, .pilot-panel, .metric-card, .flow-node, .decision-v4-card, .surface-card, .script-card, .drift-card, .evidence-card, .source-card, .blocker-card, .blocked-detail-card, .tool-card, .map-tab, .proof-grid article {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(0,0,0,.04);
    }}
    .panel, .pilot-panel {{ padding: 14px; }}
    .section-head, .tab-title {{ display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--line); }}
    details.panel summary {{ cursor: pointer; list-style-position: inside; font-size: 20px; font-weight: 800; margin-bottom: 12px; }}
    .tab-strip {{ display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }}
    .tab-strip span {{ border: 1px solid var(--line); background: var(--soft); border-radius: 999px; padding: 7px 10px; font-weight: 900; }}
    .map-tabs {{ display: grid; gap: 12px; }}
    .map-tab {{ padding: 12px; }}
    .flow-row {{ display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; align-items: center; margin-bottom: 8px; }}
    .flow-row:nth-child(n+3) {{ grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr); }}
    .flow-node {{ padding: 12px; min-height: 88px; border-left: 5px solid var(--gray); }}
    .flow-node p {{ color: var(--muted); margin-top: 6px; }}
    .map-arrow {{ text-align: center; font-size: 22px; font-weight: 900; color: var(--muted); }}
    .priority-stack, .decision-stack {{ display: grid; gap: 10px; }}
    .decision-v4-card {{ display: grid; grid-template-columns: 52px 1fr; gap: 12px; padding: 12px; border-left: 7px solid var(--orange); align-items: start; }}
    .decision-v4-card > strong {{ display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%; background: var(--orange); color: #fff; font-size: 22px; }}
    .decision-v4-card p, .blocked-detail-card p, .tool-card p {{ margin-top: 8px; color: var(--ink); overflow-wrap: anywhere; }}
    .blockers-grid, .blocked-detail-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(245px, 1fr)); gap: 10px; }}
    .blocked-detail-card {{ padding: 12px; border-left: 7px solid var(--red); background: #fff6f6; }}
    .hero-grid, .surface-grid, .script-grid, .drift-grid, .evidence-grid, .source-grid, .tool-grid, .proof-grid {{ display: grid; gap: 12px; }}
    .hero-grid {{ grid-template-columns: repeat(auto-fit, minmax(205px, 1fr)); }}
    .surface-grid {{ grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }}
    .script-grid {{ grid-template-columns: repeat(auto-fit, minmax(245px, 1fr)); }}
    .drift-grid {{ grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }}
    .tool-grid {{ grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }}
    .proof-grid {{ grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }}
    .compact {{ margin-top: 10px; }}
    .metric-card {{ padding: 15px; min-height: 118px; border-top: 5px solid var(--gray); }}
    .metric-card p {{ color: var(--muted); font-weight: 800; }}
    .metric-card strong {{ display: block; font-size: 26px; line-height: 1.08; margin: 10px 0 8px; overflow-wrap: anywhere; }}
    .metric-card span {{ font-weight: 800; }}
    .tone-blocked {{ border-top-color: var(--red); }}
    .tone-unknown {{ border-top-color: var(--amber); }}
    .tone-documented_only, .tone-documented-only {{ border-top-color: var(--blue); }}
    .tone-passive {{ border-top-color: var(--gray); }}
    .tone-implemented, .tone-tested {{ border-top-color: var(--green); }}
    .surface-card, .script-card, .drift-card, .evidence-card, .source-card, .tool-card, .proof-grid article {{ padding: 12px; }}
    .card-top {{ display: flex; justify-content: space-between; align-items: start; gap: 10px; margin-bottom: 10px; }}
    .mono {{ color: var(--muted); font-family: Consolas, 'Courier New', monospace; margin-top: 8px; overflow-wrap: anywhere; }}
    .explain {{ background: #fff8eb; border: 1px solid #efd29a; border-radius: 8px; padding: 10px; font-weight: 800; margin-bottom: 10px; }}
    .status {{ display: inline-block; border-radius: 999px; padding: 5px 10px; color: #fff; background: var(--gray); font-size: 12px; font-weight: 900; white-space: nowrap; }}
    .implemented {{ background: var(--green); }}
    .tested {{ background: var(--green); }}
    .documented-only {{ background: var(--blue); }}
    .passive {{ background: var(--gray); }}
    .blocked, .blocked-passive {{ background: var(--red); }}
    .unknown {{ background: var(--amber); }}
    .not-found {{ background: #111; }}
    .no-claim-allowed {{ background: var(--red); }}
    .script-card {{ border-top: 5px solid var(--gray); }}
    .family-studioctl {{ border-top-color: var(--green); }}
    .family-validators {{ border-top-color: var(--blue); }}
    .family-control-plane, .family-operator, .family-uxpilote, .family-legacy-root-compatibility {{ border-top-color: var(--amber); }}
    .family-blocked-runners {{ border-top-color: var(--red); }}
    dl {{ display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; margin: 0 0 10px; }}
    dt {{ color: var(--muted); }}
    dd {{ margin: 0; font-weight: 800; }}
    .compare-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }}
    .compare-grid div {{ background: var(--soft); border: 1px solid var(--line); border-radius: 6px; padding: 8px; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ border-bottom: 1px solid var(--line); padding: 8px; text-align: left; vertical-align: top; }}
    footer {{ padding-bottom: 26px; }}
    .warning-card {{ border-color: #e49b9b; background: #fff8f8; }}
    @media (max-width: 960px) {{
      .pilot-grid, .flow-row, .flow-row:nth-child(n+3), .decision-v4-card, .compare-grid {{ grid-template-columns: 1fr; }}
      .map-arrow {{ transform: rotate(90deg); }}
    }}
    @media (max-width: 760px) {{
      header, main, footer {{ width: min(100% - 18px, 1340px); }}
      .section-head, .tab-title {{ display: block; }}
    }}
  </style>
</head>
<body>
  <header>
    <h1>UXPILOTE - PILOT VIEW</h1>
    <div class="header-strip">
      {html_kv("branch", summary.get("branch", INCONNU))}
      {html_kv("HEAD", short_head(summary))}
      {html_kv("worktree status", summary.get("worktree_status", INCONNU))}
      {html_kv("claim posture", summary.get("claim_posture", INCONNU))}
      {html_kv("candidate-only", True)}
      {html_kv("read_only: true", "")}
      {html_kv("no_global_ready_verdict: true", "")}
    </div>
  </header>
  <main>
    {render_html_failure_card(summary)}
    <section class="pilot-grid" aria-label="Pilot View">
      <section class="pilot-panel">
        <div class="section-head"><h2>Cartes systemes</h2>{html_badge("PASSIVE")}</div>
        <div class="tab-strip"><span>Vue Commandement</span><span>Vue Flux / Autorite</span><span>Vue Preuves</span><span>Vue Routage</span><span>Vue Outils</span></div>
        <div class="map-tabs">{html_system_maps_v4(summary)}</div>
      </section>
      <section class="pilot-panel">
        <div class="section-head"><h2>A faire maintenant</h2>{html_badge("UNKNOWN", "decision requise")}</div>
        <div class="decision-stack">{html_decision_cards_v4(summary)}</div>
      </section>
    </section>
    <section class="panel warning-card">
      <div class="section-head"><h2>Commandes bloquees / Blocages critiques</h2>{html_badge("BLOCKED")}</div>
      <div class="blocked-detail-grid">{html_blocked_action_detail_cards(summary)}</div>
    </section>
    <section class="hero-grid">{html_situation_cards(summary)}</section>
    <details class="panel" open>
      <summary>Familles du systeme</summary>
      <div class="surface-grid">{html_system_family_cards(summary)}</div>
    </details>
    <details class="panel">
      <summary>Scripts Control</summary>
      <div class="script-grid">{html_script_cards(summary)}</div>
    </details>
    <details class="panel" open>
      <summary>Chemins casses / chemins candidats</summary>
      <p class="explain">Certains documents ou CI pointent vers d'anciens chemins. Cette vue compare l'ancien chemin, le chemin candidat, et la decision HumanGate requise.</p>
      <div class="drift-grid">{html_path_drift_cards(summary)}</div>
    </details>
    <details class="panel" open>
      <summary>Preuves & affirmations</summary>
      {html_evidence_claims_v4(summary)}
    </details>
    <section class="panel">
      <div class="section-head"><h2>Outils de controle disponibles</h2>{html_badge("DOCUMENTED_ONLY")}</div>
      <div class="tool-grid">{html_control_tool_cards()}</div>
    </section>
    <section class="panel">
      <div class="section-head"><h2>LLM / LoRA</h2>{html_badge("BLOCKED")}</div>
      {html_status_table(["surface", "status"], [["Entrainement", "BLOCKED"], ["Dataset generation/reset", "BLOCKED"], ["Checkpoints/model promotion", "BLOCKED"], ["Support LLM", "PASSIVE"]], 1)}
    </section>
  </main>
  <footer>
    {html_kv("runtime_authority: NONE", "")}
    {html_kv("writes_files: false", "except explicit --export-html target")}
    {html_kv("claim_verdict", CLAIM_POSTURE)}
    {html_kv("no_global_ready_verdict: true", "")}
    <div><span>boundary</span><strong>candidate-only | NO_CLAIM_ALLOWED | read_only: true | writes_files: false | runtime_authority: NONE</strong></div>
  </footer>
</body>
</html>
"""


SCRIPT_FAMILY_EXPLANATIONS_FR = {
    "studioctl": (
        "point d'entree de pilotage studio.",
        "lit l'etat, evidence board, surface map, scripts-control.",
    ),
    "validators": (
        "verifier des contrats ou formats.",
        "presence seule passive; validation seulement si commande lancee.",
    ),
    "control_plane": (
        "outils de controle interne.",
        "chemin officiel a decider entre root et studioV2.",
    ),
    "operator": (
        "outils operateur / orchestration.",
        "chemin officiel a decider.",
    ),
    "uxpilote": (
        "cockpit local read-only.",
        "visualise, n'execute pas, reste candidate-only.",
    ),
    "blocked_runners": (
        "signaler classes d'actions interdites.",
        "empeche confusion entre outil, preuve et activation.",
    ),
    "legacy_root_compatibility": (
        "reperer anciens chemins compatibles.",
        "ne pas promouvoir silencieusement.",
    ),
}


def slug_v5(value: str) -> str:
    return "".join(ch if ch.isalnum() else "-" for ch in value.lower()).strip("-")


def html_path_list_v5(paths: Any, limit: int = 4) -> str:
    if not isinstance(paths, list) or not paths:
        return "<p class=\"mono\">paths: INCONNU</p>"
    rows: list[str] = []
    for item in paths[:limit]:
        if isinstance(item, dict):
            rows.append(
                "<li>"
                f"{html_escape(item.get('path', INCONNU))} "
                f"| exists={bool_text(item.get('exists'))} "
                f"| status={html_escape(item.get('status', INCONNU))}"
                "</li>"
            )
        else:
            rows.append(f"<li>{html_escape(item)}</li>")
    remaining = len(paths) - limit
    if remaining > 0:
        rows.append(f"<li>+{remaining} autres chemins</li>")
    return "<ul class=\"mono\">" + "".join(rows) + "</ul>"


def html_script_cards_v5(summary: dict[str, Any]) -> str:
    families = dict_or_empty(summary.get("node_families"))
    if not families:
        return "<article class=\"script-card\"><h3>Scripts Control</h3><p>node_families: INCONNU</p></article>"
    cards: list[str] = []
    for family, raw in families.items():
        item = dict_or_empty(raw)
        paths = item.get("paths", [])
        path_count = len(paths) if isinstance(paths, list) else 0
        status = missing(item.get("status"))
        surface = missing(item.get("surface"))
        risk = missing(item.get("risk"))
        purpose, effect = SCRIPT_FAMILY_EXPLANATIONS_FR.get(
            str(family),
            ("inspecter une famille de scripts.", "aucune execution depuis UxPilote."),
        )
        cards.append(
            f"<article class=\"script-card family-{slug_v5(str(family))}\">"
            f"<div class=\"card-top\"><h3>{html_escape(family)}</h3>{html_badge(status)}</div>"
            "<dl>"
            f"<dt>surface</dt><dd>{html_escape(surface)}</dd>"
            f"<dt>risk</dt><dd>{html_escape(risk)}</dd>"
            f"<dt>paths</dt><dd>{path_count}</dd>"
            "</dl>"
            f"<p><span>Sert a:</span>{html_escape(purpose)}</p>"
            f"<p><span>Effet:</span>{html_escape(effect)}</p>"
            f"{html_path_list_v5(paths, limit=4)}"
            "</article>"
        )
    return "\n".join(cards)


def html_flow_row_v5(parts: list[str]) -> str:
    return "<div class=\"flow-row\">" + "".join(parts) + "</div>"


def dict_list_v5(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def html_map_commandement_v5(summary: dict[str, Any]) -> str:
    evidence_status = missing(dict_or_empty(summary.get("status_by_surface")).get("artifacts_runtime_outputs", "PASSIVE"))
    return (
        "<div class=\"map-canvas\">"
        + html_flow_row_v5(
            [
                html_flow_node("Studio Control", "DOCUMENTED_ONLY", "route et etat studio"),
                "<div class=\"map-arrow\">-&gt;</div>",
                html_flow_node("Evidence", evidence_status, "observe, ne prouve pas l'activation"),
                "<div class=\"map-arrow\">-&gt;</div>",
                html_flow_node("HumanGate", "DOCUMENTED_ONLY", "decision humaine requise"),
            ]
        )
        + html_flow_row_v5(
            [
                html_flow_node("Scripts", "PASSIVE", "familles et chemins candidats"),
                "<div class=\"map-arrow\">-&gt;</div>",
                html_flow_node("UxPilote", missing(summary.get("scripts_uxpilote_status")), "visualise / prepare"),
                "<div class=\"map-arrow\">-&gt;</div>",
                html_flow_node("HumanGate", "DOCUMENTED_ONLY", "register, freeze, discard"),
            ]
        )
        + html_flow_row_v5(
            [
                html_flow_node("Rocky / Search", "PASSIVE", "Search reste autorite gameplay"),
                "<div class=\"map-arrow\">-&gt;</div>",
                html_flow_node("Evidence", evidence_status, "traces et observations"),
            ]
        )
        + html_flow_row_v5(
            [
                html_flow_node("LLM / LoRA", "BLOCKED", "aucune autorite runtime"),
                "<div class=\"map-arrow\">-&gt;</div>",
                html_flow_node("BLOCKED", "BLOCKED", "entrainement et promotion interdits"),
            ]
        )
        + html_flow_row_v5(
            [
                html_flow_node("Blocked Runners", "BLOCKED", "classes d'actions interdites"),
                "<div class=\"map-arrow\">-&gt;</div>",
                html_flow_node("BLOCKED", "BLOCKED", "pas d'execution depuis le cockpit"),
            ]
        )
        + "</div>"
    )


def html_map_flux_v5(summary: dict[str, Any]) -> str:
    rows = [
        ("Neural", "PASSIVE", "propose"),
        ("Search", "DOCUMENTED_ONLY", "decide gameplay"),
        ("Evidence", "PASSIVE", "qualifie"),
        ("HumanGate", "DOCUMENTED_ONLY", "autorise"),
        ("Codex", "PASSIVE", "execute borne"),
        ("UxPilote", missing(summary.get("scripts_uxpilote_status")), "visualise / prepare"),
    ]
    nodes: list[str] = []
    for idx, (label, status, note) in enumerate(rows):
        nodes.append(html_flow_node(label, status, note))
        if idx < len(rows) - 1:
            nodes.append("<div class=\"map-arrow\">-&gt;</div>")
    return "<div class=\"map-canvas authority-flow\">" + html_flow_row_v5(nodes) + "</div>"


def html_map_preuves_v5(summary: dict[str, Any]) -> str:
    sources = list_or_empty(summary.get("evidence_sources"))
    source_state = dict_or_empty(summary.get("source_state_summary"))
    route_state = dict_or_empty(summary.get("route_state_summary"))
    proved = [
        f"sources listees: {len(sources)}",
        f"destination_allowed: {bool_text(route_state.get('destination_allowed'))}",
    ]
    observed = [
        f"worktree_status: {missing(summary.get('worktree_status'))}",
        f"total_sources: {missing(source_state.get('total_sources'))}",
        "rapports/logs: observation seulement",
    ]
    blocked = ["activation runtime", "benchmark proof", "readiness globale"]
    return (
        "<div class=\"proof-grid\">"
        f"<article><h3>Prouve</h3>{html_list(proved)}</article>"
        f"<article><h3>Observe</h3>{html_list(observed)}</article>"
        f"<article><h3>Non prouve / claim bloque</h3>{html_list(blocked)}{html_badge(summary.get('claim_posture', INCONNU))}</article>"
        "</div>"
    )


def html_map_routage_v5(summary: dict[str, Any]) -> str:
    return (
        "<p class=\"explain\">Certains documents ou CI pointent vers d'anciens chemins. "
        "Cette vue compare l'ancien chemin, le chemin candidat, et la decision HumanGate requise.</p>"
        f"<div class=\"drift-grid compact\">{html_path_drift_cards(summary)}</div>"
    )


GRAPH_PLANE_LABELS_FR = {
    "physical": "Physique",
    "authority": "Autorite",
    "evidence": "Preuves",
    "routing": "Routage",
    "tools": "Outils",
}

TRUTH_LEVEL_LABELS = (
    ("observed", "Observed = observe"),
    ("tested", "Tested = teste"),
    ("documented", "Documented = documente"),
    ("inferred", "Inferred = deduit"),
    ("unknown", "Unknown = inconnu"),
    ("blocked", "Blocked = bloque"),
)


TRUTH_LEVEL_TITLES = {
    "observed": "Observed",
    "tested": "Tested",
    "documented": "Documented",
    "inferred": "Inferred",
    "unknown": "Unknown",
    "blocked": "Blocked",
}


def graph_node_index(summary: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        str(node.get("id")): node
        for node in list_or_empty(summary.get("graph_nodes"))
        if isinstance(node, dict) and node.get("id")
    }


def graph_nodes_for_plane(summary: dict[str, Any], plane: str) -> list[dict[str, Any]]:
    return [
        node
        for node in list_or_empty(summary.get("graph_nodes"))
        if isinstance(node, dict) and node.get("graph_plane") == plane
    ]


def graph_edges_for_plane(summary: dict[str, Any], plane: str) -> list[dict[str, Any]]:
    nodes = graph_node_index(summary)
    edges: list[dict[str, Any]] = []
    for edge in list_or_empty(summary.get("graph_edges")):
        if not isinstance(edge, dict):
            continue
        from_node = nodes.get(str(edge.get("from")), {})
        to_node = nodes.get(str(edge.get("to")), {})
        if from_node.get("graph_plane") == plane or to_node.get("graph_plane") == plane:
            edges.append(edge)
    return edges


def graph_edge_key(edge: dict[str, Any]) -> str:
    if edge.get("id"):
        return str(edge.get("id"))
    return "|".join(
        [
            str(edge.get("from", "")),
            str(edge.get("to", "")),
            str(edge.get("kind", "")),
            str(edge.get("truth_level", "")),
        ]
    )


def unique_graph_edges(edges: list[Any]) -> list[dict[str, Any]]:
    unique: list[dict[str, Any]] = []
    seen: set[str] = set()
    for edge in edges:
        if not isinstance(edge, dict):
            continue
        key = graph_edge_key(edge)
        if key in seen:
            continue
        seen.add(key)
        unique.append(edge)
    return unique


def graph_truth_level_counts(summary: dict[str, Any]) -> dict[str, int]:
    counts = {level: 0 for level, _label in TRUTH_LEVEL_LABELS}
    for edge in list_or_empty(summary.get("graph_edges")):
        if not isinstance(edge, dict):
            continue
        level = str(edge.get("truth_level", "unknown")).lower()
        if level not in counts:
            level = "unknown"
        counts[level] += 1
    return counts


def graph_blocked_edges(summary: dict[str, Any]) -> list[dict[str, Any]]:
    return unique_graph_edges(list_or_empty(summary.get("graph_blocked_edges")))


def graph_unknown_unsafe_edges(summary: dict[str, Any]) -> list[dict[str, Any]]:
    blocked_keys = {graph_edge_key(edge) for edge in graph_blocked_edges(summary)}
    candidates = [
        *list_or_empty(summary.get("graph_unsafe_edges")),
        *[
            edge
            for edge in list_or_empty(summary.get("graph_edges"))
            if isinstance(edge, dict)
            and (
                str(edge.get("truth_level", "")).lower() == "unknown"
                or bool(edge.get("unsafe_to_render_as_active"))
            )
        ],
    ]
    return [edge for edge in unique_graph_edges(candidates) if graph_edge_key(edge) not in blocked_keys]


def graph_source_state_gaps(summary: dict[str, Any]) -> list[dict[str, Any]]:
    return [gap for gap in list_or_empty(summary.get("graph_source_state_gaps")) if isinstance(gap, dict)]


def graph_humangate_questions(summary: dict[str, Any]) -> list[dict[str, Any]]:
    return [item for item in list_or_empty(summary.get("graph_humangate_questions")) if isinstance(item, dict)]


def graph_plane_counts(summary: dict[str, Any], plane: str) -> dict[str, int]:
    nodes = graph_nodes_for_plane(summary, plane)
    edges = graph_edges_for_plane(summary, plane)
    blocked = [
        edge
        for edge in edges
        if str(edge.get("truth_level", "")).lower() == "blocked"
        or str(edge.get("status", "")).upper() == "BLOCKED"
    ]
    unknown = [
        edge
        for edge in edges
        if str(edge.get("truth_level", "")).lower() == "unknown"
        or str(edge.get("status", "")).upper() == "UNKNOWN"
    ]
    unsafe = [edge for edge in edges if bool(edge.get("unsafe_to_render_as_active"))]
    return {
        "nodes": len(nodes),
        "edges": len(edges),
        "blocked": len(blocked),
        "unknown": len(unknown),
        "unsafe": len(unsafe),
    }


def graph_node_label(summary: dict[str, Any], node_id: Any) -> str:
    node = graph_node_index(summary).get(str(node_id))
    if not node:
        return missing(node_id)
    return missing(node.get("label")) or missing(node_id)


def html_source_state_badges(source_state: dict[str, Any]) -> str:
    if not source_state:
        return "<span class=\"mini-badge\">source_state: INCONNU</span>"
    badges = []
    for field in ("created", "registered", "loaded", "enforced", "evidenced"):
        badges.append(
            f"<span class=\"mini-badge source-state-badge\">{html_escape(field)}: "
            f"{html_escape(missing(source_state.get(field)))}</span>"
        )
    return "".join(badges)


def html_graph_summary(summary: dict[str, Any]) -> str:
    counts = dict_or_empty(summary.get("graph_counts"))
    if not counts:
        return (
            "<section class=\"panel warning-card\">"
            "<div class=\"section-head\"><h2>Graphe indisponible</h2>"
            f"{html_badge('UNKNOWN')}</div>"
            "<p>Aucune donnee graphe fournie par studioctl.</p>"
            "</section>"
        )
    cards = [
        html_metric_card("nodes", counts.get("nodes", 0), "noeuds graphe", "IMPLEMENTED"),
        html_metric_card("edges", counts.get("edges", 0), "liens graphe", "IMPLEMENTED"),
        html_metric_card("blocked_edges", counts.get("blocked_edges", 0), "liens bloques", "BLOCKED"),
        html_metric_card("unsafe_edges", counts.get("unsafe_edges", 0), "liens non actifs", "BLOCKED"),
        html_metric_card("source_state_gaps", counts.get("source_state_gaps", 0), "trous source-state", "UNKNOWN"),
        html_metric_card("humangate_questions", counts.get("humangate_questions", 0), "decisions graphe", "UNKNOWN"),
    ]
    meta = (
        "<div class=\"graph-meta-row\">"
        f"{html_kv('schema_version', summary.get('graph_schema_version', INCONNU))}"
        f"{html_kv('no_global_ready_verdict: true', '')}"
        "</div>"
    )
    return (
        "<section class=\"panel graph-summary-panel\">"
        f"<div class=\"section-head\"><h2>Backend graphe</h2>{html_badge('IMPLEMENTED')}</div>"
        f"<div class=\"graph-summary-grid\">{''.join(cards)}</div>{meta}"
        "</section>"
    )


def html_graph_node_card(node: dict[str, Any]) -> str:
    source_state = dict_or_empty(node.get("source_state"))
    return (
        "<article class=\"graph-node-card\">"
        f"<div class=\"card-top\"><h3>{html_escape(missing(node.get('label')))}</h3>"
        f"{html_badge(missing(node.get('status')))}</div>"
        f"<p><span>Famille</span>{html_escape(missing(node.get('surface')))}</p>"
        f"<p><span>Zone</span>{html_escape(missing(node.get('zone')))}</p>"
        f"<p class=\"mono\">{html_escape(missing(node.get('path')))}</p>"
        f"<div class=\"source-state-row\">{html_source_state_badges(source_state)}</div>"
        f"<p><span>Risque</span>{html_escape(missing(node.get('risk')))}</p>"
        "</article>"
    )


def html_graph_edge_card(summary: dict[str, Any], edge: dict[str, Any], strong: bool = False) -> str:
    unsafe = bool_text(edge.get("unsafe_to_render_as_active"))
    classes = "graph-edge-card"
    if strong or edge.get("truth_level") == "blocked" or edge.get("unsafe_to_render_as_active"):
        classes += " warning-card"
    return (
        f"<article class=\"{classes}\">"
        f"<div class=\"card-top\"><h3>{html_escape(graph_node_label(summary, edge.get('from')))} -&gt; "
        f"{html_escape(graph_node_label(summary, edge.get('to')))}</h3>{html_badge(missing(edge.get('status')))}</div>"
        f"<dl><dt>kind</dt><dd>{html_escape(missing(edge.get('kind')))}</dd>"
        f"<dt>truth_level</dt><dd>{html_badge(edge.get('truth_level', INCONNU), missing(edge.get('truth_level')))}</dd>"
        f"<dt>display_style</dt><dd>{html_escape(missing(edge.get('display_style')))}</dd>"
        f"<dt>unsafe_to_render_as_active</dt><dd>{html_escape(unsafe)}</dd>"
        f"<dt>evidence count</dt><dd>{len(list_or_empty(edge.get('evidence')))}</dd></dl>"
        f"<p>{html_escape(missing(edge.get('explanation')))}</p>"
        "</article>"
    )


def html_truth_counter_chips(summary: dict[str, Any]) -> str:
    counts = graph_truth_level_counts(summary)
    chips = []
    for level, label in TRUTH_LEVEL_LABELS:
        title = TRUTH_LEVEL_TITLES.get(level, level.title())
        chips.append(
            f"<span class=\"truth-counter truth-{html_escape(level)}\">"
            f"{html_escape(title)} <strong>{counts.get(level, 0)}</strong>"
            f"<em>{html_escape(label.split('=', 1)[-1].strip())}</em>"
            "</span>"
        )
    return "".join(chips)


def html_graph_priority_decisions(summary: dict[str, Any], limit: int = 5) -> str:
    questions = graph_humangate_questions(summary)
    cards: list[str] = []
    for idx, item in enumerate(questions[:limit], start=1):
        copy = decision_copy_fr(summary, missing(item.get("question")), idx)
        status = missing(item.get("status")) if item.get("status") else "UNKNOWN"
        cards.append(
            "<article class=\"priority-card decision-priority-card\">"
            f"<strong>{idx}</strong>"
            "<div>"
            f"<h3>{html_escape(copy['title'])}</h3>"
            f"<p><span>Pourquoi maintenant ?</span>{html_escape(copy['why'])}</p>"
            f"<p><span>source</span>graph</p>"
            f"{html_badge(status)}"
            "</div>"
            "</article>"
        )
    if len(questions) > limit:
        cards.append(
            f"<article class=\"priority-card more-card\"><strong>+{len(questions) - limit}</strong>"
            "<div><h3>+N autres</h3><p>Decisions graphe supplementaires en details.</p></div></article>"
        )
    return "".join(cards) or "<article class=\"priority-card\"><div><h3>INCONNU</h3><p>Aucune question graphe fournie.</p></div></article>"


def html_graph_priority_edges(summary: dict[str, Any], edges: list[dict[str, Any]], limit: int = 5) -> str:
    cards = [html_graph_edge_card(summary, edge, strong=True) for edge in edges[:limit]]
    if len(edges) > limit:
        cards.append(
            f"<article class=\"graph-edge-card more-card\"><h3>+{len(edges) - limit}</h3>"
            "<p>+N autres</p></article>"
        )
    return "".join(cards) or "<article class=\"graph-edge-card\"><h3>INCONNU</h3><p>Aucun lien prioritaire.</p></article>"


def html_graph_priority_gaps(summary: dict[str, Any], limit: int = 5) -> str:
    gaps = graph_source_state_gaps(summary)
    rows: list[str] = []
    for gap in gaps[:limit]:
        field = missing(gap.get("field"))
        rows.append(
            "<article class=\"source-gap-card priority-gap-card\">"
            f"<h3>{html_escape(missing(gap.get('node_id')))}</h3>"
            f"<p><span>missing</span>{html_escape(field)}</p>"
            f"<p><span>status</span>{html_badge(missing(gap.get('status')))}</p>"
            f"<p>{html_escape(missing(gap.get('reason')))}</p>"
            "</article>"
        )
    if len(gaps) > limit:
        rows.append(
            f"<article class=\"source-gap-card more-card\"><h3>+{len(gaps) - limit}</h3>"
            "<p>+N autres</p></article>"
        )
    return "".join(rows) or "<article class=\"source-gap-card\"><h3>INCONNU</h3><p>Aucun trou source-state fourni.</p></article>"


def html_graph_priorities(summary: dict[str, Any]) -> str:
    blocked_edges = graph_blocked_edges(summary)
    unknown_unsafe_edges = graph_unknown_unsafe_edges(summary)
    return (
        "<section class=\"panel graph-priority-panel\">"
        f"<div class=\"section-head\"><h2>Priorites graphe</h2>{html_badge('UNKNOWN', 'decision filter')}</div>"
        "<div class=\"truth-counter-panel\">"
        "<h3>Compteurs truth_level</h3>"
        f"<div class=\"truth-counter-row\">{html_truth_counter_chips(summary)}</div>"
        "</div>"
        "<div class=\"priority-grid\">"
        "<article class=\"priority-box\"><div class=\"priority-head\"><h3>Top decisions HumanGate</h3>"
        f"{html_badge('UNKNOWN')}</div><div class=\"priority-list\">{html_graph_priority_decisions(summary)}</div></article>"
        "<article class=\"priority-box\"><div class=\"priority-head\"><h3>Liens BLOCKED</h3>"
        f"{html_badge('BLOCKED')}</div><div class=\"graph-edge-grid compact-priority-grid\">{html_graph_priority_edges(summary, blocked_edges)}</div></article>"
        "<article class=\"priority-box\"><div class=\"priority-head\"><h3>Liens UNKNOWN / dangereux</h3>"
        f"{html_badge('UNKNOWN')}</div><div class=\"graph-edge-grid compact-priority-grid\">{html_graph_priority_edges(summary, unknown_unsafe_edges)}</div></article>"
        "<article class=\"priority-box\"><div class=\"priority-head\"><h3>Trous source-state prioritaires</h3>"
        f"{html_badge('UNKNOWN')}</div>"
        "<p class=\"explain\">Un fichier existe ne veut pas dire qu'il est enregistre, charge, applique ou prouve.</p>"
        f"<div class=\"source-gap-grid compact-priority-grid\">{html_graph_priority_gaps(summary)}</div></article>"
        "</div>"
        "</section>"
    )


def html_graph_plane(summary: dict[str, Any], plane: str, node_limit: int = 12, edge_limit: int = 8) -> str:
    nodes = graph_nodes_for_plane(summary, plane)
    edges = graph_edges_for_plane(summary, plane)
    node_cards = "".join(html_graph_node_card(node) for node in nodes[:node_limit])
    edge_cards = "".join(html_graph_edge_card(summary, edge) for edge in edges[:edge_limit])
    if len(nodes) > node_limit:
        node_cards += f"<article class=\"graph-node-card more-card\"><h3>+{len(nodes) - node_limit}</h3><p>noeuds supplementaires</p></article>"
    if len(edges) > edge_limit:
        edge_cards += f"<article class=\"graph-edge-card more-card\"><h3>+{len(edges) - edge_limit}</h3><p>liens supplementaires</p></article>"
    counts = graph_plane_counts(summary, plane)
    summary_cards = "".join(
        [
            html_metric_card("nodes", counts["nodes"], "noeuds du plan", "PASSIVE"),
            html_metric_card("edges", counts["edges"], "liens du plan", "PASSIVE"),
            html_metric_card("blocked", counts["blocked"], "liens BLOCKED", "BLOCKED"),
            html_metric_card("unknown", counts["unknown"], "liens UNKNOWN", "UNKNOWN"),
            html_metric_card("unsafe", counts["unsafe"], "liens dangereux", "BLOCKED"),
        ]
    )
    return (
        f"<div class=\"tab-title\"><h3>{html_escape(GRAPH_PLANE_LABELS_FR.get(plane, plane))}</h3>"
        f"{html_badge('PASSIVE', f'{len(nodes)} nodes / {len(edges)} edges')}</div>"
        f"<div class=\"plane-summary-grid\">{summary_cards}</div>"
        "<details class=\"graph-detail-block\"><summary>Noeuds du plan</summary>"
        f"<div class=\"graph-plane-grid\">{node_cards or '<p>INCONNU</p>'}</div></details>"
        "<details class=\"graph-detail-block\"><summary>Liens du plan</summary>"
        f"<div class=\"graph-edge-grid\">{edge_cards or '<p>INCONNU</p>'}</div></details>"
    )


def html_truth_legend() -> str:
    chips = "".join(
        f"<span class=\"truth-chip truth-{html_escape(level)}\">{html_escape(label)}</span>"
        for level, label in TRUTH_LEVEL_LABELS
    )
    return f"<div class=\"truth-legend\"><strong>Truth level legend</strong>{chips}</div>"


def html_real_graph_tabs_v9(summary: dict[str, Any]) -> str:
    graph_failure = next((row for row in summary.get("studioctl_commands", []) if row.get("view") == "graph" and row.get("error")), None)
    if graph_failure:
        return (
            "<section class=\"panel warning-card\">"
            f"<div class=\"section-head\"><h2>Graphe indisponible</h2>{html_badge('UNKNOWN')}</div>"
            f"<p>{html_escape(graph_failure.get('command', INCONNU))}</p>"
            f"<p>{html_escape(graph_failure.get('error', INCONNU))}</p>"
            "</section>"
        )
    return f"""
<section class="panel system-tabs-panel real-graph-panel">
  <div class="section-head"><h2>Cartes systemes reelles</h2>{html_badge("IMPLEMENTED")}</div>
  {html_truth_legend()}
  <div class="tabs">
    <input type="radio" name="system-map" id="tab-commandement" checked>
    <input type="radio" name="system-map" id="tab-flux">
    <input type="radio" name="system-map" id="tab-preuves">
    <input type="radio" name="system-map" id="tab-routage">
    <input type="radio" name="system-map" id="tab-outils">
    <div class="tab-labels" role="tablist" aria-label="Cartes systemes reelles">
      <label for="tab-commandement">Physique</label>
      <label for="tab-flux">Autorite</label>
      <label for="tab-preuves">Preuves</label>
      <label for="tab-routage">Routage</label>
      <label for="tab-outils">Outils</label>
    </div>
    <div class="tab-panels">
      <section class="tab-panel panel-commandement">{html_graph_plane(summary, "physical")}</section>
      <section class="tab-panel panel-flux">{html_graph_plane(summary, "authority")}</section>
      <section class="tab-panel panel-preuves">{html_graph_plane(summary, "evidence")}</section>
      <section class="tab-panel panel-routage">{html_graph_plane(summary, "routing")}</section>
      <section class="tab-panel panel-outils">{html_graph_plane(summary, "tools")}</section>
    </div>
  </div>
</section>
"""


def html_blocked_unsafe_graph_edges(summary: dict[str, Any], limit: int = 10) -> str:
    combined: list[dict[str, Any]] = []
    seen: set[str] = set()
    for edge in [*list_or_empty(summary.get("graph_blocked_edges")), *list_or_empty(summary.get("graph_unsafe_edges"))]:
        if not isinstance(edge, dict):
            continue
        edge_id = str(edge.get("id", ""))
        if edge_id in seen:
            continue
        seen.add(edge_id)
        combined.append(edge)
    cards = "".join(html_graph_edge_card(summary, edge, strong=True) for edge in combined[:limit])
    if len(combined) > limit:
        cards += f"<article class=\"graph-edge-card more-card\"><h3>+{len(combined) - limit}</h3><p>liens bloques ou dangereux supplementaires</p></article>"
    return (
        "<section class=\"panel warning-card\">"
        f"<div class=\"section-head\"><h2>Liens bloques ou dangereux</h2>{html_badge('BLOCKED')}</div>"
        "<p class=\"explain\">Ces liens viennent de blocked_edges et unsafe_edges. Ils ne doivent pas etre rendus comme liens actifs.</p>"
        f"<div class=\"graph-edge-grid\">{cards or '<p>INCONNU</p>'}</div>"
        "</section>"
    )


def html_blocked_graph_edges(summary: dict[str, Any], limit: int = 8) -> str:
    edges = graph_blocked_edges(summary)
    cards = "".join(html_graph_edge_card(summary, edge, strong=True) for edge in edges[:limit])
    if len(edges) > limit:
        cards += f"<article class=\"graph-edge-card more-card\"><h3>+{len(edges) - limit}</h3><p>liens BLOCKED supplementaires</p></article>"
    return (
        "<details class=\"panel warning-card\">"
        f"<summary>Liens BLOCKED</summary>"
        "<p class=\"explain\">Ces liens sont explicitement bloques par le graphe. Ils ne doivent pas etre affiches comme actifs.</p>"
        f"<div class=\"graph-edge-grid\">{cards or '<p>INCONNU</p>'}</div>"
        "</details>"
    )


def html_unknown_unsafe_graph_edges(summary: dict[str, Any], limit: int = 8) -> str:
    edges = graph_unknown_unsafe_edges(summary)
    cards = "".join(html_graph_edge_card(summary, edge, strong=True) for edge in edges[:limit])
    if len(edges) > limit:
        cards += f"<article class=\"graph-edge-card more-card\"><h3>+{len(edges) - limit}</h3><p>liens UNKNOWN / dangereux supplementaires</p></article>"
    return (
        "<details class=\"panel warning-card\">"
        f"<summary>Liens UNKNOWN / dangereux</summary>"
        "<p class=\"explain\">Ces liens restent inconnus ou unsafe_to_render_as_active. Ils doivent rester marques comme non actifs.</p>"
        f"<div class=\"graph-edge-grid\">{cards or '<p>INCONNU</p>'}</div>"
        "</details>"
    )


def html_source_state_gaps(summary: dict[str, Any], limit: int = 12) -> str:
    gaps = graph_source_state_gaps(summary)
    rows = []
    for gap in gaps[:limit]:
        rows.append(
            "<article class=\"source-gap-card\">"
            f"<h3>{html_escape(missing(gap.get('node_id')))}</h3>"
            f"<p><span>field</span>{html_escape(missing(gap.get('field')))}</p>"
            f"<p><span>status</span>{html_badge(missing(gap.get('status')))}</p>"
            f"<p>{html_escape(missing(gap.get('reason')))}</p>"
            "</article>"
        )
    if len(gaps) > limit:
        rows.append(f"<article class=\"source-gap-card more-card\"><h3>+{len(gaps) - limit}</h3><p>trous supplementaires</p></article>")
    return (
        "<details class=\"panel\">"
        f"<summary>Trous de source-state</summary>"
        "<p class=\"explain\">Un fichier existe ne veut pas dire qu'il est enregistre, charge, applique ou prouve.</p>"
        f"<div class=\"source-gap-grid\">{''.join(rows) or '<p>INCONNU</p>'}</div>"
        "</details>"
    )


def html_graph_humangate_questions(summary: dict[str, Any], limit: int = 5) -> str:
    questions = graph_humangate_questions(summary)
    cards = []
    for idx, item in enumerate(questions[:limit], start=1):
        cards.append(
            "<article class=\"decision-compact\">"
            f"<strong>{idx}</strong>"
            "<div>"
            f"<h3>{html_escape(missing(item.get('source')))}</h3>"
            f"<p><span>question</span>{html_escape(missing(item.get('question')))}</p>"
            f"<p><span>status</span>{html_badge(missing(item.get('status')))}</p>"
            "</div>"
            "</article>"
        )
    if len(questions) > limit:
        cards.append(f"<article class=\"decision-compact more-card\"><strong>+{len(questions) - limit}</strong><div><h3>autres questions graphe</h3><p>voir JSON source si necessaire</p></div></article>")
    return (
        "<details class=\"panel\">"
        f"<summary>Decisions HumanGate issues du graphe</summary>"
        f"<div class=\"decision-grid\">{''.join(cards) or '<p>Aucune question graphe fournie.</p>'}</div>"
        "</details>"
    )


def html_system_tabs_v5(summary: dict[str, Any]) -> str:
    return html_real_graph_tabs_v9(summary)


def html_compact_tool_strip_v5(summary: dict[str, Any]) -> str:
    return (
        "<section class=\"panel tools-strip\">"
        f"<div class=\"section-head\"><h2>Outils de controle disponibles</h2>{html_badge('DOCUMENTED_ONLY')}</div>"
        "<p class=\"explain\">Ces tuiles sont des outils de pilotage. Elles n'executent rien. Elles indiquent quel audit ou quelle decision preparer.</p>"
        f"{html_control_tool_cards(summary)}"
        "</section>"
    )


def html_decision_cards_v5(summary: dict[str, Any]) -> str:
    questions = merged_pilot_questions(summary, limit=20)
    if not questions:
        return "<article class=\"decision-compact\"><strong>Aucune question fournie par studioctl</strong></article>"
    cards: list[str] = []
    for idx, question in enumerate(questions[:3], start=1):
        copy = decision_copy_fr(summary, question, idx)
        decisions = [part.strip() for part in copy["possible"].split(",") if part.strip()]
        chips = "".join(f"<span class=\"decision-chip\">{html_escape(decision)}</span>" for decision in decisions)
        cards.append(
            "<article class=\"decision-compact\">"
            f"<strong>{idx}</strong>"
            "<div>"
            f"<h3>{html_escape(copy['title'])}</h3>"
            f"<p><span>status/evidence</span>{html_escape(copy['situation'])}</p>"
            f"<p><span>pourquoi</span>{html_escape(copy['why'])}</p>"
            f"<div class=\"chip-row\">{chips}</div>"
            "</div>"
            "</article>"
        )
    remaining = len(questions) - 3
    if remaining > 0:
        cards.append(f"<article class=\"decision-compact more-card\"><strong>+{remaining}</strong><div><h3>autres decisions</h3><p>voir details HumanGate plus bas</p></div></article>")
    return "\n".join(cards)


def console_graph_summary_rows(summary: dict[str, Any]) -> list[str]:
    counts = dict_or_empty(summary.get("graph_counts"))
    if not counts:
        failure = next((row for row in summary.get("studioctl_commands", []) if row.get("view") == "graph" and row.get("error")), None)
        if failure:
            return [
                "Graphe indisponible",
                f"source: {failure.get('command', INCONNU)}",
                f"erreur: {failure.get('error', INCONNU)}",
            ]
        return ["Graphe indisponible"]
    return [
        f"schema_version: {missing(summary.get('graph_schema_version'))}",
        f"nodes: {counts.get('nodes', 0)} | edges: {counts.get('edges', 0)}",
        f"blocked_edges: {counts.get('blocked_edges', 0)} | unsafe_edges: {counts.get('unsafe_edges', 0)}",
        f"source_state_gaps: {counts.get('source_state_gaps', 0)} | humangate_questions: {counts.get('humangate_questions', 0)}",
        "no_global_ready_verdict: true",
    ]


def console_graph_priority_rows(summary: dict[str, Any]) -> list[str]:
    counts = dict_or_empty(summary.get("graph_counts"))
    truth_counts = graph_truth_level_counts(summary)
    rows = [
        "Priorites graphe",
        f"blocked_edges: {counts.get('blocked_edges', 0)} | unsafe_edges: {counts.get('unsafe_edges', 0)} | source_state_gaps: {counts.get('source_state_gaps', 0)}",
        "Compteurs truth_level: "
        + " | ".join(
            f"{TRUTH_LEVEL_TITLES.get(level, level.title())}={truth_counts.get(level, 0)}"
            for level, _label in TRUTH_LEVEL_LABELS
        ),
        "Top decisions HumanGate",
    ]
    questions = graph_humangate_questions(summary)
    for idx, item in enumerate(questions[:5], start=1):
        copy = decision_copy_fr(summary, missing(item.get("question")), idx)
        status = missing(item.get("status")) if item.get("status") else "UNKNOWN"
        rows.append(f"{idx}. {copy['title']} | status: {status} | source: graph")
        rows.append(f"   Pourquoi maintenant ? {copy['why']}")
    if len(questions) > 5:
        rows.append(f"+{len(questions) - 5} autres decisions HumanGate graphe")
    rows.append(f"Liens BLOCKED: {len(graph_blocked_edges(summary))} | Liens UNKNOWN / dangereux: {len(graph_unknown_unsafe_edges(summary))}")
    rows.append(f"Trous source-state prioritaires: {min(5, len(graph_source_state_gaps(summary)))} / {len(graph_source_state_gaps(summary))}")
    return rows


def console_system_maps_v5(summary: dict[str, Any]) -> list[str]:
    counts = dict_or_empty(summary.get("graph_counts"))
    planes = list_or_empty(summary.get("graph_planes")) or ["physical", "authority", "evidence", "routing", "tools"]
    rows = [
        "Cartes systemes reelles: physical/authority/evidence/routing/tools",
        "Tabs HTML: Physique | Autorite | Preuves | Routage | Outils",
        f"nodes={counts.get('nodes', 0)} edges={counts.get('edges', 0)} blocked_edges={counts.get('blocked_edges', 0)} unsafe_edges={counts.get('unsafe_edges', 0)}",
    ]
    for plane in planes:
        plane_counts = graph_plane_counts(summary, str(plane))
        rows.append(
            f"- {plane}: nodes={plane_counts['nodes']} edges={plane_counts['edges']} "
            f"blocked={plane_counts['blocked']} unknown={plane_counts['unknown']} unsafe={plane_counts['unsafe']}"
        )
    return rows


def console_tool_rows_v5(summary: dict[str, Any]) -> list[str]:
    chains = list_or_empty(summary.get("audit_chains"))
    if not chains:
        failure = next((row for row in summary.get("studioctl_commands", []) if row.get("view") == "audit_chains" and row.get("error")), None)
        if failure:
            return [
                "Catalogue des chaines indisponible",
                f"source: {failure.get('command', INCONNU)}",
                f"erreur: {failure.get('error', INCONNU)}",
            ]
        return [
            f"{tool['title']}: {tool['status']} | {tool['command']} | HumanGate: {tool['humangate']}"
            for tool in CONTROL_TOOL_CARDS
        ]
    rows = [
        "Ces tuiles sont des outils de pilotage. Elles n'executent rien. Elles indiquent quel audit ou quelle decision preparer."
    ]
    for chain in chains:
        if not isinstance(chain, dict):
            continue
        copy = audit_chain_tile_copy(chain)
        rows.append(f"[{copy['title']}] {copy['utility']} - reference seulement")
    return rows


def console_audit_selector_rows_v8(summary: dict[str, Any]) -> list[str]:
    chains = chain_by_id(summary)
    rows = [
        "Choisis selon le probleme que tu veux eclaircir. REFERENCE SEULEMENT | ne lance rien | HumanGate requis si mutation"
    ]
    for problem, chain_id, why in AUDIT_SELECTOR_GUIDE_FR:
        chain = chains.get(chain_id, {"id": chain_id})
        copy = audit_chain_tile_copy(chain)
        rows.append(f"- {problem} -> {copy['title']} | {why}")
    return rows


ACTION_CENTER_CARDS_FR: tuple[dict[str, str], ...] = (
    {
        "intent": "Je veux comprendre ce qui est vrai",
        "chain_label": "Verite systeme",
        "chain_id": "system_truth_chain",
        "expected": "Reel / documente / deduit / inconnu / bloque",
        "risk": "Confondre doc, rapport et preuve",
        "humangate": "Non pour audit read-only; oui pour mutation",
        "action": "Preparer un audit read-only",
    },
    {
        "intent": "Je veux comprendre les scripts et chemins",
        "chain_label": "Routage scripts",
        "chain_id": "scripts_route_chain",
        "expected": "Chemins officiels, legacy, absents, candidats",
        "risk": "Lancer ou promouvoir un vieux chemin",
        "humangate": "Oui pour changer routes/shims/CI",
        "action": "Ouvrir la vue Routage scripts",
    },
    {
        "intent": "Je veux voir les contradictions",
        "chain_label": "Matrice de fusion",
        "chain_id": "fusion_matrix_chain",
        "expected": "Conflits, faux OK, risques non resolus",
        "risk": "Patch non borne ou claim non prouve",
        "humangate": "Oui avant toute mutation",
        "action": "Lire les contradictions",
    },
    {
        "intent": "Je veux decider quoi faire ensuite",
        "chain_label": "Decisions HumanGate",
        "chain_id": "humangate_queue_chain",
        "expected": "approve / block / request revision / defer",
        "risk": "Garder les decisions dans la tete",
        "humangate": "Oui",
        "action": "Lister les decisions ouvertes",
    },
    {
        "intent": "Je veux choisir un outil",
        "chain_label": "Catalogue outils",
        "chain_id": "tool_catalog_chain",
        "expected": "Quel outil sert a quoi, ce qu'il lit, ce qu'il produit",
        "risk": "Lancer le mauvais outil",
        "humangate": "Selon l'outil",
        "action": "Comparer les outils",
    },
    {
        "intent": "Je veux verifier LLM / LoRA",
        "chain_label": "Garde LLM / LoRA",
        "chain_id": "llm_lora_guard_chain",
        "expected": "Training, dataset, checkpoints restent bloques",
        "risk": "Activer entrainement ou generation dataset",
        "humangate": "Oui pour toute action training/dataset/model",
        "action": "Garder BLOCKED",
    },
    {
        "intent": "Je veux verifier un risque d'activation runtime",
        "chain_label": "Garde runtime",
        "chain_id": "runtime_guard_chain",
        "expected": "Benchmark, gameplay, latest.json, lab/runs, promotion restent bloques",
        "risk": "Activation cachee ou preuve abusive",
        "humangate": "Oui",
        "action": "Demander une charte HumanGate",
    },
)


def action_center_cards(summary: dict[str, Any]) -> list[dict[str, Any]]:
    chains = chain_by_id(summary)
    cards: list[dict[str, Any]] = []
    for item in ACTION_CENTER_CARDS_FR:
        chain = chains.get(item["chain_id"], {})
        card: dict[str, Any] = dict(item)
        card["chain_status"] = missing(chain.get("status", "DOCUMENTED_ONLY"))
        card["metadata_available"] = bool(chain)
        card["reference_only"] = chain.get("safe_to_run_now") is False or not chain
        card["chain_purpose"] = missing(chain.get("purpose", "Catalogue des chaines indisponible - fallback statique"))
        cards.append(card)
    return cards


def action_center_fallback_warning(summary: dict[str, Any]) -> str:
    return "" if chain_by_id(summary) else "Catalogue des chaines indisponible - fallback statique"


def console_action_center_rows(summary: dict[str, Any]) -> list[str]:
    rows: list[str] = []
    for card in action_center_cards(summary):
        rows.append(f"{card['intent']} -> {card['chain_label']} -> {card['action']} | ne lance rien")
    return rows[:7]


def html_action_center(summary: dict[str, Any]) -> str:
    warning = action_center_fallback_warning(summary)
    warning_html = f"<p class=\"explain\">{html_escape(warning)}</p>" if warning else ""
    cards = []
    for card in action_center_cards(summary):
        reference_badge = html_badge("BLOCKED", "REFERENCE SEULEMENT") if card["reference_only"] else html_badge("PASSIVE", "lecture seule")
        cards.append(
            "<article class=\"action-card\">"
            f"<p><span>Je veux</span><strong>{html_escape(card['intent'])}</strong></p>"
            f"<p><span>Audit recommande</span><strong>{html_escape(card['chain_label'])}</strong></p>"
            f"<p class=\"mono\">{html_escape(card['chain_id'])}</p>"
            f"<p><span>Resultat attendu</span>{html_escape(card['expected'])}</p>"
            f"<p><span>Risque</span>{html_escape(card['risk'])}</p>"
            f"<p><span>HumanGate</span>{html_escape(card['humangate'])}</p>"
            f"<p><span>Action immediate</span>{html_escape(card['action'])}</p>"
            "<div class=\"tile-badges\">"
            f"{reference_badge}"
            "<span class=\"mini-badge reference-badge\">ne lance rien</span>"
            f"{html_badge(card['chain_status'])}"
            "</div>"
            "</article>"
        )
    return (
        "<section class=\"panel action-center\">"
        f"<div class=\"section-head\"><div><h2>Centre d'action</h2>"
        "<p>Choisis ce que tu veux comprendre ou decider. Ces cartes ne lancent rien.</p></div>"
        f"{html_badge('DOCUMENTED_ONLY')}</div>"
        f"{warning_html}"
        "<div class=\"action-grid\">"
        + "".join(cards)
        + "</div>"
        "</section>"
    )


def audit_chain_brief_rows(summary: dict[str, Any]) -> list[str]:
    chains = list_or_empty(summary.get("audit_chains"))
    if not chains:
        return ["audit-chains: UNKNOWN"]
    rows = []
    for chain in chains:
        if not isinstance(chain, dict):
            continue
        rows.append(
            f"{missing(chain.get('label'))}: {missing(chain.get('status'))} | "
            f"{missing(chain.get('primary_surface'))} | safe_to_run_now: {bool_text(chain.get('safe_to_run_now'))}"
        )
    return rows or ["audit-chains: UNKNOWN"]


def humangate_chain_rows(summary: dict[str, Any]) -> list[str]:
    chains = chain_by_id(summary)
    chain = chains.get("humangate_queue_chain")
    if not chain:
        return ["HumanGate Queue Chain: UNKNOWN"]
    return [
        f"{missing(chain.get('label'))}: {missing(chain.get('status'))}",
        f"Sert a: {missing(chain.get('purpose'))}",
        f"safe_to_run_now: {bool_text(chain.get('safe_to_run_now'))}",
        f"HumanGate requis: {missing(chain.get('humangate_question'))}",
    ]


def console_decision_rows_v5(summary: dict[str, Any]) -> list[str]:
    questions = merged_pilot_questions(summary, limit=20)
    rows: list[str] = []
    if list_or_empty(summary.get("graph_humangate_questions")):
        rows.append("Source principale: Decisions HumanGate issues du graphe")
    for idx, question in enumerate(questions[:3], start=1):
        copy = decision_copy_fr(summary, question, idx)
        rows.append(f"{idx}. {copy['title']} | {copy['situation']}")
        rows.append(f"   Pourquoi: {copy['why']}")
        rows.append(f"   Decisions: {copy['possible']}")
    remaining = len(questions) - 3
    if remaining > 0:
        rows.append(f"+{remaining} autres decisions disponibles en detail")
    return rows or ["1. Aucune question fournie par studioctl"]


def render_cockpit_view(summary: dict[str, Any], width: int) -> str:
    width = clamp_width(width)
    situation = [
        f"Repo: {missing(summary.get('branch'))} @ {short_head(summary)}",
        f"Worktree: {missing(summary.get('worktree_status'))} | changements pre-existants: {missing(summary.get('pre_existing_changes_count'))}",
        f"Claims: {missing(summary.get('claim_posture'))} | candidate-only | read_only: true | no_global_ready_verdict: true",
    ]
    blocked_rows = [
        f"{action}: {critical_blocked_status(summary, action)} | {BLOCKED_EXPLANATIONS_FR.get(action, ('bloque', '', ''))[0]}"
        for action in CRITICAL_BLOCKED_ACTIONS
    ]
    detail_rows = [
        "Familles du systeme",
        "Scripts Control detaille",
        "Chemins casses / chemins candidats",
        "Preuves & affirmations",
        "LLM / LoRA",
    ]
    return "\n".join(
        [
            border("Centre d'action", console_action_center_rows(summary), width),
            border("Pilot View", situation, width),
            border("Priorites graphe", console_graph_priority_rows(summary), width),
            border("Graph backend summary", console_graph_summary_rows(summary), width),
            border("Cartes systemes reelles", console_system_maps_v5(summary), width),
            border("Quel audit utiliser ?", console_audit_selector_rows_v8(summary), width),
            border("Outils de controle", console_tool_rows_v5(summary), width),
            border("A faire maintenant", console_decision_rows_v5(summary), width),
            border("Blocages critiques", blocked_rows, width),
            border("Details disponibles", detail_rows, width),
            "",
        ]
    )


def render_html_dashboard(summary: dict[str, Any]) -> str:
    return f"""<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>UXPILOTE - PILOT VIEW</title>
  <style>
    :root {{
      color-scheme: light;
      --ink: #20242a;
      --muted: #5e6875;
      --line: #d5dbe3;
      --panel: #ffffff;
      --bg: #eef1f4;
      --soft: #f8fafc;
      --green: #23754d;
      --blue: #2d648f;
      --amber: #a66b00;
      --orange: #bd5800;
      --red: #aa3030;
      --gray: #6f7782;
      --black: #27313d;
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; background: var(--bg); color: var(--ink); font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.35; letter-spacing: 0; }}
    header, main, footer {{ width: min(1380px, calc(100% - 28px)); margin: 0 auto; }}
    header {{ margin-top: 14px; background: var(--panel); border: 1px solid var(--line); border-top: 8px solid var(--black); border-radius: 8px; padding: 16px; }}
    h1 {{ margin: 0 0 12px; font-size: clamp(30px, 4vw, 54px); line-height: 1; letter-spacing: 0; }}
    h2 {{ margin: 0; font-size: 23px; letter-spacing: 0; }}
    h3 {{ margin: 0; font-size: 16px; letter-spacing: 0; }}
    p {{ margin: 0; }}
    code {{ font-family: Consolas, 'Courier New', monospace; overflow-wrap: anywhere; }}
    main {{ display: grid; gap: 16px; padding: 16px 0 24px; }}
    .header-strip, footer {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)); gap: 8px; }}
    .header-strip div, footer div {{ background: var(--soft); border: 1px solid var(--line); border-radius: 6px; padding: 8px 10px; min-width: 0; }}
    .header-strip span, footer span, .compare-grid span, .tool-card span, .blocked-detail-card span, .decision-compact span, .script-card span {{ display: block; color: var(--muted); font-size: 11px; text-transform: uppercase; font-weight: 800; margin-bottom: 2px; }}
    .header-strip strong, footer strong, .compare-grid strong {{ display: block; overflow-wrap: anywhere; }}
    .panel, .metric-card, .flow-node, .decision-compact, .surface-card, .script-card, .drift-card, .evidence-card, .source-card, .blocker-card, .blocked-detail-card, .tool-card, .proof-grid article, .graph-node-card, .graph-edge-card, .source-gap-card {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(0,0,0,.04);
    }}
    .panel {{ padding: 14px; }}
    .section-head, .tab-title {{ display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--line); }}
    details.panel summary {{ cursor: pointer; list-style-position: inside; font-size: 20px; font-weight: 800; margin-bottom: 12px; }}
    .tabs > input {{ position: absolute; opacity: 0; pointer-events: none; }}
    .tab-labels {{ display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }}
    .tab-labels label {{ border: 1px solid var(--line); background: var(--soft); border-radius: 999px; padding: 8px 12px; font-weight: 900; cursor: pointer; }}
    .tab-panel {{ display: none; border: 1px solid var(--line); background: var(--soft); border-radius: 8px; padding: 12px; }}
    .tab-panel > h3 {{ margin-bottom: 10px; }}
    #tab-commandement:checked ~ .tab-labels label[for="tab-commandement"],
    #tab-flux:checked ~ .tab-labels label[for="tab-flux"],
    #tab-preuves:checked ~ .tab-labels label[for="tab-preuves"],
    #tab-routage:checked ~ .tab-labels label[for="tab-routage"],
    #tab-outils:checked ~ .tab-labels label[for="tab-outils"] {{ background: var(--black); color: #fff; border-color: var(--black); }}
    #tab-commandement:checked ~ .tab-panels .panel-commandement,
    #tab-flux:checked ~ .tab-panels .panel-flux,
    #tab-preuves:checked ~ .tab-panels .panel-preuves,
    #tab-routage:checked ~ .tab-panels .panel-routage,
    #tab-outils:checked ~ .tab-panels .panel-outils {{ display: block; }}
    .map-canvas {{ display: grid; gap: 8px; }}
    .flow-row {{ display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; align-items: stretch; }}
    .flow-row:nth-child(n+3) {{ grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr); }}
    .authority-flow .flow-row {{ grid-template-columns: repeat(11, minmax(0, 1fr)); }}
    .flow-node {{ padding: 12px; min-height: 86px; border-left: 5px solid var(--gray); }}
    .flow-node p {{ color: var(--muted); margin-top: 6px; }}
    .map-arrow {{ display: grid; place-items: center; font-size: 22px; font-weight: 900; color: var(--muted); }}
    .decision-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px; }}
    .decision-compact {{ display: grid; grid-template-columns: 44px 1fr; gap: 10px; padding: 12px; border-left: 7px solid var(--orange); align-items: start; }}
    .decision-compact > strong {{ display: grid; place-items: center; width: 38px; height: 38px; border-radius: 50%; background: var(--orange); color: #fff; font-size: 18px; }}
    .decision-compact p, .blocked-detail-card p, .tool-card p, .script-card p {{ margin-top: 7px; color: var(--ink); overflow-wrap: anywhere; }}
    .chip-row {{ display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }}
    .decision-chip {{ display: inline-block; border: 1px solid var(--line); border-radius: 999px; padding: 4px 7px; background: var(--soft); color: var(--ink); font-size: 11px; font-weight: 800; text-transform: none; }}
    .blockers-grid, .blocked-detail-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(245px, 1fr)); gap: 10px; }}
    .blocked-detail-card {{ padding: 12px; border-left: 7px solid var(--red); background: #fff6f6; }}
    .hero-grid, .surface-grid, .script-grid, .drift-grid, .evidence-grid, .source-grid, .tool-grid, .proof-grid, .graph-summary-grid, .graph-plane-grid, .graph-edge-grid, .source-gap-grid, .priority-grid, .plane-summary-grid {{ display: grid; gap: 12px; }}
    .hero-grid {{ grid-template-columns: repeat(auto-fit, minmax(205px, 1fr)); }}
    .surface-grid {{ grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }}
    .script-grid {{ grid-template-columns: repeat(auto-fit, minmax(255px, 1fr)); }}
    .drift-grid {{ grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }}
    .tool-grid {{ grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }}
    .proof-grid {{ grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }}
    .graph-summary-grid {{ grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); margin-bottom: 12px; }}
    .graph-plane-grid {{ grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); margin-bottom: 14px; }}
    .graph-edge-grid {{ grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }}
    .source-gap-grid {{ grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }}
    .priority-grid {{ grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }}
    .priority-box {{ background: var(--soft); border: 1px solid var(--line); border-radius: 8px; padding: 12px; }}
    .priority-head {{ display: flex; justify-content: space-between; gap: 8px; align-items: start; margin-bottom: 10px; }}
    .priority-list {{ display: grid; gap: 8px; }}
    .priority-card {{ background: #fff; border: 1px solid var(--line); border-left: 7px solid var(--orange); border-radius: 8px; padding: 10px; }}
    .decision-priority-card {{ display: grid; grid-template-columns: 38px 1fr; gap: 10px; }}
    .decision-priority-card > strong {{ display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: var(--orange); color: #fff; }}
    .priority-card p {{ margin-top: 6px; }}
    .priority-card span {{ display: block; color: var(--muted); font-size: 10px; text-transform: uppercase; font-weight: 900; }}
    .compact-priority-grid {{ gap: 8px; }}
    .compact-priority-grid .graph-edge-card, .compact-priority-grid .source-gap-card {{ padding: 10px; }}
    .truth-counter-panel {{ background: var(--soft); border: 1px solid var(--line); border-radius: 8px; padding: 10px; margin-bottom: 12px; }}
    .truth-counter-row {{ display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }}
    .truth-counter {{ display: inline-grid; gap: 2px; border: 1px solid var(--line); border-radius: 8px; padding: 7px 9px; background: #fff; font-weight: 900; min-width: 118px; }}
    .truth-counter strong {{ font-size: 20px; line-height: 1; }}
    .truth-counter em {{ color: var(--muted); font-style: normal; font-size: 11px; }}
    .plane-summary-grid {{ grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); margin-bottom: 12px; }}
    .plane-summary-grid .metric-card {{ min-height: 92px; padding: 10px; }}
    .plane-summary-grid .metric-card strong {{ font-size: 22px; }}
    .graph-detail-block {{ background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 10px; margin-top: 10px; }}
    .graph-detail-block summary {{ cursor: pointer; font-weight: 900; margin-bottom: 8px; }}
    .graph-meta-row {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }}
    .truth-legend {{ display: flex; flex-wrap: wrap; align-items: center; gap: 7px; margin: 0 0 12px; }}
    .truth-legend strong {{ margin-right: 4px; }}
    .truth-chip {{ display: inline-flex; border: 1px solid var(--line); border-radius: 999px; padding: 5px 8px; background: var(--soft); font-size: 12px; font-weight: 900; }}
    .truth-observed {{ border-color: #9fc3aa; color: var(--green); }}
    .truth-tested {{ border-color: #9fc3aa; color: var(--green); }}
    .truth-documented {{ border-color: #9dbed7; color: var(--blue); }}
    .truth-inferred {{ border-color: #d7bd7b; color: var(--amber); }}
    .truth-unknown {{ border-color: #d7bd7b; color: var(--amber); }}
    .truth-blocked {{ border-color: #e8a4a4; color: var(--red); }}
    .compact-tools {{ grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }}
    .audit-selector {{ border-left: 8px solid var(--amber); }}
    .selector-grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }}
    .selector-card {{ background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 11px; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: 8px 12px; align-items: start; }}
    .selector-card span {{ display: block; color: var(--muted); font-size: 10px; text-transform: uppercase; font-weight: 900; }}
    .selector-card strong {{ display: block; font-size: 17px; line-height: 1.15; margin-top: 2px; }}
    .selector-card p {{ grid-column: 1 / -1; color: #41515e; font-size: 13px; }}
    .selector-target {{ display: grid; gap: 5px; justify-items: start; }}
    .selector-badges {{ grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 5px; }}
    .selector-badges span {{ display: inline-flex; border: 1px solid var(--line); background: #fff8eb; color: #6f4a00; border-radius: 999px; padding: 4px 8px; font-size: 10px; letter-spacing: 0; }}
    .action-center {{ border-top: 8px solid var(--orange); }}
    .action-center .section-head p {{ margin-top: 4px; color: var(--muted); font-weight: 800; }}
    .action-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(245px, 1fr)); gap: 10px; }}
    .action-card {{ background: #fff; border: 1px solid var(--line); border-left: 7px solid var(--orange); border-radius: 8px; padding: 12px; display: grid; gap: 8px; align-content: start; }}
    .action-card p {{ margin: 0; overflow-wrap: anywhere; }}
    .action-card span {{ display: block; color: var(--muted); font-size: 10px; text-transform: uppercase; font-weight: 900; }}
    .action-card strong {{ display: block; font-size: 16px; line-height: 1.2; }}
    .tool-tile-grid {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }}
    .tool-tile {{ background: var(--panel); border: 1px solid var(--line); border-left: 8px solid var(--gray); border-radius: 8px; padding: 12px; min-height: 172px; display: grid; gap: 8px; align-content: start; }}
    .tile-head {{ display: flex; align-items: start; justify-content: space-between; gap: 8px; }}
    .tile-head h3 {{ font-size: 21px; line-height: 1.1; }}
    .tile-purpose span, .tile-details span {{ display: block; color: var(--muted); font-size: 10px; text-transform: uppercase; font-weight: 900; margin-bottom: 2px; }}
    .tile-purpose {{ font-size: 15px; font-weight: 800; color: var(--ink); }}
    .tile-badges {{ display: flex; flex-wrap: wrap; gap: 5px; }}
    .mini-badge {{ display: inline-block; border: 1px solid var(--line); border-radius: 999px; padding: 4px 7px; font-size: 11px; font-weight: 900; background: var(--soft); }}
    .risk-badge {{ color: var(--red); border-color: #e8b0b0; background: #fff7f7; }}
    .utility-badge {{ color: var(--blue); border-color: #a8c6dd; background: #f1f7fc; }}
    .reference-badge {{ color: var(--red); border-color: #e8b0b0; background: #fff1f1; }}
    .tile-details {{ border-top: 1px solid var(--line); padding-top: 7px; }}
    .tile-details summary {{ cursor: pointer; color: var(--muted); font-weight: 900; font-size: 12px; }}
    .tile-details p {{ margin-top: 7px; color: var(--ink); overflow-wrap: anywhere; }}
    .tile-verite {{ border-left-color: var(--green); }}
    .tile-routage {{ border-left-color: var(--amber); }}
    .tile-fusion {{ border-left-color: var(--blue); }}
    .tile-humangate {{ border-left-color: var(--orange); }}
    .tile-outils {{ border-left-color: var(--gray); }}
    .tile-inference, .tile-runtime {{ border-left-color: var(--red); }}
    .compact-tool p:first-of-type {{ min-height: 38px; }}
    .metric-card {{ padding: 15px; min-height: 118px; border-top: 5px solid var(--gray); }}
    .metric-card p {{ color: var(--muted); font-weight: 800; }}
    .metric-card strong {{ display: block; font-size: 26px; line-height: 1.08; margin: 10px 0 8px; overflow-wrap: anywhere; }}
    .metric-card span {{ font-weight: 800; }}
    .tone-blocked {{ border-top-color: var(--red); }}
    .tone-unknown {{ border-top-color: var(--amber); }}
    .tone-documented_only, .tone-documented-only {{ border-top-color: var(--blue); }}
    .tone-passive {{ border-top-color: var(--gray); }}
    .tone-implemented, .tone-tested {{ border-top-color: var(--green); }}
    .surface-card, .script-card, .drift-card, .evidence-card, .source-card, .tool-card, .proof-grid article, .graph-node-card, .graph-edge-card, .source-gap-card {{ padding: 12px; }}
    .card-top {{ display: flex; justify-content: space-between; align-items: start; gap: 10px; margin-bottom: 10px; }}
    .mono {{ color: var(--muted); font-family: Consolas, 'Courier New', monospace; margin-top: 8px; overflow-wrap: anywhere; }}
    .explain {{ background: #fff8eb; border: 1px solid #efd29a; border-radius: 8px; padding: 10px; font-weight: 800; margin-bottom: 10px; }}
    .status {{ display: inline-block; border-radius: 999px; padding: 5px 10px; color: #fff; background: var(--gray); font-size: 12px; font-weight: 900; white-space: nowrap; }}
    .implemented {{ background: var(--green); }}
    .tested {{ background: var(--green); }}
    .documented-only {{ background: var(--blue); }}
    .passive {{ background: var(--gray); }}
    .blocked, .blocked-passive {{ background: var(--red); }}
    .unknown {{ background: var(--amber); }}
    .not-found {{ background: #111; }}
    .observed {{ background: var(--green); }}
    .documented {{ background: var(--blue); }}
    .inferred {{ background: var(--amber); }}
    .no-claim-allowed {{ background: var(--red); }}
    .graph-node-card {{ border-left: 6px solid var(--gray); }}
    .graph-edge-card {{ border-left: 6px solid var(--blue); }}
    .graph-edge-card.warning-card {{ border-left-color: var(--red); }}
    .source-gap-card {{ border-left: 6px solid var(--amber); }}
    .source-state-row {{ display: flex; flex-wrap: wrap; gap: 5px; margin: 8px 0; }}
    .graph-node-card span, .graph-edge-card span, .source-gap-card span {{ display: block; color: var(--muted); font-size: 10px; text-transform: uppercase; font-weight: 900; }}
    .script-card {{ border-top: 5px solid var(--gray); }}
    .family-studioctl {{ border-top-color: var(--green); }}
    .family-validators {{ border-top-color: var(--blue); }}
    .family-control-plane, .family-operator, .family-uxpilote, .family-legacy-root-compatibility {{ border-top-color: var(--amber); }}
    .family-blocked-runners {{ border-top-color: var(--red); }}
    dl {{ display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; margin: 0 0 10px; }}
    dt {{ color: var(--muted); }}
    dd {{ margin: 0; font-weight: 800; }}
    .compare-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }}
    .compare-grid div {{ background: var(--soft); border: 1px solid var(--line); border-radius: 6px; padding: 8px; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ border-bottom: 1px solid var(--line); padding: 8px; text-align: left; vertical-align: top; }}
    footer {{ padding-bottom: 26px; }}
    .warning-card {{ border-color: #e49b9b; background: #fff8f8; }}
    .more-card {{ background: #fff8eb; border-style: dashed; }}
    @media (max-width: 1040px) {{
      .flow-row, .flow-row:nth-child(n+3), .authority-flow .flow-row, .compare-grid {{ grid-template-columns: 1fr; }}
      .selector-grid {{ grid-template-columns: 1fr; }}
      .priority-grid {{ grid-template-columns: 1fr; }}
      .tool-tile-grid {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }}
      .map-arrow {{ transform: rotate(90deg); min-height: 26px; }}
    }}
    @media (max-width: 760px) {{
      header, main, footer {{ width: min(100% - 18px, 1380px); }}
      .section-head, .tab-title {{ display: block; }}
      .selector-card {{ grid-template-columns: 1fr; }}
      .tool-tile-grid {{ grid-template-columns: 1fr; }}
      .decision-compact {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>
  <header>
    <h1>UXPILOTE - PILOT VIEW</h1>
    <div class="header-strip">
      {html_kv("branch", summary.get("branch", INCONNU))}
      {html_kv("HEAD", short_head(summary))}
      {html_kv("worktree status", summary.get("worktree_status", INCONNU))}
      {html_kv("claim posture", summary.get("claim_posture", INCONNU))}
      {html_kv("candidate-only", True)}
      {html_kv("read_only: true", "")}
      {html_kv("no_global_ready_verdict: true", "")}
    </div>
  </header>
  <main>
    {render_html_failure_card(summary)}
    {html_action_center(summary)}
    {html_graph_priorities(summary)}
    {html_graph_summary(summary)}
    {html_system_tabs_v5(summary)}
    {html_audit_selector_guide(summary)}
    {html_compact_tool_strip_v5(summary)}
    <section class="panel">
      <div class="section-head"><h2>A faire maintenant</h2>{html_badge("UNKNOWN", "decision requise")}</div>
      <div class="decision-grid">{html_decision_cards_v5(summary)}</div>
    </section>
    <section class="panel warning-card">
      <div class="section-head"><h2>Commandes bloquees / Blocages critiques</h2>{html_badge("BLOCKED")}</div>
      <div class="blocked-detail-grid">{html_blocked_action_detail_cards(summary)}</div>
    </section>
    {html_blocked_graph_edges(summary)}
    {html_unknown_unsafe_graph_edges(summary)}
    <section class="hero-grid">{html_situation_cards(summary)}</section>
    {html_graph_humangate_questions(summary)}
    {html_source_state_gaps(summary)}
    <details class="panel">
      <summary>Familles du systeme</summary>
      <div class="surface-grid">{html_system_family_cards(summary)}</div>
    </details>
    <details class="panel">
      <summary>Scripts Control detaille</summary>
      <div class="script-grid">{html_script_cards_v5(summary)}</div>
    </details>
    <details class="panel">
      <summary>Chemins casses / chemins candidats</summary>
      <p class="explain">Certains documents ou CI pointent vers d'anciens chemins. Cette vue compare l'ancien chemin, le chemin candidat, et la decision HumanGate requise.</p>
      <div class="drift-grid">{html_path_drift_cards(summary)}</div>
    </details>
    <details class="panel">
      <summary>Preuves & affirmations</summary>
      {html_evidence_claims_v4(summary)}
    </details>
    <details class="panel">
      <summary>LLM / LoRA</summary>
      {html_status_table(["surface", "status"], [["Entrainement", "BLOCKED"], ["Dataset generation/reset", "BLOCKED"], ["Checkpoints/model promotion", "BLOCKED"], ["Support LLM", "PASSIVE"]], 1)}
    </details>
  </main>
  <footer>
    {html_kv("runtime_authority: NONE", "")}
    {html_kv("writes_files: false", "except explicit --export-html target")}
    {html_kv("claim_verdict", CLAIM_POSTURE)}
    {html_kv("no_global_ready_verdict: true", "")}
    <div><span>boundary</span><strong>candidate-only | NO_CLAIM_ALLOWED | read_only: true | writes_files: false | runtime_authority: NONE</strong></div>
  </footer>
</body>
</html>
"""


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Local read-only UxPilote console cockpit.")
    parser.add_argument("--once", action="store_true", help="Render the selected cockpit view once and exit.")
    parser.add_argument("--json-summary", action="store_true", help="Print the cockpit summary as JSON to stdout.")
    parser.add_argument("--no-color", action="store_true", help="Accepted for terminal compatibility; output is plain text.")
    parser.add_argument(
        "--view",
        choices=("cockpit", "scripts", "decisions", "evidence"),
        default="cockpit",
        help="Console view to render. Default: cockpit.",
    )
    parser.add_argument("--width", type=int, default=DEFAULT_WIDTH, help="Render width. Default: 120; designed for 100-140.")
    parser.add_argument("--export-html", metavar="PATH", help="Write one static read-only HTML dashboard to PATH.")
    parser.add_argument("--lang", choices=("fr", "en"), default="fr", help="UI language label set. Default: fr.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.once and not args.json_summary and not args.export_html:
        args.once = True

    results = run_all_sources()
    summary = build_summary(results)
    summary["selected_view"] = args.view
    summary["render_width"] = clamp_width(args.width)
    summary["lang"] = args.lang
    failed = [row for row in summary["studioctl_commands"] if row["error"]]

    if args.json_summary:
        sys.stdout.write(json.dumps(summary, indent=2, sort_keys=True) + "\n")
    if args.export_html:
        export_path = Path(args.export_html)
        export_path.write_text(render_html_dashboard(summary), encoding="utf-8")
        sys.stdout.write(f"export_html: {export_path}\n")
    if args.once:
        sys.stdout.write(render_view(summary, args.view, args.width))

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
