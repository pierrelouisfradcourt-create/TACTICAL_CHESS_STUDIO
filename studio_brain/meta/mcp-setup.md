---
tags: [meta, reference, workflow]
---
# Brancher le vault en MCP (mémoire du studio)

But : rendre ce vault `studio_brain\` lisible/écrivable par l'assistant et les agents via MCP → la mémoire vivante du studio. Couvre **IMP-178** (OPEN, AUDIT_REQUIRED, P3).

État audité (2026-06-28) : le vault existe (markdown), mais **aucune infra MCP** n'est en place (pas de `.obsidian/`, pas de serveur MCP, rien dans `openclaw/`). Tout est à brancher.

## Option 1 — MCP filesystem (recommandé, 30 min, sans app Obsidian)

Un serveur MCP filesystem pointé sur le vault. Pas besoin qu'Obsidian tourne.

Fichier à éditer : `C:\Users\Studio-Dev\AppData\Roaming\Claude\claude_desktop_config.json`
(= `%APPDATA%\Claude\claude_desktop_config.json`). S'il existe déjà, **fusionner** la clé `studio-brain` dans `mcpServers` existant — ne pas écraser le reste.

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

Prérequis : **Node.js installé** (fournit `npx`). Après édition : **redémarrer Claude Desktop**. Ensuite l'assistant obtient des outils read/write limités à `studio_brain\` → mémoire MCP réelle.

Deux façons d'appliquer :
1. Coller le bloc toi-même (en fusionnant si le fichier existe).
2. Demander à **Claude Code** : « ajoute ce serveur MCP filesystem `studio-brain` à mon `claude_desktop_config.json` (fusionne, ne casse pas l'existant) » — il a l'accès à `AppData`.

Versionner le vault : `git` sur `studio_brain\` (ou plugin Obsidian Git) pour l'historique.

## Option 2 — Obsidian Local REST API + obsidian-mcp-server (plus riche)

Si tu veux l'accès graphe/recherche d'Obsidian aux agents : ouvrir `studio_brain\` dans l'app Obsidian (crée `.obsidian/`), installer le plugin **Local REST API** (génère un token), puis `obsidian-mcp-server` configuré avec le token. Plus de pièces mobiles, dépend de l'app Obsidian qui tourne. À garder pour plus tard si besoin.

## Fermeture IMP-178
Une fois Option 1 appliquée + vérifiée (l'assistant lit/écrit une note du vault via MCP), clore IMP-178 via `kaizen_loop.py` (ne jamais éditer le ledger à la main).

Voir [[vault-usage-guide]], [[studio-operating-flow]], [[skills-catalog]].
