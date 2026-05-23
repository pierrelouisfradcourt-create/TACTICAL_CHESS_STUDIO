use crate::core::observation_view::{ActionMaskAuthority, DatasetAdmissibility, ObservationView};

pub const OBSERVATION_ENCODER_VERSION: &str = "observation_encoder_v0_passive";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ObservationEncoderRuntimeAuthority {
    PassiveOnly,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ObservationInputProvenance {
    pub source_id: Option<String>,
    pub source_kind: Option<String>,
    pub provenance_note: Option<String>,
}

impl ObservationInputProvenance {
    pub fn new(
        source_id: Option<String>,
        source_kind: Option<String>,
        provenance_note: Option<String>,
    ) -> Self {
        Self {
            source_id,
            source_kind,
            provenance_note,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EncodedObservation {
    pub observation: ObservationView,
    pub input_provenance: ObservationInputProvenance,
    pub dataset_admissibility: DatasetAdmissibility,
    pub action_mask_authority: ActionMaskAuthority,
    pub runtime_authority: ObservationEncoderRuntimeAuthority,
    pub version: &'static str,
}

impl EncodedObservation {
    pub fn passive(
        observation: ObservationView,
        input_provenance: ObservationInputProvenance,
    ) -> Self {
        Self {
            observation,
            input_provenance,
            dataset_admissibility: DatasetAdmissibility::RequiresHumanGate,
            action_mask_authority: ActionMaskAuthority::NotAuthoritative,
            runtime_authority: ObservationEncoderRuntimeAuthority::PassiveOnly,
            version: OBSERVATION_ENCODER_VERSION,
        }
    }

    pub fn requires_human_gate(&self) -> bool {
        self.dataset_admissibility == DatasetAdmissibility::RequiresHumanGate
    }

    pub fn blocks_action_mask_authority(&self) -> bool {
        self.action_mask_authority == ActionMaskAuthority::NotAuthoritative
    }

    pub fn has_runtime_authority(&self) -> bool {
        false
    }
}

pub trait ObservationEncoder<Input> {
    fn encode(&self, input: &Input) -> EncodedObservation;

    fn runtime_authority(&self) -> ObservationEncoderRuntimeAuthority {
        ObservationEncoderRuntimeAuthority::PassiveOnly
    }

    fn dataset_admissibility(&self) -> DatasetAdmissibility {
        DatasetAdmissibility::RequiresHumanGate
    }

    fn action_mask_authority(&self) -> ActionMaskAuthority {
        ActionMaskAuthority::NotAuthoritative
    }

    fn can_drive_runtime(&self) -> bool {
        false
    }

    fn requires_human_gate(&self) -> bool {
        true
    }
}
