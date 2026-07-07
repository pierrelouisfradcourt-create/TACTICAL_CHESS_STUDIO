# Pilote IMP-246 — Tranche 1 moteur Chess TCG (mesures)

Date : 2026-07-06 · status : DONE (non commité, gate Pierre)

## Périmètre exécuté
Scaffold Godot 4 + cœur de règles GDScript pur (`Board`, `Piece`, `Moves`, `Rules`) + oracle headless.
Règles ratifiées : dégâts `max(1,ATK−ARM)` · ordre attaque→mort→prise de case · promotion · victoire roi PV≤0 **ou** pression≥seuil.

## Mesures
| Métrique | Valeur |
|---|---|
| Itérations jusqu'au vert | **1** (oracle + implémentation écrits, 1er run headless = 41/41) |
| Assertions oracle | **41 passed / 0 failed**, exit 0 |
| Temps d'exécution moteur (headless) | < 1 s |
| LOC | 232 (core) + 166 (tests) = **398** |
| Coût tokens | **bien sous le plafond annoncé (~200k)** — une passe d'écriture + 1 run |
| Moteur | Godot 4.6.3 (déjà installé) |

## Méthode
TDD (oracle = spec exécutable) · logique pure séparée de la présentation (aucune scène) · déterministe · headless.
Conforme `.claude/rules/godot-scripts.md` (pas de logique jeu dans l'UI ; fonctions courtes ; typage).

## Verdict
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED

## Reste (tranches suivantes)
T2 traversée+riposte · T3 BRAWL (C6) · T4 pression complète+fatigue (C7) · T5 couche cartes (C13/C14/C15).
Note : la pression est en **ossature** (directThreat) ; calibration complète = T4.
