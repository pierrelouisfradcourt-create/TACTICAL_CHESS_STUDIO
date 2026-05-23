import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any


DEFAULT_PROMPT_PACK_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr17_codex_prompt_pack/codex_prompt_pack.pr17.json"
)
DEFAULT_EXECUTION_PACKET_JSON_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr18_codex_execution_packet/codex_execution_packet.pr18.json"
)
DEFAULT_EXECUTION_PACKET_MD_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr18_codex_execution_packet/codex_execution_packet.pr18.md"
)
FORBIDDEN_OUTPUT_FRAGMENTS = (
    "lab/runs/",
    "lab/runs\\",
    "latest.json",
    "holdout/",
    "holdout\\",
)
REQUIRED_FORBIDDEN_FILES = [
    "src/tool/cli.rs",
    "scripts/parse_run_bundle.py",
    ".github/workflows/**",
    "lab/runs/**",
    "latest.json",
    "holdout/**",
]
REQUIRED_FORBIDDEN_ACTIONS = [
    "non-canonical investigation only",
    "no benchmark",
    "no dataset reset",
    "no holdout",
    "no lab/runs/RUN_*",
    "no latest.json",
    "no Elo / strength / promotion / scientific claim",
]
MANUAL_EXECUTION_CHECKLIST = [
    "paste prompt into Codex Code Mode",
    "wait for draft PR",
    "verify diff scope",
    "verify checks",
    "human decides ready/merge/reject",
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def is_safe_relative_path(path: Path) -> bool:
    raw = str(path).replace("\\", "/")
    if PureWindowsPath(raw).is_absolute() or PurePosixPath(raw).is_absolute():
        return False
    return ".." not in PurePosixPath(raw).parts


def assert_noncanonical_output_path(path: Path) -> None:
    raw = str(path).replace("\\", "/").lower()
    if not is_safe_relative_path(path):
        raise ValueError(f"unsafe path: {path}")
    if any(fragment in raw for fragment in FORBIDDEN_OUTPUT_FRAGMENTS):
        raise ValueError(f"forbidden output path: {path}")
    if not raw.startswith("lab/gameplay_observation/sandbox_outputs/"):
        raise ValueError("output path must remain under lab/gameplay_observation/sandbox_outputs/")


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def optional_str(source: dict[str, Any], key: str) -> str | None:
    value = source.get(key)
    return value if isinstance(value, str) else None


def optional_list(source: dict[str, Any], key: str) -> list[Any]:
    value = source.get(key)
    return value if isinstance(value, list) else []


def unique_strings(values: list[Any]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in values:
        if isinstance(value, str) and value not in seen:
            output.append(value)
            seen.add(value)
    return output


def select_prompt(
    prompts: list[dict[str, Any]],
    prompt_id: str | None,
    index: int | None,
) -> dict[str, Any]:
    if prompt_id and index is not None:
        raise ValueError("use either --prompt-id or --index, not both")
    if not prompts:
        raise ValueError("prompt pack contains no prompts")

    if prompt_id:
        for prompt in prompts:
            if optional_str(prompt, "prompt_id") == prompt_id:
                return prompt
        raise ValueError(f"prompt_id not found: {prompt_id}")

    if index is not None:
        if index < 0 or index >= len(prompts):
            raise ValueError(f"index out of range: {index} (size={len(prompts)})")
        return prompts[index]

    return prompts[0]


def write_markdown_execution_packet(md_output_path: Path, packet: dict[str, Any]) -> None:
    lines: list[str] = [
        "# PR-18 Codex Execution Packet (Non-Canonical)",
        "",
        "Status: non-canonical orchestration only",
        "Claim status: `NO_CLAIM_ALLOWED`",
        "",
        "## Packet metadata",
        "",
        f"- `schema_version`: `{packet['schema_version']}`",
        f"- `created_at`: `{packet['created_at']}`",
        f"- `source_prompt_pack`: `{packet['source_prompt_pack']}`",
        f"- `selected_prompt_id`: `{packet['selected_prompt_id']}`",
        f"- `selected_source_task_id`: `{packet['selected_source_task_id']}`",
        f"- `selected_source_position_id`: `{packet['selected_source_position_id']}`",
        f"- `recommended_branch`: `{packet['recommended_branch']}`",
        "- `canonical_evidence`: `false`",
        "- `promotion_eligible`: `false`",
        "- `claim_verdict`: `NO_CLAIM_ALLOWED`",
        "- `human_review_required`: `true`",
        "",
        "## Prompt",
        "",
        f"- `prompt_title`: {packet['prompt_title']}",
        "",
        "```text",
        packet["prompt_body"],
        "```",
        "",
        "## Validation commands",
        "",
    ]

    validation_commands = packet["validation_commands"]
    if validation_commands:
        lines.extend(f"- `{command}`" for command in validation_commands)
    else:
        lines.append("- (none)")

    lines.extend(
        [
            "",
            "## Expected changed files scope",
            "",
        ]
    )
    lines.extend(f"- `{entry}`" for entry in packet["expected_changed_files_scope"])

    lines.extend(
        [
            "",
            "## Forbidden files",
            "",
        ]
    )
    lines.extend(f"- `{entry}`" for entry in packet["forbidden_files"])

    lines.extend(
        [
            "",
            "## Forbidden actions",
            "",
        ]
    )
    lines.extend(f"- {entry}" for entry in packet["forbidden_actions"])

    lines.extend(
        [
            "",
            "## Manual execution checklist",
            "",
        ]
    )
    lines.extend(f"- [ ] {entry}" for entry in packet["manual_execution_checklist"])

    md_output_path.parent.mkdir(parents=True, exist_ok=True)
    md_output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def generate_execution_packet(
    prompt_pack_path: Path,
    prompt_id: str | None,
    index: int | None,
) -> dict[str, Any]:
    assert_noncanonical_output_path(DEFAULT_EXECUTION_PACKET_JSON_PATH)
    assert_noncanonical_output_path(DEFAULT_EXECUTION_PACKET_MD_PATH)

    prompt_pack = load_json(prompt_pack_path)
    if not isinstance(prompt_pack, dict):
        raise ValueError("prompt pack must be a JSON object")
    if prompt_pack.get("claim_verdict") != "NO_CLAIM_ALLOWED":
        raise ValueError("prompt pack claim_verdict must be NO_CLAIM_ALLOWED")
    if prompt_pack.get("canonical_evidence") is not False:
        raise ValueError("prompt pack must remain non-canonical")

    raw_prompts = prompt_pack.get("prompts")
    if not isinstance(raw_prompts, list):
        raise ValueError("prompt pack must include prompts list")

    prompts: list[dict[str, Any]] = []
    for item in raw_prompts:
        if isinstance(item, dict):
            prompts.append(item)

    selected_prompt = select_prompt(prompts, prompt_id, index)

    prompt_identifier = optional_str(selected_prompt, "prompt_id") or "UNKNOWN_PROMPT_ID"
    source_task_id = optional_str(selected_prompt, "source_task_id") or "UNKNOWN_TASK_ID"
    source_position_id = optional_str(selected_prompt, "source_position_id") or "UNKNOWN_POSITION_ID"
    prompt_title = optional_str(selected_prompt, "prompt_title") or prompt_identifier
    prompt_body = optional_str(selected_prompt, "prompt_body") or ""
    recommended_branch = optional_str(selected_prompt, "recommended_branch") or "codex/pr18-execution"
    validation_commands = unique_strings(optional_list(selected_prompt, "validation_commands"))
    expected_changed_files_scope = unique_strings(
        optional_list(selected_prompt, "expected_changed_files_scope")
    )
    forbidden_files = unique_strings(
        optional_list(selected_prompt, "forbidden_files") + REQUIRED_FORBIDDEN_FILES
    )
    forbidden_actions = unique_strings(
        optional_list(selected_prompt, "forbidden_actions") + REQUIRED_FORBIDDEN_ACTIONS
    )

    if not expected_changed_files_scope:
        expected_changed_files_scope = [
            "scripts/prepare_codex_execution_packet.py",
            "lab/gameplay_observation/**",
        ]

    packet = {
        "schema_version": "pr18.noncanonical_codex_execution_packet.v1",
        "created_at": utc_now(),
        "source_prompt_pack": str(prompt_pack_path).replace("\\", "/"),
        "selected_prompt_id": prompt_identifier,
        "selected_source_task_id": source_task_id,
        "selected_source_position_id": source_position_id,
        "prompt_title": prompt_title,
        "prompt_body": prompt_body,
        "recommended_branch": recommended_branch,
        "validation_commands": validation_commands,
        "expected_changed_files_scope": expected_changed_files_scope,
        "forbidden_files": forbidden_files,
        "forbidden_actions": forbidden_actions,
        "manual_execution_checklist": MANUAL_EXECUTION_CHECKLIST,
        "canonical_evidence": False,
        "promotion_eligible": False,
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "human_review_required": True,
    }

    DEFAULT_EXECUTION_PACKET_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    DEFAULT_EXECUTION_PACKET_JSON_PATH.write_text(
        json.dumps(packet, indent=2, sort_keys=True), encoding="utf-8"
    )
    write_markdown_execution_packet(DEFAULT_EXECUTION_PACKET_MD_PATH, packet)
    return packet


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="PR-18 non-canonical Codex execution packet scaffold generator from PR-17 prompt pack."
    )
    parser.add_argument(
        "--prompt-pack",
        default=str(DEFAULT_PROMPT_PACK_PATH),
        help="Codex prompt pack JSON from scripts/generate_codex_prompt_pack.py.",
    )
    parser.add_argument(
        "--prompt-id",
        default=None,
        help="Prompt id to select from prompt pack.",
    )
    parser.add_argument(
        "--index",
        type=int,
        default=None,
        help="0-based prompt index to select from prompt pack.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print packet JSON to stdout.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        packet = generate_execution_packet(
            Path(args.prompt_pack),
            args.prompt_id,
            args.index,
        )
    except Exception as exc:
        error_payload = {
            "software_verdict": "BLOCKED",
            "evidence_verdict": "INVALID",
            "claim_verdict": "NO_CLAIM_ALLOWED",
            "error": str(exc),
        }
        print(json.dumps(error_payload, indent=2 if args.pretty else None, sort_keys=True))
        return 1

    print(json.dumps(packet, indent=2 if args.pretty else None, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
