CREATE TABLE IF NOT EXISTS simulation_runs (
    id SERIAL PRIMARY KEY,
    ruleset_id INT NOT NULL REFERENCES rulesets(id) ON DELETE CASCADE,
    match_count INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
