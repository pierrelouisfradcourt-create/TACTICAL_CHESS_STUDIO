# Contexte courant TCS

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

