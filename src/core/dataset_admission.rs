use crate::core::action_id::ActionId;

pub const DATASET_ADMISSION_CANDIDATE_VERSION: &str = "dataset_admission_candidate_v0_passive";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DatasetAdmissionStatus {
    BlockedRequiresHumanGate,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DatasetAdmissionSourceKind {
    SelectedMove,
    SearchBestMove,
    NeuralPredictedMove,
    ActionMaskProjection,
    Unknown,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DatasetAdmissionBlockReason {
    RequiresHumanGate,
    MissingProvenance,
    SelectedMoveIsObservationOnly,
    SearchBestMoveIsNotLabelTruth,
    NeuralPredictionIsNotAuthority,
    ActionMaskProjectionIsNotDatasetAuthority,
    NoTrainingReadiness,
    NoBenchmarkProof,
    NoModelPromotion,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DatasetLabelTruthStatus {
    NotEstablished,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DatasetAdmissionCandidate {
    pub candidate_id: String,
    pub observation_id: String,
    pub action_id: ActionId,
    pub source_kind: DatasetAdmissionSourceKind,
    pub provenance_note: Option<String>,
    pub status: DatasetAdmissionStatus,
    pub humangate_required: bool,
    pub dataset_admissible: bool,
    pub label_truth_status: DatasetLabelTruthStatus,
    pub block_reasons: Vec<DatasetAdmissionBlockReason>,
    pub training_ready: bool,
    pub benchmark_proven: bool,
    pub model_promotion_ready: bool,
    pub version: &'static str,
}

impl DatasetAdmissionCandidate {
    pub fn new(
        candidate_id: impl Into<String>,
        observation_id: impl Into<String>,
        action_id: ActionId,
        source_kind: DatasetAdmissionSourceKind,
        provenance_note: Option<String>,
    ) -> Self {
        let provenance_note =
            provenance_note.and_then(|note| (!note.trim().is_empty()).then_some(note));
        let mut block_reasons = vec![DatasetAdmissionBlockReason::RequiresHumanGate];

        if provenance_note.is_none() {
            block_reasons.push(DatasetAdmissionBlockReason::MissingProvenance);
        }

        match source_kind {
            DatasetAdmissionSourceKind::SelectedMove => {
                block_reasons.push(DatasetAdmissionBlockReason::SelectedMoveIsObservationOnly);
            }
            DatasetAdmissionSourceKind::SearchBestMove => {
                block_reasons.push(DatasetAdmissionBlockReason::SearchBestMoveIsNotLabelTruth);
            }
            DatasetAdmissionSourceKind::NeuralPredictedMove => {
                block_reasons.push(DatasetAdmissionBlockReason::NeuralPredictionIsNotAuthority);
            }
            DatasetAdmissionSourceKind::ActionMaskProjection => {
                block_reasons
                    .push(DatasetAdmissionBlockReason::ActionMaskProjectionIsNotDatasetAuthority);
            }
            DatasetAdmissionSourceKind::Unknown => {}
        }

        block_reasons.extend([
            DatasetAdmissionBlockReason::NoTrainingReadiness,
            DatasetAdmissionBlockReason::NoBenchmarkProof,
            DatasetAdmissionBlockReason::NoModelPromotion,
        ]);

        Self {
            candidate_id: candidate_id.into(),
            observation_id: observation_id.into(),
            action_id,
            source_kind,
            provenance_note,
            status: DatasetAdmissionStatus::BlockedRequiresHumanGate,
            humangate_required: true,
            dataset_admissible: false,
            label_truth_status: DatasetLabelTruthStatus::NotEstablished,
            block_reasons,
            training_ready: false,
            benchmark_proven: false,
            model_promotion_ready: false,
            version: DATASET_ADMISSION_CANDIDATE_VERSION,
        }
    }

    pub fn requires_human_gate(&self) -> bool {
        self.humangate_required
    }

    pub fn grants_dataset_admissibility(&self) -> bool {
        false
    }

    pub fn establishes_label_truth(&self) -> bool {
        false
    }

    pub fn implies_training_readiness(&self) -> bool {
        false
    }

    pub fn implies_benchmark_proof(&self) -> bool {
        false
    }

    pub fn implies_model_promotion(&self) -> bool {
        false
    }
}
