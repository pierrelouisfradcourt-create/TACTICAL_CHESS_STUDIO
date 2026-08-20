use serde::{Deserialize, Deserializer, Serialize, Serializer};
use tactical_chess_pure_lab::core::ActionId;

fn serialize_action_ids<S>(action_ids: &[ActionId], serializer: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    let action_keys: Vec<&str> = action_ids.iter().map(ActionId::as_str).collect();
    action_keys.serialize(serializer)
}

fn deserialize_action_ids<'de, D>(deserializer: D) -> Result<Vec<ActionId>, D::Error>
where
    D: Deserializer<'de>,
{
    let action_keys = Vec::<String>::deserialize(deserializer)?;
    Ok(action_keys
        .into_iter()
        .map(ActionId::from_normalized_key)
        .collect())
}

fn serialize_optional_action_id<S>(
    action_id: &Option<ActionId>,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match action_id {
        Some(action_id) => serializer.serialize_some(action_id.as_str()),
        None => serializer.serialize_none(),
    }
}

fn deserialize_optional_action_id<'de, D>(deserializer: D) -> Result<Option<ActionId>, D::Error>
where
    D: Deserializer<'de>,
{
    let action_key = Option::<String>::deserialize(deserializer)?;
    Ok(action_key.map(ActionId::from_normalized_key))
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct DecisionTrace {
    pub state_key: String,
    #[serde(
        serialize_with = "serialize_action_ids",
        deserialize_with = "deserialize_action_ids"
    )]
    pub legal_action_ids: Vec<ActionId>,
    #[serde(
        serialize_with = "serialize_optional_action_id",
        deserialize_with = "deserialize_optional_action_id"
    )]
    pub selected_action_id: Option<ActionId>,
    pub decision_mode: String,
    #[serde(default)]
    pub selection_authority: Option<String>,
    pub used_search: bool,
    pub used_neural: bool,
    pub neural_latency_ms: Option<u64>,
    pub search_nodes: Option<u64>,
    pub search_depth: Option<u32>,
    pub fallback_reason: Option<String>,
}

pub fn decision_trace_to_pretty_json(trace: &DecisionTrace) -> Result<String, serde_json::Error> {
    serde_json::to_string_pretty(trace)
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum DecisionTraceValidationError {
    EmptyStateKey,
    EmptyLegalActionIds,
    SelectedActionIdNotLegal { selected_action_id: ActionId },
    SearchSelectionAuthorityRequired {
        selection_authority: Option<String>,
    },
    UnsupportedFinalSelectionAuthority {
        selection_authority: String,
    },
}

impl DecisionTrace {
    pub fn validate_state_key(&self) -> Result<(), DecisionTraceValidationError> {
        if self.state_key.trim().is_empty() {
            return Err(DecisionTraceValidationError::EmptyStateKey);
        }

        Ok(())
    }

    pub fn validate_legal_actions_present(&self) -> Result<(), DecisionTraceValidationError> {
        if self.legal_action_ids.is_empty() {
            return Err(DecisionTraceValidationError::EmptyLegalActionIds);
        }

        Ok(())
    }

    pub fn validate_action_membership(&self) -> Result<(), DecisionTraceValidationError> {
        if let Some(selected_action_id) = &self.selected_action_id {
            if !self.legal_action_ids.contains(selected_action_id) {
                return Err(DecisionTraceValidationError::SelectedActionIdNotLegal {
                    selected_action_id: selected_action_id.clone(),
                });
            }
        }

        Ok(())
    }

    pub fn validate_selection_authority(&self) -> Result<(), DecisionTraceValidationError> {
        let normalized_selection_authority = self
            .selection_authority
            .as_deref()
            .map(|selection_authority| selection_authority.trim().to_ascii_lowercase());

        if let Some(selection_authority) = &normalized_selection_authority {
            if matches!(selection_authority.as_str(), "neural" | "critic" | "llm") {
                return Err(
                    DecisionTraceValidationError::UnsupportedFinalSelectionAuthority {
                        selection_authority: self.selection_authority.clone().unwrap_or_default(),
                    },
                );
            }
        }

        if self.used_search
            && !matches!(normalized_selection_authority.as_deref(), None | Some("search"))
        {
            return Err(DecisionTraceValidationError::SearchSelectionAuthorityRequired {
                selection_authority: self.selection_authority.clone(),
            });
        }

        Ok(())
    }

    pub fn validate_consistency(&self) -> Result<(), DecisionTraceValidationError> {
        self.validate_state_key()?;
        self.validate_legal_actions_present()?;
        self.validate_action_membership()?;
        self.validate_selection_authority()
    }
}
