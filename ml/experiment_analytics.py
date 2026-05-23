import csv
import json
from pathlib import Path
from typing import Any, Dict, List, Optional


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _ratio(num: float, den: float) -> float:
    return 0.0 if den == 0 else float(num) / float(den)


def _read_csv(path: Path) -> List[Dict[str, str]]:
    if not path.exists():
        return []

    with path.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def _parse_runtime_log(log_path: Path) -> Dict[str, Any]:
    summary = {
        "matches_observed": 0,
        "move_runtime_lines": 0,
        "selection_calls": 0,
        "successful_inferences": 0,
        "fallback_events": 0,
        "fallback_no_uci_moves": 0,
        "fallback_predicted_move_not_found": 0,
        "fallback_python_bridge_failed": 0,
        "query_retries": 0,
        "retry_recoveries": 0,
        "contaminated_matches": 0,
        "policy_index_status": "unknown",
        "status": "unknown",
    }

    if not log_path.exists():
        summary["status"] = "log_missing"
        return summary

    observed_policy_indices = []
    saw_runtime_signal = False

    with log_path.open("r", encoding="utf-8", errors="ignore") as f:
        for raw in f:
            line = raw.strip()
            if line.startswith("NEURAL_MOVE_RUNTIME|"):
                saw_runtime_signal = True
                summary["move_runtime_lines"] += 1

                payload = {}
                for part in line.split("|")[1:]:
                    if "=" not in part:
                        continue
                    key, value = part.split("=", 1)
                    payload[key] = value

                if "policy_index" in payload:
                    try:
                        observed_policy_indices.append(int(payload["policy_index"]))
                    except Exception:
                        pass

                if payload.get("status") == "fallback":
                    summary["fallback_events"] += 1
                    reason = payload.get("reason", "")
                    if reason == "no_uci_moves":
                        summary["fallback_no_uci_moves"] += 1
                    elif reason == "predicted_move_not_found":
                        summary["fallback_predicted_move_not_found"] += 1
                    elif reason == "python_bridge_failed":
                        summary["fallback_python_bridge_failed"] += 1
                elif payload.get("status") == "success":
                    summary["successful_inferences"] += 1

                continue

            if line.startswith("NEURAL_POLICY_INDEX="):
                saw_runtime_signal = True
                try:
                    observed_policy_indices.append(int(line.split("=", 1)[1].strip()))
                except Exception:
                    pass
                continue

            if not line.startswith("NEURAL_MATCH_RUNTIME|"):
                continue

            saw_runtime_signal = True

            summary["matches_observed"] += 1
            payload = {}
            for part in line.split("|")[1:]:
                if "=" not in part:
                    continue
                key, value = part.split("=", 1)
                payload[key] = value

            summary["selection_calls"] += _safe_int(payload.get("selection_calls"))
            summary["successful_inferences"] += _safe_int(payload.get("successful_inferences"))
            summary["fallback_events"] += _safe_int(payload.get("fallback_events"))
            summary["fallback_no_uci_moves"] += _safe_int(payload.get("fallback_no_uci_moves"))
            summary["fallback_predicted_move_not_found"] += _safe_int(
                payload.get("fallback_predicted_move_not_found")
            )
            summary["fallback_python_bridge_failed"] += _safe_int(
                payload.get("fallback_python_bridge_failed")
            )
            summary["query_retries"] += _safe_int(payload.get("query_retries"))
            summary["retry_recoveries"] += _safe_int(payload.get("retry_recoveries"))

            if payload.get("status") == "fallback_contaminated":
                summary["contaminated_matches"] += 1
                summary["status"] = "fallback_contaminated"
            elif payload.get("status") == "clean" and summary["status"] != "fallback_contaminated":
                summary["status"] = "clean"

    if any(value >= 0 for value in observed_policy_indices):
        summary["policy_index_status"] = "valid"
    elif observed_policy_indices and all(value == -1 for value in observed_policy_indices):
        summary["policy_index_status"] = "invalid"

    if summary["fallback_events"] > 0 or summary["contaminated_matches"] > 0:
        summary["status"] = "fallback_contaminated"
    elif summary["status"] != "clean" and saw_runtime_signal:
        summary["status"] = "unknown"

    return summary


def _analyze_behavior(moves_rows: List[Dict[str, str]]) -> Dict[str, Dict[str, Any]]:
    by_profile: Dict[str, Dict[str, Any]] = {}

    for row in moves_rows:
        profile = (row.get("profile_used") or "").strip()
        if not profile:
            continue

        metrics = by_profile.setdefault(
            profile,
            {
                "moves": 0,
                "capture_moves": 0,
                "promotion_moves": 0,
                "repetition_moves": 0,
                "no_progress_moves": 0,
                "sum_legal_move_count": 0,
                "sum_no_capture_streak": 0,
                "sum_abs_material_diff": 0,
            },
        )

        metrics["moves"] += 1
        metrics["capture_moves"] += _safe_int(row.get("capture_flag"))
        metrics["promotion_moves"] += _safe_int(row.get("promotion_flag"))
        metrics["repetition_moves"] += _safe_int(row.get("repetition_flag"))
        metrics["no_progress_moves"] += _safe_int(row.get("no_progress_flag"))
        metrics["sum_legal_move_count"] += _safe_int(row.get("legal_move_count"))
        metrics["sum_no_capture_streak"] += _safe_int(row.get("no_capture_streak"))
        metrics["sum_abs_material_diff"] += abs(_safe_int(row.get("material_diff")))

    result: Dict[str, Dict[str, Any]] = {}
    for profile, metrics in by_profile.items():
        moves = metrics["moves"]
        result[profile] = {
            "moves": moves,
            "capture_rate": round(_ratio(metrics["capture_moves"], moves), 4),
            "promotion_rate": round(_ratio(metrics["promotion_moves"], moves), 4),
            "repetition_rate": round(_ratio(metrics["repetition_moves"], moves), 4),
            "no_progress_rate": round(_ratio(metrics["no_progress_moves"], moves), 4),
            "avg_legal_move_count": round(_ratio(metrics["sum_legal_move_count"], moves), 2),
            "avg_no_capture_streak": round(_ratio(metrics["sum_no_capture_streak"], moves), 2),
            "avg_abs_material_diff": round(_ratio(metrics["sum_abs_material_diff"], moves), 2),
        }

    return result


def analyze_tournament_dir(base_dir: Path, tournament_log: Optional[Path] = None) -> Dict[str, Any]:
    tournaments_dir = base_dir / "tournaments"
    games_rows = _read_csv(tournaments_dir / "games.csv")
    matches_rows = _read_csv(tournaments_dir / "matches.csv")
    elo_rows = _read_csv(tournaments_dir / "elo.csv")
    moves_rows = _read_csv(tournaments_dir / "moves_detailed.csv")

    total_games = len(games_rows)
    total_turns = sum(_safe_int(row.get("turns")) for row in games_rows)
    draw_games = sum(1 for row in games_rows if (row.get("winner") or "").strip() == "draw")
    turn_limit_games = sum(
        1 for row in games_rows if (row.get("termination") or "").strip() == "turn_limit"
    )
    winner_games = sum(
        1 for row in games_rows if (row.get("termination") or "").strip() == "winner"
    )

    elo_leaderboard = []
    elo_map: Dict[str, float] = {}
    for row in elo_rows:
        agent = (row.get("agent") or "").strip()
        elo = _safe_float(row.get("elo"))
        if not agent:
            continue
        elo_map[agent] = elo
        elo_leaderboard.append({"agent": agent, "elo": elo})

    elo_leaderboard.sort(key=lambda row: row["elo"], reverse=True)

    neural_rank = None
    for idx, row in enumerate(elo_leaderboard, start=1):
        if row["agent"] == "neural":
            neural_rank = idx
            break

    neural_matchups = []
    for row in matches_rows:
        agent_a = (row.get("agent_a") or "").strip()
        agent_b = (row.get("agent_b") or "").strip()
        if agent_a != "neural" and agent_b != "neural":
            continue

        neural_is_a = agent_a == "neural"
        wins = _safe_int(row.get("wins_a" if neural_is_a else "wins_b"))
        losses = _safe_int(row.get("wins_b" if neural_is_a else "wins_a"))
        draws = _safe_int(row.get("draws"))
        games = _safe_int(row.get("games"))

        neural_matchups.append(
            {
                "opponent": agent_b if neural_is_a else agent_a,
                "games": games,
                "wins": wins,
                "losses": losses,
                "draws": draws,
                "win_rate": round(_ratio(wins, games), 4),
                "draw_rate": round(_ratio(draws, games), 4),
                "loss_rate": round(_ratio(losses, games), 4),
            }
        )

    runtime_summary = _parse_runtime_log(tournament_log) if tournament_log else {
        "matches_observed": 0,
        "selection_calls": 0,
        "successful_inferences": 0,
        "fallback_events": 0,
        "fallback_no_uci_moves": 0,
        "fallback_predicted_move_not_found": 0,
        "fallback_python_bridge_failed": 0,
        "query_retries": 0,
        "retry_recoveries": 0,
        "contaminated_matches": 0,
        "status": "log_missing",
    }

    behavior_profiles = _analyze_behavior(moves_rows)

    return {
        "paths": {
            "base_dir": str(base_dir.resolve()),
            "tournaments_dir": str(tournaments_dir.resolve()),
        },
        "summary": {
            "total_games": total_games,
            "avg_turns": round(_ratio(total_turns, total_games), 2),
            "draw_rate": round(_ratio(draw_games, total_games), 4),
            "turn_limit_rate": round(_ratio(turn_limit_games, total_games), 4),
            "winner_termination_rate": round(_ratio(winner_games, total_games), 4),
        },
        "elo": {
            "leaderboard": elo_leaderboard,
            "map": elo_map,
            "neural_elo": elo_map.get("neural"),
            "neural_rank": neural_rank,
        },
        "neural_matchups": neural_matchups,
        "behavior_profiles": behavior_profiles,
        "runtime": runtime_summary,
        "quality_flags": {
            "fallback_contaminated": runtime_summary.get("fallback_events", 0) > 0,
            "high_draw_environment": round(_ratio(draw_games, total_games), 4) >= 0.75,
            "high_turn_limit_environment": round(_ratio(turn_limit_games, total_games), 4) >= 0.40,
        },
    }


def build_baseline_comparison(
    current_metrics: Dict[str, Any], baseline_metrics: Dict[str, Any]
) -> Dict[str, Any]:
    current_neural_elo = current_metrics.get("elo", {}).get("neural_elo")
    baseline_neural_elo = baseline_metrics.get("elo", {}).get("neural_elo")

    current_draw_rate = current_metrics.get("summary", {}).get("draw_rate", 0.0)
    baseline_draw_rate = baseline_metrics.get("summary", {}).get("draw_rate", 0.0)

    current_turn_limit_rate = current_metrics.get("summary", {}).get("turn_limit_rate", 0.0)
    baseline_turn_limit_rate = baseline_metrics.get("summary", {}).get("turn_limit_rate", 0.0)

    current_behavior = current_metrics.get("behavior_profiles", {}).get("neural", {})
    baseline_behavior = baseline_metrics.get("behavior_profiles", {}).get("neural", {})

    return {
        "neural_elo_delta": None
        if current_neural_elo is None or baseline_neural_elo is None
        else round(current_neural_elo - baseline_neural_elo, 2),
        "draw_rate_delta": round(current_draw_rate - baseline_draw_rate, 4),
        "turn_limit_rate_delta": round(current_turn_limit_rate - baseline_turn_limit_rate, 4),
        "capture_rate_delta": round(
            current_behavior.get("capture_rate", 0.0) - baseline_behavior.get("capture_rate", 0.0),
            4,
        ),
        "avg_no_capture_streak_delta": round(
            current_behavior.get("avg_no_capture_streak", 0.0)
            - baseline_behavior.get("avg_no_capture_streak", 0.0),
            2,
        ),
        "baseline_runtime_status": baseline_metrics.get("runtime", {}).get("status", "unknown"),
        "current_runtime_status": current_metrics.get("runtime", {}).get("status", "unknown"),
    }


def build_scientific_summary(
    baby: Dict[str, Any], baseline: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    metrics = baby.get("tournament_analysis", {})
    summary = metrics.get("summary", {})
    runtime = metrics.get("runtime", {})
    elo = metrics.get("elo", {})
    comparison = baby.get("baseline_comparison", {})
    neural_behavior = metrics.get("behavior_profiles", {}).get("neural", {})

    draw_rate = summary.get("draw_rate", 0.0)
    turn_limit_rate = summary.get("turn_limit_rate", 0.0)
    fallback_events = runtime.get("fallback_events", 0)
    neural_elo = elo.get("neural_elo")
    neural_elo_delta = comparison.get("neural_elo_delta")

    validity = "valid"
    if runtime.get("status") == "fallback_contaminated":
        validity = "runtime_contaminated"
    elif summary.get("total_games", 0) == 0:
        validity = "missing_tournament_data"
    elif draw_rate >= 0.75 or turn_limit_rate >= 0.60:
        validity = "high_draw_env"

    signal_quality = "medium"
    if validity != "valid":
        signal_quality = "low"
    elif neural_elo_delta is not None and abs(neural_elo_delta) >= 50:
        signal_quality = "high"

    return {
        "validity": validity,
        "signal_quality": signal_quality,
        "neural_elo": neural_elo,
        "draw_rate": draw_rate,
        "turn_limit_rate": turn_limit_rate,
        "fallback_events": fallback_events,
        "capture_rate": neural_behavior.get("capture_rate"),
        "avg_no_capture_streak": neural_behavior.get("avg_no_capture_streak"),
        "baseline_delta": {
            "neural_elo_delta": neural_elo_delta,
            "draw_rate_delta": comparison.get("draw_rate_delta"),
            "turn_limit_rate_delta": comparison.get("turn_limit_rate_delta"),
            "capture_rate_delta": comparison.get("capture_rate_delta"),
        },
        "baseline_reference": baseline.get("experiment_id") if baseline else None,
    }


def build_recommendations(
    scientific_summary: Dict[str, Any], baby: Dict[str, Any]
) -> List[str]:
    recommendations: List[str] = []
    validity = scientific_summary.get("validity")

    if validity == "runtime_contaminated":
        recommendations.append(
            "Re-run the tournament after fixing neural fallback contamination before comparing babies."
        )
    if validity == "missing_tournament_data":
        recommendations.append(
            "Run the tournament step for this baby before treating the experiment as benchmarkable."
        )
    if scientific_summary.get("draw_rate", 0.0) >= 0.75:
        recommendations.append(
            "Increase tournament scrutiny: the environment is too draw-heavy for strong conclusions."
        )
    if scientific_summary.get("turn_limit_rate", 0.0) >= 0.60:
        recommendations.append(
            "Investigate endgame conversion and turn-limit behavior before trusting Elo deltas."
        )

    neural_elo_delta = scientific_summary.get("baseline_delta", {}).get("neural_elo_delta")
    if neural_elo_delta is not None:
        if neural_elo_delta >= 25:
            recommendations.append(
                "Promote this baby as a candidate baseline and run a larger confirmation tournament."
            )
        elif neural_elo_delta <= -25:
            recommendations.append(
                "Do not promote this baby; inspect training data quality and behavior regressions first."
            )

    if scientific_summary.get("capture_rate") is not None and scientific_summary["capture_rate"] < 0.12:
        recommendations.append(
            "Consider a follow-up dataset or curriculum patch that rewards decisive conversion and tactical pressure."
        )

    if not recommendations:
        recommendations.append(
            "Results look stable enough for a larger confirmation experiment with more games per matchup."
        )

    return recommendations


def load_report(report_path: Path) -> Optional[Dict[str, Any]]:
    if not report_path.exists():
        return None
    with report_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def render_report_text(
    experiment_id: str,
    config: Dict[str, Any],
    babies: List[Dict[str, Any]],
    baseline: Optional[Dict[str, Any]],
) -> str:
    lines = []
    lines.append(f"TACTICAL CHESS PURE LAB REPORT :: {experiment_id}")
    lines.append("")
    lines.append("CONFIG")
    lines.append(f"- dataset: {config.get('dataset_path')}")
    lines.append(f"- tournament_games_per_matchup: {config.get('tournament_games_per_matchup')}")
    lines.append(f"- baseline_experiment_id: {config.get('baseline_experiment_id')}")
    selfplay_cfg = config.get("selfplay_hooks", {})
    lines.append(
        f"- selfplay_hooks: enabled={selfplay_cfg.get('enabled', False)} mode={selfplay_cfg.get('mode', 'none')}"
    )
    lines.append("")

    valid_babies = [
        baby["baby_id"]
        for baby in babies
        if baby.get("scientific_summary", {}).get("validity") == "valid"
    ]
    best_candidate = valid_babies[0] if valid_babies else None
    lines.append("SCIENTIFIC SUMMARY")
    lines.append(f"- valid_babies: {', '.join(valid_babies) if valid_babies else 'none'}")
    lines.append(f"- best_candidate: {best_candidate if best_candidate else 'none'}")
    lines.append("")

    for baby in babies:
        baby_id = baby.get("baby_id", "unknown")
        metrics = baby.get("tournament_analysis", {})
        summary = metrics.get("summary", {})
        elo = metrics.get("elo", {})
        runtime = metrics.get("runtime", {})
        comparison = baby.get("baseline_comparison")
        scientific_summary = baby.get("scientific_summary", {})
        recommendations = baby.get("recommendations", [])

        lines.append(f"BABY :: {baby_id}")
        lines.append(f"- checkpoint: {baby.get('checkpoint_path')}")
        lines.append(f"- neural_elo: {elo.get('neural_elo')}")
        lines.append(f"- neural_rank: {elo.get('neural_rank')}")
        lines.append(f"- draw_rate: {summary.get('draw_rate')}")
        lines.append(f"- turn_limit_rate: {summary.get('turn_limit_rate')}")
        lines.append(f"- runtime_status: {runtime.get('status')}")
        lines.append(f"- fallback_events: {runtime.get('fallback_events')}")
        lines.append(f"- scientific_validity: {scientific_summary.get('validity')}")
        lines.append(f"- signal_quality: {scientific_summary.get('signal_quality')}")

        neural_behavior = metrics.get("behavior_profiles", {}).get("neural")
        if neural_behavior:
            lines.append(f"- neural_capture_rate: {neural_behavior.get('capture_rate')}")
            lines.append(
                f"- neural_avg_no_capture_streak: {neural_behavior.get('avg_no_capture_streak')}"
            )

        if comparison:
            lines.append("- baseline_comparison:")
            lines.append(f"  neural_elo_delta: {comparison.get('neural_elo_delta')}")
            lines.append(f"  draw_rate_delta: {comparison.get('draw_rate_delta')}")
            lines.append(f"  turn_limit_rate_delta: {comparison.get('turn_limit_rate_delta')}")
            lines.append(f"  capture_rate_delta: {comparison.get('capture_rate_delta')}")

        if recommendations:
            lines.append("- recommendations:")
            for rec in recommendations:
                lines.append(f"  - {rec}")

        lines.append("")

    if baseline:
        lines.append("BASELINE")
        lines.append(f"- experiment_id: {baseline.get('experiment_id')}")
        lines.append(f"- source: {baseline.get('source')}")
        lines.append("")

    return "\n".join(lines).strip() + "\n"
