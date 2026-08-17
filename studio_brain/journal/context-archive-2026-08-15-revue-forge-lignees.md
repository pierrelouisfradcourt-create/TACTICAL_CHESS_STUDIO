# Archive de contexte — sessions 2026-08-13/14 et 2026-08-15
*(Extrait de `00_CURRENT_CONTEXT.md` le 2026-08-17, pour tenir la limite de 100 lignes.
Prédécesseur : `context-archive-2026-08-10-pacman-tetris.md`.)*

## Session 2026-08-15 — revue de code Forge, puis livraison par LIGNÉES (12 commits)
Ancre finale : **`bfe7ecb`**, 74 commits d'avance. Index vide, working tree 138 entrées.

### Méthode ratifiée (Pierre) — le résultat le plus réutilisable de la session
> **L'unité de validation n'est pas le working tree. C'est `HEAD + lignée reconstruite`,
> puis les tests sur cet état exact.**

Corollaire : **un lot « monolithique » ne l'est souvent que parce qu'une lignée AMONT n'est
pas commitée.** Démontré 3 fois sans qu'une ligne des lots bloqués ne change :
`KB → P0-1`, `L0b → P0-4`, `P0-4 → P0-3`. Et par la négative : le Lot 1 commité en bloc
donnait 8 échecs sur l'état prospectif alors que le working tree était vert.

| Commit | Unité | Preuve |
|---|---|---|
| `cb025dd` | registre usine (2 registres, 7ᵉ file, réconciliation) | 254/255 ciblé |
| `ab45f03` | verdict signé de périmètre PARTIAL (profil sans s12) | 111 l. · 8/8 |
| `b21d118` | P0-5 — leçons triées par récence | 36/36 |
| `f035755` | P0-2 — `is_game` signé (mécanisme) | 60/60 |
| `9bb6241` | reconnexion KB + dette de preuve fermée (13 tests) | 98/98 |
| `b620816` | P0-1 — marqueur `FORGE_DISPATCH` à triplet complet | 120/120 |
| `5a005c9` | L0b — mode d'exécution déclaré par le volet | 151/151 |
| `7f239f0` | P0-4 — oracle de directive GPU (BLOCKED, jamais FAIL) | 151/151 |
| `8c72e1a` | P0-3 — `observable_coverage` en objection signée | 88/89¹ |
| `77bbeb4` | P0-2 producteur + dette de preuve fermée (4 tests) | 4/4 + 72 |
| `80f91cb` | P0-4 câblage — le driver CONSOMME l'oracle | 211/212¹ |
| `bfe7ecb` | Snake déclare sa directive GPU | Godot `--check-only` OK |

¹ rouge `ORDER` de baseline, antérieur et hors périmètre — jamais absorbé dans « suite verte ».

**Trois « validateur sans consommateur » fermés** : `observable_coverage` calculé puis jeté ·
`is_game` signé sans producteur · oracle GPU jamais appelé. **Deux dettes de preuve** fermées
par FALSIFICATION contre l'état sans le code, pas par simple non-régression.

## Session 2026-08-13/14 — cible de pipeline figée, permissions réparées, lignée Return fermée
Cible canonique : `docs/forge/FORGE_PIPELINE_TARGET_V1.md` (P0).

| # | objet | preuve |
|---|---|---|
| P1 | injection `s2-worldscan → s1-prisme` | 60 % du prompt = World Scan + `check_prisme_manifest` 4/4 |
| P1.2 | deny = complément de la déclaration | allow-list seule **ne borne pas** (mesuré) |
| M1 | `contract.permissions` source de `_STEP_TOOLS` | `s2-worldscan` HALTED → OK, 24 étapes |
| R1' | lignée Return structurée (`RETURN_REASON`) | en vivo : `s2 NOT_DISCOVERED` · `s1 DISCOVERED` |
| R1'' | promotion des lessons sur chemin HALTED | 3 lessons promues (23→26) |
| M3 | matérialiseur `product_snapshot.md` + reçu | TESTED ; bout-en-bout in-vivo NON démontré |

Découvertes qui comptent : une allow-list **pré-approuve, elle ne restreint pas** (seul
`--disallowedTools` applique ; `Bash` reste un passe-partout) · `contract.permissions` n'était
consommé par **aucun** code · la causalité est mieux câblée sur le chemin driver que sur
l'interactif (4 « ruptures » supposées inexistantes, une seule réelle : la branche Return) ·
**1672 tests verts n'ont pas vu la panne** que le premier run réel a révélée.

Gates alors ouvertes : §7.1 identité Producteur interactif (563 spawns, `PostToolUse` matche
`Task` → NOT_WIRED) · §7.2 les 7 stations amont + 10 matrices · M5 capteur « outil UTILISÉ » ·
M3 bout-en-bout.
