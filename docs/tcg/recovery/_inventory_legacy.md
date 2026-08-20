# Inventaire legacy — récupération TCG (périmètre PureLab / archives / runtime_outputs)

Date : 2026-07-06 · Source : agent inventaire legacy (lecture seule hors repo)
Périmètre couvert : `Desktop/TacticalChessPureLab`, `Desktop/pure lab legacy/TacticalChessPureLab`,
`Desktop/archives`, `Desktop/runtime_outputs`.
Complémentaire aux inventaires existants (`_inventory_desktop.md`, `_inventory_downloads.md`, `_inventory_repo.md`).

## Résumé

Compteurs :
- Dossiers TCG localisés : 2 utiles (`MASTER_DOCS/.../AUTOBATTLER_RELECTURE_2026_04_26`, `tactical_chess_v1_auto_installer/template`) + `lab/project_genesis`.
- 2e copie `pure lab legacy/TacticalChessPureLab` = duplicata quasi-identique du 1er (mtime 19 mai). Non re-traitée.
- Fichiers copiés vers `incoming/` : **5** (code générateur/simulateur installer, exception no-code justifiée).
- Doc de design pertinente : entièrement **DOUBLON** de ce qui est déjà dans le repo courant → non recopiée.
- `archives/` = KENPACHI transfer packages + artefacts github (gouvernance studio), **0 contenu TCG**.
- `runtime_outputs/` = audits ACL / robocopy dry-run / listings shadow-copy CSV, **0 contenu TCG** (matches grep = faux positifs sur logs d'audit).

### VERDICT sur les 3 trous durs

| Cible | Verdict | Détail |
|---|---|---|
| (1) Générateur de cartes en CODE (par budget de puissance) | **NON TROUVÉ** (au sens strict) | Aucun script python/js de génération de cartes. Le seul générateur en code est `ruleset_generator.rs` (installer template, 2930 o) : il génère des **rulesets** procéduraux (taille plateau, murs, stats Soldier/Archer par index modulo) — **pas** des cartes par power-budget. Dans le repo courant ce fichier est un **stub 204 o**. La logique « budget de puissance » n'existe que comme **doc de design** (genesis §5/§6/§21, §31 « table de paramètres pour simulateur » : Pion 4 / Cavalier 6 / Fou 6 / Tour 7 / Reine 8 / Roi 9), déjà présente dans le repo. |
| (2) SET 1 de cartes réelles | **NON TROUVÉ** | Aucune liste de cartes générées (json/csv/yaml) nulle part dans le périmètre. Seules des specs de sets (genesis §25 « structure statistique des sets », §10 micro-sets/factions) existent — descriptif, pas de données de cartes. |
| (3) Simulateur / batch 50 parties (p1_winrate, mean_turns, pressure_victories, brawlDamage, kingPressure) | **NON TROUVÉ** (comme code dédié) | Les métriques camelCase (`brawlDamage`, `kingPressure`) n'apparaissent QUE comme **texte de design** dans genesis §37 (« extracted_knowledge ») et les sources HTML d'origine. Aucun fichier `.js/.ts` dans tout le périmètre. Le simulateur Rust réel (`simulation_runner.rs`) existe mais utilise `balance_score`/`quality_score`, PAS ces métriques ; et il est déjà dans le repo courant (version plus récente : 69,8 Ko Jun-29 vs 66,4 Ko May-18 sur le Desktop). Le « proto labo v7 » avec baseline 50 parties n'a **pas** été retrouvé en code. |

## Tableau

| Chemin (Desktop) | Taille | Date (mtime) | Sujet | Recoupement | Copié vers / raison |
|---|---|---|---|---|---|
| `TacticalChessPureLab/MASTER_DOCS/ARCHIVE/CONTEXT/AUTOBATTLER_RELECTURE_2026_04_26/` (6 md) | ~12 Ko | 2026-05-16 | Relecture autobattler : univers, règles core, draft/sideboard, RNG garde-fous, matrices | **DOUBLON** exact du repo (`00_STUDIO_CONTROL/00_MASTER_DOCS/ARCHIVE/CONTEXT/...` + import ChessTCG) — diff IDENTICAL | Non copié (déjà dans repo) |
| `TacticalChessPureLab/lab/project_genesis/grosgptgenese_md/` (40 md) | — | 2026-05-16 | Genèse GPT : règles, coûts, RNG, micro-sets, params simulateur (§31), stats génération cartes (§27) | **DOUBLON** repo (`lab/project_genesis/grosgptgenese_md/`) | Non copié (déjà dans repo) |
| `TacticalChessPureLab/lab/project_genesis/sources_html/` (~16 html) | — | 2026-05-16 | Sources HTML brutes de la genèse (contiennent brawlDamage/kingPressure en texte) | Doublon genesis | Non copié |
| `.../tactical_chess_v1_auto_installer/template/src/tool/ruleset_generator.rs` | 2930 o | 2026-05-16 | **Générateur de rulesets procédural** (plateau/murs/unités par index) | ABSENT du repo (repo = stub 204 o partout) | **`incoming/legacy_2026-05-16__installer_ruleset_generator.rs`** — plus proche cible #1 |
| `.../template/src/experiment/runner.rs` | 2030 o | 2026-05-16 | **Boucle d'expérience batch** : génère ruleset → valide → run N matchs → analyse balance → persiste | ABSENT du repo (installer non importé) | **`incoming/legacy_2026-05-16__installer_experiment_runner.rs`** — cible #3 (scaffolding batch) |
| `.../template/src/tool/balance_tool.rs` | 2003 o | 2026-05-16 | `analyze_matches` : balance_score / quality_score sur résultats de matchs | ABSENT du repo | **`incoming/legacy_2026-05-16__installer_balance_tool.rs`** |
| `.../template/src/tool/ruleset_validator.rs` | 993 o | 2026-05-16 | Garde-fous validation ruleset généré | ABSENT du repo | **`incoming/legacy_2026-05-16__installer_ruleset_validator.rs`** |
| `.../template/src/prototype/runtime_ruleset.rs` | 2654 o | 2026-05-16 | Modèle de données ruleset (UnitTemplate, TerrainPlacement, UnitSpawn) | ABSENT du repo | **`incoming/legacy_2026-05-16__installer_runtime_ruleset.rs`** |
| `TacticalChessPureLab/src/` (full Rust engine ~140 .rs) | grand | 2026-05→06 | Moteur échecs+autobattler complet | **Version + ANCIENNE** du repo courant (repo = plus récent/complet) | Non copié (repo plus abouti) |
| `Desktop/archives/{KENPACHI,bundles,github,migration,reports}` | — | 2026-05-16 | Transfer packages gouvernance studio, artefacts CI github | Hors sujet TCG | Non copié |
| `Desktop/runtime_outputs/*` | — | 2026-05-20 | Audits ACL/duplicate, robocopy dry-run, listings shadow-copy | Hors sujet TCG (faux positifs grep) | Non copié |

## Contenu notable

- Le seul **code générateur** distinct est celui de l'`auto_installer/template`. Il produit des **rulesets** (plateau 5×5/6×6/7×7, murs, stats Soldier/Archer variées par index) — pas des cartes par budget. Ce n'est pas le « générateur de cartes par power-budget » cherché, mais c'est le plus proche et il est absent du repo courant.
- Le pipeline batch `experiment/runner.rs` + `balance_tool.rs` + `ruleset_validator.rs` forme un **mini-labo de simulation** (générer → valider → N matchs → score balance/qualité → DB). C'est la structure « simulateur batch », mais **sans** les métriques king-pressure/brawl et **sans** baseline 50 parties archivée.
- Les métriques exactes de la cible #3 (`brawlDamage`, `kingPressure`, `pressure_victories`) ne vivent que dans la **doc de design** (genesis §37 + HTML sources), jamais dans du code exécutable retrouvé.
- La **spec power-budget** est complète en doc : genesis §31 donne budgets pièces (Pion 4 → Roi 9) et tables de coût stats (PV 4→0…9→5) ; §21 « matrice de coût complète ». Tout ça est déjà dans `lab/project_genesis` du repo.
- Le repo courant contient déjà : `lab/project_genesis/` complet, les docs `AUTOBATTLER_RELECTURE_2026_04_26`, et un **import github docs-only** sous `repos/games/ChessTCG/SOURCE_IMPORTS/TacticalChessPureLab_github_main/` (MASTER_DOCS + lab, **pas** de src/).
- `archives/` et `runtime_outputs/` sont du bruit d'infra (ACL, robocopy, CI) — aucune valeur TCG.

## Version divergente ?

Oui, mais dans le sens inverse de l'espoir : `Desktop/TacticalChessPureLab` est un **snapshot plus ANCIEN** (mi-mai) du **même** codebase que le repo courant. Preuves : `simulation_runner.rs` = 66,4 Ko (18 mai) sur Desktop vs 69,8 Ko (29 juin) dans le repo ; `ruleset_generator.rs` = stub 204 o des deux côtés dans `src/tool`. La version **la plus aboutie du moteur est celle du repo courant**, pas la legacy.

La **seule divergence à valeur ajoutée** est l'`auto_installer/template/` : il porte une version *plus riche* de `ruleset_generator.rs` (logique procédurale réelle) que le stub du repo, plus le scaffolding `experiment/balance/validator`. Ces 5 fichiers (copiés dans `incoming/`) n'existent nulle part dans le repo courant et sont les seuls candidats « générateur/simulateur » exploitables retrouvés dans ce périmètre.

Toute la **doc de design** legacy est un doublon strict de `lab/project_genesis` + `MASTER_DOCS/.../AUTOBATTLER_RELECTURE` déjà présents.
