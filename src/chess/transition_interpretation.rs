use crate::chess::eval::static_evaluate;
use crate::chess::transition_analysis::{TransitionAnalysis, TransitionDynamic};
use crate::chess::transition_reply::{opponent_worst_case_value, WorstCaseCutoff};
use crate::engine::engine::Engine;
use crate::engine::entity::unit::PlayerId;

const MATE_INTERPRETATION_SCORE: i32 = 1_000_000;
const INTERPRETATION_SCORE_LIMIT: i32 = 250_000;
const REPETITION_PENALTY_PER_SIGNAL: i32 = 20;

pub fn interpret_transition(t: &TransitionAnalysis) -> i32 {
    interpret_transition_with_worst_case(t, None)
}

pub fn interpret_transition_with_simulation(
    engine: &Engine,
    player: PlayerId,
    t: &TransitionAnalysis,
) -> i32 {
    let current_eval = static_evaluate(engine, player);
    let worst_case = opponent_worst_case_value(
        engine,
        player,
        &t.action,
        Some(WorstCaseCutoff {
            relative_floor: current_eval.saturating_sub(1_000),
            terminal_floor: -800_000,
        }),
    );
    interpret_transition_with_worst_case(t, Some((current_eval, worst_case)))
}

fn interpret_transition_with_worst_case(
    t: &TransitionAnalysis,
    reply_window: Option<(i32, i32)>,
) -> i32 {
    if t.primary_dynamic == Some(TransitionDynamic::Mate) {
        return MATE_INTERPRETATION_SCORE;
    }

    if let Some(capture_score) = t.capture_exchange_score {
        if capture_score > 0 && reply_is_worse_than_current(reply_window, 200) {
            if t.tactical_score < 150 {
                return -500_000;
            }
        }
    }

    if t.primary_dynamic == Some(TransitionDynamic::Check)
        && reply_is_worse_than_current(reply_window, 200)
    {
        if t.tactical_score < 100 {
            return -400_000;
        }
    }

    if let Some(capture_score) = t.capture_exchange_score {
        if capture_score < -200 && reply_is_worse_than_current(reply_window, 100) {
            if t.tactical_score < 50 {
                return -300_000;
            }
        }
    }

    let mut score = t.resulting_state_value;

    if let Some(capture_score) = t.capture_exchange_score {
        if capture_score > 0 && t.capture_safety_signal < -200 {
            score = score.saturating_sub(600);
        }

        if capture_score > 300 && t.capture_safety_signal >= 0 {
            score = score.saturating_add(200);
        }
    }

    if t.primary_dynamic == Some(TransitionDynamic::Check) && t.capture_safety_signal < -150 {
        score = score.saturating_sub(300);
    }

    if t.repetition_signal > 0 && t.resulting_state_value > 0 {
        score = score.saturating_sub(200);
    }

    if let Some(capture_score) = t.capture_exchange_score {
        if capture_score > 0 && t.capture_safety_signal < 0 {
            score = score.saturating_sub(800);
        }

        if capture_score > 0 && t.capture_safety_signal >= 0 && t.tactical_score > 100 {
            score = score.saturating_add(300);
        }
    }

    if t.primary_dynamic == Some(TransitionDynamic::Check) && t.capture_safety_signal < 0 {
        score = score.saturating_sub(500);
    }

    if t.primary_dynamic == Some(TransitionDynamic::PassedPawnAdvance) && t.tactical_score > 50 {
        score = score.saturating_add(200);
    }

    if t.repetition_signal > 0 && t.tactical_score < 20 {
        score = score.saturating_sub(300);
    }

    score = score.saturating_add(t.tactical_score);

    if let Some(capture_score) = t.capture_exchange_score {
        score = score.saturating_add(capture_score);
    }

    score = score.saturating_add(t.capture_safety_signal);
    score = score.saturating_add(t.trade_simplification_bonus);
    score = score.saturating_sub(
        t.repetition_signal
            .saturating_mul(REPETITION_PENALTY_PER_SIGNAL),
    );

    score.clamp(-INTERPRETATION_SCORE_LIMIT, INTERPRETATION_SCORE_LIMIT)
}

fn reply_is_worse_than_current(reply_window: Option<(i32, i32)>, margin: i32) -> bool {
    let Some((current_eval, worst_case)) = reply_window else {
        return false;
    };

    worst_case < current_eval.saturating_sub(margin)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chess::fen::engine_from_fen;
    use crate::chess::transition_analysis::analyze_transition;
    use crate::chess::uci::action_to_uci;
    use crate::engine::action::action::Action;

    fn analysis(
        resulting_state_value: i32,
        tactical_score: i32,
        capture_exchange_score: Option<i32>,
        capture_safety_signal: i32,
        trade_simplification_bonus: i32,
        repetition_signal: i32,
        primary_dynamic: Option<TransitionDynamic>,
    ) -> TransitionAnalysis {
        TransitionAnalysis {
            action: Action::Pass,
            moving_piece: None,
            from: None,
            to: None,
            captured_piece: None,
            promotion: None,
            resulting_state_value,
            search_state_value: 0,
            primary_dynamic,
            secondary_dynamics: Vec::new(),
            progress_score: 0,
            tactical_score,
            capture_exchange_score,
            repetition_signal,
            capture_safety_signal,
            promotion_race_signal: 0,
            trade_simplification_bonus,
        }
    }

    fn legal_move(engine: &Engine, player: PlayerId, uci: &str) -> Action {
        engine
            .legal_actions(player)
            .into_iter()
            .find(|action| action_to_uci(action, &engine.units).as_deref() == Some(uci))
            .expect("expected legal move")
    }

    fn analyzed_move(fen: &str, uci: &str) -> (Engine, PlayerId, TransitionAnalysis) {
        let engine = engine_from_fen(fen).expect("valid FEN");
        let player = engine.turn_manager.current_player;
        let action = legal_move(&engine, player, uci);
        let analysis = analyze_transition(&engine, player, &action, 0);
        (engine, player, analysis)
    }

    #[test]
    fn good_capture_scores_above_bad_capture() {
        let good_capture = analysis(
            120,
            30,
            Some(300),
            40,
            0,
            0,
            Some(TransitionDynamic::Capture),
        );
        let bad_capture = analysis(
            120,
            30,
            Some(-300),
            -80,
            0,
            0,
            Some(TransitionDynamic::Capture),
        );

        assert!(interpret_transition(&good_capture) > interpret_transition(&bad_capture));
    }

    #[test]
    fn safe_check_scores_above_unsafe_check() {
        let safe_check = analysis(80, 160, None, 45, 0, 0, Some(TransitionDynamic::Check));
        let unsafe_check = analysis(80, 160, None, -220, 0, 0, Some(TransitionDynamic::Check));

        assert!(interpret_transition(&safe_check) > interpret_transition(&unsafe_check));
    }

    #[test]
    fn mate_always_scores_highest() {
        let mate = analysis(
            -900_000,
            -900_000,
            Some(-900_000),
            -900_000,
            -900_000,
            100,
            Some(TransitionDynamic::Mate),
        );
        let strong_non_mate = analysis(
            900_000,
            900_000,
            Some(900_000),
            900_000,
            900_000,
            0,
            Some(TransitionDynamic::Capture),
        );

        assert_eq!(interpret_transition(&mate), MATE_INTERPRETATION_SCORE);
        assert!(interpret_transition(&mate) > interpret_transition(&strong_non_mate));
    }

    #[test]
    fn repetition_is_penalized() {
        let clean = analysis(0, 50, None, 0, 0, 0, Some(TransitionDynamic::Quiet));
        let repeated = analysis(
            0,
            50,
            None,
            0,
            0,
            3,
            Some(TransitionDynamic::RepetitionRisk),
        );

        assert_eq!(
            interpret_transition(&clean) - interpret_transition(&repeated),
            3 * REPETITION_PENALTY_PER_SIGNAL
        );
    }

    #[test]
    fn unsafe_capture_penalized() {
        let unsafe_capture = analysis(
            100,
            0,
            Some(100),
            -250,
            0,
            0,
            Some(TransitionDynamic::Capture),
        );
        let safe_capture = analysis(
            100,
            0,
            Some(100),
            -200,
            0,
            0,
            Some(TransitionDynamic::Capture),
        );

        assert_eq!(
            interpret_transition(&safe_capture) - interpret_transition(&unsafe_capture),
            650
        );
    }

    #[test]
    fn safe_capture_rewarded() {
        let ordinary_capture =
            analysis(100, 0, Some(300), 0, 0, 0, Some(TransitionDynamic::Capture));
        let forced_good_capture =
            analysis(100, 0, Some(301), 0, 0, 0, Some(TransitionDynamic::Capture));

        assert_eq!(
            interpret_transition(&forced_good_capture) - interpret_transition(&ordinary_capture),
            201
        );
    }

    #[test]
    fn dangerous_check_penalized() {
        let safe_check = analysis(100, 0, None, -150, 0, 0, Some(TransitionDynamic::Check));
        let dangerous_check = analysis(100, 0, None, -151, 0, 0, Some(TransitionDynamic::Check));

        assert_eq!(
            interpret_transition(&safe_check) - interpret_transition(&dangerous_check),
            301
        );
    }

    #[test]
    fn repetition_penalty_applied() {
        let clean = analysis(100, 0, None, 0, 0, 0, Some(TransitionDynamic::Quiet));
        let repeated = analysis(
            100,
            0,
            None,
            0,
            0,
            1,
            Some(TransitionDynamic::RepetitionRisk),
        );

        assert_eq!(
            interpret_transition(&clean) - interpret_transition(&repeated),
            200 + 300 + REPETITION_PENALTY_PER_SIGNAL
        );
    }

    #[test]
    fn unsafe_capture_always_bad() {
        let quiet_move = analysis(100, 0, None, 0, 0, 0, Some(TransitionDynamic::Quiet));
        let unsafe_capture = analysis(
            100,
            0,
            Some(100),
            -1,
            0,
            0,
            Some(TransitionDynamic::Capture),
        );

        assert!(interpret_transition(&unsafe_capture) < interpret_transition(&quiet_move));
    }

    #[test]
    fn safe_aggressive_capture_good() {
        let quiet_pressure = analysis(100, 101, None, 0, 0, 0, Some(TransitionDynamic::Quiet));
        let safe_aggressive_capture =
            analysis(100, 101, Some(1), 0, 0, 0, Some(TransitionDynamic::Capture));

        assert_eq!(
            interpret_transition(&safe_aggressive_capture) - interpret_transition(&quiet_pressure),
            301
        );
    }

    #[test]
    fn strong_passed_pawn_rewarded() {
        let quiet_pressure = analysis(100, 51, None, 0, 0, 0, Some(TransitionDynamic::Quiet));
        let passed_pawn_pressure = analysis(
            100,
            51,
            None,
            0,
            0,
            0,
            Some(TransitionDynamic::PassedPawnAdvance),
        );

        assert_eq!(
            interpret_transition(&passed_pawn_pressure) - interpret_transition(&quiet_pressure),
            200
        );
    }

    #[test]
    fn unsafe_capture_refuted() {
        let (engine, player, unsafe_capture) =
            analyzed_move("6k1/3q4/8/8/3p4/8/8/3RK3 w - - 0 1", "d1d4");

        let score = interpret_transition_with_simulation(&engine, player, &unsafe_capture);

        // bounded worst-case evaluation may not detect full catastrophic refutation
        assert!(score < -1000);
    }

    #[test]
    fn safe_capture_not_refuted() {
        let (engine, player, safe_capture) =
            analyzed_move("6k1/8/8/8/3p4/8/8/3RK3 w - - 0 1", "d1d4");

        assert_ne!(
            interpret_transition_with_simulation(&engine, player, &safe_capture),
            -500_000
        );
    }

    #[test]
    fn check_refuted_vs_forced() {
        let (refuted_engine, refuted_player, refuted_check) =
            analyzed_move("4k3/8/8/8/1b6/8/4N3/K3R3 w - - 0 1", "e2g3");
        let (forced_engine, forced_player, forced_check) =
            analyzed_move("6k1/6pp/8/8/8/8/6Q1/4K1R1 w - - 0 1", "g2g7");

        assert_eq!(
            interpret_transition_with_simulation(&refuted_engine, refuted_player, &refuted_check),
            -400_000
        );
        assert_eq!(
            interpret_transition_with_simulation(&forced_engine, forced_player, &forced_check),
            MATE_INTERPRETATION_SCORE
        );
    }

    #[test]
    fn move_with_single_bad_reply_but_good_overall_allowed() {
        let playable_capture = analysis(
            1_200,
            0,
            Some(100),
            0,
            0,
            0,
            Some(TransitionDynamic::Capture),
        );

        assert_ne!(
            interpret_transition_with_worst_case(&playable_capture, Some((1_000, 801))),
            -500_000
        );
    }

    #[test]
    fn move_with_consistently_bad_replies_rejected() {
        let unsafe_capture = analysis(
            1_200,
            0,
            Some(100),
            0,
            0,
            0,
            Some(TransitionDynamic::Capture),
        );

        assert_eq!(
            interpret_transition_with_worst_case(&unsafe_capture, Some((1_000, 799))),
            -500_000
        );
    }

    #[test]
    fn strong_tactical_move_with_mixed_replies_handled_correctly() {
        let tactical_capture = analysis(
            1_200,
            150,
            Some(100),
            0,
            0,
            0,
            Some(TransitionDynamic::Capture),
        );

        assert_ne!(
            interpret_transition_with_worst_case(&tactical_capture, Some((1_000, -500))),
            -500_000
        );
    }

    #[test]
    fn losing_trade_rejected() {
        let losing_trade = analysis(
            10_000,
            49,
            Some(-201),
            10_000,
            10_000,
            0,
            Some(TransitionDynamic::Capture),
        );

        assert_eq!(
            interpret_transition_with_worst_case(&losing_trade, Some((1_000, 899))),
            -300_000
        );
    }

    #[test]
    fn non_mate_scores_are_clamped() {
        let high = analysis(
            i32::MAX,
            i32::MAX,
            Some(i32::MAX),
            i32::MAX,
            i32::MAX,
            i32::MIN,
            Some(TransitionDynamic::Capture),
        );
        let low = analysis(
            i32::MIN,
            i32::MIN,
            None,
            i32::MIN,
            i32::MIN,
            i32::MAX,
            Some(TransitionDynamic::Quiet),
        );

        assert_eq!(interpret_transition(&high), INTERPRETATION_SCORE_LIMIT);
        assert_eq!(interpret_transition(&low), -INTERPRETATION_SCORE_LIMIT);
    }
}
