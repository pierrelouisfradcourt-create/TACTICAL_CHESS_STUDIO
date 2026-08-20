# AUDIT DE LA COUCHE DÉCISIONNELLE DU STUDIO

- **Date** : 2026-07-19 · **Statut** : AUDIT (photo à cette date, pas un fichier vivant) · `claim_verdict: NO_CLAIM_ALLOWED`
- **Auteur** : Claude Code (Sonnet), exécution mécanique — lecture directe du code réel de `scripts/forge/*.py`, pas de survol de documentation.
- **Méthode** : lecture intégrale des modules de décision (`contract.py`, `dispatch.py`, `gate.py`, `hook_guard.py`, `verdict.py`, `escalate.py`, `runtime.py`, `panel.py`), croisée avec l'audit YAML complet du repo (même session, `docs/forge/STUDIO_RUNTIME_MODEL.yaml`) et les vérifications directes déjà faites (contrats chargés/validés en réel, hook confirmé actif, artefacts d'exécution datés).
- **Portée** : la couche décisionnelle de **Forge** (le pipeline de génération de jeu vivant). `00_STUDIO_CONTROL/` (legacy, gel confirmé) et `docs/control-plane/` (périmètre encore en cours de classification, cf. Livrable 2) ne sont PAS refaits ici — juste référencés où pertinent.

---

## 1. Ce qui décide réellement aujourd'hui

Cinq mécanismes de décision, tous en code réel, tous relus ligne à ligne cette session — pas des intentions, du code qui s'exécute.

### 1.1 Le contrat — `scripts/forge/contract.py` (porte d'entrée)

Un agent ne se lance **jamais** sans contrat complet. Deux passes obligatoires, dans l'ordre :

- **C1 — validation** (`validate_contract`) : 17 champs au total — **14 Critiques** (`role, capability_role, exigences_cognitives, memoire, mandatory_read, objectif, in_scope, out_of_scope, permissions, gardeFou, success_criteria, tests_oracles, final_report, output_contract`), **2 Importants** (`skill, plugin`), **1 Recommandé** (`delegation_context`). Un champ Critique non `filled` → `ContractIncomplete`, dispatch refusé. Règle des 3 états (`field_state`) : `filled` / `declared_empty` (sentinelle `"aucun"`, décision assumée) / `absent` (un oubli) — anti-freestyle mécanique, pas une convention de prose.
- **C2 — fabrication du payload** (`build_dispatch_payload`) : prompt borné assemblé depuis les champs validés, **RESTITUTION_RULE** injectée verbatim dans chaque prompt (« chaque affirmation du final_report doit citer l'oracle qui l'appuie… vocabulaire OK/FAIL/BLOCKED uniquement »).
- **Résolution du modèle** (`resolve_runtime`) : le contrat ne fixe **jamais** un modèle en dur — il déclare un `capability_role`, et c'est le registry local (`control_plane.registry.get_model_for_role`, lit `openclaw/capabilities.yaml` + `scripts/forge/contracts/roles.yaml`) qui force le runtime. Rôle non résolu → `RoleUnresolved` (refus, sous-classe de `ContractIncomplete`).

**Décide quoi** : si un agent peut être activé, avec quel modèle, avec quels outils (`_declared_tools`), avec quel prompt exact.

### 1.2 Le dispatch — `scripts/forge/dispatch.py` (la porte unique, auditée)

`prepare_dispatch(etape, run_id)` : charge le contrat → construit le payload (via 1.1) → **append un enregistrement d'audit signé HMAC** dans `lab/forge_evidence/dispatch_audit.jsonl`. Ne spawn **rien** lui-même — retourne le payload que l'orchestrateur (le skill `/forge`) utilise pour le spawn réel.

- **`ORDER`** : 13 étapes canoniques de la chaîne "full" (s0-contrat → s12-verdict). C'est une **séquence fixe câblée en dur**, pas un graphe de dépendances dynamique — confirmé, pas de `planner` au sens où le modèle conceptuel de la session précédente l'entendait.
- **`DETERMINISTIC`** : 4 étapes (s10a/b/c-oracle-*, s12-verdict) exécutées par oracle, jamais par un LLM.
- **`PROFILES`** : `full` / `patch` / `review` / `micro` / `artbible` / `increment` — sous-ensembles proportionnés de `ORDER`. Note explicite dans le code : le profil `micro` existe **suite à un finding red-team** (chesscolor) qui a jugé disproportionnée la cérémonie 13-étapes sur une fonction triviale — preuve que ce mécanisme a déjà appris d'un incident réel, pas une anticipation théorique.
- **`s2.5-artbible`** est délibérément **hors** `ORDER` (décision de portée ratifiée Pierre 2026-07-14, pas un oubli) mais dispatchable via son propre profil dédié.

**Décide quoi** : l'ordre d'exécution de la chaîne selon le profil choisi, et trace chaque dispatch de façon infalsifiable (HMAC).

### 1.3 Le hook de garde — `scripts/forge/hook_guard.py` (le videur à la porte du spawn réel)

`hook_decision(tool, prompt)` — appelé par `.claude/settings.json` (`PreToolUse` sur `Task`/`Agent`, confirmé actif la session précédente) :
- **Fail-OPEN hors périmètre Forge** : pas d'outil concerné, ou aucun marqueur `FORGE_DISPATCH` dans le prompt → toujours autorisé. Le hook ne gêne jamais un usage non-Forge de l'outil Agent.
- **Fail-CLOSED en périmètre Forge** : dès qu'un marqueur `FORGE_DISPATCH:<etape>:<run_id>` est présent, `check_spawn` doit trouver dans `dispatch_audit.jsonl` une ligne correspondante **avec un HMAC valide** (`verify_audit_line`) — pas juste une ligne présente, une ligne **signée**. Toute exception pendant la vérification → refus (code 2), jamais un laissez-passer silencieux.

**Décide quoi** : si un spawn d'agent peut réellement avoir lieu, au moment même du spawn (pas juste en amont au dispatch).

### 1.4 Le gate oracle — `scripts/forge/gate.py` (bascule oracle → verdict)

`forge_gate(project)` : résout l'oracle de l'étape, l'exécute, transforme le résultat en `Verdict` signé. Ne lève **jamais** d'exception pour un échec opérationnel d'oracle — retourne toujours un verdict signé, avec `software_verdict: BLOCKED` si l'oracle est mal configuré ou inexécutable. Le code documente explicitement : *« le caller (le skill /forge) NE DOIT PAS avancer au-delà d'un gate non-OK — c'est l'enforcement runtime que superpowers ne fournit pas. »*

**Décide quoi** : si la chaîne peut avancer à l'étape suivante après une étape déterministe.

### 1.5 L'escalade — `scripts/forge/escalate.py` (montée en tier, bornée)

`escalation_decision()` : ré-exécute le **même contrat** sur un tier de modèle supérieur (échelle `haiku → sonnet → opus`, familles de modèles, jamais de version en dur — ADR-002 gate 1) si (a) le sous-agent le demande explicitement (`ESCALATE_REQUEST:` ou `"escalate": true`) ou (b) l'oracle échoue après le build. Bornée par `MAX_ESCALATIONS = 2`. Au sommet de l'échelle avec échec persistant → **pas de boucle**, remontée explicite vers HumanGate. Le code note : *« Fable est l'ORCHESTRATEUR de la chaîne, pas un tier de build »* — confirme que l'escalade est un mécanisme Forge interne, distinct du rôle de pilotage Fable.

**Décide quoi** : si une tâche mérite un modèle plus capable, avec un plafond dur pour ne jamais dégénérer en boucle.

---

## Mécanismes annexes (arbitrage, pas décision d'activation)

### Le routeur runtime — `scripts/forge/runtime.py`

`route_step(payload)` honore le `provider` résolu par le contrat (1.1) : `lmstudio` (Qwen 14B réel si LM Studio:1234 est up, sinon **dégradation visible et tracée** vers Claude en contexte vierge — jamais un échec silencieux), `claude-local` (Claude via l'outil Agent), `forge` (étape déterministe, garde contre le routage accidentel d'un oracle comme un LLM). Ce n'est pas une décision d'activation (le contrat a déjà décidé) mais une décision **d'exécution** : qui honore réellement l'étape.

### Le panel Prisme — `scripts/forge/panel.py`

Mécanisme d'arbitrage multi-perspective pour l'étape `s1-prisme` : N "lenses" isolées (`ceo, game_designer, front, back, joueur`), chacune en contexte vierge (ne voit que le charter, jamais les autres lenses ni le contrôle), recombinées par `merge_prisme.mjs` — **déterministe, zéro LLM-arbitre**. C'est la promotion en mécanisme réel de l'expérience labo `WFL-02` (confirmée cette session comme "promue, superseded" dans `lab/workflow_lab/`) — preuve concrète que cette expérience a bien été absorbée dans le système vivant, pas juste citée en doc.

---

## Ce qui prouve (evidence layer)

- **`lab/forge_evidence/dispatch_audit.jsonl`** — chaque dispatch, signé HMAC (`sign_audit_record`/`verify_audit_line`, clé dans `scripts/forge/.forge_key`, jamais générée au moment de la vérification — `_read_key` ne fabrique pas de clé si absente).
- **`scripts/forge/verdict.py`** — `Verdict` (project, software_verdict, evidence_verdict, claim_verdict, returncode, evidence_path). `claim_verdict` **toujours** `"NO_CLAIM_ALLOWED"` (constante, pas une valeur au choix de l'agent). `evidence_verdict` **toujours** `"MECHANICAL_VALIDATION_ONLY"`. Seul `software_verdict` varie (OK/FAIL/BLOCKED), et uniquement en fonction du résultat de l'oracle déterministe — jamais d'une auto-évaluation de l'agent.
- **`lab/forge_runs/<run>/artifacts/*.txt`** — marqueurs `FORGE_DISPATCH:<etape>:<run_id>` retrouvés et vérifiés cette session dans `shmup_slice`, datés 2026-07-14.
- **`knowledge_base/proofs/*.log`** — preuves de validation datées (rôles gameplay), exception explicite au `.gitignore` (« preuves permanentes »).

## Ce qui exécute (sans décider)

- Le sous-agent lui-même (Claude via l'outil Agent, ou Qwen via `runtime.py`) — exécute le contrat, ne décide ni de son activation ni de son verdict.
- `driver.py` (917 lignes, non relu ligne à ligne cette session — orchestrateur de la state machine globale, appelle `oracle.py`/`static_oracles.py` aux points de preuve) : à confirmer en détail si un futur audit en a besoin, non bloquant ici.

## Le human gate

- **`lab/chains/HUMANGATE_DECISION_LOG.yaml`** + `lab/chains/hg_queue.py` — CLI manuel, confirmé implémenté la session précédente (IMPLEMENTED, dernier commit réel 2026-05-31 — jamais auto-invoqué depuis, cohérent avec son rôle : un humain le déclenche quand il décide, pas un cron).
- C'est le point de sortie explicite de l'escalade (1.5) au sommet de l'échelle, et de tout gate oracle non-OK sans oracle disponible (`claim_verdict: NO_CLAIM_ALLOWED` → « remonte un besoin HumanGate, jamais un claim auto-certifié », texte injecté verbatim par `RESTITUTION_RULE`).

## Le routing (où vit quoi)

- **`FILE_ROUTING_MANIFEST.yaml`** — seul YAML de tout l'audit précédent avec statut TESTED complet (consommateur réel `doc_hygiene_chain.py`/`studio_context_builder.py` + tests réels). Pas un mécanisme de *décision* d'agent, mais la source de vérité de "où un fichier doit vivre" — appartient à la couche décisionnelle au sens large (gouvernance de l'arborescence).

---

## 2. Décide / exécute / prouve / documenté seulement — tableau de synthèse

| Composant | Décide | Exécute | Prouve | Documenté seulement |
|---|---|---|---|---|
| `contract.py` (C1/C2) | ✅ activation, modèle, outils | — | — | — |
| `dispatch.py` (ORDER/PROFILES) | ✅ ordre de chaîne | — | ✅ audit HMAC | — |
| `hook_guard.py` | ✅ autorisation du spawn réel | — | — | — |
| `gate.py` | ✅ avancer ou non après oracle | — | ✅ verdict signé | — |
| `escalate.py` | ✅ montée de tier, plafonnée | — | — | — |
| `runtime.py` | — | ✅ qui honore l'étape | — | — |
| `panel.py` | — | ✅ recombinaison déterministe | — | — |
| `verdict.py` | — | — | ✅ software/evidence/claim séparés, signés | — |
| `lab/forge_evidence/dispatch_audit.jsonl` | — | — | ✅ trace infalsifiable | — |
| `lab/chains/HUMANGATE_DECISION_LOG.yaml` + `hg_queue.py` | ✅ (l'humain, via CLI) | — | ✅ log des décisions | — |
| `FILE_ROUTING_MANIFEST.yaml` | ✅ (où vit un fichier) | — | — (testé mais déclaratif) | — |
| `scripts/forge/contracts/roles.yaml` | ✅ (résolution modèle) | — | — | — |
| `scripts/forge/contracts/redteam-artdirector.yaml` | — | — | — | ✅ jamais chargé par le mécanisme réel (confirmé session précédente) |
| `scripts/forge/contracts/s10d-oracle-visual.yaml` | — | — | — | ✅ hors chaîne, auto-documenté comme tel |
| `docs/forge/STUDIO_ARCHITECTURE.md`, `STUDIO_AGENT_ATLAS.md` | — | — | — | ✅ cartes de référence (statut PROPOSED), pas chargées par du code |
| `lab/agent_policy/*.json` (5 fichiers) | — (gelé) | — | — | ✅ legacy, sert uniquement la lane STUDIO gelée |

---

## 3. Trous réels (déjà confirmés avec preuve, pas de nouvelle hypothèse ici)

1. **`capability`/`policy` dispersés, pas assumé** — aucune matrice read/write/execute unifiée et vivante à l'échelle du studio. `lab/agent_policy/*.json` est le seul candidat historique, gelé, et connu bugué (`autopilot.py:_check_tool_permission` ignore `agent_id`, fail-open — CLAUDE.md le documente lui-même comme dette gelée non corrigée).
2. **2 contrats sur 17 hors mécanisme réel** — `redteam-artdirector.yaml` (jamais chargé par convention, usage manuel de labo uniquement) et `s10d-oracle-visual.yaml` (hors chaîne, mais honnêtement auto-documenté — pas une dérive silencieuse comme le premier).
3. **`canonical-ci.yml`** — la seule CI automatique du repo référence `LAB_POLICY_BOOTSTRAP.md` à la racine, absent (archivé sous `repos/games/studioV2_MIGRATED_HOLD/`). Cassera au premier déclenchement réel.
4. **`lab/model_registry.yaml`** — `scripts/learning_loop.sh` prétend en commentaire qu'il pilote la décision compare/deploy ELO ; le code réel ne le lit/écrit jamais sur le chemin de déploiement (seulement dans une ligne de log dry-run).
5. **`lab/chains/phi_schema.yaml`** — chemin déclaré dans `studio_end.py`, jamais ouvert/parsé.
6. **`SCHEMA.md`** — incohérence interne mineure : en-tête dit "16 champs", le code (`contract.py`) applique et sa propre table listent 17 (confirmé en relisant `contract.py` cette session : 14 CRITICAL + 2 IMPORTANT + 1 RECOMMENDED = 17).
7. **`driver.py`** (917 lignes) n'a pas été relu ligne à ligne cette session — c'est la pièce la plus grosse et la moins auditée du mécanisme de décision. Zone d'ombre à noter, pas un trou confirmé.

## 4. Recommandations

Aucune ici — le plan validé par Pierre est explicite : *« Ne pas construire une nouvelle couche avant d'avoir prouvé les trous. »* Ce document constate, il ne prescrit pas. La décision sur la suite (Livrable 4, `PROPOSITION_DECISION_LAYER.yaml`) reste conditionnée aux Livrables 2 et 3.

---

```
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
Pas de verdict global. État des surfaces uniquement, à cette date.
