import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any


CODEX_REPORT_RE = re.compile(r"^codex_.*\.md$")


@dataclass
class StatusEntry:
    status: str
    path: str
    staged: bool
    unstaged: bool
    untracked: bool


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check local workspace hygiene for generated and protected files.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    return parser.parse_args(argv)


def normalize_path(path: str) -> str:
    normalized = path.strip().replace("\\", "/")
    if normalized.startswith("./"):
        return normalized[2:]
    return normalized


def parse_porcelain_line(line: str) -> StatusEntry | None:
    if len(line) < 4:
        return None
    status = line[:2]
    payload = line[3:].strip()
    if not payload:
        return None
    if " -> " in payload:
        _, payload = payload.split(" -> ", 1)
    path = normalize_path(payload)
    untracked = status == "??"
    staged = status[0] not in (" ", "?", "!")
    unstaged = status[1] not in (" ", "?", "!")
    return StatusEntry(status=status, path=path, staged=staged, unstaged=unstaged, untracked=untracked)


def is_sandbox_output(path: str) -> bool:
    return path.startswith("lab/gameplay_observation/sandbox_outputs/")


def is_tmp_path(path: str) -> bool:
    return path.startswith("lab/tmp_pr03_tests/") or path.startswith("lab/tmp_")


def is_tmp_workspace_name(name: str) -> bool:
    return name == "tmp_pr03_tests" or name.startswith("tmp_")


def repo_relative_path(path: Path, repo_root: Path) -> str:
    try:
        relative_path = path.relative_to(repo_root)
    except ValueError:
        relative_path = path
    return normalize_path(relative_path.as_posix())


def probe_inaccessible_tmp_paths(repo_root: Path | None = None) -> list[str]:
    root = repo_root or Path(".")
    lab_dir = root / "lab"
    issues: list[str] = []

    try:
        candidates = list(lab_dir.iterdir())
    except FileNotFoundError:
        return []
    except PermissionError as exc:
        return [f"{repo_relative_path(lab_dir, root)}: {exc.strerror or exc}"]

    for candidate in candidates:
        if not is_tmp_workspace_name(candidate.name):
            continue

        try:
            iterator = candidate.iterdir()
            try:
                next(iterator, None)
            finally:
                close = getattr(iterator, "close", None)
                if close is not None:
                    close()
        except FileNotFoundError:
            continue
        except NotADirectoryError:
            continue
        except PermissionError as exc:
            issues.append(f"{repo_relative_path(candidate, root)}: {exc.strerror or exc}")

    return sorted(set(issues))


def is_codex_report(path: str) -> bool:
    return bool(CODEX_REPORT_RE.match(path))


def is_protected_output(path: str) -> bool:
    return (
        path.startswith("lab/runs/")
        or path == "latest.json"
        or path.startswith("holdout/")
        or path.startswith("lab/holdout/")
    )


def is_benchmark_output(path: str) -> bool:
    file_name = PurePosixPath(path).name.lower()
    return (
        path.startswith("lab/benchmarks/")
        or path.startswith("lab/benchmark_outputs/")
        or path.startswith("benchmark_outputs/")
        or path.startswith("benchmarks/")
        or file_name.startswith("bench_topk_")
        or file_name.startswith("benchmark_")
    )


def classify_noise(path: str) -> str:
    if is_codex_report(path):
        return "CODEX_LOCAL_REPORT"
    if is_sandbox_output(path):
        return "SANDBOX_OUTPUT"
    if path.startswith("lab/tmp_pr03_tests/"):
        return "TMP_PR03_TESTS"
    if path.startswith("lab/tmp_"):
        return "TMP_LAB_WORKSPACE"
    return "UNTRACKED_LOCAL"


def blocked_reason_for_staged(path: str) -> str | None:
    if is_sandbox_output(path):
        return f"BLOCKED_STAGED_SANDBOX_OUTPUT: {path}"
    if is_codex_report(path):
        return f"BLOCKED_STAGED_CODEX_REPORT: {path}"
    if is_protected_output(path):
        return f"BLOCKED_STAGED_PROTECTED_OUTPUT: {path}"
    if is_benchmark_output(path):
        return f"BLOCKED_STAGED_BENCHMARK_OUTPUT: {path}"
    return None


def run_git_status() -> tuple[list[StatusEntry], list[str], list[str], int]:
    result = subprocess.run(
        ["git", "status", "--porcelain"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    blocked_reasons: list[str] = []
    warnings: list[str] = []
    entries: list[StatusEntry] = []

    if result.returncode != 0:
        blocked_reasons.append(f"GIT_STATUS_FAILED: {result.stderr.strip() or 'unknown error'}")
        return entries, blocked_reasons, warnings, result.returncode

    if result.stderr.strip():
        warnings.append(f"GIT_STATUS_WARNING: {result.stderr.strip()}")

    for raw_line in result.stdout.splitlines():
        entry = parse_porcelain_line(raw_line)
        if entry is None:
            warnings.append(f"UNPARSED_STATUS_LINE: {raw_line}")
            continue
        entries.append(entry)

    return entries, blocked_reasons, warnings, result.returncode


def build_report(entries: list[StatusEntry], blocked_reasons: list[str], warnings: list[str]) -> dict[str, Any]:
    tracked_changes: list[dict[str, Any]] = []
    local_noise: list[dict[str, Any]] = []

    for entry in entries:
        if entry.untracked:
            local_noise.append(
                {
                    "path": entry.path,
                    "status": entry.status,
                    "category": classify_noise(entry.path),
                }
            )
            continue

        tracked_changes.append(
            {
                "path": entry.path,
                "status": entry.status,
                "staged": entry.staged,
                "unstaged": entry.unstaged,
            }
        )

        if entry.staged:
            maybe_blocked = blocked_reason_for_staged(entry.path)
            if maybe_blocked:
                blocked_reasons.append(maybe_blocked)

    blocked_reasons = sorted(set(blocked_reasons))
    local_noise = sorted(local_noise, key=lambda item: item["path"])
    tracked_changes = sorted(tracked_changes, key=lambda item: item["path"])

    if blocked_reasons:
        software_verdict = "BLOCKED"
        hygiene_verdict = "BLOCKED_STAGED_GENERATED_OUTPUT"
    else:
        software_verdict = "PASS"
        hygiene_verdict = "LOCAL_NOISE_PRESENT" if local_noise else "CLEAN"

    return {
        "software_verdict": software_verdict,
        "hygiene_verdict": hygiene_verdict,
        "blocked_reasons": blocked_reasons,
        "warnings": warnings,
        "tracked_changes": tracked_changes,
        "local_noise": local_noise,
    }


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    entries, blocked_reasons, warnings, _ = run_git_status()
    tmp_access_issues = probe_inaccessible_tmp_paths()
    warnings.extend(f"TMP_ACCESS_DENIED: {issue}" for issue in tmp_access_issues)
    report = build_report(entries, blocked_reasons, warnings)
    report["tmp_access_issues"] = tmp_access_issues
    print(json.dumps(report, indent=2 if args.pretty else None, sort_keys=True))
    return 1 if report["blocked_reasons"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
