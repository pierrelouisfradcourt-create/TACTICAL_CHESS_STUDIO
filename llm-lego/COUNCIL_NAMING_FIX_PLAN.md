# COUNCIL_NAMING_FIX_PLAN — corriger la dérive de nommage du Council « looped »

> Phase 0 = vérification avant tout code. Citations `fichier:ligne` vérifiées de
> première main. Date : 2026-07-02.

---

## Phase 0 — Vérification (les 4 points, sans deviner)

### 1. `kaizen_autoloop.py` — quels rôles, quel council, quel subprocess ?

**Aucun rôle propre à 6 voix.** Le pipeline réel est :

1. **Gate council à 3 voix** — `run_council_gate()`
   (`lab/chains/kaizen_autoloop.py:474-528`) délègue PLAN/REVUE à `council.py`.
   Les adapters construits sont exactement 3
   (`_build_council_adapters`, `kaizen_autoloop.py:440-446`) :
   `ModelId.CLAUDE` / `ModelId.QWEN14B` / `ModelId.GEMINI_FLASH`. L'appel réel est
   `council.run_council(...)` (`kaizen_autoloop.py:464-466`) → donc les rôles sont
   **ceux de council.py : PLAN_REVIEW / RED_TEAM / DIVERGENCE**, pas d'autres.
   Timeout 120s (`_run_council_with_timeout`, `kaizen_autoloop.py:469-471`),
   guardrails (governor BLOCK → skip ; timeout → skip ; collapsed → skip ;
   `requires_humangate` réel → ESCALADE stop, pas d'exécution auto — lignes 483-519).

2. **Exécution via subprocess Claude Code CLI** — `execute_via_claude_code()`
   (`kaizen_autoloop.py:533-559`) lance `npx @anthropic-ai/claude-code --print`
   (fallback `claude --print`) — `kaizen_autoloop.py:549-551`. Le CONSENSUS du
   council est injecté **en tête, en lecture seule** dans le prompt de l'exécuteur
   (`kaizen_autoloop.py:541-547`) ; l'exécuteur ne voit jamais le brief brut.

**Flux réel** : `IMP SAFE_AUTO → council gate (3 voix, 120s) → (pas d'escalade) →
execute_via_claude_code(charter + consensus)`. **Aucun rôle coder/tester/reviewer,
aucune boucle de rétroaction.**

### 2. `scripts/council.py` (gate v1) — 3 rôles réels confirmés

Déjà vérifié fidèle dans `COMPLETENESS_AUDIT.md` — **non retouché ici**. Rappel :
PLAN_REVIEW (Claude proxy local, temp 0.2, `council.py:290`), RED_TEAM (Qwen 14B,
temp 0.2), DIVERGENCE (Gemini Flash, temp 0.4, `council.py:331`), exécution
parallèle `asyncio.gather` (`council.py:516`), timeout 120s (`council.py:50`),
top_p/max_tokens non paramétrés. Le nœud « Council gate v1 » du builder reflète
ces params exactement (`builder.html:187-189`). **On n'y touche pas.**

### 3. Builder — les 6 rôles « looped » actuels et leurs params

`ROLE_PRESETS` groupe `'cible (table)'` (`builder.html:191-196`) :

| Rôle (clé) | model | temperature | top_p | max_tokens |
|---|---|---|---|---|
| `claude-planner` | Claude Opus | 0.4 | 0.9 | 6000 |
| `qwen-redteam` | Qwen | 0.7 | 0.9 | 3000 |
| `gemini-explorer` | Gemini Flash/Pro | 0.8 | 0.95 | 3000 |
| `qwen-coder` | Qwen-Coder | 0.3 | 0.9 | 12000 |
| `tester` | (outils) | null | null | null |
| `claude-reviewer` | Claude Opus | 0.3 | 0.9 | 4500 |

Graphe `exampleCouncilLooped()` / `subgraphLooped()`
(`builder.html:307-328` / `523-542`) : `planner → redteam → explorer → coder →
tester → reviewer` + edge de boucle `reviewer →(NOK) coder`, `maxIterations:5`
(`builder.html:324` / `539`).

### 4. Vraie nature du « looped » — existe-t-il RÉELLEMENT dans TCS ?

**NON. C'est une pure vision, implémentée nulle part.** Trois preuves convergentes :

1. **Les noms de rôle n'existent que dans `llm-lego/`.** Grep
   `claude-planner|gemini-explorer|qwen-coder|claude-reviewer` sur tout le repo
   (hors `node_modules`) → **6 fichiers, TOUS dans `llm-lego/`** (builder.html,
   builder-validate.mjs, loop.test.ts, + les 3 audits). Zéro occurrence dans
   `autopilot.py`, `lab/`, `scripts/`, `ml/`, `docs/`.
2. **Le vrai pipeline multi-agent de TCS a d'AUTRES rôles, et AUCUNE boucle.**
   `lab/chains/prompt_chain_map.json` décrit le pipeline idée→IMP réel :
   `roadmap → redteam → fusion → extract → stage` (5 étapes **linéaires**,
   `prompt_chain_map.json:5-176`), et un catalogue de 6 agents
   `agent-roadmap/redteam/fusion/extract/ceo/worker` (`:242-301`) — des noms
   **totalement différents** des 6 rôles du builder, et **pas la moindre boucle de
   rétroaction** (aucun `loop`, aucun retour coder↔reviewer).
3. **La doc du builder l'assume déjà.** `COUNCIL_BUILDER_PLAN.md:39-53` acte que
   les 6 rôles + 4 boucles viennent d'une **table de référence utilisateur**
   qualifiée « architecture-cible idéalisée (vision) », par opposition au repo
   « v1 = gate ». La décision (C) hybride a délibérément gardé les deux jeux de
   rôles **étiquetés** vision vs réel.

> Note : le « looped » du builder ne modélise même qu'**une seule** boucle (la
> boucle rapide coder↔reviewer), pas les 4 boucles de la table. C'est un **démo du
> mécanisme de boucle du moteur**, habillé des rôles de la vision — rien d'exécuté
> côté TCS.

---

## Décision : **Cas A — clarification (pas remplacement)**

**Pourquoi Cas A et pas Cas B :**
- Il n'existe **aucun** système à 6 rôles/4 boucles dans TCS auquel « aligner
  fidèlement » le looped (Cas B suppose une vraie erreur d'alignement). Le looped
  n'est pas une *mauvaise copie* d'un système réel — c'est une *vision distincte*.
- Le vrai `kaizen_autoloop` = **council 3 voix + exécuteur Claude Code CLI**. Il est
  déjà représentable fidèlement par l'exemple « Council gate v1 » (3 voix) suivi
  d'un nœud exécuteur — mais **ajouter** ce nouvel exemple est explicitement du
  ressort du Cas B, **hors périmètre** d'une passe de clarification.
- Le looped reste une **exploration valide** du mécanisme de boucle du moteur (il
  prouve les itérations NOK→coder). On ne le **supprime pas** ; on lève juste toute
  ambiguïté sur son statut.

**Ce que Cas A change (clarifications, aucun changement structurel/de clé) :**

1. **Libellé de l'exemple** `looped` : `'Council ↻ looped'` →
   `'Council ↻ looped (vision, non implémentée)'` + `loadedMsg` explicite.
   (clé `'looped'` **inchangée** — le harnais Playwright en dépend.)
2. **Bouton palette** looped : texte `CIBLE`→`VISION`, `'Looped — 6 rôles'` →
   `'Looped — 6 rôles (vision)'`, + `title=` tooltip. **Classe `badge-target`
   conservée** (le test asserte `.badge-target count === 1`).
3. **Note canvas** du looped (`note-loop`) : réécrite pour dire explicitement
   « architecture hypothétique à 6 rôles — n'existe nulle part dans TCS. Le vrai
   kaizen_autoloop = council 3 voix (PLAN_REVIEW/RED_TEAM/DIVERGENCE) + subprocess
   Claude Code CLI. »
4. **Label de groupe** `ROLE_PRESETS` : `'cible (table)'` →
   `'cible / vision (non implémentée)'` (les 6 entrées + la liste optgroup
   `builder.html:2368` — `group.startsWith('v1')` reste vrai/faux à l'identique).
5. **Badge inspecteur agent** : texte `CIBLE`→`VISION` + `title=` (`builder.html:2362`).
6. **Commentaires** de code (`builder.html:182-184`, `305-306`) alignés.

**Ce qu'on ne touche PAS :** gate v1 (fidèle), les clés de rôle (loop.test.ts et la
sémantique moteur en dépendent), les classes CSS de badge, le vocabulaire badge des
briques Bibliothèque (`EXAMPLE_BADGE` demo/réel/cible reste — axe « maturité brique »
distinct de l'axe « vision d'archi »).

**Hors scope confirmé :** Rocky, les jeux, l'autorité Search>LLM — jamais dans le
Lego Builder.

---

## Validation prévue

- **Vitest** `npm test` (moteur `src/` inchangé → doit rester vert).
- **Playwright** `builder-validate.mjs` contre `demo-server` (port 3000) : régression
  complète (double-run search/chat, boucle Council itérations, Wire Map 12 entrées,
  Bibliothèque 6 types, HumanGate, auto-validation Oracle) + badges non ambigus.

*Fin Phase 0 — aucun code modifié avant ce point.*
