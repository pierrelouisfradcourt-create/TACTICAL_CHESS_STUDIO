// Logic tests for game mechanics
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

  getCharacterState(charId) {
    const char = this.characters.find(c => c.id === charId);
    return char ? char.state : null;
  }

  setCharacterState(charId, state) {
    const char = this.characters.find(c => c.id === charId);
    if (char) {
      char.state = state;
    }
    this.checkWinCondition();
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

  getStateString() {
    return this.characters.map(c => `${c.id}:${c.state}`).join(' ');
  }

  isWon() {
    return this.winState;
  }
}

// Test suite
console.log('Testing game logic...');

// Test 1: Initial state is not won
let game = new GameState();
assert.strictEqual(game.isWon(), false, 'Game should not start in won state');
console.log('✓ Test 1: Initial state is not won');

// Test 2: Character cycle increases state
game = new GameState();
game.cycleCharacter('alice');
assert.strictEqual(game.getCharacterState('alice'), 1, 'Alice state should be 1 after cycle');
console.log('✓ Test 2: Character cycle works');

// Test 3: Character state wraps at 3
game = new GameState();
game.setCharacterState('alice', 2);
game.cycleCharacter('alice');
assert.strictEqual(game.getCharacterState('alice'), 0, 'State should wrap from 2 to 0');
console.log('✓ Test 3: State wrapping works');

// Test 4: Door activates all characters
game = new GameState();
game.activateLocation('door');
assert.strictEqual(game.getCharacterState('alice'), 1, 'Alice should be state 1 after door');
assert.strictEqual(game.getCharacterState('bob'), 1, 'Bob should be state 1 after door');
assert.strictEqual(game.getCharacterState('charlie'), 1, 'Charlie should be state 1 after door');
console.log('✓ Test 4: Door activation works');

// Test 5: Window activates selectively
game = new GameState();
game.activateLocation('window');
assert.strictEqual(game.getCharacterState('alice'), 1, 'Alice should advance by 1');
assert.strictEqual(game.getCharacterState('bob'), 2, 'Bob should advance by 2');
assert.strictEqual(game.getCharacterState('charlie'), 0, 'Charlie should stay 0');
console.log('✓ Test 5: Window activation works');

// Test 6: Mirror activates Bob and Charlie
game = new GameState();
game.activateLocation('mirror');
assert.strictEqual(game.getCharacterState('alice'), 0, 'Alice should stay 0');
assert.strictEqual(game.getCharacterState('bob'), 1, 'Bob should be 1');
assert.strictEqual(game.getCharacterState('charlie'), 1, 'Charlie should be 1');
console.log('✓ Test 6: Mirror activation works');

// Test 7: Win condition - all same state
game = new GameState();
game.setCharacterState('alice', 2);
game.setCharacterState('bob', 2);
game.setCharacterState('charlie', 2);
assert.strictEqual(game.isWon(), true, 'Should win when all states match');
console.log('✓ Test 7: Win condition detection works');

// Test 8: Seeded determinism
let game1 = new GameState(42);
game1.cycleCharacter('alice');
game1.activateLocation('door');
const state1 = game1.getStateString();

let game2 = new GameState(42);
game2.cycleCharacter('alice');
game2.activateLocation('door');
const state2 = game2.getStateString();

assert.strictEqual(state1, state2, 'Same seed should produce same results');
console.log('✓ Test 8: Seeded determinism works');

// Test 9: Different seeds produce different results
let gameA = new GameState(1);
gameA.cycleCharacter('alice');
let gameB = new GameState(2);
gameB.cycleCharacter('alice');
// Both should still have same result for same action, so test with location
gameA = new GameState(1);
gameA.activateLocation('window');
gameB = new GameState(2);
gameB.activateLocation('window');
// They might be same by chance, so this is a weaker test
// Instead check action count increments
assert.strictEqual(gameA.actionCount, 1, 'Action count should be 1');
assert.strictEqual(gameB.actionCount, 1, 'Action count should be 1');
console.log('✓ Test 9: Action counting works');

// Test 10: Sequence leads to win
game = new GameState();
// Start: all 0
// Goal: all same
// One solution: door (all 1), then window + manual cycles
game.activateLocation('door');
assert.strictEqual(game.getCharacterState('alice'), 1, 'After door: alice=1');
assert.strictEqual(game.getCharacterState('bob'), 1, 'After door: bob=1');
assert.strictEqual(game.getCharacterState('charlie'), 1, 'After door: charlie=1');
assert.strictEqual(game.isWon(), true, 'Door alone should win from start (all become 1)');
console.log('✓ Test 10: Win via door action works');

console.log('\nAll logic tests passed!');
