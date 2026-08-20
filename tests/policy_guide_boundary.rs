use tactical_chess_pure_lab::ai::{
    PolicyGuide, PolicyGuideActionMaskAuthority, PolicyGuideAuthority, PolicyGuideCandidate,
    PolicyGuideDatasetPosture, PolicyGuideLabelTruth, PolicyGuideRequest, PolicyGuideResult,
    PolicyGuideSource, PolicyGuideSuggestion, PolicyPrior, PolicyValueHint,
    POLICY_GUIDE_CONTRACT_VERSION,
};
use tactical_chess_pure_lab::core::{ActionId, LegalAction};

struct MirrorLegalActionsGuide;

impl PolicyGuide for MirrorLegalActionsGuide {
    fn guide(&mut self, request: &PolicyGuideRequest) -> PolicyGuideResult {
        let priors = request
            .legal_action_ids
            .iter()
            .cloned()
            .enumerate()
            .map(|(i, action_id)| PolicyPrior {
                action_id,
                prior_score: 100 - (i as i32),
            })
            .collect::<Vec<_>>();

        PolicyGuideResult {
            priors,
            value_hint: PolicyValueHint {
                value_score: Some(15),
                confidence: Some(80),
            },
            fallback_reason: None,
        }
    }
}

struct NoPriorFallbackGuide;

impl PolicyGuide for NoPriorFallbackGuide {
    fn guide(&mut self, _request: &PolicyGuideRequest) -> PolicyGuideResult {
        PolicyGuideResult {
            priors: Vec::new(),
            value_hint: PolicyValueHint {
                value_score: None,
                confidence: None,
            },
            fallback_reason: Some("no_policy_signal".to_string()),
        }
    }
}

fn sample_request() -> PolicyGuideRequest {
    PolicyGuideRequest {
        state_key: "state:policy-guide".to_string(),
        legal_action_ids: vec![
            ActionId::from_normalized_key("e2e4"),
            ActionId::from_normalized_key("d2d4"),
            ActionId::from_normalized_key("g1f3"),
        ],
    }
}

#[test]
fn policy_guide_request_stores_legal_action_ids_deterministically() {
    let request = sample_request();

    let observed = request
        .legal_action_ids
        .iter()
        .map(ActionId::as_str)
        .collect::<Vec<_>>();

    assert_eq!(observed, vec!["e2e4", "d2d4", "g1f3"]);
}

#[test]
fn dummy_policy_guide_can_return_priors_for_legal_actions() {
    let request = sample_request();
    let mut guide = MirrorLegalActionsGuide;

    let result = guide.guide(&request);

    assert_eq!(result.priors.len(), request.legal_action_ids.len());
    for prior in &result.priors {
        assert!(request.legal_action_ids.contains(&prior.action_id));
    }
}

#[test]
fn result_can_include_value_hint_and_confidence() {
    let request = sample_request();
    let mut guide = MirrorLegalActionsGuide;

    let result = guide.guide(&request);

    assert_eq!(result.value_hint.value_score, Some(15));
    assert_eq!(result.value_hint.confidence, Some(80));
}

#[test]
fn fallback_result_with_no_priors_is_valid() {
    let request = sample_request();
    let mut guide = NoPriorFallbackGuide;

    let result = guide.guide(&request);

    assert!(result.priors.is_empty());
    assert_eq!(result.value_hint.value_score, None);
    assert_eq!(result.value_hint.confidence, None);
    assert_eq!(result.fallback_reason.as_deref(), Some("no_policy_signal"));
}

#[test]
fn boundary_compiles_without_chess_engine_search_or_neural_runtime_dependencies() {
    let request = PolicyGuideRequest {
        state_key: "state:core-only".to_string(),
        legal_action_ids: vec![ActionId::from_normalized_key("h2h4")],
    };
    let mut guide = MirrorLegalActionsGuide;
    let result = guide.guide(&request);

    assert_eq!(result.priors.len(), 1);
    assert_eq!(
        result.priors[0].action_id,
        ActionId::from_normalized_key("h2h4")
    );
}

#[test]
fn policy_guide_result_does_not_contain_selected_final_action() {
    let request = sample_request();
    let mut guide = MirrorLegalActionsGuide;
    let result = guide.guide(&request);

    // Guidance boundary only: priors and optional value hint, not a final action selector.
    assert!(!result.priors.is_empty());
    assert!(result
        .priors
        .iter()
        .all(|prior| request.legal_action_ids.contains(&prior.action_id)));
}

#[test]
fn policy_guide_suggestion_is_passive_metadata_only() {
    let candidate = PolicyGuideCandidate::from_legal_action(
        LegalAction::from_action_key("e2e4"),
        Some(90),
        Some(12),
        Some(1),
        PolicyGuideSource::NeuralProposal,
        Some("fixture neural prior".to_string()),
    );

    let suggestion = PolicyGuideSuggestion::passive(
        vec![candidate],
        PolicyValueHint {
            value_score: Some(7),
            confidence: Some(40),
        },
        Some("policy guide boundary fixture".to_string()),
    );

    assert_eq!(suggestion.version, POLICY_GUIDE_CONTRACT_VERSION);
    assert_eq!(
        suggestion.authority,
        PolicyGuideAuthority::ProposalOnlyRequiresSearchAuthority
    );
    assert_eq!(
        suggestion.dataset_posture,
        PolicyGuideDatasetPosture::NotDatasetAdmissible
    );
    assert_eq!(
        suggestion.label_truth,
        PolicyGuideLabelTruth::NotEstablished
    );
    assert_eq!(
        suggestion.action_mask_authority,
        PolicyGuideActionMaskAuthority::NotAuthoritative
    );
    assert!(!suggestion.can_drive_runtime());
    assert!(!suggestion.is_final_authority());
    assert!(suggestion.requires_search_authority());
    assert!(!suggestion.grants_dataset_admissibility());
    assert!(!suggestion.establishes_label_truth());
    assert!(!suggestion.implies_training_readiness());
    assert!(!suggestion.grants_action_mask_authority());
}
