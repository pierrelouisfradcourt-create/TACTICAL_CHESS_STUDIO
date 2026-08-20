use tactical_chess_pure_lab::ai::{
    NeuralProposal, PolicyGuideActionMaskAuthority, PolicyGuideAuthority, PolicyGuideCandidate,
    PolicyGuideDatasetPosture, PolicyGuideLabelTruth, PolicyGuideSource, PolicyValueHint,
};
use tactical_chess_pure_lab::core::{
    ActionId, ActionMaskAuthority, ActionSubmission, DatasetAdmissibility,
    DatasetAdmissionBlockReason, DatasetAdmissionCandidate, DatasetAdmissionSourceKind,
    DatasetLabelTruthStatus, EpisodeStepRecord, EpisodeStepSourceKind, EpisodeTraceCandidate,
    LegalAction, ObservationView, ReplayBlockReason, StepResult, StepResultStatus,
};

fn legal_action(key: &str) -> LegalAction {
    LegalAction::from_action_key(key)
}

fn action_ids(legal_actions: &[LegalAction]) -> Vec<ActionId> {
    legal_actions
        .iter()
        .map(|action| action.action_id.clone())
        .collect()
}

#[test]
fn passive_mini_episode_composes_without_runtime_authority() {
    let legal_actions = vec![legal_action("e2e4"), legal_action("g1f3")];
    let legal_action_ids = action_ids(&legal_actions);

    let observation = ObservationView::new(
        "observation-passive-alpha-000",
        Some("passive-mini-episode-fixture".to_string()),
        Some("player:white".to_string()),
        "state-key:passive-alpha-mini",
        legal_action_ids.clone(),
        Some("classical".to_string()),
        Some("in-memory passive observation fixture".to_string()),
    );

    assert_eq!(observation.legal_action_ids, legal_action_ids);
    assert_eq!(observation.legal_action_count, 2);
    assert_eq!(
        observation.dataset_admissibility,
        DatasetAdmissibility::RequiresHumanGate
    );
    assert_eq!(
        observation.action_mask_authority,
        ActionMaskAuthority::NotAuthoritative
    );
    assert!(observation.blocks_dataset_use());
    assert!(observation.blocks_action_mask_authority());

    let chosen_action = legal_actions[0].clone();
    let neural_candidate = PolicyGuideCandidate::from_legal_action(
        chosen_action.clone(),
        Some(96),
        Some(42),
        Some(1),
        PolicyGuideSource::NeuralProposal,
        Some("passive neural prior fixture".to_string()),
    );
    let proposal = NeuralProposal::passive(
        observation.state_key.clone(),
        observation.legal_action_ids.clone(),
        vec![neural_candidate],
        PolicyValueHint {
            value_score: Some(11),
            confidence: Some(64),
        },
        Some("passive policy guide fixture".to_string()),
    );

    assert_eq!(proposal.state_key, observation.state_key);
    assert_eq!(proposal.legal_action_ids, observation.legal_action_ids);
    assert_eq!(
        proposal.suggestion.authority,
        PolicyGuideAuthority::ProposalOnlyRequiresSearchAuthority
    );
    assert_eq!(
        proposal.suggestion.dataset_posture,
        PolicyGuideDatasetPosture::NotDatasetAdmissible
    );
    assert_eq!(
        proposal.suggestion.label_truth,
        PolicyGuideLabelTruth::NotEstablished
    );
    assert_eq!(
        proposal.suggestion.action_mask_authority,
        PolicyGuideActionMaskAuthority::NotAuthoritative
    );
    assert!(!proposal.is_final_authority());
    assert!(!proposal.can_drive_runtime());
    assert!(!proposal.grants_dataset_admissibility());
    assert!(proposal.requires_search_authority());
    assert!(!proposal.establishes_label_truth());
    assert!(!proposal.implies_training_readiness());
    assert!(!proposal.grants_action_mask_authority());
    assert_eq!(proposal.candidates()[0].action_id, chosen_action.action_id);
    assert_eq!(
        proposal.candidates()[0].legal_action.as_ref(),
        Some(&chosen_action)
    );

    let submission = ActionSubmission::new(
        chosen_action.action_id.clone(),
        observation.player_identity.clone(),
        Some("passive action submission fixture".to_string()),
    );
    let step_result = StepResult::passive(
        submission.clone(),
        StepResultStatus::Unknown,
        Some("passive step result fixture".to_string()),
        Some(observation.clone()),
    );

    assert_eq!(submission.action_id, chosen_action.action_id);
    assert_eq!(step_result.submission.action_id, chosen_action.action_id);
    assert!(!submission.can_drive_runtime());
    assert!(!step_result.can_drive_runtime());
    assert!(!submission.implies_legality_authority());
    assert!(!step_result.implies_legality_authority());
    assert_eq!(
        submission.action_mask_authority,
        ActionMaskAuthority::NotAuthoritative
    );
    assert_eq!(
        step_result.action_mask_authority,
        ActionMaskAuthority::NotAuthoritative
    );
    assert!(!submission.grants_action_mask_authority());
    assert!(!step_result.grants_action_mask_authority());

    let dataset_candidate = DatasetAdmissionCandidate::new(
        "dataset-candidate-passive-alpha-000",
        observation.observation_id.clone(),
        chosen_action.action_id.clone(),
        DatasetAdmissionSourceKind::NeuralPredictedMove,
        Some("proposal provenance is not label truth".to_string()),
    );

    assert!(!dataset_candidate.dataset_admissible);
    assert!(dataset_candidate.requires_human_gate());
    assert_eq!(
        dataset_candidate.label_truth_status,
        DatasetLabelTruthStatus::NotEstablished
    );
    assert!(!dataset_candidate.establishes_label_truth());
    assert!(!dataset_candidate.training_ready);
    assert!(!dataset_candidate.benchmark_proven);
    assert!(!dataset_candidate.model_promotion_ready);
    assert!(!dataset_candidate.implies_training_readiness());
    assert!(!dataset_candidate.implies_benchmark_proof());
    assert!(!dataset_candidate.implies_model_promotion());
    assert!(dataset_candidate
        .block_reasons
        .contains(&DatasetAdmissionBlockReason::RequiresHumanGate));
    assert!(dataset_candidate
        .block_reasons
        .contains(&DatasetAdmissionBlockReason::NeuralPredictionIsNotAuthority));

    let step = EpisodeStepRecord::passive(
        0,
        Some(observation.observation_id.clone()),
        Some(chosen_action.action_id.clone()),
        EpisodeStepSourceKind::NeuralPredictedMoveObservation,
        Some("passive mini episode step fixture".to_string()),
    )
    .with_observation(observation)
    .with_action_submission(submission)
    .with_step_result(step_result)
    .with_dataset_admission_candidate(dataset_candidate);
    let episode = EpisodeTraceCandidate::new(
        "episode-passive-alpha-000",
        Some("passive-mini-episode-fixture".to_string()),
        Some("in-memory passive episode fixture".to_string()),
        vec![step],
    );

    let observed_step_indices = episode
        .steps
        .iter()
        .map(|step| step.step_index)
        .collect::<Vec<_>>();
    assert_eq!(observed_step_indices, vec![0]);
    assert!(!episode.replay_admissible);
    assert!(!episode.dataset_admissible);
    assert!(episode.humangate_required);
    assert!(episode.requires_human_gate());
    assert!(!episode.runtime_authority);
    assert!(!episode.can_drive_runtime());
    assert!(!episode.writes_runtime_outputs());
    assert!(!episode.grants_replay_admission());
    assert!(!episode.grants_dataset_admissibility());
    assert!(!episode.establishes_label_truth());
    assert!(!episode.implies_training_readiness());
    assert!(!episode.implies_benchmark_proof());
    assert!(!episode.implies_model_promotion());
    assert!(episode
        .block_reasons
        .contains(&ReplayBlockReason::RequiresHumanGate));
    assert!(episode
        .block_reasons
        .contains(&ReplayBlockReason::NeuralPredictionIsObservationOnly));
    assert!(episode
        .block_reasons
        .contains(&ReplayBlockReason::NoRuntimeAuthority));

    let recorded_step = &episode.steps[0];
    assert_eq!(
        recorded_step.observation_id.as_deref(),
        Some("observation-passive-alpha-000")
    );
    assert_eq!(
        recorded_step.action_id.as_ref(),
        Some(&chosen_action.action_id)
    );
    assert!(recorded_step.observation.is_some());
    assert!(recorded_step.action_submission.is_some());
    assert!(recorded_step.step_result.is_some());
    assert!(recorded_step.dataset_admission_candidate.is_some());
    assert!(!recorded_step.establishes_label_truth());
    assert!(!recorded_step.has_runtime_authority());
}
