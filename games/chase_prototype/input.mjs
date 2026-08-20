// Chase Prototype — capture clavier PURE. Aucune règle de jeu ici : traduit les touches
// flèches (+ WASD en confort) en un objet input {left,right,up,down} lu par game.mjs.

const KEY_MAP = {
  ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
  KeyA: "left", KeyD: "right", KeyW: "up", KeyS: "down",
};

export function createInputTracker(target) {
  const input = { left: false, right: false, up: false, down: false };

  function onKeyDown(e) {
    const dir = KEY_MAP[e.code];
    if (dir) { input[dir] = true; e.preventDefault(); }
  }
  function onKeyUp(e) {
    const dir = KEY_MAP[e.code];
    if (dir) { input[dir] = false; e.preventDefault(); }
  }

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);

  function destroy() {
    target.removeEventListener("keydown", onKeyDown);
    target.removeEventListener("keyup", onKeyUp);
  }

  return { input, destroy };
}
