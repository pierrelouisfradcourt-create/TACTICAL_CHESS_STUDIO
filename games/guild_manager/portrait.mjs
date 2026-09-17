// guild_manager — PORTRAITS générés. Chaque aventurier a un visage unique et
// stable, dérivé de son identifiant et de son nom (aucun aléa de partie n'est
// consommé : deux appels donnent toujours le même portrait).
// Sortie : une chaîne SVG autonome, insérable telle quelle dans le DOM.
import { CLASSES, RACES } from './data.mjs';

const SKINS = ['#f2d0b0', '#e0b184', '#c98e5e', '#a06a42', '#7a4b2c', '#f7dfc8'];
// Teints propres à certaines races : un orc ne se confond avec personne.
const RACE_SKINS = {
  orc: ['#7fa05a', '#6d8f4a', '#8aae63'],
  gnome: ['#f2d0b0', '#e8c49c'],
};
const HAIRS = ['#2b2118', '#5a3a22', '#8a5a2b', '#c9a227', '#b0b0b8', '#7a2f2f', '#3a3a5a'];
const EYES = ['#3a2a1a', '#2f4f6f', '#3f6f4f', '#5a3a6a'];

// Couleur d'ambiance par rôle : le fond dit le rôle d'un coup d'œil.
const ROLE_BG = { tank: ['#2a3550', '#1a2138'], dps: ['#4a2a3a', '#2e1a26'], healer: ['#2a4a3a', '#1a2e26'] };

// Hachage stable 32 bits (djb2 xor) : identifiant + nom → graine de portrait.
export function portraitSeed(adv) {
  const text = `${adv.id}:${adv.name}`;
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h;
}

// Suite déterministe dérivée de la graine (ne touche pas au rng de la partie).
function picker(seed) {
  let state = seed || 1;
  return (arr) => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return arr[(state >>> 8) % arr.length];
  };
}

function hairPath(style) {
  switch (style) {
    case 0: return '<path d="M14 28 Q14 10 32 10 Q50 10 50 28 L50 22 Q44 16 32 16 Q20 16 14 22 Z"/>';          // coupe courte
    case 1: return '<path d="M13 30 Q13 9 32 9 Q51 9 51 30 L51 20 Q46 14 32 14 Q18 14 13 20 Z"/><path d="M13 26 L11 44 L16 44 L17 28 Z"/><path d="M51 26 L53 44 L48 44 L47 28 Z"/>'; // longs
    case 2: return '<path d="M15 26 Q20 12 32 12 Q44 12 49 26 Q44 18 32 18 Q20 18 15 26 Z"/><circle cx="20" cy="22" r="4"/><circle cx="44" cy="22" r="4"/>'; // bouclés
    case 3: return '<path d="M16 24 Q22 11 32 11 Q42 11 48 24 L44 20 L40 24 L36 19 L32 24 L28 19 L24 24 L20 20 Z"/>'; // hérissés
    case 4: return '<path d="M14 27 Q16 10 32 10 Q48 10 50 27 Q46 15 32 15 Q18 15 14 27 Z"/><path d="M14 25 Q8 38 14 50 L20 50 Q15 38 18 27 Z"/>'; // natte
    default: return '<path d="M16 22 Q22 12 32 12 Q42 12 48 22 Q40 17 32 17 Q24 17 16 22 Z"/>'; // dégarni
  }
}

function beardPath(style) {
  switch (style) {
    case 1: return '<path d="M22 40 Q32 54 42 40 Q42 50 32 52 Q22 50 22 40 Z"/>';   // barbe pleine
    case 2: return '<path d="M26 42 Q32 47 38 42 L38 45 Q32 50 26 45 Z"/>';          // bouc
    case 3: return '<path d="M25 39 Q32 43 39 39 L39 41 Q32 45 25 41 Z"/>';          // moustache
    default: return '';
  }
}

// Marques : cicatrice, bandeau, tatouage. Rend chaque visage plus mémorable.
function markPath(style, accent) {
  switch (style) {
    case 1: return `<path d="M24 26 L27 36" stroke="${accent}" stroke-width="1.6" fill="none" opacity="0.8"/>`;
    case 2: return `<path d="M13 28 L51 28" stroke="${accent}" stroke-width="4" fill="none" opacity="0.85"/>`;
    case 3: return `<circle cx="42" cy="33" r="2.5" fill="${accent}" opacity="0.6"/>`;
    default: return '';
  }
}

// Portrait complet. `size` en pixels CSS ; `classKey` colore le fond et le col.
export function portraitSvg(adv, size = 64) {
  const cls = CLASSES[adv.classKey] || CLASSES.guerrier;
  const pick = picker(portraitSeed(adv));
  const race = RACES[adv.race] ? adv.race : 'humain';
  const skin = pick(RACE_SKINS[race] || SKINS);
  const hair = pick(HAIRS);
  const eye = pick(EYES);
  const hairStyle = pick([0, 1, 2, 3, 4, 5]);
  // Le nain porte toujours la barbe, le halfelin jamais.
  const beard = race === 'nain' ? pick([1, 1, 2]) : race === 'halfelin' ? 0 : pick([0, 0, 0, 1, 2, 3]);
  const mark = pick([0, 0, 0, 1, 2, 3]);
  const brow = pick([-2, 0, 2]);
  const [bg1, bg2] = ROLE_BG[cls.role] || ROLE_BG.dps;
  const accent = cls.role === 'tank' ? '#7fd4e2' : cls.role === 'healer' ? '#ffd24a' : '#ff8f8f';
  const gid = `g${portraitSeed(adv).toString(36)}`;
  // Traits morphologiques de race : oreilles en pointe, défenses, stature.
  const ears = race === 'elfe' || race === 'gnome'
    ? `<path d="M18 30 L10 20 L19 26 Z" fill="${skin}"/><path d="M46 30 L54 20 L45 26 Z" fill="${skin}"/>`
    : `<ellipse cx="18" cy="32" rx="2.6" ry="4" fill="${skin}"/><ellipse cx="46" cy="32" rx="2.6" ry="4" fill="${skin}"/>`;
  const tusks = race === 'orc'
    ? '<path d="M27 41 L26 46 L29 42 Z" fill="#f5f0e0"/><path d="M37 41 L38 46 L35 42 Z" fill="#f5f0e0"/>'
    : '';
  const nose = race === 'gnome' ? `<path d="M32 33 L29 40 L35 40 Z" fill="${skin}" stroke="#00000033"/>` : '';
  const headScale = race === 'halfelin' || race === 'gnome' ? 0.92 : race === 'orc' || race === 'nain' ? 1.06 : 1;
  return `<svg class="pf" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="Portrait de ${adv.name}">
  <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs>
  <rect width="64" height="64" rx="10" fill="url(#${gid})"/>
  <path d="M10 64 Q14 50 22 47 L42 47 Q50 50 54 64 Z" fill="${accent}" opacity="0.55"/>
  <path d="M22 40 L22 49 Q32 54 42 49 L42 40 Z" fill="${skin}"/>
  <g transform="translate(32 31) scale(${headScale}) translate(-32 -31)">
  ${ears}
  <ellipse cx="32" cy="31" rx="14" ry="16" fill="${skin}"/>
  <g fill="${hair}">${hairPath(hairStyle)}${beardPath(beard)}</g>
  <g fill="${eye}"><circle cx="26" cy="32" r="2.1"/><circle cx="38" cy="32" r="2.1"/></g>
  <g stroke="${hair}" stroke-width="1.6" fill="none" stroke-linecap="round">
    <path d="M22 ${28 + brow} L30 ${27 - brow}"/><path d="M34 ${27 - brow} L42 ${28 + brow}"/>
  </g>
  ${nose}
  <path d="M28 40 Q32 43 36 40" stroke="#00000055" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  ${tusks}
  </g>
  ${markPath(mark, accent)}
</svg>`;
}

// Vignette d'ennemi : pas de visage généré, un glyphe par type sur fond sombre.
export const ENEMY_GLYPH = Object.freeze({
  loup: '🐺', ours: '🐻', harpie: '🦅', alpha: '🐺',
  squelette: '💀', zombie: '🧟', spectre: '👻', liche: '☠️',
  bandit: '🗡️', archer_brigand: '🏹', brute: '🪓', capitaine: '⚔️',
  gobelin: '👺', chaman: '🔮', ogre: '👹', roi_gobelin: '👑',
  diablotin: '😈', succube: '💋', demon: '👿', seigneur: '🔥',
  elementaire: '🔥', esprit: '👻',
});

export function enemyGlyph(kind) {
  return ENEMY_GLYPH[kind] || '❓';
}
