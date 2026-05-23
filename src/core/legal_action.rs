use crate::core::action_id::ActionId;
use std::collections::BTreeSet;

pub const LEGAL_ACTION_VERSION: &str = "legal_action_v0";

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LegalAction {
    pub action_id: ActionId,
    pub action_key: String,
}

impl LegalAction {
    pub fn from_action_key(input: &str) -> Self {
        let action_id = ActionId::from_normalized_key(input);
        let action_key = action_id.as_str().to_string();
        Self {
            action_id,
            action_key,
        }
    }
}

pub fn sort_legal_actions_by_key(legal_actions: &mut [LegalAction]) {
    legal_actions.sort_by(|left, right| {
        left.action_key
            .cmp(&right.action_key)
            .then_with(|| left.action_id.cmp(&right.action_id))
    });
}

pub fn duplicate_legal_action_ids(legal_actions: &[LegalAction]) -> Vec<ActionId> {
    let mut seen = BTreeSet::new();
    let mut duplicates = BTreeSet::new();

    for legal_action in legal_actions {
        if !seen.insert(legal_action.action_id.clone()) {
            duplicates.insert(legal_action.action_id.clone());
        }
    }

    duplicates.into_iter().collect()
}
