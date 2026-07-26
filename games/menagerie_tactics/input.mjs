// input.mjs — traduction ENTRÉE -> case de grille. Aucune règle de jeu : convertit
// un pixel de clic en coordonnées de case. La logique select/move/attack vit dans
// index.html et interroge le moteur (game.mjs) qui reste l'autorité des règles.
import { CELL } from "./render.mjs";

export function cellFromPixel(px, py) {
  return { x: Math.floor(px / CELL), y: Math.floor(py / CELL) };
}

// Attache un gestionnaire de clic canvas ; appelle onCell({x,y}) pour chaque clic
// dans la grille. Retourne une fonction de détachement.
export function attachCanvasInput(canvas, onCell) {
  const handler = (ev) => {
    const rect = canvas.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    const py = ev.clientY - rect.top;
    onCell(cellFromPixel(px, py));
  };
  canvas.addEventListener("click", handler);
  return () => canvas.removeEventListener("click", handler);
}

// Survol : appelle onHover({x,y}) au mousemove, onHover(null) au mouseleave.
export function attachHover(canvas, onHover) {
  const move = (ev) => {
    const rect = canvas.getBoundingClientRect();
    onHover(cellFromPixel(ev.clientX - rect.left, ev.clientY - rect.top));
  };
  const leave = () => onHover(null);
  canvas.addEventListener("mousemove", move);
  canvas.addEventListener("mouseleave", leave);
  return () => { canvas.removeEventListener("mousemove", move); canvas.removeEventListener("mouseleave", leave); };
}
