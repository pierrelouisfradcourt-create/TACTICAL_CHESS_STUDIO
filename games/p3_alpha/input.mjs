// Input dispatch: pointer events -> game actions (no rendering knowledge)

class InputHandler {
  constructor(state, progression, engine) {
    this.state = state;
    this.progression = progression;
    this.engine = engine;
  }

  // R18a: Click core → creditClick (always available)
  onClickCore() {
    const gain_mR = this.state.creditClick();
    this.progression.updateUnlocks(this.state.cumul_mR);
    return { action: 'click_core', gain_mR };
  }

  // R18b: Buy generator (if unlocked and affordable)
  onBuyGenerator(generatorIndex) {
    if (!this.progression.isGateUnlocked('core_clicker')) {
      return { action: 'buy_generator', success: false, reason: 'core not unlocked' };
    }

    // Check generator gate
    const gate_required = ['g2', 'g3', 'g4'][generatorIndex - 1] || 'core_clicker';
    if (generatorIndex > 0 && !this.progression.isGateUnlocked(gate_required)) {
      return { action: 'buy_generator', success: false, reason: 'generator locked' };
    }

    const success = this.state.tryPurchaseGenerator(generatorIndex);
    if (success) {
      this.progression.updateUnlocks(this.state.cumul_mR);
    }
    return { action: 'buy_generator', generatorIndex, success };
  }

  // R18c: Buy upgrade (if unlocked and affordable)
  onBuyUpgrade(upgradeKey) {
    if (!this.progression.isGateUnlocked('prod_upgrades_panel')) {
      return { action: 'buy_upgrade', success: false, reason: 'upgrades not unlocked' };
    }

    const success = this.state.tryPurchaseUpgrade(upgradeKey);
    if (success) {
      this.progression.updateUnlocks(this.state.cumul_mR);
    }
    return { action: 'buy_upgrade', upgradeKey, success };
  }

  // R18d: New game (reset). engine.reset() resets state/progression in
  // place (see engine.mjs) — calling it alone is sufficient since this.state
  // and this.progression are the same instances as engine.state/engine.progression.
  onNewGame() {
    this.engine.reset();
    return { action: 'new_game', success: true };
  }

  // Generic pointer handler (maps x,y to action)
  // Assumes affinity regions are defined by caller (render layer)
  dispatchPointer(x, y, hitRegions) {
    if (!hitRegions) return { action: 'none' };

    for (const region of hitRegions) {
      const hit = this.pointInRegion(x, y, region);
      if (!hit) continue;

      switch (region.type) {
        case 'core':
          return this.onClickCore();
        case 'generator':
          return this.onBuyGenerator(region.generatorIndex);
        case 'upgrade':
          return this.onBuyUpgrade(region.upgradeKey);
        case 'new_game':
          return this.onNewGame();
      }
    }
    return { action: 'none' };
  }

  pointInRegion(x, y, region) {
    if (!region.rect) return false;
    const { x: rx, y: ry, w, h } = region.rect;
    return x >= rx && x < rx + w && y >= ry && y < ry + h;
  }
}

export { InputHandler };
