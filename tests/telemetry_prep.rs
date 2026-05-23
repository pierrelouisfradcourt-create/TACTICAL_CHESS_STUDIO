#[path = "../src/chess/decision_trace.rs"]
mod decision_trace;

use decision_trace::{decision_trace_to_pretty_json, DecisionTrace, DecisionTraceValidationError};
use tactical_chess_pure_lab::core::ActionId;

fn action_id(key: &str) -> ActionId {
    ActionId::from_normalized_key(key)
}

fn trace_with_selected(selected_action_id: Option<ActionId>) -> DecisionTrace {
    DecisionTrace {
        state_key: "phase3:state:001".to_string(),
        legal_action_ids: vec![action_id("e2e4"), action_id("g1f3")],
        selected_action_id,
        decision_mode: "test-mode".to_string(),
        used_search: false,
        used_neural: false,
        neural_latency_ms: None,
        search_nodes: None,
        search_depth: None,
        fallback_reason: None,
    }
}

#[test]
fn decision_trace_serializes_to_stable_json_fields() {
    let trace = DecisionTrace {
        decision_mode: "json-round-trip".to_string(),
        used_search: true,
        used_neural: true,
        neural_latency_ms: Some(9),
        search_nodes: Some(144),
        search_depth: Some(5),
        fallback_reason: Some("none".to_string()),
        ..trace_with_selected(Some(action_id("G1F3")))
    };

    let json = serde_json::to_value(&trace).expect("DecisionTrace serializes to JSON");

    assert_eq!(
        json,
        serde_json::json!({
            "state_key": "phase3:state:001",
            "legal_action_ids": ["e2e4", "g1f3"],
            "selected_action_id": "g1f3",
            "decision_mode": "json-round-trip",
            "used_search": true,
            "used_neural": true,
            "neural_latency_ms": 9,
            "search_nodes": 144,
            "search_depth": 5,
            "fallback_reason": "none"
        })
    );
}

#[test]
fn decision_trace_json_round_trip_preserves_trace_and_validation() {
    let trace = DecisionTrace {
        decision_mode: "json-round-trip".to_string(),
        used_search: true,
        used_neural: false,
        search_nodes: Some(32),
        search_depth: Some(2),
        ..trace_with_selected(Some(action_id("e2e4")))
    };

    let encoded = serde_json::to_string(&trace).expect("DecisionTrace serializes");
    let decoded: DecisionTrace =
        serde_json::from_str(&encoded).expect("DecisionTrace deserializes");

    assert_eq!(decoded, trace);
    assert!(decoded.validate_consistency().is_ok());
}

#[test]
fn decision_trace_json_fixture_is_stable_and_valid() {
    let trace = DecisionTrace {
        state_key: "fixture:dry-run:state:001".to_string(),
        legal_action_ids: vec![
            action_id("e2e4"),
            action_id("g1f3"),
            action_id("b1c3"),
            action_id("d2d4"),
        ],
        selected_action_id: Some(action_id("g1f3")),
        decision_mode: "telemetry-json-dry-run-fixture".to_string(),
        used_search: true,
        used_neural: true,
        neural_latency_ms: Some(12),
        search_nodes: Some(384),
        search_depth: Some(4),
        fallback_reason: None,
    };

    let fixture_json =
        serde_json::to_string_pretty(&trace).expect("DecisionTrace serializes to fixture JSON");
    let expected_fixture_json = r#"{
  "state_key": "fixture:dry-run:state:001",
  "legal_action_ids": [
    "e2e4",
    "g1f3",
    "b1c3",
    "d2d4"
  ],
  "selected_action_id": "g1f3",
  "decision_mode": "telemetry-json-dry-run-fixture",
  "used_search": true,
  "used_neural": true,
  "neural_latency_ms": 12,
  "search_nodes": 384,
  "search_depth": 4,
  "fallback_reason": null
}"#;

    assert_eq!(fixture_json, expected_fixture_json);

    let decoded: DecisionTrace =
        serde_json::from_str(&fixture_json).expect("fixture JSON deserializes");

    assert_eq!(decoded, trace);
    assert!(decoded.validate_consistency().is_ok());
}

#[test]
fn decision_trace_pretty_json_helper_is_deterministic_and_round_trips() {
    let trace = DecisionTrace {
        state_key: "helper:sandbox:state:001".to_string(),
        legal_action_ids: vec![action_id("e2e4"), action_id("g1f3"), action_id("b1c3")],
        selected_action_id: Some(action_id("b1c3")),
        decision_mode: "telemetry-json-sandbox-writer".to_string(),
        used_search: true,
        used_neural: false,
        neural_latency_ms: None,
        search_nodes: Some(96),
        search_depth: Some(3),
        fallback_reason: None,
    };

    let first_json =
        decision_trace_to_pretty_json(&trace).expect("helper serializes DecisionTrace");
    let second_json =
        decision_trace_to_pretty_json(&trace).expect("helper serializes deterministically");
    let expected_json = r#"{
  "state_key": "helper:sandbox:state:001",
  "legal_action_ids": [
    "e2e4",
    "g1f3",
    "b1c3"
  ],
  "selected_action_id": "b1c3",
  "decision_mode": "telemetry-json-sandbox-writer",
  "used_search": true,
  "used_neural": false,
  "neural_latency_ms": null,
  "search_nodes": 96,
  "search_depth": 3,
  "fallback_reason": null
}"#;

    assert_eq!(first_json, expected_json);
    assert_eq!(second_json, expected_json);

    let decoded: DecisionTrace =
        serde_json::from_str(&first_json).expect("helper JSON deserializes");

    assert_eq!(decoded, trace);
    assert!(decoded.validate_consistency().is_ok());
}

#[test]
fn decision_trace_pretty_json_helper_is_string_only_without_output_path_contract() {
    let helper: fn(&DecisionTrace) -> Result<String, serde_json::Error> =
        decision_trace_to_pretty_json;
    let trace = trace_with_selected(Some(action_id("e2e4")));

    let json = helper(&trace).expect("helper returns a JSON string");
    let value: serde_json::Value =
        serde_json::from_str(&json).expect("helper JSON parses as a value");

    assert!(json.starts_with("{\n"));
    assert!(value.get("path").is_none());
    assert!(value.get("file_path").is_none());
    assert!(value.get("output_path").is_none());
    assert!(value.get("written_to").is_none());
}

#[test]
fn decision_trace_json_deserialization_normalizes_action_ids() {
    let decoded: DecisionTrace = serde_json::from_value(serde_json::json!({
        "state_key": "phase3:state:001",
        "legal_action_ids": [" E2E4 ", "G1F3"],
        "selected_action_id": " g1f3 ",
        "decision_mode": "json-normalization",
        "used_search": false,
        "used_neural": false,
        "neural_latency_ms": null,
        "search_nodes": null,
        "search_depth": null,
        "fallback_reason": null
    }))
    .expect("DecisionTrace deserializes");

    assert_eq!(decoded.legal_action_ids[0].as_str(), "e2e4");
    assert_eq!(decoded.legal_action_ids[1].as_str(), "g1f3");
    assert_eq!(
        decoded.selected_action_id.as_ref().unwrap().as_str(),
        "g1f3"
    );
    assert!(decoded.validate_consistency().is_ok());
}

#[test]
fn invalid_deserialized_decision_trace_still_fails_consistency_validation() {
    let decoded: DecisionTrace = serde_json::from_value(serde_json::json!({
        "state_key": "phase3:state:001",
        "legal_action_ids": ["e2e4", "g1f3"],
        "selected_action_id": "a2a4",
        "decision_mode": "json-invalid",
        "used_search": false,
        "used_neural": false,
        "neural_latency_ms": null,
        "search_nodes": null,
        "search_depth": null,
        "fallback_reason": null
    }))
    .expect("DecisionTrace deserializes before consistency validation");

    assert_eq!(
        decoded.validate_consistency(),
        Err(DecisionTraceValidationError::SelectedActionIdNotLegal {
            selected_action_id: action_id("a2a4"),
        })
    );
}

#[test]
fn schema_constructs_without_engine_or_chess_runtime_execution() {
    let trace = DecisionTrace {
        state_key: "standalone-state-key".to_string(),
        legal_action_ids: vec![action_id(" E2E4 "), action_id("b1c3")],
        selected_action_id: Some(action_id("e2e4")),
        decision_mode: "standalone".to_string(),
        used_search: false,
        used_neural: false,
        neural_latency_ms: None,
        search_nodes: None,
        search_depth: None,
        fallback_reason: None,
    };

    assert_eq!(trace.state_key, "standalone-state-key");
    assert_eq!(trace.legal_action_ids[0].as_str(), "e2e4");
    assert_eq!(trace.selected_action_id.as_ref().unwrap().as_str(), "e2e4");
    assert_eq!(trace.decision_mode, "standalone");
    assert!(trace.validate_action_membership().is_ok());
}

#[test]
fn selected_action_id_must_be_in_legal_action_ids_when_validated() {
    let valid_trace = trace_with_selected(Some(action_id("g1f3")));
    assert!(valid_trace.validate_action_membership().is_ok());

    let invalid_trace = trace_with_selected(Some(action_id("a2a4")));
    assert_eq!(
        invalid_trace.validate_action_membership(),
        Err(DecisionTraceValidationError::SelectedActionIdNotLegal {
            selected_action_id: action_id("a2a4"),
        },)
    );
}

#[test]
fn missing_selected_action_id_is_valid_for_fallback_or_no_decision_traces() {
    let trace = DecisionTrace {
        fallback_reason: Some("no legal decision emitted".to_string()),
        ..trace_with_selected(None)
    };

    assert_eq!(trace.selected_action_id, None);
    assert!(trace.validate_action_membership().is_ok());
}

#[test]
fn blank_state_key_is_rejected() {
    let trace = DecisionTrace {
        state_key: " \t\r\n ".to_string(),
        ..trace_with_selected(Some(action_id("e2e4")))
    };

    assert_eq!(
        trace.validate_state_key(),
        Err(DecisionTraceValidationError::EmptyStateKey)
    );
    assert_eq!(
        trace.validate_consistency(),
        Err(DecisionTraceValidationError::EmptyStateKey)
    );
}

#[test]
fn empty_legal_action_ids_is_rejected() {
    let trace = DecisionTrace {
        legal_action_ids: vec![],
        selected_action_id: None,
        ..trace_with_selected(None)
    };

    assert_eq!(
        trace.validate_legal_actions_present(),
        Err(DecisionTraceValidationError::EmptyLegalActionIds)
    );
    assert_eq!(
        trace.validate_consistency(),
        Err(DecisionTraceValidationError::EmptyLegalActionIds)
    );
}

#[test]
fn validate_consistency_accepts_valid_selected_action() {
    let trace = trace_with_selected(Some(action_id("g1f3")));

    assert!(trace.validate_consistency().is_ok());
}

#[test]
fn validate_consistency_accepts_fallback_without_selected_action_when_legal_actions_exist() {
    let trace = DecisionTrace {
        fallback_reason: Some("fallback-without-selected-action".to_string()),
        ..trace_with_selected(None)
    };

    assert!(trace.validate_consistency().is_ok());
}

#[test]
fn validate_consistency_rejects_selected_action_outside_legal_actions() {
    let trace = trace_with_selected(Some(action_id("a2a4")));

    assert_eq!(
        trace.validate_consistency(),
        Err(DecisionTraceValidationError::SelectedActionIdNotLegal {
            selected_action_id: action_id("a2a4"),
        })
    );
}

#[test]
fn flags_represent_search_only_neural_guided_and_fallback_states() {
    let search_only = DecisionTrace {
        decision_mode: "search-only".to_string(),
        used_search: true,
        used_neural: false,
        search_nodes: Some(128),
        search_depth: Some(3),
        ..trace_with_selected(Some(action_id("e2e4")))
    };

    let neural_guided = DecisionTrace {
        decision_mode: "neural-guided".to_string(),
        used_search: true,
        used_neural: true,
        neural_latency_ms: Some(7),
        search_nodes: Some(64),
        search_depth: Some(2),
        ..trace_with_selected(Some(action_id("g1f3")))
    };

    let fallback = DecisionTrace {
        decision_mode: "fallback".to_string(),
        used_search: false,
        used_neural: false,
        fallback_reason: Some("no-decision".to_string()),
        ..trace_with_selected(None)
    };

    assert_eq!(
        (search_only.used_search, search_only.used_neural),
        (true, false)
    );
    assert_eq!(
        (neural_guided.used_search, neural_guided.used_neural),
        (true, true)
    );
    assert_eq!((fallback.used_search, fallback.used_neural), (false, false));
    assert!(search_only.validate_action_membership().is_ok());
    assert!(neural_guided.validate_action_membership().is_ok());
    assert!(fallback.validate_action_membership().is_ok());
}

#[test]
fn optional_latency_node_and_depth_fields_are_deterministic_to_compare() {
    let baseline = DecisionTrace {
        neural_latency_ms: Some(11),
        search_nodes: Some(256),
        search_depth: Some(4),
        ..trace_with_selected(Some(action_id("e2e4")))
    };
    let same = baseline.clone();
    let absent = DecisionTrace {
        neural_latency_ms: None,
        search_nodes: None,
        search_depth: None,
        ..trace_with_selected(Some(action_id("e2e4")))
    };

    assert_eq!(baseline, same);
    assert_ne!(baseline, absent);
    assert_eq!(absent.neural_latency_ms, None);
    assert_eq!(absent.search_nodes, None);
    assert_eq!(absent.search_depth, None);
}
