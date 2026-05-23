use tactical_chess_pure_lab::ai::{
    DecisionChoice, DecisionController, DecisionControllerInput, DecisionMode,
};

#[derive(Default)]
pub struct PassiveDecisionControllerAdapter;

impl PassiveDecisionControllerAdapter {
    pub fn new() -> Self {
        Self
    }
}

impl DecisionController for PassiveDecisionControllerAdapter {
    fn decide(&mut self, input: &DecisionControllerInput) -> DecisionChoice {
        let Some(search_result) = input.search_result.as_ref() else {
            return fallback_choice("search_result_missing");
        };

        let Some(selected_action_id) = search_result.selected_action_id.as_ref() else {
            return fallback_choice("search_selected_action_missing");
        };

        if !input.request.legal_action_ids.contains(selected_action_id) {
            return fallback_choice("search_selected_action_not_in_legal_action_ids");
        }

        DecisionChoice {
            selected_action_id: Some(selected_action_id.clone()),
            decision_mode: input.request.decision_mode.clone(),
            fallback_reason: None,
        }
    }
}

fn fallback_choice(reason: &str) -> DecisionChoice {
    DecisionChoice {
        selected_action_id: None,
        decision_mode: DecisionMode::Fallback,
        fallback_reason: Some(reason.to_string()),
    }
}
