/* Chroniques de Guilde — module tactique V5 T1+T2 (UMD, pur, aucune dépendance).
 * Date : 2026-09-18. Source : V5_SPEC.md §1 (grille et règles), §2.1 (Sylvain), §2.2 (Drake des monts), §2.3 (Hydre des marais),
 * §3 (six classes de base), §4 (treize hybrides de la vague A), §7 (contrat technique : état state.raid, API), §8 T1 et T2. Entiers partout, mulberry32 (même algorithme que sim.js) sur un flux
 * RNG propre au raid sérialisé dans state.raid (rng_s / rng_count). Toute itération sur des unités se fait par id ASCII,
 * sur des cases par index croissant. Chaque fonction publique retourne un nouvel état (l'entrée n'est jamais mutée).
 *
 * Contrat d'appel : les fonctions publiques reçoivent `env` construit par sim.js (raidEnvOf) :
 *   env = { data, day, seed, managers:[{id,name}], heroes:{ id:{ id,name,owner,class_id,level,gender,hp_max,atk,def,heal,crit,spd,
 *           magic,morale,fatigue,dexterity,vigor,traits,injury_severity } }, wall_shield_pct:int }
 * Actions d'un passage : { type:'move', to:{x,y} } · { type:'cast', spell_id, x, y } · { type:'end_turn' } · { type:'end_pass' }.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GuildeTactic = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ===================================================================================
  // 0. PRIMITIVES ENTIÈRES, RNG (identique à sim.js), HACHAGE DE CHAÎNES
  // ===================================================================================
  function div(a, b) { return Math.trunc(a / b); }
  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
  function pct(x, p) { return div(x * p, 100); }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function sortedKeys(o) { return Object.keys(o).sort(); }
  function utf8Bytes(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c >= 0xD800 && c < 0xDC00 && i + 1 < str.length) { const d = str.charCodeAt(i + 1); if (d >= 0xDC00 && d < 0xE000) { c = 0x10000 + ((c - 0xD800) << 10) + (d - 0xDC00); i++; } }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }
  function fnvBytes(h, bytes) { for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
  function fnvStr(str) { return fnvBytes(0x811C9DC5, utf8Bytes(str)); }
  function fnvU32(v) { v = v >>> 0; return fnvBytes(0x811C9DC5, [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]); }
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
    return rng;
  }
  function rngOf(R) { const r = makeRng(R.rng_s); r.count = R.rng_count; return r; }
  function saveRng(R, r) { R.rng_s = r.s >>> 0; R.rng_count = r.count; }
  function fill(tpl, vars) { return tpl.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k]))); }
  function tplKind(R, base) { return R && R.kind === 'derby' ? 'derby_' + base : base; }      // V5 T3 : le gué a ses propres formulations
  function tplOf(data, kind, salt, vars) {
    const list = data.templates && data.templates[kind];
    if (!list || !list.length) return '';
    return fill(list[fnvStr(kind + '|' + salt) % list.length], vars || {});
  }
  function joinFr(list) { if (!list.length) return 'personne'; if (list.length === 1) return list[0]; return list.slice(0, -1).join(', ') + ' et ' + list[list.length - 1]; }

  // ===================================================================================
  // 1. GRILLE : cases, distance, ligne de vue, formes, chemins
  // ===================================================================================
  const FLOOR = 0, WALL = 1, WATER = 2, PIT = 3;
  const WALL_HP = 120;                              // V5 T3b : PV du bouclier planté (mur_heros) — lus par wearHeroWalls, plus une valeur morte
  function cidx(G, x, y) { return y * G.w + x; }
  function inb(G, x, y) { return x >= 0 && y >= 0 && x < G.w && y < G.h; }
  function manhattan(ax, ay, bx, by) { return Math.abs(ax - bx) + Math.abs(ay - by); }
  function dirOf(sx, sy, tx, ty) {
    const dx = tx - sx, dy = ty - sy;
    if (dx === 0 && dy === 0) return { x: 0, y: 1 };
    if (Math.abs(dx) >= Math.abs(dy)) return { x: dx > 0 ? 1 : -1, y: 0 };
    return { x: 0, y: dy > 0 ? 1 : -1 };
  }
  // Bresenham entier de a vers b ; vrai si aucune case bloquante strictement entre les extrémités.
  function bresClear(G, blocked, x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, x = x0, y = y0, guard = 0;
    while (guard++ < 64) {
      if (!(x === x0 && y === y0) && !(x === x1 && y === y1) && blocked(cidx(G, x, y))) return false;
      if (x === x1 && y === y1) return true;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    return true;
  }
  // LdV symétrique par construction : libre dans les deux sens.
  function hasLos(G, blocked, ax, ay, bx, by) { return bresClear(G, blocked, ax, ay, bx, by) && bresClear(G, blocked, bx, by, ax, ay); }
  function cellsSorted(G, list) {
    const seen = {}, out = [];
    for (const c of list) { if (!inb(G, c.x, c.y)) continue; const k = cidx(G, c.x, c.y); if (seen[k]) continue; seen[k] = 1; out.push({ x: c.x, y: c.y }); }
    out.sort((a, b) => cidx(G, a.x, a.y) - cidx(G, b.x, b.y));
    return out;
  }
  // Formes §1.4 : offsets Manhattan autour de la cible ; formes directionnelles orientées par source→cible.
  function shapeCells(G, shape, r, sx, sy, tx, ty) {
    const out = [];
    const d = dirOf(sx, sy, tx, ty), p = { x: -d.y, y: d.x };
    if (shape === 'single') out.push({ x: tx, y: ty });
    else if (shape === 'circle' || shape === 'ring' || shape === 'cross') {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const m = Math.abs(dx) + Math.abs(dy);
        if (m > r) continue;
        if (shape === 'ring' && m !== r) continue;
        if (shape === 'cross' && dx !== 0 && dy !== 0) continue;
        out.push({ x: tx + dx, y: ty + dy });
      }
    } else if (shape === 'line') { for (let i = 0; i < r; i++) out.push({ x: tx + d.x * i, y: ty + d.y * i }); }
    else if (shape === 'cone') { for (let a = 1; a <= r; a++) for (let b = -(a - 1); b <= a - 1; b++) out.push({ x: sx + d.x * a + p.x * b, y: sy + d.y * a + p.y * b }); }
    else if (shape === 'cone_at') { out.push({ x: tx, y: ty }); for (let a = 1; a <= r; a++) for (let b = -a; b <= a; b++) out.push({ x: tx + d.x * a + p.x * b, y: ty + d.y * a + p.y * b }); }
    else if (shape === 'wall3') { for (let b = -1; b <= 1; b++) out.push({ x: tx + p.x * b, y: ty + p.y * b }); }
    return cellsSorted(G, out);
  }

  // ===================================================================================
  // 2. ÉTAT DU RAID : accès, unités, zones, états
  // ===================================================================================
  function gridOf(R) { return { w: R.grid_w, h: R.grid_h }; }
  function bossCells(B) { const out = []; for (let dy = 0; dy < B.h; dy++) for (let dx = 0; dx < B.w; dx++) out.push({ x: B.x + dx, y: B.y + dy }); return out; }
  function isBossCell(B, x, y) { return B.alive !== false && x >= B.x && x < B.x + B.w && y >= B.y && y < B.y + B.h; }
  function bossNearestCell(B, x, y) {
    let best = null, bd = 0;
    for (const c of bossCells(B)) { const d = manhattan(c.x, c.y, x, y); if (best === null || d < bd || (d === bd && (c.y < best.y || (c.y === best.y && c.x < best.x)))) { best = c; bd = d; } }
    return best;
  }
  function distToBoss(B, x, y) { const c = bossNearestCell(B, x, y); return manhattan(c.x, c.y, x, y); }
  function unitAt(R, x, y) { for (const u of R.units) if (u.x === x && u.y === y) return u; return null; }
  function unitById(R, id) { for (const u of R.units) if (u.id === id) return u; return null; }
  function zoneAt(R, x, y) { const z = R.zones[String(cidx(gridOf(R), x, y))]; return z || null; }
  function layoutAt(R, x, y) { return R.layout[cidx(gridOf(R), x, y)]; }
  function blocksLos(R, i) {
    const z = R.zones[String(i)];
    if (R.layout[i] === WALL || (z && (z.zone_id === 'mur_glace' || z.zone_id === 'mur_terre' || z.zone_id === 'mur_heros'))) return true;
    const G = gridOf(R), u = unitAt(R, i % G.w, div(i, G.w));         // une recrue en Formation fait mur (ligne de vue et souffles)
    return !!(u && hasState(u, 'formation'));
  }
  function passable(R, x, y) {
    if (!inb(gridOf(R), x, y)) return false;
    const k = layoutAt(R, x, y);
    if (k === WALL || k === PIT) return false;
    const z = zoneAt(R, x, y);
    if (z && (z.zone_id === 'mur_glace' || z.zone_id === 'mur_terre' || z.zone_id === 'mur_heros')) return false;
    return true;
  }
  function freeCell(R, x, y) { return passable(R, x, y) && !unitAt(R, x, y) && !isBossCell(R.boss, x, y); }
  function heroUnit(R) { return R.pass ? unitById(R, R.pass.hero_id) : null; }
  function hasState(u, id) { for (const s of u.states) if (s.id === id) return true; return false; }
  function stateOf(u, id) { for (const s of u.states) if (s.id === id) return s; return null; }
  function stateVal(u, id) { const s = stateOf(u, id); return s ? s.value : 0; }
  function removeState(u, id) { u.states = u.states.filter(s => s.id !== id); }
  // Pose d'un état : marque = la plus longue reste ; poison cumulable ×3 ; sinon la durée la plus longue et la valeur la plus haute.
  function addState(u, id, turns, value) {
    const s = stateOf(u, id);
    if (!s) { u.states.push({ id: id, turns: turns, value: value || 0 }); u.states.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)); return; }
    if (id === 'poison') { s.value = Math.min(3, (s.value || 1) + 1); s.turns = Math.max(s.turns, turns); return; }
    s.turns = Math.max(s.turns, turns);
    if ((value || 0) > (s.value || 0)) s.value = value;
  }
  function tickStates(u) {
    const keep = [];
    for (const s of u.states) { s.turns -= 1; if (s.turns > 0 || s.turns === -1) keep.push(s); }
    u.states = keep;
    if (u.shield_turns > 0) { u.shield_turns -= 1; if (u.shield_turns === 0) u.shield = 0; }
  }
  function unitsSorted(R) { return R.units.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)); }
  function guildUnits(R) { return unitsSorted(R).filter(u => u.side === 'guild'); }
  function addUnits(R) { return unitsSorted(R).filter(u => u.side === 'boss'); }
  function summonsOf(R, heroId) { return guildUnits(R).filter(u => u.kind === 'summon' && u.master_id === heroId); }
  function raidC(env) { return env.data.raid; }
  function fiche(R, env) { return env.data.raids[R.id]; }
  function isAlive(u) { return u.hp > 0; }

  // ===================================================================================
  // 3. CHEMINS (Dijkstra entier, 4-voisinage, départage coût puis y puis x) et déplacements
  // ===================================================================================
  function moveCost(R, u, x, y, avoid) {
    if (u.fly) return 1;                                                   // V5 T3 Fauconnier : le faucon ignore eau et zones
    let c = layoutAt(R, x, y) === WATER ? 2 : 1;
    const z = zoneAt(R, x, y);
    const light = hasState(u, 'pas_leger');                                  // V5 T3 : Pèlerin — les zones du boss ne coûtent rien
    if (z && z.zone_id === 'roots' && !light) c += 1;
    if (z && z.zone_id === 'cendres' && !light) c += 1;
    if (z && z.owner_kind === 'boss' && light) return Math.max(1, c);
    if (z && z.zone_id === 'sentier') c += (u.side === 'guild' ? -1 : 1);   // Ermite : −1 PM pour les alliés, +1 pour les ennemis
    if (z && z.owner_kind === 'boss' && u.side === 'guild' && (avoid || u.kind !== 'hero')) c += 99;   // politique : jamais d'entrée volontaire sur une zone de boss
    if (hasState(u, 'entrave')) c += 1;
    return Math.max(1, c);
  }
  // Renvoie {cost:{idx:int}, prev:{idx:idx}} pour toutes les cases atteignables (unités et corps du boss bloquent).
  // avoid = évitement des zones de boss (politique par défaut et IA des invocations) ; les règles de coût réelles n'en tiennent pas compte.
  function dijkstra(R, u, fx, fy, limit, avoid) {
    const G = gridOf(R), n = G.w * G.h, cost = {}, prev = {}, done = {};
    const start = cidx(G, fx, fy);
    cost[start] = 0;
    let guard = 0;
    while (guard++ < n + 1) {
      let best = -1;
      for (let i = 0; i < n; i++) if (cost[i] !== undefined && !done[i] && (best < 0 || cost[i] < cost[best])) best = i;   // départage : coût puis index (y puis x)
      if (best < 0) break;
      done[best] = 1;
      if (cost[best] > limit) continue;
      const bx = best % G.w, by = div(best, G.w);
      const nb = [{ x: bx, y: by - 1 }, { x: bx - 1, y: by }, { x: bx + 1, y: by }, { x: bx, y: by + 1 }];
      for (const c of nb) {
        if (!freeCell(R, c.x, c.y)) continue;
        const i = cidx(G, c.x, c.y), nc = cost[best] + moveCost(R, u, c.x, c.y, avoid);
        if (nc > limit) continue;
        if (cost[i] === undefined || nc < cost[i] || (nc === cost[i] && prevBetter(prev, best, i))) { cost[i] = nc; prev[i] = best; }
      }
    }
    delete cost[start]; delete prev[start];
    return { cost: cost, prev: prev, start: start };
  }
  function prevBetter(prev, cand, i) { return prev[i] === undefined ? true : cand < prev[i]; }
  function pathTo(P, target) {
    const out = [];
    let cur = target, guard = 0;
    while (cur !== undefined && cur !== P.start && guard++ < 200) { out.push(cur); cur = P.prev[cur]; }
    if (cur !== P.start) return null;
    return out.reverse();
  }
  // Déplacement effectif le long d'un chemin : racines (immobilise + arrêt), pièges (adds), spores (poison), sanctuaire (rien).
  function walkPath(R, env, u, path, log) {
    const G = gridOf(R);
    let spent = 0, stopped = false;
    u.__ported = 0;                                                        // V5 T3 : un seul passage de portail par déplacement
    for (const i of path) {
      const x = i % G.w, y = div(i, G.w);
      if (!freeCell(R, x, y)) break;
      spent += moveCost(R, u, x, y);
      u.x = x; u.y = y;
      const z = zoneAt(R, x, y);
      if (z && enterZone(R, env, u, z, log)) { stopped = true; break; }
    }
    return spent;
  }
  function enterZone(R, env, u, z, log) {
    const C = raidC(env);
    if (hasState(u, 'avatar') && z.owner_kind === 'boss') return false;     // V5 T3 15A : l'Avatar ignore les zones du boss
    // V5 T3 — Portier : deux cases liées ; un allié qui entre sur l'une ressort sur l'autre (une fois par pas).
    if (z.zone_id === 'portail' && u.side === 'guild' && !u.__ported) {
      const G = gridOf(R);
      for (const k of sortedKeys(R.zones)) {
        const o = R.zones[k];
        if (o.zone_id !== 'portail' || o.link_id !== z.link_id || o === z) continue;
        const ox = Number(k) % G.w, oy = div(Number(k), G.w);
        if (!freeCell(R, ox, oy)) break;
        u.x = ox; u.y = oy; u.__ported = 1;
        mech(R, 'portail');
        log.push(u.name + ' entre dans le portail et ressort en (' + ox + ',' + oy + ').');
        return true;                                                      // le pas s'arrête à la sortie du portail
      }
    }
    if (z.zone_id === 'roots' && u.side === 'guild' && hasState(u, 'pas_leger')) { log.push(u.name + ' marche au-dessus des racines.'); return false; }
    if (z.zone_id === 'cendres' && u.side === 'guild' && hasState(u, 'pas_leger')) return false;
    if (z.zone_id === 'roots' && u.side === 'guild') {
      addState(u, 'immobilise', 1, 0);
      damageFlat(R, env, u, C.roots_damage || 8, log, 'les racines');
      log.push(fill(u.name + ' entre dans les racines : immobilisé{e}, ' + (C.roots_damage || 8) + ' dégâts.', { e: u.gender === 'f' ? 'e' : '' }));
      return true;
    }
    if (z.zone_id === 'spores' && u.side === 'guild') { addState(u, 'poison', 3, 1); log.push(u.name + ' respire les spores : poison.'); return false; }
    if (z.zone_id === 'cendres' && u.side === 'guild') { const f = fiche(R, env); damageFlat(R, env, u, f.ash_damage || 12, log, 'les cendres'); log.push(u.name + ' traverse les cendres : ' + (f.ash_damage || 12) + ' dégâts.'); return false; }
    if (z.zone_id === 'venin' && u.side === 'guild') { addState(u, 'poison', 3, 1); log.push(u.name + ' patauge dans le venin : poison.'); return false; }
    if (z.zone_id === 'feu' && u.side === 'boss') { addState(u, 'brule', 2, 0); const b = stateOf(u, 'brule'); b.level = z.level || 1; log.push(u.name + ' prend feu.'); return false; }
    if (z.zone_id === 'esprit_garde' && u.side === 'guild' && u.shield < (z.power || 25)) { addShield(u, (z.power || 25) - u.shield, 2); log.push('L\'esprit gardien couvre ' + u.name + ' (bouclier ' + (z.power || 25) + ').'); return false; }
    if (z.zone_id === 'piege' && u.side === 'boss') {
      const dmg = damageFromPower(R, env, { atk_eff: z.value, level: z.level || 1, crit: 0 }, u, z.power || 80, { magic: false }, null, log, 'le piège de ' + (z.owner_name || 'la guilde'));
      addState(u, 'immobilise', z.heavy ? 2 : 1, 0);      // V5 T3 10B : le piège lourd cloue deux tours
      delete R.zones[String(cidx(gridOf(R), u.x, u.y))];
      log.push(tplOf(env.data, 'raid_trap', u.id + R.rng_count, { t: u.name, a: z.owner_name || 'la guilde', n: dmg }));
      if (z.linked) {                                   // Fil de fer (Traqueur) : le second piège relié part aussi
        for (const k of sortedKeys(R.zones)) {
          const o = R.zones[k];
          if (o.zone_id !== 'piege' || !o.linked || o.source_id !== z.source_id) continue;
          damageFromPower(R, env, { atk_eff: o.value, level: o.level || 1, crit: 0 }, u, o.power || 80, { magic: false }, null, log, 'le fil de fer de ' + (o.owner_name || 'la guilde'));
          delete R.zones[k];
          log.push('Le fil de fer se tend : le second piège se referme sur ' + u.name + '.');
          break;
        }
      }
      return true;
    }
    return false;
  }

  // ===================================================================================
  // 4. DÉGÂTS, SOINS, BOUCLIERS, POUSSÉES, CONTRÔLE
  // ===================================================================================
  function moraleMod(m) { return m < 30 ? 90 : m < 70 ? 100 : 105; }
  function fatigueAtkMod(f) { return f < 60 ? 100 : f < 80 ? 90 : 75; }
  function isBoss(t) { return t && t.kind === 'boss'; }
  function defEff(t, tags) {
    let d = t.def;
    if (tags && tags.magic) d = div(d, 2);
    if (tags && tags.ignore_half) d = div(d, 2);
    if (hasState(t, 'chancelant')) d = div(d, 2);
    d -= stateVal(t, 'hantise');                // V5 T3 §5.2 9A : la hantise du Médium retire 10 de DÉF
    d -= 5 * (t.fissures || 0);                 // §2.2 : chaque fissure retire 5 de DÉF (persistante)
    return Math.max(0, d);
  }
  // Dégâts min/max sans critique (aperçu) et formule commune.
  function rawOf(atkEff, power, variance) { return Math.max(1, pct(pct(atkEff, power), variance)); }
  function dmgOf(raw, def) { return div(raw * raw, raw + def); }
  function takenMods(t, dmg) {
    if (hasState(t, 'marque')) dmg = pct(dmg, 120);
    if (hasState(t, 'chancelant')) dmg = pct(dmg, 130);
    if (t.kind === 'hero' && t.passive === 'provocation_innee') dmg = pct(dmg, 90);
    if (t.kind === 'hero' && t.passive === 'presence') dmg = pct(dmg, 90);
    const red = stateVal(t, 'reduction');
    if (red) dmg = Math.max(1, dmg - red);
    return dmg;
  }
  // Application finale : bouclier puis PV. Renvoie les dégâts effectivement retirés au bouclier + PV.
  function applyHit(R, env, src, t, dmg, log, srcLabel) {
    dmg = Math.max(0, dmg);
    if (dmg > 0 && t.kind === 'hero' && hasState(t, 'feinte')) { removeState(t, 'feinte'); log.push(t.name + ' feinte : le coup passe à côté.'); return 0; }
    let left = dmg;
    if (t.shield > 0) { const a = Math.min(t.shield, left); t.shield -= a; left -= a; if (isBoss(t)) R.stats.shield_absorbed = (R.stats.shield_absorbed || 0) + a; if (t.shield === 0 && isBoss(t) && t.phase >= 3 && a > 0) onShieldBroken(R, env, t, log); }
    t.hp = Math.max(0, t.hp - left);
    if (isBoss(t) && t.heads) damageHead(R, env, t, dmg, src, log);                     // §2.3 : le corps et la gueule engagée saignent ensemble
    if (t.kind === 'hero') { t.hit_this_turn = 1; onHeroHit(R, env, t, dmg, log); }     // Ferveur (Paladin), Stigmate (Inquisiteur), Ombre (Traqueur)
    if (src && src.kind === 'hero') R.damage_total[src.id] = (R.damage_total[src.id] || 0) + dmg;
    else if (src && src.kind === 'summon' && src.master_id && t.side === 'boss') R.damage_total[src.master_id] = (R.damage_total[src.master_id] || 0) + dmg;   // les invocations comptent pour leur maître
    if (t.hp <= 0) onZero(R, env, t, src, log, srcLabel);
    return dmg;
  }
  function damageFlat(R, env, t, n, log, srcLabel) { return applyHit(R, env, null, t, takenMods(t, n), log, srcLabel); }
  // ---- V5 T3b (2026-09-19) : l'Assassin est un FINISSEUR, pas un second burst ----
  // Sa force vient des PV MANQUANTS de la cible. « Curée » (passive de la spé, data.specs.assassin.passive) multiplie
  // TOUS ses dégâts contre l'ennemi : full_pct sur une cible intacte (< 100 %, c'est le prix de sa spécialité),
  // + step_pct par tranche de dix pour cent de réserve perdue. « Lame dans le dos » suit la même pente, et sous le
  // seuil exec_hp_pct elle achève un rejeton ou double son coup sur un monstre (un boss ne s'achève jamais d'un mot).
  function missingTenths(t) {
    if (!t || !(t.hp_max > 0)) return 0;
    return clamp(div(div(Math.max(0, t.hp_max - Math.max(0, t.hp)) * 100, t.hp_max), 10), 0, 10);
  }
  function assassinPassive(env) {
    const S = specOf(env, 'assassin');
    const P = (S && S.passive) || null;
    return { full: P ? P.full_pct : 100, step: P ? P.step_pct : 0 };
  }
  function assassinCurePct(env, t) { const P = assassinPassive(env); return P.full + P.step * missingTenths(t); }
  function assassinBlade(env) {
    const s = spellsIndex(env).lame_dos || {};
    return { base: s.power || 0, step: s.exec_step || 0, back: s.exec_back || 0,
      low_pct: s.exec_hp_pct || 0, boss_pct: s.exec_boss_pct || 100 };
  }
  function assassinLow(env, t) { const B = assassinBlade(env); return !!t && t.hp * 100 <= t.hp_max * B.low_pct; }
  // Coup d'un attaquant (héros, invocation, add, piège) : variance + critique (RNG du raid) ; boss = valeur fixe (télégraphe exact).
  function damageFromPower(R, env, src, t, power, tags, spell, log, srcLabel) {
    let raw, crit = false;
    if (src.kind === 'boss') {
      raw = Math.max(1, pct(pct(src.atk, power), 100 + (R.enrage_pct || 0)));
    } else {
      const rng = rngOf(R);
      raw = rawOf(src.atk_eff, power, 90 + rng.roll(21));
      const immune = critImmune(R, env, t);
      const sure = src.kind === 'hero' && src.hybrid_id === 'traqueur' && (src.res || 0) >= (src.res_max || 3) && spell;   // Ombre 3 : critique garanti
      const critP = (src.crit || 0) + ((spell && spell.crit_bonus) || 0) + (src.passive === 'chanceux' ? 100 : 0);
      if (!immune && (sure || (critP > 0 && rng.chance(critP)))) crit = true;
      if (sure && !immune) { setRes(R, src, 0); log.push(src.name + ' sort de l\'ombre : coup assuré.'); }
      saveRng(R, rng);
    }
    let dmg = dmgOf(raw, defEff(t, tags));
    if (crit) dmg = pct(dmg, 150);
    if (src.kind === 'hero' && hasState(src, 'defi') && t.side === 'boss') dmg = pct(dmg, 130);
    if (src.kind === 'hero' && src.spec_id === 'assassin' && t.side === 'boss') dmg = pct(dmg, assassinCurePct(env, t));   // V5 T3b : Curée
    dmg = Math.max(1, takenMods(t, dmg));
    const done = applyHit(R, env, src, t, dmg, log, srcLabel);
    if (crit && log) log.push('Coup critique de ' + src.name + ' sur ' + t.name + ' : ' + done + ' dégâts.');
    if (done > 0 && src.kind === 'hero' && src.hybrid_id === 'chasseur_monstres' && t.side === 'boss' && hasState(t, 'marque')) addFissure(R, env, src, t, log);
    if (done > 0 && src.side === 'boss' && t.kind === 'hero') duelRiposte(R, env, t, src, log);
    return done;
  }

  // ===================================================================================
  // 4bis. HYBRIDES : ressources, mécaniques propres ; têtes de l'Hydre ; écailles du Drake
  // ===================================================================================
  function hybOf(env, id) { for (const h of (env.data.hybrids || [])) if (h.id === id) return h; return null; }
  function specOf(env, id) { for (const s of (env.data.specs || [])) if (s.id === id) return s; return null; }   // V5 T3 : fiche de spécialisation
  function noteRes(R, u) {
    if (!u.hybrid_id) return;
    const seen = R.stats.res_values[u.hybrid_id] = R.stats.res_values[u.hybrid_id] || [];
    if (seen.indexOf(u.res) < 0) { seen.push(u.res); seen.sort((a, b) => a - b); }
  }
  function setRes(R, u, v) { if (!u.hybrid_id) return; u.res = clamp(v, 0, u.res_max || 0); noteRes(R, u); }
  function bumpRes(R, u, n) { setRes(R, u, (u.res || 0) + n); }
  function mech(R, id) { R.stats.mech[id] = (R.stats.mech[id] || 0) + 1; }
  // Compteurs de corps par famille (les caps des hybrides sont séparés de summon_cap).
  function subsOf(R, heroId, sub) { return guildUnits(R).filter(u => u.kind === 'summon' && u.master_id === heroId && u.sub === sub && u.hp > 0); }
  function critImmune(R, env, t) {
    if (t.crit_immune) return true;
    if (!isBoss(t)) return false;
    const f = fiche(R, env);
    return !!(f.crit_immune_above_pct && div(t.hp * 100, Math.max(1, t.hp_max)) > f.crit_immune_above_pct);
  }
  function addFissure(R, env, src, t, log) {
    const f = fiche(R, env), cap = f.fissure_cap || 4;
    if ((t.fissures || 0) >= cap) return;
    t.fissures = (t.fissures || 0) + 1;
    bumpRes(R, src, 1);
    mech(R, 'traque'); mech(R, 'fissure');
    log.push(src.name + ' ouvre une fissure dans l\'armure (' + t.fissures + '/' + cap + ', DÉF −' + (5 * t.fissures) + ').');
  }
  // Duelliste : contre-attaque automatique (60 %) après un coup encaissé au contact, deux fois par tour ennemi au plus.
  function duelRiposte(R, env, t, src, log) {
    if (t.hybrid_id !== 'duelliste' || t.hp <= 0 || R.status !== 'active') return;
    const twice = hasState(t, 'riposte_double');                       // V5 T3 Bretteur : deux ripostes par coup encaissé, à 70 %, cap 4 par tour
    const cap = twice ? 4 : 2, power = twice ? 70 : 60, n = twice ? 2 : 1;
    for (let i = 0; i < n; i++) {
      if ((t.ripostes_turn || 0) >= cap || t.hp <= 0 || src.hp <= 0 || R.status !== 'active') return;
      const c = isBoss(src) ? bossNearestCell(src, t.x, t.y) : src;
      if (manhattan(c.x, c.y, t.x, t.y) > 1) return;
      t.ripostes_turn = (t.ripostes_turn || 0) + 1;
      bumpRes(R, t, 1);
      mech(R, 'riposte');
      if (twice) mech(R, 'riposte_double');
      const dmg = damageFromPower(R, env, t, src, power, { magic: false }, null, log, 'la riposte');
      log.push(t.name + ' riposte aussitôt : ' + dmg + ' dégâts.');
    }
  }
  // Coup encaissé par un héros : Ferveur (+1), Stigmate (30 % en réserve), Ombre (retombe à 0).
  function onHeroHit(R, env, u, dmg, log) {
    if (!u.hybrid_id || dmg <= 0) return;
    if (u.hybrid_id === 'paladin') { bumpRes(R, u, 1); mech(R, 'ferveur'); }
    else if (u.hybrid_id === 'inquisiteur') { bumpRes(R, u, Math.max(1, pct(dmg, 30))); mech(R, 'stigmate'); }
    else if (u.hybrid_id === 'traqueur' && (u.res || 0) > 0) setRes(R, u, 0);
  }
  // Têtes de l'Hydre (§2.3) : la gueule engagée (PV les plus hauts) saigne avec le corps ; à 0 elle est coupée.
  function headsAlive(B) { return (B.heads || []).filter(h => h.alive).length; }
  function damageHead(R, env, B, dmg, src, log) {
    const alive = (B.heads || []).map((h, i) => ({ h: h, i: i })).filter(x => x.h.alive);
    if (!alive.length) return;
    let best = alive[0];
    for (const x of alive) if (x.h.hp > best.h.hp) best = x;
    best.h.hp = Math.max(0, best.h.hp - dmg);
    if (best.h.hp > 0) return;
    const f = fiche(R, env);
    best.h.alive = false;
    best.h.regrow = f.regrow_turns || 2;
    R.heads_cut_pass = (R.heads_cut_pass || 0) + 1;
    mech(R, 'tete_coupee');
    const cauter = hasState(B, 'brule') || hasState(B, 'gele');
    if (cauter) { best.h.regrow = -1; mech(R, 'cauterisation'); log.push(tplOf(env.data, 'raid_head_cauter', 'h' + best.i + R.rng_count, { a: src && src.name ? src.name : 'La guilde' })); }
    else log.push(tplOf(env.data, 'raid_head_cut', 'h' + best.i + R.rng_count, { a: src && src.name ? src.name : 'La guilde' }));
    if (R.heads_cut_pass >= 2 && !hasState(B, 'chancelant')) {          // décapitation double : fenêtre de poussée vers les pieux
      addState(B, 'chancelant', f.stagger_turns || 2, 0);
      mech(R, 'decapitation_double');
      R.events.push({ kind: 'stagger' });
      log.push(tplOf(env.data, 'raid_double_behead', 'd' + R.riposte_count, {}));
    }
  }
  function regrowHeads(R, env, log) {
    const f = fiche(R, env), B = R.boss;
    if (!B.heads) return;
    for (const h of B.heads) {
      if (h.alive || h.regrow < 0) continue;
      h.regrow -= 1;
      if (h.regrow > 0) continue;
      h.alive = true; h.hp = h.hp_max; h.regrow = 0;
      mech(R, 'repousse');
      log.push(tplOf(env.data, 'raid_head_regrow', 'r' + R.riposte_count, {}));
    }
  }
  function healUnit(t, n) { const before = t.hp; t.hp = Math.min(t.hp_max, t.hp + Math.max(0, n)); return t.hp - before; }
  function addShield(t, points, turns) { t.shield = Math.min(t.hp_max, t.shield + points); if (turns > 0) t.shield_turns = Math.max(t.shield_turns || 0, turns); }
  // Résistance du boss au contrôle §1.8 ; les adds ne résistent pas.
  function controlPermille(R, env) { const C = raidC(env); return Math.max(C.control_min_permille, C.control_base_permille - C.control_step_permille * (R.boss.controls_today || 0)); }
  function tryControl(R, env, t, id, turns, value, log, spellName) {
    if (hasState(t, 'avatar')) { if (log) log.push(t.name + ', devenu élément, ne se laisse pas contrôler.'); return false; }   // V5 T3 15A
    if (hasState(t, 'fusion')) { log.push(t.name + ', fusionné' + (t.gender === 'f' ? 'e' : '') + ' à son élément, ignore le contrôle.'); return false; }
    if (!isBoss(t)) { addState(t, id, turns, value); return true; }
    if (id === 'etourdi' && t.last_stun) { log.push('Le Sylvain ne peut pas être étourdi deux fois de suite.'); return false; }
    const rng = rngOf(R);
    const ok = rng.chance(controlPermille(R, env));
    saveRng(R, rng);
    if (ok) { addState(t, id, turns, value); t.controls_today = (t.controls_today || 0) + 1; if (id === 'etourdi') t.last_stun = 1; log.push('Le Sylvain subit « ' + spellName + ' » (ténacité ' + t.controls_today + ').'); return true; }
    log.push(tplOf(env.data, 'raid_control', spellName + R.rng_count, { spell: spellName, n: (t.controls_today || 0) + 1 }));
    return false;
  }
  // Poussée §1.6 : direction dominante source→cible, arrêt devant mur/bord/unité, gouffre = chute, collision si k < n.
  function pushUnit(R, env, src, t, n, sx, sy, log) {
    const C = raidC(env), G = gridOf(R);
    const mass = isBoss(t) ? (hasState(t, 'chancelant') ? 0 : t.mass) : (t.mass || 0);
    const eff = n - mass;
    if (eff <= 0) { log.push(t.name + ' ne bouge pas d\'un pouce (masse).'); return 0; }
    const d = dirOf(sx, sy, t.x, t.y);
    let k = 0, hit = null;
    const lvl = src && src.level ? src.level : 1;
    for (let i = 0; i < eff; i++) {
      const cells = isBoss(t) ? bossCells({ x: t.x + d.x, y: t.y + d.y, w: t.w, h: t.h }) : [{ x: t.x + d.x, y: t.y + d.y }];
      let ok = true;
      for (const c of cells) {
        if (!inb(G, c.x, c.y) || layoutAt(R, c.x, c.y) === WALL) { ok = false; hit = 'wall'; break; }
        const z = zoneAt(R, c.x, c.y);
        if (z && z.zone_id === 'mur_glace') { ok = false; hit = 'wall'; break; }
        const u = unitAt(R, c.x, c.y);
        if (u && u !== t) { ok = false; hit = u; break; }
        if (!isBoss(t) && isBossCell(R.boss, c.x, c.y)) { ok = false; hit = R.boss; break; }
        if (!isBoss(t) && layoutAt(R, c.x, c.y) === PIT) { hit = 'pit'; ok = false; break; }
      }
      if (!ok) break;
      t.x += d.x; t.y += d.y; k++;
    }
    let collision = 0;
    if (hit === 'pit') { collision = C.pit_base + C.pit_per_level * lvl; damageFlat(R, env, t, collision, log, 'la chute'); log.push(t.name + ' bascule dans le gouffre : ' + collision + ' dégâts.'); }
    else if (k < eff && hit) {
      collision = (eff - k) * (C.collision_base + C.collision_per_level * lvl);
      if (hit === 'wall' && isBoss(t) && fiche(R, env).stump_collision) collision = Math.max(collision, fiche(R, env).stump_collision);
      damageFlat(R, env, t, collision, log, 'la collision');
      if (hit !== 'wall' && hit.hp !== undefined) damageFlat(R, env, hit, div(collision, 2), log, 'la collision');
      log.push(tplOf(env.data, 'raid_push', t.id + R.rng_count, { a: src ? src.name : 'La poussée', t: t.name, n: k, collision: ' ; collision contre ' + (hit === 'wall' ? 'une souche' : hit.name) + ' : ' + collision + ' dégâts' }));
    } else if (k > 0) log.push(tplOf(env.data, 'raid_push', t.id + R.rng_count, { a: src ? src.name : 'La poussée', t: t.name, n: k, collision: '' }));
    return k;
  }
  // Une unité tombe à 0 PV : héros = KO (passage terminé) ; invocation/add = retirée ; boss = victoire.
  function onZero(R, env, t, src, log, srcLabel) {
    if (isBoss(t)) { t.alive = false; R.status = 'won'; R.won_by = src && src.kind === 'hero' ? src.id : (src && src.master_id) || null; R.events.push({ kind: 'won', hero_id: R.won_by }); return; }
    if (t.kind === 'hero') {
      if (R.pass && !R.pass.ko) { R.pass.ko = true; R.pass.last_cell = { x: t.x, y: t.y }; R.events.push({ kind: 'ko', hero_id: t.id }); log.push(tplOf(env.data, 'raid_fall', t.id + R.day_start, { a: t.name, src: srcLabel || 'le Sylvain', e: t.gender === 'f' ? 'e' : '' })); }
      R.units = R.units.filter(u => u.id !== t.id);
      return;
    }
    if (t.kind === 'banner') {                                             // V5 T3 §2.5 : la Bannière tombée = derby perdu
      R.units = R.units.filter(u => u.id !== t.id);
      R.status = 'lost'; R.events.push({ kind: 'lost' });
      log.push('La Bannière est tombée : le gué est perdu.');
      return;
    }
    if (t.side === 'guild' && t.kind === 'summon') { R.fallen = (R.fallen || []).concat([{ sub: t.sub, name: t.name, master_id: t.master_id, pass: R.pass_count }]); }   // V5 T3 1B : l'Hospitalier peut les relever
    R.units = R.units.filter(u => u.id !== t.id);
    log.push(t.name + (t.side === 'boss' ? ' s\'effondre.' : ' se disloque.'));
  }
  function onShieldBroken(R, env, B, log) {
    const f = fiche(R, env);
    addState(B, 'chancelant', f.stagger_turns || 2, 0);
    R.events.push({ kind: 'stagger' });
    log.push(tplOf(env.data, 'raid_stagger', 's' + R.rng_count, { a: R.pass ? heroName(R) : 'La guilde' }));
  }
  function heroName(R) { const h = heroUnit(R); return h ? h.name : (R.pass ? R.pass.hero_name : '?'); }

  // ===================================================================================
  // 5. SORTS : tables, portée, ciblage, lancement
  // ===================================================================================
  function spellsIndex(env) {
    if (env.__spells) return env.__spells;
    const m = {};
    for (const s of env.data.tactic_spells) m[s.id] = s;
    env.__spells = m;
    return m;
  }
  function classSpells(env, classId) {
    const out = ['arme'];
    for (const s of env.data.tactic_spells) if (s.class_id === classId) out.push(s.id);
    return out;
  }
  // Sorts réellement disponibles : arme + 4 sorts de base (+ 2 sorts d'hybride après le second choix).
  function unitSpells(env, u) {
    const out = classSpells(env, u.class_id);
    if (!u.hybrid_id) return out;
    for (const sp of env.data.tactic_spells) if (sp.hybrid_id === u.hybrid_id) out.push(sp.id);
    if (u.spec_id) for (const sp of env.data.tactic_spells) if (sp.spec_id === u.spec_id) out.push(sp.id);   // V5 T3 : 8 sorts + arme à la spécialisation
    return out;
  }
  function spellFor(env, u, id) {
    const s = spellsIndex(env)[id];
    if (!s) return null;
    if (id === 'arme') {
      const ranged = (u.class_id === 'ranger' || u.class_id === 'mage') && !hasState(u, 'fusion');
      const fused = hasState(u, 'fusion');                       // Conjurateur fusionné : l'arme devient une croix 1 élémentaire
      const avatar = hasState(u, 'avatar');                      // V5 T3 15A : l'Avatar frappe en cercle 1 à 120 %
      return Object.assign({}, s, { range_max: ranged ? 5 : 1, los: ranged, magic: u.class_id === 'mage' || fused,
        shape: avatar ? 'circle' : fused ? 'cross' : 'single', r: fused || avatar ? 1 : 0, power: avatar ? 120 : s.power, target: fused ? 'any' : s.target });
    }
    return s;
  }
  function powerOf(s, u) { return pct(s.power || 0, 100 + 5 * div(u.level || 1, 3)); }
  function blockedFn(R) { return i => blocksLos(R, i); }
  // Cible d'un sort à (x,y) : unité (ou boss) présente sur la case, sinon la case.
  function targetAt(R, x, y) { if (isBossCell(R.boss, x, y)) return R.boss; return unitAt(R, x, y); }
  // Validation de portée/LdV/ligne : la distance et la LdV vers un corps 2×2 se mesurent vers sa case la plus proche.
  function rangeWhy(R, s, u, x, y) {
    const G = gridOf(R);
    if (!inb(G, x, y)) return 'case hors de la grille';
    let tx = x, ty = y;
    if (isBossCell(R.boss, x, y)) { const c = bossNearestCell(R.boss, u.x, u.y); tx = c.x; ty = c.y; }
    const d = manhattan(u.x, u.y, tx, ty);
    if (d < s.range_min || d > s.range_max) return 'hors de portée (' + d + ', portée ' + s.range_min + '-' + s.range_max + ')';
    if (s.line_only && u.x !== tx && u.y !== ty) return 'cible hors ligne';
    if (s.los && d > 0 && !hasLos(G, blockedFn(R), u.x, u.y, tx, ty)) return 'pas de ligne de vue';
    return null;
  }
  function castWhy(R, env, u, s, x, y) {
    if (!s) return 'sort inconnu';
    if (!u) return 'aucun héros sur la grille';
    if (unitSpells(env, u).indexOf(s.id) < 0) return s.hybrid_id ? 'sort d\'un autre hybride' : 'sort d\'une autre classe';
    if (R.pass.pa < s.cost_pa) return 'PA insuffisants (' + R.pass.pa + '/' + s.cost_pa + ')';
    if ((u.cooldowns[s.id] || 0) > 0) return 'relance dans ' + u.cooldowns[s.id] + ' tour(s)';
    const why = rangeWhy(R, s, u, x, y);
    if (why) return why;
    const t = targetAt(R, x, y);
    switch (s.target) {
      case 'enemy': if (!t || t.side !== 'boss') return 'il faut viser un ennemi'; break;
      case 'ally': if (!t || t.side !== 'guild') return 'il faut viser un allié'; break;
      case 'self': if (t !== u) return 'sort personnel (visez votre case)'; break;
      case 'summon': if (!t || t.kind !== 'summon') return 'il faut viser une invocation'; break;
      case 'cell': {
        if (t) return 'la case doit être libre';
        // V5 T3b : un Templier a le droit de REPLANTER sur son propre bouclier ébréché — c'est comme ça qu'un mur de
        // 120 PV finit par céder (il garde ses ébréchures) au lieu de repartir neuf à chaque passage.
        const own = R.zones[String(cidx(gridOf(R), x, y))];
        const mend = s.id === 'bouclier_plante' && own && own.zone_id === 'mur_heros' && own.source_id === u.id;
        if (!mend && !passable(R, x, y)) return 'case infranchissable';
        break;
      }
      case 'unit': if (!t) return 'il faut viser une unité'; break;
      case 'any': break;
    }
    if (s.id === 'charge') { const c = adjacentCellToward(R, u, x, y); if (!c) return 'aucune case libre au contact'; }
    if (s.id === 'vital_link' && t && t.master_id !== u.id && t.owner !== u.owner) return 'cette invocation n\'est pas à vous';
    if (s.id === 'trap' && Object.keys(R.zones).filter(k => R.zones[k].zone_id === 'piege' && R.zones[k].source_id === u.id).length >= raidC(env).trap_cap) return 'trop de pièges posés (' + raidC(env).trap_cap + ')';
    if (s.id === 'sacred_circle' && Object.keys(R.zones).filter(k => R.zones[k].zone_id === 'sanctuaire' && R.zones[k].source_id === u.id).length >= raidC(env).zone_cap_per_hero) return 'trop de zones posées';
    const hyb = hybridWhy(R, env, u, s, x, y);
    if (hyb) return hyb;
    const spe = specWhy(R, env, u, s, x, y);
    if (spe) return spe;
    return null;
  }
  // Conditions propres aux hybrides et au vol du Drake (répliquées à l'identique dans previewCast).
  function hybridWhy(R, env, u, s, x, y) {
    const t = targetAt(R, x, y);
    if (isBoss(t) && (R.boss.flying || 0) > 0 && !s.anchor && (s.range_max < 4 || s.los || s.line_only)) return 'le Drake est en vol : hors de portée (il faut une ancre ou une portée ≥ 4 sans ligne de vue)';
    if (s.id === 'presage' && (u.res || 0) < 1) return 'pas assez de prophétie (1 requise)';
    if (s.id === 'sablier' && (u.res || 0) < 2) return 'pas assez de prophétie (2 requises)';
    if (s.id === 'rapporte' && (u.res || 0) < 1) return 'pas assez d\'ordres (1 requis)';
    if (s.id === 'rapporte' && !subsOf(R, u.id, 'bete').length) return 'aucune bête sur la grille';
    if (s.id === 'fusion' && (u.res || 0) < 1) return 'pas assez d\'essence (1 requise)';
    if (s.id === 'fusion' && !subsOf(R, u.id, 'elementaire').length) return 'aucun élémentaire à absorber';
    if (s.id === 'lever_recrue' && subsOf(R, u.id, 'soldat').length >= 3) return 'trois recrues déjà levées';
    if (s.id === 'double' && subsOf(R, u.id, 'double').length >= 2) return 'deux doubles déjà sur la grille';
    if (s.id === 'echange' && !(t && t.side === 'boss' && !isBoss(t)) && !(t && t.kind === 'summon' && t.sub === 'double')) return 'il faut viser un double ou un ennemi non-boss';
    return null;
  }
  // V5 T3 — conditions propres aux 52 sorts signature de spécialisation (répliquées dans previewCast : l'aperçu ne ment pas).
  function specWhy(R, env, u, s, x, y) {
    if (!s.spec_id) return null;
    const t = targetAt(R, x, y), G = gridOf(R);
    const zones = id => sortedKeys(R.zones).filter(k => R.zones[k].zone_id === id);
    switch (s.id) {
      case 'relever': return (R.fallen || []).length ? null : 'aucun corps tombé à relever ce passage';
      case 'ralliement': return subsOf(R, u.id, 'soldat').length ? null : 'aucune recrue à rallier';
      case 'mur_boucliers': return subsOf(R, u.id, 'soldat').some(v => manhattan(v.x, v.y, u.x, u.y) <= 2) ? null : 'aucune recrue assez proche';
      case 'sacrifice_ordonne': return t && t.kind === 'summon' && t.master_id === u.id ? null : 'il faut désigner une de vos recrues';
      case 'source': return layoutAt(R, x, y) === WATER ? 'il y a déjà de l\'eau ici' : (isBossCell(R.boss, x, y) ? 'le monstre occupe la case' : null);
      case 'assechement': return shapeCells(G, 'cross', 1, u.x, u.y, x, y).some(c => layoutAt(R, c.x, c.y) === WATER) ? null : 'aucune eau à assécher ici';
      case 'ours': case 'grondement': case 'faucon': return subsOf(R, u.id, 'bete').length ? null : 'aucune bête sur la grille';
      case 'rabattre': return subsOf(R, u.id, 'bete').length ? null : 'aucun faucon à lancer';
      case 'remanence': return hasState(u, 'fusion') ? null : 'il faut être fusionné pour laisser une rémanence';
      case 'bannissement': return zones('portail').length >= 2 ? null : 'aucun portail ouvert';
      case 'grand_echange': return t && !isBoss(t) ? null : 'il faut viser une unité qui n\'est pas le monstre';
      case 'fils_solides': return t && t.side === 'boss' && !isBoss(t) ? null : 'il faut viser un rejeton';
      case 'piege_lourd': return zones('piege').filter(k => R.zones[k].heavy && R.zones[k].source_id === u.id).length >= 2 ? 'deux pièges lourds déjà posés' : null;
      case 'bouclier_plante': return zones('mur_heros').filter(k => R.zones[k].source_id === u.id).length >= 2 ? 'deux boucliers déjà plantés' : null;
      case 'triple': return subsOf(R, u.id, 'double').length >= 3 ? 'trois doubles déjà sur la grille' : null;
      case 'miroir': return subsOf(R, u.id, 'double').length ? null : 'aucun double à faire viser';
      case 'veille': return sortedKeys(R.zones).some(k => R.zones[k].owner_kind === 'hero') ? null : 'aucune aura de la guilde à prolonger';
      case 'portail': return manhattan(u.x, u.y, x, y) >= 2 ? null : 'les deux portes doivent être écartées (2 cases au moins)';
      case 'grande_fusion': return hasState(u, 'fusion') ? 'la fusion est déjà en cours' : null;
      case 'pas_leger': return hasState(u, 'pas_leger') ? 'le pas est déjà léger' : null;
      case 'riposte_double': return hasState(u, 'riposte_double') ? 'la garde est déjà doublée' : null;
    }
    return null;
  }
  // Case libre adjacente à la cible (charge), la plus proche de la source le long de la ligne.
  function adjacentCellToward(R, u, x, y) {
    const G = gridOf(R);
    const d = dirOf(u.x, u.y, x, y);
    let cx = u.x, cy = u.y, guard = 0;
    while (guard++ < 12) {
      const nx = cx + d.x, ny = cy + d.y;
      if (!inb(G, nx, ny)) return null;
      if (unitAt(R, nx, ny) || isBossCell(R.boss, nx, ny)) return (cx === u.x && cy === u.y) ? { x: cx, y: cy } : { x: cx, y: cy };
      if (!passable(R, nx, ny)) return null;
      cx = nx; cy = ny;
    }
    return null;
  }
  function affectedCells(R, s, u, x, y) {
    let sx = u.x, sy = u.y;
    const shape = s.shape || 'single';
    return shapeCells(gridOf(R), shape, s.r || 0, sx, sy, x, y);
  }
  function unitsIn(R, cells) {
    const out = [], seen = {};
    for (const c of cells) {
      if (isBossCell(R.boss, c.x, c.y)) { if (!seen.boss) { seen.boss = 1; out.push(R.boss); } continue; }
      const u = unitAt(R, c.x, c.y);
      if (u && !seen[u.id]) { seen[u.id] = 1; out.push(u); }
    }
    out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return out;
  }
  function isBack(R, u) { return u.y < R.boss.y; }
  // Les caps de base (summon_cap, summon_cap_guild) ne portent que sur golem et nuée ; les corps d'hybrides ont leurs propres caps (§4).
  function baseSummons(R, heroId) { return summonsOf(R, heroId).filter(u => u.sub === 'golem' || u.sub === 'nuee'); }
  function summonCap(R, env, u, log) {
    const C = raidC(env);
    let mine = baseSummons(R, u.id);
    while (mine.length >= C.summon_cap) { const old = mine.slice().sort((a, b) => a.born_pass - b.born_pass || (a.id < b.id ? -1 : 1))[0]; R.units = R.units.filter(x => x.id !== old.id); log.push(old.name + ' se dissipe (limite d\'invocations).'); mine = baseSummons(R, u.id); }
    let all = guildUnits(R).filter(x => x.kind === 'summon' && (x.sub === 'golem' || x.sub === 'nuee'));
    while (all.length >= (C.summon_cap_guild || 4)) { const old = all.slice().sort((a, b) => a.born_pass - b.born_pass || (a.id < b.id ? -1 : 1))[0]; R.units = R.units.filter(x => x.id !== old.id); log.push(old.name + ' se dissipe (limite de la guilde).'); all = guildUnits(R).filter(x => x.kind === 'summon' && (x.sub === 'golem' || x.sub === 'nuee')); }
  }
  const SUMMON_KINDS = {
    golem: { name: 'Golem d\'argile', gender: 'm', atk: 80, def: 10, def_lvl: 1, spd: 5, mass: 1, pm: 2, range: 1, los: true, guard: true },
    nuee: { name: 'Nuée', gender: 'f', atk: 70, def: 2, def_lvl: 0, spd: 9, mass: 0, pm: 3, range: 3, los: false, guard: false },
    soldat: { name: 'Soldat', gender: 'm', atk: 50, def: 6, def_lvl: 1, spd: 6, mass: 1, pm: 2, range: 1, los: true, guard: false },
    double: { name: 'Double', gender: 'm', atk: 0, def: 0, def_lvl: 0, spd: 1, mass: 0, pm: 0, range: 0, los: false, guard: false },
    bete: { name: 'Bête', gender: 'f', atk: 80, def: 6, def_lvl: 1, spd: 10, mass: 1, pm: 4, range: 1, los: true, guard: false },
    elementaire: { name: 'Élémentaire', gender: 'm', atk: 60, def: 6, def_lvl: 1, spd: 7, mass: 1, pm: 2, range: 1, los: true, guard: false }
  };
  function summonHp(kind, u) {
    const lvl = u.level;
    if (kind === 'golem') return 30 + 4 * lvl + 2 * (u.vigor || 0);
    if (kind === 'nuee') return 12 + 2 * lvl;
    if (kind === 'soldat') return 20 + 3 * lvl;
    if (kind === 'double') return 1;
    if (kind === 'bete') return 40 + 5 * lvl;
    return 25 + 3 * lvl;                       // élémentaire
  }
  function makeSummon(R, env, u, kind, x, y) {
    const K = SUMMON_KINDS[kind] || SUMMON_KINDS.golem, lvl = u.level;
    const id = 'inv_' + kind + '_' + String(R.next_unit).padStart(3, '0');
    R.next_unit += 1;
    const s = { id: id, kind: 'summon', sub: kind, side: 'guild', owner: u.owner, master_id: u.id, name: K.name + ' de ' + u.name.split(' ')[0], gender: K.gender,
      class_id: null, level: lvl, x: x, y: y, hp_max: summonHp(kind, u), hp: 0, shield: 0, shield_turns: 0,
      atk_eff: pct(u.atk_eff, K.atk), def: K.def + K.def_lvl * lvl, crit: 0, spd: K.spd, mass: K.mass, pa_max: 4, pm_max: K.pm,
      range_min: K.range ? 1 : 0, range_max: K.range, los: K.los, states: [], cooldowns: {}, born_pass: R.pass_count, passive: null, crit_immune: false, element: null };
    s.hp = s.hp_max;
    if (K.guard) { addState(s, 'garde', -1, 0); s.guard_of = u.id; }
    R.units.push(s);
    R.units.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return s;
  }
  // Lancement (l'appelant a validé). Renvoie la liste des lignes de journal.
  function castSpell(R, env, u, s, x, y, log) {
    const P = R.pass;
    P.pa -= s.cost_pa;
    if (s.cooldown > 0) u.cooldowns[s.id] = s.cooldown;   // décrémenté en fin de tour : relance N = de nouveau lançable N tours plus tard
    const t = targetAt(R, x, y);
    const tags = { magic: !!s.magic };
    const power = powerOf(s, u);
    let dmgTotal = 0;
    const named = [];
    R.stats.casts[s.id] = (R.stats.casts[s.id] || 0) + 1;
    if (s.hybrid_id && !s.power && !HYB_BODY[s.id] && R.pass) R.pass.hyb_turn = R.pass.turn;   // V5 T2 : un seul sort d'installation de la voie par passage (politique par défaut)
    const effects = s.effects || [];
    if (s.hybrid_id) { gainGust(R, u, s); if (castHybrid(R, env, u, s, x, y, t, log)) { syncCounts(R, u); return; } }
    if (s.spec_id) { gainGust(R, u, s); if (castSpec(R, env, u, s, x, y, t, log)) { syncCounts(R, u); return; } }   // V5 T3 : les 52 sorts signature
    if (s.id === 'charge') {
      const c = adjacentCellToward(R, u, x, y);
      u.x = c.x; u.y = c.y;
      const z = zoneAt(R, u.x, u.y); if (z) enterZone(R, env, u, z, log);
    }
    if (s.id === 'sacrifice') {
      const cells = shapeCells(gridOf(R), 'cross', 1, u.x, u.y, t.x, t.y);
      const cx = t.x, cy = t.y;
      R.units = R.units.filter(v => v.id !== t.id);
      log.push(u.name + ' sacrifie ' + t.name + ' : explosion.');
      for (const v of unitsIn(R, cells)) if (v.side === 'boss') { dmgTotal += damageFromPower(R, env, u, v, power, tags, s, log, 'le sacrifice'); named.push(v.name); if (v.hp > 0 && !isBoss(v)) pushUnit(R, env, u, v, 1, cx, cy, log); else if (v.hp > 0) pushUnit(R, env, u, v, 1, cx, cy, log); }
      if (dmgTotal) log.push(tplOf(env.data, 'raid_spell', s.id + R.rng_count, { a: u.name, spell: s.name, n: dmgTotal, t: joinFr(named) }));
      return;
    }
    if (s.id === 'vital_link') {
      const n = 20 + u.level;
      if (u.hp * 2 < u.hp_max) { const give = Math.min(n, t.hp - 1); if (give > 0) { t.hp -= give; healUnit(u, give); log.push(t.name + ' rend ' + give + ' PV à ' + u.name + '.'); } }
      else { const give = Math.min(n, u.hp - 1); if (give > 0) { u.hp -= give; const got = healUnit(t, give); log.push(u.name + ' transfuse ' + got + ' PV à ' + t.name + '.'); } }
      return;
    }
    if (s.id === 'sidestep') { u.x = x; u.y = y; log.push(u.name + ' se glisse en (' + x + ',' + y + ').'); const z = zoneAt(R, x, y); if (z) enterZone(R, env, u, z, log); return; }
    if (s.id === 'light' && t && t.side === 'guild') {
      removeState(t, 'poison'); removeState(t, 'brule');
      log.push(u.name + ' purifie ' + t.name + ' par la Lumière.');
      return;
    }
    // Dégâts sur les ennemis de la zone.
    if ((s.power || 0) > 0 && s.target !== 'ally' && s.target !== 'cell') {
      const cells = affectedCells(R, s, u, x, y);
      for (const v of unitsIn(R, cells)) {
        if (v.side !== 'boss') continue;
        let p = power;
        if (s.id === 'shadow_strike' && isBoss(v) && isBack(R, u)) { p = powerOf({ power: s.back_power }, u); log.push(u.name + ' frappe dans le dos !'); }
        if (s.id === 'coup_grace') p = powerOf({ power: s.power + 20 * (v.fissures || 0) }, u);
        if (s.id === 'sentence') { const n = v.states.filter(z => NEGATIVE_STATES.indexOf(z.id) >= 0).length; p = powerOf({ power: s.power + 25 * n }, u); if (n) log.push(u.name + ' énumère ' + n + ' fautes : la sentence tombe plus lourd.'); }
        if (s.id === 'embuscade' && u.__ambush) p = powerOf({ power: s.power * 2 }, u);
        dmgTotal += damageFromPower(R, env, u, v, p, tags, s, log, s.name);
        named.push(v.name);
        if (v.hp <= 0) continue;
        for (const e of effects) applyEffectOn(R, env, u, v, s, e, log);
      }
      if (dmgTotal) log.push(tplOf(env.data, 'raid_spell', s.id + R.rng_count, { a: u.name, spell: s.name, n: dmgTotal, t: joinFr(named) }));
      else log.push(u.name + ' lance « ' + s.name + ' » dans le vide.');
      return;
    }
    // Effets sans dégâts (états, soins, boucliers, zones, invocations, murs).
    const cells = affectedCells(R, s, u, x, y);
    const targets = s.shape && s.shape !== 'single' ? unitsIn(R, cells) : (t ? [t] : []);
    let any = false;
    for (const e of effects) {
      if (e.kind === 'zone') { placeZone(R, env, u, e, cells, log); any = true; continue; }
      if (e.kind === 'wall') { placeWall(R, env, u, e, cells, log); any = true; continue; }
      if (e.kind === 'summon') { summonCap(R, env, u, log); const sm = makeSummon(R, env, u, e.id, x, y); log.push(tplOf(env.data, 'raid_summon', sm.id, { a: u.name, t: sm.name })); any = true; continue; }
      if (e.kind === 'freeze') { if (layoutAt(R, x, y) === WATER && !t) { R.zones[String(cidx(gridOf(R), x, y))] = { zone_id: 'glace', turns_left: 2, owner_kind: 'hero', source_id: u.id, owner_name: u.name }; log.push(u.name + ' gèle l\'eau.'); any = true; } continue; }
      for (const v of targets) { if (applyEffectOn(R, env, u, v, s, e, log)) any = true; }
    }
    if (!any && !effects.length) log.push(u.name + ' lance « ' + s.name + ' ».');
    else log.push(tplOf(env.data, 'raid_spell_effect', s.id + R.rng_count, { a: u.name, spell: s.name, t: targets.length ? joinFr(targets.map(v => v.name)) : 'la case (' + x + ',' + y + ')' }));
    if (u.hybrid_id) syncCounts(R, u);
  }
  const HYB_BODY = { lever_recrue: 1, double: 1, bete: 1, elementaire: 1 };     // sorts hybrides qui posent un corps sur la grille
  const NEGATIVE_STATES = ['immobilise', 'etourdi', 'marque', 'aveugle', 'entrave', 'brule', 'poison', 'chancelant', 'provoque', 'vol_temps', 'esprit_cendre'];
  // Ressources comptées sur la grille (corps et zones vivants) : recalculées après chaque sort et à chaque tour.
  function syncCounts(R, u) {
    if (!u.hybrid_id) return;
    if (u.hybrid_id === 'capitaine') setRes(R, u, subsOf(R, u.id, 'soldat').length);
    else if (u.hybrid_id === 'illusionniste') setRes(R, u, subsOf(R, u.id, 'double').length);
    else if (u.hybrid_id === 'ermite') setRes(R, u, sortedKeys(R.zones).filter(k => R.zones[k].zone_id === 'sentier' && R.zones[k].source_id === u.id).length);
    else if (u.hybrid_id === 'spirite') setRes(R, u, sortedKeys(R.zones).filter(k => R.zones[k].zone_id === 'esprit_garde' && R.zones[k].source_id === u.id).length + (stateOf(R.boss, 'esprit_cendre') ? 1 : 0));
  }
  function gainGust(R, u, s) {
    if (u.hybrid_id !== 'tisse_vent') return;
    u.__gust = 0;
    if ((s.range_max || 0) >= 2) bumpRes(R, u, 1);                 // Souffle : +1 par sort lancé à distance
  }
  // Attirance vers une case (Appel d'air, Rapporte) : pas à pas, arrêt sur la case adjacente ou devant un obstacle.
  function pullToward(R, env, src, t, n, cx, cy, log) {
    let k = 0;
    for (let i = 0; i < n; i++) {
      if (manhattan(t.x, t.y, cx, cy) <= (isBoss(t) ? 2 : 1)) break;
      const d = dirOf(t.x, t.y, cx, cy);
      const cells = isBoss(t) ? bossCells({ x: t.x + d.x, y: t.y + d.y, w: t.w, h: t.h }) : [{ x: t.x + d.x, y: t.y + d.y }];
      let ok = true;
      for (const c of cells) { if (!passable(R, c.x, c.y)) { ok = false; break; } const v = unitAt(R, c.x, c.y); if (v && v !== t) { ok = false; break; } if (!isBoss(t) && isBossCell(R.boss, c.x, c.y)) { ok = false; break; } }
      if (!ok) break;
      t.x += d.x; t.y += d.y; k++;
      if (!isBoss(t)) { const z = zoneAt(R, t.x, t.y); if (z && enterZone(R, env, t, z, log)) break; }
    }
    if (k) log.push(src.name + ' attire ' + t.name + ' de ' + k + ' case(s).');
    return k;
  }
  function landDrake(R, env, log, byName) {
    const f = fiche(R, env), B = R.boss;
    if (!(B.flying > 0)) return false;
    B.flying = 0;
    addState(B, 'etourdi', 1, 0); B.last_stun = 1;
    addState(B, 'chancelant', f.stagger_turns || 2, 0);
    mech(R, 'ancrage');
    R.events.push({ kind: 'stagger' });
    log.push(tplOf(env.data, 'raid_anchor', 'a' + R.riposte_count, { a: byName || 'La guilde' }));
    return true;
  }
  // Les 26 sorts d'hybride (§4). Renvoie true si le sort est entièrement traité ici.
  function castHybrid(R, env, u, s, x, y, t, log) {
    const G = gridOf(R), B = R.boss;
    switch (s.id) {
      case 'serment': {
        const allies = guildUnits(R).filter(v => v.id !== u.id && v.hp > 0 && v.kind === 'summon');
        const a = nearest(u, allies);
        if (!a) { log.push(u.name + ' prête serment, mais n\'a personne à couvrir.'); return true; }
        u.guard_of = a.id;
        addState(u, 'garde', 2, 0);
        mech(R, 'serment');
        log.push(u.name + ' prend ' + a.name + ' sous sa garde.');
        return true;
      }
      case 'onde_ferveur': {
        const heal = 40 + 20 * (u.res || 0);
        let n = 0;
        for (const v of unitsIn(R, shapeCells(G, 'circle', 1, u.x, u.y, u.x, u.y))) { if (v.side !== 'guild') continue; const got = healUnit(v, heal); if (got) { n += got; R.healing_total[u.id] = (R.healing_total[u.id] || 0) + got; } }
        log.push(u.name + ' libère sa ferveur (' + (u.res || 0) + ') : ' + n + ' PV rendus autour d\'' + (u.gender === 'f' ? 'elle' : 'lui') + '.');
        setRes(R, u, 0);
        mech(R, 'onde_ferveur');
        return true;
      }
      case 'defi': {
        if (!t || t.side !== 'boss') return true;
        addState(t, 'provoque', 2, 0); stateOf(t, 'provoque').unit = u.id;
        addState(u, 'defi', 2, 0);
        mech(R, 'defi');
        log.push(u.name + ' défie ' + t.name + ' : plus personne d\'autre ne compte (+30 % de dégâts).');
        return true;
      }
      case 'feinte': { addState(u, 'feinte', 3, 0); mech(R, 'feinte'); log.push(u.name + ' se met en garde : le prochain coup sera esquivé.'); return true; }
      case 'filet': {
        if (!t || t.side !== 'boss') return true;
        if (landDrake(R, env, log, u.name)) return true;
        if (isBoss(t)) tryControl(R, env, t, 'immobilise', 1, 0, log, s.name);
        else { addState(t, 'immobilise', 1, 0); pullToward(R, env, u, t, 2, u.x, u.y, log); }
        mech(R, 'filet');
        log.push(u.name + ' jette son filet sur ' + t.name + '.');
        return true;
      }
      case 'formation': {
        const rec = subsOf(R, u.id, 'soldat').filter(v => manhattan(v.x, v.y, u.x, u.y) === 1);
        if (!rec.length) { log.push(u.name + ' crie un ordre dans le vide.'); return true; }
        for (const v of rec) { addState(v, 'formation', 1, 0); addState(v, 'garde', 1, 0); v.guard_of = u.id; v.mass = 2; }
        log.push(u.name + ' forme le mur de boucliers (' + rec.length + ' recrue(s)).');
        for (const v of rec) { if (v.hp > 0 && R.status === 'active') summonTurn(R, env, v, log); }      // Ordre : les recrues rejouent aussitôt
        mech(R, 'formation');
        return true;
      }
      case 'lever_recrue': { const v = makeSummon(R, env, u, 'soldat', x, y); mech(R, 'recrue'); log.push(tplOf(env.data, 'raid_summon', v.id, { a: u.name, t: v.name })); return true; }
      case 'double': { const v = makeSummon(R, env, u, 'double', x, y); mech(R, 'double'); log.push(u.name + ' se dédouble : ' + v.name + ' prend sa place dans le regard du monstre.'); return true; }
      case 'echange': {
        if (!t) return true;
        const ux = u.x, uy = u.y;
        u.x = t.x; u.y = t.y; t.x = ux; t.y = uy;
        mech(R, 'echange');
        log.push(u.name + ' permute sa position avec ' + t.name + '.');
        const z = zoneAt(R, u.x, u.y); if (z) enterZone(R, env, u, z, log);
        return true;
      }
      case 'confession': {
        if (!t || t.side !== 'boss') return true;
        const steal = Math.min(t.shield || 0, 200);
        if (steal > 0) { t.shield -= steal; addShield(u, steal, 3); mech(R, 'confession'); log.push(u.name + ' arrache ' + steal + ' points de bouclier à ' + t.name + '.'); return true; }
        addState(u, 'seve_volee', 2, 0);
        if (isBoss(t)) t.regen_skip = 1;
        mech(R, 'confession');
        log.push(u.name + ' confesse ' + t.name + ' et lui prend sa sève : elle coule pour ' + (u.gender === 'f' ? 'elle' : 'lui') + '.');
        return true;
      }
      case 'eau_vive': {
        const cells = shapeCells(G, 'cross', 1, u.x, u.y, x, y);
        let cleaned = 0, healed = 0;
        for (const c of cells) {
          const k = String(cidx(G, c.x, c.y)), z = R.zones[k];
          if (z && z.owner_kind === 'boss') { delete R.zones[k]; cleaned++; }
          const v = unitAt(R, c.x, c.y);
          if (v && v.side === 'guild') { removeState(v, 'poison'); removeState(v, 'brule'); healed += healUnit(v, 30); }
        }
        R.healing_total[u.id] = (R.healing_total[u.id] || 0) + healed;
        mech(R, 'eau_vive');
        log.push(u.name + ' fait couler l\'eau vive : ' + cleaned + ' case(s) lavée(s), ' + healed + ' PV rendus.');
        return true;
      }
      case 'presage': {
        const cells = safeCells(R, env, u, 3);
        if (!cells.length) { log.push(u.name + ' cherche une case sûre et n\'en voit aucune.'); return true; }
        const c = cells[0];
        R.zones[String(cidx(G, c.x, c.y))] = { zone_id: 'case_sure', turns_left: 2, owner_kind: 'hero', source_id: u.id, owner_name: u.name };
        bumpRes(R, u, -1);
        mech(R, 'presage');
        log.push(u.name + ' écrit sur la terre la case sûre du prochain passage (' + c.x + ',' + c.y + ').');
        return true;
      }
      case 'sablier': {
        bumpRes(R, u, -2);
        if (tryControl(R, env, B, 'etourdi', 1, 0, log, s.name)) { removeState(B, 'etourdi'); B.last_stun = 0; R.skip_riposte = 1; mech(R, 'sablier'); log.push(u.name + ' retourne le sablier : la prochaine riposte n\'aura pas lieu.'); }
        else log.push(u.name + ' retourne le sablier en vain : le temps lui échappe.');
        return true;
      }
      case 'esprit_cendre': {
        if (!t || t.side !== 'boss') return true;
        addState(t, 'esprit_cendre', 2, u.level);
        stateOf(t, 'esprit_cendre').source_id = u.id;
        mech(R, 'esprit_cendre');
        log.push(u.name + ' attache un esprit de cendre à ' + t.name + ' : il brûlera à chaque riposte.');
        return true;
      }
      case 'embuscade': {
        const k = String(cidx(G, u.x, u.y)), z = R.zones[k];
        u.__ambush = 0;
        if (z && z.zone_id === 'piege' && z.source_id === u.id) { u.__ambush = 1; delete R.zones[k]; mech(R, 'embuscade'); log.push(u.name + ' fait sauter son propre piège pour doubler son tir.'); }
        return false;                              // la suite passe par le chemin de dégâts générique
      }
      case 'fil_fer': {
        const mine = sortedKeys(R.zones).filter(kk => R.zones[kk].zone_id === 'piege' && R.zones[kk].source_id === u.id);
        if (mine.length < 2) { log.push(u.name + ' tend un fil, mais il lui manque un second piège.'); return true; }
        for (const kk of mine.slice(0, 2)) R.zones[kk].linked = 1;
        mech(R, 'fil_fer');
        log.push(u.name + ' relie deux pièges par un fil de fer.');
        return true;
      }
      case 'appel_air': {
        if (landDrake(R, env, log, u.name)) return true;
        const list = unitsIn(R, shapeCells(G, 'circle', 1, u.x, u.y, x, y));
        let n = 0;
        for (const v of list) { if (v.side !== 'boss') continue; n += pullToward(R, env, u, v, 2, x, y, log) > 0 ? 1 : 0; }
        mech(R, 'appel_air');
        if (!n) log.push(u.name + ' crée un appel d\'air qui ne déplace rien.');
        return true;
      }
      case 'bete': {
        const old = subsOf(R, u.id, 'bete')[0];
        if (old) { old.x = x; old.y = y; log.push(u.name + ' repositionne ' + old.name + '.'); }
        else { const v = makeSummon(R, env, u, 'bete', x, y); log.push(tplOf(env.data, 'raid_summon', v.id, { a: u.name, t: v.name })); }
        mech(R, 'bete');
        return true;
      }
      case 'rapporte': {
        const b = subsOf(R, u.id, 'bete')[0];
        if (!b) return true;
        const foes = addUnits(R).filter(isAlive);
        const prey = foes.length ? nearest(b, foes) : (B.alive !== false ? B : null);
        if (!prey) { log.push(b.name + ' revient bredouille.'); return true; }
        bumpRes(R, u, -1);
        mech(R, 'rapporte');
        if (isBoss(prey)) { pushUnit(R, env, b, prey, 1, prey.x + (prey.x - u.x > 0 ? 1 : -1), prey.y, log); log.push(b.name + ' mord et tire : ' + prey.name + ' vacille.'); }
        else pullToward(R, env, b, prey, 1, u.x, u.y, log);
        return true;
      }
      case 'elementaire': {
        for (const old of subsOf(R, u.id, 'elementaire')) R.units = R.units.filter(v => v.id !== old.id);
        const v = makeSummon(R, env, u, 'elementaire', x, y);
        v.element = hasState(B, 'brule') ? 'terre' : 'feu';
        v.name = (v.element === 'feu' ? 'Élémentaire de feu' : 'Élémentaire de terre') + ' de ' + u.name.split(' ')[0];
        mech(R, 'elementaire');
        log.push(tplOf(env.data, 'raid_summon', v.id, { a: u.name, t: v.name }));
        return true;
      }
      case 'fusion': {
        const el = subsOf(R, u.id, 'elementaire')[0];
        if (!el) return true;
        R.units = R.units.filter(v => v.id !== el.id);
        const turns = clamp(1 + (u.res || 0), 1, 3);
        addState(u, 'fusion', turns, 0);
        u.mass = 2;
        setRes(R, u, 0);
        mech(R, 'fusion');
        log.push(u.name + ' absorbe ' + el.name + ' : sa chair devient élément (' + turns + ' tour(s)).');
        return true;
      }
    }
    return false;
  }
  // ===================================================================================
  // 5bis. V5 T3 — LES 52 SORTS SIGNATURE DES 26 SPÉCIALISATIONS (§5.2)
  // Chaque spé porte un effet mesurable sur la grille (mur, terrain, riposte, corps, contrôle),
  // jamais un simple bonus de chiffres. Renvoie true si le sort est entièrement traité ici.
  // ===================================================================================
  function freeAround(R, x, y, n, skipBoss) {
    const G = gridOf(R), out = [];
    for (const c of cellsSorted(G, [{ x: x, y: y }, { x: x, y: y - 1 }, { x: x - 1, y: y }, { x: x + 1, y: y }, { x: x, y: y + 1 },
      { x: x - 1, y: y - 1 }, { x: x + 1, y: y - 1 }, { x: x - 1, y: y + 1 }, { x: x + 1, y: y + 1 }])) {
      if (!freeCell(R, c.x, c.y)) continue;
      if (skipBoss && isBossCell(R.boss, c.x, c.y)) continue;
      out.push(c);
      if (out.length >= n) break;
    }
    return out;
  }
  function setTerrain(R, x, y, kind, turns) {                       // Sourcier : changement de sol rendu après N ripostes
    const G = gridOf(R), i = cidx(G, x, y);
    R.terrain = R.terrain || [];
    if (!R.terrain.some(t => t.i === i)) R.terrain.push({ i: i, prev: R.layout[i], turns: turns });
    else for (const t of R.terrain) if (t.i === i) t.turns = turns;
    R.layout[i] = kind;
  }
  function tickTerrain(R, env, log) {
    if (!R.terrain || !R.terrain.length) return;
    const keep = [];
    for (const t of R.terrain) {
      t.turns -= 1;
      if (t.turns > 0) { keep.push(t); continue; }
      R.layout[t.i] = t.prev;
    }
    R.terrain = keep;
    if (fiche(R, env).water_def_bonus) syncWater(R, env, log);
  }
  function portalCells(R) {
    const G = gridOf(R), out = [];
    for (const k of sortedKeys(R.zones)) { const z = R.zones[k]; if (z.zone_id === 'portail') out.push({ x: Number(k) % G.w, y: div(Number(k), G.w), link: z.link_id }); }
    return out;
  }
  function castSpec(R, env, u, s, x, y, t, log) {
    const G = gridOf(R), B = R.boss, P = R.pass, f = fiche(R, env);
    switch (s.id) {
      // ---- 1A Templier : ancrer ----
      case 'bouclier_plante': {
        const wk = String(cidx(G, x, y)), was = R.zones[wk];
        const left = (was && was.zone_id === 'mur_heros' && was.source_id === u.id && was.hp > 0) ? Math.min(was.hp, WALL_HP) : WALL_HP;
        R.zones[wk] = { zone_id: 'mur_heros', turns_left: 2, owner_kind: 'hero', source_id: u.id, owner_name: u.name, hp: left };
        mech(R, 'bouclier_plante');
        log.push(u.name + (left < WALL_HP ? ' replante son bouclier ébréché en (' : ' plante son bouclier en (') + x + ',' + y + ') : la case fait mur (' + left + ' PV, 2 ripostes).');
        return true;
      }
      case 'charge_foi': {
        const c = adjacentCellToward(R, u, x, y);
        if (c) { u.x = c.x; u.y = c.y; const z = zoneAt(R, u.x, u.y); if (z) enterZone(R, env, u, z, log); }
        addShield(u, 40, 2);
        mech(R, 'charge_foi');
        log.push(u.name + ' charge et arrive couvert (bouclier 40).');
        return false;                                                 // les dégâts passent par le chemin générique
      }
      // ---- 1B Hospitalier : relever ----
      case 'onction_zone': {
        const cells = shapeCells(G, 'circle', 1, u.x, u.y, x, y);
        let n = 0;
        for (const v of unitsIn(R, cells)) {
          if (v.side !== 'guild') continue;
          removeState(v, 'poison'); removeState(v, 'brule');
          const got = healUnit(v, 60);
          n += got;
          R.healing_total[u.id] = (R.healing_total[u.id] || 0) + got;
        }
        for (const c of cells) { if (!passable(R, c.x, c.y) || isBossCell(B, c.x, c.y)) continue; const k = String(cidx(G, c.x, c.y)); if (R.zones[k] && R.zones[k].owner_kind === 'hero') continue; R.zones[k] = { zone_id: 'sanctuaire', turns_left: 1, owner_kind: 'hero', source_id: u.id, owner_name: u.name }; }
        mech(R, 'onction');
        log.push(u.name + ' oint la zone : ' + n + ' PV rendus, poison et brûlure lavés, sanctuaire posé.');
        return true;
      }
      case 'relever': {
        const body = (R.fallen || [])[R.fallen.length - 1];
        if (!body) return true;
        R.fallen = R.fallen.slice(0, -1);
        const v = makeSummon(R, env, u, body.sub, x, y);
        v.hp = Math.max(1, div(v.hp_max, 2));
        mech(R, 'relever');
        log.push(u.name + ' relève ' + body.name + ' : ' + v.hp + ' PV.');
        return true;
      }
      // ---- 2A Bretteur : riposter ----
      case 'riposte_double': { addState(u, 'riposte_double', 3, 0); mech(R, 'riposte_double_on'); log.push(u.name + ' double sa garde : chaque coup encaissé lui en rendra deux.'); return true; }
      case 'botte_secrete': {
        if (!t || t.side !== 'boss') return true;
        const power = (u.ripostes_turn || 0) >= 2 ? 224 : 160;
        const dmg = damageFromPower(R, env, u, t, powerOf({ power: power }, u), { magic: false }, s, log, s.name);
        mech(R, 'botte_secrete');
        log.push(u.name + ' place sa botte secrète' + (power > 130 ? ' après deux ripostes' : '') + ' : ' + dmg + ' dégâts.');
        return true;
      }
      // ---- 2B Matador : déplacer le boss ----
      case 'cape': {
        if ((B.mass || 0) > 3 || B.alive === false) { log.push('La cape claque dans le vide.'); return true; }
        let k = 0, hitWall = false;
        for (let i = 0; i < 2; i++) {
          const d = dirOf(B.x, B.y, x, y);
          if (!d.x && !d.y) break;
          if (!bossCanStand(R, B.x + d.x, B.y + d.y, B)) { hitWall = true; break; }
          B.x += d.x; B.y += d.y; k++;
        }
        if (k) syncWater(R, env, log);
        if (hitWall) { damageFlat(R, env, B, 40, log, 'la collision'); log.push(B.name + ' percute un obstacle en chargeant la cape : 40 dégâts.'); }
        mech(R, 'cape');
        log.push(u.name + ' agite la cape : ' + B.name + ' charge de ' + k + ' case(s).');
        return true;
      }
      case 'esquive': { addState(u, 'feinte', 2, 0); P.pm += 1; mech(R, 'esquive'); log.push(u.name + ' s\'efface : le prochain coup passera à côté (+1 PM).'); return true; }
      // ---- 3A Harponneur : attirer / ancrer ----
      case 'harpon': {
        if (landDrake(R, env, log, u.name)) { mech(R, 'harpon'); return true; }
        if (!t || t.side !== 'boss') return true;
        mech(R, 'harpon');
        if (isBoss(t)) { tryControl(R, env, t, 'immobilise', 1, 0, log, s.name); log.push(u.name + ' plante le harpon dans ' + t.name + '.'); }
        else pullToward(R, env, u, t, 3, u.x, u.y, log);
        return true;
      }
      case 'chaine_givre': {
        if (!t || t.side !== 'boss') return true;
        mech(R, 'chaine_givre');
        if (!isBoss(t)) { addState(t, 'immobilise', 2, 0); log.push(u.name + ' enchaîne ' + t.name + ' : immobilisé 2 tours.'); return true; }
        const c = bossNearestCell(B, u.x, u.y), z = zoneAt(R, c.x, c.y);
        if ((z && z.zone_id === 'glace') || layoutAt(R, c.x, c.y) === WATER) { addState(B, 'immobilise', 1, 0); log.push(u.name + ' gèle l\'eau autour de ' + B.name + ' : il est cloué sur place.'); }
        else { addState(B, 'entrave', 2, 0); log.push(u.name + ' entrave ' + B.name + ' avec sa chaîne de givre.'); }
        return true;
      }
      // ---- 3B Écorcheur : fissurer ----
      case 'entaille': {
        if (!t || t.side !== 'boss') return true;
        const had = (t.fissures || 0) > 0;
        const dmg = damageFromPower(R, env, u, t, powerOf(s, u), { magic: false }, s, log, s.name);
        if (t.hp > 0) {
          addFissure(R, env, u, t, log); addFissure(R, env, u, t, log);
          if (had) { addState(t, 'brule', 2, 0); const b = stateOf(t, 'brule'); if (b) b.level = u.level; log.push('La lame chauffe dans la fissure : ' + t.name + ' prend feu.'); }
        }
        mech(R, 'entaille');
        log.push(u.name + ' entaille ' + t.name + ' : ' + dmg + ' dégâts, deux fissures.');
        return true;
      }
      case 'depecage': {
        if (!t || t.side !== 'boss') return true;
        const n = Math.max(1, t.fissures || 0);
        const dmg = damageFromPower(R, env, u, t, powerOf({ power: 60 * n }, u), { magic: false }, s, log, s.name);
        t.fissures = 0;
        mech(R, 'depecage');
        log.push(u.name + ' dépèce ' + t.name + ' (' + n + ' fissure(s)) : ' + dmg + ' dégâts, l\'armure se referme.');
        return true;
      }
      // ---- 5A Porte-étendard : rallier ----
      case 'etendard': {
        R.zones[String(cidx(G, x, y))] = { zone_id: 'etendard', turns_left: 3, owner_kind: 'hero', source_id: u.id, owner_name: u.name };
        for (const v of subsOf(R, u.id, 'soldat')) if (manhattan(v.x, v.y, x, y) <= 1) v.atk_eff = pct(v.atk_eff, 120);
        mech(R, 'etendard');
        log.push(u.name + ' plante l\'étendard en (' + x + ',' + y + ') : +1 PA à qui commence son tour à côté, 3 ripostes.');
        return true;
      }
      case 'ralliement': {
        const st = sortedKeys(R.zones).filter(k => R.zones[k].zone_id === 'etendard');
        const c = st.length ? { x: Number(st[0]) % G.w, y: div(Number(st[0]), G.w) } : { x: u.x, y: u.y };
        let n = 0;
        for (const v of subsOf(R, u.id, 'soldat')) { const free = freeAround(R, c.x, c.y, 4, true).filter(p => !(p.x === v.x && p.y === v.y)); if (!free.length) continue; const p2 = free[0]; v.x = p2.x; v.y = p2.y; n++; }
        mech(R, 'ralliement');
        log.push(u.name + ' rallie ' + n + ' recrue(s) autour de l\'étendard.');
        return true;
      }
      // ---- 5B Sergent : former ----
      case 'mur_boucliers': {
        const rec = subsOf(R, u.id, 'soldat').filter(v => manhattan(v.x, v.y, u.x, u.y) <= 2);   // calibrage T3 : 2 cases, sinon les recrues partent avant l'ordre
        for (const v of rec) { addState(v, 'formation', 2, 0); v.mass = 2; }
        mech(R, 'mur_boucliers');
        log.push(u.name + ' forme le mur de boucliers (' + rec.length + ' recrue(s), masse 2, mur contre le souffle).');
        return true;
      }
      case 'sacrifice_ordonne': {
        const free = freeAround(R, u.x, u.y, 1, true);
        if (free.length && manhattan(t.x, t.y, u.x, u.y) > 1) { t.x = free[0].x; t.y = free[0].y; }
        addState(t, 'garde', 2, 0); addState(t, 'abri', 2, 0); t.guard_of = u.id;
        mech(R, 'sacrifice_ordonne');
        log.push(t.name + ' se met en travers : elle prendra la prochaine attaque à la place de ' + u.name + '.');
        return true;
      }
      // ---- 6A Confesseur : voler un état ----
      case 'vol_bouclier': {
        if (!t || t.side !== 'boss') return true;
        const steal = Math.min(t.shield || 0, 200);
        if (steal <= 0) { log.push(t.name + ' n\'a aucun bouclier à prendre.'); return true; }
        t.shield -= steal;
        addShield(u, steal, 3);
        if (isBoss(t) && t.shield === 0 && t.phase >= 3) onShieldBroken(R, env, t, log);
        mech(R, 'vol_bouclier');
        log.push(u.name + ' prend ' + steal + ' points de bouclier à ' + t.name + ' et les porte.');
        return true;
      }
      case 'vol_seve': {
        if (!t || t.side !== 'boss') return true;
        addState(u, 'seve_volee', 2, 0);
        if (isBoss(t)) { t.regen_skip = 1; t.regen_off = Math.max(t.regen_off || 0, 1); }
        mech(R, 'vol_seve');
        log.push(u.name + ' détourne la sève de ' + t.name + ' : elle coule pour ' + (u.gender === 'f' ? 'elle' : 'lui') + ' 2 tours.');
        return true;
      }
      // ---- 6B Censeur : sceller ----
      case 'interdit': {
        R.sealed = 1;
        R.pending_steal = 0;
        mech(R, 'interdit');
        log.push(u.name + ' prononce l\'interdit : la prochaine riposte de ' + B.name + ' ne produira rien.');
        return true;
      }
      case 'silence': {
        if (!t || t.side !== 'boss' || isBoss(t)) { log.push('Le silence n\'a pas de prise ici.'); return true; }
        addState(t, 'silence', 2, 0);
        mech(R, 'silence');
        log.push(u.name + ' musèle ' + t.name + ' : ni soin ni drain pendant 2 tours.');
        return true;
      }
      // ---- 7A Pèlerin : purifier ----
      case 'grande_purification': {
        const cells = shapeCells(G, 'circle', 2, u.x, u.y, x, y);
        let n = 0, healed = 0;
        for (const c of cells) { const k = String(cidx(G, c.x, c.y)); if (R.zones[k] && R.zones[k].owner_kind === 'boss') { delete R.zones[k]; n++; } }
        for (const v of unitsIn(R, cells)) { if (v.side !== 'guild') continue; const got = healUnit(v, 20); healed += got; R.healing_total[u.id] = (R.healing_total[u.id] || 0) + got; removeState(v, 'immobilise'); }
        mech(R, 'grande_purification');
        log.push(u.name + ' purifie le cercle : ' + n + ' case(s) lavée(s), ' + healed + ' PV rendus.');
        return true;
      }
      case 'pas_leger': { addState(u, 'pas_leger', 9, 0); removeState(u, 'immobilise'); if (P) P.pm = u.pm_max; mech(R, 'pas_leger'); log.push(u.name + ' allège son pas : ni racines ni cendres ne le retiendront.'); return true; }
      // ---- 7B Sourcier : façonner le terrain ----
      case 'source': {
        setTerrain(R, x, y, WATER, 2);
        mech(R, 'source');
        log.push(u.name + ' fait jaillir une source en (' + x + ',' + y + ').');
        syncWater(R, env, log);
        return true;
      }
      case 'assechement': {
        const cells = shapeCells(G, 'cross', 1, u.x, u.y, x, y);
        let n = 0;
        for (const c of cells) if (layoutAt(R, c.x, c.y) === WATER) { setTerrain(R, c.x, c.y, FLOOR, 2); n++; }
        mech(R, 'assechement');
        syncWater(R, env, log);
        log.push(u.name + ' assèche ' + n + ' case(s) de tourbière.');
        return true;
      }
      // ---- 8A Devin : révéler ----
      case 'vision': {
        const cells = safeCells(R, env, u, 4);
        R.riposte_after = ripostePlan(R, env, u.x, u.y);
        if (cells.length) { const c = cells[0]; R.zones[String(cidx(G, c.x, c.y))] = { zone_id: 'case_sure', turns_left: 3, owner_kind: 'hero', source_id: u.id, owner_name: u.name }; log.push(u.name + ' voit deux ripostes d\'avance et marque la case sûre (' + c.x + ',' + c.y + ').'); }
        else log.push(u.name + ' voit deux ripostes d\'avance, mais aucune case n\'est sûre.');
        mech(R, 'vision');
        return true;
      }
      case 'detourner': {
        R.riposte_redirect = { x: x, y: y };
        mech(R, 'detourner');
        log.push(u.name + ' détourne la prochaine riposte vers (' + x + ',' + y + ').');
        return true;
      }
      // ---- 8B Chronomancien : retarder ----
      case 'sablier_renverse': {
        if (tryControl(R, env, B, 'etourdi', 1, 0, log, s.name)) { removeState(B, 'etourdi'); B.last_stun = 0; R.skip_riposte = 1; mech(R, 'sablier_renverse'); log.push(u.name + ' renverse le sablier : la prochaine riposte n\'aura pas lieu.'); }
        else log.push(u.name + ' renverse le sablier en vain : le temps lui échappe.');
        return true;
      }
      case 'legs': { R.legs = 1; mech(R, 'legs'); log.push(u.name + ' lègue son temps : le prochain héros jouera un tour de plus.'); return true; }
      // ---- 9A Médium : hanter ----
      case 'esprit_cendre_majeur': {
        if (!t || t.side !== 'boss') return true;
        addState(t, 'esprit_cendre', 3, u.level);
        const st = stateOf(t, 'esprit_cendre'); if (st) st.source_id = u.id;
        addState(t, 'brule', 2, 0);
        const b = stateOf(t, 'brule'); if (b) b.level = u.level;
        if (isBoss(t)) t.regen_off = 3;
        mech(R, 'esprit_cendre_majeur');
        log.push(u.name + ' cloue un esprit de cendre majeur sur ' + t.name + ' : il brûlera 3 ripostes et sa sève ne remonte plus.');
        return true;
      }
      case 'hantise': {
        if (!t || t.side !== 'boss') return true;
        addState(t, 'hantise', 2, 10);
        mech(R, 'hantise');
        log.push(u.name + ' hante ' + t.name + ' : DÉF −10 pendant 2 ripostes.');
        return true;
      }
      // ---- 9B Veilleur : protéger ----
      case 'esprit_gardien_majeur': {
        R.zones[String(cidx(G, x, y))] = { zone_id: 'esprit_garde', turns_left: 3, owner_kind: 'hero', source_id: u.id, owner_name: u.name, power: 60 };
        const v = unitAt(R, x, y);
        if (v && v.side === 'guild' && v.shield < 60) addShield(v, 60 - v.shield, 3);
        mech(R, 'esprit_gardien_majeur');
        log.push(u.name + ' pose un esprit gardien majeur en (' + x + ',' + y + ') : bouclier 60, 3 ripostes.');
        return true;
      }
      case 'veille': {
        let n = 0;
        for (const k of sortedKeys(R.zones)) { const z = R.zones[k]; if (z.owner_kind !== 'hero' || z.turns_left >= 99) continue; z.turns_left += 1; n++; }
        mech(R, 'veille');
        log.push(u.name + ' veille : ' + n + ' trace(s) de la guilde tiennent une riposte de plus.');
        return true;
      }
      // ---- 10A Assassin : exécuter ----
      case 'lame_dos': {
        if (!t || t.side !== 'boss') return true;
        const A = assassinBlade(env);
        const back = isBoss(t) ? isBack(R, u) : u.y < t.y;
        const low = assassinLow(env, t);
        if (low && !isBoss(t)) {                                              // V5 T3b : sous le seuil, un rejeton est achevé
          const done = applyHit(R, env, u, t, Math.max(1, t.hp), log, s.name);
          mech(R, 'lame_dos'); mech(R, 'execution');
          log.push(u.name + ' achève ' + t.name + ' : ' + done + ' dégâts, il ne se relève pas.');
          return true;
        }
        let power = A.base + A.step * missingTenths(t) + (back ? A.back : 0);
        if (low) { power = pct(power, A.boss_pct); mech(R, 'execution'); }     // un monstre ne s'achève pas : le coup est majoré
        const dmg = damageFromPower(R, env, u, t, powerOf({ power: power }, u), { magic: false }, s, log, s.name);
        mech(R, 'lame_dos');
        log.push(u.name + (low ? ' vise le défaut de l\'armure de ' : back ? ' plante sa lame dans le dos de ' : ' frappe de face ') + t.name + ' : ' + dmg + ' dégâts.');
        return true;
      }
      case 'ombre_longue': { setRes(R, u, u.res_max || 3); mech(R, 'ombre_longue'); log.push(u.name + ' se fond dans l\'ombre : elle est pleine.'); return true; }
      // ---- 10B Piégeur : piéger en chaîne ----
      case 'piege_lourd': {
        R.zones[String(cidx(G, x, y))] = { zone_id: 'piege', turns_left: 99, owner_kind: 'hero', source_id: u.id, owner_name: u.name, value: u.atk_eff, power: 120, level: u.level, heavy: 1 };
        R.stats.zones.piege = (R.stats.zones.piege || 0) + 1;
        mech(R, 'piege_lourd');
        log.push(u.name + ' arme un piège lourd en (' + x + ',' + y + ') : 120 % et 2 tours d\'immobilisation.');
        return true;
      }
      case 'rabattage': {
        const traps = sortedKeys(R.zones).filter(k => R.zones[k].zone_id === 'piege').map(k => ({ x: Number(k) % G.w, y: div(Number(k), G.w) }));
        const cells = shapeCells(G, 'circle', 1, u.x, u.y, x, y);
        let n = 0;
        for (const v of unitsIn(R, cells)) {
          if (v.side !== 'boss' || isBoss(v)) continue;
          const tr = traps.length ? traps.slice().sort((a, b) => manhattan(a.x, a.y, v.x, v.y) - manhattan(b.x, b.y, v.x, v.y) || cidx(G, a.x, a.y) - cidx(G, b.x, b.y))[0] : { x: u.x, y: u.y };
          if (traps.length && manhattan(tr.x, tr.y, v.x, v.y) === 1 && !unitAt(R, tr.x, tr.y) && passable(R, tr.x, tr.y)) {   // la mâchoire est juste là : le rejeton y met le pied
            v.x = tr.x; v.y = tr.y; n++;
            const z = zoneAt(R, v.x, v.y);
            if (z) enterZone(R, env, v, z, log);
            continue;
          }
          n += pullToward(R, env, u, v, 1, tr.x, tr.y, log) > 0 ? 1 : 0;
        }
        mech(R, 'rabattage');
        log.push(u.name + ' rabat ' + n + ' rejeton(s) vers ses mâchoires.');
        return true;
      }
      // ---- 11A Mirage : leurrer ----
      case 'triple': {
        const free = freeAround(R, x, y, 2, true);
        let n = 0;
        for (const c of free) { if (subsOf(R, u.id, 'double').length >= 3) break; makeSummon(R, env, u, 'double', c.x, c.y); n++; }
        mech(R, 'triple');
        log.push(u.name + ' se démultiplie : ' + n + ' double(s) de plus sur la grille.');
        return true;
      }
      case 'miroir': {
        const d = subsOf(R, u.id, 'double').slice().sort((a, b) => manhattan(a.x, a.y, u.x, u.y) - manhattan(b.x, b.y, u.x, u.y) || (a.id < b.id ? -1 : 1))[0];
        if (!d) return true;
        R.riposte_redirect = { x: d.x, y: d.y };
        R.riposte_no_zone = 1;
        mech(R, 'miroir');
        log.push(u.name + ' tend le miroir : la prochaine riposte partira sur ' + d.name + ' et ne laissera rien.');
        return true;
      }
      // ---- 11B Passe-muraille : échanger ----
      case 'grand_echange': {
        if (!t) return true;
        const ux = u.x, uy = u.y;
        u.x = t.x; u.y = t.y; t.x = ux; t.y = uy;
        mech(R, 'grand_echange');
        log.push(u.name + ' permute avec ' + t.name + ' à travers la grille.');
        const z = zoneAt(R, u.x, u.y); if (z) enterZone(R, env, u, z, log);
        return true;
      }
      case 'fils_solides': {
        if (!t || isBoss(t) || t.side !== 'boss') return true;
        if ((t.level || 1) > (u.level || 1)) { log.push(t.name + ' résiste aux fils : il est trop fort pour ' + u.name + '.'); return true; }
        addState(t, 'charme', 3, 0);
        mech(R, 'fils_solides');
        log.push(u.name + ' tend ses fils : ' + t.name + ' se retourne contre les siens (3 tours).');
        return true;
      }
      // ---- 13A Bourrasque : pousser en zone ----
      case 'tempete_vent': {
        const cells = shapeCells(G, 'cone', 3, u.x, u.y, x, y);
        let n = 0, dmg = 0;
        for (const v of unitsIn(R, cells)) {
          if (v.side !== 'boss') continue;
          dmg += damageFromPower(R, env, u, v, powerOf(s, u), { magic: false }, s, log, s.name);
          if (v.hp > 0) n += pushUnit(R, env, u, v, 3, u.x, u.y, log) > 0 ? 1 : 0;
        }
        mech(R, 'tempete_vent');
        log.push(u.name + ' déchaîne la tempête : ' + dmg + ' dégâts, ' + n + ' unité(s) balayée(s).');
        return true;
      }
      case 'souffle_court': {
        if (!t || t.side !== 'boss') return true;
        pushUnit(R, env, u, t, 1, u.x, u.y, log);
        mech(R, 'souffle_court');
        return true;
      }
      // ---- 13B Cyclone : rassembler ----
      case 'oeil_cyclone': {
        const cells = shapeCells(G, 'circle', 2, u.x, u.y, x, y);
        let n = 0;
        for (const v of unitsIn(R, cells)) { if (v.id === u.id) continue; if (pullToward(R, env, u, v, 2, x, y, log) > 0) n++; }
        mech(R, 'oeil_cyclone');
        log.push(u.name + ' ouvre l\'œil du cyclone : ' + n + ' unité(s) ramenée(s) au centre.');
        return true;
      }
      case 'aspiration': {
        if (!t || t.side !== 'boss') return true;
        pullToward(R, env, u, t, 2, u.x, u.y, log);
        mech(R, 'aspiration');
        return true;
      }
      // ---- 14A Maître-ours : garder ----
      case 'ours': {
        const b = subsOf(R, u.id, 'bete')[0];
        if (!b) return true;
        if (!b.__ours) { b.__ours = 1; b.hp_max = pct(b.hp_max, 150); b.hp = b.hp_max; b.mass = 2; b.name = 'Ours de ' + u.name.split(' ')[0]; }
        addState(b, 'garde', -1, 0); b.guard_of = u.id;
        mech(R, 'ours');
        log.push(b.name + ' se dresse : masse 2, ' + b.hp_max + ' PV, il garde ' + u.name + '.');
        return true;
      }
      case 'grondement': {
        const b = subsOf(R, u.id, 'bete')[0];
        if (!b || B.alive === false) return true;
        addState(B, 'provoque', 2, 0);
        const st = stateOf(B, 'provoque'); if (st) st.unit = b.id;
        mech(R, 'grondement');
        log.push(b.name + ' gronde : ' + B.name + ' ne regarde plus que lui (2 tours).');
        return true;
      }
      // ---- 14B Fauconnier : survoler ----
      case 'faucon': {
        const b = subsOf(R, u.id, 'bete')[0];
        if (!b) return true;
        b.fly = 1; b.pm_max = 6; b.range_max = 4; b.range_min = 1; b.los = false;
        b.name = 'Faucon de ' + u.name.split(' ')[0];
        mech(R, 'faucon');
        log.push(b.name + ' prend l\'air : 6 PM, frappe à 4 cases sans ligne de vue.');
        return true;
      }
      case 'rabattre': {
        if (landDrake(R, env, log, u.name)) { mech(R, 'rabattre'); return true; }
        if (!t || t.side !== 'boss' || isBoss(t)) { log.push('Le faucon tourne sans rien trouver à rabattre.'); return true; }
        const b = subsOf(R, u.id, 'bete')[0];
        pullToward(R, env, b || u, t, 1, u.x, u.y, log);
        mech(R, 'rabattre');
        return true;
      }
      // ---- 15A Avatar : se transformer ----
      case 'grande_fusion': {
        const el = subsOf(R, u.id, 'elementaire')[0];
        if (el) { R.units = R.units.filter(v => v.id !== el.id); log.push(u.name + ' absorbe ' + el.name + '.'); }
        addState(u, 'fusion', 3, 0);
        addState(u, 'avatar', 3, 0);
        u.mass = 3;
        removeState(u, 'immobilise'); removeState(u, 'entrave'); removeState(u, 'etourdi');
        setRes(R, u, 0);
        mech(R, 'grande_fusion');
        log.push(u.name + ' devient l\'élément : masse 3, insensible au contrôle et aux zones, son arme frappe en cercle 1 (3 tours).');
        return true;
      }
      case 'remanence': { u.__remanence = 1; mech(R, 'remanence'); log.push(u.name + ' garde une rémanence : l\'élémentaire renaîtra à la fin de la fusion.'); return true; }
      // ---- 15B Portier : relier ----
      case 'portail': {
        R.next_link = (R.next_link || 0) + 1;
        const link = R.next_link;
        const near = freeAround(R, u.x, u.y, 1, true)[0] || { x: u.x, y: u.y };
        R.zones[String(cidx(G, near.x, near.y))] = { zone_id: 'portail', turns_left: 2, owner_kind: 'hero', source_id: u.id, owner_name: u.name, link_id: link };
        R.zones[String(cidx(G, x, y))] = { zone_id: 'portail', turns_left: 2, owner_kind: 'hero', source_id: u.id, owner_name: u.name, link_id: link };
        mech(R, 'portail_pose');
        log.push(u.name + ' ouvre un portail entre (' + near.x + ',' + near.y + ') et (' + x + ',' + y + ').');
        return true;
      }
      case 'bannissement': {
        if (!t || isBoss(t) || t.side !== 'boss') return true;
        const ps = portalCells(R);
        const far = ps.slice().sort((a, b) => manhattan(b.x, b.y, t.x, t.y) - manhattan(a.x, a.y, t.x, t.y) || cidx(G, a.x, a.y) - cidx(G, b.x, b.y))[0];
        if (far && freeCell(R, far.x, far.y)) { t.x = far.x; t.y = far.y; }
        addState(t, 'etourdi', 1, 0);
        mech(R, 'bannissement');
        log.push(u.name + ' bannit ' + t.name + ' par le portail : étourdi à l\'autre bout.');
        return true;
      }
    }
    return false;
  }
  // Cases sûres à portée : hors zone de boss, hors cases de la prochaine riposte, libres (départage index).
  function safeCells(R, env, u, rad) {
    const G = gridOf(R), rip = {};
    for (const c of (R.riposte_next && R.riposte_next.cells) || []) rip[cidx(G, c.x, c.y)] = 1;
    const out = [];
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) {
      const i = cidx(G, x, y);
      if (manhattan(u.x, u.y, x, y) > rad || !freeCell(R, x, y) || rip[i]) continue;
      const z = R.zones[String(i)];
      if (z && (z.owner_kind === 'boss' || z.zone_id === 'case_sure')) continue;
      out.push({ x: x, y: y, d: distToBoss(R.boss, x, y) });
    }
    out.sort((a, b) => b.d - a.d || cidx(G, a.x, a.y) - cidx(G, b.x, b.y));
    return out;
  }
  // ---- V5 T2b (§B7 / garde G3) : vocabulaire d'effets RÉELLEMENT servi par le moteur ----
  // Un `effects[].kind` écrit dans data.json ne fait quelque chose que s'il figure ici. Trois `kind` historiques
  // (teleport, vital_link, sacrifice) ne sont PAS génériques : leur comportement est porté par l'identifiant du sort
  // dans castSpell. Ils restent donc déclarés, mais RÉSERVÉS à ces sorts-là : un nouveau sort qui les réutiliserait
  // ne ferait rien, alors `checkEffects` le refuse au chargement au lieu de le laisser passer en silence.
  const EFFECT_KINDS_UNIT = ['state', 'heal', 'shield', 'purify', 'push'];        // appliqués par applyEffectOn sur une unité
  const EFFECT_KINDS_CELL = ['zone', 'wall', 'summon', 'freeze'];                 // appliqués par castSpell sur la case visée
  const EFFECT_KINDS_BY_SPELL = { teleport: ['sidestep'], vital_link: ['vital_link'], sacrifice: ['sacrifice'] };
  function checkEffects(data) {
    const bad = [];
    const spells = (data && data.tactic_spells) || [];
    for (const sp of spells) for (const e of (sp.effects || [])) {
      const k = e && e.kind;
      if (EFFECT_KINDS_UNIT.indexOf(k) >= 0 || EFFECT_KINDS_CELL.indexOf(k) >= 0) continue;
      if (EFFECT_KINDS_BY_SPELL[k] && EFFECT_KINDS_BY_SPELL[k].indexOf(sp.id) >= 0) continue;
      bad.push(EFFECT_KINDS_BY_SPELL[k]
        ? 'sort « ' + sp.id + ' » : l\'effet « ' + k + ' » est porté par l\'identifiant du sort et réservé à ' + EFFECT_KINDS_BY_SPELL[k].join(', ')
        : 'sort « ' + sp.id + ' » : effet « ' + String(k) + ' » inconnu du moteur');
    }
    return { ok: bad.length === 0, unknown: bad, reason: bad.length ? 'vocabulaire d\'effets refusé — ' + bad.join(' · ') : null };
  }
  function applyEffectOn(R, env, u, v, s, e, log) {
    const on = e.on || 'target';
    const t = on === 'self' ? u : v;
    const isAdd = t.side === 'boss' && !isBoss(t);
    if (e.adds_only && !isAdd) return false;
    if (e.boss_only && !isBoss(t)) return false;
    if (e.enemy_only && t.side !== 'boss') return false;
    switch (e.kind) {
      case 'state': {
        if (t.side === 'guild' && e.hostile !== false && ['provoque', 'aveugle', 'etourdi', 'immobilise', 'entrave', 'brule', 'poison', 'marque', 'vol_temps'].indexOf(e.id) >= 0) return false;
        const turns = e.turns + (e.id === 'marque' && u.passive === 'pistage' ? 1 : 0);
        if (e.control) return tryControl(R, env, t, e.id, turns, e.value || 0, log, s.name);
        addState(t, e.id, turns, e.id === 'provoque' ? 0 : (e.value || 0));
        if (e.id === 'provoque') stateOf(t, 'provoque').unit = u.id;
        if (e.id === 'brule' && isBoss(t)) { stateOf(t, 'brule').level = u.level; log.push(tplOf(env.data, 'raid_burn', u.id + R.rng_count, { a: u.name })); R.stats.burn_turns = (R.stats.burn_turns || 0); }
        if (e.id === 'poison' && isBoss(t)) stateOf(t, 'poison').level = u.level;
        return true;
      }
      case 'heal': { if (t.side !== 'guild') return false; const n = pct(u.heal || 0, e.power || 100) + (e.flat || 0); const got = healUnit(t, n); log.push(u.name + ' soigne ' + t.name + ' de ' + got + ' PV.'); R.healing_total[u.id] = (R.healing_total[u.id] || 0) + got; return true; }
      case 'shield': { if (t.side !== 'guild') return false; const n = e.value + (e.per_level || 0) * u.level; addShield(t, n, e.turns || 0); log.push(t.name + ' gagne un bouclier de ' + n + '.'); return true; }
      case 'purify': { if (t.side !== 'guild') return false; for (const id of e.states) removeState(t, id); return true; }
      case 'push': {
        if (t.side !== 'boss') return false;
        if (e.adds_only && isBoss(t)) return false;
        let n = e.value;
        if (u.hybrid_id === 'tisse_vent' && (u.res || 0) > 0 && !u.__gust) { n += 1; u.__gust = 1; bumpRes(R, u, -1); mech(R, 'souffle'); log.push('Le souffle de ' + u.name + ' pousse d\'une case de plus.'); }
        pushUnit(R, env, u, t, n, u.x, u.y, log);
        return true;
      }
      default: return false;
    }
  }
  function placeZone(R, env, u, e, cells, log) {
    const G = gridOf(R);
    let turns = e.turns;
    if (e.id === 'sanctuaire' && u.passive === 'onction') turns += 1;
    if (e.id === 'piege' && u.passive === 'pistage') turns = 99;
    let n = 0;
    const capOf = { sentier: 6, esprit_garde: 3 }[e.id] || 0;
    let have = capOf ? sortedKeys(R.zones).filter(k => R.zones[k].zone_id === e.id && R.zones[k].source_id === u.id).length : 0;
    for (const c of cells) {
      if (!passable(R, c.x, c.y) || isBossCell(R.boss, c.x, c.y)) continue;
      if (capOf && have >= capOf) break;
      const k = String(cidx(G, c.x, c.y));
      if (e.id === 'piege' && (unitAt(R, c.x, c.y) || R.zones[k])) continue;
      if (capOf && !(R.zones[k] && R.zones[k].zone_id === e.id && R.zones[k].source_id === u.id)) have++;
      R.zones[k] = { zone_id: e.id, turns_left: turns, owner_kind: 'hero', source_id: u.id, owner_name: u.name, value: e.id === 'piege' ? u.atk_eff : 0, power: e.power || 0, level: u.level };
      R.stats.zones[e.id] = (R.stats.zones[e.id] || 0) + 1;
      n++;
    }
    if (n) log.push(tplOf(env.data, e.id === 'piege' ? 'raid_trap_set' : 'raid_zone', e.id + R.rng_count, { a: u.name, n: n, zone: zoneLabel(e.id) }));
  }
  function placeWall(R, env, u, e, cells, log) {
    const G = gridOf(R);
    let n = 0;
    for (const c of cells) { if (!freeCell(R, c.x, c.y)) continue; R.zones[String(cidx(G, c.x, c.y))] = { zone_id: 'mur_glace', turns_left: e.turns, owner_kind: 'hero', source_id: u.id, owner_name: u.name }; n++; }
    log.push(u.name + ' érige un mur de glace (' + n + ' case(s)).');
  }
  function zoneLabel(id) { return { roots: 'Racines', spores: 'Spores', sanctuaire: 'Sanctuaire', piege: 'Piège', glace: 'Glace', mur_glace: 'Mur de glace',
    cendres: 'Cendres', venin: 'Venin', sentier: 'Sentier', case_sure: 'Case sûre', esprit_garde: 'Esprit gardien', feu: 'Feu', mur_terre: 'Mur de terre',
    mur_heros: 'Bouclier planté', etendard: 'Étendard', portail: 'Portail', piege_lourd: 'Piège lourd', banniere: 'Bannière' }[id] || id; }
  function stateLabel(id) { return { immobilise: 'Immobilisé', etourdi: 'Étourdi', marque: 'Marqué', aveugle: 'Aveuglé', entrave: 'Entravé', brule: 'Brûlé', poison: 'Empoisonné', chancelant: 'Chancelant', charme: 'Charmé', reduction: 'Réduction', provoque: 'Provoqué', vol_temps: 'Temps volé', garde: 'Garde',
    defi: 'Défi', feinte: 'Feinte', formation: 'Formation', fusion: 'Fusion', esprit_cendre: 'Hanté par la cendre', seve_volee: 'Sève volée', vol: 'En vol',
    riposte_double: 'Riposte double', pas_leger: 'Pas léger', hantise: 'Hanté', silence: 'Muselé', avatar: 'Avatar', abri: 'Sacrifice ordonné' }[id] || id; }

  // ===================================================================================
  // 6. TOURS : héros (début/fin), invocations, adds, boss, riposte
  // ===================================================================================
  function dotTick(R, env, u, log) {
    const C = raidC(env);
    const b = stateOf(u, 'brule'), p = stateOf(u, 'poison');
    if (b) { const n = 8 + 2 * (b.level || 1); damageFlat(R, env, u, n, log, 'la brûlure'); log.push(u.name + ' brûle : ' + n + ' dégâts.'); }
    if (p && u.hp > 0) { const n = (6 + (p.level || 1)) * Math.max(1, p.value || 1); damageFlat(R, env, u, n, log, 'le poison'); log.push(u.name + ' souffre du poison : ' + n + ' dégâts.'); }
    if (hasState(u, 'seve_volee') && u.hp > 0) { const got = healUnit(u, 10); if (got) log.push(u.name + ' se nourrit de la sève volée : +' + got + ' PV.'); }
    if (u.hp > 0 && !isBoss(u)) {
      const z = zoneAt(R, u.x, u.y);
      if (z && z.zone_id === 'roots' && u.side === 'guild') { damageFlat(R, env, u, C.roots_damage || 8, log, 'les racines'); log.push(u.name + ' saigne dans les racines (' + (C.roots_damage || 8) + ').'); }
      if (z && z.zone_id === 'sanctuaire' && u.side === 'guild' && u.hp > 0) { const got = healUnit(u, 15); if (got) log.push(u.name + ' respire dans le sanctuaire : +' + got + ' PV.'); }
      if (z && z.zone_id === 'venin' && u.side === 'guild') { addState(u, 'poison', 3, 1); }
      if (z && z.zone_id === 'esprit_garde' && u.side === 'guild' && u.shield < (z.power || 25)) addShield(u, (z.power || 25) - u.shield, 2);
    }
  }
  function startHeroTurn(R, env, u, log) {
    const P = R.pass, C = raidC(env), f = fiche(R, env);
    P.pa = C.pa_per_turn - stateVal(u, 'vol_temps');
    removeState(u, 'vol_temps');
    for (const k of sortedKeys(R.zones)) {                                  // V5 T3 5A : commencer son tour à côté de l'étendard donne +1 PA
      const z = R.zones[k];
      if (z.zone_id !== 'etendard') continue;
      const G = gridOf(R), zx = Number(k) % G.w, zy = div(Number(k), G.w);
      if (manhattan(zx, zy, u.x, u.y) <= 1) { P.pa += 1; mech(R, 'etendard_pa'); log.push(u.name + ' commence son tour sous l\'étendard : +1 PA.'); break; }
    }
    P.pm = hasState(u, 'immobilise') ? 0 : u.pm_max;
    if (layoutAt(R, u.x, u.y) === WATER && f.water_pm_malus) P.pm = Math.max(0, P.pm - f.water_pm_malus);   // §2.3 : les héros dans l'eau perdent 1 PM
    heroTurnResources(R, env, u, log);
    u.ripostes_turn = 0;
    u.hit_this_turn = 0;
    dotTick(R, env, u, log);
    if (P.ko) return;
    if (hasState(u, 'etourdi')) { P.pa = 0; P.pm = 0; log.push(u.name + ' est étourdi' + (u.gender === 'f' ? 'e' : '') + ' : tour perdu.'); }
  }
  // Gains de ressource au début du tour du héros (§4) : Prophétie, Ordres, Ombre.
  function heroTurnResources(R, env, u, log) {
    if (!u.hybrid_id) return;
    if (u.hybrid_id === 'oracle') { bumpRes(R, u, 1); mech(R, 'prophetie'); }
    else if (u.hybrid_id === 'dresseur' && subsOf(R, u.id, 'bete').length) { bumpRes(R, u, 1); mech(R, 'ordres'); }
    else if (u.hybrid_id === 'traqueur' && !u.hit_this_turn && R.pass && R.pass.turn > 1) { bumpRes(R, u, 1); mech(R, 'ombre'); }
    syncCounts(R, u);
    noteRes(R, u);
  }
  function endHeroTurn(R, env, u) {
    if (hasState(u, 'fusion') && stateOf(u, 'fusion').turns <= 1) {
      u.mass = 0;
      if (u.__remanence) {                                                  // V5 T3 15A : l'élémentaire renaît à 50 %
        u.__remanence = 0;
        const c = freeAround(R, u.x, u.y, 1, true)[0];
        if (c) { const v = makeSummon(R, env, u, 'elementaire', c.x, c.y); v.hp = Math.max(1, div(v.hp_max, 2)); mech(R, 'remanence_pop'); }
      }
    }
    tickStates(u);
    for (const k of sortedKeys(u.cooldowns)) { if (u.cooldowns[k] > 0) u.cooldowns[k] -= 1; if (u.cooldowns[k] <= 0) delete u.cooldowns[k]; }
  }
  // Attaque simple d'une unité non-héros (invocation, add) sur une cible : portée/LdV vérifiées par l'appelant.
  function unitAttack(R, env, u, t, log) {
    const dmg = damageFromPower(R, env, u, t, 100, { magic: false }, null, log, u.name);
    log.push(u.name + ' frappe ' + t.name + ' : ' + dmg + ' dégâts.');
    return dmg;
  }
  function targetsInRange(R, u, list) {
    const G = gridOf(R);
    return list.filter(t => { const c = isBoss(t) ? bossNearestCell(t, u.x, u.y) : t; const d = manhattan(u.x, u.y, c.x, c.y); return d >= u.range_min && d <= u.range_max && (!u.los || hasLos(G, blockedFn(R), u.x, u.y, c.x, c.y)); });
  }
  function nearest(u, list) {
    let best = null, bd = 0;
    for (const t of list) { const c = isBoss(t) ? bossNearestCell(t, u.x, u.y) : t; const d = manhattan(u.x, u.y, c.x, c.y); if (best === null || d < bd || (d === bd && t.id < best.id)) { best = t; bd = d; } }
    return best;
  }
  // Déplacement vers la case atteignable la plus proche d'une cible (distance à la cible, puis coût, puis index).
  function moveToward(R, env, u, goalDist, pm, log) {
    const G = gridOf(R), P = dijkstra(R, u, u.x, u.y, pm, u.side === 'guild');
    let best = null, bd = goalDist(u.x, u.y), bc = 0;
    for (const k of Object.keys(P.cost).map(Number).sort((a, b) => a - b)) {
      const x = k % G.w, y = div(k, G.w), d = goalDist(x, y);
      if (d < bd || (d === bd && best !== null && P.cost[k] < bc)) { best = k; bd = d; bc = P.cost[k]; }
    }
    if (best === null) return 0;
    const path = pathTo(P, best);
    if (!path) return 0;
    return walkPath(R, env, u, path, log);
  }
  function summonTurn(R, env, u, log) {
    if (u.sub === 'double') { tickStates(u); return; }              // un double ne joue pas : il attend le coup qu'il absorbera
    if (hasState(u, 'etourdi')) { tickStates(u); return; }
    dotTick(R, env, u, log);
    if (u.hp <= 0) return;
    const adds = addUnits(R).filter(isAlive);
    const enemies = adds.concat(R.boss.alive !== false ? [R.boss] : []);
    let target = null;
    const master = u.guard_of ? unitById(R, u.guard_of) : null;
    if (master) { const adj = adds.filter(a => manhattan(a.x, a.y, master.x, master.y) === 1); target = adj.length ? nearest(u, adj) : (R.boss.alive !== false ? R.boss : null); }
    if (!target) target = adds.length ? nearest(u, adds) : (R.boss.alive !== false ? R.boss : null);
    if (!target) return;
    let pa = u.pa_max, pm = hasState(u, 'immobilise') ? 0 : u.pm_max;
    if (!targetsInRange(R, u, [target]).length && pm > 0) {
      moveToward(R, env, u, (x, y) => (isBoss(target) ? distToBoss(target, x, y) : manhattan(x, y, target.x, target.y)), pm, log);
    }
    if (u.hp > 0 && pa >= 3 && targetsInRange(R, u, [target]).length) { unitAttack(R, env, u, target, log); pa -= 3; }
    // Golem : adjacent au boss avec son maître → Provocation gratuite (le boss vise le golem 1 tour).
    if (u.hp > 0 && u.guard_of && master && R.boss.alive !== false && distToBoss(R.boss, u.x, u.y) === 1 && distToBoss(R.boss, master.x, master.y) === 1 && !hasState(R.boss, 'provoque')) {
      addState(R.boss, 'provoque', 1, 0); stateOf(R.boss, 'provoque').unit = u.id; log.push(u.name + ' gronde : le Sylvain le vise.');
    }
    if (u.hp > 0 && u.sub === 'elementaire') elementalZone(R, env, u, log);
    if (u.hp > 0) tickStates(u);
  }
  // Élémentaire du Conjurateur : une zone par tour (feu si le boss ne brûle pas, mur de terre sinon) ; chaque zone donne 1 essence au maître.
  function elementalZone(R, env, u, log) {
    const G = gridOf(R), B = R.boss;
    const toward = bossNearestCell(B, u.x, u.y);
    const d = dirOf(u.x, u.y, toward.x, toward.y);
    const cand = [{ x: u.x + d.x, y: u.y + d.y }, { x: u.x, y: u.y - 1 }, { x: u.x - 1, y: u.y }, { x: u.x + 1, y: u.y }, { x: u.x, y: u.y + 1 }];
    for (const c of cellsSorted(G, cand)) {
      if (!passable(R, c.x, c.y) || isBossCell(B, c.x, c.y)) continue;
      const k = String(cidx(G, c.x, c.y));
      if (R.zones[k]) continue;
      const fire = u.element !== 'terre';
      R.zones[k] = { zone_id: fire ? 'feu' : 'mur_terre', turns_left: 1, owner_kind: 'hero', source_id: u.master_id, owner_name: u.name, level: u.level };
      const m = unitById(R, u.master_id);
      if (m) { bumpRes(R, m, 1); mech(R, 'essence'); }
      log.push(u.name + (fire ? ' embrase la case (' : ' dresse un mur de terre en (') + c.x + ',' + c.y + ').');
      return;
    }
  }
  function addTurn(R, env, u, log) {
    if (hasState(u, 'etourdi')) { tickStates(u); return; }
    dotTick(R, env, u, log);
    if (u.hp <= 0) return;
    const f = fiche(R, env);
    if (hasState(u, 'charme')) { charmedTurn(R, env, u, log); return; }     // V5 T3 11B : le rejeton charmé frappe les siens
    if (u.role) { rivalTurn(R, env, u, log); return; }                      // V5 T3 §2.5 : clerc, rôdeur et rustre rivaux
    let pm = hasState(u, 'immobilise') ? 0 : u.pm_max;
    const B = R.boss;
    const rule = (f.adds && f.adds.target_rule) || 'master';
    const foes0 = guildUnits(R).filter(isAlive);
    if (rule === 'master') { if (B.alive !== false && distToBoss(B, u.x, u.y) > 1 && pm > 0) moveToward(R, env, u, (x, y) => distToBoss(B, x, y), pm, log); }
    else if (foes0.length && pm > 0) { const p = nearest(u, foes0); if (manhattan(p.x, p.y, u.x, u.y) > 1) moveToward(R, env, u, (x, y) => manhattan(x, y, p.x, p.y), pm, log); }
    if (u.hp <= 0) return;
    const foes = guildUnits(R).filter(isAlive);
    const adj = foes.filter(t => manhattan(t.x, t.y, u.x, u.y) === 1);
    if (adj.length) {
      let t = nearest(u, adj); t = guardRedirect(R, t);
      const dmg = unitAttack(R, env, u, t, log);
      if (f.adds && f.adds.drain) { const got = healUnit(u, Math.min(f.adds.drain, dmg)); if (got) log.push(u.name + ' se gorge de sang : +' + got + ' PV.'); }
    }
    if (B.alive !== false && distToBoss(B, u.x, u.y) === 1 && f.adds && f.adds.heal_boss && !hasState(u, 'silence')) { const got = healUnit(B, f.adds.heal_boss); if (got) { R.stats.add_heal = (R.stats.add_heal || 0) + got; log.push(u.name + ' abreuve le tronc : +' + got + ' PV au Sylvain.'); } }
    if (u.hp > 0) tickStates(u);
  }
  // Rejeton charmé (Fils solides) : il marche sur le boss et frappe les siens.
  function charmedTurn(R, env, u, log) {
    const B = R.boss;
    const foes = addUnits(R).filter(v => isAlive(v) && v.id !== u.id && !hasState(v, 'charme')).concat(B.alive !== false ? [B] : []);
    if (!foes.length) { tickStates(u); return; }
    const t = nearest(u, foes);
    const pm = hasState(u, 'immobilise') ? 0 : u.pm_max;
    const c = isBoss(t) ? bossNearestCell(t, u.x, u.y) : t;
    if (manhattan(c.x, c.y, u.x, u.y) > u.range_max && pm > 0) moveToward(R, env, u, (x, y) => (isBoss(t) ? distToBoss(t, x, y) : manhattan(x, y, t.x, t.y)), pm, log);
    if (targetsInRange(R, u, [t]).length) { const d = unitAttack(R, env, u, t, log); mech(R, 'charme_retourne'); log.push(u.name + ', charmé, frappe ' + t.name + ' (' + d + ').'); }
    if (u.hp > 0) tickStates(u);
  }
  // Rivaux du Derby : le clerc soigne le plus blessé, le rôdeur marque le héros et piège la Bannière, le rustre marche sur la Bannière.
  function rivalTurn(R, env, u, log) {
    const f = fiche(R, env), G = gridOf(R);
    const banner = R.units.filter(v => v.kind === 'banner')[0] || null;
    const pm = hasState(u, 'immobilise') ? 0 : u.pm_max;
    const foes = guildUnits(R).filter(v => v.hp > 0 && v.kind !== 'banner');
    const hero = heroUnit(R);
    if (u.role === 'cleric') {
      const mates = addUnits(R).filter(isAlive).concat(R.boss.alive !== false ? [R.boss] : []);
      const hurt = mates.slice().sort((a, b) => div(a.hp * 1000, Math.max(1, a.hp_max)) - div(b.hp * 1000, Math.max(1, b.hp_max)) || (a.id < b.id ? -1 : 1))[0];
      if (hurt && hurt.hp < hurt.hp_max && !hasState(u, 'silence')) {
        const c = isBoss(hurt) ? bossNearestCell(hurt, u.x, u.y) : hurt;
        if (manhattan(c.x, c.y, u.x, u.y) > u.range_max && pm > 0) moveToward(R, env, u, (x, y) => manhattan(x, y, c.x, c.y), pm, log);
        if (targetsInRange(R, u, [hurt]).length) {
          const got = healUnit(hurt, (f.rivals && f.rivals[1] && f.rivals[1].heal) || 60);
          mech(R, 'clerc_rival');
          if (got) log.push(u.name + ' soigne ' + hurt.name + ' de ' + got + ' PV.');
        }
      } else if (hasState(u, 'silence')) log.push(u.name + ', muselé, ne peut pas soigner.');
      if (u.hp > 0) tickStates(u);
      return;
    }
    if (u.role === 'ranger') {
      if (hero && !hasState(hero, 'marque') && manhattan(hero.x, hero.y, u.x, u.y) <= u.range_max) {
        addState(hero, 'marque', 2, 0);
        mech(R, 'rodeur_rival');
        log.push(u.name + ' marque ' + hero.name + ' : +20 % de dégâts subis.');
      }
      if (banner) {
        const k = String(cidx(G, banner.x, banner.y));
        if (!R.zones[k] && manhattan(banner.x, banner.y, u.x, u.y) <= u.range_max) {
          R.zones[k] = { zone_id: 'venin', turns_left: 2, owner_kind: 'boss', source_id: u.id, owner_name: u.name };
          mech(R, 'piege_rival');
          log.push(u.name + ' pose un piège au pied de la Bannière.');
        } else if (manhattan(banner.x, banner.y, u.x, u.y) > u.range_max && pm > 0) moveToward(R, env, u, (x, y) => manhattan(x, y, banner.x, banner.y), pm, log);
      }
      const t2 = foes.filter(v => manhattan(v.x, v.y, u.x, u.y) <= u.range_max).sort((a, b) => a.hp - b.hp || (a.id < b.id ? -1 : 1))[0];
      if (t2) unitAttack(R, env, u, t2, log);
      if (u.hp > 0) tickStates(u);
      return;
    }
    const goal = banner && !foes.some(v => manhattan(v.x, v.y, u.x, u.y) <= 1) ? banner : (foes.length ? nearest(u, foes) : banner);
    if (goal && manhattan(goal.x, goal.y, u.x, u.y) > 1 && pm > 0) moveToward(R, env, u, (x, y) => manhattan(x, y, goal.x, goal.y), pm, log);
    const adj = guildUnits(R).filter(v => v.hp > 0 && v.kind !== 'banner' && manhattan(v.x, v.y, u.x, u.y) === 1);
    if (adj.length) unitAttack(R, env, u, guardRedirect(R, nearest(u, adj)), log);
    else if (banner && manhattan(banner.x, banner.y, u.x, u.y) === 1) unitAttack(R, env, u, banner, log);
    if (u.hp > 0) tickStates(u);
  }

  // Garde : une attaque monocible visant le gardé frappe le garde s'il est adjacent.
  function guardRedirect(R, t) {
    for (const g of guildUnits(R)) if (g.guard_of === t.id && hasState(g, 'garde') && manhattan(g.x, g.y, t.x, t.y) === 1 && g.hp > 0) return g;
    return t;
  }
  function bossTargets(R, env, rule) {
    const B = R.boss, prov = stateOf(B, 'provoque');
    if (prov && prov.unit) { const p = unitById(R, prov.unit); if (p && p.hp > 0) return guardRedirect(R, p); }
    const alive = guildUnits(R).filter(u => u.hp > 0);
    if (!alive.length) return null;
    const h = heroUnit(R);
    if (rule === 'strongest') {                      // Drake : le plus fort (ATQ), sinon le héros
      let best = null;
      for (const u of alive) if (!best || (u.atk_eff || 0) > (best.atk_eff || 0)) best = u;
      return guardRedirect(R, best);
    }
    if (rule === 'weakest') {                        // Hydre : le plus bas en PV (en %)
      let best = null;
      for (const u of alive) if (!best || div(u.hp * 1000, Math.max(1, u.hp_max)) < div(best.hp * 1000, Math.max(1, best.hp_max))) best = u;
      return guardRedirect(R, best);
    }
    if (h && h.hp > 0) return guardRedirect(R, h);
    const su = alive.filter(u => u.kind === 'summon');
    return su.length ? nearest({ x: B.x, y: B.y, id: '' }, su) : null;
  }
  // Déplacement du corps 2×2 : pas à pas sur le 4-voisinage, la case candidate doit être libre pour les quatre cases.
  function bossCanStand(R, x, y, B) {
    const G = gridOf(R);
    for (const c of bossCells({ x: x, y: y, w: B.w, h: B.h })) {
      if (!inb(G, c.x, c.y) || !passable(R, c.x, c.y)) return false;
      const u = unitAt(R, c.x, c.y);
      if (u) return false;
    }
    return true;
  }
  function bodyDist(x, y, B, tx, ty) { const c = bossNearestCell({ x: x, y: y, w: B.w, h: B.h, alive: true }, tx, ty); return manhattan(c.x, c.y, tx, ty); }
  function bossMove(R, env, pm, goal, log) {
    const B = R.boss;
    let moved = 0;
    for (let i = 0; i < pm; i++) {
      const cur = goal(B.x, B.y);
      const cand = [{ x: B.x, y: B.y - 1 }, { x: B.x - 1, y: B.y }, { x: B.x + 1, y: B.y }, { x: B.x, y: B.y + 1 }];
      let best = null;
      for (const c of cand) { if (!bossCanStand(R, c.x, c.y, B)) continue; const g = goal(c.x, c.y); if (g < cur && (!best || g < best.g)) best = { x: c.x, y: c.y, g: g }; }
      if (!best) break;
      B.x = best.x; B.y = best.y; moved++;
    }
    if (moved) syncWater(R, env, log);
    return moved;
  }
  // Immersion (§2.3) : tant qu'une case du corps est dans l'eau, l'Hydre gagne DÉF et régénération.
  function syncWater(R, env, log) {
    const f = fiche(R, env), B = R.boss;
    if (!f.water_def_bonus) return;
    const wet = bossCells(B).some(c => layoutAt(R, c.x, c.y) === WATER) ? 1 : 0;
    if (wet === (B.in_water || 0)) return;
    B.in_water = wet;
    B.def += wet ? f.water_def_bonus : -f.water_def_bonus;
    if (wet) { mech(R, 'immersion'); if (log) log.push(tplOf(env.data, 'raid_immersion', 'i' + R.riposte_count, {})); }
    else if (log) log.push('L\'Hydre s\'arrache à la tourbière : sa peau redevient tendre.');
  }
  function bossStartTurn(R, env, log) {
    const B = R.boss, f = fiche(R, env);
    dotTick(R, env, B, log);
    if (B.alive === false) return false;
    let regen = f.regen_pct || 0;
    if (B.in_water && f.water_regen_pct) regen += f.water_regen_pct;
    if (B.regen_skip) { B.regen_skip = 0; regen = 0; }
    if (B.regen_off > 0) regen = 0;                                         // V5 T3 : esprit de cendre majeur / sève volée
    if (!hasState(B, 'brule') && regen > 0) { const got = healUnit(B, pct(B.hp_max, regen)); if (got) log.push('La sève remonte : +' + got + ' PV.'); R.stats.regen_total += got; }
    else if (hasState(B, 'brule')) R.stats.burn_turns = (R.stats.burn_turns || 0) + 1;
    return true;
  }
  // Fin du tour du boss : l'Inquisiteur rend sa réserve de stigmate.
  function bossEndTurn(R, env, log) {
    const B = R.boss;
    const h = heroUnit(R);
    if (h && h.hybrid_id === 'inquisiteur' && (h.res || 0) > 0 && B.alive !== false && R.status === 'active') {
      const n = h.res;
      setRes(R, h, 0);
      damageFlat(R, env, B, n, log, 'le stigmate');
      R.damage_total[h.id] = (R.damage_total[h.id] || 0) + n;
      log.push('Le stigmate de ' + h.name + ' rend ' + n + ' dégâts à ' + B.name + '.');
    }
    const wasStun = hasState(B, 'etourdi');
    tickStates(B);
    if (!hasState(B, 'etourdi') && !wasStun) B.last_stun = 0;
  }
  // Fouet du Sylvain : ligne 3 depuis sa case la plus proche vers la cible ; frappe tout ce qui est sur la ligne (guilde).
  function bossWhip(R, env, t, log) {
    const B = R.boss, f = fiche(R, env), G = gridOf(R);
    const c = bossNearestCell(B, t.x, t.y);
    let tx = t.x, ty = t.y;
    if (hasState(B, 'aveugle')) { const d = dirOf(c.x, c.y, t.x, t.y); tx = t.x + d.x; ty = t.y + d.y; log.push('Aveuglé, le Sylvain fouette à côté de ' + t.name + '.'); }
    const d = dirOf(c.x, c.y, tx, ty);
    const cells = [];
    for (let i = 1; i <= f.attack.range; i++) {          // la ligne s'arrête au premier mur (souche, mur de glace) ou au bord
      const x = c.x + d.x * i, y = c.y + d.y * i;
      if (!inb(G, x, y) || blocksLos(R, cidx(G, x, y))) break;
      cells.push({ x: x, y: y });
    }
    let hit = 0;
    for (const v of unitsIn(R, cells)) { if (v.side !== 'guild') continue; hit++; const dmg = damageFromPower(R, env, B, v, f.attack.power, { magic: false }, null, log, 'le fouet du Sylvain'); log.push(tplOf(env.data, 'raid_whip', v.id + R.rng_count, { t: v.name, n: dmg })); }
    if (!hit) log.push('Le fouet du Sylvain claque dans le vide.');
    return hit;
  }
  function bossOrdinaryTurn(R, env, log) {
    const B = R.boss, f = fiche(R, env);
    if (B.alive === false) return;
    if (!bossStartTurn(R, env, log)) return;
    if (hasState(B, 'etourdi')) { log.push(B.name + ', étourdi' + (B.gender === 'f' ? 'e' : '') + ', reste inerte.'); bossEndTurn(R, env, log); return; }
    const kind = f.kind || 'sylvain';
    if (kind === 'drake') drakeTurn(R, env, log);
    else if (kind === 'hydre') hydreTurn(R, env, log);
    else if (kind === 'derby') derbyTurn(R, env, log);
    else sylvainTurn(R, env, log);
    bossEndTurn(R, env, log);
  }
  function sylvainTurn(R, env, log) {
    const B = R.boss, f = fiche(R, env);
    let pa = f.pa - stateVal(B, 'vol_temps');
    removeState(B, 'vol_temps');
    let guard = 0;
    while (pa >= f.attack.cost && guard++ < 4) {
      const t = bossTargets(R, env, f.target_rule);
      if (!t) break;
      const c = bossNearestCell(B, t.x, t.y);
      if (manhattan(c.x, c.y, t.x, t.y) > f.attack.range) { log.push('Le Sylvain grince : ' + t.name + ' est hors de portée de ses fouets.'); break; }
      bossWhip(R, env, t, log);
      pa -= f.attack.cost;
    }
  }
  // Drake des monts (§2.2) : morsure au contact, coup de queue en anneau, déplacement vers le plus fort ; en vol, il est intouchable.
  function drakeTurn(R, env, log) {
    const B = R.boss, f = fiche(R, env);
    if ((B.flying || 0) > 0) { log.push('Le Drake tournoie hors de portée des lames.'); return; }
    let pa = f.pa - stateVal(B, 'vol_temps'), pm = f.pm;
    removeState(B, 'vol_temps');
    if (hasState(B, 'immobilise')) pm = 0;
    let guard = 0;
    while (pa >= f.attack.cost && guard++ < 4) {
      const t = bossTargets(R, env, f.target_rule);
      if (!t) break;
      let c = bossNearestCell(B, t.x, t.y);
      if (manhattan(c.x, c.y, t.x, t.y) > f.attack.range && pm > 0) { pm -= bossMove(R, env, pm, (x, y) => bodyDist(x, y, B, t.x, t.y), log); c = bossNearestCell(B, t.x, t.y); }
      const adj = guildUnits(R).filter(v => v.hp > 0 && distToBoss(B, v.x, v.y) === 1);
      if (adj.length >= 2 && f.attack2) {                                   // coup de queue : anneau 1, poussée 1
        let hit = 0;
        for (const v of adj) { damageFromPower(R, env, B, v, f.attack2.power, { magic: false }, null, log, 'le coup de queue du Drake'); if (v.hp > 0) pushUnit(R, env, B, v, f.attack2.push || 1, B.x, B.y, log); hit++; }
        mech(R, 'queue');
        log.push('Le Drake balaie la place de sa queue : ' + hit + ' cible(s) repoussée(s).');
        pa -= f.attack2.cost;
        continue;
      }
      if (manhattan(c.x, c.y, t.x, t.y) <= f.attack.range) { const d = damageFromPower(R, env, B, t, f.attack.power, { magic: false }, null, log, 'la morsure du Drake'); log.push('Le Drake mord ' + t.name + ' : ' + d + ' dégâts.'); pa -= f.attack.cost; mech(R, 'morsure'); }
      else break;
    }
  }
  // Hydre des marais (§2.3) : une attaque par gueule vivante, sur des cibles séparées ; les gueules coupées repoussent.
  function hydreTurn(R, env, log) {
    const B = R.boss, f = fiche(R, env);
    let pa = f.pa - stateVal(B, 'vol_temps'), pm = hasState(B, 'immobilise') ? 0 : f.pm;
    removeState(B, 'vol_temps');
    const taken = {};
    const heads = (B.heads || []).filter(h => h.alive).length;
    for (let i = 0; i < heads && pa >= f.attack.cost; i++) {
      const pool = guildUnits(R).filter(v => v.hp > 0 && !taken[v.id]);
      let t = null;
      if (i === 0) t = bossTargets(R, env, f.target_rule);
      if (!t || taken[t.id]) t = pool.length ? nearest({ x: B.x, y: B.y, id: '' }, pool) : null;
      if (!t) break;
      taken[t.id] = 1;
      let c = bossNearestCell(B, t.x, t.y);
      if (manhattan(c.x, c.y, t.x, t.y) > f.attack.range && pm > 0) { pm -= bossMove(R, env, pm, (x, y) => bodyDist(x, y, B, t.x, t.y), log); c = bossNearestCell(B, t.x, t.y); }
      if (manhattan(c.x, c.y, t.x, t.y) > f.attack.range) continue;
      const d = damageFromPower(R, env, B, t, f.attack.power, { magic: false }, null, log, 'une gueule de l\'Hydre');
      log.push('Une gueule de l\'Hydre happe ' + t.name + ' : ' + d + ' dégâts.');
      mech(R, 'trois_gueules');
      pa -= f.attack.cost;
    }
    regrowHeads(R, env, log);
  }
  // V5 T3 §2.5 — Capitaine rival : il marche sur la Bannière et frappe ce qui la défend (boss 1×1, masse 1).
  function derbyTurn(R, env, log) {
    const B = R.boss, f = fiche(R, env);
    let pa = f.pa - stateVal(B, 'vol_temps'), pm = hasState(B, 'immobilise') ? 0 : f.pm;
    removeState(B, 'vol_temps');
    const banner = R.units.filter(u => u.kind === 'banner')[0] || null;
    let guard = 0;
    while (pa >= f.attack.cost && guard++ < 3) {
      const foes = guildUnits(R).filter(v => v.hp > 0 && v.kind !== 'banner');
      let t = foes.length ? bossTargets(R, env, f.target_rule) : null;
      if (t && t.kind === 'banner') t = foes.length ? nearest({ x: B.x, y: B.y, id: '' }, foes) : null;
      if (!t && banner && banner.hp > 0) t = banner;
      if (!t) break;
      let c = bossNearestCell(B, t.x, t.y);
      if (manhattan(c.x, c.y, t.x, t.y) > f.attack.range && pm > 0) {
        const goal = banner && !foes.length ? banner : t;
        pm -= bossMove(R, env, pm, (x, y) => bodyDist(x, y, B, goal.x, goal.y), log);
        c = bossNearestCell(B, t.x, t.y);
      }
      if (manhattan(c.x, c.y, t.x, t.y) > f.attack.range) break;
      const d = damageFromPower(R, env, B, t, f.attack.power, { magic: false }, null, log, 'la lame du Capitaine');
      log.push(B.name + ' frappe ' + t.name + ' : ' + d + ' dégâts.');
      mech(R, 'capitaine_frappe');
      pa -= f.attack.cost;
    }
    if (banner && banner.hp > 0 && pm > 0 && distToBoss(B, banner.x, banner.y) > 1) bossMove(R, env, pm, (x, y) => bodyDist(x, y, B, banner.x, banner.y), log);
  }
  function unitsOrderS(R) { return R.units.filter(u => u.kind !== 'hero' && u.kind !== 'banner' && u.hp > 0).sort((a, b) => b.spd - a.spd || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map(u => u.id); }
  function runS(R, env, log) {
    for (const id of unitsOrderS(R)) {
      const u = unitById(R, id);
      if (!u || u.hp <= 0 || R.status !== 'active') continue;
      if (u.kind === 'summon') summonTurn(R, env, u, log); else addTurn(R, env, u, log);
    }
  }
  // Riposte télégraphiée, par fiche : Sylvain (racines / spores), Drake (souffle / fournaise), Hydre (venin).
  function ripostePlan(R, env, tx, ty) {
    const B = R.boss, f = fiche(R, env), G = gridOf(R), kind = f.kind || 'sylvain';
    if (kind === 'derby') {
      const banner = R.units.filter(u => u.kind === 'banner')[0] || null;
      return { kind: 'vol_de_tour', label: 'Le Capitaine vole un tour : −' + (f.steal_pa || 2) + ' PA au prochain passage ; la Bannière doit rester libre de rivaux',
        cells: banner ? shapeCells(G, 'circle', 1, banner.x, banner.y, banner.x, banner.y) : [] };
    }
    if (kind === 'drake') {
      if (B.phase >= 3 && (R.riposte_count % 2 === 1)) {
        const c = { x: B.x, y: B.y };
        return { kind: 'fournaise', label: 'Fournaise : cercle 2 autour du Drake (' + f.furnace_power + ' %), puis il fond sur toi', cells: shapeCells(G, 'circle', 2, c.x, c.y, c.x, c.y) };
      }
      return { kind: 'souffle', label: 'Souffle : ' + f.breath_len + ' cases sur 3 rangées vers ta case (' + f.breath_power + ' % magique) — il tombe après ton premier tour', cells: breathCells(R, env, tx, ty) };
    }
    if (kind === 'hydre') return { kind: 'venin', label: 'Venin : 2 flaques de venin autour de ta case (poison à l\'entrée et par tour, ' + f.venom_turns + ' ripostes)', cells: venomCells(R, env, tx, ty) };
    const spores = B.phase >= 2 && (R.riposte_count % 2 === 1);
    if (spores) { const c = bossNearestCell(B, tx, ty); return { kind: 'spores', label: 'Spores : cône de 3 vers ta case (' + f.spores_power + ' % magique, poison)', cells: shapeCells(G, 'cone', 3, c.x, c.y, tx, ty) }; }
    return { kind: 'roots', label: 'Racines : croix de 2 autour de ta case finale (immobilise, ' + (raidC(env).roots_damage || 8) + ' dégâts par tour)', cells: shapeCells(G, 'cross', 2, tx, ty, tx, ty) };
  }
  // Souffle du Drake : trois rangées parallèles depuis sa gueule, chacune arrêtée par un mur (souche, mur de glace, recrue en Formation).
  function breathCells(R, env, tx, ty) {
    const B = R.boss, f = fiche(R, env), G = gridOf(R);
    const c = bossNearestCell(B, tx, ty), d = dirOf(c.x, c.y, tx, ty), p = { x: -d.y, y: d.x };
    const out = [], half = div((f.breath_width || 3) - 1, 2);
    for (let b = -half; b <= half; b++) {
      for (let i = 1; i <= (f.breath_len || 6); i++) {
        const x = c.x + d.x * i + p.x * b, y = c.y + d.y * i + p.y * b;
        if (!inb(G, x, y) || blocksLos(R, cidx(G, x, y))) break;
        if (isBossCell(B, x, y)) continue;
        out.push({ x: x, y: y });
      }
    }
    return cellsSorted(G, out);
  }
  // V5 T3b (2026-09-19) : les 120 PV du bouclier planté du Templier servaient à rien — ils étaient écrits en données et
  // jamais lus. Le mur est désormais DESTRUCTIBLE : tout ce que le monstre envoie dessus l'use, et il tombe quand il cède.
  // Le souffle du Drake s'arrête sur le mur (breathCells casse la rangée) : c'est exactement là qu'il faut le faire payer.
  function breathBlockers(R, env, tx, ty) {
    const B = R.boss, f = fiche(R, env), G = gridOf(R);
    const c = bossNearestCell(B, tx, ty), d = dirOf(c.x, c.y, tx, ty), p = { x: -d.y, y: d.x };
    const out = [], half = div((f.breath_width || 3) - 1, 2);
    for (let b = -half; b <= half; b++) {
      for (let i = 1; i <= (f.breath_len || 6); i++) {
        const x = c.x + d.x * i + p.x * b, y = c.y + d.y * i + p.y * b;
        if (!inb(G, x, y)) break;
        if (blocksLos(R, cidx(G, x, y))) { out.push({ x: x, y: y }); break; }
      }
    }
    return cellsSorted(G, out);
  }
  function wearHeroWalls(R, env, cells, power, log) {
    if (!power || !cells || !cells.length) return 0;
    const G = gridOf(R), B = R.boss;
    const hit = Math.max(1, pct(pct(B.atk, power), 100 + (R.enrage_pct || 0)));
    let broken = 0;
    for (const c of cells) {
      const k = String(cidx(G, c.x, c.y)), z = R.zones[k];
      if (!z || z.owner_kind !== 'hero' || z.zone_id !== 'mur_heros' || !(z.hp > 0)) continue;
      z.hp -= hit;
      mech(R, 'mur_heros_use');
      if (z.hp <= 0) {
        delete R.zones[k]; broken++;
        mech(R, 'mur_heros_brise');
        log.push('Le bouclier planté de ' + z.owner_name + ' vole en éclats en (' + c.x + ',' + c.y + ').');
      } else log.push('Le bouclier planté de ' + z.owner_name + ' encaisse le coup : ' + z.hp + ' PV restants.');
    }
    return broken;
  }
  // Venin de l'Hydre : deux flaques (cercle 1) autour de la case du héros, choisies sans tirage (la vue reste pure).
  function venomCells(R, env, tx, ty) {
    const f = fiche(R, env), G = gridOf(R);
    const out = shapeCells(G, 'circle', 1, tx, ty, tx, ty).slice();
    let second = null;
    for (let y = 0; y < G.h && !second; y++) for (let x = 0; x < G.w && !second; x++) {
      if (manhattan(x, y, tx, ty) !== 2 || !passable(R, x, y) || isBossCell(R.boss, x, y)) continue;
      second = { x: x, y: y };
    }
    if (second) for (const c of shapeCells(G, 'circle', 1, tx, ty, second.x, second.y)) out.push(c);
    return cellsSorted(G, out);
  }
  function tickZones(R) {
    for (const k of sortedKeys(R.zones)) { const z = R.zones[k]; if (z.turns_left >= 99) continue; z.turns_left -= 1; if (z.turns_left <= 0) delete R.zones[k]; }
  }
  function putZone(R, env, cells, id, turns, skip) {
    const G = gridOf(R), B = R.boss;
    let n = 0;
    for (const c of cells) {
      if (!passable(R, c.x, c.y) || isBossCell(B, c.x, c.y)) continue;
      const k = String(cidx(G, c.x, c.y)), z = R.zones[k];
      if (z && skip.indexOf(z.zone_id) >= 0) continue;
      R.zones[k] = { zone_id: id, turns_left: turns, owner_kind: 'boss', source_id: 'boss', owner_name: B.name };
      R.stats.zones[id] = (R.stats.zones[id] || 0) + 1;
      n++;
    }
    return n;
  }
  function riposte(R, env, log) {
    const B = R.boss, f = fiche(R, env), G = gridOf(R), P = R.pass, kind = f.kind || 'sylvain';
    if (B.alive === false || R.status !== 'active') return;
    let cell = P.last_cell || { x: P.spawn.x, y: P.spawn.y };
    if (R.riposte_redirect) {                                             // V5 T3 8A/11A : Détourner, Miroir
      cell = { x: R.riposte_redirect.x, y: R.riposte_redirect.y };
      R.riposte_redirect = null;
      mech(R, 'riposte_detournee');
      log.push('La riposte part ailleurs que sur ' + P.hero_name + '.');
    }
    bossStartTurn(R, env, log);
    tickZones(R);
    tickTerrain(R, env, log);
    if (B.regen_off > 0) B.regen_off -= 1;
    if (R.skip_riposte) {                         // Sablier de l'Oracle : la riposte saute
      R.skip_riposte = 0;
      R.riposte_count += 1;
      log.push('Le sablier a coulé à l\'envers : ' + B.name + ' rate sa riposte.');
      bossEndTurn(R, env, log);
      R.riposte_next = ripostePlan(R, env, R.spawn_cells[0].x, R.spawn_cells[0].y);
      R.last_riposte = { kind: 'aucune', cells: [], by: P.hero_name };
      return;
    }
    if (R.sealed) {                                                       // V5 T3 6B : l'interdit du Censeur — la riposte n'a pas de mécanisme
      R.sealed = 0;
      R.riposte_count += 1;
      mech(R, 'interdit_tenu');
      log.push('L\'interdit tient : ' + B.name + ' riposte sans rien produire.');
      bossEndTurn(R, env, log);
      R.riposte_next = ripostePlan(R, env, R.spawn_cells[0].x, R.spawn_cells[0].y);
      R.last_riposte = { kind: 'scellee', cells: [], by: P.hero_name };
      return;
    }
    const zonesBefore = {};
    for (const k of sortedKeys(R.zones)) zonesBefore[k] = 1;
    const plan = ripostePlan(R, env, cell.x, cell.y);
    if (hasState(B, 'esprit_cendre')) {           // aura du Spirite : le boss reprend feu à chaque riposte
      const a = stateOf(B, 'esprit_cendre');
      addState(B, 'brule', 1, 0); stateOf(B, 'brule').level = a.value || 1;
      mech(R, 'esprit_cendre_tick');
      log.push('L\'esprit de cendre ranime les braises sur ' + B.name + '.');
    }
    if (kind === 'sylvain') {
      if (plan.kind === 'roots') {
        let n = 0;
        for (const c of plan.cells) {
          if (!passable(R, c.x, c.y) || isBossCell(B, c.x, c.y)) continue;
          const k = String(cidx(G, c.x, c.y)), z = R.zones[k];
          if (z && z.zone_id === 'sanctuaire') continue;
          R.zones[k] = { zone_id: 'roots', turns_left: f.roots_turns, owner_kind: 'boss', source_id: 'boss', owner_name: B.name };
          n++;
          const u = unitAt(R, c.x, c.y);
          if (u && u.side === 'guild') enterZone(R, env, u, R.zones[k], log);
        }
        log.push(tplOf(env.data, 'raid_riposte_roots', 'r' + R.riposte_count, { a: P.hero_name, n: n }));
      } else {
        let dmg = 0;
        for (const v of unitsIn(R, plan.cells)) if (v.side === 'guild') dmg += damageFromPower(R, env, B, v, f.spores_power, { magic: true }, null, log, 'les spores');
        wearHeroWalls(R, env, plan.cells, f.spores_power, log);
        putZone(R, env, plan.cells, 'spores', 1, ['sanctuaire', 'piege']);
        log.push(tplOf(env.data, 'raid_riposte_spores', 'r' + R.riposte_count, { a: P.hero_name, n: dmg }));
      }
      if (B.phase >= 3) { B.shield = f.shield_p3; log.push('L\'écorce se reforme : bouclier ' + f.shield_p3 + '.'); }
    } else if (kind === 'drake') {
      if (plan.kind === 'fournaise') {
        let dmg = 0;
        for (const v of unitsIn(R, plan.cells)) if (v.side === 'guild') dmg += damageFromPower(R, env, B, v, f.furnace_power, { magic: true }, null, log, 'la fournaise');
        mech(R, 'fournaise');
        wearHeroWalls(R, env, plan.cells, f.furnace_power, log);
        const t = bossTargets(R, env, f.target_rule);
        if (t) bossMove(R, env, f.furnace_move || 3, (x, y) => bodyDist(x, y, B, t.x, t.y), log);
        log.push(tplOf(env.data, 'raid_furnace', 'f' + R.riposte_count, { n: dmg, t: t ? t.name : 'la place' }));
      } else {
        R.pending_breath = { cells: plan.cells.map(c => ({ x: c.x, y: c.y })), power: f.breath_power,
          blockers: breathBlockers(R, env, cell.x, cell.y) };                 // ce qui arrête le souffle le paiera quand il tombera
        mech(R, 'souffle_annonce');
        log.push(tplOf(env.data, 'raid_breath', 'b' + R.riposte_count, { a: P.hero_name, n: plan.cells.length }));
      }
    } else if (kind === 'hydre') {
      const n = putZone(R, env, plan.cells, 'venin', f.venom_turns || 2, ['sanctuaire', 'piege']);   // une flaque de venin n'use pas un bouclier : seuls le souffle, la fournaise et les spores le paient
      mech(R, 'venin');
      for (const c of plan.cells) { const u = unitAt(R, c.x, c.y); if (u && u.side === 'guild') enterZone(R, env, u, R.zones[String(cidx(G, c.x, c.y))] || { zone_id: 'venin' }, log); }
      log.push(tplOf(env.data, 'raid_venom', 'v' + R.riposte_count, { a: P.hero_name, n: n }));
      if (B.phase >= 2) {
        const wet = nearestWater(R);
        if (wet && !B.in_water) { bossMove(R, env, 6, (x, y) => bodyDist(x, y, B, wet.x, wet.y), log); syncWater(R, env, log); }
        spawnAdds(R, env, log);
      }
      regrowHeads(R, env, log);
    }
    else if (kind === 'derby') derbyRiposte(R, env, plan, log);
    if (R.riposte_no_zone) {                                              // V5 T3 11A : le Miroir ne laisse rien derrière la riposte
      R.riposte_no_zone = 0;
      for (const k of sortedKeys(R.zones)) if (!zonesBefore[k] && R.zones[k].owner_kind === 'boss') delete R.zones[k];
      log.push('Le miroir absorbe la riposte : aucune trace sur la grille.');
    }
    R.riposte_count += 1;
    bossEndTurn(R, env, log);
    R.riposte_next = ripostePlan(R, env, R.spawn_cells[0].x, R.spawn_cells[0].y);
    R.last_riposte = { kind: plan.kind, cells: plan.cells.slice(), by: P.hero_name };
  }
  // ---- V5 T3 §2.5 : riposte du Derby des Lames — vol de tour, tenue de la Bannière ----
  function derbyRiposte(R, env, plan, log) {
    const f = fiche(R, env), B = R.boss;
    const banner = R.units.filter(u => u.kind === 'banner')[0] || null;
    if (B.alive !== false) {
      R.pending_steal = f.steal_pa || 2;
      mech(R, 'vol_de_tour');
      log.push(B.name + ' vole un tour : le prochain passage commencera avec ' + (raidC(env).pa_per_turn - R.pending_steal) + ' PA.');
    }
    if (!banner) return;
    const held = addUnits(R).filter(isAlive).some(v => manhattan(v.x, v.y, banner.x, banner.y) <= 1);
    if (held) {
      R.banner_hold = 0;
      R.banner_lost = (R.banner_lost || 0) + 1;
      mech(R, 'banniere_menacee');
      log.push(tplOf(env.data, 'derby_lost_hold', 'b' + R.riposte_count, {}));
      if (R.banner_lost >= (f.banner_lost_max || 2)) { R.status = 'lost'; R.events.push({ kind: 'lost' }); log.push('Les rivaux tiennent la Bannière ' + R.banner_lost + ' ripostes de suite : le derby est perdu.'); }
      return;
    }
    R.banner_lost = 0;
    R.banner_hold = (R.banner_hold || 0) + 1;
    R.derby_score = (R.derby_score || 0) + (f.score ? f.score.hold : 10);
    mech(R, 'banniere_tenue');
    log.push(tplOf(env.data, 'derby_hold', 'h' + R.riposte_count, { n: R.banner_hold }));
    if (R.banner_hold >= (f.banner_hold_win || 3) && R.status === 'active') {
      R.status = 'won'; R.won_by = R.pass ? R.pass.hero_id : null;
      R.events.push({ kind: 'won', hero_id: R.won_by });
      log.push('La Bannière a tenu ' + R.banner_hold + ' ripostes : le Derby des Lames est gagné.');
    }
  }
  function nearestWater(R) {
    const G = gridOf(R), B = R.boss;
    let best = null;
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) { if (layoutAt(R, x, y) !== WATER) continue; const d = distToBoss(B, x, y); if (!best || d < best.d) best = { x: x, y: y, d: d }; }
    return best;
  }
  // Souffle annoncé : il tombe au début du passage suivant, après le premier tour du héros (§2.2).
  function resolveBreath(R, env, log) {
    const pb = R.pending_breath;
    if (!pb || R.status !== 'active') return;
    R.pending_breath = null;
    const f = fiche(R, env), B = R.boss;
    let dmg = 0, hit = 0;
    for (const v of unitsIn(R, pb.cells)) {
      if (v.side !== 'guild') continue;
      if (v.shield > 0 && v.shield < (f.breath_shield_ignore || 40)) v.shield = 0;      // les boucliers faibles ne tiennent pas
      dmg += damageFromPower(R, env, B, v, pb.power, { magic: true }, null, log, 'le souffle du Drake');
      hit++;
    }
    wearHeroWalls(R, env, pb.blockers || [], pb.power, log);                  // V5 T3b : le bouclier qui arrête le souffle l'encaisse
    putZone(R, env, pb.cells, 'cendres', f.ash_turns || 2, ['sanctuaire']);
    mech(R, 'souffle');
    if (hit) log.push(tplOf(env.data, 'raid_breath_hit', 'bh' + R.riposte_count, { n: dmg }));
    else log.push(tplOf(env.data, 'raid_breath_void', 'bv' + R.riposte_count, { a: R.pass ? R.pass.hero_name : 'la guilde' }));
  }
  function checkPhase(R, env, log) {
    const B = R.boss, f = fiche(R, env), kind = f.kind || 'sylvain';
    if (B.alive === false) return;
    const p = div(B.hp * 100, Math.max(1, B.hp_max));
    let ph = 1;
    if (p <= f.phases[0]) ph = 2;
    if (p <= f.phases[1]) ph = 3;
    if (ph <= B.phase) return;
    B.phase = ph;
    R.events.push({ kind: 'phase', phase: ph });
    if (kind === 'sylvain') {
      if (ph === 2 && f.adds) { spawnAdds(R, env, log); log.push(tplOf(env.data, 'raid_phase2', 'p2', {})); }
      if (ph === 3) { B.shield = Math.max(B.shield, f.shield_p3); log.push(tplOf(env.data, 'raid_phase3', 'p3', { n: f.shield_p3 })); }
    } else if (kind === 'drake') {
      if (ph === 2) { B.flying = f.flight_pass || 1; mech(R, 'envol'); R.events.push({ kind: 'flight' }); log.push(tplOf(env.data, 'raid_flight', 'fl', {})); }
      if (ph === 3) log.push('Le Drake ouvre la gueule sur ses propres écailles : la fournaise commence.');
    } else if (kind === 'hydre') {
      if (ph === 2 && f.adds) { spawnAdds(R, env, log); log.push('La vase bouge : les sangsues sortent.'); }
      if (ph === 3) log.push('L\'Hydre, aux abois, plonge et frappe de toutes ses gueules.');
    }
  }
  function spawnAdds(R, env, log) {
    const f = fiche(R, env), B = R.boss, G = gridOf(R), d = env.data;
    const mon = d.monsters.filter(m => m.id === f.adds.id)[0];
    const L = Math.max(1, div(env.day, f.adds.level_div || 2)), base = { hp: 55 + 10 * L, atk: 13 + 2 * L, def: 8 + L, spd: 6 + div(L, 2) };
    const alive = addUnits(R).filter(isAlive).length;
    const ring = cellsSorted(G, bossCells(B).flatMap(c => [{ x: c.x, y: c.y - 1 }, { x: c.x - 1, y: c.y }, { x: c.x + 1, y: c.y }, { x: c.x, y: c.y + 1 }]).filter(c => freeCell(R, c.x, c.y) && !isBossCell(B, c.x, c.y)));
    let n = 0;
    for (const c of ring) {
      if (n >= (f.adds.per_spawn || f.adds.per_riposte || 2) || alive + n >= f.adds.cap) break;
      const id = 'add_' + String(R.next_unit).padStart(3, '0');
      R.next_unit += 1;
      R.units.push({ id: id, kind: 'add', side: 'boss', owner: 'boss', master_id: null, name: mon ? mon.name : 'Rejeton', gender: 'm', class_id: null, level: L, x: c.x, y: c.y,
        hp_max: pct(pct(base.hp, mon ? mon.hp_pct : 100), f.adds.hp_pct || 100), hp: 0, shield: 0, shield_turns: 0, atk_eff: pct(base.atk, mon ? mon.atk_pct : 100), def: pct(base.def, mon ? mon.def_pct : 100), crit: 0, spd: pct(base.spd, mon ? mon.spd_pct : 100),
        mass: 0, pa_max: 4, pm_max: 2, range_min: 1, range_max: 1, los: false, states: [], cooldowns: {}, born_pass: R.pass_count, passive: null, crit_immune: false });
      R.units[R.units.length - 1].hp = R.units[R.units.length - 1].hp_max;
      n++;
    }
    R.units.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    R.stats.adds_spawned += n;
  }

  // ===================================================================================
  // 7. PASSAGE : début, actions, fin ; nuit ; démarrage du raid
  // ===================================================================================
  function heroUnitOf(R, env, h) {
    const C = raidC(env), d = env.data;
    const pass = d.tactic_passives || {};
    let pm = C.pm_per_turn;
    if ((h.dexterity || 0) >= C.pm_dex_threshold) pm += 1;
    if ((h.traits || []).indexOf('endurant') >= 0) pm += 1;
    pm = Math.min(C.pm_max, pm);
    const u = { id: h.id, kind: 'hero', side: 'guild', owner: h.owner, master_id: null, name: h.name, gender: h.gender || 'm', class_id: h.class_id, level: h.level, x: 0, y: 0,
      hp_max: h.hp_max, hp: h.hp_max, shield: 0, shield_turns: 0, atk_eff: pct(pct(h.atk, moraleMod(h.morale)), fatigueAtkMod(h.fatigue)), def: h.def, heal: h.heal, crit: h.crit, spd: h.spd,
      mass: 0, pa_max: C.pa_per_turn, pm_max: pm, range_min: 1, range_max: 1, los: true, states: [], cooldowns: {}, born_pass: R.pass_count, passive: pass[h.class_id] || null, crit_immune: false, vigor: h.vigor || 0,
      hybrid_id: h.hybrid || null, spec_id: h.spec || null, resource: null, res: 0, res_max: 0, fissures: 0, ripostes_turn: 0, hit_this_turn: 0 };
    if (u.hybrid_id) {
      const H = hybOf(env, u.hybrid_id);
      if (H) { u.resource = H.resource; u.res_max = H.resource_max; u.res = h.hybrid_bonus ? Math.min(H.resource_max, d.lineage ? d.lineage.affinity_resource_bonus : 1) : 0; }
      else u.hybrid_id = null;
    }
    return u;
  }
  function beginPass(R, env, heroId, log) {
    const h = env.heroes[heroId];
    if (!h) return 'héros inconnu';
    if (R.pass) return 'un passage est déjà en cours (' + R.pass.hero_name + ')';
    if (R.status !== 'active') return 'le raid est terminé';
    if (R.passes_done.some(p => p.day === env.day && p.hero_id === heroId)) return h.name + ' a déjà joué son passage aujourd\'hui';
    const u = heroUnitOf(R, env, h);
    let spawn = null;
    for (const c of R.spawn_cells) { const z = zoneAt(R, c.x, c.y); if (freeCell(R, c.x, c.y) && !(z && z.owner_kind === 'boss')) { spawn = c; break; } }
    if (!spawn) for (const c of R.spawn_cells) if (freeCell(R, c.x, c.y)) { spawn = c; break; }
    if (!spawn) return 'aucune case d\'entrée libre';
    u.x = spawn.x; u.y = spawn.y;
    const wall = pct(u.hp_max, env.wall_shield_pct || 0);
    if (wall > 0) addShield(u, wall, 0);
    R.units.push(u);
    R.units.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const C = raidC(env);
    R.pass_count += 1;
    R.heads_cut_pass = 0;
    const legs = R.legs ? 1 : 0;                                            // V5 T3 8B : le Legs du Chronomancien offre un tour au copain suivant
    if (legs) { R.legs = 0; log.push(h.name + ' hérite du temps légué : un tour de passage de plus.'); mech(R, 'legs_recu'); }
    if (R.pending_steal) { addState(u, 'vol_temps', 1, R.pending_steal); R.pending_steal = 0; }   // V5 T3 §2.5 : le Capitaine a volé un tour
    R.pass = { hero_id: heroId, manager_id: h.owner, hero_name: h.name, turn: 1, turn_max: legs + ((h.fatigue || 0) >= 60 ? C.pass_turns_tired : C.pass_turns), pa: 0, pm: 0, seq: R.pass_count, ko: false, done: false,
      spawn: { x: spawn.x, y: spawn.y }, last_cell: null, damage_start: R.damage_total[heroId] || 0, actions: 0, hyb_turn: 0, spec_turn: 0 };
    log.push(tplOf(env.data, tplKind(R, 'raid_enter'), heroId + R.pass_count, { a: h.name, shield: wall, x: spawn.x, y: spawn.y }));
    const traces = tracesLabel(R);
    if (traces) log.push(tplOf(env.data, 'raid_trace', 't' + R.pass_count, { list: traces }));
    const z = zoneAt(R, u.x, u.y);
    if (z) enterZone(R, env, u, z, log);
    startHeroTurn(R, env, u, log);
    return null;
  }
  function tracesLabel(R) {
    const parts = [];
    const counts = {};
    for (const k of sortedKeys(R.zones)) { const z = R.zones[k]; const key = zoneLabel(z.zone_id).toLowerCase() + (z.owner_kind === 'hero' ? ' de ' + (z.owner_name || '').split(' ')[0] : ' du Sylvain'); counts[key] = (counts[key] || 0) + 1; }
    for (const k of sortedKeys(counts)) parts.push(counts[k] + ' case(s) de ' + k);
    for (const s of R.boss.states) parts.push('Sylvain ' + stateLabel(s.id).toLowerCase() + ' (' + (s.turns < 0 ? '∞' : s.turns) + ')');
    for (const u of guildUnits(R).filter(x => x.kind === 'summon')) parts.push(u.name + ' (' + u.hp + ' PV)');
    return parts.length ? parts.join(', ') : '';
  }
  function finishPass(R, env, log) {
    const P = R.pass;
    if (!P || P.done) return;
    if (R.pending_breath && R.status === 'active') resolveBreath(R, env, log);
    const u = heroUnit(R);
    if (u) { P.last_cell = { x: u.x, y: u.y }; R.units = R.units.filter(v => v.id !== u.id); }
    const B = R.boss;
    if ((B.flying || 0) > 0 && R.pass_count > (B.flight_pass_id || 0) && R.status === 'active') {   // §2.2 : l'envol dure un passage, l'atterrissage ouvre la fenêtre
      const f = fiche(R, env);
      B.flying = 0;
      addState(B, 'etourdi', 1, 0); B.last_stun = 1;
      addState(B, 'chancelant', f.stagger_turns || 2, 0);
      mech(R, 'atterrissage');
      R.events.push({ kind: 'stagger' });
      log.push(tplOf(env.data, 'raid_land', 'l' + R.pass_count, {}));
    }
    riposte(R, env, log);
    const dmg = (R.damage_total[P.hero_id] || 0) - P.damage_start;
    R.passes_done.push({ day: env.day, hero_id: P.hero_id, manager_id: P.manager_id, hero_name: P.hero_name, damage: dmg, ko: P.ko, turns: P.turn, actions: P.actions });
    log.push(tplOf(env.data, tplKind(R, 'raid_pass_summary'), P.hero_id + R.pass_count, { a: P.hero_name, dmg: dmg, turns: Math.min(P.turn, P.turn_max), ko: P.ko ? ' — KO' : '', pct: bossPct(R) }));
    P.done = true;
    R.pass = null;
  }
  function bossPct(R) { return div(R.boss.hp * 100, Math.max(1, R.boss.hp_max)); }
  function advanceTurn(R, env, log) {
    const P = R.pass, u = heroUnit(R);
    if (!P) return;
    if (u) endHeroTurn(R, env, u);
    if (R.pending_breath && R.status === 'active') resolveBreath(R, env, log);   // le souffle annoncé tombe après le premier tour du passage
    if (R.status !== 'active' || P.ko) { finishPass(R, env, log); return; }
    runS(R, env, log);
    if (R.status !== 'active' || P.ko) { finishPass(R, env, log); return; }
    if (P.turn >= P.turn_max) { finishPass(R, env, log); return; }
    bossOrdinaryTurn(R, env, log);
    if (R.status !== 'active' || P.ko) { finishPass(R, env, log); return; }
    P.turn += 1;
    const h = heroUnit(R);
    if (h) startHeroTurn(R, env, h, log);
    if (P.ko) finishPass(R, env, log);
  }
  // Application d'une action de passage sur R (muté). Renvoie null si appliquée, sinon la raison.
  function applyPassAction(R, env, a, log) {
    if (!a || typeof a !== 'object') return 'action absente';
    if (R.status !== 'active') return 'le raid est terminé';
    const P = R.pass;
    if (!P) return 'aucun passage en cours';
    const u = heroUnit(R);
    if (!u) return 'le héros n\'est plus sur la grille';
    if (a.type === 'end_pass') { P.actions += 1; finishPass(R, env, log); return null; }
    if (a.type === 'end_turn') { P.actions += 1; advanceTurn(R, env, log); return null; }
    if (a.type === 'move') {
      const to = a.to || {};
      if (!Number.isInteger(to.x) || !Number.isInteger(to.y) || !inb(gridOf(R), to.x, to.y)) return 'destination invalide';
      if (P.pm <= 0) return hasState(u, 'immobilise') ? u.name + ' est immobilisé' + (u.gender === 'f' ? 'e' : '') : 'aucun PM restant';
      if (!freeCell(R, to.x, to.y)) return 'case occupée ou infranchissable';
      const Pth = dijkstra(R, u, u.x, u.y, P.pm), k = cidx(gridOf(R), to.x, to.y);
      if (Pth.cost[k] === undefined) return 'case hors d\'atteinte (' + P.pm + ' PM)';
      const path = pathTo(Pth, k);
      const spent = walkPath(R, env, u, path, log);
      P.pm = Math.max(0, P.pm - spent);
      if (hasState(u, 'immobilise')) P.pm = 0;
      P.actions += 1;
      if (P.ko) finishPass(R, env, log);
      return null;
    }
    if (a.type === 'cast') {
      const s = spellFor(env, u, a.spell_id);
      const why = castWhy(R, env, u, s, a.x, a.y);
      if (why) return why;
      castSpell(R, env, u, s, a.x, a.y, log);
      P.actions += 1;
      checkPhase(R, env, log);
      if (R.status !== 'active') { finishPass(R, env, log); return null; }
      if (P.ko) finishPass(R, env, log);
      return null;
    }
    return 'type d\'action de passage inconnu';
  }
  function nightOf(R, env, log) {
    const C = raidC(env), B = R.boss, f = fiche(R, env);
    if (R.status !== 'active') return;
    if (R.pass) finishPass(R, env, log);
    const regen = healUnit(B, pct(B.hp_max, C.night_regen_pct));
    R.stats.night_regen += regen;
    B.states = B.states.filter(s => s.id === 'fissures');
    B.controls_today = 0; B.last_stun = 0;
    B.flying = 0; B.flight_pass_id = 0;
    R.pending_breath = null; R.skip_riposte = 0; R.heads_cut_pass = 0;
    R.sealed = 0; R.riposte_redirect = null; R.riposte_no_zone = 0; R.legs = 0; R.pending_steal = 0; R.fallen = [];
    B.regen_off = 0;
    if (R.terrain && R.terrain.length) { for (const t of R.terrain) R.layout[t.i] = t.prev; R.terrain = []; }
    if (R.kind === 'derby') {                                               // §2.5 : « ils se sont regroupés au gué » — les rivaux repoussés reviennent au complet
      R.banner_hold = 0; R.banner_lost = 0;
      spawnRivals(R, env, log);
      const bn = R.units.filter(v => v.kind === 'banner')[0];
      if (bn) bn.hp = bn.hp_max;
    }
    if (B.heads) for (const h of B.heads) { h.alive = true; h.hp = h.hp_max; h.regrow = 0; }     // les gueules repoussent toutes la nuit
    for (const u of R.units) { if (u.side === 'boss') u.hp = u.hp_max; }
    for (const k of sortedKeys(R.zones)) { const z = R.zones[k]; if (z.owner_kind === 'boss') delete R.zones[k]; else if (z.turns_left < 99) { z.turns_left -= 1; if (z.turns_left <= 0) delete R.zones[k]; } }
    R.nights += 1;
    R.enrage_pct = R.nights >= 2 ? Math.min(C.enrage_cap_pct, C.enrage_per_night_pct * (R.nights - 1)) : 0;
    const played = R.passes_done.filter(p => p.day === env.day);
    log.push(tplOf(env.data, tplKind(R, 'raid_night'), 'n' + R.nights, { n: R.nights, max: f.max_nights || C.raid_max_nights, regen: regen, pct: bossPct(R), passes: played.length, enrage: R.enrage_pct ? tplOf(env.data, 'raid_enrage', 'e' + R.nights, { n: R.enrage_pct }) : '' }));
    if (!R.stats.burn_turns && played.length) log.push(tplOf(env.data, 'raid_no_burner', 'b' + R.nights, {}));
    R.riposte_next = ripostePlan(R, env, R.spawn_cells[0].x, R.spawn_cells[0].y);
    R.journal = [];
    const maxN = f.max_nights || C.raid_max_nights;
    if (R.nights >= maxN) { R.status = 'lost'; R.events.push({ kind: 'lost' }); log.push(tplOf(env.data, tplKind(R, 'raid_lost'), 'l', { n: R.nights })); }
  }
  function newRaid(env, raidId) {
    const d = env.data, f = d.raids[raidId], C = d.raid, L = d.layouts[f.layout_id];
    const DR = dragonOf(d, f.dragon_id);
    const nM = env.managers.length;
    const day = env.day;
    const hpMax = div((f.hp_base + f.hp_per_day * day) * (nM + C.hp_pool_managers_add), C.hp_pool_managers_div);
    const R = { id: raidId, dragon_id: f.dragon_id, name: DR ? DR.name : raidId, day_start: day, nights: 0, status: 'active', enrage_pct: 0,
      rng_s: fnvU32((env.seed ^ day ^ fnvStr(raidId)) >>> 0), rng_count: 0,
      grid_w: L.w, grid_h: L.h, layout: L.layout.slice(), spawn_cells: L.spawn_cells.map(c => ({ x: c.x, y: c.y })), zones: {},
      boss: { id: f.dragon_id || raidId, kind: 'boss', side: 'boss', name: DR ? DR.name : (f.name || raidId), x: L.boss_cell.x, y: L.boss_cell.y, w: f.boss_w || 2, h: f.boss_h || 2, facing: 'S', hp: hpMax, hp_max: hpMax, shield: 0, shield_turns: 0,
        atk: DR ? DR.atk_base + DR.atk_per_day * day : 18 + day, def: DR ? DR.def_base + DR.def_per_day * day : 8 + div(day, 3), mass: f.boss_mass === undefined ? 3 : f.boss_mass, phase: 1, states: [], cooldowns: {}, controls_today: 0, last_stun: 0, alive: true, crit_immune: !!f.crit_immune, level: 1 + div(day, 2), fissures: 0 },
      units: [], pass: null, pass_count: 0, riposte_count: 0, next_unit: 1, passes_done: [], damage_total: {}, healing_total: {}, journal: [], events: [], won_by: null,
      stats: { casts: {}, regen_total: 0, burn_turns: 0, adds_spawned: 0, shield_absorbed: 0, add_heal: 0, night_regen: 0, mech: {}, res_values: {}, zones: {} },
      riposte_next: null, last_riposte: null, pending_breath: null, skip_riposte: 0, heads_cut_pass: 0 };
    R.kind = f.kind || 'sylvain';
    R.name = DR ? DR.name : (f.name || raidId);
    R.sealed = 0; R.riposte_redirect = null; R.riposte_no_zone = 0; R.legs = 0; R.pending_steal = 0; R.fallen = []; R.terrain = []; R.next_link = 0;
    R.boss.regen_off = 0;
    R.boss.gender = DR ? DR.gender : 'm';
    R.boss.in_water = 0;
    R.boss.flying = 0;
    R.boss.flight_pass_id = 0;
    if (f.def_bonus) R.boss.def += f.def_bonus;                                     // écailles de fer du Drake
    if (f.heads) {
      const hp = div(hpMax, f.head_hp_div || 6);
      R.boss.heads = [];
      for (let i = 0; i < f.heads; i++) R.boss.heads.push({ hp: hp, hp_max: hp, alive: true, regrow: 0 });
    } else R.boss.heads = null;
    if (R.kind === 'derby') {                                                       // §2.5 : la Bannière et les trois compagnons rivaux
      R.boss.name = 'Capitaine ' + (f.rival_name || (d.rival_guilds ? d.rival_guilds[fnvU32(env.seed >>> 0) % d.rival_guilds.length] : 'rival'));
      R.rival_name = f.rival_name || (d.rival_guilds ? d.rival_guilds[fnvU32(env.seed >>> 0) % d.rival_guilds.length] : 'la guilde rivale');
      R.banner_hold = 0; R.banner_lost = 0; R.derby_score = 0;
      const bc = L.banner_cell || { x: div(L.w, 2), y: L.h - 3 };
      R.units.push({ id: 'banniere', kind: 'banner', sub: null, side: 'guild', owner: 'guild', master_id: null, name: 'La Bannière', gender: 'f',
        class_id: null, level: 1, x: bc.x, y: bc.y, hp_max: f.banner_hp || 200, hp: f.banner_hp || 200, shield: 0, shield_turns: 0,
        atk_eff: 0, def: 10, crit: 0, spd: 0, mass: 3, pa_max: 0, pm_max: 0, range_min: 0, range_max: 0, los: false, states: [], cooldowns: {}, born_pass: 0, passive: null, crit_immune: true });
      spawnRivals(R, env, null);
    }
    R.riposte_next = ripostePlan(R, env, R.spawn_cells[0].x, R.spawn_cells[0].y);
    return R;
  }
  // §2.5 : les trois compagnons rivaux (rustre, clerc, rôdeur), générés autour du Capitaine et rétablis chaque matin.
  function spawnRivals(R, env, log) {
    const f = fiche(R, env), B = R.boss, G = gridOf(R), day = R.day_start;
    for (const r of (f.rivals || [])) {
      const id = 'rival_' + r.role;
      const old = unitById(R, id);
      if (old) { old.hp = old.hp_max; old.states = []; old.x = old.home_x; old.y = old.home_y; continue; }
      const cells = cellsSorted(G, [{ x: B.x - 1, y: B.y }, { x: B.x + 1, y: B.y }, { x: B.x, y: B.y + 1 }, { x: B.x - 2, y: B.y + 1 }, { x: B.x + 2, y: B.y + 1 }, { x: B.x, y: B.y + 2 }])
        .filter(c => freeCell(R, c.x, c.y));
      if (!cells.length) continue;
      const c = cells[0];
      const hp = r.hp + 4 * day;
      R.units.push({ id: id, kind: 'add', sub: r.role, role: r.role, side: 'boss', owner: 'boss', master_id: null, name: r.name + ' rival', gender: 'm',
        class_id: null, level: Math.max(1, div(day, 2)), x: c.x, y: c.y, home_x: c.x, home_y: c.y, hp_max: hp, hp: hp, shield: 0, shield_turns: 0,
        atk_eff: r.atk + div(day, 2), def: r.def + div(day, 3), crit: 0, spd: r.spd, mass: 1, pa_max: 4, pm_max: r.pm, range_min: 1, range_max: r.range, los: false,
        states: [], cooldowns: {}, born_pass: R.pass_count, passive: null, crit_immune: false });
      if (log) log.push(r.name + ' rival revient au gué.');
    }
    R.units.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  function dragonOf(d, id) { for (const b of sortedKeys(d.dragons || {})) if (d.dragons[b].id === id) return d.dragons[b]; return null; }

  // ===================================================================================
  // 8. POLITIQUE PAR DÉFAUT (raidDefaults) — déterministe, sans RNG propre (les tirages viennent du rejeu)
  // ===================================================================================
  function reachableCells(R, u, pm, avoid) { const P = dijkstra(R, u, u.x, u.y, pm, avoid); return Object.keys(P.cost).map(Number).sort((a, b) => a - b).map(k => ({ x: k % R.grid_w, y: div(k, R.grid_w), cost: P.cost[k] })); }
  function bossZoneAt(R, x, y) { const z = zoneAt(R, x, y); return !!(z && z.owner_kind === 'boss'); }
  function canCast(R, env, u, id, x, y) { const s = spellFor(env, u, id); return s && !castWhy(R, env, u, s, x, y); }
  function bossCellFor(R, u) { return bossNearestCell(R.boss, u.x, u.y); }
  // Case atteignable (coût ≤ pm) satisfaisant un prédicat ; départage : préférence (score bas), coût, index.
  function bestReachable(R, u, pm, score) {
    let best = null;
    for (const c of reachableCells(R, u, pm, true)) { const s = score(c.x, c.y); if (s === null) continue; if (!best || s < best.s || (s === best.s && c.cost < best.cost)) best = { x: c.x, y: c.y, cost: c.cost, s: s }; }
    return best;
  }
  // Cases libres à distance Manhattan [rmin, rmax] (téléportation), hors zones de boss ; départage score puis index.
  function bestTeleport(R, u, rmin, rmax, score) {
    const G = gridOf(R);
    let best = null;
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) {
      const d = manhattan(u.x, u.y, x, y);
      if (d < rmin || d > rmax || !freeCell(R, x, y) || bossZoneAt(R, x, y)) continue;
      const s = score(x, y);
      if (s === null) continue;
      if (!best || s < best.s) best = { x: x, y: y, s: s };
    }
    return best;
  }
  // Décide UNE action pour le héros courant (ou null = fin de tour).
  // Politique hybride (V5 T2) : deux sorts par hybride, joués avant la routine de classe quand ils servent.
  // Déterministe (aucun tirage), tolérante : `cast` renvoie null si le sort n'est pas jouable, on passe au suivant.
  function hybridPolicy(R, env, u, H) {
    const P = R.pass, B = R.boss, G = gridOf(R);
    const cast = (id, x, y) => (canCast(R, env, u, id, x, y) ? { type: 'cast', spell_id: id, x: x, y: y } : null);
    const bc = bossNearestCell(B, u.x, u.y);
    const dB = distToBoss(B, u.x, u.y);
    const adds = addUnits(R).filter(isAlive);
    const nearAdd = adds.length ? nearest(u, adds) : null;
    const allies = guildUnits(R).filter(v => v.id !== u.id && v.hp > 0);
    const hurt = guildUnits(R).filter(v => v.hp * 2 < v.hp_max).sort((a, b) => a.hp * 100 - a.hp_max * 0 - (b.hp * 100) || (a.id < b.id ? -1 : 1));
    const freeNear = () => cellsSorted(G, [{ x: u.x, y: u.y - 1 }, { x: u.x - 1, y: u.y }, { x: u.x + 1, y: u.y }, { x: u.x, y: u.y + 1 }, { x: u.x - 1, y: u.y - 1 }, { x: u.x + 1, y: u.y - 1 }])
      .filter(c => freeCell(R, c.x, c.y) && !zoneAt(R, c.x, c.y)).sort((a, b) => distToBoss(B, a.x, a.y) - distToBoss(B, b.x, b.y) || cidx(G, a.x, a.y) - cidx(G, b.x, b.y))[0] || null;
    const zoneOn = v => { const z = zoneAt(R, v.x, v.y); return z && z.owner_kind === 'boss' ? z : null; };
    let a = null;
    switch (u.hybrid_id) {
      case 'paladin':
        if ((u.res || 0) >= 3 && (a = cast('onde_ferveur', u.x, u.y))) return a;        // la ferveur se dépense : elle ne sert à rien en réserve
        if (guildUnits(R).some(v => v.kind === 'summon' && v.hp > 0) && !hasState(u, 'garde') && (a = cast('serment', u.x, u.y))) return a;
        return null;
      case 'duelliste':
        if (u.hp * 10 < u.hp_max * 6 && !hasState(u, 'feinte') && (a = cast('feinte', u.x, u.y))) return a;   // le coup de trop s'esquive
        if (!hasState(u, 'defi') && dB <= 2 && (a = cast('defi', bc.x, bc.y))) return a;
        return null;
      case 'chasseur_monstres':
        if (B.flying && (a = cast('filet', bc.x, bc.y))) return a;
        if (dB === 1 && P.pa >= 4 && ((B.fissures || 0) > 0 || hasState(B, 'marque') || P.turn >= P.turn_max) && (a = cast('coup_grace', bc.x, bc.y))) return a;
        if (nearAdd && !hasState(nearAdd, 'immobilise') && (a = cast('filet', nearAdd.x, nearAdd.y))) return a;
        return null;
      case 'capitaine': {
        const rec = subsOf(R, u.id, 'soldat');
        const c = freeNear();
        if (rec.length >= 2 && rec.filter(v => manhattan(v.x, v.y, u.x, u.y) === 1).length >= 1 && (a = cast('formation', u.x, u.y))) return a;
        if (rec.length < 3 && c && (a = cast('lever_recrue', c.x, c.y))) return a;
        return null;
      }
      case 'inquisiteur':
        if (P.pa >= 4 && B.states.filter(z => NEGATIVE_STATES.indexOf(z.id) >= 0).length >= 1 && (a = cast('sentence', bc.x, bc.y))) return a;
        if ((B.shield > 0 || (fiche(R, env).regen_pct > 0 && !hasState(u, 'seve_volee'))) && (a = cast('confession', bc.x, bc.y))) return a;
        if (P.pa >= 4 && (a = cast('sentence', bc.x, bc.y))) return a;
        return null;
      case 'ermite': {
        const dirty = guildUnits(R).filter(v => zoneOn(v)).sort((x, y) => (x.id < y.id ? -1 : 1))[0];
        if (dirty && (a = cast('eau_vive', dirty.x, dirty.y))) return a;
        if ((u.res || 0) < 4 && (a = cast('tracer', bc.x, bc.y))) return a;
        return null;
      }
      case 'oracle':
        if (P.pa >= 4 && (u.res || 0) >= (u.res_max || 2) && R.riposte_next && (a = cast('sablier', bc.x, bc.y))) return a;   // la prophétie pleine arrête une riposte
        if (P.turn === 1 && (a = cast('presage', u.x, u.y))) return a;                                                      // sinon elle écrit la case sûre du copain suivant
        return null;
      case 'spirite':
        if (!hasState(B, 'esprit_cendre') && (a = cast('esprit_cendre', bc.x, bc.y))) return a;
        if ((u.res || 0) < 3 && (a = cast('esprit_gardien', u.x, u.y))) return a;
        return null;
      case 'traqueur': {
        const traps = sortedKeys(R.zones).filter(k => R.zones[k].zone_id === 'piege' && R.zones[k].source_id === u.id);
        if (traps.length >= 2) {                                                     // le fil se tend depuis un piège (portée 1-3), pas depuis sa propre case
          for (const k of traps) { const tx = Number(k) % R.grid_w, ty = div(Number(k), R.grid_w); if ((a = cast('fil_fer', tx, ty))) return a; }
        }
        const c = freeNear();
        if (traps.length < 2 && c && P.pa >= 4 && (a = cast('trap', c.x, c.y))) return a;   // le traqueur prépare son terrain (deux pièges) avant de tendre le fil
        if ((dB > 1 || (u.res || 0) >= (u.res_max || 3)) && (a = cast('embuscade', bc.x, bc.y))) return a;
        return null;
      }
      case 'illusionniste': {
        const dbl = subsOf(R, u.id, 'double');
        const c = freeNear();
        if (dbl.length && (zoneOn(u) || (R.riposte_next && R.riposte_next.cells && R.riposte_next.cells.some(k => k.x === u.x && k.y === u.y))) && (a = cast('echange', dbl[0].x, dbl[0].y))) return a;
        if (dbl.length < 2 && c && (a = cast('double', c.x, c.y))) return a;
        return null;
      }
      case 'tisse_vent':
        if (dB >= 2 && adds.length && (a = cast('rafale', bc.x, bc.y))) return a;
        if (nearAdd && (a = cast('appel_air', nearAdd.x, nearAdd.y))) return a;
        if ((a = cast('appel_air', bc.x, bc.y))) return a;
        return null;
      case 'dresseur': {
        const bete = subsOf(R, u.id, 'bete');
        const c = freeNear();
        if (bete.length && (u.res || 0) > 0 && adds.length && (a = cast('rapporte', u.x, u.y))) return a;
        if (!bete.length && c && (a = cast('bete', c.x, c.y))) return a;
        if (bete.length && (u.res || 0) >= (u.res_max || 3) && (a = cast('rapporte', u.x, u.y))) return a;
        return null;
      }
      case 'conjurateur': {
        const el = subsOf(R, u.id, 'elementaire');
        const c = freeNear();
        if (el.length && dB <= 2 && (u.res || 0) >= 1 && !hasState(u, 'fusion') && (a = cast('fusion', u.x, u.y))) return a;
        if (!el.length && c && (a = cast('elementaire', c.x, c.y))) return a;
        return null;
      }
    }
    return null;
  }
  // V5 T3 — politique par défaut des 26 spés : chaque spé joue son verbe quand la situation l'appelle.
  function specPolicy(R, env, u) {
    const P = R.pass, B = R.boss, G = gridOf(R), f = fiche(R, env);
    const cast = (id, x, y) => (canCast(R, env, u, id, x, y) ? { type: 'cast', spell_id: id, x: x, y: y } : null);
    const bc = bossNearestCell(B, u.x, u.y), dB = distToBoss(B, u.x, u.y);
    const adds = addUnits(R).filter(isAlive);
    const nearAdd = adds.length ? nearest(u, adds) : null;
    const zones = id => sortedKeys(R.zones).filter(k => R.zones[k].zone_id === id);
    const cellOf = k => ({ x: Number(k) % G.w, y: div(Number(k), G.w) });
    const freeNear = n => freeAround(R, u.x, u.y, n === undefined ? 1 : n, true);
    const hurt = guildUnits(R).filter(v => v.hp > 0 && v.kind !== 'banner' && v.hp * 2 < v.hp_max).sort((a, b) => (a.id < b.id ? -1 : 1));
    const banner = R.units.filter(v => v.kind === 'banner')[0] || null;
    const toward = () => { const d = dirOf(u.x, u.y, bc.x, bc.y); return { x: u.x + d.x, y: u.y + d.y }; };
    let a = null;
    switch (u.spec_id) {
      case 'templier': {
        const c = toward();
        const zc = zoneAt(R, c.x, c.y);
        const mend = zc && zc.zone_id === 'mur_heros' && zc.source_id === u.id && zc.hp < WALL_HP;   // V5 T3b : on rafistole son propre bouclier
        if (mend && (a = cast('bouclier_plante', c.x, c.y))) return a;
        if (freeCell(R, c.x, c.y) && !zc && (a = cast('bouclier_plante', c.x, c.y))) return a;
        if (dB >= 2 && dB <= 4 && (a = cast('charge_foi', bc.x, bc.y))) return a;
        return null;
      }
      case 'hospitalier':
        if ((R.fallen || []).length) { for (const c of freeAround(R, u.x, u.y, 4, true)) if (manhattan(c.x, c.y, u.x, u.y) >= 1 && (a = cast('relever', c.x, c.y))) return a; }
        if (hurt.length && (a = cast('onction_zone', hurt[0].x, hurt[0].y))) return a;
        if (hasState(u, 'poison') && (a = cast('onction_zone', u.x, u.y))) return a;
        return null;
      case 'bretteur':
        if (!hasState(u, 'riposte_double') && dB <= 2 && (a = cast('riposte_double', u.x, u.y))) return a;
        if (dB === 1 && (a = cast('botte_secrete', bc.x, bc.y))) return a;
        return null;
      case 'matador': {
        if (u.hp * 10 < u.hp_max * 6 && (a = cast('esquive', u.x, u.y))) return a;
        const walls = [];
        for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) if (layoutAt(R, x, y) === WALL) walls.push({ x: x, y: y });
        const w = walls.slice().sort((p1, p2) => distToBoss(B, p1.x, p1.y) - distToBoss(B, p2.x, p2.y) || cidx(G, p1.x, p1.y) - cidx(G, p2.x, p2.y))[0];
        if (w && (a = cast('cape', w.x, w.y))) return a;
        for (const c of freeNear(4)) if ((a = cast('cape', c.x, c.y))) return a;
        return null;
      }
      case 'harponneur':
        if (B.flying && (a = cast('harpon', bc.x, bc.y))) return a;
        if (nearAdd && manhattan(nearAdd.x, nearAdd.y, u.x, u.y) >= 2 && (a = cast('harpon', nearAdd.x, nearAdd.y))) return a;
        if (nearAdd && manhattan(nearAdd.x, nearAdd.y, u.x, u.y) === 1 && !hasState(nearAdd, 'immobilise') && (a = cast('chaine_givre', nearAdd.x, nearAdd.y))) return a;
        if (dB === 1 && !hasState(B, 'entrave') && (a = cast('chaine_givre', bc.x, bc.y))) return a;
        return null;
      case 'ecorcheur':
        if (dB === 1 && (B.fissures || 0) >= 3 && (a = cast('depecage', bc.x, bc.y))) return a;
        if (dB === 1 && (a = cast('entaille', bc.x, bc.y))) return a;
        return null;
      case 'porte_etendard': {
        if (!zones('etendard').length && banner) { for (const c of freeAround(R, banner.x, banner.y, 4, true)) if ((a = cast('etendard', c.x, c.y))) return a; }
        if (!zones('etendard').length) { for (const c of freeNear(3)) if ((a = cast('etendard', c.x, c.y))) return a; }
        if (zones('etendard').length && subsOf(R, u.id, 'soldat').length && (a = cast('ralliement', u.x, u.y))) return a;
        return null;
      }
      case 'sergent': {
        const rec = subsOf(R, u.id, 'soldat');
        if (rec.length >= 2 && rec.some(v => manhattan(v.x, v.y, u.x, u.y) <= 2) && !rec.every(v => hasState(v, 'formation')) && (a = cast('mur_boucliers', u.x, u.y))) return a;
        if (rec.length < 2) { for (const c of freeNear(3)) if ((a = cast('lever_recrue', c.x, c.y))) return a; }
        if (rec.some(v => hasState(v, 'formation'))) { for (const v of rec) if (!hasState(v, 'abri') && (a = cast('sacrifice_ordonne', v.x, v.y))) return a; }
        return null;
      }
      case 'confesseur':
        if (!hasState(u, 'seve_volee') && (a = cast('vol_seve', bc.x, bc.y))) return a;
        if ((B.shield || 0) > 0 && (a = cast('vol_bouclier', bc.x, bc.y))) return a;
        return null;
      case 'censeur':
        if (!R.sealed && (a = cast('interdit', bc.x, bc.y))) return a;
        if (nearAdd && !hasState(nearAdd, 'silence') && (a = cast('silence', nearAdd.x, nearAdd.y))) return a;
        return null;
      case 'pelerin': {
        const dirty = sortedKeys(R.zones).filter(k => R.zones[k].owner_kind === 'boss').map(cellOf).filter(c => manhattan(c.x, c.y, u.x, u.y) <= 4);
        if (dirty.length && (a = cast('grande_purification', u.x, u.y))) return a;
        if (dirty.length) { for (const c of dirty) if ((a = cast('grande_purification', c.x, c.y))) return a; }
        if (!hasState(u, 'pas_leger') && (a = cast('pas_leger', u.x, u.y))) return a;
        return null;
      }
      case 'sourcier': {
        if (bossCells(B).some(c => layoutAt(R, c.x, c.y) === WATER)) { for (const c of bossCells(B)) if ((a = cast('assechement', c.x, c.y))) return a; }
        if (B.in_water && (a = cast('assechement', bc.x, bc.y))) return a;
        for (const c of freeNear(3)) if (layoutAt(R, c.x, c.y) !== WATER && (a = cast('source', c.x, c.y))) return a;
        return null;
      }
      case 'devin': {
        if (!zones('case_sure').length && (a = cast('vision', u.x, u.y))) return a;
        const far = safeCells(R, env, u, 8).filter(c => manhattan(c.x, c.y, u.x, u.y) >= 2)[0];
        if (far && (a = cast('detourner', far.x, far.y))) return a;
        if ((a = cast('vision', u.x, u.y))) return a;
        return null;
      }
      case 'chronomancien':
        if ((a = cast('sablier_renverse', u.x, u.y))) return a;
        if ((a = cast('legs', u.x, u.y))) return a;
        return null;
      case 'medium':
        if (!hasState(B, 'esprit_cendre') && (a = cast('esprit_cendre_majeur', bc.x, bc.y))) return a;
        if (!hasState(B, 'hantise') && (a = cast('hantise', bc.x, bc.y))) return a;
        return null;
      case 'veilleur':
        if (!zones('esprit_garde').length && (a = cast('esprit_gardien_majeur', u.x, u.y))) return a;
        if (!zones('esprit_garde').length) { for (const c of freeNear(3)) if ((a = cast('esprit_gardien_majeur', c.x, c.y))) return a; }
        if (zones('esprit_garde').length && (a = cast('veille', u.x, u.y))) return a;
        return null;
      case 'assassin': {
        // V5 T3b : le finisseur choisit la cible la PLUS ENTAMÉE, va chercher son dos, paie l'ombre quand il lui reste
        // de quoi enchaîner la lame dans le même tour, puis frappe. Sous le seuil, un rejeton ne se relève pas.
        const blade = spellsIndex(env).lame_dos || { cost_pa: 0 }, shade = spellsIndex(env).ombre_longue || { cost_pa: 0 };
        const ready = ((u.cooldowns || {}).lame_dos || 0) <= 0;
        const preys = adds.slice().sort((v1, v2) => missingTenths(v2) - missingTenths(v1) || (v1.id < v2.id ? -1 : 1));
        let mark = B, mx = bc.x, my = bc.y, md = dB;
        if (preys.length && missingTenths(preys[0]) > missingTenths(B)) { mark = preys[0]; mx = preys[0].x; my = preys[0].y; md = manhattan(u.x, u.y, mx, my); }
        const prime = assassinLow(env, mark) || missingTenths(mark) >= 3;
        if (prime && md === 1) {
          if (ready && (u.res || 0) < (u.res_max || 3) && P.pa >= blade.cost_pa + shade.cost_pa && (a = cast('ombre_longue', u.x, u.y))) return a;
          if ((a = cast('lame_dos', mx, my))) return a;
        }
        const airborne = mark === B && (B.flying || 0) > 0;                  // un Drake en vol ne se poignarde pas : on ne court pas après
        if (prime && ready && !airborne && md > 1 && P.pm > 0 && P.pa >= blade.cost_pa) {
          const cur = md;
          const c = bestReachable(R, u, P.pm, (x, y) => (bossZoneAt(R, x, y) ? null : manhattan(x, y, mx, my) * 10 + (y < my ? 0 : 1)));
          if (c && c.s < cur * 10) return { type: 'move', to: { x: c.x, y: c.y } };
        }
        if ((u.res || 0) < (u.res_max || 3) && (a = cast('ombre_longue', u.x, u.y))) return a;
        return null;
      }
      case 'piegeur': {
        if (adds.length && zones('piege').length) {
          for (const v of adds) { const tr = zones('piege').map(cellOf).sort((p1, p2) => manhattan(p1.x, p1.y, v.x, v.y) - manhattan(p2.x, p2.y, v.x, v.y))[0]; if (tr && manhattan(tr.x, tr.y, v.x, v.y) <= 2 && (a = cast('rabattage', v.x, v.y))) return a; }
        }
        for (const v of adds) {
          const near2 = freeAround(R, v.x, v.y, 6, true).filter(c => manhattan(c.x, c.y, v.x, v.y) === 1 && !zoneAt(R, c.x, c.y));
          for (const c of near2) if (manhattan(c.x, c.y, u.x, u.y) >= 1 && manhattan(c.x, c.y, u.x, u.y) <= 4 && (a = cast('piege_lourd', c.x, c.y))) return a;
        }
        for (const c of freeNear(4)) if ((a = cast('piege_lourd', c.x, c.y))) return a;
        return null;
      }
      case 'mirage':
        if (subsOf(R, u.id, 'double').length < 2) { for (const c of freeNear(3)) if ((a = cast('triple', c.x, c.y))) return a; }
        if (subsOf(R, u.id, 'double').length && (a = cast('miroir', u.x, u.y))) return a;
        return null;
      case 'passe_muraille': {
        const z = zoneAt(R, u.x, u.y);
        if ((z && z.owner_kind === 'boss') || dB > 2) {
          const cand = guildUnits(R).filter(v => v.id !== u.id && v.kind !== 'banner' && distToBoss(B, v.x, v.y) < dB).concat(adds.filter(v => distToBoss(B, v.x, v.y) < dB));
          const best = cand.sort((p1, p2) => distToBoss(B, p1.x, p1.y) - distToBoss(B, p2.x, p2.y) || (p1.id < p2.id ? -1 : 1))[0];
          if (best && (a = cast('grand_echange', best.x, best.y))) return a;
        }
        if (nearAdd && (nearAdd.level || 1) <= (u.level || 1) && !hasState(nearAdd, 'charme') && (a = cast('fils_solides', nearAdd.x, nearAdd.y))) return a;
        return null;
      }
      case 'bourrasque':
        if (adds.length >= 2 && (a = cast('tempete_vent', nearAdd.x, nearAdd.y))) return a;
        if (dB >= 2 && (a = cast('tempete_vent', bc.x, bc.y))) return a;
        if (nearAdd && (a = cast('souffle_court', nearAdd.x, nearAdd.y))) return a;
        if (dB <= 3 && (a = cast('souffle_court', bc.x, bc.y))) return a;
        return null;
      case 'cyclone': {
        if (adds.length >= 2) {
          const cx = div(adds.reduce((n, v) => n + v.x, 0), adds.length), cy = div(adds.reduce((n, v) => n + v.y, 0), adds.length);
          const cands = [{ x: cx, y: cy }, { x: cx, y: cy - 1 }, { x: cx, y: cy + 1 }, { x: cx - 1, y: cy }, { x: cx + 1, y: cy }].concat(adds.map(v => ({ x: v.x, y: v.y })))
            .sort((p1, p2) => adds.filter(v => manhattan(v.x, v.y, p2.x, p2.y) <= 2).length - adds.filter(v => manhattan(v.x, v.y, p1.x, p1.y) <= 2).length || cidx(G, p1.x, p1.y) - cidx(G, p2.x, p2.y));
          for (const c of cands) if ((a = cast('oeil_cyclone', c.x, c.y))) return a;
        }
        if (nearAdd && manhattan(nearAdd.x, nearAdd.y, u.x, u.y) >= 2 && (a = cast('aspiration', nearAdd.x, nearAdd.y))) return a;
        if (dB >= 2 && (a = cast('oeil_cyclone', bc.x, bc.y))) return a;
        return null;
      }
      case 'maitre_ours': {
        const b = subsOf(R, u.id, 'bete')[0];
        if (b && !b.__ours && (a = cast('ours', u.x, u.y))) return a;
        if (b && !hasState(B, 'provoque') && (a = cast('grondement', u.x, u.y))) return a;
        return null;
      }
      case 'fauconnier': {
        const b = subsOf(R, u.id, 'bete')[0];
        if (b && !b.fly && (a = cast('faucon', u.x, u.y))) return a;
        if (B.flying && (a = cast('rabattre', bc.x, bc.y))) return a;
        if (nearAdd && (a = cast('rabattre', nearAdd.x, nearAdd.y))) return a;
        return null;
      }
      case 'avatar':
        if (!hasState(u, 'fusion') && (a = cast('grande_fusion', u.x, u.y))) return a;
        if (hasState(u, 'fusion') && !u.__remanence && (a = cast('remanence', u.x, u.y))) return a;
        return null;
      case 'portier': {
        if (!zones('portail').length) {
          const cands = safeCells(R, env, u, 6).filter(c => manhattan(c.x, c.y, u.x, u.y) >= 2);
          for (const c of cands) if ((a = cast('portail', c.x, c.y))) return a;
        }
        if (nearAdd && zones('portail').length >= 2 && (a = cast('bannissement', nearAdd.x, nearAdd.y))) return a;
        return null;
      }
    }
    return null;
  }
  // V5 T3 §2.5 — sur le gué, la Bannière passe avant le Capitaine : on frappe ce qui s'en approche.
  function bestDamageCast(R, env, u, t) {
    let best = null;
    for (const id of unitSpells(env, u)) {
      const sp = spellFor(env, u, id);
      if (!sp || !(sp.power > 0)) continue;
      const c = isBoss(t) ? bossNearestCell(t, u.x, u.y) : t;
      if (castWhy(R, env, u, sp, c.x, c.y)) continue;
      const score = div(powerOf(sp, u) * 100, Math.max(1, sp.cost_pa));
      if (!best || score > best.score) best = { score: score, action: { type: 'cast', spell_id: id, x: c.x, y: c.y } };
    }
    return best ? best.action : null;
  }
  function derbyPolicy(R, env, u) {
    const P = R.pass, B = R.boss;
    const banner = R.units.filter(v => v.kind === 'banner')[0];
    if (!banner) return null;
    const foes = addUnits(R).filter(isAlive);
    const near = foes.filter(v => manhattan(v.x, v.y, banner.x, banner.y) <= 3)
      .sort((a, b) => manhattan(a.x, a.y, banner.x, banner.y) - manhattan(b.x, b.y, banner.x, banner.y) || a.hp - b.hp || (a.id < b.id ? -1 : 1));
    let t = near[0] || null;
    if (!t && B.alive !== false && distToBoss(B, banner.x, banner.y) <= 3) t = B;
    if (!t) t = foes.length ? nearest(u, foes) : null;
    if (!t) return null;
    const a = bestDamageCast(R, env, u, t);
    if (a) return a;
    if (P.pm > 0) {
      const tc = isBoss(t) ? bossNearestCell(t, u.x, u.y) : t;
      const c = bestReachable(R, u, P.pm, (x, y) => (bossZoneAt(R, x, y) ? null : manhattan(x, y, tc.x, tc.y) * 10 + manhattan(x, y, banner.x, banner.y)));
      const cur = manhattan(u.x, u.y, tc.x, tc.y) * 10 + manhattan(u.x, u.y, banner.x, banner.y);
      if (c && c.s < cur) return { type: 'move', to: { x: c.x, y: c.y } };
    }
    return null;
  }
  function policyAction(R, env, u) {
    const P = R.pass, B = R.boss, G = gridOf(R);
    const dB = distToBoss(B, u.x, u.y);
    const adds = addUnits(R).filter(isAlive);
    const mine = summonsOf(R, u.id);
    const cls = u.class_id;
    const cast = (id, x, y) => (canCast(R, env, u, id, x, y) ? { type: 'cast', spell_id: id, x: x, y: y } : null);
    const bc = bossCellFor(R, u);
    const safeMove = () => {
      if (!bossZoneAt(R, u.x, u.y) || P.pm <= 0) return null;
      const c = bestReachable(R, u, P.pm, (x, y) => (bossZoneAt(R, x, y) ? null : Math.abs(distToBoss(B, x, y) - (cls === 'warrior' || cls === 'rogue' ? 1 : 3))));
      return c ? { type: 'move', to: { x: c.x, y: c.y } } : null;
    };
    const moveTo = (wantDist, extra, through) => {
      if (P.pm <= 0) return null;
      const score = (x, y) => { if (bossZoneAt(R, x, y)) return null; const d = distToBoss(B, x, y); let s = Math.abs(d - wantDist) * 10; if (extra) { const e = extra(x, y); if (e === null) return null; s += e; } return s; };
      const cur = Math.abs(dB - wantDist) * 10 + (extra ? (extra(u.x, u.y) === null ? 1000 : extra(u.x, u.y)) : 0);
      let c = bestReachable(R, u, P.pm, score);
      if ((!c || c.s >= cur) && through) {          // aucun chemin propre : on accepte de traverser les racines (arrêt sur la première)
        let best = null;
        for (const k of reachableCells(R, u, P.pm, false)) { const sc = score(k.x, k.y); if (sc === null) continue; if (!best || sc < best.s || (sc === best.s && k.cost < best.cost)) best = { x: k.x, y: k.y, cost: k.cost, s: sc }; }
        c = best;
      }
      if (!c || c.s >= cur) return null;
      return { type: 'move', to: { x: c.x, y: c.y } };
    };
    const chargeAny = () => { for (const c of bossCells(B)) { const r = cast('charge', c.x, c.y); if (r) return r; } return null; };
    const losTo = (x, y) => { const c = bossNearestCell(B, x, y); return hasLos(G, blockedFn(R), x, y, c.x, c.y) ? 0 : null; };
    // Les héros à distance ne campent pas sur les cases d'entrée : la riposte y laisserait des racines pour le copain suivant.
    const spawnDist = (x, y) => { let m = 99; for (const c of R.spawn_cells) m = Math.min(m, manhattan(x, y, c.x, c.y)); return m; };
    const offSpawn = (x, y) => (spawnDist(x, y) >= 3 ? 0 : 3 - spawnDist(x, y));
    let a = safeMove();
    if (a) return a;
    if (P.pa <= 0) return null;
    const nearestAdd = adds.length ? nearest(u, adds) : null;
    const adjAdd = adds.filter(v => manhattan(v.x, v.y, u.x, u.y) === 1).sort((p, q) => p.hp - q.hp || (p.id < q.id ? -1 : 1))[0] || null;   // le rejeton adjacent le plus faible
    if (u.spec_id && (a = specPolicy(R, env, u))) {                            // V5 T3 : la spécialisation parle avant la voie
      if (a.type === 'move') return a;                                        // V5 T3b : l'Assassin va chercher le contact de sa proie
      const sp = spellFor(env, u, a.spell_id);
      const full = P.pa >= raidC(env).pa_per_turn;
      if (sp && (sp.power > 0 || ((R.pass.spec_turn || 0) === 0 && (P.pa >= sp.cost_pa + 3 || full)))) {
        if (!sp.power) R.pass.spec_turn = R.pass.turn;    // une installation de spé par passage (la voie garde la sienne), jamais au prix d'un coup
        return a;
      }
    }
    a = null;
    if (u.hybrid_id && (a = hybridPolicy(R, env, u))) {                        // V5 T2 : la voie parle avant la routine de base
      const sp = spellFor(env, u, a.spell_id);
      const body = sp && HYB_BODY[sp.id];                                       // recrue, double, bête, élémentaire : des corps, pas une installation
      const full = P.pa >= raidC(env).pa_per_turn;
      if (sp && (sp.power > 0 || body || ((R.pass.hyb_turn || 0) === 0 && (P.pa >= sp.cost_pa + 3 || full)))) return a;   // une installation par passage au plus, jamais au prix d'un coup
    }
    a = null;
    if ((fiche(R, env).kind || '') === 'derby' && (a = derbyPolicy(R, env, u))) return a;    // V5 T3 : garder la Bannière
    a = null;
    switch (cls) {
      case 'warrior': {
        if (P.turn === 1 && (a = cast('bulwark', u.x, u.y))) return a;
        if (dB > 1 && (a = chargeAny())) return a;
        if (dB > 1 && (a = moveTo(1, null, true))) return a;
        if (dB > 1 && (a = chargeAny())) return a;
        if ((mine.length || guildUnits(R).some(v => v.kind === 'summon')) && !hasState(B, 'provoque') && (a = cast('taunt', bc.x, bc.y))) return a;
        if (adjAdd && (a = cast('slash', adjAdd.x, adjAdd.y))) return a;
        if ((a = cast('slash', bc.x, bc.y))) return a;
        if ((a = cast('arme', bc.x, bc.y))) return a;
        return null;
      }
      case 'cleric': {
        const hurt = guildUnits(R).filter(v => v.id !== u.id && v.hp * 2 < v.hp_max);
        if (hurt.length && (a = cast('healing_prayer', hurt[0].x, hurt[0].y))) return a;
        if (u.hp * 10 < u.hp_max * 6 && (a = cast('healing_prayer', u.x, u.y))) return a;
        if ((dB > 3 || spawnDist(u.x, u.y) < 3) && (a = moveTo(2, (x, y) => (losTo(x, y) === null ? null : offSpawn(x, y))))) return a;
        const sanct = zoneAt(R, u.x, u.y);
        if (P.turn === 1 && !(sanct && sanct.zone_id === 'sanctuaire') && (a = cast('sacred_circle', u.x, u.y))) return a;
        if (P.turn === 1 && u.shield === 0 && (a = cast('blessing', u.x, u.y))) return a;
        const bl = guildUnits(R).filter(v => v.id !== u.id && v.shield === 0);
        if (bl.length && P.pa >= 5 && (a = cast('blessing', bl[0].x, bl[0].y))) return a;
        if (nearestAdd && !hasState(nearestAdd, 'aveugle') && (a = cast('light', nearestAdd.x, nearestAdd.y))) return a;
        if ((a = cast('light', bc.x, bc.y))) return a;
        if (dB > 1 && (a = moveTo(1, null, true))) return a;
        if ((a = cast('arme', bc.x, bc.y))) return a;
        return null;
      }
      case 'rogue': {
        const back = (x, y) => (y < B.y && distToBoss(B, x, y) === 1 ? 0 : null);
        if (!(isBack(R, u) && dB === 1)) {
          const c = bestTeleport(R, u, 1, 2, back);
          if (c && (a = cast('sidestep', c.x, c.y))) return a;
          if ((a = moveTo(1, (x, y) => (y < B.y ? 0 : 5)))) return a;
          if (dB > 1) { const c2 = bestTeleport(R, u, 1, 2, (x, y) => (distToBoss(B, x, y) < dB ? distToBoss(B, x, y) * 10 + (y < B.y ? 0 : 5) : null)); if (c2 && (a = cast('sidestep', c2.x, c2.y))) return a; }
        }
        if (dB <= 1 && (a = cast('shadow_strike', bc.x, bc.y))) return a;
        if (nearestAdd && !hasState(nearestAdd, 'etourdi') && manhattan(u.x, u.y, nearestAdd.x, nearestAdd.y) <= 3 && (a = cast('blinding_powder', nearestAdd.x, nearestAdd.y))) return a;
        if (dB <= 2 && P.turn === 2 && (a = cast('time_theft', bc.x, bc.y))) return a;
        if (dB <= 3 && P.turn === 3 && P.pa >= 6 && !hasState(B, 'aveugle') && (a = cast('blinding_powder', bc.x, bc.y))) return a;
        if (adjAdd && (a = cast('arme', adjAdd.x, adjAdd.y))) return a;
        if ((a = cast('arme', bc.x, bc.y))) return a;
        if (dB > 1 && (a = moveTo(1, null, true))) return a;
        return null;
      }
      case 'ranger': {
        if (!hasState(B, 'marque') && (a = cast('hunters_mark', bc.x, bc.y))) return a;
        const good = (x, y) => { const d = distToBoss(B, x, y); return d >= 3 && d <= 7 && losTo(x, y) !== null ? offSpawn(x, y) : null; };
        if ((good(u.x, u.y) === null || good(u.x, u.y) > 0) && (a = moveTo(4, good))) return a;
        if (nearestAdd && (a = cast('snare_arrow', nearestAdd.x, nearestAdd.y))) return a;
        if (P.turn >= 2 && P.pa >= 5) {
          const ring = cellsSorted(G, bossCells(B).flatMap(c => [{ x: c.x, y: c.y + 1 }, { x: c.x - 1, y: c.y }, { x: c.x + 1, y: c.y }])).filter(c => freeCell(R, c.x, c.y) && !zoneAt(R, c.x, c.y) && manhattan(c.x, c.y, u.x, u.y) <= 3 && manhattan(c.x, c.y, u.x, u.y) >= 1);
          if (ring.length && (a = cast('trap', ring[0].x, ring[0].y))) return a;
        }
        if (nearestAdd && nearestAdd.hp * 2 < nearestAdd.hp_max && (a = cast('precise_shot', nearestAdd.x, nearestAdd.y))) return a;
        if ((a = cast('precise_shot', bc.x, bc.y))) return a;
        if (P.turn === 3 && (a = cast('snare_arrow', bc.x, bc.y))) return a;
        if ((a = cast('arme', bc.x, bc.y))) return a;
        if (dB > 5 && (a = moveTo(4))) return a;
        return null;
      }
      case 'mage': {
        const good = (x, y) => { const d = distToBoss(B, x, y); return d >= 2 && d <= 5 && losTo(x, y) !== null ? offSpawn(x, y) : null; };
        if ((good(u.x, u.y) === null || good(u.x, u.y) > 0) && (a = moveTo(3, good))) return a;
        const burn = stateOf(B, 'brule');
        if (nearestAdd) {
          // Tour 2 : Tempête si au moins deux ennemis dans un cercle 2 autour du rejeton le plus proche ; tour 3 : givre sur le rejeton (il ne soigne plus).
          const n = unitsIn(R, shapeCells(G, 'circle', 2, u.x, u.y, nearestAdd.x, nearestAdd.y)).filter(v => v.side === 'boss').length;
          if (P.turn === 2 && n >= 2 && (a = cast('storm', nearestAdd.x, nearestAdd.y))) return a;
          if (P.turn === 3 && !hasState(nearestAdd, 'etourdi') && (a = cast('frost_hold', nearestAdd.x, nearestAdd.y))) return a;
        }
        if ((!burn || burn.turns <= 1) && (a = cast('fire_bolt', bc.x, bc.y))) return a;
        // Tour 3 sans rejeton : un mur de glace deux cases sous le tronc, laissé au suivant (coupe la ligne du fouet vers le sud).
        if (P.turn === 3 && P.pa >= 3 && !adds.length && (u.cooldowns.fire_bolt || 0) > 0) { const wc = { x: bc.x, y: Math.min(G.h - 1, B.y + B.h + 1) }; if (freeCell(R, wc.x, wc.y) && !zoneAt(R, wc.x, wc.y) && (a = cast('ice_wall', wc.x, wc.y))) return a; }
        if ((a = cast('fire_bolt', bc.x, bc.y))) return a;
        if ((a = cast('arme', bc.x, bc.y))) return a;
        return null;
      }
      case 'summoner': {
        if ((dB > 3 || spawnDist(u.x, u.y) < 3) && (a = moveTo(2, offSpawn))) return a;
        const golems = mine.filter(v => v.guard_of), swarms = mine.filter(v => !v.guard_of);
        const near = cellsSorted(G, [{ x: u.x, y: u.y - 1 }, { x: u.x - 1, y: u.y }, { x: u.x + 1, y: u.y }, { x: u.x, y: u.y + 1 }, { x: u.x, y: u.y - 2 }, { x: u.x - 1, y: u.y - 1 }, { x: u.x + 1, y: u.y - 1 }]).filter(c => freeCell(R, c.x, c.y) && !zoneAt(R, c.x, c.y)).sort((p, q) => distToBoss(B, p.x, p.y) - distToBoss(B, q.x, q.y) || cidx(G, p.x, p.y) - cidx(G, q.x, q.y));
        if (!golems.length && near.length && (a = cast('clay_golem', near[0].x, near[0].y))) return a;
        if (!swarms.length && near.length && (a = cast('swarm', near[0].x, near[0].y))) return a;
        const weak = mine.filter(v => v.hp * 2 < v.hp_max);
        if (weak.length && u.hp * 2 > u.hp_max && (a = cast('vital_link', weak[0].x, weak[0].y))) return a;
        const adj = mine.filter(v => distToBoss(B, v.x, v.y) === 1 && v.hp * 5 < v.hp_max * 2);   // une invocation mourante au contact explose ; les autres restent (Présence)
        if (adj.length && (a = cast('sacrifice', adj[0].x, adj[0].y))) return a;
        if (dB === 1 && (a = cast('arme', bc.x, bc.y))) return a;
        if (mine.length >= 2 && dB > 1 && P.pa >= 3 && (a = moveTo(1, null, true))) return a;
        if (dB === 1 && adjAdd && (a = cast('arme', adjAdd.x, adjAdd.y))) return a;
        return null;
      }
    }
    return null;
  }
  function planPass(R, env, heroId) {
    const log = [];
    const why = beginPass(R, env, heroId, log);
    if (why) return { actions: [], reason: why };
    const actions = [];
    let guard = 0;
    while (R.pass && !R.pass.done && guard++ < 60) {
      const u = heroUnit(R);
      if (!u) break;
      const a = policyAction(R, env, u) || { type: 'end_turn' };
      const err = applyPassAction(R, env, a, log);
      if (err) { const e = { type: 'end_turn' }; applyPassAction(R, env, e, log); actions.push(e); continue; }
      actions.push(a);
    }
    if (R.pass && !R.pass.done) { applyPassAction(R, env, { type: 'end_pass' }, log); actions.push({ type: 'end_pass' }); }
    return { actions: actions, reason: null };
  }

  // ===================================================================================
  // 9. API PUBLIQUE (pure)
  // ===================================================================================
  function withRaid(state, R) { const s = Object.assign({}, state); s.raid = R; return s; }
  function raidOf(state) { return state && state.raid && state.raid.status ? state.raid : null; }
  function heroRaidWhy(R, env, heroId) {
    const h = env.heroes[heroId];
    if (!h) return 'héros inconnu';
    if (h.injury_severity >= 2) return h.name + ' est gravement blessé' + (h.gender === 'f' ? 'e' : '');
    if (h.injury_severity >= 1) return h.name + ' est blessé' + (h.gender === 'f' ? 'e' : '') + ' : repos forcé';
    if (h.fatigue >= 100) return h.name + ' est épuisé' + (h.gender === 'f' ? 'e' : '');
    if (R.passes_done.some(p => p.day === env.day && p.hero_id === heroId)) return h.name + ' a déjà joué aujourd\'hui';
    return null;
  }
  function startRaid(state, raidId, env) {
    if (!env || !env.data || !env.data.raids || !env.data.raids[raidId]) return state;
    return withRaid(state, newRaid(env, raidId));
  }
  // Rejeu d'une liste d'actions de passage (validation ou résolution). Renvoie {raid, ok, reason, index, log, events}.
  function playPass(state, heroId, actions, env, opts) {
    const R0 = raidOf(state);
    if (!R0) return { raid: null, ok: false, reason: 'aucun raid en cours', index: -1, log: [], events: [] };
    const R = clone(R0);
    R.events = [];
    const log = [];
    const why = heroRaidWhy(R, env, heroId) || beginPass(R, env, heroId, log);
    if (why) return { raid: R0, ok: false, reason: why, index: -1, log: log, events: [] };
    let i = 0, reason = null;
    const list = Array.isArray(actions) ? actions : [];
    if (list.length > 60) return { raid: R0, ok: false, reason: 'passage trop long (max 60 actions)', index: -1, log: log, events: [] };
    for (; i < list.length; i++) {
      if (!R.pass || R.pass.done) { reason = 'action ' + (i + 1) + ' : le passage est déjà terminé'; break; }
      const err = applyPassAction(R, env, list[i], log);
      if (err) { reason = 'action ' + (i + 1) + ' (' + (list[i] && list[i].type) + (list[i] && list[i].spell_id ? ' ' + list[i].spell_id : '') + ') : ' + err; break; }
    }
    if (reason && opts && opts.strict) return { raid: R0, ok: false, reason: reason, index: i, log: log, events: [] };
    if (R.pass && !R.pass.done) applyPassAction(R, env, { type: 'end_pass' }, log);
    R.journal.push({ day: env.day, pass: R.pass_count, hero_id: heroId, hero_name: env.heroes[heroId].name, lines: log.slice(0, 8), ko: R.passes_done[R.passes_done.length - 1].ko, damage: R.passes_done[R.passes_done.length - 1].damage });
    const events = R.events.slice();
    R.events = [];
    return { raid: R, ok: !reason, reason: reason, index: i, log: log, events: events };
  }
  function validateRaidPass(state, heroId, actions, env) {
    const r = playPass(state, heroId, actions, env, { strict: true });
    return r.ok ? { ok: true } : { ok: false, reason: r.reason };
  }
  function raidPass(state, heroId, actions, env) {
    const r = playPass(state, heroId, actions, env, { strict: false });
    return { state: r.raid === raidOf(state) ? state : withRaid(state, r.raid), ok: r.ok, reason: r.reason, log: r.log, events: r.events };
  }
  // API op-par-op (§7.3) : begin_pass | move | cast | end_turn | end_pass sur le passage en cours.
  function raidAction(state, action, env) {
    const R0 = raidOf(state);
    if (!R0) return { state: state, ok: false, reason: 'aucun raid en cours', log: [], events: [] };
    const R = clone(R0);
    R.events = [];
    const log = [];
    let err;
    if (action && action.type === 'begin_pass') err = heroRaidWhy(R, env, action.hero_id) || beginPass(R, env, action.hero_id, log);
    else err = applyPassAction(R, env, action, log);
    if (err) return { state: state, ok: false, reason: err, log: log, events: [] };
    const events = R.events.slice(); R.events = [];
    return { state: withRaid(state, R), ok: true, reason: null, log: log, events: events };
  }
  function raidEndPass(state, env) { return raidAction(state, { type: 'end_pass' }, env); }
  function raidNight(state, env) {
    const R0 = raidOf(state);
    if (!R0) return { state: state, log: [], events: [] };
    const R = clone(R0);
    R.events = [];
    const log = [];
    nightOf(R, env, log);
    const events = R.events.slice(); R.events = [];
    return { state: withRaid(state, R), log: log, events: events };
  }
  // Politique par défaut : un passage complet par héros apte du manager (simulation séquentielle sur une copie).
  function raidDefaults(state, managerId, env) {
    const R0 = raidOf(state);
    if (!R0) return [];
    let R = clone(R0);
    const out = [];
    for (const id of sortedKeys(env.heroes)) {
      const h = env.heroes[id];
      if (h.owner !== managerId) continue;
      if (env.raiders && env.raiders.indexOf(id) < 0) continue;
      if (heroRaidWhy(R, env, id)) continue;
      const r = planPass(R, env, id);
      if (r.reason) continue;
      out.push({ adventurer_id: id, actions: r.actions });
      if (R.status !== 'active') break;
    }
    return out;
  }
  function raidDefaultsFor(state, heroId, env) {
    const R0 = raidOf(state);
    if (!R0 || heroRaidWhy(R0, env, heroId)) return null;
    const r = planPass(clone(R0), env, heroId);
    return r.reason ? null : r.actions;
  }

  // ---- Vue (VM.raid) ----
  function spellVm(R, env, u, id, fromPass) {
    const s = spellFor(env, u, id);
    const why = fromPass ? castWhy(R, env, u, s, u.x, u.y) : null;
    const zone = s.shape && s.shape !== 'single' ? ({ circle: 'cercle ', cross: 'croix ', line: 'ligne ', cone: 'cône ', wall3: 'mur de ' }[s.shape] || s.shape) + (s.r || 3) : 'cible';
    return { id: s.id, name: s.name, hybrid_id: s.hybrid_id || null, spec_id: s.spec_id || null, daily: !!s.daily, anchor: !!s.anchor, cost_pa: s.cost_pa, range_min: s.range_min, range_max: s.range_max, los: !!s.los, line_only: !!s.line_only, shape: s.shape || 'single', r: s.r || 0, power: powerOf(s, u), magic: !!s.magic, target: s.target,
      range_label: s.range_min === s.range_max ? String(s.range_min) : s.range_min + '-' + s.range_max, zone_label: zone, verb: s.verb || '', cooldown: s.cooldown || 0, cooldown_left: (u.cooldowns && u.cooldowns[id]) || 0,
      castable: !why || !/PA insuffisants|relance/.test(why), reason: why && /PA insuffisants|relance/.test(why) ? why : '', description: s.description || '', crit_bonus: s.crit_bonus || 0, back_power: s.back_power ? powerOf({ power: s.back_power }, u) : 0, effect_labels: (s.effect_labels || []).slice() };
  }
  function unitVm(u, managerId) {
    return { id: u.id, kind: u.kind, sub: u.sub || null, name: u.name, owner_name: u.owner_name || '', owner_id: u.owner || '', x: u.x, y: u.y, hp: u.hp, hp_max: u.hp_max, shield: u.shield || 0, def: u.def, level: u.level || 1, master_id: u.master_id || null,
      states: u.states.map(s => ({ id: s.id, label: stateLabel(s.id), turns: s.turns, value: s.value || 0 })), is_mine: u.owner === managerId, side: u.side };
  }
  function raidView(state, managerId, env) {
    const R = raidOf(state);
    if (!R) return null;
    const C = raidC(env), f = fiche(R, env), G = gridOf(R), B = R.boss;
    const mgrName = id => { for (const m of env.managers) if (m.id === id) return m.name; return id; };
    const myHeroes = sortedKeys(env.heroes).filter(id => env.heroes[id].owner === managerId);
    let me = { hero_id: null, can_play: false, reason: 'aucun héros', cell: null, pass: null, spells: [], reachable: [], default_actions: [], atk_eff: 0, pm_max: 0, hybrid: null };
    for (const id of myHeroes) {
      const why = heroRaidWhy(R, env, id);
      if (why && me.hero_id) continue;
      const h = env.heroes[id];
      const Rp = clone(R);
      const log = [];
      const err = why || beginPass(Rp, env, id, log);
      if (err) { me = { hero_id: id, can_play: false, reason: err, cell: null, pass: null, spells: [], reachable: [], default_actions: [], atk_eff: 0, pm_max: 0, hybrid: h.hybrid ? { id: h.hybrid, name: (hybOf(env, h.hybrid) || {}).name || h.hybrid, resource: (hybOf(env, h.hybrid) || {}).resource || '', resource_name: (hybOf(env, h.hybrid) || {}).resource_name || '', value: 0, max: (hybOf(env, h.hybrid) || {}).resource_max || 0 } : null }; continue; }
      const u = heroUnit(Rp), P = Rp.pass;
      me = { hero_id: id, can_play: true, reason: null, cell: { x: u.x, y: u.y }, atk_eff: u.atk_eff, heal: u.heal, pm_max: u.pm_max, crit: u.crit, level: u.level, class_id: u.class_id, hp: u.hp, hp_max: u.hp_max,
        pass: { turn: 1, turn_max: P.turn_max, pa: P.pa, pa_max: C.pa_per_turn, pm: P.pm, pm_max: u.pm_max, seq: P.seq },
        spells: unitSpells(env, u).map(sid => spellVm(Rp, env, u, sid, true)),
        spec: u.spec_id ? { id: u.spec_id, name: (specOf(env, u.spec_id) || {}).name || u.spec_id, verb: (specOf(env, u.spec_id) || {}).verb || '' } : null,
        hybrid: u.hybrid_id ? { id: u.hybrid_id, name: (hybOf(env, u.hybrid_id) || {}).name || u.hybrid_id, resource: u.resource, resource_name: (hybOf(env, u.hybrid_id) || {}).resource_name || '', value: u.res, max: u.res_max } : null,
        reachable: reachableCells(Rp, u, P.pm), shield: u.shield,
        default_actions: (raidDefaultsFor(state, id, env) || []) };
      break;
    }
    const ripCells = me.cell ? ripostePlan(R, env, me.cell.x, me.cell.y).cells : R.riposte_next.cells;
    const ripSet = {}; for (const c of ripCells) ripSet[cidx(G, c.x, c.y)] = 1;
    const cells = [];
    for (let y = 0; y < G.h; y++) for (let x = 0; x < G.w; x++) {
      const k = cidx(G, x, y), z = R.zones[String(k)] || null;
      cells.push({ x: x, y: y, kind: ['floor', 'wall', 'water', 'pit'][R.layout[k]] || 'floor', zone: z ? { id: z.zone_id, label: zoneLabel(z.zone_id), turns_left: z.turns_left, mine: z.source_id ? (env.heroes[z.source_id] ? env.heroes[z.source_id].owner === managerId : false) : false, owner_name: z.owner_name || '' } : null,
        safe: !(z && z.owner_kind === 'boss') && !ripSet[k] && !isBossCell(B, x, y), boss: isBossCell(B, x, y), spawn: R.spawn_cells.some(c => c.x === x && c.y === y) });
    }
    const passesToday = R.passes_done.filter(p => p.day === env.day);
    const waiting = [];
    for (const m of env.managers) for (const id of sortedKeys(env.heroes)) { const h = env.heroes[id]; if (h.owner === m.id && !heroRaidWhy(R, env, id) && (!env.raiders || env.raiders.indexOf(id) >= 0)) waiting.push(h.name + ' (' + m.name + ')'); }
    const warnings = [];
    const classes = {}, hybrids = {};
    for (const id of sortedKeys(env.heroes)) { classes[env.heroes[id].class_id] = 1; if (env.heroes[id].hybrid) hybrids[env.heroes[id].hybrid] = 1; }
    const kind = f.kind || 'sylvain';
    const burner = classes.mage || hybrids.spirite || hybrids.conjurateur;
    if (kind === 'sylvain') {
      if (!burner) warnings.push('La sève coule sans obstacle : aucun brûleur dans la guilde (Mage, Spirite, Conjurateur).');
      if (B.phase >= 2 && !classes.ranger && !classes.mage && !classes.rogue) warnings.push('Les rejetons soignent le tronc : personne pour les contrôler.');
    } else if (kind === 'drake') {
      if (!hybrids.chasseur_monstres && !hybrids.tisse_vent && !classes.mage) warnings.push('Personne pour ancrer l\'envol : ni ancre (Chasseur de monstres, Tisse-vent) ni portée longue sans ligne de vue (Mage).');
      if (!hybrids.chasseur_monstres && !classes.mage) warnings.push('Les écailles de fer tiennent : personne pour fissurer l\'armure ni pour frapper en magie.');
    } else if (kind === 'hydre') {
      if (!burner) warnings.push('Les souches ne seront pas cautérisées : les têtes repousseront toutes.');
      if (!classes.summoner && !hybrids.capitaine && !hybrids.illusionniste && !hybrids.dresseur) warnings.push('Aucun corps à offrir aux trois gueules : les héros prendront les trois morsures.');
    }
    const phaseLabels = { sylvain: ['l\'arbre veille', 'les rejetons', 'l\'écorce'], drake: ['les écailles de fer', 'le ciel de cendres', 'la fournaise'], hydre: ['trois gueules', 'la tourbière', 'aux abois'] };
    return { active: R.status === 'active', id: R.id, name: R.name, kind: kind, day_start: R.day_start, nights: R.nights, max_nights: f.max_nights || C.raid_max_nights, status: R.status, phase: B.phase, phase_label: 'Phase ' + B.phase + ' — ' + (phaseLabels[kind] || phaseLabels.sylvain)[B.phase - 1],
      hp_pct: bossPct(R), hp_label: B.hp + ' / ' + B.hp_max, enrage_pct: R.enrage_pct || 0, regen_pct: hasState(B, 'brule') ? 0 : f.regen_pct,
      boss: { id: B.id, name: B.name, x: B.x, y: B.y, w: B.w, h: B.h, facing: B.facing, hp: B.hp, hp_max: B.hp_max, shield: B.shield, def: B.def, atk: B.atk, mass: hasState(B, 'chancelant') ? 0 : B.mass, phase: B.phase, crit_immune: !!B.crit_immune,
        states: B.states.map(s => ({ id: s.id, label: stateLabel(s.id), turns: s.turns, value: s.value || 0 })), next_riposte: { kind: R.riposte_next.kind, label: R.riposte_next.label, cells: ripCells.map(c => ({ x: c.x, y: c.y })) },
        last_riposte: R.last_riposte ? { kind: R.last_riposte.kind, by: R.last_riposte.by, cells: R.last_riposte.cells.map(c => ({ x: c.x, y: c.y })) } : null,
        heads: B.heads ? B.heads.map(h => ({ hp: h.hp, hp_max: h.hp_max, hp_pct: div(h.hp * 100, Math.max(1, h.hp_max)), alive: !!h.alive, regrow: h.regrow })) : null,
        flying: B.flying || 0, in_water: B.in_water || 0, pending_breath: R.pending_breath ? R.pending_breath.cells.map(c => ({ x: c.x, y: c.y })) : null,
        fissures: B.fissures || 0, controls_today: B.controls_today || 0, tenacity_label: 'ténacité ' + (B.controls_today || 0) + '/3' },
      grid: { w: G.w, h: G.h, cells: cells },
      units: unitsSorted(R).map(u => { const v = unitVm(u, managerId); v.owner_name = u.owner === 'boss' ? B.name : mgrName(u.owner); return v; }),
      me: me,
      derby: kind === 'derby' ? { rival_name: R.rival_name || '', banner: (function () { const b = R.units.filter(v => v.kind === 'banner')[0]; return b ? { x: b.x, y: b.y, hp: b.hp, hp_max: b.hp_max } : null; }()),
        hold: R.banner_hold || 0, hold_win: f.banner_hold_win || 3, lost: R.banner_lost || 0, lost_max: f.banner_lost_max || 2, score: R.derby_score || 0,
        steal_pa: R.pending_steal || 0, rivals: R.units.filter(v => v.role).map(v => ({ id: v.id, name: v.name, role: v.role, hp: v.hp, hp_max: v.hp_max })) } : null,
      passes_today: passesToday.map(p => ({ hero_name: p.hero_name, manager_name: mgrName(p.manager_id), damage: p.damage, ko: p.ko, turns: p.turns })),
      waiting_on: waiting, journal: R.journal.map(j => ({ hero_name: j.hero_name, lines: j.lines.slice(0, 8), ko: j.ko, damage: j.damage })),
      damage_total: sortedKeys(R.damage_total).map(id => ({ hero_id: id, name: env.heroes[id] ? env.heroes[id].name : id, damage: R.damage_total[id] })),
      warnings: warnings, lineage: null };
  }
  // Aperçu pur côté page, à partir de la vue : mêmes helpers de forme/portée/LdV que raidAction.
  function previewCast(view, spellId, target) {
    const out = { valid: false, reason: '', cells: [], targets: [], path: null };
    if (!view || !view.me || !view.me.can_play) { out.reason = 'aucun passage possible'; return out; }
    const s = view.me.spells.filter(x => x.id === spellId)[0];
    if (!s) { out.reason = 'sort inconnu'; return out; }
    const G = { w: view.grid.w, h: view.grid.h };
    const x = target && Number.isInteger(target.x) ? target.x : -1, y = target && Number.isInteger(target.y) ? target.y : -1;
    if (!inb(G, x, y)) { out.reason = 'case hors de la grille'; return out; }
    const me = view.me.cell, B = view.boss;
    const bossAt = (cx, cy) => cx >= B.x && cx < B.x + B.w && cy >= B.y && cy < B.y + B.h;
    let tx = x, ty = y;
    if (bossAt(x, y)) { const c = bossNearestCell(B, me.x, me.y); tx = c.x; ty = c.y; }
    const d = manhattan(me.x, me.y, tx, ty);
    if (d < s.range_min || d > s.range_max) { out.reason = 'hors de portée (' + d + ', portée ' + s.range_label + ')'; return out; }
    if (s.line_only && me.x !== tx && me.y !== ty) { out.reason = 'cible hors ligne'; return out; }
    const blocked = i => { const c = view.grid.cells[i]; return c.kind === 'wall' || !!(c.zone && c.zone.id === 'mur_glace'); };
    if (s.los && d > 0 && !hasLos(G, blocked, me.x, me.y, tx, ty)) { out.reason = 'pas de ligne de vue'; return out; }
    const self = { id: view.me.hero_id, kind: 'hero', side: 'guild', name: 'moi', x: me.x, y: me.y, def: 0, states: [] };
    const unitAtV = (cx, cy) => (cx === me.x && cy === me.y ? self : view.units.filter(u => u.x === cx && u.y === cy)[0] || null);
    const t = bossAt(x, y) ? B : unitAtV(x, y);
    const isEnemy = t && (t === B || t.side === 'boss');
    switch (s.target) {
      case 'enemy': if (!isEnemy) { out.reason = 'il faut viser un ennemi'; return out; } break;
      case 'ally': if (!t || t === B || t.side !== 'guild') { out.reason = 'il faut viser un allié'; return out; } break;
      case 'self': if (!(x === me.x && y === me.y)) { out.reason = 'sort personnel (visez votre case)'; return out; } break;
      case 'summon': if (!t || t === B || t.kind !== 'summon') { out.reason = 'il faut viser une invocation'; return out; } break;
      case 'cell': {
        // V5 T3b : l'aperçu mentait ici — il ignorait les murs POSÉS (mur de glace, mur de terre, bouclier planté),
        // que le moteur refuse par `passable`. Même règle des deux côtés, y compris le droit de replanter son bouclier.
        if (t) { out.reason = 'la case doit être libre'; return out; }
        const vc = view.grid.cells[cidx(G, x, y)];
        const zid = vc.zone ? vc.zone.id : null;
        const mend = s.id === 'bouclier_plante' && zid === 'mur_heros' && vc.zone.mine;
        if (!mend && (vc.kind === 'wall' || vc.kind === 'pit' || zid === 'mur_glace' || zid === 'mur_terre' || zid === 'mur_heros')) { out.reason = 'case infranchissable'; return out; }
        break;
      }
      case 'unit': if (!t) { out.reason = 'il faut viser une unité'; return out; } break;
    }
    if (s.hybrid_id) {                                                       // V5 T2 : mêmes refus que hybridWhy, lus dans la vue (l'aperçu ne ment jamais)
      const res = view.me.hybrid ? view.me.hybrid.value : 0;
      const subs = sub => view.units.filter(v => v.master_id === view.me.hero_id && v.sub === sub && v.hp > 0).length;
      const why = (function () {
        if ((t === B || (t && t.side === 'boss' && bossAt(x, y))) && (B.flying || 0) > 0 && !s.anchor && (s.range_max < 4 || s.los || s.line_only)) return 'le Drake est en vol : hors de portée (il faut une ancre ou une portée ≥ 4 sans ligne de vue)';
        if (s.id === 'presage' && res < 1) return 'pas assez de prophétie (1 requise)';
        if (s.id === 'sablier' && res < 2) return 'pas assez de prophétie (2 requises)';
        if (s.id === 'rapporte' && res < 1) return 'pas assez d\'ordres (1 requis)';
        if (s.id === 'rapporte' && !subs('bete')) return 'aucune bête sur la grille';
        if (s.id === 'fusion' && res < 1) return 'pas assez d\'essence (1 requise)';
        if (s.id === 'fusion' && !subs('elementaire')) return 'aucun élémentaire à absorber';
        if (s.id === 'lever_recrue' && subs('soldat') >= 3) return 'trois recrues déjà levées';
        if (s.id === 'double' && subs('double') >= 2) return 'deux doubles déjà sur la grille';
        if (s.id === 'echange' && !(t && t !== B && t.side === 'boss') && !(t && t.kind === 'summon' && t.sub === 'double')) return 'il faut viser un double ou un ennemi non-boss';
        return null;
      }());
      if (why) { out.reason = why; return out; }
    }
    if (s.spec_id) {                                                         // V5 T3 : mêmes refus que specWhy, lus dans la vue
      const subs = sub => view.units.filter(v => v.master_id === view.me.hero_id && v.sub === sub && v.hp > 0).length;
      const zone = id => view.grid.cells.filter(c => c.zone && c.zone.id === id).length;
      const why = (function () {
        if (s.id === 'ralliement' && !subs('soldat')) return 'aucune recrue à rallier';
        if (s.id === 'mur_boucliers' && !view.units.some(v => v.master_id === view.me.hero_id && v.sub === 'soldat' && Math.abs(v.x - me.x) + Math.abs(v.y - me.y) === 1)) return 'aucune recrue au contact';
        if (s.id === 'sacrifice_ordonne' && !(t && t.master_id === view.me.hero_id)) return 'il faut désigner une de vos recrues';
        if ((s.id === 'ours' || s.id === 'grondement' || s.id === 'faucon') && !subs('bete')) return 'aucune bête sur la grille';
        if (s.id === 'rabattre' && !subs('bete')) return 'aucun faucon à lancer';
        if (s.id === 'bannissement' && zone('portail') < 2) return 'aucun portail ouvert';
        if (s.id === 'grand_echange' && (!t || t === B)) return 'il faut viser une unité qui n\'est pas le monstre';
        if (s.id === 'fils_solides' && !(t && t !== B && t.side === 'boss')) return 'il faut viser un rejeton';
        if (s.id === 'triple' && subs('double') >= 3) return 'trois doubles déjà sur la grille';
        if (s.id === 'miroir' && !subs('double')) return 'aucun double à faire viser';
        if (s.id === 'portail' && Math.abs(x - me.x) + Math.abs(y - me.y) < 2) return 'les deux portes doivent être écartées (2 cases au moins)';
        if (s.id === 'source' && view.grid.cells[cidx(G, x, y)].kind === 'water') return 'il y a déjà de l\'eau ici';
        return null;
      }());
      if (why) { out.reason = why; return out; }
    }
    if (s.cooldown_left > 0) { out.reason = 'relance dans ' + s.cooldown_left + ' tour(s)'; return out; }
    if (view.me.pass.pa < s.cost_pa) { out.reason = 'PA insuffisants'; return out; }
    out.cells = shapeCells(G, s.shape, s.r, me.x, me.y, x, y);
    const seen = {};
    for (const c of out.cells) {
      const v = bossAt(c.x, c.y) ? B : unitAtV(c.x, c.y);
      if (!v || seen[v.id]) continue;
      seen[v.id] = 1;
      const enemy = v === B || v.side === 'boss';
      const eff = [];
      let dmin = 0, dmax = 0, heal = 0;
      if (s.power > 0 && enemy && s.target !== 'ally' && s.target !== 'cell') {
        let power = s.power;
        if (s.id === 'shadow_strike' && v === B && me.y < B.y) power = s.back_power;
        const fake = { def: v.def, states: v.states.map(z => ({ id: z.id, turns: z.turns, value: z.value })), kind: v === B ? 'boss' : v.kind };
        const de = defEff(fake, { magic: s.magic });
        dmin = takenMods(fake, dmgOf(rawOf(view.me.atk_eff, power, 90), de));
        dmax = takenMods(fake, dmgOf(rawOf(view.me.atk_eff, power, 110), de));
      }
      if (s.id === 'healing_prayer' && !enemy) heal = pct(view.me.heal || 0, 200) + 10;
      for (const lab of s.effect_labels || []) eff.push(lab);
      out.targets.push({ unit_id: v.id, name: v.name, dmg_min: Math.max(0, dmin), dmg_max: Math.max(0, dmax), dmg_crit_max: pct(Math.max(0, dmax), 150), heal: heal, effects: eff });
    }
    out.valid = true;
    return out;
  }

  return { startRaid: startRaid, raidView: raidView, raidAction: raidAction, raidEndPass: raidEndPass, raidNight: raidNight, raidDefaults: raidDefaults, raidDefaultsFor: raidDefaultsFor,
    validateRaidPass: validateRaidPass, raidPass: raidPass, previewCast: previewCast, checkEffects: checkEffects,
    _internal: { newRaid: newRaid, beginPass: beginPass, applyPassAction: applyPassAction, planPass: planPass, heroUnitOf: heroUnitOf, policyAction: policyAction, specPolicy: specPolicy, riposte: riposte, unitSpells: unitSpells, castWhy: castWhy, heroUnit: heroUnit, finishPass: finishPass, shapeCells: shapeCells, hasLos: hasLos, bresClear: bresClear, dirOf: dirOf, manhattan: manhattan, dijkstra: dijkstra, pathTo: pathTo, makeRng: makeRng, fnvStr: fnvStr, fnvU32: fnvU32, rawOf: rawOf, dmgOf: dmgOf, controlPermille: controlPermille, ripostePlan: ripostePlan, classSpells: classSpells, spellFor: spellFor, powerOf: powerOf, bossNearestCell: bossNearestCell, effectKinds: { unit: EFFECT_KINDS_UNIT, cell: EFFECT_KINDS_CELL, by_spell: EFFECT_KINDS_BY_SPELL } } };
}));
