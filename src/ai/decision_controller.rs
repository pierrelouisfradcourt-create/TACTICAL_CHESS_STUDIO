use crate::ai::{PolicyGuideResult, SearchResult};
use crate::core::ActionId;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DecisionMode {
    SearchOnly,
    PolicyGuided,
    Fallback,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DecisionRequest {
    pub state_key: String,
    pub legal_action_ids: Vec<ActionId>,
    pub decision_mode: DecisionMode,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DecisionChoice {
    pub selected_action_id: Option<ActionId>,
    pub decision_mode: DecisionMode,
    pub fallback_reason: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DecisionControllerInput {
    pub request: DecisionRequest,
    pub search_result: Option<SearchResult>,
    pub policy_result: Option<PolicyGuideResult>,
}

pub trait DecisionController {
    fn decide(&mut self, input: &DecisionControllerInput) -> DecisionChoice;
}
