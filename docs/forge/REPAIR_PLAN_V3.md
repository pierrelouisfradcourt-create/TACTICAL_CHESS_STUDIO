# REPAIR_PLAN_V3 — plan d'exécution des reconnexions Forge V3

*Date : 2026-08-07 · Auteur : session Opus (architecte d'exécution) · Statut : **PROPOSÉ, non ratifié**.*
*Source de vérité : FORGE V3 Architecture Decisions (D1-D4), faits mesurés F1-F10, post-mortem
`studio_brain/journal/2026-08-07_postmortem_pacman_forge.md`, revue `..._revue_finale_forge_v3.md`.*
*Règle appliquée : aucune capacité nouvelle tant qu'un consommateur existant n'est pas branché.*
*claim_verdict: NO_CLAIM_ALLOWED.*

---

## 0. État constaté avant travaux (vérifié, lecture seule)

| Point | État mesuré |
|---|---|
| `promote_manifest_lessons` | **existe et est branché** — `learning_memory.py:479`, appelé par `driver.py:339` via `_promote_manifest_lessons_best_effort` (`driver.py:426`) |
| Schéma lesson (`forge.lesson.v1`) | `caused_by, counter_examples, evidence_count, generation, lesson_id, schema, statement, status, supporting_runs, ts` — **aucun champ ne désigne un root_problem** |
| `root_problems.json` | 4 problèmes, chacun avec `lesson_ids: []` — **vides** (F4), champ producteur inexistant |
| `mutation_registry.json` | 25 entrées, champ `root_problem_id` **présent et rempli** — le lien mutation→problème existe déjà |
| `agent_factory.mjs` | entrée = `--mutation <id>` → `requeteDepuisMutation()` → `instancier()` → `execution_mode: PLAN_ONLY` ; `--execute` conditionné |
| `candidate_selector.mjs` | lit `root_problems.json` (`CHEMIN_PROBLEMES`, l.38) |
| `check_worldscan.mjs` | validateurs **de forme** exportés (`validateSource`, `validateLoops`, `validateObjective`, `validateManifest`, `isValidHttpUrl`) — aucun validateur de cohérence factuelle |
| LOT A / LOT C | livrés, 32 tests neufs verts, suite forge 1543 passed / 1 failed pré-existant — **non commités** |

## 1. BLOCAGE DE CONCEPTION (Phase 0) — à trancher avant Priorité 1

**Fait** : la chaîne `lesson → root_problem` n'a **aucun producteur**. Une leçon promue depuis un manifeste
ne porte pas, et ne peut pas déduire, l'identité du problème racine auquel elle se rattache : ni le
schéma `forge.lesson.v1`, ni le champ `reason` des manifests ne déclarent de `root_problem_id`.

**Inférence** : c'est le patron « validateur sans producteur » déjà ratifié (2026-07-30) — `lesson_ids`
est un champ *vérifié* que **personne n'écrit**. Le travail est en AMONT.

**Trois options, une seule conforme aux invariants :**

| Option | Nature | Conformité |
|---|---|---|
| A. Apparier leçon↔problème par similarité de texte (LLM ou heuristique) | inférence sur de la prose | **REFUSÉE** — viole INV-6 ; la mesure du 2026-08-04 donne Jaccard max 0,194 : la similarité de texte est inerte |
| B. Le contrat d'étape exige `reason.root_problem_id` déclaré par l'agent, parmi les ids de `root_problems.json` (liste fermée, validée mécaniquement) | déclaration structurée + oracle | **RETENUE** — INV-6 respecté, vérifiable, refus possible |
| C. Ratification humaine du rattachement | décision humaine | **RETENUE pour l'existant** (les 4 leçons pacman déjà promues, rétroactif) |

**Décision proposée : B pour le flux futur + C pour le stock existant.** Conséquence sur l'ordre :
la Priorité 1 commence par une modification de **contrat**, pas de code.

## 2. Ordre des changements (dépendances strictes)

```
P0  ratification LOT A/C + de ce plan            ← humain
 │
P1a contrat : reason.root_problem_id obligatoire  ← déclaration
P1b oracle  : check_lesson_routing (id ∈ liste fermée, sinon FAIL)
P1c pont    : promotion porte root_problem_id → écrit root_problems[].lesson_ids
P1d preuve  : chaîne complète défaut→cause→leçon→activation future
 │
P2  agent_factory branché (dépend de P1 : sans lesson_ids, la sélection n'a pas de matière)
 │
P3  verdict par lot        ← dépend d'une DÉCISION HUMAINE : définition du lot
 │
P4  Observer : SIGNED = HMAC vérifié + tamper-test   (indépendant, parallélisable)
P5  check_worldscan_fact_consistency                  (indépendant, parallélisable)
P6  oracle divergence produit                         (indépendant, parallélisable)
```

P4, P5, P6 sont **indépendants** de P1-P3 et peuvent être menés en parallèle.

## 3. Fiches par priorité

### P1 — Fermer la boucle d'apprentissage
- **Fichiers** : `scripts/forge/contracts/s9-build-godot-standard.yaml` (+ étapes concernées) ·
  `scripts/forge/static_oracles.py` (nouveau `check_lesson_routing`) · `scripts/forge/learning_memory.py`
  (`promote_manifest_lessons` : porter `root_problem_id`, écrire `root_problems[].lesson_ids`, idempotent) ·
  `scripts/forge/root_problems.json` (écriture des `lesson_ids` — **propose-only**, ratification Pierre).
- **Risque** : écriture dans un registre d'autorité ⇒ mode propose-only obligatoire (fichier `_PROPOSED`),
  jamais d'écriture directe · dilution du canal prémortem (plafond 5) à mesurer, pas à présumer.
- **Tests attendus** : id hors liste fermée ⇒ FAIL · promotion idempotente avec root_problem_id ·
  `root_problems.lesson_ids` rempli sans doublon · `premortem_lessons` restitue la leçon rattachée.
- **Preuve attendue** : une chaîne complète tracée sur un cas réel pacman —
  `défaut V6 (mode INERTE) → root_cause manifest → lesson_id → root_problem → prémortem du run suivant`.

### P2 — Brancher agent_factory (ne rien réécrire)
- **Fichiers** : point d'appel dans `scripts/forge/driver.py` (ou `dispatch.py`) vers la chaîne existante ;
  aucun fichier `.mjs` de la chaîne n'est modifié.
- **Risque** : brancher avant P1 produit des workers dérivés de problèmes vides ⇒ MISMATCH systématique
  et discrédit d'un composant sain. **Interdit d'exécuter P2 avant que P1 ait rempli au moins un `lesson_ids`.**
- **Preuve attendue** : un dispatch réel où `contract_sha256`, oracle, skills et outils proviennent de
  l'activation générée, et `execution_proof` rend **MATCH**.

### P3 — Verdict par lot
- **Bloqué par décision humaine** : définition du lot. Proposition : *un lot s'ouvre au premier dispatch
  suivant un verdict signé ; l'oracle tourne à la clôture ; le verdict est produit avant tout nouveau dispatch* (INV-5).
- **Fichiers** : `scripts/forge/verdict.py` (déjà horodaté par LOT A), `driver.py` (cycle de lot).
- **Preuve** : un lot de correction type v4 produit un verdict signé, horodaté, vérifié par `verify_run`.

### P4 — Observer durci (INV-2)
- **Fichiers** : `scripts/observer/adapters/*.py` (vérification HMAC en lecture seule, réutiliser la
  logique de `forge.verify_run` sans dupliquer la règle).
- **Critère** : ≥2/3 lignes forgées détectées, **0 faux positif** sur le corpus authentique pacman.
- **Risque** : accès à la clé en lecture ; un faux positif dégraderait la confiance dans le contre-pouvoir.

### P5 — `check_worldscan_fact_consistency`
- **Fichiers** : `scripts/forge/check_worldscan.mjs` (nouveau validateur exporté, appelé par le même CLI).
- **Doit détecter, sur les artefacts déjà gelés** : contradiction `has_win_state` (gen1 false vs gen2/3 true),
  URL instable pour une même source revendiquée, affirmation non supportée par une source citée.
- **Garde-fou** : l'oracle doit **accepter la référence Claude connue-bonne** et **refuser gen1 Qwen**.
  S'il ne sait pas les séparer, il se mesure lui-même ⇒ abandon.

### P6 — Oracle divergence produit (INV-4)
- **Fichiers** : `scripts/forge/product_oracle_godot.py` (généralisation du test différentiel de V6).
- **Rejeu obligatoire sur artefact gelé** : doit détecter le mode INERTE historique de V2 **et** accepter V5.
- **Risque** : faux positifs sur des paramètres à effet légitimement indirect ⇒ calibrer sur V5 avant d'armer.

## 4. Garde-fous transverses (tous lots)

- Aucun commit sans `git status` + `git diff` + `git diff --cached` relus ; **commit ciblé fichier par fichier**.
- **Jamais** dans un commit de ce chantier : les 75 fichiers Asset Library, `lab/forge_evidence/MCTS_*`,
  `lab/reports/observer/*` régénérés, `.playwright-mcp/`.
- Zone protégée `tests/` intacte ; le test `test_standard_step_wiring` en échec est **pré-existant** (chip ouverte).
- Écritures durables (`lessons.jsonl`, `root_problems.json`, ledger) = **propose-only**, ratifiées par Pierre.
- Qwen : jamais sollicité pour audit/causalité/architecture ; uniquement extraction/tri/normalisation
  sous entrée structurée + schéma strict + juge mécanique.

## 4 bis. PHASE 0 BIS — mini-plan fichier/fonction (P1)

**Découverte d'ancrage** : `reason` est un **paramètre de la porte** — `dispatch.prepare_dispatch(reason: str|dict = "")`
(`dispatch.py:324`), écrit par l'**appelant du dispatch**, jamais par l'agent. Clés observées :
`action, expected_proof, oracle, problem, root_cause`. Le producteur du rattachement est donc
l'appelant de la porte, et **la porte est le point d'enforcement** — cohérent avec INV-7.

| # | Fichier | Fonction | Contrat modifié | Producteur ajouté | Consommateur existant | Oracle | Preuve attendue |
|---|---|---|---|---|---|---|---|
| P1a | `scripts/forge/dispatch.py` | `prepare_dispatch` | `reason` accepte `root_problem_id` ; **obligatoire si `reason.root_cause` est présent** (dispatch correctif) | l'appelant de la porte déclare l'id | manifeste `kind: dispatch` (déjà écrit) | refus de dispatch si id absent ou hors liste fermée de `root_problems.json` | un dispatch correctif sans id est REFUSÉ ; avec id valide, il passe et l'id apparaît dans le manifeste |
| P1b | `scripts/forge/static_oracles.py` | `check_lesson_routing` (nouveau) | — | — | driver / gate | id ∈ liste fermée `root_problems[].id` · cohérence `lesson.root_problem_id` ↔ `root_problem.lesson_ids` | id inconnu ⇒ FAIL ; corpus cohérent ⇒ OK |
| P1c | `scripts/forge/learning_memory.py` | `promote_manifest_lessons` | champ additif `root_problem_id` sur `forge.lesson.v1` | promotion porte l'id venu du manifeste | `premortem_lessons` (existant) | idempotence + id conservé | leçon promue portant l'id ; `root_problems_PROPOSED.json` mis à jour, **jamais** le registre en place |
| P1d | — | — | — | — | — | — | chaîne complète tracée : `défaut V6 (mode INERTE) → root_cause → lesson_id → root_problem → prémortem du run suivant` |

**Interdits explicites P1** : aucune inférence NLP, aucune similarité de texte, aucune génération
automatique non vérifiée, aucune écriture directe dans `root_problems.json` (propose-only).

**Rétroactif Pac-Man** : `lab/forge_evidence/LESSON_ROUTING_V1/PROPOSED_MAPPING.json` —
`lesson_id · root_problem_id proposé · justification · confiance · statut HUMAN_REVIEW_REQUIRED`.
Valeur `AUCUN — nouveau root_problem nécessaire` **autorisée et attendue** : les 4 problèmes racines
existants (`ORACLE_FALSE_NEGATIVE`, `DEFECT_DISPLACEMENT`, `PROMPT_FIELD_OMISSION`,
`REPAIR_NON_CONVERGENCE`) décrivent le **processus** de la Forge ; aucun ne couvre une classe de
défaut **produit**. Ne pas forcer un rattachement pour remplir le champ.

## 4 ter. CONTRÔLE D'HÉRITAGE D'AUTORITÉ (campagne 2026-08-09)

*Ajouté après l'incident de délégation du 2026-08-09. Contient trois corrections de
spécification : ce qui était écrit ici avant était faux sur deux points, et incomplet sur un
troisième. Les corrections sont conservées avec leur preuve — c'est la règle du studio.*

### Doctrine ratifiée (Pierre, 2026-08-09)
```
effective_authority(agent) = capabilities(type) ∩ permissions(control-plane)
délégation valide  ⟺  effective_authority(child) ⊆ effective_authority(parent)
```
**Le `subagent_type` EST le vocabulaire d'autorité.** Une mission ne se restreint jamais par
prose : pour une mission plus restrictive, l'orchestrateur choisit un type dont l'autorité
correspond réellement (mesure-only ⇒ `Explore`, qui n'a ni `Agent` ni `Write`/`Edit`).

### CORRECTION 1 — la résolution du parent ne passe PAS par `tool_use_id`
**Ce que la conception initiale disait (FAUX)** : « `PreToolUse` reçoit `tool_use_id`, donc le
parent est résoluble en corrélant cet identifiant dans le transcript. »
**Mesuré** : `tool_use_id` identifie **l'enfant à naître** — c'est la valeur qui sera écrite dans
le `toolUseId` du sidecar de l'enfant. Preuve : `toolu_01Vvx4D3qmLim7S28D1nNvb5` (toolUseId de
`agent-aa2c149e72c426f20`) n'apparaît que dans `agent-a8fc257f85f4ca9bd.jsonl`, le transcript de
son parent.
**Vrai porteur d'identité du parent** : `transcript_path` du payload — il EST le transcript de
l'appelant. Résolution O(1), session courante, aucun index global (index projet mesuré : 1460 ms).
`tool_use_id` est conservé en corroboration *advisory* : ne refuse jamais, n'autorise jamais.

### CORRECTION 2 — `.meta.json` porte `parentAgentId`
La spécification listait `{agentType, description, toolUseId, spawnDepth, model}`. Le champ
`parentAgentId` **existe**, dès `spawnDepth >= 2` — invisible dans mes premières mesures parce que
mes agents étaient presque tous à profondeur 1. C'est lui qui permet la vérification d'intégrité
de chaîne (remontée bornée, cycle/profondeur incohérente ⇒ AMBIGUOUS ⇒ DENY).

### CORRECTION 3 — le coût réel du hook est ~80 ms, pas 1–7 ms
`1–7 ms` = coût de **l'algorithme de résolution de lignée** seul (mesure du 2026-08-09).
`~80 ms` = coût **du hook complet en production**, amorçage de l'interpréteur Python compris —
mesuré sur 33 spawns réels : min 76 · médiane 80 · max 87 ms.
**Référence de performance à citer : 80 ms.** Le 1–7 ms ne doit plus être présenté comme le coût
du hook.

### LIMITE À NE JAMAIS OUBLIER — le garde n'aurait PAS empêché l'incident du 2026-08-09
L'incident : un agent `general-purpose` (mission « mesure only », écrite **en prose**) a délégué à
un enfant `general-purpose` qui a lancé un run de production réel.
Rejoué en `observe` sur les 33 spawns réels de la session : **ce spawn précis sort en `ALLOW`
(SUBSET)** — et c'est CORRECT, l'autorité de l'enfant était **égale**, pas supérieure.
**Le garde interdit l'ÉLARGISSEMENT d'autorité ; il ne corrige pas un mauvais choix d'autorité
initiale.** Ce qui aurait empêché l'incident, c'est le lancement du parent en `Explore` —
c'est-à-dire la DOCTRINE, pas le garde. Ne jamais présenter ce garde comme une protection contre
les délégations abusives en général.

### État des surfaces (mesuré, 2026-08-09)
| surface | statut |
|---|---|
| capabilities custom (`disallowedTools`) | TESTED — 15/17 déclarent ; sans `description` ⇒ non enregistré ⇒ UNKNOWN ⇒ DENY |
| capabilities builtin (allowlist versionnée) | TESTED — auto-limitante : type inconnu ⇒ DENY |
| permissions control-plane | TESTED (deny globaux) · **NOT_FOUND** (aucune permission scopée par agent n'existe) |
| résolution de lignée | TESTED — `transcript_path`, intégrité par `parentAgentId` |
| héritage d'autorité | TESTED — A/B/C/D/J prouvés sur transcripts réels |
| enforcement `Task` | TESTED, **NON ARMÉ** (témoin absent) · observe : 33/33 ALLOW, 0 faux positif, 0 UNKNOWN |
| enforcement `Agent` | **BLOCKED** — le hook traite `Agent`, `settings.json` ne route que `Task` ; router exige d'éditer un fichier que ses propres `permissions.deny` interdisent. **Ne pas contourner** : qu'un contrôle-plane protège sa configuration est la propriété à préserver |
| `Python → claude_executor` | **NOT_OBSERVABLE** — aucun événement `PreToolUse` n'est émis ; ni couvert ni couvrable. Ne jamais déclarer la Forge « protégée contre la délégation » |
| `SubagentStart` | **PASSIVE** — mesuré : son `exit 2` est IGNORÉ, le spawn se poursuit |

### CORRECTION 4 — le contrôle-plane résiste à une autorisation conversationnelle
Tentative mesurée : éditer `.claude/settings.json` avec une gate humaine donnée en conversation.
Résultat : `Edit` **refusé** — « File is in a directory that is denied by your permission settings ».
Le `deny` est **auto-verrouillant** (lever le deny exigerait d'éditer le fichier que le deny
protège) et il ne cède pas à une autorisation verbale. Un contournement par `Bash` existe (le deny
porte sur les outils `Write`/`Edit`, pas sur un `python -c`) — **non emprunté, déclaré**. Le routage
`Agent` a donc été inséré par Pierre lui-même. **Qu'un contrôle-plane protège sa propre
configuration est la propriété à préserver, pas l'obstacle à lever.**

### CHANGEMENT DE PORTÉE ASSUMÉ — les spawns non-Forge sont désormais soumis à l'héritage
La couche 1 est fail-**open** hors périmètre Forge (« le hook ne gêne jamais les usages non-Forge »).
La couche 2 est fail-**closed** et s'applique à TOUT spawn `Task`/`Agent`, Forge ou non : l'autorité
d'un enfant ne peut dépasser celle de son parent, et cette règle n'est pas propre à la Forge.
**Le fail-open historique sur cette surface disparaît. C'est intentionnel** (décision Pierre
2026-08-09) et testé, pas un effet de bord.

### LE DÉFAUT QUE SEUL L'ARMEMENT POUVAIT RÉVÉLER (2026-08-09)
Armer le témoin a fait échouer 3 tests. Cause instruite : les fixtures de
`test_spawn_authority_repair.py` (écrites le matin même, LOT A) envoyaient un payload à **deux
champs** (`tool_name`, `tool_input.prompt`) — **une entrée qui n'existe pas en production**. Le
payload réel en porte dix, dont `transcript_path` dont la couche 2 a besoin ; son absence donnait
`PARENT_NOT_FOUND ⇒ DENY`.
**Le défaut était dans la fixture, pas dans le hook.** Correctif (gate Pierre) : enrichir le
constructeur de payload — aucune assertion, aucun import, aucun site d'appel modifié. Contrôle de
non-affaiblissement : avec le MÊME payload enrichi, `Explore → general-purpose` sort toujours
`AUTHORITY_ESCALATION ⇒ DENY`.
**Leçon à conserver : un test qui construit lui-même son entrée peut mesurer une fiction pendant
des mois sans que rien ne le signale.** Aucun test unitaire de couche isolée ne pouvait révéler ce
défaut — seul l'armement réel l'a fait.

### VALIDATION MÉCANIQUE FINALE (2026-08-09)
| mesure | résultat |
|---|---|
| suite complète, témoin ABSENT | **1648 passed** · 1 skipped · 1 échec PRÉ-EXISTANT (`test_standard_step_wiring`) |
| suite complète, `enforce` ARMÉ | **1647 passed** · 1 skipped · 2 échecs : le pré-existant + `test_temoin_absent_du_depot` (invariant qui EXIGE un dépôt sans témoin — il échoue parce qu'on a armé, c'est son rôle) |
| après désarmement | 63/63 verts sur les deux fichiers concernés — l'invariant repasse |
| matrice `Task` × `Agent`, payload réel (10 champs) | **14/14 conformes**, parité stricte entre les deux surfaces |
| coût du hook complet | **médiane 85 ms** (min 83 · max 89) — référence à citer, jamais les 1–7 ms de l'algorithme seul |
| `workflow-subagent` | `CHILD_AUTHORITY_UNKNOWN ⇒ DENY`, **sans exception ajoutée** |

**Le témoin n'est PAS commité** : `test_temoin_absent_du_depot` l'interdit explicitement. L'état
commité du hook est donc byte-for-byte l'ancien comportement tant que Pierre n'arme pas.

## 5. Définition de fin (rappel)

LOT A/C consommés · leçons persistantes et rattachées · agent_factory branché sur activation réelle ·
verdict par lot opérationnel · SIGNED réellement vérifié · WorldScan doté d'un juge factuel ·
divergence produit mesurable · aucune boucle critique ne produit sans consommateur.
