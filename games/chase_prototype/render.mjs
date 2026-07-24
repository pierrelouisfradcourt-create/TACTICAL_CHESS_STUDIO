// Chase Prototype — dessin PUR. Aucune règle de jeu ici : lit uniquement la vue exposée
// par ChasePrototypeGame#view() et dessine sur un contexte canvas 2D fourni.

export function draw(ctx, state) {
  ctx.clearRect(0, 0, state.width, state.height);

  // fond
  ctx.fillStyle = "#101018";
  ctx.fillRect(0, 0, state.width, state.height);

  // joueur
  ctx.beginPath();
  ctx.fillStyle = "#4fc3f7";
  ctx.arc(state.player.x, state.player.y, state.player.radius, 0, Math.PI * 2);
  ctx.fill();

  // ennemi
  ctx.beginPath();
  ctx.fillStyle = "#ff5252";
  ctx.arc(state.enemy.x, state.enemy.y, state.enemy.radius, 0, Math.PI * 2);
  ctx.fill();
}

export function updateHud(state, els) {
  const secondsLeft = Math.ceil(state.timeLeftMs / 1000);
  els.timeLeft.textContent = state.won ? "0" : String(secondsLeft);
}

export function updateOverlay(state, els) {
  const shouldShow = state.over || state.won;
  els.overlay.classList.toggle("hidden", !shouldShow);
  if (!shouldShow) return;
  els.overlayTitle.textContent = state.won ? "VICTOIRE" : "DÉFAITE";
  els.finalTime.textContent = String(Math.floor(state.elapsedMs / 1000));
}
