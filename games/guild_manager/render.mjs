// guild_manager — RENDU DOM. Aucune logique de jeu ici : on lit l'état de
// guilde + l'état d'interface (onglet, sélection) et on produit du HTML.
// Chaque bouton porte data-action / data-id ; input.mjs les interprète.
import { ABILITY_TEXT, BUILDINGS, CLASSES, CONSTANTS, CRAFTS, CRAFT_CHANGE_COST, MISSION_TYPES, POTIONS, RACES, ROLES, SCROLLS, SEALS, SKILLS, SKILL_ROLES, THEMES, TRAITS, WEAPON_NAMES } from './data.mjs';
import { enemyGlyph, portraitSvg } from './portrait.mjs';
import { formatEvent } from './combat.mjs';
import { STAT_KEYS, SLOTS, classLevel, classOptions, computePower, computeStats, canEquip, craftProgress, focusMultiplier, itemAffinityBonus, learnedSkills, powerGainIfEquipped, recruitCost, titleOf, totalLevel, wageOf, xpToNext } from './adventurer.mjs';
import { teamPower } from './missions.mjs';
import { bestiaryEntries, buildingLevel, craftBonuses, dailyWages, estimateWithPotions, findAdventurer, isReadyForSquad, maxRoster, maxSquads, moraleBonus, pendingGold, potionsForSale, rankOf, rivalLeads, scrollsForSale, squadComposition, squadMembers, squadOf, squadRank, trainingQueue, upgradeOptions } from './guild.mjs';

const SLOT_NAMES = { weapon: 'Arme', armor: 'Armure', accessory: 'Accessoire' };
const STATUS_NAMES = { available: 'Disponible', mission: 'En mission', injured: 'Blessé' };

function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function pct(p) { return `${Math.round(p * 100)} %`; }

function gainText(gain) { return gain > 0 ? `+${gain}` : gain === 0 ? '±0' : `${gain}`; }

// Pour un objet, les aventuriers (hors mission) qui peuvent le porter, triés
// par gain de puissance décroissant.
function wearers(state, item) {
  return state.roster
    .filter((a) => a.status !== 'mission' && canEquip(a, item))
    .map((a) => ({ adv: a, gain: powerGainIfEquipped(a, item) }))
    .sort((x, y) => y.gain - x.gain);
}

function wearerSelect(action, item, list, label) {
  if (!list.length) return '<span class="k">Personne ne peut le porter (classe incompatible ou en mission).</span>';
  return `<select data-action="${action}" data-id="${item.id}"><option value="">${label}</option>${
    list.map(({ adv, gain }) => `<option value="${adv.id}">${esc(adv.name)} (${esc(CLASSES[adv.classKey].name)}) → puissance ${gainText(gain)}</option>`).join('')
  }</select>`;
}

function traitChips(adv, withText = false) {
  if (!adv.traits || !adv.traits.length) return '';
  return `<span class="traits">${adv.traits.map((k) => {
    const t = TRAITS[k];
    return t ? `<span class="tr" title="${esc(t.text)}">${t.icon} ${esc(t.name)}${withText ? ` <i>${esc(t.text)}</i>` : ''}</span>` : '';
  }).join('')}</span>`;
}

function raceChip(adv) {
  const race = RACES[adv.race];
  return race ? `<span class="race" title="${esc(race.text)}">${race.icon} ${esc(race.name)}</span>` : '';
}

function craftChip(adv) {
  const craft = CRAFTS[adv.craft];
  if (!craft) return '';
  const p = craftProgress(adv);
  return `<span class="craft" title="${esc(craft.text)}">${craft.icon} ${esc(craft.name)} ${p.level}/${p.max}</span>`;
}

function titleChip(adv) {
  const title = titleOf(adv);
  return title ? `<span class="title">${esc(title)}</span>` : '';
}

function statsLine(stats) {
  return STAT_KEYS.map((k) => `<span class="st"><i>${k.toUpperCase()}</i>${stats[k]}</span>`).join('');
}

export function renderHeader(state) {
  const outcome = state.outcome === 'victory' ? '<span class="win">VICTOIRE</span>'
    : state.outcome === 'defeat' ? '<span class="lose">DÉFAITE</span>' : '';
  return `
    <span>Jour <b id="hud-day">${state.day}</b></span>
    <span>Or <b id="hud-gold">${state.gold}</b></span>
    <span>Rang <b id="hud-rank">${rankOf(state)}</b></span>
    <span>Réputation <b id="hud-rep">${state.reputation}</b></span>
    <span>Salaires/jour <b id="hud-wages">${dailyWages(state)}</b></span>
    <span>Aventuriers <b id="hud-roster">${state.roster.length}/${maxRoster(state)}</b></span>
    <span>Potions <b id="hud-potions">${Object.values(state.potions).reduce((a, b) => a + b, 0)}</b></span>
    ${moraleBonus(state) ? `<span>Moral <b id="hud-morale">+${Math.round(moraleBonus(state) * 100)} %</b></span>` : ''}
    <span class="${rivalLeads(state) ? 'rivalahead' : ''}">${esc(state.rival.name)} <b id="hud-rival">${state.rival.reputation}</b> rép.</span>
    ${outcome}`;
}

// Ligne d'économie : combien de jours l'or couvre les salaires, et ce que
// rapporteront les missions en cours si elles réussissent.
export function renderEconomy(state) {
  const wages = dailyWages(state);
  const days = wages > 0 ? Math.floor(state.gold / wages) : Infinity;
  const level = days <= 2 ? 'crit' : days <= 5 ? 'warn' : 'fine';
  const daysText = wages > 0 ? `${days} j` : '∞';
  const pending = pendingGold(state);
  return `<span class="eco ${level}">Trésorerie : <b>${state.gold} or</b> couvre <b>${daysText}</b> de salaires (${wages} or/soir)</span>
    <span class="eco">Missions en cours : jusqu’à <b>+${pending} or</b> au retour</span>
    ${level !== 'fine' ? '<span class="eco warnmsg">Gardez de l’or pour les salaires : 3 soirs impayés et un vétéran s’en va.</span>' : ''}`;
}

function equipmentBlock(adv, state, ui) {
  const slots = SLOTS.map((slot) => {
    const it = adv.equipment[slot];
    const label = it ? `${esc(it.name)}` : '<em>vide</em>';
    const btn = it && adv.status !== 'mission' ? ` <button data-action="unequip" data-id="${adv.id}" data-slot="${slot}" title="Retirer">✕</button>` : '';
    return `<div class="slot"><span class="k">${SLOT_NAMES[slot]}</span> ${label}${btn}</div>`;
  }).join('');
  const options = state.inventory.filter((it) => canEquip(adv, it));
  const select = options.length && adv.status !== 'mission'
    ? `<select data-action="equip-select" data-id="${adv.id}"><option value="">Équiper depuis l’inventaire (${options.length})…</option>${
      options.map((it) => `<option value="${it.id}">${esc(it.name)} → puissance ${gainText(powerGainIfEquipped(adv, it))}</option>`).join('')
    }</select>` : adv.status !== 'mission' ? '<span class="k">Inventaire : aucun objet compatible — achetez à la boutique.</span>' : '';
  return `<div class="equipment">${slots}${select}</div>`;
}

// Panneau des classes : niveaux pratiqués, capacité active, menu de changement.
// Compétences portées : celles de la classe active et celles héritées des
// classes maîtrisées (marquées par leur origine).
function roleTag(key) {
  const role = SKILL_ROLES[SKILLS[key].role];
  return role ? `<span class="rtag ${SKILLS[key].role}">${role.icon} ${role.short}</span>` : '';
}

function skillChips(adv) {
  const learned = learnedSkills(adv);
  let rank = 0;
  return learned.all.map((k) => {
    const sk = SKILLS[k];
    const origin = (learned.available.find((x) => x.key === k) || {}).origin;
    const inherited = origin !== adv.classKey;
    const passive = sk.kind === 'passive';
    if (!passive) rank += 1;
    return `<span class="sk ${inherited ? 'herit' : ''} ${passive ? 'pass' : ''}" title="${esc(sk.text)}${inherited ? ` (héritée de ${esc(CLASSES[origin].name)})` : ''}">
      <b>${passive ? '∞' : `${rank}.`}</b> ${esc(sk.name)} ${roleTag(k)}${inherited ? ` <i>★ ${esc(CLASSES[origin].name)}</i>` : ''}</span>`;
  }).join('') || '<span class="k">Aucune compétence : il ne fera qu’attaquer.</span>';
}

// Panneau de choix : toutes les compétences accessibles, l'ordre de sélection
// donnant l'ordre de priorité en combat.
function skillPicker(adv) {
  const learned = learnedSkills(adv);
  const chosen = new Set(learned.all);
  const rows = learned.available.map(({ key, origin, fromActive }) => {
    const sk = SKILLS[key];
    const passive = sk.kind === 'passive';
    const rank = passive ? -1 : learned.all.filter((k) => SKILLS[k].kind === 'active').indexOf(key);
    const full = !chosen.has(key) && learned.all.length >= learned.capacity;
    return `<label class="skrow ${chosen.has(key) ? 'on' : ''} ${full ? 'full' : ''} ${passive ? 'pass' : ''}">
      <input type="checkbox" data-action="toggle-skill" data-id="${adv.id}" data-skill="${key}" ${chosen.has(key) ? 'checked' : ''} ${full ? 'disabled' : ''}>
      <span class="order">${passive ? '∞' : rank >= 0 ? rank + 1 : '—'}</span>
      <span class="sname">${esc(sk.name)}</span>
      ${roleTag(key)}
      <span class="k">${passive ? 'passive' : 'active'}${sk.mp ? ` · ${sk.mp} PM` : ''}${sk.cd && sk.cd < 99 ? ` · recharge ${sk.cd}` : ''} · ${fromActive ? esc(CLASSES[origin].name) : `★ ${esc(CLASSES[origin].name)}`}</span>
      <span class="k stext">${esc(sk.text)}</span>
    </label>`;
  }).join('');
  return `<div class="picker">
    <div class="row"><b>${learned.all.length}/${learned.capacity}</b> compétences portées
      <span class="k">${learned.all.filter((k) => SKILLS[k].kind === 'active').length} active(s) — l’ordre de sélection est leur ordre de priorité — et ${learned.all.filter((k) => SKILLS[k].kind === 'passive').length} passive(s), toujours en vigueur.</span>
      <button data-action="reset-skills" data-id="${adv.id}">Sélection automatique</button></div>
    ${rows}</div>`;
}

function classLine(adv) {
  return Object.entries(adv.classLevels)
    .sort((a, b) => b[1] - a[1])
    .map(([k, l]) => `<span class="cl ${k === adv.classKey ? 'on' : ''}">${esc(CLASSES[k].name)} ${l}${l >= CONSTANTS.MASTERY_LEVEL ? ' ★' : ''}</span>`)
    .join('');
}

function classOptionLabel(adv, o) {
  if (o.active) return `${o.name} (classe actuelle)`;
  if (o.tier === 1) return `${o.name} niv. ${o.level || 1} — gratuit`;
  if (o.requirementsMet) return `${o.name}${o.cost ? ` — ouvrir pour ${o.cost} or` : ` niv. ${o.level || 1} — ouverte`}`;
  const need = o.from.map((k) => `${CLASSES[k].name} ${Math.min(classLevel(adv, k), CONSTANTS.MASTERY_LEVEL)}/${CONSTANTS.MASTERY_LEVEL}`).join(', ');
  return `${o.name} — requiert ${o.need} maîtrises parmi ${need}`;
}

function classPanel(adv, state) {
  if (adv.status !== 'available') return '';
  const opts = classOptions(adv).filter((o) => !o.active);
  const groups = [1, 2, 3].map((tier) => {
    const list = opts.filter((o) => o.tier === tier);
    const label = tier === 1 ? 'Classes de base (libre)' : tier === 2 ? 'Classes avancées (2 bases ★)' : 'Classes légendaires (2 avancées ★)';
    return `<optgroup label="${label}">${list.map((o) => {
      const disabled = !o.requirementsMet || state.gold < o.cost;
      return `<option value="${o.classKey}" ${disabled ? 'disabled' : ''}>${esc(classOptionLabel(adv, o))}</option>`;
    }).join('')}</optgroup>`;
  }).join('');
  return `<div class="promo"><select data-action="switch-class" data-id="${adv.id}"><option value="">Changer de classe…</option>${groups}</select></div>`;
}

function adventurerCard(adv, state, ui) {
  const cls = CLASSES[adv.classKey];
  const stats = computeStats(adv);
  const selectable = ui.composing && adv.status === 'available';
  const selected = ui.selected.includes(adv.id);
  const check = selectable ? `<label class="pick"><input type="checkbox" data-action="toggle-select" data-id="${adv.id}" ${selected ? 'checked' : ''}> Sélectionner</label>` : '';
  const mission = adv.status === 'mission' ? state.active.find((m) => m.id === adv.missionId) : null;
  const statusText = adv.status === 'mission' && mission ? `En mission (${mission.daysLeft} j)` : adv.status === 'injured' ? `Blessé (${adv.injuredDays} j)` : STATUS_NAMES[adv.status];
  const dismissBtn = adv.status !== 'mission' ? `<button class="danger" data-action="dismiss" data-id="${adv.id}">Renvoyer</button>` : '';
  return `<div class="card adv ${adv.status} ${selected ? 'sel' : ''}" data-adv="${adv.id}">
    <div class="row head"><button class="pfbtn" data-action="open-sheet" data-id="${adv.id}" title="Ouvrir la fiche de ${esc(adv.name)}">${portraitSvg(adv, 44)}</button>
      <div class="ident"><button class="namebtn" data-action="open-sheet" data-id="${adv.id}">${esc(adv.name)}</button> ${titleChip(adv)}
        <div class="cls">${raceChip(adv)} ${esc(cls.name)} ${classLevel(adv)} · ${ROLES[cls.role]}</div></div>
      <span class="status">${statusText}</span></div>
    <div class="row">${traitChips(adv)}${craftChip(adv)}</div>
    <div class="row"><span class="xpbar" title="xp de la classe active"><span style="width:${Math.min(100, Math.round((adv.xp / xpToNext(classLevel(adv))) * 100))}%"></span></span> ${adv.xp}/${xpToNext(classLevel(adv))} xp · niveau total <b>${totalLevel(adv)}</b> · Puissance <b>${computePower(adv)}</b> · Salaire ${wageOf(adv)}/soir</div>
    <div class="row stats">${statsLine(stats)}</div>
    <div class="row classes">${classLine(adv)}</div>
    ${focusMultiplier(adv) < 1 ? `<div class="warnline">Dispersion : ${Object.keys(adv.classLevels).length} classes pratiquées — apprentissage à ${Math.round(focusMultiplier(adv) * 100)} % et croissance des classes secondaires réduite de moitié. Se spécialiser paie.</div>` : ''}
    <div class="ability">${cls.row === 'front' ? '⚔ Ligne avant' : '🏹 Ligne arrière'} · ${esc(ABILITY_TEXT[cls.ability])}</div>
    <div class="skills">${skillChips(adv)}</div>
    ${equipmentBlock(adv, state, ui)}
    ${classPanel(adv, state)}
    <div class="row actions">${check}${dismissBtn}</div>
  </div>`;
}

export function renderRoster(state, ui) {
  if (!state.roster.length) return '<p class="empty">Aucun aventurier. Recrutez à la taverne.</p>';
  return state.roster.map((a) => adventurerCard(a, state, ui)).join('');
}

function missionCard(m, state, ui) {
  const t = MISSION_TYPES[m.type];
  const composing = ui.composing === m.id;
  let composer = '';
  if (composing) {
    const team = ui.selected.map((id) => findAdventurer(state, id)).filter(Boolean);
    const p = team.length ? estimateWithPotions(state, m, team) : 0;
    const sizeOk = team.length >= m.minSize && team.length <= m.maxSize;
    const roles = new Set(team.map((a) => CLASSES[a.classKey].role));
    const tips = [];
    if (team.length > 1 && !roles.has('tank')) tips.push('pas de tank : les coups tombent sur tout le monde');
    if (team.length > 1 && !roles.has('healer')) tips.push('pas de soigneur : aucune récupération pendant les vagues');
    if (!team.some((a) => THEMES[m.theme].favored.includes(a.classKey))) tips.push(`aucune classe favorisée contre ${THEMES[m.theme].name.toLowerCase()}`);
    composer = `<div class="composer">
      Équipe : ${team.length ? team.map((a) => `${esc(a.name)} (${esc(CLASSES[a.classKey].name)})`).join(', ') : '<em>cochez des aventuriers disponibles</em>'}
      · puissance <b>${teamPower(team)}</b> / ${m.requiredPower} conseillée · réussite simulée <b id="composer-chance">${pct(p)}</b>
      ${tips.length ? `<div class="k tips">${tips.map(esc).join(' · ')}</div>` : ''}
      <div class="row"><button data-action="send" data-id="${m.id}" ${sizeOk ? '' : 'disabled'}>Envoyer</button>
      <button data-action="cancel-compose">Annuler</button></div></div>`;
  }
  const theme = THEMES[m.theme];
  const favored = theme.favored.map((k) => CLASSES[k].name).join(', ');
  return `<div class="card mission ${m.type} ${m.final ? 'final' : ''} ${m.seal ? 'seal' : ''}" data-mission="${m.id}">
    <div class="row">${m.seal ? '<span class="sealtag">Sceau</span> ' : ''}<b>${esc(m.name)}</b> <span class="type">${t.name}</span> · difficulté ${m.difficulty} · ${m.duration} vague${m.duration > 1 ? 's' : ''} (${m.duration} j) · effectif ${m.minSize === m.maxSize ? m.minSize : `${m.minSize}–${m.maxSize}`}</div>
    <div class="row"><span class="theme">${esc(theme.name)}</span> <span class="k">(${theme.enemies.map((e) => esc(e.name)).join(", ")}, chef : ${esc(theme.boss.name)}) · classes favorisées : <b>${esc(favored)}</b> (+30 % dégâts)</span></div>
    <div class="row"><span>Puissance requise <b>${m.requiredPower}</b></span><span>Récompense <b>${m.rewardGold} or</b>, ${m.rewardXp} xp/tête, +${m.rewardRep} rép.</span><span>Expire ${m.final ? 'jamais' : `jour ${m.expiresDay}`}</span></div>
    ${composing ? composer : `<div class="row"><button data-action="compose" data-id="${m.id}" ${state.outcome !== 'playing' ? 'disabled' : ''}>Composer à la main</button>
      ${state.squads.map((sq) => {
        const ready = squadMembers(state, sq).filter((a) => a.status === 'available');
        const ok = ready.length >= m.minSize && state.outcome === 'playing';
        const rank = squadRank(sq);
        const label = `${rank.gold > 1 ? '+or/rép.' : '+xp'}`;
        return `<button class="${ok ? 'primary' : ''}" data-action="send-squad" data-id="${m.id}" data-squad="${sq.id}" ${ok ? '' : 'disabled'} title="${ok ? `${Math.min(ready.length, m.maxSize)} membres partiront · ${esc(rank.text)}` : `${ready.length} disponible(s), ${m.minSize} requis`}">▶ ${esc(sq.name)} (${ready.length}) <i>${label}</i></button>`;
      }).join('')}</div>`}
  </div>`;
}

function attunementTracker(state) {
  const themes = CONSTANTS.ATTUNEMENT_THEMES;
  const dots = themes.map((t) => {
    const done = state.fragments.includes(t);
    return `<span class="frag ${done ? 'on' : ''}" title="${esc(SEALS[t].fragment)} — ${esc(THEMES[t].name)}">${done ? '◆' : '◇'} ${esc(THEMES[t].name)}</span>`;
  }).join('');
  const rank = rankOf(state);
  const note = state.fragments.length >= themes.length
    ? (rank >= CONSTANTS.FINAL_RAID_RANK ? 'Les trois sceaux sont brisés : le Cœur du Léviathan vous attend.' : `Sceaux brisés. Il faut encore le rang ${CONSTANTS.FINAL_RAID_RANK} pour approcher le Léviathan.`)
    : rank >= CONSTANTS.ATTUNEMENT_RANK ? 'Un sceau à la fois apparaît au tableau ; il ne périme jamais.'
    : `Les sceaux se révèlent au rang ${CONSTANTS.ATTUNEMENT_RANK}.`;
  return `<div class="card chain"><div class="row"><b>Chaîne d’éveil</b> <span class="k">${state.fragments.length}/${themes.length} fragments</span> ${dots}</div>
    <div class="k">${note}</div></div>`;
}

function rivalLine(state) {
  const ahead = rivalLeads(state);
  return `<div class="card rival ${ahead ? 'ahead' : ''}"><div class="row"><b>${esc(state.rival.name)}</b>
    <span class="k">${state.rival.reputation} réputation · ${state.rival.taken} contrat${state.rival.taken > 1 ? 's' : ''} raflé${state.rival.taken > 1 ? 's' : ''}</span></div>
    <div class="k">${ahead
      ? `Elle vous devance : les recrues se vendent ${Math.round((CONSTANTS.RIVAL_RECRUIT_PENALTY - 1) * 100)} % plus cher tant qu’elle mène.`
      : 'Elle prend les contrats laissés au tableau plus d’un jour. Faites tourner vos escouades.'}</div></div>`;
}

export function renderMissions(state, ui) {
  const active = state.active.length ? state.active.map((m) => `<div class="card mission active-m">
      <b>${esc(m.name)}</b> · ${m.team.map((id) => { const a = findAdventurer(state, id); return a ? esc(a.name) : '?'; }).join(', ')} · retour dans <b>${m.daysLeft}</b> j</div>`).join('')
    : '<p class="empty">Aucune mission en cours.</p>';
  return `${attunementTracker(state)}${rivalLine(state)}
    <h3>Tableau des missions</h3>${state.board.map((m) => missionCard(m, state, ui)).join('')}
    <h3>En cours</h3>${active}`;
}

export function renderTavern(state) {
  const tav = buildingLevel(state, 'taverne');
  const full = state.roster.length >= maxRoster(state);
  const head = `${full ? '<p class="warnline">Guilde pleine (' + state.roster.length + '/' + maxRoster(state) + ') : agrandissez le Quartier dans l’onglet Guilde pour recruter.</p>' : ''}<p class="hint">Taverne niv. ${state.buildings.taverne} · ${tav.size} candidats, niveau +${tav.levelBonus}, ${tav.traits} trait${tav.traits > 1 ? 's' : ''} chacun${tav.rest ? ` · infirmerie : ${tav.rest} jour${tav.rest > 1 ? 's' : ''} de convalescence en moins` : ''}${tav.morale ? ` · moral +${Math.round(tav.morale * 100)} % ATK/DEF en mission` : ''}</p>
    <div class="row">${tav.reroll ? `<button data-action="reroll" ${state.gold >= tav.reroll ? '' : 'disabled'}>Renouveler les candidats (${tav.reroll} or)</button>` : '<span class="k">Améliorez la Taverne pour renouveler les candidats.</span>'}</div>`;
  if (!state.tavern.length) return `${head}<p class="empty">La taverne est vide aujourd’hui.</p>`;
  return head + state.tavern.map((c) => {
    const cls = CLASSES[c.classKey];
    const cost = recruitCost(c);
    const full = state.roster.length >= maxRoster(state);
    return `<div class="card cand"><div class="row head">${portraitSvg(c, 44)}
        <div class="ident"><b>${esc(c.name)}</b><div class="cls">${raceChip(c)} ${esc(cls.name)} · ${ROLES[cls.role]} · niv. ${totalLevel(c)} · puissance ${computePower(c)}</div></div></div>
      <div class="row">${traitChips(c)}${craftChip(c)}</div>
      <div class="k">${esc(ABILITY_TEXT[cls.ability])}</div>
      <div class="row stats">${statsLine(computeStats(c))}</div>
      <button data-action="recruit" data-id="${c.id}" ${state.gold >= cost && !full ? '' : 'disabled'}>Recruter (${cost} or)</button></div>`;
  }).join('');
}

function itemLine(it) {
  const stats = Object.entries(it.stats).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(', ');
  const kind = it.slot === 'weapon' ? ` · ${WEAPON_NAMES[it.kind]}` : '';
  const aff = it.affinity ? ` <span class="aff">${ROLES[it.affinity]} +${Math.round(CONSTANTS.AFFINITY_BONUS * 100)} %</span>` : '';
  return `<b>${esc(it.name)}</b>${kind} · ${stats}${aff}`;
}

function shopCard(state, it) {
  const affordable = state.gold >= it.price;
  const list = wearers(state, it);
  const best = list[0];
  const hint = best && best.gain > 0 ? `<span class="k">Meilleur bénéficiaire : ${esc(best.adv.name)} (puissance ${gainText(best.gain)})</span>`
    : list.length ? '<span class="k">N’améliore personne pour l’instant.</span>' : '';
  return `<div class="card item ${affordable ? '' : 'poor'}">
    <div class="row">${itemLine(it)} · <b class="price">${it.price} or</b>${affordable ? '' : ` <span class="k">(il manque ${it.price - state.gold})</span>`}</div>
    <div class="row">${hint}</div>
    <div class="row">${affordable ? wearerSelect('buy-equip', it, list, 'Acheter et équiper…') : ''}
      <button data-action="buy" data-id="${it.id}" ${affordable ? '' : 'disabled'} title="Achète sans équiper : l’objet va dans l’inventaire">Acheter → inventaire</button></div>
  </div>`;
}

function inventoryCard(state, it) {
  return `<div class="card item"><div class="row">${itemLine(it)}</div>
    <div class="row">${wearerSelect('equip-item', it, wearers(state, it), 'Équiper à…')}
      <button data-action="sell" data-id="${it.id}">Vendre (${Math.floor(it.price / 2)} or)</button></div></div>`;
}

function renderAlchemist(state) {
  const sale = potionsForSale(state);
  if (!sale.length) return '<p class="empty">L’alchimiste n’est pas installé : améliorez-le dans l’onglet Guilde.</p>';
  return sale.map((k) => { const p = POTIONS[k]; return `<div class="card item"><div class="row"><b>${esc(p.name)}</b> · rend ${Math.round(p.heal * 100)} % des PV${p.cure ? ', dissipe poison et malédiction' : ''} · <b class="price">${p.price} or</b> · en stock : <b>${state.potions[k]}</b></div>
    <div class="row"><button data-action="buy-potion" data-id="${k}" ${state.gold >= p.price ? '' : 'disabled'}>Acheter 1</button><button data-action="buy-potion" data-id="${k}" data-qty="5" ${state.gold >= p.price * 5 ? '' : 'disabled'}>Acheter 5</button></div></div>`; }).join('')
    + '<p class="k">Chaque aventurier envoyé en mission emporte la meilleure potion en stock et la boit sous 35 % de PV. Les potions non bues reviennent au stock.</p>';
}

function adventurerSelect(state, action, key, label) {
  const list = state.roster.filter((a) => a.status !== 'mission');
  if (!list.length) return '<span class="k">Personne de disponible.</span>';
  return `<select data-action="${action}" data-id="${key}"><option value="">${label}</option>${list.map((a) => `<option value="${a.id}">${esc(a.name)} (${esc(CLASSES[a.classKey].name)} ${classLevel(a)}${a.statBonus ? `, +${a.statBonus}` : ''})</option>`).join('')}</select>`;
}

function renderScriptorium(state) {
  const sale = scrollsForSale(state);
  if (!sale.length) return '<p class="empty">Le scriptorium n’est pas installé : améliorez-le dans l’onglet Guilde.</p>';
  return sale.map((k) => { const sc = SCROLLS[k]; return `<div class="card item"><div class="row"><b>${esc(sc.name)}</b> · ${sc.xp ? `+${sc.xp} xp à la classe active` : `+${sc.statBonus} à toutes les statistiques (max ${CONSTANTS.MAX_STAT_SCROLLS})`} · <b class="price">${sc.price} or</b></div>
    <div class="row">${state.gold >= sc.price ? adventurerSelect(state, 'use-scroll', k, 'Donner à…') : `<span class="k">il manque ${sc.price - state.gold} or</span>`}</div></div>`; }).join('');
}

export function renderShop(state) {
  const shop = state.shop.length ? state.shop.map((it) => shopCard(state, it)).join('') : '<p class="empty">Forge vide.</p>';
  const inv = state.inventory.length ? state.inventory.map((it) => inventoryCard(state, it)).join('')
    : '<p class="empty">Inventaire vide. Le butin des missions et les achats « → inventaire » arrivent ici.</p>';
  const forge = BUILDINGS.forge.levels[state.buildings.forge];
  return `<p class="hint">Or disponible : <b>${state.gold}</b>. Un objet n’agit qu’une fois <b>équipé</b> ; « Acheter et équiper » fait les deux. Un objet remplacé retourne à l’inventaire (revente à moitié prix).</p>
    <h3>⚒ Forge niv. ${state.buildings.forge} — palier max ${forge.tier}${forge.discount ? `, remise ${Math.round(forge.discount * 100)} %` : ''} (renouvelée chaque matin)</h3>${shop}
    <h3>⚗ Alchimiste niv. ${state.buildings.alchimiste}</h3>${renderAlchemist(state)}
    <h3>📜 Scriptorium niv. ${state.buildings.scriptorium}</h3>${renderScriptorium(state)}
    <h3>Inventaire (${state.inventory.length})</h3>${inv}`;
}

function levelEffect(key, lvl) {
  switch (key) {
    case 'quartier': return `${lvl.roster} aventuriers`;
    case 'forge': return `objets palier ≤ ${lvl.tier}, ${lvl.slots} en vente${lvl.discount ? `, remise ${Math.round(lvl.discount * 100)} %` : ''}`;
    case 'alchimiste': return lvl.potions.length ? lvl.potions.map((k) => POTIONS[k].name).join(', ') : 'aucune potion';
    case 'scriptorium': return lvl.scrolls.length ? lvl.scrolls.map((k) => SCROLLS[k].name).join(', ') : 'aucun parchemin';
    case 'taverne': return [`${lvl.size} candidats (niv. +${lvl.levelBonus}, ${lvl.traits} trait${lvl.traits > 1 ? 's' : ''})`,
      lvl.rest ? `infirmerie −${lvl.rest} j de convalescence` : null,
      lvl.morale ? `moral +${Math.round(lvl.morale * 100)} % ATK/DEF` : null,
      lvl.reroll ? `renouvellement ${lvl.reroll} or` : null].filter(Boolean).join(' · ');
    default: return '';
  }
}

function craftSummary(state) {
  const bonus = craftBonuses(state);
  const lines = Object.entries(CRAFTS).map(([key, craft]) => {
    const level = bonus.totals[key];
    const artisans = state.roster.filter((a) => a.craft === key);
    const effect = {
      forgeron: `−${Math.round(bonus.forgeDiscount * 100)} % sur la Forge, +${bonus.forgeTier} palier`,
      alchimiste: `${bonus.potionsPerCycle} potion${bonus.potionsPerCycle > 1 ? 's' : ''} tous les ${CONSTANTS.CRAFT_CYCLE} jours`,
      cuisinier: `+${Math.round(bonus.morale * 100)} % de moral`,
      scribe: `+${Math.round((bonus.xpMult - 1) * 100)} % d’expérience`,
      herboriste: `−${bonus.rest} jour${bonus.rest > 1 ? 's' : ''} de convalescence`,
      negociant: `+${Math.round((bonus.goldMult - 1) * 100)} % d’or`,
    }[key];
    return `<div class="craftrow ${level ? 'on' : ''}"><span>${craft.icon} <b>${esc(craft.name)}</b></span>
      <span class="k">${artisans.length ? artisans.map((a) => `${esc(a.name.split(' ')[0])} ${craftProgress(a).level}`).join(', ') : 'personne'}</span>
      <span class="${level ? 'gainline' : 'k'}">${esc(effect)}</span></div>`;
  }).join('');
  return `<h3>Ateliers de la guilde</h3>
    <p class="hint">Chaque aventurier a un métier qui gagne un point par jour passé à la guilde. Les niveaux de tous les artisans se cumulent. Le métier se change depuis la fiche du personnage.</p>
    ${lines}`;
}

export function renderGuild(state) {
  return `<p class="hint">Or disponible : <b>${state.gold}</b>. Chaque bâtiment a 3 niveaux d’amélioration.</p>` + upgradeOptions(state).map((o) => {
    const b = BUILDINGS[o.key];
    const dots = b.levels.map((_, i) => `<span class="dot ${i <= o.level ? 'on' : ''}"></span>`).join('');
    return `<div class="card building"><div class="row"><b>${b.icon} ${esc(b.name)}</b> ${dots} <span class="k">${esc(b.text)}</span></div>
      <div class="row">Actuel : ${esc(levelEffect(o.key, b.levels[o.level]))}</div>
      ${o.next ? `<div class="row">Suivant : ${esc(levelEffect(o.key, o.next))} · <b class="price">${o.cost} or</b> <button data-action="upgrade" data-id="${o.key}" ${o.affordable ? '' : 'disabled'}>Améliorer</button></div>` : '<div class="row k">Niveau maximum.</div>'}
    </div>`;
  }).join('') + craftSummary(state);
}

// ------------------------------------------------------------ fiche de perso
// Faits d'armes : ce qui attache le joueur à un personnage précis.
function loreBlock(adv) {
  const l = adv.lore;
  if (!l) return '';
  return `<div class="lore"><b>Faits d’armes</b> — engagé au jour ${l.joinedDay} ·
    ${l.missions} mission${l.missions > 1 ? 's' : ''} (${l.missions - l.defeats} réussie${l.missions - l.defeats > 1 ? 's' : ''}) ·
    ${l.kills} ennemis abattus${l.bossKills ? ` dont ${l.bossKills} chef${l.bossKills > 1 ? 's' : ''}` : ''} ·
    ${l.dealt} dégâts infligés${l.healed ? ` · ${l.healed} PV rendus` : ''}${l.revivals ? ` · relevé ${l.revivals} fois` : ''}</div>`;
}

function statBreakdown(adv) {
  const cls = CLASSES[adv.classKey];
  const stats = computeStats(adv);
  return STAT_KEYS.map((k) => {
    const equip = SLOTS.reduce((s, slot) => s + ((adv.equipment[slot] && adv.equipment[slot].stats[k]) || 0), 0);
    const base = stats[k] - equip;
    return `<div class="stat"><span class="k">${k.toUpperCase()}</span><b>${stats[k]}</b><span class="k">${base}${equip ? ` ${equip > 0 ? '+' : ''}${equip}` : ''}</span></div>`;
  }).join('') + `<div class="stat"><span class="k">PUISS.</span><b>${computePower(adv)}</b><span class="k">${cls.row === 'front' ? 'avant' : 'arrière'}</span></div>`;
}

const SLOT_ICON = { weapon: '🗡', armor: '🛡', accessory: '💍' };

// Emplacements d'équipement, en « poupée » : trois cases toujours visibles.
function sheetSlots(adv) {
  return SLOTS.map((slot) => {
    const it = adv.equipment[slot];
    const body = it
      ? `<b>${esc(it.name)}</b><span class="k">${Object.entries(it.stats).map(([k, v]) => `${k.toUpperCase()} ${v > 0 ? '+' : ''}${v}`).join(' · ')}${it.affinity ? ` · ${ROLES[it.affinity]}${itemAffinityBonus(adv, it) ? ' ✓' : ''}` : ''}</span>
         ${adv.status !== 'mission' ? `<button data-action="unequip" data-id="${adv.id}" data-slot="${slot}">Retirer</button>` : ''}`
      : '<em class="k">emplacement vide</em>';
    return `<div class="slotbox ${it ? 'filled' : ''}"><span class="slotname">${SLOT_ICON[slot]} ${SLOT_NAMES[slot]}</span>${body}</div>`;
  }).join('');
}

// Détail du gain, statistique par statistique, si l'objet était équipé.
function statDelta(adv, item) {
  const before = computeStats(adv);
  const prev = adv.equipment[item.slot];
  adv.equipment[item.slot] = item;
  const after = computeStats(adv);
  adv.equipment[item.slot] = prev;
  return STAT_KEYS.map((k) => {
    const d = after[k] - before[k];
    if (!d) return '';
    return `<span class="d ${d > 0 ? 'up' : 'down'}">${k.toUpperCase()} ${d > 0 ? '+' : ''}${d}</span>`;
  }).join('');
}

// Fenêtre d'inventaire du personnage : tout le sac de la guilde, trié par
// gain de puissance, avec le détail par statistique et l'équipement en un clic.
function sheetInventory(adv, state, ui) {
  if (adv.status === 'mission') return '<p class="k">En mission : l’équipement est verrouillé jusqu’au retour.</p>';
  const onlyFit = ui.invAll !== true;
  const items = state.inventory
    .map((it) => ({ it, ok: canEquip(adv, it), gain: powerGainIfEquipped(adv, it) }))
    .filter((x) => (onlyFit ? x.ok : true))
    .sort((a, b) => b.gain - a.gain);
  const toggle = `<button data-action="inv-filter">${onlyFit ? 'Voir tout le sac' : 'Voir seulement ce qu’il peut porter'}</button>`;
  const optimize = `<button class="primary" data-action="optimize" data-id="${adv.id}">Équiper au mieux</button>`;
  const rows = items.map(({ it, ok, gain }) => `<div class="invrow ${ok ? '' : 'nope'}">
      <span class="slotico">${SLOT_ICON[it.slot]}</span>
      <span class="iname">${esc(it.name)}</span>
      <span class="deltas">${ok ? statDelta(adv, it) : '<span class="k">arme incompatible</span>'}</span>
      <span class="gain ${gain > 0 ? 'up' : gain < 0 ? 'down' : ''}">${ok ? `${gain > 0 ? '+' : ''}${gain}` : ''}</span>
      ${ok ? `<button data-action="equip-from-sheet" data-id="${adv.id}" data-item="${it.id}">Équiper</button>` : ''}
    </div>`).join('');
  return `<div class="row">${optimize}${toggle}<span class="k">${state.inventory.length} objet${state.inventory.length > 1 ? 's' : ''} dans le sac de la guilde</span></div>
    ${rows || `<p class="k">${state.inventory.length && onlyFit
      ? `Aucun des ${state.inventory.length} objets du sac ne lui convient — « Voir tout le sac » pour les afficher quand même.`
      : 'Le sac est vide : passez par les Boutiques ou attendez un butin.'}</p>`}`;
}

// Métier : barre de progression et changement de métier.
function craftBlock(adv, state) {
  const craft = CRAFTS[adv.craft];
  const p = craftProgress(adv);
  const width = p.next ? Math.min(100, Math.round((p.xp / p.next) * 100)) : 100;
  const options = Object.entries(CRAFTS).map(([key, c]) => `<option value="${key}" ${key === adv.craft ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('');
  return `<div class="craftbox">
    <div class="row"><b>${craft.icon} ${esc(craft.name)}</b> <span class="k">niveau ${p.level}/${p.max}</span>
      <span class="xpbar" title="${p.next ? `${p.xp}/${p.next} points` : 'maîtrisé'}"><span style="width:${width}%"></span></span>
      <span class="k">${p.next ? `${p.xp}/${p.next}` : 'maîtrisé'}</span></div>
    <div class="k">${esc(craft.text)} Progresse d’un point par jour passé à la guilde (hors mission).</div>
    ${adv.status !== 'mission' ? `<div class="row"><select data-action="set-craft" data-id="${adv.id}">${options}</select>
      <span class="k">Changer remet la progression à zéro${adv.craftXp > 0 ? ` et coûte ${CRAFT_CHANGE_COST} or` : ''}.</span></div>` : ''}
  </div>`;
}

export function renderSheet(state, ui) {
  const adv = ui.sheet ? findAdventurer(state, ui.sheet) : null;
  if (!adv) return '';
  const cls = CLASSES[adv.classKey];
  const race = RACES[adv.race];
  return `<div class="sheet-inner">
    <div class="row sheet-head"><span class="portrait">${portraitSvg(adv, 88)}</span>
      <div><h2>${esc(adv.name)} ${titleChip(adv)}</h2>
        <div class="cls">${raceChip(adv)} ${esc(cls.name)} niv. ${classLevel(adv)} · ${ROLES[cls.role]} · ${cls.row === 'front' ? 'ligne avant' : 'ligne arrière'} · ${STATUS_NAMES[adv.status]}</div>
        <div class="k">${adv.xp}/${xpToNext(classLevel(adv))} xp · niveau total ${totalLevel(adv)} · salaire ${wageOf(adv)}/soir${adv.statBonus ? ` · parchemins de maîtrise ${adv.statBonus}/${CONSTANTS.MAX_STAT_SCROLLS}` : ''}${adv.potion ? ` · emporte ${POTIONS[adv.potion].name}` : ''}</div></div>
      <button class="close" data-action="close-sheet">✕</button></div>
    ${race ? `<div class="racebox"><b>${race.icon} ${esc(race.name)}</b> <span class="k">${esc(race.text)}</span></div>` : ''}
    <div class="row">${traitChips(adv, true)}</div>
    <div class="statgrid">${statBreakdown(adv)}</div>
    ${loreBlock(adv)}
    <div class="row classes">${classLine(adv)}</div>
    ${focusMultiplier(adv) < 1 ? `<div class="warnline">Dispersion : ${Object.keys(adv.classLevels).length} classes pratiquées — apprentissage à ${Math.round(focusMultiplier(adv) * 100)} % et croissance des classes secondaires réduite de moitié. Se spécialiser paie.</div>` : ''}
    <div class="ability">${esc(ABILITY_TEXT[cls.ability])}</div>
    <h3>Compétences</h3><div class="skills">${skillChips(adv)}</div>
    ${skillPicker(adv)}
    <h3>Métier</h3>${craftBlock(adv, state)}
    <h3>Équipement</h3><div class="slots">${sheetSlots(adv)}</div>
    <h3>Inventaire</h3>${sheetInventory(adv, state, ui)}
    ${classPanel(adv, state) ? `<h3>Classes</h3>${classPanel(adv, state)}` : `<h3>Classes</h3><p class="k">${adv.status === 'mission' ? 'En mission : changement de classe impossible.' : 'Blessé : changement de classe impossible jusqu’au rétablissement.'}</p>`}
  </div>`;
}

// ----------------------------------------------------------- escouades
function compoBar(comp) {
  const chips = Object.entries(SKILL_ROLES).map(([key, role]) => {
    const n = comp.roles[key];
    return `<span class="rtag ${key} ${n ? '' : 'off'}" title="${esc(role.name)}">${role.icon} ${role.short} ${n}</span>`;
  }).join('');
  const classes = `<span class="ctag">🛡 ${comp.classRoles.tank} tank</span><span class="ctag">⚔ ${comp.classRoles.dps} dégâts</span><span class="ctag">✚ ${comp.classRoles.healer} soin</span>`;
  return `<div class="row compo">${classes}</div><div class="row compo">${chips}</div>
    <div class="row compo"><span class="k">${comp.rows.front} en première ligne · ${comp.rows.back} à l’arrière</span></div>
    ${comp.warnings.length ? `<div class="warnline">${comp.warnings.map(esc).join(' · ')}</div>` : '<div class="okline">Composition équilibrée.</div>'}`;
}

function memberRow(state, adv, squad) {
  const cls = CLASSES[adv.classKey];
  const ready = !squad && isReadyForSquad(adv);
  const roles = [...new Set(learnedSkills(adv).all.map((k) => SKILLS[k].role))].map((r) => `<span class="rtag ${r}">${SKILL_ROLES[r].icon}</span>`).join('');
  const targets = state.squads.filter((sq) => sq.id !== (squad && squad.id));
  const options = [`<option value="">Déplacer…</option>`,
    ...targets.map((sq) => `<option value="${sq.id}" ${sq.members.length >= CONSTANTS.SQUAD_SIZE ? 'disabled' : ''}>${esc(sq.name)}${sq.members.length >= CONSTANTS.SQUAD_SIZE ? ' (pleine)' : ''}</option>`),
    squad ? '<option value="reserve">Réserve</option>' : ''].join('');
  return `<div class="member ${adv.status} ${ready ? 'ready' : ''}">
    <button class="pfbtn" data-action="open-sheet" data-id="${adv.id}" title="Fiche de ${esc(adv.name)}">${portraitSvg(adv, 36)}</button>
    <div class="ident"><b>${esc(adv.name)}</b>${ready ? ' <span class="readytag">prêt</span>' : ''}
      <div class="k">${esc(cls.name)} ${classLevel(adv)} · ${ROLES[cls.role]} · ${cls.row === 'front' ? 'avant' : 'arrière'} · ${STATUS_NAMES[adv.status]}</div></div>
    <div class="mroles">${roles}</div>
    ${adv.status === 'mission' ? '<span class="k">en mission</span>' : `<select data-action="assign" data-id="${adv.id}">${options}</select>`}
  </div>`;
}

export function renderSquads(state, ui) {
  const assigned = new Set(state.squads.flatMap((sq) => sq.members));
  const reserve = state.roster.filter((a) => !assigned.has(a.id));
  const squads = state.squads.map((squad) => {
    const comp = squadComposition(state, squad);
    const ready = comp.members.filter((a) => a.status === 'available').length;
    const rank = squadRank(squad);
    return `<div class="card squad rank${squad.rank || 0}">
      <div class="row"><span class="rankbadge">${(squad.rank || 0) === 0 ? '★' : '◈'} ${esc(rank.short)}</span>
        <input class="sqname" data-action="rename-squad" data-id="${squad.id}" value="${esc(squad.name)}" maxlength="28">
        <span class="k">${comp.size}/${comp.max} membres · ${ready} disponible${ready > 1 ? 's' : ''}</span></div>
      <div class="rankline">${esc(rank.text)}</div>
      ${compoBar(comp)}
      <div class="members">${comp.members.map((a) => memberRow(state, a, squad)).join('') || '<p class="k">Escouade vide : affectez des aventuriers depuis la réserve.</p>'}</div>
    </div>`;
  }).join('');
  const locked = maxSquads(state) < 3
    ? `<p class="hint">Escouades débloquées : ${maxSquads(state)}/3. Améliorez le <b>Quartier</b> (onglet Guilde) pour en former d’autres et loger jusqu’à ${BUILDINGS.quartier.levels[3].roster} aventuriers.</p>`
    : '';
  const queue = trainingQueue(state);
  const readyCount = queue.filter((a) => isReadyForSquad(a)).length;
  const room = state.squads.some((sq) => sq.members.length < CONSTANTS.SQUAD_SIZE);
  const queueBlock = `<div class="card squad queue">
    <div class="row"><span class="rankbadge solo">⚑ File d’entraînement</span>
      <span class="k">${queue.length} aventurier${queue.length > 1 ? 's' : ''} en quête solo · ${readyCount} prêt${readyCount > 1 ? 's' : ''}</span>
      ${readyCount && room ? '<button class="primary" data-action="fill-squads">Intégrer les aventuriers prêts</button>' : ''}</div>
    <div class="rankline">Sans escouade, un aventurier enchaîne les quêtes solo : +${CONSTANTS.TRAINING_XP} xp et ${CONSTANTS.TRAINING_GOLD} or par jour, avec un risque de blessure. Il est <b>prêt</b> au niveau total ${CONSTANTS.TRAINING_READY_LEVEL}.</div>
    <div class="members">${queue.map((a) => memberRow(state, a, null)).join('') || '<p class="k">Personne en file : tout le monde sert en escouade.</p>'}</div></div>`;
  return `<p class="hint">La guilde tourne sur ses escouades : jusqu’à ${CONSTANTS.SQUAD_SIZE} membres chacune, envoyées en bloc sur les missions. La principale porte le renom, les deux autres forment la relève, et la file d’entraînement fait monter les recrues jusqu’à ce qu’elles puissent y entrer.</p>
    ${locked}${squads}${queueBlock}`;
}

// ------------------------------------------------------------- bestiaire
export function renderBestiary(state) {
  const entries = bestiaryEntries(state);
  const known = entries.filter((e) => e.kills > 0).length;
  const byTheme = {};
  for (const e of entries) (byTheme[e.themeName] = byTheme[e.themeName] || []).push(e);
  const blocks = Object.entries(byTheme).map(([themeName, list]) => {
    const rows = list.map((e) => {
      const seen = e.kills > 0;
      const progress = e.next ? `${e.kills}/${e.next.kills} vers ${e.next.name}` : 'connaissance complète';
      return `<div class="bestrow ${seen ? '' : 'unknown'} ${e.boss ? 'boss' : ''}">
        <span class="glyph">${enemyGlyph(e.kind)}</span>
        <span class="bname">${seen ? esc(e.name) : '???'}${e.boss ? ' <i>chef</i>' : ''}</span>
        <span class="k">${seen ? `${e.kills} abattu${e.kills > 1 ? 's' : ''} · ${progress}` : 'jamais rencontré'}</span>
        <span class="${e.bonus ? 'gainline' : 'k'}">${e.tier ? `${e.tier.name} +${Math.round(e.bonus * 100)} % dégâts` : '—'}</span>
        <span class="k">${seen ? `${e.tpl.hp} PV · ATK ${e.tpl.atk}${e.tpl.mag ? ` · MAG ${e.tpl.mag}` : ''} · DEF ${e.tpl.def} · SPD ${e.tpl.spd}` : ''}</span>
      </div>`;
    }).join('');
    return `<h3>${esc(themeName)}</h3>${rows}`;
  }).join('');
  return `<p class="hint">Chaque espèce abattue enrichit le bestiaire. Aux paliers ${CONSTANTS.BESTIARY_TIERS.map((t) => t.kills).join(', ')}, la guilde gagne un bonus de dégâts permanent contre elle et découvre ses caractéristiques. Espèces rencontrées : <b>${known}/${entries.length}</b>.</p>${blocks}`;
}

// ------------------------------------------------------------- journal
function hpBar(p) {
  const ratio = p.maxHp ? Math.round((p.hp / p.maxHp) * 100) : 0;
  return `<span class="hp ${p.downed ? 'down' : ratio < 35 ? 'low' : ''}"><span style="width:${ratio}%"></span></span>`;
}

function reportCard(r, i) {
  const theme = THEMES[r.theme];
  const waves = r.waves.map((w) => `<div class="wave ${w.cleared ? 'ok' : 'ko'}"><b>Vague ${w.index}</b> ${w.cleared ? 'nettoyée' : 'perdue'} (${w.killed}/${w.enemies} ennemis) —
    ${w.party.map((p) => `<span class="pm">${esc(p.name)} ${hpBar(p)} ${p.downed ? 'à terre' : `${p.hp}/${p.maxHp}`}</span>`).join(' ')}</div>`).join('');
  const bilan = r.party.map((p) => `<span class="pm">${esc(p.name)} (${esc(CLASSES[p.classKey].name)}) : ${p.dealt} dégâts, ${p.healed} soins, ${p.taken} subis, ${p.kills} K.O.</span>`).join(' · ');
  const log = r.log.map((ev) => {
    const line = formatEvent(ev);
    if (!line) return '';
    const cls = ev.t === 'wave' || ev.t === 'waveEnd' || ev.t === 'end' ? 'lw' : ev.t === 'round' ? 'lt' : '';
    return `<div class="${cls}">${esc(line)}</div>`;
  }).join('');
  return `<details class="report ${r.success ? 'ok' : 'ko'}" ${i === 0 ? 'open' : ''}>
    <summary>J${r.day} · <b>${esc(r.name)}</b> (${MISSION_TYPES[r.type].name}, ${esc(theme.name)}, diff. ${r.difficulty}) — ${r.success ? `SUCCÈS, +${r.gold} or` : `ÉCHEC à la vague ${r.wavesCleared + 1}`}</summary>
    <div class="row"><button class="primary" data-action="replay" data-id="${r.missionId}">▶ Revoir le combat</button></div>
    ${waves}
    <div class="bilan">${bilan}</div>
    <details class="fulllog"><summary>Journal tour par tour (${r.log.length} lignes)</summary><div class="loglines">${log}</div></details>
  </details>`;
}

export function renderJournal(state) {
  const last = state.reports[0];
  const replayBtn = last ? `<div class="row"><button class="primary big" data-action="replay" data-id="${last.missionId}">▶ Revoir le dernier combat — ${esc(last.name)}</button></div>` : '';
  const reports = state.reports.length ? state.reports.map(reportCard).join('') : '<p class="empty">Aucun combat encore résolu : envoyez une mission et terminez la journée.</p>';
  const entries = [...state.journal].reverse().slice(0, 60);
  return `${replayBtn}<h3>Derniers combats</h3>${reports}
    <h3>Chronique</h3><ul class="journal">${entries.map((e) => `<li><span class="d">J${e.day}</span> ${esc(e.text)}</li>`).join('')}</ul>`;
}

export function renderAll(root, state, ui) {
  root.querySelector('#hud').innerHTML = renderHeader(state);
  root.querySelector('#economy').innerHTML = renderEconomy(state);
  root.querySelector('#roster').innerHTML = renderRoster(state, ui);
  const panels = { missions: renderMissions, squads: renderSquads, tavern: renderTavern, shop: renderShop, guild: renderGuild, bestiary: renderBestiary, journal: renderJournal };
  const sheet = root.querySelector('#sheet');
  sheet.innerHTML = renderSheet(state, ui);
  sheet.classList.toggle('hidden', !ui.sheet);
  root.querySelector('#panel').innerHTML = panels[ui.tab](state, ui);
  for (const btn of root.querySelectorAll('[data-tab]')) btn.classList.toggle('on', btn.dataset.tab === ui.tab);
  root.querySelector('#endday').disabled = state.outcome !== 'playing';
  const msg = root.querySelector('#message');
  msg.textContent = ui.message || '';
  msg.classList.toggle('hidden', !ui.message);
}
