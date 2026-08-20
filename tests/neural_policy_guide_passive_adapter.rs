use tactical_chess_pure_lab::ai::{
    NeuralProposal, PolicyGuideActionMaskAuthority, PolicyGuideAuthority, PolicyGuideCandidate,
    PolicyGuideDatasetPosture, PolicyGuideLabelTruth, PolicyGuideSource, PolicyValueHint,
};
use tactical_chess_pure_lab::core::{
    ActionId, DatasetAdmissionBlockReason, DatasetAdmissionCandidate, DatasetAdmissionSourceKind,
    DatasetLabelTruthStatus, LegalAction,
};

fn action_id_strings(action_ids: &[ActionId]) -> Vec<String> {
    action_ids
        .iter()
        .map(|action_id| action_id.as_str().to_string())
        .collect()
}

fn candidate_action_ids(proposal: &NeuralProposal) -> Vec<String> {
    proposal
        .candidates()
        .iter()
        .map(|candidate| candidate.action_id.as_str().to_string())
        .collect()
}

fn value_hint() -> PolicyValueHint {
    PolicyValueHint {
        value_score: Some(18),
        confidence: Some(73),
    }
}

#[test]
fn neural_proposal_carries_action_id_and_legal_action_identity() {
    let legal_action = LegalAction::from_action_key(" E2E4 ");
    let candidate = PolicyGuideCandidate::from_legal_action(
        legal_action.clone(),
        Some(100),
        Some(40),
        Some(1),
        PolicyGuideSource::NeuralProposal,
        Some("python-output-not-called fixture".to_string()),
    );
    let proposal = NeuralProposal::passive(
        "fen:identity",
        vec![legal_action.action_id.clone()],
        vec![candidate],
        value_hint(),
        Some("passive adapter fixture".to_string()),
    );

    assert_eq!(proposal.state_key, "fen:identity");
    assert_eq!(action_id_strings(&proposal.legal_action_ids), vec!["e2e4"]);
    assert_eq!(candidate_action_ids(&proposal), vec!["e2e4"]);
    assert_eq!(
        proposal.candidates()[0].legal_action.as_ref(),
        Some(&legal_action)
    );
    assert_eq!(
        proposal.candidates()[0]
            .legal_action
            .as_ref()
            .map(|action| action.action_key.as_str()),
        Some("e2e4")
    );
}

#[test]
fn neural_proposal_candidate_ordering_is_deterministic() {
    let candidates = vec![
        PolicyGuideCandidate::new(
            ActionId::from_normalized_key("g1f3"),
            Some(80),
            Some(50),
            Some(2),
            PolicyGuideSource::NeuralProposal,
            Some("fixture".to_string()),
        ),
        PolicyGuideCandidate::new(
            ActionId::from_normalized_key("e2e4"),
            Some(100),
            Some(5),
            Some(3),
            PolicyGuideSource::NeuralProposal,
            Some("fixture".to_string()),
        ),
        PolicyGuideCandidate::new(
            ActionId::from_normalized_key("d2d4"),
            Some(100),
            Some(30),
            Some(2),
            PolicyGuideSource::NeuralProposal,
            Some("fixture".to_string()),
        ),
        PolicyGuideCandidate::new(
            ActionId::from_normalized_key("c2c4"),
            Some(100),
            Some(30),
            Some(2),
            PolicyGuideSource::NeuralProposal,
            Some("fixture".to_string()),
        ),
    ];

    let proposal = NeuralProposal::passive(
        "fen:ordering",
        vec![
            ActionId::from_normalized_key("e2e4"),
            ActionId::from_normalized_key("d2d4"),
            ActionId::from_normalized_key("c2c4"),
            ActionId::from_normalized_key("g1f3"),
        ],
        candidates,
        value_hint(),
        Some("ordering fixture".to_string()),
    );

    assert_eq!(
        candidate_action_ids(&proposal),
        vec!["c2c4", "d2d4", "e2e4", "g1f3"]
    );
}

#[test]
fn scores_and_priors_are_metadata_only_not_runtime_authority() {
    let proposal = NeuralProposal::passive(
        "fen:scores",
        vec![ActionId::from_normalized_key("e2e4")],
        vec![PolicyGuideCandidate::new(
            ActionId::from_normalized_key("e2e4"),
            Some(i32::MAX),
            Some(i32::MAX),
            Some(1),
            PolicyGuideSource::NeuralProposal,
            Some("max score still metadata".to_string()),
        )],
        value_hint(),
        Some("metadata-only fixture".to_string()),
    );

    assert_eq!(proposal.candidates()[0].prior_score, Some(i32::MAX));
    assert_eq!(proposal.candidates()[0].policy_score, Some(i32::MAX));
    assert!(!proposal.can_drive_runtime());
    assert!(!proposal.is_final_authority());
    assert!(proposal.requires_search_authority());
}

#[test]
fn neural_proposal_cannot_mark_dataset_label_or_training_readiness() {
    let candidate_action_id = ActionId::from_normalized_key("e2e4");
    let proposal = NeuralProposal::passive(
        "fen:dataset",
        vec![candidate_action_id.clone()],
        vec![PolicyGuideCandidate::new(
            candidate_action_id.clone(),
            Some(90),
            None,
            Some(1),
            PolicyGuideSource::NeuralProposal,
            Some("neural prediction fixture".to_string()),
        )],
        value_hint(),
        Some("dataset blocked fixture".to_string()),
    );
    let admission = DatasetAdmissionCandidate::new(
        "candidate-neural-policy-guide-001",
        "observation-neural-policy-guide-001",
        candidate_action_id,
        DatasetAdmissionSourceKind::NeuralPredictedMove,
        Some("proposal is not label truth".to_string()),
    );

    assert_eq!(
        proposal.suggestion.dataset_posture,
        PolicyGuideDatasetPosture::NotDatasetAdmissible
    );
    assert_eq!(
        proposal.suggestion.label_truth,
        PolicyGuideLabelTruth::NotEstablished
    );
    assert!(!proposal.grants_dataset_admissibility());
    assert!(!proposal.establishes_label_truth());
    assert!(!proposal.implies_training_readiness());
    assert!(!admission.dataset_admissible);
    assert_eq!(
        admission.label_truth_status,
        DatasetLabelTruthStatus::NotEstablished
    );
    assert!(!admission.training_ready);
    assert!(admission
        .block_reasons
        .contains(&DatasetAdmissionBlockReason::NeuralPredictionIsNotAuthority));
}

#[test]
fn neural_proposal_does_not_bypass_engine_legal_actions_or_action_mask_authority() {
    let legal_action_ids = vec![ActionId::from_normalized_key("e2e4")];
    let non_legal_hint = ActionId::from_normalized_key("a1a8");
    let proposal = NeuralProposal::passive(
        "fen:legal-boundary",
        legal_action_ids.clone(),
        vec![PolicyGuideCandidate::new(
            non_legal_hint.clone(),
            Some(1000),
            Some(1000),
            Some(1),
            PolicyGuideSource::NeuralProposal,
            Some("invalid neural hint stays passive".to_string()),
        )],
        value_hint(),
        Some("engine legal action boundary fixture".to_string()),
    );

    assert!(!legal_action_ids.contains(&non_legal_hint));
    assert_eq!(
        proposal.suggestion.authority,
        PolicyGuideAuthority::ProposalOnlyRequiresSearchAuthority
    );
    assert_eq!(
        proposal.suggestion.action_mask_authority,
        PolicyGuideActionMaskAuthority::NotAuthoritative
    );
    assert!(!proposal.can_drive_runtime());
    assert!(!proposal.is_final_authority());
    assert!(!proposal.grants_action_mask_authority());
}

#[test]
fn passive_policy_guide_introduces_no_active_search_neural_or_python_wiring() {
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let policy_source = std::fs::read_to_string(root.join("src/ai/policy_guide.rs"))
        .expect("policy guide source should be readable");
    let ai_mod_source =
        std::fs::read_to_string(root.join("src/ai/mod.rs")).expect("ai mod source readable");
    let decision_source = std::fs::read_to_string(root.join("src/chess/decision.rs"))
        .expect("decision source should be readable");

    for blocked in [
        "NeuralAgent",
        "NeuralBridge",
        "query_python",
        "python_exe",
        "SearchBackend",
        "search_root",
        "ActionMask::",
        "DecisionController",
    ] {
        assert!(
            !policy_source.contains(blocked),
            "policy guide contract must remain passive and not reference {blocked}"
        );
    }

    assert!(!ai_mod_source.contains("neural_agent"));
    assert!(decision_source.contains("DecisionMode::Neural =>"));
    assert!(decision_source.contains("selection_authority: SelectionAuthority::Search"));
    assert!(!decision_source.contains("NeuralAgent"));
    assert!(!decision_source.contains("choose_neural("));
    assert!(!decision_source.contains("agent.select_action("));
    assert!(!decision_source.contains("PolicyGuideCandidate"));
    assert!(!decision_source.contains("NeuralProposal"));
}
