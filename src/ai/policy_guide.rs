use crate::core::{ActionId, LegalAction};
use std::cmp::Ordering;

pub const POLICY_GUIDE_CONTRACT_VERSION: &str = "policy_guide_v0_passive";

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PolicyGuideRequest {
    pub state_key: String,
    pub legal_action_ids: Vec<ActionId>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PolicyPrior {
    pub action_id: ActionId,
    pub prior_score: i32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PolicyValueHint {
    pub value_score: Option<i32>,
    pub confidence: Option<u32>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PolicyGuideSource {
    NeuralProposal,
    HeuristicHint,
    Unknown,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PolicyGuideAuthority {
    ProposalOnlyRequiresSearchAuthority,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PolicyGuideDatasetPosture {
    NotDatasetAdmissible,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PolicyGuideLabelTruth {
    NotEstablished,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PolicyGuideActionMaskAuthority {
    NotAuthoritative,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PolicyGuideCandidate {
    pub action_id: ActionId,
    pub legal_action: Option<LegalAction>,
    pub prior_score: Option<i32>,
    pub policy_score: Option<i32>,
    pub rank_hint: Option<u32>,
    pub source: PolicyGuideSource,
    pub provenance_note: Option<String>,
}

impl PolicyGuideCandidate {
    pub fn new(
        action_id: ActionId,
        prior_score: Option<i32>,
        policy_score: Option<i32>,
        rank_hint: Option<u32>,
        source: PolicyGuideSource,
        provenance_note: Option<String>,
    ) -> Self {
        Self {
            action_id,
            legal_action: None,
            prior_score,
            policy_score,
            rank_hint,
            source,
            provenance_note: normalize_note(provenance_note),
        }
    }

    pub fn from_legal_action(
        legal_action: LegalAction,
        prior_score: Option<i32>,
        policy_score: Option<i32>,
        rank_hint: Option<u32>,
        source: PolicyGuideSource,
        provenance_note: Option<String>,
    ) -> Self {
        Self {
            action_id: legal_action.action_id.clone(),
            legal_action: Some(legal_action),
            prior_score,
            policy_score,
            rank_hint,
            source,
            provenance_note: normalize_note(provenance_note),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PolicyGuideSuggestion {
    pub candidates: Vec<PolicyGuideCandidate>,
    pub value_hint: PolicyValueHint,
    pub provenance_note: Option<String>,
    pub authority: PolicyGuideAuthority,
    pub dataset_posture: PolicyGuideDatasetPosture,
    pub label_truth: PolicyGuideLabelTruth,
    pub action_mask_authority: PolicyGuideActionMaskAuthority,
    pub version: &'static str,
}

impl PolicyGuideSuggestion {
    pub fn passive(
        mut candidates: Vec<PolicyGuideCandidate>,
        value_hint: PolicyValueHint,
        provenance_note: Option<String>,
    ) -> Self {
        sort_candidates_deterministically(&mut candidates);

        Self {
            candidates,
            value_hint,
            provenance_note: normalize_note(provenance_note),
            authority: PolicyGuideAuthority::ProposalOnlyRequiresSearchAuthority,
            dataset_posture: PolicyGuideDatasetPosture::NotDatasetAdmissible,
            label_truth: PolicyGuideLabelTruth::NotEstablished,
            action_mask_authority: PolicyGuideActionMaskAuthority::NotAuthoritative,
            version: POLICY_GUIDE_CONTRACT_VERSION,
        }
    }

    pub fn can_drive_runtime(&self) -> bool {
        false
    }

    pub fn is_final_authority(&self) -> bool {
        false
    }

    pub fn requires_search_authority(&self) -> bool {
        true
    }

    pub fn grants_dataset_admissibility(&self) -> bool {
        false
    }

    pub fn establishes_label_truth(&self) -> bool {
        false
    }

    pub fn implies_training_readiness(&self) -> bool {
        false
    }

    pub fn grants_action_mask_authority(&self) -> bool {
        false
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NeuralProposal {
    pub state_key: String,
    pub legal_action_ids: Vec<ActionId>,
    pub suggestion: PolicyGuideSuggestion,
}

impl NeuralProposal {
    pub fn passive(
        state_key: impl Into<String>,
        legal_action_ids: Vec<ActionId>,
        candidates: Vec<PolicyGuideCandidate>,
        value_hint: PolicyValueHint,
        provenance_note: Option<String>,
    ) -> Self {
        Self {
            state_key: state_key.into(),
            legal_action_ids,
            suggestion: PolicyGuideSuggestion::passive(candidates, value_hint, provenance_note),
        }
    }

    pub fn candidates(&self) -> &[PolicyGuideCandidate] {
        &self.suggestion.candidates
    }

    pub fn can_drive_runtime(&self) -> bool {
        false
    }

    pub fn is_final_authority(&self) -> bool {
        false
    }

    pub fn requires_search_authority(&self) -> bool {
        true
    }

    pub fn grants_dataset_admissibility(&self) -> bool {
        false
    }

    pub fn establishes_label_truth(&self) -> bool {
        false
    }

    pub fn implies_training_readiness(&self) -> bool {
        false
    }

    pub fn grants_action_mask_authority(&self) -> bool {
        false
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PolicyGuideResult {
    pub priors: Vec<PolicyPrior>,
    pub value_hint: PolicyValueHint,
    pub fallback_reason: Option<String>,
}

pub trait PolicyGuide {
    fn guide(&mut self, request: &PolicyGuideRequest) -> PolicyGuideResult;
}

fn sort_candidates_deterministically(candidates: &mut [PolicyGuideCandidate]) {
    candidates.sort_by(|left, right| compare_candidates(left, right));
}

fn compare_candidates(left: &PolicyGuideCandidate, right: &PolicyGuideCandidate) -> Ordering {
    right
        .prior_score
        .cmp(&left.prior_score)
        .then_with(|| right.policy_score.cmp(&left.policy_score))
        .then_with(|| compare_rank_hint(left.rank_hint, right.rank_hint))
        .then_with(|| left.action_id.cmp(&right.action_id))
}

fn compare_rank_hint(left: Option<u32>, right: Option<u32>) -> Ordering {
    match (left, right) {
        (Some(left), Some(right)) => left.cmp(&right),
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        (None, None) => Ordering::Equal,
    }
}

fn normalize_note(note: Option<String>) -> Option<String> {
    note.and_then(|note| (!note.trim().is_empty()).then_some(note))
}
