# external_sources/ — protocole de capital externe

## La règle non négociable

```
source externe → analyse → connaissance propriétaire → réimplémentation Forge
```

et **jamais**

```
dépôt trouvé → copier-coller → KB
```

Un dépôt, un article, ou un projet open-source consulté n'entre **jamais** directement dans
`knowledge_base/`. Il est d'abord **étudié** (`studied/`), ce qui en est retenu est **extrait
sous forme de connaissance propriétaire** (`extracted_knowledge/`) — patterns, principes,
formes de solution, jamais des octets copiés — puis, si du code doit exister, il est
**réimplémenté** par la Forge à partir de cette connaissance, jamais transplanté.

Cette règle n'est pas une déclaration d'intention : elle est **rendue exécutoire** par les
gardes déjà en place dans `knowledge_base/kb-validate.mjs` (implémente R1..R12 de
`docs/forge/KB_INGESTION_CONTRACT.md`). Vérifié ligne par ligne dans ce fichier avant
d'être cité ici (voir `.superpowers/sdd/task-12-report.md` pour le détail de la vérification) :

- **R2 — licences en liste fermée SPDX** (`kb-validate.mjs:390,436,549` via `KNOWN_SPDX`,
  ligne 38) : toute entrée dont la licence n'est pas dans la liste fermée (`MIT`, `CC0-1.0`,
  `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`, les GPL, ou les licences d'assets) est rejetée.
  Rien d'« autre » ne rentre silencieusement.
- **R4 — GPL interdite sur du code** (`kb-validate.mjs:440`) : `"licence interdite pour du
  CODE (...) — GPL contamine un jeu distribue"`. Une source sous GPL peut être **étudiée**
  (`studied/`) mais jamais réimportée telle quelle comme code de la bibliothèque.
- **R4-contenu — marqueur GPL détecté dans le contenu** d'un module déclaré permissif
  (`kb-validate.mjs:525-526`) : le validateur inspecte le texte brut à la recherche de
  `GNU (Lesser|Affero) General Public License` ou d'un en-tête `SPDX-License-Identifier:
  (L|A)?GPL...` et rejette même quand la métadonnée déclarée prétend être permissive —
  la déclaration seule ne suffit pas, le contenu est vérifié.
- **R3 — `provenance_url` obligatoire pour un pattern** (`kb-validate.mjs:445`) : un pattern
  cité sans URL de provenance vérifiable est rejeté. Une connaissance extraite doit pouvoir
  être retracée jusqu'à sa source.
- **R5/R11 — patterns `advisory_only`, cités, jamais injectés comme code**
  (`kb-validate.mjs:444` : `"un pattern est advisory_only: true (cite, jamais injecte)"` ;
  `kb-validate.mjs:522` : `"import depuis patterns/ interdit (cites, jamais injectes)"`) : un
  pattern documente une forme de solution en prose (`.md`, `kb-validate.mjs:446`), il n'est
  jamais un module de code important par un jeu.
- **R3 — marqueur exact pour le code original** (`kb-validate.mjs:45`, constante
  `ORIGINAL_MARKER`) : du code sans inspiration externe citable doit avoir un champ `source`
  commençant **exactement** par la chaîne `"ORIGINAL — aucune inspiration externe citee"`
  (`kb-validate.mjs:453-455`) pour être reconnu comme provenance originale valide — pas une
  auto-déclaration libre, une chaîne fermée et auditable.

Ces gardes s'appliquent à `knowledge_base/`, pas à `external_sources/` lui-même : c'est
précisément pourquoi `external_sources/` existe comme **sas** en amont — un dépôt étudié ici
n'a pas encore à respecter ces règles (ce n'est pas encore du code de la bibliothèque), mais
rien de `studied/` ni `imported_code/` ne franchit vers `knowledge_base/` sans avoir d'abord
produit une entrée qui, elle, passera `kb-validate.mjs`.

## Les trois dossiers

- **`studied/<source>/`** — une source externe consultée (dépôt, article, wiki, moteur de
  référence). Contient au minimum `source_reference.yaml` (gabarit ci-dessous). Aucun code
  source de la source externe n'est copié tel quel ici au-delà de ce qui est strictement
  nécessaire à l'analyse (courts extraits cités, jamais des fichiers entiers dupliqués).
- **`imported_code/`** — délibérément **vide par défaut** (`.gitkeep` seul). Réservé au cas
  limite d'un import de code sous licence permissive (MIT/CC0/Apache/BSD) où la
  réimplémentation n'apporterait rien (ex. une constante mathématique publiée, une table de
  référence). Toute entrée ici doit encore passer les gardes R2/R3/R4 avant d'atteindre
  `knowledge_base/` — ce dossier n'est pas une dérogation, c'est une étape supplémentaire de
  la même chaîne de preuve.
- **`extracted_knowledge/`** — le produit de l'analyse : notes de conception, principes,
  formes de solution reformulées dans le vocabulaire propriétaire de la Forge. C'est cette
  connaissance-là, jamais les octets de la source, qui alimente une réimplémentation ou un
  pattern `knowledge_base/patterns/` (`advisory_only: true`, cité, jamais injecté — R5/R11).

## Gabarit `studied/<source>/source_reference.yaml`

```yaml
name: ""              # nom du projet/dépôt/article étudié
url: ""                # URL canonique (deviendra provenance_url si cité en aval)
license: ""            # licence SPDX déclarée par la source (peut être GPL — étude autorisée)
retained: []           # liste : ce qui a été retenu (principes, mécaniques, formes) — PAS de code
rejected: []           # liste : ce qui a été rejeté et pourquoi (incompatible, hors-scope, licence)
studied_by: ""         # agent/session ayant fait l'analyse
studied_at: ""         # date ISO 8601
notes: ""              # contexte libre — pourquoi cette source a été consultée
```

Aucun champ de ce gabarit n'autorise un chemin vers du code copié-collé : `retained` et
`rejected` sont des listes de texte (analyse), jamais des chemins de fichiers source externes.
