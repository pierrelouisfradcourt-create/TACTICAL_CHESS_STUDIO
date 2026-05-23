import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any


SCHEMA_VERSION = "claim_data_gate.pr05"
GATE_VERSION = "pr05"

CLAIM_VERDICTS = (
    "NO_CLAIM_ALLOWED",
    "HEALTH_ONLY",
    "TARGETED_BEHAVIOR_ONLY",
    "EXPLORATORY_ONLY",
    "PROMOTION_REVIEW_CANDIDATE",
    "STRENGTH_CLAIM_CANDIDATE",
)
CLAIM_RANK = {name: index for index, name in enumerate(CLAIM_VERDICTS)}

CONTRACT_ONLY_MARKERS = {
    "contract-only",
    "contract_only",
    "parser-only",
    "parser_only",
    "gate-only",
    "gate_only",
    "bootstrap-only",
    "bootstrap_only",
}
CLAIM_SCOPE_MAPPING = {
    "smoke_benchmark": "HEALTH_ONLY",
    "conversion_suite": "TARGETED_BEHAVIOR_ONLY",
    "small_n": "EXPLORATORY_ONLY",
    "missing_dataset_lineage": "NO_CLAIM_ALLOWED",
    "missing_baseline": "EXPLORATORY_ONLY",
    "missing_uncertainty_for_promotion": "NO_CLAIM_ALLOWED",
}
LINEAGE_FIELDS = (
    "dataset_id",
    "dataset_hash",
    "split_id",
    "split_hash",
    "schema_version",
    "label_policy_version",
    "content_hash",
    "parent_hash",
    "creation_command",
)
LINEAGE_ISSUES = {
    "dataset_id": "MISSING_DATASET_ID",
    "dataset_hash": "MISSING_DATASET_HASH",
    "split_id": "MISSING_SPLIT_ID",
    "split_hash": "MISSING_SPLIT_HASH",
    "schema_version": "MISSING_SCHEMA_VERSION",
    "label_policy_version": "MISSING_LABEL_POLICY_VERSION",
    "content_hash": "MISSING_CONTENT_HASH",
    "parent_hash": "MISSING_PARENT_HASH",
    "creation_command": "MISSING_CREATION_COMMAND",
}
BASELINE_FIELDS = (
    "baseline_id",
    "baseline_result_ref",
    "uncertainty_summary",
    "sample_size",
    "run_count",
    "seed_policy",
    "statistical_method",
)
BASELINE_ISSUES = {
    "baseline_id": "MISSING_BASELINE",
    "baseline_result_ref": "MISSING_BASELINE",
    "uncertainty_summary": "MISSING_UNCERTAINTY_FOR_PROMOTION",
    "sample_size": "MISSING_SAMPLE_SIZE",
    "run_count": "MISSING_RUN_COUNT",
    "seed_policy": "MISSING_SEED_POLICY",
    "statistical_method": "MISSING_STATISTICAL_METHOD",
}
HOLDOUT_EXPOSURE_KEYS = {
    "holdout_position",
    "holdout_positions",
    "holdout_hash",
    "holdout_hashes",
    "holdout_ids",
    "fen",
    "move_list",
}
ALLOWED_HOLDOUT_KEYS = {"holdout_set_id"}

PHRASE_RULES = (
    ("run proves", "BLOCKED_SCIENTIFIC_PROOF_CLAIM"),
    ("evidence proves improvement", "BLOCKED_SCIENTIFIC_PROOF_CLAIM"),
    ("benchmark validates", "BLOCKED_OVERCLAIM_LANGUAGE"),
    ("ready for promotion", "BLOCKED_PROMOTION_CLAIM"),
    ("promotion candidate", "BLOCKED_PROMOTION_CLAIM"),
    ("strength improved", "BLOCKED_STRENGTH_CLAIM"),
    ("elo improved", "BLOCKED_ELO_CLAIM"),
    ("search improved", "BLOCKED_STRENGTH_CLAIM"),
    ("neural improved", "BLOCKED_STRENGTH_CLAIM"),
    ("conversion proves strength", "BLOCKED_STRENGTH_CLAIM"),
    ("ci proves correctness", "BLOCKED_CI_AS_PROOF"),
    ("latest proves", "BLOCKED_LATEST_AS_EVIDENCE"),
    ("validated engine", "BLOCKED_OVERCLAIM_LANGUAGE"),
    ("scientific proof", "BLOCKED_SCIENTIFIC_PROOF_CLAIM"),
    ("stronger", "BLOCKED_STRENGTH_CLAIM"),
    ("better engine", "BLOCKED_STRENGTH_CLAIM"),
    ("global improvement", "BLOCKED_STRENGTH_CLAIM"),
    ("aaa validated", "BLOCKED_OVERCLAIM_LANGUAGE"),
    ("promotion eligible", "BLOCKED_PROMOTION_CLAIM"),
)
POLICY_CONTEXT_MARKERS = (
    "block",
    "blocked",
    "forbidden",
    "not allowed",
    "must not",
    "never",
    "negative",
    "prohibit",
    "reject",
    "issue name",
    "crash case",
)


@dataclass
class GateResult:
    software_verdict: str = "PASS"
    evidence_verdict: str = "CLAIM_DATA_GATE_ONLY"
    claim_verdict: str = "NO_CLAIM_ALLOWED"
    human_review_required: bool = True
    blocking_issues: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    inspected_path: str = ""

    def as_dict(self) -> dict[str, Any]:
        return {
            "schema_version": SCHEMA_VERSION,
            "software_verdict": self.software_verdict,
            "evidence_verdict": self.evidence_verdict,
            "claim_verdict": self.claim_verdict,
            "human_review_required": self.human_review_required,
            "blocking_issues": dedupe(self.blocking_issues),
            "warnings": dedupe(self.warnings),
            "inspected_path": self.inspected_path,
            "gate_version": GATE_VERSION,
        }


def dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            output.append(item)
    return output


def blocked_result(path: Path, issues: list[str], evidence: str = "INVALID") -> GateResult:
    return GateResult(
        software_verdict="BLOCKED",
        evidence_verdict=evidence,
        claim_verdict="NO_CLAIM_ALLOWED",
        blocking_issues=issues,
        inspected_path=str(path),
    )


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def path_has_traversal(path_text: str) -> bool:
    return ".." in PurePosixPath(path_text.replace("\\", "/")).parts


def is_latest_path(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    return any(part.lower() == "latest.json" for part in value.replace("\\", "/").split("/"))


def is_blank(value: Any) -> bool:
    return value is None or value == "" or value == [] or value == {}


def walk_json(value: Any, path: tuple[str, ...] = ()) -> list[tuple[tuple[str, ...], Any]]:
    out = [(path, value)]
    if isinstance(value, dict):
        for key, item in value.items():
            out.extend(walk_json(item, path + (str(key),)))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            out.extend(walk_json(item, path + (str(index),)))
    return out


def collect_strings(value: Any) -> list[str]:
    strings: list[str] = []
    for path, item in walk_json(value):
        strings.extend(path)
        if isinstance(item, str):
            strings.append(item)
    return strings


def policy_path_context(path: tuple[str, ...]) -> bool:
    lowered = " ".join(part.lower() for part in path)
    return any(marker in lowered for marker in POLICY_CONTEXT_MARKERS) or any(
        marker in lowered
        for marker in (
            "forbidden_positive_claim_phrases",
            "allowed_language_examples",
            "blocked_fields",
            "allowed_fields",
            "expected_verdict",
            "blocking_issues",
            "issue",
            "issues",
        )
    )


def positive_claim_context(text: str) -> bool:
    lowered = text.lower()
    if any(marker in lowered for marker in POLICY_CONTEXT_MARKERS):
        return False
    return True


def scan_claim_language(texts: list[str]) -> list[str]:
    issues: list[str] = []
    for text in texts:
        lowered = text.lower()
        for phrase, issue in PHRASE_RULES:
            if phrase in lowered and positive_claim_context(text):
                issues.append(issue)
                if issue not in {"BLOCKED_LATEST_AS_EVIDENCE", "BLOCKED_CI_AS_PROOF"}:
                    issues.append("BLOCKED_OVERCLAIM_LANGUAGE")
    return dedupe(issues)


def scan_claim_language_json(data: Any) -> list[str]:
    issues: list[str] = []
    for path, item in walk_json(data):
        if not isinstance(item, str) or policy_path_context(path):
            continue
        issues.extend(scan_claim_language([item]))
    return dedupe(issues)


def latest_as_evidence_issues(data: Any) -> list[str]:
    issues: list[str] = []
    evidence_markers = {"evidence", "claim", "proof", "prove", "proves", "support", "supports", "result_ref"}
    for path, item in walk_json(data):
        if not is_latest_path(item):
            continue
        joined_path = " ".join(part.lower() for part in path)
        text = str(item).lower()
        if "latest_pointer" in joined_path or "pointer_only" in joined_path:
            continue
        if any(marker in joined_path for marker in evidence_markers) or any(marker in text for marker in evidence_markers):
            issues.append("BLOCKED_LATEST_AS_EVIDENCE")
    return dedupe(issues)


def holdout_exposure_issues(data: Any) -> list[str]:
    for path, item in walk_json(data):
        if policy_path_context(path):
            continue
        if path:
            key = path[-1].lower()
            if key in HOLDOUT_EXPOSURE_KEYS:
                return ["BLOCKED_HOLDOUT_EXPOSURE"]
        if isinstance(item, str):
            lowered = item.lower()
            if any(token in lowered for token in HOLDOUT_EXPOSURE_KEYS):
                return ["BLOCKED_HOLDOUT_EXPOSURE"]
            if re.search(r"(^|\b)fen\s*[:=]", lowered):
                return ["BLOCKED_HOLDOUT_EXPOSURE"]
    return []


def nested_object(data: dict[str, Any], keys: tuple[str, ...]) -> dict[str, Any]:
    for key in keys:
        value = data.get(key)
        if isinstance(value, dict):
            return value
    return {}


def field_value(data: dict[str, Any], containers: tuple[str, ...], field: str) -> Any:
    for container_name in containers:
        container = data.get(container_name)
        if isinstance(container, dict) and field in container:
            return container[field]
    return data.get(field)


def first_text_field(data: dict[str, Any], names: tuple[str, ...]) -> str:
    for name in names:
        value = data.get(name)
        if isinstance(value, str) and value:
            return value
    return ""


def evidence_marker(data: dict[str, Any]) -> str:
    for name in ("evidence_kind", "evidence_type", "evidence_scope", "bundle_type", "kind"):
        value = data.get(name)
        if isinstance(value, str) and value:
            return value.lower()
    for marker in CONTRACT_ONLY_MARKERS:
        value = data.get(marker.replace("-", "_"))
        if value is True:
            return marker
    return ""


def is_contract_only(data: dict[str, Any]) -> bool:
    marker = evidence_marker(data)
    normalized = marker.replace("_", "-")
    return normalized in {item.replace("_", "-") for item in CONTRACT_ONLY_MARKERS}


def is_policy_contract(data: dict[str, Any]) -> bool:
    schema_version = data.get("schema_version")
    return isinstance(schema_version, str) and schema_version.endswith("_contract.pr05")


def requested_claim(data: dict[str, Any]) -> str:
    explicit = first_text_field(data, ("requested_claim_verdict", "claim_verdict", "claim_scope"))
    if explicit in CLAIM_RANK:
        return explicit
    policy_case = first_text_field(data, ("claim_policy_case", "benchmark_type", "run_type"))
    if policy_case in CLAIM_SCOPE_MAPPING:
        return CLAIM_SCOPE_MAPPING[policy_case]
    return "NO_CLAIM_ALLOWED"


def mapped_claim(data: dict[str, Any]) -> str:
    policy_case = first_text_field(data, ("claim_policy_case", "benchmark_type", "run_type"))
    if policy_case in CLAIM_SCOPE_MAPPING:
        return CLAIM_SCOPE_MAPPING[policy_case]
    return requested_claim(data)


def claim_above_no_claim(claim: str) -> bool:
    return CLAIM_RANK.get(claim, 0) > CLAIM_RANK["NO_CLAIM_ALLOWED"]


def claim_is_strength_or_promotion(claim: str, texts: list[str]) -> bool:
    if claim in {"PROMOTION_REVIEW_CANDIDATE", "STRENGTH_CLAIM_CANDIDATE"}:
        return True
    lowered = " ".join(texts).lower()
    return any(token in lowered for token in ("promotion", "strength", "elo", "stronger", "better engine"))


def lineage_issues(data: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    for field in LINEAGE_FIELDS:
        if is_blank(field_value(data, ("data_lineage", "lineage", "dataset_lineage"), field)):
            issues.append(LINEAGE_ISSUES[field])
    if issues:
        issues.append("MISSING_DATASET_LINEAGE")
    return dedupe(issues)


def baseline_issues(data: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    for field in BASELINE_FIELDS:
        if is_blank(field_value(data, ("baseline", "baseline_context", "uncertainty"), field)):
            issues.append(BASELINE_ISSUES[field])
    return dedupe(issues)


def evaluate_json(data: dict[str, Any], path: Path) -> GateResult:
    issues: list[str] = []
    warnings: list[str] = []
    texts = collect_strings(data)

    issues.extend(scan_claim_language_json(data))
    issues.extend(latest_as_evidence_issues(data))
    issues.extend(holdout_exposure_issues(data))

    claim = mapped_claim(data)
    requested = requested_claim(data)
    if is_contract_only(data) or is_policy_contract(data):
        claim = "NO_CLAIM_ALLOWED"
        if claim_above_no_claim(requested):
            issues.append("BLOCKED_CLAIM_SCOPE")

    if claim_above_no_claim(claim):
        missing_lineage = lineage_issues(data)
        if missing_lineage:
            issues.extend(missing_lineage)
            claim = "NO_CLAIM_ALLOWED"

    if not is_policy_contract(data) and claim_is_strength_or_promotion(requested, texts):
        missing_baseline = baseline_issues(data)
        if missing_baseline:
            issues.extend(missing_baseline)
            claim = "NO_CLAIM_ALLOWED"

    issues = dedupe(issues)
    if issues:
        return GateResult(
            software_verdict="BLOCKED",
            evidence_verdict="INVALID",
            claim_verdict="NO_CLAIM_ALLOWED",
            blocking_issues=issues,
            warnings=warnings,
            inspected_path=str(path),
        )

    evidence = "CONTRACT_ONLY" if is_contract_only(data) or is_policy_contract(data) else "CLAIM_DATA_GATE_ONLY"
    if claim == "NO_CLAIM_ALLOWED" and evidence != "CONTRACT_ONLY":
        evidence = "CLAIM_DATA_GATE_ONLY"
    return GateResult(
        software_verdict="PASS",
        evidence_verdict=evidence,
        claim_verdict=claim,
        warnings=warnings,
        inspected_path=str(path),
    )


def evaluate_text(text: str, path: Path) -> GateResult:
    issues = scan_claim_language(text.splitlines())
    if "latest.json" in text.lower() and positive_claim_context(text):
        issues.append("BLOCKED_LATEST_AS_EVIDENCE")
    for token in HOLDOUT_EXPOSURE_KEYS:
        if token in text.lower():
            issues.append("BLOCKED_HOLDOUT_EXPOSURE")
            break
    issues = dedupe(issues)
    if issues:
        return GateResult(
            software_verdict="BLOCKED",
            evidence_verdict="INVALID",
            claim_verdict="NO_CLAIM_ALLOWED",
            blocking_issues=issues,
            inspected_path=str(path),
        )
    return GateResult(
        software_verdict="PASS",
        evidence_verdict="CLAIM_DATA_GATE_ONLY",
        claim_verdict="NO_CLAIM_ALLOWED",
        inspected_path=str(path),
    )


def merge_results(results: list[GateResult], inspected_path: Path) -> GateResult:
    issues: list[str] = []
    warnings: list[str] = []
    claim = "NO_CLAIM_ALLOWED"
    for result in results:
        issues.extend(result.blocking_issues)
        warnings.extend(result.warnings)
        if not issues and CLAIM_RANK.get(result.claim_verdict, 0) > CLAIM_RANK.get(claim, 0):
            claim = result.claim_verdict
    issues = dedupe(issues)
    if issues:
        return GateResult(
            software_verdict="BLOCKED",
            evidence_verdict="INVALID",
            claim_verdict="NO_CLAIM_ALLOWED",
            blocking_issues=issues,
            warnings=dedupe(warnings),
            inspected_path=str(inspected_path),
        )
    return GateResult(
        software_verdict="PASS",
        evidence_verdict="CLAIM_DATA_GATE_ONLY" if claim == "NO_CLAIM_ALLOWED" else "COMPLETE",
        claim_verdict=claim,
        warnings=dedupe(warnings),
        inspected_path=str(inspected_path),
    )


def safe_files(path: Path) -> tuple[list[Path], list[str], list[str]]:
    files: list[Path] = []
    issues: list[str] = []
    warnings: list[str] = []
    try:
        base = path.resolve()
    except OSError as exc:
        return files, [f"BLOCKED_PATH_TRAVERSAL: {exc}"], warnings

    candidates = [path] if path.is_file() else sorted(path.rglob("*"))
    for candidate in candidates:
        try:
            if candidate.is_symlink():
                resolved = candidate.resolve()
                try:
                    resolved.relative_to(base)
                except ValueError:
                    issues.append("BLOCKED_SYMLINK_ESCAPE")
                continue
            if candidate.is_file():
                resolved = candidate.resolve()
                try:
                    resolved.relative_to(base if path.is_dir() else path.parent.resolve())
                except ValueError:
                    issues.append("BLOCKED_PATH_TRAVERSAL")
                    continue
                files.append(candidate)
        except OSError as exc:
            warnings.append(f"UNCERTAIN_FILE_READ: {candidate}: {exc}")
    return files, dedupe(issues), dedupe(warnings)


def evaluate_file(path: Path) -> GateResult:
    try:
        if path.suffix.lower() == ".json":
            data = load_json(path)
            if not isinstance(data, dict):
                return blocked_result(path, ["CORRUPT_JSON: top level must be object"], "CORRUPT")
            return evaluate_json(data, path)
        text = path.read_text(encoding="utf-8")
        return evaluate_text(text, path)
    except json.JSONDecodeError as exc:
        return blocked_result(path, [f"CORRUPT_JSON: {exc}"], "CORRUPT")
    except UnicodeDecodeError as exc:
        return blocked_result(path, [f"CORRUPT_TEXT: {exc}"], "CORRUPT")
    except OSError as exc:
        return blocked_result(path, [f"UNCERTAIN_FILE_READ: {exc}"], "UNCERTAIN")
    except Exception as exc:
        return blocked_result(path, [f"UNCERTAIN_GATE_CRASH: {type(exc).__name__}: {exc}"], "UNCERTAIN")


def check_path(path: Path) -> GateResult:
    if path_has_traversal(str(path)):
        return blocked_result(path, ["BLOCKED_PATH_TRAVERSAL"])
    if not path.exists():
        return blocked_result(path, ["INSPECTED_PATH_NOT_FOUND"], "INCOMPLETE")
    files, issues, warnings = safe_files(path)
    if issues:
        return GateResult(
            software_verdict="BLOCKED",
            evidence_verdict="INVALID",
            claim_verdict="NO_CLAIM_ALLOWED",
            blocking_issues=issues,
            warnings=warnings,
            inspected_path=str(path),
        )
    if not files:
        return GateResult(
            software_verdict="BLOCKED",
            evidence_verdict="INCOMPLETE",
            claim_verdict="NO_CLAIM_ALLOWED",
            blocking_issues=["INSPECTED_PATH_HAS_NO_FILES"],
            warnings=warnings,
            inspected_path=str(path),
        )
    results = [evaluate_file(item) for item in files]
    merged = merge_results(results, path)
    merged.warnings.extend(warnings)
    return merged


def expected_matches(actual: dict[str, Any], expected: dict[str, Any]) -> bool:
    expected_issues = expected.get("blocking_issues", [])
    if actual.get("software_verdict") != expected.get("software_verdict"):
        return False
    if actual.get("evidence_verdict") != expected.get("evidence_verdict"):
        return False
    if actual.get("claim_verdict") != expected.get("claim_verdict"):
        return False
    return all(
        any(str(actual_issue).startswith(str(expected_issue)) for actual_issue in actual.get("blocking_issues", []))
        for expected_issue in expected_issues
    )


def parse_example_file(path: Path) -> dict[str, Any]:
    actual = evaluate_file(path).as_dict()
    try:
        data = load_json(path)
        expected = data.get("expected_verdict", {}) if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        expected = {}
    return {
        "example": path.name,
        "matched_expected": expected_matches(actual, expected),
        "actual": actual,
        "expected_verdict": expected,
    }


def example_mode(path: Path) -> dict[str, Any]:
    if path_has_traversal(str(path)):
        return blocked_result(path, ["BLOCKED_PATH_TRAVERSAL"]).as_dict()
    examples = [parse_example_file(item) for item in sorted(path.glob("*.json")) if item.is_file()]
    all_matched = bool(examples) and all(item["matched_expected"] for item in examples)
    return {
        "schema_version": SCHEMA_VERSION,
        "software_verdict": "PASS" if all_matched else "BLOCKED",
        "evidence_verdict": "CLAIM_DATA_GATE_ONLY" if all_matched else "INVALID",
        "claim_verdict": "NO_CLAIM_ALLOWED",
        "human_review_required": True,
        "blocking_issues": [] if all_matched else ["PR05_EXAMPLE_MODE_FAILED"],
        "warnings": [],
        "inspected_path": str(path),
        "gate_version": GATE_VERSION,
        "examples_checked": examples,
    }


def write_output(payload: dict[str, Any], output_path: Path, inspected_path: Path, pretty: bool) -> int:
    issues: list[str] = []
    if path_has_traversal(str(output_path)):
        issues.append("BLOCKED_PATH_TRAVERSAL")
    try:
        resolved_output = output_path.resolve()
        resolved_inspected = inspected_path.resolve()
        try:
            resolved_output.relative_to(resolved_inspected if inspected_path.is_dir() else resolved_inspected.parent)
            issues.append("BLOCKED_OUTPUT_PATH: output must not mutate inspected files")
        except ValueError:
            pass
        parts = [part.lower() for part in resolved_output.parts]
        if "lab" in parts and "runs" in parts:
            issues.append("BLOCKED_OUTPUT_PATH: output must not be written under lab/runs")
    except OSError as exc:
        issues.append(f"BLOCKED_OUTPUT_PATH: {exc}")
    if issues:
        blocked = blocked_result(inspected_path, issues).as_dict()
        sys.stdout.write(json.dumps(blocked, indent=2 if pretty else None, sort_keys=True) + "\n")
        return 1
    rendered = json.dumps(payload, indent=2 if pretty else None, sort_keys=True) + "\n"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(rendered, encoding="utf-8")
    return 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PR-05 claim-language and data-lineage gate.")
    parser.add_argument("--path", required=True, help="Claim/report file, directory, or PR-05 examples directory.")
    parser.add_argument("--output", help="Write JSON output to this path instead of stdout.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    parser.add_argument("--example-mode", action="store_true", help="Validate PR-05 mechanical examples.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    path = Path(args.path)
    if args.example_mode:
        payload = example_mode(path)
    else:
        payload = check_path(path).as_dict()
    if args.output:
        return write_output(payload, Path(args.output), path, args.pretty)
    sys.stdout.write(json.dumps(payload, indent=2 if args.pretty else None, sort_keys=True) + "\n")
    return 1 if payload.get("software_verdict") in {"FAIL", "BLOCKED"} else 0


if __name__ == "__main__":
    raise SystemExit(main())
