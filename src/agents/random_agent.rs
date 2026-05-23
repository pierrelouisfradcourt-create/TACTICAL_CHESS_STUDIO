
use crate::engine::action::action::Action;
use rand::seq::SliceRandom;

pub struct RandomAgent;

impl RandomAgent {
    pub fn select(actions: &[Action]) -> Option<Action> {
        let mut rng = rand::thread_rng();
        actions.choose(&mut rng).cloned()
    }
}
