# POINT FINAL DE RATIFICATION — wiremap Snake (run `snake-20260728-091302`)

**Statut : PROPOSED — attend la ratification de Pierre.** Produit le 2026-07-28 par la session
Fable (orchestrateur). Tous les chiffres ci-dessous ont été **re-exécutés par l'orchestrateur**,
jamais repris d'un rapport de sous-agent. `claim_verdict: NO_CLAIM_ALLOWED`.

## 1. Ce qui est fermé

| Volet | Résultat (re-exécuté) | Référentiel |
|---|---|---|
| `check_line_states` | **passed: True** | `standard/core_requirements.yaml` (disque) |
| `check_placement` | **passed: True** | `standard/repo_map.yaml` (disque) |
| `check_collisions` | **passed: True**, 0 identifiant inconnu | `standard/capabilities.yaml` (disque) |
| `check_genre_coverage` | **passed: True**, 52/52 citations résolues, **taux 1.0** | bloc JSON de la Genre Bible Snake |

Carte : **44 lignes** · CORE = les 10 identifiants canoniques exactement · sources EXPECTED 17 /
ADDITIONS 11 / CORE 10 / DERIVED 6 · états REQUIRED 41 / DEFERRED 2 / NOT_APPLICABLE 1 ·
**discarded 6** (les 6 rejets de la Gameplay Review, `ended_up_in_game: null`) · 11 fogs dont
**3 résolus avec trace** (F1, F2 partiel, F8) et 8 ouverts.

Réutilisation typée après scission ratifiée : **CONCEPT 25 · NEW 14 (5 réponses IKEA chacune) ·
OUTIL_FORGE 3 · CODE_COPIE 2** — les 2 CODE_COPIE portent un `copy_sha256` non nul (vérifié :
aucun CODE_COPIE sans empreinte). `OUTIL_FORGE` n'entre jamais dans le ratio de réutilisation
gameplay.

## 2. Les 3 ratifications appliquées (2026-07-28)

1. **`capabilities.yaml` : 13 → 24 capacités.** 9 capacités de jeu Snake (`game.collision`,
   `food_spawn`, `direction_rules`, `growth`, `pause`, `best_score`, `params`, `tick_rate`,
   `events`) + 2 capacités Pong jamais déclarées (`game.playable_speed`, `game.solo_opponent`).
   Les préoccupations d'usine restent hors registre — y compris trois `game.*` qui portaient un
   nom de jeu sans en être (`purity_guard`, `replay`, `debug_state`).
   **Effet mesuré sur le témoin : Pong passe de `check_collisions` FAIL (2 identifiants inconnus)
   à passed: True.** Le trou datait des lignes de jouabilité V2 du 27-07 et a été gelé avec le
   témoin sans être vu. Le jeu n'a pas été modifié : c'est la table qui manquait.
2. **`repo_map.yaml` : catégories `godot.project_root: "{id}"` et `godot.project_tests:
   "tests/{id}"`.** La seconde a été ajoutée à la clôture sur un fait mesuré :
   `godot_oracle.mjs:17` charge `res://tests/run_tests.gd` (sous-dossier) et `:18`
   `res://solvability.gd` (racine). La table épouse l'oracle, jamais l'inverse (principe Pierre).
3. **Scission `CODE_COPIE` / `OUTIL_FORGE`** appliquée à la carte et aux 2 lignes qui décrivent
   le typage (sinon l'artefact se serait falsifié lui-même). Empreintes source conservées en
   `reused_from_note` pour les OUTIL_FORGE — aucune information détruite.

## 3. Non-régression (re-exécutée)

- **Témoin Pong : 72/72, exit 0** (commande canonique `oracles.json`).
- **Suite studio : 988 passed, 1 skipped** (référence 985 + 3 ajouts du chantier).
- **`studio_selfaudit` : STUDIO ALIGNÉ ✅.**

## 4. Fogs ouverts (8) — aucun ne bloque la carte, tous à connaître avant s9

- **F3** — aucun lecteur mécanique de `reused_from` : la ligne de rapport du taux est DEFERRED,
  décideur Pierre. Le typage CONCEPT reste non mesurable par un instrument (un concept ne laisse
  pas de trace d'import) ; il vit dans le champ, pas dans une métrique.
- **F4** — valeurs `A_EQUILIBRER` non ratifiées (cible 25, trio d'accélération) : tranchées après
  la première boucle jouable observée (décision Pierre 2026-07-28).
- **F6** — fog de courbe : partie gagnante = 4 paliers, fin ≈143 ms/case ; le plancher 80 ms
  n'est atteint qu'au 55ᵉ fruit (2,5× la cible). Bande déclarée [80,200] ≠ bande jouée.
- **F7** — `check_observable_coverage` exige un reçu d'exécution : non exécutable au gel, il
  s'exécutera au build. Non présenté comme vert.
- **F5** — `scripts/forge/adapters/godot/` + `fixtures/godot_b0/` (session parallèle) : aucune
  ligne n'en dépend, sort non arbitré.
- **F9** (taille de cellule), **F10** (pertinence du découpage en 17 systèmes = jugement humain),
  **F11** (`core.audio` DEFERRED : NOT_APPLICABLE est interdit sur CORE ; Pong possède déjà un
  adaptateur audio et un asset CC0, donc un « oui » a un coût faible et chiffrable).
- **F2 résiduel** : pas de catégorie pour les `.json` de gouvernance (blueprint d'archi,
  `mutation_triage.json`) ; ni `project.godot` ni `.tscn` déclarés dans cette carte.

## 5. Prérequis du build s9 Godot (à régler AVANT de lancer, pas avant de ratifier)

1. Export templates Godot **absents du poste** (décision D-D du 27-07 restée ouverte).
2. Preuve visuelle = **fenêtre GPU obligatoire** (`--headless` rend une texture nulle — fait
   mesuré 2026-07-22). `--headless` reste légitime pour la mécanique.
3. `s9-build-godot` est un contrat **orphelin de tout profil** : dispatch hors profil à assumer
   explicitement, ou câblage à décider.
4. Statut du correctif de la **tautologie R9** (21-07 : le générateur consultait la brique
   testée) à re-vérifier avant tout claim de solvabilité.
5. Sort de la session parallèle Godot (F5) à arbitrer si le build doit s'appuyer dessus.

## 6. Coût de la chaîne conception (télémétrie M1, mesurée)

**16 dispatches · 2 243 778 tokens · ~2 h 12 d'agents.** C'est le prix de la moitié conception
que Pong n'a jamais eue (Observation → Compréhension → Compression → Architecture). Il ne se
compare PAS aux runs Pong (périmètres différents) : l'accélération se jugera sur ce que le build
importe réellement, puis sur le jeu suivant.

---
software_verdict: OK · evidence_verdict: MECHANICAL_VALIDATION_ONLY · claim_verdict: NO_CLAIM_ALLOWED
