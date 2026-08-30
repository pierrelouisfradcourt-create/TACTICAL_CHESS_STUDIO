# Contexte courant TCS
*(Handoff. Dernières sessions : 2026-08-30 — **RUN 1 chain_probe_v1 CLOS par Pierre** (chaîne
full_content prouvée, verdict AUTHENTIQUE HUMANGATE_READY) après consolidation fiches 1-5 +
Project Input · 2026-08-29 — run tower_defense_sonde COMPLET puis CLOS. Archive :
`journal/context-archive-2026-08-29-avant-audit-paquetA.md`.)*

## Paire pilote RUN 2 L/D (2026-08-30) — **CLÔTURÉE par Pierre** (pièces aux 2 run_dirs)
- Protocole pré-enregistré `docs/forge/RUN2_PILOTE_PROTOCOLE_V0.md` : p1_alpha=D1 (structure
  imposée ratifiée), p1_beta=L1 (libre), parallèle strict, même HEAD f8c50a0, tripwire.
- **L1 : FREEZE avec objection conservée** — chaîne complète 18 étapes, verify_run AUTHENTIQUE,
  s11 Qwen indépendant (2e fois), assets 11/11 ; mutation `and→or@L149` = **CLAIM UNVERIFIED** ;
  jamais un PASS sans réserve, jamais une preuve de qualité produit. Tripwire propre (1 hit CSS
  classé innocent après enquête).
- **D1 : arrêté au freeze** — incompatibilité R3×D démontrée (boucle normative immuable vs gate
  exigeant sa modification). Résultat pilote valide mais dégradé (`PILOT_STOP_20260830.md`).
- **3 findings de protocole = le vrai résultat** : granularité R3-lite (réponse thématique ≠
  modification mécanique) · topologie des rondes (pas de créneau de re-déclaration après le
  répondant) · R3×D (gate-modification vs objet normatif). Gardes NON corrigées pendant le pilote.
- **Comparaison L/D : BLOCKED — aucune conclusion Libre vs Dirigé** (« L1 au bout ≠ L1 > D1 »).
  M1-M7 : UNKNOWN. Ordre : **sas correctif R3/freeze** AVANT toute analyse et toute paire.
- Coûts : L1 704k / D1 358k tokens (~1,06 M la paire).

## RUN 1 chain_probe_v1 (2026-08-30) — **CLOS par Pierre** (`CLOSURE_RUN1_20260830.md` au run_dir)
- Conclusion ratifiée (verbatim au closure + decision-log) : la chaîne full_content **ferme ses
  boucles de conception, production et preuve, avec intervention HumanGate quand la chaîne
  rencontre une décision qu'elle ne doit pas s'attribuer** — niveau de conclusion exact des données.
- Verdict signé `verdict.json` : OK / HUMANGATE_READY, verify_run **exit 0 AUTHENTIQUE**, seul
  flag = s10s sauté par profil. 11/11 critères du Brief mesurés. Premières historiques :
  `design_questions.json` matérialisé (2 questions ART→GM répondues) · s11 red-team **réellement
  indépendant** (qwen2.5-14b, independent: true) · freeze par convergence après 2 refus GM +
  décision HumanGate « facettes minimales » (portée sonde-uniquement, canal `design_intent.md`).
- Entrée canonique : `lab/forge_briefs/chain_probe_v1/project_brief.yaml` (contrat
  FORGE_PROJECT_INPUT_V0, spec FORGE_DESIGN_FREEDOM_SPEC_V0 **RATIFIÉE** 2026-08-30, N5/N6 fog).
- Aucun claim de qualité ludique. **RUN 2 (Libre vs Dirigé) = nouveau sas, nouveau GO.**
- Consolidation commitée avant le run : fiches 1-5 (`full_content`, gate assets, artbible driver,
  prisme matérialisé sous panel, s11 Qwen bloquant) + Project Input + 3 marqueurs gpu_window
  manquants (les fenêtres Godot venaient de la suite, pas des workers).

## Tower Defense sonde (2026-08-29) — **CLOS par Pierre** (`CLOSURE_20260829.md` dans le run_dir)
- Décision Pierre : run terminé, AUCUNE reconstruction (jeu/charter/chiffres/findings intacts) ; les 4
  objections restent des objections ; 5 mutants triés = **CLAIM UNVERIFIED** (pas de ratification sur
  déclaration du producteur) ; red-team = exécuté mais indépendance **BLOCKED** (fallback ≠ Qwen).
- Statuts : jeu IMPLEMENTED · tests/E2E/solvabilité TESTED · verdict IMPLEMENTED-avec-objections ·
  « libre > imposé » UNKNOWN (un seul bras) · fun UNKNOWN · généralisation UNKNOWN.
- Expérience « s0 conçoit librement » : charter ratifié INCHANGÉ (backup `charter_ratifie_20260829.yaml`),
  conception 100 % s0 ; findings design = résultats d'expérience, PAS de la dette (décision Pierre) :
  `lab/forge_runs/tower_defense_sonde/design_findings_20260829.md` (Frost sans prédateur · S10 mono-tour
  aveugle aux duos · scaling +60 % ambigu · `lives` inventé par le builder ; méta : les angles morts du
  concepteur deviennent des angles morts de la preuve).
- Run driver canonique `full` : `verdict.json` signé, verify_run **exit 0 AUTHENTIQUE**, software_verdict
  OK / HUMANGATE_READY_WITH_OBJECTION. **4 objections à trancher** : 5 survivants mutation triés par le
  producteur (équivalence non vérifiée) · red-team fallback (Qwen n'a pas tourné) · prisme_control.md FAIL
  structurel · oracle standard sauté (profil). Coût : 17 appels, 437k tokens, ~3 h 27 cumulées.
- Mesuré : oracle 6 volets PASS rc=0 · E2E 34/34 Chromium réel · panel 5 bots, variance + inversion de
  classement (« tall » MEURT vague 3 — nourrit le finding parité hauteur/largeur). Faux vert corrigé en
  route : `proofs/e2e.mjs` définissait `runE2ETest()` sans l'appeler (détecté par Opus, leçon « verte sans
  avoir eu lieu »). Incidents infra : OAuth expiré (ré-auth Pierre) + 1 rc=1 transitoire + 2 timeouts s9
  (salvage FIR-02 efficace). Propositions propose-only déposées (ledger AUDIT_REQUIRED + fiche projet).
- À savoir : jonction NTFS `games/tower_defense_sonde/node_modules → llm-lego/node_modules` (Playwright).

## Spec liberté de conception (2026-08-29) — PROPOSED, HumanGate en attente
- Livrable : `docs/forge/FORGE_DESIGN_FREEDOM_SPEC_V0.md` — ce que Forge reçoit AVANT s0
  pour maximiser la liberté de s0 sans trous structurels. Aucun chiffre de gameplay, aucun code,
  tower_defense_sonde non touché.
- Squelette : N1-N9 non négociables (obligations de preuve/forme : provenance par champ, état
  initial exhaustif, formules à valeur unique, séparation concepteur/instrumenteur, fidélité
  charter→build, fog_humangate au schéma) · liberté explicite s0 (tout le dimensionnement, FOG-5
  préservé) · E1-E7 explicitations · P1-P7 preuves · HumanGate inchangé · 11 anti-patterns
  observés · protocole paires appariées L/D avec métriques M1-M7 pré-enregistrées.
- Rien n'est appliqué : ratification Pierre requise avant d'en faire un intrant de contrat s0.

## Tower Defense sonde (2026-08-29) — HALTED, consolidé, en attente reset/reprise
- Run `tower_defense_sonde-20260829-build` (`lab/forge_runs/tower_defense_sonde/`) : HALT timeout s9
  (3 tentatives, escalade haiku→sonnet consommée 1/2), reçus s10a/b/c STALE, aucun verdict signé.
- Corrections minimales F1-F5 + ordre de reprise consignés (rapport session 2026-08-29) : F1 mutation
  argv `driver.py:3005` (profil full) · F2 chaîne `awardBounty` (`sim/step.mjs:2`) · F3 honnêteté
  `run-oracle.mjs` (passed:true en dur) · F4 Playwright + invocation e2e · F5 écart WireMap R47-R55
  (arbitrage Pierre). Les 5 corrections prisme de s3 = amont, ni nécessaires ni suffisantes à la reprise.
- Résultat expérimental validé Pierre (n=1, PAS doctrine) : mémoire `design_delegation_vs_proof_ownership`.
  Boucle ludique = UNKNOWN pas FAIL · « libre > imposé » = UNKNOWN (pas de bras de contrôle) ·
  charter à double statut (« ratifié » par nom, PROPOSITION par contenu) à trancher avant tout s12.
- Aucun GO donné : F1-F5, WireMap, install Playwright, charter canonique = décisions HumanGate.

## Branche : `master` == `origin/master` == `b86bf27` (2026-08-29, TOUT poussé)
Série gatée fiche par fiche (protocole fiche → vérification → GO Pierre → commit) puis go push :
R2-OBS `38262cf` · nivelage `b9ea2a7` · A2+A3 `d4a6152` · A1 `2d0ebb6` · archive `ec2af22` ·
gates `216e160` · docs `c6dfb0b` · hygiène `b86bf27` (selfaudit_last détracké+ignoré).
Sale résiduel = pré-existant seulement : `test_evidence_isolation_fixture.py`, jsonl de runs,
`studio_brain/` divers, 9 fichiers vides racine, `.playwright-mcp/` — triage non fait, non urgent.

## Vérité architecture (audit V0 2026-08-28, 6 sous-agents contre-vérifiés)
- Carte courante = `docs/forge/STUDIO_MASTER_SCHEMA.html` **Détail M** (vérité mesurée, en tête).
- Chemin canonique unique : `run_real.py → ForgeDriver → dispatch → contract → runtime → oracles
  → verdict → verify_run` (verify_run RÉELLEMENT appelé, traces AUTHENTIQUE).
- **GELS ratifiés (decision-log 2026-08-28)** : île V2 (7 modules + root_problems/agent_recipes)
  et panel Prisme multi-lentilles — PASSIVE ≠ DEAD, aucun branchement sans consommateur démontré.
- Pile Codex/GPT-Navigator = **LEGACY PRÉ-FORGE** (bannières posées ; sources GPT périmées de
  2-3 mois). Nouvelles project sources GPT = Détail M + ADR-003.
- **Invariant de gouvernance ratifié** : une preuve provient du mécanisme qui a réalisé l'action,
  sinon explicitement `AUTO_ATTESTED`. Appliqué : `spawn_links.jsonl`, verdict signé
  (`execution_proof_attestation`), `tools_effective_signed` dans les événements signés.

## Capacités nouvelles (2026-08-28/29)
- **Un run ne meurt plus en silence** : retry borné sur échec transitoire (`claude -p` rc=1 muet),
  prompt final persisté (`context/prompt_<etape>_a<attempt>.txt`, sha == manifest),
  `executor_diagnostic` complet sur halt, joint `spawn_links.jsonl` par spawn.
- **Gates pre-commit** : node --test BLOQUANT (1 029 tests .mjs, ~2,5 s) · `commit_scope_guard`
  (détection de périmètre) · volet `mutationRegistry` advisory au selfaudit.
- **Contrats asset écrits** (`s-asset-produce`/`s-asset-spec`) — MAIS `asset_dispatch.py` ne les
  charge pas encore et `asset_producer` est absent de `models[].roles` : câblage = gate séparée.
- 25 contrats one-shot archivés (`contracts/archive/`) ; conservés : orchestrator, redteam-artdirector,
  s10d, s9-build-godot, wm1-tetris (exigence 10 lignes CORE), wm1-breakout (consommé par observer).

## Régime de tests (nivelage 2026-08-29 — les 90 min artificielles sont SUPPRIMÉES)
- **T0** `pytest scripts/forge/tests/ -m "not gpu_window"` = **5 min 42** (2 332 verts) — validation courante.
- **T1** : `test_observer_integration_real.py` = LE SEUL test autorisé à lancer le vrai Observer (34 s).
- **T-GPU** : 7 tests `-m gpu_window` (165 s, fenêtres Godot) — sur demande explicite seulement.
- Cause historique des 90 min : l'Observer réel spawné ~110×/passe par le défaut de classe
  (docstring qui affirmait le contraire) — corrigée par fixture conftest.

## Kitten Clicker
- Série runs 10-11 arrêtée 2026-08-25 (11 HALTED/BLOCKED) : famille infra (CLI muet) corrigée par
  R2-OBS ; famille canal design_questions tracée (ruptures 10/11, corrigées ou documentées).
- **Référence produit ratifiée par l'usage (Pierre 2026-08-28) : la sonde V5 « 3 tableaux »**
  (`lab/prototypes/kitten_noyau_sonde/`, boucle fermée, grammaire des chatons, ~3,4 s/maillon).
  Les builds Godot des runs = fixtures de preuve, pas des candidats produit.
- Observer : moissonné jusqu'au run 9 seulement (2026-08-23) — la série HALTED n'est pas analysée.
- Design : C.1 V1.2 · C.2 V1.1b · C.3 V1.2 · C.4 V1.1 · C.5/V2.0 GAMEPLAY MAP ratifiés ;
  **C.6 V1.1 PROPOSED** (`gamedesign/kitten_clicker_game_loop_blueprint_c6.md`) — **5 décisions
  HumanGate en attente** ; Calibration V2.1 PROPOSED (retirée du run).

## Files et séances
- Séance de ratification PRÊTE : `lab/reports/ratification_session_20260828.md` (PROPOSED) —
  ~380 items réels sur 1 529 (1 146 = 6 décisions Snake réémises ×191 : règle de NON-RÉÉMISSION
  par identité à implémenter avant tout throttle). Paquet B = gestes explicites Pierre uniquement.

## Verrous actifs (Pierre, 2026-08-29)
- **World Scan : hors périmètre** (scission Modèle 3 = recommandation d'audit, non ouverte).
- **R8 (premier gm_worldscan.json réel conforme) : BLOQUÉ** jusqu'à signal — préalable de toute
  décision de topologie World Scan.
- **3 bannières `00_STUDIO_CONTROL`** : fichiers TRACKÉS (contrairement à leur propre politique),
  bannières posées mais NON commitées — décision explicite en attente.
- Profils `review`/`increment` : conservés PASSIVE (0 run).

## Prochaine étape
1. Décisions C.6 (5) + périmètre du niveau CONTENT REQUIREMENTS (audit 2026-08-25) — inchangé.
2. Paquet B (nettoyage) si voulu, geste par geste.
3. R8 sur signal Pierre — désormais outillé (retry, prompt persisté, diagnostic).

## Impasses / passifs connus (inchangés)
Gates historiques : e2e `DirAccess`, solvabilité argv, mutation legacy · `check_wiremap_contract`
non consommé · rupture 10 (rejeu matérialisation, borné) · câblage asset_dispatch → contrats.
