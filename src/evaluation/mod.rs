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

/// Verdict mécanique du regression guard.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum GuardVerdict {
    /// Le candidat ne régresse pas sur les métriques clés.
    Pass,
    /// Le candidat régresse de façon significative.
    Fail,
    /// Pas assez de parties pour trancher (n < min_games).
    Inconclusive,
}

impl std::fmt::Display for GuardVerdict {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GuardVerdict::Pass => write!(f, "PASS"),
            GuardVerdict::Fail => write!(f, "FAIL"),
            GuardVerdict::Inconclusive => write!(f, "INCONCLUSIVE"),
        }
    }
}

/// Rapport complet du guard — verdict + détail des checks.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuardReport {
    pub verdict: GuardVerdict,
    pub baseline_games: u32,
    pub candidate_games: u32,
    pub draw_rate_baseline: f64,
    pub draw_rate_candidate: f64,
    pub draw_rate_delta: f64,
    pub win_rate_delta: f64,
    pub elo_delta: f64,
    pub checks: Vec<GuardCheck>,
    pub reason: String,
}

/// Détail d'un check individuel.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GuardCheck {
    pub name: String,
    pub passed: bool,
    pub detail: String,
}

/// Seuils configurables du guard.
#[derive(Debug, Clone)]
pub struct GuardThresholds {
    /// Nombre minimum de parties pour rendre un verdict non-INCONCLUSIVE.
    pub min_games: u32,
    /// Delta de draw_rate au-delà duquel c'est un FAIL (ex: +0.20 = +20% de nulles).
    pub max_draw_rate_increase: f64,
    /// Delta de win_rate en dessous duquel c'est un FAIL (ex: -0.15 = -15% de victoires).
    pub min_win_rate_delta: f64,
    /// Delta d'Elo en dessous duquel c'est un FAIL (ex: -30 points).
    pub min_elo_delta: f64,
}

impl Default for GuardThresholds {
    fn default() -> Self {
        Self {
            min_games: 10,
            max_draw_rate_increase: 0.20,
            min_win_rate_delta: -0.15,
            min_elo_delta: -30.0,
        }
    }
}

/// Le regression guard — compare baseline et candidat, rend un verdict.
pub struct RegressionGuard {
    pub thresholds: GuardThresholds,
}

impl RegressionGuard {
    pub fn new(thresholds: GuardThresholds) -> Self {
        Self { thresholds }
    }

    pub fn with_defaults() -> Self {
        Self::new(GuardThresholds::default())
    }

    pub fn evaluate(&self, baseline: &EvalRunResult, candidate: &EvalRunResult) -> GuardReport {
        let t = &self.thresholds;

        if candidate.games < t.min_games {
            return GuardReport {
                verdict: GuardVerdict::Inconclusive,
                baseline_games: baseline.games,
                candidate_games: candidate.games,
                draw_rate_baseline: baseline.draw_rate,
                draw_rate_candidate: candidate.draw_rate,
                draw_rate_delta: candidate.draw_rate - baseline.draw_rate,
                win_rate_delta: candidate.win_rate_a - baseline.win_rate_a,
                elo_delta: candidate.elo_a - baseline.elo_a,
                checks: vec![GuardCheck {
                    name: "min_games".to_string(),
                    passed: false,
                    detail: format!(
                        "candidate.games={} < min_games={}",
                        candidate.games, t.min_games
                    ),
                }],
                reason: format!(
                    "INCONCLUSIVE: only {} games, need at least {}",
                    candidate.games, t.min_games
                ),
            };
        }

        let draw_rate_delta = candidate.draw_rate - baseline.draw_rate;
        let win_rate_delta = candidate.win_rate_a - baseline.win_rate_a;
        let elo_delta = candidate.elo_a - baseline.elo_a;

        let mut checks = Vec::new();
        let mut failed = false;

        let draw_ok = draw_rate_delta <= t.max_draw_rate_increase;
        checks.push(GuardCheck {
            name: "draw_rate".to_string(),
            passed: draw_ok,
            detail: format!(
                "delta={:.3} (limit=+{:.3}): baseline={:.3} candidate={:.3}",
                draw_rate_delta, t.max_draw_rate_increase,
                baseline.draw_rate, candidate.draw_rate
            ),
        });
        if !draw_ok {
            failed = true;
        }

        let win_ok = win_rate_delta >= t.min_win_rate_delta;
        checks.push(GuardCheck {
            name: "win_rate".to_string(),
            passed: win_ok,
            detail: format!(
                "delta={:.3} (limit={:.3}): baseline={:.3} candidate={:.3}",
                win_rate_delta, t.min_win_rate_delta,
                baseline.win_rate_a, candidate.win_rate_a
            ),
        });
        if !win_ok {
            failed = true;
        }

        let elo_ok = elo_delta >= t.min_elo_delta;
        checks.push(GuardCheck {
            name: "elo_delta".to_string(),
            passed: elo_ok,
            detail: format!(
                "delta={:.1} (limit={:.1}): baseline={:.1} candidate={:.1}",
                elo_delta, t.min_elo_delta,
                baseline.elo_a, candidate.elo_a
            ),
        });
        if !elo_ok {
            failed = true;
        }

        let verdict = if failed { GuardVerdict::Fail } else { GuardVerdict::Pass };
        let failed_names: Vec<&str> = checks.iter()
            .filter(|c| !c.passed)
            .map(|c| c.name.as_str())
            .collect();
        let reason = if failed {
            format!("FAIL: checks failed: {}", failed_names.join(", "))
        } else {
            "PASS: all checks within thresholds".to_string()
        };

        GuardReport {
            verdict,
            baseline_games: baseline.games,
            candidate_games: candidate.games,
            draw_rate_baseline: baseline.draw_rate,
            draw_rate_candidate: candidate.draw_rate,
            draw_rate_delta,
            win_rate_delta,
            elo_delta,
            checks,
            reason,
        }
    }

    /// Persiste le rapport en JSON.
    pub fn save_report(report: &GuardReport, path: &str) -> Result<(), String> {
        let json = serde_json::to_string_pretty(report)
            .map_err(|e| format!("serialization error: {e}"))?;
        if let Some(parent) = std::path::Path::new(path).parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("mkdir error: {e}"))?;
        }
        std::fs::write(path, json).map_err(|e| format!("write error: {e}"))?;
        Ok(())
    }
}
