use postgres::Client;

use crate::simulation::simulation_runner::MatchSummary;
use crate::tool::balance_tool::BalanceReport;

pub fn create_simulation_run(client: &mut Client, ruleset_id: i32, match_count: i32) -> i32 {
    let row = client
        .query_one(
            "INSERT INTO simulation_runs (ruleset_id,match_count)
             VALUES ($1,$2)
             RETURNING id",
            &[&ruleset_id, &match_count],
        )
        .unwrap();
    row.get(0)
}

pub fn insert_match(client: &mut Client, run_id: i32, summary: &MatchSummary) {
    client
        .execute(
            "INSERT INTO simulation_matches
            (run_id,winner,turn_count,action_count)
            VALUES ($1,$2,$3,$4)",
            &[
                &run_id,
                &(summary.winner.unwrap_or(0) as i32),
                &(summary.turns as i32),
                &(summary.actions as i32),
            ],
        )
        .unwrap();
}

pub fn insert_simulation_metrics(client: &mut Client, run_id: i32, report: &BalanceReport) {
    client
        .execute(
            "INSERT INTO simulation_metrics
            (run_id,win_rate_p1,win_rate_p2,avg_turns,first_player_advantage)
            VALUES ($1,$2,$3,$4,$5)",
            &[
                &run_id,
                &(report.p1_rate as f64),
                &(report.p2_rate as f64),
                &(report.avg_turns as f64),
                &(report.first_player_advantage as f64),
            ],
        )
        .unwrap();
}

pub fn list_simulation_runs(client: &mut Client) {
    let rows = client
        .query(
            "SELECT id,ruleset_id,match_count FROM simulation_runs ORDER BY id DESC",
            &[],
        )
        .unwrap();

    for r in rows {
        let id: i32 = r.get(0);
        let ruleset: i32 = r.get(1);
        let count: i32 = r.get(2);
        println!("run {} ruleset {} matches {}", id, ruleset, count);
    }
}
