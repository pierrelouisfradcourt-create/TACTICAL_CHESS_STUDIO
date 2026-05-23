use crate::chess::eval::piece_value;
use crate::chess::fen::engine_from_fen;
use crate::chess::search::opponent;
use crate::chess::uci::action_to_uci;
use crate::engine::action::action::Action;
use crate::engine::action::command::Command;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::{PlayerId, Position};
use rand::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PuzzleTheme {
    Mate1,
    Fork,
}

impl PuzzleTheme {
    pub fn parse(raw: &str) -> Option<Self> {
        match raw {
            "mate1" | "mate_in_1" | "mate" => Some(Self::Mate1),
            "fork" => Some(Self::Fork),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Mate1 => "mate1",
            Self::Fork => "fork",
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct PuzzleValidation {
    pub mate: bool,
    pub fork_targets: Vec<String>,
    pub material_gain_hint: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct PuzzleCase {
    pub case_id: String,
    pub fen: String,
    pub side_to_move: u32,
    pub theme: String,
    pub best_moves: Vec<String>,
    pub seed: u64,
    pub difficulty: u32,
    pub validation: PuzzleValidation,
}

const DEFAULT_DIFFICULTY: u32 = 1;
const MAX_RANDOM_ATTEMPTS_PER_CASE: usize = 10_000;
const RANDOM_MOVE_LIMIT: usize = 14;

#[derive(Clone)]
struct ForkCandidate {
    action_uci: String,
    target_names: Vec<String>,
    targets: Vec<String>,
    is_knight: bool,
}

fn base_templates(theme: PuzzleTheme) -> Vec<&'static str> {
    match theme {
        PuzzleTheme::Mate1 => vec![
            "7k/8/5QK1/8/8/8/8/8 w - - 0 1",
            "7k/8/8/8/8/8/5Q2/6K1 w - - 0 1",
            "6k1/8/8/8/8/8/6Q1/6K1 w - - 0 1",
            "7k/8/8/8/8/8/8/Q6K w - - 0 1",
        ],
        PuzzleTheme::Fork => vec![
            "2q1k3/8/8/1N6/8/8/8/6K1 w - - 0 1",
            "4k2q/8/8/6N1/8/8/8/6K1 w - - 0 1",
            "3q4/8/8/3N4/8/8/8/6K1 w - - 0 1",
        ],
    }
}

fn default_fen() -> &'static str {
    "4k3/8/8/8/8/8/4K3/8 w - - 0 1"
}

fn parse_or_default_fen(fen: &str) -> Engine {
    engine_from_fen(fen)
        .or_else(|_| engine_from_fen(default_fen()))
        .unwrap()
}

fn sorted_legal_moves(engine: &Engine, player: PlayerId) -> Vec<(Action, String)> {
    let mut out: Vec<(Action, String)> = engine
        .legal_actions(player)
        .into_iter()
        .filter_map(|action| action_to_uci(&action, &engine.units).map(|uci| (action, uci)))
        .collect();

    out.sort_by(|a, b| a.1.cmp(&b.1));
    out
}

fn random_position(theme: PuzzleTheme, rng: &mut StdRng) -> Engine {
    let templates = base_templates(theme);
    let base = templates.choose(rng).copied().unwrap_or(default_fen());
    let mut engine = parse_or_default_fen(base);

    let plies = rng.gen_range(0..=RANDOM_MOVE_LIMIT);
    for _ in 0..plies {
        let player = engine.turn_manager.current_player;
        let legal = sorted_legal_moves(&engine, player);
        if legal.is_empty() {
            break;
        }

        let idx = rng.gen_range(0..legal.len());
        let (action, _) = legal[idx].clone();
        engine.execute(Command {
            player_id: player,
            action,
        });
    }

    engine
}

fn in_board(x: i32, y: i32) -> bool {
    (0..=7).contains(&x) && (0..=7).contains(&y)
}

fn movement_attacks(
    attacker: crate::chess::piece_kind::ChessPieceKind,
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
        crate::chess::piece_kind::ChessPieceKind::Pawn => {
            let dir = if owner == 1 { 1 } else { -1 };
            dy == dir && adx == 1
        }
        crate::chess::piece_kind::ChessPieceKind::Knight => {
            (adx == 1 && ady == 2) || (adx == 2 && ady == 1)
        }
        crate::chess::piece_kind::ChessPieceKind::Bishop => adx == ady && path_clear(from, to),
        crate::chess::piece_kind::ChessPieceKind::Rook => {
            (dx == 0 || dy == 0) && path_clear(from, to)
        }
        crate::chess::piece_kind::ChessPieceKind::Queen => {
            ((dx == 0 || dy == 0) || adx == ady) && path_clear(from, to)
        }
        crate::chess::piece_kind::ChessPieceKind::King => adx <= 1 && ady <= 1,
    }
}

fn piece_name(kind: crate::chess::piece_kind::ChessPieceKind) -> &'static str {
    match kind {
        crate::chess::piece_kind::ChessPieceKind::Pawn => "pawn",
        crate::chess::piece_kind::ChessPieceKind::Knight => "knight",
        crate::chess::piece_kind::ChessPieceKind::Bishop => "bishop",
        crate::chess::piece_kind::ChessPieceKind::Rook => "rook",
        crate::chess::piece_kind::ChessPieceKind::Queen => "queen",
        crate::chess::piece_kind::ChessPieceKind::King => "king",
    }
}

fn is_high_value_target(kind: crate::chess::piece_kind::ChessPieceKind) -> bool {
    matches!(
        kind,
        crate::chess::piece_kind::ChessPieceKind::Knight
            | crate::chess::piece_kind::ChessPieceKind::Bishop
            | crate::chess::piece_kind::ChessPieceKind::Rook
            | crate::chess::piece_kind::ChessPieceKind::Queen
            | crate::chess::piece_kind::ChessPieceKind::King
    )
}

fn fork_target_names_for_piece_after_move(
    engine: &Engine,
    player: PlayerId,
    mover_pos: Position,
    mover_kind: crate::chess::piece_kind::ChessPieceKind,
) -> Vec<String> {
    let mut names = Vec::new();

    for target in engine.units.values() {
        if target.owner == player {
            continue;
        }

        if !is_high_value_target(target.kind) {
            continue;
        }

        if !in_board(target.position.x as i32, target.position.y as i32) {
            continue;
        }

        if movement_attacks(mover_kind, player, mover_pos, target.position, |pos| {
            engine.board.occupant(pos).is_some()
        }) {
            names.push(piece_name(target.kind).to_string());
        }
    }

    names.sort();
    names.dedup();
    names
}

fn validate_best_move_legal(engine: &Engine, player: PlayerId, uci: &str) -> Option<Action> {
    sorted_legal_moves(engine, player)
        .into_iter()
        .find(|(_, action_uci)| action_uci == uci)
        .map(|(action, _)| action)
}

fn is_mate_after_move(
    engine: &Engine,
    player: PlayerId,
    action: Action,
    action_uci: &str,
) -> Option<String> {
    if action_to_uci(&action, &engine.units).as_deref() != Some(action_uci) {
        return None;
    }

    let mut sim = engine.clone();
    sim.execute(Command {
        player_id: player,
        action,
    });

    if sim.is_checkmate(opponent(player)) {
        Some(action_uci.to_string())
    } else {
        None
    }
}

fn find_mate_moves(engine: &Engine) -> Vec<String> {
    let player = engine.turn_manager.current_player;
    let mut mates = Vec::new();

    for (action, action_uci) in sorted_legal_moves(engine, player) {
        if is_mate_after_move(engine, player, action, &action_uci).is_some() {
            mates.push(action_uci);
        }
    }

    mates
}

fn find_fork_candidates(engine: &Engine) -> Vec<ForkCandidate> {
    let player = engine.turn_manager.current_player;
    let mut out: Vec<ForkCandidate> = Vec::new();

    for (action, action_uci) in sorted_legal_moves(engine, player) {
        let Action::Move { unit_id, .. } = action else {
            continue;
        };

        let Some(_mover_before) = engine.units.get(&unit_id) else {
            continue;
        };

        let mut sim = engine.clone();
        sim.execute(Command {
            player_id: player,
            action,
        });

        let Some(mover_after) = sim.units.get(&unit_id) else {
            continue;
        };

        let target_names = fork_target_names_for_piece_after_move(
            &sim,
            player,
            mover_after.position,
            mover_after.kind,
        );

        let targets: Vec<String> = target_names
            .iter()
            .filter(|name| !name.is_empty())
            .cloned()
            .collect();

        if targets.len() < 2 {
            continue;
        }

        if !(targets.iter().any(|name| name == "king")
            || targets.iter().any(|name| name == "queen"))
        {
            continue;
        }

        out.push(ForkCandidate {
            action_uci,
            target_names: targets.clone(),
            targets,
            is_knight: mover_after.kind == crate::chess::piece_kind::ChessPieceKind::Knight,
        });
    }

    out.sort_by(|a, b| {
        let knight_cmp = b.is_knight.cmp(&a.is_knight);
        if knight_cmp != std::cmp::Ordering::Equal {
            return knight_cmp;
        }

        b.targets
            .len()
            .cmp(&a.targets.len())
            .then_with(|| a.action_uci.cmp(&b.action_uci))
    });

    out
}

fn verify_mate_case(fen: &str, best_moves: &[String]) -> bool {
    let Ok(engine) = engine_from_fen(fen) else {
        return false;
    };

    let player = engine.turn_manager.current_player;
    let opp = opponent(player);

    for uci in best_moves {
        let Some(action) = validate_best_move_legal(&engine, player, uci) else {
            return false;
        };

        let mut sim = engine.clone();
        sim.execute(Command {
            player_id: player,
            action,
        });

        if !sim.is_checkmate(opp) {
            return false;
        }
    }

    true
}

fn verify_fork_case(fen: &str, validation: &PuzzleValidation, best_moves: &[String]) -> bool {
    let Ok(engine) = engine_from_fen(fen) else {
        return false;
    };

    if best_moves.is_empty() {
        return false;
    }

    if validation.fork_targets.is_empty() {
        return false;
    }

    let expected: HashSet<&str> = validation.fork_targets.iter().map(|s| s.as_str()).collect();
    let player = engine.turn_manager.current_player;

    for uci in best_moves {
        let Some(action) = validate_best_move_legal(&engine, player, uci) else {
            return false;
        };

        let Action::Move { unit_id, .. } = action else {
            return false;
        };

        let mut sim = engine.clone();
        sim.execute(Command {
            player_id: player,
            action,
        });

        let Some(mover) = sim.units.get(&unit_id) else {
            return false;
        };

        let actual_targets =
            fork_target_names_for_piece_after_move(&sim, player, mover.position, mover.kind);
        let actual: HashSet<&str> = actual_targets.iter().map(|s| s.as_str()).collect();

        if actual.len() < 2 {
            return false;
        }

        if !actual
            .iter()
            .any(|name| *name == "king" || *name == "queen")
        {
            return false;
        }

        for target in &expected {
            if !actual.contains(target) {
                return false;
            }
        }
    }

    true
}

pub fn validate_case_fen_and_moves(case: &PuzzleCase) -> bool {
    if case.best_moves.is_empty() {
        return false;
    }

    if case.validation.material_gain_hint < 0 {
        return false;
    }

    match case.theme.as_str() {
        "mate_in_1" | "mate1" => {
            if !case.validation.mate {
                return false;
            }
            if !case.validation.fork_targets.is_empty() {
                return false;
            }
            verify_mate_case(&case.fen, &case.best_moves)
        }

        "fork" => {
            if case.validation.mate {
                return false;
            }
            verify_fork_case(&case.fen, &case.validation, &case.best_moves)
        }

        _ => false,
    }
}

fn mate_case(index: usize, seed: u64, engine: &Engine) -> Option<PuzzleCase> {
    let best_moves = find_mate_moves(engine);
    if best_moves.is_empty() {
        return None;
    }

    let case = PuzzleCase {
        case_id: format!("puzzle_mate1_{}_seed{}", index, seed),
        fen: engine.to_fen(),
        side_to_move: engine.turn_manager.current_player,
        theme: "mate_in_1".to_string(),
        best_moves,
        seed,
        difficulty: DEFAULT_DIFFICULTY,
        validation: PuzzleValidation {
            mate: true,
            fork_targets: Vec::new(),
            material_gain_hint: 900,
        },
    };

    if validate_case_fen_and_moves(&case) {
        Some(case)
    } else {
        None
    }
}

fn fork_case(index: usize, seed: u64, engine: &Engine) -> Option<PuzzleCase> {
    let mut candidates = find_fork_candidates(engine);
    if candidates.is_empty() {
        return None;
    }

    let best = candidates.remove(0);

    let target_names = best.target_names.clone();
    let material_gain_hint = target_names
        .iter()
        .filter_map(|name| match name.as_str() {
            "king" => Some(999),
            "queen" => Some(piece_value(crate::chess::piece_kind::ChessPieceKind::Queen)),
            "rook" => Some(piece_value(crate::chess::piece_kind::ChessPieceKind::Rook)),
            "bishop" => Some(piece_value(
                crate::chess::piece_kind::ChessPieceKind::Bishop,
            )),
            "knight" => Some(piece_value(
                crate::chess::piece_kind::ChessPieceKind::Knight,
            )),
            _ => None,
        })
        .max()
        .unwrap_or(0)
        .min(900);

    let case = PuzzleCase {
        case_id: format!("puzzle_fork_{}_seed{}", index, seed),
        fen: engine.to_fen(),
        side_to_move: engine.turn_manager.current_player,
        theme: "fork".to_string(),
        best_moves: vec![best.action_uci],
        seed,
        difficulty: DEFAULT_DIFFICULTY,
        validation: PuzzleValidation {
            mate: false,
            fork_targets: target_names,
            material_gain_hint,
        },
    };

    if validate_case_fen_and_moves(&case) {
        Some(case)
    } else {
        None
    }
}

pub fn generate_puzzle_cases(theme: PuzzleTheme, count: usize, seed: u64) -> Vec<PuzzleCase> {
    let mut rng = StdRng::seed_from_u64(seed);
    let mut out = Vec::new();
    let mut attempts = 0usize;

    while out.len() < count && attempts < count.saturating_mul(MAX_RANDOM_ATTEMPTS_PER_CASE) {
        attempts += 1;
        let engine = random_position(theme, &mut rng);

        let maybe_case = match theme {
            PuzzleTheme::Mate1 => mate_case(out.len(), seed, &engine),
            PuzzleTheme::Fork => fork_case(out.len(), seed, &engine),
        };

        if let Some(case) = maybe_case {
            out.push(case);
        }
    }

    if out.len() < count {
        let mut template_attempt = 0usize;
        let templates = base_templates(theme);
        while out.len() < count {
            let fen = templates[template_attempt % templates.len()];
            template_attempt += 1;

            let engine = parse_or_default_fen(fen);
            let index = out.len();

            let maybe_case = match theme {
                PuzzleTheme::Mate1 => mate_case(index, seed, &engine),
                PuzzleTheme::Fork => fork_case(index, seed, &engine),
            };

            if let Some(case) = maybe_case {
                out.push(case);
            }

            if attempts > count.saturating_add(templates.len() * 3) {
                break;
            }
            attempts += 1;
        }
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    fn serialize_cases(cases: &[PuzzleCase]) -> Vec<String> {
        cases
            .iter()
            .map(|case| serde_json::to_string(case).expect("serialize case"))
            .collect()
    }

    #[test]
    fn mate_in_one_detector_finds_known_mate() {
        let fen = "7k/8/5QK1/8/8/8/8/8 w - - 0 1";
        let engine = engine_from_fen(fen).expect("valid fen");
        let moves = find_mate_moves(&engine);

        assert!(moves.contains(&"f6g7".to_string()));
    }

    #[test]
    fn fork_detector_finds_known_knight_fork() {
        let fen = "2q1k3/8/8/1N6/8/8/8/6K1 w - - 0 1";
        let engine = engine_from_fen(fen).expect("valid fen");
        let candidates = find_fork_candidates(&engine);
        let names: Vec<String> = candidates
            .into_iter()
            .map(|candidate| candidate.action_uci)
            .collect();

        assert!(names.contains(&"b5d6".to_string()));
    }

    #[test]
    fn generated_puzzles_are_reloadable() {
        let cases = generate_puzzle_cases(PuzzleTheme::Mate1, 5, 42);
        assert!(!cases.is_empty());

        for case in &cases {
            assert!(validate_case_fen_and_moves(case));
            assert_eq!(case.theme, "mate_in_1");
            assert!(case.validation.fork_targets.is_empty());
        }

        let fork_cases = generate_puzzle_cases(PuzzleTheme::Fork, 3, 42);
        assert!(!fork_cases.is_empty());

        for case in &fork_cases {
            assert!(validate_case_fen_and_moves(case));
            assert_eq!(case.theme, "fork");
            assert!(matches!(
                case.validation
                    .fork_targets
                    .iter()
                    .any(|target| target == "king" || target == "queen"),
                true
            ));
        }
    }

    #[test]
    fn same_seed_same_output() {
        let a = generate_puzzle_cases(PuzzleTheme::Fork, 6, 99);
        let b = generate_puzzle_cases(PuzzleTheme::Fork, 6, 99);

        assert_eq!(serialize_cases(&a), serialize_cases(&b));
    }
}
