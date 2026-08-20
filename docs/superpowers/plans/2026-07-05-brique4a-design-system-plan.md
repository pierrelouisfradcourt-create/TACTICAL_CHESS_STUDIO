# Brique 4a — Système de design — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser un système de design (tokens CSS + composant `Badge` + typo sans/mono) qui exprime les 4 dimensions de statut orthogonales de façon lisible et cohérente, sans changer leur sens.

**Architecture:** Des tokens CSS sur `:root` (neutres, accent, palette sémantique, polices, échelles). Un composant `Badge({dim,value})` (couleur=sévérité, glyphe de dimension). `body` passe en sans, mono réservé au code/IDs. Les classes de badge legacy sont **restylées via les tokens** (préservées pour les validateurs), et `Badge` sert sur les surfaces non gardées.

**Tech Stack:** CSS custom properties, React inline (builder.html). Fichier unique : `builder.html`.

## Global Constraints

- **Sens des dimensions préservé** : aucune donnée ne change (`maturity`/`badge`/`wiredStatus`/PASS = mêmes valeurs).
- **Classes/testids validateur-critiques préservés** : `.badge-real` et `.badge-target` dans `council-menu` (asserté par `builder-validate.mjs:376-377`) ; `data-testid="lib-mat-*"`, `lib-maturity`, `lib-wired` conservés.
- **4 dimensions gardées** (orthogonales) : D1 provenance (demo/réel/cible) · D2 maturité (draft/saved/live) · D3 câblage (unset/documented-only/wired/broken) · D4 suivi (todo/PASS/done/blocked).
- **Mapping sévérité** : neutral(draft,unset,todo) · info(demo) · good(saved,wired,réel,done,PASS) · warn(documented-only,cible) · bad(broken,blocked).
- **Aucune police externe** (stack system-ui). Aucune lib. `src/` (Rust) et `llm-lego/src/` intacts.
- **Aucun commit sans go Pierre.** Non-régression avant gate : `run-validators` (dont `builder-validate`) + `vitest` verts.

---

## File Structure

Tout dans `llm-lego/builder.html` : bloc `<style>` (tokens + restyle badges + `.badge`) ; composant React `Badge` ; changements typo ; usage `Badge` dans les cartes de nœud.

---

## Task 1 — Tokens `:root` (U1)

**Files:** Modify `llm-lego/builder.html` (début du `<style>`).

- [ ] **Step 1: Ajouter le bloc tokens** en tête du `<style>` (juste après `* { margin:0;… }` ligne ~8)

```css
    :root{
      --bg:#0b0f19; --panel:#0f172a; --panel-2:#1e293b; --line:#1e293b;
      --ink:#e0e7ff; --ink-2:#94a3b8; --ink-3:#64748b; --accent:#6366f1;
      --sev-neutral:#cbd5e1; --sev-neutral-soft:#334155;
      --sev-info:#93c5fd;   --sev-info-soft:#1e3a8a;
      --sev-good:#6ee7b7;   --sev-good-soft:#065f46;
      --sev-warn:#fcd34d;   --sev-warn-soft:#3b2f14;
      --sev-bad:#fca5a5;    --sev-bad-soft:#7f1d1d;
      --font-sans:"Segoe UI Variable Text","Segoe UI",system-ui,-apple-system,Roboto,sans-serif;
      --font-mono:'Monaco','Courier New',monospace;
      --fs-2xs:9px; --fs-xs:11px; --fs-sm:12px; --fs-md:13px; --fs-lg:15px; --fs-xl:18px;
      --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:24px; --sp-6:32px;
      --badge-radius:8px; --badge-fs:9px;
    }
```

- [ ] **Step 2: Prouver (DOM)** — recharger `/builder`, console :
```js
getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim().length > 0
&& getComputedStyle(document.documentElement).getPropertyValue('--sev-good').trim() === '#6ee7b7'
```
Expected: `true`.

- [ ] **Step 3: Commit** *(gate)* — `git add llm-lego/builder.html && git commit -m "llm-lego: brique4a — tokens de design (:root)"`

---

## Task 2 — Composant `Badge` + maps (U2)

**Files:** Modify `llm-lego/builder.html` (avant `function App()` ou près des composants).

**Interfaces:**
- Produces: `Badge({ dim, value, showLabel })` → `<span data-testid="badge" data-dim data-sev>` stylé par tokens.

- [ ] **Step 1: Ajouter les maps + le composant** (avant `function MemoryGraph`)

```jsx
    const SEV_VARS = { neutral: ['--sev-neutral-soft', '--sev-neutral'], info: ['--sev-info-soft', '--sev-info'], good: ['--sev-good-soft', '--sev-good'], warn: ['--sev-warn-soft', '--sev-warn'], bad: ['--sev-bad-soft', '--sev-bad'] };
    const DIM_DEF = {
      provenance: { glyph: '◆', label: 'provenance', sev: { demo: 'info', 'réel': 'good', real: 'good', cible: 'warn', target: 'warn' } },
      maturite:   { glyph: '◐', label: 'maturité',  sev: { draft: 'neutral', saved: 'good', live: 'good' } },
      cablage:    { glyph: '⚡', label: 'câblage',   sev: { unset: 'neutral', 'documented-only': 'warn', wired: 'good', broken: 'bad' } },
      suivi:      { glyph: '✓', label: 'suivi',     sev: { todo: 'neutral', PASS: 'good', done: 'good', blocked: 'bad' } },
    };
    function Badge({ dim, value, showLabel }) {
      const d = DIM_DEF[dim]; if (!d || value == null || value === '') return null;
      const sev = d.sev[String(value)] || 'neutral';
      const [soft, fg] = SEV_VARS[sev];
      return <span className="badge" data-testid="badge" data-dim={dim} data-sev={sev} title={`${d.label} : ${value}`}
        style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--badge-fs)', padding: '1px 6px', borderRadius: 'var(--badge-radius)', fontWeight: 700, background: `var(${soft})`, color: `var(${fg})`, marginRight: 4, whiteSpace: 'nowrap' }}>
        {d.glyph}{showLabel !== false ? ' ' + value : ''}</span>;
    }
```

- [ ] **Step 2: Prouver (DOM)** — ajouter temporairement un `Badge` n'est pas nécessaire ; il sera exercé en Task 4. Vérif de non-plantage : recharger `/builder`, `typeof window` OK (pas d'erreur babel). Console : `!document.querySelector('.err')` (pas d'écran d'erreur).

- [ ] **Step 3: Commit** *(gate)* — `git add llm-lego/builder.html && git commit -m "llm-lego: brique4a — composant Badge (dim→sévérité, glyphe)"`

---

## Task 3 — Typo globale : sans par défaut, mono pour le code (U3)

**Files:** Modify `llm-lego/builder.html` (`body`, inputs, pre).

- [ ] **Step 1: `body` → sans** — remplacer
`body { font-family: 'Monaco', 'Courier New', monospace; background: #0b0f19; color: #e0e7ff; height: 100vh; overflow: hidden; }`
par
`body { font-family: var(--font-sans); background: var(--bg); color: var(--ink); height: 100vh; overflow: hidden; }`

- [ ] **Step 2: Mono réservé au code/IDs** — ajouter dans le `<style>` :
```css
    textarea, input, pre, code, .mono, .zlvl, .node-brick { font-family: var(--font-mono); }
```
(l'INPUT INITIAL JSON, la trace `pre`, les IDs restent mono.)

- [ ] **Step 3: Prouver (DOM + capture)** — recharger `/builder`. Console :
```js
getComputedStyle(document.body).fontFamily.toLowerCase().includes('segoe') || getComputedStyle(document.body).fontFamily.toLowerCase().includes('system')
```
Expected: `true`. Capture `brique4a-typo` (avant = mono, après = sans).

- [ ] **Step 4: Régression** — `cd llm-lego && node run-validators.mjs` → verts (les validateurs ne testent pas la police).

- [ ] **Step 5: Commit** *(gate)* — `git add llm-lego/builder.html && git commit -m "llm-lego: brique4a — typo sans par défaut, mono réservé au code/IDs"`

---

## Task 4 — Application : restyle legacy + Badge sur les cartes de nœud (U4)

**Files:** Modify `llm-lego/builder.html`.

**Interfaces:** Consumes `Badge` (T2), tokens (T1).

- [ ] **Step 1: Restyler les classes de badge legacy via les tokens** (préserve classes/attrs → validateurs verts). Remplacer les 3 règles `.badge-real/.badge-target/.badge-demo` et les blocs `.lib-maturity[data-maturity=…]` / `.lib-wired[data-wired=…]` par des règles pilotées tokens + glyphe `::before` :

```css
    .badge-real, .badge-target, .badge-demo, .lib-maturity, .lib-wired {
      font-family: var(--font-sans); font-size: var(--badge-fs); padding: 1px 6px; border-radius: var(--badge-radius); font-weight: 700; margin-right: 6px; text-transform: none; }
    .badge-demo { background: var(--sev-info-soft); color: var(--sev-info); }
    .badge-real { background: var(--sev-good-soft); color: var(--sev-good); }
    .badge-target { background: var(--sev-warn-soft); color: var(--sev-warn); }
    .badge-demo::before { content: '◆ '; } .badge-real::before { content: '◆ '; } .badge-target::before { content: '◆ '; }
    .lib-maturity[data-maturity="draft"] { background: var(--sev-neutral-soft); color: var(--sev-neutral); }
    .lib-maturity[data-maturity="saved"] { background: var(--sev-good-soft); color: var(--sev-good); }
    .lib-maturity[data-maturity="live"]  { background: var(--sev-good-soft); color: var(--sev-good); }
    .lib-maturity[data-maturity]::before { content: '◐ '; }
    .lib-wired[data-wired="unset"]           { background: var(--sev-neutral-soft); color: var(--sev-neutral); }
    .lib-wired[data-wired="documented-only"] { background: var(--sev-warn-soft); color: var(--sev-warn); }
    .lib-wired[data-wired="wired"]           { background: var(--sev-good-soft); color: var(--sev-good); }
    .lib-wired[data-wired="broken"]          { background: var(--sev-bad-soft); color: var(--sev-bad); }
    .lib-wired[data-wired]::before { content: '⚡ '; }
    .badge { display: inline-block; }
```
(Les `.lib-maturity` sans `data-maturity` — ex. le badge `kind` ligne ~3462 — n'ont pas de `::before` valeur ; le `::before` sur `[data-maturity]` ne s'y applique pas. OK.)

- [ ] **Step 2: Utiliser `Badge` sur la carte de nœud** (surface non gardée par les validateurs). Le nœud expose `wiredStatus` (D3) : à côté de `data-wired={…}` (ligne ~1978), afficher un `Badge` de câblage. Repérer dans le rendu du nœud l'en-tête et ajouter, là où le type est affiché :
```jsx
{n.data && n.data.wiredStatus && n.data.wiredStatus !== 'unset' && <Badge dim="cablage" value={n.data.wiredStatus} />}
```
(placement : dans `.nhead`/l'en-tête du nœud, à côté du type. Si l'emplacement exact varie, l'ajouter juste après le badge de type du nœud.)

- [ ] **Step 3: Prouver (DOM)** — recharger `/builder`, ouvrir Bibliothèque + le menu Council :
```js
// Council garde .badge-real/.badge-target (validateur) ET est restylé
document.querySelector('[data-testid="council-menu"]');
// un badge unifié rend le glyphe
getComputedStyle(document.querySelector('.lib-wired, .lib-maturity, .badge-real') , '::before').content;
```
Expected: les badges portent un glyphe (`◆/◐/⚡`) et les couleurs sémantiques ; `.badge-real`/`.badge-target` toujours présents.

- [ ] **Step 4: Régression complète** — `cd llm-lego && node run-validators.mjs && ./node_modules/.bin/vitest run`
Expected: `run-validators` ✅ ❌0 (dont **builder-validate** : `.badge-real`/`.badge-target` du council-menu toujours comptés = 1) ; `vitest` verts.

- [ ] **Step 5: Commit** *(gate)* — `git add llm-lego/builder.html && git commit -m "llm-lego: brique4a — badges unifiés (restyle tokens + glyphes) + Badge sur cartes de nœud"`

---

## Task 5 — Non-régression finale + avant/après (U5)

**Files:** aucun (vérification).

- [ ] **Step 1: Non-régression briques 2/3a (DOM)** — recharger `/builder`, ouvrir 🧠 Mémoire :
```js
document.querySelector('[data-testid="btn-memory"]').click();
await new Promise(r=>setTimeout(r,500));
const list = document.querySelectorAll('[data-testid="mem-note"]').length;
document.querySelector('[data-testid="mem-view-graph"]').click();
await new Promise(r=>setTimeout(r,900));
({ list, svg: !!document.querySelector('[data-testid="mem-graph-svg"]'), nodes: document.querySelectorAll('[data-testid="mem-graph-node"]').length })
```
Expected: `list` > 0, `svg` true, `nodes` > 20 (briques 2/3a intactes sous la nouvelle typo).

- [ ] **Step 2: Captures avant/après** — Bibliothèque + une carte de nœud : `brique4a-badges` (télescopage → système cohérent), `brique4a-typo` (mono → sans).

- [ ] **Step 3: Régression complète confirmée** — `cd llm-lego && node run-validators.mjs && ./node_modules/.bin/vitest run` → tous verts.

---

## Self-Review (fait)

- **Couverture spec** : §3.1 tokens → T1 ; §3.2 Badge → T2 ; §3.3 typo → T3 ; §3.3 application → T4 ; §5 preuve → T3/T4/T5. Décision modèle §2 (KEEP 4 dims + mapping) → encodée dans DIM_DEF/SEV (T2) + restyle (T4). ✅
- **Placeholders** : aucun (code complet). Le placement exact du Badge nœud (T4 S2) est décrit avec repère de ligne.
- **Cohérence types** : `DIM_DEF`/`SEV_VARS`/`Badge({dim,value,showLabel})` ; sévérités `neutral/info/good/warn/bad` cohérentes T2↔T4. ✅
- **Contrainte oracle** : `.badge-real`/`.badge-target` du council-menu **préservés** (T4 S1 restyle sans renommer) → `builder-validate` vert.
- **Ordre** : T1 → T2 → T3 → T4 → T5.
