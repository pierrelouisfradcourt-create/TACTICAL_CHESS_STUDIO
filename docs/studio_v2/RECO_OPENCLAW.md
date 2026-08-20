# RECO_OPENCLAW.md — Recommandation: garder / importer / jeter

**Date**: 2026-06-28
**Scope**: OpenClaw assets vs autopilot.py — décision d'architecture
**claim_verdict**: NO_CLAIM_ALLOWED

---

## 1. État réel du repo (ce qui existe vs ce qui manque)

### Ce qui EST dans le repo

| Fichier | Statut | Réel ou aspirationnel |
|---|---|---|
| `studio/openclaw-workspace/openclaw-team.yaml` | PRÉSENT (v3.2 repo) | Réel — syntaxe opérationnelle, providers pointant vers services réels |
| `studio/openclaw-workspace/AGENTS.md` | PRÉSENT | Réel — roster + invariants |
| `studio/openclaw-workspace/TOOLS.md` | PRÉSENT | Réel — routing providers/skills |
| `studio/openclaw-workspace/BOOTSTRAP.md` | PRÉSENT | Réel — system prompt @producteur_dur |
| `studio/openclaw-workspace/MEMORY.md` | PRÉSENT | Réel — métriques sync oracle |
| `studio/openclaw-workspace/skills/*.md` | PRÉSENT (28 skills) | Réel — skill definitions |
| `studio/openclaw-workspace/coordinateur/SOUL.md` | PRÉSENT | Réel |
| `studio/openclaw-workspace/producteur_dur/SOUL.md` | PRÉSENT | Réel |
| `studio/openclaw-workspace/producteur_routine/SOUL.md` | PRÉSENT | Réel |
| `studio/openclaw-workspace/council/SOUL.md` | PRÉSENT | Réel |
| `scripts/claude_proxy.py` | PRÉSENT, 263 lignes | **Réel et fonctionnel** — FastAPI + `claude --print`, port 8765 |
| `scripts/canvas_gateway.py` | PRÉSENT, 243 lignes | **Réel et fonctionnel** — FastAPI HMAC gate, port 8766 |
| `openclaw/capabilities.yaml` | PRÉSENT | Réel — registre modèles/skills |
| `openclaw/providers.yaml` | PRÉSENT | Réel — endpoints + healthchecks |
| `openclaw.json` | PRÉSENT | Non inspecté (config OpenClaw binary) |

### Ce qui est ABSENT du repo

| Élément | Où ça devrait être | Impact |
|---|---|---|
| `studio/openclaw-workspace/openclaw-team.yaml` est la version **repo** | Le fichier uploadé (`openclaw-team-1.yaml.txt`) est une **variante illustrative** avec champs `surface:`, `tiers:`, `orchestration:`, `disciplines:` absents du repo | Les deux sont v3.2 mais schémas divergents — l'upload est plus illustratif (marqué "ILLUSTRATIF"), le repo est plus opérationnel |
| `~/.openclaw/` (WSL) | Hors repo — à déployer manuellement depuis `/openclaw-install` | OpenClaw binary + workspace non vérifiables ici |
| `studio/studio_canvas.html` | `studio/studio_canvas.html` | Présent (non inspecté) |
| `HUMANGATE_DECISION_LOG.yaml` | `lab/chains/` | Créé à la première gate — absent au départ, normal |

**Conclusion repo**: rien de manquant de critique. La seule divergence est que l'upload (intention) et le repo (implémenté) sont deux variantes du même schéma v3.2 — pas un trou mais une dérive de copie.

---

## 2. Ce qu'OpenClaw ajoute CONCRÈTEMENT sur autopilot.py

### Ce qui est réel et fonctionnel

**`claude_proxy.py` (port 8765)** — réel, testé, opérationnel depuis 2026-06-26.
- Bridge `claude --print` → OpenAI `/v1/chat/completions`
- Permet à OpenClaw (ou n'importe quel client OpenAI-compatible) d'utiliser Claude avec accès repo complet
- Max 3 workers concurrents, timeout configurable, streaming SSE
- **Valeur réelle** : sans ça, `@producteur_dur` = appel API Anthropic payant ou zero accès repo

**`canvas_gateway.py` (port 8766)** — réel, fonctionnel.
- SSE push live de `studio_meta_latest.json` (polling mtime 2s)
- `POST /api/gate/{id}` → verdict HMAC-SHA256 signé dans `HUMANGATE_DECISION_LOG.yaml`
- **Valeur réelle** : seul canal où Pierre signe une décision avec preuve cryptographique. Autopilot.py n'a rien d'équivalent — ses décisions gate sont dans les chats, non signées.

**Multi-agent dispatch en worktrees** — partiellement réel.
- `worktrees/routine` et `worktrees/dur` configurés dans les SOUL.md
- OpenClaw binary (port 18789) déclaré RUNNING dans providers.yaml
- **Mais** : l'orchestration réelle (coordinateur → producteur en worktree isolé) dépend du binaire OpenClaw installé dans WSL — non vérifiable depuis le repo seul. Le code de configuration est là ; l'exécution n'est pas prouvée.

**Provider routing par coût** — réel dans la config, aspirationnel dans l'exécution.
- `capabilities.yaml` + `providers.yaml` : registre complet avec fallbacks
- Routing qwen-routine (local cheap) vs claude-proxy (local dear) vs Gemini (free, limité) vs Anthropic (payant, gate humaine)
- **Valeur réelle** : politique de coût encodée et consultable — meilleur que rien. Mais c'est OpenClaw binary qui l'applique, pas un code custom.

### Ce qu'autopilot.py fait mieux ou aussi bien

- UI complète (5200+ lignes, 51 routes, kaizen_autoloop, CEO Brief, idea pipeline) — rien dans OpenClaw ne remplace ça
- Intégration LEDGER, `/api/ceo-lane-assignment` déterministe, `/api/ceo-brief` LM
- État studio centralisé (`studio_state.json`, `studio_meta_latest.json`) — les deux services lisent ces fichiers mais autopilot.py les écrit

---

## 3. Coût et risque de garder l'ensemble

| Dimension | Coût/Risque |
|---|---|
| **3 services à démarrer** | autopilot.py (7331) + claude_proxy (8765) + canvas_gateway (8766) + OpenClaw (18789) = 4 processus. Fragile au boot, debugging multi-port. |
| **API Anthropic payante** | claude_proxy évite l'API directe — mais si le proxy tombe, le fallback = API payante. Risque faible si proxy bien monitoré. |
| **Complexité cognitive** | openclaw-team.yaml v3.2 (upload) ≠ openclaw-team.yaml repo = dérive silencieuse. SOUL.md × 4 + skills × 28 = surface de maintenance. |
| **OpenClaw binary dépendance** | Binaire tiers installé dans WSL, non auditable, port 18789. Si OpenClaw.ai change d'API ou disparaît, l'orchestration multi-agent tombe. |
| **Duplication UI** | studio_canvas.html + autopilot.py = deux surfaces de contrôle. Risque de désynchronisation d'état. |

---

## 4. Recommandations concrètes

### GARDER et intégrer immédiatement

**`scripts/claude_proxy.py`** — conserver et démarrer systématiquement avec le studio.
- C'est le seul moyen d'avoir Claude avec accès repo sans payer l'API à chaque appel
- Ajouter à `start_studio.ps1` / `start_studio.sh`
- Aucun risque, code propre, 263 lignes

**`scripts/canvas_gateway.py`** — conserver comme canal de gate signé.
- `POST /api/gate/{id}` + HMAC = seul verdict Pierre avec preuve cryptographique dans le projet
- Ne pas dupliquer dans autopilot.py — laisser canvas_gateway comme canal dédié gate
- Ajouter à `start_studio.ps1` / `start_studio.sh`

**`studio/openclaw-workspace/BOOTSTRAP.md`** — conserver comme system prompt @producteur_dur.
- Utilisé par claude_proxy via `CLAUDE_PROXY_SYSTEM_FILE` — relation directe et fonctionnelle

**`openclaw/capabilities.yaml` + `openclaw/providers.yaml`** — conserver comme registre machine-readable.
- Lus par autopilot.py healthcheck et @monitor
- Source de vérité des modèles disponibles — utile sans OpenClaw

### IMPORTER dans le repo (absent ou désynchronisé)

**Synchroniser les deux `openclaw-team.yaml`** :
- Le repo (`studio/openclaw-workspace/openclaw-team.yaml`) est la source de vérité opérationnelle
- L'upload (`openclaw-team-1.yaml.txt`) est une variante illustrative avec champs supplémentaires utiles (`surface:`, `tiers:`, `orchestration:`, `disciplines:`)
- Action : fusionner les champs utiles de l'upload (notamment `surface.canvas`, `tiers`, `orchestration.compete`) dans le repo — 1h de travail, gate Pierre avant merge

### DÉFÉRER (pas maintenant)

**OpenClaw comme orchestrateur multi-agent** (worktrees parallèles coordinateur→producteurs) :
- La valeur est réelle mais dépend du binaire tiers (port 18789) + WSL
- Déférer jusqu'à ce que Snake Survivor soit jouable (Titre 1 défendable d'abord)
- Revenir sur l'orchestration parallèle quand le pipeline IMP-163+184 sera fermé

**`studio_canvas.html` comme surface principale** :
- Autopilot.py est la surface. Garder canvas comme dashboard complémentaire lecture-seule, pas comme remplacement
- Ne pas tenter de merger les deux surfaces sans décision HumanGate

**Council avec Gemini** :
- Gemini free tier = valeur marginale sur des tâches génériques
- Règle φ déjà encodée (jamais Gemini sur internes Rocky) — à activer seulement si besoin de second avis générique sur narrative/audio

### ABANDONNER

Rien à abandonner complètement — tout le code est propre et court. Le risque est la **surface active**, pas le code mort.

---

## 5. Verdict final

**OpenClaw-the-orchestrator** : composant, pas surface. Déférer l'orchestration multi-agent.

**claude_proxy.py + canvas_gateway.py** : activer immédiatement. Ce sont les deux seules pièces qui apportent une valeur irremplaçable non couverte par autopilot.py (accès repo Claude sans API + gate signée HMAC).

**La surface reste autopilot.py**. OpenClaw est la couche d'orchestration sous-jacente, démarrée avec le studio mais invisible pour Pierre.

**Architecture cible à 3 services** (pas 4) :
```
autopilot.py (7331)     ← surface principale Pierre
canvas_gateway.py (8766) ← gate HMAC + SSE meta
claude_proxy.py (8765)  ← Claude accès repo pour @producteur_dur
```
OpenClaw binary (18789) : optionnel, activé seulement pour sprints parallèles explicites.

---

software_verdict: BLOCKED (openclaw binary non vérifié en dehors du repo)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
