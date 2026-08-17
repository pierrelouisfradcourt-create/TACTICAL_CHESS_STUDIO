# Contexte courant TCS
*(Handoff. Historique : `journal/context-archive-2026-08-15-revue-forge-lignees.md` →
`journal/context-archive-2026-08-10-pacman-tetris.md` → `journal/2026-08-07_postmortem_pacman_forge.md`.)*

## Session 2026-08-17 — chaîne de preuve GPU fermée, profil `proof_only`, régression de taxonomie réparée
Ancre finale : **`8e90bd0`**, 96 commits d'avance. Index vide, working tree 118 entrées. **Aucun push.**

### Règle ratifiée (Pierre) — le résultat le plus réutilisable de la session
> **Avant d'interpréter un verdict, vérifier que le contexte d'exécution possède les
> producteurs nécessaires pour produire la preuve demandée.**

Extension de `NOT_MEASURED ≠ OK`, appliquée un cran plus haut — au **contexte**, plus seulement
au fichier. Quatre questions, dans l'ordre :

```
1. Le fichier est-il dans le périmètre ?          (marqueur FORGE_ORACLE)
2. Le contexte peut-il produire la preuve ?       (le profil a-t-il le producteur ?)
3. La mesure a-t-elle eu lieu ?                   (NOT_MEASURED motivé)
4. Le processus a-t-il rendu un verdict valide ?  (returncode)
        ↓  seulement alors : OK / FAIL
```

Et ses trois corollaires : **preuve impossible ≠ FAIL** · **processus interrompu ≠ FAIL** ·
**observation nouvellement visible ≠ événement nouvellement produit**. Le dernier s'est
manifesté **4 fois dans la seule session**, toujours dans le même sens : conclure d'un signal
de surface fraîchement visible à un fait nouveau du monde (`core_audio.gd` · « 3 jeux ne
produisent pas ce reçu » · le prétendu défaut `s10s` · les 2 advisory « révélés »).

### Livré (un GO Pierre par lot, chacun validé sur SON état commité)
| Commit | Unité | Preuve |
|---|---|---|
| `ea4e407` | l'oracle GPU cesse de juger les fichiers qu'il ne LANCE pas | 3 tests falsifiants · 652 verts |
| `98f4590` | profil **`proof_only`** = `s10a + s10s`, sans builder ni s12 | 6/7 falsifiants · 159 verts |
| `b9ed0e9` | 5 runs `proof_only` comme **preuve datée** (succès ET blocages) | 48 fichiers |
| `8e90bd0` | les 4 contrats classent `reference.observation` + `asset.mesh` | BLOCKED→FAIL mesuré · 252 verts |

### Chaîne de preuve pixel — état mesuré par exécution réelle
```
directive → routage → mode_execution → exécution Godot → reçu → observable_coverage
```
**32 volets exécutés sur 4 jeux : 31 OK, 1 NOT_MEASURED motivé, 0 FAIL.**

| Jeu | s10a | Reçu | Couverture | Note |
|---|---|---|---|---|
| snake | OK | 9 | OK | `core_render_frame` en `gpu_window` |
| breakout_v2 | OK | 11 | OK | 3 volets pixel : **rouges en juillet → verts** |
| tetris | FAIL (rc=1) | 9 | BLOCKED | `core_render` NOT_MEASURED, 2 listes vides |
| bomberman_3d | FAIL (rc=**-2**) | 4 | OK | `-2` = **absence de verdict ?** non instruit |

Les rouges de juillet étaient des **faux négatifs de routage** (collecteur antérieur à L0b,
`mode_execution = None`). Correction d'historique : `e02b010` annonçait 7 directives GPU —
**4 sont inertes**, posées sur des fichiers que le collecteur ne lance pas.

### Deux advisory rouges sur les 4 jeux — PASSIVE, jamais bloquants, pas neufs
`reuse_ratio_wired` : validateur sans producteur (`run-oracle.mjs` absent **partout**).
`search_consulted` : évalue une obligation de **builder** dans un profil qui n'en a pas.

## Prochaines unités (3 cadrages séparés, aucun entamé)
1. **Applicabilité des oracles au contexte** — `profil → producteurs → preuves possibles →
   oracles applicables`. Généralisation robuste, pas une exception jeu par jeu.
2. **Nature du `returncode=-2`** de bomberman_3d — distinguer mort de processus et verdict.
3. **Décision E** — `observable_coverage` dans `_CORE_FACETS` ? La condition suspensive de P0-3
   (« le routage peut fabriquer des rouges ») est **levée** ; l'obstacle restant est que les
   `lab/forge_runs/<jeu>/` de juillet restent des snapshots, **jamais réécrits rétroactivement**.

## Défauts préexistants (ne pas re-diagnostiquer)
À HEAD, **un seul rouge** : `test_standard_step_wiring::test_full_profile_is_untouched_by_the_standard_addition`
(fige l'ordre d'avant l'inversion Prisme/WorldScan). Les 2 autres rouges historiques sont clos
(`ORDER` par `dd46d3d`, `repo_map` par `2788ab4`).
Piège de méthode : `test_pong_git_status_vide` est **rouge en copie isolée** (`git archive` n'est
pas un dépôt git) et vert sur le dépôt réel — artefact de la méthode, pas du code.

## Impasses connues (ne pas re-buter dessus)
Godot `--headless` rend une texture NULLE (fenêtre GPU obligatoire) · qwen3.6 INTERDIT pour le JSON ·
un `run_dir` appartient à **un** run (`run_id` + profil) : reprise conserve les étapes OK, donc
**run_dir neuf** pour remesurer · `run_real.py` code `run_dir` et `game_dir` en dur depuis `project` ·
`git worktree` échoue (chemins Windows) · PowerShell here-string dans Bash pollue les messages
(`git commit -F`) · la suite pytest complète **écrit dans le dépôt** : valider sur copie isolée
(`git archive HEAD` + blobs d'index) · le contrôle de pureté d'index **ne prouve pas** le contenu
d'un commit — le hook de pré-commit écrit après lui, seul le contrôle POST-commit prouve.

## Doctrine — quatre lignées causales (Pierre, 2026-08-06)
Canonique : **`docs/forge/FORGE_CAUSAL_LINEAGE_V2.md`** (Intent · Activation · Return · Persistence).
Règle : **WHY = sens ≠ CONTRAINTE = réalité vérifiable**.
