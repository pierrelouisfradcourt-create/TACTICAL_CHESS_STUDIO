# Contexte courant TCS
*(Handoff. Archives : `journal/context-archive-2026-08-{21,20,17,15}-*.md`.)*

## Branche : `master` (retour effectué 2026-08-21, sentinelle humain Pierre)
Le retour depuis `publish` a exigé d'écarter 68 fichiers non suivis que `master` suit
(58 artefacts `lab/forge_runs/**` identiques modulo CRLF, 10 rapports Observer **régénérés
par les tests driver du jour**) — tous sauvegardés hors dépôt avant suppression, restaurés
par le checkout depuis `master`. Aucune perte. Hors lot et laissé non commité :
`scripts/forge/tests/test_evidence_isolation_fixture.py` (12 lignes, correctif `import
conftest` par chemin, ne vivait que sur `publish` — à arbitrer par Pierre).

## Session 2026-08-21 — Kitten Clicker : préparation du test d'autonomie de la Forge
Décision Pierre : forger **Kitten Clicker** (clicker de chatons, réf. **Cookie Clicker +
Neko Atsume**) comme test d'autonomie. Choix **(b)** : recâbler par **composition de
profil**, sans station GM neuve. Plan complet :
`docs/superpowers/plans/2026-08-21-kitten-clicker-full-godot-narratif.md`.

### Livré (NON COMMITÉ — gate Pierre)
- Profil **`full_godot_narratif`** (16 étapes) = `full_godot` + `s2.6-story-bible` +
  `s2.7-gm-worldscan` insérées après s0+s2, avant s1 (`dispatch.py`).
- `_UPSTREAM_BY_STEP` (2 copies, `run_real.py`/`context_manifest.py`) : **s1-prisme et
  s3-decompo reçoivent** story_bible + gm_worldscan. Contrats s1/s3 : `mandatory_read`
  étendu ; **`reference` des exigences EXPECTED devient adressable** (`worldscan:…`,
  `story_bible:<section>`, `gm_worldscan:<dimension>`) — règle de contrat, mesurée par
  la sonde, oracle `check_decompo` **inchangé**.
- Sonde **`check_amont_traversal.mjs`** (déterministe, ADVISORY, jamais OK/FAIL) : suit
  `prisme.reference → featuremap.source_ref → wiremap.couvre → fichiers` pour 6 faits
  (victoire, défaite, objectifs, progression, boucles de récompense, contraintes
  narratives) ; `reached` ∈ NOT_PRODUCED…BUILD. Attachée au reçu **s10c** via
  `oracle.run_amont_traversal_probe` (le spawn vit dans `oracle.py`, invariant
  `test_driver_ne_spawn_pas_directement`).
- `oracles.json` : entrée `kitten_clicker` (pré-vol **ok**, leçon KB citée).
- Entrées du run : `lab/forge_runs/kitten_clicker/{design_intent.md,tasks.json}`.

### Preuves (relancées par l'orchestrateur, pas sur parole)
Node **828/828** (821 + 7 sonde) · pytest ciblé **129/129** + invariant driver/sonde/profil
**13/13** · suite forge complète (bras 3) **1961 passed, 1 skipped, 1 failed** — le rouge
était `import subprocess` dans `driver.py`, corrigé par déplacement vers `oracle.py`,
`test_driver.py` **24/24** ensuite · dry-run **16 étapes**, aucun contrat cassé.

### Statut par pièce (vocabulaire : IMPLEMENTED · TESTED · DOCUMENTED_ONLY · PASSIVE · BLOCKED · UNKNOWN)
| Pièce | Statut | Preuve |
|---|---|---|
| profil `full_godot_narratif` | TESTED | test_profile_full_godot_narratif 7/7, dry-run 16 |
| injection s2.6/s2.7 → s1, s3 (`_UPSTREAM_BY_STEP`) | TESTED | égalité 2 copies, omission si absent |
| `reference` adressable (contrat s1) | DOCUMENTED_ONLY | règle de contrat ; aucun oracle ne la gate (par choix : variance d'abord) |
| sonde `check_amont_traversal.mjs` | TESTED | 7/7 + 2 runs réels (tous ≤ PRODUCED : aucun prisme.json) |
| attache au reçu s10c (`oracle.run_amont_traversal_probe`) | TESTED | 5/5 + invariant driver ; **jamais exécutée dans un run réel** |
| consommateur du champ `amont_traversal` | PASSIVE | produit dans le détail s10c, lu par personne — c'est Pierre/orchestrateur qui le lit |
| `oracles.json` kitten_clicker | TESTED | pré-vol ok ; `godot_oracle.mjs` sur un jeu encore inexistant = UNKNOWN jusqu'au build |
| `design_intent.md` / `tasks.json` | DOCUMENTED_ONLY | lus par run_real (`_VALID_TASK_STEPS`), run non lancé |
| retour `master` + commit | BLOCKED | sentinelle refusé à l'agent (permission settings) — geste humain |

### Mesuré, documenté, NON corrigé (doctrine de sortie 2026-08-20)
- **`--charter` = panel Prisme**, pas une entrée de s0. Le panel lit le charter à la
  construction (avant s0) et appelle `claude_call(payload.prompt)` **sans** la section
  « ARTEFACTS AMONT » → sous le panel, s1 ne reçoit ni worldscan ni story bible ni GM
  (défaut préexistant à FORGE_PRISME_V2). **Lancer sans `--charter`.**
- La sémantique de victoire de la solvabilité reste du GDScript par jeu (`verdict.gd`) :
  le run la **mesurera** (`reached` de `conditions_victoire`), il ne la corrige pas.
- Pour un clicker, « jouable plusieurs heures » tombe sous la règle de variance : la
  courbe de progression doit prouver ≥ 2 valeurs distinctes avant de calibrer quoi que
  ce soit (demandé dans `tasks.json` s0).

### Prochaine étape
1. Pierre : sentinelle + retour `master` (séquence ci-dessus), puis revue du lot
   (`git diff --stat` : 8 modifiés, 5 créés) et décision commit.
2. Créer `games/kitten_clicker/` (vide) puis lancer, sur go Pierre :
   `PYTHONPATH=scripts .venv312/Scripts/python.exe scripts/forge/run_real.py --project
   kitten_clicker --run-id kitten_clicker-<date> --profile full_godot_narratif --src-root
   games/kitten_clicker --is-game --tasks-file lab/forge_runs/kitten_clicker/tasks.json`
   (superviseur externe : un run long ne survit pas à l'agent parent, mémoire 07-27).
3. Lire `amont_traversal` dans le reçu s10c : c'est LE résultat du test — pas le verdict.

## Rappels de fond (inchangés)
- `publish` = snapshot orphelin séparé ; **aucun SHA recopié ici**
  (`git ls-remote origin refs/heads/master refs/heads/publish`).
- Artefacts porteurs de chemin de poste : **exclus du corpus public**, intacts en local
  (ratifié `d9b8a5b`). HMAC symétrique = 0 vérifiable par un tiers.
- Backlog §18 Master Schéma V2 : P0 détectabilité · P1 étage ② + un run `full` ·
  P2 `reuse_ratio` ×12 et `agent_factory` sans appelant. Clé HMAC par défaut = sujet
  sécurité, hors hygiène.
- Lot EVIDENCE, anonymisation Observer, audit de sensibilité : **FERMÉS** (détail dans
  `journal/context-archive-2026-08-21-publication-reparation.md`).
