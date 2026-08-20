# Archive de contexte — sessions anterieures au 2026-07-21

Extrait de studio_brain/00_CURRENT_CONTEXT.md le 2026-07-21 pour respecter la
limite de 100 lignes du fichier de handoff.

## Session 2026-07-19 (chat déploiement Belote) — Belote PUBLIÉ en ligne + PWA installable
- Suite directe de l'arbitrage flagship (voir archive stratégie ci-dessous) : Belote (`llm-lego/
  experiments/belote-claude`) déployé réellement — repo GitHub `belote-claude` (privé) + Render
  free tier → **https://belote-claude.onrender.com** live, vérifié par requêtes prod (index/
  manifest/icônes/API 200). Committé+poussé `8d4145f` sur `feat/forge-oracle-gate`.
- PWA installable Android confirmée par la joueuse réelle (grand-mère de Pierre) après 2 itérations :
  icônes SVG seules insuffisantes pour l'installabilité Chrome → PNG 192/512 rasterisées via
  Playwright ; service worker cache-first corrigé en réseau-d'abord (servait une version périmée
  à chaque mise à jour, y compris pendant mes propres tests locaux — piège noté).
- Retours terrain corrigés : HUD score écrasé par les réglages (scindé en 2 lignes), cartes en
  main trop petites (agrandies 62×114, symboles 44px, recalculé pour ne pas déborder à 8 cartes).
- Limite documentée et acceptée telle quelle (décision Pierre) : la bande de geste Android (bas
  d'écran) provoque des retours involontaires en jouant une carte — hors de portée d'une PWA
  installée (pas un TWA), non corrigée sur décision explicite. Détail complet + leçons dans
  `llm-lego/experiments/belote-claude/JOURNAL_ERREURS.md` (Partie 4, E10-E12).
- Reste ouvert : suivi de la session parallèle auto battler (non dupliquée ici) ; ledger triage v2
  toujours à commiter (gate Pierre, voir archive stratégie).

## Session 2026-07-19 (chat stratégie productivité/entreprise — condensée)
Détail complet : `journal/context-archive-2026-07-19-strategie.md` — diagnostic « déclaré ≠ exécuté »
au niveau PRODUIT, 3 dossiers PROPOSED (ledger triage, S13 release, arbitrage flagship), retour
Pierre (triage v2 révisé, S13 ratifiée dans le principe, arbitrage résolu par l'action — voir
session Belote ci-dessus), mode figé RATIFIÉ (Fable/Opus/Sonnet), **triage v2 exécuté mais NON
COMMITÉ** (action pendante : commit gate Pierre, ne pas restaurer le ledger via checkout).

## Session 2026-07-19 (chat studio/méta — archivée)
Archive complète : `journal/context-archive-2026-07-19-audit.md` — audit « déclaré ≠ exécuté » :
3 strates mortes (fiches agents jamais chargées → 13 réparées, matrice permissions ignorant agent_id,
3 taxonomies), capteur `declaration_readers.mjs` (25 tests verts), doctrine Declared→Referenced→
Executed→Verified, 4 décisions Pierre en attente, leçon fiabilité sous-agents (1 citation fabriquée).

## Session 2026-07-19 (chat auto battler, suite) — Incrément 2 forgé + mergé, calibration Forge
- **Calibration Forge** : doc corrigée (hook dur `pretool_forge_guard` ACTIF depuis 2026-07-10,
  pas différé — 2 docs stales corrigées) ; `FORGE_FORMATS_REFERENCE.md` créé (formats réels
  wiremap/triage/blueprint oracle/verdict, exemples tirés du run i1) ; `COMBAT_GATE_PREP.md`
  créé (prérequis incrément Combat, ne tranche rien). Committé+poussé `501491f`.
- **Gates infra Combat posés** (ratifiés Pierre en session) : profil Forge `increment` ajouté
  à `scripts/forge/dispatch.py` (test dédié, suite verte 432 passed), convention run_dir
  `auto_battler_i<N>`, valeurs v0 (Board 8×8 miroir, Mana→0 après Cast, `tick_limit=50`
  calculé sourcé TFT). Committé+poussé `da15b37`.
- **QB-6 ratifiée** (anéantissement mutuel = match nul, aucune perte de Life) et **DP-9 ajoutée**
  (Bench plein → Buy refusé, gap signalé par 05_ECONOMY_BIBLE.md lui-même, comblé avant build) —
  verbatim dans `HUMANGATE_2026-07-19_QB6.md` / `HUMANGATE_2026-07-19_DP9.md`.
- **Incrément 2 « preparation + economy » FORGÉ EN RÉEL** (`auto_battler_i2`, profil `increment`,
  s3→s12 exécutés réellement — decompo/archi/wiremap/red-team-plan Qwen/build/oracles/
  mutation/red-team-code Opus/verdict signé). Red-team code a trouvé HIGH-1 (compteur
  module-global cassant le déterminisme replay, INV-19) → **corrigé et prouvé** avant merge.
  Verdict `HUMANGATE_READY_WITH_OBJECTION`, authentique (`forge.verify_run` exit 0).
  **HumanGate Pierre : MERGE ratifié** → committé `e72a0e4`. Petite itération déléguée pour
  les 4 findings MED (réservation Pool réelle, Buy lié à la Shop, payloads Events alignés
  bible, faux Event Spawn retiré) → **corrigés, re-vérifiés indépendamment** (92/92 tests,
  91/98 mutants=92.9%, 4 oracles verts), committé `bccbef9` (inclut aussi `shop/shop.mjs`
  oublié du commit de merge — repéré par re-vérification indépendante, pas par le sous-agent).
  **Rien poussé** (gate séparé, non demandé).
- Reste ouvert : incrément 3 Combat toujours bloqué sur l'incrément « economy » côté
  bibles/gate (celui-ci est maintenant FAIT — débloque potentiellement la suite), LOW-6
  (biais mineur tirage Shop, non traité, non demandé).

## Session 2026-07-18 (archivée)
Archive complète : `journal/context-archive-2026-07-18.md` — architecture 16 bibles auto_battler
RATIFIÉE, 4 HumanGates, corpus 00–07, run Forge `auto_battler_i1` s0→s12 mergé (`44592b3`).

## Historique 2026-07-09 → 2026-07-15 (archivé)
Archive complète : `journal/context-archive-2026-07-14-15.md` — mémoire qui compose (Forge),
shmup run1, pipeline 3D, factory contractuelle mergée master.

## ⚠️ DÉCISION MAJEURE — PIVOT PRODUIT (ratifié Pierre, 2026-07-05/06)
> **Toute session future qui propose du travail Rocky ou de l'outillage builder DOIT renvoyer ici.**
- **Rocky : GEL.** Aucune session d'optimisation moteur sans HumanGate explicite.
- **Lane STUDIO : GEL** (ratifié Pierre 2026-07-19) — `autopilot.py`, `scripts/studioV2/`, lanceurs.
  Lire OK, modifier = HumanGate. Hors gel : `tests/studioV2/`, `studioV2_MIGRATED_HOLD/`.
  ⇒ `lab/agent_policy/` + taxonomie `producer/code/qa` = **legacy de fait** ; plus que 2 taxonomies
  vivantes (`.claude/agents/` + contrats Forge). Détail : [[lane_studio_frozen]].
- **Factory réorientée** : jeux de cartes FR — **Belote = produit 1**, **Tarot = produit 2** (moteur de plis commun).
- Actions du pivot : re-triage ledger FAIT (triage v2 2026-07-19, non commité) ; spec produit Belote
  EXISTE (docs/superpowers/specs/2026-07-06-belote-bloc2-*) et Belote est PUBLIÉE ; reste : étage 2 WebRTC gated.

## Impasses / doctrine (portées)
- LEDGER canonique = `lab/chains/IMPROVEMENT_LEDGER.yaml` ; écrire via `kaizen_loop.py`.
  `settings.json` : `Write/Edit(lab/chains/**)` en **ask** (mitigation IMP-247) — attendu, pas un bug.
- **Forge** : `is_clean_pass()` = seul prédicat de passage propre ; `software_verdict` seul ≠ signal de promotion ;
  survivant mutation trié = objection, jamais READY propre. Recette d'audit : `grep -rn 'software_verdict.*==.*OK'`.
- `train.py` gelé (Rocky = GEL). Serveur builder : `node demo-server.ts` :3000.
- Une variable à la fois · fondations avant features · **aucun commit/push sans go explicite Pierre**.

## Session 2026-07-19 (chat stratégie, suite) — mode commandement + mission Opus lancée
- **Mode raffiné (ratifié Pierre)** : Fable = UNIQUEMENT couche de commandement (stratégie · arbitrage ·
  mémoire · vision Forge · plans) ; Opus = raisonnement profond ; Sonnet = mécanique validée.
- **Directives jeux (Pierre)** : Belote sur Render → micropatchs seulement ; AutoBattler → playtest
  local PRIORITAIRE avant toute décision release ; ne pas mélanger jeux et refonte studio.
- **LIVRÉ — audit Opus « couche décisionnelle »** (`docs/audit/DECISION_LAYER_AUDIT_2026-07-19.md`,
  PROPOSED, annoté contre-vérif Fable 2026-07-20) : chaîne canonique trouvée 6/6 maillons ; trou T1 =
  écriture mémoire Forge→ledger (proposals SANS lecteur de contenu — contre-vérifié par grep indépendant) ;
  3 gabarits HumanGate DOCUMENTED_ONLY jamais employés ; `project_bible`/`propose_bible_entry` inertes.
- **Architecture Knowledge Resolver — direction RATIFIÉE (2026-07-20)** après challenge de conception
  Fable×Pierre : résolveur = consolidation (pas de nouvelle couche), rasoir 4 conditions pour l'auto-
  promotion, score advisory jamais juge, modes automatic/oracle/human (consensus supprimé), HumanGate
  conservé comme nom de l'acte, ordre incrémental 5 étapes, règle anti-couches. Protocole V1 rédigé :
  `docs/forge/KNOWLEDGE_RESOLVER_V1_PROTOCOL.md` (PROPOSED — H1, métriques M1-M4 posées avant,
  sonde anti-théâtre, zéro écriture, non-mélange jeux).
- **Resolver V1 CONSTRUIT (2026-07-20, gate Pierre)** : `scripts/forge/knowledge_trace.mjs` (+ `--verify`
  anti-théâtre, exit 1 prouvé) + `pending_review.mjs` (read-only strict) — 41/41 tests verts REJOUÉS par
  l'orchestrateur ; file réelle visible : 9 dépôts dormants (4 ledger + 4 project + 1 erreur). Limite
  d'usage : items.json JAMAIS dans le run_dir (auto-confirmation du verify). NON COMMITÉ.
  Reste V1 : M1-M4 sur 3 runs naturels (trace + verify par run, revue file par session de gate).
- **FORGE Run A `card_engine-20260720a` TERMINÉ (2026-07-20, go Pierre « forge le tarot »)** :
  CardEngine V0 (core content-agnostic) + BeloteRules (parité 15 goldens vs belote-claude publié,
  JAMAIS touché) + harnais. **Verdict signé OK / HUMANGATE_READY_WITH_OBJECTION — verify_run overall
  TRUE** (HMAC+évidence+mutation+git). 97 tests · parité 20/20 · solvabilité 5 seeds + playGame ·
  mutation canonique 206 mutants / 11 survivants TOUS triés (gate passed, exception). ~1,81 M tokens.
  Histoire (journalisée connecteur 6) : haiku « ALL PASS » démenti par oracles → escalade sonnet ×3 ;
  red-team code opus blind : HIGH trickWinner + R6 jamais appliquée en jeu réel + théâtre solver
  (flags littéraux) — tout corrigé/prouvé ; verify_run a REJETÉ un reçu mutation artisanal → refait
  canoniquement. Run B (TarotRules, profil increment) = APRÈS gate Pierre.
- **Resolver V1 — 1er point de mesure réel** : knowledge_trace 5 items **FOUND partout, sonde
  anti-théâtre exit 0** (après leçon de format : ref = TOKEN recoupable, pas description). M1 ✓ M2 ✓ ;
  M3 en attente décisions file ; M4 ok. 2 propositions Run A déposées (ledger + projet, propose-only).
- **MISSION FORGE V2 LIVRÉE (2026-07-20)** : P1 autopsie horodatée + P2 challenge Opus (T1/T5 à moitié
  infirmées, 2 angles morts dont l'auto-attestation de la knowledge_trace, ZÉRO cas Evolve justifié)
  + **`docs/audit/FORGE_V2_CONSOLIDATION.md`** (PROPOSED) : 4 compilateurs d'actifs + formes-cibles,
  6 règles d'orchestration (O1-O6, chacune née d'un fait), workflow cible amendé aux bornes,
  6 renforcements de l'existant (R1 anti-théâtre · R2 playtest→journal · R3 verify_run⟷trace ·
  R6 packets→mandatory_read · R7 design-intent charter · R8 usage_examples), hypothèses classées,
  tableau de bord baseline. MAJ `STUDIO_MASTER_SCHEMA.html` en cours (Sonnet).
- **RATIFIÉ (2026-07-20)** : principe de viabilité (« la Forge n'a pas à prouver le fun — elle empêche
  de construire sur un système manifestement invalide ») · **R9 solvabilité minimale 5 volets =
  PRIORITAIRE** · santé ludique = classe d'oracle EXPÉRIMENTALE advisory (familles impasse/faux-choix/
  atrophie ABANDONNÉES) · consolidation restructurée §4-A renforcements prouvés / §4-B capteurs
  expérimentaux. Mémoire : forge_viability_doctrine.
- **§4-A EXÉCUTÉ (go Pierre, 2026-07-20)** — tous renforcements câblés ET falsifiés, contre-vérifiés
  par l'orchestrateur : R9 solvabilité auto_battler 5 volets (oracle exit 0, falsification 14 tests,
  `check_solvability_wired` false→true, zéro bug de jeu, note : victoire de PARTIE non définie par les
  règles = TODO FOG existant) · R1 anti-théâtre GATING au driver s10a (fixture théâtrale → BLOCKED ;
  a débusqué du théâtre dans nos propres fixtures de test, corrigé) · R3 verify_run⟷knowledge_trace
  (trace théâtrale → REJET) · R2 record_playtest→pré-mortem (appelant = orchestrateur à chaque
  playtest) · R6 packets en mandatory_read s3/s4 · R7 design-intent charter + check_charter (18 tests)
  + câblé au skill s0 · R8 usage_examples 2/30 remplis réels (kb-validate PASS, idempotence sha
  identique ; ARBITRAGE orchestrateur : BRICK_SPEC étendu d'un champ optionnel + helper optional() —
  enabler minimal de la ratification, falsifié 4 tests, à confirmer en gate). pytest 482/483 ·
  auto_battler 158 tests · KB 115 tests.
- **AUDIT R10 LIVRÉ (2026-07-20)** : `docs/audit/FORGE_V2_R10_HEALTH_ORACLE_AUDIT.md` — verdict :
  la CLASSE « oracles santé ludique structurelle » = DOCUMENTED_ONLY → **ABANDON recommandé** (membres
  déjà couverts par R9/§4-B ou ratifiés-abandonnés). Une seule proposition minimale survit : sentinelle
  plateforme (`plateforme_cible ⇒ artefact présent`, advisory, greffe s10a, valeur FAIBLE — appel Pierre)
  + option télémétrie usage-par-contenu sur volet 5.
- **AUDIT BAS LIVRÉ (2026-07-20)** : `docs/audit/FORGE_BALANCE_ASSURANCE_SYSTEM_AUDIT.md` — L1 génération
  contrainte = MANQUE réel (matrice Chess TCG DOCUMENTED_ONLY, générateur NOT_FOUND en code, vérifié
  08_GENERATOR_UNIFIED_CANDIDATE.md:49) → Evolve/gate déterministe ; L2 simulation = EXTENSION de
  `role_sim.mjs` (primitif L2 exact, orphelin dans knowledge_base/, jamais appliqué à un vrai jeu,
  bande gardien [1,999] = exemple d'une bande qui ne peut pas rougir) → Improve advisory conditionné ;
  L3 pont LLM-seed-oracle = MANQUE du connecteur → Improve. P0 : Bibles AutoBattler = schémas excellents
  mais VALEURS TOUTES TBD + Balance/Simulation/Content Bibles inexistantes → première tâche = imposer
  les valeurs, pas construire les agents. TENSION signalée non tranchée : verbatim mission (« skill plat
  bloque ») vs ratification §4-B (dominance advisory) — lecture compatible : L1/L3 gatent, L2 advisory.
- **BAS V2 LIVRÉ (2026-07-20, corrections game master intégrées)** :
  `docs/audit/FORGE_BALANCE_ASSURANCE_SYSTEM_AUDIT_V2.md` — L1 process d'enveloppe PAR JEU (Evolve,
  gate dur, matrice Chess TCG = contenu d'avril NON ressuscité) · L2 Improve-conditionné ADVISORY
  post-démo (radar sur les itérations du game master, jamais la 1re sortie) · L3 pont seed (Improve,
  bots-qui-complètent suffisent à rejouer) · **agents-joueurs = RISQUE MAJEUR NON RÉSOLU** (le studio
  sait compléter, pas jouer-à-niveau ; Rocky échec gelé +10 FAIL confirmé hooks) · chaîne dure :
  P0 valeurs → P1 agent-à-niveau PROUVÉ → P3 calibration → L2 mesure · « bloque si skill plat » acté
  erreur de fusion (seul le déterministe gate, cohérent §4-B).
- **LES 8 GATES TRANCHÉES ET EXÉCUTÉES (2026-07-20)** : BAS V2 ratifié (P0 drafts livrés : 32 valeurs,
  6 choix design purs, 2 écarts code↔intention V-13b/V-24) · Run A card_engine ACCEPTÉ (fiche
  HUMANGATE_2026-07-20_RUN_A) · pending_review 11/11 disposé (L1-L2 reject, reste accept — M3 ✓,
  décisions dans lab/reports/pending_review_decisions.jsonl, promotion matérielle différée à l'étape
  Promotion Policies) · R8 confirmé · format décision consacré + batch §3-ii FAIT (gabarits LEGACY,
  STUDIO ALIGNÉ ✅, watchlist 34, T1 fermée confirmée par fil-piège) · R10 sentinelle ABANDONNÉE (>5 min)
  · capteur dominance LIVRÉ (sondes vertes, 5 unités dominant_agreed advisory sur contenu réel — limite
  inter-rangs documentée) · **7 COMMITS** (1143682→8c5ccf0 : ledger, forge+resolver, card_engine,
  auto_battler+R9+drafts, KB, capteurs/décisions, docs/gouvernance). RIEN POUSSÉ (gate push séparée).
- ⏸️ Restes : **200 fichiers non commités HORS de mon périmètre** (llm-lego 74, lab anciens 47,
  studio 36, games shmup/leviathan 30, fixtures p1 5…) = territoire des sessions parallèles/antérieures
  — à commiter par elles ou sur go sweep explicite Pierre. À venir : chantier-recherche agent-à-niveau
  (protocole d'abord) · cycle de gates Bibles P0 · Run B Tarot · playtest AutoBattler (+record_playtest)
  · M1-M4 (2 runs restants) · push (gate).
- Pendantes : playtest AutoBattler (prioritaire côté jeux, hors refonte studio).

