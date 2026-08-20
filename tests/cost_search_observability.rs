mod agents {
    pub mod neural_agent {
        use crate::engine::action::action::Action;
        use crate::engine::engine::Engine;
        use crate::engine::entity::unit::PlayerId;

        pub struct NeuralAgent;

        impl NeuralAgent {
            pub fn new() -> Self {
                Self
            }

            pub fn select_action(
                &self,
                _engine: &Engine,
                _player: PlayerId,
                actions: &[Action],
            ) -> Action {
                actions.first().cloned().unwrap_or(Action::Pass)
            }
        }
    }
}

#[path = "../src/chess/mod.rs"]
mod chess;
#[path = "../src/engine/mod.rs"]
mod engine;
#[path = "../src/prototype/mod.rs"]
mod prototype;

use chess::cost_search_observability::{
    allows_cost_search_detail_report, validate_cost_search_output_dir, CostSearchDetailWriteStatus,
    CostSearchMoveDetailReport, CostSearchReportWriter, CostSearchRouteError,
    CostSearchSummaryReport, COST_SEARCH_REPORT_MODE, COST_SEARCH_SCHEMA_VERSION,
};
use std::path::PathBuf;

fn safe_cost_search_dir(run_id: &str) -> PathBuf {
    std::env::temp_dir()
        .join(format!(
            "tcs_cost_search_observability_test_{}_{}",
            std::process::id(),
            run_id
        ))
        .join("lab")
        .join("gameplay_observation")
        .join("sandbox_outputs")
        .join("rocky_cost_search")
        .join(run_id)
}

fn sample_detail(game_id: u64) -> CostSearchMoveDetailReport {
    CostSearchMoveDetailReport {
        schema_version: COST_SEARCH_SCHEMA_VERSION.to_string(),
        report_mode: COST_SEARCH_REPORT_MODE.to_string(),
        game_id,
        ply: 1,
        side: "white".to_string(),
        legal_moves: 20,
        selected_move: "e2e4".to_string(),
        decision_source: "search".to_string(),
        search_depth: 3,
        search_nodes: 42,
        quiescence_nodes: 7,
        elapsed_ms: 1.5,
        neural_ms: 0.0,
        fallback_reason: None,
        mirror_evals: 0,
        notes: "test detail".to_string(),
    }
}

fn sample_summary(game_id: u64) -> CostSearchSummaryReport {
    CostSearchSummaryReport::new(game_id, "1-0", 10, 25.0, 5.0, 120, 4, 0, 0, 0)
}

#[test]
fn cost_search_safe_output_route_is_accepted() {
    let path = safe_cost_search_dir("RUN_COSTSEARCH_TEST_ACCEPTED");

    assert_eq!(validate_cost_search_output_dir(&path), Ok(()));
}

#[test]
fn cost_search_latest_json_output_route_is_rejected() {
    let path = safe_cost_search_dir("RUN_COSTSEARCH_TEST_LATEST").join("latest.json");

    assert_eq!(
        validate_cost_search_output_dir(&path),
        Err(CostSearchRouteError::LatestJsonForbidden)
    );
}

#[test]
fn cost_search_lab_runs_run_star_output_route_is_rejected() {
    let path = std::env::temp_dir()
        .join("tcs_cost_search_observability_test_lab_runs")
        .join("lab")
        .join("runs")
        .join("RUN_COSTSEARCH_FORBIDDEN");

    assert_eq!(
        validate_cost_search_output_dir(&path),
        Err(CostSearchRouteError::LabRunsRunStarForbidden)
    );
}

#[test]
fn cost_search_detail_report_is_allowed_only_for_game_id_one() {
    assert!(allows_cost_search_detail_report(1));
    assert!(!allows_cost_search_detail_report(0));
    assert!(!allows_cost_search_detail_report(2));
    assert!(!allows_cost_search_detail_report(100));
}

#[test]
fn cost_search_non_game_one_detail_write_is_summary_only_without_spam_file() {
    let output_dir = safe_cost_search_dir("RUN_COSTSEARCH_TEST_SUMMARY_ONLY");
    let _ = std::fs::remove_dir_all(&output_dir);

    let writer = CostSearchReportWriter::new(&output_dir).expect("safe route should be accepted");
    let status = writer
        .write_detail(&sample_detail(2))
        .expect("game 2 detail should be skipped without io failure");

    assert_eq!(status, CostSearchDetailWriteStatus::SummaryOnly);
    assert!(!writer.output_dir().join("game_1_detail.jsonl").exists());

    let _ = std::fs::remove_dir_all(&output_dir);
}

#[test]
fn cost_search_writer_writes_summary_only_to_safe_route() {
    let output_dir = safe_cost_search_dir("RUN_COSTSEARCH_TEST_SUMMARY_WRITE");
    let _ = std::fs::remove_dir_all(&output_dir);

    let writer = CostSearchReportWriter::new(&output_dir).expect("safe route should be accepted");
    let output_path = writer
        .write_summary(&sample_summary(2))
        .expect("summary report should write under safe route");

    assert_eq!(output_path, writer.output_dir().join("summary.jsonl"));
    assert!(output_path.exists());
    assert!(!writer.output_dir().join("latest.json").exists());

    let _ = std::fs::remove_dir_all(&output_dir);
}

#[test]
fn cost_search_game_one_detail_write_creates_bounded_detail_file() {
    let output_dir = safe_cost_search_dir("RUN_COSTSEARCH_TEST_GAME_ONE_DETAIL");
    let _ = std::fs::remove_dir_all(&output_dir);

    let writer = CostSearchReportWriter::new(&output_dir).expect("safe route should be accepted");
    let status = writer
        .write_detail(&sample_detail(1))
        .expect("game 1 detail should write under safe route");

    assert_eq!(status, CostSearchDetailWriteStatus::Written);
    assert!(writer.output_dir().join("game_1_detail.jsonl").exists());
    assert!(!writer.output_dir().join("latest.json").exists());

    let _ = std::fs::remove_dir_all(&output_dir);
}
