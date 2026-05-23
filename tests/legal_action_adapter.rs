use tactical_chess_pure_lab::core::{
    duplicate_legal_action_ids, sort_legal_actions_by_key, ActionId, LegalAction,
    LEGAL_ACTION_VERSION,
};

#[test]
fn legal_action_version_is_exposed_and_non_empty() {
    assert!(!LEGAL_ACTION_VERSION.is_empty());
}

fn keys(legal_actions: &[LegalAction]) -> Vec<String> {
    legal_actions
        .iter()
        .map(|legal_action| legal_action.action_key.clone())
        .collect()
}

fn ids(legal_actions: &[LegalAction]) -> Vec<String> {
    legal_actions
        .iter()
        .map(|legal_action| legal_action.action_id.as_str().to_string())
        .collect()
}

fn fixture_policy_vocab_index(key: &str) -> Option<usize> {
    match key {
        "e2e4" => Some(825),
        "g1f3" => Some(1353),
        _ => None,
    }
}

#[test]
fn legal_action_normalizes_action_key_through_action_id() {
    let legal_action = LegalAction::from_action_key("  E2E4  ");

    assert_eq!(legal_action.action_id, ActionId::from_normalized_key("e2e4"));
    assert_eq!(legal_action.action_id.as_str(), "e2e4");
    assert_eq!(legal_action.action_key, "e2e4");
}

#[test]
fn sort_legal_actions_by_key_is_deterministic() {
    let mut legal_actions = vec![
        LegalAction::from_action_key("g1f3"),
        LegalAction::from_action_key(" E2E4 "),
        LegalAction::from_action_key("b1c3"),
        LegalAction::from_action_key("a7a8q"),
    ];

    sort_legal_actions_by_key(&mut legal_actions);

    assert_eq!(keys(&legal_actions), vec!["a7a8q", "b1c3", "e2e4", "g1f3"]);
    assert_eq!(ids(&legal_actions), vec!["a7a8q", "b1c3", "e2e4", "g1f3"]);
}

#[test]
fn duplicate_legal_action_ids_are_detected() {
    let legal_actions = vec![
        LegalAction::from_action_key("e2e4"),
        LegalAction::from_action_key("g1f3"),
        LegalAction::from_action_key(" E2E4 "),
        LegalAction::from_action_key("b1c3"),
        LegalAction::from_action_key("g1f3"),
    ];

    let duplicate_ids = duplicate_legal_action_ids(&legal_actions);
    let duplicates = duplicate_ids
        .iter()
        .map(ActionId::as_str)
        .collect::<Vec<_>>();

    assert_eq!(duplicates, vec!["e2e4", "g1f3"]);
}

#[test]
fn legal_action_adapter_does_not_require_chess_runtime_dependencies() {
    let legal_actions = vec![
        LegalAction::from_action_key("a2a4"),
        LegalAction::from_action_key("b1c3"),
    ];

    assert_eq!(legal_actions[0].action_key, "a2a4");
    assert_eq!(legal_actions[1].action_id.as_str(), "b1c3");
}

#[test]
fn debug_fallback_action_key_is_not_policy_encodable() {
    let legal_action = LegalAction::from_action_key("~Move { debug }");

    assert_eq!(legal_action.action_key, "~move { debug }");
    assert_eq!(legal_action.action_id.as_str(), "~move { debug }");
    assert_eq!(fixture_policy_vocab_index(&legal_action.action_key), None);
}

#[test]
fn standard_uci_action_key_remains_helper_encodable() {
    let legal_action = LegalAction::from_action_key(" E2E4 ");

    assert_eq!(legal_action.action_key, "e2e4");
    assert_eq!(legal_action.action_id.as_str(), "e2e4");
    assert_eq!(fixture_policy_vocab_index(&legal_action.action_key), Some(825));
}

#[test]
fn legal_action_adapter_behavior_is_stable_across_repeated_calls() {
    let inputs = vec!["g1f3", " E2E4 ", "b1c3", "g1f3"];
    let expected_sorted = vec!["b1c3", "e2e4", "g1f3", "g1f3"];
    let expected_duplicates = vec!["g1f3"];

    for _ in 0..8 {
        let mut legal_actions = inputs
            .iter()
            .map(|input| LegalAction::from_action_key(input))
            .collect::<Vec<_>>();
        sort_legal_actions_by_key(&mut legal_actions);
        assert_eq!(keys(&legal_actions), expected_sorted);

        let duplicate_ids = duplicate_legal_action_ids(&legal_actions);
        let duplicates = duplicate_ids
            .iter()
            .map(ActionId::as_str)
            .collect::<Vec<_>>();
        assert_eq!(duplicates, expected_duplicates);
    }
}
