import argparse
import json
from pathlib import Path
from statistics import mean
from typing import Any, Dict, Iterable, List, Tuple


DEFAULT_INPUT = "lab/pedagogy_db/promoted_pedagogy_pack.jsonl"
DEFAULT_OUTPUT = "lab/datasets/clean_conversion_pack.jsonl"
DEFAULT_STATS_JSON = "lab/reports/clean_conversion_pack_stats.json"
DEFAULT_STATS_MD = "lab/reports/clean_conversion_pack_stats.md"
DEFAULT_FINAL_N_PLIES = 12
DEFAULT_OPENING_MAX_PLY = 20
DEFAULT_MIN_FINAL_PHASE_PLY = 25


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Export a clean conversion-only pack from the promoted pedagogy pack "
            "using decisive games and final-phase row filtering."
        )
    )
    parser.add_argument("--input", default=DEFAULT_INPUT, help="Source JSONL dataset.")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Filtered conversion JSONL output.")
    parser.add_argument(
        "--stats-json",
        default=DEFAULT_STATS_JSON,
        help="Machine-readable stats output.",
    )
    parser.add_argument(
        "--stats-md",
        default=DEFAULT_STATS_MD,
        help="Human-readable stats output.",
    )
    parser.add_argument(
        "--final-n-plies",
        type=int,
        default=DEFAULT_FINAL_N_PLIES,
        help="Keep only the final N plies from each eligible game.",
    )
    parser.add_argument(
        "--opening-max-ply",
        type=int,
        default=DEFAULT_OPENING_MAX_PLY,
        help="Ply threshold at or below which rows count as opening contamination.",
    )
    parser.add_argument(
        "--min-final-phase-ply",
        type=int,
        default=DEFAULT_MIN_FINAL_PHASE_PLY,
        help="Minimum ply allowed in the clean final-phase conversion pack.",
    )
    return parser.parse_args()


def iter_jsonl_rows(path: Path) -> Iterable[Dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            stripped = line.strip()
            if not stripped:
                continue
            yield json.loads(stripped)


def game_key(row: Dict[str, Any]) -> Tuple[str, str, str]:
    source_file = str(row.get("source_file", "") or "")
    source_game_index = str(row.get("source_game_index", "") or "")
    game_id = str(row.get("game_id", "") or "")
    return source_file, source_game_index, game_id


def avg_ply(rows: List[Dict[str, Any]]) -> float:
    if not rows:
        return 0.0
    return float(mean(int(row.get("ply_index", 0) or 0) for row in rows))


def opening_rows(rows: List[Dict[str, Any]], opening_max_ply: int) -> int:
    return sum(1 for row in rows if int(row.get("ply_index", 0) or 0) <= opening_max_ply)


def build_clean_conversion_pack(
    rows: List[Dict[str, Any]],
    final_n_plies: int,
    opening_max_ply: int,
    min_final_phase_ply: int,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    if final_n_plies <= 0:
        raise ValueError("--final-n-plies must be positive.")
    if min_final_phase_ply <= opening_max_ply:
        raise ValueError("--min-final-phase-ply must be greater than --opening-max-ply.")

    conversion_rows = [
        row for row in rows if str(row.get("candidate_family_guess", "") or "").strip().lower() == "conversion"
    ]
    decisive_conversion_rows = [
        row for row in conversion_rows if row.get("result") in {"1-0", "0-1"}
    ]

    grouped: Dict[Tuple[str, str, str], List[Dict[str, Any]]] = {}
    for row in decisive_conversion_rows:
        grouped.setdefault(game_key(row), []).append(row)

    kept_rows: List[Dict[str, Any]] = []
    per_game_stats: List[Dict[str, Any]] = []
    skipped_games = 0

    for key in sorted(grouped.keys()):
        group = sorted(grouped[key], key=lambda item: int(item.get("ply_index", 0) or 0))
        if not group:
            continue

        max_ply = int(group[-1].get("ply_index", 0) or 0)
        final_phase_start = max(max_ply - final_n_plies + 1, min_final_phase_ply)
        selected = [
            row
            for row in group
            if int(row.get("ply_index", 0) or 0) >= final_phase_start
            and int(row.get("ply_index", 0) or 0) > opening_max_ply
            and int(row.get("ply_index", 0) or 0) >= min_final_phase_ply
        ]

        if not selected:
            skipped_games += 1
            continue

        source_file, source_game_index, game_id = key
        for row in selected:
            row["candidate_family_guess"] = "conversion"
            row["conversion_phase_label"] = "final_phase"
            row["conversion_filter_version"] = "clean_conversion_pack_v1"
            row["conversion_filter_rule"] = (
                f"decisive game, ply>{opening_max_ply}, "
                f"ply>={min_final_phase_ply}, final_{final_n_plies}_plies_only"
            )
        kept_rows.extend(selected)
        per_game_stats.append(
            {
                "source_file": source_file,
                "source_game_index": source_game_index,
                "game_id": game_id or None,
                "rows_kept": len(selected),
                "min_ply_kept": int(selected[0].get("ply_index", 0) or 0),
                "max_ply_kept": int(selected[-1].get("ply_index", 0) or 0),
                "game_max_ply": max_ply,
            }
        )

    before_rows = len(conversion_rows)
    after_rows = len(kept_rows)
    before_opening = opening_rows(conversion_rows, opening_max_ply)
    after_opening = opening_rows(kept_rows, opening_max_ply)
    removed_opening = before_opening - after_opening
    opening_removed_pct = 0.0
    if before_opening > 0:
        opening_removed_pct = (removed_opening / before_opening) * 100.0

    stats = {
        "filter_version": "clean_conversion_pack_v1",
        "source_dataset": DEFAULT_INPUT,
        "rules": {
            "candidate_family_guess": "conversion",
            "decisive_games_only": True,
            "opening_max_ply": opening_max_ply,
            "min_final_phase_ply": min_final_phase_ply,
            "final_n_plies": final_n_plies,
        },
        "before": {
            "rows": before_rows,
            "avg_ply": avg_ply(conversion_rows),
            "opening_rows": before_opening,
        },
        "after": {
            "rows": after_rows,
            "avg_ply": avg_ply(kept_rows),
            "opening_rows": after_opening,
        },
        "delta": {
            "rows_kept": after_rows,
            "rows_removed": before_rows - after_rows,
            "opening_contamination_removed_pct": opening_removed_pct,
        },
        "games_considered": len(grouped),
        "games_with_rows_kept": len(per_game_stats),
        "games_skipped_after_phase_filter": skipped_games,
        "per_game": per_game_stats,
    }
    return kept_rows, stats


def write_jsonl(path: Path, rows: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=True) + "\n")


def write_stats_json(path: Path, stats: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(stats, indent=2), encoding="utf-8")


def render_stats_md(stats: Dict[str, Any], output_path: Path) -> str:
    rules = stats["rules"]
    before = stats["before"]
    after = stats["after"]
    delta = stats["delta"]
    lines = [
        "# Clean Conversion Pack Stats",
        "",
        f"Source dataset: `{stats['source_dataset']}`",
        f"Output dataset: `{output_path.as_posix()}`",
        "",
        "Rules:",
        f"- decisive games only: `{rules['decisive_games_only']}`",
        f"- opening max ply: `{rules['opening_max_ply']}`",
        f"- minimum final-phase ply: `{rules['min_final_phase_ply']}`",
        f"- final N plies: `{rules['final_n_plies']}`",
        "",
        "Before:",
        f"- rows: {before['rows']}",
        f"- avg ply: {before['avg_ply']:.2f}",
        f"- opening rows: {before['opening_rows']}",
        "",
        "After:",
        f"- rows: {after['rows']}",
        f"- avg ply: {after['avg_ply']:.2f}",
        f"- opening rows: {after['opening_rows']}",
        "",
        "Delta:",
        f"- rows kept: {delta['rows_kept']}",
        f"- rows removed: {delta['rows_removed']}",
        f"- opening contamination removed %: {delta['opening_contamination_removed_pct']:.2f}",
        "",
        "Game summary:",
        f"- games considered: {stats['games_considered']}",
        f"- games kept: {stats['games_with_rows_kept']}",
        f"- games skipped after phase filter: {stats['games_skipped_after_phase_filter']}",
    ]
    return "\n".join(lines) + "\n"


def write_stats_md(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)
    stats_json_path = Path(args.stats_json)
    stats_md_path = Path(args.stats_md)

    rows = list(iter_jsonl_rows(input_path))
    kept_rows, stats = build_clean_conversion_pack(
        rows=rows,
        final_n_plies=args.final_n_plies,
        opening_max_ply=args.opening_max_ply,
        min_final_phase_ply=args.min_final_phase_ply,
    )
    stats["source_dataset"] = input_path.as_posix()

    write_jsonl(output_path, kept_rows)
    write_stats_json(stats_json_path, stats)
    write_stats_md(stats_md_path, render_stats_md(stats, output_path))

    print(f"rows kept: {stats['delta']['rows_kept']}")
    print(f"rows removed: {stats['delta']['rows_removed']}")
    print(f"avg ply before: {stats['before']['avg_ply']:.2f}")
    print(f"avg ply after: {stats['after']['avg_ply']:.2f}")
    print(
        "opening contamination removed %: "
        f"{stats['delta']['opening_contamination_removed_pct']:.2f}"
    )
    print(f"output: {output_path.as_posix()}")
    print(f"stats json: {stats_json_path.as_posix()}")
    print(f"stats md: {stats_md_path.as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
