# Archive — run Pac-Man V1 (`pacman-20260805-r1`), 2026-08-05
*(Extrait de `00_CURRENT_CONTEXT.md`, archivé le 2026-08-06 pour tenir sous 100 lignes.
Le run V2 qui lui succède est dans le contexte courant.)*

## Dernière session — 2026-08-05 : PRODUCTION Pac-Man (Godot), run `pacman-20260805-r1`

Première production réelle depuis la clôture de Forge V2. Objectif tenu : **un vrai jeu**,
pas une Forge plus grande. Chaîne `full_godot` parcourue sans contournement, s0→s12.

**Le produit** — `games/pacman/`, 105 fichiers (103 GDScript), Godot 4.6.3, non commité.
Labyrinthe 28×31 jouable dans une grille écran 28×36, 244 collectibles, 4 fantômes aux
ciblages individuels sourcés, machine à états Dispersion/Poursuite/Effrayé.

**Preuve mécanique** (chaque chiffre re-exécuté par l'orchestrateur, jamais repris d'un rapport) :
```
godot_oracle.mjs games/pacman  -> exit 0 | 1012 assertions | solvabilité 50/50, failed_seeds []
gate mutation                  -> 150 mutants, 2 survivants, tous deux triés ÉQUIVALENT justifiés
check_mutation_gate            -> passed (0 survivant non trié)
check_e2e_harness (godot)      -> passed      check_wiremap -> passed
check_feature_set_frozen       -> 67 règles intactes (0 ajoutée, 0 supprimée)
verify_run verdict.json        -> INTÉGRITÉ : AUTHENTIQUE, exit 0
verdict : software OK / evidence MECHANICAL_VALIDATION_ONLY / claim NO_CLAIM_ALLOWED
          decision HUMANGATE_READY_WITH_OBJECTION · redteam_ran FALSE
```
Coût mesuré : 13 appels, 2 598 728 tokens, 12 596 s de sous-agents.

### Décision ratifiée Pierre cette session
- **Plateforme = GODOT uniquement.** L'inférence web/JS de l'orchestrateur (tirée de
  `run-oracle.mjs`, `--caller s9-build`, modèle `kb_tactics`) était **fausse** : l'outillage
  de preuve d'un projet ne dit rien de son runtime. Trace : `lab/forge_runs/pacman/platform_correction.yaml`
  (`platform_assumption: corrected`, `previous_inference: invalidated`). s0 avait remonté le
  doute en fog **avec le précédent Snake nommé** ; l'orchestrateur a passé outre. Coût réel : nul
  en code (le build n'avait pas démarré), uniquement des décisions non encore prises.

## Ce que la production a RÉVÉLÉ (mesuré, non corrigé — matière pour la suite)

1. **`SEARCH_USAGE`/`reuse_ratio` sont NOT_WIRED sur TOUTE la lane Godot.** Le capteur cherche
   `<jeu>/run-oracle.mjs`, artefact de la lane HTML ; un jeu Godot passe par
   `scripts/forge/godot_oracle.mjs`. Mesuré identique sur `snake` et `pacman`. Aggravant :
   `reuse_ratio` compte des IMPORTS, or le bac à sable `res://` **interdit** de référencer hors
   projet — une brique KB doit être COPIÉE, invisible au comptage. Le champ prévu pour ça
   (`reused_from.type: CODE_COPIE` + `copy_sha256`) est **peuplé** par les builders (snake en
   déclare 2 avec empreintes réelles) et **lu par aucun code exécutable** (grep sur `*.py/*.mjs/*.js` = 0).
2. **`check_architecture` est vacuement vert sur la topologie standard.** `_module_of` rend le
   1er dossier sous `src_root`, donc une paire `deps_interdites` entre sous-modules est invisible.
   Contrôles positif/négatif exécutés sur `snake` ET `pacman`. Contournement d'orchestration
   (aucun code modifié) : exprimer aussi les paires au niveau COUCHE + contrôle positif.
3. **Gate mutation édenté puis trompeur sur `.gd`.** La règle `===`→`!==` (héritée de JS) ne matche
   que des **bannières de commentaire** : 400 occurrences dans `params.gd`, **0 dans du code**
   (GDScript n'a pas `===`). Non filtré, le gate rendrait ~400 survivants factices.
4. **La chaîne n'a pas de vocabulaire pour une exigence jugée par un HUMAIN.** `PROOF_KINDS` est
   fermé sur `bot_action|oracle|mutation|visual|file_write` ; R41/R42 (jouer une partie, comprendre
   la boucle) ont été rangées en `visual` avec la vérité en texte libre, que nul oracle ne lit.
   `check_decompo` reste rouge 40/42 — **le rouge est l'information**, il n'a pas été maquillé.

## Observations demandées par Pierre — résultat NÉGATIF, et c'est le résultat

Mesuré avant/après production, inchangé : layers aval `build` = **0** mutation,
`oracle-produit` = **0**, 8/13 layers vides · branching factor **3/1/1/1** ·
`root_problem.lesson_ids` **vides sur les 4**. **Produire un jeu ne remplit pas ces layers** :
une « mutation » du registre est une expérience sur la Forge, pas un artefact de jeu. Ce run a
produit la MATIÈRE (3 défauts mesurés aux étages build/oracle) ; l'enregistrer serait une
proposition, pas une conséquence automatique. **MCTS reste injustifiable.**

## En attente de HumanGate (Pierre)
- `core.audio` : `core_requirements` l'impose (`not_applicable_allowed: false`), le charter met le
  son en `hors_scope`. Ligne **DEFERRED**, `decider: pierre`. Deux autorités se contredisent.
- **Périmètre d'écriture** : `scripts/forge/oracles.json` (entrée `pacman`, budget solvabilité
  20000 ticks) est **hors** du périmètre déclaré au charter — mais sans elle le défaut est 200 ticks,
  victoire mathématiquement impossible à 244 pastilles. Déroger ou déplacer la déclaration.
- **2 fichiers sans propriétaire de carte** : `05_SYSTEMS/params/params.gd` (créé sur instruction
  orchestrateur, correction M2) et `mutation_triage.json` (imposé par le format du standard).
- `M1` : 7 lignes de wiremap dont un `requires` traverse une arête interdite du blueprint.
- Merge/reject de `games/pacman/` : **rien n'est commité**, tout est propose-only.

## Prochaine étape recommandée
Playtest humain de `games/pacman` en fenêtre GPU réelle (`--rendering-driver`) : c'est le SEUL
volet non couvert (preuve pixel + 12 critères de démo du charter). Le mécanique est prouvé,
le jouable ne l'est pas. Puis trancher les 5 HumanGate ci-dessus.

