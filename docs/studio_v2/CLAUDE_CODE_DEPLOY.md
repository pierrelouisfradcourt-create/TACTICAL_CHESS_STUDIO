# À EXÉCUTER PAR CLAUDE CODE — déploiement mémoire + cockpit live

*Pierre : ouvre Claude Code dans `C:\TACTICAL_CHESS_STUDIO` et colle : « applique `docs/studio_v2/CLAUDE_CODE_DEPLOY.md` étape par étape, montre-moi chaque diff avant d'écrire, ne casse pas l'existant ». Tout est réversible (config + 1 endpoint).*

Cowork ne peut pas toucher `%APPDATA%\Claude\` ni piloter Claude Code → c'est CC qui exécute. 4 étapes, indépendantes.

---

## Étape 1 — Cockpit live : endpoint `/api/projects`
Appliquer le patch décrit dans `docs/studio_v2/PATCH_api_projects.md` à `autopilot.py` :
- Ajouter un handler `GET /api/projects` qui lit `studio_state/projects.json` et le renvoie (avec `Access-Control-Allow-Origin: *`, via le `send_json()` existant).
- Insertion : dans `do_GET`, entre le bloc `/api/ideas` et le bloc `/ws/terminal/` (~ligne 7325). `json` est déjà importé.
- **Vérif :** `curl http://localhost:7331/api/projects` renvoie le tableau JSON des jeux (Snake Survivor + autres). Le Build Board du cockpit affiche alors les jeux en live (multi-jeux).

## Étape 2 — Mémoire vivante : MCP filesystem sur le vault
Éditer `%APPDATA%\Claude\claude_desktop_config.json` (= `C:\Users\Studio-Dev\AppData\Roaming\Claude\claude_desktop_config.json`). **Fusionner** (ne pas écraser) dans `mcpServers` :
```json
{
  "mcpServers": {
    "studio-brain": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\TACTICAL_CHESS_STUDIO\\studio_brain"]
    }
  }
}
```
- Prérequis : Node.js installé (`npx`).
- **Vérif :** après redémarrage de Claude Desktop, l'assistant peut lire/écrire une note de `studio_brain\`. → ferme **IMP-178** via `kaizen_loop.py` (pas à la main).

## Étape 3 — Réutiliser les 2 pièces OpenClaw (cf. `RECO_OPENCLAW.md`)
Dans `start_studio.ps1`, s'assurer que démarrent **claude_proxy.py** (port 8765 — Claude avec accès repo, sans API payante) et **canvas_gateway.py** (port 8766 — gate signée HMAC + SSE). Ce sont les 2 seules pièces OpenClaw à valeur immédiate ; l'orchestrateur :18789 reste différé.
- **Vérif :** `curl http://localhost:8765/health` et `:8766` répondent.

## Étape 4 — (optionnel) auto-mémoire des loops
Planifier `scripts/loop_memory_hook.py` (déjà écrit) pour append chaque IMP/loop fermé dans `studio_brain/state/loops-log.md`. Le brancher sur l'auto-close watcher d'autopilot, ou en tâche.

---

## Ce que ça donne, une fois fait
- Le **cockpit** (`studio_v2_ux/studio_cockpit.html`) devient l'**UX unique vivante** : Build Board multi-jeux en live, Memory Graph (vault), Loops, contrôle studio.
- La **mémoire** est branchée en MCP (lecture/écriture du vault par les agents) → complémentaire de Graphify (graphe du dépôt) plus tard (cf. `RECO_GRAPHIFY.md`).
- Les 2 pièces OpenClaw utiles tournent ; le reste différé.

Gates Pierre : merge sur master, dépense, et le team.yaml (fusion des champs de l'upload) restent ton OK explicite.
