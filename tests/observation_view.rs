use tactical_chess_pure_lab::core::{
    ActionId, ActionMaskAuthority, DatasetAdmissibility, EncodedObservation, ObservationEncoder,
    ObservationEncoderRuntimeAuthority, ObservationInputProvenance, ObservationView,
    OBSERVATION_ENCODER_VERSION, OBSERVATION_VIEW_VERSION,
};
use tactical_chess_pure_lab::env::EnvObservation;

fn sample_action_ids() -> Vec<ActionId> {
    vec![
        ActionId::from_normalized_key("move:e2e4"),
        ActionId::from_normalized_key("move:d2d4"),
    ]
}

struct FixtureObservationEncoder;

impl ObservationEncoder<&'static str> for FixtureObservationEncoder {
    fn encode(&self, input: &&'static str) -> EncodedObservation {
        let observation = ObservationView::new(
            "observation-fixture-001",
            Some("fixture:encoder".to_string()),
            Some("player:white".to_string()),
            format!("state-key:{input}"),
            sample_action_ids(),
            Some("classical".to_string()),
            Some("test-only fixture encoder".to_string()),
        );
        let provenance = ObservationInputProvenance::new(
            Some("fixture:encoder".to_string()),
            Some("test-fixture".to_string()),
            Some("passive placeholder contract".to_string()),
        );
        EncodedObservation::passive(observation, provenance)
    }
}

#[derive(Clone, Debug)]
struct EnvObservationFixtureInput {
    observation_id: &'static str,
    source_id: &'static str,
    env_observation: EnvObservation,
    legal_action_ids: Vec<ActionId>,
}

struct EnvObservationFixtureEncoder;

impl ObservationEncoder<EnvObservationFixtureInput> for EnvObservationFixtureEncoder {
    fn encode(&self, input: &EnvObservationFixtureInput) -> EncodedObservation {
        let observation = ObservationView::new(
            input.observation_id,
            Some(input.source_id.to_string()),
            input.env_observation.viewer.clone(),
            input.env_observation.state_key.clone(),
            input.legal_action_ids.clone(),
            Some("classical".to_string()),
            Some("env observation fixture bridge".to_string()),
        );
        let provenance = ObservationInputProvenance::new(
            Some(input.source_id.to_string()),
            Some("env-observation-fixture".to_string()),
            Some("passive adapter only".to_string()),
        );
        EncodedObservation::passive(observation, provenance)
    }
}

fn sample_env_observation_fixture_input() -> EnvObservationFixtureInput {
    EnvObservationFixtureInput {
        observation_id: "observation-env-fixture-001",
        source_id: "env:tactical:fixture",
        env_observation: EnvObservation {
            state_key: "env-state-key:opening".to_string(),
            viewer: Some("player:white".to_string()),
        },
        legal_action_ids: sample_action_ids(),
    }
}

#[test]
fn observation_view_constructs_deterministically() {
    let legal_action_ids = sample_action_ids();
    let left = ObservationView::new(
        "observation-001",
        Some("engine:chess".to_string()),
        Some("player:white".to_string()),
        "fen:rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1",
        legal_action_ids.clone(),
        Some("classical".to_string()),
        Some("engine snapshot".to_string()),
    );
    let right = ObservationView::new(
        "observation-001",
        Some("engine:chess".to_string()),
        Some("player:white".to_string()),
        "fen:rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1",
        legal_action_ids,
        Some("classical".to_string()),
        Some("engine snapshot".to_string()),
    );

    assert_eq!(left, right);
    assert_eq!(left.version, OBSERVATION_VIEW_VERSION);
}

#[test]
fn observation_view_carries_passive_legal_action_identity_metadata() {
    let legal_action_ids = sample_action_ids();
    let view = ObservationView::new(
        "observation-legal-ids",
        None,
        Some("player:black".to_string()),
        "state-key:alpha",
        legal_action_ids.clone(),
        None,
        None,
    );

    assert_eq!(view.legal_action_ids, legal_action_ids);
    assert_eq!(view.legal_action_count, 2);
}

#[test]
fn observation_view_does_not_imply_dataset_admissibility() {
    let view = ObservationView::new(
        "observation-dataset-gate",
        Some("env:tactical".to_string()),
        None,
        "state-key:dataset",
        sample_action_ids(),
        None,
        Some("observation only".to_string()),
    );

    assert_eq!(
        view.dataset_admissibility,
        DatasetAdmissibility::RequiresHumanGate
    );
    assert!(view.blocks_dataset_use());
}

#[test]
fn observation_view_does_not_imply_action_mask_authority() {
    let view = ObservationView::new(
        "observation-action-mask",
        Some("env:tactical".to_string()),
        None,
        "state-key:mask",
        sample_action_ids(),
        Some("classical".to_string()),
        Some("mask is passive metadata".to_string()),
    );

    assert_eq!(
        view.action_mask_authority,
        ActionMaskAuthority::NotAuthoritative
    );
    assert!(view.blocks_action_mask_authority());
}

#[test]
fn observation_encoder_contract_exists_and_is_passive_only() {
    let encoder = FixtureObservationEncoder;

    assert_eq!(
        encoder.runtime_authority(),
        ObservationEncoderRuntimeAuthority::PassiveOnly
    );
    assert_eq!(
        encoder.dataset_admissibility(),
        DatasetAdmissibility::RequiresHumanGate
    );
    assert_eq!(
        encoder.action_mask_authority(),
        ActionMaskAuthority::NotAuthoritative
    );
    assert!(!encoder.can_drive_runtime());
    assert!(encoder.requires_human_gate());
}

#[test]
fn observation_encoder_can_describe_observation_view_without_runtime_wiring() {
    let encoder = FixtureObservationEncoder;
    let encoded = encoder.encode(&"fixture-state");

    assert_eq!(encoded.version, OBSERVATION_ENCODER_VERSION);
    assert_eq!(encoded.observation.version, OBSERVATION_VIEW_VERSION);
    assert_eq!(encoded.observation.state_key, "state-key:fixture-state");
    assert_eq!(
        encoded.input_provenance.source_kind.as_deref(),
        Some("test-fixture")
    );
    assert_eq!(encoded.observation.legal_action_count, 2);
}

#[test]
fn observation_encoder_preserves_dataset_blocked_posture() {
    let encoder = FixtureObservationEncoder;
    let encoded = encoder.encode(&"dataset-blocked");

    assert_eq!(
        encoded.dataset_admissibility,
        DatasetAdmissibility::RequiresHumanGate
    );
    assert!(encoded.requires_human_gate());
    assert!(encoded.observation.blocks_dataset_use());
}

#[test]
fn observation_encoder_preserves_action_mask_non_authority_posture() {
    let encoder = FixtureObservationEncoder;
    let encoded = encoder.encode(&"mask-blocked");

    assert_eq!(
        encoded.action_mask_authority,
        ActionMaskAuthority::NotAuthoritative
    );
    assert!(encoded.blocks_action_mask_authority());
    assert!(encoded.observation.blocks_action_mask_authority());
    assert!(!encoded.has_runtime_authority());
}

#[test]
fn env_observation_fixture_encoder_is_deterministic_and_preserves_provenance() {
    let encoder = EnvObservationFixtureEncoder;
    let fixture_input = sample_env_observation_fixture_input();

    let left = encoder.encode(&fixture_input);
    let right = encoder.encode(&fixture_input);

    assert_eq!(left, right);
    assert_eq!(left.observation.state_key, "env-state-key:opening");
    assert_eq!(
        left.observation.source_id.as_deref(),
        Some("env:tactical:fixture")
    );
    assert_eq!(
        left.input_provenance.source_id.as_deref(),
        Some("env:tactical:fixture")
    );
    assert_eq!(
        left.input_provenance.source_kind.as_deref(),
        Some("env-observation-fixture")
    );
}

#[test]
fn env_observation_fixture_encoder_carries_legal_actions_passively() {
    let encoder = EnvObservationFixtureEncoder;
    let fixture_input = sample_env_observation_fixture_input();
    let encoded = encoder.encode(&fixture_input);

    assert_eq!(
        encoded.observation.legal_action_ids,
        fixture_input.legal_action_ids
    );
    assert_eq!(encoded.observation.legal_action_count, 2);
}

#[test]
fn env_observation_fixture_encoder_remains_passive_boundary() {
    let encoder = EnvObservationFixtureEncoder;
    let fixture_input = sample_env_observation_fixture_input();
    let encoded = encoder.encode(&fixture_input);

    assert_eq!(
        encoded.dataset_admissibility,
        DatasetAdmissibility::RequiresHumanGate
    );
    assert_eq!(
        encoded.action_mask_authority,
        ActionMaskAuthority::NotAuthoritative
    );
    assert!(encoded.requires_human_gate());
    assert!(encoded.blocks_action_mask_authority());
    assert!(!encoded.has_runtime_authority());
    assert!(!encoder.can_drive_runtime());
}
