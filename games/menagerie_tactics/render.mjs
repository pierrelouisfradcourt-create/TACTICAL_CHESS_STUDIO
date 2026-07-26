// render.mjs — rendu canvas + HUD + overlay. LECTURE SEULE de view() : ne mute
// jamais l'état du moteur, ne contient aucune règle (toute la logique présentationnelle
// vit ici pour garder game.mjs/level.mjs à surface de mutation minimale).
import { glyphOf } from "./bestiaire.mjs";

export const CELL = 64;

// Palette SOURCE UNIQUE : la légende (index.html) lit ces MÊMES constantes que le
// rendu -> impossible qu'elle mente sur la signification des cases/surbrillances.
export const MOVE_COLOR = "rgba(120,200,255,0.25)";
export const ATTACK_COLOR = "rgba(255,170,60,0.32)";
export const THREAT_COLOR = "rgba(226,74,74,0.20)";
export const TERRAIN_COLORS = { normal: "#20232b", forest: "#2f5d3a", wall: "#3a3a44" };
export const LEGEND = [
  { key: "move", color: MOVE_COLOR, label: "Déplacement possible" },
  { key: "attack", color: ATTACK_COLOR, label: "Cible attaquable" },
  { key: "threat", color: THREAT_COLOR, label: "Menace ennemie (frappée ce tour)" },
  { key: "forest", color: TERRAIN_COLORS.forest, label: "Forêt — couvert (−1 dégât subi)" },
  { key: "wall", color: TERRAIN_COLORS.wall, label: "Mur — infranchissable" },
];
export function paletteSnapshot() {
  return { move: MOVE_COLOR, attack: ATTACK_COLOR, threat: THREAT_COLOR, terrain: { ...TERRAIN_COLORS } };
}

const EMPTY_BUCKETS = { move: new Set(), attack: new Set(), threat: new Set() };

const TYPE_COLOR = {
  braise: "#e2604a",
  ronce: "#5fb35f",
  roche: "#b08a54",
  onde: "#4a86e2",
  foudre: "#e2c84a",
  givre: "#7fd4e2",
};
// (garde propre : couleur de repli si un type inattendu apparaît)
function typeColor(t) {
  return TYPE_COLOR[t] || "#999999";
}

function terrainColor(kind) {
  return TERRAIN_COLORS[kind] || TERRAIN_COLORS.normal;
}

export function draw(ctx, state, ui) {
  const w = state.width * CELL;
  const h = state.height * CELL;
  ctx.clearRect(0, 0, w, h);

  const buckets = (ui && ui.buckets) || EMPTY_BUCKETS;
  const encircle = (ui && ui.encircle) || new Map();
  const selId = ui ? ui.id : null;

  // terrain + surbrillances DISJOINTES (précédence déjà appliquée par classifyCells).
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const key = x + "," + y;
      ctx.fillStyle = terrainColor(state.terrain[y][x]);
      ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
      let hi = null;
      if (buckets.attack.has(key)) { hi = ATTACK_COLOR; }
      else if (buckets.threat.has(key)) { hi = THREAT_COLOR; }
      else if (buckets.move.has(key)) { hi = MOVE_COLOR; }
      if (hi) { ctx.fillStyle = hi; ctx.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1); }
    }
  }

  for (const b of state.beasts) {
    if (!b.active) { continue; }
    const cx = b.x * CELL + CELL / 2;
    const cy = b.y * CELL + CELL / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL / 2 - 8, 0, Math.PI * 2);
    ctx.fillStyle = typeColor(b.type);
    ctx.fill();
    // liseré : allié (bleu) / ennemi (rouge) ; épais si sélectionné ; doré si cicatrisé.
    ctx.lineWidth = selId === b.id ? 5 : 3;
    ctx.strokeStyle = b.scarred ? "#f0c040" : (b.side === "player" ? "#8fd4ff" : "#ff8f8f");
    ctx.stroke();
    // identité : glyph d'espèce au centre (fallback = initiale du type si inconnu).
    const glyph = glyphOf(b.speciesId);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (glyph) {
      ctx.font = `${CELL / 2}px system-ui, sans-serif`;
      ctx.fillText(glyph, cx, cy + 1);
    } else {
      ctx.font = `bold ${CELL / 3}px system-ui, sans-serif`;
      ctx.fillStyle = "#101014";
      ctx.fillText((b.type || "?").charAt(0).toUpperCase(), cx, cy + 1);
    }
    // indicateur "capture en cours" : un anneau doré pointillé sur l'ennemi mis en joue.
    if (b.side === "enemy" && b.pinnedRounds > 0) {
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffd24a";
      ctx.beginPath();
      ctx.arc(cx, cy, CELL / 2 - 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // barre de PV + PV CHIFFRÉS
    const ratio = Math.max(0, b.hp / b.maxHp);
    ctx.fillStyle = "#101014";
    ctx.fillRect(b.x * CELL + 8, b.y * CELL + CELL - 12, CELL - 16, 6);
    ctx.fillStyle = b.side === "player" ? "#5fd06a" : "#e2604a";
    ctx.fillRect(b.x * CELL + 8, b.y * CELL + CELL - 12, (CELL - 16) * ratio, 6);
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillStyle = "#e8ebf2";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`${b.hp}/${b.maxHp}`, cx, b.y * CELL + CELL - 14);
    // "Encerclé n/2" au-dessus d'un ennemi mis en joue (éligible à capture)
    if (encircle.has(b.id)) {
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.fillStyle = "#ffd24a";
      ctx.fillText(`Encerclé ${encircle.get(b.id)}/2`, cx, b.y * CELL + 12);
    }
  }
  if (ui && ui.floats) { drawFloats(ctx, ui.floats); }
}

// Chiffres de dégâts flottants (advisory, dérivés de fx.mjs).
export function drawFloats(ctx, floats) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 16px system-ui, sans-serif";
  ctx.fillStyle = "#ff6a6a";
  for (const f of floats) {
    ctx.fillText(f.text, f.x * CELL + CELL / 2, f.y * CELL + CELL / 2 - 10);
  }
}

export function updateHud(state, els) {
  els.turn.textContent = String(state.turn);
  els.playerCount.textContent = String(state.playerActive);
  els.enemyCount.textContent = String(state.enemyActive);
  els.captures.textContent = String(state.captures);
}

export function updateOverlay(state, els) {
  if (state.over) {
    els.overlay.classList.remove("hidden");
    els.overlayTitle.textContent = state.won ? "VICTOIRE" : "DÉFAITE";
    els.finalCaptures.textContent = String(state.captures);
  } else {
    els.overlay.classList.add("hidden");
  }
}
