use crate::chess::decision::choose_best_action_with_trace;
use crate::chess::eval::static_evaluate;
use crate::chess::fen::engine_from_fen;
use crate::chess::piece_kind::ChessPieceKind;
use crate::chess::puzzle::PuzzleCase;
use crate::chess::search::opponent;
use crate::chess::uci::action_to_uci;
use crate::engine::action::action::Action;
use crate::engine::action::command::Command;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::{PlayerId, Position};
use serde::Serialize;
use serde_json;
use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

struct ScopedEnvVar {
    key: &'static str,
    previous: Option<String>,
}

impl ScopedEnvVar {
    fn set(key: &'static str, value: &'static str) -> Self {
        let previous = std::env::var(key).ok();
        std::env::set_var(key, value);
        Self { key, previous }
    }
}

impl Drop for ScopedEnvVar {
    fn drop(&mut self) {
        if let Some(previous) = self.previous.as_ref() {
            std::env::set_var(self.key, previous);
        } else {
            std::env::remove_var(self.key);
        }
    }
}

#[derive(Clone, Debug, Serialize)]
struct PuzzleEvalCaseResult {
    pub case_id: String,
    pub theme: String,
    pub selected_move: String,
    pub best_moves: Vec<String>,
    pub selected_move_is_legal: bool,
    pub selected_move_theme_valid: bool,
    pub best_move_deltas: BTreeMap<String, i32>,
    pub best_move_theme_valid: BTreeMap<String, bool>,
    pub best_move_mates: BTreeMap<String, bool>,
    pub selected_move_mates: bool,
    pub best_move_fork_targets: BTreeMap<String, Vec<String>>,
    pub selected_move_fork_targets: Vec<String>,
    pub reason: Option<String>,
    pub solved: bool,
    pub partial: bool,
    pub failed: bool,
    pub used_search: bool,
    pub completed_depth: i32,
    pub score_before: i32,
    pub score_after: i32,
    pub delta: i32,
}

#[derive(Clone, Debug, Serialize)]
struct ThemeAggregate {
    pub theme: String,
    pub total: usize,
    pub solved: usize,
    pub partial: usize,
    pub failed: usize,
    pub solved_pct: f64,
    pub partial_pct: f64,
    pub failed_pct: f64,
}

#[derive(Clone, Debug, Serialize)]
struct PuzzleEvalReport {
    pub schema_version: u32,
    pub total: usize,
    pub solved: usize,
    pub partial: usize,
    pub failed: usize,
    pub solved_pct: f64,
    pub partial_pct: f64,
    pub failed_pct: f64,
    pub agent: String,
    pub by_theme: BTreeMap<String, ThemeAggregate>,
    pub cases: Vec<PuzzleEvalCaseResult>,
}

#[derive(Clone, Copy)]
enum EvalAgent {
    Search,
    Hybrid,
    Heuristic,
}

impl EvalAgent {
    fn parse(raw: &str) -> Option<Self> {
        match raw {
            "search" => Some(Self::Search),
            "hybrid" => Some(Self::Hybrid),
            "heuristic" => Some(Self::Heuristic),
            _ => None,
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Search => "search",
            Self::Hybrid => "hybrid",
            Self::Heuristic => "heuristic",
        }
    }

    fn decision_mode(self) -> &'static str {
        match self {
            Self::Search => "minimax",
            Self::Hybrid => "hybrid",
            Self::Heuristic => "heuristic",
        }
    }
}

pub fn run_puzzle_eval(args: &[String]) {
    let _quiet_reply_scan = ScopedEnvVar::set("TCS_REPLY_SCAN", "0");
    let _quiet_phase_profile = ScopedEnvVar::set("TCS_PHASE_REWARD", "0");
    let _quiet_conversion_diag = ScopedEnvVar::set("TCS_CONVERSION_CONTROLLER", "0");
    let _quiet_tactical_diag = ScopedEnvVar::set("TCS_TACTICAL_DIAG", "0");
    let _quiet_runtime_diag = ScopedEnvVar::set("TCS_SEARCH_RUNTIME_DIAG", "0");

    let mut input = None::<String>;
    let mut agent = "hybrid".to_string();
    let mut limit = None::<usize>;
    let mut debug_misses = false;
    let mut show_cases = None::<usize>;
    let mut output_path = None::<String>;

    let mut index = 2;
    while index < args.len() {
        match args[index].as_str() {
            "--input" => {
                if let Some(value) = args.get(index + 1) {
                    input = Some(value.clone());
                }
                index += 2;
            }
            "--agent" => {
                if let Some(value) = args.get(index + 1) {
                    agent = value.to_ascii_lowercase();
                }
                index += 2;
            }
            "--limit" => {
                if let Some(value) = args.get(index + 1) {
                    limit = value.parse::<usize>().ok();
                }
                index += 2;
            }
            "--debug-misses" => {
                debug_misses = true;
                index += 1;
            }
            "--show-cases" => {
                if let Some(value) = args.get(index + 1) {
                    show_cases = value.parse::<usize>().ok();
                }
                index += 2;
            }
            "--output" => {
                if let Some(value) = args.get(index + 1) {
                    output_path = Some(value.clone());
                }
                index += 2;
            }
            _ => {
                index += 1;
            }
        }
    }

    if matches!(agent.as_str(), "random" | "neural" | "teacher_uci") {
        println!(
            "PUZZLE_EVAL_STATUS=failed|reason=agent_not_allowed|agent={}",
            agent
        );
        return;
    }

    let Some(agent) = EvalAgent::parse(&agent) else {
        println!(
            "PUZZLE_EVAL_STATUS=failed|reason=unsupported_agent|agent={}",
            agent
        );
        return;
    };

    let Some(input_path) = input else {
        println!("PUZZLE_EVAL_STATUS=failed|reason=missing_input");
        return;
    };

    let cases = match load_cases(Path::new(&input_path)) {
        Ok(cases) => cases,
        Err(err) => {
            println!(
                "PUZZLE_EVAL_STATUS=failed|reason={}",
                err.replace('\n', " ")
            );
            return;
        }
    };

    let mut debug_count = 0usize;
    let results = evaluate_cases(
        &cases,
        agent,
        limit,
        debug_misses,
        show_cases,
        &mut debug_count,
    );

    let mut solved = 0usize;
    let mut partial = 0usize;
    let mut failed = 0usize;
    let mut by_theme: BTreeMap<String, (usize, usize, usize, usize)> = BTreeMap::new();

    for result in &results {
        if result.solved {
            solved += 1;
        }
        if result.partial {
            partial += 1;
        }
        if result.failed {
            failed += 1;
        }

        let theme = normalize_theme(&result.theme);
        let entry = by_theme.entry(theme.clone()).or_insert((0, 0, 0, 0));
        entry.0 += 1;
        if result.solved {
            entry.1 += 1;
        }
        if result.partial {
            entry.2 += 1;
        }
        if result.failed {
            entry.3 += 1;
        }
    }

    let total = results.len();
    let solved_pct = percentage(solved, total);
    let partial_pct = percentage(partial, total);
    let failed_pct = percentage(failed, total);

    let report_by_theme: BTreeMap<String, ThemeAggregate> = by_theme
        .into_iter()
        .map(|(theme, (total, solved, partial, failed))| {
            (
                theme.clone(),
                ThemeAggregate {
                    theme,
                    total,
                    solved,
                    partial,
                    failed,
                    solved_pct: percentage(solved, total),
                    partial_pct: percentage(partial, total),
                    failed_pct: percentage(failed, total),
                },
            )
        })
        .collect();

    let report = PuzzleEvalReport {
        schema_version: 2,
        total,
        solved,
        partial,
        failed,
        solved_pct,
        partial_pct,
        failed_pct,
        agent: agent.as_str().to_string(),
        by_theme: report_by_theme,
        cases: results,
    };

    let report_dir = Path::new("lab").join("reports");
    let report_json = report_dir.join("puzzle_eval_latest.json");
    let report_md = report_dir.join("puzzle_eval_latest.md");

    if fs::create_dir_all(&report_dir).is_err() {
        println!(
            "PUZZLE_EVAL_STATUS=failed|reason=report_dir_create_failed|path={}",
            report_dir.display()
        );
        return;
    }

    let rendered = match serde_json::to_string_pretty(&report) {
        Ok(rendered) => rendered,
        Err(err) => {
            println!(
                "PUZZLE_EVAL_STATUS=failed|reason=json_render_failed|{}",
                err
            );
            return;
        }
    };
    if fs::write(&report_json, rendered).is_err() {
        println!(
            "PUZZLE_EVAL_STATUS=failed|reason=json_write_failed|path={}",
            report_json.display()
        );
        return;
    }
    if fs::write(&report_md, render_markdown_report(&report)).is_err() {
        println!(
            "PUZZLE_EVAL_STATUS=failed|reason=markdown_write_failed|path={}",
            report_md.display()
        );
        return;
    }

    println!(
        "PUZZLE_EVAL_STATUS=ok|total={}|solved={}|partial={}|failed={}|solved_pct={:.2}",
        total, solved, partial, failed, solved_pct
    );

    if let Some(path) = output_path {
        #[derive(Serialize)]
        struct OutputReport {
            niveau: String,
            score: f64,
            puzzles_ok: usize,
            puzzles_fail: usize,
            timestamp: u64,
        }
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let out = OutputReport {
            niveau: agent.as_str().to_string(),
            score: solved_pct,
            puzzles_ok: solved,
            puzzles_fail: failed,
            timestamp,
        };
        match serde_json::to_string_pretty(&out) {
            Ok(json) => {
                if fs::write(&path, json).is_err() {
                    println!(
                        "PUZZLE_EVAL_STATUS=warn|reason=output_write_failed|path={}",
                        path
                    );
                }
            }
            Err(err) => {
                println!(
                    "PUZZLE_EVAL_STATUS=warn|reason=output_json_failed|{}",
                    err
                );
            }
        }
    }
}

fn evaluate_cases(
    cases: &[PuzzleCase],
    agent: EvalAgent,
    limit: Option<usize>,
    debug_misses: bool,
    show_cases: Option<usize>,
    debug_count: &mut usize,
) -> Vec<PuzzleEvalCaseResult> {
    let mut results = Vec::new();
    let mut misses_printed = 0usize;
    let max_cases = limit.unwrap_or(usize::MAX);
    let show_cases = show_cases.unwrap_or(usize::MAX);

    for case in cases.iter().take(max_cases) {
        let result = evaluate_case(case, agent);
        if !result.solved && debug_misses && misses_printed < show_cases {
            println!("{}", render_debug_miss_line(&result));
            misses_printed += 1;
            *debug_count += 1;
        }
        results.push(result);
    }

    results
}

fn load_cases(path: &Path) -> Result<Vec<PuzzleCase>, String> {
    let content = fs::read_to_string(path).map_err(|err| format!("read_failed: {err}"))?;
    let mut out = Vec::new();
    for (line_index, raw) in content.lines().enumerate() {
        let mut line = raw.trim();
        if line_index == 0 {
            line = line.trim_start_matches('\u{feff}');
        }
        if line.is_empty() {
            continue;
        }
        let case = serde_json::from_str(line)
            .map_err(|err| format!("parse_error_line_{}: {}", line_index + 1, err))?;
        out.push(case);
    }
    Ok(out)
}

fn evaluate_case(case: &PuzzleCase, agent: EvalAgent) -> PuzzleEvalCaseResult {
    let mut engine = match engine_from_fen(&case.fen) {
        Ok(engine) => engine,
        Err(_) => {
            return PuzzleEvalCaseResult {
                case_id: case.case_id.clone(),
                theme: normalize_theme(&case.theme),
                selected_move: "-".to_string(),
                best_moves: case.best_moves.clone(),
                selected_move_is_legal: false,
                selected_move_theme_valid: false,
                best_move_deltas: BTreeMap::new(),
                best_move_theme_valid: BTreeMap::new(),
                best_move_mates: BTreeMap::new(),
                selected_move_mates: false,
                best_move_fork_targets: BTreeMap::new(),
                selected_move_fork_targets: Vec::new(),
                reason: Some("best_moves_invalid_after_reload".to_string()),
                solved: false,
                partial: false,
                failed: true,
                used_search: false,
                completed_depth: 0,
                score_before: 0,
                score_after: 0,
                delta: 0,
            };
        }
    };

    let side_to_move: PlayerId = match case.side_to_move {
        1 | 2 => case.side_to_move,
        _ => {
            return PuzzleEvalCaseResult {
                case_id: case.case_id.clone(),
                theme: normalize_theme(&case.theme),
                selected_move: "-".to_string(),
                best_moves: case.best_moves.clone(),
                selected_move_is_legal: false,
                selected_move_theme_valid: false,
                best_move_deltas: BTreeMap::new(),
                best_move_theme_valid: BTreeMap::new(),
                best_move_mates: BTreeMap::new(),
                selected_move_mates: false,
                best_move_fork_targets: BTreeMap::new(),
                selected_move_fork_targets: Vec::new(),
                reason: Some("agent_no_move".to_string()),
                solved: false,
                partial: false,
                failed: true,
                used_search: false,
                completed_depth: 0,
                score_before: 0,
                score_after: 0,
                delta: 0,
            }
        }
    };

    engine.turn_manager.current_player = side_to_move;
    let score_before = static_evaluate(&engine, side_to_move);
    let normalized_theme = normalize_theme(&case.theme);

    let mut selected_move = "-".to_string();
    let mut used_search = false;
    let mut completed_depth = 0i32;
    let mut selected_action = None;

    if let Some(trace) = choose_best_action_with_trace(&engine, side_to_move, agent.decision_mode())
    {
        used_search = trace.used_search;
        completed_depth = trace
            .root_search
            .as_ref()
            .map_or(0, |root| root.completed_depth);
        if let Some(uci) = action_to_uci(&trace.selected_action, &engine.units) {
            if let Some(action) = resolve_legal_action(&engine, side_to_move, &uci) {
                selected_move = uci;
                selected_action = Some(action);
            }
        }
    }

    let score_after = if let Some(action) = selected_action.as_ref() {
        let mut engine_after = engine.clone();
        engine_after.execute(Command {
            player_id: side_to_move,
            action: action.clone(),
        });
        static_evaluate(&engine_after, side_to_move)
    } else {
        score_before
    };
    let delta = score_after - score_before;

    let selected_move_analysis = selected_action
        .as_ref()
        .map(|action| {
            analyze_action(
                &engine,
                side_to_move,
                action,
                &selected_move,
                normalized_theme.as_str(),
                &case.validation,
                score_before,
            )
        })
        .unwrap_or_default();

    let selected_move_is_legal = selected_action.is_some();
    let selected_move_theme_valid = selected_move_analysis.theme_valid;
    let selected_move_mates = selected_move_analysis.is_mate;
    let selected_move_fork_targets = selected_move_analysis.fork_targets;

    let mut best_move_deltas = BTreeMap::new();
    let mut best_move_theme_valid = BTreeMap::new();
    let mut best_move_mates = BTreeMap::new();
    let mut best_move_fork_targets = BTreeMap::new();

    for best_move in &case.best_moves {
        let analysis = resolve_legal_action(&engine, side_to_move, best_move).map_or_else(
            || (0, false, false, Vec::<String>::new()),
            |action| {
                let analysis = analyze_action(
                    &engine,
                    side_to_move,
                    &action,
                    best_move,
                    normalized_theme.as_str(),
                    &case.validation,
                    score_before,
                );
                (
                    analysis.delta,
                    analysis.theme_valid,
                    analysis.is_mate,
                    analysis.fork_targets,
                )
            },
        );

        best_move_deltas.insert(best_move.clone(), analysis.0);
        best_move_theme_valid.insert(best_move.clone(), analysis.1);
        if normalized_theme == "mate1" {
            best_move_mates.insert(best_move.clone(), analysis.2);
        }
        if normalized_theme == "fork" {
            best_move_fork_targets.insert(best_move.clone(), analysis.3);
        }
    }

    let best_delta = best_move_deltas.values().copied().max().unwrap_or(0);
    let solved = is_solution_accepted(
        &selected_move,
        &case.best_moves,
        selected_move_theme_valid,
        delta,
        best_delta,
    );
    let partial = !solved && (selected_move_theme_valid || delta > 0);
    let failed = !solved && !partial;
    let reason = classify_reason(
        solved,
        selected_move_is_legal,
        &selected_move,
        &case.best_moves,
        selected_move_theme_valid,
        &best_move_theme_valid,
        partial,
    );

    PuzzleEvalCaseResult {
        case_id: case.case_id.clone(),
        theme: normalized_theme,
        selected_move,
        best_moves: case.best_moves.clone(),
        selected_move_is_legal,
        selected_move_theme_valid,
        best_move_deltas,
        best_move_theme_valid,
        best_move_mates,
        selected_move_mates,
        best_move_fork_targets,
        selected_move_fork_targets,
        reason,
        solved,
        partial,
        failed,
        used_search,
        completed_depth,
        score_before,
        score_after,
        delta,
    }
}

fn is_solution_accepted(
    selected_move: &str,
    best_moves: &[String],
    selected_move_theme_valid: bool,
    delta: i32,
    best_delta: i32,
) -> bool {
    best_moves.iter().any(|best| best == selected_move)
        || (!best_moves.is_empty() && selected_move_theme_valid && delta >= best_delta)
}

#[derive(Clone, Debug, Default)]
struct MoveAnalysis {
    delta: i32,
    theme_valid: bool,
    is_mate: bool,
    fork_targets: Vec<String>,
}

fn analyze_action(
    engine: &Engine,
    side_to_move: PlayerId,
    action: &Action,
    action_uci: &str,
    theme: &str,
    validation: &crate::chess::puzzle::PuzzleValidation,
    score_before: i32,
) -> MoveAnalysis {
    let mut next = engine.clone();
    next.execute(Command {
        player_id: side_to_move,
        action: action.clone(),
    });
    let score_after = static_evaluate(&next, side_to_move);
    let delta = score_after - score_before;

    if theme == "mate1" {
        let is_mate = is_mate_after_move(engine, side_to_move, action);
        return MoveAnalysis {
            delta,
            theme_valid: is_mate,
            is_mate: action_to_uci(action, &engine.units)
                .as_deref()
                .map_or(false, |uci| uci == action_uci)
                && is_mate,
            fork_targets: Vec::new(),
        };
    }

    if theme == "fork" {
        let fork_targets = fork_targets_for_action(engine, side_to_move, action);
        let required_targets = normalize_fork_targets(&validation.fork_targets);
        let attacked_set: HashSet<String> = fork_targets.iter().cloned().collect();
        let has_required_targets = required_targets
            .as_ref()
            .is_some_and(|targets| targets.iter().all(|t| attacked_set.contains(t)));
        let has_king_or_queen = attacked_set.contains("king") || attacked_set.contains("queen");
        let has_at_least_two = fork_targets.len() >= 2;
        let theme_valid = has_required_targets && has_king_or_queen && has_at_least_two;
        return MoveAnalysis {
            delta,
            theme_valid,
            is_mate: false,
            fork_targets,
        };
    }

    MoveAnalysis {
        delta,
        theme_valid: false,
        is_mate: false,
        fork_targets: Vec::new(),
    }
}

fn classify_reason(
    solved: bool,
    selected_move_is_legal: bool,
    selected_move: &str,
    best_moves: &[String],
    selected_move_theme_valid: bool,
    best_move_theme_valid: &BTreeMap<String, bool>,
    partial: bool,
) -> Option<String> {
    if solved {
        return None;
    }
    if !selected_move_is_legal || selected_move == "-" {
        return Some("agent_no_move".to_string());
    }
    if best_moves.is_empty() {
        return Some("best_moves_invalid_after_reload".to_string());
    }

    let has_valid_best_move = best_moves
        .iter()
        .any(|best| best_move_theme_valid.get(best).copied().unwrap_or(false));
    if !has_valid_best_move {
        return Some("best_moves_invalid_after_reload".to_string());
    }

    let selected_in_best = best_moves.iter().any(|best| best == selected_move);
    if !selected_in_best {
        if selected_move_theme_valid {
            return Some("selected_not_in_best_moves".to_string());
        }
        return Some("selected_not_theme_valid".to_string());
    }

    if !selected_move_theme_valid {
        return Some("selected_not_theme_valid".to_string());
    }
    if partial {
        return Some("selected_partial_only".to_string());
    }

    None
}

fn render_debug_miss_line(result: &PuzzleEvalCaseResult) -> String {
    let best = if result.best_moves.is_empty() {
        "-".to_string()
    } else {
        result.best_moves.join(",")
    };
    let best_delta = result.best_move_deltas.values().copied().max().unwrap_or(0);

    format!(
        "PUZZLE_MISS|case={}|theme={}|selected={}|best={}|delta={}|best_delta={}|selected_theme_valid={}|reason={}",
        result.case_id,
        result.theme,
        result.selected_move,
        best,
        result.delta,
        best_delta,
        result.selected_move_theme_valid,
        result.reason.clone().unwrap_or_else(|| "unknown".to_string())
    )
}

fn percentage(part: usize, total: usize) -> f64 {
    if total == 0 {
        0.0
    } else {
        part as f64 * 100.0 / total as f64
    }
}

fn resolve_legal_action(engine: &Engine, player: PlayerId, uci: &str) -> Option<Action> {
    engine
        .legal_actions(player)
        .into_iter()
        .find(|action| action_to_uci(action, &engine.units).as_deref() == Some(uci))
}

fn is_mate_after_move(engine: &Engine, player: PlayerId, action: &Action) -> bool {
    let mut next = engine.clone();
    next.execute(Command {
        player_id: player,
        action: action.clone(),
    });
    next.is_checkmate(opponent(player))
}

fn normalize_fork_targets(raw: &[String]) -> Option<HashSet<String>> {
    let filtered: Vec<String> = raw
        .iter()
        .map(|target| target.to_lowercase())
        .filter(|target| is_high_value_target_name(target))
        .collect();
    if filtered.is_empty() {
        None
    } else {
        Some(filtered.into_iter().collect())
    }
}

fn is_high_value_target_name(target: &str) -> bool {
    matches!(target, "king" | "queen" | "rook" | "bishop" | "knight")
}

fn fork_targets_for_action(
    engine: &Engine,
    side_to_move: PlayerId,
    action: &Action,
) -> Vec<String> {
    let Action::Move { unit_id, .. } = action else {
        return Vec::new();
    };

    let mut next = engine.clone();
    next.execute(Command {
        player_id: side_to_move,
        action: action.clone(),
    });

    let Some(mover) = next.units.get(unit_id) else {
        return Vec::new();
    };
    let mut targets = fork_attack_targets(&next, side_to_move, mover.position, mover.kind)
        .into_iter()
        .collect::<Vec<String>>();
    targets.sort();
    targets
}

fn fork_attack_targets(
    engine: &Engine,
    side_to_move: PlayerId,
    from: Position,
    mover_kind: ChessPieceKind,
) -> HashSet<String> {
    let mut attacked = HashSet::new();
    for unit in engine.units.values() {
        if unit.owner == side_to_move {
            continue;
        }
        if !matches!(
            unit.kind,
            ChessPieceKind::King
                | ChessPieceKind::Queen
                | ChessPieceKind::Rook
                | ChessPieceKind::Bishop
                | ChessPieceKind::Knight
        ) {
            continue;
        }

        if movement_attacks(mover_kind, side_to_move, from, unit.position, |pos| {
            engine.board.occupant(pos).is_some()
        }) {
            let name = match unit.kind {
                ChessPieceKind::King => "king",
                ChessPieceKind::Queen => "queen",
                ChessPieceKind::Rook => "rook",
                ChessPieceKind::Bishop => "bishop",
                ChessPieceKind::Knight => "knight",
                _ => "pawn",
            };
            attacked.insert(name.to_string());
        }
    }
    attacked
}

fn movement_attacks(
    attacker: ChessPieceKind,
    owner: PlayerId,
    from: Position,
    to: Position,
    occupancy: impl Fn(Position) -> bool,
) -> bool {
    if from == to {
        return false;
    }

    let dx = to.x as i32 - from.x as i32;
    let dy = to.y as i32 - from.y as i32;
    let adx = dx.abs();
    let ady = dy.abs();

    let path_clear = |from: Position, to: Position| {
        let step_x = (to.x as i32 - from.x as i32).signum();
        let step_y = (to.y as i32 - from.y as i32).signum();
        let mut x = from.x as i32 + step_x;
        let mut y = from.y as i32 + step_y;

        while x != to.x as i32 || y != to.y as i32 {
            if occupancy(Position {
                x: x as u32,
                y: y as u32,
            }) {
                return false;
            }
            x += step_x;
            y += step_y;
        }
        true
    };

    match attacker {
        ChessPieceKind::Pawn => {
            let direction = if owner == 1 { 1 } else { -1 };
            dy == direction && adx == 1
        }
        ChessPieceKind::Knight => (adx == 1 && ady == 2) || (adx == 2 && ady == 1),
        ChessPieceKind::Bishop => adx == ady && path_clear(from, to),
        ChessPieceKind::Rook => (dx == 0 || dy == 0) && path_clear(from, to),
        ChessPieceKind::Queen => ((dx == 0 || dy == 0) || adx == ady) && path_clear(from, to),
        ChessPieceKind::King => adx <= 1 && ady <= 1,
    }
}

fn normalize_theme(theme: &str) -> String {
    match theme {
        "mate_in_1" | "mate1" => "mate1".to_string(),
        "fork" => "fork".to_string(),
        other => other.to_string(),
    }
}

fn render_markdown_report(report: &PuzzleEvalReport) -> String {
    let mut out = String::new();
    out.push_str("# Puzzle Eval\n\n");
    out.push_str(&format!(
        "- schema_version: {}\n- agent: {}\n- total: {}\n- solved: {} ({:.2}%)\n- partial: {} ({:.2}%)\n- failed: {} ({:.2}%)\n\n",
        report.schema_version,
        report.agent,
        report.total,
        report.solved,
        report.solved_pct,
        report.partial,
        report.partial_pct,
        report.failed,
        report.failed_pct
    ));

    out.push_str("## By Theme\n\n");
    out.push_str(
        "| theme | total | solved | partial | failed | solved_pct | partial_pct | failed_pct |\n",
    );
    out.push_str("|---|---:|---:|---:|---:|---:|---:|---:|\n");
    for aggregate in report.by_theme.values() {
        out.push_str(&format!(
            "| {} | {} | {} | {} | {} | {:.2} | {:.2} | {:.2} |\n",
            aggregate.theme,
            aggregate.total,
            aggregate.solved,
            aggregate.partial,
            aggregate.failed,
            aggregate.solved_pct,
            aggregate.partial_pct,
            aggregate.failed_pct
        ));
    }

    out.push_str("\n## Cases\n\n");
    out.push_str(
        "| case_id | theme | selected_move | best_moves | solved | partial | failed | reason | used_search | completed_depth | score_before | score_after | delta |\\n|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\\n",
    );
    for case in &report.cases {
        let best_moves = if case.best_moves.is_empty() {
            "-".to_string()
        } else {
            case.best_moves.join(",")
        };
        out.push_str(&format!(
            "| {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} |\n",
            case.case_id,
            case.theme,
            case.selected_move,
            best_moves,
            u8::from(case.solved),
            u8::from(case.partial),
            u8::from(case.failed),
            case.reason.clone().unwrap_or_default(),
            u8::from(case.used_search),
            case.completed_depth,
            case.score_before,
            case.score_after,
            case.delta
        ));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use std::sync::{Mutex, OnceLock};

    fn env_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    fn quiet_eval<T>(f: impl FnOnce() -> T) -> T {
        let _guard = env_lock().lock().expect("env lock");
        let _reply_scan = ScopedEnvVar::set("TCS_REPLY_SCAN", "0");
        let _phase_reward = ScopedEnvVar::set("TCS_PHASE_REWARD", "0");
        let _conversion_diag = ScopedEnvVar::set("TCS_CONVERSION_CONTROLLER", "0");
        let _tactical_diag = ScopedEnvVar::set("TCS_TACTICAL_DIAG", "0");
        let _runtime_diag = ScopedEnvVar::set("TCS_SEARCH_RUNTIME_DIAG", "0");
        f()
    }

    fn temp_jsonl_path(name: &str) -> std::path::PathBuf {
        let mut path = env::temp_dir();
        path.push(name);
        path
    }

    fn write_jsonl(path: &Path, cases: &[PuzzleCase]) {
        let mut out = String::new();
        for case in cases {
            out.push_str(&serde_json::to_string(case).expect("serialize"));
            out.push('\n');
        }
        fs::write(path, out).expect("write file");
    }

    fn sample_mate_case() -> PuzzleCase {
        PuzzleCase {
            case_id: "case_mate1_1".to_string(),
            fen: "7k/8/5QK1/8/8/8/8/8 w - - 0 1".to_string(),
            side_to_move: 1,
            theme: "mate_in_1".to_string(),
            best_moves: vec!["f6g7".to_string()],
            seed: 42,
            difficulty: 1,
            validation: crate::chess::puzzle::PuzzleValidation {
                mate: true,
                fork_targets: Vec::new(),
                material_gain_hint: 900,
            },
        }
    }

    #[test]
    fn puzzle_eval_loads_jsonl_cases() {
        let path = temp_jsonl_path("puzzle_eval_load_cases.jsonl");
        write_jsonl(&path, &[sample_mate_case()]);
        let cases = load_cases(&path).expect("loaded");
        assert_eq!(cases.len(), 1);
        assert_eq!(cases[0].case_id, "case_mate1_1");
    }

    #[test]
    fn puzzle_eval_marks_best_move_solved() {
        quiet_eval(|| {
            let mut case = sample_mate_case();
            let initial = evaluate_case(&case, EvalAgent::Search);
            case.best_moves = vec![initial.selected_move.clone()];

            let result = evaluate_case(&case, EvalAgent::Search);
            assert!(result.solved);
            assert!(!result.partial);
            assert!(!result.failed);
        });
    }

    #[test]
    fn puzzle_eval_marks_wrong_move_failed() {
        let mut case = sample_mate_case();
        case.side_to_move = 0;
        let result = evaluate_case(&case, EvalAgent::Search);
        assert!(result.failed);
        assert!(!result.solved);
        assert!(!result.partial);
    }

    #[test]
    fn puzzle_eval_theme_breakdown_counts() {
        quiet_eval(|| {
            let mut map: BTreeMap<String, (usize, usize, usize, usize)> = BTreeMap::new();
            let mut case = sample_mate_case();
            let seeded = evaluate_case(&case, EvalAgent::Hybrid);
            case.best_moves = vec![seeded.selected_move];

            let result = evaluate_case(&case, EvalAgent::Hybrid);
            let entry = map
                .entry(normalize_theme(&case.theme))
                .or_insert((0, 0, 0, 0));
            entry.0 += 1;
            if result.solved {
                entry.1 += 1;
            }
            if result.partial {
                entry.2 += 1;
            }
            if result.failed {
                entry.3 += 1;
            }

            assert_eq!(*entry, (1, 1, 0, 0));
        });
    }

    #[test]
    fn debug_miss_reports_selected_not_in_best_moves() {
        let best_moves = vec!["a2a4".to_string(), "b2b4".to_string()];
        let mut best_map = BTreeMap::new();
        best_map.insert(best_moves[0].clone(), true);
        best_map.insert(best_moves[1].clone(), true);

        let reason = classify_reason(false, true, "c2c4", &best_moves, true, &best_map, false);
        assert_eq!(reason.as_deref(), Some("selected_not_in_best_moves"));
    }

    #[test]
    fn debug_detects_selected_mate_false() {
        let case = sample_mate_case();
        let engine = engine_from_fen(&case.fen).expect("valid fen");
        let score_before = static_evaluate(&engine, case.side_to_move);

        let mut non_mate_found = None;
        for action in engine.legal_actions(case.side_to_move) {
            let Some(uci) = action_to_uci(&action, &engine.units) else {
                continue;
            };
            if uci == "f6g7" {
                continue;
            }

            let analysis = analyze_action(
                &engine,
                case.side_to_move,
                &action,
                &uci,
                "mate1",
                &case.validation,
                score_before,
            );
            if !analysis.is_mate {
                non_mate_found = Some(analysis);
                break;
            }
        }

        let non_mate = non_mate_found.expect("non-mate legal move");
        assert!(!non_mate.is_mate);
        assert!(!non_mate.theme_valid);
    }

    #[test]
    fn debug_best_move_delta_present() {
        let mut case = sample_mate_case();
        let result = evaluate_case(&case, EvalAgent::Search);
        let best_move = case.best_moves.remove(0);
        assert!(result.best_move_deltas.contains_key(&best_move));
        assert_eq!(
            result.best_move_deltas[&best_move],
            result.delta.max(result.best_move_deltas[&best_move])
        );
    }

    #[test]
    fn test_accept_better_solution_than_best_move() {
        let best_moves = vec!["a2a4".to_string()];
        let solved = is_solution_accepted("b2b4", &best_moves, true, 120, 100);

        assert!(solved);
    }

    #[test]
    fn limit_argument_limits_cases() {
        let first = sample_mate_case();
        let mut second = sample_mate_case();
        second.case_id = "case_mate1_2".to_string();

        let mut shown = 0usize;
        let results = evaluate_cases(
            &[first, second],
            EvalAgent::Search,
            Some(1),
            false,
            None,
            &mut shown,
        );
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn render_debug_miss_line_has_required_fields() {
        let case = PuzzleEvalCaseResult {
            case_id: "case".to_string(),
            theme: "mate1".to_string(),
            selected_move: "a2a3".to_string(),
            best_moves: vec!["b2b3".to_string()],
            selected_move_is_legal: true,
            selected_move_theme_valid: false,
            best_move_deltas: BTreeMap::from([("b2b3".to_string(), 5)]),
            best_move_theme_valid: BTreeMap::from([("b2b3".to_string(), true)]),
            best_move_mates: BTreeMap::from([("b2b3".to_string(), false)]),
            selected_move_mates: false,
            best_move_fork_targets: BTreeMap::new(),
            selected_move_fork_targets: Vec::new(),
            reason: Some("selected_not_in_best_moves".to_string()),
            solved: false,
            partial: true,
            failed: false,
            used_search: false,
            completed_depth: 0,
            score_before: 0,
            score_after: 0,
            delta: 2,
        };

        let line = render_debug_miss_line(&case);
        assert!(line.starts_with(
            "PUZZLE_MISS|case=case|theme=mate1|selected=a2a3|best=b2b3|delta=2|best_delta=5"
        ));
        assert!(line.contains("reason=selected_not_in_best_moves"));
        assert!(line.contains("selected_theme_valid=false"));
    }
}
