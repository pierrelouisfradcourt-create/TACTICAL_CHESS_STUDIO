# Telemetry Dashboard (Phase 3.5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher honnêtement sur l'Accueil du board llm-lego la télémétrie déjà capturée (coût/tokens/durée/modèle + verdicts council), en lecture seule, avec un état « corpus en cours d'accumulation » quand le signal est faible.

**Architecture:** Agrégation côté serveur (pattern `/api/imp-board`, `/api/hygiene`, `/api/knowledge`). Un module pur `telemetry-read.mjs` lit les deux `.jsonl` (tolérant à l'absence), un endpoint read-only `GET /api/telemetry` renvoie l'agrégat, une section React `TelemetryPanel` dans `HomeView` l'affiche en miroir du `hygiene-panel` existant. Un validateur `*-validate.mjs` auto-découvert prouve module + endpoint + UI.

**Tech Stack:** Node ESM (`.mjs`), TypeScript server (`demo-server.ts` exécuté via node), React via Babel standalone (inline dans `builder.html`), Playwright (chromium) pour la preuve UI.

## Global Constraints

- **Lecture seule stricte** : aucune écriture, on ne touche JAMAIS `telemetry.mjs` (côté capture).
- **Numéro = Phase 3.5**, jamais Phase 6 (= Evolution System dormant). Ne pas réutiliser 6.
- **Coût = tokens + durée réels**, libellé « modèle local — coût monétaire nul ». Aucun tarif inventé, aucune projection cloud.
- **Pas de filtre par-IMP** en v0 (vue globale uniquement).
- **Tolérance à l'absence** : fichier `.jsonl` manquant = 0 enregistrement, jamais une erreur / 500.
- **Ligne malformée** = sautée ET comptée dans `skipped` (jamais de drop silencieux).
- **Convention dir** : `TELEMETRY_DIR = process.env.TCS_TELEMETRY_DIR || <llm-lego/telemetry>` — même que la capture, testable en dossier temp.
- **Aucun commit/push sans go explicite Pierre.** Les commits de ce plan sont **groupés et différés** : on stage, on ne commit qu'à la Task 4 sur go Pierre (design + implémentation ensemble).
- Tous les chemins sont relatifs à `C:\TACTICAL_CHESS_STUDIO\llm-lego\` sauf mention contraire.

## File Structure

| Fichier | Responsabilité |
|---|---|
| `llm-lego/telemetry-read.mjs` (créer) | Module PUR : lit les 2 `.jsonl`, retourne l'agrégat déterministe. Consommateur, séparé du producteur `telemetry.mjs`. |
| `llm-lego/demo-server.ts` (modifier) | Ajoute l'import + la route `GET /api/telemetry` (read-only). |
| `llm-lego/builder.html` (modifier) | Ajoute l'état + fetch + section `TelemetryPanel` dans `HomeView`, en miroir de `hygiene-panel`. |
| `llm-lego/telemetry-dashboard-validate.mjs` (créer) | Validateur auto-découvert : preuve module (A/B/C) + endpoint (D) + UI (E). Écrit `telemetry_dashboard_validation_result.json`. |

## Contrat de l'agrégat (référence partagée — toutes les tasks)

`buildTelemetry({ dir })` retourne exactement :

```js
{
  llm_calls: {
    count: number,              // enregistrements valides
    total_tokens: number,       // Σ total_tokens
    prompt_tokens: number,      // Σ prompt_tokens (null → 0)
    completion_tokens: number,  // Σ completion_tokens (null → 0)
    total_duration_ms: number,  // Σ durationMs (null → 0)
    by_model: { [model: string]: { calls: number, tokens: number } },
    distinct_imps: number,      // nb d'IMP distincts non-null
    skipped: number             // lignes rejetées (JSON invalide OU total_tokens non numérique)
  },
  verdicts: {
    count: number,
    distribution: { [verdict: string]: number },
    skipped: number
  },
  corpus_state: "accumulating" | "active"
  // "accumulating" si llm_calls.count < 20 OU verdicts.count === 0 ; sinon "active"
}
```

**Corpus de référence (fixture déterministe)** — les 4 lignes réelles capturées le 2026-07-08 (run council-audit IMP-206). Utilisées comme fixture temp pour des assertions exactes (ne PAS asserter sur le fichier live, volatile) :

```
{"ts":"2026-07-08T07:49:09.659Z","live":true,"imp":"IMP-206","nodeId":"COUT","model":"qwen2.5-14b-instruct","prompt_tokens":247,"completion_tokens":90,"total_tokens":337,"durationMs":1344}
{"ts":"2026-07-08T07:49:09.659Z","live":true,"imp":"IMP-206","nodeId":"QUALITE","model":"qwen2.5-14b-instruct","prompt_tokens":244,"completion_tokens":100,"total_tokens":344,"durationMs":1487}
{"ts":"2026-07-08T07:49:09.659Z","live":true,"imp":"IMP-206","nodeId":"VITESSE","model":"qwen2.5-14b-instruct","prompt_tokens":247,"completion_tokens":119,"total_tokens":366,"durationMs":1463}
{"ts":"2026-07-08T07:49:09.659Z","live":true,"imp":"IMP-206","nodeId":"ARCHITECTURE","model":"qwen2.5-14b-instruct","prompt_tokens":251,"completion_tokens":118,"total_tokens":369,"durationMs":1685}
```

Sommes attendues : `count=4`, `total_tokens=1416`, `prompt_tokens=989`, `completion_tokens=427`, `total_duration_ms=5979`, `by_model["qwen2.5-14b-instruct"]={calls:4,tokens:1416}`, `distinct_imps=1`, `corpus_state="accumulating"`.

---

### Task 1 : Module pur `telemetry-read.mjs` + preuve module (A/B/C)

**Files:**
- Create: `llm-lego/telemetry-read.mjs`
- Create: `llm-lego/telemetry-dashboard-validate.mjs` (sections A/B/C uniquement — node pur, ni serveur ni navigateur)

**Interfaces:**
- Produces: `export function buildTelemetry({ dir })` → l'agrégat décrit ci-dessus. `dir` obligatoire (chemin absolu d'un dossier contenant éventuellement `llm_calls.jsonl` et `council_verdicts.jsonl`).

- [ ] **Step 1 : Écrire la preuve qui échoue (validateur A/B/C)**

Créer `llm-lego/telemetry-dashboard-validate.mjs` :

```js
// telemetry-dashboard-validate.mjs — Phase 3.5 : preuve du dashboard coût/tokens/verdicts.
// A/B/C = module pur (dossiers temp). D = endpoint (serveur temp). E = UI (playwright).
// Lecture seule ; n'écrit que son rapport telemetry_dashboard_validation_result.json.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildTelemetry } from "./telemetry-read.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0;
const log = [];
const check = (name, ok) => { (ok ? pass++ : fail++); log.push(`${ok ? "✅" : "❌"} ${name}`); console.log(`  ${ok ? "✅" : "❌"} ${name}`); };

// Corpus de référence = 4 lignes réelles (run council-audit IMP-206, 2026-07-08).
const CORPUS = [
  '{"ts":"2026-07-08T07:49:09.659Z","live":true,"imp":"IMP-206","nodeId":"COUT","model":"qwen2.5-14b-instruct","prompt_tokens":247,"completion_tokens":90,"total_tokens":337,"durationMs":1344}',
  '{"ts":"2026-07-08T07:49:09.659Z","live":true,"imp":"IMP-206","nodeId":"QUALITE","model":"qwen2.5-14b-instruct","prompt_tokens":244,"completion_tokens":100,"total_tokens":344,"durationMs":1487}',
  '{"ts":"2026-07-08T07:49:09.659Z","live":true,"imp":"IMP-206","nodeId":"VITESSE","model":"qwen2.5-14b-instruct","prompt_tokens":247,"completion_tokens":119,"total_tokens":366,"durationMs":1463}',
  '{"ts":"2026-07-08T07:49:09.659Z","live":true,"imp":"IMP-206","nodeId":"ARCHITECTURE","model":"qwen2.5-14b-instruct","prompt_tokens":251,"completion_tokens":118,"total_tokens":369,"durationMs":1685}',
].join("\n") + "\n";

const dirs = [];
const mkdir = (prefix) => { const d = mkdtempSync(path.join(tmpdir(), prefix)); dirs.push(d); return d; };

// --- A : corpus de référence → sommes exactes ---
{
  const d = mkdir("tel-a-");
  writeFileSync(path.join(d, "llm_calls.jsonl"), CORPUS, "utf-8");
  const t = buildTelemetry({ dir: d });
  check("A: count === 4", t.llm_calls.count === 4);
  check("A: total_tokens === 1416", t.llm_calls.total_tokens === 1416);
  check("A: prompt_tokens === 989", t.llm_calls.prompt_tokens === 989);
  check("A: completion_tokens === 427", t.llm_calls.completion_tokens === 427);
  check("A: total_duration_ms === 5979", t.llm_calls.total_duration_ms === 5979);
  check("A: by_model qwen calls===4 tokens===1416", t.llm_calls.by_model["qwen2.5-14b-instruct"] && t.llm_calls.by_model["qwen2.5-14b-instruct"].calls === 4 && t.llm_calls.by_model["qwen2.5-14b-instruct"].tokens === 1416);
  check("A: distinct_imps === 1", t.llm_calls.distinct_imps === 1);
  check("A: verdicts.count === 0 (fichier absent)", t.verdicts.count === 0);
  check("A: corpus_state === accumulating", t.corpus_state === "accumulating");
}
// --- B : dossier vide → zéros, pas de crash ---
{
  const d = mkdir("tel-b-");
  const t = buildTelemetry({ dir: d });
  check("B: count === 0 (absence tolérée)", t.llm_calls.count === 0);
  check("B: total_tokens === 0", t.llm_calls.total_tokens === 0);
  check("B: skipped === 0", t.llm_calls.skipped === 0);
  check("B: verdicts.count === 0", t.verdicts.count === 0);
  check("B: corpus_state === accumulating", t.corpus_state === "accumulating");
}
// --- C : ligne malformée → sautée + comptée, valides agrégées ---
{
  const d = mkdir("tel-c-");
  writeFileSync(path.join(d, "llm_calls.jsonl"),
    '{"total_tokens":10,"prompt_tokens":6,"completion_tokens":4,"durationMs":5,"model":"m","imp":"IMP-1"}\n{ ceci n\'est pas du json\n\n', "utf-8");
  const t = buildTelemetry({ dir: d });
  check("C: count === 1 (valide agrégée)", t.llm_calls.count === 1);
  check("C: skipped === 1 (malformée comptée)", t.llm_calls.skipped === 1);
  check("C: total_tokens === 10", t.llm_calls.total_tokens === 10);
}

for (const d of dirs) { try { rmSync(d, { recursive: true, force: true }); } catch {} }
writeFileSync(path.join(__dirname, "telemetry_dashboard_validation_result.json"),
  JSON.stringify({ pass, fail, checks: log }, null, 2), "utf-8");
console.log(`\ntelemetry-dashboard: ${pass} pass / ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
```

- [ ] **Step 2 : Lancer — vérifier l'échec**

Run: `node telemetry-dashboard-validate.mjs`
Expected: FAIL — `Cannot find module './telemetry-read.mjs'` (le module n'existe pas encore).

- [ ] **Step 3 : Implémenter le module pur `telemetry-read.mjs`**

Créer `llm-lego/telemetry-read.mjs` :

```js
// telemetry-read.mjs — Phase 3.5 : CONSOMMATEUR pur de la télémétrie (séparé de la capture
// telemetry.mjs). Lit llm_calls.jsonl + council_verdicts.jsonl d'un dossier, tolérant à
// l'absence, malformé sauté+compté. PUR & déterministe, ZERO écriture. Réutilise TELEMETRY_DIR
// (même convention TCS_TELEMETRY_DIR que la capture) comme défaut.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { TELEMETRY_DIR } from "./telemetry.mjs";

const ACCUMULATING_THRESHOLD = 20; // sous ce nb d'appels, le signal est déclaré "en accumulation".

// Lit un .jsonl en objets ; retourne { records, skipped }. Fichier absent = { records:[], skipped:0 }.
function readJsonl(file) {
  if (!existsSync(file)) return { records: [], skipped: 0 };
  const lines = readFileSync(file, "utf-8").split("\n");
  const records = [];
  let skipped = 0;
  for (const line of lines) {
    const s = line.trim();
    if (!s) continue; // ligne vide ignorée, jamais comptée comme malformée
    try { records.push(JSON.parse(s)); } catch { skipped += 1; }
  }
  return { records, skipped };
}

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

// Agrège la télémétrie d'un dossier. dir optionnel → défaut TELEMETRY_DIR. PUR.
export function buildTelemetry({ dir } = {}) {
  const base = dir || TELEMETRY_DIR;
  const calls = readJsonl(path.join(base, "llm_calls.jsonl"));
  const verd = readJsonl(path.join(base, "council_verdicts.jsonl"));

  const llm = {
    count: 0, total_tokens: 0, prompt_tokens: 0, completion_tokens: 0,
    total_duration_ms: 0, by_model: {}, distinct_imps: 0, skipped: calls.skipped,
  };
  const imps = new Set();
  for (const r of calls.records) {
    // Enregistrement invalide (total_tokens non numérique) : sauté ET compté (jamais silencieux).
    if (!r || typeof r.total_tokens !== "number" || !Number.isFinite(r.total_tokens)) { llm.skipped += 1; continue; }
    llm.count += 1;
    llm.total_tokens += num(r.total_tokens);
    llm.prompt_tokens += num(r.prompt_tokens);
    llm.completion_tokens += num(r.completion_tokens);
    llm.total_duration_ms += num(r.durationMs);
    const model = typeof r.model === "string" && r.model ? r.model : "(inconnu)";
    if (!llm.by_model[model]) llm.by_model[model] = { calls: 0, tokens: 0 };
    llm.by_model[model].calls += 1;
    llm.by_model[model].tokens += num(r.total_tokens);
    if (r.imp) imps.add(r.imp);
  }
  llm.distinct_imps = imps.size;

  const verdicts = { count: 0, distribution: {}, skipped: verd.skipped };
  for (const r of verd.records) {
    if (!r || typeof r.verdict !== "string" || !r.verdict) { verdicts.skipped += 1; continue; }
    verdicts.count += 1;
    verdicts.distribution[r.verdict] = (verdicts.distribution[r.verdict] || 0) + 1;
  }

  const corpus_state = (llm.count < ACCUMULATING_THRESHOLD || verdicts.count === 0) ? "accumulating" : "active";
  return { llm_calls: llm, verdicts, corpus_state };
}
```

- [ ] **Step 4 : Lancer — vérifier le succès (A/B/C)**

Run: `node telemetry-dashboard-validate.mjs`
Expected: PASS — `telemetry-dashboard: 17 pass / 0 fail` (9 A + 5 B + 3 C = 17 checks). Toute assertion rouge = bug à corriger avant de continuer.

- [ ] **Step 5 : Stager (commit groupé différé — pas de commit ici)**

```bash
git add llm-lego/telemetry-read.mjs llm-lego/telemetry-dashboard-validate.mjs llm-lego/telemetry_dashboard_validation_result.json
```
Ne PAS committer — le commit est groupé à la Task 4 sur go Pierre.

---

### Task 2 : Endpoint read-only `GET /api/telemetry` + preuve endpoint (D)

**Files:**
- Modify: `llm-lego/demo-server.ts` (import ~ligne 30 ; nouvelle route près du bloc `/api/hygiene` ~ligne 600)
- Modify: `llm-lego/telemetry-dashboard-validate.mjs` (ajouter la section D avant l'écriture du rapport)

**Interfaces:**
- Consumes: `buildTelemetry({ dir })` de la Task 1 ; `TELEMETRY_DIR` de `telemetry.mjs`.
- Produces: `GET /api/telemetry` → `200 { llm_calls, verdicts, corpus_state }` (l'agrégat). Jamais 500 sur fichier absent.

- [ ] **Step 1 : Écrire la preuve qui échoue (section D)**

Dans `telemetry-dashboard-validate.mjs`, AVANT le bloc final `for (const d of dirs)` / écriture du rapport, insérer :

```js
// --- D : endpoint /api/telemetry sur serveur temp (TCS_TELEMETRY_DIR = fixture) ---
const PORT = process.env["LEGO_TELEMETRY_PORT"] ?? "3123";
const BASE = `http://localhost:${PORT}`;
const teldir = mkdir("tel-d-");
writeFileSync(path.join(teldir, "llm_calls.jsonl"), CORPUS, "utf-8");
const brain = mkdir("tel-brain-");
const facts = mkdir("tel-facts-");
writeFileSync(path.join(facts, "n.md"), "# N\n\nx.", "utf-8");
const server = spawn(process.execPath, ["demo-server.ts"], {
  cwd: __dirname,
  env: { ...process.env, TCS_TELEMETRY_DIR: teldir, TCS_BRAIN_DIR: brain, TCS_MEMORY_DIR: facts, PORT },
  stdio: ["ignore", "ignore", "inherit"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitUp(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(BASE + "/api/telemetry"); if (r.ok) return true; } catch {}
    await sleep(250);
  }
  return false;
}
try {
  const up = await waitUp();
  check("D: serveur répond sur /api/telemetry", up);
  if (up) {
    const r = await fetch(BASE + "/api/telemetry");
    const b = await r.json();
    check("D: HTTP 200", r.status === 200);
    check("D: total_tokens === 1416 via endpoint", b.llm_calls && b.llm_calls.total_tokens === 1416);
    check("D: corpus_state === accumulating via endpoint", b.corpus_state === "accumulating");
    check("D: verdicts.count === 0 via endpoint", b.verdicts && b.verdicts.count === 0);
  }
} finally {
  try { server.kill(); } catch {}
}
```

- [ ] **Step 2 : Lancer — vérifier l'échec (D)**

Run: `node telemetry-dashboard-validate.mjs`
Expected: A/B/C PASS ; **D échoue** — `/api/telemetry` renvoie 404 (route inexistante), `waitUp` finit false OU HTTP ≠ 200.

- [ ] **Step 3 : Ajouter l'import dans `demo-server.ts`**

Repérer la ligne (~30) :
```ts
import { telemetryRecords, appendTelemetry, appendVerdict } from "./telemetry.mjs";
```
Juste en dessous, ajouter :
```ts
import { TELEMETRY_DIR } from "./telemetry.mjs";
import { buildTelemetry } from "./telemetry-read.mjs";
```

- [ ] **Step 4 : Ajouter la route (près du bloc `/api/hygiene`)**

Repérer le bloc existant :
```ts
  if (pathname === "/api/hygiene" && req.method === "GET") {
    try { sendJson(res, 200, buildHygieneBoard({ reportPath: HYGIENE_REPORT_PATH })); }
    catch (e) { sendJson(res, 500, { error: String((e as any).message || e) }); }
    return;
  }
```
Juste après ce bloc, insérer :
```ts
  // Phase 3.5 — dashboard télémétrie (coût/tokens/verdicts). LECTURE SEULE, ZERO write.
  // Fichiers .jsonl absents = état normal (corpus en accumulation), jamais une erreur.
  if (pathname === "/api/telemetry" && req.method === "GET") {
    try { sendJson(res, 200, buildTelemetry({ dir: TELEMETRY_DIR })); }
    catch (e) { sendJson(res, 500, { error: String((e as any).message || e) }); }
    return;
  }
```

- [ ] **Step 5 : Lancer — vérifier le succès (A/B/C/D)**

Run: `node telemetry-dashboard-validate.mjs`
Expected: PASS — toutes les sections vertes, y compris les 5 checks D.

- [ ] **Step 6 : Stager (commit groupé différé)**

```bash
git add llm-lego/demo-server.ts llm-lego/telemetry-dashboard-validate.mjs llm-lego/telemetry_dashboard_validation_result.json
```

---

### Task 3 : Section UI `TelemetryPanel` dans `HomeView` + preuve UI (E)

**Files:**
- Modify: `llm-lego/builder.html` — composant `HomeView` (état ~2247, fetch ~2424, JSX zone principale après `hygiene-panel` ~2503)
- Modify: `llm-lego/telemetry-dashboard-validate.mjs` (ajouter la section E, playwright)

**Interfaces:**
- Consumes: `GET /api/telemetry` de la Task 2.
- Produces (contrat DOM stable pour la preuve E — `data-testid`) :
  - `telemetry-panel` — conteneur de la section.
  - `telemetry-tokens` — tuile total tokens.
  - `telemetry-cost-label` — porte le texte « modèle local — coût monétaire nul ».
  - `telemetry-accumulating` — bannière low-volume (présente ssi `corpus_state==="accumulating"`).

- [ ] **Step 1 : Écrire la preuve qui échoue (section E, playwright)**

En tête de `telemetry-dashboard-validate.mjs`, ajouter l'import chromium à côté des autres imports :
```js
import { chromium } from "playwright";
```
Puis, APRÈS le bloc D (le serveur temp `server` est encore vivant à ce point — placer E avant le `finally` qui tue le serveur, ou relancer un serveur ; ici on réutilise le même serveur : déplacer le `server.kill()` après E). Structure recommandée : englober D **et** E dans le même `try { ... } finally { server.kill() }`. Insérer dans le `try`, après les checks D :

```js
    // --- E : la section Télémétrie s'affiche sur l'Accueil (DOM réel) ---
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
      await page.goto(`${BASE}/builder`, { waitUntil: "load", timeout: 20000 });
      await page.getByRole("button", { name: /Accueil/ }).click();
      await page.waitForSelector('[data-testid="telemetry-panel"]', { timeout: 10000 });
      check("E: section telemetry-panel présente", await page.locator('[data-testid="telemetry-panel"]').count() === 1);
      check("E: tuile tokens affiche 1416", /1416/.test(await page.locator('[data-testid="telemetry-tokens"]').textContent()));
      check("E: libellé coût honnête présent", /modèle local/i.test(await page.locator('[data-testid="telemetry-cost-label"]').textContent()));
      check("E: bannière accumulation présente", await page.locator('[data-testid="telemetry-accumulating"]').count() === 1);
      await page.screenshot({ path: path.join(__dirname, "telemetry_dashboard.png"), fullPage: false });
    } finally {
      await browser.close();
    }
```

- [ ] **Step 2 : Lancer — vérifier l'échec (E)**

Run: `node telemetry-dashboard-validate.mjs`
Expected: A/B/C/D PASS ; **E échoue** — `waitForSelector('[data-testid="telemetry-panel"]')` timeout (la section n'existe pas).

- [ ] **Step 3 : Ajouter l'état + le fetch dans `HomeView`**

Repérer (dans `HomeView`, ~2249) :
```jsx
      const [hygiene, setHygiene] = useState(null); // /api/hygiene → capteur hygiène code (déterministe, lecture seule)
```
Juste en dessous, ajouter :
```jsx
      const [telemetry, setTelemetry] = useState(null); // /api/telemetry → dashboard coût/tokens/verdicts (Phase 3.5, lecture seule)
```
Repérer le fetch existant (~2424) :
```jsx
        fetch('/api/imp-board').then((r) => r.json()).then(setBoard).catch((e) => setErr(String(e)));
```
Juste en dessous (dans le même `useEffect`), ajouter :
```jsx
        fetch('/api/telemetry').then((r) => r.json()).then(setTelemetry).catch(() => setTelemetry(null));
```

- [ ] **Step 4 : Ajouter la section JSX (après le bloc `hygiene-panel`)**

Repérer la fin du bloc hygiène (~2503), la ligne `))}` qui ferme `{hygiene && hygiene.available && ( ... )}`, juste AVANT le bloc filtre `<div style={{ display: 'flex', gap: 10, ... marginBottom: 14 ...}}>` (l'input `impboard-filter`). Insérer entre les deux :

```jsx
              {/* Phase 3.5 — dashboard télémétrie (coût/tokens/verdicts). Lecture seule, honnête sur le volume. */}
              {telemetry && (
                <div data-testid="telemetry-panel" style={{ background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 'var(--fs-2xs)', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent)' }}>Télémétrie — coût/tokens/verdicts (lecture seule)</span>
                  </div>
                  {telemetry.corpus_state === 'accumulating' && (
                    <div data-testid="telemetry-accumulating" style={{ background: 'var(--sev-warn-soft)', color: 'var(--sev-warn)', padding: '6px 10px', borderRadius: 6, marginBottom: 8, fontSize: 'var(--fs-2xs)' }}>
                      Corpus en cours d'accumulation ({telemetry.llm_calls.count} appel(s), {telemetry.verdicts.count} verdict(s)) — signal encore faible.
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 8 }}>
                    <div data-testid="telemetry-calls">
                      <span style={{ fontSize: 'var(--fs-lg)', color: 'var(--ink)' }}>{telemetry.llm_calls.count}</span>
                      <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)', marginLeft: 6 }}>appels LLM{telemetry.llm_calls.skipped ? ' (' + telemetry.llm_calls.skipped + ' ignoré(s))' : ''}</span>
                    </div>
                    <div data-testid="telemetry-tokens">
                      <span style={{ fontSize: 'var(--fs-lg)', color: 'var(--ink)' }}>{telemetry.llm_calls.total_tokens}</span>
                      <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)', marginLeft: 6 }}>tokens ({telemetry.llm_calls.prompt_tokens} in / {telemetry.llm_calls.completion_tokens} out)</span>
                    </div>
                    <div data-testid="telemetry-duration">
                      <span style={{ fontSize: 'var(--fs-lg)', color: 'var(--ink)' }}>{(telemetry.llm_calls.total_duration_ms / 1000).toFixed(1)}s</span>
                      <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)', marginLeft: 6 }}>durée cumulée</span>
                    </div>
                    <div data-testid="telemetry-verdicts">
                      <span style={{ fontSize: 'var(--fs-lg)', color: 'var(--ink)' }}>{telemetry.verdicts.count}</span>
                      <span style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)', marginLeft: 6 }}>verdicts council</span>
                    </div>
                  </div>
                  {Object.keys(telemetry.llm_calls.by_model).length > 0 && (
                    <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-2)', marginBottom: 4 }}>
                      par modèle : {Object.entries(telemetry.llm_calls.by_model).map(([m, v]) => m + ' (' + v.calls + ' appels, ' + v.tokens + ' tok)').join(' · ')}
                    </div>
                  )}
                  {telemetry.verdicts.count > 0 ? (
                    <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-2)', marginBottom: 4 }}>
                      verdicts : {Object.entries(telemetry.verdicts.distribution).map(([k, v]) => k + ':' + v).join(' · ')}
                    </div>
                  ) : (
                    <div style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)', marginBottom: 4 }}>0 verdict capturé — le corpus verdicts s'accumule au fil des audits council.</div>
                  )}
                  <div data-testid="telemetry-cost-label" style={{ fontSize: 'var(--fs-2xs)', color: 'var(--ink-3)', borderTop: '1px solid var(--line)', paddingTop: 6, marginTop: 4 }}>
                    « Coût » = tokens + durée réels. Modèle local (LM Studio) — coût monétaire nul ; le vrai coût est le temps et les tokens. Aucun tarif cloud projeté.
                  </div>
                </div>
              )}
```

- [ ] **Step 5 : Lancer — vérifier le succès (A/B/C/D/E)**

Run: `node telemetry-dashboard-validate.mjs`
Expected: PASS — toutes les sections vertes, `telemetry_dashboard.png` écrit. Ouvre le screenshot pour confirmer visuellement la section (tuiles + bannière + libellé coût).

- [ ] **Step 6 : Stager (commit groupé différé)**

```bash
git add llm-lego/builder.html llm-lego/telemetry-dashboard-validate.mjs llm-lego/telemetry_dashboard_validation_result.json llm-lego/telemetry_dashboard.png
```

---

### Task 4 : Régression complète + commit groupé (gate Pierre)

**Files:** aucun nouveau — validation d'ensemble + commit.

- [ ] **Step 1 : Régression — toute la suite `run-validators.mjs`**

Run: `node run-validators.mjs`
Expected: le nouveau `telemetry-dashboard-validate.mjs` est **auto-découvert** (glob `*-validate.mjs`) et vert ; **aucune régression** sur les autres suites (le compteur global reste ≥ l'existant, +1 validateur). Si une suite tombe rouge → diagnostiquer avant de continuer (ne jamais committer sur rouge).

- [ ] **Step 2 : Rapport 3-verdicts (obligatoire fin de charter)**

Rédiger le rapport :
```
software_verdict: OK|FAIL|BLOCKED   ← selon le résultat réel de run-validators.mjs
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

- [ ] **Step 3 : GATE PIERRE — demander le go commit**

Présenter à Pierre : fichiers touchés, preuve verte, screenshot. **Attendre le go explicite.** Aucun commit sans cette autorisation.

- [ ] **Step 4 : Commit groupé (design + implémentation) — SUR GO PIERRE UNIQUEMENT**

```bash
git add docs/superpowers/specs/2026-07-08-telemetry-dashboard-phase-3.5-design.md \
        docs/superpowers/plans/2026-07-08-telemetry-dashboard-phase-3.5.md \
        llm-lego/telemetry-read.mjs llm-lego/telemetry-dashboard-validate.mjs \
        llm-lego/telemetry_dashboard_validation_result.json llm-lego/telemetry_dashboard.png \
        llm-lego/demo-server.ts llm-lego/builder.html
git commit -m "feat(llm-lego): telemetry dashboard cout/tokens/verdicts — Phase 3.5 v0"
```
**Ne PAS push** — le push est une gate Pierre séparée et explicite.

- [ ] **Step 5 : Mémoire de fin de session**

Mettre à jour `studio_brain/00_CURRENT_CONTEXT.md` (nouvelle session, Phase 3.5 livrée) et ajouter un fait durable `memory/` (nouveau capteur d'affichage du board). Ne PAS re-numéroter : Phase 6 reste Evolution System dormant.

---

## Self-Review (effectué à l'écriture)

- **Spec coverage** : chaque exigence du design est couverte — module pur tolérant (Task 1), endpoint read-only (Task 2), section UI + coût honnête + bannière low-volume (Task 3), validateur module+endpoint+UI (réparti T1/T2/T3), régression + garde-fou numéro (Task 4). ✔
- **Écart assumé vs design** : les assertions exactes portent sur une **fixture** reproduisant le snapshot réel (4 lignes), pas sur le fichier live (volatile) — plus robuste, même valeurs (1416/989/427). ✔
- **Placeholders** : aucun TBD/TODO ; tout le code est fourni. ✔
- **Cohérence des types** : `buildTelemetry({ dir })` / champs `llm_calls.*`, `verdicts.*`, `corpus_state` identiques entre module, endpoint, UI et validateur ; `data-testid` (`telemetry-panel/-tokens/-cost-label/-accumulating`) identiques entre JSX (Task 3 Step 4) et preuve E (Task 3 Step 1). ✔
- **Compteur A/B/C** : 9 checks A + 5 B + 3 C = 17 → attendu `17 pass / 0 fail` (Task 1 Step 4). ✔
