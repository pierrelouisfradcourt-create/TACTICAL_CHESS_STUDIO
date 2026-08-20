use crate::chess::piece_kind::ChessPieceKind;
use crate::chess::transition_analysis::{TransitionAnalysis, TransitionDynamic};
use crate::engine::entity::unit::Position;

fn piece_name(kind: ChessPieceKind) -> &'static str {
    match kind {
        ChessPieceKind::Pawn => "pawn",
        ChessPieceKind::Knight => "knight",
        ChessPieceKind::Bishop => "bishop",
        ChessPieceKind::Rook => "rook",
        ChessPieceKind::Queen => "queen",
        ChessPieceKind::King => "king",
    }
}

fn square_name(pos: Position) -> String {
    let file = (b'a' + pos.x as u8) as char;
    let rank = (b'1' + pos.y as u8) as char;
    format!("{file}{rank}")
}

/// Generate a natural-language sentence explaining why Rocky chose this move.
pub fn explain_move(t: &TransitionAnalysis) -> String {
    let to = t.to.map(square_name).unwrap_or_else(|| "?".to_string());
    let mover = t.moving_piece.map(piece_name).unwrap_or("piece");

    let gives_check = t.secondary_dynamics.contains(&TransitionDynamic::Check)
        || t.primary_dynamic == Some(TransitionDynamic::Check);
    let is_recapture = t.secondary_dynamics.contains(&TransitionDynamic::Recapture)
        || t.primary_dynamic == Some(TransitionDynamic::Recapture);
    let check_suffix = if gives_check { ", giving check" } else { "" };

    match t.primary_dynamic {
        Some(TransitionDynamic::Mate) => {
            format!("Rocky delivers checkmate on {to}.")
        }

        Some(TransitionDynamic::Promotion) => {
            let promo = t.promotion.unwrap_or(ChessPieceKind::Queen);
            format!(
                "Rocky promotes the pawn to {} on {to}{check_suffix}.",
                piece_name(promo)
            )
        }

        Some(TransitionDynamic::Capture) | Some(TransitionDynamic::Recapture) => {
            let target_name = t.captured_piece.map(piece_name).unwrap_or("piece");
            let verb = if is_recapture { "recaptures" } else { "captures" };
            let exchange_suffix = match t.capture_exchange_score {
                Some(v) if v > 100 => " (winning material)",
                Some(v) if v < -100 => " (sacrificing material)",
                _ => "",
            };
            format!(
                "Rocky {verb} the {target_name} on {to} with the {mover}{exchange_suffix}{check_suffix}."
            )
        }

        Some(TransitionDynamic::Check) => {
            format!("Rocky plays the {mover} to {to}, putting the king in check.")
        }

        Some(TransitionDynamic::Castling) => {
            let side = t
                .to
                .map(|pos| if pos.x > 4 { "kingside" } else { "queenside" })
                .unwrap_or("?");
            format!("Rocky castles {side}.")
        }

        Some(TransitionDynamic::PassedPawnAdvance) => {
            format!("Rocky advances the passed pawn to {to}{check_suffix}.")
        }

        Some(TransitionDynamic::Conversion) => {
            let from = t.from.map(square_name).unwrap_or_else(|| "?".to_string());
            format!(
                "Rocky moves the {mover} from {from} to {to}, simplifying to convert the advantage{check_suffix}."
            )
        }

        Some(TransitionDynamic::Quiet) | None => {
            let forward_prefix = if t.progress_score > 100 { " forward" } else { "" };
            format!("Rocky moves the {mover}{forward_prefix} to {to}{check_suffix}.")
        }

        Some(TransitionDynamic::RepetitionRisk) => {
            format!("Rocky plays the {mover} to {to} (repetition).")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::engine::action::action::Action;

    fn make_analysis(
        primary: Option<TransitionDynamic>,
        secondary: Vec<TransitionDynamic>,
        moving_piece: Option<ChessPieceKind>,
        from: Option<Position>,
        to: Option<Position>,
        captured_piece: Option<ChessPieceKind>,
        promotion: Option<ChessPieceKind>,
        capture_exchange_score: Option<i32>,
        progress_score: i32,
    ) -> TransitionAnalysis {
        TransitionAnalysis {
            action: Action::Pass,
            moving_piece,
            from,
            to,
            captured_piece,
            promotion,
            resulting_state_value: 0,
            search_state_value: 0,
            primary_dynamic: primary,
            secondary_dynamics: secondary,
            progress_score,
            tactical_score: 0,
            capture_exchange_score,
            repetition_signal: 0,
            capture_safety_signal: 0,
            promotion_race_signal: 0,
            trade_simplification_bonus: 0,
        }
    }

    fn pos(x: u32, y: u32) -> Position {
        Position { x, y }
    }

    #[test]
    fn explain_checkmate() {
        let t = make_analysis(
            Some(TransitionDynamic::Mate),
            vec![],
            Some(ChessPieceKind::Queen),
            Some(pos(4, 4)),
            Some(pos(6, 6)),
            None,
            None,
            None,
            0,
        );
        let explanation = explain_move(&t);
        assert!(
            explanation.contains("checkmate"),
            "expected 'checkmate' in: {explanation}"
        );
        assert!(
            explanation.contains("g7"),
            "expected target square 'g7' in: {explanation}"
        );
    }

    #[test]
    fn explain_winning_capture() {
        let t = make_analysis(
            Some(TransitionDynamic::Capture),
            vec![],
            Some(ChessPieceKind::Rook),
            Some(pos(3, 0)),
            Some(pos(3, 3)),
            Some(ChessPieceKind::Queen),
            None,
            Some(500),
            0,
        );
        let explanation = explain_move(&t);
        assert!(
            explanation.contains("captures"),
            "expected 'captures' in: {explanation}"
        );
        assert!(
            explanation.contains("queen"),
            "expected 'queen' in: {explanation}"
        );
        assert!(
            explanation.contains("winning material"),
            "expected 'winning material' in: {explanation}"
        );
    }

    #[test]
    fn explain_sacrifice_capture() {
        let t = make_analysis(
            Some(TransitionDynamic::Capture),
            vec![],
            Some(ChessPieceKind::Bishop),
            Some(pos(2, 0)),
            Some(pos(5, 3)),
            Some(ChessPieceKind::Pawn),
            None,
            Some(-300),
            0,
        );
        let explanation = explain_move(&t);
        assert!(
            explanation.contains("sacrificing material"),
            "expected 'sacrificing material' in: {explanation}"
        );
    }

    #[test]
    fn explain_recapture() {
        let t = make_analysis(
            Some(TransitionDynamic::Recapture),
            vec![],
            Some(ChessPieceKind::Bishop),
            Some(pos(2, 2)),
            Some(pos(4, 4)),
            Some(ChessPieceKind::Knight),
            None,
            Some(50),
            0,
        );
        let explanation = explain_move(&t);
        assert!(
            explanation.contains("recaptures"),
            "expected 'recaptures' in: {explanation}"
        );
    }

    #[test]
    fn explain_promotion_to_queen() {
        let t = make_analysis(
            Some(TransitionDynamic::Promotion),
            vec![],
            Some(ChessPieceKind::Pawn),
            Some(pos(4, 6)),
            Some(pos(4, 7)),
            None,
            Some(ChessPieceKind::Queen),
            None,
            0,
        );
        let explanation = explain_move(&t);
        assert!(
            explanation.contains("promotes"),
            "expected 'promotes' in: {explanation}"
        );
        assert!(
            explanation.contains("queen"),
            "expected 'queen' in: {explanation}"
        );
    }

    #[test]
    fn explain_check() {
        let t = make_analysis(
            Some(TransitionDynamic::Check),
            vec![],
            Some(ChessPieceKind::Queen),
            Some(pos(3, 0)),
            Some(pos(3, 6)),
            None,
            None,
            None,
            0,
        );
        let explanation = explain_move(&t);
        assert!(
            explanation.contains("check"),
            "expected 'check' in: {explanation}"
        );
    }

    #[test]
    fn explain_castling_kingside() {
        let t = make_analysis(
            Some(TransitionDynamic::Castling),
            vec![],
            Some(ChessPieceKind::King),
            Some(pos(4, 0)),
            Some(pos(6, 0)),
            None,
            None,
            None,
            0,
        );
        let explanation = explain_move(&t);
        assert!(
            explanation.contains("castles"),
            "expected 'castles' in: {explanation}"
        );
        assert!(
            explanation.contains("kingside"),
            "expected 'kingside' in: {explanation}"
        );
    }

    #[test]
    fn explain_castling_queenside() {
        let t = make_analysis(
            Some(TransitionDynamic::Castling),
            vec![],
            Some(ChessPieceKind::King),
            Some(pos(4, 0)),
            Some(pos(2, 0)),
            None,
            None,
            None,
            0,
        );
        let explanation = explain_move(&t);
        assert!(
            explanation.contains("queenside"),
            "expected 'queenside' in: {explanation}"
        );
    }

    #[test]
    fn explain_passed_pawn_advance() {
        let t = make_analysis(
            Some(TransitionDynamic::PassedPawnAdvance),
            vec![],
            Some(ChessPieceKind::Pawn),
            Some(pos(4, 4)),
            Some(pos(4, 5)),
            None,
            None,
            None,
            120,
        );
        let explanation = explain_move(&t);
        assert!(
            explanation.contains("passed pawn"),
            "expected 'passed pawn' in: {explanation}"
        );
        assert!(
            explanation.contains("e6"),
            "expected target square 'e6' in: {explanation}"
        );
    }

    #[test]
    fn explain_quiet_forward_move() {
        let t = make_analysis(
            Some(TransitionDynamic::Quiet),
            vec![],
            Some(ChessPieceKind::Knight),
            Some(pos(1, 0)),
            Some(pos(2, 2)),
            None,
            None,
            None,
            150,
        );
        let explanation = explain_move(&t);
        assert!(
            explanation.contains("knight"),
            "expected 'knight' in: {explanation}"
        );
        assert!(
            explanation.contains("forward"),
            "expected 'forward' (progress > 100) in: {explanation}"
        );
    }

    #[test]
    fn explain_quiet_with_check_secondary() {
        let t = make_analysis(
            Some(TransitionDynamic::Quiet),
            vec![TransitionDynamic::Check],
            Some(ChessPieceKind::Bishop),
            Some(pos(2, 0)),
            Some(pos(5, 3)),
            None,
            None,
            None,
            0,
        );
        let explanation = explain_move(&t);
        assert!(
            explanation.contains("giving check"),
            "expected 'giving check' secondary in: {explanation}"
        );
    }

    #[test]
    fn explain_repetition_risk() {
        let t = make_analysis(
            Some(TransitionDynamic::RepetitionRisk),
            vec![],
            Some(ChessPieceKind::Rook),
            Some(pos(0, 0)),
            Some(pos(0, 4)),
            None,
            None,
            None,
            0,
        );
        let explanation = explain_move(&t);
        assert!(
            explanation.contains("repetition"),
            "expected 'repetition' in: {explanation}"
        );
    }

    #[test]
    fn explain_none_dynamic_fallback() {
        let t = make_analysis(
            None,
            vec![],
            Some(ChessPieceKind::Rook),
            Some(pos(0, 0)),
            Some(pos(0, 4)),
            None,
            None,
            None,
            0,
        );
        let explanation = explain_move(&t);
        assert!(
            !explanation.is_empty(),
            "explanation must not be empty for None dynamic"
        );
        assert!(
            explanation.contains("rook"),
            "expected piece name in: {explanation}"
        );
    }

    #[test]
    fn explain_conversion() {
        let t = make_analysis(
            Some(TransitionDynamic::Conversion),
            vec![],
            Some(ChessPieceKind::Queen),
            Some(pos(4, 4)),
            Some(pos(2, 6)),
            None,
            None,
            None,
            0,
        );
        let explanation = explain_move(&t);
        assert!(
            explanation.contains("simplifying"),
            "expected 'simplifying' in: {explanation}"
        );
    }

    #[test]
    fn all_dynamics_produce_non_empty_explanation() {
        let dynamics = vec![
            Some(TransitionDynamic::Mate),
            Some(TransitionDynamic::Quiet),
            Some(TransitionDynamic::Capture),
            Some(TransitionDynamic::Promotion),
            Some(TransitionDynamic::Check),
            Some(TransitionDynamic::Castling),
            Some(TransitionDynamic::Recapture),
            Some(TransitionDynamic::PassedPawnAdvance),
            Some(TransitionDynamic::Conversion),
            Some(TransitionDynamic::RepetitionRisk),
            None,
        ];
        for primary in dynamics {
            let t = make_analysis(
                primary,
                vec![],
                Some(ChessPieceKind::Knight),
                Some(pos(1, 0)),
                Some(pos(2, 2)),
                Some(ChessPieceKind::Pawn),
                Some(ChessPieceKind::Queen),
                Some(50),
                0,
            );
            let explanation = explain_move(&t);
            assert!(
                !explanation.is_empty(),
                "empty explanation for dynamic {:?}",
                primary
            );
            assert!(
                explanation.ends_with('.'),
                "explanation must end with '.' for dynamic {:?}: {explanation}",
                primary
            );
        }
    }
}
