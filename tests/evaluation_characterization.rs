#[cfg(test)]
mod tests {
    use tactical_chess_pure_lab::evaluation::{EvalRunResult, RunIdentity};

    #[test]
    fn eval_run_result_from_smoke_baseline() {
        // Baseline terrain : smoke 2026-05-30 post neural-wiring-fix
        // heuristic vs neural | games=2 | wins=0/0 | draws=2
        let identity = RunIdentity {
            git_sha: "c0ebf62".to_string(),
            model_id: "cee8ebba7462c136729c932cb910270503547d4c6e1ef03230d9fd1faf1e721f".to_string(),
            generated_at: "2026-05-30T00:00:00Z".to_string(),
            run_label: "smoke_baseline_post_wiring_fix".to_string(),
        };

        let result = EvalRunResult::from_counts(
            identity,
            "heuristic",
            "neural",
            2, // games
            0, // wins_a
            0, // wins_b
            2, // draws
        );

        assert_eq!(result.games, 2);
        assert_eq!(result.draws, 2);
        assert_eq!(result.wins_a, 0);
        assert_eq!(result.wins_b, 0);
        assert!((result.draw_rate - 1.0).abs() < 0.001);
        // Elo must stay near 1200 (draw with equal ratings = no movement)
        assert!((result.elo_a - 1200.0).abs() < 1.0);
        assert!((result.elo_b - 1200.0).abs() < 1.0);

        // Serialization round-trip
        let tmp = "lab/reports/eval_smoke_baseline.json";
        result.save(tmp).expect("save failed");
        let loaded = EvalRunResult::load(tmp).expect("load failed");
        assert_eq!(loaded.games, result.games);
        assert_eq!(loaded.draws, result.draws);
    }
}
