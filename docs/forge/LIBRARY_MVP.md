# MVP — Game Knowledge Library (track A / HTML, engine-agnostic core)

- **Date** : 2026-07-12
- **Statut** : PROPOSED — design falsifiable. Prochaine étape du cycle : red-team → ratification → build. Aucun code, aucun téléchargement.
- **Présuppose** : la recommandation de `STUDIO_RUNTIME_ARBITRATION.md` (**C-restreint / A-first / B-gaté**). Si l'arbitrage change, ce MVP change.
- **Principe liant (risque n°1 de l'arbitrage)** : rien n'entre dans le tier « validé » sans une **preuve de passage de gate** ; le tier connaissance reste **advisory** (cité, jamais injecté comme code, comme world-scan).

---

## 0. Ce que le MVP prouve / ne prouve pas (cadré AVANT)

- **Prouve (falsifiable)** : un système *validé* extrait d'un jeu qui a passé les gates **transfère** à un nouveau consommateur HTML — réutilisé sans réécriture, invariants tenus, gates verts — ET la **gouvernance** (provenance/licence/tier) rejette un brick mal-indexé.
- **Ne prouve PAS** : la généralisation cross-genre, le cross-moteur (Godot), le pipeline d'assets, ni le fun. Le MVP montre que la réutilisation *ne casse pas les gates* et est *tracée*, pas qu'elle rend un jeu meilleur. (« rapporté ≠ démontré ».)

## 1. Schéma (2 types d'enregistrement, métadonnées agnostiques)

Un seul catalogue `library/catalog.json` (données, pas un référent mémoire — cf. §6). Deux formes :

### 1a. Brick (système | connaissance)
```
brick_id        # kebab, unique, préfixé sys- / know-
kind            # "system" | "knowledge"
function        # 1 ligne : ce que ça fait
runtime         # "agnostic" | "html"          (jamais "godot" en MVP)
source          # jeu/dépôt/URL d'origine
license         # SPDX (CC0-1.0 / MIT / GPL-3.0-only …)
dependencies    # [brick_id | pkg]
parameters      # {nom: type/plage}
genre_compatible# [arcade, tactics, …]
invariants      # (system) propriétés testables qui DOIVENT tenir
                # (knowledge) l'énoncé du pattern, cité, SANS code
proof_of_use    # run/jeu gate-vert qui le démontre (chemin) — VIDE => tier=candidate
tier            # "candidate" | "validated"     (validated EXIGE proof_of_use + invariants verts)
sha256          # scellé du fichier de brick (systèmes)
```

### 1b. Asset (fichiers — 2D en MVP)
```
asset_id  source  license(SPDX)  style  genre  biome  format  size_kb
collision  animation  engine_compat  provenance_url  sha256  usage_examples
```

**Règle de licence (gate non-LLM trivial)** : `license` obligatoire et SPDX-valide ; **GPL interdit en `kind:system`** (contamination d'un jeu distribué) ; GPL autorisé en **`kind:knowledge` seulement** (concepts, jamais code). Asset : CC0/MIT/CC-BY uniquement, `provenance_url` obligatoire.

## 2. Premier catalogue (minimal, réel — 0 téléchargement)

| brick_id | kind | source | license | tier | contenu |
|---|---|---|---|---|---|
| `know-wesnoth-damage-floor` | knowledge | Battle for Wesnoth (cité) | GPL-3.0 (concept only) | candidate | « dégâts = max(1, atk − def) » — un coup fait toujours ≥1 (anti-stalemate). Advisory. |
| `know-spd-full-reachability` | knowledge | Shattered Pixel Dungeon (cité) | GPL-3.0 (concept only) | candidate | invariant de génération : tout objectif/sortie est atteignable (BFS complet) — recoupe la doctrine solvabilité. Advisory. |
| `sys-aabb-collision` | system | extrait de `games/breakout/game.mjs` (jeu gate-vert) | MIT (interne) | **validated** | fonction pure de collision AABB + rebond, avec property-tests d'invariants. `proof_of_use` = run breakout vert. |

Asset (démonstration de schéma **sans nouveau download**, en réutilisant des assets CC0 **déjà dans le repo**) :

| asset_id | source | license | note |
|---|---|---|---|
| `asset-kaykit-manBlue-stand` | `games/leviathan/public/assets/manBlue_stand.png` | CC0-1.0 (KayKit) | manifest de démonstration — prouve le schéma + gate licence, aucun octet téléchargé |

Le pack 2D Kenney réel (UI/tiles/sons) est **différé** à un increment ultérieur, **téléchargement gaté Pierre**.

## 3. Premier consommateur Forge (track A, HTML)

Un **mini-jeu HTML consommateur** `games/lib_consumer_arcade/` (jetable → fixture si succès), forgé/assemblé pour **importer le brick `sys-aabb-collision` inchangé** et **citer** `know-wesnoth-damage-floor` dans sa conception (s1/s2 advisory). Il :
- lit `library/catalog.json` → résout le brick → `import` du module de `library/bricks/sys-aabb-collision.mjs` (aucune copie-modèle : import réel) ;
- expose `window.__game`, `#overlay`/`#restart`, `run-oracle.mjs` + `solvability.mjs` (mêmes conventions que breakout) ;
- est mesurable par les gates existants **inchangés** : solvabilité (un bot gagne) + s10d (capteur visuel advisory) + mutation.

Le point : le consommateur **réutilise** le système au lieu de le re-dériver, et la réutilisation est **tracée** (catalog + sha), pas un copier-coller de belote-claude.

## 4. Preuve minimale de valeur (expérience falsifiable, critères figés AVANT)

**Claim** : un brick système *validé* transfère à un nouveau consommateur HTML — réutilisé sans réécriture, invariants tenus, gates verts.

- **Réussite (les 4 exigées)** :
  1. `games/lib_consumer_arcade` **importe** `sys-aabb-collision` **sans le modifier** (diff module = 0 ; sha identique au catalogue).
  2. Les **property-tests d'invariants** du brick passent **dans le contexte du consommateur** (les invariants transfèrent).
  3. Gates existants **verts** sur le consommateur : solvabilité + s10d + mutation.
  4. Gouvernance : `catalog.json` valide (schéma + licence SPDX + `proof_of_use` non vide pour le tier `validated`).
- **Falsification (l'un suffit)** : le brick doit être réécrit pour servir (réutilisation fausse) ; un invariant ne tient pas chez le consommateur ; un gate rouge imputable au brick ; licence/tier non conformes.
- **Contrôle anti-théâtre (obligatoire)** : un **brick mal-indexé** (variante `sys-aabb-collision-BROKEN` avec un invariant faux, ex. rebond sans conservation de la borne) doit être **REJETÉ** — ses property-tests échouent → il ne peut pas atteindre `tier:validated`. Si le catalogue l'accepte, le « tier validé » est un tampon → MVP échoué même si le reste passe.

Verdict calculé mécaniquement (comptage des 4 + contrôle), zéro jugement post-hoc. Sonde-contrôle = le brick BROKEN, exactement comme `probe_clean` en P1.1.

## 5. Ordre de build (falsifiable ; le 1er pas ne touche ni Godot ni download)

1. **Ratifier** ce MVP (ou le redresser) + red-team du design.
2. **Incr. 1 — schéma + validateur de catalogue** (`library/catalog.schema.*` + un check licence/tier non-LLM). Preuve : le validateur accepte une entrée conforme, rejette une licence GPL en `kind:system` et un `tier:validated` sans `proof_of_use`.
3. **Incr. 2 — extraire `sys-aabb-collision`** de breakout vers `library/bricks/` + property-tests d'invariants (TDD). Preuve : invariants verts, sha scellé, `proof_of_use` = run breakout.
4. **Incr. 3 — connaissance** : 2 bricks `know-*` cités (advisory, zéro code). Preuve : lus en advisory, jamais injectés comme code.
5. **Incr. 4 — consommateur + expérience §4** (avec le brick BROKEN comme contrôle). Preuve : les 4 critères + rejet du BROKEN.
6. **Décision Pierre** : promouvoir le consommateur en fixture, et statuer sur le download 2D Kenney (gaté) pour l'increment asset suivant.

## 6. Emplacement (pas un 4e référent mémoire)

```
library/
  catalog.json            # index unique (données)
  catalog.schema.*         # schéma + validateur
  bricks/                  # modules système .mjs (track A) + leurs tests
  knowledge/               # patterns cités .md (advisory, GPL-safe, zéro code)
  README.md                # règles d'admission (tier/proof_of_use/licence)
```
`library/` est **de la donnée + du code**, pas un référent mémoire — il ne concurrence ni `memory/`, ni `studio_brain/`, ni `MEMORY.md` (règle anti-prolifération). Jamais dans le ledger ni `oracles.json` (sauf le consommateur, comme un jeu).

## Rapport de charter
```
software_verdict: (aucun — design MVP, aucun code)
evidence_verdict: MECHANICAL_VALIDATION_ONLY (sources vérifiées : games/breakout, games/leviathan/public/assets réels ; gates existants réutilisés)
claim_verdict: NO_CLAIM_ALLOWED
```
```
