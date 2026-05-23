use crate::core::ids::PlayerId;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GameResult {
    Ongoing,
    Draw,
    Winner(PlayerId),
}
