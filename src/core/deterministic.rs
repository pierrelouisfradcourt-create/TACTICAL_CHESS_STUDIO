use crate::core::action_id::ActionId;
use std::collections::BTreeSet;

pub fn normalize_action_key(input: &str) -> String {
    input
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_ascii_lowercase()
}

pub fn stable_sort_action_ids(action_ids: &mut [ActionId]) {
    action_ids.sort();
}

pub fn duplicate_action_ids(action_ids: &[ActionId]) -> Vec<ActionId> {
    let mut seen = BTreeSet::new();
    let mut duplicates = BTreeSet::new();

    for action_id in action_ids {
        if !seen.insert(action_id.clone()) {
            duplicates.insert(action_id.clone());
        }
    }

    duplicates.into_iter().collect()
}

pub fn has_duplicate_action_ids(action_ids: &[ActionId]) -> bool {
    let mut seen = BTreeSet::new();
    action_ids
        .iter()
        .any(|action_id| !seen.insert(action_id.clone()))
}
