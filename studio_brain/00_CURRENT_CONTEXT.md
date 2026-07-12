# Contexte courant TCS
Dernière session : 2026-07-12 — **Gouvernance : bibliothèque de prompts + revue des contradictions règles/agents/skills** (2 docs, NON commités — gate Pierre).
Avant : 2026-07-11 (suite) — **Forge 2.0 : P0 intégrité COMPLET (P0.1→P0.4) + tranche P1 mécanique FALSIFIÉE** (branche `feat/forge-oracle-gate`, **RIEN de commité — gate Pierre**).

## Session 2026-07-12 — Prompts + revue règles (NON COMMITÉ)
- **`docs/prompts/PROMPT_LIBRARY.md`** : prompts optimisés pour tous les workflows (10 sections :
  démarrage, cadrage, implémentation par lane, oracles, revues, gates, nuit, forge, méta, garde-fous).
- **`docs/audit/REVUE_REGLES_CONTRADICTIONS_2026-07-12.md`** : 14 findings (4 P0 · 6 P1 · 4 P2).
  P0 : tests/ (qa-tester vs zone protégée) · AGENTS.md obsolète (Codex/GPT, push main vs master) ·
  3 règles ledger divergentes (council vs imp-readiness vs CLAUDE.md) · /tick incohérent avec sa hard rule
  (+ /imp-auto fantôme). Plan de correction en 7 étapes, chaque item = gate Pierre.
- **Gates Pierre en attente (cette session)** : go/no-go sur le plan de correction ; commit des 2 docs.
Avant : 3 gates forge prouvés in vivo (`3e5c000`/`87e9ec4`), /forge mergé master (`e7887ce`).
Historique archivé : `journal/context-archive-2026-07-05/06/08.md`.

## Session 2026-07-11 (suite) — FORGE 2.0 : P0 gelé + P1 falsifié (NON COMMITÉ)
- **Audit Forge 2.0** : cartographie interne (fichier:ligne) × référentiel industrie → `docs/forge/FORGE_2_DESIGN.md`
  (PROPOSED). Constat central : Forge vérifie tout SAUF ce que le joueur voit (Art&Presentation r=0.11 vs mécaniques).
- **P0.1 driver** (`scripts/forge/driver.py`) : machine à états déterministe offline, state.json atomique, reprise
  après kill, escalade bornée EN CODE — remplace la prose skill.md. Ratifié « conservation des preuves ».
- **P0.2 preuve mutation** (`scripts/forge/mutation_proof.py`) : reçu mutation signé lié au run_id + sha256
  (code+tests+harnais e2e+triage). Ferme I1/I2. Revue adversariale (Workflow) : 2 bypass confirmés+reproduits → fermés
  (is_game reprise, sceau tests indirects).
- **P0.3** : baseline verte obligatoire ; `verify_run` redescend dans le reçu mutation (échec dur au /gate) ;
  `is_game` re-dérivé de signaux on-disk non-downgradables. Sweep final adversarial : 3 chemins confirmés → 2 fermés
  en TDD + **doctrine triage ratifiée Pierre** : survivant trié = JAMAIS un OK propre → `HUMANGATE_READY_WITH_OBJECTION`
  + flag (aucun nouveau software_verdict).
- **P0.4** : footgun préfixe (`HUMANGATE_READY` ⊂ `…_WITH_OBJECTION`) → **`forge.verdict.is_clean_pass()` = SEUL
  prédicat de promotion** (égalité stricte + zéro flag) ; consommé par `propose_ledger_entry` (embarque `clean_pass`).
  Audit consommateurs : Forge couvert ; `executor_report`/autopilot = lane IMP distincte (namespace ≠, non étendu).
  Mention : « risque couvert sur les chemins connus », PAS universel.
- **Preuves P0** : 277 tests forge verts · TDD RED→GREEN sur chaque incrément · repros d'attaque réels (node) fermés.
  **P0 GELÉ** (décision Pierre) : pas de P0.5, pas de workflow de conformité, pas d'élargissement autopilot/kaizen.
- **Séparation ratifiée** : intégrité du système Forge (P0) ≠ qualité des jeux générés (gate séparé).
  `menagerie_tactics` = artefact / gate qualité séparé, PAS un bloqueur P0.
- **Tranche P1 mécanique-only : CLOSED, expérience FALSIFIÉE** (`docs/forge/P1_MECHANICAL_RESULTS.md`) :
  capteur advisory `scripts/quality_sensor/` (isolé, seedé, 19/19) exécuté sur breakout+menagerie (verts P0) →
  **5 signaux, 0 vrai positif**. A1/A2/A3/A5 lisibilité = KEEP (0 FP, détection non prouvée) ; A6 = DROP ;
  FTUE = MODIFY doc-only (genre-aveugle). Leçon : le goulot = l'interprétation, pas la mesure.
  **Gate réouverture P1 : détection orthogonale à P0 démontrée d'abord.** Proposition : `docs/forge/P1_1_PROPOSAL.md`
  (sondes à défauts injectés, DOC SEULEMENT).
- **P1.1 EXÉCUTÉE — SUCCESS (2026-07-12)** : protocole v2 ratifié+red-teamé (14 findings adjugés), phases A→D
  sans déviation → **4/4 défauts détectés, 0 FP, P0 vert 5/5, gels sha vérifiés** (`P1_1_RESULTS.md`).
  Démontré (formulation ratifiée Pierre) : *A1/A2/A3/A5 détectent des défauts synthétiques connus, orthogonaux
  à P0, sur Breakout, sans FP observé dans cette expérience* — ni généralisation, ni subtil, ni exhaustif.
- **Décisions Pierre 2026-07-12** : **P1 OUVERTE** (blocage méthodologique levé, pas « P1 validé ») ·
  sondes → **fixtures permanentes** `fixtures/p1/` (non-régression capteur, `check.mjs` exit 0 prouvé) ·
  **commits séparés FAITS** : `a13c262` (P0 code) `a2d0b50` (tests TDD) `1663571` (capteur) `103d275`
  (fixtures) `4a93407` (docs forge) `3ac10cc` (évidences). **Acquis principal nommé par Pierre : le cycle
  expérimental complet** (hypothèse→contrat→red-team→adjudication→ratification→expérience→conclusion limitée),
  réutilisable pour tout futur capteur/oracle.
- **Gates Pierre en attente** : (1) **push** de la branche (non poussée — gate séparé) ; (2) premier incrément
  P1 (candidat : contrat `s10d-oracle-visual` couche déterministe advisory — proposition à cadrer) ; (3) merge
  menagerie (gate qualité séparé) ; (4) tri des hors-axe restants non commités (oracles.json+games/breakout
  [artefact jeu], leviathan, llm-lego, ledger, agents/skills `??` d'autres sessions).

## Session 2026-07-11 — Forge : renfort « niveau de production » (3 axes machine LIVRÉS)
- **Axes 1-3 prouvés in vivo** (e2e guard, gel traçabilité, gate mutation) sur `collect_runner` : 30/30 mutants tués,
  bug `_TS_METHOD` exposé et corrigé (`3e5c000`). 219 tests verts à ce stade. Détail : commits `a293723`→`87e9ec4`.

## Session 2026-07-09→10 — /forge : usine d'ingénierie contractuelle MERGÉE master
- **Invariant** : chaque étape = un **contrat d'agent** (17 champs, 3 états) ; registry local résout le runtime.
- **Chaîne 13 contrats** (s0→s12) ; dispatch gouverné + hook dur ; oracles multi-langages ; connecteurs propose-only ;
  ADR-002. 1er run réel : `chesscolor`. Reste (cf. [[forge_contract_dispatcher]]) : durcissements + dashboard.

## ⚠️ DÉCISION MAJEURE — PIVOT PRODUIT (ratifié Pierre, 2026-07-05/06)
> **Toute session future qui propose du travail Rocky ou de l'outillage builder DOIT renvoyer ici.**
- **Rocky : GEL.** Aucune session d'optimisation moteur sans HumanGate explicite.
- **Factory réorientée** : jeux de cartes FR — **Belote = produit 1**, **Tarot = produit 2** (moteur de plis commun).
- Actions pendantes : re-triage ledger (IMP Rocky → FROZEN, revue HumanGate avant écriture) ; spec produit Belote
  (IA à niveaux, défi-par-seed, PWA mobile-first) ; étage 2 = table WebRTC, multi public gated.

## Impasses / doctrine (portées)
- LEDGER canonique = `lab/chains/IMPROVEMENT_LEDGER.yaml` ; écrire via `kaizen_loop.py`.
  `settings.json` : `Write/Edit(lab/chains/**)` en **ask** (mitigation IMP-247) — attendu, pas un bug.
- **Forge** : `is_clean_pass()` = seul prédicat de passage propre ; `software_verdict` seul ≠ signal de promotion ;
  survivant mutation trié = objection, jamais READY propre. Recette d'audit : `grep -rn 'software_verdict.*==.*OK'`.
- `train.py` gelé (Rocky = GEL). Serveur builder : `node demo-server.ts` :3000.
- Une variable à la fois · fondations avant features · **aucun commit/push sans go explicite Pierre**.
