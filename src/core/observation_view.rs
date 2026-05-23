use crate::core::action_id::ActionId;

pub const OBSERVATION_VIEW_VERSION: &str = "observation_view_v0_passive";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DatasetAdmissibility {
    RequiresHumanGate,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ActionMaskAuthority {
    NotAuthoritative,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ObservationView {
    pub observation_id: String,
    pub source_id: Option<String>,
    pub player_identity: Option<String>,
    pub state_key: String,
    pub legal_action_ids: Vec<ActionId>,
    pub legal_action_count: usize,
    pub ruleset: Option<String>,
    pub provenance_note: Option<String>,
    pub dataset_admissibility: DatasetAdmissibility,
    pub action_mask_authority: ActionMaskAuthority,
    pub version: &'static str,
}

impl ObservationView {
    pub fn new(
        observation_id: impl Into<String>,
        source_id: Option<String>,
        player_identity: Option<String>,
        state_key: impl Into<String>,
        legal_action_ids: Vec<ActionId>,
        ruleset: Option<String>,
        provenance_note: Option<String>,
    ) -> Self {
        let legal_action_count = legal_action_ids.len();

        Self {
            observation_id: observation_id.into(),
            source_id,
            player_identity,
            state_key: state_key.into(),
            legal_action_ids,
            legal_action_count,
            ruleset,
            provenance_note,
            dataset_admissibility: DatasetAdmissibility::RequiresHumanGate,
            action_mask_authority: ActionMaskAuthority::NotAuthoritative,
            version: OBSERVATION_VIEW_VERSION,
        }
    }

    pub fn blocks_dataset_use(&self) -> bool {
        self.dataset_admissibility == DatasetAdmissibility::RequiresHumanGate
    }

    pub fn blocks_action_mask_authority(&self) -> bool {
        self.action_mask_authority == ActionMaskAuthority::NotAuthoritative
    }
}
