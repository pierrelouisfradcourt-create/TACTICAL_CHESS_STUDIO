import argparse
import json
import sys
from collections import Counter

from move_vocab import try_move_to_index


def has_aaa_payload(row: dict) -> bool:
    aaa_fields = [
        "aaa_search_depth",
        "aaa_search_score",
        "aaa_heuristic_score",
        "aaa_policy_score",
        "aaa_decision_score",
        "aaa_second_best_search_gap",
        "aaa_second_best_decision_gap",
        "aaa_nodes",
        "aaa_q_nodes",
        "aaa_beta_cutoffs",
        "aaa_tt_hits",
        "aaa_ordering_cutoff_index",
        "aaa_best_move_initial_rank",
        "aaa_best_move_final_rank",
        "aaa_principal_changed",
        "aaa_confidence",
    ]
    for field in aaa_fields:
        if row.get(field) is not None:
            return True

    return bool(row.get("aaa_alt_moves")) or bool(row.get("aaa_alt_decision_scores"))


def parse_boolish(value, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value) != 0.0
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "on"}:
            return True
        if normalized in {"0", "false", "no", "off", ""}:
            return False
    return default


def aaa_signal_status(aaa_rows: int, rows: int, avg_valid_alt: float) -> str:
    if aaa_rows <= 0:
        return "absent"
    if aaa_rows / max(rows, 1) < 0.05 or avg_valid_alt <= 0.0:
        return "sparse"
    return "usable"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--large-threshold", type=int, default=1000)
    parser.add_argument("--min-unique-fen-ratio", type=float, default=0.20)
    parser.add_argument("--min-unique-best-move-ratio", type=float, default=0.10)
    args = parser.parse_args()

    rows = 0
    unique_fens = set()
    unique_best_moves = set()
    result_counts = Counter()
    schema_version_counts = Counter()
    aaa_rows = 0
    aaa_used_search_rows = 0
    aaa_valid_alt_total = 0
    aaa_alt_unmapped = 0
    aaa_confidence_total = 0.0
    aaa_confidence_count = 0
    skipped_best_move_unmapped = 0
    missing_core = 0

    with open(args.input, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            if not line.strip():
                continue

            row = json.loads(line)

            fen = row.get("fen")
            best_move = row.get("best_move")
            result = row.get("result")
            schema_version = int(row.get("schema_version", 0) or 0)

            if not fen or not best_move or not result:
                missing_core += 1
                print(f"[FAIL] missing core field at line {line_no}")
                continue

            if try_move_to_index(best_move) is None:
                skipped_best_move_unmapped += 1

            rows += 1
            unique_fens.add(fen)
            unique_best_moves.add(best_move)
            result_counts[result] += 1
            schema_version_counts[schema_version] += 1
            if has_aaa_payload(row):
                aaa_rows += 1
                if parse_boolish(row.get("aaa_used_search", False), default=False):
                    aaa_used_search_rows += 1
                valid_alt_count = 0
                for alt_move in row.get("aaa_alt_moves", []) or []:
                    if try_move_to_index(alt_move) is None:
                        aaa_alt_unmapped += 1
                    else:
                        valid_alt_count += 1
                aaa_valid_alt_total += valid_alt_count
                raw_conf = row.get("aaa_confidence")
                if raw_conf is not None:
                    try:
                        aaa_confidence_total += float(raw_conf)
                        aaa_confidence_count += 1
                    except (TypeError, ValueError):
                        pass

    if rows == 0:
        print("[FAIL] dataset is empty or invalid")
        return 1

    unique_fen_ratio = len(unique_fens) / rows
    unique_best_move_ratio = len(unique_best_moves) / rows
    distinct_results = sum(1 for count in result_counts.values() if count > 0)

    print(f"rows={rows}")
    print(f"unique_fens={len(unique_fens)} ratio={unique_fen_ratio:.4f}")
    print(f"unique_best_moves={len(unique_best_moves)} ratio={unique_best_move_ratio:.4f}")
    print(
        "results="
        f"1-0:{result_counts.get('1-0', 0)} "
        f"0-1:{result_counts.get('0-1', 0)} "
        f"1/2-1/2:{result_counts.get('1/2-1/2', 0)}"
    )
    print(f"schema_versions={dict(schema_version_counts)}")
    avg_valid_alt = aaa_valid_alt_total / max(aaa_rows, 1)
    print(f"aaa_rows={aaa_rows}")
    print(f"aaa_status={aaa_signal_status(aaa_rows, rows, avg_valid_alt)}")
    print(f"aaa_used_search_proportion={aaa_used_search_rows / max(aaa_rows, 1):.4f}")
    print(f"avg_valid_aaa_alternatives_per_aaa_row={avg_valid_alt:.4f}")
    print(f"aaa_alt_unmapped={aaa_alt_unmapped}")
    print(f"skipped_best_move_vocab_mismatch={skipped_best_move_unmapped}")
    print(f"avg_aaa_confidence={aaa_confidence_total / max(aaa_confidence_count, 1):.4f}")
    print("aaa_alt_search_scores=diagnostic_only")

    failures = []

    if missing_core:
        failures.append(f"missing core rows: {missing_core}")

    if rows >= args.large_threshold:
        if unique_fen_ratio < args.min_unique_fen_ratio:
            failures.append(
                f"unique_fen_ratio too low: {unique_fen_ratio:.4f} < {args.min_unique_fen_ratio:.4f}"
            )
        if unique_best_move_ratio < args.min_unique_best_move_ratio:
            failures.append(
                "unique_best_move_ratio too low: "
                f"{unique_best_move_ratio:.4f} < {args.min_unique_best_move_ratio:.4f}"
            )
        if distinct_results < 2:
            failures.append("large dataset has only one result class")

    if failures:
        print("[FAIL] dataset health check failed")
        for failure in failures:
            print(f"  - {failure}")
        return 1

    print("[OK] dataset health check passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
