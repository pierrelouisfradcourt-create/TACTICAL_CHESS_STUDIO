import argparse
import json
import sys
from pathlib import Path
from typing import Any


DEFAULT_OUTPUT_DIR = Path(
    "lab/gameplay_observation/sandbox_outputs/pr54_telemetry_json_dry_run"
)
SANDBOX_OUTPUT_ROOT = Path("lab/gameplay_observation/sandbox_outputs")
OUTPUT_FILENAME = "telemetry_trace.pr54.json"

SCHEMA_VERSION = "pr54.telemetry_json_dry_run.v1"
SOFTWARE_VERDICT = "TELEMETRY_JSON_DRY_RUN_SCRIPT_ADDED"
EVIDENCE_VERDICT = "NON_CANONICAL_SANDBOX_ONLY"
CLAIM_VERDICT = "NO_CLAIM_ALLOWED"


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def resolve_output_dir(output_dir: Path) -> Path:
    root = repo_root()
    candidate = output_dir
    if not candidate.is_absolute():
        candidate = root / candidate
    return candidate.resolve()


def ensure_sandbox_output_dir(output_dir: Path) -> Path:
    root = repo_root()
    sandbox_root = (root / SANDBOX_OUTPUT_ROOT).resolve()
    resolved_output_dir = resolve_output_dir(output_dir)

    try:
        resolved_output_dir.relative_to(sandbox_root)
    except ValueError as exc:
        raise ValueError(
            f"output_dir must be under {SANDBOX_OUTPUT_ROOT.as_posix()}: "
            f"{resolved_output_dir}"
        ) from exc

    return resolved_output_dir


def build_trace() -> dict[str, Any]:
    trace = {
        "state_key": "pr54:sandbox:state:001",
        "legal_action_ids": ["e2e4", "g1f3", "b1c3"],
        "selected_action_id": "e2e4",
        "decision_mode": "telemetry-json-dry-run-script",
        "used_search": False,
        "used_neural": False,
        "neural_latency_ms": None,
        "search_nodes": 0,
        "search_depth": 0,
        "fallback_reason": "sandbox_dry_run_no_runtime_decision",
    }
    validate_trace(trace)
    return trace


def validate_trace(trace: dict[str, Any]) -> None:
    selected_action_id = trace["selected_action_id"]
    legal_action_ids = trace["legal_action_ids"]
    if selected_action_id is not None and selected_action_id not in legal_action_ids:
        raise ValueError("selected_action_id must be null or present in legal_action_ids")


def build_payload() -> dict[str, Any]:
    return {
        "schema_version": SCHEMA_VERSION,
        "canonical_evidence": False,
        "claim_verdict": CLAIM_VERDICT,
        "evidence_verdict": EVIDENCE_VERDICT,
        "trace": build_trace(),
    }


def write_payload(output_dir: Path, pretty: bool) -> Path:
    resolved_output_dir = ensure_sandbox_output_dir(output_dir)
    resolved_output_dir.mkdir(parents=True, exist_ok=True)
    output_path = resolved_output_dir / OUTPUT_FILENAME
    payload = build_payload()
    serialized = json.dumps(payload, indent=2 if pretty else None, sort_keys=False)
    output_path.write_text(serialized + "\n", encoding="utf-8")
    return output_path


def build_summary(output_path: Path) -> dict[str, Any]:
    return {
        "software_verdict": SOFTWARE_VERDICT,
        "evidence_verdict": EVIDENCE_VERDICT,
        "claim_verdict": CLAIM_VERDICT,
        "output_path": str(output_path),
        "sandbox_only": True,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a sandbox-only deterministic telemetry JSON dry-run fixture."
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=(
            "Output directory under "
            "lab/gameplay_observation/sandbox_outputs. "
            f"Default: {DEFAULT_OUTPUT_DIR.as_posix()}"
        ),
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print the generated JSON fixture and command summary.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        output_path = write_payload(args.output_dir, args.pretty)
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(build_summary(output_path), indent=2 if args.pretty else None))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
