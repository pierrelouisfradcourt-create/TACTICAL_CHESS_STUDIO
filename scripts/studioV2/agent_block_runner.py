import argparse
import datetime as dt
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


DEFAULT_OUTPUT_DIR = Path("lab/agent_runs/operator_latest")
DEFAULT_STOP_ON_FAIL = True
SAFE_MODES = {"inspect", "validate-staged", "dry-run"}
EXECUTION_MODE_MAP = {
    "inspect": "inspect",
    "validate-staged": "validate-staged",
    "dry-run": "inspect",
}
DEFAULT_TASK_GATES = [
    "workspace_clean_before",
    "task_packet_exists",
    "mode_allowed",
    "no_ready",
    "no_merge",
    "no_deploy",
    "no_training",
    "no_benchmark_claim",
    "scope_allowed",
    "validation_passed",
    "workspace_clean_after",
]


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sequential block runner for local PR operator task manifests.")
    parser.add_argument("--block-manifest", required=True, help="Path to block manifest JSON.")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Output dir for block report.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output summary.")
    return parser.parse_args(argv)


def normalize_path(path: str) -> str:
    normalized = path.strip().replace("\\", "/")
    while normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def run_command(command: list[str]) -> dict[str, Any]:
    completed = subprocess.run(
        command,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return {
        "command": command,
        "returncode": completed.returncode,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
    }


def python_executable() -> str:
    executable = sys.executable.strip() if isinstance(sys.executable, str) else ""
    return executable or "python"


def git_status_porcelain() -> tuple[list[str], str | None]:
    result = run_command(["git", "status", "--porcelain"])
    if int(result["returncode"]) != 0:
        message = str(result.get("stderr", "")).strip() or "unknown error"
        return [], f"GIT_STATUS_FAILED: {message}"
    lines = [line.rstrip("\n") for line in str(result.get("stdout", "")).splitlines() if line.strip()]
    return lines, None


def load_json(path: Path) -> tuple[Any | None, str | None]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None, f"MISSING_JSON_FILE: {normalize_path(str(path))}"
    except json.JSONDecodeError as exc:
        return None, f"INVALID_JSON: {normalize_path(str(path))}: {exc}"
    except OSError as exc:
        return None, f"JSON_READ_FAILED: {normalize_path(str(path))}: {exc}"
    return payload, None


def bool_value(payload: dict[str, Any], key: str, default: bool) -> bool:
    value = payload.get(key, default)
    if isinstance(value, bool):
        return value
    return default


def blocked_manifest_response(
    manifest: dict[str, Any] | None,
    errors: list[str],
    started_at: str,
    completed_at: str,
) -> dict[str, Any]:
    block_id = "unknown_block"
    stop_on_fail = DEFAULT_STOP_ON_FAIL
    allow_ready = False
    allow_merge = False
    if isinstance(manifest, dict):
        block_id = str(manifest.get("block_id", block_id))
        stop_on_fail = bool_value(manifest, "stop_on_fail", DEFAULT_STOP_ON_FAIL)
        allow_ready = bool_value(manifest, "allow_ready", False)
        allow_merge = bool_value(manifest, "allow_merge", False)
    return {
        "schema_version": "1.0",
        "block_id": block_id,
        "started_at": started_at,
        "completed_at": completed_at,
        "status": "BLOCKED",
        "stop_on_fail": stop_on_fail,
        "allow_ready": allow_ready,
        "allow_merge": allow_merge,
        "tasks_total": 0,
        "tasks_passed": 0,
        "tasks_failed": 0,
        "stopped_at_task_id": None,
        "blocked_reasons": sorted(set(errors)),
        "task_results": [],
        "verdicts": {
            "software_verdict": "CONTROL_PLANE_TOOLING_ONLY",
            "evidence_verdict": "LOCAL_BLOCK_RUNNER_DRY_RUN_VALIDATION_ONLY",
            "claim_verdict": "NO_CLAIM_ALLOWED",
        },
    }


def validate_manifest_shape(manifest: Any) -> tuple[dict[str, Any], list[str]]:
    errors: list[str] = []
    if not isinstance(manifest, dict):
        return {}, ["BLOCK_MANIFEST_NOT_OBJECT"]

    required_fields = ["schema_version", "block_id", "tasks"]
    for field in required_fields:
        if field not in manifest:
            errors.append(f"BLOCK_MANIFEST_MISSING_FIELD: {field}")

    schema_version = manifest.get("schema_version")
    if not isinstance(schema_version, str) or not schema_version.strip():
        errors.append("BLOCK_MANIFEST_INVALID_SCHEMA_VERSION")

    block_id = manifest.get("block_id")
    if not isinstance(block_id, str) or not block_id.strip():
        errors.append("BLOCK_MANIFEST_INVALID_BLOCK_ID")

    tasks = manifest.get("tasks")
    if not isinstance(tasks, list) or not tasks:
        errors.append("BLOCK_MANIFEST_INVALID_TASKS")

    stop_on_fail = bool_value(manifest, "stop_on_fail", DEFAULT_STOP_ON_FAIL)
    if stop_on_fail is not True:
        errors.append("BLOCK_MANIFEST_STOP_ON_FAIL_MUST_BE_TRUE")

    allow_ready = bool_value(manifest, "allow_ready", False)
    allow_merge = bool_value(manifest, "allow_merge", False)
    allow_push = bool_value(manifest, "allow_push", False)
    allow_create_pr = bool_value(manifest, "allow_create_pr", False)
    allow_commit = bool_value(manifest, "allow_commit", False)

    if allow_ready:
        errors.append("BLOCK_MANIFEST_ALLOW_READY_TRUE_FORBIDDEN")
    if allow_merge:
        errors.append("BLOCK_MANIFEST_ALLOW_MERGE_TRUE_FORBIDDEN")
    if allow_push:
        errors.append("BLOCK_MANIFEST_ALLOW_PUSH_TRUE_UNSUPPORTED")
    if allow_create_pr:
        errors.append("BLOCK_MANIFEST_ALLOW_CREATE_PR_TRUE_UNSUPPORTED")
    if allow_commit:
        errors.append("BLOCK_MANIFEST_ALLOW_COMMIT_TRUE_UNSUPPORTED")

    default_mode = manifest.get("default_mode", "dry-run")
    if not isinstance(default_mode, str) or default_mode not in SAFE_MODES:
        errors.append("BLOCK_MANIFEST_INVALID_DEFAULT_MODE")

    validated = {
        "schema_version": str(schema_version) if isinstance(schema_version, str) else "1.0",
        "block_id": str(block_id) if isinstance(block_id, str) else "unknown_block",
        "description": str(manifest.get("description", "")),
        "created_by": str(manifest.get("created_by", "")),
        "default_mode": default_mode if isinstance(default_mode, str) else "dry-run",
        "stop_on_fail": stop_on_fail,
        "allow_commit": allow_commit,
        "allow_push": allow_push,
        "allow_create_pr": allow_create_pr,
        "allow_ready": allow_ready,
        "allow_merge": allow_merge,
        "tasks": tasks if isinstance(tasks, list) else [],
    }
    return validated, sorted(set(errors))


def parse_task(task: Any, default_mode: str) -> tuple[dict[str, Any], list[str]]:
    errors: list[str] = []
    if not isinstance(task, dict):
        return {}, ["BLOCK_TASK_NOT_OBJECT"]

    for field in ["task_id", "task_packet"]:
        if field not in task:
            errors.append(f"BLOCK_TASK_MISSING_FIELD: {field}")

    task_id = task.get("task_id")
    if not isinstance(task_id, str) or not task_id.strip():
        errors.append("BLOCK_TASK_INVALID_TASK_ID")

    task_packet = task.get("task_packet")
    if not isinstance(task_packet, str) or not task_packet.strip():
        errors.append("BLOCK_TASK_INVALID_TASK_PACKET")

    mode = task.get("mode", default_mode)
    if not isinstance(mode, str) or mode not in SAFE_MODES:
        errors.append("BLOCK_TASK_INVALID_MODE")

    required_gates = task.get("required_gates", DEFAULT_TASK_GATES)
    if not isinstance(required_gates, list) or not all(isinstance(gate, str) and gate.strip() for gate in required_gates):
        errors.append("BLOCK_TASK_INVALID_REQUIRED_GATES")
        required_gates = list(DEFAULT_TASK_GATES)

    merged_gates: list[str] = []
    for gate in DEFAULT_TASK_GATES:
        if gate not in merged_gates:
            merged_gates.append(gate)
    for gate in required_gates:
        if gate not in merged_gates:
            merged_gates.append(gate)

    parsed = {
        "task_id": str(task_id) if isinstance(task_id, str) else "unknown_task",
        "title": str(task.get("title", "")),
        "task_packet": str(task_packet) if isinstance(task_packet, str) else "",
        "mode": mode if isinstance(mode, str) else default_mode,
        "required_gates": merged_gates,
    }
    return parsed, sorted(set(errors))


def parse_operator_output(stdout: str) -> dict[str, Any]:
    text = stdout.strip()
    if not text:
        return {}
    try:
        payload = json.loads(text)
        if isinstance(payload, dict):
            return payload
    except json.JSONDecodeError:
        return {}
    return {}


def gate_result(name: str, status: str, detail: str) -> dict[str, Any]:
    return {
        "name": name,
        "status": status,
        "detail": detail,
    }


def evaluate_no_action_gates(task_packet_payload: dict[str, Any]) -> list[dict[str, Any]]:
    gates: list[dict[str, Any]] = []

    authorize_ready_pr = task_packet_payload.get("authorize_ready_pr")
    request_ready_pr = task_packet_payload.get("request_ready_pr")
    no_ready_ok = authorize_ready_pr is False and request_ready_pr is not True
    gates.append(
        gate_result(
            "no_ready",
            "PASS" if no_ready_ok else "FAIL",
            "task packet keeps ready actions disabled" if no_ready_ok else "ready action requested or authorized",
        )
    )

    authorize_merge_pr = task_packet_payload.get("authorize_merge_pr")
    request_merge = task_packet_payload.get("request_merge")
    no_merge_ok = authorize_merge_pr is False and request_merge is not True
    gates.append(
        gate_result(
            "no_merge",
            "PASS" if no_merge_ok else "FAIL",
            "task packet keeps merge actions disabled" if no_merge_ok else "merge action requested or authorized",
        )
    )

    objective = str(task_packet_payload.get("objective", "")).lower()
    required_checks = task_packet_payload.get("required_checks", [])
    if not isinstance(required_checks, list):
        required_checks = []
    checks_text = " ".join(str(item).lower() for item in required_checks)

    no_deploy_ok = "deploy" not in objective and "deploy" not in checks_text and task_packet_payload.get("request_deploy") is not True
    gates.append(
        gate_result(
            "no_deploy",
            "PASS" if no_deploy_ok else "FAIL",
            "no deploy intent detected" if no_deploy_ok else "deploy intent detected in task packet",
        )
    )

    no_training_ok = "train" not in objective and "training" not in objective and "train" not in checks_text
    gates.append(
        gate_result(
            "no_training",
            "PASS" if no_training_ok else "FAIL",
            "no training intent detected" if no_training_ok else "training intent detected in task packet",
        )
    )

    no_benchmark_ok = "benchmark" not in objective and "benchmark" not in checks_text and "elo" not in checks_text
    gates.append(
        gate_result(
            "no_benchmark_claim",
            "PASS" if no_benchmark_ok else "FAIL",
            "no benchmark claim intent detected" if no_benchmark_ok else "benchmark claim intent detected in task packet",
        )
    )
    return gates


def run_task(task: dict[str, Any]) -> dict[str, Any]:
    task_id = task["task_id"]
    task_packet_rel = task["task_packet"]
    task_mode = task["mode"]
    required_gates = list(task.get("required_gates", DEFAULT_TASK_GATES))
    task_packet_path = Path(task_packet_rel)
    gates: list[dict[str, Any]] = []

    status_before, status_error = git_status_porcelain()
    if status_error:
        gates.append(gate_result("workspace_clean_before", "FAIL", status_error))
        return {
            "task_id": task_id,
            "mode": task_mode,
            "task_packet": normalize_path(task_packet_rel),
            "status": "FAIL",
            "gates": gates,
            "operator_command": [],
            "operator_returncode": None,
        }
    if status_before:
        gates.append(gate_result("workspace_clean_before", "FAIL", f"workspace dirty before task: {status_before}"))
        return {
            "task_id": task_id,
            "mode": task_mode,
            "task_packet": normalize_path(task_packet_rel),
            "status": "FAIL",
            "gates": gates,
            "operator_command": [],
            "operator_returncode": None,
        }
    gates.append(gate_result("workspace_clean_before", "PASS", "workspace clean before task"))

    if not task_packet_path.exists():
        gates.append(gate_result("task_packet_exists", "FAIL", f"missing task packet: {normalize_path(task_packet_rel)}"))
        return {
            "task_id": task_id,
            "mode": task_mode,
            "task_packet": normalize_path(task_packet_rel),
            "status": "FAIL",
            "gates": gates,
            "operator_command": [],
            "operator_returncode": None,
        }
    gates.append(gate_result("task_packet_exists", "PASS", "task packet file exists"))

    if task_mode not in SAFE_MODES:
        gates.append(gate_result("mode_allowed", "FAIL", f"unsupported mode: {task_mode}"))
        return {
            "task_id": task_id,
            "mode": task_mode,
            "task_packet": normalize_path(task_packet_rel),
            "status": "FAIL",
            "gates": gates,
            "operator_command": [],
            "operator_returncode": None,
        }
    gates.append(gate_result("mode_allowed", "PASS", f"mode allowed: {task_mode}"))

    task_packet_payload, task_packet_error = load_json(task_packet_path)
    if task_packet_error:
        gates.append(gate_result("scope_allowed", "FAIL", task_packet_error))
        return {
            "task_id": task_id,
            "mode": task_mode,
            "task_packet": normalize_path(task_packet_rel),
            "status": "FAIL",
            "gates": gates,
            "operator_command": [],
            "operator_returncode": None,
        }
    if not isinstance(task_packet_payload, dict):
        gates.append(gate_result("scope_allowed", "FAIL", "task packet payload is not an object"))
        return {
            "task_id": task_id,
            "mode": task_mode,
            "task_packet": normalize_path(task_packet_rel),
            "status": "FAIL",
            "gates": gates,
            "operator_command": [],
            "operator_returncode": None,
        }

    action_gates = evaluate_no_action_gates(task_packet_payload)
    gates.extend(action_gates)
    if any(gate["status"] != "PASS" for gate in action_gates):
        return {
            "task_id": task_id,
            "mode": task_mode,
            "task_packet": normalize_path(task_packet_rel),
            "status": "FAIL",
            "gates": gates,
            "operator_command": [],
            "operator_returncode": None,
        }

    allowed_files = task_packet_payload.get("allowed_files")
    forbidden_files = task_packet_payload.get("forbidden_files")
    scope_contract_ok = isinstance(allowed_files, list) and bool(allowed_files) and isinstance(forbidden_files, list) and bool(forbidden_files)
    gates.append(
        gate_result(
            "scope_allowed",
            "PASS" if scope_contract_ok else "FAIL",
            "task packet scope contract detected" if scope_contract_ok else "allowed_files/forbidden_files contract missing",
        )
    )
    if not scope_contract_ok:
        return {
            "task_id": task_id,
            "mode": task_mode,
            "task_packet": normalize_path(task_packet_rel),
            "status": "FAIL",
            "gates": gates,
            "operator_command": [],
            "operator_returncode": None,
        }

    operator_mode = EXECUTION_MODE_MAP[task_mode]
    command = [
        python_executable(),
        "scripts/agent_pr_operator.py",
        "--mode",
        operator_mode,
        "--task-packet",
        task_packet_rel,
    ]
    result = run_command(command)
    operator_output = parse_operator_output(str(result.get("stdout", "")))

    if int(result.get("returncode", 1)) == 0:
        gates.append(gate_result("validation_passed", "PASS", f"operator mode {operator_mode} completed successfully"))
    else:
        operator_error = str(result.get("stderr", "")).strip() or str(result.get("stdout", "")).strip() or "unknown operator failure"
        gates.append(gate_result("validation_passed", "FAIL", operator_error[-600:]))

    status_after, status_after_error = git_status_porcelain()
    if status_after_error:
        gates.append(gate_result("workspace_clean_after", "FAIL", status_after_error))
    elif status_after:
        gates.append(gate_result("workspace_clean_after", "FAIL", f"workspace dirty after task: {status_after}"))
    else:
        gates.append(gate_result("workspace_clean_after", "PASS", "workspace clean after task"))

    evaluated_gate_names = {gate["name"] for gate in gates}
    missing_required_gates = [gate for gate in required_gates if gate not in evaluated_gate_names]
    for gate_name in missing_required_gates:
        gates.append(gate_result(gate_name, "BLOCKED", "NOT_IMPLEMENTED_GATE"))

    task_status = "PASS" if all(gate["status"] == "PASS" for gate in gates) else "FAIL"
    return {
        "task_id": task_id,
        "mode": task_mode,
        "task_packet": normalize_path(task_packet_rel),
        "status": task_status,
        "gates": gates,
        "operator_command": command,
        "operator_returncode": int(result.get("returncode", 1)),
        "operator_summary": {
            "software_verdict": operator_output.get("software_verdict"),
            "evidence_verdict": operator_output.get("evidence_verdict"),
            "claim_verdict": operator_output.get("claim_verdict"),
        },
    }


def write_report(output_dir: Path, report: dict[str, Any]) -> tuple[str | None, str | None]:
    try:
        output_dir.mkdir(parents=True, exist_ok=True)
        path = output_dir / "block_report.json"
        path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        return normalize_path(str(path)), None
    except OSError as exc:
        return None, f"BLOCK_REPORT_WRITE_FAILED: {exc}"


def render(payload: dict[str, Any], pretty: bool) -> None:
    print(json.dumps(payload, indent=2 if pretty else None, sort_keys=True))


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    started_at = now_iso()
    manifest_path = Path(args.block_manifest)
    manifest_payload, manifest_error = load_json(manifest_path)

    if manifest_error:
        completed_at = now_iso()
        blocked = blocked_manifest_response(None, [manifest_error], started_at, completed_at)
        path, write_error = write_report(Path(args.output_dir), blocked)
        if path:
            blocked["block_report_path"] = path
        if write_error:
            blocked.setdefault("blocked_reasons", []).append(write_error)
        render(blocked, args.pretty)
        return 1

    manifest, manifest_errors = validate_manifest_shape(manifest_payload)
    if manifest_errors:
        completed_at = now_iso()
        blocked = blocked_manifest_response(manifest, manifest_errors, started_at, completed_at)
        path, write_error = write_report(Path(args.output_dir), blocked)
        if path:
            blocked["block_report_path"] = path
        if write_error:
            blocked.setdefault("blocked_reasons", []).append(write_error)
        render(blocked, args.pretty)
        return 1

    parsed_tasks: list[dict[str, Any]] = []
    task_parse_errors: list[str] = []
    for raw_task in manifest["tasks"]:
        parsed_task, errors = parse_task(raw_task, manifest["default_mode"])
        if errors:
            task_label = parsed_task.get("task_id", "unknown_task")
            task_parse_errors.extend([f"{task_label}: {error}" for error in errors])
        parsed_tasks.append(parsed_task)
    if task_parse_errors:
        completed_at = now_iso()
        blocked = blocked_manifest_response(manifest, task_parse_errors, started_at, completed_at)
        path, write_error = write_report(Path(args.output_dir), blocked)
        if path:
            blocked["block_report_path"] = path
        if write_error:
            blocked.setdefault("blocked_reasons", []).append(write_error)
        render(blocked, args.pretty)
        return 1

    task_results: list[dict[str, Any]] = []
    tasks_failed = 0
    stopped_at_task_id: str | None = None
    for task in parsed_tasks:
        result = run_task(task)
        task_results.append(result)
        if result["status"] != "PASS":
            tasks_failed += 1
            if manifest["stop_on_fail"] and stopped_at_task_id is None:
                stopped_at_task_id = result["task_id"]
                break

    tasks_total = len(parsed_tasks)
    tasks_passed = len([task for task in task_results if task["status"] == "PASS"])
    completed_at = now_iso()
    block_status = "PASS" if tasks_failed == 0 and len(task_results) == tasks_total else "FAIL"

    report: dict[str, Any] = {
        "schema_version": "1.0",
        "block_id": manifest["block_id"],
        "started_at": started_at,
        "completed_at": completed_at,
        "status": block_status,
        "stop_on_fail": manifest["stop_on_fail"],
        "allow_ready": manifest["allow_ready"],
        "allow_merge": manifest["allow_merge"],
        "tasks_total": tasks_total,
        "tasks_passed": tasks_passed,
        "tasks_failed": tasks_failed,
        "stopped_at_task_id": stopped_at_task_id,
        "task_results": task_results,
        "verdicts": {
            "software_verdict": "CONTROL_PLANE_TOOLING_ONLY",
            "evidence_verdict": "LOCAL_BLOCK_RUNNER_DRY_RUN_VALIDATION_ONLY",
            "claim_verdict": "NO_CLAIM_ALLOWED",
        },
    }

    report_path, write_error = write_report(Path(args.output_dir), report)
    if write_error:
        report["status"] = "BLOCKED"
        report["blocked_reasons"] = [write_error]
        render(report, args.pretty)
        return 1
    report["block_report_path"] = report_path
    render(report, args.pretty)
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
