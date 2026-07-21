# Belote — Bloc 1 « Règles, table & matériel » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire évoluer le prototype Belote prouvé (`llm-lego/experiments/belote-claude/`) vers le socle produit : score 1000, paquet fidèle rejouable depuis un seed, rituel d'annonces en deux temps, belote-rebelote manuelle, main réorganisable, cartes dessinées.

**Architecture :** On garde le socle logique validé (30 tests + auditeur indépendant + invariant de parité driver≡moteur) et on le fait évoluer par couches. Un nouveau module `src/shoe.mjs` (mélange initial + coupe seedée + ramassage déterministe) remplace le re-mélange interne de `deal.mjs`. Les annonces et la belote passent d'un calcul automatique à un **pool de déclarations** (IA auto, humain manuel). L'UI DOM ajoute drag&drop (ranger vs jouer désambiguïsés par la géométrie du geste), boutons de déclaration, exposition au pli 2, et un swap d'assets SVG.

**Tech Stack :** Node 24 (ESM, `node:test`, zéro dépendance côté moteur), serveur `node:http` dédié (port 4137), UI HTML/CSS/JS vanilla + Pointer Events, Playwright headless pour l'e2e DOM.

**Spec de référence :** `docs/superpowers/specs/2026-07-06-belote-bloc1-regles-table-materiel-design.md`.

## Global Constraints

- **Périmètre lane JEUX** : ne travailler QUE dans `llm-lego/experiments/belote-claude/`. Ne PAS toucher `src/` (Rust), `autopilot.py`, `ml/`, ni le reste du builder llm-lego.
- **Zone protégée = tests oracle repo-root** (`.claude/rules/tests.md`, `tests/`/`eval/`/`oracle/` Rust/ML). Le dossier **`llm-lego/experiments/belote-claude/test/`** (singulier) est le jeu de tests **propre** de ce prototype, en lane JEUX — il se modifie normalement en TDD. Ne pas confondre.
- **Déterminisme** : un seul RNG par partie ; le ramassage n'utilise **aucun** hasard ; la coupe est seedée, bornée `[COUPE_MIN, 32−COUPE_MIN]`, jamais fixe, jamais 0. `COUPE_MIN = 3`.
- **Séparation modèle / vue** : tri d'affichage, réorganisation et exposition sont **purement visuels** — ils ne touchent ni `hands`, ni `legalMoves`, ni la détection d'annonces, ni le scoring.
- **Non-régression** : à la fin de chaque phase moteur, `node --test`, `node tools/real-play.mjs` (0 violation) et `node web/verify-parity.mjs` doivent être **verts**.
- **Chemins repo-relatifs**, `encoding utf-8` explicite, aucun fichier tmp résiduel.
- **Git** : commit à chaque task (lane JEUX). **Jamais de push** sans go explicite Pierre.
- **Score** : défaut **1000**, cible paramétrable **501 / 1000**.
- **Assets** : swap uniquement, licences libres notées (source + licence), **aucune génération IA** d'illustration.
- Convention de nommage FR homogène du prototype : `pique/coeur/carreau/trefle`, rangs `7 8 9 10 V D R A`, équipes `teamOf(p)=p%2` (0&2 vs 1&3), humain = siège 0.

---

## Vue d'ensemble des fichiers

| Fichier | Action | Responsabilité après bloc |
|---|---|---|
| `src/shoe.mjs` | **créer** | mélange initial seedé, coupe bornée, ramassage déterministe |
| `src/deal.mjs` | modifier | `deal(dealer, deck)` = découpe **pure** (plus de mélange interne) ; garde `makeRng`/`shuffle`/`eldestOrder` |
| `src/rules.mjs` | modifier | + `beloteHolder()` (joueur détenteur R+D atout) |
| `src/scoring.mjs` | modifier | belote +20 **conditionnée** à la déclaration |
| `src/annonces.mjs` | modifier | `resolveAnnonces` consomme un **masque de déclaration** |
| `src/game.mjs` | modifier | défaut 1000 ; cycle de vie du paquet (cut/pickup) dans `playGame`/`playDeal` |
| `src/sort.mjs` | **créer** | `sortHandForDisplay(hand, atout, pref)` pur |
| `web/driver.mjs` | modifier | paquet ; états annonces (declare/expose) ; belote/rebelote manuelles ; défaut 1000 |
| `web/server.mjs` | modifier | routes `POST /api/annonce`, `POST /api/belote` |
| `index.html` | modifier | drag&drop ranger/jouer ; bouton Annoncer ; overlay exposition ; boutons Belote/Rebelote ; sélecteur cible ; tri + préférence ; cartes SVG |
| `assets/cards.svg` (+ dos/tapis) | **créer** (swap) | spritesheet 32 cartes libre, validée à 50-70 px |
| `test/shoe.test.mjs` | **créer** | unités paquet |
| `test/sort.test.mjs` | **créer** | unités tri d'affichage |
| `test/deal.test.mjs` | modifier | nouvelle signature `deal(dealer, deck)` |
| `test/scoring.test.mjs` | modifier | belote conditionnelle |
| `web/verify-annonces.mjs` | modifier | pool de déclaration (annonce perdue) |
| `web/verify-parity.mjs` | (re-lancer) | prouver parité sous nouveau paquet |
| `web/e2e.declare.mjs` | **créer** | e2e DOM déclaration + exposition |
| `web/e2e.belote.mjs` | **créer** | e2e DOM belote/rebelote oubliée = perdue |
| `web/e2e.reorder.mjs` | **créer** | e2e DOM ranger ≠ jouer |

---

## PHASE 0 — Score par défaut 1000 (isolé, warm-up)

### Task 1 : Défaut de partie 1000 + sélecteur 501/1000

**Files:**
- Modify: `src/game.mjs` (signature `playGame`, ligne ~74)
- Modify: `web/driver.mjs` (constructeur `BeloteDriver`, ligne ~33)
- Modify: `index.html` (HUD `/api/new`, `newGame()` ligne ~544-551 ; markup HUD ligne ~229-232)
- Test: `test/game.test.mjs` (ajout d'un cas)

**Interfaces:**
- Produces: `playGame({ target = 1000 })`, `new BeloteDriver({ target = 1000 })`.

- [ ] **Step 1 : Test — défaut 1000**

Dans `test/game.test.mjs`, ajouter :

```js
test("playGame — cible par défaut = 1000", () => {
  const g = playGame({ seed: 3 });      // pas de target passé
  assert.ok(Math.max(...g.totals) >= 1000 || g.dealsPlayed >= 1);
  // borne haute : une partie à 1000 joue plus de donnes qu'à 501
  const short = playGame({ seed: 3, target: 501 });
  assert.ok(g.dealsPlayed >= short.dealsPlayed);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/game.test.mjs` → FAIL (défaut encore 501).

- [ ] **Step 3 : Passer les défauts à 1000**

`src/game.mjs` :
```js
export function playGame({ target = 1000, seed = 1, startDealer = 0, maxDeals = 200 } = {}) {
```
`web/driver.mjs` :
```js
constructor({ seed = 1, target = 1000, startDealer = 0, maxDeals = 200, annonces = true } = {}) {
```

- [ ] **Step 4 : Sélecteur UI 501/1000 (défaut 1000)**

Dans `index.html`, remplacer le bloc `hud-actions` (ligne ~229) :
```html
<div class="hud-actions">
  <label>seed<input id="seed" type="number" value="3" /></label>
  <label>cible<select id="target"><option value="1000" selected>1000</option><option value="501">501</option></select></label>
  <button id="newBtn">Jouer</button>
</div>
```
Dans `newGame()` (ligne ~550), lire la cible :
```js
const seed = Number($("seed").value) || 1;
const target = Number($("target").value) || 1000;
...
const { data } = await api("/api/new", { seed, target });
```
(`web/server.mjs` accepte déjà `target` via `/api/new` — rien à changer côté serveur.)

- [ ] **Step 5 : Lancer les tests + commit**

```
node --test
node tools/real-play.mjs
```
Attendu : verts, 0 violation.
```
git add src/game.mjs web/driver.mjs index.html test/game.test.mjs
git commit -m "feat(belote): cible de partie 1000 par défaut + sélecteur 501/1000"
```

---

## PHASE 1 — Paquet fidèle : sabot, coupe, ramassage (refonte moteur)

> Décision d'archi structurante. On sort le mélange de `deal.mjs`, on introduit `src/shoe.mjs`, et on tient un `deckCourant` au fil des donnes. Fin de phase : parité driver≡moteur re-prouvée.

### Task 2 : `src/shoe.mjs` — mélange initial + coupe seedée bornée

**Files:**
- Create: `src/shoe.mjs`
- Test: `test/shoe.test.mjs`

**Interfaces:**
- Consumes: `fullDeck()` (`cards.mjs`), `makeRng`, `shuffle` (`deal.mjs`).
- Produces:
  - `COUPE_MIN = 3`
  - `newShoe(seed) → { deck: Card[32], rng: () => number }`
  - `cut(deck, rng) → Card[]` (rotation à une position `c ∈ [COUPE_MIN, len−COUPE_MIN]`)

- [ ] **Step 1 : Test**

`test/shoe.test.mjs` :
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { newShoe, cut, COUPE_MIN } from "../src/shoe.mjs";

test("newShoe — 32 cartes, déterministe par seed", () => {
  const a = newShoe(3).deck, b = newShoe(3).deck, c = newShoe(4).deck;
  assert.equal(a.length, 32);
  assert.deepEqual(a.map(x => x.id), b.map(x => x.id));            // même seed → même paquet
  assert.notDeepEqual(a.map(x => x.id), c.map(x => x.id));         // seed différent → paquet différent
});

test("cut — rotation, bornée, jamais fixe, jamais 0/len", () => {
  const { deck, rng } = newShoe(3);
  const positions = new Set();
  let d = deck;
  for (let i = 0; i < 40; i++) {
    const before = d.map(x => x.id).join(",");
    d = cut(d, rng);
    // même multiset de cartes (rotation, pas de perte)
    assert.equal(d.length, 32);
    assert.deepEqual([...d].map(x => x.id).sort(), [...deck].map(x => x.id).sort());
    // position de coupe reconstruite : index de la 1re carte d'origine
    const c = d.map(x => x.id).indexOf(deck[0].id);
    assert.ok(c >= 0);
    positions.add(before === d.map(x => x.id).join(",") ? "fixe" : c);
  }
  assert.ok(!positions.has("fixe"), "la coupe ne doit jamais être l'identité");
  assert.ok(positions.size > 3, "les positions de coupe doivent varier");
});

test("cut — position toujours dans la plage [COUPE_MIN, 32-COUPE_MIN]", () => {
  const { rng } = newShoe(7);
  // paquet-témoin ordonné pour lire la position exacte
  const ordered = Array.from({ length: 32 }, (_, i) => ({ id: String(i) }));
  for (let i = 0; i < 200; i++) {
    const d = cut(ordered, rng);
    const c = d.findIndex(x => x.id === "0");
    assert.ok(c >= COUPE_MIN && c <= 32 - COUPE_MIN, `coupe ${c} hors plage`);
  }
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/shoe.test.mjs` → FAIL (module absent).

- [ ] **Step 3 : Implémentation**

`src/shoe.mjs` :
```js
// Belote — le "sabot" : mélange initial (seedé) et coupe réelle entre les donnes.
// Fidélité belote : on ne re-mélange JAMAIS entre les donnes ; on ramasse (pickup.js
// via game/driver) puis on COUPE. Le mélange initial et les coupes sont les SEULS points
// où le RNG de partie est consommé — d'où la rejouabilité depuis le seed.
import { fullDeck } from "./cards.mjs";
import { makeRng, shuffle } from "./deal.mjs";

export const COUPE_MIN = 3; // coupe jamais triviale : position dans [3, 29]

/** Paquet initial d'une partie : un seul mélange, piloté par le seed. */
export function newShoe(seed) {
  const rng = makeRng(seed);
  return { deck: shuffle(fullDeck(), rng), rng };
}

/** Coupe réelle : rotation à une position tirée du flux RNG, bornée, jamais fixe. */
export function cut(deck, rng) {
  const lo = COUPE_MIN, hi = deck.length - COUPE_MIN;
  const c = lo + Math.floor(rng() * (hi - lo + 1)); // c ∈ [lo, hi]
  return deck.slice(c).concat(deck.slice(0, c));
}
```

- [ ] **Step 4 : Lancer, vérifier le succès** — `node --test test/shoe.test.mjs` → PASS.

- [ ] **Step 5 : Commit**
```
git add src/shoe.mjs test/shoe.test.mjs
git commit -m "feat(belote): src/shoe.mjs — mélange initial seedé + coupe réelle bornée"
```

### Task 3 : Ramassage déterministe (`pickup`)

**Files:**
- Modify: `src/shoe.mjs` (ajout de `pickup`)
- Test: `test/shoe.test.mjs` (ajout)

**Interfaces:**
- Produces: `pickup(tricks, takerTeam) → Card[]`
  - `tricks` = `[{ winner, cards: Card[4] }, ...]` chronologiques (comme `playTrick`/driver)
  - `takerTeam` = `taker % 2`
  - Retourne le paquet reconstitué : pile du **camp preneur** puis pile du **camp défense**, chaque pli en ordre de jeu, plis chronologiques. **Aucun hasard.**

- [ ] **Step 1 : Test**

Ajouter dans `test/shoe.test.mjs` :
```js
import { pickup } from "../src/shoe.mjs";

test("pickup — déterministe, sans perte, camp preneur d'abord", () => {
  const C = (id) => ({ id });
  const tricks = [
    { winner: 0, cards: [C("a"), C("b"), C("c"), C("d")] }, // gagné par team0
    { winner: 1, cards: [C("e"), C("f"), C("g"), C("h")] }, // gagné par team1
    { winner: 2, cards: [C("i"), C("j"), C("k"), C("l")] }, // team0
  ];
  const takerTeam = 0;
  const deck = pickup(tricks, takerTeam);
  // pile preneur (team0 : plis 1 et 3) puis pile défense (team1 : pli 2)
  assert.deepEqual(deck.map(x => x.id), ["a","b","c","d","i","j","k","l","e","f","g","h"]);
  // pur : deux appels identiques ⇒ résultat identique
  assert.deepEqual(pickup(tricks, takerTeam).map(x => x.id), deck.map(x => x.id));
  // pas de perte
  assert.equal(deck.length, 12);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/shoe.test.mjs` → FAIL (`pickup` absent).

- [ ] **Step 3 : Implémentation** — ajouter à `src/shoe.mjs` :
```js
/**
 * Ramassage fidèle et déterministe des plis d'une donne terminée.
 * Empile les plis dans l'ordre où ils sont gagnés, par camp ; recompose le paquet
 * "camp preneur puis camp défense". Aucun RNG — la donne N+1 est fonction pure de la donne N.
 */
export function pickup(tricks, takerTeam) {
  const piles = [[], []]; // [team0, team1]
  for (const t of tricks) {
    const team = t.winner % 2;
    for (const c of t.cards) piles[team].push(c);
  }
  const defTeam = 1 - takerTeam;
  return piles[takerTeam].concat(piles[defTeam]);
}
```

- [ ] **Step 4 : Lancer, vérifier le succès** — `node --test test/shoe.test.mjs` → PASS.

- [ ] **Step 5 : Commit**
```
git add src/shoe.mjs test/shoe.test.mjs
git commit -m "feat(belote): pickup — ramassage déterministe des plis (camp preneur d'abord)"
```

### Task 4 : `deal.mjs` — découpe pure d'un paquet fourni

**Files:**
- Modify: `src/deal.mjs` (fonction `deal`, lignes ~38-49)
- Test: `test/deal.test.mjs` (adapter à la nouvelle signature)

**Interfaces:**
- Produces: `deal(dealer, deck) → { hands, turnUp, talon }` — **ne mélange plus** ; consomme `deck` (32 cartes déjà mélangées/coupées). `makeRng`, `shuffle`, `eldestOrder`, `completeDeal` **inchangés** (toujours exportés — `shoe.mjs` en dépend).

- [ ] **Step 1 : Adapter le test**

Dans `test/deal.test.mjs`, tout appel `deal(dealer, rng)` devient `deal(dealer, deck)`. Exemple de cas à garantir (remplacer les cas existants équivalents) :
```js
import { deal, completeDeal, eldestOrder, makeRng, shuffle } from "../src/deal.mjs";
import { fullDeck } from "../src/cards.mjs";

test("deal — découpe pure : 5 cartes/joueur, retournée définie, talon 11", () => {
  const deck = shuffle(fullDeck(), makeRng(3)); // paquet fourni de l'extérieur
  const { hands, turnUp, talon } = deal(0, deck);
  assert.equal(hands.length, 4);
  hands.forEach(h => assert.equal(h.length, 5));
  assert.ok(turnUp && turnUp.id);
  assert.equal(talon.length, 11);
  // 5*4 + 1 + 11 = 32, aucune carte perdue ni dupliquée
  const all = [...hands.flat(), turnUp, ...talon].map(c => c.id).sort();
  assert.deepEqual(all, deck.map(c => c.id).sort());
});

test("deal — déterministe : même paquet ⇒ mêmes mains", () => {
  const deck = shuffle(fullDeck(), makeRng(9));
  const a = deal(1, deck), b = deal(1, deck);
  assert.deepEqual(a.hands.flat().map(c => c.id), b.hands.flat().map(c => c.id));
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/deal.test.mjs` → FAIL (`deal` mélange encore / signature).

- [ ] **Step 3 : Implémentation** — remplacer `deal` dans `src/deal.mjs` :
```js
/**
 * Temps 1 — deal initial à partir d'un paquet DÉJÀ mélangé/coupé (fourni par le sabot).
 * NE mélange PLUS (fidélité belote : le mélange est unique en début de partie, cf. shoe.mjs).
 * 3 puis 2 cartes à chacun (5), puis 1 carte retournée. Retourne { hands, turnUp, talon(11) }.
 */
export function deal(dealer, deck) {
  const hands = [[], [], [], []];
  const order = eldestOrder(dealer);
  let k = 0;
  for (const size of [3, 2]) {
    for (const p of order) for (let n = 0; n < size; n++) hands[p].push(deck[k++]);
  }
  const turnUp = deck[k++];
  const talon = deck.slice(k); // 11 cartes restantes
  return { hands, turnUp, talon };
}
```
(`shuffle`, `makeRng`, `eldestOrder`, `completeDeal` restent tels quels.)

- [ ] **Step 4 : Lancer, vérifier le succès** — `node --test test/deal.test.mjs` → PASS.

- [ ] **Step 5 : Commit** (les tests moteur qui appellent encore `playDeal(dealer, rng)` casseront à la Task 5 — c'est attendu, on les corrige là)
```
git add src/deal.mjs test/deal.test.mjs
git commit -m "refactor(belote): deal() = découpe pure d'un paquet fourni (mélange sorti vers shoe)"
```

### Task 5 : Cycle de vie du paquet dans `game.mjs`

**Files:**
- Modify: `src/game.mjs` (`playDeal` ~50-68, `playGame` ~74-90)
- Test: `test/game.test.mjs` (adapter), `tools/real-play.mjs` (re-lancer)

**Interfaces:**
- Consumes: `newShoe`, `cut`, `pickup` (`shoe.mjs`), `deal(dealer, deck)`.
- Produces: `playDeal(dealer, deck) → { redeal } | { redeal:false, dealer, taker, atout, round, beloteTeam, tricks, score }`. `playGame` maintient `deckCourant` : mélange initial → **coupe avant chaque donne** → distribution → (si prise) **pickup après**.

- [ ] **Step 1 : Test — rejouabilité donne 1 identique depuis le seed**

Ajouter dans `test/game.test.mjs` :
```js
import { newShoe, cut } from "../src/shoe.mjs";
import { deal } from "../src/deal.mjs";

test("rejouabilité — même seed ⇒ donne 1 (mains distribuées) identique", () => {
  // reconstitue la 1re donne comme le fait playGame : shoe → 1re coupe → deal
  const mk = () => { const { deck, rng } = newShoe(42); return deal(0, cut(deck, rng)); };
  const a = mk(), b = mk();
  assert.deepEqual(a.hands.flat().map(c => c.id), b.hands.flat().map(c => c.id));
  assert.equal(a.turnUp.id, b.turnUp.id);
});

test("playGame — partie complète va au bout, cartes cohérentes (invariant 162 par donne)", () => {
  const g = playGame({ seed: 3, target: 501 });
  assert.ok(g.dealsPlayed >= 1);
  for (const d of g.deals) {
    // base = points cartes + dix de der = 162 par donne (hors belote/annonces)
    assert.equal(d.score.base[0] + d.score.base[1], 162);
  }
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/game.test.mjs` → FAIL (`playDeal`/`playGame` utilisent encore `rng`).

- [ ] **Step 3 : Implémentation**

`src/game.mjs` — remplacer les imports et les deux fonctions :
```js
import { deal, completeDeal, eldestOrder } from "./deal.mjs";
import { newShoe, cut, pickup } from "./shoe.mjs";
// ... (runBidding, legalMoves, trickWinner, beloteTeam, scoreDeal, cardPoints : inchangés)

/**
 * Joue une donne à partir d'un paquet DÉJÀ coupé. Retourne { redeal:true } si personne ne
 * prend (le paquet n'est pas consommé — l'appelant re-coupe), sinon le décompte + les plis.
 */
export function playDeal(dealer, deck) {
  const { hands, turnUp, talon } = deal(dealer, deck);
  const bid = runBidding(hands, turnUp, dealer);
  if (!bid) return { redeal: true };

  const fullHands = completeDeal(hands, bid.taker, turnUp, talon, dealer);
  const play = fullHands.map((h) => h.slice());
  const bTeam = beloteTeam(fullHands, bid.atout);

  const tricks = [];
  let leader = eldestOrder(dealer)[0];
  for (let t = 0; t < 8; t++) {
    const res = playTrick(play, leader, bid.atout);
    tricks.push(res);
    leader = res.winner;
  }
  const score = scoreDeal(tricks, bid.atout, bid.taker, bTeam); // belote auto (IA) : défaut true
  return { redeal: false, dealer, taker: bid.taker, atout: bid.atout, round: bid.round, beloteTeam: bTeam, tricks, score };
}

export function playGame({ target = 1000, seed = 1, startDealer = 0, maxDeals = 200 } = {}) {
  const { deck: initial, rng } = newShoe(seed);
  let deckCourant = initial;
  const totals = [0, 0];
  const deals = [];
  let dealer = startDealer;
  let redeals = 0;
  while (Math.max(...totals) < target && deals.length + redeals < maxDeals) {
    deckCourant = cut(deckCourant, rng);          // coupe réelle avant CHAQUE donne
    const d = playDeal(dealer, deckCourant);
    dealer = (dealer + 1) % 4;
    if (d.redeal) { redeals += 1; continue; }     // paquet non consommé → re-coupe au tour suivant
    deckCourant = pickup(d.tricks, d.taker % 2);  // ramassage déterministe
    totals[0] += d.score.scores[0];
    totals[1] += d.score.scores[1];
    deals.push({ ...d, totalsAfter: totals.slice() });
  }
  const winner = totals[0] === totals[1] ? -1 : totals[0] > totals[1] ? 0 : 1;
  return { totals, winner, deals, redeals, dealsPlayed: deals.length };
}
```
(`playTrick` et `chooseMove` restent inchangés.)

- [ ] **Step 4 : Lancer les tests + auditeur indépendant**
```
node --test
node tools/real-play.mjs
```
Attendu : tous verts ; `real-play.mjs` → « ✅ VRAI TEST DE JEU — TOUT COHÉRENT », **0 violation** de légalité. *(Note : `real-play.mjs` utilise `Math.random` pour ses mains ; si son propre appel à `deal`/`playGame` casse à cause de la nouvelle signature, l'adapter pour partir d'un `newShoe(seedAléatoire)` puis `playGame({ seed })` — ne PAS réintroduire de re-mélange par donne.)*

- [ ] **Step 5 : Commit**
```
git add src/game.mjs test/game.test.mjs tools/real-play.mjs
git commit -m "feat(belote): paquet fidèle dans playGame — coupe seedée avant donne, ramassage après"
```

### Task 6 : Cycle de vie du paquet dans le driver + re-preuve de parité

**Files:**
- Modify: `web/driver.mjs` (imports ~13-19 ; constructeur ~40-45 ; `_beginBidding` ~81-85 ; `_finishDeal` ~154-179)
- Test: `web/verify-parity.mjs` (re-lancer)

**Interfaces:**
- Consumes: `newShoe`, `cut`, `pickup`.
- Produces: driver qui tient `this.deckCourant`, coupe avant chaque enchère, ramasse après chaque donne — **même consommation RNG que `playGame`** (invariant de parité).

- [ ] **Step 1 : Vérifier l'invariant AVANT (référence)** — `node web/verify-parity.mjs` doit encore passer sur l'ancien mécanisme, puis on le cassera puis re-verdira.

- [ ] **Step 2 : Implémentation**

`web/driver.mjs` :
- Import (ajouter) :
```js
import { newShoe, cut, pickup } from "../src/shoe.mjs";
```
- Constructeur — remplacer la ligne `this.rng = makeRng(seed);` par :
```js
const shoe = newShoe(seed);
this.rng = shoe.rng;          // un seul RNG de partie (mélange initial déjà consommé)
this.deckCourant = shoe.deck; // paquet vivant, jamais re-mélangé
```
(retirer l'import `makeRng` s'il n'est plus utilisé ailleurs dans le fichier).
- `_beginBidding` — remplacer par :
```js
_beginBidding() {
  this.deckCourant = cut(this.deckCourant, this.rng);       // coupe réelle avant la donne
  const { hands, turnUp, talon } = deal(this.dealer, this.deckCourant);
  this.bidding = { round: 1, order: eldestOrder(this.dealer), index: 0, hands, turnUp, talon };
  this.message = `Carte retournée : ${turnUp.rank}${turnUp.suit}. Tour 1 — prendre ou passer ?`;
}
```
- Chemin « personne ne prend » (dans `advance`, ~221-226) : le paquet n'est **pas** consommé — ne rien ramasser, la prochaine `_beginBidding` re-coupe. (Aucun changement de code nécessaire ; juste ne pas appeler `pickup`.)
- `_finishDeal` — après avoir constitué `summary` et **avant** `this.atout = null;`, ajouter le ramassage :
```js
this.deckCourant = pickup(this.tricks, this.taker % 2); // ramassage déterministe (parité vs playGame)
```

- [ ] **Step 3 : Re-prouver la parité**
```
node web/verify-parity.mjs
```
Attendu : PASS — une partie pilotée par le driver (l'humain joue exactement `chooseMove`) est **identique** à `playGame(seed)`. *(Si le script fige `annonces:true`, le lancer aussi avec `annonces:false` selon sa convention actuelle — la parité porte sur les mains/plis/scores de base.)*

- [ ] **Step 4 : Non-régression complète**
```
node --test && node tools/real-play.mjs
```
Attendu : verts, 0 violation.

- [ ] **Step 5 : Commit**
```
git add web/driver.mjs
git commit -m "feat(belote): driver — même cycle de paquet que le moteur, parité re-prouvée"
```

---

## PHASE 2 — Tri d'affichage + préférence (pur, sans effet logique)

### Task 7 : `src/sort.mjs` — `sortHandForDisplay` pur

**Files:**
- Create: `src/sort.mjs`
- Test: `test/sort.test.mjs`

**Interfaces:**
- Consumes: `SUITS`, `cardStrength` (`cards.mjs`).
- Produces: `sortHandForDisplay(hand, atout, pref) → Card[]` — **nouveau tableau** (ne mute pas), `pref ∈ { "couleur", "force", "atouts-d-abord" }`. Purement présentation : n'affecte ni `legalMoves`, ni la détection d'annonces.

- [ ] **Step 1 : Test**

`test/sort.test.mjs` :
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { sortHandForDisplay } from "../src/sort.mjs";
import { card } from "../src/cards.mjs";

const H = [card("7","pique"), card("A","coeur"), card("V","trefle"), card("R","pique"), card("9","trefle")];

test("couleur — regroupe par couleur, atout à part, force décroissante", () => {
  const out = sortHandForDisplay(H, "trefle", "couleur");
  assert.equal(out.length, H.length);
  // ne mute pas l'entrée
  assert.deepEqual(H.map(c => c.id), [card("7","pique"),card("A","coeur"),card("V","trefle"),card("R","pique"),card("9","trefle")].map(c => c.id));
  // cartes d'une même couleur adjacentes
  const suitsInOrder = out.map(c => c.suit);
  for (const s of new Set(suitsInOrder)) {
    const idx = suitsInOrder.map((x, i) => x === s ? i : -1).filter(i => i >= 0);
    assert.deepEqual(idx, idx.slice().sort((a,b)=>a-b).filter((v,i)=>i===0? true : v===idx[i-1]+1) , `couleur ${s} non contiguë`);
  }
});

test("atouts-d-abord — l'atout ouvre la main", () => {
  const out = sortHandForDisplay(H, "trefle", "atouts-d-abord");
  assert.equal(out[0].suit, "trefle");
});

test("pureté — le tri ne dépend que du contenu, pas de l'ordre d'entrée", () => {
  const a = sortHandForDisplay(H, "trefle", "couleur");
  const shuffled = [H[3], H[1], H[4], H[0], H[2]];
  const b = sortHandForDisplay(shuffled, "trefle", "couleur");
  assert.deepEqual(a.map(c => c.id), b.map(c => c.id));
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/sort.test.mjs` → FAIL.

- [ ] **Step 3 : Implémentation**

`src/sort.mjs` :
```js
// Belote — tri d'AFFICHAGE de la main (présentation initiale + préférence joueur).
// PUREMENT visuel : ne mute pas la main, n'affecte ni legalMoves ni la détection d'annonces.
// Le jeu ne re-trie JAMAIS après que le joueur a réorganisé (cf. index.html).
import { SUITS, cardStrength } from "./cards.mjs";

// alternance de couleurs lisible : noir / rouge / noir / rouge
const SUIT_ORDER = ["pique", "coeur", "trefle", "carreau"];

/** pref ∈ "couleur" | "force" | "atouts-d-abord". Retourne un NOUVEAU tableau. */
export function sortHandForDisplay(hand, atout, pref = "couleur") {
  const h = hand.slice();
  const strDesc = (a, b) => cardStrength(b, atout) - cardStrength(a, atout);

  if (pref === "force") {
    // force pure décroissante, atout inclus dans le flux (atout d'abord à force égale)
    return h.sort((a, b) => {
      const t = (a.suit === atout ? 1 : 0) - (b.suit === atout ? 1 : 0);
      return t !== 0 ? -t : strDesc(a, b);
    });
  }

  const suitRank = (s) => {
    if (pref === "atouts-d-abord" && s === atout) return -1; // atout en tête
    return SUIT_ORDER.indexOf(s);
  };
  return h.sort((a, b) => {
    const s = suitRank(a.suit) - suitRank(b.suit);
    return s !== 0 ? s : strDesc(a, b); // même couleur → force décroissante
  });
}
```

- [ ] **Step 4 : Lancer, vérifier le succès** — `node --test test/sort.test.mjs` → PASS.

- [ ] **Step 5 : Commit**
```
git add src/sort.mjs test/sort.test.mjs
git commit -m "feat(belote): sortHandForDisplay — tri d'affichage pur (couleur/force/atouts)"
```

### Task 8 : UI — tri initial + préférence mémorisée

**Files:**
- Modify: `web/server.mjs` (servir `src/sort.mjs` en statique, ou l'inliner — cf. étape) 
- Modify: `index.html` (import du tri, application au render de la main, sélecteur de préférence + `localStorage`)

**Interfaces:**
- Consumes: `sortHandForDisplay` (côté navigateur).
- Produces: main affichée triée à la donne ; préférence `belote.sortPref` en `localStorage` ; l'ordre du joueur (posé en Task 13) prime dès qu'il réorganise.

> Note d'intégration : `index.html` est aujourd'hui du JS inline sans module. Pour utiliser `sortHandForDisplay` côté client sans build, **exposer `src/sort.mjs` comme module ES servi statiquement** et l'importer via `<script type="module">`, OU recopier la fonction pure dans le script inline. **Défaut recommandé** : servir le fichier (source unique de vérité). Ajouter dans `web/server.mjs`, dans la section statique :
```js
if (req.method === "GET" && path === "/src/sort.mjs") {
  return serveFile(res, "src/sort.mjs", "text/javascript; charset=utf-8");
}
if (req.method === "GET" && path === "/src/cards.mjs") {
  return serveFile(res, "src/cards.mjs", "text/javascript; charset=utf-8");
}
```
(`ROOT` pointe déjà sur `experiments/belote-claude/`, donc `src/...` est résolu.)

- [ ] **Step 1 : Écrire l'e2e (préférence appliquée)**

Créer `web/e2e.sort.mjs` (Playwright headless, calqué sur `web/e2e.play.mjs`) qui :
1. démarre le serveur, ouvre la page, clique « Jouer », attend une donne active (`window.__belote.phase` ∈ jeu) ;
2. lit l'ordre DOM des `.handcard[data-card-id]` ;
3. vérifie que pour la préférence par défaut `couleur`, les cartes d'une même couleur sont contiguës dans le DOM ;
4. change le `<select id="sortPref">` sur `atouts-d-abord`, vérifie que la 1re carte affichée est de la couleur d'atout (`window.__belote.atout`).

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node web/e2e.sort.mjs` → FAIL (pas de tri/sélecteur).

- [ ] **Step 3 : Implémentation UI**

Dans `index.html` :
- Passer le script principal en module (ou ajouter un petit module d'import en tête) :
```html
<script type="module">
  import { sortHandForDisplay } from "/src/sort.mjs";
  window.__sortHand = sortHandForDisplay; // pont vers le script inline existant
</script>
```
- Ajouter le sélecteur de préférence dans le `hud-actions` :
```html
<label>tri<select id="sortPref">
  <option value="couleur">couleur</option>
  <option value="force">force</option>
  <option value="atouts-d-abord">atouts</option>
</select></label>
```
- État de préférence + persistance (au début du script inline) :
```js
let sortPref = localStorage.getItem("belote.sortPref") || "couleur";
let handOrder = null; // ordre courant choisi par le joueur (ids) — null = utiliser le tri d'affichage
$("sortPref").value = sortPref;
$("sortPref").addEventListener("change", () => {
  sortPref = $("sortPref").value;
  localStorage.setItem("belote.sortPref", sortPref);
  handOrder = null;          // re-trier l'affichage sur la nouvelle préférence
  render(window.__belote);
});
```
- Dans `render(s)`, avant de construire le HTML de la main, appliquer le tri **seulement si le joueur n'a pas d'ordre courant** (l'ordre joueur, posé en Task 13, prime — le jeu ne re-trie jamais) :
```js
let hand = s.hand || [];
if (handOrder) {
  const byId = new Map(hand.map(c => [c.id, c]));
  hand = handOrder.map(id => byId.get(id)).filter(Boolean)
    .concat(hand.filter(c => !handOrder.includes(c.id))); // cartes nouvelles en fin
} else if (window.__sortHand && s.atout) {
  hand = window.__sortHand(hand, s.atout, sortPref);
}
```
- À chaque **nouvelle donne** (changement de `dealsPlayed`/nouvelle main de 8), réinitialiser `handOrder = null` pour re-trier une fois. (Détecter par un compteur de cartes qui repasse à 8, ou par `s.dealsPlayed`.)

- [ ] **Step 4 : Lancer, vérifier le succès** — `node web/e2e.sort.mjs` → PASS (capture jointe).

- [ ] **Step 5 : Commit**
```
git add index.html web/server.mjs web/e2e.sort.mjs
git commit -m "feat(belote): tri d'affichage de la main + préférence mémorisée (couleur/force/atouts)"
```

---

## PHASE 3 — Annonces (pool de déclaration) + belote conditionnelle (logique + driver + API)

### Task 9 : `resolveAnnonces` consomme un masque de déclaration

**Files:**
- Modify: `src/annonces.mjs` (`resolveAnnonces` ~100-127)
- Test: `web/verify-annonces.mjs` (ajout de cas « annonce non déclarée = perdue »)

**Interfaces:**
- Produces: `resolveAnnonces(fullHands, atout, dealer, declared = [true,true,true,true])` — les joueurs dont `declared[p]===false` **n'entrent pas** dans le pool (annonces perdues). Forme de retour inchangée (`{ byPlayer, winnerTeam, bonus, best, annule }`).

- [ ] **Step 1 : Test (dans `web/verify-annonces.mjs`)**

Ajouter une section :
```js
console.log("=== Déclaration (pool) ===");
// p0 (éq A) tierce au Roi pique (déclarée) ; p1 (éq B) carré de valets (NON déclaré) → A gagne
const hd = [
  [C("R","pique"), C("D","pique"), C("V","pique"), C("7","coeur"), C("8","trefle"), C("9","coeur"), C("A","trefle"), C("10","carreau")],
  [C("V","coeur"), C("V","carreau"), C("V","trefle"), C("V","pique"), C("7","trefle"), C("8","coeur"), C("9","pique"), C("A","pique")],
  [C("A","coeur"), C("R","coeur"), C("10","trefle"), C("D","trefle"), C("7","pique"), C("8","pique"), C("9","trefle"), C("R","trefle")],
  [C("10","pique"), C("8","carreau"), C("9","carreau"), C("A","carreau"), C("R","carreau"), C("D","carreau"), C("7","carreau"), C("10","coeur")],
];
// p1 aurait le carré de valets (200) = meilleure ; mais NON déclaré (declared[1]=false)
const rNoDecl = resolveAnnonces(hd, "coeur", 0, [true, false, true, true]);
check("carré non déclaré (p1) ne marque pas → équipe A gagne l'annonce", rNoDecl.winnerTeam === 0);
check("bonus A = tierce 20, B = 0", rNoDecl.bonus[0] === 20 && rNoDecl.bonus[1] === 0);
// si p1 déclare, il gagne
const rDecl = resolveAnnonces(hd, "coeur", 0, [true, true, true, true]);
check("carré déclaré (p1) l'emporte (200)", rDecl.winnerTeam === 1 && rDecl.bonus[1] === 200);

console.log("=== Détection indépendante de l'ordre de la main (spec §6) ===");
const mainA = [C("R","pique"), C("D","pique"), C("V","pique"), C("A","trefle"), C("7","coeur"), C("8","coeur"), C("9","trefle"), C("10","carreau")];
const perm  = [mainA[4], mainA[0], mainA[7], mainA[2], mainA[6], mainA[1], mainA[5], mainA[3]]; // même contenu, autre ordre
const dA = detectAnnonces(mainA, "coeur").map(annonceLabel).sort();
const dP = detectAnnonces(perm,  "coeur").map(annonceLabel).sort();
check("detectAnnonces identique quelle que soit la permutation de la main", JSON.stringify(dA) === JSON.stringify(dP));
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node web/verify-annonces.mjs` → FAIL (4e argument ignoré).

- [ ] **Step 3 : Implémentation** — modifier la signature et la détection dans `src/annonces.mjs` :
```js
export function resolveAnnonces(fullHands, atout, dealer, declared = [true, true, true, true]) {
  const order = eldestOrder(dealer);
  const byPlayer = [0, 1, 2, 3].map((p) => (declared[p] ? detectAnnonces(fullHands[p], atout) : []));
  // ... (reste du corps inchangé : recherche de best, annulation, bonus)
```

- [ ] **Step 4 : Lancer, vérifier le succès** — `node web/verify-annonces.mjs` → PASS (tous les cas, anciens + nouveaux).

- [ ] **Step 5 : Commit**
```
git add src/annonces.mjs web/verify-annonces.mjs
git commit -m "feat(belote): annonces — pool de déclaration (annonce non déclarée = perdue)"
```

### Task 10 : Driver — rituel annonces en deux temps + `/api/annonce`

**Files:**
- Modify: `web/driver.mjs` (`_resolveBid` ~110-125 ; `advance` phase annonces ~240-249 ; `view` ~358-411 ; nouvelle méthode `humanAnnonce`)
- Modify: `web/server.mjs` (route `POST /api/annonce`)

**Interfaces:**
- Produces:
  - Phases : `annonce_declare` (pli 1 : l'humain joue sa 1ère carte, bouton « Annoncer » si `canAnnonce`), puis `annonce_expose` (pli 2 : cartes de la **meilleure** annonce exposées).
  - `driver.humanAnnonce() → { ok }` : marque l'intention de déclarer de l'humain pour cette donne.
  - `view()` expose `canAnnonce` (bool) et, en phase `annonce_expose`, `annonceExpose = { winnerTeam, bonus, best: { label, cards:[{rank,suit}] } }` (uniquement la meilleure, du camp vainqueur).

- [ ] **Step 1 : e2e (créé en Task 14) posé comme cible** — la preuve DOM vit en Task 14 ; ici, prouver par un petit script Node driver-only `web/verify-annonce-ritual.mjs` :
```js
// pilote un BeloteDriver, force une donne où l'humain a une annonce, vérifie :
// - canAnnonce=true au pli 1 avant le 1er coup humain ;
// - sans humanAnnonce(), l'annonce de l'humain est perdue (bonus humain = 0) ;
// - avec humanAnnonce(), elle entre au pool ;
// - en phase annonce_expose, seules les cartes de la meilleure sont exposées.
```
(Chercher un seed via boucle courte donnant une annonce à l'humain ; l'imprimer pour reproductibilité.)

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node web/verify-annonce-ritual.mjs` → FAIL.

- [ ] **Step 3 : Implémentation driver**

- Champs constructeur (près de `this.annonceResult = null;`) :
```js
this._humanDeclared = false;     // l'humain a-t-il cliqué « Annoncer » cette donne ?
this._annonceResolved = false;   // le pool a-t-il été résolu (après le 1er coup) ?
this._exposeShown = false;       // l'exposition du pli 2 a-t-elle eu lieu ?
```
- `_resolveBid` : **ne plus** appeler `resolveAnnonces` ici. Remplacer la ligne `this.annonceResult = ...` par :
```js
this.annonceResult = null;       // résolu APRÈS le 1er coup (déclarations connues)
this._humanDeclared = false;
this._annonceResolved = false;
this._exposeShown = false;
```
- Détecter si l'humain a une annonce (pour `canAnnonce`) — méthode :
```js
_humanHasAnnonce() {
  if (!this.useAnnonces || !this.hands) return false;
  return detectAnnonces(this.hands[HUMAN], this.atout).length > 0;
}
```
(importer `detectAnnonces` depuis `../src/annonces.mjs`.)
- `humanAnnonce()` :
```js
humanAnnonce() {
  if (this.phase !== "await_human" || this.trickIndex !== 0) {
    return { ok: false, error: "On ne déclare qu'en jouant sa 1ère carte." };
  }
  this._humanDeclared = true;
  return { ok: true };
}
```
- Résolution du pool APRÈS le 1er coup : dans `advance`, juste avant le bloc de révélation d'annonces existant (~240), remplacer le bloc par :
```js
// Résolution du pool APRÈS le 1er pli entamé (déclarations connues). IA = toujours déclare.
if (this.useAnnonces && !this._annonceResolved && this.trickIndex >= 1) {
  const declared = [this._humanDeclared, true, true, true]; // siège 0 = humain
  this.annonceResult = resolveAnnonces(this.hands0Full, this.atout, this.dealer, declared);
  this._annonceResolved = true;
}
// Exposition (pli 2) de la MEILLEURE annonce, une seule fois.
if (this.useAnnonces && this._annonceResolved && !this._exposeShown
    && this.trickIndex >= 1 && this.annonceResult && this.annonceResult.best && !this.annonceResult.annule) {
  this._exposeShown = true;
  const w = this.annonceResult.winnerTeam;
  this.message = `Annonces : équipe ${w === 0 ? "A" : "B"} montre ${annonceLabel(this.annonceResult.best)} (+${this.annonceResult.bonus[w]}).`;
  this.phase = "annonce_expose";
  return;
}
```
> **Important (main complète pour la détection)** : `resolveAnnonces` doit voir les **mains de 8 cartes du début de donne**, pas les mains en cours (déjà entamées). Conserver une copie au moment de `_resolveBid` :
```js
this.hands0Full = this.hands.map(h => h.slice()); // snapshot 8 cartes pour la détection d'annonces
```
- `_finishDeal` : le bonus d'annonces vient toujours de `this.annonceResult` (désormais résolu). Garder `const annBonus = this.useAnnonces && this.annonceResult ? this.annonceResult.bonus : [0,0];`.
- `view()` : ajouter
```js
canAnnonce: this.phase === "await_human" && this.trickIndex === 0 && !this._humanDeclared && this._humanHasAnnonce(),
annonceExpose: this.phase === "annonce_expose" && this.annonceResult && this.annonceResult.best ? {
  winnerTeam: this.annonceResult.winnerTeam,
  bonus: this.annonceResult.bonus.slice(),
  best: {
    label: annonceLabel(this.annonceResult.best),
    cards: this.annonceResult.best.cards.map(c => ({ rank: c.rank, suit: c.suit })),
  },
} : null,
```
(retirer l'ancien champ `annonces:` lié à `annonce_show` OU le garder pour la fin de donne — au minimum, `annonce_expose` remplace `annonce_show` dans `advance`.)

- Serveur `web/server.mjs`, ajouter la route (près de `/api/play`) :
```js
if (path === "/api/annonce" && req.method === "POST") {
  if (!game) return send(res, 409, { error: "aucune partie — appelez /api/new" });
  const r = game.humanAnnonce();
  if (!r.ok) return send(res, 400, { error: r.error, state: game.view() });
  return send(res, 200, game.view());
}
```

- [ ] **Step 4 : Lancer** — `node web/verify-annonce-ritual.mjs` → PASS, puis `node web/verify-parity.mjs` (annonces désactivées dans ce script) toujours PASS, puis `node --test`.

- [ ] **Step 5 : Commit**
```
git add web/driver.mjs web/server.mjs web/verify-annonce-ritual.mjs
git commit -m "feat(belote): driver — rituel annonces 2 temps (déclaration pli1, exposition pli2) + /api/annonce"
```

### Task 11 : Scoring — belote +20 conditionnée à la déclaration + `beloteHolder`

**Files:**
- Modify: `src/rules.mjs` (ajout `beloteHolder`)
- Modify: `src/scoring.mjs` (`scoreDeal` ~16-33)
- Test: `test/scoring.test.mjs`

**Interfaces:**
- Produces:
  - `beloteHolder(fullHands, atout) → number` (siège détenteur R+D d'atout, ou -1).
  - `scoreDeal(tricks, atout, taker, beloteTeamIdx, beloteDeclared = true)` — le +20 n'est attribué que si `beloteTeamIdx !== -1 && beloteDeclared`. Défaut `true` → comportement IA/CLI inchangé.

- [ ] **Step 1 : Test**

Ajouter dans `test/scoring.test.mjs` :
```js
import { beloteHolder } from "../src/rules.mjs";

test("belote conditionnelle — déclarée = +20, oubliée = 0", () => {
  // construire une donne où team0 détient R+D d'atout (trefle) et gagne des plis
  const atout = "trefle";
  const t = (winner, cards) => ({ winner, cards });
  const tricks = [
    t(0, [card("R","trefle"), card("7","pique"), card("8","pique"), card("9","pique")]),
    t(0, [card("D","trefle"), card("7","coeur"),  card("8","coeur"),  card("9","coeur")]),
    t(0, [card("A","trefle"), card("10","pique"), card("V","pique"),  card("D","pique")]),
    t(0, [card("V","trefle"), card("9","trefle"), card("10","trefle"),card("8","trefle")]),
    t(1, [card("A","pique"),  card("R","pique"),  card("7","trefle"), card("A","coeur")]),
    t(1, [card("10","coeur"), card("R","coeur"),  card("D","coeur"),  card("V","coeur")]),
    t(1, [card("A","carreau"),card("10","carreau"),card("R","carreau"),card("D","carreau")]),
    t(1, [card("V","carreau"),card("9","carreau"),card("8","carreau"),card("7","carreau")]),
  ];
  const withDecl = scoreDeal(tricks, atout, 0, 0, true);
  const noDecl   = scoreDeal(tricks, atout, 0, 0, false);
  assert.equal(withDecl.belote[0], 20);
  assert.equal(noDecl.belote[0], 0);
});

test("beloteHolder — siège détenteur R+D d'atout", () => {
  const hands = [
    [card("R","trefle"), card("D","trefle")], [], [], [],
  ];
  assert.equal(beloteHolder(hands, "trefle"), 0);
  assert.equal(beloteHolder([[card("R","trefle")],[card("D","trefle")],[],[]], "trefle"), -1);
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/scoring.test.mjs` → FAIL.

- [ ] **Step 3 : Implémentation**

`src/rules.mjs`, ajouter :
```js
/** Siège qui détient à la fois Roi ET Dame d'atout (belote-rebelote). -1 si aucun. */
export function beloteHolder(fullHands, atout) {
  for (let p = 0; p < 4; p++) {
    const has = (rank) => fullHands[p].some((c) => c.rank === rank && c.suit === atout);
    if (has("R") && has("D")) return p;
  }
  return -1;
}
```
`src/scoring.mjs`, modifier la signature + la ligne belote :
```js
export function scoreDeal(tricks, atout, taker, beloteTeamIdx, beloteDeclared = true) {
  // ...
  const belote = [0, 0];
  if (beloteTeamIdx !== -1 && beloteDeclared) belote[beloteTeamIdx] = 20; // D4 : au détenteur, si déclaré
  // ... reste inchangé
```

- [ ] **Step 4 : Lancer, vérifier le succès** — `node --test test/scoring.test.mjs` → PASS. (`playDeal` appelle `scoreDeal(...4 args)` → `beloteDeclared` prend son défaut `true` : IA/CLI inchangés — vérifier `node tools/real-play.mjs` vert.)

- [ ] **Step 5 : Commit**
```
git add src/rules.mjs src/scoring.mjs test/scoring.test.mjs
git commit -m "feat(belote): belote +20 conditionnée à la déclaration + beloteHolder"
```

### Task 12 : Driver — belote/rebelote manuelles + `/api/belote`

**Files:**
- Modify: `web/driver.mjs` (imports ; `_resolveBid` ; `playHuman` ; `_finishDeal` ; `view` ; nouvelle méthode `humanBelote`)
- Modify: `web/server.mjs` (route `POST /api/belote`)

**Interfaces:**
- Consumes: `beloteHolder`.
- Produces:
  - `driver.humanBelote(call) → { ok }`, `call ∈ "belote" | "rebelote"`, validé contre la carte que l'humain vient de jouer (R ou D d'atout).
  - `_finishDeal` passe `beloteDeclared` à `scoreDeal` : `true` si le détenteur est une IA (auto), sinon `this._beloteCalls.belote && this._beloteCalls.rebelote`.
  - `view()` expose `canBelote` / `canRebelote`.

- [ ] **Step 1 : Preuve (script driver)** `web/verify-belote-manual.mjs` : trouver un seed où l'humain (siège 0) détient R+D d'atout ; jouer la donne en posant R puis D **sans** appeler `humanBelote` → vérifier `belote[team0] === 0` au décompte ; rejouer en appelant `humanBelote("belote")` puis `humanBelote("rebelote")` aux bons moments → `+20`.

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node web/verify-belote-manual.mjs` → FAIL.

- [ ] **Step 3 : Implémentation**

- Import : `import { legalMoves, trickWinner, beloteTeam, beloteHolder } from "../src/rules.mjs";`
- Constructeur / `_resolveBid` : initialiser
```js
this._beloteHolder = -1;
this._beloteCalls = { belote: false, rebelote: false };
```
et dans `_resolveBid`, après `this.beloteTeamIdx = beloteTeam(this.hands, atout);` :
```js
this._beloteHolder = beloteHolder(this.hands, atout);
this._beloteCalls = { belote: false, rebelote: false };
```
- `playHuman` : après avoir retiré la carte jouée, mémoriser si c'était R/D d'atout pour autoriser la déclaration à cet instant (fenêtre : jusqu'au prochain coup). Simplest : exposer l'état via `view()` en recalculant, et valider dans `humanBelote` contre la **dernière carte jouée** par l'humain. Ajouter un champ `this._lastHumanCard = null;` et dans `playHuman`, avant `this.advance()` : `this._lastHumanCard = chosen;`
- `humanBelote` :
```js
humanBelote(call) {
  if (this._beloteHolder !== HUMAN) return { ok: false, error: "Vous ne détenez pas la belote." };
  const c = this._lastHumanCard;
  const isBel = c && c.suit === this.atout && (c.rank === "R" || c.rank === "D");
  if (!isBel) return { ok: false, error: "Belote se déclare en jouant le Roi ou la Dame d'atout." };
  if (call === "belote" && !this._beloteCalls.belote) { this._beloteCalls.belote = true; return { ok: true }; }
  if (call === "rebelote" && this._beloteCalls.belote && !this._beloteCalls.rebelote) { this._beloteCalls.rebelote = true; return { ok: true }; }
  return { ok: false, error: "Déclaration de belote hors séquence." };
}
```
- `_finishDeal` : calculer `beloteDeclared` et le passer à `scoreDeal` :
```js
const beloteDeclared = this._beloteHolder === HUMAN
  ? (this._beloteCalls.belote && this._beloteCalls.rebelote)
  : true; // détenteur IA (ou partenaire IA) : automatique
const score = scoreDeal(this.tricks, this.atout, this.taker, this.beloteTeamIdx, beloteDeclared);
```
- `view()` : exposer, quand c'est le tour humain,
```js
canBelote: this._beloteHolder === HUMAN && !this._beloteCalls.belote
  && !!this._lastHumanCard && this._lastHumanCard.suit === this.atout
  && (this._lastHumanCard.rank === "R" || this._lastHumanCard.rank === "D"),
canRebelote: this._beloteHolder === HUMAN && this._beloteCalls.belote && !this._beloteCalls.rebelote
  && !!this._lastHumanCard && this._lastHumanCard.suit === this.atout
  && (this._lastHumanCard.rank === "R" || this._lastHumanCard.rank === "D"),
```
> Fenêtre de déclaration : ces flags sont vrais **juste après** que l'humain a joué R/D d'atout, jusqu'à son prochain coup. L'UI (Task 15) affiche le bouton sur cette fenêtre. `_lastHumanCard` se remet à `null` au début de son coup suivant.
- Serveur, route :
```js
if (path === "/api/belote" && req.method === "POST") {
  if (!game) return send(res, 409, { error: "aucune partie — appelez /api/new" });
  const body = await readJson(req);
  const r = game.humanBelote(String(body.call || ""));
  if (!r.ok) return send(res, 400, { error: r.error, state: game.view() });
  return send(res, 200, game.view());
}
```

- [ ] **Step 4 : Lancer** — `node web/verify-belote-manual.mjs` → PASS ; `node --test` + `node tools/real-play.mjs` verts ; `node web/verify-parity.mjs` PASS.

- [ ] **Step 5 : Commit**
```
git add web/driver.mjs web/server.mjs web/verify-belote-manual.mjs
git commit -m "feat(belote): belote/rebelote manuelles (oubli = perdu) + /api/belote"
```

---

## PHASE 4 — UI : main réorganisable, déclaration, exposition, belote

### Task 13 : Drag & drop — « ranger » vs « jouer » désambiguïsés

**Files:**
- Modify: `index.html` (styles main + handlers Pointer Events, remplace le `click` de `#hand` ligne ~558-561)
- Test: `web/e2e.reorder.mjs`

**Interfaces:**
- Consumes: `handOrder` (Task 8), `playCard()` (existant).
- Produces: gestes Pointer : glisser horizontal dans la bande main = **réordonner** (met à jour `handOrder`, ré-render) ; tap ou tirer vers le tapis (franchir le bord haut de `#hand`) = **jouer** (`playCard`, si légale). Le jeu ne re-trie jamais.

- [ ] **Step 1 : e2e**

`web/e2e.reorder.mjs` (Playwright) :
1. démarrer, « Jouer », attendre `await_human` (tour humain, `window.__belote.phase === "await_human"`) ;
2. relever l'ordre DOM initial des cartes et le `handCounts[0]` (8) ;
3. simuler un **drag horizontal** de la 1re carte vers la 3e position (pointer down → move horizontal ~80 px → up, **sans franchir le bord haut**) ;
4. **assert** : l'ordre DOM a changé, `handCounts[0]` **toujours 8** (aucune carte jouée), `window.__belote.trick` inchangé ;
5. puis simuler un **tap** (down/up quasi immobile) sur une carte **légale** → **assert** : une carte est jouée (`trick` contient la carte, ou compteur diminue) ;
6. rejouer une nouvelle main et vérifier qu'après réorganisation, le render suivant **conserve** l'ordre choisi (le jeu ne re-trie pas).

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node web/e2e.reorder.mjs` → FAIL.

- [ ] **Step 3 : Implémentation**

CSS : sur `.handcard`, `touch-action: none;` et un état `.dragging`. Placeholder d'insertion (léger écart des voisins).

Handlers (remplacer le `click` sur `#hand`) — Pointer Events :
```js
const HAND = $("hand");
const PLAY_MIN = 12;      // seuil de mouvement (px) — À CALIBRER sur device (spec §8-Q7)
const V_RATIO  = 1.3;     // ratio vertical/horizontal pour "jouer"
let drag = null;          // { id, x0, y0, moved, el }

HAND.addEventListener("pointerdown", (e) => {
  const el = e.target.closest(".handcard");
  if (!el) return;
  el.setPointerCapture(e.pointerId);
  drag = { id: el.dataset.cardId, x0: e.clientX, y0: e.clientY, moved: false, el };
});
HAND.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
  if (Math.hypot(dx, dy) > PLAY_MIN) drag.moved = true;
  if (drag.moved) {
    drag.el.classList.add("dragging");
    reorderPreview(drag.id, e.clientX); // réordonne l'aperçu selon la position horizontale du doigt
  }
});
HAND.addEventListener("pointerup", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
  const handRect = HAND.getBoundingClientRect();
  const crossedTop = e.clientY < handRect.top; // tiré au-dessus de la bande main → vers le tapis
  const verticalPlay = dy < -PLAY_MIN && Math.abs(dy) > Math.abs(dx) * V_RATIO;
  drag.el.classList.remove("dragging");
  if (!drag.moved) {
    playCard(drag.id);                 // tap → jouer (si légale, filtré dans playCard)
  } else if (crossedTop || verticalPlay) {
    playCard(drag.id);                 // tiré vers le tapis → jouer
  } else {
    commitReorder();                   // resté dans la main, horizontal → ranger
  }
  drag = null;
});
```
+ fonctions `reorderPreview(id, clientX)` (calcule la nouvelle position d'insertion d'après le centre des cartes voisines, met à jour un `handOrder` provisoire et ré-render la main) et `commitReorder()` (fige `handOrder` = ordre provisoire, persiste éventuellement). `playCard` **filtre déjà** les cartes illégales (early return) → ranger reste toujours permis, jouer seulement si légal.

> **Calibration (spec §8-Q7)** : `PLAY_MIN`, `V_RATIO` et le franchissement de bord sont des valeurs de départ. Prévoir une passe de réglage tactile sur device réel (le brief désigne ce point comme risque UX n°1).

- [ ] **Step 4 : Lancer, vérifier le succès** — `node web/e2e.reorder.mjs` → PASS (capture jointe : ordre modifié sans coup joué, puis coup joué au tap).

- [ ] **Step 5 : Commit**
```
git add index.html web/e2e.reorder.mjs
git commit -m "feat(belote): main réorganisable (Pointer) — ranger ≠ jouer, le jeu ne re-trie jamais"
```

### Task 14 : UI — bouton « Annoncer » (pli 1) + overlay d'exposition (pli 2)

**Files:**
- Modify: `index.html` (bouton près de la main quand `canAnnonce` ; overlay `annonceExpose` ; `apply()`/`render()` ~440-453, ~513-519 ; fonctions `annoncer()`)
- Test: `web/e2e.declare.mjs`

**Interfaces:**
- Consumes: `view().canAnnonce`, `view().annonceExpose`, `POST /api/annonce`.
- Produces: bouton « Annoncer » visible au pli 1 quand `canAnnonce` ; sans clic, la 1ère carte se joue et l'annonce est perdue ; en `annonce_expose`, overlay montrant **les cartes** de la meilleure annonce (celle-là seulement) ~3 s, puis on continue (les cartes restent en main).

- [ ] **Step 1 : e2e**

`web/e2e.declare.mjs` : trouver un seed (via boucle `/api/new` + inspection `window.__belote.canAnnonce`) où l'humain a une annonce. Deux scénarios :
- **A** : cliquer « Annoncer » puis jouer la 1ère carte → à l'exposition, `annonceExpose.winnerTeam` inclut l'équipe A si l'humain gagne, et le score d'annonce apparaît au HUD à la fin de donne ;
- **B** : jouer la 1ère carte **sans** cliquer → l'annonce de l'humain est **perdue** (aucun bonus A d'annonce), **aucune alerte**.
Vérifier aussi que l'overlay d'exposition affiche des **cartes** (pas seulement un libellé) et qu'après l'exposition la main de l'humain a toujours ses 8 cartes.

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node web/e2e.declare.mjs` → FAIL.

- [ ] **Step 3 : Implémentation**

- Bouton « Annoncer » : ajouter un conteneur (par ex. dans `hand-wrap`) rendu conditionnellement dans `render(s)` :
```js
const declBtn = $("annonceBtn");
if (s.canAnnonce) { declBtn.style.display = "block"; }
else { declBtn.style.display = "none"; }
```
markup :
```html
<button id="annonceBtn" style="display:none">Annoncer</button>
```
handler :
```js
$("annonceBtn").addEventListener("click", async () => {
  if (busy) return; busy = true; hideErr();
  const { status, data } = await api("/api/annonce", {});
  busy = false;
  if (status === 200) render(data); else showErr(data.error || "déclaration refusée");
});
```
- Overlay d'exposition : dans `render(s)`, remplacer le bloc `annonce_show`/`annoncePanel` par la lecture de `s.annonceExpose` :
```js
const anp = $("annoncePanel");
if (s.phase === "annonce_expose" && s.annonceExpose) {
  const A = s.annonceExpose, TEAM = t => (t === 0 ? "A" : "B");
  const cards = A.best.cards.map(cardHTML).join("");
  anp.classList.remove("hidden");
  anp.innerHTML = `<div class="sheet">
    <h3>Meilleure annonce — ${A.best.label}</h3>
    <div style="display:flex;gap:6px;justify-content:center;margin:8px 0">${cards}</div>
    <div class="win" style="font-size:16px">Équipe ${TEAM(A.winnerTeam)} marque +${A.bonus[A.winnerTeam]}</div></div>`;
} else anp.classList.add("hidden");
```
- Timing : dans `apply(s)`, ajouter la reprise après exposition :
```js
else if (s.phase === "annonce_expose") setTimeout(cont, 3000); // exposition ~3 s (spec §8-Q6)
```
(remplace l'ancien `annonce_show`.)

- [ ] **Step 4 : Lancer, vérifier le succès** — `node web/e2e.declare.mjs` → PASS (scénarios A et B), capture jointe.

- [ ] **Step 5 : Commit**
```
git add index.html web/e2e.declare.mjs
git commit -m "feat(belote): UI annonces — bouton Annoncer (pli1) + exposition cartes (pli2)"
```

### Task 15 : UI — boutons « Belote » / « Rebelote »

**Files:**
- Modify: `index.html` (boutons conditionnels `canBelote`/`canRebelote` ; handlers)
- Test: `web/e2e.belote.mjs`

**Interfaces:**
- Consumes: `view().canBelote`, `view().canRebelote`, `POST /api/belote`.
- Produces: bouton « Belote » après avoir joué R/D d'atout (fenêtre courte) ; « Rebelote » après la seconde ; oubli = pas de +20 (déjà garanti côté driver).

- [ ] **Step 1 : e2e**

`web/e2e.belote.mjs` : seed où l'humain détient R+D d'atout. Scénario « oubli » : jouer R puis D d'atout **sans** cliquer → à la fin de donne, **pas de +20** pour l'équipe A (lecture du récap `lastDeal`/HUD). Scénario « déclaré » : cliquer « Belote » quand `canBelote`, « Rebelote » quand `canRebelote` → +20 visible.

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node web/e2e.belote.mjs` → FAIL.

- [ ] **Step 3 : Implémentation**

markup (près du bouton Annoncer) :
```html
<button id="beloteBtn" style="display:none">Belote</button>
<button id="rebeloteBtn" style="display:none">Rebelote</button>
```
dans `render(s)` :
```js
$("beloteBtn").style.display   = s.canBelote   ? "block" : "none";
$("rebeloteBtn").style.display = s.canRebelote ? "block" : "none";
```
handlers :
```js
async function declareBelote(call) {
  if (busy) return; busy = true; hideErr();
  const { status, data } = await api("/api/belote", { call });
  busy = false;
  if (status === 200) render(data); else showErr(data.error || "belote refusée");
}
$("beloteBtn").addEventListener("click", () => declareBelote("belote"));
$("rebeloteBtn").addEventListener("click", () => declareBelote("rebelote"));
```

- [ ] **Step 4 : Lancer, vérifier le succès** — `node web/e2e.belote.mjs` → PASS (oubli = 0, déclaré = +20), capture jointe.

- [ ] **Step 5 : Commit**
```
git add index.html web/e2e.belote.mjs
git commit -m "feat(belote): UI belote/rebelote manuelles (fenêtre R/D atout, oubli = perdu)"
```

---

## PHASE 5 — Cartes dessinées (swap d'assets SVG)

### Task 16 : Spritesheet SVG 32 cartes + dos + tapis, validés à taille réelle

**Files:**
- Create: `assets/cards.svg` (spritesheet), `assets/back.svg`, `assets/felt.svg` (ou tokens CSS existants)
- Create: `assets/LICENSES.md` (source + licence de chaque asset)
- Modify: `web/server.mjs` (servir `/assets/*`)
- Modify: `index.html` (`cardHTML` → figures ; dos ; tapis aux tokens 4a)

**Interfaces:**
- Produces: rendu des figures R/D/V (et éventuellement 7-10) via `<use href="/assets/cards.svg#card-<rank>-<suit>">` ou `<img>` sprite ; dos + tapis en cohérence avec le design system 4a.

> **Gate matériel obligatoire (spec §4.5 / §8-Q8)** : avant d'adopter un set, **le rendre à taille réelle** (~60 px de large en main, + tapis + overlay d'exposition) et **valider la lisibilité à l'œil** (coins valeur+enseigne francs à 50-70 px). Si aucun set libre ne passe, **remonter à Pierre** — **pas** de génération IA, **pas** de dessin custom.

- [ ] **Step 1 : Sélection + preuve visuelle AVANT adoption**

Récupérer un set **SVG libre** (portrait FR Wikimedia privilégié ; fallback jeu anglais domaine public). Écrire une page de contrôle `assets/preview.html` qui affiche les 32 cartes **à 60 px** + une carte sur tapis + l'overlay d'exposition. Ouvrir, **capturer**, juger la lisibilité. **Noter source + licence** dans `assets/LICENSES.md`. Ne pas continuer si le critère 50-70 px échoue (→ remonter).

- [ ] **Step 2 : e2e de rendu (échoue tant que les figures ne sont pas câblées)**

Étendre `web/e2e.play.mjs` (ou nouveau `web/e2e.cards.mjs`) : après une donne active, **assert** que les cartes R/D/V de la main rendent un élément figure (`svg use`/`img[src*="cards.svg"]`) et **non** le glyphe texte ; capturer la main à taille réelle.

- [ ] **Step 3 : Servir les assets + câbler `cardHTML`**

`web/server.mjs`, section statique :
```js
if (req.method === "GET" && path.startsWith("/assets/")) {
  const type = path.endsWith(".svg") ? "image/svg+xml" : "application/octet-stream";
  return serveFile(res, path.slice(1), type); // ROOT + "assets/..."
}
```
`index.html`, `cardHTML(c)` — remplacer le rendu texte des figures par la sprite (garder les coins valeur+enseigne francs pour la lisibilité) :
```js
function cardHTML(c) {
  const sym = SUIT[c.suit];
  const face = ["V","D","R"].includes(c.rank)
    ? `<svg class="figure" viewBox="0 0 120 168"><use href="/assets/cards.svg#card-${c.rank}-${c.suit}"></use></svg>`
    : `<span class="pip">${sym}</span>`; // 7-10 restent des pips lisibles (spec §8-Q8)
  return `<div class="card ${isRed(c.suit) ? "red" : ""}">
    <span class="corner tl"><b>${c.rank}</b><i>${sym}</i></span>
    ${face}
    <span class="corner br"><b>${c.rank}</b><i>${sym}</i></span></div>`;
}
```
CSS `.figure { position:absolute; inset:8% 6%; width:88%; height:84%; }`. Dos de carte (pods adverses) + tapis : référencer les tokens couleur/rayon du design system 4a déjà présents (`--felt-*`, `--brass*`, `--rail*`).

- [ ] **Step 4 : Lancer, vérifier le succès** — `node web/e2e.cards.mjs` → PASS ; capture de la main à ~60 px jointe ; lisibilité coins validée.

- [ ] **Step 5 : Commit**
```
git add assets/ web/server.mjs index.html web/e2e.cards.mjs
git commit -m "feat(belote): swap cartes dessinées (SVG libre) — figures R/D/V, dos+tapis tokens 4a"
```

---

## Clôture de bloc

- [ ] **Non-régression finale** : `node --test` · `node tools/real-play.mjs` (0 violation) · `node web/verify-parity.mjs` (PASS) · tous les `web/e2e.*.mjs` verts. Captures jointes (déclaration, exposition, belote, ranger≠jouer, cartes à taille réelle).
- [ ] **Rapport de fin de charter** :
  ```
  software_verdict: OK|FAIL|BLOCKED
  evidence_verdict: INCLUDES_UX_VALIDATION
  claim_verdict: NO_CLAIM_ALLOWED
  ```
- [ ] **Handoff** : mettre à jour `studio_brain/00_CURRENT_CONTEXT.md` (bloc 1 livré, écarts §8 restants) ; **pas de push** sans go Pierre.

---

## Notes de découpage & questions ouvertes reportées

- Les **questions ouvertes §8 du spec** restent ouvertes ; les défauts proposés sont **appliqués tels quels** par ce plan (COUPE_MIN=3 ; convention pickup « camp preneur d'abord » ; tie-breaks annonces = comportement existant ; tri défaut `couleur` ; déclaration = toutes les annonces d'un coup ; exposition 3 s ; seuils geste 12 px / ratio 1.3 ; portrait FR complet visé, 7-10 en pips ; code reste dans `experiments/belote-claude/`). Toute contre-décision Pierre = ajustement d'une constante, pas une refonte.
- **Ordre d'exécution recommandé** : Phases 0→5 en séquence (chaque phase moteur re-prouve la parité avant d'attaquer l'UI qui en dépend). Les tasks UI (13/14/15) peuvent être parallélisées entre elles une fois la Phase 3 verte, mais partagent `index.html` → préférer le séquentiel pour éviter les conflits d'édition.
