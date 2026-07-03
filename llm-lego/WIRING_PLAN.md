# WIRING_PLAN — Câbler le builder visuel sur le moteur réel

## Cas retenu : **(B) — Builder inexistant, à créer from scratch, câblé moteur dès le départ**

### Preuve de l'inventaire (Phase 0)
- `llm-lego/demo.html` existe mais c'est un **éditeur JSON texte** (2 `<textarea>`), pas
  un builder visuel : aucun drag/drop, aucun dessin d'edges, aucun `NODE_TYPES` /
  `draggingNodeId` / `getNodeStyles`. Il appelle déjà `/api/execute` (bon précédent).
- Recherche repo entière (`runSimulation`, `draggingNodeId`, `drawingFromNodeId`,
  `getNodeStyles`, `NODE_TYPES`) → **0 résultat**. Aucun `.jsx`/`.tsx` dans `llm-lego`.
- Aucun builder dans l'historique git ni dans `lego.zip` (3 fichiers : demo-server.ts,
  demo.html, DEMO_README.md).
- **Aucune `runSimulation()` fake à remplacer** : il n'y a rien. Donc on crée un builder
  visuel neuf, branché directement sur `POST /api/execute` (pas de simulation interne).

### Chemin du builder
`llm-lego/builder.html` — fichier unique auto-contenu.

### Choix de structure (important — justifié)
- **React 18 UMD + Babel Standalone vendorés en local** dans `node_modules/`
  (`react/umd/react.development.js`, `react-dom/umd/react-dom.development.js`,
  `@babel/standalone/babel.min.js`), installés via `npm install --no-save`.
  → Honore l'exigence « composant React » (useState, JSX) **sans réseau au runtime**
    (offline-capable, valeur clé du studio). Pas de CDN, pas de build Vite séparé.
- Le builder est **servi par le serveur moteur existant** (`demo-server.ts`), via deux
  nouvelles routes GET statiques : `/builder` (la page) + `/vendor/*` (les 3 libs UMD).
  → builder et moteur sur le **même origin** `http://localhost:3000` : pas de souci CORS,
    un seul process à lancer. `fetch('/api/execute')` en relatif.
- **Pourquoi pas Vite/projet séparé** : surcoût (dev server, HMR, bundling) inutile pour
  un seul composant ; un fichier servi par le moteur prouve le câblage HTTP plus
  directement et reste dans l'esprit « offline, pas de fichiers tmp qui traînent ».

### Contrat moteur (lu dans le code, source de vérité)
- `Graph = { nodes: {id,type,data}[], edges: {id,from,to,condition?}[] }`
  (`src/core/types.ts`).
- 4 `NodeType` : `llm | tool | agent | router` (`types.ts:8`).
- Invariants validés moteur (`engine.ts:findStartNode`, `scheduler.ts:validateGraph`) :
  1. **exactement un nœud de départ** (0 edge entrante) sinon 400.
  2. **un seul edge sortant** pour tout nœud **non-router** sinon 400.
  3. edge vers un id inexistant → 400.
  → Le builder doit afficher ces 400 lisiblement, pas planter.
- Router : `data.path` (ex `nodes.node-analyzer.intent`) + `data.defaultRoute` ; les edges
  router portent `condition` (matchée contre le `routeKey`). `exact-match` /
  `default-fallback` / `first-edge-fallback` (`scheduler.ts`).
- Réponse `/api/execute` : `{ success, state, trace[] }` ; `trace[i]` =
  `{ nodeId, nodeType, durationMs, routingDecision?, error? }`. Si invalide :
  `{ success:false, error }` en HTTP 400 (`demo-server.ts`).
- Classifieur démo (`demo-server.ts`) : `llm` mock = heuristique mots-clés ; un `query`
  contenant find/search/news/info/latest/... → `intent:"search"`, sinon `"chat"`.

## Travail (Phases 1–3)
1. **`builder.html`** : canvas SVG, 4 types de nœuds drag/drop, dessin d'edges à la
   souris (handle → handle), panneau inspecteur (édite `data` + `condition` d'edge),
   panneau input JSON, bouton Exécuter, affichage **state + trace réels**.
2. **`toEngineGraph(uiNodes, uiEdges)`** : drop positions/styles, garde `id/type/data` ;
   edges → `{id,from,to,condition?}` (condition seulement si non vide). Robuste aux
   champs optionnels manquants. Testée isolément (oracle node).
3. **Appel réel** `POST /api/execute` ; gestion `success:false` → bandeau d'erreur.
4. **`demo-server.ts`** : routes `/builder` et `/vendor/*` (lecture statique, garde
   anti path-traversal).
5. **Playwright double-run** (`builder-validate.mjs`) : graphe analyzer→router→search|chat
   chargé via bouton « Exemple », run `search` (query « Search for climate news ») →
   trace montre `node-search` + `reason: exact-match` ; run `chat` (query « Tell me a
   story about a cat ») → trace bascule `node-chat`. 2 screenshots.

## Hors scope (non implémenté) : persistance disque, vrais LLM, bibliothèque de briques,
zoom/pan, auth/multi-user/déploiement.
