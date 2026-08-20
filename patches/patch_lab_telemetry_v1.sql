CREATE TABLE IF NOT EXISTS match_telemetry (
    id SERIAL PRIMARY KEY,
    ruleset_id INT,
    seed BIGINT,
    turn_count INT,
    decisive_turn INT,
    victory_type TEXT,
    promotions INT DEFAULT 0,
    damage_direct DOUBLE PRECISION DEFAULT 0,
    damage_brawl DOUBLE PRECISION DEFAULT 0,
    damage_traversal DOUBLE PRECISION DEFAULT 0,
    damage_status DOUBLE PRECISION DEFAULT 0,
    pressure_peak DOUBLE PRECISION DEFAULT 0,
    mana_peak DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS experiment_summary (
    id SERIAL PRIMARY KEY,
    experiment_name TEXT,
    ruleset_id INT,
    matches INT DEFAULT 0,
    avg_turns DOUBLE PRECISION DEFAULT 0,
    pressure_winrate DOUBLE PRECISION DEFAULT 0,
    promotion_rate DOUBLE PRECISION DEFAULT 0,
    first_player_winrate DOUBLE PRECISION DEFAULT 0,
    quality_score DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ruleset_flags (
    id SERIAL PRIMARY KEY,
    ruleset_id INT,
    flag_type TEXT,
    flag_value DOUBLE PRECISION DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE rulesets ADD COLUMN IF NOT EXISTS ruleset_hash TEXT;
