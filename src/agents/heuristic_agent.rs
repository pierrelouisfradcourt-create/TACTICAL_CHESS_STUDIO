
use crate::engine::action::action::Action;

pub struct HeuristicAgent;

impl HeuristicAgent {
    pub fn select(actions: &[Action]) -> Option<Action> {
        if actions.is_empty() { return None; }
        Some(actions[0].clone())
    }
}
