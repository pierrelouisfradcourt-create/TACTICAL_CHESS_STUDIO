/* Chroniques de Guilde — moteur pur (UMD, aucune dépendance).
 * Date : 2026-09-17 (V1-V3), V4 le 2026-09-18. Source : CONTRACT.md (section V4) + design_aventuriers.md
 * + design_quetes_donjons.md + design_objets_economie.md (§0-2). Entiers partout, mulberry32 sur la graine
 * du jour, un seul flux RNG consommé dans l'ordre des phases du contrat.
 * V4 : dragons de biome réveillés par la maîtrise (plus de calendrier), points d'action et journées composées
 * (action plan), savoir-faire par l'usage, missions solo, mort et héritier, défaite (guilde dispersée).
 * V5 T1 (2026-09-18) : raid tactique persistant du Sylvain (tactic.js : grille 9×11, six classes de base dont l'Invocateur),
 * activité `raid`, action `raid_pass`, VM.raid ; seule dépendance : tactic.js (require sous node, window.GuildeTactic dans la page).
 * V5 T2 (2026-09-18) : lignée — 13 hybrides (data.hybrids, data.lineage), seuil « niveau ≥ 5 ou jour ≥ 8 », proposition le soir
 * (section « Voie »), action `choose_hybrid`, affinité §6.3 option B (libre + affinité), choix automatique après deux jours,
 * besoins du groupe (§6.2) ; raid tactique pour les trois dragons (fiches data.raids : Sylvain, Drake des monts, Hydre des marais).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./tactic.js'));
  else root.GuildeSim = factory(root.GuildeTactic || null);
}(typeof self !== 'undefined' ? self : this, function (TACTIC) {
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
      skills_by_class: {},
      ages: data.village_ages || [{ id: 'campement', name: 'Campement', prestige_min: 0, levels_min: 0, defense: 0, guards: 0, description: '' }],
      threats: data.threats || null,
      dragons: data.dragons || {}, crafts: byId(data.crafts || []), crafts_list: data.crafts || [],
      solo: byId(data.solo_missions || []), solo_list: data.solo_missions || [],
      raid: data.raid || null, raids: data.raids || {}, layouts: data.layouts || {}, tactic_spells: data.tactic_spells || []
    };
    for (const d of data.difficulty) D.difficulty[d.d] = d;
    for (const s of data.skills) (D.skills_by_class[s.class_id] = D.skills_by_class[s.class_id] || []).push(s);
    // V5 T2b (§B7 / garde G3) : refus AU CHARGEMENT d'un `effects[].kind` que le moteur tactique n'applique pas.
    // Le raid tactique est alors désactivé (repli V4 sur le dragon) avec une raison en français, plutôt que de laisser
    // un sort écrit en données ne rien faire en silence.
    D.tactic_effects = TACTIC && TACTIC.checkEffects ? TACTIC.checkEffects(data) : { ok: true, unknown: [], reason: null };
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
  // ---- V5 T6 (R3 / bug B8) : USURE DU SOIR DU MORAL, donc PLAFOND MOBILE ----
  // Avant T6 le moral ne pouvait que monter jusqu'au clamp à 100 : 93 % des héros y étaient au J30 et 357 sur 359
  // tenaient dans le seul palier haut de `moraleMod`. Chapelle, décorations et trait Jovial étaient donc gratuits.
  // L'usure vaut `(moral − plancher) / diviseur`, arrondi vers le bas : elle est NULLE sous le plancher (jamais
  // punitive pour un héros déjà bas) et croît avec le moral. Le moral s'équilibre donc là où le gain quotidien du
  // manager (repos, atelier, missions, chapelle, décorations, copain Jovial) compense l'usure :
  //     moral d'équilibre ≈ plancher + diviseur × gain quotidien.
  // Un manager qui n'investit rien plafonne dans le palier du milieu ; le palier haut (×105) se paie.
  function moraleWear(D, h) {
    const floor = D.C.morale_wear_floor === undefined ? 30 : D.C.morale_wear_floor;
    const dv = Math.max(1, D.C.morale_wear_div === undefined ? 8 : D.C.morale_wear_div);
    return div(Math.max(0, h.morale - floor), dv);
  }
  // ---- Savoir-faire (V4) : XP par l'usage, niveaux 1-10, bonus chiffré par niveau ----
  function craftXp(h, id) { return (h.crafts && h.crafts[id]) || 0; }
  function craftLevel(D, xp) {
    const t = D.C.craft_xp_table || [0, 0];
    let lv = 1;
    while (lv < t.length - 1 && xp >= t[lv + 1]) lv++;
    return lv;
  }
  function craftXpNext(D, lv) { const t = D.C.craft_xp_table || [0, 0]; return lv >= t.length - 1 ? t[t.length - 1] : t[lv + 1]; }
  function craftBonus(D, h, id) {
    const c = D.crafts[id];
    if (!c) return 0;
    const lv = craftLevel(D, craftXp(h, id));
    const per = (c.per_level_class && c.per_level_class[h.class_id] !== undefined) ? c.per_level_class[h.class_id] : c.per_level;
    return per * (lv - 1);
  }
  function craftBonusLabel(D, h, id) { return fill(D.crafts[id].label, { n: craftBonus(D, h, id) }); }
  function emptyCrafts(D) { const o = {}; for (const c of D.crafts_list) o[c.id] = 0; return o; }
  // ---- Points d'action (V4) ----
  function apMax(D, state, h) {
    let ap = D.C.ap_base || 3;
    if (hasTrait(h, 'endurant') || bLevel(D, state, 'training_ground') >= (D.C.ap_training_ground_level || 3)) ap += 1;
    return Math.max(D.C.ap_min || 1, ap);
  }
  function apToday(D, state, h) {
    let ap = apMax(D, state, h);
    if (h.fatigue >= (D.C.ap_fatigue_threshold || 60)) ap -= 1;
    return Math.max(D.C.ap_min || 1, ap);
  }
  function apCost(D, activity) { const c = D.C.ap_cost || {}; return c[activity] === undefined ? 1 : c[activity]; }
  function isFullDay(activity) { return activity === 'expedition' || activity === 'defend' || activity === 'rest' || activity === 'raid'; }
  // ---- V5 : raid tactique persistant (state.raid, module tactic.js) ----
  function raidActive(state) { return !!(state.raid && state.raid.status === 'active'); }
  function raidTableFor(D, dragonId) { for (const k of sortedKeys(D.raids)) if (D.raids[k].dragon_id === dragonId) return D.raids[k]; return null; }
  function raidEnabled(D) { return !!(TACTIC && D.raid && D.raid.raid_enabled !== false && (!D.tactic_effects || D.tactic_effects.ok)); }
  function raidDisabledWhy(D) { return !TACTIC ? 'moteur tactique absent (tactic.js n\'est pas chargé)' : (D.tactic_effects && !D.tactic_effects.ok ? D.tactic_effects.reason : null); }
  function canRaid(h) { return h.injury.severity === 0 && h.fatigue < 100; }
  // Environnement passé au module tactique : tables, jour, managers, profils du matin des héros vivants (jamais stocké dans l'état).
  function raidEnvOf(D, state, raiders, dayOverride) {
    const age = villageAge(D, state);
    const env = { data: D.raw, day: dayOverride === undefined ? state.day : dayOverride, seed: state.seed, season_length: state.season_length,
      managers: state.managers.map(m => ({ id: m.id, name: m.name })), heroes: {}, raiders: raiders || null,
      wall_shield_pct: div(age.defense * ((D.raid && D.raid.wall_shield_pct_of_defense) || 50), 100) };
    for (const h of allHeroes(state)) {
      const p = combatProfile(D, state, h);
      // V5 T6 (R2/B3) : `spd` n'est PLUS transmis — `unitsOrderS` exclut les héros, la vitesse n'avait aucun lecteur
      // sur la grille (mesuré : spd +5 et spd +100 identiques au bit près). Elle reste une grandeur d'EXPÉDITION.
      // En échange, `dodge`, `hit_bonus` et `fire` descendent sur la grille où ils ont maintenant un lecteur.
      env.heroes[h.id] = { id: h.id, name: p.name, owner: h.owner, class_id: h.class_id, hybrid: h.hybrid || null, spec: h.spec || null, hybrid_bonus: h.hybrid_bonus || 0, level: h.level, gender: h.gender, hp_max: p.hp_max, atk: p.atk, def: p.def, heal: p.heal, crit: p.crit,
        dodge: p.dodge, hit_bonus: p.hit_bonus, fire: p.fire,
        support: p.support, magic_power: p.magic_power, charisma: attrEff(D, h, 'charisma'),
        magic: p.magic, morale: h.morale, fatigue: h.fatigue, dexterity: attrEff(D, h, 'dexterity'), vigor: attrEff(D, h, 'vigor'), traits: h.traits.slice(), injury_severity: h.injury.severity };
    }
    return env;
  }
  // ---- V5 T2 : lignée (hybrides) — tables data.hybrids / data.lineage, affinité §6.3 option B, besoins du groupe §6.2 ----
  function tacticSpell(D, id) { for (const sp of (D.raw.tactic_spells || [])) if (sp.id === id) return sp; return null; }
  function lineageC(D) { return D.raw.lineage && D.raw.lineage.need_columns ? D.raw.lineage : null; }
  function hybridList(D) { return (D.raw.hybrids || []).slice().sort((a, b) => (a.id < b.id ? -1 : 1)); }
  function hybridById(D, id) { for (const H of (D.raw.hybrids || [])) if (H.id === id) return H; return null; }
  function pairsOf(H) { return H.pairs && H.pairs.length ? H.pairs : [H.bases]; }
  function hybridPairFor(H, classId) { for (const pr of pairsOf(H)) if (pr.indexOf(classId) >= 0) return pr; return null; }
  function hybridsForClass(D, classId) { return hybridList(D).filter(H => !!hybridPairFor(H, classId)); }       // deux paires peuvent mener au même hybride (fusions §5.4)
  function secondBaseOf(H, classId) { const pr = hybridPairFor(H, classId); return pr ? (pr[0] === classId ? pr[1] : pr[0]) : null; }
  function hybridReady(D, state, h) { const L = lineageC(D); return !!L && (h.level >= L.hybrid_level_min || state.day >= L.hybrid_day_min); }
  // Affinité (§6.3 option B) : savoir-faire de la 2e base ≥ 3 (+1), ≥ 4 expéditions avec un héros de la 2e base (+1), trait compatible (+1).
  function affinityOf(D, state, h, H) {
    const L = lineageC(D);
    if (!L) return 0;
    const second = secondBaseOf(H, h.class_id);
    if (!second) return 0;
    let n = 0;
    const craftId = (D.C.craft_by_class || {})[second];
    if (craftId && craftLevel(D, craftXp(h, craftId)) >= L.affinity_craft_level) n += 1;
    if (((h.companions || {})[second] || 0) >= L.affinity_expeditions) n += 1;
    if ((H.traits || []).some(t => hasTrait(h, t))) n += 1;
    return Math.min(L.affinity_max, n);
  }
  // Besoins du groupe (§6.2) : chaque base apporte sa colonne (§3.8), chaque hybride ajoute +2 dans la sienne ; les 2 plus basses sont écrites en clair.
  function groupNeeds(D, state) {
    const L = lineageC(D);
    if (!L) return { columns: [], missing: [], labels: [] };
    const cols = L.need_columns.map(c => ({ id: c.id, name: c.name, value: 0 }));
    const idx = {};
    cols.forEach((c, i) => { idx[c.id] = i; });
    for (const h of allHeroes(state)) {
      const base = L.base_needs[h.class_id] || {};
      for (const k of sortedKeys(base)) if (idx[k] !== undefined) cols[idx[k]].value += base[k];
      if (h.hybrid) { const H = hybridById(D, h.hybrid); if (H && idx[H.need] !== undefined) cols[idx[H.need]].value += L.hybrid_need_bonus; }
      if (h.spec) { const S = specById(D, h.spec); if (S && idx[S.need] !== undefined) cols[idx[S.need]].value += (L.spec_need_bonus || 2); }   // V5 T3 §6.2
    }
    for (const c of cols) { const w = (L.need_columns.filter(x => x.id === c.id)[0] || {}).weight || 1; c.filled = div(c.value * 100, w); }   // rempli en % de ce qu'une table des six bases apporte
    const ordered = cols.slice().sort((a, b) => a.filled - b.filled || (a.id < b.id ? -1 : 1));   // à remplissage égal, l'ordre des colonnes est fixe (départage stable)
    const missing = ordered.slice(0, L.need_missing);
    return { columns: cols, ordered: ordered.map(c => c.id), missing: missing.map(c => c.id), labels: missing.map(c => c.name) };
  }
  // V5 T5 : départage d'égalité parfaite. Deux options peuvent arriver à égalité de besoin, de complémentarité et
  // d'affinité ; l'ordre ASCII tranchait alors TOUJOURS dans le même sens, et la même voie (ou la même spé) gagnait
  // la pièce à chaque fois. Mesuré : Chasseur de monstres 50 contre Traqueur 5 — les deux portent la colonne
  // « dégâts », arrivaient à égalité parfaite chez le Rôdeur, et « chasseur_monstres » < « traqueur ». Idem
  // Bourrasque / Cyclone. Le départage devient un nombre déterministe tiré de (graine, héros, option) : rejouable
  // au bit près, stable pour un même héros, mais sans biais alphabétique. L'ASCII reste le dernier recours.
  function tieBreak(state, h, optId) { return fnvStr(state.seed + '|' + h.id + '|' + optId) % 997; }
  // V5 T5 : largeur de la tranche de remplissage (en %) sous laquelle deux colonnes sont « à égalité ». À 10 %, la
  // colonne de la voie — que le héros vient lui-même de remplir de +2 — écrasait toujours la sœur qui l'approfondit
  // (mesuré : Hospitalier 2 contre Templier 28). Élargir la tranche des SPÉS rend la paire réellement disputée.
  function hybridBand(D) { const L = lineageC(D); return (L && L.hybrid_need_band) || 10; }
  function specBand(D) { const L = lineageC(D); return (L && L.spec_need_band) || 10; }
  // Classement des hybrides ouverts à un héros : besoin manquant le plus bas, puis affinité, puis départage (§6.3 « Auto »).
  function rankHybrids(D, state, h) {
    const G = groupNeeds(D, state), rank = {}, taken = {};
    for (const c of G.columns) rank[c.id] = div(c.filled, hybridBand(D));                    // rang par tranche de remplissage de remplissage : la table comble d'abord sa colonne la moins remplie ; à égalité de tranche, le vécu et la complémentarité tranchent
    for (const x of allHeroes(state)) if (x.hybrid) taken[x.hybrid] = (taken[x.hybrid] || 0) + 1;      // émulation d'équipe : à besoin égal, la table préfère une voie qu'elle n'a pas encore
    return hybridsForClass(D, h.class_id).map(H => ({ id: H.id, hybrid: H, need_rank: rank[H.need] === undefined ? G.missing.length : rank[H.need], taken: taken[H.id] || 0, affinity: affinityOf(D, state, h, H), tie: tieBreak(state, h, H.id) }))
      .sort((a, b) => a.need_rank - b.need_rank || a.taken - b.taken || b.affinity - a.affinity || a.tie - b.tie || (a.id < b.id ? -1 : 1));
  }
  function pickHybrid(D, state, h) { const r = rankHybrids(D, state, h); return r.length ? r[0].hybrid : null; }
  function hybridWhy(D, state, h, hybridId) {
    const L = lineageC(D);
    if (!L) return 'les voies ne sont pas ouvertes';
    if (h.hybrid) return heroName(h) + ' a déjà une voie (' + (hybridById(D, h.hybrid) || { name: h.hybrid }).name + ')';
    if (!hybridReady(D, state, h)) return 'il faut le niveau ' + L.hybrid_level_min + ' ou le jour ' + L.hybrid_day_min + ' (niveau ' + h.level + ', jour ' + state.day + ')';
    const H = hybridById(D, hybridId);
    if (!H) return 'voie inconnue';
    if (!hybridPairFor(H, h.class_id)) return H.name + ' n\'est pas ouvert à un ' + D.classes[h.class_id].name.toLowerCase();
    return null;
  }
  // Application du choix : ressource, bonus d'affinité (l'hybride d'affinité maximale démarre à +1), chronique « Voie ».
  function applyHybrid(ctx, h, H, how) {
    const state = ctx.state, D = ctx.D, L = lineageC(D);
    const ranked = rankHybrids(D, state, h);
    let maxAff = 0;
    for (const r of ranked) if (r.affinity > maxAff) maxAff = r.affinity;
    const aff = affinityOf(D, state, h, H);
    h.hybrid = H.id;
    h.hybrid_day = state.day;
    h.hybrid_offer_day = null;
    h.hybrid_bonus = aff > 0 && aff >= maxAff ? (L ? L.affinity_resource_bonus : 1) : 0;
    say(ctx, 'voie', tpl(ctx, how === 'auto' ? 'voie_auto' : 'voie_choice', h.id, gv(h, { a: heroName(h), hybride: H.name, identity: H.identity, son: 'son' })));
    if (h.hybrid_bonus) say(ctx, 'voie', tpl(ctx, 'voie_affinity', h.id, gv(h, { a: heroName(h), ressource: (H.resource_name || H.resource).toLowerCase() })));
    moment(ctx, 62, heroName(h) + ' a choisi sa voie : ' + H.name + '.');
    ctx.summary.hybrids.push(heroName(h) + ' → ' + H.name);
    ctx.log.push('voie ' + h.id + ' -> ' + H.id + ' (' + how + ', affinité ' + aff + ')');
  }
  // ---- V5 T3 : spécialisations (data.specs) — seuil §6.1, reconversion §6.4 option B (HumanGate Pierre 2026-09-18) ----
  function specList(D) { return (D.raw.specs || []).slice().sort((a, b) => (a.id < b.id ? -1 : 1)); }
  function specById(D, id) { for (const S of (D.raw.specs || [])) if (S.id === id) return S; return null; }
  function specsForHybrid(D, hybridId) { return specList(D).filter(S => S.hybrid === hybridId); }
  function specReady(D, state, h) { const L = lineageC(D); return !!L && !!h.hybrid && (h.level >= L.spec_level_min || state.day >= L.spec_day_min); }
  // Classement des deux spés d'un hybride : besoin du groupe le moins rempli, puis spé absente de la table, puis identifiant.
  function rankSpecs(D, state, h) {
    const G = groupNeeds(D, state), rank = {}, taken = {};
    for (const c of G.columns) rank[c.id] = div(c.filled, specBand(D));
    for (const x of allHeroes(state)) if (x.spec) taken[x.spec] = (taken[x.spec] || 0) + 1;
    return specsForHybrid(D, h.hybrid).map(S => ({ id: S.id, spec: S, need_rank: rank[S.need] === undefined ? 99 : rank[S.need], taken: taken[S.id] || 0, tie: tieBreak(state, h, S.id) }))
      .sort((a, b) => a.need_rank - b.need_rank || a.taken - b.taken || a.tie - b.tie || (a.id < b.id ? -1 : 1));
  }
  function pickSpec(D, state, h) { const r = rankSpecs(D, state, h); return r.length ? r[0].spec : null; }
  function specWhy(D, state, h, specId) {
    const L = lineageC(D);
    if (!L || !(D.raw.specs || []).length) return 'les spécialisations ne sont pas ouvertes';
    if (!h.hybrid) return heroName(h) + ' n\'a pas encore de voie : la spécialisation vient après';
    if (h.spec) return heroName(h) + ' est déjà spécialisé' + (h.gender === 'f' ? 'e' : '') + ' (' + (specById(D, h.spec) || { name: h.spec }).name + ')';
    if (!specReady(D, state, h)) return 'il faut le niveau ' + L.spec_level_min + ' ou le jour ' + L.spec_day_min + ' (niveau ' + h.level + ', jour ' + state.day + ')';
    const S = specById(D, specId);
    if (!S) return 'spécialisation inconnue';
    if (S.hybrid !== h.hybrid) return S.name + ' n\'est pas ouvert à ' + (hybridById(D, h.hybrid) || { name: h.hybrid }).name;
    return null;
  }
  // Reconversion (§6.4 option B) : une seule par saison et par héros, hors raid, du jour du choix au jour limite, or de guilde + journée entière.
  function respecWhy(D, state, h, specId) {
    const L = lineageC(D);
    if (!L) return 'les spécialisations ne sont pas ouvertes';
    if (!h.spec) return heroName(h) + ' n\'est pas encore spécialisé' + (h.gender === 'f' ? 'e' : '');
    if ((h.respec_used || 0) >= (L.respec_max || 1)) return heroName(h) + ' a déjà changé de voie cette saison (une seule reconversion)';
    if (state.day > L.respec_deadline_day) return 'la reconversion est fermée depuis le jour ' + L.respec_deadline_day;
    if (raidActive(state)) return 'impossible pendant un raid : ' + heroName(h) + ' est attendu' + (h.gender === 'f' ? 'e' : '') + ' sur la grille';
    if (state.guild.gold < (L.respec_cost_gold || 100)) return 'or de guilde insuffisant (' + (L.respec_cost_gold || 100) + ' requis, ' + state.guild.gold + ' en caisse)';
    const S = specById(D, specId);
    if (!S) return 'spécialisation inconnue';
    if (S.id === h.spec) return heroName(h) + ' a déjà cette spécialisation';
    if (S.hybrid !== h.hybrid) return S.name + ' n\'est pas ouvert à ' + (hybridById(D, h.hybrid) || { name: h.hybrid }).name + ' : la reconversion ne change que la pointe, jamais la voie';
    return null;
  }
  function applySpec(ctx, h, S, how) {
    const state = ctx.state;
    h.spec = S.id;
    h.spec_day = state.day;
    h.spec_offer_day = null;
    say(ctx, 'voie', tpl(ctx, how === 'auto' ? 'voie_spec_auto' : 'voie_spec_choice', h.id, gv(h, { a: heroName(h), spe: S.name, identity: S.identity })));
    moment(ctx, 64, heroName(h) + ' s\'est spécialisé' + (h.gender === 'f' ? 'e' : '') + ' : ' + S.name + '.');
    ctx.summary.specs.push(heroName(h) + ' → ' + S.name);
    ctx.log.push('spé ' + h.id + ' -> ' + S.id + ' (' + how + ')');
  }
  function applyRespec(ctx, h, S) {
    const state = ctx.state, D = ctx.D, L = lineageC(D);
    const cost = L.respec_cost_gold || 100, old = specById(D, h.spec);
    state.guild.gold -= cost;
    h.spec = S.id;
    h.spec_day = state.day;
    h.respec_used = (h.respec_used || 0) + 1;
    h.respec_day = state.day;
    ctx.plans[h.id] = { slots: slotsOfAssign(D, state, h, 'rest', null), manager: h.owner };   // §6.4 : une journée entière y passe
    say(ctx, 'voie', tpl(ctx, 'voie_respec', h.id, gv(h, { a: heroName(h), spe: S.name, cout: cost, e2: h.gender === 'f' ? 'e' : '' })));
    moment(ctx, 66, heroName(h) + ' a changé de voie : ' + (old ? old.name : '?') + ' → ' + S.name + '.');
    ctx.summary.specs.push(heroName(h) + ' → ' + S.name + ' (reconversion)');
    ctx.log.push('reconversion ' + h.id + ' : ' + (old ? old.id : '?') + ' -> ' + S.id + ' (' + cost + ' or)');
  }
  function slotsCost(D, slots) { let n = 0; for (const s of slots) if (!isFullDay(s.activity)) n += apCost(D, s.activity); return n; }
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
  // V5 T6 (B2 / R2) : la statistique `magic` d'un objet ne doit plus dépendre de l'IDENTIFIANT de classe mais de la
  // GRANDEUR D'ATTAQUE. On dérive l'affinité en sondant `attackBase` avec un vecteur unité sur Esprit puis Volonté :
  // toute classe dont l'attaque est bâtie sur l'un des deux (Mage, Clerc, Invocateur) lit la magie de ses objets.
  // Avant T6 : 37 héros sur 144 portaient un objet dont la magie était entièrement perdue (227 points).
  function magicAffinity(D, h) {
    const Z = {};
    for (const a of D.attrs) Z[a] = 0;
    const base = attackBase(D, h, Z);
    let n = 0;
    for (const a of ['mind', 'will']) { const V = Object.assign({}, Z); V[a] = 1; n += attackBase(D, h, V) - base; }
    return n > 0 ? 1 : 0;
  }
  function attackBase(D, h, A) {
    switch (h.class_id) {
      case 'warrior': return A.strength * 2 + A.dexterity;
      case 'ranger': case 'rogue': return A.dexterity * 2 + A.strength;
      case 'mage': return A.mind * 2 + A.will;
      case 'summoner': return A.will + A.mind;
      case 'bard': return A.charisma * 2 + A.mind;                              // V5 T6 (D8) : la voix porte le coup
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
      hp_max: pct(pct(20 + A.vigor * 3 + h.level * 2, perf), 100 + craftBonus(D, h, 'endurance')) + (it.hp || 0),
      atk: pct(attackBase(D, h, A), perf) + (it.atk || 0) + (magicAffinity(D, h) ? (it.magic || 0) : 0),
      heal: pct(A.will * 2 + A.mind, perf) + (it.heal || 0),
      // V5 T6 (B10) : la fatigue module la DÉFENSE comme elle module l'attaque. L'expédition l'appliquait déjà au
      // défenseur (`fatigueDefMod`), le raid copiait `def` tel quel : un héros épuisé frappait à 75 % mais se
      // défendait comme au repos. Le profil porte désormais la valeur fatiguée, lue par les DEUX résolutions.
      def: pct(A.vigor + div(A.strength, 2) + (it.def || 0), fatigueDefMod(h)),
      spd: 7 + div(h.level, 2) + div(A.dexterity, 8) + (it.spd || 0),
      // V5 T6 (B5) : les plafonds sont appliqués APRÈS la somme des objets et du savoir-faire, sinon l'équipement
      // les contourne (un Voleur à `w_dent_hydre` + `t_oeil_hydre` + tir précis atteignait 750 ‰ sous un cap de 400).
      crit: Math.min(D.C.crit_max_permille || 400, 30 + A.luck * 5 + (it.crit || 0) + (hasSkill(D, h, 'precise_shot') ? 100 : 0)),
      dodge: Math.min(D.C.dodge_max_permille || 350, A.dexterity * 4 + craftBonus(D, h, 'discretion')),
      // V5 T6 (D7) : SOUTIEN — la grandeur dérivée du CHARISME. Rien n'alimentait les états bénéfiques, les auras,
      // les zones de soutien, les corps commandés et les contrôles de comportement : la Volonté servait à la fois de
      // soin et de commandement, et le Paladin se confondait avec le Clerc. Le soutien est au charisme ce que
      // l'attaque est à la force. Savoir-faire associé : Commandement.
      support: pct(pct(A.charisma * 4 + div(A.will, 2), perf), 100 + craftBonus(D, h, 'commandement')) + (it.support || 0),
      // V5 T6 (D9) : PUISSANCE MAGIQUE — grandeur dérivée dont héritent les corps d'élément. Elle dépend de
      // l'équipement du maître (`magic` des objets), c'est ce qui rend les invocations sensibles au butin.
      magic_power: pct(A.mind + A.will, perf) + (it.magic || 0),
      hit_bonus: craftBonus(D, h, 'archerie'), xp_pct: craftBonus(D, h, 'erudition'),
      fire: it.fire ? 1 : 0, morale: h.morale, fatigue: h.fatigue, traits: h.traits.slice(),
      magic: magicAffinity(D, h), priority: (hasSkill(D, h, 'taunt') ? 100 : 0) + (hasTrait(h, 'brave') ? 50 : 0) - (hasTrait(h, 'coward') ? 50 : 0),
      presence: hasSkill(D, h, 'presence') ? 1 : 0,
      skills: (D.skills_by_class[h.class_id] || []).filter(s => s.type === 'active' && h.level >= s.unlock_level).map(s => s.id),
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
    const herb = craftBonus(D, h, 'herboristerie');
    if (herb) p = pct(p, 100 + herb);
    return p;
  }
  function craftPower(D, state, h) {
    const cls = D.classes[h.class_id];
    let p = div((10 + attrEff(D, h, cls.craft_attr)) * (100 + cls.craft_affinity), 100);
    p = pct(p, perfPct(h));
    const forge = craftBonus(D, h, 'forge');
    if (forge) p = pct(p, 100 + forge);
    return p;
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
      for (const s of (D.skills_by_class[h.class_id] || [])) if (s.unlock_level === h.level) ev.push({ kind: 'skill', hero: h, skill: s });
    }
    if (h.level >= D.C.level_max) h.xp = D.raw.xp_table[D.C.level_max];
    return ev;
  }

  function genTraits(D, rng, rarity) {
    const all = D.raw.traits.filter(t => t.generated !== false).map(t => t.id);
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
    for (let i = 0; i < rnd; i++) b[D.attrs[rng.roll(D.attrs.length)]] += 2;             // V5 T6 (D7) : sept attributs, plus de 6 en dur
    return b;
  }
  function emptyAttrs(D) { const o = {}; for (const a of D.attrs) o[a] = 0; return o; }

  // Génère un héros (tirages T3..T9 du document Aventuriers §9.3 ; la rareté et le niveau sont fournis).
  function genHero(D, rng, state, opts) {
    const classId = opts.class_id || D.raw.classes[rng.roll(D.raw.classes.length)].id;   // V5 T6 (D8) : sept classes, plus de 5 en dur
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
      history: { expeditions: 0, victories: 0, injuries: 0, level_ups: 0 }, last_activity: 'rest', last_team: [],
      crafts: emptyCrafts(D),
      hybrid: null, hybrid_day: null, hybrid_offer_day: null, hybrid_bonus: 0, companions: {},   // V5 T2 : lignée (hybride, offre du soir, bonus d'affinité, compagnons d'expédition par classe)
      spec: null, spec_day: null, spec_offer_day: null, respec_used: 0, respec_day: null   // V5 T3 : spécialisation et reconversion (§6.1, §6.4)
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
      village_age: 0, threats: [],
      // V4 : maîtrise des biomes, dragons de biome, trophées, tombes, coffre de guilde, tableau solo, chute.
      biome_mastery: {}, dragons: {}, trophies: [], graves: [], guild_chest: [], solo_board: {}, legendary_given: [],
      collapsed: null, hall_hits: 0,
      raid: null, raid_history: [],   // V5 : raid tactique persistant (tactic.js) et archives des raids clos
      stats: { expeditions: 0, successes: 0, gold_earned: 0, derby_wins: 0, derby_losses: 0, derby_draws: 0, level_ups: 0, injuries: 0, items_found: 0, deaths: 0, dragons_slain: 0, solo_done: 0, solo_success: 0 }
    };
    for (const b of sortedKeys(D.dragons)) { state.biome_mastery[b] = 0; state.dragons[b] = { state: 'dormant', next_day: null, awakenings: 0, slain_day: null, last_outcome: null }; }
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
          const cls = (i === 0 && m.class_id && D.classes[m.class_id]) ? m.class_id : D.raw.classes[rng.roll(D.raw.classes.length)].id;
          addHero(D, state, m.id, genHero(D, rng, state, { class_id: cls, level: 2, age_seasons: 5 + rng.roll(8), wage: 0 }));
        }
      }
    } else for (const f of D.raw.founders) addHero(D, state, 'p1', genHero(D, rng, state, { class_id: f.class_id, level: f.level, age_seasons: f.age_seasons, wage: 0 }));
    for (const mid of customManagers ? [] : ['ai_audacieux', 'ai_prudent']) {
      const used = {};
      for (let i = 0; i < 3; i++) {
        let ci = rng.roll(D.raw.classes.length);
        while (used[ci]) ci = (ci + 1) % D.raw.classes.length;
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
    // V4 : plus de calendrier de menaces ; les dragons se réveillent par la maîtrise des biomes (phase 11c).
    for (const mid of sortedKeys(state.inventories)) state.solo_board[mid] = rollSoloBoard(D, state, rng, mid);
    return attachData(state, data);
  }
  // Tableau des missions solo d'un manager : 2 missions tirées parmi les éligibles (ids triés), renouvelées le soir.
  function soloEligible(D, state, managerId) {
    const heroes = heroesOf(state, managerId);
    const classes = {};
    for (const h of heroes) classes[h.class_id] = 1;
    const avg = heroes.length ? div(sum(heroes.map(h => h.level)), heroes.length) : 1;
    const dmax = clamp(div(avg, 2) + 1, 2, 5);
    return D.solo_list.filter(m => (m.class_id === null || classes[m.class_id]) && m.difficulty <= dmax).map(m => m.id).sort();
  }
  function rollSoloBoard(D, state, rng, managerId) {
    let pool = soloEligible(D, state, managerId);
    if (pool.length < 2) pool = D.solo_list.map(m => m.id).sort();
    const n = Math.min(D.C.solo_per_day || 2, pool.length), out = [];
    for (let i = 0; i < n; i++) { const pick = pool[rng.roll(pool.length)]; out.push(pick); pool = pool.filter(x => x !== pick); }
    return out.sort();
  }
  function threatOn(state, day) { return (state.threats || []).filter(t => t.day === day && t.outcome === null)[0] || null; }
  function threatToday(state) { return threatOn(state, state.day); }
  function villageAge(D, state) { return D.ages[clamp(state.village_age || 0, 0, D.ages.length - 1)]; }
  function buildingLevelsSum(state) { return sum(sortedKeys(state.buildings).map(b => state.buildings[b])); }
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
  function listManagers(state) { return state && Array.isArray(state.managers) ? state.managers.map(m => m.id) : []; }
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
  const ACTIVITIES = ['gather', 'train', 'craft', 'rest', 'expedition', 'defend', 'solo', 'raid'];
  function bad(reason) { return { ok: false, reason: reason }; }
  function validateAction(state, action, dataArg) {
    if (!dataOf(state, dataArg)) return bad(NO_DATA);
    remember(dataArg);
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
      case 'plan': return validatePlan(D, state, a, p, mine);
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
        if (o.heir_for && o.heir_for !== a.manager_id) return bad('cet héritier est réservé à ' + managerName(state, o.heir_for));
        if (state.purses[a.manager_id] < o.cost) return bad('or insuffisant (' + o.cost + ' requis)');
        // Exception explicite : l'héritier d'un mort est recruté même effectif complet (max_heroes = 1 compris).
        if (!o.heir_for && heroesOf(state, a.manager_id).length >= rosterCap(D, state)) return bad('effectif complet (' + rosterCap(D, state) + ')');
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
      case 'choose_hybrid': {
        // V5 T2 : choix de la voie (héros vivant et à vous, seuil atteint, pas déjà hybride, hybride ouvert à sa classe de base).
        const h = mine(p.adventurer_id);
        if (!h) return bad('aventurier inconnu ou pas à vous');
        const why = hybridWhy(D, state, h, p.hybrid_id);
        return why ? bad(why) : { ok: true };
      }
      case 'choose_spec': {
        // V5 T3 : choix de la spécialisation (héros à vous, hybride, seuil atteint, pas déjà spécialisé, spé ouverte à sa voie).
        const h = mine(p.adventurer_id);
        if (!h) return bad('aventurier inconnu ou pas à vous');
        const why = specWhy(D, state, h, p.spec_id);
        return why ? bad(why) : { ok: true };
      }
      case 'respec': {
        // V5 T3 §6.4 option B : une reconversion par saison, hors raid, jusqu'au jour limite, or de guilde + journée entière.
        const h = mine(p.adventurer_id);
        if (!h) return bad('aventurier inconnu ou pas à vous');
        const why = respecWhy(D, state, h, p.spec_id);
        return why ? bad(why) : { ok: true };
      }
      case 'raid_pass': {
        // V5 : passage tactique d'un héros (héros vivant et à vous, raid actif, apte, actions rejouées sur une copie du raid du matin).
        const h = mine(p.adventurer_id);
        if (!h) return bad('aventurier inconnu ou pas à vous');
        if (!raidActive(state) || !TACTIC) return bad('aucun raid en cours');
        const why = slotWhy(D, state, a, h, { activity: 'raid', target: null });
        if (why) return bad(why);
        if (!Array.isArray(p.actions)) return bad('passage sans actions');
        const v = TACTIC.validateRaidPass(state, h.id, p.actions, raidEnvOf(D, state, null));
        return v.ok ? { ok: true } : bad(v.reason || 'passage invalide');
      }
      default: return bad('type d\'action inconnu');
    }
  }
  // Un créneau d'activité (V4). Renvoie null si valide, sinon la raison.
  function slotWhy(D, state, a, h, s) {
    if (!s || typeof s !== 'object' || ACTIVITIES.indexOf(s.activity) < 0) return 'activité inconnue';
    if (s.activity === 'defend' && raidActive(state)) return 'le village est en raid : rejoignez la grille (activité raid)';
    if (s.activity === 'defend' && !threatToday(state)) return 'pas de menace aujourd\'hui';
    if (s.activity === 'raid' && !raidActive(state)) return 'aucun raid en cours';
    if (h.fatigue >= 100 && s.activity !== 'rest') return heroName(h) + ' est épuisé' + (h.gender === 'f' ? 'e' : '') + ' : repos obligatoire';
    if (h.injury.severity >= 1 && s.activity !== 'rest' && s.activity !== 'craft') return heroName(h) + ' est blessé' + (h.gender === 'f' ? 'e' : '') + ' : repos ou forge seulement';
    if (s.activity === 'gather' && !D.resources[s.target]) return 'ressource cible inconnue';
    if (s.activity === 'gather' && D.resources[s.target].gatherable === false) return 'ressource non récoltable';
    if (s.activity === 'train' && D.attrs.indexOf(s.target) < 0) return 'attribut cible inconnu';
    if (s.activity === 'craft' && s.target && !D.recipes[s.target]) return 'recette cible inconnue';
    if (s.activity === 'solo') {
      if (!D.solo[s.target]) return 'mission solo inconnue';
      if ((state.solo_board[a.manager_id] || []).indexOf(s.target) < 0) return 'mission absente de votre tableau';
      const m = D.solo[s.target];
      if (m.class_id && m.class_id !== h.class_id) return 'mission réservée aux ' + D.classes[m.class_id].name.toLowerCase() + 's';
    }
    return null;
  }
  // assign = journée pleine d'une activité (compatibilité) ; on la valide comme le plan équivalent.
  function validateAssign(D, state, a, p, mine) {
    const h = mine(p.adventurer_id);
    if (!h) return bad('aventurier inconnu ou pas à vous');
    if (ACTIVITIES.indexOf(p.activity) < 0) return bad('activité inconnue');
    if (p.activity === 'solo') return bad('une mission solo se planifie par l\'action plan (2 PA)');
    return validateSlots(D, state, a, h, slotsOfAssign(D, state, h, p.activity, p.target || null));
  }
  function validatePlan(D, state, a, p, mine) {
    const h = mine(p.adventurer_id);
    if (!h) return bad('aventurier inconnu ou pas à vous');
    if (!Array.isArray(p.slots)) return bad('plan sans créneaux');
    return validateSlots(D, state, a, h, p.slots);
  }
  function validateSlots(D, state, a, h, slots) {
    if (!slots.length) return { ok: true };            // plan vide = repos
    for (const s of slots) { const why = slotWhy(D, state, a, h, s); if (why) return bad(why); }
    const full = slots.filter(s => isFullDay(s.activity));
    if (full.length && slots.length > 1) return bad('une journée entière (' + activityLabel(full[0].activity) + ') ne se combine pas');
    if (slots.filter(s => s.activity === 'solo').length > 1) return bad('une seule mission solo par jour');
    const cost = slotsCost(D, slots), ap = apToday(D, state, h);
    if (cost > ap) return bad('plan trop chargé pour ' + heroName(h) + ' : ' + cost + ' PA demandés, ' + ap + ' disponible(s)');
    return { ok: true };
  }
  function activityLabel(act) { return { gather: 'Récolte', train: 'Entraînement', craft: 'Forge', rest: 'Repos', expedition: 'Expédition', defend: 'Défendre le village', solo: 'Mission solo', raid: 'Raid' }[act] || act; }
  function slotsOfAssign(D, state, h, activity, target) {
    if (activity === 'rest') return [];
    if (isFullDay(activity)) return [{ activity: activity, target: null }];
    const out = [], n = Math.max(1, div(apToday(D, state, h), apCost(D, activity)));
    for (let i = 0; i < n; i++) out.push({ activity: activity, target: target || null });
    return out;
  }

  // ===================================================================================
  // 6. PLANS PAR DÉFAUT (humain raisonnable, IA prudente, IA audacieuse) — déterministes
  // ===================================================================================
  const HUMAN_PROFILE = { rest_fatigue: 60, expedition_max: 3, expedition_fatigue_max: 45, expedition_min_level_margin: -1, train_every: 3, buy_potions: false, vote_quest: 'fit', vote_build: 'cheapest', recruit_gold_margin: 60, defend: 'always' };
  function profileOf(D, m) { return m.kind === 'ai' ? D.profiles[m.profile] : HUMAN_PROFILE; }
  function canDefend(h) { return h.injury.severity < 2 && h.fatigue < 100; }
  // Défenseurs prévus par les managers qui défendent « toujours » (humain, prudent) : base déterministe des décisions de l'audacieux.
  function defendersAlways(D, state) {
    let n = 0;
    for (const m of state.managers) if (profileOf(D, m).defend === 'always') n += heroesOf(state, m.id).filter(canDefend).length;
    return n;
  }
  // Décision « défendre » d'un héros pour un jour d'attaque ; othersAlways = défenseurs prévus par les autres (calcul ci-dessus).
  function defendDecision(D, m, h, othersAlways) {
    if (!canDefend(h)) return false;
    const mode = profileOf(D, m).defend;
    if (mode === 'always') return true;
    if (mode === 'if_needed') return h.injury.severity === 0 && othersAlways < 2;
    return false;
  }
  function plannedDefenders(D, state) {
    const always = defendersAlways(D, state);
    let n = 0;
    for (const m of state.managers) for (const h of heroesOf(state, m.id)) if (defendDecision(D, m, h, always)) n++;
    return n;
  }
  function planDefaults(state, managerId, dataArg) {
    const data = dataOf(state, dataArg);
    if (!data) return [];
    remember(dataArg);
    const D = index(data);
    const m = managerOf(state, managerId);
    if (!m) return [];
    const prof = m.kind === 'ai' ? D.profiles[m.profile] : D.profiles.prudent;
    const P = m.kind === 'ai' ? prof : HUMAN_PROFILE;
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
    planAssign(D, state, PP, heroes, target, needs, act, m);
    planEconomy(D, state, m, P, heroes, act);
    return out.filter(x => validateAction(state, x).ok);
  }
  // Biome préféré des votes : celui dont la maîtrise est la plus haute — concentration naturelle.
  // V5 T5 : deux correctifs mesurés. (1) Le biome dont le dragon n'est plus endormi sort de la préférence : son
  // affaire est faite, la guilde va chercher ailleurs. (2) À maîtrise égale, le départage tourne avec la graine au
  // lieu de suivre l'ordre ASCII. Sans eux, la forêt gagnait l'égalité du premier jour (toutes maîtrises nulles) et
  // la boucle de préférence l'y enfermait toute la saison : maîtrise 7,6 en forêt contre 1,4 et 1,5 ailleurs au J30,
  // et 53 réveils sur 59 en forêt — le Drake et l'Hydre étaient du contenu que personne ne voyait.
  function preferredBiome(D, state) {
    const keys = sortedKeys(state.biome_mastery || {});
    if (!keys.length) return null;
    const open = keys.filter(b => !state.dragons || !state.dragons[b] || state.dragons[b].state === 'dormant');
    const pool = open.length ? open : keys;
    const off = fnvU32(state.seed >>> 0) % pool.length;
    let best = null;
    for (let i = 0; i < pool.length; i++) {
      const b = pool[(i + off) % pool.length];
      if (best === null || state.biome_mastery[b] > state.biome_mastery[best]) best = b;
    }
    return best;
  }
  function pickQuestVote(D, state, mode, avg) {
    let qs = state.quests.slice().sort((a, b) => (a.id < b.id ? -1 : 1));
    if (!qs.length) return null;
    const pref = preferredBiome(D, state);
    if (pref && qs.some(q => q.biome === pref)) qs = qs.filter(q => q.biome === pref);
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
        if (wanted[r] || !(state.warehouse[r] > 0) || (D.resources[r] && D.resources[r].dragon)) continue;   // les matériaux de dragon restent à l'entrepôt
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
  // ---- V4 : journées composées. Chaque héros reçoit un plan (créneaux) ou un assign de journée entière (defend, rest, expedition). ----
  function soloBoardOf(D, state, h) {
    return (state.solo_board[h.owner] || []).map(id => D.solo[id]).filter(m => m && (!m.class_id || m.class_id === h.class_id)).sort((a, b) => a.difficulty - b.difficulty || (a.id < b.id ? -1 : 1));
  }
  function soloPick(D, state, h, mode) {
    const board = soloBoardOf(D, state, h);
    if (!board.length) return null;
    if (mode === 'easy') { const easy = board.filter(m => m.difficulty <= 2); return easy.length ? easy[0] : null; }
    if (mode === 'hard') return board[board.length - 1];
    const fit = board.filter(m => m.difficulty <= div(h.level, 2) + 1);     // « raisonnable » (humain)
    return fit.length ? fit[fit.length - 1] : board[0];
  }
  function trainSlot(D, h) { return { activity: 'train', target: D.classes[h.class_id].primary }; }
  function fillSlots(D, state, h, ap, first, needs) {   // complète ap créneaux avec first (craft si commande, sinon récolte)
    const out = [];
    for (let i = 0; i < ap; i++) out.push(first === 'craft' && craftJobFor(state, h) ? { activity: 'craft', target: null } : first === 'train' ? trainSlot(D, h) : { activity: 'gather', target: gatherTargetFor(D, h, needs) });
    return out;
  }
  function planAssign(D, state, P, heroes, quest, needs, act, m) {
    let sent = 0;
    const maxParty = quest ? Math.min(P.expedition_max, D.quest_types[quest.type].party_max) : 0;
    const rec = quest ? D.difficulty[quest.difficulty].rec_level : 99;
    const threat = threatToday(state);
    const othersAlways = threat && m ? defendersAlways(D, state) - (profileOf(D, m).defend === 'always' ? heroes.filter(canDefend).length : 0) : 0;
    const profile = m && m.kind === 'ai' ? m.profile : 'humain';
    const raid = raidActive(state);
    for (const h of heroes) {
      const ap = apToday(D, state, h);
      const trainDay = state.day % P.train_every === 0;
      if (raid && canRaid(h)) { act('assign', { adventurer_id: h.id, activity: 'raid' }); continue; }      // V5 : jour de raid, tout héros apte monte sur la grille
      if (threat && !raid && m && defendDecision(D, m, h, othersAlways)) { act('assign', { adventurer_id: h.id, activity: 'defend' }); continue; }
      if (h.fatigue >= 100 || h.fatigue >= P.rest_fatigue || h.morale < 25) { act('assign', { adventurer_id: h.id, activity: 'rest' }); continue; }
      if (h.injury.severity >= 1) { act(craftJobFor(state, h) ? 'plan' : 'assign', craftJobFor(state, h) ? { adventurer_id: h.id, slots: fillSlots(D, state, h, ap, 'craft', needs) } : { adventurer_id: h.id, activity: 'rest' }); continue; }
      const canExp = quest && sent < maxParty && h.fatigue <= P.expedition_fatigue_max && h.level >= rec + P.expedition_min_level_margin && ap >= apCost(D, 'expedition');
      let slots = null;
      if (profile === 'audacieux') {
        if (canExp) { act('assign', { adventurer_id: h.id, activity: 'expedition' }); sent++; continue; }
        const s = ap >= apCost(D, 'solo') ? soloPick(D, state, h, 'hard') : null;
        if (s) slots = [{ activity: 'solo', target: s.id }].concat(fillSlots(D, state, h, ap - apCost(D, 'solo'), 'train', needs));
        else slots = fillSlots(D, state, h, ap, trainDay ? 'train' : 'craft', needs);
      } else if (profile === 'prudent') {
        if (canExp) { act('assign', { adventurer_id: h.id, activity: 'expedition' }); sent++; continue; }
        const s = ap >= apCost(D, 'solo') ? soloPick(D, state, h, 'easy') : null;
        if (s) slots = [{ activity: 'solo', target: s.id }].concat(fillSlots(D, state, h, ap - apCost(D, 'solo'), 'craft', needs));
        else if (trainDay) slots = fillSlots(D, state, h, ap, 'train', needs);
        else slots = fillSlots(D, state, h, ap, 'craft', needs);                   // atelier si commande, sinon cueillette
      } else {                                                                      // humain : Aventure si disponible, sinon Atelier, sinon entraînement/cueillette
        if (canExp) { act('assign', { adventurer_id: h.id, activity: 'expedition' }); sent++; continue; }
        const s = ap >= apCost(D, 'solo') ? soloPick(D, state, h, 'fit') : null;
        if (s) slots = [{ activity: 'solo', target: s.id }].concat(fillSlots(D, state, h, ap - apCost(D, 'solo'), 'train', needs));
        else if (craftJobFor(state, h)) slots = fillSlots(D, state, h, Math.max(1, ap - 1), 'craft', needs).concat(ap > 1 ? [trainSlot(D, h)] : []);
        else slots = fillSlots(D, state, h, ap, trainDay ? 'train' : 'gather', needs);
      }
      act('plan', { adventurer_id: h.id, slots: slots });
    }
  }
  function craftJobFor(state, h) { return state.forge_queue.some(q => q.owner === h.owner); }
  // Préréglages calculés pour l'interface (VM.roster[].presets), filtrés par ce qui est permis aujourd'hui.
  function presetsFor(D, state, h) {
    const ap = apToday(D, state, h), a = { manager_id: h.owner, day: state.day };
    const needs = {};
    const out = [];
    const add = (id, label, slots, reason) => {
      let why = reason || null;
      if (!why && slots !== null) { const v = validateSlots(D, state, a, h, slots); if (!v.ok) why = v.reason; }
      out.push({ id: id, label: label, slots: why ? [] : slots, available: !why, reason: why || '' });
    };
    const job = craftJobFor(state, h);
    add('atelier', 'Atelier', job ? (h.injury.severity >= 1 ? fillSlots(D, state, h, ap, 'craft', needs) : fillSlots(D, state, h, Math.max(1, ap - 1), 'craft', needs).concat(ap > 1 ? [trainSlot(D, h)] : [])) : null, job ? null : 'aucune commande à la forge');
    const s = soloPick(D, state, h, 'fit');
    if (h.injury.severity === 0 && h.fatigue < 100 && ap >= apCost(D, 'expedition') && state.quests.length) add('aventure', 'Aventure', [{ activity: 'expedition', target: null }]);
    else if (s && ap >= apCost(D, 'solo')) add('aventure', 'Aventure', [{ activity: 'solo', target: s.id }].concat(fillSlots(D, state, h, ap - apCost(D, 'solo'), 'train', needs)));
    else add('aventure', 'Aventure', null, h.injury.severity >= 1 ? heroName(h) + ' est blessé' + (h.gender === 'f' ? 'e' : '') : h.fatigue >= 100 ? heroName(h) + ' est épuisé' + (h.gender === 'f' ? 'e' : '') : 'ni expédition ni mission solo possible');
    add('recuperation', 'Récupération', []);
    add('cueillette', 'Cueillette', fillSlots(D, state, h, ap, 'gather', needs));
    if (raidActive(state)) add('defense', 'Raid', [{ activity: 'raid', target: null }]);
    else if (threatToday(state)) add('defense', 'Défense', [{ activity: 'defend', target: null }]);
    return out;
  }
  function gatherTargetFor(D, h, needs) {
    const wanted = sortedKeys(needs || {}).filter(r => needs[r] > 0).sort((a, b) => needs[b] - needs[a] || (a < b ? -1 : 1));
    if (wanted.length) return wanted[(h.level + fnvStr(h.id) % 3) % wanted.length];
    if (h.class_id === 'warrior') return 'iron_ore';
    if (h.class_id === 'mage') return 'swamp_moss';
    if (h.class_id === 'cleric') return 'herbs';
    return h.class_id === 'rogue' ? 'hide' : 'wood';
  }
  // Recette de palier dragon réalisable avec l'entrepôt + l'inventaire : retraits ciblés puis commande (V4).
  function planDragonCraft(D, state, m, act) {
    if (bLevel(D, state, 'forge') < 3) return;
    const inv = state.inventories[m.id].resources;
    for (const r of D.raw.recipes.filter(x => x.category === 'dragon').sort((a, b) => (a.id < b.id ? -1 : 1))) {
      if (state.purses[m.id] < r.gold || state.forge_queue.some(q => q.recipe_id === r.id)) continue;
      const missing = {};
      let ok = true;
      for (const res of sortedKeys(r.cost)) { const d = r.cost[res] - (inv[res] || 0); if (d > 0) { if ((state.warehouse[res] || 0) < d) { ok = false; break; } missing[res] = d; } }
      if (!ok) continue;
      for (const res of sortedKeys(missing)) act('withdraw', { resource_id: res, qty: missing[res] });
      return r;
    }
    return null;
  }
  function planEconomy(D, state, m, P, heroes, act) {
    const mid = m.id, inv = state.inventories[mid];
    const heir = state.tavern.filter(o => o.heir_for === mid)[0];
    if (heir) act('recruit', { recruit_id: heir.id });
    // V5 T6 (B7) : la RARETÉ des héros ne servait à rien. `rollRarity` sait tirer peu commun, rare et légendaire à la
    // taverne (+2/+4/+6 sur l'attribut primaire), mais la politique par défaut prenait TOUJOURS l'offre la moins chère
    // — et une offre rare coûte 250 or de plus. Mesuré avant T6 : 354 communs, 5 peu communs, 0 rare, 0 légendaire sur
    // 359 héros ; `bonus_attrs` non nul pour 5 héros sur 359. La politique choisit désormais la MEILLEURE offre qu'elle
    // peut réellement s'offrir (rareté, puis niveau), et retombe sur la moins chère quand la bourse ne suit pas.
    const RARITY_RANK = { common: 0, uncommon: 1, rare: 2, legendary: 3 };
    const offers = state.tavern.filter(o => !o.heir_for).sort((a, b) => a.cost - b.cost);
    const affordable = offers.filter(o => state.purses[mid] >= o.cost + P.recruit_gold_margin);
    const best = affordable.slice().sort((a, b) =>
      (RARITY_RANK[b.hero.rarity] || 0) - (RARITY_RANK[a.hero.rarity] || 0) || b.hero.level - a.hero.level || a.cost - b.cost || (a.id < b.id ? -1 : 1))[0];
    if (!heir && best && heroes.length < rosterCap(D, state)) act('recruit', { recruit_id: best.id });
    planDragonCraft(D, state, m, act);
    if (P.buy_potions && state.purses[mid] >= 100) {
      const potions = inv.items.filter(x => x.item_id === 'c_potion_soin').length;
      const s = state.market.filter(x => x.item_id === 'c_potion_soin')[0];
      if (s && s.stock > 0 && potions < heroes.length) act('buy', { item_id: 'c_potion_soin' });
    }
    const dragonRecipes = D.raw.recipes.filter(x => x.category === 'dragon').map(x => x.id).sort();
    const want = dragonRecipes.concat(m.kind === 'ai' && m.profile === 'audacieux' ? ['r_potion_soin', 'r_epee_fer', 'r_cuir'] : ['r_potion_soin', 'r_gambison']);
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
    ['forge', 'Forge'], ['infirmerie', 'Infirmerie'], ['expedition', 'Expédition'], ['menace', 'Menace'], ['raid', 'Raid'], ['solo', 'Missions solo'], ['deuil', 'Deuil'],
    ['marche', 'Marché'], ['taverne', 'Taverne'], ['chantier', 'Chantier'], ['soir', 'Soir'], ['voie', 'Voie'], ['village', 'Village'], ['presage', 'Présage'],
    ['derby', 'Derby'], ['bilan', 'Bilan de saison']];
  const UNTRIMMED = { expedition: 1, menace: 1, raid: 1, deuil: 1, village: 1, presage: 1, derby: 1, bilan: 1 };   // sections jamais rognées par le budget de lignes
  function say(ctx, phase, text) { if (text) ctx.sections[phase].lines.push(text); }
  function moment(ctx, score, text) { ctx.moments.push({ score: score, text: text, seq: ctx.moments.length }); }
  function tpl(ctx, kind, salt, vars) { return pickTpl(ctx.D, kind, ctx.state.day + '|' + salt, vars); }
  function managerName(state, id) { const m = managerOf(state, id); return m ? m.name : id; }

  function makeCtx(D, state) {
    const ctx = { D: D, state: state, rng: makeRng(fnvU32(state.seed ^ state.day)), sections: {}, moments: [], plans: {},
      votes_quest: {}, votes_build: {}, queued: { craft: [], buy: [], sell: [], recruit: [], raid: {} }, effective: {}, forced: {},
      notices: [], log: [], expedition: null, exp_result: null, quest: null, xp: {}, build_vote: null, threat: null, raid: null,
      deaths: [], solo_results: [], legendary: [],
      summary: { gold_delta: 0, injuries: [], injury_ids: [], level_ups: [], level_up_ids: [], recruits: [], construction: '', construction_id: null, village_age_up: null, presage: null, threat_outcome: null, deaths: [], legendary: [], solo_results: [], hybrids: [], specs: [] }, gold_start: 0 };
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
      applyOrQueue(ctx, a, r.i);
    }
    resolveVotes(ctx);
    resolveEffective(ctx);
  }
  function applyOrQueue(ctx, a, rank) {
    const state = ctx.state, D = ctx.D, p = a.payload;
    switch (a.type) {
      case 'assign': ctx.plans[p.adventurer_id] = { slots: slotsOfAssign(D, state, state.heroes[p.adventurer_id], p.activity, p.target || null), manager: a.manager_id }; break;
      case 'plan': ctx.plans[p.adventurer_id] = { slots: p.slots.map(s => ({ activity: s.activity, target: s.target || null })), manager: a.manager_id }; break;
      case 'vote_quest': ctx.votes_quest[a.manager_id] = p.quest_id; break;
      case 'vote_build': ctx.votes_build[a.manager_id] = p.building_id; break;
      case 'craft_order': ctx.queued.craft.push(a); break;
      case 'buy': ctx.queued.buy.push(a); break;
      case 'sell': ctx.queued.sell.push(a); break;
      case 'recruit': ctx.queued.recruit.push(a); break;
      case 'raid_pass': ctx.queued.raid[p.adventurer_id] = { manager: a.manager_id, actions: p.actions.slice(), rank: typeof rank === 'number' ? rank : 0 }; break;   // V5 : le dernier passage reçu gagne ; `rank` = rang de réception (V5 T2b, §B1)
      case 'choose_hybrid': { const h = state.heroes[p.adventurer_id], H = hybridById(D, p.hybrid_id); if (h && H && !h.hybrid) applyHybrid(ctx, h, H, 'choice'); break; }   // V5 T2
      case 'choose_spec': { const h = state.heroes[p.adventurer_id], S = specById(D, p.spec_id); if (h && S && !h.spec && S.hybrid === h.hybrid) applySpec(ctx, h, S, 'choice'); break; }   // V5 T3
      case 'respec': { const h = state.heroes[p.adventurer_id], S = specById(D, p.spec_id); if (h && S && h.spec && S.hybrid === h.hybrid && !respecWhy(D, state, h, p.spec_id)) applyRespec(ctx, h, S); break; }   // V5 T3 §6.4
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
  // Activité effective V4 : liste de créneaux (vide = repos) ; activity = créneau principal (compatibilité des phases).
  function effectiveOf(slots) {
    const main = slots.length ? slots[0].activity : 'rest';
    return { activity: main, target: slots.length ? slots[0].target : null, slots: slots };
  }
  function resolveEffective(ctx) {
    const state = ctx.state;
    for (const h of allHeroes(state)) {
      const plan = ctx.plans[h.id];
      let slots = plan ? plan.slots.slice() : [];
      if (h.fatigue >= 100 && slots.length) { slots = []; ctx.forced[h.id] = 'épuisé'; }
      if (h.injury.severity >= 1 && slots.some(s => s.activity !== 'craft')) { slots = slots.filter(s => s.activity === 'craft'); ctx.forced[h.id] = 'blessé'; }
      ctx.effective[h.id] = effectiveOf(slots);
    }
  }
  function demoteToRest(ctx, h, why) { ctx.effective[h.id] = effectiveOf([]); ctx.forced[h.id] = why; }

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

  // ---- Phases 3-5 (V4) : récolte, entraînement et forge « par créneau », dans l'ordre des créneaux du héros, héros triés par id.
  // Rendement d'un créneau = rendement journalier V3 / slot_divisor (entier, min 1). Une ligne de chronique par héros et par activité.
  const SLOT_DIV = 3;
  function slotDiv(D) { return D.C.slot_divisor || SLOT_DIV; }
  function gatherSlot(ctx, h, slot, acc) {
    const state = ctx.state, D = ctx.D;
    const res = D.resources[slot.target] || D.resources.wood;
    const biome = D.biomes[res.biome];
    const units = Math.max(1, div(div(gatherPower(D, state, h, biome.id), 10), slotDiv(D)));
    const share = (biome.gather_split.filter(s => s[0] === res.id)[0] || [res.id, 100])[1];
    const qty = Math.max(1, div(units * share, 100));
    const inv = state.inventories[h.owner].resources;
    inv[res.id] += qty;
    const key = 'gather|' + res.id;
    const a = acc[key] = acc[key] || { kind: 'gather', res: res, biome: biome, qty: 0, extra: 0 };
    a.qty += qty;
    if (share < 100) { const extra = div(units, 2); if (extra > 0) { inv[biome.primary] += extra; a.extra += extra; } }
    addCraftXp(ctx, h, 'herboristerie', D.C.craft_xp.gather);
    return rollAccident(ctx, h, 'gather', biome.name);
  }
  function trainSlotRun(ctx, h, slot, acc) {
    const state = ctx.state, D = ctx.D;
    const attr = D.attrs.indexOf(slot.target) >= 0 ? slot.target : D.classes[h.class_id].primary;
    const cls = D.classes[h.class_id];
    let tp = D.C.tp_base[bLevel(D, state, 'training_ground')];
    if (attr === cls.primary) tp = pct(tp, 120);
    if (attr === cls.dump) tp = pct(tp, 80);
    if (hasTrait(h, 'diligent')) tp = pct(tp, 125);
    if (hasTrait(h, 'lazy')) tp = pct(tp, 70);
    if (h.age_seasons < 6) tp = pct(tp, 120);
    if (h.age_seasons >= 12) tp = pct(tp, 50);
    if (hasTrait(h, 'hothead')) tp += 2;
    tp = Math.max(1, div(tp, slotDiv(D)));
    h.train_points[attr] = (h.train_points[attr] || 0) + tp;
    const key = 'train|' + attr;
    const a = acc[key] = acc[key] || { kind: 'train', attr: attr, tp: 0, gains: 0 };
    a.tp += tp;
    while (h.trained[attr] < D.C.trained_max && h.train_points[attr] >= D.C.tp_threshold_base + D.C.tp_threshold_step * h.trained[attr]) {
      h.train_points[attr] -= D.C.tp_threshold_base + D.C.tp_threshold_step * h.trained[attr];
      h.trained[attr] += 1;
      a.gains += 1;
      say(ctx, 'entrainement', tpl(ctx, 'train_gain', h.id + attr, { a: heroName(h), attr: D.attr_names[attr].name, n: attrEff(D, h, attr) }));
      moment(ctx, 30, heroName(h) + ' gagne un point de ' + D.attr_names[attr].name.toLowerCase() + ' à l\'entraînement.');
    }
    addXp(ctx, h, Math.max(1, div(10 + 5 * bLevel(D, state, 'training_ground'), slotDiv(D))));
    addCraftXp(ctx, h, (D.C.craft_by_attribute || {})[attr] || 'endurance', D.C.craft_xp.train);
    return rollAccident(ctx, h, 'train', 'au terrain d\'entraînement');
  }
  function craftSlotRun(ctx, h, slot, acc, work) {
    const state = ctx.state, D = ctx.D;
    const job = state.forge_queue.filter(q => q.owner === h.owner)[0];
    const key = 'craft|' + (job ? job.uid : 'idle');
    const a = acc[key] = acc[key] || { kind: 'craft', job: job, work: 0 };
    if (!job) return false;
    let p = craftPower(D, state, h);
    if (D.classes[h.class_id].craft_specialty === D.recipes[job.recipe_id].category) p = pct(p, 120);
    p = Math.max(1, div(p, slotDiv(D)));
    work[job.uid] = (work[job.uid] || 0) + p;
    a.work += p;
    addXp(ctx, h, Math.max(1, div(5, slotDiv(D))));
    addCraftXp(ctx, h, 'forge', D.C.craft_xp.craft);
    return rollAccident(ctx, h, 'craft', 'à la forge');
  }
  function sayAccumulated(ctx, h, acc) {
    const D = ctx.D;
    for (const key of sortedKeys(acc)) {
      const a = acc[key];
      if (a.kind === 'gather') say(ctx, 'recolte', tpl(ctx, 'gather', h.id, { a: heroName(h), n: a.qty, r: a.res.name.toLowerCase() + (a.extra ? ' (+' + a.extra + ' ' + D.resources[a.biome.primary].name.toLowerCase() + ')' : ''), place: a.biome.name }));
      else if (a.kind === 'train') say(ctx, 'entrainement', tpl(ctx, 'train', h.id, { a: heroName(h), prog: deWord(D.attr_names[a.attr].name.toLowerCase()), tp: a.tp }));
      else if (a.kind === 'craft') { if (a.job) say(ctx, 'forge', tpl(ctx, 'craft', h.id, { a: heroName(h), work: a.work, recipe: D.recipes[a.job.recipe_id].name.toLowerCase() })); else say(ctx, 'forge', tpl(ctx, 'craft_idle', h.id, { a: heroName(h) })); }
    }
  }
  function phaseSlots(ctx) {
    const state = ctx.state, D = ctx.D;
    forgeOrders(ctx);
    const work = {};
    for (const h of allHeroes(state)) {
      const e = ctx.effective[h.id];
      const acc = {};
      let hurt = false;
      for (const slot of e.slots) {
        if (hurt) break;                                       // blessé en cours de journée : les créneaux restants sautent
        if (slot.activity === 'gather') hurt = gatherSlot(ctx, h, slot, acc);
        else if (slot.activity === 'train') hurt = trainSlotRun(ctx, h, slot, acc);
        else if (slot.activity === 'craft') hurt = craftSlotRun(ctx, h, slot, acc, work);
      }
      sayAccumulated(ctx, h, acc);
    }
    forgeAdvance(ctx, work);
  }
  // Accident d'activité : chance journalière V3 divisée par le nombre de créneaux (entier, min 1). true = blessé.
  function rollAccident(ctx, h, activity, place) {
    const D = ctx.D;
    let p = D.C.accident_permille[activity];
    if (h.fatigue >= 80) p *= 2;
    if (attrEff(D, h, 'luck') >= 30) p -= 5;
    p = Math.max(1, div(p, slotDiv(D)));
    if (!ctx.rng.chance(p)) return false;
    const days = injure(ctx, h, 1);
    say(ctx, activity === 'gather' ? 'recolte' : activity === 'train' ? 'entrainement' : 'forge', tpl(ctx, 'gather_accident', h.id, gv(h, { a: heroName(h), place: place })));
    moment(ctx, 40, heroName(h) + ' se blesse bêtement (' + days + ' j) — ' + place + '.');
    return true;
  }
  // XP de savoir-faire (V4) : montée de niveau signalée dans la section du soir.
  function addCraftXp(ctx, h, craftId, amount) {
    const D = ctx.D;
    if (!D.crafts[craftId] || !amount) return;
    if (!h.crafts) h.crafts = emptyCrafts(D);
    const before = craftLevel(D, craftXp(h, craftId));
    h.crafts[craftId] = (h.crafts[craftId] || 0) + amount;
    const after = craftLevel(D, h.crafts[craftId]);
    if (after > before) { say(ctx, 'soir', tpl(ctx, 'craft_level_up', h.id + craftId, { a: heroName(h), craft: D.crafts[craftId].name.toLowerCase(), n: after })); moment(ctx, 28 + after, heroName(h) + ' passe maître niveau ' + after + ' en ' + D.crafts[craftId].name.toLowerCase() + '.'); }
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
    ctx.summary.injury_ids.push(h.id);   // V5 T2b (§B8) : identifiant, pour que la page n'ait plus à reconnaître un préfixe de texte français
    return days;
  }

  function addXp(ctx, h, amount) { ctx.xp[h.id] = (ctx.xp[h.id] || 0) + Math.max(0, amount); }

  // ---- Phase 5 : forge (commandes au matin, avancement et livraison après les créneaux) ----
  function forgeOrders(ctx) {
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
  }
  function forgeAdvance(ctx, work) {
    const state = ctx.state, D = ctx.D;
    const base = D.C.forge_work_per_day[bLevel(D, state, 'forge')];
    if (state.forge_queue.length) work[state.forge_queue[0].uid] = (work[state.forge_queue[0].uid] || 0) + base;
    const remaining = [];
    for (const job of state.forge_queue) {
      job.work_left -= (work[job.uid] || 0);
      if (job.work_left > 0) { remaining.push(job); continue; }
      const itemId = D.recipes[job.recipe_id].result;
      giveItem(D, state, job.owner, itemId);
      say(ctx, 'forge', tpl(ctx, 'craft_done', job.uid, { item: D.items[itemId].name, owner: managerName(state, job.owner) }));
      const rar = D.items[itemId].rarity;
      if (rar === 'legendary') ctx.summary.legendary.push(D.items[itemId].name);
      moment(ctx, rar === 'legendary' ? 88 : rar === 'epic' ? 60 : 25, 'La forge livre ' + D.items[itemId].name.toLowerCase() + (rar === 'legendary' ? ' (légendaire !)' : rar === 'epic' ? ' (épique)' : '') + ' à ' + managerName(state, job.owner) + '.');
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
  function roomLog(exp, text) { if (exp.room && exp.room.lines.length < 14 && text) exp.room.lines.push(text.charAt(0).toUpperCase() + text.slice(1)); }
  function conscious(exp) { return exp.party.filter(f => !f.ko && !f.deserted); }
  function managersIn(exp) { const m = {}; for (const f of exp.party) if (!f.deserted) m[f.owner] = 1; return sortedKeys(m); }

  // Composition du groupe : refus de moral (TIRAGE), tour de table par manager, bornes du type de quête.
  function buildParty(ctx) {
    const state = ctx.state, D = ctx.D;
    const cands = allHeroes(state).filter(h => ctx.effective[h.id].activity === 'expedition');
    const quest = ctx.quest;
    const demote = (h, why) => demoteToRest(ctx, h, why);
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
    // V5 T5 (bug trouvé en chemin) : un événement a besoin de quelqu'un pour le vivre. Quand toute l'escouade est
    // à terre ou a déserté, `conscious` est vide et six branches lisaient `c[0]` ou le premier d'un tri vide :
    // « heroic_feat » posait `best.feat_crit` sur `undefined` et le moteur JETAIT au milieu d'une journée
    // (TypeError, expédition perdue, état corrompu). Trouvé en balayant 2 500 graines à la recherche d'une chute
    // de guilde. Sans escouade debout, l'événement n'a simplement pas lieu.
    if (!c.length) return;
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
  function bossLike(m) { return !!(m.boss || m.dragon); }

  function runCombat(ctx, exp, monsters, opts, rng) {
    const cb = { exp: exp, monsters: monsters, round: 0, ko_this: 0, shield: 0, retreat_at: 2, first: !!opts.first,
      no_retreat: !!opts.no_retreat, max_rounds: opts.max_rounds || ctx.D.C.combat_round_cap, flee_hp_pct: opts.flee_hp_pct || 0, flee_permille: opts.flee_permille || 1000, wall: !!opts.wall };
    exp.last_ko = 0;
    if (!opts.silent_start) roomLog(exp, 'Surgissent ' + joinFr(monsters.map(m => m.name.toLowerCase())) + ' !');
    for (const f of conscious(exp)) { f.init = f.spd * 100 + rng.roll(100); f.cooldowns = {}; f.status.entangled = 0; }
    for (const m of monsters) m.init = m.spd * 100 + rng.roll(100);
    const order = conscious(exp).map(f => ({ adv: f })).concat(monsters.map(m => ({ mon: m })));
    order.sort((a, b) => { const ia = a.adv ? a.adv.init : a.mon.init, ib = b.adv ? b.adv.init : b.mon.init; if (ib !== ia) return ib - ia; if (!!a.adv !== !!b.adv) return a.adv ? -1 : 1; return (a.adv || a.mon).slot - (b.adv || b.mon).slot; });
    let result = null;
    while (!result) {
      cb.round++;
      exp.counters.rounds_total++;
      if (cb.round > cb.max_rounds) { result = 'stalemate'; break; }
      // Fuite (menace) : sous flee_hp_pct % de PV, le dragon tente de partir à chaque tour (TIRAGE flee_permille).
      if (cb.flee_hp_pct > 0 && activeMonsters(cb).filter(m => m.dragon).every(m => m.hp * 100 <= m.hp_max * cb.flee_hp_pct) && rng.chance(cb.flee_permille)) { result = 'fled'; break; }
      if (cb.round >= 2 && !cb.no_retreat && shouldRetreat(exp)) { result = attemptRetreat(ctx, cb, rng); if (result) break; }
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
    if (cb.monsters.some(m => m.dragon) && !cb.monsters.some(m => m.dragon && m.alive)) return 'victory';   // le dragon tombé, ses rejetons se dispersent
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
      else if (x.special === 'regen' || (bossLike(x) && x.mechanic === 'roots')) x.hp = Math.min(x.hp_max, x.hp + pct(x.hp_max, bossLike(x) ? (x.dragon ? 5 : 8) : 5));
      if (bossLike(x) && x.mechanic === 'heads' && x.heads < 3 && x.fire_round !== cb.round - 1) { x.heads = Math.min(3, x.heads + 1); x.hp = Math.min(x.hp_max, x.hp + pct(x.hp_max, x.siege ? 15 : 10)); roomLog(exp, 'Une tête repousse…'); }
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

  const SKILL_PRIORITY = ['last_breath', 'healing_prayer', 'bulwark', 'storm', 'volley', 'swarm', 'frost_hold', 'sunder_strike', 'sacrifice', 'shadow_strike', 'fire_bolt'];
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
        case 'war_chant': if (ms.length >= 2) return id; break;                       // V5 T6 (D8) : le Barde frappe la salle
        case 'encouragement': if (cb.round === 1 && conscious(exp).length >= 2) return id; break;
        case 'final_verse': if (conscious(exp).some(x => x.hp * 2 < x.hp_max)) return id; break;
        case 'swarm': if (ms.length >= 2) return id; break;                          // Invocateur (V5) : nuée sur tous les ennemis
        case 'frost_hold': if (ms.some(m => m.boss) || ms.length >= 2) return id; break;
        case 'shadow_strike': if (cb.round === 1) return id; break;
        case 'sunder_strike': case 'fire_bolt': case 'sacrifice': return id;
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
    // V5 T6 (D8) : les deux appuis du Barde. Tous deux modifient l'état du groupe, aucun n'est décoratif.
    if (skill === 'encouragement') { for (const c2 of conscious(exp)) { c2.atk_pct_mod += sk.value; c2.morale = clamp(c2.morale + 3, 0, 100); } f.cooldowns[skill] = sk.cooldown; roomLog(exp, f.name + ' entonne un encouragement : le groupe frappe plus fort.'); return; }
    if (skill === 'final_verse') { for (const c2 of conscious(exp)) { c2.feat_crit += sk.value; c2.morale = clamp(c2.morale + 10, 0, 100); } f.used_once[skill] = 1; roomLog(exp, f.name + ' lance le dernier couplet : le groupe reprend cœur.'); return; }
    if (skill === 'frost_hold') { const t = enemyHighestAtk(cb); f.cooldowns[skill] = sk.cooldown; if (!t.boss || rng.chance(500)) { t.status.entangled = 1; roomLog(exp, f.name + ' fige ' + t.name + ' dans le givre.'); } else roomLog(exp, t.name + ' secoue le givre de ' + f.name + '.'); return; }
    let targets, power = 100, tags = { magic: f.magic === 1, fire: f.fire === 1, ignore_half: false, stealth: false };
    if (skill === 'storm' || skill === 'volley' || skill === 'swarm' || skill === 'war_chant') { targets = activeMonsters(cb); power = sk.value; }
    else if (skill === 'sunder_strike') { targets = [enemyHighestAtk(cb)]; power = 150; tags.ignore_half = true; }
    else if (skill === 'sacrifice') { targets = [enemyHighestAtk(cb)]; power = sk.value; }
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
    const rule = bossLike(m) && m.mechanic === 'heads' ? 'weakest' : m.target_rule;
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
    if (m.boss || m.dragon) { if (bossTurn(ctx, cb, m, rng)) return; }
    if (m.special === 'crush' && cb.round % 2 === 1) { roomLog(exp, m.name + ' lève sa massue, lentement.'); return; }
    if (m.special === 'screech' && cb.round === 1) { for (const f of conscious(exp)) f.morale = clamp(f.morale - 8, 0, 100); roomLog(exp, m.name + ' pousse un cri qui glace le sang.'); return; }
    if (exp.quest.type === 'escort' && rng.chance(300)) { const dmg = Math.max(1, div(m.atk * m.atk, m.atk + 6 + exp.L)); exp.counters.caravan_hp -= dmg; roomLog(exp, m.name + ' s\'en prend à la caravane : ' + dmg + ' dégâts.'); return; }
    const times = bossLike(m) && m.mechanic === 'heads' ? m.heads : 1;
    for (let i = 0; i < times; i++) {
      const t = monsterTarget(cb, m, rng);
      if (!t) return;
      applyDamage(ctx, cb, m, t, m.special === 'crush' ? 180 : 100, { magic: m.special === 'spectral', fire: false, ignore_half: false, stealth: false }, rng);
    }
  }
  // Mécanismes de boss (un par biome). true = le tour est consommé.
  function bossTurn(ctx, cb, m, rng) {
    const exp = cb.exp, c = conscious(exp);
    if (m.dragon && m.breath_every > 0 && cb.round % m.breath_every === 0) {   // souffle de zone du dragon (moitié derrière une muraille ou pour les plus rapides)
      roomLog(exp, m.breath_label || tpl(ctx, 'threat_breath', 'b' + cb.round, {}));
      if (cb.wall) roomLog(exp, tpl(ctx, 'threat_wall', 'w' + cb.round, {}));
      for (const f of c) applyDamage(ctx, cb, m, f, m.breath_power, { magic: true, fire: false, ignore_half: false, stealth: false, breath: true }, rng);
      return true;
    }
    if (m.mechanic === 'roots') {
      if (!m.awakened && m.hp * 2 < m.hp_max) { m.awakened = true; const n = cb.monsters.length; for (let i = 0; i < 2 && cb.monsters.length < 5; i++) cb.monsters.push(instantiateMonster(ctx.D, 'corrupted_sylvan', Math.max(1, exp.L - 2), n + i, false)); roomLog(exp, (m.dragon ? m.name : 'Le Sylvain') + ' s\'éveille : deux sylvains corrompus sortent de l\'écorce.'); }
      if (cb.round % (m.siege ? 2 : 3) === 0) { const t = c.slice().sort((a, b) => b.atk - a.atk || a.slot - b.slot)[0]; t.status.entangled = 1; roomLog(exp, 'Les racines du Sylvain enserrent ' + t.name + '.'); return true; }
    } else if (m.mechanic === 'breath') {
      const cyc = m.siege ? 2 : 3, ph = cb.round % cyc;
      if (ph === 1) { roomLog(exp, (m.dragon ? m.name : 'Le Drake') + ' gonfle ses poumons…'); return true; }
      if (ph === (m.siege ? 0 : 2)) {
        roomLog(exp, m.dragon ? m.breath_label : 'Une nappe de cendres brûlantes !');
        if (m.dragon && cb.wall) roomLog(exp, tpl(ctx, 'threat_wall', 'w' + cb.round, {}));
        for (const f of c) applyDamage(ctx, cb, m, f, m.dragon ? m.breath_power : 120, { magic: true, fire: false, ignore_half: false, stealth: false, breath: true }, rng);
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
    const hit = clamp(850 + (src.spd - tgt.spd) * 15, 600, 950) - evasion + (srcAdv ? (src.hit_bonus || 0) : 0);
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
    if (tgt.special === 'stoneskin' || tgt.crit_immune || (bossLike(tgt) && tgt.mechanic === 'breath' && tgt.hp * 2 > tgt.hp_max)) critP = 0;
    let crit = false;
    if (critP > 0 && rng.chance(critP)) { dmg = pct(dmg, 150); crit = true; }
    if (tgt.special === 'spectral' && !tags.magic) dmg = div(dmg, 2);
    if (tags.breath && (tgt.spd >= src.spd + 2 || cb.shield || cb.wall)) dmg = div(dmg, 2);
    if (tgtAdv && tgt.priority >= 100) dmg = pct(dmg, 90);
    if (tgtAdv && tgt.presence) dmg = pct(dmg, 90);        // Invocateur (V5) : Présence
    if (tgtAdv && cb.shield) dmg = pct(dmg, 75);
    dmg = Math.max(1, dmg);
    tgt.hp -= dmg;
    if (srcAdv) src.damage += dmg;
    if (crit) roomLog(exp, 'Coup critique ! ' + src.name + ' déchire ' + tgt.name + ' : ' + dmg + ' dégâts.');
    else if (tgtAdv) roomLog(exp, src.name + ' ' + src.verb + ' ' + tgt.name + ' : ' + dmg + ' dégâts.');
    else if (tgt.boss || tgt.dragon || dmg * 3 >= tgt.hp_max) roomLog(exp, src.name + ' frappe ' + tgt.name + ' : ' + dmg + ' dégâts.');
    if (crit && tgt.boss) moment(ctx, 55, src.name + ' porte un coup critique à ' + tgt.name + ' (' + dmg + ' dégâts).');
    onHit(ctx, cb, src, tgt, dmg, tags);
    if (tgt.hp <= 0) { if (tgtAdv) knockOut(ctx, exp, tgt); else monsterDown(ctx, cb, tgt, src, rng); }
  }
  function onHit(ctx, cb, src, tgt, dmg, tags) {
    const exp = cb.exp;
    if (src.alive === undefined) {          // aventurier → monstre
      if (tags.fire) { tgt.status.burned = 1; tgt.fire_round = cb.round; }
      if (bossLike(tgt) && tgt.mechanic === 'heads') { tgt.head_dmg += dmg; if (tgt.head_dmg * 4 >= tgt.hp_max && tgt.heads > 1) { tgt.heads--; tgt.head_dmg = 0; roomLog(exp, 'Une tête de l\'Hydre roule au sol !'); } }
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
    if (f.guard) { roomLog(exp, tpl(ctx, 'threat_guard_falls', f.id, { a: f.name })); return; }
    roomLog(exp, f.name + ' tombe, hors de combat !');
    moment(ctx, 60, f.name + ' est tombé au combat dans ' + exp.biome.name + '.');
  }
  function monsterDown(ctx, cb, m, killer, rng) {
    const exp = cb.exp;
    if (!m.alive) return;
    if (m.special === 'tenacious' && !m.used) { m.used = true; m.hp = 1; roomLog(exp, m.name + ' se relève, tenace.'); return; }
    m.alive = false; m.hp = 0;
    exp.counters.kills++;
    if (killer && killer.alive === undefined) { killer.kills++; exp.last_killer = killer.name; }
    if (m.dragon) return;                   // butin et instant du jour gérés par la phase menace
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
      if (f.xp_pct) xp = pct(xp, 100 + f.xp_pct);
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
        f.grave = h.injury.severity >= 2;            // parti déjà gravement blessé (sévérité ≥ 2) et tombé à 0 PV → tirage de mort
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
      if (!h.companions) h.companions = {};                                    // V5 T2 : une expédition menée avec un héros de classe C compte pour l'affinité
      for (const x of exp.party) { const c = state.heroes[x.id]; if (c && x.id !== f.id) h.companions[c.class_id] = (h.companions[c.class_id] || 0) + 1; }
      if (!f.deserted) { addCraftXp(ctx, h, 'endurance', D.C.craft_xp.expedition_endurance); addCraftXp(ctx, h, (D.C.craft_by_class || {})[h.class_id] || 'endurance', D.C.craft_xp.expedition_class); }
    }
    // Mort possible (V4) : parti en expédition avec une blessure grave (sévérité ≥ 2) et tombé à 0 PV — TIRAGE death_permille.wounded.
    // (La validation V4 refuse ce départ : ce chemin n'est atteignable que si la règle « blessé = repos ou forge » est levée.)
    for (const f of exp.party) {
      if (!f.grave) continue;
      const h = state.heroes[f.id];
      if (h) rollDeath(ctx, h, 'wounded', 'de ses blessures après « ' + exp.quest.name + ' »');
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
    // Maîtrise de biome (V4) : +1 par quête réussie, +2 si le boss du donjon est vaincu.
    if (state.biome_mastery && state.biome_mastery[quest.biome] !== undefined) {
      let gain = exp.outcome === 'success' ? (D.C.mastery_success || 1) : 0;
      if (exp.counters.boss_killed) gain += D.C.mastery_boss_bonus || 2;
      if (gain) { state.biome_mastery[quest.biome] += gain; say(ctx, 'expedition', 'Maîtrise ' + biomeDe(D, quest.biome) + ' : ' + state.biome_mastery[quest.biome] + ' (+' + gain + ').'); }
    }
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
    ctx.expedition = { quest_name: quest.name, biome_name: D.biomes[quest.biome].name, participants: fighters.map(f => f.name), participant_ids: fighters.map(f => f.id), outcome: outcomeVm(exp.outcome),
      rooms: exp.rooms.map(r => ({ name: r.name, lines: r.lines })), loot: loot, xp: xpTotal };
    ctx.summary.gold_delta += rw.gold;
  }

  // ===================================================================================
  // 10b. MENACE — phase 7b : le dragon attaque le village (défenseurs = héros « defend » + gardes de l'âge)
  // ===================================================================================
  function guardHero(D, state, i, level) {
    const names = D.raw.first_names_m;
    return { id: 'guard_' + pad2(i), owner: 'village', first_name: 'Garde', epithet: names[(i * 7 + state.day) % names.length], gender: 'm',
      class_id: 'warrior', rarity: 'common', level: level, xp: 0, bonus_attrs: emptyAttrs(D), trained: emptyAttrs(D), train_points: {},
      form: 50, fatigue: 0, morale: 60, injury: { severity: 0, days_left: 0 }, scars: 0, age_seasons: 8, traits: [], wage: 0, unpaid_days: 0,
      equipment: { weapon: null, armor: null, trinket: null, potion: null }, history: { expeditions: 0, victories: 0, injuries: 0, level_ups: 0 }, last_activity: 'rest', last_team: [], crafts: {},
      hybrid: null, hybrid_day: null, hybrid_offer_day: null, hybrid_bonus: 0, companions: {},
      spec: null, spec_day: null, spec_offer_day: null, respec_used: 0, respec_day: null };
  }
  function makeDragon(D, T, DR, day) {
    return { id: DR.id, biome: DR.biome, name: dragonVars(DR).threat_le, verb: DR.verb, level: 1 + div(day, 2), slot: 0, boss: false, dragon: true, mechanic: DR.mechanic, elite: false, siege: false,
      hp_max: DR.hp_base + DR.hp_per_day * day, atk: DR.atk_base + DR.atk_per_day * day, def: DR.def_base + DR.def_per_day * day, spd: DR.spd,
      crit: 0, evasion: 0, target_rule: DR.mechanic === 'heads' ? 'weakest' : 'strongest', special: 'dragon', xp: 0, crit_immune: true,
      breath_every: DR.breath_every || 0, breath_power: DR.breath_power || T.breath_power || 100, breath_label: DR.breath_label || '',
      alive: true, fled: false, status: { poison: 0, poison_l: 0, burned: 0, entangled: 0 }, used: false, stolen: 0, loot: [],
      heads: 3, head_dmg: 0, fire_round: -1, awakened: false, hp: 0 };
  }
  function defenseArena(D, fighters, day) {
    return { quest: { id: 'threat_' + pad2(day), type: 'defense', difficulty: 1 + div(day, 5), target_monster_id: null, name: 'Défense du village' }, type: { objective: 'defense', boss: 'none', rooms_per_floor: 1 },
      biome: { id: 'village', name: 'la défense du village', boss: null, outdoor: true }, d: null, L: 1 + div(day, 3), floors: 1, day: day,
      party: fighters, bag: { gold: 0, resources: {}, items: [], item_rolls_bonus: 0, rarity_bonus: 0 }, xp_pool: 0,
      counters: { rooms_total: 1, rooms_visited: 0, rooms_cleared: 0, floors_cleared: 0, kills: 0, kills_target: 0, harvest_done: 0, harvest_total: 0, ko_count: 0, rounds_total: 0, deserters: 0, boss_killed: false, caravan_hp: 0 },
      flags: { cursed: false, nest: false, storm: false, skip_next: false, feat: null }, rooms: [], room: { name: 'Place du village', lines: [] }, outcome: null, events_floor: 0, lines: [], last_combat: null, last_ko: 0, last_killer: null };
  }
  // Ravage : un bâtiment perd un niveau. Le hall ne tombe à 0 que s'il est le seul bâtiment ≥ 1 ou s'il a déjà brûlé une fois (second ravage).
  function ravageBuilding(ctx) {
    const state = ctx.state, D = ctx.D;
    const others = D.raw.buildings.map(b => b.id).filter(id => id !== 'hall' && bLevel(D, state, id) >= 1);
    const hallLv = bLevel(D, state, 'hall');
    const cands = others.slice();
    if (hallLv >= 1) cands.push('hall');
    cands.sort();
    if (!cands.length) return null;
    const id = cands[ctx.rng.roll(cands.length)];
    if (id === 'hall') state.hall_hits = (state.hall_hits || 0) + 1;
    // V5 T5 (règle morte, corrigée) : le hall encaisse le PREMIER incendie sans perdre son niveau tant qu'un autre
    // bâtiment tient debout ; c'est le SECOND qui le jette à terre — c'est ce que dit le commentaire ci-dessus.
    // L'ancienne condition excluait le hall de la liste des cibles tant que `hall_hits` valait 0 ET qu'il était au
    // niveau 1 : or les plans par défaut ne montent jamais le hall au niveau 2 (le vote de chantier prend toujours
    // le bâtiment finançable le moins cher — mesuré : 300 saisons, hall au niveau 1 partout), donc `hall_hits` ne
    // pouvait jamais passer à 1 et la chute de la guilde était hors d'atteinte (0 chute sur 2 500 graines).
    if (id === 'hall' && hallLv === 1 && state.hall_hits < 2 && others.length) return 'hall';
    state.buildings[id] -= 1;
    if (state.construction && state.construction.building_id === id) state.construction.to_level = state.buildings[id] + 1;
    return id;
  }
  // Mort d'un héros (V4) : retiré de l'effectif, tombe, équipement au coffre de guilde, héritier à la taverne (phase 9 du même jour → visible le lendemain).
  function killHero(ctx, h, cause) {
    const state = ctx.state, D = ctx.D;
    const inv = state.inventories[h.owner];
    for (const s of sortedKeys(h.equipment)) {
      const uid = h.equipment[s];
      if (!uid) continue;
      const it = inv.items.filter(x => x.uid === uid)[0];
      if (it) { state.guild_chest.push({ uid: it.uid, item_id: it.item_id, from: heroName(h) }); inv.items = inv.items.filter(x => x.uid !== uid); }
      h.equipment[s] = null;
    }
    state.graves.push({ hero_id: h.id, name: heroName(h), day: state.day, cause: cause });
    ctx.deaths.push({ owner: h.owner, hero_id: h.id, name: heroName(h), class_id: h.class_id, traits: h.traits.slice(), epithet: h.epithet, cause: cause });
    ctx.summary.deaths.push(heroName(h));
    state.stats.deaths += 1;
    delete state.heroes[h.id];
    say(ctx, 'deuil', tpl(ctx, 'death', h.id, gv(h, { a: heroName(h), cause: cause })));
    moment(ctx, 99, heroName(h) + ' est mort ' + cause + '. La guilde porte le deuil.');
  }
  // Tirage de mort (V4) après un KO : dragon (death_permille.dragon) ou blessure grave en expédition/solo (death_permille.wounded).
  function rollDeath(ctx, h, kind, cause) {
    const p = (ctx.D.C.death_permille || {})[kind] || 0;
    if (p > 0 && ctx.rng.chance(p)) { killHero(ctx, h, cause); return true; }
    return false;
  }
  // Chute de la guilde (V4) : hall au niveau 0 après un ravage. La saison s'arrête (resolveDay devient l'identité).
  function collapseGuild(ctx, reason) {
    const state = ctx.state, D = ctx.D;
    state.collapsed = { day: state.day, reason: reason };
    const lines = [tpl(ctx, 'collapse', 'c', {}), 'Jour ' + state.day + ' : ' + reason + '.',
      'Trésorerie de guilde : ' + state.guild.gold + ' or · prestige ' + state.guild.prestige + '.',
      'Expéditions : ' + state.stats.expeditions + ', dont ' + state.stats.successes + ' succès · dragons abattus : ' + state.stats.dragons_slain + ' · morts : ' + state.stats.deaths + '.'];
    for (const m of state.managers) lines.push(m.name + ' : ' + state.purses[m.id] + ' or, ' + heroesOf(state, m.id).length + ' aventurier(s) dispersé(s).');
    state.season_report = { title: 'Chute de la guilde — jour ' + state.day, lines: lines };
    for (const l of lines) say(ctx, 'bilan', l);
    moment(ctx, 100, 'La guilde est dispersée : ' + reason + '.');
  }
  function dragonVars(DR) {
    const art = DR.article || 'le', le = art + (art === 'l\'' ? '' : ' ') + DR.name, f = DR.gender === 'f';
    const cap = le.charAt(0).toUpperCase() + le.slice(1);
    return { threat: DR.name, threat_le: le, Threat_le: cap, dragon: DR.name, dragon_le: le, Dragon_le: cap, threat_de: (art === 'le' ? 'du ' : art === 'la' ? 'de la ' : 'de l\'') + DR.name, dragon_de: (art === 'le' ? 'du ' : art === 'la' ? 'de la ' : 'de l\'') + DR.name, e: f ? 'e' : '', il: f ? 'elle' : 'il' };
  }
  function biomeLe(D, id) { const b = D.biomes[id]; return (b.article || 'le') + ' ' + b.name; }
  function biomeDe(D, id) { const b = D.biomes[id]; return ((b.article || 'le') === 'la' ? 'de la ' : 'du ') + b.name; }
  function scheduleThreat(state, biome, dragonId, day) {
    state.threats.push({ type: 'dragon', biome: biome, dragon_id: dragonId, day: day, presage_day: day - 1, outcome: null });
  }
  function phaseThreat(ctx) {
    const state = ctx.state, D = ctx.D, T = D.threats && D.threats.dragon;
    const threat = threatToday(state);
    if (!threat || !T) return;
    const DR = D.dragons[threat.biome], dr = state.dragons[threat.biome];
    if (!DR || !dr) { threat.outcome = 'annulé'; return; }
    // V5 : le dragon doté d'une fiche de raid se joue sur la grille (phaseRaid) ; repli V4 si personne ne monte sur la grille le premier jour.
    if (raidActive(state) && state.raid.dragon_id === DR.id) {
      if (allHeroes(state).some(h => ctx.effective[h.id].activity === 'raid')) return;
      say(ctx, 'raid', tpl(ctx, 'raid_fallback', 'f', {}));
      state.raid = null;
    }
    const age = villageAge(D, state), day = state.day;
    const heroes = allHeroes(state).filter(h => ctx.effective[h.id].activity === 'defend');
    const roster = allHeroes(state);
    const avgLevel = Math.max(1, div(sum(roster.map(h => h.level)), Math.max(1, roster.length)));
    const fighters = heroes.map((h, i) => makeFighter(D, combatProfile(D, state, h), i));
    for (let i = 0; i < age.guards; i++) {
      const g = makeFighter(D, combatProfile(D, state, guardHero(D, state, i, avgLevel)), fighters.length);
      g.guard = true; g.skills = []; g.priority = 0; g.potion = null;
      g.hp_max = pct(g.hp_max, T.guard_hp_pct); g.hp = g.hp_max;
      fighters.push(g);
    }
    for (const f of fighters) { f.hp_max = pct(f.hp_max, 100 + age.defense); f.hp = f.hp_max; f.def = pct(f.def, 100 + age.defense); }
    const dragon = makeDragon(D, T, DR, day);
    dragon.hp = dragon.hp_max;
    const exp = defenseArena(D, fighters, day);
    const wall = state.village_age >= T.wall_age_min;
    const biomeName = D.biomes[threat.biome].name;
    const DV = dragonVars(DR);
    const vars = Object.assign({ biome: biomeName, biome_le: biomeLe(D, threat.biome), biome_de: biomeDe(D, threat.biome), n: fighters.length, guards: age.guards ? ', dont ' + age.guards + ' garde(s) du village' : '' }, DV);
    say(ctx, 'menace', tpl(ctx, 'threat_arrival', 'a', vars));
    let outcome;
    if (!fighters.length) {
      outcome = age.defense >= T.wall_alone_defense_min ? 'repoussé' : 'ravage';
      say(ctx, 'menace', tpl(ctx, outcome === 'ravage' ? 'threat_none' : 'threat_walls_hold', 'n', vars));
    } else {
      const r = runCombat(ctx, exp, [dragon], { first: false, no_retreat: true, max_rounds: T.max_rounds, flee_hp_pct: T.flee_hp_pct, flee_permille: T.flee_permille || 1000, wall: wall, silent_start: true }, ctx.rng);
      outcome = r === 'victory' ? 'vaincu' : r === 'wiped' ? 'ravage' : 'repoussé';
      for (const l of exp.room.lines.slice(0, 10)) say(ctx, 'menace', l);
      if (outcome === 'vaincu') say(ctx, 'menace', tpl(ctx, 'threat_decisive', 'd', Object.assign({ a: exp.last_killer || fighters[0].name }, vars)));
      else if (outcome === 'repoussé') say(ctx, 'menace', tpl(ctx, 'threat_flee', 'f', vars));
    }
    const best = fighters.filter(f => !f.guard).slice().sort((a, b) => b.damage - a.damage || a.slot - b.slot)[0] || null;
    const res = applyThreatOutcome(ctx, threat, outcome, { section: 'menace', best: best ? { name: best.name, owner: best.owner } : null, defenders: fighters.map(f => f.name), defender_ids: fighters.map(f => f.id), vars: vars });
    applyDefenseToHeroes(ctx, exp, outcome, T);
    // Mort possible : héros tombé à 0 PV face au dragon (TIRAGE death_permille.dragon).
    for (const f of exp.party) {
      if (f.guard || !f.was_ko) continue;
      const h = state.heroes[f.id];
      if (h) rollDeath(ctx, h, 'dragon', 'sous les griffes ' + DV.threat_de);
    }
    finalizeThreat(ctx, threat, outcome, res, 'menace');
  }
  // Issue d'une menace (V4, partagée avec le raid V5) : butin/légendaire/trophée du vaincu, retour du repoussé (+5 j) ou du ravage (+3 j),
  // bâtiment brûlé et caisse pillée. Renvoie {loot, buildingHit, legendaryName}. opts = {section, best:{name,owner}|null, defenders, vars}.
  function applyThreatOutcome(ctx, threat, outcome, opts) {
    const state = ctx.state, D = ctx.D, T = D.threats.dragon, day = state.day;
    const DR = D.dragons[threat.biome], dr = state.dragons[threat.biome], DV = dragonVars(DR), sec = opts.section;
    const vars = opts.vars || Object.assign({ biome: D.biomes[threat.biome].name, biome_le: biomeLe(D, threat.biome), biome_de: biomeDe(D, threat.biome), n: (opts.defenders || []).length, guards: '' }, DV);
    const loot = [];
    let buildingHit = null, legendaryName = null;
    if (outcome === 'vaincu') {
      dr.state = 'slain'; dr.slain_day = day; dr.next_day = null; dr.last_outcome = outcome;
      state.stats.dragons_slain += 1;
      const gold = T.gold_base + T.gold_per_day * day;
      state.guild.gold += gold; loot.push(gold + ' or → caisse de guilde');
      // Matériaux propres au dragon (4-8 au total, répartis entre ses deux matériaux), à l'entrepôt.
      // L'entrepôt leur fait de la place : le surplus de ressources ordinaires les moins chères est vendu (moitié du prix) ;
      // seuls des matériaux de dragon excédant la capacité totale seraient vendus.
      const total = ctx.rng.between(T.material_min, T.material_max);
      const first = ctx.rng.between(1, total - 1);
      const qtys = [first, total - first];
      let room = warehouseCap(D, state) - warehouseUsed(state) - total;
      if (room < 0) {
        const ordinary = D.raw.resources.filter(r => !r.dragon && (state.warehouse[r.id] || 0) > 0).sort((x, y) => x.sell - y.sell || (x.id < y.id ? -1 : 1));
        let cleared = 0;
        for (const r of ordinary) {
          if (room >= 0) break;
          const q = Math.min(state.warehouse[r.id], -room);
          state.warehouse[r.id] -= q; room += q; cleared += div(q * r.sell, 2);
          loot.push(q + ' ' + r.name.toLowerCase() + ' vendus pour faire de la place');
        }
        state.guild.gold += cleared;
      }
      DR.materials.forEach((rid, i) => {
        const res = D.resources[rid];
        if (!res) return;
        const free = Math.max(0, warehouseCap(D, state) - warehouseUsed(state)), q = Math.min(free, qtys[i]);
        state.warehouse[rid] = (state.warehouse[rid] || 0) + q;
        const sold = (qtys[i] - q) * res.sell;
        state.guild.gold += sold;
        loot.push(q + ' ' + res.name.toLowerCase() + ' → entrepôt' + (sold ? ' (' + sold + ' or de surplus vendu)' : ''));
      });
      state.guild.prestige += T.prestige_win;
      // Objet légendaire : un seul exemplaire par saison, au défenseur qui a fait le plus de dégâts (à défaut premier manager).
      const pool = DR.legendary_pool.filter(id => D.items[id] && state.legendary_given.indexOf(id) < 0).sort();
      const best = opts.best || null;
      const owner = best ? best.owner : state.managers[0].id;
      if (pool.length) {
        const itemId = pool[ctx.rng.roll(pool.length)];
        giveItem(D, state, owner, itemId); state.stats.items_found++;
        state.legendary_given.push(itemId);
        legendaryName = D.items[itemId].name;
        ctx.summary.legendary.push(legendaryName);
        loot.push(legendaryName + ' (légendaire) → ' + managerName(state, owner));
        say(ctx, sec, tpl(ctx, 'legendary_grant', 'l', { a: best ? best.name : managerName(state, owner), item: legendaryName, flavor: D.items[itemId].flavor || '' }));
      }
      state.trophies.push({ dragon_id: DR.id, day: day });
      say(ctx, sec, tpl(ctx, 'threat_victory', 'v', vars));
      say(ctx, sec, tpl(ctx, 'trophy', 't', DV));
      moment(ctx, 98, DV.Threat_le + ' est vaincu' + DV.e + (sec === 'raid' ? ' dans la clairière' : ' sous les murs du village') + ' par ' + joinFr(opts.defenders || []) + ' !');
    } else if (outcome === 'repoussé') {
      dr.state = 'repelled'; dr.last_outcome = outcome;
      const next = day + (D.C.dragon_return_repelled || 5);
      dr.next_day = next <= state.season_length ? next : null;
      if (dr.next_day) scheduleThreat(state, threat.biome, DR.id, next);
      state.guild.prestige += T.prestige_repel;
      say(ctx, sec, tpl(ctx, 'threat_repel', 'r', vars));
      moment(ctx, 70, DV.Threat_le + ' est repoussé' + DV.e + ' : le village tient, la muraille fume.');
    } else {
      dr.state = 'awake'; dr.last_outcome = outcome;
      const next = day + (D.C.dragon_return_ravage || 3);
      dr.next_day = next <= state.season_length ? next : null;
      if (dr.next_day) scheduleThreat(state, threat.biome, DR.id, next);
      buildingHit = ravageBuilding(ctx);
      const lost = pct(state.guild.gold, T.ravage_gold_pct);
      state.guild.gold -= lost;
      state.guild.prestige = Math.max(0, state.guild.prestige + T.prestige_ravage);
      if (buildingHit) say(ctx, sec, tpl(ctx, 'threat_burn', 'b', { b: D.buildings[buildingHit].name }));
      say(ctx, sec, tpl(ctx, 'threat_ravage', 'x', vars) + ' La caisse perd ' + lost + ' or.');
      moment(ctx, 96, 'Jour noir : ' + DV.threat_le + ' ravage le village' + (buildingHit ? ', ' + D.buildings[buildingHit].name + ' brûle' : '') + '.');
    }
    return { loot: loot, buildingHit: buildingHit, legendaryName: legendaryName, defenders: opts.defenders || [], defender_ids: opts.defender_ids || [] };
  }
  // Clôture d'une menace : issue inscrite, résumé, chronicle.threat, dépouilles, chute éventuelle de la guilde.
  function finalizeThreat(ctx, threat, outcome, res, sec) {
    const state = ctx.state, D = ctx.D, DR = D.dragons[threat.biome], DV = dragonVars(DR);
    threat.outcome = outcome;
    ctx.summary.threat_outcome = outcome;
    ctx.threat = { type: 'dragon', biome_id: threat.biome, biome_name: D.biomes[threat.biome].name, dragon_id: DR.id, dragon_name: DR.name, outcome: outcome, defenders: res.defenders, defender_ids: res.defender_ids, building_hit: res.buildingHit ? D.buildings[res.buildingHit].name : null, building_hit_id: res.buildingHit || null, loot: res.loot, legendary: res.legendaryName };
    if (res.loot.length) say(ctx, sec, 'Dépouilles : ' + res.loot.join(' · ') + '.');
    if (outcome === 'ravage' && bLevel(D, state, 'hall') <= 0) collapseGuild(ctx, 'la maison de guilde a brûlé sous les flammes ' + DV.threat_de);
  }
  // Report sur les héros défenseurs : fatigue/moral du combat, consommables, blessures des KO (comme après une expédition), XP.
  function applyDefenseToHeroes(ctx, exp, outcome, T) {
    const state = ctx.state, D = ctx.D, day = state.day;
    const xp = outcome === 'vaincu' ? T.xp_win_base + T.xp_win_per_day * day : outcome === 'repoussé' ? T.xp_repel_base + T.xp_repel_per_day * day : T.xp_ravage;
    for (const f of exp.party) {
      if (f.guard) continue;
      const h = state.heroes[f.id];
      if (!h) continue;
      h.fatigue = clamp(f.fatigue + (hasTrait(h, 'fragile') ? 5 : 0), 0, 100);
      h.morale = f.morale;
      for (const uid of f.consumed) { state.inventories[h.owner].items = state.inventories[h.owner].items.filter(x => x.uid !== uid); for (const s of sortedKeys(h.equipment)) if (h.equipment[s] === uid) h.equipment[s] = null; }
      let dm = outcome === 'vaincu' ? 10 : outcome === 'repoussé' ? 3 : -10;
      if (dm < 0 && hasTrait(h, 'brave')) dm = div(dm, 2);
      if (f.was_ko) {
        injure(ctx, h, outcome === 'ravage' ? 2 : 1);
        dm -= 5;
        say(ctx, 'menace', tpl(ctx, 'injury', h.id, gv(h, { a: heroName(h), n: h.injury.days_left })));
      }
      if (hasTrait(h, 'stoic')) dm = div(dm, 2);
      h.morale = clamp(h.morale + dm, 0, 100);
      addXp(ctx, h, f.was_ko ? div(xp, 2) : xp);
    }
  }

  // ===================================================================================
  // 10b'. RAID TACTIQUE (V5 T1) — phase 7b quand state.raid est actif : un passage par héros déclaré `raid`,
  // managers triés par id ASCII (héros par id), riposte du boss après chaque passage, victoire = sortie V4 « vaincu ».
  // ===================================================================================
  const RAID_NOTABLE = /phase|chancel|figé|fig[ée]|KO|sacrifi|invoque|piège|Riposte|dos|critique|dégage|collision|gouffre/;
  function raidThreatOf(state) { return (state.threats || []).filter(t => t.outcome === null && state.raid && t.dragon_id === state.raid.dragon_id)[0] || null; }
  function archiveRaid(state, R, dayEnd) {
    if (!state.raid_history) state.raid_history = [];
    state.raid_history.push({ id: R.id, dragon_id: R.dragon_id, day_start: R.day_start, day_end: dayEnd, status: R.status, nights: R.nights, passes: R.passes_done.length, ko: R.passes_done.filter(p => p.ko).length, damage_total: R.damage_total, won_by: R.won_by || null,
      stats: { mech: R.stats.mech, res_values: R.stats.res_values, casts: R.stats.casts, zones: R.stats.zones, adds_spawned: R.stats.adds_spawned, burn_turns: R.stats.burn_turns, regen_total: R.stats.regen_total, night_regen: R.stats.night_regen, shield_absorbed: R.stats.shield_absorbed } });   // V5 T2 : les compteurs du raid survivent à l'archivage (bancs et tableau)
    state.raid = null;
  }
  function raidXpBase(D, state) { const T = D.threats.dragon; return T.xp_win_base + T.xp_win_per_day * state.day; }
  function phaseRaid(ctx) {
    const state = ctx.state, D = ctx.D;
    if (!raidActive(state) || !TACTIC) return;
    const R0 = state.raid, DR = dragonById(D, R0.dragon_id) || { name: R0.name, biome: 'forest' }, DV = dragonVars(DR);
    const raiders = allHeroes(state).filter(h => ctx.effective[h.id].activity === 'raid').map(h => h.id);
    const env = raidEnvOf(D, state, raiders);
    if (R0.day_start === state.day) say(ctx, 'raid', tpl(ctx, 'raid_start', 's', Object.assign({ hp: R0.boss.hp_max }, DV)));
    if (!raiders.length) { say(ctx, 'raid', tpl(ctx, 'raid_abandon', 'a', {})); return; }
    let won = false;
    const passes = [];
    // V5 T2b (§B1) : les passages RÉELLEMENT REÇUS sont rejoués dans leur ordre de réception (`rank`, posé par applyOrQueue),
    // puis les passages par défaut des managers absents, dans l'ordre d'identifiant. Le joueur joue donc sur la grille
    // qu'il a vue le matin, et non sur celle que les amis triés avant lui ont laissée. `rank` rend le rejeu indépendant
    // de l'ordre de parcours de ctx.queued.raid (objet non ordonné).
    const order = [], taken = {};
    const received = [];
    for (const hid of sortedKeys(ctx.queued.raid)) {
      const q = ctx.queued.raid[hid], hh = state.heroes[hid];
      if (!hh || raiders.indexOf(hid) < 0 || hh.owner !== q.manager) continue;
      received.push({ hero_id: hid, mid: q.manager, rank: q.rank, human: true });
    }
    received.sort((a, b) => (a.rank - b.rank) || (a.hero_id < b.hero_id ? -1 : 1));
    for (const e of received) { order.push(e); taken[e.hero_id] = 1; }
    for (const mid of state.managers.map(m => m.id).sort())
      for (const h of heroesOf(state, mid)) {
        if (taken[h.id] || raiders.indexOf(h.id) < 0 || !state.heroes[h.id]) continue;
        order.push({ hero_id: h.id, mid: mid, rank: -1, human: false });
      }
    for (const e of order) {
      const h = state.heroes[e.hero_id], mid = e.mid;
      if (won || !h || raiders.indexOf(h.id) < 0) continue;
      const actions = e.human ? ctx.queued.raid[h.id].actions : TACTIC.raidDefaultsFor(state, h.id, env);
      if (!actions) { say(ctx, 'raid', heroName(h) + ' ne peut pas monter sur la grille aujourd\'hui.'); continue; }
      const r = TACTIC.raidPass(state, h.id, actions, env);
      if (!r.ok) {
        const t = tpl(ctx, 'rejected', 'raid' + h.id, { m: managerName(state, mid), reason: 'passage de ' + heroName(h) + ' interrompu : ' + r.reason });
        ctx.notices.push(t); ctx.log.push('RAID ' + h.id + ' : ' + r.reason);
        if (r.state === state) { say(ctx, 'raid', t); continue; }
      }
      state.raid = r.state.raid;
      const P = state.raid.passes_done[state.raid.passes_done.length - 1];
      // Chronique : entrée sur la grille (premier passage du jour), un fait marquant (sinon la trace laissée par les copains), bilan du passage.
      if (!passes.length) say(ctx, 'raid', r.log[0]);
      const notable = r.log.filter(l => RAID_NOTABLE.test(l))[0] || r.log.filter(l => /laissé|Sur la grille/.test(l))[0] || null;
      if (notable) say(ctx, 'raid', notable);
      say(ctx, 'raid', r.log[r.log.length - 1]);
      passes.push({ hero_name: heroName(h), manager_name: managerName(state, mid), damage: P.damage, ko: P.ko });
      moment(ctx, P.damage >= 150 ? 45 : 22, heroName(h) + ' a joué son passage contre ' + DV.dragon_le + ' : ' + P.damage + ' dégâts.');
      addXp(ctx, h, div(raidXpBase(D, state), 4));
      for (const ev of r.events) {
        if (ev.kind === 'ko') {
          injure(ctx, h, 1);
          h.fatigue = clamp(h.fatigue + 15, 0, 100); h.morale = clamp(h.morale - 5, 0, 100);
          say(ctx, 'raid', tpl(ctx, 'injury', h.id, gv(h, { a: heroName(h), n: h.injury.days_left })));
          moment(ctx, 60, heroName(h) + ' est tombé' + (h.gender === 'f' ? 'e' : '') + ' sur la grille face ' + (DV.dragon_de.replace(/^de /, 'à ').replace(/^du /, 'au ').replace(/^de la /, 'à la ')) + '.');
          rollDeath(ctx, h, 'raid', 'sous les fouets ' + DV.threat_de);
        } else if (ev.kind === 'phase') moment(ctx, 50, DV.Dragon_le + ' passe en phase ' + ev.phase + '.');
        else if (ev.kind === 'stagger') moment(ctx, 55, heroName(h) + ' a fendu l\'écorce : ' + DV.dragon_le + ' chancelle.');
        else if (ev.kind === 'won') won = true;
      }
    }
    const R = state.raid;
    if (R.kind === 'derby' && R.status === 'lost') {                    // §2.5 : la Bannière prise en pleine journée clôt le derby sur-le-champ
      state.stats.derby_losses++;
      state.derby.last = { day: state.day, result: 'défaite', our_score: R.derby_score || 0, their_score: 0, rival_name: R.rival_name || '' };
      say(ctx, 'derby', tpl(ctx, 'derby_lost', 'dl', { rival: R.rival_name || 'la guilde rivale', rival_de: 'de ' + (R.rival_name || 'la guilde rivale') }));
      ctx.raid = { id: R.id, name: R.name, day_start: R.day_start, nights: R.nights, status: R.status, hp_pct: div(R.boss.hp * 100, Math.max(1, R.boss.hp_max)), passes: passes, won_by: null };
      archiveRaid(state, R, state.day);
      return;
    }
    ctx.raid = { id: R.id, name: R.name, day_start: R.day_start, nights: R.nights, status: R.status, hp_pct: div(R.boss.hp * 100, Math.max(1, R.boss.hp_max)), passes: passes, won_by: R.won_by ? (state.heroes[R.won_by] ? heroName(state.heroes[R.won_by]) : R.won_by) : null };
    if (won && R.kind === 'derby') {                                    // §2.5 : le derby de saison paie en or et en prestige, pas en trophée de dragon
      const fd = (D.raw.raids || {}).raid_derby || {};
      state.guild.gold += fd.reward_gold || 0;
      state.guild.prestige += fd.reward_prestige || 0;
      state.stats.derby_wins++;
      state.derby.last = { day: state.day, result: 'victoire', our_score: R.derby_score || 0, their_score: 0, rival_name: R.rival_name || '' };
      say(ctx, 'derby', tpl(ctx, 'derby_win', 'dw', { rival: R.rival_name || 'la guilde rivale', rival_de: 'de ' + (R.rival_name || 'la guilde rivale') }));
      moment(ctx, 80, 'La Bannière est restée debout : le Derby des Lames est gagné.');
      for (const id of sortedKeys(R.damage_total)) { const h = state.heroes[id]; if (h) { addXp(ctx, h, raidXpBase(D, state)); h.morale = clamp(h.morale + 10, 0, 100); } }
      archiveRaid(state, R, state.day);
      return;
    }
    if (!won) return;
    // Victoire : XP à tous les participants du raid (+10 % par passage joué, moitié pour un KO), butin V4, légendaire au plus gros total de dégâts.
    const threat = raidThreatOf(state);
    const byHero = {};
    for (const p of R.passes_done) { const b = byHero[p.hero_id] = byHero[p.hero_id] || { n: 0, ko: false, name: p.hero_name, owner: p.manager_id }; b.n++; if (p.ko) b.ko = true; }
    const xp = raidXpBase(D, state);
    for (const id of sortedKeys(byHero)) { const h = state.heroes[id]; if (!h) continue; addXp(ctx, h, pct(byHero[id].ko ? div(xp, 2) : xp, 100 + 10 * byHero[id].n)); h.morale = clamp(h.morale + 10, 0, 100); }
    const ranking = sortedKeys(R.damage_total).sort((a, b) => R.damage_total[b] - R.damage_total[a] || (a < b ? -1 : 1));
    const bestId = ranking[0] || null;
    const best = bestId ? { name: byHero[bestId] ? byHero[bestId].name : bestId, owner: byHero[bestId] ? byHero[bestId].owner : (state.heroes[bestId] ? state.heroes[bestId].owner : state.managers[0].id) } : null;
    say(ctx, 'raid', tpl(ctx, 'raid_victory', 'v', Object.assign({ a: ctx.raid.won_by || (best ? best.name : 'la guilde') }, DV)));
    if (threat) {
      const res = applyThreatOutcome(ctx, threat, 'vaincu', { section: 'raid', best: best, defenders: sortedKeys(byHero).map(id => byHero[id].name), defender_ids: sortedKeys(byHero) });
      finalizeThreat(ctx, threat, 'vaincu', res, 'raid');
    }
    archiveRaid(state, R, state.day);
  }
  // Phase 11 (V5) : nuit du raid — régénération, expiration des états et zones du boss, enrage, échec au 4e soir (sortie V4 « ravage »).
  function phaseRaidNight(ctx) {
    const state = ctx.state, D = ctx.D;
    if (!raidActive(state) || !TACTIC) return;
    const r = TACTIC.raidNight(state, raidEnvOf(D, state, null));
    state.raid = r.state.raid;
    for (const l of r.log) say(ctx, 'raid', l);
    const R = state.raid;
    if (ctx.raid) { ctx.raid.nights = R.nights; ctx.raid.hp_pct = div(R.boss.hp * 100, Math.max(1, R.boss.hp_max)); ctx.raid.status = R.status; }
    else ctx.raid = { id: R.id, name: R.name, day_start: R.day_start, nights: R.nights, status: R.status, hp_pct: div(R.boss.hp * 100, Math.max(1, R.boss.hp_max)), passes: [], won_by: null };
    if (!r.events.some(e => e.kind === 'lost')) return;
    if (R.kind === 'derby') {                                            // §2.5 : le gué perdu coûte du prestige, jamais le village
      state.guild.prestige = Math.max(0, state.guild.prestige - ((D.C.derby_prestige && D.C.derby_prestige.loss ? -D.C.derby_prestige.loss : 0) || 5));
      state.stats.derby_losses++;
      state.derby.last = { day: state.day, result: 'défaite', our_score: R.derby_score || 0, their_score: 0, rival_name: R.rival_name || '' };
      say(ctx, 'derby', tpl(ctx, 'derby_lost', 'dl', { rival: R.rival_name || 'la guilde rivale', rival_de: 'de ' + (R.rival_name || 'la guilde rivale') }));
      archiveRaid(state, R, state.day);
      return;
    }
    const threat = raidThreatOf(state);
    const names = {};
    for (const p of R.passes_done) names[p.hero_id] = p.hero_name;
    if (threat) {
      const res = applyThreatOutcome(ctx, threat, 'ravage', { section: 'raid', best: null, defenders: sortedKeys(names).map(id => names[id]), defender_ids: sortedKeys(names) });
      finalizeThreat(ctx, threat, 'ravage', res, 'raid');
    }
    archiveRaid(state, R, state.day);
  }

  // ===================================================================================
  // 10c. MISSIONS SOLO — phase 7c (V4) : 2 PA, 1 jour, récompenses personnelles, savoir-faire, blessure par jet contre la difficulté
  // ===================================================================================
  function soloAptitude(D, state, h, m) {
    const cls = D.classes[h.class_id];
    let apt = h.level * 5 + attrEff(D, h, cls.primary) + attrEff(D, h, cls.secondary) + 4 * craftLevel(D, craftXp(h, m.craft_id));
    if (m.class_id === h.class_id) apt += 6;
    if (hasTrait(h, 'brave')) apt += 3;
    if (hasTrait(h, 'lucky')) apt += 3;
    if (hasTrait(h, 'coward')) apt -= 3;
    return pct(apt, perfPct(h));
  }
  function soloRewardsLabel(D, m) {
    const parts = [];
    if (m.gold) parts.push(m.gold + ' or');
    for (const r of sortedKeys(m.resources)) parts.push(m.resources[r] + ' ' + D.resources[r].name.toLowerCase());
    parts.push(m.xp + ' XP');
    parts.push(D.crafts[m.craft_id] ? D.crafts[m.craft_id].name.toLowerCase() : m.craft_id);
    return parts.join(' · ');
  }
  function soloRiskLabel(m) { return m.difficulty <= 1 ? 'risque faible' : m.difficulty <= 3 ? 'risque modéré' : 'risque élevé'; }
  function phaseSolo(ctx) {
    const state = ctx.state, D = ctx.D, C = D.C;
    for (const h of allHeroes(state)) {
      const e = ctx.effective[h.id];
      for (const slot of e.slots) {
        if (slot.activity !== 'solo') continue;
        const m = D.solo[slot.target];
        if (!m || !state.heroes[h.id]) continue;
        const apt = soloAptitude(D, state, h, m) + ctx.rng.roll(C.solo_roll || 30);
        const dc = (C.solo_dc || [])[m.difficulty] || 50;
        const ok = apt >= dc;
        state.stats.solo_done += 1;
        const rewards = [];
        if (ok) {
          state.stats.solo_success += 1;
          if (m.gold) { state.purses[h.owner] += m.gold; rewards.push(m.gold + ' or'); }
          const inv = state.inventories[h.owner].resources;
          for (const r of sortedKeys(m.resources)) { inv[r] = (inv[r] || 0) + m.resources[r]; rewards.push(m.resources[r] + ' ' + D.resources[r].name.toLowerCase()); }
          let xp = m.xp;
          const erud = craftBonus(D, h, 'erudition');
          if (erud) xp = pct(xp, 100 + erud);
          addXp(ctx, h, xp); rewards.push(xp + ' XP');
          addCraftXp(ctx, h, m.craft_id, m.craft_xp);
          say(ctx, 'solo', tpl(ctx, 'solo_success', h.id, gv(h, { a: heroName(h), mission: m.text, reward: rewards.join(', ') })));
          if (ctx.rng.chance(m.item_permille)) {
            const itemId = instantiateItem(D, { pool: null, rarity_bonus: m.difficulty * 10 }, 0, ctx.rng);
            giveItem(D, state, h.owner, itemId); state.stats.items_found++;
            say(ctx, 'solo', tpl(ctx, 'solo_item', h.id, { a: heroName(h), item: D.items[itemId].name.toLowerCase() }));
            if (D.items[itemId].rarity !== 'common') moment(ctx, 42, heroName(h) + ' rapporte ' + D.items[itemId].name + ' de sa mission solo.');
          }
          moment(ctx, 24 + 4 * m.difficulty, heroName(h) + ' réussit ' + m.text + '.');
          ctx.summary.solo_results.push(heroName(h) + ' : ' + m.name + ' — réussie (' + rewards.join(', ') + ')');
        } else {
          addXp(ctx, h, div(m.xp, 3));
          addCraftXp(ctx, h, m.craft_id, div(m.craft_xp, 2));
          say(ctx, 'solo', tpl(ctx, 'solo_fail', h.id, gv(h, { a: heroName(h), mission: m.text })));
          moment(ctx, 26 + 3 * m.difficulty, heroName(h) + ' échoue : ' + m.text + '.');
          ctx.summary.solo_results.push(heroName(h) + ' : ' + m.name + ' — échec');
        }
        // Blessure : jet contre la difficulté (permille doublé sur échec), chance protège, discrétion aide.
        let p = m.injury_permille * (ok ? 1 : 2);
        if (attrEff(D, h, 'luck') >= 25) p -= 20;
        p -= craftBonus(D, h, 'discretion');
        if (p > 0 && ctx.rng.chance(p)) {
          const sev = !ok && m.difficulty >= 4 ? 2 : 1;
          const grave = h.injury.severity >= 2;     // parti gravement blessé (inatteignable par la validation V4, voir expédition)
          injure(ctx, h, sev);
          say(ctx, 'solo', tpl(ctx, 'injury', h.id, gv(h, { a: heroName(h), n: h.injury.days_left })));
          if (grave) rollDeath(ctx, h, 'wounded', 'de ses blessures après ' + m.text);
        }
        break;    // une seule mission solo par jour et par héros (2 PA)
      }
    }
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
      else if (o.heir_for && o.heir_for !== a.manager_id) why = 'héritier réservé à ' + managerName(state, o.heir_for);
      else if (state.purses[a.manager_id] < o.cost) why = 'or insuffisant';
      else if (!o.heir_for && heroesOf(state, a.manager_id).length >= rosterCap(D, state)) why = 'effectif complet';
      if (why) { const t = tpl(ctx, 'recruit_fail', a.manager_id, { m: managerName(state, a.manager_id), a: name, reason: why }); ctx.notices.push(t); say(ctx, 'taverne', t); continue; }
      state.purses[a.manager_id] -= o.cost;
      state.tavern = state.tavern.filter(x => x.id !== o.id);
      const h = addHero(D, state, a.manager_id, o.hero);
      ctx.effective[h.id] = effectiveOf([]);
      ctx.summary.recruits.push(heroName(h));
      if (o.heir_for) { say(ctx, 'taverne', tpl(ctx, 'heir_recruit', h.id, { m: managerName(state, a.manager_id), a: heroName(h), dead: o.dead_name, link: h.gender === 'f' ? 'héritière' : 'héritier' })); moment(ctx, 62, heroName(h) + ' reprend la place de ' + o.dead_name + ' chez ' + managerName(state, a.manager_id) + '.'); }
      else { say(ctx, 'taverne', tpl(ctx, 'recruit', h.id, { m: managerName(state, a.manager_id), a: heroName(h), cls: D.classes[h.class_id].name, lvl: h.level, n: o.cost })); moment(ctx, 30, managerName(state, a.manager_id) + ' engage ' + heroName(h) + ', ' + D.classes[h.class_id].name.toLowerCase() + ' de niveau ' + h.level + '.'); }
    }
    // Héritiers (V4) : pour chaque mort du jour, une offre à coût 0 réservée au manager endeuillé, visible dès le lendemain.
    for (const dead of ctx.deaths.slice().sort((x, y) => (x.hero_id < y.hero_id ? -1 : 1))) {
      const level = Math.max(1, guildLevel(D, state) - 1);
      const h = genHero(D, ctx.rng, state, { class_id: dead.class_id, level: level, rarity: 'common' });
      h.epithet = dead.epithet;
      const inherited = dead.traits.length ? dead.traits[ctx.rng.roll(dead.traits.length)] : null;
      h.traits = ['heritier'].concat(inherited && inherited !== 'heritier' ? [inherited] : []);
      uniqueName(state, h);
      const o = { id: 'heir' + pad2(state.day) + '_' + dead.owner, hero: h, cost: 0, wage: h.wage, expires_day: state.day + (D.C.heir_expires_days || 4), heir_for: dead.owner, dead_name: dead.name };
      state.tavern.push(o);
      say(ctx, 'taverne', tpl(ctx, 'heir_offer', o.id, { a: heroName(h), dead: dead.name, m: managerName(state, dead.owner), link: h.gender === 'f' ? 'héritière' : 'héritier', il: h.gender === 'f' ? 'elle' : 'il' }));
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
        ctx.summary.construction = b.name + ' niveau ' + c.to_level + ' achevé'; ctx.summary.construction_id = c.building_id;   // V5 T2b (§B8)
        state.construction = null;
      } else { say(ctx, 'chantier', tpl(ctx, 'construction_progress', c.building_id, { b: b.name, p: c.progress, needed: c.needed })); ctx.summary.construction = b.name + ' ' + c.progress + '/' + c.needed; ctx.summary.construction_id = c.building_id; }   // V5 T2b (§B8)
      return;
    }
    if (!ctx.build_vote) return;
    const id = ctx.build_vote, b = D.buildings[id], lv = bLevel(D, state, id);
    if (lv >= 4) return;
    const why = canFundBuilding(D, state, id);
    if (why) { const t = tpl(ctx, 'construction_blocked', id, { b: b.name, reason: why }); ctx.notices.push(t); say(ctx, 'chantier', t); ctx.summary.construction = b.name + ' bloqué'; ctx.summary.construction_id = id; return; }
    const L = b.levels[lv];
    for (const r of sortedKeys(L.cost)) state.warehouse[r] -= L.cost[r];
    state.guild.gold -= L.gold;
    state.construction = { building_id: id, to_level: lv + 1, progress: 0, needed: L.days };
    say(ctx, 'chantier', tpl(ctx, 'construction_start', id, { b: b.name, n: lv + 1, days: L.days }));
    ctx.summary.construction = b.name + ' niveau ' + (lv + 1) + ' lancé'; ctx.summary.construction_id = id;
  }

  // ---- Phase 11 : fin de jour (état des héros, XP, niveaux, tableau des quêtes) ----
  function phaseEvening(ctx) {
    const state = ctx.state, D = ctx.D;
    for (const mid of sortedKeys(state.solo_board)) state.solo_board[mid] = rollSoloBoard(D, state, ctx.rng, mid);   // tableau solo renouvelé le soir (V4)
    const chapel = D.C.chapel_morale[bLevel(D, state, 'chapel')];
    const decoMorale = {};
    // V5 T6 (B8') : `decoration_morale_cap` vivait à la racine de data.json, pas dans `constants` — `Math.min(undefined, …)`
    // valait NaN, et le `|| 0` plus bas le transformait en zéro : les dix décorations n'ont JAMAIS donné un point de moral.
    const decoCap = D.C.decoration_morale_cap !== undefined ? D.C.decoration_morale_cap : (D.raw.decoration_morale_cap || 0);
    for (const m of sortedKeys(state.quarters)) decoMorale[m] = Math.min(decoCap, sum(state.quarters[m].map(q => D.decorations[q.decoration_id].morale)));
    const cheerful = {};
    for (const h of allHeroes(state)) if (hasTrait(h, 'cheerful')) cheerful[h.owner] = 1;
    for (const h of allHeroes(state)) {
      const eff = ctx.effective[h.id] || effectiveOf([]);
      const act = eff.activity;
      const dl = slotDeltas(D, eff.slots);
      h.form += Math.sign(50 - h.form) * Math.min(2, Math.abs(50 - h.form));
      let fat = dl.fatigue, mor = dl.morale;
      if (act === 'expedition') fat += 5 * (ctx.exp_floors || 1);
      if (act === 'rest' && hasTrait(h, 'lazy')) { fat -= 10; mor += 5; }
      if (act === 'train' && hasTrait(h, 'diligent')) fat += 5;
      if (fat > 0 && hasTrait(h, 'stoic')) fat = pct(fat, 80);
      mor += chapel + (decoMorale[h.owner] || 0) + (cheerful[h.owner] && !hasTrait(h, 'cheerful') ? 1 : 0) - (hasTrait(h, 'whiner') ? 1 : 0);
      if (hasTrait(h, 'stoic')) mor = div(mor, 2);
      mor -= moraleWear(D, h);                                                 // V5 T6 (R3/B8) : usure du soir — plafond MOBILE, voir moraleWear
      h.fatigue = clamp(h.fatigue + fat, 0, 100);
      h.form = clamp(h.form + dl.form, 0, 100);
      h.morale = clamp(h.morale + mor, hasTrait(h, 'cheerful') ? 20 : 0, 100);
      if (dl.xp) addXp(ctx, h, dl.xp);
      h.last_activity = act;
      let dayXp = ctx.xp[h.id] || 0;
      const erud = craftBonus(D, h, 'erudition');
      if (erud && dayXp) dayXp = pct(dayXp, 100 + erud);
      for (const ev of applyXp(D, h, dayXp)) {
        if (ev.kind === 'level_up') { state.stats.level_ups++; ctx.summary.level_ups.push(heroName(h) + ' → ' + ev.level); ctx.summary.level_up_ids.push(h.id);   /* V5 T2b (§B8) */ say(ctx, 'soir', tpl(ctx, 'level_up', h.id, { a: heroName(h), n: ev.level })); moment(ctx, 50 + ev.level, heroName(h) + ' passe niveau ' + ev.level + ' !'); }
        else say(ctx, 'soir', tpl(ctx, 'skill_unlocked', h.id + ev.skill.id, { a: heroName(h), skill: ev.skill.name }));
      }
    }
    if (chapel) say(ctx, 'soir', tpl(ctx, 'chapel', 'c', { n: chapel }));
    refreshBoard(ctx);
  }
  // Deltas de fin de jour d'une journée composée (V4) : Σ par activité de delta_journalier × PA dépensés / slot_divisor ; journée vide = repos.
  function slotDeltas(D, slots) {
    const out = { fatigue: 0, form: 0, morale: 0, xp: 0 };
    if (!slots.length) return Object.assign(out, D.C.activity_deltas.rest);
    const spent = {};
    for (const s of slots) spent[s.activity] = (spent[s.activity] || 0) + (isFullDay(s.activity) ? slotDiv(D) : apCost(D, s.activity));
    for (const act of sortedKeys(spent)) {
      const dl = D.C.activity_deltas[act] || D.C.activity_deltas.rest;
      for (const k of ['fatigue', 'form', 'morale', 'xp']) out[k] += div(dl[k] * spent[act], slotDiv(D));
    }
    return out;
  }
  // ===================================================================================
  // 11a'. LIGNÉE (V5 T2) — seuil du soir, proposition, affinité (§6.3 option B), choix automatique après deux jours
  // ===================================================================================
  function phaseLineage(ctx) {
    const state = ctx.state, D = ctx.D, L = lineageC(D);
    if (!L) return;
    let offered = 0;
    for (const h of allHeroes(state)) {
      if (h.hybrid || !hybridReady(D, state, h)) continue;
      // V5 T6 (D8) : une classe qui n'ouvre AUCUNE voie (le Barde, tant que les paires ne sont pas écrites) ne reçoit
      // pas de proposition : sans ce garde-fou, le modèle de vue rendait une carte de choix à zéro option.
      if (!hybridsForClass(D, h.class_id).length) continue;
      if (h.hybrid_offer_day === null || h.hybrid_offer_day === undefined) {
        h.hybrid_offer_day = state.day;                                        // proposition le soir du seuil : la réponse vient le lendemain (copains) ou automatiquement à J+2
        say(ctx, 'voie', tpl(ctx, 'voie_offer', h.id, gv(h, { a: heroName(h) })));
        offered++;
        continue;
      }
      const m = managerOf(state, h.owner);
      const friend = m && m.kind === 'ai' && state.day > h.hybrid_offer_day;   // un ami simulé répond le lendemain de la proposition
      const late = state.day - h.hybrid_offer_day >= L.hybrid_auto_days;       // deux jours sans réponse : le héros tranche seul
      if (friend || late) {
        const H = pickHybrid(D, state, h);                                     // besoin du groupe le plus bas, puis voie absente de la table, puis affinité, puis identifiant
        if (H) applyHybrid(ctx, h, H, friend ? 'ami' : 'auto');
      }
    }
    if (offered) {
      const G = groupNeeds(D, state);
      say(ctx, 'voie', tpl(ctx, 'voie_needs', 'n' + state.day, { besoins: joinFr(G.labels) }));
    }
    phaseSpec(ctx);
  }
  // V5 T3 (§6.1) : proposition de spécialisation le soir du seuil, amis simulés le lendemain, choix automatique à J+2.
  function phaseSpec(ctx) {
    const state = ctx.state, D = ctx.D, L = lineageC(D);
    if (!L || !(D.raw.specs || []).length) return;
    let offered = 0;
    for (const h of allHeroes(state)) {
      if (h.spec || !specReady(D, state, h)) continue;
      if (h.spec_offer_day === null || h.spec_offer_day === undefined) {
        h.spec_offer_day = state.day;
        say(ctx, 'voie', tpl(ctx, 'voie_spec_offer', h.id, gv(h, { a: heroName(h) })));
        offered++;
        continue;
      }
      const m = managerOf(state, h.owner);
      const friend = m && m.kind === 'ai' && state.day > h.spec_offer_day;
      const late = state.day - h.spec_offer_day >= (L.spec_auto_days || 2);
      if (friend || late) { const S = pickSpec(D, state, h); if (S) applySpec(ctx, h, S, friend ? 'ami' : 'auto'); }
    }
    if (offered) {
      const G = groupNeeds(D, state);
      say(ctx, 'voie', tpl(ctx, 'voie_spec_needs', 's' + state.day, { besoins: joinFr(G.labels) }));
    }
    const rec = respecHint(D, state);
    if (rec) say(ctx, 'voie', tpl(ctx, 'voie_respec_offer', 'r' + state.day, { dragon: rec.dragon, spe1: rec.specs[0], spe2: rec.specs[1] || rec.specs[0], liste: joinFr(rec.heroes), cout: (L.respec_cost_gold || 100), e2: 'e' }));
  }
  // §6.4 : quand un dragon se réveille, le tableau rappelle quelles branches seraient précieuses et qui peut encore se reconvertir.
  function respecHint(D, state) {
    const L = lineageC(D);
    if (!L || state.day > L.respec_deadline_day) return null;
    // Le rappel se lit MÊME pendant le raid (c'est une information) ; l'action, elle, reste refusée tant que la grille est dressée.
    const woke = (state.threats || []).filter(t => t.outcome === null)[0];
    const rt = woke ? raidTableFor(D, woke.dragon_id) : (state.raid ? (D.raws || D).raids && D.raids[state.raid.id] : null);
    const raidId = rt ? rt.id : (state.raid ? state.raid.id : null);
    if (!raidId) return null;
    const biome = woke ? woke.biome : null;
    const DR = biome ? D.dragons[biome] : (state.raid ? dragonById(D, state.raid.dragon_id) : null);
    const want = specList(D).filter(S => (S.answers || []).indexOf(raidId) >= 0);
    const have = {};
    for (const h of allHeroes(state)) if (h.spec) have[h.spec] = 1;
    const missing = want.filter(S => !have[S.id]);
    if (!missing.length) return null;
    const heroes = allHeroes(state).filter(h => h.spec && (h.respec_used || 0) < (L.respec_max || 1)
      && missing.some(S => S.hybrid === h.hybrid && S.id !== h.spec));
    if (!heroes.length) return null;
    return { dragon: DR ? DR.name : (state.raid ? state.raid.name : raidId), derby: raidId === 'raid_derby', specs: missing.map(S => S.name), heroes: heroes.map(h => heroName(h)) };
  }
  // ---- Phase 11b : âge du village (au plus un âge par jour, jamais de recul) ----
  function phaseVillageAge(ctx) {
    const state = ctx.state, D = ctx.D;
    const cur = clamp(state.village_age || 0, 0, D.ages.length - 1);
    if (cur >= D.ages.length - 1) return;
    const next = D.ages[cur + 1], levels = buildingLevelsSum(state);
    if (state.guild.prestige < next.prestige_min || levels < next.levels_min) return;
    state.village_age = cur + 1;
    state.guild.prestige += D.C.village_age_up_prestige || 0;
    say(ctx, 'village', tpl(ctx, 'village_age_up', 'age', { old: D.ages[cur].name.toLowerCase(), new: next.name.toLowerCase(), desc: next.description }));
    moment(ctx, 92, 'Le village devient ' + next.name.toLowerCase() + ' : ' + next.description);
    ctx.summary.village_age_up = next.name;
  }
  // ---- Phase 11c (V4) : réveil des dragons par la maîtrise des biomes, puis présage (la veille d'une attaque) ----
  function activeThreat(state) { return (state.threats || []).filter(t => t.outcome === null)[0] || null; }
  function phaseDragons(ctx) {
    const state = ctx.state, D = ctx.D, day = state.day;
    let woke = null;
    if (day >= (D.C.dragon_wake_day_min || 10) && day + 1 <= state.season_length && !activeThreat(state)) {
      for (const b of sortedKeys(D.dragons)) {
        const dr = state.dragons[b];
        if (!dr || dr.state !== 'dormant' || dr.awakenings > 0 || (state.biome_mastery[b] || 0) < (D.C.dragon_wake_mastery || 8)) continue;
        dr.state = 'awake'; dr.awakenings += 1; dr.next_day = day + 1;
        scheduleThreat(state, b, D.dragons[b].id, day + 1);
        woke = b;
        break;                                   // un seul réveil par soir
      }
    }
    const t = (state.threats || []).filter(x => x.presage_day === day && x.outcome === null)[0];
    if (!t) return;
    const DR = D.dragons[t.biome];
    if (!DR) return;
    const presage = tpl(ctx, 'presage', 'p', {}), DV = dragonVars(DR);
    if (woke === t.biome) say(ctx, 'presage', tpl(ctx, 'dragon_wake', 'w', Object.assign({ biome: D.biomes[t.biome].name, biome_le: biomeLe(D, t.biome), biome_de: biomeDe(D, t.biome), presage: presage }, DV)));
    else say(ctx, 'presage', tpl(ctx, 'dragon_return', 'r', Object.assign({ presage: presage }, DV)));
    moment(ctx, 75, 'Présage : ' + DV.dragon_le + (woke === t.biome ? ' s\'est réveillé' + DV.e : ' revient') + '. Le village retient son souffle.');
    ctx.summary.presage = DR.name;
    // V5 : le dragon doté d'une fiche de raid (le Sylvain) se joue en raid persistant dès le lendemain : la grille est dressée le soir du présage.
    const rt = raidEnabled(D) && !state.raid ? raidTableFor(D, DR.id) : null;
    // V5 T2b (§B7) : si le raid tactique est refusé (vocabulaire d'effets, tactic.js absent), le dragon retombe sur
    // l'affrontement V4 et la raison est dite en clair — jamais une désactivation silencieuse.
    if (!rt && !state.raid && raidTableFor(D, DR.id)) {
      const why = raidDisabledWhy(D);
      if (why) { const t2 = 'Raid tactique indisponible : ' + why + ' — ' + DV.dragon_le + ' sera affronté à l\'ancienne.'; ctx.notices.push(t2); say(ctx, 'presage', t2); }
    }
    if (rt) {
      state.raid = TACTIC.startRaid(state, rt.id, raidEnvOf(D, state, null, t.day)).raid || null;
      if (state.raid) say(ctx, 'raid', 'La clairière est dressée : demain, ' + DV.dragon_le + ' se jouera sur la grille (' + state.raid.boss.hp_max + ' PV de sève, ' + (D.raid.raid_max_nights) + ' nuits au plus).');
    }
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
    // V5 T3 §2.5 : le Derby des Lames se joue sur la grille (jours 26-28) et remplace le derby du jour 28.
    const dr = D.C.derby_raid_day || 0;
    if (dr && state.day === dr - 1 && raidEnabled(D) && !state.raid && (D.raw.raids || {}).raid_derby) {
      const rival0 = D.raw.rival_guilds[fnvU32(state.seed) % D.raw.rival_guilds.length];
      state.raid = TACTIC.startRaid(state, 'raid_derby', raidEnvOf(D, state, null, dr)).raid || null;
      if (state.raid) {
        state.derby.raid_day = dr;
        say(ctx, 'derby', tpl(ctx, 'derby_start', 'dr', { rival: rival0 }));
        say(ctx, 'derby', 'Le gué est tracé : demain, la Bannière se garde sur la grille (' + state.raid.boss.hp_max + ' PV au Capitaine, 3 jours).');
      }
    }
    if (D.C.derby_days.indexOf(state.day) < 0) return;
    if (state.day === (D.C.derby_raid_skip_day || 0) && state.derby && state.derby.raid_day) { say(ctx, 'derby', 'Pas de derby ordinaire ce jour-ci : le Derby des Lames s\'est joué au gué.'); return; }
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
      // V5 T2b (§B2) : l'expédition de la guilde RIVALE ne doit pas peupler les « moments » du jour — sinon le titre
      // de la chronique nomme des héros qui n'existent pas dans l'effectif. On tronque la pile autour de l'appel.
      const momentsBefore = ctx.moments.length;
      const exp = runExpedition(ctx, quest, fighters, rng);
      their = expeditionScore(D, exp, computeRewards(ctx, exp, rng));
      ctx.moments.length = momentsBefore;
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
  function dragonById(D, id) { for (const b of sortedKeys(D.dragons)) if (D.dragons[b].id === id) return D.dragons[b]; return null; }
  function phaseSeason(ctx) {
    const state = ctx.state, D = ctx.D;
    if (state.day !== state.season_length || state.collapsed) return;
    const heroes = allHeroes(state);
    const best = heroes.slice().sort((a, b) => b.level - a.level || b.xp - a.xp || (a.id < b.id ? -1 : 1))[0];
    const s = state.stats;
    const lines = [
      'Trésorerie de guilde : ' + state.guild.gold + ' or · prestige ' + state.guild.prestige + ' (niveau de guilde ' + guildLevel(D, state) + ').',
      'Expéditions : ' + s.expeditions + ', dont ' + s.successes + ' succès · ' + s.gold_earned + ' or rapportés · ' + s.items_found + ' objets trouvés.',
      'Derbys : ' + s.derby_wins + ' victoire(s), ' + s.derby_losses + ' défaite(s), ' + s.derby_draws + ' nul(s).',
      'Montées de niveau : ' + s.level_ups + ' · blessures : ' + s.injuries + '.',
      best ? 'Aventurier de la saison : ' + heroName(best) + ' (' + D.classes[best.class_id].name + ' niveau ' + best.level + ').' : 'Aucun aventurier.',
      'Bâtiments : ' + D.raw.buildings.map(b => b.name + ' ' + bLevel(D, state, b.id)).join(', ') + '.',
      'Dragons abattus : ' + state.stats.dragons_slain + (state.trophies.length ? ' (' + state.trophies.map(t => (dragonById(D, t.dragon_id) || { name: t.dragon_id }).name + ' j' + t.day).join(', ') + ')' : '') + ' · morts : ' + state.stats.deaths + (state.graves.length ? ' (' + state.graves.map(g => g.name).join(', ') + ')' : '') + '.',
      'Missions solo : ' + state.stats.solo_done + ', dont ' + state.stats.solo_success + ' réussies.'
    ];
    for (const m of state.managers) lines.push(m.name + ' : ' + state.purses[m.id] + ' or, ' + heroesOf(state, m.id).length + ' aventurier(s).');
    state.season_report = { title: 'Bilan de la saison — ' + state.season_length + ' jours', lines: lines };
    for (const l of lines) say(ctx, 'bilan', l);
    moment(ctx, 95, 'La saison s\'achève : ' + s.successes + ' succès en ' + s.expeditions + ' expéditions, prestige ' + state.guild.prestige + '.');
  }

  // ===================================================================================
  // 12. CHRONIQUE : assemblage, budget de lignes, instant du jour
  // ===================================================================================
  const SECTION_CAP = { matin: 6, paie: 2, recolte: 8, entrainement: 6, forge: 6, infirmerie: 5, expedition: 13, menace: 22, raid: 26, solo: 8, deuil: 4, marche: 6, taverne: 6, chantier: 3, soir: 14, voie: 16, village: 1, presage: 1, derby: 3, bilan: 12 };
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
      for (const p of PHASES) { const s = ctx.sections[p[0]]; if (!UNTRIMMED[p[0]] && s.lines.length > 2 && (!big || s.lines.length > big.lines.length)) big = s; }
      if (!big) break;
      big.lines.pop(); total--;
    }
    const moodIdx = fnvU32(state.seed ^ (state.day * 7919)) % D.templates.moods.length;
    const title = tpl(ctx, 'day_title', 't', { d: state.day, mood: D.templates.moods[moodIdx] });
    let headline = 'Une journée sans histoire au village ; on affûte les lames et on compte les sous.';
    if (ctx.moments.length) headline = ctx.moments.slice().sort((a, b) => b.score - a.score || a.seq - b.seq)[0].text;
    const sections = PHASES.map(p => ctx.sections[p[0]]).filter(s => s.lines.length).map(s => ({ phase: s.phase, title: s.title, lines: s.lines }));
    return { day: state.day, title: title, headline: headline, sections: sections, expedition: ctx.expedition, threat: ctx.threat, raid: ctx.raid,
      summary: { gold_delta: ctx.summary.gold_delta, injuries: ctx.summary.injuries, injury_ids: ctx.summary.injury_ids, level_ups: ctx.summary.level_ups, level_up_ids: ctx.summary.level_up_ids, recruits: ctx.summary.recruits, construction: ctx.summary.construction, construction_id: ctx.summary.construction_id,
        village_age_up: ctx.summary.village_age_up, presage: ctx.summary.presage, threat_outcome: ctx.summary.threat_outcome,
        deaths: ctx.summary.deaths, legendary: ctx.summary.legendary, solo_results: ctx.summary.solo_results, raid_status: ctx.raid ? ctx.raid.status : null,
        hybrids: ctx.summary.hybrids, specs: ctx.summary.specs } };
  }

  // ===================================================================================
  // 13. RÉSOLUTION D'UNE JOURNÉE (pure : clone profond de l'entrée, jamais de mutation)
  // ===================================================================================
  function attachData(state, data) { Object.defineProperty(state, '__data', { value: data, enumerable: false, configurable: true }); return state; }
  // V5 T2b (§B4) : `state.__data` est posée NON ÉNUMÉRABLE, donc perdue par JSON.stringify. Un état relu dans un
  // processus neuf (widget, fond d'écran, portage) doit être ré-attaché à sa table de données AVANT tout appel.
  // `attach(état, data)` le fait et renseigne aussi le repli de module, comme `newGame`. Sans elle, les entrées
  // publiques rendent une raison en français au lieu de jeter.
  const NO_DATA = 'table de données absente : appelez SIM.attach(état, data) avant SIM.viewModel / SIM.resolveDay (la propriété __data ne survit pas à JSON.stringify).';
  function dataUsable(d) { return !!(d && typeof d === 'object' && Array.isArray(d.classes) && d.classes.length && d.constants); }
  function dataOf(state, data) {
    if (dataUsable(data)) return data;
    const d = (state && typeof state === 'object' && state.__data) || GLOBAL_DATA;
    return dataUsable(d) ? d : null;
  }
  function remember(data) { if (dataUsable(data)) GLOBAL_DATA = data; }   // repli de module seul : n'écrit rien sur l'état
  function attach(state, data) {
    if (!state || typeof state !== 'object') return state;
    if (!dataUsable(data)) return state;
    GLOBAL_DATA = data;
    return attachData(state, data);
  }
  function collapsedChronicle(D, state) {
    const line = pickTpl(D, 'collapsed_day', String(state.day), {});
    return { day: state.day, title: 'Jour ' + state.day + ' — la guilde est dispersée', headline: 'La guilde est dispersée.',
      sections: [{ phase: 'bilan', title: 'Bilan de saison', lines: [line, 'Chute le jour ' + state.collapsed.day + ' : ' + state.collapsed.reason + '.'] }], expedition: null, threat: null, raid: null,
      summary: { gold_delta: 0, injuries: [], injury_ids: [], level_ups: [], level_up_ids: [], recruits: [], construction: '', construction_id: null, village_age_up: null, presage: null, threat_outcome: null, deaths: [], legendary: [], solo_results: [], raid_status: null, hybrids: [], specs: [] } };   /* V5 T2b (§B8) : même forme de résumé que buildChronicle */
  }
  function resolveDay(input, actions, dataArg) {
    const data = dataOf(input, dataArg);
    if (!data) return { state: input, chronicle: null, log: [NO_DATA], error: NO_DATA };
    remember(dataArg);   // resolveDay reste PURE : on ne pose rien sur l'entrée
    const D = index(data);
    const state = attachData(clone(input), data);
    // Guilde dispersée (V4) : l'état ne change plus, la chronique le dit.
    if (state.collapsed) return { state: state, chronicle: collapsedChronicle(D, state), log: ['jour ' + state.day + ' : guilde dispersée depuis le jour ' + state.collapsed.day + ', état inchangé'] };
    const ctx = makeCtx(D, state);
    const goldBefore = state.guild.gold + sum(sortedKeys(state.purses).map(m => state.purses[m]));
    phaseValidation(ctx, Array.isArray(actions) ? actions : []);     // 1
    phasePay(ctx);                                                      // 2
    phaseSlots(ctx);                                                    // 3-5 récolte, entraînement, forge — par créneau (V4)
    phaseInfirmary(ctx);                                                // 6
    phaseExpedition(ctx);                                               // 7
    phaseThreat(ctx);                                                   // 7b menace (dragon de biome, auto-combat V4)
    phaseRaid(ctx);                                                     // 7b' raid tactique persistant (V5) : passages du jour
    phaseSolo(ctx);                                                     // 7c missions solo (V4)
    phaseMarket(ctx);                                                   // 8
    phaseTavern(ctx);                                                   // 9 (héritiers compris)
    phaseConstruction(ctx);                                             // 10
    phaseEvening(ctx);                                                  // 11
    phaseLineage(ctx);                                                  // 11a' lignée (V5 T2) : proposition du soir, choix automatique à J+2
    phaseRaidNight(ctx);                                                // 11' nuit du raid (V5) : régénération, enrage, échec au 4e soir
    phaseVillageAge(ctx);                                               // 11b âge du village
    phaseDragons(ctx);                                                  // 11c réveil des dragons + présage
    phaseDerby(ctx);                                                    // 12
    phaseSeason(ctx);                                                   // 13
    ctx.summary.gold_delta = state.guild.gold + sum(sortedKeys(state.purses).map(m => state.purses[m])) - goldBefore;
    const chronicle = buildChronicle(ctx);
    state.notices = ctx.notices.slice();
    state.last_chronicle = chronicle;
    const dayDone = state.day;
    state.day += 1;
    const h = hashState(Object.assign({}, state, { history: null }));
    state.history.push({ day: dayDone, title: chronicle.title, headline: chronicle.headline, hash: h, village_age_index: state.village_age || 0 });
    ctx.log.push('jour ' + dayDone + ' résolu, ' + ctx.rng.count + ' tirages, hash ' + h);
    return { state: state, chronicle: chronicle, log: ctx.log };
  }

  // ===================================================================================
  // 14. MODÈLE DE VUE — forme exacte du contrat, tout prêt à afficher
  // ===================================================================================
  function statsLabel(D, it) {
    const names = { atk: 'ATQ', def: 'DÉF', hp: 'PV', spd: 'VIT', crit: 'CRIT ‰', magic: 'MAG', heal: 'SOIN', support: 'SOUTIEN', fire: 'feu', gather_forest: 'récolte forêt %', gather_mountain: 'récolte montagne %', heal_pct: 'soin %', poison_immune: 'antipoison', atk_pct: 'ATQ %', def_pct: 'DÉF %', injury_days: 'jours de blessure', fatigue: 'fatigue' };
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
  // Activités permises AUJOURD'HUI (V4 : coût en PA ; blessé = repos ou forge ; solo avec les missions du tableau du manager).
  function activityOptions(D, state, h) {
    const rest = { activity: 'rest', label: 'Repos', targets: [], cost_ap: apCost(D, 'rest') };
    const lv = bLevel(D, state, 'forge');
    const craft = { activity: 'craft', label: 'Forge', targets: D.raw.recipes.filter(r => r.forge_level <= lv).map(r => ({ id: r.id, label: r.name })), cost_ap: apCost(D, 'craft') };
    if (h.fatigue >= 100) return [rest];
    if (h.injury.severity >= 1) return [craft, rest];
    const ap = apToday(D, state, h);
    const out = [
      { activity: 'gather', label: 'Récolte', targets: D.raw.resources.filter(r => r.gatherable !== false).map(r => ({ id: r.id, label: r.name + ' (' + D.biomes[r.biome].name + ')' })), cost_ap: apCost(D, 'gather') },
      { activity: 'train', label: 'Entraînement', targets: D.raw.attributes.map(a => ({ id: a.id, label: a.name })), cost_ap: apCost(D, 'train') },
      craft, rest
    ];
    const board = soloBoardOf(D, state, h);
    if (board.length && ap >= apCost(D, 'solo')) out.push({ activity: 'solo', label: 'Mission solo', targets: board.map(m => ({ id: m.id, label: m.name + ' (difficulté ' + m.difficulty + ')' })), cost_ap: apCost(D, 'solo') });
    out.push({ activity: 'expedition', label: 'Expédition', targets: [], cost_ap: apCost(D, 'expedition') });
    if (raidActive(state) && canRaid(h)) out.push({ activity: 'raid', label: 'Raid — monter sur la grille', targets: [], cost_ap: apCost(D, 'raid') });
    else if (threatToday(state) && canDefend(h) && !raidActive(state)) out.push({ activity: 'defend', label: 'Défendre le village', targets: [], cost_ap: apCost(D, 'defend') });
    return out;
  }
  function slotLabel(D, state, s) {
    const t = s.target;
    let tl = '';
    if (s.activity === 'gather' && D.resources[t]) tl = D.resources[t].name;
    else if (s.activity === 'train' && D.attr_names[t]) tl = D.attr_names[t].name;
    else if (s.activity === 'craft' && D.recipes[t]) tl = D.recipes[t].name;
    else if (s.activity === 'solo' && D.solo[t]) tl = D.solo[t].name;
    return activityLabel(s.activity) + (tl ? ' · ' + tl : '');
  }
  function craftsVm(D, h) {
    return D.crafts_list.map(c => { const xp = craftXp(h, c.id), lv = craftLevel(D, xp); return { id: c.id, name: c.name, level: lv, xp: xp, xp_next: craftXpNext(D, lv), bonus_label: craftBonusLabel(D, h, c.id) }; });
  }
  function soloBoardVm(D, state, managerId) {
    return (state.solo_board[managerId] || []).map(id => D.solo[id]).filter(m => !!m).map(m => ({ id: m.id, name: m.name, class_id: m.class_id, class_name: m.class_id ? D.classes[m.class_id].name : null, difficulty: m.difficulty, cost_ap: apCost(D, 'solo'), rewards_label: soloRewardsLabel(D, m), risk_label: soloRiskLabel(m) }));
  }
  function dragonVmState(dr) { return dr.state === 'slain' ? 'slain' : dr.state === 'repelled' ? 'repelled' : dr.state === 'awake' ? 'awake' : 'dormant'; }
  function biomesVm(D, state) {
    return D.raw.biomes.map(b => {
      const DR = D.dragons[b.id] || null, dr = state.dragons[b.id] || { state: 'dormant', next_day: null };
      const left = DR ? DR.legendary_pool.filter(id => state.legendary_given.indexOf(id) < 0).length : 0;
      return { id: b.id, name: b.name, mastery: state.biome_mastery[b.id] || 0, mastery_needed: D.C.dragon_wake_mastery || 8,
        dragon: DR ? { id: DR.id, name: DR.name, state: dragonVmState(dr), next_day: dr.next_day === undefined ? null : dr.next_day, legendary_left: left, raid: raidSheetVm(D, state, DR) } : null };
    });
  }
  // V5 T2 : fiche de raid du dragon (les trois biomes l'ont) — de quoi annoncer le problème tactique avant le réveil.
  function raidSheetVm(D, state, DR) {
    const f = raidTableFor(D, DR.id);
    if (!f || !raidEnabled(D)) return null;
    const active = !!(state.raid && state.raid.dragon_id === DR.id && state.raid.status === 'active');
    return { id: f.id, name: f.name || DR.name, kind: f.kind || 'sylvain', layout_id: f.layout_id,
      hp_base: f.hp_base, hp_per_day: f.hp_per_day, phases: (f.phases || []).slice(), max_nights: (D.raid && D.raid.raid_max_nights) || 0,
      needs: (f.needs || []).slice(), active: active, nights: active ? state.raid.nights : 0,
      hp_pct: active ? div(state.raid.boss.hp * 100, Math.max(1, state.raid.boss.hp_max)) : 100 };
  }
  // V5 T2 : hybride d'un héros pour l'interface (null tant qu'il n'a pas choisi).
  function hybridVm(D, h) {
    const H = h.hybrid ? hybridById(D, h.hybrid) : null;
    if (!H) return null;
    return { id: H.id, name: H.name, resource: H.resource, resource_label: H.resource_label };
  }
  // V5 T3 : spécialisation d'un héros pour l'interface (null tant qu'il n'a pas choisi).
  function specVm(D, h) {
    const S = h.spec ? specById(D, h.spec) : null;
    if (!S) return null;
    return { id: S.id, name: S.name, verb: S.verb, identity: S.identity, distinction: S.distinction,
      spells: specSpellsVm(D, S), answers: answersVm(D, S.answers) };
  }
  function specSpellsVm(D, S) {
    return (S.spells || []).map(id => { const sp = tacticSpell(D, id); return sp
      ? { id: sp.id, name: sp.name, cost_pa: sp.cost_pa, range_label: sp.range_min === sp.range_max ? String(sp.range_max) : sp.range_min + '-' + sp.range_max,
          shape_label: sp.shape && sp.shape !== 'single' ? sp.shape + ' ' + (sp.r || 0) : 'cible', daily: !!sp.daily, effects: (sp.effect_labels || []).slice(), description: sp.description }
      : { id: id, name: id, cost_pa: 0, range_label: '', shape_label: '', daily: false, effects: [], description: '' }; });
  }
  function answersVm(D, ids) {
    return (ids || []).map(rid => { const f = (D.raw.raids || {})[rid]; if (!f) return rid; const dr = f.dragon_id ? dragonById(D, f.dragon_id) : null; return dr ? dr.name : (f.name || rid); });
  }
  // V5 T3 §6.4 : état de la reconversion pour un manager (disponible, coût, échéance, déjà utilisée).
  function respecVm(D, state, managerId) {
    const L = lineageC(D);
    if (!L) return null;
    const h = heroesOf(state, managerId).filter(x => x.spec).sort((a, b) => (a.id < b.id ? -1 : 1))[0];
    const cost = L.respec_cost_gold || 100;
    if (!h) return { available: false, reason: 'aucun héros spécialisé', cost: cost, deadline_day: L.respec_deadline_day, used: 0, adventurer_id: null, options: [] };
    const other = specsForHybrid(D, h.hybrid).filter(S => S.id !== h.spec)[0] || null;
    const why = other ? respecWhy(D, state, h, other.id) : 'aucune autre pointe pour cette voie';
    const hint = respecHint(D, state);
    return { available: !why, reason: why, cost: cost, deadline_day: L.respec_deadline_day, used: h.respec_used || 0,
      adventurer_id: h.id, adventurer_name: heroName(h),
      options: other ? [{ id: other.id, name: other.name, verb: other.verb, identity: other.identity, distinction: other.distinction,
        spells: specSpellsVm(D, other), answers: answersVm(D, other.answers) }] : [],
      hint: hint ? { dragon: hint.dragon, specs: hint.specs.slice(), heroes: hint.heroes.slice(),
        label: hint.dragon + (hint.derby ? ' approche' : ' s\'éveille') + ' : ' + joinFr(hint.specs.slice(0, 3)) + (hint.specs.length > 1 ? ' seraient précieux' : ' serait précieux') + ' (reconversion possible pour ' + joinFr(hint.heroes.slice(0, 3)) + ').' } : null };
  }
  // V5 T2 : proposition de voie en attente pour un manager (une carte par hybride ouvert, §6.2).
  function choiceVm(D, state, managerId) {
    const L = lineageC(D);
    if (!L) return null;
    const h = heroesOf(state, managerId).filter(x => !x.hybrid && x.hybrid_offer_day !== null && x.hybrid_offer_day !== undefined && hybridReady(D, state, x) && hybridsForClass(D, x.class_id).length)
      .sort((a, b) => (a.id < b.id ? -1 : 1))[0];
    if (!h) return specChoiceVm(D, state, managerId);
    const ranked = rankHybrids(D, state, h);
    let maxAff = 0;
    for (const r of ranked) if (r.affinity > maxAff) maxAff = r.affinity;
    const best = ranked.length ? ranked[0].id : null;
    return { kind: 'hybrid', adventurer_id: h.id, adventurer_name: heroName(h),
      deadline_day: h.hybrid_offer_day + L.hybrid_auto_days,
      options: ranked.map(r => ({ id: r.id, name: r.hybrid.name, identity: r.hybrid.identity, verb: r.hybrid.verb || '',
        resource: r.hybrid.resource, resource_label: r.hybrid.resource_label, mechanic: r.hybrid.mechanic,
        affinity: r.affinity, affinity_max: L.affinity_max, resource_bonus: r.affinity > 0 && r.affinity >= maxAff ? L.affinity_resource_bonus : 0,
        recommended: r.id === best,
        spells: (r.hybrid.spells || []).map(id => { const sp = tacticSpell(D, id); return sp ? { id: sp.id, name: sp.name, cost_pa: sp.cost_pa, range_label: sp.range_min === sp.range_max ? String(sp.range_max) : sp.range_min + '-' + sp.range_max, description: sp.description } : { id: id, name: id, cost_pa: 0, range_label: '', description: '' }; }),
        answers: (r.hybrid.answers || []).map(rid => { const f = (D.raw.raids || {})[rid]; const dr = f ? dragonById(D, f.dragon_id) : null; return dr ? dr.name : rid; }) })) };
  }
  // V5 T3 : proposition de spécialisation en attente (deux cartes, la recommandation vient du besoin du groupe).
  function specChoiceVm(D, state, managerId) {
    const L = lineageC(D);
    if (!L || !(D.raw.specs || []).length) return null;
    const h = heroesOf(state, managerId).filter(x => !x.spec && x.spec_offer_day !== null && x.spec_offer_day !== undefined && specReady(D, state, x))
      .sort((a, b) => (a.id < b.id ? -1 : 1))[0];
    if (!h) return null;
    const ranked = rankSpecs(D, state, h);
    const best = ranked.length ? ranked[0].id : null;
    const G = groupNeeds(D, state);
    const colName = id => { const c = G.columns.filter(x => x.id === id)[0]; return c ? c.name : id; };
    return { kind: 'spec', adventurer_id: h.id, adventurer_name: heroName(h),
      hybrid: { id: h.hybrid, name: (hybridById(D, h.hybrid) || { name: h.hybrid }).name },
      deadline_day: h.spec_offer_day + (L.spec_auto_days || 2),
      options: ranked.map(r => ({ id: r.id, name: r.spec.name, identity: r.spec.identity, verb: r.spec.verb, distinction: r.spec.distinction,
        need: r.spec.need, need_label: colName(r.spec.need), taken: r.taken, recommended: r.id === best,
        spells: specSpellsVm(D, r.spec), answers: answersVm(D, r.spec.answers) })) };
  }
  // V5 T2 : besoins du groupe en clair (§6.2) — les deux colonnes les plus basses.
  function groupNeedsVm(D, state) {
    const G = groupNeeds(D, state);
    if (!G.columns.length) return null;
    return { columns: G.columns.map(c => ({ id: c.id, name: c.name, value: c.value, filled_pct: c.filled })),
      missing: G.missing.slice(), missing_labels: G.labels.slice(),
      label: G.labels.length ? 'Ce qui manque à la table : ' + joinFr(G.labels) + '.' : '' };
  }
  function villageVm(D, state) {
    const idx = clamp(state.village_age || 0, 0, D.ages.length - 1), age = D.ages[idx], next = D.ages[idx + 1] || null;
    return { age_index: idx, age_id: age.id, age_name: age.name, age_description: age.description, defense: age.defense, guards: age.guards,
      next_age: next ? { id: next.id, name: next.name, prestige_min: next.prestige_min, levels_min: next.levels_min, prestige_have: state.guild.prestige, levels_have: buildingLevelsSum(state) } : null,
      graves: state.graves.map(g => ({ name: g.name, day: g.day, cause: g.cause })),
      trophies: state.trophies.map(t => ({ dragon_name: (dragonById(D, t.dragon_id) || { name: t.dragon_id }).name, day: t.day })),
      hall_level: bLevel(D, state, 'hall') };
  }
  function threatVm(D, state, plans) {
    const T = D.threats;
    if (!T) return null;
    if (raidActive(state)) {                     // V5 : menace en cours de raid (phase 'raid'), du présage à l'issue
      const R = state.raid, DR = dragonById(D, R.dragon_id), age = villageAge(D, state);
      let planned = 0;
      for (const m of sortedKeys(plans)) for (const a of plans[m]) if ((a.type === 'assign' && a.payload.activity === 'raid') || (a.type === 'plan' && a.payload.slots.some(s => s.activity === 'raid'))) planned++;
      return { type: 'dragon', name: DR ? DR.name : R.name, phase: 'raid', day: R.day_start, description: DR ? DR.description : '', defense_estimate: Math.min(100, age.defense + 5 * age.guards), defenders_planned: planned,
        biome_id: DR ? DR.biome : null, biome_name: DR && D.biomes[DR.biome] ? D.biomes[DR.biome].name : null, dragon_id: R.dragon_id,
        raid: { nights: R.nights, max_nights: D.raid.raid_max_nights, hp_pct: div(R.boss.hp * 100, Math.max(1, R.boss.hp_max)), status: R.status, day_start: R.day_start } };
    }
    const today = threatToday(state);
    const t = today || (state.threats || []).filter(x => x.presage_day === state.day && x.outcome === null)[0] || null;
    if (!t || !T[t.type]) return null;
    const DR = D.dragons[t.biome] || null;
    const age = villageAge(D, state);
    let planned = 0;
    if (today) { for (const m of sortedKeys(plans)) for (const a of plans[m]) if ((a.type === 'assign' && a.payload.activity === 'defend') || (a.type === 'plan' && a.payload.slots.some(s => s.activity === 'defend'))) planned++; }
    else planned = plannedDefenders(D, state);
    return { type: t.type, name: DR ? DR.name : T[t.type].name, phase: today ? 'today' : 'presage', day: t.day, description: DR ? DR.description : T[t.type].description,
      defense_estimate: Math.min(100, age.defense + 5 * age.guards), defenders_planned: planned,
      biome_id: t.biome || null, biome_name: t.biome && D.biomes[t.biome] ? D.biomes[t.biome].name : null, dragon_id: DR ? DR.id : null };
  }
  function rosterVm(D, state, managerId, planned, plannedSlots) {
    return allHeroes(state).map(h => {
      const inv = state.inventories[h.owner];
      const cls = D.classes[h.class_id];
      const slots = plannedSlots[h.id] || [];
      return {
        id: h.id, name: heroName(h), class_id: h.class_id, class_name: cls.name, class_glyph: cls.glyph, manager_id: h.owner, manager_name: managerName(state, h.owner),
        level: h.level, xp: h.xp, xp_next: xpNext(D, h),
        attributes: D.attrs.map(a => ({ id: a, name: D.attr_names[a].name, value: attrEff(D, h, a) })),
        form: h.form, fatigue: h.fatigue, morale: h.morale,
        injury: h.injury.severity > 0 ? { days: h.injury.days_left, label: ['', 'Blessure légère', 'Blessure moyenne', 'Blessure grave'][h.injury.severity] } : null,
        traits: h.traits.map(t => ({ id: t, name: D.traits[t].name })),
        skills: (D.skills_by_class[h.class_id] || []).map(s => ({ id: s.id, name: s.name, level_req: s.unlock_level, unlocked: h.level >= s.unlock_level })),
        equipment: D.raw.slots.map(s => { const uid = h.equipment[s.id]; const it = uid ? inv.items.filter(x => x.uid === uid)[0] : null; return { slot: s.id, slot_name: s.name, item_name: it ? D.items[it.item_id].name : null, rarity: it ? D.items[it.item_id].rarity : null }; }),
        activity_options: activityOptions(D, state, h),
        planned: planned[h.id] || null, status_label: statusLabel(h), is_available: h.injury.severity < 2 && h.fatigue < 100, is_mine: h.owner === managerId,
        ap_max: apMax(D, state, h), ap_today: apToday(D, state, h),
        slots_planned: slots.map(s => ({ activity: s.activity, target: s.target === undefined ? null : s.target, label: slotLabel(D, state, s) })),
        presets: presetsFor(D, state, h).map(p => ({ id: p.id, label: p.label, slots: p.slots.map(s => ({ activity: s.activity, target: s.target === undefined ? null : s.target })), available: p.available, reason: p.reason })),
        crafts: craftsVm(D, h), is_dead: false,
        hybrid: hybridVm(D, h), spec: specVm(D, h)
      };
    });
  }
  function viewModel(state, managerId, dataArg) {
    const data = dataOf(state, dataArg);
    if (!data) return { error: NO_DATA };
    remember(dataArg);
    const D = index(data);
    const me = managerOf(state, managerId) || state.managers[0];
    managerId = me.id;
    const plans = {}, voteQ = {}, voteB = {}, mineQ = {}, mineB = {}, planned = {}, plannedSlots = {};
    for (const m of state.managers) {
      plans[m.id] = planDefaults(state, m.id);
      for (const a of plans[m.id]) {
        if (a.type === 'vote_quest') { voteQ[a.payload.quest_id] = (voteQ[a.payload.quest_id] || 0) + 1; if (m.id === managerId) mineQ[a.payload.quest_id] = true; }
        if (a.type === 'vote_build') { voteB[a.payload.building_id] = (voteB[a.payload.building_id] || 0) + 1; if (m.id === managerId) mineB[a.payload.building_id] = true; }
        if (a.type === 'assign' && m.id === managerId) { planned[a.payload.adventurer_id] = { activity: a.payload.activity, target: a.payload.target || null }; plannedSlots[a.payload.adventurer_id] = slotsOfAssign(D, state, state.heroes[a.payload.adventurer_id], a.payload.activity, a.payload.target || null); }
        if (a.type === 'plan' && m.id === managerId) { const sl = a.payload.slots; planned[a.payload.adventurer_id] = sl.length ? { activity: sl[0].activity, target: sl[0].target || null } : { activity: 'rest', target: null }; plannedSlots[a.payload.adventurer_id] = sl; }
      }
    }
    const inv = state.inventories[managerId];
    const equipped = equippedUids(state, managerId);
    const sellPct = D.C.market_sell_pct[bLevel(D, state, 'market')];
    const forgeLv = bLevel(D, state, 'forge');
    const nextDerby = D.C.derby_days.filter(d => d >= state.day)[0];
    const upkeep = dailyUpkeep(D, state);
    return {
      day: state.day, season_length: state.season_length, seed: state.seed, hash: hashState(state), is_season_over: state.day > state.season_length || !!state.collapsed,
      manager: { id: me.id, name: me.name, kind: me.kind, gold: state.purses[me.id] },
      managers: state.managers.map(m => ({ id: m.id, name: m.name, kind: m.kind, profile_label: m.kind === 'ai' ? D.profiles[m.profile].label : 'Humain', gold: state.purses[m.id], adventurer_count: heroesOf(state, m.id).length })),
      guild: { gold: state.guild.gold, prestige: state.guild.prestige, upkeep_per_day: upkeep, storage_capacity: warehouseCap(D, state), storage_used: warehouseUsed(state),
        storage: D.raw.resources.map(r => ({ resource_id: r.id, name: r.name, glyph: r.glyph, qty: state.warehouse[r.id] || 0, value: r.sell })),
        chest: state.guild_chest.map(x => ({ item_id: x.item_id, name: D.items[x.item_id] ? D.items[x.item_id].name : x.item_id, rarity: D.items[x.item_id] ? D.items[x.item_id].rarity : 'common' })) },
      roster: rosterVm(D, state, managerId, planned, plannedSlots),
      solo_board: soloBoardVm(D, state, managerId), biomes: biomesVm(D, state),
      choice: choiceVm(D, state, managerId), group_needs: groupNeedsVm(D, state), respec: respecVm(D, state, managerId), defeat: state.collapsed ? { day: state.collapsed.day, reason: state.collapsed.reason } : null,
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
      village: villageVm(D, state), threat: threatVm(D, state, plans),
      raid: raidActive(state) && TACTIC ? TACTIC.raidView(state, managerId, raidEnvOf(D, state, null)) : null,
      raid_history: (state.raid_history || []).map(r => ({ id: r.id, dragon_name: (dragonById(D, r.dragon_id) || { name: r.dragon_id }).name, day_start: r.day_start, day_end: r.day_end, status: r.status, nights: r.nights, passes: r.passes, ko: r.ko })),
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

  return { newGame: newGame, attach: attach, listManagers: listManagers, planDefaults: planDefaults, validateAction: validateAction, resolveDay: resolveDay, hashState: hashState, viewModel: viewModel,
    _internal: { makeRng: makeRng, fnvStr: fnvStr, fnvU32: fnvU32, canonical: canonical, combatProfile: combatProfile, probeExpedition: probeExpedition,
      apToday: function (state, h) { return apToday(index(state.__data || GLOBAL_DATA), state, h); }, craftLevel: function (state, xp) { return craftLevel(index(state.__data || GLOBAL_DATA), xp); },
      tactic: TACTIC, previewCast: TACTIC ? TACTIC.previewCast : null, raidEnvOf: function (state, raiders, day) { return raidEnvOf(index(state.__data || GLOBAL_DATA), state, raiders || null, day); },
      raidDefaults: function (state, managerId) { return TACTIC ? TACTIC.raidDefaults(state, managerId, raidEnvOf(index(state.__data || GLOBAL_DATA), state, null)) : []; } } };
}));
