// Canvas rendering. Reads state, draws to canvas. Pure, no game logic.
// Pop'n TwinBee kawaii direction: rounded chibi silhouettes, primary saturated colors,
// distinct formations, warm/cold projectile contrast, chunky HUD, explosion feedback.
//
// Constantes dupliquées (PAS importées de logic/state.mjs) : render est un
// module d'ownership séparé (blueprint.json interdit render -> logic, vérifié
// par forge.static_oracles.check_architecture — violation réelle trouvée et
// corrigée ici). Doit rester synchronisé avec logic/state.mjs si ces valeurs
// changent.
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const SHIP_WIDTH = 30;
const SHIP_HEIGHT = 30;

// État de rendu : images préchargées, animations en cours
const renderState = {
  images: {},
  explosions: [], // { x, y, startFrame, frameCount }
  loadedCount: 0,
  totalCount: 13,
  lastEnemies: [], // pour détecter les morts
};

function loadAssets() {
  const assetList = [
    'candypack1_candycane.png',
    'candypack1_candycorn.png',
    'candypack1_candyhumbug.png',
    'candypack1_lollipop_blue.png',
    'candypack1_lollipop_green.png',
    'candypack1_jellybig_red.png',
    'candypack1_bean_purple.png',
    'candypack1_heart_red.png',
    'candypack1_explosionpink01.png',
    'candypack1_explosionpink02.png',
    'candypack1_explosionpink03.png',
    'candypack1_explosionpink04.png',
    'candypack1_explosionpink05.png',
  ];

  for (const name of assetList) {
    const img = new Image();
    img.onload = () => {
      renderState.loadedCount++;
    };
    img.onerror = () => {
      console.log(`Asset failed to load: ${name} — will fallback to canvas shapes`);
      renderState.loadedCount++;
    };
    img.src = `/assets/${name}`;
    renderState.images[name] = img;
  }
}

// Dessine le vaisseau du joueur : silhouette ronde/chibi, cyan/blanc avec cockpit rose.
// Corps et cockpit en dégradés radiaux (volume rond en couches, pas un arc plat).
function drawShip(ctx, x, y, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;

  const cx = x + 15, cy = y + 10;

  // Ailes DESSOUS le corps (roots couverts par le corps -> lecture en couches)
  for (const wingX of [x + 4, x + 26]) {
    const dir = wingX < cx ? -0.3 : 0.3;
    ctx.fillStyle = '#33ddff';
    ctx.beginPath();
    ctx.ellipse(wingX, y + 15, 5, 7, dir, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Corps principal : dégradé radial cyan (clair -> base -> rim foncé)
  const bodyGrad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 13);
  bodyGrad.addColorStop(0, '#d6f7ff');
  bodyGrad.addColorStop(0.45, '#00d4ff');
  bodyGrad.addColorStop(1, '#0088cc');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.stroke();

  // Cockpit rose bonbon (dégradé)
  const cockGrad = ctx.createRadialGradient(cx - 1, y + 6, 1, cx, y + 8, 5);
  cockGrad.addColorStop(0, '#ffd0e4');
  cockGrad.addColorStop(1, '#ff69a0');
  ctx.fillStyle = cockGrad;
  ctx.beginPath();
  ctx.arc(cx, y + 8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Yeux
  ctx.fillStyle = '#22223a';
  ctx.beginPath();
  ctx.arc(x + 12, y + 6, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 18, y + 6, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Dessine un ennemi : deux familles chromatiques distinctes selon la formation
// (R3 invaders = jaune/orange, R4 sine = vert/turquoise). enemy.pattern est
// exposé par la logique (logic/enemies.mjs, champ `pattern`) — PAS deviné.
// Corps en dégradé radial (rond en couches), joues, yeux blanc+pupille.
function drawEnemy(ctx, enemy) {
  const x = enemy.x;
  const y = enemy.y;

  let cLight, cBase, cDark, cheek;
  if (enemy.pattern === 'invaders_descent') {
    cLight = '#fff2b0'; cBase = '#ffcc00'; cDark = '#e08a00'; cheek = '#ff9500'; // jaune/orange
  } else {
    cLight = '#c6ffe6'; cBase = '#2fe06a'; cDark = '#129c68'; cheek = '#00ffaa'; // vert/turquoise
  }

  const cx = x + 15, cy = y + 12;

  // Corps rond en couches (dégradé radial)
  const grad = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, 11);
  grad.addColorStop(0, cLight);
  grad.addColorStop(0.5, cBase);
  grad.addColorStop(1, cDark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Joues (accent secondaire)
  ctx.fillStyle = cheek;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(x + 7, cy + 1, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 23, cy + 1, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Yeux ronds expressifs (blanc + pupille)
  for (const ex of [x + 10, x + 20]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, y + 9, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22223a';
    ctx.beginPath();
    ctx.arc(ex, y + 9, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Petite bouche
  ctx.strokeStyle = '#22223a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, y + 15, 2, 0, Math.PI);
  ctx.stroke();
}

// Dessine un boss : une couleur dominante propre par boss (R14 magenta / R15
// bleu roi / R16 rouge cerise). boss.name vient des données réelles
// (data/bosses.mjs) — PAS deviné. Gros rond expressif en couches (dégradé
// radial), gros yeux avec reflet : mignon mais menaçant.
function drawBoss(ctx, boss) {
  const x = boss.x;
  const y = boss.y;

  let cLight, cBase, cDark;
  if (boss.name === 'boss_2') {
    cLight = '#8fb4ff'; cBase = '#0055ff'; cDark = '#0033aa'; // bleu roi
  } else if (boss.name === 'boss_3') {
    cLight = '#ff9bb5'; cBase = '#ff0055'; cDark = '#b3003c'; // rouge cerise
  } else {
    cLight = '#ff9bff'; cBase = '#ff00ff'; cDark = '#aa00aa'; // magenta (boss 1)
  }

  const cx = x + 40, cy = y + 25;

  // Corps : gros rond expressif en couches (dégradé radial)
  const grad = ctx.createRadialGradient(cx - 7, cy - 7, 3, cx, cy, 24);
  grad.addColorStop(0, cLight);
  grad.addColorStop(0.5, cBase);
  grad.addColorStop(1, cDark);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Gros yeux expressifs (blanc + grosse pupille + reflet)
  for (const ex of [x + 30, x + 50]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, y + 15, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22223a';
    ctx.beginPath();
    ctx.arc(ex, y + 16, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - 1.5, y + 14, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Moue (mignon mais menaçant)
  ctx.strokeStyle = '#22223a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, y + 32, 5, 0, Math.PI);
  ctx.stroke();
}

// Dessine un tir joueur : étoile/cœur blanc-cyan lumineux
function drawPlayerShot(ctx, proj) {
  ctx.save();
  ctx.fillStyle = '#00d4ff';
  ctx.globalAlpha = 0.9;

  // Cœur simple
  const x = proj.x;
  const y = proj.y;
  const size = 4;

  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y - size);
  ctx.lineTo(x + size + 2, y);
  ctx.lineTo(x, y + size + 2);
  ctx.lineTo(x - size - 2, y);
  ctx.lineTo(x - size, y - size);
  ctx.closePath();
  ctx.fill();

  // Glow blanc
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.7;
  ctx.stroke();

  ctx.restore();
}

// Dessine un tir ennemi : halo chaud orange/magenta
function drawEnemyShot(ctx, proj) {
  ctx.save();

  // Dégradé de halo chaud
  const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 6);
  gradient.addColorStop(0, '#ffff00');
  gradient.addColorStop(0.5, '#ff8800');
  gradient.addColorStop(1, 'rgba(255, 136, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(proj.x, proj.y, 6, 0, Math.PI * 2);
  ctx.fill();

  // Noyau solide
  ctx.fillStyle = '#ff6600';
  ctx.beginPath();
  ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Dessine un tir de boss : halo chaud saturé plus large
function drawBossShot(ctx, proj) {
  ctx.save();

  // Dégradé de halo chaud plus intense
  const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, 8);
  gradient.addColorStop(0, '#ffff00');
  gradient.addColorStop(0.4, '#ff4400');
  gradient.addColorStop(1, 'rgba(255, 68, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(proj.x, proj.y, 8, 0, Math.PI * 2);
  ctx.fill();

  // Noyau solide
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Décor dispersé du fond de MAP 2 — positions codées en dur (pas Math.random),
// cycle les 8 assets candy non-explosion pour un motif reconnaissable.
const CANDY_DECOR = [
  { x: 60, y: 70, asset: 'candypack1_candycane.png' },
  { x: 180, y: 130, asset: 'candypack1_candycorn.png' },
  { x: 300, y: 60, asset: 'candypack1_candyhumbug.png' },
  { x: 420, y: 150, asset: 'candypack1_lollipop_blue.png' },
  { x: 540, y: 80, asset: 'candypack1_lollipop_green.png' },
  { x: 660, y: 140, asset: 'candypack1_jellybig_red.png' },
  { x: 100, y: 320, asset: 'candypack1_bean_purple.png' },
  { x: 240, y: 400, asset: 'candypack1_heart_red.png' },
  { x: 380, y: 340, asset: 'candypack1_candycane.png' },
  { x: 520, y: 420, asset: 'candypack1_lollipop_blue.png' },
  { x: 650, y: 350, asset: 'candypack1_jellybig_red.png' },
  { x: 40, y: 500, asset: 'candypack1_candycorn.png' },
  { x: 720, y: 500, asset: 'candypack1_heart_red.png' },
];

// Dessine un fond distinct par map
function drawBackground(ctx, level) {
  let bgColor, starColor;

  if (level === 1) {
    // Ciel de nuages crème kawaii — dégradé doux + nuages STATIQUES codés en dur
    // (aucun Date.now/Math.random : le rendu reste déterministe par cohérence
    // avec le reste du projet, cf. consigne du patch rendu).
    const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    sky.addColorStop(0, '#ffe9cf');
    sky.addColorStop(1, '#fff7ec');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const CLOUDS = [
      { x: 120, y: 80 }, { x: 520, y: 60 }, { x: 300, y: 200 },
      { x: 660, y: 180 }, { x: 80, y: 330 }, { x: 440, y: 380 },
      { x: 700, y: 440 }, { x: 220, y: 500 },
    ];
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (const c of CLOUDS) {
      // Une bouffée = 3 arcs dans un seul path (union) -> nuage rond en couches
      ctx.beginPath();
      ctx.arc(c.x - 30, c.y, 22, 0, Math.PI * 2);
      ctx.arc(c.x, c.y - 6, 28, 0, Math.PI * 2);
      ctx.arc(c.x + 30, c.y, 22, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (level === 2) {
    // Pays de bonbons/réglisse
    bgColor = '#f0e6d2';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Décor dispersé (positions codées en dur, déterministe) — assets réels
    // Candy Pack 1 dessinés via drawImage, avec fallback forme si l'image
    // n'a pas fini de charger.
    for (const pos of CANDY_DECOR) {
      const img = renderState.images[pos.asset];
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, pos.x - 16, pos.y - 16, 32, 32);
      } else {
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  } else if (level === 3) {
    // Crépuscule stellaire sucré
    bgColor = '#1a0033';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Dégradé du haut vers le bas
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, '#4a0080');
    gradient.addColorStop(1, '#1a0033');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Étoiles scintillantes (pseudo-aléatoire déterministe)
    for (let i = 0; i < 50; i++) {
      const x = (i * 131 + level * 17) % GAME_WIDTH;
      const y = (i * 79 + level * 23) % GAME_HEIGHT;
      const size = (i % 3) + 1;
      ctx.fillStyle = '#ffff99';
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Ajoute une explosion à animer
function addExplosion(x, y) {
  renderState.explosions.push({
    x,
    y,
    startFrame: 0,
    frameCount: 0,
  });
}

// Dessine les explosions animées
function drawExplosions(ctx) {
  const frameDelay = 3; // frames entre chaque frame d'animation
  const framesToDisplay = 5; // affiche 5 frames d'explosion

  for (let i = renderState.explosions.length - 1; i >= 0; i--) {
    const exp = renderState.explosions[i];
    exp.frameCount++;

    const frameIndex = Math.floor(exp.frameCount / frameDelay);
    if (frameIndex >= framesToDisplay) {
      renderState.explosions.splice(i, 1);
      continue;
    }

    const img = renderState.images[`candypack1_explosionpink0${frameIndex + 1}.png`];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, exp.x - 20, exp.y - 20, 40, 40);
    } else {
      // Fallback : cercle explosif
      ctx.fillStyle = `rgba(255, 100, 200, ${0.8 - frameIndex * 0.15})`;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, 15 - frameIndex * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Polyfill pour roundRect si nécessaire
function drawRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Dessine le HUD chunky
function drawHUD(ctx, state) {
  // Fond semi-transparent du HUD
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  drawRoundRect(ctx, 5, 5, 200, 85, 10);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Texte gros et lisible
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`LEVEL: ${state.level}`, 15, 30);
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`SCORE: ${state.score}`, 15, 52);

  // Vies en petites bouilles (mini-visage du vaisseau : rond + 2 yeux)
  const viesX = 15;
  const viesY = 65;
  for (let i = 0; i < state.lives; i++) {
    const cx = viesX + i * 20;
    ctx.fillStyle = '#00d4ff';
    ctx.beginPath();
    ctx.arc(cx, viesY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx - 2, viesY - 1, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 2, viesY - 1, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // HP du boss si actif
  if (state.boss && state.boss.hp > 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    drawRoundRect(ctx, GAME_WIDTH - 210, 5, 200, 50, 10);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Barre HP en bonbon rose
    const maxHp = 25; // Voir data/bosses.mjs pour la vraie valeur max
    const hpRatio = state.boss.hp / maxHp;

    // Fond de la barre
    ctx.fillStyle = '#ff6699';
    drawRoundRect(ctx, GAME_WIDTH - 200, 15, 180, 20, 5);
    ctx.fill();

    // Barre remplie
    ctx.fillStyle = '#00ff99';
    const fillWidth = 180 * hpRatio;
    drawRoundRect(ctx, GAME_WIDTH - 200, 15, fillWidth, 20, 5);
    ctx.fill();

    // Texte HP
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`HP: ${state.boss.hp}`, GAME_WIDTH - 195, 32);
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.canvas.width = GAME_WIDTH;
  ctx.canvas.height = GAME_HEIGHT;

  // Charge les assets au premier rendu
  let assetsLoaded = false;
  let lastBossHp = null;

  return (state) => {
    if (!assetsLoaded) {
      loadAssets();
      assetsLoaded = true;
    }

    // Détecte les ennemis détruits et crée des explosions
    for (const oldEnemy of renderState.lastEnemies) {
      const stillAlive = state.enemies.some(e => e.x === oldEnemy.x && e.y === oldEnemy.y && e.hp === oldEnemy.hp);
      if (!stillAlive) {
        addExplosion(oldEnemy.x + 15, oldEnemy.y + 12);
      }
    }
    renderState.lastEnemies = state.enemies.map(e => ({ x: e.x, y: e.y, hp: e.hp }));

    // Détecte si le boss a reçu des dégâts
    if (state.boss && lastBossHp !== null && state.boss.hp < lastBossHp) {
      addExplosion(state.boss.x + 40, state.boss.y + 25);
    }
    lastBossHp = state.boss ? state.boss.hp : null;

    // Fond selon le niveau
    drawBackground(ctx, state.level);

    // Dessine les ennemis
    for (const enemy of state.enemies) {
      drawEnemy(ctx, enemy);
    }

    // Dessine les tirs
    for (const proj of state.playerProjectiles) {
      drawPlayerShot(ctx, proj);
    }

    // Différencie les tirs ennemi et boss
    if (state.boss) {
      for (const proj of state.enemyProjectiles) {
        // Si c'est un tir du boss (position plus haute)
        if (state.boss && Math.abs(proj.x - state.boss.x - state.boss.width / 2) < 100) {
          drawBossShot(ctx, proj);
        } else {
          drawEnemyShot(ctx, proj);
        }
      }
    } else {
      for (const proj of state.enemyProjectiles) {
        drawEnemyShot(ctx, proj);
      }
    }

    // Dessine le vaisseau
    const shipAlpha = state.ship.invincibilityMs > 0 ? 0.5 : 1;
    drawShip(ctx, state.ship.x, state.ship.y, shipAlpha);

    // Dessine le boss
    if (state.boss) {
      drawBoss(ctx, state.boss);
    }

    // Dessine les explosions
    drawExplosions(ctx);

    // Dessine le HUD
    drawHUD(ctx, state);
  };
}

// Crée une explosion quand un ennemi meurt (appelé par la logique via le hook)
export function onEnemyDestroyed(x, y) {
  addExplosion(x, y);
}

// Bascule l'overlay DOM (#overlay, classe `hidden`) selon l'état — appelé
// depuis la boucle de jeu à chaque frame (pas de polling setInterval côté
// HTML : la logique d'affichage suit l'état, elle ne le devine pas).
export function updateOverlay(state, els) {
  if (!els || !els.overlay) return;
  if (state.status === 'ACTIVE' || state.status === 'BOSS') {
    els.overlay.classList.add('hidden');
    return;
  }
  els.overlay.classList.remove('hidden');
  if (els.overlayText) {
    els.overlayText.textContent = state.status === 'WON' ? 'VICTORY!' : 'GAME OVER';
  }
}
