use postgres::Client;

use crate::telemetry::telemetry_logger::{log_run_telemetry, RunTelemetry};

pub fn ensure_minimal_lab_tables(client: &mut Client) -> Result<(), postgres::Error> {
    client.batch_execute(
        "
        CREATE TABLE IF NOT EXISTS experiment_registry (
            id SERIAL PRIMARY KEY,
            experiment_name TEXT,
            engine_version TEXT,
            ruleset_version TEXT,
            seed INT,
            matches INT,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS run_telemetry (
            id SERIAL PRIMARY KEY,
            run_id INT,
            turn_count INT,
            action_count INT,
            damage_total DOUBLE PRECISION,
            status_applied INT,
            pressure_events INT,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS simulation_events (
            id SERIAL PRIMARY KEY,
            run_id INT,
            turn INT,
            actor TEXT,
            action_type TEXT,
            target TEXT,
            damage DOUBLE PRECISION,
            status_applied TEXT,
            pressure_delta DOUBLE PRECISION,
            board_state TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        );
        "
    )?;
    Ok(())
}

pub fn begin_run_experiment(
    client: &mut Client,
    experiment_name: &str,
    matches: i32,
    seed: i32,
) -> Result<i32, postgres::Error> {
    ensure_minimal_lab_tables(client)?;

    let row = client.query_one(
        "INSERT INTO experiment_registry
        (experiment_name, engine_version, ruleset_version, seed, matches)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id",
        &[
            &experiment_name,
            &"dev",
            &"runtime",
            &seed,
            &matches,
        ],
    )?;

    Ok(row.get(0))
}

pub fn end_run_experiment(
    client: &mut Client,
    run_id: i32,
    turn_count: i32,
    action_count: i32,
    damage_total: f64,
) -> Result<(), postgres::Error> {
    let telemetry = RunTelemetry {
        run_id,
        turn_count,
        action_count,
        damage_total,
        status_applied: 0,
        pressure_events: 0,
    };

    let _ = log_run_telemetry(client, &telemetry)?;
    Ok(())
}

pub fn log_simple_run_event(
    client: &mut Client,
    run_id: i32,
    turn: i32,
    action_type: &str,
) -> Result<u64, postgres::Error> {
    client.execute(
        "INSERT INTO simulation_events
        (run_id, turn, actor, action_type, target, damage, status_applied, pressure_delta, board_state)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        &[
            &run_id,
            &turn,
            &"system",
            &action_type,
            &Option::<String>::None,
            &0.0_f64,
            &Option::<String>::None,
            &0.0_f64,
            &Option::<String>::None,
        ],
    )
}

