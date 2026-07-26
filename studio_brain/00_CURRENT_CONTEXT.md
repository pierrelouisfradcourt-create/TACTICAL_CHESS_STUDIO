# Contexte courant TCS

## Session 2026-07-26 (Fable, suite) — Troisième Cerveau : décisions D1→D6 + pré-run TERMINÉ
- **D1→D6 tranchées par Pierre** (détail : `decisions/PROPOSED_2026-07-26_ratifications.md`,
  entrée THIRD_BRAIN_DECISIONS_V1) : D4 ratifications → decision-log versionné (skill `/gate`
  migré le jour même, DREAMS.md legacy) · D1 échelle 4 crans mécaniques · D3 sunset 30 j ·
  D6 commits 3 lots (fait) · D2 plafond ACCEPTÉ-valeur-différée · D5 injection mesurée
  ACCEPTÉE-exécution-différée. **Push non validé** (gate séparée).
- **Pré-run exécuté** : suppressions éditoriales appliquées (arbre de triage unique §7.5,
  roadmap canonique unique V1 §6, cran « optimisé » retiré) · `lab/forge_runs/RUN_INDEX.md`
  créé (append-only, entrée M1 pré-remplie) · mission AAA complète :
  `docs/forge/MISSION_M1_TELEMETRIE_ECHEC.md` (PRÉPARÉE, NON LANCÉE).
- **Docs cadres** : `docs/forge/THIRD_BRAIN_PROTOCOL_V1_PROPOSAL.md` (P0-P8, runbook §7,
  table de confiance §4.2) + `THIRD_BRAIN_V1_1_BRICKS.md` (5 briques). PROPOSED — la
  promotion au decision-log par Pierre vaudra ratification.
- **Prochaine étape** : go Pierre sur l'EXÉCUTION de M1 → puis 1 run réel observé → fixer
  valeur D2 → M2 (pool_retry) → M3 (jointure premortem) → exécution D5.
- **Décisions différées** : `decisions/DEFERRED.md` (12 entrées DR-01→DR-12, chacune avec
  rappel date/événement + question exacte) — relu à CHAQUE début de session (runbook §7.1.4) ;
  prochaine échéance datée : **2026-08-25** (DR-03, DR-05, DR-08, DR-10).
- **État attendu atteint : « pré-run terminé → première mission Forge prête ».**
- **Schéma maître réaligné** (`d08ddd6` + `ddcc44e`) : vision A·B·C studio, Détail I (troisième
  cerveau), Détail J (calendrier unique), **Détail H-bis = la vue de pilotage** (une case par
  élément en attente, accrochée au rail des jeux, code couleur décision/attente/prêt).
- **CLÔTURE SESSION 2026-07-26** : dépôt propre, master local = origin **+6 commits NON POUSSÉS**
  (push = validation Pierre, réveillera DR-09). Ouvert pour Pierre au JALON 0 : ① promotion
  decision-log (= ratification protocole) · ② go exécution M1 · ③ arbitrage M01 candidate ·
  ④ chantier s10s→driver (mission Forge à contractualiser). Prochaine session = dérouler le
  JALON 0 puis reprendre Pong sous standard (H-bis).

## Session 2026-07-26 (Fable) — CONSOLIDATION : 7 branches + 5 worktrees → `master` seul
- **Demande Pierre** : « je veux plus de branche du tout », dépôt « méga dirty » → démêler proprement.
- **Résultat** : une seule branche locale (`master`, 114 commits d'avance sur origin), worktree
  **propre (0 fichier sale)**, 5 worktrees TCS démontés. **Poussé le même jour sur go Pierre**
  (`87e9ec4..1481d6d`) ; le travail POST-consolidation (primitives, learning, THIRD_BRAIN)
  reste non commité.
- **Méthode zéro-perte** : 3 commits WIP de sauvegarde AVANT toute fusion (`8bcdf8a` principal —
  229 fichiers ; `d77fb30` godot-etape0 — Pong ; `b9ec14e` menagerie — le jeu du 11/07 qui
  n'existait QUE dans un worktree non commité). Aucun `checkout` sur du travail non sauvegardé
  (leçon `feedback_git_checkout_uncommitted_forge_work`).
- **5 conflits, TOUS résolus par addition/union — aucune version écartée** : `dispatch.py`
  (`run_dir` Context Manifest **+** `profile/attempt/allow_unprofiled` D1) · `run_real.py`
  (`premortem_section` **+** section PROJECT BIBLE) · `00_CURRENT_CONTEXT.md` (journaux fusionnés) ·
  `oracles.json` (17 **+** menagerie_tactics = 18) · `forge_project_proposals.jsonl` (ligne
  réinsérée à sa place chronologique).
- **Conflit SÉMANTIQUE invisible au merge textuel, attrapé par les tests** : `hook_guard.MARKER`
  était passé à 3 groupes (triplet `etape:run_id:attempt`, 3e optionnel) côté godot pendant que
  le côté 24/07 ajoutait l'injection automatique du marqueur 2-champs. Comportement fusionné
  correct (rétro-compat assumée, `attempt=0`) ; 2 tests comparaient des tuples de longueur figée
  → réécrits via `marker_key()`, intention préservée (unicité + valeurs). **`scripts/forge/tests/`
  modifié — à ratifier par Pierre.**
- **Preuves relancées sur master consolidé** : `pytest scripts/forge/tests/` = **810 passed,
  1 skipped** · `git status` = **0**.
- **⚠️ 10 commits Codex ORPHELINS trouvés** (audit sécurité 2026-05-28, F-001..F-028 : `search.rs`
  debug inconditionnel retiré, `ACTIVE_DATASET` UTF-16→UTF-8, `dataset_loader.py`, restructure
  MASTER_DOCS). Ils n'étaient dans AUCUNE branche → **protégés par le tag
  `archive/codex-audit-securite-2026-05`** (un tag, pas une branche). **Sort à trancher : Pierre.**
- **⚠️ Non touché volontairement (décision Pierre)** : les 2 worktrees Codex hors dépôt
  (`~/.codex/worktrees/db55` 3 fichiers sales · `dbdf` **1154 fichiers sales non examinés**) ·
  le stash `tcs-session-dirty` (artefacts lane STUDIO gelée, ne s'applique plus tel quel) ·
  les branches distantes `origin/*` (supprimer = push = gate).
- **⚠️ Constat non causé par la consolidation** : `cargo test --release` = **244 passed, 5 failed**
  (`regression_589s`, `s7_removed_italian_not_a1b1`, `s7_removed_mate_in_3_score`,
  `stalemate_root_returns_none_and_no_mate_score`, `mirror_ordering_real_penalty_...`).
  **Prouvé pré-existant** : aucun fichier `.rs`/`Cargo.*`/`tests/`/`benches/` ne diffère entre
  `origin/master` et HEAD ⇒ binaire testé strictement identique.
- **Défaut repéré au passage** : les tests Forge écrivent des manifests hors de `tmp_path`
  (`lab/forge_runs/_orphan_context/**` et un `context/` **à la racine du dépôt**), désormais
  commités. À corriger (fixture) ou à ignorer explicitement.

## Session 2026-07-25 (Fable, suite) — Context Loop GO implémenté (chemin ratifié Pierre)
- **Livré, testé, NON commité** : `scripts/forge/context_manifest.py` (2 kinds signés HMAC :
  dispatch = photo sources+contract_sha256+payload_prompt_sha256, execution =
  final_prompt_sha256+chars+premortem_sha256+budget) · `model_windows.json` (fenêtres à
  calibrer) · câblage best-effort dans `prepare_dispatch` + `claude_executor` (jamais
  bloquant, driver.py intact) · `verify_run` étendu (context_manifest_problems/notes,
  hors gates) · `context_check.mjs` advisory (diff+score FRESH/STALE_WARNING/
  STALE_CRITICAL/REQUIRES_REFRESH/NO_MANIFEST + budget + recommandations texte, exit 0).
- **Preuves relancées par l'orchestrateur** : pytest 516 passed (490+26) · node 34/34 ·
  intégration croisée sur sonde réelle : manifest signé (HMAC OK) → lu par le Node,
  dérive « wiremap added » → REQUIRES_REFRESH. Sonde _ctx_smoke supprimée.
- **Trou attrapé et corrigé en couture** : statut `added` absent de ma spec de score
  (FRESH à tort) → corrigé + 2 tests. Leçon : le test d'intégration orchestrateur entre
  deux agents parallèles reste obligatoire.
- **Prochaine étape (chemin Pierre)** : run Forge réel observé → mesurer les dérives
  réelles → ensuite seulement décider refresh auto / transcript / impact graph.
- **V2 Context Continuity (même jour, architecture seule)** :
  `docs/forge/CONTEXT_LOOP_V2_PROPOSAL.md` — 6 briques (refresh delta A · reads index B ·
  impact C · checkpoint handoff 4 · héritage contrôlé/Core Memory 5 · wiremap_nav 6),
  ordre recommandé : run observé → nav → B-lite → checkpoint → héritage → refresh → impact.
  Contrainte clé : pas de métrique fenêtre live en claude -p ⇒ handoff aux frontières
  d'activation (retry/escalade), checkpoint = état structuré falsifiable ≠ résumé.
  5 décisions D1-D5 en attente (D1 = ressusciter PROJECT_BIBLE en Core Memory ou supprimer).
- **D1-D5 RATIFIÉES Pierre (retour architecture, même jour)** : doc consolidé (§0 — trois
  mémoires courte/longue/forensic, pyramide de contexte, BIBLE/CORE_MEMORY/ARCHIVE séparés,
  ordre final : run observé → nav → checkpoint → sonde stream-json → core memory → refresh
  → impact). Brique 6 (wiremap_nav, D2 « GO maintenant ») lancée en construction.
- **Brique 6 LIVRÉE (même jour, non commitée)** : `scripts/forge/wiremap_nav.mjs` +
  39 tests verts (relancés orchestrateur) — requêtes avant/inverse validées sur les 2
  régimes réels (shmup_slice driver / card_engine prose « traçabilité réduite »),
  branchements checkpoint/manifest prêts (dormants faute de données), affichage modèles
  dédoublonné ×N. Découverte honnête : filtre startsWith capture shmup_slice_art
  (run voisin, affiché status=n/a, jamais inventé). Suite mjs complète : 244+39 verts.
- **Reste pour dérouler l'ordre D5** : choix Pierre du jeu/objectif du run observé (étape 0)
  + éventuel commit de sauvegarde (patch fiabilisation + context loop + nav, ~10 fichiers).
- **WHY (retour Pierre, même jour)** : évalué comme primitive du DISPATCH —
  `docs/forge/WHY_ACTIVATION_PRIMITIVE.md`. Découverte : champ 16 du schéma prévoyait
  déjà « pourquoi l'agent existe » et a dégénéré en topologie jamais rendue au prompt.
  Proposition : `why {type, ref falsifiable, text}` au dispatch + manifest + checkpoint ;
  pilote manuel au run observé (H1-H3, contre-exemple cherché). Décisions W1-W4 en attente.

## Session 2026-07-25 (Fable) — Agent Context Audit (pré-run, lecture seule)
- **Livré** : `docs/audit/AGENT_CONTEXT_AUDIT_2026-07-25.md` — bootstrap/runtime/persistent
  des agents Forge, 3 sous-agents contre-vérifiés. 8 écarts E1→E8.
- **Clés** : mandatory_read = consigne (s0→s6 sans outil Read) · prompt non versionné ni
  reconstituible · aucune trace de ce qu'un agent LIT (json only, pas de transcript) ·
  search KB : 5 requêtes historiques, toutes matchCount:0 · contrat/prompt modifiables
  post-validation (HMAC ne signe pas le contenu) · R2 = 1/3 corrigé (doublon marqueur
  run_real.py:520 + skill.md:82 périmé) · régime prose (16/21) hérite 494 allow/0 deny
  (git commit inclus) sans garde-fou code · seul canal mémoire→prompt : premortem.
- **En attente Pierre** : solutions E1→E8 (aucune codée — mission lecture seule).
- **Suite (même jour)** : mandat permanent « Architecte du contexte agentique » confié à
  Fable. Architecture livrée : `docs/forge/CONTEXT_LOOP_V1_PROPOSAL.md` (PROPOSED) —
  Context Manifest signé à la porte, context_diff + table CONTEXT_CONSUMERS, Integrity
  Check advisory, refresh ciblé driver, capture transcript opt-in. 5 décisions au §10
  (go étapes 1-3 · advisory vs futur gate · timing refresh · transcript · driver-only V1).
  Cas réel motivant : wiremap shmup_slice modifiée 4 j après son gel (mtimes 14/07 vs 18/07).
- **V1.1 Freshness (même jour)** : `docs/forge/CONTEXT_LOOP_V1_1_FRESHNESS.md` — audit
  CONTEXT_BUDGET (fenêtres modèles NOT_FOUND, tokens sommés post-appel, prompt total non
  plafonné, one-shot confirmé ⇒ fraîcheur cognitive = Source+Budget Freshness), score
  advisory FRESH/STALE_WARNING/STALE_CRITICAL/REQUIRES_REFRESH, arbitrage Pierre consolidé :
  GO manifest+prompt_sha256+integrity check advisory · ATTENTE refresh auto/transcript/
  impact auto. Périmètre GO exact au §7 — prêt à coder sur go.

## Session 2026-07-24 (Fable) — Audit branchements Forge (Phase 1 mission Pierre)
- **Livré** : `docs/audit/FORGE_AUDIT_BRANCHEMENTS_2026-07-24.md` — photographie complète
  Kernel/Workflow/Mémoire/Branchements, 4 sous-agents contre-vérifiés (2 claims corrigés).
- **Écarts majeurs** : driver adopté 5/21 runs (prose majoritaire, même après card_engine) ·
  `verify_run` jamais appelé par driver.py · hook forge fail-open sans marqueur auto-apposé ·
  capteurs visuels + s10d jamais branchés au verdict · selfaudit neutralisé au pre-commit
  (`|| true`, sortie jetée) · décisions Pierre du 20/07 enregistrées mais jamais appliquées ·
  seule boucle mémoire fermée = error_journal↔premortem.
- **En attente Pierre** : 8 arbitrages listés au §5 du rapport (dont go/no-go Phase 2
  rapports agents + choix du run observé Phase 3, et commit de sauvegarde des 203 fichiers).

## Session 2026-07-24 (Fable, suite) — Patch fiabilisation Forge V1 (go Pierre)
- **Livré, testé (490 passed, 1 skipped relancés par l'orchestrateur), NON commité** :
  R1 `verify_run` câblé dans `driver.py._run_verdict` (échec ⇒ s12 BLOCKED, 1 seul appel) ·
  R2 marqueur `FORGE_DISPATCH:<etape>:<run_id>` injecté par `contract.py._render_prompt`
  via `prepare_dispatch` (hook plus jamais désarmé par oubli sur le chemin de la porte) ·
  R3 pre-commit : selfaudit visible (`lab/reports/selfaudit_last.json` + résumé 1 ligne,
  toujours non bloquant) · R4 `scripts/forge/apply_decisions.mjs` (+17 tests) : marquage
  `review_status` des propositions depuis les décisions Pierre, dry-run par défaut,
  **`--apply` réel jamais exécuté** (attend go Pierre ; dry-run : 10 marquages, 1 orpheline).
- **Écart d'ingénierie à ratifier** : gate mutation de verify_run restreint aux verdicts OK
  (un FAIL légitime échouerait toujours `verify_mutation_receipt`) — HMAC/évidence/
  knowledge_trace restent des gates durs inconditionnels.
- **Prochaine étape** : go Pierre sur `apply_decisions --apply`, doctrine driver (option A
  recommandée), sort des 3 éléments passifs (s10d, PROJECT_BIBLE, .claude/agents côté Forge).

## Session 2026-07-23 (Opus, worktree `forge-godot-etape0`) — capteur branché, étapes 4 et 5 faites
- **Ordre ratifié de Pierre ÉPUISÉ (1→5)** : contrat de système · surfaces · source de vérité ·
  métriques+boucle · contrat de l'agent orchestrateur. Détail clos :
  `journal/context-archive-2026-07-23-capteur-metriques-orchestrateur.md`.
- En bref : `contract_sync` agrégé dans `studio_selfaudit` (un capteur qui ne peut pas tourner rend
  `non_evaluable` et FAIT ÉCHOUER — jamais de vert silencieux) · 4 dérives skill↔code résorbées ·
  coût/effort/pool dans le rapport de fin de run · `project_bible` injectée en s0 · index des
  journaux régénéré · 4 fonctions sans appelant branchées · `contracts/orchestrator.yaml` (RATIFIÉ).
- Chiffres inédits sortis du disque : `card_engine` = **1,81 M tokens / 12 appels / 8264 s** ;
  escalade réelle sur `shmup_slice` = haiku FAIL×2 → sonnet FAIL×2 → **opus OK×1**.
- 6 défauts silencieux trouvés en vérifiant (tautologie de budget, ligne JSONL tronquée qui aurait
  emporté le rapport d'un run réussi, `builder_id` non normalisé, docstring non tenue, décision en
  commentaire, mojibake `U+FFFD` sur JSON valide). Aucun ne levait d'erreur.
- **RATIFIÉ PIERRE 2026-07-23** : (a) séparation `orchestrator` (session) / `run_orchestrator`
  (agent, Opus) — « intention ≠ exécution » ; réserve NON implémentée : l'orchestrateur devra
  pouvoir descendre de tier. (b) **Aucune décision dans un commentaire** — champ structuré validé
  obligatoire, à appliquer aux contrats/wiremaps/registres. (c) Project Bible : promotion humaine
  gardée, « mémoire active mais pas auto-validée ». (d) Mémoire : cache local agent toléré, mais
  toute décision ratifiée doit avoir une représentation VERSIONNÉE, et une référence doit pointer
  vers une source réellement accessible. Entrées rédigées au format du log dans
  `studio_brain/decisions/PROPOSED_2026-07-23_ratifications.md` — **à promouvoir par Pierre lui-même**
  (le log dit « seul Pierre peut ajouter des entrées »).
- **OPENCLAW = LEGACY** (Pierre 2026-07-23) : « on travaille que claude et forge ». Forge SAINE —
  elle ne lit jamais `openclaw/capabilities.yaml` (toujours `caps_path=roles.yaml`, vérifié) ; ce
  chemin n'est que le défaut de `control_plane/registry.py:15`, consommé par la lane STUDIO gelée.
  MAIS deux skills **vivants** (pas dans les legacy gelés de `CLAUDE.md:128`) pointent dedans :
  **`/gate` écrit ses verdicts HumanGate** dans `studio/openclaw-workspace/DREAMS.md` et
  `/audit-daily` lit un `MEMORY.md` figé au 06-29. + 2 docs Forge étiquettent encore openclaw
  « SSOT studio » (`roles.yaml:3`, `SCHEMA.md:130`) — étiquette devenue fausse. Vérifié :
  `DREAMS.md` propre côté git, dernière entrée 07-09, aucun verdict n'y dort.
  ⚠️ **Collision à trancher** : `/gate` enregistre les décisions ratifiées **dans du legacy**, alors
  que la décision « toute décision ratifiée doit être versionnée dans le repo » exige l'inverse.
- **DÉRIVE STRUCTURELLE TROUVÉE — classée « correction d'architecture », pas un patch** : `CT-4`
  (2026-07-03) nomme `memory/MEMORY.md` comme référent canonique. Ce chemin **n'a jamais existé
  dans le dépôt** (`git log --all -- memory/` vide) : les 68 fichiers vivent hors projet, sans
  historique ni sauvegarde. Symétriquement `STUDIO_MEMORY.md` (racine, figé 06-04) EST versionné et
  CT-4 ne le mentionne pas — seul orphelin réel (l'autre candidat, `studio/openclaw-workspace/
  MEMORY.md`, est du legacy assumé depuis la décision openclaw ci-dessus, pas un référent à
  réconcilier). Le référent vivant est donc hors dépôt et sans sauvegarde, alors que CT-1 du même
  jour versait `studio_brain/` justement contre le bus-factor-1.
- **LA CAPACITÉ D'AUDIT N'EST PAS CONSULTÉE** (mesuré 2026-07-23) : des 5 capteurs déterministes,
  **un seul a un lanceur automatique** — `studio_selfaudit` dans `.claude/hooks/pre-commit`, avec
  `>/dev/null 2>&1 || true` (sortie muette, code de retour jeté). `master_index` — celui qui
  signalait la dérive `memory/` — n'est lancé par RIEN. `pending_review` non plus. Le problème
  n'est pas la perte de la capacité, c'est l'absence de lecteur. Priorité 2 de Pierre.
- **INDEX RÉGÉNÉRÉS** (priorité 1) : `AGENT_CONTEXT_MAP` et `MASTER_INDEX` étaient périmés sur ≥6
  points (3 contrats absents + 3 contrats modifiés depuis, dont `s0-contrat` et ses champs
  design-intent). Régénération idempotente vérifiée. **670 passed, 3 failed pré-existants.**
- **RESTE OUVERT** : promouvoir `pending_review_decisions.jsonl` vers le ledger (écriture durable ⇒
  gate Pierre) ; `generate_journal_index` embarque un chemin absolu (signalé, non corrigé) ;
  `lab/reports/error_journal/INDEX.generated.md` non suivi par git — à tracker ou à ignorer.
- **PRIORITÉ PIERRE POUR LA SUITE** : (1) stabiliser contrats + index + sources de vérité ;
  (2) garder la capacité d'audit ; (3) avancer vers le premier jeu avec la chaîne complète.
- Détail du 2026-07-22 (STANDARD, run Pong, contrat de système) :
  `journal/context-archive-2026-07-22-standard-pong-contrat.md`.

## Session 2026-07-21 (Opus) — Forge V0 : Godot devient le 1er backend certifie
- **Ratifie Pierre** : Godot = runtime canonique de la Forge. Le contrat `role` reste la
  FRONTIERE (aucun moteur nomme). Concept central : **substituabilite certifiee** — une
  implementation est substituable si, sous LA MEME simulation_config et LES MEMES graines,
  sa bande mesuree retombe dans la bande declaree. Prouvee par mesure, jamais affirmee.
  Pas de portage Unity/Unreal maintenant ; contrats ouverts aux futurs runtimes, fail-closed.
- **Ou vit le travail** : worktree `.claude/worktrees/forge-godot-etape0`, branche
  `feat/forge-godot-etape0`, **24 commits, RIEN DE POUSSE**. Spec + plan versionnes dans
  `docs/superpowers/{specs,plans}/2026-07-21-forge-godot-etape0*`.
  Journal detaille : `.superpowers/sdd/progress.md`.
- **Constat qui a change l'ampleur** : l'infra Godot existait deja (games/chess_tcg,
  harnais headless 83/83 avec garde EXPECTED_ASSERTS ; `.gd` deja dans static_oracles).
  Il manquait 3 choses, toutes livrees : mutation GDScript, solvabilite, cablage.
- **LIVRE** : resolveur de binaire Godot · adaptateur `godot_trial.mjs` (role_sim.mjs INTACT,
  aucun couplage moteur) · mutation.py comprend and/or + ==/!= + `#` comme commentaire ·
  kb-validate ouvre le code Godot (R6) et voit les impuretes GDScript (R10) · champ
  `learned_from` · garde fail-closed `simulation_runtime` · brique M01 + contrat de role ·
  oracle de solvabilite R9 Godot · verdict signe **verify_run = AUTHENTIQUE (exit 0)** ·
  instrumentation d'apprentissage + protocole `external_sources/`.
- **Contrat Forge cree** : `scripts/forge/contracts/s9-build-godot.yaml`, valide par la porte
  `prepare_dispatch`. Porte verifiee cryptographiquement (etape/run_id inventes = BLOQUES).
  Ecart connu : le hook est fail-OPEN sans marqueur `FORGE_DISPATCH`.

### DECISION EN ATTENTE DE PIERRE
Le verdict est **AUTHENTIQUE** mais porte objection : `decision=HUMANGATE_READY_WITH_OBJECTION`,
`is_clean_pass=FALSE`. Or `verdict.py:196` fait de `is_clean_pass` le SEUL predicat autorise
pour promouvoir. Le plan demandait `tier=validated` -> **conflit plan vs doctrine**.
**Defaut applique : la brique reste `candidate`, `proof_of_use=null`.** A trancher.

### BLOQUEUR TECHNIQUE OUVERT (revue finale, CRITIQUE)
**La solvabilite R9 est une TAUTOLOGIE.** `solvability.gd:111` : le generateur de labyrinthe
appelle `GridNav.path_length` — LA BRIQUE TESTEE — et creuse un repli jusqu'a ce qu'un chemin
existe, avant de rendre le labyrinthe ; le bot le parcourt ensuite avec le meme BFS.
`succeeded` ne peut etre faux que si `next_step` contredit `path_length`. "50/50 gagnes" ne
prouve donc PAS "un bot gagne vraiment". Meme defaut dans `trial.gd` (branche `path_len < 0`
morte) => le "300/300" du role_sim est aussi garanti par construction.
**Correctif requis avant tout claim R9** : le generateur ne doit pas consulter la brique ;
des instances reellement injouables doivent exister ; `succeeded=false` doit etre ATTEIGNABLE.
Autres findings importants : couplage moteur (`godot_project`/`godot_script`) DANS
`simulation_config` cense etre agnostique ; log de validation role_sim non scelle (chiffres
transcrits a la main dans le verdict) ; bande ternaire {26,30,34} qui mesure le regime de
graines plus que la capacite.

### Prochaine etape
Corriger la tautologie R9, puis re-mesurer, puis revenir au gate de promotion.

## Sessions 2026-07-19/20 (stratégie · Forge V2 · auto battler) — archivées
Archive complète : `journal/context-archive-2026-07-19-20-strategie-forge-v2.md` — mode commandement,
audit couche décisionnelle, Knowledge Resolver V1, Run A card_engine accepté, mission Forge V2 (§4-A
exécuté, R9/R1/R3/R2/R6/R7/R8), audits R10 et BAS V1/V2, les 8 gates tranchées + 7 commits ;
incrément 2 auto battler forgé et mergé.

## Session 2026-07-19 (déploiement Belote) — 1er build studio PUBLIÉ
**https://belote-claude.onrender.com** live, committé+poussé `8d4145f`, PWA installable Android
confirmée par la joueuse réelle. Détail + limite acceptée (bande de geste Android) :
`llm-lego/experiments/belote-claude/JOURNAL_ERREURS.md` (Partie 4) + mémoire `belote_render_deploy`.

## Sessions 2026-07-18/19 (stratégie · audit méta · auto battler) — archivées
- `journal/context-archive-2026-07-19-strategie.md` — « déclaré ≠ exécuté » au niveau PRODUIT,
  mode figé RATIFIÉ (Fable/Opus/Sonnet), **triage v2 exécuté mais NON COMMITÉ** (gate Pierre ;
  ne pas restaurer le ledger via checkout).
- `journal/context-archive-2026-07-19-audit.md` — 3 strates mortes, capteur `declaration_readers.mjs`,
  doctrine Declared→Referenced→Executed→Verified.
- `journal/context-archive-2026-07-18.md` — architecture 16 bibles auto_battler RATIFIÉE, run Forge
  `auto_battler_i1` s0→s12 mergé (`44592b3`).

## Impasses / doctrine (portées)
- LEDGER canonique = `lab/chains/IMPROVEMENT_LEDGER.yaml` ; écrire via `kaizen_loop.py`.
  `settings.json` : `Write/Edit(lab/chains/**)` en **ask** (mitigation IMP-247) — attendu, pas un bug.
- **Forge** : `is_clean_pass()` = seul prédicat de passage propre ; `software_verdict` seul ≠ signal de promotion ;
  survivant mutation trié = objection, jamais READY propre. Recette d'audit : `grep -rn 'software_verdict.*==.*OK'`.
- `train.py` gelé (Rocky = GEL). Serveur builder : `node demo-server.ts` :3000.
- Une variable à la fois · fondations avant features · **aucun commit/push sans go explicite Pierre**.
