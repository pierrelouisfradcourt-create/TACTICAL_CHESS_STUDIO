use tactical_chess_pure_lab::core::{
    ActionId, ActionMask, ActionMaskError, LegalAction, ACTION_MASK_VERSION,
};

fn legal_action(key: &str) -> LegalAction {
    LegalAction::from_action_key(key)
}

fn action_id_strings(action_ids: &[ActionId]) -> Vec<String> {
    action_ids
        .iter()
        .map(|action_id| action_id.as_str().to_string())
        .collect()
}

fn string_slice(values: &[String]) -> Vec<&str> {
    values.iter().map(String::as_str).collect()
}

#[test]
fn action_mask_preserves_deterministic_legal_action_order() {
    let legal_actions = vec![
        legal_action("a7a8q"),
        legal_action("b1c3"),
        legal_action("e2e4"),
        legal_action("g1f3"),
    ];

    let mask = ActionMask::from_legal_actions(
        &legal_actions,
        Some(|key: &str| match key {
            "a7a8q" => Some(3),
            "b1c3" => Some(5),
            "e2e4" => Some(7),
            "g1f3" => Some(11),
            _ => None,
        }),
        Some("fixture-fingerprint".to_string()),
    )
    .expect("mask should build");

    assert_eq!(mask.version(), ACTION_MASK_VERSION);
    assert_eq!(
        action_id_strings(mask.legal_action_ids()),
        vec!["a7a8q", "b1c3", "e2e4", "g1f3"]
    );
    assert_eq!(
        string_slice(mask.legal_action_keys()),
        vec!["a7a8q", "b1c3", "e2e4", "g1f3"]
    );
    assert_eq!(
        mask.policy_indices(),
        &[Some(3), Some(5), Some(7), Some(11)]
    );
    assert_eq!(mask.move_vocab_fingerprint(), Some("fixture-fingerprint"));
}

#[test]
fn action_mask_duplicate_action_id_fails_closed() {
    let legal_actions = vec![
        legal_action("e2e4"),
        legal_action("g1f3"),
        legal_action(" E2E4 "),
    ];

    let err = ActionMask::from_legal_actions(&legal_actions, Some(|_: &str| Some(0)), None)
        .expect_err("duplicate ActionId should fail closed");

    assert_eq!(
        err,
        ActionMaskError::DuplicateActionId {
            duplicate_action_ids: vec![ActionId::from_normalized_key("e2e4")]
        }
    );
}

#[test]
fn action_mask_fully_projectable_actions_report_true() {
    let legal_actions = vec![legal_action("e2e4"), legal_action("g1f3")];

    let mask = ActionMask::from_legal_actions(
        &legal_actions,
        Some(|key: &str| match key {
            "e2e4" => Some(825),
            "g1f3" => Some(1353),
            _ => None,
        }),
        None,
    )
    .expect("mask should build");

    assert!(mask.is_fully_projectable());
    assert!(mask.unencodable_action_ids().is_empty());
}

#[test]
fn action_mask_tracks_unencodable_debug_action_key() {
    let legal_actions = vec![legal_action("e2e4"), legal_action("~Move { debug }")];

    let mask = ActionMask::from_legal_actions(
        &legal_actions,
        Some(|key: &str| (key == "e2e4").then_some(4)),
        None,
    )
    .expect("mask should build");

    assert!(!mask.is_fully_projectable());
    assert_eq!(string_slice(mask.legal_action_keys()), vec!["e2e4", "~move { debug }"]);
    assert_eq!(mask.policy_indices(), &[Some(4), None]);
    assert_eq!(
        action_id_strings(mask.unencodable_action_ids()),
        vec!["~move { debug }"]
    );

    let bitvec = mask
        .to_policy_bitvec(8)
        .expect("policy bitvec should build");
    assert_eq!(
        bitvec,
        vec![false, false, false, false, true, false, false, false]
    );
    assert_eq!(bitvec.iter().filter(|is_set| **is_set).count(), 1);
}

#[test]
fn action_mask_policy_bitvec_sets_only_projected_legal_policy_indices() {
    let legal_actions = vec![
        legal_action("e2e4"),
        legal_action("g1f3"),
        legal_action("h2h4"),
    ];

    let mask = ActionMask::from_legal_actions(
        &legal_actions,
        Some(|key: &str| match key {
            "e2e4" => Some(1),
            "h2h4" => Some(4),
            _ => None,
        }),
        None,
    )
    .expect("mask should build");

    let bitvec = mask
        .to_policy_bitvec(6)
        .expect("policy bitvec should build");
    assert_eq!(bitvec, vec![false, true, false, false, true, false]);
}

#[test]
fn action_mask_policy_bitvec_fails_closed_on_out_of_bounds_projection() {
    let legal_actions = vec![legal_action("e2e4")];

    let mask = ActionMask::from_legal_actions(&legal_actions, Some(|_: &str| Some(6)), None)
        .expect("mask should build");

    assert_eq!(
        mask.to_policy_bitvec(6),
        Err(ActionMaskError::PolicyIndexOutOfBounds {
            policy_index: 6,
            vocab_size: 6
        })
    );
}

#[test]
fn action_mask_keeps_promotion_qrbn_keys_distinct() {
    let legal_actions = vec![
        legal_action("a7a8q"),
        legal_action("a7a8r"),
        legal_action("a7a8b"),
        legal_action("a7a8n"),
    ];

    let mask = ActionMask::from_legal_actions(
        &legal_actions,
        Some(|key: &str| match key {
            "a7a8q" => Some(10),
            "a7a8r" => Some(11),
            "a7a8b" => Some(12),
            "a7a8n" => Some(13),
            _ => None,
        }),
        None,
    )
    .expect("mask should build");

    assert_eq!(
        string_slice(mask.legal_action_keys()),
        vec!["a7a8q", "a7a8r", "a7a8b", "a7a8n"]
    );
    assert_eq!(
        mask.policy_indices(),
        &[Some(10), Some(11), Some(12), Some(13)]
    );
    assert!(mask.is_fully_projectable());
}

#[test]
fn action_mask_keeps_classical_castling_keys_distinct() {
    let legal_actions = vec![
        legal_action("e1g1"),
        legal_action("e1c1"),
        legal_action("e8g8"),
        legal_action("e8c8"),
    ];

    let mask = ActionMask::from_legal_actions(
        &legal_actions,
        Some(|key: &str| match key {
            "e1g1" => Some(20),
            "e1c1" => Some(21),
            "e8g8" => Some(22),
            "e8c8" => Some(23),
            _ => None,
        }),
        None,
    )
    .expect("mask should build");

    assert_eq!(
        string_slice(mask.legal_action_keys()),
        vec!["e1g1", "e1c1", "e8g8", "e8c8"]
    );
    assert_eq!(
        mask.policy_indices(),
        &[Some(20), Some(21), Some(22), Some(23)]
    );
    assert!(mask.is_fully_projectable());
}

#[test]
fn action_mask_without_projection_does_not_activate_dataset_training_or_chess960_behavior() {
    let legal_actions = vec![legal_action("e2e4"), legal_action("g1f3")];

    let mask = ActionMask::from_legal_actions_without_projection(&legal_actions, None)
        .expect("mask should build");

    assert_eq!(mask.policy_indices(), &[None, None]);
    assert_eq!(mask.unencodable_action_ids().len(), 2);
    assert!(!mask.is_fully_projectable());
}
