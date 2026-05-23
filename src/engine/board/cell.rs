use crate::engine::board::terrain::TerrainType;
use crate::engine::entity::unit::UnitId;

#[derive(Clone, Copy)]
pub struct Cell {
    pub terrain: TerrainType,
    pub occupant: Option<UnitId>,
}

impl Cell {
    pub fn new() -> Self {
        Self {
            terrain: TerrainType::Empty,
            occupant: None,
        }
    }
}
