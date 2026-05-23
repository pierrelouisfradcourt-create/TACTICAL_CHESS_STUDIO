use postgres::Client;

#[derive(Debug, Clone)]
pub struct RulesetParameter {
    pub name: String,
    pub float_value: Option<f64>,
    pub int_value: Option<i32>,
    pub bool_value: Option<bool>,
    pub text_value: Option<String>,
}

#[derive(Debug, Clone)]
pub struct RulesetBlueprint {
    pub id: i32,
    pub name: String,
    pub description: Option<String>,
    pub parameters: Vec<RulesetParameter>,
}

#[derive(Debug, Clone)]
pub struct RuntimeRuleset {
    pub blueprint_id: i32,
    pub name: String,
    pub compiled_parameters: Vec<RulesetParameter>,
}

pub fn load_blueprint(client: &mut Client, blueprint_id: i32) -> Result<RulesetBlueprint, postgres::Error> {
    let row = client.query_one(
        "SELECT id, COALESCE(name, 'unnamed blueprint'), description
         FROM ruleset_blueprints
         WHERE id = $1",
        &[&blueprint_id],
    )?;

    let param_rows = client.query(
        "SELECT param_name, float_value, int_value, bool_value, text_value
         FROM ruleset_parameters
         WHERE blueprint_id = $1
         ORDER BY id ASC",
        &[&blueprint_id],
    )?;

    let mut parameters = Vec::new();

    for r in param_rows {
        parameters.push(RulesetParameter {
            name: r.get::<_, String>(0),
            float_value: r.get::<_, Option<f64>>(1),
            int_value: r.get::<_, Option<i32>>(2),
            bool_value: r.get::<_, Option<bool>>(3),
            text_value: r.get::<_, Option<String>>(4),
        });
    }

    Ok(RulesetBlueprint {
        id: row.get(0),
        name: row.get(1),
        description: row.get(2),
        parameters,
    })
}

pub fn compile_blueprint(blueprint: &RulesetBlueprint) -> RuntimeRuleset {
    RuntimeRuleset {
        blueprint_id: blueprint.id,
        name: blueprint.name.clone(),
        compiled_parameters: blueprint.parameters.clone(),
    }
}

pub fn load_and_compile(client: &mut Client, blueprint_id: i32) -> Result<RuntimeRuleset, postgres::Error> {
    let blueprint = load_blueprint(client, blueprint_id)?;
    Ok(compile_blueprint(&blueprint))
}

pub fn debug_print_ruleset(runtime: &RuntimeRuleset) {
    println!("=== RUNTIME RULESET ===");
    println!("blueprint_id: {}", runtime.blueprint_id);
    println!("name: {}", runtime.name);
    for p in &runtime.compiled_parameters {
        println!(
            "param {} | float={:?} int={:?} bool={:?} text={:?}",
            p.name, p.float_value, p.int_value, p.bool_value, p.text_value
        );
    }
}

