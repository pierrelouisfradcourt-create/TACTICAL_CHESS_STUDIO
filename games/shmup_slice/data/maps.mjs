// Map declarations. Each map = waves + patterns + background. Pure data, no generation.

export const MAP_1 = {
  name: 'map_1',
  waves: [
    { pattern: 'invaders_descent', waveIndex: 0, triggerTime: 0 },
    { pattern: 'invaders_descent', waveIndex: 1, triggerTime: 5000 },
    { pattern: 'invaders_descent', waveIndex: 2, triggerTime: 10000 },
  ],
  backgroundColor: '#1a1a2e',
  bossStartTime: 15000, // ms after wave 0 starts
};

// Jalon B: MAP_2 (SINE_WEAVE pattern, slightly harder)
export const MAP_2 = {
  name: 'map_2',
  waves: [
    { pattern: 'sine_weave', waveIndex: 0, triggerTime: 0 },
    { pattern: 'invaders_descent', waveIndex: 0, triggerTime: 6000 },
    { pattern: 'invaders_descent', waveIndex: 1, triggerTime: 12000 },
  ],
  backgroundColor: '#16213e',
  bossStartTime: 18000,
};

// Jalon B: MAP_3 (combined patterns, challenge)
export const MAP_3 = {
  name: 'map_3',
  waves: [
    { pattern: 'sine_weave', waveIndex: 0, triggerTime: 0 },
    { pattern: 'invaders_descent', waveIndex: 1, triggerTime: 7000 },
    { pattern: 'sine_weave', waveIndex: 0, triggerTime: 14000 },
  ],
  backgroundColor: '#0f3460',
  bossStartTime: 20000,
};
