// Boss declarations. Each boss = HP + position + fire pattern (esquivable).

export const BOSS_1 = {
  name: 'boss_1',
  hp: 15,
  x: 400, y: 80, // center-top
  width: 60, height: 40,
  speed: 40, // horizontal movement speed
  fireRate: 0.5, // shots per second
  pattern: 'wide_spread', // fires 3 shots in a spread (left, center, right)
};

// Jalon B: BOSS_2 (stronger, different pattern)
export const BOSS_2 = {
  name: 'boss_2',
  hp: 20,
  x: 400, y: 60,
  width: 70, height: 45,
  speed: 50,
  fireRate: 0.6,
  pattern: 'spiral', // fires in a spiral (harder to dodge)
};

// Jalon B: BOSS_3 (final boss)
export const BOSS_3 = {
  name: 'boss_3',
  hp: 25,
  x: 400, y: 50,
  width: 80, height: 50,
  speed: 60,
  fireRate: 0.7,
  pattern: 'dense_grid', // fires a denser grid pattern
};
