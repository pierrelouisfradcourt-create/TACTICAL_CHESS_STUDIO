---
tags: [meta, reference, workflow]
---
# Brancher le vault en MCP (mémoire du studio)

But : rendre ce vault `studio_brain\` lisible/écrivable par l'assistant et les agents via MCP → la mémoire vivante du studio. Couvre **IMP-178** (OPEN, AUDIT_REQUIRED, P3).

État audité (2026-06-28) : le vault existe (markdown), mais **aucune infra MCP** n'est en place (pas de `.obsidian/`, pas de serveur MCP, rien dans `openclaw/`). Tout est à brancher.

> **✅ FAIT — 2026-07-05.** MCP filesystem branché sur **Claude Desktop** (véhicule réel, pas OpenClaw) pour DEUX racines : `studio-brain` (ce vault) + `studio-facts` (la mémoire machine `memory/`). **IMP-178 CLOSED.** Deux pièges Windows ont coûté cher — documentés ci-dessous : (1) install **Microsoft Store/MSIX** = chemin de config packagé, pas `%APPDATA%\Claude` ; (2) `"command": "npx"` échoue sans shell → wrapper **`cmd /c`**.

## Option 1 — MCP filesystem (recommandé, 30 min, sans app Obsidian)

Un serveur MCP filesystem pointé sur le vault. Pas besoin qu'Obsidian tourne.

> ⚠️ **CHEMIN CORRIGÉ (2026-07-05)** — l'install Claude Desktop ici est **Microsoft Store (MSIX)**.
> Le fichier lu par l'app n'est **PAS** `%APPDATA%\Claude\...` (ça, rien ne le lit → piège), mais le
> chemin **packagé** :
> `C:\Users\Studio-Dev\AppData\Local\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json`
> Le plus sûr : dans l'app → **Paramètres → Développeur → Modifier la config** (ouvre LE bon fichier).
> **Fusionner** dans `mcpServers` — ne pas écraser `preferences` / `coworkUserFilesPath`.

> ⚠️ **PIÈGE WINDOWS** — `"command": "npx"` échoue (Desktop lance sans shell, ne résout pas `npx.cmd`).
> Il **faut** le wrapper `cmd /c`, sinon aucun serveur ne se charge (« pas d'outil MCP »).

```json
{
  "mcpServers": {
    "studio-brain": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-filesystem", "C:\\TACTICAL_CHESS_STUDIO\\studio_brain"]
    },
    "studio-facts": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-filesystem", "C:\\Users\\Studio-Dev\\.claude\\projects\\C--TACTICAL-CHESS-STUDIO\\memory"]
    }
  }
}
```

Prérequis : **Node.js installé** (fournit `npx`). Après édition : **quitter COMPLÈTEMENT** Claude Desktop (systray → Quitter, pas juste fermer la fenêtre) puis relancer. Ensuite l'assistant obtient des outils fichier bornés à chaque racine → mémoire MCP réelle. Vérifié 2026-07-05 : `studio-brain` (3 outils) + `studio-facts` (2 outils) visibles.

Deux façons d'appliquer :
1. Coller le bloc toi-même (en fusionnant si le fichier existe).
2. Demander à **Claude Code** : « ajoute ce serveur MCP filesystem `studio-brain` à mon `claude_desktop_config.json` (fusionne, ne casse pas l'existant) » — il a l'accès à `AppData`.

Versionner le vault : `git` sur `studio_brain\` (ou plugin Obsidian Git) pour l'historique.

## Option 2 — Obsidian Local REST API + obsidian-mcp-server (plus riche)

Si tu veux l'accès graphe/recherche d'Obsidian aux agents : ouvrir `studio_brain\` dans l'app Obsidian (crée `.obsidian/`), installer le plugin **Local REST API** (génère un token), puis `obsidian-mcp-server` configuré avec le token. Plus de pièces mobiles, dépend de l'app Obsidian qui tourne. À garder pour plus tard si besoin.

## Fermeture IMP-178 — ✅ FAIT (2026-07-05)
Clos via `kaizen_loop.py close IMP-178 --session 2026-07-05`. Véhicule réel : **Claude Desktop MCP**
(filesystem) sur `studio-brain` + `studio-facts` — pas OpenClaw (l'acceptance d'origine parlait
d'OpenClaw, remplacé par Desktop, même intention). Vérifié : outils fichier visibles + lecture OK.

Voir [[vault-usage-guide]], [[studio-operating-flow]], [[skills-catalog]].
