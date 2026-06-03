use std::collections::HashMap;

#[derive(Clone, Debug)]
pub struct EloConfig {
    pub initial_rating: f64,
    pub k_factor: f64,
}

impl Default for EloConfig {
    fn default() -> Self {
        Self {
            initial_rating: 1200.0,
            k_factor: 24.0,
        }
    }
}

#[derive(Clone, Debug)]
pub struct EloTable {
    ratings: HashMap<String, f64>,
    config: EloConfig,
}

impl EloTable {
    pub fn new(agent_names: &[String]) -> Self {
        Self::with_config(agent_names, EloConfig::default())
    }

    pub fn with_config(agent_names: &[String], config: EloConfig) -> Self {
        let mut ratings = HashMap::new();

        for name in agent_names {
            ratings.insert(name.clone(), config.initial_rating);
        }

        Self { ratings, config }
    }

    pub fn get(&self, agent: &str) -> f64 {
        *self
            .ratings
            .get(agent)
            .unwrap_or(&self.config.initial_rating)
    }

    pub fn ensure_agent(&mut self, agent: &str) {
        self.ratings
            .entry(agent.to_string())
            .or_insert(self.config.initial_rating);
    }

    pub fn update_match(&mut self, agent_a: &str, agent_b: &str, score_a: f64) {
        self.ensure_agent(agent_a);
        self.ensure_agent(agent_b);

        let ra = self.get(agent_a);
        let rb = self.get(agent_b);

        let expected_a = 1.0 / (1.0 + 10.0_f64.powf((rb - ra) / 400.0));
        let score_b = 1.0 - score_a;
        let expected_b = 1.0 - expected_a;

        let new_ra = ra + self.config.k_factor * (score_a - expected_a);
        let new_rb = rb + self.config.k_factor * (score_b - expected_b);

        self.ratings.insert(agent_a.to_string(), new_ra);
        self.ratings.insert(agent_b.to_string(), new_rb);
    }

    pub fn leaderboard(&self) -> Vec<(String, f64)> {
        let mut rows: Vec<(String, f64)> = self
            .ratings
            .iter()
            .map(|(name, rating)| (name.clone(), *rating))
            .collect();

        rows.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        rows
    }
}
