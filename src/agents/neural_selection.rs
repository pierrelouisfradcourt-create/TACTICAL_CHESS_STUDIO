use crate::agents::neural_fallback::NeuralFallbackReason;
use crate::engine::action::action::Action;

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub(crate) struct NeuralSelectionOutcome {
    pub(crate) selected_action: Action,
    pub(crate) selected_move: Option<String>,
    pub(crate) selected_source: &'static str,
    pub(crate) fallback_reason: Option<&'static str>,
    pub(crate) policy_rank: i32,
    pub(crate) policy_selected_mismatch_flag: u8,
    pub(crate) rerank_pool: &'static str,
    pub(crate) rerank_fallback_cause: &'static str,
}

impl NeuralSelectionOutcome {
    pub(crate) fn new(
        selected_action: Action,
        selected_move: Option<String>,
        selected_source: &'static str,
        fallback_reason: Option<NeuralFallbackReason>,
        policy_rank: i32,
        policy_selected_mismatch_flag: u8,
        rerank_pool: &'static str,
        rerank_fallback_cause: &'static str,
    ) -> Self {
        Self {
            selected_action,
            selected_move,
            selected_source,
            fallback_reason: fallback_reason.map(NeuralFallbackReason::as_str),
            policy_rank,
            policy_selected_mismatch_flag,
            rerank_pool,
            rerank_fallback_cause,
        }
    }

    pub(crate) fn into_action(self) -> Action {
        self.selected_action
    }
}

#[cfg(test)]
mod tests {
    use super::NeuralSelectionOutcome;
    use crate::agents::neural_fallback::{
        NeuralFallbackReason, NeuralRerankFallbackCause, NeuralRerankPool, NeuralSelectedSource,
    };
    use crate::engine::action::action::Action;
    use crate::engine::entity::unit::Position;

    fn sample_action() -> Action {
        Action::Move {
            unit_id: 7,
            target: Position { x: 4, y: 4 },
            promotion: None,
        }
    }

    #[test]
    fn neural_selection_outcome_preserves_success_labels_and_action() {
        let outcome = NeuralSelectionOutcome::new(
            sample_action(),
            Some("e2e4".to_string()),
            NeuralSelectedSource::BestMove.as_str(),
            None,
            1,
            0,
            NeuralRerankPool::Shortlist.as_str(),
            NeuralRerankFallbackCause::None.as_str(),
        );

        assert_eq!(outcome.selected_move.as_deref(), Some("e2e4"));
        assert_eq!(outcome.selected_source, "best_move");
        assert_eq!(outcome.fallback_reason, None);
        assert_eq!(outcome.policy_rank, 1);
        assert_eq!(outcome.policy_selected_mismatch_flag, 0);
        assert_eq!(outcome.rerank_pool, "shortlist");
        assert_eq!(outcome.rerank_fallback_cause, "none");

        let Action::Move {
            unit_id, target, ..
        } = outcome.into_action()
        else {
            panic!("expected selected move action");
        };
        assert_eq!(unit_id, 7);
        assert_eq!(target.x, 4);
        assert_eq!(target.y, 4);
    }

    #[test]
    fn neural_selection_outcome_preserves_fallback_reason_label() {
        let outcome = NeuralSelectionOutcome::new(
            Action::Pass,
            None,
            NeuralSelectedSource::FallbackLegalFirst.as_str(),
            Some(NeuralFallbackReason::PythonBridgeFailed),
            -1,
            0,
            NeuralRerankPool::FullLegal.as_str(),
            NeuralRerankFallbackCause::EmptyCandidateList.as_str(),
        );

        assert_eq!(outcome.selected_move, None);
        assert_eq!(outcome.selected_source, "fallback_legal_first");
        assert_eq!(outcome.fallback_reason, Some("python_bridge_failed"));
        assert_eq!(outcome.policy_rank, -1);
        assert_eq!(outcome.policy_selected_mismatch_flag, 0);
        assert_eq!(outcome.rerank_pool, "full_legal");
        assert_eq!(outcome.rerank_fallback_cause, "empty_candidate_list");

        let Action::Pass = outcome.into_action() else {
            panic!("expected fallback pass action");
        };
    }
}
