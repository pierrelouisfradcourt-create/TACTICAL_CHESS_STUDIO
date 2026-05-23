use crate::chess::piece_kind::ChessPieceKind;
use crate::engine::action::action::AbilityType;
use crate::engine::board::terrain::TerrainType;
use crate::engine::entity::stats::Stats;
use crate::engine::entity::unit::{PlayerId, Position, Unit};

#[derive(Clone)]
pub struct UnitTemplate {
    pub name: &'static str,
    pub kind: ChessPieceKind,
    pub hp: i32,
    pub stats: Stats,
    pub abilities: Vec<AbilityType>,
    pub power_shot_cooldown: i32,
}

#[derive(Clone)]
pub struct TerrainPlacement {
    pub position: Position,
    pub terrain: TerrainType,
}

#[derive(Clone)]
pub struct UnitSpawn {
    pub owner: PlayerId,
    pub template_name: &'static str,
    pub position: Position,
}

#[derive(Clone)]
pub struct RuntimeRuleset {
    pub name: String,
    pub board_width: u32,
    pub board_height: u32,
    pub terrain: Vec<TerrainPlacement>,
    pub unit_templates: Vec<UnitTemplate>,
    pub unit_spawns: Vec<UnitSpawn>,
}

impl RuntimeRuleset {
    pub fn find_template(&self, name: &str) -> Option<&UnitTemplate> {
        self.unit_templates.iter().find(|t| t.name == name)
    }

    pub fn instantiate_unit(&self, spawn: &UnitSpawn) -> Unit {
        let template = self
            .find_template(spawn.template_name)
            .expect("missing unit template");
        Unit {
            id: 0,
            owner: spawn.owner,
            template_name: template.name.to_string(),
            kind: template.kind,
            position: spawn.position,
            stats: template.stats,
            hp: template.hp,
            power_shot_cd: 0,
            has_moved: false,
        }
    }

    pub fn summary(&self) -> String {
        let mut out = String::new();
        out.push_str(&format!("Ruleset: {}\n", self.name));
        out.push_str(&format!(
            "Board: {}x{}\n",
            self.board_width, self.board_height
        ));
        out.push_str("Unit Templates:\n");
        for u in &self.unit_templates {
            out.push_str(&format!("- {} {:?}\n", u.name, u.kind));
        }
        out.push_str("Spawns:\n");
        for s in &self.unit_spawns {
            out.push_str(&format!(
                "- player {} {} at ({},{})\n",
                s.owner, s.template_name, s.position.x, s.position.y
            ));
        }
        out
    }
}
