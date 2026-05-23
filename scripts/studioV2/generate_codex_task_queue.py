import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any


DEFAULT_TRIAGE_REPORT_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr15_triage/triage_report.pr15.json"
)
DEFAULT_QUEUE_JSON_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr16_codex_task_queue/codex_task_queue.pr16.json"
)
DEFAULT_QUEUE_MD_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr16_codex_task_queue/codex_task_queue.pr16.md"
)
FORBIDDEN_OUTPUT_FRAGMENTS = (
    "lab/runs/",
    "lab/runs\\",
    "latest.json",
    "holdout/",
    "holdout\\",
)
TASK_INCLUDE_LABELS = {
    "NEEDS_TARGETED_INVESTIGATION",
    "DEPTH_SENSITIVE_OBSERVATION",
}
EXTRA_NONCANONICAL_INCLUDE_LABELS = {
    "STABLE_OBSERVATION",
}
TASK_SKIP_LABELS = {
    "STABLE_OBSERVATION",
    "DISCARD_LOW_SIGNAL",
    "INVALID_OBSERVATION",
}


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


def optional_dict(source: dict[str, Any], key: str) -> dict[str, Any]:
    value = source.get(key)
    return value if isinstance(value, dict) else {}


def build_candidate_summary(position: dict[str, Any]) -> dict[str, Any]:
    selected_by_depth = optional_dict(position, "selected_by_depth")
    scores_by_depth = optional_dict(position, "scores_by_depth")
    candidate_count_by_depth = optional_dict(position, "candidate_count_by_depth")
    score_gap_by_depth = optional_dict(position, "score_gap_by_depth")

    selected_moves = sorted(
        set(move for move in selected_by_depth.values() if isinstance(move, str))
    )
    numeric_scores = [score for score in scores_by_depth.values() if isinstance(score, int)]
    score_span = max(numeric_scores) - min(numeric_scores) if len(numeric_scores) >= 2 else None

    return {
        "rationale": optional_str(position, "rationale") or "No triage rationale provided.",
        "selected_move_count": len(selected_moves),
        "selected_moves": selected_moves,
        "score_span": score_span,
        "candidate_count_by_depth": candidate_count_by_depth or None,
        "score_gap_by_depth": score_gap_by_depth or None,
    }


def build_objective(position: dict[str, Any]) -> str:
    triage_label = optional_str(position, "triage_label") or "UNKNOWN_LABEL"
    position_id = optional_str(position, "position_id") or "UNKNOWN_POSITION_ID"
    if triage_label == "STABLE_OBSERVATION":
        return (
            "Run a non-canonical stability-review follow-up for "
            f"{position_id} ({triage_label}) and capture descriptive diagnostics only; "
            "no benchmark interpretation, no claim, and no canonical evidence."
        )
    return (
        "Run a non-canonical targeted investigation for "
        f"{position_id} ({triage_label}) and capture descriptive diagnostics only; "
        "no benchmark interpretation, no claim, and no canonical evidence."
    )


def build_task(position: dict[str, Any], task_index: int) -> dict[str, Any]:
    position_id = optional_str(position, "position_id") or "UNKNOWN_POSITION_ID"
    fen = optional_str(position, "fen") or "UNKNOWN_FEN"
    triage_label = optional_str(position, "triage_label") or "INVALID_OBSERVATION"
    selected_by_depth = optional_dict(position, "selected_by_depth")
    scores_by_depth = optional_dict(position, "scores_by_depth")

    return {
        "task_id": f"pr16_task_{task_index:03d}_{position_id}",
        "task_kind": "NON_CANONICAL_CODEX_INVESTIGATION",
        "source_position_id": position_id,
        "fen": fen,
        "triage_label": triage_label,
        "selected_by_depth": selected_by_depth,
        "scores_by_depth": scores_by_depth,
        "candidate_summary": build_candidate_summary(position),
        "objective": build_objective(position),
        "allowed_files_hint": [
            "scripts/run_gameplay_observation.py",
            "scripts/triage_gameplay_observation.py",
            "scripts/generate_codex_task_queue.py",
            "lab/gameplay_observation/non_converting_positions/",
            "lab/gameplay_observation/sandbox_outputs/",
        ],
        "forbidden_files": [
            "src/tool/cli.rs",
            "scripts/parse_run_bundle.py",
            ".github/workflows/**",
            "lab/runs/**",
            "latest.json",
            "holdout/**",
        ],
        "forbidden_actions": [
            "Do not produce canonical RUN evidence.",
            "Do not write under lab/runs/.",
            "Do not modify holdout data.",
            "Do not make Elo, strength, promotion, or scientific claims.",
            "Do not perform benchmark interpretation.",
            "Do not execute dataset reset.",
        ],
        "validation_commands": [
            ".\\.venv312\\Scripts\\python.exe -m py_compile scripts/run_gameplay_observation.py",
            ".\\.venv312\\Scripts\\python.exe -m py_compile scripts/triage_gameplay_observation.py",
            ".\\.venv312\\Scripts\\python.exe -m py_compile scripts/generate_codex_task_queue.py",
            "cargo check",
            "cargo test fen_round_trip -- --nocapture",
        ],
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "promotion_allowed": False,
        "canonical_evidence": False,
    }


def write_markdown_handoff(
    md_output_path: Path,
    source_triage_report: Path,
    tasks: list[dict[str, Any]],
    skipped_positions: list[dict[str, Any]],
    include_extra_noncanonical_positions: bool,
) -> None:
    lines: list[str] = [
        "# PR-16 Codex Task Queue (Non-Canonical)",
        "",
        "Status: non-canonical orchestration only",
        "Claim status: `NO_CLAIM_ALLOWED`",
        "",
        "## Source",
        "",
        f"- Triage report: `{str(source_triage_report).replace('\\', '/')}`",
        "",
        "## Execution mode",
        "",
        "- `CODEX_CODE_MODE_REVIEWABLE_PR`",
        "- Codex may implement a future investigation PR.",
        "- Codex may not make claims.",
        "- Codex may not touch holdout.",
        "- Codex may not create canonical RUN evidence.",
        "- Human must review and merge or reject.",
        f"- Extra non-canonical positions included: `{str(include_extra_noncanonical_positions).lower()}`",
        "",
        "## Task queue summary",
        "",
        f"- Total tasks: `{len(tasks)}`",
        f"- Skipped entries: `{len(skipped_positions)}`",
        "",
        "## Task list",
        "",
    ]

    if not tasks:
        lines.append("- No eligible tasks found in triage labels.")
        lines.append("")
    else:
        for task in tasks:
            lines.extend(
                [
                    f"### {task['task_id']}",
                    "",
                    f"- `source_position_id`: `{task['source_position_id']}`",
                    f"- `triage_label`: `{task['triage_label']}`",
                    f"- `fen`: `{task['fen']}`",
                    f"- `objective`: {task['objective']}",
                    f"- `selected_by_depth`: `{json.dumps(task['selected_by_depth'], sort_keys=True)}`",
                    f"- `scores_by_depth`: `{json.dumps(task['scores_by_depth'], sort_keys=True)}`",
                    f"- `candidate_summary`: `{json.dumps(task['candidate_summary'], sort_keys=True)}`",
                    "",
                ]
            )

    lines.extend(
        [
            "## Skipped entries",
            "",
            "| position_id | triage_label | reason |",
            "|---|---|---|",
        ]
    )

    if not skipped_positions:
        lines.append("| (none) | (none) | (none) |")
    else:
        for skipped in skipped_positions:
            lines.append(
                f"| {skipped['position_id']} | {skipped['triage_label']} | "
                f"{skipped['reason'].replace('|', '/')} |"
            )

    lines.extend(
        [
            "",
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


def generate_queue(
    triage_report_path: Path,
    queue_json_output_path: Path,
    queue_md_output_path: Path,
    include_extra_noncanonical_positions: bool = False,
) -> dict[str, Any]:
    assert_noncanonical_output_path(queue_json_output_path)
    assert_noncanonical_output_path(queue_md_output_path)

    triage_payload = load_json(triage_report_path)
    if not isinstance(triage_payload, dict):
        raise ValueError("triage report must be a JSON object")
    if triage_payload.get("claim_verdict") != "NO_CLAIM_ALLOWED":
        raise ValueError("triage report claim_verdict must be NO_CLAIM_ALLOWED")
    if triage_payload.get("canonical_evidence") is not False:
        raise ValueError("triage report must remain non-canonical")

    positions = triage_payload.get("positions")
    if not isinstance(positions, list) or not positions:
        raise ValueError("triage report must include non-empty positions")

    tasks: list[dict[str, Any]] = []
    included_position_indexes: set[int] = set()
    skipped_positions: list[dict[str, Any]] = []

    def include_matching_positions(include_labels: set[str]) -> None:
        for position_index, position in enumerate(positions):
            if position_index in included_position_indexes:
                continue
            if not isinstance(position, dict):
                continue
            triage_label = optional_str(position, "triage_label") or "INVALID_OBSERVATION"
            if triage_label in include_labels:
                tasks.append(build_task(position, len(tasks) + 1))
                included_position_indexes.add(position_index)

    include_matching_positions(TASK_INCLUDE_LABELS)
    if include_extra_noncanonical_positions:
        include_matching_positions(EXTRA_NONCANONICAL_INCLUDE_LABELS)

    for position_index, position in enumerate(positions):
        if position_index in included_position_indexes:
            continue
        if not isinstance(position, dict):
            skipped_positions.append(
                {
                    "position_id": "UNKNOWN_POSITION_ID",
                    "triage_label": "INVALID_OBSERVATION",
                    "reason": "position entry is not an object",
                }
            )
            continue

        position_id = optional_str(position, "position_id") or "UNKNOWN_POSITION_ID"
        triage_label = optional_str(position, "triage_label") or "INVALID_OBSERVATION"
        rationale = optional_str(position, "rationale") or "No triage rationale provided."

        if triage_label in TASK_SKIP_LABELS:
            skipped_positions.append(
                {
                    "position_id": position_id,
                    "triage_label": triage_label,
                    "reason": rationale,
                }
            )
            continue

        skipped_positions.append(
            {
                "position_id": position_id,
                "triage_label": triage_label,
                "reason": "unsupported triage label; skipped by safety gate",
            }
        )

    skipped_labels_count: dict[str, int] = {}
    for skipped in skipped_positions:
        label = skipped["triage_label"]
        skipped_labels_count[label] = skipped_labels_count.get(label, 0) + 1

    output_payload = {
        "schema_version": "pr16.noncanonical_codex_task_queue.v1",
        "created_at": utc_now(),
        "source_triage_report": str(triage_report_path).replace("\\", "/"),
        "canonical_evidence": False,
        "promotion_eligible": False,
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "software_verdict": "CODEX_TASK_QUEUE_BATCH_ADDED",
        "evidence_verdict": "NON_CANONICAL_ORCHESTRATION_ONLY",
        "total_tasks": len(tasks),
        "skipped_count": len(skipped_positions),
        "skipped_labels_count": skipped_labels_count,
        "include_extra_noncanonical_positions": include_extra_noncanonical_positions,
        "included_labels": sorted(
            TASK_INCLUDE_LABELS
            | (EXTRA_NONCANONICAL_INCLUDE_LABELS if include_extra_noncanonical_positions else set())
        ),
        "extra_noncanonical_labels": sorted(
            EXTRA_NONCANONICAL_INCLUDE_LABELS if include_extra_noncanonical_positions else set()
        ),
        "recommended_execution_mode": "CODEX_CODE_MODE_REVIEWABLE_PR",
        "recommended_execution_notes": [
            "Codex may implement a future investigation PR.",
            "Codex may not make claims.",
            "Codex may not touch holdout.",
            "Codex may not create canonical RUN evidence.",
            "Human must review and merge or reject.",
        ],
        "human_review_required": True,
        "tasks": tasks,
        "skipped": skipped_positions,
    }

    queue_json_output_path.parent.mkdir(parents=True, exist_ok=True)
    queue_json_output_path.write_text(
        json.dumps(output_payload, indent=2, sort_keys=True), encoding="utf-8"
    )
    write_markdown_handoff(
        queue_md_output_path,
        triage_report_path,
        tasks,
        skipped_positions,
        include_extra_noncanonical_positions,
    )
    return output_payload


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="PR-16 non-canonical Codex task queue generator from PR-15 triage output."
    )
    parser.add_argument(
        "--triage-report",
        default=str(DEFAULT_TRIAGE_REPORT_PATH),
        help="Triage report JSON from scripts/triage_gameplay_observation.py.",
    )
    parser.add_argument(
        "--include-extra-noncanonical-positions",
        action="store_true",
        help=(
            "Append already-triaged lower-priority non-canonical positions after the default "
            "task set, preserving existing default task ids."
        ),
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print queue JSON to stdout.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        output_payload = generate_queue(
            Path(args.triage_report),
            DEFAULT_QUEUE_JSON_PATH,
            DEFAULT_QUEUE_MD_PATH,
            include_extra_noncanonical_positions=args.include_extra_noncanonical_positions,
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
