use postgres::Client;

use crate::compiler::ruleset_compiler::{load_and_compile, RuntimeRuleset};
use crate::telemetry::telemetry_logger::{log_run_telemetry, RunTelemetry};

#[derive(Debug, Clone)]
pub struct CampaignRequest {
    pub experiment_name: String,
    pub blueprint_id: i32,
    pub matches: i32,
    pub seed: i32,
    pub engine_version: String,
    pub ruleset_version: String,
}

#[derive(Debug, Clone)]
pub struct PreparedRun {
    pub registry_id: i32,
    pub runtime_ruleset: RuntimeRuleset,
}

pub fn register_experiment(client: &mut Client, req: &CampaignRequest) -> Result<i32, postgres::Error> {
    let row = client.query_one(
        "INSERT INTO experiment_registry
        (experiment_name, engine_version, ruleset_version, seed, matches)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id",
        &[
            &req.experiment_name,
            &req.engine_version,
            &req.ruleset_version,
            &req.seed,
            &req.matches,
        ],
    )?;

    Ok(row.get(0))
}

pub fn prepare_run(client: &mut Client, req: &CampaignRequest) -> Result<PreparedRun, postgres::Error> {
    let registry_id = register_experiment(client, req)?;
    let runtime_ruleset = load_and_compile(client, req.blueprint_id)?;

    Ok(PreparedRun {
        registry_id,
        runtime_ruleset,
    })
}

pub fn finalize_run(client: &mut Client, prepared: &PreparedRun, turn_count: i32, action_count: i32, damage_total: f64) -> Result<(), postgres::Error> {
    let telemetry = RunTelemetry {
        run_id: prepared.registry_id,
        turn_count,
        action_count,
        damage_total,
        status_applied: 0,
        pressure_events: 0,
    };

    let _ = log_run_telemetry(client, &telemetry)?;
    Ok(())
}

pub fn debug_prepare(client: &mut Client, blueprint_id: i32) -> Result<(), postgres::Error> {
    let req = CampaignRequest {
        experiment_name: format!("debug-blueprint-{}", blueprint_id),
        blueprint_id,
        matches: 100,
        seed: 42,
        engine_version: "dev".to_string(),
        ruleset_version: "blueprint".to_string(),
    };

    let prepared = prepare_run(client, &req)?;
    println!("Prepared run registry_id={}", prepared.registry_id);
    println!("Runtime ruleset name={}", prepared.runtime_ruleset.name);
    Ok(())
}

