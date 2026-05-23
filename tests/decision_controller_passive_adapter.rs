#[path = "../src/chess/decision_controller_adapter.rs"]
mod decision_controller_adapter;

use decision_controller_adapter::PassiveDecisionControllerAdapter;
use tactical_chess_pure_lab::ai::{
    DecisionController, DecisionControllerInput, DecisionMode, DecisionRequest, PolicyGuideResult,
    PolicyPrior, PolicyValueHint, SearchResult,
};
use tactical_chess_pure_lab::core::ActionId;

fn sample_request(mode: DecisionMode) -> DecisionRequest {
    DecisionRequest {
        state_key: "state:passive-controller-adapter".to_string(),
        legal_action_ids: vec![
            ActionId::from_normalized_key("e2e4"),
            ActionId::from_normalized_key("d2d4"),
            ActionId::from_normalized_key("g1f3"),
        ],
        decision_mode: mode,
    }
}

fn sample_policy_result(selected: &str) -> PolicyGuideResult {
    PolicyGuideResult {
        priors: vec![PolicyPrior {
            action_id: ActionId::from_normalized_key(selected),
            prior_score: 100,
        }],
        value_hint: PolicyValueHint {
            value_score: Some(25),
            confidence: Some(90),
        },
        fallback_reason: None,
    }
}

fn read_repo_file(path: &str) -> String {
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    std::fs::read_to_string(root.join(path))
        .unwrap_or_else(|err| panic!("expected to read {path}: {err}"))
}

#[test]
fn adapter_compiles_against_existing_decision_controller_trait() {
    let request = sample_request(DecisionMode::SearchOnly);
    let selected = request.legal_action_ids[0].clone();
    let input = DecisionControllerInput {
        request,
        search_result: Some(SearchResult {
            selected_action_id: Some(selected.clone()),
            searched_nodes: Some(12),
            reached_depth: Some(3),
            fallback_reason: None,
        }),
        policy_result: None,
    };

    let mut controller: Box<dyn DecisionController> =
        Box::new(PassiveDecisionControllerAdapter::new());
    let choice = controller.decide(&input);

    assert_eq!(choice.selected_action_id, Some(selected));
    assert_eq!(choice.decision_mode, DecisionMode::SearchOnly);
    assert_eq!(choice.fallback_reason, None);
}

#[test]
fn adapter_selects_legal_search_result_selected_action() {
    let request = sample_request(DecisionMode::SearchOnly);
    let selected = request.legal_action_ids[1].clone();
    let input = DecisionControllerInput {
        request: request.clone(),
        search_result: Some(SearchResult {
            selected_action_id: Some(selected.clone()),
            searched_nodes: Some(64),
            reached_depth: Some(4),
            fallback_reason: None,
        }),
        policy_result: None,
    };
    let mut controller = PassiveDecisionControllerAdapter::new();

    let choice = controller.decide(&input);

    assert_eq!(choice.selected_action_id, Some(selected));
    assert_eq!(choice.decision_mode, DecisionMode::SearchOnly);
    assert_eq!(choice.fallback_reason, None);
    assert!(request
        .legal_action_ids
        .contains(choice.selected_action_id.as_ref().unwrap()));
}

#[test]
fn adapter_rejects_missing_search_selection_with_fallback() {
    let input = DecisionControllerInput {
        request: sample_request(DecisionMode::SearchOnly),
        search_result: Some(SearchResult {
            selected_action_id: None,
            searched_nodes: Some(0),
            reached_depth: Some(0),
            fallback_reason: Some("search_no_selection".to_string()),
        }),
        policy_result: None,
    };
    let mut controller = PassiveDecisionControllerAdapter::new();

    let choice = controller.decide(&input);

    assert_eq!(choice.selected_action_id, None);
    assert_eq!(choice.decision_mode, DecisionMode::Fallback);
    assert_eq!(
        choice.fallback_reason.as_deref(),
        Some("search_selected_action_missing")
    );
}

#[test]
fn adapter_rejects_illegal_search_selection_with_fallback() {
    let input = DecisionControllerInput {
        request: sample_request(DecisionMode::SearchOnly),
        search_result: Some(SearchResult {
            selected_action_id: Some(ActionId::from_normalized_key("a2a3")),
            searched_nodes: Some(9),
            reached_depth: Some(2),
            fallback_reason: None,
        }),
        policy_result: None,
    };
    let mut controller = PassiveDecisionControllerAdapter::new();

    let choice = controller.decide(&input);

    assert_eq!(choice.selected_action_id, None);
    assert_eq!(choice.decision_mode, DecisionMode::Fallback);
    assert_eq!(
        choice.fallback_reason.as_deref(),
        Some("search_selected_action_not_in_legal_action_ids")
    );
}

#[test]
fn policy_result_cannot_override_legal_search_selection() {
    let request = sample_request(DecisionMode::PolicyGuided);
    let legal_selected = request.legal_action_ids[2].clone();
    let input = DecisionControllerInput {
        request,
        search_result: Some(SearchResult {
            selected_action_id: Some(legal_selected.clone()),
            searched_nodes: Some(100),
            reached_depth: Some(5),
            fallback_reason: None,
        }),
        policy_result: Some(sample_policy_result("e2e4")),
    };
    let mut controller = PassiveDecisionControllerAdapter::new();

    let choice = controller.decide(&input);

    assert_eq!(choice.selected_action_id, Some(legal_selected));
    assert_eq!(choice.decision_mode, DecisionMode::PolicyGuided);
    assert_eq!(choice.fallback_reason, None);
}

#[test]
fn policy_result_alone_does_not_become_final_authority() {
    let input = DecisionControllerInput {
        request: sample_request(DecisionMode::PolicyGuided),
        search_result: None,
        policy_result: Some(sample_policy_result("e2e4")),
    };
    let mut controller = PassiveDecisionControllerAdapter::new();

    let choice = controller.decide(&input);

    assert_eq!(choice.selected_action_id, None);
    assert_eq!(choice.decision_mode, DecisionMode::Fallback);
    assert_eq!(
        choice.fallback_reason.as_deref(),
        Some("search_result_missing")
    );
}

#[test]
fn adapter_is_deterministic_for_same_input() {
    let request = sample_request(DecisionMode::SearchOnly);
    let input = DecisionControllerInput {
        request,
        search_result: Some(SearchResult {
            selected_action_id: Some(ActionId::from_normalized_key("d2d4")),
            searched_nodes: Some(22),
            reached_depth: Some(4),
            fallback_reason: None,
        }),
        policy_result: Some(sample_policy_result("e2e4")),
    };
    let mut controller = PassiveDecisionControllerAdapter::new();
    let expected = controller.decide(&input);

    for attempt in 0..8 {
        let observed = controller.decide(&input);
        assert_eq!(
            observed, expected,
            "adapter decision changed on repeated evaluation {attempt}"
        );
    }
}

#[test]
fn adapter_does_not_mutate_request_or_input_data() {
    let request = sample_request(DecisionMode::SearchOnly);
    let expected_ids = request
        .legal_action_ids
        .iter()
        .map(|action_id| action_id.as_str().to_string())
        .collect::<Vec<_>>();
    let input = DecisionControllerInput {
        request,
        search_result: Some(SearchResult {
            selected_action_id: Some(ActionId::from_normalized_key("e2e4")),
            searched_nodes: Some(33),
            reached_depth: Some(3),
            fallback_reason: None,
        }),
        policy_result: Some(sample_policy_result("g1f3")),
    };
    let input_before = input.clone();
    let mut controller = PassiveDecisionControllerAdapter::new();

    let _ = controller.decide(&input);

    let observed_ids = input
        .request
        .legal_action_ids
        .iter()
        .map(|action_id| action_id.as_str().to_string())
        .collect::<Vec<_>>();
    assert_eq!(observed_ids, expected_ids);
    assert_eq!(input, input_before);
}

#[test]
fn decision_route_uses_search_backend_adapter_without_controller_activation() {
    let decision_source = read_repo_file("src/chess/decision.rs");

    assert!(
        decision_source.contains("search_backend_adapter::search_root_via_adapter"),
        "decision route should import the adapter-backed search boundary"
    );
    assert!(
        decision_source.contains("search_root_via_adapter(engine, player, context)"),
        "decision route should call the adapter-backed search boundary"
    );
    assert!(
        !decision_source.contains("search_root_with_context(engine, player, context)"),
        "decision route should not call raw search_root_with_context directly"
    );
    assert!(
        !decision_source.contains("decision_controller_adapter"),
        "decision route should not import or use decision_controller_adapter in passive phase"
    );
    assert!(
        !decision_source.contains("DecisionController"),
        "decision route should not depend on DecisionController in passive phase"
    );
    assert!(
        !decision_source.contains("SearchBackend"),
        "decision route should not depend directly on the SearchBackend trait"
    );
    assert!(
        !decision_source.contains("ActionMask"),
        "decision route should not activate ActionMask authority"
    );
    assert!(
        !decision_source.contains("NeuralAgent"),
        "decision route should not call NeuralAgent directly"
    );
}
