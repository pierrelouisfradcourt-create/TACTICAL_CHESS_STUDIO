/* Chroniques de Guilde — moteur pur (UMD, aucune dépendance).
 * Date : 2026-09-17. Source : CONTRACT.md + design_aventuriers.md + design_quetes_donjons.md
 * + design_objets_economie.md (§0-2). Entiers partout, mulberry32 sur la graine du jour,
 * un seul flux RNG consommé dans l'ordre des phases du contrat.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GuildeSim = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  let GLOBAL_DATA = null;   // dernière table de données vue par newGame (repli pour les états rechargés)

  // ===================================================================================
  // 0. PRIMITIVES ENTIÈRES, HACHAGE, RNG
  // ===================================================================================
  function div(a, b) { return Math.trunc(a / b); }
  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
  function pct(x, p) { return div(x * p, 100); }
  function permille(x, p) { return div(x * p, 1000); }

  function utf8Bytes(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c >= 0xD800 && c < 0xDC00 && i + 1 < str.length) {
        const d = str.charCodeAt(i + 1);
        if (d >= 0xDC00 && d < 0xE000) { c = 0x10000 + ((c - 0xD800) << 10) + (d - 0xDC00); i++; }
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }
  function fnvBytes(h, bytes) {
    for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }
  function fnvStr(str) { return fnvBytes(0x811C9DC5, utf8Bytes(str)); }
  function fnvU32(v) {
    v = v >>> 0;
    return fnvBytes(0x811C9DC5, [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]);
  }
  function hex8(h) { return ('00000000' + (h >>> 0).toString(16)).slice(-8); }

  function makeRng(seedU32) {
    const rng = { s: seedU32 >>> 0, count: 0 };
    rng.next = function () {
      rng.s = (rng.s + 0x6D2B79F5) >>> 0;
      let t = rng.s;
      t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
      t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
      rng.count++;
      return (t ^ (t >>> 14)) >>> 0;
    };
    rng.roll = function (n) { return n <= 1 ? 0 : rng.next() % n; };
    rng.chance = function (p) { return rng.roll(1000) < p; };
    rng.between = function (lo, hi) { return hi <= lo ? lo : lo + rng.roll(hi - lo + 1); };
    rng.pickWeighted = function (entries) {           // entries = [[key, weight], ...] dans l'ordre de la table
      let total = 0;
      for (const e of entries) total += Math.max(0, e[1]);
      if (total === 0) return null;
      const r = rng.roll(total);
      let acc = 0;
      for (const e of entries) { acc += Math.max(0, e[1]); if (r < acc) return e[0]; }
      return entries[entries.length - 1][0];
    };
    return rng;
  }

  function canonical(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
    if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
    const keys = Object.keys(v).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  }
  function hashState(state) { return hex8(fnvStr(canonical(state))); }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function sortedKeys(obj) { return Object.keys(obj).sort(); }
  function byId(list) { const m = {}; for (const x of list) m[x.id] = x; return m; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function pad3(n) { return ('000' + n).slice(-3); }
  function sum(arr) { let s = 0; for (const x of arr) s += x; return s; }

  // Gabarit : remplace {clé} par vars[clé]. Index choisi sans RNG (fnv du sel) pour varier les tournures.
  function fill(tpl, vars) {
    return tpl.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k])));
  }
  function pickTpl(D, kind, salt, vars) {
    const list = D.templates[kind];
    if (!list || !list.length) return '';
    const idx = fnvStr(kind + '|' + salt) % list.length;
    return fill(list[idx], vars || {});
  }
  function deWord(w) { return (/^[aeiouyéèêàâîôûh]/.test(w) ? "d'" : 'de ') + w; }
  function joinFr(list) {
    if (!list.length) return 'personne';
    if (list.length === 1) return list[0];
    return list.slice(0, -1).join(', ') + ' et ' + list[list.length - 1];
  }

  // ===================================================================================
  // 1. INDEX DES DONNÉES (construit une fois par appel, jamais stocké dans l'état)
  // ===================================================================================
  function index(data) {
    if (data.__idx) return data.__idx;
    const D = {
      raw: data, C: data.constants,
      classes: byId(data.classes), skills: byId(data.skills), traits: byId(data.traits),
      quest_types: byId(data.quest_types), biomes: byId(data.biomes), monsters: byId(data.monsters),
      bosses: byId(data.bosses), resources: byId(data.resources), items: byId(data.items),
      recipes: byId(data.recipes), buildings: byId(data.buildings), decorations: byId(data.decorations),
      slots: byId(data.slots), rarities: byId(data.rarities), events: byId(data.events),
      attrs: data.attributes.map(a => a.id), attr_names: byId(data.attributes),
      templates: data.templates, difficulty: {}, profiles: byId(data.ai_profiles),
      skills_by_class: {}
    };
    for (const d of data.difficulty) D.difficulty[d.d] = d;
    for (const s of data.skills) (D.skills_by_class[s.class_id] = D.skills_by_class[s.class_id] || []).push(s);
    Object.defineProperty(data, '__idx', { value: D, enumerable: false });
    return D;
  }

  // ===================================================================================
  // 2. AVENTURIERS : attributs, profils, génération
  // ===================================================================================
  function hasTrait(h, t) { return h.traits.indexOf(t) >= 0; }
  function heroName(h) { return h.first_name + ' ' + h.epithet; }
  function hasSkill(D, h, skillId) {
    const s = D.skills[skillId];
    return !!s && s.class_id === h.class_id && h.level >= s.unlock_level;
  }
  function baseAttr(D, h, a) {
    const c = D.classes[h.class_id];
    return c.start[a] + div(c.growth[a] * (h.level - 1), 100);
  }
  function attrEff(D, h, a) {
    let v = baseAttr(D, h, a) + (h.bonus_attrs[a] || 0) + (h.trained[a] || 0);
    if (a === 'luck' && hasTrait(h, 'lucky')) v += 3;
    if (a === 'vigor' && hasTrait(h, 'fragile')) v -= 2;
    return clamp(v, D.C.attr_min, D.C.attr_max);
  }
  function perfPct(h) {
    return clamp(50 + div(h.form * 2, 5) + div(h.morale, 5) - div(Math.max(0, h.fatigue - 50) * 3, 5), 20, 110);
  }
  function itemStats(D, state, h) {
    const tot = {};
    const inv = state.inventories[h.owner];
    if (!inv) return tot;
    for (const slot of sortedKeys(h.equipment)) {
      const uid = h.equipment[slot];
      if (!uid) continue;
      const it = inv.items.filter(x => x.uid === uid)[0];
      if (!it) continue;
      const def = D.items[it.item_id];
      for (const k of sortedKeys(def.stats)) tot[k] = (tot[k] || 0) + def.stats[k];
    }
    return tot;
  }
  function attackBase(D, h, A) {
    switch (h.class_id) {
      case 'warrior': return A.strength * 2 + A.dexterity;
      case 'ranger': case 'rogue': return A.dexterity * 2 + A.strength;
      case 'mage': return A.mind * 2 + A.will;
      default: return A.will + A.strength;
    }
  }
  // Profil de combat (calculé sur l'état du matin, jamais stocké).
  function combatProfile(D, state, h) {
    const A = {};
    for (const a of D.attrs) A[a] = attrEff(D, h, a);
    const perf = perfPct(h);
    const it = itemStats(D, state, h);
    const p = {
      id: h.id, name: heroName(h), class_id: h.class_id, level: h.level, owner: h.owner, gender: h.gender,
      hp_max: pct(20 + A.vigor * 3 + h.level * 2, perf) + (it.hp || 0),
      atk: pct(attackBase(D, h, A), perf) + (it.atk || 0) + (h.class_id === 'mage' ? (it.magic || 0) : 0),
      heal: pct(A.will * 2 + A.mind, perf) + (it.heal || 0),
      def: A.vigor + div(A.strength, 2) + (it.def || 0),
      spd: 7 + div(h.level, 2) + div(A.dexterity, 8) + (it.spd || 0),
      crit: Math.min(400, 30 + A.luck * 5) + (it.crit || 0) + (hasSkill(D, h, 'precise_shot') ? 100 : 0),
      dodge: Math.min(350, A.dexterity * 4),
      fire: it.fire ? 1 : 0, morale: h.morale, fatigue: h.fatigue, traits: h.traits.slice(),
      magic: h.class_id === 'mage' ? 1 : 0, priority: (hasSkill(D, h, 'taunt') ? 100 : 0) + (hasTrait(h, 'brave') ? 50 : 0) - (hasTrait(h, 'coward') ? 50 : 0),
      skills: D.skills_by_class[h.class_id].filter(s => s.type === 'active' && h.level >= s.unlock_level).map(s => s.id),
      potion: null
    };
    if (h.equipment.potion && state.inventories[h.owner]) {
      const inv = state.inventories[h.owner];
      const pit = inv.items.filter(x => x.uid === h.equipment.potion)[0];
      if (pit) p.potion = { uid: pit.uid, item_id: pit.item_id };
    }
    return p;
  }
  function gatherPower(D, state, h, biomeId) {
    const biome = D.biomes[biomeId];
    const cls = D.classes[h.class_id];
    const attr = biomeId === 'forest' ? 'dexterity' : biomeId === 'mountain' ? 'strength' : 'mind';
    let p = (10 + attrEff(D, h, attr)) * (100 + cls.gather_affinity[biomeId]);
    p = div(p, 100);
    p = pct(p, perfPct(h));
    if (hasTrait(h, 'diligent')) p = pct(p, 110);
    if (biomeId === 'forest' && hasSkill(D, h, 'tracking')) p = pct(p, 110);
    const it = itemStats(D, state, h);
    const tool = it['gather_' + biome.id] || 0;
    if (tool) p = pct(p, 100 + tool);
    return p;
  }
  function craftPower(D, state, h) {
    const cls = D.classes[h.class_id];
    let p = div((10 + attrEff(D, h, cls.craft_attr)) * (100 + cls.craft_affinity), 100);
    return pct(p, perfPct(h));
  }
  function xpNext(D, h) { return h.level >= D.C.level_max ? D.raw.xp_table[D.C.level_max] : D.raw.xp_table[h.level + 1]; }

  // Application d'XP et montées de niveau ; renvoie les événements produits.
  function applyXp(D, h, amount) {
    const ev = [];
    if (h.level >= D.C.level_max) { h.xp = D.raw.xp_table[D.C.level_max]; return ev; }
    h.xp += Math.max(0, amount);
    while (h.level < D.C.level_max && h.xp >= D.raw.xp_table[h.level + 1]) {
      h.level += 1;
      h.morale = clamp(h.morale + 5, 0, 100);
      h.form = clamp(h.form + 5, 0, 100);
      h.history.level_ups += 1;
      ev.push({ kind: 'level_up', hero: h, level: h.level });
      for (const s of D.skills_by_class[h.class_id]) if (s.unlock_level === h.level) ev.push({ kind: 'skill', hero: h, skill: s });
    }
    if (h.level >= D.C.level_max) h.xp = D.raw.xp_table[D.C.level_max];
    return ev;
  }

  function genTraits(D, rng, rarity) {
    const all = D.raw.traits.map(t => t.id);
    const positive = all.filter(t => D.traits[t].polarity === 1);
    const n = (rarity === 'rare' || rarity === 'legendary') ? 2 : 1;
    const t1 = (rarity === 'rare' || rarity === 'legendary') ? positive[rng.roll(positive.length)] : all[rng.roll(all.length)];
    if (n === 1) return [t1];
    let t2 = rarity === 'legendary' ? positive[rng.roll(positive.length)] : all[rng.roll(all.length)];
    const incompatible = (a, b) => D.raw.trait_incompatible.some(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));
    let guard = 0;
    while ((t2 === t1 || incompatible(t1, t2)) && guard++ < 20) t2 = all[(all.indexOf(t2) + 1) % all.length];
    return [t1, t2];
  }
  function genBonusAttrs(D, rng, classId, rarity) {
    const b = {};
    for (const a of D.attrs) b[a] = 0;
    const cls = D.classes[classId];
    const prim = { common: 0, uncommon: 2, rare: 4, legendary: 6 }[rarity];
    const sec = { common: 0, uncommon: 2, rare: 2, legendary: 4 }[rarity];
    const rnd = { common: 0, uncommon: 0, rare: 1, legendary: 2 }[rarity];
    b[cls.primary] += prim; b[cls.secondary] += sec;
    for (let i = 0; i < rnd; i++) b[D.attrs[rng.roll(6)]] += 2;
    return b;
  }
  function emptyAttrs(D) { const o = {}; for (const a of D.attrs) o[a] = 0; return o; }

  // Génère un héros (tirages T3..T9 du document Aventuriers §9.3 ; la rareté et le niveau sont fournis).
  function genHero(D, rng, state, opts) {
    const classId = opts.class_id || D.raw.classes[rng.roll(5)].id;
    const gender = rng.roll(2) === 0 ? 'm' : 'f';
    const names = gender === 'm' ? D.raw.first_names_m : D.raw.first_names_f;
    const first = names[rng.roll(names.length)];
    const epithet = D.raw.epithets[rng.roll(D.raw.epithets.length)];
    const rarity = opts.rarity || 'common';
    const age = opts.age_seasons !== undefined ? opts.age_seasons : D.C.rarity_age_base[rarity] + rng.roll(D.C.rarity_age_spread[rarity]);
    const traits = genTraits(D, rng, rarity);
    const bonus = genBonusAttrs(D, rng, classId, rarity);
    const level = clamp(opts.level, 1, D.C.level_max);
    const h = {
      id: opts.id || null, owner: opts.owner || null, first_name: first, epithet: epithet, gender: gender,
      class_id: classId, rarity: rarity, level: level, xp: D.raw.xp_table[level],
      bonus_attrs: bonus, trained: emptyAttrs(D), train_points: {},
      form: 50, fatigue: 0, morale: 60, injury: { severity: 0, days_left: 0 }, scars: 0,
      age_seasons: age, traits: traits, wage: opts.wage !== undefined ? opts.wage : wageOf(D, level, rarity),
      unpaid_days: 0, equipment: { weapon: null, armor: null, trinket: null, potion: null },
      history: { expeditions: 0, victories: 0, injuries: 0, level_ups: 0 }, last_activity: 'rest', last_team: []
    };
    return h;
  }
  function wageOf(D, level, rarity) { return div((D.C.wage_base + level) * D.C.wage_rarity_pct[rarity], 100); }
  function recruitCost(D, level, rarity) { return 40 + level * level * 4 + D.C.rarity_cost[rarity]; }

  // Collision de nom : suffixe romain.
  function uniqueName(state, h) {
    const taken = {};
    for (const id of sortedKeys(state.heroes)) taken[heroName(state.heroes[id])] = 1;
    for (const o of state.tavern) taken[heroName(o.hero)] = 1;
    const base = h.epithet;
    const suffixes = ['', ' II', ' III', ' IV', ' V', ' VI'];
    for (const s of suffixes) { h.epithet = base + s; if (!taken[heroName(h)]) return; }
  }
  function heroesOf(state, managerId) {
    return sortedKeys(state.heroes).map(id => state.heroes[id]).filter(h => h.owner === managerId);
  }
  function allHeroes(state) { return sortedKeys(state.heroes).map(id => state.heroes[id]); }
  function rosterCap(D, state) { if (state.max_heroes) return state.max_heroes; return D.C.roster_cap_base + state.buildings.hall; }
  function bLevel(D, state, id) { return state.buildings[id] || 0; }
  function bEffect(D, state, id, key, fallback) {
    const lv = bLevel(D, state, id);
    if (lv <= 0) return fallback;
    return D.buildings[id].levels[lv - 1].effect[key];
  }
  function guildLevel(D, state) { return clamp(1 + div(state.guild.prestige, D.C.guild_level_prestige_step), 1, 10); }

  // ===================================================================================
  // 3. QUÊTES (tableau), MARCHÉ, TAVERNE : générateurs
  // ===================================================================================
  function questName(D, q) {
    const list = D.raw.quest_names[q.type];
    const tpl = list[fnvStr(q.id) % list.length];
    const m = q.target_monster_id ? D.monsters[q.target_monster_id] : null;
    const name = m ? m.name.toLowerCase() : '';
    const vowel = /^[aeiouyéèêh]/.test(name), fem = m && m.gender === 'f';
    return fill(tpl, { monster: name, biome: D.biomes[q.biome].name, au: vowel ? "à l'" : fem ? 'à la ' : 'au ', du: vowel ? "de l'" : fem ? 'de la ' : 'du ', le: vowel ? "l'" : fem ? 'la ' : 'le ' });
  }
  function gv(h, vars) { return Object.assign({ e: h.gender === 'f' ? 'e' : '', il: h.gender === 'f' ? 'elle' : 'il', le: h.gender === 'f' ? 'la' : 'le' }, vars); }
  function bestiaryFor(D, biomeId, L) {
    return D.raw.monsters.filter(m => (m.biome === biomeId) && m.level_min <= L && L <= m.level_max && m.spawn_weight > 0);
  }
  function genQuest(D, state, rng) {
    const GL = guildLevel(D, state);
    let tier = 0;
    D.raw.quest_type_weight_tiers.forEach((t, i) => { if (GL >= t) tier = i; });
    const typeId = rng.pickWeighted(D.raw.quest_types.map(t => [t.id, t.weights[tier]]));
    const type = D.quest_types[typeId];
    const biomeId = rng.pickWeighted(D.raw.biomes.map(b => [b.id, b.weight]));
    const d = clamp(GL - 1 + rng.roll(3), type.diff_min, type.diff_max);
    const ttl = 1 + rng.roll(3);
    let target = null;
    if (typeId === 'hunt') {
      const pool = bestiaryFor(D, biomeId, D.difficulty[d].monster_level);
      target = pool.length ? rng.pickWeighted(pool.map(m => [m.id, m.spawn_weight])) : D.raw.monster_fallback[biomeId];
    }
    const q = { id: 'q' + pad3(state.next_quest), type: typeId, biome: biomeId, difficulty: d, posted_day: state.day,
      expires_day: state.day + ttl, target_monster_id: target, target_count: 3 + div(d, 2), name: '' };
    state.next_quest += 1;
    q.name = questName(D, q);
    return q;
  }
  function refreshMarket(D, state, rng) {
    const lv = bLevel(D, state, 'market');
    const stock = D.raw.market_base_stock.map(id => ({ item_id: id, stock: D.items[id].slot === 'potion' ? 3 : 2 }));
    const rares = D.raw.items.filter(it => it.rarity === 'rare');
    const nRare = D.C.market_stock_rare[lv] + (lv > 0 ? 0 : 0);
    for (let i = 0; i < nRare; i++) {
      const it = rares[rng.roll(rares.length)];
      const ex = stock.filter(s => s.item_id === it.id)[0];
      if (ex) ex.stock += 1; else stock.push({ item_id: it.id, stock: 1 });
    }
    state.market = stock;
  }
  function rollRarity(D, state, rng) {
    const lv = clamp(bLevel(D, state, 'tavern'), 1, 3);
    const r = rng.roll(1000);
    if (lv === 1) return r < 700 ? 'common' : 'uncommon';
    if (lv === 2) return r < 600 ? 'common' : r < 900 ? 'uncommon' : 'rare';
    return r < 550 ? 'common' : r < 830 ? 'uncommon' : r < 980 ? 'rare' : 'legendary';
  }
  function genOffer(D, state, rng, i) {
    const heroes = allHeroes(state);
    const avg = Math.max(1, div(sum(heroes.map(h => h.level)), Math.max(1, heroes.length)));
    const rarity = rollRarity(D, state, rng);
    const level = clamp(avg - 2 + rng.roll(5) + D.C.rarity_level[rarity], 1, D.C.level_max);
    const h = genHero(D, rng, state, { level: level, rarity: rarity });
    uniqueName(state, h);
    return { id: 't' + pad2(state.day) + '_' + i, hero: h, cost: recruitCost(D, level, rarity), wage: h.wage, expires_day: state.day + D.C.offer_ttl_days };
  }

  // ===================================================================================
  // 4. NOUVELLE PARTIE
  // ===================================================================================
  function newGame(seed, data, options) {
    const D = index(data);
    GLOBAL_DATA = data;
    seed = (seed | 0) >>> 0;
    const rng = makeRng(fnvU32(seed ^ 0));
    const hm = D.raw.human_manager;
    // Option « un héros chacun » : options.managers = [{id,name,kind,profile,class_id}], options.heroes_per_manager (défaut 1 si managers fourni).
    const customManagers = options && Array.isArray(options.managers) && options.managers.length ? options.managers : null;
    const heroesPer = customManagers ? ((options.heroes_per_manager | 0) || 1) : 0;
    const state = {
      seed: seed, day: 1, season_length: D.C.season_length,
      managers: customManagers ? customManagers.map(m => ({ id: m.id, name: m.name, kind: m.kind === 'ai' ? 'ai' : 'human', profile: m.profile || (m.kind === 'ai' ? 'prudent' : hm.profile) })) : [
        { id: hm.id, name: hm.name, kind: 'human', profile: hm.profile },
        { id: 'ai_prudent', name: D.profiles.prudent.name, kind: 'ai', profile: 'prudent' },
        { id: 'ai_audacieux', name: D.profiles.audacieux.name, kind: 'ai', profile: 'audacieux' }
      ],
      purses: {}, guild: { gold: D.C.start_gold_guild, prestige: 0 }, heroes: {}, buildings: {}, construction: null,
      warehouse: {}, inventories: {}, forge_queue: [], quests: [], tavern: [], market: [], quarters: {},
      next_uid: 1, next_quest: 1, next_hero: {}, history: [], last_chronicle: null,
      derby: { last: null }, season_report: null, notices: [],
      stats: { expeditions: 0, successes: 0, gold_earned: 0, derby_wins: 0, derby_losses: 0, derby_draws: 0, level_ups: 0, injuries: 0, items_found: 0 }
    };
    for (const b of D.raw.buildings) state.buildings[b.id] = b.start_level;
    for (const r of D.raw.resources) state.warehouse[r.id] = 0;
    for (const m of state.managers) {
      state.purses[m.id] = D.C.start_gold_manager;
      state.inventories[m.id] = { resources: {}, items: [] };
      for (const r of D.raw.resources) state.inventories[m.id].resources[r.id] = 0;
      state.quarters[m.id] = [];
      state.next_hero[m.id] = 1;
    }
    // Roster de départ : fondateurs fixes pour p1, tirés pour les IA (ordre des managers triés par id).
    if (customManagers) {
      state.max_heroes = heroesPer;
      for (const m of customManagers) {
        for (let i = 0; i < heroesPer; i++) {
          const cls = (i === 0 && m.class_id && D.classes[m.class_id]) ? m.class_id : D.raw.classes[rng.roll(5)].id;
          addHero(D, state, m.id, genHero(D, rng, state, { class_id: cls, level: 2, age_seasons: 5 + rng.roll(8), wage: 0 }));
        }
      }
    } else for (const f of D.raw.founders) addHero(D, state, 'p1', genHero(D, rng, state, { class_id: f.class_id, level: f.level, age_seasons: f.age_seasons, wage: 0 }));
    for (const mid of customManagers ? [] : ['ai_audacieux', 'ai_prudent']) {
      const used = {};
      for (let i = 0; i < 3; i++) {
        let ci = rng.roll(5);
        while (used[ci]) ci = (ci + 1) % 5;
        used[ci] = 1;
        const lvl = 1 + rng.roll(3), age = 5 + rng.roll(8);
        addHero(D, state, mid, genHero(D, rng, state, { class_id: D.raw.classes[ci].id, level: lvl, age_seasons: age, wage: 0 }));
      }
    }
    for (const mid of sortedKeys(state.inventories)) {   // deux fioles de départ par manager
      giveItem(D, state, mid, 'c_potion_soin'); giveItem(D, state, mid, 'c_ration');
    }
    state.warehouse.wood = 12; state.warehouse.stone = 6;
    const nq = D.C.board_min + rng.roll(D.C.board_extra);
    for (let i = 0; i < nq; i++) state.quests.push(genQuest(D, state, rng));
    refreshMarket(D, state, rng);
    const nOffers = D.C.tavern_offers[bLevel(D, state, 'tavern')];
    for (let i = 0; i < nOffers; i++) state.tavern.push(genOffer(D, state, rng, i));
    return attachData(state, data);
  }
  function addHero(D, state, owner, h) {
    h.id = 'h_' + owner + '_' + pad3(state.next_hero[owner]);
    state.next_hero[owner] += 1;
    h.owner = owner;
    uniqueName(state, h);
    state.heroes[h.id] = h;
    return h;
  }
  function giveItem(D, state, owner, itemId) {
    const uid = 'i' + pad3(state.next_uid);
    state.next_uid += 1;
    state.inventories[owner].items.push({ uid: uid, item_id: itemId });
    return uid;
  }
  function listManagers(state) { return state.managers.map(m => m.id); }
  function managerOf(state, id) { return state.managers.filter(m => m.id === id)[0] || null; }
  function findItem(state, owner, ref) {   // ref = uid, sinon premier objet du catalogue non équipé
    const inv = state.inventories[owner];
    if (!inv) return null;
    const byUid = inv.items.filter(x => x.uid === ref)[0];
    if (byUid) return byUid;
    const equipped = equippedUids(state, owner);
    return inv.items.filter(x => x.item_id === ref && !equipped[x.uid])[0] || null;
  }
  function equippedUids(state, owner) {
    const m = {};
    for (const h of heroesOf(state, owner)) for (const s of sortedKeys(h.equipment)) if (h.equipment[s]) m[h.equipment[s]] = h.id;
    return m;
  }
  function warehouseUsed(state) { return sum(sortedKeys(state.warehouse).map(k => state.warehouse[k])); }
  function warehouseCap(D, state) { return D.C.warehouse_capacity[bLevel(D, state, 'warehouse')]; }
  function canAffordRecipe(D, state, owner, recipe) {
    const inv = state.inventories[owner];
    for (const r of sortedKeys(recipe.cost)) if ((inv.resources[r] || 0) < recipe.cost[r]) return 'ressources insuffisantes (' + D.resources[r].name + ')';
    if (state.purses[owner] < recipe.gold) return 'or insuffisant';
    if (recipe.forge_level > bLevel(D, state, 'forge')) return 'forge de niveau ' + recipe.forge_level + ' requise';
    const cap = D.C.forge_capacity[bLevel(D, state, 'forge')];
    if (state.forge_queue.length >= cap) return 'file de forge pleine';
    return null;
  }

  // ===================================================================================
  // 5. VALIDATION DES ACTIONS (jamais d'exception, raison en français)
  // ===================================================================================
  const ACTIVITIES = ['gather', 'train', 'craft', 'rest', 'expedition'];
  function bad(reason) { return { ok: false, reason: reason }; }
  function validateAction(state, action) {
    try { return validateInner(state, action); } catch (e) { return bad('action malformée'); }
  }
  function validateInner(state, a) {
    const D = index(state.__data || GLOBAL_DATA);
    if (!a || typeof a !== 'object') return bad('action absente');
    if (!managerOf(state, a.manager_id)) return bad('manager inconnu');
    if (a.day !== state.day) return bad('action datée du jour ' + a.day + ', nous sommes au jour ' + state.day);
    const p = a.payload || {};
    const mine = id => state.heroes[id] && state.heroes[id].owner === a.manager_id ? state.heroes[id] : null;
    switch (a.type) {
      case 'assign': return validateAssign(D, state, a, p, mine);
      case 'vote_quest': return state.quests.some(q => q.id === p.quest_id) ? { ok: true } : bad('quête absente du tableau');
      case 'vote_build': {
        const b = D.buildings[p.building_id];
        if (!b) return bad('bâtiment inconnu');
        if (state.construction) return bad('un chantier est déjà en cours');
        if (bLevel(D, state, b.id) >= 4) return bad(b.name + ' est déjà au niveau maximal');
        return { ok: true };
      }
      case 'craft_order': {
        const r = D.recipes[p.recipe_id];
        if (!r) return bad('recette inconnue');
        const why = canAffordRecipe(D, state, a.manager_id, r);
        return why ? bad(why) : { ok: true };
      }
      case 'recruit': {
        const o = state.tavern.filter(x => x.id === p.recruit_id)[0];
        if (!o) return bad('cette recrue n\'est plus à la taverne');
        if (state.purses[a.manager_id] < o.cost) return bad('or insuffisant (' + o.cost + ' requis)');
        if (heroesOf(state, a.manager_id).length >= rosterCap(D, state)) return bad('effectif complet (' + rosterCap(D, state) + ')');
        return { ok: true };
      }
      case 'equip': {
        const h = mine(p.adventurer_id);
        if (!h) return bad('aventurier inconnu ou pas à vous');
        const it = findItem(state, a.manager_id, p.item_id);
        if (!it) return bad('objet absent de votre inventaire');
        const holder = equippedUids(state, a.manager_id)[it.uid];
        if (holder) return bad('objet déjà porté par ' + heroName(state.heroes[holder]));
        return { ok: true };
      }
      case 'unequip': {
        const h = mine(p.adventurer_id);
        if (!h) return bad('aventurier inconnu ou pas à vous');
        if (!(p.slot in h.equipment)) return bad('emplacement inconnu');
        if (!h.equipment[p.slot]) return bad('emplacement déjà vide');
        return { ok: true };
      }
      case 'deposit': case 'withdraw': {
        if (!D.resources[p.resource_id]) return bad('ressource inconnue');
        if (!Number.isInteger(p.qty) || p.qty <= 0) return bad('quantité invalide');
        if (a.type === 'deposit') {
          if (state.inventories[a.manager_id].resources[p.resource_id] < p.qty) return bad('vous n\'avez pas cette quantité');
          if (warehouseUsed(state) + p.qty > warehouseCap(D, state)) return bad('entrepôt plein');
        } else if (state.warehouse[p.resource_id] < p.qty) return bad('l\'entrepôt n\'a pas cette quantité');
        return { ok: true };
      }
      case 'buy': {
        const s = state.market.filter(x => x.item_id === p.item_id)[0];
        if (!s || s.stock <= 0) return bad('article épuisé');
        if (state.purses[a.manager_id] < D.items[p.item_id].price) return bad('or insuffisant');
        return { ok: true };
      }
      case 'sell': {
        const it = findItem(state, a.manager_id, p.item_id);
        if (!it) return bad('objet absent de votre inventaire');
        if (equippedUids(state, a.manager_id)[it.uid]) return bad('objet porté : déséquipez-le d\'abord');
        return { ok: true };
      }
      case 'decorate': {
        const d = D.decorations[p.decoration_id];
        if (!d) return bad('décoration inconnue');
        if (!Number.isInteger(p.x) || !Number.isInteger(p.y) || p.x < 0 || p.y < 0 || p.x >= D.C.quarter_grid_w || p.y >= D.C.quarter_grid_h) return bad('case hors du quartier');
        if (state.quarters[a.manager_id].some(q => q.x === p.x && q.y === p.y)) return bad('case déjà occupée');
        if (state.purses[a.manager_id] < d.cost_gold) return bad('or insuffisant');
        return { ok: true };
      }
      default: return bad('type d\'action inconnu');
    }
  }
  function validateAssign(D, state, a, p, mine) {
    const h = mine(p.adventurer_id);
    if (!h) return bad('aventurier inconnu ou pas à vous');
    if (ACTIVITIES.indexOf(p.activity) < 0) return bad('activité inconnue');
    if (h.injury.severity >= 2 && p.activity !== 'rest') return bad(heroName(h) + ' est trop blessé : repos obligatoire');
    if (h.fatigue >= 100 && p.activity !== 'rest') return bad(heroName(h) + ' est épuisé : repos obligatoire');
    if (h.injury.severity >= 1 && p.activity === 'expedition') return bad(heroName(h) + ' est blessé : pas d\'expédition');
    if (p.activity === 'gather' && !D.resources[p.target]) return bad('ressource cible inconnue');
    if (p.activity === 'train' && D.attrs.indexOf(p.target) < 0) return bad('attribut cible inconnu');
    if (p.activity === 'craft' && p.target && !D.recipes[p.target]) return bad('recette cible inconnue');
    return { ok: true };
  }

  // ===================================================================================
  // 6. PLANS PAR DÉFAUT (humain raisonnable, IA prudente, IA audacieuse) — déterministes
  // ===================================================================================
  function planDefaults(state, managerId) {
    const D = index(state.__data || GLOBAL_DATA);
    const m = managerOf(state, managerId);
    if (!m) return [];
    const prof = m.kind === 'ai' ? D.profiles[m.profile] : D.profiles.prudent;
    const P = m.kind === 'ai' ? prof : { rest_fatigue: 60, expedition_max: 3, expedition_fatigue_max: 45, expedition_min_level_margin: -1, train_every: 3, buy_potions: false, vote_quest: 'fit', vote_build: 'cheapest', recruit_gold_margin: 60 };
    const out = [];
    const act = (type, payload) => out.push({ manager_id: managerId, day: state.day, type: type, payload: payload });
    const heroes = heroesOf(state, managerId);
    const avg = heroes.length ? div(sum(heroes.map(h => h.level)), heroes.length) : 1;
    const quest = pickQuestVote(D, state, P.vote_quest, avg);
    if (quest) act('vote_quest', { quest_id: quest.id });
    const target = predictQuest(D, state) || quest;   // la quête que le vote collectif retiendra (plans déterministes)
    const build = pickBuildVote(D, state, P.vote_build);
    if (build) act('vote_build', { building_id: build });
    planEquip(D, state, managerId, heroes, act);
    const needs = planResources(D, state, m, build, act);
    const derbyDay = D.C.derby_days.indexOf(state.day) >= 0, derbyEve = D.C.derby_days.indexOf(state.day + 1) >= 0;
    let PP = P;
    if (derbyDay) PP = Object.assign({}, P, { expedition_fatigue_max: P.expedition_fatigue_max + 30, rest_fatigue: Math.max(P.rest_fatigue, P.expedition_fatigue_max + 31), expedition_min_level_margin: P.expedition_min_level_margin - 1 });
    else if (derbyEve) PP = Object.assign({}, P, { expedition_fatigue_max: 15 });   // veille de derby : on garde les troupes fraîches
    planAssign(D, state, PP, heroes, target, needs, act);
    planEconomy(D, state, m, P, heroes, act);
    return out.filter(x => validateAction(state, x).ok);
  }
  function pickQuestVote(D, state, mode, avg) {
    const qs = state.quests.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
    if (!qs.length) return null;
    const gold = q => D.difficulty[q.difficulty].gold_base * D.quest_types[q.type].reward_gold_pct;
    const easiest = qs.reduce((b, q) => (q.difficulty < b.difficulty ? q : b), qs[0]);
    if (mode === 'easiest') return easiest;
    if (mode === 'richest') return qs.reduce((b, q) => (gold(q) > gold(b) ? q : b), qs[0]);
    const fit = qs.filter(q => D.difficulty[q.difficulty].rec_level <= avg + 2);
    return fit.length ? fit.reduce((b, q) => (gold(q) > gold(b) ? q : b), fit[0]) : easiest;
  }
  // Prédit la quête retenue par le vote de tous les managers (mêmes règles que resolveVotes).
  function predictQuest(D, state) {
    const votes = {};
    for (const m of state.managers) {
      const mode = m.kind === 'ai' ? D.profiles[m.profile].vote_quest : 'fit';
      const hs = heroesOf(state, m.id);
      const q = pickQuestVote(D, state, mode, hs.length ? div(sum(hs.map(h => h.level)), hs.length) : 1);
      if (q) votes[m.id] = q.id;
    }
    const t = tally(votes);
    return t ? state.quests.filter(q => q.id === t.id)[0] || null : null;
  }
  function pickBuildVote(D, state, mode) {
    if (state.construction) return null;
    const cands = D.raw.buildings.filter(b => bLevel(D, state, b.id) < 4);
    if (!cands.length) return null;
    const deficit = b => { const n = buildingNeeds(D, state, b.id); return n.gold + 3 * sum(sortedKeys(n.res).map(r => n.res[r])); };
    const cost = b => { const L = b.levels[bLevel(D, state, b.id)]; return L.gold + 3 * sum(sortedKeys(L.cost).map(r => L.cost[r])); };
    if (warehouseUsed(state) * 10 >= warehouseCap(D, state) * 8 && cands.some(b => b.id === 'warehouse')) return 'warehouse';
    if (mode === 'training_ground' && cands.some(b => b.id === 'training_ground')) return 'training_ground';
    const fundable = cands.filter(b => canFundBuilding(D, state, b.id) === null);
    if (fundable.length) return fundable.reduce((best, b) => (cost(b) < cost(best) ? b : best), fundable[0]).id;
    return cands.reduce((best, b) => (deficit(b) < deficit(best) ? b : best), cands[0]).id;
  }
  // Ressources manquantes à l'entrepôt pour le prochain niveau d'un bâtiment.
  function buildingNeeds(D, state, id) {
    const out = { res: {}, gold: 0 };
    if (!id || bLevel(D, state, id) >= 4) return out;
    const L = D.buildings[id].levels[bLevel(D, state, id)];
    for (const r of sortedKeys(L.cost)) { const d = L.cost[r] - (state.warehouse[r] || 0); if (d > 0) out.res[r] = d; }
    out.gold = Math.max(0, L.gold - state.guild.gold);
    return out;
  }
  // Dépôts ciblés sur les besoins du chantier voté ; les IA retirent le surplus qui encombre l'entrepôt.
  function planResources(D, state, m, buildId, act) {
    const needs = buildingNeeds(D, state, buildId).res;
    const inv = state.inventories[m.id].resources;
    let free = warehouseCap(D, state) - warehouseUsed(state);
    for (const r of sortedKeys(needs)) {
      const q = Math.min(needs[r], inv[r] || 0, free);
      if (q > 0) { act('deposit', { resource_id: r, qty: q }); free -= q; needs[r] -= q; }
    }
    const missing = sum(sortedKeys(needs).map(r => needs[r]));
    if (m.kind === 'ai' && m.id === state.managers.filter(x => x.kind === 'ai').map(x => x.id).sort()[0] && missing > free) {
      const wanted = buildId ? D.buildings[buildId].levels[bLevel(D, state, buildId)].cost : {};
      let room = missing - free;
      for (const r of sortedKeys(state.warehouse)) {
        if (room <= 0) break;
        if (wanted[r] || !(state.warehouse[r] > 0)) continue;
        const q = Math.min(state.warehouse[r], room);
        act('withdraw', { resource_id: r, qty: q }); room -= q;
      }
    }
    return needs;
  }
  function canFundBuilding(D, state, id) {
    const lv = bLevel(D, state, id);
    const L = D.buildings[id].levels[lv];
    for (const r of sortedKeys(L.cost)) if ((state.warehouse[r] || 0) < L.cost[r]) return 'il manque ' + (L.cost[r] - (state.warehouse[r] || 0)) + ' ' + D.resources[r].name.toLowerCase() + ' à l\'entrepôt';
    const reserve = 3 * dailyUpkeep(D, state);
    if (state.guild.gold < L.gold + reserve) return 'la caisse de guilde manque de ' + (L.gold + reserve - state.guild.gold) + ' pièces (réserve de ' + reserve + ' comprise)';
    return null;
  }
  function dailyUpkeep(D, state) {
    return sum(allHeroes(state).map(h => h.wage)) + D.C.upkeep_per_building_level * sum(sortedKeys(state.buildings).map(b => state.buildings[b]));
  }
  function planEquip(D, state, managerId, heroes, act) {
    const inv = state.inventories[managerId];
    const equipped = equippedUids(state, managerId);
    const filled = {};
    for (const h of heroes) for (const s of sortedKeys(h.equipment)) if (h.equipment[s]) filled[h.id + '|' + s] = 1;
    for (const it of inv.items.slice().sort((a, b) => (a.uid < b.uid ? -1 : 1))) {
      if (equipped[it.uid]) continue;
      const slot = D.items[it.item_id].slot;
      const h = heroes.filter(x => !filled[x.id + '|' + slot] && (slot !== 'potion' || x.injury.severity === 0))[0];
      if (h) { filled[h.id + '|' + slot] = 1; act('equip', { adventurer_id: h.id, item_id: it.uid }); }
    }
  }
  function planAssign(D, state, P, heroes, quest, needs, act) {
    let sent = 0;
    const maxParty = quest ? Math.min(P.expedition_max, D.quest_types[quest.type].party_max) : 0;
    const rec = quest ? D.difficulty[quest.difficulty].rec_level : 99;
    for (const h of heroes) {
      let plan;
      if (h.injury.severity >= 1 || h.fatigue >= 100) plan = { activity: 'rest' };
      else if (h.fatigue >= P.rest_fatigue || h.morale < 25) plan = { activity: 'rest' };
      else if (quest && sent < maxParty && h.fatigue <= P.expedition_fatigue_max && h.level >= rec + P.expedition_min_level_margin) { plan = { activity: 'expedition' }; sent++; }
      else if (state.day % P.train_every === 0) plan = { activity: 'train', target: D.classes[h.class_id].primary };
      else if (craftJobFor(state, h)) plan = { activity: 'craft' };
      else plan = { activity: 'gather', target: gatherTargetFor(D, h, needs) };
      act('assign', { adventurer_id: h.id, activity: plan.activity, target: plan.target });
    }
  }
  function craftJobFor(state, h) {
    return (h.class_id === 'warrior' || h.class_id === 'mage') && state.forge_queue.some(q => q.owner === h.owner);
  }
  function gatherTargetFor(D, h, needs) {
    const wanted = sortedKeys(needs || {}).filter(r => needs[r] > 0).sort((a, b) => needs[b] - needs[a] || (a < b ? -1 : 1));
    if (wanted.length) return wanted[(h.level + fnvStr(h.id) % 3) % wanted.length];
    if (h.class_id === 'warrior') return 'iron_ore';
    if (h.class_id === 'mage') return 'swamp_moss';
    if (h.class_id === 'cleric') return 'herbs';
    return h.class_id === 'rogue' ? 'hide' : 'wood';
  }
  function planEconomy(D, state, m, P, heroes, act) {
    const mid = m.id, inv = state.inventories[mid];
    const offers = state.tavern.slice().sort((a, b) => a.cost - b.cost);
    if (offers.length && heroes.length < rosterCap(D, state) && state.purses[mid] >= offers[0].cost + P.recruit_gold_margin) act('recruit', { recruit_id: offers[0].id });
    if (P.buy_potions && state.purses[mid] >= 100) {
      const potions = inv.items.filter(x => x.item_id === 'c_potion_soin').length;
      const s = state.market.filter(x => x.item_id === 'c_potion_soin')[0];
      if (s && s.stock > 0 && potions < heroes.length) act('buy', { item_id: 'c_potion_soin' });
    }
    const want = m.kind === 'ai' && m.profile === 'audacieux' ? ['r_potion_soin', 'r_epee_fer', 'r_cuir'] : ['r_potion_soin', 'r_gambison'];
    for (const rid of want) if (!state.forge_queue.some(q => q.owner === mid && q.recipe_id === rid) && canAffordRecipe(D, state, mid, D.recipes[rid]) === null) { act('craft_order', { recipe_id: rid }); break; }
    if (m.kind === 'ai') {
      const deco = m.profile === 'audacieux' ? 'banniere' : 'banc';
      const placed = state.quarters[mid];
      if (placed.length < 4 && state.purses[mid] >= D.decorations[deco].cost_gold + 150) {
        const cell = firstFreeCell(D, placed);
        if (cell) act('decorate', { decoration_id: deco, x: cell.x, y: cell.y });
      }
    }
  }
  function firstFreeCell(D, placed) {
    for (let y = 0; y < D.C.quarter_grid_h; y++) for (let x = 0; x < D.C.quarter_grid_w; x++) if (!placed.some(p => p.x === x && p.y === y)) return { x: x, y: y };
    return null;
  }

  // ===================================================================================
  // 7. JOURNÉE — contexte, phases 1 à 6
  // ===================================================================================
  const PHASES = [['matin', 'Matin'], ['paie', 'Trésorerie'], ['recolte', 'Récolte'], ['entrainement', 'Entraînement'],
    ['forge', 'Forge'], ['infirmerie', 'Infirmerie'], ['expedition', 'Expédition'], ['marche', 'Marché'],
    ['taverne', 'Taverne'], ['chantier', 'Chantier'], ['soir', 'Soir'], ['derby', 'Derby'], ['bilan', 'Bilan de saison']];
  function say(ctx, phase, text) { if (text) ctx.sections[phase].lines.push(text); }
  function moment(ctx, score, text) { ctx.moments.push({ score: score, text: text, seq: ctx.moments.length }); }
  function tpl(ctx, kind, salt, vars) { return pickTpl(ctx.D, kind, ctx.state.day + '|' + salt, vars); }
  function managerName(state, id) { const m = managerOf(state, id); return m ? m.name : id; }

  function makeCtx(D, state) {
    const ctx = { D: D, state: state, rng: makeRng(fnvU32(state.seed ^ state.day)), sections: {}, moments: [], plans: {},
      votes_quest: {}, votes_build: {}, queued: { craft: [], buy: [], sell: [], recruit: [] }, effective: {}, forced: {},
      notices: [], log: [], expedition: null, exp_result: null, quest: null, xp: {}, build_vote: null,
      summary: { gold_delta: 0, injuries: [], level_ups: [], recruits: [], construction: '' }, gold_start: 0 };
    for (const p of PHASES) ctx.sections[p[0]] = { phase: p[0], title: p[1], lines: [] };
    return ctx;
  }

  // ---- Phase 1 : validation, actions immédiates, votes, activité effective ----
  function phaseValidation(ctx, actions) {
    const state = ctx.state, D = ctx.D;
    const received = actions.map((a, i) => ({ a: a, i: i }));
    const seen = {};
    for (const r of received) if (r.a && r.a.manager_id) seen[r.a.manager_id] = 1;
    for (const m of state.managers) if (!seen[m.id]) for (const a of planDefaults(state, m.id)) received.push({ a: a, i: received.length });
    received.sort((x, y) => {
      const ma = String(x.a && x.a.manager_id), mb = String(y.a && y.a.manager_id);
      return ma < mb ? -1 : ma > mb ? 1 : x.i - y.i;
    });
    for (const r of received) {
      const a = r.a;
      const v = validateAction(state, a);
      if (!v.ok) {
        const who = a && a.manager_id ? managerName(state, a.manager_id) : '?';
        const txt = tpl(ctx, 'rejected', (a && a.type) + r.i, { m: who, reason: v.reason });
        ctx.notices.push(txt); ctx.log.push('REJET ' + JSON.stringify(a) + ' : ' + v.reason);
        say(ctx, 'matin', txt);
        continue;
      }
      applyOrQueue(ctx, a);
    }
    resolveVotes(ctx);
    resolveEffective(ctx);
  }
  function applyOrQueue(ctx, a) {
    const state = ctx.state, D = ctx.D, p = a.payload;
    switch (a.type) {
      case 'assign': ctx.plans[p.adventurer_id] = { activity: p.activity, target: p.target || null, manager: a.manager_id }; break;
      case 'vote_quest': ctx.votes_quest[a.manager_id] = p.quest_id; break;
      case 'vote_build': ctx.votes_build[a.manager_id] = p.building_id; break;
      case 'craft_order': ctx.queued.craft.push(a); break;
      case 'buy': ctx.queued.buy.push(a); break;
      case 'sell': ctx.queued.sell.push(a); break;
      case 'recruit': ctx.queued.recruit.push(a); break;
      case 'equip': {
        const h = state.heroes[p.adventurer_id], it = findItem(state, a.manager_id, p.item_id);
        h.equipment[D.items[it.item_id].slot] = it.uid;
        ctx.log.push(heroName(h) + ' équipe ' + D.items[it.item_id].name);
        break;
      }
      case 'unequip': state.heroes[p.adventurer_id].equipment[p.slot] = null; break;
      case 'deposit': state.inventories[a.manager_id].resources[p.resource_id] -= p.qty; state.warehouse[p.resource_id] += p.qty; break;
      case 'withdraw': state.warehouse[p.resource_id] -= p.qty; state.inventories[a.manager_id].resources[p.resource_id] += p.qty; break;
      case 'decorate': {
        state.purses[a.manager_id] -= D.decorations[p.decoration_id].cost_gold;
        state.quarters[a.manager_id].push({ decoration_id: p.decoration_id, x: p.x, y: p.y });
        state.guild.prestige += D.decorations[p.decoration_id].prestige;
        say(ctx, 'matin', managerName(state, a.manager_id) + ' installe ' + D.decorations[p.decoration_id].name.toLowerCase() + ' dans son quartier.');
        break;
      }
    }
  }
  function tally(votes) {
    const count = {};
    for (const m of sortedKeys(votes)) count[votes[m]] = (count[votes[m]] || 0) + 1;
    let best = null;
    for (const id of sortedKeys(count)) if (best === null || count[id] > count[best]) best = id;
    return best === null ? null : { id: best, votes: count[best] };
  }
  function resolveVotes(ctx) {
    const state = ctx.state, D = ctx.D;
    const q = tally(ctx.votes_quest);
    ctx.quest = q ? state.quests.filter(x => x.id === q.id)[0] || null : null;
    if (ctx.quest) say(ctx, 'matin', tpl(ctx, 'vote_quest', 'q', { q: ctx.quest.name, votes: q.votes }));
    else say(ctx, 'matin', tpl(ctx, 'vote_none', 'q', {}));
    const b = tally(ctx.votes_build);
    ctx.build_vote = b ? b.id : null;
    if (ctx.build_vote) say(ctx, 'matin', tpl(ctx, 'vote_build', 'b', { b: D.buildings[b.id].name, n: bLevel(D, state, b.id) + 1 }));
  }
  function resolveEffective(ctx) {
    const state = ctx.state;
    for (const h of allHeroes(state)) {
      const plan = ctx.plans[h.id];
      let act = plan ? plan.activity : 'rest';
      let target = plan ? plan.target : null;
      if (h.fatigue >= 100 && act !== 'rest') { act = 'rest'; ctx.forced[h.id] = 'épuisé'; }
      if (h.injury.severity >= 2 && act !== 'rest') { act = 'rest'; ctx.forced[h.id] = 'blessé'; }
      if (h.injury.severity === 1 && act === 'expedition') { act = 'rest'; ctx.forced[h.id] = 'blessé'; }
      ctx.effective[h.id] = { activity: act, target: target };
    }
  }

  // ---- Phase 2 : paie et entretien (or de guilde) ----
  function phasePay(ctx) {
    const state = ctx.state, D = ctx.D;
    const heroes = allHeroes(state);
    const wages = sum(heroes.map(h => h.wage));
    const upkeep = D.C.upkeep_per_building_level * sum(sortedKeys(state.buildings).map(b => state.buildings[b]));
    const total = wages + upkeep;
    if (state.guild.gold >= total) {
      state.guild.gold -= total;
      for (const h of heroes) h.unpaid_days = 0;
      say(ctx, 'paie', tpl(ctx, 'pay_ok', 'p', { n: total, gold: state.guild.gold }));
    } else {
      const paid = Math.min(state.guild.gold, upkeep);
      state.guild.gold -= paid;
      for (const h of heroes) if (h.wage > 0) { h.unpaid_days += 1; h.morale = clamp(h.morale - 10, 0, 100); }
      say(ctx, 'paie', tpl(ctx, 'pay_fail', 'p', { n: total - paid }));
      moment(ctx, 35, 'La caisse de la guilde est vide : les soldes restent impayées.');
    }
  }

  // ---- Phase 3 : récolte ----
  function phaseGather(ctx) {
    const state = ctx.state, D = ctx.D;
    for (const h of allHeroes(state)) {
      const e = ctx.effective[h.id];
      if (e.activity !== 'gather') continue;
      const res = D.resources[e.target] || D.resources.wood;
      const biome = D.biomes[res.biome];
      const units = Math.max(1, div(gatherPower(D, state, h, biome.id), 10));
      const share = (biome.gather_split.filter(s => s[0] === res.id)[0] || [res.id, 100])[1];
      const qty = Math.max(1, div(units * share, 100));
      const inv = state.inventories[h.owner].resources;
      inv[res.id] += qty;
      const out = [qty + ' ' + res.name.toLowerCase()];
      if (share < 100) { const extra = div(units, 2); if (extra > 0) { inv[biome.primary] += extra; out.push(extra + ' ' + D.resources[biome.primary].name.toLowerCase()); } }
      say(ctx, 'recolte', tpl(ctx, 'gather', h.id, { a: heroName(h), n: qty, r: res.name.toLowerCase() + (out.length > 1 ? ' (+' + out[1] + ')' : ''), place: biome.name }));
      rollAccident(ctx, h, 'gather', biome.name);
    }
  }
  function rollAccident(ctx, h, activity, place) {
    const D = ctx.D;
    let p = D.C.accident_permille[activity];
    if (h.fatigue >= 80) p *= 2;
    if (attrEff(D, h, 'luck') >= 30) p -= 5;
    if (!ctx.rng.chance(p)) return;
    const days = injure(ctx, h, 1);
    say(ctx, activity === 'gather' ? 'recolte' : activity === 'train' ? 'entrainement' : 'forge', tpl(ctx, 'gather_accident', h.id, gv(h, { a: heroName(h), place: place })));
    moment(ctx, 40, heroName(h) + ' se blesse bêtement (' + days + ' j) — ' + place + '.');
  }
  // Nouvelle blessure : jours tirés (TIRAGE), vigueur et traits. Renvoie les jours.
  function injure(ctx, h, severity) {
    const D = ctx.D;
    const spec = D.C.injury_days[String(severity)];
    let days = spec[0] + ctx.rng.roll(spec[1]);
    days -= div(attrEff(D, h, 'vigor'), 20);
    if (hasTrait(h, 'lucky')) days -= 1;
    if (hasTrait(h, 'fragile')) days += 2;
    days = Math.max(1, days);
    if (severity > h.injury.severity) h.injury = { severity: severity, days_left: days };
    else h.injury.days_left += div(days, 2);
    if (severity === 3) h.scars += 1;
    h.history.injuries += 1;
    ctx.state.stats.injuries += 1;
    ctx.summary.injuries.push(heroName(h) + ' (' + h.injury.days_left + ' j)');
    return days;
  }

  // ---- Phase 4 : entraînement ----
  function phaseTrain(ctx) {
    const state = ctx.state, D = ctx.D;
    for (const h of allHeroes(state)) {
      const e = ctx.effective[h.id];
      if (e.activity !== 'train') continue;
      const attr = D.attrs.indexOf(e.target) >= 0 ? e.target : D.classes[h.class_id].primary;
      const cls = D.classes[h.class_id];
      let tp = D.C.tp_base[bLevel(D, state, 'training_ground')];
      if (attr === cls.primary) tp = pct(tp, 120);
      if (attr === cls.dump) tp = pct(tp, 80);
      if (hasTrait(h, 'diligent')) tp = pct(tp, 125);
      if (hasTrait(h, 'lazy')) tp = pct(tp, 70);
      if (h.age_seasons < 6) tp = pct(tp, 120);
      if (h.age_seasons >= 12) tp = pct(tp, 50);
      if (h.injury.severity === 1) tp = pct(tp, 50);
      if (hasTrait(h, 'hothead')) tp += 2;
      h.train_points[attr] = (h.train_points[attr] || 0) + tp;
      say(ctx, 'entrainement', tpl(ctx, 'train', h.id, { a: heroName(h), prog: deWord(D.attr_names[attr].name.toLowerCase()), tp: tp }));
      while (h.trained[attr] < D.C.trained_max && h.train_points[attr] >= D.C.tp_threshold_base + D.C.tp_threshold_step * h.trained[attr]) {
        h.train_points[attr] -= D.C.tp_threshold_base + D.C.tp_threshold_step * h.trained[attr];
        h.trained[attr] += 1;
        say(ctx, 'entrainement', tpl(ctx, 'train_gain', h.id + attr, { a: heroName(h), attr: D.attr_names[attr].name, n: attrEff(D, h, attr) }));
        moment(ctx, 30, heroName(h) + ' gagne un point de ' + D.attr_names[attr].name.toLowerCase() + ' à l\'entraînement.');
      }
      addXp(ctx, h, 10 + 5 * bLevel(D, state, 'training_ground'));
      rollAccident(ctx, h, 'train', 'au terrain d\'entraînement');
    }
  }
  function addXp(ctx, h, amount) { ctx.xp[h.id] = (ctx.xp[h.id] || 0) + Math.max(0, amount); }

  // ---- Phase 5 : forge (commandes, avancement, livraison) ----
  function phaseForge(ctx) {
    const state = ctx.state, D = ctx.D;
    for (const a of ctx.queued.craft) {
      const r = D.recipes[a.payload.recipe_id];
      const why = canAffordRecipe(D, state, a.manager_id, r);
      if (why) { const t = tpl(ctx, 'rejected', 'craft' + a.manager_id, { m: managerName(state, a.manager_id), reason: why }); ctx.notices.push(t); say(ctx, 'forge', t); continue; }
      for (const res of sortedKeys(r.cost)) state.inventories[a.manager_id].resources[res] -= r.cost[res];
      state.purses[a.manager_id] -= r.gold;
      state.forge_queue.push({ uid: 'f' + pad3(state.next_uid), recipe_id: r.id, owner: a.manager_id, work_left: r.work });
      state.next_uid += 1;
      say(ctx, 'forge', managerName(state, a.manager_id) + ' commande : ' + r.name.toLowerCase() + '.');
    }
    const work = {};
    for (const h of allHeroes(state)) {
      if (ctx.effective[h.id].activity !== 'craft') continue;
      const job = state.forge_queue.filter(q => q.owner === h.owner)[0];
      if (!job) { say(ctx, 'forge', tpl(ctx, 'craft_idle', h.id, { a: heroName(h) })); continue; }
      let p = craftPower(D, state, h);
      if (D.classes[h.class_id].craft_specialty === D.recipes[job.recipe_id].category) p = pct(p, 120);
      work[job.uid] = (work[job.uid] || 0) + p;
      say(ctx, 'forge', tpl(ctx, 'craft', h.id, { a: heroName(h), work: p, recipe: D.recipes[job.recipe_id].name.toLowerCase() }));
      addXp(ctx, h, 5);
      rollAccident(ctx, h, 'craft', 'à la forge');
    }
    const base = D.C.forge_work_per_day[bLevel(D, state, 'forge')];
    if (state.forge_queue.length) work[state.forge_queue[0].uid] = (work[state.forge_queue[0].uid] || 0) + base;
    const remaining = [];
    for (const job of state.forge_queue) {
      job.work_left -= (work[job.uid] || 0);
      if (job.work_left > 0) { remaining.push(job); continue; }
      const itemId = D.recipes[job.recipe_id].result;
      giveItem(D, state, job.owner, itemId);
      say(ctx, 'forge', tpl(ctx, 'craft_done', job.uid, { item: D.items[itemId].name, owner: managerName(state, job.owner) }));
      moment(ctx, 25, 'La forge livre ' + D.items[itemId].name.toLowerCase() + ' à ' + managerName(state, job.owner) + '.');
    }
    state.forge_queue = remaining;
  }

  // ---- Phase 6 : soins et repos (infirmerie) ----
  function phaseInfirmary(ctx) {
    const state = ctx.state, D = ctx.D;
    const lv = bLevel(D, state, 'infirmary');
    let beds = D.C.infirmary_cap[lv];
    const injured = allHeroes(state).filter(h => h.injury.severity > 0);
    injured.sort((a, b) => b.injury.severity - a.injury.severity || (a.id < b.id ? -1 : 1));
    for (const h of injured) {
      h.injury.days_left -= 1;
      if (ctx.effective[h.id].activity === 'rest' && beds > 0 && lv > 0) {
        beds -= 1;
        h.injury.days_left -= D.C.infirmary_heal[lv];
        if (h.injury.days_left > 0) say(ctx, 'infirmerie', tpl(ctx, 'infirmary', h.id, { a: heroName(h), n: h.injury.days_left }));
      }
      if (h.injury.days_left <= 0) {
        h.injury = { severity: 0, days_left: 0 };
        say(ctx, 'infirmerie', tpl(ctx, 'recovered', h.id, gv(h, { a: heroName(h) })));
        moment(ctx, 20, heroName(h) + ' est de nouveau sur pied.');
      }
    }
    for (const h of allHeroes(state)) if (ctx.effective[h.id].activity === 'rest' && h.injury.severity === 0) say(ctx, 'infirmerie', tpl(ctx, 'rest', h.id, { a: heroName(h), fatigue: h.fatigue }));
  }

  // ===================================================================================
  // 8. EXPÉDITION — phase 7 : groupe, étages, salles, événements
  // ===================================================================================
  function makeFighter(D, profile, slot) {
    const f = clone(profile);
    f.hp = f.hp_max; f.slot = slot; f.ko = false; f.was_ko = false; f.deserted = false;
    f.atk_pct_mod = 100; f.def_pct_mod = 100; f.feat_crit = 0; f.xp_bonus_permille = 0; f.injury_bonus_days = 0;
    f.poison_immune = 0; f.damage = 0; f.healing = 0; f.kills = 0; f.consumed = [];
    f.status = { poison: 0, poison_l: 0, entangled: 0 }; f.cooldowns = {}; f.used_once = {};
    return f;
  }
  function roomLog(exp, text) { if (exp.room && exp.room.lines.length < 14 && text) exp.room.lines.push(text); }
  function conscious(exp) { return exp.party.filter(f => !f.ko && !f.deserted); }
  function managersIn(exp) { const m = {}; for (const f of exp.party) if (!f.deserted) m[f.owner] = 1; return sortedKeys(m); }

  // Composition du groupe : refus de moral (TIRAGE), tour de table par manager, bornes du type de quête.
  function buildParty(ctx) {
    const state = ctx.state, D = ctx.D;
    const cands = allHeroes(state).filter(h => ctx.effective[h.id].activity === 'expedition');
    const quest = ctx.quest;
    const demote = (h, why) => { ctx.effective[h.id] = { activity: 'rest', target: null }; ctx.forced[h.id] = why; };
    if (!quest) { for (const h of cands) demote(h, 'aucune quête'); return []; }
    const kept = [];
    for (const h of cands) {
      if (h.morale < 20 && ctx.rng.chance(hasTrait(h, 'coward') ? 500 : 300)) {
        demote(h, 'refuse de partir'); say(ctx, 'expedition', heroName(h) + ' refuse de partir : le moral n\'y est pas.');
        moment(ctx, 30, heroName(h) + ' refuse l\'expédition, le moral au plus bas.');
      } else kept.push(h);
    }
    const type = D.quest_types[quest.type];
    const byM = {};
    for (const h of kept) (byM[h.owner] = byM[h.owner] || []).push(h);
    const ms = sortedKeys(byM), slots = [];
    for (let k = 0; slots.length < type.party_max; k++) {
      let any = false;
      for (const m of ms) if (byM[m][k]) { any = true; if (slots.length < type.party_max) slots.push(byM[m][k]); }
      if (!any) break;
    }
    for (const h of kept) if (slots.indexOf(h) < 0) demote(h, 'groupe complet');
    if (slots.length < type.party_min) { for (const h of slots) demote(h, 'groupe trop petit'); say(ctx, 'expedition', 'Groupe trop petit pour « ' + quest.name + ' » (' + slots.length + '/' + type.party_min + ') : personne ne part.'); return []; }
    return slots;
  }
  function newExpedition(D, quest, fighters, dayNum) {
    const type = D.quest_types[quest.type], d = D.difficulty[quest.difficulty];
    const floors = quest.type === 'purge' ? 2 + div(quest.difficulty, 4) : type.floors;
    return { quest: quest, type: type, biome: D.biomes[quest.biome], d: d, L: d.monster_level, floors: floors, day: dayNum,
      party: fighters, bag: { gold: 0, resources: {}, items: [], item_rolls_bonus: 0, rarity_bonus: 0 }, xp_pool: 0,
      counters: { rooms_total: floors * type.rooms_per_floor, rooms_visited: 0, rooms_cleared: 0, floors_cleared: 0, kills: 0, kills_target: 0, harvest_done: 0, harvest_total: 0, ko_count: 0, rounds_total: 0, deserters: 0, boss_killed: false, caravan_hp: quest.type === 'escort' ? 60 + 12 * d.monster_level : 0 },
      flags: { cursed: false, nest: false, storm: false, skip_next: false, feat: null }, rooms: [], room: null, outcome: null, events_floor: 0, lines: [], last_combat: null };
  }
  function genFloor(exp, f, rng) {
    const R = exp.type.rooms_per_floor, last = f === exp.floors - 1, rooms = [];
    for (let r = 0; r < R; r++) {
      let kind;
      if (r === 0 && f === 0) kind = exp.quest.type === 'perilous_harvest' ? 'harvest' : 'combat';
      else if (r === R - 1 && last) kind = exp.type.boss !== 'none' ? 'boss' : 'combat';
      else if (r === R - 1) kind = 'rest';
      else kind = rng.pickWeighted(exp.quest.type in exp.D_room_weights ? exp.D_room_weights[exp.quest.type] : []);
      rooms.push({ index: r, kind: kind, cleared: false });
    }
    if (exp.quest.type === 'hunt' && rooms.filter(x => x.kind === 'combat').length < 2) { const c = rooms.filter(x => x.kind !== 'combat' && x.kind !== 'boss')[0]; if (c) c.kind = 'combat'; }
    if (exp.quest.type === 'perilous_harvest') { let n = 0; for (const x of rooms) { if (x.kind === 'harvest') { n++; if (n > 2) x.kind = 'trap'; } } if (n < 2) { const c = rooms.filter(x => x.kind !== 'harvest' && x.index > 0)[0]; if (c) c.kind = 'harvest'; } }
    exp.counters.harvest_total += rooms.filter(x => x.kind === 'harvest').length;
    return rooms;
  }
  function abandonCheck(exp) {
    const c = conscious(exp);
    if (!c.length) return true;
    const hp = sum(c.map(f => f.hp)), max = sum(exp.party.filter(f => !f.deserted).map(f => f.hp_max));
    if (div(hp * 1000, Math.max(1, max)) < 300) return true;
    return div(sum(c.map(f => f.fatigue)), c.length) >= 90;
  }
  function roomName(D, exp, room, f) {
    const decor = exp.biome.decors[(f * 7 + room.index * 3 + fnvStr(exp.quest.id) % 4) % exp.biome.decors.length];
    const label = { combat: 'Combat', trap: 'Piège', treasure: 'Trésor', altar: 'Autel', rest: 'Campement', harvest: 'Filon', boss: 'Antre' }[room.kind];
    return 'Étage ' + (f + 1) + ' · salle ' + (room.index + 1) + ' — ' + label + ' (' + decor + ')';
  }

  // Déroulé complet de l'expédition (tous les étages le même jour dans le prototype).
  function runExpedition(ctx, quest, fighters, rng) {
    const D = ctx.D;
    const exp = newExpedition(D, quest, fighters, ctx.state.day);
    exp.D_room_weights = D.raw.room_weights;
    applyStartConsumables(D, exp);
    for (let f = 0; f < exp.floors && !exp.outcome; f++) {
      const rooms = genFloor(exp, f, rng);
      exp.events_floor = 0;
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        exp.room = { name: roomName(D, exp, room, f), lines: [] };
        exp.rooms.push(exp.room);
        if (exp.flags.skip_next) { exp.flags.skip_next = false; room.cleared = true; exp.counters.rooms_visited++; exp.counters.rooms_cleared++; roomLog(exp, 'Salle contournée par le passage secret.'); continue; }
        if (abandonCheck(exp)) { exp.outcome = 'retreat'; roomLog(exp, 'Épuisés, ils rebroussent chemin.'); break; }
        resolveRoom(ctx, exp, room, rooms[i + 1] || null, f, rng);
        if (exp.outcome) break;
        for (const c of conscious(exp)) c.fatigue = clamp(c.fatigue + 1, 0, 100);
        exp.counters.rooms_visited++;
        if (room.cleared) exp.counters.rooms_cleared++;
        maybeEvent(ctx, exp, room, rooms[i + 1] || null, rng);
        if (exp.outcome) break;
        if (room.kind === 'boss' && exp.counters.boss_killed) break;
      }
      if (!exp.outcome) exp.counters.floors_cleared++;
    }
    if (!exp.outcome) exp.outcome = evaluateObjective(exp);
    exp.room = null;
    return exp;
  }
  function applyStartConsumables(D, exp) {
    for (const f of exp.party) {
      if (!f.potion) continue;
      const it = D.items[f.potion.item_id];
      if (it.use !== 'expedition') continue;
      if (it.stats.atk_pct) f.atk_pct_mod += it.stats.atk_pct;
      if (it.stats.def_pct) f.def_pct_mod += it.stats.def_pct;
      if (it.stats.poison_immune) f.poison_immune = 1;
      f.consumed.push(f.potion.uid); f.potion = null;
    }
  }
  function evaluateObjective(exp) {
    const c = exp.counters, q = exp.quest;
    switch (exp.type.objective) {
      case 'kill_target': return c.kills_target >= q.target_count ? 'success' : c.kills_target * 2 >= q.target_count ? 'partial' : 'failed';
      case 'caravan_alive': return c.caravan_hp > 0 && c.floors_cleared >= exp.floors ? 'success' : c.caravan_hp > 0 && c.floors_cleared >= 1 ? 'partial' : 'failed';
      case 'rooms_visited': return c.rooms_visited >= c.rooms_total ? 'success' : div(c.rooms_visited * 1000, Math.max(1, c.rooms_total)) >= 600 ? 'partial' : 'failed';
      case 'boss_killed': return c.boss_killed ? 'success' : c.floors_cleared >= exp.floors - 1 ? 'partial' : 'failed';
      case 'harvest_nodes': return c.harvest_done >= c.harvest_total && c.harvest_total > 0 ? 'success' : c.harvest_done >= 1 ? 'partial' : 'failed';
    }
    return 'failed';
  }

  // ---- Salles ----
  function resolveRoom(ctx, exp, room, next, f, rng) {
    const D = ctx.D;
    switch (room.kind) {
      case 'combat': {
        const monsters = genEncounter(D, exp, room, rng);
        const r = runCombat(ctx, exp, monsters, { first: false }, rng);
        afterCombat(exp, room, r);
        break;
      }
      case 'boss': {
        const boss = instantiateBoss(D, exp, rng);
        roomLog(exp, 'L\'antre s\'ouvre : ' + boss.name + ' se dresse. ' + D.bosses[boss.id].hint);
        const r = runCombat(ctx, exp, [boss], { first: false }, rng);
        afterCombat(exp, room, r);
        if (r === 'victory') { exp.counters.boss_killed = true; for (const c of conscious(exp)) c.morale = clamp(c.morale + 10, 0, 100); roomLog(exp, boss.name + ' est vaincu ! Le groupe rugit.'); }
        break;
      }
      case 'trap': resolveTrap(ctx, exp, room, rng); break;
      case 'treasure': resolveTreasure(ctx, exp, room, rng); break;
      case 'altar': resolveAltar(exp, room, rng); break;
      case 'rest': case 'harvest': resolveCampOrHarvest(ctx, exp, room, rng); break;
    }
  }
  function afterCombat(exp, room, r) {
    exp.last_combat = r;
    if (r === 'victory') { room.cleared = true; for (const c of conscious(exp)) c.morale = clamp(c.morale + 5, 0, 100); exp.flags.nest = false; }
    else if (r === 'wiped') { exp.outcome = 'wiped'; roomLog(exp, 'Personne ne reste debout. Le butin est perdu.'); }
    else if (r === 'retreated') { exp.outcome = 'retreat'; }
    else if (r === 'caravan_lost') { exp.outcome = 'failed'; roomLog(exp, 'La caravane est perdue.'); }
  }
  function bestTrapScore(exp) {
    let best = 0;
    for (const c of conscious(exp)) best = Math.max(best, c.spd + (c.class_id === 'rogue' ? 6 : 0) + (c.class_id === 'ranger' ? 3 : 0));
    return best;
  }
  function resolveTrap(ctx, exp, room, rng) {
    const ok = bestTrapScore(exp) + rng.roll(12) >= exp.d.trap_dc;
    const rogue = exp.party.some(f => f.class_id === 'rogue' && !f.ko && !f.deserted);
    if (ok) { exp.bag.gold += div(exp.d.gold_base, 10); roomLog(exp, conscious(exp)[0].name + ' repère ' + exp.biome.trap + ' à temps : ' + div(exp.d.gold_base, 10) + ' pièces dans un recoin.'); }
    else {
      const dmg = rogue ? div(3 + 3 * exp.quest.difficulty, 2) : 3 + 3 * exp.quest.difficulty;
      roomLog(exp, exp.biome.trap + ' se referme : ' + dmg + ' dégâts à chacun.');
      for (const c of conscious(exp)) { c.hp -= dmg; c.fatigue = clamp(c.fatigue + 5, 0, 100); if (c.hp <= 0) knockOut(ctx, exp, c); }
      if (!conscious(exp).length) exp.outcome = 'wiped';
    }
    room.cleared = true;
  }
  function resolveTreasure(ctx, exp, room, rng) {
    if (rng.chance(150)) {
      const L = exp.L, mim = instantiateMonster(ctx.D, 'mimic', L, 0);
      roomLog(exp, 'Le coffre a des dents : une mimique !');
      const r = runCombat(ctx, exp, [mim], { first: true }, rng);
      afterCombat(exp, room, r);
      if (r !== 'victory') return;
    }
    let gold = rng.between(pct(exp.d.gold_base, 20), pct(exp.d.gold_base, 40));
    if (exp.party.some(f => f.class_id === 'rogue' && !f.deserted)) gold = pct(gold, 130);
    exp.bag.gold += gold;
    const shiny = rng.chance(exp.d.item_permille);
    if (shiny) exp.bag.item_rolls_bonus += 1;
    for (const c of conscious(exp)) c.morale = clamp(c.morale + 3, 0, 100);
    roomLog(exp, 'Un coffre : ' + gold + ' pièces d\'or' + (shiny ? ', et quelque chose de brillant.' : '.'));
    room.cleared = true;
  }
  function resolveAltar(exp, room, rng) {
    const r = rng.roll(1000);
    if (r < 500) { for (const c of conscious(exp)) { c.morale = clamp(c.morale + 10, 0, 100); c.feat_crit += 100; } roomLog(exp, 'Devant ' + exp.biome.altar + ', une chaleur douce : bénédiction.'); }
    else if (r < 800) roomLog(exp, exp.biome.altar + ' reste silencieux.');
    else { for (const c of conscious(exp)) c.fatigue = clamp(c.fatigue + 10, 0, 100); exp.flags.cursed = true; roomLog(exp, exp.biome.altar + ' murmure une malédiction ; les jambes se font lourdes.'); }
    room.cleared = true;
  }
  function resolveCampOrHarvest(ctx, exp, room, rng) {
    let p = room.kind === 'rest' ? 150 : 300;
    if (exp.party.some(f => f.class_id === 'ranger' && f.level >= 5 && !f.deserted)) p = Math.max(0, p - 200);
    let half = false;
    if (rng.chance(p)) {
      roomLog(exp, 'Embuscade pendant la halte !');
      const monsters = genEncounter(ctx.D, exp, room, rng);
      const r = runCombat(ctx, exp, monsters, { first: true }, rng);
      afterCombat(exp, room, r);
      if (r !== 'victory') return;
      half = true;
    }
    if (room.kind === 'rest') {
      const healPct = exp.flags.storm ? 10 : 20;
      for (const f of exp.party) {
        if (f.deserted) continue;
        if (f.ko) { f.ko = false; f.hp = div(f.hp_max, 5); f.was_ko = true; }
        else f.hp = Math.min(f.hp_max, f.hp + pct(f.hp_max, half ? div(healPct, 2) : healPct));
        f.fatigue = clamp(f.fatigue - 12, 0, 100); f.morale = clamp(f.morale + 3, 0, 100);
      }
      exp.flags.storm = false;
      roomLog(exp, 'Le groupe monte le camp. Soins, ragoût, silence.');
    } else {
      const res = exp.biome.primary;
      let qty = div(exp.d.resource_units, Math.max(1, exp.counters.harvest_total));
      if (half) qty = div(qty, 2);
      qty = Math.max(1, qty);
      exp.bag.resources[res] = (exp.bag.resources[res] || 0) + qty;
      exp.counters.harvest_done++;
      roomLog(exp, qty + ' ' + ctx.D.resources[res].name.toLowerCase() + ' récoltés sur place.');
    }
    room.cleared = true;
  }

  // ---- Événements d'expédition (0 à 2 tirages + effets) ----
  function eventEligible(ctx, exp, e, room, next) {
    const c = conscious(exp), won = exp.last_combat === 'victory' && (room.kind === 'combat' || room.kind === 'boss');
    if (e.phase === 'after_combat_won' && !won) return false;
    if (e.phase === 'treasure_room' && room.kind !== 'treasure') return false;
    if (e.phase === 'trap_room' && room.kind !== 'trap') return false;
    switch (e.id) {
      case 'ambush': return room.kind !== 'combat' && room.kind !== 'boss' && !(next && next.kind === 'boss');
      case 'quarrel': case 'loot_dispute': return managersIn(exp).length >= 2 && (e.id !== 'loot_dispute' || exp.bag.gold > 50);
      case 'heroic_feat': return exp.last_ko === 0;
      case 'festering_wound': return c.some(f => f.hp > 0 && f.hp * 10 < f.hp_max * 3);
      case 'kind_hermit': return !exp.flags.cursed;
      case 'monster_nest': return !!next && next.kind === 'combat';
      case 'secret_passage': return !!next && next.kind !== 'boss' && next.index !== exp.type.rooms_per_floor - 1;
      case 'rival_party': return exp.day % 7 >= 4;
      case 'mentor_moment': return Math.max.apply(null, c.map(f => f.level)) - Math.min.apply(null, c.map(f => f.level)) >= 5;
      case 'sudden_storm': return !!exp.biome.outdoor;
      case 'second_wind': return exp.last_ko > 0;
      case 'desertion': return c.some(f => f.morale < 20) && c.length >= 2;
      case 'legend_sighting': return exp.type.boss === 'none';
      default: return true;
    }
  }
  function maybeEvent(ctx, exp, room, next, rng) {
    const D = ctx.D;
    if (exp.events_floor >= 3 || !rng.chance(exp.type.event_permille)) return;
    const eligible = D.raw.events.filter(e => eventEligible(ctx, exp, e, room, next));
    if (!eligible.length) return;
    const hasScout = exp.party.some(f => (f.class_id === 'rogue' || f.class_id === 'ranger') && !f.deserted);
    const id = rng.pickWeighted(eligible.map(e => [e.id, e.id === 'secret_passage' && !hasScout ? 20 : e.weight]));
    exp.events_floor++;
    applyEvent(ctx, exp, D.events[id], room, next, rng);
  }
  function applyEvent(ctx, exp, e, room, next, rng) {
    const c = conscious(exp), D = ctx.D;
    const lowest = c.slice().sort((a, b) => a.morale - b.morale || a.slot - b.slot)[0];
    const vars = { a: c[0] ? c[0].name : '', b: c[1] ? c[1].name : '', gold: pct(exp.d.gold_base, 30), boss: D.bosses[exp.biome.boss].name };
    switch (e.id) {
      case 'ambush': { roomLog(exp, e.text); const ms = genEncounter(D, exp, room, rng, 2 + rng.roll(2)); const r = runCombat(ctx, exp, ms, { first: true }, rng); afterCombat(exp, room, r); return; }
      case 'discovery': exp.bag.gold += vars.gold; exp.bag.item_rolls_bonus++; break;
      case 'quarrel': { const ms = managersIn(exp); const pair = [c.filter(f => f.owner === ms[0]).sort((x, y) => x.morale - y.morale)[0], c.filter(f => f.owner === ms[1]).sort((x, y) => x.morale - y.morale)[0]]; for (const f of pair) if (f) f.morale = clamp(f.morale - (c.some(x => x.class_id === 'cleric') ? 3 : 8), 0, 100); vars.a = pair[0] ? pair[0].name : vars.a; vars.b = pair[1] ? pair[1].name : vars.b; break; }
      case 'heroic_feat': { const best = c.slice().sort((x, y) => y.damage - x.damage || x.slot - y.slot)[0]; best.feat_crit = 300; exp.flags.feat = best.id; for (const f of c) f.morale = clamp(f.morale + 10, 0, 100); vars.a = best.name; moment(ctx, 65, best.name + ' accomplit un exploit dans ' + exp.biome.name + ' : le groupe le porte en triomphe.'); break; }
      case 'festering_wound': { const w = c.filter(f => f.hp * 10 < f.hp_max * 3)[0]; w.fatigue = clamp(w.fatigue + 15, 0, 100); w.injury_bonus_days += 1; vars.a = w.name; break; }
      case 'lost_path': for (const f of c) f.fatigue = clamp(f.fatigue + 8, 0, 100); break;
      case 'kind_hermit': for (const f of c) { f.hp = Math.min(f.hp_max, f.hp + pct(f.hp_max, 25)); f.morale = clamp(f.morale + 3, 0, 100); } break;
      case 'monster_nest': exp.flags.nest = true; break;
      case 'secret_passage': exp.flags.skip_next = true; vars.a = (c.filter(f => f.class_id === 'rogue' || f.class_id === 'ranger')[0] || c[0]).name; break;
      case 'bad_omen': for (const f of c) f.morale = clamp(f.morale - 5, 0, 100); break;
      case 'rival_party': for (const f of c) f.morale = clamp(f.morale + 5, 0, 100); if (D.C.derby_days.indexOf(exp.day) >= 0) exp.bag.gold -= div(exp.bag.gold, 10); break;
      case 'loot_dispute': { exp.bag.gold -= div(exp.bag.gold, 20); const ms = managersIn(exp); const counts = ms.map(m => [m, c.filter(f => f.owner === m).length]).sort((x, y) => x[1] - y[1] || (x[0] > y[0] ? -1 : 1)); for (const f of c) if (f.owner === counts[0][0]) f.morale = clamp(f.morale - 5, 0, 100); break; }
      case 'mentor_moment': { const sorted = c.slice().sort((x, y) => x.level - y.level || x.slot - y.slot); sorted[0].xp_bonus_permille += 200; sorted[0].morale = clamp(sorted[0].morale + 5, 0, 100); const vet = sorted[sorted.length - 1]; vet.morale = clamp(vet.morale + 5, 0, 100); vars.a = vet.name; vars.b = sorted[0].name; break; }
      case 'broken_weapon': { const f = c[rng.roll(c.length)]; f.atk_pct_mod -= 20; vars.a = f.name; break; }
      case 'sudden_storm': for (const f of c) f.fatigue = clamp(f.fatigue + 5, 0, 100); exp.flags.storm = true; break;
      case 'cursed_relic': exp.bag.item_rolls_bonus++; exp.bag.rarity_bonus += 40; for (const f of c) f.morale = clamp(f.morale - 10, 0, 100); exp.flags.cursed = true; vars.a = lowest.name; break;
      case 'second_wind': lowest.morale = clamp(lowest.morale + 15, 0, 100); lowest.fatigue = clamp(lowest.fatigue - 10, 0, 100); vars.a = lowest.name; break;
      case 'ancient_trap': { if (bestTrapScore(exp) + rng.roll(12) >= exp.d.trap_dc) exp.bag.gold += div(exp.d.gold_base, 4); else for (const f of c) { f.hp -= pct(f.hp_max, 15); if (f.hp <= 0) knockOut(ctx, exp, f); } if (!conscious(exp).length) exp.outcome = 'wiped'; break; }
      case 'desertion': { const t = c.filter(f => f.morale < 20).sort((x, y) => x.morale - y.morale || x.slot - y.slot)[0]; t.deserted = true; t.fatigue = clamp(t.fatigue + 10, 0, 100); exp.counters.deserters++; for (const f of conscious(exp)) f.morale = clamp(f.morale - 5, 0, 100); vars.a = t.name; moment(ctx, 80, 'Trahison : ' + t.name + ' abandonne le groupe en plein donjon.'); if (!conscious(exp).length) exp.outcome = 'retreat'; break; }
      case 'legend_sighting': for (const f of c) f.morale = clamp(f.morale + 3, 0, 100); break;
    }
    exp.bag.gold = Math.max(0, exp.bag.gold);
    roomLog(exp, fill(e.text, vars));
    exp.lines.push(e.name + ' : ' + fill(e.text, vars));
  }

  // ===================================================================================
  // 9. COMBAT — tour par tour, entiers, ciblage déterministe
  // ===================================================================================
  // Bases recalibrées sur les profils du doc Aventuriers (héros ~3x plus forts que l'hypothèse du doc Quêtes).
  function monsterBase(L) { return { hp: 55 + 10 * L, atk: 13 + 2 * L, def: 8 + L, spd: 6 + div(L, 2), xp: 5 + 3 * L }; }
  function instantiateMonster(D, id, L, slot, elite) {
    const m = D.monsters[id], b = monsterBase(L);
    const mon = { id: id, name: m.name + (elite ? ' alpha' : ''), verb: m.verb, level: L, slot: slot, boss: false, elite: !!elite,
      hp_max: pct(b.hp, m.hp_pct), atk: pct(b.atk, m.atk_pct), def: pct(b.def, m.def_pct), spd: pct(b.spd, m.spd_pct),
      crit: m.crit_permille, evasion: m.evasion_permille, target_rule: m.target_rule, special: m.special, xp: b.xp * (elite ? 2 : 1),
      alive: true, fled: false, status: { poison: 0, poison_l: 0, burned: 0, entangled: 0 }, used: false, stolen: 0, loot: m.loot };
    if (elite) { mon.hp_max = pct(mon.hp_max, 180); mon.atk = pct(mon.atk, 120); }
    mon.hp = mon.hp_max;
    return mon;
  }
  function instantiateBoss(D, exp, rng) {
    const b = D.bosses[exp.biome.boss], base = monsterBase(exp.L);
    const siege = exp.quest.type === 'siege';
    const hpPct = siege ? b.hp_pct_siege : exp.quest.difficulty < 7 ? 300 : b.hp_pct;
    const mon = { id: b.id, name: b.name, verb: b.verb, level: exp.L, slot: 0, boss: true, elite: false, mechanic: b.mechanic, siege: siege,
      hp_max: pct(base.hp, hpPct), atk: pct(base.atk, b.atk_pct), def: pct(base.def, b.def_pct), spd: pct(base.spd, b.spd_pct),
      crit: b.crit_permille, evasion: b.evasion_permille, target_rule: b.target_rule, special: 'boss', xp: base.xp * 5,
      alive: true, fled: false, status: { poison: 0, poison_l: 0, burned: 0, entangled: 0 }, used: false, stolen: 0, loot: b.loot,
      heads: 3, head_dmg: 0, fire_round: -1, awakened: false };
    mon.hp = mon.hp_max;
    return mon;
  }
  function genEncounter(D, exp, room, rng, forcedK) {
    const L = exp.L;
    let k = forcedK !== undefined ? forcedK : clamp(2 + div(exp.counters.floors_cleared, 2) + rng.roll(2), 1, 5);
    if (forcedK === undefined && (room.kind === 'rest' || room.kind === 'harvest')) k = clamp(k - 1, 1, 5);
    if (exp.flags.nest) k = clamp(k + 2, 1, 5);
    let pool = bestiaryFor(D, exp.biome.id, L);
    if (!pool.length) pool = [D.monsters[D.raw.monster_fallback[exp.biome.id]]];
    const out = [];
    for (let i = 0; i < k; i++) {
      let id;
      if (exp.quest.type === 'hunt' && i < div(k + 1, 2) && exp.quest.target_monster_id) id = exp.quest.target_monster_id;
      else id = rng.pickWeighted(pool.map(m => [m.id, m.spawn_weight]));
      out.push(instantiateMonster(D, id, L, i, false));
    }
    return out;
  }
  function activeMonsters(cb) { return cb.monsters.filter(m => m.alive && !m.fled); }

  function runCombat(ctx, exp, monsters, opts, rng) {
    const cb = { exp: exp, monsters: monsters, round: 0, ko_this: 0, shield: 0, retreat_at: 2, first: !!opts.first };
    exp.last_ko = 0;
    roomLog(exp, 'Surgissent ' + joinFr(monsters.map(m => m.name.toLowerCase())) + ' !');
    for (const f of conscious(exp)) { f.init = f.spd * 100 + rng.roll(100); f.cooldowns = {}; f.status.entangled = 0; }
    for (const m of monsters) m.init = m.spd * 100 + rng.roll(100);
    const order = conscious(exp).map(f => ({ adv: f })).concat(monsters.map(m => ({ mon: m })));
    order.sort((a, b) => { const ia = a.adv ? a.adv.init : a.mon.init, ib = b.adv ? b.adv.init : b.mon.init; if (ib !== ia) return ib - ia; if (!!a.adv !== !!b.adv) return a.adv ? -1 : 1; return (a.adv || a.mon).slot - (b.adv || b.mon).slot; });
    let result = null;
    while (!result) {
      cb.round++;
      exp.counters.rounds_total++;
      if (cb.round > ctx.D.C.combat_round_cap) { result = 'stalemate'; break; }
      if (cb.round >= 2 && shouldRetreat(exp)) { result = attemptRetreat(ctx, cb, rng); if (result) break; }
      const seq = cb.first && cb.round === 1 ? order.filter(o => o.mon).concat(order.filter(o => o.adv)) : order;
      for (const o of seq) {
        if (o.adv && (o.adv.ko || o.adv.deserted)) continue;
        if (o.mon && (!o.mon.alive || o.mon.fled)) continue;
        if (tickStatus(ctx, cb, o.adv || o.mon, rng)) continue;
        if (o.adv) adventurerTurn(ctx, cb, o.adv, rng); else monsterTurn(ctx, cb, o.mon, rng);
        result = combatEnd(cb);
        if (result) break;
      }
      for (const f of conscious(exp)) { for (const k of sortedKeys(f.cooldowns)) if (f.cooldowns[k] > 0) f.cooldowns[k]--; f.fatigue = clamp(f.fatigue + 1, 0, 100); }
      cb.shield = 0;
    }
    if (result === 'victory') roomLog(exp, 'Victoire en ' + cb.round + ' tour(s).');
    exp.last_ko = cb.ko_this;
    return result;
  }
  function combatEnd(cb) {
    if (!activeMonsters(cb).length) return 'victory';
    if (!conscious(cb.exp).length) return 'wiped';
    if (cb.exp.quest.type === 'escort' && cb.exp.counters.caravan_hp <= 0) return 'caravan_lost';
    return null;
  }
  function shouldRetreat(exp) {
    const c = conscious(exp);
    const all = exp.party.filter(f => !f.deserted);
    const hpP = div(sum(c.map(f => f.hp)) * 1000, Math.max(1, sum(all.map(f => f.hp_max))));
    const thr = 300 + (div(sum(c.map(f => f.morale)), Math.max(1, c.length)) < 30 ? 100 : 0);
    return hpP < thr || (c.length === 1 && all.length >= 3);
  }
  function attemptRetreat(ctx, cb, rng) {
    if (cb.round < cb.retreat_at) return null;
    const c = conscious(cb.exp), ms = activeMonsters(cb);
    const p = clamp(500 + (div(sum(c.map(f => f.spd)), c.length) - div(sum(ms.map(m => m.spd)), Math.max(1, ms.length))) * 30, 200, 900);
    if (rng.chance(p)) { roomLog(cb.exp, 'Trop de sang perdu : le groupe bat en retraite' + (cb.exp.party.some(f => f.ko) ? ' en portant ' + joinFr(cb.exp.party.filter(f => f.ko).map(f => f.name)) : '') + '.'); return 'retreated'; }
    cb.retreat_at = cb.round + 2;
    roomLog(cb.exp, 'La fuite échoue, les monstres se ruent !');
    for (const m of ms) monsterTurn(ctx, cb, m, rng);
    return combatEnd(cb);
  }
  // Statuts en début de tour : poison, brûlure, entrave, régénération, fuite du gobelin. true = tour sauté.
  function tickStatus(ctx, cb, x, rng) {
    const exp = cb.exp;
    if (x.status.poison > 0) {
      x.status.poison--;
      const dmg = 2 + div(x.status.poison_l, 4);
      x.hp -= dmg;
      if (x.hp <= 0) { if (x.slot !== undefined && x.alive === undefined) knockOut(ctx, exp, x); else monsterDown(ctx, cb, x, null, rng); return true; }
    }
    if (x.alive !== undefined) {           // monstre
      if (x.status.burned > 0) x.status.burned--;
      else if (x.special === 'regen' || (x.boss && x.mechanic === 'roots')) x.hp = Math.min(x.hp_max, x.hp + pct(x.hp_max, x.boss ? 8 : 5));
      if (x.boss && x.mechanic === 'heads' && x.heads < 3 && x.fire_round !== cb.round - 1) { x.heads = Math.min(3, x.heads + 1); x.hp = Math.min(x.hp_max, x.hp + pct(x.hp_max, x.siege ? 15 : 10)); roomLog(exp, 'Une tête repousse…'); }
      if (x.special === 'coward' && x.hp * 4 < x.hp_max) { x.fled = true; roomLog(exp, x.name + ' détale en couinant.'); return true; }
      if (x.special === 'blast' && !x.used && x.hp * 2 < x.hp_max) {
        x.used = true;
        for (const f of conscious(exp)) { f.hp -= Math.max(1, pct(x.atk, 60)); if (f.hp <= 0) knockOut(ctx, exp, f); }
        roomLog(exp, x.name + ' fait sauter sa charge : tout le monde encaisse.');
        x.hp = 0; monsterDown(ctx, cb, x, null, rng);
        return true;
      }
    }
    if (x.status.entangled > 0) { x.status.entangled--; return true; }
    return false;
  }

  const SKILL_PRIORITY = ['last_breath', 'healing_prayer', 'bulwark', 'storm', 'volley', 'frost_hold', 'sunder_strike', 'shadow_strike', 'fire_bolt'];
  function lowestAlly(exp) { return conscious(exp).slice().sort((a, b) => div(a.hp * 1000, a.hp_max) - div(b.hp * 1000, b.hp_max) || a.slot - b.slot)[0]; }
  function enemyLowestHp(cb) { return activeMonsters(cb).slice().sort((a, b) => a.hp - b.hp || a.slot - b.slot)[0]; }
  function enemyHighestAtk(cb) { return activeMonsters(cb).slice().sort((a, b) => b.atk - a.atk || a.slot - b.slot)[0]; }
  function chooseSkill(cb, f) {
    if (f.fatigue >= 80) return null;
    const exp = cb.exp, ms = activeMonsters(cb);
    for (const id of SKILL_PRIORITY) {
      if (f.skills.indexOf(id) < 0 || (f.cooldowns[id] || 0) > 0 || f.used_once[id]) continue;
      switch (id) {
        case 'last_breath': if (exp.party.some(x => x.ko && !x.deserted)) return id; break;
        case 'healing_prayer': if (conscious(exp).some(x => x.hp * 2 < x.hp_max)) return id; break;
        case 'bulwark': if (conscious(exp).some(x => x.hp * 2 < x.hp_max) && ms.length >= 2) return id; break;
        case 'storm': case 'volley': if (ms.length >= (id === 'storm' ? 2 : 3)) return id; break;
        case 'frost_hold': if (ms.some(m => m.boss) || ms.length >= 2) return id; break;
        case 'shadow_strike': if (cb.round === 1) return id; break;
        case 'sunder_strike': case 'fire_bolt': return id;
      }
    }
    return null;
  }
  function adventurerTurn(ctx, cb, f, rng) {
    const D = ctx.D, exp = cb.exp;
    if (f.potion && D.items[f.potion.item_id].use === 'combat_heal' && f.hp * 10 < f.hp_max * 4) {
      const amt = pct(f.hp_max, D.items[f.potion.item_id].stats.heal_pct);
      f.hp = Math.min(f.hp_max, f.hp + amt); f.consumed.push(f.potion.uid); f.potion = null;
      roomLog(exp, f.name + ' vide sa potion de soin : +' + amt + ' PV.');
    }
    const skill = chooseSkill(cb, f);
    const sk = skill ? D.skills[skill] : null;
    if (skill === 'last_breath') { const t = exp.party.filter(x => x.ko && !x.deserted).sort((a, b) => a.slot - b.slot)[0]; t.ko = false; t.was_ko = true; t.hp = pct(t.hp_max, 30); f.used_once[skill] = 1; roomLog(exp, f.name + ' souffle la prière ultime : ' + t.name + ' se relève !'); return; }
    if (skill === 'healing_prayer') { const t = lowestAlly(exp); const amt = f.heal + 10; t.hp = Math.min(t.hp_max, t.hp + amt); f.healing += amt; f.cooldowns[skill] = sk.cooldown; roomLog(exp, f.name + ' soigne ' + t.name + ' de ' + amt + ' PV.'); return; }
    if (skill === 'bulwark') { cb.shield = 1; f.used_once[skill] = 1; roomLog(exp, f.name + ' dresse le rempart : les coups glissent.'); return; }
    if (skill === 'frost_hold') { const t = enemyHighestAtk(cb); f.cooldowns[skill] = sk.cooldown; if (!t.boss || rng.chance(500)) { t.status.entangled = 1; roomLog(exp, f.name + ' fige ' + t.name + ' dans le givre.'); } else roomLog(exp, t.name + ' secoue le givre de ' + f.name + '.'); return; }
    let targets, power = 100, tags = { magic: f.magic === 1, fire: f.fire === 1, ignore_half: false, stealth: false };
    if (skill === 'storm' || skill === 'volley') { targets = activeMonsters(cb); power = sk.value; }
    else if (skill === 'sunder_strike') { targets = [enemyHighestAtk(cb)]; power = 150; tags.ignore_half = true; }
    else if (skill === 'shadow_strike') { targets = [enemyLowestHp(cb)]; power = 200; tags.stealth = true; f.used_once[skill] = 1; }
    else if (skill === 'fire_bolt') { targets = [enemyLowestHp(cb)]; power = 130; tags.fire = true; tags.magic = true; }
    else targets = [f.class_id === 'warrior' ? enemyHighestAtk(cb) : enemyLowestHp(cb)];
    if (sk && sk.cooldown < 99) f.cooldowns[skill] = sk.cooldown;
    if (sk) roomLog(exp, f.name + ' lance « ' + sk.name + ' » !');
    for (const t of targets) if (t && t.alive && !t.fled) applyDamage(ctx, cb, f, t, power, tags, rng);
  }
  function monsterTarget(cb, m, rng) {
    const c = conscious(cb.exp);
    const taunt = c.filter(f => f.priority >= 100)[0];
    if (taunt) return taunt;
    const rule = m.boss && m.mechanic === 'heads' ? 'weakest' : m.target_rule;
    if (rule === 'random') return c[rng.roll(c.length)];
    const s = c.slice();
    if (rule === 'weakest') s.sort((a, b) => div(a.hp * 1000, a.hp_max) - div(b.hp * 1000, b.hp_max) || b.priority - a.priority || a.slot - b.slot);
    else if (rule === 'softest') s.sort((a, b) => a.def - b.def || b.priority - a.priority || a.slot - b.slot);
    else s.sort((a, b) => b.atk - a.atk || b.priority - a.priority || a.slot - b.slot);
    return s[0];
  }
  function monsterTurn(ctx, cb, m, rng) {
    const exp = cb.exp;
    if (!conscious(exp).length) return;
    if (m.boss) { if (bossTurn(ctx, cb, m, rng)) return; }
    if (m.special === 'crush' && cb.round % 2 === 1) { roomLog(exp, m.name + ' lève sa massue, lentement.'); return; }
    if (m.special === 'screech' && cb.round === 1) { for (const f of conscious(exp)) f.morale = clamp(f.morale - 8, 0, 100); roomLog(exp, m.name + ' pousse un cri qui glace le sang.'); return; }
    if (exp.quest.type === 'escort' && rng.chance(300)) { const dmg = Math.max(1, div(m.atk * m.atk, m.atk + 6 + exp.L)); exp.counters.caravan_hp -= dmg; roomLog(exp, m.name + ' s\'en prend à la caravane : ' + dmg + ' dégâts.'); return; }
    const times = m.boss && m.mechanic === 'heads' ? m.heads : 1;
    for (let i = 0; i < times; i++) {
      const t = monsterTarget(cb, m, rng);
      if (!t) return;
      applyDamage(ctx, cb, m, t, m.special === 'crush' ? 180 : 100, { magic: m.special === 'spectral', fire: false, ignore_half: false, stealth: false }, rng);
    }
  }
  // Mécanismes de boss (un par biome). true = le tour est consommé.
  function bossTurn(ctx, cb, m, rng) {
    const exp = cb.exp, c = conscious(exp);
    if (m.mechanic === 'roots') {
      if (!m.awakened && m.hp * 2 < m.hp_max) { m.awakened = true; const n = cb.monsters.length; for (let i = 0; i < 2 && cb.monsters.length < 5; i++) cb.monsters.push(instantiateMonster(ctx.D, 'corrupted_sylvan', Math.max(1, exp.L - 2), n + i, false)); roomLog(exp, 'Le Sylvain s\'éveille : deux sylvains corrompus sortent de l\'écorce.'); }
      if (cb.round % (m.siege ? 2 : 3) === 0) { const t = c.slice().sort((a, b) => b.atk - a.atk || a.slot - b.slot)[0]; t.status.entangled = 1; roomLog(exp, 'Les racines du Sylvain enserrent ' + t.name + '.'); return true; }
    } else if (m.mechanic === 'breath') {
      const cyc = m.siege ? 2 : 3, ph = cb.round % cyc;
      if (ph === 1) { roomLog(exp, 'Le Drake gonfle ses poumons…'); return true; }
      if (ph === (m.siege ? 0 : 2)) {
        roomLog(exp, 'Une nappe de cendres brûlantes !');
        for (const f of c) { const full = applyDamage(ctx, cb, m, f, 120, { magic: true, fire: false, ignore_half: false, stealth: false, breath: true }, rng); if (full === undefined) continue; }
        return true;
      }
    } else if (m.mechanic === 'heads' && cb.round % 4 === 0) {
      const ts = c.slice().sort((a, b) => div(a.hp * 1000, a.hp_max) - div(b.hp * 1000, b.hp_max) || a.slot - b.slot).slice(0, 2);
      for (const t of ts) if (!t.poison_immune) { t.status.poison = 3; t.status.poison_l = m.level; }
      roomLog(exp, 'La première tête crache son venin sur ' + joinFr(ts.map(t => t.name)) + '.');
      return true;
    }
    return false;
  }

  function moraleMod(f) { return f.morale < 30 ? 90 : f.morale < 70 ? 100 : 105; }
  function fatigueAtkMod(f) { return f.fatigue < 60 ? 100 : f.fatigue < 80 ? 90 : 75; }
  function fatigueDefMod(f) { return f.fatigue < 60 ? 100 : f.fatigue < 80 ? 95 : 85; }
  // Résolution d'un coup : tirages H (toucher), V (variance), K (critique). src/tgt = aventurier ou monstre.
  function applyDamage(ctx, cb, src, tgt, power, tags, rng) {
    const exp = cb.exp, srcAdv = src.alive === undefined, tgtAdv = tgt.alive === undefined;
    const evasion = tgtAdv ? tgt.dodge : tgt.evasion;
    const hit = clamp(850 + (src.spd - tgt.spd) * 15, 600, 950) - evasion;
    if (!tags.breath && !rng.chance(hit)) { roomLog(exp, src.name + ' rate ' + tgt.name + '.'); return; }
    const variance = 90 + rng.roll(21);
    let atk = src.atk;
    if (srcAdv) { atk = pct(atk, moraleMod(src)); atk = pct(atk, fatigueAtkMod(src)); atk = pct(atk, src.atk_pct_mod); }
    if (src.special === 'pack') atk = pct(atk, 100 + Math.min(30, 10 * (activeMonsters(cb).filter(m => m.id === 'wolf' && m !== src).length)));
    const raw = Math.max(1, pct(pct(atk, power), variance));
    let def = tgt.def;
    if (tgtAdv) { def = pct(def, fatigueDefMod(tgt)); def = pct(def, tgt.def_pct_mod); }
    if (tags.magic) def = div(def, 2);
    if (tags.ignore_half) def = div(def, 2);
    let dmg = div(raw * raw, raw + def);
    let critP = (srcAdv ? src.crit + src.feat_crit + (src.morale >= 70 ? 20 : 0) : src.crit) + (tags.stealth ? 400 : 0);
    if (src.special === 'spearfish' && tgt.hp * 2 < tgt.hp_max) critP = 250;
    if (tgt.special === 'stoneskin' || (tgt.boss && tgt.mechanic === 'breath' && tgt.hp * 2 > tgt.hp_max)) critP = 0;
    let crit = false;
    if (critP > 0 && rng.chance(critP)) { dmg = pct(dmg, 150); crit = true; }
    if (tgt.special === 'spectral' && !tags.magic) dmg = div(dmg, 2);
    if (tags.breath && (tgt.spd >= src.spd + 2 || cb.shield)) dmg = div(dmg, 2);
    if (tgtAdv && tgt.priority >= 100) dmg = pct(dmg, 90);
    if (tgtAdv && cb.shield) dmg = pct(dmg, 75);
    dmg = Math.max(1, dmg);
    tgt.hp -= dmg;
    if (srcAdv) src.damage += dmg;
    if (crit) roomLog(exp, 'Coup critique ! ' + src.name + ' déchire ' + tgt.name + ' : ' + dmg + ' dégâts.');
    else if (tgtAdv) roomLog(exp, src.name + ' ' + src.verb + ' ' + tgt.name + ' : ' + dmg + ' dégâts.');
    else if (tgt.boss || dmg * 3 >= tgt.hp_max) roomLog(exp, src.name + ' frappe ' + tgt.name + ' : ' + dmg + ' dégâts.');
    if (crit && tgt.boss) moment(ctx, 55, src.name + ' porte un coup critique à ' + tgt.name + ' (' + dmg + ' dégâts).');
    onHit(ctx, cb, src, tgt, dmg, tags);
    if (tgt.hp <= 0) { if (tgtAdv) knockOut(ctx, exp, tgt); else monsterDown(ctx, cb, tgt, src, rng); }
  }
  function onHit(ctx, cb, src, tgt, dmg, tags) {
    const exp = cb.exp;
    if (src.alive === undefined) {          // aventurier → monstre
      if (tags.fire) { tgt.status.burned = 1; tgt.fire_round = cb.round; }
      if (tgt.boss && tgt.mechanic === 'heads') { tgt.head_dmg += dmg; if (tgt.head_dmg * 4 >= tgt.hp_max && tgt.heads > 1) { tgt.heads--; tgt.head_dmg = 0; roomLog(exp, 'Une tête de l\'Hydre roule au sol !'); } }
      return;
    }
    if (src.special === 'venom' && !tgt.poison_immune) { tgt.status.poison = 3; tgt.status.poison_l = src.level; }
    if (src.special === 'drain') src.hp = Math.min(src.hp_max, src.hp + div(dmg, 2));
    if (src.special === 'pickpocket') { const s = div(exp.bag.gold, 20); exp.bag.gold -= s; src.stolen += s; }
  }
  function knockOut(ctx, exp, f) {
    if (f.ko) return;
    f.hp = 0; f.ko = true; f.was_ko = true; f.status = { poison: 0, poison_l: 0, entangled: 0 };
    f.fatigue = clamp(f.fatigue + 15, 0, 100);
    exp.counters.ko_count++;
    for (const c of conscious(exp)) c.morale = clamp(c.morale - 8, 0, 100);
    roomLog(exp, f.name + ' tombe, hors de combat !');
    moment(ctx, 60, f.name + ' est tombé au combat dans ' + exp.biome.name + '.');
  }
  function monsterDown(ctx, cb, m, killer, rng) {
    const exp = cb.exp;
    if (!m.alive) return;
    if (m.special === 'tenacious' && !m.used) { m.used = true; m.hp = 1; roomLog(exp, m.name + ' se relève, tenace.'); return; }
    m.alive = false; m.hp = 0;
    exp.counters.kills++;
    if (killer && killer.alive === undefined) killer.kills++;
    if (exp.quest.target_monster_id === m.id) exp.counters.kills_target++;
    exp.xp_pool += m.xp;
    exp.bag.gold += m.stolen; m.stolen = 0;
    roomLog(exp, m.name + ' s\'effondre.');
    if (m.boss) moment(ctx, 100, m.name + ' est vaincu par ' + joinFr(conscious(exp).map(f => f.name)) + ' !');
    const times = m.elite || exp.flags.nest ? 2 : 1;
    for (let t = 0; t < times; t++) for (const line of m.loot) rollLoot(ctx, exp, line, rng);
  }
  function rollLoot(ctx, exp, line, rng) {
    if (!rng.chance(line.permille)) return;
    if (line.kind === 'gold') exp.bag.gold += rng.between(line.min, line.max);
    else if (line.kind === 'res') { const q = rng.between(line.min, line.max); if (q > 0) exp.bag.resources[line.id] = (exp.bag.resources[line.id] || 0) + q; }
    else exp.bag.items.push({ pool: line.pool, rarity_bonus: line.rarity_bonus || 0 });
  }

  // ===================================================================================
  // 10. FIN D'EXPÉDITION : butin, répartition, blessures, moral — puis phase 7 complète
  // ===================================================================================
  function rarityTable(D, bonus) {
    const t = D.raw.loot_rarity;
    return [['common', Math.max(0, t.common - bonus)], ['rare', t.rare], ['epic', t.epic + div(bonus, 2)], ['legendary', t.legendary + div(bonus, 2)]];
  }
  function instantiateItem(D, spec, bonus, rng) {
    const order = ['common', 'rare', 'epic', 'legendary'];
    let rarity = rng.pickWeighted(rarityTable(D, bonus + (spec.rarity_bonus || 0)));
    const pool = spec.pool || rng.pickWeighted(D.raw.loot_pools);
    let idx = order.indexOf(rarity);
    while (idx >= 0) {
      const cands = D.raw.items.filter(it => it.pool === pool && it.rarity === order[idx]);
      if (cands.length) return cands[rng.roll(cands.length)].id;
      idx--;
    }
    return 'w_baton';
  }
  function computeRewards(ctx, exp, rng) {
    const D = ctx.D, outPct = D.raw.outcome_pct[exp.outcome];
    if (exp.outcome === 'wiped') { exp.bag.gold = 0; exp.bag.resources = {}; exp.bag.items = []; exp.bag.item_rolls_bonus = 0; }
    const quest_gold = div(exp.d.gold_base * exp.type.reward_gold_pct * outPct, 10000);
    const res = clone(exp.bag.resources);
    const qres = div(exp.d.resource_units * exp.type.reward_res_pct * outPct, 10000);
    if (qres > 0) res[exp.biome.primary] = (res[exp.biome.primary] || 0) + qres;
    const rolls = (exp.outcome === 'success' || exp.outcome === 'partial') ? exp.d.item_rolls + exp.bag.item_rolls_bonus : 0;
    const specs = exp.bag.items.slice();
    for (let i = 0; i < rolls; i++) if (rng.chance(exp.d.item_permille)) specs.push({ pool: null, rarity_bonus: 0 });
    const items = specs.map(s => instantiateItem(D, s, exp.d.rarity_bonus + exp.bag.rarity_bonus, rng));
    let gold = exp.bag.gold + quest_gold;
    if (exp.party.some(f => f.class_id === 'rogue' && f.level >= 10 && !f.deserted)) gold = pct(gold, 125);
    return { gold: gold, resources: res, items: items, xp_quest: div(exp.d.xp_base * outPct, 100), xp_pool: exp.xp_pool };
  }
  function lootValue(D, rw) {
    let v = rw.gold;
    for (const r of sortedKeys(rw.resources)) v += rw.resources[r] * D.resources[r].sell;
    for (const id of rw.items) v += D.C.loot_item_value[D.items[id].rarity] || 20;
    return v;
  }
  function expeditionScore(D, exp, rw) {
    const c = exp.counters;
    return c.rooms_cleared * 100 + c.floors_cleared * 150 + (c.boss_killed ? 600 : 0) + div(lootValue(D, rw), 5) + c.kills * 10
      + (exp.outcome === 'success' ? 300 : 0) - c.ko_count * 120 - c.rounds_total * 3 - c.deserters * 200;
  }
  function distribute(ctx, exp, rw) {
    const state = ctx.state, D = ctx.D;
    const members = exp.party.filter(f => !f.deserted);
    const managers = managersIn(exp);
    const cut = permille(rw.gold, D.C.guild_cut_permille);
    const rest = rw.gold - cut;
    let given = 0;
    const byM = {};
    for (const m of managers) { const g = div(rest * members.filter(f => f.owner === m).length, Math.max(1, members.length)); byM[m] = g; given += g; state.purses[m] += g; }
    state.guild.gold += cut + (rest - given);
    state.stats.gold_earned += rw.gold;
    let sold = 0;
    for (const r of sortedKeys(rw.resources)) {
      const free = warehouseCap(D, state) - warehouseUsed(state);
      const q = Math.min(free, rw.resources[r]);
      state.warehouse[r] += q;
      sold += div((rw.resources[r] - q) * D.resources[r].sell, 4);
    }
    state.guild.gold += sold;
    const ranking = members.slice().sort((a, b) => (b.damage + b.healing) - (a.damage + a.healing) || a.slot - b.slot);
    const grants = [];
    rw.items.forEach((id, i) => { const f = ranking[i % ranking.length]; giveItem(D, state, f.owner, id); grants.push(D.items[id].name + ' → ' + managerName(state, f.owner)); state.stats.items_found++; if (D.items[id].rarity !== 'common') moment(ctx, 45, f.name + ' rapporte ' + D.items[id].name + ' (' + D.rarities[D.items[id].rarity].name + ').'); });
    for (const f of members) {
      let xp = rw.xp_quest + div(rw.xp_pool, members.length);
      if (f.level > exp.L + 4) xp = pct(xp, 50);
      if (f.level < exp.L - 4) xp = pct(xp, 120);
      xp = permille(xp, 1000 + f.xp_bonus_permille);
      if (f.was_ko) xp = div(xp, 2);
      f.xp_gain = xp;
    }
    return { byM: byM, cut: cut, sold: sold, grants: grants };
  }
  // Report sur les héros : fatigue/moral du combat, blessures (TIRAGES), consommables, XP.
  function applyToHeroes(ctx, exp, rw) {
    const state = ctx.state, D = ctx.D;
    const clericUp = exp.party.some(f => f.class_id === 'cleric' && !f.ko && !f.deserted);
    const injuredCount = exp.party.filter(f => f.was_ko).length;
    const rareLoot = rw.items.some(id => D.items[id].rarity !== 'common');
    for (const f of exp.party) {
      const h = state.heroes[f.id];
      h.fatigue = clamp(f.fatigue + (hasTrait(h, 'fragile') ? 5 : 0), 0, 100);
      h.morale = f.morale;
      const consumed = f.consumed.slice();
      if (f.potion && D.items[f.potion.item_id].use === 'return') { const st = D.items[f.potion.item_id].stats; if (st.fatigue) h.fatigue = clamp(h.fatigue + st.fatigue, 0, 100); if (st.injury_days) f.injury_bonus_days += st.injury_days; consumed.push(f.potion.uid); }
      for (const uid of consumed) { state.inventories[h.owner].items = state.inventories[h.owner].items.filter(x => x.uid !== uid); for (const s of sortedKeys(h.equipment)) if (h.equipment[s] === uid) h.equipment[s] = null; }
      let dm = 0;
      if (f.deserted) { dm -= 8; addXp(ctx, h, 0); }
      else {
        dm += exp.outcome === 'success' || exp.outcome === 'partial' ? 10 : exp.outcome === 'retreat' ? -5 : -15;
        if (dm < 0 && (hasTrait(h, 'brave') || clericUp)) dm = div(dm, 2);
        if (hasTrait(h, 'hothead')) dm += dm > 0 ? 5 : -5;
        dm -= 3 * (injuredCount - (f.was_ko ? 1 : 0));
        if (rareLoot) dm += 3 + (hasTrait(h, 'greedy') ? 5 : 0);
        if (hasTrait(h, 'greedy') && !rw.items.length) dm -= 5;
        if (exp.flags.feat === f.id) dm += 5;
        addXp(ctx, h, f.xp_gain || 0);
      }
      if (f.was_ko) {
        const sev = exp.outcome === 'wiped' || exp.quest.difficulty >= 6 ? 2 : 1;
        injure(ctx, h, sev);
        h.injury.days_left = Math.max(1, h.injury.days_left + div(exp.quest.difficulty, 3) - (clericUp ? 1 : 0) + f.injury_bonus_days);
        dm -= sev === 1 ? 5 : 10;
        say(ctx, 'expedition', tpl(ctx, 'injury', h.id, gv(h, { a: heroName(h), n: h.injury.days_left })));
      }
      if (hasTrait(h, 'stoic')) dm = div(dm, 2);
      h.morale = clamp(h.morale + dm, 0, 100);
      h.history.expeditions++;
      if (exp.outcome === 'success' || exp.outcome === 'partial') h.history.victories++;
      h.last_team = exp.party.filter(x => x.id !== f.id).map(x => x.id);
    }
  }
  function outcomeLabel(o) { return o === 'success' ? 'succès' : o === 'partial' ? 'succès partiel' : o === 'retreat' ? 'retraite' : o === 'wiped' ? 'déroute' : 'échec'; }
  function outcomeVm(o) { return o === 'success' || o === 'partial' ? 'succès' : o === 'retreat' ? 'retraite' : 'échec'; }

  // ---- Phase 7 : expédition sur la quête votée ----
  function phaseExpedition(ctx) {
    const state = ctx.state, D = ctx.D;
    const party = buildParty(ctx);
    if (!party.length) { say(ctx, 'expedition', tpl(ctx, 'expedition_none', 'n', {})); return; }
    const quest = ctx.quest;
    const fighters = party.map((h, i) => makeFighter(D, combatProfile(D, state, h), i));
    say(ctx, 'expedition', tpl(ctx, 'expedition_depart', 'd', { n: fighters.length, biome: D.biomes[quest.biome].name, list: joinFr(fighters.map(f => f.name)) }) + ' Quête : « ' + quest.name + ' » (difficulté ' + quest.difficulty + ').');
    const exp = runExpedition(ctx, quest, fighters, ctx.rng);
    const rw = computeRewards(ctx, exp, ctx.rng);
    const dist = distribute(ctx, exp, rw);
    applyToHeroes(ctx, exp, rw);
    state.quests = state.quests.filter(q => q.id !== quest.id);
    state.stats.expeditions++;
    if (exp.outcome === 'success') { state.stats.successes++; state.guild.prestige += D.C.prestige_per_success + quest.difficulty; }
    else if (exp.outcome === 'partial') state.guild.prestige += D.C.prestige_per_partial;
    const c = exp.counters;
    for (const l of exp.lines.slice(0, 4)) say(ctx, 'expedition', l);
    say(ctx, 'expedition', 'Bilan : ' + c.rooms_cleared + '/' + c.rooms_total + ' salles nettoyées, ' + c.kills + ' monstres abattus, ' + c.ko_count + ' KO, ' + c.rounds_total + ' tours de combat.');
    const injured = exp.party.filter(f => f.was_ko).map(f => f.name);
    say(ctx, 'expedition', tpl(ctx, 'expedition_return', 'r', { outcome: outcomeLabel(exp.outcome), gold: rw.gold, injured: injured.length ? joinFr(injured) : 'aucun' }));
    const loot = [];
    for (const m of sortedKeys(dist.byM)) if (dist.byM[m] > 0) loot.push(dist.byM[m] + ' or → ' + managerName(state, m));
    if (dist.cut > 0) loot.push(dist.cut + ' or → caisse de guilde');
    for (const r of sortedKeys(rw.resources)) if (rw.resources[r] > 0) loot.push(rw.resources[r] + ' ' + D.resources[r].name.toLowerCase() + ' → entrepôt');
    for (const g of dist.grants) loot.push(g);
    if (loot.length) say(ctx, 'expedition', 'Partage : ' + loot.join(' · ') + '.');
    const xpTotal = sum(exp.party.map(f => f.xp_gain || 0));
    const score = expeditionScore(D, exp, rw);
    moment(ctx, exp.outcome === 'success' ? 50 : exp.outcome === 'wiped' ? 85 : 40, '« ' + quest.name + ' » : ' + outcomeLabel(exp.outcome) + ' pour ' + joinFr(exp.party.map(f => f.name)) + ' (' + rw.gold + ' or).');
    ctx.exp_result = { quest: quest, score: score, outcome: exp.outcome, avg_level: div(sum(party.map(h => h.level)), party.length) };
    ctx.exp_floors = exp.floors;
    ctx.expedition = { quest_name: quest.name, biome_name: D.biomes[quest.biome].name, participants: fighters.map(f => f.name), outcome: outcomeVm(exp.outcome),
      rooms: exp.rooms.map(r => ({ name: r.name, lines: r.lines })), loot: loot, xp: xpTotal };
    ctx.summary.gold_delta += rw.gold;
  }

  // ===================================================================================
  // 11. PHASES 8 à 13 : marché, taverne, chantier, fin de jour, derby, bilan
  // ===================================================================================
  function phaseMarket(ctx) {
    const state = ctx.state, D = ctx.D;
    const sellPct = D.C.market_sell_pct[bLevel(D, state, 'market')];
    for (const a of ctx.queued.sell) {
      const it = findItem(state, a.manager_id, a.payload.item_id);
      if (!it || equippedUids(state, a.manager_id)[it.uid]) { ctx.notices.push(managerName(state, a.manager_id) + ' : vente impossible, objet absent ou porté.'); continue; }
      const price = pct(D.items[it.item_id].price, sellPct);
      state.inventories[a.manager_id].items = state.inventories[a.manager_id].items.filter(x => x.uid !== it.uid);
      state.purses[a.manager_id] += price;
      say(ctx, 'marche', tpl(ctx, 'market_sell', it.uid, { m: managerName(state, a.manager_id), item: D.items[it.item_id].name, n: price }));
    }
    for (const a of ctx.queued.buy) {
      const s = state.market.filter(x => x.item_id === a.payload.item_id)[0];
      const price = D.items[a.payload.item_id].price;
      if (!s || s.stock <= 0 || state.purses[a.manager_id] < price) { const t = tpl(ctx, 'rejected', 'buy' + a.manager_id, { m: managerName(state, a.manager_id), reason: 'achat impossible (' + D.items[a.payload.item_id].name + ')' }); ctx.notices.push(t); say(ctx, 'marche', t); continue; }
      s.stock -= 1; state.purses[a.manager_id] -= price;
      giveItem(D, state, a.manager_id, a.payload.item_id);
      say(ctx, 'marche', tpl(ctx, 'market_buy', a.payload.item_id + a.manager_id, { m: managerName(state, a.manager_id), item: D.items[a.payload.item_id].name, n: price }));
    }
    refreshMarket(D, state, ctx.rng);
    say(ctx, 'marche', tpl(ctx, 'market_stock', 's', { n: sum(state.market.map(x => x.stock)) }));
  }
  function phaseTavern(ctx) {
    const state = ctx.state, D = ctx.D;
    const names = {};
    for (const o of state.tavern) names[o.id] = heroName(o.hero);
    for (const a of ctx.queued.recruit) {
      const o = state.tavern.filter(x => x.id === a.payload.recruit_id)[0];
      const name = names[a.payload.recruit_id] || a.payload.recruit_id;
      let why = null;
      if (!o) why = 'arrivé trop tard à la taverne';
      else if (state.purses[a.manager_id] < o.cost) why = 'or insuffisant';
      else if (heroesOf(state, a.manager_id).length >= rosterCap(D, state)) why = 'effectif complet';
      if (why) { const t = tpl(ctx, 'recruit_fail', a.manager_id, { m: managerName(state, a.manager_id), a: name, reason: why }); ctx.notices.push(t); say(ctx, 'taverne', t); continue; }
      state.purses[a.manager_id] -= o.cost;
      state.tavern = state.tavern.filter(x => x.id !== o.id);
      const h = addHero(D, state, a.manager_id, o.hero);
      ctx.effective[h.id] = { activity: 'rest', target: null };
      ctx.summary.recruits.push(heroName(h));
      say(ctx, 'taverne', tpl(ctx, 'recruit', h.id, { m: managerName(state, a.manager_id), a: heroName(h), cls: D.classes[h.class_id].name, lvl: h.level, n: o.cost }));
      moment(ctx, 30, managerName(state, a.manager_id) + ' engage ' + heroName(h) + ', ' + D.classes[h.class_id].name.toLowerCase() + ' de niveau ' + h.level + '.');
    }
    const keep = [];
    for (const o of state.tavern) { if (o.expires_day <= state.day + 1) say(ctx, 'taverne', tpl(ctx, 'tavern_expired', o.id, gv(o.hero, { a: heroName(o.hero) }))); else keep.push(o); }
    state.tavern = keep;
    const want = D.C.tavern_offers[bLevel(D, state, 'tavern')];
    for (let i = state.tavern.length; i < want; i++) {
      const o = genOffer(D, state, ctx.rng, i);
      state.tavern.push(o);
      say(ctx, 'taverne', tpl(ctx, 'tavern_offer', o.id, { a: heroName(o.hero), cls: D.classes[o.hero.class_id].name, lvl: o.hero.level, n: o.cost }));
      if (o.hero.rarity === 'rare' || o.hero.rarity === 'legendary') moment(ctx, 35, 'Une recrue ' + (o.hero.rarity === 'rare' ? 'rare' : 'légendaire') + ' à la taverne : ' + heroName(o.hero) + '.');
    }
  }
  function phaseConstruction(ctx) {
    const state = ctx.state, D = ctx.D;
    if (state.construction) {
      const c = state.construction;
      c.progress += 1;
      const b = D.buildings[c.building_id];
      if (c.progress >= c.needed) {
        state.buildings[c.building_id] = c.to_level;
        const eff = b.levels[c.to_level - 1].effect_label;
        say(ctx, 'chantier', tpl(ctx, 'construction_done', c.building_id, { b: b.name, n: c.to_level, effect: eff }));
        moment(ctx, 45, b.name + ' passe au niveau ' + c.to_level + ' : ' + eff.toLowerCase() + '.');
        ctx.summary.construction = b.name + ' niveau ' + c.to_level + ' achevé';
        state.construction = null;
      } else { say(ctx, 'chantier', tpl(ctx, 'construction_progress', c.building_id, { b: b.name, p: c.progress, needed: c.needed })); ctx.summary.construction = b.name + ' ' + c.progress + '/' + c.needed; }
      return;
    }
    if (!ctx.build_vote) return;
    const id = ctx.build_vote, b = D.buildings[id], lv = bLevel(D, state, id);
    if (lv >= 4) return;
    const why = canFundBuilding(D, state, id);
    if (why) { const t = tpl(ctx, 'construction_blocked', id, { b: b.name, reason: why }); ctx.notices.push(t); say(ctx, 'chantier', t); ctx.summary.construction = b.name + ' bloqué'; return; }
    const L = b.levels[lv];
    for (const r of sortedKeys(L.cost)) state.warehouse[r] -= L.cost[r];
    state.guild.gold -= L.gold;
    state.construction = { building_id: id, to_level: lv + 1, progress: 0, needed: L.days };
    say(ctx, 'chantier', tpl(ctx, 'construction_start', id, { b: b.name, n: lv + 1, days: L.days }));
    ctx.summary.construction = b.name + ' niveau ' + (lv + 1) + ' lancé';
  }

  // ---- Phase 11 : fin de jour (état des héros, XP, niveaux, tableau des quêtes) ----
  function phaseEvening(ctx) {
    const state = ctx.state, D = ctx.D;
    const chapel = D.C.chapel_morale[bLevel(D, state, 'chapel')];
    const decoMorale = {};
    for (const m of sortedKeys(state.quarters)) decoMorale[m] = Math.min(D.C.decoration_morale_cap, sum(state.quarters[m].map(q => D.decorations[q.decoration_id].morale)));
    const cheerful = {};
    for (const h of allHeroes(state)) if (hasTrait(h, 'cheerful')) cheerful[h.owner] = 1;
    for (const h of allHeroes(state)) {
      const act = ctx.effective[h.id] ? ctx.effective[h.id].activity : 'rest';
      const dl = D.C.activity_deltas[act] || D.C.activity_deltas.rest;
      h.form += Math.sign(50 - h.form) * Math.min(2, Math.abs(50 - h.form));
      let fat = dl.fatigue, mor = dl.morale;
      if (act === 'expedition') fat += 5 * (ctx.exp_floors || 1);
      if (act === 'rest' && hasTrait(h, 'lazy')) { fat -= 10; mor += 5; }
      if (act === 'train' && hasTrait(h, 'diligent')) fat += 5;
      if (fat > 0 && hasTrait(h, 'stoic')) fat = pct(fat, 80);
      mor += chapel + (decoMorale[h.owner] || 0) + (cheerful[h.owner] && !hasTrait(h, 'cheerful') ? 1 : 0) - (hasTrait(h, 'whiner') ? 1 : 0);
      if (hasTrait(h, 'stoic')) mor = div(mor, 2);
      h.fatigue = clamp(h.fatigue + fat, 0, 100);
      h.form = clamp(h.form + dl.form, 0, 100);
      h.morale = clamp(h.morale + mor, hasTrait(h, 'cheerful') ? 20 : 0, 100);
      if (act === 'gather' || act === 'craft') addXp(ctx, h, dl.xp);
      h.last_activity = act;
      for (const ev of applyXp(D, h, ctx.xp[h.id] || 0)) {
        if (ev.kind === 'level_up') { state.stats.level_ups++; ctx.summary.level_ups.push(heroName(h) + ' → ' + ev.level); say(ctx, 'soir', tpl(ctx, 'level_up', h.id, { a: heroName(h), n: ev.level })); moment(ctx, 50 + ev.level, heroName(h) + ' passe niveau ' + ev.level + ' !'); }
        else say(ctx, 'soir', tpl(ctx, 'skill_unlocked', h.id + ev.skill.id, { a: heroName(h), skill: ev.skill.name }));
      }
    }
    if (chapel) say(ctx, 'soir', tpl(ctx, 'chapel', 'c', { n: chapel }));
    refreshBoard(ctx);
  }
  function refreshBoard(ctx) {
    const state = ctx.state, D = ctx.D;
    const keep = [];
    for (const q of state.quests) { if (q.expires_day <= state.day + 1) say(ctx, 'soir', tpl(ctx, 'quest_expired', q.id, { q: q.name })); else keep.push(q); }
    state.quests = keep;
    const n = 2 + ctx.rng.roll(2);
    for (let i = 0; i < n; i++) { const q = genQuest(D, state, ctx.rng); state.quests.push(q); say(ctx, 'soir', tpl(ctx, 'quest_new', q.id, { q: q.name, biome: D.biomes[q.biome].name, d: q.difficulty })); }
    while (state.quests.length > 7) { let worst = state.quests[0]; for (const q of state.quests) if (q.expires_day < worst.expires_day || (q.expires_day === worst.expires_day && q.id < worst.id)) worst = q; state.quests = state.quests.filter(q => q !== worst); }
  }

  // ---- Phase 12 : derby (jours 7/14/21/28) ----
  function phaseDerby(ctx) {
    const state = ctx.state, D = ctx.D, rng = ctx.rng;
    if (D.C.derby_days.indexOf(state.day) < 0) return;
    const rival = D.raw.rival_guilds[fnvU32(state.seed) % D.raw.rival_guilds.length];
    const sortedQ = state.quests.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
    const quest = ctx.exp_result ? ctx.exp_result.quest : (ctx.quest || sortedQ[0] || null);
    let their = 0;
    if (quest) {
      const roster = allHeroes(state);
      const avg = ctx.exp_result ? ctx.exp_result.avg_level : Math.max(1, div(sum(roster.map(h => h.level)), Math.max(1, roster.length)));
      const fighters = ['warrior', 'ranger', 'cleric', 'rogue'].slice(0, D.quest_types[quest.type].party_max).map((c, i) => {
        const h = genHero(D, rng, state, { class_id: c, level: clamp(avg + rng.roll(3) - 1, 1, D.C.level_max) });
        h.id = 'rival_' + i; h.owner = 'rival'; h.fatigue = 20;
        return makeFighter(D, combatProfile(D, state, h), i);
      });
      const exp = runExpedition(ctx, quest, fighters, rng);
      their = expeditionScore(D, exp, computeRewards(ctx, exp, rng));
    }
    const our = ctx.exp_result ? ctx.exp_result.score : 0;
    const result = our > their ? 'victoire' : our < their ? 'défaite' : 'nul';
    const key = result === 'victoire' ? 'win' : result === 'défaite' ? 'loss' : 'draw';
    state.guild.prestige += D.C.derby_prestige[key];
    if (key === 'win') { const g = quest ? pct(D.difficulty[quest.difficulty].gold_base, 50) : 0; state.guild.gold += g; state.stats.derby_wins++; }
    else if (key === 'loss') state.stats.derby_losses++; else state.stats.derby_draws++;
    state.derby.last = { day: state.day, result: result, our_score: our, their_score: their, rival_name: rival };
    const line = tpl(ctx, 'derby_' + key, 'd', { rival: rival, us: our, them: their });
    say(ctx, 'derby', 'Quête du derby : « ' + (quest ? quest.name : 'aucune') + ' ».');
    say(ctx, 'derby', line);
    moment(ctx, key === 'win' ? 90 : key === 'loss' ? 70 : 50, line);
  }

  // ---- Phase 13 : bilan de saison ----
  function phaseSeason(ctx) {
    const state = ctx.state, D = ctx.D;
    if (state.day !== state.season_length) return;
    const heroes = allHeroes(state);
    const best = heroes.slice().sort((a, b) => b.level - a.level || b.xp - a.xp || (a.id < b.id ? -1 : 1))[0];
    const s = state.stats;
    const lines = [
      'Trésorerie de guilde : ' + state.guild.gold + ' or · prestige ' + state.guild.prestige + ' (niveau de guilde ' + guildLevel(D, state) + ').',
      'Expéditions : ' + s.expeditions + ', dont ' + s.successes + ' succès · ' + s.gold_earned + ' or rapportés · ' + s.items_found + ' objets trouvés.',
      'Derbys : ' + s.derby_wins + ' victoire(s), ' + s.derby_losses + ' défaite(s), ' + s.derby_draws + ' nul(s).',
      'Montées de niveau : ' + s.level_ups + ' · blessures : ' + s.injuries + '.',
      best ? 'Aventurier de la saison : ' + heroName(best) + ' (' + D.classes[best.class_id].name + ' niveau ' + best.level + ').' : 'Aucun aventurier.',
      'Bâtiments : ' + D.raw.buildings.map(b => b.name + ' ' + bLevel(D, state, b.id)).join(', ') + '.'
    ];
    for (const m of state.managers) lines.push(m.name + ' : ' + state.purses[m.id] + ' or, ' + heroesOf(state, m.id).length + ' aventurier(s).');
    state.season_report = { title: 'Bilan de la saison — ' + state.season_length + ' jours', lines: lines };
    for (const l of lines) say(ctx, 'bilan', l);
    moment(ctx, 95, 'La saison s\'achève : ' + s.successes + ' succès en ' + s.expeditions + ' expéditions, prestige ' + state.guild.prestige + '.');
  }

  // ===================================================================================
  // 12. CHRONIQUE : assemblage, budget de lignes, instant du jour
  // ===================================================================================
  const SECTION_CAP = { matin: 6, paie: 2, recolte: 8, entrainement: 6, forge: 6, infirmerie: 5, expedition: 12, marche: 6, taverne: 6, chantier: 3, soir: 14, derby: 3, bilan: 12 };
  function ambianceLines(ctx, need) {
    const state = ctx.state, D = ctx.D, out = [];
    const heroes = allHeroes(state).sort((a, b) => (fnvStr(state.day + a.id) % 97) - (fnvStr(state.day + b.id) % 97) || (a.id < b.id ? -1 : 1));
    for (const h of heroes) {
      if (out.length >= need) break;
      const t = h.traits[(state.day + h.level) % h.traits.length];
      if (t === 'cheerful') out.push(tpl(ctx, 'cheerful', h.id, { a: heroName(h) }));
      else if (t === 'whiner') out.push(tpl(ctx, 'whiner', h.id, { a: heroName(h) }));
      else out.push(tpl(ctx, 'ambiance', h.id, { a: heroName(h), hook: D.traits[t].hook }));
    }
    for (const h of heroes) {
      if (out.length >= need) break;
      if (h.morale <= 30) out.push(tpl(ctx, 'morale_low', h.id, { a: heroName(h), n: h.morale }));
      else if (h.morale >= 80) out.push(tpl(ctx, 'morale_high', h.id, { a: heroName(h), n: h.morale }));
    }
    return out;
  }
  function buildChronicle(ctx) {
    const state = ctx.state, D = ctx.D;
    for (const k of sortedKeys(ctx.sections)) { const s = ctx.sections[k]; if (s.lines.length > SECTION_CAP[k]) s.lines = s.lines.slice(0, SECTION_CAP[k] - 1).concat(['… et ' + (s.lines.length - SECTION_CAP[k] + 1) + ' autres faits sans importance.']); }
    let total = sum(PHASES.map(p => ctx.sections[p[0]].lines.length));
    if (total < D.C.chronicle_min_lines) { const extra = ambianceLines(ctx, D.C.chronicle_min_lines - total); for (const l of extra) ctx.sections.soir.lines.push(l); total += extra.length; }
    let guard = 0;
    while (total > D.C.chronicle_max_lines && guard++ < 200) {
      let big = null;
      for (const p of PHASES) { const s = ctx.sections[p[0]]; if (p[0] !== 'expedition' && p[0] !== 'derby' && p[0] !== 'bilan' && s.lines.length > 2 && (!big || s.lines.length > big.lines.length)) big = s; }
      if (!big) break;
      big.lines.pop(); total--;
    }
    const moodIdx = fnvU32(state.seed ^ (state.day * 7919)) % D.templates.moods.length;
    const title = tpl(ctx, 'day_title', 't', { d: state.day, mood: D.templates.moods[moodIdx] });
    let headline = 'Une journée sans histoire au village ; on affûte les lames et on compte les sous.';
    if (ctx.moments.length) headline = ctx.moments.slice().sort((a, b) => b.score - a.score || a.seq - b.seq)[0].text;
    const sections = PHASES.map(p => ctx.sections[p[0]]).filter(s => s.lines.length).map(s => ({ phase: s.phase, title: s.title, lines: s.lines }));
    return { day: state.day, title: title, headline: headline, sections: sections, expedition: ctx.expedition,
      summary: { gold_delta: ctx.summary.gold_delta, injuries: ctx.summary.injuries, level_ups: ctx.summary.level_ups, recruits: ctx.summary.recruits, construction: ctx.summary.construction } };
  }

  // ===================================================================================
  // 13. RÉSOLUTION D'UNE JOURNÉE (pure : clone profond de l'entrée, jamais de mutation)
  // ===================================================================================
  function attachData(state, data) { Object.defineProperty(state, '__data', { value: data, enumerable: false, configurable: true }); return state; }
  function resolveDay(input, actions) {
    const data = input.__data || GLOBAL_DATA;
    const D = index(data);
    const state = attachData(clone(input), data);
    const ctx = makeCtx(D, state);
    const goldBefore = state.guild.gold + sum(sortedKeys(state.purses).map(m => state.purses[m]));
    phaseValidation(ctx, Array.isArray(actions) ? actions : []);     // 1
    phasePay(ctx);                                                      // 2
    phaseGather(ctx);                                                   // 3
    phaseTrain(ctx);                                                    // 4
    phaseForge(ctx);                                                    // 5
    phaseInfirmary(ctx);                                                // 6
    phaseExpedition(ctx);                                               // 7
    phaseMarket(ctx);                                                   // 8
    phaseTavern(ctx);                                                   // 9
    phaseConstruction(ctx);                                             // 10
    phaseEvening(ctx);                                                  // 11
    phaseDerby(ctx);                                                    // 12
    phaseSeason(ctx);                                                   // 13
    ctx.summary.gold_delta = state.guild.gold + sum(sortedKeys(state.purses).map(m => state.purses[m])) - goldBefore;
    const chronicle = buildChronicle(ctx);
    state.notices = ctx.notices.slice();
    state.last_chronicle = chronicle;
    const dayDone = state.day;
    state.day += 1;
    const h = hashState(Object.assign({}, state, { history: null }));
    state.history.push({ day: dayDone, title: chronicle.title, headline: chronicle.headline, hash: h });
    ctx.log.push('jour ' + dayDone + ' résolu, ' + ctx.rng.count + ' tirages, hash ' + h);
    return { state: state, chronicle: chronicle, log: ctx.log };
  }

  // ===================================================================================
  // 14. MODÈLE DE VUE — forme exacte du contrat, tout prêt à afficher
  // ===================================================================================
  function statsLabel(D, it) {
    const names = { atk: 'ATQ', def: 'DÉF', hp: 'PV', spd: 'VIT', crit: 'CRIT ‰', magic: 'MAG', heal: 'SOIN', fire: 'feu', gather_forest: 'récolte forêt %', gather_mountain: 'récolte montagne %', heal_pct: 'soin %', poison_immune: 'antipoison', atk_pct: 'ATQ %', def_pct: 'DÉF %', injury_days: 'jours de blessure', fatigue: 'fatigue' };
    return sortedKeys(it.stats).map(k => (names[k] || k) + ' ' + (it.stats[k] > 0 && k !== 'injury_days' && k !== 'fatigue' ? '+' : '') + it.stats[k]).join(' · ');
  }
  function costList(D, cost, have) { return sortedKeys(cost).map(r => ({ resource_id: r, name: D.resources[r].name, qty: cost[r], have: have[r] || 0 })); }
  function statusLabel(h) {
    if (h.injury.severity > 0) return 'Blessé (' + h.injury.days_left + ' j)';
    if (h.fatigue >= 100) return 'Épuisé';
    if (h.fatigue >= 70) return 'Fatigué';
    if (h.morale < 20) return 'Moral brisé';
    return 'Disponible';
  }
  function activityOptions(D, state, h) {
    const rest = { activity: 'rest', label: 'Repos', targets: [] };
    if (h.injury.severity >= 2 || h.fatigue >= 100) return [rest];
    const lv = bLevel(D, state, 'forge');
    const out = [
      { activity: 'gather', label: 'Récolte', targets: D.raw.resources.map(r => ({ id: r.id, label: r.name + ' (' + D.biomes[r.biome].name + ')' })) },
      { activity: 'train', label: 'Entraînement', targets: D.raw.attributes.map(a => ({ id: a.id, label: a.name })) },
      { activity: 'craft', label: 'Forge', targets: D.raw.recipes.filter(r => r.forge_level <= lv).map(r => ({ id: r.id, label: r.name })) },
      rest
    ];
    if (h.injury.severity === 0) out.push({ activity: 'expedition', label: 'Expédition', targets: [] });
    return out;
  }
  function rosterVm(D, state, managerId, planned) {
    return allHeroes(state).map(h => {
      const inv = state.inventories[h.owner];
      const cls = D.classes[h.class_id];
      return {
        id: h.id, name: heroName(h), class_id: h.class_id, class_name: cls.name, class_glyph: cls.glyph, manager_id: h.owner, manager_name: managerName(state, h.owner),
        level: h.level, xp: h.xp, xp_next: xpNext(D, h),
        attributes: D.attrs.map(a => ({ id: a, name: D.attr_names[a].name, value: attrEff(D, h, a) })),
        form: h.form, fatigue: h.fatigue, morale: h.morale,
        injury: h.injury.severity > 0 ? { days: h.injury.days_left, label: ['', 'Blessure légère', 'Blessure moyenne', 'Blessure grave'][h.injury.severity] } : null,
        traits: h.traits.map(t => ({ id: t, name: D.traits[t].name })),
        skills: D.skills_by_class[h.class_id].map(s => ({ id: s.id, name: s.name, level_req: s.unlock_level, unlocked: h.level >= s.unlock_level })),
        equipment: D.raw.slots.map(s => { const uid = h.equipment[s.id]; const it = uid ? inv.items.filter(x => x.uid === uid)[0] : null; return { slot: s.id, slot_name: s.name, item_name: it ? D.items[it.item_id].name : null, rarity: it ? D.items[it.item_id].rarity : null }; }),
        activity_options: activityOptions(D, state, h),
        planned: planned[h.id] || null, status_label: statusLabel(h), is_available: h.injury.severity < 2 && h.fatigue < 100, is_mine: h.owner === managerId
      };
    });
  }
  function viewModel(state, managerId) {
    const D = index(state.__data || GLOBAL_DATA);
    const me = managerOf(state, managerId) || state.managers[0];
    managerId = me.id;
    const plans = {}, voteQ = {}, voteB = {}, mineQ = {}, mineB = {}, planned = {};
    for (const m of state.managers) {
      plans[m.id] = planDefaults(state, m.id);
      for (const a of plans[m.id]) {
        if (a.type === 'vote_quest') { voteQ[a.payload.quest_id] = (voteQ[a.payload.quest_id] || 0) + 1; if (m.id === managerId) mineQ[a.payload.quest_id] = true; }
        if (a.type === 'vote_build') { voteB[a.payload.building_id] = (voteB[a.payload.building_id] || 0) + 1; if (m.id === managerId) mineB[a.payload.building_id] = true; }
        if (a.type === 'assign' && m.id === managerId) planned[a.payload.adventurer_id] = { activity: a.payload.activity, target: a.payload.target || null };
      }
    }
    const inv = state.inventories[managerId];
    const equipped = equippedUids(state, managerId);
    const sellPct = D.C.market_sell_pct[bLevel(D, state, 'market')];
    const forgeLv = bLevel(D, state, 'forge');
    const nextDerby = D.C.derby_days.filter(d => d >= state.day)[0];
    const upkeep = dailyUpkeep(D, state);
    return {
      day: state.day, season_length: state.season_length, seed: state.seed, hash: hashState(state), is_season_over: state.day > state.season_length,
      manager: { id: me.id, name: me.name, kind: me.kind, gold: state.purses[me.id] },
      managers: state.managers.map(m => ({ id: m.id, name: m.name, kind: m.kind, profile_label: m.kind === 'ai' ? D.profiles[m.profile].label : 'Humain', gold: state.purses[m.id], adventurer_count: heroesOf(state, m.id).length })),
      guild: { gold: state.guild.gold, prestige: state.guild.prestige, upkeep_per_day: upkeep, storage_capacity: warehouseCap(D, state), storage_used: warehouseUsed(state),
        storage: D.raw.resources.map(r => ({ resource_id: r.id, name: r.name, glyph: r.glyph, qty: state.warehouse[r.id] || 0, value: r.sell })) },
      roster: rosterVm(D, state, managerId, planned),
      quest_board: state.quests.slice().sort((a, b) => (a.id < b.id ? -1 : 1)).map(q => { const t = D.quest_types[q.type], d = D.difficulty[q.difficulty]; return {
        id: q.id, name: q.name, type_label: t.name, biome_name: D.biomes[q.biome].name, difficulty: q.difficulty, days: 1, party_min: t.party_min, party_max: t.party_max,
        rewards_label: '~' + div(d.gold_base * t.reward_gold_pct, 100) + ' or · ' + d.xp_base + ' XP · ' + div(d.resource_units * t.reward_res_pct, 100) + ' ' + D.resources[D.biomes[q.biome].primary].name.toLowerCase() + ' · niveau conseillé ' + d.rec_level,
        votes: voteQ[q.id] || 0, voted_by_me: !!mineQ[q.id], expires_in: q.expires_day - state.day }; }),
      buildings: D.raw.buildings.map(b => { const lv = bLevel(D, state, b.id); const L = lv < 4 ? b.levels[lv] : null; return {
        id: b.id, name: b.name, level: lv, max_level: 4, description: b.description, decor: lv > 0 ? b.levels[lv - 1].decor : D.raw.building_empty_decor,
        effect_label: lv > 0 ? b.levels[lv - 1].effect_label : 'Non construit', next_cost: L ? costList(D, L.cost, state.warehouse) : null, upgrade_gold: L ? L.gold : 0,
        upgradable: !!L && !state.construction, votes: voteB[b.id] || 0, voted_by_me: !!mineB[b.id] }; }),
      construction: state.construction ? { building_id: state.construction.building_id, name: D.buildings[state.construction.building_id].name, to_level: state.construction.to_level, progress: state.construction.progress, needed: state.construction.needed, days_left: state.construction.needed - state.construction.progress } : null,
      forge: { level: forgeLv, capacity: D.C.forge_capacity[forgeLv],
        queue: state.forge_queue.map(q => ({ recipe_id: q.recipe_id, name: D.recipes[q.recipe_id].name, days_left: Math.max(1, div(q.work_left + D.C.forge_work_per_day[forgeLv] + 24, D.C.forge_work_per_day[forgeLv] + 25)), owner_name: managerName(state, q.owner) })),
        recipes: D.raw.recipes.map(r => { const why = canAffordRecipe(D, state, managerId, r); return { id: r.id, name: r.name, result_name: D.items[r.result].name, cost: costList(D, r.cost, inv.resources), gold: r.gold, days: Math.max(1, div(r.work + 24, 25)), available: !why, reason: why || '' }; }) },
      tavern: state.tavern.map(o => ({ id: o.id, name: heroName(o.hero), class_name: D.classes[o.hero.class_id].name, class_glyph: D.classes[o.hero.class_id].glyph, level: o.hero.level, cost: o.cost,
        attributes_summary: D.attrs.map(a => D.attr_names[a].name.slice(0, 3) + ' ' + attrEff(D, o.hero, a)).join(' · '), traits: o.hero.traits.map(t => D.traits[t].name), affordable: state.purses[managerId] >= o.cost && heroesOf(state, managerId).length < rosterCap(D, state) })),
      quarter: { grid_w: D.C.quarter_grid_w, grid_h: D.C.quarter_grid_h, placed: state.quarters[managerId].map(p => ({ decoration_id: p.decoration_id, name: D.decorations[p.decoration_id].name, glyph: D.decorations[p.decoration_id].glyph, x: p.x, y: p.y })),
        catalog: D.raw.decorations.map(d => ({ id: d.id, name: d.name, glyph: d.glyph, cost_gold: d.cost_gold, effect_label: d.effect_label, affordable: state.purses[managerId] >= d.cost_gold })) },
      market: state.market.map(s => { const it = D.items[s.item_id]; return { item_id: s.item_id, name: it.name, rarity: it.rarity, slot_name: D.slots[it.slot].name, buy: it.price, sell: pct(it.price, sellPct), stock: s.stock, affordable: s.stock > 0 && state.purses[managerId] >= it.price }; }),
      inventory: inv.items.slice().sort((a, b) => (a.uid < b.uid ? -1 : 1)).map(x => { const it = D.items[x.item_id]; return { item_id: x.uid, name: it.name, slot_name: D.slots[it.slot].name, rarity: it.rarity, stats_label: statsLabel(D, it), equipped_by: equipped[x.uid] ? heroName(state.heroes[equipped[x.uid]]) : null, sell_price: pct(it.price, sellPct) }; }),
      chronicle: state.last_chronicle, history: state.history.slice(),
      derby: { next_day: nextDerby === undefined ? null : nextDerby, last: state.derby.last },
      season_report: state.season_report, notices: state.notices.slice()
    };
  }

  // Sonde de test (pure) : lance une expédition avec tous les héros valides sur la n-ième quête du tableau
  // et renvoie l'état interne des combattants ; ne touche jamais à l'état de la partie.
  function probeExpedition(input, questIndex, probeSeed) {
    const data = input.__data || GLOBAL_DATA, D = index(data);
    const state = attachData(clone(input), data);
    const ctx = makeCtx(D, state);
    const quest = state.quests.slice().sort((a, b) => (a.id < b.id ? -1 : 1))[questIndex % Math.max(1, state.quests.length)];
    if (!quest) return null;
    const heroes = allHeroes(state).filter(h => h.injury.severity === 0).slice(0, D.quest_types[quest.type].party_max);
    const fighters = heroes.map((h, i) => makeFighter(D, combatProfile(D, state, h), i));
    const exp = runExpedition(ctx, quest, fighters, makeRng(fnvU32(probeSeed >>> 0)));
    return { outcome: exp.outcome, party: exp.party.map(f => ({ id: f.id, hp: f.hp, hp_max: f.hp_max, fatigue: f.fatigue, morale: f.morale, ko: f.ko })), counters: exp.counters, rooms: exp.rooms.length };
  }

  return { newGame: newGame, listManagers: listManagers, planDefaults: planDefaults, validateAction: validateAction, resolveDay: resolveDay, hashState: hashState, viewModel: viewModel,
    _internal: { makeRng: makeRng, fnvStr: fnvStr, fnvU32: fnvU32, canonical: canonical, combatProfile: combatProfile, probeExpedition: probeExpedition } };
}));
