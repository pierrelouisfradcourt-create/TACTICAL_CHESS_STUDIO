use uuid::Uuid;

use rand::prelude::*;
use rand::rngs::StdRng;
use serde::Serialize;
use std::fs::{create_dir_all, OpenOptions};
use std::io::{BufWriter, Write};
use std::path::PathBuf;
use std::time::Instant;

use crate::agents::uci_agent::UciAgent;
use crate::chess::decision::{choose_best_action_with_trace, DecisionTrace};
use crate::chess::uci::action_to_uci;
use crate::engine::action::action::Action;
use crate::engine::action::command::Command;
use crate::engine::engine::Engine;
use crate::prototype::minimal_ruleset::{load_engine_from_ruleset, minimal_runtime_ruleset};
use crate::prototype::runtime_ruleset::RuntimeRuleset;

#[derive(Serialize, Clone)]
pub struct TeacherSample {
    pub schema_version: u32,
    pub game_id: String,
    pub ply_index: usize,
    pub player_to_move: u32,
    pub source: String,
    pub decision_mode: Option<String>,
    pub aaa_used_search: bool,
    pub fen: String,
    pub legal_moves: Vec<String>,
    pub best_move: String,
    pub top_moves: Vec<String>,
    pub top_scores: Vec<f32>,
    pub teacher_depth: u32,
    pub engine_eval: Option<f32>,
    pub material_balance: Option<f32>,
    pub capture_available: bool,
    pub promotion_available: bool,
    pub tactical_flag: bool,
    pub sharp_flag: bool,
    pub decisive_flag: bool,
    pub opening_flag: bool,
    pub center_bias_flag: bool,
    pub top_gap: f32,
    pub aaa_search_depth: Option<i32>,
    pub aaa_search_score: Option<i32>,
    pub aaa_heuristic_score: Option<i32>,
    pub aaa_policy_score: Option<i32>,
    pub aaa_decision_score: Option<i32>,
    pub aaa_second_best_search_gap: Option<i32>,
    pub aaa_second_best_decision_gap: Option<i32>,
    pub aaa_nodes: Option<u64>,
    pub aaa_q_nodes: Option<u64>,
    pub aaa_beta_cutoffs: Option<u64>,
    pub aaa_tt_hits: Option<u64>,
    pub aaa_ordering_cutoff_index: Option<usize>,
    pub aaa_best_move_initial_rank: Option<usize>,
    pub aaa_best_move_final_rank: Option<usize>,
    pub aaa_principal_changed: Option<bool>,
    pub aaa_alt_moves: Vec<String>,
    pub aaa_alt_search_scores: Vec<i32>,
    pub aaa_alt_decision_scores: Vec<i32>,
    pub aaa_confidence: Option<f32>,
    pub result: Option<String>,
    pub termination_reason: Option<String>,
}

pub struct TeacherUciConfig {
    pub total_games: usize,
    pub max_turns: usize,
    pub depth: u32,
    pub stockfish_path: String,
    pub seed: u64,
    pub opening_random_min_plies: usize,
    pub opening_random_max_plies: usize,
    pub alternate_starting_player: bool,
}

pub struct TeacherUciRunner {
    pub config: TeacherUciConfig,
    pub ruleset: RuntimeRuleset,
}

#[derive(Clone, Copy)]
enum TrainerMode {
    Heuristic,
    Hybrid,
    TeacherUci,
    Random,
}

struct TrainerSelection {
    action: Action,
    decision_mode: String,
    trace: Option<DecisionTrace>,
}

impl TrainerMode {
    fn as_str(&self) -> &'static str {
        match self {
            TrainerMode::Heuristic => "heuristic",
            TrainerMode::Hybrid => "hybrid",
            TrainerMode::TeacherUci => "teacher_uci",
            TrainerMode::Random => "random",
        }
    }
}

impl TeacherUciRunner {
    pub fn new(total_games: usize, stockfish_path: String, depth: u32) -> Self {
        Self {
            config: TeacherUciConfig {
                total_games,
                max_turns: std::env::var("TCS_TEACHER_MAX_TURNS")
                    .ok()
                    .and_then(|value| value.parse::<usize>().ok())
                    .unwrap_or(220),
                depth,
                stockfish_path,
                seed: std::env::var("TCS_DATASET_SEED")
                    .ok()
                    .and_then(|v| v.parse::<u64>().ok())
                    .unwrap_or(42),
                opening_random_min_plies: 2,
                opening_random_max_plies: 8,
                alternate_starting_player: true,
            },
            ruleset: minimal_runtime_ruleset(),
        }
    }

    pub fn run_batch(&self) {
        let output_dir = std::env::var("TCS_TEACHER_OUTPUT_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("lab/datasets"));
        create_dir_all(&output_dir).ok();
        let run_id = Uuid::new_v4().to_string();

        let main_file = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(output_dir.join("teacher_samples.jsonl"))
            .unwrap();

        let tactical_file = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(output_dir.join("teacher_tactical.jsonl"))
            .unwrap();

        let finisher_file = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(output_dir.join("teacher_finisher.jsonl"))
            .unwrap();

        let solid_file = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(output_dir.join("teacher_solid.jsonl"))
            .unwrap();

        let positional_file = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(true)
            .open(output_dir.join("teacher_positional.jsonl"))
            .unwrap();

        let mut main_writer = BufWriter::new(main_file);
        let mut tactical_writer = BufWriter::new(tactical_file);
        let mut finisher_writer = BufWriter::new(finisher_file);
        let mut solid_writer = BufWriter::new(solid_file);
        let mut positional_writer = BufWriter::new(positional_file);

        let mut agent = UciAgent::new(&self.config.stockfish_path, self.config.depth);

        let mut main_written = 0usize;
        let mut tactical_written = 0usize;
        let mut finisher_written = 0usize;
        let mut solid_written = 0usize;
        let mut positional_written = 0usize;

        let mut rejected_empty = 0usize;
        let mut rejected_missing_eval = 0usize;
        let mut rejected_low_signal = 0usize;

        let mut total_tactical_flags = 0usize;
        let mut total_sharp_flags = 0usize;
        let mut total_decisive_flags = 0usize;
        let mut total_opening_flags = 0usize;
        let mut total_center_bias_flags = 0usize;

        let mut total_top_gap = 0.0f32;
        let mut top_gap_count = 0usize;
        let mut aaa_rows = 0usize;
        let mut aaa_used_search_rows = 0usize;
        let mut aaa_alt_total = 0usize;
        let mut aaa_confidence_total = 0.0f32;
        let mut aaa_confidence_count = 0usize;
        let mut result_white_wins = 0usize;
        let mut result_black_wins = 0usize;
        let mut result_draws = 0usize;

        for game_index in 0..self.config.total_games {
            agent.new_game();

            let samples = self.run_single_game_with_agent(game_index, &mut agent);

            match samples.first().and_then(|s| s.result.as_deref()) {
                Some("1-0") => result_white_wins += 1,
                Some("0-1") => result_black_wins += 1,
                Some("1/2-1/2") => result_draws += 1,
                _ => {}
            }

            for sample in samples {
                if sample.best_move.is_empty() || sample.legal_moves.is_empty() {
                    rejected_empty += 1;
                    continue;
                }

                if sample.engine_eval.is_none() {
                    rejected_missing_eval += 1;
                    continue;
                }

                let eval = sample.engine_eval.unwrap_or(0.0);
                let eval_abs = eval.abs();
                let material_abs = sample.material_balance.unwrap_or(0.0).abs();
                let result_str = sample.result.as_deref().unwrap_or("1/2-1/2");

                let keep_for_eval = eval_abs >= 1.0;
                let keep_for_material = material_abs >= 1.0;
                let keep_for_flags =
                    sample.tactical_flag || sample.decisive_flag || sample.opening_flag;
                let keep_for_conversion = sample.decisive_flag || material_abs >= 2.0;

                if !sample.capture_available && !sample.tactical_flag && eval_abs < 0.5 {
                    rejected_low_signal += 1;
                    continue;
                }

                if !(keep_for_eval || keep_for_material || keep_for_flags || keep_for_conversion) {
                    rejected_low_signal += 1;
                    continue;
                }

                if sample.tactical_flag {
                    total_tactical_flags += 1;
                }
                if sample.sharp_flag {
                    total_sharp_flags += 1;
                }
                if sample.decisive_flag {
                    total_decisive_flags += 1;
                }
                if sample.opening_flag {
                    total_opening_flags += 1;
                }
                if sample.center_bias_flag {
                    total_center_bias_flags += 1;
                }

                total_top_gap += sample.top_gap;
                top_gap_count += 1;
                if !sample.aaa_alt_moves.is_empty() || sample.aaa_confidence.is_some() {
                    aaa_rows += 1;
                    if sample.aaa_used_search {
                        aaa_used_search_rows += 1;
                    }
                    aaa_alt_total += sample.aaa_alt_moves.len();
                    if let Some(confidence) = sample.aaa_confidence {
                        aaa_confidence_total += confidence;
                        aaa_confidence_count += 1;
                    }
                }

                let json = match serde_json::to_string(&sample) {
                    Ok(v) => v,
                    Err(_) => {
                        rejected_empty += 1;
                        continue;
                    }
                };

                let _ = writeln!(main_writer, "{}", json);
                main_written += 1;

                if sample.tactical_flag || sample.sharp_flag {
                    let _ = writeln!(tactical_writer, "{}", json);
                    tactical_written += 1;
                }

                if should_write_finisher_sample(&sample, result_str, eval_abs, material_abs) {
                    let _ = writeln!(finisher_writer, "{}", json);
                    finisher_written += 1;
                }

                if sample.sharp_flag || eval_abs >= 2.0 {
                    let _ = writeln!(solid_writer, "{}", json);
                    solid_written += 1;
                }

                if sample.opening_flag || sample.center_bias_flag {
                    let _ = writeln!(positional_writer, "{}", json);
                    positional_written += 1;
                }
            }
        }

        main_writer.flush().ok();
        tactical_writer.flush().ok();
        finisher_writer.flush().ok();
        solid_writer.flush().ok();
        positional_writer.flush().ok();

        let rejected_total = rejected_empty + rejected_missing_eval + rejected_low_signal;
        let avg_top_gap = if top_gap_count > 0 {
            total_top_gap / top_gap_count as f32
        } else {
            0.0
        };
        let aaa_used_search_proportion = if aaa_rows > 0 {
            aaa_used_search_rows as f32 / aaa_rows as f32
        } else {
            0.0
        };
        let avg_aaa_alternatives = if aaa_rows > 0 {
            aaa_alt_total as f32 / aaa_rows as f32
        } else {
            0.0
        };
        let avg_aaa_confidence = if aaa_confidence_count > 0 {
            aaa_confidence_total / aaa_confidence_count as f32
        } else {
            0.0
        };
        let aaa_status = if aaa_rows == 0 {
            "absent"
        } else if (aaa_rows as f32 / main_written.max(1) as f32) < 0.05
            || avg_aaa_alternatives <= 0.0
        {
            "sparse"
        } else {
            "usable"
        };

        println!("TEACHER ARCHETYPE REPORT");
        println!("main written            : {}", main_written);
        println!("tactical written        : {}", tactical_written);
        println!("finisher written        : {}", finisher_written);
        println!("solid written           : {}", solid_written);
        println!("positional written      : {}", positional_written);
        println!("rejected total          : {}", rejected_total);
        println!("rejected empty          : {}", rejected_empty);
        println!("rejected missing eval   : {}", rejected_missing_eval);
        println!("rejected low signal     : {}", rejected_low_signal);
        println!("flag tactical           : {}", total_tactical_flags);
        println!("flag sharp              : {}", total_sharp_flags);
        println!("flag decisive           : {}", total_decisive_flags);
        println!("flag opening            : {}", total_opening_flags);
        println!("flag center_bias        : {}", total_center_bias_flags);
        println!("avg top gap             : {:.4}", avg_top_gap);
        println!("aaa rows                : {}", aaa_rows);
        println!(
            "aaa used search ratio   : {:.4}",
            aaa_used_search_proportion
        );
        println!("avg aaa alternatives    : {:.4}", avg_aaa_alternatives);
        println!("avg aaa confidence      : {:.4}", avg_aaa_confidence);
        println!("aaa_alt_search_scores   : diagnostic_only");
        println!("result white wins       : {}", result_white_wins);
        println!("result black wins       : {}", result_black_wins);
        println!("result draws            : {}", result_draws);
        println!("Datasets written to lab/datasets/");
        println!("  - teacher_samples.jsonl");
        println!("  - teacher_tactical.jsonl");
        println!("  - teacher_finisher.jsonl");
        println!("  - teacher_solid.jsonl");
        println!("  - teacher_positional.jsonl");

        let manifest = serde_json::json!({
            "run_id": run_id,
            "seed": self.config.seed,
            "total_games": self.config.total_games,
            "max_turns": self.config.max_turns,
            "depth": self.config.depth,
            "output_dir": output_dir.to_string_lossy(),
            "stockfish_path": self.config.stockfish_path,
            "opening_random_min_plies": self.config.opening_random_min_plies,
            "opening_random_max_plies": self.config.opening_random_max_plies,
            "alternate_starting_player": self.config.alternate_starting_player,
            "trainer_mix": {
                "base": {
                    "heuristic_agent": 0.50,
                    "hybrid_agent": 0.30,
                    "teacher_uci": 0.10,
                    "random_agent": 0.10
                },
                "phase_bias": {
                    "opening": "favor heuristic",
                    "midgame": "favor hybrid",
                    "late": "allow more hybrid/teacher"
                }
            },
            "written": {
                "main": main_written,
                "tactical": tactical_written,
                "finisher": finisher_written,
                "solid": solid_written,
                "positional": positional_written
            },
            "rejected": {
                "total": rejected_total,
                "empty": rejected_empty,
                "missing_eval": rejected_missing_eval,
                "low_signal": rejected_low_signal
            },
            "results": {
                "white_wins": result_white_wins,
                "black_wins": result_black_wins,
                "draws": result_draws
            },
            "avg_top_gap": avg_top_gap,
            "aaa": {
                "status": aaa_status,
                "aaa_rows": aaa_rows,
                "aaa_used_search_proportion": aaa_used_search_proportion,
                "avg_aaa_alternatives_per_aaa_row": avg_aaa_alternatives,
                "avg_aaa_confidence": avg_aaa_confidence,
                "aaa_alt_search_scores": "diagnostic_only"
            }
        });

        std::fs::write(
            output_dir.join("teacher_manifest.json"),
            serde_json::to_string_pretty(&manifest).unwrap_or_else(|_| "{}".to_string()),
        )
        .ok();
    }

    fn run_single_game_with_agent(
        &self,
        game_index: usize,
        agent: &mut UciAgent,
    ) -> Vec<TeacherSample> {
        let mut samples = Vec::new();

        let game_id = Uuid::new_v4().to_string();
        let mut engine = load_engine_from_ruleset(&self.ruleset);
        let mut rng = StdRng::seed_from_u64(self.config.seed + game_index as u64);

        if self.config.alternate_starting_player && rng.gen_bool(0.5) {
            engine.turn_manager.current_player = 2;
        }

        for ply in 0..self.config.max_turns {
            if engine.game_over() {
                break;
            }

            let fen = engine.to_fen();
            let player = engine.turn_manager.current_player;
            let legal_actions = engine.legal_actions(player);

            if legal_actions.is_empty() {
                break;
            }

            let legal_moves: Vec<String> = legal_actions
                .iter()
                .filter_map(|a| action_to_uci(a, &engine.units))
                .collect();

            if legal_moves.is_empty() {
                break;
            }

            let promotion_available = legal_moves.iter().any(|m| looks_like_promotion(m));
            let capture_available = has_capture_move(&fen, &legal_moves);
            let material_balance = Some(compute_material_balance_from_fen(&fen));

            let total_start = Instant::now();
            let (raw_top_moves, raw_top_scores, eval) = agent.request_top_moves(&fen);
            let stockfish_ms = agent.last_request_ms;

            let (top_moves, top_scores) =
                sanitize_top_candidates(raw_top_moves, raw_top_scores, &legal_moves, eval);

            if top_moves.is_empty() || top_scores.is_empty() {
                continue;
            }

            let best_move = top_moves
                .first()
                .cloned()
                .unwrap_or_else(|| legal_moves[0].clone());

            let rocky_start = Instant::now();
            let chosen_selection = if ply < 10 {
                select_opening_action(&engine, player, &legal_actions)
                    .map(|action| TrainerSelection {
                        action,
                        decision_mode: "opening_book".to_string(),
                        trace: None,
                    })
                    .or_else(|| {
                        let trainer_mode = sample_trainer_mode(ply, &mut rng);
                        select_trainer_action(
                            &engine,
                            player,
                            &legal_actions,
                            trainer_mode,
                            &best_move,
                            &mut rng,
                        )
                    })
                    .unwrap_or_else(|| TrainerSelection {
                        action: legal_actions[0].clone(),
                        decision_mode: "fallback_legal_first".to_string(),
                        trace: None,
                    })
            } else {
                let trainer_mode = sample_trainer_mode(ply, &mut rng);
                select_trainer_action(
                    &engine,
                    player,
                    &legal_actions,
                    trainer_mode,
                    &best_move,
                    &mut rng,
                )
                .unwrap_or_else(|| TrainerSelection {
                    action: legal_actions[0].clone(),
                    decision_mode: "fallback_legal_first".to_string(),
                    trace: None,
                })
            };
            let rocky_ms = rocky_start.elapsed().as_millis();
            let total_ms = total_start.elapsed().as_millis();
            println!("TIMING|stockfish_ms={}|rocky_ms={}|total_ms={}", stockfish_ms, rocky_ms, total_ms);

            let top_gap = compute_top_gap(&top_scores);
            let eval_abs = eval.unwrap_or(0.0).abs();
            let material_abs = material_balance.unwrap_or(0.0).abs();
            let non_king_piece_count = count_non_king_pieces_from_fen(&fen);
            let endgameish = non_king_piece_count <= 8;
            let center_bias_flag = is_center_bias_move(&best_move);

            let tactical_flag = capture_available || promotion_available;
            let sharp_flag = top_gap >= 0.75 || (capture_available && top_gap >= 0.35);
            let decisive_flag = eval_abs >= 3.0
                || material_abs >= 3.0
                || (endgameish && (eval_abs >= 1.5 || material_abs >= 2.0));
            let opening_flag = ply < 12;

            let aaa_summary = chosen_selection
                .trace
                .as_ref()
                .and_then(|trace| search_trace_summary(trace, &engine));

            let sample = TeacherSample {
                schema_version: 3,
                game_id: game_id.clone(),
                ply_index: ply,
                player_to_move: player,
                source: "teacher_uci".to_string(),
                decision_mode: Some(chosen_selection.decision_mode.clone()),
                aaa_used_search: aaa_summary.is_some(),
                fen,
                legal_moves,
                best_move,
                top_moves,
                top_scores,
                teacher_depth: self.config.depth,
                engine_eval: eval,
                material_balance,
                capture_available,
                promotion_available,
                tactical_flag,
                sharp_flag,
                decisive_flag,
                opening_flag,
                center_bias_flag,
                top_gap,
                aaa_search_depth: aaa_summary.as_ref().map(|s| s.search_depth),
                aaa_search_score: aaa_summary.as_ref().map(|s| s.search_score),
                aaa_heuristic_score: aaa_summary.as_ref().map(|s| s.heuristic_score),
                aaa_policy_score: aaa_summary.as_ref().map(|s| s.policy_score),
                aaa_decision_score: aaa_summary.as_ref().map(|s| s.decision_score),
                aaa_second_best_search_gap: aaa_summary
                    .as_ref()
                    .and_then(|s| s.second_best_search_gap),
                aaa_second_best_decision_gap: aaa_summary
                    .as_ref()
                    .and_then(|s| s.second_best_decision_gap),
                aaa_nodes: aaa_summary.as_ref().map(|s| s.nodes),
                aaa_q_nodes: aaa_summary.as_ref().map(|s| s.q_nodes),
                aaa_beta_cutoffs: aaa_summary.as_ref().map(|s| s.beta_cutoffs),
                aaa_tt_hits: aaa_summary.as_ref().map(|s| s.tt_hits),
                aaa_ordering_cutoff_index: aaa_summary
                    .as_ref()
                    .and_then(|s| s.ordering_cutoff_index),
                aaa_best_move_initial_rank: aaa_summary.as_ref().map(|s| s.best_move_initial_rank),
                aaa_best_move_final_rank: aaa_summary.as_ref().map(|s| s.best_move_final_rank),
                aaa_principal_changed: aaa_summary.as_ref().map(|s| s.principal_changed),
                aaa_alt_moves: aaa_summary
                    .as_ref()
                    .map(|s| s.alt_moves.clone())
                    .unwrap_or_default(),
                aaa_alt_search_scores: aaa_summary
                    .as_ref()
                    .map(|s| s.alt_search_scores.clone())
                    .unwrap_or_default(),
                aaa_alt_decision_scores: aaa_summary
                    .as_ref()
                    .map(|s| s.alt_decision_scores.clone())
                    .unwrap_or_default(),
                aaa_confidence: aaa_summary.as_ref().map(|s| s.confidence),
                result: None,
                termination_reason: None,
            };

            samples.push(sample);

            let command = Command {
                player_id: player,
                action: chosen_selection.action,
            };

            engine.execute(command);
        }

        let termination_reason = if engine.game_over() {
            engine.termination_reason().map(|reason| reason.to_string())
        } else {
            Some("teacher_max_ply_cap".to_string())
        };

        let result = if engine.game_over() {
            match engine.winner() {
                Some(winner) => {
                    if winner == 1 {
                        "1-0".to_string()
                    } else {
                        "0-1".to_string()
                    }
                }
                None => "1/2-1/2".to_string(),
            }
        } else {
            "1/2-1/2".to_string()
        };

        for sample in &mut samples {
            sample.result = Some(result.clone());
            sample.termination_reason = termination_reason.clone();
        }

        samples
    }
}

fn should_write_finisher_sample(
    sample: &TeacherSample,
    result: &str,
    eval_abs: f32,
    material_abs: f32,
) -> bool {
    if result == "1/2-1/2" {
        return false;
    }

    if !sample_is_on_winner_side(sample, result) {
        return false;
    }

    let endgameish = count_non_king_pieces_from_fen(&sample.fen) <= 8;
    let high_confidence = sample.decisive_flag || eval_abs >= 2.0 || material_abs >= 2.0;
    let strong_gap = sample.top_gap >= 0.40;
    let tactical_conversion =
        sample.promotion_available || (sample.capture_available && material_abs >= 1.5);
    let winning_endgame = endgameish && (material_abs >= 1.0 || eval_abs >= 1.25);
    let clean_conversion =
        high_confidence && (strong_gap || tactical_conversion || winning_endgame);

    clean_conversion
}

fn sample_is_on_winner_side(sample: &TeacherSample, result: &str) -> bool {
    match result {
        "1-0" => sample.player_to_move == 1,
        "0-1" => sample.player_to_move == 2,
        _ => false,
    }
}

fn looks_like_promotion(mv: &str) -> bool {
    mv.len() == 5
}

fn compute_top_gap(scores: &[f32]) -> f32 {
    if scores.len() < 2 {
        return 0.0;
    }
    (scores[0] - scores[1]).abs()
}

fn sample_trainer_mode(ply: usize, rng: &mut StdRng) -> TrainerMode {
    let roll = rng.gen_range(0..100);

    if ply < 15 {
        match roll {
            0..=69 => TrainerMode::Heuristic,
            70..=84 => TrainerMode::Hybrid,
            85..=94 => TrainerMode::TeacherUci,
            _ => TrainerMode::Random,
        }
    } else if ply < 40 {
        match roll {
            0..=39 => TrainerMode::Heuristic,
            40..=79 => TrainerMode::Hybrid,
            80..=89 => TrainerMode::TeacherUci,
            _ => TrainerMode::Random,
        }
    } else {
        match roll {
            0..=34 => TrainerMode::Heuristic,
            35..=69 => TrainerMode::Hybrid,
            70..=89 => TrainerMode::TeacherUci,
            _ => TrainerMode::Random,
        }
    }
}

fn select_trainer_action(
    engine: &Engine,
    player: u32,
    legal_actions: &[Action],
    mode: TrainerMode,
    best_move: &str,
    rng: &mut StdRng,
) -> Option<TrainerSelection> {
    match mode {
        TrainerMode::TeacherUci => legal_actions
            .iter()
            .find(|a| action_to_uci(a, &engine.units).as_deref() == Some(best_move))
            .cloned()
            .or_else(|| legal_actions.first().cloned())
            .map(|action| TrainerSelection {
                action,
                decision_mode: mode.as_str().to_string(),
                trace: None,
            }),
        TrainerMode::Random => legal_actions
            .choose(rng)
            .cloned()
            .map(|action| TrainerSelection {
                action,
                decision_mode: mode.as_str().to_string(),
                trace: None,
            }),
        TrainerMode::Heuristic | TrainerMode::Hybrid => {
            choose_best_action_with_trace(engine, player, mode.as_str()).map(|trace| {
                TrainerSelection {
                    action: trace.selected_action.clone(),
                    decision_mode: mode.as_str().to_string(),
                    trace: Some(trace),
                }
            })
        }
    }
}

#[derive(Clone)]
struct SearchTraceSummary {
    search_depth: i32,
    search_score: i32,
    heuristic_score: i32,
    policy_score: i32,
    decision_score: i32,
    second_best_search_gap: Option<i32>,
    second_best_decision_gap: Option<i32>,
    nodes: u64,
    q_nodes: u64,
    beta_cutoffs: u64,
    tt_hits: u64,
    ordering_cutoff_index: Option<usize>,
    best_move_initial_rank: usize,
    best_move_final_rank: usize,
    principal_changed: bool,
    alt_moves: Vec<String>,
    alt_search_scores: Vec<i32>,
    alt_decision_scores: Vec<i32>,
    confidence: f32,
}

fn search_trace_summary(trace: &DecisionTrace, engine: &Engine) -> Option<SearchTraceSummary> {
    let root = trace.root_search.as_ref()?;
    let alternatives = &root.diagnostics.principal_alternatives;
    let alt_moves = alternatives
        .iter()
        .map(|alt| {
            action_to_uci(&alt.action, &engine.units).unwrap_or_else(|| format!("{:?}", alt.action))
        })
        .collect::<Vec<_>>();
    let alt_search_scores = alternatives
        .iter()
        .map(|alt| alt.search_score)
        .collect::<Vec<_>>();
    let alt_decision_scores = alternatives
        .iter()
        .map(|alt| alt.decision_score)
        .collect::<Vec<_>>();
    let confidence = compute_search_confidence(
        root.diagnostics.decision.second_best_search_gap,
        root.diagnostics.decision.second_best_decision_gap,
        root.diagnostics.counters.nodes,
    );

    Some(SearchTraceSummary {
        search_depth: root.completed_depth,
        search_score: root.best_score,
        heuristic_score: root.heuristic_score,
        policy_score: root.policy_score,
        decision_score: root.decision_score,
        second_best_search_gap: root.diagnostics.decision.second_best_search_gap,
        second_best_decision_gap: root.diagnostics.decision.second_best_decision_gap,
        nodes: root.diagnostics.counters.nodes,
        q_nodes: root.diagnostics.counters.quiescence_nodes,
        beta_cutoffs: root.diagnostics.counters.beta_cutoffs,
        tt_hits: root.diagnostics.counters.tt_hits,
        ordering_cutoff_index: root.diagnostics.ordering.cutoff_index,
        best_move_initial_rank: root.diagnostics.ordering.best_move_initial_rank,
        best_move_final_rank: root.diagnostics.ordering.best_move_final_rank,
        principal_changed: root.diagnostics.ordering.principal_move_changed,
        alt_moves,
        alt_search_scores,
        alt_decision_scores,
        confidence,
    })
}

fn compute_search_confidence(
    second_best_search_gap: Option<i32>,
    second_best_decision_gap: Option<i32>,
    nodes: u64,
) -> f32 {
    let search_gap = second_best_search_gap.unwrap_or(0).max(0) as f32;
    let decision_gap = second_best_decision_gap.unwrap_or(0).max(0) as f32;
    let node_factor = ((nodes as f32).ln_1p() / 8.0).clamp(0.0, 1.0);
    (0.35 + search_gap / 600.0 + decision_gap / 2000.0 + node_factor * 0.2).clamp(0.25, 1.5)
}

fn sanitize_top_candidates(
    raw_top_moves: Vec<String>,
    raw_top_scores: Vec<f32>,
    legal_moves: &[String],
    eval: Option<f32>,
) -> (Vec<String>, Vec<f32>) {
    let usable_len = raw_top_moves.len().min(raw_top_scores.len());

    let mut pairs: Vec<(String, f32)> = raw_top_moves
        .into_iter()
        .zip(raw_top_scores.into_iter())
        .take(usable_len)
        .filter(|(mv, sc)| !mv.is_empty() && sc.is_finite() && legal_moves.contains(mv))
        .collect();

    if pairs.is_empty() {
        return (vec![legal_moves[0].clone()], vec![eval.unwrap_or(0.0)]);
    }

    pairs.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    let mut deduped: Vec<(String, f32)> = Vec::new();
    for (mv, sc) in pairs {
        if !deduped.iter().any(|(existing_mv, _)| existing_mv == &mv) {
            deduped.push((mv, sc));
        }
    }

    deduped.truncate(3);

    let top_moves = deduped.iter().map(|(mv, _)| mv.clone()).collect::<Vec<_>>();
    let top_scores = deduped.iter().map(|(_, sc)| *sc).collect::<Vec<_>>();

    (top_moves, top_scores)
}

fn is_center_bias_move(best_move: &str) -> bool {
    matches!(
        best_move,
        "e2e4" | "d2d4" | "e7e5" | "d7d5" | "g1f3" | "b1c3" | "g8f6" | "b8c6" | "c2c4" | "c7c5"
    )
}

fn has_capture_move(fen: &str, moves: &[String]) -> bool {
    let board = parse_board_from_fen(fen);

    for mv in moves {
        if mv.len() < 4 {
            continue;
        }

        let from_file = (mv.as_bytes()[0] - b'a') as usize;
        let from_rank = 8usize.saturating_sub((mv.as_bytes()[1] - b'0') as usize);
        let to_file = (mv.as_bytes()[2] - b'a') as usize;
        let to_rank = 8usize.saturating_sub((mv.as_bytes()[3] - b'0') as usize);

        if from_rank >= 8 || from_file >= 8 || to_rank >= 8 || to_file >= 8 {
            continue;
        }

        let from_piece = board[from_rank][from_file];
        let to_piece = board[to_rank][to_file];

        if from_piece == '.' || to_piece == '.' {
            continue;
        }

        if from_piece.is_uppercase() != to_piece.is_uppercase() {
            return true;
        }
    }

    false
}

fn parse_board_from_fen(fen: &str) -> [[char; 8]; 8] {
    let mut board = [['.'; 8]; 8];
    let board_part = fen.split_whitespace().next().unwrap_or("");
    let ranks: Vec<&str> = board_part.split('/').collect();

    for (r, rank_str) in ranks.iter().enumerate().take(8) {
        let mut c = 0usize;
        for ch in rank_str.chars() {
            if ch.is_ascii_digit() {
                c += ch.to_digit(10).unwrap_or(0) as usize;
            } else if c < 8 {
                board[r][c] = ch;
                c += 1;
            }
        }
    }

    board
}

fn compute_material_balance_from_fen(fen: &str) -> f32 {
    let board = fen.split_whitespace().next().unwrap_or("");

    let mut score = 0.0f32;

    for ch in board.chars() {
        score += match ch {
            'P' => 1.0,
            'N' => 3.0,
            'B' => 3.0,
            'R' => 5.0,
            'Q' => 9.0,
            'K' => 0.0,
            'p' => -1.0,
            'n' => -3.0,
            'b' => -3.0,
            'r' => -5.0,
            'q' => -9.0,
            'k' => 0.0,
            _ => 0.0,
        };
    }

    score
}

fn count_non_king_pieces_from_fen(fen: &str) -> usize {
    let board = fen.split_whitespace().next().unwrap_or("");
    board
        .chars()
        .filter(|ch| {
            matches!(
                ch,
                'P' | 'N' | 'B' | 'R' | 'Q' | 'p' | 'n' | 'b' | 'r' | 'q'
            )
        })
        .count()
}

fn select_opening_action(
    engine: &Engine,
    _player: u32,
    legal_actions: &[Action],
) -> Option<Action> {
    let preferred_moves = [
        "e2e4", "d2d4", "c2c4", "g1f3", "b1c3", "e7e5", "d7d5", "c7c5", "g8f6", "b8c6",
    ];

    for mv in preferred_moves {
        if let Some(action) = legal_actions
            .iter()
            .find(|a| action_to_uci(a, &engine.units).as_deref() == Some(mv))
        {
            return Some(action.clone());
        }
    }

    None
}
