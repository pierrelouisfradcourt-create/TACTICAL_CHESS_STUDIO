# CLASSIFICATION DES DOCUMENTS — périmètre décision layer

- **Date** : 2026-07-19 · **Statut** : AUDIT (photo à cette date) · `claim_verdict: NO_CLAIM_ALLOWED`
- **Méthode** : lecture directe (en-têtes systématiques, contenu intégral pour les fichiers ambigus), `git log -1 --date=short` par fichier ou par lot homogène, grep de consommateurs réels. Sous-agents de délégation indisponibles cette session (limite de session atteinte) — tout ce document a été produit en exécution directe, pas déléguée. Notation explicite quand un fichier n'a été caractérisé que par nom+date+contexte plutôt que lu intégralement.
- **Périmètre validé par Pierre** : `docs/forge/`, `docs/adr/`, `docs/architecture/`, `docs/control-plane/`, `docs/orchestration/`, `studio_brain/`, `CLAUDE.md`, `FILE_ROUTING_MANIFEST.yaml`, `00_STUDIO_CONTROL/` (classé héritage). `docs/phase0/1/2` scannés puis exclus (voir §6). `llm-lego/` noté hors cœur (§7).

**Catégories** (une seule par document) : `CANONICAL_RUNTIME` · `ARCHITECTURE_REFERENCE` · `DECISION_RECORD` · `AUDIT` · `GENERATED_ARTIFACT` · `LEGACY` · `ARCHIVE_CANDIDATE` · `ROADMAP_ONLY`.

---

## 0. Racine

| fichier | catégorie | justification |
|---|---|---|
| `CLAUDE.md` | CANONICAL_RUNTIME | auto-chargé au boot de chaque session Claude Code (confirmé structurellement — c'est le system prompt de cette conversation) |
| `FILE_ROUTING_MANIFEST.yaml` | CANONICAL_RUNTIME | confirmé TESTED session précédente : consommé par `doc_hygiene_chain.py`, `studio_context_builder.py`, testé par `test_doc_hygiene.py` |

---

## 1. `00_STUDIO_CONTROL/` — 228 fichiers .md (+ 37 YAML déjà classés session précédente)

**Verdict de bloc, ratifié par Pierre ce tour** : héritage, pas runtime actuel. Confirmé par preuve : 197/228 fichiers (86%) partagent EXACTEMENT le même commit `2026-05-25`, et l'écrasante majorité de la sous-arborescence `01_SYSTEM/`+`99_ARCHIVE/` **s'auto-déclare** `status: DOCUMENTED_ONLY`, `Runtime authority: NONE`, `Agent activation: BLOCKED` dans son propre texte — pas une déduction externe, une auto-description.

| lot | catégorie | justification |
|---|---|---|
| 197 fichiers, commit unique `2026-05-25` | LEGACY | snapshot figé, système prédécesseur (loop Codex/local-LLM/HumanGate), cf. audit YAML session précédente pour les 37 YAML homologues |

### Les ~30 outliers (post-05-25) — lus individuellement

| fichier | date | catégorie | justification |
|---|---|---|---|
| `00_MASTER_DOCS/00_VISION.md` | 05-27 | LEGACY | auto-déclaré `status: CANONICAL, authority: HumanGate` — **était** canonique, superseded par `studio_brain/` + `CLAUDE.md` (zéro référence croisée aujourd'hui) |
| `00_MASTER_DOCS/01_ROADMAP.md` | 06-04 | LEGACY | idem — `status: CANONICAL, authority: HumanGate` |
| `00_MASTER_DOCS/02_ROCKY.md` | 06-04 | LEGACY | idem |
| `00_MASTER_DOCS/03_JEUX.md` | 05-27 | LEGACY | idem |
| `00_MASTER_DOCS/04_STUDIO.md` | 06-04 | LEGACY | idem |
| `00_MASTER_DOCS/06_KNOWN_ISSUES.md` | 06-03 | LEGACY | `Status: canonical active issue list` — dernier refresh 06-02, aucune preuve d'usage après |
| `00_MASTER_DOCS/07_CURRENT_STATE.md` | 06-08 (**+ édition non commitée datée 07-01 trouvée dans le working tree**) | LEGACY, avec réserve | **Trouvé cette session** : `git diff` révèle une modif non commitée (07-08 → 07-01 dans le texte, IMPs 119/126/19/1 → 217/218/25/0, autopilot.py ~7487→~9029 lignes) sceau visible dans le `git status` initial de cette conversation. Preuve d'usage humain réel jusqu'à ~début juillet, PUIS abandon — c'est le fichier le plus "vivant" de tout `00_STUDIO_CONTROL/`, mais déjà périmé par rapport à l'état vérifié cette session (ledger réel = 224 CLOSED/4 OPEN, pas 218/25). Cf. mémoire studio : « Ne jamais recréer 01/02/03_* — utiliser 06/07/08 canoniques » confirme que Pierre a RÉELLEMENT traité cette série comme canonique un temps. |
| `00_MASTER_DOCS/08_COMMAND_CHEATSHEET.md` | 05-28 | LEGACY | commandes PowerShell pour `TacticalChessPureLab` — pas revérifié si les commandes existent encore |
| `00_MASTER_DOCS/00_NAVIGATION_INDEX.md` | 06-03 | LEGACY | `Status: CANONICAL_NAVIGATION, Owner: HumanGate` — index de navigation du système ci-dessus, même sort |
| `00_MASTER_DOCS/11_REPRISE_PROMPT.md` | 06-03 | LEGACY | prompt de reprise de session — remplacé fonctionnellement par `studio_brain/00_CURRENT_CONTEXT.md` |
| `00_MASTER_DOCS/AUTOMATION_LANE_MATRIX.md` | 06-06 | LEGACY | `Evidence status: documentation only` — auto-déclaré |
| `00_MASTER_DOCS/ARCHIVE/*` (11 fichiers : `03_JEUX` dupliqué, `00_EXEC_SUMMARY`, `02_ROADMAP_90D`, `04_BENCHMARK_LEDGER`, `06_DECISION_LOG`, `07_PROJECT_HISTORY`, `AAA_TACTICAL_CORE_ARCHITECTURE`, `CURRENT_STATE_INDEX`, `DOCS_STATUS`, `DOC_ARCHIVE_DEMOTION_MAP`, `HYBRID_GAME_AI_PLATFORM_PLAN`, `LOCAL_HISTORY_ROADMAP_STATUS`) | 05-27 | ARCHIVE_CANDIDATE | déjà dans un dossier nommé `ARCHIVE/` — auto-déclarés `DOCUMENTED_ONLY`/« ne crée aucune autorité runtime » ; `DOC_ARCHIVE_DEMOTION_MAP.md` est méta-intéressant : c'est un prédécesseur direct de CE document (une proposition de classification de docs, jamais exécutée) |
| `00_MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/AAA_RUNTIME_UPDATE.md` | 05-27 | ARCHIVE_CANDIDATE | déjà nommé "LEGACY" dans son propre chemin |
| `01_SYSTEM/maps/STUDIO_ARCHITECTURE_TRUTH_MAP_V0.md` | 07-08 | ROADMAP_ONLY | le plus RÉCENT de tout `00_STUDIO_CONTROL/`, mais auto-déclaré `Status: DOCUMENTED_ONLY, Runtime authority: NONE` — source « discussion ChatGPT, modèle organisme, Cognitive Resource Manager, World Intelligence Layer » : de la prospective, pas un état construit |
| `01_SYSTEM/index/CONTROL_INDEX.md` | 05-27 | ARCHIVE_CANDIDATE | auto-déclaré `DOCUMENTED_ONLY`, se prétend « index des surfaces actives » mais n'est référencé par rien de vivant trouvé |
| `01_SYSTEM/index/READ_FIRST.md` | 05-27 | ARCHIVE_CANDIDATE | auto-déclaré `DOCUMENTED_ONLY`, se prétend point d'entrée mais CLAUDE.md ne le référence jamais |
| `99_ARCHIVE/records/STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md` | 05-31 | ARCHIVE_CANDIDATE | `Status: DOCUMENTED_ONLY, Runtime authority: NONE, Agent activation: BLOCKED` — auto-déclaré, déjà dans `99_ARCHIVE/` |
| `99_ARCHIVE/records/DATASET_LEGACY_CHAMPION_TEACHER_INVENTORY_V0.md` | 05-31 | ARCHIVE_CANDIDATE | nommé "legacy" dans son propre titre |
| `AUDIT_MIROIR.md` | 05-31 | AUDIT | `status: ANALYSIS`, point-in-time (Rocky vs Adversaire) |
| `05_AUDIT/AUDIT_MASTER.md` | 06-04 | AUDIT | `claim_verdict: NO_CLAIM_ALLOWED` déjà présent — audit ponctuel |
| `05_AUDIT/KAIZEN_LOG.md` | 06-04 | ARCHIVE_CANDIDATE | log d'évolution d'un système d'audit lui-même abandonné |
| `05_AUDIT/STANDARD.md` | 06-04 | LEGACY | norme d'audit v1.0 du système prédécesseur, superseded par la discipline `software_verdict/evidence_verdict/claim_verdict` actuelle (identique dans l'esprit, mais ce fichier-ci n'est plus la source) |

**Synthèse §1** : les outliers ne sont pas de l'activité récente cachée — ce sont les DERNIERS soubresauts (mai-juillet) d'un système de "MASTER_DOCS" numéroté qui fut réellement canonique et ratifié HumanGate un temps (confirmé par mémoire studio et par l'édition non commitée de `07_CURRENT_STATE.md`), avant d'être abandonné au profit de `studio_brain/00_CURRENT_CONTEXT.md` + `memory/`. Un seul fichier (`STUDIO_ARCHITECTURE_TRUTH_MAP_V0.md`, 07-08) est postérieur à ce basculement, et il s'auto-déclare déjà `DOCUMENTED_ONLY`.

---

## 2. `docs/control-plane/` — 80 fichiers .md + 114 fixtures JSON (194 fichiers)

**Découverte de ce tour** : ce n'est PAS un système inconnu — c'est la documentation du **control-plane de StudioV2** (`scripts/studioV2/control_plane/*.py`, code réel et présent : `build_local_review_pack.py`, `ci_costguard_report.py`, `run_studiopilot_loop_smoke.py`, `smoke_*.py`…), donc rattaché à la lane STUDIO **GELÉE** par CLAUDE.md. `README.md` s'auto-déclare : *« Current status: manual, dry-run, non-canonical… active runtime code: Rust runtime remains the gameplay truth, this index does not change runtime behavior »* — auto-disclaimer clair. 76/77 fichiers `.md` partagent le commit `2026-05-23` (le 77e, `AUTHORITY_MATRIX.md`, date du 05-26) ; les 114 fixtures JSON datent toutes du même 05-23.

| lot | catégorie | justification |
|---|---|---|
| 76 fichiers `.md` racine, commit `2026-05-23` (README, AUTHORITY_MATRIX, LOOP_CONTRACT, LOOP_STATES, STUDIOPILOT_OPERATOR_MANUAL, schema_validation, HUMAN_COMMAND_VOCABULARY_V0, ESCALATION_MATRIX_V0, DIRECTOR_LAYER_V0, STUDIOPILOT_CONTROL_PLANE_V0_AUDIT, + ~66 autres) | LEGACY | doc du control-plane StudioV2, lane frozen par CLAUDE.md ; auto-déclaré "non-canonical" par son propre README |
| `docs/control-plane/fixtures/` (114 fichiers JSON, mêmes dates) | LEGACY | fixtures de test pour les validateurs `scripts/studioV2/control_plane/`, même lane gelée — bulk, non lus individuellement (échantillon de 4 confirmant le pattern : entrées valid/invalid pour schema JSON) |

**Nuance à noter** : contrairement à `00_STUDIO_CONTROL/` (mort par abandon, code cassé), `docs/control-plane/` documente du code qui **existe toujours et pourrait tourner** (`scripts/studioV2/control_plane/*.py` présent sur disque) — c'est gelé par **décision** (gate Pierre 2026-07-19 sur `scripts/studioV2/`), pas par obsolescence technique. Les workflows CI `agent-operator-inspect.yml`/`agent-operator-validate-staged.yml` (confirmés `workflow_dispatch`-only, manuel, session précédente) référencent d'ailleurs ce même code — cohérent avec "gelé mais pas supprimé".

---

## 3. `docs/forge/` — 41 fichiers (40 .md/.html + le nouveau AUDIT_DECISION_LAYER.md)

Cluster le plus dense en signal : mélange de cartes vivantes, d'expériences ratifiées, et d'un volume notable de **travail réel non commité**.

| fichier | statut git | catégorie | justification |
|---|---|---|---|
| `STUDIO_ARCHITECTURE.md` | tracké 07-15 | ARCHITECTURE_REFERENCE | carte compagnon PROPOSED, confirmée maintenue (mise à jour 07-15 visible dans le fichier lui-même) |
| `STUDIO_AGENT_ATLAS.md` | tracké 07-19 | ARCHITECTURE_REFERENCE | idem, mise à jour la plus récente du cluster |
| `STUDIO_MASTER_SCHEMA.html` | tracké 07-15 | ARCHITECTURE_REFERENCE | 3e carte compagnon, même convention |
| `AGENT_CONTEXT_MAP.generated.md` | tracké 07-15 | GENERATED_ARTIFACT | suffixe `.generated.md` — régénéré par `studio_selfaudit.mjs` ou équivalent, ne pas éditer à la main |
| `COMPONENT_DESIGN.generated.md` | tracké 07-15 | GENERATED_ARTIFACT | idem |
| `MASTER_INDEX.generated.md` | tracké 07-15 | GENERATED_ARTIFACT | idem |
| `STUDIO_STATUS.generated.md` | tracké 07-19 | GENERATED_ARTIFACT | confirmé généré par `node scripts/forge/studio_selfaudit.mjs --write` (cité dans STUDIO_ARCHITECTURE.md) |
| `AUDIT_DECISION_LAYER.md` | **non commité** (produit ce tour) | AUDIT | ce document |
| `ASSET_CONTRACT_V0.md` | tracké 07-14 | ARCHITECTURE_REFERENCE | contrat de référence pour les assets, pas relu intégralement — classé par nom+contexte |
| `KB_INGESTION_CONTRACT.md` | **non commité** | ARCHITECTURE_REFERENCE | contrat d'ingestion KB, confirmé réel session précédente (catalog.json, search.mjs) |
| `KB_INGESTION_RESULTS.md` | **non commité** | AUDIT | résultats d'un run d'ingestion — cf. mémoire studio « RÉUSSITE §5 non commitée, gate Pierre » |
| `KB_REDTEAM_ADJUDICATION.md` | **non commité** | DECISION_RECORD | adjudication red-team d'un contrat KB |
| `LIBRARY_MVP.md` | **non commité** | ROADMAP_ONLY | lu intégralement — auto-déclaré `Statut: PROPOSED — design falsifiable… Aucun code, aucun téléchargement` |
| `P1_1_PROPOSAL.md` | tracké 07-12 | DECISION_RECORD | proposition qui A ÉTÉ exécutée (cf. mémoire studio « P1.1 sondes SUCCESS 2026-07-12 ») |
| `P1_1_PROTOCOL.md` | tracké 07-12 | ARCHITECTURE_REFERENCE | méthodologie réutilisée comme gabarit (mémoire studio : « gabarit = P1_1_PROTOCOL.md ») |
| `P1_1_REDTEAM_ADJUDICATION.md` | tracké 07-12 | DECISION_RECORD | adjudication du protocole P1.1 |
| `P1_1_RESULTS.md` | tracké 07-12 | AUDIT | résultats du run P1.1 |
| `P1_2A_E2_PHASE_A_FEASIBILITY.md` | **non commité** | AUDIT | non lu intégralement — pas de confirmation en mémoire studio que ce cycle P1.2A a abouti, à vérifier par Pierre |
| `P1_2A_E2_PROTOCOL.md` | **non commité** | ARCHITECTURE_REFERENCE | idem, non confirmé achevé |
| `P1_2A_E2_REDTEAM_ADJUDICATION.md` | **non commité** | DECISION_RECORD | idem |
| `P1_2A_FTUE_PROFILE_PROPOSAL.md` | **non commité** | ROADMAP_ONLY | proposition, pas confirmée ratifiée |
| `P1_2A_REDTEAM_ADJUDICATION.md` | **non commité** | DECISION_RECORD | idem |
| `P1_MECHANICAL_CONTRACT.md` | tracké 07-12 | DECISION_RECORD | cf. mémoire studio « P1 mécanique falsifié » |
| `P1_MECHANICAL_RESULTS.md` | tracké 07-12 | AUDIT | résultats de la falsification P1 |
| `P2_PRODUCTION_PROPOSAL.md` | **non commité** | ROADMAP_ONLY | proposition, statut de ratification non vérifié |
| `PRISM_SCOPING.md` | tracké 07-13 | ARCHITECTURE_REFERENCE | conception du panel Prisme — confirmé RÉEL cette session (`scripts/forge/panel.py` implémente exactement ce design) |
| `PROJECT_BIBLE.template.md` | tracké 07-15 | ARCHITECTURE_REFERENCE | template réutilisable, pas un état de projet |
| `S10D_CONTRACT_PROPOSAL.md` | tracké 07-12 | DECISION_RECORD | contrat qui A été créé (`scripts/forge/contracts/s10d-oracle-visual.yaml` existe, confirmé session précédente) |
| `S10D_E1_RESULTS.md` | tracké 07-12 | AUDIT | résultats du run E1 |
| `S10D_REDTEAM_ADJUDICATION.md` | tracké 07-12 | DECISION_RECORD | adjudication |
| `S13_RELEASE_PROPOSAL.md` | **non commité** | DECISION_RECORD | lu intégralement — auto-déclaré « RATIFIÉ DANS LE PRINCIPE (Pierre, 2026-07-19) — IMPLÉMENTATION DIFFÉRÉE » ; décision réelle, juste pas encore commitée |
| `S2_5_ARTBIBLE_ADVERSARIAL_NOTE.md` | tracké 07-14 | AUDIT | note d'un des 6 runs réels s2.5-artbible confirmés session précédente |
| `S2_5_ARTBIBLE_DECEPTIVE_PROBE_NOTE.md` | tracké 07-14 | AUDIT | idem |
| `S2_5_ARTBIBLE_GATE4_REDTEAM.md` | tracké 07-14 | DECISION_RECORD | gate 4 = décision, lié au contrat `redteam-artdirector.yaml` (orphelin du mécanisme réel, cf. AUDIT_DECISION_LAYER §3) |
| `S2_5_ARTBIBLE_STABILITY_NOTE.md` | tracké 07-14 | AUDIT | idem série |
| `S9_SEARCH_INTEGRATION.md` | **non commité** | ARCHITECTURE_REFERENCE | confirmé réel — `search.mjs`+`reuse_ratio.mjs` existent (session précédente) |
| `SHMUP_PREPROD_REPORT_2026-07-14.md` | tracké 07-15 | AUDIT | rapport ponctuel préprod du build flagship |
| `FORGE_2_DESIGN.md` | tracké 07-12 | ARCHITECTURE_REFERENCE | design du driver déterministe + gate mutation (confirmé réel : `driver.py`, mutation testing) |
| `FORGE_IMPROVEMENT_REPORT_shmup_run1.md` | tracké 07-15 | AUDIT | rapport d'un run passé |
| `FORGE_STATE_SNAPSHOT_2026-07-13.md` | tracké 07-13 | AUDIT | snapshot daté, déjà périmé par design (un snapshot n'est jamais "à jour") |
| `STUDIO_RUNTIME_ARBITRATION.md` | **non commité** | ROADMAP_ONLY, avec divergence notée | lu intégralement — **s'auto-déclare `Statut: PROPOSED`**, mais `STUDIO_ARCHITECTURE.md` le cite comme « arbitrage ratifié » ailleurs dans le repo. Divergence statut-déclaré vs statut-cité à trancher par Pierre, pas résolue ici. |
| `WORKFLOW_LAB_PROTOCOL.md` | **non commité** | ARCHITECTURE_REFERENCE | méthodologie des expériences WFL (confirmées promues dans `scripts/forge/prisme/` et `panel.py` session précédente + ce tour) |
| `forge-live.html` | **non commité** | UNKNOWN — à vérifier | dashboard HTML « FORGE LIVE — le fil du run », coloré par tier de modèle (Fable/Opus/Haiku/Qwen/non-LLM) ; **pas vérifié si son JS lit une source de données réelle ou si c'est une maquette statique** — ne pas classer sans vérification, flagué en §5 (import cleanup) plutôt que deviné ici |

**Synthèse §3** : 15 des 41 fichiers de `docs/forge/` sont **non commités** — un vrai volume de travail réel (P1.2A, S13, KB ingestion, arbitrage runtime, protocole workflow lab) qui n'existe que dans le working tree local. C'est cohérent avec le pattern déjà trouvé dans `lab/forge_runs/` la session précédente (breakout, collect_runner). Signal d'hygiène répété, pas un cas isolé — voir Livrable 3.

---

## 4. `studio_brain/` — 30 fichiers

Vérifie la discipline auto-imposée par CLAUDE.md (3 tiers : mémoire machine / handoff session / doctrine humaine).

| fichier | date | catégorie | justification |
|---|---|---|---|
| `00_CURRENT_CONTEXT.md` | tracké 07-19 (aujourd'hui) | CANONICAL_RUNTIME | **99 lignes** — respecte la règle CLAUDE.md « <100 lignes » ; à jour à la date d'aujourd'hui ; c'est le fichier de handoff inter-session actif |
| `000_HOME.md` | 07-03 | ARCHITECTURE_REFERENCE | point d'entrée du vault |
| `architecture/system-vision.md` | 07-03 | ARCHITECTURE_REFERENCE | doctrine tier-2, stable |
| `decisions/decision-log.md` | 07-06 | DECISION_RECORD | log de décisions humaines |
| `decisions/DOSSIER_ARBITRAGE_FLAGSHIP_2026-07-19.md` | **non commité** | DECISION_RECORD | dossier d'arbitrage daté d'aujourd'hui, pas encore commité |
| `doctrine/studio-doctrine.md` | 07-03 | ARCHITECTURE_REFERENCE | doctrine tier-2 |
| `gamedesign/lessons.md` | 07-03 | ARCHITECTURE_REFERENCE | leçons de design, référence continue |
| `journal/2026-07-10_reforge_experiment.md` | **non commité** | ARCHIVE_CANDIDATE | déjà dans `journal/` = tier d'archive désigné par convention, rangement correct |
| `journal/archived-memory-referents-2026-07-03/*` (4 fichiers) | 07-03 | ARCHIVE_CANDIDATE | dossier explicitement nommé "archived" — retiré de lecture par CLAUDE.md lui-même (« Référents retirés ») |
| `journal/context-archive-2026-07-05.md` … `context-archive-2026-07-19-strategie.md` (7 fichiers, dont 3 non commités) | 07-05 → 07-19 | ARCHIVE_CANDIDATE | série chronologique correcte, exactement le rôle désigné de `journal/` |
| `meta/mcp-setup.md` | 07-05 | ARCHITECTURE_REFERENCE | doc opérationnelle |
| `meta/vault-usage-guide.md` | 07-03 | ARCHITECTURE_REFERENCE | doc opérationnelle |
| `projects/snake-survivor-genesis.md` | 07-03 | LEGACY | lu intégralement — auto-déclaré **`SUPERSEDED` (note 2026-07-12)**, pointe vers `docs/studio_v2/` (hors périmètre, exclu) |
| `reference/market-reality.md` | 07-03 | ARCHITECTURE_REFERENCE | référence tier-2 |
| `reference/sources-of-truth.md` | 07-03 | ARCHITECTURE_REFERENCE | référence tier-2 (à vérifier si son contenu est lui-même à jour — pas fait ce tour) |
| `state/current-state-2026-06-28.md` | 07-03 | AUDIT | snapshot daté, ~3 semaines périmé au moment de cet audit |
| `state/loops-log.md` | **non commité** | GENERATED_ARTIFACT | confirmé gitignoré (« Log runtime append-only… jamais commité », `.gitignore` ligne dédiée) |
| `workflow/ORCHESTRATEUR_KICKOFF.md` | tracké 07-19 | ARCHITECTURE_REFERENCE | mis à jour aujourd'hui |
| `workflow/llm-loops-and-local-brain.md` | 07-03 | ARCHITECTURE_REFERENCE | doctrine tier-2 |
| `workflow/skills-catalog.md` | 07-03 | ARCHITECTURE_REFERENCE | catalogue — **risque de dérive** : 30+ skills ont été ajoutés depuis 07-03 (cf. liste de session actuelle), pas revérifié si ce catalogue est à jour |
| `workflow/studio-operating-flow.md` | 07-03 | ARCHITECTURE_REFERENCE | doctrine tier-2 |

**Synthèse §4** : `studio_brain/` respecte globalement sa propre discipline — `00_CURRENT_CONTEXT.md` est court et à jour, `journal/` contient bien ce qui devrait y être. Deux réserves : `workflow/skills-catalog.md` (07-03) est probablement en retard sur la liste réelle de skills disponibles aujourd'hui (07-19) ; et 3 fichiers de `journal/` + le dossier `decisions/DOSSIER_ARBITRAGE_FLAGSHIP_2026-07-19.md` sont non commités — même pattern d'hygiène que `docs/forge/`.

---

## 5. `docs/adr/`, `docs/architecture/`, `docs/orchestration/` — 7 fichiers

| fichier | date | catégorie | justification |
|---|---|---|---|
| `docs/adr/ADR-001-moteur-stack-leviathan.md` | **non commité** | DECISION_RECORD | lu intégralement — `Status: Accepted`, décision HumanGate réelle datée 2026-07-08 |
| `docs/adr/ADR-002-forge-studio-integration.md` | tracké 07-10 | DECISION_RECORD, **avec divergence notée** | lu intégralement — le doc s'auto-déclare `Status: DOCUMENTED_ONLY … Runtime authority: NONE … HumanGate: REQUIRED`, **alors que le code réel de `scripts/forge/*.py` cite "ADR-002 gate 1/2/4" comme doctrine RATIFIÉE et opérante** (contract.py, dispatch.py, runtime.py — tous lus cette session). Le champ de statut du document n'a jamais été mis à jour pour refléter que sa doctrine est effectivement appliquée en code. C'est le trou "documenté vs code-enforced" le plus net trouvé ce tour — cf. Livrable 3. |
| `docs/architecture/STUDIO_OS_ARCHITECTURE_v0.1.md` | 06-26 | ROADMAP_ONLY | auto-déclaré `status: DRAFT_FOR_REVIEW, authority: HumanGate (ratification pending)` |
| `docs/orchestration/agent_templates.md` | 06-29 | ROADMAP_ONLY | auto-déclaré `DRAFT analyse — aucun code de prod, aucune exécution` |
| `docs/orchestration/PHASES_1-5_PLAN.md` | 06-29 | ROADMAP_ONLY | auto-déclaré `DRAFT analyse — zéro code de prod, zéro fermeture d'IMP, zéro merge` |
| `docs/orchestration/REPRISE.md` | **non commité** | AUDIT | handoff de session daté (MAJ 2026-06-29), snapshot ponctuel |
| `docs/orchestration/skills_reuse_map.md` | 06-29 | ROADMAP_ONLY | auto-déclaré `PREP, analyse seule… Non câblé` |

**Note** : les 3 docs `orchestration/` de fin juin (`agent_templates`, `PHASES_1-5_PLAN`, `skills_reuse_map`) décrivent un projet d'« Agent Factory » / « orchestration multi-LLM gouvernée » — jamais construit à ce jour (aucune trace dans `scripts/forge/` ou `.claude/agents/`). C'est un ROADMAP abandonné ou simplement pas encore repris, pas un système caché.

---

## 6. `docs/phase0/`, `docs/phase1/`, `docs/phase2/` — scannés puis EXCLUS

Confirmé par lecture directe : 8 fichiers, tous des plans par IMP individuel (`IMP-192_PLAN.md` … `IMP-204_FINDINGS.md`), tous liés à des IMP **CLOSED** dans le ledger (vérifié IMP-204). Ce sont des artefacts de projet ponctuels, pas des documents d'architecture ou de gouvernance de la couche décisionnelle — hors périmètre par nature, pas juste par choix de scope. Non classés individuellement.

---

## 7. `llm-lego/` — hors cœur, noté seulement (102 fichiers .md, non audités)

Système de suivi de projet séparé (méthode "llm-lego" : wire map, briques, roadmap visuelle) déjà documenté en mémoire studio comme lié à plusieurs projets (Belote, Chess TCG, World Intelligence Layer Phase 5, Hygiene sensor). Pas de rôle dans la couche décisionnelle Forge elle-même — c'est un outil de suivi appliqué À des projets, pas un mécanisme de décision/gate/contrat. Laissé hors périmètre par consigne explicite de Pierre ce tour.

---

## Compte total (périmètre inclus)

| catégorie | nombre approx. |
|---|---|
| CANONICAL_RUNTIME | 3 (CLAUDE.md, FILE_ROUTING_MANIFEST.yaml, 00_CURRENT_CONTEXT.md) |
| ARCHITECTURE_REFERENCE | ~30 (docs/forge cartes + contrats-référence, studio_brain tier-2) |
| DECISION_RECORD | ~15 (ADR, adjudications red-team, S13, dossier arbitrage) |
| AUDIT | ~15 (rapports ponctuels, snapshots) |
| GENERATED_ARTIFACT | 5 (les `.generated.md` + `loops-log.md`) |
| LEGACY | ~285 (197 + ~11 outliers MASTER_DOCS + 76 control-plane docs + 1 snake-survivor) |
| ARCHIVE_CANDIDATE | ~25 (00_STUDIO_CONTROL/ARCHIVE + studio_brain/journal) |
| ROADMAP_ONLY | ~12 (proposals non ratifiées, orchestration PREP) |
| **fixtures bulk (non individuellement comptées)** | 114 (docs/control-plane/fixtures, classées LEGACY en bloc) |

Comptes approximatifs sur les lots bulk (00_STUDIO_CONTROL 197, control-plane 76) — précision au fichier près disponible sur demande si nécessaire pour une action spécifique.
