# ORPHAN-GATE SIM V0.4 — mesure honnête, suffisante pour décider si un WARN est légitime

Date : 2026-08-07. Repo : `C:\TACTICAL_CHESS_STUDIO`. SIMULATION UNIQUEMENT, aucune
autorité réelle activée, `exit 0` partout. Prototype dans
`lab/forge_evidence/ORPHAN_GATE_SIM_V04/orphan_gate_sim_v4.py`. Aucun fichier hors
`lab/forge_evidence/ORPHAN_GATE_SIM_V04/` modifié — vérifié par hash MD5 de
`orphan_gate_sim_v2.py` (`3e9311b4…`) et `orphan_gate_sim_v3.py` (`e157173b…`) après
la mission, identiques à l'état de départ. `ORPHAN_GATE_SIM_V01/`, `V02/`, `V03/`
**non touchés** : V04 importe V02 et V03 tels quels (`importlib`), comme V03 le
faisait déjà pour V02.

## CORRECTION 1 — scanner `.mjs` : commentaire de ligne vs bloc vs chaîne vs code

**Cause exacte du bug V02/V03** (confirmée) : `mjs_identifier_lines` testait
`line.find("/*")` sur la ligne **brute**, avant tout retrait du `//` — une ligne
`// ... .claude/agents/*.md ...` (un commentaire de ligne qui contient la
sous-chaîne littérale `/*`) ouvrait donc un faux état « commentaire de bloc » qui ne
se refermait qu'au premier vrai `*/` rencontré plus loin, avalant tout ce qui se
trouvait entre les deux.

**Correction appliquée** : `scan_mjs_mask()` — machine à états sur le **texte entier**
(pas ligne par ligne isolément), 6 états (`code`, `line_comment`, `block_comment`,
`dstring`, `sstring`, `template`), avec échappement `\` géré dans les chaînes/
templates. `mjs_identifier_lines_v4()` réutilise ce masque pour ne retenir que les
identifiants situés en position « code actif ». **Patch appliqué par monkeypatch
documenté** (`v2.mjs_identifier_lines = mjs_identifier_lines_v4`, juste avant l'appel
à `v2.mode_sweep_worktree()`) — rien d'autre dans V02 n'est intercepté ; le fichier
disque V02 reste inchangé (vérifié par hash ci-dessus).

**VALIDATION BLOQUANTE (résultat)** : `auditAgentFile` et `collectDeclaredFields`
(+ `readersNamingField`, touchée par le même bug, repérée en cours de mission) ne sont
plus signalées — **self-guard test PASS**. Comparaison directe scanner V02/V03 (non
patché, capturé AVANT tout monkeypatch) vs V04 :

| symbole | lignes vues (scanner V02/V03, non patché) | lignes vues (scanner V04) |
|---|---|---|
| `auditAgentFile` | `[205]` (définition seule — usage ligne 338 invisible) | `[205, 338]` |
| `collectDeclaredFields` | `[244]` (définition seule) | `[244, 358]` |
| `readersNamingField` | `[280]` (définition seule) | `[280, 361]` |

Sweep complet : **46 signalés** (contre 49 en V03 — les 3 symboles ci-dessus sortent
de la liste, correctement).

## CORRECTION 2 — identité de symbole = nom + signature logique normalisée

**Défaut mesuré V03** : clé `nom+fichier+ligne`, fragile au moindre décalage.
**Correction** : `compute_identity_key()` = nom + signature reconstruite depuis
l'AST (Python : liste ordonnée des paramètres, positional-only/vararg/kwonly/kwarg
distingués) ou depuis le texte de la signature `(params)` (mjs, par nom, jamais par
ligne). L'index de ligne est conservé dans les résultats mais **n'entre plus dans le
calcul de l'identité**.

**TESTS OBLIGATOIRES — sur copies sandbox jetables (`_sandbox_identity/`, rien dans le
vrai dépôt), tous PASS** (`delta_identity_tests.ALL_PASS: true`) :

| test | Python | mjs |
|---|---|---|
| (a) décalage de lignes (ajout en tête de fichier) | clé identique | clé identique |
| (b) déplacement de la fonction dans le fichier | clé identique | clé identique |
| (c) renommage volontaire | clé **différente** (nouveau, attendu) | clé **différente** (nouveau, attendu) |

## CORRECTION 3 — `declared_status` : fenêtre élargie, source toujours imprimée

**Fenêtre retenue** (dans cet ordre, toutes cumulées, jamais une seule priorisée en
silence) :

- **W1 file_header** — bloc de commentaires contigu en tête de fichier (`#`/docstring
  Python, `//`/`/* */` mjs), plafonné à 150 lignes.
- **W2 function_docstring** — docstring propre de la fonction (Python) — inchangé de
  V02/V03.
- **W3 adjacent_comments_60l** — commentaires contigus juste au-dessus de la
  définition, fenêtre étendue de 6 → **60 lignes** (toujours contiguë, jamais tout le
  fichier).
- **W4 sibling_test_file** — pour un artefact `foo.mjs`, le fichier jumeau
  `foo.test.mjs` s'il existe, recherche à ±5 lignes d'une mention nommée du symbole
  (évite de faire matcher un marqueur sans rapport, ailleurs dans un gros fichier de
  test).

Si aucune des 4 fenêtres ne matche : `declared_status: UNKNOWN`, `source: null` — **jamais
une devinette**. Chaque hit rapporte sa fenêtre + fichier + ligne + phrase + citation
verbatim (`declared_status_basis`, jamais un simple booléen).

**Résultat** : `declared_status` EXPERIMENT passe de **3/49 (6 %, V03)** à
**15/46 (33 %, V04)** — la fenêtre élargie capte réellement plus d'intention déjà
écrite dans le dépôt, sans jamais inventer un statut. `inferred_status`
(EXPERIMENT 34/46, UNKNOWN 12/46) et `confidence` restent calculés EXCLUSIVEMENT à
partir des signaux mécaniques de V03 (aucune prose libre), **inchangé de V03** —
Correction 3 ne touche que `declared_status`.

## CORRECTION 4 — quatre cas difficiles, rejoués

1. **`declaration_readers.mjs`** — **CORRIGÉ**. `auditAgentFile` et
   `collectDeclaredFields` : consommateur détecté (usage réel ligne 338/358 dans leur
   propre fichier), `would_block: false` désormais. `self_guard_test.PASS: true`.

2. **`runtime_inventory_oracle.py`** — chaîne complète établie :
   **producteur** = le module lui-même (`emit_drift` écrit le drift ;
   `declared_runtimes`/`observed_in_code`/`observed_by_event`/`compare` le calculent).
   **Consommateur** : `git grep` sur tout `scripts/` hors le fichier lui-même et son
   test → **aucun import réel trouvé**. La seule référence externe est une **mention
   en docstring**, pas un import, dans `observer/adapters/forge_evidence.py`.
   **Décision** : producteur sans consommateur réel, à la granularité du MODULE —
   invisible à l'analyse par symbole (chaque fonction a un « consommateur » qui est
   sa voisine dans le même fichier). Conclusion V03 Phase5#2 **reconfirmée** sur ce
   dépôt au 2026-08-07, pas de nouvelle mesure requise.

3. **`kb_proposal.py`** — hypothèse **confirmée par le code**, pas supposée :
   `knowledge_base/kb-validate.mjs` porte déjà une règle **R3** (refuse toute entrée
   sans provenance valide). `_lesson_to_pattern_entry` (le chemin réellement câblé)
   appelle `_provenance_internal_entry` (branché, testé) — **PAS**
   `_internal_lesson_provenance` (le symbole signalé orphelin, qui sert un bloc non
   reconnu par `BRICK_SPEC`). Le comportement n'a changé que parce qu'une porte
   refusait **déjà** — pas parce que la vague KB a créé une nouvelle autorité. Clé de
   conception confirmée mécaniquement (`confirmed_by_code: true`).

4. **`checkSourceUrlStability`** — **CORRIGÉ**. `declared_status: EXPERIMENT`
   (V03 : `UNKNOWN`), sources imprimées : `W1_file_header`
   (`check_worldscan.mjs:1..~51`, phrase « advisory » / « non branché »),
   `W3_adjacent_comments_60l` (`check_worldscan.mjs:401`, « advisory »),
   `W4_sibling_test_file` (`check_worldscan.test.mjs:695/700/763`, « advisory » /
   « non branchée »). **Jamais `OPERATIONAL` automatique** — règle respectée
   (`rule_respected_never_auto_OPERATIONAL: true`). Amorçage légitime désormais
   **PROUVABLE** par le détecteur lui-même, plus seulement par lecture manuelle.

## CORRECTION 5 — mesure statistique honnête : précision ET rappel

**Méthode déclarée** (même discipline que V03, appliquée aux DEUX échantillons) :
résultats triés par `(fichier, artefact)` (ordre déterministe) puis
`random.seed(20260807)` + `random.sample(liste_triée, 30)`. Chaque cas vérifié à la
main : `git grep` qualifié + lecture du code (jamais une relance du détecteur).
Scripts et évidences bruts : `random_samples.json`,
`manual_verification_grep_evidence.json`.

### Échantillon PRÉCISION (population = 46 signalés `would_block=true`, taille 30)

| # | symbole | verdict | cause si FP |
|---|---|---|---|
| 1 | `check_spawn_invariant` | TRUE_POSITIVE | — |
| 2 | `effort_flag_documented` | TRUE_POSITIVE | — |
| 3 | `classify_reasoning_evidence` | TRUE_POSITIVE | — |
| 4 | `check_charter` | TRUE_POSITIVE (mentions = doc/yaml, pas du code) | — |
| 5 | `checkSourceUrlStability` | TRUE_POSITIVE (calibration) | — |
| 6 | `run_divergence_oracle` | TRUE_POSITIVE (calibration) | — |
| 7 | `_is_str` | TRUE_POSITIVE (0 occurrence hors définition) | — |
| 8 | `propose_ledger_entry` | TRUE_POSITIVE (mentions = watchlist/doc, pas du code) | — |
| 9 | `rapportQualite` | TRUE_POSITIVE | — |
| 10 | `loadCheckpointList` | TRUE_POSITIVE | — |
| 11 | `classify_sections` | TRUE_POSITIVE | — |
| 12 | `_logic_files_from_wiremap_any` | TRUE_POSITIVE (mentions = yaml, pas du code) | — |
| 13 | `run` (`driver.py:294`, méthode `ForgeDriver.run`) | **FALSE_POSITIVE** | appelant réel `run_real.py:1563` (`report = driver.run()`) mais `driver = ForgeDriver(...)` est une **variable locale non annotée** — l'heuristique `typed_instance_attr` n'exige la correspondance que sur un **paramètre annoté**, pas une affectation locale |
| 14 | `collect` (`observer/adapters/transcripts.py:84`) | **FALSE_POSITIVE** | dispatch dynamique `module.collect(ctx)` dans `observer/cli.py:58` (`for module in load_adapters(): ...`) — cause déjà connue V03 |
| 15 | `findByWorker` | TRUE_POSITIVE | — |
| 16 | `game_dir` (`observer/sources.py:196`, `@property`) | **FALSE_POSITIVE** | usage réel confirmé (`ctx.game_dir` dans `system_artefacts.py:559/920`, `system_roadmap.py:905/1010`) mais le paramètre porteur est annoté `ctx: Any` (pas `ObserverContext`) — l'heuristique `typed_instance_attr` exige le nom de classe EXACT, `Any` la désactive |
| 17 | `verify_aggregate` | TRUE_POSITIVE | — |
| 18 | `findMutation` | TRUE_POSITIVE | — |
| 19 | `has_divergence_capacity` | TRUE_POSITIVE (calibration) | — |
| 20 | `validatePrisme` | TRUE_POSITIVE | — |
| 21 | `view_drift` | TRUE_POSITIVE | — |
| 22 | `collect` (`observer/adapters/__init__.py:20`, `Protocol`) | **FALSE_POSITIVE** | même cause que #14 — stub d'interface, implémentations réellement appelées via le même dispatch dynamique |
| 23 | `status_from_passed` | TRUE_POSITIVE | — |
| 24 | `findByClass` | TRUE_POSITIVE | — |
| 25 | `findByLayer` | TRUE_POSITIVE | — |
| 26 | `effort_flag_present_in_cmd` | TRUE_POSITIVE | — |
| 27 | `max_y` (`asset_geometry/measure.py:60`) | TRUE_POSITIVE (hits `.py`/`.gd` étaient des variables locales homonymes coïncidentes, vérifié : aucun `.max_y` réel sur une instance de `Measurement`) | — |
| 28 | `tokens_by_successful_step` | TRUE_POSITIVE | — |
| 29 | `drift_of` | TRUE_POSITIVE | — |
| 30 | `min_y` | TRUE_POSITIVE (même vérification que #27) | — |

**PRECISION : 26/30 = 86,7 %** (vs 85 % en V03, échantillon différent et plus grand —
comparable, pas d'amélioration illusoire revendiquée). **4 faux positifs, 4 causes
mécaniques identifiées** : 2 déjà connues (dispatch dynamique par liste de modules,
V03), 2 **nouvelles, découvertes ici** — toutes deux des variantes du même gap dans
l'heuristique `typed_instance_attr` de V02 (variable locale non annotée / paramètre
annoté `Any`). Ce gap **n'a pas été corrigé** (hors périmètre : modifier la logique de
consommateur de V02 n'était pas demandé) — signalé comme risque, pas réparé.

### Échantillon RAPPEL (population = 1333 symboles `class=OPERATIONAL`, non exclus,
`consumer_found=true` — c'est-à-dire les cas où le détecteur affirme « pas orphelin »
— taille 30)

Vérification : pour chaque symbole, confirmation que la preuve retenue par le
détecteur (`same_file`, `from_import`, `named_import`, …) correspond à un VRAI site
d'appel/référence (AST pour Python, scanner corrigé pour mjs), pas une coïncidence.
30/30 confirmés (`_to_wsl`, `check_line_states`, `write_journal_index`, `evs`,
`contraintesRespectees`, `run_qwen_step`, `_FileMeta`, `run_by_suffix`,
`contexteVoisin`, `_kinds`, `_read`, `checkPrismeFile`, `validateConditionState`,
`_first_ev`, `preuvesPresentes`, `_piece_observer`, `mutation_scope_from_wiremap`,
`_piece_retour_kb`, `_taches_liees`, `_mutation_scope_from_wiremap_any`,
`MIN_SOURCES_PER_GAME`, `_build_infra_section`, `_commits`,
`_collect_mutation_evidence`, `Snapshot`, `regressionDe`, `_emit_tools`,
`_prouve_cell`, `BlindnessViolation`, `_rubrique_found`). Deux cas à preuve
`same_file` spot-vérifiés en détail (`_to_wsl`, `contraintesRespectees`) : appel réel
confirmé par lecture directe du fichier, pas une coïncidence de nommage.

**RAPPEL : 0 FALSE_NEGATIVE sur cet échantillon de 30 (TN 30/30).** **Recall NON
EXTRAPOLABLE au-delà de ce n=30 avec une garantie forte** : la population totale
(1333) contient surtout des preuves `same_file` (helpers privés consommés en interne)
— l'échantillon aléatoire a naturellement tiré une majorité de ce profil (24/30) ;
les preuves `from_import`/`named_import` (usage inter-fichiers, le cas le plus
susceptible de cacher un faux négatif si l'import existe mais que l'appel réel a été
supprimé ailleurs) sont sous-représentées dans ce tirage précis (6/30). Un futur
sweep gagnerait à stratifier l'échantillon par type de preuve plutôt qu'un tirage
uniforme — non fait ici (hors périmètre : la commande demandait un tirage aléatoire
documenté, pas une stratification).

## RÉSUMÉ TRUE_POSITIVE / FALSE_POSITIVE / FALSE_NEGATIVE / UNKNOWN / PRECISION / RECALL

- TRUE_POSITIVE : 26 (échantillon précision, n=30)
- FALSE_POSITIVE : 4 (échantillon précision, n=30) — causes toutes identifiées
- FALSE_NEGATIVE : 0 (échantillon rappel, n=30) — non extrapolable au-delà de n=30,
  biais de tirage documenté ci-dessus
- UNKNOWN : 0 dans les deux échantillons (chaque cas a pu être tranché par lecture du
  code)
- PRECISION : 26/30 = **86,7 %**
- RECALL : **NON MESURABLE en valeur absolue** au sens strict (0/30 FN observé ne
  prouve pas 0 FN sur la population de 1333 — c'est une borne mesurée sur un
  échantillon avec un biais de composition connu, pas un taux de rappel classique
  avec IC). Ce qui EST mesuré et vrai : sur ce tirage aléatoire précis, **aucun** faux
  négatif trouvé.

## RÈGLE DE PROBITÉ — dégradations déclarées, aucune ajustée

Aucune règle de détection n'a été modifiée pour gonfler un score. Deux dégradations
honnêtes à déclarer :

1. **Le nombre de faux positifs par cause `typed_instance_attr` est passé de 0 (non
   mesuré comme tel en V03, absent de son échantillon) à 2 sur ce tirage** — pas une
   régression du détecteur (rien n'a changé dans V02 sur ce point), mais une
   **découverte** : le tirage aléatoire V04 (n=30, plus large que le n=20 de V03) a
   exposé une classe de faux positifs que V03 n'avait pas rencontrée par hasard.
2. **`declared_status` EXPERIMENT est passé de 3/49 à 15/46** — une amélioration
   voulue (Correction 3), pas un artefact : chaque nouvelle source est imprimée et
   vérifiable (`declared_status_basis`), aucun cas n'est classé EXPERIMENT sans
   citation verbatim.

## TESTS DE SORTIE WARN

- **Calibration maintenue 4/4 + 4/4** : `check_spawn_invariant`,
  `checkSourceUrlStability`, `run_divergence_oracle`, `has_divergence_capacity`
  restent `would_block: true` ; `promote_manifest_lessons`,
  `_promote_manifest_lessons_best_effort`, `checkFactConsistency`, `verify_envelope`
  restent `would_block: false`. **PASS.**
- **Le garde n'accuse plus son propre consommateur** (`declaration_readers.mjs` —
  Cas 1) : **PASS**, corrigé et vérifié par self-guard test automatisé, rejouable.
- **Le garde n'accuse plus ses propres validateurs/tests légitimes** : partiellement
  vrai — `checkSourceUrlStability` (advisory volontaire, testé) sort maintenant
  correctement en `declared_status: EXPERIMENT` (pas bloqué au sens du statut, même si
  `would_block` reste techniquement `true` au niveau brut du détecteur V02 sous-jacent,
  ce qui EST le comportement voulu : Phase 6/V03 avait déjà montré qu'un `would_block`
  brut sur du travail en cours n'est pas en soi un faux positif, c'est
  `declared_status`/`inferred_status` qui doivent porter la nuance — ils le font
  désormais, avec source imprimée).
- **Chaque faux positif restant a une cause mécanique identifiée** : **PASS** — 4/4
  causes nommées et vérifiées (2 dispatch dynamique connu, 2 nouvelles variantes du
  gap `typed_instance_attr`).

## LIMITES DU PROTOTYPE V04 (mesurées, honnêtes)

1. **Le gap `typed_instance_attr` (variable locale non annotée / paramètre `Any`)
   n'est PAS corrigé** — 2 faux positifs vérifiés lui sont directement imputables ;
   hors périmètre de cette mission (modifier V02 était interdit).
2. **Le scanner `.mjs` corrigé ne retire toujours pas le contenu des chaînes/
   templates du masque de code actif** (`dstring`/`sstring`/`template` restent
   `mask=1`) — comportement IDENTIQUE à V02/V03 sur ce point précis, pas une
   régression V04, mais un risque théorique non nul : un identifiant cité dans une
   chaîne de caractères pourrait encore compter comme "usage". Non rencontré dans
   cette mission, non corrigé (hors scope de la Correction 1, qui ciblait
   spécifiquement la confusion commentaire ligne/bloc).
3. **Le rappel mesuré (0/30 FN) n'est pas extrapolable avec une garantie statistique
   forte** — biais de composition de l'échantillon documenté ci-dessus
   (`same_file` sur-représenté, `from_import`/`named_import` sous-représentés).
4. **La famille "stub d'interface / `Protocol`"** (`Adapter.collect`) reste, comme en
   V03, une 7ᵉ famille d'exclusion candidate non ajoutée (hors périmètre : modifier la
   logique d'exclusion de V02 était interdit).
5. **`git log -S` (signaux `inferred_status`, hérités de V03 sans modification) mesure
   toujours la présence textuelle du nom**, pas du symbole au sens AST — limite
   héritée, non ré-auditée ici (V03 l'avait déjà documentée, Correction 3 ne touche
   pas `inferred_status`).

## Fichiers produits

- `orphan_gate_sim_v4.py` — le prototype (monkeypatch documenté du scanner `.mjs`,
  identité par signature, fenêtre `declared_status` élargie, 4 cas difficiles, mode
  `selftest` + `sweep`)
- `selftest.json` — self-guard test (Correction 1) + tests d'identité delta
  (Correction 2), tous PASS
- `resultats_sweep_worktree_v4.json` — 1450 candidats, 46 signalés (vs 49 V03), 71
  exclus (identique), `status_classification` (46 entrées, `declared_status`/
  `declared_status_basis` recalculés), `hard_cases` (4/4), self-guard + identity
  tests inclus
- `random_samples.json` — les deux tirages aléatoires (seed 20260807, méthode
  documentée)
- `manual_verification_grep_evidence.json` — preuves `git grep` brutes utilisées pour
  la vérification manuelle des 60 cas (30 précision + 30 rappel)
- `sweep_v4.err`, `selftest.err` — stderr (warnings de syntaxe préexistants dans le
  dépôt, sans rapport avec le détecteur)

## Rapport final

STATUS: DONE
VERSION: V0.4
FILES_CHANGED: aucun fichier existant modifié hors `lab/forge_evidence/ORPHAN_GATE_SIM_V04/**` (nouveau dossier)
FILES_NOT_CHANGED: scripts/forge/**, scripts/observer/**, .claude/hooks/**, games/**, tests/**, ORPHAN_GATE_SIM_V01/**, ORPHAN_GATE_SIM_V02/**, ORPHAN_GATE_SIM_V03/** (baselines intactes, hash MD5 vérifié identique pour V02/V03, importées telles quelles)
CALIBRATION: (known_orphans_detected: 4/4 — check_spawn_invariant, checkSourceUrlStability, run_divergence_oracle, has_divergence_capacity / known_consumed_not_blocked: 4/4 — promote_manifest_lessons, _promote_manifest_lessons_best_effort, checkFactConsistency, verify_envelope)
SELF_GUARD_TEST: PASS — auditAgentFile/collectDeclaredFields/readersNamingField ne sont plus signalées après correction du scanner .mjs (46 signalés vs 49 en V03)
DELTA_IDENTITY_TEST: PASS — 3/3 scénarios (décalage de ligne, déplacement dans le fichier, renommage) corrects en Python ET mjs, sur sandbox jetable
RANDOM_SAMPLE: (seed: 20260807 / precision_size: 30 (population 46) / recall_size: 30 (population 1333) / precision: 26/30 = 86.7% / recall: 30/30 TN observé sur l'échantillon, NON EXTRAPOLABLE en taux absolu — biais de composition documenté)
NOT_WIRED: declared_status EXPERIMENT 15/46 (33%, vs 3/49=6% en V03) — fenêtre élargie (W1 entête fichier + W2 docstring + W3 60 lignes adjacentes + W4 fichier de test jumeau), chaque hit cite sa fenêtre/fichier/ligne/phrase verbatim, jamais une devinette (31/46 restent UNKNOWN, source=null explicite)
KB_CASE_ANALYSIS: CONFIRMÉ PAR LE CODE — kb-validate.mjs porte déjà la règle R3 (refuse toute entrée sans provenance) ; _lesson_to_pattern_entry appelle _provenance_internal_entry (branché), pas _internal_lesson_provenance (orphelin, bloc non reconnu par BRICK_SPEC) ; le comportement n'a changé que parce qu'une porte refusait déjà
FALSE_POSITIVES: 4/30 (cause: 2× dispatch dynamique module.collect(ctx) via load_adapters() [connu V03] ; 2× gap typed_instance_attr — variable locale non annotée (driver.run) et paramètre annoté Any au lieu du nom de classe exact (game_dir) [nouveau, découvert ici, non corrigé, hors périmètre])
FALSE_NEGATIVES: 0/30 sur l'échantillon rappel aléatoire (seed 20260807) ; non extrapolable au-delà de n=30, biais de composition de l'échantillon documenté (same_file sur-représenté)
WARN_READY: NON
BLOCK_READY: NON
RISKS: (1) gap typed_instance_attr non corrigé (2 causes nouvelles de faux positif, hors périmètre de cette mission) ; (2) contenu de chaîne/template non exclu du scanner .mjs corrigé (hérité, risque théorique non observé) ; (3) recall mesuré sur un échantillon dont la composition (same_file sur-représenté) ne garantit pas l'absence de faux négatifs sur les cas from_import/named_import, sous-représentés dans ce tirage précis ; (4) famille Protocol-stub toujours non exclue explicitement (hors périmètre)
NEXT: le garde peut-il être cru assez pour réduire l'attention humaine, sans devenir lui-même une source de bruit ? Réponse mesurée : MIEUX QU'EN V03, PAS ENCORE SUFFISANT. Les 3 corrections demandées sont vérifiées par test automatisé rejouable (self-guard, identité delta, fenêtre déclarée) et la précision (86,7% sur n=30, population quasi-entièrement échantillonnée) est stable par rapport à V03. Mais (a) le rappel n'a été mesuré que sur un échantillon biaisé en composition — un WARN activé sur cette base pourrait laisser passer un vrai orphelin dont la preuve de consommation est un import inter-fichiers cassé ailleurs, catégorie sous-testée ici ; (b) le gap typed_instance_attr (2 nouvelles causes de FP) touche précisément le genre de code que ce garde est censé protéger (méthodes de classes centrales, ForgeDriver.run, ObserverContext.game_dir) — bloquer dessus ferait exactement le bruit que la mission cherche à éviter. Piste actionnable pour une V05 : (i) stratifier l'échantillon de rappel par type de preuve (from_import/named_import sur-échantillonnés) pour combler la limite 3 ; (ii) élargir typed_instance_attr aux affectations locales directes (`x = ClassName(...)`) et refuser Any comme type "concluant" (le traiter comme absence d'annotation) — mais ceci modifierait V02, donc hors du périmètre de simulation actuel, nécessite un mandat explicite.

software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
