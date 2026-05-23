use tactical_chess_pure_lab::ai::{
    DecisionChoice, DecisionController, DecisionControllerInput, DecisionMode, DecisionRequest,
    PolicyGuideResult, PolicyPrior, PolicyValueHint, SearchResult,
};
use tactical_chess_pure_lab::core::ActionId;

struct PassiveSearchAuthorityController;

impl DecisionController for PassiveSearchAuthorityController {
    fn decide(&mut self, input: &DecisionControllerInput) -> DecisionChoice {
        if let Some(search_result) = &input.search_result {
            if let Some(selected_action_id) = &search_result.selected_action_id {
                return DecisionChoice {
                    selected_action_id: Some(selected_action_id.clone()),
                    decision_mode: input.request.decision_mode.clone(),
                    fallback_reason: None,
                };
            }
        }

        DecisionChoice {
            selected_action_id: None,
            decision_mode: DecisionMode::Fallback,
            fallback_reason: Some("no_search_selection".to_string()),
        }
    }
}

fn sample_request(mode: DecisionMode) -> DecisionRequest {
    DecisionRequest {
        state_key: "state:decision-controller".to_string(),
        legal_action_ids: vec![
            ActionId::from_normalized_key("e2e4"),
            ActionId::from_normalized_key("d2d4"),
            ActionId::from_normalized_key("g1f3"),
        ],
        decision_mode: mode,
    }
}

#[test]
fn decision_request_stores_legal_action_ids_deterministically() {
    let request = sample_request(DecisionMode::PolicyGuided);
    let observed = request
        .legal_action_ids
        .iter()
        .map(ActionId::as_str)
        .collect::<Vec<_>>();

    assert_eq!(observed, vec!["e2e4", "d2d4", "g1f3"]);
}

#[test]
fn dummy_controller_can_choose_search_result_selected_action() {
    let request = sample_request(DecisionMode::SearchOnly);
    let search_selected = request.legal_action_ids[1].clone();
    let input = DecisionControllerInput {
        request: request.clone(),
        search_result: Some(SearchResult {
            selected_action_id: Some(search_selected.clone()),
            searched_nodes: Some(42),
            reached_depth: Some(4),
            fallback_reason: None,
        }),
        policy_result: None,
    };
    let mut controller = PassiveSearchAuthorityController;

    let choice = controller.decide(&input);

    assert_eq!(choice.selected_action_id, Some(search_selected));
    assert_eq!(choice.decision_mode, DecisionMode::SearchOnly);
    assert!(choice.fallback_reason.is_none());
    assert!(request
        .legal_action_ids
        .contains(choice.selected_action_id.as_ref().unwrap()));
}

#[test]
fn fallback_decision_choice_with_no_selected_action_is_valid() {
    let request = sample_request(DecisionMode::SearchOnly);
    let input = DecisionControllerInput {
        request,
        search_result: Some(SearchResult {
            selected_action_id: None,
            searched_nodes: Some(0),
            reached_depth: Some(0),
            fallback_reason: Some("search_no_selection".to_string()),
        }),
        policy_result: None,
    };
    let mut controller = PassiveSearchAuthorityController;

    let choice = controller.decide(&input);

    assert_eq!(choice.selected_action_id, None);
    assert_eq!(choice.decision_mode, DecisionMode::Fallback);
    assert_eq!(choice.fallback_reason.as_deref(), Some("no_search_selection"));
}

#[test]
fn policy_guide_result_alone_does_not_force_final_action_selection() {
    let request = sample_request(DecisionMode::PolicyGuided);
    let input = DecisionControllerInput {
        request,
        search_result: None,
        policy_result: Some(PolicyGuideResult {
            priors: vec![PolicyPrior {
                action_id: ActionId::from_normalized_key("e2e4"),
                prior_score: 100,
            }],
            value_hint: PolicyValueHint {
                value_score: Some(20),
                confidence: Some(90),
            },
            fallback_reason: None,
        }),
    };
    let mut controller = PassiveSearchAuthorityController;

    let choice = controller.decide(&input);

    assert_eq!(choice.selected_action_id, None);
    assert_eq!(choice.decision_mode, DecisionMode::Fallback);
}

#[test]
fn boundary_types_compile_without_chess_engine_search_or_neural_runtime_dependencies() {
    let request = DecisionRequest {
        state_key: "state:core-only".to_string(),
        legal_action_ids: vec![ActionId::from_normalized_key("h2h4")],
        decision_mode: DecisionMode::SearchOnly,
    };
    let input = DecisionControllerInput {
        request: request.clone(),
        search_result: Some(SearchResult {
            selected_action_id: Some(ActionId::from_normalized_key("h2h4")),
            searched_nodes: None,
            reached_depth: None,
            fallback_reason: None,
        }),
        policy_result: None,
    };
    let mut controller = PassiveSearchAuthorityController;

    let choice = controller.decide(&input);

    assert_eq!(choice.selected_action_id, Some(ActionId::from_normalized_key("h2h4")));
}

#[test]
fn decision_choice_does_not_mutate_or_own_legal_actions() {
    let request = sample_request(DecisionMode::SearchOnly);
    let expected = request
        .legal_action_ids
        .iter()
        .map(ActionId::as_str)
        .collect::<Vec<_>>();
    let input = DecisionControllerInput {
        request: request.clone(),
        search_result: Some(SearchResult {
            selected_action_id: Some(request.legal_action_ids[0].clone()),
            searched_nodes: Some(1),
            reached_depth: Some(1),
            fallback_reason: None,
        }),
        policy_result: None,
    };
    let mut controller = PassiveSearchAuthorityController;

    let choice = controller.decide(&input);

    let observed_after = input
        .request
        .legal_action_ids
        .iter()
        .map(ActionId::as_str)
        .collect::<Vec<_>>();
    assert_eq!(observed_after, expected);
    assert_eq!(
        choice.selected_action_id.as_ref().map(ActionId::as_str),
        Some("e2e4")
    );
    assert_eq!(input.request.legal_action_ids.len(), 3);
}
