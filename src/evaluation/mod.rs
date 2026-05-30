//! Evaluation module — first-class result schema and baseline snapshot.
//!
//! Wraps tournament output into a typed, identity-tagged result.
//! Does NOT run games itself — delegates to neural_tournament_runner.

use serde::{Deserialize, Serialize};

/// Identity of an evaluation run — links result to exact code + model state.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunIdentity {
    /// Git SHA at time of run (from GIT_SHA env var or "unknown")
    pub git_sha: String,
    /// Model file path + sha256 used during this run
    pub model_id: String,
    /// ISO8601 timestamp
    pub generated_at: String,
    /// Free-form label (e.g. "smoke", "calibration", "main_eval")
    pub run_label: String,
}

impl RunIdentity {
    pub fn capture(run_label: &str) -> Self {
        let git_sha = std::env::var("GIT_SHA").unwrap_or_else(|_| "unknown".to_string());
        let model_id = std::env::var("MODEL_ID").unwrap_or_else(|_| "unknown".to_string());
        let generated_at = chrono::Utc::now().to_rfc3339();
        Self {
            git_sha,
            model_id,
            generated_at,
            run_label: run_label.to_string(),
        }
    }
}

/// Typed result of one evaluation run.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvalRunResult {
    pub identity: RunIdentity,
    pub agent_a: String,
    pub agent_b: String,
    pub games: u32,
    pub wins_a: u32,
    pub wins_b: u32,
    pub draws: u32,
    pub draw_rate: f64,
    pub win_rate_a: f64,
    pub elo_a: f64,
    pub elo_b: f64,
}

impl EvalRunResult {
    pub fn from_counts(
        identity: RunIdentity,
        agent_a: &str,
        agent_b: &str,
        games: u32,
        wins_a: u32,
        wins_b: u32,
        draws: u32,
    ) -> Self {
        let draw_rate = if games > 0 {
            draws as f64 / games as f64
        } else {
            0.0
        };
        let win_rate_a = if games > 0 {
            wins_a as f64 / games as f64
        } else {
            0.0
        };

        // Inline Elo delta — mirrors tournament::elo::EloTable (k=24, base=1200).
        // Cannot reference that module here because tournament::export depends on
        // simulation, which is binary-only and not exposed through lib.rs.
        let initial = 1200.0_f64;
        let k = 24.0_f64;
        let score_a = wins_a as f64 + draws as f64 * 0.5;
        let score_b = wins_b as f64 + draws as f64 * 0.5;
        let total = score_a + score_b;
        let (elo_a, elo_b) = if total > 0.0 {
            let expected_a = 1.0 / (1.0 + 10.0_f64.powf((initial - initial) / 400.0));
            let norm = score_a / total;
            (
                initial + k * (norm - expected_a),
                initial + k * ((1.0 - norm) - (1.0 - expected_a)),
            )
        } else {
            (initial, initial)
        };

        Self {
            identity,
            agent_a: agent_a.to_string(),
            agent_b: agent_b.to_string(),
            games,
            wins_a,
            wins_b,
            draws,
            draw_rate,
            win_rate_a,
            elo_a,
            elo_b,
        }
    }

    /// Persist result as JSON to the given path.
    pub fn save(&self, path: &str) -> Result<(), String> {
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| format!("serialization error: {e}"))?;
        if let Some(parent) = std::path::Path::new(path).parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("mkdir error: {e}"))?;
        }
        std::fs::write(path, json).map_err(|e| format!("write error: {e}"))?;
        Ok(())
    }

    /// Load a previously saved result (for baseline comparison).
    pub fn load(path: &str) -> Result<Self, String> {
        let content = std::fs::read_to_string(path)
            .map_err(|e| format!("read error: {e}"))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("parse error: {e}"))
    }
}
