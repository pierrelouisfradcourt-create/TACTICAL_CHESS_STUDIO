// Esquivability analysis: is there always a reachable safe corridor for the ship?
// Used by solvability.mjs (R23) AND by bot/solver.mjs to actually navigate — same
// function proves the pattern is dodgeable and lets a real player/bot dodge it.
//
// Prédictif (pas un instantané aveugle à la trajectoire) : un projectile ne
// bloque un x que s'il ATTEINDRA la bande verticale du vaisseau d'ici
// LOOKAHEAD_MS, à sa position FUTURE (x + vx*dt), pas sa position actuelle —
// un tir loin au-dessus de l'écran ou qui dérive latéralement ne doit pas être
// traité comme une menace immédiate (bug trouvé : l'ancienne version scannait
// TOUS les projectiles par leur x courant, sans tenir compte de vy/vx/distance,
// ce qui rendait le bot aveugle aux vraies menaces imminentes).

import { GAME_WIDTH, SHIP_WIDTH } from './state.mjs';

const LOOKAHEAD_MS = 350; // fenêtre de prédiction
const ARRIVAL_BAND_PX = 45; // tolérance verticale : "arrive vers la bande du vaisseau"
const CLEARANCE_PX = SHIP_WIDTH + 12; // marge de sécurité autour d'un projectile prédit

// Plages X bloquées (fusionnées, triées) par les projectiles ennemis dont la
// trajectoire croise la bande du vaisseau à N'IMPORTE QUEL instant de la
// fenêtre [0, LOOKAHEAD_MS] — pas seulement à l'instant exact +LOOKAHEAD_MS.
// Bug trouvé en testant le bot : un projectile DÉJÀ sur le vaisseau (menace
// immédiate) a une position projetée à +350ms qui l'a déjà dépassé (hors
// bande), donc l'ancienne version le déclarait "pas une menace" — mortel.
function computeBlockedRanges(state) {
  const shipY = state.ship.y;
  const lowY = shipY - ARRIVAL_BAND_PX;
  const highY = shipY + ARRIVAL_BAND_PX;
  const horizonS = LOOKAHEAD_MS / 1000;
  const blocked = [];

  for (const proj of state.enemyProjectiles) {
    let tEnter; // instant (s, dans [0, horizonS]) où le projectile entre dans la bande
    if (proj.vy === 0) {
      if (proj.y < lowY || proj.y > highY) continue; // ne croisera jamais la bande
      tEnter = 0;
    } else {
      const tA = (lowY - proj.y) / proj.vy;
      const tB = (highY - proj.y) / proj.vy;
      const tMin = Math.min(tA, tB);
      const tMax = Math.max(tA, tB);
      const start = Math.max(0, tMin);
      const end = Math.min(horizonS, tMax);
      if (start > end) continue; // ne traverse pas la bande dans la fenêtre observée
      tEnter = start;
    }
    const futureX = proj.x + proj.vx * tEnter;
    blocked.push([futureX - CLEARANCE_PX / 2, futureX + CLEARANCE_PX / 2]);
  }

  blocked.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const seg of blocked) {
    const last = merged[merged.length - 1];
    if (last && seg[0] <= last[1]) last[1] = Math.max(last[1], seg[1]);
    else merged.push(seg.slice());
  }
  return merged;
}

// R23 — existe-t-il, à cette frame, au moins un couloir sûr atteignable par le
// vaisseau (largeur >= SHIP_WIDTH) sur toute la largeur de l'écran ?
export function hasSafeCorridor(state) {
  const merged = computeBlockedRanges(state);
  let cursor = 0;
  for (const [lo, hi] of merged) {
    if (lo - cursor >= SHIP_WIDTH) return true;
    cursor = Math.max(cursor, hi);
  }
  return GAME_WIDTH - cursor >= SHIP_WIDTH;
}

// Le centre X du couloir sûr le plus proche de la position actuelle du vaisseau
// — null si aucun couloir n'existe. Utilisé par le bot pour se repositionner ;
// jamais consommé par la preuve de solvabilité elle-même (qui ne juge que
// hasSafeCorridor), seulement par la politique de navigation.
export function findSafeX(state) {
  const merged = computeBlockedRanges(state);
  const gaps = [];
  let cursor = 0;
  for (const [lo, hi] of merged) {
    if (lo - cursor >= SHIP_WIDTH) gaps.push([cursor, lo]);
    cursor = Math.max(cursor, hi);
  }
  if (GAME_WIDTH - cursor >= SHIP_WIDTH) gaps.push([cursor, GAME_WIDTH]);
  if (gaps.length === 0) return null;

  const shipCenter = state.ship.x + SHIP_WIDTH / 2;
  let best = null;
  let bestDist = Infinity;
  for (const [lo, hi] of gaps) {
    const center = Math.min(Math.max(shipCenter, lo + SHIP_WIDTH / 2), hi - SHIP_WIDTH / 2);
    const dist = Math.abs(center - shipCenter);
    if (dist < bestDist) {
      bestDist = dist;
      best = center;
    }
  }
  return best;
}

// La position actuelle du vaisseau (son centre) est-elle DANS une plage
// bloquée prédite ? Utilisé par le bot pour décider "dois-je esquiver
// maintenant" plutôt que "où est le couloir le plus proche".
export function isSafeAt(state, centerX) {
  const merged = computeBlockedRanges(state);
  const halfWidth = SHIP_WIDTH / 2;
  return !merged.some(([lo, hi]) => centerX + halfWidth > lo && centerX - halfWidth < hi);
}

export function validateEsquivability(state) {
  return hasSafeCorridor(state);
}
