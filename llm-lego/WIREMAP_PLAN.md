# WIREMAP_PLAN — onglet Wire Map (traçabilité projet)

## Phase 0 — Inventaire (réponses)

1. **Système d'onglets ?** NON. `builder.html` a une toolbar plate (boutons routing /
   Council / grille / clear / Exécuter) et une grille body `160px 1fr 350px`
   (palette | canvas | inspecteur). J'ajoute un état `view: 'canvas' | 'wiremap'` +
   deux boutons onglet `[Canvas] [Wire Map]` dans la toolbar.

2. **Routes de lecture de fichiers dans demo-server.ts ?** NON. Serveur `http` brut,
   routes exactes (`/`, `/builder`, `/vendor/*`, `POST /api/execute`), pas de parsing
   de query-string. À AJOUTER :
   - `GET  /api/wireframes` → liste `wireframes/*.json` → `[{id,name}]`
   - `GET  /api/wireframes/:id` → lit `wireframes/{id}.json`
   - `POST /api/wireframes/:id` → écrit `wireframes/{id}.json` (data, PAS source)
   - `GET  /api/repo/files?root=&ext=` → liste fichiers (exclut node_modules/dist)
   - `GET  /api/repo/file?path=` → lit un fichier — **garde anti path-traversal**
     (resolve sous `__dirname`, sinon 403)
   - `GET  /api/repo/tests?project=` → best-effort `vitest run --reporter=json`
     (timeout, catch → `{available:false}`)
   Refactor : parser `new URL(req.url,'http://x')` une fois pour pathname + query.

3. **Stockage wireframes ?** `llm-lego/wireframes/{id}.json` (un fichier par projet),
   servi par les routes ci-dessus. `wireframes/llm-lego.json` seedé (8 entrées) = la
   première Wire Map, celle qui cartographie le builder lui-même.

4. **Nœuds du canvas en mémoire React ?** état `nodes` = `[{id,type,x,y,width?,height?,
   data}]`, exposé `window.__ui={nodes,edges}`. Lien Wire Map : `entry.nodeId === node.id`.

## Choix d'affichage (documenté)
**Côte à côte**, pas de remplacement : en mode `wiremap`, la grille body devient
`160px 1fr 640px` = palette | **canvas conservé** | panneau Wire Map (à la place de
l'inspecteur, élargi). Raison : le lien bidirectionnel canvas↔Wire Map exige que les
DEUX soient visibles (sélectionner un nœud sur le canvas surligne sa ligne ; cliquer
« Nœud canvas » sélectionne le nœud visible). Le panneau Wire Map scrolle
horizontalement pour les 11 colonnes.

## Modèle de données : cf. prompt (`project` + `entries[]`).
Statuts : PASS/FAIL/PENDING/HUMAN_REQUIRED/SKIP + couleur libre. Couleur du test =
bordure du nœud canvas (bidirectionnel). `humanRequired` bloque le passage auto en PASS.

## Contraintes respectées
- `/api/repo/file` READ-ONLY + garde path-traversal (test #10).
- `src/` intact, moteur inchangé → double-run search/chat reste vert.
- **PAS d'appel API Anthropic externe** (interdit CLAUDE.md) : l'« Audit » génère un
  rapport markdown déterministe local ; la « Recommandation » est une heuristique locale
  (pas de LLM). Documenté comme hors-scope l'appel LLM réel.

## Plan d'implémentation
1. demo-server.ts : URL parsing + 6 routes + garde sécurité.
2. wireframes/llm-lego.json seed (8 entrées).
3. builder.html : onglets, panneau Wire Map (sélecteur projet + modal nouveau projet,
   table 11 colonnes, add-entry inline, color picker, bordure nœud, surbrillance ligne,
   clic Nœud canvas, MAJ statut post-exécution, bouton Audit + rapport).
4. builder-validate.mjs : +10 checks (scénarios 1–10).
