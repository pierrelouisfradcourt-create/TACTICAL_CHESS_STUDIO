// PONG — adaptateur AUDIO (ADAPTATEUR, jamais importe par la logique). Mappe les
// evenements de jeu emis par le loop pur en cues sonores et TRACE chaque
// declenchement. Le retour sonore reel (lecture du WAV) vit dans le backend
// navigateur ; ici, la partie mecaniquement verifiable = le mapping + la trace.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boot, step } from '../../../05_SYSTEMS/game_loop/loop.mjs';
import { translate } from '../../../05_SYSTEMS/input/input.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
// Assets audio deplaces vers 04_ASSETS/audio/ (repo_map: asset.audio). Depuis
// 06_RUNTIME/adapters/presentation/ : remonter 3 niveaux jusqu'a la racine du jeu.
export const ASSET_DIR = join(HERE, '..', '..', '..', '04_ASSETS', 'audio');
export const BOUNCE_ASSET = join(ASSET_DIR, 'bounce.wav');

// Vocabulaire de cue FERME : quel son declenche quel evenement.
export function cueFor(event) {
  if (event?.type === 'bounce') return 'bounce';
  if (event?.type === 'score') return 'score';
  return null;
}

// Adaptateur : consomme un flux d'evenements, produit une trace de cues. Le backend
// navigateur surchargerait play() pour jouer reellement le WAV (new Audio(...).play()).
export class AudioAdapter {
  constructor(assetPath = BOUNCE_ASSET) {
    this.assetPath = assetPath;
    this.trace = [];
  }

  onEvents(events) {
    for (const e of events || []) {
      const cue = cueFor(e);
      if (cue === 'bounce') this.trace.push({ cue, asset: 'bounce.wav', event: e });
      else if (cue) this.trace.push({ cue, event: e });
    }
  }

  bounceCount() {
    return this.trace.filter((t) => t.cue === 'bounce').length;
  }
}

// Preuve `artifact` (core.audio) : l'asset existe, et son declenchement AU REBOND
// est trace. Joue une partie jusqu'a obtenir un rebond et verifie la trace.
export function traceAudio(seed = 1, maxTicks = 5000) {
  const adapter = new AudioAdapter();
  let s = boot(seed);
  for (let i = 0; i < maxTicks && adapter.bounceCount() === 0; i += 1) {
    const raw = { p1: s.ball.y > s.p1.y + 12 ? 'down' : 'up', p2: s.ball.y > s.p2.y + 12 ? 'down' : 'up' };
    const { state: ns, events } = step(s, translate(raw));
    adapter.onEvents(events);
    s = ns;
  }
  const assetExists = existsSync(BOUNCE_ASSET);
  const assetBytes = assetExists ? readFileSync(BOUNCE_ASSET).length : 0;
  const bounces = adapter.bounceCount();
  return {
    passed: assetExists && assetBytes > 0 && bounces > 0,
    assetExists, assetBytes, bounceCuesTraced: bounces,
    firstTrace: adapter.trace[0] || null,
  };
}

if (process.argv[1]?.endsWith('audio.mjs')) {
  const r = traceAudio(1);
  process.stdout.write(JSON.stringify(r, null, 1) + '\n');
  process.exit(r.passed ? 0 : 1);
}
