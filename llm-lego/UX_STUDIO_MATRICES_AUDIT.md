# Audit — UX/Studio/OpenClaw + Matrices de gouvernance

> Passe **audit uniquement**. Aucune ligne de code écrite, aucune brique créée.
> Date : 2026-07-03. Toutes les affirmations sont citées `fichier:ligne` et
> vérifiées de première main ou par agent d'exploration (mention le cas échéant).
> Worktrees/copies exclus : `worktrees/`, `repos/games/studioV2_MIGRATED_HOLD*`,
> dossier fullwidth `C：\TACTICAL_CHESS_STUDIO`, `llm-lego/node_modules`.
>
> software_verdict: N/A (audit) · evidence_verdict: MECHANICAL_VALIDATION_ONLY ·
> claim_verdict: NO_CLAIM_ALLOWED

---

## 0. TL;DR

1. **openclaw EXISTE — massivement.** Ce n'est pas qu'un skill : c'est un
   sous-système entier (~90 occurrences, workspace complet `studio/openclaw-workspace/`,
   binaire tiers npm gateway :18789). Statut : **RÉEL mais DORMANT** — `autopilot.py`
   ne l'appelle jamais, et il **viole la doctrine** (`producteur_dur → API Anthropic
   payante`). Verdict des docs : `BLOCKED` / à geler. **Leçon d'échec, pas brique.**
2. **Le concept "builder de briques visuel" a déjà été spécifié à fond** dans
   `UXPILOTE_ECOSYSTEM_*` (chain builder flow, Patch Lab) — jamais implémenté
   (BLOCKED / DOCUMENTED_ONLY). llm-lego = la mise en code de cette vision.
3. **studioV2** = trois choses distinctes : (a) `docs/studio_v2/` = pivot business
   récent, (b) `studioV2_MIGRATED_HOLD` = ancienne racine du repo gelée après fusion,
   (c) `scripts/studioV2/studioctl.py` = CLI mort (0 importeur).
4. **Post-mortem transversal explicite, répété dans 3 docs** : *"surface affichée >
   surface câblée"*. Toutes les tentatives UX précédentes ont été construites comme
   surface sans câblage réel, puis gelées par la gouvernance du projet. C'est LA
   leçon pour llm-lego.
5. **Matrices : sur 17, seules 2 sont ACTIVE-AU-BOOT** (`CLAIM_MATRIX.md`,
   `tool_permission_matrix.json`). L'audit précédent affirmait 3 actives —
   **`AUTHORITY_MATRIX.md` est en réalité DOCUMENTED_ONLY** (0 référence code).
   Une seule matrice est une vraie **donnée-brique** exploitée au runtime :
   `tool_permission_matrix.json` (déjà importée comme oracle).
6. **"Format de sortie manquant" : les 3 lectures sont TOUTES vraies** au niveau
   preuve. La brique Agent n'a aucun champ de format de sortie (A), alors que la
   brique Prompt (`outputFormat`) et Oracle (`verdictField`) en ont ; et les vrais
   agents TCS ont bien un `output_format` explicite (B) + un rapport 3-verdicts
   canonique (C.1). **Ne pas trancher — clarification Pierre.**

---

## Volet 1 — Recherche UX/studio/openclaw

### Découvertes

| Terme | Localisation | Statut | Rapport avec llm-lego |
|---|---|---|---|
| **openclaw** (workspace) | `studio/openclaw-workspace/` (BOOTSTRAP/AGENTS/TOOLS/MEMORY/DREAMS + `openclaw-team.yaml` v3.2 + 4 agents + 28 skills dupliqués) | RÉEL mais **DORMANT** (0 dispatch câblé) | Concept voisin (orchestration agents) **construit autrement** + **leçon d'échec** |
| **openclaw** (config/infra) | `openclaw.json`, `openclaw/providers.yaml`, `openclaw/capabilities.yaml`, `infrastructure/supervisord.conf`, `infrastructure/ports.yaml`, `start_studio.ps1`, `deploy_studio.sh` | config lourde, **surface non câblée** | — |
| **openclaw** (ponts jugés utiles) | `scripts/claude_proxy.py` (:8765), `scripts/canvas_gateway.py` (:8766) | les 2 pièces "à garder" par `RECO_OPENCLAW.md` | infra potentiellement réutilisable |
| **openclaw** (skill) | `.claude/skills/openclaw-install/skill.md` | doctrine install WSL2 | — |
| **openclaw** (décision) | `docs/studio_v2/RECO_OPENCLAW.md`, `docs/studio_v2/06_BUILD_MACHINE_VISION_UX.md`, `docs/studio_v2/LOCAL_BRAIN_LOOP.md` | `software_verdict: BLOCKED` (binaire non vérifié) ; drapeau rouge API payante | leçon d'échec documentée |
| **UX** (cimetière archivé) | `00_STUDIO_CONTROL/99_ARCHIVE/plans/UXPILOTE_*` (~40 fichiers) | **ABANDONNÉ / gelé** candidate-only | **specs = cahier des charges llm-lego** |
| **UX** (prototype web) | `…/UXPILOTE_PROTOTYPE_CANDIDATE_ONLY/` (index.html, app.js) | prototype réel gelé | concept déjà prototypé, jamais promu |
| **UX** (prototype Godot 3D) | `…/UXPILOTE_GODOT_GARDEN_CANDIDATE_ONLY/` (project.godot, GardenMain.tscn, 5 .gd) | prototype 3D **gelé** (data hardcodée) | canvas visuel **construit autrement** (décoratif) — leçon |
| **UX** (specs ecosystem) | `UXPILOTE_ECOSYSTEM_FULL_UX_SPEC_V0.md`, `…_SCREEN_INVENTORY`, `…_INTERACTION_FLOW`, `…_COMPONENT_CONTRACT`, `…_DATA_CONTRACT` | **DOCUMENTED_ONLY** | **"chain builder flow" = concept llm-lego, jamais codé** |
| **UX** (CLI actif) | `scripts/uxpilote/uxpilote_readonly.py` + README | `keep_local_only / DOCUMENTED_ONLY` | viewer read-only, non lié au builder |
| **UX** (audit récent) | `docs/audit/UX_AUDIT_2026-06-29.md`, `STAFF_ENGINEER_AUDIT_2026-06-29.md` | audit cockpit actuel (3 UIs divergentes) | ⚠ alerte "ne pas créer une 4e UI" |
| **studio** (pivot V2) | `docs/studio_v2/` (14 docs numérotés, non trackés) | **pivot business récent** (2026-06-27/28) | contexte stratégique (micro-usine de jeux) |
| **studio** (racine gelée) | `repos/games/studioV2_MIGRATED_HOLD_target_archive_20260601.zip` + tag git `studioV2-root-fusion-verified-2026-05-23` | **ARCHIVE** (ancienne racine migrée) | dette de duplication, à supprimer (gate) |
| **studio** (CLI mort) | `scripts/studioV2/studioctl.py` (3254 L) | **PASSIVE** (0 importeur) — IMP-133 propose archivage | non lié au builder |

### "openclaw" — trouvé ou non

**TROUVÉ, et massivement.** ~90 occurrences. OpenClaw est un binaire tiers npm
(`npm install -g openclaw`, gateway :18789) installé en WSL2, prévu comme couche
d'orchestration multi-agent (coordinateur → producteurs en worktrees isolés) branchée
sur providers Qwen local / claude-proxy / Gemini. **Statut réel = RÉEL mais DORMANT
et coûteux** :
- `docs/studio_v2/RECO_OPENCLAW.md` (2026-06-28) : `software_verdict: BLOCKED
  (openclaw binary non vérifié)` — garder `claude_proxy.py` + `canvas_gateway.py`,
  **déférer** l'orchestrateur, la surface reste `autopilot.py`.
- `docs/studio_v2/06_BUILD_MACHINE_VISION_UX.md` §1 : *"OpenClaw — RÉEL mais DORMANT,
  et coûteux […] `autopilot.py` ne l'appelle jamais (zéro dispatch câblé)"* +
  **drapeau rouge** : `producteur_dur → API Anthropic payante` **viole** la règle
  CLAUDE.md "Jamais API Anthropic externe" + budget < 2k€. Action : **COUPER / geler**.

Le skill `.claude/skills/openclaw-install/` cité dans la mission n'est donc qu'**une
des ~90 traces**, pas la seule.

### Tentatives UX précédentes (uxpilote / studioV2 / autopilote) — le POURQUOI

**uxpilote — pourquoi ça n'a pas abouti :** gelé volontairement par posture de
gouvernance, jamais promu. `00_STUDIO_CONTROL/99_ARCHIVE/records/UXPILOTE_LOCAL_FREEZE_V0.md` :
`Runtime authority: NONE`, `Agent activation: BLOCKED`, `registered_source_truth: false`.
La règle interne *"created ≠ registered ≠ loaded ≠ enforced ≠ evidenced"* l'a maintenu
en limbe `UNKNOWN`. Le Godot Garden : *"Visual quality is not proven by CLI/headless
validation"* → promotion HumanGate jamais accordée. Le prototype ecosystem (chain
builder) : `DOCUMENTED_ONLY / prototype_implementation: BLOCKED`. **Ce n'est pas un
bug technique — c'est un projet noyé sous sa propre cérémonie de non-autorisation.**

**studioV2 — pourquoi :** (a) le vieux repo studioV2 a été archivé/migré (tag fusion
2026-05-23) puis identifié comme **dette de duplication** (`docs/audit/AUDIT_COMPLET_2026-06-27.md`
§7 "surface affichée > surface câblée", gate suppression §8, bloat .git 1,8 Go) ;
(b) studioctl (3254 L) = *"0 importeur, read-only/proposal-only"* — construit, jamais
branché ; IMP-133 propose l'archivage (flag AUDIT : "risque d'aspirer du code actif").

**autopilote (autopilot.py) — pourquoi mitigé :** `AUDIT_COMPLET_2026-06-27.md` §3.5
+ `UX_AUDIT_2026-06-29.md` — pas Flask mais `BaseHTTPRequestHandler` de ~7871 L (51 %
HTML inline), globals réassignés sans lock (data race), path absolu hardcodé, 3 "home"
redondants, données hardcodées présentées comme live, **aucune boucle d'action fermée**
(Council 100 % lecture seule). Verdict : *"IMPLEMENTED, dette structurelle lourde"* ;
boucle autonome dormante (`CHAIN_HISTORY.jsonl` figé au 2026-06-04).

**Post-mortem transversal (répété dans `AUDIT_COMPLET §7`, `UX_AUDIT §1`,
`00_SYNTHESE §1`) :** *"surface affichée > surface câblée"* — chaque couche construite
réellement puis figée (PASSIVE/scaffold) sans être retirée ni branchée. Risque =
**dette d'inertie** (garde-fous fail-open déguisés en fail-closed). **C'est la leçon
directement applicable à llm-lego :** peu de briques, mais chacune câblée à un
oracle/commande réel — inverser le pattern d'échec.

---

## Volet 2 — Matrices de gouvernance (hors jeu)

> Exclus comme demandé : les 4 matrices `lab/project_genesis/` (RNG, géométries,
> coût, interdits-jeu) = contenu de jeu, hors périmètre Lego Builder.

| # | Matrice | Statut réel | Nature | Recoupement existant | Candidate brique ? |
|---|---|---|---|---|---|
| 1 | `00_STUDIO_CONTROL/00_MASTER_DOCS/AUTOMATION_LANE_MATRIX.md` | **PASSIVE** (autopilot.py:1609 `read_text` à la demande) | Doctrine (MD) | 4 lanes SAFE_AUTO/AUDIT_REQUIRED/HUMAN_REQUIRED/FORBIDDEN | Faible (doctrine) |
| 2 | `00_STUDIO_CONTROL/00_MASTER_DOCS/AUTOMATION_SMOKE_MATRIX.md` | **PASSIVE** (autopilot.py:865 `.exists()` seul) | Doctrine (MD) | niveaux smoke 0/1/2/MANUAL | Faible |
| 3 | `…/ARCHIVE/…/AUTOBATTLER_RELECTURE_2026_04_26/05_MATRICES_ET_TABLES_UTILES.md` | **DOCUMENTED_ONLY** | Doctrine (MD) | pointe vers `project_genesis/` (jeu — hors périmètre) | Non |
| 4 | `00_STUDIO_CONTROL/01_SYSTEM/boundaries/CLAIM_MATRIX.md` | **ACTIVE-AU-BOOT ✅** (autopilot.py:64-73 top-level, parse regex) | Doctrine MD **avec champ parsé** | 3 verdicts, `claim_verdict: NO_CLAIM_ALLOWED` | Oui (déjà source d'un contrat de sortie — cf. Volet 3 C.1) |
| 5 | `00_STUDIO_CONTROL/01_SYSTEM/forms/TASK_MATRIX_TEMPLATE_V0.yaml` | **DOCUMENTED_ONLY** | **Données (YAML)** template vide | gabarit tâche, `mutation: BLOCKED` | Faible (inerte) |
| 6 | `00_STUDIO_CONTROL/01_SYSTEM/forms/TASK_PRIORITY_MATRIX_V0.yaml` | **DOCUMENTED_ONLY** | **Données (YAML)** template vide | barème EXTREME→LOW | Faible (inerte) |
| 7 | `00_STUDIO_CONTROL/01_SYSTEM/maps/UXPILOTE_FUSION_MATRIX_VISUAL_SPEC_V0.md` | **DOCUMENTED_ONLY** (cité dans studioctl.py:2049, non chargé) | Doctrine (MD) | spec UI "Fusion Matrix" (jamais implémentée) | Non — mais **pertinent Volet 1** (concept builder) |
| 8 | `00_STUDIO_CONTROL/99_ARCHIVE/records/REPORT_PARSER_TASK_MATRIX_CLOSURE_STATUS_V0.md` | **DOCUMENTED_ONLY** (archive) | Doctrine (MD) | clôture loop report-parser | Non |
| 9 | `00_STUDIO_CONTROL/99_ARCHIVE/records/STUDIO_MASTER_TASK_MATRIX_V0.yaml` | **DOCUMENTED_ONLY / PASSIVE** (studioctl.py:1183/1314 par nom de sortie, pas lu) | **Données (YAML)** rempli ~920 L | tasks/deps/risk_register proposal_only | Faible (archivé/inerte) |
| 10 | `docs/control-plane/AUTHORITY_MATRIX.md` | **DOCUMENTED_ONLY** ⚠ (0 référence code — **démenti audit précédent**) | Doctrine (MD) | qui propose/exécute/valide/merge | Non |
| 11 | `docs/control-plane/ESCALATION_MATRIX_V0.md` | **DOCUMENTED_ONLY** ("does not run escalation") | Doctrine (MD) | règles escalade | Non |
| 12 | `docs/control-plane/STUDIO_CONCEPT_FUSION_MATRIX_V0.md` | **DOCUMENTED_ONLY** | Doctrine (MD) | anti-double-source-de-vérité | Non |
| 13 | `docs/control-plane/V2_REQUIREMENTS_TRACEABILITY_MATRIX_CONTRACT_V0.md` | **DOCUMENTED_ONLY** | Doctrine (MD + `rtm_row` YAML) | contrat RTM traçabilité | Non |
| 14 | `lab/agent_policy/tool_permission_matrix.json` | **ACTIVE-AU-BOOT ✅** (autopilot.py:75-82 `json.loads` + gate câblé:844-854/8618) | **DONNÉES (JSON) — brique** | deny-by-default, 40 tool_rules | **OUI — déjà importée** (`autopilot-oracle-tool-permission-001`) |
| 15 | `schemas/tool_permission_matrix.schema.json` | **PASSIVE** (validation via agent_pr_operator.py, pas au boot) | **DONNÉES (JSON Schema) — validation** | valide #14 (`$schema` link) | Couche schéma (pas donnée) |
| 16 | `lab/gameplay_observation/PR_AUTO_002_AUTOMATION_LANE_MATRIX.md` | **DOCUMENTED_ONLY** (verdict string reconnu par auto_merge_guard.py:143, fichier non lu) | Doctrine (MD) | note PR docs-only de #1 | Non |
| 17 | `lab/gameplay_observation/PR_AUTO_003_AUTOMATION_SMOKE_MATRIX.md` | **DOCUMENTED_ONLY** (verdict reconnu auto_merge_guard.py:144) | Doctrine (MD) | note PR docs-only de #2 | Non |

### Preuves "lu au boot" (grep top-level autopilot.py)

**CLAIM_MATRIX.md — CONFIRMÉ** (autopilot.py:64-73, niveau module = au démarrage) :
```python
_CLAIM_VERDICT = "NO_CLAIM_ALLOWED"
_cm = (REPO / "00_STUDIO_CONTROL/01_SYSTEM/boundaries/CLAIM_MATRIX.md").read_text(...)
_m_cv = re.search(r"claim_verdict:\s*(\S+)", _cm)   # parse au boot
```

**tool_permission_matrix.json — CONFIRMÉ + gate réellement câblé** (autopilot.py:75-82) :
```python
_TOOL_PERMISSION_MATRIX = json.loads(_pm_path.read_text(...))   # boot
# appliqué : _check_tool_permission():844-854 parcourt tool_rules ALLOW/DENY
# gate lane:8618 verify_tool_permission_matrix(lane) bloque l'exécution
```

**AUTHORITY_MATRIX.md — DÉMENTI.** `grep (?i)matrix` sur tout autopilot.py = 0 occurrence
d'`AUTHORITY_MATRIX` ; aucune référence dans `scripts/`. L'audit précédent avait tort :
sur les 3 annoncées "lues au boot", **seules 2 le sont** (CLAIM_MATRIX,
tool_permission_matrix.json) — AUTHORITY_MATRIX est DOCUMENTED_ONLY.

### Recoupement `tool_permission_matrix.json` ↔ schema ↔ oracle importé

- `lab/agent_policy/tool_permission_matrix.json` = **la donnée** (instance de politique,
  `policy_version: 2026-05-08`, 40 règles concrètes). Chargée au boot par autopilot.
- `schemas/tool_permission_matrix.schema.json` = **le contrat de validation** (JSON Schema
  draft-2020-12, enums + `deny_by_default const: true`). Pas de règle de politique, juste
  la forme. Lien : la donnée pointe le schéma via `"$schema": "…"`.
- **Écart notable :** autopilot fait un `json.loads` **sans valider contre le schéma** au
  boot ; la validation schéma est portée par `scripts/studioV2/agent_pr_operator.py`
  (outil à la demande), pas le serveur.
- **Oracle déjà importé :** `llm-lego/library/autopilot-oracle-tool-permission-001.json`
  (`sourceRef: autopilot.py:843-860`, `verdictField: verdict`, `expectedValues: [PASS,
  FAIL]`) — c'est l'oracle **dérivé du gate**, pas la matrice elle-même. Coexiste avec
  `autopilot-oracle-ghost-file-001.json` (dérivé de la logique #1). **La matrice de
  données brute (`tool_permission_matrix.json`) n'est PAS encore une brique en propre —
  seul son gate a été mis en oracle.**

### Matrices non listées par Pierre mais trouvées

**Aucune matrice de gouvernance supplémentaire.** Tous les `*MATRIX*`/`*matrix*` du repo
réel hors périmètre sont : (a) les 17 listés, (b) leurs **doublons** worktree
(`worktrees/routine/`, `worktrees/dur/`, `repos/games/studioV2_MIGRATED_HOLD/` —
identiques, hors périmètre), ou (c) bruit `.venv`/`.venv312` (sympy/numpy/torch). Seules
des **références par nom** existent dans le code (non des fichiers-matrices) :
`scripts/identify_critical_surfaces.py:38,47` (liste `tool_permission_matrix.json` +
`CLAIM_MATRIX.md` comme surfaces critiques), `auto_merge_guard.py:143-144` (verdict
strings), `IMPROVEMENT_LEDGER.yaml`/`ideas.json` (IMP-098).

---

## Volet 3 — Le "format de sortie" manquant

> Les 3 lectures sont **toutes étayées par des preuves**. Je ne tranche pas — la
> clarification vient de Pierre. Fait transversal : **le format de sortie des agents
> réels TCS n'est PAS structuré au niveau API** (`response_format`/`json_object` = 0 hit
> dans autopilot.py) ; il vit dans le *texte des prompts* + parsing défensif + un champ
> descriptif `output_format`. Donc "reproduire le format" = copier un champ descriptif
> (comme Prompt/Oracle l'ont déjà), pas bâtir un mécanisme d'exécution.

### Lecture A — La brique Agent n'a aucun champ "format de sortie" (asymétrie avec Prompt/Oracle)

**Confirmé au niveau code**, `llm-lego/builder.html` :
- Brique `agent` (`newAgentBrick()`, L541-553) : payload = `role, memoire, skill,
  plugin, objectif, gardeFou, notes, modele, temperature, top_p, max_tokens,
  autonomy_level, permissions, allowed_surfaces, forbidden_surfaces`. **Aucun
  `outputFormat`/`outputSchema`/`verdictField`.** (Vérifié de première main sur les
  fichiers `library/agent-*.json` : `autopilot-agent-charter-001`, `agent-producer-001`,
  `agent-mr3kk79n` — même payload, zéro champ de sortie.)
- Brique `prompt` (`newPromptBrick()`, L568-579) : **a** `outputFormat: 'text'` +
  `outputSchema: null` (+ `PROMPT_FORMATS = ['text','json','markdown']` L563, UI
  L2340-2353).
- Brique `oracle` (`newOracleBrick()`, L588-605) : **a** `verdictField: 'verdict'` +
  `expectedValues: ['PASS','FAIL']` (UI L2431-2436). Vérifié aussi sur
  `library/autopilot-oracle-tool-permission-001.json`.
- Les 7 satellites `AGENT_COMPONENT_TYPES` (L262) = `memoire, skill, plugin, role,
  objectif, gardeFou, modele` : **aucun n'est un format de sortie** ;
  `composeAgentPrompt()` (L313-328) les agrège en *system prompt* (entrée), pas en spec
  de sortie. Inspecteur du nœud Agent (L2986-3037) : aucun champ format.

→ **Asymétrie réelle :** Prompt et Oracle ont un contrat de sortie ; Agent n'en a aucun.

### Lecture B — Les vrais agents TCS ont un format de sortie explicite non reproduit

**Confirmé :**
- `lab/chains/prompt_chain_map.json` : champ **`output_format` par step** — `roadmap`
  (:24 "text_libre — liste numérotée"), `redteam` (:59), `fusion` (:94), `extract` (:131
  "JSON array — max 4 objets IMP", + JSON schema complet dans `prompt_extract_cible`
  :202), `stage` (:164 "ROADMAP_PROPOSALS.yaml").
- `lab/chains/run_chain.py` : "FORMAT DE SORTIE" codé par agent — `SYSTEM_TRANSLATOR`
  (:121-176, JSON strict `{task_summary, objective, lane, …, claim_verdict}`),
  `SYSTEM_ENGINEER` (:178-204, `{proposal_id, files_to_edit, forbidden_actions,
  validation_commands, …}`), `SYSTEM_REDTEAM` (:206-230, `{verdict, critical_flaws, …}`),
  `SYSTEM_CLAUDE_CODE_FORMATTER` (:232-284, texte markdown). Parsing défensif client
  (`parse_json_safe` :310-320 ; autopilot.py `_extract_json_array` :1359-1372).
- `schemas/agent_profile.schema.json` (:8-118) : requiert `agent_id, display_name, role,
  autonomy_level, permissions, allowed_surfaces, forbidden_surfaces` — **aucun champ de
  format de sortie non plus.** Ce sont exactement les champs de gouvernance déjà repris
  par la brique Agent (L549).

→ **Nuance clé :** le format de sortie des agents réels vit dans les *prompts de chaîne*
+ le champ `output_format` de `prompt_chain_map.json`, **pas** dans le registre
`agent_profile`. La brique Agent a copié le registre (gouvernance) mais **pas** le
`output_format` de la carte de chaîne.

### Lecture C — Autres lectures plausibles

- **C.1 — Le rapport 3-verdicts canonique** (`software_verdict`/`evidence_verdict`/
  `claim_verdict`). Format de sortie standardisé imposé à TOUT worker, présent partout
  SAUF dans la brique Agent : `run_chain.py` `REQUIRED_FINAL_REPORT_FIELDS` (:48-56),
  `report_template` (:584-595), validé par autopilot.py `REQUIRED_KEYWORDS` (:2120) +
  refus UI sans `software_verdict:`/`claim_verdict: NO_CLAIM_ALLOWED` (:7456-7498), +
  CLAUDE.md. **C'est LE format de sortie canonique d'un agent TCS, jamais attaché dans
  le builder.** (Recoupe directement `CLAIM_MATRIX.md` #4 du Volet 2 — la matrice
  ACTIVE-AU-BOOT qui définit ce contrat.)
- **C.2 — Le contrat inter-agents dans une chaîne** (ce qu'un agent passe au suivant).
  Dans le builder, agents reliés par edges (`toEngineGraph` L379-415) mais **aucun champ
  ne déclare ce que l'agent émet vers l'aval** ; l'infra de provenance existe côté Oracle
  (`data.oracleRef`/`producerRef`, L1954-1983) mais **pas** de déclaration de format côté
  producteur Agent. Réel : sortie Traducteur (JSON) → entrée Ingénieur, etc.
- **C.3 — Un artefact produit.** Type `artefact` existe (L245, "Livrable") mais décoratif
  (exclu de `toEngineGraph` via `NON_EXEC_TYPES` L378) ; un Agent n'a aucun lien
  "je produis cet artefact avec ce format". Lecture plausible mais plus faible.

---

## Recommandation — onglet Matrice dans la Bibliothèque

**Forme uniquement — rien à construire dans cette passe.**

Un **7ème `kind:"matrix"`** est justifié pour **une seule** matrice du Volet 2 :
`tool_permission_matrix.json` — la seule qui soit à la fois DONNÉE STRUCTURÉE et
ACTIVE-AU-BOOT (appliquée par un gate réel). Toutes les autres sont soit de la doctrine
MD (pas une donnée-brique), soit des templates YAML inertes, soit archivées. **Ne pas
créer 17 briques matrix.**

Deux options de forme (décision Pierre) :
- **Option légère (recommandée) — pas de nouveau `kind`.** Traiter les matrices de
  données comme des **sources référencées en lecture seule** (comme l'audit
  `LIBRARY_AUDIT.md` §3 le préconise pour Agent/Roadmap : *"référencer, pas forker"*).
  Le gate `tool_permission_matrix` est **déjà** une brique `oracle`
  (`autopilot-oracle-tool-permission-001`) — pas besoin d'un 2ème type pour la même
  source. Une simple **vue "Matrices"** filtrant les oracles dérivés de matrices suffit.
- **Option `kind:"matrix"` (si Pierre veut la donnée brute distincte du gate).** Schéma
  enveloppe unifié existant (`{id, kind, name, maturity, badge, roadmapRef, payload,
  created, updated}`), payload minimal :
  ```
  payload: {
    source: "lab/agent_policy/tool_permission_matrix.json",  // référence, pas copie
    format: "json" | "yaml" | "md-table",
    runtimeStatus: "active-boot" | "passive" | "documented-only",
    schemaRef: "schemas/tool_permission_matrix.schema.json" | null,
    derivedOracleRef: "autopilot-oracle-tool-permission-001" | null
  }
  ```
  Justification : rend explicite le **runtimeStatus** (la distinction ACTIVE/PASSIVE/DOC
  qui est le vrai enseignement du Volet 2) et **référence** la source au lieu de la
  forker (évite la double-source-de-vérité, risque §5.3 de `LIBRARY_AUDIT.md`).

**Priorité basse.** Le Volet 2 montre qu'il n'y a qu'**une** donnée-matrice vivante, déjà
capturée comme oracle. L'onglet Matrice est cosmétique tant qu'aucune 2ème matrice de
données n'émerge.

---

## Ce qui reste non vérifié / à clarifier

1. **Volet 3 — lequel des 3 sens Pierre vise.** Les 3 lectures sont toutes vraies ;
   c'est une décision de produit, pas de fait. À trancher par Pierre.
2. **`agent_profile.schema.json` vs payload brique Agent** — le schéma réel n'a pas de
   champ de sortie ; si Pierre veut un `output_format` sur la brique Agent, c'est un
   **ajout** (aligné sur Prompt/Oracle), pas une reproduction d'un champ existant du
   registre. À confirmer côté source à imiter (`prompt_chain_map.json.output_format`).
3. **Contenu ligne-à-ligne des ~40 fichiers `UXPILOTE_*`** archivés — seuls les fichiers
   de statut/freeze et les specs ecosystem principales ont été lus ; le reste est
   caractérisé par nom + statut, pas relu intégralement.
4. **`docs/studio_v2/` (14 docs)** — pivot business récent, non tracké git. Résumé par
   agent ; l'impact sur la décision llm-lego (remplacer vs compléter autopilot) reste
   une question ouverte pour Pierre (cf. alerte "4e UI" du `UX_AUDIT`).
5. **openclaw runtime réel** — statut "dormant/0 dispatch câblé" tiré des docs de
   décision, non re-testé par exécution (le binaire tiers n'a pas été lancé — hors
   périmètre audit).
6. **Validation schéma non appliquée au boot** — autopilot `json.loads` la matrice sans
   la valider contre `tool_permission_matrix.schema.json` ; conséquence d'une matrice
   malformée = comportement du gate non vérifié ici.

---

*Fin de l'audit — aucune modification de code, aucune brique créée.*
*software_verdict: N/A (audit) · evidence_verdict: MECHANICAL_VALIDATION_ONLY ·*
*claim_verdict: NO_CLAIM_ALLOWED*
