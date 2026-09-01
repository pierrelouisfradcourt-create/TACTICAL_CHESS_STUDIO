# Contexte courant TCS
*(Handoff. Dernières sessions : 2026-09-01 — **Shadow Audit V1→V6 CLOS** (campagne de
falsification, aucun patch) · 2026-08-30 — **RUN 1 chain_probe_v1 CLOS par Pierre** (chaîne
full_content prouvée, verdict AUTHENTIQUE HUMANGATE_READY) · 2026-08-29 — run
tower_defense_sonde COMPLET puis CLOS. Archive :
`journal/context-archive-2026-08-29-avant-audit-paquetA.md`.)*

## Shadow Audit V1→V6 (2026-08-31 → 2026-09-01) — **CLOS, aucun patch, aucune mesure rejouée**
- **Carte** : artefact `claude.ai/code/artifact/15ab188c-0b5e-4ac9-8e85-7eb0db0e5714`, horodatée
  **état audité `619b29c → 36420d2`**. HEAD a depuis avancé à `e8c42270` (+5 commits paire 2, +217
  lignes non commitées dans driver/run_real/static_oracles). **Preuve HISTORIQUE ≠ état courant** —
  chiffres (85 runs, 234,05 $, 3,26 M tokens, 349 diffs) valides sur l'état audité SEULEMENT.
- **Méthode : falsification.** 4 thèses successives réfutées par la mesure — « relations non
  modélisées » (faux : `check_collisions` + `check_line_states` câblés) · « boucle asset cassée »
  (faux : complète, dry-run OK, attend une signature humaine) · « faille composition s5/s10s »
  (faux : s10s lit le squelette `09_WIREMAP/`, pas la sortie de s5) · « deux sources de vérité
  wiremap » (faux : même dispatch, deux moments `frozen`→`built`, transformation contractualisée).
- **Résidu unique : `TRANSITION_INTEGRITY` NOT_FOUND** — aucun mécanisme ne garantit la
  conservation des ids entre wiremap de gel et wiremap après-build ; TESTED sur breakout_v2 (52/52).
- **Confirmés (état audité)** : producteur = son propre juge (`reference_guard` 0 occurrence dans
  verdict/verify_run/gate, DRIFT n'atteint aucune décision) · Brief sans champ capacitaire (Brief
  MMO+SQL+multijoueur `passed: True`) · télémétrie de jeu NOT_FOUND · 5 contrôleurs dormants.
- **E0 — POUSSÉ (`fcf666c2`)** : `games/p1_beta/solvability.mjs` émet `FORGE_ORACLE_SUMMARY` →
  `driver.py:3248` range la marge réelle en `detail["oracle_measures"]` (2454/8000, margin_ratio
  0,30675). Zéro modification Forge : le tuyau existait, l'émetteur manquait.
- **lesson.v2 — POUSSÉ (`25e31b37`)** : `cause` devient un champ ET la porte du contexte agent.
  Producteur (`promote_manifest_lessons` cesse d'aplatir `root_cause` en prose, `statement`
  inchangé au bit près) · Gate 1 à **trois états** dans `apply_injection_policy` (absent v1 =
  toléré · vide v2 = événement exclu · rempli = injecté) · 8 fixtures de test traitées comme
  PRODUCTEURS, causes réelles, jamais de vert cosmétique · 2 gardiens neufs · migration append-only
  de **121 leçons** re-dérivées des manifestes d'origine (jamais de `statement`). Invariants
  vérifiés : 326→326, aucun statut ni statement modifié. **205 causes définitivement perdues**
  (run_dirs supprimés) — mesure inédite de ce que le studio a déjà perdu.
- **Bilan de campagne** : artefact `claude.ai/code/artifact/6e2f2e55-2fc3-4dbb-a731-7c7e2d8e02d6`.
  Diagnostic : *la Forge n'a pas un problème de capacités manquantes, mais de mécanismes construits
  et jamais exercés*. Goulot mesuré = la ratification humaine (18 validated / 326). Meilleur levier
  restant = **sélection du pre-mortem par étape** (204/326 portent leur étape, le sélecteur l'ignore
  et trie par horodatage puis alphabétiquement).
- **Boucle lesson → KB : FERMÉE, et elle a déjà tourné 18 fois.** R3 v4 admet `provenance_internal`
  (« leçon Forge validée ») ; 18 entrées du catalogue en portent une, exactement les 18 `validated`.
  Ma conclusion inverse du 2026-09-01 venait d'une docstring PÉRIMÉE de `_lesson_to_pattern_entry`.
- **E1/E1b** (fork `p1_beta_E1`, non suivi) : Architecte débridé → blueprint 483 o → 15 013 o,
  passe son contrat que le contrôle échoue, pilote `economy.mjs`/`objective.mjs` réels. **Mais
  margin_ratio IDENTIQUE au bit près, pour 4,4× le coût, run final BLOCKED** (wiremap frozen).
  Le builder a réécrit son propre oracle sans détection. **P0 « débrider l'Architecte » retiré.**
- **Incident consigné** : dry-run de ratification asset a écrit dans `batch_constraints.json`
  (suivi) — redirection de bac à sable incomplète. Restauré, blob == commit, vérifié par hash.
- Leçon durable en mémoire : `audit_measure_carries_its_head` (une mesure porte son HEAD).
- **NON SUIVI, conservé comme évidence (décision Pierre)** : `games/p1_beta_E1/`,
  `lab/forge_runs/p1_beta_E1/`, `lab/forge_briefs/p1_beta_E1/`. Réserve posée et non levée :
  *untracked ≠ durable* — un `git clean` les emporterait. Versionner ou non = gate Pierre.
- **Ouvert, par levier décroissant** : sélection pre-mortem par étape · ratification en lot
  (308 candidate) · 5 contrôleurs dormants · champ capacitaire au Brief · recalibrage
  `reference_guard` (349 diffs à chaque run depuis le 2026-07-31) · DRIFT non propagé au verdict.
- **E2–E5 suspendus** · **P0 « débrider l'Architecte » RETIRÉ** (E1b : effet architecture réel,
  effet gameplay nul, 4,4× le coût) · rouge `p3_alpha` hors périmètre (`oracles.json`, autre session).

## Analyse PAIRE 2 (2026-09-01) — **CLOSE** ; requalification : PAS encore de paire valide
- **Finding n°7** : charter.yaml L2 = bloc RETURN LINEAGE (« dernier bloc yaml » + check_charter
  FAIL advisory) — l'aval a consommé le mauvais objet. **L2 requalifié : run authentique,
  expérimentalement INVALIDE** ; paire comparative BLOCKED ; D2 = seul bras valide. **RÈGLE
  VERROUILLÉE Pierre** : un verdict de chaîne ne promeut jamais seul une expérience en valide —
  l'identité de l'input normatif consommé s'établit indépendamment du verdict aval.
- **Finding n°8** : tick de mesure non gardé (L2 boucle 16 ms vs 100 ms spécifié → 72000 ticks
  = 2 h vs ~19 min). Findings 7-8 = défauts STRUCTURELS enregistrés, AUCUN hotfix.
- Réparation ANALYTIQUE (jamais du run) : vrai charter L2 extrait (1er bloc yaml s0), revues X
  ré-exécutées (TESTED), M2a-L2 recalculé (TESTED : 20 non-sourcées au point mesuré, M2b 4) ;
  anciennes mesures conservées comme évidence. **M7 sauté définitivement** (aveugle rompu par
  descellement prématuré orchestrateur, consigné). Attribution d'origine consignée : findings
  structurels → système expérimental (protocole/oracle/pipeline) ; défauts de contenu → agents.
- Dossier : `p2_beta/ANALYSE_PAIRE2_CONSOLIDEE_20260901.md` + addendum CLOSURE. NO_CLAIM maintenu.

## PAIRE 2 (2026-08-30) — **CLOSE : première paire VALIDE, 2 HumanGates ACCEPTÉS** *(SUPERSÉDÉ
par la requalification du 2026-09-01 ci-dessus — conservé comme historique)*
- D2 (p2_alpha, grammaire v2 imposée) : 18/18, AUTHENTIQUE — **1.12 a traversé worldscan ET
  build** (1.12 ×3 / 1.15 ×0) ; théâtre attrapé (prise valide) puis corrigé par reprise gatée.
  L2 (p2_beta, libre) : 18/18, AUTHENTIQUE, C2 exercée (1re fois) ; **finding #6** : économie =
  canon Cookie Clicker (interdit du Brief violé, non gardé par oracle) — valide expérimentalement,
  conformité Brief BLOCKED. Asymétrie assets D2 0/13-justifiés vs L2 11/13 = MESURE pour la
  grille. Convergence ×1.15 des 2 GM = hypothèse « attracteur canonique » (signal, pas causalité).
- Coûts ~1,71 M tokens. Évidence préservée SANS nettoyage (CLOSURE_PAIRE2_20260830.md, p2_beta).
- **GO analyse M1-M7 sous V1 donné** (masquage V2, M2a/M2b, M7 deux temps, attribution d'origine).
  **Conclusion L/D : BLOCKED — règle ≥2 paires valides, celle-ci est la première.**

## Pré-enregistrement RUN 2 (2026-08-30) — **RATIFIÉ Pierre** (protocole V1 + grammaire D v2)
- `docs/forge/RUN2_PROTOCOLE_V1.md` RATIFIÉ : A1-A7 outillés — `forge.pair_preflight --run-tests`
  BLOQUANT (3 checks + 28 tests, exit 0 frais) · `forge.m7_masking` (blocs + verify fail-closed,
  non-régression gain_clic) · product_snapshot exigible des 2 bras · anti-grandeurs-orphelines.
- `lab/forge_briefs/p1_alpha/structure_imposee_v2.yaml` RATIFIÉE : économie inchangée, tick_ms
  100, budget 72000 (raison méthodologique — marge de mesure), milli-R entiers, mapping 6
  améliorations. CAVEAT : simulation de bureau ≠ preuve de solvabilité runtime (obligation de la
  future paire). Simulation : greedy tick 34346, click-only jamais.
- Statuts : C1-C3/A1-A3/A5/A7/v2 TESTED · A6 DOCUMENTED_ONLY · **paire 2 BLOCKED (GO séparé,
  ~2 runs à décider)** · claims L/D BLOCKED · verdict global interdit. T0 = 2452 verts.

## Analyse M1-M7 paire pilote (2026-08-30) — **CLOSE** (`p1_beta/ANALYSE_PAIRE_M1M7_20260830.md`)
- Grille pré-enregistrée exécutée (4 revues contexte propre + M2/M3 mécanique + M7 aveugle
  Pierre AVANT descellement : (a) envie de jouer = D1 · (b) ratifiable = L1, caveats consignés).
- AUCUN claim L/D. 5 observations de protocole → amendement V1 : findings 1-3 (corrigés au sas
  R3/freeze) · n°4 matérialisation charter advisory · n°5 instruments d'analyse (masquage à
  durcir, M7(a) sur artefacts post-conception, la revue attrape les défauts de l'ENTRÉE imposée).
- Ordre ratifié : amender le PROTOCOLE RUN 2 → sas de pré-enregistrement → décider paire 2.

## Sas correctif R3/freeze (2026-08-30) — **CLOS, C1/C2/C3 TESTED (ratifiés Pierre)**
- C1 : R3-lite vérifie la cible DÉCLARÉE par la réponse (`answer.modification_locus` :
  gm_worldscan/art_bible/aucune_requise) — variante « hors-GM advisory » REFUSÉE ; rétrocompat
  (sans locus = diff GM, HALT historique D1 reproductible). C2 : micro-re-déclaration réelle
  après la ronde du répondant (3 conditions, vrai spawn/reçu — jamais de mutation state.json).
  C3 : `aucune_requise` fail-closed (justification + objet normatif au Brief). Contrats
  s2.5/s2.7 : ajout locus borné. Preuve centrale : R3 ne force plus la modification d'une
  structure interdite de modification (fixtures = artefacts réels p1_alpha/p1_beta).
- 28 fixtures + T0 2431 verts zéro rouge · retrait `p1_alpha` d'oracles.json (GO Pierre,
  résidu pilote). Commit 6e5e7da poussé. **M1-M7 / nouvelle paire / claim L/D : gates Pierre.**

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
