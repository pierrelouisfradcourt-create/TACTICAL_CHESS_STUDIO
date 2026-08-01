# Contexte courant TCS
*(Handoff. Historique complet : `studio_brain/journal/2026-07-31_00_CURRENT_CONTEXT_archive.md`
→ `2026-07-30_00_CURRENT_CONTEXT_archive.md`.)*

## Session courante : 2026-07-31 (Fable orchestrateur) — clôture V2 commitée + campagne Breakout V2 JOUÉE EN ENTIER
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
1. **Gate de campagne Breakout** (4 points, détail `BREAKOUT_V2_CAMPAIGN_REPORT_2026-07-31.md` §8) :
   - **Amendement F-A/F17** : la promesse gelée `fixed_step_accumulator` héritée en CONCEPT de
     Snake (« aucun rattrapage, EXACTEMENT 1 tick ») était FAUSSE en physique temps réel (impose
     un jeu au ralenti sous 60 fps) — l'orchestrateur l'a amendée (reste conservé, rattrapage
     borné) et documentée en fog F17, `RATIFICATION_GATE_EN_ATTENTE`. **À ratifier ou inverser.**
   - Playtest **ressenti** (le mécanique/visuel est fait et prouvé par capture GPU — le feel reste
     un geste Pierre). Lancer : `<godot> --path games/breakout_v2 --rendering-driver vulkan`.
   - Sort des leçons L1-L5 proposées et de 2 dégels ciblés (exemption GPU par marqueur render,
     garde `oracles.json` au lancement de campagne).
   - Merge/reject/freeze de la campagne (verdict signé = HUMANGATE_READY, pas décidé).
2. **NON COMMITÉ, HORS PÉRIMÈTRE ORCHESTRATEUR** : `scripts/observer/`, `docs/observer/`,
   `lab/reports/observer/breakout_v2/` — une « Forge Observer V1.5 » (console lecture-seule,
   serveur stdlib port 8771, `python scripts/observer/live.py --project breakout_v2 --port 8771`)
   est apparue pendant cette session (fichiers datés 14:37→17:06, un autre process/session, PAS
   produite par cet orchestrateur). Son propre rapport dit `software_verdict: OK` (10 activations
   LLM vérifiées, 9 MATCH/0 MISMATCH/1 NO_DECLARATION sur l'empreinte de prompt). **Jamais examiné
   ni touché ici — geste Pierre : décider de le committer/réviser séparément.**
3. **D-b** clore la calibration Snake (N=3 fait, dépasse le seuil 20% → règle prescrit N=5).
4. **CV-9** : deny posées (auto-verrouillantes), ratification toujours en attente.
5. **D-e/f/g/i/j** (Prisme dans standard_godot · lentille marché · déclassements Opus→Sonnet ·
   learning_curve lecteur/journal-only · catalogue provides/requires) — non urgents, non bloquants.

## Ce qui reste à faire (pas de gate, juste du travail futur)
- Requalifier honnêtement le critère produit « déterminisme sur pas fixe » du charter Breakout si
  Pierre inverse l'amendement F-A/F17 (implique un jeu au ralenti assumé, ou refaire le cadenceur).
- Si dégel ciblé ratifié : exemption GPU par marqueur (pas par nom codé en dur) dans
  `product_oracle_godot.py` ; garde de pré-vol `oracles.json` dans `run_real.py`.
- Prochaine campagne Forge (après gate Breakout) : arbitrer cible vierge vs jeu du curriculum
  (Détail H vs CURRICULUM_JEUX_v1, toujours non arbitrés).

## Impasses connues (ne pas re-buter dessus)
- Aucun mécanisme d'exclusion de lecture pour un builder (`read: dépôt entier`). · Confinement
  outils en défaut de format (`Bash(node:*)` vs `Bash`). · `run_real` n'a pas de coupe-circuit
  budget intra-run (contrôle entre runs uniquement). · qwen3.6 INTERDIT pour le JSON (thinking
  vide le content). · Godot headless ne rend pas de pixels (fenêtre GPU obligatoire — confirmé
  à nouveau sur Breakout, 3 volets render FAIL en headless, verts en capture GPU réelle). · Gel
  wiremap_frozen jamais posé pour Snake NI Breakout (profil standard_godot sans s5, garde F5d
  advisory seulement) — régime connu, non bloquant.
