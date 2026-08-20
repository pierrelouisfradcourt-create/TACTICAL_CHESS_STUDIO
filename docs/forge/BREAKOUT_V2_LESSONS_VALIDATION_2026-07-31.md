# VALIDATION DES LESSONS BREAKOUT V2

*Date : 2026-07-31 · Périmètre : L1-L5 issues du dossier de gate
(`BREAKOUT_V2_CAMPAIGN_REPORT_2026-07-31.md` §6). Aucun audit refait, aucune campagne
reconstruite, aucun fichier de jeu modifié, aucun nouveau chantier ouvert.*

```
software_verdict : OK   (5/5 lessons écrites et vérifiées dans lab/reports/lessons.jsonl)
evidence_verdict : MECHANICAL_VALIDATION_ONLY
claim_verdict    : NO_CLAIM_ALLOWED
```

**Mécanisme utilisé** : `forge.learning_memory.record_lesson_event` (existant, jamais
exercé — `lessons.jsonl` était absent du disque avant cette validation). Chaque lesson est
écrite en deux événements append-only, conformément à la doctrine (`FORGE_EVOLUTION_DOCTRINE_V0.md`
§2.2) : création `candidate` avec `statement`, puis transition `candidate → validated` citant
sa preuve (`caused_by_failure_id` ou `caused_by_experience`) et le run qui la supporte
(`supporting_runs`). Aucune lesson n'a été rejetée cette fois — les 5 sont adossées à une
preuve directe et univoque de la campagne, pas à une hypothèse.

**Note sur DESTINATION** : ce champ est un TAG DE ROUTAGE (surface de mutation future si un
chantier reprend la lesson), pas un emplacement d'écriture exclusif — même patron que
`CAUSE_MUTATION_TARGET` déjà dans le code (`learning_memory.py`). Toute lesson VALIDÉE entre
dans `memory/` (`lessons.jsonl`) quelle que soit sa DESTINATION de routage ; aucune mutation
de `standard/`, `schema/` ou `wiremap/` n'a été exécutée cette session.

---

## L1 — Timeout par profil

```
LESSON:      forge.timeout_greenfield_by_profile
DECISION:    ACCEPTER
RATIONALE:   Mesuré, pas une hypothèse. Run 1 (breakout_v2-run1-20260731-082705) a été
             HALTED exactement au plafond de 1800s sur s9-build-godot-standard, un
             greenfield de 52 lignes de wiremap. La reprise à 5400s a suffi (build complet
             en ~40 min réels, tentative 2). Le défaut actuel est calibré pour du
             correctif, pas pour un greenfield Godot complet — preuve reproductible,
             cause univoque. failure_event : fail-59097e0c915c4646.
DESTINATION: standard/ (défaut de step-timeout par profil dans scripts/forge/run_real.py —
             implémentation différée, future_review)
```

## L2 — Pré-vol des prérequis

```
LESSON:      forge.preflight_oracle_registration
DECISION:    ACCEPTER
RATIONALE:   Mesuré. Run 1 s10a est tombé BLOCKED car breakout_v2 n'était pas enregistré
             dans scripts/forge/oracles.json ; le trou n'a été visible qu'après un build
             complet (~40 min de builder gaspillées), alors que l'enregistrement est une
             fonction pure vérifiable AVANT le premier dispatch (resolve_oracle). Cause
             univoque, corrigée manuellement le même jour (breakout_v2 ajouté au registre).
DESTINATION: standard/ (garde de pré-vol dans run_real.py/dispatch.py, avant s0/s9 —
             implémentation différée, future_review)
```

## L3 — Réutilisation de concepts entre jeux

```
LESSON:      forge.wiremap_concept_reuse_requalification
DECISION:    ACCEPTER
RATIONALE:   Mesuré et coûteux à découvrir. La ligne wiremap
             runtime.fixed_step_accumulator reprenait en CONCEPT le cadenceur
             no_time_catchup de Snake (grille discrète, correct pour Snake) ; son
             expected_proof promettait "EXACTEMENT 1 tick, aucun rattrapage", faux pour
             une physique continue temps réel (spirale/ralenti sous 60 fps). Découverte
             tardive par le red-team run 3 (finding F-A, HIGH), après un build + un
             correctif complets. Amendement déjà appliqué (fog F17), statut
             RATIFICATION_GATE_EN_ATTENTE côté charte de jeu — la LEÇON elle-même
             (principe : provenance CONCEPT ≠ preuve de transposabilité inter-genres)
             est validée indépendamment du sort de l'amendement.
DESTINATION: wiremap/ (règle de forme : toute ligne reused_from.type=CONCEPT devrait
             porter une justification explicite de compatibilité de genre — implémentation
             différée, future_review)
```

## L4 — FAIL ≠ NOT_MEASURED

```
LESSON:      forge.oracle_fail_vs_not_measured_marker
DECISION:    ACCEPTER
RATIONALE:   Mesuré. Le principe FAIL/NOT_MEASURED existe déjà en partie dans le standard
             (check_visual_capture, product_oracle.py) mais product_oracle_godot.py
             n'exempte qu'UN nom de volet codé en dur (core_render_frame) au lieu d'une
             règle générique par marqueur. Conséquence directe run 3 : 3 volets render de
             Breakout (demo_start_visible, demo_brick_destruction, demo_readability_proxy)
             ont rendu FAIL en headless alors qu'ils étaient réellement verts — confirmé
             par capture GPU (lab/forge_runs/breakout_v2/playtest/). Preuve directe,
             instrument identifié, pas le jeu.
DESTINATION: schema/ (product_oracle_godot.py — exemption par marqueur générique plutôt
             que par nom codé en dur — implémentation différée, future_review)
```

## L5 — Convention FORGE_ORACLE

```
LESSON:      forge.forge_oracle_convention_undocumented
DECISION:    ACCEPTER
RATIONALE:   Mesuré. La convention (marqueur littéral FORGE_ORACLE, format de sortie
             stdout, découverte par grep) n'existe QUE dans le code
             (product_oracle_godot.py) et par précédent (games/snake/07_TESTS/oracle/),
             jamais déclarée dans scripts/forge/standard/SCHEMA.md. Le builder de Breakout
             run 3 n'a pu appliquer la convention que parce que la mission lui a cité
             explicitement core_boot.gd de Snake comme référence — sans cet exemple donné
             à la main, aucune source canonique n'existait pour l'apprendre.
DESTINATION: standard/ (scripts/forge/standard/SCHEMA.md — documenter la convention —
             implémentation différée, future_review)
```

---

## Récapitulatif

| Lesson | Décision | Destination | Preuve |
|---|---|---|---|
| L1 timeout greenfield | ACCEPTER | standard/ | fail-59097e0c915c4646, run 1 |
| L2 pré-vol oracle | ACCEPTER | standard/ | run 1 s10a BLOCKED |
| L3 requalification CONCEPT | ACCEPTER | wiremap/ | red-team run 3, finding F-A / fog F17 |
| L4 FAIL≠NOT_MEASURED | ACCEPTER | schema/ | run 3, 3 volets render, capture GPU |
| L5 convention FORGE_ORACLE | ACCEPTER | standard/ | run 3, mission s9 corrective |

5/5 lessons **validées** dans `lab/reports/lessons.jsonl` (schéma `forge.lesson.v1`,
génération 2). Aucune implémentation de destination exécutée — chaque mutation de surface
(standard/schema/wiremap) reste un chantier futur distinct, à ouvrir sur décision explicite.

```
claim_verdict: NO_CLAIM_ALLOWED
```
