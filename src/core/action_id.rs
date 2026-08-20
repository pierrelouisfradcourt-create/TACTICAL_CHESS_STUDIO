use crate::core::deterministic::normalize_action_key;
use std::fmt;

pub const ACTION_ID_VERSION: &str = "action_id_v0";

#[derive(Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct ActionId(String);

impl ActionId {
    pub fn from_normalized_key(key: impl AsRef<str>) -> Self {
        Self(normalize_action_key(key.as_ref()))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Debug for ActionId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.debug_tuple("ActionId").field(&self.0).finish()
    }
}
