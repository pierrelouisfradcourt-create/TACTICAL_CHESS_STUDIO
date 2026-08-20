use crate::db::analysis::insert_balance_report;
use crate::db::connection::connect;
use crate::db::rulesets::{insert_ability_definitions, insert_ruleset, insert_terrain, insert_unit_templates};
use crate::db::simulations::{create_simulation_run, insert_match, insert_simulation_metrics};
use crate::experiment::config::ExperimentConfig;
use crate::simulation::simulation_runner::SimulationRunner;
use crate::tool::balance_tool::analyze_matches;
use crate::tool::ruleset_generator::generate_ruleset;
use crate::tool::ruleset_validator::validate_ruleset;

pub fn run_experiment(config: ExperimentConfig) {
    let mut client = connect();
    println!("Running experiment");
    println!("rulesets: {}", config.ruleset_count);
    println!("matches per ruleset: {}", config.matches_per_ruleset);

    for i in 0..config.ruleset_count {
        println!("--- RULESET {} ---", i + 1);
        let ruleset = generate_ruleset();
        if let Err(e) = validate_ruleset(&ruleset) {
            println!("invalid ruleset: {}", e);
            continue;
        }
        let ruleset_id = insert_ruleset(&mut client, &ruleset);
        insert_unit_templates(&mut client, ruleset_id, &ruleset);
        insert_ability_definitions(&mut client, ruleset_id, &ruleset);
        insert_terrain(&mut client, ruleset_id, &ruleset);
        let run_id = create_simulation_run(&mut client, ruleset_id, config.matches_per_ruleset as i32);
        let mut runner = SimulationRunner::with_ruleset(ruleset.clone());
        let results = runner.run_n_matches(config.matches_per_ruleset);
        for r in &results {
            insert_match(&mut client, run_id, r);
        }
        let report = analyze_matches(&results);
        insert_simulation_metrics(&mut client, run_id, &report);
        insert_balance_report(&mut client, run_id, &report);
        println!("ruleset {} balance {:.3} quality {:.3}", ruleset_id, report.balance_score, report.quality_score);
    }
    println!("experiment complete");
}

