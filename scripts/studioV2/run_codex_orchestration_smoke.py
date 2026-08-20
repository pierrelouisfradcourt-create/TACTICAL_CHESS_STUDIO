import argparse
import json
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any


SMOKE_OUTPUT_DIR = Path(
    "lab/gameplay_observation/sandbox_outputs/pr20_orchestration_smoke"
)
SMOKE_JSON_PATH = SMOKE_OUTPUT_DIR / "orchestration_smoke.pr20.json"
SMOKE_MD_PATH = SMOKE_OUTPUT_DIR / "orchestration_smoke.pr20.md"

PR14_SURFACE_PATH = Path(
    "lab/gameplay_observation/non_converting_positions/pr14_gameplay_surface.json"
)
OBSERVATION_OUTPUT_DIR = SMOKE_OUTPUT_DIR / "pr14_gameplay_surface"
OBSERVATION_REPORT_PATH = OBSERVATION_OUTPUT_DIR / "observation_report.pr13j.json"
TRIAGE_BRIDGE_REPORT_PATH = SMOKE_OUTPUT_DIR / "observation_report.pr20_bridge.json"
TRIAGE_OUTPUT_PATH = SMOKE_OUTPUT_DIR / "triage_report.pr20.json"

QUEUE_JSON_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr16_codex_task_queue/codex_task_queue.pr16.json"
)
QUEUE_MD_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr16_codex_task_queue/codex_task_queue.pr16.md"
)
PROMPT_PACK_JSON_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr17_codex_prompt_pack/codex_prompt_pack.pr17.json"
)
PROMPT_PACK_MD_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr17_codex_prompt_pack/codex_prompt_pack.pr17.md"
)
EXECUTION_PACKET_JSON_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr18_codex_execution_packet/codex_execution_packet.pr18.json"
)
EXECUTION_PACKET_MD_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr18_codex_execution_packet/codex_execution_packet.pr18.md"
)
VALID_RESULT_PATH = Path(
    "lab/gameplay_observation/codex_execution_result/examples/valid_result.pr19.json"
)
BLOCKED_RESULT_PATH = Path(
    "lab/gameplay_observation/codex_execution_result/examples/blocked_result.pr19.json"
)

FORBIDDEN_OUTPUT_FRAGMENTS = (
    "lab/runs/",
    "lab/runs\\",
    "latest.json",
    "holdout/",
    "holdout\\",
)


@dataclass
class StepSpec:
    step_id: str
    label: str
    command: list[str]
    expected_intake_verdict: str | None = None


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def normalize_path(path: Path) -> str:
    return str(path).replace("\\", "/")


def is_safe_relative_path(path: Path) -> bool:
    raw = normalize_path(path)
    if PureWindowsPath(raw).is_absolute() or PurePosixPath(raw).is_absolute():
        return False
    return ".." not in PurePosixPath(raw).parts


def assert_noncanonical_output_path(path: Path) -> None:
    normalized = normalize_path(path).lower()
    if not is_safe_relative_path(path):
        raise ValueError(f"unsafe path: {path}")
    if any(fragment in normalized for fragment in FORBIDDEN_OUTPUT_FRAGMENTS):
        raise ValueError(f"forbidden output path: {path}")
    if not normalized.startswith("lab/gameplay_observation/sandbox_outputs/"):
        raise ValueError(
            "output path must remain under lab/gameplay_observation/sandbox_outputs/"
        )


def excerpt(value: str, limit: int = 1500) -> str:
    clean = value.replace("\x00", "")
    if len(clean) <= limit:
        return clean
    return clean[:limit] + "...<truncated>"


def command_to_string(command: list[str]) -> str:
    return " ".join(
        f'"{token}"' if (" " in token or "\t" in token) else token for token in command
    )


def parse_json_maybe(output: str) -> dict[str, Any] | None:
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
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None


def run_step(step: StepSpec, root_dir: Path, timeout_seconds: int) -> dict[str, Any]:
    try:
        completed = subprocess.run(
            step.command,
            cwd=root_dir,
            check=False,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
        exit_code = completed.returncode
        stdout = completed.stdout
        stderr = completed.stderr
        runtime_error = None
    except FileNotFoundError as exc:
        exit_code = 127
        stdout = ""
        stderr = ""
        runtime_error = str(exc)
    except subprocess.TimeoutExpired as exc:
        exit_code = 124
        stdout = exc.stdout if isinstance(exc.stdout, str) else ""
        stderr = exc.stderr if isinstance(exc.stderr, str) else ""
        runtime_error = f"timeout after {timeout_seconds}s"

    result: dict[str, Any] = {
        "step_id": step.step_id,
        "label": step.label,
        "command": command_to_string(step.command),
        "exit_code": exit_code,
        "stdout_excerpt": excerpt(stdout),
        "stderr_excerpt": excerpt(stderr),
        "runtime_error": runtime_error,
        "expected_intake_verdict": step.expected_intake_verdict,
    }

    parsed_output = parse_json_maybe(stdout)
    intake_verdict = (
        parsed_output.get("intake_verdict")
        if isinstance(parsed_output, dict)
        and isinstance(parsed_output.get("intake_verdict"), str)
        else None
    )
    result["intake_verdict"] = intake_verdict

    if step.expected_intake_verdict:
        expected = step.expected_intake_verdict
        matched = intake_verdict == expected
        result["matched_expected_intake"] = matched
        if expected == "BLOCKED":
            if matched:
                result["status"] = "EXPECTED_BLOCKED"
            else:
                result["status"] = "FAIL"
                result["error"] = (
                    f"expected intake_verdict={expected}, got {intake_verdict!r}"
                )
        else:
            if matched and exit_code == 0:
                result["status"] = "PASS"
            else:
                result["status"] = "FAIL"
                if not matched:
                    result["error"] = (
                        f"expected intake_verdict={expected}, got {intake_verdict!r}"
                    )
                elif exit_code != 0:
                    result["error"] = f"unexpected non-zero exit code: {exit_code}"
    else:
        if exit_code == 0:
            result["status"] = "PASS"
        else:
            result["status"] = "FAIL"
            result["error"] = f"unexpected non-zero exit code: {exit_code}"

    if runtime_error and result["status"] != "FAIL":
        result["status"] = "FAIL"
        result["error"] = runtime_error
    elif runtime_error:
        result["error"] = runtime_error

    return result


def build_steps(python_executable: str) -> list[StepSpec]:
    return [
        StepSpec(
            step_id="A",
            label="run gameplay observation on PR-14 surface depths 1,2",
            command=[
                python_executable,
                "scripts/run_gameplay_observation.py",
                "--surface",
                normalize_path(PR14_SURFACE_PATH),
                "--output-dir",
                normalize_path(OBSERVATION_OUTPUT_DIR),
                "--depths",
                "1,2",
                "--execute",
            ],
        ),
        StepSpec(
            step_id="B",
            label="run gameplay triage from PR-20 observation report",
            command=[
                python_executable,
                "scripts/triage_gameplay_observation.py",
                "--report",
                normalize_path(TRIAGE_BRIDGE_REPORT_PATH),
                "--output",
                normalize_path(TRIAGE_OUTPUT_PATH),
            ],
        ),
        StepSpec(
            step_id="C",
            label="generate Codex task queue from triage output",
            command=[
                python_executable,
                "scripts/generate_codex_task_queue.py",
                "--triage-report",
                normalize_path(TRIAGE_OUTPUT_PATH),
            ],
        ),
        StepSpec(
            step_id="D",
            label="generate Codex prompt pack",
            command=[
                python_executable,
                "scripts/generate_codex_prompt_pack.py",
                "--queue",
                normalize_path(QUEUE_JSON_PATH),
            ],
        ),
        StepSpec(
            step_id="E",
            label="prepare Codex execution packet",
            command=[
                python_executable,
                "scripts/prepare_codex_execution_packet.py",
                "--prompt-pack",
                normalize_path(PROMPT_PACK_JSON_PATH),
                "--index",
                "0",
            ],
        ),
        StepSpec(
            step_id="F1",
            label="validate PR-19 valid execution result example",
            command=[
                python_executable,
                "scripts/check_codex_execution_result.py",
                "--result",
                normalize_path(VALID_RESULT_PATH),
            ],
            expected_intake_verdict="PASS",
        ),
        StepSpec(
            step_id="F2",
            label="validate PR-19 blocked execution result example",
            command=[
                python_executable,
                "scripts/check_codex_execution_result.py",
                "--result",
                normalize_path(BLOCKED_RESULT_PATH),
            ],
            expected_intake_verdict="BLOCKED",
        ),
    ]


def collect_generated_artifacts() -> list[str]:
    candidates = [
        OBSERVATION_REPORT_PATH,
        TRIAGE_BRIDGE_REPORT_PATH,
        TRIAGE_OUTPUT_PATH,
        QUEUE_JSON_PATH,
        QUEUE_MD_PATH,
        PROMPT_PACK_JSON_PATH,
        PROMPT_PACK_MD_PATH,
        EXECUTION_PACKET_JSON_PATH,
        EXECUTION_PACKET_MD_PATH,
        SMOKE_JSON_PATH,
        SMOKE_MD_PATH,
    ]
    return [normalize_path(path) for path in candidates if path.exists()]


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def optional_int(source: dict[str, Any], key: str) -> int | None:
    value = source.get(key)
    return value if isinstance(value, int) else None


def optional_str(source: dict[str, Any], key: str) -> str | None:
    value = source.get(key)
    return value if isinstance(value, str) else None


def build_triage_bridge_report(source_report: Path, destination_report: Path) -> None:
    payload = load_json(source_report)
    if not isinstance(payload, dict):
        raise ValueError("observation report must be a JSON object")
    observations = payload.get("observations")
    if not isinstance(observations, list):
        raise ValueError("observation report missing observations list")

    grouped: dict[str, dict[str, Any]] = {}
    for row in observations:
        if not isinstance(row, dict):
            continue
        position_id = optional_str(row, "position_id")
        fen = optional_str(row, "fen")
        depth = optional_int(row, "depth")
        if not position_id or not fen or depth is None:
            continue
        bucket = grouped.setdefault(
            position_id,
            {
                "position_id": position_id,
                "fen": fen,
                "depth_rows": [],
            },
        )
        bucket["depth_rows"].append(
            {
                "requested_depth": depth,
                "completed_depth": optional_int(row, "completed_depth") or depth,
                "observation_status": optional_str(row, "observation_status"),
                "runtime_status": optional_str(row, "runtime_status"),
                "selected_move": optional_str(row, "selected_move"),
                "search_score": optional_int(row, "search_score"),
                "candidate_count": optional_int(row, "candidate_count"),
                "score_gap": optional_int(row, "score_gap"),
            }
        )

    depth_summaries: list[dict[str, Any]] = []
    for position_id in sorted(grouped):
        bucket = grouped[position_id]
        depth_rows = sorted(
            [row for row in bucket["depth_rows"] if isinstance(row, dict)],
            key=lambda row: int(row.get("requested_depth", 0)),
        )
        selected_moves = {
            str(row.get("requested_depth")): row.get("selected_move")
            for row in depth_rows
            if isinstance(row.get("selected_move"), str)
        }
        unique_selected = sorted(
            {move for move in selected_moves.values() if isinstance(move, str)}
        )
        bucket["depth_rows"] = depth_rows
        bucket["stable_selected_move"] = len(unique_selected) == 1 if unique_selected else None
        bucket["changed_selected_move"] = len(unique_selected) > 1 if unique_selected else None
        depth_summaries.append(bucket)

    bridged = {
        "schema_version": "pr20.noncanonical_observation_to_triage_bridge.v1",
        "created_at": utc_now(),
        "source_report": normalize_path(source_report),
        "canonical_evidence": False,
        "promotion_eligible": False,
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "depth_summaries": depth_summaries,
    }
    destination_report.write_text(
        json.dumps(bridged, indent=2, sort_keys=True), encoding="utf-8"
    )


def write_markdown_report(report: dict[str, Any], destination: Path) -> None:
    step_rows = report.get("steps_run", [])
    blocked_rows = report.get("blocked_expected_results", [])
    lines = [
        "# PR-20 Codex Orchestration Smoke Report (Non-Canonical)",
        "",
        "Status: local orchestration smoke only",
        "",
        "## Metadata",
        "",
        f"- `schema_version`: `{report['schema_version']}`",
        f"- `created_at`: `{report['created_at']}`",
        f"- `final_status`: `{report['final_status']}`",
        f"- `software_verdict`: `{report['software_verdict']}`",
        f"- `evidence_verdict`: `{report['evidence_verdict']}`",
        f"- `claim_verdict`: `{report['claim_verdict']}`",
        "- `canonical_evidence`: `false`",
        "- `promotion_eligible`: `false`",
        "- `human_review_required`: `true`",
        "",
        "## Commands",
        "",
    ]

    for command in report.get("command_list", []):
        lines.append(f"- `{command}`")

    lines.extend(
        [
            "",
            "## Steps",
            "",
            "| step | status | exit_code | intake_verdict |",
            "|---|---|---:|---|",
        ]
    )
    for row in step_rows:
        lines.append(
            f"| {row.get('step_id', '')} | {row.get('status', '')} | "
            f"{row.get('exit_code', '')} | {row.get('intake_verdict', '')} |"
        )

    lines.extend(
        [
            "",
            "## Expected blocked results",
            "",
        ]
    )
    if blocked_rows:
        for row in blocked_rows:
            lines.append(
                f"- `{row.get('step_id')}` recorded `{row.get('status')}` "
                f"(intake_verdict={row.get('intake_verdict')}, exit_code={row.get('exit_code')})."
            )
    else:
        lines.append("- (none)")

    lines.extend(
        [
            "",
            "## Generated artifacts",
            "",
        ]
    )
    for artifact in report.get("generated_artifacts", []):
        lines.append(f"- `{artifact}`")

    lines.extend(
        [
            "",
            "## Stdout/Stderr excerpts",
            "",
        ]
    )
    for row in step_rows:
        lines.extend(
            [
                f"### {row.get('step_id', '')}: {row.get('label', '')}",
                "",
                "```text",
                f"stdout:\n{row.get('stdout_excerpt', '')}",
                "",
                f"stderr:\n{row.get('stderr_excerpt', '')}",
                "```",
                "",
            ]
        )

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def run_smoke(pretty: bool, timeout_seconds: int) -> tuple[int, dict[str, Any]]:
    assert_noncanonical_output_path(SMOKE_OUTPUT_DIR)
    assert_noncanonical_output_path(SMOKE_JSON_PATH)
    assert_noncanonical_output_path(SMOKE_MD_PATH)
    assert_noncanonical_output_path(OBSERVATION_OUTPUT_DIR)
    assert_noncanonical_output_path(TRIAGE_BRIDGE_REPORT_PATH)
    assert_noncanonical_output_path(TRIAGE_OUTPUT_PATH)

    SMOKE_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    root_dir = Path(__file__).resolve().parents[1]
    steps = build_steps(sys.executable)

    step_results: list[dict[str, Any]] = []
    for step in steps:
        if step.step_id == "B":
            try:
                build_triage_bridge_report(
                    OBSERVATION_REPORT_PATH, TRIAGE_BRIDGE_REPORT_PATH
                )
            except Exception as exc:
                step_results.append(
                    {
                        "step_id": "A_bridge",
                        "label": "build triage bridge report from PR-14 observation output",
                        "command": "internal: build_triage_bridge_report",
                        "exit_code": 1,
                        "stdout_excerpt": "",
                        "stderr_excerpt": "",
                        "runtime_error": str(exc),
                        "expected_intake_verdict": None,
                        "intake_verdict": None,
                        "status": "FAIL",
                        "error": str(exc),
                    }
                )
                break
        result = run_step(step, root_dir, timeout_seconds)
        step_results.append(result)
        if result["status"] == "FAIL":
            break

    blocked_expected_results = [
        row for row in step_results if row.get("status") == "EXPECTED_BLOCKED"
    ]
    final_status = (
        "PASS" if all(row.get("status") in {"PASS", "EXPECTED_BLOCKED"} for row in step_results) else "FAIL"
    )

    smoke_report: dict[str, Any] = {
        "schema_version": "pr20.noncanonical_codex_orchestration_smoke.v1",
        "created_at": utc_now(),
        "steps_run": step_results,
        "command_list": [row["command"] for row in step_results],
        "exit_codes": {row["step_id"]: row["exit_code"] for row in step_results},
        "stdout_stderr_excerpts": [
            {
                "step_id": row["step_id"],
                "stdout_excerpt": row["stdout_excerpt"],
                "stderr_excerpt": row["stderr_excerpt"],
            }
            for row in step_results
        ],
        "generated_artifacts": [],
        "blocked_expected_results": blocked_expected_results,
        "final_status": final_status,
        "software_verdict": (
            "ORCHESTRATION_SMOKE_RUNNER_ADDED"
            if final_status == "PASS"
            else "ORCHESTRATION_SMOKE_RUNNER_FAILED"
        ),
        "evidence_verdict": "NON_CANONICAL_ORCHESTRATION_ONLY",
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "canonical_evidence": False,
        "promotion_eligible": False,
        "human_review_required": True,
    }

    SMOKE_JSON_PATH.write_text(
        json.dumps(smoke_report, indent=2, sort_keys=True), encoding="utf-8"
    )
    smoke_report["generated_artifacts"] = collect_generated_artifacts()
    SMOKE_JSON_PATH.write_text(
        json.dumps(smoke_report, indent=2, sort_keys=True), encoding="utf-8"
    )
    write_markdown_report(smoke_report, SMOKE_MD_PATH)

    if pretty:
        print(json.dumps(smoke_report, indent=2, sort_keys=True))
    else:
        print(json.dumps(smoke_report, sort_keys=True))

    return (0 if final_status == "PASS" else 1), smoke_report


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="PR-20 local non-canonical orchestration smoke runner."
    )
    parser.add_argument(
        "--timeout-seconds",
        type=int,
        default=240,
        help="Timeout per command in seconds.",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print smoke report JSON to stdout.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        exit_code, _ = run_smoke(args.pretty, args.timeout_seconds)
        return exit_code
    except Exception as exc:
        error_payload = {
            "schema_version": "pr20.noncanonical_codex_orchestration_smoke.v1",
            "created_at": utc_now(),
            "final_status": "FAIL",
            "software_verdict": "ORCHESTRATION_SMOKE_RUNNER_FAILED",
            "evidence_verdict": "INVALID",
            "claim_verdict": "NO_CLAIM_ALLOWED",
            "canonical_evidence": False,
            "promotion_eligible": False,
            "human_review_required": True,
            "error": str(exc),
        }
        print(json.dumps(error_payload, indent=2 if args.pretty else None, sort_keys=True))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
