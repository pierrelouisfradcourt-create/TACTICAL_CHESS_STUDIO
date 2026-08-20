# World Scan — Skills d'agents IA : bonnes pratiques externes vs usage local

**Statut : PROPOSED**
**Date : 2026-07-28**
**Nature : advisory-only — aucune décision engagée par ce document. Décision = Pierre (HumanGate).**
**Mission : audit factuel + recherche web citée, aucun commit/push, aucune modification de code ni de contrat.**

---

## §1. Inventaire local factuel

### 1.1 Table de routing déclarée (CLAUDE.md)

La section « Routing » de `C:\TACTICAL_CHESS_STUDIO\CLAUDE.md` déclare 14 correspondances intention → skill :

| Intention | Skill routé |
|---|---|
| générer un jeu / forge | `/forge` |
| oracle / vérification | `/smoke-check` |
| IMP status | `/sprint-status` |
| IMP pickup | `/imp-readiness` |
| architecture | `/architecture-review` |
| code | `/code-review` |
| plan | `/plan` |
| brainstorm / idéation | `/brainstorm` |
| design | `/design-review` |
| balance gameplay | `/balance-check` |
| release | `/release` |
| audit hygiène | `/audit-daily` |
| verdict signé | `/verdict` |
| gate humain | `/gate` |

Plus une liste « legacy gelés » (invocation sur demande explicite Pierre uniquement) : `/autoloop`, `/tick`, `/sprint-plan`, `/sprint-status`, `/imp-readiness`, `/council`. (Note : `/sprint-status` et `/imp-readiness` apparaissent À LA FOIS dans la table active et dans la liste legacy — incohérence brute du fichier, non corrigée ici.)

**14 skills routés** au total (noms uniques) : forge, smoke-check, sprint-status, imp-readiness, architecture-review, code-review, plan, brainstorm, design-review, balance-check, release, audit-daily, verdict, gate.

### 1.2 Skills existant physiquement sur disque

`.claude/commands/` **n'existe pas** dans ce dépôt (vérifié : `ls .claude/commands` → aucun résultat).

`.claude/skills/` contient **38 dossiers de skill**, chacun avec un `skill.md` ou `SKILL.md` :

architecture-review, art-bible, asset-spec, audit-daily, autoloop, balance-check, brainstorm, code-review, council, design-review, estimate, fog, forge, gate, gate-check, handoff, hotfix, imp-readiness, joust, league, monitor, openclaw-install, perf-profile, plan, playtest, reanchor, release, scope-check, setup-engine, smoke-check, sprint-plan, sprint-status, start, team-feature, tech-debt, tick, verdict, world-scan.

### 1.3 Lecture directe des skills cités par la mission

- **`.claude/skills/brainstorm/skill.md`** (4 lignes utiles) : cadre l'idéation — contexte, 3-5 concepts avec effort/oracle, choix du jeu = gate Pierre. Aucun mécanisme de vérification mécanique dans le fichier lui-même.
- **`.claude/skills/plan/skill.md`** (4 lignes) : impose de lire ledger/fog_map, décomposer en étapes/fichiers/oracle/taille, identifier les gates Pierre, puis **attendre le go explicite** avant d'agir. Purement prescriptif — rien qui vérifie mécaniquement que le plan a été lu ni que le go a été donné.
- **`.claude/skills/code-review/skill.md`** (9 lignes) : diff `main...HEAD`, check `unwrap()`/`panic!()`/magic numbers, couverture tests, `cargo test`/`pytest`, verdict [APPROUVER]/[CHANGER]/[BLOQUER]. Aucun hook qui force son exécution avant merge — c'est une procédure textuelle.
- **`.claude/skills/design-review/skill.md`** (9 lignes) : lecture doc design, cohérence/faisabilité, oracle vs jugement, risques scope creep. Même limite : prescriptif, non vérifié mécaniquement par le fichier lui-même.
- **`.claude/skills/forge/skill.md`** (266 lignes, le plus développé du dépôt) : orchestrateur de la chaîne Forge s0→s12. C'est le SEUL skill du dépôt qui a un vrai mécanisme d'enforcement mécanique documenté : le hook `pretool_forge_guard.py` (câblé en `PreToolUse`/`Task` dans `.claude/settings.json`, ligne 35 : `python .claude/hooks/pretool_forge_guard.py`) bloque tout spawn de sous-agent portant le marqueur `FORGE_DISPATCH:<etape>:<run_id>` sans ligne d'audit HMAC valide — **fail-closed en périmètre Forge**. Le skill documente lui-même sa propre limite : « contrôle la présence d'un dispatch signé, pas la conformité modèle/outils/prompt ». Le skill liste aussi 3 **contrats orphelins connus** (écrits, jamais référencés dans aucun profil ni code, vérifiés 2026-07-23) : `s10d-oracle-visual`, `s9-build-godot`, `redteam-artdirector`.
- **`.claude/skills/verdict/skill.md`** (107 lignes) : impose oracle non-LLM + signature HMAC vérifiée avant tout `software_verdict`, trois couches jamais fusionnées, hard rule « HMAC invalide ou absent → stop ». Mécanisme de vérification concret et outillé (`openssl dgst -sha256 -hmac`), mais reste déclenché **par discipline de l'agent qui suit le skill**, pas par un hook qui l'oblige à l'invoquer.
- **`.claude/skills/architecture-review/skill.md`** (9 lignes) : ADR, impact modules, gate Pierre si irréversible. Prescriptif, non vérifié.
- **`.claude/skills/world-scan/skill.md`** (113 lignes) : celui qui produit CE type de rapport — impose `advisory_only: true`, sources citées obligatoires (`source_url` http(s) valide + `source_title`), `claim` ≤ 600 caractères, validé par `knowledge-validate.mjs`. C'est le second skill du dépôt (après `forge`) à avoir un validateur mécanique externe de son propre output.

### 1.4 Champ `skill:` dans les contrats Forge

`scripts/forge/contracts/*.yaml` compte **40 fichiers** au total.

- **39/40** contrats ont un champ `skill:` présent (le seul sans champ du tout : `roles.yaml`, qui n'est pas un contrat d'étape mais la table de résolution rôle→modèle).
- Sur ces 39, **36 déclarent littéralement `skill: aucun`** (valeur explicite « aucun », pas une valeur vide) : a1-audit-chaine-classification, b1-audit-valeur-tests, c1-audit-oracle-produit-colis, d1-audit-boucle-retroaction, m1-telemetrie-echec, n1-findings-redteam-audibles, n2-perimetre-mutation-categorie, n3-oracle-produit-minimal, p1-lignes-wiremap-et-genre-bible, p2-garde-git-mecanique, p3-plan-commits-par-lots, q1-application-decisions-pierre, r1-preuves-boucle-mecaniques, redteam-artdirector, s0-contrat, s1-brancher-le-lecteur, s1-prisme, s10a-oracle-code, s10b-oracle-archi, s10c-oracle-wiremap, s10d-oracle-visual, s10s-branchement-driver, s10s-oracle-standard, s11-redteam-code, s12-verdict, s2.5-artbible, s3-decompo, s5-wiremap, s6-redteam-plan, s9-build-godot, s9-build-standard, s9-build, v1-verify-run-separation, v2-analyse-depot-game-loop, v3-analyse-perimetre-logic-files, v4-brancher-propose-brick.
- **Seuls 3/40 contrats déclarent un vrai skill non vide** : `orchestrator.yaml` → `forge`, `s2-worldscan.yaml` → `world-scan`, `s4-archi.yaml` → `architecture-review`.

**Chiffre exact retenu : 3/40 contrats Forge déclarent un skill exploitable (`forge`, `world-scan`, `architecture-review`) ; 36/40 déclarent explicitement `skill: aucun` ; 1/40 (`roles.yaml`) n'a pas de champ `skill:`.**

### 1.5 Croisement routing CLAUDE.md × déclaration contrat Forge × existence disque

- **Skills routés dans CLAUDE.md ET existant sur disque (14/14)** : tous les 14 skills de la table Routing existent physiquement sous `.claude/skills/`. Aucun routing mort côté CLAUDE.md.
- **Skills déclarés par au moins un contrat Forge** : `forge`, `world-scan`, `architecture-review` (3 skills, cf. 1.4). Les 3 sont aussi présents dans la table Routing CLAUDE.md — **intersection routing∩contrat = {forge, world-scan, architecture-review}**, soit 3 skills.
- **Skills routés dans CLAUDE.md mais déclarés par AUCUN contrat Forge (11)** : smoke-check, sprint-status, imp-readiness, code-review, plan, brainstorm, design-review, balance-check, release, audit-daily, verdict, gate — soit 12 en réalité (comptage : 14 routés − 2 déclarés-hors-forge non comptant deux fois `forge`... reprendre) : sur les 14 skills routés, 3 sont câblés à un contrat (forge, world-scan, architecture-review) ; **11 skills routés n'ont AUCUN contrat Forge qui les cite** : smoke-check, sprint-status, imp-readiness, code-review, plan, brainstorm, design-review, balance-check, release, audit-daily, verdict, gate — soit exactement 11 noms listés (gate est le 11e après retrait des doublons ci-dessus).
- **Skills existant sur disque, mais absents à la fois de la table Routing CLAUDE.md ET d'un contrat Forge (24)** : art-bible, asset-spec, autoloop, council, estimate, fog, gate-check, handoff, hotfix, joust, league, monitor, openclaw-install, perf-profile, playtest, reanchor, scope-check, setup-engine, sprint-plan, start, team-feature, tech-debt, tick — soit **22 candidats « aucun consommateur identifiable »** (ni CLAUDE.md, ni contrat Forge) sur les 38 du disque, une fois retirés les 14 routés et les 2 supplémentaires déclarés par contrat mais non routés (il n'y en a pas — les 3 skills de contrat sont déjà dans les 14 routés). **38 total − 14 routés = 24 non routés**, dont aucun n'est câblé par un contrat Forge non plus (les 3 contrats-skills sont un sous-ensemble des 14 routés) → **24 skills sans consommateur identifiable dans les deux mécanismes audités (CLAUDE.md Routing, `scripts/forge/contracts/*.yaml`)**.

Ceci ne prouve pas que ces 24 skills sont inutiles — beaucoup sont invoqués directement par nom (`/monitor`, `/playtest`, `/hotfix`, `/council`…) sans passer par un routing central ni un contrat Forge, ce qui est un mode d'usage légitime pour un skill Claude Code (invocation manuelle directe). Le chiffre dit seulement : **aucun mécanisme automatisé documenté dans ce dépôt ne les invoque à la place de l'humain.**

---

## §2. Patterns externes cités

1. **Documentation officielle Anthropic — Claude Code Skills** ([code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills)) : les skills sont des fichiers `SKILL.md` que Claude charge automatiquement quand ils sont pertinents, ou que l'utilisateur invoque directement via `/nom`. Les commandes custom historiques (`.claude/commands/*.md`) ont fusionné dans le système de skills — un fichier de commande et un skill produisent le même `/nom`, les skills ajoutant frontmatter de contrôle d'invocation, dossier de ressources et chargement automatique par le modèle. Le système suit le standard ouvert Agent Skills.

2. **MindStudio — Claude Code Skills vs Slash Commands** ([mindstudio.ai/blog/claude-code-skills-vs-slash-commands](https://www.mindstudio.ai/blog/claude-code-skills-vs-slash-commands)) : la distinction clé est l'invocation — commandes = déclenchées par l'utilisateur explicitement, skills = déclenchées par le modèle selon la correspondance prompt/description. Un skill n'apporte donc en soi aucune garantie d'exécution obligatoire ; c'est un mécanisme de découverte, pas d'enforcement.

3. **fbakkensen — Quality Gates for Coding Agents: Stop Hooks** ([fbakkensen.github.io/.../quality-gates-for-coding-agents-how-stop-hooks-make-validation-mandatory.html](https://fbakkensen.github.io/ai/devtools/development/2026/03/27/quality-gates-for-coding-agents-how-stop-hooks-make-validation-mandatory.html)) : les instructions de prompt sont des suggestions, pas des contraintes — un hook `Stop` intercepte la réponse de l'agent avant qu'elle n'atteigne l'utilisateur, scanne la transcription pour détecter des modifications de code, et bloque la réponse tant que les critères (tests lancés, tâches vérifiées) ne sont pas remplis. C'est un mécanisme structurel, pas une discipline déclarative — analogue exact du besoin exprimé par la mission (vérifier qu'un skill a bien tourné, pas qu'il est documenté).

4. **LangChain Forum — enforcing invariant conditions before END node** ([forum.langchain.com/t/how-to-enforce-invariant-conditions-e-g-required-tool-calls-before-entering-end-node-in-langgraph/1024](https://forum.langchain.com/t/how-to-enforce-invariant-conditions-e-g-required-tool-calls-before-entering-end-node-in-langgraph/1024)) : pattern LangGraph pour empêcher la terminaison d'un workflow tant qu'un outil obligatoire n'a pas été appelé — le graphe boucle vers l'agent pour le lui rappeler plutôt que d'accepter une sortie non conforme. Un router conditionnel vérifie l'état accumulé (quels outils ont tourné) avant d'autoriser la transition de phase.

5. **LangGraph — Force Calling a Tool First** ([baihezi.com/mirrors/langgraph/how-tos/force-calling-a-tool-first](https://www.baihezi.com/mirrors/langgraph/how-tos/force-calling-a-tool-first/index.html)) : montre comment forcer explicitement le premier appel d'outil d'un agent (au lieu de laisser le modèle décider), utile pour garantir qu'une étape de recherche/validation a lieu avant toute autre action — un pattern « phase-gated » directement transposable à « skill obligatoire en début de phase ».

6. **ARMO — The CISO's AI Agent Production Approval Checklist** ([armosec.io/blog/ciso-guide-safely-deploying-ai-agents](https://www.armosec.io/blog/ciso-guide-safely-deploying-ai-agents/)) : chaque gate de production doit avoir un standard de preuve concret — « est-ce que ta console montre Y », pas « as-tu X » — et souligne que la plupart des approbations aujourd'hui tamponnent des permissions déclarées faute d'artefact de revue vérifiable. C'est exactement le risque nommé §4 : une obligation déclarée sans vérificateur devient un tampon vide.

7. **arXiv — SoK: Agentic Skills, Beyond Tool Use in LLM Agents** ([arxiv.org/pdf/2602.20867](https://arxiv.org/pdf/2602.20867)) : papier de synthèse académique (Systematization of Knowledge) sur les skills agentiques au-delà du simple appel d'outil — situe les skills comme une couche de procédure réutilisable distincte du raisonnement ad hoc, avec la question ouverte de comment vérifier qu'une procédure déclarée a réellement gouverné le comportement de l'agent plutôt que d'être ignorée silencieusement.

---

## §3. Proposition de table phase → skill obligatoire

Seuls des skills confirmés existants sur disque (§1.2) sont utilisés ci-dessous. Chaque ligne porte un mécanisme de vérification mécanique nommé et réalisable dans ce dépôt, ou `HUMAN_ONLY` si aucun n'est réaliste sans nouveau développement.

| Phase | Skill obligatoire proposé | Mécanisme de vérification mécanique concret |
|---|---|---|
| Exploration | *(aucun skill dédié à l'exploration pure trouvé sur disque — `start` s'en approche : onboarding session → bon workflow)* `start` | **HUMAN_ONLY.** Rien dans ce dépôt ne journalise « quel skill a été invoqué dans cette session ». Un hook `SessionStart` pourrait un jour tracer l'invocation, mais il n'existe pas aujourd'hui (`.claude/hooks/session-start.sh` existe mais ne trace pas de skill — vérification à faire avant d'écrire une ligne d'enforcement ici). |
| Idéation | `brainstorm` | **Mécanisme réaliste, non existant aujourd'hui** : étendre `pretool_forge_guard.py` (déjà actif en `PreToolUse`/`Task`) pour exiger, avant tout premier `Write` créant un fichier de charter/GDD, la présence d'un log `posttool_forge_executed.py` (déjà câblé) référençant l'invocation `brainstorm` pour ce run_id. Tant que cette extension n'est pas écrite : `HUMAN_ONLY`. |
| Architecture | `architecture-review` | **Vérification mécanique déjà partiellement câblée côté Forge** : `s4-archi.yaml` déclare `skill: architecture-review` (§1.4) — le dispatch `forge.dispatch.prepare_dispatch` refuse de spawner l'étape s4 si le contrat est incomplet (`ContractIncomplete`), ce qui est un vrai verrou mécanique **dans le périmètre Forge uniquement**. Hors Forge (ex. changement d'architecture Rust dans `src/chess/`), aucun verrou : `HUMAN_ONLY`. |
| Implémentation | `code-review` | **Pas de hook actuel qui bloque un commit sans passage par `/code-review`.** Un pre-commit hook existe (`.claude/hooks/pre-commit`) mais son contenu n'a pas été audité ici — à vérifier avant d'affirmer un enforcement. En l'état constaté (skill purement prescriptif, cf. §1.3) : `HUMAN_ONLY`, sauf à démontrer que `pre-commit` appelle réellement une trace de `/code-review`. |
| Audit | `audit-daily` | **HUMAN_ONLY** pour l'invocation elle-même (rien ne force son lancement quotidien) ; en revanche son **contenu** produit un rapport daté vérifiable après coup — un futur hook pourrait comparer la date du dernier rapport `audit-daily` à la date du jour et bloquer une action si absent depuis N jours. Non implémenté aujourd'hui. |
| Validation | `verdict` + `gate` | **Le seul couple de la table avec un vrai mécanisme mécanique existant et actif** : `verdict` impose HMAC vérifié (`openssl dgst` recalculé, comparé au `.hmac`, cf. §1.3) avant tout `evidence_verdict: MECHANICAL_VALIDATION_ONLY` — un verdict non signé ou altéré est mécaniquement détectable, pas seulement déclaré. `gate` consomme ce verdict signé et journalise la ratification Pierre dans `studio_brain/decisions/decision-log.md`. Ce couple est le seul de la table où « skill obligatoire » est vérifiable après le fait par un tiers (relance `forge.verify_run` ou recalcul HMAC), pas seulement par confiance dans le rapport de l'agent. |

**Lecture honnête de cette table** : sur 6 phases, seule la phase **Validation** dispose aujourd'hui d'un vérificateur mécanique déjà actif et indépendant de la parole de l'agent (HMAC + `forge.verify_run`). La phase **Architecture** en a un, mais strictement borné au périmètre Forge (`prepare_dispatch`/contrat). Les 4 autres lignes sont `HUMAN_ONLY` en l'état — proposer de les rendre obligatoires sans construire d'abord le vérificateur reviendrait à ajouter une 4e couche « déclarée non exécutée », le mode de panne documenté dans la mémoire du studio (cf. §4).

---

## §4. Risques

### 4.1 Risque principal — « obligation déclarée mais non vérifiée = déclaré ≠ exécuté »

C'est le **mode de panne #1 documenté de ce studio** (mémoire `declared_vs_executed.md` : « 3 mécanismes déclarés inexécutés pendant des mois — agents, matrice, taxonomies »). Ce world scan trouve un exemple frais et concret du même pattern : **36 des 40 contrats Forge déclarent explicitement `skill: aucun`** (§1.4) — ce qui est au moins honnête (le champ existe et dit « aucun » plutôt que de mentir) — mais **11 des 14 skills routés dans la table CLAUDE.md n'ont aucun contrat Forge qui les invoque mécaniquement** (§1.5). Si demain quelqu'un écrit dans CLAUDE.md « `/code-review` est obligatoire avant tout merge », cette phrase resterait, comme les 3 mécanismes déjà cités dans la mémoire du studio, une **promesse de prose sans mécanisme** — exactement le défaut trouvé par l'audit `forge_cognitive_audit.md` (« CLAUDE.md ignore la Forge ») et par `agent_context_audit_20260725.md` (« bootstrap non versionné, mandatory_read sans force, aucune trace de lecture réelle »). Toute ligne du §3 marquée `HUMAN_ONLY` DOIT rester déclarée comme jugement humain tant qu'aucun hook ne l'automatise — l'écrire comme « obligatoire » sans le mécanisme serait reproduire l'incident.

### 4.2 Risque de sur-contrainte

Rendre un skill mécaniquement obligatoire à chaque phase a un coût : latence, friction, et le risque documenté dans la mémoire du studio des « 62 règles de permission legacy » (`lab/agent_policy/*.json`, lane STUDIO gelée) devenues elles-mêmes un poids mort ignoré (« `_check_tool_permission` ignore `agent_id` et échoue en mode ouvert »). Un hook trop strict sur une phase à faible enjeu (ex. exiger `/brainstorm` pour un micro-fix d'une ligne) créerait exactement le theatre de gouvernance que la Forge cherche à éviter ailleurs (cf. `forge_p1_mechanical_falsified.md` — sondes falsifiées avant d'être prouvées). Le profil `/forge --profile micro` existe précisément pour ce cas (proportionnalité, pas de cérémonie 13 étapes) — toute obligation de skill devrait respecter la même proportionnalité, jamais un blanket rule sur toutes les tailles de tâche.

### 4.3 Risque de rapport non vérifié par HumanGate

Ce document lui-même est un candidat à ce risque : c'est un rapport produit par un agent, avec des chiffres comptés mécaniquement (§1, reproductibles par grep/ls) mais une proposition de table (§3) qui reste un jugement de conception. Conformément à la doctrine du studio (`CLAUDE.md` — « HumanGate décide merge/reject/freeze — pas Claude Code »), ce document ne doit **jamais** être traité comme une décision actée : il doit être lu, contesté ou ratifié par Pierre avant qu'aucune ligne du §3 ne devienne une règle réelle (hook, CLAUDE.md, ou contrat Forge modifié). Aucune modification n'a été faite à `CLAUDE.md`, aux hooks, ni aux contrats Forge dans le cadre de cette mission.

---

## Verdict

```
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

`software_verdict: OK` signifie uniquement que ce fichier a été écrit à l'emplacement demandé et que les chiffres du §1 sont ré-exécutables mécaniquement (comptage de fichiers/dossiers/motifs sur disque, reproductible par un tiers) — **pas** que la proposition du §3 est validée ou que le studio doit l'adopter.

---

## Preuve / sources consultées

### Fichiers locaux réellement lus

- `C:\TACTICAL_CHESS_STUDIO\CLAUDE.md` (section Routing)
- `C:\TACTICAL_CHESS_STUDIO\.claude\skills\brainstorm\skill.md`
- `C:\TACTICAL_CHESS_STUDIO\.claude\skills\plan\skill.md`
- `C:\TACTICAL_CHESS_STUDIO\.claude\skills\code-review\skill.md`
- `C:\TACTICAL_CHESS_STUDIO\.claude\skills\design-review\skill.md`
- `C:\TACTICAL_CHESS_STUDIO\.claude\skills\forge\skill.md`
- `C:\TACTICAL_CHESS_STUDIO\.claude\skills\verdict\skill.md`
- `C:\TACTICAL_CHESS_STUDIO\.claude\skills\architecture-review\skill.md`
- `C:\TACTICAL_CHESS_STUDIO\.claude\skills\world-scan\skill.md`
- `C:\TACTICAL_CHESS_STUDIO\.claude\settings.json` (bloc `PreToolUse`, ligne ~29-35)
- Listing complet `C:\TACTICAL_CHESS_STUDIO\.claude\skills\*` (38 dossiers)
- Listing complet `C:\TACTICAL_CHESS_STUDIO\scripts\forge\contracts\*.yaml` (40 fichiers) + grep du champ `skill:` sur chacun
- Listing `C:\TACTICAL_CHESS_STUDIO\.claude\hooks\*` (confirme l'existence de `pretool_forge_guard.py`, `posttool_forge_executed.py`, `pre-commit`, `session-start.sh`)
- Confirmation absence de `C:\TACTICAL_CHESS_STUDIO\.claude\commands\`

### URLs réellement consultées

1. https://code.claude.com/docs/en/skills
2. https://www.mindstudio.ai/blog/claude-code-skills-vs-slash-commands
3. https://fbakkensen.github.io/ai/devtools/development/2026/03/27/quality-gates-for-coding-agents-how-stop-hooks-make-validation-mandatory.html
4. https://forum.langchain.com/t/how-to-enforce-invariant-conditions-e-g-required-tool-calls-before-entering-end-node-in-langgraph/1024
5. https://www.baihezi.com/mirrors/langgraph/how-tos/force-calling-a-tool-first/index.html
6. https://www.armosec.io/blog/ciso-guide-safely-deploying-ai-agents/
7. https://arxiv.org/pdf/2602.20867
