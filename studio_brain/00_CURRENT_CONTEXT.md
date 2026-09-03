# Contexte courant TCS
*(Handoff. Dernière session : 2026-09-03 — **refresh CLAUDE.md** (213 → 79 lignes). Sessions
précédentes : 2026-09-01 Shadow Audit V1→V6 CLOS · 2026-09-01 requalification PAIRE 2 · 2026-08-30
RUN 1 + paire pilote CLOS. Détail complet archivé :
`journal/context-archive-2026-09-03-avant-refresh-claudemd.md`.)*

## Session 2026-09-03 — refresh CLAUDE.md (GO Pierre « change », commit + push GO)
- Analyse confrontée au dépôt : 2 doublons contradictoires dans le routage, chiffres faux (studioV2
  45 → 89 trackés, ledger 244 → 270), 7 fichiers Forge cités sur 50, régime T0/T-GPU absent,
  invariant AUTO_ATTESTED absent, section CEO et détail du gel STUDIO = lane gelée, lanes ROCKY/JEUX
  sans activité depuis juin. Consommateurs actifs vérifiés : autopilot/studioV2/agent_policy = 0 ;
  `studio_meta_latest.json` lu par /fog /monitor /autoloop /tick date du 2026-06-27.
- Nouveau CLAUDE.md : règles absolues + AUTO_ATTESTED + GO explicite · délégation · lane Forge avec
  chemin canonique et T0/T1/T-GPU · lanes dormantes en 1-2 lignes · gates mécaniques réels
  (hooksPath, pre-commit, forge_guard, git_guard + sentinelle 10 min) · decision-log dans la table mémoire.
- **Gestes en attente de GO séparé** : (2) archiver hors dépôt `AI_MEMORY/`, `STUDIO_CONTEXT_LIVE.md`,
  `COWORK_CONTEXT.md`, sentinelle `.claude/HUMAN_GIT_OVERRIDE.json` (2026-08-21, inerte) ·
  (3) sortir les 8 skills legacy du dossier chargé + retirer la ligne ELO périmée (2026-06-27) du hook
  de session · passage `consolidate-memory` (130 fiches, index 129 lignes).
- Constats hors périmètre, non traités : `.claude/rules/godot-scripts.md` scopé sur `assets/godot/**`
  (dossier absent, projets Godot sous `games/*/`) · `studio_brain/state/` périmé (2026-06-28) ·
  /gate l.138 cite encore kaizen_loop.py.

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

## Prochaine étape
1. GO gestes 2 et 3 du refresh (archivage référents/sentinelle, skills legacy, hook ELO).
2. Décisions C.6 (5) + niveau CONTENT REQUIREMENTS — inchangé.
3. Sélection pre-mortem par étape (meilleur levier mesuré) sur signal Pierre.

## Impasses / passifs connus
Gates historiques : e2e `DirAccess`, solvabilité argv, mutation legacy · `check_wiremap_contract`
non consommé · câblage `asset_dispatch` → contrats asset (écrits, non chargés) · rouge `p3_alpha`
hors périmètre (`oracles.json`, autre session) · working tree sale pré-existant (jsonl de runs,
`test_evidence_isolation_fixture.py`, `.playwright-mcp/`) — triage non fait.
