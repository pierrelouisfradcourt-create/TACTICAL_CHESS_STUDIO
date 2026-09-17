// guild_manager — REJEU ANIMÉ d'un combat. Consomme les ÉVÉNEMENTS produits par
// combat.mjs (objets `{ t: … }`) et les met en scène : portraits face à face,
// barres de vie qui descendent, chiffres de dégâts qui s'envolent, secousses,
// bannières de compétence. Aucune règle de jeu ici : le combat est déjà joué,
// on le rejoue image par image.
import { CLASSES, TRAITS } from './data.mjs';
import { enemyGlyph, portraitSvg } from './portrait.mjs';
import { formatEvent } from './combat.mjs';

const BASE_STEP = 430;      // ms par événement à vitesse ×1
const FAST_EVENTS = new Set(['round', 'rest', 'status']);
const SPEEDS = [1, 2, 4];
const FX_LIFE = 950;

function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function hpClass(ratio) { return ratio <= 0 ? 'down' : ratio < 0.35 ? 'low' : ratio < 0.7 ? 'mid' : ''; }

export class CombatReplay {
  constructor(root, report, onClose) {
    this.root = root;
    this.report = report;
    this.onClose = onClose;
    this.events = report.log || [];
    this.index = 0;
    this.speed = 1;
    this.playing = false;
    this.timer = null;
    this.cards = new Map();   // nom → { el, bar, hpText, fx, hp, maxHp, downed }
    this.wave = 0;
  }

  // ------------------------------------------------------------- squelette
  mount() {
    const r = this.report;
    this.root.innerHTML = `
      <div class="rp">
        <div class="rp-head">
          <div><b>${esc(r.name)}</b> <span class="k">${r.wavesTotal} vague${r.wavesTotal > 1 ? 's' : ''} · difficulté ${r.difficulty}</span></div>
          <div class="rp-ctrl">
            <button data-rp="play">⏸ Pause</button>
            <button data-rp="speed">×1</button>
            <button data-rp="skip">⏭ Fin</button>
            <button data-rp="close">✕</button>
          </div>
        </div>
        <div class="rp-banner" id="rp-banner"></div>
        <div class="rp-field">
          <div class="rp-side" id="rp-party"></div>
          <div class="rp-vs">⚔</div>
          <div class="rp-side rp-foe" id="rp-enemies"></div>
        </div>
        <div class="rp-ticker" id="rp-ticker"></div>
        <div class="rp-result hidden" id="rp-result"></div>
      </div>`;
    this.banner = this.root.querySelector('#rp-banner');
    this.ticker = this.root.querySelector('#rp-ticker');
    this.resultEl = this.root.querySelector('#rp-result');
    this.partyEl = this.root.querySelector('#rp-party');
    this.enemyEl = this.root.querySelector('#rp-enemies');
    this.fieldEl = this.root.querySelector('.rp-field');
    this.root.querySelector('.rp-ctrl').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-rp]');
      if (!btn) return;
      const action = btn.dataset.rp;
      if (action === 'play') this.toggle();
      else if (action === 'speed') this.cycleSpeed();
      else if (action === 'skip') this.skip();
      else if (action === 'close') this.close();
    });
    this.play();
  }

  // --------------------------------------------------------------- cartes
  cardHtml(f, side) {
    const ratio = f.maxHp ? f.hp / f.maxHp : 0;
    const face = side === 'party' && !f.summon
      ? portraitSvg({ id: f.id ?? 0, name: f.name, classKey: f.classKey, race: f.race }, 56)
      : `<span class="glyph">${enemyGlyph(f.kind)}</span>`;
    const sub = f.summon ? 'invocation'
      : side === 'party' ? (CLASSES[f.classKey] ? CLASSES[f.classKey].name : '')
      : (f.boss ? 'chef' : f.row === 'back' ? 'arrière' : 'avant');
    return `<div class="rp-card ${f.downed ? 'is-down' : ''} ${f.boss ? 'is-boss' : ''} ${f.summon ? 'is-summon' : ''}" data-k="${esc(f.name)}">
      <div class="rp-pf">${face}</div>
      <div class="rp-name">${esc(f.name)}</div>
      <div class="rp-sub">${esc(sub)}</div>
      <div class="rp-bar"><span class="${hpClass(ratio)}" style="width:${Math.max(0, ratio * 100)}%"></span></div>
      <div class="rp-hp">${Math.max(0, f.hp)}/${f.maxHp}</div>
      <div class="rp-fx"></div>
    </div>`;
  }

  buildField(ev) {
    this.wave = ev.i;
    this.partyEl.innerHTML = ev.party.map((f) => this.cardHtml(f, 'party')).join('');
    this.enemyEl.innerHTML = ev.enemies.map((f) => this.cardHtml(f, 'enemy')).join('');
    this.cards.clear();
    for (const f of [...ev.party, ...ev.enemies]) {
      const el = this.root.querySelector(`.rp-card[data-k="${CSS.escape(f.name)}"]`);
      if (!el) continue;
      this.cards.set(f.name, { el, bar: el.querySelector('.rp-bar span'), hpText: el.querySelector('.rp-hp'), fx: el.querySelector('.rp-fx'), hp: f.hp, maxHp: f.maxHp, downed: f.downed });
    }
  }

  setHp(name, hp, maxHp, downed) {
    const c = this.cards.get(name);
    if (!c) return;
    c.hp = Math.max(0, hp); c.maxHp = maxHp || c.maxHp;
    const ratio = c.maxHp ? c.hp / c.maxHp : 0;
    c.bar.style.width = `${Math.max(0, ratio * 100)}%`;
    c.bar.className = hpClass(ratio);
    c.hpText.textContent = `${c.hp}/${c.maxHp}`;
    if (downed !== undefined) { c.downed = downed; c.el.classList.toggle('is-down', downed); }
  }

  // ------------------------------------------------------------ animations
  flash(name, cls) {
    const c = this.cards.get(name);
    if (!c || !this.animate) return;
    c.el.classList.remove(cls);
    void c.el.offsetWidth;                  // relance l'animation CSS
    c.el.classList.add(cls);
    setTimeout(() => c.el.classList.remove(cls), 520 / this.speed);
  }

  float(name, text, cls) {
    const c = this.cards.get(name);
    if (!c || !this.animate) return;
    const span = document.createElement('span');
    span.className = `fx-num ${cls}`;
    span.textContent = text;
    span.style.left = `${20 + Math.random() * 40}%`;
    c.fx.appendChild(span);
    setTimeout(() => span.remove(), FX_LIFE);
  }

  showBanner(text, cls = '') {
    if (!this.animate) return;
    this.banner.textContent = text;
    this.banner.className = `rp-banner show ${cls}`;
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => { this.banner.className = 'rp-banner'; }, 900 / this.speed);
  }

  tick(ev) {
    const line = formatEvent(ev);
    if (!line) return;
    const div = document.createElement('div');
    div.textContent = line;
    if (ev.t === 'wave' || ev.t === 'waveEnd' || ev.t === 'end') div.className = 'lw';
    else if (ev.t === 'round') div.className = 'lt';
    this.ticker.appendChild(div);
    while (this.ticker.childElementCount > 40) this.ticker.firstElementChild.remove();
    this.ticker.scrollTop = this.ticker.scrollHeight;
  }

  // ------------------------------------------------------------ événements
  apply(ev) {
    switch (ev.t) {
      case 'wave':
        this.buildField(ev);
        this.showBanner(`Vague ${ev.i}`, 'big');
        break;
      case 'round':
        break;
      case 'hit': {
        this.flash(ev.a, 'is-acting');
        this.flash(ev.d, ev.crit ? 'is-crit-hit' : 'is-hit');
        this.float(ev.d, `−${ev.dmg}`, ev.crit ? 'crit' : ev.dSide === 'party' ? 'dmg-in' : 'dmg');
        if (ev.crit) this.shake();
        this.setHp(ev.d, ev.hp, ev.maxHp, ev.down ? true : undefined);
        if (ev.action && ev.action !== 'Attaque') this.showBanner(ev.action);
        break;
      }
      case 'miss':
        this.flash(ev.a, 'is-acting');
        this.float(ev.d, 'raté', 'miss');
        break;
      case 'heal':
        this.flash(ev.a, 'is-acting');
        this.flash(ev.d, 'is-healed');
        this.float(ev.d, `+${ev.amount}`, 'heal');
        this.setHp(ev.d, ev.hp, ev.maxHp);
        if (ev.action) this.showBanner(ev.action, 'good');
        break;
      case 'poison':
        this.flash(ev.d, 'is-poison');
        this.float(ev.d, `−${ev.dmg}`, 'poison');
        this.setHp(ev.d, ev.hp, ev.maxHp, ev.down ? true : undefined);
        break;
      case 'stunned':
        this.float(ev.d, 'étourdi', 'miss');
        break;
      case 'status':
        this.float(ev.d, ev.kind === 'poison' ? 'poison' : ev.kind === 'stun' ? 'gelé' : ev.kind, 'status');
        break;
      case 'aura':
        this.flash(ev.a, 'is-acting');
        this.showBanner(ev.action, ev.target === 'party' || ev.target === 'self' ? 'good' : 'bad');
        break;
      case 'secondWind':
        this.flash(ev.d, 'is-healed');
        this.float(ev.d, 'Debout !', 'heal');
        this.setHp(ev.d, ev.hp, ev.maxHp, false);
        this.showBanner('Il refuse de tomber !', 'good');
        break;
      case 'revive':
        this.flash(ev.d, 'is-healed');
        this.float(ev.d, 'Relevé !', 'heal');
        this.setHp(ev.d, ev.hp, ev.maxHp, false);
        this.showBanner('Résurrection', 'good');
        break;
      case 'summon': {
        // L'invocation apparaît en cours de vague : on lui crée sa carte.
        const el = document.createElement('div');
        el.innerHTML = this.cardHtml({ ...ev, name: ev.d, summon: true, downed: false }, 'party');
        const card = el.firstElementChild;
        this.partyEl.appendChild(card);
        this.cards.set(ev.d, { el: card, bar: card.querySelector('.rp-bar span'), hpText: card.querySelector('.rp-hp'), fx: card.querySelector('.rp-fx'), hp: ev.hp, maxHp: ev.maxHp, downed: false });
        this.flash(ev.a, 'is-acting');
        this.flash(ev.d, 'is-healed');
        this.showBanner(ev.action, 'good');
        break;
      }
      case 'frenzy':
        this.flash(ev.d, 'is-healed');
        this.float(ev.d, 'Soif de sang', 'status');
        break;
      case 'rest':
        this.float(ev.d, `+${ev.amount}`, 'heal');
        this.setHp(ev.d, ev.hp, ev.maxHp);
        break;
      case 'waveEnd':
        this.showBanner(ev.cleared ? 'Vague nettoyée' : 'Vague perdue', ev.cleared ? 'good' : 'bad');
        break;
      case 'end':
        this.finish();
        break;
      default:
        break;
    }
    this.tick(ev);
  }

  shake() {
    if (!this.animate) return;
    this.fieldEl.classList.remove('shake');
    void this.fieldEl.offsetWidth;
    this.fieldEl.classList.add('shake');
    setTimeout(() => this.fieldEl.classList.remove('shake'), 400);
  }

  // ------------------------------------------------------------- lecture
  get animate() { return this.playing || this.stepping; }

  next() {
    if (this.index >= this.events.length) { this.finish(); return; }
    const ev = this.events[this.index++];
    this.apply(ev);
    if (!this.playing) return;
    const wait = (FAST_EVENTS.has(ev.t) ? BASE_STEP * 0.35 : BASE_STEP) / this.speed;
    this.timer = setTimeout(() => this.next(), wait);
  }

  play() {
    if (this.index >= this.events.length) return;
    this.playing = true;
    this.setPlayLabel();
    this.next();
  }

  pause() {
    this.playing = false;
    clearTimeout(this.timer);
    this.setPlayLabel();
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  setPlayLabel() {
    const btn = this.root.querySelector('[data-rp="play"]');
    if (btn) btn.textContent = this.playing ? '⏸ Pause' : '▶ Lire';
  }

  cycleSpeed() {
    this.speed = SPEEDS[(SPEEDS.indexOf(this.speed) + 1) % SPEEDS.length];
    const btn = this.root.querySelector('[data-rp="speed"]');
    if (btn) btn.textContent = `×${this.speed}`;
  }

  // Applique tout ce qui reste sans animation, puis affiche le bilan.
  skip() {
    this.pause();
    this.stepping = false;
    while (this.index < this.events.length) {
      const ev = this.events[this.index++];
      if (ev.t === 'wave') this.buildField(ev);
      else if (ev.t === 'summon') this.apply(ev);
      else if (ev.t === 'hit' || ev.t === 'poison') this.setHp(ev.d, ev.hp, ev.maxHp, ev.down ? true : undefined);
      else if (ev.t === 'heal' || ev.t === 'rest') this.setHp(ev.d, ev.hp, ev.maxHp);
      else if (ev.t === 'secondWind' || ev.t === 'revive') this.setHp(ev.d, ev.hp, ev.maxHp, false);
    }
    this.finish();
  }

  finish() {
    this.pause();
    const r = this.report;
    const mvp = [...r.party].sort((a, b) => (b.dealt + b.healed) - (a.dealt + a.healed))[0];
    const lines = r.party.map((p) => {
      const traits = (p.traits || []).map((k) => TRAITS[k] && TRAITS[k].icon).filter(Boolean).join('');
      return `<div class="rp-line ${p.downed ? 'ko' : ''}"><b>${esc(p.name)}</b> ${traits}
        <span class="k">${p.downed ? 'à terre' : `${p.hp}/${p.maxHp} PV`}</span>
        <span class="k">${p.dealt} dégâts${p.healed ? ` · ${p.healed} soins` : ''}${p.kills ? ` · ${p.kills} K.O.` : ''}</span></div>`;
    }).join('');
    this.resultEl.className = `rp-result ${r.success ? 'ok' : 'ko'}`;
    this.resultEl.innerHTML = `
      <h3>${r.success ? 'MISSION RÉUSSIE' : 'MISSION ÉCHOUÉE'}</h3>
      <div class="rp-rewards">${r.success
        ? `<span class="gain">+${r.gold} or</span><span class="gain">+${r.rep} réputation</span><span class="gain">+${r.xpEach} xp chacun</span>${r.loot ? '<span class="gain">butin trouvé</span>' : ''}`
        : `<span class="k">${r.wavesCleared}/${r.wavesTotal} vagues · xp de consolation ${r.xpEach}</span>`}</div>
      ${mvp && (mvp.dealt || mvp.healed) ? `<div class="rp-mvp">Héros du jour : <b>${esc(mvp.name)}</b> (${mvp.dealt} dégâts, ${mvp.healed} soins)</div>` : ''}
      <div class="rp-lines">${lines}</div>
      <button class="primary" data-rp="close">Fermer</button>`;
    this.resultEl.querySelector('[data-rp="close"]').addEventListener('click', () => this.close());
  }

  close() {
    this.pause();
    clearTimeout(this.bannerTimer);
    this.root.innerHTML = '';
    if (this.onClose) this.onClose();
  }
}
