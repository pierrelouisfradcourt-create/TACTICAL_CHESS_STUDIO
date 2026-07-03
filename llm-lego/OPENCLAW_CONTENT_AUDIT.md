# Audit détaillé — Contenu openclaw (4 agents + 28 skills)

> Passe **audit de contenu uniquement**. Aucune ligne de code écrite, aucune brique
> créée, **aucun appel réseau**. On audite le CONTENU (idées, prompts, concepts), pas le
> MÉCANISME. Ce rapport ne remet PAS en cause le blocage d'openclaw déjà acté par TCS
> (`docs/studio_v2/RECO_OPENCLAW.md`, `software_verdict: BLOCKED`). Date : 2026-07-03.
> Citations `fichier:ligne` vérifiées de première main (scripts + team.yaml + DREAMS) ou
> par agent d'exploration (SOULs, docs, 30 skills).
>
> software_verdict: N/A (audit) · evidence_verdict: MECHANICAL_VALIDATION_ONLY ·
> claim_verdict: NO_CLAIM_ALLOWED

---

## Garde-fou respecté

**Aucun appel réseau effectué pendant cet audit.** Lecture de fichiers statiques
uniquement : `openclaw-team.yaml`, les 4 `*/SOUL.md`, `AGENTS.md/BOOTSTRAP.md/TOOLS.md/
MEMORY.md/DREAMS.md`, les ~30 `skills/*.md`, et les 2 scripts `scripts/claude_proxy.py`
+ `scripts/canvas_gateway.py`. **Zéro requête** vers le binaire openclaw, son gateway
(:18789), le proxy (:8765), le canvas gateway (:8766), LM Studio (:1234), l'API
Anthropic ou Gemini. Le port :18789 n'apparaît nulle part dans les fichiers lus.

---

## Les 4 agents (`openclaw-team.yaml` v3.2 + `*/SOUL.md`)

Tous en autorité **RECOMMANDE** ; seuls les oracles non-LLM + Pierre sont **DÉCIDE**
(`AGENTS.md:15`). Invariants « anti-Skynet » : `intention_racine` sur chaque paquet,
sign-off Pierre irréversible, zones FORBIDDEN (`tests/ eval/ oracle/ bench/ puzzles/
.github/`), caps 200k tokens / 8 itérations, canvas nourri par le gateway signé HMAC.

| Nom | Rôle | Modèle visé | Réutilisable comme concept ? |
|---|---|---|---|
| **@coordinateur** | Tête d'opérations — décompose, route, délègue (jamais décide seul) | LM Studio / qwen2.5-coder-14b **(local)** | **OUI (fort)** — nœud routeur/dispatcher : « fog_map + table oracle avant de router » (`coordinateur/SOUL.md:15`). Rebranchable Qwen local / mockAdapter. |
| **@producteur_routine** | Bras mécanique — tâches bornées, oracle clair | LM Studio / Qwen **(local)** | **OUI (le + sûr)** — worker borné « oracle rouge → stop total, pas de contournement » (`SOUL.md:11`). Aucune ambiguïté de coût. |
| **@producteur_dur** | Code difficile, refactors structurels | **claude-proxy → `claude --print` CLI (local)** ⚠ voir note | **OUI mais sensible** — worker « raisonnement fort » + worktree isolé + escalade council avant l'irréversible. À rebrancher sur LLM local, **jamais** le fallback anthropic.com payant. |
| **@council** | Voix contradictoire — red-team, audit hypothèse, angle mort | multi-lignées : Claude(proxy local) + Qwen(local) + **Gemini Flash (réseau externe, free-tier)** ⚠ | **OUI (fort)** — nœud multi-LLM adversaire + « confidentialité par lignée » (φ → lignées locales seules, `council/SOUL.md:13-16`). Lignée Gemini → mockAdapter/2e modèle local pour rester offline. |

### ⚠️ Mise au point sur « l'API Anthropic payante » (nuance importante)

Le blocage d'openclaw a été motivé par `producteur_dur → API Anthropic payante`
(`docs/studio_v2/06_BUILD_MACHINE_VISION_UX.md`). **Vérification de première main :
dans la v3.2, `producteur_dur` route vers `claude-proxy` (`openclaw-team.yaml:85-91`),
et `scripts/claude_proxy.py:107-135` est un shim OpenAI→`claude --print` qui appelle le
CLI Claude Code LOCAL en subprocess — PAS l'API Anthropic facturée au token.** Le SOUL
de producteur_dur ne mentionne aucune API payante. Les deux seules traces de l'API
payante :
- `TOOLS.md:9` — provider `anthropic` (api.anthropic.com), explicitement « **Payant —
  réservé si claude-proxy indisponible** » (fallback).
- `AGENTS.md:12` — libellé imprécis « @producteur_dur | Claude API » (hérité, non
  resynchronisé avec le routage claude-proxy réel).

**Conséquence pour la récupération :** le risque « API payante » est réel mais **confiné
au fallback `anthropic` de TOOLS.md:9**. En important le CONCEPT d'un agent, ne jamais
recopier ce fallback ; brancher sur mockAdapter ou LM Studio. Le reste du roster est de
la config pure, sans dépendance mécanique openclaw. *(Note : lors du smoke-test du
2026-06-29, `DREAMS.md:428-430`, claude-proxy:8765 était DOWN et le council dégradait
proprement sur Qwen seul — preuve que le stack local fonctionne détaché du payant.)*

**Archive :** les 3 SOUL archivés (`archive/agents/*_SOUL.md`) sont **byte-identiques**
aux versions actives — copies de sauvegarde, pas d'évolution divergente à étudier.

---

## Les 28 skills — inventaire

### Familles identifiées

| Famille | Skills openclaw | Nature |
|---|---|---|
| Revue | architecture_review, code_review, design_review | stubs purs |
| Gouvernance/verdict | gate, gate_check, verdict, council | stubs (council + résumé 3 l.) |
| Planification | plan, sprint_plan, handoff, estimate, scope_check, team_feature, start, tech_debt | stubs purs |
| Boucle Kaizen | **autoloop** (fork), **imp_auto** + **imp-auto/SKILL.md** + **imp_run** (uniques), tick (stub) | 1 fork + 3 uniques + 1 stub |
| Jeu | balance_check, playtest, league, joust | stubs purs |
| Mesure/santé | **monitor** (quasi-copie), fog, reanchor, perf_profile, audit_daily | 1 quasi-copie + stubs |
| Release | release, hotfix, brainstorm | stubs purs |

### Nature de la duplication — le point-clé

**La qualification « 28 skills dupliqués » du rapport précédent est trompeuse.** Sur les
30 fichiers, **27 ne sont PAS des copies de contenu** — ce sont des **shims
d'activation** OpenClaw. Contenu type intégral (`skills/architecture_review.md`) :

```
---
name: /architecture-review
---
Voir .claude/skills/architecture-review/skill.md pour la version Claude Code.
Ce fichier active le skill dans OpenClaw.
```

Zéro instruction dupliquée : un pointeur nommé qui enregistre le skill dans le runtime
OpenClaw et **délègue au canonique `.claude/skills/`**. Ces 27 n'apportent aucune logique
et **ne sont pas candidats à extraction** (la source de vérité reste `.claude/skills/`).

Décomposition réelle : **27 pointeurs + 1 quasi-copie + 1 fork architectural + 3 uniques.**

- **1 quasi-copie enrichie — `monitor.md`.** Même table services/ports/probe que
  `.claude/skills/monitor/`, avec en plus une colonne « Relance », une ligne de synthèse
  obligatoire, une note de dépendance (`canvas_gateway` dépend de `claude_proxy`,
  `monitor.md:33-34`) et un bloc verdict. Valeur ajoutée réelle mais mineure.
- **1 vraie divergence — `autoloop`.** Deux implémentations **incompatibles** du même
  intent, pas deux copies : le canonique (`.claude/skills/autoloop/skill.md:8-9`,
  « native Claude Code, aucun pointeur OpenClaw ») orchestre `kaizen_autoloop.py` avec
  gate oracle `studio_meta.py` et journal `DREAMS.md` ; l'openclaw (`skills/autoloop.md`)
  délègue à `/imp-auto` qui **spawn `claude --bypassPermissions` en background**. Même
  contrat de sûreté, moteurs différents. **Seule paire au diff conceptuel majeur — et
  seul risque de dérive silencieuse.**

### Top skills uniques (candidats extraction — détail)

Ces 3 n'ont **aucun équivalent** dans `.claude/skills/` (côté canonique il n'existe que
`imp-readiness` = validation, pas exécution). Seuls porteurs de logique originale.

1. **`imp-auto/SKILL.md` (8.5K) — orchestrateur de délégation background** (`kind:agent`).
   IMP SAFE_AUTO en 5 phases : vérif synchrone → PLAN+gate → prompt worker → spawn
   `claude --bypassPermissions` en background → notification → gate merge (écrit
   `HUMANGATE_DECISION_LOG.yaml`). Flag `--unattended` qui saute *uniquement* la gate
   « Go ? » en gardant toutes les pré-conditions bloquantes (`SKILL.md:83-86`).
   ⚠ Le mécanisme `--bypassPermissions` + spawn background **ne doit pas être recopié
   tel quel** ; c'est le *pattern* (planificateur synchrone + exécutant délégué +
   notification) qui a de la valeur.
2. **Le template de prompt worker embarqué** (`imp-auto/SKILL.md:100-148`) — `kind:prompt`.
   Bloc auto-suffisant : identité `@producteur_dur`, repo, FORBIDDEN hardcodé, règles
   code Rust/Python inline, séquence stash→implémente→oracle→notify, contrainte « exactement
   un message ». Placeholders déjà tabulés (`<IMP-ID>`, `<oracle_command>`,
   `<NOTIFICATION_BLOCK>`). **Le morceau le plus directement réutilisable comme brique
   prompt paramétrable.**
3. **`imp_run.md` (3.1K) — exécuteur synchrone mono-IMP** (`kind:agent`). Variante *sans*
   worker background : @producteur_dur exécute en ligne dans un worktree, PLAN→go→oracle→
   rapport. Plus simple et **plus sûr** (pas de bypassPermissions, pas de spawn).

> **Bonus brique oracle :** la **gate de pré-conditions** partagée par imp_auto/imp_run/
> autoloop/imp-readiness (status OPEN + lane SAFE_AUTO + `blocked_by` vide + non-chevauchement
> FORBIDDEN) est une **brique `kind:oracle` déterministe** extractible indépendamment.
> `imp_auto.md` (7.4K) est une **version antérieure** de `imp-auto/SKILL.md` (sans
> `--unattended`) → redondance interne openclaw, candidat suppression, pas extraction.

---

## BOOTSTRAP / TOOLS / MEMORY / DREAMS

| Doc | Ce que c'est réellement | Recoupement avec l'existant |
|---|---|---|
| **BOOTSTRAP.md** | Pas un script exécutable : le **prompt système** injecté à @producteur_dur (via `CLAUDE_PROXY_SYSTEM_FILE`). Identité + FORBIDDEN + table oracles + **snapshot d'état daté 2026-06-26** + règles code par lane + **contrat de sortie obligatoire** (PLAN/Étapes/Gates/Risques/Go ?, `:103-113`) + protocole IMP. | Contrat de sortie + protocole IMP = briques prompt transposables. **Snapshot d'état périmé** (MEMORY.md plus récent) → inspiration structurelle seulement. |
| **TOOLS.md** | 4 providers (claude-proxy local, LM Studio, Gemini gratuit, **anthropic payant = fallback `:9`**) + routage agent→provider + skill→provider + endpoints gateway + stockage HMAC (`~/.openclaw/.env`). | **Recoupement TOTAL** des oracles : `cargo test`, `pytest`, `elo_match.sh`, `lichess_eval.sh`, `studio_meta.py`, HMAC = **exactement** les oracles TCS déjà réels (les 4 de `/smoke-check`). **Rien d'inédit à câbler.** Valeur = la table de routage « raisonnement→proxy fort / mécanique→Qwen local » comme heuristique de dispatch. |
| **MEMORY.md** | Mémoire studio à **niveaux de confiance** : bloc auto-généré par `scripts/sync_memory.py` (ELO, puzzles, compteur ledger) + baselines/ancres. Règle explicite (`:55-57`) : **CLAIMED = logs seulement ; VÉRIFIÉ = oracle vert + HMAC → peut monter en mémoire durable.** | Traque le compteur `IMPROVEMENT_LEDGER.yaml` (backlog IMP) = rôle Roadmap ; ancres/objectif +20 = Goals mesurables. **Pattern « claimed vs verified » = excellente brique de gouvernance de mémoire**, aligne sur `claim_verdict: NO_CLAIM_ALLOWED`. |
| **DREAMS.md** | ⚠ **Nom trompeur — ce n'est PAS de la spéculation.** C'est le **journal institutionnel append-only des décisions HumanGate + rapports d'orchestration**, daté, non réécrivable, alimenté uniquement par `/gate` signé (`:1-16`). ~20 entrées (IMP-192→210) mêlant rapports « NON RATIFIÉ » (preuves pytest, findings RED TEAM, commits non poussés) et décisions Pierre RATIFIÉ/REJETÉ/GELÉ. | Concept = **traçabilité HumanGate append-only** ; recoupe directement `HUMANGATE_DECISION_LOG.yaml` écrit par `canvas_gateway.py`. Une des meilleures briques de gouvernance à garder (fichier md + discipline d'append, zéro dépendance openclaw). |

---

## Ponts « à garder » (`claude_proxy.py`, `canvas_gateway.py`)

**Correction du statut « à garder mais non utilisé » : les deux sont ACTIVEMENT câblés
dans TCS, pas seulement documentés.**

- **`scripts/claude_proxy.py` (:8765)** — serveur FastAPI qui expose un endpoint
  OpenAI-compatible `/v1/chat/completions` et le traduit en **subprocess `claude --print`
  local** (`:107-135`), avec `/health`, `/v1/models`, streaming SSE, pool borné
  (`CLAUDE_PROXY_WORKERS`, défaut 3). **N'appelle jamais api.anthropic.com** — c'est le
  CLI Claude Code local. Usage actif confirmé : consommé par `scripts/council.py`
  (IMP-198, lignée PLAN_REVIEW), référencé par `start_studio.*`, `ports.yaml`,
  `DREAMS.md` (smoke-test).
- **`scripts/canvas_gateway.py` (:8766)** — micro-gateway : `/api/meta`
  (studio_meta_latest.json), `/api/meta/stream` (SSE sur mtime), `/api/refresh` (relance
  `studio_meta.py`), `/api/gate/{id}` (décision Pierre → `HUMANGATE_DECISION_LOG.yaml`
  **signé HMAC**). **Governor fail-closed avant toute action mutante** (`:106-114`).
  Usage actif : IMP-210 (les routes cockpit read-only ont été *migrées* vers
  `cockpit_server.py:8770`, `:53-57` — donc code vivant, maintenu), consommé par
  `studio_canvas.html`, référencé par `autopilot.py`, `cockpit_server.py`, `ports.yaml`.

**Rapport avec llm-lego — coïncidence de nom confirmée.** Le « canvas » de
`canvas_gateway.py` = le panneau de contrôle `studio_canvas.html`, **pas** le canvas du
builder llm-lego. `builder.html` ne fait que **nommer** `:8765` comme *label d'affichage*
d'un preset de rôle (`ROLE_PRESETS.PLAN_REVIEW = 'claude (proxy :8765)'`,
`builder.html:353`), miroir de la config council.py — **il n'appelle pas le proxy**.
Aucun couplage runtime builder↔ponts. Cela dit, si un jour llm-lego veut faire un « appel
réel » local (Passe 5 de `LIBRARY_AUDIT`), **`claude_proxy.py` est exactement l'adapter
OpenAI-compatible local qu'il faudrait** — c'est un pont réutilisable, pas une menace.

---

## Recommandation — ce qui vaut la peine d'être importé comme CONTENU

Priorisé. Pour chaque item : le `kind` de brique llm-lego visé + la reconstruction
d'adapter (toujours mockAdapters/LM Studio local, **jamais** binaire openclaw ni fallback
payant).

| # | Élément à importer | Kind brique | Adapter à reconstruire |
|---|---|---|---|
| 1 | **Template de prompt worker** (`imp-auto/SKILL.md:100-148`) — identité + FORBIDDEN + règles code + séquence, placeholders déjà tabulés | `prompt` | Aucun (texte pur paramétrable) |
| 2 | **Roster 4 agents + autorité graduée** (RECOMMANDE/DÉCIDE) + domaine→oracle (`AGENTS.md`) | 4× `agent` (+ champs `authority`/`oracle`) | mockAdapter / LM Studio ; producteur_dur = LLM local, **jamais** anthropic fallback |
| 3 | **Gate de pré-conditions IMP** (OPEN + SAFE_AUTO + blocked_by vide + non-FORBIDDEN) | `oracle` (déterministe) | Aucun (vérif mécanique) |
| 4 | **Pattern @council multi-LLM red-team + confidentialité par lignée** | `agent`/`chain` composite | Gemini → mockAdapter ou 2e modèle local (rester offline) |
| 5 | **Pattern mémoire claimed-vs-verified** (`MEMORY.md:55-57`) | doctrine → `oracle`/convention | Aucun (discipline) |
| 6 | **Pattern journal HumanGate append-only** (`DREAMS.md`) — à renommer | doctrine → convention | Aucun (md + append via `/gate`) |

Tout ce qui précède est **du contenu détaché de tout mécanisme openclaw** : le transport
doit être reconstruit proprement (mockAdapters d'abord, LM Studio ensuite ; `claude_proxy.py`
local disponible si un appel réel local est gaté un jour). **Aucun de ces imports ne
requiert de réactiver le binaire openclaw.**

---

## Ce qui ne doit JAMAIS être touché

- **Le binaire openclaw** (`npm install -g openclaw`) et son **gateway :18789** — mécanisme
  tiers non auditable, cœur du blocage TCS.
- **Le provider `anthropic` payant** (`TOOLS.md:9`, api.anthropic.com) — fallback facturé
  au token. Ne jamais l'activer ni le recopier dans une brique. *(Le CLI local via
  `claude_proxy.py` est un substitut acceptable ; l'API payante non.)*
- **Le spawn `claude --bypassPermissions` en background** (`imp-auto/SKILL.md`) — importer
  le *pattern* de délégation, jamais le contournement de permissions tel quel.
- **La lignée Gemini du council sur données sensibles** — tout appel réseau externe, et *a
  fortiori* sur φ/traces Rocky/internes ML (interdit par doctrine `council/SOUL.md:13-16`).
- **Le fork `autoloop` openclaw** — ne pas importer comme s'il était le canonique ; le
  vrai autoloop est `.claude/skills/autoloop/` + `kaizen_autoloop.py`. Éviter la double
  source de moteur.

---

## Verdict honnête

**Le blocage d'openclaw par TCS est correct et ne doit pas être rouvert. Le contenu
récupérable est réel mais modeste, et en grande partie redondant avec ce que TCS/llm-lego
possède déjà.** Décomposition :

- **Ce qui a une vraie valeur nette** : ~4 briques de *contenu* (le template de prompt
  worker #1, le roster-template #2, et les deux patterns de gouvernance mémoire/journal
  #5-#6). Ce sont des textes/conventions, sans mécanisme, extractibles proprement.
- **Ce qui est déjà couvert ailleurs (peu ou pas de gain)** : les 27 skills sont des
  pointeurs vers `.claude/skills/` (rien à extraire) ; les oracles de TOOLS.md sont
  *déjà* les oracles réels de TCS ; le concept @council a **déjà été implémenté** hors
  openclaw (`scripts/council.py`, IMP-198) — donc « importer le council » = re-décrire de
  l'existant.
- **Ce qui est du mécanisme à laisser fermé** : binaire, gateway :18789, fallback payant,
  bypassPermissions, lignée Gemini réseau.

**Recommandation :** faire une **extraction chirurgicale** du petit noyau de contenu
(#1-#3 en priorité, #4-#6 comme doctrine), et **laisser tout le reste fermé comme TCS l'a
décidé**. Ne pas monter un chantier « import openclaw » : le rapport valeur/risque ne le
justifie pas — la majorité du workspace est soit des pointeurs inertes, soit du mécanisme
interdit, soit du concept déjà réimplémenté proprement dans le kernel TCS. Les 2 ponts
(`claude_proxy.py`, `canvas_gateway.py`) sont l'exception : **déjà actifs et sains**, à
conserver tels quels (ils ne font pas partie du mécanisme openclaw à proprement parler).

---

*Fin de l'audit — aucun appel réseau, aucune modification de code, aucune brique créée.*
*software_verdict: N/A (audit) · evidence_verdict: MECHANICAL_VALIDATION_ONLY ·*
*claim_verdict: NO_CLAIM_ALLOWED*
