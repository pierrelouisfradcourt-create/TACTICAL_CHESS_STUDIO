use crate::prototype::runtime_ruleset::RuntimeRuleset;

pub fn validate_ruleset(ruleset: &RuntimeRuleset) -> Result<(), String> {
    if ruleset.board_width < 4 || ruleset.board_width > 8 {
        return Err("Board width out of bounds".to_string());
    }
    if ruleset.board_height < 4 || ruleset.board_height > 8 {
        return Err("Board height out of bounds".to_string());
    }
    if ruleset.unit_templates.is_empty() {
        return Err("No unit templates".to_string());
    }
    if ruleset.unit_spawns.len() < 2 {
        return Err("Not enough unit spawns".to_string());
    }
    for spawn in &ruleset.unit_spawns {
        if spawn.position.x >= ruleset.board_width || spawn.position.y >= ruleset.board_height {
            return Err("Spawn outside board".to_string());
        }
        if ruleset.find_template(spawn.template_name).is_none() {
            return Err("Spawn references missing template".to_string());
        }
    }
    Ok(())
}

