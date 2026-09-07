// Seeded PRNG for deterministic behavior
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

  randInt(min, max) {
    return Math.floor(this.rand() * (max - min)) + min;
  }
}

// Game state and logic
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
        // Door event: shift all characters' states
        this.characters.forEach(char => {
          char.state = (char.state + 1) % 3;
        });
        break;
      case 'window':
        // Window event: cycle forward for specific characters
        this.characters[0].state = (this.characters[0].state + 1) % 3;
        this.characters[1].state = (this.characters[1].state + 2) % 3;
        break;
      case 'mirror':
        // Mirror event: reset odd-indexed characters
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

// UI Controller
class GameUI {
  constructor(container, gameState) {
    this.container = container;
    this.gameState = gameState;
    this.render();
    this.attachEventListeners();
  }

  render() {
    this.container.innerHTML = '<div class="state-indicator" id="stateInfo"></div><div class="win-overlay" id="winOverlay">✓ ALL IN SYNC!</div>';

    // Render characters
    const characterPositions = [
      { x: 15, y: 35 },
      { x: 50, y: 35 },
      { x: 85, y: 35 }
    ];

    this.gameState.characters.forEach((char, idx) => {
      const pos = characterPositions[idx];
      const charDiv = document.createElement('div');
      charDiv.className = 'character';
      charDiv.id = `char-${char.id}`;
      charDiv.style.left = pos.x + '%';
      charDiv.style.top = pos.y + '%';
      charDiv.innerHTML = `
        <div class="character-body" data-state="${char.state}">
          <div class="character-head" data-state="${char.state}">
            <div class="character-eyes">
              <div class="eye"></div>
              <div class="eye"></div>
            </div>
            <div class="character-mouth" data-state="${char.state}"></div>
          </div>
        </div>
        <div class="character-name">${char.name}</div>
      `;
      this.container.appendChild(charDiv);
    });

    // Render locations
    this.gameState.locations.forEach(loc => {
      const locDiv = document.createElement('div');
      locDiv.className = `location ${loc.id}`;
      locDiv.id = `loc-${loc.id}`;
      locDiv.textContent = loc.name;
      this.container.appendChild(locDiv);
    });

    this.updateStateIndicator();
    this.updateCharacterVisuals();
    this.updateWinOverlay();
  }

  updateStateIndicator() {
    const info = document.getElementById('stateInfo');
    if (info) {
      info.textContent = `State: ${this.gameState.getStateString()}`;
    }
  }

  updateCharacterVisuals() {
    this.gameState.characters.forEach(char => {
      const charEl = document.getElementById(`char-${char.id}`);
      if (charEl) {
        const bodyEl = charEl.querySelector('.character-body');
        const mouthEl = charEl.querySelector('.character-mouth');

        if (bodyEl) bodyEl.setAttribute('data-state', char.state);
        if (mouthEl) mouthEl.setAttribute('data-state', char.state);

        // Visual feedback for state
        const colors = ['#e74c3c', '#f39c12', '#2ecc71'];
        const headColors = ['#f5a962', '#f9b233', '#27ae60'];

        if (bodyEl) {
          bodyEl.style.background = colors[char.state];
        }

        const headEl = charEl.querySelector('.character-head');
        if (headEl) {
          headEl.style.background = headColors[char.state];
        }

        // Mouth shapes by state
        if (mouthEl) {
          if (char.state === 0) {
            mouthEl.style.width = '10px';
            mouthEl.style.height = '2px';
            mouthEl.style.borderRadius = '2px';
            mouthEl.style.bottom = '8px';
          } else if (char.state === 1) {
            mouthEl.style.width = '10px';
            mouthEl.style.height = '4px';
            mouthEl.style.borderRadius = '2px';
          } else {
            mouthEl.style.width = '14px';
            mouthEl.style.height = '6px';
            mouthEl.style.borderRadius = '3px';
            mouthEl.style.bottom = '5px';
          }
        }
      }
    });
  }

  updateWinOverlay() {
    const overlay = document.getElementById('winOverlay');
    if (overlay) {
      if (this.gameState.isWon()) {
        overlay.classList.add('active');
      } else {
        overlay.classList.remove('active');
      }
    }
  }

  attachEventListeners() {
    this.gameState.characters.forEach(char => {
      const charEl = document.getElementById(`char-${char.id}`);
      if (charEl) {
        charEl.addEventListener('click', () => {
          this.gameState.cycleCharacter(char.id);
          this.updateStateIndicator();
          this.updateCharacterVisuals();
          this.updateWinOverlay();
        });
      }
    });

    this.gameState.locations.forEach(loc => {
      const locEl = document.getElementById(`loc-${loc.id}`);
      if (locEl) {
        locEl.addEventListener('click', () => {
          this.gameState.activateLocation(loc.id);
          this.updateStateIndicator();
          this.updateCharacterVisuals();
          this.updateWinOverlay();
        });
      }
    });
  }
}

// Initialize game
const seed = window.__gameSeed || 12345;
const gameState = new GameState(seed);

let ui;
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('gameContainer');
  ui = new GameUI(container, gameState);
});

// Expose API for oracle/testing
window.__game = {
  state: gameState,
  ui: ui,

  getCharacterState(charId) {
    return gameState.getCharacterState(charId);
  },

  setCharacterState(charId, state) {
    gameState.setCharacterState(charId, state);
    if (ui) {
      ui.updateStateIndicator();
      ui.updateCharacterVisuals();
      ui.updateWinOverlay();
    }
  },

  clickCharacter(charId) {
    gameState.cycleCharacter(charId);
    if (ui) {
      ui.updateStateIndicator();
      ui.updateCharacterVisuals();
      ui.updateWinOverlay();
    }
  },

  clickLocation(locId) {
    gameState.activateLocation(locId);
    if (ui) {
      ui.updateStateIndicator();
      ui.updateCharacterVisuals();
      ui.updateWinOverlay();
    }
  },

  getGameState() {
    return gameState.getStateString();
  },

  isWon() {
    return gameState.isWon();
  },

  reset(newSeed) {
    const seed = newSeed || 12345;
    gameState.seed = seed;
    gameState.rng = new SeededRandom(seed);
    gameState.characters.forEach(c => c.state = 0);
    gameState.winState = false;
    gameState.actionCount = 0;
    if (ui) {
      ui.render();
    }
  },

  getAllCharacterStates() {
    return gameState.characters.map(c => ({ id: c.id, state: c.state }));
  }
};
