# Rapport red-team CODE — tetris (run tetris-fullgodot-20260803-084719 / s11-redteam-code)

Auditeur aveuglé (contexte vierge, sans les justifications du builder). Périmètre : lecture
seule du code produit sous `games/tetris`. Advisory — ne remplace pas les oracles. Chaque
faille est adossée à une **reproduction non-LLM** (grep / citation de ligne / commande node
déterministe), jamais à une suspicion.

## Contexte de vérification honnête

Je n'ai pas la permission `run`. Je n'ai donc **pas ré-exécuté** les oracles du build
(`run_tests.gd` 176/176, mutation 45/45, `godot_oracle.mjs` solvabilité 50/50) : leurs verts
restent des **claims amont non vérifiés par moi**. J'ai en revanche audité statiquement le code
et la chaîne d'oracles qui le consomme, et **recompté à la main les 176 assertions attendues**
(`EXPECTED_ASSERTS = 176`) : la somme par fichier tombe exactement à 176 — le garde anti-faux-vert
est cohérent avec les tests réellement écrits, et les tests utilisent bien `eq` STRICT partout
(aucun `>=` tautologique dans les asserts, contrairement à ce que la pré-mortem redoute).

Le cœur mécanique est propre : `line_clear` compacte correctement (y compris pour un clear au
milieu et des clears multiples non contigus), `collision` borne le puits des deux côtés, `input`
ne touche jamais la pile, `state` n'a que 2 statuts (pas de victoire). Je n'ai **trouvé aucun
bug de correction fonctionnelle (HIGH)** dans les 12 systèmes. Les failles ci-dessous sont des
écarts **contrat/code** et une **zone morte** — le mode de panne canonique du studio
(« déclaré ≠ exécuté »).

---

## FAILLE 1 — Budget de solvabilité déclaré au contrat mais IGNORÉ par l'oracle (déclaré ≠ exécuté)

- **Angle** : écart contrat/code + preuve exécutée sous des conditions différentes de celles déclarées.
- **Sévérité** : MEDIUM.
- **Constat** : `games/tetris/00_CHARTER/game_contract.yaml` (lignes 82-84) déclare
  `proof.solvability.max_ticks: 20000` et `trial_timeout_ms: 60000`, avec le commentaire explicite
  « marge large volontaire » — précisément pour éviter le faux-négatif type-snake documenté dans
  `godot_oracle.mjs`. Or l'oracle qui exécute la solvabilité (`godot_oracle.mjs::resolveSolvabilityConfig`,
  lignes 42-71) lit le budget **uniquement** depuis `scripts/forge/oracles.json` — **jamais** depuis
  `game_contract.yaml`. Et l'entrée `tetris` de `oracles.json` (lignes 179-186) **ne contient aucun
  bloc `solvability`**. Résultat : `resolveSolvabilityConfig('games/tetris')` retombe sur les défauts
  historiques `max_ticks=200`, `trial_timeout_ms=10000` (100× / 6× plus petits que le contrat).
  Le budget déclaré au contrat est **inerte** ; le contrat n'est pas la source de vérité de la valeur
  qu'il déclare. Aggravant : `snake` (oracles.json 153-165, max_ticks=5000) et `breakout_v2`
  (166-178, max_ticks=10000) déclarent TOUS deux leur bloc `solvability` ; **tetris est le seul jeu
  Godot du fichier resté sur le défaut 200 inadéquat**, à rebours de son propre contrat ET du patron
  de ses jeux frères. Effet actuel : le run est passé à 200 ticks (le bot nettoie réellement des
  lignes), donc **aucun échec masqué aujourd'hui** — mais la marge de sécurité 100× déclarée n'est
  pas en vigueur, et tout re-tuning du bot / ralentissement rejouerait le faux-négatif que le
  mécanisme de budget-par-jeu existe exactement pour empêcher.
- **Reproduction (non-LLM, déterministe)** :
  1. `node --input-type=module -e "import {resolveSolvabilityConfig} from './scripts/forge/godot_oracle.mjs'; console.log(resolveSolvabilityConfig('games/tetris'))"`
     → imprime `{ trials: 50, maxTicks: 200, trialTimeoutMs: 10000, seedStart: 1 }`, en contradiction
     directe avec `games/tetris/00_CHARTER/game_contract.yaml:82-84` (`max_ticks: 20000`, `trial_timeout_ms: 60000`).
  2. Ancre statique : `scripts/forge/oracles.json:179-186` (bloc `tetris`) ne contient pas la clé
     `solvability`, alors que `snake` (153-165) et `breakout_v2` (166-178) la contiennent.

---

## FAILLE 2 — `debug_state` déclaré « consommé par l'oracle produit » mais sans aucun consommateur (zone morte)

- **Angle** : zone morte + preuve qui valide un composant mort en production.
- **Sévérité** : MEDIUM.
- **Constat** : `09_WIREMAP/wiremap.json:486` déclare `debug.observation_point` comme
  « point d'observation, consommé par l'oracle produit », et le commentaire de tête de
  `05_SYSTEMS/debug_state/debug_state.gd:1-3` le présente comme « lisible par l'oracle ». Or l'oracle
  produit réel (`godot_oracle.mjs` → `solvability_godot.mjs` → `solvability.gd`) **ne consomme
  jamais** `DebugState.snapshot` : le bot lit directement les champs de l'état (`solvability.gd:49-50`
  → `s.pieces_spawned`, `s.lines_cleared`, `s.status`). Le **seul** appelant de `DebugState.snapshot`
  dans tout le projet est son propre test unitaire (`07_TESTS/unit/test_debug_state.gd:11`). Le test
  est honnête (il vérifie bien la copie profonde), mais il **prouve un composant mort en production**,
  et le consommateur déclaré (« l'oracle produit ») n'existe pas. C'est le symétrique exact du motif
  ratifié « validateur/écrivain sans appelant » : une preuve verte sur du code que rien n'utilise.
- **Reproduction (non-LLM, déjà exécutée)** :
  `grep -rn "snapshot\|DebugState\|debug_state" games/tetris` → ne renvoie que la **définition**
  (`05_SYSTEMS/debug_state/debug_state.gd`) et son **propre test** (`07_TESTS/unit/test_debug_state.gd`),
  plus les mentions déclaratives dans `wiremap.json` et `GAME_REFERENCE/architecture_guess.md`.
  **Zéro** consommateur runtime (`06_RUNTIME/`) ou oracle (`solvability.gd`, `tests/run_tests.gd`).

---

## FAILLE 3 — La « preuve » wiremap du game_loop annonce une borne `>=` alors que le test est STRICT

- **Angle** : écart contrat/code (libellé de preuve) + risque de mésusage futur.
- **Sévérité** : LOW.
- **Constat** : `09_WIREMAP/wiremap.json:479` (champ `preuve` de `core.game_loop`) décrit le test
  comme « gravite auto a GRAVITY_PERIOD borne >= ». La pré-mortem interdit explicitement le `>=`
  tautologique dans un test de gravité. Le test réel `07_TESTS/unit/test_game_loop.gd:28-32` est en
  fait **plus fort que le libellé** : il utilise `eq` STRICT (aucune descente AVANT la période ;
  descente d'EXACTEMENT +1 À la période ; compteur remis à 0). Ce n'est donc **pas** une preuve
  factice — le code délivre mieux que ce que l'artefact prétend — mais le libellé de la wiremap
  affirme une borne plus faible (`>=`) que celle réellement testée. Discordance de documentation, pas
  de défaut de code ; à corriger pour qu'un lecteur ne conclue pas à tort à un `>=` mou.
- **Reproduction (non-LLM, statique)** : comparer `wiremap.json:479` (texte « borne >= ») à
  `test_game_loop.gd:28-31` (appels `h.eq(...)`, égalité stricte des deux côtés de la période).

---

## Points de brouillard (fog → HumanGate, PAS des findings prouvés)

Non remontés en JSON faute de reproduction exécutable — décisions de jugement pour Pierre :

- **Pouvoir de discrimination de l'oracle de solvabilité.** Le critère `survived >= 8 AND lines >= 1`
  avec un bot Dellacherie sur un puits 10×20 vide est quasi impossible à faire ÉCHOUER pour tout
  Tetris non cassé (le bot peut nettoyer des lignes même si, p.ex., la rotation était brisée, en
  empilant à plat). La solvabilité est honnête (Tetris n'a pas d'état gagné) et sa variance est
  déclarée prouvée (42-51 pièces, 11-19 lignes), mais son pouvoir discriminant réel n'est pas mesuré.
  Je ne peux pas le PROUVER sans casser une mécanique et relancer Godot (pas de permission `run`) →
  jugement Pierre.
- **Absence de lock-delay / slide au sol.** Une pièce posée par la gravité se verrouille dans le
  MÊME tick (`loop.gd:37-48`) : il n'existe aucun tick « posée mais non verrouillée » après une chute
  gravité, donc pas de glissement latéral au sol (possible seulement après un soft-drop). Simplification
  V1 assumée non documentée comme telle ; aucun oracle n'exige le lock-delay → jugement Pierre.

---

## Verdicts

- **software_verdict: BLOCKED** — pas de permission `run` : je n'ai pas ré-exécuté les oracles du
  build, dont les verts restent des claims amont non vérifiés par moi. Mes findings sont, eux, adossés
  à des ancres statiques non-LLM reproductibles (commande node déterministe, grep, citations de lignes).
- **evidence_verdict: MECHANICAL_VALIDATION_ONLY** — pour les ancres statiques fournies par les
  reproductions ci-dessus uniquement.
- **claim_verdict: NO_CLAIM_ALLOWED**.

## SKIPPED_VALIDATION

- **item** : ré-exécution de `tests/run_tests.gd` (176/176) · **où** : `games/tetris/07_TESTS`,
  `tests/run_tests.gd` · **statut** : non fait · **raison** : pas de permission `run` ; recomptage
  manuel des 176 assertions effectué à la place (cohérent).
- **item** : ré-exécution de la solvabilité Godot (`godot_oracle.mjs`, 50/50) · **où** :
  `solvability.gd` + fenêtre Godot · **statut** : non fait · **raison** : pas de permission `run` ni
  binaire Godot ; le claim « 50/50 max_ticks=200 » reste amont non vérifié.
- **item** : ré-exécution de la mutation (45/45) · **où** : 12 fichiers `05_SYSTEMS/` ·
  **statut** : non fait · **raison** : pas de permission `run` ; chiffres du `build_constat` non
  contredits mais non vérifiés.
- **item** : validation du rendu visuel (R9) · **où** : `06_RUNTIME/adapters/runtime_loop.gd` ·
  **statut** : hors périmètre · **raison** : NOT_MEASURED en headless (texture nulle, légitime) ;
  audit statique du code de rendu seulement (cohérence couleurs/pile OK).
- **item** : preuve du pouvoir discriminant de la solvabilité · **où** : `solvability.gd:39-57` ·
  **statut** : non fait · **raison** : nécessiterait de casser une mécanique et relancer Godot →
  remonté en fog.
