use tactical_chess_pure_lab::core::{
    PuzzleCaseLike, RockyErrorSourceInput, SharedPuzzleCandidate, CANDIDATE_REPLAY_STATUS,
    RNG_TUTORIAL_SOURCE, ROCKY_ERROR_SOURCE,
};

const PUZZLE_CASE_FIXTURE: &str = include_str!("fixtures/puzzle_rng_mate1_seed42.jsonl");
const GOLDEN_CANDIDATE_FIXTURE: &str =
    include_str!("fixtures/shared_puzzle_candidate_rng_tutorial_v0.json");
const ROCKY_ERROR_SOURCE_FIXTURE: &str = include_str!("fixtures/rocky_error_source_input_v0.json");

#[test]
fn maps_rng_tutorial_puzzle_case_to_shared_candidate() {
    let source_case: PuzzleCaseLike =
        serde_json::from_str(PUZZLE_CASE_FIXTURE.trim()).expect("fixture should parse");

    let candidate = SharedPuzzleCandidate::from_rng_tutorial_puzzle_case(source_case);
    let expected_candidate: SharedPuzzleCandidate =
        serde_json::from_str(GOLDEN_CANDIDATE_FIXTURE).expect("golden fixture should parse");

    assert_eq!(candidate, expected_candidate);
    assert_eq!(candidate.source_type, RNG_TUTORIAL_SOURCE);
    assert_eq!(candidate.replay_status, CANDIDATE_REPLAY_STATUS);
    assert!(candidate.humangate_required);
    assert!(!candidate.dataset_admissible);
    assert_eq!(candidate.solved_count, 0);
    assert_eq!(candidate.failed_count, 0);
    assert_eq!(candidate.regressed_count, 0);
    assert_eq!(candidate.observed_bad_move, None);
    assert_eq!(candidate.source_game_id, None);
    assert_eq!(candidate.source_ply, None);
    assert!(!candidate.solution_line.is_empty());
    assert!(candidate
        .candidate_better_move
        .as_ref()
        .is_some_and(|move_uci| candidate.solution_line.contains(move_uci)));
    assert_eq!(candidate.theme, "mate1");
    assert_eq!(candidate.difficulty_level, "1");
}

#[test]
fn maps_rocky_error_source_input_to_shared_candidate() {
    let source_input: RockyErrorSourceInput =
        serde_json::from_str(ROCKY_ERROR_SOURCE_FIXTURE).expect("rocky fixture should parse");
    let expected_source_game_id = source_input.source_game_id.clone();
    let expected_source_ply = source_input.source_ply;
    let expected_side_to_move = source_input.side_to_move.clone();
    let expected_observed_bad_move = source_input.observed_bad_move.clone();
    let expected_candidate_better_move = source_input.candidate_better_move.clone();
    let expected_search_evidence = source_input.search_evidence.clone();
    let expected_neural_context = source_input.neural_context.clone();

    let candidate = SharedPuzzleCandidate::from_rocky_error_source_input(source_input);

    assert_eq!(candidate.source_type, ROCKY_ERROR_SOURCE);
    assert_eq!(candidate.replay_status, CANDIDATE_REPLAY_STATUS);
    assert!(candidate.humangate_required);
    assert!(!candidate.dataset_admissible);
    assert_eq!(candidate.solved_count, 0);
    assert_eq!(candidate.failed_count, 0);
    assert_eq!(candidate.regressed_count, 0);
    assert_eq!(
        candidate.source_game_id.as_deref(),
        Some(expected_source_game_id.as_str())
    );
    assert_eq!(candidate.source_ply, Some(expected_source_ply));
    assert_eq!(
        candidate.observed_bad_move.as_deref(),
        Some(expected_observed_bad_move.as_str())
    );
    assert_eq!(
        candidate.side_to_move,
        serde_json::json!(expected_side_to_move)
    );
    assert_eq!(
        candidate.candidate_better_move.as_deref(),
        Some(expected_candidate_better_move.as_str())
    );
    assert!(candidate
        .candidate_better_move
        .as_ref()
        .is_some_and(|move_uci| candidate.solution_line.contains(move_uci)));
    assert_eq!(candidate.search_evidence, expected_search_evidence);
    assert_eq!(candidate.neural_context, expected_neural_context);
    assert!(candidate.search_evidence.is_object());
    assert!(candidate.neural_context.is_object());
}
