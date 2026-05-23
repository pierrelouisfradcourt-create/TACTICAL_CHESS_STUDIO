use tactical_chess_pure_lab::core::{ActionId, LegalAction};
use tactical_chess_pure_lab::env::{
    EnvObservation, EnvResetRequest, EnvStepRequest, EnvStepResult, TacticalEnv,
};

struct DummyTacticalEnv {
    state_key: String,
    viewer: Option<String>,
    legal_actions: Vec<LegalAction>,
    is_done: bool,
}

impl DummyTacticalEnv {
    fn new() -> Self {
        Self {
            state_key: "state:boot".to_string(),
            viewer: Some("observer:white".to_string()),
            legal_actions: vec![
                LegalAction::from_action_key("e2e4"),
                LegalAction::from_action_key("g1f3"),
            ],
            is_done: false,
        }
    }
}

impl TacticalEnv for DummyTacticalEnv {
    fn reset(&mut self, request: &EnvResetRequest) -> EnvObservation {
        let scenario = request
            .scenario_id
            .as_deref()
            .unwrap_or("default-scenario");
        let seed = request
            .seed
            .map(|value| value.to_string())
            .unwrap_or_else(|| "none".to_string());
        self.state_key = format!("state:{}:seed={}", scenario, seed);
        self.is_done = false;

        self.observation()
    }

    fn legal_actions(&self) -> Vec<LegalAction> {
        self.legal_actions.clone()
    }

    fn step(&mut self, request: &EnvStepRequest) -> EnvStepResult {
        let known_action = self
            .legal_actions
            .iter()
            .any(|candidate| candidate.action_id == request.action_id);

        if !known_action {
            return EnvStepResult {
                accepted: false,
                is_done: self.is_done,
                reward: None,
                fallback_reason: Some("unknown_action_id".to_string()),
            };
        }

        self.state_key = format!("{}::after_step", self.state_key);
        self.is_done = true;

        EnvStepResult {
            accepted: true,
            is_done: self.is_done,
            reward: Some(1),
            fallback_reason: None,
        }
    }

    fn observation(&self) -> EnvObservation {
        EnvObservation {
            state_key: self.state_key.clone(),
            viewer: self.viewer.clone(),
        }
    }

    fn is_done(&self) -> bool {
        self.is_done
    }
}

#[test]
fn env_reset_request_construction_is_explicit() {
    let request = EnvResetRequest {
        seed: Some(42),
        scenario_id: Some("scenario:fork".to_string()),
    };

    assert_eq!(request.seed, Some(42));
    assert_eq!(request.scenario_id.as_deref(), Some("scenario:fork"));
}

#[test]
fn env_step_request_construction_uses_action_id() {
    let action_id = ActionId::from_normalized_key("e2e4");
    let request = EnvStepRequest {
        action_id: action_id.clone(),
    };

    assert_eq!(request.action_id, action_id);
    assert_eq!(request.action_id.as_str(), "e2e4");
}

#[test]
fn env_observation_stores_state_key() {
    let observation = EnvObservation {
        state_key: "state:observation".to_string(),
        viewer: Some("observer:black".to_string()),
    };

    assert_eq!(observation.state_key, "state:observation");
    assert_eq!(observation.viewer.as_deref(), Some("observer:black"));
}

#[test]
fn dummy_env_can_reset_expose_legal_actions_step_observe_and_report_done() {
    let mut env = DummyTacticalEnv::new();

    let reset_observation = env.reset(&EnvResetRequest {
        seed: Some(7),
        scenario_id: Some("scenario:contract".to_string()),
    });
    assert_eq!(
        reset_observation.state_key,
        "state:scenario:contract:seed=7".to_string()
    );
    assert!(!env.is_done());

    let legal_actions = env.legal_actions();
    assert_eq!(legal_actions.len(), 2);
    assert_eq!(legal_actions[0].action_id.as_str(), "e2e4");
    assert_eq!(legal_actions[1].action_id.as_str(), "g1f3");

    let step_result = env.step(&EnvStepRequest {
        action_id: ActionId::from_normalized_key("e2e4"),
    });
    assert_eq!(
        step_result,
        EnvStepResult {
            accepted: true,
            is_done: true,
            reward: Some(1),
            fallback_reason: None,
        }
    );
    assert!(env.is_done());

    let observation_after_step = env.observation();
    assert_eq!(
        observation_after_step.state_key,
        "state:scenario:contract:seed=7::after_step"
    );
    assert_eq!(observation_after_step.viewer.as_deref(), Some("observer:white"));
}

#[test]
fn dummy_env_step_rejects_unknown_action_with_fallback_reason() {
    let mut env = DummyTacticalEnv::new();
    env.reset(&EnvResetRequest {
        seed: None,
        scenario_id: Some("scenario:reject".to_string()),
    });

    let result = env.step(&EnvStepRequest {
        action_id: ActionId::from_normalized_key("a2a4"),
    });

    assert_eq!(result.accepted, false);
    assert_eq!(result.is_done, false);
    assert_eq!(result.reward, None);
    assert_eq!(result.fallback_reason.as_deref(), Some("unknown_action_id"));
    assert!(!env.is_done());
}

#[test]
fn boundary_compiles_with_legal_action_and_action_id_only() {
    let mut env = DummyTacticalEnv::new();
    let reset = env.reset(&EnvResetRequest {
        seed: Some(99),
        scenario_id: None,
    });

    assert_eq!(reset.state_key, "state:default-scenario:seed=99");

    let legal_ids = env
        .legal_actions()
        .into_iter()
        .map(|legal_action| legal_action.action_id)
        .collect::<Vec<_>>();
    assert_eq!(legal_ids.len(), 2);
    assert_eq!(legal_ids[0], ActionId::from_normalized_key("e2e4"));
    assert_eq!(legal_ids[1], ActionId::from_normalized_key("g1f3"));
}

#[test]
fn boundary_does_not_require_current_chess_runtime_modules() {
    let mut env = DummyTacticalEnv::new();

    let _ = env.reset(&EnvResetRequest {
        seed: None,
        scenario_id: Some("scenario:core-only".to_string()),
    });
    let _ = env.step(&EnvStepRequest {
        action_id: ActionId::from_normalized_key("g1f3"),
    });

    let observation = env.observation();
    assert!(observation.state_key.starts_with("state:scenario:core-only"));
}
