CREATE TABLE IF NOT EXISTS unit_templates (
    id SERIAL PRIMARY KEY,
    ruleset_id INT NOT NULL REFERENCES rulesets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    hp INT NOT NULL,
    attack INT NOT NULL,
    defense INT NOT NULL,
    armor INT NOT NULL,
    range INT NOT NULL,
    powershot_cooldown INT NOT NULL DEFAULT 0
);
