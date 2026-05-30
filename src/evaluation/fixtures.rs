//! Fixed test fixtures for CI — no runtime, no chess engine, deterministic.

use crate::evaluation::{EvalRunResult, RunIdentity};

/// Baseline fixture : smoke post-wiring-fix (2026-05-30, commit c0ebf62).
/// Représente l'état zéro — neural correctement câblé, 100% nulles.
pub fn baseline_post_wiring_fix() -> EvalRunResult {
    let identity = RunIdentity {
        git_sha: "c0ebf62".to_string(),
        model_id: "cee8ebba7462c136729c932cb910270503547d4c6e1ef03230d9fd1faf1e721f".to_string(),
        generated_at: "2026-05-30T00:00:00Z".to_string(),
        run_label: "smoke_baseline_post_wiring_fix".to_string(),
    };
    EvalRunResult::from_counts(identity, "heuristic", "neural", 2, 0, 0, 2)
}

/// Fixture : candidat avec régression draw rate (+60% de nulles).
pub fn candidate_draw_regression() -> EvalRunResult {
    let identity = RunIdentity {
        git_sha: "test_regression".to_string(),
        model_id: "test_model_bad".to_string(),
        generated_at: "2026-05-30T00:00:00Z".to_string(),
        run_label: "candidate_draw_regression".to_string(),
    };
    // 20 parties, 0 victoires, 20 nulles = draw_rate 1.0
    EvalRunResult::from_counts(identity, "heuristic", "neural", 20, 0, 0, 20)
}

/// Fixture : candidat amélioré — draw rate réduit, quelques victoires.
pub fn candidate_improved() -> EvalRunResult {
    let identity = RunIdentity {
        git_sha: "test_improved".to_string(),
        model_id: "test_model_good".to_string(),
        generated_at: "2026-05-30T00:00:00Z".to_string(),
        run_label: "candidate_improved".to_string(),
    };
    // 20 parties : 8 victoires neural, 4 heuristic, 8 nulles → draw_rate=0.4
    EvalRunResult::from_counts(identity, "heuristic", "neural", 20, 4, 8, 8)
}

/// Fixture : résultat équilibré stable (référence neutre).
pub fn candidate_stable() -> EvalRunResult {
    let identity = RunIdentity {
        git_sha: "test_stable".to_string(),
        model_id: "test_model_stable".to_string(),
        generated_at: "2026-05-30T00:00:00Z".to_string(),
        run_label: "candidate_stable".to_string(),
    };
    // 20 parties équilibrées
    EvalRunResult::from_counts(identity, "heuristic", "neural", 20, 5, 5, 10)
}
