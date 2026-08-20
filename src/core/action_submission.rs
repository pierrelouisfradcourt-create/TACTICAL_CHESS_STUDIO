use crate::core::action_id::ActionId;
use crate::core::observation_view::{ActionMaskAuthority, DatasetAdmissibility, ObservationView};

pub const ACTION_SUBMISSION_VERSION: &str = "action_submission_v0_passive";
pub const STEP_RESULT_VERSION: &str = "step_result_v0_passive";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ActionSubmissionStatus {
    Accepted,
    Rejected,
    Blocked,
    Unknown,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ActionSubmission {
    pub action_id: ActionId,
    pub actor_identity: Option<String>,
    pub provenance_note: Option<String>,
    pub status: ActionSubmissionStatus,
    pub dataset_admissibility: DatasetAdmissibility,
    pub action_mask_authority: ActionMaskAuthority,
    pub version: &'static str,
}

impl ActionSubmission {
    pub fn new(
        action_id: ActionId,
        actor_identity: Option<String>,
        provenance_note: Option<String>,
    ) -> Self {
        Self {
            action_id,
            actor_identity,
            provenance_note,
            status: ActionSubmissionStatus::Unknown,
            dataset_admissibility: DatasetAdmissibility::RequiresHumanGate,
            action_mask_authority: ActionMaskAuthority::NotAuthoritative,
            version: ACTION_SUBMISSION_VERSION,
        }
    }

    pub fn with_status(mut self, status: ActionSubmissionStatus) -> Self {
        self.status = status;
        self
    }

    pub fn can_drive_runtime(&self) -> bool {
        false
    }

    pub fn implies_legality_authority(&self) -> bool {
        false
    }

    pub fn grants_dataset_admissibility(&self) -> bool {
        false
    }

    pub fn grants_action_mask_authority(&self) -> bool {
        false
    }

    pub fn implies_training_readiness(&self) -> bool {
        false
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum StepResultStatus {
    Accepted,
    Rejected,
    Blocked,
    Unknown,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StepResult {
    pub submission: ActionSubmission,
    pub status: StepResultStatus,
    pub provenance_note: Option<String>,
    pub observation_after_step: Option<ObservationView>,
    pub dataset_admissibility: DatasetAdmissibility,
    pub action_mask_authority: ActionMaskAuthority,
    pub version: &'static str,
}

impl StepResult {
    pub fn passive(
        submission: ActionSubmission,
        status: StepResultStatus,
        provenance_note: Option<String>,
        observation_after_step: Option<ObservationView>,
    ) -> Self {
        Self {
            submission,
            status,
            provenance_note,
            observation_after_step,
            dataset_admissibility: DatasetAdmissibility::RequiresHumanGate,
            action_mask_authority: ActionMaskAuthority::NotAuthoritative,
            version: STEP_RESULT_VERSION,
        }
    }

    pub fn can_drive_runtime(&self) -> bool {
        false
    }

    pub fn implies_legality_authority(&self) -> bool {
        false
    }

    pub fn grants_dataset_admissibility(&self) -> bool {
        false
    }

    pub fn grants_action_mask_authority(&self) -> bool {
        false
    }

    pub fn implies_training_readiness(&self) -> bool {
        false
    }
}
