#!/usr/bin/env node
// SUPERSEDED — the real end-to-end proof now lives at the game root (../e2e.mjs),
// where scripts/forge/static_oracles.check_e2e_harness expects it and where
// run-oracle.mjs invokes it.
//
// This file is kept as a delegating shim, not deleted, so that anything still
// calling `node proofs/e2e.mjs` runs the REAL browser click-through instead of
// the silent pass this file used to be: it defined `runE2ETest()` and never
// called it, and launched Chromium without --allow-file-access-from-files (which
// Chromium requires to load `<script type="module">` from a file:// origin), so
// the E2E gate reported PASS without ever opening the page.
//
// Importing ../e2e.mjs executes it: it drives the run and sets process.exitCode.
import '../e2e.mjs';
