import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any


DEFAULT_QUEUE_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr16_codex_task_queue/codex_task_queue.pr16.json"
)
DEFAULT_PROMPT_PACK_JSON_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr17_codex_prompt_pack/codex_prompt_pack.pr17.json"
)
DEFAULT_PROMPT_PACK_MD_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr17_codex_prompt_pack/codex_prompt_pack.pr17.md"
)
FORBIDDEN_OUTPUT_FRAGMENTS = (
    "lab/runs/",
    "lab/runs\\",
    "latest.json",
    "holdout/",
    "holdout\\",
)
REQUIRED_FINAL_REPORT_TEMPLATE = [
    "Objective:",
    "Modified files:",
    "Commands run:",
    "Command results:",
    "Skipped validation and reason:",
    "Behavior risk:",
    "Evidence risk:",
    "Claim risk:",
    "Verdict:",
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


def safe_slug(raw_value: str) -> str:
    cleaned = "".join(char if char.isalnum() else "-" for char in raw_value.strip().lower())
    return cleaned.strip("-") or "unknown"


def build_prompt_body(task: dict[str, Any], recommended_branch: str) -> str:
    source_position_id = optional_str(task, "source_position_id") or "UNKNOWN_POSITION_ID"
    source_task_id = optional_str(task, "task_id") or "UNKNOWN_TASK_ID"
    objective = optional_str(task, "objective") or "No objective provided."
    fen = optional_str(task, "fen") or "UNKNOWN_FEN"
    selected_by_depth = task.get("selected_by_depth", {})
    scores_by_depth = task.get("scores_by_depth", {})
    candidate_summary = task.get("candidate_summary", {})
    validation_commands = optional_list(task, "validation_commands")

    lines: list[str] = [
        "Implement exactly one focused PR for this task.",
        "",
        "Scope:",
        f"- Source task id: {source_task_id}",
        f"- Source position id: {source_position_id}",
        f"- Recommended branch: {recommended_branch}",
        f"- Objective: {objective}",
        f"- FEN: {fen}",
        f"- selected_by_depth: {json.dumps(selected_by_depth, sort_keys=True)}",
        f"- scores_by_depth: {json.dumps(scores_by_depth, sort_keys=True)}",
        f"- candidate_summary: {json.dumps(candidate_summary, sort_keys=True)}",
        "",
        "Required safety boundaries:",
        "- Non-canonical investigation only.",
        "- Do not run benchmark work and do not interpret benchmark results.",
        "- Do not perform dataset reset.",
        "- Do not touch holdout data.",
        "- Do not write to lab/runs/RUN_*.",
        "- Do not write latest.json.",
        "- Do not make Elo, strength, promotion, or scientific claims.",
        "- Keep claim_verdict as NO_CLAIM_ALLOWED.",
        "- Leave sandbox outputs untracked in git.",
        "",
        "Escalation stop rule:",
        "- If required scope expands to an engine/search/neural broad refactor, stop immediately and report BLOCKED.",
        "",
        "Validation commands to run:",
    ]

    if validation_commands:
        lines.extend(f"- {command}" for command in validation_commands if isinstance(command, str))
    else:
        lines.append("- (no validation commands provided)")

    lines.extend(
        [
            "",
            "Final report template:",
        ]
    )
    lines.extend(REQUIRED_FINAL_REPORT_TEMPLATE)
    return "\n".join(lines)


def build_prompt_item(task: dict[str, Any], prompt_index: int) -> dict[str, Any]:
    source_task_id = optional_str(task, "task_id") or f"UNKNOWN_TASK_{prompt_index:03d}"
    source_position_id = optional_str(task, "source_position_id") or "UNKNOWN_POSITION_ID"
    prompt_id = f"pr17_prompt_{prompt_index:03d}_{source_position_id}"
    recommended_branch = f"codex/pr17-{safe_slug(source_position_id)}"
    prompt_title = f"PR-17 Prompt {prompt_index:03d}: {source_position_id}"
    forbidden_files = optional_list(task, "forbidden_files")
    forbidden_actions = optional_list(task, "forbidden_actions")
    validation_commands = optional_list(task, "validation_commands")
    expected_scope = sorted(
        {
            "scripts/generate_codex_prompt_pack.py",
            "lab/gameplay_observation/**",
            *[entry for entry in optional_list(task, "allowed_files_hint") if isinstance(entry, str)],
        }
    )

    return {
        "prompt_id": prompt_id,
        "source_task_id": source_task_id,
        "source_position_id": source_position_id,
        "task_kind": "CODEX_CODE_MODE_PROMPT",
        "recommended_branch": recommended_branch,
        "prompt_title": prompt_title,
        "prompt_body": build_prompt_body(task, recommended_branch),
        "expected_changed_files_scope": expected_scope,
        "forbidden_files": forbidden_files,
        "forbidden_actions": forbidden_actions,
        "validation_commands": validation_commands,
        "expected_verdict": {
            "software_verdict": "CODEX_PROMPT_PACK_BATCH_ADDED",
            "evidence_verdict": "NON_CANONICAL_ORCHESTRATION_ONLY",
            "claim_verdict": "NO_CLAIM_ALLOWED",
        },
        "human_review_required": True,
        "canonical_evidence": False,
        "promotion_allowed": False,
        "claim_verdict": "NO_CLAIM_ALLOWED",
    }


def write_markdown_prompt_pack(
    md_output_path: Path,
    source_queue_path: Path,
    prompts: list[dict[str, Any]],
) -> None:
    lines: list[str] = [
        "# PR-17 Codex Prompt Pack (Non-Canonical)",
        "",
        "Status: non-canonical orchestration only",
        "Claim status: `NO_CLAIM_ALLOWED`",
        "",
        "## Source",
        "",
        f"- Codex task queue: `{str(source_queue_path).replace('\\', '/')}`",
        "",
        "## Metadata",
        "",
        "- `recommended_execution_mode`: `CODEX_CODE_MODE_REVIEWABLE_PR`",
        "- `human_review_required`: `true`",
        "- `canonical_evidence`: `false`",
        "- `promotion_eligible`: `false`",
        "",
        "## Prompt summary",
        "",
        f"- Total prompts: `{len(prompts)}`",
        "",
        "## Prompt list",
        "",
    ]

    if not prompts:
        lines.append("- No prompts generated from queue tasks.")
        lines.append("")
    else:
        for prompt in prompts:
            lines.extend(
                [
                    f"### {prompt['prompt_id']}",
                    "",
                    f"- `source_task_id`: `{prompt['source_task_id']}`",
                    f"- `source_position_id`: `{prompt['source_position_id']}`",
                    f"- `recommended_branch`: `{prompt['recommended_branch']}`",
                    f"- `prompt_title`: {prompt['prompt_title']}",
                    "- `task_kind`: `CODEX_CODE_MODE_PROMPT`",
                    "- `human_review_required`: `true`",
                    "- `canonical_evidence`: `false`",
                    "- `promotion_allowed`: `false`",
                    "- `claim_verdict`: `NO_CLAIM_ALLOWED`",
                    "",
                    "```text",
                    prompt["prompt_body"],
                    "```",
                    "",
                ]
            )

    lines.extend(
        [
            "## Non-canonical boundaries",
            "",
            "- no `lab/runs/` writes",
            "- no `latest.json`",
            "- no holdout access",
            "- no benchmark interpretation",
            "- no claim or promotion",
        ]
    )

    md_output_path.parent.mkdir(parents=True, exist_ok=True)
    md_output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def generate_prompt_pack(
    queue_path: Path,
    prompt_pack_json_output_path: Path,
    prompt_pack_md_output_path: Path,
) -> dict[str, Any]:
    assert_noncanonical_output_path(prompt_pack_json_output_path)
    assert_noncanonical_output_path(prompt_pack_md_output_path)

    queue_payload = load_json(queue_path)
    if not isinstance(queue_payload, dict):
        raise ValueError("queue must be a JSON object")
    if queue_payload.get("claim_verdict") != "NO_CLAIM_ALLOWED":
        raise ValueError("queue claim_verdict must be NO_CLAIM_ALLOWED")
    if queue_payload.get("canonical_evidence") is not False:
        raise ValueError("queue must remain non-canonical")

    tasks = queue_payload.get("tasks")
    if not isinstance(tasks, list):
        raise ValueError("queue must include tasks list")

    prompts: list[dict[str, Any]] = []
    for index, task in enumerate(tasks, start=1):
        if not isinstance(task, dict):
            raise ValueError(f"task at index {index} is not an object")
        prompts.append(build_prompt_item(task, index))

    output_payload = {
        "schema_version": "pr17.noncanonical_codex_prompt_pack.v1",
        "created_at": utc_now(),
        "source_queue": str(queue_path).replace("\\", "/"),
        "canonical_evidence": False,
        "promotion_eligible": False,
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "total_prompts": len(prompts),
        "recommended_execution_mode": "CODEX_CODE_MODE_REVIEWABLE_PR",
        "human_review_required": True,
        "prompts": prompts,
    }

    prompt_pack_json_output_path.parent.mkdir(parents=True, exist_ok=True)
    prompt_pack_json_output_path.write_text(
        json.dumps(output_payload, indent=2, sort_keys=True), encoding="utf-8"
    )
    write_markdown_prompt_pack(prompt_pack_md_output_path, queue_path, prompts)
    return output_payload


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="PR-17 non-canonical Codex prompt pack generator from PR-16 queue."
    )
    parser.add_argument(
        "--queue",
        default=str(DEFAULT_QUEUE_PATH),
        help="Codex task queue JSON from scripts/generate_codex_task_queue.py.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print output JSON to stdout.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        output_payload = generate_prompt_pack(
            Path(args.queue),
            DEFAULT_PROMPT_PACK_JSON_PATH,
            DEFAULT_PROMPT_PACK_MD_PATH,
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

    print(json.dumps(output_payload, indent=2 if args.pretty else None, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
