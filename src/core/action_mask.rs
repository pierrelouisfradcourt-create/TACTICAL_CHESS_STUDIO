use crate::core::action_id::ActionId;
use crate::core::legal_action::{duplicate_legal_action_ids, LegalAction};

pub const ACTION_MASK_VERSION: &str = "action_mask_v0_skeleton";

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ActionMaskError {
    DuplicateActionId {
        duplicate_action_ids: Vec<ActionId>,
    },
    PolicyIndexOutOfBounds {
        policy_index: usize,
        vocab_size: usize,
    },
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ActionMask {
    version: &'static str,
    legal_action_ids: Vec<ActionId>,
    legal_action_keys: Vec<String>,
    policy_indices: Vec<Option<usize>>,
    unencodable_action_ids: Vec<ActionId>,
    move_vocab_fingerprint: Option<String>,
}

impl ActionMask {
    pub fn from_legal_actions<F>(
        legal_actions: &[LegalAction],
        project_policy_index: Option<F>,
        move_vocab_fingerprint: Option<String>,
    ) -> Result<Self, ActionMaskError>
    where
        F: Fn(&str) -> Option<usize>,
    {
        let duplicate_action_ids = duplicate_legal_action_ids(legal_actions);
        if !duplicate_action_ids.is_empty() {
            return Err(ActionMaskError::DuplicateActionId {
                duplicate_action_ids,
            });
        }

        let mut legal_action_ids = Vec::with_capacity(legal_actions.len());
        let mut legal_action_keys = Vec::with_capacity(legal_actions.len());
        let mut policy_indices = Vec::with_capacity(legal_actions.len());
        let mut unencodable_action_ids = Vec::new();

        for legal_action in legal_actions {
            let policy_index = project_policy_index
                .as_ref()
                .and_then(|project| project(&legal_action.action_key));

            if policy_index.is_none() {
                unencodable_action_ids.push(legal_action.action_id.clone());
            }

            legal_action_ids.push(legal_action.action_id.clone());
            legal_action_keys.push(legal_action.action_key.clone());
            policy_indices.push(policy_index);
        }

        Ok(Self {
            version: ACTION_MASK_VERSION,
            legal_action_ids,
            legal_action_keys,
            policy_indices,
            unencodable_action_ids,
            move_vocab_fingerprint,
        })
    }

    pub fn from_legal_actions_without_projection(
        legal_actions: &[LegalAction],
        move_vocab_fingerprint: Option<String>,
    ) -> Result<Self, ActionMaskError> {
        Self::from_legal_actions(
            legal_actions,
            None::<fn(&str) -> Option<usize>>,
            move_vocab_fingerprint,
        )
    }

    pub fn version(&self) -> &'static str {
        self.version
    }

    pub fn legal_action_ids(&self) -> &[ActionId] {
        &self.legal_action_ids
    }

    pub fn legal_action_keys(&self) -> &[String] {
        &self.legal_action_keys
    }

    pub fn policy_indices(&self) -> &[Option<usize>] {
        &self.policy_indices
    }

    pub fn unencodable_action_ids(&self) -> &[ActionId] {
        &self.unencodable_action_ids
    }

    pub fn move_vocab_fingerprint(&self) -> Option<&str> {
        self.move_vocab_fingerprint.as_deref()
    }

    pub fn is_fully_projectable(&self) -> bool {
        self.unencodable_action_ids.is_empty()
    }

    pub fn to_policy_bitvec(&self, vocab_size: usize) -> Result<Vec<bool>, ActionMaskError> {
        let mut mask = vec![false; vocab_size];

        for policy_index in self.policy_indices.iter().flatten() {
            if *policy_index >= vocab_size {
                return Err(ActionMaskError::PolicyIndexOutOfBounds {
                    policy_index: *policy_index,
                    vocab_size,
                });
            }

            mask[*policy_index] = true;
        }

        Ok(mask)
    }
}
