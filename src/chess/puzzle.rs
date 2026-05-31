use crate::chess::fen::engine_from_fen;
use crate::chess::search::opponent;
use crate::chess::uci::action_to_uci;
use crate::engine::action::action::Action;
use crate::engine::action::command::Command;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::{PlayerId, Position};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PuzzleTheme {
    // Niveau 1
    Mate1,
    HangingPiece,
    DefensiveMove,
    // Niveau 2
    MateIn2,
    Fork,
    Pin,
    Skewer,
    DiscoveredAttack,
    Promotion,
    // Niveau 3
    MateIn3,
    AnastasiaMate,
    SmotheredMate,
    BackRankMate,
    HookMate,
    ArabianMate,
    RookEndgame,
    QueenEndgame,
    PawnEndgame,
    // Générique
    Unknown,
}

impl PuzzleTheme {
    pub fn parse(raw: &str) -> Option<Self> {
        match raw {
            "mate1" | "mate_in_1" | "mate" => Some(Self::Mate1),
            "mate_in_2" | "mateIn2"        => Some(Self::MateIn2),
            "mate_in_3" | "mateIn3"        => Some(Self::MateIn3),
            "fork"                          => Some(Self::Fork),
            "pin"                           => Some(Self::Pin),
            "skewer"                        => Some(Self::Skewer),
            "discovered_attack"             => Some(Self::DiscoveredAttack),
            "hanging_piece"                 => Some(Self::HangingPiece),
            "defensive_move"                => Some(Self::DefensiveMove),
            "promotion"                     => Some(Self::Promotion),
            "anastasias_mate"               => Some(Self::AnastasiaMate),
            "smothered_mate"                => Some(Self::SmotheredMate),
            "back_rank_mate"                => Some(Self::BackRankMate),
            "hook_mate"                     => Some(Self::HookMate),
            "arabian_mate"                  => Some(Self::ArabianMate),
            "rook_endgame"                  => Some(Self::RookEndgame),
            "queen_endgame"                 => Some(Self::QueenEndgame),
            "pawn_endgame"                  => Some(Self::PawnEndgame),
            _                               => Some(Self::Unknown),
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Mate1            => "mate_in_1",
            Self::MateIn2          => "mate_in_2",
            Self::MateIn3          => "mate_in_3",
            Self::Fork             => "fork",
            Self::Pin              => "pin",
            Self::Skewer           => "skewer",
            Self::DiscoveredAttack => "discovered_attack",
            Self::HangingPiece     => "hanging_piece",
            Self::DefensiveMove    => "defensive_move",
            Self::Promotion        => "promotion",
            Self::AnastasiaMate    => "anastasias_mate",
            Self::SmotheredMate    => "smothered_mate",
            Self::BackRankMate     => "back_rank_mate",
            Self::HookMate         => "hook_mate",
            Self::ArabianMate      => "arabian_mate",
            Self::RookEndgame      => "rook_endgame",
            Self::QueenEndgame     => "queen_endgame",
            Self::PawnEndgame      => "pawn_endgame",
            Self::Unknown          => "unknown",
        }
    }

    pub fn difficulty(self) -> u32 {
        match self {
            Self::Mate1 | Self::HangingPiece | Self::DefensiveMove => 1,
            Self::MateIn2 | Self::Fork | Self::Pin | Self::Skewer
            | Self::DiscoveredAttack | Self::Promotion => 2,
            Self::MateIn3 | Self::AnastasiaMate | Self::SmotheredMate
            | Self::BackRankMate | Self::HookMate | Self::ArabianMate
            | Self::RookEndgame | Self::QueenEndgame | Self::PawnEndgame => 3,
            Self::Unknown => 1,
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

#[derive(Clone)]
struct ForkCandidate {
    action_uci: String,
    target_names: Vec<String>,
    targets: Vec<String>,
    is_knight: bool,
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

#[cfg(test)]
mod tests {
    use super::*;

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
}
