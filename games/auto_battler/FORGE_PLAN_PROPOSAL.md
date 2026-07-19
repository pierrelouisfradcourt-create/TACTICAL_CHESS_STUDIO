# FORGE PLAN PROPOSAL — Auto Battler × machinerie Forge

**Date** : 2026-07-18
**Statut** : **PROPOSED — ratification Pierre requise avant tout dispatch.** Aucun agent lancé, aucun contrat déposé dans `scripts/forge/contracts/`, aucune entrée `oracles.json` créée. Ce document est une proposition de mapping, pas une action.
**Source** : lecture seule de la machinerie (`scripts/forge/{dispatch,contract,oracle,gate,verdict,static_oracles}.py`, `scripts/forge/contracts/SCHEMA.md` + `s0-contrat.yaml` + `s9-build.yaml` + `roles.yaml` + `PLAYABLE_CONTRACT.md`, `scripts/forge/oracles.json`, `.claude/skills/forge/skill.md`, `lab/forge_runs/shmup_slice/state.json`) et des bibles (`games/auto_battler/bibles/02_CORE_RULES.md`, `04_COMBAT_BIBLE.md`).
**Doctrine** : ADR-002 — aucun sous-agent sans contrat validé par `forge.dispatch.prepare_dispatch` ; oracles déterministes non-LLM ; verdict signé HMAC ; HumanGate décide. `claim_verdict: NO_CLAIM_ALLOWED`.

---

## 1. État de la machinerie (constaté, pas supposé)

### 1.1 Contrats et schéma

- **Schéma canonique** : `scripts/forge/contracts/SCHEMA.md`. Le titre du document dit « 16 champs · 10 catégories » mais la table liste **17 champs** (la catégorie 2 est scindée 2a/2b) — et c'est bien **17 champs qui sont appliqués mécaniquement** par `scripts/forge/contract.py` : `CRITICAL` = 14 champs (role, capability_role, exigences_cognitives, memoire, mandatory_read, objectif, in_scope, out_of_scope, permissions, gardeFou, success_criteria, tests_oracles, final_report, output_contract), `IMPORTANT` = 2 (skill, plugin), `RECOMMENDED` = 1 (delegation_context). Trois états par champ : `filled` / `declared_empty` (« aucun ») / `absent` ; un Critique non rempli, ou un optionnel absent → `ContractIncomplete`, dispatch refusé.
- **Contrats existants** : 13 étapes contractualisées (`s0-contrat`, `s1-prisme`, `s2-worldscan`, `s3-decompo`, `s4-archi`, `s5-wiremap`, `s6-redteam-plan`, `s9-build`, `s10a/b/c-oracle-*`, `s11-redteam-code`, `s12-verdict`) + `s2.5-artbible` (profil dédié) + `redteam-artdirector`. Les contrats sont **génériques par étape** — la spécificité projet entre par le charter (s0), le blueprint (s4) et la WireMap (s5), pas par des contrats par projet.
- **Résolution du runtime** : jamais de modèle en dur — `capability_role` résolu par `roles.yaml` (contract_author/prisme/decompose/architect/wiremap/redteam_code → Opus ; builder/worldscan → Haiku, escaladable haiku→sonnet→opus via `escalate.py` ; redteam_reviewer → Qwen ; deterministic → non-LLM).

### 1.2 La porte (`dispatch.py`)

`prepare_dispatch(etape, run_id)` : charge le contrat YAML → `validate_contract` (refus si incomplet) → registry force le modèle → fabrique le payload borné (prompt assemblé role/objectif/frontières/gardeFou/oracles + RÈGLE DE RESTITUTION injectée verbatim, `allowed_tools` = seuls skill/plugin déclarés) → **append un enregistrement d'audit signé HMAC** dans `lab/forge_evidence/dispatch_audit.jsonl`. Elle ne spawn rien : l'orchestrateur (Fable, skill `/forge`) spawn avec le payload + marqueur `FORGE_DISPATCH:<etape>:<run_id>` (hook `pretool_forge_guard` fail-closed).

**Profils** (`PROFILES`) : `full` (13 étapes), `patch` (s9 → s10a → s11 → s12 ; archi/wiremap émis `SKIPPED` signés), `review` (s6 seul), `micro` (s9 → s10a → s12), `artbible` (s2.5 seul).

### 1.3 Oracles disponibles (tous déterministes, non-LLM)

| Oracle | Où | Ce qu'il prouve |
|---|---|---|
| **Oracle code par projet** | `oracle.py` + `oracles.json` (commande + cwd, timeout 300 s, évidence log) ; `gate.py` en fait un verdict signé | La suite du projet passe (`node run-oracle.mjs`, `node --test`, pytest, cargo…) — exit 0/≠0 |
| **Solvabilité** (obligatoire pour un JEU) | `solvability.mjs` du jeu, câblé dans `run-oracle.mjs` ; gabarit `scripts/forge/templates/solvability.template.mjs` | Un bot déterministe joue l'API publique et **GAGNE** ; mesure l'enveloppe d'action réelle |
| **e2e** (obligatoire pour un JEU) | `e2e.mjs` Playwright + garde structurelle `static_oracles.check_e2e_harness` (rejette absent/non câblé/coquille) ; conventions `PLAYABLE_CONTRACT.md` (`window.__game`, `__game_debug`, `#overlay`, `#restart`) | Click-through navigateur réel |
| **Mutation gate** | `mutation.py` (`run_mutation_test`) + `check_mutation_gate` : « 100 % tués OU survivant trié justifié dans `mutation_triage.json` » ; survivant trié ⇒ jamais un OK propre (WITH_OBJECTION) | Les tests attrapent réellement des bugs |
| **Archi (s10b)** | `static_oracles.check_architecture` — imports réels (AST Python, regex .rs/.ts/.js/.mjs/.gd) vs `deps_interdites` du blueprint | Séparation de modules respectée |
| **WireMap (s10c)** | `static_oracles.check_wiremap` — chaque feature pointe une fonction qui existe ; + **gel du jeu de règles** (`wiremap_frozen.json` posé à s5, `check_feature_set_frozen`) : règle ajoutée/supprimée = STOP dur, fonction renommée = auto-correction bornée | Isomorphisme carte ↔ code, jeu de règles immuable pendant le run |

### 1.4 Verdict signé

`verdict.py` : chaque oracle émet un **reçu signé** (`OracleReceipt` : oracle_id, run_id, status OK/FAIL/BLOCKED/SKIPPED, `evidence_sha256` **re-lu** à la vérification, evidence_path). `build_aggregate_verdict` **re-vérifie** chaque reçu (signature + run_id concordant + scellé d'évidence) — provenance rompue ⇒ `software_verdict: BLOCKED`. `software_verdict` vient UNIQUEMENT des reçus vérifiés ; red-team = advisory (`humangate_flags`, jamais juge). `decision` ∈ {HUMANGATE_READY, HUMANGATE_READY_WITH_OBJECTION, BLOCKED} ; le seul prédicat de passage propre est `is_clean_pass()` (égalité stricte). HMAC via `.forge_key` ; re-vérification mécanique par `python -m forge.verify_run <verdict.json>` (exit 0/2). Anti-rejeu : git_head + nonce.

### 1.5 Anatomie d'un run réel (`lab/forge_runs/shmup_slice/state.json`)

`run_id` (`shmup_slice-20260714a`), `profile: full`, `is_game: true`, `steps` s0→s12 avec attempts/artifact_sha256/coût/modèle réel/reviewer réel, escalades tracées (2, override opus), mutation 111/112 avec 1 survivant trié (`mutation_exception` → décision `HUMANGATE_READY_WITH_OBJECTION`). Coût observé du run full : ≈ 13 $ et 6 attempts sur s9. C'est la forme que prendront les runs auto_battler.

---

## 2. Mapping proposé — 4 incréments forgés

Principe : **un incrément = un run Forge complet** (run_id propre, verdict signé propre, gate Pierre entre chaque incrément). Le code vit dans `games/auto_battler/` (à côté de `bibles/`, qui reste lecture seule pour tout builder). Stack proposée : **Node ES modules (.mjs), moteur headless** — c'est la seule stack où TOUTE la chaîne d'oracles (run-oracle, node --test, mutation, solvabilité, e2e, property-based) est déjà prouvée en vivo (shmup_slice, collect_runner, kb_tactics).

| Incrément | Contenu | Invariants-oracles | Profil proposé | `is_game` |
|---|---|---|---|---|
| **1 — engine-core** | GameState sérialisable (`rng_state` inclus), liste close d'Inputs (rejet hors liste/hors état), journal d'Inputs + replay bit-à-bit, Event Log à registre fermé (19 Events, fail-hard), squelette de boucle de Round | INV-1, 2, 3, 4, 12, 13, 19(2) ; INV-5 préparé par le blueprint (module renderer absent du core) | `full` (greenfield) | **false** (moteur headless — voir Risque R3) |
| **2 — preparation + economy** | Preparation State (fenêtre unique, `ConfirmPreparation`), Buy/Sell/Reroll/Lock/LevelUp/Place, Merge automatique (MergeTriggered/MergeResolved), Pool, Shop, Income | INV-7, 8, 11, 14, 15, 16 ; ECO-1..8 (Economy Bible) ; DEC-n (ordres totaux Seats/Income) | `increment` (à créer — R1) sinon `patch` avec SKIPPED assumés | false |
| **3 — combat** | TickPipeline C1–C3 + T1–T10, TieBreakChain appliquée, Mana/Cast, `tick_limit` + DP-7, `CombatResult`, GhostBoard | CBT-1..9 ; INV-6, 9, 10, 17, 18 ; DEC-1..5 | `increment` | false, **mais solvabilité activée** : un match complet bots-vs-bots se termine par Victory, et un bot scripté GAGNE (l'oracle-solvabilité prend ici son vrai sens) |
| **4 — renderer + slice jouable** | Lecteur d'Event Log pur (INV-5 : n'importe jamais le GameState — `deps_interdites` du blueprint), UI conforme `PLAYABLE_CONTRACT.md`, serveur, slice jouable vs Bots | INV-5 ; e2e click-through ; solvabilité joueur | `increment` | **true** (e2e + solvabilité + mutation exigés par la garde) |

Ce découpage suit ce que la machinerie **sait réellement faire** : chaque incrément a un oracle-code vert exécutable seul (`node run-oracle.mjs` cumulative — les fixtures des incréments précédents restent dans la suite et deviennent le harnais de non-régression), archi/wiremap re-prouvés à chaque run, mutation gate dès l'incrément 1 (proposé volontairement même en non-jeu : outillage prouvé, coût faible).

Entrée `oracles.json` à créer (une ligne, gate Pierre) : `"auto_battler": {"cwd": "games/auto_battler", "command": ["node", "run-oracle.mjs"]}`.

---

## 3. Draft de contrat — incrément 1 « engine-core »

**Statut : PROPOSED — ratifié par Pierre avant tout dispatch.** Note d'architecture honnête : la machinerie charge des contrats **génériques par étape** (`load_contract("s9-build")`) ; la voie minimale est de passer ces spécificités par le **charter s0 + blueprint + WireMap** du run `auto_battler-i1`, sans créer de contrat par projet. Le draft ci-dessous est donc soit (a) le contenu que le charter/le dispatch devront porter, soit (b) un contrat dédié si Pierre décide d'en créer un — les 17 champs au format exact de `SCHEMA.md` / `contract.py` :

```yaml
# Contrat d'agent Forge — s9-build, spécialisé incrément 1 « engine-core » auto_battler
# Schéma : scripts/forge/contracts/SCHEMA.md (17 champs)
# STATUT : PROPOSED — ratification Pierre requise avant tout dispatch (ADR-002).

# --- 1. Identité / posture cognitive (Critique) ---
role: >-
  Builder moteur (incrément 1 engine-core auto_battler). Point de vue imposé :
  développeur de simulation déterministe qui traite chaque invariant de bible
  comme un contrat exécutable, jamais comme une intention.
capability_role: builder
exigences_cognitives: >-
  Rigueur d'invariants : pureté fonctionnelle, sérialisation canonique,
  fail-hard sur tout écart de registre. Discipline de périmètre : moteur
  headless UNIQUEMENT, aucune valeur TBD inventée.

# --- 2. Contexte projet (Critique) ---
memoire: >-
  Le corpus de bibles games/auto_battler/bibles/ est la source de vérité du
  design (statut ratifié HumanGate 2026-07-18). Conventions studio : CLAUDE.md
  + rules/. Le blueprint (s4) fixe l'ownership ; la WireMap (s5) est tenue à
  jour. Toute valeur marquée TBD dans les bibles est HORS de portée du builder.
mandatory_read:
  - scripts/forge/contracts/SCHEMA.md
  - games/auto_battler/bibles/02_CORE_RULES.md
  - games/auto_battler/bibles/00_VOCABULARY.md
  - "le blueprint.yaml du run auto_battler-i1 (ownership, deps_interdites)"
  - "la WireMap du run auto_battler-i1 (features INV-n -> fonctions -> preuves)"

# --- 3. Mission (Critique) ---
objectif: >-
  Produire le noyau moteur pur : GameState sérialisable avec rng_state (INV-2),
  fonction de transition pure Etat+Inputs->Etat (INV-1/INV-3), liste close des
  7 Inputs avec rejet hors liste et hors Preparation State (INV-13), journal
  d'Inputs + replay bit-a-bit (INV-4), Event Log au registre ferme de 19 noms
  avec echec fail-hard hors registre (INV-12), squelette de boucle de Round
  (Flux ratifie). SEARCH knowledge_base/search.mjs avant toute piece de logique
  reutilisable ; importer ce qui matche, n'ecrire que le delta.

# --- 4. Frontières (Critique) ---
in_scope: >-
  games/auto_battler/engine/** (logique moteur), games/auto_battler/*.test.mjs,
  games/auto_battler/run-oracle.mjs, mise a jour des colonnes de la WireMap.
out_of_scope: >-
  Aucun rendu ni DOM (increment 4 ; INV-5). Aucune resolution de Combat
  (increment 3). Aucune valeur d'economie chiffree (increment 2). Ne touche
  jamais games/auto_battler/bibles/** (lecture seule), tests/** (zone protegee),
  scripts/forge/**, .claude/**. Ne modifie pas le blueprint ni les deps.

# --- 5. Autorisation (Critique) ---
permissions: >-
  read: repo entier. write: games/auto_battler/** SAUF bibles/ + la WireMap du
  run. run: node run-oracle.mjs et node --test dans games/auto_battler.
  create: fichiers de l'ownership uniquement. delete: aucun. INTERDIT: tests/**,
  bibles/**, scripts/**, tout git commit/push.

# --- 6. Gouvernance (Critique) ---
gardeFou: >-
  Aucune valeur TBD des bibles inventee (Life initiale, tick_limit, dimensions
  Board...) : TBD rencontre => fog HumanGate, jamais une constante posee.
  Aucun Date.now/performance.now/Math.random/setTimeout dans le moteur : seul
  rng_state du GameState (INV-2, INV-19). Aucun nom d'Event hors registre,
  aucun Input hors liste : fail-hard, pas un avertissement. Vocabulaire strict
  de 00_VOCABULARY.md.

# --- 7. Validation & auditabilité (Critique) ---
success_criteria: >-
  Oracle code vert (run-oracle.mjs exit 0) couvrant les hooks de bible INV-1,
  2, 3, 4, 12, 13 et 19(2) ; gate mutation ferme (100% ou survivant trie
  justifie) ; check_architecture vert (aucune dep interdite du blueprint) ;
  check_wiremap vert (chaque feature INV-n pointe une fonction existante avec
  preuve). Aucun fichier hors ownership modifie.
tests_oracles: >-
  Oracle CODE deterministe non-LLM : node run-oracle.mjs (node --test), avec
  (1) fixtures replay bit-a-bit — double execution meme GameState + memes
  Inputs => etats et Event Log strictement identiques (INV-1/3/4) ;
  (2) fixture serialisation/restauration en cours de Match avec rng_state,
  continuation identique au run ininterrompu (INV-2) ; (3) fixtures de rejet
  Input hors liste (dont un Input "Merge" joueur) et hors etat (INV-13) ;
  (4) validation de schema de l'Event Log, nom hors registre => echec fail-hard
  (INV-12) ; (5) scan statique in-suite des sources du moteur : zero
  Date.now/Math.random/timer/acces DOM (INV-19(2), INV-3) ; (6) property-based
  seedes sur les invariants (pattern properties.test.mjs). Puis gate mutation
  (forge.mutation) sur les fichiers logiques de la WireMap. Puis s10b
  check_architecture et s10c check_wiremap. Jamais de LLM-as-judge. Limite
  honnete : INV-19(1) (replay cross-machine) n'a pas d'oracle machinerie =>
  remonte en fog, jamais claime.
final_report: >-
  software/evidence/claim separes ; cite chaque oracle par hook de bible
  couvert (INV-n -> test) ; liste fichiers touches vs ownership ; sortie
  reuse_ratio.mjs + requetes SEARCH ; TBD rencontres remontes en fog ;
  claim_verdict: NO_CLAIM_ALLOWED. Sans oracle disponible => besoin HumanGate.

# --- 8. Restitution (Critique) ---
output_contract: >-
  diff (micro-commits, sans git push) + WireMap a jour (feature INV-n /
  fonction / fichiers / preuve / statut) + run-oracle.mjs cable (volets 1-6) +
  recu mutation + sortie reuse_ratio.mjs. Aucun binaire, aucun asset.

# --- 9. Capacités (Important — `aucun` autorisé, jamais absent) ---
skill: aucun
plugin: aucun

# --- 10. Traçabilité (Recommandé — `aucun` autorisé, jamais absent) ---
delegation_context: >-
  Increment 1 du plan FORGE_PLAN_PROPOSAL.md (games/auto_battler/), run
  auto_battler-i1, en aval du charter s0 et du blueprint s4 de ce run.
  PROPOSED — dispatch conditionne a la ratification Pierre.
```

Vérification de forme (à blanc, jamais lancée ici) : ce YAML remplit les 14 Critiques, déclare les 2 Importants et le Recommandé (`aucun`/rempli, jamais absents), et `capability_role: builder` est résolvable par `roles.yaml` — il passerait `validate_contract` + `resolve_runtime`.

---

## 4. Mapping Oracle Hooks de bible → oracles Forge

### 4.1 Ce qui existe déjà (mécanisme prouvé en vivo)

| Hook de bible | Oracle Forge |
|---|---|
| INV-1/3/4, CBT-1 (replay bit-à-bit, pureté) | Fixtures `node --test` dans l'oracle-code (pattern shmup R21 « double exécution trace identique ») + property-based seedé |
| INV-2 (rng_state sérialisé, resume) | Fixture sérialisation/restauration dans l'oracle-code |
| INV-5 (Renderer aveugle), CBT-6 (étanchéité hors-combat), CBT-9 (combat sans rng) | `check_architecture` (s10b) — `deps_interdites` du blueprint : `renderer ↛ logic/state`, `combat ↛ bench/gold/pool/shop/life`, `combat ↛ rng` ; couvre les « audits de dépendances » des bibles tel quel |
| INV-6/9/10/11/13/14/15/16/17/18, CBT-2/7/8 (fixtures et property-tests) | Fixtures + property-tests dans l'oracle-code ; le **gate mutation** garantit que ces tests mordent |
| INV-12, CBT-5 (registre fermé, payloads, fail-hard) | Validateur de schéma in-suite (test qui échoue le run) + fixtures « nom hors liste → échec » |
| INV-7 (conservation Pool), INV-8 (probas à seed fixe) | Property-test conservation ; test fréquences vs table à Seed fixe (déterministe) |
| CBT-3 (golden fixture d'ordre T1→T10, `seq`) | Fixture golden de séquence d'Events dans l'oracle-code (divergence = échec) |
| « Un bot joue et GAGNE » | Oracle **solvabilité** (gabarit existant) — s'incarne à l'incrément 3 : match complet bots, Victory émis, bot scripté gagnant |
| Slice jouable | **e2e Playwright** + `check_e2e_harness` + `PLAYABLE_CONTRACT.md` — incrément 4 |
| Traçabilité règle ↔ code | `check_wiremap` + gel `wiremap_frozen.json` : chaque INV-n/CBT-n devient une feature de WireMap avec fonction + preuve |

### 4.2 Gaps (ce que la machinerie n'a pas)

1. **INV-19(1) / CBT-1 cross-machine** — « replay sur DEUX machines différentes → identique au bit près ». La machinerie exécute tout sur un seul poste. Adaptation minimale : double-run même machine + sérialisation canonique en oracle ; le volet cross-machine reste un **fog HumanGate explicite** (jamais claimé) jusqu'à un runner secondaire (décision infra Pierre).
2. **CBT-4 / DEC-1 (audit de registre des DecisionPoints)** — « tout site de décision référence un DP-n, sinon fail-hard ». Aucun scanner machinerie. Adaptation minimale : convention in-suite (table des fonctions de décision + test qui l'énumère et échoue sur site non déclaré) — déterministe, non-LLM, vit dans `run-oracle.mjs` du projet ; un vrai scanner AST `check_decision_registry` serait un ajout `static_oracles.py` (gate Pierre, non requis pour démarrer).
3. **Scan « aucun timer/horloge/aléa caché »** (INV-3/19, audits d'architecture des bibles) — `check_architecture` vérifie des imports inter-modules, pas des appels (`Date.now`, `Math.random`). Adaptation minimale : scan statique **in-suite** des sources du moteur (regex déterministe, échec du run) — pattern déjà employé par shmup (preuve R21/R25). Aucune modification machinerie nécessaire.

---

## 5. Risques / écarts et adaptations minimales proposées

- **R1 — Le seul profil « projet existant » saute archi/wiremap.** La chaîne est pensée s0→s12 greenfield ; `patch` (build→code→redteam→verdict) émet archi/wiremap `SKIPPED` — or ce sont précisément les oracles dont un moteur multi-incréments a le plus besoin (INV-5, CBT-6/9 = deps interdites). *Adaptation minimale* : un profil **`increment`** = `(s3-decompo, s4-archi, s5-wiremap, s6-redteam-plan, s9-build, s10a, s10b, s10c, s11, s12)` — une entrée dans `PROFILES` (`dispatch.py`), modification sous `scripts/` donc **gate Pierre**. Repli sans modification : incréments 2–4 en `full` (re-cadrage s0/s1/s2 un peu cérémonieux mais fonctionnel).
- **R2 — Gel du jeu de règles vs incréments.** `wiremap_frozen.json` vit dans `lab/forge_runs/<projet>/` et toute règle « ajoutée » après gel = STOP dur — c'est la définition même d'un incrément. *Adaptation minimale* : **un run_dir par incrément** (`lab/forge_runs/auto_battler_i1`, `_i2`, …), chaque run refait son s5 et pose SON gel ; `oracles.json` pointe toujours `games/auto_battler`. Aucune modification de code, seulement une convention de run_id/run_dir à ratifier.
- **R3 — `is_game=true` exigerait e2e + solvabilité dès l'incrément 1** alors que le moteur est headless par bible (INV-5 interdit même au core de connaître le rendu). Danger réel : la garde pousserait un builder à coller une UI dans le moteur pour passer. *Adaptation minimale* : incréments 1–2 déclarés **non-jeu** (`oracle_ok = code.ok and wire.passed`, mutation gardée volontairement) ; solvabilité activée à l'incrément 3 (match bots gagné) ; `is_game=true` complet à l'incrément 4. À ratifier explicitement pour que personne ne « répare » ce choix en cours de run.
- **R4 — Valeurs TBD des bibles.** tick_limit, dimensions du Board, Life initiale, formule de dégâts au Seat, retombée du Mana, toute l'économie chiffrée — et **QB-6 (anéantissement mutuel) est ouverte**, or T10(2) en dépend. Les bibles interdisent au builder d'inventer. *Adaptation* : un **HumanGate « valeurs de travail v0 »** avant l'incrément 2 (économie) et l'incrément 3 (combat — QB-6 incluse), valeurs posées dans un `params.mjs` marqué provisoire, propriétaires de bible inchangés. Sans ce gate, les incréments 2–3 partiront en fog massif ou en invention silencieuse.
- **R5 — Ce qui restera sans oracle machinerie** : INV-19(1) cross-machine (gap 1) et l'audit DP exhaustif (gap 2) — couverts partiellement in-suite, le reste = fog HumanGate honnête dans chaque verdict, jamais un claim.
- **R6 — Coût/attrition** : le run full shmup a coûté ≈ 13 $ avec 6 attempts sur s9 et 2 escalades ; 4 runs à prévoir, bornés par `MAX_ESCALATIONS` et le cap de triage mutation. Le corpus de bibles (déjà ratifié) devrait réduire fortement les attempts de design (s0–s5 ont une source de vérité au lieu d'inventer).

---

## Verdict de ce document

```
software_verdict: BLOCKED   (aucun dispatch possible : plan non ratifié — c'est le comportement attendu)
evidence_verdict: MECHANICAL_VALIDATION_ONLY (constats issus de la lecture directe des fichiers cités en Source)
claim_verdict: NO_CLAIM_ALLOWED
```

Prochaine étape : ratification Pierre de (1) le découpage en 4 incréments, (2) le profil `increment` OU le repli `full`, (3) la convention run_dir par incrément, (4) le statut non-jeu des incréments 1–2, (5) le HumanGate « valeurs de travail v0 » avant i2/i3. Puis `python -m forge.dispatch --dry-run` avant tout lancement réel.
