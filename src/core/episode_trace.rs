use crate::core::action_id::ActionId;
use crate::core::action_submission::{ActionSubmission, StepResult};
use crate::core::dataset_admission::DatasetAdmissionCandidate;
use crate::core::observation_view::ObservationView;

pub const EPISODE_TRACE_CANDIDATE_VERSION: &str = "episode_trace_candidate_v0_passive";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ReplayAdmissionStatus {
    BlockedRequiresHumanGate,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ReplayBlockReason {
    RequiresHumanGate,
    MissingProvenance,
    SelectedMoveIsObservationOnly,
    SearchBestMoveIsObservationOnly,
    NeuralPredictionIsObservationOnly,
    StepLabelTruthNotEstablished,
    NoReplayOutputAuthority,
    NoRuntimeAuthority,
    NoTrainingReadiness,
    NoBenchmarkProof,
    NoModelPromotion,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EpisodeStepSourceKind {
    SelectedMoveObservation,
    SearchBestMoveObservation,
    NeuralPredictedMoveObservation,
    PassiveContractReference,
    Unknown,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EpisodeStepRecord {
    pub step_index: usize,
    pub observation_id: Option<String>,
    pub action_id: Option<ActionId>,
    pub source_kind: EpisodeStepSourceKind,
    pub provenance_note: Option<String>,
    pub observation: Option<ObservationView>,
    pub action_submission: Option<ActionSubmission>,
    pub step_result: Option<StepResult>,
    pub dataset_admission_candidate: Option<DatasetAdmissionCandidate>,
    pub label_truth_established: bool,
    pub runtime_authority: bool,
}

impl EpisodeStepRecord {
    pub fn passive(
        step_index: usize,
        observation_id: Option<String>,
        action_id: Option<ActionId>,
        source_kind: EpisodeStepSourceKind,
        provenance_note: Option<String>,
    ) -> Self {
        Self {
            step_index,
            observation_id,
            action_id,
            source_kind,
            provenance_note: normalize_note(provenance_note),
            observation: None,
            action_submission: None,
            step_result: None,
            dataset_admission_candidate: None,
            label_truth_established: false,
            runtime_authority: false,
        }
    }

    pub fn with_observation(mut self, observation: ObservationView) -> Self {
        self.observation = Some(observation);
        self
    }

    pub fn with_action_submission(mut self, action_submission: ActionSubmission) -> Self {
        self.action_submission = Some(action_submission);
        self
    }

    pub fn with_step_result(mut self, step_result: StepResult) -> Self {
        self.step_result = Some(step_result);
        self
    }

    pub fn with_dataset_admission_candidate(
        mut self,
        dataset_admission_candidate: DatasetAdmissionCandidate,
    ) -> Self {
        self.dataset_admission_candidate = Some(dataset_admission_candidate);
        self
    }

    pub fn establishes_label_truth(&self) -> bool {
        false
    }

    pub fn has_runtime_authority(&self) -> bool {
        false
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EpisodeTraceCandidate {
    pub episode_id: String,
    pub source_id: Option<String>,
    pub provenance_note: Option<String>,
    pub steps: Vec<EpisodeStepRecord>,
    pub status: ReplayAdmissionStatus,
    pub humangate_required: bool,
    pub replay_admissible: bool,
    pub dataset_admissible: bool,
    pub label_truth_established: bool,
    pub runtime_authority: bool,
    pub creates_runtime_outputs: bool,
    pub training_ready: bool,
    pub benchmark_proven: bool,
    pub model_promotion_ready: bool,
    pub block_reasons: Vec<ReplayBlockReason>,
    pub version: &'static str,
}

impl EpisodeTraceCandidate {
    pub fn new(
        episode_id: impl Into<String>,
        source_id: Option<String>,
        provenance_note: Option<String>,
        steps: Vec<EpisodeStepRecord>,
    ) -> Self {
        let provenance_note = normalize_note(provenance_note);
        let mut block_reasons = vec![ReplayBlockReason::RequiresHumanGate];

        if provenance_note.is_none() || steps.iter().any(|step| step.provenance_note.is_none()) {
            block_reasons.push(ReplayBlockReason::MissingProvenance);
        }

        if steps
            .iter()
            .any(|step| step.source_kind == EpisodeStepSourceKind::SelectedMoveObservation)
        {
            block_reasons.push(ReplayBlockReason::SelectedMoveIsObservationOnly);
        }

        if steps
            .iter()
            .any(|step| step.source_kind == EpisodeStepSourceKind::SearchBestMoveObservation)
        {
            block_reasons.push(ReplayBlockReason::SearchBestMoveIsObservationOnly);
        }

        if steps
            .iter()
            .any(|step| step.source_kind == EpisodeStepSourceKind::NeuralPredictedMoveObservation)
        {
            block_reasons.push(ReplayBlockReason::NeuralPredictionIsObservationOnly);
        }

        block_reasons.extend([
            ReplayBlockReason::StepLabelTruthNotEstablished,
            ReplayBlockReason::NoReplayOutputAuthority,
            ReplayBlockReason::NoRuntimeAuthority,
            ReplayBlockReason::NoTrainingReadiness,
            ReplayBlockReason::NoBenchmarkProof,
            ReplayBlockReason::NoModelPromotion,
        ]);

        Self {
            episode_id: episode_id.into(),
            source_id,
            provenance_note,
            steps,
            status: ReplayAdmissionStatus::BlockedRequiresHumanGate,
            humangate_required: true,
            replay_admissible: false,
            dataset_admissible: false,
            label_truth_established: false,
            runtime_authority: false,
            creates_runtime_outputs: false,
            training_ready: false,
            benchmark_proven: false,
            model_promotion_ready: false,
            block_reasons,
            version: EPISODE_TRACE_CANDIDATE_VERSION,
        }
    }

    pub fn requires_human_gate(&self) -> bool {
        self.humangate_required
    }

    pub fn grants_replay_admission(&self) -> bool {
        false
    }

    pub fn grants_dataset_admissibility(&self) -> bool {
        false
    }

    pub fn establishes_label_truth(&self) -> bool {
        false
    }

    pub fn can_drive_runtime(&self) -> bool {
        false
    }

    pub fn writes_runtime_outputs(&self) -> bool {
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

fn normalize_note(note: Option<String>) -> Option<String> {
    note.and_then(|value| (!value.trim().is_empty()).then_some(value))
}
