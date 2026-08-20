use crate::agents::neural_agent::NeuralAgent;
use crate::chess::move_explanation::explain_move;
use crate::chess::search::search_root;
use crate::chess::uci::action_to_uci;
use crate::prototype::minimal_ruleset::{
    load_engine_from_ruleset, minimal_runtime_ruleset, minimal_runtime_ruleset_chess960,
};
use crate::simulation::neural_tournament_runner::NeuralTournamentRunner;
use crate::simulation::selfplay::SelfPlayManager;
use crate::simulation::simulation_runner::{MatchSummary, MatchTermination, SimulationRunner};
use crate::tool::balance_tool::{analyze_matches, render_report};
use crate::tool::conversion_suite::{run_conversion_case_cli, run_conversion_suite_local};
use crate::tool::experiment_paths::tournament_dir;
use crate::tool::puzzle_eval::run_puzzle_eval;
use crate::tool::puzzle_rng::run_puzzle_rng;
use serde_json::{json, Value};
use std::fs;
use std::path::Path;

pub fn run_cli(args: Vec<String>) {
    if args.len() < 2 {
        print_help();
        return;
    }

    match args[1].as_str() {
        "simulate_chess960" => {
            let id = args.get(2).and_then(|v| v.parse::<u16>().ok()).unwrap_or(0);
            let n = parse_count(&args, 3, 10);
            let ruleset = match minimal_runtime_ruleset_chess960(id, false) {
                Some(r) => r,
                None => {
                    println!("Invalid Chess960 position id {id} (must be 0-959)");
                    return;
                }
            };
            println!("Running {n} Chess960 matches (position {id})...");
            let mut runner = SimulationRunner::new();
            runner.ruleset = ruleset;
            let results = runner.run_n_matches(n);
            let report = analyze_matches(&results);
            println!("\n=== CHESS960 MATCH METRICS (position {id}) ===");
            println!("{}", render_report(&report));
        }

        "simulate" => {
            let n = parse_count(&args, 2, 10);

            println!("Running {} matches...", n);

            let mut runner = SimulationRunner::new();
            let results = runner.run_n_matches(n);

            let report = analyze_matches(&results);

            println!("\n=== MATCH METRICS ===");
            println!("{}", render_report(&report));
        }

        "analyze" => {
            let n = parse_count(&args, 2, 100);

            println!("Running {} matches for analysis...", n);

            let mut runner = SimulationRunner::new();
            let results = runner.run_n_matches(n);

            let report = analyze_matches(&results);

            println!("\n=== ANALYSIS ===");
            println!("{}", render_report(&report));
        }

        "selfplay" => {
            let n = parse_count(&args, 2, 100);

            println!("Running {} self-play matches...", n);

            std::env::set_var("TCS_AGENT_MODE", "heuristic");
            std::env::remove_var("TCS_MINIMAX_DEPTH");

            let mut manager = SelfPlayManager::new(n);
            let results = manager.run();

            let report = analyze_matches(&results);

            println!("\n=== SELFPLAY ANALYSIS ===");
            println!("{}", render_report(&report));
            println!("Saved to: lab/selfplay/results.csv");
            println!("Saved to: lab/selfplay/moves.csv");
        }

        "selfplay_teacher" => {
            let n = parse_count(&args, 2, 100);

            println!("Running {} hybrid teacher self-play matches...", n);
            println!("Teacher mode = hybrid");

            std::env::set_var("TCS_GAME_ANALYSIS_TRACE", "1");
            std::env::set_var("TCS_EXPERIMENT_DIR", "lab");
            std::env::set_var("TCS_MINIMAX_DEPTH", "1");

            let mut runner = SimulationRunner::new();
            let mut results = Vec::with_capacity(n as usize);
            for _ in 0..n {
                results.push(runner.run_match_with_agents("minimax", "minimax"));
            }

            let report = analyze_matches(&results);

            println!("\n=== TEACHER SELFPLAY ANALYSIS ===");
            println!("{}", render_report(&report));
            println!("Saved to: lab/tournament.log");
        }

        "neural_pick" => {
            let agent = NeuralAgent::new();
            match agent.health_check() {
                Ok(details) => {
                    println!("Neural agent bridge ready");
                    println!("{}", details);
                }
                Err(err) => {
                    println!("Neural agent bridge failed");
                    println!("{}", err);
                }
            }
        }

        "neural_tournament" => {
            let n = parse_count(&args, 2, 12);
            let agent = NeuralAgent::new();

            println!("Running neural tournament with {} games...", n);

            match agent.health_check() {
                Ok(details) => {
                    println!("Neural bridge check OK");
                    println!("{}", details);
                }
                Err(err) => {
                    println!("Neural bridge check failed");
                    println!("{}", err);
                    println!("Tournament cancelled to avoid invalid neural results.");
                    return;
                }
            }

            let (results, _games, elo_rows, _benchmark_status) =
                NeuralTournamentRunner::run_with_details(n);
            NeuralTournamentRunner::print_report(&results);
            NeuralTournamentRunner::print_elo(&elo_rows);
            let tournament_output_dir = tournament_dir();

            println!();
            println!("Saved to: {}/games.csv", tournament_output_dir.display());
            println!("Saved to: {}/matches.csv", tournament_output_dir.display());
            println!("Saved to: {}/elo.csv", tournament_output_dir.display());
        }

        "neural_smoke" => {
            let agent = NeuralAgent::new();

            println!("Running neural smoke benchmark (2 games max)...");

            match agent.health_check() {
                Ok(details) => {
                    println!("Neural bridge check OK");
                    println!("{}", details);
                }
                Err(err) => {
                    println!("Neural bridge check failed");
                    println!("{}", err);
                    println!("Smoke benchmark cancelled to avoid invalid neural results.");
                    return;
                }
            }

            let (results, _games, elo_rows, _benchmark_status) =
                NeuralTournamentRunner::run_smoke_with_details();
            NeuralTournamentRunner::print_report(&results);
            NeuralTournamentRunner::print_elo(&elo_rows);
            let tournament_output_dir = tournament_dir();

            println!();
            println!("Saved to: {}/games.csv", tournament_output_dir.display());
            println!("Saved to: {}/matches.csv", tournament_output_dir.display());
            println!("Saved to: {}/elo.csv", tournament_output_dir.display());
        }

        "benchmark" => {
            run_benchmark_command(&args);
        }

        "engine_validation" => {
            let n = parse_count(&args, 2, 8);
            run_engine_validation(n);
        }

        "search_profile" => {
            let depth = parse_count(&args, 2, 4);
            run_search_profile(depth);
        }
        "observe_fen" => {
            run_observe_fen(&args);
        }

        "play_fen" => {
            run_play_fen(&args);
        }

        "conversion_case" => {
            run_conversion_case_cli(&args);
        }

        "conversion_suite" => {
            let limit = args.get(2).and_then(|v| v.parse::<usize>().ok());
            run_conversion_suite(limit);
        }
        "puzzle_rng" => {
            run_puzzle_rng(&args);
        }
        "puzzle_eval" => {
            run_puzzle_eval(&args);
        }

        "help" => {
            print_help();
        }

        _ => {
            println!("Unknown command\n");
            print_help();
        }
    }
}

fn parse_count(args: &[String], index: usize, default: u32) -> u32 {
    if args.len() > index {
        args[index].parse::<u32>().unwrap_or(default)
    } else {
        default
    }
}

fn print_help() {
    println!("TACTICAL CHESS STUDIO");
    println!();
    println!("Commands:");
    println!("  simulate_chess960 ID N -> run N matches on Chess960 position ID (0-959)");
    println!("  simulate N          -> run matches");
    println!("  analyze N           -> run matches + metrics");
    println!("  selfplay N          -> heuristic self-play");
    println!("  selfplay_teacher N  -> hybrid teacher self-play");
    println!("  neural_pick         -> neural agent bridge check");
    println!("  neural_tournament N -> run neural tournament + Elo + CSV");
    println!("  neural_smoke        -> run 2-game neural vs heuristic smoke benchmark");
    println!("  benchmark [--smoke] [--games N] -> unified benchmark entrypoint");
    println!("  engine_validation N -> controlled engine validation matchups");
    println!("  search_profile D    -> single-position search runtime profile");
    println!("  observe_fen \"<FEN>\" [--depth N] -> observe one FEN and emit JSON status");
    println!("  conversion_case     -> run one conversion case (prints JSON)");
    println!("  conversion_suite N  -> run conversion suite (optional limit N)");
    println!(
        "  puzzle_rng --theme mate1|fork --count N --seed N -> generate tactical mate/fork puzzles"
    );
    println!(
        "  play_fen \"<FEN>\" \"<moves>\" -> play best move from FEN after applying UCI moves; outputs JSON"
    );
    println!(
        "  puzzle_eval --input <path> --agent search|hybrid|heuristic [--limit N] [--debug-misses] [--show-cases N]"
    );
    println!(
        "  TCS_GAME_ANALYSIS_TRACE=1 -> emit GAME_DECISION_TRACE and GAME_ANALYSIS_SUMMARY rows"
    );
    println!("  TCS_GAME_ANALYSIS_FULL=1 -> include all root candidates in traces (default top 5)");
    println!("  TCS_TRACE_SAMPLE_EVERY_N=<N> -> only emit full root traces for plies where ply % N == 0 (default 1)");
    println!("  TCS_ROOT_DECISION_AUDIT_TOP_N=<N> -> limit logged ROOT_DECISION_SIGNAL/AUDIT/ROOT_CANDIDATE_SCORE candidates (default 5)");
    println!("  TCS_REPLY_SCAN_LIMIT=<N> -> cap REPLY_SCAN logs per ply (default 5)");
    println!("  TCS_FAST_TRACE=1 -> keep only ROOT_DECISION_SELECTED and compact GAME_DECISION_TRACE summary");
    println!("  help                -> show commands");
}

fn run_benchmark_command(args: &[String]) {
    let smoke_mode = args.iter().any(|arg| arg == "--smoke");
    let games = args
        .windows(2)
        .find(|window| window[0] == "--games")
        .and_then(|window| window[1].parse::<u32>().ok())
        .unwrap_or(if smoke_mode { 2 } else { 12 });
    let agent = NeuralAgent::new();

    println!(
        "Running unified benchmark entrypoint (mode={}, games={})...",
        if smoke_mode { "smoke" } else { "full" },
        if smoke_mode { 2 } else { games }
    );

    match agent.health_check() {
        Ok(details) => {
            println!("Neural bridge check OK");
            println!("{}", details);
        }
        Err(err) => {
            println!("Neural bridge check failed");
            println!("{}", err);
            println!("Benchmark cancelled to avoid invalid neural results.");
            return;
        }
    }
    drop(agent);

    let (results, _games, elo_rows, _benchmark_status) =
        NeuralTournamentRunner::run_benchmark_with_details(games, smoke_mode);
    NeuralTournamentRunner::print_report(&results);
    NeuralTournamentRunner::print_elo(&elo_rows);
    let tournament_output_dir = tournament_dir();

    println!();
    println!("Saved to: {}/games.csv", tournament_output_dir.display());
    println!("Saved to: {}/matches.csv", tournament_output_dir.display());
    println!("Saved to: {}/elo.csv", tournament_output_dir.display());
}

fn run_search_profile(depth: u32) {
    std::env::set_var("TCS_MINIMAX_DEPTH", depth.to_string());
    std::env::set_var("TCS_SEARCH_RUNTIME_DIAG", "1");

    let engine = load_engine_from_ruleset(&minimal_runtime_ruleset());
    let player = engine.turn_manager.current_player;
    let result = match search_root(&engine, player) {
        Some(result) => result,
        None => {
            println!("SEARCH_PROFILE_STATUS=failed|reason=no_legal_result");
            std::env::remove_var("TCS_MINIMAX_DEPTH");
            std::env::remove_var("TCS_SEARCH_RUNTIME_DIAG");
            return;
        }
    };

    let runtime = &result.diagnostics.runtime;
    let move_total = runtime.move_simulation_nanos + runtime.move_undo_nanos;
    let repetition_total = runtime.move_repetition_nanos + runtime.move_undo_repetition_nanos;
    let null_total = runtime.null_move_simulation_nanos + runtime.null_move_undo_nanos;

    println!(
        "SEARCH_PROFILE|depth={}|nodes={}|q_nodes={}|move_sims={}|move_undos={}|move_total_ns={}|simulate_ns={}|undo_ns={}|repetition_ns={}|null_total_ns={}",
        result.completed_depth,
        result.diagnostics.counters.nodes,
        result.diagnostics.counters.quiescence_nodes,
        runtime.move_simulations,
        runtime.move_undos,
        move_total,
        runtime.move_simulation_nanos,
        runtime.move_undo_nanos,
        repetition_total,
        null_total,
    );

    let report_dir = std::path::Path::new("lab").join("reports");
    let report_path = report_dir.join("search_profile_latest.json");
    if fs::create_dir_all(&report_dir).is_ok() {
        let payload = json!({
            "depth": result.completed_depth,
            "nodes": result.diagnostics.counters.nodes,
            "q_nodes": result.diagnostics.counters.quiescence_nodes,
            "move_simulations": runtime.move_simulations,
            "move_undos": runtime.move_undos,
            "move_total_ns": move_total,
            "simulate_ns": runtime.move_simulation_nanos,
            "undo_ns": runtime.move_undo_nanos,
            "snapshot_ns": runtime.move_snapshot_nanos,
            "apply_ns": runtime.move_apply_nanos,
            "repetition_ns": repetition_total,
            "restore_ns": runtime.move_restore_nanos,
            "capture_snapshots": runtime.capture_snapshots,
            "rook_snapshots": runtime.rook_snapshots,
            "null_move_simulations": runtime.null_move_simulations,
            "null_move_undos": runtime.null_move_undos,
            "null_total_ns": null_total,
        });
        if let Ok(rendered) = serde_json::to_string_pretty(&payload) {
            if fs::write(&report_path, rendered).is_ok() {
                println!("SEARCH_PROFILE_REPORT={}", report_path.display());
            }
        }
    }

    std::env::remove_var("TCS_MINIMAX_DEPTH");
    std::env::remove_var("TCS_SEARCH_RUNTIME_DIAG");
}

fn run_observe_fen(args: &[String]) {
    let fen = match args.get(2) {
        Some(value) if !value.trim().is_empty() => value.trim().to_string(),
        _ => {
            println!(
                "{}",
                json!({
                    "fen": "",
                    "side_to_move": serde_json::Value::Null,
                    "legal_moves_count": 0,
                    "selected_move": serde_json::Value::Null,
                    "status": "failed",
                    "error": "missing FEN argument",
                })
            );
            return;
        }
    };

    let depth = args
        .windows(2)
        .find(|window| window[0] == "--depth")
        .and_then(|window| window[1].parse::<u32>().ok())
        .unwrap_or(1);

    let emit = |payload: serde_json::Value| {
        println!("{}", payload);
    };

    let engine = match crate::chess::fen::engine_from_fen(&fen) {
        Ok(engine) => engine,
        Err(err) => {
            emit(json!({
                "fen": fen,
                "side_to_move": serde_json::Value::Null,
                "legal_moves_count": 0,
                "selected_move": serde_json::Value::Null,
                "status": "failed",
                "error": err,
            }));
            return;
        }
    };

    let player = engine.turn_manager.current_player;
    let legal_moves = engine.legal_actions(player);
    let legal_moves_count = legal_moves.len();
    let side_to_move = if player == 1 { "w" } else { "b" };

    if legal_moves_count == 0 {
        emit(json!({
            "fen": fen,
            "side_to_move": side_to_move,
            "legal_moves_count": legal_moves_count,
            "selected_move": serde_json::Value::Null,
            "completed_depth": serde_json::Value::Null,
            "search_score": serde_json::Value::Null,
            "selection_source": "no_legal_moves",
            "candidates": [],
            "candidate_count": 0,
            "best_score": serde_json::Value::Null,
            "second_best_score": serde_json::Value::Null,
            "score_gap": serde_json::Value::Null,
            "candidate_diagnostics_note": "candidate diagnostics unavailable: no legal moves for side to move",
            "status": "failed",
            "error": "no legal moves for side to move",
        }));
        return;
    }

    let previous_depth = std::env::var("TCS_MINIMAX_DEPTH").ok();
    std::env::set_var("TCS_MINIMAX_DEPTH", depth.to_string());
    let search_result = search_root(&engine, player);
    match previous_depth {
        Some(value) => std::env::set_var("TCS_MINIMAX_DEPTH", value),
        None => std::env::remove_var("TCS_MINIMAX_DEPTH"),
    }

    if let Some(result) = search_result {
        let selected_move = action_to_uci(&result.best_action, &engine.units);
        let alternatives = &result.diagnostics.principal_alternatives;
        let candidates = alternatives
            .iter()
            .map(|alt| {
                json!({
                    "move": action_to_uci(&alt.action, &engine.units)
                        .unwrap_or_else(|| format!("{:?}", alt.action)),
                    "search_score": alt.search_score,
                    "heuristic_score": alt.heuristic_score,
                    "policy_score": alt.policy_score,
                    "decision_score": alt.decision_score,
                })
            })
            .collect::<Vec<Value>>();
        let candidate_count = candidates.len();
        let best_score = Some(result.diagnostics.decision.chosen_search_score);
        let score_gap = result.diagnostics.decision.second_best_search_gap;
        let second_best_score = best_score.zip(score_gap).map(|(best, gap)| best - gap);
        let candidate_diagnostics_note = if candidate_count == 0 {
            Some("candidate diagnostics unavailable: search diagnostics did not include principal alternatives")
        } else {
            None
        };
        emit(json!({
            "fen": fen,
            "side_to_move": side_to_move,
            "legal_moves_count": legal_moves_count,
            "selected_move": selected_move,
            "completed_depth": result.completed_depth,
            "search_score": result.best_score,
            "selection_source": "search_root",
            "candidates": candidates,
            "candidate_count": candidate_count,
            "best_score": best_score,
            "second_best_score": second_best_score,
            "score_gap": score_gap,
            "candidate_diagnostics_note": candidate_diagnostics_note,
            "status": "ok",
            "error": serde_json::Value::Null,
        }));
        return;
    }

    let selected_move = legal_moves
        .first()
        .and_then(|action| action_to_uci(action, &engine.units));
    emit(json!({
        "fen": fen,
        "side_to_move": side_to_move,
        "legal_moves_count": legal_moves_count,
        "selected_move": selected_move,
        "completed_depth": serde_json::Value::Null,
        "search_score": serde_json::Value::Null,
        "selection_source": "first_legal_fallback",
        "candidates": [],
        "candidate_count": 0,
        "best_score": serde_json::Value::Null,
        "second_best_score": serde_json::Value::Null,
        "score_gap": serde_json::Value::Null,
        "candidate_diagnostics_note": "candidate diagnostics unavailable: search_root returned no result",
        "status": "ok",
        "error": serde_json::Value::Null,
    }));
}

fn run_conversion_suite(limit: Option<usize>) {
    let engine_agent =
        std::env::var("TCS_CONVERSION_SUITE_ENGINE").unwrap_or_else(|_| "hybrid".to_string());
    let opponent_agent =
        std::env::var("TCS_CONVERSION_SUITE_OPPONENT").unwrap_or_else(|_| "heuristic".to_string());

    let suite_path = Path::new("lab")
        .join("suites")
        .join("conversion_suite_v1.jsonl");
    let report_dir = Path::new("lab").join("reports");
    let report_json_path = report_dir.join("conversion_suite_v1_latest.json");
    let report_md_path = report_dir.join("conversion_suite_v1_latest.md");

    match run_conversion_suite_local(
        &suite_path,
        &engine_agent,
        &opponent_agent,
        limit,
        &report_json_path,
        &report_md_path,
    ) {
        Ok(()) => {
            println!("CONVERSION_SUITE_STATUS=ok");
            println!(
                "CONVERSION_SUITE_REPORT_JSON={}",
                report_json_path.display()
            );
            println!("CONVERSION_SUITE_REPORT_MD={}", report_md_path.display());
        }
        Err(err) => {
            println!(
                "CONVERSION_SUITE_STATUS=failed|reason={}",
                err.replace('\n', " ")
            );
        }
    }
}

#[derive(Default)]
struct ValidationAggregate {
    games: u32,
    engine_wins: u32,
    engine_losses: u32,
    draws: u32,
    white_wins: u32,
    black_wins: u32,
    turns_sum: u64,
    forced_draws: u32,
    turn_limits: u32,
    true_draws: u32,
    max_repetition_sum: u64,
    no_progress_games: u32,
    clear_edges: u32,
    clear_edge_conversions: u32,
    clear_edge_losses: u32,
}

fn run_engine_validation(games_per_color: u32) {
    let max_steps = std::env::var("TCS_VALIDATION_MAX_STEPS")
        .ok()
        .and_then(|value| value.parse::<u32>().ok())
        .unwrap_or(140);
    let matchups = [
        ("minimax", "random"),
        ("hybrid", "random"),
        ("minimax", "heuristic"),
    ];

    println!(
        "ENGINE_VALIDATION_START|games_per_color={}|depth={}|max_steps={}",
        games_per_color,
        std::env::var("TCS_MINIMAX_DEPTH").unwrap_or_else(|_| "adaptive".to_string()),
        max_steps
    );

    for (engine_agent, opponent_agent) in matchups {
        let mut aggregate = ValidationAggregate::default();

        run_validation_block(
            games_per_color,
            engine_agent,
            opponent_agent,
            true,
            max_steps,
            &mut aggregate,
        );
        run_validation_block(
            games_per_color,
            engine_agent,
            opponent_agent,
            false,
            max_steps,
            &mut aggregate,
        );

        let avg_turns = if aggregate.games > 0 {
            aggregate.turns_sum as f64 / aggregate.games as f64
        } else {
            0.0
        };
        let draw_rate = if aggregate.games > 0 {
            aggregate.draws as f64 / aggregate.games as f64
        } else {
            0.0
        };
        let first_player_bias = if aggregate.games > 0 {
            (aggregate.white_wins as f64 - aggregate.black_wins as f64) / aggregate.games as f64
        } else {
            0.0
        };
        let avg_max_repetition = if aggregate.games > 0 {
            aggregate.max_repetition_sum as f64 / aggregate.games as f64
        } else {
            0.0
        };

        println!(
            "ENGINE_VALIDATION_SUMMARY|engine={}|opponent={}|games={}|engine_wins={}|engine_losses={}|draws={}|draw_rate={:.4}|avg_turns={:.2}|white_wins={}|black_wins={}|first_player_bias={:.4}|forced_draws={}|turn_limits={}|true_draws={}|avg_max_repetition={:.2}|no_progress_games={}|clear_edges={}|clear_edge_conversions={}|clear_edge_losses={}",
            engine_agent,
            opponent_agent,
            aggregate.games,
            aggregate.engine_wins,
            aggregate.engine_losses,
            aggregate.draws,
            draw_rate,
            avg_turns,
            aggregate.white_wins,
            aggregate.black_wins,
            first_player_bias,
            aggregate.forced_draws,
            aggregate.turn_limits,
            aggregate.true_draws,
            avg_max_repetition,
            aggregate.no_progress_games,
            aggregate.clear_edges,
            aggregate.clear_edge_conversions,
            aggregate.clear_edge_losses,
        );
    }
}

fn run_validation_block(
    games: u32,
    engine_agent: &str,
    opponent_agent: &str,
    engine_as_white: bool,
    max_steps: u32,
    aggregate: &mut ValidationAggregate,
) {
    let mut runner = SimulationRunner::new();
    runner.max_steps = max_steps;
    runner.verbose = false;

    let (white, black) = if engine_as_white {
        (engine_agent, opponent_agent)
    } else {
        (opponent_agent, engine_agent)
    };

    for game_index in 0..games {
        let summary = runner.run_match_with_agents(white, black);
        record_validation_result(&summary, engine_as_white, aggregate);

        println!(
            "ENGINE_VALIDATION_GAME|engine={}|opponent={}|engine_color={}|game={}|winner={:?}|turns={}|termination={:?}|max_repetition={}|clear_edge={}|converted={}|lost_edge={}",
            engine_agent,
            opponent_agent,
            if engine_as_white { "white" } else { "black" },
            game_index + 1,
            summary.winner,
            summary.turns,
            summary.termination,
            summary.max_repetition_count,
            summary.had_clear_winning_material_edge,
            summary.clear_edge_converted_win,
            summary.clear_edge_lost_before_end,
        );
    }
}

fn run_play_fen(args: &[String]) {
    let fen = match args.get(2) {
        Some(v) if !v.trim().is_empty() => v.trim().to_string(),
        _ => {
            println!("{}", json!({"error": "missing FEN argument"}));
            return;
        }
    };

    let moves_str = args.get(3).map(|s| s.trim().to_string()).unwrap_or_default();

    let mut engine = match crate::chess::fen::engine_from_fen(&fen) {
        Ok(e) => e,
        Err(err) => {
            println!("{}", json!({"error": err}));
            return;
        }
    };

    if !moves_str.is_empty() {
        for uci in moves_str.split_whitespace() {
            let player = engine.turn_manager.current_player;
            let legal = engine.legal_actions(player);
            match find_uci_action(uci, &legal, &engine) {
                Some(action) => {
                    engine.execute(crate::engine::action::command::Command {
                        player_id: player,
                        action,
                    });
                }
                None => {
                    println!("{}", json!({"error": format!("illegal move: {}", uci)}));
                    return;
                }
            }
        }
    }

    let player = engine.turn_manager.current_player;

    let prev_time = std::env::var("TCS_MOVE_TIME_MS").ok();
    if prev_time.is_none() {
        std::env::set_var("TCS_MOVE_TIME_MS", "2000");
    }

    let result = search_root(&engine, player);

    match prev_time {
        Some(ref v) => std::env::set_var("TCS_MOVE_TIME_MS", v),
        None => std::env::remove_var("TCS_MOVE_TIME_MS"),
    }

    match result {
        Some(r) => {
            let move_str = action_to_uci(&r.best_action, &engine.units)
                .unwrap_or_else(|| "?".to_string());
            let explanation = explain_move(&r.diagnostics.decision.chosen_transition_analysis);
            println!(
                "{}",
                json!({"move": move_str, "score": r.best_score, "depth": r.completed_depth, "explanation": explanation})
            );
        }
        None => {
            println!("{}", json!({"error": "no legal moves"}));
        }
    }
}

fn find_uci_action(
    uci: &str,
    legal: &[crate::engine::action::action::Action],
    engine: &crate::engine::engine::Engine,
) -> Option<crate::engine::action::action::Action> {
    use crate::chess::piece_kind::ChessPieceKind;
    use crate::engine::action::action::Action;

    let bytes = uci.as_bytes();
    if bytes.len() < 4 {
        return None;
    }
    let from_x = bytes[0].wrapping_sub(b'a') as u32;
    let from_y = bytes[1].wrapping_sub(b'1') as u32;
    let to_x = bytes[2].wrapping_sub(b'a') as u32;
    let to_y = bytes[3].wrapping_sub(b'1') as u32;
    let promotion = bytes.get(4).and_then(|&c| match c {
        b'q' => Some(ChessPieceKind::Queen),
        b'r' => Some(ChessPieceKind::Rook),
        b'b' => Some(ChessPieceKind::Bishop),
        b'n' => Some(ChessPieceKind::Knight),
        _ => None,
    });

    legal
        .iter()
        .find(|action| {
            if let Action::Move {
                unit_id,
                target,
                promotion: promo,
            } = action
            {
                if let Some(unit) = engine.units.get(unit_id) {
                    return unit.position.x == from_x
                        && unit.position.y == from_y
                        && target.x == to_x
                        && target.y == to_y
                        && *promo == promotion;
                }
            }
            false
        })
        .copied()
}

fn record_validation_result(
    summary: &MatchSummary,
    engine_as_white: bool,
    aggregate: &mut ValidationAggregate,
) {
    aggregate.games += 1;
    aggregate.turns_sum += summary.turns as u64;
    aggregate.max_repetition_sum += summary.max_repetition_count as u64;

    match summary.winner {
        Some(1) => aggregate.white_wins += 1,
        Some(2) => aggregate.black_wins += 1,
        Some(_) | None => {}
    }

    let engine_winner = if engine_as_white { Some(1) } else { Some(2) };
    let opponent_winner = if engine_as_white { Some(2) } else { Some(1) };

    if summary.winner == engine_winner {
        aggregate.engine_wins += 1;
    } else if summary.winner == opponent_winner {
        aggregate.engine_losses += 1;
    } else {
        aggregate.draws += 1;
    }

    match summary.termination {
        MatchTermination::ForcedDrawStagnation => aggregate.forced_draws += 1,
        MatchTermination::TurnLimit => aggregate.turn_limits += 1,
        MatchTermination::Draw => aggregate.true_draws += 1,
        MatchTermination::Winner => {}
    }

    if summary.no_progress_pattern {
        aggregate.no_progress_games += 1;
    }
    if summary.had_clear_winning_material_edge {
        aggregate.clear_edges += 1;
    }
    if summary.clear_edge_converted_win {
        aggregate.clear_edge_conversions += 1;
    }
    if summary.clear_edge_lost_before_end {
        aggregate.clear_edge_losses += 1;
    }
}
