mod agents {
    pub mod neural_agent {
        use crate::engine::action::action::Action;
        use crate::engine::engine::Engine;
        use crate::engine::entity::unit::PlayerId;

        pub struct NeuralAgent;

        impl NeuralAgent {
            pub fn new() -> Self {
                Self
            }

            pub fn select_action(
                &self,
                _engine: &Engine,
                _player: PlayerId,
                actions: &[Action],
            ) -> Action {
                actions.first().cloned().unwrap_or(Action::Pass)
            }
        }
    }
}

#[path = "../src/chess/mod.rs"]
mod chess;
#[path = "../src/engine/mod.rs"]
mod engine;
#[path = "../src/prototype/mod.rs"]
mod prototype;

use chess::fen::engine_from_fen;
use tactical_chess_pure_lab::core::{
    ActionId, ActionMaskAuthority, ActionSubmission, ActionSubmissionStatus, DatasetAdmissibility,
    ObservationView, StepResult, StepResultStatus, ACTION_SUBMISSION_VERSION, STEP_RESULT_VERSION,
};

fn sample_submission() -> ActionSubmission {
    ActionSubmission::new(
        ActionId::from_normalized_key("e2e4"),
        Some("player:white".to_string()),
        Some("source:contract-test".to_string()),
    )
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct EnvStepFixtureInput {
    action_id: ActionId,
    actor_identity: String,
    provenance_note: String,
    previous_observation: Option<ObservationView>,
    next_observation_placeholder: Option<ObservationView>,
}

impl EnvStepFixtureInput {
    fn to_action_submission(&self) -> ActionSubmission {
        ActionSubmission::new(
            self.action_id.clone(),
            Some(self.actor_identity.clone()),
            Some(self.provenance_note.clone()),
        )
    }

    fn to_step_result(&self) -> StepResult {
        StepResult::passive(
            self.to_action_submission(),
            StepResultStatus::Unknown,
            Some(self.provenance_note.clone()),
            self.next_observation_placeholder.clone(),
        )
    }
}

fn sample_env_step_fixture_input() -> EnvStepFixtureInput {
    EnvStepFixtureInput {
        action_id: ActionId::from_normalized_key(" E2E4 "),
        actor_identity: "player:white".to_string(),
        provenance_note: "env-step-fixture:passive-contract".to_string(),
        previous_observation: Some(ObservationView::new(
            "observation:before-step",
            Some("env-step-fixture".to_string()),
            Some("player:white".to_string()),
            "state:before-step",
            vec![ActionId::from_normalized_key("e2e4")],
            Some("classical".to_string()),
            Some("previous passive placeholder".to_string()),
        )),
        next_observation_placeholder: Some(ObservationView::new(
            "observation:after-step-placeholder",
            Some("env-step-fixture".to_string()),
            Some("player:white".to_string()),
            "state:after-step-placeholder",
            vec![ActionId::from_normalized_key("g1f3")],
            Some("classical".to_string()),
            Some("next passive placeholder".to_string()),
        )),
    }
}

#[test]
fn action_submission_constructs_deterministically() {
    let left = sample_submission().with_status(ActionSubmissionStatus::Accepted);
    let right = sample_submission().with_status(ActionSubmissionStatus::Accepted);

    assert_eq!(left, right);
    assert_eq!(left.action_id.as_str(), "e2e4");
    assert_eq!(left.actor_identity.as_deref(), Some("player:white"));
    assert_eq!(left.version, ACTION_SUBMISSION_VERSION);
}

#[test]
fn env_step_fixture_maps_to_action_submission_and_step_result_as_passive_metadata() {
    let fixture = sample_env_step_fixture_input();

    let left_submission = fixture.to_action_submission();
    let right_submission = fixture.to_action_submission();
    let left_result = fixture.to_step_result();
    let right_result = fixture.to_step_result();

    assert_eq!(left_submission, right_submission);
    assert_eq!(left_result, right_result);
    assert_eq!(left_submission.action_id.as_str(), "e2e4");
    assert_eq!(left_result.submission.action_id.as_str(), "e2e4");
    assert_eq!(
        left_submission.actor_identity.as_deref(),
        Some("player:white")
    );
    assert_eq!(
        left_result.submission.actor_identity.as_deref(),
        Some("player:white")
    );
    assert_eq!(
        left_submission.provenance_note.as_deref(),
        Some("env-step-fixture:passive-contract")
    );
    assert_eq!(
        left_result.provenance_note.as_deref(),
        Some("env-step-fixture:passive-contract")
    );
    assert_eq!(
        left_result
            .observation_after_step
            .as_ref()
            .map(|view| view.observation_id.as_str()),
        Some("observation:after-step-placeholder")
    );
    assert_eq!(
        fixture
            .previous_observation
            .as_ref()
            .map(|view| view.observation_id.as_str()),
        Some("observation:before-step")
    );
    assert_eq!(left_submission.version, ACTION_SUBMISSION_VERSION);
    assert_eq!(left_result.version, STEP_RESULT_VERSION);
    assert!(!left_submission.can_drive_runtime());
    assert!(!left_result.can_drive_runtime());
    assert!(!left_submission.implies_legality_authority());
    assert!(!left_result.implies_legality_authority());
    assert!(!left_submission.grants_dataset_admissibility());
    assert!(!left_result.grants_dataset_admissibility());
    assert!(!left_submission.grants_action_mask_authority());
    assert!(!left_result.grants_action_mask_authority());
    assert!(!left_submission.implies_training_readiness());
    assert!(!left_result.implies_training_readiness());
    assert_eq!(
        left_submission.dataset_admissibility,
        DatasetAdmissibility::RequiresHumanGate
    );
    assert_eq!(
        left_result.dataset_admissibility,
        DatasetAdmissibility::RequiresHumanGate
    );
    assert_eq!(
        left_submission.action_mask_authority,
        ActionMaskAuthority::NotAuthoritative
    );
    assert_eq!(
        left_result.action_mask_authority,
        ActionMaskAuthority::NotAuthoritative
    );
}

#[test]
fn step_result_carries_passive_status_provenance_and_optional_observation_placeholder() {
    let observation = ObservationView::new(
        "observation:after-step",
        Some("env:tactical".to_string()),
        Some("player:white".to_string()),
        "state:after-step",
        vec![ActionId::from_normalized_key("g1f3")],
        Some("classical".to_string()),
        Some("passive placeholder only".to_string()),
    );

    let result = StepResult::passive(
        sample_submission().with_status(ActionSubmissionStatus::Accepted),
        StepResultStatus::Blocked,
        Some("blocked_by_policy_gate".to_string()),
        Some(observation),
    );

    assert_eq!(result.status, StepResultStatus::Blocked);
    assert_eq!(
        result.provenance_note.as_deref(),
        Some("blocked_by_policy_gate")
    );
    assert_eq!(
        result
            .observation_after_step
            .as_ref()
            .map(|view| view.observation_id.as_str()),
        Some("observation:after-step")
    );
    assert_eq!(result.version, STEP_RESULT_VERSION);
}

#[test]
fn action_submission_and_step_result_are_metadata_only_and_do_not_mutate_runtime() {
    let engine = engine_from_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1")
        .expect("valid FEN for passive contract no-mutation check");
    let before_fen = engine.to_fen();
    let before_legal_count = engine.legal_actions(1).len();

    let submission = sample_submission().with_status(ActionSubmissionStatus::Rejected);
    let result = StepResult::passive(
        submission,
        StepResultStatus::Unknown,
        Some("metadata_only".to_string()),
        None,
    );

    assert!(!result.can_drive_runtime());
    assert_eq!(engine.to_fen(), before_fen);
    assert_eq!(engine.legal_actions(1).len(), before_legal_count);
}

#[test]
fn action_submission_and_step_result_do_not_imply_legality_authority() {
    let submission = sample_submission().with_status(ActionSubmissionStatus::Unknown);
    let result = StepResult::passive(submission.clone(), StepResultStatus::Accepted, None, None);

    assert!(!submission.implies_legality_authority());
    assert!(!result.implies_legality_authority());
}

#[test]
fn action_submission_and_step_result_do_not_imply_dataset_admissibility() {
    let submission = sample_submission().with_status(ActionSubmissionStatus::Accepted);
    let result = StepResult::passive(
        submission.clone(),
        StepResultStatus::Accepted,
        Some("accepted as metadata only".to_string()),
        None,
    );

    assert_eq!(
        submission.dataset_admissibility,
        DatasetAdmissibility::RequiresHumanGate
    );
    assert_eq!(
        result.dataset_admissibility,
        DatasetAdmissibility::RequiresHumanGate
    );
    assert!(!submission.grants_dataset_admissibility());
    assert!(!result.grants_dataset_admissibility());
    assert!(!submission.implies_training_readiness());
    assert!(!result.implies_training_readiness());
}

#[test]
fn action_submission_and_step_result_do_not_imply_action_mask_authority() {
    let submission = sample_submission().with_status(ActionSubmissionStatus::Blocked);
    let result = StepResult::passive(
        submission.clone(),
        StepResultStatus::Rejected,
        Some("rejected_by_authority_gate".to_string()),
        None,
    );

    assert_eq!(
        submission.action_mask_authority,
        ActionMaskAuthority::NotAuthoritative
    );
    assert_eq!(
        result.action_mask_authority,
        ActionMaskAuthority::NotAuthoritative
    );
    assert!(!submission.grants_action_mask_authority());
    assert!(!result.grants_action_mask_authority());
}
