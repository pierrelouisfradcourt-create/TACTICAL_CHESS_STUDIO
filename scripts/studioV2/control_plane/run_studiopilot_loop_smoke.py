import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

try:
    import jsonschema
except ImportError:
    print("BLOCKED_MISSING_JSONSCHEMA")
    raise SystemExit(2)


PROJECT_ROOT = Path(__file__).resolve().parents[3]
CONTROL_PLANE_ROOT = PROJECT_ROOT / "scripts" / "control_plane"
FIXTURES_ROOT = PROJECT_ROOT / "docs" / "control-plane" / "fixtures" / "studiopilot_packets" / "valid"
SCHEMAS_ROOT = PROJECT_ROOT / "schemas"

TASK_PACKET_FIXTURE = FIXTURES_ROOT / "valid_task_packet_docs.json"
EXECUTION_REPORT_FIXTURE = FIXTURES_ROOT / "valid_execution_report_docs.json"

REVIEW_PACKET_SCHEMA = SCHEMAS_ROOT / "studiopilot_review_packet.schema.json"
HUMAN_DECISION_SCHEMA = SCHEMAS_ROOT / "studiopilot_human_decision.schema.json"

FORBIDDEN_OUTPUT_PREFIXES = (
    "src",
    "ml",
    ".github",
    "schemas",
    "docs/control-plane/fixtures",
    "lab/agent_tasks",
)

PASS = "PASS"
BLOCKED = "BLOCKED"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a local dry-run smoke test for the StudioPilot manual loop."
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print summary JSON output.")
    parser.add_argument("--output-dir", help="Optional directory for smoke outputs.")
    parser.add_argument("--keep-temp", action="store_true", help="Keep temp output directory when --output-dir is not set.")
    return parser.parse_args()


def ensure_script_path_is_local(script_path: Path) -> None:
    resolved = script_path.resolve()
    control_plane_resolved = CONTROL_PLANE_ROOT.resolve()
    try:
        resolved.relative_to(control_plane_resolved)
    except ValueError as exc:
        raise ValueError(f"script_not_in_control_plane: {resolved}") from exc
    if resolved.suffix != ".py":
        raise ValueError(f"script_not_python_file: {resolved}")


def run_local_script(script_name: str, script_args: list[str]) -> subprocess.CompletedProcess[str]:
    script_path = CONTROL_PLANE_ROOT / script_name
    ensure_script_path_is_local(script_path)
    cmd = [sys.executable, str(script_path)] + script_args
    return subprocess.run(
        cmd,
        cwd=str(PROJECT_ROOT),
        capture_output=True,
        text=True,
        shell=False,
        check=False,
    )


def make_validator(schema_path: Path) -> jsonschema.protocols.Validator:
    schema_obj = json.loads(schema_path.read_text(encoding="utf-8"))
    validator_class = jsonschema.validators.validator_for(schema_obj)
    validator_class.check_schema(schema_obj)
    format_checker = getattr(validator_class, "FORMAT_CHECKER", None)
    if format_checker is None:
        return validator_class(schema_obj)
    return validator_class(schema_obj, format_checker=format_checker)


def validate_json_against_schema(json_path: Path, schema_path: Path, label: str) -> list[str]:
    payload = json.loads(json_path.read_text(encoding="utf-8"))
    validator = make_validator(schema_path)
    errors = sorted(validator.iter_errors(payload), key=lambda item: list(item.path))
    if not errors:
        return []
    first = errors[0]
    location = "/".join(str(part) for part in first.path) or "<root>"
    return [f"{label} schema validation failed at {location}: {first.message}"]


def ensure_required_inputs_exist() -> None:
    required_paths = [
        TASK_PACKET_FIXTURE,
        EXECUTION_REPORT_FIXTURE,
        REVIEW_PACKET_SCHEMA,
        HUMAN_DECISION_SCHEMA,
        CONTROL_PLANE_ROOT / "validate_studiopilot_packets.py",
        CONTROL_PLANE_ROOT / "render_codex_prompt.py",
        CONTROL_PLANE_ROOT / "validate_execution_report.py",
        CONTROL_PLANE_ROOT / "build_review_packet.py",
        CONTROL_PLANE_ROOT / "build_human_decision.py",
    ]
    missing = [str(path) for path in required_paths if not path.exists()]
    if missing:
        raise FileNotFoundError(f"required_paths_missing: {missing}")


def is_forbidden_output_dir(path: Path) -> bool:
    repo_root = PROJECT_ROOT.resolve()
    resolved = path.resolve()
    try:
        relative = resolved.relative_to(repo_root).as_posix()
    except ValueError:
        return False

    for forbidden in FORBIDDEN_OUTPUT_PREFIXES:
        if relative == forbidden or relative.startswith(f"{forbidden}/"):
            return True
    return False


def prepare_output_dir(user_output_dir: str | None) -> tuple[Path, bool]:
    if user_output_dir is None:
        temp_path = Path(tempfile.mkdtemp(prefix="studiopilot_loop_smoke_"))
        return temp_path, True

    output_dir = Path(user_output_dir).resolve()
    if is_forbidden_output_dir(output_dir):
        raise PermissionError(f"output_dir_forbidden: {output_dir}")

    if output_dir.exists():
        if not output_dir.is_dir():
            raise NotADirectoryError(f"output_dir_not_directory: {output_dir}")
    else:
        parent = output_dir.parent
        if not parent.exists():
            raise FileNotFoundError(f"output_dir_parent_missing: {parent}")
        output_dir.mkdir()

    return output_dir, False


def summarize_process_errors(proc: subprocess.CompletedProcess[str]) -> list[str]:
    errors: list[str] = []
    if proc.returncode != 0:
        errors.append(f"exit_code: {proc.returncode}")
    stderr = (proc.stderr or "").strip()
    stdout = (proc.stdout or "").strip()
    if stderr:
        errors.append(f"stderr: {stderr}")
    if proc.returncode != 0 and stdout:
        errors.append(f"stdout: {stdout}")
    return errors


def run_pipeline(pretty: bool, output_dir: Path) -> dict[str, Any]:
    rendered_prompt_path = output_dir / "rendered_codex_prompt.txt"
    review_packet_path = output_dir / "review_packet.json"
    human_decision_path = output_dir / "human_decision.json"

    for target in (rendered_prompt_path, review_packet_path, human_decision_path):
        if target.exists():
            raise FileExistsError(f"refusing_to_overwrite_existing_file: {target}")

    steps: list[dict[str, Any]] = []
    review_packet_schema_valid = False
    human_decision_schema_valid = False

    def add_step(name: str, status: str, output_path: Path | None = None, errors: list[str] | None = None) -> None:
        row: dict[str, Any] = {"name": name, "status": status, "errors": errors or []}
        if output_path is not None:
            row["output_path"] = str(output_path)
        steps.append(row)

    def append_blocked_remainder(names: list[str]) -> None:
        for step_name in names:
            add_step(step_name, BLOCKED, errors=["skipped_due_to_previous_failure"])

    step1_args = ["--pretty"] if pretty else []
    step1 = run_local_script("validate_studiopilot_packets.py", step1_args)
    step1_errors = summarize_process_errors(step1)
    if step1.returncode == 0:
        add_step("validate_fixture_set", PASS)
    else:
        add_step("validate_fixture_set", BLOCKED, errors=step1_errors)
        append_blocked_remainder(
            [
                "render_codex_prompt",
                "validate_execution_report",
                "build_review_packet",
                "build_human_decision",
                "validate_human_decision_schema",
            ]
        )
        return {
            "overall_status": BLOCKED,
            "steps": steps,
            "rendered_prompt_created": rendered_prompt_path.exists(),
            "review_packet_schema_valid": review_packet_schema_valid,
            "human_decision_schema_valid": human_decision_schema_valid,
        }

    step2_args = [str(TASK_PACKET_FIXTURE), "--output", str(rendered_prompt_path)]
    if pretty:
        step2_args.append("--pretty")
    step2 = run_local_script("render_codex_prompt.py", step2_args)
    step2_errors = summarize_process_errors(step2)
    if step2.returncode == 0 and rendered_prompt_path.exists():
        add_step("render_codex_prompt", PASS, output_path=rendered_prompt_path)
    else:
        if step2.returncode == 0 and not rendered_prompt_path.exists():
            step2_errors.append("rendered_prompt_file_missing_after_success")
        add_step("render_codex_prompt", BLOCKED, output_path=rendered_prompt_path, errors=step2_errors)
        append_blocked_remainder(
            [
                "validate_execution_report",
                "build_review_packet",
                "build_human_decision",
                "validate_human_decision_schema",
            ]
        )
        return {
            "overall_status": BLOCKED,
            "steps": steps,
            "rendered_prompt_created": rendered_prompt_path.exists(),
            "review_packet_schema_valid": review_packet_schema_valid,
            "human_decision_schema_valid": human_decision_schema_valid,
        }

    step3_args = [
        str(EXECUTION_REPORT_FIXTURE),
        "--task-packet",
        str(TASK_PACKET_FIXTURE),
    ]
    if pretty:
        step3_args.append("--pretty")
    step3 = run_local_script("validate_execution_report.py", step3_args)
    step3_errors = summarize_process_errors(step3)
    if step3.returncode == 0:
        add_step("validate_execution_report", PASS)
    else:
        add_step("validate_execution_report", BLOCKED, errors=step3_errors)
        append_blocked_remainder(
            [
                "build_review_packet",
                "build_human_decision",
                "validate_human_decision_schema",
            ]
        )
        return {
            "overall_status": BLOCKED,
            "steps": steps,
            "rendered_prompt_created": rendered_prompt_path.exists(),
            "review_packet_schema_valid": review_packet_schema_valid,
            "human_decision_schema_valid": human_decision_schema_valid,
        }

    step4_args = [
        str(EXECUTION_REPORT_FIXTURE),
        "--task-packet",
        str(TASK_PACKET_FIXTURE),
        "--output",
        str(review_packet_path),
    ]
    if pretty:
        step4_args.append("--pretty")
    step4 = run_local_script("build_review_packet.py", step4_args)
    step4_errors = summarize_process_errors(step4)
    if step4.returncode == 0 and review_packet_path.exists():
        review_validation_errors = validate_json_against_schema(
            json_path=review_packet_path,
            schema_path=REVIEW_PACKET_SCHEMA,
            label="ReviewPacket",
        )
        if not review_validation_errors:
            review_packet_schema_valid = True
            add_step("build_review_packet", PASS, output_path=review_packet_path)
        else:
            step4_errors.extend(review_validation_errors)
            add_step("build_review_packet", BLOCKED, output_path=review_packet_path, errors=step4_errors)
            append_blocked_remainder(
                [
                    "build_human_decision",
                    "validate_human_decision_schema",
                ]
            )
            return {
                "overall_status": BLOCKED,
                "steps": steps,
                "rendered_prompt_created": rendered_prompt_path.exists(),
                "review_packet_schema_valid": review_packet_schema_valid,
                "human_decision_schema_valid": human_decision_schema_valid,
            }
    else:
        if step4.returncode == 0 and not review_packet_path.exists():
            step4_errors.append("review_packet_file_missing_after_success")
        add_step("build_review_packet", BLOCKED, output_path=review_packet_path, errors=step4_errors)
        append_blocked_remainder(
            [
                "build_human_decision",
                "validate_human_decision_schema",
            ]
        )
        return {
            "overall_status": BLOCKED,
            "steps": steps,
            "rendered_prompt_created": rendered_prompt_path.exists(),
            "review_packet_schema_valid": review_packet_schema_valid,
            "human_decision_schema_valid": human_decision_schema_valid,
        }

    step5_args = [str(review_packet_path), "--output", str(human_decision_path)]
    if pretty:
        step5_args.append("--pretty")
    step5 = run_local_script("build_human_decision.py", step5_args)
    step5_errors = summarize_process_errors(step5)
    if step5.returncode == 0 and human_decision_path.exists():
        add_step("build_human_decision", PASS, output_path=human_decision_path)
    else:
        if step5.returncode == 0 and not human_decision_path.exists():
            step5_errors.append("human_decision_file_missing_after_success")
        add_step("build_human_decision", BLOCKED, output_path=human_decision_path, errors=step5_errors)
        append_blocked_remainder(["validate_human_decision_schema"])
        return {
            "overall_status": BLOCKED,
            "steps": steps,
            "rendered_prompt_created": rendered_prompt_path.exists(),
            "review_packet_schema_valid": review_packet_schema_valid,
            "human_decision_schema_valid": human_decision_schema_valid,
        }

    validation_errors = validate_json_against_schema(
        json_path=human_decision_path,
        schema_path=HUMAN_DECISION_SCHEMA,
        label="HumanDecision",
    )
    if not validation_errors:
        human_decision_schema_valid = True
        add_step("validate_human_decision_schema", PASS)
    else:
        add_step("validate_human_decision_schema", BLOCKED, errors=validation_errors)
        return {
            "overall_status": BLOCKED,
            "steps": steps,
            "rendered_prompt_created": rendered_prompt_path.exists(),
            "review_packet_schema_valid": review_packet_schema_valid,
            "human_decision_schema_valid": human_decision_schema_valid,
        }

    return {
        "overall_status": PASS,
        "steps": steps,
        "rendered_prompt_created": rendered_prompt_path.exists(),
        "review_packet_schema_valid": review_packet_schema_valid,
        "human_decision_schema_valid": human_decision_schema_valid,
    }


def emit_summary(summary: dict[str, Any], pretty: bool) -> None:
    payload = dict(summary)
    payload["claim_verdict"] = "NO_CLAIM_ALLOWED"
    payload["evidence_verdict"] = "DRY_RUN_SMOKE_ONLY"
    if pretty:
        print(json.dumps(payload, indent=2, sort_keys=True))
        return
    print(json.dumps(payload, separators=(",", ":"), sort_keys=True))


def main() -> int:
    args = parse_args()
    temp_created = False
    output_dir: Path | None = None

    try:
        ensure_required_inputs_exist()
        output_dir, temp_created = prepare_output_dir(args.output_dir)
        summary = run_pipeline(pretty=args.pretty, output_dir=output_dir)
        emit_summary(summary, args.pretty)
        if summary["overall_status"] == PASS:
            return 0
        return 1
    except (FileNotFoundError, NotADirectoryError, PermissionError, ValueError, FileExistsError) as exc:
        summary = {
            "overall_status": BLOCKED,
            "steps": [],
            "rendered_prompt_created": False,
            "review_packet_schema_valid": False,
            "human_decision_schema_valid": False,
            "claim_verdict": "NO_CLAIM_ALLOWED",
            "evidence_verdict": "DRY_RUN_SMOKE_ONLY",
            "errors": [f"config_error: {exc}"],
        }
        if args.pretty:
            print(json.dumps(summary, indent=2, sort_keys=True))
        else:
            print(json.dumps(summary, separators=(",", ":"), sort_keys=True))
        return 2
    except (json.JSONDecodeError, OSError, jsonschema.exceptions.SchemaError) as exc:
        summary = {
            "overall_status": BLOCKED,
            "steps": [],
            "rendered_prompt_created": False,
            "review_packet_schema_valid": False,
            "human_decision_schema_valid": False,
            "claim_verdict": "NO_CLAIM_ALLOWED",
            "evidence_verdict": "DRY_RUN_SMOKE_ONLY",
            "errors": [f"internal_error: {exc}"],
        }
        if args.pretty:
            print(json.dumps(summary, indent=2, sort_keys=True))
        else:
            print(json.dumps(summary, separators=(",", ":"), sort_keys=True))
        return 2
    finally:
        if output_dir is not None and temp_created and not args.keep_temp:
            shutil.rmtree(output_dir, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
