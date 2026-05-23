use super::decision_trace::DecisionTrace;
use tactical_chess_pure_lab::core::LegalAction;

pub fn build_decision_trace_from_legal_actions(
    state_key: impl Into<String>,
    legal_actions: &[LegalAction],
    selected_action: Option<&LegalAction>,
    decision_mode: impl Into<String>,
    used_search: bool,
    used_neural: bool,
    neural_latency_ms: Option<u64>,
    search_nodes: Option<u64>,
    search_depth: Option<u32>,
    fallback_reason: Option<String>,
) -> DecisionTrace {
    DecisionTrace {
        state_key: state_key.into(),
        legal_action_ids: legal_actions
            .iter()
            .map(|legal_action| legal_action.action_id.clone())
            .collect(),
        selected_action_id: selected_action.map(|legal_action| legal_action.action_id.clone()),
        decision_mode: decision_mode.into(),
        used_search,
        used_neural,
        neural_latency_ms,
        search_nodes,
        search_depth,
        fallback_reason,
    }
}
