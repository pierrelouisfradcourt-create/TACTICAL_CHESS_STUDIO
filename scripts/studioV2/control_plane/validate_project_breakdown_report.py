import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[3]
SCHEMA_PATH = PROJECT_ROOT / "schemas" / "studiopilot_project_breakdown_report.schema.json"
DEFAULT_FIXTURES_ROOT = PROJECT_ROOT / "docs" / "control-plane" / "fixtures" / "project_breakdown"
ALLOWED_CLAIM_SCOPES = {"NO_CLAIM_ALLOWED", "HEALTH_ONLY", "EVIDENCE_ONLY"}


class ConfigError(Exception):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Validate Project Breakdown Report V0 fixtures against schema and semantic "
            "control-plane safety checks."
        )
    )
    parser.add_argument(
        "--fixtures-root",
        default=str(DEFAULT_FIXTURES_ROOT),
        help="Root directory containing valid_* and invalid_* Project Breakdown fixtures.",
    )
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args()


def emit_json(payload: dict[str, Any], pretty: bool) -> None:
    if pretty:
        print(json.dumps(payload, indent=2, sort_keys=True))
        return
    print(json.dumps(payload, separators=(",", ":"), sort_keys=True))


def base_report() -> dict[str, Any]:
    return {
        "overall_status": "BLOCKED",
        "valid_passed": 0,
        "valid_failed": 0,
        "invalid_failed_as_expected": 0,
        "invalid_unexpectedly_passed": 0,
        "semantic_checks_passed": False,
        "errors": [],
    }


def explicit_path(raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    return PROJECT_ROOT / path


def normalize_path(path: Path) -> str:
    try:
        relative = path.resolve().relative_to(PROJECT_ROOT.resolve())
        return str(relative).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ConfigError(f"json_file_missing: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ConfigError(f"json_decode_error: {path}: {exc}") from exc
    except OSError as exc:
        raise ConfigError(f"json_read_error: {path}: {exc}") from exc


def import_validator() -> Any:
    try:
        from jsonschema import Draft202012Validator
    except ModuleNotFoundError as exc:
        raise ConfigError("BLOCKED_MISSING_JSONSCHEMA") from exc
    return Draft202012Validator


def load_schema_validator(draft_validator: Any) -> Any:
    schema_obj = load_json(SCHEMA_PATH)
    if not isinstance(schema_obj, dict):
        raise ConfigError(f"schema_not_object: {SCHEMA_PATH}")
    draft_validator.check_schema(schema_obj)
    return draft_validator(schema_obj)


def collect_fixture_paths(fixtures_root: Path) -> tuple[list[Path], list[Path]]:
    if not fixtures_root.exists():
        raise ConfigError(f"fixtures_root_missing: {fixtures_root}")
    if not fixtures_root.is_dir():
        raise ConfigError(f"fixtures_root_not_directory: {fixtures_root}")

    valid_paths = sorted(fixtures_root.glob("valid_project_breakdown_*.json"))
    invalid_paths = sorted(fixtures_root.glob("invalid_project_breakdown_*.json"))
    if not valid_paths:
        raise ConfigError(f"no_valid_fixtures_found: {fixtures_root}")
    if not invalid_paths:
        raise ConfigError(f"no_invalid_fixtures_found: {fixtures_root}")
    return valid_paths, invalid_paths


def format_validation_error(error: Any) -> str:
    location = ".".join(str(part) for part in error.absolute_path)
    if location:
        return f"$.{location}: {error.message}"
    return f"$: {error.message}"


def schema_errors(validator: Any, payload: Any) -> list[str]:
    errors = sorted(
        validator.iter_errors(payload),
        key=lambda entry: (list(entry.absolute_path), entry.message),
    )
    return [format_validation_error(error) for error in errors]


def semantic_errors(payload: Any) -> list[str]:
    if not isinstance(payload, dict):
        return ["semantic_payload_not_object"]

    errors: list[str] = []
    if payload.get("human_gate_required") is not True:
        errors.append("human_gate_required_not_true")
    if payload.get("auto_pr_creation_allowed") is not False:
        errors.append("auto_pr_creation_allowed_not_false")
    if payload.get("auto_ready_allowed") is not False:
        errors.append("auto_ready_allowed_not_false")
    if payload.get("auto_merge_allowed") is not False:
        errors.append("auto_merge_allowed_not_false")

    epics = payload.get("epics")
    patch_groups = payload.get("patch_groups")
    pr_candidates = payload.get("pr_candidates")
    dependency_graph = payload.get("dependency_graph")
    recommended = payload.get("recommended_first_action")

    epic_ids: set[str] = set()
    if isinstance(epics, list):
        for epic in epics:
            if isinstance(epic, dict) and isinstance(epic.get("epic_id"), str):
                epic_ids.add(epic["epic_id"])

    patch_group_ids: set[str] = set()
    if isinstance(patch_groups, list):
        for patch_group in patch_groups:
            if not isinstance(patch_group, dict):
                errors.append("patch_group_not_object")
                continue
            patch_group_id = patch_group.get("patch_group_id")
            if isinstance(patch_group_id, str):
                patch_group_ids.add(patch_group_id)
            parent_epic_id = patch_group.get("parent_epic_id")
            if isinstance(parent_epic_id, str) and parent_epic_id not in epic_ids:
                errors.append(f"patch_group_parent_epic_missing:{parent_epic_id}")

    pr_candidate_ids: set[str] = set()
    if isinstance(pr_candidates, list):
        for pr_candidate in pr_candidates:
            if not isinstance(pr_candidate, dict):
                errors.append("pr_candidate_not_object")
                continue

            pr_candidate_id = pr_candidate.get("pr_candidate_id")
            if isinstance(pr_candidate_id, str):
                pr_candidate_ids.add(pr_candidate_id)

            parent_patch_group_id = pr_candidate.get("parent_patch_group_id")
            if isinstance(parent_patch_group_id, str) and parent_patch_group_id not in patch_group_ids:
                errors.append(f"pr_candidate_parent_patch_group_missing:{parent_patch_group_id}")

            claim_scope = pr_candidate.get("claim_scope")
            if claim_scope not in ALLOWED_CLAIM_SCOPES:
                errors.append(f"pr_candidate_claim_scope_invalid:{claim_scope}")

            if pr_candidate.get("human_gate_required") is not True:
                errors.append(f"pr_candidate_human_gate_required_not_true:{pr_candidate_id}")
            if pr_candidate.get("auto_ready_allowed") is not False:
                errors.append(f"pr_candidate_auto_ready_allowed_not_false:{pr_candidate_id}")
            if pr_candidate.get("auto_merge_allowed") is not False:
                errors.append(f"pr_candidate_auto_merge_allowed_not_false:{pr_candidate_id}")

    if isinstance(recommended, dict):
        recommended_pr_id = recommended.get("pr_candidate_id")
        if isinstance(recommended_pr_id, str) and recommended_pr_id not in pr_candidate_ids:
            errors.append(f"recommended_first_action_pr_candidate_missing:{recommended_pr_id}")
    else:
        errors.append("recommended_first_action_not_object")

    if isinstance(dependency_graph, dict):
        nodes = dependency_graph.get("nodes")
        edges = dependency_graph.get("edges")
        node_ids: set[str] = set()
        if isinstance(nodes, list):
            for node in nodes:
                if isinstance(node, str):
                    node_ids.add(node)
                else:
                    errors.append("dependency_node_not_string")
        if isinstance(edges, list):
            for edge in edges:
                if not isinstance(edge, dict):
                    errors.append("dependency_edge_not_object")
                    continue
                source = edge.get("from")
                target = edge.get("to")
                if source not in node_ids:
                    errors.append(f"dependency_edge_from_missing_node:{source}")
                if target not in node_ids:
                    errors.append(f"dependency_edge_to_missing_node:{target}")
    else:
        errors.append("dependency_graph_not_object")

    return sorted(set(errors))


def validate_expected_valid(report: dict[str, Any], validator: Any, path: Path) -> bool:
    payload = load_json(path)
    errors = schema_errors(validator, payload)
    if errors:
        report["valid_failed"] += 1
        report["errors"].append(f"valid_failed:{normalize_path(path)}:{errors[0]}")
        return False

    semantic = semantic_errors(payload)
    if semantic:
        report["valid_failed"] += 1
        report["errors"].append(f"valid_failed_semantic:{normalize_path(path)}:{semantic[0]}")
        return False

    report["valid_passed"] += 1
    return True


def validate_expected_invalid(report: dict[str, Any], validator: Any, path: Path) -> None:
    payload = load_json(path)
    errors = schema_errors(validator, payload)
    semantic = semantic_errors(payload) if not errors else []

    if errors or semantic:
        report["invalid_failed_as_expected"] += 1
        return

    report["invalid_unexpectedly_passed"] += 1
    report["errors"].append(f"invalid_unexpectedly_passed:{normalize_path(path)}")


def run_validation(fixtures_root: Path) -> dict[str, Any]:
    report = base_report()

    draft_validator = import_validator()
    validator = load_schema_validator(draft_validator)
    valid_paths, invalid_paths = collect_fixture_paths(fixtures_root)

    valid_results: list[bool] = []
    for path in valid_paths:
        valid_results.append(validate_expected_valid(report, validator, path))

    for path in invalid_paths:
        validate_expected_invalid(report, validator, path)

    report["errors"] = sorted(report["errors"])
    report["semantic_checks_passed"] = all(valid_results) and not report["errors"]
    if report["valid_failed"] or report["invalid_unexpectedly_passed"] or not report["semantic_checks_passed"]:
        report["overall_status"] = "BLOCKED"
    else:
        report["overall_status"] = "PASS"
    return report


def main() -> int:
    args = parse_args()
    fixtures_root = explicit_path(args.fixtures_root)
    try:
        report = run_validation(fixtures_root)
        emit_json(report, args.pretty)
        if report["overall_status"] == "PASS":
            return 0
        return 1
    except ConfigError as exc:
        report = base_report()
        report["errors"] = [str(exc)]
        emit_json(report, args.pretty)
        return 2
    except Exception as exc:  # pragma: no cover - defensive hard stop
        report = base_report()
        report["errors"] = [f"internal_error: {exc}"]
        emit_json(report, args.pretty)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
