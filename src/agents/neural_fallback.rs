#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum NeuralFallbackReason {
    NoUciMoves,
    PredictedMoveNotFound,
    PythonBridgeFailed,
}

impl NeuralFallbackReason {
    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::NoUciMoves => "no_uci_moves",
            Self::PredictedMoveNotFound => "predicted_move_not_found",
            Self::PythonBridgeFailed => "python_bridge_failed",
        }
    }

    pub(crate) fn runtime_line(self) -> String {
        format!("NEURAL_FALLBACK_REASON={}", self.as_str())
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum NeuralSelectedSource {
    BestMove,
    FallbackLegalFirst,
    ShortlistRerank,
}

impl NeuralSelectedSource {
    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::BestMove => "best_move",
            Self::FallbackLegalFirst => "fallback_legal_first",
            Self::ShortlistRerank => "shortlist_rerank",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum NeuralRerankPool {
    Shortlist,
    FullLegal,
}

impl NeuralRerankPool {
    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::Shortlist => "shortlist",
            Self::FullLegal => "full_legal",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum NeuralRerankFallbackCause {
    None,
    PurityViolationStrict,
    ParsedFenUnavailable,
    FilteredCandidateListEmptyUsePredicted,
    FilteredCandidateListEmpty,
    EmptyCandidateListUsePredicted,
    EmptyCandidateList,
}

impl NeuralRerankFallbackCause {
    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::None => "none",
            Self::PurityViolationStrict => "purity_violation_strict",
            Self::ParsedFenUnavailable => "parsed_fen_unavailable",
            Self::FilteredCandidateListEmptyUsePredicted => {
                "filtered_candidate_list_empty_use_predicted"
            }
            Self::FilteredCandidateListEmpty => "filtered_candidate_list_empty",
            Self::EmptyCandidateListUsePredicted => "empty_candidate_list_use_predicted",
            Self::EmptyCandidateList => "empty_candidate_list",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        NeuralFallbackReason, NeuralRerankFallbackCause, NeuralRerankPool, NeuralSelectedSource,
    };

    #[test]
    fn neural_fallback_reason_strings_are_stable() {
        assert_eq!(NeuralFallbackReason::NoUciMoves.as_str(), "no_uci_moves");
        assert_eq!(
            NeuralFallbackReason::PredictedMoveNotFound.as_str(),
            "predicted_move_not_found"
        );
        assert_eq!(
            NeuralFallbackReason::PythonBridgeFailed.as_str(),
            "python_bridge_failed"
        );
        assert_eq!(
            NeuralFallbackReason::NoUciMoves.runtime_line(),
            "NEURAL_FALLBACK_REASON=no_uci_moves"
        );
    }

    #[test]
    fn neural_fallback_selected_source_strings_are_stable() {
        assert_eq!(NeuralSelectedSource::BestMove.as_str(), "best_move");
        assert_eq!(
            NeuralSelectedSource::FallbackLegalFirst.as_str(),
            "fallback_legal_first"
        );
        assert_eq!(
            NeuralSelectedSource::ShortlistRerank.as_str(),
            "shortlist_rerank"
        );
    }

    #[test]
    fn neural_fallback_rerank_boundary_strings_are_stable() {
        assert_eq!(NeuralRerankPool::Shortlist.as_str(), "shortlist");
        assert_eq!(NeuralRerankPool::FullLegal.as_str(), "full_legal");
        assert_eq!(NeuralRerankFallbackCause::None.as_str(), "none");
        assert_eq!(
            NeuralRerankFallbackCause::PurityViolationStrict.as_str(),
            "purity_violation_strict"
        );
        assert_eq!(
            NeuralRerankFallbackCause::ParsedFenUnavailable.as_str(),
            "parsed_fen_unavailable"
        );
        assert_eq!(
            NeuralRerankFallbackCause::FilteredCandidateListEmptyUsePredicted.as_str(),
            "filtered_candidate_list_empty_use_predicted"
        );
        assert_eq!(
            NeuralRerankFallbackCause::FilteredCandidateListEmpty.as_str(),
            "filtered_candidate_list_empty"
        );
        assert_eq!(
            NeuralRerankFallbackCause::EmptyCandidateListUsePredicted.as_str(),
            "empty_candidate_list_use_predicted"
        );
        assert_eq!(
            NeuralRerankFallbackCause::EmptyCandidateList.as_str(),
            "empty_candidate_list"
        );
    }
}
