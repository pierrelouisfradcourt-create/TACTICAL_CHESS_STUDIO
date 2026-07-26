// bot.mjs — bot déterministe partagé (solvabilité + méta-solvabilité). Joue une
// bataille via l'économie d'action (commitMove/commitAttack) : phase 1 concentre le
// feu sur les ennemis MOBILES, phase 2 encercle l'ennemi faible immobile (staging sûr
// + pounce simultané pour ne jamais être un encercleur isolé). PUR (pas de DOM/IO).
const MAX_ROUNDS = 120;

function orth(x, y) {
  return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
}

// Meilleure case atteignable EN UN déplacement, minimisant la distance à (tx,ty).
// `avoid` interdit une zone (ex. cases adjacentes à la cible pendant le staging).
export function bestCell(b, beast, tx, ty, avoid) {
  let best = { x: beast.x, y: beast.y, d: Math.abs(beast.x - tx) + Math.abs(beast.y - ty) };
  for (let y = 0; y < b.height; y++) {
    for (let x = 0; x < b.width; x++) {
      const md = Math.abs(beast.x - x) + Math.abs(beast.y - y);
      const free = md === 0 || (!b.cellOccupied(x, y) && b.terrainAt(x, y) !== "wall" && b.inBounds(x, y));
      const banned = avoid && (Math.abs(x - avoid.x) + Math.abs(y - avoid.y)) <= avoid.r;
      if (md <= beast.move && free && !banned) {
        const d = Math.abs(x - tx) + Math.abs(y - ty);
        if (d < best.d) { best = { x, y, d }; }
      }
    }
  }
  return best;
}

function moveTowardCell(b, beast, tx, ty, avoid) {
  const c = bestCell(b, beast, tx, ty, avoid);
  b.commitMove(beast, c.x, c.y);
}

function nearestOf(b, beast, pool) {
  let best = null;
  for (const e of pool) {
    const d = Math.abs(e.x - beast.x) + Math.abs(e.y - beast.y);
    if (best === null || d < best.d || (d === best.d && e.id < best.e.id)) { best = { e, d }; }
  }
  return best ? best.e : null;
}

// Bot DÉFENSIF pour l'objectif 'survivre N tours' : les bêtes kitent (s'éloignent des
// ennemis) sans attaquer (les ennemis restent en vie -> le tour continue d'avancer).
// Retourne {survived, turn}. Ne modifie pas les règles.
export function surviveTurns(b, turns) {
  const minDistToEnemy = (x, y, enemies) => {
    let m = Infinity;
    for (const e of enemies) { m = Math.min(m, Math.abs(e.x - x) + Math.abs(e.y - y)); }
    return m;
  };
  for (let round = 0; round < turns + 2 && !b.over; round++) {
    const enemies = b.activeBeasts("enemy");
    if (enemies.length === 0) { break; }
    for (const beast of b.activeBeasts("player")) {
      let best = { x: beast.x, y: beast.y, score: minDistToEnemy(beast.x, beast.y, enemies) };
      for (let y = 0; y < b.height; y++) {
        for (let x = 0; x < b.width; x++) {
          const md = Math.abs(beast.x - x) + Math.abs(beast.y - y);
          const free = md === 0 || (!b.cellOccupied(x, y) && b.terrainAt(x, y) !== "wall" && b.inBounds(x, y));
          if (md <= beast.move && free) {
            const score = minDistToEnemy(x, y, enemies);
            if (score > best.score) { best = { x, y, score }; }
          }
        }
      }
      b.commitMove(beast, best.x, best.y);
    }
    b.endTurn();
  }
  return { survived: b.activeBeasts("player").length > 0, turn: b.turn };
}

// Joue la bataille `b` jusqu'à la fin. Retourne {won, captures, over}.
export function playToVictory(b) {
  for (let round = 0; round < MAX_ROUNDS && !b.over; round++) {
    const players = b.activeBeasts("player");
    const enemies = b.activeBeasts("enemy");
    const mobile = enemies.filter((e) => e.move > 0);
    const immobileWeak = enemies.filter((e) => e.move === 0 && e.hp < b.captureThreshold);
    if (mobile.length > 0) {
      for (const beast of players) {
        const t = nearestOf(b, beast, mobile);
        if (t) {
          moveTowardCell(b, beast, t.x, t.y);
          b.commitAttack(beast, t);
        }
      }
    } else if (immobileWeak.length > 0) {
      const weak = immobileWeak[0];
      const enc = orth(weak.x, weak.y).filter(([x, y]) => b.inBounds(x, y) && b.terrainAt(x, y) !== "wall");
      const stage = enc.map(([x, y]) => [x + (x - weak.x), y + (y - weak.y)]);
      const n = Math.min(2, enc.length);
      // pounce ssi les 2 encercleurs sont postés (état de début de tour) -> fondent ensemble.
      let bothReady = true;
      for (let i = 0; i < n; i++) {
        const beast = players[i];
        const atPost = beast && ((beast.x === stage[i][0] && beast.y === stage[i][1]) || (beast.x === enc[i][0] && beast.y === enc[i][1]));
        if (!atPost) { bothReady = false; }
      }
      for (let i = 0; i < n; i++) {
        const beast = players[i];
        if (!beast) { continue; }
        const dest = bothReady ? enc[i] : stage[i];
        const avoid = bothReady ? null : { x: weak.x, y: weak.y, r: 1 };
        moveTowardCell(b, beast, dest[0], dest[1], avoid);
      }
    } else {
      b.endTurn();
      break;
    }
    b.endTurn();
  }
  return { won: b.won, captures: b.captures, over: b.over };
}
