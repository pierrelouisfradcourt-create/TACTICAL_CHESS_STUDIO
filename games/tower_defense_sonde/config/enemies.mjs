// Enemy types: Grunt, Runner, Brute (no scaling from wave to wave)
export const ENEMY_TYPES = {
  GRUNT: 'grunt',
  RUNNER: 'runner',
  BRUTE: 'brute'
};

export const enemyBaseStats = (type) => {
  return {
    [ENEMY_TYPES.GRUNT]: { hp: 40, speed: 2.0, bounty: 8, armor: 0 },
    [ENEMY_TYPES.RUNNER]: { hp: 30, speed: 2.8, bounty: 6, armor: 0 },
    [ENEMY_TYPES.BRUTE]: { hp: 50, speed: 1.0, bounty: 25, armor: 4 }
  }[type];
};

export const isLeakDamage = (type) => {
  return {
    [ENEMY_TYPES.GRUNT]: 1,
    [ENEMY_TYPES.RUNNER]: 2,
    [ENEMY_TYPES.BRUTE]: 5
  }[type];
};
