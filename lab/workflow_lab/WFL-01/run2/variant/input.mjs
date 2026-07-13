// input.mjs — capture clavier PURE (WFL-01, rollout run2, branche "variant", pièce
// écrite en isolation d'agent : seuls shared/blueprint.yaml et shared/
// product_snapshot.md R6/R7/R20 ont été consultés — jamais game.mjs/level.mjs, jamais
// run1, jamais run2/control/input.mjs).
//
// Contrat : produit {left,right} consommé par game.step(dtMs, input). Ne mute jamais
// l'état de jeu directement (R19 — seule game.mjs mute l'état).

const LEFT_KEYS = new Set(['ArrowLeft', 'a', 'A']);
const RIGHT_KEYS = new Set(['ArrowRight', 'd', 'D']);

/**
 * @param {EventTarget} [target]
 * @returns {{left:boolean, right:boolean, snapshot:()=>{left:boolean,right:boolean}, destroy:()=>void}}
 */
export function createInput(target) {
  const el = target || (typeof window !== 'undefined' ? window : null);
  const state = { left: false, right: false };

  function onKeyDown(event) {
    if (!event || !event.key) return;
    if (LEFT_KEYS.has(event.key)) state.left = true;
    if (RIGHT_KEYS.has(event.key)) state.right = true;
  }

  function onKeyUp(event) {
    if (!event || !event.key) return;
    if (LEFT_KEYS.has(event.key)) state.left = false;
    if (RIGHT_KEYS.has(event.key)) state.right = false;
  }

  if (el && typeof el.addEventListener === 'function') {
    el.addEventListener('keydown', onKeyDown);
    el.addEventListener('keyup', onKeyUp);
  }

  return {
    get left() {
      return state.left;
    },
    get right() {
      return state.right;
    },
    /** Copie figée de l'état courant — pilotage bot possible (R20). */
    snapshot() {
      return { left: state.left, right: state.right };
    },
    /** Détache les écouteurs — évite les fuites lors d'un restart (R17). */
    destroy() {
      if (el && typeof el.removeEventListener === 'function') {
        el.removeEventListener('keydown', onKeyDown);
        el.removeEventListener('keyup', onKeyUp);
      }
    },
  };
}
