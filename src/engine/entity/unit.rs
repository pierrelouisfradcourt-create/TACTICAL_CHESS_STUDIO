use crate::chess::piece_kind::ChessPieceKind;
use crate::engine::entity::stats::Stats;

pub type UnitId = u32;
pub type PlayerId = u32;

#[derive(Clone, Copy, PartialEq, Eq, Debug, Hash)]
pub struct Position {
    pub x: u32,
    pub y: u32,
}

#[derive(Clone)]
pub struct Unit {
    pub id: UnitId,
    pub owner: PlayerId,
    pub template_name: String,
    pub kind: ChessPieceKind,
    pub position: Position,
    pub stats: Stats,
    pub hp: i32,
    pub power_shot_cd: i32,
    pub has_moved: bool,
}
