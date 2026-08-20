# STAFF ENGINEER AUDIT — Systèmes d'agents LLM
## Tactical Chess Studio — 2026-06-29

> **Posture.** Audit lecture seule. Aucune architecture inventée. Chaque affirmation est tracée à un fichier ou marquée `UNKNOWN`.
> **Séparation stricte** : (A) ce qui existe dans le repo · (B) ce que le web montre comme best practice 2026 · (C) propositions d'évolution repo-native.
>
> ```
> software_verdict : OK        (audit produit, sources tracées)
> evidence_verdict : MECHANICAL_VALIDATION_ONLY  (cartographie par lecture, pas d'exécution oracle)
> claim_verdict    : NO_CLAIM_ALLOWED
> ```

---

## 1. REPO STATE MAP

### 1.1 Topologie macro

Le studio est un **control-plane agentic à 3 couches** posé sur un moteur d'échecs Rust + une lane ML Python, piloté par un humain souverain (Pierre) via des gates.

```
┌─ POLICY LAYER (déterministe, fail-closed) ──────────────────┐
│  governance/governor.py     gate ALLOW/BLOCK par action      │
│  governance/ledger_writer.py single-writer + SHA256 + O_EXCL │
│  governance/ecg.py          state machine 7 états (ADVISORY) │
│  governance/agent_factory.py rôles bornés (capabilities.lock)│
│  governance/error_journal.py journal HMAC + escalade IMP      │
└──────────────────────────────────────────────────────────────┘
┌─ EXECUTION LAYER (orchestration par lane) ──────────────────┐
│  lab/chains/kaizen_loop.py     pipeline read-only (+ close)  │
│  lab/chains/kaizen_autoloop.py boucle gated SAFE_AUTO        │
│  .claude/skills/*  (33 skills)  surface humaine/Claude Code  │
│  .claude/agents/*  (7 agents)   spécialistes Sonnet/Haiku    │
└──────────────────────────────────────────────────────────────┘
┌─ OBSERVABILITY LAYER (HMAC, immuable) ──────────────────────┐
│  lab/events.jsonl              événements signés HMAC         │
│  lab/reports/{director,diagnosis}*  santé consolidée         │
│  studio_state.json / .studio_state/studio_meta_latest.json   │
└──────────────────────────────────────────────────────────────┘
       ▲ humain souverain : DREAMS.md (append-only) via /gate
```

### 1.2 Mapping fichier → rôle (surfaces critiques)

| Fichier | Rôle | Criticité |
|---|---|---|
| `autopilot.py` (~8767 l, port 7331) | UI HTML inline + ~44 endpoints (GET 21 / POST 23 / DELETE 1), serveur `BaseHTTPRequestHandler` **(pas Flask)** | CRITIQUE |
| `lab/chains/IMPROVEMENT_LEDGER.yaml` | SSOT des IMPs (statut, lane, blocage, files, acceptance) | CRITIQUE |
| `governance/governor.py` | Décision déterministe ALLOW/BLOCK, fail-closed | CRITIQUE |
| `governance/ledger_writer.py` | Single-writer (SHA256 + `.writelock` O_EXCL) | CRITIQUE |
| `lab/chains/kaizen_autoloop.py` | Boucle OPEN→CLOSED gated par lane + lock 30 min + error_journal | CRITIQUE |
| `lab/chains/prompt_chain_map.json` | Chaîne idée→roadmap→redteam→fusion→extract→stage | HAUTE |
| `studio_state.json` / `.studio_state/studio_meta_latest.json` | État oracle global (`global_verdict`, ELO live) | HAUTE |
| `.claude/skills/*/SKILL.md` (×33) | Surface d'orchestration invoquée par Pierre / Claude Code | HAUTE |
| `.claude/agents/*.md` (×7) | Rôles spécialistes (modèle + scope + escalade) | HAUTE |
| `scripts/cockpit_server.py` (FastAPI:8770) | Cockpit lecture-tolérante + délégation gouvernée | MOYENNE |
| `studio_core/` | Game factory Python (manifest chess, sim Snake headless) | MOYENNE |
| `games/snake_survivor/` | Projet Godot 4.x (7 scripts GDScript) | MOYENNE |
| `ml/` (40+ fichiers) | Neural moat : `model.py`, `train.py`, `bench_puzzles.py` | HAUTE (moat) |

### 1.3 Système de prompts (la « chaîne »)

`prompt_chain_map.json` — pipeline idéation→IMP en 5 étapes :

| # | Étape | Modèle | Fonction |
|---|---|---|---|
| 1 | roadmap | Qwen2.5-14b | architecte solo-dev (≤3 étapes) |
| 2 | redteam | Qwen2.5-14b | avocat du diable (≤3 critiques) |
| 3 | fusion | Qwen2.5-14b | arbitre, gardien d'intention |
| 4 | extract | **Qwen3.6-27b** | juge-décomposeur → JSON (≤4 IMPs) |
| 5 | stage | Python pur | écriture `ROADMAP_PROPOSALS.yaml` |

**Aveugle connu (IMP-089)** : `idea_content` est perdu après l'étape 1 ; les étapes 2-4 ne voient que `idea_title`. Aucune étape n'a accès au code source pour valider les `files` cités. FUSION redondante avec REDTEAM.

### 1.4 Système memory / context

| Couche | Stockage | Nature |
|---|---|---|
| Court terme (lisible) | `studio/openclaw-workspace/MEMORY.md` | ELO live, ancres Lichess, compteurs IMP — **sync manuel post-oracle** |
| Long terme (machine) | `studio_state.json` + `.studio_state/studio_meta_latest.json` | oracles, meta, `global_verdict`, HMAC |
| Décisions (souverain) | `studio/openclaw-workspace/DREAMS.md` | gates Pierre, **append-only** |
| Trace (immuable) | `lab/events.jsonl` | événements signés HMAC-SHA256 |
| Mémoire Claude Code | `~/.claude/projects/.../memory/MEMORY.md` + fichiers | mémoire d'agent inter-session |

Hooks de contexte câblés (`settings.json`) : `SessionStart`, `SubagentStart/Stop`, `Stop`, `PreCompact`/`PostCompact` (snapshot `compact-state.json`). C'est un vrai système de **continuité de contexte sur compaction** — déjà supérieur à la moyenne.

### 1.5 Tool usage réel

LM Studio local (port 1234, Qwen2.5-14b / Qwen3.6-27b / Qwen2.5-coder-14b) · `subprocess` via `/api/run-chain` (gardé par `lane_guard` + `tool_permission`) · `claude --print` (claude_proxy:8765 + fallback charter) · `git status --porcelain` · oracles non-LLM (`cargo test`, `pytest ml/`, `run_oracle.sh elo_match|lichess_eval`).

### 1.6 État vivant (2026-06-29)

- **Ledger** : 224 IMPs (201 CLOSED / 22 OPEN / 1 FAIL).
- **`global_verdict = FAIL`** : ELO hybride 1211.5 vs heuristique 1201.6 = **+10.0**, cible **≥ +20** → autoloop **bloqué fail-closed**.
- Surface BLOCKED : `inference`. 4 items HumanGate en attente.
- Path le plus court vers valeur : **lane Jeux** (IMP-189→190), seule sans bloqueur vivant.

### 1.7 Incohérences détectées (à traiter — section 7)

1. **`MEMORY.md` dit 193 IMPs**, le ledger en a **224** → mémoire stale (la mémoire Claude Code reproduit aussi « 226 / 22 OPEN »). Source unique non garantie.
2. **`/api/ceo-brief` utilise `qwen3.6-27b`** alors que `CLAUDE.md` déclare **« Qwen3.6 INTERDIT pour JSON — thinking mode vide le content »**, et l'endpoint *parse du JSON*. Contradiction règle/implémentation. *(idem étape `extract` du chain map.)* `UNKNOWN` : confirmer le model id réel ligne ~32 d'`autopilot.py`.
3. **`events.jsonl`** référencé à `lab/events.jsonl` (couche obs.) **et** `lab/chains/events.jsonl` (mémoire) → `UNKNOWN` : un seul fichier ou deux ?
4. **ECG `ecg.py` est ADVISORY** — il valide les transitions mais n'est pas l'autorité d'écriture exclusive ; le statut legacy reste maître.
5. **Single-writer PARTIEL** : `autopilot.py:1684` écrirait le ledger en direct, contournant `ledger_writer` (cf. IMP-194, audit REPRISE).
6. **Council « construit non branché »** : la skill `/council` + `/api/council` existent, mais `kaizen_autoloop` ne l'invoque pas dans le flux AUDIT_REQUIRED (escalade humaine manuelle).

---

## 2. WEB STATE-OF-THE-ART SUMMARY (2026)

Synthèse des best practices publiées 2025-2026 (sources en fin de doc).

- **Frameworks d'orchestration.** Le marché s'est stabilisé autour de **LangGraph** (graphe à état, checkpointing, human-in-the-loop, observabilité — défaut « production »), **CrewAI** (rôles, montage rapide), **AutoGen** (recherche, conversations multi-agents). Les vendor SDKs (OpenAI Agents SDK, Google ADK, **Anthropic Agent SDK**) sont sortis en 2025. Le consensus : *graph + state checkpointé + terminaison déterministe + chaque invocation tracée*.
- **Cinq rôles canoniques** de tout système multi-agent fiable : **producer, consumer, coordinator, critic, judge**. Distinction clé : *les critics suggèrent sans autorité de gate ; les judges émettent un go/no-go binaire.* Pattern **plan-and-execute** : planner émet un plan ordonné, executor le parcourt pas-à-pas.
- **Skills / MCP (Claude Code).** Format `SKILL.md` ouvert par Anthropic (oct. 2025), adopté par OpenAI. Principes : une skill ≈ **100 tokens tant que non chargée** (cinquante skills installées coûtent quasi rien) ; **MCP coûteux en contexte** (~55k tokens pour 5 serveurs/58 outils) → **Tool Search** charge à la demande (−85 %). Règle « **CLAUDE.md ≤ 200 lignes** » + `.claude/rules/*.md` à globs. **Spawner un subagent dès qu'une tâche pollue le contexte principal** (recherche → rapport → planifier en contexte propre).
- **Compression de contexte / mémoire longue.** État de l'art : **mémoire multi-couches** (consolidation sémantique, contrôle de rétention), **compression de contexte de travail** (ACON : guidelines de compression apprises sur trajectoires échec/succès), **context folding** pour horizons longs, distillation KV/fact. La compaction native de Claude Code est un cas particulier de cette famille.
- **Boucles self-refine / verifier.** Consensus : **les LLM révisent mieux qu'ils ne génèrent** ; **rounds 1-2 = 75 % du gain** ; **≥ 2 passes de revue** ; préférer **plusieurs stratégies de vérification** (lenses) à N vérificateurs identiques. Cycles **génération↔vérification** avec tests exécutables + outils externes. Risque documenté : **policy drift** des boucles auto-raffinantes.
- **Provenance / attestation.** Tendance : frameworks d'éval d'**attribution multi-agent** sur conventions **OpenTelemetry GenAI** + **replay déterministe**. *(C'est exactement la direction du HMAC + events.jsonl du studio.)*

---

## 3. GAP ANALYSIS (repo vs systèmes IA modernes)

Légende : 🟢 au niveau / à l'avant-garde · 🟡 partiel · 🔴 gap réel.

| Dimension | (A) Repo actuel | (B) Best practice 2026 | Verdict | Gap |
|---|---|---|---|---|
| **Gouvernance déterministe** | `governor.py` fail-closed, offline, code pur | judges binaires, terminaison déterministe | 🟢 | Avant-garde. Peu de studios ont ça. |
| **Provenance / intégrité** | HMAC-SHA256 sur events + error_journal | OTel GenAI + replay déterministe | 🟢 | Clé HMAC défaut `"studio-dev"` (intégrité, pas anti-forge). |
| **Human-in-the-loop** | `/gate` souverain + DREAMS append-only | HITL = défaut production (LangGraph) | 🟢 | Modèle exemplaire. |
| **Lifecycle d'état** | ECG 7 états mais **ADVISORY** | state machine checkpointée *autoritaire* | 🟡 | ECG ne *force* pas encore les transitions. |
| **Single-writer** | `ledger_writer` SHA256+O_EXCL mais **bypass autopilot:1684** | state store unique | 🟡 | Une porte dérobée invalide l'invariant. |
| **Critic / verifier loop** | `/council` (Gemini+Qwen) **non branché** au flux auto | critic≠gate, ≥2 passes, multi-lens | 🟡 | Council manuel ; pas de double-passe systématique. |
| **Routing multi-agent** | greedy déterministe (`ceo-lane-assignment`) + skills | dispatcher planner→executor | 🟡 | Pas de planner/executor explicite hors chain idéation. |
| **Skills surface** | 33 skills `SKILL.md`, 7 agents, rules à globs | format SKILL.md = standard | 🟢 | Déjà aligné sur le standard ouvert. |
| **Contexte / compaction** | hooks Pre/PostCompact + memory/ | compression apprise, mémoire multi-couches | 🟡 | Snapshot oui ; pas de compression *apprise* ni rétention scorée. |
| **Observabilité** | director/diagnosis JSON + events | chaque invocation tracée, OTel | 🟡 | Traces maison ; pas de schéma OTel ni replay outillé. |
| **CI / oracle en pipeline** | oracles puissants **mais CI=0 test applicatif** | tests en CI bloquants | 🔴 | `.github/workflows` ne compile rien (audit 06-27). |
| **Boucle vivante** | kaizen réelle mais **dormante** (CHAIN_HISTORY s'arrête 06-04) | boucle continue tracée | 🔴 | `global_verdict=FAIL` gèle tout depuis ~3 sem. |
| **Cohérence mémoire** | MEMORY.md stale (193 vs 224) | source unique | 🔴 | Dérive silencieuse des compteurs. |

**Lecture d'ensemble.** Le studio est **en avance** sur la gouvernance, la provenance et le HITL — au-dessus de la médiane 2026. Les gaps réels ne sont **pas** architecturaux : ils sont d'**activation** (boucle gelée par l'oracle ELO), de **cohérence** (mémoire stale, single-writer percé) et de **vérification continue** (CI morte, council non branché).

---

## 4. SKILL PROPOSALS (repo-native uniquement)

> Toutes brancheables sur les modules existants. Aucune nouvelle architecture. Chaque skill suit le contrat existant (oracle + hard rules + NO_CLAIM_ALLOWED).

### S1 — `/memory-sync` 🟢 *(trace : `studio_state.json`, `MEMORY.md`, `kaizen_loop.py metrics`)*
Skill read-mostly qui régénère `MEMORY.md` depuis le ledger + `studio_state.json` et **diffe** les compteurs. Tue l'incohérence #1 (193 vs 224). Sortie : rapport de dérive ; écriture MEMORY.md uniquement (jamais le ledger). Résout directement le gap « cohérence mémoire ».

### S2 — `/council-auto` (extension de `/council`) 🟡 *(trace : `kaizen_autoloop.py` routing AUDIT_REQUIRED, `/api/council`)*
Brancher le council **dans** le flux : quand `kaizen_autoloop` rencontre un IMP `AUDIT_REQUIRED`, au lieu d'un STOP manuel, invoquer Gemini+Qwen, persister le `council_verdict`, puis escalader `/gate`. Implémente le pattern *critic→judge* sans donner d'autorité de merge au critic. Aligne sur « ≥2 passes ».

### S3 — `/verify-pr` (double-passe verifier) 🟡 *(trace : `/code-review`, `/verdict`, oracles)*
Generation→verification : après un changement, lancer l'oracle de domaine **puis** une passe critique multi-lens (correctness / régression / scope-FORBIDDEN). Encode le « rounds 1-2 = 75 % du gain ». Réutilise `verdict` pour la signature HMAC.

### S4 — `/ecg-enforce` (promotion ECG advisory→autoritaire) 🟡 *(trace : `governance/ecg.py`, `ledger_writer.py`)*
Skill de bascule contrôlée : valide que **toute** clôture passe par `ORACLE_PENDING→VERDICT_SIGNED→CLOSED` avant de retirer le flag ADVISORY. Sortie = rapport de conformité des 224 IMPs ; bascule réelle = `/gate` Pierre.

### S5 — `/provenance-check` 🟢 *(trace : `events.jsonl`, `error_journal.py`)*
Vérifie le HMAC de chaque ligne d'`events.jsonl`, signale les entrées non signées / clé défaut, et propose la rotation de `STUDIO_HMAC_KEY`. Durcit le seul point faible de la couche provenance (clé `"studio-dev"`).

### S6 — `/context-pack` 🟡 *(trace : hooks PreCompact, `compact-state.json`)*
Compression *apprise* légère : au lieu d'un snapshot brut, produire un résumé structuré (IMP courant, invariants, décisions DREAMS récentes) borné en tokens, réinjecté en PostCompact. Rapproche de l'état de l'art « mémoire multi-couches » sans dépendance externe.

---

## 5. WORKFLOW IMPROVEMENTS (intégrés aux flux existants)

| # | Amélioration | Point d'ancrage | Disruption |
|---|---|---|---|
| W1 | **Boucler `error_journal` → council** : 3e occurrence d'erreur inconnue déclenche `/council-auto` au lieu d'un simple bump AUDIT_REQUIRED | `error_journal.py` escalade (déjà à 3) | Minimale |
| W2 | **Boucher la porte single-writer** : router `autopilot.py:1684` à travers `ledger_writer.guarded_write` | autopilot + IMP-194 | Faible (1 call-site) |
| W3 | **CI oracle minimal** : faire que `.github/workflows` lance au moins `cargo test` + `pytest ml/` (le `/smoke-check` existe déjà, il suffit de le câbler) — **zone `.github/` = FORBIDDEN → gate Pierre obligatoire** | smoke-check + IMP-187 | Gate requise |
| W4 | **Réveiller la boucle** : le path Jeux (IMP-189→190) est SAFE_AUTO non bloqué et indépendant de l'ELO ; le faire tourner via `/autoloop` débloque de la valeur sans attendre le neural | kaizen_autoloop, lane Jeux | Faible |
| W5 | **Replay déterministe** : ajouter un mode `--replay` qui rejoue `events.jsonl` pour reconstruire l'état (aligne sur OTel/replay 2026) | events.jsonl + diagnosis | Moyenne |
| W6 | **`extract`/`ceo-brief` sur modèle JSON-sûr** : remplacer `qwen3.6-27b` par `qwen2.5-14b` sur les étapes qui parsent du JSON (respecte la règle CLAUDE.md) | prompt_chain_map + autopilot | Faible — **après confirmation #2** |

---

## 6. UX IMPROVEMENTS

- **U1 — Bandeau « state awareness » unifié.** Les audits notent **3 cockpits divergents** (autopilot:7331, cockpit_server:8770, canvas_gateway:8766). Exposer une *seule* source de vérité d'état (`/api/overview` du cockpit lit déjà tout) et marquer les deux autres comme vues. Réduit la confusion #1 des audits UX.
- **U2 — Feedback loop visible sur `/autoloop`.** Le rapport matin existe ; ajouter dans l'UI autopilot un statut live « boucle gelée car `global_verdict=FAIL` (ELO +10/+20) » pour que l'inactivité soit *expliquée*, pas subie.
- **U3 — Debug visibility tracée.** Conserver le pattern `TCS_DEBUG` (règle incidents) ; ajouter un toggle UI qui révèle la dernière trace `events.jsonl` + HMAC status par IMP fermé.
- **U4 — Commandes de cohérence.** Exposer `/memory-sync` (S1) et `/provenance-check` (S5) comme boutons cockpit — un clic = un rapport de dérive, pas une investigation manuelle.
- **U5 — `fog` en première classe.** La skill `/fog` sépare déjà vérifié/jugement ; l'afficher comme carte par défaut au démarrage de session répond directement à « qualité > volume » (Pierre voit ce qui est prouvé vs ce qui attend son jugement).

---

## 7. RISK ANALYSIS (breaking changes / hallucination risks)

| Risque | Origine | Sévérité | Mitigation |
|---|---|---|---|
| **Mémoire stale → décisions sur faux compteurs** | MEMORY.md 193 vs 224 | HAUTE | S1 `/memory-sync`, source unique |
| **Single-writer percé → corruption ledger concurrente** | autopilot:1684 bypass | HAUTE | W2, IMP-194, `grep_guard_ledger.py` |
| **CI morte → régression silencieuse merge-able** | `.github` ne teste rien | HAUTE | W3 (gate Pierre, zone FORBIDDEN) |
| **Modèle JSON-unsafe (qwen3.6) sur parsing** | ceo-brief / extract | MOYENNE | W6 **après** confirmation #2 (lire `autopilot.py` ligne ~32) |
| **Policy drift de l'autoloop** | boucle self-refine (web-documenté) | MOYENNE | déjà mitigé : cap 3, hard-stop oracle, governor fail-closed |
| **Clé HMAC défaut publique** | `"studio-dev"` | MOYENNE | S5, rotation `STUDIO_HMAC_KEY` |
| **ECG advisory contourné** | ecg.py non autoritaire | MOYENNE | S4 promotion contrôlée |
| **Worktrees orphelins** (joust/team-feature) | nettoyage manuel | FAIBLE | déjà dans hard rules des skills |
| **Hallucination de cet audit** | findings #2/#3 non vérifiés à l'exécution | — | marqués `UNKNOWN`, à confirmer par lecture directe avant action |

**Anti-breaking.** Aucune proposition ne touche `tests/ eval/ oracle/ bench/ puzzles/ .github/` sans gate Pierre. W3 et W6 sont explicitement gatées. La séparation `ceo-lane-assignment` (déterministe) / `ceo-brief` (LM) est **préservée** (interdiction de fusion respectée).

---

## 8. PRIORITIZATION (impact vs effort)

```
IMPACT
  ▲
H │  W4 Réveil boucle Jeux    │ W2 Single-writer   │ W3 CI oracle (gate)
  │  S1 /memory-sync          │ S2 /council-auto   │
M │  S5 /provenance-check     │ S3 /verify-pr      │ S4 /ecg-enforce
  │  U1 cockpit unifié        │ W6 modèle JSON-sûr │ W5 replay déterministe
L │  U2/U3/U5 UX awareness    │ S6 /context-pack   │
  └────────────────────────────────────────────────────────────► EFFORT
        FAIBLE                  MOYEN                  ÉLEVÉ
```

**Ordre recommandé (quick wins d'abord, tout repo-native) :**

1. **S1 `/memory-sync`** — tue la dérive de compteurs (impact H, effort faible). *Préalable à toute décision fiable.*
2. **W4 réveil lane Jeux (IMP-189→190)** — seule valeur livrable sans attendre l'ELO (impact H, effort faible, SAFE_AUTO).
3. **S5 `/provenance-check`** + rotation clé HMAC — durcit le moat d'intégrité (impact M, effort faible).
4. **W2 single-writer** (IMP-194) — referme l'invariant percé (impact H, effort faible).
5. **S2 `/council-auto`** — branche le critic existant dans la boucle (impact M, effort moyen).
6. **W6** (après confirmation #2) puis **S3 / S4 / W3-gate / W5** selon décisions Pierre.

**Ce qui reste hors scope sans go Pierre explicite :** fusion ceo-lane/ceo-brief (interdite), modif zones FORBIDDEN (W3), promotion ECG autoritaire (S4), bascule modèle (W6).

---

## ANNEXE — UNKNOWN à lever avant action

1. Model id exact lignes ~27-32 d'`autopilot.py` (`LM_MODEL` / `LM_MODEL_CEO`) — confirmer qwen3.6 vs qwen2.5 pour les étapes JSON (#2).
2. Emplacement canonique d'`events.jsonl` : `lab/` vs `lab/chains/` (#3).
3. Structure exacte de `golden_examples.jsonl` (fichier > 25k tokens, non échantillonné — **ne pas supprimer**, corpus LoRA).
4. État réel `07_CURRENT_STATE.md` (daté 2026-06-29 mais note interne « 2026-06-03 »).
5. Provenance PyPI `graphifyy` (IMP-204, notée « non vérifiée » dans REPRISE).

---

## SOURCES (web, 2026)

- [Best Multi-Agent Frameworks 2026 — gurusup](https://gurusup.com/blog/best-multi-agent-frameworks-2026) · [LangChain — AI agent frameworks 2026](https://www.langchain.com/resources/ai-agent-frameworks) · [Firecrawl — open source agent frameworks](https://www.firecrawl.dev/blog/best-open-source-agent-frameworks)
- [Claude Code Skills Complete Guide — duet.so](https://duet.so/guides/claude-code-skills-complete-guide) · [Extend Claude with skills — code.claude.com](https://code.claude.com/docs/en/skills) · [Claude Code Best Practices — mcp.directory](https://mcp.directory/blog/claude-code-best-practices)
- [Multi-Agent Orchestration Patterns 2026 — digitalapplied](https://www.digitalapplied.com/blog/multi-agent-orchestration-patterns-producer-consumer) · [6 Multi-Agent Orchestration Patterns — beam.ai](https://beam.ai/agentic-insights/multi-agent-orchestration-patterns-production) · [ORCH deterministic orchestrator — arXiv 2602.01797](https://arxiv.org/pdf/2602.01797)
- [ACON: Context Compression — arXiv 2510.00615](https://arxiv.org/html/2510.00615) · [Multi-Layered Memory Architectures — arXiv 2603.29194](https://arxiv.org/html/2603.29194v1) · [Context Engineering 2025 — mem0](https://mem0.ai/blog/context-engineering-ai-agents-guide)
- [ReVeal: Self-Evolving Code Agents — arXiv 2506.11442](https://arxiv.org/html/2506.11442v1) · [Evaluator reflect-refine loop — AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/evaluator-reflect-refine-loop-patterns.html) · [Spectral Guarantees for Policy Drift — OpenReview](https://openreview.net/forum?id=xrLhmzw5p2)

---

```
software_verdict : OK
evidence_verdict : MECHANICAL_VALIDATION_ONLY
claim_verdict    : NO_CLAIM_ALLOWED
```
