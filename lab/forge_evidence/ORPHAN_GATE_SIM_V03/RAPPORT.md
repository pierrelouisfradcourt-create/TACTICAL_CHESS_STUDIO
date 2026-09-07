# ORPHAN-GATE SIM V0.3 — le garde distingue-t-il l'oubli de l'amorçage volontaire ?

Date : 2026-08-07. Repo : `C:\TACTICAL_CHESS_STUDIO`. SIMULATION UNIQUEMENT, aucune
autorité réelle activée. Prototype dans
`lab/forge_evidence/ORPHAN_GATE_SIM_V03/orphan_gate_sim_v3.py`. Aucun fichier hors
`lab/forge_evidence/ORPHAN_GATE_SIM_V03/` modifié. `ORPHAN_GATE_SIM_V01/` et
`ORPHAN_GATE_SIM_V02/` **non touchés** — V03 **importe** `orphan_gate_sim_v2.py` tel
quel (`importlib`, aucune copie divergente) : la détection de consommateurs, les
exclusions et la prose NOT_WIRED sont **inchangées**, vérifié ci-dessous (mêmes 49
signalements, mêmes 71 exclusions). Aucun registre créé, aucune liste manuelle
nouvelle : les seuls signaux mécaniques utilisés sont `git log -S`, une relecture des
tests déjà présents, et `scripts/forge/declaration_watchlist.json` (fichier déjà
existant, déjà ratifié, lu en lecture seule).

## PHASE 1 — classification de statut (le seul ajout)

Pour chacun des 49 signalements, `classify_status()` produit :
`artifact / artifact_type / producer / consumer / declared_status / inferred_status /
confidence / action`.

**`declared_status`** — probité stricte : provient UNIQUEMENT de
`not_wired_self_declared` + `not_wired_evidence` déjà calculés par V02 (prose
NOT_WIRED/advisory/propose-only trouvée dans le docstring + 6 lignes de commentaire
au-dessus de la définition). Aucune inférence. Résultat : **3/49 `EXPERIMENT`
(déclaré), 46/49 `UNKNOWN`** — identique au chiffre V02 (6 %), confirmé, pas de
régression.

**`inferred_status`** — dérivé de signaux mécaniques nommés, jamais du texte :
- `prose_marker` (= `not_wired_self_declared`)
- `declaration_watchlist_mention` (nom du symbole cité dans
  `declaration_watchlist.json`)
- `exercised_by_test_only` (le symbole apparaît dans un fichier de test connu, hors
  toute consommation de production)
- `recent_last_touch<=14d` / `old_and_silent>60d` (via `git log -S<symbole> --
  <fichier>`, date du dernier commit qui touche sa ligne)
- `single_commit_introduction` (un seul commit a introduit ce nom dans ce fichier)

Règle (documentée, jamais assouplie pour gonfler un score) : `EXPERIMENT` si
marqueur prose OU watchlist OU (testé ET touché il y a ≤ 30 jours) ; `UNKNOWN` sinon
— **jamais `OPERATIONAL` ni `DEPRECATED` par cette version du classificateur**, voir
Limite 1 ci-dessous, c'est un choix délibéré de probité, pas un oubli.

**`confidence`** — barème compté, pas intuité : nombre de signaux concordants dans la
liste ci-dessus → 0 = `none`, 1 = `low`, 2 = `medium`, ≥3 = `high`.

Résultat global (49 signalements) : `declared_status` UNKNOWN 46 / EXPERIMENT 3 ;
`inferred_status` EXPERIMENT 37 / UNKNOWN 12 ; confidence high 28 / medium 15 / low 6.

## PHASE 2 — intention déjà présente

Chiffre reconfirmé à l'identique de V02 (détection inchangée) : **3/49 (6 %)**
portent une auto-déclaration en prose équivalente à NOT_WIRED
(`skipped_validation_status`, `propose_ledger_entry`, `propose_project_record`,
doctrine « propose-only » déjà ratifiée Pierre). 46/49 n'en portent aucune. Un
marqueur structuré resterait un vrai changement de pratique, pas une formalisation
d'un réflexe déjà là — conclusion V02 confirmée, pas de nouvelle mesure requise.

## PHASE 3 — calibration (bloquante) : **PASS, 4/4 + 4/4**

| symbole connu-orphelin | would_block | declared_status | inferred_status | confidence |
|---|---|---|---|---|
| `check_spawn_invariant` | **true** | UNKNOWN | UNKNOWN | low (`exercised_by_test_only`) |
| `checkSourceUrlStability` | **true** | UNKNOWN | UNKNOWN | low (`exercised_by_test_only`) |
| `run_divergence_oracle` | **true** | UNKNOWN | UNKNOWN | low (`exercised_by_test_only`) |
| `has_divergence_capacity` | **true** | UNKNOWN | UNKNOWN | low (`exercised_by_test_only`) |

Connus-consommés, aucun bloqué : `promote_manifest_lessons`,
`_promote_manifest_lessons_best_effort`, `checkFactConsistency`, `verify_envelope` →
`would_block: false` ×4, **0 faux positif de calibration**.

Aucune règle de détection ajustée pour faire passer un cas — V03 n'a touché à AUCUNE
règle de détection (import direct de V02).

**Fait notable, honnête à rapporter** : les 4 orphelins de calibration reçoivent
`declared_status: UNKNOWN` — pas `EXPERIMENT` — malgré le fait que 3 d'entre eux
soient documentés en prose humaine comme « advisory »/« non branchée » ailleurs dans
leur fichier (ex. `check_worldscan.mjs:44`, commentaire d'architecture au-dessus de la
CLI par défaut, PAS dans les 6 lignes immédiatement au-dessus de la définition ligne
401, ni dans son docstring). La fenêtre de lecture du marqueur (docstring + 6 lignes)
est **trop étroite** pour capter une déclaration d'intention qui vit ailleurs dans le
fichier — mesuré, pas supposé (cf. Cas difficile 4).

## PHASE 4 — échantillon ALÉATOIRE de 20

**Méthode déclarée, sans cherry-picking** : les 49 signalements triés par
`(fichier, nom)` (ordre déterministe), puis `random.seed(20260807)` (date de session,
choisie et déclarée avant tirage) + `random.sample(liste_triée, 20)`. Script exact
utilisé (reproductible) :

```python
import json, random
res = [r for r in sweep_worktree['results'] if r['would_block']]
res = sorted(res, key=lambda r: (r['file'], r['artifact']))
random.seed(20260807)
sample = random.sample(res, 20)
```

Chaque symbole vérifié À LA MAIN par lecture du code + recherche de ses appelants
réels (`grep` qualifié, pas une relance du détecteur) :

| # | symbole | fichier | verdict V02 | vérification manuelle | jugement |
|---|---|---|---|---|---|
| 1 | `check_spawn_invariant` | `audit.py:259` | true | appelé uniquement par `tests/test_spawn_authority_repair.py`, mentionné en docstring `driver.py:595` (pas un appel) | **VRAI POSITIF** |
| 2 | `rapportQualite` | `oracle_quality.mjs:338` | true | appelé uniquement par `oracle_quality.test.mjs` | **VRAI POSITIF** |
| 3 | `run_divergence_oracle` | `product_oracle_godot.py:453` | true | appelé uniquement par `tests/test_product_oracle_godot_divergence.py` (calibration) | **VRAI POSITIF** |
| 4 | `PROOF_STATES` | `search_usage.mjs:43` | true | importé/utilisé uniquement par `search_usage.test.mjs` | **VRAI POSITIF** |
| 5 | `checkSourceUrlStability` | `check_worldscan.mjs:401` | true | appelé uniquement par `check_worldscan.test.mjs` (calibration) | **VRAI POSITIF** |
| 6 | `findMutation` | `mutation_registry.mjs:58` | true | appelé uniquement par `mutation_registry.test.mjs` | **VRAI POSITIF** |
| 7 | `construirePromptReparation` | `repair_loop.mjs:270` | true | référencé comme `target` de données dans `mutation_registry.json` (pas un appel de code) + `repair_loop.test.mjs` | **VRAI POSITIF** |
| 8 | `_is_str` | `standard_oracles.py:70` | true | `grep -rn "_is_str\b"` sur tout `scripts/` → **une seule occurrence, sa propre définition** ; jamais appelée, même pas testée | **VRAI POSITIF** |
| 9 | `findByTarget` | `mutation_registry.mjs:143` | true | appelé uniquement par `mutation_registry.test.mjs` | **VRAI POSITIF** |
| 10 | `loadCheckpointList` | `wiremap_nav.mjs:325` | true | `grep` sur tout `scripts/` → aucune occurrence hors définition, **pas même un test** | **VRAI POSITIF** |
| 11 | `classify_sections` | `observer/prompt.py:442` | true | `grep` sur tout `scripts/` → aucune occurrence hors définition, **pas même un test** | **VRAI POSITIF** |
| 12 | `auditAgentFile` | `declaration_readers.mjs:205` | true | **appelé en réalité `declaration_readers.mjs:338`, même fichier** (`auditDeclaration`) — non vu par le détecteur | **FAUX POSITIF, cause identifiée : bug du scanner `.mjs`, cf. Cas difficile 1** |
| 13 | `collectDeclaredFields` | `declaration_readers.mjs:244` | true | **appelé en réalité `declaration_readers.mjs:358`, même fichier** — même bug | **FAUX POSITIF, même cause** |
| 14 | `collect` | `observer/adapters/transcripts.py:84` | true | consommé via `observer/cli.py:58` (`for module in load_adapters(): module.collect(ctx)`) — dispatch dynamique par liste, déjà documenté comme limite V02 | **FAUX POSITIF résiduel déjà connu, cause identifiée (V02)** |
| 15 | `propose_project_record` | `studio_link.py:739` | true | appelé uniquement par `tests/test_studio_link.py` ; **cité nommément** dans `declaration_watchlist.json:177` : « writer connu, aucun lecteur trouvé au 2026-07-20 » — auto-déclaration mécanique indépendante qui confirme le verdict | **VRAI POSITIF, confirmé par 2 sources indépendantes** |
| 16 | `read_lesson_history` | `learning_memory.py:415` | true | appelé uniquement par `tests/test_learning_memory.py` ; le module se cite lui-même en docstring (« reste lisible via `read_lesson_history` ») comme accesseur prévu, jamais branché ailleurs | **VRAI POSITIF** |
| 17 | `_internal_lesson_provenance` | `kb_proposal.py:271` | true | **fonction fantôme** : le champ réellement câblé au catalogue (`kb_proposal.py:328`) appelle `_provenance_internal_entry` (nom voisin, DIFFÉRENT) ; `_internal_lesson_provenance` sert le bloc `internal_lesson` du « Delta V2 », que le docstring voisin (`kb_proposal.py:303-310`) déclare explicitement **non reconnu par `kb-validate.mjs::BRICK_SPEC`** | **VRAI POSITIF, cas central — cf. Cas difficile 3** |
| 18 | `tool_names_used` | `tool_observability.py:292` | true | appelé uniquement par 2 fichiers de test | **VRAI POSITIF** |
| 19 | `skipped_validation_status` | `skipped_validation.py:59` | true | mentionné en commentaire `contract.py:86` (pas un appel), appelé par `tests/test_skipped_validation.py` ; porte la prose « advisory » auto-déclarée (déjà compté Phase 2) | **VRAI POSITIF, déclaré ET inféré EXPERIMENT concordants** |
| 20 | `collect` (méthode) | `observer/adapters/__init__.py:20` | true | signature d'un `typing.Protocol` (`class Adapter`), marquée `# pragma: no cover - contrat` — interface jamais censée être appelée par son nom nu, seules ses implémentations le sont | **VRAI POSITIF au sens strict (aucun appelant réel), mais famille distincte : stub d'interface, pas orphelin de production — cf. Limite 2** |

**RANDOM_SAMPLE : TRUE_POSITIVE 17 / FALSE_POSITIVE 3 / UNKNOWN 0 / PRECISION 17/20 =
85 %.**

Les 3 faux positifs ont chacun une cause mécanique **identifiée et vérifiée**, aucun
n'est un mystère : 2 viennent d'un **bug du scanner `.mjs`** découvert pendant cette
mission (cf. Cas difficile 1), 1 vient d'un pattern déjà documenté par V02 (dispatch
dynamique par liste de modules). Ce tirage étant aléatoire (méthode déclarée
ci-dessus), **ce ratio EST extrapolable** au périmètre `scripts/forge/**` +
`scripts/observer/**` dans les limites d'un échantillon de taille 20 (intervalle de
confiance large, non calculé ici faute de le demander la commande) — contrairement à
l'échantillon dirigé de V02 qui explicitement ne l'était pas.

## PHASE 5 — quatre cas difficiles

### 1. `declaration_readers.mjs` — le garde se classe-t-il lui-même correctement ?

**Non. Bug réel trouvé, documenté, non corrigé (V02 gelé).** `auditAgentFile` et
`collectDeclaredFields` sont bel et bien appelés dans leur propre fichier
(`auditDeclaration`, lignes 338 et 358) mais le scanner `.mjs` de V02
(`mjs_identifier_lines`) les rate. Cause exacte, vérifiée avec un test isolé sur le
fichier réel : la ligne 333 est un commentaire `//` qui mentionne un CHEMIN littéral
`.claude/agents/*.md` — cette sous-chaîne contient `/*`. Le détecteur de bloc-commentaire
teste `line.find("/*")` sur la ligne **brute, avant** le stripping des commentaires
`//` ; il ouvre donc un faux état "commentaire de bloc" à la ligne 333, qui ne se
referme (`*/` trouvé) qu'à la ligne 415 (fin d'un vrai JSDoc, 82 lignes plus loin) —
tout ce qui se trouve entre les deux (dont les appels réels à `auditAgentFile`,
`collectDeclaredFields`, `readersNamingField`) est traité comme invisible. **Réponse à
la question posée : le garde échoue précisément sur le fichier qui l'implémente, par
un bug de bas niveau indépendant de la classification de statut — Phase 1 ne peut
rien y faire, car `inferred_status` est calculé À PARTIR d'un `consumer_found`
faux.** `readersNamingField` (appelée ligne 361, dans la même zone aveugle) subit le
même sort. `auditDeclaration` elle-même n'est PAS affectée (son propre appel, ligne
420, est après la réouverture à 415) — c'est ce qui a permis de repérer l'incohérence :
3 fonctions consécutives du même fichier, 3 verdicts différents pour la même cause
structurelle, alors qu'elles sont toutes réellement câblées.

### 2. `runtime_inventory_oracle.py` — capacité réelle ou producteur sans consommateur ?

**Producteur sans consommateur, à la granularité du MODULE — invisible à l'analyse
par SYMBOLE.** Aucune de ses 9 fonctions publiques (`declared_runtimes`,
`observed_by_event`, `classify_file`, `observed_in_code`, `importers_of`,
`declared_at`, `compare`, `drift_records`, `emit_drift`) n'apparaît dans les 49
signalés — **mais pas parce qu'elles sont consommées de l'extérieur** : le détecteur
trouve des preuves `same_file` (elles s'appellent entre elles dans une chaîne interne
qui termine sur `main()`, exclu comme `cli_main_entrypoint`). `grep` sur tout
`scripts/` hors le fichier lui-même et son test : **zéro appel externe réel**. Le seul
lien externe trouvé est une mention en DOCSTRING dans
`observer/adapters/forge_evidence.py:354` (« Écrit par
`forge.runtime_inventory_oracle.emit_drift()` ») — un commentaire d'intention, pas un
`import`. **Limite mesurée du détecteur (V02 comme V03)** : une chaîne d'appels
`same_file` peut donner l'illusion d'un module « câblé » alors qu'aucun code externe
ne l'invoque jamais autrement que par sa propre CLI — le module entier est un
candidat orphelin que la granularité par symbole ne peut pas voir, parce que chaque
symbole pris isolément A un consommateur (son voisin dans le même fichier).

### 3. `kb_proposal.py` — pourquoi LA vague KB (2026-08-02/03) a-t-elle changé un comportement quand 11 autres corrections non ?

**Confirmé par le code, pas supposé.** `knowledge_base/kb-validate.mjs` porte une
règle **R3** qui EXISTE DEPUIS le 2026-07-13 (v3, commentaire ligne 40 :
« amendement R3… le code purement ORIGINAL… n'avait aucun chemin de provenance
valide ») et REJETTE déjà, mécaniquement, toute entrée de catalogue sans provenance
valide. La vague KB du 2026-08-02 (v4, ligne 50, « RATIFIE PIERRE ») n'a pas créé une
nouvelle autorité : elle a ajouté un chemin de PASS (`provenance_internal`) à une
porte qui REFUSAIT DÉJÀ tout le reste. `kb_proposal.py:286-338`
(`_lesson_to_pattern_entry`) le confirme dans son propre docstring : la fonction
appelle `_provenance_internal_entry` (ligne 244, câblée, testée) — PAS
`_internal_lesson_provenance` (ligne 271, celle du tirage aléatoire ci-dessus) qui
sert un « Delta V2 » explicitement non reconnu par `BRICK_SPEC`
(docstring : « ces deux champs ne sont PAS encore reconnus… ils n'ouvrent AUCUNE
nouvelle voie de PASS »). **Facteur différenciant confirmé : la KB s'est branchée sur
un validateur qui possédait déjà l'autorité de refuser (R3) ; les 11 autres
corrections historiques n'avaient, par construction, aucun refus préexistant sur
lequel s'appuyer — sans porte qui refuse déjà, une correction ne peut au mieux
qu'ajouter un champ que personne n'est structurellement obligé de lire.** Corollaire
pour le garde orphelin lui-même : tant qu'aucune porte n'échoue déjà sur son absence,
`ORPHAN_GATE_SIM` restera, comme les 11 corrections précédentes, un producteur de
mesure sans levier de changement de comportement — cf. DECISION.

### 4. `checkSourceUrlStability` — amorçage légitime ou dette ?

**Amorçage légitime, mais NON PROUVABLE par la fenêtre de lecture actuelle du
marqueur.** Le fichier contient bien la prose attendue — `check_worldscan.mjs:44`
(« verdict de la CLI par défaut… » = doc d'archi au-dessus de la CLI, pas de la
fonction), et surtout `check_worldscan.test.mjs:695` (« P5 (v0.4) :
checkSourceUrlStability — advisory multi-générations, non branchée ») et `:773`
(« checkSourceUrlStability n'est pas branchée sur checkWorldScan »culminant dans un
test d'intégration qui le vérifie explicitement). C'est une fonction **advisory,
testée, documentée comme volontairement non branchée sur le verdict CLI** — le
profil exact d'un amorçage assumé, pas d'une dette oubliée. Mais `declared_status`
reste `UNKNOWN` dans ce rapport (fenêtre docstring + 6 lignes trop étroite, la prose
vit dans le fichier `.test.mjs` voisin et dans un commentaire d'architecture éloigné
de 350+ lignes) — **preuve que le vide mesuré par V02 (Phase 2) est réel : même un
cas où l'intention est écrite noir sur blanc dans le dépôt peut rater le marqueur
structuré si celui-ci n'est pas positionné exactement au bon endroit.**

## PHASE 6 — autorité SIMULÉE (jamais appliquée)

Formule : `SI status==OPERATIONAL ET consumer absent ET commit_delta==nouveau ALORS
would_block=true`, calculée sans rien écrire ni bloquer.

| état | signalés bruts (cls path==OPERATIONAL, consumer absent) | dont `commit_delta==nouveau` |
|---|---|---|
| working tree courant | 49 | **9 apparents, 4 réels** |
| commit `04c14d9` (rejoué seul) | 2 | 2 (tout le diff d'un commit est « nouveau » par construction) |
| HEAD (= `04c14d9`, pas de commit ultérieur) | 45 | identique au cas `04c14d9` : 2 |

**Ce qui aurait été bloqué À TORT (mesuré, pas supposé) :** comparer `(artifact,
file:line)` entre le sweep HEAD (45 signalés) et le sweep worktree (49 signalés) fait
apparaître **9** couples « nouveaux », mais **5 sont un artefact du numéro de ligne** :
`_logic_files_from_wiremap_any`, `run` (driver.py), `status_from_passed`,
`verify_aggregate`, `verify_verdict` (verdict.py) sont le **même symbole
préexistant**, juste décalé de quelques lignes par une modification non liée plus
haut dans le fichier — comparer par `(nom, fichier)` sans la ligne les résout comme
non-nouveaux. **Une porte `commit_delta==nouveau` naïve (clé = nom+ligne) aurait donc
bloqué à tort 5 symboles pré-existants, non modifiés dans leur logique, sur ce seul
état du dépôt.** Les 4 couples réellement nouveaux
(`check_spawn_invariant`, `checkSourceUrlStability`, `has_divergence_capacity`,
`run_divergence_oracle`) sont exactement les 4 orphelins de calibration — c'est-à-dire
le travail non commité de Pierre lui-même, en cours de construction (nouveaux
fichiers de test `test_spawn_authority_repair.py`,
`test_product_oracle_godot_divergence.py`, `test_verdict_timestamp_repair.py` visibles
dans `git status`). Un WARN réel sur ces 4 aurait été **techniquement correct**
(vraies fonctions sans consommateur de production) mais **prématuré** — Pierre est en
train de les câbler, pas de les oublier ; un tel gate déclencherait sur du travail en
cours, avant même le premier commit.

## LIMITES DU PROTOTYPE V03 (mesurées)

1. **`inferred_status` ne peut jamais valoir `OPERATIONAL` ni `DEPRECATED`** dans
   cette version — choix délibéré (probité : pas de preuve mécanique suffisante pour
   ces deux verdicts sur le périmètre actuel), mais concrètement, les 3 faux positifs
   de la Phase 4 (`auditAgentFile`, `collectDeclaredFields`, `collect`/
   `transcripts.py`) SONT réellement `OPERATIONAL` — et la classification de statut,
   construite sur un `consumer_found` déjà faux en amont, hérite intégralement
   l'erreur : `auditAgentFile`/`collectDeclaredFields` reçoivent `inferred_status:
   EXPERIMENT, confidence: medium`, `collect`/`transcripts.py` reçoit
   `EXPERIMENT, confidence: high` — **une confiance « high » n'est PAS une garantie
   de justesse, seulement un accord entre signaux eux-mêmes dépendants d'un
   `consumer_found` en amont qui peut être faux.** Aucune Phase 1 ne peut réparer un
   faux négatif de détection ; elle ne fait qu'habiller le même faux positif d'un
   habillage plus convaincant.
2. **La famille « stub d'interface / `Protocol` »** (`Adapter.collect` dans
   `observer/adapters/__init__.py`, marqué `# pragma: no cover - contrat`) n'est PAS
   une catégorie d'exclusion existante (dunder / handler / test-support / mock /
   migration / cli_main_entrypoint) — c'est une 7e famille candidate, repérée dans
   l'échantillon aléatoire, **non ajoutée ici** (hors périmètre : la commande interdit
   toute modification de la logique de détection V02).
3. **Le bug du scanner `.mjs` (Cas difficile 1) n'a pas été corrigé** — `V01`/`V02`
   sont gelés par la commande. Il affecte potentiellement d'autres fichiers `.mjs` du
   dépôt qui commentent un chemin contenant `*` juste avant un vrai bloc JSDoc ;
   non recherché systématiquement (hors périmètre), signalé comme risque non quantifié
   au-delà des 2 cas trouvés dans l'échantillon.
4. **`commit_delta==nouveau` par clé `(nom, fichier:ligne)` est fragile au décalage de
   ligne** (Phase 6) — corrigible par une clé `(nom, fichier)` seule, mais cela
   perdrait la capacité de détecter un symbole renommé identique par coïncidence à un
   autre plus bas dans le même fichier ; compromis non tranché ici.
5. **`git log -S` mesure la présence textuelle du NOM**, pas du symbole au sens AST —
   un commentaire qui mentionne le nom sans le définir compterait dans l'historique
   au même titre qu'une vraie modification de la définition ; non observé comme
   faussant un résultat dans cette mission, mais non exclu par construction.
6. **`watchlist_mentions` est un simple test de sous-chaîne** dans
   `declaration_watchlist.json` — un nom de symbole court (< 4-5 caractères)
   pourrait matcher un autre mot par coïncidence ; aucun cas rencontré dans les 49
   (tous les noms de symboles signalés font ≥ 6 caractères), risque théorique non nul
   sur un futur sweep.

## Fichiers produits

- `orphan_gate_sim_v3.py` — le prototype (mode unique `sweep_worktree` + classification)
- `resultats_sweep_worktree_v3.json` — 1450 candidats, 49 signalés, 71 exclus (identique
  à V02), + bloc `status_classification` (49 entrées)
- `sweep_worktree_v3.err` — stderr (warnings de syntaxe préexistants dans le dépôt,
  sans rapport avec le détecteur)

## Rapport final

STATUS: DONE
VERSION: V0.3
FILES_CHANGED: aucun fichier existant modifié hors `lab/forge_evidence/ORPHAN_GATE_SIM_V03/**` (nouveau dossier)
FILES_NOT_CHANGED: scripts/forge/**, scripts/observer/**, .claude/hooks/**, games/**, tests/**, ORPHAN_GATE_SIM_V01/**, ORPHAN_GATE_SIM_V02/** (les deux baselines intactes, importées telles quelles)
CALIBRATION: (known_orphans_detected: 4/4 — check_spawn_invariant, checkSourceUrlStability, run_divergence_oracle, has_divergence_capacity / false_positive_count: 0 sur les 4 cas connus-consommés)
RANDOM_SAMPLE: (true_positive: 17 / false_positive: 3 / unknown: 0 / precision: 85% — échantillon aléatoire déclaré, seed 20260807, extrapolable dans les limites d'un n=20)
STATUS_CLASSIFICATION: (EXPERIMENT déclaré: 3/49 (6%) / EXPERIMENT inféré: 37/49 (76%) / UNKNOWN: reste — voir Phase 1 pour le détail des deux colonnes, elles ne mesurent pas la même chose et ne doivent pas être confondues)
NOT_WIRED_ANALYSIS: 3/49 auto-déclarations prose confirmées identiques à V02 (skipped_validation_status, propose_ledger_entry, propose_project_record) ; le vide (94%) est confirmé, pas comblé
FALSE_NEGATIVES: 0 mesuré sur l'échantillon aléatoire de 20 (contrairement à V02 dont l'échantillon était dirigé) ; non exhaustif au-delà de n=20
FALSE_POSITIVES: 3/20 sur l'échantillon aléatoire, toutes causes identifiées (2 = bug scanner .mjs nouvellement découvert, cf. Cas difficile 1 ; 1 = dispatch dynamique par liste, déjà connu V02) — extrapolable à ~15% sur le périmètre scripts/forge+observer dans les limites de n=20
RISKS: (1) bug scanner .mjs non corrigé, gèle 2 faux positifs et potentiellement d'autres non cherchés ; (2) inferred_status hérite silencieusement les faux négatifs de consumer_found, confidence "high" n'implique pas justesse ; (3) commit_delta==nouveau par clé ligne-incluse a produit 5 faux "nouveaux" sur 9 dans ce sweep précis ; (4) famille "Protocol stub" non exclue, 7e catégorie candidate non ajoutée (hors périmètre)
DECISION: (WARN_READY: NON / BLOCK_READY: NON)
NEXT: le garde distingue-t-il l'oubli de l'amorçage volontaire ? Réponse mesurée : PARTIELLEMENT ET AVEC UN COÛT DE FIABILITÉ IDENTIFIÉ. Sur les 49 signalements réels, seuls 3 portent un marqueur explicite (déclaré), et l'inférence mécanique (37 EXPERIMENT) est bâtie sur un consumer_found dont 3/20 de l'échantillon aléatoire prouvent qu'il peut être faux — donc la classification de statut ne peut PAS aujourd'hui servir de base à un WARN ou un BLOCK sans (a) corriger le bug du scanner .mjs trouvé ici (Cas 1), (b) traiter le pattern dispatch-par-liste comme un mécanisme de preuve valide (déjà demandé par V02), et (c) remplacer la clé ligne-incluse de commit_delta par une clé plus stable (Phase 6). Le Cas difficile 3 (kb_proposal) donne cependant une piste positive et actionnable pour une V04 : brancher la mesure sur une porte qui refuse DÉJÀ (comme R3 l'a fait pour la KB) plutôt que d'ajouter une nouvelle autorité — c'est le seul mécanisme, sur 12 tentatives historiques dans ce dépôt, qui ait changé un comportement.

software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
