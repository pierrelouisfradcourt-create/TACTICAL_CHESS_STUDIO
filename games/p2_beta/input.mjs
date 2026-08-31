// input — couche de gestes joueur. Traduit une affordance en commande vers `logic`
// et signale le changement. NE DESSINE RIEN et n'importe pas `render`
// (blueprint.deps_interdites : input -/-> render).

import * as Logic from './logic.mjs';

class SignalEmitter {
  constructor() {
    this.listeners = {};
  }

  on(eventName, callback) {
    if (!this.listeners[eventName]) this.listeners[eventName] = [];
    this.listeners[eventName].push(callback);
  }

  off(eventName, callback) {
    if (this.listeners[eventName]) {
      this.listeners[eventName] = this.listeners[eventName].filter((cb) => cb !== callback);
    }
  }

  emit(eventName, ...args) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach((cb) => cb(...args));
    }
  }
}

export const signals = {
  onClickTarget: new SignalEmitter(),
  onBuyGenerator: new SignalEmitter(),
  onPrestigeReset: new SignalEmitter(),
  onStateChange: new SignalEmitter(),
};

/**
 * Geste « presser la cible ». Le montant gagné est transmis dans le signal :
 * c'est `render` qui décide comment le montrer, `input` ne dessine rien.
 * @returns {number} montant crédité par le clic
 */
export function handleClickTarget(state) {
  const gained = Logic.applyClick(state);
  signals.onClickTarget.emit('click', { state, gained });
  signals.onStateChange.emit('state', state);
  return gained;
}

export function handleBuyGenerator(state, generatorId) {
  const success = Logic.buyGenerator(state, generatorId);
  if (success) {
    signals.onBuyGenerator.emit('purchase', { generatorId, state });
    signals.onStateChange.emit('state', state);
  }
  return success;
}

export function handlePrestigeReset(state) {
  const success = Logic.prestigeReset(state);
  if (success) {
    signals.onPrestigeReset.emit('reset', state);
    signals.onStateChange.emit('state', state);
  }
  return success;
}

export function setupInputListeners(state) {
  return {
    clickTarget: () => handleClickTarget(state),
    buyGenerator: (id) => handleBuyGenerator(state, id),
    prestigeReset: () => handlePrestigeReset(state),
  };
}
