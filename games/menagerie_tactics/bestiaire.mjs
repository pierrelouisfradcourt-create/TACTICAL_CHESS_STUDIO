// bestiaire.mjs — table d'espèces PURE (données figées + accès). N'importe RIEN du
// moteur, ne contient AUCUNE règle : c'est l'enabler d'identité (v1). Chaque espèce
// = 1 couple type×rôle unique exprimé uniquement par ses stats. SOURCE UNIQUE des
// espèces (meta.mjs / campaign.mjs importeront d'ici, pas de table dupliquée).

// 6 espèces, une par type du cycle (braise>ronce>roche>onde>foudre>givre). Chaque
// rôle porte un extrême STRICTEMENT unique (tank=+hp, briseur=+atk, ranged=+range,
// controle=-atk, skirmisher=+speed) pour être reconnaissable et machine-vérifiable.
export const SPECIES = Object.freeze([
  Object.freeze({ id: "embraseur", nom: "Embraseur", type: "braise", role: "briseur", glyph: "🔥", hp: 16, atk: 10, speed: 5, move: 3, range: 1 }),
  Object.freeze({ id: "roncier", nom: "Roncier", type: "ronce", role: "controle", glyph: "🌿", hp: 18, atk: 3, speed: 4, move: 3, range: 1 }),
  Object.freeze({ id: "golem", nom: "Golem", type: "roche", role: "tank", glyph: "🪨", hp: 26, atk: 6, speed: 3, move: 2, range: 1 }),
  Object.freeze({ id: "ondine", nom: "Ondine", type: "onde", role: "ranged", glyph: "🌊", hp: 15, atk: 6, speed: 4, move: 2, range: 2 }),
  Object.freeze({ id: "fulgor", nom: "Fulgor", type: "foudre", role: "skirmisher", glyph: "⚡", hp: 15, atk: 6, speed: 9, move: 4, range: 1 }),
  Object.freeze({ id: "givrette", nom: "Givrette", type: "givre", role: "pinceur", glyph: "❄️", hp: 20, atk: 7, speed: 6, move: 3, range: 1 }),
]);

// Lookup id -> espèce, construit par boucle (déterministe, pas de .find masqué).
export const SPECIES_BY_ID = (() => {
  const map = new Map();
  for (const s of SPECIES) {
    map.set(s.id, s);
  }
  return map;
})();

function require_(id) {
  const s = SPECIES_BY_ID.get(id);
  if (!s) {
    throw new Error("espèce inconnue: " + id);
  }
  return s;
}

// Bloc de stats NEUF pour construire une bête (maxHp === hp au départ). Throw si inconnu.
export function base(id) {
  const s = require_(id);
  return {
    id: s.id,
    type: s.type,
    role: s.role,
    glyph: s.glyph,
    nom: s.nom,
    hp: s.hp,
    maxHp: s.hp,
    atk: s.atk,
    speed: s.speed,
    move: s.move,
    range: s.range,
  };
}

// Accès cosmétiques tolérants : null si id inconnu (le rendu ne doit jamais throw).
export function glyphOf(id) {
  const s = SPECIES_BY_ID.get(id);
  return s ? s.glyph : null;
}

export function roleOf(id) {
  const s = SPECIES_BY_ID.get(id);
  return s ? s.role : null;
}
