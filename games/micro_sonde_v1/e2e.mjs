// End-to-end browser tests
// Expected to be run by run-oracle.mjs with Playwright

export async function runE2ETests(browser, gameUrl) {
  const page = await browser.newPage();
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Navigate to game
    console.log(`\n=== E2E Tests ===`);
    console.log(`Opening ${gameUrl}...`);
    await page.goto(gameUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✓ Page loaded');

    // Test 1: Page renders game container
    const container = await page.$('#gameContainer');
    if (container) {
      testsPassed++;
      console.log('✓ Test 1: Game container exists');
    } else {
      testsFailed++;
      console.log('✗ Test 1: Game container not found');
    }

    // Test 2: Characters are rendered
    const characters = await page.$$('.character');
    if (characters.length === 3) {
      testsPassed++;
      console.log('✓ Test 2: All 3 characters rendered');
    } else {
      testsFailed++;
      console.log(`✗ Test 2: Expected 3 characters, found ${characters.length}`);
    }

    // Test 3: Locations are rendered
    const locations = await page.$$('.location');
    if (locations.length === 3) {
      testsPassed++;
      console.log('✓ Test 3: All 3 locations rendered');
    } else {
      testsFailed++;
      console.log(`✗ Test 3: Expected 3 locations, found ${locations.length}`);
    }

    // Test 4: Check window.__game is exposed
    const gameAPI = await page.evaluate(() => {
      return typeof window.__game !== 'undefined' && window.__game !== null;
    });
    if (gameAPI) {
      testsPassed++;
      console.log('✓ Test 4: window.__game API exposed');
    } else {
      testsFailed++;
      console.log('✗ Test 4: window.__game not accessible');
    }

    // Test 5: Initial state is not won
    const initialWon = await page.evaluate(() => {
      return window.__game.isWon();
    });
    if (!initialWon) {
      testsPassed++;
      console.log('✓ Test 5: Initial state is not won');
    } else {
      testsFailed++;
      console.log('✗ Test 5: Game should not start in won state');
    }

    // Test 6: Clicking character changes state
    const initialState = await page.evaluate(() => {
      return window.__game.getGameState();
    });
    await page.click('#char-alice');
    const stateAfterClick = await page.evaluate(() => {
      return window.__game.getGameState();
    });
    if (initialState !== stateAfterClick) {
      testsPassed++;
      console.log('✓ Test 6: Character click changes game state');
    } else {
      testsFailed++;
      console.log('✗ Test 6: Character click did not change state');
    }

    // Test 7: State indicator updates
    const stateInfo = await page.$('#stateInfo');
    if (stateInfo) {
      const stateText = await page.evaluate(() => document.getElementById('stateInfo').textContent);
      if (stateText && stateText.includes('alice') && stateText.includes('bob') && stateText.includes('charlie')) {
        testsPassed++;
        console.log('✓ Test 7: State indicator displays character states');
      } else {
        testsFailed++;
        console.log('✗ Test 7: State indicator missing character info');
      }
    } else {
      testsFailed++;
      console.log('✗ Test 7: State indicator element not found');
    }

    // Test 8: Clicking location changes state
    const stateBeforeLoc = await page.evaluate(() => {
      return window.__game.getGameState();
    });
    await page.click('.location.door');
    const stateAfterLoc = await page.evaluate(() => {
      return window.__game.getGameState();
    });
    if (stateBeforeLoc !== stateAfterLoc) {
      testsPassed++;
      console.log('✓ Test 8: Location click changes game state');
    } else {
      testsFailed++;
      console.log('✗ Test 8: Location click did not change state');
    }

    // Test 9: Character visual feedback on state change
    const aliceBody = await page.$('div[data-state]');
    if (aliceBody) {
      testsPassed++;
      console.log('✓ Test 9: Character has visual state attributes');
    } else {
      testsFailed++;
      console.log('✗ Test 9: Character visual state attributes missing');
    }

    // Test 10: Win condition triggers overlay
    // Reset and trigger door (which wins from initial state 0,0,0)
    await page.evaluate(() => {
      window.__game.reset();
    });

    // Click door to win
    await page.click('.location.door');
    await page.waitForTimeout(500); // Let animation play

    const winOverlay = await page.$('.win-overlay.active');
    if (winOverlay) {
      testsPassed++;
      console.log('✓ Test 10: Win overlay activates on victory');
    } else {
      testsFailed++;
      console.log('✗ Test 10: Win overlay did not activate');
    }

    // Test 11: Multiple sequential interactions
    await page.evaluate(() => {
      window.__game.reset();
    });
    const beforeInteractions = await page.evaluate(() => {
      return window.__game.getGameState();
    });

    // Perform sequence of 5 interactions
    await page.click('#char-alice');
    await page.waitForTimeout(100);
    await page.click('#char-bob');
    await page.waitForTimeout(100);
    await page.click('.location.window');
    await page.waitForTimeout(100);
    await page.click('#char-charlie');
    await page.waitForTimeout(100);
    await page.click('.location.mirror');

    const afterInteractions = await page.evaluate(() => {
      return window.__game.getGameState();
    });

    if (beforeInteractions !== afterInteractions) {
      testsPassed++;
      console.log('✓ Test 11: Sequential interactions accumulate state changes');
    } else {
      testsFailed++;
      console.log('✗ Test 11: Sequential interactions did not change state');
    }

    // Test 12: Game is responsive (elements are clickable)
    const isClickable = await page.evaluate(() => {
      const char = document.querySelector('#char-alice');
      return char && char.style.cursor === 'pointer';
    });
    if (isClickable) {
      testsPassed++;
      console.log('✓ Test 12: Characters are marked as clickable');
    } else {
      testsFailed++;
      console.log('✗ Test 12: Characters not properly marked as clickable');
    }

    // Final summary
    const totalTests = testsPassed + testsFailed;
    console.log(`\n=== E2E Results ===`);
    console.log(`Passed: ${testsPassed}/${totalTests}`);
    console.log(`Failed: ${testsFailed}/${totalTests}`);

    if (testsFailed === 0) {
      console.log('E2E verdict: PASS');
      return { success: true, passed: testsPassed, failed: testsFailed };
    } else {
      console.log('E2E verdict: FAIL');
      return { success: false, passed: testsPassed, failed: testsFailed };
    }

  } catch (error) {
    console.error('E2E test error:', error.message);
    return { success: false, error: error.message, passed: testsPassed, failed: testsFailed };
  } finally {
    await page.close();
  }
}

export default runE2ETests;
