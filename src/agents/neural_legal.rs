use crate::chess::uci::action_to_uci;
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;

pub(crate) type LegalActionMove = (Action, String);

pub(crate) fn action_moves_from_legal_actions(
    engine: &Engine,
    actions: &[Action],
) -> Vec<LegalActionMove> {
    let mut action_moves = Vec::new();
    for action in actions {
        if let Some(mv) = action_to_uci(action, &engine.units) {
            action_moves.push((*action, mv));
        }
    }
    action_moves
}

pub(crate) fn uci_moves(action_moves: &[LegalActionMove]) -> Vec<String> {
    action_moves.iter().map(|(_, mv)| mv.clone()).collect()
}

pub(crate) fn is_legal_uci(legal_moves: &[String], uci_move: &str) -> bool {
    legal_moves.iter().any(|mv| mv == uci_move)
}

pub(crate) fn selected_action_for_uci(
    action_moves: &[LegalActionMove],
    selected_uci: &str,
) -> Option<Action> {
    action_moves
        .iter()
        .find(|(_, mv)| mv == selected_uci)
        .map(|(action, _)| *action)
}

pub(crate) fn fallback_action_from_legal(
    action_moves: &[LegalActionMove],
    actions: &[Action],
) -> Action {
    action_moves
        .first()
        .map(|(action, _)| *action)
        .unwrap_or_else(|| actions[0])
}

pub(crate) fn legal_candidate_shortlist(
    candidate_moves: &[String],
    legal_moves: &[String],
    predicted_move: &str,
    predicted_is_legal: bool,
    shortlist_cap: usize,
) -> Vec<String> {
    let mut pool = Vec::new();

    if predicted_is_legal {
        pool.push(predicted_move.to_string());
    }

    for mv in candidate_moves {
        if pool.len() >= shortlist_cap {
            break;
        }

        if is_legal_uci(legal_moves, mv) && !pool.iter().any(|seen| seen == mv) {
            pool.push(mv.clone());
        }
    }

    pool
}

pub(crate) fn selected_policy_rank_for_move(
    candidate_moves: &[String],
    best_move: &str,
    predicted_move: &str,
) -> i32 {
    if best_move == predicted_move {
        1
    } else {
        candidate_moves
            .iter()
            .position(|candidate| candidate == best_move)
            .map(|idx| (idx + 1) as i32)
            .unwrap_or(-1)
    }
}

#[cfg(test)]
mod tests {
    use super::{
        fallback_action_from_legal, legal_candidate_shortlist, selected_action_for_uci,
        selected_policy_rank_for_move,
    };
    use crate::engine::action::action::Action;
    use crate::engine::entity::unit::Position;

    fn move_action(unit_id: u32, x: u32) -> Action {
        Action::Move {
            unit_id,
            target: Position { x, y: 0 },
            promotion: None,
        }
    }

    #[test]
    fn neural_legal_candidate_shortlist_keeps_predicted_first_and_unique_legal_moves() {
        let legal = vec!["e2e4".to_string(), "g1f3".to_string(), "d2d4".to_string()];
        let candidates = vec![
            "e2e4".to_string(),
            "a1a8".to_string(),
            "g1f3".to_string(),
            "g1f3".to_string(),
            "d2d4".to_string(),
        ];

        let shortlist = legal_candidate_shortlist(&candidates, &legal, "e2e4", true, 3);

        assert_eq!(
            shortlist,
            vec!["e2e4".to_string(), "g1f3".to_string(), "d2d4".to_string()]
        );
    }

    #[test]
    fn neural_legal_candidate_shortlist_does_not_let_invalid_candidates_consume_cap() {
        let legal = vec!["g1f3".to_string()];
        let candidates = vec!["a1a8".to_string(), "g1f3".to_string()];

        let shortlist = legal_candidate_shortlist(&candidates, &legal, "e2e4", false, 1);

        assert_eq!(shortlist, vec!["g1f3".to_string()]);
    }

    #[test]
    fn neural_legal_selected_action_lookup_returns_matching_action() {
        let action_moves = vec![
            (move_action(1, 1), "a2a3".to_string()),
            (move_action(2, 2), "b2b3".to_string()),
        ];

        let Some(Action::Move { unit_id, .. }) = selected_action_for_uci(&action_moves, "b2b3")
        else {
            panic!("expected matching move action");
        };

        assert_eq!(unit_id, 2);
        assert!(selected_action_for_uci(&action_moves, "h1h8").is_none());
    }

    #[test]
    fn neural_legal_fallback_action_prefers_first_convertible_action() {
        let first = move_action(1, 1);
        let second = move_action(2, 2);
        let action_moves = vec![(second, "b2b3".to_string())];

        let fallback = fallback_action_from_legal(&action_moves, &[first, second]);

        let Action::Move { unit_id, .. } = fallback else {
            panic!("expected fallback move action");
        };
        assert_eq!(unit_id, 2);
    }

    #[test]
    fn neural_legal_selected_policy_rank_preserves_existing_rank_rules() {
        let candidates = vec!["a2a3".to_string(), "b2b3".to_string()];

        assert_eq!(
            selected_policy_rank_for_move(&candidates, "e2e4", "e2e4"),
            1
        );
        assert_eq!(
            selected_policy_rank_for_move(&candidates, "b2b3", "e2e4"),
            2
        );
        assert_eq!(
            selected_policy_rank_for_move(&candidates, "h1h8", "e2e4"),
            -1
        );
    }
}
