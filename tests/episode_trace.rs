use tactical_chess_pure_lab::core::{
    ActionId, ActionSubmission, DatasetAdmissionCandidate, DatasetAdmissionSourceKind,
    EpisodeStepRecord, EpisodeStepSourceKind, EpisodeTraceCandidate, ObservationView,
    ReplayAdmissionStatus, ReplayBlockReason, StepResult, StepResultStatus,
    EPISODE_TRACE_CANDIDATE_VERSION,
};

fn action_id(key: &str) -> ActionId {
    ActionId::from_normalized_key(key)
}

fn step(index: usize, source_kind: EpisodeStepSourceKind) -> EpisodeStepRecord {
    EpisodeStepRecord::passive(
        index,
        Some(format!("observation-{index:03}")),
        Some(action_id("e2e4")),
        source_kind,
        Some(format!("passive step provenance {index}")),
    )
}

fn episode(steps: Vec<EpisodeStepRecord>) -> EpisodeTraceCandidate {
    EpisodeTraceCandidate::new(
        "episode-001",
        Some("fixture:episode".to_string()),
        Some("passive episode provenance".to_string()),
        steps,
    )
}

#[test]
fn episode_trace_candidate_constructs_deterministically() {
    let left = episode(vec![step(
        0,
        EpisodeStepSourceKind::PassiveContractReference,
    )]);
    let right = episode(vec![step(
        0,
        EpisodeStepSourceKind::PassiveContractReference,
    )]);

    assert_eq!(left, right);
    assert_eq!(left.episode_id, "episode-001");
    assert_eq!(left.source_id.as_deref(), Some("fixture:episode"));
    assert_eq!(left.version, EPISODE_TRACE_CANDIDATE_VERSION);
}

#[test]
fn step_ordering_is_preserved() {
    let episode = episode(vec![
        step(2, EpisodeStepSourceKind::SelectedMoveObservation),
        step(0, EpisodeStepSourceKind::SearchBestMoveObservation),
        step(1, EpisodeStepSourceKind::NeuralPredictedMoveObservation),
    ]);

    let observed: Vec<usize> = episode.steps.iter().map(|step| step.step_index).collect();
    assert_eq!(observed, vec![2, 0, 1]);
}

#[test]
fn missing_episode_provenance_blocks_admission() {
    let episode = EpisodeTraceCandidate::new(
        "episode-missing-provenance",
        None,
        None,
        vec![step(0, EpisodeStepSourceKind::PassiveContractReference)],
    );

    assert_eq!(episode.provenance_note, None);
    assert!(!episode.replay_admissible);
    assert!(episode
        .block_reasons
        .contains(&ReplayBlockReason::MissingProvenance));
}

#[test]
fn missing_step_provenance_blocks_admission() {
    let episode = episode(vec![EpisodeStepRecord::passive(
        0,
        Some("observation-000".to_string()),
        Some(action_id("g1f3")),
        EpisodeStepSourceKind::SelectedMoveObservation,
        Some(" \t ".to_string()),
    )]);

    assert_eq!(episode.steps[0].provenance_note, None);
    assert!(episode
        .block_reasons
        .contains(&ReplayBlockReason::MissingProvenance));
}

#[test]
fn dataset_and_replay_admission_default_blocked() {
    let episode = episode(vec![step(0, EpisodeStepSourceKind::Unknown)]);

    assert_eq!(
        episode.status,
        ReplayAdmissionStatus::BlockedRequiresHumanGate
    );
    assert!(episode.humangate_required);
    assert!(episode.requires_human_gate());
    assert!(!episode.replay_admissible);
    assert!(!episode.dataset_admissible);
    assert!(!episode.grants_replay_admission());
    assert!(!episode.grants_dataset_admissibility());
}

#[test]
fn step_records_do_not_imply_label_truth() {
    let episode = episode(vec![
        step(0, EpisodeStepSourceKind::SelectedMoveObservation),
        step(1, EpisodeStepSourceKind::SearchBestMoveObservation),
        step(2, EpisodeStepSourceKind::NeuralPredictedMoveObservation),
    ]);

    assert!(!episode.label_truth_established);
    assert!(!episode.establishes_label_truth());
    assert!(episode
        .steps
        .iter()
        .all(|step| !step.label_truth_established));
    assert!(episode
        .steps
        .iter()
        .all(|step| !step.establishes_label_truth()));
    assert!(episode
        .block_reasons
        .contains(&ReplayBlockReason::SelectedMoveIsObservationOnly));
    assert!(episode
        .block_reasons
        .contains(&ReplayBlockReason::SearchBestMoveIsObservationOnly));
    assert!(episode
        .block_reasons
        .contains(&ReplayBlockReason::NeuralPredictionIsObservationOnly));
}

#[test]
fn candidate_does_not_create_runtime_or_lab_outputs() {
    let episode = episode(vec![step(0, EpisodeStepSourceKind::Unknown)]);

    assert!(!episode.runtime_authority);
    assert!(!episode.creates_runtime_outputs);
    assert!(!episode.can_drive_runtime());
    assert!(!episode.writes_runtime_outputs());
    assert!(episode
        .block_reasons
        .contains(&ReplayBlockReason::NoRuntimeAuthority));
    assert!(episode
        .block_reasons
        .contains(&ReplayBlockReason::NoReplayOutputAuthority));
}

#[test]
fn candidate_does_not_imply_training_benchmark_or_model_promotion() {
    let episode = episode(vec![step(0, EpisodeStepSourceKind::Unknown)]);

    assert!(!episode.training_ready);
    assert!(!episode.benchmark_proven);
    assert!(!episode.model_promotion_ready);
    assert!(!episode.implies_training_readiness());
    assert!(!episode.implies_benchmark_proof());
    assert!(!episode.implies_model_promotion());
    assert!(episode
        .block_reasons
        .contains(&ReplayBlockReason::NoTrainingReadiness));
    assert!(episode
        .block_reasons
        .contains(&ReplayBlockReason::NoBenchmarkProof));
    assert!(episode
        .block_reasons
        .contains(&ReplayBlockReason::NoModelPromotion));
}

#[test]
fn candidate_can_reference_existing_passive_contracts_without_activating_them() {
    let observation = ObservationView::new(
        "observation-000",
        Some("fixture:observation".to_string()),
        Some("player:white".to_string()),
        "state-key:passive",
        vec![action_id("e2e4")],
        Some("classical".to_string()),
        Some("passive observation provenance".to_string()),
    );
    let submission = ActionSubmission::new(
        action_id("e2e4"),
        Some("player:white".to_string()),
        Some("passive submission provenance".to_string()),
    );
    let step_result = StepResult::passive(
        submission.clone(),
        StepResultStatus::Unknown,
        Some("passive step result provenance".to_string()),
        Some(observation.clone()),
    );
    let dataset_candidate = DatasetAdmissionCandidate::new(
        "dataset-candidate-000",
        "observation-000",
        action_id("e2e4"),
        DatasetAdmissionSourceKind::SelectedMove,
        Some("passive dataset candidate provenance".to_string()),
    );
    let step = step(0, EpisodeStepSourceKind::PassiveContractReference)
        .with_observation(observation)
        .with_action_submission(submission)
        .with_step_result(step_result)
        .with_dataset_admission_candidate(dataset_candidate);
    let episode = episode(vec![step]);

    let observed_step = &episode.steps[0];
    assert!(observed_step.observation.is_some());
    assert!(observed_step.action_submission.is_some());
    assert!(observed_step.step_result.is_some());
    assert!(observed_step.dataset_admission_candidate.is_some());
    assert!(!observed_step.has_runtime_authority());
    assert!(!episode.can_drive_runtime());
    assert!(!episode.grants_dataset_admissibility());
}
