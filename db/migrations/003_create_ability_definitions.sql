CREATE TABLE IF NOT EXISTS ability_definitions (
    id SERIAL PRIMARY KEY,
    ruleset_id INT NOT NULL REFERENCES rulesets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cooldown INT NOT NULL DEFAULT 0
);
