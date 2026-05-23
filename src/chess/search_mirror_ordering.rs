use crate::chess::opponent_response_mask::{
    opponent_response_mask_after_candidate, MirrorRiskLevel, MirrorRiskSummary,
};
use crate::chess::uci::action_key;
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::PlayerId;

use std::collections::HashMap;
use std::time::Instant;

pub(crate) const MIRROR_ORDERING_MAX_PENALTY: i32 = 400;

#[allow(dead_code)]
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct MirrorOrderingDiagnostics {
    pub mirror_ordering_enabled_roots: u64,
    pub mirror_ordering_candidate_evals: u64,
    pub mirror_ordering_candidate_simulations: u64,
    pub mirror_ordering_failures: u64,
    pub mirror_ordering_elapsed_nanos: u64,
}

pub(crate) fn root_mirror_ordering_penalties(
    engine: &Engine,
    player: PlayerId,
    actions: &[Action],
    diagnostics: &mut MirrorOrderingDiagnostics,
) -> HashMap<String, i32> {
    root_mirror_ordering_penalties_with_diagnostics(
        engine,
        player,
        actions,
        mirror_ordering_enabled(),
        Some(diagnostics),
    )
}

#[cfg(test)]
pub(crate) fn root_mirror_ordering_penalties_with_flag(
    engine: &Engine,
    player: PlayerId,
    actions: &[Action],
    enabled: bool,
) -> HashMap<String, i32> {
    root_mirror_ordering_penalties_with_diagnostics(engine, player, actions, enabled, None)
}

#[cfg_attr(not(test), allow(dead_code))]
pub(crate) fn root_mirror_ordering_penalties_with_diagnostics(
    engine: &Engine,
    player: PlayerId,
    actions: &[Action],
    enabled: bool,
    mut diagnostics: Option<&mut MirrorOrderingDiagnostics>,
) -> HashMap<String, i32> {
    if !enabled {
        return HashMap::new();
    }

    let started = Instant::now();
    if let Some(diagnostics) = diagnostics.as_deref_mut() {
        diagnostics.mirror_ordering_enabled_roots += 1;
    }

    let mut penalties = HashMap::new();
    for mv in actions {
        let penalty = mirror_ordering_penalty_for_action_with_diagnostics(
            engine,
            player,
            mv,
            diagnostics.as_deref_mut(),
        );
        penalties.insert(action_key(mv, &engine.units), penalty);
    }

    if let Some(diagnostics) = diagnostics.as_deref_mut() {
        diagnostics.mirror_ordering_elapsed_nanos = diagnostics
            .mirror_ordering_elapsed_nanos
            .saturating_add(started.elapsed().as_nanos().min(u64::MAX as u128) as u64);
    }

    penalties
}

#[cfg(test)]
pub(crate) fn mirror_ordering_penalty_for_action(
    engine: &Engine,
    player: PlayerId,
    mv: &Action,
) -> i32 {
    mirror_ordering_penalty_for_action_with_diagnostics(engine, player, mv, None)
}

#[cfg_attr(not(test), allow(dead_code))]
pub(crate) fn mirror_ordering_penalty_for_action_with_diagnostics(
    engine: &Engine,
    player: PlayerId,
    mv: &Action,
    mut diagnostics: Option<&mut MirrorOrderingDiagnostics>,
) -> i32 {
    if let Some(diagnostics) = diagnostics.as_deref_mut() {
        diagnostics.mirror_ordering_candidate_evals += 1;
    }

    match opponent_response_mask_after_candidate(
        engine,
        player,
        mv,
        None::<fn(&str) -> Option<usize>>,
        None,
    ) {
        Ok(summary) => {
            if let Some(diagnostics) = diagnostics.as_deref_mut() {
                diagnostics.mirror_ordering_candidate_simulations += 1;
            }
            mirror_ordering_penalty_from_summary(&MirrorRiskSummary::from(&summary))
        }
        Err(_) => {
            if let Some(diagnostics) = diagnostics.as_deref_mut() {
                diagnostics.mirror_ordering_failures += 1;
            }
            0
        }
    }
}

pub(crate) fn mirror_ordering_penalty_from_summary(summary: &MirrorRiskSummary) -> i32 {
    let penalty = match summary.risk_level {
        MirrorRiskLevel::Quiet => 0,
        MirrorRiskLevel::Watch => 20,
        MirrorRiskLevel::Tactical => 90,
        MirrorRiskLevel::Dangerous => 220,
        MirrorRiskLevel::LosingCandidate => MIRROR_ORDERING_MAX_PENALTY,
    };

    penalty.clamp(0, MIRROR_ORDERING_MAX_PENALTY)
}

fn mirror_ordering_enabled() -> bool {
    std::env::var("TCS_MIRROR_ORDERING").ok().as_deref() == Some("1")
}
