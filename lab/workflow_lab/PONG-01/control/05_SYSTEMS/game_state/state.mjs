// PONG — systeme `game_state`.
// Lignes de wiremap couvertes : core.game_state, core.end_condition, core.restart.
// Regles PURES : aucun rendu, aucune entree/sortie, aucun hasard non declare.
// Tout ce qui vit ici doit pouvoir tourner sans ecran.

export const FIELD = Object.freeze({
  WIDTH: 200,
  HEIGHT: 120,
});

export const PADDLE = Object.freeze({
  HEIGHT: 24,
  SPEED: 3,
  MARGIN: 6,          // distance entre la raquette et son bord
});

export const BALL = Object.freeze({
  SPEED_X: 2,
  SPEED_Y: 1,
  MAX_SPEED_Y: 3,
});

/** Score a atteindre pour gagner la partie. */
export const WINNING_SCORE = 5;

/** Etats de partie possibles — vocabulaire ferme (core.game_state). */
export const STATUS = Object.freeze({
  PLAYING: 'playing',
  OVER: 'over',
});

export const SIDE = Object.freeze({ LEFT: 0, RIGHT: 1 });

/**
 * Etat initial d'une partie. Deterministe : aucun hasard.
 * Le service initial part toujours vers la droite ; apres un point il part
 * vers celui qui vient d'encaisser (regle explicite, pas un tirage).
 * @returns {object} etat de partie neuf
 */
export function createInitialState() {
  return {
    ball: {
      x: FIELD.WIDTH / 2,
      y: FIELD.HEIGHT / 2,
      vx: BALL.SPEED_X,
      vy: BALL.SPEED_Y,
    },
    paddles: [
      { y: FIELD.HEIGHT / 2 - PADDLE.HEIGHT / 2 },
      { y: FIELD.HEIGHT / 2 - PADDLE.HEIGHT / 2 },
    ],
    score: [0, 0],
    status: STATUS.PLAYING,
    winner: null,
    ticks: 0,
    events: [],          // evenements du dernier tick (rebond, point) — lus par la presentation
  };
}

/**
 * core.restart — relance une partie dans un etat initial PROPRE.
 * Volontairement identique a createInitialState : aucun report d'etat d'une
 * partie a l'autre. C'est ce que l'oracle verifie (aucun residu).
 * @returns {object} etat de partie neuf
 */
export function restart() {
  return createInitialState();
}

/**
 * core.end_condition — la partie est-elle terminee, et par quelle issue ?
 * Definie par les REGLES, pas laissee implicite.
 * @param {object} state
 * @returns {{over: boolean, winner: number|null}}
 */
export function evaluateEnd(state) {
  const [left, right] = state.score;
  if (left >= WINNING_SCORE) return { over: true, winner: SIDE.LEFT };
  if (right >= WINNING_SCORE) return { over: true, winner: SIDE.RIGHT };
  return { over: false, winner: null };
}

/**
 * Verifie qu'un etat respecte ses invariants. Utilise par les tests et par la
 * garde d'erreur : un etat qui sort d'ici invalide est un bug, pas une entree.
 * @param {object} state
 * @returns {string[]} liste des invariants violes (vide = etat valide)
 */
export function stateViolations(state) {
  const bad = [];
  if (!state || typeof state !== 'object') return ['etat absent ou non-objet'];

  const okStatus = Object.values(STATUS).includes(state.status);
  if (!okStatus) bad.push(`status inconnu: ${String(state.status)}`);

  if (!Array.isArray(state.paddles) || state.paddles.length !== 2) {
    bad.push('paddles doit contenir exactement 2 raquettes');
  } else {
    state.paddles.forEach((p, i) => {
      if (p.y < 0 || p.y > FIELD.HEIGHT - PADDLE.HEIGHT) {
        bad.push(`raquette ${i} hors du terrain: y=${p.y}`);
      }
    });
  }

  if (!Array.isArray(state.score) || state.score.length !== 2) {
    bad.push('score doit contenir exactement 2 valeurs');
  } else if (state.score.some((s) => !Number.isInteger(s) || s < 0)) {
    bad.push(`score invalide: ${JSON.stringify(state.score)}`);
  }

  if (state.ball) {
    if (state.ball.y < 0 || state.ball.y > FIELD.HEIGHT) {
      bad.push(`balle hors du terrain en y: ${state.ball.y}`);
    }
  } else {
    bad.push('balle absente');
  }

  return bad;
}
