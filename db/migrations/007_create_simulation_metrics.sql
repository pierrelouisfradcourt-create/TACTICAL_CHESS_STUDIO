CREATE TABLE IF NOT EXISTS simulation_metrics (
    id SERIAL PRIMARY KEY,
    run_id INT NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
    win_rate_p1 FLOAT NOT NULL,
    win_rate_p2 FLOAT NOT NULL,
    avg_turns FLOAT NOT NULL,
    first_player_advantage FLOAT NOT NULL
);
