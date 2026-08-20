use std::sync::atomic::{AtomicU32, Ordering};

use crate::engine::action::action::AbilityType;
use crate::engine::board::terrain::TerrainType;
use crate::engine::entity::stats::Stats;
use crate::engine::entity::unit::Position;
use crate::prototype::runtime_ruleset::{RuntimeRuleset, TerrainPlacement, UnitSpawn, UnitTemplate};

static GENERATOR_INDEX: AtomicU32 = AtomicU32::new(0);

fn next_index() -> u32 {
    GENERATOR_INDEX.fetch_add(1, Ordering::SeqCst)
}

pub fn generate_ruleset() -> RuntimeRuleset {
    let index = next_index();
    let board_sizes = [(5, 5), (6, 6), (7, 7)];
    let (bw, bh) = board_sizes[(index as usize) % board_sizes.len()];

    let wall_variants: [&[(u32, u32)]; 4] = [
        &[(2, 2)],
        &[(2, 2), (3, 3)],
        &[(1, 3)],
        &[(3, 1)],
    ];
    let walls = wall_variants[(index as usize) % wall_variants.len()];

    let soldier_attack = 2 + (index % 2) as i32;
    let archer_range = 3 + (index % 2);
    let powershot_cd = 2 + (index % 2) as i32;

    let soldier = UnitTemplate {
        name: "Soldier",
        hp: 6,
        stats: Stats { attack: soldier_attack, defense: 0, armor: 0, range: 1 },
        abilities: vec![AbilityType::BasicAttack],
        power_shot_cooldown: 0,
    };

    let archer = UnitTemplate {
        name: "Archer",
        hp: 4,
        stats: Stats { attack: 2, defense: 0, armor: 0, range: archer_range },
        abilities: vec![AbilityType::BasicAttack, AbilityType::PowerShot],
        power_shot_cooldown: powershot_cd,
    };

    let terrain: Vec<TerrainPlacement> = walls
        .iter()
        .map(|(x, y)| TerrainPlacement { position: Position { x: *x, y: *y }, terrain: TerrainType::Wall })
        .collect();

    let spawns = if index % 2 == 0 {
        vec![
            UnitSpawn { owner: 1, template_name: "Soldier", position: Position { x: 1, y: 0 } },
            UnitSpawn { owner: 1, template_name: "Archer", position: Position { x: 3, y: 0 } },
            UnitSpawn { owner: 2, template_name: "Soldier", position: Position { x: 1, y: bh - 1 } },
            UnitSpawn { owner: 2, template_name: "Archer", position: Position { x: 3, y: bh - 1 } },
        ]
    } else {
        vec![
            UnitSpawn { owner: 1, template_name: "Soldier", position: Position { x: 0, y: 0 } },
            UnitSpawn { owner: 1, template_name: "Archer", position: Position { x: bw - 1, y: 0 } },
            UnitSpawn { owner: 2, template_name: "Soldier", position: Position { x: 0, y: bh - 1 } },
            UnitSpawn { owner: 2, template_name: "Archer", position: Position { x: bw - 1, y: bh - 1 } },
        ]
    };

    RuntimeRuleset {
        name: format!("GeneratedRuleset_{}", index),
        board_width: bw,
        board_height: bh,
        terrain,
        unit_templates: vec![soldier, archer],
        unit_spawns: spawns,
    }
}

