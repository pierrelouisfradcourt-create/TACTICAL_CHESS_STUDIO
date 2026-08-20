use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

pub const RNG_TUTORIAL_SOURCE: &str = "rng_tutorial_source";
pub const ROCKY_ERROR_SOURCE: &str = "rocky_error_source";
pub const CANDIDATE_REPLAY_STATUS: &str = "candidate";

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
pub struct PuzzleCaseLike {
    pub case_id: String,
    pub fen: String,
    pub side_to_move: u32,
    pub theme: String,
    pub best_moves: Vec<String>,
    pub seed: u64,
    pub difficulty: u32,
    pub validation: Value,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
pub struct RockyErrorSourceInput {
    pub source_type: String,
    pub source_game_id: String,
    pub source_ply: u32,
    pub fen: String,
    pub side_to_move: String,
    pub observed_bad_move: String,
    pub candidate_better_move: String,
    pub legal_action_evidence: Value,
    pub search_evidence: Value,
    pub neural_context: Value,
    pub source_report: Value,
    pub error_type: String,
    pub theme_hint: String,
    pub difficulty_hint: String,
    pub provenance: Value,
    pub humangate_required: bool,
    pub dataset_admissible: bool,
    pub replay_status: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct SharedPuzzleCandidate {
    pub puzzle_id: String,
    pub source_type: String,
    pub source_game_id: Option<String>,
    pub source_ply: Option<u32>,
    pub fen: String,
    pub side_to_move: Value,
    pub observed_bad_move: Option<String>,
    pub candidate_better_move: Option<String>,
    pub solution_line: Vec<String>,
    pub theme: String,
    pub difficulty_level: String,
    pub error_type: Option<String>,
    pub vocabulary_tags: Vec<String>,
    pub lesson_tags: Vec<String>,
    pub source_report: Value,
    pub search_evidence: Value,
    pub neural_context: Value,
    pub explanation_md: String,
    pub replay_status: String,
    pub solved_count: u32,
    pub failed_count: u32,
    pub regressed_count: u32,
    pub last_seen_head: String,
    pub humangate_required: bool,
    pub dataset_admissible: bool,
}

impl SharedPuzzleCandidate {
    pub fn from_rng_tutorial_puzzle_case(case: PuzzleCaseLike) -> Self {
        let normalized_theme = normalize_theme(&case.theme);
        Self {
            puzzle_id: case.case_id.clone(),
            source_type: RNG_TUTORIAL_SOURCE.to_string(),
            source_game_id: None,
            source_ply: None,
            fen: case.fen,
            side_to_move: json!(case.side_to_move),
            observed_bad_move: None,
            candidate_better_move: case.best_moves.first().cloned(),
            solution_line: case.best_moves,
            theme: normalized_theme.clone(),
            difficulty_level: case.difficulty.to_string(),
            error_type: None,
            vocabulary_tags: vocabulary_tags_for_theme(&normalized_theme),
            lesson_tags: vec![
                "tutorial_rng_fixture".to_string(),
                "candidate_shape_only".to_string(),
            ],
            source_report: json!({
                "source_type": RNG_TUTORIAL_SOURCE,
                "source_case_id": case.case_id,
                "rng_metadata": {
                    "seed": case.seed,
                    "theme": normalized_theme,
                },
            }),
            search_evidence: json!({
                "validation_evidence": case.validation,
                "authority_note": "Fixture evidence only; search move is not automatically dataset truth.",
            }),
            neural_context: json!({}),
            explanation_md: "Placeholder explanation for fixture shape only. No correctness claim is made beyond the static schema fixture intent.".to_string(),
            replay_status: CANDIDATE_REPLAY_STATUS.to_string(),
            solved_count: 0,
            failed_count: 0,
            regressed_count: 0,
            last_seen_head: String::new(),
            humangate_required: true,
            dataset_admissible: false,
        }
    }

    pub fn from_rocky_error_source_input(input: RockyErrorSourceInput) -> Self {
        let candidate_better_move = input.candidate_better_move;
        Self {
            puzzle_id: format!("rocky_error:{}:{}", input.source_game_id, input.source_ply),
            source_type: ROCKY_ERROR_SOURCE.to_string(),
            source_game_id: Some(input.source_game_id),
            source_ply: Some(input.source_ply),
            fen: input.fen,
            side_to_move: json!(input.side_to_move),
            observed_bad_move: Some(input.observed_bad_move),
            candidate_better_move: Some(candidate_better_move.clone()),
            solution_line: vec![candidate_better_move],
            theme: input.theme_hint,
            difficulty_level: input.difficulty_hint,
            error_type: Some(input.error_type),
            vocabulary_tags: Vec::new(),
            lesson_tags: vec![
                "rocky_error_source_fixture".to_string(),
                "candidate_shape_only".to_string(),
            ],
            source_report: json!({
                "source_report": input.source_report,
                "provenance": input.provenance,
                "legal_action_evidence": input.legal_action_evidence,
            }),
            search_evidence: input.search_evidence,
            neural_context: input.neural_context,
            explanation_md: "Placeholder explanation for rocky_error_source fixture shape only. No correctness, dataset, training, benchmark, or Rocky improvement claim is made.".to_string(),
            replay_status: CANDIDATE_REPLAY_STATUS.to_string(),
            solved_count: 0,
            failed_count: 0,
            regressed_count: 0,
            last_seen_head: String::new(),
            humangate_required: true,
            dataset_admissible: false,
        }
    }
}

fn normalize_theme(theme: &str) -> String {
    match theme {
        "mate_in_1" | "mate1" | "mate" => "mate1".to_string(),
        other => other.to_string(),
    }
}

fn vocabulary_tags_for_theme(theme: &str) -> Vec<String> {
    match theme {
        "mate1" => vec!["mate_in_1".to_string(), "queen_mate".to_string()],
        "fork" => vec!["fork".to_string()],
        _ => Vec::new(),
    }
}
