use crate::chess::move_features::{
    forward_progress, is_doubled_pawn, is_isolated_pawn, is_protected_pawn, is_true_passed_pawn,
    king_edge_pressure, king_position,
};
use crate::chess::piece_kind::ChessPieceKind;
use crate::chess::search::opponent;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::{PlayerId, Position};

#[allow(dead_code)]
pub(crate) fn evaluate(engine: &Engine, player: PlayerId) -> i32 {
    if engine.game_over() {
        return terminal_score(engine, player, 0);
    }

    let mut score = 0;
    let total_units = engine.units.len() as i32;
    let mut mat = 0;
    let enemy = opponent(player);
    let mut my_bishops = 0;
    let mut enemy_bishops = 0;

    for u in engine.units.values() {
        let piece_score = piece_value(u.kind);
        let mut v = piece_score;
        v += center_bonus(u.position);

        if u.kind == ChessPieceKind::Pawn {
            v += pawn_structure_score(engine, u.owner, u.position);
        }

        if u.kind == ChessPieceKind::Rook {
            v += rook_file_bonus(engine, u.owner, u.position);
        }

        if u.kind == ChessPieceKind::King {
            if total_units <= 8 {
                v += center_bonus(u.position) * 2;
            } else {
                v += king_safety_bonus(engine, u.owner, u.position);
            }
        }

        if u.owner == player {
            if u.kind == ChessPieceKind::Bishop {
                my_bishops += 1;
            }
            mat += piece_score;
            score += v;
        } else {
            if u.kind == ChessPieceKind::Bishop {
                enemy_bishops += 1;
            }
            mat -= piece_score;
            score -= v;
        }
    }

    if my_bishops >= 2 {
        score += 40;
    }

    if enemy_bishops >= 2 {
        score -= 40;
    }

    if total_units <= 20 {
        let my_mobility = engine.legal_actions(player).len() as i32;
        let enemy_mobility = engine.legal_actions(enemy).len() as i32;
        score += my_mobility * 4;
        score -= enemy_mobility * 4;
    }

    let enemy_in_check = engine.is_in_check(enemy);
    let player_in_check = engine.is_in_check(player);

    if enemy_in_check {
        score += 80;
    }

    if player_in_check {
        score -= 120;
    }

    if total_units <= 8 && mat >= 200 {
        score += 180;
    }

    score += endgame_conversion_pressure(engine, player);
    score -= endgame_conversion_pressure(engine, enemy);

    score
}

/// Deterministic static evaluation used by tooling (does not run search).
pub fn static_evaluate(engine: &Engine, player: PlayerId) -> i32 {
    evaluate(engine, player)
}

pub(crate) fn terminal_score(engine: &Engine, player: PlayerId, ply: usize) -> i32 {
    match engine.winner() {
        Some(w) if w == player => 900_000 - ply as i32 * 10,
        Some(_) => -900_000,
        None => draw_score(engine, player),
    }
}

pub(crate) fn piece_value(kind: ChessPieceKind) -> i32 {
    match kind {
        ChessPieceKind::Pawn => 100,
        ChessPieceKind::Knight => 320,
        ChessPieceKind::Bishop => 330,
        ChessPieceKind::Rook => 500,
        ChessPieceKind::Queen => 900,
        ChessPieceKind::King => 20_000,
    }
}

pub(crate) fn center_bonus(pos: Position) -> i32 {
    let dx = (pos.x as i32 - 3).abs().min((pos.x as i32 - 4).abs());
    let dy = (pos.y as i32 - 3).abs().min((pos.y as i32 - 4).abs());
    24 - (dx + dy) * 4
}

pub(crate) fn material_balance(engine: &Engine, player: PlayerId) -> i32 {
    let mut my = 0;
    let mut opp = 0;

    for u in engine.units.values() {
        if u.owner == player {
            my += piece_value(u.kind);
        } else {
            opp += piece_value(u.kind);
        }
    }

    my - opp
}

fn pawn_structure_score(engine: &Engine, owner: PlayerId, pos: Position) -> i32 {
    let mut s = 0;

    if is_true_passed_pawn(engine, owner, pos) {
        let advance = if owner == 1 {
            pos.y as i32
        } else {
            7 - pos.y as i32
        };
        s += 60 + advance * 24;

        if is_protected_pawn(engine, owner, pos) {
            s += 28;
        }
    }

    if is_isolated_pawn(engine, owner, pos) {
        s -= 18;
    }

    if is_doubled_pawn(engine, owner, pos) {
        s -= 14;
    }

    s
}

fn rook_file_bonus(engine: &Engine, owner: PlayerId, pos: Position) -> i32 {
    let my = engine
        .units
        .values()
        .filter(|u| u.owner == owner && u.kind == ChessPieceKind::Pawn && u.position.x == pos.x)
        .count();

    let opp = engine
        .units
        .values()
        .filter(|u| u.owner != owner && u.kind == ChessPieceKind::Pawn && u.position.x == pos.x)
        .count();

    if my == 0 && opp == 0 {
        30
    } else if my == 0 {
        18
    } else {
        0
    }
}

fn king_safety_bonus(engine: &Engine, owner: PlayerId, pos: Position) -> i32 {
    let mut score = 0;
    let back_rank = if owner == 1 { 0 } else { 7 };

    if pos.y == back_rank {
        score += 20;
    }

    let shield_y = if owner == 1 {
        pos.y.saturating_add(1)
    } else {
        pos.y.saturating_sub(1)
    };

    for dx in [-1_i32, 0, 1] {
        let nx = pos.x as i32 + dx;

        if !(0..=7).contains(&nx) {
            continue;
        }

        let p = Position {
            x: nx as u32,
            y: shield_y,
        };

        if let Some(id) = engine.board.occupant(p) {
            if let Some(u) = engine.units.get(&id) {
                if u.owner == owner && u.kind == ChessPieceKind::Pawn {
                    score += 12;
                }
            }
        }
    }

    score
}

fn draw_score(engine: &Engine, player: PlayerId) -> i32 {
    let mat = material_balance(engine, player);

    if mat >= 500 {
        -500
    } else if mat >= crate::chess::search::CLEAR_EDGE_MATERIAL {
        -360
    } else if mat >= 100 {
        -220
    } else if mat <= -500 {
        120
    } else if mat <= -250 {
        60
    } else {
        -70
    }
}

pub(crate) fn total_material_value(engine: &Engine) -> i32 {
    engine
        .units
        .values()
        .filter(|u| u.kind != ChessPieceKind::King)
        .map(|u| piece_value(u.kind))
        .sum()
}

pub(crate) fn total_non_pawn_material(engine: &Engine) -> i32 {
    engine
        .units
        .values()
        .filter(|u| !matches!(u.kind, ChessPieceKind::King | ChessPieceKind::Pawn))
        .map(|u| piece_value(u.kind))
        .sum()
}

pub(crate) fn is_low_material_search_position(engine: &Engine) -> bool {
    engine
        .units
        .values()
        .filter(|u| u.kind != ChessPieceKind::King)
        .count()
        <= 6
}

pub(crate) fn has_non_pawn_material(engine: &Engine, player: PlayerId) -> bool {
    engine.units.values().any(|u| {
        u.owner == player && !matches!(u.kind, ChessPieceKind::King | ChessPieceKind::Pawn)
    })
}

pub(crate) fn is_winning_endgame(engine: &Engine, player: PlayerId) -> bool {
    engine.units.len() <= 10 && material_balance(engine, player) >= 180
}

pub(crate) fn endgame_conversion_pressure(engine: &Engine, player: PlayerId) -> i32 {
    if !is_winning_endgame(engine, player) {
        return 0;
    }

    let mut score = 80 + material_balance(engine, player).min(500) / 10;

    if let (Some(my_king), Some(enemy_king)) = (
        king_position(engine, player),
        king_position(engine, opponent(player)),
    ) {
        score += (14
            - (my_king.x as i32 - enemy_king.x as i32).abs()
            - (my_king.y as i32 - enemy_king.y as i32).abs())
            * 8;
        score += king_edge_pressure(enemy_king) * 18;
    }

    for u in engine.units.values() {
        if u.owner != player || u.kind != ChessPieceKind::Pawn {
            continue;
        }

        if is_true_passed_pawn(engine, player, u.position) {
            score += 35 + forward_progress(player, u.position) * 18;

            if is_protected_pawn(engine, player, u.position) {
                score += 20;
            }
        }
    }

    score
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chess::fen::engine_from_fen;

    #[test]
    fn eval_material_balance_reflects_extra_queen() {
        let engine = engine_from_fen("1Q5k/8/8/8/8/8/8/7K w - - 0 1").expect("valid FEN");
        assert_eq!(material_balance(&engine, 1), 900);
        assert_eq!(material_balance(&engine, 2), -900);
    }

    #[test]
    fn eval_symmetry_start_position_near_equal() {
        let engine = engine_from_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1")
            .expect("valid FEN");
        let white_score = static_evaluate(&engine, 1);
        let black_score = static_evaluate(&engine, 2);
        assert_eq!(white_score, -black_score);
        assert!(white_score.abs() < 400);
    }

    #[test]
    fn eval_winning_endgame_detects_material_edge() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/4P3/4K2R w - - 0 1").expect("valid FEN");
        assert!(is_winning_endgame(&engine, 1));
        assert!(!is_winning_endgame(&engine, 2));
    }

    #[test]
    fn terminal_score_prefers_win_over_draw() {
        let winning = engine_from_fen("7k/6Q1/5K2/8/8/8/8/8 b - - 0 1").expect("valid FEN");
        let draw = engine_from_fen("7k/5Q2/5K2/8/8/8/8/8 b - - 0 1").expect("valid FEN");

        assert!(terminal_score(&winning, 1, 0) > terminal_score(&draw, 1, 0));
        assert!(terminal_score(&winning, 1, 0) > 100_000);
    }
}
