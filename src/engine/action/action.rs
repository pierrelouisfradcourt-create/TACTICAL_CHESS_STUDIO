use crate::chess::piece_kind::ChessPieceKind;
use crate::engine::entity::unit::{Position, UnitId};

#[derive(Clone, Copy, Debug)]
pub enum AbilityType {
    BasicAttack,
    PowerShot,
}

#[derive(Clone, Copy, Debug)]
pub enum Action {
    Move {
        unit_id: UnitId,
        target: Position,
        promotion: Option<ChessPieceKind>,
    },
    Ability {
        unit_id: UnitId,
        ability: AbilityType,
        target: UnitId,
    },
    Pass,
}
