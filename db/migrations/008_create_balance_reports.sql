CREATE TABLE IF NOT EXISTS balance_reports (
    id SERIAL PRIMARY KEY,
    run_id INT NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
    balance_score FLOAT NOT NULL,
    quality_score FLOAT NOT NULL,
    dominant_strategy_score FLOAT NOT NULL DEFAULT 0,
    confidence FLOAT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);
