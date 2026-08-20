// kb_tactics — capture clavier -> action de jeu. AUCUNE règle de jeu ici.
// Flèches / WASD => une action tour-par-tour. Espace => wait.

const KEY_TO_ACTION = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right",
  W: "up", S: "down", A: "left", D: "right",
  " ": "wait",
};

export function bindInput(target, onAction) {
  const handler = (ev) => {
    const action = KEY_TO_ACTION[ev.key];
    if (!action) return;
    ev.preventDefault();
    onAction(action);
  };
  target.addEventListener("keydown", handler);
  return () => target.removeEventListener("keydown", handler);
}

export { KEY_TO_ACTION };
