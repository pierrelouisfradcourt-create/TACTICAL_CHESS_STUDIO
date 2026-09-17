// guild_manager — ENTRÉES : traduit les clics (data-action) en appels à
// guild.mjs, tient l'état d'interface (onglet, composition d'équipe, message)
// et redessine. Aucune règle de jeu ici.
import {
  assignToSquad, buyAndEquip, buyItem, buyPotion, changeCraft, createGuild, dismiss, endDay, equip, fillSquadsFromQueue,
  optimizeEquipment, recruit, renameSquad, rerollTavern, restore, sellItem, sendMission, sendSquad, snapshot,
  switchClass, unequip, upgradeBuilding, useScroll,
} from './guild.mjs';
import { resetLoadout, toggleSkill } from './adventurer.mjs';
import { CombatReplay } from './replay.mjs';
import { botPlayDay } from './bot.mjs';
import { renderAll } from './render.mjs';

const SAVE_KEY = 'guild_manager_save_v1';

export class InputHandler {
  constructor(root, seed = 12345) {
    this.root = root;
    this.state = createGuild(seed);
    this.ui = { tab: 'missions', composing: null, selected: [], message: '', sheet: null };
    this.replayEl = root.querySelector('#replay');
    this.replay = null;
  }

  // Rejeu animé d'un combat déjà résolu (les événements sont dans le rapport).
  openReplay(missionId) {
    const report = this.state.reports.find((r) => r.missionId === missionId);
    if (!report || !this.replayEl) return;
    if (this.replay) this.replay.close();
    this.replayEl.classList.remove('hidden');
    this.replay = new CombatReplay(this.replayEl, report, () => {
      this.replayEl.classList.add('hidden');
      this.replay = null;
      this.render();
    });
    this.replay.mount();
  }

  render() { renderAll(this.root, this.state, this.ui); }

  report(result, okMessage = '') {
    this.ui.message = result.ok ? okMessage : `Impossible : ${result.reason}`;
    this.render();
    return result;
  }

  setTab(tab) { this.ui.tab = tab; this.ui.message = ''; this.render(); }
  openSheet(advId) { this.ui.sheet = advId; this.render(); }
  closeSheet() { this.ui.sheet = null; this.render(); }
  upgrade(key) { const r = upgradeBuilding(this.state, key); return this.report(r, r.ok ? `Bâtiment amélioré (niveau ${r.level}). Reste ${this.state.gold} or.` : ''); }
  buyPotion(key, qty) { const r = buyPotion(this.state, key, qty); return this.report(r, r.ok ? `Potions achetées pour ${r.cost} or.` : ''); }
  toggleSkill(advId, key) {
    const adv = this.state.roster.find((a) => a.id === advId);
    if (!adv) return;
    return this.report(toggleSkill(adv, key), 'Compétences mises à jour.');
  }
  resetSkills(advId) {
    const adv = this.state.roster.find((a) => a.id === advId);
    if (!adv) return;
    resetLoadout(adv);
    return this.report({ ok: true }, 'Sélection automatique rétablie.');
  }
  assign(advId, value) {
    const squadId = value === 'reserve' ? null : Number(value);
    const r = assignToSquad(this.state, advId, squadId);
    return this.report(r, r.ok ? (r.squad ? `Affecté à ${r.squad.name}.` : 'Placé en réserve.') : '');
  }
  fillSquads() {
    const r = fillSquadsFromQueue(this.state);
    return this.report(r, r.placed ? `${r.placed} aventurier${r.placed > 1 ? 's' : ''} intégré${r.placed > 1 ? 's' : ''} aux escouades.` : 'Personne de prêt à intégrer.');
  }
  renameSquad(squadId, name) { return this.report(renameSquad(this.state, squadId, name), 'Escouade renommée.'); }
  sendSquad(missionId, squadId) {
    const r = sendSquad(this.state, missionId, squadId);
    return this.report(r, r.ok ? `${r.mission.name} : l’escouade part pour ${r.mission.duration} j.` : '');
  }
  optimize(advId) {
    const r = optimizeEquipment(this.state, advId);
    return this.report(r, r.ok ? (r.changed ? `${r.changed} objet${r.changed > 1 ? 's' : ''} équipé${r.changed > 1 ? 's' : ''}.` : 'Rien de mieux dans le sac.') : '');
  }
  toggleInvFilter() { this.ui.invAll = !this.ui.invAll; this.render(); }
  setCraft(advId, craftKey) {
    const r = changeCraft(this.state, advId, craftKey);
    return this.report(r, r.ok ? `Métier changé${r.cost ? ` (${r.cost} or)` : ''}.` : '');
  }
  reroll() { const r = rerollTavern(this.state); return this.report(r, r.ok ? `Nouveaux candidats (${r.cost} or).` : ''); }
  useScroll(key, advId) { const r = useScroll(this.state, key, advId); return this.report(r, r.ok ? 'Parchemin utilisé.' : ''); }

  compose(missionId) { this.ui.composing = missionId; this.ui.selected = []; this.ui.tab = 'missions'; this.render(); }
  cancelCompose() { this.ui.composing = null; this.ui.selected = []; this.render(); }

  toggleSelect(advId) {
    const i = this.ui.selected.indexOf(advId);
    if (i >= 0) this.ui.selected.splice(i, 1); else this.ui.selected.push(advId);
    this.render();
  }

  send(missionId, advIds = this.ui.selected) {
    const r = sendMission(this.state, missionId, advIds);
    if (r.ok) { this.ui.composing = null; this.ui.selected = []; }
    return this.report(r, r.ok ? `${r.mission.name} : équipe envoyée.` : '');
  }

  endDay() {
    const before = this.state.reports.length ? this.state.reports[0] : null;
    const r = endDay(this.state);
    this.ui.composing = null; this.ui.selected = [];
    const latest = this.state.reports[0];
    if (latest && latest !== before) {
      this.ui.tab = 'journal';
      this.report(r, `Jour ${this.state.day} — ${latest.name} : ${latest.success ? 'succès' : 'échec'}.`);
      this.openReplay(latest.missionId);
      return r;
    }
    return this.report(r, `Jour ${this.state.day}.`);
  }

  botDay() { const r = botPlayDay(this.state); this.ui.composing = null; this.ui.selected = []; return this.report(r, 'Le régisseur a joué la journée.'); }

  recruit(id) { return this.report(recruit(this.state, id), 'Recrue engagée.'); }
  dismiss(id) { return this.report(dismiss(this.state, id), 'Aventurier renvoyé.'); }
  buy(id) {
    const r = buyItem(this.state, id);
    return this.report(r, r.ok ? `${r.item.name} acheté pour ${r.item.price} or → inventaire (reste ${this.state.gold} or).` : '');
  }
  buyEquip(itemId, advId) {
    const r = buyAndEquip(this.state, itemId, advId);
    const adv = this.state.roster.find((a) => a.id === advId);
    return this.report(r, r.ok ? `${r.item.name} acheté (${r.gold} or) et équipé sur ${adv.name}. Reste ${this.state.gold} or.` : '');
  }
  sell(id) { const r = sellItem(this.state, id); return this.report(r, r.ok ? `Vendu pour ${r.gold} or.` : ''); }
  equip(advId, itemId) {
    const r = equip(this.state, advId, itemId);
    return this.report(r, r.ok ? (r.previous ? `Équipé. ${r.previous.name} retourne à l’inventaire.` : 'Équipé.') : '');
  }
  unequip(advId, slot) { return this.report(unequip(this.state, advId, slot), 'Retiré.'); }
  switchClass(advId, cls) {
    const r = switchClass(this.state, advId, cls);
    return this.report(r, r.ok ? (r.cost ? `Voie ouverte pour ${r.cost} or.` : 'Classe changée (les niveaux acquis sont conservés).') : '');
  }

  newGame(seed = 12345) {
    this.state = createGuild(seed);
    this.ui = { tab: 'missions', composing: null, selected: [], message: 'Nouvelle partie.', sheet: null };
    this.render();
  }

  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot(this.state))); this.ui.message = 'Partie sauvegardée.'; }
    catch { this.ui.message = 'Sauvegarde impossible (stockage indisponible).'; }
    this.render();
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { this.ui.message = 'Aucune sauvegarde.'; }
      else { this.state = restore(JSON.parse(raw)); this.ui = { tab: 'missions', composing: null, selected: [], message: 'Partie chargée.', sheet: null }; }
    } catch { this.ui.message = 'Sauvegarde illisible.'; }
    this.render();
  }

  // Dispatch d'un clic/changement sur un élément portant data-action.
  dispatch(el) {
    const { action, id, slot, tab } = el.dataset;
    const num = Number(id);
    switch (action) {
      case 'tab': return this.setTab(tab);
      case 'compose': return this.compose(num);
      case 'cancel-compose': return this.cancelCompose();
      case 'toggle-select': return this.toggleSelect(num);
      case 'send': return this.send(num);
      case 'endday': return this.endDay();
      case 'botday': return this.botDay();
      case 'recruit': return this.recruit(num);
      case 'dismiss': return this.dismiss(num);
      case 'buy': return this.buy(num);
      case 'sell': return this.sell(num);
      case 'unequip': return this.unequip(num, slot);
      case 'equip-select': return el.value ? this.equip(num, Number(el.value)) : undefined;
      case 'equip-item': return el.value ? this.equip(Number(el.value), num) : undefined;
      case 'buy-equip': return el.value ? this.buyEquip(num, Number(el.value)) : undefined;
      case 'switch-class': return el.value ? this.switchClass(num, el.value) : undefined;
      case 'open-sheet': return this.openSheet(num);
      case 'close-sheet': return this.closeSheet();
      case 'equip-from-sheet': return this.equip(num, Number(el.dataset.item));
      case 'upgrade': return this.upgrade(id);
      case 'buy-potion': return this.buyPotion(id, Number(el.dataset.qty || 1));
      case 'use-scroll': return el.value ? this.useScroll(id, Number(el.value)) : undefined;
      case 'reroll': return this.reroll();
      case 'replay': return this.openReplay(num);
      case 'optimize': return this.optimize(num);
      case 'inv-filter': return this.toggleInvFilter();
      case 'set-craft': return el.value ? this.setCraft(num, el.value) : undefined;
      case 'toggle-skill': return this.toggleSkill(num, el.dataset.skill);
      case 'reset-skills': return this.resetSkills(num);
      case 'assign': return el.value ? this.assign(num, el.value) : undefined;
      case 'rename-squad': return this.renameSquad(num, el.value);
      case 'send-squad': return this.sendSquad(num, Number(el.dataset.squad));
      case 'fill-squads': return this.fillSquads();
      case 'newgame': return this.newGame();
      case 'save': return this.save();
      case 'load': return this.load();
      default: return undefined;
    }
  }

  attach() {
    this.root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (!el || el.tagName === 'SELECT' || el.type === 'checkbox') return;
      this.dispatch(el);
    });
    this.root.addEventListener('change', (e) => {
      const el = e.target.closest('[data-action]');
      if (el && (el.tagName === 'SELECT' || el.tagName === 'INPUT')) this.dispatch(el);
    });
    this.render();
  }
}
