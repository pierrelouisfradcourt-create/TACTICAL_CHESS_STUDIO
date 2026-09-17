# Contexte courant TCS
*(Handoff. Dernière session : 2026-09-03 — **refresh CLAUDE.md** (213 → 79 lignes). Sessions
précédentes : 2026-09-01 Shadow Audit V1→V6 CLOS · 2026-09-01 requalification PAIRE 2 · 2026-08-30
RUN 1 + paire pilote CLOS. Détail complet archivé :
`journal/context-archive-2026-09-03-avant-refresh-claudemd.md`.)*

## Session 2026-09-16/17 — jeu `games/guild_manager/` (demande Pierre, branche claude/guild-management-game-21jcqk)
- Jeu de gestion de guilde livré hors Forge, sur le modèle p3_alpha : 18 fichiers, ~6 100 lignes, zéro dépendance.
  10 itérations sur retours Pierre (détail : `journal/guild-manager-2026-09-17.md`). Systèmes : combat simulé par
  vagues avec rejeu animé · multiclasse D&D (maîtrise niv. 6, héritage des compétences, 3 compétences par classe
  actives ou passives) · 6 races · 14 traits et titres · 6 métiers d'artisanat · 5 bâtiments · escouades 3 × 8
  hiérarchisées + file d'entraînement solo · chaîne d'éveil, bestiaire, guilde rivale.
- Oracle `run-oracle.mjs` PASS : 101 tests `node --test` · e2e Playwright 21/21 · solvabilité + déterminisme 60 j.
  Régisseur : victoires J88–J118.
- Artefact jouable publié : https://claude.ai/artifact/R58fvm1XGfMekhVa7TqCtY (bundle 1 fichier, hors dépôt).
- **Non commité** : attente GO Pierre. Conteneur éphémère → sans GO, le travail est perdu.
- Réserve : l'e2e exige playwright@1.56 installé hors dépôt (build Chromium 1194 du conteneur).

## État Forge (au 2026-09-01, inchangé)
- **Shadow Audit V1→V6 CLOS**, aucun patch. Résidu unique : `TRANSITION_INTEGRITY` NOT_FOUND
  (conservation des ids wiremap gel → après-build). Confirmés : producteur = son propre juge
  (`reference_guard` absent de verdict/verify_run/gate) · Brief sans champ capacitaire · télémétrie
  de jeu NOT_FOUND · 5 contrôleurs dormants. Diagnostic : mécanismes construits, jamais exercés ;
  goulot = ratification humaine (18 validated / 326 leçons).
- Poussés : E0 `fcf666c2` (solvability.mjs émet FORGE_ORACLE_SUMMARY → oracle_measures) ·
  lesson.v2 `25e31b37` (`cause` = champ + porte du contexte agent, 121 leçons migrées, 205 causes perdues).
- **P0 « débrider l'Architecte » RETIRÉ** (E1b : margin_ratio identique, 4,4× le coût, run BLOCKED).
- **Non suivi, conservé comme évidence (décision Pierre)** : `games/p1_beta_E1/`,
  `lab/forge_runs/p1_beta_E1/`, `lab/forge_briefs/p1_beta_E1/`. Un `git clean` les emporterait.
- Leviers ouverts, décroissants : sélection pre-mortem par étape (204/326 portent leur étape, sélecteur
  trie par date) · ratification en lot (308 candidate) · 5 contrôleurs dormants · champ capacitaire
  au Brief · recalibrage `reference_guard` (349 diffs/run) · DRIFT non propagé au verdict.

## Expérience Libre vs Dirigé (L/D)
- **Aucune paire valide à ce jour.** L2 requalifié INVALIDE (finding n°7 : charter.yaml L2 = bloc
  RETURN LINEAGE consommé par l'aval) ; D2 seul bras valide. Finding n°8 : tick de mesure non gardé
  (16 ms vs 100 ms). Défauts STRUCTURELS enregistrés, aucun hotfix. M7 sauté définitivement.
- **Règle verrouillée Pierre (2026-09-01)** : un verdict de chaîne ne promeut jamais seul une
  expérience en valide ; l'identité de l'input normatif consommé s'établit indépendamment.
- Protocole RUN 2 V1 + grammaire D v2 RATIFIÉS (`docs/forge/RUN2_PROTOCOLE_V1.md`,
  `lab/forge_briefs/p1_alpha/structure_imposee_v2.yaml`). Toute inférence L/D exige ≥ 2 paires valides.
- Dossiers : `p2_beta/ANALYSE_PAIRE2_CONSOLIDEE_20260901.md`, `p1_beta/ANALYSE_PAIRE_M1M7_20260830.md`.

## Régime de tests
- **T0** `pytest scripts/forge/tests/ -m "not gpu_window"` ≈ 5 min 42 (2 332 verts).
- **T1** `test_observer_integration_real.py` = seul test autorisé à lancer le vrai Observer.
- **T-GPU** 7 tests `-m gpu_window` — sur GO explicite seul (ratifié 2026-08-30).
- Pre-commit : node --test bloquant (1 029 tests) · commit_scope_guard · selfaudit.

## Verrous actifs (Pierre)
- World Scan hors périmètre · R8 BLOQUÉ jusqu'à signal · profils review/increment PASSIVE.
- Gels decision-log 2026-08-28 : île V2 · panel Prisme multi-lentilles · pile Codex/GPT = LEGACY.
- 3 bannières `00_STUDIO_CONTROL` posées, non commitées — décision en attente.
- Kitten Clicker : référence produit = sonde V5 « 3 tableaux » ; C.6 V1.1 PROPOSED, 5 décisions
  HumanGate en attente. Séance de ratification PRÊTE : `lab/reports/ratification_session_20260828.md`.

## Revue hebdomadaire de mémoire — 2026-09-06 (tâche planifiée, lecture seule du dépôt)
- Vault réaligné : `000_HOME.md` (projets + dashboard), `gamedesign/lessons.md` (aucune promotion :
  0 playtest sur la période), `projects/snake-survivor-genesis.md` (contrôle de péremption, 42 j).
- **Constat neuf : `games/kitten_clicker/` est absent du dépôt** — ni sur disque, ni suivi, ni ignoré.
  Preuves conservées dans `lab/forge_runs/kitten_clicker/`. Suppression volontaire ou perte : à trancher.
- 5 gestes des 09-01→09-03 n'ont pas d'entrée au decision-log (qui s'arrête au 09-01). Candidats
  rédigés **en propose-only** : `decisions/PROPOSED_2026-09-06_ratifications.md`. **Rien logué.**

## Prochaine étape
1. GO gestes 2 et 3 du refresh (archivage référents/sentinelle, skills legacy, hook ELO).
2. Décisions C.6 (5) + niveau CONTENT REQUIREMENTS — inchangé.
3. Sélection pre-mortem par étape (meilleur levier mesuré) sur signal Pierre.

## Impasses / passifs connus
Gates historiques : e2e `DirAccess`, solvabilité argv, mutation legacy · `check_wiremap_contract`
non consommé · câblage `asset_dispatch` → contrats asset (écrits, non chargés) · rouge `p3_alpha`
hors périmètre (`oracles.json`, autre session) · working tree sale pré-existant (jsonl de runs,
`test_evidence_isolation_fixture.py`, `.playwright-mcp/`) — triage non fait.
