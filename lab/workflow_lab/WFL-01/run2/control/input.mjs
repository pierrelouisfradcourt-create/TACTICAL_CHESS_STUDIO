// input.mjs — capture clavier PURE (WFL-01, rollout run2, branche "control"). Produit
// {left,right} consommé par game.step(dtMs, input). Ne mute jamais l'état directement
// (R19). Écrit indépendamment de run1.

const LEFT_KEYS = new Set(['ArrowLeft', 'a', 'A', 'q', 'Q']);
const RIGHT_KEYS = new Set(['ArrowRight', 'd', 'D']);

/**
 * @param {EventTarget} [target]
 * @returns {{left:boolean, right:boolean, snapshot:()=>object, destroy:()=>void}}
 */
export function createInput(target) {
  const el = target || (typeof window !== 'undefined' ? window : null);
  const held = { left: false, right: false };

  function onDown(e) {
    if (!e || !e.key) return;
    if (LEFT_KEYS.has(e.key)) held.left = true;
    if (RIGHT_KEYS.has(e.key)) held.right = true;
  }
  function onUp(e) {
    if (!e || !e.key) return;
    if (LEFT_KEYS.has(e.key)) held.left = false;
    if (RIGHT_KEYS.has(e.key)) held.right = false;
  }

  if (el && typeof el.addEventListener === 'function') {
    el.addEventListener('keydown', onDown);
    el.addEventListener('keyup', onUp);
  }

  return {
    get left() {
      return held.left;
    },
    get right() {
      return held.right;
    },
    snapshot() {
      return { left: held.left, right: held.right };
    },
    destroy() {
      if (el && typeof el.removeEventListener === 'function') {
        el.removeEventListener('keydown', onDown);
        el.removeEventListener('keyup', onUp);
      }
    },
  };
}
