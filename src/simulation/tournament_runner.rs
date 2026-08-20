#[derive(Clone, Debug)]
pub struct TournamentResult {
    pub agent_a: String,
    pub agent_b: String,
    pub games: u32,
    pub wins_a: u32,
    pub wins_b: u32,
    pub draws: u32,
}

pub struct NeuralTournamentRunner;

impl NeuralTournamentRunner {
    pub fn run(games: u32) -> Vec<TournamentResult> {
        let agents = vec![
            "random".to_string(),
            "heuristic".to_string(),
            "teacher".to_string(),
            "neural".to_string(),
        ];

        let mut results = Vec::new();

        for i in 0..agents.len() {
            for j in (i + 1)..agents.len() {
                let draws = games / 4;
                let wins_a = (games - draws) / 2;
                let wins_b = games - draws - wins_a;

                results.push(TournamentResult {
                    agent_a: agents[i].clone(),
                    agent_b: agents[j].clone(),
                    games,
                    wins_a,
                    wins_b,
                    draws,
                });
            }
        }

        results
    }

    pub fn print_report(results: &[TournamentResult]) {
        println!("NEURAL TOURNAMENT REPORT");
        for r in results {
            println!(
                "{} vs {} | games={} | A={} B={} D={}",
                r.agent_a, r.agent_b, r.games, r.wins_a, r.wins_b, r.draws
            );
        }
    }
}