use std::collections::BTreeMap;
use std::fs::{create_dir_all, File};
use std::io::{BufWriter, Write};

use crate::prototype::minimal_ruleset::minimal_runtime_ruleset;
use crate::simulation::simulation_runner::{
    MatchTermination, SimulationRunner, TelemetryMatchSummary,
};

#[derive(Clone, Debug)]
pub struct CrossTestConfig {
    pub config_id: String,
    pub max_steps: u32,
    pub games_per_matchup: u32,
    pub matchups: Vec<(String, String)>,
}

#[derive(Clone, Debug)]
pub struct CrossTestAggregate {
    pub config_id: String,
    pub agent_white: String,
    pub agent_black: String,
    pub games: u32,
    pub white_wins: u32,
    pub black_wins: u32,
    pub draws: u32,
    pub avg_turns: f64,
    pub avg_actions: f64,
    pub turn_limit_count: u32,
    pub forced_draw_stagnation_count: u32,
}

fn termination_to_str(t: &MatchTermination) -> &'static str {
    match t {
        MatchTermination::Winner => "winner",
        MatchTermination::Draw => "draw",
        MatchTermination::ForcedDrawStagnation => "forced_draw_stagnation",
        MatchTermination::TurnLimit => "turn_limit",
    }
}

pub fn default_cross_test_configs() -> Vec<CrossTestConfig> {
    let matchups = vec![
        ("random".to_string(), "heuristic".to_string()),
        ("random".to_string(), "neural".to_string()),
        ("heuristic".to_string(), "neural".to_string()),
        ("hybrid".to_string(), "neural".to_string()),
    ];

    vec![
        CrossTestConfig {
            config_id: "steps_200".to_string(),
            max_steps: 200,
            games_per_matchup: 100,
            matchups: matchups.clone(),
        },
        CrossTestConfig {
            config_id: "steps_150".to_string(),
            max_steps: 150,
            games_per_matchup: 100,
            matchups: matchups.clone(),
        },
        CrossTestConfig {
            config_id: "steps_100".to_string(),
            max_steps: 100,
            games_per_matchup: 100,
            matchups,
        },
    ]
}

pub fn run_cross_tests() -> Result<(), String> {
    let configs = default_cross_test_configs();

    create_dir_all("lab/tournaments").map_err(|e| format!("create_dir_all failed: {}", e))?;

    let games_path = "lab/tournaments/cross_games.csv";
    let summary_path = "lab/tournaments/cross_summary.csv";
    let report_path = "lab/tournaments/cross_report.txt";

    let games_file =
        File::create(games_path).map_err(|e| format!("create games csv failed: {}", e))?;
    let summary_file =
        File::create(summary_path).map_err(|e| format!("create summary csv failed: {}", e))?;
    let report_file =
        File::create(report_path).map_err(|e| format!("create report txt failed: {}", e))?;

    let mut games_writer = BufWriter::new(games_file);
    let mut summary_writer = BufWriter::new(summary_file);
    let mut report_writer = BufWriter::new(report_file);

    writeln!(
        games_writer,
        "config_id,match_index,agent_white,agent_black,winner,draw_flag,turns,actions,termination"
    )
    .map_err(|e| format!("write games header failed: {}", e))?;

    writeln!(
        summary_writer,
        "config_id,agent_white,agent_black,games,white_wins,black_wins,draws,avg_turns,avg_actions,turn_limit_count,forced_draw_stagnation_count"
    )
    .map_err(|e| format!("write summary header failed: {}", e))?;

    let mut all_game_rows: Vec<TelemetryMatchSummary> = Vec::new();

    for config in &configs {
        println!(
            "CROSS_TEST_START | config={} | max_steps={} | games_per_matchup={}",
            config.config_id, config.max_steps, config.games_per_matchup
        );

        for (agent_a, agent_b) in &config.matchups {
            let ruleset = minimal_runtime_ruleset();
            let mut runner = SimulationRunner::with_ruleset_and_limit(ruleset, config.max_steps);
            runner.verbose = false;

            let forward = runner.run_n_matches_with_agents(
                config.games_per_matchup,
                agent_a,
                agent_b,
                &config.config_id,
            );

            let ruleset_rev = minimal_runtime_ruleset();
            let mut runner_rev =
                SimulationRunner::with_ruleset_and_limit(ruleset_rev, config.max_steps);
            runner_rev.verbose = false;

            let reverse = runner_rev.run_n_matches_with_agents(
                config.games_per_matchup,
                agent_b,
                agent_a,
                &config.config_id,
            );

            for row in forward.into_iter().chain(reverse.into_iter()) {
                writeln!(
                    games_writer,
                    "{},{},{},{},{},{},{},{},{}",
                    row.config_id,
                    row.match_index,
                    row.agent_white,
                    row.agent_black,
                    row.winner
                        .map(|w| w.to_string())
                        .unwrap_or_else(|| "".to_string()),
                    if row.true_draw_flag { 1 } else { 0 },
                    row.turns,
                    row.actions,
                    termination_to_str(&row.termination),
                )
                .map_err(|e| format!("write games row failed: {}", e))?;

                all_game_rows.push(row);
            }
        }
    }

    let mut grouped: BTreeMap<(String, String, String), Vec<&TelemetryMatchSummary>> =
        BTreeMap::new();

    for row in &all_game_rows {
        grouped
            .entry((
                row.config_id.clone(),
                row.agent_white.clone(),
                row.agent_black.clone(),
            ))
            .or_default()
            .push(row);
    }

    let mut report = String::new();
    report.push_str("CROSS TEST REPORT\n");
    report.push_str("=================\n\n");

    for ((config_id, white, black), rows) in grouped {
        let games = rows.len() as u32;
        let mut white_wins = 0u32;
        let mut black_wins = 0u32;
        let mut draws = 0u32;
        let mut turn_sum = 0u64;
        let mut action_sum = 0u64;
        let mut turn_limit_count = 0u32;
        let mut forced_draw_stagnation_count = 0u32;

        for row in &rows {
            turn_sum += row.turns as u64;
            action_sum += row.actions as u64;

            match &row.termination {
                MatchTermination::TurnLimit => {
                    turn_limit_count += 1;
                }
                MatchTermination::ForcedDrawStagnation => {
                    forced_draw_stagnation_count += 1;
                }
                MatchTermination::Winner | MatchTermination::Draw => {}
            }

            match row.winner {
                Some(1) => white_wins += 1,
                Some(2) => black_wins += 1,
                Some(_) => {}
                None => draws += 1,
            }
        }

        let avg_turns = if games > 0 {
            turn_sum as f64 / games as f64
        } else {
            0.0
        };

        let avg_actions = if games > 0 {
            action_sum as f64 / games as f64
        } else {
            0.0
        };

        let aggregate = CrossTestAggregate {
            config_id: config_id.clone(),
            agent_white: white.clone(),
            agent_black: black.clone(),
            games,
            white_wins,
            black_wins,
            draws,
            avg_turns,
            avg_actions,
            turn_limit_count,
            forced_draw_stagnation_count,
        };

        writeln!(
            summary_writer,
            "{},{},{},{},{},{},{},{:.2},{:.2},{},{}",
            aggregate.config_id,
            aggregate.agent_white,
            aggregate.agent_black,
            aggregate.games,
            aggregate.white_wins,
            aggregate.black_wins,
            aggregate.draws,
            aggregate.avg_turns,
            aggregate.avg_actions,
            aggregate.turn_limit_count,
            aggregate.forced_draw_stagnation_count,
        )
        .map_err(|e| format!("write summary row failed: {}", e))?;

        report.push_str(&format!(
            "[{}] {} vs {}\n",
            aggregate.config_id, aggregate.agent_white, aggregate.agent_black
        ));
        report.push_str(&format!(
            "games={} | white_wins={} | black_wins={} | draws={} | avg_turns={:.2} | avg_actions={:.2} | turn_limit={} | forced_draw_stagnation={}\n\n",
            aggregate.games,
            aggregate.white_wins,
            aggregate.black_wins,
            aggregate.draws,
            aggregate.avg_turns,
            aggregate.avg_actions,
            aggregate.turn_limit_count,
            aggregate.forced_draw_stagnation_count,
        ));
    }

    write!(report_writer, "{}", report).map_err(|e| format!("write report failed: {}", e))?;

    println!("Saved to: {}", games_path);
    println!("Saved to: {}", summary_path);
    println!("Saved to: {}", report_path);

    Ok(())
}
