// Property-based tests for game invariants
import { strict as assert } from 'assert';

class SeededRandom {
  constructor(seed) {
    this.seed = seed >>> 0;
  }
  next() {
    this.seed = (this.seed * 9301 + 49297) >>> 0;
    return (this.seed / 0x100000000) >>> 0;
  }
  rand() {
    return this.next() / 0x100000000;
  }
}

class GameState {
  constructor(seed = 12345) {
    this.seed = seed;
    this.rng = new SeededRandom(seed);
    this.characters = [
      { id: 'alice', name: 'Alice', state: 0 },
      { id: 'bob', name: 'Bob', state: 0 },
      { id: 'charlie', name: 'Charlie', state: 0 }
    ];
    this.locations = [
      { id: 'door', name: 'Door' },
      { id: 'window', name: 'Window' },
      { id: 'mirror', name: 'Mirror' }
    ];
    this.winState = false;
    this.actionCount = 0;
  }

  cycleCharacter(charId) {
    const char = this.characters.find(c => c.id === charId);
    if (char) {
      char.state = (char.state + 1) % 3;
      this.actionCount++;
      this.checkWinCondition();
    }
  }

  activateLocation(locationId) {
    this.actionCount++;
    switch (locationId) {
      case 'door':
        this.characters.forEach(char => {
          char.state = (char.state + 1) % 3;
        });
        break;
      case 'window':
        this.characters[0].state = (this.characters[0].state + 1) % 3;
        this.characters[1].state = (this.characters[1].state + 2) % 3;
        break;
      case 'mirror':
        this.characters[1].state = (this.characters[1].state + 1) % 3;
        this.characters[2].state = (this.characters[2].state + 1) % 3;
        break;
    }
    this.checkWinCondition();
  }

  checkWinCondition() {
    const state0 = this.characters[0].state;
    const state1 = this.characters[1].state;
    const state2 = this.characters[2].state;
    this.winState = (state0 === state1) && (state1 === state2);
    return this.winState;
  }

  isWon() {
    return this.winState;
  }

  getAllCharacterStates() {
    return this.characters.map(c => c.state);
  }
}

console.log('Testing game properties...');

// Property 1: All character states are always in range [0, 2]
function propertyStateInRange() {
  for (let seed = 1; seed <= 10; seed++) {
    const game = new GameState(seed);
    for (let i = 0; i < 20; i++) {
      const action = i % 5;
      if (action === 0) game.cycleCharacter('alice');
      else if (action === 1) game.cycleCharacter('bob');
      else if (action === 2) game.cycleCharacter('charlie');
      else if (action === 3) game.activateLocation(['door', 'window', 'mirror'][Math.floor(Math.random() * 3)]);
      else game.activateLocation('door');

      const states = game.getAllCharacterStates();
      assert.strictEqual(states.every(s => s >= 0 && s <= 2), true, `All states should be in [0,2], got ${states}`);
    }
  }
}

propertyStateInRange();
console.log('✓ Property 1: All states always in range [0, 2]');

// Property 2: Win condition is consistent (all same)
function propertyWinConsistency() {
  for (let seed = 1; seed <= 10; seed++) {
    const game = new GameState(seed);
    const states = game.getAllCharacterStates();
    const allSame = states.every(s => s === states[0]);
    game.checkWinCondition(); // Ensure win condition is evaluated
    assert.strictEqual(game.isWon(), allSame, 'Win state should match if all states are equal');
  }
}

propertyWinConsistency();
console.log('✓ Property 2: Win condition is consistent');

// Property 3: Action count increments with each action
function propertyActionCountIncrement() {
  const game = new GameState();
  let prevCount = 0;
  for (let i = 0; i < 10; i++) {
    const count = game.actionCount;
    assert.strictEqual(count, prevCount, 'Action count should not change without action');
    if (i % 3 === 0) {
      game.cycleCharacter('alice');
      prevCount++;
      assert.strictEqual(game.actionCount, prevCount, 'Action count should increment');
    } else if (i % 3 === 1) {
      game.activateLocation('door');
      prevCount++;
      assert.strictEqual(game.actionCount, prevCount, 'Action count should increment');
    }
  }
}

propertyActionCountIncrement();
console.log('✓ Property 3: Action count increments correctly');

// Property 4: Cycling character state 3 times returns to original
function propertyCharacterCycleThreeReturns() {
  const game = new GameState();
  const charId = 'alice';

  // Record initial
  let count = 0;
  for (let i = 0; i < 3; i++) {
    game.cycleCharacter(charId);
    count++;
  }

  const charObj = game.characters.find(c => c.id === charId);
  assert.strictEqual(charObj.state, 0, 'After 3 cycles, should return to state 0');
  assert.strictEqual(game.actionCount, 3, 'Action count should be 3');
}

propertyCharacterCycleThreeReturns();
console.log('✓ Property 4: Cycling 3x returns to original');

// Property 5: Door location affects all 3 characters
function propertyDoorAffectsAll() {
  const game = new GameState();
  const beforeStates = game.getAllCharacterStates();
  game.activateLocation('door');
  const afterStates = game.getAllCharacterStates();

  const allChanged = beforeStates.every((s, i) => {
    const expectedAfter = (s + 1) % 3;
    return afterStates[i] === expectedAfter;
  });
  assert.strictEqual(allChanged, true, 'Door should increment all characters by 1');
}

propertyDoorAffectsAll();
console.log('✓ Property 5: Door affects all characters');

// Property 6: Mirror affects exactly Bob and Charlie
function propertyMirrorAffectsTwoCharacters() {
  const game = new GameState();
  const beforeStates = game.getAllCharacterStates();
  game.activateLocation('mirror');
  const afterStates = game.getAllCharacterStates();

  assert.strictEqual(afterStates[0], beforeStates[0], 'Alice unchanged by mirror');
  assert.strictEqual(afterStates[1], (beforeStates[1] + 1) % 3, 'Bob incremented by 1');
  assert.strictEqual(afterStates[2], (beforeStates[2] + 1) % 3, 'Charlie incremented by 1');
}

propertyMirrorAffectsTwoCharacters();
console.log('✓ Property 6: Mirror affects Bob and Charlie only');

// Property 7: Win is reachable (door action from start wins)
function propertyWinReachable() {
  const game = new GameState();
  assert.strictEqual(game.isWon(), false, 'Should not start in win state');
  game.activateLocation('door');
  assert.strictEqual(game.isWon(), true, 'Should be winnable via door');
}

propertyWinReachable();
console.log('✓ Property 7: Win state is reachable');

// Property 8: Seeded games are deterministic
function propertyDeterminism() {
  const actions = [
    { type: 'cycle', target: 'alice' },
    { type: 'location', target: 'door' },
    { type: 'cycle', target: 'bob' },
    { type: 'location', target: 'window' },
    { type: 'cycle', target: 'charlie' }
  ];

  const game1 = new GameState(999);
  actions.forEach(a => {
    if (a.type === 'cycle') game1.cycleCharacter(a.target);
    else game1.activateLocation(a.target);
  });
  const final1 = game1.getAllCharacterStates();

  const game2 = new GameState(999);
  actions.forEach(a => {
    if (a.type === 'cycle') game2.cycleCharacter(a.target);
    else game2.activateLocation(a.target);
  });
  const final2 = game2.getAllCharacterStates();

  assert.deepStrictEqual(final1, final2, 'Same seed should produce identical results');
}

propertyDeterminism();
console.log('✓ Property 8: Seeded determinism holds');

console.log('\nAll property tests passed!');
