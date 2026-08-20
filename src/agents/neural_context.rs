use crate::chess::practical_policy::PracticalPhase;
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::UnitId;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum ContextualMoveProfile {
    Opening,
    Middlegame,
    EqualEndgame,
    WinningEndgame,
    LosingEndgame,
}

impl ContextualMoveProfile {
    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::Opening => "opening",
            Self::Middlegame => "middlegame",
            Self::EqualEndgame => "equal_endgame",
            Self::WinningEndgame => "winning_endgame",
            Self::LosingEndgame => "losing_endgame",
        }
    }
}

#[derive(Clone, Copy)]
pub(crate) struct RerankContext {
    pub(crate) ply: usize,
    pub(crate) last_own_unit_id: Option<UnitId>,
}

impl RerankContext {
    pub(crate) fn from_engine(engine: &Engine) -> Self {
        let current_player = engine.turn_manager.current_player;
        let last_own_unit_id = engine.action_log.iter().rev().find_map(|cmd| {
            if cmd.player_id != current_player {
                return None;
            }

            match cmd.action {
                Action::Move { unit_id, .. } => Some(unit_id),
                _ => None,
            }
        });

        Self {
            ply: engine.action_log.len() + 1,
            last_own_unit_id,
        }
    }
}

pub(crate) fn detect_contextual_profile(
    phase: PracticalPhase,
    material_advantage: f32,
) -> ContextualMoveProfile {
    match phase {
        PracticalPhase::Opening => ContextualMoveProfile::Opening,
        PracticalPhase::Middlegame => ContextualMoveProfile::Middlegame,
        PracticalPhase::Endgame if material_advantage >= 6.0 => {
            ContextualMoveProfile::WinningEndgame
        }
        PracticalPhase::Endgame if material_advantage <= -6.0 => {
            ContextualMoveProfile::LosingEndgame
        }
        PracticalPhase::Endgame => ContextualMoveProfile::EqualEndgame,
    }
}

pub(crate) fn retrieval_phase_label(phase: PracticalPhase) -> &'static str {
    match phase {
        PracticalPhase::Opening => "opening",
        PracticalPhase::Middlegame => "midgame",
        PracticalPhase::Endgame => "endgame",
    }
}

#[cfg(test)]
mod tests {
    use super::{detect_contextual_profile, retrieval_phase_label, ContextualMoveProfile};
    use crate::chess::practical_policy::PracticalPhase;

    #[test]
    fn neural_context_detect_contextual_profile_preserves_existing_boundaries() {
        use ContextualMoveProfile::*;

        assert_eq!(
            detect_contextual_profile(PracticalPhase::Opening, 0.0),
            Opening
        );
        assert_eq!(
            detect_contextual_profile(PracticalPhase::Middlegame, 0.0),
            Middlegame
        );
        assert_eq!(
            detect_contextual_profile(PracticalPhase::Endgame, 6.0),
            WinningEndgame
        );
        assert_eq!(
            detect_contextual_profile(PracticalPhase::Endgame, -6.0),
            LosingEndgame
        );
        assert_eq!(
            detect_contextual_profile(PracticalPhase::Endgame, 1.0),
            EqualEndgame
        );
    }

    #[test]
    fn neural_context_profile_strings_are_stable() {
        assert_eq!(ContextualMoveProfile::Opening.as_str(), "opening");
        assert_eq!(ContextualMoveProfile::Middlegame.as_str(), "middlegame");
        assert_eq!(
            ContextualMoveProfile::EqualEndgame.as_str(),
            "equal_endgame"
        );
        assert_eq!(
            ContextualMoveProfile::WinningEndgame.as_str(),
            "winning_endgame"
        );
        assert_eq!(
            ContextualMoveProfile::LosingEndgame.as_str(),
            "losing_endgame"
        );
    }

    #[test]
    fn neural_context_retrieval_phase_labels_are_stable() {
        assert_eq!(retrieval_phase_label(PracticalPhase::Opening), "opening");
        assert_eq!(retrieval_phase_label(PracticalPhase::Middlegame), "midgame");
        assert_eq!(retrieval_phase_label(PracticalPhase::Endgame), "endgame");
    }
}
