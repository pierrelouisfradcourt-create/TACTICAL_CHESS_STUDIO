# Contexte courant TCS
Dernière session : 2026-07-05 (marathon — chantier « AI-OS »). Contexte pré-2026-07-05
archivé : `journal/context-archive-2026-07-05.md`.

## Chantier AI-OS — 6 livraisons du jour (toutes prouvées, committées, NON poussées)

Décomposition : brique 0 (CT-4 mémoire) → 1 (Obsidian/MCP) → 2 (recall) → 3 (graphe) → 4 (interface pro).

1. **CT-4 (brique 0) — couche d'accès mémoire** — commit `850a575` (+ hygiène MCP `462028f`).
   « 2 racines, 2 faces » : `studio_brain/` (vault humain) + `memory/` (faits machine) exposés via
   face HTTP `/api/memory` dans `demo-server.ts` + vue « 🧠 Mémoire » dans le builder. Garde-fous
   (brain lecture seule 403, anti-traversée). Spec/plan : `docs/superpowers/{specs,plans}/2026-07-05-ct4-*`.
2. **Brique 1 (MCP) — moitié faite** — `studio-brain` + `studio-facts` branchés dans **Claude Desktop
   (install Microsoft Store/MSIX)**. Config au chemin packagé `…\Packages\Claude_pzs8sxrjxfjjc\LocalCache\
   Roaming\Claude\claude_desktop_config.json` (PAS `%APPDATA%\Claude`) + wrapper `cmd /c npx` (piège
   Windows). **IMP-178 CLOSED**. `mcp-setup.md` corrigé. Reste de la brique 1 (app Obsidian graphe/recherche) non fait.
3. **Brique 2 — recall sémantique** — commit `238c08f` (spec `399c547`). `memory-recall.mjs` :
   embeddings **LM Studio nomic-embed** (local), index incrémental atomique `.memory-index.json`
   (gitignoré), `search?mode=semantic` **fail-soft** → mot-clé si embeddings indispo. Toggle
   mot-clé/sémantique dans la vue Mémoire. E2E prouvé (nomic chargé).
4. **Brique 3a — graphe mémoire (vault)** — commits `01938ec` + `55b0e80`. `memory-store` **récursif**
   (ids `root/relpath`, archive `journal/` exclue partout) → graphe+recherche+recall voient les mêmes
   notes. `memory-graph.mjs` (wikilinks → nœuds/arêtes, résolution déterministe, hygiène). Vue
   `MemoryGraph` force-directed SVG maison + toggle liste|graphe.
5. **Brique 4a — système de design** — commit `a8ee5ff`. Tokens CSS (`:root`), palette sémantique,
   `--font-sans`/`--font-mono`, composant `Badge({dim,value})` : 4 dimensions statut GARDÉES
   (provenance/maturité/câblage/suivi), unifiées par palette + glyphe (résout la collision de couleur).
   body → sans, mono réservé code/IDs.
6. **Brique 4c — cartes de nœud + onboarding** — commit `5493412`. Cartes dégagées (titre = label
   humain, `n.id` en sous-titre, aperçu prompt + chips ; `producerRef`/clés internes → section
   « Technique » de l'inspecteur, retirés de la carte). Empty-state pédagogique centré (raccourcis
   exemples via `window.__loadExample`). Tooltips sur les briques de la palette.

**Brique 4 (interface pro) : 4a + 4c faites ; reste 4b (cockpit accueil).**

**Régression finale** : `run-validators.mjs` ✅758 ❌0 (36 validateurs) · `vitest` 80 ✅.

## Prochaines options (à trancher À FROID)
- **4b** — cockpit « Accueil » single-pane (lanes + ledger + mémoire + gates d'un coup d'œil). **Dernière moitié de la brique 4.**
- **3b** — graphe **codebase** Graphify (rebrancher le graphe de tout le code, 17 Mo, vis-network). Chantier infra distinct.
- Brique 5 — capture vocale/rapide → mémoire (YAGNI pour l'instant).
Specs+plans faits pour CT-4/2/3a ; specs faits pour 4a/4c ; 4b/3b = cadrage→spec→plan à faire.

## Flags ouverts
- **Rien poussé** : tous les commits du jour sont **locaux** (gate push Pierre). ~10 commits depuis `57fefb4` (jusqu'à `5493412` + ce handoff).
- **Recall sémantique** : nécessite `nomic-embed` **chargé** dans LM Studio ; sinon fail-soft mot-clé (jamais cassé).
- **Vue unique mémoire** : `search?mode=keyword` renvoie désormais + de notes (sous-dossiers `brain`) — VOULU (A1), pas une régression.
- MCP Desktop = **lecture+écriture** (le serveur filesystem n'a pas le garde-fou brain-lecture-seule ; celui-ci ne vaut que sur la face HTTP).

## Point d'entretien — hooks (candidat IMP mineur)
Pierre a signalé « Stop hook échoue : `.claude/hooks/stop-failure.sh` introuvable ». **Réalité disque
2026-07-05 : le script EST présent et exécutable** (`-rwxr-xr-x`, 2336 o), câblé en Stop hook
(`bash .claude/hooks/stop-failure.sh`), et **tous** les hooks référencés existent. Donc « introuvable »
contredit le disque → si le Stop hook échoue, cause probable = **invocation `bash` sous Windows** (le
harness lance peut-être les hooks via un shell sans `bash` au PATH), pas un fichier manquant. IMP
mineur = **diagnostiquer la vraie cause** (exécution `bash` Windows) plutôt que « restaurer un script absent ».

## Impasses toujours valides (portées depuis l'archive)
- `train.py` : NE PAS relancer avant IMP-163 (dataset) + IMP-184 (deploy gate). Boucle autonome idem.
- LEDGER canonique = `lab/chains/IMPROVEMENT_LEDGER.yaml` (PAS la racine).
- `start_studio.ps1` (PowerShell) fonctionne ; `start_studio.sh` (bash) = networking WSL↔Windows cassé.
- Serveur demo llm-lego : `node demo-server.ts` sur :3000 (sert `/builder` + `/api/memory*`).

## Doctrine rappels
- Une variable à la fois · fondations avant features · aucun commit/push sans go explicite Pierre.
