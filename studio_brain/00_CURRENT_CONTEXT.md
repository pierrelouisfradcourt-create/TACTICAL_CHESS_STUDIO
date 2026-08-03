# Contexte courant TCS
*(Handoff. Historique complet : `studio_brain/journal/2026-07-31_00_CURRENT_CONTEXT_archive.md`
→ `2026-07-30_00_CURRENT_CONTEXT_archive.md`.)*

## Session courante : 2026-08-03 (Fable poste de commande) — BREAKOUT V2 CLOS ET GELÉ · cap Tetris
- **Ratification Pierre (verbatim : « Je ratifie les trois points Breakout »)** → entrée
  `BREAKOUT_V2_FREEZE_V1` au `studio_brain/decisions/decision-log.md` (la validation du 2026-07-31
  ne vivait que dans ce handoff et dans un message de commit — trou fermé).
- **Verdict re-vérifié** par `python -m forge.verify_run lab/forge_runs/breakout_v2/verdict.json` :
  HMAC OK · évidence intacte · mutation intacte · **INTÉGRITÉ AUTHENTIQUE**, exit 0. Seule réserve
  attendue : dérive git TOCTOU (signé `2b38702`, courant `c078a87`).
- **5/5 lessons promues à la KB** via `forge.kb_proposal --apply --ratifie-par "Pierre"` :
  catalogue **37 entrées**, `kb-validate.mjs` PASS 0 violation. Ferme le drift
  `lecon_routee_sans_consommateur` (×5). Le point 2 de la liste de gestes ci-dessous est donc clos.
- **Breakout V2 = témoin de régression gelé**, comme Pong. Ne se rouvre que sur preuve issue d'un
  projet ultérieur (consigne Pierre). Aucun tag git : **la Forge n'outille aucune convention de
  baseline** (`grep "git tag" scripts/forge/ docs/forge/` → 0) — le decision-log EST l'état de référence.
- **Observer examiné** (le point 1 ci-dessous n'est plus une inconnue) : 30 modules Python réels,
  4 493 événements / 32 types sur le run Breakout, `proof: MECHANICAL`. Capture bien tokens
  (`llm.usage` ×1136), lectures de fichiers (`file.read` ×275, chemin + `tool_use_id`), écritures,
  outils, contexte et contrat injectés. **Manquent vraiment** : prompt système réel du sous-agent
  (0 occurrence de `system_prompt`) et skills chargés. Post-hoc uniquement — aucun hook
  `.claude/settings.json` ne l'appelle, aucun skill ne le lance, et **aucun de ses artefacts n'a de
  lecteur hors `scripts/observer/`**. C'est là qu'est le chantier, pas dans la capture.
- **Drifts** : le chiffre « 57 » n'existe nulle part dans le dépôt. Comptes réels — breakout_v2 :
  55 occurrences brutes / 56 lignes de vue / **34 `drift_id` uniques** ; p5_gridnav : 17 uniques ;
  union 38. `docs/observer/OBSERVER_V1_5.md:76,107` affirme 43 : chiffre périmé, lui-même un drift.

## Session précédente : 2026-07-31 (Fable→Sonnet orchestrateur) — Breakout V2 validée Pierre + lessons L1-L5 entrées en mémoire
- **Breakout V2 validée Pierre** : « jeu volontairement simple, mais il remplit son rôle ». Pas
  de suite ouverte cette session ; prochain jeu = autre session, propre contexte/campagne.
- **Lessons L1-L5 validées et écrites dans `lab/reports/lessons.jsonl`** (1re écriture réelle du
  mécanisme `forge.learning_memory`, jamais exercé avant) : 5/5 ACCEPTER, statut `validated`,
  génération 2, chacune citant sa preuve (`fail-59097e0c915c4646` pour L1, expériences run 1/3
  pour L2-L5). Détail : `docs/forge/BREAKOUT_V2_LESSONS_VALIDATION_2026-07-31.md`. DESTINATION =
  tag de routage (standard/schema/wiremap) pour un chantier futur, AUCUNE mutation de surface
  exécutée cette session (L1/L2/L5→standard/, L3→wiremap/, L4→schema/).

## Session antérieure : 2026-07-31 matin (Fable orchestrateur) — clôture V2 commitée + campagne Breakout V2 JOUÉE EN ENTIER
- **5 commits de clôture** (319e9a2→ddc4194) : lots dégel 1+2, verrous deny, canon refondu,
  10 décisions ratifiées APPLIQUÉES (apply_decisions --apply : card_engine ACCEPTED, briques
  promues), calibration N=3 archivée. Baseline référence ré-armée (verify CLEAN).
- **GATES VALIDÉES Pierre (verbatim) 2026-07-31** → commit 2b38702 : GATE 1 charter Breakout
  révision 3 (F13 décompte→10 params, F3 points_par_brique ajouté, F2 flottants stricts
  légitimés par le pas fixe, core.audio DEFERRED + mono-niveau ratifiés, node: 3) ; GATE 2
  registre +7 capacités DÉRIVÉES des provides wiremap. Preuves : check_charter,
  check_contract_completeness, check_collisions tous passed.
- **CAMPAGNE JOUÉE EN ENTIER — 3 runs, verdict final OK / HUMANGATE_READY** (dossier de gate :
  `docs/forge/BREAKOUT_V2_CAMPAIGN_REPORT_2026-07-31.md`). Run 1 : timeout s9 (1800 s trop court
  pour greenfield) + oracle non enregistré + orphelin main.gd + mutation 59/73 → verdict BLOCKED
  honnête. Run 2 : correctif → chaîne verte 1er coup, **mutation 73/73**. Run 3 : fix F1
  (accumulateur pas fixe) + protocole FORGE_ORACLE des sondes → **verdict signé OK, verify_run
  overall=True**. Solvabilité 50/50, 305 assertions, jeu DÉMARRE et se joue à l'écran (captures
  GPU envoyées à Pierre, `lab/forge_runs/breakout_v2/playtest/`). Boucle apprentissage exercée en
  prod pour la 1re fois : pool retry, reprise pilotée ×3, failure_event CV-14 réel, pré-mortem
  inter-tentatives, dispatch avec sections cognitives P1 + manifests P4.
- **Commits finaux** : `2b38702` (gates) + `e2cc913` (jeu+preuves+vues, 142 fichiers). Baseline
  référence ré-armée 2× après commit (CLEAN, 367 fichiers). `project.godot` header restauré
  (la capture playtest a fait tourner l'éditeur Godot, qui a re-sérialisé le fichier et écrasé
  le commentaire documenté — aucune clé fonctionnelle touchée, corrigé sans commit).

## ⚠️ URGENT / GESTES PIERRE EN ATTENTE (rien d'autre ne bloque techniquement)
1. **Observer : examiné le 2026-08-03** (voir session courante). Reste un geste Pierre : décider du
   commit de `scripts/observer/` + `docs/observer/` + `lab/reports/observer/`. Chantier identifié —
   porte d'entrée (aucun skill ne le lance), consommateur (aucun artefact n'est lu), capture du
   prompt système et des skills. Le temps réel via hook vient APRÈS : le post-hoc suffit pour Tetris.
2. ~~5 chantiers routés par les lessons~~ **CLOS le 2026-08-03** : les 5 propositions sont
   `APPLIQUEE` au catalogue KB (37 entrées, kb-validate PASS). Les chantiers de surface
   (standard/ · wiremap/ · schema/) restent à ouvrir individuellement, mais la leçon a désormais
   un consommateur.
3. **D-b** clore la calibration Snake (N=3 fait, dépasse le seuil 20% → règle prescrit N=5).
4. **CV-9** : deny posées (auto-verrouillantes), ratification toujours en attente.
5. **D-e/f/g/i/j** (Prisme dans standard_godot · lentille marché · déclassements Opus→Sonnet ·
   learning_curve lecteur/journal-only · catalogue provides/requires) — non urgents, non bloquants.
6. ~~Amendement F-A/F17 (`fixed_step_accumulator`)~~ **RATIFIÉ Pierre le 2026-08-03**, consigné au
   decision-log (`BREAKOUT_V2_FREEZE_V1`).

## Ce qui reste à faire (pas de gate, juste du travail futur)
- **Campagne Tetris (nœud 4) — OUVERTE le 2026-08-03** sur go Pierre : workflow standard
  World Scan → Genre Bible → Charter → Wiremap → Production. Tous les contrats d'étape existent
  déjà (génériques + `scripts/forge/contracts/wm1-wiremap-tetris.yaml`).
  Trois points à traiter en entrée de campagne : (a) 4 décisions de genre non tranchées
  (wall kick · hold · aperçu next · fin haute) — ce sont des faits documentés du Tetris Guideline,
  à résoudre par World Scan, PAS à remonter à Pierre ; (b) **la solvabilité n'a pas de définition**
  (marathon sans état gagné → l'oracle « un bot gagne » ne s'applique pas, il faut un critère de
  survie) — seul vrai arbitrage Pierre de la campagne ; (c) valeurs `A_CALIBRER` du charter
  (budget mutation, max_ticks) recopiées de Breakout, non ratifiées.
- **Gel wiremap** : le profil `standard_godot` n'émet aucun événement de gel (`driver.py:889
  _freeze_rules` ne suit que `s5-wiremap`, absente de la topologie `driver.py:140`). Accepté comme
  non bloquant pour Breakout ; Tetris possède une wiremap et son contrat dédié, c'est là que le
  trou doit se fermer.
- Les chantiers de surface routés par les lessons attendent d'être ouverts individuellement.

## Impasses connues (ne pas re-buter dessus)
- Aucun mécanisme d'exclusion de lecture pour un builder (`read: dépôt entier`). · Confinement
  outils en défaut de format (`Bash(node:*)` vs `Bash`). · `run_real` n'a pas de coupe-circuit
  budget intra-run (contrôle entre runs uniquement). · qwen3.6 INTERDIT pour le JSON (thinking
  vide le content). · Godot headless ne rend pas de pixels (fenêtre GPU obligatoire — confirmé
  à nouveau sur Breakout, 3 volets render FAIL en headless, verts en capture GPU réelle). · Gel
  wiremap_frozen jamais posé pour Snake NI Breakout (profil standard_godot sans s5, garde F5d
  advisory seulement) — régime connu, non bloquant.
