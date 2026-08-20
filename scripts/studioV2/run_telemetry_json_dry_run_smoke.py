import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


DEFAULT_OUTPUT_DIR = Path(
    "lab/gameplay_observation/sandbox_outputs/pr55_telemetry_json_dry_run_smoke"
)
SANDBOX_OUTPUT_ROOT = Path("lab/gameplay_observation/sandbox_outputs")
PR54_SCRIPT = Path("scripts/run_telemetry_json_dry_run.py")
OUTPUT_FILENAME = "telemetry_trace.pr54.json"

SOFTWARE_VERDICT = "TELEMETRY_JSON_DRY_RUN_SMOKE_PASS"
EVIDENCE_VERDICT = "NON_CANONICAL_SANDBOX_ONLY"
CLAIM_VERDICT = "NO_CLAIM_ALLOWED"

REQUIRED_PAYLOAD_KEYS = {
    "schema_version",
    "canonical_evidence",
    "claim_verdict",
    "evidence_verdict",
    "trace",
}
REQUIRED_TRACE_KEYS = {
    "state_key",
    "legal_action_ids",
    "selected_action_id",
    "decision_mode",
    "used_search",
    "used_neural",
    "neural_latency_ms",
    "search_nodes",
    "search_depth",
    "fallback_reason",
}


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


def run_pr54_script(output_dir: Path, pretty: bool) -> Path:
    root = repo_root()
    script_path = root / PR54_SCRIPT
    if not script_path.is_file():
        raise FileNotFoundError(f"missing PR-54 script: {PR54_SCRIPT.as_posix()}")

    cmd = [
        sys.executable,
        str(script_path),
        "--output-dir",
        str(output_dir),
    ]
    if pretty:
        cmd.append("--pretty")

    result = subprocess.run(
        cmd,
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(f"PR-54 dry-run script failed: {message}")

    return output_dir / OUTPUT_FILENAME


def load_payload(output_path: Path) -> dict[str, Any]:
    if not output_path.is_file():
        raise FileNotFoundError(f"missing dry-run output: {output_path}")

    try:
        data = json.loads(output_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid JSON output: {output_path}") from exc

    if not isinstance(data, dict):
        raise ValueError("dry-run output must be a JSON object")
    return data


def validate_payload(payload: dict[str, Any]) -> None:
    missing_payload_keys = sorted(REQUIRED_PAYLOAD_KEYS.difference(payload))
    if missing_payload_keys:
        raise ValueError(f"missing payload keys: {missing_payload_keys}")

    if payload["canonical_evidence"] is not False:
        raise ValueError("canonical_evidence must be false")
    if payload["claim_verdict"] != CLAIM_VERDICT:
        raise ValueError(f"claim_verdict must be {CLAIM_VERDICT}")
    if payload["evidence_verdict"] != EVIDENCE_VERDICT:
        raise ValueError(f"evidence_verdict must be {EVIDENCE_VERDICT}")

    trace = payload["trace"]
    if not isinstance(trace, dict):
        raise ValueError("trace must be a JSON object")

    missing_trace_keys = sorted(REQUIRED_TRACE_KEYS.difference(trace))
    if missing_trace_keys:
        raise ValueError(f"missing trace keys: {missing_trace_keys}")

    legal_action_ids = trace["legal_action_ids"]
    if not isinstance(legal_action_ids, list):
        raise ValueError("trace.legal_action_ids must be a list")

    selected_action_id = trace["selected_action_id"]
    if selected_action_id is not None and selected_action_id not in legal_action_ids:
        raise ValueError("selected_action_id must be null or present in legal_action_ids")


def build_summary(output_path: Path) -> dict[str, Any]:
    return {
        "software_verdict": SOFTWARE_VERDICT,
        "evidence_verdict": EVIDENCE_VERDICT,
        "claim_verdict": CLAIM_VERDICT,
        "smoke_output_path": str(output_path),
        "sandbox_only": True,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run and validate the sandbox-only telemetry JSON dry-run script."
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
        help="Pretty-print the generated dry-run output and smoke summary.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        output_dir = ensure_sandbox_output_dir(args.output_dir)
        output_path = run_pr54_script(output_dir, args.pretty)
        ensure_sandbox_output_dir(output_path.parent)
        payload = load_payload(output_path)
        validate_payload(payload)
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print(json.dumps(build_summary(output_path), indent=2 if args.pretty else None))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
