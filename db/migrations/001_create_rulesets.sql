CREATE TABLE IF NOT EXISTS rulesets (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    board_width INT NOT NULL,
    board_height INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
