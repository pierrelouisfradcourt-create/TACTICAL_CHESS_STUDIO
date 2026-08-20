# Planète étendue + Sélecteur calques + Confirmations — Implementation Plan

> **For agentic workers:** implement task-by-task, prove each with a real screenshot before claiming it works (leçon des 3 échecs calques). Steps use `- [ ]`.

**Goal:** Étendre la vue organique à tout nœud Agent (sphère centrale + orbite + fantômes cliquables), ajouter un sélecteur rapide de calques actifs, et poser une confirmation avant chaque suppression — le tout dans `llm-lego/builder.html`, régressions vertes.

**Architecture :** 3 chantiers indépendants sur un seul fichier React/Babel inline (`builder.html`). Réutilise les mécanismes déjà en place (OrganicScene, nodeAudit, activeLayerIds/applyLayers, deleteSelected/clearAll/deleteBrick/deleteEntry). Aucune touche à `src/`.

**Tech Stack :** React 18 UMD + Babel standalone (offline), SVG inline, Playwright validators (`*-validate.mjs`), vitest (moteur `src/`).

## Global Constraints (verbatim spec)

- `src/` (moteur) reste intact.
- La vue technique existante reste inchangée pour TOUS les types de nœuds.
- Chaque affirmation « ça marche » a un screenshot nommé associé.
- Pas de commit sans go explicite.
- Toutes les régressions précédentes restent vertes (`run-validators.mjs` → 617✅ actuellement ; vitest 46/46 ; A1 live PASS).

---

## Décisions de conception (verrouillées après Phase 0)

1. **Ghost-click destination (Chantier A.3) — TRANCHÉ PAR PIERRE : vrai sélecteur par satellite.** Résolution DRY : on **ajoute un sélecteur « Attacher une fiche (Bibliothèque) » à l'inspecteur `agent-component` de TOUS les satellites** (aujourd'hui seul `sortieAttendue` en a un via `outputformat`). Dès lors, le satellite vide en vue technique ET le fantôme en vue organique atteignent le MÊME sélecteur via `setSel(satId)` — aucune divergence, aucune logique dupliquée. Mapping satellite→kind : `objectif→goal`, `gardeFou→oracle`, `sortieAttendue→outputformat` (existant), `role/memoire/skill/plugin/modele→agent` (on tire le champ `payload[componentType]` d'une fiche agent, rendu en texte). Nouvelle fn `attachFicheToSatellite(satId, brickId)`. L'inspecteur (vue technique) GAGNE une fonctionnalité (le sélecteur) mais le rendu canvas de la vue technique reste inchangé.

2. **Sphère = nœud (Chantier A.1).** On garde le `<div className="node agent organic">` comme conteneur, mais `OrganicScene` est refondu : un **disque planète central** dessiné dans le SVG (le rectangle technique disparaît) + les créatures en **orbite** aux 8 angles canoniques (ordre `AGENT_COMPONENT_TYPES`, angle = −90° + i·45°). Le cours d'eau devient un **anneau atmosphérique** autour de la planète (saine = anneau cyan animé, polluée = anneau trouble brisé, asséchée = anneau pointillé fané). Réutilise `waterQuality`, `nodeAudit`, les dessins SVG de créatures existants (recentrés à l'origine).

3. **Confirmations = modale DOM, pas `window.confirm` (Chantier C).** Raison dure : `window.confirm` natif n'est PAS capturable en screenshot headless (exigence spec « screenshot de chaque confirmation »). On implémente une **modale DOM cohérente au thème** (`data-testid="confirm-modal"`, boutons `confirm-ok`/`confirm-cancel`). Test seam : `window.__autoConfirm` — si `true`, l'action s'exécute sans modale (les validators existants le posent en une ligne → régressions vertes sans re-scénariser chaque suppression). Par défaut `false` → l'utilisateur voit la modale.

---

## Task A — Vue organique étendue à tout agent (sphère + orbite + fantômes)

**Files:** Modify `builder.html` — `OrganicScene` (~L1136-1330), le calcul `isOrganicAgent` (~L1800), le rendu du nœud, CSS (~L195).

**Interfaces produites :**
- `AGENT_ORBIT` : positions/angles canoniques (dérivé de `AGENT_COMPONENT_TYPES`).
- `organicPresence(agent, nodes)` → pour chaque type : `{ mode: 'creature'|'ghost'|'absent', satId?, filled }`.
  - composite (`agentComponentsOf > 0`) : type présent+rempli → `creature` ; présent+vide → `ghost(satId)` ; (les 8 existent pour un +Agent).
  - withRole (0 satellite) : `role` si `data.role` → creature (pas de satId, non cliquable vers inspecteur satellite — clic sélectionne l'agent) ; `modele` si `data.model` → creature ; les 6 autres → `absent` (pas de fantôme).

- [ ] A1. Étendre `isOrganicAgent` à `organicView && n.type==='agent'` (composite OU withRole). Un agent sans role ni model ni satellite affiche quand même la sphère nue.
- [ ] A2. Refondre `OrganicScene` : disque planète central + orbite 8 angles + anneau d'eau. Créatures recentrées, échelle réduite (~0.7).
- [ ] A3. `organicPresence` : rendre creature / ghost (silhouette grise translucide de la créature précise, pas un symbole générique) / absent.
- [ ] A4. Clic créature composite → `setSel(satId)` (inchangé). Clic fantôme → `setSel(satId)` (ouvre l'inspecteur satellite = destination attache). Clic créature withRole → `setSel(agentId)` (inspecteur agent, où role/model s'éditent).
- [ ] A5. Preuves : screenshots `organic_ext_composite.png` (sphère+orbite 8), `organic_ext_withrole.png` (caméléon+arbre seuls), `organic_ext_ghost.png` (fantômes gris), `organic_ext_ghost_click.png` (inspecteur satellite ouvert).

## Task B — Sélecteur rapide de calques actifs (colonne gauche)

**Files:** Modify `builder.html` — panneau gauche sous la Palette (~L3660), CSS.

**Interfaces consommées :** `layers`, `activeLayerIds`, `setActiveLayerIds`, `applyLayers`, `layersReadOnly` (déjà dans App).

- [ ] B1. Panneau `data-testid="active-layers-quick"` listant uniquement `layers.filter(l => activeLayerIds.includes(l.id))`. Rendu SEULEMENT si `activeLayerIds.length >= 2` (sinon masqué : rien à désambiguïser).
- [ ] B2. Chaque entrée `data-testid="quick-layer-<id>"` cliquable → `setActiveLayerIds([id]); applyLayers([id])` → 1 seul actif → `layersReadOnly` false → édition restaurée.
- [ ] B3. Preuves : `layers_quick_2active.png` (2 listés), `layers_quick_isolated.png` (1 seul actif, bannière lecture-seule disparue).

## Task C — Confirmation avant suppression (modale DOM)

**Files:** Modify `builder.html` — nouvelle modale + hook `useConfirm`, brancher `clearAll`, `deleteSelected`, `deleteBrick`, `deleteEntry`. Modify les validators qui suppriment (poser `window.__autoConfirm=true`).

**Interfaces produites :** `requestConfirm(message): Promise<boolean>` (résolue par la modale ou immédiatement `true` si `window.__autoConfirm`).

- [ ] C1. Modale DOM au thème (`confirm-modal`, `confirm-message`, `confirm-ok`, `confirm-cancel`) + state `confirmState`. Seam `window.__autoConfirm`.
- [ ] C2. `clearAll` (poubelle 🗑️ canvas) → `if (await requestConfirm('Vider le canvas actif ? Cette action est irréversible.'))`.
- [ ] C3. `deleteSelected` → confirm « Supprimer cet élément ? Cette action est irréversible. » (couvre nœud/note/edge/composant).
- [ ] C4. `deleteBrick` + `deleteEntry` (Bibliothèque, tous kinds + Wire Map) → confirm « Supprimer cette fiche définitivement ? Cette action est irréversible. »
- [ ] C5. Patch validators existants qui suppriment/vident : ajouter `await page.addInitScript(() => window.__autoConfirm = true)` (une ligne). Set precise via grep : `btn-clear`, `lib-delete`, boutons `Supprimer` cliqués. (builder-validate ×5 btn-clear est le cas critique.)
- [ ] C6. Preuves : `confirm_canvas.png`, `confirm_node.png`, `confirm_brick.png` (modale affichée AVANT l'action) + test annulation (état avant == après).

## Régression & validation

- [ ] Nouveau `organic-ext-validate.mjs` (ou étendre `organic-validate.mjs`) : couvre A/B/C + annulation.
- [ ] `run-validators.mjs` (isolé) doit rester ✅ (auto-inclut le nouveau + patchés).
- [ ] `npm run test` (vitest) 46/46.
- [ ] `a1-live-retest.mjs` PASS (LM Studio :1234) — déjà `dialog accept`, ajouter `__autoConfirm` si besoin.
- [ ] Régression ciblée spec : double-run, Wire Map, Bibliothèque 11 kinds, HumanGate, Oracle self-val, carte d'identité (vue technique inchangée), calques (base inchangée), wiredStatus/brouillard, copier-coller, isolation, A1.

## Ordre d'exécution

C (confirmations + seam) d'abord — c'est le plus risqué pour les régressions ; le stabiliser tôt évite de re-déboguer A/B derrière. Puis B (isolé, faible risque). Puis A (le plus gros). Chaque tâche : build → screenshot → régression ciblée avant de passer à la suivante.
