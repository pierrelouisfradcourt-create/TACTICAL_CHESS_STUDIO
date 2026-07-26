// PONG — oracle de SOLVABILITE. Prouve que le jeu se JOUE, pas seulement qu'il est correct.
// Lignes de wiremap couvertes : core.boot, core.input, core.end_condition, core.restart, play.score.
// Lance : node games/pong/07_TESTS/oracle/solvability.mjs   (exit 0 = PASS)
//
// Lecon maison : un oracle vert ne dit pas qu'un jeu est jouable. Deux jeux du
// studio (survival_arena, collect_runner) avaient tous leurs tests verts et
// etaient injouables. D'ou cet oracle : un bot doit reellement finir une partie.

import { PADDLE, SIDE, STATUS, WINNING_SCORE } from '../../05_SYSTEMS/game_state/state.mjs';
import { ACTION } from '../../05_SYSTEMS/input/input.mjs';
import { boot, tick } from '../../05_SYSTEMS/game_loop/loop.mjs';
import { restart } from '../../05_SYSTEMS/game_state/state.mjs';

const TICK_LIMIT = 20000;

/** Bot qui suit la balle. Deterministe. */
function follower(state, side) {
  const center = state.paddles[side].y + PADDLE.HEIGHT / 2;
  if (state.ball.y < center - 1) return ACTION.UP;
  if (state.ball.y > center + 1) return ACTION.DOWN;
  return ACTION.NONE;
}

/** Bot immobile — sert d'adversaire battable. */
function idle() { return ACTION.NONE; }

function playGame(botLeft, botRight) {
  let s = boot();
  let ticks = 0;
  while (s.status === STATUS.PLAYING && ticks < TICK_LIMIT) {
    s = tick(s, [botLeft(s, SIDE.LEFT), botRight(s, SIDE.RIGHT)]);
    ticks++;
  }
  return { state: s, ticks };
}

const failures = [];
function check(label, ok, detail) {
  if (ok) console.log(`  PASS  ${label}${detail ? ' — ' + detail : ''}`);
  else { console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`); failures.push(label); }
}

console.log('PONG — oracle de solvabilite');

// 1. Un bot competent bat un adversaire passif, et la partie SE TERMINE.
const left = playGame(follower, idle);
check('volet 1 — le bot gauche gagne une partie complete',
  left.state.status === STATUS.OVER && left.state.winner === SIDE.LEFT,
  `${left.ticks} ticks, score ${left.state.score.join('-')}`);

// 2. Symetrie : le jeu n'est pas gagnable que d'un cote.
const right = playGame(idle, follower);
check('volet 2 — le bot droit gagne aussi (jeu symetrique)',
  right.state.status === STATUS.OVER && right.state.winner === SIDE.RIGHT,
  `${right.ticks} ticks, score ${right.state.score.join('-')}`);

// 3. L'issue est toujours DEFINIE — jamais un match qui traine sans fin declaree.
check('volet 3 — l issue est definie (gagne, jamais indefini)',
  left.state.winner !== null && right.state.winner !== null,
  `winners: ${left.state.winner} / ${right.state.winner}`);

// 4. Le vainqueur atteint bien le score requis.
check('volet 4 — le vainqueur atteint le score de victoire',
  Math.max(...left.state.score) >= WINNING_SCORE,
  `score final ${left.state.score.join('-')} (requis ${WINNING_SCORE})`);

// 5. On peut REJOUER : etat neuf, et la nouvelle partie se termine aussi.
const fresh = restart();
const replay = (() => {
  let s = fresh, t = 0;
  while (s.status === STATUS.PLAYING && t < TICK_LIMIT) {
    s = tick(s, [follower(s, SIDE.LEFT), idle()]);
    t++;
  }
  return { state: s, ticks: t };
})();
check('volet 5 — apres relance, une nouvelle partie complete se joue',
  fresh.score[0] === 0 && fresh.score[1] === 0 && replay.state.status === STATUS.OVER,
  `relance a ${fresh.score.join('-')}, nouvelle partie finie en ${replay.ticks} ticks`);

console.log(failures.length === 0
  ? '\nSOLVABILITE : PASS (5/5)'
  : `\nSOLVABILITE : FAIL (${failures.length} volet(s)) -> ${failures.join(', ')}`);
process.exit(failures.length === 0 ? 0 : 1);
