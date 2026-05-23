use crate::chess::eval::static_evaluate;
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::PlayerId;

#[derive(Clone, Copy, Debug)]
pub(crate) struct WorstCaseCutoff {
    pub(crate) relative_floor: i32,
    pub(crate) terminal_floor: i32,
}

fn game_analysis_full_enabled() -> bool {
    std::env::var("TCS_GAME_ANALYSIS_FULL").ok().as_deref() == Some("1")
}

fn fast_trace_mode_enabled() -> bool {
    std::env::var("TCS_FAST_TRACE").ok().as_deref() == Some("1")
}

fn opponent_worst_case_max_replies() -> usize {
    if game_analysis_full_enabled() {
        return usize::MAX;
    }

    if fast_trace_mode_enabled() {
        return 6;
    }

    std::env::var("TCS_WORST_CASE_MAX_REPLIES")
        .ok()
        .and_then(|value| value.parse::<usize>().ok())
        .filter(|value| *value > 0)
        .unwrap_or(12)
}

pub(crate) fn opponent_worst_case_value(
    engine: &Engine,
    player: PlayerId,
    action: &Action,
    cutoff: Option<WorstCaseCutoff>,
) -> i32 {
    let fallback_value = static_evaluate(engine, player);
    let mut simulated = engine.clone();
    let Some(action_undo) = simulated.simulate_action_for_search(player, action) else {
        return fallback_value;
    };

    let opponent = simulated.opponent(player);
    let mut worst_value = static_evaluate(&simulated, player);
    for reply in simulated.legal_actions(opponent).into_iter().take(opponent_worst_case_max_replies()) {
        let Some(reply_undo) = simulated.simulate_action_for_search(opponent, &reply) else {
            continue;
        };
        let reply_value = static_evaluate(&simulated, player);
        let _ = simulated.undo_action_for_search(reply_undo);

        worst_value = worst_value.min(reply_value);
        if let Some(cutoff) = cutoff {
            if worst_value <= cutoff.relative_floor || worst_value <= cutoff.terminal_floor {
                let _ = simulated.undo_action_for_search(action_undo);
                return worst_value;
            }
        }
    }

    let _ = simulated.undo_action_for_search(action_undo);
    worst_value
}
