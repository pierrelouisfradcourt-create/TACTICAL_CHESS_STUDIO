# Architecture — System Vision
#architecture #reference

> Vue d'ensemble de l'architecture unifiée du Tactical Chess Studio.
> Le Studio Cockpit est le point d'entrée unique ("single pane of glass") qui relie tous les sous-systèmes.
> Date de création : 2026-06-28

---

## Vue macro — 5 sous-systèmes connectés

```
                    ┌───────────────────────────────┐
                    │     STUDIO COCKPIT             │
                    │  studio_v2_ux/studio_cockpit.html │
                    │  Single pane of glass          │
                    │  offline-capable               │
                    └──────────────┬────────────────┘
                                   │ polls (3s timeout, graceful degradation)
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
     ──────▼──────          ───────▼──────         ────────▼──────
    │  AUTOPILOT  │        │  OPENCLAW   │        │ LM STUDIO    │
    │  :7331      │        │  :18789     │        │ :1234        │
    │  autopilot.py│        │  local svc  │        │ Qwen2.5-14B  │
     ─────────────          ─────────────          ──────────────
           │                                              ▲
           └──────────────────────────────────────────────┘
           (autopilot.py → /v1/chat/completions)
                                   │
                    ┌──────────────▼──────────────┐
                    │   OBSIDIAN VAULT             │
                    │   studio_brain/              │
                    │   MCP filesystem (IMP-178)   │
                    └─────────────────────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │   GAMES PORTFOLIO            │
                    │   Snake: Survivor (Playtest) │
                    │   Chess Blitz (Patch)        │
                    │   Hex Survivors (Assets)     │
                    │   Dungeon Draft (Published)  │
                    └─────────────────────────────┘
```

---

## Les 5 sous-systèmes

### 1. Autopilot (Lane STUDIO)
- **Fichier** : `autopilot.py` (~5200 lignes)
- **Port** : 7331
- **Rôle** : serveur Flask — UI studio + API kaizen/CEO/lane-assignment
- **Modèle** : Qwen2.5-14B via LM Studio local
- **Endpoints clés** : `/api/health`, `/api/ledger-status`, `/api/metrics`, `/api/ceo-lane-assignment`, `/api/ceo-brief`
- **Contrainte** : Qwen3.6 INTERDIT pour JSON (thinking mode vide le content)

### 2. OpenClaw
- **Port** : 18789
- **Rôle** : service local — détection de présence via GET /
- **Intégration cockpit** : poll simple, tout 2xx = online

### 3. LM Studio — Qwen2.5-14B
- **Port** : 1234
- **API** : compatible OpenAI (`/v1/models`, `/v1/chat/completions`)
- **Rôle** : inférence gratuite locale — cœur de l'IA invisible
- **Contrainte absolue** : pas d'API Anthropic externe — Qwen local = gratuit, critique en bootstrap < 2k€

### 4. Obsidian Vault (`studio_brain/`)
- **MCP** : `server-filesystem` pointé sur `studio_brain/` (voir [[meta/mcp-setup]])
- **Rôle** : mémoire persistante entre sessions — doctrine, décisions, projets, state
- **Cockpit** : graphe de connaissance interactif (vis-network, force-directed, embedded dataset)
- **Statut** : toujours disponible offline (données embarquées dans le cockpit)

### 5. Games Portfolio
- Géré via le **Build Board** du cockpit (kanban Idea → Published)
- Lane ROCKY_MOTEUR (`src/chess/`) : moteur Rust, validation `cargo build --release && cargo test`
- Lane JEUX (`lab/chess_fantasy/`) : tests `.venv312\Scripts\python.exe -m pytest`
- Titre 1 : [[projects/snake-survivor-genesis]] — Snake: Survivor RPG — Genesis

---

## Principes d'architecture

### Single Pane of Glass
Le cockpit ne remplace pas les outils — il les expose dans une interface unifiée :
- Status pills top-bar : poll 3 services avec `AbortController` 3s timeout
- Dégradation gracieuse : chaque service offline → pill grise, données mock
- Graph vault + Build Board : **toujours rendus offline** (données statiques embarquées)

### Séparation intentionnelle CEO
- `/api/ceo-lane-assignment` : algorithmique pur, déterministe, lecture seule LEDGER, pas d'inférence LM
- `/api/ceo-brief` : appel LM, narrative uniquement
- **Ne jamais fusionner** ces deux systèmes sans HumanGate Pierre

### HumanGate sur l'irréversible
Le cockpit **propose et affiche** — il ne décide pas.
Pierre seul : merge, publish, dépenser, changer la doctrine.

---

## Flux de données (runtime)

```
Pierre (intention)
  → Cockpit (orchestre, visualise)
    → Autopilot API (ledger, métriques, CEO)
      → LM Studio (inférence Qwen2.5-14B)
    → OpenClaw (service local)
    → Vault (mémoire statique + MCP live si branché)
  → Build Board (état des jeux, actions)
  → Memory Graph (exploration du vault)
→ HumanGate (irréversible)
```

---

## Fichiers clés

| Fichier | Rôle |
|---|---|
| `studio_v2_ux/studio_cockpit.html` | Le cockpit — ce fichier est l'entrée |
| `autopilot.py` | Backend Flask, ~5200 lignes |
| `studio_brain/` | Vault Obsidian — mémoire du studio |
| `lab/chains/IMPROVEMENT_LEDGER.yaml` | Ledger IMP — source de vérité backlog |
| `src/chess/` | Moteur Rocky (Rust) |
| `games/snake_survivor/` | Titre 1 (Godot 4) |

---

## Liens
- [[../000_HOME|Home MOC]]
- [[../doctrine/studio-doctrine|Studio Doctrine]]
- [[../workflow/studio-operating-flow|Studio Operating Flow]]
- [[../meta/mcp-setup|MCP Setup (IMP-178)]]
- [[../projects/snake-survivor-genesis|Snake: Survivor RPG — Genesis]]
- [[../reference/sources-of-truth|Sources de Vérité]]
