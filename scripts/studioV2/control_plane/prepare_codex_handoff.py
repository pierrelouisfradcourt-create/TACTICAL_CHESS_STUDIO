import argparse
import json
import sys
from fnmatch import fnmatch
from pathlib import Path
from typing import Any

try:
    import jsonschema
except ImportError:
    print("BLOCKED_MISSING_JSONSCHEMA")
    raise SystemExit(2)

import render_codex_prompt


PROJECT_ROOT = Path(__file__).resolve().parents[2]
TASK_PACKET_SCHEMA_RELATIVE = Path("schemas") / "studiopilot_task_packet.schema.json"
EXECUTION_REPORT_SCHEMA_RELATIVE = Path("schemas") / "studiopilot_execution_report.schema.json"

OUTPUT_FILES = (
    "task_packet.json",
    "codex_prompt.txt",
    "execution_report_template.json",
    "README_NEXT_STEPS.md",
)

VALIDATION_INCLUDE = render_codex_prompt.VALIDATION_INCLUDE
VALIDATION_OMIT = render_codex_prompt.VALIDATION_OMIT


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Prepare a local dry-run Codex handoff package from a validated "
            "StudioPilot TaskPacket. This script never calls Codex, OpenAI, "
            "GitHub, or executes the rendered prompt."
        )
    )
    parser.add_argument("task_packet_path", help="Path to StudioPilot TaskPacket JSON file.")
    parser.add_argument(
        "--output-dir",
        help=(
            "Fresh directory to create for the handoff package. No files are "
            "written when this option is omitted."
        ),
    )
    parser.add_argument(
        "--repo-path",
        default=str(PROJECT_ROOT),
        help="Repository root path used for schema lookup and path checks. Defaults to this repository.",
    )
    parser.add_argument("--pretty", action="store_true", help="Render the Codex prompt with extra spacing.")
    parser.add_argument(
        "--validation-command-mode",
        choices=(VALIDATION_INCLUDE, VALIDATION_OMIT),
        default=VALIDATION_INCLUDE,
        help="Choose whether to include or omit validation commands in the rendered prompt.",
    )
    return parser.parse_args()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def make_validator(schema_path: Path) -> jsonschema.protocols.Validator:
    schema_obj = load_json(schema_path)
    validator_class = jsonschema.validators.validator_for(schema_obj)
    validator_class.check_schema(schema_obj)
    format_checker = getattr(validator_class, "FORMAT_CHECKER", None)
    if format_checker is None:
        return validator_class(schema_obj)
    return validator_class(schema_obj, format_checker=format_checker)


def validate_payload(payload: Any, validator: jsonschema.protocols.Validator, label: str) -> None:
    errors = sorted(validator.iter_errors(payload), key=lambda err: list(err.absolute_path))
    if not errors:
        return

    first = errors[0]
    absolute_path = "/".join(str(part) for part in first.absolute_path)
    path_label = absolute_path if absolute_path else "<root>"
    raise ValueError(f"{label} schema validation failed at {path_label}: {first.message}")


def validate_task_packet(task_packet: Any, schema_path: Path) -> dict[str, Any]:
    if not isinstance(task_packet, dict):
        raise ValueError("TaskPacket root must be an object")

    task_validator = make_validator(schema_path)
    validate_payload(task_packet, task_validator, "TaskPacket")
    return task_packet


def build_execution_report_template(task_packet: dict[str, Any]) -> dict[str, Any]:
    return {
        "schema_version": task_packet["schema_version"],
        "task_id": task_packet["task_id"],
        "branch": "REPLACE_WITH_BRANCH_NAME",
        "changed_files": [],
        "commands_run": [],
        "commands_skipped": [],
        "validation_results": [
            {
                "name": command,
                "status": "UNKNOWN",
                "details": "Template placeholder; replace after Codex execution.",
            }
            for command in task_packet["validation_commands"]
        ],
        "tests_passed": 0,
        "tests_failed": 0,
        "known_risks": [
            "Template generated before execution; replace with concrete risks before review."
        ],
        "scope_deviation": "NONE",
        "claim_verdict": "NO_CLAIM_ALLOWED",
    }


def render_readme(task_packet: dict[str, Any]) -> str:
    validation_lines = "\n".join(f"- `{command}`" for command in task_packet["validation_commands"])
    allowed_lines = "\n".join(f"- `{path}`" for path in task_packet["allowed_paths"])
    forbidden_lines = "\n".join(f"- `{path}`" for path in task_packet["forbidden_paths"])

    return (
        f"# Codex Handoff: {task_packet['task_id']}\n\n"
        "This local handoff pack was generated from a schema-valid StudioPilot TaskPacket.\n"
        "It is dry-run preparation only and does not execute or authorize work.\n\n"
        "## Task\n\n"
        f"- Title: {task_packet['title']}\n"
        f"- Lane: {task_packet['lane']}\n"
        f"- Intent: {task_packet['intent']}\n"
        f"- Claim scope: {task_packet['claim_scope']}\n"
        f"- Human gate required: {str(task_packet['human_gate_required']).lower()}\n\n"
        "## Files\n\n"
        "- `task_packet.json`: validated packet copy.\n"
        "- `codex_prompt.txt`: rendered prompt text for separate human-controlled use.\n"
        "- `execution_report_template.json`: schema-valid report template to complete after execution.\n"
        "- `README_NEXT_STEPS.md`: this operator note.\n\n"
        "## Allowed Paths\n\n"
        f"{allowed_lines}\n\n"
        "## Forbidden Paths\n\n"
        f"{forbidden_lines}\n\n"
        "## Validation Commands From Packet\n\n"
        f"{validation_lines}\n\n"
        "## Manual Next Steps\n\n"
        "1. Review `task_packet.json` and `codex_prompt.txt` before any separate Codex session.\n"
        "2. If a human starts Codex separately, keep the work bounded to the packet paths and prohibitions.\n"
        "3. After execution, replace every placeholder in `execution_report_template.json`.\n"
        "4. Validate the completed execution report before any review packet or human decision step.\n\n"
        "## Boundaries\n\n"
        "- This handoff pack is not evidence.\n"
        "- This handoff pack is not merge, promotion, claim, PR, or ready-for-review authorization.\n"
        "- The generator did not call Codex, OpenAI, GitHub, or execute the generated prompt.\n"
        "- HumanGate remains final authority.\n\n"
        "## Verdict Boundaries\n\n"
        "- software_verdict: CONTROL_PLANE_HANDOFF_PACK_ONLY\n"
        "- evidence_verdict: DRY_RUN_HANDOFF_PREPARATION_ONLY\n"
        "- claim_verdict: NO_CLAIM_ALLOWED\n"
    )


def emit_json(payload: dict[str, Any], pretty: bool = True) -> str:
    if pretty:
        return json.dumps(payload, indent=2, sort_keys=True) + "\n"
    return json.dumps(payload, separators=(",", ":"), sort_keys=True) + "\n"


def repo_relative_path(path: Path, repo_root: Path) -> str | None:
    try:
        return path.resolve().relative_to(repo_root.resolve()).as_posix()
    except ValueError:
        return None


def path_matches_forbidden_pattern(repo_relative_path: str, forbidden_pattern: str) -> bool:
    normalized_path = repo_relative_path.replace("\\", "/").strip("/")
    normalized_pattern = forbidden_pattern.replace("\\", "/").strip("/")

    if fnmatch(normalized_path, normalized_pattern):
        return True

    if normalized_pattern.endswith("/**"):
        prefix = normalized_pattern[:-3].rstrip("/")
        return normalized_path == prefix or normalized_path.startswith(f"{prefix}/")

    return False


def path_matches_any_forbidden_pattern(repo_relative_path: str, forbidden_paths: list[str]) -> bool:
    return any(
        path_matches_forbidden_pattern(repo_relative_path, pattern)
        for pattern in forbidden_paths
    )


def ensure_output_dir_allowed(output_dir: Path, repo_root: Path, forbidden_paths: list[str]) -> None:
    if output_dir.exists():
        raise FileExistsError(f"Refusing to use existing output directory: {output_dir}")

    parent = output_dir.parent
    if not parent.exists():
        raise FileNotFoundError(f"Output directory parent does not exist: {parent}")
    if not parent.is_dir():
        raise NotADirectoryError(f"Output directory parent is not a directory: {parent}")

    output_targets = [output_dir / file_name for file_name in OUTPUT_FILES]
    for target in output_targets:
        relative = repo_relative_path(target, repo_root)
        if relative is None:
            continue
        if path_matches_any_forbidden_pattern(relative, forbidden_paths):
            raise PermissionError(f"Output target is inside a forbidden path pattern: {relative}")


def write_handoff_pack(output_dir: Path, files: dict[str, str]) -> None:
    output_dir.mkdir()
    for file_name in OUTPUT_FILES:
        target = output_dir / file_name
        target.write_text(files[file_name], encoding="utf-8")


def build_handoff_files(
    task_packet: dict[str, Any],
    repo_root: Path,
    execution_report_schema_path: Path,
    include_validation_commands: bool,
    pretty_prompt: bool,
) -> dict[str, str]:
    codex_prompt = render_codex_prompt.render_prompt(
        task_packet=task_packet,
        repo_root=repo_root,
        include_validation_commands=include_validation_commands,
        pretty=pretty_prompt,
    )
    execution_report_template = build_execution_report_template(task_packet)
    execution_validator = make_validator(execution_report_schema_path)
    validate_payload(execution_report_template, execution_validator, "ExecutionReport template")

    return {
        "task_packet.json": emit_json(task_packet, pretty=True),
        "codex_prompt.txt": codex_prompt,
        "execution_report_template.json": emit_json(execution_report_template, pretty=True),
        "README_NEXT_STEPS.md": render_readme(task_packet),
    }


def normalize_written_paths(output_dir: Path | None) -> list[str]:
    if output_dir is None:
        return []
    return [str((output_dir / file_name).resolve()) for file_name in OUTPUT_FILES]


def print_summary(
    task_packet: dict[str, Any],
    output_dir: Path | None,
    files_written: bool,
) -> None:
    summary = {
        "overall_status": "PASS",
        "task_id": task_packet["task_id"],
        "dry_run_only": True,
        "files_written": files_written,
        "output_dir": str(output_dir.resolve()) if output_dir is not None else None,
        "generated_files": normalize_written_paths(output_dir) if files_written else [],
        "would_generate": list(OUTPUT_FILES),
        "external_calls": {
            "codex": False,
            "github": False,
            "openai": False,
        },
        "executed_generated_prompt": False,
    }
    print(json.dumps(summary, indent=2, sort_keys=True))


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_path).resolve()
    task_packet_path = Path(args.task_packet_path).resolve()
    output_dir = Path(args.output_dir).resolve() if args.output_dir else None

    try:
        task_packet_schema_path = repo_root / TASK_PACKET_SCHEMA_RELATIVE
        execution_report_schema_path = repo_root / EXECUTION_REPORT_SCHEMA_RELATIVE

        if not repo_root.exists():
            print(f"INPUT_VALIDATION_ERROR: repo path does not exist: {repo_root}", file=sys.stderr)
            return 1
        if not task_packet_schema_path.exists():
            print(f"INTERNAL_ERROR: missing schema: {task_packet_schema_path}", file=sys.stderr)
            return 2
        if not execution_report_schema_path.exists():
            print(f"INTERNAL_ERROR: missing schema: {execution_report_schema_path}", file=sys.stderr)
            return 2
        if not task_packet_path.exists():
            print(f"INPUT_VALIDATION_ERROR: missing task packet: {task_packet_path}", file=sys.stderr)
            return 1

        task_packet = validate_task_packet(load_json(task_packet_path), task_packet_schema_path)
        include_validation_commands = args.validation_command_mode == VALIDATION_INCLUDE
        files = build_handoff_files(
            task_packet=task_packet,
            repo_root=repo_root,
            execution_report_schema_path=execution_report_schema_path,
            include_validation_commands=include_validation_commands,
            pretty_prompt=args.pretty,
        )

        files_written = False
        if output_dir is not None:
            ensure_output_dir_allowed(
                output_dir=output_dir,
                repo_root=repo_root,
                forbidden_paths=task_packet["forbidden_paths"],
            )
            write_handoff_pack(output_dir, files)
            files_written = True

        print_summary(task_packet=task_packet, output_dir=output_dir, files_written=files_written)
        return 0
    except json.JSONDecodeError as exc:
        print(f"INPUT_VALIDATION_ERROR: JSON parse failed: {exc}", file=sys.stderr)
        return 1
    except (OSError, ValueError, PermissionError) as exc:
        print(f"INPUT_VALIDATION_ERROR: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # pragma: no cover - defensive hard boundary
        print(f"INTERNAL_ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
