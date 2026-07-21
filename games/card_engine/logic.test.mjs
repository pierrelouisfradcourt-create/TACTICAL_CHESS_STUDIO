// logic.test.mjs — Unit tests for CardEngine rules
// Tests core logic: R1..R12 (card, deck, hand, rules, scoring, etc.)

import test from 'node:test';
import assert from 'node:assert/strict';

// solvability.mjs guards its own `main()` behind an entrypoint check
// (`process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]`) so that
// importing it for testing doesn't trigger a real process.exit(). ESM STATIC imports
// are hoisted before any other top-level code in a module — a process.exit stub written
// AFTER a static `import ... from './solvability.mjs'` would never install in time if
// that guard were ever mutated (eq->neq / and->or) and fired eagerly. So this ONE import
// is done dynamically, with process.exit pre-stubbed, specifically to make that guard's
// own correctness independently observable (see the dedicated test below).
const _realProcessExit = process.exit;
let _solvabilityEagerExitCalls = 0;
process.exit = () => { _solvabilityEagerExitCalls += 1; };
const _solvabilityModule = await import('./solvability.mjs');
process.exit = _realProcessExit;
const {
  SEEDS: SOLVABILITY_SEEDS, checkSolver, checkPlayGame, main: solvabilityMain,
} = _solvabilityModule;

import { createBeloteAdapter } from './adapters/belote/index.mjs';
import { createRng, shuffle } from './core/rng.mjs';
import { deal, completeDeal, eldestOrder } from './adapters/belote/deal.mjs';
import {
  beloteTeam, beloteHolder, teamOf, partnerOf, legalMoves, compareInTrick, trickWinner,
} from './adapters/belote/rules.mjs';
import { scoreDeal, CONTRACT_MIN, CAPOT_POINTS, BELOTE_BONUS } from './adapters/belote/scoring.mjs';
import { pickup } from './core/shoe.mjs';
import { playTrick, playTricks } from './core/trickplay.mjs';
import { resolveTrick, reassignCapture } from './core/trick.mjs';
import { makeCard } from './core/card.mjs';
import { buildDeck, assertMultisetConserved } from './core/deck.mjs';
import { projectMoves } from './core/hand.mjs';
import { assertRulesAdapter, assertLegalMove } from './core/rules_interface.mjs';
import { assertScoreAdapter } from './core/score_interface.mjs';
import { createStubAdapter } from './adapters/stub/minimal.mjs';
import { SUITS, RANKS, PLAIN_POINTS, TRUMP_POINTS } from './adapters/belote/cards.mjs';
import { handStrength, runAuction } from './adapters/belote/bidding.mjs';
import { playDeal, playGame } from './adapters/belote/game.mjs';
import { runSolver, solveDeal, chooseMove as solverChooseMove } from './harness/solver.mjs';
import {
  normalizeGoldenResult, checkLegalParity, checkWinnerParity, checkScoreParity, runParityCheck,
} from './harness/parity.mjs';
import {
  detectSequences, detectCarres, detectAnnonces, compareAnnonce, resolveAnnonces,
} from './adapters/belote/annonces.mjs';

const C = (rank, suit) => ({ rank, suit, id: `${rank}-${suit}` });

test('R1: Belote deck has 32 unique cards', () => {
  const adapter = createBeloteAdapter();
  const deck = adapter.fullDeck();

  assert.equal(deck.length, 32);
  const ids = new Set(deck.map(c => c.id));
  assert.equal(ids.size, 32); // All unique
});

test('R2: Card points by trump', () => {
  const adapter = createBeloteAdapter();
  const { cardPoints } = adapter;
  const deck = adapter.fullDeck();

  const hearts = deck.filter(c => c.suit === 'coeur');
  const valet = hearts.find(c => c.rank === 'V');
  const nine = hearts.find(c => c.rank === '9');

  // V and 9 are worth more as trump
  assert.equal(cardPoints(valet, 'coeur'), 20); // Trump V = 20
  assert.equal(cardPoints(valet, 'pique'), 2); // Non-trump V = 2
  assert.equal(cardPoints(nine, 'coeur'), 14); // Trump 9 = 14
  assert.equal(cardPoints(nine, 'pique'), 0); // Non-trump 9 = 0
});

test('R3: Card strength order', () => {
  const adapter = createBeloteAdapter();
  const { cardStrength } = adapter;
  const deck = adapter.fullDeck();

  const hearts = deck.filter(c => c.suit === 'coeur');
  const seven = hearts.find(c => c.rank === '7');
  const ace = hearts.find(c => c.rank === 'A');

  // Trump: 7<8<D<R<10<A<9<V
  assert(cardStrength(seven, 'coeur') < cardStrength(ace, 'coeur')); // Trump 7 < Trump A
  // Non-trump: 7<8<9<V<D<R<10<A
  assert(cardStrength(seven, 'pique') < cardStrength(ace, 'pique')); // Non-trump 7 < Non-trump A
});

test('R4: Deal and completeDeal', () => {
  const adapter = createBeloteAdapter();
  const rng = createRng(123);
  const deck = shuffle(adapter.fullDeck(), rng);

  const { hands, turnUp, talon } = deal(0, deck);

  assert.equal(hands.length, 4);
  hands.forEach(h => assert.equal(h.length, 5)); // 5 cards each after phase 1
  assert(turnUp);
  assert.equal(talon.length, 11);

  // Phase 2: completeDeal
  const full = completeDeal(hands, 0, turnUp, talon, 0);
  full.forEach(h => assert.equal(h.length, 8)); // 8 cards each after phase 2
});

test('R12: Total card points = 152', () => {
  const adapter = createBeloteAdapter();
  const { totalCardPoints } = adapter;

  // For any trump, total should be 152
  assert.equal(totalCardPoints('coeur'), 152);
  assert.equal(totalCardPoints('pique'), 152);
  assert.equal(totalCardPoints('carreau'), 152);
  assert.equal(totalCardPoints('trefle'), 152);
});

test('R13: Deterministic shuffle (replay)', () => {
  const adapter = createBeloteAdapter();
  const deck = adapter.fullDeck();

  const rng1 = createRng(42);
  const shuffled1 = shuffle(deck, rng1);

  const rng2 = createRng(42);
  const shuffled2 = shuffle(deck, rng2);

  // Same seed -> same shuffle
  for (let i = 0; i < shuffled1.length; i++) {
    assert.equal(shuffled1[i].id, shuffled2[i].id);
  }
});

test('R8: Score deal — contract success', () => {
  const adapter = createBeloteAdapter();

  // Mock tricks: team 0 wins cards worth 85 points base
  const tricks = [
    { winner: 0, cards: adapter.fullDeck().slice(0, 8) },
    { winner: 1, cards: adapter.fullDeck().slice(8, 16) },
    { winner: 0, cards: adapter.fullDeck().slice(16, 24) },
    { winner: 0, cards: adapter.fullDeck().slice(24, 32) },
  ];

  // Pad to 8 tricks
  while (tricks.length < 8) {
    tricks.push({ winner: 0, cards: [] });
  }

  const contract = { trump: 'coeur', taker: 0 };
  const score = scoreDeal(tricks, contract, -1, true); // No belote

  assert(score.base[0] + score.base[1] === 162); // Base invariant
  assert(typeof score.scores[0] === 'number');
  assert(typeof score.scores[1] === 'number');
});

test('R9: Belote detection', () => {
  const adapter = createBeloteAdapter();
  const deck = adapter.fullDeck();

  // Create hands where seat 0 has both R and D of hearts
  const hearts = deck.filter(c => c.suit === 'coeur');
  const kingHearts = hearts.find(c => c.rank === 'R');
  const queenHearts = hearts.find(c => c.rank === 'D');

  const hands = [[], [], [], []];
  hands[0].push(kingHearts, queenHearts); // Seat 0 has both

  const bteam = beloteTeam(hands, 'coeur');
  assert.equal(bteam, 0); // Team of seat 0
});

test('F7: pickup requires teamOf/teamOrder — no silent Belote-topology default', () => {
  const adapter = createBeloteAdapter();
  const deck = adapter.fullDeck();
  const tricks = [{ winner: 0, cards: deck.slice(0, 4) }];

  assert.throws(() => pickup(tricks), /teamOf\/teamOrder requis/);
  assert.throws(() => pickup(tricks, {}), /teamOf\/teamOrder requis/);
  assert.throws(() => pickup(tricks, { teamOf: (seat) => seat % 2 }), /teamOf\/teamOrder requis/); // teamOrder missing
  assert.throws(() => pickup(tricks, { teamOrder: [0, 1] }), /teamOf\/teamOrder requis/); // teamOf missing
  assert.throws(() => pickup(tricks, { teamOf: (seat) => seat % 2, teamOrder: [] }), /teamOf\/teamOrder requis/); // empty teamOrder
});

test('F7: pickup is generic — a 3-team topology (not just Belote 2-team) piles correctly', () => {
  const adapter = createBeloteAdapter();
  const deck = adapter.fullDeck();
  // 6 seats, 3 teams of 2 (seat % 3 = team). Winners: seat0(team0), seat1(team1), seat2(team2).
  const teamOf = (seat) => seat % 3;
  const teamOrder = [0, 1, 2];
  const tricks = [
    { winner: 0, cards: deck.slice(0, 2) },   // team 0
    { winner: 1, cards: deck.slice(2, 4) },   // team 1
    { winner: 2, cards: deck.slice(4, 6) },   // team 2
    { winner: 3, cards: deck.slice(6, 8) },   // seat 3 -> team 0 (3%3=0)
  ];

  const result = pickup(tricks, { teamOf, teamOrder });

  // Recomposed in teamOrder [0,1,2]: team0 pile (trick0 + trick3), team1 pile (trick1), team2 pile (trick2)
  const expectedIds = [
    ...deck.slice(0, 2), ...deck.slice(6, 8), // team 0
    ...deck.slice(2, 4),                       // team 1
    ...deck.slice(4, 6),                       // team 2
  ].map(c => c.id);
  assert.deepEqual(result.map(c => c.id), expectedIds);

  // An out-of-teamOrder winner team must be rejected explicitly.
  assert.throws(
    () => pickup([{ winner: 0, cards: deck.slice(0, 1) }], { teamOf: () => 99, teamOrder: [0, 1, 2] }),
    /not in teamOrder/
  );
});

// =====================================================================================
// F9 (red-team HIGH) + F12 (root cause) regression: real gameplay must enforce suit
// obligations. Off-suit discards must NEVER win a trick regardless of rank.
// =====================================================================================

test('F9/F12 regression: off-suit discard never beats the led suit (real playTrick)', () => {
  // seat0 leads pique-7 (weak). seat1 has NO pique and discards trefle-A (globally
  // strongest rank by index) — must NOT win: seat1 is off-suit, ineligible entirely.
  // seat2 follows suit with pique-8 (beats the led 7). seat3 discards coeur-A (also off-suit).
  const hands = [
    [C('7', 'pique')],
    [C('A', 'trefle')],
    [C('8', 'pique')],
    [C('A', 'coeur')],
  ];
  const rules = createBeloteAdapter().rules;
  const contract = { trump: 'carreau' }; // trump irrelevant to this off-suit scenario
  const selectFirst = (legal) => legal[0];
  const result = playTrick(hands.map(h => h.slice()), 0, rules, selectFirst, contract);
  // Winner must be seat2 (only card that both follows suit AND beats the led 7).
  assert.equal(result.winner, 2);
});

test('F12 regression: legalMoves sees the IN-PROGRESS trick, not an empty one (must follow suit for real)', () => {
  // seat0 leads coeur. seat1 HOLDS a coeur card — must be forced to play it, even though
  // seat1 also holds a "juicier" off-suit card the naive (first-legal) selector would love.
  const hands = [
    [C('7', 'coeur')],
    [C('9', 'coeur'), C('A', 'trefle')], // must play 9-coeur (follow suit), NOT A-trefle
    [C('8', 'pique')],
    [C('8', 'carreau')],
  ];
  const rules = createBeloteAdapter().rules;
  const contract = { trump: 'pique' };
  const chosen = [];
  const selectFirst = (legal, plays) => { chosen.push({ n: plays.length, legalIds: legal.map(c => c.id) }); return legal[0]; };
  playTrick(hands.map(h => h.slice()), 0, rules, selectFirst, contract);
  // seat1 plays 2nd (n=1 prior play) — its legal set must be constrained to coeur only.
  assert.deepEqual(chosen[1].legalIds, ['9-coeur']);
});

// =====================================================================================
// adapters/belote/rules.mjs — legalMoves branch coverage, compareInTrick, teamOf/partnerOf,
// beloteTeam/beloteHolder.
// =====================================================================================

test('rules: teamOf / partnerOf', () => {
  assert.equal(teamOf(0), 0);
  assert.equal(teamOf(1), 1);
  assert.equal(teamOf(2), 0);
  assert.equal(teamOf(3), 1);
  assert.equal(partnerOf(0), 2);
  assert.equal(partnerOf(1), 3);
  assert.equal(partnerOf(2), 0);
  assert.equal(partnerOf(3), 1);
});

test('rules.legalMoves: entame — empty trick, all cards legal', () => {
  const hand = [C('7', 'pique'), C('A', 'coeur')];
  assert.deepEqual(legalMoves(hand, [], { trump: 'coeur' }, 0).map(c => c.id).sort(),
    hand.map(c => c.id).sort());
});

test('rules.legalMoves: trump led, no trump in hand -> all legal', () => {
  const hand = [C('7', 'pique'), C('A', 'carreau')];
  const trick = [{ seat: 0, card: C('9', 'coeur') }];
  assert.deepEqual(legalMoves(hand, trick, { trump: 'coeur' }, 1).map(c => c.id).sort(),
    ['7-pique', 'A-carreau']);
});

test('rules.legalMoves: trump led, must beat if possible (exact strength boundary)', () => {
  // Trump order: 7<8<D<R<10<A<9<V. Led = 9-coeur (strong). Only V-coeur beats it.
  const hand = [C('8', 'coeur'), C('V', 'coeur'), C('R', 'pique')];
  const trick = [{ seat: 0, card: C('9', 'coeur') }];
  assert.deepEqual(legalMoves(hand, trick, { trump: 'coeur' }, 1).map(c => c.id), ['V-coeur']);
});

test('rules.legalMoves: trump led, cannot beat -> must still provide ANY trump (all qualify)', () => {
  const hand = [C('7', 'coeur'), C('8', 'coeur'), C('R', 'pique')];
  const trick = [{ seat: 0, card: C('V', 'coeur') }]; // unbeatable
  assert.deepEqual(legalMoves(hand, trick, { trump: 'coeur' }, 1).map(c => c.id).sort(),
    ['7-coeur', '8-coeur']);
});

test('rules.legalMoves: non-trump led, must follow suit if possible', () => {
  const hand = [C('7', 'pique'), C('A', 'pique'), C('R', 'coeur')];
  const trick = [{ seat: 0, card: C('D', 'pique') }];
  assert.deepEqual(legalMoves(hand, trick, { trump: 'coeur' }, 1).map(c => c.id).sort(),
    ['7-pique', 'A-pique']);
});

test('rules.legalMoves: cannot follow, partner master -> free (no obligation)', () => {
  const hand = [C('7', 'coeur'), C('A', 'carreau')];
  const trick = [{ seat: 0, card: C('R', 'pique') }, { seat: 1, card: C('8', 'pique') }];
  assert.deepEqual(legalMoves(hand, trick, { trump: 'coeur' }, 2).map(c => c.id).sort(),
    ['7-coeur', 'A-carreau']);
});

test('rules.legalMoves: cannot follow, adversary master, have trump -> must cut', () => {
  const hand = [C('7', 'coeur'), C('A', 'carreau')];
  const trick = [{ seat: 0, card: C('R', 'pique') }];
  assert.deepEqual(legalMoves(hand, trick, { trump: 'coeur' }, 1).map(c => c.id), ['7-coeur']);
});

test('rules.legalMoves: cannot follow, adversary master, MUST overcut if a trump already fell', () => {
  const hand = [C('8', 'coeur'), C('V', 'coeur'), C('A', 'carreau')];
  const trick = [{ seat: 0, card: C('R', 'pique') }, { seat: 1, card: C('9', 'coeur') }];
  assert.deepEqual(legalMoves(hand, trick, { trump: 'coeur' }, 2).map(c => c.id), ['V-coeur']);
});

test('rules.legalMoves: cannot follow, adversary master, no trump -> free throw', () => {
  const hand = [C('7', 'carreau'), C('A', 'trefle')];
  const trick = [{ seat: 0, card: C('R', 'pique') }];
  assert.deepEqual(legalMoves(hand, trick, { trump: 'coeur' }, 1).map(c => c.id).sort(),
    ['7-carreau', 'A-trefle']);
});

test('rules.compareInTrick: off-suit discard NEVER wins, regardless of rank (F9 unit)', () => {
  const contract = { trump: 'carreau' };
  // cardA = off-suit A-trefle (globally top rank), cardB = led-suit 7-pique (weakest). led=pique.
  assert.ok(compareInTrick(C('A', 'trefle'), C('7', 'pique'), 'pique', contract) < 0);
});

test('rules.compareInTrick: trump beats led-suit non-trump regardless of rank', () => {
  const contract = { trump: 'carreau' };
  assert.ok(compareInTrick(C('7', 'carreau'), C('A', 'pique'), 'pique', contract) > 0);
});

test('rules.compareInTrick: both off-suit discards -> tie (0), irrelevant to the trick', () => {
  const contract = { trump: 'carreau' };
  assert.equal(compareInTrick(C('A', 'trefle'), C('7', 'coeur'), 'pique', contract), 0);
});

test('rules.compareInTrick: same category (both led-suit) compares by strength', () => {
  const contract = { trump: 'carreau' };
  assert.ok(compareInTrick(C('A', 'pique'), C('7', 'pique'), 'pique', contract) > 0);
  assert.ok(compareInTrick(C('7', 'pique'), C('A', 'pique'), 'pique', contract) < 0);
});

test('rules.trickWinner: cut wins over led suit', () => {
  const trick = { led: 'pique', plays: [
    { seat: 0, card: C('A', 'pique') },
    { seat: 1, card: C('7', 'coeur') }, // small trump cut
    { seat: 2, card: C('10', 'pique') },
    { seat: 3, card: C('8', 'pique') },
  ] };
  assert.equal(trickWinner(trick, { trump: 'coeur' }).seat, 1);
});

test('rules.trickWinner: overcut beats a smaller cut', () => {
  const trick = { led: 'pique', plays: [
    { seat: 0, card: C('A', 'pique') },
    { seat: 1, card: C('7', 'coeur') },
    { seat: 2, card: C('V', 'coeur') }, // overcuts seat1
    { seat: 3, card: C('8', 'pique') },
  ] };
  assert.equal(trickWinner(trick, { trump: 'coeur' }).seat, 2);
});

test('rules.trickWinner: partner-master scenario — best led-suit card wins when no trump falls', () => {
  const trick = { led: 'pique', plays: [
    { seat: 0, card: C('R', 'pique') },
    { seat: 1, card: C('8', 'pique') },
    { seat: 2, card: C('A', 'pique') }, // partner of seat0, masters with the Ace
    { seat: 3, card: C('D', 'pique') },
  ] };
  assert.equal(trickWinner(trick, { trump: 'coeur' }).seat, 2);
});

test('rules.trickWinner: strong off-suit discard LOSES to a weak led-suit card', () => {
  const trick = { led: 'pique', plays: [
    { seat: 0, card: C('7', 'pique') },
    { seat: 1, card: C('A', 'trefle') }, // off-suit, globally top rank, must NOT win
    { seat: 2, card: C('8', 'carreau') }, // also off-suit
    { seat: 3, card: C('9', 'coeur') }, // also off-suit (trump is something else here)
  ] };
  assert.equal(trickWinner(trick, { trump: 'carreau' }).seat, 2); // 8-carreau IS trump here, wins
});

test('rules.beloteTeam / beloteHolder: needs BOTH King and Queen, not just one', () => {
  const kingOnly = [[C('R', 'coeur')], [], [], []];
  assert.equal(beloteTeam(kingOnly, 'coeur'), -1);
  assert.equal(beloteHolder(kingOnly, 'coeur'), -1);
  const queenOnly = [[], [C('D', 'coeur')], [], []];
  assert.equal(beloteTeam(queenOnly, 'coeur'), -1);
  const both = [[], [], [C('R', 'coeur'), C('D', 'coeur')], []];
  assert.equal(beloteTeam(both, 'coeur'), teamOf(2));
  assert.equal(beloteHolder(both, 'coeur'), 2);
});

// =====================================================================================
// adapters/belote/scoring.mjs
// =====================================================================================

// Real 32-card deck partition, verified point sums (cardPoints under trump='coeur'):
// V-coeur=20, 9-coeur=14, A-coeur=11, 10-coeur=10 (trick1=55); A-pique=11, V-pique=2 (shared).
// trick2 uses R-pique=4 (boundary-82 case: 55+17=72, +10 der = 82) or D-pique=3
// (boundary-81 case: 55+16=71, +10 der = 81). Team1 gets the REMAINING 25/24 cards —
// the exact sum is not hand-computed, it is 152 minus team0's real total (deck invariant).
function boundaryDeal(rank3card) {
  const deck = createBeloteAdapter().fullDeck();
  const byId = new Map(deck.map(c => [c.id, c]));
  const team0Ids = ['V-coeur', '9-coeur', 'A-coeur', '10-coeur', 'A-pique', rank3card, 'V-pique'];
  const team0Cards = team0Ids.map(id => byId.get(id));
  const team1Cards = deck.filter(c => !team0Ids.includes(c.id));
  const tricks = [
    { winner: 1, cards: team1Cards }, // single "trick" carrying all of team1's cards — sizes don't matter to scoreDeal
    { winner: 0, cards: team0Cards.slice(0, 4) },
    { winner: 0, cards: team0Cards.slice(4) }, // LAST trick won by team0 -> +10 dix de der
  ];
  return tricks;
}

test('scoring: contract boundary — base===82 exactly => MET, dedans=false; default beloteDeclared=true', () => {
  const tricks = boundaryDeal('R-pique'); // team0 raw = 20+14+11+10+11+4+2 = 72, +10 der = 82
  const score = scoreDeal(tricks, { trump: 'coeur', taker: 0 }, 0 /* beloteTeamIdx */);
  assert.equal(score.base[0], 82);
  assert.equal(score.base[1], 80);
  assert.equal(score.contractMet, true);
  assert.equal(score.dedans, false);
  assert.equal(score.scores[0], 82 + BELOTE_BONUS); // default beloteDeclared=true applies +20
  assert.equal(score.belote[0], BELOTE_BONUS);
});

test('scoring: contract boundary — base===81 exactly => taker DEDANS, contract NOT met', () => {
  const tricks = boundaryDeal('D-pique'); // team0 raw = 20+14+11+10+11+3+2 = 71, +10 der = 81
  const score = scoreDeal(tricks, { trump: 'coeur', taker: 0 }, -1, true);
  assert.equal(score.base[0], 81);
  assert.equal(score.base[1], 81);
  assert.equal(score.contractMet, false);
  assert.equal(score.dedans, true);
  assert.equal(score.scores[0], 0);
  assert.equal(score.scores[1], 162);
});

test('scoring: belote not declared => +0, not +20', () => {
  const tricks = boundaryDeal('R-pique');
  const score = scoreDeal(tricks, { trump: 'coeur', taker: 0 }, 0, false);
  assert.equal(score.belote[0], 0);
});

test('scoring: capot — team winning all 8 tricks scores CAPOT_POINTS', () => {
  const cards = fullDeckOrderedForTest();
  const winners = [0, 2, 0, 2, 0, 2, 0, 2];
  const tricks = [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ winner: winners[i], cards: cards.slice(i * 4, i * 4 + 4) }));
  const score = scoreDeal(tricks, { trump: 'coeur', taker: 0 }, -1, true);
  assert.equal(score.capot, true);
  assert.equal(score.capotTeam, 0);
  assert.equal(score.scores[0], CAPOT_POINTS);
  assert.equal(score.scores[1], 0);
});

function fullDeckOrderedForTest() {
  const cards = [];
  for (const s of ['pique', 'coeur', 'carreau', 'trefle'])
    for (const r of ['7', '8', '9', '10', 'V', 'D', 'R', 'A']) cards.push(C(r, s));
  return cards;
}

// =====================================================================================
// adapters/belote/bidding.mjs
// =====================================================================================

test('bidding.handStrength: exact per-branch scores (trump)', () => {
  assert.equal(handStrength([C('V', 'coeur')], 'coeur'), 6);
  assert.equal(handStrength([C('9', 'coeur')], 'coeur'), 5);
  assert.equal(handStrength([C('A', 'coeur')], 'coeur'), 3);
  assert.equal(handStrength([C('10', 'coeur')], 'coeur'), 2);
  assert.equal(handStrength([C('7', 'coeur')], 'coeur'), 1);
  assert.equal(handStrength([C('8', 'coeur')], 'coeur'), 1);
  assert.equal(handStrength([C('D', 'coeur')], 'coeur'), 1);
  assert.equal(handStrength([C('R', 'coeur')], 'coeur'), 1);
});

test('bidding.handStrength: exact per-branch scores (off-trump)', () => {
  assert.equal(handStrength([C('A', 'pique')], 'coeur'), 2);
  assert.equal(handStrength([C('10', 'pique')], 'coeur'), 1);
  assert.equal(handStrength([C('7', 'pique')], 'coeur'), 0);
  assert.equal(handStrength([C('V', 'pique')], 'coeur'), 0);
});

test('bidding.runAuction: throws on malformed hands/turnUp (OR guard, both clauses independently required)', () => {
  assert.throws(() => runAuction([[], [], []], C('7', 'coeur'), 0), /4 hands/); // wrong length, not null
  assert.throws(() => runAuction([[], [], [], []], null, 0), /turnUp card/);
});

test('bidding.runAuction: round1 boundary — strength===8 taken, strength===7 not (falls to redeal)', () => {
  const weak = [C('8', 'pique'), C('8', 'carreau'), C('8', 'trefle'), C('7', 'pique'), C('7', 'carreau')];
  const takenHands = [[C('10', 'coeur'), C('7', 'coeur')], weak, weak, weak];
  const takenResult = runAuction(takenHands, C('9', 'coeur'), 3); // eldestOrder(3)=[0,1,2,3]
  assert.deepEqual(takenResult, { taker: 0, atout: 'coeur', round: 1 });

  const notTakenHands = [[C('10', 'coeur')], weak, weak, weak];
  const notTakenResult = runAuction(notTakenHands, C('9', 'coeur'), 3);
  assert.equal(notTakenResult, null);
});

test('bidding.runAuction: round2 cannot retake candidate suit; correctly evaluates other suits (skip-logic)', () => {
  const weak = [C('8', 'pique'), C('8', 'carreau'), C('8', 'trefle'), C('7', 'pique'), C('7', 'carreau')];
  const hands = [
    [C('9', 'trefle'), C('A', 'trefle'), C('7', 'trefle')], // trefle strength = 5+3+1 = 9 exactly
    weak, weak, weak,
  ];
  const result = runAuction(hands, C('7', 'coeur'), 3); // candidate='coeur', round1 too weak
  assert.deepEqual(result, { taker: 0, atout: 'trefle', round: 2 });
});

test('bidding.runAuction: round2 keeps the STRONGER qualifying suit (does not overwrite with a later weaker one)', () => {
  const weak = [C('8', 'pique'), C('8', 'carreau'), C('8', 'trefle'), C('7', 'pique'), C('7', 'carreau')];
  const hands = [
    [C('V', 'pique'), C('9', 'pique'), C('9', 'trefle'), C('A', 'trefle'), C('7', 'trefle')],
    // pique strength = 6+5=11 (evaluated FIRST per SUITS order), trefle strength = 5+3+1=9 (evaluated LATER, weaker)
    weak, weak, weak,
  ];
  const result = runAuction(hands, C('7', 'coeur'), 3);
  assert.deepEqual(result, { taker: 0, atout: 'pique', round: 2 }); // must stay pique, not overwritten by weaker trefle
});

// =====================================================================================
// adapters/belote/annonces.mjs — R10/R11
// =====================================================================================

test('annonces.detectSequences: exact length boundaries — 3=tierce, 4=cinquante, 5=cent', () => {
  const tierce = detectSequences([C('7', 'coeur'), C('8', 'coeur'), C('9', 'coeur')]);
  assert.equal(tierce.length, 1);
  assert.equal(tierce[0].type, 'tierce');
  assert.equal(tierce[0].points, 20);
  assert.equal(tierce[0].len, 3);

  const cinquante = detectSequences([C('7', 'coeur'), C('8', 'coeur'), C('9', 'coeur'), C('10', 'coeur')]);
  assert.equal(cinquante.length, 1);
  assert.equal(cinquante[0].type, 'cinquante');
  assert.equal(cinquante[0].points, 50);

  const cent = detectSequences([C('7', 'coeur'), C('8', 'coeur'), C('9', 'coeur'), C('10', 'coeur'), C('V', 'coeur')]);
  assert.equal(cent.length, 1);
  assert.equal(cent[0].type, 'cent');
  assert.equal(cent[0].points, 100);
});

test('annonces.detectSequences: a gap breaks the run (non-consecutive cards do NOT merge)', () => {
  const gapped = detectSequences([C('7', 'coeur'), C('9', 'coeur'), C('R', 'coeur')]); // 7,9,R — no consecutive pair
  assert.equal(gapped.length, 0);
  // 2 consecutive pairs (7-8, then D-R) shouldn't merge across the gap into one length-4 run
  const twoPairs = detectSequences([C('7', 'coeur'), C('8', 'coeur'), C('D', 'coeur'), C('R', 'coeur')]);
  assert.equal(twoPairs.length, 0); // each pair is length 2, below the tierce minimum of 3
});

test('annonces.detectCarres: exactly 3-of-a-kind (even high-value rank) is NEVER a carré', () => {
  const threeValets = detectCarres([C('V', 'coeur'), C('V', 'pique'), C('V', 'carreau')]);
  assert.equal(threeValets.length, 0);
  const fourValets = detectCarres([C('V', 'coeur'), C('V', 'pique'), C('V', 'carreau'), C('V', 'trefle')]);
  assert.equal(fourValets.length, 1);
  assert.equal(fourValets[0].points, 200);
  // 4-of-a-kind of a ZERO-point rank is never a carré
  const fourSevens = detectCarres([C('7', 'coeur'), C('7', 'pique'), C('7', 'carreau'), C('7', 'trefle')]);
  assert.equal(fourSevens.length, 0);
});

test('annonces.detectAnnonces: isTrump flag is correctly per-suit', () => {
  const hand = [C('7', 'coeur'), C('8', 'coeur'), C('9', 'coeur')]; // trump suit
  const [trumpSeq] = detectAnnonces(hand, 'coeur');
  assert.equal(trumpSeq.isTrump, true);
  const [plainSeq] = detectAnnonces(hand, 'pique');
  assert.equal(plainSeq.isTrump, false);
});

test('annonces.compareAnnonce: exact ranking key precedence, pinned by literal value (points > carre > topRank > trump)', () => {
  // (a) points differ -> exact arithmetic difference, no fallthrough
  assert.equal(
    compareAnnonce({ kind: 'suite', points: 50, top: { rank: 'A' }, isTrump: false },
      { kind: 'suite', points: 20, top: { rank: '7' }, isTrump: false }),
    30
  );
  // (b) points equal, isCarre differs -> carre must win by exactly 1, points must NOT
  // short-circuit-return early when equal
  assert.equal(
    compareAnnonce({ kind: 'carre', points: 50, rank: '7' },
      { kind: 'suite', points: 50, top: { rank: 'A' }, isTrump: false }),
    1
  );
  // (c) points + isCarre equal (both suite), topRank differs -> exact arithmetic diff
  assert.equal(
    compareAnnonce({ kind: 'suite', points: 50, top: { rank: 'A' }, isTrump: false },
      { kind: 'suite', points: 50, top: { rank: '7' }, isTrump: false }),
    7
  );
  // (d) points + isCarre + topRank all equal, isTrump differs -> exact diff of 1
  assert.equal(
    compareAnnonce({ kind: 'suite', points: 50, top: { rank: 'A' }, isTrump: true },
      { kind: 'suite', points: 50, top: { rank: 'A' }, isTrump: false }),
    1
  );
  // (e) everything equal -> exactly 0
  assert.equal(
    compareAnnonce({ kind: 'suite', points: 50, top: { rank: 'A' }, isTrump: true },
      { kind: 'suite', points: 50, top: { rank: 'A' }, isTrump: true }),
    0
  );
  // (f) two carres, different rank -> topRank source must be `.rank`, not `.top.rank`
  // (carre objects have no `.top` — a wrong ternary branch throws instead of comparing)
  assert.equal(
    compareAnnonce({ kind: 'carre', points: 50, rank: 'A' }, { kind: 'carre', points: 50, rank: '7' }),
    7
  );
});

test('annonces.resolveAnnonces: default `declared` — each of the 4 positions independently defaults to true', () => {
  for (let p = 0; p < 4; p++) {
    const fullHands = [[], [], [], []];
    fullHands[p] = [C('7', 'coeur'), C('8', 'coeur'), C('9', 'coeur')]; // minimal tierce, nothing else in play
    // resolveAnnonces called WITHOUT the `declared` arg — relies on the default [true,true,true,true]
    const result = resolveAnnonces(fullHands, 'pique', 0);
    assert.notEqual(result.best, null, `position ${p} default declared must be true`);
    assert.equal(result.winnerTeam, teamOf(p));
  }
});

test('annonces.resolveAnnonces: no announcements anywhere -> annule stays false (not the true->false mutant)', () => {
  const result = resolveAnnonces([[], [], [], []], 'coeur', 0);
  assert.equal(result.best, null);
  assert.equal(result.winnerTeam, -1);
  assert.deepEqual(result.bonus, [0, 0]);
  assert.equal(result.annule, false);
});

test('annonces.resolveAnnonces: PARTNER tie does NOT cancel — both team members combine (no false cancellation)', () => {
  const trumpTierce = () => [C('7', 'coeur'), C('8', 'coeur'), C('9', 'coeur')]; // tierce, top=9, points=20, isTrump=true
  const fullHands = [
    trumpTierce(),  // seat0 (team0) — a tierce
    [],             // seat1 (team1) — no annonce
    trumpTierce(),  // seat2 (team0, PARTNER of seat0) — an IDENTICAL tierce (same rankKey, real tie)
    [],             // seat3 (team1) — no annonce
  ];
  const result = resolveAnnonces(fullHands, 'coeur', 0); // eldestOrder(0)=[1,2,3,0]
  assert.equal(result.annule, false);
  assert.equal(result.winnerTeam, 0);
  assert.equal(result.bonus[0], 40); // BOTH team0 members' 20pt tierces combined, not cancelled
  assert.equal(result.bonus[1], 0);
});

test('annonces.resolveAnnonces: OPPOSING team perfect tie DOES cancel everything', () => {
  const tierceA = [C('7', 'coeur'), C('8', 'coeur'), C('9', 'coeur')]; // points=20, topRank=SEQ_ORDER('9'), isTrump=false (trump='carreau')
  const tierceB = [C('7', 'pique'), C('8', 'pique'), C('9', 'pique')]; // identical rankKey to tierceA
  const fullHands = [
    tierceB, // seat0 (team0)
    tierceA, // seat1 (team1) — processed FIRST in eldest order, becomes `best`
    [],      // seat2 (team0)
    [],      // seat3 (team1)
  ];
  const result = resolveAnnonces(fullHands, 'carreau', 0); // eldestOrder(0)=[1,2,3,0]
  assert.equal(result.annule, true);
  assert.equal(result.winnerTeam, -1);
  assert.deepEqual(result.bonus, [0, 0]);
});

// =====================================================================================
// adapters/belote/game.mjs — playDeal / playGame (F10 annonces wiring, F11 crash fix)
// =====================================================================================

test('game.playDeal: redeal:true when the auction genuinely fails (real search, exact shape)', () => {
  const adapter = createBeloteAdapter();
  let found = null;
  for (let seed = 1; seed <= 500 && !found; seed++) {
    const rng = createRng(seed);
    const deck = shuffle(adapter.fullDeck(), rng);
    const d = playDeal(0, deck, adapter.rules);
    if (d.redeal) found = d;
  }
  assert.ok(found, 'expected at least one redeal within 500 seeds');
  assert.deepEqual(found, { redeal: true });
});

test('game.playDeal: annonces bonus is ADDED into score.scores (F10 wiring, additive reconciliation)', () => {
  const adapter = createBeloteAdapter();
  let taken = null;
  for (let seed = 1; seed <= 300 && !taken; seed++) {
    const rng = createRng(seed);
    const deck = shuffle(adapter.fullDeck(), rng);
    const d = playDeal(0, deck, adapter.rules);
    if (!d.redeal && d.annonces.winnerTeam !== -1) taken = d;
  }
  assert.ok(taken, 'expected at least one deal with a resolved annonce within 300 seeds');
  // Recompute the score WITHOUT the annonces addition, independently, to prove additivity.
  const baseScore = scoreDeal(taken.tricks, { trump: taken.atout, taker: taken.taker }, taken.beloteTeam, true);
  assert.equal(taken.score.scores[0], baseScore.scores[0] + taken.annonces.bonus[0]);
  assert.equal(taken.score.scores[1], baseScore.scores[1] + taken.annonces.bonus[1]);
  const winningTeam = taken.annonces.winnerTeam;
  assert.ok(taken.annonces.bonus[winningTeam] > 0);
});

test('game.playGame: default rules param no longer crashes (F11 fix) and terminates with a valid winner', () => {
  const g = playGame({ target: 301, seed: 5 }); // no 2nd arg — must default cleanly
  assert.ok(g.dealsPlayed > 0);
  assert.ok(g.winner === 0 || g.winner === 1 || g.winner === -1);
});

test('game.playGame: totals are an EXACT reconciliation of per-deal scores (not the pluseq->minuseq mutants)', () => {
  const g = playGame({ target: 301, seed: 11 });
  let expected0 = 0, expected1 = 0;
  for (const d of g.deals) { expected0 += d.score.scores[0]; expected1 += d.score.scores[1]; }
  assert.equal(g.totals[0], expected0);
  assert.equal(g.totals[1], expected1);
});

test('game.playGame: winner invariant holds (eq->neq mutant on the final ternary)', () => {
  for (const seed of [1, 5, 11, 42, 999]) {
    const g = playGame({ target: 301, seed });
    if (g.totals[0] === g.totals[1]) {
      assert.equal(g.winner, -1);
    } else if (g.totals[0] > g.totals[1]) {
      assert.equal(g.winner, 0);
    } else {
      assert.equal(g.winner, 1);
    }
  }
});

test('game.playGame: stops EARLY once target is reached (and->or mutant on the while condition)', () => {
  // With target=1 and maxDeals=50, a correct AND-guard stops after the target is hit
  // (almost certainly deal 1). A broken OR-guard would keep playing toward maxDeals.
  const g = playGame({ target: 1, seed: 42, maxDeals: 50 });
  assert.ok(g.dealsPlayed <= 3, `expected early stop near 1 deal, got dealsPlayed=${g.dealsPlayed}`);
});

test('game.playGame: redeals counter increments (not the pluseq->minuseq mutant)', () => {
  const g = playGame({ target: 1000, seed: 6, maxDeals: 200 }); // known to hit >=1 redeal
  assert.ok(g.redeals >= 1, `expected at least 1 redeal for seed=6, got ${g.redeals}`);
});

test('game.playDeal: belote (K+Q of trump) bonus IS applied (declared=true is passed, not the true->false mutant)', () => {
  const adapter = createBeloteAdapter();
  let found = null;
  for (let seed = 1; seed <= 500 && !found; seed++) {
    const rng = createRng(seed);
    const deck = shuffle(adapter.fullDeck(), rng);
    const d = playDeal(0, deck, adapter.rules);
    if (!d.redeal && d.beloteTeam !== -1) found = d;
  }
  assert.ok(found, 'expected at least one deal with belote (K+Q trump) within 500 seeds');
  assert.equal(found.score.belote[found.beloteTeam], BELOTE_BONUS);
});

test('game.playDeal: annonces bonus additivity holds for BOTH team0 AND team1 winners (both pluseq lines)', () => {
  const adapter = createBeloteAdapter();
  const wanted = { 0: null, 1: null };
  for (let seed = 1; seed <= 800 && (!wanted[0] || !wanted[1]); seed++) {
    const rng = createRng(seed);
    const deck = shuffle(adapter.fullDeck(), rng);
    const d = playDeal(0, deck, adapter.rules);
    if (!d.redeal && d.annonces.winnerTeam !== -1 && !wanted[d.annonces.winnerTeam]) {
      wanted[d.annonces.winnerTeam] = d;
    }
  }
  for (const team of [0, 1]) {
    const d = wanted[team];
    assert.ok(d, `expected a deal with team${team} winning the annonces within 800 seeds`);
    const baseScore = scoreDeal(d.tricks, { trump: d.atout, taker: d.taker }, d.beloteTeam, true);
    assert.equal(d.score.scores[team], baseScore.scores[team] + d.annonces.bonus[team]);
  }
});

// =====================================================================================
// adapters/belote/rules.mjs — remaining mutation-hardening
// =====================================================================================

test('rules.legalMoves: "must cut" uses the ACTUAL fallen trump strength, not a stray off-suit decoy', () => {
  // led=pique (off-suit, non-trump), a genuine trump (9-coeur) has already fallen.
  // Only V-coeur (the strongest trump) can overcut it; 8/A-coeur cannot.
  const hand = [C('8', 'coeur'), C('A', 'coeur'), C('V', 'coeur')];
  const trick = [{ seat: 0, card: C('7', 'pique') }, { seat: 1, card: C('9', 'coeur') }];
  assert.deepEqual(legalMoves(hand, trick, { trump: 'coeur' }, 2).map(c => c.id), ['V-coeur']);
});

test('rules.trickWinner: empty plays array throws (OR guard, second clause alone sufficient)', () => {
  assert.throws(() => trickWinner({ led: 'coeur', plays: [] }, { trump: 'coeur' }), /at least one play/);
});

test('rules.beloteHolder: a Queen alone (wrong-rank King check) must NOT qualify', () => {
  // hasK mutated (eq->neq on rank==='R'): a non-King trump card would wrongly satisfy it.
  const hand = [[C('D', 'coeur'), C('7', 'coeur')], [], [], []];
  assert.equal(beloteHolder(hand, 'coeur'), -1);
});

test('rules.beloteHolder: a King of the WRONG suit must NOT qualify (and->or on the rank+suit check)', () => {
  const hand = [[C('R', 'pique'), C('D', 'coeur')], [], [], []];
  assert.equal(beloteHolder(hand, 'coeur'), -1);
});

// =====================================================================================
// adapters/stub/minimal.mjs — R15 extensibility PROOF OF LOAD (see mutation_triage.json
// for the 6 mutants triaged as a block: this file exists solely to prove a non-Belote
// adapter with a different topology satisfies the core contracts, never played for real).
// =====================================================================================

test('stub.createStubAdapter: loads, different topology, satisfies both core contracts', () => {
  const stub = createStubAdapter();
  assert.equal(stub.name, 'stub-minimal');
  assert.equal(stub.rules.seatCount, 2); // different from Belote's 4
  assert.equal(stub.rules.trickCount, 1); // different from Belote's 8
  assert.equal(typeof stub.rules.legalMoves, 'function');
  assert.equal(typeof stub.score.scoreDeal, 'function');
  // Zero Belote constants: no suit/rank in stub's deckSpec matches Belote's 32-card set.
  assert.equal(stub.deckSpec.ranks.length, 13); // standard 52-card deck, not Belote's 8
});

// =====================================================================================
// adapters/belote/cards.mjs — guard clauses (OR, both conditions independently sufficient)
// =====================================================================================

test('cards.cardPoints / cardStrength: throw when EITHER suit or rank alone is missing', () => {
  const { cardPoints, cardStrength } = createBeloteAdapter();
  assert.throws(() => cardPoints({ rank: '7' }, 'coeur')); // suit missing only
  assert.throws(() => cardPoints({ suit: 'coeur' }, 'coeur')); // rank missing only
  assert.throws(() => cardStrength({ rank: '7' }, 'coeur'));
  assert.throws(() => cardStrength({ suit: 'coeur' }, 'coeur'));
});

// =====================================================================================
// adapters/belote/deal.mjs — deal() guard (OR, both conditions independently sufficient)
// =====================================================================================

test('deal.deal: throws on a real array of the WRONG length (not just on non-array)', () => {
  const adapter = createBeloteAdapter();
  const shortDeck = adapter.fullDeck().slice(0, 10); // IS an array, just not length 32
  assert.throws(() => deal(0, shortDeck), /32 cards/);
});

// =====================================================================================
// core/card.mjs, core/rules_interface.mjs, core/score_interface.mjs, core/trick.mjs
// =====================================================================================

test('card.makeCard: rejects non-object attrs and attrs missing `id`, with the SPECIFIC guard message', () => {
  // Message-checked (not just "something threw"): an or->and mutation on the first `||`
  // lets a non-object attrs value slip past the intended guard and crash later with a
  // DIFFERENT message (`'id' in 5` throws its own TypeError) instead of the real one.
  assert.throws(() => makeCard(5), /object with id property/); // not an object at all
  assert.throws(() => makeCard({ rank: '7', suit: 'coeur' }), /object with id property/); // object, but no `id`
  assert.deepEqual(makeCard({ id: 'x', foo: 1 }), { id: 'x', foo: 1 });
});

test('rules_interface.assertRulesAdapter: guard OR — a valid-typed but too-small seatCount alone must throw', () => {
  const shape = {
    seatCount: 1, // valid NUMBER, but < 2 — must fail the second OR clause alone
    teamOf: () => 0,
    deckSpec: {},
    legalMoves: () => [],
    compareInTrick: () => 0,
    trickWinner: () => ({ seat: 0 }),
  };
  assert.throws(() => assertRulesAdapter(shape), /seatCount/);
});

test('rules_interface.assertRulesAdapter: non-object adapter throws — the SPECIFIC guard message, not a downstream crash', () => {
  // `null` is the one falsy value where typeof===='object' too (JS quirk) — an or->and
  // mutation on line31 would let it slip past this guard and crash LATER with a
  // different message (`'x' in null` throws) rather than the intended "must be an
  // object" — asserting on the message (not just "something threw") is what kills it.
  assert.throws(() => assertRulesAdapter(null), /must be an object/);
  assert.throws(() => assertRulesAdapter(5), /must be an object/);
});

test('rules_interface.assertLegalMove: rejects a card not present in legalMoves by id', () => {
  assert.throws(() => assertLegalMove(C('7', 'pique'), [C('8', 'coeur')]));
  assert.doesNotThrow(() => assertLegalMove(C('7', 'pique'), [C('7', 'pique')]));
});

test('score_interface.assertScoreAdapter: non-object adapter throws the SPECIFIC guard message (OR guard)', () => {
  // Same JS quirk as rules_interface: null is falsy AND typeof===='object'; an or->and
  // mutation lets it slip past and crash later with a different message.
  assert.throws(() => assertScoreAdapter(null), /must be an object/);
  assert.throws(() => assertScoreAdapter(5), /must be an object/);
  assert.throws(() => assertScoreAdapter({})); // object but missing cardValue/scoreDeal
  assert.doesNotThrow(() => assertScoreAdapter({ cardValue: () => 0, scoreDeal: () => ({}) }));
});

test('trick.resolveTrick: an empty plays array throws (OR guard, second clause alone sufficient)', () => {
  assert.throws(() => resolveTrick({ led: 'coeur', plays: [] }, () => 0, {}), /at least one play/);
});

test('trick.reassignCapture: no-op fallback when the adapter provides no hook', () => {
  const result = reassignCapture({}, { seat: 2 }, undefined, {});
  assert.deepEqual(result, { seat: 2 });
});

// =====================================================================================
// core/trickplay.mjs — generic reassignCapture hook is ACTUALLY invoked when provided
// (adapter-agnostic: neither Belote nor the stub currently supply a real hook, so this
// uses a synthetic minimal rules object to prove the wiring itself, independent of any
// specific adapter).
// =====================================================================================

test('trickplay.playTricks: a real reassignCapture hook from the rules adapter is actually invoked', () => {
  const fakeRules = {
    seatCount: 2,
    trickCount: 1,
    legalMoves: (hand) => hand.slice(),
    compareInTrick: (a, b) => 0, // always "tie" -> resolveTrick keeps plays[0] (seat0) as winner
    // Deliberately FLIPS the winner, so invocation is observable.
    reassignCapture: (trick, winner, ctx) => ({ seat: 1 - winner.seat }),
  };
  const hands = [[C('7', 'pique')], [C('8', 'pique')]];
  const results = playTricks(hands, 0, fakeRules, (legal) => legal[0], {});
  // Without the hook, resolveTrick would pick seat0 (compareInTrick always ties, favors first).
  // With the hook wired correctly, the winner must be FLIPPED to seat1.
  assert.equal(results[0].winner, 1);
});

test('trickplay.playTrick: ctx.lastTrick is passed as false (not the false->true mutant) — a hook that reacts to it must see false', () => {
  const fakeRules = {
    seatCount: 2,
    legalMoves: (hand) => hand.slice(),
    compareInTrick: (a, b) => 0, // tie -> favors seat0
    // Only flips when told it's the last trick — observes the literal ctx.lastTrick value.
    reassignCapture: (trick, winner, ctx) => (ctx.lastTrick ? { seat: 1 - winner.seat } : { seat: winner.seat }),
  };
  const hands = [[C('7', 'pique')], [C('8', 'pique')]];
  const result = playTrick(hands, 0, fakeRules, (legal) => legal[0], {});
  assert.equal(result.winner, 0); // must NOT be flipped — lastTrick must be false here
});

// =====================================================================================
// harness/solver.mjs — canonical wiremap logic file (aligned s9 last pass). solveDeal
// and chooseMove are exported specifically to be exercised directly here.
// =====================================================================================

test('solver.chooseMove: guard OR — empty legal array must throw (both clauses independently sufficient)', () => {
  assert.throws(() => solverChooseMove([], [], {}, 0), /No legal moves/);
  assert.throws(() => solverChooseMove(null, [], {}, 0), /No legal moves/);
  assert.doesNotThrow(() => solverChooseMove([C('7', 'pique')], [], {}, 0));
});

test('solver.solveDeal: redeal:true when the auction genuinely fails (exact shape, not the true->false mutant)', () => {
  const adapter = createBeloteAdapter();
  let found = null;
  for (let seed = 1; seed <= 500 && !found; seed++) {
    const rng = createRng(seed);
    const deck = shuffle(adapter.fullDeck(), rng);
    const d = solveDeal(0, deck, adapter.rules);
    if (d.redeal) found = d;
  }
  assert.ok(found, 'expected at least one redeal within 500 seeds');
  assert.deepEqual(found, { redeal: true });
});

test('solver.solveDeal: belote (K+Q of trump) bonus IS applied (declared=true passed, not the true->false mutant)', () => {
  const adapter = createBeloteAdapter();
  let found = null;
  for (let seed = 1; seed <= 500 && !found; seed++) {
    const rng = createRng(seed);
    const deck = shuffle(adapter.fullDeck(), rng);
    const d = solveDeal(0, deck, adapter.rules);
    if (!d.redeal && d.beloteTeam !== -1) found = d;
  }
  assert.ok(found, 'expected at least one deal with belote within 500 seeds');
  assert.equal(found.score.belote[found.beloteTeam], BELOTE_BONUS);
});

test('solver.solveDeal: annonces bonus additivity holds for BOTH team0 AND team1 (both pluseq lines)', () => {
  const adapter = createBeloteAdapter();
  const wanted = { 0: null, 1: null };
  for (let seed = 1; seed <= 800 && (!wanted[0] || !wanted[1]); seed++) {
    const rng = createRng(seed);
    const deck = shuffle(adapter.fullDeck(), rng);
    const d = solveDeal(0, deck, adapter.rules);
    if (!d.redeal && d.annonces.winnerTeam !== -1 && !wanted[d.annonces.winnerTeam]) {
      wanted[d.annonces.winnerTeam] = d;
    }
  }
  for (const team of [0, 1]) {
    const d = wanted[team];
    assert.ok(d, `expected a deal with team${team} winning the annonces within 800 seeds`);
    const baseScore = scoreDeal(d.tricks, { trump: d.atout, taker: d.taker }, d.beloteTeam, true);
    assert.equal(d.score.scores[team], baseScore.scores[team] + d.annonces.bonus[team]);
  }
});

test('solver.runSolver: zero deals played -> both success flags stay FALSE (not the and->or vacuous-true mutant)', () => {
  const result = runSolver({ numDeals: 0, seed: 42, maxDeals: 5 });
  assert.equal(result.dealsPlayed, 0);
  assert.equal(result.allDealsReachedScore, false);
  assert.equal(result.allMovesLegal, false);
});

test('solver.runSolver: stops EXACTLY at numDeals=1 (and->or on the while guard + pluseq->minuseq on dealCount)', () => {
  const result = runSolver({ numDeals: 1, seed: 42, maxDeals: 50 });
  assert.equal(result.dealsPlayed, 1);
});

test('solver.runSolver: redealCount increments (not the pluseq->minuseq mutant)', () => {
  const result = runSolver({ numDeals: 10, seed: 6, maxDeals: 200 }); // seed=6 known to redeal
  assert.ok(result.redeals >= 1, `expected >=1 redeal for seed=6, got ${result.redeals}`);
});

test('solver.runSolver: totals are an EXACT reconciliation of per-deal scores (not the pluseq->minuseq mutants)', () => {
  const result = runSolver({ numDeals: 10, seed: 11, maxDeals: 100 });
  let expected0 = 0, expected1 = 0;
  for (const d of result.deals) { expected0 += d.score.scores[0]; expected1 += d.score.scores[1]; }
  assert.equal(result.totals[0], expected0);
  assert.equal(result.totals[1], expected1);
});

// =====================================================================================
// harness/parity.mjs — canonical wiremap logic file (aligned s9 last pass): exercised
// directly with small synthetic scenarios, independent of whether the wired [Parity]
// oracle stage (harness/run_parity.mjs) currently calls every helper.
// =====================================================================================

test('parity.normalizeGoldenResult: only normalizes a real object carrying the field; passes through otherwise', () => {
  assert.equal(normalizeGoldenResult(42, 'player'), 42); // non-object -> unchanged (typeof guard)
  assert.deepEqual(normalizeGoldenResult({}, 'player'), {}); // object but missing field -> unchanged
  assert.deepEqual(normalizeGoldenResult({ player: 2, card: {} }, 'player'), { seat: 2 }); // real normalization
});

test('parity.checkLegalParity / checkWinnerParity / checkScoreParity: return true on match (not the true->false mutants)', () => {
  assert.equal(checkLegalParity(['a', 'b'], ['b', 'a']), true);
  assert.equal(checkWinnerParity(2, 2), true);
  const score = { pointsByTeam: [1, 2], base: [1, 2], belote: [0, 0], tricksWon: [4, 4], scores: [1, 2], contractMet: true, dedans: false };
  assert.equal(checkScoreParity({ ...score }, { ...score }), true);
});

test('parity.checkScoreParity: guard OR — one non-array field alone must throw "not an array"', () => {
  const good = { pointsByTeam: [1, 2], base: [1, 2], belote: [0, 0], tricksWon: [4, 4], scores: [1, 2], contractMet: true, dedans: false };
  const badGolden = { ...good, scores: undefined }; // CE side IS an array; golden side is NOT
  assert.throws(() => checkScoreParity(good, badGolden), /not an array/);
});

test('parity.runParityCheck: a check is SKIPPED (not crashed) when only ONE side provides the field (and->or guards)', () => {
  // golden has legalMoves/trickWinner/score but ceResults has NONE of them — every
  // and-guard must correctly skip (both sides required), not half-enter and crash.
  const golden = { legalMoves: [{ id: 'a' }], trickWinner: { seat: 0 }, score: { scores: [1, 2] } };
  const result = runParityCheck(golden, {});
  assert.equal(result.passed, true);
  assert.deepEqual(result.checks, []);
  assert.deepEqual(result.errors, []);
});

test('parity.runParityCheck: R6/R7/R8 all exercised and recorded as passed:true when both sides match', () => {
  const golden = {
    legalMoves: [{ id: 'a' }, { id: 'b' }],
    trickWinner: { player: 2, card: {} },
    score: { pointsByTeam: [1, 2], base: [1, 2], belote: [0, 0], tricksWon: [4, 4], scores: [1, 2], contractMet: true, dedans: false },
  };
  const ceResults = {
    legalMoves: [{ id: 'b' }, { id: 'a' }],
    trickWinner: { seat: 2 },
    score: { ...golden.score },
  };
  const result = runParityCheck(golden, ceResults);
  assert.equal(result.passed, true);
  assert.deepEqual(result.checks, [
    { rule: 'R6', check: 'legalMoves', passed: true },
    { rule: 'R7', check: 'trickWinner', passed: true },
    { rule: 'R8', check: 'scoreDeal', passed: true },
  ]);
  assert.deepEqual(result.errors, []);
});

test('parity.runParityCheck: passed becomes false (not the eq->neq mutant) when a real mismatch is caught', () => {
  const golden = { legalMoves: [{ id: 'a' }] };
  const ceResults = { legalMoves: [{ id: 'b' }] }; // genuine mismatch
  const result = runParityCheck(golden, ceResults);
  assert.equal(result.passed, false);
  assert.equal(result.errors.length, 1);
});

// =====================================================================================
// solvability.mjs — canonical wiremap-adjacent oracle entrypoint (not itself cited by
// the wiremap, but explicitly requested by the coordinator's s9 harness-hardening pass).
// main()/checkSolver/checkPlayGame/SEEDS are exported and main() only auto-runs when
// executed directly (`node solvability.mjs`), so it is safely importable here.
// =====================================================================================

test('solvability.checkPlayGame: accepts every real winner value, INCLUDING a tie (eq->neq guard, all 3 clauses independently reachable)', () => {
  // Search real seeds for winner=0, winner=1, AND winner=-1 (tie) outcomes and confirm
  // checkPlayGame does NOT throw for any of them — an eq->neq mutation on ONE of the
  // three `===` clauses would wrongly reject the specific value it targets. winner=-1
  // (an exact tie) is rare; seed 476 is a known, verified tie at target=301.
  let foundWinner0 = null, foundWinner1 = null;
  for (let seed = 1; seed <= 200 && (!foundWinner0 || !foundWinner1); seed++) {
    if (!foundWinner0) {
      const g = playGame({ target: 301, seed });
      if (g.winner === 0) foundWinner0 = seed;
    }
    if (!foundWinner1) {
      const g = playGame({ target: 301, seed });
      if (g.winner === 1) foundWinner1 = seed;
    }
  }
  assert.ok(foundWinner0 !== null, 'expected a seed producing winner=0');
  assert.ok(foundWinner1 !== null, 'expected a seed producing winner=1');
  assert.equal(playGame({ target: 301, seed: 476 }).winner, -1, 'seed=476 must still be a tie (fixture assumption)');
  assert.doesNotThrow(() => checkPlayGame(foundWinner0));
  assert.doesNotThrow(() => checkPlayGame(foundWinner1));
  assert.doesNotThrow(() => checkPlayGame(476));
});

test('solvability: the main() entrypoint guard does NOT auto-fire on import (eq->neq/and->or on the module-scope guard)', () => {
  // Verified during the dynamic pre-stubbed import at the top of this file: if the
  // guard were mutated (either the `===` or the `&&`), main() would run EAGERLY at
  // import time (this module is imported, not executed directly), calling
  // process.exit() before any test() body ever runs — the temporary stub installed
  // above is what makes that survivable/observable instead of killing the whole suite.
  assert.equal(_solvabilityEagerExitCalls, 0);
});

test('solvability.main: totalDealsPlayed reconciles across all seeds (not the pluseq->minuseq mutant)', () => {
  // Independently compute the expected total via checkSolver (no process.exit involved).
  let expectedTotal = 0;
  for (const seed of SOLVABILITY_SEEDS) {
    expectedTotal += checkSolver(seed).dealsPlayed;
  }

  // Run main() with process.exit stubbed to RECORD (not throw/stop) — main()'s own
  // try/catch calls process.exit(0) as the very last statement in its try block, so a
  // non-throwing stub lets it fall through and return normally, which we can then assert on.
  const originalExit = process.exit;
  const originalLog = console.log;
  const lines = [];
  let recordedExitCode = null;
  process.exit = (code) => { recordedExitCode = code; };
  console.log = (...args) => { lines.push(args.join(' ')); };
  try {
    solvabilityMain();
  } finally {
    process.exit = originalExit;
    console.log = originalLog;
  }
  assert.equal(recordedExitCode, 0); // must still exit 0 — the real oracle behavior is unaffected

  const totalLine = lines.find(l => l.includes('Base invariant (162) held for all'));
  assert.ok(totalLine, 'expected the total-deals-across-seeds log line');
  const match = totalLine.match(/held for all (\d+) deals/);
  assert.ok(match, `could not parse deal count from: ${totalLine}`);
  assert.equal(Number(match[1]), expectedTotal);
});
