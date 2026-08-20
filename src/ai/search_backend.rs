use crate::core::ActionId;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SearchBudget {
    pub max_depth: Option<u32>,
    pub max_nodes: Option<u64>,
    pub max_time_ms: Option<u64>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SearchRequest {
    pub state_key: String,
    pub legal_action_ids: Vec<ActionId>,
    pub budget: SearchBudget,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SearchResult {
    pub selected_action_id: Option<ActionId>,
    pub searched_nodes: Option<u64>,
    pub reached_depth: Option<u32>,
    pub fallback_reason: Option<String>,
}

pub trait SearchBackend {
    fn search(&mut self, request: &SearchRequest) -> SearchResult;
}
