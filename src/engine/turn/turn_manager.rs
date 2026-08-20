use crate::engine::entity::unit::PlayerId;

#[derive(Clone, Copy)]
pub struct TurnManager {
    pub current_player: PlayerId,
    pub turn_index: u32,
}

impl TurnManager {
    pub fn new() -> Self {
        Self {
            current_player: 1,
            turn_index: 0,
        }
    }

    pub fn next_turn(&mut self) {
        self.turn_index += 1;
        self.current_player = if self.current_player == 1 { 2 } else { 1 };
    }
}
