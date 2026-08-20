CREATE TABLE IF NOT EXISTS simulation_matches (
    id SERIAL PRIMARY KEY,
    run_id INT NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
    winner INT NOT NULL,
    turn_count INT NOT NULL,
    action_count INT NOT NULL
);
