use tactical_chess_pure_lab::core::{
    ActionId, DatasetAdmissionBlockReason, DatasetAdmissionCandidate, DatasetAdmissionSourceKind,
    DatasetAdmissionStatus, DatasetLabelTruthStatus, DATASET_ADMISSION_CANDIDATE_VERSION,
};

fn candidate(source_kind: DatasetAdmissionSourceKind) -> DatasetAdmissionCandidate {
    DatasetAdmissionCandidate::new(
        "candidate-001",
        "observation-001",
        ActionId::from_normalized_key("e2e4"),
        source_kind,
        Some("passive provenance fixture".to_string()),
    )
}

#[test]
fn candidate_defaults_to_dataset_admissible_false() {
    let candidate = candidate(DatasetAdmissionSourceKind::Unknown);

    assert_eq!(
        candidate.status,
        DatasetAdmissionStatus::BlockedRequiresHumanGate
    );
    assert!(!candidate.dataset_admissible);
    assert!(!candidate.grants_dataset_admissibility());
    assert_eq!(candidate.version, DATASET_ADMISSION_CANDIDATE_VERSION);
}

#[test]
fn candidate_requires_human_gate() {
    let candidate = candidate(DatasetAdmissionSourceKind::Unknown);

    assert!(candidate.humangate_required);
    assert!(candidate.requires_human_gate());
    assert!(candidate
        .block_reasons
        .contains(&DatasetAdmissionBlockReason::RequiresHumanGate));
}

#[test]
fn selected_move_source_is_observation_only_not_label_truth() {
    let candidate = candidate(DatasetAdmissionSourceKind::SelectedMove);

    assert_eq!(
        candidate.source_kind,
        DatasetAdmissionSourceKind::SelectedMove
    );
    assert_eq!(
        candidate.label_truth_status,
        DatasetLabelTruthStatus::NotEstablished
    );
    assert!(!candidate.establishes_label_truth());
    assert!(candidate
        .block_reasons
        .contains(&DatasetAdmissionBlockReason::SelectedMoveIsObservationOnly));
}

#[test]
fn search_best_move_source_is_not_automatic_dataset_truth() {
    let candidate = candidate(DatasetAdmissionSourceKind::SearchBestMove);

    assert_eq!(
        candidate.label_truth_status,
        DatasetLabelTruthStatus::NotEstablished
    );
    assert!(!candidate.establishes_label_truth());
    assert!(!candidate.dataset_admissible);
    assert!(candidate
        .block_reasons
        .contains(&DatasetAdmissionBlockReason::SearchBestMoveIsNotLabelTruth));
}

#[test]
fn neural_predicted_move_source_is_not_authority() {
    let candidate = candidate(DatasetAdmissionSourceKind::NeuralPredictedMove);

    assert!(!candidate.establishes_label_truth());
    assert!(!candidate.grants_dataset_admissibility());
    assert!(candidate
        .block_reasons
        .contains(&DatasetAdmissionBlockReason::NeuralPredictionIsNotAuthority));
}

#[test]
fn missing_provenance_blocks_admission() {
    let candidate = DatasetAdmissionCandidate::new(
        "candidate-missing-provenance",
        "observation-001",
        ActionId::from_normalized_key("g1f3"),
        DatasetAdmissionSourceKind::SelectedMove,
        None,
    );

    assert_eq!(candidate.provenance_note, None);
    assert!(!candidate.dataset_admissible);
    assert!(candidate
        .block_reasons
        .contains(&DatasetAdmissionBlockReason::MissingProvenance));
}

#[test]
fn blank_provenance_is_missing_and_blocks_admission() {
    let candidate = DatasetAdmissionCandidate::new(
        "candidate-blank-provenance",
        "observation-001",
        ActionId::from_normalized_key("g1f3"),
        DatasetAdmissionSourceKind::SelectedMove,
        Some(" \t ".to_string()),
    );

    assert_eq!(candidate.provenance_note, None);
    assert!(candidate
        .block_reasons
        .contains(&DatasetAdmissionBlockReason::MissingProvenance));
}

#[test]
fn action_mask_projection_does_not_grant_admission() {
    let candidate = candidate(DatasetAdmissionSourceKind::ActionMaskProjection);

    assert!(!candidate.dataset_admissible);
    assert!(!candidate.grants_dataset_admissibility());
    assert!(candidate
        .block_reasons
        .contains(&DatasetAdmissionBlockReason::ActionMaskProjectionIsNotDatasetAuthority));
}

#[test]
fn no_training_benchmark_or_model_promotion_flags_are_implied() {
    let candidate = candidate(DatasetAdmissionSourceKind::SearchBestMove);

    assert!(!candidate.training_ready);
    assert!(!candidate.benchmark_proven);
    assert!(!candidate.model_promotion_ready);
    assert!(!candidate.implies_training_readiness());
    assert!(!candidate.implies_benchmark_proof());
    assert!(!candidate.implies_model_promotion());
    assert!(candidate
        .block_reasons
        .contains(&DatasetAdmissionBlockReason::NoTrainingReadiness));
    assert!(candidate
        .block_reasons
        .contains(&DatasetAdmissionBlockReason::NoBenchmarkProof));
    assert!(candidate
        .block_reasons
        .contains(&DatasetAdmissionBlockReason::NoModelPromotion));
}
