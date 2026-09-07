// Solvability proof: a bot can achieve a win state
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

  getAllCharacterStates() {
    return this.characters.map(c => c.state);
  }

  isWon() {
    return this.winState;
  }

  getStateString() {
    return this.characters.map(c => `${c.id}:${c.state}`).join(' ');
  }
}

// Breadth-first search to find a winning path
function findWinningPath(initialSeed) {
  const game = new GameState(initialSeed);

  // State representation: string of character states
  const stateToString = (states) => states.join(',');
  const initialState = game.getAllCharacterStates();

  const queue = [{
    states: initialState,
    path: [],
    game: new GameState(initialSeed)
  }];

  const visited = new Set([stateToString(initialState)]);
  const maxSteps = 20; // Limit search depth

  while (queue.length > 0) {
    const current = queue.shift();

    // Check if won
    if (current.game.isWon()) {
      return {
        won: true,
        path: current.path,
        finalState: current.game.getAllCharacterStates(),
        actionCount: current.path.length
      };
    }

    // Don't search beyond max steps
    if (current.path.length >= maxSteps) continue;

    // Try all possible actions
    const actions = [
      { type: 'cycle', target: 'alice' },
      { type: 'cycle', target: 'bob' },
      { type: 'cycle', target: 'charlie' },
      { type: 'location', target: 'door' },
      { type: 'location', target: 'window' },
      { type: 'location', target: 'mirror' }
    ];

    for (const action of actions) {
      const testGame = new GameState(initialSeed);
      // Replay all actions so far
      for (const pastAction of current.path) {
        if (pastAction.type === 'cycle') {
          testGame.cycleCharacter(pastAction.target);
        } else {
          testGame.activateLocation(pastAction.target);
        }
      }
      // Apply new action
      if (action.type === 'cycle') {
        testGame.cycleCharacter(action.target);
      } else {
        testGame.activateLocation(action.target);
      }

      const newState = testGame.getAllCharacterStates();
      const stateStr = stateToString(newState);

      if (!visited.has(stateStr)) {
        visited.add(stateStr);
        queue.push({
          states: newState,
          path: [...current.path, action],
          game: testGame
        });
      }
    }
  }

  return {
    won: false,
    path: [],
    reason: 'No winning path found within search depth'
  };
}

// Test solvability with multiple seeds
console.log('Testing solvability...\n');

const seeds = [12345, 42, 999, 54321, 11111];
let solvedCount = 0;

for (const seed of seeds) {
  const result = findWinningPath(seed);

  if (result.won) {
    solvedCount++;
    console.log(`✓ Seed ${seed}: SOLVABLE in ${result.path.length} steps`);
    console.log(`  Path: ${result.path.map(a => `${a.type}(${a.target})`).join(' → ')}`);
    console.log(`  Final state: ${result.finalState.join(',')}\n`);
  } else {
    console.log(`✗ Seed ${seed}: NOT SOLVABLE - ${result.reason}\n`);
  }
}

assert.strictEqual(solvedCount, seeds.length, `All seeds should be solvable, but only ${solvedCount}/${seeds.length} were`);

console.log(`\nSolvability verdict: PASS (${solvedCount}/${seeds.length} seeds lead to victory)`);
console.log('Bot can achieve win state: YES');
