# PHASE A (question préalable §4) — Faisabilité de la sonde comptée E2-SA-D′

- **Date** : 2026-07-12 (nuit) — source : session Claude Code (orchestrateur), sur go
  Pierre « reprendre la phase A de faisabilité de la sonde breakout avec la solvabilité
  corrigée ».
- **Parent** : `P1_2A_E2_PROTOCOL.md` §4 (question préalable, tranchée AVANT tout run
  capteur) · annexe `P1_2A_E2_REDTEAM_ADJUDICATION.md`.
- **Préalable exécuté** : garde `import.meta.url` de `solvability.mjs:127` corrigée
  repo-wide (`pathToFileURL`) — le volet (d) s'exécute RÉELLEMENT (F-T2 fermée) ;
  `run-oracle.mjs` breakout PASS 4/4, `fixtures/p1/check.mjs` exit 0 après re-collect.

## Question tranchée

Le candidat E2-SA-D′ (récompense inatteignable naïvement par LEVEL-DESIGN) échappe-t-il
STATIQUEMENT aux deux mâchoires (P0 solvabilité · invisibilité B via T_pre + B2 absolu) ?

## Méthode (conforme §4 — moteur pur, PAS le capteur)

- **Candidat** : briques confinées à la colonne extrême gauche — 1 bloc modifié dans
  `level.mjs` (`for (let col = 0; col < 1; col++)`), contrôles intacts, `game.mjs`
  intact (R8 intact). Diff exact : évidence `candidate_level.diff`.
- **Simulation déterministe** `sim.mjs` : `BreakoutGame` headless importé directement,
  DT 16 ms, fenêtre 14 000 ms (875 frames) = t_pre_max (4 s) + 40 × cadence_max (250 ms).
  Séquence d'inputs = le VRAI `makeInputSequence` du capteur (`sensor.mjs`, mulberry32,
  seed 1234, 40 tokens `[ArrowLeft, ArrowRight]` : 19 L / 21 R), holdMs 120, jeu
  seed 888 — identique aux CONFIGS `collect.mjs`. Trois politiques : borne min
  (t_pre 2,0 s · cadence 150 ms), borne max (4,0 s · 250 ms), sans-input.
- **Solvabilité** : `solvability.mjs` (garde corrigée) exécuté sur la copie candidate.
- Copies en **scratchpad uniquement** — aucun fichier du repo modifié, aucune sonde
  posée dans `fixtures/e2/` (la construction des sondes reste conditionnée à la
  ratification v2).

## Résultats (mesurés)

| Mesure | Pristine (contrôle) | Candidat E2-SA-D′ |
|---|---|---|
| Niveau 0 (seed 888) | 33 briques (27 cassables), x ∈ [40, 740] | 3 briques (2 cassables), x ∈ [40, 100] |
| firstScore — borne min | 2 240 ms | **JAMAIS (null)**, endScore 0 |
| firstScore — borne max | 2 240 ms | **JAMAIS (null)**, endScore 0 |
| firstScore — sans-input | 2 240 ms | **JAMAIS (null)**, endScore 0 |
| Solvabilité (seed 1, bot follow) | WON à 26 752 pas | **WON à 6 189 pas** (score 70, 0 brique restante), exit 0 |

- **Cohérence exposition §2** : pristine marque à 2 240 ms ≈ T_pre 2,3 s mesuré au
  red-team (fait (c)) ; pristine marque sous les 3 politiques (compatible B2 sain = 1,
  fait (b)) — test de cohérence PASSÉ, aucune contradiction.
- **Prédiction « solvabilité verte et plus rapide » confirmée** : 6 189 < 26 752 pas.
- **Reproductibilité** : simulation ×2, sorties strictement identiques (diff vide),
  exit 0/0.
- Évidence : `lab/forge_sensors/_e2_evidence/phaseA_feasibility/` (sim.mjs sha256
  `9e4ff01e…`, level.mjs candidat `4172d4ef…`, run1/run2, diff, log solvabilité).

## Verdict de la question préalable

**E2-SA-D′ est VIABLE — pas d'ANNULATION pré-run, aucun redesign consommé.**
Le candidat échappe statiquement aux deux mâchoires : score = 0 sur toute la fenêtre
sous les deux bornes du modèle temporel ET sans-input (⇒ `steps_to_first_reward` attendu
null au capteur, même avec B2 absolu) ; le bot de solvabilité gagne.

## Ce que ceci ne dit PAS

- Rien sur la détection réelle par le capteur (phases B→D, jamais lancées ici).
- Rien sur B1/B3/first_delta (prédits silencieux au protocole — couche capteur, hors
  périmètre de la simulation statique).
- La géométrie exacte du candidat (colonne extrême GAUCHE, `col < 1`) est désormais un
  fait consigné : c'est ELLE qui devra être posée telle quelle en sonde `fixtures/e2/`
  en phase A complète — tout écart = nouvelle simulation.

## Suite (gates)

Ratification Pierre du protocole v2 (acte de restriction §6 + disclosures) toujours
requise avant : gels sha, profils JSON, construction des 4 sondes, TDD
`profile_eval.mjs`/`depouille_e2.mjs`, puis phases B→D.

```
software_verdict: OK            (simulation exécutée, reproductible ×2, exit 0)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
