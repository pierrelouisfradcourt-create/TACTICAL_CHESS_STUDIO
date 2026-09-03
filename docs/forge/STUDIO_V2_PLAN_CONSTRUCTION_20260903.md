# STUDIO V2 — PLAN DE CONSTRUCTION

*2026-09-03 · Source : session Fable (poste de commande), lecture seule des deux dépôts ·
statut **PROPOSED**, non commité, aucune ligne de code modifiée.*

```
mesuré_sur:
  V1  C:\TACTICAL_CHESS_STUDIO          HEAD 49eacd3a (docs seuls depuis 58095ba9 ; scripts/forge == 58095ba9)
                                        arbre : 3 fichiers scripts/forge modifiés (autre session, non migrés)
  V2  C:\Users\Studio-Dev\Desktop\Studio HEAD 7f201fd · arbre propre · AUCUN remote
  carte de vérité : docs/forge/STUDIO_V2_CARTE_VERITE_20260903.html (844df04a)
  cibles lues : FORGE_TARGET_MODEL.md · CAPABILITY_MAP.md · TARGET_INTERACTION_MODEL.md · EXISTANT_TO_TARGET.md (V2, 2026-09-01)
```

---

## 1 · CONSTATS — ce que le dépôt confirme, ce qu'il invalide

### 1.1 Confirmé (re-mesuré cette session)

| affirmation de la carte | mesure | statut |
|---|---|---|
| chaîne `run_real.py → ForgeDriver → dispatch.ORDER`, 13 stations, 19 profils | `dispatch.py:68` ORDER = 13 · `PROFILES` 19 entrées · `driver.py:348 self.order = order_for_profile(profile)` | EXISTE |
| porte de spawn : un spawn ⇔ exactement un dispatch signé | `hook_guard.check_spawn` compte les lignes HMAC `spawn_prepared` du triplet (etape, run_id, attempt) ; ne lit aucun YAML | EXISTE |
| `prepare_dispatch` accepte un appel hors profil | `profile=None` ⇒ aucun contrôle d'appartenance ; `allow_unprofiled=True` ⇒ dérogation signée dans l'audit | EXISTE — la composition dynamique est mécaniquement ouverte |
| `GAME_BLUEPRINT` · `GAME_FLOW` · `ARCHITECTURE_CONTRACT` | 0 occurrence dans `forge/`, `.claude/`, `TOOLS/` | ABSENT |
| `knowledge_packet.json` sans producteur | 0 producteur dans `forge/*.py`, `forge/*.mjs` ; cité par s3 et s4 | ABSENT |
| collision `blueprint.yaml` / `blueprint.json` | 5 contrats citent `.yaml` (s4, s5, s6, s9, s10b) ; `_ARTIFACT_BY_STEP` écrit `blueprint.json` | PARTIEL |
| jointure observée mais vide | baseline `state.json → steps.s5-wiremap.detail.join_check` : 10 capacités · 0 couverte → après réparation 0 couverte + 9 fantômes (`EMPTY_FORM → VOID`) | PARTIEL |
| emitter sans émetteur | `emitter.notify`, `amendment_log.append_message`, `consumption_status` : 0 appel depuis driver/run_real ; `EVIDENCE/amendments/` vide | PARTIEL |
| revue indépendante absente de la baseline | `verdict.json : redteam_ran = False` ; s11 exécuté sous `model_override: opus` (ESC-1 corrigé après coup, non rejoué) | PARTIEL |
| Fable pilote, pas directeur | `roles.yaml` : `orchestrator` = la session (descriptif) · `run_orchestrator` = agent Opus ; `orchestrator.yaml` orphelin de tout profil | PARTIEL |

### 1.2 Invalidé ou incomplet — ce qui change le plan

| # | la carte / la cible dit | le dépôt montre | conséquence |
|---|---|---|---|
| C-1 | « Observer : 0 appel depuis `forge/` » | `driver._default_observer_runner` appelle `scripts/observer/cli.py` — chemin **V1**, absent de V2 (`Studio/scripts/` n'existe pas) ; baseline `state.transition = "INCOMPLETE: observer cli.py returncode=2"` | C17 n'est pas « non branché », il est **branché sur un chemin mort** : BLOCKED, réparation d'une ligne, consommateur démontré |
| C-2 | `.claude` « PARTIEL, testé pour la porte » | la surface de pilotage de Fable, `.claude/skills/forge/skill.md`, porte **14 références V1** (`scripts/forge`, `.venv312`, `lab/forge_runs`) ; `gate` 4, `verdict` 1 | l'interface L1/L2 de V2 est une carte de V1 : Lot 0 |
| C-3 | rien | **aucun environnement Python dans `Studio/`** ; `python` système n'a pas PyYAML ; toutes les mesures V2 (2 459 tests, RUN M ter) ont utilisé `C:\TACTICAL_CHESS_STUDIO\.venv312` | V2 dépend de V1 pour tourner — contraire à TOPOLOGY « aucun chemin ne remonte vers V1 » : Lot 0 |
| C-4 | « le dépôt GitHub fait foi » | le dépôt GitHub contient V1 + la carte ; **le code V2 n'a aucun remote** | la construction V2 n'a pas de destination canonique : décision D0 |
| C-5 | cible §14 : « `dispatch.ORDER` — RETIRER », « `PROFILES` — REMPLACER » | `forge/tests/test_dispatch.py` (zone protégée) impose `len(ORDER) == 13` et `profils ⊆ ORDER ∪ DEDICATED` ; le driver (5 777 l.) et 19 profils en dépendent | **on ne retire pas ORDER** : on construit le chemin Director **à côté**, sur la même porte, les mêmes oracles, le même verdict ; ORDER devient le chemin legacy = benchmark de régression (baseline M ter). Retrait = décision Pierre après mesure |
| C-6 | cible §4 : « 14 capacités sur 16 existent » | elles existent **comme étapes de profil**, pas comme capacités convocables : la convocation atomique (contrat → prompt → exécuteur → matérialisation → validateur) est dispersée dans `ForgeDriver._run_llm` (475 l.), la fermeture `claude_executor`, `_materialize_artifact`, et 4 tables (`_ARTIFACT_BY_STEP`, `_UPSTREAM_BY_STEP`, `_ARTIFACT_VALIDATORS`, `_STEP_TOOLS`) | « convoquer une capacité » n'existe pas comme primitive : à **extraire**, pas à inventer (Lot 2) |
| C-7 | cible §2 : le Blueprint « objet vivant, amendé par tous », par projet | `run_real.main` : `run_dir = EVIDENCE/runs/<project>` — **projet = run** (d'où « un prochain run doit porter un autre nom ») ; aucun objet ne survit d'un run à l'autre hors `heritage/` | pas de rework inter-runs possible sans séparer projet et run : décision D2 |
| C-8 | cible §12 : « Q1 dérivée : le contrat vit là où `prepare_dispatch` le valide » | `prepare_dispatch` appelle `load_contract(etape)` **sans** `contracts_dir` ⇒ seul `forge/contracts/<etape>.yaml` est chargeable | un contrat composé à la volée exige soit un fichier dans `forge/contracts/`, soit un paramètre `contracts_dir` transmis (adaptation d'une ligne, à tester — Q7 reste ouverte) |
| C-9 | cible : « jointure — 0 id partagé — CONSTRUIRE » | mécanisme construit (`check_wiremap_join`, 5 régimes) ; ce qui manque = un **lecteur décisionnel** et un producteur qui joint réellement | la carte avait déjà corrigé ; confirmé |
| C-10 | cible §3 : Fable « juge la suffisance du design » | cible §10 dit elle-même « mesurable, pas au jugé » | contradiction interne de la cible : la suffisance est une **gate mécanique** (couverture), jamais un jugement du Director |

### 1.3 Ce que la baseline apprend sur le socle réutilisable

Toute la chaîne de preuve tient : verdict signé, `verify_run` AUTHENTIQUE, mutation gate (4 refus), escalade (2), reçus d'oracle déterministes. Ce qui ne tient pas est **en amont** de la preuve : rien ne relie l'intention aux unités construites (jointure VOID), rien ne notifie, personne n'arbitre. La V2 se construit **au-dessus** de la preuve existante, pas à sa place.

---

## 2 · ARCHITECTURE V2 RETENUE (corrigée)

### 2.1 Le premier objet central — démontré

Trois candidats : le `GAME_BLUEPRINT` (objet), la primitive de convocation (mécanisme), le Director (agent).

- Un Director sans Blueprint décide sur les fichiers du run_dir → c'est le driver actuel.
- Une primitive sans Blueprint lit/écrit les mêmes fichiers → c'est `_run_llm` extrait, rien de plus.
- Un Blueprint sans producteur = **validateur sans producteur** (règle ratifiée 2026-07-30).

Le dépôt montre que le Blueprint existe déjà **implicitement** : c'est l'ensemble des fichiers du run_dir à noms fixes (`charter.yaml`, `prisme.json`, `featuremap.json`, `blueprint.json`, `wiremap.json`, `loop.json`, `design_questions.json`), assemblés dans les prompts par `_UPSTREAM_BY_STEP`. Ce qui manque n'est pas le contenu, c'est **l'objet unique** : sections, propriétaire, version, provenance, et la **jointure par identifiants** entre `feature_map` et `wiremap`.

**Décision : le premier objet est `GAME_BLUEPRINT` v0, livré avec son premier producteur déterministe** — un importeur qui construit le Blueprint depuis les artefacts de la baseline M ter — et son premier consommateur — le rapport de couverture (jointure). Zéro dépense LLM, forme de production réelle (règle « un test exerce la forme de production »), résultat attendu connu : le rapport doit reproduire `10 / 0 / 9 fantômes`. Si le schéma ne sait pas porter les artefacts réels, il est faux avant d'avoir coûté un run.

### 2.2 Topologie

```
                 PIERRE (HumanGate)
                    │ L1 : Brief → sections vision · constraints · design_metrics(cibles)
                    ▼
   ┌───────────►  GAME_BLUEPRINT  ◄────────────────────────────────┐
   │              GAMES/<projet>/GAME_BLUEPRINT.json               │
   │              sections · owner · version · provenance          │
   │                    │                                          │
   │                    ▼  (lit tout, n'écrit que decisions/questions)
   │              DIRECTOR (forge/director.py)                     │
   │              noyau déterministe : état du Blueprint → convocations
   │              Fable-session pilote pas à pas, Pierre arbitre    │
   │                    │ L2 : convocation = prepare_dispatch(profile=None, reason=mesure)
   │                    ▼                                          │
   │     invoke_capability(capacité, blueprint, run_dir)           │ L4 : amendement de SA section
   │       contrat 17 champs → prompt → exécuteur → matérialisation → validateur → section
   │       (Prisme · Design/Breakdown · Archi · Wiremap · Art · GM · Build · Red Team)
   │                    │ L3 : question / objection / amendement → emitter (journal + trace)
   │                    ▼
   │              PORTE DE SUFFISANCE (mécanique)                  │
   │              couverture exigence→feature→expected_proof ; régime JOINED ou PARTIAL accepté par Pierre
   │                    │ L5
   │                    ▼
   │              BUILD (workers s9, existants) → GAMES/<projet>/
   │                    │ L6
   │                    ▼
   │              EVIDENCE : oracles déterministes · mutation · verdict HMAC · verify_run
   │                    │ L7 : rapport « ce que le jeu fait » + couverture réelle (wiremap joint)
   └────────────────────┘  rework = nouvelle décision du Director, amendement du Blueprint, jamais un patch seul
                          L8 : dossier HumanGate (verdict · couverture · objections conservées · écarts)
```

Ce qui distingue cette topologie d'une chaîne repeinte, et **comment on le mesure** :
1. la suite des convocations d'un run n'est égale à aucun tuple de `PROFILES` et **dépend de l'état du Blueprint** (deux Blueprints différents ⇒ deux suites différentes — règle de variance) ;
2. au moins une **re-convocation** déclenchée par une mesure (régime de jointure, question ouverte, oracle rouge), inscrite dans `decisions` avec son signal ;
3. le prompt d'une capacité est assemblé **depuis le Blueprint**, plus depuis `_UPSTREAM_BY_STEP`.

### 2.3 Rôle exact de Fable / Director

Deux incarnations, une seule autorité :

| | noyau `forge/director.py` | Fable-session (poste de commande) |
|---|---|---|
| nature | code déterministe, testable hors LLM | la session Claude Code qui pilote (`roles.yaml : orchestrator`) |
| ce qu'il fait | calcule les convocations depuis l'état du Blueprint ; journalise chaque décision avec sa mesure ; ouvre la porte de suffisance quand elle est verte ; halte sur question bloquante | lance le noyau pas à pas ou en boucle ; répond aux questions de portée orchestrateur ; prépare le dossier HumanGate |
| ce qu'il ne fait jamais | inventer une réponse de design ; écrire une section de spécialiste ; rendre un verdict d'oracle ; lever le verrou Q2 ; commiter | juger la valeur du jeu ; écrire `vision` / `must_not_have` / cibles de métriques ; effacer une question |

- **Input** : `GAME_BLUEPRINT` (dont le Brief ratifié importé en sections), index KB, registre des capacités (`CAPABILITY_REGISTRY`), EVIDENCE des runs antérieurs du projet.
- **Output** : `decisions[]` structurées `{id, ts, by, kind: convoke|reconvoke|gate_open|halt|arbitrate, signal, measure, refs}` · convocations (lignes d'audit signées) · `questions[]` ouvertes · dossier HumanGate.
- **Pouvoirs** : composer, ré-appeler, ordonner, ouvrir le build, halter, escalader (politique `escalate.py` inchangée, portée builder seule).
- **Ne décide pas** : merge/reject/freeze (Pierre) · levée de Q2/R8 (Pierre) · acceptation d'un écart de couverture ou de métrique (Pierre, décision inscrite) · `software_verdict` (reçus d'oracle seuls).
- **Rapport à `run_real`** : le Director **réutilise** `claude_executor`, les matérialiseurs, les validateurs et `check_wiremap_join` de `run_real.py` ; il **ne passe pas** par `ForgeDriver.run()` ni `order_for_profile`. Nouvelle invocation `python -m forge.director` (règle O1 : `python -m forge.<module>`). `run_real.py` reste l'entrée du chemin legacy.
- **Rapport au HumanGate** : le Director produit le dossier ; `gate.py` et le decision-log restent la seule destination des décisions ratifiées (M5 de la cible : destination absente de V2 — à créer dans `EVIDENCE/decisions/`, propose-only).

### 2.4 Contrats centraux — le plus petit ensemble

| # | contrat | forme | remplace / réutilise |
|---|---|---|---|
| K1 | `GAME_BLUEPRINT` schéma v0 | JSON : `identity · vision · constraints · gameplay(charter) · understanding(prisme) · feature_map · architecture_contract · wiremap · questions · decisions · provenance` — chaque section `{owner, version, sha256, source_run}` | fusionne les 7 artefacts de run_dir (cible §2) ; `feature_map` et `wiremap` **dérivés, jamais saisis** |
| K2 | `CAPABILITY_REGISTRY` | une table par capacité : `{contract, capability_role, reads: [sections], writes: section, artifact, validator, tools, escalation, problem_codes}` — `escalation` obligatoire, valeur `aucun` pour reviewers et oracles (ESC-1 rendu structurel : tout renforcement déclare sa portée) | **consolide** `_ARTIFACT_BY_STEP` + `_UPSTREAM_BY_STEP` + `_ARTIFACT_VALIDATORS` + `_STEP_TOOLS` (règle anti-couches C2 : un composant remplace plusieurs) |
| K3 | Convocation (L2) | `{capability, question, sections_in, section_out, constraints, reason:{signal, measure}}` → `prepare_dispatch(etape, run_id, profile=None, attempt, reason)` | porte existante inchangée |
| K4 | Message (L3) | `question · objection · amendment` | **existe** : `amendment_log.validate_message` + `emitter.notify` ; premier émetteur réel = le Director |
| K5 | Rapport de couverture / porte de suffisance (L5) | `{exigences, features, expected_proofs, wiremap_joined, regime, fantomes, accepted_by}` | `check_decompo.mjs` + `check_wiremap_join` ; devient une **gate** sur le chemin Director seulement |
| K6 | Décision | champ structuré, jamais prose (règle 2026-07-23) : `{id, ts, by, kind, signal, measure, diagnosis_code, effect, refs}` | nouveau, minuscule |
| K7 | Problème (résultat de capacité) | `problems[] = {code, path, message, suggested_action, producer}` — **`producer` = identifiant du mécanisme** (validateur, oracle, jointure). Un problème produit par un agent LLM n'est jamais un code : il devient `question` ou `objection` (K4) et la politique ne l'exécute pas. Transporté **en JSON jusqu'au Director, jamais aplati en texte** (défaut mesuré chez Vitric) | remplace les détections par correspondance de chaîne (`_is_materialize_refusal_reason`) ; les 5 régimes de jointure et les statuts RETURN_REASON deviennent des codes |
| K8 | Réponse humaine | fichier structuré `answers.json` `{question_id, answer, by, ts}` lu à la reprise — jamais de prose de conversation (même interdit que le Brief §4) | reprise au niveau de l'objet bloquant, pas du run |

Ce qui reste **hors** du minimum : `design_metrics`, UX, `GAME_FLOW`, boucle des métriques, QA design — sections réservées dans K1, vides et marquées `NOT_FOUND`, aucun code.

---

## 3 · ORDRE DE CONSTRUCTION

### Lot 0 — socle de construction (aucune logique V2, préalable à tout code)

- **Objectif** : que V2 tourne, se teste et se commite sans dépendre de V1.
- **Surfaces** : environnement Python de `Studio/` (venv propre + PyYAML + pytest, hors V1) · remote git V2 (D0) · `.claude/skills/{forge,gate,verdict}/skill.md` réécrits sur les chemins V2 · `driver._default_observer_runner` → `TOOLS/observer/cli.py` (C-1) · `settings.json` : entrée `scripts/forge/reference_protected.yaml` requalifiée.
- **Dépendances** : D0 (remote), D1 (environnement) — décisions Pierre.
- **Preuve attendue** : `python -m pytest forge/tests -m "not gpu_window"` vert **depuis `Studio/` avec l'interpréteur V2** ; `TOOLS/validate_v2.py` inchangé vert ; un rejeu `proof_only` sur la baseline rend `transition: OK`.
- **Tests** : T0 V2 complet ; aucun nouveau test.

### Lot 1 — `GAME_BLUEPRINT` v0 + importeur + rapport de couverture (zéro LLM)

- **Objectif** : l'objet central existe, produit depuis la forme de production réelle, lu par un consommateur.
- **Surfaces** : `forge/blueprint.py` (schéma K1, lecture/écriture, versions par section) · `forge/blueprint_import.py` (run_dir → Blueprint : charter, prisme, featuremap, blueprint.json → `architecture_contract`, wiremap, design_questions) · `forge/coverage.py` (K5, appelle `check_decompo.mjs` et `check_wiremap_contract.mjs`) · `GAMES/<projet>/GAME_BLUEPRINT.json` (emplacement, D2).
- **Dépendances** : Lot 0 · D2.
- **Preuve attendue** : import de `EVIDENCE/runs/runm_breakout` ⇒ Blueprint valide ; rapport de couverture = `capacites 10 · couvertes 0 · fantomes 9 · regime VOID`, identique au reçu signé de la baseline. Sha256 des sections = sha256 des artefacts source.
- **Tests** (GO Pierre requis, zone protégée) : import sur la baseline réelle · refus d'une section écrite par un non-propriétaire · `feature_map`/`wiremap` non saisissables à la main · garde anti-divergence sur la règle `source_ref`.

### Lot 2 — primitive `invoke_capability` + `CAPABILITY_REGISTRY` (extraction, pas invention)

- **Objectif** : une capacité se convoque seule, sur le Blueprint, par la porte.
- **Surfaces** : `forge/capability.py` (`invoke_capability(cap, blueprint, run_dir, executor) → CapabilityResult{section_written, artifact, validator_receipt, problems[] (K7), questions[]}`) · écriture de section avec contrôle de propriétaire **mécanique** (`blueprint.write_section(cap, section)` refuse hors `writes`, comme l'exécuteur matérialise aujourd'hui à la place de l'agent) · `forge/capability_registry.yaml` (K2) · adaptation minimale de `prepare_dispatch` : paramètre `contracts_dir` transmis à `load_contract` (C-8) · prompt assemblé depuis les sections lues, plus depuis `_UPSTREAM_BY_STEP`.
- **Dépendances** : Lot 1.
- **Preuve attendue** : (a) hors LLM, exécuteur factice : une convocation `breakdown` sur le Blueprint importé écrit `feature_map` v2, audit signé, hook `check_spawn` = allow avec `count == 1` (Q7 exécutée, plus lue) ; (b) **une** convocation réelle d'une capacité amont (Prisme ou Breakdown) sur un run_dir neuf, coût borné, artefact validé par l'oracle existant.
- **Tests** : `count == 1` sur contrat composé (Q7) · re-convocation = attempt distinct, jamais refusée comme rejeu · aucune écriture hors de la section déclarée · égalité stricte registry ↔ anciennes tables tant que les deux coexistent.

### Lot 3 — Director v0 (noyau déterministe + journal de décisions + émetteur branché)

- **Objectif** : la composition est décidée par l'état du Blueprint, pas par une constante.
- **Surfaces** : `forge/director.py` (`next_actions(blueprint, evidence) → [Convocation|Halt|GateOpen]`, boucle `--step`/`--until-gate`) · `decisions` (K6) · premier appel réel de `emitter.notify` sur re-convocation · `EVIDENCE/decisions/` (destination propose-only, M5).
- **Politique v0, explicite et courte** : KB insuffisante pour le genre ⇒ **question à Pierre** (Q2 : jamais de World Scan auto) · `understanding` vide ⇒ Prisme · `feature_map` vide ou exigence non couverte ⇒ Breakdown · `architecture_contract` vide ⇒ Archi · `wiremap` vide ⇒ Wiremap · régime ≠ JOINED ⇒ re-convocation du propriétaire fautif **avec message et `diagnosis_code`** · couverture verte ⇒ `GateOpen` · question bloquante ouverte ⇒ `Halt(question_id)`, reprise sur `answers.json` (K8).
- **Mesure d'effet, calculée par le Director, jamais rapportée par la capacité** : chaque décision porte `before_section_sha · after_section_sha · coverage_before · coverage_after · effect ∈ {CHANGED, NO_EFFECT, REGRESSED}`. Règle d'arrêt : deux `NO_EFFECT` consécutifs de la même capacité sur le même signal ⇒ `Halt` avec question à Pierre — jamais une troisième re-convocation (critère de sortie distinct du critère de qualité, ratifié 2026-08-20).
- **Persistance** : `director_state.json` + `decisions.jsonl` append-only dans le run, reprise exacte après halte ou panne (même régime que `state.json` du driver, étendu à l'objet bloquant).
- **Dépendances** : Lot 2.
- **Preuve attendue** : sur deux Blueprints différents (baseline importée vs Brief neuf), deux suites de convocations différentes, aucune égale à un profil ; `EVIDENCE/amendments/journal.jsonl` non vide (M devient mesurable) ; `consumption_status` rend `consumed` ou `not_consumed`, jamais `no_evidence_declared` pour une capacité notifiée ; chaque décision porte un `effect` calculé.
- **Tests** : politique pure (table codes → actions) · variance des suites · `Halt(question_id)` puis reprise sur `answers.json` · arrêt après deux `NO_EFFECT` · un problème à `producer` LLM n'entraîne aucune action de politique · aucune écriture dans `vision`/`constraints`.

### Lot 4 — porte de suffisance + Build + Evidence sur le chemin Director = **vertical slice**

- **Objectif** : un jeu réel, un verdict AUTHENTIQUE, un Blueprint dont la `wiremap` est **jointe** à la `feature_map`.
- **Surfaces** : `forge/director.py` (GateOpen → workers s9 existants, oracles s10a/b/c, `_run_verdict` réutilisé via un adaptateur d'état) · `verdict.build_aggregate_verdict(extra_advisory=+couverture, +blueprint_sha256)` (advisory d'abord, décision G ultérieure) · snapshot du Blueprint dans `EVIDENCE/runs/<run_id>/`.
- **Dépendances** : Lot 3 · D4 (jeu du slice).
- **Preuve attendue** : voir §4.
- **Tests** : verdict refusé si le snapshot Blueprint ne correspond pas au run · régime de jointure du verdict = régime du rapport K5 · legacy `full` sur la baseline toujours 13/13 (non-régression).

### Lot 5 et suivants — hors slice, dans l'ordre de rentabilité mesurée

1. **Oracle de perturbation « politique nulle ne gagne pas »** : le replay gagnant du bot de solvabilité (graine, entrées, hash) est la référence ; le même replay rejoué sans entrée ne doit pas atteindre la victoire, sinon FAIL. Preuve de variance de la solvabilité, déterministe, autour de l'existant. Défaut connu qu'il rend visible : la baseline se gagne en 456 images sans joueur.
2. **Recette de rejeu dans le verdict** (`replay: {seed, argv, hashes}`) : chemin vers une vérification par un tiers, faiblesse notée le 2026-08-20 (33 signatures valides pour nous, 0 vérifiable ailleurs).
3. Boucle des métriques (`design_metrics` avec preuve de variance, Q3) → UX (rôle + contrat + section, Q4) → `GAME_FLOW` → QA design → Red Team indépendante rejouée (ESC-1 en run réel) → déclassement d'`ORDER` (décision Pierre, après ≥ 2 runs Director AUTHENTIQUES).

**Axe stratégique nommé, hors lots numérotés — expérimentation contrôlée** : `certificat valide → perturbation contrôlée → replay → assertion → finding`. Le Director pourra provoquer des expériences et décider de la suite depuis leurs résultats. Deux bornes non négociables, tirées de nos propres leçons : un finding de perturbation est **advisory** pour le Director, jamais un verdict (ADR-002) ; aucune inférence sans règle de variance ni sans deux répétitions valides (expérience L/D : 0 paire valide après des semaines).

---

## 4 · PREMIER VERTICAL SLICE

**Parcours** : `Brief (Pierre) → import en Blueprint → Director → Prisme → Breakdown → Archi → Wiremap → porte de suffisance → re-convocation si VOID/PARTIAL → Build → oracles → verdict → dossier HumanGate`.

**Jeu** : même intention que la baseline (casse-briques web minimal, socle N1), **nouveau nom de projet** (D4). Raison : seul cas où la différence mesurée est attribuable à la topologie et non au jeu ; `GAMES/breakout*` restent des benchmarks, jamais des sources.

**Capacités convoquées** (toutes existantes) : `s0-contrat` (section `gameplay`), `s1-prisme`, `s3-decompo` (→ `feature_map`), `s4-archi` (→ `architecture_contract`), `s5-wiremap`, `s9-build`, `s10a/b/c`, `s12-verdict`. Non convoquées : `s2-worldscan` (verrou Q2), `s6` (0 finding par construction), `s11` optionnelle si Qwen disponible (indépendance préservée, ESC-1).

**Critères de démonstration, tous mesurables** :
1. `EVIDENCE/runs/<run_id>/verdict.json` signé, `verify_run` = AUTHENTIQUE, `software_verdict` issu des seuls reçus.
2. suite des convocations ≠ tout tuple de `PROFILES` ; ≥ 1 re-convocation avec `signal = join_regime`, message dans `EVIDENCE/amendments/journal.jsonl`, acquittement `consumed`.
3. rapport de couverture final : `regime ∈ {JOINED, PARTIAL}` avec `capacites_couvertes > 0` (la baseline : 0) ; `fantomes = 0` ou écart accepté par Pierre et inscrit.
4. le prompt du builder est assemblé depuis le Blueprint (sha256 des sections dans le manifest d'exécution), aucune lecture de `_UPSTREAM_BY_STEP`.
5. `GAME_BLUEPRINT.json` : chaque section porte owner, version, source_run ; `questions` ne perd aucune entrée (append-only).
6. legacy intact : `full` sur la baseline rend encore 13/13 (benchmark).

**Ce que le slice ne prouve pas** (à écrire dans le dossier) : la valeur du jeu (Pierre joue) · la variance de l'oracle de solvabilité (défaut connu, non traité) · UX, métriques, flow (sections vides, NOT_FOUND).

---

## 5 · RISQUES ARCHITECTURAUX

| # | risque | signal de détection | parade dans le plan |
|---|---|---|---|
| R-A | pipeline repeint : la politique du Director reproduit ORDER | suite de convocations = `PROFILES["full"]` sur tout Blueprint | test de variance (Lot 3) ; re-convocation obligatoire dans le slice |
| R-B | Blueprint = 14ᵉ artefact que personne ne lit | prompts encore assemblés depuis `_UPSTREAM_BY_STEP` | critère 4 du slice ; registre K2 comme seule source des lectures |
| R-C | jugement LLM glissé dans le Director | une décision sans `signal`/`measure` | K6 : champ structuré obligatoire ; tout jugement devient une `question` |
| R-D | deux chemins d'exécution qui divergent | correctif présent dans un seul chemin | porte, exécuteur, matérialiseurs, oracles, verdict **partagés** ; legacy gelé en benchmark |
| R-E | projet = run (C-7) | Blueprint écrasé au 2ᵉ run | D2 : Blueprint dans `GAMES/<projet>/`, runs dans `EVIDENCE/runs/<run_id>/`, snapshot par run |
| R-F | dépendance V1 (env, chemins) | un test vert avec `.venv312` seulement | Lot 0, preuve « depuis Studio/ avec l'interpréteur V2 » |
| R-G | hook D4 : re-convocation refusée comme rejeu | `count >= 2` | attempt/round par convocation (alias `-rN` déjà résolu par `base_step`) |
| R-H | verrou Q2 contourné par une politique « KB insuffisante ⇒ Research » | convocation `s2-worldscan` non ratifiée | politique v0 : insuffisance ⇒ question à Pierre |
| R-I | zone protégée : chaque lot ajoute des tests | tests ajoutés sans GO | GO Pierre par lot pour `forge/tests/` (D5) |
| R-J | oracle de solvabilité à variance nulle valide un jeu mort | victoire sans entrée | connu, hors slice, `design_metrics` en Lot 5 ; consigné dans le dossier |

---

## 5-bis · SOURCES EXTERNES CONSULTÉES PAR PIERRE (2026-09-03) — emprunts et refus

Dépôts lus par Pierre via GPT, puis **vérifiés par cette session le 2026-09-03** (clone `--depth 1`, lecture seule, clone supprimé) : `github/spec-kit` @ `da2b0ae7` · `bullish0x/GameStudio` @ `6027706e` · `BlackBearCC/vitric` @ `0bc50601`. `SummerEngine/summer-engine-agent` **non vérifié** (UNKNOWN).

**Résultat des vérifications (9 affirmations)**

| dépôt | affirmation | verdict | ce que la source montre réellement |
|---|---|---|---|
| Spec Kit | `state.json` · `inputs.json` · `log.jsonl` | CONFIRMÉ | `engine.py RunState.save()` réécrit state/inputs atomiquement ; `append_log` ouvre `log.jsonl` en mode `a`, une ligne `{event, …, timestamp}` |
| Spec Kit | reprise exacte au point bloquant | **PARTIEL** | reprise à `current_step_index`, l'étape bloquée est **ré-exécutée** ; un gate imbriqué (if/while/fan-out) rejoue **tout le parent** ; un seul gate en pause à la fois |
| Spec Kit | YAML typé + conditions + boucles + fan-out/in + overlays | CONFIRMÉ | 12 types d'étape ; overlays = `insert_after/before · replace · remove` **sur la liste d'étapes seulement** |
| GameStudio | chaque agent : domaine + escalade + quality gates | **PARTIEL** | domaine explicite 55/55 ; « escalat » absent de 37/55 ; « quality gate » littéral 4/55 ; aucune clé `domain/escalation/gates` en frontmatter, les gates vivent dans `docs/director-gates.md` |
| GameStudio | ownership = contrainte d'écriture | CONFIRMÉ **en prose seule** | `coordination-rules.md` règle 5 ; **aucun hook ni script** ne compare agent et chemin ; seul mécanisme : `disallowedTools: Bash` sur 15 agents |
| GameStudio | Question → Options → Decision → Draft → Approval → Write | CONFIRMÉ | `CONTRIBUTING.md:95` ; les autres sources canoniques s'arrêtent à 5 étapes ; aucun hook ne bloque un Write sans approbation |
| Vitric | erreurs `{code, path, message, hint}` | **PARTIEL** | structure réelle dans `vitric-data/error.rs` (`VDxxx`) pour `vitric check` ; **l'API runtime l'aplatit en une chaîne** `{"ok": false, "error": "..."}` |
| Vitric | certificat par replay bit-exact | CONFIRMÉ | le certificat **est l'enregistrement** (`seed, inputs, checkpoints, final_hash`), re-prouvé à chaque `vitric gate` par replay depuis un boot à froid ; hash FNV-1a, **rien de signé, rien d'émis** |
| Vitric | playtest = lookahead + snapshot/restore + perturbation d'une solution gagnante | CONFIRMÉ | `seed.rs` : `PerturbOp {Baseline, Drop, Swap, Substitute, Truncate}` sur la séquence d'entrées du certificat, PCG déterministe ; lookahead = beam-search entre snapshot/restore ; **deux modes distincts, non combinés** |

**Ce que la vérification change chez nous**
- K7 : Vitric possède la structure et **la perd dans son propre transport**. Exigence ajoutée : le code de problème arrive au Director **en JSON, jamais aplati en texte** ; un test vérifie qu'aucune couche de formatage ne le détruit (même famille que « déclaré ≠ exécuté »).
- K8 : la « reprise au niveau de l'objet bloquant » n'existe pas dans Spec Kit ; elle est notre exigence propre. Sémantique retenue, identique à la leur sur ce point : la convocation bloquée est **ré-exécutée** avec la réponse fusionnée, pas continuée. Limite à ne pas hériter : notre journal peut porter **plusieurs** questions ouvertes ; `Halt` les liste toutes.
- Ownership : GameStudio le proclame, personne ne l'applique. Notre `write_section` avec contrôle de propriétaire est donc **au-delà** de la source, pas une copie.
- Lot 5 item 2 : le modèle Vitric est « le verdict porte de quoi être rejoué et le vérificateur rejoue », pas « un certificat stocké ». `verify_run` gagnerait un mode replay ; la signature HMAC prouve l'origine, le replay prouve la reproductibilité, les deux sont nécessaires.
- Lot 5 item 1 : « politique nulle » = l'opérateur `Truncate` à 0 (ou `Drop` total) de Vitric appliqué au replay du bot de solvabilité ; les quatre autres opérateurs sont la famille Red Team future, gratuite une fois le premier construit.

| source | primitive | chez nous | décision |
|---|---|---|---|
| Spec Kit | état de run persistant, journal append-only, reprise | `state.json`, audit HMAC, RUN_INDEX, journal d'amendements | **existe** ; on retient la reprise **au niveau de l'objet bloquant** (K8) |
| Spec Kit | workflow YAML, overlays | — | **refusé** : test de discrimination = si la suite des convocations est connaissable avant d'observer le Blueprint, c'est ORDER en YAML |
| GameStudio | ownership comme contrainte d'écriture, escalade par agent | matérialisation par l'exécuteur, ESC-1 | retenu : contrôle de propriétaire dans `write_section`, `escalation` dans K2 |
| GameStudio | 55 agents, adaptateurs multi-harnais | 17 agents, Claude seul (2026-07-23) | **refusé** (R2 : aucun consommateur) |
| Summer | jugement / moyen d'action / réalité | contrats + KB / exécuteur borné / socle N1 + oracles | confirme K2 ; Director à **six verbes** (lire, inspecter, décider, convoquer, amender ses sections, ouvrir une porte) |
| Summer | surface MCP riche (62 outils) | — | **refusé** pour le Director ; outils bornés par contrat au niveau capacité |
| Vitric | erreurs à code stable + chemin + hint | régimes de jointure, RETURN_REASON, détection par chaîne | retenu : K7 avec `producer` |
| Vitric | snapshot / restore, lookahead | versions de section du Blueprint | retenu : mesure d'effet du Director (Lot 3) ; lookahead plus tard sans nouveau mécanisme |
| Vitric | certificat par replay, perturbation d'une solution gagnante | verdict HMAC, bot de solvabilité | retenu : Lot 5 items 1 et 2 ; axe stratégique borné |

Ce que les quatre n'ont pas en combinaison et que la V2 construit : **la boucle décisionnelle causale** `état → mesure → décision (signal + mesure + provenance) → convocation → effet mesuré → nouvel état`, avec un juge mécanique en sortie et Pierre dès qu'une valeur humaine se décide. Le parallélisme (fan-out) n'est pas un mécanisme à construire : il découle de la propriété des sections, tant que personne n'écrit chez un autre.

## 6 · CE QUI RESTE DOCUMENTED_ONLY

`design_metrics` et leur preuve de variance (Q3) · UX (Q4) · `GAME_FLOW` · QA design · boucle des métriques (C22) · Red Team indépendante rejouée · droit de remontée de l'Architecte (formalisé comme `question`, non encore mécanisé) · notification par dépendance de sections (L3 : v0 = émetteur sur re-convocation seulement) · destination decision-log V2 (M5) · rail des 25 nœuds comme catalogue (Q5) · déclassement d'`ORDER`.

---

## 7 · DÉCISIONS DEMANDÉES À PIERRE AVANT LE PREMIER LOT DE CODE

| # | décision | recommandation |
|---|---|---|
| D0 | destination git de V2 | remote propre pour `Desktop/Studio` ; V1 garde la gouvernance (carte, plan) ; étanchéité de provenance conservée |
| D1 | environnement V2 | venv dans `Studio/` (Python 3.12 + PyYAML + pytest), aucune référence à `.venv312` |
| D2 | emplacement du Blueprint et schéma des runs | `GAMES/<projet>/GAME_BLUEPRINT.json` · `EVIDENCE/runs/<run_id>/` sur le chemin Director ; legacy inchangé |
| D3 | nature du Director | noyau déterministe piloté par la session ; aucun agent LLM orchestrateur autonome |
| D4 | jeu du slice | casse-briques, nouveau nom, même Brief à provenance re-datée |
| D5 | GO tests | un GO par lot pour les fichiers ajoutés sous `forge/tests/` |
| — | critères de passage au Lot 1 | Lot 0 vert avec preuve ; D0–D5 tranchées ; T0 V2 re-mesuré et son HEAD inscrit |

---

## 8 · STATUS_BY_SURFACE

```
status_by_surface:
  contrats_17_champs + porte_de_spawn:   TESTED        # prepare_dispatch, check_spawn count==1
  oracles_deterministes + verdict_hmac:  TESTED        # baseline M ter AUTHENTIQUE
  mutation_gate:                         TESTED
  escalade (portee builder):             IMPLEMENTED   # ESC-1 non rejoue en run reel
  prisme / research (par profil):        IMPLEMENTED   # research sous verrou Q2
  kb:                                    IMPLEMENTED
  check_wiremap_join (mecanisme):        IMPLEMENTED   # resultat VOID sur la baseline
  emitter / amendment_log / consumption: PASSIVE       # 0 emetteur, journal vide
  red_team_independante:                 BLOCKED       # redteam_ran False
  knowledge_packet.json:                 NOT_FOUND     # producteur
  blueprint.yaml vs .json:               PASSIVE       # nom instable, 5 contrats
  observer (C17):                        BLOCKED       # driver appelle scripts/observer/cli.py (V1)
  pilotage .claude/skills/forge:         PASSIVE       # 14 refs V1 — carte de V1
  environnement_python_V2:               NOT_FOUND     # depend de .venv312 (V1)
  remote_git_V2:                         NOT_FOUND
  GAME_BLUEPRINT:                        NOT_FOUND
  CAPABILITY_REGISTRY / invoke_capability: NOT_FOUND   # disperse dans driver/run_real
  director:                              NOT_FOUND
  porte_de_suffisance (gate):            NOT_FOUND     # regle existe, ne garde rien
  design_metrics / ux / game_flow:       DOCUMENTED_ONLY
  boucle_des_metriques:                  DOCUMENTED_ONLY
  q7_contrat_compose_dynamiquement:      UNKNOWN       # lu, jamais execute
  reference_guard / chaine_asset:        UNKNOWN
  implementation_V2:                     BLOCKED       # aucun code ; decisions D0-D5 en attente
```

```
software_verdict: OK              # document ; toutes les mesures citent leur fichier/ligne et leur HEAD
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
no_global_ready_verdict: true
```
