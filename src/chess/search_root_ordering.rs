use crate::chess::practical_policy::tactical_score_breakdown;
use crate::chess::search::{
    move_score, order_moves, position_key, root_policy_score, ROOT_POLICY_ORDERING_WEIGHT,
};
use crate::chess::search_mirror_ordering::{
    root_mirror_ordering_penalties, MirrorOrderingDiagnostics,
};
use crate::chess::uci::action_key;
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::PlayerId;

use std::collections::HashMap;

pub(crate) fn order_root_moves(
    engine: &Engine,
    player: PlayerId,
    actions: &[Action],
    mirror_diagnostics: &mut MirrorOrderingDiagnostics,
) -> Vec<Action> {
    let root_key = position_key(engine, player);
    let ordered = order_moves(engine, player, actions, 0);
    let mirror_penalties =
        root_mirror_ordering_penalties(engine, player, &ordered, mirror_diagnostics);
    apply_root_ordering_scores(engine, player, root_key, ordered, &mirror_penalties)
}

pub(crate) fn apply_root_ordering_scores(
    engine: &Engine,
    player: PlayerId,
    root_key: u64,
    ordered: Vec<Action>,
    mirror_penalties: &HashMap<String, i32>,
) -> Vec<Action> {
    let mut scored: Vec<(i32, Action)> = ordered
        .into_iter()
        .map(|mv| {
            let penalty = mirror_penalties
                .get(&action_key(&mv, &engine.units))
                .copied()
                .unwrap_or(0);
            let score = root_ordering_score(engine, player, root_key, &mv) - penalty;
            (score, mv)
        })
        .collect();

    scored.sort_by(|a, b| b.0.cmp(&a.0));
    scored.into_iter().map(|(_, mv)| mv).collect()
}

pub(crate) fn root_ordering_score(
    engine: &Engine,
    player: PlayerId,
    root_key: u64,
    mv: &Action,
) -> i32 {
    move_score(engine, player, mv)
        + tactical_score_breakdown(engine, player, mv, 0).see
        + root_policy_score(root_key, mv) * ROOT_POLICY_ORDERING_WEIGHT
}
