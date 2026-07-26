// PONG — code de DESSIN partage (ADAPTATEUR, jamais importe par la logique).
// drawState() decrit l'image d'un etat via une interface de surface minimale
// {clear, fillRect} — implementee par un <canvas> (navigateur) OU par la Surface
// logicielle (capture headless). Un seul code de rendu, deux backends.
import {
  FIELD_W, FIELD_H, PADDLE_W, PADDLE_H, BALL_R, P1_X, P2_X,
} from '../../../05_SYSTEMS/game_state/state.mjs';

export const SCALE = 4;
export const VIEW_W = FIELD_W * SCALE;   // 800
export const VIEW_H = FIELD_H * SCALE;   // 480

const BG = [12, 14, 20];
const FG = [235, 238, 245];
const MID = [40, 46, 60];
const ACCENT = [90, 200, 160];

// Dessine l'etat courant. `surface` expose clear(r,g,b) et fillRect(x,y,w,h,r,g,b).
export function drawState(state, surface) {
  surface.clear(...BG);

  // ligne mediane pointillee
  for (let y = 0; y < VIEW_H; y += SCALE * 6) {
    surface.fillRect(VIEW_W / 2 - SCALE / 2, y, SCALE, SCALE * 3, ...MID);
  }

  // raquettes (gauche = P1_X est le PLAN de collision -> face droite de la raquette)
  surface.fillRect((P1_X - PADDLE_W) * SCALE, state.p1.y * SCALE, PADDLE_W * SCALE, PADDLE_H * SCALE, ...FG);
  surface.fillRect(P2_X * SCALE, state.p2.y * SCALE, PADDLE_W * SCALE, PADDLE_H * SCALE, ...FG);

  // balle
  surface.fillRect((state.ball.x - BALL_R) * SCALE, (state.ball.y - BALL_R) * SCALE,
    BALL_R * 2 * SCALE, BALL_R * 2 * SCALE, ...FG);

  // score : pips en haut (accent), a gauche pour p1, a droite pour p2
  for (let i = 0; i < state.score.p1; i += 1) {
    surface.fillRect(VIEW_W / 2 - SCALE * 12 - i * SCALE * 6, SCALE * 3, SCALE * 4, SCALE * 4, ...ACCENT);
  }
  for (let i = 0; i < state.score.p2; i += 1) {
    surface.fillRect(VIEW_W / 2 + SCALE * 8 + i * SCALE * 6, SCALE * 3, SCALE * 4, SCALE * 4, ...ACCENT);
  }
}
