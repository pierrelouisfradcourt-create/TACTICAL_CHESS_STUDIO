import argparse
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


DEFAULT_INPUTS = [
    "lab/datasets/clean_conversion_pack.jsonl",
    "lab/datasets/conversion_fixed_candidates_20260424.jsonl",
]
DEFAULT_OUTPUT = "lab/suites/conversion_suite_v1.jsonl"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build Conversion Suite V1 JSONL from existing packs.")
    parser.add_argument(
        "--input",
        action="append",
        default=[],
        help="Input JSONL (can be repeated). Defaults to clean + fixed candidates.",
    )
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Output suite JSONL path.")
    parser.add_argument("--max-cases", type=int, default=50, help="Maximum cases to emit.")
    return parser.parse_args()


def iter_jsonl_rows(path: Path) -> Iterable[Dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            stripped = line.strip()
            if not stripped:
                continue
            yield json.loads(stripped)


def expected_winner_from_result(result: Any) -> Optional[int]:
    if result == "1-0":
        return 1
    if result == "0-1":
        return 2
    return None


def main() -> None:
    args = parse_args()

    input_paths = [Path(p) for p in (args.input or DEFAULT_INPUTS)]
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    seen_fens = set()
    cases: List[Dict[str, Any]] = []

    for input_path in input_paths:
        if not input_path.exists():
            raise SystemExit(f"Missing input: {input_path}")

        for row in iter_jsonl_rows(input_path):
            fen = str(row.get("fen", "") or "").strip()
            if not fen or fen in seen_fens:
                continue

            expected_winner = expected_winner_from_result(row.get("result"))
            if expected_winner is None:
                continue

            seen_fens.add(fen)

            cases.append(
                {
                    "schema_version": 1,
                    "case_id": "",  # filled later
                    "fen": fen,
                    "expected_winner": expected_winner,
                    "source_set": input_path.name,
                    "source_path": row.get("source_path"),
                    "source_file": row.get("source_file"),
                    "source_game_index": row.get("source_game_index"),
                    "ply_index": row.get("ply_index"),
                    "conversion_phase_label": row.get("conversion_phase_label"),
                }
            )

            if len(cases) >= args.max_cases:
                break

        if len(cases) >= args.max_cases:
            break

    for i, case in enumerate(cases, start=1):
        case["case_id"] = f"cs1_{i:04d}"

    with out_path.open("w", encoding="utf-8", newline="\n") as handle:
        for case in cases:
            handle.write(json.dumps(case, ensure_ascii=False) + "\n")

    print(f"Wrote {len(cases)} cases -> {out_path}")


if __name__ == "__main__":
    main()

