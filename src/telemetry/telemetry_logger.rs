use postgres::Client;

#[derive(Debug, Clone)]
pub struct RunTelemetry {
    pub run_id: i32,
    pub turn_count: i32,
    pub action_count: i32,
    pub damage_total: f64,
    pub status_applied: i32,
    pub pressure_events: i32,
}

#[derive(Debug, Clone)]
pub struct SimulationEvent {
    pub run_id: i32,
    pub turn: i32,
    pub actor: String,
    pub action_type: String,
    pub target: Option<String>,
    pub damage: f64,
    pub status_applied: Option<String>,
    pub pressure_delta: f64,
    pub board_state: Option<String>,
}

pub fn log_run_telemetry(client: &mut Client, t: &RunTelemetry) -> Result<u64, postgres::Error> {
    client.execute(
        "INSERT INTO run_telemetry
        (run_id, turn_count, action_count, damage_total, status_applied, pressure_events)
        VALUES ($1, $2, $3, $4, $5, $6)",
        &[
            &t.run_id,
            &t.turn_count,
            &t.action_count,
            &t.damage_total,
            &t.status_applied,
            &t.pressure_events,
        ],
    )
}

pub fn log_simulation_event(client: &mut Client, e: &SimulationEvent) -> Result<u64, postgres::Error> {
    client.execute(
        "INSERT INTO simulation_events
        (run_id, turn, actor, action_type, target, damage, status_applied, pressure_delta, board_state)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        &[
            &e.run_id,
            &e.turn,
            &e.actor,
            &e.action_type,
            &e.target,
            &e.damage,
            &e.status_applied,
            &e.pressure_delta,
            &e.board_state,
        ],
    )
}

pub fn log_match_replay(client: &mut Client, run_id: i32, match_id: i32, replay_json: &str) -> Result<u64, postgres::Error> {
    client.execute(
        "INSERT INTO match_replays (run_id, match_id, replay_json)
         VALUES ($1, $2, $3)",
        &[&run_id, &match_id, &replay_json],
    )
}

