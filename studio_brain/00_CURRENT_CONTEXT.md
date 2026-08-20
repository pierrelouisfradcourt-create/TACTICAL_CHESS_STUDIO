# Contexte courant TCS
*(Handoff. Historique : `journal/context-archive-2026-08-17-chaine-preuve-gpu.md` →
`journal/context-archive-2026-08-15-revue-forge-lignees.md` → `journal/context-archive-2026-08-10-pacman-tetris.md`.)*

## Session 2026-08-19 — remise à plat Forge, contrat d'identité, isolation de la preuve
Ancre finale : **`08d658f`**, 117 commits d'avance. Index vide. **Aucun push.**

### Changement de régime ratifié (Pierre) — le résultat le plus structurant
> Les commits étaient devenus une **unité de progression artificielle**. Un objectif se formule
> en **capacité ajoutée à la Forge**, pas en « prochain commit à vérifier ».

Cinq règles : lots plus gros · validation **proportionnée au risque** · **ne jamais redémontrer
une preuve établie** sans changement de surface · arrêter une investigation dès que la cause
suffit à agir · une régression de preuve est un **bug de workflow**.

### Livré (6 commits)
| Commit | Capacité | Preuve |
|---|---|---|
| `abd0504` `5ae67b0` | les mesures de solvabilité atteignent le **reçu du pas** | sonde réelle bomberman_3d `won 5/14`, graines nommées |
| `6d2c094` | **confinement d'écriture** de l'Observer (T10) | 24 tests · 73 verts sur `HEAD + index` |
| `104819c` | **`RUN_IDENTITY_V1`** — 4 dimensions, `NATURE` ouverte | 36 tests · schéma et code attachés par test |
| `e0449cd` | carte de vérité au dépôt + sa 1re erreur corrigée | `proj` n'est **pas** un fantôme |
| `2d418b3` `08d658f` | **isolation de la preuve** : plus aucun test n'écrit dans les artefacts réels | suite complète : `+4524/+8590 octets → 0` |

### Décision ratifiée — taxonomie des runs
`SCOPE = PRODUCT | FACTORY` **figé**. `PROJECT_ID` / `RUN_ID` / `RUN_MODE` séparés. **`NATURE`
reste OUVERTE** : l'hypothèse `real|fixture|selftest|probe` couvrait 57 % des enregistrements
et laissait 71 identifiants sur 149 hors classement — falsifiée avant d'être écrite.

> Règle cardinale : **une dimension inconnue reste explicitement inconnue ; jamais remplacée
> par une valeur inventée pour satisfaire un schéma.**

### Le diagnostic qui s'est retourné
Les « 27 % d'événements signés sans `run_id` » n'étaient **pas** une rupture de traçabilité en
production : c'était la **suite de tests écrivant dans le fichier de preuve de production**
(1048 lignes, toutes `repair_runtime`, réparties exactement comme les appels de
`test_run_real_repair_wiring.py`). Défaut d'**isolation**, pas d'identité.

### État des surfaces
| Surface | Statut |
|---|---|
| `RUN_IDENTITY_V1` | `TESTED` — **`NOT_WIRED`, délibérément** (voir ci-dessous) |
| Isolation de la preuve (tests → artefacts réels) | `TESTED` — delta 0 octet, suite complète |
| Classe « émetteur injectable non exposé » | **OUVERTE** — confinement, pas guérison |
| `oracle_measures` | `PASSIVE` — producteur sans lecteur, assumé |
| Carte de vérité `docs/forge/FORGE_TRUTH_MAP_20260819.md` | `DOCUMENTED_ONLY`, **non ratifiée** |
| Sémantique de `NATURE` | `UNKNOWN` |
| `ADR-003` | `UNKNOWN` — cité par 10 commits, hors dépôt |
| Conservation des `proof*` | `BLOCKED` — aucune politique |
| Critère de victoire Bomberman (5/14) | `BLOCKED` — arbitrage produit |
| `s2-worldscan` ↔ `s1-prisme` | `BLOCKED` — seul rouge de la suite (1895 verts) |
| Publication | `BLOCKED` — 16 096 chemins personnels |

**`RUN_IDENTITY_V1` non câblé, et c'est une décision** : le brancher sur
`audit.append_spawn_event` renverserait son contrat *best-effort absolu* (« ne lève JAMAIS »).
`check_run_identity` existe pour ça — il rapporte sans lever.

### Impasses à ne pas rouvrir
- **Rien supprimer autour des 6 fantômes de l'Observer** (`jeu`, `nr`, `p`, `rouge`, `vert`,
  `probe2` — **pas** `proj`) : seule trace observable du défaut T4.
- **Rien archiver autour de `proof*`** tant que la politique de conservation n'existe pas.
- **Pas de liste blanche pour `--project`** : les 2 sources candidates rejettent 21 des 28
  projets réels, dont `_selftest`, l'auto-test de l'Observer.
- **Ne pas rediriger `studio_link.DEFAULT_TELEMETRY`** « par symétrie » : delta mesuré = 0.

### Prochain pas rationnel
Ni code ni nouvelle couche. Deux règles manquent et débloquent le reste : **la sémantique de
`NATURE`** (ce qu'un run *est*) et **la politique de conservation** (ce qu'un run *laisse*).
Mesuré : `lab/reports/observer/` et `lab/forge_runs/` partagent 20 noms, dont **13 ne sont pas
des jeux** — les deux questions sont la même taxonomie vue de deux côtés.
