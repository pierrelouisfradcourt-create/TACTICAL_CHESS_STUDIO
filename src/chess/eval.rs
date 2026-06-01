use crate::chess::move_features::{
    forward_progress, is_backward_pawn, is_doubled_pawn, is_isolated_pawn, is_protected_pawn,
    is_true_passed_pawn, king_edge_pressure, king_position,
};
use crate::chess::piece_kind::ChessPieceKind;
use crate::chess::search::opponent;
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::{PlayerId, Position, UnitId};

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
        v += pst_bonus(u.kind, u.owner, u.position);

        if u.kind == ChessPieceKind::Pawn {
            v += pawn_structure_score(engine, u.owner, u.position);
        }

        if u.kind == ChessPieceKind::Rook {
            v += rook_file_bonus(engine, u.owner, u.position);
        }

        if matches!(u.kind, ChessPieceKind::Knight | ChessPieceKind::Bishop) {
            v += minor_piece_development_bonus(engine, u.owner, u.position);
        }

        if u.kind == ChessPieceKind::King {
            if total_non_pawn_material(engine) <= 1300 {
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

    let my_mobility = engine.pseudo_mobility(player) as i32;
    let enemy_mobility = engine.pseudo_mobility(enemy) as i32;
    if total_units <= 20 {
        score += my_mobility * 4;
        score -= enemy_mobility * 4;
    } else {
        score += my_mobility * 2;
        score -= enemy_mobility * 2;
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

    score -= opening_tempo_waste_penalty(engine, player);
    score += opening_tempo_waste_penalty(engine, enemy);

    score
}

/// Deterministic static evaluation used by tooling (does not run search).
pub fn static_evaluate(engine: &Engine, player: PlayerId) -> i32 {
    evaluate(engine, player)
}

pub(crate) fn terminal_score(engine: &Engine, player: PlayerId, ply: usize) -> i32 {
    match engine.winner() {
        Some(w) if w == player => 900_000 - ply as i32 * 10,
        Some(_) => -(900_000 - ply as i32 * 10),
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

#[rustfmt::skip]
const PAWN_PST: [i32; 64] = [
    // y=0 rank 1 (never occupied by pawns)
     0,  0,  0,  0,  0,  0,  0,  0,
    // y=1 rank 2 (starting rank — neutral)
     0,  0,  0,  0,  0,  0,  0,  0,
    // y=2 rank 3
     5, -5,-10,  0,  0,-10, -5,  5,
    // y=3 rank 4 — d4/e4 rewarded
     0,  0,  0, 20, 20,  0,  0,  0,
    // y=4 rank 5
     5,  5, 10, 25, 25, 10,  5,  5,
    // y=5 rank 6
    10, 10, 20, 30, 30, 20, 10, 10,
    // y=6 rank 7
    50, 50, 50, 50, 50, 50, 50, 50,
    // y=7 rank 8 (promotion row)
     0,  0,  0,  0,  0,  0,  0,  0,
];

#[rustfmt::skip]
const KNIGHT_PST: [i32; 64] = [
    // y=0 rank 1 (home rank)
    -50,-40,-30,-30,-30,-30,-40,-50,
    // y=1 rank 2
    -40,-20,  0,  5,  5,  0,-20,-40,
    // y=2 rank 3 — f3/c3 are good
    -30,  5, 10, 15, 15, 10,  5,-30,
    // y=3 rank 4
    -30,  0, 15, 20, 20, 15,  0,-30,
    // y=4 rank 5
    -30,  5, 15, 20, 20, 15,  5,-30,
    // y=5 rank 6
    -30,  0, 10, 15, 15, 10,  0,-30,
    // y=6 rank 7
    -40,-20,  0,  0,  0,  0,-20,-40,
    // y=7 rank 8
    -50,-40,-30,-30,-30,-30,-40,-50,
];

#[rustfmt::skip]
const BISHOP_PST: [i32; 64] = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
];

#[rustfmt::skip]
const ROOK_PST: [i32; 64] = [
    // y=0 rank 1 — d/e open files slightly rewarded
     0,  0,  0,  5,  5,  0,  0,  0,
    // y=1..5 rank 2-6
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    // y=6 rank 7 — 7th rank is powerful
     5, 10, 10, 10, 10, 10, 10,  5,
    // y=7 rank 8
     0,  0,  0,  0,  0,  0,  0,  0,
];

#[rustfmt::skip]
const QUEEN_PST: [i32; 64] = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -10,  5,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
];

fn pst_bonus(kind: ChessPieceKind, owner: PlayerId, pos: Position) -> i32 {
    let idx_white = pos.y as usize * 8 + pos.x as usize;
    let idx = if owner == 1 {
        idx_white
    } else {
        (7 - pos.y as usize) * 8 + pos.x as usize
    };
    match kind {
        ChessPieceKind::Pawn => PAWN_PST[idx],
        ChessPieceKind::Knight => KNIGHT_PST[idx],
        ChessPieceKind::Bishop => BISHOP_PST[idx],
        ChessPieceKind::Rook => ROOK_PST[idx],
        ChessPieceKind::Queen => QUEEN_PST[idx],
        ChessPieceKind::King => 0,
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

    if is_backward_pawn(engine, owner, pos) {
        s -= 15;
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

fn king_zone_attack_count(engine: &Engine, owner: PlayerId, king_pos: Position) -> i32 {
    let enemy = opponent(owner);
    let mut count = 0i32;
    for dy in -1_i32..=1 {
        for dx in -1_i32..=1 {
            let nx = king_pos.x as i32 + dx;
            let ny = king_pos.y as i32 + dy;
            if !(0..=7).contains(&nx) || !(0..=7).contains(&ny) {
                continue;
            }
            let p = Position { x: nx as u32, y: ny as u32 };
            if let Some(id) = engine.board.occupant(p) {
                if let Some(u) = engine.units.get(&id) {
                    if u.owner == enemy {
                        count += 1;
                    }
                }
            }
        }
    }
    count
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

    let zone_attackers = king_zone_attack_count(engine, owner, pos);
    score -= zone_attackers * 25;

    score
}

fn minor_piece_development_bonus(engine: &Engine, owner: PlayerId, pos: Position) -> i32 {
    if engine.turn_manager.turn_index >= 20 {
        return 0;
    }
    let home_rank = if owner == 1 { 0u32 } else { 7u32 };
    if pos.y == home_rank {
        -15
    } else {
        0
    }
}

/// Penalty for moving the same minor piece a second (or more) time in the opening
/// while at least one other minor piece hasn't left the home rank yet.
/// Each wasted tempo costs 20 cp.
fn opening_tempo_waste_penalty(engine: &Engine, owner: PlayerId) -> i32 {
    if engine.turn_manager.turn_index >= 20 {
        return 0;
    }

    let home_rank = if owner == 1 { 0u32 } else { 7u32 };

    let undeveloped = engine
        .units
        .values()
        .filter(|u| {
            u.owner == owner
                && matches!(u.kind, ChessPieceKind::Knight | ChessPieceKind::Bishop)
                && u.position.y == home_rank
        })
        .count() as i32;

    if undeveloped == 0 {
        return 0;
    }

    // Count how many times each living minor piece has appeared in the log for this owner.
    let mut counts: Vec<(UnitId, i32)> = Vec::new();
    for cmd in &engine.action_log {
        if cmd.player_id != owner {
            continue;
        }
        let Action::Move { unit_id, .. } = &cmd.action else {
            continue;
        };
        let Some(unit) = engine.units.get(unit_id) else {
            continue;
        };
        if !matches!(unit.kind, ChessPieceKind::Knight | ChessPieceKind::Bishop) {
            continue;
        }
        match counts.iter_mut().find(|(id, _)| id == unit_id) {
            Some(entry) => entry.1 += 1,
            None => counts.push((*unit_id, 1)),
        }
    }

    let wasted: i32 = counts.iter().map(|(_, n)| (n - 1).max(0)).sum();
    wasted * 20
}

pub(crate) fn draw_score(engine: &Engine, player: PlayerId) -> i32 {
    let mat = material_balance(engine, player);
    let total = total_material_value(engine);

    // 0 = full middlegame (~8000 cp), 256 = pure king endgame.
    // K+Q vs K yields total=900 → endgame≈228; penalty for mat>=500 ≈ -1640.
    let endgame = (256 - (total * 256 / 8000).clamp(0, 256)) as i32;

    if mat >= 500 {
        -500 - endgame * 5
    } else if mat >= crate::chess::search::CLEAR_EDGE_MATERIAL {
        -360 - endgame * 2
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
    engine.units.len() <= 16 && material_balance(engine, player) >= 100
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

    #[test]
    fn pst_knight_f3_better_than_g1_for_white() {
        let engine_g1 =
            engine_from_fen("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w - - 0 1")
                .expect("valid FEN");
        let engine_f3 =
            engine_from_fen("rnbqkbnr/pppppppp/8/8/4P3/5N2/PPPP1PPP/RNBQKB1R w - - 0 2")
                .expect("valid FEN");
        let score_g1 = static_evaluate(&engine_g1, 1);
        let score_f3 = static_evaluate(&engine_f3, 1);
        assert!(score_f3 > score_g1, "Nf3 ({score_f3}) should score better than Ng1 ({score_g1})");
    }

    #[test]
    fn pst_pawn_d4_better_than_d2_for_white() {
        let engine_d2 =
            engine_from_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1")
                .expect("valid FEN");
        let engine_d4 =
            engine_from_fen("rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR w - - 0 2")
                .expect("valid FEN");
        let score_d2 = static_evaluate(&engine_d2, 1);
        let score_d4 = static_evaluate(&engine_d4, 1);
        assert!(score_d4 > score_d2, "d4 ({score_d4}) should score better than d2 ({score_d2})");
    }

    #[test]
    fn pst_bonus_symmetric_for_black_and_white_knights() {
        use crate::engine::entity::unit::Position;
        let pos_white_g1 = Position { x: 6, y: 0 };
        let pos_black_g8 = Position { x: 6, y: 7 };
        assert_eq!(
            pst_bonus(ChessPieceKind::Knight, 1, pos_white_g1),
            pst_bonus(ChessPieceKind::Knight, 2, pos_black_g8),
            "White Ng1 and Black Ng8 should have identical PST values"
        );
    }

    #[test]
    fn development_penalty_applied_for_undeveloped_minor_pieces_opening() {
        // Start position — all minor pieces on home rank, turn_index == 0
        let engine =
            engine_from_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1")
                .expect("valid FEN");
        assert_eq!(engine.turn_manager.turn_index, 0);
        let white_score = static_evaluate(&engine, 1);
        let black_score = static_evaluate(&engine, 2);
        // Both sides equally undeveloped → symmetry preserved
        assert_eq!(white_score, -black_score);
    }

    #[test]
    fn development_penalty_favours_developed_side() {
        // White knights developed, black knights still on home rank
        // White: Nf3, Nc3 developed. Black: Nb8, Ng8 still home.
        let engine =
            engine_from_fen("rnbqkbnr/pppppppp/8/8/8/2N2N2/PPPPPPPP/R1BQKB1R w - - 0 3")
                .expect("valid FEN");
        // turn_index 0 (FEN gives no ply info, engine starts at 0)
        let white_score = static_evaluate(&engine, 1);
        let black_score = static_evaluate(&engine, 2);
        // White is evaluated better from white's perspective
        assert!(white_score > black_score);
    }

    #[test]
    fn king_zone_attack_count_detects_adjacent_enemy() {
        // White king on e1 (x=4, y=0), black rook on d2 (x=3, y=1) — inside zone
        let engine =
            engine_from_fen("4k3/8/8/8/8/8/3r4/4K3 w - - 0 1").expect("valid FEN");
        let king_pos = crate::engine::entity::unit::Position { x: 4, y: 0 };
        assert_eq!(king_zone_attack_count(&engine, 1, king_pos), 1);
        // Black king on e8 (x=4, y=7) has no enemy in zone
        let black_king_pos = crate::engine::entity::unit::Position { x: 4, y: 7 };
        assert_eq!(king_zone_attack_count(&engine, 2, black_king_pos), 0);
    }

    #[test]
    fn king_safety_penalises_enemy_in_zone() {
        // White king safe (no enemy in zone) vs exposed (enemy rook adjacent)
        let safe = engine_from_fen("4k3/8/8/8/8/8/8/4K3 w - - 0 1").expect("valid FEN");
        let exposed = engine_from_fen("4k3/8/8/8/8/8/3r4/4K3 w - - 0 1").expect("valid FEN");
        let safe_score = static_evaluate(&safe, 1);
        let exposed_score = static_evaluate(&exposed, 1);
        assert!(
            safe_score > exposed_score,
            "safe ({safe_score}) should score better than exposed ({exposed_score})"
        );
    }

    #[test]
    fn backward_pawn_detected_and_penalised() {
        // White: d5, e4, f5. Black: d6 (attacks e5, blocking e4's advance).
        // e4 is backward: no white pawn behind it on d/f file, stop square e5 attacked by d6.
        // d5 and f5 are not backward because e4 is behind each of them.
        let engine =
            engine_from_fen("4k3/8/3p4/3P1P2/4P3/8/8/4K3 w - - 0 1").expect("valid FEN");
        let pos_e4 = crate::engine::entity::unit::Position { x: 4, y: 3 };
        let pos_d5 = crate::engine::entity::unit::Position { x: 3, y: 4 };
        let pos_f5 = crate::engine::entity::unit::Position { x: 5, y: 4 };
        use crate::chess::move_features::is_backward_pawn;
        assert!(is_backward_pawn(&engine, 1, pos_e4), "e4 should be backward");
        assert!(!is_backward_pawn(&engine, 1, pos_d5), "d5 should not be backward");
        assert!(!is_backward_pawn(&engine, 1, pos_f5), "f5 should not be backward");
        // Structural score for e4 must be lower than for a pawn with no weakness
        let engine_clean =
            engine_from_fen("4k3/8/8/8/4P3/8/8/4K3 w - - 0 1").expect("valid FEN");
        let score_backward = static_evaluate(&engine, 1);
        let score_clean = static_evaluate(&engine_clean, 1);
        assert!(
            score_backward < score_clean,
            "position with backward pawn ({score_backward}) should score lower than clean pawn ({score_clean})"
        );
    }

    #[test]
    fn opening_tempo_waste_penalises_repeated_minor_piece_move() {
        use crate::engine::action::action::Action;
        use crate::engine::action::command::Command;
        use crate::engine::entity::unit::Position;

        // Start from initial position — action_log is empty, no penalty expected.
        let mut engine =
            engine_from_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1")
                .expect("valid FEN");

        assert_eq!(opening_tempo_waste_penalty(&engine, 1), 0, "no history → no penalty");

        // Inject history: white Ng1 moved twice (f3 then back home).
        // Board state is untouched (still starting position), so Ng1 exists and
        // all 4 white minor pieces are on home rank (undeveloped_count = 4).
        let ng1_id = engine
            .board
            .occupant(Position { x: 6, y: 0 })
            .expect("Ng1 on g1");

        engine.action_log.push(Command {
            player_id: 1,
            action: Action::Move {
                unit_id: ng1_id,
                target: Position { x: 5, y: 2 }, // g1→f3
                promotion: None,
            },
        });
        engine.action_log.push(Command {
            player_id: 1,
            action: Action::Move {
                unit_id: ng1_id,
                target: Position { x: 6, y: 0 }, // f3→g1 (retreat = wasted tempo)
                promotion: None,
            },
        });

        let penalty = opening_tempo_waste_penalty(&engine, 1);
        assert!(penalty > 0, "wasted tempo should produce penalty, got {penalty}");

        // One move only → no penalty.
        let mut single_engine =
            engine_from_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1")
                .expect("valid FEN");
        let ng1_id_s = single_engine
            .board
            .occupant(Position { x: 6, y: 0 })
            .expect("Ng1");
        single_engine.action_log.push(Command {
            player_id: 1,
            action: Action::Move {
                unit_id: ng1_id_s,
                target: Position { x: 5, y: 2 }, // g1→f3 only once
                promotion: None,
            },
        });
        assert_eq!(
            opening_tempo_waste_penalty(&single_engine, 1),
            0,
            "single development should not be penalised"
        );
    }

    #[test]
    fn draw_score_scales_with_endgame_phase_kqk() {
        // K+Q vs K: total material = 900, mat for white = +900
        let kqk = engine_from_fen("7k/8/8/8/3Q4/8/8/K7 w - - 0 1").expect("valid FEN");
        // Full-material position: mat = 0 → else branch = -70
        let start = engine_from_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1")
            .expect("valid FEN");

        let kqk_score = draw_score(&kqk, 1);
        let start_score = draw_score(&start, 1);

        assert!(
            kqk_score < start_score,
            "K+Q vs K draw ({kqk_score}) should be more negative than middlegame draw ({start_score})"
        );
        assert!(
            kqk_score < -1000,
            "K+Q vs K stalemate must be heavily penalised, got {kqk_score}"
        );
    }

    #[test]
    fn development_penalty_not_applied_after_move_10() {
        // Simulate turn_index >= 20 by using a FEN and manually advancing turns via a
        // helper; instead we confirm the function returns 0 past the threshold.
        let pos = crate::engine::entity::unit::Position { x: 1, y: 0 };
        let engine =
            engine_from_fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 11")
                .expect("valid FEN");
        // Engine from FEN starts turn_index at 0, but we test the function boundary:
        // turn_index 20 means no penalty — call directly.
        let mut e = engine.clone();
        for _ in 0..20 {
            e.turn_manager.next_turn();
        }
        assert_eq!(minor_piece_development_bonus(&e, 1, pos), 0);
    }
}
