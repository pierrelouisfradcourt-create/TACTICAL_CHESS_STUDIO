import argparse
import json
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any


DEFAULT_SURFACE_PATH = Path("lab/gameplay_observation/non_converting_positions/example_surface.pr13b.json")
DEFAULT_OUTPUT_DIR = Path("lab/gameplay_observation/sandbox_outputs/pr13j_depth_sweep")
DEFAULT_DEPTHS = [1, 2]
FORBIDDEN_OUTPUT_FRAGMENTS = (
    "lab/runs/",
    "lab/runs\\",
    "latest.json",
    "holdout/",
    "holdout\\",
)


@dataclass
class ObservationResult:
    position_id: str
    fen: str
    command: list[str]
    depth: int
    exit_code: int | None
    observation_status: str
    side_to_move: str | None = None
    legal_moves_count: int | None = None
    selected_move: str | None = None
    runtime_status: str | None = None
    completed_depth: int | None = None
    search_score: int | None = None
    selection_source: str | None = None
    candidates: list[dict[str, Any]] = field(default_factory=list)
    candidate_count: int | None = None
    best_score: int | None = None
    second_best_score: int | None = None
    score_gap: int | None = None
    candidate_diagnostics_note: str | None = None
    stdout_excerpt: str = ""
    stderr_excerpt: str = ""
    error: str | None = None
    notes: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "position_id": self.position_id,
            "fen": self.fen,
            "command": self.command,
            "depth": self.depth,
            "exit_code": self.exit_code,
            "observation_status": self.observation_status,
            "side_to_move": self.side_to_move,
            "legal_moves_count": self.legal_moves_count,
            "selected_move": self.selected_move,
            "runtime_status": self.runtime_status,
            "completed_depth": self.completed_depth,
            "search_score": self.search_score,
            "selection_source": self.selection_source,
            "candidates": self.candidates,
            "candidate_count": self.candidate_count,
            "best_score": self.best_score,
            "second_best_score": self.second_best_score,
            "score_gap": self.score_gap,
            "candidate_diagnostics_note": self.candidate_diagnostics_note,
            "stdout_excerpt": self.stdout_excerpt,
            "stderr_excerpt": self.stderr_excerpt,
            "error": self.error,
            "notes": self.notes,
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


def load_surface(path: Path) -> list[dict[str, str]]:
    data = load_json(path)
    if not isinstance(data, dict):
        raise ValueError("surface must be a JSON object")
    if data.get("canonical_evidence") is not False:
        raise ValueError("surface must be non-canonical")
    if data.get("promotion_eligible") is not False:
        raise ValueError("surface must not be promotion eligible")
    if data.get("contains_holdout") is not False:
        raise ValueError("surface must not contain holdout")
    positions = data.get("positions")
    if not isinstance(positions, list) or not positions:
        raise ValueError("surface positions must be a non-empty list")
    parsed: list[dict[str, str]] = []
    for index, item in enumerate(positions):
        if not isinstance(item, dict):
            raise ValueError(f"position {index} must be object")
        position_id = item.get("position_id")
        fen = item.get("fen")
        if not isinstance(position_id, str) or not position_id.strip():
            raise ValueError(f"position {index} missing position_id")
        if not isinstance(fen, str) or not fen.strip():
            raise ValueError(f"position {index} missing fen")
        parsed.append({"position_id": position_id, "fen": fen})
    return parsed


def excerpt(value: str, limit: int = 1600) -> str:
    value = value.replace("\x00", "")
    if len(value) <= limit:
        return value
    return value[:limit] + "...<truncated>"


def build_observe_fen_command(fen: str, depth: int) -> list[str]:
    return ["cargo", "run", "--quiet", "--", "observe_fen", fen, "--depth", str(depth)]


def parse_observe_fen_json(stdout: str) -> dict[str, Any] | None:
    cleaned = stdout.strip()
    if not cleaned:
        return None
    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else None
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end == -1 or end <= start:
            return None
        try:
            parsed = json.loads(cleaned[start : end + 1])
            return parsed if isinstance(parsed, dict) else None
        except json.JSONDecodeError:
            return None


def parse_depths(depths_arg: str | None, depth_arg: int | None) -> list[int]:
    if depths_arg:
        raw_parts = [part.strip() for part in depths_arg.split(",")]
        depths = []
        for part in raw_parts:
            if not part:
                continue
            try:
                value = int(part)
            except ValueError as exc:
                raise ValueError(f"invalid depth value: {part}") from exc
            if value <= 0:
                raise ValueError(f"depth must be positive: {value}")
            depths.append(value)
        if not depths:
            raise ValueError("--depths must contain at least one positive integer")
        return sorted(dict.fromkeys(depths))
    if depth_arg is not None:
        if depth_arg <= 0:
            raise ValueError("--depth must be positive")
        return [depth_arg]
    return DEFAULT_DEPTHS.copy()


def filter_positions(positions: list[dict[str, str]], position_id: str | None) -> list[dict[str, str]]:
    if position_id is None:
        return positions
    selected = [position for position in positions if position["position_id"] == position_id]
    if not selected:
        raise ValueError(f"position_id not found in surface: {position_id}")
    return selected


def optional_str(parsed: dict[str, Any] | None, key: str) -> str | None:
    value = parsed.get(key) if parsed else None
    return value if isinstance(value, str) else None


def optional_int(parsed: dict[str, Any] | None, key: str) -> int | None:
    value = parsed.get(key) if parsed else None
    return value if isinstance(value, int) else None


def optional_candidates(parsed: dict[str, Any] | None) -> list[dict[str, Any]]:
    value = parsed.get("candidates") if parsed else None
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, dict)]


def run_command(command: list[str], timeout_seconds: int) -> tuple[int, str, str, str | None]:
    try:
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
        return completed.returncode, completed.stdout, completed.stderr, None
    except FileNotFoundError as exc:
        return 127, "", "", str(exc)
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout if isinstance(exc.stdout, str) else ""
        stderr = exc.stderr if isinstance(exc.stderr, str) else ""
        return 124, stdout, stderr, f"timeout after {timeout_seconds}s"


def summarize_depth_sweeps(results: list[ObservationResult]) -> list[dict[str, Any]]:
    grouped: dict[str, list[ObservationResult]] = {}
    for result in results:
        grouped.setdefault(result.position_id, []).append(result)

    summaries = []
    for position_id, items in sorted(grouped.items()):
        sorted_items = sorted(items, key=lambda item: item.depth)
        selected_by_depth = {
            str(item.depth): item.selected_move for item in sorted_items if item.selected_move
        }
        scores_by_depth = {
            str(item.depth): item.search_score for item in sorted_items if item.search_score is not None
        }
        score_gaps_by_depth = {
            str(item.depth): item.score_gap for item in sorted_items if item.score_gap is not None
        }
        score_sign_by_depth = {
            str(item.depth): (
                "POSITIVE" if item.search_score > 0 else "NEGATIVE" if item.search_score < 0 else "ZERO"
            )
            for item in sorted_items
            if item.search_score is not None
        }
        unique_selected_moves = sorted(set(selected_by_depth.values()))
        unique_score_signs = sorted(set(score_sign_by_depth.values()))
        unique_score_gaps = sorted({gap for gap in score_gaps_by_depth.values() if isinstance(gap, int)})
        summaries.append(
            {
                "position_id": position_id,
                "depths_observed": [item.depth for item in sorted_items],
                "all_observations_passed": all(item.observation_status == "PASS" for item in sorted_items),
                "selected_by_depth": selected_by_depth,
                "scores_by_depth": scores_by_depth,
                "score_sign_by_depth": score_sign_by_depth,
                "score_gaps_by_depth": score_gaps_by_depth,
                "unique_selected_moves": unique_selected_moves,
                "stable_selected_move": len(unique_selected_moves) == 1 if unique_selected_moves else None,
                "score_sign_changes_across_depths": len(unique_score_signs) > 1 if unique_score_signs else None,
                "score_gap_changes_across_depths": len(unique_score_gaps) > 1 if unique_score_gaps else None,
                "notes": [
                    "NON_CANONICAL_DEPTH_SWEEP_ONLY",
                    "stability is descriptive observation only, not benchmark evidence",
                ],
            }
        )
    return summaries


def run_observations(
    surface_path: Path,
    output_dir: Path,
    timeout_seconds: int,
    depths: list[int],
    execute: bool,
    position_id: str | None,
) -> dict[str, Any]:
    assert_noncanonical_path(output_dir)
    positions = load_surface(surface_path)
    selected_positions = filter_positions(positions, position_id)
    output_dir.mkdir(parents=True, exist_ok=True)

    results: list[ObservationResult] = []

    for position in selected_positions:
        for depth in depths:
            command = build_observe_fen_command(position["fen"], depth)
            notes = [
                "NON_CANONICAL_OBSERVATION_ONLY",
                "observe_fen is used only as a runtime observation entrypoint",
                "depth sweep is descriptive only and not benchmark evidence",
                "NO_CLAIM_ALLOWED",
            ]
            if not execute:
                results.append(
                    ObservationResult(
                        position_id=position["position_id"],
                        fen=position["fen"],
                        command=command,
                        depth=depth,
                        exit_code=None,
                        observation_status="NOT_RUN",
                        notes=notes + ["runner invoked without --execute"],
                    )
                )
                continue

            exit_code, stdout, stderr, error = run_command(command, timeout_seconds)
            parsed = parse_observe_fen_json(stdout)
            runtime_status = optional_str(parsed, "status")
            status = "PASS" if exit_code == 0 and runtime_status == "ok" else "FAIL"
            if parsed is None:
                notes.append("observe_fen stdout did not parse as JSON")
            results.append(
                ObservationResult(
                    position_id=position["position_id"],
                    fen=position["fen"],
                    command=command,
                    depth=depth,
                    exit_code=exit_code,
                    observation_status=status,
                    side_to_move=optional_str(parsed, "side_to_move"),
                    legal_moves_count=optional_int(parsed, "legal_moves_count"),
                    selected_move=optional_str(parsed, "selected_move"),
                    runtime_status=runtime_status,
                    completed_depth=optional_int(parsed, "completed_depth"),
                    search_score=optional_int(parsed, "search_score"),
                    selection_source=optional_str(parsed, "selection_source"),
                    candidates=optional_candidates(parsed),
                    candidate_count=optional_int(parsed, "candidate_count"),
                    best_score=optional_int(parsed, "best_score"),
                    second_best_score=optional_int(parsed, "second_best_score"),
                    score_gap=optional_int(parsed, "score_gap"),
                    candidate_diagnostics_note=optional_str(parsed, "candidate_diagnostics_note"),
                    stdout_excerpt=excerpt(stdout),
                    stderr_excerpt=excerpt(stderr),
                    error=error or (parsed.get("error") if isinstance(parsed, dict) else None),
                    notes=notes,
                )
            )

    payload = {
        "schema_version": "pr13j.noncanonical_gameplay_observation_report.v1",
        "created_at": utc_now(),
        "runner": "scripts/run_gameplay_observation.py",
        "surface_path": str(surface_path).replace("\\", "/"),
        "output_dir": str(output_dir).replace("\\", "/"),
        "selected_position_id": position_id,
        "depths": depths,
        "canonical_evidence": False,
        "promotion_eligible": False,
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "evidence_verdict": "INCOMPLETE",
        "software_verdict": "PASS" if all(item.observation_status in {"PASS", "NOT_RUN"} for item in results) else "FAIL",
        "claim_control": {
            "no_claim_allowed": True,
            "reason": "PR-13J is a non-canonical depth sweep observation only and does not create RUN_* evidence.",
        },
        "learning_value": "Checks whether selected_move and search metadata remain stable across small non-canonical depth sweeps.",
        "discard_if": "Discard if observe_fen cannot execute, JSON cannot be parsed, writes outside sandbox occur, or depth sweep observations are incomplete.",
        "next_decision_enabled": "Decide whether future runtime work should target positions where selected moves change across shallow depths.",
        "depth_summaries": summarize_depth_sweeps(results),
        "observations": [item.as_dict() for item in results],
    }
    report_path = output_dir / "observation_report.pr13j.json"
    report_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    return payload


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PR-13J non-canonical gameplay depth sweep observation runner.")
    parser.add_argument("--surface", default=str(DEFAULT_SURFACE_PATH), help="Non-canonical gameplay observation surface JSON.")
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR), help="Sandbox output directory under lab/gameplay_observation/sandbox_outputs/.")
    parser.add_argument("--timeout-seconds", type=int, default=120, help="Per-position/depth command timeout.")
    parser.add_argument("--depth", type=int, default=None, help="Single depth forwarded to observe_fen. Overrides the default sweep when --depths is omitted.")
    parser.add_argument("--depths", default=None, help="Comma-separated positive depths forwarded to observe_fen, for example 1,2.")
    parser.add_argument("--position-id", default=None, help="Optional position_id from the surface to run as a focused non-canonical investigation.")
    parser.add_argument("--execute", action="store_true", help="Actually run observe_fen for each surface position and depth.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON summary.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    try:
        depths = parse_depths(args.depths, args.depth)
        payload = run_observations(
            Path(args.surface),
            Path(args.output_dir),
            args.timeout_seconds,
            depths,
            args.execute,
            args.position_id,
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
    print(json.dumps(payload, indent=2 if args.pretty else None, sort_keys=True))
    return 0 if payload.get("software_verdict") == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
