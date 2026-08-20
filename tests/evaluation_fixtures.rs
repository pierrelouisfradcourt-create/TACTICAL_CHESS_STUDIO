//! Tests CI rapides utilisant uniquement des fixtures — aucun runtime.

#[cfg(test)]
mod tests {
    use tactical_chess_pure_lab::evaluation::{
        fixtures, GuardThresholds, GuardVerdict, LearningProgressReport, RegressionGuard,
    };

    #[test]
    fn fixture_baseline_has_expected_shape() {
        let b = fixtures::baseline_post_wiring_fix();
        assert_eq!(b.games, 2);
        assert_eq!(b.draws, 2);
        assert_eq!(b.wins_a, 0);
        assert_eq!(b.wins_b, 0);
        assert!((b.draw_rate - 1.0).abs() < 0.001);
        assert_eq!(b.identity.git_sha, "c0ebf62");
    }

    #[test]
    fn fixture_improved_has_lower_draw_rate() {
        let improved = fixtures::candidate_improved();
        assert_eq!(improved.games, 20);
        assert!((improved.draw_rate - 0.4).abs() < 0.001);
        assert!(improved.wins_b > improved.wins_a); // neural gagne plus
    }

    #[test]
    fn guard_detects_regression_from_fixture() {
        // Un vrai benchmark (20 parties) avec régression doit FAIL
        let guard = RegressionGuard::with_defaults();
        let baseline = fixtures::candidate_stable(); // 20 parties équilibrées
        let regressed = fixtures::candidate_draw_regression(); // 20 parties, 100% nulles
        let report = guard.evaluate(&baseline, &regressed);
        assert_eq!(report.verdict, GuardVerdict::Fail);
        assert!(report.draw_rate_delta > 0.20); // dépasse le seuil
    }

    #[test]
    fn guard_passes_improved_candidate() {
        let guard = RegressionGuard::with_defaults();
        let baseline = fixtures::candidate_stable(); // 20 parties équilibrées
        let improved = fixtures::candidate_improved(); // draw_rate réduit
        let report = guard.evaluate(&baseline, &improved);
        // draw_rate_delta = 0.4 - 0.5 = -0.1 (amélioration, sous le seuil +0.20)
        // win_rate_delta positif (neural gagne plus)
        assert_eq!(report.verdict, GuardVerdict::Pass);
    }

    #[test]
    fn guard_always_inconclusive_on_smoke_fixture() {
        let guard = RegressionGuard::with_defaults();
        let baseline = fixtures::baseline_post_wiring_fix(); // 2 parties
        let candidate = fixtures::baseline_post_wiring_fix();
        let report = guard.evaluate(&baseline, &candidate);
        // 2 < min_games=10 → toujours INCONCLUSIVE
        assert_eq!(report.verdict, GuardVerdict::Inconclusive);
    }

    #[test]
    fn generate_learning_progress_from_baseline() {
        // Baseline = smoke post-wiring-fix
        // Candidate = même baseline (on n'a pas encore de vrai candidat)
        // Résultat attendu : INCONCLUSIVE, improvement_rate=0.0
        // C'est honnête : on documente qu'on n'a pas encore de comparaison valide.
        let guard = RegressionGuard::with_defaults();
        let baseline = fixtures::baseline_post_wiring_fix();
        let candidate = fixtures::baseline_post_wiring_fix();
        let report = guard.evaluate(&baseline, &candidate);

        let progress = LearningProgressReport::from_guard_report(&report, &baseline, &candidate);

        progress
            .save("lab/reports/learning_progress.json")
            .expect("failed to write learning_progress.json");

        assert_eq!(progress.schema_version, "learning_progress_v2");
        assert_eq!(progress.guard_verdict, "INCONCLUSIVE");
        assert!(!progress.improvement_detected);
        assert_eq!(progress.improvement_rate, 0.0);
        assert_eq!(progress.baseline_git_sha, "c0ebf62");

        println!("learning_progress.json mis à jour.");
        println!("guard_verdict: {}", progress.guard_verdict);
        println!("improvement_rate: {}", progress.improvement_rate);
        println!(
            "Note: INCONCLUSIVE est honnête — pas assez de parties pour trancher."
        );
    }
}
