# Contexte courant TCS
*(Handoff. Historique complet : `studio_brain/journal/2026-07-31_00_CURRENT_CONTEXT_archive.md`
→ `2026-07-30_00_CURRENT_CONTEXT_archive.md`.)*

## Session courante : 2026-07-31 (Fable→Sonnet orchestrateur) — Breakout V2 validée Pierre + lessons L1-L5 entrées en mémoire
- **Breakout V2 validée Pierre** : « jeu volontairement simple, mais il remplit son rôle ». Pas
  de suite ouverte cette session ; prochain jeu = autre session, propre contexte/campagne.
- **Lessons L1-L5 validées et écrites dans `lab/reports/lessons.jsonl`** (1re écriture réelle du
  mécanisme `forge.learning_memory`, jamais exercé avant) : 5/5 ACCEPTER, statut `validated`,
  génération 2, chacune citant sa preuve (`fail-59097e0c915c4646` pour L1, expériences run 1/3
  pour L2-L5). Détail : `docs/forge/BREAKOUT_V2_LESSONS_VALIDATION_2026-07-31.md`. DESTINATION =
  tag de routage (standard/schema/wiremap) pour un chantier futur, AUCUNE mutation de surface
  exécutée cette session (L1/L2/L5→standard/, L3→wiremap/, L4→schema/).

## Session précédente : 2026-07-31 matin (Fable orchestrateur) — clôture V2 commitée + campagne Breakout V2 JOUÉE EN ENTIER
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
1. **NON COMMITÉ, HORS PÉRIMÈTRE ORCHESTRATEUR** : `scripts/observer/`, `docs/observer/`,
   `lab/reports/observer/breakout_v2/` — une « Forge Observer V1.5 » (console lecture-seule,
   serveur stdlib port 8771, `python scripts/observer/live.py --project breakout_v2 --port 8771`)
   est apparue pendant la session du matin (fichiers datés 14:37→17:06, un autre process/session,
   PAS produite par cet orchestrateur). Son propre rapport dit `software_verdict: OK`. **Jamais
   examiné ni touché ici — geste Pierre : décider de le committer/réviser séparément.**
2. **5 chantiers futurs routés par les lessons validées** (aucun n'est urgent, aucun n'est ouvert) :
   L1/L2/L5→`standard/` (timeout par profil, pré-vol oracles.json, doc convention FORGE_ORACLE),
   L3→`wiremap/` (justification CONCEPT inter-genres), L4→`schema/` (FAIL vs NOT_MEASURED par
   marqueur). Détail : `docs/forge/BREAKOUT_V2_LESSONS_VALIDATION_2026-07-31.md`.
3. **D-b** clore la calibration Snake (N=3 fait, dépasse le seuil 20% → règle prescrit N=5).
4. **CV-9** : deny posées (auto-verrouillantes), ratification toujours en attente.
5. **D-e/f/g/i/j** (Prisme dans standard_godot · lentille marché · déclassements Opus→Sonnet ·
   learning_curve lecteur/journal-only · catalogue provides/requires) — non urgents, non bloquants.
6. Amendement F-A/F17 (charter Breakout, `fixed_step_accumulator`) — RATIFICATION_GATE_EN_ATTENTE,
   non re-soulevé cette session (Breakout close pour l'instant), reste en archive si Breakout rouvre.

## Ce qui reste à faire (pas de gate, juste du travail futur)
- Prochaine campagne Forge : nouveau jeu déjà prévu au planning, sera traité dans une AUTRE
  session avec son propre contexte/campagne — ne pas anticiper ici.
- Les 5 chantiers routés (point 2 ci-dessus) attendent d'être ouverts individuellement.

## Impasses connues (ne pas re-buter dessus)
- Aucun mécanisme d'exclusion de lecture pour un builder (`read: dépôt entier`). · Confinement
  outils en défaut de format (`Bash(node:*)` vs `Bash`). · `run_real` n'a pas de coupe-circuit
  budget intra-run (contrôle entre runs uniquement). · qwen3.6 INTERDIT pour le JSON (thinking
  vide le content). · Godot headless ne rend pas de pixels (fenêtre GPU obligatoire — confirmé
  à nouveau sur Breakout, 3 volets render FAIL en headless, verts en capture GPU réelle). · Gel
  wiremap_frozen jamais posé pour Snake NI Breakout (profil standard_godot sans s5, garde F5d
  advisory seulement) — régime connu, non bloquant.
