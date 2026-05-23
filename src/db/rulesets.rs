use postgres::Client;

use crate::prototype::runtime_ruleset::RuntimeRuleset;

pub fn insert_ruleset(client: &mut Client, ruleset: &RuntimeRuleset) -> i32 {
    let row = client
        .query_one(
            "INSERT INTO rulesets (name, board_width, board_height)
             VALUES ($1,$2,$3)
             RETURNING id",
            &[&ruleset.name, &(ruleset.board_width as i32), &(ruleset.board_height as i32)],
        )
        .unwrap();
    row.get(0)
}

pub fn insert_unit_templates(client: &mut Client, ruleset_id: i32, ruleset: &RuntimeRuleset) {
    for t in &ruleset.unit_templates {
        client
            .execute(
                "INSERT INTO unit_templates
                (ruleset_id,name,hp,attack,defense,armor,range,powershot_cooldown)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
                &[
                    &ruleset_id,
                    &t.name,
                    &t.hp,
                    &t.stats.attack,
                    &t.stats.defense,
                    &t.stats.armor,
                    &(t.stats.range as i32),
                    &t.power_shot_cooldown,
                ],
            )
            .unwrap();
    }
}

pub fn insert_ability_definitions(client: &mut Client, ruleset_id: i32, ruleset: &RuntimeRuleset) {
    for t in &ruleset.unit_templates {
        for ability in &t.abilities {
            let name = format!("{:?}", ability);
            let cooldown = if name == "PowerShot" { t.power_shot_cooldown } else { 0 };
            client
                .execute(
                    "INSERT INTO ability_definitions (ruleset_id,name,cooldown)
                     VALUES ($1,$2,$3)",
                    &[&ruleset_id, &name, &cooldown],
                )
                .unwrap();
        }
    }
}

pub fn insert_terrain(client: &mut Client, ruleset_id: i32, ruleset: &RuntimeRuleset) {
    for t in &ruleset.terrain {
        client
            .execute(
                "INSERT INTO terrain_types
                (ruleset_id,terrain,x,y)
                VALUES ($1,$2,$3,$4)",
                &[
                    &ruleset_id,
                    &format!("{:?}", t.terrain),
                    &(t.position.x as i32),
                    &(t.position.y as i32),
                ],
            )
            .unwrap();
    }
}

pub fn list_rulesets(client: &mut Client) {
    let rows = client
        .query(
            "SELECT id,name,board_width,board_height FROM rulesets ORDER BY id DESC",
            &[],
        )
        .unwrap();
    for row in rows {
        let id: i32 = row.get(0);
        let name: String = row.get(1);
        let w: i32 = row.get(2);
        let h: i32 = row.get(3);
        println!("{} | {} | {}x{}", id, name, w, h);
    }
}

