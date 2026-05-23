use crate::engine::action::action::Action;
use crate::engine::entity::unit::PlayerId;

#[derive(Clone, Debug)]
pub struct Command {
    pub player_id: PlayerId,
    pub action: Action,
}
