from __future__ import annotations

import argparse
import ast
import csv
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

MATERIAL_VALUES = {
    "Queen": 900,
    "Rook": 500,
    "Bishop": 300,
    "Knight": 300,
    "Pawn": 100,
    "King": 0,
}

PIECE_RE = re.compile(
    r"^(?P<player>[12]):(?P<piece>[A-Za-z]+):(?P<x>[-0-9]+):(?P<y>[-0-9]+):(?P<unit_id>[0-9]+)$"
)
PROMO_RE = re.compile(r"promotion:\s*([^};]+)", re.IGNORECASE)


@dataclass(frozen=True)
class PlyRecord:
    game_id: int
    ply: int
    player: int
    action: str
    legal_actions: int | None
    material_before_p1: int
    material_before_p2: int
    material_after_p1: int
    material_after_p2: int
    material_delta_for_player: int
    captured_piece_if_any: str | None
    promotion_if_any: str | None
    flags: list[str]


def parse_position(position: str) -> dict[int, tuple[int, str]]:
    """Parse compact position string to map unit_id -> (player, piece).

    Input format: player:Piece:x:y:unit_id|...
    """
    parsed: dict[int, tuple[int, str]] = {}
    if not position:
        return parsed
    for token in position.split("|"):
        token = token.strip()
        if not token:
            continue
        match = PIECE_RE.match(token)
        if not match:
            continue
        player = int(match.group("player"))
        piece = match.group("piece")
        unit_id = int(match.group("unit_id"))
        parsed[unit_id] = (player, piece)
    return parsed


def material_totals(units: dict[int, tuple[int, str]]) -> dict[int, int]:
    totals = {1: 0, 2: 0}
    for player, piece in units.values():
        totals[player] += MATERIAL_VALUES.get(piece, 0)
    return totals


def parse_legal_actions(raw: str | int | float | None) -> int | None:
    if raw is None or raw == "":
        return None
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return None
    if value < 0:
        return None
    return value


def parse_promotion(action: str) -> str | None:
    if not action:
        return None
    match = PROMO_RE.search(action)
    if not match:
        return None
    promo = match.group(1).strip()
    promo = promo.strip(",{}").strip()
    if not promo or promo.lower() == "none":
        return None
    return promo


def parse_mover_unit(action: str) -> int | None:
    """Extract mover unit id from the action string."""
    if not action:
        return None
    try:
        marker = "unit_id:"
        idx = action.find(marker)
        if idx == -1:
            return None
        tail = action[idx + len(marker):]
        value = int(ast.literal_eval(tail.split(";", 1)[0].strip()))
        return value
    except Exception:
        return None


def detect_capture(
    before_units: dict[int, tuple[int, str]],
    after_units: dict[int, tuple[int, str]],
    mover_unit: int | None,
) -> str | None:
    removed_ids = set(before_units.keys()) - set(after_units.keys())
    if not removed_ids:
        return None
    if mover_unit in removed_ids:
        removed_ids.discard(mover_unit)
    if len(removed_ids) != 1:
        return None if len(removed_ids) == 0 else "multiple"
    removed_unit = next(iter(removed_ids))
    piece = before_units.get(removed_unit)
    return piece[1] if piece else "unknown"


def is_king_only_survival(units: dict[int, tuple[int, str]]) -> bool:
    counts = Counter((player, piece) for player, piece in units.values())
    return all(counts[(1, "King")] <= 1 and counts[(1, p)] == 0 for p in MATERIAL_VALUES if p != "King") and all(
        counts[(2, "King")] <= 1 and counts[(2, p)] == 0 for p in MATERIAL_VALUES if p != "King"
    )


def format_flags(flags: list[str]) -> list[str]:
    return sorted(set(flags), key=str.lower)


def build_flags(
    legal_actions: int | None,
    delta_for_player: int,
    capture_piece: str | None,
    promotion: str | None,
    king_only: bool,
    king_only_repeat: bool,
) -> list[str]:
    flags: list[str] = []
    if abs(delta_for_player) >= 300:
        flags.append("large_material_swing")
    if capture_piece in {"Rook", "Queen"}:
        flags.append("rook_or_queen_lost")
    if legal_actions is not None and legal_actions <= 3:
        flags.append("mobility_collapse")
    if promotion is not None:
        flags.append("promotion")
    if king_only_repeat:
        flags.append("repeated_king_only_survival")
    return format_flags(flags)


def format_record(record: PlyRecord) -> dict[str, Any]:
    return {
        "game_id": record.game_id,
        "ply": record.ply,
        "player": record.player,
        "action": record.action,
        "legal_actions": record.legal_actions,
        "material_before_p1": record.material_before_p1,
        "material_before_p2": record.material_before_p2,
        "material_after_p1": record.material_after_p1,
        "material_after_p2": record.material_after_p2,
        "material_delta_for_player": record.material_delta_for_player,
        "captured_piece_if_any": record.captured_piece_if_any,
        "promotion_if_any": record.promotion_if_any,
        "flags": record.flags,
    }


def build_recommendation_rows(rows: list[PlyRecord]) -> list[PlyRecord]:
    ranked = []
    for row in rows:
        score = abs(row.material_delta_for_player)
        score += 1_000 if "promotion" in row.flags else 0
        score += 600 if "rook_or_queen_lost" in row.flags else 0
        score += 300 if "mobility_collapse" in row.flags else 0
        score += 200 if "repeated_king_only_survival" in row.flags else 0
        ranked.append((score, row.material_after_p1 + row.material_after_p2, row))

    # Higher score first, then total material for stable deterministic order.
    ranked.sort(key=lambda item: (item[0], item[1]), reverse=True)
    return [item[2] for item in ranked[:50]]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Analyze tactical material swings and candidate plies from selfplay moves CSV."
    )
    parser.add_argument("--input", type=Path, required=True, help="Path to lab/selfplay/moves.csv")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("lab/reports/game_analysis"),
        help="Output directory for reports",
    )
    return parser.parse_args()


def build_markdown(rows: list[PlyRecord], out_json: dict[str, Any]) -> str:
    def fmt_piece(row: PlyRecord) -> str:
        return row.captured_piece_if_any or "-"

    def fmt_flag(row: PlyRecord) -> str:
        return ", ".join(row.flags) if row.flags else "-"

    def fmt_promo(row: PlyRecord) -> str:
        return row.promotion_if_any or "-"

    top_swings = out_json["top_20_material_swings"]
    promos = out_json["promotion_plies"]
    collapses = out_json["mobility_collapse_plies"]
    recommended = out_json["recommended_plies"]

    lines = [
        "# Move Swing Analysis",
        "",
        "## Summary",
        f"- Total plies processed: {len(rows)}",
        f"- Total flagged plies: {out_json['total_flagged_plies']}",
        f"- Large swings (>=300): {out_json['large_swing_count']}",
        f"- Rook/Queen losses: {out_json['rook_or_queen_loss_count']}",
        f"- Promotions: {out_json['promotion_count']}",
        f"- Mobility collapses (<=3): {out_json['mobility_collapse_count']}",
        "",
        "## Top 20 Material Swings",
        "| Game | Ply | Player | Delta | Material P1 -> P2 | Capture | Promotion | Flags | Action |",
        "| --- | --- | --- | ---: | --- | --- | --- | --- | --- |",
    ]

    for item in top_swings:
        row = item["row"]
        d = row["material_delta_for_player"]
        sign = "+" if d >= 0 else ""
        lines.append(
            f"| {row['game_id']} | {row['ply']} | {row['player']} | {sign}{d} | "
            f"{row['material_before_p1']}->{row['material_after_p1']} / "
            f"{row['material_before_p2']}->{row['material_after_p2']} | "
            f"{fmt_piece(PlyRecord(**{k: row[k] for k in PlyRecord.__annotations__.keys()}))} | "
            f"{fmt_promo(PlyRecord(**{k: row[k] for k in PlyRecord.__annotations__.keys()}))} | "
            f"{fmt_flag(PlyRecord(**{k: row[k] for k in PlyRecord.__annotations__.keys()}))} | `{row['action']}` |"
        )

    def section_rows(items: list[dict[str, Any]], title: str, caption: str) -> list[str]:
        out = [f"## {title}", "", caption, "", "| Game | Ply | Player | Delta | Action | Capture | Promotion | Flags |", "| --- | --- | --- | ---: | --- | --- | --- | --- |",]
        for item in items:
            out.append(
                f"| {item['game_id']} | {item['ply']} | {item['player']} | "
                f"{item['material_delta_for_player']:+} | `{item['action']}` | "
                f"{item['captured_piece_if_any'] or '-'} | {item['promotion_if_any'] or '-'} | "
                f"{', '.join(item['flags']) if item['flags'] else '-'} |"
            )
        if not items:
            out.append("| - | - | - | - | - | - | - | - |")
        out.append("")
        return out

    lines.extend(section_rows(promos, "Promotion Plies", "Plies with `promotion` detected."))
    lines.extend(
        section_rows(
            collapses,
            "Mobility Collapse Plies",
            "Plies where legal_actions <= 3 and action is still logged.",
        )
    )

    lines.extend([
        "## Recommended Plies for GAME_DECISION_TRACE",
        "",
        "Priority is high for large material swings, rook/queen losses, promotions, and mobility collapse.",
        "",
        "| Game | Ply | Player | Priority Flags |",
        "| --- | --- | --- | --- |",
    ])

    for item in recommended:
        row = PlyRecord(**{k: item[k] for k in PlyRecord.__annotations__.keys()})
        lines.append(
            f"| {row.game_id} | {row.ply} | {row.player} | {', '.join(row.flags) if row.flags else '-'} |"
        )

    return "\n".join(lines) + "\n"


def main() -> int:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    rows: list[PlyRecord] = []
    prev_king_only = False

    with args.input.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for raw in reader:
            try:
                game_id = int(raw["game_id"])
                ply = int(raw["ply"])
                player = int(raw["player"])
                action = raw.get("action", "").strip()
                legal_actions = parse_legal_actions(raw.get("legal_actions"))
            except Exception:
                continue

            before_units = parse_position(raw.get("position_before", ""))
            after_units = parse_position(raw.get("position_after", ""))
            before_mat = material_totals(before_units)
            after_mat = material_totals(after_units)

            material_delta = (after_mat.get(player, 0) - before_mat.get(player, 0))
            moved = parse_mover_unit(action)
            captured = detect_capture(before_units, after_units, moved)
            promo = parse_promotion(action)

            is_king_only = is_king_only_survival(before_units) and is_king_only_survival(after_units)
            king_only_repeat = is_king_only and prev_king_only
            prev_king_only = is_king_only

            record = PlyRecord(
                game_id=game_id,
                ply=ply,
                player=player,
                action=action,
                legal_actions=legal_actions,
                material_before_p1=before_mat.get(1, 0),
                material_before_p2=before_mat.get(2, 0),
                material_after_p1=after_mat.get(1, 0),
                material_after_p2=after_mat.get(2, 0),
                material_delta_for_player=material_delta,
                captured_piece_if_any=captured,
                promotion_if_any=promo,
                flags=[],
            )
            record.flags = build_flags(
                legal_actions=record.legal_actions,
                delta_for_player=record.material_delta_for_player,
                capture_piece=record.captured_piece_if_any,
                promotion=record.promotion_if_any,
                king_only=is_king_only,
                king_only_repeat=king_only_repeat,
            )
            rows.append(record)

    swing_rows = sorted(rows, key=lambda r: abs(r.material_delta_for_player), reverse=True)
    top_20_swings = [format_record(r) for r in swing_rows[:20]]
    promotion_rows = [format_record(r) for r in rows if r.promotion_if_any is not None]
    mobility_rows = [format_record(r) for r in rows if r.legal_actions is not None and r.legal_actions <= 3]
    recommended = [format_record(r) for r in build_recommendation_rows(rows)]

    flagged = [r for r in rows if r.flags]

    json_payload = {
        "meta": {
            "input": str(args.input),
            "rows": len(rows),
        },
        "top_20_material_swings": top_20_swings,
        "promotion_plies": promotion_rows,
        "mobility_collapse_plies": mobility_rows,
        "recommended_plies": recommended,
        "summary": {
            "total_flagged_plies": len(flagged),
            "large_swing_count": sum(1 for r in rows if abs(r.material_delta_for_player) >= 300),
            "rook_or_queen_loss_count": sum(1 for r in rows if r.captured_piece_if_any in {"Rook", "Queen"}),
            "promotion_count": len(promotion_rows),
            "mobility_collapse_count": len(mobility_rows),
            "repeated_king_only_survival_count": sum(1 for r in rows if "repeated_king_only_survival" in r.flags),
        },
    }

    # Mirror keys expected by caller request.
    json_payload["rows"] = [format_record(r) for r in rows]
    json_payload["total_flagged_plies"] = len(flagged)
    json_payload["large_swing_count"] = json_payload["summary"]["large_swing_count"]
    json_payload["rook_or_queen_loss_count"] = json_payload["summary"]["rook_or_queen_loss_count"]
    json_payload["promotion_count"] = json_payload["summary"]["promotion_count"]
    json_payload["mobility_collapse_count"] = json_payload["summary"]["mobility_collapse_count"]

    json_path = args.output_dir / "move_swing_latest.json"
    md_path = args.output_dir / "move_swing_latest.md"

    with json_path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(json_payload, f, ensure_ascii=False, indent=2)

    md_text = build_markdown(rows, {
        "total_flagged_plies": json_payload["total_flagged_plies"],
        "large_swing_count": json_payload["large_swing_count"],
        "rook_or_queen_loss_count": json_payload["rook_or_queen_loss_count"],
        "promotion_count": json_payload["promotion_count"],
        "mobility_collapse_count": json_payload["mobility_collapse_count"],
        "top_20_material_swings": top_20_swings,
        "promotion_plies": promotion_rows,
        "mobility_collapse_plies": mobility_rows,
        "recommended_plies": recommended,
    })
    md_path.write_text(md_text, encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())