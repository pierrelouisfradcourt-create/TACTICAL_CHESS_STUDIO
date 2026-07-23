# STANDARD — formats (v1, tranche minimale)

> Date : 2026-07-22 · Source : `docs/forge/FORGE_STANDARD_v1.md` (note de Pierre) + décisions
> de session 2026-07-22. `claim_verdict: NO_CLAIM_ALLOWED`.

## Ce qui est écrit, et ce qui ne l'est pas

On n'écrit que ce que le jeu en cours exige (§9 : éviter l'explosion de contexte, et ne pas
poser de couche sans lecteur). Pong exige un `game_contract` et un `system_contract`.

| Format | État | Écrit quand |
|---|---|---|
| `game_contract` | **écrit** | maintenant (Pong) |
| `system_contract` | **écrit** | maintenant (Pong) |
| `entity_contract` | non écrit | quand Snake aura besoin d'entités |
| `level_contract` | non écrit | quand un jeu aura des niveaux |

Ces formats sont une famille **distincte** des contrats d'agent (`scripts/forge/contracts/s0…s12.yaml`),
qui répondent à une autre question — « comment piloter un agent » vs « qu'est-ce qu'une brique
de jeu complète ». Deux vocabulaires, deux noms, aucune fusion : `agent_contract` / `brick_contract`.

---

## 1. `game_contract` — le budget du jeu

```yaml
schema_version: 1
game_id: pong
node: 1                      # position dans le curriculum
runtimes: [rules, browser, godot]

budget:
  reuses: []                 # briques déjà en bibliothèque, tier `validated` obligatoire
  adds:   [game_loop]        # UN seul système neuf déposé — loi d'empilement §7

assets:
  plan: cc0                  # cc0 (plan A) | generated (plan B si aucun CC0 ne convient)
```

**Ce que `adds` compte** : les **briques déposées en bibliothèque**, pas les lignes de code.
Pong écrit de quoi faire rebondir une balle, mais ne dépose pas de « système de collision » —
ce code est collé à Pong, personne ne le réutilisera. Breakout, lui, a besoin d'une collision
générale : il la dépose, et c'est **elle** qui consomme un delta. C'est la règle de catégorie
du §1 (un objet reste une entité tant qu'il n'est pas partagé).

Vérifié mécaniquement : `len(adds) <= 1` · tout `reuses[i]` existe en bibliothèque au tier
`validated` · toute brique déposée par le run appartient à `reuses ∪ adds`.

---

## 2. `system_contract` — une brique

```yaml
schema_version: 1
id: game_loop
category: system             # fixée À LA CRÉATION, jamais réévaluée après coup
provides: [game.loop]        # identifiants du registre de capacités — vocabulaire fermé
requires: [game.state]
owner: true                  # un seul fournisseur par capacité (§ collisions)
dependencies: []             # autres briques, vérifiées à l'import (jamais silencieux)
tests: [07_TESTS/unit/game_loop.test.mjs]
```

`category` détermine l'emplacement via `repo_map.yaml` — le builder ne choisit jamais où poser
un fichier. Une catégorie absente de la table est un `FAIL`, jamais un placement par défaut.

---

## 3. `wiremap` v2 — la carte indexée

JSON (comme l'existant, pour ne pas casser `check_wiremap`). Le déclencheur de la normalisation
est `schema_version: 2` : les wiremaps antérieures, qui emploient quatre mots libres pour l'état
(`fait`, `construit`, `DONE`, `PLANNED`), restent lues par l'ancien oracle et ne sont pas
réécrites — ce sont des preuves de runs passés.

La carte a **deux passes**, comme au §3 de la note : la liste des systèmes du jeu (passe 1,
gel dur — la casser rouvre le plan), puis les lignes qui les meublent (passe 2, gel au fil de
l'eau). `system_parent` fait le lien, et il est vérifié aux deux bouts.

Ne pas confondre `systems` et le budget : `systems` liste **les systèmes de ce jeu**, `adds`
liste **ceux qu'on dépose en bibliothèque pour être réutilisés**. Pong a plusieurs systèmes
(`game_loop`, `input`, `game_state`) mais n'en dépose qu'un.

```jsonc
{
  "schema_version": 2,
  "game_id": "pong",

  // passe 1 — les pièces du plan. system_parent doit désigner l'une d'elles.
  "systems": [
    {"id": "game_loop",  "category": "system",         "allowed_deps": ["game_state"]},
    {"id": "input",      "category": "system",         "allowed_deps": ["game_state"]},
    {"id": "game_state", "category": "system",         "allowed_deps": []},
    {"id": "presentation","category": "system.adapter","allowed_deps": ["game_state"]}
  ],

  // passe 2 — le meublage
  "lines": [
    {
      "id": "core.restart",
      "source": "CORE",            // CORE | EXPECTED | ADDITIONS | DERIVED
      "source_role": null,         // qui l'a proposée (obligatoire si EXPECTED/ADDITIONS)
      "reference": null,           // obligatoire si EXPECTED : la source externe nommée
      "provides": ["game.restart"],
      "requires": ["game.state"],
      "owner": true,
      "system_parent": "game_state",        // le système qui héberge cette ligne
      "address": "05_SYSTEMS/game_state/",  // posé par la réconciliation, pas par le builder
      "expected_proof": {
        "kind": "bot_action",
        "statement": "Après une fin de partie, relance → état identique au premier démarrage."
      },
      "state": "UNKNOWN",          // IMPLEMENTED | NOT_APPLICABLE | DEFERRED | BLOCKED | UNKNOWN
      "reason": null,              // obligatoire si NOT_APPLICABLE
      "until": null, "decider": null,        // obligatoires si DEFERRED
      "write_order": null,         // obligatoire si plusieurs écrivains d'un même état

      // "fichiers" liste les fichiers RÉELS déposés par cette ligne. Chaque entrée
      // déclare sa propre catégorie — jamais déduite après coup du nom de fichier
      // (§1, même règle que `category` sur system_contract : fixée À LA CRÉATION).
      // Une entrée restée une chaîne nue est une violation `categorie_fichier_non_declaree`.
      "fichiers": [
        {"path": "05_SYSTEMS/game_loop/loop.mjs", "category": "system"},
        {"path": "07_TESTS/unit/game_loop.test.mjs", "category": "test.unit"}
      ],
      "fonction": "", "preuve": "", "statut": ""   // champs v1 conservés
    }
  ],

  // Ce qu'on a écarté — JAMAIS supprimé (correction Pierre 2026-07-22).
  // Le juge d'un rôle n'est pas le vote des autres, c'est le jeu fini : une idée
  // portée par un seul rôle, écartée ici puis rajoutée pendant le build, prouve que
  // le rôle avait raison et que la fusion a eu tort. Jeté, ce signal est perdu.
  "discarded": [
    { "id": "", "source_role": "", "proposal": "", "discard_reason": "",
      "ended_up_in_game": null }   // rempli à la clôture du jeu, jamais avant
  ]
}
```

### Les états

### `system_parent` — plusieurs lignes par système

Une ligne n'a pas son propre dossier : elle vit **dans un système**. `core.game_state`,
`core.end_condition` et `core.restart` sont trois exigences distinctes hébergées par le même
système `game_state`. L'adresse se dérive donc de `category` + `system_parent`, jamais de
l'identifiant de la ligne.

C'est le champ prévu au §3 (passe 2) de la note de Pierre : `system_parent` **doit** désigner
un système réel, sinon `FAIL` — c'est ce qui empêche un meuble d'exister dans une pièce que le
plan n'a jamais posée.

### `fichiers` — la catégorie déclarée, jamais déduite

Une `address` de ligne cohérente ne dit rien de l'endroit où les fichiers **réels** ont
atterri : `check_placement` vérifiait l'`address`, jamais où le builder pose le code qu'elle
décrit. En `schema_version: 2`, chaque entrée de `fichiers[]` déclare donc sa propre
`category`, avec les mêmes règles que l'`address` d'une ligne :

- l'entrée est un objet `{path, category}` — une chaîne nue (ancien format) est une violation
  `categorie_fichier_non_declaree`, jamais acceptée en silence.
- `category` doit exister dans `repo_map["mapping"]`, sinon `categorie_fichier_non_mappee`
  (jamais de placement par défaut).
- `path` doit être cohérent avec le gabarit `mapping[category]` (même substitution `{id}`
  que pour l'`address` d'une ligne — dérivée de `system_parent` s'il y en a un valide, sinon
  de l'identifiant de la ligne), sinon `fichier_adresse_incoherente`.

La catégorie est **déclarée à la création**, jamais inférée du nom de fichier (`*.test.mjs`
→ test) : une heuristique de nommage est fausse dès qu'un fichier est mal nommé, et c'est
précisément la garantie que ce format retire au builder.

`fichiers[]` liste ce que la ligne **dépose**, jamais ce qu'elle consomme. Ce qu'une ligne
lit ou importe passe par `requires` / `allowed_deps` — ce sont deux questions distinctes, et
les confondre est exactement ce qui a fait déclarer un même fichier de preuve par six lignes.

#### Identité des gabarits d'artefacts nommés (`REPO_MAP_TEMPLATE_IDENTITY_V1`)

> Règle (verbatim, ratifiée Pierre 2026-07-23) : « Un gabarit qui revendique un artefact
> concret doit porter un identifiant stable permettant une correspondance univoque. Les
> motifs génériques sont réservés aux catégories, pas aux preuves d'existence. »

```yaml
rule:
  named_artifact_templates: { require_id: true, require_unique_binding: true }
scope: [test.*, asset.*]
validation:
  duplicate_claims:
    same_target_multiple_ids: FAIL
    same_id_multiple_targets: FAIL
```

`repo_map.yaml` porte donc deux formes de gabarit, distinguées par leur terminaison — c'est
la **table** qui déclare la forme, aucun code ne liste `test.*`/`asset.*` en dur :

| Forme | Terminaison | `{id}` vaut | Contrôle du chemin |
|---|---|---|---|
| dossier (motif de **catégorie**) | `/` final | le contenant (`system_parent`, sinon l'id de la ligne) | préfixe |
| artefact **nommé** | pas de `/` final, `{id}` obligatoire | le **nom du fichier** | égalité exacte |

Conséquence assumée : un artefact nommé vit **directement** dans le dossier de sa catégorie
(`07_TESTS/oracle/solvability.mjs`, `04_ASSETS/audio/bounce.wav`) — pas de sous-dossier, car
deux `player.png` dans deux sous-dossiers rouvriraient l'ambiguïté que la règle ferme.
L'extension n'est pas figée dans le gabarit : c'est le nom qui identifie, pas le format.

`check_placement` en tire deux volets, appliqués aux seuls gabarits d'artefact nommé :

- `revendications_multiples` (`same_target_multiple_ids`) — un même fichier revendiqué par
  plusieurs identités déposantes (ligne + catégorie). Un artefact nommé a **un** déposant.
- `identite_ambigue` (`same_id_multiple_targets`) — un même identifiant (catégorie + nom)
  désignant plusieurs fichiers distincts : le nom ne désigne plus rien d'univoque.

Les deux **énumèrent** le conflit ; il n'existe aucune résolution par « première
correspondance » — choisir un revendiquant au hasard cacherait le problème au lieu de le
montrer. Deux catégories peuvent partager un dossier (`test.oracle` / `test.solvability`) :
depuis que l'identité est le nom du fichier, ce partage n'est plus ambigu, et le cas
pathologique (les deux revendiquant le même fichier) tombe dans `revendications_multiples`.

Les wiremaps antérieures (`schema_version` absent, ou `1`) ne sont **pas concernées** :
`check_placement` ne touche à leur `fichiers[]` sous aucune forme — ce sont des preuves de
runs passés, pas des cibles de la normalisation.

`check_index` complète cette fermeture côté disque : tout dossier de premier niveau du jeu
qui n'appartient pas aux `roots` de `repo_map.yaml` est une violation
(`dossiers_hors_structure`) — ça attrape un builder qui crée `src/` ou `lib/` en dehors de
la structure figée.

### Les états

| État | Sens | Contrainte |
|---|---|---|
| `REQUIRED` | décidé, à faire, pas encore fait | l'état normal d'une ligne au moment du gel |
| `IMPLEMENTED` | fait et prouvé | un reçu d'oracle existe |
| `NOT_APPLICABLE` | ne s'applique pas à ce jeu | `reason` obligatoire · **interdit sur une ligne CORE** · incohérent avec le budget = `FAIL` |
| `DEFERRED` | reporté | `until` + `decider` obligatoires (sinon « jamais » avec une étiquette) |
| `BLOCKED` | empêché | motif obligatoire |
| `UNKNOWN` | pas encore décidé | **interdit au gel** — un squelette gelé avec un `UNKNOWN` est un `FAIL` |

Règle : *tout élément connu du squelette porte une décision explicite — pas forcément une
implémentation.* C'est ce qui supprime l'omission silencieuse.

**Deux moments, deux vérifications** — la même wiremap n'est pas jugée pareil avant et après :

| Moment | Interdits |
|---|---|
| **au gel** (avant build) | `UNKNOWN` (rien ne doit rester indécis) et `IMPLEMENTED` (rien n'est encore fait) |
| **après build** | `REQUIRED` (tout ce qui était à faire doit être devenu `IMPLEMENTED` ou `BLOCKED`) |

C'est ce qui rend le delta *attendu vs réel* calculable : au gel on connaît la promesse, après
build on connaît la livraison, et la soustraction est mécanique.

### Preuve attendue ≠ reçu

`expected_proof` est une **exigence**, posée avant le build. Le **reçu** est produit par
l'exécution des oracles, en aval. Les confondre ferait noter sa propre copie à celui qui
planifie — c'est la séparation qui rend `UNKNOWN` et `IMPLEMENTED` distincts.

---

## 4. Réconciliation — ce qui transforme les 4 sources en squelette gelé

1. **Dédoublonner en gardant la provenance** — une exigence portée par le CORE *et* par une
   brique reste une ligne, mais garde ses deux origines (retirer la brique ne doit pas
   effacer l'exigence).
2. **Détecter les conflits au lieu de les fondre** — brique exigeant une capacité absente du
   budget → `FAIL` (adapter ou refuser, jamais d'import silencieux).
3. **Placer** via `repo_map.yaml`.
4. **Indexer dans les deux sens** — fichier sans ligne = code non demandé ; ligne sans adresse
   = exigence sans emplacement.
5. **Auditer les collisions** sur le registre de capacités : deux `provides` identiques =
   collision · un `requires` sans fournisseur = trou · deux `owner` = double propriétaire ·
   plusieurs écrivains d'un même état sans `write_order` = `FAIL`.

Sortie : le squelette gelé. Le builder ne reçoit pas « fais un Pong » — il reçoit une carte où
chaque case a une adresse, un état attendu et une preuve attendue.
