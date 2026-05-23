use crate::chess::root_decision::{root_decision_breakdown, RootDecisionHooks};
use crate::chess::search_diagnostics::{
    DecisionMetrics, OrderingQuality, RootAlternative, RootSearchDiagnostics, SearchCounters,
};
use crate::chess::search_diagnostics_accumulators::SearchInstrumentation;
use crate::chess::transition_analysis::analyze_transition;
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::PlayerId;

const INF: i32 = 1_000_000_000;

pub(super) fn build_root_mate_diagnostics(
    engine: &Engine,
    player: PlayerId,
    best_move: &Action,
    ordered: &[Action],
    scores: &[i32],
    cutoff_index: Option<usize>,
    best_initial_rank: usize,
    instrumentation: SearchInstrumentation,
) -> RootSearchDiagnostics {
    let mut ranked: Vec<RootAlternative> = ordered
        .iter()
        .enumerate()
        .filter_map(|(idx, mv)| {
            let search_score = *scores.get(idx)?;
            if search_score <= -INF / 2 {
                return None;
            }

            Some(RootAlternative {
                action: mv.clone(),
                search_score,
                heuristic_score: 0,
                policy_score: 0,
                decision_score: 0,
                transition_analysis: analyze_transition(engine, player, mv, search_score),
            })
        })
        .collect();

    ranked.sort_by(|a, b| b.search_score.cmp(&a.search_score));
    let chosen_index = ranked
        .iter()
        .position(|alt| same_move(&alt.action, best_move))
        .unwrap_or(0);
    let chosen = ranked
        .get(chosen_index)
        .cloned()
        .unwrap_or_else(|| RootAlternative {
            action: best_move.clone(),
            search_score: 0,
            heuristic_score: 0,
            policy_score: 0,
            decision_score: 0,
            transition_analysis: analyze_transition(engine, player, best_move, 0),
        });

    let best_search_alt = ranked
        .iter()
        .filter(|alt| !same_move(&alt.action, best_move))
        .max_by_key(|alt| alt.search_score)
        .cloned();

    let ordering = build_ordering(
        ordered,
        scores,
        cutoff_index,
        best_initial_rank,
        chosen_index,
    );
    let decision = DecisionMetrics {
        chosen_search_score: chosen.search_score,
        chosen_heuristic_score: 0,
        chosen_policy_score: 0,
        chosen_decision_score: 0,
        chosen_transition_analysis: chosen.transition_analysis.clone(),
        second_best_search_gap: best_search_alt
            .as_ref()
            .map(|alt| chosen.search_score - alt.search_score),
        second_best_decision_gap: None,
    };

    let counters = build_search_counters(&instrumentation, 0, 0);
    let branching = instrumentation.branching.into_diagnostics();
    let runtime = instrumentation.runtime;
    let mirror_ordering = instrumentation.mirror_ordering;

    RootSearchDiagnostics {
        counters,
        runtime,
        mirror_ordering,
        branching,
        ordering,
        decision,
        principal_alternatives: ranked.into_iter().take(3).collect(),
        mate_in_one_selected: true,
    }
}

pub(super) fn build_root_diagnostics(
    engine: &Engine,
    player: PlayerId,
    root_key: u64,
    best_move: &Action,
    ordered: &[Action],
    scores: &[i32],
    cutoff_index: Option<usize>,
    best_initial_rank: usize,
    instrumentation: SearchInstrumentation,
    hooks: &RootDecisionHooks<'_>,
    tt_best_move: Option<Action>,
    countermove: Option<Action>,
) -> RootSearchDiagnostics {
    let mut ranked: Vec<RootAlternative> = ordered
        .iter()
        .enumerate()
        .filter_map(|(idx, mv)| {
            let search_score = *scores.get(idx)?;
            if search_score <= -INF / 2 {
                return None;
            }
            let breakdown =
                root_decision_breakdown(engine, player, root_key, mv, search_score, hooks, &mut 0);
            Some(RootAlternative {
                action: mv.clone(),
                search_score,
                heuristic_score: breakdown.heuristic_score,
                policy_score: breakdown.policy_score,
                decision_score: breakdown.final_score,
                transition_analysis: analyze_transition(engine, player, mv, search_score),
            })
        })
        .collect();

    ranked.sort_by(|a, b| b.decision_score.cmp(&a.decision_score));
    let chosen_index = ranked
        .iter()
        .position(|alt| same_move(&alt.action, best_move))
        .unwrap_or(0);
    let chosen = ranked
        .get(chosen_index)
        .cloned()
        .unwrap_or_else(|| RootAlternative {
            action: best_move.clone(),
            search_score: 0,
            heuristic_score: 0,
            policy_score: 0,
            decision_score: 0,
            transition_analysis: analyze_transition(engine, player, best_move, 0),
        });

    let best_search_alt = ranked
        .iter()
        .filter(|alt| !same_move(&alt.action, best_move))
        .max_by_key(|alt| alt.search_score)
        .cloned();
    let best_decision_alt = ranked
        .iter()
        .filter(|alt| !same_move(&alt.action, best_move))
        .max_by_key(|alt| alt.decision_score)
        .cloned();

    let ordering = build_ordering(
        ordered,
        scores,
        cutoff_index,
        best_initial_rank,
        chosen_index,
    );
    let decision = DecisionMetrics {
        chosen_search_score: chosen.search_score,
        chosen_heuristic_score: chosen.heuristic_score,
        chosen_policy_score: chosen.policy_score,
        chosen_decision_score: chosen.decision_score,
        chosen_transition_analysis: chosen.transition_analysis.clone(),
        second_best_search_gap: best_search_alt
            .as_ref()
            .map(|alt| chosen.search_score - alt.search_score),
        second_best_decision_gap: best_decision_alt
            .as_ref()
            .map(|alt| chosen.decision_score - alt.decision_score),
    };

    let tt_move_order_hit = tt_best_move
        .as_ref()
        .and_then(|tt_best| ordered.first().map(|mv| same_move(mv, tt_best) as u64))
        .unwrap_or(0);
    let countermove_order_hit = countermove
        .as_ref()
        .and_then(|counter| ordered.first().map(|mv| same_move(mv, counter) as u64))
        .unwrap_or(0);
    let counters =
        build_search_counters(&instrumentation, tt_move_order_hit, countermove_order_hit);
    let branching = instrumentation.branching.into_diagnostics();
    let runtime = instrumentation.runtime;
    let mirror_ordering = instrumentation.mirror_ordering;

    RootSearchDiagnostics {
        counters,
        runtime,
        mirror_ordering,
        branching,
        ordering,
        decision,
        principal_alternatives: ranked.into_iter().take(3).collect(),
        mate_in_one_selected: false,
    }
}

pub(super) fn maybe_emit_runtime_diagnostics(diagnostics: &RootSearchDiagnostics) {
    if !search_runtime_diagnostics_enabled() {
        return;
    }

    let runtime = &diagnostics.runtime;
    let move_total = runtime.move_simulation_nanos + runtime.move_undo_nanos;
    let repetition_total = runtime.move_repetition_nanos + runtime.move_undo_repetition_nanos;
    let null_total = runtime.null_move_simulation_nanos + runtime.null_move_undo_nanos;

    println!(
        "SEARCH_RUNTIME_DIAG|nodes={}|q_nodes={}|move_sims={}|move_undos={}|move_total_ns={}|simulate_ns={}|undo_ns={}|snapshot_ns={}|apply_ns={}|repetition_ns={}|restore_ns={}|capture_snapshots={}|rook_snapshots={}|null_sims={}|null_undos={}|null_total_ns={}",
        diagnostics.counters.nodes,
        diagnostics.counters.quiescence_nodes,
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

    for trace in &diagnostics.branching.traces {
        println!(
            "SEARCH_TRACE|ply={}|legal_moves={}|depth={}|nodes={}|q_nodes={}",
            trace.ply, trace.legal_moves, trace.depth, trace.nodes, trace.quiescence_nodes,
        );
    }

    println!(
        "SEARCH_SUMMARY|max_branching={}|avg_branching={:.2}|max_depth={}|nodes_total={}",
        diagnostics.branching.max_branching,
        diagnostics.branching.avg_branching,
        diagnostics.branching.max_depth,
        diagnostics.counters.nodes,
    );

    let mirror = &diagnostics.mirror_ordering;
    if mirror.mirror_ordering_enabled_roots > 0 {
        println!(
            "MIRROR_ORDERING_DIAG|enabled_roots={}|candidate_evals={}|candidate_simulations={}|failures={}|elapsed_ns={}",
            mirror.mirror_ordering_enabled_roots,
            mirror.mirror_ordering_candidate_evals,
            mirror.mirror_ordering_candidate_simulations,
            mirror.mirror_ordering_failures,
            mirror.mirror_ordering_elapsed_nanos,
        );
    }
}

pub(super) fn search_runtime_diagnostics_enabled() -> bool {
    std::env::var("TCS_SEARCH_RUNTIME_DIAG").ok().as_deref() == Some("1")
}

fn build_ordering(
    ordered: &[Action],
    scores: &[i32],
    cutoff_index: Option<usize>,
    best_initial_rank: usize,
    chosen_index: usize,
) -> OrderingQuality {
    OrderingQuality {
        legal_move_count: ordered.len(),
        fully_evaluated_moves: scores.iter().filter(|score| **score > -INF / 2).count(),
        cutoff_index,
        best_move_initial_rank: best_initial_rank,
        best_move_final_rank: chosen_index,
        principal_move_changed: best_initial_rank != chosen_index,
    }
}

fn build_search_counters(
    instrumentation: &SearchInstrumentation,
    tt_move_order_hit: u64,
    countermove_order_hit: u64,
) -> SearchCounters {
    SearchCounters {
        nodes: instrumentation.counters.nodes,
        quiescence_nodes: instrumentation.counters.quiescence_nodes,
        tt_hits: instrumentation.counters.tt_hits,
        tt_cutoffs: instrumentation.counters.tt_cutoffs,
        null_move_attempts: instrumentation.counters.null_move_attempts,
        null_move_cutoffs: instrumentation.counters.null_move_cutoffs,
        beta_cutoffs: instrumentation.counters.beta_cutoffs,
        killer_cutoffs: instrumentation.counters.killer_cutoffs,
        tt_move_order_hits: tt_move_order_hit + instrumentation.counters.tt_move_order_hits,
        countermove_order_hits: countermove_order_hit
            + instrumentation.counters.countermove_order_hits,
        lmr_reductions: instrumentation.counters.lmr_reductions,
        check_extensions: instrumentation.counters.check_extensions,
        pv_researches: instrumentation.counters.pv_researches,
        aspiration_retries: instrumentation.counters.aspiration_retries,
    }
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
