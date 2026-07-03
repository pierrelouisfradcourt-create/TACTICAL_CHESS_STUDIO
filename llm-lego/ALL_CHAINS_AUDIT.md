# Audit — Toutes les chaînes de TCS

> Passe d'audit pur, lecture seule. Aucune brique créée, aucun fichier TCS modifié.
> Périmètre : dépôt **vivant** uniquement. `worktrees/` et `repos/games/*MIGRATED_HOLD*` /
> `SOURCE_IMPORTS/` sont des copies/holds — **exclus** (doublons de tout ce qui suit).
> Méthode : `find`/`grep` repo-wide + lecture des docstrings/premières lignes + 3 lecteurs
> parallèles + relecture intégrale de `prompt_chain_map.json` et du registre `CHAINS_PYTHON`.

## Résumé exécutif — il n'y a pas *une* famille de chaînes, il y en a **trois**

1. **`lab/chains/*.py`** — les chaînes kaizen/audit Python **réelles et actives** (run_chain,
   doc_hygiene, fusion_matrix, scripts_route, kaizen_*). C'est le gros du gisement importable.
2. **`00_STUDIO_CONTROL/05_AUDIT/chains/*.ps1`** — une **2ᵉ famille distincte** : 5 chaînes
   d'audit PowerShell (hygiene/lab/models/python/rust) du système de fichiers / build. Réelles,
   « brick-ready », effort faible. **Aucun recouvrement** avec `doc_hygiene_chain.py`.
3. **UxPilote (`01_SYSTEM/maps/` + `docs/control-plane/`)** — la **couche doc** qui *spécifie*
   des chaînes de gouvernance ET le concept même d'un cockpit-constructeur-de-chaînes.
   `DOCUMENTED_ONLY` : llm-lego est de fait une ré-implémentation partielle de cette spec.

Et un **registre** qui les relie : `autopilot.py` (`CHAINS_PYTHON`, ligne 46) monte 7 chaînes
dans l'UI studio avec leur lane + gating par `tool_permission_matrix`.

---

## 1. Inventaire complet de `lab/chains/`

### 1a — Modules de code (candidats briques)
« Test ? » = un `test_*.py` dédié existe. Invariant commun à tous : `claim_verdict =
NO_CLAIM_ALLOWED` + taxonomie de lanes `SAFE_AUTO/AUDIT_REQUIRED/HUMAN_REQUIRED/FORBIDDEN`.

| Fichier | Ko | Rôle | Statut | Brique llm-lego | Effort |
|---|---|---|---|---|---|
| **run_chain.py** | 33 | Pipeline LLM 4 rôles Translator→Engineer→RedTeam→Formatter (+`--mode charter`) : idée NL → truth packet → proposition → verdict → prompt Claude Code | réel & actif (test) | **chain** + 4 **prompt** (`SYSTEM_*`) + RedTeam = mini-**oracle** | MOYEN |
| **kaizen_autoloop.py** | 35 | Boucle auto : recall→propose→charter→exécute (subprocess Claude Code)→validate→close→metrics, gating par lane | réel & actif (test, modifié 29/06) | **agent** (orchestrateur autonome) | ÉLEVÉ (dépend governor/council/lock) |
| **kaizen_loop.py** | 17 | CRUD + moteur ROI sur `IMPROVEMENT_LEDGER.yaml` (recall/propose/close/metrics) | réel & actif (importé par autoloop) | **roadmap** (gestion backlog par ROI) | MOYEN |
| **doc_hygiene_chain.py** | 21 | Audit git read-only de l'hygiène doc + routage 4-lanes → packet verdict | réel & actif (test) | **oracle** (+ 4-lanes) déterministe | MOYEN |
| **fusion_matrix_chain.py** | 8.5 | Fusionne les packets doc_hygiene + run_chain + scripts_route → matrice verdict/evidence/risk/contradiction | réel & actif (test) | **oracle** (agrégateur, `@dataclass FusionRow`) | FAIBLE (déjà structuré) |
| **scripts_route_chain.py** | 7 | Audit de la route `scripts/` (path drift, refs mortes) → packet | réel & actif (test) | **oracle** | FAIBLE |
| **chain_executor.py** | 7.5 | Devstral applique un TaskPacket → génère code via LM Studio ; ne commit pas | réel mais **probablement obsolète** (pas de test ; remplacé par le subprocess Claude Code de l'autoloop) | **agent** codeur single-shot | MOYEN |
| **chain_log.py** | 1 | Helper append `CHAIN_HISTORY.jsonl` | utilitaire | **none** | — |
| **roadmap_to_ledger.py** | 22 | Extrait tâches du ROADMAP sans IMP → Qwen les spécifie → `ROADMAP_PROPOSALS.yaml` → ledger | réel & actif (modifié 29/06) | **roadmap** (+ agent/prompt Qwen) | MOYEN |
| **golden_collector.py** | 7.4 | Archive charters d'IMP fermés → `golden_examples.jsonl` (corpus LoRA) | réel & actif (test) | **none** (constructeur de dataset) | — |
| **hg_queue.py** | 5.5 | CLI reader/writer `HUMANGATE_DECISION_LOG.yaml` | réel & actif (test) | **oracle/gate** (au sens porte) ou none | FAIBLE |
| **studio_context_builder.py** | 8 | Génère `STUDIO_CONTEXT.md` (ledger+manifest) injecté en tête des prompts | réel & actif (test) | **prompt** (builder de préambule) | FAIBLE/MOYEN |
| **studio_start.py** | 5 | Loader de contexte de session (phi_history+git+ledger → brief) | réel & actif | **prompt**/utilitaire | FAIBLE |
| **studio_end.py** | 3.8 | Capture 4 scalaires φ(T) déterministes → `phi_history.jsonl` (zéro LLM) | réel & actif | **oracle** (métriques) | FAIBLE |
| **validate_corpus.py** | 2 | Oracle fail-closed sur le corpus golden (≥10 entrées valides) | réel & actif | **oracle** | FAIBLE |
| **validate_packet.py** | 1.2 | Oracle fail-closed sur un truth packet (champs + claim_verdict) | réel & actif | **oracle** | FAIBLE |
| **ledger_patch_20260608.py** / **_20260625.py** | 6.7 / 5 | Migrations one-shot datées du ledger | **one-off jetable** | **none** | — |
| **run_chain.py.bak** | 8.7 | Backup | mort | **none** — exclure | — |

**Regroupement net des candidats :** `chain` = run_chain · `agent` = kaizen_autoloop,
chain_executor(obsolète) · `roadmap` = kaizen_loop, roadmap_to_ledger · `oracle` = doc_hygiene,
fusion_matrix, scripts_route, validate_corpus/packet, studio_end(φ) · `prompt` = les 4 `SYSTEM_*`
de run_chain + studio_context_builder. **À exclure** : chain_log, golden_collector, ledger_patch_*,
`.bak`, `output/`, backups ledger.

### 1b — Artefacts non-code (rôle en 1 ligne)
- **IMPROVEMENT_LEDGER.yaml** (161 Ko, **244 IMP**) + 2 backups datés → source des briques **roadmap** / `impRef`.
- **ROADMAP_PROPOSALS.yaml** (15 Ko) — propositions `PROP-NNN` avec `humangate_verdict` + bloc `imp` → briques **roadmap** prêtes.
- **prompt_chain_map.json** (18 Ko) — carte du pipeline idée→IMP (voir §3).
- **ideas.json** (13 Ko) — backlog d'idées brutes en amont du ledger (input d'un pipeline idée→IMP).
- **CHAIN_HISTORY.jsonl** — journal append-only des exécutions de chains (runtime, pas une brique).
- **FUSION_LOG.jsonl** — log des synthèses de fusion (sortie d'outil).
- **HUMANGATE_DECISION_LOG.yaml** — SSOT des décisions HumanGate (lu par hg_queue).
- **phi_history.jsonl** + **phi_schema.yaml** — scalaires de session φ + leur schéma figé (zéro ML).
- **metrics.json** — snapshot kaizen agrégé (dashboard régénéré).
- **KAIZEN_PROTOCOL.md** — doctrine de la boucle (Status: DOCUMENTED_ONLY) — informatif.
- **audit_codex_memory.md**, **chess_fantasy_audit.md** — rapports d'audit one-shot datés (2026-06-01).
- **golden_examples.jsonl** (82 Ko) + **corpus/** (7 jsonl) — corpus LoRA (⚠ protégé, ne pas supprimer).
- **charters/** (68 `IMP-*_charter.md`) — input/output du corpus golden.
- **claude_prompts/**, **output/** (mai 2026, obsolète), **packets/** (1 EXAMPLE.yaml), **reports/**, **reports/processed/** — sorties datées / gabarits.

---

## 2. Chaînes / mentions « chain » ailleurs dans le repo

### 2a — 2ᵉ famille : chaînes d'audit PowerShell — `00_STUDIO_CONTROL/05_AUDIT/chains/`
**Réelles & actives**, exécutables, registre = `05_AUDIT/AUDIT_MASTER.md` (une exécution réelle
tracée : Hygiene `2026-06-01 → FAIL`, rapport persisté sous `05_AUDIT/reports/`). Squelette
commun : `param($Studio)`, CHECKs numérotés, sévérités CRIT/HAUTE/MOY/BASSE/INCONNU, verdict
final PASS/PARTIAL/FAIL + `claim_verdict: NO_CLAIM_ALLOWED`.

| Fichier | Audite | Nb checks |
|---|---|---|
| `chain_hygiene.ps1` | Bruit du FS (temp `tmp_share_*.html`, `rocky_debug.log` racine, dirs sentinelles, tailles `lab/runs`) | 9 |
| `chain_lab.ps1` | Répertoire `lab/` (ACTIVE_DATASET, JSONL + line counts, ledger/HG présents) | 6 |
| `chain_models.ps1` | Artefacts modèles (`best.pt`/`latest.pt`, `latest_run.json`, GGUF, Stockfish) | 5 |
| `chain_python.ps1` | Code Python (`py_compile` sur ml/ + scripts/, requirements, `__pycache__` orphelin) | 5 |
| `chain_rust.ps1` | Code Rust (`cargo check`/`test`, comptes `.unwrap()`/`panic!()`, fichiers >500 l) | 6 |

**Brique :** chaque `.ps1` = **1 brique `chain`** composée de **N sous-oracles** (chaque CHECK est
un pass/fail à seuil, verdict déjà émis). **La famille la plus « brick-ready » de tout le repo.**
Effort **FAIBLE**. `AUDIT_MASTER.md` = registre → brique **roadmap**/index. ⚠ `chain_hygiene.ps1`
(propreté disque) **≠** `doc_hygiene_chain.py` (routage git/doc) — même mot, cibles différentes,
aucun appel croisé.

### 2b — Registre studio dans `autopilot.py` (raté à la fouille précédente)
`autopilot.py:46` **`CHAINS_PYTHON`** — l'autorité Python de `GET /api/chains`, monte 7 chaînes
dans l'UI avec lane + commande :

| chain_id | label | lane | cmd |
|---|---|---|---|
| recall | Recall | SAFE_AUTO | `kaizen_loop.py recall` |
| audit | Audit hygiène | SAFE_AUTO | `doc_hygiene_chain.py --audit` |
| propose | Propose | SAFE_AUTO | `kaizen_loop.py propose` |
| metrics | Métriques | SAFE_AUTO | `kaizen_loop.py metrics` |
| smoke | Smoke benchmark | AUDIT_REQUIRED | `run_benchmark.ps1 -Smoke` |
| coach | Coach Rocky | AUDIT_REQUIRED | `cargo run -- simulate_chess960` |
| tests | Cargo tests | AUDIT_REQUIRED | `cargo test` |

+ `_CHAIN_TOOL_MAP` (l.85) relie chaque chain à un tool de `tool_permission_matrix.json` pour le
gating (deny-by-default). **C'est le catalogue de ce qui tourne VRAIMENT en prod** — utile pour
savoir quelles chaînes prioriser (celles-ci sont câblées et gatées). Aussi confirmé : autopilot
lit **CLAIM_MATRIX.md** (l.67, IMP-094) et **tool_permission_matrix.json** (l.79, IMP-098) au
boot → ces deux matrices sont **vivantes**, pas décoratives.

### 2c — 3ᵉ famille : couche doc UxPilote (`DOCUMENTED_ONLY`)
- `01_SYSTEM/maps/UXPILOTE_AUDIT_CHAIN_CATALOG_V0.md` — **catalogue de 7 chaînes d'audit UxPilote** :
  `system_truth`, `scripts_route`, `fusion_matrix`, `humangate_queue`, `tool_catalog`,
  `llm_lora_guard`, `runtime_guard`. Chaque entrée a un `chain:` YAML complet (id/label/purpose/
  authority/reads/produces/ux_targets/blocked_actions/humangate_question) + un schéma de sortie
  `uxpilote_chain_output.v0`. **C'est la face doc de la famille `lab/chains/*.py`** (3 déjà
  implémentées : fusion_matrix, scripts_route, hg_queue). → set d'**oracle/chain + HumanGate**, effort MOYEN.
- `01_SYSTEM/maps/UXPILOTE_CHAIN_CONTROL_UX_AND_FRAGMENTED_AUDIT_PIPELINE_V0.md` — **la spec d'un
  cockpit visuel constructeur-de-chaînes** : grammaire Qui/Quoi/Quand/Comment/Où/Pourquoi, gate
  `CREATE_CHAIN`, pipeline fragmenté `Cartographer→HygieneAgent→TruthAgent→FusionAuditor→
  CartographerRedTeam→HumanGate`. **llm-lego réimplémente en partie ceci.** À miner pour le
  méta-modèle des briques : effort FAIBLE (miner) / ÉLEVÉ (réaliser).
- `docs/control-plane/PATCH_CHAIN_ANALYZER_CONTRACT_V0.md` — analyseur passif d'une *séquence de
  patchs* (ordre/dépendance/scope/routage/autorité), verdicts PASS/HOLD/BLOCKED/SPLIT/REORDER/
  ESCALATE. → 1 brique **oracle**, I/O spécifié, effort MOYEN.
- `docs/control-plane/REPORTING_CHAIN_V0.md` — flux de reporting org (Workers→…→Human Founder) +
  règles de packetisation. Conceptuel → brique roadmap/org, effort ÉLEVÉ, faible valeur brique.
- `99_ARCHIVE/plans/UXPILOTE_3D_UX_PATCH_CHAIN_QUEUE_V0.yaml` — **ARCHIVÉ**. Esquisse `node_types`
  (chain/task_queue/blocked_action/humangate_decision) + `edge_types` (reads/routes_to/depends_on/
  blocked_by/requires_humangate) → **taxonomie briques/edges directement réutilisable** pour
  llm-lego, effort FAIBLE à récolter.

### 2d — `autopilot.py` — fonctions « chain » (186 occurrences)
Au-delà des prompts déjà minés : `run_chain()`/`run_chain_json()` (runners subprocess),
`read_chain_history()`, `_check_tool_permission(chain_id)`/`verify_tool_permission_matrix()`
(gating), `_parse_chain_ts()`. C'est de la **plomberie d'orchestration** (pas des briques en soi)
mais elle documente comment les chaînes sont invoquées + gatées — utile pour reproduire le
comportement d'exécution des briques chain dans llm-lego.

---

## 3. `prompt_chain_map.json` — lecture complète (v1.1, 2026-06-05)

**Exactement 13 clés top-level, aucune clé cachée.** (Confirmé.)

| Clé | Type | N | Contenu / forme |
|---|---|---|---|
| `generated_at` | str | 1 | `"2026-06-05"` |
| `version` | str | 1 | `"1.1"` |
| `source` | str | 1 | `"audit IMP-087 + fixes IMP-089 appliqués"` |
| `chain` | array | **5** | Étapes 1-5 (roadmap/redteam/fusion/extract/stage). Objets **~30 champs** : `role_current/pre_imp089/target`, `temperature_current/target`, `max_tokens_*`, `context_received/missing[]`, `prompt_current/pre_imp089/target`, `persisted_*`, `blind_spots[]`, `garde_fou`, `value_rating`, `status` |
| `zones_ombre` | array | 7 | Angles morts du pipeline (« REDTEAM ne voit pas idea_content », « aucune étape n'accède au codebase »…) |
| `zones_ombre_adressees_imp089` | array | 7 | Angles morts corrigés par IMP-089 |
| `system_prompt` | obj | 1 (5 champs) | `fichier, taille, inject_via, contenu_injecte, limite` — injection 04_STUDIO.md[:2000] |
| `prompt_extract_cible` | str | 1 | Texte cible complet du prompt EXTRACT |
| `top3_recommandations` | array | 3 | Recommandations déjà faites (IMP-089) |
| `top3_recommandations_restantes` | array | 3 | Recommandations restantes |
| `architecture_ideale` | array | **3** | Pipeline idéal 3 étapes : `step, name, role, model, max_tokens, temperature, note` |
| `agents_a_creer` | array | **6** | `id, name, role, model, chaine, statut, a_calibrer` (+`calibration`) — **6 agents, pas 3** |
| `lm_config` | obj | 1 (6 champs) | `LM_MODEL(qwen2.5-14b), LM_MODEL_CEO(qwen3.6-27b), temperature_global(0.4), temperature_per_step, routing, system_prompt_builder` |

**Ce fichier est un « rapport de fouille déjà fait, en JSON »** : il porte pour chaque étape la
version *courante* ET *cible* du prompt, la distinction obsolète (`pre_imp089`) vs valide, les
angles morts, et les 6 agents à créer avec leur modèle. C'est la matière la moins chère à importer.

---

## 4. Recoupement avec l'existant llm-lego

### Chaîne idée→IMP (brique actuelle partiellement fictive) — à remplacer par…
La source canonique de remplacement est **`prompt_chain_map.json` clé `chain`** (les 5 étapes
avec `prompt_target`) + **`architecture_ideale`** (la version idéale 3 étapes). C'est là que
vivent les *vrais* prompts cibles + les garde-fous par étape — pas le nœud fictif `qwen-coder`
ni les prompts copiés. ⚠ **Distinction à trancher** : `run_chain.py` est une chaîne LLM **réelle
mais DISTINCTE** (Translator→Engineer→RedTeam→Formatter, mode charter), pas le même pipeline que
idée→IMP (roadmap→redteam→fusion→extract). Ce sont probablement **deux générations** ; avant
d'importer, décider laquelle est canonique (l'idée→IMP de prompt_chain_map semble la plus
récente/documentée, IMP-089).

### Profil LM (brique unique) — correction confirmée : **2 profils, et 6 agents**
- `lm_config` confirme **deux** profils : Director `qwen2.5-14b @ 0.4` et CEO `qwen3.6-27b`
  (routage `_infer_task_type` → ceo_brief/fusion_deep → CEO). → « Profil LM » = **2 briques preset**.
- `agents_a_creer` = **6 agents** déjà porteurs de leur `model` + `calibration` → comblent
  nativement le champ modèle vide des 5 seeds. Aucun autre profil de modèle séparé trouvé ailleurs
  (les 5 seeds n'ont pas de profil ; run_chain utilise le même LM_MODEL global).

### Oracles (6 déjà importés depuis autopilot.py) — fort enrichissement disponible
Les 6 oracles actuels sont un **petit sous-ensemble**. Sources d'oracles supplémentaires, réelles :
- **`doc_hygiene_chain.py`** → oracle 4-lanes (SAFE_AUTO/AUDIT_REQUIRED/HUMAN_REQUIRED/FORBIDDEN)
  + audit commit + file-routing = le **CLAIM_MATRIX 4-lanes** que `COMPLETENESS_AUDIT` disait manquant.
- **5 chaînes ps1** → ~30 oracles mécaniques (cargo check, unwrap-count, py_compile, tailles disque…).
- **fusion_matrix_chain** (agrégateur de verdicts), **scripts_route_chain**, **validate_corpus/packet**, **studio_end** (φ).
- ⚠ **`tool_permission_matrix.json` est la SOURCE** de l'oracle « tool permission matrix » déjà
  importé — l'importer comme brique de référence fermerait la boucle (aujourd'hui l'oracle existe,
  sa matrice-source non).

---

## 5. Index des ~20 matrices

**Aucun index canonique dans le repo** — vérifié : aucun fichier `*MATRIX_INDEX*`/`*matrices*` ;
`CONTROL_INDEX.md` et `00_NAVIGATION_INDEX.md` ne les listent pas. Le seul « Matrix Index » est
`matrix_index.md` dans la **mémoire auto** de l'assistant (hors dépôt). → les 20 matrices sont
**éparpillées**. (À décider plus tard : créer un index repo, ou pas.)

Inventaire de surface (dépôt vivant, 20 fichiers) — **DONNÉES/LOGIQUE** = table de valeurs/règles
importable ; **DOCTRINE/TEXTE** = conceptuel, informatif :

| Matrice | Rôle | Type | Priorité fouille |
|---|---|---|---|
| `01_SYSTEM/boundaries/CLAIM_MATRIX.md` | Champs verdict (software/evidence/claim) + restrictions | **DONNÉES** — lue par autopilot au boot | **HAUTE** |
| `lab/agent_policy/tool_permission_matrix.json` | Policy deny-by-default par agent/tool | **DONNÉES** — lue au boot | **HAUTE** (source oracle existant) |
| `schemas/tool_permission_matrix.schema.json` | JSON-Schema de la policy ci-dessus | **DONNÉES** | MOYENNE |
| `docs/control-plane/AUTHORITY_MATRIX.md` | Table acteur × action (propose/execute/merge…) | **DONNÉES** | HAUTE |
| `01_SYSTEM/forms/TASK_MATRIX_TEMPLATE_V0.yaml` | Schéma template de task-matrix | **DONNÉES** | BASSE |
| `01_SYSTEM/forms/TASK_PRIORITY_MATRIX_V0.yaml` | Schéma scoring priorité | **DONNÉES** | BASSE |
| `99_ARCHIVE/records/STUDIO_MASTER_TASK_MATRIX_V0.yaml` | Record master task-matrix (archivé, PASSIVE) | **DONNÉES** (archivé) | BASSE |
| `lab/project_genesis/…/09_matrice_des_interdits_et_garde_fous.md` | Combos interdits (combo/status/danger/fix) | **DONNÉES** (balance jeu) | MOYENNE (≠ control-plane) |
| `lab/project_genesis/…/21_matrice_de_co_t_complete.md` | Tables coût stat (ATK/PV→coût) | **DONNÉES** (balance jeu) | MOYENNE |
| `lab/project_genesis/…/23_matrice_des_geometries.md` | Poids fréquence géométries | **DONNÉES** (balance jeu) | MOYENNE |
| `00_MASTER_DOCS/AUTOMATION_LANE_MATRIX.md` | Surfaces auto vs revue humaine | DOCTRINE | BASSE |
| `00_MASTER_DOCS/AUTOMATION_SMOKE_MATRIX.md` | Smoke minimal par lane | DOCTRINE | BASSE |
| `01_SYSTEM/maps/UXPILOTE_FUSION_MATRIX_VISUAL_SPEC_V0.md` | Spec UX d'affichage fusion (no impl) | DOCTRINE | BASSE |
| `docs/control-plane/ESCALATION_MATRIX_V0.md` | Règles d'escalade vers Human Founder | DOCTRINE | BASSE |
| `docs/control-plane/STUDIO_CONCEPT_FUSION_MATRIX_V0.md` | Collision concepts mega-pack × surfaces | DOCTRINE | BASSE |
| `docs/control-plane/V2_REQUIREMENTS_TRACEABILITY_MATRIX_CONTRACT_V0.md` | Contrat RTM (exigence→source→décision) | DOCTRINE | BASSE |
| `99_ARCHIVE/records/REPORT_PARSER_TASK_MATRIX_CLOSURE_STATUS_V0.md` | Note de clôture report-parser | DOCTRINE | — |
| `lab/gameplay_observation/PR_AUTO_002_*` / `PR_AUTO_003_*` | Descriptions de PR (changelog) des 2 matrices auto | DOCTRINE | — |
| `lab/project_genesis/…/08_matrice_rng_consolidee.md` | Axes de génération RNG (pas de valeurs en tête) | DOCTRINE | BASSE |
| `…/ARCHIVE/…/05_MATRICES_ET_TABLES_UTILES.md` | Recueil de matrices/tables (archivé contexte) | DOCTRINE | — |

**9 DONNÉES / 11 DOCTRINE.** Les plus « brique » côté control-plane : CLAIM_MATRIX, AUTHORITY_MATRIX,
tool_permission_matrix (les 3 opérationnelles). Les 4 matrices `project_genesis` sont des vraies
tables de valeurs mais **du jeu** (balance TCG), pas du control-plane — fouille dédiée séparée.

---

## 6. Recommandation de priorisation (valeur / effort — sans rien construire)

Ordre proposé, du meilleur ratio au plus coûteux :

- **Passe 1 — Réparer/importer le pipeline idée→IMP (FAIBLE effort, HAUTE valeur).** Source :
  `prompt_chain_map.json` (`chain.prompt_target` + `architecture_ideale`) + importer les **6
  `agents_a_creer`** (avec modèle) + les **2 profils `lm_config`**. Corrige la brique vedette
  fictive ET comble le champ modèle des agents. Données déjà structurées.
- **Passe 2 — Importer les 5 chaînes d'audit ps1 (FAIBLE, HAUTE).** 5 briques `chain` + ~30
  sous-oracles mécaniques + `AUDIT_MASTER` comme registre. La famille la plus brick-ready ;
  fournit la doctrine 4-lanes en oracles concrets.
- **Passe 3 — Importer les oracles/chaînes `lab/chains` déjà testés (FAIBLE-MOYEN).** doc_hygiene
  (4-lanes), fusion_matrix (la matrice de fusion), scripts_route, validate_corpus/packet.
  + `ROADMAP_PROPOSALS.yaml` + ledger 244 IMP → briques **roadmap** (type aujourd'hui vide).
- **Passe 4 — Matrices opérationnelles (FAIBLE-MOYEN).** CLAIM_MATRIX + AUTHORITY_MATRIX +
  tool_permission_matrix (les 3 vivantes, lues au boot) comme briques oracle/référence.
- **Passe 5 — Chaînes LLM lourdes (MOYEN).** run_chain.py (chain + 4 prompts `SYSTEM_*`) après
  avoir tranché run_chain vs idée→IMP ; kaizen_loop / roadmap_to_ledger.
- **Passe 6 — Agents orchestrateurs (ÉLEVÉ).** kaizen_autoloop (dépend governor/council).
  chain_executor = **ne pas importer** (obsolète).
- **Différé / séparé.** Couche doc UxPilote (méta-modèle briques/edges — à miner pour la taxo,
  pas à exécuter) ; matrices `project_genesis` (balance jeu, autre chantier) ; PATCH_CHAIN_ANALYZER
  et REPORTING_CHAIN (specs, faible valeur brique).
- **Ne jamais importer.** ledger_patch_* (one-off), `.bak`, `output/`, backups ledger, chain_log,
  golden_collector (constructeur de corpus, pas une brique) ; ⚠ **ne pas toucher** golden_examples.jsonl / corpus/.

---

## 7. Ce qui reste non vérifié (passes ultérieures si utile)

- **Duplication run_chain vs prompts déjà importés** : les 4 `SYSTEM_*` de run_chain.py n'ont pas
  été comparés mot-à-mot aux 4 prompts autopilot déjà en lib — possible recouvrement/génération.
- **run_chain vs idée→IMP** : lequel est canonique n'est pas tranché (deux générations probables).
- **Logique interne complète** des gros modules (run_chain, kaizen_autoloop, roadmap_to_ledger) :
  seuls docstring + structure lus, pas le flux ligne-à-ligne ni les dépendances (governor/council).
- **Exécutabilité réelle aujourd'hui** des 5 ps1 (une seule exécution tracée, 2026-06-01 ; les 4
  autres « NON EXÉCUTÉ »).
- **Contenu détaillé des matrices** : classées en surface (15-20 lignes), pas fouillées ; les 4
  matrices `project_genesis` (balance TCG) méritent une passe dédiée séparée du control-plane.
- **Compatibilité de schéma** entre `uxpilote_chain_output.v0` / node_types UxPilote et l'enveloppe
  de brique llm-lego — non vérifiée.
- **`worktrees/` et `repos/games/*` exclus** : supposés doublons/holds ; non diffés contre le
  vivant (si divergence, hors périmètre de cette passe).

---

software_verdict: OK — inventaire exhaustif lab/chains/ + 2 familles chain supplémentaires + registre autopilot + prompt_chain_map intégral + 20 matrices, dépôt vivant
evidence_verdict: MECHANICAL_VALIDATION_ONLY — find/grep + docstrings + lecture ciblée ; statuts « obsolète » inférés (présence de test, dates, chemins ARCHIVE), non prouvés par exécution
claim_verdict: NO_CLAIM_ALLOWED
