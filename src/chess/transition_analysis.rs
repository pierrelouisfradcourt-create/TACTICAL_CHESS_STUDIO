use crate::chess::eval::static_evaluate;
use crate::chess::move_features::{
    advances_true_passed_pawn, capture_safety_signal, capture_score, gives_check_fast,
    is_castling_move, is_promotion, is_quiet_move, is_recapture_move, progress_move_score,
    promotion_race_signal, repetition_signal, trade_simplification_bonus,
};
use crate::chess::piece_kind::ChessPieceKind;
use crate::chess::practical_policy::{is_conversion_move, tactical_score_breakdown};
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::{PlayerId, Position};

#[allow(dead_code)]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TransitionDynamic {
    Mate,
    Quiet,
    Capture,
    Promotion,
    Check,
    Castling,
    Recapture,
    PassedPawnAdvance,
    Conversion,
    RepetitionRisk,
}

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct TransitionAnalysis {
    pub action: Action,
    pub moving_piece: Option<ChessPieceKind>,
    pub from: Option<Position>,
    pub to: Option<Position>,
    pub captured_piece: Option<ChessPieceKind>,
    pub promotion: Option<ChessPieceKind>,
    pub resulting_state_value: i32,
    pub search_state_value: i32,
    pub primary_dynamic: Option<TransitionDynamic>,
    pub secondary_dynamics: Vec<TransitionDynamic>,
    pub progress_score: i32,
    pub tactical_score: i32,
    pub capture_exchange_score: Option<i32>,
    pub repetition_signal: i32,
    pub capture_safety_signal: i32,
    pub promotion_race_signal: i32,
    pub trade_simplification_bonus: i32,
}

pub(crate) fn analyze_transition(
    engine: &Engine,
    player: PlayerId,
    action: &Action,
    search_state_value: i32,
) -> TransitionAnalysis {
    let (moving_piece, from, to, promotion) = match action {
        Action::Move {
            unit_id,
            target,
            promotion,
        } => engine
            .units
            .get(unit_id)
            .map(|unit| {
                (
                    Some(unit.kind),
                    Some(unit.position),
                    Some(*target),
                    *promotion,
                )
            })
            .unwrap_or((None, None, Some(*target), *promotion)),
        _ => (None, None, None, None),
    };

    let captured_piece = captured_piece_kind(engine, action);
    let progress_score = progress_move_score(engine, player, action);
    let tactical_score =
        tactical_score_breakdown(engine, player, action, search_state_value).final_score;
    let capture_exchange_score = capture_score(engine, action);
    let repetition = repetition_signal(engine, player, action);
    let (resulting_state_value, is_mate) = resulting_state(engine, player, action);

    let mut dynamics = Vec::new();
    if is_mate {
        dynamics.push(TransitionDynamic::Mate);
    }
    if is_quiet_move(engine, player, action) {
        dynamics.push(TransitionDynamic::Quiet);
    }
    if captured_piece.is_some() {
        dynamics.push(TransitionDynamic::Capture);
    }
    if is_promotion(engine, player, action) {
        dynamics.push(TransitionDynamic::Promotion);
    }
    if gives_check_fast(engine, player, action) {
        dynamics.push(TransitionDynamic::Check);
    }
    if is_castling_move(engine, action) {
        dynamics.push(TransitionDynamic::Castling);
    }
    if is_recapture_move(engine, action) {
        dynamics.push(TransitionDynamic::Recapture);
    }
    if advances_true_passed_pawn(engine, player, action) {
        dynamics.push(TransitionDynamic::PassedPawnAdvance);
    }
    if is_conversion_move(engine, player, action) {
        dynamics.push(TransitionDynamic::Conversion);
    }
    if repetition > 0 {
        dynamics.push(TransitionDynamic::RepetitionRisk);
    }
    let (primary_dynamic, secondary_dynamics) = split_dynamics(dynamics);

    TransitionAnalysis {
        action: *action,
        moving_piece,
        from,
        to,
        captured_piece,
        promotion,
        resulting_state_value,
        search_state_value,
        primary_dynamic,
        secondary_dynamics,
        progress_score,
        tactical_score,
        capture_exchange_score,
        repetition_signal: repetition,
        capture_safety_signal: capture_safety_signal(engine, player, action),
        promotion_race_signal: promotion_race_signal(engine, player, action),
        trade_simplification_bonus: trade_simplification_bonus(engine, player, action),
    }
}

fn resulting_state(engine: &Engine, player: PlayerId, action: &Action) -> (i32, bool) {
    let mut simulated = engine.clone();
    let Some(undo) = simulated.simulate_action_for_search(player, action) else {
        return (static_evaluate(engine, player), false);
    };
    let is_mate = simulated.game_over() && simulated.winner() == Some(player);
    let value = static_evaluate(&simulated, player);
    simulated.undo_action_for_search(undo);
    (value, is_mate)
}

fn split_dynamics(
    dynamics: Vec<TransitionDynamic>,
) -> (Option<TransitionDynamic>, Vec<TransitionDynamic>) {
    let primary_index = dynamics
        .iter()
        .enumerate()
        .min_by_key(|(_, dynamic)| dynamic_priority(**dynamic))
        .map(|(index, _)| index);

    let Some(primary_index) = primary_index else {
        return (None, Vec::new());
    };

    let primary_dynamic = dynamics[primary_index];
    let secondary_dynamics = dynamics
        .into_iter()
        .enumerate()
        .filter_map(|(index, dynamic)| (index != primary_index).then_some(dynamic))
        .collect();

    (Some(primary_dynamic), secondary_dynamics)
}

fn dynamic_priority(dynamic: TransitionDynamic) -> u8 {
    match dynamic {
        TransitionDynamic::Mate => 0,
        TransitionDynamic::Promotion => 1,
        TransitionDynamic::Capture => 2,
        TransitionDynamic::Check => 3,
        TransitionDynamic::Castling => 4,
        TransitionDynamic::Recapture => 5,
        TransitionDynamic::PassedPawnAdvance => 6,
        TransitionDynamic::Conversion => 7,
        TransitionDynamic::Quiet => 8,
        TransitionDynamic::RepetitionRisk => 9,
    }
}

fn captured_piece_kind(engine: &Engine, action: &Action) -> Option<ChessPieceKind> {
    let Action::Move {
        unit_id, target, ..
    } = action
    else {
        return None;
    };

    let moving_unit = engine.units.get(unit_id)?;

    if let Some(captured_id) = engine.board.occupant(*target) {
        return engine.units.get(&captured_id).map(|unit| unit.kind);
    }

    if moving_unit.kind == ChessPieceKind::Pawn && engine.en_passant_target == Some(*target) {
        let captured_position = Position {
            x: target.x,
            y: if moving_unit.owner == 1 {
                target.y.saturating_sub(1)
            } else {
                target.y + 1
            },
        };

        return engine
            .board
            .occupant(captured_position)
            .and_then(|captured_id| engine.units.get(&captured_id))
            .map(|unit| unit.kind);
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chess::fen::{engine_from_fen, engine_to_fen};
    use crate::chess::uci::action_to_uci;

    fn legal_move(engine: &Engine, player: PlayerId, uci: &str) -> Action {
        engine
            .legal_actions(player)
            .into_iter()
            .find(|action| action_to_uci(action, &engine.units).as_deref() == Some(uci))
            .expect("expected legal move")
    }

    #[test]
    fn transition_dynamic_priority_splits_primary_from_secondaries() {
        let (primary, secondary) = split_dynamics(vec![
            TransitionDynamic::Quiet,
            TransitionDynamic::Capture,
            TransitionDynamic::Promotion,
            TransitionDynamic::Check,
        ]);

        assert_eq!(primary, Some(TransitionDynamic::Promotion));
        assert_eq!(
            secondary,
            vec![
                TransitionDynamic::Quiet,
                TransitionDynamic::Capture,
                TransitionDynamic::Check,
            ]
        );
    }

    #[test]
    fn transition_analysis_describes_move_dynamics() {
        let engine = engine_from_fen("6k1/8/8/8/3q4/8/8/3RK3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let action = legal_move(&engine, player, "d1d4");

        let analysis = analyze_transition(&engine, player, &action, 120);

        assert_eq!(analysis.moving_piece, Some(ChessPieceKind::Rook));
        assert_eq!(analysis.captured_piece, Some(ChessPieceKind::Queen));
        assert_eq!(analysis.primary_dynamic, Some(TransitionDynamic::Capture));
        assert!(!analysis
            .secondary_dynamics
            .contains(&TransitionDynamic::Capture));
        assert_eq!(analysis.search_state_value, 120);
        let mut expected_engine = engine.clone();
        let undo = expected_engine
            .simulate_action_for_search(player, &action)
            .expect("legal move should simulate");
        let expected_value = static_evaluate(&expected_engine, player);
        let _ = expected_engine.undo_action_for_search(undo);
        assert_eq!(analysis.resulting_state_value, expected_value);
    }

    #[test]
    fn resulting_state_value_always_defined() {
        let engine = engine_from_fen("6k1/8/8/8/3q4/8/8/3RK3 w - - 0 1").expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let invalid_action = Action::Move {
            unit_id: 999_999,
            target: Position { x: 0, y: 0 },
            promotion: None,
        };

        let analysis = analyze_transition(&engine, player, &invalid_action, 0);

        assert_eq!(
            analysis.resulting_state_value,
            static_evaluate(&engine, player)
        );
    }

    #[test]
    fn transition_analysis_preserves_source_state() {
        let engine = engine_from_fen("8/8/8/8/8/8/4P3/4K2k w - - 0 1").expect("valid FEN");
        let before = engine_to_fen(&engine);
        let player = engine.turn_manager.current_player;
        let action = legal_move(&engine, player, "e2e4");

        let _analysis = analyze_transition(&engine, player, &action, 0);

        assert_eq!(engine_to_fen(&engine), before);
    }
}
