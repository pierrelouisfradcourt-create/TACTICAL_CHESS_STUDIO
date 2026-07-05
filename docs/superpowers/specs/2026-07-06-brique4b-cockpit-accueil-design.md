# Brique 4b — Cockpit « Accueil » (single-pane)

- **Date** : 2026-07-06
- **Source** : brainstorming session Claude Code (Pierre + assistant), design + 3 amendements ratifiés ; exécution inline directe (spec → build).
- **Brique** : `4b` du chantier « TCS AI-OS » — dernière moitié de la brique 4 (interface pro). Dépend de 0/2/3a/4a — FAITES.

---

## 1. But

Une page d'**accueil** dans le builder qui montre l'état du studio d'un coup d'œil : ledger, lanes,
gates à décider, mémoire récente. La « vitre unique » de l'AI-OS. **Lecture seule.**

---

## 2. Décisions ratifiées

- 4 tuiles : **jauge ledger · lanes · gates/à-décider · mémoire récente**.
- **Accueil = onglet en tête** (🏠, à un clic). ~~vue de démarrage par défaut~~ : l'auto-défaut `home`
  masquait le canvas (overlay z-index 50) et cassait 10 validateurs Playwright canvas → **décision
  Pierre (2026-07-06) : garder `canvas` par défaut, l'oracle intact**. Accueil reste le 1ᵉʳ onglet.
- **A1 [anti-mensonge]** : (a) la preuve du validateur compare le **total parsé** au **comptage
  indépendant** des lignes `- id: IMP-` du *même* fichier — écart → **FAIL** (aucune constante figée,
  244/219 périment). (b) blocs malformés **ignorés → comptés** (`skipped:N`) + bandeau « parse partiel »
  dans l'UI. **Jamais d'ignorance silencieuse.**
- **A2** : `byLane` = lanes **réellement présentes** dans le ledger (dynamique), pas une liste en dur.
- **A3** : chemin ledger via env **`TCS_LEDGER_PATH`** (défaut = `lab/chains/IMPROVEMENT_LEDGER.yaml`).

---

## 3. Architecture

### 3.1 Module `llm-lego/cockpit.mjs`

`buildCockpit({ ledgerPath, roots }) → CockpitSummary` :
- **Parse ledger** (ligne-à-ligne, pas de lib) : un bloc IMP commence à une ligne `- id: IMP-…`.
  Pour chaque bloc, extraire `id`, `title`, `status`, `lane`. Un bloc **sans `status` exploitable**
  = **malformé → `skipped++`** (jamais compté dans les stats, mais reporté).
- **Invariant anti-mensonge** : `total (bien-formés) + skipped == nombre de lignes '- id: IMP-'`.
- Agrégats : `ledger = { total, closed, open, fail, skipped }` (total = bien-formés).
- `byLane` : **dynamique** — `{ [lane]: { open } }` pour chaque lane **rencontrée** (OPEN uniquement).
- `openImps` : `[{ id, title, status, lane }]` (status ≠ CLOSED).
- `recentNotes` : `listNotes(roots)` triées par `mtimeMs` desc, top 8 → `{ root, id, title, mtimeMs }`.
- Résilient : ledger absent/illisible → `{ ledger:{total:0,...,skipped:0}, byLane:{}, openImps:[], recentNotes:[…] }` (pas de crash).

### 3.2 Endpoint `GET /api/cockpit` (demo-server.ts)

`const LEDGER_PATH = process.env["TCS_LEDGER_PATH"] || path.join(__dirname, "..", "lab", "chains", "IMPROVEMENT_LEDGER.yaml")`.
`try { sendJson(200, buildCockpit({ ledgerPath: LEDGER_PATH, roots: MEM_ROOTS })) } catch { sendJson(500,{error}) }`.

### 3.3 UI — onglet « Accueil » (builder.html)

- Nouvel onglet **« 🏠 Accueil »** en tête de la barre ; `view` **initial = `'canvas'`** (Accueil à un clic — cf. décision §2).
- Vue `home` : 4 tuiles (tokens/composants 4a), fetch `/api/cockpit` au montage.
  - **Jauge ledger** : barre `closed/total`, compteurs `total · closed · open` + `fail` en badge `bad` si >0.
  - **Lanes** : pour chaque lane de `byLane`, `{lane} · {open} ouverts`.
  - **Gates / à décider** : `openImps` filtrés `lane ∈ {AUDIT_REQUIRED, HUMAN_REQUIRED}` **ou** `status==='FAIL'` → liste `id · title` (badge lane).
  - **Mémoire récente** : `recentNotes` → titres cliquables ; clic → ouvre la modale Mémoire.
- **Bandeau « ⚠ parse partiel : N blocs ignorés »** si `ledger.skipped > 0` (testid `cockpit-partial`).

---

## 4. Garde-fous

- **Lecture seule** : le cockpit ne modifie jamais le ledger (les IMP passent par `kaizen_loop.py`).
- **Anti-mensonge** (A1) : invariant `total+skipped == lignes '- id: IMP-'` ; skipped reporté + bandeau.
- **byLane dynamique** (A2) ; **chemin via env** (A3).
- Aucune lib. `src/` (Rust)/`llm-lego/src/` intacts. Modif : `demo-server.ts`, `builder.html` ; nouveaux `cockpit.mjs`, tests, validateur.

---

## 5. Preuve

- **Unit `cockpit.mjs`** (ledger temp) : parse `total/closed/open/fail` corrects ; **bloc malformé → `skipped=1`** ;
  **invariant** `total+skipped == count('- id: IMP-')` ; `byLane` ne contient que les lanes présentes ;
  ledger absent → structure vide sans crash.
- **Validateur `cockpit-validate.mjs`** (serveur + ledger temp + racines temp) : `/api/cockpit` renvoie la
  bonne forme ; **anti-mensonge DYNAMIQUE** : `body.ledger.total + body.ledger.skipped ===` (comptage
  indépendant des lignes `- id: IMP-` du fichier temp) — écart → FAIL.
- **UI (DOM)** : onglet Accueil = vue de démarrage ; 4 tuiles rendues (`cockpit-ledger`, `cockpit-lanes`,
  `cockpit-gates`, `cockpit-memory`) ; clic note → modale Mémoire ; bandeau partiel si skipped>0. Capture.
- **Non-régression** : `run-validators` + `vitest` verts ; Mémoire/graphe/cartes intacts.

Verdicts : `software_verdict: OK` · `evidence_verdict: INCLUDES_UX_VALIDATION` · `claim_verdict: NO_CLAIM_ALLOWED`.

---

## 6. Hors scope

Édition d'IMP depuis le cockpit ; état d'exécution de chaîne live ; télémétrie ; graphe codebase (3b).

---

## 7. Unités (exécution inline)

| U | Fait quoi | Prouvable |
|---|---|---|
| U1 | `cockpit.mjs` : parseLedger + buildCockpit (skipped, byLane dynamique, invariant) | unit (ledger temp) |
| U2 | endpoint `/api/cockpit` (env `TCS_LEDGER_PATH`) | curl |
| U3 | onglet Accueil + 4 tuiles + bandeau partiel + vue de démarrage | DOM |
| U4 | `cockpit-validate.mjs` (anti-mensonge dynamique) + non-régression | run-validators + vitest |
