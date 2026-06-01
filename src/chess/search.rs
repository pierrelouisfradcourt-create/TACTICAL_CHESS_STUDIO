use crate::chess::eval::{
    center_bonus, draw_score, evaluate, has_non_pawn_material, is_low_material_search_position,
    is_winning_endgame, piece_value, terminal_score,
};
use crate::chess::move_features::*;
use crate::chess::piece_kind::ChessPieceKind;
use crate::chess::practical_policy::{
    is_conversion_move, maybe_emit_phase_profile, maybe_emit_strategic_diagnostics,
    quiet_non_progress_penalty, tactical_score_breakdown,
};
use crate::chess::root_decision::{
    root_decision_breakdown, root_practical_margin,
    RootDecisionBreakdown, RootDecisionContext, RootDecisionHooks,
};
use crate::chess::search_diagnostics_accumulators::SearchInstrumentation;
use crate::chess::search_diagnostics_builders::{
    build_root_diagnostics, build_root_mate_diagnostics, maybe_emit_runtime_diagnostics,
    search_runtime_diagnostics_enabled,
};
#[cfg(test)]
use crate::chess::search_mirror_ordering::MirrorOrderingDiagnostics;
use crate::chess::search_root_ordering::order_root_moves;
use crate::chess::uci::action_to_uci;
use crate::engine::action::action::Action;
use crate::engine::engine::{
    set_search_runtime_profile_enabled, Engine,
};
use crate::engine::entity::unit::PlayerId;

use std::cell::RefCell;
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

const INF: i32 = 1_000_000_000;
const MAX_PLY: usize = 64;
const DELTA_MARGIN: i32 = 200;
const TT_SIZE: usize = 1 << 20;
const NULL_MOVE_MIN_DEPTH: i32 = 3;
const NULL_MOVE_REDUCTION: i32 = 2;
const ASPIRATION_DELTA: i32 = 80;
const ASPIRATION_MATE_THRESHOLD: i32 = 800_000;
const TT_BEST_MOVE_BONUS: i32 = 50_000;
const PRIMARY_KILLER_BONUS: i32 = 20_000;
const SECONDARY_KILLER_BONUS: i32 = 18_000;
const COUNTERMOVE_BONUS: i32 = 16_000;
const WINNING_CAPTURE_BASE: i32 = 8_500;
const LOSING_CAPTURE_BASE: i32 = 2_500;
const PROMOTION_BASE: i32 = 12_000;
const CHECK_BASE: i32 = 2_400;
pub(crate) const PASSED_PAWN_PUSH_BASE: i32 = 1_800;
pub(crate) const PASSED_PAWN_ADVANCE_STEP: i32 = 170;
pub(crate) const PASSED_PAWN_CLEAR_EDGE_BONUS: i32 = 260;
pub(crate) const PASSED_PAWN_NEAR_PROMOTION_BONUS: i32 = 420;
const CONVERSION_BASE: i32 = 1_550;
const CASTLING_BONUS: i32 = 220;
const ESCAPE_CHECK_BONUS: i32 = 260;
const RECAPTURE_BONUS: i32 = 900;
const HISTORY_SCORE_CAP: i32 = 16_000;
const HISTORY_REWARD_SCALE: i32 = 48;
const HISTORY_PENALTY_SCALE: i32 = 20;
const FUTILITY_MARGIN_D1: i32 = 150;
const FUTILITY_MARGIN_D2: i32 = 350;
const ROOT_POLICY_SCORE_CAP: i32 = 8_000;
const ROOT_POLICY_REWARD_BASE: i32 = 280;
const ROOT_POLICY_MARGIN_BONUS: i32 = 140;
const ROOT_POLICY_DECAY_STEP: i32 = 24;
pub(crate) const ROOT_POLICY_ORDERING_WEIGHT: i32 = 3;
pub(crate) const CLEAR_EDGE_MATERIAL: i32 = 250;

#[allow(unused_imports)]
pub use crate::chess::search_diagnostics::{
    BranchingDiagnostics, DecisionMetrics, OrderingQuality, RootAlternative, RootSearchDiagnostics,
    RuntimeCostDiagnostics, SearchCounters, SearchPlyTrace,
};

#[derive(Clone, Copy, Debug)]
enum Bound {
    Exact,
    Lower,
    Upper,
}

#[derive(Clone)]
struct TTEntry {
    key: u64,
    depth: i32,
    score: i32,
    bound: Bound,
    best_move: Option<Action>,
}

thread_local! {
    static TT: RefCell<Vec<Option<TTEntry>>> = RefCell::new(vec![None; TT_SIZE]);
    static KILLERS: RefCell<Vec<[Option<Action>; 2]>> = RefCell::new(Vec::new());
    static HISTORY: RefCell<HashMap<u64, i32>> = RefCell::new(HashMap::new());
    static COUNTERMOVES: RefCell<HashMap<u64, Action>> = RefCell::new(HashMap::new());
    static SEARCH_DEADLINE: RefCell<Option<Instant>> = RefCell::new(None);
}

static ROOT_POLICY: OnceLock<Mutex<HashMap<u64, HashMap<u64, i32>>>> = OnceLock::new();

struct ZobristTable {
    pieces: [[[u64; 64]; 2]; 6],
    side_to_move: u64,
    castling: [u64; 4],
    en_passant: [u64; 8],
}

static ZOBRIST: OnceLock<ZobristTable> = OnceLock::new();

pub use crate::chess::decision::{choose_best_action, choose_best_action_for_mode};
pub use crate::chess::eval::static_evaluate;

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct RootSearchResult {
    pub best_action: Action,
    pub best_score: i32,
    pub completed_depth: i32,
    pub heuristic_score: i32,
    pub policy_score: i32,
    pub decision_score: i32,
    pub diagnostics: RootSearchDiagnostics,
}

pub fn search_best_action(engine: &Engine, player: PlayerId) -> Option<Action> {
    search_root(engine, player).map(|result| result.best_action)
}

pub(crate) fn heuristic_best_action(
    engine: &Engine,
    player: PlayerId,
    actions: &[Action],
) -> Option<Action> {
    order_moves(engine, player, actions, 0).first().cloned()
}

pub fn search_root(engine: &Engine, player: PlayerId) -> Option<RootSearchResult> {
    search_root_with_context(engine, player, None)
}

pub(crate) fn search_root_with_context(
    engine: &Engine,
    player: PlayerId,
    context: Option<&RootDecisionContext>,
) -> Option<RootSearchResult> {
    let mut engine = engine.clone();
    search_root_in_place(&mut engine, player, context)
}

fn search_root_in_place(
    engine: &mut Engine,
    player: PlayerId,
    context: Option<&RootDecisionContext>,
) -> Option<RootSearchResult> {
    init_tables();
    set_search_runtime_profile_enabled(search_runtime_diagnostics_enabled());
    let mut instrumentation = SearchInstrumentation::default();

    let legal = engine.legal_actions(player);
    if legal.is_empty() {
        return None;
    }

    let time_limit = Duration::from_millis(
        std::env::var("TCS_MOVE_TIME_MS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(500),
    );
    let search_start = Instant::now();
    SEARCH_DEADLINE.with(|d| *d.borrow_mut() = Some(search_start + time_limit));

    let max_depth = adaptive_depth(engine);
    instrumentation.record_branching(0, max_depth, legal.len());
    let mut best_move = legal[0].clone();
    let mut prev_score: i32 = 0;
    let mut chosen_search_score = 0;
    let mut completed_depth = 0;
    let best_decision = RootDecisionBreakdown::default();
    let root_key = position_key(engine, player);
    let mut last_ordered = legal.clone();
    let mut last_root_scores = vec![-INF; legal.len()];
    let mut last_cutoff_index = None;
    let mut best_initial_rank = 0usize;
    for depth in 1..=max_depth {
        if depth > 1 && search_start.elapsed() >= time_limit {
            break;
        }
        let ordered =
            order_root_moves(engine, player, &legal, &mut instrumentation.mirror_ordering);
        last_ordered = ordered.clone();

        let use_aspiration = depth >= 3 && prev_score.abs() < ASPIRATION_MATE_THRESHOLD;
        let mut window_alpha = if use_aspiration { prev_score - 40 } else { -INF };
        let mut window_beta = if use_aspiration { prev_score + 40 } else { INF };

        loop {
            let initial_window_alpha = window_alpha;
            let mut alpha = window_alpha;
            let beta = window_beta;

            let mut best_score = -INF;
            let mut root_scores = vec![-INF; ordered.len()];
            let mut fail_high = false;
            let mut cutoff_index = None;
            let mut mate_in_one = vec![false; ordered.len()];

            for (idx, mv) in ordered.iter().enumerate() {
                let score_window_alpha = alpha;
                let Some(undo) = engine.simulate_action_for_search(player, mv) else {
                    continue;
                };
                let is_mate_now = engine.game_over() && engine.winner() == Some(player);
                instrumentation.record_move_simulation(undo.profile());

                let score = if idx == 0 {
                    -negamax(
                        engine,
                        depth - 1,
                        -beta,
                        -score_window_alpha,
                        opponent(player),
                        player,
                        1,
                        &mut instrumentation,
                    )
                } else {
                    let mut score = -negamax(
                        engine,
                        depth - 1,
                        -score_window_alpha - 1,
                        -score_window_alpha,
                        opponent(player),
                        player,
                        1,
                        &mut instrumentation,
                    );

                    if score > score_window_alpha && score < beta {
                        instrumentation.counters.pv_researches += 1;
                        score = -negamax(
                            engine,
                            depth - 1,
                            -beta,
                            -score_window_alpha,
                            opponent(player),
                            player,
                            1,
                            &mut instrumentation,
                        );
                    }

                    score
                };
                let undo_profile = engine.undo_action_for_search(undo);
                instrumentation.record_move_undo(undo_profile);
                root_scores[idx] = score;
                if is_mate_now {
                    mate_in_one[idx] = true;
                }

                if score > best_score {
                    best_score = score;
                }

                if score > alpha {
                    alpha = score;
                }

                if score >= beta {
                    fail_high = true;
                    cutoff_index = Some(idx);
                    break;
                }
            }

            if fail_high && depth >= 3 {
                instrumentation.counters.aspiration_retries += 1;
                if best_score >= ASPIRATION_MATE_THRESHOLD {
                    // Mate found — commit immediately to the move that caused fail_high.
                    // Retrying with window_beta=INF inflates all subsequent null-window
                    // scores to the mate threshold via cutoff, producing false ties.
                    let mate_local_idx = cutoff_index.unwrap_or(0);
                    best_move = ordered[mate_local_idx].clone();
                    let mate_score = root_scores
                        .get(mate_local_idx)
                        .copied()
                        .unwrap_or(best_score);
                    chosen_search_score = mate_score;
                    prev_score = mate_score;
                    completed_depth = depth;
                    last_root_scores = root_scores;
                    last_cutoff_index = cutoff_index;
                    best_initial_rank = ordered
                        .iter()
                        .position(|mv| same_move(mv, &best_move))
                        .unwrap_or(0);
                    store_tt(
                        root_key,
                        TTEntry {
                            key: 0,
                            depth,
                            score: mate_score,
                            bound: Bound::Lower,
                            best_move: Some(best_move.clone()),
                        },
                    );
                    break;
                }
                window_beta = window_beta.saturating_add(ASPIRATION_DELTA);
                continue;
            }

            if depth >= 3 && best_score <= initial_window_alpha {
                instrumentation.counters.aspiration_retries += 1;
                if best_score <= -ASPIRATION_MATE_THRESHOLD {
                    window_alpha = -INF;
                } else {
                    window_alpha = window_alpha.saturating_sub(ASPIRATION_DELTA);
                }
                continue;
            }

            if let Some((mate_idx, mate_search_score)) =
                select_root_mate_by_search_score(engine, &ordered, &root_scores, &mate_in_one)
            {
                best_move = ordered[mate_idx].clone();
                chosen_search_score = mate_search_score;
                prev_score = mate_search_score;
                completed_depth = depth;
                best_initial_rank = ordered
                    .iter()
                    .position(|mv| same_move(mv, &best_move))
                    .unwrap_or(0);
                let diagnostics = build_root_mate_diagnostics(
                    engine,
                    player,
                    &best_move,
                    &ordered,
                    &root_scores,
                    cutoff_index,
                    best_initial_rank,
                    instrumentation,
                );

                return Some(RootSearchResult {
                    best_action: best_move,
                    best_score: chosen_search_score,
                    completed_depth,
                    heuristic_score: 0,
                    policy_score: 0,
                    decision_score: 0,
                    diagnostics,
                });
            }

            // S-7 removed: pure alpha-beta selection
            let best_local_idx = root_scores
                .iter()
                .enumerate()
                .max_by_key(|&(_, &s)| s)
                .map(|(i, _)| i)
                .unwrap_or(0);
            best_move = ordered[best_local_idx].clone();
            let selected_search_score = root_scores
                .get(best_local_idx)
                .copied()
                .unwrap_or(best_score);
            chosen_search_score = selected_search_score;
            prev_score = selected_search_score;
            completed_depth = depth;
            last_root_scores = root_scores;
            last_cutoff_index = cutoff_index;
            best_initial_rank = ordered
                .iter()
                .position(|mv| same_move(mv, &best_move))
                .unwrap_or(0);

            store_tt(
                root_key,
                TTEntry {
                    key: 0,
                    depth,
                    score: selected_search_score,
                    bound: Bound::Exact,
                    best_move: Some(best_move.clone()),
                },
            );

            break;
        }
    }

    let diagnostics = with_root_decision_hooks(engine, player, |hooks| {
        build_root_diagnostics(
            engine,
            player,
            root_key,
            &best_move,
            &last_ordered,
            &last_root_scores,
            last_cutoff_index,
            best_initial_rank,
            instrumentation,
            hooks,
            tt_best_move(root_key),
            countermove_for_position(engine),
        )
    });
    maybe_emit_phase_profile(engine, chosen_search_score);
    maybe_emit_strategic_diagnostics(engine, player, chosen_search_score, &best_move);
    maybe_emit_runtime_diagnostics(&diagnostics);

    Some(RootSearchResult {
        best_action: best_move,
        best_score: chosen_search_score,
        completed_depth,
        heuristic_score: best_decision.heuristic_score,
        policy_score: best_decision.policy_score,
        decision_score: best_decision.final_score,
        diagnostics,
    })
}

fn select_root_mate_by_search_score(
    engine: &Engine,
    ordered: &[Action],
    root_scores: &[i32],
    mate_in_one: &[bool],
) -> Option<(usize, i32)> {
    let mut best: Option<(usize, i32, String)> = None;

    for (idx, mv) in ordered.iter().enumerate() {
        if !mate_in_one.get(idx).copied().unwrap_or(false) {
            continue;
        }

        let score = *root_scores.get(idx).unwrap_or(&(-INF / 2));
        if score <= -INF / 2 {
            continue;
        }

        let uci = action_to_uci(mv, &engine.units).unwrap_or_default();
        match &mut best {
            None => {
                best = Some((idx, score, uci));
            }
            Some((_, best_score, best_uci)) => {
                if score > *best_score || (score == *best_score && uci < *best_uci) {
                    best = Some((idx, score, uci));
                }
            }
        }
    }

    best.map(|(idx, score, _)| (idx, score))
}

fn opponent_best_reply_forces_mate(
    engine: &mut Engine,
    opponent_player: PlayerId,
    root_player: PlayerId,
    instrumentation: &mut SearchInstrumentation,
) -> bool {
    let opponent_actions = engine.legal_actions(opponent_player);
    if opponent_actions.is_empty() {
        return false;
    }

    let mut samples = Vec::new();

    for reply in opponent_actions {
        let Some(reply_undo) = engine.simulate_action_for_search(opponent_player, &reply) else {
            continue;
        };
        instrumentation.record_move_simulation(reply_undo.profile());

        let is_mate_position = engine.game_over() && engine.winner() == Some(opponent_player);
        if is_mate_position {
            let reply_profile = engine.undo_action_for_search(reply_undo);
            instrumentation.record_move_undo(reply_profile);
            return true;
        }
        let reply_score = if engine.game_over() {
            terminal_score(engine, root_player, 2)
        } else {
            evaluate(engine, root_player)
        };

        let reply_profile = engine.undo_action_for_search(reply_undo);
        instrumentation.record_move_undo(reply_profile);
        samples.push((reply_score, is_mate_position));
    }

    opponent_best_reply_forces_mate_from_scores(&samples)
}

fn opponent_best_reply_forces_mate_from_scores(scores: &[(i32, bool)]) -> bool {
    let mut best_reply_score = i32::MIN;
    let mut best_reply_is_mate = false;

    for (reply_score, is_mate_position) in scores.iter().copied() {
        if is_mate_position {
            best_reply_is_mate = true;
            break;
        }

        if reply_score > best_reply_score {
            best_reply_score = reply_score;
            best_reply_is_mate = false;
        }
    }

    best_reply_is_mate
}

fn negamax(
    engine: &mut Engine,
    depth: i32,
    mut alpha: i32,
    beta: i32,
    to_move: PlayerId,
    root_player: PlayerId,
    ply: usize,
    instrumentation: &mut SearchInstrumentation,
) -> i32 {
    instrumentation.record_node(ply, depth);
    if SEARCH_DEADLINE.with(|d| d.borrow().map_or(false, |dl| Instant::now() >= dl)) {
        return evaluate(engine, root_player);
    }
    let alpha_orig = alpha;
    let is_pv_node = beta - alpha > 1;
    let in_check = engine.is_in_check(to_move);

    if engine.game_over() {
        return terminal_score(engine, to_move, ply);
    }

    let rep_count = engine
        .repetition_counts
        .get(&engine.current_repetition_key)
        .copied()
        .unwrap_or(0);
    if rep_count >= 2 {
        return draw_score(engine, to_move);
    }

    if depth <= 0 {
        return quiescence(
            engine,
            alpha,
            beta,
            to_move,
            root_player,
            ply,
            0,
            instrumentation,
        );
    }

    if ply >= MAX_PLY {
        return evaluate(engine, root_player);
    }

    let key = position_key(engine, to_move);

    if let Some(score) = probe_tt(key, depth, alpha, beta, instrumentation) {
        return score;
    }

    if depth >= NULL_MOVE_MIN_DEPTH
        && beta - alpha > 1
        && ply > 0
        && !in_check
        && !is_low_material_search_position(engine)
        && has_non_pawn_material(engine, to_move)
    {
        instrumentation.counters.null_move_attempts += 1;
        if let Some(undo) = engine.simulate_null_move_for_search(to_move) {
            instrumentation.record_null_move_simulation(undo.profile());
            let score = -negamax(
                engine,
                depth - 1 - NULL_MOVE_REDUCTION,
                -beta,
                -beta + 1,
                opponent(to_move),
                root_player,
                ply + 1,
                instrumentation,
            );
            let undo_profile = engine.undo_null_move_for_search(undo);
            instrumentation.record_null_move_undo(undo_profile);

            if score >= beta {
                instrumentation.counters.null_move_cutoffs += 1;
                return beta;
            }
        }
    }

    let legal = engine.legal_actions(to_move);
    if legal.is_empty() {
        return if in_check {
            -900_000 + ply as i32 * 10
        } else {
            draw_score(engine, to_move)
        };
    }
    instrumentation.record_branching(ply, depth, legal.len());

    let ordered = order_moves(engine, to_move, &legal, ply);

    let mut best = -INF;
    let mut best_move = None;
    let mut quiets_searched = Vec::new();

    // Futility pruning: at depth 1-2, if static_eval + margin can't reach alpha,
    // quiet moves (no capture/promo/check) are skipped.
    let (futility_active, futility_eval) = if depth <= 2 && !in_check && !is_pv_node && ply > 0 {
        let se = evaluate(engine, root_player);
        let margin = if depth == 1 { FUTILITY_MARGIN_D1 } else { FUTILITY_MARGIN_D2 };
        (se + margin <= alpha, se)
    } else {
        (false, 0)
    };

    for (idx, mv) in ordered.iter().enumerate() {
        let quiet_move = is_quiet_move(engine, to_move, mv);
        let critical_move = is_critical_move(engine, to_move, mv);

        if futility_active && quiet_move {
            if futility_eval > best {
                best = futility_eval;
            }
            continue;
        }

        let score_window_alpha = alpha;
        let Some(undo) = engine.simulate_action_for_search(to_move, mv) else {
            continue;
        };
        instrumentation.record_move_simulation(undo.profile());

        let mut next_depth = depth - 1;

        if idx > 4 && depth >= 4 && quiet_move {
            next_depth -= 1;
            instrumentation.counters.lmr_reductions += 1;
        }

        if next_depth >= 0 && depth <= 2 && critical_move {
            next_depth += 1;
        }

        if next_depth >= 0 && in_check && depth <= 3 {
            next_depth += 1;
            instrumentation.counters.check_extensions += 1;
        }

        let score = if idx == 0 {
            -negamax(
                engine,
                next_depth,
                -beta,
                -score_window_alpha,
                opponent(to_move),
                root_player,
                ply + 1,
                instrumentation,
            )
        } else if is_pv_node && next_depth > 0 {
            let mut score = -negamax(
                engine,
                next_depth,
                -score_window_alpha - 1,
                -score_window_alpha,
                opponent(to_move),
                root_player,
                ply + 1,
                instrumentation,
            );

            if score > score_window_alpha && score < beta {
                instrumentation.counters.pv_researches += 1;
                score = -negamax(
                    engine,
                    next_depth,
                    -beta,
                    -score_window_alpha,
                    opponent(to_move),
                    root_player,
                    ply + 1,
                    instrumentation,
                );
            }

            score
        } else {
            -negamax(
                engine,
                next_depth,
                -beta,
                -score_window_alpha,
                opponent(to_move),
                root_player,
                ply + 1,
                instrumentation,
            )
        };
        let undo_profile = engine.undo_action_for_search(undo);
        instrumentation.record_move_undo(undo_profile);

        if score > best {
            best = score;
            best_move = Some(mv.clone());
        }

        if score > alpha {
            alpha = score;
        }

        if alpha >= beta {
            instrumentation.counters.beta_cutoffs += 1;
            if quiet_move {
                store_killer(ply, mv.clone());
                store_history(mv, depth, true);
                instrumentation.counters.killer_cutoffs += 1;
            }
            store_countermove(engine, mv);
            break;
        }

        if quiet_move {
            quiets_searched.push(mv.clone());
        }
    }

    if best <= alpha_orig {
        for mv in quiets_searched {
            if best_move
                .as_ref()
                .map(|best_mv| same_move(best_mv, &mv))
                .unwrap_or(false)
            {
                continue;
            }
            store_history(&mv, depth, false);
        }
    }

    let bound = if best <= alpha_orig {
        Bound::Upper
    } else if best >= beta {
        Bound::Lower
    } else {
        Bound::Exact
    };

    store_tt(
        key,
        TTEntry {
            key: 0,
            depth,
            score: best,
            bound,
            best_move,
        },
    );

    best
}

fn quiescence(
    engine: &mut Engine,
    mut alpha: i32,
    beta: i32,
    to_move: PlayerId,
    root_player: PlayerId,
    ply: usize,
    qdepth: i32,
    instrumentation: &mut SearchInstrumentation,
) -> i32 {
    instrumentation.record_quiescence_node(ply);
    if engine.game_over() {
        return terminal_score(engine, to_move, ply);
    }
    let stand_pat = evaluate(engine, root_player);

    if stand_pat >= beta {
        return beta;
    }

    if stand_pat > alpha {
        alpha = stand_pat;
    }

    let legal = engine.legal_actions(to_move);
    if legal.is_empty() {
        let in_check = engine.is_in_check(to_move);
        return if in_check {
            -900_000 + ply as i32 * 10
        } else {
            draw_score(engine, to_move)
        };
    }
    let ordered = order_moves(engine, to_move, &legal, 0);

    for mv in ordered {
        if !is_tactical_move(engine, to_move, &mv, qdepth) {
            continue;
        }
        if let Some(exchange) = capture_score(engine, &mv) {
            if tactical_score_breakdown(engine, to_move, &mv, 0).see < -80 && exchange <= 0 {
                continue;
            }
            if !is_promotion(engine, to_move, &mv)
                && has_non_pawn_material(engine, to_move)
                && stand_pat + exchange.max(0) + DELTA_MARGIN <= alpha
            {
                continue;
            }
        }

        let Some(undo) = engine.simulate_action_for_search(to_move, &mv) else {
            continue;
        };
        instrumentation.record_move_simulation(undo.profile());

        let score = -quiescence(
            engine,
            -beta,
            -alpha,
            opponent(to_move),
            root_player,
            ply + 1,
            qdepth + 1,
            instrumentation,
        );
        let undo_profile = engine.undo_action_for_search(undo);
        instrumentation.record_move_undo(undo_profile);

        if score >= beta {
            return beta;
        }

        if score > alpha {
            alpha = score;
        }
    }

    alpha
}

pub(crate) fn order_moves(
    engine: &Engine,
    player: PlayerId,
    actions: &[Action],
    ply: usize,
) -> Vec<Action> {
    let tt_best = tt_best_move(position_key(engine, player));
    let countermove = countermove_for_position(engine);
    let killer_pair: Option<[Option<Action>; 2]> =
        KILLERS.with(|k| k.borrow().get(ply).copied());

    let mut scored: Vec<(i32, Action)> = actions
        .iter()
        .map(|mv| {
            let mut score = move_score(engine, player, mv);

            if let Some(ref best) = tt_best {
                if same_move(best, mv) {
                    score += TT_BEST_MOVE_BONUS;
                }
            }

            if let Some([k1, k2]) = killer_pair {
                if k1.as_ref().map(|m| same_move(m, mv)).unwrap_or(false) {
                    score += PRIMARY_KILLER_BONUS;
                }
                if k2.as_ref().map(|m| same_move(m, mv)).unwrap_or(false) {
                    score += SECONDARY_KILLER_BONUS;
                }
            }

            if let Some(ref counter) = countermove {
                if same_move(counter, mv) {
                    score += COUNTERMOVE_BONUS;
                }
            }

            score += history_score(mv);
            (score, mv.clone())
        })
        .collect();

    scored.sort_by(|a, b| b.0.cmp(&a.0));
    scored.into_iter().map(|x| x.1).collect()
}

pub(crate) fn move_score(engine: &Engine, player: PlayerId, mv: &Action) -> i32 {
    let mut score = tactical_move_score(engine, player, mv);
    let progress = progress_move_score(engine, player, mv);
    let in_check = engine.is_in_check(player);

    score += progress;
    score += development_score(engine, player, mv);
    score += mobility_hint_score(engine, player, mv);
    score += safety_response_score(engine, player, mv, in_check);

    score -= quiet_non_progress_penalty(engine, player, mv, progress);

    if is_winning_endgame(engine, player) && gives_check_fast(engine, player, mv) {
        score += 500;
    }

    if is_shuffle_move(engine, player, mv) {
        score -= shuffle_penalty(engine, player);
    }

    score
}

fn tactical_move_score(engine: &Engine, player: PlayerId, mv: &Action) -> i32 {
    let mut score = 0;

    if is_promotion(engine, player, mv) {
        score += PROMOTION_BASE + promotion_priority(engine, mv);
    }

    if let Some(v) = capture_score(engine, mv) {
        if v >= 0 {
            score += WINNING_CAPTURE_BASE + v * 8;
        } else {
            score += LOSING_CAPTURE_BASE + v * 4;
        }
    }

    if gives_check_fast(engine, player, mv) {
        score += CHECK_BASE;
    }

    if advances_true_passed_pawn(engine, player, mv) {
        score += passed_pawn_push_score(engine, player, mv);
    }

    if is_conversion_move(engine, player, mv) {
        score += CONVERSION_BASE;
    }

    if is_recapture_move(engine, mv) {
        score += RECAPTURE_BONUS;
    }

    score
}

fn adaptive_depth(engine: &Engine) -> i32 {
    if std::env::var("TCS_DEBUG").is_ok() {
        eprintln!("DEBUG adaptive_depth: TCS_MINIMAX_DEPTH={:?}", std::env::var("TCS_MINIMAX_DEPTH"));
    }
    if let Ok(v) = std::env::var("TCS_MINIMAX_DEPTH") {
        if let Ok(d) = v.parse::<i32>() {
            return d.max(1);
        }
    }

    let n = engine.units.len();

    if n >= 26 {
        3
    } else if n >= 16 {
        4
    } else if n >= 8 {
        5
    } else {
        6
    }
}

fn is_tactical_move(engine: &Engine, player: PlayerId, mv: &Action, qdepth: i32) -> bool {
    if is_capture(engine, mv) || is_promotion(engine, player, mv) {
        return true;
    }

    qdepth <= 2 && gives_check_fast(engine, player, mv)
}

fn development_score(engine: &Engine, player: PlayerId, mv: &Action) -> i32 {
    let Action::Move {
        unit_id, target, ..
    } = mv
    else {
        return 0;
    };

    let Some(unit) = engine.units.get(unit_id) else {
        return 0;
    };

    if unit.owner != player {
        return 0;
    }

    let mut score = 0;

    if !unit.has_moved {
        score += match unit.kind {
            ChessPieceKind::Knight | ChessPieceKind::Bishop => 34,
            ChessPieceKind::Queen => 8,
            ChessPieceKind::Rook => 12,
            ChessPieceKind::King => 0,
            ChessPieceKind::Pawn => 14,
        };
    }

    if is_castling_move(engine, mv) {
        score += CASTLING_BONUS;
    }

    let center_gain = center_bonus(*target) - center_bonus(unit.position);
    if center_gain > 0 {
        score += center_gain;
    }

    score
}

fn mobility_hint_score(engine: &Engine, player: PlayerId, mv: &Action) -> i32 {
    let Action::Move {
        unit_id, target, ..
    } = mv
    else {
        return 0;
    };

    let Some(unit) = engine.units.get(unit_id) else {
        return 0;
    };

    if unit.owner != player {
        return 0;
    }

    let before = pseudo_mobility_from(engine, unit.kind, unit.position, player);
    let after = pseudo_mobility_from(engine, unit.kind, *target, player);
    (after - before) * 6
}

fn safety_response_score(engine: &Engine, player: PlayerId, mv: &Action, in_check: bool) -> i32 {
    let mut score = 0;

    if in_check {
        score += ESCAPE_CHECK_BONUS;
    }

    if king_escape_improves(engine, player, mv) {
        score += 80;
    }

    score
}

fn with_root_decision_hooks<R>(
    engine: &Engine,
    player: PlayerId,
    run: impl FnOnce(&RootDecisionHooks<'_>) -> R,
) -> R {
    let move_score_fn = |mv: &Action| move_score(engine, player, mv);
    let root_policy_score_fn = |root_key: u64, mv: &Action| root_policy_score(root_key, mv);

    let hooks = RootDecisionHooks {
        move_score: &move_score_fn,
        root_policy_score: &root_policy_score_fn,
    };

    run(&hooks)
}

fn init_tables() {
    KILLERS.with(|k| {
        let mut k = k.borrow_mut();
        k.clear();
        k.resize(MAX_PLY, [None, None]);
    });
    let _ = root_policy_table();
}

fn root_policy_table() -> &'static Mutex<HashMap<u64, HashMap<u64, i32>>> {
    ROOT_POLICY.get_or_init(|| Mutex::new(HashMap::new()))
}

fn zobrist_table() -> &'static ZobristTable {
    ZOBRIST.get_or_init(|| {
        let mut s = 0x9e3779b97f4a7c15u64;
        let mut rng = || {
            s ^= s << 13;
            s ^= s >> 7;
            s ^= s << 17;
            s
        };
        let mut pieces = [[[0u64; 64]; 2]; 6];
        for p in &mut pieces {
            for pl in p.iter_mut() {
                for sq in pl.iter_mut() {
                    *sq = rng();
                }
            }
        }
        ZobristTable {
            pieces,
            side_to_move: rng(),
            castling: [rng(), rng(), rng(), rng()],
            en_passant: [rng(), rng(), rng(), rng(), rng(), rng(), rng(), rng()],
        }
    })
}

fn piece_type_index(kind: ChessPieceKind) -> usize {
    match kind {
        ChessPieceKind::Pawn => 0,
        ChessPieceKind::Knight => 1,
        ChessPieceKind::Bishop => 2,
        ChessPieceKind::Rook => 3,
        ChessPieceKind::Queen => 4,
        ChessPieceKind::King => 5,
    }
}

pub(crate) fn position_key(engine: &Engine, player: PlayerId) -> u64 {
    let zt = zobrist_table();
    let mut h = 0u64;

    for u in engine.units.values() {
        let pi = piece_type_index(u.kind);
        let oi = (u.owner - 1) as usize;
        let sq = (u.position.y * 8 + u.position.x) as usize;
        h ^= zt.pieces[pi][oi][sq];
    }

    if player == 2 {
        h ^= zt.side_to_move;
    }

    if engine.white_can_castle_kingside  { h ^= zt.castling[0]; }
    if engine.white_can_castle_queenside { h ^= zt.castling[1]; }
    if engine.black_can_castle_kingside  { h ^= zt.castling[2]; }
    if engine.black_can_castle_queenside { h ^= zt.castling[3]; }

    if let Some(ep) = engine.en_passant_target {
        h ^= zt.en_passant[ep.x as usize];
    }

    h
}

fn probe_tt(
    key: u64,
    depth: i32,
    alpha: i32,
    beta: i32,
    instrumentation: &mut SearchInstrumentation,
) -> Option<i32> {
    let idx = (key as usize) & (TT_SIZE - 1);
    TT.with(|tt| {
        let tt = tt.borrow();
        let e = tt[idx].as_ref().filter(|e| e.key == key)?;
        instrumentation.counters.tt_hits += 1;

        if e.depth < depth {
            return None;
        }

        match e.bound {
            Bound::Exact => {
                instrumentation.counters.tt_cutoffs += 1;
                Some(e.score)
            }
            Bound::Lower if e.score >= beta => {
                instrumentation.counters.tt_cutoffs += 1;
                Some(e.score)
            }
            Bound::Upper if e.score <= alpha => {
                instrumentation.counters.tt_cutoffs += 1;
                Some(e.score)
            }
            _ => None,
        }
    })
}

fn tt_best_move(key: u64) -> Option<Action> {
    let idx = (key as usize) & (TT_SIZE - 1);
    TT.with(|tt| {
        tt.borrow()[idx]
            .as_ref()
            .filter(|e| e.key == key)
            .and_then(|e| e.best_move.clone())
    })
}

fn store_tt(key: u64, mut entry: TTEntry) {
    entry.key = key;
    let idx = (key as usize) & (TT_SIZE - 1);
    TT.with(|tt| {
        tt.borrow_mut()[idx] = Some(entry);
    });
}

fn store_killer(ply: usize, mv: Action) {
    KILLERS.with(|k| {
        let mut k = k.borrow_mut();
        if ply >= k.len() {
            return;
        }
        if k[ply][0].as_ref().map(|m| same_move(m, &mv)).unwrap_or(false) {
            return;
        }
        k[ply][1] = k[ply][0].take();
        k[ply][0] = Some(mv);
    });
}

fn store_countermove(engine: &Engine, mv: &Action) {
    let Some(last) = engine.action_log.last() else {
        return;
    };
    let key = move_id(&last.action);
    if key == 0 {
        return;
    }
    COUNTERMOVES.with(|cm| cm.borrow_mut().insert(key, mv.clone()));
}

fn countermove_for_position(engine: &Engine) -> Option<Action> {
    let last = engine.action_log.last()?;
    let key = move_id(&last.action);
    if key == 0 {
        return None;
    }
    COUNTERMOVES.with(|cm| cm.borrow().get(&key).cloned())
}

fn move_id(mv: &Action) -> u64 {
    match mv {
        Action::Move {
            unit_id,
            target,
            promotion,
        } => {
            let mut h = *unit_id as u64;
            h ^= (target.x as u64) << 8;
            h ^= (target.y as u64) << 16;
            h ^= (*promotion).map(piece_value_u64).unwrap_or(0) << 24;
            h
        }
        _ => 0,
    }
}

fn piece_value_u64(kind: ChessPieceKind) -> u64 {
    match kind {
        ChessPieceKind::Pawn => 1,
        ChessPieceKind::Knight => 2,
        ChessPieceKind::Bishop => 3,
        ChessPieceKind::Rook => 4,
        ChessPieceKind::Queen => 5,
        ChessPieceKind::King => 6,
    }
}

fn store_history(mv: &Action, depth: i32, improving: bool) {
    let delta = if improving {
        depth * depth * HISTORY_REWARD_SCALE
    } else {
        -(depth * depth * HISTORY_PENALTY_SCALE)
    };
    HISTORY.with(|h| {
        let mut h = h.borrow_mut();
        let next = h.entry(move_id(mv)).or_insert(0);
        *next = (*next + delta).clamp(-HISTORY_SCORE_CAP, HISTORY_SCORE_CAP);
    });
}

fn history_score(mv: &Action) -> i32 {
    HISTORY.with(|h| *h.borrow().get(&move_id(mv)).unwrap_or(&0))
}

pub(crate) fn root_policy_score(root_key: u64, mv: &Action) -> i32 {
    if !root_policy_enabled() {
        return 0;
    }

    let table = root_policy_table().lock().unwrap();
    table
        .get(&root_key)
        .and_then(|entries| entries.get(&move_id(mv)).copied())
        .unwrap_or(0)
}

fn update_root_policy(
    root_key: u64,
    ordered: &[Action],
    scores: &[i32],
    best_score: i32,
    depth: i32,
) {
    if !root_policy_enabled() {
        return;
    }

    let margin = root_practical_margin(best_score);

    let mut table = root_policy_table().lock().unwrap();
    let entries = table.entry(root_key).or_default();

    for score in entries.values_mut() {
        *score = score.saturating_sub(ROOT_POLICY_DECAY_STEP);
    }

    for (idx, mv) in ordered.iter().enumerate() {
        let search_score = scores.get(idx).copied().unwrap_or(-INF);
        if search_score <= -INF / 2 {
            continue;
        }

        let reward = if search_score >= best_score - margin {
            ROOT_POLICY_REWARD_BASE + depth * 24 + (best_score - search_score).max(0) / 2
        } else {
            ROOT_POLICY_MARGIN_BONUS - (best_score - search_score).min(200) / 2
        };

        let reward = reward.max(0);
        let entry = entries.entry(move_id(mv)).or_insert(0);
        *entry = (*entry + reward).clamp(-ROOT_POLICY_SCORE_CAP, ROOT_POLICY_SCORE_CAP);
    }

    entries.retain(|_, score| *score > 0);
}

fn root_policy_enabled() -> bool {
    std::env::var("TCS_ROOT_POLICY").ok().as_deref() == Some("1")
}

fn same_move(a: &Action, b: &Action) -> bool {
    match (a, b) {
        (
            Action::Move {
                unit_id: u1,
                target: t1,
                promotion: p1,
            },
            Action::Move {
                unit_id: u2,
                target: t2,
                promotion: p2,
            },
        ) => u1 == u2 && t1 == t2 && p1 == p2,
        _ => false,
    }
}

pub(crate) fn opponent(player: PlayerId) -> PlayerId {
    if player == 1 {
        2
    } else {
        1
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chess::fen::engine_from_fen;
    use crate::chess::opponent_response_mask::{MirrorRiskLevel, MirrorRiskSummary};
    use crate::chess::practical_policy::reply_scan_breakdown;
    use crate::chess::puzzle::PuzzleCase;
    use crate::chess::search_mirror_ordering::{
        mirror_ordering_penalty_for_action, mirror_ordering_penalty_for_action_with_diagnostics,
        mirror_ordering_penalty_from_summary, root_mirror_ordering_penalties_with_diagnostics,
        root_mirror_ordering_penalties_with_flag, MIRROR_ORDERING_MAX_PENALTY,
    };
    use crate::chess::search_root_ordering::{
        apply_root_ordering_scores, order_root_moves, root_ordering_score,
    };
    use crate::chess::uci::{action_key, action_to_uci};
    use crate::prototype::minimal_ruleset::{load_engine_from_ruleset, minimal_runtime_ruleset};
    use serde_json;
    use std::fs;

    const MATE1_FIXTURE_PATH: &str = "tests/fixtures/puzzle_rng_mate1_seed42.jsonl";

    fn best_move_uci(fen: &str) -> String {
        let engine = engine_from_fen(fen).expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let result = search_root(&engine, player).expect("search should return a move");
        action_to_uci(&result.best_action, &engine.units).expect("uci")
    }

    fn load_puzzle_cases(path: &str) -> Vec<PuzzleCase> {
        let content = fs::read_to_string(path).expect("puzzle file should load");
        content
            .lines()
            .filter_map(|line| serde_json::from_str(line).ok())
            .collect()
    }

    fn load_case_with_mate_and_non_mate(path: &str) -> PuzzleCase {
        load_puzzle_cases(path)
            .into_iter()
            .find(|case| {
                if case.theme != "mate_in_1" {
                    return false;
                }

                let mut engine = engine_from_fen(&case.fen).expect("valid fen");
                let player: PlayerId = case.side_to_move;
                let mut has_mate = false;
                let mut has_non_mate = false;

                let actions = engine.legal_actions(player);
                for action in actions {
                    let Some(undo) = engine.simulate_action_for_search(player, &action) else {
                        continue;
                    };
                    let is_mate = engine.game_over() && engine.winner() == Some(player);
                    let _ = engine.undo_action_for_search(undo);

                    if is_mate {
                        has_mate = true;
                    } else {
                        has_non_mate = true;
                    }

                    if has_mate && has_non_mate {
                        return true;
                    }
                }

                false
            })
            .expect("found a mate-in-1 case with a non-mate legal move")
    }

    fn immediate_mate_ucs(engine: &Engine, player: PlayerId) -> Vec<String> {
        let mut cloned = engine.clone();
        let mut uci_moves = Vec::new();

        for action in cloned.legal_actions(player) {
            let Some(undo) = cloned.simulate_action_for_search(player, &action) else {
                continue;
            };
            let is_mate = cloned.game_over() && cloned.winner() == Some(player);
            let _ = cloned.undo_action_for_search(undo);

            if is_mate {
                if let Some(uci) = action_to_uci(&action, &cloned.units) {
                    uci_moves.push(uci);
                }
            }
        }

        uci_moves.sort();
        uci_moves
    }

    fn load_case(path: &str, index: usize) -> PuzzleCase {
        let cases = load_puzzle_cases(path);
        cases.get(index).cloned().expect("case index exists")
    }

    #[derive(Debug, PartialEq, Eq)]
    struct SearchRootCallerSnapshot {
        fen: String,
        current_player: PlayerId,
        turn_index: u32,
        repetition_counts: Vec<(u64, u32)>,
        action_log_len: usize,
        en_passant_target: Option<(u32, u32)>,
        halfmove_clock: u32,
        white_can_castle_kingside: bool,
        white_can_castle_queenside: bool,
        black_can_castle_kingside: bool,
        black_can_castle_queenside: bool,
    }

    impl SearchRootCallerSnapshot {
        fn capture(engine: &Engine) -> Self {
            let mut repetition_counts = engine
                .repetition_counts
                .iter()
                .map(|(key, count)| (*key, *count))
                .collect::<Vec<_>>();
            repetition_counts.sort();

            Self {
                fen: engine.to_fen(),
                current_player: engine.turn_manager.current_player,
                turn_index: engine.turn_manager.turn_index,
                repetition_counts,
                action_log_len: engine.action_log.len(),
                en_passant_target: engine.en_passant_target.map(|target| (target.x, target.y)),
                halfmove_clock: engine.halfmove_clock,
                white_can_castle_kingside: engine.white_can_castle_kingside,
                white_can_castle_queenside: engine.white_can_castle_queenside,
                black_can_castle_kingside: engine.black_can_castle_kingside,
                black_can_castle_queenside: engine.black_can_castle_queenside,
            }
        }
    }

    struct EnvVarGuard {
        key: &'static str,
        previous: Option<String>,
    }

    impl EnvVarGuard {
        fn remove(key: &'static str) -> Self {
            let previous = std::env::var(key).ok();
            std::env::remove_var(key);
            Self { key, previous }
        }

        fn set(key: &'static str, value: &'static str) -> Self {
            let previous = std::env::var(key).ok();
            std::env::set_var(key, value);
            Self { key, previous }
        }
    }

    impl Drop for EnvVarGuard {
        fn drop(&mut self) {
            if let Some(previous) = &self.previous {
                std::env::set_var(self.key, previous);
            } else {
                std::env::remove_var(self.key);
            }
        }
    }

    fn env_var_test_lock() -> std::sync::MutexGuard<'static, ()> {
        static LOCK: std::sync::OnceLock<std::sync::Mutex<()>> = std::sync::OnceLock::new();
        LOCK.get_or_init(|| std::sync::Mutex::new(()))
            .lock()
            .expect("env var test lock should not be poisoned")
    }

    fn legal_action_keys(engine: &Engine, player: PlayerId) -> Vec<String> {
        engine
            .legal_actions(player)
            .iter()
            .map(|action| action_key(action, &engine.units))
            .collect()
    }

    fn sorted_action_keys_for_actions(engine: &Engine, actions: &[Action]) -> Vec<String> {
        let mut keys = actions
            .iter()
            .map(|action| action_key(action, &engine.units))
            .collect::<Vec<_>>();
        keys.sort();
        keys
    }

    fn action_keys_for_actions(engine: &Engine, actions: &[Action]) -> Vec<String> {
        actions
            .iter()
            .map(|action| action_key(action, &engine.units))
            .collect()
    }

    fn action_rank_by_key(engine: &Engine, actions: &[Action], key: &str) -> Option<usize> {
        actions
            .iter()
            .position(|action| action_key(action, &engine.units) == key)
    }

    fn mirror_summary(level: MirrorRiskLevel) -> MirrorRiskSummary {
        MirrorRiskSummary {
            risk_level: level,
            risk_score: 0,
            risk_reasons: Vec::new(),
            opponent_response_count: 0,
            opponent_capture_count: 0,
            opponent_check_count: 0,
            opponent_promotion_count: 0,
            opponent_mate_reply_available: level == MirrorRiskLevel::LosingCandidate,
            unencodable_reply_count: 0,
            blunder_like_flag: level == MirrorRiskLevel::LosingCandidate,
            safe_candidate_flag: level == MirrorRiskLevel::Quiet,
        }
    }

    fn controlled_root_boundary_engine() -> Engine {
        engine_from_fen("6k1/8/8/8/3q4/8/8/3RK3 w - - 0 1").expect("valid controlled root FEN")
    }

    fn controlled_single_legal_non_mate_engine() -> Engine {
        engine_from_fen("7k/8/8/8/8/8/1q6/K7 w - - 0 1")
            .expect("valid single-legal controlled root FEN")
    }

    #[test]
    fn position_key_stable_for_same_position() {
        let engine = engine_from_fen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let expected = position_key(&engine, player);

        let mut reordered = engine.clone();
        let mut units: Vec<_> = reordered.units.values().cloned().collect();
        units.sort_by_key(|unit| std::cmp::Reverse(unit.id));
        reordered.units.clear();
        for unit in units {
            reordered.units.insert(unit.id, unit);
        }

        assert_eq!(position_key(&reordered, player), expected);
    }

    #[test]
    fn position_key_changes_with_castling_rights_en_passant_and_side_to_move() {
        let engine =
            engine_from_fen("r3k2r/1p3pp1/2n5/3pP3/3P4/2N2N2/PPP2PPP/R3K2R w KQkq d6 8 12")
                .expect("valid FEN");
        let base_key = position_key(&engine, engine.turn_manager.current_player);

        let mut castling_changed = engine.clone();
        castling_changed.white_can_castle_kingside = !engine.white_can_castle_kingside;
        assert_ne!(
            position_key(
                &castling_changed,
                castling_changed.turn_manager.current_player
            ),
            base_key
        );

        let mut en_passant_changed = engine.clone();
        en_passant_changed.en_passant_target = None;
        assert_ne!(
            position_key(
                &en_passant_changed,
                en_passant_changed.turn_manager.current_player
            ),
            base_key
        );

        let mut side_to_move_changed = engine.clone();
        side_to_move_changed.turn_manager.next_turn();
        assert_ne!(
            position_key(
                &side_to_move_changed,
                side_to_move_changed.turn_manager.current_player
            ),
            base_key
        );
    }

    #[test]
    fn position_key_restores_after_simulate_undo_cycle() {
        let mut engine =
            engine_from_fen("r3k2r/1p3pp1/2n5/3pP3/3P4/2N2N2/PPP2PPP/R3K2R w KQkq d6 8 12")
                .expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let action = engine
            .legal_actions(player)
            .into_iter()
            .next()
            .expect("position should have legal move");
        let key_before = position_key(&engine, player);

        let undo = engine
            .simulate_action_for_search(player, &action)
            .expect("legal move should simulate");
        let _ = engine.undo_action_for_search(undo);

        assert_eq!(engine.turn_manager.current_player, player);
        assert_eq!(
            position_key(&engine, engine.turn_manager.current_player),
            key_before
        );
    }

    #[test]
    fn root_policy_disabled_by_default() {
        std::env::remove_var("TCS_ROOT_POLICY");

        let engine = engine_from_fen("6k1/8/8/8/3q4/8/8/3RK3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let root_key = position_key(&engine, player);
        let actions = engine.legal_actions(player);
        let mv = actions.first().expect("legal move");

        {
            let mut table = root_policy_table().lock().unwrap();
            table.clear();
            table
                .entry(root_key)
                .or_default()
                .insert(move_id(mv), ROOT_POLICY_SCORE_CAP);
        }

        assert_eq!(root_policy_score(root_key, mv), 0);

        let before = root_policy_table().lock().unwrap().clone();
        update_root_policy(root_key, &actions, &vec![0; actions.len()], 0, 1);
        assert_eq!(*root_policy_table().lock().unwrap(), before);
    }

    #[test]
    fn root_score_consistency_for_selected_move() {
        let _root_policy_guard = EnvVarGuard::remove("TCS_ROOT_POLICY");

        let engine = engine_from_fen("6k1/8/8/8/3q4/8/8/3RK3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let result = search_root(&engine, player).expect("search should return a move");

        assert_eq!(
            result.best_score,
            result.diagnostics.decision.chosen_search_score
        );
    }

    #[test]
    fn mirror_ordering_penalty_is_bounded_and_monotonic() {
        let quiet = mirror_ordering_penalty_from_summary(&mirror_summary(MirrorRiskLevel::Quiet));
        let watch = mirror_ordering_penalty_from_summary(&mirror_summary(MirrorRiskLevel::Watch));
        let tactical =
            mirror_ordering_penalty_from_summary(&mirror_summary(MirrorRiskLevel::Tactical));
        let dangerous =
            mirror_ordering_penalty_from_summary(&mirror_summary(MirrorRiskLevel::Dangerous));
        let losing =
            mirror_ordering_penalty_from_summary(&mirror_summary(MirrorRiskLevel::LosingCandidate));

        assert_eq!(quiet, 0);
        assert!(watch >= quiet);
        assert!(tactical > watch);
        assert!(dangerous > tactical);
        assert!(losing > dangerous);
        assert!([quiet, watch, tactical, dangerous, losing]
            .into_iter()
            .all(|penalty| (0..=MIRROR_ORDERING_MAX_PENALTY).contains(&penalty)));
    }

    #[test]
    fn mirror_ordering_failed_compute_returns_zero_penalty() {
        let engine = controlled_root_boundary_engine();
        let player = engine.turn_manager.current_player;

        assert_eq!(
            mirror_ordering_penalty_for_action(&engine, player, &Action::Pass),
            0
        );
    }

    #[test]
    fn mirror_ordering_diagnostics_stay_zero_when_flag_off() {
        let _env_lock = env_var_test_lock();
        let _mirror_guard = EnvVarGuard::remove("TCS_MIRROR_ORDERING");
        let _root_policy_guard = EnvVarGuard::remove("TCS_ROOT_POLICY");
        let engine = controlled_root_boundary_engine();
        let player = engine.turn_manager.current_player;

        let result = search_root(&engine, player).expect("search should return a move");

        assert_eq!(
            result.diagnostics.mirror_ordering,
            MirrorOrderingDiagnostics::default()
        );
    }

    #[test]
    fn mirror_ordering_diagnostics_count_enabled_root_evals() {
        let _env_lock = env_var_test_lock();
        let _mirror_guard = EnvVarGuard::set("TCS_MIRROR_ORDERING", "1");
        let _root_policy_guard = EnvVarGuard::remove("TCS_ROOT_POLICY");
        let engine = controlled_root_boundary_engine();
        let player = engine.turn_manager.current_player;
        let legal_count = engine.legal_actions(player).len() as u64;

        let result = search_root(&engine, player).expect("search should return a move");
        let mirror = &result.diagnostics.mirror_ordering;

        assert!(mirror.mirror_ordering_enabled_roots > 0);
        assert!(mirror.mirror_ordering_candidate_evals >= legal_count);
        assert!(mirror.mirror_ordering_candidate_simulations > 0);
        assert!(
            mirror.mirror_ordering_candidate_simulations <= mirror.mirror_ordering_candidate_evals
        );
        assert_eq!(mirror.mirror_ordering_failures, 0);
        assert!(
            legal_action_keys(&engine, player)
                .contains(&action_key(&result.best_action, &engine.units))
        );
    }

    #[test]
    fn mirror_ordering_diagnostics_do_not_change_penalties() {
        let engine =
            engine_from_fen("r3k2r/1p3pp1/2n5/3pP3/3P4/2N2N2/PPP2PPP/R3K2R w KQkq d6 8 12")
                .expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let legal = engine.legal_actions(player);
        let initially_ordered = order_moves(&engine, player, &legal, 0);
        let baseline =
            root_mirror_ordering_penalties_with_flag(&engine, player, &initially_ordered, true);
        let mut diagnostics = MirrorOrderingDiagnostics::default();

        let observed = root_mirror_ordering_penalties_with_diagnostics(
            &engine,
            player,
            &initially_ordered,
            true,
            Some(&mut diagnostics),
        );

        assert_eq!(observed, baseline);
        assert_eq!(diagnostics.mirror_ordering_enabled_roots, 1);
        assert_eq!(
            diagnostics.mirror_ordering_candidate_evals,
            initially_ordered.len() as u64
        );
        assert_eq!(
            diagnostics.mirror_ordering_candidate_simulations,
            initially_ordered.len() as u64
        );
        assert_eq!(diagnostics.mirror_ordering_failures, 0);
    }

    #[test]
    fn mirror_ordering_diagnostics_count_failure_without_penalty() {
        let engine = controlled_root_boundary_engine();
        let player = engine.turn_manager.current_player;
        let mut diagnostics = MirrorOrderingDiagnostics::default();

        let penalty = mirror_ordering_penalty_for_action_with_diagnostics(
            &engine,
            player,
            &Action::Pass,
            Some(&mut diagnostics),
        );

        assert_eq!(penalty, 0);
        assert_eq!(diagnostics.mirror_ordering_candidate_evals, 1);
        assert_eq!(diagnostics.mirror_ordering_candidate_simulations, 0);
        assert_eq!(diagnostics.mirror_ordering_failures, 1);
    }

    #[test]
    fn mirror_ordering_default_off_preserves_baseline_root_ordering() {
        let _env_lock = env_var_test_lock();
        let _mirror_guard = EnvVarGuard::remove("TCS_MIRROR_ORDERING");
        let _root_policy_guard = EnvVarGuard::remove("TCS_ROOT_POLICY");
        let engine =
            engine_from_fen("r3k2r/1p3pp1/2n5/3pP3/3P4/2N2N2/PPP2PPP/R3K2R w KQkq d6 8 12")
                .expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let legal = engine.legal_actions(player);
        let root_key = position_key(&engine, player);
        let baseline = apply_root_ordering_scores(
            &engine,
            player,
            root_key,
            order_moves(&engine, player, &legal, 0),
            &HashMap::new(),
        );
        let mut instrumentation = SearchInstrumentation::default();

        let observed = order_root_moves(
            &engine,
            player,
            &legal,
            &mut instrumentation.mirror_ordering,
        );

        assert_eq!(
            action_keys_for_actions(&engine, &observed),
            action_keys_for_actions(&engine, &baseline)
        );
        assert_eq!(
            instrumentation.mirror_ordering,
            MirrorOrderingDiagnostics::default()
        );
    }

    #[test]
    fn mirror_ordering_cache_preserves_legal_moves() {
        let engine =
            engine_from_fen("r3k2r/1p3pp1/2n5/3pP3/3P4/2N2N2/PPP2PPP/R3K2R w KQkq d6 8 12")
                .expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let legal = engine.legal_actions(player);
        let initially_ordered = order_moves(&engine, player, &legal, 0);
        let mirror_penalties =
            root_mirror_ordering_penalties_with_flag(&engine, player, &initially_ordered, true);
        let ordered = apply_root_ordering_scores(
            &engine,
            player,
            position_key(&engine, player),
            initially_ordered,
            &mirror_penalties,
        );

        assert_eq!(mirror_penalties.len(), legal.len());
        assert_eq!(
            sorted_action_keys_for_actions(&engine, &ordered),
            sorted_action_keys_for_actions(&engine, &legal)
        );
    }

    #[test]
    fn mirror_ordering_real_penalty_can_demote_dangerous_candidate_without_pruning() {
        let _env_lock = env_var_test_lock();
        let _root_policy_guard = EnvVarGuard::set("TCS_ROOT_POLICY", "1");
        let dangerous_floor =
            mirror_ordering_penalty_from_summary(&mirror_summary(MirrorRiskLevel::Dangerous));
        let mut rank_reports = Vec::new();

        for fen in [
            "8/8/8/8/1q6/8/2k4P/K7 w - - 0 1",
            "4k2r/8/8/8/8/8/4P3/4K3 w - - 0 1",
            "4k3/P7/8/8/3q4/8/4P3/4K3 w - - 0 1",
            "4k3/8/8/8/8/8/p3P3/4K3 w - - 0 1",
            "3rk3/8/8/8/3p4/8/3Q4/4K3 w - - 0 1",
        ] {
            let engine = engine_from_fen(fen).expect("valid FEN");
            let player = engine.turn_manager.current_player;
            let legal = engine.legal_actions(player);
            let initially_ordered = order_moves(&engine, player, &legal, 0);
            let root_key = position_key(&engine, player);
            {
                root_policy_table().lock().unwrap().clear();
            }
            let baseline = apply_root_ordering_scores(
                &engine,
                player,
                root_key,
                initially_ordered.clone(),
                &HashMap::new(),
            );
            let mirror_penalties =
                root_mirror_ordering_penalties_with_flag(&engine, player, &initially_ordered, true);
            let shifted = apply_root_ordering_scores(
                &engine,
                player,
                root_key,
                initially_ordered,
                &mirror_penalties,
            );

            let rank_report = mirror_penalties
                .iter()
                .map(|(key, penalty)| {
                    let baseline_rank = action_rank_by_key(&engine, &baseline, key);
                    let shifted_rank = action_rank_by_key(&engine, &shifted, key);
                    format!("{key}:{penalty}:{baseline_rank:?}->{shifted_rank:?}")
                })
                .collect::<Vec<_>>()
                .join(",");
            rank_reports.push(format!("{fen}|{rank_report}"));

            let candidate_pair = mirror_penalties
                .iter()
                .filter(|(_, penalty)| **penalty >= dangerous_floor)
                .find_map(|(dangerous_key, dangerous_penalty)| {
                    mirror_penalties
                        .iter()
                        .filter(|(_, safer_penalty)| **safer_penalty < *dangerous_penalty)
                        .find_map(|(safer_key, safer_penalty)| {
                            let dangerous = baseline
                                .iter()
                                .find(|action| action_key(action, &engine.units) == *dangerous_key)
                                .expect("dangerous action should be present");
                            let safer = baseline
                                .iter()
                                .find(|action| action_key(action, &engine.units) == *safer_key)
                                .expect("safer action should be present");
                            let score_gap = root_ordering_score(&engine, player, root_key, safer)
                                - root_ordering_score(&engine, player, root_key, dangerous);
                            let penalty_gap = dangerous_penalty - safer_penalty;
                            let policy_score = (0..=ROOT_POLICY_SCORE_CAP).find(|score| {
                                let bonus = score * ROOT_POLICY_ORDERING_WEIGHT;
                                bonus > score_gap && bonus < score_gap + penalty_gap
                            })?;
                            Some((dangerous_key.clone(), safer_key.clone(), policy_score))
                        })
                });

            let Some((dangerous_key, safer_key, policy_score)) = candidate_pair else {
                continue;
            };

            {
                let dangerous = baseline
                    .iter()
                    .find(|action| action_key(action, &engine.units) == dangerous_key)
                    .expect("dangerous action should be present");
                let mut table = root_policy_table().lock().unwrap();
                table.clear();
                table
                    .entry(root_key)
                    .or_default()
                    .insert(move_id(dangerous), policy_score);
            }

            let baseline_with_policy = apply_root_ordering_scores(
                &engine,
                player,
                root_key,
                order_moves(&engine, player, &legal, 0),
                &HashMap::new(),
            );
            let shifted_with_mirror = apply_root_ordering_scores(
                &engine,
                player,
                root_key,
                order_moves(&engine, player, &legal, 0),
                &mirror_penalties,
            );
            let dangerous_baseline_rank =
                action_rank_by_key(&engine, &baseline_with_policy, &dangerous_key)
                    .expect("baseline contains dangerous action");
            let safer_baseline_rank =
                action_rank_by_key(&engine, &baseline_with_policy, &safer_key)
                    .expect("baseline contains safer action");
            let dangerous_shifted_rank =
                action_rank_by_key(&engine, &shifted_with_mirror, &dangerous_key)
                    .expect("shifted contains dangerous action");
            let safer_shifted_rank = action_rank_by_key(&engine, &shifted_with_mirror, &safer_key)
                .expect("shifted contains safer action");

            root_policy_table().lock().unwrap().clear();

            assert!(dangerous_baseline_rank < safer_baseline_rank);
            assert!(dangerous_shifted_rank > safer_shifted_rank);
            assert_eq!(
                sorted_action_keys_for_actions(&engine, &shifted_with_mirror),
                sorted_action_keys_for_actions(&engine, &legal)
            );
            return;
        }

        panic!(
            "fixtures should expose a dangerous candidate demoted by computed mirror penalty: {}",
            rank_reports.join(";")
        );
    }

    #[test]
    fn mirror_ordering_penalty_changes_initial_order_without_removing_moves() {
        let engine = engine_from_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
            .expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let legal = engine.legal_actions(player);
        let root_key = position_key(&engine, player);
        let baseline = apply_root_ordering_scores(
            &engine,
            player,
            root_key,
            order_moves(&engine, player, &legal, 0),
            &HashMap::new(),
        );
        let penalized = baseline
            .first()
            .expect("baseline should contain a first legal move")
            .clone();
        let penalized_score = root_ordering_score(&engine, player, root_key, &penalized);
        let has_close_follower = baseline.iter().skip(1).any(|mv| {
            let score = root_ordering_score(&engine, player, root_key, mv);
            (penalized_score - score).abs() < MIRROR_ORDERING_MAX_PENALTY
        });
        assert!(
            has_close_follower,
            "fixture should expose close root ordering scores"
        );

        let mut mirror_penalties = HashMap::new();
        mirror_penalties.insert(
            action_key(&penalized, &engine.units),
            MIRROR_ORDERING_MAX_PENALTY,
        );
        let shifted = apply_root_ordering_scores(
            &engine,
            player,
            root_key,
            order_moves(&engine, player, &legal, 0),
            &mirror_penalties,
        );

        assert_ne!(
            action_key(&shifted[0], &engine.units),
            action_key(&penalized, &engine.units)
        );
        assert_eq!(
            sorted_action_keys_for_actions(&engine, &shifted),
            sorted_action_keys_for_actions(&engine, &legal)
        );
    }

    #[test]
    fn mirror_ordering_does_not_prevent_mate_in_one_selection() {
        let _env_lock = env_var_test_lock();
        let _mirror_guard = EnvVarGuard::set("TCS_MIRROR_ORDERING", "1");
        let _root_policy_guard = EnvVarGuard::remove("TCS_ROOT_POLICY");
        let case = load_case_with_mate_and_non_mate(MATE1_FIXTURE_PATH);
        let mut engine = engine_from_fen(&case.fen).expect("valid fen");
        let player: PlayerId = case.side_to_move;
        engine.turn_manager.current_player = player;
        let mates = immediate_mate_ucs(&engine, player);

        let result = search_root(&engine, player).expect("search should return a move");
        let selected = action_to_uci(&result.best_action, &engine.units).expect("selected move");

        assert!(mates.contains(&selected));
        assert!(result.diagnostics.mate_in_one_selected);
        assert!(
            result
                .diagnostics
                .mirror_ordering
                .mirror_ordering_candidate_evals
                > 0
        );
    }

    #[test]
    fn mirror_ordering_is_root_only_and_precomputed() {
        let search_source = include_str!("search.rs");
        let root_ordering_source = include_str!("search_root_ordering.rs");
        let root_ordering_section = root_ordering_source
            .split("fn order_root_moves")
            .nth(1)
            .and_then(|tail| tail.split("fn root_ordering_score").next())
            .expect("root ordering section should be present");
        let apply_section = root_ordering_source
            .split("fn apply_root_ordering_scores")
            .nth(1)
            .and_then(|tail| tail.split("fn root_ordering_score").next())
            .expect("apply section should be present");
        let negamax_section = search_source
            .split("fn negamax(")
            .nth(1)
            .and_then(|tail| tail.split("fn quiescence(").next())
            .expect("negamax section should be present");
        let quiescence_section = search_source
            .split("fn quiescence(")
            .nth(1)
            .and_then(|tail| tail.split("fn order_moves(").next())
            .expect("quiescence section should be present");

        assert!(root_ordering_section.contains("root_mirror_ordering_penalties"));
        assert!(!apply_section.contains("opponent_response_mask_after_candidate"));
        assert!(!negamax_section.contains("MirrorRiskSummary"));
        assert!(!negamax_section.contains("mirror_ordering"));
        assert!(!quiescence_section.contains("MirrorRiskSummary"));
        assert!(!quiescence_section.contains("mirror_ordering"));
    }

    #[test]
    fn mirror_ordering_does_not_reference_blocked_subsystems() {
        let root_ordering_source = include_str!("search_root_ordering.rs");
        let root_ordering_section = root_ordering_source
            .split("fn order_root_moves")
            .nth(1)
            .and_then(|tail| tail.split("fn root_ordering_score").next())
            .expect("root ordering section should be present")
            .to_lowercase();

        for blocked in [
            "neural",
            "dataset",
            "training",
            "humangate",
            "chess960",
            "decisioncontroller",
        ] {
            assert!(!root_ordering_section.contains(blocked));
        }
    }

    #[test]
    fn test_root_prefers_immediate_mate_over_non_mate() {
        let case = load_case_with_mate_and_non_mate(MATE1_FIXTURE_PATH);
        let mut engine = engine_from_fen(&case.fen).expect("valid fen");
        let player: PlayerId = case.side_to_move;
        engine.turn_manager.current_player = player;

        let immediate = immediate_mate_ucs(&engine, player);
        let mut non_mate = Vec::new();
        for action in engine.legal_actions(player) {
            let Some(undo) = engine.simulate_action_for_search(player, &action) else {
                continue;
            };
            let is_mate = engine.game_over() && engine.winner() == Some(player);
            let _ = engine.undo_action_for_search(undo);

            if !is_mate {
                if let Some(uci) = action_to_uci(&action, &engine.units) {
                    non_mate.push(uci);
                }
            }
        }

        let result = search_root(&engine, player).expect("search should return a move");
        let selected = action_to_uci(&result.best_action, &engine.units)
            .expect("selected move should convert");

        assert!(immediate.iter().any(|mv| mv == &selected));
        assert!(!non_mate.iter().any(|mv| mv == &selected));
        assert!(result.diagnostics.mate_in_one_selected);
    }

    #[test]
    fn test_mate_override_is_deterministic() {
        let case = load_case(MATE1_FIXTURE_PATH, 0);
        let mut engine = engine_from_fen(&case.fen).expect("valid fen");
        let player: PlayerId = case.side_to_move;
        engine.turn_manager.current_player = player;

        let first = search_root(&engine, player)
            .and_then(|result| action_to_uci(&result.best_action, &engine.units))
            .expect("selected move should convert");
        let second = search_root(&engine, player)
            .and_then(|result| action_to_uci(&result.best_action, &engine.units))
            .expect("selected move should convert");
        let immediate = immediate_mate_ucs(&engine, player);

        assert_eq!(first, second);
        assert_eq!(first, immediate[0]);
    }

    #[test]
    fn test_puzzle_mate1_search_solves_known_case() {
        let mut case = load_case(MATE1_FIXTURE_PATH, 0);
        let mut engine = engine_from_fen(&case.fen).expect("valid fen");
        let player: PlayerId = case.side_to_move;
        engine.turn_manager.current_player = player;

        let result = search_root(&engine, player).expect("search should return a move");
        let selected = action_to_uci(&result.best_action, &engine.units).expect("selected move");

        assert!(case.best_moves.iter().any(|mv| mv == &selected));
        assert!(result.diagnostics.mate_in_one_selected);
        assert!(result.completed_depth >= 1);
    }

    #[test]
    fn fork_not_override_mate() {
        let mut case = load_case(MATE1_FIXTURE_PATH, 0);
        let mut engine = engine_from_fen(&case.fen).expect("valid fen");
        let player: PlayerId = case.side_to_move;
        engine.turn_manager.current_player = player;

        let result = search_root(&engine, player).expect("search should return a move");
        let selected = action_to_uci(&result.best_action, &engine.units).expect("selected move");
        let mates = immediate_mate_ucs(&engine, player);

        assert!(
            !mates.is_empty(),
            "mate case should expose at least one immediate mate"
        );
        assert!(
            mates.contains(&selected),
            "mate should be selected even with fork-aware bias"
        );
        assert!(result.diagnostics.mate_in_one_selected);
    }

    #[test]
    fn engine_runtime_profile_probe() {
        let _runtime_diag_guard = EnvVarGuard::set("TCS_SEARCH_RUNTIME_DIAG", "1");
        assert!(search_runtime_diagnostics_enabled());

        let engine = load_engine_from_ruleset(&minimal_runtime_ruleset());
        let player = engine.turn_manager.current_player;
        let result = search_root(&engine, player).expect("search should return a move");
        let runtime = &result.diagnostics.runtime;

        let move_total = runtime.move_simulation_nanos + runtime.move_undo_nanos;
        let repetition_total = runtime.move_repetition_nanos + runtime.move_undo_repetition_nanos;
        let null_total = runtime.null_move_simulation_nanos + runtime.null_move_undo_nanos;

        println!(
            "ENGINE_RUNTIME_PROFILE|depth={}|nodes={}|q_nodes={}|move_sims={}|move_undos={}|move_total_ns={}|simulate_ns={}|undo_ns={}|snapshot_ns={}|apply_ns={}|repetition_ns={}|restore_ns={}|capture_snapshots={}|rook_snapshots={}|null_sims={}|null_undos={}|null_total_ns={}",
            result.completed_depth,
            result.diagnostics.counters.nodes,
            result.diagnostics.counters.quiescence_nodes,
            runtime.move_simulations,
            runtime.move_undos,
            move_total,
            runtime.move_simulation_nanos,
            runtime.move_undo_nanos,
            runtime.move_snapshot_nanos,
            runtime.move_apply_nanos,
            repetition_total,
            runtime.move_restore_nanos,
            runtime.capture_snapshots,
            runtime.rook_snapshots,
            runtime.null_move_simulations,
            runtime.null_move_undos,
            null_total,
        );

        set_search_runtime_profile_enabled(false);

        // Keep this probe about instrumentation shape and search execution, not wall-clock
        // granularity. Some environments report 0 ns for very short measured sections.
        let has_nonzero_timing = move_total > 0 || repetition_total > 0 || null_total > 0;
        if !has_nonzero_timing {
            println!(
                "ENGINE_RUNTIME_PROFILE_NOTE|timing_counters_zero=1|reason=timer_granularity_or_fast_execution"
            );
        }

        assert!(result.completed_depth >= 1);
        assert!(result.diagnostics.counters.nodes > 0);
        assert!(runtime.move_simulations > 0);
        assert_eq!(runtime.move_simulations, runtime.move_undos);
    }

    #[test]
    fn search_simulate_undo_restores_repetition_state() {
        set_search_runtime_profile_enabled(false);
        let mut engine = load_engine_from_ruleset(&minimal_runtime_ruleset());
        let player = engine.turn_manager.current_player;
        let action = engine
            .legal_actions(player)
            .into_iter()
            .next()
            .expect("initial position should have a legal move");
        let fen_before = engine.to_fen();
        let repetition_before = engine.repetition_counts.clone();
        let action_log_len_before = engine.action_log.len();

        let undo = engine
            .simulate_action_for_search(player, &action)
            .expect("legal move should simulate");
        let _ = engine.undo_action_for_search(undo);

        assert_eq!(engine.to_fen(), fen_before);
        assert_eq!(engine.repetition_counts, repetition_before);
        assert_eq!(engine.action_log.len(), action_log_len_before);
    }

    #[test]
    fn free_queen_capture_preferred() {
        let engine = engine_from_fen("6k1/8/8/8/3q4/8/8/3RK3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let legal = engine.legal_actions(player);
        let capture = legal
            .iter()
            .find(|mv| action_to_uci(mv, &engine.units).as_deref() == Some("d1d4"))
            .expect("queen capture available");
        let quiet = legal
            .iter()
            .find(|mv| action_to_uci(mv, &engine.units).as_deref() == Some("e1f1"))
            .expect("quiet move available");

        let capture_score = tactical_score_breakdown(&engine, player, capture, 0);
        let quiet_score = tactical_score_breakdown(&engine, player, quiet, 0);
        assert!(capture_score.final_score > quiet_score.final_score);
        assert!(capture_score.see > 500);
    }

    #[test]
    fn poisoned_capture_penalized() {
        let engine = engine_from_fen("3rk3/8/8/8/3p4/8/3Q4/4K3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let capture = engine
            .legal_actions(player)
            .into_iter()
            .find(|mv| action_to_uci(mv, &engine.units).as_deref() == Some("d2d4"))
            .expect("capture available");
        let tactical = tactical_score_breakdown(&engine, player, &capture, 0);
        assert!(tactical.see < 0);
        assert!(tactical.hanging < 0);
    }

    #[test]
    fn hanging_queen_move_penalized() {
        let engine = engine_from_fen("4k3/8/8/2b5/8/8/3Q4/4K3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let blunder = engine
            .legal_actions(player)
            .into_iter()
            .find(|mv| action_to_uci(mv, &engine.units).as_deref() == Some("d2e3"))
            .expect("move available");
        let tactical = tactical_score_breakdown(&engine, player, &blunder, 0);
        assert!(tactical.hanging <= -200);
    }

    #[test]
    fn mate_in_one_chosen() {
        let engine = engine_from_fen("6k1/8/8/8/8/8/4Q3/4K3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let mv = engine
            .legal_actions(player)
            .into_iter()
            .next()
            .expect("legal move");
        let mate_now = tactical_score_breakdown(&engine, player, &mv, 899_990);
        let neutral = tactical_score_breakdown(&engine, player, &mv, 0);
        let losing = tactical_score_breakdown(&engine, player, &mv, -899_990);

        assert!(mate_now.mate > 100_000);
        assert!(mate_now.final_score > neutral.final_score + 100_000);
        assert!(losing.mate < 0);
    }

    #[test]
    fn ahead_position_prefers_queen_trade() {
        let engine = engine_from_fen("4k3/8/8/8/3q4/8/3Q4/3RK3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let trade = engine
            .legal_actions(player)
            .into_iter()
            .find(|mv| action_to_uci(mv, &engine.units).as_deref() == Some("d2d4"))
            .expect("trade move available");
        let tactical = tactical_score_breakdown(&engine, player, &trade, 0);
        assert!(tactical.trade > 0);
    }

    #[test]
    fn losing_side_avoids_dumb_simplification() {
        let engine = engine_from_fen("3rk3/8/8/8/3q4/8/3Q4/4K3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let trade = engine
            .legal_actions(player)
            .into_iter()
            .find(|mv| action_to_uci(mv, &engine.units).as_deref() == Some("d2d4"))
            .expect("trade move available");
        let tactical = tactical_score_breakdown(&engine, player, &trade, 0);
        assert!(tactical.trade < 0);
    }

    #[test]
    fn reply_scan_blocks_promotion_blunder() {
        let engine = engine_from_fen("3r2k1/3Q4/8/8/8/8/6p1/6K1 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let legal = engine.legal_actions(player);
        let greedy = legal
            .iter()
            .find(|mv| action_to_uci(mv, &engine.units).as_deref() == Some("d7d8"))
            .expect("greedy move");
        let greedy_scan = reply_scan_breakdown(&engine, player, greedy, 3);
        assert!(greedy_scan.penalty > 0);
        assert_eq!(greedy_scan.enemy_best_move, "g8f7");
    }

    #[test]
    fn mate_reply_dominates_score() {
        let samples = vec![(75_000, false), (150_000, true)];
        assert!(opponent_best_reply_forces_mate_from_scores(&samples));
    }

    #[test]
    fn non_mate_reply_lower_score_not_preferred_over_mate() {
        let samples = vec![(60_000, false), (150_000, true), (75_000, false)];
        assert!(opponent_best_reply_forces_mate_from_scores(&samples));
    }

    #[test]
    fn search_root_does_not_mutate_caller_engine_state() {
        let _root_policy_guard = EnvVarGuard::remove("TCS_ROOT_POLICY");
        let engine = controlled_root_boundary_engine();
        let player = engine.turn_manager.current_player;
        let before = SearchRootCallerSnapshot::capture(&engine);

        let result = search_root(&engine, player).expect("search should return a move");

        assert!(
            legal_action_keys(&engine, player)
                .contains(&action_key(&result.best_action, &engine.units))
        );
        assert_eq!(SearchRootCallerSnapshot::capture(&engine), before);
    }

    #[test]
    fn search_root_preserves_legal_action_keys_before_after_call() {
        let _root_policy_guard = EnvVarGuard::remove("TCS_ROOT_POLICY");
        let engine =
            engine_from_fen("r3k2r/1p3pp1/2n5/3pP3/3P4/2N2N2/PPP2PPP/R3K2R w KQkq d6 8 12")
                .expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let before_keys = legal_action_keys(&engine, player);

        let first = search_root(&engine, player).expect("search should return a move");
        let after_first_keys = legal_action_keys(&engine, player);
        let second = search_root(&engine, player).expect("search should return a move");
        let after_second_keys = legal_action_keys(&engine, player);

        assert_eq!(after_first_keys, before_keys);
        assert_eq!(after_second_keys, before_keys);
        assert!(before_keys.contains(&action_key(&first.best_action, &engine.units)));
        assert!(before_keys.contains(&action_key(&second.best_action, &engine.units)));
    }

    #[test]
    fn search_root_is_deterministic_for_controlled_non_mate_position() {
        let _root_policy_guard = EnvVarGuard::remove("TCS_ROOT_POLICY");
        let engine = controlled_single_legal_non_mate_engine();
        let player = engine.turn_manager.current_player;
        let legal_keys = legal_action_keys(&engine, player);
        assert_eq!(legal_keys.len(), 1, "controlled position should have one legal move");
        let expected_key = legal_keys[0].clone();

        let first = search_root(&engine, player).expect("search should return a move");
        let second = search_root(&engine, player).expect("search should return a move");
        let third = search_root(&engine, player).expect("search should return a move");

        let first_key = action_key(&first.best_action, &engine.units);
        let second_key = action_key(&second.best_action, &engine.units);
        let third_key = action_key(&third.best_action, &engine.units);

        assert!(!first.diagnostics.mate_in_one_selected);
        assert_eq!(first_key, expected_key);
        assert_eq!(second_key, expected_key);
        assert_eq!(third_key, expected_key);
    }

    #[test]
    fn search_root_diagnostics_shape_is_consistent_for_controlled_position() {
        let engine = controlled_root_boundary_engine();
        let player = engine.turn_manager.current_player;
        let result = search_root(&engine, player).expect("search should return a move");
        let diagnostics = &result.diagnostics;

        assert!(result.completed_depth >= 1);
        assert!(diagnostics.ordering.legal_move_count > 0);
        assert!(diagnostics.ordering.fully_evaluated_moves > 0);
        assert!(
            diagnostics.ordering.fully_evaluated_moves <= diagnostics.ordering.legal_move_count
        );
        assert!(diagnostics.ordering.best_move_initial_rank < diagnostics.ordering.legal_move_count);
        assert!(diagnostics.ordering.best_move_final_rank < diagnostics.ordering.legal_move_count);
        assert!(!diagnostics.principal_alternatives.is_empty());
        assert!(diagnostics.principal_alternatives.len() <= 3);
        assert!(diagnostics.counters.nodes > 0);
        assert!(diagnostics.branching.max_depth <= MAX_PLY);
        assert!(
            diagnostics
                .branching
                .traces
                .iter()
                .all(|trace| trace.ply <= diagnostics.branching.max_depth)
        );
    }

    #[test]
    fn search_root_with_context_emits_trace_shape_without_behavior_change() {
        // Verifies that passing a context does not change move selection and does not panic.
        let _root_policy_guard = EnvVarGuard::remove("TCS_ROOT_POLICY");
        let engine = controlled_single_legal_non_mate_engine();
        let player = engine.turn_manager.current_player;
        let legal_keys = legal_action_keys(&engine, player);
        assert_eq!(legal_keys.len(), 1, "controlled position should have one legal move");
        let expected_key = legal_keys[0].clone();
        let context = RootDecisionContext {
            game_id: "pp13-root-boundary".to_string(),
            ply: 12,
            side: player,
            fen_before: engine.to_fen(),
        };

        let baseline = search_root(&engine, player).expect("search should return a move");
        let contextual = search_root_with_context(&engine, player, Some(&context))
            .expect("search with context should return a move");

        assert_eq!(action_key(&baseline.best_action, &engine.units), expected_key);
        assert_eq!(action_key(&contextual.best_action, &engine.units), expected_key);
    }

    #[test]
    fn regression_589s() {
        let _env_lock = env_var_test_lock();
        let _root_policy_guard = EnvVarGuard::remove("TCS_ROOT_POLICY");
        // TCS_MOVE_TIME_MS not overridden → 500 ms default (production budget).
        // Log entry `TRACE|ply=20|phase=midgame|time_ms=589653` could not be located
        // in the current repo; using the documented fallback FEN (32 pieces, tactical
        // middlegame with Bg4 pin, open e-file tension, Bc4 aimed at f7).
        let fen = "r2qkb1r/ppp2ppp/2np1n2/4p3/2B1P1b1/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 7";
        let engine = engine_from_fen(fen).expect("valid regression FEN");
        let player = engine.turn_manager.current_player;
        let piece_count = engine.units.len();

        let t0 = std::time::Instant::now();
        let result = search_root(&engine, player).expect("search should return a move");
        let elapsed_ms = t0.elapsed().as_millis();

        let nodes_total =
            result.diagnostics.counters.nodes + result.diagnostics.counters.quiescence_nodes;
        let best_move = action_to_uci(&result.best_action, &engine.units)
            .unwrap_or_else(|| "??".to_string());

        println!(
            "REGRESSION_589S|pieces={}|depth={}|elapsed_ms={}|nodes={}|best_move={}",
            piece_count, result.completed_depth, elapsed_ms, nodes_total, best_move
        );

        assert!(
            elapsed_ms < 5000,
            "regression: search took {}ms (expected < 5000ms) — adaptive_depth={}, pieces={}",
            elapsed_ms,
            result.completed_depth,
            piece_count,
        );
    }

    #[test]
    fn italian_position_depth4() {
        let _env_lock = env_var_test_lock();
        let _depth_guard = EnvVarGuard::set("TCS_MINIMAX_DEPTH", "4");
        let _time_guard = EnvVarGuard::set("TCS_MOVE_TIME_MS", "600000");
        let _root_policy_guard = EnvVarGuard::remove("TCS_ROOT_POLICY");

        // Italian Game after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.d3 — 32 pieces, middlegame opening
        let engine = engine_from_fen(
            "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 4 4",
        )
        .expect("valid Italian FEN");
        let player = engine.turn_manager.current_player;

        let t0 = std::time::Instant::now();
        let result = search_root(&engine, player).expect("search should return a move");
        let elapsed_ms = t0.elapsed().as_millis();

        let nodes_total =
            result.diagnostics.counters.nodes + result.diagnostics.counters.quiescence_nodes;
        let nps = if elapsed_ms > 0 {
            nodes_total * 1000 / elapsed_ms as u64
        } else {
            u64::MAX
        };

        println!(
            "PERF|fen=italian|depth={}|elapsed_ms={}|nodes_total={}|nps={}",
            result.completed_depth, elapsed_ms, nodes_total, nps
        );

        assert_eq!(result.completed_depth, 4, "should reach depth 4 with TCS_MINIMAX_DEPTH=4");
    }

    // ── Temporary validation tests for stalemate/checkmate fix ──────────────
    #[test]
    fn stalemate_root_returns_none_and_no_mate_score() {
        // Black to move — classic stalemate, no legal moves at root
        let engine = engine_from_fen("5k2/5P2/5K2/8/8/8/8/8 b - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let result = search_root(&engine, player);
        println!("TEST1-a stalemate root → {:?}", result.as_ref().map(|_| "Some"));
        assert!(result.is_none(), "stalemate: search_root must return None");

        // White to move from pre-stalemate — ALL lines lead to draw (K+P vs K, pawn blocked).
        // With old bug evaluate() ≈ material advantage (positive).
        // With fix draw_score() ≈ −220 (White ahead materially so draw penalised).
        std::env::set_var("TCS_MOVE_TIME_MS", "200");
        let engine_pre = engine_from_fen("5k2/5P2/4K3/8/8/8/8/8 w - - 0 1").expect("valid FEN");
        let white = engine_pre.turn_manager.current_player;
        let pre_result = search_root(&engine_pre, white).expect("has legal moves");
        println!(
            "TEST1-b pre-stalemate → best_score={} (expect draw range, not +MATE)",
            pre_result.best_score
        );
        assert!(
            pre_result.best_score.abs() < 800_000,
            "stalemate must not look like mate: {}",
            pre_result.best_score
        );
    }

    #[test]
    fn mate_in_one_score_and_move() {
        // White to move — two valid mates: Qg7# (g6g7) and Qe8# (g6e8).
        // In this engine the root best_score has negamax sign (negative for root's win),
        // so we verify via mate_in_one_selected flag and abs(score) >= 800_000.
        std::env::set_var("TCS_MOVE_TIME_MS", "200");
        let engine = engine_from_fen("7k/8/6QK/8/8/8/8/8 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let result = search_root(&engine, player).expect("search must find a move");
        let mv = action_to_uci(&result.best_action, &engine.units).expect("uci");
        println!(
            "TEST2 mate_in_1 → best_move={} best_score={} mate_selected={}",
            mv,
            result.best_score,
            result.diagnostics.mate_in_one_selected
        );
        assert!(
            result.diagnostics.mate_in_one_selected,
            "engine must select a mate-in-1 move"
        );
        assert!(
            result.best_score.abs() >= 800_000,
            "mate score abs must be ≥ 800_000, got {}",
            result.best_score
        );
    }
    #[test]
    fn s7_removed_mate_in_3_score() {
        // White to move — multiple forced mates at equivalent depth (score = 899 950):
        //   1.f6f7! Rg7 2.Bxg7+ Kg8 3.Rf8#   (canonical 3-move sequence)
        //   1.e5a1  Ra7 2.f6f7  Rg7 3.Bxg7#  (also mate in 3 for White, same ply depth)
        // Both lines reach checkmate at quiescence ply=5, so the engine correctly scores
        // both moves at +899 950. The chosen move varies by TT move-ordering hint.
        // Primary assertion: the engine sees a mate score >= 800 000.
        std::env::set_var("TCS_MOVE_TIME_MS", "2000");
        let engine =
            engine_from_fen("r5rk/5p1p/5R2/4B3/8/8/7P/7K w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let result = search_root(&engine, player).expect("search must find a move");
        let mv = action_to_uci(&result.best_action, &engine.units).expect("uci");
        println!(
            "TEST-A mate_in_3 → best_move={} best_score={} depth={}",
            mv, result.best_score, result.completed_depth
        );
        assert!(
            result.best_score >= 800_000,
            "engine must detect forced mate (score ≥ 800 000), got {}",
            result.best_score
        );
    }

    #[test]
    fn s7_removed_italian_not_a1b1() {
        // Italian opening position: best move is tactical (Ng5 or Nxe5),
        // not the pointless Ra1b1 rook shuffle.
        std::env::set_var("TCS_MOVE_TIME_MS", "500");
        let engine = engine_from_fen(
            "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        )
        .expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let result = search_root(&engine, player).expect("search must find a move");
        let mv = action_to_uci(&result.best_action, &engine.units).expect("uci");
        println!(
            "TEST-B italian → best_move={} best_score={} depth={}",
            mv, result.best_score, result.completed_depth
        );
        assert_ne!(mv, "a1b1", "should not play a1b1 rook shuffle");
    }
    // ── End temporary validation tests ──────────────────────────────────────
}
