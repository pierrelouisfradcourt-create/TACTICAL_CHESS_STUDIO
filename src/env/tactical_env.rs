use crate::core::{ActionId, LegalAction};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EnvResetRequest {
    pub seed: Option<u64>,
    pub scenario_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EnvStepRequest {
    pub action_id: ActionId,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EnvStepResult {
    pub accepted: bool,
    pub is_done: bool,
    pub reward: Option<i32>,
    pub fallback_reason: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EnvObservation {
    pub state_key: String,
    pub viewer: Option<String>,
}

pub trait TacticalEnv {
    fn reset(&mut self, request: &EnvResetRequest) -> EnvObservation;
    fn legal_actions(&self) -> Vec<LegalAction>;
    fn step(&mut self, request: &EnvStepRequest) -> EnvStepResult;
    fn observation(&self) -> EnvObservation;
    fn is_done(&self) -> bool;
}
