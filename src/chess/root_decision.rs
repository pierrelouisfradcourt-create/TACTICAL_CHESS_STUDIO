use crate::chess::eval::{is_winning_endgame, material_balance};
use crate::chess::move_features::{is_shuffle_move, progress_move_score};
use crate::chess::practical_policy::{
    is_conversion_move, phase_profile_practical_bonus, phase_profile_rerank_bonus,
    quiet_non_progress_penalty, reply_scan_breakdown, reply_scan_enabled,
    strategic_candidate_breakdown, tactical_score_breakdown,
};
use crate::chess::transition_analysis::{analyze_transition, TransitionDynamic};
use crate::chess::transition_reply::opponent_worst_case_value;
use crate::chess::uci::action_to_uci;
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::{PlayerId, Position};
use std::collections::HashMap;

const ROOT_PRACTICAL_MARGIN: i32 = 22;
const ROOT_DECISION_SEARCH_WEIGHT: i32 = 16;
const ROOT_DECISION_HEURISTIC_WEIGHT: i32 = 2;
const ROOT_DECISION_POLICY_WEIGHT: i32 = 3;
const ROOT_NO_PROGRESS_PENALTY_WEIGHT: i32 = 2;
const ROOT_CONVERSION_CHOICE_BONUS: i32 = 90;
const ROOT_FORK_PRACTICAL_BONUS: i32 = 500;
const CLEAR_EDGE_MATERIAL: i32 = 250;
const ROOT_WORST_CASE_SEARCH_GATE: i32 = 80;

pub(crate) struct RootDecisionHooks<'a> {
    pub(crate) move_score: &'a dyn Fn(&Action) -> i32,
    pub(crate) root_policy_score: &'a dyn Fn(u64, &Action) -> i32,
}

#[derive(Clone, Debug)]
struct RankedMove {
    idx: usize,
    action: Action,
    breakdown: RootDecisionBreakdown,
    worst_case: i32,
    worst_case_sampled: bool,
    search_score: i32,
    transition_score: i32,
    transition: Option<RootDecisionTransitionSignal>,
}

#[derive(Clone, Debug)]
pub(crate) struct RootDecisionContext {
    pub game_id: String,
    pub ply: u32,
    pub side: PlayerId,
    pub fen_before: String,
}

#[derive(Clone, Debug)]
pub(crate) struct RootDecisionTraceCandidate {
    pub action: String,
    pub search_score: i32,
    pub worst_case: i32,
    pub worst_case_sampled: bool,
    pub transition_score: i32,
    pub search_rank: usize,
    pub worst_case_rank: usize,
    pub transition_rank: usize,
    pub final_rank: usize,
    pub inside_gate: bool,
}

#[derive(Clone, Debug)]
pub(crate) struct RootDecisionTrace {
    pub game_id: String,
    pub ply: u32,
    pub side: PlayerId,
    pub fen_before: String,
    pub chosen_move: String,
    pub search_best_move: String,
    pub worst_case_best_move: String,
    pub transition_best_move: String,
    pub chosen_search_rank: usize,
    pub chosen_worst_case_rank: usize,
    pub chosen_transition_rank: usize,
    pub chosen_search_score: i32,
    pub chosen_worst_case: i32,
    pub chosen_transition_score: i32,
    pub candidate_count: usize,
    pub legal_count: usize,
    pub filtered_out_count: usize,
    pub top_candidates: Vec<RootDecisionTraceCandidate>,
}

#[derive(Clone, Debug)]
struct RootDecisionTransitionSignal {
    primary_dynamic: Option<TransitionDynamic>,
    secondary_dynamics: Vec<TransitionDynamic>,
    capture_exchange: i32,
    capture_safety: i32,
    tactical_score: i32,
    repetition_signal: i32,
    resulting_state_value: i32,
}

#[derive(Clone, Copy, Debug, Default)]
pub(crate) struct RootDecisionBreakdown {
    pub(crate) heuristic_score: i32,
    pub(crate) policy_score: i32,
    #[allow(dead_code)]
    pub(crate) strategic_score: i32,
    #[allow(dead_code)]
    pub(crate) tactical_score: i32,
    #[allow(dead_code)]
    pub(crate) reply_penalty: i32,
    pub(crate) final_score: i32,
}

pub(crate) fn root_practical_margin(best_score: i32) -> i32 {
    if best_score >= 250 {
        ROOT_PRACTICAL_MARGIN + 20
    } else if best_score >= 120 {
        ROOT_PRACTICAL_MARGIN + 10
    } else {
        ROOT_PRACTICAL_MARGIN
    }
}

fn game_analysis_full_enabled() -> bool {
    std::env::var("TCS_GAME_ANALYSIS_FULL").ok().as_deref() == Some("1")
}

pub(crate) fn select_root_move(
    engine: &Engine,
    player: PlayerId,
    root_key: u64,
    ordered: &[Action],
    scores: &[i32],
    best_score: i32,
    opponent_mate_in_one: &[bool],
    fork_moves: &[bool],
    hooks: &RootDecisionHooks<'_>,
    analysis_context: Option<&RootDecisionContext>,
) -> (usize, Option<RootDecisionTrace>) {
    let margin = root_practical_margin(best_score);

    let candidate_indices: Vec<usize> = (0..scores.len())
        .filter(|&i| scores[i] >= best_score - margin)
        .collect();

    let has_fork_moves_in_candidates = candidate_indices
        .iter()
        .any(|&i| fork_moves.get(i).copied().unwrap_or(false));

    let filtered_indices: Vec<usize> = if has_fork_moves_in_candidates {
        candidate_indices
            .into_iter()
            .filter(|&i| fork_moves.get(i).copied().unwrap_or(false))
            .collect()
    } else {
        candidate_indices
    };

    let has_safe_candidate = filtered_indices
        .iter()
        .any(|&idx| !opponent_mate_in_one.get(idx).copied().unwrap_or(false));

    let mut candidates = Vec::new();
    let sample_full_trace = analysis_context
        .as_ref()
        .map(|context| should_trace_full_ply(context.ply))
        .unwrap_or(true);
    let fast_trace = fast_trace_mode_enabled();
    let mut reply_scan_log_budget = if sample_full_trace && !fast_trace {
        reply_scan_log_limit()
    } else {
        0
    };
    let top_n = root_decision_audit_top_n();
    let collect_candidate_logs = sample_full_trace && (!fast_trace || analysis_context.is_some());
    let max_worst_case_candidates = root_worst_case_max_candidates();
    let expected_best = std::env::var("TCS_EXPECTED_BEST_MOVE").ok();
    let mut candidate_position_by_idx = HashMap::with_capacity(filtered_indices.len());

    for &idx in &filtered_indices {
        let mv = &ordered[idx];

        if has_safe_candidate && opponent_mate_in_one.get(idx).copied().unwrap_or(false) {
            continue;
        }

        let breakdown = root_decision_breakdown(
            engine,
            player,
            root_key,
            mv,
            scores[idx],
            hooks,
            &mut reply_scan_log_budget,
        );
        let practical =
            apply_root_practical_adjustments(engine, player, mv, scores[idx], breakdown)
                + if has_fork_moves_in_candidates && fork_moves.get(idx).copied().unwrap_or(false) {
                    ROOT_FORK_PRACTICAL_BONUS
                } else {
                    0
                };
        let transition = if root_decision_audit_enabled() {
            let analysis = analyze_transition(engine, player, mv, scores[idx]);
            Some(RootDecisionTransitionSignal {
                primary_dynamic: analysis.primary_dynamic,
                secondary_dynamics: analysis.secondary_dynamics,
                capture_exchange: analysis.capture_exchange_score.unwrap_or(0),
                capture_safety: analysis.capture_safety_signal,
                tactical_score: analysis.tactical_score,
                repetition_signal: analysis.repetition_signal,
                resulting_state_value: analysis.resulting_state_value,
            })
        } else {
            None
        };
        candidates.push(RankedMove {
            idx,
            action: *mv,
            breakdown,
            worst_case: scores[idx],
            worst_case_sampled: false,
            search_score: scores[idx],
            transition_score: practical,
            transition,
        });
        candidate_position_by_idx.insert(idx, candidates.len() - 1);
    }

    let mut search_ranked_candidates = candidates.clone();
    search_ranked_candidates.sort_by(|a, b| root_decision_search_rank(a, b, engine));
    for (sample_rank, sampled_candidate) in search_ranked_candidates.iter().enumerate() {
        if sample_rank >= max_worst_case_candidates {
            break;
        }
        if let Some(&position) = candidate_position_by_idx.get(&sampled_candidate.idx) {
            let full_worst_case =
                opponent_worst_case_value(engine, player, &sampled_candidate.action, None);
            if let Some(candidate) = candidates.get_mut(position) {
                candidate.worst_case = full_worst_case;
                candidate.worst_case_sampled = true;
            }
        }
    }

    search_ranked_candidates = candidates.clone();
    search_ranked_candidates.sort_by(|a, b| root_decision_search_rank(a, b, engine));
    let mut original_search_rank_by_idx = HashMap::with_capacity(candidates.len());
    for (rank, candidate) in search_ranked_candidates.iter().enumerate() {
        original_search_rank_by_idx.insert(candidate.idx, rank + 1);
    }

    let mut ranked_candidates =
        rank_root_candidates_with_worst_case_search_gate(&candidates, engine);
    let mut root_analysis_trace = None;
    let collect_ranks = root_decision_audit_enabled() || analysis_context.is_some();

    let mut worst_case_rank_by_idx = HashMap::with_capacity(candidates.len());
    let mut transition_rank_by_idx = HashMap::with_capacity(candidates.len());
    let mut worst_case_ranked = candidates.clone();
    let mut transition_ranked = candidates.clone();
    let mut chosen_search_score = 0;
    let mut chosen_worst_case = 0;
    let mut chosen_transition_score = 0;
    let mut search_best = String::from("unknown");
    let mut worst_case_best = String::from("unknown");
    let mut transition_best = String::from("unknown");
    let mut inside_gate_threshold = i32::MIN / 2;

    if collect_ranks {
        if candidates.is_empty() {
            if let Some(context) = analysis_context {
                return (
                    filtered_indices.first().copied().unwrap_or(0),
                    Some(RootDecisionTrace {
                        game_id: context.game_id.clone(),
                        ply: context.ply,
                        side: context.side,
                        fen_before: context.fen_before.clone(),
                        chosen_move: "unknown".to_string(),
                        search_best_move: "unknown".to_string(),
                        worst_case_best_move: "unknown".to_string(),
                        transition_best_move: "unknown".to_string(),
                        chosen_search_rank: 0,
                        chosen_worst_case_rank: 0,
                        chosen_transition_rank: 0,
                        chosen_search_score: 0,
                        chosen_worst_case: 0,
                        chosen_transition_score: 0,
                        candidate_count: 0,
                        legal_count: scores.len(),
                        filtered_out_count: scores.len(),
                        top_candidates: Vec::new(),
                    }),
                );
            }
            return (filtered_indices.first().copied().unwrap_or(0), None);
        }

        worst_case_ranked.sort_by(|a, b| {
            b.worst_case.cmp(&a.worst_case).then_with(|| {
                let a_uci = action_to_uci(&a.action, &engine.units).unwrap_or_default();
                let b_uci = action_to_uci(&b.action, &engine.units).unwrap_or_default();
                a_uci.cmp(&b_uci)
            })
        });

        transition_ranked.sort_by(|a, b| {
            b.transition_score.cmp(&a.transition_score).then_with(|| {
                let a_uci = action_to_uci(&a.action, &engine.units).unwrap_or_default();
                let b_uci = action_to_uci(&b.action, &engine.units).unwrap_or_default();
                a_uci.cmp(&b_uci)
            })
        });

        for (rank, candidate) in worst_case_ranked.iter().enumerate() {
            worst_case_rank_by_idx.insert(candidate.idx, rank + 1);
        }
        for (rank, candidate) in transition_ranked.iter().enumerate() {
            transition_rank_by_idx.insert(candidate.idx, rank + 1);
        }

        let best_search_score = search_ranked_candidates
            .first()
            .map(|candidate| candidate.search_score)
            .unwrap_or(i32::MIN);
        chosen_search_score = search_ranked_candidates
            .first()
            .map(|candidate| candidate.search_score)
            .unwrap_or(0);
        inside_gate_threshold = best_search_score - ROOT_WORST_CASE_SEARCH_GATE;
        search_best = search_ranked_candidates
            .first()
            .and_then(|candidate| action_to_uci(&candidate.action, &engine.units))
            .unwrap_or_else(|| "unknown".to_string());
        worst_case_best = worst_case_ranked
            .first()
            .and_then(|candidate| action_to_uci(&candidate.action, &engine.units))
            .unwrap_or_else(|| "unknown".to_string());
        transition_best = transition_ranked
            .first()
            .and_then(|candidate| action_to_uci(&candidate.action, &engine.units))
            .unwrap_or_else(|| "unknown".to_string());

        if root_decision_audit_enabled() && collect_candidate_logs {
            for (selected_rank, candidate) in ranked_candidates.iter().enumerate() {
                if selected_rank >= top_n {
                    break;
                }
                let original_rank = original_search_rank_by_idx
                    .get(&candidate.idx)
                    .copied()
                    .unwrap_or(0);
                let worst_case_rank = worst_case_rank_by_idx
                    .get(&candidate.idx)
                    .copied()
                    .unwrap_or(0);
                let transition_rank = transition_rank_by_idx
                    .get(&candidate.idx)
                    .copied()
                    .unwrap_or(0);
                let inside_gate = candidate.search_score >= inside_gate_threshold;
                let mv = &candidate.action;
                let primary_dynamic = candidate
                    .transition
                    .as_ref()
                    .and_then(|signal| signal.primary_dynamic)
                    .map(transition_dynamic_to_str)
                    .unwrap_or("none");
                let secondary_dynamics = candidate
                    .transition
                    .as_ref()
                    .map(|signal| {
                        signal
                            .secondary_dynamics
                            .iter()
                            .map(|dynamic| transition_dynamic_to_str(*dynamic))
                            .collect::<Vec<_>>()
                            .join(",")
                    })
                    .unwrap_or_default();
                let capture_exchange = candidate
                    .transition
                    .as_ref()
                    .map(|signal| signal.capture_exchange)
                    .unwrap_or(0);
                let capture_safety = candidate
                    .transition
                    .as_ref()
                    .map(|signal| signal.capture_safety)
                    .unwrap_or(0);
                let tactical_score = candidate
                    .transition
                    .as_ref()
                    .map(|signal| signal.tactical_score)
                    .unwrap_or(0);
                let repetition_signal = candidate
                    .transition
                    .as_ref()
                    .map(|signal| signal.repetition_signal)
                    .unwrap_or(0);
                let resulting_state_value = candidate
                    .transition
                    .as_ref()
                    .map(|signal| signal.resulting_state_value)
                    .unwrap_or(0);
                println!(
                    "ROOT_DECISION_SIGNAL|move={}|candidate_idx={}|search_score={}|search_rank={}|worst_case={}|worst_case_sampled={}|worst_case_rank={}|transition_score={}|transition_rank={}|final_rank={}|inside_gate={}|primary_dynamic={}|secondary_dynamics={}|capture_exchange={}|capture_safety={}|tactical_score={}|repetition_signal={}|resulting_state_value={}",
                    action_to_uci(mv, &engine.units).unwrap_or_else(|| "unknown".to_string()),
                    candidate.idx,
                    candidate.search_score,
                    original_rank,
                    candidate.worst_case,
                    if candidate.worst_case_sampled { 1 } else { 0 },
                    worst_case_rank,
                    candidate.transition_score,
                    transition_rank,
                    selected_rank + 1,
                    if inside_gate { 1 } else { 0 },
                    primary_dynamic,
                    secondary_dynamics,
                    capture_exchange,
                    capture_safety,
                    tactical_score,
                    repetition_signal,
                    resulting_state_value,
                );
                println!(
                    "ROOT_DECISION_AUDIT|move={}|worst_case={}|worst_case_sampled={}|search_score={}|transition_score={}|selected_rank={}|search_best_rank={}",
                    action_to_uci(mv, &engine.units).unwrap_or_else(|| "unknown".to_string()),
                    candidate.worst_case,
                    if candidate.worst_case_sampled { 1 } else { 0 },
                    candidate.search_score,
                    candidate.transition_score,
                    selected_rank + 1,
                    original_rank,
                );
            }

        }

        if collect_candidate_logs {
            for (selected_rank, candidate) in ranked_candidates.iter().enumerate() {
                if selected_rank >= top_n {
                    break;
                }
                let mv = &candidate.action;
                if reply_scan_enabled() && std::env::var("TCS_DEBUG").is_ok() {
                    println!(
                        "ROOT_CANDIDATE_SCORE|move={}|base={}|policy={}|reply_penalty={}|tactical={}|heuristic={}|strategic={}|decision_final={}|worst_case={}|search_score={}|transition_score={}",
                        action_to_uci(mv, &engine.units).unwrap_or_else(|| "unknown".to_string()),
                        candidate.search_score,
                        candidate.breakdown.policy_score,
                        candidate.breakdown.reply_penalty,
                        candidate.breakdown.tactical_score,
                        candidate.breakdown.heuristic_score,
                        candidate.breakdown.strategic_score,
                        candidate.breakdown.final_score,
                        candidate.worst_case,
                        candidate.search_score,
                        candidate.transition_score,
                    );
                }
            }
        }

        if let Some(context) = analysis_context {
            let top_limit = if game_analysis_full_enabled() {
                usize::MAX
            } else {
                top_n
            };
            let mut top_candidates = Vec::new();
            for (final_rank, candidate) in ranked_candidates.iter().enumerate() {
                if final_rank >= top_limit {
                    break;
                }
                let idx = candidate.idx;
                top_candidates.push(RootDecisionTraceCandidate {
                    action: action_to_uci(&candidate.action, &engine.units)
                        .unwrap_or_else(|| "unknown".to_string()),
                    search_score: candidate.search_score,
                    worst_case: candidate.worst_case,
                    worst_case_sampled: candidate.worst_case_sampled,
                    transition_score: candidate.transition_score,
                    search_rank: original_search_rank_by_idx.get(&idx).copied().unwrap_or(0),
                    worst_case_rank: worst_case_rank_by_idx.get(&idx).copied().unwrap_or(0),
                    transition_rank: transition_rank_by_idx.get(&idx).copied().unwrap_or(0),
                    final_rank: final_rank + 1,
                    inside_gate: candidate.search_score >= inside_gate_threshold,
                });
            }
            let chosen_idx = ranked_candidates
                .first()
                .map(|candidate| candidate.idx)
                .unwrap_or_else(|| filtered_indices.first().copied().unwrap_or(0));
            let chosen_move = ranked_candidates
                .first()
                .and_then(|candidate| action_to_uci(&candidate.action, &engine.units))
                .unwrap_or_else(|| "unknown".to_string());
            let fallback_candidate = RankedMove {
                idx: chosen_idx,
                action: Action::Pass,
                breakdown: RootDecisionBreakdown::default(),
                worst_case: 0,
                worst_case_sampled: false,
                search_score: 0,
                transition_score: 0,
                transition: None,
            };
            let chosen_candidate = ranked_candidates.first().unwrap_or(&fallback_candidate);
            chosen_worst_case = chosen_candidate.worst_case;
            chosen_transition_score = chosen_candidate.transition_score;
            root_analysis_trace = Some(RootDecisionTrace {
                game_id: context.game_id.clone(),
                ply: context.ply,
                side: context.side,
                fen_before: context.fen_before.clone(),
                chosen_move,
                search_best_move: search_best.clone(),
                worst_case_best_move: worst_case_best.clone(),
                transition_best_move: transition_best.clone(),
                chosen_search_rank: original_search_rank_by_idx
                    .get(&chosen_idx)
                    .copied()
                    .unwrap_or(0),
                chosen_worst_case_rank: worst_case_rank_by_idx
                    .get(&chosen_idx)
                    .copied()
                    .unwrap_or(0),
                chosen_transition_rank: transition_rank_by_idx
                    .get(&chosen_idx)
                    .copied()
                    .unwrap_or(0),
                chosen_search_score,
                chosen_worst_case,
                chosen_transition_score,
                candidate_count: candidates.len(),
                legal_count: scores.len(),
                filtered_out_count: scores.len().saturating_sub(candidates.len()),
                top_candidates,
            });
        }
    }

    let final_selected = ranked_candidates
        .first()
        .and_then(|candidate| action_to_uci(&candidate.action, &engine.units))
        .unwrap_or_else(|| "unknown".to_string());
    if std::env::var("TCS_DEBUG").is_ok() {
        println!(
            "ROOT_DECISION_SELECTED|selected={}|search_best={}|worst_case_best={}|transition_best={}|final_selected={}|expected_best_if_available={}",
            final_selected,
            search_best,
            worst_case_best,
            transition_best,
            final_selected,
            expected_best.unwrap_or_else(|| "none".to_string())
        );
    }

    let selected_idx = ranked_candidates
        .first()
        .map(|candidate| candidate.idx)
        .unwrap_or_else(|| filtered_indices.first().copied().unwrap_or(0));
    (selected_idx, root_analysis_trace)
}

fn rank_root_candidates_with_worst_case_search_gate(
    candidates: &[RankedMove],
    engine: &Engine,
) -> Vec<RankedMove> {
    if candidates.is_empty() {
        return Vec::new();
    }

    let best_search_score = candidates
        .iter()
        .map(|candidate| candidate.search_score)
        .max()
        .unwrap_or(i32::MIN);
    let mut gated_candidates: Vec<RankedMove> = candidates
        .iter()
        .filter(|candidate| {
            candidate.search_score >= best_search_score - ROOT_WORST_CASE_SEARCH_GATE
        })
        .cloned()
        .collect();

    if gated_candidates.is_empty() {
        gated_candidates = candidates.to_vec();
    }

    gated_candidates.sort_by(|a, b| {
        b.worst_case
            .cmp(&a.worst_case)
            .then_with(|| b.search_score.cmp(&a.search_score))
            .then_with(|| b.transition_score.cmp(&a.transition_score))
            .then_with(|| {
                let a_uci = action_to_uci(&a.action, &engine.units).unwrap_or_default();
                let b_uci = action_to_uci(&b.action, &engine.units).unwrap_or_default();
                a_uci.cmp(&b_uci)
            })
    });

    gated_candidates
}

fn sort_ranked_moves(candidates: &mut [RankedMove], engine: &Engine) {
    candidates.sort_by(|a, b| {
        b.worst_case
            .cmp(&a.worst_case)
            .then(b.search_score.cmp(&a.search_score))
            .then(b.transition_score.cmp(&a.transition_score))
            .then_with(|| {
                let a_uci = action_to_uci(&a.action, &engine.units).unwrap_or_default();
                let b_uci = action_to_uci(&b.action, &engine.units).unwrap_or_default();
                a_uci.cmp(&b_uci)
            })
    });
}

fn root_decision_audit_enabled() -> bool {
    std::env::var("TCS_ROOT_DECISION_AUDIT").ok().as_deref() == Some("1")
}

fn root_worst_case_max_candidates() -> usize {
    if game_analysis_full_enabled() {
        return usize::MAX;
    }

    if fast_trace_mode_enabled() {
        return 4;
    }

    std::env::var("TCS_ROOT_WORST_CASE_MAX_CANDIDATES")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(8)
}

fn fast_trace_mode_enabled() -> bool {
    std::env::var("TCS_FAST_TRACE").ok().as_deref() == Some("1")
}

fn root_trace_sample_every_n() -> u32 {
    std::env::var("TCS_TRACE_SAMPLE_EVERY_N")
        .ok()
        .and_then(|value| value.parse::<u32>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(1)
}

pub(crate) fn should_trace_full_ply(ply: u32) -> bool {
    ply % root_trace_sample_every_n() == 0
}

fn root_decision_audit_top_n() -> usize {
    std::env::var("TCS_ROOT_DECISION_AUDIT_TOP_N")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(5)
}

fn reply_scan_log_limit() -> usize {
    std::env::var("TCS_REPLY_SCAN_LIMIT")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(5)
}

fn root_decision_search_rank(
    a: &RankedMove,
    b: &RankedMove,
    engine: &Engine,
) -> std::cmp::Ordering {
    b.search_score.cmp(&a.search_score).then_with(|| {
        let a_uci = action_to_uci(&a.action, &engine.units).unwrap_or_default();
        let b_uci = action_to_uci(&b.action, &engine.units).unwrap_or_default();
        a_uci.cmp(&b_uci)
    })
}

fn transition_dynamic_to_str(dynamic: TransitionDynamic) -> &'static str {
    match dynamic {
        TransitionDynamic::Mate => "mate",
        TransitionDynamic::Quiet => "quiet",
        TransitionDynamic::Capture => "capture",
        TransitionDynamic::Promotion => "promotion",
        TransitionDynamic::Check => "check",
        TransitionDynamic::Castling => "castling",
        TransitionDynamic::Recapture => "recapture",
        TransitionDynamic::PassedPawnAdvance => "passed_pawn_advance",
        TransitionDynamic::Conversion => "conversion",
        TransitionDynamic::RepetitionRisk => "repetition_risk",
    }
}

#[allow(dead_code)]
fn root_fork_strength(engine: &Engine, player: PlayerId, mv: &Action) -> (usize, i32, bool, bool) {
    let Action::Move {
        unit_id, target, ..
    } = mv
    else {
        return (0, 0, false, false);
    };

    let Some(unit) = engine.units.get(unit_id) else {
        return (0, 0, false, false);
    };

    let mut target_count = 0;
    let mut target_value = 0;
    let mut gives_check = false;

    for target_unit in engine.units.values() {
        if target_unit.owner == player {
            continue;
        }

        if attacks_square(engine, unit.kind, player, *target, target_unit.position) {
            target_count += 1;
            target_value += fork_target_value(target_unit.kind);
            if matches!(
                target_unit.kind,
                crate::chess::piece_kind::ChessPieceKind::King
            ) {
                gives_check = true;
            }
        }
    }

    let captures = engine
        .units
        .values()
        .any(|target_unit| target_unit.owner != player && target_unit.position == *target);

    (target_count, target_value, gives_check, captures)
}

#[allow(dead_code)]
fn fork_target_value(kind: crate::chess::piece_kind::ChessPieceKind) -> i32 {
    match kind {
        crate::chess::piece_kind::ChessPieceKind::Queen => 9,
        crate::chess::piece_kind::ChessPieceKind::Rook => 5,
        crate::chess::piece_kind::ChessPieceKind::Bishop
        | crate::chess::piece_kind::ChessPieceKind::Knight => 3,
        crate::chess::piece_kind::ChessPieceKind::Pawn => 1,
        crate::chess::piece_kind::ChessPieceKind::King => 0,
    }
}

pub(crate) fn is_root_fork_move(engine: &Engine, player: PlayerId, mv: &Action) -> bool {
    let Action::Move { unit_id, .. } = mv else {
        return false;
    };

    let Some(unit) = engine.units.get(unit_id) else {
        return false;
    };

    let mut fork_targets = 0;
    let mut has_king_or_queen = false;

    for target in engine.units.values() {
        if target.owner == player {
            continue;
        }

        if attacks_square(engine, unit.kind, player, unit.position, target.position) {
            fork_targets += 1;

            if matches!(
                target.kind,
                crate::chess::piece_kind::ChessPieceKind::King
                    | crate::chess::piece_kind::ChessPieceKind::Queen
            ) {
                has_king_or_queen = true;
            }
        }
    }

    fork_targets >= 2 && has_king_or_queen
}

fn attacks_square(
    engine: &Engine,
    kind: crate::chess::piece_kind::ChessPieceKind,
    owner: PlayerId,
    from: Position,
    to: Position,
) -> bool {
    if from == to {
        return false;
    }

    let dx = to.x as i32 - from.x as i32;
    let dy = to.y as i32 - from.y as i32;
    let adx = dx.abs();
    let ady = dy.abs();

    match kind {
        crate::chess::piece_kind::ChessPieceKind::Pawn => {
            if owner == 1 {
                dy == 1 && adx == 1
            } else {
                dy == -1 && adx == 1
            }
        }
        crate::chess::piece_kind::ChessPieceKind::Knight => {
            (adx == 1 && ady == 2) || (adx == 2 && ady == 1)
        }
        crate::chess::piece_kind::ChessPieceKind::Bishop => {
            adx == ady && path_clear(engine, from, to)
        }
        crate::chess::piece_kind::ChessPieceKind::Rook => {
            (dx == 0 || dy == 0) && path_clear(engine, from, to)
        }
        crate::chess::piece_kind::ChessPieceKind::Queen => {
            ((adx == ady) || dx == 0 || dy == 0) && path_clear(engine, from, to)
        }
        crate::chess::piece_kind::ChessPieceKind::King => adx <= 1 && ady <= 1,
    }
}

fn path_clear(engine: &Engine, from: Position, to: Position) -> bool {
    let step_x = (to.x as i32 - from.x as i32).signum();
    let step_y = (to.y as i32 - from.y as i32).signum();
    let mut x = from.x as i32 + step_x;
    let mut y = from.y as i32 + step_y;

    while x != to.x as i32 || y != to.y as i32 {
        if engine
            .units
            .values()
            .any(|u| u.position.x as i32 == x && u.position.y as i32 == y)
        {
            return false;
        }
        x += step_x;
        y += step_y;
    }

    true
}

#[allow(dead_code)]
pub(crate) fn root_practical_score(
    engine: &Engine,
    player: PlayerId,
    root_key: u64,
    mv: &Action,
    search_score: i32,
    hooks: &RootDecisionHooks<'_>,
) -> i32 {
    let mut reply_scan_log_budget = 0;
    let breakdown = root_decision_breakdown(
        engine,
        player,
        root_key,
        mv,
        search_score,
        hooks,
        &mut reply_scan_log_budget,
    );
    apply_root_practical_adjustments(engine, player, mv, search_score, breakdown)
}

pub(crate) fn apply_root_practical_adjustments(
    engine: &Engine,
    player: PlayerId,
    mv: &Action,
    search_score: i32,
    breakdown: RootDecisionBreakdown,
) -> i32 {
    let mut practical = breakdown.final_score
        + if is_winning_endgame(engine, player) && !is_shuffle_move(engine, player, mv) {
            160
        } else {
            0
        };

    let progress = progress_move_score(engine, player, mv);
    practical -=
        quiet_non_progress_penalty(engine, player, mv, progress) * ROOT_NO_PROGRESS_PENALTY_WEIGHT;

    if material_balance(engine, player) >= CLEAR_EDGE_MATERIAL
        && is_conversion_move(engine, player, mv)
    {
        practical += ROOT_CONVERSION_CHOICE_BONUS;
    }

    practical += phase_profile_practical_bonus(engine, player, mv, search_score);

    practical
}

pub(crate) fn root_decision_breakdown(
    engine: &Engine,
    player: PlayerId,
    root_key: u64,
    mv: &Action,
    search_score: i32,
    hooks: &RootDecisionHooks<'_>,
    reply_scan_log_budget: &mut usize,
) -> RootDecisionBreakdown {
    let progress = progress_move_score(engine, player, mv);
    let strategic_score = strategic_candidate_breakdown(engine, player, mv, search_score).score;
    let tactical = tactical_score_breakdown(engine, player, mv, search_score);
    let reply_scan = reply_scan_breakdown(engine, player, mv, 3);
    let heuristic_score = (hooks.move_score)(mv) + progress * 2
        - quiet_non_progress_penalty(engine, player, mv, progress)
        + phase_profile_rerank_bonus(engine, player, mv, search_score)
        + tactical.final_score;
    let policy_score = (hooks.root_policy_score)(root_key, mv);
    let final_score = search_score * ROOT_DECISION_SEARCH_WEIGHT
        + heuristic_score * ROOT_DECISION_HEURISTIC_WEIGHT
        + strategic_score
        + policy_score * ROOT_DECISION_POLICY_WEIGHT
        - reply_scan.penalty;

    if reply_scan_enabled() && *reply_scan_log_budget > 0 {
        if std::env::var("TCS_DEBUG").is_ok() {
            println!(
                "REPLY_SCAN|move={}|enemy_best={}|penalty={}",
                action_to_uci(mv, &engine.units).unwrap_or_else(|| "unknown".to_string()),
                reply_scan.enemy_best_move,
                reply_scan.penalty,
            );
        }
        *reply_scan_log_budget -= 1;
    }

    RootDecisionBreakdown {
        heuristic_score,
        policy_score,
        strategic_score,
        tactical_score: tactical.final_score,
        reply_penalty: reply_scan.penalty,
        final_score,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chess::fen::engine_from_fen;
    use crate::chess::uci::action_to_uci;

    fn zero_policy_score(_: u64, _: &Action) -> i32 {
        0
    }

    fn quiet_hooks<'a>(move_score: &'a dyn Fn(&Action) -> i32) -> RootDecisionHooks<'a> {
        RootDecisionHooks {
            move_score,
            root_policy_score: &zero_policy_score,
        }
    }

    fn comparison_candidate(
        idx: usize,
        search_score: i32,
        transition_score: i32,
        worst_case: i32,
    ) -> RankedMove {
        RankedMove {
            idx,
            action: Action::Pass,
            breakdown: RootDecisionBreakdown::default(),
            worst_case,
            worst_case_sampled: false,
            search_score,
            transition_score,
            transition: None,
        }
    }

    fn ranked_root_candidates(engine: &Engine, candidates: &[RankedMove]) -> Vec<RankedMove> {
        rank_root_candidates_with_worst_case_search_gate(candidates, engine)
    }

    #[test]
    fn worst_case_cannot_promote_far_search_candidate() {
        let engine = engine_from_fen("6k1/8/8/8/8/8/8/4K3 w - - 0 1").expect("valid FEN");
        let candidates = vec![
            comparison_candidate(0, 1000, 10, 10),
            comparison_candidate(1, 919, 0, 100),
            comparison_candidate(2, 300, 0, 1_000),
        ];
        let ranked = ranked_root_candidates(&engine, &candidates);

        assert_eq!(ranked[0].idx, 0);
    }

    #[test]
    fn worst_case_breaks_tie_inside_search_gate() {
        let engine = engine_from_fen("6k1/8/8/8/8/8/8/4K3 w - - 0 1").expect("valid FEN");
        let candidates = vec![
            comparison_candidate(0, 1000, 0, 100),
            comparison_candidate(1, 960, 20, 500),
            comparison_candidate(2, 960, 100, 300),
        ];
        let ranked = ranked_root_candidates(&engine, &candidates);

        assert_eq!(ranked[0].idx, 1);
    }

    #[test]
    fn search_best_preserved_when_gap_large() {
        let engine = engine_from_fen("6k1/8/8/8/8/8/8/4K3 w - - 0 1").expect("valid FEN");
        let candidates = vec![
            comparison_candidate(0, 1000, 0, 100),
            comparison_candidate(1, 950, 0, 10),
            comparison_candidate(2, 100, 0, 999_999),
        ];
        let ranked = ranked_root_candidates(&engine, &candidates);

        assert_eq!(ranked[0].idx, 0);
    }

    #[test]
    fn best_worst_case_move_always_selected() {
        let engine = engine_from_fen("6k1/8/8/8/8/8/8/4K3 w - - 0 1").expect("valid FEN");
        let mut candidates = vec![
            comparison_candidate(0, 500, 5_000, 900),
            comparison_candidate(1, 100, 100, 1_000),
            comparison_candidate(2, 900, 10_000, 800),
        ];

        sort_ranked_moves(&mut candidates, &engine);

        assert_eq!(candidates[0].idx, 1);
    }

    #[test]
    fn search_score_resolves_worst_case_ties() {
        let engine = engine_from_fen("6k1/8/8/8/8/8/8/4K3 w - - 0 1").expect("valid FEN");
        let mut candidates = vec![
            comparison_candidate(0, 100, 5_000, 1_000),
            comparison_candidate(1, 200, 100, 1_000),
            comparison_candidate(2, 50, 10_000, 900),
        ];

        sort_ranked_moves(&mut candidates, &engine);

        assert_eq!(candidates[0].idx, 1);
    }

    #[test]
    fn transition_score_resolves_final_ties() {
        let engine = engine_from_fen("6k1/8/8/8/8/8/8/4K3 w - - 0 1").expect("valid FEN");
        let mut candidates = vec![
            comparison_candidate(0, 100, 300, 1_000),
            comparison_candidate(1, 100, 500, 1_000),
            comparison_candidate(2, 200, 100, 900),
        ];

        sort_ranked_moves(&mut candidates, &engine);

        assert_eq!(candidates[0].idx, 1);
    }

    #[test]
    fn root_decision_prefers_higher_practical_score_within_margin() {
        let engine = engine_from_fen("6k1/8/8/8/3q4/8/8/3RK3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let ordered: Vec<Action> = ["e1f1", "d1d4"]
            .iter()
            .map(|uci| {
                engine
                    .legal_actions(player)
                    .into_iter()
                    .find(|mv| action_to_uci(mv, &engine.units).as_deref() == Some(*uci))
                    .expect("expected legal move")
            })
            .collect();
        let move_score = |mv: &Action| {
            if action_to_uci(mv, &engine.units).as_deref() == Some("d1d4") {
                1_000
            } else {
                0
            }
        };
        let hooks = quiet_hooks(&move_score);

        let (selected, _) = select_root_move(
            &engine,
            player,
            0,
            &ordered,
            &[100, 99],
            100,
            &[false, false],
            &[false, false],
            &hooks,
            None,
        );

        assert_eq!(selected, 1);
    }

    #[test]
    fn root_decision_keeps_best_search_score_outside_margin() {
        let engine = engine_from_fen("6k1/8/8/8/3q4/8/8/3RK3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let ordered: Vec<Action> = ["e1f1", "d1d4"]
            .iter()
            .map(|uci| {
                engine
                    .legal_actions(player)
                    .into_iter()
                    .find(|mv| action_to_uci(mv, &engine.units).as_deref() == Some(*uci))
                    .expect("expected legal move")
            })
            .collect();
        let move_score = |mv: &Action| {
            if action_to_uci(mv, &engine.units).as_deref() == Some("d1d4") {
                10_000
            } else {
                0
            }
        };
        let hooks = quiet_hooks(&move_score);

        let (selected, _) = select_root_move(
            &engine,
            player,
            0,
            &ordered,
            &[100, 0],
            100,
            &[false, false],
            &[false, false],
            &hooks,
            None,
        );
        assert_eq!(selected, 0);
    }

    #[test]
    fn fork_detection_simple() {
        let engine = engine_from_fen("2q1k3/8/8/1N6/8/8/8/7K b - - 0 1").expect("valid FEN");
        let mut engine = engine;
        let player = engine.turn_manager.current_player;
        let legal = engine.legal_actions(player);

        let fork = legal
            .iter()
            .find(|mv| action_to_uci(mv, &engine.units).as_deref() == Some("c8c6"))
            .expect("fork move available");

        let Some(undo) = engine.simulate_action_for_search(player, fork) else {
            panic!("fork move should simulate");
        };
        let is_fork = is_root_fork_move(&engine, player, fork);
        let _ = engine.undo_action_for_search(undo);

        assert!(is_fork);
    }

    #[test]
    fn fork_priority_over_small_eval_gain() {
        let mut engine = engine_from_fen("2q1k3/8/8/1N6/8/8/8/7K b - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let mut ordered: Vec<Action> = engine
            .legal_actions(player)
            .into_iter()
            .filter(|mv| {
                let uci = action_to_uci(mv, &engine.units).unwrap_or_default();
                matches!(uci.as_str(), "c8c6" | "c8d8")
            })
            .collect();
        ordered.sort_by_key(|mv| action_to_uci(mv, &engine.units).unwrap_or_default());

        assert_eq!(ordered.len(), 2, "expected fork and non-fork moves");

        let fork_idx = ordered
            .iter()
            .position(|mv| action_to_uci(mv, &engine.units).as_deref() == Some("c8c6"))
            .expect("fork move should exist");
        let mut fork_moves = Vec::with_capacity(ordered.len());
        for mv in &ordered {
            let Some(undo) = engine.simulate_action_for_search(player, mv) else {
                panic!("test moves should simulate");
            };
            let is_fork = is_root_fork_move(&engine, player, mv);
            let _ = engine.undo_action_for_search(undo);
            fork_moves.push(is_fork);
        }
        let move_score = |mv: &Action| {
            if action_to_uci(mv, &engine.units).as_deref() == Some("c8d8") {
                200
            } else {
                0
            }
        };
        let hooks = quiet_hooks(&move_score);

        let (selected, _) = select_root_move(
            &engine,
            player,
            0,
            &ordered,
            &[1_000, 1_000],
            1_000,
            &[false, false],
            &fork_moves,
            &hooks,
            None,
        );

        assert_eq!(selected, fork_idx);
    }

    #[test]
    fn test_fork_outside_margin_not_selected() {
        let mut engine = engine_from_fen("2q1k3/8/8/1N6/8/8/8/7K b - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let mut ordered: Vec<Action> = engine
            .legal_actions(player)
            .into_iter()
            .filter(|mv| {
                let uci = action_to_uci(mv, &engine.units).unwrap_or_default();
                matches!(uci.as_str(), "c8c6" | "c8d8")
            })
            .collect();
        ordered.sort_by_key(|mv| action_to_uci(mv, &engine.units).unwrap_or_default());

        assert_eq!(ordered.len(), 2, "expected fork and non-fork moves");

        let best_idx = ordered
            .iter()
            .position(|mv| action_to_uci(mv, &engine.units).as_deref() == Some("c8d8"))
            .expect("best non-fork move should exist");
        let fork_idx = ordered
            .iter()
            .position(|mv| action_to_uci(mv, &engine.units).as_deref() == Some("c8c6"))
            .expect("fork move should exist");
        let mut fork_moves = Vec::with_capacity(ordered.len());
        for mv in &ordered {
            let Some(undo) = engine.simulate_action_for_search(player, mv) else {
                panic!("test moves should simulate");
            };
            let is_fork = is_root_fork_move(&engine, player, mv);
            let _ = engine.undo_action_for_search(undo);
            fork_moves.push(is_fork);
        }
        let mut scores = vec![0; ordered.len()];
        scores[best_idx] = 1_000;
        assert!(fork_moves[fork_idx], "expected fork move to be flagged");
        assert!(!fork_moves[best_idx], "expected best move to be non-fork");
        let move_score = |_mv: &Action| 0;
        let hooks = quiet_hooks(&move_score);

        let (selected, _) = select_root_move(
            &engine,
            player,
            0,
            &ordered,
            &scores,
            1_000,
            &[false, false],
            &fork_moves,
            &hooks,
            None,
        );

        assert_eq!(selected, best_idx);
    }

    #[test]
    fn test_no_fork_in_candidates_no_filter() {
        let mut engine = engine_from_fen("2q1k3/8/8/1N6/8/8/8/7K b - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let mut ordered: Vec<Action> = engine
            .legal_actions(player)
            .into_iter()
            .filter(|mv| {
                let uci = action_to_uci(mv, &engine.units).unwrap_or_default();
                matches!(uci.as_str(), "c8c6" | "c8d8")
            })
            .collect();
        ordered.sort_by_key(|mv| action_to_uci(mv, &engine.units).unwrap_or_default());

        assert_eq!(ordered.len(), 2, "expected fork and non-fork moves");

        let candidate_idx = ordered
            .iter()
            .position(|mv| action_to_uci(mv, &engine.units).as_deref() == Some("c8d8"))
            .expect("candidate non-fork move should exist");
        let fork_idx = ordered
            .iter()
            .position(|mv| action_to_uci(mv, &engine.units).as_deref() == Some("c8c6"))
            .expect("global fork move should exist");
        let mut fork_moves = Vec::with_capacity(ordered.len());
        for mv in &ordered {
            let Some(undo) = engine.simulate_action_for_search(player, mv) else {
                panic!("test moves should simulate");
            };
            let is_fork = is_root_fork_move(&engine, player, mv);
            let _ = engine.undo_action_for_search(undo);
            fork_moves.push(is_fork);
        }
        let mut scores = vec![0; ordered.len()];
        scores[candidate_idx] = 1_000;
        assert!(fork_moves[fork_idx], "expected fork outside candidates");
        assert!(
            !fork_moves[candidate_idx],
            "expected candidate move to be non-fork"
        );

        let move_score = |_mv: &Action| 0;
        let hooks = quiet_hooks(&move_score);

        let (selected, _) = select_root_move(
            &engine,
            player,
            0,
            &ordered,
            &scores,
            1_000,
            &[false, false],
            &fork_moves,
            &hooks,
            None,
        );

        assert_eq!(selected, candidate_idx);
    }

    #[test]
    fn move_with_optional_mate_not_flagged() {
        let engine = engine_from_fen("6k1/8/8/8/3q4/8/8/3RK3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let ordered: Vec<Action> = ["e1f1", "d1d4"]
            .iter()
            .map(|uci| {
                engine
                    .legal_actions(player)
                    .into_iter()
                    .find(|mv| action_to_uci(mv, &engine.units).as_deref() == Some(*uci))
                    .expect("expected legal move")
            })
            .collect();
        let move_score = |mv: &Action| {
            if action_to_uci(mv, &engine.units).as_deref() == Some("d1d4") {
                1_000
            } else {
                0
            }
        };
        let hooks = quiet_hooks(&move_score);

        let (selected, _) = select_root_move(
            &engine,
            player,
            0,
            &ordered,
            &[100, 100],
            100,
            &[true, false],
            &[false, false],
            &hooks,
            None,
        );

        assert_eq!(selected, 1);
    }

    #[test]
    fn worst_case_ranking_overrides_forced_mate_flag_when_all_flagged() {
        let engine = engine_from_fen("6k1/8/8/8/3q4/8/8/3RK3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let ordered: Vec<Action> = ["e1f1", "d1d4"]
            .iter()
            .map(|uci| {
                engine
                    .legal_actions(player)
                    .into_iter()
                    .find(|mv| action_to_uci(mv, &engine.units).as_deref() == Some(*uci))
                    .expect("expected legal move")
            })
            .collect();
        let move_score = |mv: &Action| {
            if action_to_uci(mv, &engine.units).as_deref() == Some("e1f1") {
                10_000
            } else {
                0
            }
        };
        let hooks = quiet_hooks(&move_score);

        let (selected, _) = select_root_move(
            &engine,
            player,
            0,
            &ordered,
            &[100, 100],
            100,
            &[true, true],
            &[false, false],
            &hooks,
            None,
        );

        assert_eq!(selected, 1);
    }
}
