import json
import subprocess
import sys
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SAFE_JSON_DIRS = (
    "lab/agent_tasks",
    "schemas",
    "docs/control-plane",
    "scripts/operator/fixtures",
)
CONTROL_PLANE_SCHEMA_VALIDATOR = PROJECT_ROOT / "scripts" / "validate_control_plane_json.py"


def normalize_path(path: Path) -> str:
    try:
        rel = path.resolve().relative_to(PROJECT_ROOT.resolve())
        return str(rel).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def parse_json_file(path: Path) -> tuple[bool, str | None]:
    try:
        json.loads(path.read_text(encoding="utf-8"))
        return True, None
    except json.JSONDecodeError as exc:
        return False, f"{normalize_path(path)}: {exc}"
    except OSError as exc:
        return False, f"{normalize_path(path)}: {exc}"


def collect_json_paths() -> tuple[list[Path], list[str]]:
    files: list[Path] = []
    missing_dirs: list[str] = []
    for relative_dir in SAFE_JSON_DIRS:
        directory = PROJECT_ROOT / relative_dir
        if not directory.exists():
            missing_dirs.append(relative_dir)
            continue
        files.extend(sorted(directory.rglob("*.json")))
    return files, missing_dirs


def run_existing_schema_validator() -> dict[str, Any]:
    if not CONTROL_PLANE_SCHEMA_VALIDATOR.exists():
        return {
            "status": "SKIPPED",
            "reason": "scripts/validate_control_plane_json.py not found",
            "returncode": None,
        }

    run = subprocess.run(
        [sys.executable, str(CONTROL_PLANE_SCHEMA_VALIDATOR), "--pretty"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if run.returncode == 0:
        return {
            "status": "PASS",
            "returncode": 0,
        }

    stderr_text = run.stderr.strip()
    stdout_text = run.stdout.strip()
    combined_error = stderr_text or stdout_text or "unknown schema validation failure"
    if "MISSING_DEPENDENCY" in combined_error:
        return {
            "status": "UNKNOWN",
            "reason": "jsonschema dependency missing for strict schema validator",
            "returncode": run.returncode,
        }

    return {
        "status": "BLOCKED",
        "reason": combined_error[-800:],
        "returncode": run.returncode,
    }


def main() -> int:
    json_files, missing_dirs = collect_json_paths()
    invalid_files: list[str] = []
    checked_files: list[str] = []

    for json_path in json_files:
        ok, error = parse_json_file(json_path)
        if ok:
            checked_files.append(normalize_path(json_path))
        else:
            invalid_files.append(error or normalize_path(json_path))

    schema_validation = run_existing_schema_validator()

    overall_status = "PASS"
    if invalid_files:
        overall_status = "BLOCKED"
    elif schema_validation["status"] == "BLOCKED":
        overall_status = "BLOCKED"
    elif schema_validation["status"] == "UNKNOWN":
        overall_status = "UNKNOWN"

    report = {
        "operator_pack": "free-clean-operator-pack-v0",
        "overall_status": overall_status,
        "summary": {
            "checked_json_file_count": len(checked_files),
            "invalid_json_file_count": len(invalid_files),
            "missing_safe_dirs": missing_dirs,
            "schema_validation_status": schema_validation["status"],
        },
        "checked_files": checked_files,
        "invalid_files": invalid_files,
        "schema_validation": schema_validation,
    }

    print(json.dumps(report, indent=2, sort_keys=True))

    if overall_status == "BLOCKED":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
