use crate::chess::move_features::progress_move_score;
use crate::chess::practical_policy::{
    phase_profile_rerank_bonus, quiet_non_progress_penalty, reply_scan_breakdown,
    reply_scan_enabled, strategic_candidate_breakdown, tactical_score_breakdown,
};
use crate::chess::uci::action_to_uci;
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::PlayerId;

const ROOT_PRACTICAL_MARGIN: i32 = 22;
const ROOT_DECISION_SEARCH_WEIGHT: i32 = 16;
const ROOT_DECISION_HEURISTIC_WEIGHT: i32 = 2;
const ROOT_DECISION_POLICY_WEIGHT: i32 = 3;
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
    search_score: i32,
    transition_score: i32,
}

#[derive(Clone, Debug)]
pub(crate) struct RootDecisionContext {
    pub game_id: String,
    pub ply: u32,
    pub side: PlayerId,
    pub fen_before: String,
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
            search_score,
            transition_score,
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
}
