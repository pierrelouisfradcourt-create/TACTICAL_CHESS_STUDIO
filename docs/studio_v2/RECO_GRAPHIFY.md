# Reco — Graphify (graphe de connaissances du dépôt)

*2026-06-29. Remplace l'ancienne reco Graphiti. Confusion levée : Graphify ≠ Graphiti — deux outils différents (voir « Graphify vs Graphiti » plus bas).*

## Ce que c'est
**Graphify** (safishamsi, MIT) = constructeur de **graphe de connaissances multi-modal** pour assistants de code (Claude Code, Codex, OpenCode, Cursor, Gemini CLI…). Il transforme un dépôt entier — code source, docs, PDFs, schémas SQL, scripts, images/diagrammes — en un **graphe interrogeable** qui explique le *quoi* (ce que fait le code) et le *pourquoi* (intention de design). Construit sur **Tree-sitter** (AST, call-graphs, docstrings — local, sans appel LLM) + **NetworkX** + clustering Leiden ; extraction sémantique de la prose et des diagrammes via LLM. ~58k★ GitHub, ~1.2M downloads PyPI (juin 2026).

## Pourquoi pour CE projet
Notre audit récurrent dit *« surface affichée > surface câblée »* (nav topologie morte, orphelins, docs qui dérivent du code réel). Un graphe code↔docs↔diagrammes attaque exactement ce problème : ce qui est **câblé** vs ce qui est seulement **écrit**. Et notre monorepo est large/hétérogène (Rust `src/` + `ml/` + `lab/` + `autopilot.py` ~5200 lignes + dizaines de charters/IMP) → un graphe aide l'assistant à naviguer.

## L'angle coût — honnête
- **Code seul = 100 % offline, zéro coût.** Tree-sitter en local, aucune clé API requise pour parser le code.
- **Docs/PDFs/images = LLM requis.** Routable vers un modèle local : `OLLAMA_BASE_URL` (ou endpoint OpenAI-compatible). → **viser notre Qwen local (LM Studio, port 1234)** pour rester à coût ≈ 0. *À vérifier* : compatibilité exacte LM Studio (OpenAI-compatible) vs le backend Ollama attendu par Graphify.
- **Stockage : JSON** (`graph.json`) — **pas de base, pas de Docker** par défaut. (Push Neo4j/FalkorDB optionnel, non requis.)

## Graphify vs Graphiti — ne pas confondre
| | **Graphify** (safishamsi) | **Graphiti** (getzep) |
|---|---|---|
| Rôle | Comprendre **le code** : graphe du dépôt | **Mémoire d'agent** temporelle (faits bi-temporels) |
| Entrée | Le dépôt (code + docs + diagrammes) | Les loops/conversations dans le temps |
| Backend | NetworkX + JSON (léger, en-process) | FalkorDB/Neo4j (Docker) + ingestion LLM continue |
| Engagement infra | Faible (offline pour le code) | Lourd (DB + ingestion permanente) |

Conclusion : pour notre besoin *navigation/vérité code-vs-docs*, **Graphify est le bon choix maintenant** ; il est plus léger que Graphiti et ne demande pas d'infra avant le revenu. Graphiti (mémoire temporelle du loop) reste une idée séparée, plus tard, si on veut une vraie mémoire causale du pipeline.

## Installation & usage (réf. exacte)
Package PyPI : `graphifyy` (double y) ; commande : `graphify`.
1. `uv tool install graphifyy` (ou `pipx install graphifyy` / `pip install graphifyy`).
2. `graphify install --project` → enregistre le skill Claude Code **scoped au projet** → invocable via `/graphify .`.
3. (Code seul) aucune clé API. (Docs/images) exporter une clé OU pointer un modèle local (`OLLAMA_BASE_URL`).
4. Commandes :
   - `/graphify .` — construit le graphe du dossier courant
   - `/graphify . --update` — re-extrait seulement les fichiers changés
   - `/graphify query "qu'est-ce qui relie auth à la DB ?"`
   - `/graphify path "ServiceA" "ServiceB"` — plus court chemin
   - `graphify export callflow-html` — diagrammes d'architecture
   - `graphify hook install` — rebuild auto au commit git
5. Sortie : `graphify-out/` (`graph.json`, `GRAPH_REPORT.md`, `graph.html`).

## Séquençage (honnête)
P3, pas un bloqueur — mais **faible coût** et **utilité immédiate** pour naviguer le monorepo. Raisonnable de tester un premier `/graphify .` code-seul (offline) sans attendre, puis décider si on branche l'extraction docs sur Qwen local.

Sources : [github.com/safishamsi/graphify](https://github.com/safishamsi/graphify) · [graphify.net](https://graphify.net/).
