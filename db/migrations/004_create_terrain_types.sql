CREATE TABLE IF NOT EXISTS terrain_types (
    id SERIAL PRIMARY KEY,
    ruleset_id INT NOT NULL REFERENCES rulesets(id) ON DELETE CASCADE,
    terrain TEXT NOT NULL,
    x INT NOT NULL,
    y INT NOT NULL
);
