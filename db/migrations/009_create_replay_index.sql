CREATE TABLE IF NOT EXISTS replay_index (
    id SERIAL PRIMARY KEY,
    run_id INT NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
    match_id INT NOT NULL REFERENCES simulation_matches(id) ON DELETE CASCADE,
    replay_path TEXT NOT NULL
);
