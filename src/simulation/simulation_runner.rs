use std::collections::HashMap;
use std::fs::{create_dir_all, File, OpenOptions};
use std::io::{BufWriter, Write};
use std::path::Path;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::Instant;

use crate::agents::neural_agent::NeuralAgent;
use crate::agents::uci_agent::UciAgent;
use crate::chess::cost_search_observability::{
    CostSearchDetailWriteStatus, CostSearchMoveDetailReport, CostSearchReportWriter,
    CostSearchRouteError,
};
use crate::chess::decision::{choose_best_action_with_trace_and_context, DecisionTrace};
use crate::chess::piece_kind::ChessPieceKind;
use crate::chess::practical_policy::{
    is_conversion_move, reply_scan_breakdown, tactical_score_breakdown,
};
use crate::chess::root_decision::{should_trace_full_ply, RootDecisionContext};
use crate::chess::search::search_root;
use crate::chess::uci::action_to_uci;
use crate::engine::action::action::Action;
use crate::engine::action::command::Command;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::PlayerId;
use crate::prototype::minimal_ruleset::{load_engine_from_ruleset, minimal_runtime_ruleset};
use crate::prototype::runtime_ruleset::RuntimeRuleset;
use crate::tool::experiment_paths::{append_tournament_runtime_line, tournament_dir};
use serde::Serialize;
use serde_json::json;

static NEXT_GAME_ID: AtomicU64 = AtomicU64::new(1);
static MOVES_FILE_INITIALIZED: AtomicBool = AtomicBool::new(false);
static MATCH_CONVERSION_CSV_INITIALIZED: AtomicBool = AtomicBool::new(false);
static WEAKNESS_KEYS: OnceLock<Mutex<std::collections::HashSet<String>>> = OnceLock::new();

const DEFAULT_MAX_STEPS: u32 = 120;
const STAGNATION_MIN_STEP: u32 = 20;
const SOFT_NO_CAPTURE_LIMIT: u32 = 35;
const HARD_NO_CAPTURE_LIMIT: u32 = 70;
const SOFT_NO_PROGRESS_LIMIT: u32 = 16;
/// Pawn-equivalent material; aligns with stagnation using `material_diff.abs() <= 1` as "roughly equal".
const CLEAR_WINNING_MATERIAL_EDGE: i32 = 3;
const WEAKNESS_LOG_PATH: &str = "lab/reverse_dataset/weakness_log.jsonl";
const MAX_WEAKNESSES_PER_MOVE: usize = 2;
const MATERIAL_DROP_THRESHOLD_CP: i32 = 100;
const CP_DROP_LOG_THRESHOLD: i32 = -80;
const HANGING_PIECE_THRESHOLD_CP: i32 = 220;
const BAD_TRADE_THRESHOLD_CP: i32 = -140;
const MATE_SCORE_THRESHOLD: i32 = 899_000;
const WIN_TRACE_MATERIAL_ADVANTAGE_CP: i32 = 600;
const WIN_TRACE_NO_CAPTURE_LIMIT: u32 = 8;
const WIN_TRACE_NO_PRESSURE_LIMIT: u32 = 1;
const COST_SEARCH_OUTPUT_DIR_ENV: &str = "TCS_COST_SEARCH_OUTPUT_DIR";

fn emit_runtime_line(line: &str) {
    println!("{}", line);
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum CostSearchSimulationObservation {
    Disabled,
    NoRootSearchDiagnostics,
    Written,
    SummaryOnly,
    WriteFailed,
}

fn cost_search_writer_from_output_dir(
    output_dir: Option<&Path>,
) -> Result<Option<CostSearchReportWriter>, CostSearchRouteError> {
    let Some(output_dir) = output_dir else {
        return Ok(None);
    };

    if output_dir.as_os_str().is_empty() {
        return Ok(None);
    }

    CostSearchReportWriter::new(output_dir).map(Some)
}

fn cost_search_writer_from_env() -> Option<CostSearchReportWriter> {
    let Some(output_dir) = std::env::var_os(COST_SEARCH_OUTPUT_DIR_ENV) else {
        return None;
    };
    if output_dir.is_empty() {
        return None;
    }

    match cost_search_writer_from_output_dir(Some(Path::new(&output_dir))) {
        Ok(writer) => writer,
        Err(err) => {
            emit_runtime_line(&format!(
                "COST_SEARCH_OBSERVABILITY_DISABLED|reason=unsafe_output_dir|error={}",
                err
            ));
            None
        }
    }
}

fn observe_cost_search_decision(
    writer: Option<&CostSearchReportWriter>,
    game_id: u64,
    ply: u32,
    side: PlayerId,
    selected_move: &str,
    decision_source: &str,
    elapsed_ms: f64,
    trace: Option<&DecisionTrace>,
) -> CostSearchSimulationObservation {
    let Some(writer) = writer else {
        return CostSearchSimulationObservation::Disabled;
    };
    let Some(root_search) = trace.and_then(|trace| trace.root_search.as_ref()) else {
        return CostSearchSimulationObservation::NoRootSearchDiagnostics;
    };

    let report = CostSearchMoveDetailReport::from_root_diagnostics(
        game_id,
        ply,
        player_to_side(side),
        selected_move,
        decision_source,
        elapsed_ms,
        0.0,
        None,
        "root_search_diagnostics_only",
        &root_search.diagnostics,
    );

    match writer.write_detail(&report) {
        Ok(CostSearchDetailWriteStatus::Written) => CostSearchSimulationObservation::Written,
        Ok(CostSearchDetailWriteStatus::SummaryOnly) => {
            CostSearchSimulationObservation::SummaryOnly
        }
        Err(err) => {
            emit_runtime_line(&format!(
                "COST_SEARCH_OBSERVABILITY_WRITE_FAILED|game_id={}|ply={}|error={}",
                game_id, ply, err
            ));
            CostSearchSimulationObservation::WriteFailed
        }
    }
}

#[derive(Default)]
struct GameAnalysisSummary {
    repetition_risk_count: u32,
    conversion_moves_seen: u32,
}

fn game_analysis_trace_enabled() -> bool {
    std::env::var("TCS_GAME_ANALYSIS_TRACE").ok().as_deref() == Some("1")
}

fn game_analysis_full_enabled() -> bool {
    std::env::var("TCS_GAME_ANALYSIS_FULL").ok().as_deref() == Some("1")
}

fn player_to_side(player: PlayerId) -> &'static str {
    if player == 1 {
        "white"
    } else {
        "black"
    }
}

fn emit_game_analysis_row(prefix: &str, payload: serde_json::Value) {
    if let Ok(line) = serde_json::to_string(&payload) {
        let line = format!("{}|{}", prefix, line);
        emit_runtime_line(&line);
        append_tournament_runtime_line(&line);
    }
}

#[derive(Clone, Debug)]
struct WeaknessCandidate {
    error_type: &'static str,
    cp_drop: i32,
    priority: i32,
}

#[derive(Serialize)]
struct WeaknessLogEntry {
    fen: String,
    move_played: String,
    best_move: String,
    error_type: String,
    cp_drop: i32,
    phase: String,
    material_signature: String,
    reply_scan_penalty: i32,
    tactical_penalty: i32,
    has_reply_scan_evidence: bool,
    has_tactical_evidence: bool,
}

#[derive(Clone, Debug, Default)]
struct WinFinishTrace {
    active: bool,
    winning_player: PlayerId,
    start_ply: u32,
    no_capture_streak: u32,
    captures: u32,
    checks: u32,
    promotions: u32,
    last_enemy_moves: Option<usize>,
    no_pressure_streak: u32,
    no_capture_alerted: bool,
    repetition_alerted: bool,
    no_pressure_alerted: bool,
}

#[derive(Clone, Debug)]
pub enum MatchTermination {
    Winner,
    Draw,
    ForcedDrawStagnation,
    TurnLimit,
}

#[derive(Clone, Debug)]
pub struct MatchSummary {
    pub winner: Option<u32>,
    pub turns: u32,
    pub actions: usize,
    pub termination: MatchTermination,
    pub termination_ply: u32,
    pub progress_counter: u32,
    pub last_capture_ply: u32,
    pub last_pawn_move_ply: u32,
    pub winner_reason: String,
    pub purity_violations: u64,
    pub draw_cause: Option<String>,
    pub stagnation_cause: Option<String>,
    pub max_repetition_count: u32,
    pub no_progress_pattern: bool,
    /// Largest absolute material imbalance (pawn units) after any ply (including start).
    pub max_abs_material_diff: i32,
    /// Peak white material lead (max `material_score_from_fen` over the game).
    pub max_white_material_lead: i32,
    /// Peak black material lead (max −score over the game).
    pub max_black_material_lead: i32,
    pub had_clear_winning_material_edge: bool,
    pub clear_edge_converted_win: bool,
    pub clear_edge_lost_before_end: bool,
}

impl Default for MatchSummary {
    fn default() -> Self {
        Self {
            winner: None,
            turns: 0,
            actions: 0,
            termination: MatchTermination::Draw,
            termination_ply: 0,
            progress_counter: 0,
            last_capture_ply: 0,
            last_pawn_move_ply: 0,
            winner_reason: String::new(),
            purity_violations: 0,
            draw_cause: None,
            stagnation_cause: None,
            max_repetition_count: 0,
            no_progress_pattern: false,
            max_abs_material_diff: 0,
            max_white_material_lead: 0,
            max_black_material_lead: 0,
            had_clear_winning_material_edge: false,
            clear_edge_converted_win: false,
            clear_edge_lost_before_end: false,
        }
    }
}

#[derive(Clone, Debug)]
pub struct TelemetryMatchSummary {
    pub config_id: String,
    pub match_index: u32,
    pub agent_white: String,
    pub agent_black: String,
    pub winner: Option<u32>,
    pub true_draw_flag: bool,
    pub forced_draw_stagnation_flag: bool,
    pub turn_limit_flag: bool,
    pub turns: u32,
    pub actions: usize,
    pub termination: MatchTermination,
    pub outcome_reason: String,
    pub purity_violations: u64,
    pub draw_cause: Option<String>,
    pub stagnation_cause: Option<String>,
    pub max_repetition_count: u32,
    pub no_progress_pattern: bool,
    pub max_abs_material_diff: i32,
    pub max_white_material_lead: i32,
    pub max_black_material_lead: i32,
    pub had_clear_winning_material_edge: bool,
    pub clear_edge_converted_win: bool,
    pub clear_edge_lost_before_end: bool,
}

pub struct SimulationRunner {
    pub ruleset: RuntimeRuleset,
    pub max_steps: u32,
    pub verbose: bool,
    pub emit_csv: bool,
}

#[derive(Clone, Debug, Default)]
pub struct MatchFirstMoves {
    pub white: Option<String>,
    pub black: Option<String>,
}

fn detect_phase(ply: u32) -> &'static str {
    if ply < 15 {
        "opening"
    } else if ply < 50 {
        "midgame"
    } else {
        "endgame"
    }
}

fn is_promotion(move_str: &str) -> bool {
    move_str.len() == 5
}

fn board_part_from_fen(fen: &str) -> &str {
    fen.split_whitespace().next().unwrap_or("")
}

fn total_material_abs_from_fen(fen: &str) -> i32 {
    let mut total = 0;

    for c in board_part_from_fen(fen).chars() {
        total += match c {
            'P' | 'p' => 1,
            'N' | 'n' => 3,
            'B' | 'b' => 3,
            'R' | 'r' => 5,
            'Q' | 'q' => 9,
            _ => 0,
        };
    }

    total
}

fn infer_capture_from_position_delta(fen_before: &str, fen_after: &str) -> i32 {
    let before_total = total_material_abs_from_fen(fen_before);
    let after_total = total_material_abs_from_fen(fen_after);

    if after_total < before_total {
        1
    } else {
        0
    }
}

fn material_score_from_fen(fen: &str) -> i32 {
    let mut score = 0;

    for c in board_part_from_fen(fen).chars() {
        score += match c {
            'P' => 1,
            'N' => 3,
            'B' => 3,
            'R' => 5,
            'Q' => 9,
            'p' => -1,
            'n' => -3,
            'b' => -3,
            'r' => -5,
            'q' => -9,
            _ => 0,
        };
    }

    score
}

fn canonical_position_key(fen: &str) -> String {
    let parts: Vec<&str> = fen.split_whitespace().take(4).collect();
    parts.join(" ")
}

fn weakness_key_cache() -> &'static Mutex<std::collections::HashSet<String>> {
    WEAKNESS_KEYS.get_or_init(|| Mutex::new(std::collections::HashSet::new()))
}

fn append_weakness_entry(entry: &WeaknessLogEntry) {
    let dedupe_key = format!("{}|{}", entry.fen, entry.error_type);
    let mut keys = weakness_key_cache().lock().unwrap();
    if !keys.insert(dedupe_key) {
        return;
    }
    drop(keys);

    let path = Path::new(WEAKNESS_LOG_PATH);
    if let Some(parent) = path.parent() {
        let _ = create_dir_all(parent);
    }

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        if let Ok(line) = serde_json::to_string(entry) {
            let _ = writeln!(file, "{}", line);
        }
    }
}

fn piece_value_cp(kind: ChessPieceKind) -> i32 {
    match kind {
        ChessPieceKind::Pawn => 100,
        ChessPieceKind::Knight => 320,
        ChessPieceKind::Bishop => 330,
        ChessPieceKind::Rook => 500,
        ChessPieceKind::Queen => 900,
        ChessPieceKind::King => 0,
    }
}

fn side_material_cp(engine: &Engine, player: PlayerId) -> i32 {
    engine
        .units
        .values()
        .filter(|unit| unit.owner == player)
        .map(|unit| piece_value_cp(unit.kind))
        .sum()
}

fn material_advantage_cp(engine: &Engine, player: PlayerId) -> i32 {
    side_material_cp(engine, player) - side_material_cp(engine, opponent(player))
}

fn opponent(player: PlayerId) -> PlayerId {
    if player == 1 {
        2
    } else {
        1
    }
}

fn phase_from_engine(engine: &Engine) -> &'static str {
    let non_pawn_material: i32 = engine
        .units
        .values()
        .filter(|unit| !matches!(unit.kind, ChessPieceKind::King | ChessPieceKind::Pawn))
        .map(|unit| piece_value_cp(unit.kind))
        .sum();

    if engine.action_log.len() < 16 && non_pawn_material >= 3_200 {
        "opening"
    } else if non_pawn_material <= 1_800 || engine.units.len() <= 10 {
        "endgame"
    } else {
        "midgame"
    }
}

fn material_signature(engine: &Engine) -> String {
    format!(
        "{} vs {}",
        side_material_signature(engine, 1),
        side_material_signature(engine, 2)
    )
}

fn side_material_signature(engine: &Engine, player: PlayerId) -> String {
    let mut counts = [0; 5];
    for unit in engine.units.values().filter(|unit| unit.owner == player) {
        match unit.kind {
            ChessPieceKind::Queen => counts[0] += 1,
            ChessPieceKind::Rook => counts[1] += 1,
            ChessPieceKind::Bishop => counts[2] += 1,
            ChessPieceKind::Knight => counts[3] += 1,
            ChessPieceKind::Pawn => counts[4] += 1,
            ChessPieceKind::King => {}
        }
    }

    let mut parts = Vec::new();
    for (label, count) in [
        ("Q", counts[0]),
        ("R", counts[1]),
        ("B", counts[2]),
        ("N", counts[3]),
    ] {
        if count > 0 {
            if count == 1 {
                parts.push(label.to_string());
            } else {
                parts.push(format!("{}x{}", count, label));
            }
        }
    }
    if counts[4] > 0 {
        parts.push(format!("{}P", counts[4]));
    }

    if parts.is_empty() {
        "K".to_string()
    } else {
        parts.join("+")
    }
}

fn is_capture_action(engine: &Engine, action: &Action) -> bool {
    let Action::Move { target, .. } = action else {
        return false;
    };

    if engine.board.occupant(*target).is_some() {
        return true;
    }

    if let Action::Move { unit_id, .. } = action {
        if let Some(unit) = engine.units.get(unit_id) {
            return unit.kind == ChessPieceKind::Pawn && engine.en_passant_target == Some(*target);
        }
    }

    false
}

fn action_score_for_player(engine: &Engine, player: PlayerId, action: &Action) -> Option<i32> {
    let mut sim = engine.clone();
    sim.execute(Command {
        player_id: player,
        action: action.clone(),
    });

    if sim.game_over() {
        return Some(match sim.winner() {
            Some(winner) if winner == player => MATE_SCORE_THRESHOLD + 500,
            Some(_) => -MATE_SCORE_THRESHOLD,
            None => 0,
        });
    }

    search_root(&sim, opponent(player)).map(|reply| -reply.best_score)
}

fn best_capture_score(engine: &Engine, player: PlayerId) -> Option<i32> {
    let mut best: Option<i32> = None;
    for action in engine.legal_actions(player) {
        if !is_capture_action(engine, &action) {
            continue;
        }
        if let Some(score) = action_score_for_player(engine, player, &action) {
            best = Some(best.map_or(score, |current| current.max(score)));
        }
    }
    best
}

fn best_hanging_capture_loss_cp(engine: &Engine, player: PlayerId) -> i32 {
    let enemy = opponent(player);
    let mut worst_loss = 0;

    for action in engine.legal_actions(enemy) {
        let Action::Move {
            unit_id, target, ..
        } = action
        else {
            continue;
        };

        let Some(attacker) = engine.units.get(&unit_id) else {
            continue;
        };
        let Some(victim_id) = engine.board.occupant(target) else {
            continue;
        };
        let Some(victim) = engine.units.get(&victim_id) else {
            continue;
        };
        if victim.owner != player {
            continue;
        }

        let swing = piece_value_cp(victim.kind) - piece_value_cp(attacker.kind);
        worst_loss = worst_loss.max(swing);
    }

    worst_loss
}

fn opponent_has_promotion_threat(engine: &Engine, player: PlayerId) -> bool {
    engine
        .legal_actions(opponent(player))
        .into_iter()
        .filter_map(|action| action_to_uci(&action, &engine.units))
        .any(|mv| mv.len() == 5)
}

fn detect_weakness_candidates(
    engine_before: &Engine,
    engine_after: &Engine,
    player: PlayerId,
    played_action: &Action,
    selected_move: &str,
    best_move: &str,
    best_score: i32,
    played_score: i32,
) -> Vec<WeaknessCandidate> {
    let cp_drop = played_score - best_score;
    let mut out = Vec::new();
    let before_advantage = material_advantage_cp(engine_before, player);
    let after_advantage = material_advantage_cp(engine_after, player);
    let material_delta = after_advantage - before_advantage;
    let selected_is_capture = is_capture_action(engine_before, played_action);

    if material_delta <= -MATERIAL_DROP_THRESHOLD_CP && cp_drop <= CP_DROP_LOG_THRESHOLD {
        out.push(WeaknessCandidate {
            error_type: "material_drop",
            cp_drop,
            priority: cp_drop.abs() + material_delta.abs(),
        });
    }

    // Version legere : on detecte qu'une capture existe sans lancer search_root sur chaque
    // capture. L'ancienne version appelait action_score_for_player (= search_root) pour
    // chaque capture legale, soit O(captures) searches supplementaires par coup (issue #15).
    if !selected_is_capture && cp_drop <= CP_DROP_LOG_THRESHOLD {
        let has_capture = engine_before
            .legal_actions(player)
            .iter()
            .any(|a| is_capture_action(engine_before, a));
        if has_capture {
            out.push(WeaknessCandidate {
                error_type: "missed_capture",
                cp_drop,
                priority: cp_drop.abs() + 80,
            });
        }
    }

    let hanging_loss = best_hanging_capture_loss_cp(engine_after, player);
    if hanging_loss >= HANGING_PIECE_THRESHOLD_CP && cp_drop <= -60 {
        out.push(WeaknessCandidate {
            error_type: "hanging_piece",
            cp_drop,
            priority: hanging_loss + cp_drop.abs(),
        });
    }

    if best_score >= MATE_SCORE_THRESHOLD && played_score < MATE_SCORE_THRESHOLD {
        out.push(WeaknessCandidate {
            error_type: "mate_missed",
            cp_drop: (played_score - best_score).min(-500),
            priority: 1_500_000,
        });
    }

    if selected_is_capture && cp_drop <= BAD_TRADE_THRESHOLD_CP {
        out.push(WeaknessCandidate {
            error_type: "bad_trade",
            cp_drop,
            priority: cp_drop.abs() + 120,
        });
    }

    if opponent_has_promotion_threat(engine_after, player) && cp_drop <= -120 {
        out.push(WeaknessCandidate {
            error_type: "promotion_fail",
            cp_drop,
            priority: cp_drop.abs() + 200,
        });
    }

    if best_move == selected_move && cp_drop > -40 {
        out.clear();
    }

    out.sort_by(|a, b| {
        b.priority
            .cmp(&a.priority)
            .then(a.error_type.cmp(b.error_type))
    });
    out.truncate(MAX_WEAKNESSES_PER_MOVE);
    out
}

fn maybe_log_move_weaknesses(
    engine_before: &Engine,
    engine_after: &Engine,
    player: PlayerId,
    selected_move: &str,
) {
    let Some(root) = search_root(engine_before, player) else {
        return;
    };
    let best_move = action_to_uci(&root.best_action, &engine_before.units)
        .unwrap_or_else(|| "unknown".to_string());
    let Some(played_action) = engine_before
        .legal_actions(player)
        .into_iter()
        .find(|action| {
            action_to_uci(action, &engine_before.units).as_deref() == Some(selected_move)
        })
    else {
        return;
    };
    // Utilise le score statique post-coup au lieu de action_score_for_player (qui lancait
    // une search_root supplementaire). Moins precis mais evite le doublement du temps de calcul
    // quand TCS_WEAKNESS_LOG=1. Le cp_drop reste significatif pour le triage des erreurs.
    let played_score = {
        use crate::chess::eval::static_evaluate;
        use crate::engine::action::command::Command;
        let mut sim = engine_before.clone();
        sim.execute(Command { player_id: player, action: played_action.clone() });
        if sim.game_over() {
            match sim.winner() {
                Some(w) if w == player => MATE_SCORE_THRESHOLD + 500,
                Some(_) => -MATE_SCORE_THRESHOLD,
                None => 0,
            }
        } else {
            static_evaluate(&sim, player)
        }
    };

    let phase = phase_from_engine(engine_before).to_string();
    let signature = material_signature(engine_before);
    let reply_scan = reply_scan_breakdown(engine_before, player, &played_action, 3);
    let tactical = tactical_score_breakdown(engine_before, player, &played_action, played_score);
    let reply_scan_penalty = reply_scan.penalty.max(0);
    let tactical_penalty = (-tactical.final_score).max(0);
    let candidates = detect_weakness_candidates(
        engine_before,
        engine_after,
        player,
        &played_action,
        selected_move,
        &best_move,
        root.best_score,
        played_score,
    );

    for candidate in candidates {
        let entry = WeaknessLogEntry {
            fen: engine_before.to_fen(),
            move_played: selected_move.to_string(),
            best_move: best_move.clone(),
            error_type: candidate.error_type.to_string(),
            cp_drop: candidate.cp_drop,
            phase: phase.clone(),
            material_signature: signature.clone(),
            reply_scan_penalty,
            tactical_penalty,
            has_reply_scan_evidence: reply_scan_penalty > 0,
            has_tactical_evidence: tactical_penalty > 0,
        };
        println!(
            "ERROR_DETECTED|type={}|move={}|cp_drop={}",
            candidate.error_type, selected_move, candidate.cp_drop
        );
        append_tournament_runtime_line(&format!(
            "ERROR_DETECTED|type={}|move={}|cp_drop={}",
            candidate.error_type, selected_move, candidate.cp_drop
        ));
        append_weakness_entry(&entry);
    }
}

fn ensure_tournament_dir() {
    let _ = create_dir_all(tournament_dir());
}

fn progress_interval_turns_from_env() -> Option<u32> {
    std::env::var("TCS_PROGRESS_EVERY_TURNS")
        .ok()
        .and_then(|value| value.trim().parse::<u32>().ok())
        .filter(|value| *value > 0)
}

fn progress_label_from_env() -> String {
    std::env::var("TCS_PROGRESS_LABEL")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "MATCH_PROGRESS".to_string())
}

fn progress_game_from_env() -> String {
    std::env::var("TCS_PROGRESS_GAME")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "unknown".to_string())
}

fn create_moves_writer() -> Option<BufWriter<File>> {
    ensure_tournament_dir();

    let path_buf = tournament_dir().join("moves_detailed.csv");

    let first_init = MOVES_FILE_INITIALIZED
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_ok();

    let file = if first_init {
        match File::create(&path_buf) {
            Ok(mut file) => {
                let _ = writeln!(
                    file,
                    "run_id,game_id,ply,player,phase,selected_move,legal_move_count,profile_used,capture_flag,promotion_flag,repetition_flag,no_progress_flag,no_capture_flag,no_capture_streak,material_diff,fen_before,fen_after"
                );
                file
            }
            Err(_) => return None,
        }
    } else {
        match OpenOptions::new().create(true).append(true).open(&path_buf) {
            Ok(file) => file,
            Err(_) => return None,
        }
    };

    Some(BufWriter::new(file))
}

fn write_move_row(
    writer: &mut Option<BufWriter<File>>,
    run_id: &str,
    game_id: u64,
    ply: u32,
    player: &str,
    phase: &str,
    selected_move: &str,
    legal_move_count: usize,
    mode: &str,
    capture_flag: i32,
    promotion_flag: i32,
    repetition_flag: i32,
    no_progress_flag: i32,
    no_capture_flag: i32,
    no_capture_streak: u32,
    material_diff: i32,
    fen_before: &str,
    fen_after: &str,
) {
    if let Some(w) = writer.as_mut() {
        let _ = writeln!(
            w,
            "{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},\"{}\",\"{}\"",
            run_id,
            game_id,
            ply,
            player,
            phase,
            selected_move,
            legal_move_count,
            mode,
            capture_flag,
            promotion_flag,
            repetition_flag,
            no_progress_flag,
            no_capture_flag,
            no_capture_streak,
            material_diff,
            fen_before,
            fen_after
        );
    }
}

fn update_material_peak_stats(score: i32, max_abs: &mut i32, max_w: &mut i32, max_b: &mut i32) {
    *max_abs = (*max_abs).max(score.abs());
    *max_w = (*max_w).max(score);
    *max_b = (*max_b).max(-score);
}

impl WinFinishTrace {
    fn maybe_activate(&mut self, ply: u32, white_material_cp: i32) {
        if self.active || white_material_cp.abs() < WIN_TRACE_MATERIAL_ADVANTAGE_CP {
            return;
        }

        self.active = true;
        self.winning_player = if white_material_cp > 0 { 1 } else { 2 };
        self.start_ply = ply;
    }

    fn observe_ply(
        &mut self,
        ply: u32,
        engine_after: &Engine,
        mover: PlayerId,
        material_for_winner_cp: i32,
        is_capture: bool,
        is_check: bool,
        is_promotion: bool,
        repetition_flag: bool,
    ) {
        if !self.active {
            return;
        }

        let enemy_moves = engine_after
            .legal_actions(opponent(self.winning_player))
            .len();

        if is_capture {
            self.no_capture_streak = 0;
            self.captures += 1;
        } else {
            self.no_capture_streak += 1;
        }

        if is_check {
            self.checks += 1;
        }
        if is_promotion {
            self.promotions += 1;
        }

        emit_win_line(&format!(
            "WIN_TRACE|ply={}|material={}|is_capture={}|is_check={}|is_promotion={}|enemy_moves={}",
            ply,
            material_for_winner_cp,
            if is_capture { 1 } else { 0 },
            if is_check { 1 } else { 0 },
            if is_promotion { 1 } else { 0 },
            enemy_moves
        ));

        if self.no_capture_streak > WIN_TRACE_NO_CAPTURE_LIMIT && !self.no_capture_alerted {
            emit_win_line("ALERT|WIN_NOT_CONVERTED");
            self.no_capture_alerted = true;
        }

        if repetition_flag && !self.repetition_alerted {
            emit_win_line("ALERT|WIN_REPEATING");
            self.repetition_alerted = true;
        }

        if mover == self.winning_player {
            if let Some(previous_enemy_moves) = self.last_enemy_moves {
                if enemy_moves >= previous_enemy_moves {
                    self.no_pressure_streak += 1;
                } else {
                    self.no_pressure_streak = 0;
                }
            }
            self.last_enemy_moves = Some(enemy_moves);

            if self.no_pressure_streak >= WIN_TRACE_NO_PRESSURE_LIMIT && !self.no_pressure_alerted {
                emit_win_line("ALERT|NO_PRESSURE");
                self.no_pressure_alerted = true;
            }
        }
    }

    fn emit_summary(&self, final_ply: u32) {
        if !self.active {
            return;
        }

        emit_win_line(&format!(
            "WIN_SUMMARY|plies_to_finish={}|captures={}|checks={}|promotions={}",
            final_ply.saturating_sub(self.start_ply),
            self.captures,
            self.checks,
            self.promotions
        ));
    }
}

fn emit_win_line(line: &str) {
    println!("{}", line);
    append_tournament_runtime_line(line);
}

fn create_match_conversion_writer() -> Option<BufWriter<File>> {
    ensure_tournament_dir();

    let path_buf = tournament_dir().join("match_conversion.csv");

    let first_init = MATCH_CONVERSION_CSV_INITIALIZED
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_ok();

    let file = if first_init {
        match File::create(&path_buf) {
            Ok(mut file) => {
                let _ = writeln!(
                    file,
                    "run_id,game_id,max_abs_material_diff,max_white_material_lead,max_black_material_lead,had_clear_winning_material_edge,clear_edge_converted_win,clear_edge_lost_before_end"
                );
                file
            }
            Err(_) => return None,
        }
    } else {
        match OpenOptions::new().create(true).append(true).open(&path_buf) {
            Ok(file) => file,
            Err(_) => return None,
        }
    };

    Some(BufWriter::new(file))
}

fn write_match_conversion_row(
    writer: &mut Option<BufWriter<File>>,
    run_id: &str,
    game_id: u64,
    max_abs_material_diff: i32,
    max_white_material_lead: i32,
    max_black_material_lead: i32,
    had_clear_winning_material_edge: bool,
    clear_edge_converted_win: bool,
    clear_edge_lost_before_end: bool,
) {
    if let Some(w) = writer.as_mut() {
        let _ = writeln!(
            w,
            "{},{},{},{},{},{},{},{}",
            run_id,
            game_id,
            max_abs_material_diff,
            max_white_material_lead,
            max_black_material_lead,
            if had_clear_winning_material_edge {
                1
            } else {
                0
            },
            if clear_edge_converted_win { 1 } else { 0 },
            if clear_edge_lost_before_end { 1 } else { 0 },
        );
    }
}

impl SimulationRunner {
    pub fn new() -> Self {
        Self {
            ruleset: minimal_runtime_ruleset(),
            max_steps: DEFAULT_MAX_STEPS,
            verbose: true,
            emit_csv: true,
        }
    }

    pub fn with_ruleset(ruleset: RuntimeRuleset) -> Self {
        Self {
            ruleset,
            max_steps: DEFAULT_MAX_STEPS,
            verbose: true,
            emit_csv: true,
        }
    }

    pub fn with_ruleset_and_limit(ruleset: RuntimeRuleset, max_steps: u32) -> Self {
        Self {
            ruleset,
            max_steps,
            verbose: true,
            emit_csv: true,
        }
    }

    pub fn run_match(&mut self) -> MatchSummary {
        self.run_match_with_agents("heuristic", "random")
    }

    pub fn run_match_with_agents(&mut self, agent_white: &str, agent_black: &str) -> MatchSummary {
        let engine = load_engine_from_ruleset(&self.ruleset);
        let (summary, _first_moves) =
            self.run_match_from_engine_with_agents(engine, agent_white, agent_black);
        summary
    }

    pub fn run_match_from_engine_with_agents(
        &mut self,
        mut engine: crate::engine::engine::Engine,
        agent_white: &str,
        agent_black: &str,
    ) -> (MatchSummary, MatchFirstMoves) {
        let neural_active = agent_white == "neural" || agent_black == "neural";

        if neural_active {
            NeuralAgent::reset_runtime_stats();
        }

        let teacher_active = agent_white == "teacher_uci" || agent_black == "teacher_uci";

        let mut teacher_agent = if teacher_active {
            Some(UciAgent::new(&resolve_stockfish_path(), 8))
        } else {
            None
        };

        if let Some(agent) = teacher_agent.as_mut() {
            agent.new_game();
        }

        let mut step = 0u32;
        let mut seen_positions: HashMap<String, u32> = HashMap::new();
        let mut first_moves = MatchFirstMoves::default();

        let mut last_material = material_score_from_fen(&engine.to_fen());
        let mut max_abs_material_diff = 0i32;
        let mut max_white_material_lead = 0i32;
        let mut max_black_material_lead = 0i32;
        update_material_peak_stats(
            last_material,
            &mut max_abs_material_diff,
            &mut max_white_material_lead,
            &mut max_black_material_lead,
        );
        let mut no_progress_streak = 0u32;
        let mut no_progress_streak_max = 0u32;
        let mut repetition_streak = 0u32;
        let mut repetition_streak_max = 0u32;
        let mut no_capture_streak = 0u32;
        let mut no_capture_streak_max = 0u32;
        let mut last_capture_ply = 0u32;
        let mut last_pawn_move_ply = 0u32;
        let progress_interval_turns = progress_interval_turns_from_env();
        let progress_label = progress_label_from_env();
        let progress_game = progress_game_from_env();
        let mut last_progress_turn_bucket = 0u32;
        let mut no_progress_alerted = false;
        let mut repetition_alerted = false;
        let mut no_capture_alerted = false;
        let mut win_trace = WinFinishTrace::default();
        win_trace.maybe_activate(0, material_advantage_cp(&engine, 1));

        let mut forced_draw = false;
        let mut stagnation_cause = None;
        let mut max_repetition = 0u32;
        let game_analysis_enabled = game_analysis_trace_enabled();
        if game_analysis_enabled {
            emit_runtime_line("TRACE_ENABLED=1");
        }
        let game_analysis_game_id = if game_analysis_enabled {
            Some(NEXT_GAME_ID.fetch_add(1, Ordering::Relaxed).to_string())
        } else {
            None
        };
        let fast_trace = std::env::var("TCS_FAST_TRACE").ok().as_deref() == Some("1");
        let mut analysis = GameAnalysisSummary::default();

        let run_id = if self.emit_csv {
            "run_local"
        } else {
            "run_conversion_suite"
        };
        let game_id = if self.emit_csv {
            NEXT_GAME_ID.fetch_add(1, Ordering::Relaxed)
        } else {
            0
        };
        let cost_search_writer = cost_search_writer_from_env();

        let mut moves_writer = if self.emit_csv {
            create_moves_writer()
        } else {
            None
        };
        let mut match_conversion_writer = if self.emit_csv {
            create_match_conversion_writer()
        } else {
            None
        };

        while !engine.game_over() && step < self.max_steps {
            let turn_start = Instant::now();
            let player = engine.turn_manager.current_player;

            let mode = if player == 1 {
                agent_white
            } else {
                agent_black
            };

            let legal_actions = engine.legal_actions(player);
            let turn_ply = step + 1;
            let turn_phase = detect_phase(turn_ply);
            let fen_before = engine.to_fen();
            let trace_context = if game_analysis_enabled {
                game_analysis_game_id
                    .as_deref()
                    .map(|game_id| RootDecisionContext {
                        game_id: game_id.to_string(),
                        ply: turn_ply,
                        side: player,
                        fen_before: fen_before.clone(),
                    })
            } else {
                None
            };

            if legal_actions.is_empty() {
                break;
            }

            let selection_start = Instant::now();
            let (action, decision_trace) = if mode == "teacher_uci" {
                (
                    teacher_agent
                        .as_mut()
                        .and_then(|a| a.select_action_from_engine(&engine, player)),
                    None,
                )
            } else {
                let trace = choose_best_action_with_trace_and_context(
                    &engine,
                    player,
                    mode,
                    trace_context.as_ref(),
                );
                (
                    trace
                        .as_ref()
                        .map(|selected| selected.selected_action.clone()),
                    trace,
                )
            };
            let selection_elapsed = selection_start.elapsed();
            let selection_time_ms = selection_elapsed.as_millis();
            emit_runtime_line(&format!(
                "MOVE_SELECT|ply={}|phase={}|agent={}|legal_moves={}|time_ms={}",
                turn_ply,
                turn_phase,
                mode,
                legal_actions.len(),
                selection_time_ms
            ));

            let Some(action) = action else {
                break;
            };

            let selected_move =
                action_to_uci(&action, &engine.units).unwrap_or_else(|| "unknown".to_string());

            let _ = observe_cost_search_decision(
                cost_search_writer.as_ref(),
                game_id,
                turn_ply,
                player,
                &selected_move,
                mode,
                selection_elapsed.as_secs_f64() * 1000.0,
                decision_trace.as_ref(),
            );

            let is_conversion_move = if let Action::Move { .. } = action {
                is_conversion_move(&engine, player, &action)
            } else {
                false
            };
            if is_conversion_move {
                analysis.conversion_moves_seen += 1;
            }

            if player == 1 && first_moves.white.is_none() {
                first_moves.white = Some(selected_move.clone());
            } else if player == 2 && first_moves.black.is_none() {
                first_moves.black = Some(selected_move.clone());
            }

            let player_str = if player == 1 { "white" } else { "black" };

            let phase = turn_phase;
            let promotion_flag = if is_promotion(&selected_move) { 1 } else { 0 };

            let is_pawn_move = match &action {
                Action::Move { unit_id, .. } => engine
                    .units
                    .get(unit_id)
                    .map(|u| u.kind == ChessPieceKind::Pawn)
                    .unwrap_or(false),
                _ => false,
            };

            let key = canonical_position_key(&fen_before);
            let visits = seen_positions.entry(key).or_insert(0);
            *visits += 1;

            let repetition_count = *visits;
            let repetition_flag = if repetition_count >= 2 { 1 } else { 0 };
            if repetition_count >= 2 {
                analysis.repetition_risk_count += 1;
            }

            repetition_streak = repetition_count;
            max_repetition = max_repetition.max(repetition_count);
            repetition_streak_max = repetition_streak_max.max(repetition_count);
            if repetition_streak > 2 && !repetition_alerted {
                println!("ALERT|REPETITION_LOOP");
                repetition_alerted = true;
            }

            let engine_before_move = engine.clone();
            engine.execute(Command {
                player_id: player,
                action,
            });

            step += 1;

            let fen_after = engine.to_fen();
            // TCS_WEAKNESS_LOG=1 requis pour activer — desactive par defaut (chaque appel
            // declenchait ~10 search_root supplementaires par coup joue, cause de l'explosion
            // combinatoire issue #15).
            if std::env::var("TCS_WEAKNESS_LOG").ok().as_deref() == Some("1") {
                maybe_log_move_weaknesses(&engine_before_move, &engine, player, &selected_move);
            }

            let capture_flag = infer_capture_from_position_delta(&fen_before, &fen_after);
            let no_capture_flag = if capture_flag == 0 { 1 } else { 0 };
            let is_check = engine.is_in_check(opponent(player));

            if capture_flag == 1 {
                no_capture_streak = 0;
                last_capture_ply = step;
            } else {
                no_capture_streak += 1;
            }
            no_capture_streak_max = no_capture_streak_max.max(no_capture_streak);
            if no_capture_streak > 10 && !no_capture_alerted {
                println!("ALERT|NO_CAPTURE_LOOP");
                no_capture_alerted = true;
            }

            if is_pawn_move {
                last_pawn_move_ply = step;
            }

            let current_material = material_score_from_fen(&fen_after);
            let material_diff = current_material;

            if current_material == last_material {
                no_progress_streak += 1;
            } else {
                no_progress_streak = 0;
            }
            no_progress_streak_max = no_progress_streak_max.max(no_progress_streak);
            if no_progress_streak > 10 && !no_progress_alerted {
                println!("ALERT|NO_PROGRESS_LOOP");
                no_progress_alerted = true;
            }

            last_material = current_material;

            update_material_peak_stats(
                current_material,
                &mut max_abs_material_diff,
                &mut max_white_material_lead,
                &mut max_black_material_lead,
            );

            let white_material_cp = material_advantage_cp(&engine, 1);
            win_trace.maybe_activate(step, white_material_cp);
            if win_trace.active {
                let material_for_winner_cp = if win_trace.winning_player == 1 {
                    white_material_cp
                } else {
                    -white_material_cp
                };
                win_trace.observe_ply(
                    step,
                    &engine,
                    player,
                    material_for_winner_cp,
                    capture_flag == 1,
                    is_check,
                    promotion_flag == 1,
                    repetition_flag == 1,
                );
            }

            let no_progress_flag =
                if step >= STAGNATION_MIN_STEP && no_progress_streak >= SOFT_NO_PROGRESS_LIMIT {
                    1
                } else {
                    0
                };

            write_move_row(
                &mut moves_writer,
                run_id,
                game_id,
                step,
                player_str,
                phase,
                &selected_move,
                legal_actions.len(),
                mode,
                capture_flag,
                promotion_flag,
                repetition_flag,
                no_progress_flag,
                no_capture_flag,
                no_capture_streak,
                material_diff,
                &fen_before,
                &fen_after,
            );

            emit_runtime_line(&format!(
                "TRACE|ply={}|phase={}|legal_moves={}|material={}|no_progress={}|repetition={}|time_ms={}",
                step,
                turn_phase,
                legal_actions.len(),
                material_diff,
                no_progress_flag,
                repetition_flag,
                turn_start.elapsed().as_millis()
            ));

            // MOVE_DIAG : emis uniquement pour Rocky (agent heuristic/minimax), pas random ni teacher.
            // Fournit au coach LLM toutes les donnees contextuelles sur la decision.
            if mode == "heuristic" || mode == "minimax" {
                let band = if material_diff > 100 {
                    "ahead"
                } else if material_diff < -100 {
                    "behind"
                } else {
                    "equal"
                };
                let own_moves = legal_actions.len();
                let enemy_moves = engine.legal_actions(opponent(player)).len();
                let enemy_moves_delta = 0i32; // neutre — necessite scan pre/post non disponible ici
                let passed_pawn_delta = 0i32; // neutre — necessite evaluation pre/post
                let passed_pawn_distance = 8i32; // valeur neutre par defaut
                let search_score = decision_trace
                    .as_ref()
                    .and_then(|t| t.root_search.as_ref())
                    .map(|r| r.best_score)
                    .unwrap_or(0);
                emit_runtime_line(&format!(
                    "MOVE_DIAG|source=search|phase={}|band={}|plan=none|selected={}|material={}|own_moves={}|enemy_moves={}|repetition_pressure={}|passed_pawn_distance={}|no_progress_pressure={}|score={}|enemy_moves_delta={}|passed_pawn_delta={}|repeat={}|fen={}",
                    turn_phase,
                    band,
                    selected_move,
                    material_diff * 100, // convertir pions -> centipawns
                    own_moves,
                    enemy_moves,
                    repetition_flag,
                    passed_pawn_distance,
                    no_progress_flag,
                    search_score,
                    enemy_moves_delta,
                    passed_pawn_delta,
                    repetition_count,
                    fen_before,
                ));
            }

            if let Some(interval_turns) = progress_interval_turns {
                let current_turns = engine.turn_manager.turn_index;
                if current_turns > 0
                    && current_turns % interval_turns == 0
                    && current_turns != last_progress_turn_bucket
                {
                    last_progress_turn_bucket = current_turns;
                    println!(
                        "{}|game={}|white={}|black={}|turns={}|ply={}|last_capture_ply={}|material_diff={}",
                        progress_label,
                        progress_game,
                        agent_white,
                        agent_black,
                        current_turns,
                        step,
                        last_capture_ply,
                        material_diff
                    );
                }
            }

            if step >= STAGNATION_MIN_STEP
                && no_capture_streak >= SOFT_NO_CAPTURE_LIMIT
                && material_diff.abs() <= 1
            {
                forced_draw = true;
                stagnation_cause = Some("soft_no_capture".to_string());
                break;
            }

            // DISABLED: forced_draw_stagnation trigger for benchmark test
            // if step >= STAGNATION_MIN_STEP
            //     && no_progress_counter >= SOFT_NO_PROGRESS_LIMIT
            //     && material_diff.abs() <= 1
            // {
            //     forced_draw = true;
            //     break;
            // }

            if repetition_count >= 3 {
                forced_draw = true;
                stagnation_cause = Some("repetition".to_string());
                break;
            }

            if no_capture_streak >= HARD_NO_CAPTURE_LIMIT {
                forced_draw = true;
                stagnation_cause = Some("hard_no_capture".to_string());
                break;
            }
        }

        win_trace.emit_summary(step);

        if self.emit_csv {
            if let Some(w) = moves_writer.as_mut() {
                let _ = w.flush();
            }
        }

        let mut winner = engine.winner();

        let termination = if engine.game_over() {
            if winner.is_some() {
                MatchTermination::Winner
            } else {
                MatchTermination::Draw
            }
        } else if forced_draw {
            winner = None;
            MatchTermination::ForcedDrawStagnation
        } else {
            winner = None;
            MatchTermination::TurnLimit
        };

        let winner_reason = match winner {
            Some(1) => "white".to_string(),
            Some(2) => "black".to_string(),
            Some(_) => "winner_unknown".to_string(),
            None => match termination {
                MatchTermination::Winner => "winner".to_string(),
                MatchTermination::Draw => "draw".to_string(),
                MatchTermination::ForcedDrawStagnation => "forced_draw_stagnation".to_string(),
                MatchTermination::TurnLimit => "turn_limit".to_string(),
            },
        };

        if neural_active {
            let stats = NeuralAgent::runtime_stats_snapshot();

            let runtime_line = format!(
                "NEURAL_MATCH_RUNTIME|white={}|black={}|selection_calls={}|successful_inferences={}|fallback_events={}|fallback_no_uci_moves={}|fallback_predicted_move_not_found={}|fallback_python_bridge_failed={}|query_retries={}|retry_recoveries={}|invalid_python_predictions={}|rerank_salvages={}|shortlist_used_count={}|full_legal_fallback_count={}|shortlist_total_size={}|average_shortlist_size={:.4}|status={}",
                agent_white,
                agent_black,
                stats.selection_calls,
                stats.successful_inferences,
                stats.fallback_events,
                stats.fallback_no_uci_moves,
                stats.fallback_predicted_move_not_found,
                stats.fallback_python_bridge_failed,
                stats.query_retries,
                stats.retry_recoveries,
                stats.invalid_python_predictions,
                stats.rerank_salvages,
                stats.shortlist_used_count,
                stats.full_legal_fallback_count,
                stats.shortlist_total_size,
                stats.average_shortlist_size,
                stats.status_label()
            );

            println!("{}", runtime_line);
            append_tournament_runtime_line(&runtime_line);
        }

        let purity_violations = if neural_active {
            NeuralAgent::purity_violations_snapshot()
        } else {
            0
        };

        let had_clear_winning_material_edge = max_white_material_lead
            >= CLEAR_WINNING_MATERIAL_EDGE
            || max_black_material_lead >= CLEAR_WINNING_MATERIAL_EDGE;
        let clear_edge_converted_win = (max_white_material_lead >= CLEAR_WINNING_MATERIAL_EDGE
            && winner == Some(1))
            || (max_black_material_lead >= CLEAR_WINNING_MATERIAL_EDGE && winner == Some(2));
        let clear_edge_lost_before_end =
            had_clear_winning_material_edge && !clear_edge_converted_win;

        if self.emit_csv {
            write_match_conversion_row(
                &mut match_conversion_writer,
                run_id,
                game_id,
                max_abs_material_diff,
                max_white_material_lead,
                max_black_material_lead,
                had_clear_winning_material_edge,
                clear_edge_converted_win,
                clear_edge_lost_before_end,
            );
            if let Some(w) = match_conversion_writer.as_mut() {
                let _ = w.flush();
            }
        }

        let summary = MatchSummary {
            winner,
            turns: engine.turn_manager.turn_index,
            actions: engine.action_log.len(),
            termination: termination.clone(),
            termination_ply: step,
            progress_counter: no_progress_streak,
            last_capture_ply,
            last_pawn_move_ply,
            winner_reason,
            purity_violations,
            draw_cause: match termination {
                MatchTermination::Winner => None,
                MatchTermination::Draw => Some("true_draw".to_string()),
                MatchTermination::ForcedDrawStagnation => Some("forced_stagnation".to_string()),
                MatchTermination::TurnLimit => Some("turn_limit".to_string()),
            },
            stagnation_cause,
            max_repetition_count: max_repetition,
            no_progress_pattern: no_progress_streak >= SOFT_NO_PROGRESS_LIMIT,
            max_abs_material_diff,
            max_white_material_lead,
            max_black_material_lead,
            had_clear_winning_material_edge,
            clear_edge_converted_win,
            clear_edge_lost_before_end,
        };
        println!(
            "ENDGAME_DIAG|total_plies={}|no_progress_max={}|repeat_max={}|no_capture_max={}",
            step, no_progress_streak_max, repetition_streak_max, no_capture_streak_max
        );

        let summary_game_id = game_analysis_game_id
            .clone()
            .unwrap_or_else(|| NEXT_GAME_ID.fetch_add(1, Ordering::Relaxed).to_string());
        let (result, termination_reason) = match summary.winner {
            Some(1) => ("white".to_string(), "winner".to_string()),
            Some(2) => ("black".to_string(), "winner".to_string()),
            Some(_) => ("unknown".to_string(), "winner".to_string()),
            None => match summary.termination {
                MatchTermination::Winner => ("draw".to_string(), "winner".to_string()),
                MatchTermination::Draw => ("draw".to_string(), "draw".to_string()),
                MatchTermination::ForcedDrawStagnation => (
                    "draw".to_string(),
                    summary
                        .draw_cause
                        .clone()
                        .unwrap_or_else(|| "forced_draw_stagnation".to_string()),
                ),
                MatchTermination::TurnLimit => ("draw".to_string(), "turn_limit".to_string()),
            },
        };

        emit_game_analysis_row(
            "GAME_ANALYSIS_SUMMARY",
            json!({
                "game_id": summary_game_id,
                "result": result,
                "termination_reason": termination_reason,
                "plies": step,
                "repetition_risk_count": analysis.repetition_risk_count,
                "conversion_moves_seen": analysis.conversion_moves_seen,
            }),
        );

        (summary, first_moves)
    }

    pub fn run_n_matches(&mut self, n: u32) -> Vec<MatchSummary> {
        let mut results = Vec::with_capacity(n as usize);

        for i in 0..n {
            let summary = self.run_match();

            if self.verbose {
                let purity_status = if summary.purity_violations > 0 {
                    format!("|purity_violations={}", summary.purity_violations)
                } else {
                    String::new()
                };

                println!(
                    "Match {}/{} -> winner: {:?}, turns: {}, actions: {}, termination: {:?}{}",
                    i + 1,
                    n,
                    summary.winner,
                    summary.turns,
                    summary.actions,
                    summary.termination,
                    purity_status
                );
            }

            results.push(summary);
        }

        results
    }

    pub fn run_n_matches_with_agents(
        &mut self,
        n: u32,
        agent_white: &str,
        agent_black: &str,
        config_id: &str,
    ) -> Vec<TelemetryMatchSummary> {
        let mut results = Vec::with_capacity(n as usize);

        for i in 0..n {
            let summary = self.run_match_with_agents(agent_white, agent_black);

            let (true_draw_flag, forced_draw_stagnation_flag, turn_limit_flag) =
                match summary.termination {
                    MatchTermination::Winner => (false, false, false),
                    MatchTermination::Draw => (true, false, false),
                    MatchTermination::ForcedDrawStagnation => (false, true, false),
                    MatchTermination::TurnLimit => (false, false, true),
                };

            results.push(TelemetryMatchSummary {
                config_id: config_id.to_string(),
                match_index: i + 1,
                agent_white: agent_white.to_string(),
                agent_black: agent_black.to_string(),
                winner: summary.winner,
                true_draw_flag,
                forced_draw_stagnation_flag,
                turn_limit_flag,
                turns: summary.turns,
                actions: summary.actions,
                termination: summary.termination.clone(),
                outcome_reason: summary.winner_reason,
                purity_violations: summary.purity_violations,
                draw_cause: summary.draw_cause.clone(),
                stagnation_cause: summary.stagnation_cause.clone(),
                max_repetition_count: summary.max_repetition_count,
                no_progress_pattern: summary.no_progress_pattern,
                max_abs_material_diff: summary.max_abs_material_diff,
                max_white_material_lead: summary.max_white_material_lead,
                max_black_material_lead: summary.max_black_material_lead,
                had_clear_winning_material_edge: summary.had_clear_winning_material_edge,
                clear_edge_converted_win: summary.clear_edge_converted_win,
                clear_edge_lost_before_end: summary.clear_edge_lost_before_end,
            });
        }

        results
    }
}

fn resolve_stockfish_path() -> String {
    if let Ok(value) = std::env::var("TCS_STOCKFISH_PATH") {
        let trimmed = value.trim();

        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }

    for candidate in [
        "stockfish.exe",
        "C:\\Users\\wazou\\Desktop\\TACTICAL_CHESS_STUDIO\\TacticalChessPureLab\\stockfish.exe",
        "C:\\Users\\wazou\\Desktop\\TACTICAL_CHESS_STUDIO\\TacticalChessPureLab\\stockfish.exe.exe",
    ] {
        if Path::new(candidate).exists() {
            return candidate.to_string();
        }
    }

    "stockfish.exe".to_string()
}

#[cfg(test)]
mod cost_search_observability_tests {
    use super::*;
    use crate::chess::decision::{DecisionMode, SelectionAuthority};

    fn safe_cost_search_dir(run_id: &str) -> std::path::PathBuf {
        std::env::temp_dir()
            .join(format!(
                "tcs_simulation_cost_search_observability_test_{}_{}",
                std::process::id(),
                run_id
            ))
            .join("lab")
            .join("gameplay_observation")
            .join("sandbox_outputs")
            .join("rocky_cost_search")
            .join(run_id)
    }

    fn search_trace_fixture() -> (Engine, PlayerId, DecisionTrace, String) {
        let ruleset = minimal_runtime_ruleset();
        let engine = load_engine_from_ruleset(&ruleset);
        let player = engine.turn_manager.current_player;
        let trace =
            choose_best_action_with_trace_and_context(&engine, player, "minimax", None).unwrap();
        let selected_move = action_to_uci(&trace.selected_action, &engine.units)
            .unwrap_or_else(|| "unknown".to_string());

        (engine, player, trace, selected_move)
    }

    #[test]
    fn cost_search_simulation_default_disabled_has_no_writer_or_output() {
        let output_dir = safe_cost_search_dir("RUN_COSTSEARCH_SIM_DEFAULT_DISABLED");
        let _ = std::fs::remove_dir_all(&output_dir);

        let writer = cost_search_writer_from_output_dir(None).unwrap();
        let status =
            observe_cost_search_decision(writer.as_ref(), 1, 1, 1, "e2e4", "minimax", 0.0, None);

        assert_eq!(writer.is_none(), true);
        assert_eq!(status, CostSearchSimulationObservation::Disabled);
        assert!(!output_dir.exists());
    }

    #[test]
    fn cost_search_simulation_safe_route_is_accepted_through_wiring() {
        let output_dir = safe_cost_search_dir("RUN_COSTSEARCH_SIM_SAFE_ROUTE");
        let _ = std::fs::remove_dir_all(&output_dir);

        let writer = cost_search_writer_from_output_dir(Some(&output_dir))
            .expect("safe simulation route should validate");

        assert!(writer.is_some());
        assert!(!output_dir.exists());
    }

    #[test]
    fn cost_search_simulation_latest_json_route_is_rejected_through_wiring() {
        let output_dir = safe_cost_search_dir("RUN_COSTSEARCH_SIM_LATEST_JSON").join("latest.json");

        let result = cost_search_writer_from_output_dir(Some(&output_dir));

        assert!(matches!(
            result,
            Err(CostSearchRouteError::LatestJsonForbidden)
        ));
    }

    #[test]
    fn cost_search_simulation_lab_runs_run_star_route_is_rejected_through_wiring() {
        let output_dir = std::env::temp_dir()
            .join("tcs_simulation_cost_search_lab_runs")
            .join("lab")
            .join("runs")
            .join("RUN_COSTSEARCH_SIM_FORBIDDEN");

        let result = cost_search_writer_from_output_dir(Some(&output_dir));

        assert!(matches!(
            result,
            Err(CostSearchRouteError::LabRunsRunStarForbidden)
        ));
    }

    #[test]
    fn cost_search_simulation_game_id_one_detail_can_be_written() {
        let output_dir = safe_cost_search_dir("RUN_COSTSEARCH_SIM_GAME_ONE_DETAIL");
        let _ = std::fs::remove_dir_all(&output_dir);
        let writer = cost_search_writer_from_output_dir(Some(&output_dir))
            .unwrap()
            .expect("safe route should create a writer");
        let (_engine, player, trace, selected_move) = search_trace_fixture();

        let status = observe_cost_search_decision(
            Some(&writer),
            1,
            1,
            player,
            &selected_move,
            "minimax",
            1.0,
            Some(&trace),
        );

        assert_eq!(status, CostSearchSimulationObservation::Written);
        assert!(output_dir.join("game_1_detail.jsonl").exists());
        let _ = std::fs::remove_dir_all(&output_dir);
    }

    #[test]
    fn cost_search_simulation_game_id_two_detail_is_skipped_without_spam_file() {
        let output_dir = safe_cost_search_dir("RUN_COSTSEARCH_SIM_GAME_TWO_DETAIL");
        let _ = std::fs::remove_dir_all(&output_dir);
        let writer = cost_search_writer_from_output_dir(Some(&output_dir))
            .unwrap()
            .expect("safe route should create a writer");
        let (_engine, player, trace, selected_move) = search_trace_fixture();

        let status = observe_cost_search_decision(
            Some(&writer),
            2,
            1,
            player,
            &selected_move,
            "minimax",
            1.0,
            Some(&trace),
        );

        assert_eq!(status, CostSearchSimulationObservation::SummaryOnly);
        assert!(!output_dir.join("game_1_detail.jsonl").exists());
        let _ = std::fs::remove_dir_all(&output_dir);
    }

    #[test]
    fn cost_search_simulation_selected_action_path_is_not_changed_by_observation() {
        let output_dir = safe_cost_search_dir("RUN_COSTSEARCH_SIM_ACTION_UNCHANGED");
        let _ = std::fs::remove_dir_all(&output_dir);
        let writer = cost_search_writer_from_output_dir(Some(&output_dir))
            .unwrap()
            .expect("safe route should create a writer");
        let (engine, player, trace, selected_move_before) = search_trace_fixture();

        let status = observe_cost_search_decision(
            Some(&writer),
            1,
            1,
            player,
            &selected_move_before,
            "minimax",
            1.0,
            Some(&trace),
        );
        let selected_move_after = action_to_uci(&trace.selected_action, &engine.units)
            .unwrap_or_else(|| "unknown".to_string());

        assert_eq!(status, CostSearchSimulationObservation::Written);
        assert_eq!(selected_move_after, selected_move_before);
        let _ = std::fs::remove_dir_all(&output_dir);
    }

    #[test]
    fn cost_search_simulation_non_search_decision_does_not_fabricate_diagnostics() {
        let output_dir = safe_cost_search_dir("RUN_COSTSEARCH_SIM_NO_SEARCH_DIAGNOSTICS");
        let _ = std::fs::remove_dir_all(&output_dir);
        let writer = cost_search_writer_from_output_dir(Some(&output_dir))
            .unwrap()
            .expect("safe route should create a writer");
        let trace = DecisionTrace {
            selected_action: Action::Pass,
            mode: DecisionMode::Heuristic,
            selection_authority: SelectionAuthority::Heuristic,
            used_search: false,
            root_search: None,
        };

        let status = observe_cost_search_decision(
            Some(&writer),
            1,
            1,
            1,
            "pass",
            "heuristic",
            1.0,
            Some(&trace),
        );

        assert_eq!(
            status,
            CostSearchSimulationObservation::NoRootSearchDiagnostics
        );
        assert!(!output_dir.join("game_1_detail.jsonl").exists());
        assert!(!output_dir.exists());
    }
}
