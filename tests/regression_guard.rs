#[cfg(test)]
mod tests {
    use tactical_chess_pure_lab::evaluation::{
        EvalRunResult, GuardThresholds, GuardVerdict, RegressionGuard, RunIdentity,
    };

    fn make_result(label: &str, games: u32, wins_a: u32, wins_b: u32, draws: u32) -> EvalRunResult {
        let identity = RunIdentity {
            git_sha: "test".to_string(),
            model_id: "test_model".to_string(),
            generated_at: "2026-05-30T00:00:00Z".to_string(),
            run_label: label.to_string(),
        };
        EvalRunResult::from_counts(identity, "candidate", "baseline_agent", games, wins_a, wins_b, draws)
    }

    #[test]
    fn guard_inconclusive_when_too_few_games() {
        let guard = RegressionGuard::with_defaults();
        let baseline = make_result("baseline", 20, 5, 5, 10);
        let candidate = make_result("candidate", 2, 0, 0, 2); // < min_games=10
        let report = guard.evaluate(&baseline, &candidate);
        assert_eq!(report.verdict, GuardVerdict::Inconclusive);
    }

    #[test]
    fn guard_pass_when_similar_results() {
        let guard = RegressionGuard::with_defaults();
        let baseline = make_result("baseline", 20, 5, 5, 10);
        let candidate = make_result("candidate", 20, 5, 5, 10); // identique
        let report = guard.evaluate(&baseline, &candidate);
        assert_eq!(report.verdict, GuardVerdict::Pass);
        assert!(report.checks.iter().all(|c| c.passed));
    }

    #[test]
    fn guard_fail_on_draw_rate_regression() {
        let guard = RegressionGuard::with_defaults();
        let baseline = make_result("baseline", 20, 8, 4, 8);   // draw_rate=0.4
        let candidate = make_result("candidate", 20, 0, 0, 20); // draw_rate=1.0 → +0.6
        let report = guard.evaluate(&baseline, &candidate);
        assert_eq!(report.verdict, GuardVerdict::Fail);
        let draw_check = report.checks.iter().find(|c| c.name == "draw_rate").unwrap();
        assert!(!draw_check.passed);
    }

    #[test]
    fn guard_fail_on_win_rate_regression() {
        let thresholds = GuardThresholds {
            min_games: 10,
            max_draw_rate_increase: 0.20,
            min_win_rate_delta: -0.15,
            min_elo_delta: -30.0,
        };
        let guard = RegressionGuard::new(thresholds);
        let baseline = make_result("baseline", 20, 10, 5, 5);  // win_rate_a=0.5
        let candidate = make_result("candidate", 20, 2, 15, 3); // win_rate_a=0.1 → -0.4
        let report = guard.evaluate(&baseline, &candidate);
        assert_eq!(report.verdict, GuardVerdict::Fail);
    }

    #[test]
    fn guard_report_serializes_to_json() {
        let guard = RegressionGuard::with_defaults();
        let baseline = make_result("baseline", 20, 5, 5, 10);
        let candidate = make_result("candidate", 20, 6, 4, 10);
        let report = guard.evaluate(&baseline, &candidate);
        let path = "lab/reports/guard_test_output.json";
        RegressionGuard::save_report(&report, path).expect("save failed");
        assert!(std::path::Path::new(path).exists());
        println!("Verdict: {}", report.verdict);
        println!("Reason: {}", report.reason);
    }

    #[test]
    fn guard_smoke_baseline_is_inconclusive() {
        // Le baseline smoke actuel (2 parties) doit toujours rendre INCONCLUSIVE
        // car games=2 < min_games=10. C'est le comportement attendu et voulu :
        // le smoke n'est pas un vrai eval, il vérifie juste que ça tourne.
        let guard = RegressionGuard::with_defaults();
        let baseline = make_result("smoke_baseline", 2, 0, 0, 2);
        let candidate = make_result("smoke_candidate", 2, 0, 0, 2);
        let report = guard.evaluate(&baseline, &candidate);
        assert_eq!(report.verdict, GuardVerdict::Inconclusive);
    }
}
