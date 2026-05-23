import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any


DEFAULT_REPORT_PATH = Path(
    "lab/gameplay_observation/sandbox_outputs/pr14_gameplay_surface/observation_report.pr14_gameplay_surface.json"
)
DEFAULT_OUTPUT_PATH = Path("lab/gameplay_observation/sandbox_outputs/pr15_triage/triage_report.pr15.json")
FORBIDDEN_OUTPUT_FRAGMENTS = (
    "lab/runs/",
    "lab/runs\\",
    "latest.json",
    "holdout/",
    "holdout\\",
)
TRIAGE_LABELS = {
    "STABLE_OBSERVATION",
    "DEPTH_SENSITIVE_OBSERVATION",
    "NEEDS_TARGETED_INVESTIGATION",
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


def assert_noncanonical_path(path: Path) -> None:
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


def optional_int(source: dict[str, Any], key: str) -> int | None:
    value = source.get(key)
    return value if isinstance(value, int) else None


def optional_str(source: dict[str, Any], key: str) -> str | None:
    value = source.get(key)
    return value if isinstance(value, str) else None


def normalize_depth(row: dict[str, Any]) -> int | None:
    return optional_int(row, "completed_depth") or optional_int(row, "requested_depth")


def build_next_codex_task(position_id: str, fen: str, rationale: str) -> dict[str, Any]:
    return {
        "task_kind": "NON_CANONICAL_RUNTIME_INVESTIGATION",
        "source_position_id": position_id,
        "objective": (
            "Investigate depth-sensitive selected_move changes for this non-canonical position and "
            "capture descriptive runtime diagnostics only."
        ),
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "allowed_files_hint": [
            "scripts/run_gameplay_observation.py",
            "scripts/triage_gameplay_observation.py",
            "lab/gameplay_observation/non_converting_positions/",
            "lab/gameplay_observation/sandbox_outputs/",
        ],
        "forbidden": [
            "lab/runs/RUN_*",
            "lab/runs/latest.json",
            "holdout datasets",
            "benchmark interpretation",
            "promotion or strength claim",
        ],
        "notes": [
            "NON_CANONICAL_ONLY",
            "Use sandbox outputs only",
            f"FEN: {fen}",
            f"Triage rationale: {rationale}",
        ],
    }


def classify_position(
    depths_observed: list[int],
    selected_by_depth: dict[str, str],
    scores_by_depth: dict[str, int],
    candidate_count_by_depth: dict[str, int],
    score_gap_by_depth: dict[str, int],
    stable_selected_move: bool | None,
    changed_selected_move: bool | None,
    row_errors: list[str],
) -> tuple[str, str]:
    if row_errors:
        return "INVALID_OBSERVATION", "; ".join(row_errors)
    if len(depths_observed) < 2:
        return "DISCARD_LOW_SIGNAL", "Observed fewer than two depths."
    if not selected_by_depth:
        return "DISCARD_LOW_SIGNAL", "No selected_move values were recorded."

    score_values = list(scores_by_depth.values())
    score_span = max(score_values) - min(score_values) if len(score_values) >= 2 else None
    score_sign_flip = len(score_values) >= 2 and min(score_values) < 0 < max(score_values)
    gap_values = list(score_gap_by_depth.values())
    gap_variation = len(set(gap_values)) > 1 if len(gap_values) >= 2 else False
    candidate_variation = len(set(candidate_count_by_depth.values())) > 1 if len(candidate_count_by_depth) >= 2 else False

    if changed_selected_move is True:
        if score_sign_flip or (score_span is not None and score_span >= 300) or gap_variation:
            reasons = []
            if score_sign_flip:
                reasons.append("score sign flips across observed depths")
            if score_span is not None and score_span >= 300:
                reasons.append(f"score span is high ({score_span})")
            if gap_variation:
                reasons.append("score_gap changes across depths")
            return "NEEDS_TARGETED_INVESTIGATION", ", ".join(reasons)
        return "DEPTH_SENSITIVE_OBSERVATION", "selected_move changes across depths with moderate score variation."

    if stable_selected_move is True:
        if candidate_variation:
            return "STABLE_OBSERVATION", "selected_move is stable while candidate_count varies."
        return "STABLE_OBSERVATION", "selected_move remains stable across observed depths."

    return "DISCARD_LOW_SIGNAL", "Insufficient stable/changed signal after parsing the depth sweep."


def triage_depth_summary(depth_summary: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any] | None]:
    row_errors: list[str] = []
    position_id = optional_str(depth_summary, "position_id")
    fen = optional_str(depth_summary, "fen")
    if not position_id:
        row_errors.append("missing position_id")
        position_id = "UNKNOWN_POSITION_ID"
    if not fen:
        row_errors.append("missing fen")
        fen = "UNKNOWN_FEN"

    depth_rows_raw = depth_summary.get("depth_rows")
    if not isinstance(depth_rows_raw, list) or not depth_rows_raw:
        row_errors.append("missing depth_rows")
        depth_rows: list[dict[str, Any]] = []
    else:
        depth_rows = [row for row in depth_rows_raw if isinstance(row, dict)]
        if len(depth_rows) != len(depth_rows_raw):
            row_errors.append("non-object row found in depth_rows")

    depths_observed: list[int] = []
    selected_by_depth: dict[str, str] = {}
    scores_by_depth: dict[str, int] = {}
    candidate_count_by_depth: dict[str, int] = {}
    score_gap_by_depth: dict[str, int] = {}

    for row in depth_rows:
        depth = normalize_depth(row)
        if depth is None:
            row_errors.append("row missing completed_depth/requested_depth")
            continue
        depth_key = str(depth)
        depths_observed.append(depth)

        observation_status = optional_str(row, "observation_status")
        runtime_status = optional_str(row, "runtime_status")
        if observation_status != "PASS":
            row_errors.append(f"depth {depth} observation_status={observation_status!r}")
        if runtime_status != "ok":
            row_errors.append(f"depth {depth} runtime_status={runtime_status!r}")

        selected_move = optional_str(row, "selected_move")
        if selected_move:
            selected_by_depth[depth_key] = selected_move
        search_score = optional_int(row, "search_score")
        if search_score is not None:
            scores_by_depth[depth_key] = search_score
        candidate_count = optional_int(row, "candidate_count")
        if candidate_count is not None:
            candidate_count_by_depth[depth_key] = candidate_count
        score_gap = optional_int(row, "score_gap")
        if score_gap is not None:
            score_gap_by_depth[depth_key] = score_gap

    depths_observed_sorted = sorted(dict.fromkeys(depths_observed))
    unique_selected_moves = sorted(set(selected_by_depth.values()))
    derived_stable = len(unique_selected_moves) == 1 if unique_selected_moves else None
    derived_changed = len(unique_selected_moves) > 1 if unique_selected_moves else None

    stable_flag = depth_summary.get("stable_selected_move")
    changed_flag = depth_summary.get("changed_selected_move")
    stable_selected_move = stable_flag if isinstance(stable_flag, bool) else derived_stable
    changed_selected_move = changed_flag if isinstance(changed_flag, bool) else derived_changed

    triage_label, rationale = classify_position(
        depths_observed_sorted,
        selected_by_depth,
        scores_by_depth,
        candidate_count_by_depth,
        score_gap_by_depth,
        stable_selected_move,
        changed_selected_move,
        row_errors,
    )

    if triage_label not in TRIAGE_LABELS:
        raise ValueError(f"unsupported triage label: {triage_label}")

    next_codex_task = None
    if triage_label == "NEEDS_TARGETED_INVESTIGATION":
        next_codex_task = build_next_codex_task(position_id, fen, rationale)

    position_packet: dict[str, Any] = {
        "position_id": position_id,
        "fen": fen,
        "depths_observed": depths_observed_sorted,
        "selected_by_depth": selected_by_depth,
        "scores_by_depth": scores_by_depth,
        "stable_selected_move": stable_selected_move,
        "changed_selected_move": changed_selected_move,
        "candidate_count_by_depth": candidate_count_by_depth or None,
        "score_gap_by_depth": score_gap_by_depth or None,
        "triage_label": triage_label,
        "rationale": rationale,
        "next_codex_task": next_codex_task,
    }
    return position_packet, next_codex_task


def build_recommended_next_batch(position_packets: list[dict[str, Any]]) -> dict[str, Any]:
    investigation_ids = [
        packet["position_id"]
        for packet in position_packets
        if packet.get("triage_label") == "NEEDS_TARGETED_INVESTIGATION"
    ]
    depth_sensitive_ids = [
        packet["position_id"]
        for packet in position_packets
        if packet.get("triage_label") == "DEPTH_SENSITIVE_OBSERVATION"
    ]
    stable_ids = [
        packet["position_id"]
        for packet in position_packets
        if packet.get("triage_label") == "STABLE_OBSERVATION"
    ]
    return {
        "batch_kind": "NON_CANONICAL_RUNTIME_INVESTIGATION_FOLLOWUP",
        "priority_positions": investigation_ids,
        "secondary_positions": depth_sensitive_ids,
        "anchor_positions": stable_ids[:2],
        "notes": [
            "NO_CLAIM_ALLOWED",
            "non-canonical runtime triage only",
            "use sandbox outputs only",
        ],
    }


def triage_report(report_path: Path, output_path: Path) -> dict[str, Any]:
    assert_noncanonical_path(output_path)
    payload = load_json(report_path)
    if not isinstance(payload, dict):
        raise ValueError("observation report must be a JSON object")
    if payload.get("claim_verdict") != "NO_CLAIM_ALLOWED":
        raise ValueError("report claim_verdict must be NO_CLAIM_ALLOWED")
    if payload.get("canonical_evidence") is not False:
        raise ValueError("report must remain non-canonical")

    depth_summaries = payload.get("depth_summaries")
    if not isinstance(depth_summaries, list) or not depth_summaries:
        raise ValueError("report must include non-empty depth_summaries")

    position_packets: list[dict[str, Any]] = []
    next_tasks: list[dict[str, Any]] = []
    for summary in depth_summaries:
        if not isinstance(summary, dict):
            position_packets.append(
                {
                    "position_id": "UNKNOWN_POSITION_ID",
                    "fen": "UNKNOWN_FEN",
                    "depths_observed": [],
                    "selected_by_depth": {},
                    "scores_by_depth": {},
                    "stable_selected_move": None,
                    "changed_selected_move": None,
                    "candidate_count_by_depth": None,
                    "score_gap_by_depth": None,
                    "triage_label": "INVALID_OBSERVATION",
                    "rationale": "depth_summaries item is not an object",
                    "next_codex_task": None,
                }
            )
            continue
        position_packet, next_task = triage_depth_summary(summary)
        position_packets.append(position_packet)
        if next_task:
            next_tasks.append(next_task)

    stable_count = sum(1 for p in position_packets if p["triage_label"] == "STABLE_OBSERVATION")
    depth_sensitive_count = sum(
        1 for p in position_packets if p["triage_label"] == "DEPTH_SENSITIVE_OBSERVATION"
    )
    investigation_count = sum(
        1 for p in position_packets if p["triage_label"] == "NEEDS_TARGETED_INVESTIGATION"
    )
    discard_count = sum(1 for p in position_packets if p["triage_label"] == "DISCARD_LOW_SIGNAL")
    invalid_count = sum(1 for p in position_packets if p["triage_label"] == "INVALID_OBSERVATION")

    output_payload = {
        "schema_version": "pr15.noncanonical_observation_triage.v1",
        "created_at": utc_now(),
        "triage_runner": "scripts/triage_gameplay_observation.py",
        "source_report_path": str(report_path).replace("\\", "/"),
        "output_path": str(output_path).replace("\\", "/"),
        "canonical_evidence": False,
        "promotion_eligible": False,
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "software_verdict": "OBSERVATION_TRIAGE_BATCH_ADDED",
        "evidence_verdict": "NON_CANONICAL_OBSERVATION_ONLY",
        "positions": position_packets,
        "summary": {
            "total_positions": len(position_packets),
            "stable_count": stable_count,
            "depth_sensitive_count": depth_sensitive_count,
            "investigation_count": investigation_count,
            "discard_count": discard_count,
            "invalid_count": invalid_count,
            "recommended_next_batch": build_recommended_next_batch(position_packets),
        },
        "task_next": next_tasks,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(output_payload, indent=2, sort_keys=True), encoding="utf-8")
    return output_payload


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PR-15 non-canonical gameplay observation triage.")
    parser.add_argument("--report", default=str(DEFAULT_REPORT_PATH), help="Observation report JSON from scripts/run_gameplay_observation.py.")
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT_PATH),
        help="Output triage JSON under lab/gameplay_observation/sandbox_outputs/.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print triage output to stdout.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        output_payload = triage_report(Path(args.report), Path(args.output))
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
