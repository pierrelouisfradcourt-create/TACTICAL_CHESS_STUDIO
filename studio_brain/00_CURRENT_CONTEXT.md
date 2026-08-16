# Contexte courant TCS
*(Handoff. Historique : `journal/context-archive-2026-08-10-pacman-tetris.md` →
`journal/2026-08-07_postmortem_pacman_forge.md` → `journal/2026-08-06_pacman_v2_session_detail.md`.)*

## Session 2026-08-15 — revue de code Forge, puis livraison par LIGNÉES (10 commits, non poussés)
Ancre finale : **`bfe7ecb`**, 74 commits d'avance sur origin. Index vide, working tree 138 entrées.

### Méthode ratifiée (Pierre) — c'est le résultat le plus réutilisable de la session
> **L'unité de validation n'est pas le working tree. C'est `HEAD + lignée reconstruite`,
> puis les tests sur cet état exact.**

Et son corollaire : **un lot « monolithique » ne l'est souvent que parce qu'une lignée AMONT
n'est pas commitée.** Démontré 3 fois, sans qu'une ligne des lots bloqués ne change :
`KB → P0-1`, `L0b → P0-4`, `P0-4 → P0-3`. Démontré aussi par la négative : le Lot 1 commité en
bloc donnait 8 échecs sur l'état prospectif alors que le working tree était vert.

### Livré (un GO Pierre par lot, chacun validé sur SON état commité)
| Commit | Unité | Preuve |
|---|---|---|
| `cb025dd` | registre usine (2 registres, 7ᵉ file, réconciliation) | 254/255 ciblé |
| `ab45f03` | verdict signé de périmètre PARTIAL (profil sans s12) | 111 l. · 8/8 |
| `b21d118` | P0-5 — leçons triées par récence | 36/36 |
| `f035755` | P0-2 — `is_game` signé (mécanisme) | 60/60 |
| `9bb6241` | reconnexion KB + **dette de preuve fermée** (13 tests) | 98/98 |
| `b620816` | P0-1 — marqueur `FORGE_DISPATCH` à triplet complet | 120/120 |
| `5a005c9` | L0b — mode d'exécution déclaré par le volet | 151/151 |
| `7f239f0` | P0-4 — oracle de directive GPU (BLOCKED, jamais FAIL) | 151/151 |
| `8c72e1a` | P0-3 — `observable_coverage` en objection signée | 88/89¹ |
| `77bbeb4` | P0-2 producteur + **dette de preuve fermée** (4 tests) | 4/4 + 72 |
| `80f91cb` | P0-4 câblage — le driver CONSOMME l'oracle | 211/212¹ |
| `bfe7ecb` | Snake déclare sa directive GPU (11 l. de commentaire) | Godot `--check-only` OK |

¹ rouge `ORDER` de baseline, antérieur et hors périmètre — jamais absorbé dans un « suite verte ».

**Trois « validateur sans consommateur » fermés** : `observable_coverage` calculé puis jeté ·
`is_game` signé sans producteur · oracle GPU jamais appelé. **Deux dettes de preuve** fermées par
FALSIFICATION contre l'état sans le code, pas par simple non-régression.

### Les deux boucles GPU — ne jamais les confondre
```
boucle code    : driver → oracle     ✓ FERMÉE (80f91cb)
boucle produit : jeu → directive     ✓ snake (bfe7ecb) · ✗ breakout_v2 (23) · ✗ pacman (104)
```
Ces deux défauts sont **antérieurs**, révélés — non causés — par le câblage. Cause inchangée.

### Non commité, intact, en attente de GO
`driver.py` (355 l.) : lignée **causalité** (19 occ. `next_reason`) · **C4-S3** persistance des
mesures · **C5-S3** déclencheur d'activation. Plus : **C2-S3** troncature amont, **C6-S3** vacuité
wiremap, **C7-S3** self-audit, et leurs 5 fichiers de test (zone protégée, non suivis) · bucket
**`AUTRE`** (~26 hunks, non instruit) · volet Tetris qui ferait passer son jeu de OK à **BLOCKED**
(décision, pas réflexe) · fixture **bomberman_3d** entièrement non suivie · artefacts non suivis
(`scripts/forge/context/`, `observer/{proj,jeu,p,probe2}`) · pollution `dispatch_audit.jsonl`
(1330 lignes de fixture sur 3271).

### Prochaine unité naturelle
Fermer `jeu → directive` pour breakout_v2 / pacman, **ou** instruire la lignée causalité.
Même méthode : cartographier les sous-lignées → isoler la plus petite unité causale →
reconstruire `HEAD + lignée` → tester CET état → staging → GO → commit.

## Session 2026-08-13/14 — cible de pipeline figée, permissions réparées, lignée Return fermée
Cible canonique : `docs/forge/FORGE_PIPELINE_TARGET_V1.md` (P0). *(Le « rien commité » d'origine
est périmé : `af5e699` et `7f07576` ont depuis livré l'instrumentation `tools_used` et celle du
processus CLI, par leurs propres lignées.)*

| # | objet | preuve |
|---|---|---|
| P1 | injection `s2-worldscan → s1-prisme` | 60 % du prompt = World Scan + `check_prisme_manifest` 4/4 |
| P1.2 | deny = complément de la déclaration | allow-list seule **ne borne pas** (mesuré) |
| M1 | `contract.permissions` source de `_STEP_TOOLS` | `s2-worldscan` HALTED → **OK**, 24 étapes |
| R1' | lignée Return structurée (`RETURN_REASON`) | en vivo : `s2 NOT_DISCOVERED` · `s1 DISCOVERED` |
| R1'' | promotion des lessons sur chemin HALTED | **3 lessons promues** (23→26) |
| M3 | matérialiseur `product_snapshot.md` + reçu | TESTED ; bout-en-bout in-vivo NON démontré |

Découvertes qui comptent : une allow-list **pré-approuve, elle ne restreint pas** (seul
`--disallowedTools` applique ; `Bash` reste un passe-partout) · `contract.permissions` n'était
consommé par **aucun** code · la causalité est mieux câblée sur le chemin driver que sur
l'interactif (4 « ruptures » supposées inexistantes, une seule réelle : la branche Return) ·
**1672 tests verts n'ont pas vu la panne** que le premier run réel a révélée.

Gates ouvertes : §7.1 identité Producteur interactif (563 spawns, `PostToolUse` matche `Task` →
NOT_WIRED) · §7.2 les 7 stations amont + 10 matrices · M5 capteur « outil UTILISÉ » · troncature
amont (~39 % du World Scan perdu — **correctif prêt, lot C2-S3 non commité**) · M3 bout-en-bout.

## Défauts préexistants (ne pas re-diagnostiquer)
À HEAD, **un seul rouge** : `test_standard_step_wiring::test_full_profile_is_untouched_by_the_standard_addition`
(fige l'ordre d'avant l'inversion Prisme/WorldScan). Le second rouge historique
(`test_repo_map_reel_…`) ne vient PAS de HEAD : mesuré le 2026-08-15, `test_standard_oracles`
passe **117/117** sur HEAD seul — il est causé par le `repo_map.yaml` non commité (bucket `AUTRE`).

## Impasses connues (ne pas re-buter dessus)
Godot `--headless` rend une texture NULLE (fenêtre GPU obligatoire) · qwen3.6 INTERDIT pour le JSON ·
`run_real` sans coupe-circuit budget intra-run · red-team indépendant ≠ red-team utile ·
PowerShell here-string `@'...'@` dans Bash injecte des `@` dans le message de commit (utiliser
`git commit -F <fichier>`) · aucun parseur YAML en Node · `git worktree` échoue sur ce dépôt
(longueur de chemin Windows) · la suite pytest complète **écrit dans le dépôt** (`observer/`,
`dispatch_audit.jsonl`) : valider sur copie isolée (`git archive HEAD` + blobs d'index).

## Quatre lignées causales — doctrine Pierre, 2026-08-06
Canonique : **`docs/forge/FORGE_CAUSAL_LINEAGE_V2.md`** (Intent · Activation · Return · Persistence).
Règle : **WHY = sens ≠ CONTRAINTE = réalité vérifiable**.
