#[path = "../src/chess/decision_trace.rs"]
mod decision_trace;

#[path = "../src/chess/decision_trace_bridge.rs"]
mod decision_trace_bridge;

use decision_trace::{DecisionTrace, DecisionTraceValidationError};
use decision_trace_bridge::build_decision_trace_from_legal_actions;
use tactical_chess_pure_lab::core::{ActionId, LegalAction};

fn legal_action(key: &str) -> LegalAction {
    LegalAction::from_action_key(key)
}

fn action_id(key: &str) -> ActionId {
    ActionId::from_normalized_key(key)
}

#[test]
fn bridge_builds_decision_trace_from_legal_action_list() {
    let legal_actions = vec![legal_action("e2e4"), legal_action("g1f3"), legal_action("b1c3")];

    let trace = build_decision_trace_from_legal_actions(
        "bridge:state:001",
        &legal_actions,
        None,
        "passive-bridge",
        None,
        false,
        false,
        None,
        None,
        None,
        Some("no-selected-action".to_string()),
    );

    assert_eq!(trace.state_key, "bridge:state:001");
    assert_eq!(
        trace.legal_action_ids,
        vec![action_id("e2e4"), action_id("g1f3"), action_id("b1c3")]
    );
    assert_eq!(trace.selected_action_id, None);
    assert_eq!(trace.decision_mode, "passive-bridge");
    assert_eq!(trace.selection_authority, None);
    assert_eq!(trace.used_search, false);
    assert_eq!(trace.used_neural, false);
    assert_eq!(trace.fallback_reason.as_deref(), Some("no-selected-action"));
}

#[test]
fn selected_legal_action_becomes_selected_action_id() {
    let legal_actions = vec![legal_action("e2e4"), legal_action("g1f3")];

    let trace = build_decision_trace_from_legal_actions(
        "bridge:state:002",
        &legal_actions,
        Some(&legal_actions[1]),
        "selected-action",
        Some("search".to_string()),
        true,
        true,
        Some(7),
        Some(64),
        Some(3),
        None,
    );

    assert_eq!(trace.selected_action_id, Some(action_id("g1f3")));
    assert_eq!(trace.selection_authority.as_deref(), Some("search"));
    assert_eq!(trace.neural_latency_ms, Some(7));
    assert_eq!(trace.search_nodes, Some(64));
    assert_eq!(trace.search_depth, Some(3));
}

#[test]
fn validate_consistency_passes_for_valid_selected_action() {
    let legal_actions = vec![legal_action("e2e4"), legal_action("g1f3")];

    let trace = build_decision_trace_from_legal_actions(
        "bridge:state:003",
        &legal_actions,
        Some(&legal_actions[0]),
        "valid-selected",
        None,
        false,
        false,
        None,
        None,
        None,
        None,
    );

    assert!(trace.validate_consistency().is_ok());
}

#[test]
fn fallback_without_selected_action_is_valid_when_legal_actions_exist() {
    let legal_actions = vec![legal_action("e2e4"), legal_action("g1f3")];

    let trace = build_decision_trace_from_legal_actions(
        "bridge:state:004",
        &legal_actions,
        None,
        "fallback",
        Some("fallback".to_string()),
        false,
        false,
        None,
        None,
        None,
        Some("fallback-without-selected-action".to_string()),
    );

    assert!(trace.validate_consistency().is_ok());
}

#[test]
fn selected_action_outside_legal_actions_is_rejected_by_consistency_validation() {
    let trace = DecisionTrace {
        state_key: "bridge:state:005".to_string(),
        legal_action_ids: vec![action_id("e2e4"), action_id("g1f3")],
        selected_action_id: Some(action_id("a2a4")),
        decision_mode: "invalid-selected".to_string(),
        selection_authority: None,
        used_search: false,
        used_neural: false,
        neural_latency_ms: None,
        search_nodes: None,
        search_depth: None,
        fallback_reason: None,
    };

    assert_eq!(
        trace.validate_consistency(),
        Err(DecisionTraceValidationError::SelectedActionIdNotLegal {
            selected_action_id: action_id("a2a4"),
        })
    );
}

#[test]
fn bridge_does_not_require_engine_search_or_neural_runtime_dependencies() {
    let legal_actions = vec![legal_action("b1c3")];

    let trace = build_decision_trace_from_legal_actions(
        "bridge:state:006",
        &legal_actions,
        Some(&legal_actions[0]),
        "standalone",
        None,
        false,
        false,
        None,
        None,
        None,
        None,
    );

    assert_eq!(trace.selected_action_id, Some(action_id("b1c3")));
    assert!(trace.validate_consistency().is_ok());
}

#[test]
fn json_serialization_still_works_after_bridge_construction() {
    let legal_actions = vec![legal_action("e2e4"), legal_action("g1f3")];
    let trace = build_decision_trace_from_legal_actions(
        "bridge:state:007",
        &legal_actions,
        Some(&legal_actions[0]),
        "json",
        Some("search".to_string()),
        true,
        false,
        None,
        Some(128),
        Some(4),
        None,
    );

    let json = serde_json::to_value(&trace).expect("bridge DecisionTrace serializes");

    assert_eq!(
        json,
        serde_json::json!({
            "state_key": "bridge:state:007",
            "legal_action_ids": ["e2e4", "g1f3"],
            "selected_action_id": "e2e4",
            "decision_mode": "json",
            "selection_authority": "search",
            "used_search": true,
            "used_neural": false,
            "neural_latency_ms": null,
            "search_nodes": 128,
            "search_depth": 4,
            "fallback_reason": null
        })
    );
    assert!(trace.validate_consistency().is_ok());
}

#[test]
fn used_search_accepts_normalized_or_legacy_missing_search_authority() {
    let legal_actions = vec![legal_action("e2e4"), legal_action("g1f3")];

    for selection_authority in [Some("SEARCH".to_string()), Some(" search ".to_string()), None] {
        let trace = build_decision_trace_from_legal_actions(
            "bridge:state:008",
            &legal_actions,
            Some(&legal_actions[0]),
            "normalized-or-legacy-search-authority",
            selection_authority,
            true,
            false,
            None,
            Some(128),
            Some(4),
            None,
        );

        assert!(trace.validate_consistency().is_ok());
    }
}

#[test]
fn used_search_rejects_non_search_selection_authority() {
    let legal_actions = vec![legal_action("e2e4"), legal_action("g1f3")];

    let trace = build_decision_trace_from_legal_actions(
        "bridge:state:009",
        &legal_actions,
        Some(&legal_actions[0]),
        "non-search-authority",
        Some("fallback".to_string()),
        true,
        false,
        None,
        Some(128),
        Some(4),
        None,
    );

    assert_eq!(
        trace.validate_consistency(),
        Err(DecisionTraceValidationError::SearchSelectionAuthorityRequired {
            selection_authority: Some("fallback".to_string()),
        })
    );
}

#[test]
fn neural_critic_and_llm_are_not_final_selection_authorities_after_normalization() {
    for blocked_authority in ["neural", "Neural", " critic ", "LLM"] {
        let trace = DecisionTrace {
            state_key: format!("bridge:blocked-authority:{blocked_authority}"),
            legal_action_ids: vec![action_id("e2e4"), action_id("g1f3")],
            selected_action_id: Some(action_id("e2e4")),
            decision_mode: "blocked-authority".to_string(),
            selection_authority: Some(blocked_authority.to_string()),
            used_search: false,
            used_neural: false,
            neural_latency_ms: None,
            search_nodes: None,
            search_depth: None,
            fallback_reason: None,
        };

        assert_eq!(
            trace.validate_consistency(),
            Err(
                DecisionTraceValidationError::UnsupportedFinalSelectionAuthority {
                    selection_authority: blocked_authority.to_string(),
                },
            )
        );
    }
}
