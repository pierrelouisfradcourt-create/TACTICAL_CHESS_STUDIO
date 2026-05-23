use crate::engine::entity::unit::{Position, UnitId};

#[derive(Clone, Debug)]
pub enum Event {
    MoveEvent { unit_id: UnitId, to: Position },
    DamageEvent { target: UnitId, amount: i32 },
    DeathEvent { unit_id: UnitId },
}
