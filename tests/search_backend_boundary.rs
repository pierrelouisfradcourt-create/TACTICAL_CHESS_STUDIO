use tactical_chess_pure_lab::ai::{
    SearchBackend, SearchBudget, SearchRequest, SearchResult,
};
use tactical_chess_pure_lab::core::ActionId;

struct FirstLegalActionBackend;

impl SearchBackend for FirstLegalActionBackend {
    fn search(&mut self, request: &SearchRequest) -> SearchResult {
        SearchResult {
            selected_action_id: request.legal_action_ids.first().cloned(),
            searched_nodes: Some(1),
            reached_depth: Some(1),
            fallback_reason: None,
        }
    }
}

struct NoSelectionBackend;

impl SearchBackend for NoSelectionBackend {
    fn search(&mut self, _request: &SearchRequest) -> SearchResult {
        SearchResult {
            selected_action_id: None,
            searched_nodes: Some(0),
            reached_depth: Some(0),
            fallback_reason: Some("no_legal_action_selected".to_string()),
        }
    }
}

fn sample_budget() -> SearchBudget {
    SearchBudget {
        max_depth: Some(3),
        max_nodes: Some(1_000),
        max_time_ms: Some(250),
    }
}

#[test]
fn search_budget_construction_is_explicit() {
    let budget = sample_budget();

    assert_eq!(budget.max_depth, Some(3));
    assert_eq!(budget.max_nodes, Some(1_000));
    assert_eq!(budget.max_time_ms, Some(250));
}

#[test]
fn search_request_stores_legal_action_ids_deterministically() {
    let legal_action_ids = vec![
        ActionId::from_normalized_key("g1f3"),
        ActionId::from_normalized_key("e2e4"),
        ActionId::from_normalized_key("b1c3"),
    ];
    let request = SearchRequest {
        state_key: "state:deterministic".to_string(),
        legal_action_ids: legal_action_ids.clone(),
        budget: sample_budget(),
    };

    let observed = request
        .legal_action_ids
        .iter()
        .map(ActionId::as_str)
        .collect::<Vec<_>>();
    let expected = legal_action_ids
        .iter()
        .map(ActionId::as_str)
        .collect::<Vec<_>>();

    assert_eq!(observed, expected);
}

#[test]
fn dummy_backend_can_select_existing_legal_action() {
    let legal_action_ids = vec![
        ActionId::from_normalized_key("e2e4"),
        ActionId::from_normalized_key("d2d4"),
    ];
    let request = SearchRequest {
        state_key: "state:select-existing".to_string(),
        legal_action_ids: legal_action_ids.clone(),
        budget: sample_budget(),
    };
    let mut backend = FirstLegalActionBackend;

    let result = backend.search(&request);

    assert_eq!(result.selected_action_id, Some(legal_action_ids[0].clone()));
    assert!(request
        .legal_action_ids
        .contains(result.selected_action_id.as_ref().unwrap()));
}

#[test]
fn fallback_result_without_selection_is_valid() {
    let request = SearchRequest {
        state_key: "state:fallback".to_string(),
        legal_action_ids: vec![ActionId::from_normalized_key("a2a4")],
        budget: sample_budget(),
    };
    let mut backend = NoSelectionBackend;

    let result = backend.search(&request);

    assert_eq!(result.selected_action_id, None);
    assert_eq!(result.fallback_reason.as_deref(), Some("no_legal_action_selected"));
}

#[test]
fn boundary_types_compile_without_chess_engine_search_or_neural_runtime_dependencies() {
    let request = SearchRequest {
        state_key: "state:core-only".to_string(),
        legal_action_ids: vec![ActionId::from_normalized_key("h2h4")],
        budget: SearchBudget {
            max_depth: None,
            max_nodes: Some(10),
            max_time_ms: None,
        },
    };
    let mut backend = FirstLegalActionBackend;
    let result = backend.search(&request);

    assert_eq!(
        result.selected_action_id,
        Some(ActionId::from_normalized_key("h2h4"))
    );
}
