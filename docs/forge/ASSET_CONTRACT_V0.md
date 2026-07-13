# Asset Contract V0 — schéma de demande d'asset

> **Date** : 2026-07-13
> **Statut** : DESIGN + IMPLEMENTED (résolveur `scripts/forge/asset_request.mjs`, testé).
> **Périmètre** : Tier 3 #7, étape 1 sur 2 (cf. `docs/forge/FORGE_STATE_SNAPSHOT_2026-07-13.md`
> §"Ce qui reste hors de ce snapshot"). L'étape 2 (rôle Art Director) consomme ce contrat —
> elle n'est pas commencée ici, gate Pierre explicite avant de l'entamer.
> `claim_verdict: NO_CLAIM_ALLOWED` — ce document décrit un mécanisme et ses limites, il ne
> certifie pas qu'il couvre tous les besoins d'asset futurs du studio.

## Pourquoi ce document existe

Constat de Pierre (2026-07-13, avant cette session) : si on crée un rôle "Art Director" avant
d'avoir un contrat d'asset structuré, ce rôle n'est **qu'un prompt de plus** — sans ancrage
mécanique, à l'opposé de la doctrine `NO_CLAIM_ALLOWED` / oracle non-LLM du studio (cf.
`scripts/forge/contracts/SCHEMA.md`). Ce document pose la **porte d'entrée mécanique** que
l'étape 2 devra utiliser comme oracle, plutôt que de laisser un LLM juger "est-ce que c'est
beau" (jugement esthétique = jamais un oracle, cf. §"Ce que ce contrat ne fait jamais").

## Ancrage architectural (décision Pierre, 2026-07-13)

Un `asset_request` est de la **DEMANDE** (ce qu'un build a besoin, pour CE jeu, à CE moment) —
pas de l'**OFFRE** (`knowledge_base/catalog.json` indexe l'offre : assets réels, permanents,
avec `sha256`/`path` réels). Trois options ont été posées à Pierre ; il a choisi :

> **Artefact par-run, hors `catalog.json`.** `asset_request` vit comme un artefact de run Forge
> (au même titre que `blueprint.yaml`/la WireMap — cf. `scripts/forge/contracts/s9-build.yaml`),
> pas comme un `entry_type` de plus dans le catalogue. `kb-validate.mjs` (R1..R14) et
> `ASSET_SPEC`/ catalog schema restent **inchangés**. Le résolveur (`asset_request.mjs`) **lit**
> `catalog.json` (offre) et `search.mjs` (recherche) mais n'y **écrit jamais**.

Raison : mélanger offre (permanente, réutilisable entre jeux) et demande (éphémère, spécifique
à un build) aurait fait grossir `catalog.json` d'entrées non réutilisables et aurait cassé
l'invariant "catalogue = mémoire de production, pas un journal de requêtes".

## Le schéma (6 champs)

```yaml
asset_request:
  type:              # enum fermée : sprite | tileset | portrait | icon | vfx | audio | model3d
  style:              # tag court (ex. "flat-top-down", "lowpoly", "pixel-art") — comparé
                      # MOT-À-MOT au champ `style` du catalogue (égalité normalisée, jamais
                      # une évaluation "est-ce que ça ressemble" — cf. limites)
  references: []      # optionnel : liste d'asset_id du catalogue OU URLs — ADVISORY,
                      # jamais vérifié mécaniquement (cf. §"Ce que ce contrat ne fait jamais")
  constraints:
    format:            # "2D" | "3D"
    runtime:           # "html" | "godot"
    license_allowed: []  # sous-ensemble de ASSET_LICENSES (kb-validate.mjs) ; défaut si
                          # absent = ASSET_LICENSES entier (CC0-1.0, MIT, CC-BY-4.0, CC-BY-3.0)
    genre: []          # tags genre attendus (ex. ["tactical","rpg"]) — au moins un doit
                        # apparaître dans genre/genre_compatible de l'entrée résolue
    max_size_kb:       # optionnel, nombre ; "aucun" = pas de plafond (déclaré explicitement)
  acceptance_tests: [] # liste de checks mécaniques exécutés sur l'entrée RÉSOLUE — voir
                        # §"Les acceptance_tests disponibles" ; jamais du texte libre non
                        # exécutable (contrairement à `tests_oracles` prose des contrats
                        # d'AGENT — ceci est un contrat de DONNÉE, entièrement structuré)
```

### Règle des 3 états (héritée de `SCHEMA.md`)

Comme pour un contrat d'agent : un champ **absent** = oubli → requête rejetée
(`ASSET_REQUEST_INCOMPLETE`). Un champ **déclaré vide** (`null`, `[]`, ou `"aucun"` selon le
type) = décision assumée (« pas de contrainte de licence au-delà du défaut », « pas de
références »). `type`, `style`, `constraints.format`, `constraints.runtime` et
`acceptance_tests` sont **Critiques** (jamais vides) ; `references`, `constraints.genre`,
`constraints.license_allowed`, `constraints.max_size_kb` sont **Important** (`[]`/`null`
autorisé, jamais absent).

## Les `acceptance_tests` disponibles (mécaniques, non-LLM)

Chaque check est `{check: <nom fermé>, ...params}`. Liste fermée (v0) — un check hors liste
→ requête rejetée (`UNKNOWN_CHECK`), pas d'exécution silencieuse d'un check inconnu :

| check | Vérifie mécaniquement |
|---|---|
| `resolved` | Au moins une entrée du catalogue passe TOUS les filtres de `constraints` (format/runtime/genre/license/taille/style). Sinon → `BLOCKED`, pas `FAIL` (cf. §"BLOCKED vs FAIL"). |
| `license_in_allowlist` | `entry.license` ∈ `constraints.license_allowed` (ou `ASSET_LICENSES` par défaut). |
| `format_runtime_match` | `entry.format === constraints.format` ET `entry.runtime === constraints.runtime`. |
| `style_tag_match` | `entry.style` normalisé égal à `asset_request.style` normalisé (comparaison exacte post-normalisation — jamais un score de similarité flou). |
| `on_disk` | Si `entry.ingested === true` : le fichier existe réellement, `sha256` déclaré == réel (délègue à la même garde que `kb-validate.mjs`). Si `entry.ingested === false` (3D manifest-only) : ce check est automatiquement satisfait *à condition que* `constraints.format === "3D"` (cohérence manifest-only, pas un contournement). |
| `usage_referenced` | `entry.tier === "validated"` ET `entry.usage_examples` non vide (le studio a déjà PROUVÉ cet asset dans un jeu). Utile quand la demande exige un asset déjà éprouvé, pas juste candidat. |

## Ce que ce contrat ne fait **jamais**

- **Ne juge jamais si un asset est "beau" ou "dans le bon style" au sens esthétique.**
  `style_tag_match` compare des **tags de métadonnées** (chaînes), pas des pixels. Un asset
  peut passer `style_tag_match` et être esthétiquement décevant — c'est un **fog** explicite :
  la sortie du résolveur porte toujours `fog: "conformité esthétique non évaluée — jugement
  Pierre requis"` quand `resolved` réussit, pour rappeler que la résolution mécanique n'est
  **pas** un satisfecit visuel.
- **Ne vérifie jamais `references`** (asset_id cités ou URLs) — c'est de l'inspiration
  advisory, jamais un critère mesurable ("ressemble à X" n'est pas mécanique).
- **N'écrit jamais dans `catalog.json`** — lecture seule. Si aucun asset ne convient
  (`resolved` échoue), le résolveur ne fabrique rien : il retourne `BLOCKED` avec le détail
  des filtres non satisfaits → HumanGate décide (ingérer un nouvel asset, assouplir la
  requête, ou trancher que le style demandé n'existe pas encore dans le catalogue).

## BLOCKED vs FAIL (vocabulaire `OK`/`FAIL`/`BLOCKED` du studio)

- **`FAIL`** : la requête elle-même est malformée (champ Critique absent, check inconnu,
  `constraints.format`/`runtime` hors énumération). Erreur de forme, corrigible par l'auteur
  de la requête.
- **`BLOCKED`** : la requête est bien formée mais **aucune** entrée du catalogue ne satisfait
  `constraints` + `acceptance_tests`. Pas une erreur — un fait : le catalogue n'a pas
  (encore) ce qu'il faut. Remonte `fog` → HumanGate (sourcer un nouvel asset ou revoir la
  demande), jamais une auto-résolution "au plus proche".
- **`OK`** : au moins une entrée résout tous les checks. Le résolveur retourne l'entrée
  choisie (meilleur score `search.mjs`, puis tier `validated` avant `candidate`, puis id —
  même tri déterministe que `search.mjs`) + la liste des checks individuellement satisfaits.

## Implémentation

- `scripts/forge/asset_request.mjs` : `validateRequestShape()` (règle des 3 états + checks
  fermés), `resolveRequest(request, catalog)` (filtre + réutilise `search.search()` pour le
  tri déterministe), `runAcceptanceTests(request, entry)` (exécute chaque check du tableau
  `acceptance_tests` un par un, retourne `{check, ok, detail}[]`). CLI :
  `node scripts/forge/asset_request.mjs <request.json> [--catalog <path>] [--json]`.
- `scripts/forge/asset_request.test.mjs` : couvre requête valide résolue (asset Kenney
  existant), requête `BLOCKED` (contrainte insatisfiable), requête `FAIL` (champ Critique
  absent, check inconnu), distinction absent/`null` déclaré.

## Limites connues (v0, documentées, pas corrigées)

- `style_tag_match` est une égalité de chaîne normalisée — deux stylistes différents peuvent
  utiliser des tags différents pour un style visuellement proche (ex. "flat-top-down" vs
  "top-down-flat"). Pas de thésaurus v0 : une requête qui ne matche aucun tag existant produit
  `BLOCKED`, pas un "plus proche possible" — c'est voulu (pas de résolution floue silencieuse).
- `references` et le jugement esthétique final restent **hors du mécanique** par construction
  — c'est la limite structurelle documentée plus haut, pas un oubli.
- Pas de génération d'asset (aucun appel à un générateur d'image) — ce contrat **résout dans
  l'existant du catalogue** uniquement. La question "faut-il un générateur d'asset" est hors
  scope de l'étape 1, à trancher (si besoin) à l'étape 2 ou au-delà.
