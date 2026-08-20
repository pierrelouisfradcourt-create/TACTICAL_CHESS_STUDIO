use crate::chess::decision::choose_best_action_with_trace;
use crate::chess::fen::engine_from_fen;
use crate::chess::search::static_evaluate;
use crate::chess::uci::action_to_uci;
use crate::engine::action::action::Action;
use crate::engine::action::command::Command;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Clone, Debug, Deserialize)]
pub struct ConversionSuiteCase {
    #[serde(alias = "id")]
    pub case_id: String,
    pub fen: String,
    pub engine_color: Option<u32>,
    pub expected_winner: Option<u32>,
    pub best_move: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ConversionEvalResult {
    pub case_id: String,
    pub fen: String,
    pub engine_agent: String,
    pub opponent_agent: String,
    pub engine_color: u32,
    pub expected_winner: Option<u32>,
    pub opponent_premove: Option<String>,
    pub engine_first_move: Option<String>,
    pub engine_used_search: bool,
    pub engine_best_score: Option<i32>,
    pub engine_completed_depth: Option<i32>,
    pub score_before_move: Option<i32>,
    #[serde(alias = "score_after_engine_move")]
    pub score_after_move: Option<i32>,
    pub delta: Option<i32>,
    pub classification: Option<String>,
    pub best_move_matches: Option<bool>,
    pub solved: bool,
    pub partial: bool,
    pub failed: bool,
    pub warning: Option<Vec<String>>,
    pub converted_detectable: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ConversionSuiteReport {
    pub schema_version: u32,
    pub suite_id: String,
    pub engine_agent: String,
    pub opponent_agent: String,
    pub total: usize,
    pub improved: usize,
    pub stagnated: usize,
    pub regressed: usize,
    pub solved: usize,
    pub partial: usize,
    pub failed: usize,
    pub improved_pct: f64,
    pub solved_pct: f64,
    pub stagnated_pct: f64,
    pub regressed_pct: f64,
    pub cases: Vec<ConversionEvalResult>,
}

const DELTA_EPS: i32 = 25;

fn parse_engine_color(value: &str) -> Option<u32> {
    match value.trim().to_ascii_lowercase().as_str() {
        "white" | "w" | "1" => Some(1),
        "black" | "b" | "2" => Some(2),
        _ => None,
    }
}

fn resolve_best_move_match(
    expected_best: Option<&str>,
    engine_first_move: Option<&str>,
) -> Option<bool> {
    expected_best.map(|expected| engine_first_move == Some(expected))
}

fn solve_classification(
    best_move_matches: Option<bool>,
    delta: Option<i32>,
    has_engine_move: bool,
) -> (bool, bool, bool) {
    let solved = best_move_matches == Some(true);
    let failed = delta.unwrap_or(i32::MIN) <= -DELTA_EPS || !has_engine_move;
    let partial = !solved && !failed && delta.unwrap_or(i32::MIN) >= DELTA_EPS;
    (solved, partial, failed)
}

fn build_warnings(
    engine_used_search: bool,
    opponent_premove: bool,
    best_move: bool,
    engine_color_inferred: bool,
) -> Option<Vec<String>> {
    let mut warnings = Vec::new();

    if !engine_used_search {
        warnings.push("engine_used_search_is_false".to_string());
    }
    if opponent_premove {
        warnings.push("opponent_premove_is_some".to_string());
    }
    if !best_move {
        warnings.push("best_move_is_missing".to_string());
    }
    if engine_color_inferred {
        warnings.push("engine_color_inferred_from_expected_winner".to_string());
    }

    if warnings.is_empty() {
        None
    } else {
        Some(warnings)
    }
}

fn resolve_engine_color(case: &ConversionSuiteCase) -> (u32, bool) {
    match (case.engine_color, case.expected_winner) {
        (Some(color), _) => (color, false),
        (None, Some(winner)) => (winner, true),
        (None, None) => (1, false),
    }
}

pub fn run_conversion_case_cli(args: &[String]) {
    let mut fen: Option<String> = None;
    let mut case_id = "conversion_case".to_string();
    let mut engine_agent = "hybrid".to_string();
    let mut opponent_agent = "heuristic".to_string();
    let mut engine_color: Option<u32> = None;
    let mut i = 2;
    while i < args.len() {
        match args[i].as_str() {
            "--fen" => {
                fen = args.get(i + 1).cloned();
                i += 2;
            }
            "--id" => {
                if let Some(v) = args.get(i + 1) {
                    case_id = v.clone();
                }
                i += 2;
            }
            "--engine" => {
                if let Some(v) = args.get(i + 1) {
                    engine_agent = v.clone();
                }
                i += 2;
            }
            "--opponent" => {
                if let Some(v) = args.get(i + 1) {
                    opponent_agent = v.clone();
                }
                i += 2;
            }
            "--engine-color" => {
                engine_color = args.get(i + 1).and_then(|v| parse_engine_color(v));
                i += 2;
            }
            "--max-steps" => {
                i += 2;
            }
            _ => {
                i += 1;
            }
        }
    }

    let Some(fen) = fen else {
        println!("CONVERSION_CASE_STATUS=failed|reason=missing_fen|hint=use --fen \"<FEN>\"");
        return;
    };

    let engine_color = engine_color.unwrap_or_else(|| {
        if fen.split_whitespace().nth(1).unwrap_or("w") == "b" {
            2
        } else {
            1
        }
    });

    if engine_agent == "random" || opponent_agent == "random" {
        println!("CONVERSION_CASE_STATUS=failed|reason=random_agent_is_not_deterministic");
        return;
    }
    if engine_agent == "neural" || opponent_agent == "neural" {
        println!("CONVERSION_CASE_STATUS=failed|reason=neural_agent_not_allowed");
        return;
    }
    if engine_agent == "teacher_uci" || opponent_agent == "teacher_uci" {
        println!("CONVERSION_CASE_STATUS=failed|reason=teacher_uci_not_allowed");
        return;
    }

    let Ok(engine) = engine_from_fen(&fen) else {
        println!("CONVERSION_CASE_STATUS=failed|reason=fen_parse_failed");
        return;
    };
    let eval = eval_case_quick(
        case_id,
        engine,
        fen,
        &engine_agent,
        &opponent_agent,
        engine_color,
        None,
        None,
        false,
    );

    match serde_json::to_string(&eval) {
        Ok(rendered) => println!("{}", rendered),
        Err(_) => println!("CONVERSION_CASE_STATUS=failed|reason=json_render_failed"),
    }
}

fn eval_case_quick(
    case_id: String,
    mut engine: crate::engine::engine::Engine,
    fen: String,
    engine_agent: &str,
    opponent_agent: &str,
    engine_color: u32,
    expected_winner: Option<u32>,
    best_move: Option<&str>,
    engine_color_inferred: bool,
) -> ConversionEvalResult {
    let mut opponent_premove = None;

    if engine.turn_manager.current_player != engine_color {
        if let Some(trace) = choose_best_action_with_trace(
            &engine,
            engine.turn_manager.current_player,
            opponent_agent,
        ) {
            let uci = action_to_uci(&trace.selected_action, &engine.units);
            opponent_premove = uci.clone();
            engine.execute(Command {
                player_id: engine.turn_manager.current_player,
                action: trace.selected_action,
            });
        }
    }

    let score_before_move = Some(static_evaluate(&engine, engine_color));

    let mut engine_first_move = None;
    let mut engine_first_action: Option<Action> = None;
    let mut engine_used_search = false;
    let mut engine_best_score = None;
    let mut engine_completed_depth = None;

    if engine.turn_manager.current_player == engine_color {
        if let Some(trace) = choose_best_action_with_trace(&engine, engine_color, engine_agent) {
            engine_first_move = action_to_uci(&trace.selected_action, &engine.units);
            engine_first_action = Some(trace.selected_action.clone());
            engine_used_search = trace.used_search;
            if let Some(root) = trace.root_search.as_ref() {
                engine_best_score = Some(root.best_score);
                engine_completed_depth = Some(root.completed_depth);
            }
        }
    }

    let best_move_matches = resolve_best_move_match(best_move, engine_first_move.as_deref());

    let (score_after_move, delta, classification) = if let Some(action) = engine_first_action {
        let mut engine_after = engine.clone();
        engine_after.execute(Command {
            player_id: engine_color,
            action,
        });

        let score_after = static_evaluate(&engine_after, engine_color);
        let delta = score_after - score_before_move.unwrap_or(0);

        let classification = if delta >= DELTA_EPS {
            "improved"
        } else if delta <= -DELTA_EPS {
            "regressed"
        } else {
            "stagnated"
        };

        (
            Some(score_after),
            Some(delta),
            Some(classification.to_string()),
        )
    } else {
        (None, None, None)
    };

    let converted_detectable = engine_best_score
        .or(score_before_move)
        .map(|s| s > 800_000)
        .unwrap_or(false);

    let (solved, partial, failed) =
        solve_classification(best_move_matches, delta, engine_first_move.is_some());
    let warning = build_warnings(
        engine_used_search,
        opponent_premove.is_some(),
        best_move.is_some(),
        engine_color_inferred,
    );

    ConversionEvalResult {
        case_id,
        fen,
        engine_agent: engine_agent.to_string(),
        opponent_agent: opponent_agent.to_string(),
        engine_color,
        expected_winner,
        opponent_premove,
        engine_first_move,
        engine_used_search,
        engine_best_score,
        engine_completed_depth,
        score_before_move,
        score_after_move,
        delta,
        classification,
        best_move_matches,
        solved,
        partial,
        failed,
        warning,
        converted_detectable,
    }
}

fn load_suite_cases(path: &Path) -> Result<Vec<ConversionSuiteCase>, String> {
    let content = fs::read_to_string(path).map_err(|e| format!("read suite failed: {e}"))?;
    let mut cases = Vec::new();
    for (line_index, line) in content.lines().enumerate() {
        let mut trimmed = line.trim();
        if line_index == 0 {
            trimmed = trimmed.trim_start_matches('\u{feff}');
        }
        if trimmed.is_empty() {
            continue;
        }
        let case: ConversionSuiteCase = serde_json::from_str(trimmed)
            .map_err(|e| format!("suite parse error at line {}: {}", line_index + 1, e))?;
        cases.push(case);
    }
    Ok(cases)
}

pub fn run_conversion_suite_local(
    suite_path: &Path,
    engine_agent: &str,
    opponent_agent: &str,
    limit: Option<usize>,
    report_json_path: &Path,
    report_md_path: &Path,
) -> Result<(), String> {
    if engine_agent == "random" || opponent_agent == "random" {
        return Err("random agent is not deterministic".to_string());
    }
    if engine_agent == "neural" || opponent_agent == "neural" {
        return Err("neural agent not allowed in conversion suite".to_string());
    }
    if engine_agent == "teacher_uci" || opponent_agent == "teacher_uci" {
        return Err("teacher_uci not allowed in conversion suite".to_string());
    }

    let cases = load_suite_cases(suite_path)?;

    let mut results = Vec::new();

    let mut improved = 0usize;
    let mut stagnated = 0usize;
    let mut regressed = 0usize;
    let mut solved_cases = 0usize;
    let mut partial_cases = 0usize;
    let mut failed_cases = 0usize;

    for case in cases.iter().take(limit.unwrap_or(usize::MAX)) {
        let (engine_color, engine_color_inferred) = resolve_engine_color(case);
        let engine = engine_from_fen(&case.fen)?;
        let eval = eval_case_quick(
            case.case_id.clone(),
            engine,
            case.fen.clone(),
            engine_agent,
            opponent_agent,
            engine_color,
            case.expected_winner,
            case.best_move.as_deref(),
            engine_color_inferred,
        );

        match eval.classification.as_deref() {
            Some("improved") => improved += 1,
            Some("regressed") => regressed += 1,
            Some("stagnated") => stagnated += 1,
            _ => {}
        }
        if eval.solved {
            solved_cases += 1;
        }
        if eval.partial {
            partial_cases += 1;
        }
        if eval.failed {
            failed_cases += 1;
        }

        results.push(eval);
    }

    let total = results.len();
    let improved_pct = if total > 0 {
        improved as f64 * 100.0 / total as f64
    } else {
        0.0
    };
    let solved_pct = if total > 0 {
        solved_cases as f64 * 100.0 / total as f64
    } else {
        0.0
    };
    let stagnated_pct = if total > 0 {
        stagnated as f64 * 100.0 / total as f64
    } else {
        0.0
    };
    let regressed_pct = if total > 0 {
        regressed as f64 * 100.0 / total as f64
    } else {
        0.0
    };

    let report = ConversionSuiteReport {
        schema_version: 4,
        suite_id: "conversion_suite_v1".to_string(),
        engine_agent: engine_agent.to_string(),
        opponent_agent: opponent_agent.to_string(),
        total,
        improved,
        stagnated,
        regressed,
        solved: solved_cases,
        partial: partial_cases,
        failed: failed_cases,
        improved_pct,
        solved_pct,
        stagnated_pct,
        regressed_pct,
        cases: results.clone(),
    };

    let report_json = serde_json::to_string_pretty(&report).map_err(|e| format!("{e}"))?;
    if let Some(parent) = report_json_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(report_json_path, report_json).map_err(|e| format!("write report failed: {e}"))?;

    let report_md = render_markdown_report(&report);
    if let Some(parent) = report_md_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(report_md_path, report_md).map_err(|e| format!("write md report failed: {e}"))?;

    Ok(())
}

fn render_markdown_report(report: &ConversionSuiteReport) -> String {
    let mut out = String::new();
    out.push_str("# Conversion Suite V1\n\n");
    out.push_str(&format!(
        "- engine: `{}` vs `{}`\n- total: `{}`\n- improved: `{}` ({:.2}%)\n- stagnated: `{}` ({:.2}%)\n- regressed: `{}` ({:.2}%)\n- solved: `{}` ({:.2}%)\n- partial: `{}`\n- failed: `{}`\n\n",
        report.engine_agent,
        report.opponent_agent,
        report.total,
        report.improved,
        report.improved_pct,
        report.stagnated,
        report.stagnated_pct,
        report.regressed,
        report.regressed_pct,
        report.solved,
        report.solved_pct,
        report.partial,
        report.failed
    ));

    out.push_str("## Cases\n\n");
    out.push_str("| case_id | engine_color | expected_winner | opponent_premove | engine_first_move | used_search | score_before | score_after | delta | class | best_move_matches | solved | partial | failed | warnings | best_score | depth | detectable |\n");
    out.push_str(
        "|---|---:|---:|---|---|---:|---:|---:|---:|---|---:|---:|---:|---:|---|---:|---:|---:|\n",
    );

    for c in &report.cases {
        let warning_text = c
            .warning
            .as_ref()
            .map(|items| items.join(","))
            .unwrap_or_else(|| "-".to_string());

        out.push_str(&format!(
        "| {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |\n",
            c.case_id,
            c.engine_color,
            c.expected_winner
                .map(|v| v.to_string())
                .unwrap_or_else(|| "-".to_string()),
            c.opponent_premove
                .clone()
                .unwrap_or_else(|| "-".to_string()),
            c.engine_first_move
                .clone()
                .unwrap_or_else(|| "-".to_string()),
            if c.engine_used_search { 1 } else { 0 },
            c.score_before_move
                .map(|v| v.to_string())
                .unwrap_or_else(|| "-".to_string()),
            c.score_after_move
                .map(|v| v.to_string())
                .unwrap_or_else(|| "-".to_string()),
            c.delta
                .map(|v| v.to_string())
                .unwrap_or_else(|| "-".to_string()),
            c.classification.clone().unwrap_or_else(|| "-".to_string()),
            c.best_move_matches
                .map(|v| v.to_string())
                .unwrap_or_else(|| "-".to_string()),
            if c.solved { 1 } else { 0 },
            if c.partial { 1 } else { 0 },
            if c.failed { 1 } else { 0 },
            warning_text,
            c.engine_best_score
                .map(|v| v.to_string())
                .unwrap_or_else(|| "-".to_string()),
            c.engine_completed_depth
                .map(|v| v.to_string())
                .unwrap_or_else(|| "-".to_string()),
            if c.converted_detectable { 1 } else { 0 },
        ));
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn best_move_match_true() {
        assert_eq!(
            resolve_best_move_match(Some("e2e4"), Some("e2e4")),
            Some(true)
        );
    }

    #[test]
    fn best_move_match_false() {
        assert_eq!(
            resolve_best_move_match(Some("e2e4"), Some("d2d4")),
            Some(false)
        );
    }

    #[test]
    fn engine_color_field_overrides_expected_winner() {
        let case = ConversionSuiteCase {
            case_id: "test".to_string(),
            fen: "8/8/8/8/8/8/8/K6k b - - 0 1".to_string(),
            engine_color: Some(2),
            expected_winner: Some(1),
            best_move: Some("h1h2".to_string()),
        };

        let (color, inferred) = resolve_engine_color(&case);
        assert_eq!(color, 2);
        assert!(!inferred);
    }

    #[test]
    fn solved_partial_failed_classification() {
        assert_eq!(
            solve_classification(Some(true), Some(200), true),
            (true, false, false)
        );
        assert_eq!(
            solve_classification(Some(false), Some(30), true),
            (false, true, false)
        );
        assert_eq!(
            solve_classification(Some(false), Some(-30), true),
            (false, false, true)
        );
        assert_eq!(
            solve_classification(None, Some(30), false),
            (false, false, true)
        );
    }
}
