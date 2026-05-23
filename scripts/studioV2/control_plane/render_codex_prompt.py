import argparse
import json
import sys
from pathlib import Path, PurePosixPath
from typing import Any

try:
    import jsonschema
except ImportError:
    print("BLOCKED_MISSING_JSONSCHEMA")
    raise SystemExit(2)


TASK_PACKET_SCHEMA_PATH = Path("schemas") / "studiopilot_task_packet.schema.json"
MODE_HEADER = "MODE: CODEX - IMPLEMENT TASK FROM STUDIOPILOT TASKPACKET / DRY-RUN ONLY"
VALIDATION_INCLUDE = "include"
VALIDATION_OMIT = "omit"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render a deterministic Codex prompt from a validated StudioPilot TaskPacket JSON."
    )
    parser.add_argument("task_packet_path", help="Path to StudioPilot TaskPacket JSON file.")
    parser.add_argument("--output", help="Optional file path to write rendered prompt.")
    parser.add_argument("--pretty", action="store_true", help="Render prompt with extra spacing for readability.")
    parser.add_argument(
        "--repo-path",
        default=".",
        help="Repository root path used for schema lookup and path checks. Defaults to current directory.",
    )
    parser.add_argument(
        "--validation-command-mode",
        choices=(VALIDATION_INCLUDE, VALIDATION_OMIT),
        default=VALIDATION_INCLUDE,
        help="Choose whether to include or omit validation commands in the rendered prompt.",
    )
    return parser.parse_args()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def make_validator(schema_obj: dict[str, Any]) -> jsonschema.protocols.Validator:
    validator_class = jsonschema.validators.validator_for(schema_obj)
    validator_class.check_schema(schema_obj)
    format_checker = getattr(validator_class, "FORMAT_CHECKER", None)
    if format_checker is None:
        return validator_class(schema_obj)
    return validator_class(schema_obj, format_checker=format_checker)


def render_list(items: list[str], indent: str = "- ") -> list[str]:
    return [f"{indent}{item}" for item in items]


def join_sections(sections: list[list[str]], pretty: bool) -> str:
    separator = "\n\n" if pretty else "\n"
    rendered_sections = [section for section in sections if section]
    return separator.join("\n".join(lines) for lines in rendered_sections) + "\n"


def path_matches_forbidden(repo_relative_path: str, forbidden_patterns: list[str]) -> bool:
    normalized = PurePosixPath(repo_relative_path.replace("\\", "/"))
    for pattern in forbidden_patterns:
        normalized_pattern = pattern.replace("\\", "/")
        if normalized.match(normalized_pattern):
            return True
    return False


def ensure_output_path_allowed(output_path: Path, repo_root: Path, forbidden_paths: list[str]) -> None:
    if output_path.exists():
        raise FileExistsError(f"Refusing to overwrite existing file: {output_path}")
    if not output_path.parent.exists():
        raise FileNotFoundError(f"Output directory does not exist: {output_path.parent}")

    resolved_output = output_path.resolve()
    resolved_repo = repo_root.resolve()
    try:
        repo_relative = resolved_output.relative_to(resolved_repo).as_posix()
    except ValueError:
        return

    if path_matches_forbidden(repo_relative, forbidden_paths):
        raise PermissionError(
            f"Output path is inside a forbidden path pattern: {repo_relative}"
        )


def render_prompt(
    task_packet: dict[str, Any],
    repo_root: Path,
    include_validation_commands: bool,
    pretty: bool,
) -> str:
    sections: list[list[str]] = []

    mission_line = f"{task_packet['task_id']}: {task_packet['title']}"

    sections.append([MODE_HEADER])
    sections.append(["Repository local:", str(repo_root.resolve())])
    sections.append(["Mission:", mission_line, f"Intent: {task_packet['intent']}"])
    sections.append(["Lane:", task_packet["lane"]])
    sections.append(["Allowed paths:"] + render_list(task_packet["allowed_paths"]))
    sections.append(["Forbidden paths:"] + render_list(task_packet["forbidden_paths"]))
    sections.append(["Expected outputs:"] + render_list(task_packet["expected_outputs"]))

    if include_validation_commands:
        sections.append(
            ["Validation commands (execute exactly, no substitutions):"]
            + render_list(task_packet["validation_commands"])
        )
    else:
        sections.append(["Validation commands: omitted by --validation-command-mode omit"])

    sections.append(["Rollback plan:", task_packet["rollback_plan"]])
    sections.append(["Claim scope:", task_packet["claim_scope"]])
    sections.append(["Human gate required:", str(task_packet["human_gate_required"]).lower()])
    sections.append(
        ["Absolute prohibitions:"]
        + render_list(
            [
                "Do not modify paths outside allowed_paths.",
                "Do not run benchmarks unless explicitly listed in validation_commands.",
                "Do not run training.",
                "Do not use network/API.",
                "Do not create or merge PR unless explicitly instructed.",
                "Do not make claims beyond claim_scope.",
            ]
        )
    )
    sections.append(
        ["Required final report:"]
        + render_list(
            [
                "Files changed.",
                "Commands run.",
                "Validation results.",
                "Skipped validation.",
                "Risks.",
                "Verdicts (software_verdict, evidence_verdict, claim_verdict).",
            ]
        )
    )

    return join_sections(sections, pretty=pretty)


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_path).resolve()
    task_packet_path = Path(args.task_packet_path).resolve()
    output_path = Path(args.output).resolve() if args.output else None

    try:
        schema_path = repo_root / TASK_PACKET_SCHEMA_PATH
        if not schema_path.exists():
            print(f"schema_not_found: {schema_path}", file=sys.stderr)
            return 2
        if not task_packet_path.exists():
            print(f"task_packet_not_found: {task_packet_path}", file=sys.stderr)
            return 2

        schema_obj = read_json(schema_path)
        task_packet = read_json(task_packet_path)
        validator = make_validator(schema_obj)
        validation_errors = sorted(
            validator.iter_errors(task_packet),
            key=lambda err: list(err.absolute_path),
        )
        if validation_errors:
            print("task_packet_schema_validation_failed", file=sys.stderr)
            for err in validation_errors:
                absolute_path = "/".join(str(part) for part in err.absolute_path)
                path_label = absolute_path if absolute_path else "<root>"
                print(f"- {path_label}: {err.message}", file=sys.stderr)
            return 1

        include_validation_commands = args.validation_command_mode == VALIDATION_INCLUDE
        prompt = render_prompt(
            task_packet=task_packet,
            repo_root=repo_root,
            include_validation_commands=include_validation_commands,
            pretty=args.pretty,
        )

        if output_path is None:
            print(prompt, end="")
            return 0

        ensure_output_path_allowed(
            output_path=output_path,
            repo_root=repo_root,
            forbidden_paths=task_packet["forbidden_paths"],
        )
        output_path.write_text(prompt, encoding="utf-8")
        print(f"rendered_prompt_written: {output_path}")
        return 0
    except json.JSONDecodeError as exc:
        print(f"json_parse_error: {exc}", file=sys.stderr)
        return 2
    except OSError as exc:
        print(f"io_error: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:  # pragma: no cover - guardrail for internal failures
        print(f"internal_error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
