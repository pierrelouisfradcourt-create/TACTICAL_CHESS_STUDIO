use std::sync::atomic::Ordering;
use std::time::{Duration, Instant};

use crate::agents::neural_bridge::{NeuralBridge, NeuralBridgeConfig};
use crate::agents::neural_config::{
    self, resolve_model_path, resolve_project_root, resolve_python_exe, resolve_script_path,
};
use crate::agents::neural_context::{
    detect_contextual_profile, retrieval_phase_label, ContextualMoveProfile, RerankContext,
};
use crate::agents::neural_fallback::{
    NeuralFallbackReason, NeuralRerankFallbackCause, NeuralRerankPool, NeuralSelectedSource,
};
use crate::agents::neural_legal::{
    action_moves_from_legal_actions, fallback_action_from_legal, is_legal_uci,
    legal_candidate_shortlist, selected_action_for_uci, selected_policy_rank_for_move, uci_moves,
};
use crate::agents::neural_protocol::{parse_python_response, MemoryHints, PythonPrediction};
use crate::agents::neural_selection::NeuralSelectionOutcome;
use crate::agents::neural_telemetry::{
    emit_runtime_line, log_bridge_fail, log_bridge_ok, log_bridge_retry, NeuralRuntimeStats,
    NEURAL_RUNTIME_COUNTERS,
};
use crate::agents::retrieval::{piece_count_bucket, query_similar_positions, warm_index};
use crate::chess::practical_policy::{
    build_strategic_state, detect_advantage_band, detect_finish_mode, detect_phase,
    detect_pressure_mode, no_progress_pressure as shared_no_progress_pressure,
    repetition_pressure as shared_repetition_pressure, reply_scan_breakdown, reply_scan_enabled,
    score_practical_candidate, tactical_diagnostics_enabled, tactical_safety_filter_breakdown,
    tactical_score_breakdown, PracticalCandidateInputs, StrategicState,
};
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;

#[derive(Clone)]
struct ParsedFen {
    board: [[char; 8]; 8],
    side_to_move: char,
}

#[derive(Clone)]
struct MoveSelection {
    selected_move: String,
    reason: String,
    material_advantage: f32,
    selected_source: &'static str,
    selected_policy_rank: i32,
    policy_selected_mismatch_flag: u8,
    selected_profile: ContextualMoveProfile,
    rerank_pool: &'static str,
    rerank_pool_size: usize,
    rerank_fallback_cause: &'static str,
}

#[derive(Clone, Copy, Debug)]
struct FinishModeContext {
    active: bool,
    state: StrategicState,
    reason: &'static str,
}

#[derive(Clone, Copy, Debug, Default)]
struct FinishModeScore {
    total: f32,
    trade: f32,
    passed: f32,
    enemy_moves_delta: i32,
    repeat: f32,
    quiet: f32,
}

#[derive(Clone, Copy, Debug)]
struct PressureModeContext {
    active: bool,
    state: StrategicState,
    reason: &'static str,
}

#[derive(Clone, Copy, Debug, Default)]
struct PressureModeScore {
    total: f32,
    capture: f32,
    check: f32,
    enemy_moves_delta: i32,
    repeat: f32,
}

#[derive(Clone, Copy)]
struct AntiRepetitionRule {
    enabled: bool,
    weight: f32,
    advantage_threshold: f32,
}

#[derive(Clone, Copy)]
struct ConversionBonusRule {
    enabled: bool,
    heavy_gain_bonus: f32,
    promotion_bonus: f32,
    favorable_capture_bonus: f32,
    forcing_progress_bonus: f32,
}

#[derive(Clone, Copy)]
struct OpeningTempoRule {
    enabled: bool,
    phase_ply_max: usize,
    repeat_penalty: f32,
    development_bonus: f32,
    castling_bonus: f32,
}

#[derive(Clone, Copy)]
struct ModularRuleConfig {
    anti_repetition: AntiRepetitionRule,
    conversion_bonus: ConversionBonusRule,
    opening_tempo: OpeningTempoRule,
}

struct RuleOutcome {
    bonus: f32,
    reasons: Vec<&'static str>,
}

struct MoveFilterOutcome {
    rejected: bool,
    reason: &'static str,
}

pub struct NeuralAgent {
    pub python_exe: String,
    pub script_path: String,
    pub model_path: String,
    pub project_root: String,
    bridge: NeuralBridge,
}

impl NeuralAgent {
    pub fn new() -> Self {
        if Self::retrieval_enabled() {
            warm_index();
        }

        Self {
            python_exe: resolve_python_exe(),
            script_path: resolve_script_path(),
            model_path: resolve_model_path(),
            project_root: resolve_project_root(),
            bridge: NeuralBridge::new(),
        }
    }

    fn verbose_debug_enabled() -> bool {
        std::env::var("TCS_VERBOSE_NEURAL")
            .ok()
            .map(|v| {
                let v = v.trim().to_ascii_lowercase();
                v == "1" || v == "true" || v == "yes" || v == "on"
            })
            .unwrap_or(false)
    }

    fn timing_enabled() -> bool {
        std::env::var("TCS_TIMING")
            .ok()
            .map(|v| {
                let v = v.trim().to_ascii_lowercase();
                v == "1" || v == "true" || v == "yes" || v == "on"
            })
            .unwrap_or(false)
    }

    fn benchmark_purity_enabled() -> bool {
        std::env::var("TCS_BENCHMARK_PURITY")
            .ok()
            .map(|v| {
                let v = v.trim().to_ascii_lowercase();
                v == "1" || v == "true" || v == "yes" || v == "on"
            })
            .unwrap_or(false)
    }

    fn trade_rerank_enabled() -> bool {
        std::env::var("TCS_NEURAL_TRADE_RERANK")
            .ok()
            .map(|v| {
                let v = v.trim().to_ascii_lowercase();
                v == "1" || v == "true" || v == "yes" || v == "on"
            })
            .unwrap_or(true)
    }

    fn trade_ahead_threshold() -> f32 {
        std::env::var("TCS_NEURAL_TRADE_AHEAD_THRESHOLD")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(3.0)
    }

    fn finish_rerank_enabled() -> bool {
        std::env::var("TCS_NEURAL_FINISH_RERANK")
            .ok()
            .map(|v| {
                let v = v.trim().to_ascii_lowercase();
                v == "1" || v == "true" || v == "yes" || v == "on"
            })
            .unwrap_or(true)
    }

    fn finish_mode_enabled() -> bool {
        std::env::var("TCS_NEURAL_FINISH_MODE")
            .ok()
            .map(|v| {
                let v = v.trim().to_ascii_lowercase();
                v == "1" || v == "true" || v == "yes" || v == "on"
            })
            .unwrap_or(true)
    }

    fn pressure_mode_enabled() -> bool {
        std::env::var("TCS_NEURAL_PRESSURE_MODE")
            .ok()
            .map(|v| {
                let v = v.trim().to_ascii_lowercase();
                v == "1" || v == "true" || v == "yes" || v == "on"
            })
            .unwrap_or(true)
    }

    fn finish_advantage_threshold() -> f32 {
        std::env::var("TCS_NEURAL_FINISH_ADVANTAGE_THRESHOLD")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(2.0)
    }

    fn finish_total_material_max() -> f32 {
        std::env::var("TCS_NEURAL_FINISH_TOTAL_MATERIAL_MAX")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(18.0)
    }

    fn finish_piece_count_max() -> usize {
        std::env::var("TCS_NEURAL_FINISH_PIECE_COUNT_MAX")
            .ok()
            .and_then(|v| v.trim().parse::<usize>().ok())
            .unwrap_or(8)
    }

    fn predicted_base_score() -> f32 {
        std::env::var("TCS_NEURAL_PREDICTED_BASE")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(0.30)
    }

    fn finish_capture_bonus() -> f32 {
        std::env::var("TCS_NEURAL_FINISH_CAPTURE_BONUS")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(0.60)
    }

    fn finish_check_bonus() -> f32 {
        std::env::var("TCS_NEURAL_FINISH_CHECK_BONUS")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(0.30)
    }

    fn finish_corner_bonus() -> f32 {
        std::env::var("TCS_NEURAL_FINISH_CORNER_BONUS")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(0.22)
    }

    fn finish_king_approach_bonus() -> f32 {
        std::env::var("TCS_NEURAL_FINISH_KING_APPROACH_BONUS")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(0.18)
    }

    fn finish_promotion_bonus() -> f32 {
        std::env::var("TCS_NEURAL_FINISH_PROMOTION_BONUS")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(0.35)
    }

    fn finish_hold_advantage_bonus() -> f32 {
        std::env::var("TCS_NEURAL_FINISH_HOLD_ADVANTAGE_BONUS")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(0.20)
    }

    fn finish_escape_reduction_bonus() -> f32 {
        std::env::var("TCS_NEURAL_FINISH_ESCAPE_REDUCTION_BONUS")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(0.16)
    }

    fn finish_net_bonus() -> f32 {
        std::env::var("TCS_NEURAL_FINISH_NET_BONUS")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(0.45)
    }

    fn finish_quiet_penalty() -> f32 {
        std::env::var("TCS_NEURAL_FINISH_QUIET_PENALTY")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(0.14)
    }

    fn anti_stall_enabled() -> bool {
        std::env::var("TCS_NEURAL_ANTI_STALL")
            .ok()
            .map(|v| {
                let v = v.trim().to_ascii_lowercase();
                v == "1" || v == "true" || v == "yes" || v == "on"
            })
            .unwrap_or(true)
    }

    fn anti_stall_advantage_threshold() -> f32 {
        std::env::var("TCS_NEURAL_ANTI_STALL_ADVANTAGE")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(2.0)
    }

    fn anti_stall_capture_bonus() -> f32 {
        std::env::var("TCS_NEURAL_ANTI_STALL_CAPTURE_BONUS")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(0.35)
    }

    fn anti_stall_check_bonus() -> f32 {
        std::env::var("TCS_NEURAL_ANTI_STALL_CHECK_BONUS")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(0.25)
    }

    fn anti_stall_pawn_push_bonus() -> f32 {
        std::env::var("TCS_NEURAL_ANTI_STALL_PAWN_PUSH_BONUS")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(0.15)
    }

    fn anti_stall_king_approach_bonus() -> f32 {
        std::env::var("TCS_NEURAL_ANTI_STALL_KING_APPROACH_BONUS")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(0.18)
    }

    fn anti_stall_retreat_penalty() -> f32 {
        std::env::var("TCS_NEURAL_ANTI_STALL_RETREAT_PENALTY")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(0.12)
    }

    fn anti_stall_quiet_penalty() -> f32 {
        std::env::var("TCS_NEURAL_ANTI_STALL_QUIET_PENALTY")
            .ok()
            .and_then(|v| v.trim().parse::<f32>().ok())
            .unwrap_or(0.08)
    }

    fn retrieval_enabled() -> bool {
        neural_config::env_flag("TCS_RETRIEVAL", false)
    }

    fn retrieval_good_bonus() -> f32 {
        neural_config::env_f32("TCS_RETRIEVAL_GOOD_BONUS", 0.08)
    }

    fn retrieval_bad_penalty() -> f32 {
        neural_config::env_f32("TCS_RETRIEVAL_BAD_PENALTY", 0.10)
    }

    fn drop_process(&self) {
        self.bridge.drop_process();
    }

    fn ensure_process_started(&self) -> Result<(), String> {
        self.bridge
            .ensure_process_started(&self.bridge_config(), Self::timing_enabled)
    }

    pub fn health_check(&self) -> Result<String, String> {
        self.ensure_process_started()?;
        Ok(format!(
            "python={} | script={} | model={}",
            self.python_exe, self.script_path, self.model_path
        ))
    }

    pub fn reset_runtime_stats() {
        NEURAL_RUNTIME_COUNTERS.reset();
    }

    pub fn runtime_stats_snapshot() -> NeuralRuntimeStats {
        NEURAL_RUNTIME_COUNTERS.snapshot()
    }

    pub fn purity_violations_snapshot() -> u64 {
        NEURAL_RUNTIME_COUNTERS
            .purity_violations
            .load(Ordering::Relaxed)
    }

    fn query_python(&self, fen: &str, moves: &[String]) -> Result<PythonPrediction, String> {
        let response =
            self.bridge
                .query_raw(&self.bridge_config(), fen, moves, Self::timing_enabled)?;

        let prediction =
            parse_python_response(&response, neural_config::env_flag("TCS_MEMORY_CORE", false))?;
        log_bridge_ok("query");
        Ok(prediction)
    }

    pub fn select_action(&self, engine: &Engine, _player: u32, actions: &[Action]) -> Action {
        let total_start = Instant::now();

        NEURAL_RUNTIME_COUNTERS
            .selection_calls
            .fetch_add(1, Ordering::Relaxed);

        if Self::benchmark_purity_enabled() {
            emit_runtime_line("NEURAL_PURITY_MODE_ENABLED|strict_mode=1");
        }

        if actions.is_empty() {
            log_bridge_fail("select_action", "no_legal_actions");
            eprintln!("Neural agent received no legal actions; returning Pass");
            return NeuralSelectionOutcome::new(
                Action::Pass,
                None,
                NeuralSelectedSource::FallbackLegalFirst.as_str(),
                None,
                -1,
                0,
                NeuralRerankPool::FullLegal.as_str(),
                NeuralRerankFallbackCause::EmptyCandidateList.as_str(),
            )
            .into_action();
        }

        let fen = engine.to_fen();
        let rerank_context = RerankContext::from_engine(engine);

        let action_moves = action_moves_from_legal_actions(engine, actions);

        if action_moves.is_empty() {
            NEURAL_RUNTIME_COUNTERS
                .fallback_events
                .fetch_add(1, Ordering::Relaxed);
            NEURAL_RUNTIME_COUNTERS
                .fallback_no_uci_moves
                .fetch_add(1, Ordering::Relaxed);

            emit_runtime_line(&NeuralFallbackReason::NoUciMoves.runtime_line());
            emit_runtime_line(&format!(
                "NEURAL_MOVE_RUNTIME|status=fallback|reason={}|attempts=0|legal_moves={}|selected_source={}|selected_policy_rank=-1|policy_selected_mismatch_flag=0",
                NeuralFallbackReason::NoUciMoves.as_str(),
                actions.len(),
                NeuralSelectedSource::FallbackLegalFirst.as_str()
            ));

            if Self::benchmark_purity_enabled() {
                NEURAL_RUNTIME_COUNTERS
                    .purity_violations
                    .fetch_add(1, Ordering::Relaxed);
                emit_runtime_line(
                    "NEURAL_BENCHMARK_INVALID|reason=no_uci_moves|purity_mode=enabled",
                );
            }

            if Self::timing_enabled() {
                println!(
                    "NEURAL_SELECT_TOTAL_MS={}",
                    total_start.elapsed().as_millis()
                );
            }

            return NeuralSelectionOutcome::new(
                actions[0].clone(),
                None,
                NeuralSelectedSource::FallbackLegalFirst.as_str(),
                Some(NeuralFallbackReason::NoUciMoves),
                -1,
                0,
                NeuralRerankPool::FullLegal.as_str(),
                NeuralRerankFallbackCause::EmptyCandidateList.as_str(),
            )
            .into_action();
        }

        let moves = uci_moves(&action_moves);
        let verbose = Self::verbose_debug_enabled();

        if verbose {
            println!("NEURAL_AGENT_CALLED");
            println!("NEURAL_FEN={}", fen);
            println!("NEURAL_LEGAL_MOVES_COUNT={}", moves.len());
        }

        let result: Result<(PythonPrediction, u8), (String, u8)> = match self
            .query_python(&fen, &moves)
        {
            Ok(ok) => Ok((ok, 1u8)),
            Err(first_err) => {
                NEURAL_RUNTIME_COUNTERS
                    .query_retries
                    .fetch_add(1, Ordering::Relaxed);
                log_bridge_retry("python_query_failed_once");
                emit_runtime_line("NEURAL_FALLBACK_WARN=python_query_failed_once");

                if verbose {
                    println!("NEURAL_ERROR_1={}", first_err);
                }

                self.drop_process();

                match self.query_python(&fen, &moves) {
                    Ok(ok) => {
                        NEURAL_RUNTIME_COUNTERS
                            .retry_recoveries
                            .fetch_add(1, Ordering::Relaxed);
                        Ok((ok, 2u8))
                    }
                    Err(second_err) => Err((format!("{} ; retry={}", first_err, second_err), 2u8)),
                }
            }
        };

        let final_fallback_reason;

        match result {
            Ok((prediction, attempts_used)) => {
                let best = prediction.best_move;
                let best_index = prediction.best_index;

                if verbose {
                    println!("NEURAL_PREDICTED_MOVE={}", best);
                    println!("NEURAL_POLICY_INDEX={}", best_index);
                }

                let python_pred_is_legal = is_legal_uci(&moves, &best);

                if !python_pred_is_legal {
                    NEURAL_RUNTIME_COUNTERS
                        .invalid_python_predictions
                        .fetch_add(1, Ordering::Relaxed);
                    emit_runtime_line(&format!(
                        "NEURAL_INVALID_PREDICTION|predicted={}|legal_moves={}",
                        best,
                        moves.len()
                    ));
                }

                let rerank_loop_measure_start = Instant::now();
                let selection = select_move_with_rerank(
                    engine,
                    &fen,
                    &action_moves,
                    &moves,
                    &best,
                    &prediction.candidate_moves,
                    &prediction.memory_hints,
                    &rerank_context,
                    !python_pred_is_legal && Self::benchmark_purity_enabled(),
                );
                emit_runtime_line(&format!(
                    "NEURAL_SELECT_WITH_RERANK_MS={}",
                    rerank_loop_measure_start.elapsed().as_millis()
                ));

                if verbose {
                    println!("NEURAL_SELECTED_MOVE={}", selection.selected_move);
                    println!("NEURAL_SELECTION_REASON={}", selection.reason);
                    println!("NEURAL_RERANK_POOL={}", selection.rerank_pool);
                    println!("NEURAL_RERANK_POOL_SIZE={}", selection.rerank_pool_size);
                    println!(
                        "NEURAL_RERANK_FALLBACK_CAUSE={}",
                        selection.rerank_fallback_cause
                    );
                    println!(
                        "NEURAL_MATERIAL_ADVANTAGE={:.2}",
                        selection.material_advantage
                    );
                }

                if selection.rerank_pool == NeuralRerankPool::FullLegal.as_str() {
                    emit_runtime_line(&format!(
                        "NEURAL_RERANK_POOL_FALLBACK|cause={}|legal_moves={}|candidate_moves={}",
                        selection.rerank_fallback_cause,
                        moves.len(),
                        prediction.candidate_moves.len()
                    ));
                }

                if let Some(action) =
                    selected_action_for_uci(&action_moves, &selection.selected_move)
                {
                    if python_pred_is_legal && selection.selected_move == best {
                        NEURAL_RUNTIME_COUNTERS
                            .successful_inferences
                            .fetch_add(1, Ordering::Relaxed);

                        emit_runtime_line(&format!(
                                "NEURAL_MOVE_RUNTIME|status=success|reason={}|profile_selected={}|attempts={}|legal_moves={}|policy_index={}|selected_source={}|selected_policy_rank={}|policy_selected_mismatch_flag={}|rerank_pool={}|rerank_pool_size={}|rerank_fallback_cause={}",
                                selection.reason,
                                selection.selected_profile.as_str(),
                                attempts_used,
                                moves.len(),
                                best_index,
                                selection.selected_source,
                                selection.selected_policy_rank,
                                selection.policy_selected_mismatch_flag,
                                selection.rerank_pool,
                                selection.rerank_pool_size,
                                selection.rerank_fallback_cause
                            ));
                    } else if !python_pred_is_legal {
                        NEURAL_RUNTIME_COUNTERS
                            .rerank_salvages
                            .fetch_add(1, Ordering::Relaxed);

                        emit_runtime_line(&format!(
                                "NEURAL_MOVE_RUNTIME|status=salvaged|reason=invalid_python_prediction|profile_selected={}|attempts={}|legal_moves={}|policy_index={}|selected={}|selected_source={}|selected_policy_rank={}|policy_selected_mismatch_flag={}|rerank_pool={}|rerank_pool_size={}|rerank_fallback_cause={}",
                                selection.selected_profile.as_str(),
                                attempts_used,
                                moves.len(),
                                best_index,
                                selection.selected_move,
                                selection.selected_source,
                                selection.selected_policy_rank,
                                selection.policy_selected_mismatch_flag,
                                selection.rerank_pool,
                                selection.rerank_pool_size,
                                selection.rerank_fallback_cause
                            ));
                    } else {
                        NEURAL_RUNTIME_COUNTERS
                            .rerank_salvages
                            .fetch_add(1, Ordering::Relaxed);

                        emit_runtime_line(&format!(
                                "NEURAL_MOVE_RUNTIME|status=reranked|reason={}|profile_selected={}|attempts={}|legal_moves={}|policy_index={}|selected={}|selected_source={}|selected_policy_rank={}|policy_selected_mismatch_flag={}|rerank_pool={}|rerank_pool_size={}|rerank_fallback_cause={}",
                                selection.reason,
                                selection.selected_profile.as_str(),
                                attempts_used,
                                moves.len(),
                                best_index,
                                selection.selected_move,
                                selection.selected_source,
                                selection.selected_policy_rank,
                                selection.policy_selected_mismatch_flag,
                                selection.rerank_pool,
                                selection.rerank_pool_size,
                                selection.rerank_fallback_cause
                            ));
                    }

                    if Self::timing_enabled() {
                        println!(
                            "NEURAL_SELECT_TOTAL_MS={}",
                            total_start.elapsed().as_millis()
                        );
                    }

                    let outcome = NeuralSelectionOutcome::new(
                        action,
                        Some(selection.selected_move.clone()),
                        selection.selected_source,
                        None,
                        selection.selected_policy_rank,
                        selection.policy_selected_mismatch_flag,
                        selection.rerank_pool,
                        selection.rerank_fallback_cause,
                    );
                    let action = outcome.into_action();
                    return action;
                }

                emit_runtime_line(&NeuralFallbackReason::PredictedMoveNotFound.runtime_line());
                final_fallback_reason = NeuralFallbackReason::PredictedMoveNotFound;
                NEURAL_RUNTIME_COUNTERS
                    .fallback_events
                    .fetch_add(1, Ordering::Relaxed);
                NEURAL_RUNTIME_COUNTERS
                    .fallback_predicted_move_not_found
                    .fetch_add(1, Ordering::Relaxed);

                emit_runtime_line(&format!(
                    "NEURAL_MOVE_RUNTIME|status=fallback|reason={}|profile_selected={}|attempts={}|legal_moves={}|policy_index={}|selected_source={}|selected_policy_rank=-1|policy_selected_mismatch_flag=1",
                    NeuralFallbackReason::PredictedMoveNotFound.as_str(),
                    selection.selected_profile.as_str(),
                    attempts_used,
                    moves.len(),
                    best_index,
                    NeuralSelectedSource::FallbackLegalFirst.as_str()
                ));

                if Self::benchmark_purity_enabled() {
                    NEURAL_RUNTIME_COUNTERS
                        .purity_violations
                        .fetch_add(1, Ordering::Relaxed);
                    emit_runtime_line("NEURAL_BENCHMARK_INVALID|reason=predicted_move_not_found_purity|purity_mode=enabled");
                }

                if verbose {
                    println!("NEURAL_SELECTED_MOVE_REJECTED={}", selection.selected_move);
                }
            }
            Err((err, attempts_used)) => {
                log_bridge_fail("query", "final_failure");
                emit_runtime_line(&NeuralFallbackReason::PythonBridgeFailed.runtime_line());
                final_fallback_reason = NeuralFallbackReason::PythonBridgeFailed;
                NEURAL_RUNTIME_COUNTERS
                    .fallback_events
                    .fetch_add(1, Ordering::Relaxed);
                NEURAL_RUNTIME_COUNTERS
                    .fallback_python_bridge_failed
                    .fetch_add(1, Ordering::Relaxed);

                emit_runtime_line(&format!(
                    "NEURAL_MOVE_RUNTIME|status=fallback|reason={}|attempts={}|legal_moves={}|selected_source={}|selected_policy_rank=-1|policy_selected_mismatch_flag=0",
                    NeuralFallbackReason::PythonBridgeFailed.as_str(),
                    attempts_used,
                    moves.len(),
                    NeuralSelectedSource::FallbackLegalFirst.as_str()
                ));

                if Self::benchmark_purity_enabled() {
                    NEURAL_RUNTIME_COUNTERS
                        .purity_violations
                        .fetch_add(1, Ordering::Relaxed);
                    emit_runtime_line(
                        "NEURAL_BENCHMARK_INVALID|reason=bridge_failed_purity|purity_mode=enabled",
                    );
                }

                if verbose {
                    println!("NEURAL_ERROR_FINAL={}", err);
                }
            }
        }

        if Self::timing_enabled() {
            println!(
                "NEURAL_SELECT_TOTAL_MS={}",
                total_start.elapsed().as_millis()
            );
        }

        let fallback_action = fallback_action_from_legal(&action_moves, actions);

        if Self::benchmark_purity_enabled() {
            NEURAL_RUNTIME_COUNTERS
                .purity_violations
                .fetch_add(1, Ordering::Relaxed);
            emit_runtime_line(
                "NEURAL_BENCHMARK_INVALID|reason=final_fallback_purity|purity_mode=enabled",
            );
        }

        NeuralSelectionOutcome::new(
            fallback_action,
            None,
            NeuralSelectedSource::FallbackLegalFirst.as_str(),
            Some(final_fallback_reason),
            -1,
            0,
            NeuralRerankPool::FullLegal.as_str(),
            NeuralRerankFallbackCause::EmptyCandidateList.as_str(),
        )
        .into_action()
    }

    pub fn name() -> &'static str {
        "neural"
    }

    fn bridge_config(&self) -> NeuralBridgeConfig<'_> {
        NeuralBridgeConfig {
            python_exe: &self.python_exe,
            script_path: &self.script_path,
            model_path: &self.model_path,
            project_root: &self.project_root,
        }
    }
}

impl Drop for NeuralAgent {
    fn drop(&mut self) {
        self.drop_process();
    }
}

impl ModularRuleConfig {
    fn from_env() -> Self {
        Self {
            anti_repetition: AntiRepetitionRule {
                enabled: neural_config::env_flag("TCS_RULE_ANTI_REPETITION", false),
                weight: neural_config::env_f32("TCS_RULE_ANTI_REPETITION_WEIGHT", 0.20),
                advantage_threshold: neural_config::env_f32(
                    "TCS_RULE_ANTI_REPETITION_ADV_THRESHOLD",
                    2.0,
                ),
            },
            conversion_bonus: ConversionBonusRule {
                enabled: neural_config::env_flag("TCS_RULE_CONVERSION_BONUS", false),
                heavy_gain_bonus: neural_config::env_f32(
                    "TCS_RULE_CONVERSION_HEAVY_GAIN_BONUS",
                    0.32,
                ),
                promotion_bonus: neural_config::env_f32(
                    "TCS_RULE_CONVERSION_PROMOTION_BONUS",
                    0.40,
                ),
                favorable_capture_bonus: neural_config::env_f32(
                    "TCS_RULE_CONVERSION_FAVORABLE_CAPTURE_BONUS",
                    0.18,
                ),
                forcing_progress_bonus: neural_config::env_f32(
                    "TCS_RULE_CONVERSION_FORCING_PROGRESS_BONUS",
                    0.12,
                ),
            },
            opening_tempo: OpeningTempoRule {
                enabled: neural_config::env_flag("TCS_RULE_OPENING_TEMPO", false),
                phase_ply_max: neural_config::env_usize("TCS_RULE_OPENING_PHASE_PLY_MAX", 16),
                repeat_penalty: neural_config::env_f32("TCS_RULE_OPENING_REPEAT_PENALTY", 0.16),
                development_bonus: neural_config::env_f32(
                    "TCS_RULE_OPENING_DEVELOPMENT_BONUS",
                    0.10,
                ),
                castling_bonus: neural_config::env_f32("TCS_RULE_OPENING_CASTLING_BONUS", 0.16),
            },
        }
    }
}

fn select_move_with_rerank(
    engine: &Engine,
    fen: &str,
    action_moves: &[(Action, String)],
    legal_moves: &[String],
    predicted_move: &str,
    candidate_moves: &[String],
    memory_hints: &MemoryHints,
    context: &RerankContext,
    purity_violation_strict: bool,
) -> MoveSelection {
    let parsed = parse_fen(fen);
    let material_advantage = parsed
        .as_ref()
        .map(material_advantage_for_side_to_move)
        .unwrap_or(0.0);
    let phase = parsed.as_ref().map_or(
        crate::chess::practical_policy::PracticalPhase::Middlegame,
        |fen| {
            detect_phase(
                engine.action_log.len(),
                engine.units.len(),
                (total_non_king_material(fen) * 100.0) as i32,
            )
        },
    );
    let contextual_profile = detect_contextual_profile(phase, material_advantage);
    let has_tactical_candidate = parsed.as_ref().is_some_and(|parsed| {
        has_tactical_profile_candidate(
            engine,
            parsed,
            action_moves,
            contextual_profile,
            material_advantage,
        )
    });

    let predicted_is_legal = is_legal_uci(legal_moves, predicted_move);
    let fallback_move = legal_moves
        .first()
        .cloned()
        .unwrap_or_else(|| predicted_move.to_string());

    if purity_violation_strict && !predicted_is_legal {
        emit_runtime_line(&format!(
            "NEURAL_PURITY_VIOLATION|reason=invalid_prediction_strict|predicted={}",
            predicted_move
        ));
        emit_runtime_line(&format!(
            "NEURAL_RERANK_SALVAGE_DISABLED_PURITY|reason=invalid_python_prediction|legal_moves={}",
            legal_moves.len()
        ));
        return MoveSelection {
            selected_move: fallback_move,
            reason: "invalid_python_prediction_purity_block".to_string(),
            material_advantage,
            selected_profile: contextual_profile,
            selected_source: NeuralSelectedSource::FallbackLegalFirst.as_str(),
            selected_policy_rank: -1,
            policy_selected_mismatch_flag: 1,
            rerank_pool: NeuralRerankPool::FullLegal.as_str(),
            rerank_pool_size: legal_moves.len(),
            rerank_fallback_cause: NeuralRerankFallbackCause::PurityViolationStrict.as_str(),
        };
    }

    let selected_default = if predicted_is_legal {
        predicted_move.to_string()
    } else {
        fallback_move.clone()
    };

    let Some(parsed) = parsed else {
        return MoveSelection {
            selected_move: selected_default,
            reason: if predicted_is_legal {
                "none".to_string()
            } else {
                "invalid_python_prediction".to_string()
            },
            material_advantage,
            selected_profile: contextual_profile,
            selected_source: if predicted_is_legal {
                NeuralSelectedSource::BestMove.as_str()
            } else {
                NeuralSelectedSource::FallbackLegalFirst.as_str()
            },
            selected_policy_rank: if predicted_is_legal { 1 } else { -1 },
            policy_selected_mismatch_flag: if predicted_is_legal { 0 } else { 1 },
            rerank_pool: NeuralRerankPool::FullLegal.as_str(),
            rerank_pool_size: legal_moves.len(),
            rerank_fallback_cause: NeuralRerankFallbackCause::ParsedFenUnavailable.as_str(),
        };
    };

    let trade_mode = NeuralAgent::trade_rerank_enabled()
        && material_advantage >= NeuralAgent::trade_ahead_threshold();

    let finish_context = detect_finish_mode_context(engine, &parsed, material_advantage);
    let finish_mode = NeuralAgent::finish_rerank_enabled()
        && NeuralAgent::finish_mode_enabled()
        && finish_context.active;
    let pressure_context =
        detect_pressure_mode_context(engine, &parsed, material_advantage, memory_hints, context);
    let pressure_mode =
        NeuralAgent::pressure_mode_enabled() && !finish_mode && pressure_context.active;

    let anti_stall_mode = NeuralAgent::anti_stall_enabled()
        && (material_advantage >= NeuralAgent::anti_stall_advantage_threshold()
            || total_non_king_material(&parsed) <= 24.0);

    let modular_rules = ModularRuleConfig::from_env();
    let shortlist_cap = neural_config::env_usize("TCS_NEURAL_SHORTLIST_CAP", 5).max(1);
    let retrieval_bias = if NeuralAgent::retrieval_enabled() {
        Some(query_similar_positions(
            retrieval_phase_label(detect_phase(
                engine.action_log.len(),
                engine.units.len(),
                (total_non_king_material(&parsed) * 100.0) as i32,
            )),
            &material_signature(&parsed),
            piece_count_bucket(piece_count(&parsed)),
            10,
        ))
    } else {
        None
    };

    let (mut rerank_moves, rerank_pool, rerank_fallback_cause): (
        Vec<String>,
        &'static str,
        &'static str,
    ) = if !candidate_moves.is_empty() {
        let pool = legal_candidate_shortlist(
            candidate_moves,
            legal_moves,
            predicted_move,
            predicted_is_legal,
            shortlist_cap,
        );

        if pool.is_empty() {
            if predicted_is_legal {
                (
                    vec![predicted_move.to_string()],
                    NeuralRerankPool::Shortlist.as_str(),
                    NeuralRerankFallbackCause::FilteredCandidateListEmptyUsePredicted.as_str(),
                )
            } else {
                (
                    vec![fallback_move.clone()],
                    NeuralRerankPool::FullLegal.as_str(),
                    NeuralRerankFallbackCause::FilteredCandidateListEmpty.as_str(),
                )
            }
        } else {
            (
                pool,
                NeuralRerankPool::Shortlist.as_str(),
                NeuralRerankFallbackCause::None.as_str(),
            )
        }
    } else if predicted_is_legal {
        (
            vec![predicted_move.to_string()],
            NeuralRerankPool::Shortlist.as_str(),
            NeuralRerankFallbackCause::EmptyCandidateListUsePredicted.as_str(),
        )
    } else {
        (
            vec![fallback_move.clone()],
            NeuralRerankPool::FullLegal.as_str(),
            NeuralRerankFallbackCause::EmptyCandidateList.as_str(),
        )
    };

    let mut all_moves_filtered = false;
    if matches!(contextual_profile, ContextualMoveProfile::WinningEndgame) {
        let unfiltered_count = rerank_moves.len();
        let mut filtered_moves = Vec::new();

        for mv in &rerank_moves {
            let filter =
                winning_endgame_move_filter(engine, &parsed, action_moves, mv, material_advantage);
            if filter.rejected {
                emit_runtime_line(&format!(
                    "MOVE_FILTER|rejected=1|reason={}|move={}|score=-INF",
                    filter.reason, mv
                ));
            } else {
                filtered_moves.push(mv.clone());
            }
        }

        filtered_moves.truncate(3);
        if filtered_moves.is_empty() && !rerank_moves.is_empty() {
            emit_runtime_line(&format!(
                "MOVE_FILTER|rejected={}|reason=no_survivors_after_filter|fallback={}",
                unfiltered_count, selected_default
            ));
            all_moves_filtered = true;
            rerank_moves = filtered_moves;
        } else {
            if unfiltered_count > filtered_moves.len() {
                emit_runtime_line(&format!(
                    "MOVE_FILTER|rejected={}|reason=winning_endgame_hard_filter|kept={}",
                    unfiltered_count - filtered_moves.len(),
                    filtered_moves.len()
                ));
            }
            rerank_moves = filtered_moves;
        }
    }

    if rerank_pool == NeuralRerankPool::Shortlist.as_str() {
        NEURAL_RUNTIME_COUNTERS
            .shortlist_used_count
            .fetch_add(1, Ordering::Relaxed);
        NEURAL_RUNTIME_COUNTERS
            .shortlist_total_size
            .fetch_add(rerank_moves.len() as u64, Ordering::Relaxed);
    } else {
        NEURAL_RUNTIME_COUNTERS
            .full_legal_fallback_count
            .fetch_add(1, Ordering::Relaxed);
    }

    let predicted_base = NeuralAgent::predicted_base_score();

    let mut best_move = selected_default.clone();
    let mut best_score = if all_moves_filtered {
        f32::NEG_INFINITY
    } else if predicted_is_legal {
        predicted_base
    } else {
        0.0
    };
    let mut best_reason = if all_moves_filtered {
        "all_moves_filtered".to_string()
    } else if predicted_is_legal {
        "none".to_string()
    } else {
        "invalid_python_prediction".to_string()
    };
    let mut best_contextual_before = 0.0f32;
    let mut best_contextual_after = 0.0f32;
    let mut best_finish_score = FinishModeScore::default();
    let mut best_pressure_score = PressureModeScore::default();
    let mut retrieval_bias_applied = false;
    let rerank_loop_start = Instant::now();
    let mut rerank_total_score = 0f32;
    let mut rerank_scored_moves = 0u32;
    let mut base_scoring_time = Duration::ZERO;
    let mut contextual_scoring_time = Duration::ZERO;
    let profile_weight = contextual_profile_weight(contextual_profile);

    for mv in &rerank_moves {
        let base_scoring_start = Instant::now();
        let mut score = if mv == predicted_move {
            predicted_base
        } else if rerank_pool == NeuralRerankPool::Shortlist.as_str() {
            candidate_moves
                .iter()
                .position(|c| c == mv)
                .map(|idx| predicted_base * 0.7f32.powi((idx + 1) as i32))
                .unwrap_or(predicted_base * 0.5)
        } else {
            0.0
        };
        let policy_score = score;

        let mut reasons: Vec<&'static str> = Vec::new();
        let mut tactical_score = 0i32;
        let mut reply_penalty = 0i32;
        let mut safety_penalty = 0i32;

        if let Some(retrieval) = retrieval_bias.as_ref() {
            let retrieval_delta = retrieval.move_bias(
                mv,
                NeuralAgent::retrieval_good_bonus(),
                NeuralAgent::retrieval_bad_penalty(),
            );
            if retrieval_delta != 0.0 {
                score += retrieval_delta;
                retrieval_bias_applied = true;
                let (good_hits, bad_hits) = retrieval.move_hits(mv);
                if good_hits > 0 {
                    reasons.push("retrieval_good");
                }
                if bad_hits > 0 {
                    reasons.push("retrieval_bad");
                }
            }
        }

        if trade_mode {
            if let Some(bonus) = simplification_bonus(&parsed, mv, material_advantage) {
                score += bonus;
                reasons.push("trade_if_ahead");
            } else if mv != predicted_move {
                score -= 0.05;
                reasons.push("non_trade_penalty");
            }
        }

        if finish_mode {
            let finish = finish_bonus(&parsed, mv, material_advantage);
            if finish.bonus != 0.0 {
                score += finish.bonus;
                reasons.extend(finish.reasons);
            }

            let finish_mode_score = finish_mode_score(
                engine,
                &finish_context,
                action_moves,
                mv,
                material_advantage,
            );
            score += finish_mode_score.total;
            if finish_mode_score.total != 0.0 {
                if finish_mode_score.trade != 0.0 {
                    reasons.push("finish_mode_trade");
                }
                if finish_mode_score.passed != 0.0 {
                    reasons.push("finish_mode_passed");
                }
                if finish_mode_score.enemy_moves_delta > 0 {
                    reasons.push("finish_mode_reduce_enemy_moves");
                }
                if finish_mode_score.repeat != 0.0 {
                    reasons.push("finish_mode_repeat");
                }
                if finish_mode_score.quiet != 0.0 {
                    reasons.push("finish_mode_quiet");
                }
            }
            if score > best_score {
                best_finish_score = finish_mode_score;
            }
        }

        if pressure_mode {
            let pressure_score = pressure_mode_score(
                engine,
                &pressure_context,
                action_moves,
                mv,
                material_advantage,
            );
            score += pressure_score.total;
            if pressure_score.total != 0.0 {
                if pressure_score.capture != 0.0 {
                    reasons.push("pressure_mode_capture");
                }
                if pressure_score.check != 0.0 {
                    reasons.push("pressure_mode_check");
                }
                if pressure_score.enemy_moves_delta > 0 {
                    reasons.push("pressure_mode_reduce_enemy_moves");
                }
                if pressure_score.repeat != 0.0 {
                    reasons.push("pressure_mode_repeat");
                }
            }
            if score > best_score {
                best_pressure_score = pressure_score;
            }
        }

        if anti_stall_mode {
            let anti_stall = anti_stall_bonus(&parsed, mv, material_advantage);
            if anti_stall.bonus != 0.0 {
                score += anti_stall.bonus;
                reasons.extend(anti_stall.reasons);
            }
        }

        if let Some((action, _)) = action_moves.iter().find(|(_, legal_mv)| legal_mv == mv) {
            let tactical =
                tactical_score_breakdown(engine, engine.turn_manager.current_player, action, 0);
            tactical_score = tactical.final_score;
            if tactical.final_score != 0 {
                score += tactical.final_score as f32 * 0.0025;
                if tactical.see != 0 {
                    reasons.push("tactical_see");
                }
                if tactical.hanging != 0 {
                    reasons.push("tactical_hanging");
                }
                if tactical.trade != 0 {
                    reasons.push("tactical_trade");
                }
                if tactical.quiet != 0 {
                    reasons.push("tactical_quiet");
                }
            }

            let reply_scan =
                reply_scan_breakdown(engine, engine.turn_manager.current_player, action, 3);
            reply_penalty = reply_scan.penalty;
            if reply_scan.penalty != 0 {
                score -= reply_scan.penalty as f32 * 0.0025;
                reasons.push("reply_scan");
            }
            if reply_scan_enabled() {
                emit_runtime_line(&format!(
                    "REPLY_SCAN|move={}|enemy_best={}|penalty={}",
                    mv, reply_scan.enemy_best_move, reply_scan.penalty,
                ));
            }

            let safety = tactical_safety_filter_breakdown(
                engine,
                engine.turn_manager.current_player,
                action,
                legal_moves.len(),
            );
            safety_penalty = safety.penalty;
            if safety.penalty != 0 {
                score += safety.penalty as f32;
                if safety.moved_piece_captured || safety.material_drop >= 100 {
                    reasons.push("tactical_safety_loss");
                } else if safety.moved_piece_hanging {
                    reasons.push("tactical_safety_hanging");
                }
                if safety.compensation_bonus > 0 {
                    reasons.push("tactical_safety_compensation");
                }
                if safety.gives_check {
                    reasons.push("tactical_safety_check_reduced");
                }
            }
            if reply_scan_enabled() {
                emit_runtime_line(&format!(
                    "TACTICAL_SAFETY|move={}|enemy_best={}|penalty={}|compensation={}|material_cp={}|material_drop={}|captured={}|hanging={}|check={}|threat={}|complexity={}|forcing_reply_loss={}",
                    mv,
                    safety.enemy_best_move,
                    safety.penalty,
                    safety.compensation_bonus,
                    safety.material_advantage,
                    safety.material_drop,
                    if safety.moved_piece_captured { 1 } else { 0 },
                    if safety.moved_piece_hanging { 1 } else { 0 },
                    if safety.gives_check { 1 } else { 0 },
                    if safety.creates_capture_threat { 1 } else { 0 },
                    if safety.increases_complexity { 1 } else { 0 },
                    if safety.forcing_reply_loss { 1 } else { 0 },
                ));
            }

            let modular = apply_modular_rules(
                &modular_rules,
                &parsed,
                context,
                action,
                mv,
                material_advantage,
            );
            if modular.bonus != 0.0 {
                score += modular.bonus;
                reasons.extend(modular.reasons);
            }
        }

        if neural_config::env_flag("TCS_MEMORY_CORE", false) {
            let memory = apply_memory_hints(memory_hints, &parsed, mv, material_advantage);
            if memory.bonus != 0.0 {
                score += memory.bonus;
                reasons.extend(memory.reasons);
            }
        }

        base_scoring_time += base_scoring_start.elapsed();

        let contextual_scoring_start = Instant::now();
        let context_bonus = contextual_profile_hook(
            engine,
            &parsed,
            action_moves,
            contextual_profile,
            mv,
            material_advantage,
            has_tactical_candidate,
        );
        let contextual_before = context_bonus.bonus;
        let contextual_after = contextual_before * profile_weight;
        if contextual_before != 0.0 {
            score += contextual_after;
            reasons.extend(context_bonus.reasons);
        }
        contextual_scoring_time += contextual_scoring_start.elapsed();

        if reply_scan_enabled() {
            emit_runtime_line(&format!(
                "NEURAL_CANDIDATE_SCORE|move={}|policy={:.3}|reply_penalty={}|safety_penalty={}|tactical={}|final={:.3}",
                mv, policy_score, reply_penalty, safety_penalty, tactical_score, score
            ));
        }

        rerank_total_score += score;
        rerank_scored_moves += 1;

        if score > best_score {
            best_score = score;
            best_move = mv.clone();
            best_contextual_before = contextual_before;
            best_contextual_after = contextual_after;
            if finish_mode {
                best_finish_score = finish_mode_score(
                    engine,
                    &finish_context,
                    action_moves,
                    mv,
                    material_advantage,
                );
            }
            if pressure_mode {
                best_pressure_score = pressure_mode_score(
                    engine,
                    &pressure_context,
                    action_moves,
                    mv,
                    material_advantage,
                );
            }
            best_reason = if reasons.is_empty() {
                if mv == predicted_move {
                    "none".to_string()
                } else if rerank_pool == NeuralRerankPool::Shortlist.as_str()
                    && candidate_moves.iter().any(|c| c == mv)
                {
                    "candidate_preference".to_string()
                } else {
                    "invalid_python_prediction".to_string()
                }
            } else {
                reasons.join("+")
            };
        }
    }

    let rerank_loop_ms = rerank_loop_start.elapsed().as_millis();
    let rerank_loop_ms_f64 = rerank_loop_start.elapsed().as_secs_f64() * 1000.0;
    let time_per_move_ms = if rerank_scored_moves > 0 {
        rerank_loop_ms_f64 / rerank_scored_moves as f64
    } else {
        0.0
    };
    let rerank_avg_score = if rerank_scored_moves > 0 {
        rerank_total_score / rerank_scored_moves as f32
    } else {
        0.0
    };
    emit_runtime_line(&format!(
        "RERANK_COST|moves={}|iterations={}|time_ms={:.3}|time_per_move={:.3}|base_scoring_ms={:.3}|contextual_scoring_ms={:.3}",
        rerank_moves.len(),
        rerank_scored_moves,
        rerank_loop_ms_f64,
        time_per_move_ms,
        base_scoring_time.as_secs_f64() * 1000.0,
        contextual_scoring_time.as_secs_f64() * 1000.0,
    ));
    emit_runtime_line(&format!(
        "RERANK_TRACE|moves={}|best_score={:.4}|avg_score={:.4}|time_ms={}",
        rerank_moves.len(),
        best_score,
        rerank_avg_score,
        rerank_loop_ms
    ));

    let diag_state = if finish_mode {
        finish_context.state
    } else {
        pressure_context.state
    };
    let diag_enemy_moves_delta = if finish_mode {
        best_finish_score.enemy_moves_delta
    } else {
        best_pressure_score.enemy_moves_delta
    };
    let diag_passed_delta = if finish_mode {
        best_finish_score.passed.round() as i32
    } else {
        0
    };
    let diag_repeat = if finish_mode {
        best_finish_score.repeat
    } else {
        best_pressure_score.repeat
    };
    let diag_reason = if finish_mode || pressure_mode {
        best_reason.as_str()
    } else if NeuralAgent::finish_mode_enabled() {
        finish_context.reason
    } else {
        pressure_context.reason
    };

    if let Some(retrieval) = retrieval_bias.as_ref() {
        let (selected_good_hits, selected_bad_hits) = retrieval.move_hits(&best_move);
        let selected_bias = retrieval.move_bias(
            &best_move,
            NeuralAgent::retrieval_good_bonus(),
            NeuralAgent::retrieval_bad_penalty(),
        );
        emit_runtime_line(&format!(
            "RETRIEVAL|matches={}|bias_applied={}|phase={}|piece_count_bucket={}|good_moves={}|bad_moves={}|selected={}|selected_good_hits={}|selected_bad_hits={}|selected_bias={:.3}|lookup_us={}|status={}",
            retrieval.matches,
            if retrieval_bias_applied { 1 } else { 0 },
            retrieval.phase,
            retrieval.piece_count_bucket,
            retrieval.unique_good_moves,
            retrieval.unique_bad_moves,
            best_move,
            selected_good_hits,
            selected_bad_hits,
            selected_bias,
            retrieval.lookup_us,
            retrieval.load_status,
        ));
    }

    emit_runtime_line(&format!(
        "MOVE_DIAG|source=neural|phase={}|band={}|plan={}|selected={}|reason={}|finish={}|pressure={}|profile_selected={}|profile_weight={:.1}|contextual_before={:.3}|contextual_after={:.3}|material_cp={}|own_moves={}|enemy_moves={}|repetition_pressure={}|passed_pawn_distance={}|no_progress_pressure={}|enemy_moves_delta={}|passed_pawn_delta={}|repeat={:.3}",
        diag_state.phase.as_str(),
        diag_state.eval_band.as_str(),
        diag_state.conversion_plan.as_str(),
        best_move,
        diag_reason,
        if finish_mode { 1 } else { 0 },
        if pressure_mode { 1 } else { 0 },
        contextual_profile.as_str(),
        profile_weight,
        best_contextual_before,
        best_contextual_after,
        diag_state.material_advantage,
        diag_state.own_legal_moves,
        diag_state.enemy_legal_moves,
        diag_state.repetition_pressure,
        diag_state.passed_pawn_distance,
        diag_state.no_progress_pressure,
        diag_enemy_moves_delta,
        diag_passed_delta,
        diag_repeat,
    ));

    if tactical_diagnostics_enabled() {
        if let Some((action, _)) = action_moves
            .iter()
            .find(|(_, legal_mv)| legal_mv == &best_move)
        {
            let tactical =
                tactical_score_breakdown(engine, engine.turn_manager.current_player, action, 0);
            emit_runtime_line(&format!(
                "TACTICAL_DIAG|move={}|see={}|hang={}|mate={}|trade={}|quiet={}|final={}",
                best_move,
                tactical.see,
                tactical.hanging,
                tactical.mate,
                tactical.trade,
                tactical.quiet,
                tactical.final_score,
            ));
        }
    }

    let selected_policy_rank =
        selected_policy_rank_for_move(candidate_moves, &best_move, predicted_move);

    MoveSelection {
        selected_move: best_move.clone(),
        reason: best_reason,
        material_advantage,
        selected_profile: contextual_profile,
        selected_source: if best_move == predicted_move {
            NeuralSelectedSource::BestMove.as_str()
        } else if !predicted_is_legal && best_move == fallback_move {
            NeuralSelectedSource::FallbackLegalFirst.as_str()
        } else {
            NeuralSelectedSource::ShortlistRerank.as_str()
        },
        selected_policy_rank,
        policy_selected_mismatch_flag: if best_move == predicted_move { 0 } else { 1 },
        rerank_pool,
        rerank_pool_size: rerank_moves.len(),
        rerank_fallback_cause,
    }
}

fn detect_finish_mode_context(
    engine: &Engine,
    parsed: &ParsedFen,
    material_advantage: f32,
) -> FinishModeContext {
    let own_legal_moves = engine
        .legal_actions(engine.turn_manager.current_player)
        .len();
    let enemy_legal_moves = engine
        .legal_actions(opponent_player(engine.turn_manager.current_player))
        .len();
    let current_repeat = engine
        .repetition_counts
        .get(&engine.to_fen())
        .copied()
        .unwrap_or(1) as i32;
    let repetition_pressure = shared_repetition_pressure(current_repeat, engine.halfmove_clock);
    let phase = detect_phase(
        engine.action_log.len(),
        engine.units.len(),
        (total_non_king_material(parsed) * 100.0) as i32,
    );
    let band = detect_advantage_band((material_advantage * 100.0) as i32);
    let passed_pawn_distance = closest_passed_pawn_distance(parsed);
    let no_progress_pressure =
        shared_no_progress_pressure(engine.halfmove_clock, engine.action_log.len(), false);
    let endgame_material = total_non_king_material(parsed);
    let piece_count = piece_count(parsed);
    let endgameish = is_finish_phase(parsed, material_advantage)
        || endgame_material <= NeuralAgent::finish_total_material_max()
        || piece_count <= NeuralAgent::finish_piece_count_max();
    let state = build_strategic_state(
        phase,
        band,
        (material_advantage * 100.0) as i32,
        own_legal_moves,
        enemy_legal_moves,
        repetition_pressure,
        passed_pawn_distance,
        no_progress_pressure,
    );
    let (active, reason) = detect_finish_mode(
        &state,
        (NeuralAgent::finish_advantage_threshold() * 100.0) as i32,
        10,
        2,
        endgameish,
    );

    FinishModeContext {
        active,
        state,
        reason,
    }
}

fn detect_pressure_mode_context(
    engine: &Engine,
    parsed: &ParsedFen,
    material_advantage: f32,
    memory_hints: &MemoryHints,
    context: &RerankContext,
) -> PressureModeContext {
    let own_legal_moves = engine
        .legal_actions(engine.turn_manager.current_player)
        .len();
    let enemy_legal_moves = engine
        .legal_actions(opponent_player(engine.turn_manager.current_player))
        .len();
    let current_repeat = engine
        .repetition_counts
        .get(&engine.to_fen())
        .copied()
        .unwrap_or(1) as i32;
    let repetition_pressure = shared_repetition_pressure(current_repeat, engine.halfmove_clock);
    let phase = detect_phase(
        engine.action_log.len(),
        engine.units.len(),
        (total_non_king_material(parsed) * 100.0) as i32,
    );
    let band = detect_advantage_band((material_advantage * 100.0) as i32);
    let passed_pawn_distance = closest_passed_pawn_distance(parsed);
    let no_progress_pressure =
        shared_no_progress_pressure(engine.halfmove_clock, engine.action_log.len(), false);
    let positive_signal = material_advantage >= 0.5
        || memory_hints.tags.iter().any(|tag| tag == "material_up")
        || memory_hints
            .plans
            .iter()
            .any(|plan| plan == "trade_when_winning");
    let state = build_strategic_state(
        phase,
        band,
        (material_advantage * 100.0) as i32,
        own_legal_moves,
        enemy_legal_moves,
        repetition_pressure,
        passed_pawn_distance,
        no_progress_pressure,
    );
    let (active, reason) =
        detect_pressure_mode(&state, context.ply, positive_signal, 24, -20, 18, 14, 30);

    PressureModeContext {
        active,
        state,
        reason,
    }
}

fn finish_mode_score(
    engine: &Engine,
    context: &FinishModeContext,
    action_moves: &[(Action, String)],
    uci_move: &str,
    material_advantage: f32,
) -> FinishModeScore {
    let mut out = FinishModeScore::default();
    let Some((action, _)) = action_moves.iter().find(|(_, mv)| mv == uci_move) else {
        return out;
    };

    let mut sim = engine.clone();
    let Some(undo) = sim.simulate_action_for_search(engine.turn_manager.current_player, action)
    else {
        return out;
    };

    let before_fen = parse_fen(&engine.to_fen());
    let after_fen = parse_fen(&sim.to_fen());
    let enemy = opponent_player(engine.turn_manager.current_player);
    let enemy_moves_after = sim.legal_actions(enemy).len();
    out.enemy_moves_delta = context.state.enemy_legal_moves as i32 - enemy_moves_after as i32;
    let passed_pawn_delta = if let Some(after_parsed) = after_fen.as_ref() {
        if context.state.passed_pawn_distance >= 8
            && closest_passed_pawn_distance(after_parsed) >= 8
        {
            0
        } else {
            context.state.passed_pawn_distance - closest_passed_pawn_distance(after_parsed)
        }
    } else {
        0
    };

    if let Some(score) =
        trade_score_delta(&parse_fen(&engine.to_fen()), &after_fen, material_advantage)
    {
        out.trade = score;
        out.total += score;
    }

    if let Some(after_fen) = after_fen.as_ref() {
        let passed_after = closest_passed_pawn_distance(after_fen);
        if context.state.passed_pawn_distance < 8
            && passed_after < context.state.passed_pawn_distance
        {
            out.passed = (context.state.passed_pawn_distance - passed_after) as f32 * 0.26;
            out.total += out.passed;
        } else if context.state.passed_pawn_distance >= 8 && passed_after < 8 {
            out.passed = 0.32;
            out.total += out.passed;
        }

        let before_escape = king_escape_count(
            &parse_fen(&engine.to_fen()).unwrap().board,
            enemy_side(parsed_side_to_move(engine.turn_manager.current_player)),
        );
        let after_escape = king_escape_count(
            &after_fen.board,
            enemy_side(parsed_side_to_move(engine.turn_manager.current_player)),
        );
        if after_escape < before_escape {
            out.total += (before_escape - after_escape) as f32 * 0.08;
        }
    }

    if out.enemy_moves_delta > 0 {
        out.total += out.enemy_moves_delta as f32 * 0.08;
    }

    let repeat_after = sim
        .repetition_counts
        .get(&sim.to_fen())
        .copied()
        .unwrap_or(1) as i32;
    if repeat_after >= 3 {
        out.repeat -= 0.42;
        out.total += out.repeat;
    } else if context.state.repetition_pressure > 0 && repeat_after > 1 {
        out.repeat -= 0.18;
        out.total += out.repeat;
    }

    if sim.halfmove_clock >= engine.halfmove_clock + 1 && out.trade <= 0.0 && out.passed <= 0.0 {
        out.quiet -= 0.12 + context.state.no_progress_pressure as f32 * 0.02;
        out.total += out.quiet;
    }

    let practical = score_practical_candidate(
        &context.state,
        &PracticalCandidateInputs {
            enemy_moves_delta: out.enemy_moves_delta,
            passed_pawn_delta,
            repeat_after,
            trade_delta: ((trade_score_delta(
                &parse_fen(&engine.to_fen()),
                &after_fen,
                material_advantage,
            )
            .unwrap_or(0.0))
                * 100.0) as i32,
            progress: out.enemy_moves_delta.max(0) * 10,
            shuffle: repeat_after > 1 && out.enemy_moves_delta <= 0,
            gives_check: before_fen
                .as_ref()
                .zip(after_fen.as_ref())
                .map(|(before, after)| move_gives_check(&after.board, before.side_to_move))
                .unwrap_or(false),
            capture: out.trade != 0.0,
            boxing: 0,
            king_activity: 0,
            quiet_stall: out.trade <= 0.0 && out.passed <= 0.0 && out.enemy_moves_delta <= 0,
            preserves_advantage: true,
        },
    );
    out.total += practical.score as f32 * 0.0025;

    let _ = sim.undo_action_for_search(undo);
    out
}

fn pressure_mode_score(
    engine: &Engine,
    context: &PressureModeContext,
    action_moves: &[(Action, String)],
    uci_move: &str,
    material_advantage: f32,
) -> PressureModeScore {
    let mut out = PressureModeScore::default();
    let Some((action, _)) = action_moves.iter().find(|(_, mv)| mv == uci_move) else {
        return out;
    };

    let before_fen = parse_fen(&engine.to_fen());
    let Some(before_fen) = before_fen.as_ref() else {
        return out;
    };

    let mut sim = engine.clone();
    let Some(undo) = sim.simulate_action_for_search(engine.turn_manager.current_player, action)
    else {
        return out;
    };

    let after_fen = parse_fen(&sim.to_fen());
    let enemy = opponent_player(engine.turn_manager.current_player);
    let enemy_moves_after = sim.legal_actions(enemy).len();
    out.enemy_moves_delta = context.state.enemy_legal_moves as i32 - enemy_moves_after as i32;

    if let Some(capture_score) =
        trade_score_delta(&Some(before_fen.clone()), &after_fen, material_advantage)
    {
        out.capture = (capture_score * 0.55).max(-0.12);
        out.total += out.capture;
    } else if material_advantage >= 0.0 {
        out.capture += 0.0;
    }

    if let Some(after_fen) = after_fen.as_ref() {
        if move_gives_check(&after_fen.board, before_fen.side_to_move) {
            out.check += 0.14;
            out.total += out.check;
        }

        let passed_after = closest_passed_pawn_distance(after_fen);
        if context.state.passed_pawn_distance < 8
            && passed_after < context.state.passed_pawn_distance
        {
            out.total += (context.state.passed_pawn_distance - passed_after) as f32 * 0.10;
        } else if context.state.passed_pawn_distance >= 8 && passed_after < 8 {
            out.total += 0.12;
        }

        let before_enemy_king = find_king(&before_fen.board, enemy_side(before_fen.side_to_move));
        let after_enemy_king = find_king(&after_fen.board, enemy_side(before_fen.side_to_move));
        if let (Some(before_enemy), Some(after_enemy)) = (before_enemy_king, after_enemy_king) {
            let before_edge = king_edge_distance(before_enemy);
            let after_edge = king_edge_distance(after_enemy);
            if after_edge < before_edge {
                out.total += 0.08;
            }
        }
    }

    if out.enemy_moves_delta > 0 {
        out.total += out.enemy_moves_delta as f32 * 0.04;
    }

    let repeat_after = sim
        .repetition_counts
        .get(&sim.to_fen())
        .copied()
        .unwrap_or(1) as i32;
    if repeat_after >= 3 {
        out.repeat -= 0.22;
        out.total += out.repeat;
    } else if context.state.repetition_pressure > 0 && repeat_after > 1 {
        out.repeat -= 0.10;
        out.total += out.repeat;
    }

    if sim.halfmove_clock >= engine.halfmove_clock + 1
        && out.capture <= 0.0
        && out.check <= 0.0
        && out.enemy_moves_delta <= 0
    {
        out.total -= 0.06 + context.state.no_progress_pressure as f32 * 0.01;
    }

    let practical = score_practical_candidate(
        &context.state,
        &PracticalCandidateInputs {
            enemy_moves_delta: out.enemy_moves_delta,
            passed_pawn_delta: 0,
            repeat_after,
            trade_delta: (out.capture * 100.0) as i32,
            progress: out.enemy_moves_delta.max(0) * 10,
            shuffle: repeat_after > 1 && out.enemy_moves_delta <= 0,
            gives_check: out.check > 0.0,
            capture: out.capture > 0.0,
            boxing: 0,
            king_activity: 0,
            quiet_stall: out.capture <= 0.0 && out.check <= 0.0 && out.enemy_moves_delta <= 0,
            preserves_advantage: material_advantage >= -0.2,
        },
    );
    out.total += practical.score as f32 * 0.0015;

    let _ = sim.undo_action_for_search(undo);
    out
}

fn trade_score_delta(
    before: &Option<ParsedFen>,
    after: &Option<ParsedFen>,
    material_advantage: f32,
) -> Option<f32> {
    let before = before.as_ref()?;
    let after = after.as_ref()?;
    let before_total = total_non_king_material(before);
    let after_total = total_non_king_material(after);
    if after_total >= before_total {
        return None;
    }

    let after_advantage = material_advantage_for_side_to_move(after);
    if after_advantage + 0.5 < material_advantage {
        return Some(-0.18);
    }

    Some(0.18 + (before_total - after_total) * 0.03)
}

fn opponent_player(player: u32) -> u32 {
    if player == 1 {
        2
    } else {
        1
    }
}

fn parsed_side_to_move(player: u32) -> char {
    if player == 1 {
        'w'
    } else {
        'b'
    }
}

fn closest_passed_pawn_distance(fen: &ParsedFen) -> i32 {
    let mut best = 8i32;
    for row in 0..8 {
        for col in 0..8 {
            let piece = fen.board[row][col];
            if piece == '.' {
                continue;
            }
            if fen.side_to_move == 'w'
                && piece == 'P'
                && is_passed_pawn_on_board(fen, true, row, col)
            {
                best = best.min(row as i32);
            } else if fen.side_to_move == 'b'
                && piece == 'p'
                && is_passed_pawn_on_board(fen, false, row, col)
            {
                best = best.min((7 - row) as i32);
            }
        }
    }
    best
}

fn is_passed_pawn_on_board(fen: &ParsedFen, white_to_move: bool, row: usize, col: usize) -> bool {
    for scan_row in 0..8 {
        for scan_col in 0..8 {
            let piece = fen.board[scan_row][scan_col];
            if white_to_move {
                if piece != 'p' {
                    continue;
                }
                if (scan_col as i32 - col as i32).abs() > 1 {
                    continue;
                }
                if scan_row < row {
                    return false;
                }
            } else {
                if piece != 'P' {
                    continue;
                }
                if (scan_col as i32 - col as i32).abs() > 1 {
                    continue;
                }
                if scan_row > row {
                    return false;
                }
            }
        }
    }
    true
}

fn apply_memory_hints(
    hints: &MemoryHints,
    fen: &ParsedFen,
    uci_move: &str,
    material_advantage: f32,
) -> RuleOutcome {
    let mut bonus = 0.0f32;
    let mut reasons = Vec::new();

    let Some((from_row, from_col, to_row, to_col)) = uci_to_coords(uci_move) else {
        return RuleOutcome { bonus, reasons };
    };

    let mover = fen.board[from_row][from_col];
    if mover == '.' {
        return RuleOutcome { bonus, reasons };
    }

    if hints.plans.iter().any(|plan| plan == "trade_when_winning")
        && hints.tags.iter().any(|tag| tag == "material_up")
    {
        let captured = fen.board[to_row][to_col];
        if captured != '.' && !same_side_piece(mover, captured) && material_advantage > 0.0 {
            bonus += 0.05;
            reasons.push("memory_trade_when_winning");
        }
    }

    if hints
        .plans
        .iter()
        .any(|plan| plan == "activate_king_endgame")
        && hints.phase.as_deref() == Some("endgame")
        && mover.eq_ignore_ascii_case(&'k')
    {
        if let Some(board_after) = make_board_after_move(fen, uci_move) {
            if let (Some(before_enemy), Some(before_own), Some(after_own)) = (
                find_king(&fen.board, enemy_side(fen.side_to_move)),
                find_king(&fen.board, fen.side_to_move),
                find_king(&board_after, fen.side_to_move),
            ) {
                let before_dist = king_distance(before_own, before_enemy);
                let after_dist = king_distance(after_own, before_enemy);
                let before_center = king_edge_distance(before_own);
                let after_center = king_edge_distance(after_own);
                if after_dist < before_dist || after_center > before_center {
                    bonus += 0.05;
                    reasons.push("memory_activate_king_endgame");
                }
            }
        }
    }

    RuleOutcome { bonus, reasons }
}

fn apply_modular_rules(
    config: &ModularRuleConfig,
    fen: &ParsedFen,
    context: &RerankContext,
    action: &Action,
    uci_move: &str,
    material_advantage: f32,
) -> RuleOutcome {
    let mut bonus = 0.0f32;
    let mut reasons = Vec::new();

    if config.anti_repetition.enabled {
        let anti_repetition =
            anti_repetition_rule(config.anti_repetition, context, action, material_advantage);
        if anti_repetition.bonus != 0.0 {
            bonus += anti_repetition.bonus;
            reasons.extend(anti_repetition.reasons);
        }
    }

    if config.conversion_bonus.enabled {
        let conversion =
            conversion_bonus_rule(config.conversion_bonus, fen, uci_move, material_advantage);
        if conversion.bonus != 0.0 {
            bonus += conversion.bonus;
            reasons.extend(conversion.reasons);
        }
    }

    if config.opening_tempo.enabled {
        let opening = opening_tempo_rule(config.opening_tempo, fen, context, action, uci_move);
        if opening.bonus != 0.0 {
            bonus += opening.bonus;
            reasons.extend(opening.reasons);
        }
    }

    RuleOutcome { bonus, reasons }
}

fn anti_repetition_rule(
    config: AntiRepetitionRule,
    context: &RerankContext,
    action: &Action,
    material_advantage: f32,
) -> RuleOutcome {
    let mut bonus = 0.0f32;
    let mut reasons = Vec::new();

    let Action::Move { unit_id, .. } = action else {
        return RuleOutcome { bonus, reasons };
    };

    if material_advantage < config.advantage_threshold {
        return RuleOutcome { bonus, reasons };
    }

    if context.last_own_unit_id == Some(*unit_id) {
        bonus -= config.weight;
        reasons.push("rule_a_anti_repetition_repeat_piece");
    }

    RuleOutcome { bonus, reasons }
}

fn conversion_bonus_rule(
    config: ConversionBonusRule,
    fen: &ParsedFen,
    uci_move: &str,
    material_advantage: f32,
) -> RuleOutcome {
    let Some((from_row, from_col, to_row, to_col)) = uci_to_coords(uci_move) else {
        return RuleOutcome {
            bonus: 0.0,
            reasons: Vec::new(),
        };
    };

    let mover = fen.board[from_row][from_col];
    if mover == '.' {
        return RuleOutcome {
            bonus: 0.0,
            reasons: Vec::new(),
        };
    }

    let mut bonus = 0.0f32;
    let mut reasons = Vec::new();

    let captured = fen.board[to_row][to_col];
    let is_capture = captured != '.' && !same_side_piece(mover, captured);

    if is_promotion_move(uci_move) {
        bonus += config.promotion_bonus;
        reasons.push("rule_b_conversion_promotion");
    }

    if is_capture {
        let mover_value = piece_value(mover);
        let captured_value = piece_value(captured);
        let gain = captured_value - mover_value;

        if captured_value >= 5.0 || gain >= 2.0 {
            bonus += config.heavy_gain_bonus;
            reasons.push("rule_b_conversion_heavy_gain");
        } else if gain >= 0.0 || (material_advantage > 0.0 && captured_value >= 1.0) {
            bonus += config.favorable_capture_bonus;
            reasons.push("rule_b_conversion_favorable_capture");
        }
    }

    if let Some(board_after) = make_board_after_move(fen, uci_move) {
        if move_gives_check(&board_after, fen.side_to_move) && material_advantage > 0.0 {
            bonus += config.forcing_progress_bonus;
            reasons.push("rule_b_conversion_forcing_progress");
        }
    }

    RuleOutcome { bonus, reasons }
}

fn opening_tempo_rule(
    config: OpeningTempoRule,
    fen: &ParsedFen,
    context: &RerankContext,
    action: &Action,
    uci_move: &str,
) -> RuleOutcome {
    if context.ply > config.phase_ply_max {
        return RuleOutcome {
            bonus: 0.0,
            reasons: Vec::new(),
        };
    }

    let Action::Move { unit_id, .. } = action else {
        return RuleOutcome {
            bonus: 0.0,
            reasons: Vec::new(),
        };
    };

    let Some((from_row, from_col, _, _)) = uci_to_coords(uci_move) else {
        return RuleOutcome {
            bonus: 0.0,
            reasons: Vec::new(),
        };
    };

    let mover = fen.board[from_row][from_col];
    if mover == '.' {
        return RuleOutcome {
            bonus: 0.0,
            reasons: Vec::new(),
        };
    }

    let mut bonus = 0.0f32;
    let mut reasons = Vec::new();

    if context.last_own_unit_id == Some(*unit_id) && !is_castling_move(uci_move, mover) {
        bonus -= config.repeat_penalty;
        reasons.push("rule_c_opening_repeat_piece");
    }

    if is_castling_move(uci_move, mover) {
        bonus += config.castling_bonus;
        reasons.push("rule_c_opening_castling");
    }

    if is_simple_development_move(mover, from_row, from_col) {
        bonus += config.development_bonus;
        reasons.push("rule_c_opening_development");
    }

    RuleOutcome { bonus, reasons }
}

fn is_castling_move(uci_move: &str, mover: char) -> bool {
    mover.eq_ignore_ascii_case(&'k')
        && uci_move.len() >= 4
        && uci_move.as_bytes()[0].abs_diff(uci_move.as_bytes()[2]) == 2
}

fn is_simple_development_move(mover: char, from_row: usize, from_col: usize) -> bool {
    match mover {
        'N' => from_row == 7 && (from_col == 1 || from_col == 6),
        'B' => from_row == 7 && (from_col == 2 || from_col == 5),
        'n' => from_row == 0 && (from_col == 1 || from_col == 6),
        'b' => from_row == 0 && (from_col == 2 || from_col == 5),
        _ => false,
    }
}

fn parse_fen(fen: &str) -> Option<ParsedFen> {
    let mut parts = fen.split_whitespace();
    let board_part = parts.next()?;
    let side_to_move = parts.next()?.chars().next()?;

    if side_to_move != 'w' && side_to_move != 'b' {
        return None;
    }

    let mut board = [['.'; 8]; 8];
    let ranks: Vec<&str> = board_part.split('/').collect();
    if ranks.len() != 8 {
        return None;
    }

    for (row_idx, rank) in ranks.iter().enumerate() {
        let mut col_idx = 0usize;
        for ch in rank.chars() {
            if ch.is_ascii_digit() {
                let skip = ch.to_digit(10)? as usize;
                col_idx += skip;
            } else {
                if col_idx >= 8 {
                    return None;
                }
                board[row_idx][col_idx] = ch;
                col_idx += 1;
            }
        }
        if col_idx != 8 {
            return None;
        }
    }

    Some(ParsedFen {
        board,
        side_to_move,
    })
}

fn material_advantage_for_side_to_move(fen: &ParsedFen) -> f32 {
    material_advantage_for_side(fen, fen.side_to_move)
}

fn material_advantage_for_side(fen: &ParsedFen, side: char) -> f32 {
    let mut white = 0.0f32;
    let mut black = 0.0f32;

    for row in 0..8 {
        for col in 0..8 {
            let piece = fen.board[row][col];
            if piece == '.' {
                continue;
            }
            let value = piece_value(piece);
            if piece.is_ascii_uppercase() {
                white += value;
            } else {
                black += value;
            }
        }
    }

    if side == 'w' {
        white - black
    } else {
        black - white
    }
}

fn simplification_bonus(fen: &ParsedFen, uci_move: &str, material_advantage: f32) -> Option<f32> {
    let (from_row, from_col, to_row, to_col) = uci_to_coords(uci_move)?;
    let mover = fen.board[from_row][from_col];
    let captured = fen.board[to_row][to_col];

    if mover == '.' || captured == '.' {
        return None;
    }

    if same_side_piece(mover, captured) {
        return None;
    }

    let mover_value = piece_value(mover);
    let captured_value = piece_value(captured);

    if mover_value <= 0.0 || captured_value <= 0.0 {
        return None;
    }

    let mut bonus = 0.10f32;

    if captured_value >= mover_value {
        bonus += 0.30;
    } else if mover_value <= 3.0 && captured_value >= 1.0 {
        bonus += 0.12;
    } else if mover_value >= 5.0 && captured_value <= 1.0 {
        bonus -= 0.18;
    } else {
        bonus += 0.04;
    }

    let mover_lower = mover.to_ascii_lowercase();
    let captured_lower = captured.to_ascii_lowercase();

    if mover_lower == 'q' && captured_lower == 'q' {
        bonus += 0.25;
    } else if captured_lower == 'q' && material_advantage >= 5.0 {
        bonus += 0.12;
    }

    Some(bonus)
}

struct FinishBonus {
    bonus: f32,
    reasons: Vec<&'static str>,
}

fn is_finish_phase(fen: &ParsedFen, material_advantage: f32) -> bool {
    if material_advantage < NeuralAgent::finish_advantage_threshold() {
        return false;
    }

    let total_non_king_material = total_non_king_material(fen);
    let piece_count = piece_count(fen);

    total_non_king_material <= NeuralAgent::finish_total_material_max()
        || piece_count <= NeuralAgent::finish_piece_count_max()
}

fn total_non_king_material(fen: &ParsedFen) -> f32 {
    let mut total = 0.0f32;

    for row in 0..8 {
        for col in 0..8 {
            let piece = fen.board[row][col];
            if piece == '.' || piece.eq_ignore_ascii_case(&'k') {
                continue;
            }
            total += piece_value(piece);
        }
    }

    total
}

fn piece_count(fen: &ParsedFen) -> usize {
    let mut count = 0usize;

    for row in 0..8 {
        for col in 0..8 {
            if fen.board[row][col] != '.' {
                count += 1;
            }
        }
    }

    count
}

fn material_signature(fen: &ParsedFen) -> String {
    let mut white_q = 0usize;
    let mut white_r = 0usize;
    let mut white_b = 0usize;
    let mut white_n = 0usize;
    let mut white_p = 0usize;
    let mut black_q = 0usize;
    let mut black_r = 0usize;
    let mut black_b = 0usize;
    let mut black_n = 0usize;
    let mut black_p = 0usize;

    for row in 0..8 {
        for col in 0..8 {
            match fen.board[row][col] {
                'Q' => white_q += 1,
                'R' => white_r += 1,
                'B' => white_b += 1,
                'N' => white_n += 1,
                'P' => white_p += 1,
                'q' => black_q += 1,
                'r' => black_r += 1,
                'b' => black_b += 1,
                'n' => black_n += 1,
                'p' => black_p += 1,
                _ => {}
            }
        }
    }

    format!(
        "W:Q{}R{}B{}N{}P{}|B:Q{}R{}B{}N{}P{}",
        white_q, white_r, white_b, white_n, white_p, black_q, black_r, black_b, black_n, black_p
    )
}

fn contextual_profile_weight(profile: ContextualMoveProfile) -> f32 {
    match profile {
        ContextualMoveProfile::WinningEndgame => 3.0,
        ContextualMoveProfile::LosingEndgame => 2.0,
        ContextualMoveProfile::EqualEndgame => 1.5,
        ContextualMoveProfile::Middlegame => 1.0,
        ContextualMoveProfile::Opening => 0.7,
    }
}

fn contextual_profile_hook(
    engine: &Engine,
    parsed: &ParsedFen,
    action_moves: &[(Action, String)],
    phase_profile: ContextualMoveProfile,
    uci_move: &str,
    material_advantage: f32,
    has_tactical_candidate: bool,
) -> RuleOutcome {
    let mut bonus = 0.0f32;
    let mut reasons = Vec::new();

    let Some((from_row, from_col, to_row, to_col)) = uci_to_coords(uci_move) else {
        return RuleOutcome { bonus, reasons };
    };

    let mover = parsed.board[from_row][from_col];
    if mover == '.' {
        return RuleOutcome { bonus, reasons };
    }

    let captured = parsed.board[to_row][to_col];
    let is_capture = captured != '.' && !same_side_piece(mover, captured);
    let is_promotion = is_promotion_move(uci_move);

    let Some((action, _)) = action_moves
        .iter()
        .find(|(_, legal_mv)| legal_mv == uci_move)
    else {
        return RuleOutcome { bonus, reasons };
    };

    let mut sim = engine.clone();
    let Some(undo) = sim.simulate_action_for_search(engine.turn_manager.current_player, action)
    else {
        return RuleOutcome { bonus, reasons };
    };

    let enemy = opponent_player(engine.turn_manager.current_player);
    let enemy_moves_before = engine.legal_actions(enemy).len();
    let enemy_moves_after = sim.legal_actions(enemy).len();
    let enemy_moves_delta = enemy_moves_before as i32 - enemy_moves_after as i32;

    let repetition_before = sim
        .repetition_counts
        .get(&sim.to_fen())
        .copied()
        .unwrap_or(1) as i32;
    let board_after = parse_fen(&sim.to_fen());
    let gives_check = board_after
        .as_ref()
        .map(|after| move_gives_check(&after.board, parsed.side_to_move))
        .unwrap_or(false);

    let before_own_king = find_king(&parsed.board, parsed.side_to_move);
    let after_own_king = board_after
        .as_ref()
        .and_then(|after| find_king(&after.board, parsed.side_to_move));
    let before_enemy_king = find_king(&parsed.board, enemy_side(parsed.side_to_move));
    let after_enemy_king = board_after
        .as_ref()
        .and_then(|after| find_king(&after.board, enemy_side(parsed.side_to_move)));

    match phase_profile {
        ContextualMoveProfile::Opening => {
            if is_castling_move(uci_move, mover) {
                bonus += 0.18;
                reasons.push("profile_opening_castling");
            }

            if is_simple_development_move(mover, from_row, from_col) {
                bonus += 0.14;
                reasons.push("profile_opening_development");
            }

            if mover.eq_ignore_ascii_case(&'p')
                && (from_col == 3 || from_col == 4)
                && pawn_push_progress(parsed.side_to_move, from_row, to_row)
            {
                bonus += 0.10;
                reasons.push("profile_opening_center_pawn");
            }

            if mover.eq_ignore_ascii_case(&'p')
                && (from_col == 0 || from_col == 6 || from_col == 7)
                && pawn_push_progress(parsed.side_to_move, from_row, to_row)
                && from_row.abs_diff(to_row) == 2
                && !(gives_check || is_capture || is_promotion)
            {
                bonus -= 0.22;
                reasons.push("profile_opening_random_rook_pawn_push");
            }
        }
        ContextualMoveProfile::Middlegame | ContextualMoveProfile::EqualEndgame => {}
        ContextualMoveProfile::WinningEndgame => {
            if gives_check {
                bonus += 3.0;
                reasons.push("profile_winning_endgame_check");
            }

            if is_capture {
                bonus += 2.5;
                reasons.push("profile_winning_endgame_capture");
            }

            if is_promotion {
                bonus += 5.0;
                reasons.push("profile_winning_endgame_promotion");
            }

            if enemy_moves_delta > 0 {
                bonus += 1.5;
                reasons.push("profile_winning_endgame_reduce_enemy_moves");
            }

            if repetition_before >= 2 {
                bonus -= 5.0;
                reasons.push("profile_winning_endgame_repetition");
            }

            if material_advantage >= 6.0 {
                let no_progress_pressure = shared_no_progress_pressure(
                    engine.halfmove_clock,
                    engine.action_log.len(),
                    true,
                );
                if no_progress_pressure > 1 {
                    bonus -= 4.0;
                    reasons.push("profile_winning_endgame_no_progress");
                }
            }

            if sim.halfmove_clock >= 5 {
                bonus -= 3.0;
                reasons.push("profile_winning_endgame_no_capture_streak");
            }

            if mover.eq_ignore_ascii_case(&'k') {
                if let (Some(before_enemy), Some(before_own), Some(after_own), Some(after_enemy)) = (
                    before_enemy_king,
                    before_own_king,
                    after_own_king,
                    after_enemy_king,
                ) {
                    let before_distance = king_distance(before_own, before_enemy);
                    let after_distance = king_distance(after_own, after_enemy);
                    if !has_tactical_candidate && after_distance < before_distance {
                        bonus += 0.12;
                        reasons.push("profile_winning_endgame_king_activation");
                    } else if after_distance >= before_distance
                        && !gives_check
                        && !is_capture
                        && !is_promotion
                        && enemy_moves_delta <= 0
                    {
                        bonus -= 4.0;
                        reasons.push("profile_winning_endgame_king_shuffle");
                    }
                }
            }
        }
        ContextualMoveProfile::LosingEndgame => {
            if gives_check {
                bonus += 0.14;
                reasons.push("profile_losing_endgame_check");
            }

            if is_capture {
                bonus += 0.10;
                reasons.push("profile_losing_endgame_capture");
            }

            if is_promotion {
                bonus += 0.18;
                reasons.push("profile_losing_endgame_promotion");
            }

            if enemy_moves_delta < 0 {
                bonus += (-enemy_moves_delta) as f32 * 0.02;
                reasons.push("profile_losing_endgame_complication");
            }

            let before_passed = closest_passed_pawn_distance(parsed);
            if let Some(after) = board_after.as_ref() {
                let after_passed = closest_passed_pawn_distance(after);
                if after_passed < before_passed && before_passed >= 8 {
                    bonus += 0.12;
                    reasons.push("profile_losing_endgame_pawn_race");
                } else if before_passed >= after_passed {
                    bonus += 0.04;
                    reasons.push("profile_losing_endgame_pawn_race");
                }
            }

            if repetition_before >= 2 {
                bonus -= 0.05;
                reasons.push("profile_losing_endgame_repetition");
            }
        }
    }

    let _ = sim.undo_action_for_search(undo);
    RuleOutcome { bonus, reasons }
}

fn winning_endgame_move_filter(
    engine: &Engine,
    parsed: &ParsedFen,
    action_moves: &[(Action, String)],
    uci_move: &str,
    material_advantage: f32,
) -> MoveFilterOutcome {
    let Some((from_row, from_col, to_row, to_col)) = uci_to_coords(uci_move) else {
        return MoveFilterOutcome {
            rejected: true,
            reason: "invalid_uci",
        };
    };

    let mover = parsed.board[from_row][from_col];
    if mover == '.' {
        return MoveFilterOutcome {
            rejected: true,
            reason: "empty_from_square",
        };
    }

    let Some((action, _)) = action_moves
        .iter()
        .find(|(_, legal_mv)| legal_mv == uci_move)
    else {
        return MoveFilterOutcome {
            rejected: true,
            reason: "missing_action",
        };
    };

    let mut sim = engine.clone();
    let Some(undo) = sim.simulate_action_for_search(engine.turn_manager.current_player, action)
    else {
        return MoveFilterOutcome {
            rejected: true,
            reason: "simulate_failed",
        };
    };

    let after_fen = parse_fen(&sim.to_fen());
    let repeat_after = sim
        .repetition_counts
        .get(&sim.to_fen())
        .copied()
        .unwrap_or(1) as i32;

    let reason = if repeat_after >= 2 {
        Some("repetition")
    } else if sim.halfmove_clock >= 6 {
        Some("no_progress_streak")
    } else if let Some(after) = after_fen.as_ref() {
        let captured = parsed.board[to_row][to_col];
        let is_capture = captured != '.' && !same_side_piece(mover, captured);
        let is_promotion = is_promotion_move(uci_move);
        let gives_check = move_gives_check(&after.board, parsed.side_to_move);
        let enemy = opponent_player(engine.turn_manager.current_player);
        let enemy_moves_before = engine.legal_actions(enemy).len();
        let enemy_moves_after = sim.legal_actions(enemy).len();
        let material_after = material_advantage_for_side(after, parsed.side_to_move);
        let no_material_gain = material_after <= material_advantage + 0.01;
        let passed_before = closest_passed_pawn_distance(parsed);
        let passed_after = closest_passed_pawn_distance(after);
        let passed_pawn_advance = passed_after < passed_before;

        if !gives_check
            && !is_capture
            && !is_promotion
            && enemy_moves_after >= enemy_moves_before
            && no_material_gain
            && !passed_pawn_advance
        {
            Some("quiet_no_progress")
        } else {
            None
        }
    } else {
        None
    };

    let _ = sim.undo_action_for_search(undo);

    MoveFilterOutcome {
        rejected: reason.is_some(),
        reason: reason.unwrap_or("kept"),
    }
}

fn has_tactical_profile_candidate(
    engine: &Engine,
    parsed: &ParsedFen,
    action_moves: &[(Action, String)],
    phase_profile: ContextualMoveProfile,
    material_advantage: f32,
) -> bool {
    if !matches!(phase_profile, ContextualMoveProfile::WinningEndgame) {
        return false;
    }

    for (_, mv) in action_moves {
        let outcome = contextual_profile_hook(
            engine,
            parsed,
            action_moves,
            phase_profile,
            mv,
            material_advantage,
            false,
        );
        let has_tactical = outcome.reasons.iter().any(|reason| {
            reason.contains("check") || reason.contains("capture") || reason.contains("promotion")
        });
        if has_tactical {
            return true;
        }
    }

    false
}

fn finish_bonus(fen: &ParsedFen, uci_move: &str, material_advantage: f32) -> FinishBonus {
    let Some((from_row, from_col, to_row, to_col)) = uci_to_coords(uci_move) else {
        return FinishBonus {
            bonus: 0.0,
            reasons: Vec::new(),
        };
    };

    let mover = fen.board[from_row][from_col];
    if mover == '.' {
        return FinishBonus {
            bonus: 0.0,
            reasons: Vec::new(),
        };
    }

    let mut bonus = 0.0f32;
    let mut reasons = Vec::new();

    let captured = fen.board[to_row][to_col];
    let is_capture = captured != '.' && !same_side_piece(mover, captured);
    let is_promotion = is_promotion_move(uci_move);

    if is_capture {
        let captured_value = piece_value(captured);
        bonus += NeuralAgent::finish_capture_bonus() + captured_value * 0.05;
        reasons.push("finish_capture");
    }

    if is_promotion {
        bonus += NeuralAgent::finish_promotion_bonus();
        reasons.push("finish_promotion");
    }

    let Some(board_after) = make_board_after_move(fen, uci_move) else {
        return FinishBonus { bonus, reasons };
    };

    let gives_check = move_gives_check(&board_after, fen.side_to_move);
    if gives_check {
        bonus += NeuralAgent::finish_check_bonus();
        reasons.push("finish_check");
    }

    if preserves_clear_advantage(&board_after, fen.side_to_move, material_advantage) {
        bonus += NeuralAgent::finish_hold_advantage_bonus();
        reasons.push("finish_hold_advantage");
    }

    let enemy_side = enemy_side(fen.side_to_move);
    let before_enemy_king = find_king(&fen.board, enemy_side);
    let after_enemy_king = find_king(&board_after, enemy_side);

    if mover.eq_ignore_ascii_case(&'k') {
        if let (Some(before_enemy), Some(before_own), Some(after_enemy), Some(after_own)) = (
            before_enemy_king,
            find_king(&fen.board, fen.side_to_move),
            after_enemy_king,
            find_king(&board_after, fen.side_to_move),
        ) {
            let before_dist = king_distance(before_own, before_enemy);
            let after_dist = king_distance(after_own, after_enemy);
            if after_dist < before_dist {
                bonus += NeuralAgent::finish_king_approach_bonus();
                reasons.push("finish_king_approach");
            }
        }
    }

    let before_escape = king_escape_count(&fen.board, enemy_side);
    let after_escape = king_escape_count(&board_after, enemy_side);
    if after_escape < before_escape {
        let reduction = (before_escape - after_escape) as f32;
        bonus += reduction * NeuralAgent::finish_escape_reduction_bonus();
        reasons.push("finish_reduce_escapes");
    }

    if gives_check && after_escape == 0 {
        bonus += NeuralAgent::finish_net_bonus();
        reasons.push("finish_net");
    }

    if let Some(enemy_king) = after_enemy_king {
        let moved_piece_after = board_after[to_row][to_col];

        let before_edge = before_enemy_king.map(king_edge_distance).unwrap_or(7);
        let after_edge = king_edge_distance(enemy_king);
        if after_edge < before_edge {
            bonus += NeuralAgent::finish_corner_bonus();
            reasons.push("finish_push_edge");
        }

        if king_edge_distance(enemy_king) <= 1
            && square_attacked_by_side(&board_after, fen.side_to_move, enemy_king)
        {
            bonus += NeuralAgent::finish_corner_bonus() * 0.5;
            reasons.push("finish_edge_pressure");
        }

        if (moved_piece_after.eq_ignore_ascii_case(&'q')
            || moved_piece_after.eq_ignore_ascii_case(&'r'))
            && attacks_square(&board_after, (to_row, to_col), enemy_king)
        {
            bonus += NeuralAgent::finish_corner_bonus() * 0.75;
            reasons.push("finish_boxing");
        }
    }

    if !is_capture && !is_promotion && !gives_check {
        bonus -= NeuralAgent::finish_quiet_penalty();
        reasons.push("finish_quiet_penalty");
    }

    FinishBonus { bonus, reasons }
}

fn preserves_clear_advantage(
    board_after: &[[char; 8]; 8],
    side_to_move: char,
    baseline_advantage: f32,
) -> bool {
    let after_advantage = material_advantage_for_board(board_after, side_to_move);
    after_advantage >= baseline_advantage - 0.5
}

fn material_advantage_for_board(board: &[[char; 8]; 8], side_to_move: char) -> f32 {
    let mut white = 0.0f32;
    let mut black = 0.0f32;

    for row in 0..8 {
        for col in 0..8 {
            let piece = board[row][col];
            if piece == '.' {
                continue;
            }
            let value = piece_value(piece);
            if piece.is_ascii_uppercase() {
                white += value;
            } else {
                black += value;
            }
        }
    }

    if side_to_move == 'w' {
        white - black
    } else {
        black - white
    }
}

fn is_promotion_move(uci_move: &str) -> bool {
    uci_move.len() == 5
}

fn enemy_side(side_to_move: char) -> char {
    if side_to_move == 'w' {
        'b'
    } else {
        'w'
    }
}

fn make_board_after_move(fen: &ParsedFen, uci_move: &str) -> Option<[[char; 8]; 8]> {
    let (from_row, from_col, to_row, to_col) = uci_to_coords(uci_move)?;
    let mut board = fen.board;
    let mover = board[from_row][from_col];

    if mover == '.' {
        return None;
    }

    board[from_row][from_col] = '.';

    let mut placed_piece = mover;

    if is_promotion_move(uci_move) {
        let promotion = uci_move.chars().nth(4)?;
        placed_piece = if fen.side_to_move == 'w' {
            promotion.to_ascii_uppercase()
        } else {
            promotion.to_ascii_lowercase()
        };
    }

    if mover.eq_ignore_ascii_case(&'k') && from_col.abs_diff(to_col) == 2 {
        if to_col == 6 {
            let rook = board[from_row][7];
            board[from_row][7] = '.';
            board[from_row][5] = rook;
        } else if to_col == 2 {
            let rook = board[from_row][0];
            board[from_row][0] = '.';
            board[from_row][3] = rook;
        }
    }

    if mover.eq_ignore_ascii_case(&'p') && from_col != to_col && board[to_row][to_col] == '.' {
        let capture_row = if fen.side_to_move == 'w' {
            to_row + 1
        } else {
            to_row.saturating_sub(1)
        };
        if capture_row < 8 {
            board[capture_row][to_col] = '.';
        }
    }

    board[to_row][to_col] = placed_piece;
    Some(board)
}

fn find_king(board: &[[char; 8]; 8], side: char) -> Option<(usize, usize)> {
    let target = if side == 'w' { 'K' } else { 'k' };

    for row in 0..8 {
        for col in 0..8 {
            if board[row][col] == target {
                return Some((row, col));
            }
        }
    }

    None
}

fn move_gives_check(board: &[[char; 8]; 8], side_to_move: char) -> bool {
    let Some(enemy_king) = find_king(board, enemy_side(side_to_move)) else {
        return false;
    };

    square_attacked_by_side(board, side_to_move, enemy_king)
}

fn square_attacked_by_side(
    board: &[[char; 8]; 8],
    attacking_side: char,
    target: (usize, usize),
) -> bool {
    for row in 0..8 {
        for col in 0..8 {
            let piece = board[row][col];
            if piece == '.' {
                continue;
            }

            if attacking_side == 'w' && !piece.is_ascii_uppercase() {
                continue;
            }

            if attacking_side == 'b' && !piece.is_ascii_lowercase() {
                continue;
            }

            if attacks_square(board, (row, col), target) {
                return true;
            }
        }
    }

    false
}

fn attacks_square(board: &[[char; 8]; 8], from: (usize, usize), to: (usize, usize)) -> bool {
    if from == to {
        return false;
    }

    let piece = board[from.0][from.1];
    if piece == '.' {
        return false;
    }

    let row_delta = to.0 as isize - from.0 as isize;
    let col_delta = to.1 as isize - from.1 as isize;
    let abs_row = row_delta.abs();
    let abs_col = col_delta.abs();

    match piece.to_ascii_lowercase() {
        'p' => {
            if piece.is_ascii_uppercase() {
                row_delta == -1 && abs_col == 1
            } else {
                row_delta == 1 && abs_col == 1
            }
        }
        'n' => (abs_row == 2 && abs_col == 1) || (abs_row == 1 && abs_col == 2),
        'b' => abs_row == abs_col && path_clear(board, from, to),
        'r' => (row_delta == 0 || col_delta == 0) && path_clear(board, from, to),
        'q' => {
            ((abs_row == abs_col) || row_delta == 0 || col_delta == 0)
                && path_clear(board, from, to)
        }
        'k' => abs_row <= 1 && abs_col <= 1,
        _ => false,
    }
}

fn path_clear(board: &[[char; 8]; 8], from: (usize, usize), to: (usize, usize)) -> bool {
    if from == to {
        return false;
    }

    let row_step = (to.0 as isize - from.0 as isize).signum();
    let col_step = (to.1 as isize - from.1 as isize).signum();

    let mut row = from.0 as isize + row_step;
    let mut col = from.1 as isize + col_step;

    while (row as usize, col as usize) != to {
        if row < 0 || col < 0 || row >= 8 || col >= 8 {
            return false;
        }

        if board[row as usize][col as usize] != '.' {
            return false;
        }

        row += row_step;
        col += col_step;
    }

    true
}

fn king_distance(a: (usize, usize), b: (usize, usize)) -> usize {
    a.0.abs_diff(b.0).max(a.1.abs_diff(b.1))
}

fn king_edge_distance(pos: (usize, usize)) -> usize {
    let row = pos.0;
    let col = pos.1;
    row.min(7 - row).min(col.min(7 - col))
}

fn king_escape_count(board: &[[char; 8]; 8], side: char) -> usize {
    let Some(king_pos) = find_king(board, side) else {
        return 0;
    };

    let mut count = 0usize;
    let enemy = enemy_side(side);

    for row_delta in -1isize..=1 {
        for col_delta in -1isize..=1 {
            if row_delta == 0 && col_delta == 0 {
                continue;
            }

            let next_row = king_pos.0 as isize + row_delta;
            let next_col = king_pos.1 as isize + col_delta;

            if next_row < 0 || next_col < 0 || next_row >= 8 || next_col >= 8 {
                continue;
            }

            let target = (next_row as usize, next_col as usize);
            let occupant = board[target.0][target.1];

            if occupant != '.' && is_piece_owned_by_side(occupant, side) {
                continue;
            }

            if !square_attacked_by_side(board, enemy, target) {
                count += 1;
            }
        }
    }

    count
}

fn is_piece_owned_by_side(piece: char, side: char) -> bool {
    (side == 'w' && piece.is_ascii_uppercase()) || (side == 'b' && piece.is_ascii_lowercase())
}

struct AntiStallBonus {
    bonus: f32,
    reasons: Vec<&'static str>,
}

fn anti_stall_bonus(fen: &ParsedFen, uci_move: &str, material_advantage: f32) -> AntiStallBonus {
    let Some((from_row, from_col, to_row, to_col)) = uci_to_coords(uci_move) else {
        return AntiStallBonus {
            bonus: 0.0,
            reasons: Vec::new(),
        };
    };

    let mover = fen.board[from_row][from_col];
    if mover == '.' {
        return AntiStallBonus {
            bonus: 0.0,
            reasons: Vec::new(),
        };
    }

    let mut bonus = 0.0f32;
    let mut reasons = Vec::new();

    let captured = fen.board[to_row][to_col];
    let is_capture = captured != '.' && !same_side_piece(mover, captured);

    if is_capture {
        bonus += NeuralAgent::anti_stall_capture_bonus();
        reasons.push("anti_stall_capture");
    }

    let Some(board_after) = make_board_after_move(fen, uci_move) else {
        return AntiStallBonus { bonus, reasons };
    };

    let gives_check = move_gives_check(&board_after, fen.side_to_move);
    if gives_check {
        bonus += NeuralAgent::anti_stall_check_bonus();
        reasons.push("anti_stall_check");
    }

    let pawn_pushes =
        mover.eq_ignore_ascii_case(&'p') && pawn_push_progress(fen.side_to_move, from_row, to_row);
    if pawn_pushes {
        bonus += NeuralAgent::anti_stall_pawn_push_bonus();
        reasons.push("anti_stall_pawn_push");
    }

    if mover.eq_ignore_ascii_case(&'k') && total_non_king_material(fen) <= 18.0 {
        if let (Some(before_enemy), Some(before_own), Some(after_enemy), Some(after_own)) = (
            find_king(&fen.board, enemy_side(fen.side_to_move)),
            find_king(&fen.board, fen.side_to_move),
            find_king(&board_after, enemy_side(fen.side_to_move)),
            find_king(&board_after, fen.side_to_move),
        ) {
            let before_dist = king_distance(before_own, before_enemy);
            let after_dist = king_distance(after_own, after_enemy);
            if after_dist < before_dist {
                bonus += NeuralAgent::anti_stall_king_approach_bonus();
                reasons.push("anti_stall_king_approach");
            } else if after_dist > before_dist {
                bonus -= NeuralAgent::anti_stall_retreat_penalty();
                reasons.push("anti_stall_king_retreat");
            }
        }
    }

    let before_escape = king_escape_count(&fen.board, enemy_side(fen.side_to_move));
    let after_escape = king_escape_count(&board_after, enemy_side(fen.side_to_move));
    if after_escape < before_escape {
        bonus += (before_escape - after_escape) as f32 * 0.05;
        reasons.push("anti_stall_reduce_escapes");
    }

    if material_advantage >= NeuralAgent::anti_stall_advantage_threshold()
        && preserves_clear_advantage(&board_after, fen.side_to_move, material_advantage)
    {
        bonus += 0.05;
        reasons.push("anti_stall_keep_pressure");
    }

    if !is_capture && !gives_check && !pawn_pushes {
        bonus -= NeuralAgent::anti_stall_quiet_penalty();
        reasons.push("anti_stall_quiet_penalty");
    }

    AntiStallBonus { bonus, reasons }
}

fn pawn_push_progress(side_to_move: char, from_row: usize, to_row: usize) -> bool {
    if side_to_move == 'w' {
        to_row < from_row
    } else {
        to_row > from_row
    }
}

fn uci_to_coords(uci_move: &str) -> Option<(usize, usize, usize, usize)> {
    if uci_move.len() < 4 {
        return None;
    }

    let bytes = uci_move.as_bytes();

    let from_file = bytes[0];
    let from_rank = bytes[1];
    let to_file = bytes[2];
    let to_rank = bytes[3];

    if !(b'a'..=b'h').contains(&from_file)
        || !(b'1'..=b'8').contains(&from_rank)
        || !(b'a'..=b'h').contains(&to_file)
        || !(b'1'..=b'8').contains(&to_rank)
    {
        return None;
    }

    let from_col = (from_file - b'a') as usize;
    let from_row = (b'8' - from_rank) as usize;
    let to_col = (to_file - b'a') as usize;
    let to_row = (b'8' - to_rank) as usize;

    Some((from_row, from_col, to_row, to_col))
}

fn piece_value(piece: char) -> f32 {
    match piece.to_ascii_lowercase() {
        'p' => 1.0,
        'n' => 3.0,
        'b' => 3.0,
        'r' => 5.0,
        'q' => 9.0,
        _ => 0.0,
    }
}

fn same_side_piece(a: char, b: char) -> bool {
    (a.is_ascii_uppercase() && b.is_ascii_uppercase())
        || (a.is_ascii_lowercase() && b.is_ascii_lowercase())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn neural_agent_still_owns_final_selection_entrypoint() {
        let _selector: fn(&NeuralAgent, &Engine, u32, &[Action]) -> Action =
            NeuralAgent::select_action;

        assert_eq!(NeuralAgent::name(), "neural");
    }

    #[test]
    fn neural_agent_private_fen_helpers_preserve_board_material_and_signature() {
        let parsed = parse_fen("8/8/8/3p4/4Q3/8/8/4K2k w - - 0 1").expect("valid test FEN");

        assert_eq!(parsed.side_to_move, 'w');
        assert_eq!(parsed.board[3][3], 'p');
        assert_eq!(parsed.board[4][4], 'Q');
        assert_eq!(piece_count(&parsed), 4);
        assert_eq!(total_non_king_material(&parsed), 10.0);
        assert_eq!(material_advantage_for_side_to_move(&parsed), 8.0);
        assert_eq!(material_signature(&parsed), "W:Q1R0B0N0P0|B:Q0R0B0N0P1");
    }

    #[test]
    fn neural_agent_private_move_helpers_preserve_uci_and_board_boundaries() {
        let parsed = parse_fen("7k/4P3/8/8/8/8/8/4K3 w - - 0 1").expect("valid test FEN");

        assert_eq!(uci_to_coords("e7e8q"), Some((1, 4, 0, 4)));
        assert_eq!(uci_to_coords("z9z1"), None);

        let board_after =
            make_board_after_move(&parsed, "e7e8q").expect("promotion board should build");
        assert_eq!(board_after[1][4], '.');
        assert_eq!(board_after[0][4], 'Q');

        assert!(same_side_piece('Q', 'P'));
        assert!(same_side_piece('q', 'p'));
        assert!(!same_side_piece('Q', 'p'));
    }

    #[test]
    fn neural_agent_private_scoring_helpers_keep_characterized_boundaries() {
        let parsed = parse_fen("8/8/8/3q4/4Q3/8/8/4K2k w - - 0 1").expect("valid test FEN");

        let queen_trade = simplification_bonus(&parsed, "e4d5", 0.0)
            .expect("queen capture should have simplification score");
        assert!((queen_trade - 0.65).abs() < f32::EPSILON);
        assert_eq!(simplification_bonus(&parsed, "e4e5", 0.0), None);

        assert_eq!(
            contextual_profile_weight(ContextualMoveProfile::WinningEndgame),
            3.0
        );
        assert_eq!(
            contextual_profile_weight(ContextualMoveProfile::Opening),
            0.7
        );
        assert_eq!(piece_value('q'), 9.0);
        assert_eq!(piece_value('k'), 0.0);
    }
}
