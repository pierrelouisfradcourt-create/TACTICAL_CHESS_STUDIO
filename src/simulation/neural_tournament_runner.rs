use std::panic::{self, AssertUnwindSafe};

use crate::tournament::elo::{EloConfig, EloTable};

use crate::simulation::simulation_runner::{MatchTermination, SimulationRunner};
use crate::tool::balance_tool::{analyze_matches, render_report};
use crate::tool::experiment_paths::experiment_dir;
use crate::tournament::export::{
    export_benchmark_status_csv, export_elo_csv, export_games_csv, export_games_detailed_csv,
    export_matches_csv,
};

#[derive(Clone, Debug)]
pub struct GameRecord {
    pub game_id: u32,
    pub agent_a: String,
    pub agent_b: String,
    pub match_block: String,
    pub white: String,
    pub black: String,
    pub winner: Option<u32>,
    pub turns: u32,
    pub termination: String,
    pub termination_type: String,
    pub termination_ply: u32,
    pub progress_counter: u32,
    pub last_capture_ply: u32,
    pub last_pawn_move_ply: u32,
    pub winner_reason: String,
    pub purity_violations: u64,
    pub game_source: String,
}

#[derive(Clone, Debug)]
pub struct TournamentResult {
    pub agent_a: String,
    pub agent_b: String,
    pub match_block: String,
    pub games: u32,
    pub wins_a: u32,
    pub wins_b: u32,
    pub draws: u32,
}

#[derive(Clone, Debug)]
pub struct TournamentBenchmarkStatus {
    pub benchmark_invalid: bool,
    pub contaminated_match_count: u32,
    pub purity_violation_total: u64,
    pub contamination_reason: String,
}

#[derive(Clone, Debug)]
pub enum OpponentType {
    Random,
    Heuristic,
    Hybrid,
    TeacherUci,
    Neural,
}

fn get_opponent_type(agent: &str) -> OpponentType {
    match agent {
        "random" => OpponentType::Random,
        "heuristic" => OpponentType::Heuristic,
        "hybrid" => OpponentType::Hybrid,
        "teacher_uci" => OpponentType::TeacherUci,
        "neural" => OpponentType::Neural,
        _ => OpponentType::Random,
    }
}

fn termination_to_string(termination: &MatchTermination) -> String {
    match termination {
        MatchTermination::Winner => "winner".to_string(),
        MatchTermination::Draw => "draw".to_string(),
        MatchTermination::ForcedDrawStagnation => "forced_draw_stagnation".to_string(),
        MatchTermination::TurnLimit => "turn_limit".to_string(),
    }
}

const MAIN_EVAL: &str = "MAIN_EVAL";
const CALIBRATION: &str = "CALIBRATION";
const SMOKE_BLOCK: &str = "SMOKE";
const SMOKE_MAX_GAMES: u32 = 2;
const SMOKE_MAX_TURNS: u32 = 40;
const SMOKE_PROGRESS_EVERY_TURNS: u32 = 10;

pub struct NeuralTournamentRunner;

impl NeuralTournamentRunner {
    fn run_match_resilient(
        runner: &mut SimulationRunner,
        white: &str,
        black: &str,
        match_block: &str,
    ) -> crate::simulation::simulation_runner::MatchSummary {
        match panic::catch_unwind(AssertUnwindSafe(|| {
            runner.run_match_with_agents(white, black)
        })) {
            Ok(summary) => summary,
            Err(payload) => {
                let panic_message = if let Some(message) = payload.downcast_ref::<&str>() {
                    (*message).to_string()
                } else if let Some(message) = payload.downcast_ref::<String>() {
                    message.clone()
                } else {
                    "unknown panic payload".to_string()
                };

                println!(
                    "BENCHMARK_MATCH_FAILED|block={}|white={}|black={}|reason={}",
                    match_block, white, black, panic_message
                );

                crate::simulation::simulation_runner::MatchSummary {
                    winner: None,
                    turns: 0,
                    actions: 0,
                    termination: MatchTermination::Draw,
                    termination_ply: 0,
                    progress_counter: 0,
                    last_capture_ply: 0,
                    last_pawn_move_ply: 0,
                    winner_reason: format!("match_failed:{}", panic_message),
                    purity_violations: 1,
                    draw_cause: Some("match_failed".to_string()),
                    stagnation_cause: Some("panic_caught".to_string()),
                    max_repetition_count: 0,
                    no_progress_pattern: false,
                    max_abs_material_diff: 0,
                    max_white_material_lead: 0,
                    max_black_material_lead: 0,
                    had_clear_winning_material_edge: false,
                    clear_edge_converted_win: false,
                    clear_edge_lost_before_end: false,
                }
            }
        }
    }

    pub fn run(games_per_matchup: u32) -> Vec<TournamentResult> {
        let (results, _games, _elo, _benchmark_status) =
            Self::run_benchmark_with_details(games_per_matchup, false);
        results
    }

    pub fn run_benchmark_with_details(
        games_per_matchup: u32,
        smoke_mode: bool,
    ) -> (
        Vec<TournamentResult>,
        Vec<GameRecord>,
        Vec<(String, f64)>,
        TournamentBenchmarkStatus,
    ) {
        if smoke_mode {
            Self::run_smoke_with_details()
        } else {
            Self::run_with_details(games_per_matchup)
        }
    }

    pub fn run_with_details(
        games_per_matchup: u32,
    ) -> (
        Vec<TournamentResult>,
        Vec<GameRecord>,
        Vec<(String, f64)>,
        TournamentBenchmarkStatus,
    ) {
        let mut scheduled_matchups: Vec<(&str, &str)> = Vec::new();
        scheduled_matchups.extend(std::iter::repeat((MAIN_EVAL, "heuristic")).take(4));
        scheduled_matchups.extend(std::iter::repeat((MAIN_EVAL, "hybrid")).take(4));
        scheduled_matchups.extend(std::iter::repeat((MAIN_EVAL, "teacher_uci")).take(2));
        scheduled_matchups.push((CALIBRATION, "random"));

        let mut results = Vec::new();
        let mut game_records = Vec::new();
        let mut all_match_summaries = Vec::new();

        let agent_names: Vec<String> = ["neural", "heuristic", "hybrid", "teacher_uci"]
            .iter()
            .map(|s| s.to_string())
            .collect();
        let mut elo = EloTable::with_config(
            &agent_names,
            EloConfig { k_factor: 24.0, initial_rating: 1200.0 },
        );

        let mut global_game_id: u32 = 1;
        let mut total_purity_violations: u64 = 0;
        let mut contaminated_match_count: u32 = 0;

        for (match_block, opponent) in scheduled_matchups {
            let agent_a = opponent.to_string();
            let agent_b = "neural".to_string();

            let mut wins_a = 0u32;
            let mut wins_b = 0u32;
            let mut draws = 0u32;
            let mut panic_count_block = 0u32;

            {
                let mut runner = SimulationRunner::new();
                runner.max_steps = 140;
                runner.verbose = false;

                for _ in 0..games_per_matchup {
                    let summary =
                        Self::run_match_resilient(&mut runner, &agent_a, &agent_b, match_block);
                    all_match_summaries.push(summary.clone());

                    if summary.purity_violations > 0 {
                        total_purity_violations += summary.purity_violations;
                        contaminated_match_count += 1;
                    }

                    let is_panic_recovered = summary.winner_reason.starts_with("match_failed:");
                    if is_panic_recovered {
                        panic_count_block += 1;
                    }

                    let opponent_type = get_opponent_type(&agent_a);

                    println!(
                        "[MATCH] block={} A={} B={} opponent={:?} result={:?} turns={}",
                        match_block, agent_a, agent_b, opponent_type, summary.winner, summary.turns
                    );

                    let termination = termination_to_string(&summary.termination);

                    match summary.winner {
                        Some(1) => wins_a += 1,
                        Some(2) => wins_b += 1,
                        None => draws += 1,
                        _ => draws += 1,
                    }

                    let game_source = if is_panic_recovered {
                        "panic_recovered".to_string()
                    } else {
                        "normal".to_string()
                    };

                    game_records.push(GameRecord {
                        game_id: global_game_id,
                        agent_a: agent_a.clone(),
                        agent_b: agent_b.clone(),
                        match_block: match_block.to_string(),
                        white: agent_a.clone(),
                        black: agent_b.clone(),
                        winner: summary.winner,
                        turns: summary.turns,
                        termination: termination.clone(),
                        termination_type: termination.clone(),
                        termination_ply: summary.termination_ply,
                        progress_counter: summary.progress_counter,
                        last_capture_ply: summary.last_capture_ply,
                        last_pawn_move_ply: summary.last_pawn_move_ply,
                        winner_reason: summary.winner_reason.clone(),
                        purity_violations: summary.purity_violations,
                        game_source,
                    });

                    if match_block == MAIN_EVAL {
                        let score_a = match summary.winner {
                            Some(1) => 1.0,
                            Some(2) => 0.0,
                            None => 0.5,
                            _ => 0.5,
                        };
                        elo.update_match(&agent_a, &agent_b, score_a);
                    }

                    global_game_id += 1;
                }
            }

            {
                let mut runner = SimulationRunner::new();
                runner.max_steps = 140;
                runner.verbose = false;

                for _ in 0..games_per_matchup {
                    let summary =
                        Self::run_match_resilient(&mut runner, &agent_b, &agent_a, match_block);
                    all_match_summaries.push(summary.clone());

                    if summary.purity_violations > 0 {
                        total_purity_violations += summary.purity_violations;
                        contaminated_match_count += 1;
                    }

                    let is_panic_recovered = summary.winner_reason.starts_with("match_failed:");
                    if is_panic_recovered {
                        panic_count_block += 1;
                    }

                    let opponent_type = get_opponent_type(&agent_a);

                    println!(
                        "[MATCH] block={} A={} B={} opponent={:?} result={:?} turns={}",
                        match_block, agent_a, agent_b, opponent_type, summary.winner, summary.turns
                    );

                    let termination = termination_to_string(&summary.termination);

                    match summary.winner {
                        Some(1) => wins_b += 1,
                        Some(2) => wins_a += 1,
                        None => draws += 1,
                        _ => draws += 1,
                    }

                    let game_source = if is_panic_recovered {
                        "panic_recovered".to_string()
                    } else {
                        "normal".to_string()
                    };

                    game_records.push(GameRecord {
                        game_id: global_game_id,
                        agent_a: agent_a.clone(),
                        agent_b: agent_b.clone(),
                        match_block: match_block.to_string(),
                        white: agent_b.clone(),
                        black: agent_a.clone(),
                        winner: summary.winner,
                        turns: summary.turns,
                        termination: termination.clone(),
                        termination_type: termination.clone(),
                        termination_ply: summary.termination_ply,
                        progress_counter: summary.progress_counter,
                        last_capture_ply: summary.last_capture_ply,
                        last_pawn_move_ply: summary.last_pawn_move_ply,
                        winner_reason: summary.winner_reason.clone(),
                        purity_violations: summary.purity_violations,
                        game_source,
                    });

                    if match_block == MAIN_EVAL {
                        let score_a = match summary.winner {
                            Some(1) => 0.0,
                            Some(2) => 1.0,
                            None => 0.5,
                            _ => 0.5,
                        };
                        elo.update_match(&agent_a, &agent_b, score_a);
                    }

                    global_game_id += 1;
                }
            }

            if panic_count_block > 0 {
                println!(
                    "BENCHMARK_HARD_FAIL|block={}|matchup={}vs{}|panic_count={}",
                    match_block, agent_a, agent_b, panic_count_block
                );
            }

            results.push(TournamentResult {
                agent_a,
                agent_b,
                match_block: match_block.to_string(),
                games: games_per_matchup * 2,
                wins_a,
                wins_b,
                draws,
            });
        }

        let elo_rows = elo.leaderboard();

        let benchmark_invalid = contaminated_match_count > 0;
        let contamination_reason = if contaminated_match_count > 0 {
            format!(
                "{} matches contaminated with {} purity violations",
                contaminated_match_count, total_purity_violations
            )
        } else {
            "none".to_string()
        };

        let benchmark_status = TournamentBenchmarkStatus {
            benchmark_invalid,
            contaminated_match_count,
            purity_violation_total: total_purity_violations,
            contamination_reason,
        };

        let _ = export_games_csv(&game_records, &benchmark_status);
        let _ = export_games_detailed_csv(&game_records);
        let _ = export_matches_csv(&results);
        let _ = export_elo_csv(&elo_rows);
        let _ = export_benchmark_status_csv(&benchmark_status);

        let report = analyze_matches(&all_match_summaries);

        println!();
        println!("GLOBAL ANALYSIS");
        println!("total games: {}", all_match_summaries.len());
        println!("global draw rate: {:.2}", report.draw_rate);
        println!("main eval blocks: heuristic=4 hybrid=4 teacher_uci=2");
        println!("calibration blocks: random=1");

        if report.draw_rate >= 0.75 {
            println!("SYSTEM WARNING: environment too draw-heavy");
        }

        println!();
        println!("BENCHMARK CONTAMINATION STATUS");
        println!("benchmark_invalid: {}", benchmark_status.benchmark_invalid);
        println!(
            "contaminated_match_count: {}",
            benchmark_status.contaminated_match_count
        );
        println!(
            "purity_violation_total: {}",
            benchmark_status.purity_violation_total
        );
        println!(
            "contamination_reason: {}",
            benchmark_status.contamination_reason
        );

        Self::print_game_shape_diagnostics(&game_records);
        Self::print_draw_hotspots(&results);
        Self::print_suspicious_games(&game_records, &benchmark_status);

        println!();
        println!("Saved to:");
        println!("{}/tournaments/games.csv", experiment_dir().display());
        println!("{}/tournaments/matches.csv", experiment_dir().display());
        println!("{}/tournaments/elo.csv", experiment_dir().display());

        (results, game_records, elo_rows, benchmark_status)
    }

    pub fn run_smoke_with_details() -> (
        Vec<TournamentResult>,
        Vec<GameRecord>,
        Vec<(String, f64)>,
        TournamentBenchmarkStatus,
    ) {
        let mut results = vec![TournamentResult {
            agent_a: "heuristic".to_string(),
            agent_b: "neural".to_string(),
            match_block: SMOKE_BLOCK.to_string(),
            games: SMOKE_MAX_GAMES,
            wins_a: 0,
            wins_b: 0,
            draws: 0,
        }];
        let mut game_records = Vec::new();
        let smoke_agent_names: Vec<String> = ["heuristic", "neural"]
            .iter()
            .map(|s| s.to_string())
            .collect();
        let mut elo = EloTable::with_config(
            &smoke_agent_names,
            EloConfig { k_factor: 24.0, initial_rating: 1200.0 },
        );

        let mut global_game_id: u32 = 1;
        let mut total_purity_violations: u64 = 0;
        let mut contaminated_match_count: u32 = 0;
        let pairings = [("neural", "heuristic"), ("heuristic", "neural")];

        std::env::set_var("TCS_PROGRESS_LABEL", "SMOKE_PROGRESS");
        std::env::set_var(
            "TCS_PROGRESS_EVERY_TURNS",
            SMOKE_PROGRESS_EVERY_TURNS.to_string(),
        );

        for (index, (white, black)) in pairings.iter().enumerate() {
            std::env::set_var("TCS_PROGRESS_GAME", (index + 1).to_string());

            let mut runner = SimulationRunner::new();
            runner.max_steps = SMOKE_MAX_TURNS;
            runner.verbose = false;

            let summary = Self::run_match_resilient(&mut runner, white, black, SMOKE_BLOCK);

            if summary.purity_violations > 0 {
                total_purity_violations += summary.purity_violations;
                contaminated_match_count += 1;
            }

            let capped = matches!(&summary.termination, MatchTermination::TurnLimit);
            let termination = if capped {
                "capped_draw".to_string()
            } else {
                termination_to_string(&summary.termination)
            };
            let winner_reason = if capped {
                "capped_draw".to_string()
            } else {
                summary.winner_reason.clone()
            };

            match summary.winner {
                Some(1) if *white == "heuristic" => results[0].wins_a += 1,
                Some(1) if *white == "neural" => results[0].wins_b += 1,
                Some(2) if *black == "heuristic" => results[0].wins_a += 1,
                Some(2) if *black == "neural" => results[0].wins_b += 1,
                _ => results[0].draws += 1,
            }

            let score_a = match summary.winner {
                Some(1) if *white == "heuristic" => 1.0,
                Some(1) if *white == "neural" => 0.0,
                Some(2) if *black == "heuristic" => 1.0,
                Some(2) if *black == "neural" => 0.0,
                _ => 0.5,
            };
            elo.update_match("heuristic", "neural", score_a);

            let smoke_game_source = if summary.winner_reason.starts_with("match_failed:") {
                "panic_recovered".to_string()
            } else {
                "normal".to_string()
            };

            game_records.push(GameRecord {
                game_id: global_game_id,
                agent_a: "heuristic".to_string(),
                agent_b: "neural".to_string(),
                match_block: SMOKE_BLOCK.to_string(),
                white: (*white).to_string(),
                black: (*black).to_string(),
                winner: if capped { None } else { summary.winner },
                turns: summary.turns,
                termination: termination.clone(),
                termination_type: termination.clone(),
                termination_ply: summary.termination_ply,
                progress_counter: summary.progress_counter,
                last_capture_ply: summary.last_capture_ply,
                last_pawn_move_ply: summary.last_pawn_move_ply,
                winner_reason,
                purity_violations: summary.purity_violations,
                game_source: smoke_game_source,
            });

            let benchmark_invalid = contaminated_match_count > 0;
            let contamination_reason = if contaminated_match_count > 0 {
                format!(
                    "{} matches contaminated with {} purity violations",
                    contaminated_match_count, total_purity_violations
                )
            } else {
                "none".to_string()
            };
            let benchmark_status = TournamentBenchmarkStatus {
                benchmark_invalid,
                contaminated_match_count,
                purity_violation_total: total_purity_violations,
                contamination_reason,
            };
            let elo_rows = elo.leaderboard();

            let _ = export_games_csv(&game_records, &benchmark_status);
            let _ = export_games_detailed_csv(&game_records);
            let _ = export_matches_csv(&results);
            let _ = export_elo_csv(&elo_rows);
            let _ = export_benchmark_status_csv(&benchmark_status);

            println!(
                "SMOKE_GAME_PROGRESS|game={}/{}|white={}|black={}|winner={:?}|turns={}|termination={}|summary=persisted",
                index + 1,
                SMOKE_MAX_GAMES,
                white,
                black,
                summary.winner,
                summary.turns,
                termination
            );

            global_game_id += 1;
        }

        std::env::remove_var("TCS_PROGRESS_LABEL");
        std::env::remove_var("TCS_PROGRESS_EVERY_TURNS");
        std::env::remove_var("TCS_PROGRESS_GAME");

        let elo_rows = elo.leaderboard();

        let benchmark_invalid = contaminated_match_count > 0;
        let contamination_reason = if contaminated_match_count > 0 {
            format!(
                "{} matches contaminated with {} purity violations",
                contaminated_match_count, total_purity_violations
            )
        } else {
            "none".to_string()
        };

        let benchmark_status = TournamentBenchmarkStatus {
            benchmark_invalid,
            contaminated_match_count,
            purity_violation_total: total_purity_violations,
            contamination_reason,
        };

        println!();
        println!("SMOKE BENCHMARK");
        println!(
            "pairing=neural_vs_heuristic|games={}|max_turns={}|progress_every_turns={}",
            SMOKE_MAX_GAMES, SMOKE_MAX_TURNS, SMOKE_PROGRESS_EVERY_TURNS
        );

        (results, game_records, elo_rows, benchmark_status)
    }

    pub fn print_report(results: &[TournamentResult]) {
        println!("NEURAL TOURNAMENT REPORT");

        for r in results {
            println!(
                "{} | {} vs {} | games={} | A={} B={} D={}",
                r.match_block, r.agent_a, r.agent_b, r.games, r.wins_a, r.wins_b, r.draws
            );

            let draw_rate = if r.games > 0 {
                r.draws as f64 / r.games as f64
            } else {
                0.0
            };

            if draw_rate >= 0.95 {
                println!("WARNING: extreme draw rate ({:.2})", draw_rate);
            } else if draw_rate >= 0.80 {
                println!("WARNING: too many draws ({:.2})", draw_rate);
            }
        }
    }

    pub fn print_elo(rows: &[(String, f64)]) {
        println!();
        println!("ELO LEADERBOARD");

        for (agent, elo) in rows {
            println!("{} | {:.2}", agent, elo);
        }
    }

    pub fn print_balance_report_from_runner(n: u32) {
        let mut runner = SimulationRunner::new();
        runner.max_steps = 140;
        runner.verbose = false;

        let results = runner.run_n_matches(n);
        let report = analyze_matches(&results);

        println!();
        println!("=== MATCH METRICS ===");
        println!("{}", render_report(&report));
    }

    fn print_game_shape_diagnostics(game_records: &[GameRecord]) {
        let total_games = game_records.len() as u32;
        if total_games == 0 {
            return;
        }

        let mut short_draws = 0u32;
        let mut medium_draws = 0u32;
        let mut long_draws = 0u32;
        let mut short_wins = 0u32;
        let mut long_games = 0u32;
        let mut turn_limit_games = 0u32;
        let mut forced_draw_stagnation_games = 0u32;

        for g in game_records {
            let is_draw = g.winner.is_none();

            if g.turns >= 80 {
                long_games += 1;
            }

            if g.termination == "turn_limit" {
                turn_limit_games += 1;
            }

            if g.termination == "forced_draw_stagnation" {
                forced_draw_stagnation_games += 1;
            }

            if is_draw {
                if g.turns <= 12 {
                    short_draws += 1;
                } else if g.turns <= 40 {
                    medium_draws += 1;
                } else {
                    long_draws += 1;
                }
            } else if g.turns <= 12 {
                short_wins += 1;
            }
        }

        println!();
        println!("TOURNAMENT DIAGNOSTICS");
        println!("short draws (<=12 turns): {}", short_draws);
        println!("medium draws (13-40 turns): {}", medium_draws);
        println!("long draws (>40 turns): {}", long_draws);
        println!("short wins (<=12 turns): {}", short_wins);
        println!("long games (>=80 turns): {}", long_games);
        println!("turn-limit games: {}", turn_limit_games);
        println!("forced stagnation draws: {}", forced_draw_stagnation_games);

        if long_draws * 2 > total_games {
            println!("DIAGNOSIS: many long sterile games");
        }

        if short_draws > 0 {
            println!("DIAGNOSIS: some games end too early as draws");
        }

        if turn_limit_games > 0 {
            println!("DIAGNOSIS: some games still survive until hard cap");
        }

        if forced_draw_stagnation_games > 0 {
            println!("DIAGNOSIS: stagnation guard is actively terminating games");
        }
    }

    fn print_draw_hotspots(results: &[TournamentResult]) {
        println!();
        println!("DRAW HOTSPOTS");

        for r in results {
            let draw_rate = if r.games > 0 {
                r.draws as f64 / r.games as f64
            } else {
                0.0
            };

            if (r.agent_a == "neural" || r.agent_b == "neural") && draw_rate >= 0.90 {
                println!(
                    "{} | {} vs {} -> NEURAL STALL ({:.2})",
                    r.match_block, r.agent_a, r.agent_b, draw_rate
                );
            }

            if draw_rate >= 0.95 {
                println!(
                    "{} | {} vs {} -> EXTREME draw rate ({:.2})",
                    r.match_block, r.agent_a, r.agent_b, draw_rate
                );
            } else if draw_rate >= 0.80 {
                println!(
                    "{} | {} vs {} -> high draw rate ({:.2})",
                    r.match_block, r.agent_a, r.agent_b, draw_rate
                );
            }
        }
    }

    fn print_suspicious_games(
        game_records: &[GameRecord],
        benchmark_status: &TournamentBenchmarkStatus,
    ) {
        println!();
        println!("SUSPICIOUS GAMES");

        let mut printed = 0usize;

        for g in game_records {
            let is_draw = g.winner.is_none();

            let is_contaminated = g.purity_violations > 0;

            if is_contaminated {
                println!(
                    "game_id={} {} vs {} | turns={} | termination={} | purity_violations={} | reason=contaminated",
                    g.game_id, g.white, g.black, g.turns, g.termination, g.purity_violations
                );
                printed += 1;
            } else if g.termination == "forced_draw_stagnation" {
                println!(
                    "game_id={} {} vs {} | turns={} | termination={} | reason=forced_stagnation",
                    g.game_id, g.white, g.black, g.turns, g.termination
                );
                printed += 1;
            } else if is_draw && g.turns >= 80 {
                println!(
                    "game_id={} {} vs {} | turns={} | termination={} | reason=long_draw",
                    g.game_id, g.white, g.black, g.turns, g.termination
                );
                printed += 1;
            } else if is_draw && g.turns <= 12 {
                println!(
                    "game_id={} {} vs {} | turns={} | termination={} | reason=early_draw",
                    g.game_id, g.white, g.black, g.turns, g.termination
                );
                printed += 1;
            } else if g.termination == "turn_limit" {
                println!(
                    "game_id={} {} vs {} | turns={} | termination={} | reason=turn_limit",
                    g.game_id, g.white, g.black, g.turns, g.termination
                );
                printed += 1;
            }

            if printed >= 12 {
                break;
            }
        }

        if printed == 0 {
            println!("no suspicious games detected");
        } else if benchmark_status.benchmark_invalid {
            println!(
                "BENCHMARK CONTAMINATED: {} purity violations detected",
                benchmark_status.purity_violation_total
            );
            println!(
                "inspect these game_ids in {}/tournaments/games.csv",
                experiment_dir().display()
            );
        } else {
            println!(
                "inspect these game_ids in {}/tournaments/moves_detailed.csv",
                experiment_dir().display()
            );
        }
    }
}
