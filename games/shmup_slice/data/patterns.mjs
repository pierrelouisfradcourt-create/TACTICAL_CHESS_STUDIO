// Enemy patterns as declarative data structures. Each pattern defines enemy positions + movement + fire cadence.
// Jalon A: INVADERS_DESCENT (simple descent with periodic fire). Jalon B adds SINE_WEAVE.

export const INVADERS_DESCENT = {
  name: 'invaders_descent',
  waves: [
    // Wave 1: 2 rows × 3 enemies
    {
      spawnX: 100, spawnY: 50, rows: 2, cols: 3, spacingX: 80, spacingY: 60,
      moveSpeed: 60, fireRate: 0.8, fireOffsetMs: 0,
    },
    // Wave 2: 3 rows × 2 enemies
    {
      spawnX: 150, spawnY: 80, rows: 3, cols: 2, spacingX: 100, spacingY: 70,
      moveSpeed: 80, fireRate: 0.9, fireOffsetMs: 500,
    },
    // Wave 3: 1 row × 4 enemies (denser)
    {
      spawnX: 80, spawnY: 40, rows: 1, cols: 4, spacingX: 90, spacingY: 0,
      moveSpeed: 100, fireRate: 1.0, fireOffsetMs: 200,
    },
  ],
  movement: { type: 'descent', verticalSpeed: 20 }, // descend slowly while moving left/right
};

// Jalon B: SINE_WEAVE pattern
export const SINE_WEAVE = {
  name: 'sine_weave',
  waves: [
    {
      spawnX: 120, spawnY: 30, rows: 2, cols: 3, spacingX: 80, spacingY: 50,
      moveSpeed: 70, fireRate: 0.7, fireOffsetMs: 0,
    },
  ],
  movement: { type: 'sine', verticalSpeed: 15, amplitude: 40 }, // sine wave side-to-side
};
