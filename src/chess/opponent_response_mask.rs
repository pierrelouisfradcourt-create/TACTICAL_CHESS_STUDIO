use crate::chess::legal_action_adapter::{action_mask_from_engine, legal_action_from_action};
use crate::chess::piece_kind::ChessPieceKind;
use crate::chess::uci::action_key;
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::{PlayerId, Position};
use tactical_chess_pure_lab::core::{ActionId, ActionMask, ActionMaskError};

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum OpponentResponseMaskError {
    IllegalCandidateAction { candidate_action_key: String },
    SimulationFailed { candidate_action_key: String },
    Mask(ActionMaskError),
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OpponentResponseMaskSummary {
    pub candidate_action_id: ActionId,
    pub candidate_action_key: String,
    pub root_player: PlayerId,
    pub opponent_player: PlayerId,
    pub opponent_legal_count: usize,
    pub opponent_mask: ActionMask,
    pub capture_reply_count: usize,
    pub check_reply_count: usize,
    pub mate_reply_available: bool,
    pub promotion_reply_count: usize,
    pub unencodable_reply_count: usize,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MirrorRiskLevel {
    Quiet,
    Watch,
    Tactical,
    Dangerous,
    LosingCandidate,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MirrorRiskSummary {
    pub risk_level: MirrorRiskLevel,
    pub risk_score: u32,
    pub risk_reasons: Vec<String>,
    pub opponent_response_count: usize,
    pub opponent_capture_count: usize,
    pub opponent_check_count: usize,
    pub opponent_promotion_count: usize,
    pub opponent_mate_reply_available: bool,
    pub unencodable_reply_count: usize,
    pub blunder_like_flag: bool,
    pub safe_candidate_flag: bool,
}

impl MirrorRiskSummary {
    pub fn from_opponent_response(summary: &OpponentResponseMaskSummary) -> Self {
        const MATE_REPLY_SCORE: u32 = 100;
        const CHECK_REPLY_SCORE: u32 = 20;
        const CAPTURE_REPLY_SCORE: u32 = 5;
        const PROMOTION_REPLY_SCORE: u32 = 35;
        const UNENCODABLE_REPLY_HYGIENE_SCORE: u32 = 1;

        let mut tactical_score = 0_u32;
        let mut hygiene_score = 0_u32;
        let mut risk_reasons = Vec::new();

        if summary.mate_reply_available {
            tactical_score += MATE_REPLY_SCORE;
            risk_reasons.push("opponent_mate_reply_available".to_string());
        }

        if summary.check_reply_count > 0 {
            tactical_score += (summary.check_reply_count as u32) * CHECK_REPLY_SCORE;
            risk_reasons.push("opponent_check_replies_available".to_string());
        }

        if summary.capture_reply_count > 0 {
            tactical_score += (summary.capture_reply_count as u32) * CAPTURE_REPLY_SCORE;
            risk_reasons.push("opponent_capture_replies_available".to_string());
        }

        if summary.promotion_reply_count > 0 {
            tactical_score += (summary.promotion_reply_count as u32) * PROMOTION_REPLY_SCORE;
            risk_reasons.push("opponent_promotion_replies_available".to_string());
        }

        if summary.unencodable_reply_count > 0 {
            hygiene_score +=
                (summary.unencodable_reply_count as u32) * UNENCODABLE_REPLY_HYGIENE_SCORE;
            risk_reasons.push("opponent_unencodable_replies_present".to_string());
        }

        if risk_reasons.is_empty() {
            risk_reasons.push("no_forcing_reply_detected".to_string());
        }

        let risk_score = tactical_score + hygiene_score;
        let risk_level = if summary.mate_reply_available {
            MirrorRiskLevel::LosingCandidate
        } else if tactical_score >= 70 {
            MirrorRiskLevel::Dangerous
        } else if summary.check_reply_count > 0
            || summary.promotion_reply_count > 0
            || tactical_score >= 20
        {
            MirrorRiskLevel::Tactical
        } else if risk_score > 0 {
            MirrorRiskLevel::Watch
        } else {
            MirrorRiskLevel::Quiet
        };

        let blunder_like_flag = summary.mate_reply_available;
        let safe_candidate_flag = !summary.mate_reply_available
            && summary.check_reply_count == 0
            && summary.capture_reply_count == 0
            && summary.promotion_reply_count == 0;

        Self {
            risk_level,
            risk_score,
            risk_reasons,
            opponent_response_count: summary.opponent_legal_count,
            opponent_capture_count: summary.capture_reply_count,
            opponent_check_count: summary.check_reply_count,
            opponent_promotion_count: summary.promotion_reply_count,
            opponent_mate_reply_available: summary.mate_reply_available,
            unencodable_reply_count: summary.unencodable_reply_count,
            blunder_like_flag,
            safe_candidate_flag,
        }
    }
}

impl From<&OpponentResponseMaskSummary> for MirrorRiskSummary {
    fn from(summary: &OpponentResponseMaskSummary) -> Self {
        Self::from_opponent_response(summary)
    }
}

pub fn opponent_response_mask_after_candidate<F>(
    engine: &Engine,
    root_player: PlayerId,
    candidate: &Action,
    project_policy_index: Option<F>,
    move_vocab_fingerprint: Option<String>,
) -> Result<OpponentResponseMaskSummary, OpponentResponseMaskError>
where
    F: Fn(&str) -> Option<usize>,
{
    let candidate_action_key = action_key(candidate, &engine.units);
    let legal_candidate = engine
        .legal_actions(root_player)
        .into_iter()
        .find(|legal| action_key(legal, &engine.units) == candidate_action_key)
        .ok_or_else(|| OpponentResponseMaskError::IllegalCandidateAction {
            candidate_action_key: candidate_action_key.clone(),
        })?;

    let legal_candidate_action = legal_action_from_action(engine, &legal_candidate);
    let mut simulated = engine.clone();
    let undo = simulated
        .simulate_action_for_search(root_player, &legal_candidate)
        .ok_or_else(|| OpponentResponseMaskError::SimulationFailed {
            candidate_action_key: candidate_action_key.clone(),
        })?;

    let opponent_player = simulated.opponent(root_player);
    let opponent_actions = simulated.legal_actions(opponent_player);
    let opponent_legal_count = opponent_actions.len();
    let capture_reply_count = opponent_actions
        .iter()
        .filter(|reply| is_capture_reply(&simulated, opponent_player, reply))
        .count();
    let (check_reply_count, mate_reply_available) = forcing_reply_summary(
        &mut simulated,
        root_player,
        opponent_player,
        &opponent_actions,
    );
    let promotion_reply_count = opponent_actions
        .iter()
        .filter(|reply| is_promotion_reply(reply))
        .count();

    let opponent_mask = action_mask_from_engine(
        &simulated,
        opponent_player,
        project_policy_index,
        move_vocab_fingerprint,
    )
    .map_err(OpponentResponseMaskError::Mask)?;
    let unencodable_reply_count = opponent_mask.unencodable_action_ids().len();

    let _ = simulated.undo_action_for_search(undo);

    Ok(OpponentResponseMaskSummary {
        candidate_action_id: legal_candidate_action.action_id,
        candidate_action_key: legal_candidate_action.action_key,
        root_player,
        opponent_player,
        opponent_legal_count,
        opponent_mask,
        capture_reply_count,
        check_reply_count,
        mate_reply_available,
        promotion_reply_count,
        unencodable_reply_count,
    })
}

fn forcing_reply_summary(
    engine: &mut Engine,
    root_player: PlayerId,
    opponent_player: PlayerId,
    opponent_actions: &[Action],
) -> (usize, bool) {
    let mut check_reply_count = 0;
    let mut mate_reply_available = false;

    for reply in opponent_actions {
        let Some(undo) = engine.simulate_action_for_search(opponent_player, reply) else {
            continue;
        };
        let gives_check = engine.is_in_check(root_player);
        let is_mate = gives_check
            && engine.is_checkmate(root_player)
            && engine.winner() == Some(opponent_player);
        let _ = engine.undo_action_for_search(undo);

        if gives_check {
            check_reply_count += 1;
        }

        if is_mate {
            mate_reply_available = true;
        }
    }

    (check_reply_count, mate_reply_available)
}

fn is_promotion_reply(reply: &Action) -> bool {
    matches!(
        reply,
        Action::Move {
            promotion: Some(_),
            ..
        }
    )
}

fn is_capture_reply(engine: &Engine, player: PlayerId, reply: &Action) -> bool {
    let Action::Move {
        unit_id, target, ..
    } = reply
    else {
        return false;
    };

    let Some(unit) = engine.units.get(unit_id) else {
        return false;
    };
    if unit.owner != player {
        return false;
    }

    if engine
        .board
        .occupant(*target)
        .and_then(|target_id| engine.units.get(&target_id))
        .is_some_and(|target_unit| target_unit.owner != player)
    {
        return true;
    }

    is_en_passant_capture(engine, unit.kind, unit.position, *target)
}

fn is_en_passant_capture(
    engine: &Engine,
    piece: ChessPieceKind,
    from: Position,
    target: Position,
) -> bool {
    piece == ChessPieceKind::Pawn
        && engine.en_passant_target == Some(target)
        && engine.board.occupant(target).is_none()
        && from.x != target.x
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::chess::fen::engine_from_fen;

    fn find_action(engine: &Engine, player: PlayerId, key: &str) -> Action {
        engine
            .legal_actions(player)
            .into_iter()
            .find(|action| action_key(action, &engine.units) == key)
            .unwrap_or_else(|| panic!("expected legal action {key}"))
    }

    fn engine_signature(engine: &Engine) -> (String, usize, usize, PlayerId) {
        (
            engine.to_fen(),
            engine.units.len(),
            engine.action_log.len(),
            engine.turn_manager.current_player,
        )
    }

    #[test]
    fn quiet_candidate_produces_opponent_mask() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1").expect("valid FEN");
        let candidate = find_action(&engine, 1, "e2e3");

        let summary = opponent_response_mask_after_candidate(
            &engine,
            1,
            &candidate,
            None::<fn(&str) -> Option<usize>>,
            None,
        )
        .expect("quiet candidate should build opponent response mask");

        assert_eq!(summary.candidate_action_key, "e2e3");
        assert_eq!(summary.root_player, 1);
        assert_eq!(summary.opponent_player, 2);
        assert_eq!(
            summary.opponent_legal_count,
            summary.opponent_mask.legal_action_ids().len()
        );
        assert_eq!(
            summary.opponent_legal_count,
            summary.opponent_mask.legal_action_keys().len()
        );
        assert_eq!(summary.check_reply_count, 0);
        assert!(!summary.mate_reply_available);
    }

    #[test]
    fn capture_candidate_produces_opponent_mask() {
        let engine = engine_from_fen("4k3/8/8/8/3p4/4P3/8/4K3 w - - 0 1").expect("valid FEN");
        let candidate = find_action(&engine, 1, "e3d4");

        let summary = opponent_response_mask_after_candidate(
            &engine,
            1,
            &candidate,
            None::<fn(&str) -> Option<usize>>,
            None,
        )
        .expect("capture candidate should build opponent response mask");

        assert_eq!(summary.candidate_action_key, "e3d4");
        assert_eq!(
            summary.opponent_legal_count,
            summary.opponent_mask.legal_action_ids().len()
        );
    }

    #[test]
    fn illegal_candidate_is_rejected_fail_closed() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1").expect("valid FEN");
        let illegal = Action::Move {
            unit_id: 999,
            target: Position { x: 4, y: 3 },
            promotion: None,
        };

        let err = opponent_response_mask_after_candidate(
            &engine,
            1,
            &illegal,
            None::<fn(&str) -> Option<usize>>,
            None,
        )
        .expect_err("illegal candidate should fail closed");

        assert!(matches!(
            err,
            OpponentResponseMaskError::IllegalCandidateAction { .. }
        ));
    }

    #[test]
    fn original_engine_is_not_mutated() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1").expect("valid FEN");
        let before = engine_signature(&engine);
        let candidate = find_action(&engine, 1, "e2e4");

        let _ = opponent_response_mask_after_candidate(
            &engine,
            1,
            &candidate,
            None::<fn(&str) -> Option<usize>>,
            None,
        )
        .expect("candidate should build opponent response mask");

        assert_eq!(engine_signature(&engine), before);
    }

    #[test]
    fn opponent_side_and_mask_match_simulated_legal_actions() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1").expect("valid FEN");
        let candidate = find_action(&engine, 1, "e2e4");
        let summary = opponent_response_mask_after_candidate(
            &engine,
            1,
            &candidate,
            None::<fn(&str) -> Option<usize>>,
            None,
        )
        .expect("candidate should build opponent response mask");

        let mut simulated = engine.clone();
        let undo = simulated
            .simulate_action_for_search(1, &candidate)
            .expect("legal candidate should simulate");
        let opponent = simulated.opponent(1);
        let opponent_legal = simulated.legal_actions(opponent);
        let opponent_keys = opponent_legal
            .iter()
            .map(|reply| action_key(reply, &simulated.units))
            .collect::<Vec<_>>();
        let _ = simulated.undo_action_for_search(undo);

        assert_eq!(summary.opponent_player, opponent);
        assert_eq!(summary.opponent_legal_count, opponent_legal.len());
        assert_eq!(
            summary.opponent_mask.legal_action_keys(),
            opponent_keys.as_slice()
        );
    }

    #[test]
    fn unencodable_reply_tracking_is_preserved() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1").expect("valid FEN");
        let candidate = find_action(&engine, 1, "e2e4");
        let summary = opponent_response_mask_after_candidate(
            &engine,
            1,
            &candidate,
            Some(|key: &str| if key == "e8d7" { Some(7) } else { None }),
            Some("fixture_vocab".to_string()),
        )
        .expect("partial projection should build opponent response mask");

        assert_eq!(
            summary.unencodable_reply_count,
            summary.opponent_mask.unencodable_action_ids().len()
        );
        assert!(summary.unencodable_reply_count < summary.opponent_legal_count);
        assert_eq!(
            summary.opponent_mask.move_vocab_fingerprint(),
            Some("fixture_vocab")
        );
    }

    #[test]
    fn promotion_candidate_keeps_suffix_identity() {
        let engine = engine_from_fen("4k3/P7/8/8/8/8/8/4K3 w - - 0 1").expect("valid FEN");
        let candidate = find_action(&engine, 1, "a7a8q");

        let summary = opponent_response_mask_after_candidate(
            &engine,
            1,
            &candidate,
            None::<fn(&str) -> Option<usize>>,
            None,
        )
        .expect("promotion candidate should build opponent response mask");

        assert_eq!(summary.candidate_action_key, "a7a8q");
        assert_eq!(summary.candidate_action_id.as_str(), "a7a8q");
    }

    #[test]
    fn classical_castling_candidate_keeps_king_destination_identity() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1").expect("valid FEN");
        let candidate = find_action(&engine, 1, "e1g1");

        let summary = opponent_response_mask_after_candidate(
            &engine,
            1,
            &candidate,
            None::<fn(&str) -> Option<usize>>,
            None,
        )
        .expect("castling candidate should build opponent response mask");

        assert_eq!(summary.candidate_action_key, "e1g1");
        assert_eq!(summary.candidate_action_id.as_str(), "e1g1");
    }

    #[test]
    fn response_counts_include_captures_and_keeps_check_count_bounded() {
        let engine = engine_from_fen("4k3/P7/8/8/3q4/8/4P3/4K3 w - - 0 1").expect("valid FEN");
        let candidate = find_action(&engine, 1, "e2e3");

        let summary = opponent_response_mask_after_candidate(
            &engine,
            1,
            &candidate,
            None::<fn(&str) -> Option<usize>>,
            None,
        )
        .expect("candidate should build opponent response mask");

        assert!(summary.capture_reply_count > 0);
        assert!(summary.check_reply_count <= summary.opponent_legal_count);
        assert_eq!(summary.promotion_reply_count, 0);
    }

    #[test]
    fn quiet_candidate_produces_quiet_or_watch_mirror_risk() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1").expect("valid FEN");
        let candidate = find_action(&engine, 1, "e2e3");

        let response = opponent_response_mask_after_candidate(
            &engine,
            1,
            &candidate,
            None::<fn(&str) -> Option<usize>>,
            None,
        )
        .expect("quiet candidate should build opponent response mask");
        let risk = MirrorRiskSummary::from(&response);

        assert!(matches!(
            risk.risk_level,
            MirrorRiskLevel::Quiet | MirrorRiskLevel::Watch
        ));
        assert_eq!(risk.opponent_response_count, response.opponent_legal_count);
        assert_eq!(risk.opponent_check_count, 0);
        assert!(!risk.opponent_mate_reply_available);
        assert!(!risk.blunder_like_flag);
    }

    #[test]
    fn opponent_check_reply_positive_fixture() {
        let engine = engine_from_fen("4k2r/8/8/8/8/8/4P3/4K3 w - - 0 1").expect("valid FEN");
        let candidate = find_action(&engine, 1, "e2e3");

        let summary = opponent_response_mask_after_candidate(
            &engine,
            1,
            &candidate,
            None::<fn(&str) -> Option<usize>>,
            None,
        )
        .expect("candidate should build opponent response mask");

        assert_eq!(summary.candidate_action_key, "e2e3");
        assert_eq!(summary.root_player, 1);
        assert_eq!(summary.opponent_player, 2);
        assert!(summary.check_reply_count > 0);
        assert!(summary.check_reply_count <= summary.opponent_legal_count);
        assert_eq!(
            summary.opponent_legal_count,
            summary.opponent_mask.legal_action_ids().len()
        );

        let mut without_checks = summary.clone();
        without_checks.check_reply_count = 0;
        let baseline_risk = MirrorRiskSummary::from(&without_checks);
        let check_risk = MirrorRiskSummary::from(&summary);

        assert!(check_risk.risk_score > baseline_risk.risk_score);
        assert!(matches!(
            check_risk.risk_level,
            MirrorRiskLevel::Tactical | MirrorRiskLevel::Dangerous
        ));
        assert!(!check_risk.blunder_like_flag);
    }

    #[test]
    fn opponent_mate_in_one_reply_positive_fixture() {
        let engine = engine_from_fen("8/8/8/8/1q6/8/2k4P/K7 w - - 0 1").expect("valid FEN");
        let candidate = find_action(&engine, 1, "h2h3");

        let summary = opponent_response_mask_after_candidate(
            &engine,
            1,
            &candidate,
            None::<fn(&str) -> Option<usize>>,
            None,
        )
        .expect("candidate should build opponent response mask");

        assert_eq!(summary.candidate_action_key, "h2h3");
        assert_eq!(summary.root_player, 1);
        assert_eq!(summary.opponent_player, 2);
        assert!(summary.check_reply_count > 0);
        assert!(summary.mate_reply_available);
        assert_eq!(
            summary.opponent_legal_count,
            summary.opponent_mask.legal_action_ids().len()
        );

        let risk = MirrorRiskSummary::from(&summary);

        assert!(matches!(
            risk.risk_level,
            MirrorRiskLevel::Dangerous | MirrorRiskLevel::LosingCandidate
        ));
        assert!(risk.opponent_mate_reply_available);
        assert!(risk.blunder_like_flag);
        assert!(!risk.safe_candidate_flag);
    }

    #[test]
    fn capture_reply_increases_mirror_risk_score_without_blunder_flag() {
        let engine = engine_from_fen("4k3/P7/8/8/3q4/8/4P3/4K3 w - - 0 1").expect("valid FEN");
        let candidate = find_action(&engine, 1, "e2e3");

        let summary = opponent_response_mask_after_candidate(
            &engine,
            1,
            &candidate,
            None::<fn(&str) -> Option<usize>>,
            None,
        )
        .expect("candidate should build opponent response mask");
        assert!(summary.capture_reply_count > 0);

        let mut without_captures = summary.clone();
        without_captures.capture_reply_count = 0;

        let capture_risk = MirrorRiskSummary::from(&summary);
        let baseline_risk = MirrorRiskSummary::from(&without_captures);

        assert!(capture_risk.risk_score > baseline_risk.risk_score);
        assert!(!capture_risk.blunder_like_flag);
    }

    #[test]
    fn promotion_reply_increases_mirror_risk_score() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/p3P3/4K3 w - - 0 1").expect("valid FEN");
        let candidate = find_action(&engine, 1, "e2e3");

        let summary = opponent_response_mask_after_candidate(
            &engine,
            1,
            &candidate,
            None::<fn(&str) -> Option<usize>>,
            None,
        )
        .expect("candidate should build opponent response mask");
        assert!(summary.promotion_reply_count > 0);

        let mut without_promotions = summary.clone();
        without_promotions.promotion_reply_count = 0;

        let promotion_risk = MirrorRiskSummary::from(&summary);
        let baseline_risk = MirrorRiskSummary::from(&without_promotions);

        assert!(promotion_risk.risk_score > baseline_risk.risk_score);
        assert!(matches!(
            promotion_risk.risk_level,
            MirrorRiskLevel::Tactical | MirrorRiskLevel::Dangerous
        ));
    }

    #[test]
    fn unencodable_replies_are_hygiene_only_for_mirror_risk() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1").expect("valid FEN");
        let candidate = find_action(&engine, 1, "e2e3");

        let summary = opponent_response_mask_after_candidate(
            &engine,
            1,
            &candidate,
            None::<fn(&str) -> Option<usize>>,
            None,
        )
        .expect("quiet candidate should build opponent response mask");
        assert!(summary.unencodable_reply_count > 0);
        assert_eq!(summary.capture_reply_count, 0);
        assert_eq!(summary.check_reply_count, 0);
        assert_eq!(summary.promotion_reply_count, 0);
        assert!(!summary.mate_reply_available);

        let risk = MirrorRiskSummary::from(&summary);

        assert!(matches!(risk.risk_level, MirrorRiskLevel::Watch));
        assert!(!risk.blunder_like_flag);
        assert!(risk.safe_candidate_flag);
    }

    #[test]
    fn mirror_risk_summary_is_deterministic() {
        let engine = engine_from_fen("4k2r/8/8/8/8/8/4P3/4K3 w - - 0 1").expect("valid FEN");
        let candidate = find_action(&engine, 1, "e2e3");

        let first_response = opponent_response_mask_after_candidate(
            &engine,
            1,
            &candidate,
            None::<fn(&str) -> Option<usize>>,
            None,
        )
        .expect("candidate should build opponent response mask");
        let second_response = opponent_response_mask_after_candidate(
            &engine,
            1,
            &candidate,
            None::<fn(&str) -> Option<usize>>,
            None,
        )
        .expect("candidate should build opponent response mask");

        assert_eq!(
            MirrorRiskSummary::from(&first_response),
            MirrorRiskSummary::from(&second_response)
        );
    }

    #[test]
    fn mirror_risk_summary_does_not_integrate_search() {
        let source = include_str!("opponent_response_mask.rs");
        let active_source = source
            .split("#[cfg(test)]")
            .next()
            .expect("active source section should exist");

        assert!(!active_source.contains("crate::chess::search"));
        assert!(!active_source.contains("search_root"));
        assert!(!active_source.contains("RootSearchResult"));
    }

    #[test]
    fn chess960_is_not_activated_by_helper() {
        let engine = engine_from_fen("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1").expect("valid FEN");
        let candidate = find_action(&engine, 1, "e2e4");

        let summary = opponent_response_mask_after_candidate(
            &engine,
            1,
            &candidate,
            None::<fn(&str) -> Option<usize>>,
            None,
        )
        .expect("standard chess candidate should build opponent response mask");

        assert_eq!(summary.candidate_action_key, "e2e4");
        assert!(summary
            .opponent_mask
            .legal_action_keys()
            .iter()
            .all(|key| !key.contains("960")));
    }

    #[test]
    fn helper_does_not_use_dataset_training_or_humangate() {
        let source = include_str!("opponent_response_mask.rs");
        let active_source = source
            .split("#[cfg(test)]")
            .next()
            .expect("active source section should exist");

        assert!(!active_source.contains("dataset"));
        assert!(!active_source.contains("training"));
        assert!(!active_source.contains("HumanGate"));
        assert!(!active_source.contains("DecisionController"));
    }
}
