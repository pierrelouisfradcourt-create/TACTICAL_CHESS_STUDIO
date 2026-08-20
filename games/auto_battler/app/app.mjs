// app/app.mjs - Browser composition root, and the ONLY module allowed to see `window`
// (blueprint.yaml: "C'est le seul endroit où le mot « window » et une règle de rendu se
// croisent"). Reads the seed from the URL, starts the game via round/, exposes the state on
// window.__game for the sensor (R10), drives the animation/timer clock, wires input/, and
// calls renderer/ with ONLY the Event Log — never with the GameState itself.
// Contains no game rule, builds no Input, draws nothing itself.
//
// D4 — THE LOOP IS CLOSED HERE. app/ owns the wall clock, so it owns the three moments the loop
// needs, and none of them is a game rule:
//   1. Preparation -> Battle : the moment the phase changes (ConfirmPreparation, button or
//      timer), ask round/ to resolve the battle and APPEND its Event segment to the journal.
//      The whole combat is computed at once — it is a pure function (CBT-1) — and then WATCHED.
//   2. during the Battle : the frame counter, restarted at the phase change, is what the blind
//      renderer replays the segment against. The real time a Tick takes is a Renderer choice
//      (ratified verbatim, VALUES_V0), so app/ reads it back from renderer/combatPlaybackMs.
//   3. Battle -> next Round : once the playback (result screen included) is over, ask round/ to
//      open the next Round — income credited, new shop drawn, chronometer restarted.

import * as round from '../round/round.mjs';
import { attachInput } from '../input/input.mjs';
import { render, combatPlaybackMs } from '../renderer/renderer.mjs';

const DEFAULT_SEED = 20260719; // deterministic fallback when ?seed= is absent from the URL
const SEAT_ID = 'player_0';

function readSeed() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('seed');
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : DEFAULT_SEED;
}

function boot() {
  const seed = readSeed();

  // R13: the game must be able to start. newGame() alone is an impasse (gold 0, empty shop);
  // startRound() is what credits Income and draws the opening Shop (05_ECONOMY_BIBLE.md
  // ordering: Income -> Shop draw -> Preparation State).
  let state = round.newGame(seed, [SEAT_ID]);
  state = round.startRound(state);

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');

  // R10: state accessible in global for the deterministic sensor.
  window.__game = {
    getState: () => state,
    seed
  };

  const bootMs = performance.now();

  const { tick } = attachInput(
    document,
    canvas,
    () => state,
    (next) => { state = next; },
    bootMs
  );

  // The frame counter is relative to the CURRENT phase window, not to boot: one counter drives
  // both the preparation chronometer and the combat playback, and both restart cleanly every
  // round. Restarting it is what makes round 2 playable at all — a counter anchored at boot
  // would leave the 30 s timer permanently expired from round 2 onwards.
  let phaseAnchorMs = bootMs;
  let observedPhase = state.phase;
  let battleResolved = false;

  function frame() {
    const nowMs = performance.now();

    if (state.phase !== observedPhase) {
      observedPhase = state.phase;
      phaseAnchorMs = nowMs;
    }

    // (1) Entering the Battle: write the combat segment into the journal, then start its clock.
    if (state.phase === 'Battle' && !battleResolved) {
      state = round.resolveBattle(state, SEAT_ID);
      battleResolved = true;
      phaseAnchorMs = nowMs;
    }

    const frameCounter = Math.round(nowMs - phaseAnchorMs); // injected into renderer/ — see R2

    // (3) Playback over (combat + result screen): open the next Round — OR end the game.
    // E1: round.startNextRound refuses to open a Round when the Seat's Life hit the floor and
    // returns a state in phase 'Elimination' instead. app/ decides nothing here: it asks, and
    // the rule answers. The loop keeps running (the screen must stay drawn) but every branch
    // above is now inert, and input/ ignores a phase that is not 'Preparation'.
    if (state.phase === 'Battle' && battleResolved && frameCounter >= combatPlaybackMs(state.eventLog)) {
      state = round.startNextRound(state);
      battleResolved = false;
      observedPhase = state.phase;
      phaseAnchorMs = nowMs;
      render(document, ctx, state.eventLog, 0);
      requestAnimationFrame(frame);
      return;
    }

    tick(nowMs); // self-guarded: the preparation timer only ever fires during 'Preparation'
    render(document, ctx, state.eventLog, frameCounter);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
