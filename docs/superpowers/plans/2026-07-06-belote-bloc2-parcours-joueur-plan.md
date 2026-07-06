# Belote — Bloc 2 « Parcours joueur » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner au jeu Belote son squelette produit — Accueil, Réglages avant-partie, table (existante), Fin de partie soignée, « Comment jouer » statique, et les états manquants (chargement, erreur, reprise, 1er lancement) — sans toucher la logique de jeu du bloc 1.

**Architecture :** Machine à vues vanilla dans `index.html` : une seule fonction `showView(v)` bascule 4 sections (`accueil`/`reglages`/`help`/`game`) ; la table actuelle devient la vue `game`. Les helpers de graine (base36, auto/fixed) vivent dans un module pur `src/seedcode.mjs` (unit-testé en Node, servi au client). Le serveur gagne un seul passthrough (`annonces` sur `/api/new`). Réglages mémorisés en `localStorage`.

**Tech Stack :** Node 24 (`node:test`), serveur `node:http` dédié (port 4137), UI HTML/CSS/JS vanilla (zéro dépendance, zéro build), Playwright headless (`--disable-gpu`) pour l'e2e DOM.

**Spec de référence :** `docs/superpowers/specs/2026-07-06-belote-bloc2-parcours-joueur-design.md`.

## Global Constraints

- **Périmètre** : bloc 2 ne touche QUE `llm-lego/experiments/belote-claude/index.html` et
  `web/server.mjs` (+ nouveau `src/seedcode.mjs` et ses tests). **`web/driver.mjs` et `src/*` du jeu
  restent INCHANGÉS** — aucune régression des règles.
- **Invariant de navigation (ratifié §3.2)** : **`showView(v)` est l'UNIQUE point d'entrée de
  navigation.** Aucun écran ne s'affiche autrement. Les sections `.screen` sont masquées par défaut ;
  seul `app.dataset.view` (posé par `showView`) en révèle une. (Point d'accroche du bloc 3 : hash.)
- **Reprise = directe à la table** (ratifié §3.4) : au chargement, `/api/state` 200 & `phase≠game_over`
  → `showView('game')` sans passer par l'Accueil. 409 / `game_over` → Accueil.
- **Rejouer = mêmes réglages, nouvelle graine par défaut** (ratifié §3.6) ; graine **fixée
  manuellement** = réutilisée. Auto ⇒ 2 Rejouer donnent des distributions **différentes**.
- **Graine visible sur l'écran Fin** (ratifié §3.7), base36, copiable.
- **Ambition minimale** (§3.1) : pas de tuto interactif, pas de profils. « Comment jouer » = statique.
- **Ids conservés** `#seed`/`#target`/`#sortPref` (déplacés en Réglages) pour la continuité des tests.
- **Git** : commit par task (lane JEUX). **Jamais de push** sans go explicite Pierre.
- Chemins repo-relatifs, `utf-8`, pas de fichiers tmp résiduels. `node_modules/` et `tools/` gitignore.
- e2e Playwright : lancer chromium avec `args: ["--disable-gpu"]` (le renderer headless crashe sinon,
  cf. bloc 1). Les tests **plein-jeu** (partie complète en DOM) sont **connus flaky** sur ce poste
  (crash renderer, aucune erreur JS) — la correctness des points concernés est doublée d'un **unit**.

---

## Vue d'ensemble des fichiers

| Fichier | Action | Responsabilité bloc 2 |
|---|---|---|
| `src/seedcode.mjs` | **créer** | graine pure : `seedToStr`/`strToSeed`/`resolveSeed` (base36, auto/fixed) |
| `test/seedcode.test.mjs` | **créer** | unités graine (roundtrip, auto≠fixed) |
| `web/server.mjs` | modifier | `/api/new` accepte `annonces` (passthrough driver) |
| `index.html` | modifier | machine à vues `showView` + écrans Accueil/Réglages/Help + Fin promue + boot/reprise + ☰ Menu + états + astuce 1er lancement + settings localStorage |
| `web/e2e-lib.mjs` | modifier | `startGame(page,{seed,target,annonces})` navigue Accueil→Réglages→Commencer |
| `web/e2e.sort/reorder/declare/belote.mjs` | modifier | démarrent via `startGame()` (non-régression) |
| `web/e2e.shell.mjs` | **créer** | e2e parcours : flux, reprise, menu, erreur, help, astuce, annonces OFF, invariant vue |
| `web/e2e.fin.mjs` | **créer** | e2e Fin : graine affichée + Rejouer (auto≠, fixed=) — plein-jeu, flaky-toléré |

---

## PHASE A — Serveur & fondation navigation

### Task 1 : `/api/new` accepte `annonces`

**Files:**
- Modify: `web/server.mjs` (route `/api/new`, ~59-64)

**Interfaces:**
- Produces: `POST /api/new { seed, target, annonces }` → `new BeloteDriver({ seed, target, annonces })`.

- [ ] **Step 1 : Repérer la route** — dans `web/server.mjs`, la route `/api/new` fait
  `game = new BeloteDriver({ seed, target })`.

- [ ] **Step 2 : Ajouter le passthrough `annonces`**

Remplacer le corps de la route `/api/new` :
```js
if (path === "/api/new" && req.method === "POST") {
  const body = await readJson(req);
  const seed = Number.isFinite(+body.seed) ? +body.seed : 1;
  const target = Number.isFinite(+body.target) ? +body.target : 501;
  const annonces = body.annonces === undefined ? true : !!body.annonces;
  game = new BeloteDriver({ seed, target, annonces });
  return send(res, 200, game.view());
}
```

- [ ] **Step 3 : Preuve curl** — démarrer le serveur puis :
```
BELOTE_PORT=4200 node web/server.mjs &   # (ou start_studio équivalent)
curl -s -X POST localhost:4200/api/new -H "Content-Type: application/json" -d '{"seed":3,"target":501,"annonces":false}' | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const v=JSON.parse(s);console.log('seed',v.seed,'target',v.target)})"
```
Attendu : `seed 3 target 501`. (annonces=false : plus tard, aucune phase `annonce_expose`.)

- [ ] **Step 4 : Commit**
```
git add llm-lego/experiments/belote-claude/web/server.mjs
git commit -m "feat(belote): /api/new accepte annonces (passthrough driver)"
```

### Task 2 : `src/seedcode.mjs` — graine pure (base36, auto/fixed)

**Files:**
- Create: `src/seedcode.mjs`
- Test: `test/seedcode.test.mjs`

**Interfaces:**
- Produces :
  - `seedToStr(n) → string` (base36 d'un uint32).
  - `strToSeed(s) → number|null` (`null` si vide = auto ; parse base36).
  - `resolveSeed(seedMode, seed, rng) → uint32` (`fixed`+seed fini → seed ; sinon graine aléatoire via `rng()`).

- [ ] **Step 1 : Test**

`test/seedcode.test.mjs` :
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { seedToStr, strToSeed, resolveSeed } from "../src/seedcode.mjs";

test("seedToStr / strToSeed — roundtrip base36", () => {
  for (const n of [0, 3, 9, 123456, 4294967295]) {
    assert.equal(strToSeed(seedToStr(n)), n >>> 0);
  }
  assert.equal(strToSeed("3"), 3);        // rétro-compat seeds numériques des tests bloc 1
  assert.equal(strToSeed(""), null);      // vide = auto
  assert.equal(strToSeed("   "), null);
});

test("resolveSeed — fixed réutilise la graine, auto en tire une nouvelle", () => {
  assert.equal(resolveSeed("fixed", 42, () => 0.5), 42);       // fixed → inchangé
  // auto → dépend du rng (deux rng différents ⇒ deux graines différentes)
  const a = resolveSeed("auto", null, () => 0.10);
  const b = resolveSeed("auto", null, () => 0.90);
  assert.notEqual(a, b);
  assert.ok(a >= 0 && a <= 0xffffffff && Number.isInteger(a));
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/seedcode.test.mjs` → FAIL (module absent).

- [ ] **Step 3 : Implémentation**

`src/seedcode.mjs` :
```js
// Belote — helpers de GRAINE (purs) : encodage base36 + résolution auto/fixed.
// Sert la rejouabilité (bloc 1) et l'ancre seed-first de l'écran Fin (bloc 2 §4.4).

/** uint32 → chaîne base36 courte et partageable. */
export function seedToStr(n) {
  return (n >>> 0).toString(36);
}

/** Chaîne (base36 ou décimal) → uint32, ou null si vide (= graine auto). */
export function strToSeed(s) {
  const t = String(s == null ? "" : s).trim();
  if (!t) return null;
  const n = parseInt(t, 36);
  return Number.isFinite(n) ? n >>> 0 : null;
}

/** Graine effective : 'fixed' + graine finie → la graine ; sinon aléatoire via rng()∈[0,1). */
export function resolveSeed(seedMode, seed, rng) {
  if (seedMode === "fixed" && Number.isFinite(seed)) return seed >>> 0;
  return Math.floor(rng() * 0x100000000) >>> 0;
}
```

- [ ] **Step 4 : Lancer, vérifier le succès** — `node --test test/seedcode.test.mjs` → PASS.

- [ ] **Step 5 : Commit**
```
git add llm-lego/experiments/belote-claude/src/seedcode.mjs llm-lego/experiments/belote-claude/test/seedcode.test.mjs
git commit -m "feat(belote): src/seedcode.mjs — graine pure (base36, auto/fixed) + unit"
```

### Task 3 : Machine à vues `showView` + squelette des écrans

**Files:**
- Modify: `index.html` (structure `.app`, CSS `.screen`, module import, boot minimal)
- Test: `web/e2e.shell.mjs` (créé ici, étape 1 partielle)

**Interfaces:**
- Produces : `showView(v)` (v ∈ `"accueil"|"reglages"|"help"|"game"`) — pose `app.dataset.view=v`,
  **seul** moyen de montrer une vue. Sections `#view-accueil/#view-reglages/#view-help/#view-game`.

- [ ] **Step 1 : e2e (invariant + bascule)**

Créer `web/e2e.shell.mjs` (modèle : `web/e2e.sort.mjs`), 1er cas seulement :
1. démarrer serveur, ouvrir la page ;
2. **assert** : au chargement, `app[data-view]` vaut `accueil` et **une seule** `.screen` est visible
   (`#view-accueil`), les autres masquées ;
3. exécuter `page.evaluate(()=>window.showView('help'))` → `data-view=help`, seul `#view-help` visible ;
4. **assert** : aucune `.screen` n'a `display` non-none sauf celle de la vue courante.

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node web/e2e.shell.mjs` → FAIL (pas de vues).

- [ ] **Step 3 : Structure HTML**

Dans `index.html`, envelopper le **contenu de jeu existant** (le `.hud` + `.stage` + `.hand-actions`
+ `.hand-wrap` + les 3 overlays) dans `<div id="view-game" class="screen">…</div>`, et ajouter en
sœurs, à l'intérieur de `<div class="app">` :
```html
<section id="view-accueil" class="screen">
  <div class="menu">
    <div class="brand-lg">♠ Belote<small>Claude</small></div>
    <button id="playBtn" class="menu-btn">Jouer</button>
    <button id="resumeBtn" class="menu-btn" style="display:none">Reprendre la partie</button>
    <button id="helpBtn" class="menu-btn ghost">Comment jouer</button>
  </div>
</section>

<section id="view-reglages" class="screen">
  <div class="menu">
    <h2>Réglages</h2>
    <label class="row">Cible
      <select id="target"><option value="1000" selected>1000</option><option value="501">501</option></select></label>
    <label class="row">Tri de la main
      <select id="sortPref"><option value="couleur">couleur</option><option value="force">force</option><option value="atouts-d-abord">atouts d'abord</option></select></label>
    <label class="row">Annonces
      <select id="annonces"><option value="on" selected>activées</option><option value="off">désactivées</option></select></label>
    <details class="adv"><summary>Avancé</summary>
      <label class="row">Graine <input id="seed" type="text" placeholder="(auto)" /></label>
      <p class="hint">Vide = partie aléatoire. Une graine fixe rejoue les mêmes cartes.</p>
    </details>
    <button id="startBtn" class="menu-btn">Commencer</button>
    <button id="backHomeBtn" class="menu-btn ghost">Retour</button>
  </div>
</section>

<section id="view-help" class="screen">
  <div class="menu help-sheet" id="helpContent"></div>
  <button id="backHome2Btn" class="menu-btn ghost">Retour</button>
</section>
```
**Retirer explicitement** la barre `<div class="hud-actions">…</div>` du `.hud` (elle contient
`#seed`/`#target`/`#sortPref`/`#newBtn`) : ces ids vivent désormais **uniquement** dans
`#view-reglages` (sinon **ids dupliqués** → `getElementById` casse). Le `.hud` de jeu ne garde que la
marque + les chips de score ; on lui ajoutera le ☰ Menu en Task 6.

- [ ] **Step 4 : CSS des écrans + invariant**

Ajouter au `<style>` :
```css
.screen { display: none; flex: 1; flex-direction: column; min-height: 0; }
.app[data-view="accueil"] #view-accueil,
.app[data-view="reglages"] #view-reglages,
.app[data-view="help"] #view-help,
.app[data-view="game"] #view-game { display: flex; }
.menu { flex: 1; display: flex; flex-direction: column; gap: 12px; align-items: stretch;
  justify-content: center; padding: 28px 22px; max-width: 420px; margin: 0 auto; width: 100%; }
.brand-lg { font-family: var(--font-display); font-size: 34px; color: var(--brass-hi); text-align: center; }
.brand-lg small { display:block; font-size: 11px; letter-spacing: 4px; color: var(--muted); text-transform: uppercase; }
.menu-btn { font-size: 16px; padding: 14px; border-radius: 12px; }
.menu-btn.ghost { background: linear-gradient(#5c6b63,#3c4842); color: var(--cream); box-shadow: 0 2px 0 #26302b,0 3px 6px #0006; }
.menu .row { display:flex; justify-content:space-between; align-items:center; gap:10px; font-size:14px; color:var(--cream); }
.menu select, .menu input { padding:8px 10px; border-radius:8px; border:1px solid #0006; background:#f7f4ec; color:#222; font-size:14px; }
.adv summary { cursor:pointer; color:var(--muted); font-size:13px; }
.menu .hint { font-size:11px; color:var(--muted); margin:4px 0 0; }
.help-sheet { text-align:left; overflow:auto; }
```

- [ ] **Step 5 : `showView` + boot minimal**

Dans le script inline, ajouter (près du haut, après `const $ = …`) :
```js
const APP = document.querySelector(".app");
function showView(v) { APP.dataset.view = v; }   // UNIQUE point d'entrée de navigation
window.showView = showView;                       // hook de test
```
Et tout en bas du script, un **boot** minimal (sera enrichi en Task 6) :
```js
showView("accueil");
```
Retirer l'ancien `$("newBtn").addEventListener(...)` (le bouton n'existe plus) — recâblage en Task 5.
**Ne pas** encore supprimer `newGame()` (réutilisé/renommé en Task 5).

- [ ] **Step 6 : Lancer, vérifier le succès** — `node web/e2e.shell.mjs` → PASS (invariant + bascule).

- [ ] **Step 7 : Commit**
```
git add llm-lego/experiments/belote-claude/index.html llm-lego/experiments/belote-claude/web/e2e.shell.mjs
git commit -m "feat(belote): machine a vues showView + ecrans Accueil/Reglages/Help (invariant nav unique)"
```

## PHASE B — Réglages, démarrage, non-régression bloc 1

### Task 4 : Réglages → `startGame()` + settings localStorage + navigation Accueil

**Files:**
- Modify: `index.html` (module import seedcode, `loadSettings`/`saveSettings`, `startGame`, listeners)

**Interfaces:**
- Consumes : `seedToStr`/`strToSeed`/`resolveSeed` (`/src/seedcode.mjs`), `showView`.
- Produces : `startGame()` (lit Réglages → `POST /api/new {seed,target,annonces}` → `showView('game')`),
  `settings` persistées (`belote.settings`). Boutons Accueil↔Réglages câblés.

- [ ] **Step 1 : e2e (flux nominal)** — ajouter à `web/e2e.shell.mjs` un cas :
  Accueil → clic `#playBtn` → `data-view=reglages` → régler `#target=501` → clic `#startBtn` →
  `data-view=game` et `window.__belote.phase` ∈ enchère/jeu. Vérifier `localStorage['belote.settings']`
  contient `target:501`.

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node web/e2e.shell.mjs` → FAIL (pas de startGame).

- [ ] **Step 3 : Import module** — dans le `<script type="module">` existant (qui importe déjà
  `sortHandForDisplay`), ajouter :
```js
import { seedToStr, strToSeed, resolveSeed } from "/src/seedcode.mjs";
window.__seed = { seedToStr, strToSeed, resolveSeed };
```

- [ ] **Step 4 : Settings + startGame (script inline)** — remplacer l'ancien `newGame()` et la ligne
  `let sortPref = localStorage.getItem("belote.sortPref") || "couleur";` par :
```js
// --- réglages persistés ---
function loadSettings() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem("belote.settings") || "{}"); } catch {}
  return {
    target: s.target || 1000,
    sortPref: s.sortPref || localStorage.getItem("belote.sortPref") || "couleur", // migration douce
    annonces: s.annonces === undefined ? true : !!s.annonces,
    seedStr: s.seedStr || "",
    seedMode: s.seedMode === "fixed" ? "fixed" : "auto",
  };
}
function saveSettings(s) { localStorage.setItem("belote.settings", JSON.stringify(s)); }
let settings = loadSettings();
let sortPref = settings.sortPref;      // (le reste du code lit `sortPref`)
let lastSeedUsed = null;               // graine réellement jouée (pour Fin + Rejouer)

function readReglages() {
  const seedStr = $("seed").value;
  const seedMode = strToSeed(seedStr) === null ? "auto" : "fixed";
  settings = {
    target: Number($("target").value) || 1000,
    sortPref: $("sortPref").value,
    annonces: $("annonces").value === "on",
    seedStr: seedMode === "fixed" ? seedStr.trim() : "",
    seedMode,
  };
  sortPref = settings.sortPref;
  saveSettings(settings);
}

async function startGame() {
  const seed = resolveSeed(settings.seedMode, strToSeed(settings.seedStr), Math.random);
  lastSeedUsed = seed;
  hideErr();
  $("dealPanel").classList.add("hidden");
  $("gamePanel").classList.add("hidden");
  shown.clear(); trickEl.innerHTML = ""; lastWinner = null; handOrder = null; prevHandIds = [];
  const { status, data } = await api("/api/new", { seed, target: settings.target, annonces: settings.annonces });
  if (status !== 200) { showErr("démarrage impossible"); return; }
  showView("game");
  await apply(data);
}
```

- [ ] **Step 5 : Câbler les boutons** — remplacer l'ancien `$("newBtn")…` et le bloc `$("sortPref")…`
  par :
```js
// préremplir Réglages depuis settings
function fillReglages() {
  $("target").value = String(settings.target);
  $("sortPref").value = settings.sortPref;
  $("annonces").value = settings.annonces ? "on" : "off";
  $("seed").value = settings.seedStr;
}
$("playBtn").addEventListener("click", () => { fillReglages(); showView("reglages"); });
$("backHomeBtn").addEventListener("click", () => showView("accueil"));
$("startBtn").addEventListener("click", () => { readReglages(); startGame(); });
$("helpBtn").addEventListener("click", () => showView("help"));
$("backHome2Btn").addEventListener("click", () => showView("accueil"));
// le tri en cours de partie reste ajustable ? Non : le tri se choisit en Réglages (avant-partie).
```
(L'ancien listener `#sortPref change` in-game est supprimé : le tri est un réglage avant-partie.)

Dans `render(s)`, l'ancien binding du bouton Rejouer de fin de partie référence `newGame` (supprimé).
Remplacer **`const ag = $("againBtn"); if (ag) ag.addEventListener("click", newGame);`** par
**`const ag = $("againBtn"); if (ag) ag.addEventListener("click", startGame);`** (interim ; l'écran Fin
et son `replay()` remplaceront tout ce bloc en Task 8). Évite un `ReferenceError` à `game_over`.

- [ ] **Step 6 : Lancer, vérifier le succès** — `node web/e2e.shell.mjs` → PASS (flux nominal).

- [ ] **Step 7 : Commit**
```
git add llm-lego/experiments/belote-claude/index.html
git commit -m "feat(belote): ecran Reglages -> startGame + settings localStorage (cible/tri/annonces/graine)"
```

### Task 5 : Non-régression bloc 1 — `startGame()` helper e2e

**Files:**
- Modify: `web/e2e-lib.mjs` (nouveau `startGame`), `web/e2e.sort.mjs`, `web/e2e.reorder.mjs`,
  `web/e2e.declare.mjs`, `web/e2e.belote.mjs`

**Interfaces:**
- Produces : `startGame(page, { seed, target, annonces })` — depuis n'importe quelle vue :
  `showView`? Non — par **clics réels** : `#playBtn` → remplir Réglages → `#startBtn`, puis attendre
  `data-view=game`.

- [ ] **Step 1 : Ajouter `startGame` à `web/e2e-lib.mjs`**
```js
// Démarre une partie par le parcours réel : Accueil → Réglages → Commencer.
// Idempotent depuis n'importe quelle vue (repart de l'Accueil via le hook de test showView) —
// ne dépend donc PAS du ☰ Menu (Task 6), ce qui permet aux e2e bloc 1 de redémarrer une partie.
export async function startGame(page, { seed = "", target = 501, annonces = true } = {}) {
  await page.evaluate(() => window.showView && window.showView("accueil")); // plumbing test : retour Accueil
  await page.waitForFunction(() => document.querySelector(".app")?.dataset.view === "accueil", null, { timeout: 8000 });
  await page.click("#playBtn");
  await page.waitForFunction(() => document.querySelector(".app")?.dataset.view === "reglages", null, { timeout: 8000 });
  await page.selectOption("#target", String(target));
  await page.selectOption("#annonces", annonces ? "on" : "off");
  // graine : ouvrir Avancé si besoin puis remplir
  if (seed !== "") { await page.evaluate(() => { const d = document.querySelector(".adv"); if (d) d.open = true; }); await page.fill("#seed", String(seed)); }
  await page.click("#startBtn");
  await page.waitForFunction(() => document.querySelector(".app")?.dataset.view === "game" && window.__belote, null, { timeout: 8000 });
}
```

- [ ] **Step 2 : Remplacer les démarrages ad hoc** — dans `e2e.sort/reorder/declare/belote.mjs`,
  remplacer les séquences `page.fill("#seed",…); page.selectOption("#target",…); page.click("#newBtn")`
  (et le `newGame(page, seed)` local de declare/belote) par un `import { startGame } from "./e2e-lib.mjs"`
  et un appel `await startGame(page, { seed: <n>, target: 501, annonces: true })`. Exemple pour
  `e2e.declare.mjs` (fonction `newGame`) :
```js
import { startGame, reachPlay, playOneDealDOM } from "./e2e-lib.mjs";
async function newGame(page, seed) {
  await page.evaluate(() => { window.__belote = null; });
  await startGame(page, { seed, target: 501, annonces: true }); // idempotent (repart Accueil)
}
```
(`startGame` étant idempotent, chaque `newGame` redémarre proprement sans dépendre du ☰ Menu.
Pour `e2e.sort/reorder` qui ne redémarrent qu'une fois, un simple `startGame` suffit aussi.)

- [ ] **Step 3 : Lancer toute la batterie bloc 1**
```
for t in sort reorder declare belote; do echo "== $t =="; node web/e2e.$t.mjs 2>&1 | tail -1; done
```
Attendu : `RESULT: PASS` partout. (`e2e.cards` ne démarre pas de partie → inchangé, mais le relancer.)

- [ ] **Step 4 : Commit**
```
git add llm-lego/experiments/belote-claude/web/e2e-lib.mjs llm-lego/experiments/belote-claude/web/e2e.sort.mjs llm-lego/experiments/belote-claude/web/e2e.reorder.mjs llm-lego/experiments/belote-claude/web/e2e.declare.mjs llm-lego/experiments/belote-claude/web/e2e.belote.mjs
git commit -m "test(belote): e2e bloc 1 demarrent via startGame() (parcours Accueil->Reglages) — non-regression"
```

## PHASE C — Reprise, menu, états

### Task 6 : Boot/reprise + ☰ Menu + bouton « Reprendre »

**Files:**
- Modify: `index.html` (boot, `#menuBtn` dans le HUD de jeu, `#resumeBtn`, confirmation)

**Interfaces:**
- Consumes : `GET /api/state` (200 → partie ; 409 → aucune), `showView`.
- Produces : au chargement, reprise directe si partie active ; ☰ Menu (confirme si partie en cours) ;
  « Reprendre » d'Accueil visible ssi partie active.

- [ ] **Step 1 : e2e (reprise + menu)** — ajouter à `web/e2e.shell.mjs` :
  - démarrer une partie (`startGame`), puis `page.reload()` → **assert** `data-view=game` **directement**
    (pas d'Accueil) et `window.__belote` présent.
  - clic `#menuBtn` → (confirmer via `page.on("dialog", d=>d.accept())`) → `data-view=accueil`, et
    `#resumeBtn` visible ; clic `#resumeBtn` → `data-view=game`.

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node web/e2e.shell.mjs` → FAIL (pas de boot/menu).

- [ ] **Step 3 : ☰ Menu dans le HUD de jeu** — dans `#view-game` `.hud`, ajouter à la fin
  (après les chips) :
```html
<button id="menuBtn" class="hud-menu" title="Menu">☰</button>
```
CSS : `.hud-menu{ font-size:16px; padding:8px 12px; }`.

- [ ] **Step 4 : Reprise au boot + menu (script)** — remplacer la ligne `showView("accueil");`
  (Task 3) par :
```js
async function isGameActive() {
  try {
    const { status, data } = await api("/api/state");
    return status === 200 && data && data.phase && data.phase !== "game_over" ? data : null;
  } catch { return null; }
}
async function boot() {
  const active = await isGameActive();
  if (active) { showView("game"); await apply(active); }   // reprise DIRECTE (ratifié §3.4)
  else showView("accueil");
}
$("menuBtn").addEventListener("click", async () => {
  const active = await isGameActive();
  if (active && !confirm("Quitter la partie en cours ?")) return;
  $("resumeBtn").style.display = active ? "block" : "none";
  showView("accueil");
});
$("resumeBtn").addEventListener("click", async () => {
  const active = await isGameActive();
  if (active) { showView("game"); await apply(active); } else showView("accueil");
});
boot();
```

- [ ] **Step 5 : Lancer, vérifier le succès** — `node web/e2e.shell.mjs` → PASS (reprise + menu).

- [ ] **Step 6 : Commit**
```
git add llm-lego/experiments/belote-claude/index.html
git commit -m "feat(belote): reprise directe au reload (/api/state) + ☰ Menu (confirmation) + Reprendre"
```

### Task 7 : État d'erreur (serveur injoignable) + chargement

**Files:**
- Modify: `index.html` (carte d'erreur, indicateur de chargement, robustesse `boot`/`startGame`)

**Interfaces:**
- Produces : vue d'erreur (carte + « Réessayer ») quand `/api/new` ou `/api/state` échoue ;
  indicateur de chargement léger pendant ces appels.

- [ ] **Step 1 : e2e (erreur)** — ajouter à `web/e2e.shell.mjs` : ouvrir la page **sans** serveur
  joignable (ou couper le serveur puis `page.reload()`), **assert** qu'une carte d'erreur `#errCard`
  est visible avec un bouton `#retryBtn` (pas d'écran blanc).

- [ ] **Step 2 : Lancer, vérifier l'échec** — FAIL (pas de carte d'erreur).

- [ ] **Step 3 : Markup + CSS** — dans `.app`, ajouter une couche :
```html
<div id="loading" class="veil hidden"><div class="spin"></div></div>
<div id="errCard" class="veil hidden">
  <div class="sheet"><h3>Connexion perdue</h3>
    <p class="hint">Le serveur de jeu est injoignable.</p>
    <div class="btnrow"><button id="retryBtn">Réessayer</button></div></div>
</div>
```
CSS : `.veil{ position:absolute; inset:0; z-index:60; display:flex; align-items:center; justify-content:center; background:#0009; } .veil.hidden{ display:none; } .spin{ width:34px;height:34px;border-radius:50%;border:3px solid #ffffff33;border-top-color:var(--brass-hi);animation:spin 1s linear infinite; } @keyframes spin{ to{ transform:rotate(360deg) } }`.

- [ ] **Step 4 : Brancher chargement/erreur** — ajouter des helpers et les utiliser dans `boot` et
  `startGame` :
```js
const showLoading = (on) => $("loading").classList.toggle("hidden", !on);
const showErrCard = (on) => $("errCard").classList.toggle("hidden", !on);
```
Envelopper les appels réseau de `boot()` et `startGame()` :
```js
async function boot() {
  showErrCard(false); showLoading(true);
  let active = null;
  try { active = await isGameActive(); }
  catch { showLoading(false); showErrCard(true); return; }
  showLoading(false);
  if (active) { showView("game"); await apply(active); } else showView("accueil");
}
```
Et dans `startGame`, en cas d'exception réseau (try/catch autour du `api("/api/new")`) →
`showLoading(false); showErrCard(true);`. Bouton réessayer :
```js
$("retryBtn").addEventListener("click", () => { showErrCard(false); boot(); });
```
(`isGameActive` : distinguer 409 (pas de partie, **normal** → accueil) d'une **erreur réseau**
(fetch rejette) → relancer l'exception pour tomber dans le `catch` de `boot`.)

- [ ] **Step 5 : Lancer, vérifier le succès** — `node web/e2e.shell.mjs` → PASS (carte d'erreur).

- [ ] **Step 6 : Commit**
```
git add llm-lego/experiments/belote-claude/index.html
git commit -m "feat(belote): etats chargement + erreur (carte Reessayer, jamais d'ecran blanc)"
```

## PHASE D — Fin de partie, Rejouer, graine

### Task 8 : Écran Fin — graine affichée (base36, copiable) + Rejouer + Menu

**Files:**
- Modify: `index.html` (rendu `#gamePanel` promu, `#seedLine`, `#replayBtn`, `#toMenuBtn`, `replay()`)
- Test: `web/e2e.fin.mjs` (créé) + unit déjà couvert (Task 2 `resolveSeed`)

**Interfaces:**
- Consumes : `view().seed`, `seedToStr`, `settings.seedMode`, `resolveSeed`, `startGame`-like relance.
- Produces : écran Fin avec « graine : `<base36>` » copiable ; `replay()` (mêmes réglages ;
  auto → nouvelle graine, fixed → même).

- [ ] **Step 1 : e2e (Fin + Rejouer) — plein-jeu, flaky-toléré**

Créer `web/e2e.fin.mjs` (modèle : `e2e.declare.mjs`), avec `chromium.launch({args:["--disable-gpu"]})`.
Jouer jusqu'à `game_over` en bouclant `playOneDealDOM` (import de `e2e-lib`) sur une partie
**target 501, graine auto**, puis :
- **assert** l'écran Fin affiche `#seedLine` contenant `window.__belote.seed` en base36 ;
- lire la 1ʳᵉ main d'une **nouvelle** partie via « Rejouer » (auto) → distribution `D1` ;
- « Rejouer » encore (auto) → `D2` ; **assert** `D1 ≠ D2` (graines différentes).
> Note : partie DOM complète = **connue flaky** (crash renderer, cf. bloc 1). La correctness du seed
> est **doublée** par l'unit `test/seedcode.test.mjs` (Task 2). Si `e2e.fin` crashe l'environnement,
> le documenter comme limite env (pas un défaut produit) — l'unit fait foi.

- [ ] **Step 2 : Lancer, vérifier l'échec** — FAIL (Fin sans graine ni Rejouer câblé).

- [ ] **Step 3 : Rendu Fin (remplacer le bloc `#gamePanel` dans `render`)**

Dans `render(s)`, remplacer le bloc actuel `if (s.phase === "game_over") { … #gamePanel … }` par :
```js
const gp = $("gamePanel");
if (s.phase === "game_over") {
  const who = s.winner === -1 ? "Égalité !" : `Victoire équipe ${s.winner === 0 ? "A — Vous & Nord" : "B — Ouest & Est"}`;
  const seedStr = window.__seed.seedToStr(s.seed);
  gp.classList.remove("hidden");
  gp.innerHTML = `<div class="sheet">
    <div class="win">${who}</div>
    <table>
      <tr><td>Score final</td><td>A ${s.totals[0]}</td><td>B ${s.totals[1]}</td></tr>
      <tr><td>Donnes</td><td colspan="2">${s.dealsPlayed}${s.redeals ? " (+" + s.redeals + " redist.)" : ""}</td></tr>
    </table>
    <div class="seedline">graine : <code id="seedVal">${seedStr}</code>
      <button id="copySeed" class="mini">copier</button></div>
    <div class="btnrow"><button id="replayBtn">Rejouer</button>
      <button id="toMenuBtn" class="ghost">Menu</button></div></div>`;
  $("replayBtn").addEventListener("click", replay);
  $("toMenuBtn").addEventListener("click", () => showView("accueil"));
  $("copySeed").addEventListener("click", () => navigator.clipboard && navigator.clipboard.writeText(seedStr));
} else gp.classList.add("hidden");
```
CSS : `.seedline{ font-size:12px; color:var(--muted); margin:8px 0; text-align:center; } .seedline code{ color:var(--brass-hi); } .mini{ font-size:10px; padding:3px 8px; margin-left:6px; }`.
(Supprimer l'ancien `const ag = $("againBtn")…` devenu caduc.)

- [ ] **Step 4 : `replay()` (script)** — ajouter :
```js
async function replay() {
  // mêmes réglages ; graine : auto → nouvelle, fixed → la même (ratifié §3.6)
  const seed = resolveSeed(settings.seedMode, strToSeed(settings.seedStr), Math.random);
  lastSeedUsed = seed;
  hideErr(); $("gamePanel").classList.add("hidden");
  shown.clear(); trickEl.innerHTML = ""; lastWinner = null; handOrder = null; prevHandIds = [];
  const { status, data } = await api("/api/new", { seed, target: settings.target, annonces: settings.annonces });
  if (status !== 200) { showErrCard(true); return; }
  showView("game"); await apply(data);
}
```
(Le `#gamePanel` reste un overlay **au sein de** la vue `game` — l'écran Fin ne change pas
`data-view` ; « Menu » le fait via `showView('accueil')`.)

- [ ] **Step 5 : Lancer** — `node web/e2e.fin.mjs` (toléré flaky env). Vérifier au moins le rendu Fin
  + graine sur une exécution qui aboutit ; l'unit `seedcode` reste la preuve dure du auto≠/fixed=.

- [ ] **Step 6 : Commit**
```
git add llm-lego/experiments/belote-claude/index.html llm-lego/experiments/belote-claude/web/e2e.fin.mjs
git commit -m "feat(belote): ecran Fin — graine base36 copiable + Rejouer (auto=nouvelle, fixed=meme) + Menu"
```

## PHASE E — Aide & 1er lancement

### Task 9 : « Comment jouer » (statique) + astuce 1er lancement

**Files:**
- Modify: `index.html` (contenu `#helpContent`, astuce dismissible, flag localStorage)

**Interfaces:**
- Produces : fiche règles statique dans `#view-help` ; astuce unique à la 1ʳᵉ entrée en jeu
  (flag `belote.seenHint`).

- [ ] **Step 1 : e2e (help + astuce)** — ajouter à `web/e2e.shell.mjs` :
  - Accueil → `#helpBtn` → `data-view=help`, `#helpContent` non vide → `#backHome2Btn` → accueil.
  - `localStorage.clear()` puis `startGame` → l'astuce `#hint1` est visible ; la dismisser
    (`#hintOk`) → cachée ; nouvelle partie → `#hint1` **absente** (flag posé).

- [ ] **Step 2 : Lancer, vérifier l'échec** — FAIL.

- [ ] **Step 3 : Contenu Help (statique)** — remplir `#helpContent` (dans le HTML, contenu en dur) :
```html
<div class="menu help-sheet" id="helpContent">
  <h2>Comment jouer</h2>
  <p><b>But</b> — atteindre la cible (501 ou 1000) avant l'équipe adverse. Vous jouez au Sud, avec le Nord.</p>
  <p><b>Le pli</b> — chacun pose une carte ; il faut <i>fournir</i> la couleur demandée, sinon
     <i>couper</i> à l'atout (et <i>surcouper</i> si un atout est déjà tombé), sauf si votre partenaire est maître.</p>
  <p><b>Atout</b> — ordre fort : V, 9, A, 10, R, D, 8, 7. Hors atout : A, 10, R, D, V, 9, 8, 7.</p>
  <p><b>Annonces</b> — au 1er pli, si vous avez une suite (tierce/cinquante/cent) ou un carré,
     touchez « Annoncer » en jouant votre 1ʳᵉ carte. Non déclarée = perdue. Au 2ᵉ pli, la meilleure est montrée.</p>
  <p><b>Belote-rebelote</b> — Roi + Dame d'atout : dites « Belote » en jouant le premier, « Rebelote » au second. +20. Oublié = perdu.</p>
  <p><b>Décompte</b> — le preneur doit faire au moins 82 points, sinon il chute (la défense encaisse 162).
     Capot (tous les plis) = 250. Dix de der = +10 au dernier pli.</p>
  <p><b>Ranger sa main</b> — glissez une carte sur le côté pour la déplacer ; touchez-la (ou tirez vers le tapis) pour la jouer.</p>
</div>
```

- [ ] **Step 4 : Astuce 1er lancement** — markup dans `#view-game` :
```html
<div id="hint1" class="veil hidden"><div class="sheet">
  <h3>Astuce</h3>
  <p class="hint">Touche une carte éclairée pour la jouer · glisse-la sur le côté pour ranger ta main ·
     « Annoncer » au 1er pli si tu as une combinaison.</p>
  <div class="btnrow"><button id="hintOk">C'est parti</button></div></div></div>
```
Script — au 1er passage en jeu :
```js
function maybeShowHint() {
  if (localStorage.getItem("belote.seenHint")) return;
  $("hint1").classList.remove("hidden");
}
$("hintOk").addEventListener("click", () => { localStorage.setItem("belote.seenHint", "1"); $("hint1").classList.add("hidden"); });
```
Appeler `maybeShowHint()` à la fin de `startGame()` (après `showView("game")`).

- [ ] **Step 5 : Lancer, vérifier le succès** — `node web/e2e.shell.mjs` → PASS (help + astuce 1×).

- [ ] **Step 6 : Commit**
```
git add llm-lego/experiments/belote-claude/index.html
git commit -m "feat(belote): Comment jouer (statique) + astuce 1er lancement (une fois)"
```

## PHASE F — Vérification finale

### Task 10 : Annonces OFF + batterie complète + non-régression node

**Files:**
- Modify: `web/e2e.shell.mjs` (cas annonces OFF)

- [ ] **Step 1 : e2e (annonces OFF)** — ajouter à `web/e2e.shell.mjs` : `startGame(page,{seed:2,target:501,annonces:false})`
  puis jouer une donne (`playOneDealDOM`) → **assert** `sawExpose === false` et jamais de bouton
  `#annonceBtn` visible (le driver n'émet pas `annonce_expose` quand `annonces:false`).

- [ ] **Step 2 : Batterie complète**
```
node --test 2>&1 | grep -E "^ℹ (tests|pass|fail)"
node tools/real-play.mjs 2>&1 | tail -1
node web/verify-parity.mjs 2>&1 | tail -1
node web/verify-annonces.mjs 2>&1 | tail -1
node web/verify-ritual.mjs 2>&1 | tail -1
for t in shell sort reorder declare belote cards; do echo "== $t =="; node web/e2e.$t.mjs 2>&1 | tail -1; done
node web/e2e.fin.mjs 2>&1 | tail -1   # flaky-toléré (plein-jeu)
```
Attendu : node tout vert ; e2e shell/sort/reorder/declare/belote/cards PASS ; `e2e.fin` PASS ou
crash env documenté (unit seedcode fait foi).

- [ ] **Step 3 : Commit**
```
git add llm-lego/experiments/belote-claude/web/e2e.shell.mjs
git commit -m "test(belote): e2e shell — annonces OFF + verification finale bloc 2"
```

## Clôture de bloc

- [ ] **Rapport de fin de charter** :
  ```
  software_verdict: OK|FAIL|BLOCKED
  evidence_verdict: INCLUDES_UX_VALIDATION
  claim_verdict: NO_CLAIM_ALLOWED
  ```
- [ ] Mettre à jour `studio_brain/00_CURRENT_CONTEXT.md` (bloc 2 livré, points ouverts §8).
- [ ] **Pas de push** sans go Pierre.

---

## Notes de découpage & questions ouvertes reportées

- **Défauts §8 du spec appliqués** : graine base36 · confirmation ☰ Menu si partie en cours ·
  « Comment jouer » = 7 rubriques condensées · chargement = spinner minimal. Ajustables (constantes/HTML).
- **Ordre d'exécution** : Phases A→F en séquence. La Task 5 (non-régression bloc 1 via `startGame`)
  doit passer **avant** d'empiler les états (C/D/E), sinon les e2e bloc 1 restent cassés par le
  déplacement des contrôles hors du HUD.
- **Flakiness plein-jeu DOM** (héritée bloc 1) : `e2e.fin` (et tout test jouant une partie complète)
  peut crasher le renderer headless sur ce poste — **aucune erreur JS**, limite environnementale. La
  correctness des points concernés (graine auto/fixed) est **doublée en unit** (`seedcode`). Ne pas
  bloquer le bloc là-dessus ; documenter.
