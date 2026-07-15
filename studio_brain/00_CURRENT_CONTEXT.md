# Contexte courant TCS

## Session 2026-07-15 — Audit cognitif Forge + trio P0 (COMMITÉ, non poussé)
Question auditée : « la Forge est-elle un studio IA cohérent avec mémoire collective, ou des agents en
file indienne ? » **Verdict** : cohérente EN PRODUCTION (contrat→oracle→verdict signé→HumanGate, blackboard
intra-run, PILOU inter-run) mais elle DÉRIVAIT au niveau studio (cartes périmées, raisonnement non accumulé).
**Trio P0 construit+prouvé+COMMITÉ** (`d415c9b` + `9607bc4` sur `feat/forge-oracle-gate`) :
- **L1** `scripts/forge/studio_selfaudit.mjs` — auto-audit déterministe du studio (dérive doc↔réalité +
  connecteurs dormants). `--write` génère `docs/forge/STUDIO_STATUS.generated.md` (tableau de faits vivant,
  déterministe) **rafraîchi AUTO au pre-commit** (`.claude/hooks/pre-commit`, fail-open).
- **L2** Project Bible par jeu : `studio_link.project_bible()` lu en s0 + `propose_bible_entry()` propose-only ;
  template `docs/forge/PROJECT_BIBLE.template.md`.
- **L3** section « Lane FORGE » + routing `/forge` dans CLAUDE.md.
- **6 cartes corrigées** (search.mjs/role_sim/reuse_ratio/pool.py/s2.5-artbible/pursuer-mobile « cible »→« existe »)
  + 1er commit de STUDIO_ARCHITECTURE/ATLAS/MASTER_SCHEMA. Régression `pytest scripts/forge/tests/` 390/390.
Détail : memory [[forge_cognitive_audit]]. Reste (levier L5) : connecteurs ledger/project proposals dormants.

## ⏸️ ABSENCE PIERRE — GATES EN ATTENTE AU RETOUR (clôture 2026-07-15)
1. **PUSH** : **27 commits** locaux non poussés sur `feat/forge-oracle-gate` (fast-forward propre, tip origin
   `f6bfab8`). Inclut le trio P0 + tout le Forge 07-11→15 (art bible/s2.5, KB, pool, panel). **Go push explicite requis.**
2. **Commit artefacts shmup** : `games/shmup_slice/` + `docs/forge/FORGE_IMPROVEMENT_REPORT_shmup_run1.md`
   (+ SHMUP_PREPROD) — sur disque, NON commités.
3. **Bug timeout Windows = P0 Forge** : corriger AVANT tout re-run full (tuer l'ARBRE de process au timeout ;
   inspecter le disque avant de conclure BLOCKED). Sinon chaque run refait 2h15 + faux BLOCKED.
4. **3D** : télécharger `RealESRGAN` pour tester la texture ? ; le pipeline est un générateur prouvé, PAS un
   consommateur validé → pas de 3D sous oracle sans validateur.

## Sessions 2026-07-14 clôturées
- **shmup run1** (« Fable 5 Forge supervisor role ») : 1er run FULL réel s0→s12, jeu temps-réel 3 maps+3 boss
  jouable+solvable+e2e — MAIS **faux BLOCKED** (bug timeout Windows : petit-fils claude.exe non tué, build
  sonnet 2h15 jeté). Mutation 70.5% (tests faibles). Décision **AMÉLIORER AVANT PROCHAIN RUN**. [[forge_shmup_run1]]
- **Pipeline 3D locale** (« 3D asset generation ») : Hunyuan3D-2.1 + Blender 5.1.1 + CUDA sur RTX 5080, **HORS
  repo** (`~/3d-pipeline` WSL2). Génération de FORME prouvée bout-en-bout ; texture bloquée (RealESRGAN). [[forge_3d_pipeline]]

## Historique condensé (détail en git / RESULTS / journal)
- 2026-07-13 : s9 amendé SEARCH-d'abord + `reuse_ratio.mjs` ; 2 ROLE (pursuer-continuous, guardian-static) +
  `role_sim.mjs` généralisé ; test externe s9 (chase_prototype) → `search.mjs` corrigé (fiches autonomes).
  COMMITÉ `dbcfd2b`.. (dans les 27 non poussés). Détail : `knowledge_base/roles/RESULTS_*.md`.
- 2026-07-12 : plans archi studio (3 docs, maintenant commités+corrigés) ; KB par ingestion (`kb_tactics` oracle
  4/4) ; s10d E1 SUCCESS ; `forge-live.html`. Archives : `journal/context-archive-2026-07-12.md`.
- 2026-07-09→11 : /forge usine contractuelle MERGÉE master (13 contrats, ADR-002, e2e+gel+mutation).
  `a293723`→`87e9ec4` · [[forge_contract_dispatcher]]. Antérieur : `journal/context-archive-2026-07-05/06/08.md`.

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
