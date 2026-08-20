#!/usr/bin/env node
// Belote — CLI jouable (auto-play démonstratif). Affiche une partie complète lisible.
// Usage : node cli.mjs [--seed N] [--target N] [--verbose]
import { playGame } from "./src/game.mjs";

const SUIT_SYM = { pique: "♠", coeur: "♥", carreau: "♦", trefle: "♣" };
const fmt = (c) => `${c.rank}${SUIT_SYM[c.suit]}`;
const TEAM = (t) => (t === 0 ? "A (0&2)" : "B (1&3)");

function parseArgs(argv) {
  const a = { seed: 1, target: 501, verbose: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--seed") a.seed = Number(argv[++i]);
    else if (argv[i] === "--target") a.target = Number(argv[++i]);
    else if (argv[i] === "--verbose") a.verbose = true;
  }
  return a;
}

const args = parseArgs(process.argv.slice(2));
const g = playGame({ target: args.target, seed: args.seed });

console.log(`\n╔═══════════════════════════════════════════════╗`);
console.log(`║  BELOTE — partie (seed=${args.seed}, cible=${args.target})`);
console.log(`╚═══════════════════════════════════════════════╝`);

g.deals.forEach((d, i) => {
  const s = d.score;
  const verdict = s.capot
    ? `CAPOT équipe ${TEAM(s.capotTeam)} (250)`
    : s.dedans
      ? `preneur DEDANS → défense encaisse`
      : `contrat réussi`;
  console.log(
    `\nDonne ${i + 1} · donneur J${d.dealer} · preneur J${d.taker} (équipe ${TEAM(d.takerTeam ?? s.takerTeam)}) ` +
    `· atout ${SUIT_SYM[d.atout]} · tour ${d.round}`
  );
  if (d.beloteTeam !== -1) console.log(`   belote-rebelote : équipe ${TEAM(d.beloteTeam)} (+20)`);
  console.log(`   points cartes : A=${s.base[0]}  B=${s.base[1]}  →  ${verdict}`);
  console.log(`   marque donne  : A +${s.scores[0]}  B +${s.scores[1]}   |   cumul  A=${d.totalsAfter[0]}  B=${d.totalsAfter[1]}`);
  if (args.verbose) {
    d.tricks.forEach((t, k) => {
      console.log(`      pli ${k + 1}: ` + t.plays.map((p) => `J${p.player}:${fmt(p.card)}`).join("  ") + `  → J${t.winner}`);
    });
  }
});

console.log(`\n─────────────────────────────────────────────────`);
console.log(`Résultat : ${g.totals[0]} (équipe A) — ${g.totals[1]} (équipe B)`);
console.log(`VAINQUEUR : équipe ${TEAM(g.winner)}  en ${g.dealsPlayed} donnes` + (g.redeals ? ` (${g.redeals} redistributions)` : ""));
console.log(`─────────────────────────────────────────────────\n`);
