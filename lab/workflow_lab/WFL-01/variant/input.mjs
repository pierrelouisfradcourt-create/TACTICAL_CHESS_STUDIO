// input.mjs — capture clavier PURE pour le breakout (WFL-01, pièce "variant").
//
// Contrat (blueprint.yaml) : input traduit les touches en un objet d'intention
// {left, right} consommé par BreakoutGame#step(dtMs, input) (variant/game.mjs) ;
// n'importe jamais render.mjs ni server.mjs ; ne mute jamais l'état de jeu
// directement (R19 — seule game.mjs mute l'état). Écrit sans consulter la pièce
// "control" équivalente (isolation d'agent, protocole WFL-01).

const LEFT_KEYS = new Set(['ArrowLeft', 'a', 'A']);
const RIGHT_KEYS = new Set(['ArrowRight', 'd', 'D']);

/**
 * Attache les écouteurs clavier sur `target` (par défaut window) et retourne un
 * objet input vivant {left, right} à passer tel quel à game.step(dtMs, input).
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
    /** Copie figée de l'état courant — utilisable par un bot pilotant l'entrée (R20). */
    snapshot() {
      return { left: state.left, right: state.right };
    },
    /** Détache les écouteurs — évite les fuites d'event listeners lors d'un restart (R17). */
    destroy() {
      if (el && typeof el.removeEventListener === 'function') {
        el.removeEventListener('keydown', onKeyDown);
        el.removeEventListener('keyup', onKeyUp);
      }
    },
  };
}
