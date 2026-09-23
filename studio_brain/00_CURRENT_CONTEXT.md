# Contexte courant TCS
*(Handoff. Dernière session : 2026-09-17 → 09-23 — **Chroniques de Guilde**, session cloud pilotée depuis le
téléphone, close le 09-23 pour reprendre EN LOCAL sur le PC de Pierre (Godot 4.6, Blender, Affinity, MCP, GPU).
Précédentes : 2026-09-03 refresh CLAUDE.md · 2026-09-01 Shadow Audit V1→V6 CLOS.)*

## Chroniques de Guilde — `games/chroniques_guilde/` · branche `claude/game-ideas-app-store-9dvk6p` · HEAD `72c54dd`
- Jeu Android de manager de guilde au jour le jour entre amis (un héros par ami, sans serveur, état à écrivain
  unique + journal rejouable). Moteur `sim.js` + `tactic.js` (entiers seuls, mulberry32), `data.json`, page
  `index.html`, artefact https://claude.ai/artifact/KC9qsgEm2aj6hPxeXq2FJM (v11). Tout est dans README.md et
  CONTRACT.md (une section par tranche). **Aucun playtest humain à ce jour.**
- **Fait (09-19)** : T9 — six emplacements (cape, anneau), planificateur d'équipement qui CHOISIT (avant :
  46 % de commun porté, 1 % de légendaire, 220 objets dormants), réserve du dragon indexée sur l'avancement
  (nb de héros spécialisés — l'indexation sur la puissance a été essayée puis RETIRÉE : caoutchouc),
  `spec_day_min` 20→17, 3 bugs. **14 bancs verts** (`for b in test/*.mjs; do node $b; done`, UI ≈ 30 min).
- **Portage Godot** : `port/godot/` exécuté sur Godot 4.6.stable → **65/65**. Piège 11 CONFIRMÉ
  (`JSON.parse_string` rend des flottants) → toute lecture passe par `det_json.gd`. `--import` obligatoire
  une fois (sinon `class_name` non enregistrés). Mode d'emploi : `port/godot/README.md`.
- **Vecteurs `golden/` PÉRIMÉS depuis T9** — à régénérer UNE SEULE FOIS après les tranches restantes.
- Specs écrites, non implémentées : `design/ARMURE_ET_PREREQUIS_SPEC.md` (la voie tissu n'existe pas
  mécaniquement), `design/CRAFT_BIOME_SPEC.md` (craft mort : 0,4 % des créneaux, 7 recettes sur 23
  inatteignables), `design/QUETE_DE_CLASSE_SPEC.md` (26 pièces uniques, fenêtre de 9 → 12 jours).
- Variance mesurée (ADR-002) : taux de victoire d'un dragon ±19 à 42 pts selon le jeu de graines ; l'écart
  « avec / sans brûleur » vaut 8 pts, IC95 [−9, +26] → la valeur de la composition n'est PAS établie.
- **Gates Pierre en attente** : G1 ratifier les 5 retouches de décors de bancs (`games/*/test/` n'est pas
  couvert par le hook, détail CONTRACT.md T9 §8) · G2 ordre armure → craft → quête → vecteurs · G4 combat
  Dofus-like ou TFT-like · G5 un playtest humain. (G3 Godot : levée, 65/65.)
- Art : piste retenue par Pierre = ComfyUI + SDXL/Flux en local, rendus canvas du tableau (ancres CAM /
  BSLOT / BCOURT) comme entrées ControlNet pour garder 60 tableaux cohérents. TTS (Piper/XTTS) : plus tard,
  une fois les textes gelés.

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
0. **Chroniques** : session LOCALE sur le PC de Pierre (branche ci-dessus, `git pull`) → gates G1/G2/G4,
   puis tranche armure. Art via l'atelier / ComfyUI une fois le style fixé.
1. GO gestes 2 et 3 du refresh (archivage référents/sentinelle, skills legacy, hook ELO).
2. Décisions C.6 (5) + niveau CONTENT REQUIREMENTS — inchangé.
3. Sélection pre-mortem par étape (meilleur levier mesuré) sur signal Pierre.

## Impasses / passifs connus
Gates historiques : e2e `DirAccess`, solvabilité argv, mutation legacy · `check_wiremap_contract`
non consommé · câblage `asset_dispatch` → contrats asset (écrits, non chargés) · rouge `p3_alpha`
hors périmètre (`oracles.json`, autre session) · working tree sale pré-existant (jsonl de runs,
`test_evidence_isolation_fixture.py`, `.playwright-mcp/`) — triage non fait.
