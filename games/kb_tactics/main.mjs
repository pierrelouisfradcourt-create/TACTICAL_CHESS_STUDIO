// kb_tactics — point d'entrée navigateur : câble moteur + rendu + input + overlay/restart.
// Expose window.__game et window.__game_debug (hooks de jouabilité pour l'e2e).
import { KbTacticsGame } from "./game.mjs";
import { createRenderer } from "./render.mjs";
import { bindInput } from "./input.mjs";

function seedFromUrl() {
  const p = new URLSearchParams(location.search);
  const s = Number(p.get("seed"));
  return Number.isFinite(s) && s > 0 ? s : 1;
}

async function boot() {
  const canvas = document.getElementById("board");
  const overlay = document.getElementById("overlay");
  const overlayText = document.getElementById("overlay-text");
  const restart = document.getElementById("restart");

  const seed = seedFromUrl();
  const game = new KbTacticsGame({ seed });
  const renderer = await createRenderer(canvas);

  window.__game = game;
  window.__game_debug = {
    forceLose: () => { game.forceLose(); refresh(); },
    play: (action) => { game.step(action); refresh(); },
    assetsLoaded: renderer.assetsLoaded,
  };

  function refresh() {
    renderer.draw(game);
    if (game.status === "ACTIVE") {
      overlay.classList.add("hidden");
    } else {
      overlayText.textContent = game.status === "WON" ? "VICTOIRE — sortie atteinte" : "DÉFAITE — PV épuisés";
      overlay.classList.remove("hidden");
    }
  }

  bindInput(window, (action) => {
    game.step(action);
    refresh();
  });

  restart.addEventListener("click", () => {
    game.reset(seed);
    refresh();
  });

  refresh();
}

boot();
