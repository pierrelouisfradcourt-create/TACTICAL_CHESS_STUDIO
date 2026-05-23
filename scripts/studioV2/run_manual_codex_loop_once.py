import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


SCHEMA_VERSION = "manual_codex_loop_once.pr30"
PYTHON_EXE = ".\\.venv312\\Scripts\\python.exe"
READY_STATUS = "READY_FOR_MANUAL_NON_CANONICAL_CODEX_LOOP"
EXECUTION_PACKET_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr18_codex_execution_packet/codex_execution_packet.pr18.json"
)
PROMPT_PACK_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr17_codex_prompt_pack/codex_prompt_pack.pr17.json"
)
GAMEPLAY_OBSERVATION_DIR = Path("lab/gameplay_observation")
KNOWN_TRACKED_NOISE = {"lab/reports/latest_benchmark_summary.json"}
SANDBOX_OUTPUT_PREFIX = "lab/gameplay_observation/sandbox_outputs/"
PROMPT_PREVIEW_LIMIT = 800
PROMPT_LIST_KEYS = ("prompts", "prompt_pack", "items", "tasks")
PROMPT_ID_KEYS = ("prompt_id", "id", "source_prompt_id")
PROMPT_ID_PATTERN = re.compile(r"pr17_prompt_[A-Za-z0-9_]+")
SOURCE_PROMPT_ID_PATTERN = re.compile(
    r"source_prompt_id\s*[:=]\s*`?([A-Za-z0-9_.:-]+)`?",
    re.IGNORECASE,
)
LEGACY_EXECUTED_PROMPT_IDS = {
    "pr17_prompt_001_pr14_pos_001_quiet_development",
}


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run one local non-canonical Codex-loop preparation chain."
    )
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument("--index", type=int, help="0-based prompt index to prepare.")
    selection.add_argument("--next", action="store_true", help="Prepare the first unexecuted prompt.")
    parser.add_argument(
        "--include-extra-noncanonical-positions",
        action="store_true",
        help=(
            "When regenerating the task queue, append lower-priority non-canonical triage "
            "positions after the default prompt set."
        ),
    )
    parser.add_argument("--output", help="Optional JSON output path.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args(argv)


def normalize_path(path: str) -> str:
    normalized = path.strip().replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized


def command_summary(command: list[str], completed: subprocess.CompletedProcess[str]) -> dict[str, Any]:
    return {
        "command": command,
        "returncode": completed.returncode,
        "stdout_tail": completed.stdout[-4000:],
        "stderr_tail": completed.stderr[-4000:],
    }


def run_command(command: list[str]) -> dict[str, Any]:
    completed = subprocess.run(
        command,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return command_summary(command, completed)


def parse_json_object(output: str) -> dict[str, Any] | None:
    trimmed = output.strip()
    if not trimmed:
        return None
    try:
        parsed = json.loads(trimmed)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        start = trimmed.find("{")
        end = trimmed.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None
        try:
            parsed = json.loads(trimmed[start : end + 1])
        except json.JSONDecodeError:
            return None
        return parsed if isinstance(parsed, dict) else None


def load_json_object(path: Path) -> tuple[dict[str, Any] | None, str | None]:
    try:
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except Exception as exc:
        return None, str(exc)
    if not isinstance(payload, dict):
        return None, "JSON payload must be an object"
    return payload, None


def run_required(
    command: list[str],
    commands_run: list[list[str]],
    command_results: list[dict[str, Any]],
) -> dict[str, Any]:
    result = run_command(command)
    commands_run.append(command)
    command_results.append(result)
    return result


def append_command_result(
    result: dict[str, Any],
    commands_run: list[list[str]],
    command_results: list[dict[str, Any]],
) -> None:
    commands_run.append(result["command"])
    command_results.append(result)


def git_stdout(args: list[str]) -> tuple[str, dict[str, Any]]:
    result = run_command(["git", *args])
    stdout = result["stdout_tail"]
    return stdout, result


def first_prompt_id(item: dict[str, Any]) -> str | None:
    for key in PROMPT_ID_KEYS:
        value = item.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def prompt_items_from_value(value: Any) -> list[dict[str, Any]] | None:
    if isinstance(value, list):
        if not all(isinstance(item, dict) for item in value):
            return None
        return value
    if isinstance(value, dict):
        return extract_prompt_items(value)
    return None


def extract_prompt_items(payload: dict[str, Any]) -> list[dict[str, Any]] | None:
    for key in PROMPT_LIST_KEYS:
        if key not in payload:
            continue
        items = prompt_items_from_value(payload[key])
        if items is not None:
            return items
    return None


def candidate_prompt_ids_from_pack(payload: dict[str, Any]) -> tuple[list[str] | None, str | None]:
    prompt_items = extract_prompt_items(payload)
    if prompt_items is None:
        return None, f"prompt pack must include one prompt list key: {', '.join(PROMPT_LIST_KEYS)}"
    if not prompt_items:
        return None, "prompt pack contains no prompt items"

    candidate_prompt_ids: list[str] = []
    for index, item in enumerate(prompt_items):
        prompt_id = first_prompt_id(item)
        if prompt_id is None:
            return None, f"prompt item at index {index} has no id-like field"
        candidate_prompt_ids.append(prompt_id)
    return candidate_prompt_ids, None


def manual_report_paths(
    commands_run: list[list[str]],
    command_results: list[dict[str, Any]],
) -> list[Path]:
    result = run_command(["git", "ls-files", normalize_path(str(GAMEPLAY_OBSERVATION_DIR))])
    append_command_result(result, commands_run, command_results)
    if result["returncode"] != 0:
        return []

    paths: list[Path] = []
    for raw_path in result["stdout_tail"].splitlines():
        normalized = normalize_path(raw_path)
        if not normalized or normalized.startswith(SANDBOX_OUTPUT_PREFIX):
            continue
        path = Path(normalized)
        if path.suffix.lower() not in {".md", ".json"}:
            continue
        if "MANUAL_CODEX_LOOP" in path.name.upper():
            paths.append(path)
    return paths


def collect_executed_prompt_ids(
    commands_run: list[list[str]],
    command_results: list[dict[str, Any]],
) -> list[str]:
    executed: set[str] = set()
    for path in manual_report_paths(commands_run, command_results):
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        if "source_prompt_id" not in text and "pr17_prompt_" not in text:
            continue
        executed.update(match.group(1) for match in SOURCE_PROMPT_ID_PATTERN.finditer(text))
        executed.update(match.group(0) for match in PROMPT_ID_PATTERN.finditer(text))
    return sorted(executed)


def select_next_prompt_index(
    candidate_prompt_ids: list[str],
    executed_prompt_ids: list[str],
) -> tuple[int | None, str]:
    executed = set(executed_prompt_ids)
    for index, prompt_id in enumerate(candidate_prompt_ids):
        if prompt_id not in executed:
            return index, f"Selected first prompt-pack id not found in committed manual loop reports: {prompt_id}"
    return None, "All prompt-pack ids were found in committed manual loop reports."


def parse_status_paths(status_stdout: str) -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []
    for line in status_stdout.splitlines():
        if len(line) < 4:
            continue
        status = line[:2]
        path = line[3:].strip()
        if " -> " in path:
            _, path = path.split(" -> ", 1)
        path = normalize_path(path)
        if not path:
            continue
        entries.append({"status": status, "path": path})
    return entries


def collect_git_state(
    commands_run: list[list[str]],
    command_results: list[dict[str, Any]],
) -> tuple[list[str], list[dict[str, str]], list[dict[str, str]]]:
    diff_stdout, diff_result = git_stdout(["diff", "--name-only", "origin/main...HEAD"])
    status_stdout, status_result = git_stdout(["status", "--porcelain"])
    commands_run.extend([diff_result["command"], status_result["command"]])
    command_results.extend([diff_result, status_result])

    status_entries = parse_status_paths(status_stdout)
    changed_files = {normalize_path(path) for path in diff_stdout.splitlines() if path.strip()}
    changed_files.update(entry["path"] for entry in status_entries)
    local_tracked_noise = [
        {
            "path": entry["path"],
            "status": entry["status"],
            "category": "LOCAL_TRACKED_NOISE_PRESENT",
        }
        for entry in status_entries
        if entry["path"] in KNOWN_TRACKED_NOISE and entry["status"] != "??"
    ]
    sandbox_output_noise = [
        {
            "path": entry["path"],
            "status": entry["status"],
            "category": "SANDBOX_OUTPUT_NOISE",
        }
        for entry in status_entries
        if entry["path"].startswith(SANDBOX_OUTPUT_PREFIX)
    ]
    return sorted(changed_files), sorted(local_tracked_noise, key=lambda item: item["path"]), sorted(
        sandbox_output_noise, key=lambda item: item["path"]
    )


def prompt_preview(packet: dict[str, Any]) -> dict[str, Any]:
    prompt_body = packet.get("prompt_body")
    if isinstance(prompt_body, str):
        preview = prompt_body[:PROMPT_PREVIEW_LIMIT]
        if len(prompt_body) > PROMPT_PREVIEW_LIMIT:
            preview += "...<truncated>"
        return {
            "prompt_body_preview": preview,
            "prompt_body_path": None,
        }
    prompt_path = packet.get("prompt_body_path")
    return {
        "prompt_body_preview": None,
        "prompt_body_path": prompt_path if isinstance(prompt_path, str) else None,
    }


def load_execution_packet(path: Path) -> tuple[dict[str, Any], str | None]:
    try:
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except Exception as exc:
        return {}, str(exc)
    if not isinstance(payload, dict):
        return {}, "execution packet must be a JSON object"
    return payload, None


def base_report(index: int | None, selection_mode: str) -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "index": index,
        "selection_mode": selection_mode,
        "selected_index": index,
        "executed_prompt_ids": [],
        "candidate_prompt_ids": [],
        "next_selection_reason": (
            "Explicit --index requested."
            if selection_mode == "INDEX"
            else "Pending prompt-pack generation."
        ),
        "execution_packet_path": normalize_path(str(EXECUTION_PACKET_PATH)),
        "source_prompt_id": None,
        "source_task_id": None,
        "commands_run": [],
        "command_results": [],
        "automation_status": None,
        "changed_files": [],
        "local_tracked_noise": [],
        "sandbox_output_noise": [],
        "skipped_validation_and_reason": "",
        "behavior_risk": (
            "Low: local preparation only; selected prompt body is not executed and Codex is not called."
        ),
        "evidence_risk": "Low: outputs are non-canonical sandbox orchestration reports only.",
        "claim_risk": "Low: claim_verdict remains NO_CLAIM_ALLOWED.",
        "software_verdict": "BLOCKED",
        "evidence_verdict": "NON_CANONICAL_ORCHESTRATION_ONLY",
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "human_review_required": True,
        "next_human_action": "",
        "include_extra_noncanonical_positions": False,
    }


def write_output(path_text: str, payload: dict[str, Any], pretty: bool) -> None:
    path = Path(path_text)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2 if pretty else None, sort_keys=True) + "\n", encoding="utf-8")


def finalize(
    report: dict[str, Any],
    pretty: bool,
    output: str | None,
    exit_code: int,
) -> int:
    commands_run = report["commands_run"]
    command_results = report["command_results"]
    changed_files, local_tracked_noise, sandbox_output_noise = collect_git_state(
        commands_run,
        command_results,
    )
    report["changed_files"] = changed_files
    report["local_tracked_noise"] = local_tracked_noise
    report["sandbox_output_noise"] = sandbox_output_noise

    rendered = json.dumps(report, indent=2 if pretty else None, sort_keys=True)
    if output:
        write_output(output, report, pretty)
    print(rendered)
    return exit_code


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    selection_mode = "NEXT" if args.next else "INDEX"
    report = base_report(args.index, selection_mode)
    report["include_extra_noncanonical_positions"] = args.include_extra_noncanonical_positions
    commands_run: list[list[str]] = report["commands_run"]
    command_results: list[dict[str, Any]] = report["command_results"]

    required_commands = [
        [PYTHON_EXE, "scripts/run_local_agent_verify.py", "--pretty"],
        [PYTHON_EXE, "scripts/check_workspace_hygiene.py", "--pretty"],
        [PYTHON_EXE, "scripts/run_codex_orchestration_smoke.py", "--pretty"],
        [
            PYTHON_EXE,
            "scripts/report_codex_automation_status.py",
            "--smoke-report",
            "lab/gameplay_observation/sandbox_outputs/pr20_orchestration_smoke/orchestration_smoke.pr20.json",
            "--pretty",
        ],
    ]

    for command in required_commands:
        result = run_required(command, commands_run, command_results)
        if result["returncode"] != 0:
            report["software_verdict"] = "BLOCKED_REQUIRED_COMMAND_FAILED"
            report["skipped_validation_and_reason"] = f"Stopped after required command failed: {' '.join(command)}"
            report["next_human_action"] = "Inspect the failed command output before preparing a Codex loop packet."
            return finalize(report, args.pretty, args.output, 1)

    automation_status = parse_json_object(command_results[-1]["stdout_tail"])
    report["automation_status"] = automation_status
    if not automation_status or automation_status.get("overall_status") != READY_STATUS:
        report["software_verdict"] = "BLOCKED_AUTOMATION_STATUS_NOT_READY"
        report["skipped_validation_and_reason"] = (
            f"Required automation overall_status={READY_STATUS}; got "
            f"{automation_status.get('overall_status') if automation_status else 'UNREADABLE_STATUS'}."
        )
        report["next_human_action"] = "Repair blocked or missing automation scaffold before preparing a loop packet."
        return finalize(report, args.pretty, args.output, 1)

    packet_commands = [
        [
            PYTHON_EXE,
            "scripts/generate_codex_task_queue.py",
            "--triage-report",
            "lab/gameplay_observation/sandbox_outputs/pr15_triage/triage_report.pr15.json",
            *(
                ["--include-extra-noncanonical-positions"]
                if args.include_extra_noncanonical_positions
                else []
            ),
            "--pretty",
        ],
        [
            PYTHON_EXE,
            "scripts/generate_codex_prompt_pack.py",
            "--queue",
            "lab/gameplay_observation/sandbox_outputs/pr16_codex_task_queue/codex_task_queue.pr16.json",
            "--pretty",
        ],
    ]

    for command in packet_commands:
        result = run_required(command, commands_run, command_results)
        if result["returncode"] != 0:
            report["software_verdict"] = "BLOCKED_REQUIRED_COMMAND_FAILED"
            report["skipped_validation_and_reason"] = f"Stopped after required command failed: {' '.join(command)}"
            report["next_human_action"] = "Inspect the failed command output before using a Codex loop packet."
            return finalize(report, args.pretty, args.output, 1)

    selected_index = args.index
    if args.next:
        prompt_pack, prompt_pack_error = load_json_object(PROMPT_PACK_PATH)
        if prompt_pack_error is not None or prompt_pack is None:
            report["software_verdict"] = "BLOCKED_PROMPT_PACK_UNREADABLE"
            report["skipped_validation_and_reason"] = prompt_pack_error or "prompt pack unreadable"
            report["next_human_action"] = "Repair prompt-pack generation before selecting the next loop."
            return finalize(report, args.pretty, args.output, 1)

        candidate_prompt_ids, candidate_error = candidate_prompt_ids_from_pack(prompt_pack)
        if candidate_error is not None or candidate_prompt_ids is None:
            report["software_verdict"] = "BLOCKED_PROMPT_PACK_UNREADABLE"
            report["skipped_validation_and_reason"] = candidate_error or "prompt pack unreadable"
            report["next_human_action"] = "Repair prompt-pack schema before selecting the next loop."
            return finalize(report, args.pretty, args.output, 1)

        executed_prompt_ids = sorted(
            set(collect_executed_prompt_ids(commands_run, command_results))
            | LEGACY_EXECUTED_PROMPT_IDS
        )
        selected_index, selection_reason = select_next_prompt_index(
            candidate_prompt_ids,
            executed_prompt_ids,
        )
        report["candidate_prompt_ids"] = candidate_prompt_ids
        report["executed_prompt_ids"] = executed_prompt_ids
        report["next_selection_reason"] = selection_reason
        report["selected_index"] = selected_index
        report["index"] = selected_index
        if selected_index is None:
            report["software_verdict"] = "BLOCKED_NO_UNEXECUTED_PROMPTS"
            report["skipped_validation_and_reason"] = selection_reason
            report["next_human_action"] = "Add or regenerate a prompt pack with an unexecuted prompt id."
            return finalize(report, args.pretty, args.output, 1)

    if selected_index is None:
        report["software_verdict"] = "BLOCKED_PROMPT_PACK_UNREADABLE"
        report["skipped_validation_and_reason"] = "No selected prompt index was available."
        report["next_human_action"] = "Provide --index or use --next with a readable prompt pack."
        return finalize(report, args.pretty, args.output, 1)

    execution_command = [
        PYTHON_EXE,
        "scripts/prepare_codex_execution_packet.py",
        "--prompt-pack",
        normalize_path(str(PROMPT_PACK_PATH)),
        "--index",
        str(selected_index),
        "--pretty",
    ]

    result = run_required(execution_command, commands_run, command_results)
    if result["returncode"] != 0:
        report["software_verdict"] = "BLOCKED_REQUIRED_COMMAND_FAILED"
        report["skipped_validation_and_reason"] = (
            f"Stopped after required command failed: {' '.join(execution_command)}"
        )
        report["next_human_action"] = "Inspect the failed command output before using a Codex loop packet."
        return finalize(report, args.pretty, args.output, 1)

    packet, packet_error = load_execution_packet(EXECUTION_PACKET_PATH)
    if packet_error is not None:
        report["software_verdict"] = "BLOCKED_EXECUTION_PACKET_UNREADABLE"
        report["skipped_validation_and_reason"] = packet_error
        report["next_human_action"] = "Repair execution packet generation before manual Codex loop use."
        return finalize(report, args.pretty, args.output, 1)

    report["source_prompt_id"] = packet.get("selected_prompt_id")
    report["source_task_id"] = packet.get("selected_source_task_id")
    report.update(prompt_preview(packet))
    report["software_verdict"] = "MANUAL_CODEX_LOOP_PACKET_READY"
    report["evidence_verdict"] = "NON_CANONICAL_ORCHESTRATION_ONLY"
    report["skipped_validation_and_reason"] = (
        "Selected prompt body was intentionally not executed; Codex was not called recursively."
    )
    report["next_human_action"] = (
        "Paste the selected execution packet prompt into Codex Code mode for bounded implementation."
    )
    return finalize(report, args.pretty, args.output, 0)


if __name__ == "__main__":
    raise SystemExit(main())
