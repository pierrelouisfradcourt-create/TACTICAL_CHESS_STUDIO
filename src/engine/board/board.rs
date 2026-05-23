use crate::engine::board::cell::Cell;
use crate::engine::board::terrain::TerrainType;
use crate::engine::entity::unit::{Position, UnitId};

#[derive(Clone)]
pub struct Board {
    pub width: u32,
    pub height: u32,
    pub cells: Vec<Cell>,
}

impl Board {
    pub fn new(width: u32, height: u32) -> Self {
        let mut cells = Vec::new();
        for _ in 0..width * height {
            cells.push(Cell::new());
        }
        Self {
            width,
            height,
            cells,
        }
    }

    pub fn in_bounds(&self, pos: Position) -> bool {
        pos.x < self.width && pos.y < self.height
    }

    fn index(&self, pos: Position) -> usize {
        (pos.y * self.width + pos.x) as usize
    }

    pub fn set_terrain(&mut self, pos: Position, terrain: TerrainType) {
        if self.in_bounds(pos) {
            let i = self.index(pos);
            self.cells[i].terrain = terrain;
        }
    }

    pub fn is_cell_free(&self, pos: Position) -> bool {
        self.in_bounds(pos)
            && self.cells[self.index(pos)].terrain != TerrainType::Wall
            && self.cells[self.index(pos)].occupant.is_none()
    }

    pub fn occupant(&self, pos: Position) -> Option<UnitId> {
        if !self.in_bounds(pos) {
            return None;
        }
        self.cells[self.index(pos)].occupant
    }

    pub fn place_unit(&mut self, unit: UnitId, pos: Position) -> Result<(), &'static str> {
        if !self.in_bounds(pos) {
            return Err("unit placement out of bounds");
        }

        let i = self.index(pos);
        if self.cells[i].occupant.is_some() {
            return Err("unit placement target occupied");
        }

        self.cells[i].occupant = Some(unit);
        Ok(())
    }

    pub fn remove_unit(&mut self, pos: Position) {
        let i = self.index(pos);
        self.cells[i].occupant = None;
    }

    pub fn move_unit(&mut self, unit: UnitId, from: Position, to: Position) {
        let fi = self.index(from);
        let ti = self.index(to);
        self.cells[fi].occupant = None;
        self.cells[ti].occupant = Some(unit);
    }

    pub fn path_clear_straight(&self, from: Position, to: Position) -> bool {
        if from.x == to.x {
            let min = from.y.min(to.y) + 1;
            let max = from.y.max(to.y);
            for y in min..max {
                if self.occupant(Position { x: from.x, y }).is_some()
                    || self.cells[self.index(Position { x: from.x, y })].terrain
                        == TerrainType::Wall
                {
                    return false;
                }
            }
            return true;
        }
        if from.y == to.y {
            let min = from.x.min(to.x) + 1;
            let max = from.x.max(to.x);
            for x in min..max {
                if self.occupant(Position { x, y: from.y }).is_some()
                    || self.cells[self.index(Position { x, y: from.y })].terrain
                        == TerrainType::Wall
                {
                    return false;
                }
            }
            return true;
        }
        false
    }

    pub fn path_clear_diag(&self, from: Position, to: Position) -> bool {
        let dx = to.x as i32 - from.x as i32;
        let dy = to.y as i32 - from.y as i32;
        if dx.abs() != dy.abs() {
            return false;
        }
        let step_x = if dx > 0 { 1 } else { -1 };
        let step_y = if dy > 0 { 1 } else { -1 };
        let mut x = from.x as i32 + step_x;
        let mut y = from.y as i32 + step_y;
        while x != to.x as i32 && y != to.y as i32 {
            let p = Position {
                x: x as u32,
                y: y as u32,
            };
            if self.occupant(p).is_some() || self.cells[self.index(p)].terrain == TerrainType::Wall
            {
                return false;
            }
            x += step_x;
            y += step_y;
        }
        true
    }

    pub fn line_of_sight(&self, a: Position, b: Position) -> bool {
        if a.x == b.x || a.y == b.y {
            self.path_clear_straight(a, b)
        } else {
            self.path_clear_diag(a, b)
        }
    }
}
