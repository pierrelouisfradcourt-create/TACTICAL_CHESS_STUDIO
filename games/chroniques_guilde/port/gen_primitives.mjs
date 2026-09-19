// ============================================================================
// VALEURS DE RÉFÉRENCE DES PRIMITIVES + PREUVE DU MODÈLE « GDScript »
// Date : 2026-09-19.  node port/gen_primitives.mjs
//
// Deux choses :
//  (A) on réimplémente chaque primitive avec de l'arithmétique ENTIÈRE 64 bits pure
//      (BigInt, masque & 0xFFFFFFFF, AUCUN opérateur binaire 32 bits de JavaScript,
//      AUCUN Math.imul) — c'est exactement ce que fera GDScript, dont les int sont 64 bits ;
//      puis on prouve que ce modèle rend les mêmes valeurs que le moteur.
//  (B) on imprime les tables de valeurs attendues à recopier en tête des .gd.
// ============================================================================
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sim = require(path.join(ROOT, 'sim.js'));

const M32 = 0xFFFFFFFFn;
// --- modèle GDScript (entiers 64 bits, masque explicite) --------------------
function gdImul32(a, b) {                       // a*b mod 2^32, sans jamais dépasser 2^48
  a &= M32; b &= M32;
  const lo = (a & 0xFFFFn) * b;                 // <= 2^48
  const hi = ((a >> 16n) * (b & 0xFFFFn)) & 0xFFFFn;
  return (lo + (hi << 16n)) & M32;
}
function gdFnvBytes(h, bytes) {
  h = BigInt(h) & M32;
  for (const b of bytes) { h = (h ^ BigInt(b)) & M32; h = gdImul32(h, 0x01000193n); }
  return h;
}
function gdUtf8(str) { return Array.from(Buffer.from(str, 'utf8')); }   // = String.to_utf8_buffer()
function gdFnvStr(s) { return gdFnvBytes(0x811C9DC5n, gdUtf8(s)); }
function gdFnvU32(v) {
  const x = BigInt(v >>> 0) & M32;
  return gdFnvBytes(0x811C9DC5n, [Number(x & 255n), Number((x >> 8n) & 255n), Number((x >> 16n) & 255n), Number((x >> 24n) & 255n)]);
}
function gdRng(seed) {
  const st = { s: BigInt(seed) & M32, count: 0 };
  st.next = () => {
    st.s = (st.s + 0x6D2B79F5n) & M32;
    let t = st.s;
    t = gdImul32(t ^ (t >> 15n), t | 1n);
    t = ((t + gdImul32(t ^ (t >> 7n), t | 61n)) ^ t) & M32;
    st.count++;
    return (t ^ (t >> 14n)) & M32;
  };
  st.roll = n => (n <= 1 ? 0n : st.next() % BigInt(n));
  return st;
}
function gdDiv(a, b) { const q = BigInt(a) / BigInt(b); return Number(q); }   // BigInt / tronque vers zéro, comme GDScript

// --- (A) preuve : le modèle 64 bits == le moteur ----------------------------
let bad = 0, n = 0;
for (let s = 0; s < 400; s++) {
  const seed = (s * 2654435761) >>> 0;
  if (sim._internal.fnvU32(seed) !== Number(gdFnvU32(seed))) { bad++; console.log('fnvU32 diverge sur ' + seed); }
  const a = sim._internal.makeRng(sim._internal.fnvU32(seed)), b = gdRng(gdFnvU32(seed));
  for (let k = 0; k < 40; k++) { n++; if (a.next() !== Number(b.next())) { bad++; if (bad < 4) console.log('makeRng diverge graine ' + seed + ' tirage ' + k); } }
}
const MOTS = ['', 'p1', 'ai_prudent', 'hall', 'Maëlle', 'Château', 'é', 'Ysolde', 'forêt', 'Hydre des marais',
  'Les Loups d’Argent', 'jour|3', 'raid_forest', 'aventurier_être_blessé', '🐉'];
for (const m of MOTS) { n++; if (sim._internal.fnvStr(m) !== Number(gdFnvStr(m))) { bad++; console.log('fnvStr diverge sur ' + JSON.stringify(m)); } }
const DIVS = [[7,2],[-7,2],[7,-2],[-7,-2],[1,3],[-1,3],[-2,3],[-4,3],[-5,2],[-15,2],[-31,2],[0,5],[2147483647,3],[-2147483648,3]];
for (const [a, b] of DIVS) { n++; if (Math.trunc(a / b) !== gdDiv(a, b)) { bad++; console.log('div diverge sur ' + a + '/' + b); } }
console.log('== (A) modèle 64 bits vs moteur : ' + (bad ? bad + ' DIVERGENCES sur ' + n : 'AUCUNE divergence, ' + n + ' comparaisons') + ' ==\n');

// --- (B) tables de référence ------------------------------------------------
const hex = v => '0x' + (typeof v === 'bigint' ? v : BigInt(v >>> 0)).toString(16).padStart(8, '0');
const out = [];
const P = (...x) => out.push(x.join(''));

P('### div(a, b) — troncature VERS ZÉRO');
for (const [a, b] of DIVS) P('  div(', a, ', ', b, ') == ', Math.trunc(a / b), (Math.floor(a / b) !== Math.trunc(a / b) ? '        (floor() donnerait ' + Math.floor(a / b) + ' — FAUX)' : ''));

P('\n### imul32(a, b) — les 32 bits bas du produit');
for (const [a, b] of [[0x811C9DC5, 0x01000193], [0xFFFFFFFF, 0xFFFFFFFF], [0x6D2B79F5, 3], [123456789, 987654321], [0x80000000, 2]])
  P('  imul32(', hex(a), ', ', hex(b), ') == ', hex(gdImul32(BigInt(a), BigInt(b))));

P('\n### fnv1a_u32(v) — hachage d’un entier 32 bits (4 octets, petit-boutiste)');
for (const v of [0, 1, 4242, 4242 ^ 1, 4242 ^ 30, 0xFFFFFFFF]) P('  fnv1a_u32(', v, ') == ', hex(gdFnvU32(v >>> 0)));

P('\n### fnv1a_str(s) — hachage des OCTETS UTF-8 (accents compris)');
for (const m of MOTS) P('  fnv1a_str(', JSON.stringify(m), ') == ', hex(gdFnvStr(m)), '     (', gdUtf8(m).length, ' octets UTF-8)');
P('  octets UTF-8 de "Maëlle"  == ', JSON.stringify(gdUtf8('Maëlle')));
P('  octets UTF-8 de "Château" == ', JSON.stringify(gdUtf8('Château')));

P('\n### mulberry32 — 8 premiers next() pour rng = makeRng(fnv1a_u32(4242 ^ 1))');
{
  const seed = sim._internal.fnvU32(4242 ^ 1);
  P('  graine du flux = fnv1a_u32(4242 ^ 1) = ', hex(seed));
  const r = gdRng(gdFnvU32(seed === undefined ? 0 : (4242 ^ 1)));
  const r2 = gdRng(BigInt(seed));
  const vals = []; for (let i = 0; i < 8; i++) vals.push(hex(r2.next()));
  P('  next()   = ', vals.join(', '));
  const r3 = gdRng(BigInt(seed)); const rolls = []; for (let i = 0; i < 8; i++) rolls.push(Number(r3.roll(1000)));
  P('  roll(1000) = ', rolls.join(', '), '   (chance(p) == roll(1000) < p)');
  const r4 = gdRng(BigInt(seed)); const b = []; for (let i = 0; i < 8; i++) b.push(Number(r4.roll(6)) + 1);
  P('  roll(6)+1  = ', b.join(', '));
  void r;
}

P('\n### canonique + hashState');
{
  const ex = { z: 1, a: { d: [3, 2, 1], c: 'é' }, b: null, n: -7 };
  P('  objet      : {"z":1,"a":{"d":[3,2,1],"c":"é"},"b":null,"n":-7}');
  P('  canonical  : ', sim._internal.canonical(ex));
  P('  hashState  : ', sim.hashState(ex));
  P('  canonical de []       : ', sim._internal.canonical([]));
  P('  canonical de {}       : ', sim._internal.canonical({}));
  P('  canonical de "Château": ', sim._internal.canonical('Château'));
  P('  canonical de 0        : ', sim._internal.canonical(0), '     (jamais "0.0")');
  P('  canonical de -7       : ', sim._internal.canonical(-7));
  P('  hashState({})         : ', sim.hashState({}));
  P('  hashState([])         : ', sim.hashState([]));
  P('  tri des clés : ["b","A","10","2","é","a"].sort() == ', JSON.stringify(['b', 'A', '10', '2', 'é', 'a'].sort()),
    '   (par point de code, JAMAIS par locale)');
}
console.log(out.join('\n'));
fs.writeFileSync(path.join(ROOT, 'port', 'PRIMITIVES_REF.txt'), out.join('\n') + '\n', 'utf8');
process.exit(bad ? 1 : 0);
