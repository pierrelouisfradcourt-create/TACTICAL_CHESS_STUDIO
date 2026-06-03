use crate::chess::eval::{
    center_bonus, is_low_material_search_position, material_balance, piece_value,
    total_material_value,
};
use crate::chess::piece_kind::ChessPieceKind;
use crate::chess::practical_policy::{
    imminent_promotion_threat, tactical_score_breakdown, PHASE_REWARD_MIDDLEGAME_WINNING_SIMPLIFY,
};
use crate::chess::search::{
    opponent, CLEAR_EDGE_MATERIAL, PASSED_PAWN_ADVANCE_STEP, PASSED_PAWN_CLEAR_EDGE_BONUS,
    PASSED_PAWN_NEAR_PROMOTION_BONUS, PASSED_PAWN_PUSH_BASE,
};
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::{PlayerId, Position};

pub(crate) fn is_capture(engine: &Engine, mv: &Action) -> bool {
    match mv {
        Action::Move { target, .. } => engine.board.occupant(*target).is_some(),
        _ => false,
    }
}

pub(crate) fn is_promotion(engine: &Engine, player: PlayerId, mv: &Action) -> bool {
    match mv {
        Action::Move {
            unit_id,
            target,
            promotion,
        } => {
            if promotion.is_some() {
                return true;
            }

            engine
                .units
                .get(unit_id)
                .map(|u| {
                    u.kind == ChessPieceKind::Pawn
                        && ((player == 1 && target.y == 7) || (player == 2 && target.y == 0))
                })
                .unwrap_or(false)
        }
        _ => false,
    }
}

pub(crate) fn gives_check_fast(engine: &Engine, player: PlayerId, mv: &Action) -> bool {
    engine.action_gives_check(player, mv)
}

pub(crate) fn is_castling_move(engine: &Engine, mv: &Action) -> bool {
    let Action::Move {
        unit_id, target, ..
    } = mv
    else {
        return false;
    };

    let Some(unit) = engine.units.get(unit_id) else {
        return false;
    };

    unit.kind == ChessPieceKind::King
        && unit.position.y == target.y
        && unit.position.x.abs_diff(target.x) == 2
}

pub(crate) fn is_recapture_move(engine: &Engine, mv: &Action) -> bool {
    let Action::Move { target, .. } = mv else {
        return false;
    };

    let Some(last) = engine.action_log.last() else {
        return false;
    };

    match &last.action {
        Action::Move {
            target: last_target,
            ..
        } => last_target == target,
        _ => false,
    }
}

pub(crate) fn is_quiet_move(engine: &Engine, player: PlayerId, mv: &Action) -> bool {
    !is_capture(engine, mv)
        && !is_promotion(engine, player, mv)
        && !gives_check_fast(engine, player, mv)
}

pub(crate) fn is_critical_move(engine: &Engine, player: PlayerId, mv: &Action) -> bool {
    is_promotion(engine, player, mv)
        || gives_check_fast(engine, player, mv)
        || advances_true_passed_pawn(engine, player, mv)
}

pub(crate) fn advances_true_passed_pawn(engine: &Engine, player: PlayerId, mv: &Action) -> bool {
    let Action::Move {
        unit_id, target, ..
    } = mv
    else {
        return false;
    };

    let Some(unit) = engine.units.get(unit_id) else {
        return false;
    };

    unit.owner == player
        && unit.kind == ChessPieceKind::Pawn
        && is_true_passed_pawn(engine, player, unit.position)
        && unit.position.y != target.y
}

pub(crate) fn passed_pawn_push_score(engine: &Engine, player: PlayerId, mv: &Action) -> i32 {
    let Action::Move { target, .. } = mv else {
        return 0;
    };

    let advance = forward_progress(player, *target);
    let mut score = PASSED_PAWN_PUSH_BASE + advance * PASSED_PAWN_ADVANCE_STEP;

    if material_balance(engine, player) >= CLEAR_EDGE_MATERIAL {
        score += PASSED_PAWN_CLEAR_EDGE_BONUS;
    }

    if advance >= 5 {
        score += PASSED_PAWN_NEAR_PROMOTION_BONUS;
    }

    score
}

pub(crate) fn is_true_passed_pawn(engine: &Engine, owner: PlayerId, pos: Position) -> bool {
    for u in engine.units.values() {
        if u.kind != ChessPieceKind::Pawn || u.owner == owner {
            continue;
        }

        let dx = (u.position.x as i32 - pos.x as i32).abs();
        if dx > 1 {
            continue;
        }

        if owner == 1 && u.position.y > pos.y {
            return false;
        }

        if owner == 2 && u.position.y < pos.y {
            return false;
        }
    }

    true
}

pub(crate) fn is_isolated_pawn(engine: &Engine, owner: PlayerId, pos: Position) -> bool {
    for u in engine.units.values() {
        if u.kind != ChessPieceKind::Pawn || u.owner != owner || u.position == pos {
            continue;
        }

        let dx = (u.position.x as i32 - pos.x as i32).abs();
        if dx == 1 {
            return false;
        }
    }

    true
}

pub(crate) fn is_doubled_pawn(engine: &Engine, owner: PlayerId, pos: Position) -> bool {
    engine.units.values().any(|u| {
        u.kind == ChessPieceKind::Pawn
            && u.owner == owner
            && u.position != pos
            && u.position.x == pos.x
    })
}

pub(crate) fn is_backward_pawn(engine: &Engine, owner: PlayerId, pos: Position) -> bool {
    let forward_dy: i32 = if owner == 1 { 1 } else { -1 };
    let stop_y = pos.y as i32 + forward_dy;

    if !(0..=7).contains(&stop_y) {
        return false;
    }

    let has_supporter_behind = engine.units.values().any(|u| {
        u.kind == ChessPieceKind::Pawn
            && u.owner == owner
            && (u.position.x as i32 - pos.x as i32).abs() == 1
            && if owner == 1 {
                u.position.y < pos.y
            } else {
                u.position.y > pos.y
            }
    });
    if has_supporter_behind {
        return false;
    }

    let enemy = opponent(owner);
    let attacker_y = stop_y + forward_dy;
    if !(0..=7).contains(&attacker_y) {
        return false;
    }

    [-1_i32, 1].iter().any(|&dx| {
        let nx = pos.x as i32 + dx;
        if !(0..=7).contains(&nx) {
            return false;
        }
        let p = Position { x: nx as u32, y: attacker_y as u32 };
        engine
            .board
            .occupant(p)
            .and_then(|id| engine.units.get(&id))
            .map_or(false, |u| u.owner == enemy && u.kind == ChessPieceKind::Pawn)
    })
}

pub(crate) fn is_protected_pawn(engine: &Engine, owner: PlayerId, pos: Position) -> bool {
    let support_y = if owner == 1 {
        pos.y as i32 - 1
    } else {
        pos.y as i32 + 1
    };

    if !(0..=7).contains(&support_y) {
        return false;
    }

    for dx in [-1_i32, 1] {
        let nx = pos.x as i32 + dx;
        if !(0..=7).contains(&nx) {
            continue;
        }

        let p = Position {
            x: nx as u32,
            y: support_y as u32,
        };

        if let Some(id) = engine.board.occupant(p) {
            if let Some(u) = engine.units.get(&id) {
                if u.owner == owner && u.kind == ChessPieceKind::Pawn {
                    return true;
                }
            }
        }
    }

    false
}

pub(crate) fn progress_move_score(engine: &Engine, player: PlayerId, mv: &Action) -> i32 {
    let Action::Move {
        unit_id, target, ..
    } = mv
    else {
        return 0;
    };

    let Some(unit) = engine.units.get(unit_id) else {
        return 0;
    };

    if unit.owner != player {
        return 0;
    }

    let mut score = 0;
    let forward_before = forward_progress(player, unit.position);
    let forward_after = forward_progress(player, *target);
    let forward_gain = forward_after - forward_before;

    if forward_gain > 0 {
        score += match unit.kind {
            ChessPieceKind::Pawn => 90 + forward_gain * 36,
            ChessPieceKind::Knight | ChessPieceKind::Bishop => 24 + forward_gain * 14,
            ChessPieceKind::Rook | ChessPieceKind::Queen => 12 + forward_gain * 10,
            ChessPieceKind::King if is_low_material_search_position(engine) => {
                28 + forward_gain * 12
            }
            ChessPieceKind::King => 0,
        };
    }

    let center_gain = center_bonus(*target) - center_bonus(unit.position);
    if center_gain > 0 {
        score += center_gain / 2;
    }

    if unit.kind == ChessPieceKind::King && is_low_material_search_position(engine) {
        if let Some(enemy_king) = king_position(engine, opponent(player)) {
            let before = manhattan(unit.position, enemy_king);
            let after = manhattan(*target, enemy_king);
            if after < before {
                score += (before - after) * 18;
            }
        }
    }

    if unit.kind == ChessPieceKind::Pawn && is_true_passed_pawn(engine, player, unit.position) {
        score += 60;
    }

    score
}

pub(crate) fn repetition_signal(engine: &Engine, player: PlayerId, mv: &Action) -> i32 {
    let Action::Move {
        unit_id, target, ..
    } = mv
    else {
        return 0;
    };

    let Some(unit) = engine.units.get(unit_id) else {
        return 0;
    };

    let progress = progress_move_score(engine, player, mv);
    if progress > 0 || is_capture(engine, mv) || gives_check_fast(engine, player, mv) {
        return 0;
    }

    let last_own_move = engine
        .action_log
        .iter()
        .rev()
        .find(|command| command.player_id == player);

    let Some(last_own_move) = last_own_move else {
        return 0;
    };

    match &last_own_move.action {
        Action::Move {
            unit_id: last_unit_id,
            target: last_target,
            ..
        } if *last_unit_id == *unit_id => {
            if *target == unit.position {
                120
            } else if chebyshev(*last_target, *target) <= 1 {
                60
            } else {
                0
            }
        }
        _ => 0,
    }
}

pub(crate) fn king_boxing_score(engine: &Engine, player: PlayerId, mv: &Action) -> i32 {
    let Action::Move {
        unit_id, target, ..
    } = mv
    else {
        return 0;
    };

    let Some(unit) = engine.units.get(unit_id) else {
        return 0;
    };

    if unit.owner != player {
        return 0;
    }

    let Some(enemy_king) = king_position(engine, opponent(player)) else {
        return 0;
    };

    let before_distance = manhattan(unit.position, enemy_king);
    let after_distance = manhattan(*target, enemy_king);
    let edge_bonus = if chebyshev(*target, enemy_king) <= 2 {
        24
    } else {
        0
    };
    let pressure_bonus = if after_distance < before_distance {
        (before_distance - after_distance) * 18
    } else {
        0
    };

    pressure_bonus + edge_bonus
}

pub(crate) fn king_activity_delta(engine: &Engine, player: PlayerId, mv: &Action) -> i32 {
    let Action::Move {
        unit_id, target, ..
    } = mv
    else {
        return 0;
    };

    let Some(unit) = engine.units.get(unit_id) else {
        return 0;
    };

    if unit.owner != player || unit.kind != ChessPieceKind::King {
        return 0;
    }

    let center_before = center_bonus(unit.position);
    let center_after = center_bonus(*target);
    let mut delta = ((center_after - center_before) / 4).max(0);

    if let Some(enemy_king) = king_position(engine, opponent(player)) {
        let before = manhattan(unit.position, enemy_king);
        let after = manhattan(*target, enemy_king);
        if after < before {
            delta += before - after;
        }
    }

    delta
}

pub(crate) fn king_escape_improves(engine: &Engine, player: PlayerId, mv: &Action) -> bool {
    let Action::Move {
        unit_id, target, ..
    } = mv
    else {
        return false;
    };

    let Some(unit) = engine.units.get(unit_id) else {
        return false;
    };

    if unit.owner != player || unit.kind != ChessPieceKind::King {
        return false;
    }

    let enemy = opponent(player);
    let Some(enemy_king) = king_position(engine, enemy) else {
        return false;
    };

    let before = manhattan(unit.position, enemy_king);
    let after = manhattan(*target, enemy_king);
    after < before
}

pub(crate) fn forward_progress(player: PlayerId, pos: Position) -> i32 {
    if player == 1 {
        pos.y as i32
    } else {
        7 - pos.y as i32
    }
}

pub(crate) fn is_shuffle_move(engine: &Engine, player: PlayerId, mv: &Action) -> bool {
    if engine.action_log.len() < 12 {
        return false;
    }

    let Action::Move {
        unit_id, target, ..
    } = mv
    else {
        return false;
    };

    let Some(unit) = engine.units.get(unit_id) else {
        return false;
    };

    unit.owner == player
        && unit.kind == ChessPieceKind::King
        && chebyshev(unit.position, *target) <= 1
}

pub(crate) fn shuffle_penalty(engine: &Engine, player: PlayerId) -> i32 {
    let mut penalty = 950 + material_balance(engine, player).max(0) / 2;

    if engine.units.len() <= 10 {
        penalty += 400;
    }

    penalty
}

pub(crate) fn chebyshev(a: Position, b: Position) -> i32 {
    (a.x as i32 - b.x as i32)
        .abs()
        .max((a.y as i32 - b.y as i32).abs())
}

pub(crate) fn manhattan(a: Position, b: Position) -> i32 {
    (a.x as i32 - b.x as i32).abs() + (a.y as i32 - b.y as i32).abs()
}

pub(crate) fn pseudo_mobility_from(
    engine: &Engine,
    kind: ChessPieceKind,
    position: Position,
    player: PlayerId,
) -> i32 {
    let deltas: &[(i32, i32)] = match kind {
        ChessPieceKind::King => &[
            (-1, -1),
            (-1, 0),
            (-1, 1),
            (0, -1),
            (0, 1),
            (1, -1),
            (1, 0),
            (1, 1),
        ],
        ChessPieceKind::Knight => &[
            (-2, -1),
            (-2, 1),
            (-1, -2),
            (-1, 2),
            (1, -2),
            (1, 2),
            (2, -1),
            (2, 1),
        ],
        ChessPieceKind::Bishop => &[(1, 1), (1, -1), (-1, 1), (-1, -1)],
        ChessPieceKind::Rook => &[(1, 0), (-1, 0), (0, 1), (0, -1)],
        ChessPieceKind::Queen => &[
            (1, 1),
            (1, -1),
            (-1, 1),
            (-1, -1),
            (1, 0),
            (-1, 0),
            (0, 1),
            (0, -1),
        ],
        ChessPieceKind::Pawn => {
            let dir = if player == 1 { 1 } else { -1 };
            return [(-1, dir), (0, dir), (1, dir)]
                .iter()
                .filter(|(dx, dy)| {
                    let nx = position.x as i32 + dx;
                    let ny = position.y as i32 + dy;
                    (0..=7).contains(&nx) && (0..=7).contains(&ny)
                })
                .count() as i32;
        }
    };

    if matches!(
        kind,
        ChessPieceKind::Bishop | ChessPieceKind::Rook | ChessPieceKind::Queen
    ) {
        let mut total = 0;
        for (dx, dy) in deltas {
            let mut nx = position.x as i32 + dx;
            let mut ny = position.y as i32 + dy;
            while (0..=7).contains(&nx) && (0..=7).contains(&ny) {
                total += 1;
                let pos = Position {
                    x: nx as u32,
                    y: ny as u32,
                };
                if engine.board.occupant(pos).is_some() {
                    break;
                }
                nx += dx;
                ny += dy;
            }
        }
        return total;
    }

    deltas
        .iter()
        .filter(|(dx, dy)| {
            let nx = position.x as i32 + dx;
            let ny = position.y as i32 + dy;
            (0..=7).contains(&nx) && (0..=7).contains(&ny)
        })
        .count() as i32
}

pub(crate) fn capture_score(engine: &Engine, mv: &Action) -> Option<i32> {
    let Action::Move {
        unit_id, target, ..
    } = mv
    else {
        return None;
    };

    let mover = engine.units.get(unit_id)?;
    let captured_id = engine.board.occupant(*target)?;
    let captured = engine.units.get(&captured_id)?;

    Some(piece_value(captured.kind) - piece_value(mover.kind) / 10)
}

pub(crate) fn promotion_priority(engine: &Engine, mv: &Action) -> i32 {
    let Action::Move { promotion, .. } = mv else {
        return 0;
    };

    match promotion.unwrap_or(ChessPieceKind::Queen) {
        ChessPieceKind::Queen => 320,
        ChessPieceKind::Rook => 180,
        ChessPieceKind::Bishop => 120,
        ChessPieceKind::Knight => 140,
        ChessPieceKind::Pawn | ChessPieceKind::King => {
            let _ = engine;
            0
        }
    }
}

pub(crate) fn capture_safety_signal(engine: &Engine, player: PlayerId, mv: &Action) -> i32 {
    if !is_capture(engine, mv) {
        return 0;
    }

    let tactical = tactical_score_breakdown(engine, player, mv, 0);
    if tactical.see < 0 || tactical.hanging <= -160 {
        0
    } else {
        tactical.see.max(0) + tactical.trade.max(0)
    }
}

pub(crate) fn promotion_race_signal(engine: &Engine, player: PlayerId, mv: &Action) -> i32 {
    let my_before = imminent_promotion_threat(engine, player);
    let enemy = opponent(player);
    let enemy_before = imminent_promotion_threat(engine, enemy);

    let mut sim = engine.clone();
    let Some(undo) = sim.simulate_action_for_search(player, mv) else {
        return 0;
    };

    let my_after = imminent_promotion_threat(&sim, player);
    let enemy_after = imminent_promotion_threat(&sim, enemy);
    let _ = sim.undo_action_for_search(undo);

    let mut score = 0;
    if my_after && !my_before {
        score += 1;
    }
    if enemy_before && !enemy_after {
        score += 1;
    }
    score
}

pub(crate) fn trade_simplification_bonus(engine: &Engine, player: PlayerId, mv: &Action) -> i32 {
    let mut sim = engine.clone();
    let Some(undo) = sim.simulate_action_for_search(player, mv) else {
        return 0;
    };

    let before_balance = material_balance(engine, player);
    let after_balance = material_balance(&sim, player);
    let trade_delta = total_material_value(engine) - total_material_value(&sim);
    let _ = sim.undo_action_for_search(undo);

    if trade_delta > 0 && after_balance >= before_balance - 120 {
        PHASE_REWARD_MIDDLEGAME_WINNING_SIMPLIFY + trade_delta / 6
    } else {
        0
    }
}

pub(crate) fn king_position(engine: &Engine, player: PlayerId) -> Option<Position> {
    engine
        .units
        .values()
        .find(|u| u.owner == player && u.kind == ChessPieceKind::King)
        .map(|u| u.position)
}

pub(crate) fn king_edge_pressure(pos: Position) -> i32 {
    let file_edge = (pos.x as i32).min(7 - pos.x as i32);
    let rank_edge = (pos.y as i32).min(7 - pos.y as i32);
    3 - file_edge.min(rank_edge)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chess::fen::engine_from_fen;
    use crate::chess::uci::action_to_uci;

    fn find_action_uci(engine: &crate::engine::engine::Engine, uci: &str) -> Action {
        engine
            .legal_actions(engine.turn_manager.current_player)
            .into_iter()
            .find(|mv| action_to_uci(mv, &engine.units).as_deref() == Some(uci))
            .expect("expected matching legal move")
    }

    #[test]
    fn move_feature_capture_detects_capture() {
        let engine = engine_from_fen("6k1/8/8/8/3q4/8/3Q4/4K3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let capture_move = engine
            .legal_actions(player)
            .into_iter()
            .find(|mv| is_capture(&engine, mv))
            .expect("expected legal capture move");
        let quiet_move = engine
            .legal_actions(player)
            .into_iter()
            .find(|mv| !is_capture(&engine, mv))
            .expect("expected legal quiet move");
        assert!(is_capture(&engine, &capture_move));
        assert!(!is_capture(&engine, &quiet_move));
    }

    #[test]
    fn move_feature_promotion_detects_promotion() {
        let engine = engine_from_fen("4k3/P7/8/8/8/8/8/4K3 w - - 0 1").expect("valid FEN");
        let mv = find_action_uci(&engine, "a7a8q");
        assert!(is_promotion(&engine, 1, &mv));
    }

    #[test]
    fn move_feature_progress_scores_forward_pawn() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/3P4/4K3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let mv = find_action_uci(&engine, "d2d4");
        let score = progress_move_score(&engine, player, &mv);
        assert!(score > 0);
        assert!(if let Action::Move { target, .. } = mv {
            forward_progress(player, target) > 0
        } else {
            false
        });
    }
}
