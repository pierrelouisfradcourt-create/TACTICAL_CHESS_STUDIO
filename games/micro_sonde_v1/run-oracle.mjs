#!/usr/bin/env node
// Micro Sonde V1 — Master Oracle
// Runs: (1) logic tests, (2) property tests, (3) solvability, (4) e2e browser tests
// Exit code 0 ONLY if ALL volets pass
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import playwright from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Simple HTTP server for E2E tests
function startHttpServer(port = 8888) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // Default to index.html
      let filePath = req.url === '/' ? '/index.html' : req.url;
      filePath = path.join(__dirname, filePath);

      // Security: prevent directory traversal
      const realPath = path.resolve(filePath);
      if (!realPath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      // Serve file
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        const mimeTypes = {
          '.html': 'text/html',
          '.mjs': 'application/javascript',
          '.js': 'application/javascript',
          '.json': 'application/json',
          '.css': 'text/css'
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    server.listen(port, () => {
      console.log(`[Server] HTTP server running on http://localhost:${port}`);
      resolve(server);
    });

    server.on('error', reject);
  });
}

// Run a command/file
function runCommand(label, file, extraEnv = {}) {
  return new Promise((resolvePromise) => {
    const chunks = [];
    const proc = spawn(process.execPath, [file], {
      cwd: __dirname,
      env: { ...process.env, ...extraEnv },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    proc.stdout.on('data', (d) => {
      chunks.push(d);
      process.stdout.write(d);
    });

    proc.stderr.on('data', (d) => {
      chunks.push(d);
      process.stderr.write(d);
    });

    proc.on('error', (err) => {
      resolvePromise({
        label,
        ok: false,
        code: -1,
        output: String(err),
        launchFailure: true
      });
    });

    proc.on('exit', (code) => {
      resolvePromise({
        label,
        ok: code === 0,
        code,
        output: chunks.map(String).join('')
      });
    });
  });
}

// Main oracle runner
async function main() {
  console.log('=== ORACLE Micro Sonde V1 ===\n');

  const results = {
    logic: null,
    properties: null,
    solvability: null,
    e2e: null
  };

  try {
    // (a) Logic tests
    console.log('--- (a) Logic tests: node --test logic.test.mjs ---');
    results.logic = await runCommand('logic tests', 'logic.test.mjs');
    console.log(`[logic tests] exit code = ${results.logic.code}\n`);

    if (!results.logic.ok) {
      console.error('✗ Logic tests FAILED');
      process.exit(1);
    }

    // (b) Property tests
    console.log('--- (b) Property tests: node --test properties.test.mjs ---');
    results.properties = await runCommand('property tests', 'properties.test.mjs');
    console.log(`[property tests] exit code = ${results.properties.code}\n`);

    if (!results.properties.ok) {
      console.error('✗ Property tests FAILED');
      process.exit(1);
    }

    // (c) Solvability tests
    console.log('--- (c) Solvability: solvability.mjs ---');
    results.solvability = await runCommand('solvability', 'solvability.mjs');
    console.log(`[solvability] exit code = ${results.solvability.code}\n`);

    if (!results.solvability.ok) {
      console.error('✗ Solvability tests FAILED');
      process.exit(1);
    }

    // (d) E2E tests with browser
    console.log('--- (d) E2E Playwright tests ---');
    const server = await startHttpServer(8888);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for server to start

    try {
      const browser = await playwright.chromium.launch({ headless: true });
      console.log('[E2E] Browser launched');

      const e2eResult = await runE2ETests(browser);
      await browser.close();

      results.e2e = {
        label: 'e2e tests',
        ok: e2eResult.success,
        code: e2eResult.success ? 0 : 1,
        passed: e2eResult.passed,
        failed: e2eResult.failed
      };

      console.log(`[e2e] exit code = ${results.e2e.code}\n`);
    } catch (e2eError) {
      console.error('[E2E] Error running browser tests:', e2eError.message);
      results.e2e = {
        label: 'e2e tests',
        ok: false,
        code: 1,
        error: e2eError.message
      };
    } finally {
      server.close();
      console.log('[Server] HTTP server stopped');
    }

    if (!results.e2e.ok) {
      console.error('✗ E2E tests FAILED');
      process.exit(1);
    }

    // Summary
    console.log('=== RÉSUMÉ ORACLE ===');
    console.log(`Logic tests     : ${results.logic.ok ? 'PASS' : 'FAIL'} (code ${results.logic.code})`);
    console.log(`Property tests  : ${results.properties.ok ? 'PASS' : 'FAIL'} (code ${results.properties.code})`);
    console.log(`Solvability     : ${results.solvability.ok ? 'PASS' : 'FAIL'} (code ${results.solvability.code})`);
    console.log(`E2E tests       : ${results.e2e.ok ? 'PASS' : 'FAIL'} (code ${results.e2e.code})`);
    console.log(`\nVERDICT ORACLE: PASS`);

    process.exit(0);
  } catch (err) {
    console.error('✗ Unexpected oracle error:', err);
    process.exit(1);
  }
}

// E2E test runner
async function runE2ETests(browser) {
  const page = await browser.newPage();
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    const gameUrl = 'http://localhost:8888/';
    console.log(`[E2E] Opening ${gameUrl}`);
    await page.goto(gameUrl, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('[E2E] ✓ Page loaded');

    // Test 1: Game container
    const container = await page.$('#gameContainer');
    if (container) {
      testsPassed++;
      console.log('[E2E] ✓ Game container exists');
    } else {
      testsFailed++;
      console.log('[E2E] ✗ Game container not found');
    }

    // Test 2: Characters
    const characters = await page.$$('.character');
    if (characters.length === 3) {
      testsPassed++;
      console.log('[E2E] ✓ 3 characters rendered');
    } else {
      testsFailed++;
      console.log(`[E2E] ✗ Expected 3 characters, found ${characters.length}`);
    }

    // Test 3: Locations
    const locations = await page.$$('.location');
    if (locations.length === 3) {
      testsPassed++;
      console.log('[E2E] ✓ 3 locations rendered');
    } else {
      testsFailed++;
      console.log(`[E2E] ✗ Expected 3 locations, found ${locations.length}`);
    }

    // Test 4: Game API exposed
    const gameAPI = await page.evaluate(() => typeof window.__game !== 'undefined');
    if (gameAPI) {
      testsPassed++;
      console.log('[E2E] ✓ window.__game API exposed');
    } else {
      testsFailed++;
      console.log('[E2E] ✗ window.__game not accessible');
    }

    // Test 5: Initial state not won
    const initialWon = await page.evaluate(() => window.__game.isWon());
    if (!initialWon) {
      testsPassed++;
      console.log('[E2E] ✓ Initial state not won');
    } else {
      testsFailed++;
      console.log('[E2E] ✗ Should not start in won state');
    }

    // Test 6: Character click changes state
    const beforeClick = await page.evaluate(() => window.__game.getGameState());
    await page.click('#char-alice');
    const afterClick = await page.evaluate(() => window.__game.getGameState());
    if (beforeClick !== afterClick) {
      testsPassed++;
      console.log('[E2E] ✓ Character click changes state');
    } else {
      testsFailed++;
      console.log('[E2E] ✗ Character click did not change state');
    }

    // Test 7: Location click changes state
    const beforeLoc = await page.evaluate(() => window.__game.getGameState());
    await page.click('.location.door');
    const afterLoc = await page.evaluate(() => window.__game.getGameState());
    if (beforeLoc !== afterLoc) {
      testsPassed++;
      console.log('[E2E] ✓ Location click changes state');
    } else {
      testsFailed++;
      console.log('[E2E] ✗ Location click did not change state');
    }

    // Test 8: Win condition works
    const resetResult = await page.evaluate(() => {
      window.__game.reset();
      return window.__game.getGameState();
    });
    console.log(`[E2E] After reset: ${resetResult}`);
    await page.waitForTimeout(200);

    // Use direct API to trigger door
    const doorResult = await page.evaluate(() => {
      window.__game.clickLocation('door');
      return {
        state: window.__game.getGameState(),
        won: window.__game.isWon(),
        allCharStates: window.__game.getAllCharacterStates()
      };
    });
    console.log(`[E2E] After door: state=${doorResult.state}, won=${doorResult.won}, chars=${JSON.stringify(doorResult.allCharStates)}`);
    await page.waitForTimeout(500);

    if (doorResult.won) {
      testsPassed++;
      console.log('[E2E] ✓ Win condition triggers');
    } else {
      testsFailed++;
      console.log('[E2E] ✗ Win condition did not trigger');
    }

    // Test 9: Sequential interactions accumulate
    const test9Reset = await page.evaluate(() => {
      window.__game.reset();
      return window.__game.getGameState();
    });
    await page.waitForTimeout(200);

    const test9Result = await page.evaluate(() => {
      window.__game.clickCharacter('alice');
      window.__game.clickCharacter('bob');
      window.__game.clickLocation('window');
      return window.__game.getGameState();
    });

    if (test9Reset !== test9Result) {
      testsPassed++;
      console.log('[E2E] ✓ Sequential interactions work');
    } else {
      testsFailed++;
      console.log(`[E2E] ✗ Sequential interactions had no effect (was: ${test9Reset}, now: ${test9Result})`);
    }

    // Test 10: State indicator updates
    const stateInfo = await page.$('#stateInfo');
    if (stateInfo) {
      const text = await page.evaluate(() => document.getElementById('stateInfo').textContent);
      if (text && text.includes('alice') && text.includes('bob')) {
        testsPassed++;
        console.log('[E2E] ✓ State indicator displays info');
      } else {
        testsFailed++;
        console.log('[E2E] ✗ State indicator missing info');
      }
    }

    console.log(`\n[E2E] Results: ${testsPassed} passed, ${testsFailed} failed`);
    return {
      success: testsFailed === 0,
      passed: testsPassed,
      failed: testsFailed
    };
  } catch (error) {
    console.error('[E2E] Error:', error.message);
    return { success: false, error: error.message, passed: testsPassed, failed: testsFailed };
  } finally {
    await page.close();
  }
}

main();
