// harness/run_parity.mjs — [Parity] stage: replays golden scenarios (derived from
// llm-lego/experiments/belote-claude, read-only source of truth) against CardEngine +
// BeloteRules and asserts identical results. FAILS HARD if goldens are missing/empty —
// never a silent green. Wired into run-oracle.mjs.
//
// Goldens live in harness/goldens/*.json (generated once from belote-claude's own test
// fixtures and real execution — see each golden's `source` field for provenance).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createBeloteAdapter } from '../adapters/belote/index.mjs';
import { deal, completeDeal } from '../adapters/belote/deal.mjs';
import { runAuction } from '../adapters/belote/bidding.mjs';
import { legalMoves, trickWinner, beloteTeam } from '../adapters/belote/rules.mjs';
import { scoreDeal } from '../adapters/belote/scoring.mjs';
import { checkLegalParity, checkWinnerParity, checkScoreParity } from './parity.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GOLDENS_DIR = path.join(__dirname, 'goldens');

function loadGolden(name, { allowObject = false } = {}) {
  const p = path.join(GOLDENS_DIR, name);
  if (!fs.existsSync(p)) {
    throw new Error(`[Parity] MISSING golden file: ${p} — cannot run parity without goldens`);
  }
  const raw = fs.readFileSync(p, 'utf-8');
  const data = JSON.parse(raw);
  if (Array.isArray(data)) {
    if (data.length === 0) {
      throw new Error(`[Parity] EMPTY golden file: ${p} — cannot pass parity vacuously`);
    }
    return data;
  }
  if (allowObject && data && typeof data === 'object' && Object.keys(data).length > 0) {
    return data;
  }
  throw new Error(`[Parity] EMPTY/INVALID golden file: ${p} — cannot pass parity vacuously`);
}

// --- CardEngine card lookup by id (rank-suit), built from CE's own fullDeck() ---
const adapter = createBeloteAdapter();
const ceDeck = adapter.fullDeck();
const byId = new Map(ceDeck.map(c => [c.id, c]));
function cardFromId(id) {
  const c = byId.get(id);
  if (!c) throw new Error(`[Parity] Unknown card id in golden: ${id}`);
  return c;
}

const failures = [];
let totalChecks = 0;

function report(category, source, ok, detail) {
  totalChecks++;
  if (!ok) {
    failures.push({ category, source, detail });
    console.error(`[Parity]   FAIL [${category}] ${source} — ${detail}`);
  }
}

// ---------------------------------------------------------------------------
// R6 — legal_moves.json
// ---------------------------------------------------------------------------
function runLegalMoves() {
  const cases = loadGolden('legal_moves.json');
  for (const c of cases) {
    const hand = c.handIds.map(cardFromId);
    const trick = c.trick.map(p => ({ seat: p.seat, card: cardFromId(p.cardId) }));
    const contract = { trump: c.atout };
    let ceIds;
    try {
      const legal = legalMoves(hand, trick, contract, c.mover);
      ceIds = legal.map(x => x.id).sort();
      checkLegalParity(ceIds, c.expectedLegalIds);
      report('legalMoves', c.source, true);
    } catch (err) {
      report('legalMoves', c.source, false, `${err.message} (CE=${JSON.stringify(ceIds)} golden=${JSON.stringify(c.expectedLegalIds)})`);
    }
  }
  return cases.length;
}

// ---------------------------------------------------------------------------
// R7 — trick_winner.json
// ---------------------------------------------------------------------------
function runTrickWinner() {
  const cases = loadGolden('trick_winner.json');
  for (const c of cases) {
    const plays = c.trick.map(p => ({ seat: p.seat, card: cardFromId(p.cardId) }));
    const contract = { trump: c.atout };
    try {
      const trickObj = { led: plays[0].card.suit, plays };
      const w = trickWinner(trickObj, contract);
      checkWinnerParity(w.seat, c.expectedWinnerSeat);
      report('trickWinner', c.source, true);
    } catch (err) {
      report('trickWinner', c.source, false, err.message);
    }
  }
  return cases.length;
}

// ---------------------------------------------------------------------------
// R8/R9/R12 — score_deal.json
// ---------------------------------------------------------------------------
function runScoreDeal() {
  const cases = loadGolden('score_deal.json');
  for (const c of cases) {
    const tricks = c.tricks.map(t => ({ winner: t.winner, cards: t.cardIds.map(cardFromId) }));
    const contract = { trump: c.atout, taker: c.taker };
    try {
      const ceScore = scoreDeal(tricks, contract, c.beloteTeamIdx, c.beloteDeclared);
      const normalizedGolden = {
        pointsByTeam: c.expected.cardPoints,
        base: c.expected.base,
        belote: c.expected.belote,
        tricksWon: c.expected.tricksWon,
        scores: c.expected.scores,
        contractMet: c.expected.success,
        dedans: c.expected.dedans,
      };
      checkScoreParity(ceScore, normalizedGolden);
      if (ceScore.capot !== c.expected.capot || ceScore.capotTeam !== c.expected.capotTeam) {
        throw new Error(`capot mismatch: CE(${ceScore.capot},${ceScore.capotTeam}) vs golden(${c.expected.capot},${c.expected.capotTeam})`);
      }
      report('scoreDeal', c.source, true);
    } catch (err) {
      report('scoreDeal', c.source, false, err.message);
    }
  }
  return cases.length;
}

// ---------------------------------------------------------------------------
// R4/R5/R13 — deal_trajectory.json (one full deal, replayed move-by-move)
// Hands are injected via the adapter's EXISTING deal(dealer, deck) entry point
// (already accepts an explicit deck array) — no core/adapter change was needed.
// ---------------------------------------------------------------------------
function runDealTrajectory() {
  const g = loadGolden('deal_trajectory.json', { allowObject: true });
  const source = g.source;

  try {
    const ceCardDeck = g.deckIds.map(cardFromId);

    // Step 1: deal()
    const { hands, turnUp, talon } = deal(g.dealer, ceCardDeck);
    const handsIds = hands.map(h => h.map(c => c.id));
    if (JSON.stringify(handsIds) !== JSON.stringify(g.initialHandsIds)) {
      throw new Error(`deal() hands mismatch: CE=${JSON.stringify(handsIds)} golden=${JSON.stringify(g.initialHandsIds)}`);
    }
    if (turnUp.id !== g.turnUpId) {
      throw new Error(`deal() turnUp mismatch: CE=${turnUp.id} golden=${g.turnUpId}`);
    }
    const talonIds = talon.map(c => c.id);
    if (JSON.stringify(talonIds) !== JSON.stringify(g.talonIds)) {
      throw new Error(`deal() talon mismatch`);
    }
    report('dealTrajectory:deal', source, true);

    // Step 2: runAuction()
    const bid = runAuction(hands, turnUp, g.dealer);
    if (!bid || bid.taker !== g.bid.taker || bid.atout !== g.bid.atout || bid.round !== g.bid.round) {
      throw new Error(`runAuction() mismatch: CE=${JSON.stringify(bid)} golden=${JSON.stringify(g.bid)}`);
    }
    report('dealTrajectory:runAuction', source, true);

    // Step 3: completeDeal()
    const fullHands = completeDeal(hands, bid.taker, turnUp, talon, g.dealer);
    const fullHandsIds = fullHands.map(h => h.map(c => c.id));
    if (JSON.stringify(fullHandsIds) !== JSON.stringify(g.fullHandsIds)) {
      throw new Error(`completeDeal() mismatch: CE=${JSON.stringify(fullHandsIds)} golden=${JSON.stringify(g.fullHandsIds)}`);
    }
    report('dealTrajectory:completeDeal', source, true);

    // Step 4: beloteTeam()
    const bTeam = beloteTeam(fullHands, bid.atout);
    if (bTeam !== g.beloteTeamIdx) {
      throw new Error(`beloteTeam() mismatch: CE=${bTeam} golden=${g.beloteTeamIdx}`);
    }
    report('dealTrajectory:beloteTeam', source, true);

    // Step 5: replay each recorded trick move-by-move — legality + winner
    const playHands = fullHands.map(h => h.slice());
    const contract = { trump: bid.atout, taker: bid.taker };
    for (let ti = 0; ti < g.tricks.length; ti++) {
      const t = g.tricks[ti];
      const trick = [];
      for (const play of t.plays) {
        const seat = play.seat;
        const hand = playHands[seat];
        const legal = legalMoves(hand, trick, contract, seat);
        const chosen = cardFromId(play.cardId);
        if (!legal.some(c => c.id === chosen.id)) {
          throw new Error(`trick#${ti} seat ${seat}: recorded move ${chosen.id} is ILLEGAL per CE.legalMoves (${JSON.stringify(legal.map(c => c.id))})`);
        }
        trick.push({ seat, card: chosen });
        const idx = hand.findIndex(c => c.id === chosen.id);
        hand.splice(idx, 1);
      }
      const winnerObj = trickWinner({ led: trick[0].card.suit, plays: trick }, contract);
      if (winnerObj.seat !== t.winner) {
        throw new Error(`trick#${ti} winner mismatch: CE=${winnerObj.seat} golden=${t.winner}`);
      }
    }
    report('dealTrajectory:tricksReplay', source, true);

    // Step 6: scoreDeal() on the recorded trajectory
    const scoringTricks = g.tricks.map(t => ({
      winner: t.winner,
      cards: t.plays.map(p => cardFromId(p.cardId)),
    }));
    const ceScore = scoreDeal(scoringTricks, contract, bTeam, true);
    const normalizedGolden = {
      pointsByTeam: undefined, // deal_trajectory golden does not record raw cardPoints — skip that leg
      base: g.expectedScore.base,
      belote: g.expectedScore.belote,
      tricksWon: g.expectedScore.tricksWon,
      scores: g.expectedScore.scores,
      contractMet: g.expectedScore.success,
      dedans: g.expectedScore.dedans,
    };
    for (const field of ['base', 'belote', 'tricksWon', 'scores']) {
      if (JSON.stringify(ceScore[field]) !== JSON.stringify(normalizedGolden[field])) {
        throw new Error(`scoreDeal() field ${field} mismatch: CE=${JSON.stringify(ceScore[field])} golden=${JSON.stringify(normalizedGolden[field])}`);
      }
    }
    if (ceScore.contractMet !== normalizedGolden.contractMet || ceScore.dedans !== normalizedGolden.dedans) {
      throw new Error(`scoreDeal() contractMet/dedans mismatch`);
    }
    report('dealTrajectory:scoreDeal', source, true);
  } catch (err) {
    report('dealTrajectory', source, false, err.message);
  }

  return 1; // one trajectory golden
}

// ---------------------------------------------------------------------------
async function main() {
  console.log('[Parity] === Replaying golden scenarios (belote-claude source of truth) ===');

  const counts = {};
  counts.legalMoves = runLegalMoves();
  counts.trickWinner = runTrickWinner();
  counts.scoreDeal = runScoreDeal();
  counts.dealTrajectory = runDealTrajectory();

  const totalGoldens = counts.legalMoves + counts.trickWinner + counts.scoreDeal + counts.dealTrajectory;
  console.log(`[Parity] goldens: legalMoves=${counts.legalMoves} trickWinner=${counts.trickWinner} scoreDeal=${counts.scoreDeal} dealTrajectory=${counts.dealTrajectory} (total=${totalGoldens})`);
  console.log(`[Parity] checks: ${totalChecks} run, ${failures.length} failed`);

  if (failures.length > 0) {
    console.error('[Parity] ✗ FAILED');
    for (const f of failures) {
      console.error(`  - [${f.category}] ${f.source}: ${f.detail}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('[Parity] ✓ ALL GOLDENS PASSED');
  process.exitCode = 0;
}

main();
