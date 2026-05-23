use tactical_chess_pure_lab::core::{
    ActionId, ActionMask, ActionMaskHumanGateAuthorizationState, ActionMaskProvenance,
    ActionMaskProvenanceDiagnostics, ActionMaskProvenanceError, HumanDecision,
    HumanGateAuthorization, HumanGateScope, LegalAction, ACTION_ID_VERSION, ACTION_MASK_VERSION,
    LEGAL_ACTION_VERSION,
};

fn legal_action(key: &str) -> LegalAction {
    LegalAction::from_action_key(key)
}

fn fixture_mask() -> ActionMask {
    let legal_actions = vec![
        legal_action("e2e4"),
        legal_action("g1f3"),
        legal_action("~Move { debug }"),
    ];

    ActionMask::from_legal_actions(
        &legal_actions,
        Some(|key: &str| match key {
            "e2e4" => Some(4),
            "g1f3" => Some(6),
            _ => None,
        }),
        Some("fixture-fingerprint".to_string()),
    )
    .expect("mask should build")
}

fn fixture_provenance(human_gate_authorization: bool) -> ActionMaskProvenance {
    ActionMaskProvenance::from_action_mask(
        &fixture_mask(),
        "rust_engine_legal_actions",
        "classical_ruleset_v0",
        "classical",
        human_gate_authorization,
        None,
    )
    .expect("provenance should build")
}

fn fixture_authorization(scope: HumanGateScope) -> HumanGateAuthorization {
    HumanGateAuthorization::new(
        true,
        HumanDecision::ApproveForDatasetCandidate,
        "human reviewed fixture",
        "operator-console",
        "trace-amp-001",
        "2026-05-15T00:00:00Z",
        scope,
        Some("review-packet-amp-001".to_string()),
        Some("dataset-candidate-amp-001".to_string()),
        Some("metadata only".to_string()),
        None,
    )
    .expect("fixture authorization should build")
}

#[test]
fn action_mask_provenance_carries_action_id_version() {
    let provenance = fixture_provenance(false);

    assert_eq!(provenance.action_id_version(), ACTION_ID_VERSION);
}

#[test]
fn action_mask_provenance_carries_legal_action_version() {
    let provenance = fixture_provenance(false);

    assert_eq!(provenance.legal_action_version(), LEGAL_ACTION_VERSION);
}

#[test]
fn action_mask_provenance_carries_action_mask_version() {
    let provenance = fixture_provenance(false);

    assert_eq!(provenance.action_mask_version(), ACTION_MASK_VERSION);
}

#[test]
fn action_mask_provenance_requires_move_vocab_fingerprint() {
    let legal_actions = vec![legal_action("e2e4")];
    let mask = ActionMask::from_legal_actions(&legal_actions, Some(|_: &str| Some(4)), None)
        .expect("mask should build");

    let err = ActionMaskProvenance::from_action_mask(
        &mask,
        "rust_engine_legal_actions",
        "classical_ruleset_v0",
        "classical",
        false,
        None,
    )
    .expect_err("missing move vocab fingerprint should fail closed");

    assert_eq!(err, ActionMaskProvenanceError::MissingMoveVocabFingerprint);
}

#[test]
fn action_mask_provenance_rejects_empty_legal_move_source() {
    let err = ActionMaskProvenance::from_action_mask(
        &fixture_mask(),
        " ",
        "classical_ruleset_v0",
        "classical",
        false,
        None,
    )
    .expect_err("empty legal move source should fail closed");

    assert_eq!(err, ActionMaskProvenanceError::MissingLegalMoveSource);
}

#[test]
fn action_mask_provenance_rejects_empty_ruleset() {
    let err = ActionMaskProvenance::from_action_mask(
        &fixture_mask(),
        "rust_engine_legal_actions",
        "",
        "classical",
        false,
        None,
    )
    .expect_err("empty ruleset should fail closed");

    assert_eq!(err, ActionMaskProvenanceError::MissingRuleset);
}

#[test]
fn action_mask_provenance_rejects_empty_variant() {
    let err = ActionMaskProvenance::from_action_mask(
        &fixture_mask(),
        "rust_engine_legal_actions",
        "classical_ruleset_v0",
        "\t",
        false,
        None,
    )
    .expect_err("empty variant should fail closed");

    assert_eq!(err, ActionMaskProvenanceError::MissingVariant);
}

#[test]
fn action_mask_provenance_snapshots_policy_indices() {
    let mask = fixture_mask();
    let provenance = ActionMaskProvenance::from_action_mask(
        &mask,
        "rust_engine_legal_actions",
        "classical_ruleset_v0",
        "classical",
        false,
        None,
    )
    .expect("provenance should build");

    assert_eq!(provenance.policy_indices(), &[Some(4), Some(6), None]);
    assert_eq!(provenance.policy_indices(), mask.policy_indices());
}

#[test]
fn action_mask_provenance_snapshots_unencodable_action_ids() {
    let mask = fixture_mask();
    let provenance = ActionMaskProvenance::from_action_mask(
        &mask,
        "rust_engine_legal_actions",
        "classical_ruleset_v0",
        "classical",
        false,
        None,
    )
    .expect("provenance should build");

    assert_eq!(
        provenance.unencodable_action_ids(),
        &[ActionId::from_normalized_key("~Move { debug }")]
    );
    assert_eq!(
        provenance.unencodable_action_ids(),
        mask.unencodable_action_ids()
    );
}

#[test]
fn unencodable_action_mask_provenance_blocks_dataset_use() {
    let mask = fixture_mask();
    let provenance = ActionMaskProvenance::from_action_mask(
        &mask,
        "rust_engine_legal_actions",
        "classical_ruleset_v0",
        "classical",
        true,
        None,
    )
    .expect("provenance should build");

    assert_eq!(provenance.policy_indices(), &[Some(4), Some(6), None]);
    assert_eq!(
        provenance.unencodable_action_ids(),
        &[ActionId::from_normalized_key("~Move { debug }")]
    );
    assert!(provenance.blocks_dataset_use());
}

#[test]
fn action_mask_provenance_preserves_false_human_gate_and_blocks_dataset_use() {
    let provenance = fixture_provenance(false);

    assert!(!provenance.human_gate_authorization());
    assert_eq!(
        provenance.human_gate_authorization_state(),
        &ActionMaskHumanGateAuthorizationState::Missing
    );
    assert!(provenance.blocks_dataset_use());
}

#[test]
fn action_mask_provenance_preserves_true_human_gate_without_admitting_training() {
    let provenance = fixture_provenance(true);

    assert!(provenance.human_gate_authorization());
    assert!(provenance.human_gate_authorization_state().is_passive());
    assert!(provenance.blocks_dataset_use());
}

#[test]
fn action_mask_provenance_blocks_dataset_use_without_human_gate_authorization() {
    let provenance = fixture_provenance(false);

    assert_eq!(provenance.human_gate_authorization_metadata(), None);
    assert!(provenance.blocks_dataset_use());
}

#[test]
fn action_mask_provenance_blocks_dataset_use_with_passive_human_gate() {
    let authorization = fixture_authorization(HumanGateScope::Observation);
    let provenance = ActionMaskProvenance::from_action_mask_with_human_gate_state(
        &fixture_mask(),
        "rust_engine_legal_actions",
        "classical_ruleset_v0",
        "classical",
        ActionMaskHumanGateAuthorizationState::PassiveAuthorization(authorization),
        None,
    )
    .expect("provenance should build");

    assert!(provenance.human_gate_authorization());
    assert!(provenance.human_gate_authorization_state().is_passive());
    assert!(provenance.blocks_dataset_use());
}

#[test]
fn action_mask_provenance_carries_human_gate_authorization_metadata() {
    let authorization = fixture_authorization(HumanGateScope::Observation);
    let trace_id = authorization.trace_id().to_string();
    let provenance = ActionMaskProvenance::from_action_mask_with_human_gate_state(
        &fixture_mask(),
        "rust_engine_legal_actions",
        "classical_ruleset_v0",
        "classical",
        ActionMaskHumanGateAuthorizationState::PassiveAuthorization(authorization),
        None,
    )
    .expect("provenance should build");

    let observed = provenance
        .human_gate_authorization_metadata()
        .expect("structured HumanGate metadata should be carried");
    assert_eq!(observed.trace_id(), trace_id);
    assert_eq!(observed.scope(), HumanGateScope::Observation);
    assert!(provenance.blocks_dataset_use());
}

#[test]
fn action_mask_provenance_promotion_required_state_does_not_create_dataset_ready_path() {
    let authorization = fixture_authorization(HumanGateScope::DatasetLabelPromotion);
    let provenance = ActionMaskProvenance::from_action_mask_with_human_gate_state(
        &fixture_mask(),
        "rust_engine_legal_actions",
        "classical_ruleset_v0",
        "classical",
        ActionMaskHumanGateAuthorizationState::PromotionAuthorizationRequired(authorization),
        None,
    )
    .expect("provenance should build");

    assert!(provenance
        .human_gate_authorization_state()
        .requires_promotion_authorization());
    assert!(provenance.human_gate_authorization_metadata().is_some());
    assert!(provenance.blocks_dataset_use());
}

#[test]
fn action_mask_provenance_all_current_human_gate_states_block_dataset_use() {
    let states = vec![
        ActionMaskHumanGateAuthorizationState::Missing,
        ActionMaskHumanGateAuthorizationState::PassiveCompatibilityFlag,
        ActionMaskHumanGateAuthorizationState::PassiveAuthorization(fixture_authorization(
            HumanGateScope::Observation,
        )),
        ActionMaskHumanGateAuthorizationState::PromotionAuthorizationRequired(
            fixture_authorization(HumanGateScope::DatasetLabelPromotion),
        ),
    ];

    for state in states {
        let provenance = ActionMaskProvenance::from_action_mask_with_human_gate_state(
            &fixture_mask(),
            "rust_engine_legal_actions",
            "classical_ruleset_v0",
            "classical",
            state,
            None,
        )
        .expect("provenance should build");

        assert!(provenance.blocks_dataset_use());
    }
}

#[test]
fn action_mask_provenance_diagnostics_are_metadata_only() {
    let diagnostics = ActionMaskProvenanceDiagnostics {
        decision_mode: Some("diagnostic".to_string()),
        authority_source: Some("search_context".to_string()),
        final_selected_move: Some("e2e4".to_string()),
        search_selected_move: Some("e2e4".to_string()),
        search_best_move: Some("g1f3".to_string()),
        neural_predicted_move: Some("b1c3".to_string()),
        rerank_status: Some("not_applied".to_string()),
        fallback_reason: None,
    };

    let provenance = ActionMaskProvenance::from_action_mask(
        &fixture_mask(),
        "rust_engine_legal_actions",
        "classical_ruleset_v0",
        "classical",
        true,
        Some(diagnostics),
    )
    .expect("provenance should build");

    let observed = provenance
        .diagnostics()
        .expect("diagnostics should be present");
    assert_eq!(observed.neural_predicted_move.as_deref(), Some("b1c3"));
    assert!(provenance.blocks_dataset_use());
}

#[test]
fn action_mask_provenance_does_not_activate_chess960() {
    let provenance = ActionMaskProvenance::from_action_mask(
        &fixture_mask(),
        "rust_engine_legal_actions",
        "classical_ruleset_v0",
        "classical",
        true,
        None,
    )
    .expect("provenance should build");

    assert_eq!(provenance.variant(), "classical");
    assert!(provenance.blocks_dataset_use());
}
