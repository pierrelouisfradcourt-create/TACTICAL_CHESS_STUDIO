# CONTRAT D'INGESTION — Game Knowledge Base (v2)

- **Date** : 2026-07-12
- **Statut** : PROPOSED v2 — **red-teamé** (fallback claude-blind : LM Studio :1234 down, prouvé
  `curl connection refused` ce jour), findings **adjugés et corrigés** (voir
  `KB_REDTEAM_ADJUDICATION.md` : 18 findings, 2 invariants centraux étaient cassés en v1 →
  fermés, 3 limites résiduelles déclarées). Le validateur v2 passe 46/46 tests. Soumis à
  **ratification Pierre**. Aucun téléchargement n'est engagé par ce contrat.
- **Amendements v2** (détail dans l'adjudication) : R7 couvre TOUS les chemins déclarés (path,
  proof_of_use, usage_examples, tests) + refuse liens symboliques + confine par realpath + casse
  exacte ; R10 durci (préfixe node: optionnel, imports nus, import()/eval/Function/crochet ;
  passe RAW pour imports, STRIPPED pour accès globaux) ; R4/R6 ajoutent un sniff de contenu
  (marqueur GPL dans le code ; magic-bytes raster pour asset 2D ingéré) — licence sémantique
  reste gate humain ; R1 schéma fermé ; code exige un path + une provenance (URL ou dép. pat-*).
- **Source de cadrage** : mission Pierre 2026-07-12 (« lancer la Game Knowledge Base par INGESTION »).
- **Parents** : `STUDIO_RUNTIME_ARBITRATION.md` (cadre C-restreint / A-first / B-gaté — décisif) ·
  `LIBRARY_MVP.md` (SUPERSÉDÉ sur le cadrage ; **seul son schéma tier/proof_of_use est conservé**) ·
  `P2_PRODUCTION_PROPOSAL.md` (chantier DISJOINT, extraction interne — toujours PROPOSED, non consommé ici).
- **Méthode** : cycle expérimental P1.1 (contrat → red-team → adjudication → ratification →
  expérience → conclusion limitée). Gabarit : `P1_1_PROTOCOL.md`.

---

## 0. Objet et périmètre

La Knowledge Base (`knowledge_base/`) est une **mémoire de production** : ingestion, classification
et orchestration de composants open source existants, consommés par le Forge pour assembler des
jeux. C'est de la **donnée + du code** — PAS un 4e référent mémoire (elle ne concurrence ni
`memory/`, ni `studio_brain/`, ni `MEMORY.md`).

Deux contraintes non négociables (héritées P0/P1, jamais redécouvertes) :

1. **Runtime honnête.** Seul le pipeline HTML/JS/canvas/Playwright est prouvé. Le sous-ensemble
   consommable MAINTENANT = 2D compatible HTML (Kenney) + patterns agnostiques. Les packs 3D
   (Quaternius/KayKit/PolyHaven) et addons Godot sont **catalogués en métadonnées, jamais
   téléchargés ni consommés** tant qu'un validateur Godot n'existe pas et n'est pas prouvé.
2. **Licences.** CC0/MIT/CC-BY → ingestion possible. GPL (Wesnoth/Veloren/SPD) → **patterns/concepts
   UNIQUEMENT, jamais de code** (contamination d'un jeu distribué). Un `system` en CODE ne peut
   venir que d'une source permissive ou d'une **réécriture propre** inspirée d'un pattern cité.

## 1. Schéma pivot — `knowledge_base/catalog.json`

Un catalogue unique. En-tête : `{ "catalog_version": 1, "entries": [...] }`.
Chaque entrée porte `entry_type: "asset" | "brick"`.

### 1a. Asset (fichiers — images, sons, tiles)

| Champ | Type | Règle |
|---|---|---|
| `asset_id` | `asset-<kebab>` | unique dans le catalogue |
| `source` | string | nom lisible du pack/de la source |
| `license` | SPDX | ∈ {`CC0-1.0`, `MIT`, `CC-BY-4.0`, `CC-BY-3.0`} — GPL **refusé** pour un asset |
| `provenance_url` | URL http(s) | obligatoire, non vide |
| `style` | string | ex. `flat-top-down` |
| `genre` | [string] | non vide |
| `biome` | string \| null | — |
| `format` | `"2D"` \| `"3D"` | — |
| `size_kb` | number > 0 \| null | null SEULEMENT si `ingested: false` |
| `sha256` | hex 64 \| null | null SEULEMENT si `ingested: false` ; sinon **vérifié contre le disque** |
| `runtime` | `"html"` \| `"godot"` | — |
| `ingested` | bool | discriminant ingéré / manifest-only |
| `path` | string \| null | si `ingested` : chemin repo-relatif sous `knowledge_base/assets/`, fichier existant ; sinon null |
| `usage_examples` | [string] | chemins ; peut être vide |
| `tier` | `candidate` \| `validated` | cf. §3 |

### 1b. Brick (`kind` ∈ system | pattern | template)

| Champ | Type | Règle |
|---|---|---|
| `brick_id` | préfixé | `sys-` (system), `pat-` (pattern), `tpl-` (template) — préfixe cohérent avec `kind`, unique |
| `kind` | enum | `system` \| `pattern` \| `template` |
| `function` | string | 1 ligne, non vide |
| `source` | string | citation d'origine (jeu/dépôt/pack) |
| `provenance_url` | URL \| null | **obligatoire pour `kind: pattern`** (citation vérifiable) |
| `license` | SPDX | cf. gate licence §2-R4/R5 |
| `runtime` | enum | `agnostic` \| `html` \| `godot` |
| `dependencies` | [brick_id] | chaque référence existe ; graphe **acyclique** |
| `parameters` | object | peut être `{}` |
| `genre_compatible` | [string] | non vide |
| `invariants` | [string] | non vide (system : propriétés testables ; pattern : énoncés cités) |
| `proof_of_use` | string \| null | chemin d'une preuve de gate vert ; **exigé non-null si `tier: validated`**, et le chemin existe |
| `tier` | enum | `candidate` \| `validated` |
| `path` | string \| null | system/template : module sous `knowledge_base/systems/`/`templates/` ; pattern : fiche `.md` sous `knowledge_base/patterns/` ; null si `runtime: godot` (manifest-only) |
| `sha256` | hex 64 \| null | obligatoire et **vérifié contre le disque** si `path` non-null |
| `tests` | string \| null | **obligatoire pour `kind: system`** : fichier de tests existant |
| `advisory_only` | bool | **doit être `true` pour `kind: pattern`** |

## 2. Règles d'admission (gate non-LLM — chacune est un test du validateur)

- **R1 — Schéma.** Tout champ du tableau §1 présent et bien typé ; `entry_type`/`kind`/enums valides ;
  ids uniques ; préfixe d'id cohérent avec le kind.
- **R2 — SPDX.** `license` appartient à la liste fermée du validateur (pas de texte libre).
- **R3 — Provenance.** `provenance_url` obligatoire (assets et patterns) ; http(s) uniquement.
- **R4 — GPL/code.** `kind: system` ou `template` avec licence `GPL-*` (ou toute licence hors liste
  permissive code : MIT, CC0-1.0, Apache-2.0, BSD-2/3-Clause) → **REJET**.
- **R5 — GPL/pattern.** `kind: pattern` : GPL autorisé (concept cité) ; `advisory_only: true` exigé ;
  `path` (si non-null) pointe un `.md` — **jamais un module de code**.
- **R6 — Godot/3D = manifest-only.** `runtime: godot` ou `format: "3D"` ⇒ `ingested: false` (asset)
  / `path: null` (brick). Toute entrée godot/3D avec des octets sous `knowledge_base/` → REJET.
- **R7 — Réalité disque.** `ingested: true` ou `path` non-null ⇒ le fichier existe, est SOUS
  `knowledge_base/` (chemin repo-relatif, pas d'absolu, pas de `..`), et son **sha256 réel = sha256
  déclaré**. `size_kb` cohérent (±10 %).
- **R8 — Tier.** `tier: validated` ⇒ `proof_of_use` non-null et le chemin existe (bricks) ;
  pour un asset : `usage_examples` non vide et chaque chemin existe. Sinon → REJET
  (« validated » sans preuve = tampon).
- **R9 — Dépendances.** Chaque `dependencies[i]` existe dans le catalogue ; graphe acyclique.
- **R10 — Pureté des systems.** Le module d'un `kind: system` ne doit matcher aucun motif
  d'impureté (approximation textuelle assumée, listée dans le validateur) : `require(`,
  `from "node:fs|http|https|child_process"`, `fetch(`, `document.`, `window.`, `Math.random`.
  RNG injecté uniquement.
- **R11 — Patterns jamais injectés.** Aucun module `system`/`template` n'importe depuis
  `knowledge_base/patterns/` (check textuel des imports). Les patterns sont cités (advisory),
  jamais exécutés.
- **R12 — Tests des systems.** `kind: system` ⇒ `tests` non-null et le fichier existe.

Sortie du validateur : exit 0 (conforme) · exit 1 (≥1 violation, liste entrée+règle) ·
exit 2 (catalogue illisible). Zéro LLM, zéro réseau.

## 3. Tiers et preuve d'usage (conservé de LIBRARY_MVP)

- `candidate` : admis au catalogue (schéma + licence + provenance conformes), **non prouvé en jeu**.
- `validated` : EXIGE `proof_of_use` = chemin d'une évidence de gate vert (run-oracle exit 0 d'un
  jeu consommateur qui importe/affiche réellement la brique/l'asset). La promotion
  candidate→validated est un acte mécanique (preuve) + consigné, jamais un jugement.
- Les patterns restent `advisory` à vie : cités dans les docs de conception (s2-worldscan),
  jamais injectés comme code — exactement le régime world-scan.

## 4. Politique de téléchargement (gate Pierre)

- **Tout octet nouveau entrant par le réseau = gate Pierre explicite** (nom du pack, URL, licence,
  taille). Pas d'ingestion de masse : noyau minimal d'abord.
- **Noyau zéro-download (cette session)** : les fichiers CC0 **déjà présents dans le repo**
  (`games/leviathan/public/assets/`, provenance documentée par `games/leviathan/CREDITS.md` :
  pack Kenney « Top-down Shooter », CC0) peuvent être ingérés par **copie locale** — aucun octet
  réseau. Déclaré ici pour être ratifiable/rejetable en bloc.
- Le premier download réel proposé (gaté, NON exécuté) : 1 pack Kenney 2D cohérent — proposition
  détaillée séparée au rapport de session.

## 5. Structure disque

```
knowledge_base/
  catalog.json          # index pivot unique (données)
  kb-validate.mjs       # validateur non-LLM (R1..R12) + kb-validate.test.mjs
  assets/{characters,creatures,environments,props,ui}    # 2D ingéré ; 3D = manifest-only (jamais de fichier)
  systems/{combat,inventory,dialogue,quest,ai,procgen}   # CODE permissif/réécriture propre uniquement
  patterns/{tactical_combat,rpg_progression,economy,world_sim}  # fiches .md citées, GPL-safe, advisory
  templates/{rpg,tactical,roguelike,survival}            # squelettes d'assemblage (spec, pas un moteur)
  README.md             # règles d'admission (résumé de ce contrat)
```

Jamais dans le ledger ni `oracles.json` (sauf un jeu consommateur, comme tout jeu).

## 6. Contrôle anti-théâtre (obligatoire, avant toute conclusion)

Une **brique-contrôle volontairement mal indexée** (licence GPL en `kind: system` + `tier:
validated` sans `proof_of_use` + sha256 faux) doit être **REJETÉE** par le validateur, preuve
d'exécution à l'appui (exit ≠ 0 + messages). Si elle passe, le tier « validated » est un tampon →
échec déclaré de l'incrément, quel que soit le reste.

## 7. Limites déclarées d'avance

- Ce contrat ne prouve rien sur : le fun, la généralisation inter-genres, le 3D/Godot, la qualité
  des sources ingérées. Il gouverne l'ADMISSION, pas la valeur.
- R10/R11 sont des approximations textuelles (pas une analyse sémantique) — assumé, listé pour le
  red-team.
- La vérification `provenance_url` est syntaxique (le validateur ne fait AUCUN appel réseau) ;
  l'exactitude de la provenance relève de la revue humaine au gate.

## Rapport de charter

```
software_verdict: (aucun — contrat, le code arrive en TDD après)
evidence_verdict: MECHANICAL_VALIDATION_ONLY (LM Studio down prouvé ; provenance CC0 vérifiée par CREDITS.md)
claim_verdict: NO_CLAIM_ALLOWED
```
