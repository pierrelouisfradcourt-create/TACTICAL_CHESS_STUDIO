#[derive(Clone)]
pub struct ExperimentConfig {
    pub ruleset_count: u32,
    pub matches_per_ruleset: u32,
}

impl ExperimentConfig {
    pub fn default() -> Self {
        Self { ruleset_count: 10, matches_per_ruleset: 100 }
    }
}

