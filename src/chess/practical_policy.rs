use crate::chess::eval::{is_winning_endgame, total_non_pawn_material};
use crate::chess::move_features::{
    advances_true_passed_pawn, capture_safety_signal, gives_check_fast, is_capture, is_quiet_move,
    is_shuffle_move, is_true_passed_pawn, king_activity_delta, king_boxing_score,
    king_escape_improves, progress_move_score, promotion_race_signal, repetition_signal,
    shuffle_penalty, trade_simplification_bonus,
};
use crate::chess::piece_kind::ChessPieceKind;
use crate::chess::uci::action_to_uci;
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::{PlayerId, Position};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PracticalPhase {
    Opening,
    Middlegame,
    Endgame,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PracticalBand {
    Losing,
    Equal,
    Ahead,
    Winning,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PhaseRewardProfile {
    OpeningEqual,
    MiddlegameEqual,
    MiddlegameAhead,
    MiddlegameWinning,
    EqualEndgame,
    WinningEndgame,
    LosingEndgame,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConversionPlan {
    None,
    SimplifyWhenAhead,
    PushPassedPawn,
    ActivateKing,
    BoxEnemyKing,
    CreateThreats,
    CounterplayWhenLosing,
}

#[derive(Clone, Copy, Debug)]
pub struct StrategicState {
    pub phase: PracticalPhase,
    pub eval_band: PracticalBand,
    pub material_advantage: i32,
    pub own_legal_moves: usize,
    pub enemy_legal_moves: usize,
    pub repetition_pressure: i32,
    pub passed_pawn_distance: i32,
    pub no_progress_pressure: i32,
    pub conversion_plan: ConversionPlan,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct PracticalCandidateBreakdown {
    pub score: i32,
    pub enemy_moves_delta: i32,
    pub passed_pawn_delta: i32,
    pub repeat: i32,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct TacticalScoreBreakdown {
    pub see: i32,
    pub hanging: i32,
    pub mate: i32,
    pub trade: i32,
    pub quiet: i32,
    pub final_score: i32,
}

#[derive(Clone, Debug, Default)]
pub struct ReplyScanBreakdown {
    pub penalty: i32,
    pub enemy_best_move: String,
}

#[derive(Clone, Debug, Default)]
pub struct TacticalSafetyBreakdown {
    pub penalty: i32,
    pub compensation_bonus: i32,
    pub material_advantage: i32,
    pub material_drop: i32,
    pub enemy_best_move: String,
    pub moved_piece_captured: bool,
    pub moved_piece_hanging: bool,
    pub gives_check: bool,
    pub creates_capture_threat: bool,
    pub increases_complexity: bool,
    pub forcing_reply_loss: bool,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct PracticalCandidateInputs {
    pub enemy_moves_delta: i32,
    pub passed_pawn_delta: i32,
    pub repeat_after: i32,
    pub trade_delta: i32,
    pub progress: i32,
    pub shuffle: bool,
    pub gives_check: bool,
    pub capture: bool,
    pub boxing: i32,
    pub king_activity: i32,
    pub quiet_stall: bool,
    pub preserves_advantage: bool,
}

const STRATEGIC_ENEMY_MOBILITY_WEIGHT: i32 = 16;
const STRATEGIC_PASSED_PAWN_STEP: i32 = 52;
const STRATEGIC_TRADE_AHEAD_BONUS: i32 = 132;
const STRATEGIC_KING_ACTIVITY_BONUS: i32 = 68;
const STRATEGIC_BOX_KING_BONUS: i32 = 88;
const STRATEGIC_CREATE_THREAT_BONUS: i32 = 104;
const STRATEGIC_QUIET_SHUFFLE_PENALTY: i32 = 96;
const STRATEGIC_AVOID_REPETITION_PENALTY: i32 = 180;
const STRATEGIC_DRAW_SAVE_REPETITION_BONUS: i32 = 220;
const STRATEGIC_COUNTERPLAY_PROGRESS_WEIGHT: i32 = 10;
const STRATEGIC_COMPLICATION_BONUS: i32 = 56;
const STRATEGIC_AVOID_SIMPLIFICATION_PENALTY: i32 = 128;
const TACTICAL_MATE_THRESHOLD: i32 = 890_000;
const TACTICAL_QUEEN_HANGING_PENALTY: i32 = 520;
const TACTICAL_ROOK_HANGING_PENALTY: i32 = 310;
const TACTICAL_MINOR_HANGING_PENALTY: i32 = 210;
const TACTICAL_PAWN_HANGING_PENALTY: i32 = 70;
const TACTICAL_SAFETY_LOSS_PENALTY: i32 = 100;
const TACTICAL_SAFETY_HANGING_PENALTY: i32 = 50;
const TACTICAL_SAFETY_LOSING_THRESHOLD: i32 = -300;
const TACTICAL_SAFETY_CHECK_COMPENSATION: i32 = 20;
const TACTICAL_SAFETY_THREAT_COMPENSATION: i32 = 20;
const TACTICAL_SAFETY_COMPLEXITY_COMPENSATION: i32 = 15;
const TACTICAL_SAFETY_FORCING_REPLY_LIMIT: usize = 5;
pub(crate) const PHASE_REWARD_MIDDLEGAME_WINNING_SIMPLIFY: i32 = 132;
const QUIET_NO_PROGRESS_PENALTY: i32 = 14;
const QUIET_BACKWARD_PROGRESS_PENALTY: i32 = 18;
const CLEAR_EDGE_NO_PROGRESS_EXTRA: i32 = 18;
const WINNING_ENDGAME_NO_PROGRESS_EXTRA: i32 = 14;
const CLEAR_EDGE_MATERIAL: i32 = 250;
const PHASE_REWARD_MIDDLEGAME_AHEAD_FORCE: i32 = 54;
const PHASE_REWARD_MIDDLEGAME_AHEAD_SAFE_CAPTURE: i32 = 72;
const PHASE_REWARD_MIDDLEGAME_AHEAD_MOBILITY: i32 = 20;
const PHASE_REWARD_MIDDLEGAME_AHEAD_PASSED_PAWN: i32 = 68;
const PHASE_REWARD_MIDDLEGAME_AHEAD_PROMOTION: i32 = 74;
const PHASE_REWARD_MIDDLEGAME_AHEAD_ANTI_STALL: i32 = 58;
const PHASE_REWARD_MIDDLEGAME_AHEAD_REPETITION: i32 = 150;
const PHASE_REWARD_MIDDLEGAME_WINNING_FORCE: i32 = 92;
const PHASE_REWARD_MIDDLEGAME_WINNING_SAFE_CAPTURE: i32 = 124;
const PHASE_REWARD_MIDDLEGAME_WINNING_MOBILITY: i32 = 28;
const PHASE_REWARD_MIDDLEGAME_WINNING_PASSED_PAWN: i32 = 112;
const PHASE_REWARD_MIDDLEGAME_WINNING_PROMOTION: i32 = 120;
const PHASE_REWARD_MIDDLEGAME_WINNING_ANTI_STALL: i32 = 92;
const PHASE_REWARD_MIDDLEGAME_WINNING_REPETITION: i32 = 240;
const PHASE_REWARD_WINNING_ENDGAME_TRADE: i32 = 120;
const PHASE_REWARD_WINNING_ENDGAME_PASSED_PAWN: i32 = 120;
const PHASE_REWARD_WINNING_ENDGAME_ANTI_STALL: i32 = 72;
const PHASE_REWARD_WINNING_ENDGAME_BOXING: i32 = 84;
const PHASE_REWARD_WINNING_ENDGAME_REPETITION: i32 = 220;
const PHASE_REWARD_LOSING_ENDGAME_REPETITION: i32 = 180;
const PHASE_REWARD_LOSING_ENDGAME_CHECK: i32 = 96;
const PHASE_REWARD_LOSING_ENDGAME_COUNTERPLAY: i32 = 54;
const PHASE_REWARD_LOSING_ENDGAME_TRADE_REDUCTION: i32 = 84;
const PHASE_REWARD_EQUAL_ENDGAME_PASSED_PAWN: i32 = 52;
const PHASE_REWARD_EQUAL_ENDGAME_KING_ACTIVITY: i32 = 36;
const PHASE_REWARD_EQUAL_ENDGAME_REPETITION: i32 = 52;

#[derive(Clone, Copy, Debug)]
pub(crate) struct PhaseRewardContext {
    pub(crate) phase: PracticalPhase,
    pub(crate) band: PracticalBand,
    pub(crate) profile: PhaseRewardProfile,
}

impl PracticalPhase {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Opening => "opening",
            Self::Middlegame => "middlegame",
            Self::Endgame => "endgame",
        }
    }
}

impl PracticalBand {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Losing => "losing",
            Self::Equal => "equal",
            Self::Ahead => "ahead",
            Self::Winning => "winning",
        }
    }
}

impl PhaseRewardProfile {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::OpeningEqual => "opening_equal",
            Self::MiddlegameEqual => "middlegame_equal",
            Self::MiddlegameAhead => "middlegame_ahead",
            Self::MiddlegameWinning => "middlegame_winning",
            Self::EqualEndgame => "equal_endgame",
            Self::WinningEndgame => "winning_endgame",
            Self::LosingEndgame => "losing_endgame",
        }
    }
}

impl ConversionPlan {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::None => "none",
            Self::SimplifyWhenAhead => "simplify_when_ahead",
            Self::PushPassedPawn => "push_passed_pawn",
            Self::ActivateKing => "activate_king",
            Self::BoxEnemyKing => "box_enemy_king",
            Self::CreateThreats => "create_threats",
            Self::CounterplayWhenLosing => "counterplay_when_losing",
        }
    }
}

pub fn detect_phase(
    action_log_len: usize,
    unit_count: usize,
    total_non_pawn_material: i32,
) -> PracticalPhase {
    if action_log_len < 16 && unit_count >= 24 && total_non_pawn_material >= 4_400 {
        PracticalPhase::Opening
    } else if unit_count <= 12 || total_non_pawn_material <= 2_600 {
        PracticalPhase::Endgame
    } else {
        PracticalPhase::Middlegame
    }
}

pub fn detect_advantage_band(score: i32) -> PracticalBand {
    if score >= 350 {
        PracticalBand::Winning
    } else if score >= 120 {
        PracticalBand::Ahead
    } else if score <= -120 {
        PracticalBand::Losing
    } else {
        PracticalBand::Equal
    }
}

pub fn phase_reward_profile(phase: PracticalPhase, band: PracticalBand) -> PhaseRewardProfile {
    match phase {
        PracticalPhase::Opening => PhaseRewardProfile::OpeningEqual,
        PracticalPhase::Middlegame => match band {
            PracticalBand::Winning => PhaseRewardProfile::MiddlegameWinning,
            PracticalBand::Ahead => PhaseRewardProfile::MiddlegameAhead,
            PracticalBand::Equal | PracticalBand::Losing => PhaseRewardProfile::MiddlegameEqual,
        },
        PracticalPhase::Endgame => match band {
            PracticalBand::Winning | PracticalBand::Ahead => PhaseRewardProfile::WinningEndgame,
            PracticalBand::Losing => PhaseRewardProfile::LosingEndgame,
            PracticalBand::Equal => PhaseRewardProfile::EqualEndgame,
        },
    }
}

pub fn repetition_pressure(repetition_visits: i32, halfmove_clock: u32) -> i32 {
    ((repetition_visits - 1).max(0) * 2)
        + if halfmove_clock >= 80 {
            2
        } else if halfmove_clock >= 60 {
            1
        } else {
            0
        }
}

pub fn no_progress_pressure(
    halfmove_clock: u32,
    action_log_len: usize,
    winning_endgame: bool,
) -> i32 {
    let mut pressure = (halfmove_clock / 16) as i32;
    if action_log_len >= 24 {
        pressure += 1;
    }
    if winning_endgame {
        pressure += 1;
    }
    pressure.min(6)
}

pub fn build_strategic_state(
    phase: PracticalPhase,
    eval_band: PracticalBand,
    material_advantage: i32,
    own_legal_moves: usize,
    enemy_legal_moves: usize,
    repetition_pressure: i32,
    passed_pawn_distance: i32,
    no_progress_pressure: i32,
) -> StrategicState {
    let mut state = StrategicState {
        phase,
        eval_band,
        material_advantage,
        own_legal_moves,
        enemy_legal_moves,
        repetition_pressure,
        passed_pawn_distance,
        no_progress_pressure,
        conversion_plan: ConversionPlan::None,
    };
    state.conversion_plan = select_conversion_plan(&state);
    state
}

pub fn select_conversion_plan(state: &StrategicState) -> ConversionPlan {
    if !matches!(state.phase, PracticalPhase::Endgame) {
        return ConversionPlan::None;
    }

    match state.eval_band {
        PracticalBand::Winning | PracticalBand::Ahead => {
            if state.passed_pawn_distance <= 3 {
                ConversionPlan::PushPassedPawn
            } else if state.enemy_legal_moves <= 6 {
                ConversionPlan::BoxEnemyKing
            } else if state.material_advantage >= 350 {
                ConversionPlan::SimplifyWhenAhead
            } else if state.no_progress_pressure >= 3 {
                ConversionPlan::ActivateKing
            } else {
                ConversionPlan::CreateThreats
            }
        }
        PracticalBand::Losing => ConversionPlan::CounterplayWhenLosing,
        PracticalBand::Equal => {
            if state.passed_pawn_distance <= 4 {
                ConversionPlan::PushPassedPawn
            } else if state.no_progress_pressure >= 3 {
                ConversionPlan::ActivateKing
            } else {
                ConversionPlan::CreateThreats
            }
        }
    }
}

pub fn detect_finish_mode(
    state: &StrategicState,
    significant_advantage_cp: i32,
    low_enemy_mobility_max: usize,
    stalled_pressure_min: i32,
    endgameish: bool,
) -> (bool, &'static str) {
    let significant_advantage = state.material_advantage >= significant_advantage_cp;
    let low_enemy_mobility = state.enemy_legal_moves <= low_enemy_mobility_max;
    let stalled =
        state.repetition_pressure > 0 || state.no_progress_pressure >= stalled_pressure_min;
    let active = significant_advantage && endgameish && (low_enemy_mobility || stalled);
    let reason = if !significant_advantage {
        "material_not_ahead"
    } else if !endgameish {
        "not_endgame_material"
    } else if low_enemy_mobility {
        "enemy_mobility_low"
    } else if stalled {
        "stalled_position"
    } else {
        "inactive"
    };
    (active, reason)
}

pub fn detect_pressure_mode(
    state: &StrategicState,
    ply: usize,
    positive_signal: bool,
    high_mobility_threshold: usize,
    slight_advantage_floor_cp: i32,
    min_ply_stalled: usize,
    min_ply_positive: usize,
    long_game_ply: usize,
) -> (bool, &'static str) {
    let long_game = ply >= long_game_ply;
    let stalled = state.no_progress_pressure >= 1 || state.repetition_pressure > 0;
    let high_mobility_stall = state.material_advantage >= slight_advantage_floor_cp
        && state.own_legal_moves >= high_mobility_threshold
        && state.enemy_legal_moves >= high_mobility_threshold
        && ply >= min_ply_stalled;
    let active = (stalled && ply >= min_ply_stalled)
        || (positive_signal && ply >= min_ply_positive)
        || high_mobility_stall
        || long_game;
    let reason = if long_game {
        "long_game_before_cap"
    } else if stalled && ply >= min_ply_stalled {
        "no_progress_pressure"
    } else if positive_signal && ply >= min_ply_positive {
        "positive_pressure_signal"
    } else if high_mobility_stall {
        "high_mobility_stall"
    } else {
        "inactive"
    };
    (active, reason)
}

pub fn score_practical_candidate(
    state: &StrategicState,
    input: &PracticalCandidateInputs,
) -> PracticalCandidateBreakdown {
    let mut score = 0;

    match state.eval_band {
        PracticalBand::Winning => {
            score += input.enemy_moves_delta.max(0) * (STRATEGIC_ENEMY_MOBILITY_WEIGHT + 6);
            score += input.passed_pawn_delta.max(0) * (STRATEGIC_PASSED_PAWN_STEP + 12);

            if input.capture && input.trade_delta > 0 && input.preserves_advantage {
                score += STRATEGIC_TRADE_AHEAD_BONUS + 36 + input.trade_delta / 2;
            }

            if input.gives_check && !input.capture {
                score += STRATEGIC_CREATE_THREAT_BONUS / 2;
            }

            if input.king_activity > 0 {
                score += STRATEGIC_KING_ACTIVITY_BONUS + 20 + input.king_activity * 14;
            }

            if input.boxing > 0 {
                score += STRATEGIC_BOX_KING_BONUS + 20 + input.boxing / 2;
            }

            if input.repeat_after >= 3 || state.repetition_pressure > 0 && input.shuffle {
                score -= (STRATEGIC_AVOID_REPETITION_PENALTY + 40) * input.repeat_after.min(3);
            }

            if input.quiet_stall {
                score -= STRATEGIC_QUIET_SHUFFLE_PENALTY + 36 + state.no_progress_pressure * 24;
            }

            if input.shuffle {
                score -= STRATEGIC_QUIET_SHUFFLE_PENALTY + 84;
            }
        }
        PracticalBand::Ahead => {
            score += input.enemy_moves_delta.max(0) * STRATEGIC_ENEMY_MOBILITY_WEIGHT;
            score += input.passed_pawn_delta.max(0) * STRATEGIC_PASSED_PAWN_STEP;

            if input.capture && input.trade_delta > 0 && input.preserves_advantage {
                score += STRATEGIC_TRADE_AHEAD_BONUS + input.trade_delta / 3;
            }

            if input.gives_check && !input.capture {
                score += STRATEGIC_CREATE_THREAT_BONUS / 3;
            }

            if input.king_activity > 0 {
                score += STRATEGIC_KING_ACTIVITY_BONUS + input.king_activity * 12;
            }

            if input.boxing > 0 {
                score += STRATEGIC_BOX_KING_BONUS + input.boxing / 2;
            }

            if input.repeat_after >= 3 || state.repetition_pressure > 0 && input.shuffle {
                score -= STRATEGIC_AVOID_REPETITION_PENALTY * input.repeat_after.min(3);
            }

            if input.quiet_stall {
                score -= STRATEGIC_QUIET_SHUFFLE_PENALTY + state.no_progress_pressure * 18;
            }

            if input.shuffle {
                score -= STRATEGIC_QUIET_SHUFFLE_PENALTY + 40;
            }
        }
        PracticalBand::Losing => {
            if input.gives_check {
                score += STRATEGIC_CREATE_THREAT_BONUS;
            }

            if input.progress > 0 {
                score += STRATEGIC_COUNTERPLAY_PROGRESS_WEIGHT * (input.progress / 10).max(1);
            }

            if input.enemy_moves_delta > 0 {
                score += input.enemy_moves_delta * 8;
            }

            if input.repeat_after >= 3 {
                score += STRATEGIC_DRAW_SAVE_REPETITION_BONUS;
            } else if state.repetition_pressure > 0 && input.shuffle {
                score += STRATEGIC_DRAW_SAVE_REPETITION_BONUS / 2;
            }

            if !input.capture && (input.gives_check || input.progress > 0) {
                score += STRATEGIC_COMPLICATION_BONUS;
            }

            if input.capture && input.trade_delta > 0 {
                score -= STRATEGIC_AVOID_SIMPLIFICATION_PENALTY;
            }
        }
        PracticalBand::Equal => {
            score += input.enemy_moves_delta.max(0) * 8;
            score += input.passed_pawn_delta.max(0) * (STRATEGIC_PASSED_PAWN_STEP / 2);
            if input.king_activity > 0 {
                score += STRATEGIC_KING_ACTIVITY_BONUS / 2;
            }
            if input.gives_check {
                score += STRATEGIC_CREATE_THREAT_BONUS / 2;
            }
            if input.repeat_after >= 3 {
                score -= STRATEGIC_AVOID_REPETITION_PENALTY / 2;
            }
        }
    }

    match state.conversion_plan {
        ConversionPlan::SimplifyWhenAhead if input.capture && input.trade_delta > 0 => {
            score += STRATEGIC_TRADE_AHEAD_BONUS;
        }
        ConversionPlan::PushPassedPawn if input.passed_pawn_delta > 0 => {
            score += STRATEGIC_PASSED_PAWN_STEP * 2;
        }
        ConversionPlan::ActivateKing if input.king_activity > 0 => {
            score += STRATEGIC_KING_ACTIVITY_BONUS;
        }
        ConversionPlan::BoxEnemyKing if input.enemy_moves_delta > 0 || input.boxing > 0 => {
            score += STRATEGIC_BOX_KING_BONUS;
        }
        ConversionPlan::CreateThreats if input.gives_check || input.progress > 0 => {
            score += STRATEGIC_CREATE_THREAT_BONUS;
        }
        ConversionPlan::CounterplayWhenLosing if input.gives_check || input.repeat_after >= 3 => {
            score += STRATEGIC_COMPLICATION_BONUS;
        }
        ConversionPlan::None => {}
        _ => {}
    }

    PracticalCandidateBreakdown {
        score,
        enemy_moves_delta: input.enemy_moves_delta,
        passed_pawn_delta: input.passed_pawn_delta,
        repeat: input.repeat_after,
    }
}

pub(crate) fn conversion_controller_enabled() -> bool {
    std::env::var("TCS_CONVERSION_CONTROLLER").ok().as_deref() != Some("0")
}

pub(crate) fn phase_reward_enabled() -> bool {
    std::env::var("TCS_PHASE_REWARD").ok().as_deref() != Some("0")
}

pub(crate) fn strategic_root_state(
    engine: &Engine,
    player: PlayerId,
    search_score: i32,
) -> StrategicState {
    let phase = detect_phase_reward_phase(engine);
    let eval_band = detect_phase_reward_band(search_score);
    let material_advantage = material_balance(engine, player);
    let own_legal_moves = engine.legal_actions(player).len();
    let enemy_legal_moves = engine.legal_actions(opponent(player)).len();
    let repetition_visits = engine
        .repetition_counts
        .get(&engine.current_repetition_key)
        .copied()
        .unwrap_or(1) as i32;
    let repetition_pressure = repetition_pressure(repetition_visits, engine.halfmove_clock);
    let passed_pawn_distance = closest_passed_pawn_distance(engine, player);
    let no_progress_pressure = no_progress_pressure_for_engine(engine, player);
    build_strategic_state(
        phase,
        eval_band,
        material_advantage,
        own_legal_moves,
        enemy_legal_moves,
        repetition_pressure,
        passed_pawn_distance,
        no_progress_pressure,
    )
}

pub(crate) fn strategic_candidate_breakdown(
    engine: &Engine,
    player: PlayerId,
    mv: &Action,
    search_score: i32,
) -> PracticalCandidateBreakdown {
    if !conversion_controller_enabled() {
        return PracticalCandidateBreakdown::default();
    }

    let state = strategic_root_state(engine, player, search_score);
    let mut sim = engine.clone();
    let Some(undo) = sim.simulate_action_for_search(player, mv) else {
        return PracticalCandidateBreakdown::default();
    };

    let enemy = opponent(player);
    let enemy_moves_after = sim.legal_actions(enemy).len() as i32;
    let enemy_moves_delta = state.enemy_legal_moves as i32 - enemy_moves_after;
    let passed_after = closest_passed_pawn_distance(&sim, player);
    let passed_pawn_delta = if state.passed_pawn_distance >= 8 && passed_after >= 8 {
        0
    } else {
        state.passed_pawn_distance - passed_after
    };
    let repeat = sim
        .repetition_counts
        .get(&sim.current_repetition_key)
        .copied()
        .unwrap_or(1) as i32;
    let trade_delta = total_material_value(engine) - total_material_value(&sim);
    let progress = progress_move_score(engine, player, mv);
    let quiet = is_quiet_move(engine, player, mv);
    let shuffle = is_shuffle_move(engine, player, mv);
    let gives_check = gives_check_fast(engine, player, mv);
    let capture = is_capture(engine, mv);
    let boxing = king_boxing_score(engine, player, mv);
    let king_active = king_activity_delta(engine, player, mv);
    let quiet_stall = quiet && progress <= 0;

    let input = PracticalCandidateInputs {
        enemy_moves_delta,
        passed_pawn_delta,
        repeat_after: repeat,
        trade_delta,
        progress,
        shuffle,
        gives_check,
        capture,
        boxing,
        king_activity: king_active,
        quiet_stall,
        preserves_advantage: material_balance(&sim, player) >= 120,
    };
    let shared = score_practical_candidate(&state, &input);

    let _ = sim.undo_action_for_search(undo);

    PracticalCandidateBreakdown {
        score: shared.score,
        enemy_moves_delta: shared.enemy_moves_delta,
        passed_pawn_delta: shared.passed_pawn_delta,
        repeat: shared.repeat,
    }
}

pub(crate) fn maybe_emit_strategic_diagnostics(
    engine: &Engine,
    player: PlayerId,
    search_score: i32,
    selected_move: &Action,
) {
    if !conversion_controller_enabled() {
        return;
    }

    let state = strategic_root_state(engine, player, search_score);
    let selected = strategic_candidate_breakdown(engine, player, selected_move, search_score);

    if std::env::var("TCS_DEBUG").is_ok() {
        println!(
            "MOVE_DIAG|source=search|phase={}|band={}|plan={}|selected={}|material={}|own_moves={}|enemy_moves={}|repetition_pressure={}|passed_pawn_distance={}|no_progress_pressure={}|score={}|enemy_moves_delta={}|passed_pawn_delta={}|repeat={}",
            state.phase.as_str(),
            state.eval_band.as_str(),
            state.conversion_plan.as_str(),
            action_to_uci(selected_move, &engine.units).unwrap_or_else(|| "unknown".to_string()),
            state.material_advantage,
            state.own_legal_moves,
            state.enemy_legal_moves,
            state.repetition_pressure,
            state.passed_pawn_distance,
            state.no_progress_pressure,
            selected.score,
            selected.enemy_moves_delta,
            selected.passed_pawn_delta,
            selected.repeat,
        );
    }

    if tactical_diagnostics_enabled() && std::env::var("TCS_DEBUG").is_ok() {
        let tactical = tactical_score_breakdown(engine, player, selected_move, search_score);
        println!(
            "TACTICAL_DIAG|move={}|see={}|hang={}|mate={}|trade={}|quiet={}|final={}",
            action_to_uci(selected_move, &engine.units).unwrap_or_else(|| "unknown".to_string()),
            tactical.see,
            tactical.hanging,
            tactical.mate,
            tactical.trade,
            tactical.quiet,
            tactical.final_score,
        );
    }
}

pub(crate) fn no_progress_pressure_for_engine(engine: &Engine, player: PlayerId) -> i32 {
    no_progress_pressure(
        engine.halfmove_clock,
        engine.action_log.len(),
        is_winning_endgame(engine, player),
    )
}

pub(crate) fn quiet_non_progress_penalty(
    engine: &Engine,
    player: PlayerId,
    mv: &Action,
    progress: i32,
) -> i32 {
    if !is_quiet_move(engine, player, mv) || progress > 0 || is_conversion_move(engine, player, mv)
    {
        return 0;
    }

    let mat = material_balance(engine, player);
    let mut penalty = QUIET_NO_PROGRESS_PENALTY;

    if progress < 0 {
        penalty += QUIET_BACKWARD_PROGRESS_PENALTY;
    }

    if mat >= CLEAR_EDGE_MATERIAL {
        penalty += CLEAR_EDGE_NO_PROGRESS_EXTRA;
    }

    if is_winning_endgame(engine, player) {
        penalty += WINNING_ENDGAME_NO_PROGRESS_EXTRA;
    }

    penalty
}

pub(crate) fn is_conversion_move(engine: &Engine, player: PlayerId, mv: &Action) -> bool {
    if material_balance(engine, player) < 150 {
        return false;
    }

    is_capture(engine, mv)
        || gives_check_fast(engine, player, mv)
        || advances_true_passed_pawn(engine, player, mv)
        || progress_move_score(engine, player, mv) >= 80
}

pub(crate) fn phase_profile_rerank_bonus(
    engine: &Engine,
    player: PlayerId,
    mv: &Action,
    search_score: i32,
) -> i32 {
    if !phase_reward_enabled() {
        return 0;
    }

    let progress = progress_move_score(engine, player, mv);
    let repetition_score = repetition_signal(engine, player, mv);
    let boxing_score = king_boxing_score(engine, player, mv);
    let gives_check = gives_check_fast(engine, player, mv);
    let capture = is_capture(engine, mv);
    let passed_pawn = advances_true_passed_pawn(engine, player, mv);
    let king_activity = king_escape_improves(engine, player, mv);
    let quiet_penalty = quiet_non_progress_penalty(engine, player, mv, progress);
    let context = phase_reward_context(engine, search_score);
    let safe_capture = capture_safety_signal(engine, player, mv);
    let promotion_swing = promotion_race_signal(engine, player, mv);
    let mobility_pressure = boxing_score / 6;
    let simplification_bonus =
        if capture && material_balance(engine, player) >= 180 && safe_capture > 0 {
            trade_simplification_bonus(engine, player, mv)
        } else {
            0
        };

    match context.profile {
        PhaseRewardProfile::OpeningEqual => {
            let mut score = 0;
            if quiet_penalty > 0 {
                score += quiet_penalty / 4;
            }
            if capture && !gives_check && !passed_pawn {
                score -= 12;
            }
            score
        }
        PhaseRewardProfile::MiddlegameEqual => {
            let mut score = 0;
            if progress > 0 {
                score += progress / 10;
            }
            if quiet_penalty > 0 {
                score += quiet_penalty / 3;
            }
            score
        }
        PhaseRewardProfile::MiddlegameAhead => {
            let mut score = 0;
            if progress > 0 {
                score += progress / 8;
            }
            if gives_check {
                score += PHASE_REWARD_MIDDLEGAME_AHEAD_FORCE;
            }
            if safe_capture > 0 {
                score += PHASE_REWARD_MIDDLEGAME_AHEAD_SAFE_CAPTURE + safe_capture / 4;
            }
            score += simplification_bonus / 2;
            if passed_pawn {
                score += PHASE_REWARD_MIDDLEGAME_AHEAD_PASSED_PAWN;
            }
            if promotion_swing > 0 {
                score += PHASE_REWARD_MIDDLEGAME_AHEAD_PROMOTION * promotion_swing;
            }
            if king_activity {
                score += PHASE_REWARD_MIDDLEGAME_AHEAD_MOBILITY;
            }
            score += mobility_pressure;
            if quiet_penalty > 0 {
                score += quiet_penalty + PHASE_REWARD_MIDDLEGAME_AHEAD_ANTI_STALL;
            }
            if repetition_score > 0 {
                score -= repetition_score * PHASE_REWARD_MIDDLEGAME_AHEAD_REPETITION;
            }
            score
        }
        PhaseRewardProfile::MiddlegameWinning => {
            let mut score = 0;
            if progress > 0 {
                score += progress / 6;
            }
            if gives_check {
                score += PHASE_REWARD_MIDDLEGAME_WINNING_FORCE;
            }
            if safe_capture > 0 {
                score += PHASE_REWARD_MIDDLEGAME_WINNING_SAFE_CAPTURE + safe_capture / 3;
            }
            score += simplification_bonus
                + if capture {
                    PHASE_REWARD_MIDDLEGAME_WINNING_SIMPLIFY
                } else {
                    0
                };
            if passed_pawn {
                score += PHASE_REWARD_MIDDLEGAME_WINNING_PASSED_PAWN;
            }
            if promotion_swing > 0 {
                score += PHASE_REWARD_MIDDLEGAME_WINNING_PROMOTION * promotion_swing;
            }
            if king_activity {
                score += PHASE_REWARD_MIDDLEGAME_WINNING_MOBILITY;
            }
            score += boxing_score / 4 + mobility_pressure;
            if quiet_penalty > 0 {
                score += quiet_penalty * 2 + PHASE_REWARD_MIDDLEGAME_WINNING_ANTI_STALL;
            }
            if repetition_score > 0 {
                score -= repetition_score * PHASE_REWARD_MIDDLEGAME_WINNING_REPETITION;
            }
            score
        }
        PhaseRewardProfile::EqualEndgame => {
            let mut score = 0;
            if passed_pawn {
                score += PHASE_REWARD_EQUAL_ENDGAME_PASSED_PAWN;
            }
            if king_activity {
                score += PHASE_REWARD_EQUAL_ENDGAME_KING_ACTIVITY;
            }
            if repetition_score > 0 {
                score -= PHASE_REWARD_EQUAL_ENDGAME_REPETITION;
            }
            score
        }
        PhaseRewardProfile::WinningEndgame => {
            let mut score = 0;
            if capture {
                score += PHASE_REWARD_WINNING_ENDGAME_TRADE;
            }
            if passed_pawn {
                score += PHASE_REWARD_WINNING_ENDGAME_PASSED_PAWN;
            }
            if king_activity {
                score += PHASE_REWARD_WINNING_ENDGAME_BOXING / 2;
            }
            score += boxing_score;
            if quiet_penalty > 0 {
                score += quiet_penalty + PHASE_REWARD_WINNING_ENDGAME_ANTI_STALL;
            }
            if repetition_score > 0 {
                score -= repetition_score * PHASE_REWARD_WINNING_ENDGAME_REPETITION;
            }
            score
        }
        PhaseRewardProfile::LosingEndgame => {
            let mut score = 0;
            if repetition_score > 0 {
                score += repetition_score * PHASE_REWARD_LOSING_ENDGAME_REPETITION;
            }
            if gives_check {
                score += PHASE_REWARD_LOSING_ENDGAME_CHECK;
            }
            if progress > 0 {
                score += PHASE_REWARD_LOSING_ENDGAME_COUNTERPLAY + progress / 8;
            }
            if capture {
                score -= PHASE_REWARD_LOSING_ENDGAME_TRADE_REDUCTION;
            }
            score
        }
    }
}

pub(crate) fn phase_profile_practical_bonus(
    engine: &Engine,
    player: PlayerId,
    mv: &Action,
    search_score: i32,
) -> i32 {
    if !phase_reward_enabled() {
        return 0;
    }

    let progress = progress_move_score(engine, player, mv);
    let repetition_score = repetition_signal(engine, player, mv);
    let quiet_penalty = quiet_non_progress_penalty(engine, player, mv, progress);
    let context = phase_reward_context(engine, search_score);
    let safe_capture = capture_safety_signal(engine, player, mv);
    let promotion_swing = promotion_race_signal(engine, player, mv);

    match context.profile {
        PhaseRewardProfile::OpeningEqual => {
            if quiet_penalty > 0 {
                quiet_penalty / 3
            } else {
                0
            }
        }
        PhaseRewardProfile::MiddlegameEqual => {
            if quiet_penalty > 0 {
                quiet_penalty / 2
            } else {
                0
            }
        }
        PhaseRewardProfile::MiddlegameAhead => {
            let mut score = 0;
            if is_shuffle_move(engine, player, mv) {
                score -= shuffle_penalty(engine, player) / 6;
            }
            if quiet_penalty > 0 {
                score += quiet_penalty + PHASE_REWARD_MIDDLEGAME_AHEAD_ANTI_STALL;
            }
            if safe_capture > 0 {
                score += PHASE_REWARD_MIDDLEGAME_AHEAD_SAFE_CAPTURE / 2;
            }
            if promotion_swing > 0 {
                score += promotion_swing * (PHASE_REWARD_MIDDLEGAME_AHEAD_PROMOTION / 2);
            }
            if repetition_score > 0 {
                score -= repetition_score * PHASE_REWARD_MIDDLEGAME_AHEAD_REPETITION;
            }
            score
        }
        PhaseRewardProfile::MiddlegameWinning => {
            let mut score = 0;
            if is_shuffle_move(engine, player, mv) {
                score -= shuffle_penalty(engine, player) / 3;
            }
            if quiet_penalty > 0 {
                score += quiet_penalty * 2 + PHASE_REWARD_MIDDLEGAME_WINNING_ANTI_STALL;
            }
            if safe_capture > 0 {
                score += PHASE_REWARD_MIDDLEGAME_WINNING_SAFE_CAPTURE / 2;
            }
            if promotion_swing > 0 {
                score += promotion_swing * PHASE_REWARD_MIDDLEGAME_WINNING_PROMOTION;
            }
            if repetition_score > 0 {
                score -= repetition_score * PHASE_REWARD_MIDDLEGAME_WINNING_REPETITION;
            }
            score
        }
        PhaseRewardProfile::EqualEndgame => {
            let mut score = 0;
            if repetition_score > 0 {
                score -= repetition_score * (PHASE_REWARD_EQUAL_ENDGAME_REPETITION / 2);
            }
            score
        }
        PhaseRewardProfile::WinningEndgame => {
            let mut score = 0;
            if is_shuffle_move(engine, player, mv) {
                score -= shuffle_penalty(engine, player) / 4;
            }
            if quiet_penalty > 0 {
                score += quiet_penalty * 2;
            }
            if repetition_score > 0 {
                score -= repetition_score * PHASE_REWARD_WINNING_ENDGAME_REPETITION;
            }
            score
        }
        PhaseRewardProfile::LosingEndgame => {
            if repetition_score > 0 {
                repetition_score * PHASE_REWARD_LOSING_ENDGAME_REPETITION
            } else {
                0
            }
        }
    }
}

pub(crate) fn phase_reward_context(engine: &Engine, search_score: i32) -> PhaseRewardContext {
    let phase = detect_phase_reward_phase(engine);
    let band = detect_phase_reward_band(search_score);
    let profile = phase_reward_profile(phase, band);

    PhaseRewardContext {
        phase,
        band,
        profile,
    }
}

pub(crate) fn detect_phase_reward_phase(engine: &Engine) -> PracticalPhase {
    detect_phase(
        engine.action_log.len(),
        engine.units.len(),
        total_non_pawn_material(engine),
    )
}

pub(crate) fn detect_phase_reward_band(search_score: i32) -> PracticalBand {
    detect_advantage_band(search_score)
}

pub(crate) fn maybe_emit_phase_profile(engine: &Engine, search_score: i32) {
    if !phase_reward_enabled() {
        return;
    }

    let context = phase_reward_context(engine, search_score);
    if std::env::var("TCS_DEBUG").is_ok() {
        println!(
            "PHASE_PROFILE|phase={}|band={}|profile={}",
            context.phase.as_str(),
            context.band.as_str(),
            context.profile.as_str(),
        );
    }
}

fn closest_passed_pawn_distance(engine: &Engine, player: PlayerId) -> i32 {
    let mut best = 8;

    for unit in engine.units.values() {
        if unit.owner != player || unit.kind != ChessPieceKind::Pawn {
            continue;
        }

        if !is_true_passed_pawn(engine, player, unit.position) {
            continue;
        }

        let distance = if player == 1 {
            (7 - unit.position.y) as i32
        } else {
            unit.position.y as i32
        };
        best = best.min(distance);
    }

    best
}

pub fn tactical_score_breakdown(
    engine: &Engine,
    player: PlayerId,
    mv: &Action,
    search_score: i32,
) -> TacticalScoreBreakdown {
    let mut out = TacticalScoreBreakdown::default();
    out.mate = mate_urgency_bonus(search_score);

    let mut sim = engine.clone();
    let Some(undo) = sim.simulate_action_for_search(player, mv) else {
        out.final_score = out.mate;
        return out;
    };

    if see_enabled() {
        out.see = see_bonus(engine, &sim, player, mv);
    }

    if hanging_guard_enabled() {
        out.hanging = hanging_guard_penalty(engine, &sim, player, mv);
    }

    out.trade = trade_sanity_bonus(engine, &sim, player, mv);
    out.quiet = quiet_nonsense_penalty(engine, &sim, player, mv);
    out.final_score = out.see + out.hanging + out.mate + out.trade + out.quiet;

    let _ = sim.undo_action_for_search(undo);
    out
}

pub fn tactical_diagnostics_enabled() -> bool {
    std::env::var("TCS_TACTICAL_DIAG").ok().as_deref() == Some("1")
}

pub fn reply_scan_enabled() -> bool {
    std::env::var("TCS_REPLY_SCAN").ok().as_deref() != Some("0")
}

pub fn reply_scan_breakdown(
    engine: &Engine,
    player: PlayerId,
    mv: &Action,
    reply_limit: usize,
) -> ReplyScanBreakdown {
    let mut out = ReplyScanBreakdown {
        enemy_best_move: "none".to_string(),
        ..ReplyScanBreakdown::default()
    };
    if !reply_scan_enabled() {
        return out;
    }

    let mut sim = engine.clone();
    let Some(undo) = sim.simulate_action_for_search(player, mv) else {
        return out;
    };

    let enemy = opponent(player);
    let my_balance_after = material_balance(&sim, player);
    let replies = sim.legal_actions(enemy);
    let mut scored_replies: Vec<(Action, i32)> = replies
        .into_iter()
        .map(|reply| {
            let score = quick_reply_order_score(&mut sim, enemy, &reply);
            (reply, score)
        })
        .collect();
    scored_replies.sort_by(|a, b| b.1.cmp(&a.1));

    for (reply, _) in scored_replies.into_iter().take(reply_limit.max(1)) {
        let uci = action_to_uci_safe(&reply, &sim);
        let penalty = reply_penalty_after_move(&sim, player, enemy, &reply, my_balance_after);
        if penalty > out.penalty {
            out.penalty = penalty;
            out.enemy_best_move = uci;
        }
    }

    let _ = sim.undo_action_for_search(undo);
    out
}

pub fn tactical_safety_filter_breakdown(
    engine: &Engine,
    player: PlayerId,
    mv: &Action,
    legal_move_count: usize,
) -> TacticalSafetyBreakdown {
    let mut out = TacticalSafetyBreakdown {
        enemy_best_move: "none".to_string(),
        ..TacticalSafetyBreakdown::default()
    };

    if legal_move_count <= 1 {
        return out;
    }

    let mut sim = engine.clone();
    let Some(undo) = sim.simulate_action_for_search(player, mv) else {
        return out;
    };

    let enemy = opponent(player);
    let enemy_moves_before = engine.legal_actions(enemy).len();
    let my_balance_after = material_balance(&sim, player);
    out.material_advantage = material_balance(engine, player);
    out.gives_check = sim.is_in_check(enemy);

    if let Action::Move {
        unit_id, target, ..
    } = mv
    {
        if let Some(moved) = sim.units.get(unit_id) {
            out.moved_piece_hanging = moved.kind != ChessPieceKind::King
                && square_is_hanging(&sim, enemy, player, *target);
        }
        out.creates_capture_threat = newly_attacks_valuable_piece(&sim, player, *target);
        out.increases_complexity = sim.legal_actions(enemy).len() > enemy_moves_before
            || fork_targets_on_square(&sim, player, *target) >= 2
            || imminent_promotion_threat(&sim, player);
    }

    let mut forcing_replies = Vec::new();
    let mut quiet_replies = Vec::new();
    let replies = sim.legal_actions(enemy);
    let mut scored_replies: Vec<(Action, i32)> = replies
        .into_iter()
        .map(|reply| {
            let score = quick_reply_order_score(&mut sim, enemy, &reply);
            (reply, score)
        })
        .collect();
    scored_replies.sort_by(|a, b| b.1.cmp(&a.1));

    for (reply, _) in scored_replies {
        if is_forcing_reply(&sim, player, enemy, &reply) {
            forcing_replies.push(reply);
        } else {
            quiet_replies.push(reply);
        }
    }

    for reply in forcing_replies
        .into_iter()
        .take(TACTICAL_SAFETY_FORCING_REPLY_LIMIT)
    {
        record_tactical_safety_reply(
            &mut sim,
            player,
            enemy,
            mv,
            &reply,
            my_balance_after,
            &mut out,
            true,
        );
    }

    for reply in quiet_replies {
        record_tactical_safety_reply(
            &mut sim,
            player,
            enemy,
            mv,
            &reply,
            my_balance_after,
            &mut out,
            false,
        );
    }

    let loses_piece =
        out.moved_piece_captured || out.material_drop >= piece_value(ChessPieceKind::Pawn);
    let mut penalty = if loses_piece {
        -TACTICAL_SAFETY_LOSS_PENALTY
    } else if out.moved_piece_hanging {
        -TACTICAL_SAFETY_HANGING_PENALTY
    } else {
        0
    };

    if out.material_advantage <= TACTICAL_SAFETY_LOSING_THRESHOLD && !out.forcing_reply_loss {
        penalty /= 2;
        if out.gives_check {
            out.compensation_bonus += TACTICAL_SAFETY_CHECK_COMPENSATION;
        }
        if out.creates_capture_threat {
            out.compensation_bonus += TACTICAL_SAFETY_THREAT_COMPENSATION;
        }
        if out.increases_complexity {
            out.compensation_bonus += TACTICAL_SAFETY_COMPLEXITY_COMPENSATION;
        }
    }

    if out.gives_check {
        penalty /= 2;
    }
    out.penalty = penalty + out.compensation_bonus;

    let _ = sim.undo_action_for_search(undo);
    out
}

fn record_tactical_safety_reply(
    sim: &mut Engine,
    player: PlayerId,
    enemy: PlayerId,
    original_move: &Action,
    reply: &Action,
    my_balance_after: i32,
    out: &mut TacticalSafetyBreakdown,
    forcing: bool,
) {
    let uci = action_to_uci_safe(reply, sim);
    let Some(reply_undo) = sim.simulate_action_for_search(enemy, reply) else {
        return;
    };

    let material_drop = (my_balance_after - material_balance(sim, player)).max(0);
    let moved_piece_captured = match original_move {
        Action::Move { unit_id, .. } => !sim.units.contains_key(unit_id),
        _ => false,
    };

    if forcing && (moved_piece_captured || material_drop >= piece_value(ChessPieceKind::Pawn)) {
        out.forcing_reply_loss = true;
    }

    if moved_piece_captured
        || material_drop > out.material_drop
        || (material_drop == out.material_drop && out.enemy_best_move == "none")
    {
        out.material_drop = material_drop;
        out.moved_piece_captured = moved_piece_captured;
        out.enemy_best_move = uci;
    }

    let _ = sim.undo_action_for_search(reply_undo);
}

fn is_forcing_reply(
    engine: &Engine,
    root_player: PlayerId,
    enemy: PlayerId,
    reply: &Action,
) -> bool {
    if matches!(
        reply,
        Action::Move {
            promotion: Some(_),
            ..
        }
    ) {
        return true;
    }

    let mut sim = engine.clone();
    let Some(undo) = sim.simulate_action_for_search(enemy, reply) else {
        return false;
    };

    let forcing =
        capture_context(engine, &sim, enemy, reply).is_some() || sim.is_in_check(root_player);
    let _ = sim.undo_action_for_search(undo);
    forcing
}

fn see_enabled() -> bool {
    std::env::var("TCS_SEE_LITE").ok().as_deref() != Some("0")
}

fn hanging_guard_enabled() -> bool {
    std::env::var("TCS_HANGING_GUARD").ok().as_deref() != Some("0")
}

fn mate_urgency_bonus(search_score: i32) -> i32 {
    if search_score >= TACTICAL_MATE_THRESHOLD {
        200_000 + (900_000 - search_score).max(0) * 20
    } else if search_score <= -TACTICAL_MATE_THRESHOLD {
        -180_000 + (search_score + 900_000).abs().min(10_000) * 2
    } else {
        0
    }
}

fn path_clear_excl(engine: &Engine, from: Position, to: Position, excluded: &[Position]) -> bool {
    let step_x = (to.x as i32 - from.x as i32).signum();
    let step_y = (to.y as i32 - from.y as i32).signum();
    let mut x = from.x as i32 + step_x;
    let mut y = from.y as i32 + step_y;

    while x != to.x as i32 || y != to.y as i32 {
        if engine.units.values().any(|u| {
            u.position.x as i32 == x
                && u.position.y as i32 == y
                && !excluded
                    .iter()
                    .any(|ex| ex.x as i32 == x && ex.y as i32 == y)
        }) {
            return false;
        }
        x += step_x;
        y += step_y;
    }
    true
}

fn attacks_square_excl(
    engine: &Engine,
    kind: ChessPieceKind,
    owner: PlayerId,
    from: Position,
    to: Position,
    excluded: &[Position],
) -> bool {
    if from == to {
        return false;
    }
    let dx = to.x as i32 - from.x as i32;
    let dy = to.y as i32 - from.y as i32;
    let adx = dx.abs();
    let ady = dy.abs();

    match kind {
        ChessPieceKind::Pawn => {
            if owner == 1 {
                dy == 1 && adx == 1
            } else {
                dy == -1 && adx == 1
            }
        }
        ChessPieceKind::Knight => (adx == 1 && ady == 2) || (adx == 2 && ady == 1),
        ChessPieceKind::Bishop => adx == ady && path_clear_excl(engine, from, to, excluded),
        ChessPieceKind::Rook => (dx == 0 || dy == 0) && path_clear_excl(engine, from, to, excluded),
        ChessPieceKind::Queen => {
            ((adx == ady) || dx == 0 || dy == 0) && path_clear_excl(engine, from, to, excluded)
        }
        ChessPieceKind::King => adx <= 1 && ady <= 1,
    }
}

/// Recursive SEE: returns the maximum gain for `side_to_move` from exchanges on `target`.
/// `value_on_target` is the piece currently on `target` (available to be captured).
/// `excluded` accumulates positions of pieces already removed during the exchange sequence;
/// sliding pieces can gain X-ray vision through them.
fn see_full(
    engine: &Engine,
    target: Position,
    value_on_target: i32,
    side_to_move: PlayerId,
    excluded: &mut Vec<Position>,
) -> i32 {
    let cheapest = engine
        .units
        .values()
        .filter(|u| {
            u.owner == side_to_move
                && !excluded.contains(&u.position)
                && attacks_square_excl(engine, u.kind, u.owner, u.position, target, excluded)
        })
        .min_by_key(|u| piece_value(u.kind));

    let Some(attacker) = cheapest else {
        return 0;
    };

    let attacker_pos = attacker.position;
    let attacker_value = piece_value(attacker.kind);

    excluded.push(attacker_pos);
    let opp_gain = see_full(engine, target, attacker_value, opponent(side_to_move), excluded);
    excluded.pop();

    // Side to move can always decline the recapture (take the max with 0).
    (value_on_target - opp_gain).max(0)
}

fn see_bonus(engine: &Engine, sim: &Engine, player: PlayerId, mv: &Action) -> i32 {
    let Action::Move { target, .. } = mv else {
        return 0;
    };
    let Some((captured_kind, moved_kind)) = capture_context(engine, sim, player, mv) else {
        return 0;
    };

    let capture_value = piece_value(captured_kind);
    let moved_value = piece_value(moved_kind);
    let enemy = opponent(player);

    // sim reflects the board after our capture: captured piece removed, mover on target.
    // Opponent now has first right to recapture; run full SEE from sim's board.
    let mut excluded: Vec<Position> = Vec::new();
    let recapture_gain = see_full(sim, *target, moved_value, enemy, &mut excluded);
    let exchange = capture_value - recapture_gain;

    if exchange > 0 {
        160 + exchange.min(1_200)
    } else if exchange == 0 {
        24
    } else {
        exchange.max(-1_200) - moved_value / 2
    }
}

fn hanging_guard_penalty(engine: &Engine, sim: &Engine, player: PlayerId, mv: &Action) -> i32 {
    let mut penalty = 0;
    let enemy = opponent(player);

    let Action::Move {
        unit_id, target, ..
    } = mv
    else {
        return 0;
    };

    if let Some(moved) = sim.units.get(unit_id) {
        if square_is_hanging(sim, enemy, player, *target) {
            penalty -= hanging_penalty_for_kind(moved.kind);
        }
    }

    for unit in sim.units.values() {
        if unit.owner != player || unit.kind == ChessPieceKind::King {
            continue;
        }
        if square_is_hanging(sim, enemy, player, unit.position) {
            let before_hanging = engine
                .units
                .values()
                .find(|before| before.id == unit.id)
                .map(|before| square_is_hanging(engine, enemy, player, before.position))
                .unwrap_or(false);
            if !before_hanging {
                penalty -= hanging_penalty_for_kind(unit.kind) / 2;
            }
        }
    }

    penalty
}

fn trade_sanity_bonus(engine: &Engine, sim: &Engine, player: PlayerId, mv: &Action) -> i32 {
    let Action::Move { .. } = mv else {
        return 0;
    };

    let before_balance = material_balance(engine, player);
    let after_balance = material_balance(sim, player);
    let trade_delta = total_material_value(engine) - total_material_value(sim);
    if trade_delta <= 0 {
        return 0;
    }

    let preserves = after_balance >= before_balance - 120;
    if before_balance >= 180 && preserves {
        let mut bonus = 28 + trade_delta / 8;
        if engine.units.len() <= 10 {
            bonus += 24;
        }
        bonus
    } else if before_balance <= -180 && preserves {
        -(24 + trade_delta / 10)
    } else {
        0
    }
}

fn quiet_nonsense_penalty(engine: &Engine, sim: &Engine, player: PlayerId, mv: &Action) -> i32 {
    let Action::Move {
        unit_id, target, ..
    } = mv
    else {
        return 0;
    };
    let Some(before) = engine.units.get(unit_id) else {
        return 0;
    };

    let capture = capture_context(engine, sim, player, mv).is_some();
    let gives_check = sim.is_in_check(opponent(player));
    if capture || gives_check {
        return 0;
    }

    let development = development_gain(before.kind, before.position, *target);
    let king_safety = king_safety_gain(before.kind, before.position, *target);
    let center = center_gain(before.position, *target);
    let threat = newly_attacks_valuable_piece(sim, player, *target);
    let tempo_loss = !development && !king_safety && center <= 0 && !threat;
    let tactical_alternative_exists = engine
        .legal_actions(player)
        .into_iter()
        .any(|candidate| candidate_creates_tactical_pressure(engine, player, &candidate));

    if tempo_loss && tactical_alternative_exists {
        -36
    } else {
        0
    }
}

fn candidate_creates_tactical_pressure(engine: &Engine, player: PlayerId, mv: &Action) -> bool {
    let mut sim = engine.clone();
    let Some(undo) = sim.simulate_action_for_search(player, mv) else {
        return false;
    };
    let out = capture_context(engine, &sim, player, mv).is_some()
        || sim.is_in_check(opponent(player))
        || match mv {
            Action::Move { target, .. } => newly_attacks_valuable_piece(&sim, player, *target),
            _ => false,
        };
    let _ = sim.undo_action_for_search(undo);
    out
}

fn quick_reply_order_score(engine: &mut Engine, player: PlayerId, mv: &Action) -> i32 {
    let mut score = 0;

    if matches!(
        mv,
        Action::Move {
            promotion: Some(_),
            ..
        }
    ) {
        score += 30_000;
    }

    let e = &*engine;
    if let Some((captured, _)) = capture_context(e, e, player, mv) {
        score += 10_000 + piece_value(captured) * 8;
    }

    if let Some(undo) = engine.simulate_action_for_search(player, mv) {
        if engine.is_in_check(opponent(player)) {
            score += 4_000;
        }
        if let Action::Move { target, .. } = mv {
            score += fork_targets_on_square(engine, player, *target) * 600;
            if imminent_promotion_threat(engine, player) {
                score += 2_400;
            }
        }
        let _ = engine.undo_action_for_search(undo);
    }

    score
}

fn reply_penalty_after_move(
    engine: &Engine,
    player: PlayerId,
    enemy: PlayerId,
    reply: &Action,
    my_balance_after: i32,
) -> i32 {
    let mut sim = engine.clone();
    let Some(undo) = sim.simulate_action_for_search(enemy, reply) else {
        return 0;
    };

    let mut penalty = 0;

    if sim.game_over() && sim.winner() == Some(enemy) {
        penalty += 220_000;
    } else if sim.is_in_check(player) {
        let escapes = sim.legal_actions(player).len();
        if escapes <= 2 {
            penalty += 2_200 - (escapes as i32 * 400);
        }
    }

    if matches!(
        reply,
        Action::Move {
            promotion: Some(_),
            ..
        }
    ) {
        penalty += 1_400;
    } else if imminent_promotion_threat(&sim, enemy) {
        penalty += 900;
    }

    if let Some((captured_kind, _)) = capture_context(engine, &sim, enemy, reply) {
        let captured_value = piece_value(captured_kind);
        penalty += if captured_value >= 500 {
            captured_value + 260
        } else if captured_value >= 300 {
            captured_value + 140
        } else {
            captured_value / 2
        };
    }

    let material_swing = (my_balance_after - material_balance(&sim, player)).max(0);
    penalty += material_swing * 2;

    if let Action::Move { target, .. } = reply {
        let fork_targets = fork_targets_on_square(&sim, enemy, *target);
        if fork_targets >= 2 {
            penalty += 320 + (fork_targets - 2) * 80;
        }
    }

    for unit in sim.units.values() {
        if unit.owner != player || unit.kind == ChessPieceKind::King {
            continue;
        }
        if square_is_hanging(&sim, enemy, player, unit.position) {
            penalty += hanging_penalty_for_kind(unit.kind) / 2;
        }
    }

    let _ = sim.undo_action_for_search(undo);
    penalty
}

fn fork_targets_on_square(engine: &Engine, player: PlayerId, square: Position) -> i32 {
    let moved_kind = piece_kind_at(engine, square);
    engine
        .units
        .values()
        .filter(|u| {
            u.owner == opponent(player)
                && u.kind != ChessPieceKind::Pawn
                && attacks_square(engine, moved_kind, player, square, u.position)
        })
        .count() as i32
}

pub fn imminent_promotion_threat(engine: &Engine, player: PlayerId) -> bool {
    engine.units.values().any(|unit| {
        if unit.owner != player || unit.kind != ChessPieceKind::Pawn {
            return false;
        }

        match player {
            1 => unit.position.y >= 6,
            _ => unit.position.y <= 1,
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chess::fen::engine_from_fen;
    use crate::chess::uci::action_to_uci;

    #[test]
    fn phase_reward_profile_maps_middlegame_equal_to_equal_profile() {
        assert_eq!(
            phase_reward_profile(PracticalPhase::Middlegame, PracticalBand::Equal),
            PhaseRewardProfile::MiddlegameEqual
        );
    }

    #[test]
    fn phase_reward_profile_maps_middlegame_ahead_to_ahead_profile() {
        assert_eq!(
            phase_reward_profile(PracticalPhase::Middlegame, PracticalBand::Ahead),
            PhaseRewardProfile::MiddlegameAhead
        );
    }

    #[test]
    fn phase_reward_profile_maps_middlegame_winning_to_winning_profile() {
        assert_eq!(
            phase_reward_profile(PracticalPhase::Middlegame, PracticalBand::Winning),
            PhaseRewardProfile::MiddlegameWinning
        );
    }

    #[test]
    fn phase_reward_profile_keeps_winning_endgame_mapping() {
        assert_eq!(
            phase_reward_profile(PracticalPhase::Endgame, PracticalBand::Winning),
            PhaseRewardProfile::WinningEndgame
        );
    }

    #[test]
    fn conversion_controller_default_enabled_or_disabled_as_before() {
        std::env::remove_var("TCS_CONVERSION_CONTROLLER");
        assert!(conversion_controller_enabled());

        std::env::set_var("TCS_CONVERSION_CONTROLLER", "0");
        assert!(!conversion_controller_enabled());

        std::env::remove_var("TCS_CONVERSION_CONTROLLER");
    }

    #[test]
    fn tactical_safety_penalizes_hanging_moved_piece() {
        let engine = engine_from_fen("4k3/8/8/2b5/8/8/3Q4/4K3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let legal = engine.legal_actions(player);
        let blunder = legal
            .iter()
            .find(|mv| action_to_uci(mv, &engine.units).as_deref() == Some("d2e3"))
            .expect("hanging move available");

        let safety = tactical_safety_filter_breakdown(&engine, player, blunder, legal.len());

        assert!(safety.moved_piece_hanging);
        assert_eq!(safety.penalty, -TACTICAL_SAFETY_HANGING_PENALTY);
    }

    #[test]
    fn tactical_safety_penalizes_immediate_moved_piece_capture() {
        let engine = engine_from_fen("3rk3/8/8/8/8/8/3Q4/4K3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let legal = engine.legal_actions(player);
        let blunder = legal
            .iter()
            .find(|mv| action_to_uci(mv, &engine.units).as_deref() == Some("d2d4"))
            .expect("capturable move available");

        let safety = tactical_safety_filter_breakdown(&engine, player, blunder, legal.len());

        assert!(safety.moved_piece_captured);
        assert!(safety.material_drop >= piece_value(ChessPieceKind::Pawn));
        assert_eq!(safety.penalty, -TACTICAL_SAFETY_LOSS_PENALTY);
    }

    #[test]
    fn tactical_safety_keeps_full_penalty_for_forcing_loss_when_losing() {
        let engine = engine_from_fen("q2rk3/8/8/8/8/8/3Q4/4K3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let legal = engine.legal_actions(player);
        let counterplay = legal
            .iter()
            .find(|mv| action_to_uci(mv, &engine.units).as_deref() == Some("d2d4"))
            .expect("capturable counterplay move available");

        let safety = tactical_safety_filter_breakdown(&engine, player, counterplay, legal.len());

        assert!(safety.material_advantage <= TACTICAL_SAFETY_LOSING_THRESHOLD);
        assert!(safety.moved_piece_captured);
        assert!(safety.forcing_reply_loss);
        assert_eq!(safety.compensation_bonus, 0);
        assert_eq!(safety.penalty, -TACTICAL_SAFETY_LOSS_PENALTY);
    }

    #[test]
    fn tactical_safety_skips_only_legal_move() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let legal = engine.legal_actions(player);
        let mv = legal.first().expect("legal move");

        let safety = tactical_safety_filter_breakdown(&engine, player, mv, 1);

        assert_eq!(safety.penalty, 0);
        assert_eq!(safety.enemy_best_move, "none");
    }
}

fn action_to_uci_safe(action: &Action, engine: &Engine) -> String {
    crate::chess::uci::action_to_uci(action, &engine.units).unwrap_or_else(|| "unknown".to_string())
}

fn capture_context(
    engine: &Engine,
    sim: &Engine,
    player: PlayerId,
    mv: &Action,
) -> Option<(ChessPieceKind, ChessPieceKind)> {
    let Action::Move {
        unit_id, target, ..
    } = mv
    else {
        return None;
    };
    let moved_kind = sim.units.get(unit_id)?.kind;

    if let Some(captured) = engine
        .units
        .values()
        .find(|u| u.owner == opponent(player) && u.position == *target)
    {
        return Some((captured.kind, moved_kind));
    }

    let mover_before = engine.units.get(unit_id)?;
    if mover_before.kind == ChessPieceKind::Pawn
        && mover_before.position.x != target.x
        && engine.units.values().all(|u| u.position != *target)
    {
        let capture_square = Position {
            x: target.x,
            y: mover_before.position.y,
        };
        if let Some(captured) = engine
            .units
            .values()
            .find(|u| u.owner == opponent(player) && u.position == capture_square)
        {
            return Some((captured.kind, moved_kind));
        }
    }

    None
}

fn square_is_hanging(
    engine: &Engine,
    attacker: PlayerId,
    defender: PlayerId,
    square: Position,
) -> bool {
    let attackers = attackers_on_square(engine, attacker, square);
    let defenders = attackers_on_square(engine, defender, square);

    (!attackers.is_empty() && defenders.len() < attackers.len())
        || match (cheapest_value(&attackers), cheapest_value(&defenders)) {
            (Some(a), Some(d)) => a < d,
            (Some(_), None) => true,
            _ => false,
        }
}

fn attackers_on_square(engine: &Engine, player: PlayerId, square: Position) -> Vec<i32> {
    engine
        .units
        .values()
        .filter(|u| {
            u.owner == player && attacks_square(engine, u.kind, u.owner, u.position, square)
        })
        .map(|u| piece_value(u.kind))
        .collect()
}

fn cheapest_attacker_value(engine: &Engine, player: PlayerId, square: Position) -> Option<i32> {
    let attackers = attackers_on_square(engine, player, square);
    cheapest_value(&attackers)
}

fn cheapest_value(values: &[i32]) -> Option<i32> {
    values.iter().copied().min()
}

fn newly_attacks_valuable_piece(engine: &Engine, player: PlayerId, from: Position) -> bool {
    let moved_kind = piece_kind_at(engine, from);
    engine.units.values().any(|u| {
        u.owner == opponent(player)
            && piece_value(u.kind) >= 300
            && attacks_square(engine, moved_kind, player, from, u.position)
    })
}

fn piece_kind_at(engine: &Engine, square: Position) -> ChessPieceKind {
    engine
        .units
        .values()
        .find(|u| u.position == square)
        .map(|u| u.kind)
        .unwrap_or(ChessPieceKind::Pawn)
}

fn attacks_square(
    engine: &Engine,
    kind: ChessPieceKind,
    owner: PlayerId,
    from: Position,
    to: Position,
) -> bool {
    if from == to {
        return false;
    }

    let dx = to.x as i32 - from.x as i32;
    let dy = to.y as i32 - from.y as i32;
    let adx = dx.abs();
    let ady = dy.abs();

    match kind {
        ChessPieceKind::Pawn => {
            if owner == 1 {
                dy == 1 && adx == 1
            } else {
                dy == -1 && adx == 1
            }
        }
        ChessPieceKind::Knight => (adx == 1 && ady == 2) || (adx == 2 && ady == 1),
        ChessPieceKind::Bishop => adx == ady && path_clear(engine, from, to),
        ChessPieceKind::Rook => (dx == 0 || dy == 0) && path_clear(engine, from, to),
        ChessPieceKind::Queen => {
            ((adx == ady) || dx == 0 || dy == 0) && path_clear(engine, from, to)
        }
        ChessPieceKind::King => adx <= 1 && ady <= 1,
    }
}

fn path_clear(engine: &Engine, from: Position, to: Position) -> bool {
    let step_x = (to.x as i32 - from.x as i32).signum();
    let step_y = (to.y as i32 - from.y as i32).signum();
    let mut x = from.x as i32 + step_x;
    let mut y = from.y as i32 + step_y;

    while x != to.x as i32 || y != to.y as i32 {
        if engine
            .units
            .values()
            .any(|u| u.position.x as i32 == x && u.position.y as i32 == y)
        {
            return false;
        }
        x += step_x;
        y += step_y;
    }

    true
}

fn development_gain(kind: ChessPieceKind, from: Position, to: Position) -> bool {
    match kind {
        ChessPieceKind::Knight | ChessPieceKind::Bishop => {
            (from.y == 0 || from.y == 7) && to.y != from.y
        }
        _ => false,
    }
}

fn king_safety_gain(kind: ChessPieceKind, from: Position, to: Position) -> bool {
    kind == ChessPieceKind::King && from.x.abs_diff(to.x) == 2
}

fn center_gain(from: Position, to: Position) -> i32 {
    center_bonus(to) - center_bonus(from)
}

fn center_bonus(pos: Position) -> i32 {
    let dx = (pos.x as i32 - 3).abs().min((pos.x as i32 - 4).abs());
    let dy = (pos.y as i32 - 3).abs().min((pos.y as i32 - 4).abs());
    24 - (dx + dy) * 4
}

fn total_material_value(engine: &Engine) -> i32 {
    engine
        .units
        .values()
        .filter(|u| u.kind != ChessPieceKind::King)
        .map(|u| piece_value(u.kind))
        .sum()
}

fn material_balance(engine: &Engine, player: PlayerId) -> i32 {
    let mut mine = 0;
    let mut theirs = 0;
    for unit in engine.units.values() {
        if unit.owner == player {
            mine += piece_value(unit.kind);
        } else {
            theirs += piece_value(unit.kind);
        }
    }
    mine - theirs
}

fn hanging_penalty_for_kind(kind: ChessPieceKind) -> i32 {
    match kind {
        ChessPieceKind::Queen => TACTICAL_QUEEN_HANGING_PENALTY,
        ChessPieceKind::Rook => TACTICAL_ROOK_HANGING_PENALTY,
        ChessPieceKind::Bishop | ChessPieceKind::Knight => TACTICAL_MINOR_HANGING_PENALTY,
        ChessPieceKind::Pawn => TACTICAL_PAWN_HANGING_PENALTY,
        ChessPieceKind::King => 0,
    }
}

fn piece_value(kind: ChessPieceKind) -> i32 {
    match kind {
        ChessPieceKind::Pawn => 100,
        ChessPieceKind::Knight => 320,
        ChessPieceKind::Bishop => 330,
        ChessPieceKind::Rook => 500,
        ChessPieceKind::Queen => 900,
        ChessPieceKind::King => 20_000,
    }
}

fn opponent(player: PlayerId) -> PlayerId {
    if player == 1 {
        2
    } else {
        1
    }
}
