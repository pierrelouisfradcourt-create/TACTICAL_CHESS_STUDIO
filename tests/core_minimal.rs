use tactical_chess_pure_lab::core::{
    duplicate_action_ids, has_duplicate_action_ids, normalize_action_key, stable_sort_action_ids,
    ActionId, EntityId, GameResult, PlayerId, ACTION_ID_VERSION,
};

#[test]
fn action_id_version_is_exposed_and_non_empty() {
    assert!(!ACTION_ID_VERSION.is_empty());
}

#[test]
fn action_id_normalization_is_deterministic() {
    let first = normalize_action_key("  E2E4  ");
    let second = normalize_action_key("e2e4");

    assert_eq!(first, "e2e4");
    assert_eq!(first, second);
    assert_eq!(ActionId::from_normalized_key(" E2E4 ").as_str(), "e2e4");
}

#[test]
fn action_id_ordering_is_stable() {
    let mut action_ids = vec![
        ActionId::from_normalized_key("g1f3"),
        ActionId::from_normalized_key("e2e4"),
        ActionId::from_normalized_key("b1c3"),
    ];

    stable_sort_action_ids(&mut action_ids);

    let ordered = action_ids.iter().map(ActionId::as_str).collect::<Vec<_>>();
    assert_eq!(ordered, vec!["b1c3", "e2e4", "g1f3"]);
}

#[test]
fn duplicate_action_id_detection_works() {
    let action_ids = vec![
        ActionId::from_normalized_key("e2e4"),
        ActionId::from_normalized_key("g1f3"),
        ActionId::from_normalized_key(" E2E4 "),
        ActionId::from_normalized_key("b1c3"),
        ActionId::from_normalized_key("g1f3"),
    ];

    assert!(has_duplicate_action_ids(&action_ids));

    let duplicate_ids = duplicate_action_ids(&action_ids);
    let duplicates = duplicate_ids
        .iter()
        .map(ActionId::as_str)
        .collect::<Vec<_>>();
    assert_eq!(duplicates, vec!["e2e4", "g1f3"]);
}

#[test]
fn game_result_represents_minimal_outcomes() {
    let player = PlayerId::new(1);

    assert_eq!(GameResult::Ongoing, GameResult::Ongoing);
    assert_eq!(GameResult::Draw, GameResult::Draw);
    assert_eq!(
        GameResult::Winner(player),
        GameResult::Winner(PlayerId::new(1))
    );
}

#[test]
fn core_identifiers_do_not_require_chess_runtime_types() {
    let player = PlayerId::new(2);
    let entity = EntityId::new(42);
    let action = ActionId::from_normalized_key("a7a8q");

    assert_eq!(player.value(), 2);
    assert_eq!(entity.value(), 42);
    assert_eq!(action.as_str(), "a7a8q");
}
