// Canvas rendering: read-only of state, visual feedback
import { CONSTANTS } from './state.mjs';

class GameRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.width = canvasElement.width;
    this.height = canvasElement.height;

    // Visual state (animation feedback, not game logic)
    this.clickSquishAmount = 0; // 0..1
    this.clickSquishDecay = 0.92;
    this.lastClickTime = 0;

    this.hitRegions = [];
  }

  // R17a: Visual feedback for click (squish)
  applyClickFeedback() {
    this.clickSquishAmount = 1;
    this.lastClickTime = Date.now();
  }

  // Update squish animation
  updateSquish(deltaTime_ms) {
    this.clickSquishAmount *= this.clickSquishDecay;
  }

  // R17b: Full frame render
  render(state, progression, engine) {
    this.ctx.fillStyle = '#f5f5dc'; // beige background
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.hitRegions = [];

    // Layout
    const w = this.width;
    const h = this.height;
    const centerX = w / 2;
    const centerY = h / 2;

    // HUD: goal text
    this.ctx.fillStyle = '#333';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(progression.getGoalText(), centerX, 40);

    // Core clicker (large circle in center)
    const coreRadius = 60 + this.clickSquishAmount * 5;
    const coreScale = 1 - this.clickSquishAmount * 0.1; // squish effect
    this.renderCore(centerX, centerY - 80, coreRadius * coreScale);
    this.hitRegions.push({
      type: 'core',
      rect: { x: centerX - coreRadius, y: centerY - 80 - coreRadius, w: coreRadius * 2, h: coreRadius * 2 },
    });

    // R counter and rate
    this.ctx.fillStyle = '#333';
    this.ctx.font = 'bold 32px monospace';
    this.ctx.textAlign = 'center';
    const displayBalance = Math.floor(state.solde_mR / 1000);
    this.ctx.fillText(`${displayBalance} R`, centerX, centerY - 180);

    const rate = this.getCurrentRate(state);
    this.ctx.font = '14px sans-serif';
    this.ctx.fillStyle = '#666';
    this.ctx.fillText(`${rate.toFixed(1)} R/s`, centerX, centerY - 160);

    // Generator cards (below core)
    const cardWidth = 90;
    const cardHeight = 60;
    const cardSpacingX = 110;
    const startX = centerX - (4 * cardSpacingX) / 2 + cardSpacingX / 2;
    const cardY = centerY + 60;

    for (let i = 0; i < 4; i++) {
      const cardX = startX + i * cardSpacingX;
      const owned = state.generators_owned[i];
      const cost_mR = CONSTANTS.GENERATOR_BASE_COSTS_MR[i] * Math.pow(CONSTANTS.COST_GROWTH_FACTOR, owned);
      const affordable = state.solde_mR >= cost_mR;
      const unlocked = progression.isGateUnlocked(['core_clicker', 'g2', 'g3', 'g4'][i] || 'core_clicker');

      const grayedOut = !affordable || !unlocked;
      this.renderGeneratorCard(cardX, cardY, cardWidth, cardHeight, i, owned, grayedOut);

      this.hitRegions.push({
        type: 'generator',
        generatorIndex: i,
        rect: { x: cardX - cardWidth / 2, y: cardY, w: cardWidth, h: cardHeight },
      });
    }

    // Upgrade cards (if panel unlocked)
    if (progression.isGateUnlocked('prod_upgrades_panel')) {
      const upgrades = [
        'clic_x2',
        'clic_x4',
        'prod_g1_x2',
        'prod_g2_x2',
        'prod_g3_x2',
        'prod_g4_x2',
      ];
      const upgradeCardWidth = 75;
      const upgradeCardHeight = 50;
      const upgradeSpacingX = 85;
      const upgradeStartX = centerX - (upgrades.length * upgradeSpacingX) / 2 + upgradeSpacingX / 2;
      const upgradeY = cardY + 90;

      for (let i = 0; i < upgrades.length; i++) {
        const key = upgrades[i];
        const owned = state.upgrades_owned[key];
        if (owned) continue; // only show available upgrades

        const upgrade_cost_mR = 500; // dummy for now, should come from economy
        const affordable = state.solde_mR >= upgrade_cost_mR;
        this.renderUpgradeCard(
          upgradeStartX + i * upgradeSpacingX,
          upgradeY,
          upgradeCardWidth,
          upgradeCardHeight,
          key,
          !affordable,
        );

        this.hitRegions.push({
          type: 'upgrade',
          upgradeKey: key,
          rect: {
            x: upgradeStartX + i * upgradeSpacingX - upgradeCardWidth / 2,
            y: upgradeY,
            w: upgradeCardWidth,
            h: upgradeCardHeight,
          },
        });
      }
    }

    // Victory panel
    if (progression.checkVictory()) {
      this.renderVictoryPanel();
      this.hitRegions.push({
        type: 'new_game',
        rect: { x: centerX - 75, y: centerY - 25, w: 150, h: 50 },
      });
    }
  }

  renderCore(x, y, radius) {
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#dd5555';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
  }

  renderGeneratorCard(x, y, w, h, generatorIndex, owned, grayedOut) {
    this.ctx.fillStyle = grayedOut ? '#ccc' : '#fff';
    this.ctx.fillRect(x - w / 2, y, w, h);
    this.ctx.strokeStyle = '#999';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - w / 2, y, w, h);

    this.ctx.fillStyle = grayedOut ? '#999' : '#333';
    this.ctx.font = 'bold 12px sans-serif';
    this.ctx.textAlign = 'center';
    const names = ['G1', 'G2', 'G3', 'G4'];
    this.ctx.fillText(names[generatorIndex], x, y + 18);

    this.ctx.font = '10px sans-serif';
    this.ctx.fillStyle = owned ? '#33cc33' : grayedOut ? '#999' : '#666';
    this.ctx.fillText(`×${owned}`, x, y + 35);
  }

  renderUpgradeCard(x, y, w, h, upgradeKey, grayedOut) {
    this.ctx.fillStyle = grayedOut ? '#ddd' : '#fff';
    this.ctx.fillRect(x - w / 2, y, w, h);
    this.ctx.strokeStyle = '#999';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - w / 2, y, w, h);

    this.ctx.fillStyle = grayedOut ? '#999' : '#333';
    this.ctx.font = 'bold 10px sans-serif';
    this.ctx.textAlign = 'center';
    const labels = {
      clic_x2: '×2 Click',
      clic_x4: '×4 Click',
      prod_g1_x2: 'G1 ×2',
      prod_g2_x2: 'G2 ×2',
      prod_g3_x2: 'G3 ×2',
      prod_g4_x2: 'G4 ×2',
    };
    this.ctx.fillText(labels[upgradeKey] || upgradeKey, x, y + 28);
  }

  renderVictoryPanel() {
    const w = 200;
    const h = 100;
    const x = this.width / 2 - w / 2;
    const y = this.height / 2 - h / 2;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(x, y, w, h);
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x, y, w, h);

    this.ctx.fillStyle = '#333';
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Victory!', this.width / 2, y + 40);

    this.ctx.font = '14px sans-serif';
    this.ctx.fillStyle = '#0066cc';
    this.ctx.fillText('[New Game]', this.width / 2, y + 75);
  }

  getCurrentRate(state) {
    let rate = 0;
    for (let i = 0; i < 4; i++) {
      let prod = CONSTANTS.GENERATOR_PROD_R_PER_S[i];
      if (state.upgrades_owned[`prod_g${i + 1}_x2`]) {
        prod *= 2;
      }
      rate += state.generators_owned[i] * prod;
    }
    return rate;
  }
}

export { GameRenderer };
