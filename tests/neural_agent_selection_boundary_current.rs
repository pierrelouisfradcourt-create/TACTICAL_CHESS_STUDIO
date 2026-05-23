fn read_repo_file(path: &str) -> String {
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    std::fs::read_to_string(root.join(path))
        .unwrap_or_else(|err| panic!("expected to read {path}: {err}"))
}

fn assert_contains_all(source: &str, needles: &[&str]) {
    for needle in needles {
        assert!(
            source.contains(needle),
            "expected source to contain stable boundary marker: {needle}"
        );
    }
}

fn extracted_neural_module_paths() -> [&'static str; 8] {
    [
        "src/agents/neural_bridge.rs",
        "src/agents/neural_config.rs",
        "src/agents/neural_context.rs",
        "src/agents/neural_fallback.rs",
        "src/agents/neural_legal.rs",
        "src/agents/neural_protocol.rs",
        "src/agents/neural_selection.rs",
        "src/agents/neural_telemetry.rs",
    ]
}

#[test]
fn final_selection_remains_owned_by_neural_agent_source() {
    let neural_agent = read_repo_file("src/agents/neural_agent.rs");

    assert_contains_all(
        &neural_agent,
        &[
            "pub fn select_action(&self, engine: &Engine, _player: u32, actions: &[Action]) -> Action",
            "let selection = select_move_with_rerank(",
            "selected_action_for_uci(&action_moves, &selection.selected_move)",
            "NeuralSelectionOutcome::new(",
            ".into_action()",
            "return action;",
            "let fallback_action = fallback_action_from_legal(&action_moves, actions);",
            "fallback_action",
        ],
    );

    for path in extracted_neural_module_paths() {
        let source = read_repo_file(path);
        assert!(
            !source.contains("pub fn select_action(")
                && !source.contains("fn select_action(")
                && !source.contains("struct MoveSelection"),
            "{path} should remain extracted support code, not final action selection owner"
        );
    }
}

#[test]
fn fallback_labels_live_in_fallback_module_and_branch_bodies_remain_in_neural_agent() {
    let neural_fallback = read_repo_file("src/agents/neural_fallback.rs");
    let neural_agent = read_repo_file("src/agents/neural_agent.rs");

    assert_contains_all(
        &neural_fallback,
        &[
            "pub(crate) enum NeuralFallbackReason",
            "NoUciMoves",
            "PredictedMoveNotFound",
            "PythonBridgeFailed",
            "\"no_uci_moves\"",
            "\"predicted_move_not_found\"",
            "\"python_bridge_failed\"",
            "pub(crate) enum NeuralSelectedSource",
            "\"fallback_legal_first\"",
            "pub(crate) enum NeuralRerankFallbackCause",
            "\"purity_violation_strict\"",
            "\"parsed_fen_unavailable\"",
            "\"filtered_candidate_list_empty_use_predicted\"",
            "\"filtered_candidate_list_empty\"",
            "\"empty_candidate_list_use_predicted\"",
            "\"empty_candidate_list\"",
        ],
    );

    assert_contains_all(
        &neural_agent,
        &[
            "NeuralFallbackReason::NoUciMoves.runtime_line()",
            "NeuralFallbackReason::PredictedMoveNotFound.runtime_line()",
            "NeuralFallbackReason::PythonBridgeFailed.runtime_line()",
            ".fallback_events",
            ".fallback_no_uci_moves",
            ".fallback_predicted_move_not_found",
            ".fallback_python_bridge_failed",
            "NEURAL_MOVE_RUNTIME|status=fallback|reason={}|attempts=0|legal_moves={}|selected_source={}|selected_policy_rank=-1|policy_selected_mismatch_flag=0",
            "NEURAL_MOVE_RUNTIME|status=fallback|reason={}|profile_selected={}|attempts={}|legal_moves={}|policy_index={}|selected_source={}|selected_policy_rank=-1|policy_selected_mismatch_flag=1",
            "NEURAL_MOVE_RUNTIME|status=fallback|reason={}|attempts={}|legal_moves={}|selected_source={}|selected_policy_rank=-1|policy_selected_mismatch_flag=0",
            "NEURAL_BENCHMARK_INVALID|reason=no_uci_moves|purity_mode=enabled",
            "NEURAL_BENCHMARK_INVALID|reason=predicted_move_not_found_purity|purity_mode=enabled",
            "NEURAL_BENCHMARK_INVALID|reason=bridge_failed_purity|purity_mode=enabled",
            "NEURAL_BENCHMARK_INVALID|reason=final_fallback_purity|purity_mode=enabled",
        ],
    );
}

#[test]
fn rerank_selection_and_scoring_formulas_remain_in_neural_agent() {
    let neural_agent = read_repo_file("src/agents/neural_agent.rs");

    assert_contains_all(
        &neural_agent,
        &[
            "fn select_move_with_rerank(",
            "let predicted_base = NeuralAgent::predicted_base_score();",
            "predicted_base * 0.7f32.powi((idx + 1) as i32)",
            "score += retrieval_delta;",
            "score += finish_mode_score.total;",
            "score += pressure_score.total;",
            "score += anti_stall.bonus;",
            "score += tactical.final_score as f32 * 0.0025;",
            "score -= reply_scan.penalty as f32 * 0.0025;",
            "score += safety.penalty as f32;",
            "score += modular.bonus;",
            "score += memory.bonus;",
            "score += contextual_after;",
            "fn finish_mode_score(",
            "fn pressure_mode_score(",
            "fn trade_score_delta(",
            "fn apply_memory_hints(",
            "fn apply_modular_rules(",
            "fn contextual_profile_hook(",
            "fn winning_endgame_move_filter(",
            "fn finish_bonus(",
            "fn anti_stall_bonus(",
            "RERANK_COST|moves={}|iterations={}|time_ms={:.3}|time_per_move={:.3}|base_scoring_ms={:.3}|contextual_scoring_ms={:.3}",
            "RERANK_TRACE|moves={}|best_score={:.4}|avg_score={:.4}|time_ms={}",
        ],
    );

    for path in extracted_neural_module_paths() {
        let source = read_repo_file(path);
        assert!(
            !source.contains("fn select_move_with_rerank("),
            "{path} should not own active rerank final selection"
        );
    }
}

#[test]
fn telemetry_counters_live_in_telemetry_module_and_runtime_strings_remain_in_neural_agent() {
    let neural_telemetry = read_repo_file("src/agents/neural_telemetry.rs");
    let neural_agent = read_repo_file("src/agents/neural_agent.rs");

    assert_contains_all(
        &neural_telemetry,
        &[
            "pub(crate) struct NeuralRuntimeCounters",
            "pub(crate) static NEURAL_RUNTIME_COUNTERS: NeuralRuntimeCounters = NeuralRuntimeCounters::new();",
            "pub struct NeuralRuntimeStats",
            "pub(crate) fn emit_runtime_line(line: &str)",
            "pub(crate) fn log_bridge_ok(phase: &str)",
            "pub(crate) fn log_bridge_retry(reason: &str)",
            "pub(crate) fn log_bridge_fail(phase: &str, reason: &str)",
            "fallback_events",
            "fallback_no_uci_moves",
            "fallback_predicted_move_not_found",
            "fallback_python_bridge_failed",
            "invalid_python_predictions",
            "rerank_salvages",
            "shortlist_used_count",
            "full_legal_fallback_count",
            "purity_violations",
        ],
    );

    assert_contains_all(
        &neural_agent,
        &[
            "NEURAL_INVALID_PREDICTION|predicted={}|legal_moves={}",
            "NEURAL_RERANK_POOL_FALLBACK|cause={}|legal_moves={}|candidate_moves={}",
            "NEURAL_MOVE_RUNTIME|status=success|reason={}|profile_selected={}|attempts={}|legal_moves={}|policy_index={}|selected_source={}|selected_policy_rank={}|policy_selected_mismatch_flag={}|rerank_pool={}|rerank_pool_size={}|rerank_fallback_cause={}",
            "NEURAL_MOVE_RUNTIME|status=salvaged|reason=invalid_python_prediction|profile_selected={}|attempts={}|legal_moves={}|policy_index={}|selected={}|selected_source={}|selected_policy_rank={}|policy_selected_mismatch_flag={}|rerank_pool={}|rerank_pool_size={}|rerank_fallback_cause={}",
            "NEURAL_MOVE_RUNTIME|status=reranked|reason={}|profile_selected={}|attempts={}|legal_moves={}|policy_index={}|selected={}|selected_source={}|selected_policy_rank={}|policy_selected_mismatch_flag={}|rerank_pool={}|rerank_pool_size={}|rerank_fallback_cause={}",
            "MOVE_DIAG|source=neural|phase={}|band={}|plan={}|selected={}|reason={}|finish={}|pressure={}|profile_selected={}|profile_weight={:.1}|contextual_before={:.3}|contextual_after={:.3}|material_cp={}|own_moves={}|enemy_moves={}|repetition_pressure={}|passed_pawn_distance={}|no_progress_pressure={}|enemy_moves_delta={}|passed_pawn_delta={}|repeat={:.3}",
            "RETRIEVAL|matches={}|bias_applied={}|phase={}|piece_count_bucket={}|good_moves={}|bad_moves={}|selected={}|selected_good_hits={}|selected_bad_hits={}|selected_bias={:.3}|lookup_us={}|status={}",
        ],
    );
}

#[test]
fn legal_conversion_helpers_live_in_neural_legal_and_are_consumed_by_neural_agent() {
    let neural_legal = read_repo_file("src/agents/neural_legal.rs");
    let neural_agent = read_repo_file("src/agents/neural_agent.rs");

    assert_contains_all(
        &neural_legal,
        &[
            "pub(crate) type LegalActionMove = (Action, String);",
            "pub(crate) fn action_moves_from_legal_actions(",
            "pub(crate) fn uci_moves(action_moves: &[LegalActionMove]) -> Vec<String>",
            "pub(crate) fn is_legal_uci(legal_moves: &[String], uci_move: &str) -> bool",
            "pub(crate) fn selected_action_for_uci(",
            "pub(crate) fn fallback_action_from_legal(",
            "pub(crate) fn legal_candidate_shortlist(",
            "pub(crate) fn selected_policy_rank_for_move(",
        ],
    );

    assert_contains_all(
        &neural_agent,
        &[
            "use crate::agents::neural_legal::{",
            "action_moves_from_legal_actions, fallback_action_from_legal, is_legal_uci,",
            "legal_candidate_shortlist, selected_action_for_uci, selected_policy_rank_for_move, uci_moves,",
            "let action_moves = action_moves_from_legal_actions(engine, actions);",
            "let moves = uci_moves(&action_moves);",
            "let python_pred_is_legal = is_legal_uci(&moves, &best);",
            "selected_action_for_uci(&action_moves, &selection.selected_move)",
            "let fallback_action = fallback_action_from_legal(&action_moves, actions);",
            "let pool = legal_candidate_shortlist(",
            "selected_policy_rank_for_move(candidate_moves, &best_move, predicted_move)",
        ],
    );

    assert!(
        !neural_agent.contains("fn action_moves_from_legal_actions(")
            && !neural_agent.contains("fn selected_action_for_uci(")
            && !neural_agent.contains("fn fallback_action_from_legal(")
            && !neural_agent.contains("fn legal_candidate_shortlist("),
        "neural_agent.rs should consume legal helpers without re-owning their definitions"
    );
}
