# INFERENCE_ORCHESTRATOR_V2_PROPOSAL

**Statut : PROPOSED — aucune activation, aucune mutation, aucun run payant.**
Date : 2026-07-30 · Auteur : session Inference Orchestrator · Base de preuve : tronc `24afe7d`, campagne de calibration N=3, 43 appels LLM historiques.
`claim_verdict: NO_CLAIM_ALLOWED`

## Convention de marquage

| marque | signification |
|---|---|
| **[M]** | Mesuré — preuve dans le code, les manifestes, les reçus ou les logs du dépôt |
| **[H]** | Hypothèse — plausible, non prouvée, à valider |
| **[E]** | Expérience — test nécessaire avant décision |

Aucune section ne conclut par intuition seule. Là où la mesure est impossible depuis ce poste, c'est écrit.

---

# 1. Audit des skills

## 1.1 Le mécanisme Forge existant — mesuré avant toute proposition

**[M]** Les contrats Forge possèdent déjà deux champs de capacité : `skill` et `plugin`, présents dans **46/46 contrats**.

**[M]** `scripts/forge/contract.py:58` — `IMPORTANT = ("skill", "plugin")`. Ces deux champs sont soumis à la **règle des trois états** (rempli / déclaré vide `aucun` / absent = refus).

**[M]** `contract.py:198-205` — `_declared_tools()` : « Seuls les skill/plugin réellement remplis sont autorisés ». Les valeurs remplies sont collectées et deviennent la liste d'outils du dispatch.

**[M]** `run_real.py:400` — cette liste est passée en `--allowedTools` :
```python
if tools:
    cmd += ["--allowedTools", " ".join(tools), "--permission-mode", "acceptEdits"]
else:
    cmd += ["--permission-mode", "manual"]
```

**[M] État déclaré réel des 46 contrats :**

| valeur de `skill` | nombre |
|---|---:|
| `aucun` | **43** |
| `forge` | 1 |
| `world-scan` | 1 |
| `architecture-review` | 1 |

**[M]** Aucun des trois contrats déclarant un skill n'appartient au profil `standard_godot`. **Le mécanisme n'a donc jamais été exercé dans la chaîne réellement exécutée.**

**[H]** Passer un *nom de skill* (`architecture-review`) dans `--allowedTools`, qui attend des *noms d'outils* (`Bash`, `Read`, `Bash(node:*)`), ne charge probablement pas le skill : les deux espaces de noms sont distincts. C'est le **même défaut de forme** que celui déjà identifié sur le confinement des outils (boucle 4 : `_STEP_TOOLS` utilise la syntaxe allow-list CLI alors que les événements `tool_use` rendent des noms d'API nus).
**[E0]** Vérifier par un dispatch à blanc si un skill déclaré est réellement chargé par l'agent. Coût : un appel. **Prérequis à toute intégration de skill dans un contrat.**

### Conclusion structurelle — la plus importante de cet axe

> **Un skill n'est pas un contrat.**

**[M]** L'invariant ADR-002 est explicite : « Aucun sous-agent sans **contrat validé** : porte `forge.dispatch.prepare_dispatch` + hook `pretool_forge_guard` (ACTIF dans `.claude/settings.json` — fail-closed en périmètre Forge) ».

Il en découle une frontière nette, qui doit gouverner tout l'axe 0 :

| surface | régime | skills |
|---|---|---|
| **La session orchestratrice** (celle avec qui Pierre parle) | hors contrat par construction — elle *est* le HumanGate opérationnel | **libre**. Un skill y est un outil de raisonnement humain-assisté, pas un agent. |
| **Les agents contractualisés** (s0…s12) | porte + hook fail-closed | **gated**. Un skill n'entre que par le champ `skill` d'un contrat validé, et donc par une ratification Pierre. |

Toute proposition d'« intégrer un skill à la Forge » qui ne dit pas de quel côté de cette frontière elle tombe est mal posée.

## 1.2 Skills réellement installés — inventaire mesuré

**[M]** Inventaire relevé sur ce poste, session du 2026-07-30. Aucune supposition.

### a) Skills studio (locaux, `.claude/skills/`) — 43

Chaîne Forge et gates : `forge`, `verdict`, `gate`, `gate-check`, `smoke-check`, `fog`, `handoff`, `release`, `hotfix`.
Conception : `brainstorm`, `plan`, `estimate`, `scope-check`, `design-review`, `architecture-review`, `code-review`, `balance-check`, `playtest`, `world-scan`.
Art/production : `art-bible`, `asset-spec`, `setup-engine`, `perf-profile`.
Ledger/kaizen (**legacy gelés**, triage v2 2026-07-19) : `autoloop`, `tick`, `sprint-plan`, `sprint-status`, `imp-readiness`, `council`.
Autres : `audit-daily`, `tech-debt`, `monitor`, `league`, `reanchor`, `joust`, `team-feature`, `start`, `openclaw-install`.

### b) Skills officiels Anthropic — bundled

`anthropic-skills:*` — `skill-creator`, `mcp-builder`, `consolidate-memory`, `docx`, `pptx`, `xlsx`, `pdf`, `web-artifacts-builder`, `schedule`, `setup-cowork`, `morning`.
`superpowers:*` — `brainstorming`, `writing-plans`, `executing-plans`, `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `requesting-code-review`, `receiving-code-review`, `subagent-driven-development`, `dispatching-parallel-agents`, `using-git-worktrees`, `finishing-a-development-branch`, `writing-skills`, `using-superpowers`.
`design:*` — `design-critique`, `design-system`, `design-handoff`, `accessibility-review`, `user-research`, `research-synthesis`, `ux-copy`.
Système : `claude-api`, `dataviz`, `artifact-design`, `artifact-capabilities`, `simplify`, `security-review`, `review`, `init`, `run`, `loop`, `schedule`, `update-config`, `keybindings-help`, `fewer-permission-prompts`, `frontend-design`.

### c) Permissions et surfaces — mesuré

**[M]** `.claude/settings.json` :

```
allow : Write/Edit(studio_core/**), Write/Edit(studio/openclaw-workspace/**),
        Edit(autopilot.py), Write/Edit(.claude/**)
ask   : Write/Edit(lab/chains/**)
deny  : Bash(rm -rf *), Bash(git push --force*|-f), Bash(git reset --hard*),
        Bash(git clean -fd*), Read(**\.env*), Bash(cat *.env*),
        Write/Edit(.claude/HUMAN_GIT_OVERRIDE.json)
```

**[M]** `hooks.PreToolUse` : `pretool_forge_guard.py` sur matcher `Task` — **actif**.

**[M] Deux constats de sécurité qui découlent directement de cet extrait :**

1. **`Write(.claude/**)` est en ALLOW**, or `.claude/hooks/**` et `CLAUDE.md` figurent dans `reference_protected.yaml`. La garde de référence **détecte** une modification du périmètre gelé ; **rien ne l'empêche**. Détection sans prévention.
2. **`scripts/forge/reference_protected.yaml` n'est protégé par aucune règle deny.** Le fichier qui définit *ce qui est protégé* est lui-même modifiable par une session. Le fichier de dérogation (`HUMAN_GIT_OVERRIDE.json`), lui, l'est bien.

Ce sont des faits, pas des reproches : le périmètre a été étendu la veille du gel et la règle deny était explicitement listée comme « en attente de Pierre ». Ils entrent ici parce qu'une équipe d'agents V2 augmente mécaniquement la surface d'écriture.

## 1.3 Skills communautaires populaires

**Non mesurable depuis ce poste.**

Je ne dispose d'aucune source locale donnant popularité, fréquence de maintenance ou taux d'adoption d'un skill tiers. Produire un classement « populaire / mature / maintenu » reviendrait à inventer des chiffres — exactement ce que la règle d'analyse interdit.

**[E1]** Si cet axe est jugé prioritaire : balayage web sourcé (dépôt, date du dernier commit, nombre d'étoiles, présence de tests), une ligne de provenance par skill, rendu en table Observation/Source/Confiance/Décision.

**[H] — et je la pose parce qu'elle change la valeur attendue de E1 :** l'adoption d'un skill tiers dans le **périmètre contractualisé** de la Forge est structurellement peu attractive. Un skill tiers est du prompt non versionné dans ce dépôt, non couvert par `contract_sha256`, et non re-vérifiable par `forge.verify_run`. Il casserait la propriété qui fait la valeur de la V1 : *toute entrée d'un agent est identifiée par une empreinte reproductible*. Côté **session orchestratrice**, en revanche, le coût d'adoption est nul et la réversibilité totale.

## 1.4 Critère d'adoption appliqué aux skills réellement disponibles

| skill | valeur nouvelle | preuve vérifiable | risque | coût | réversibilité | verdict |
|---|---|---|---|---|---|---|
| `superpowers:brainstorming` | cadre l'exploration avant conception | non (prose) | nul | contexte session | totale | **P0 — session** |
| `superpowers:writing-plans` | plan structuré avant exécution | non | nul | contexte session | totale | **P0 — session** |
| `architecture-review` (local) | ADR daté | **oui — produit un ADR versionné** | nul | 1 appel | totale | **P0 — session** |
| `code-review` (local) | revue avant merge | partielle | nul | 1 appel | totale | **P0 — session** |
| `security-review` (bundled) | revue sécurité du diff | partielle | nul (lecture) | 1 appel | totale | **P1 — sandbox** |
| `superpowers:test-driven-development` | discipline TDD | **oui — les tests** | nul | contexte | totale | **P0 — session** |
| `superpowers:verification-before-completion` | interdit la complétion sans preuve | **oui** | nul | contexte | totale | **P0 — doctrine déjà en vigueur** |
| `claude-api` | tarifs/paramètres à jour, jamais de mémoire | **oui — sourcé** | nul | contexte | totale | **P0 — déjà utilisé** |
| `dataviz` | rendu des mesures de calibration | oui (le graphe) | nul | contexte | totale | **P1** |
| `anthropic-skills:mcp-builder` | construire des ponts MCP | oui (code) | **moyen** — produit du code | appels | totale | **P2** |
| `superpowers:dispatching-parallel-agents` | fan-out d'agents | non | **élevé en périmètre Forge** — contourne la porte | variable | totale | **P2 — interdit côté agents contractualisés** |
| `superpowers:using-git-worktrees` | isolation de branche | oui (l'arbre) | moyen (leçon `codex_worktrees`) | nul | moyenne | **P1** |
| skills tiers non installés | inconnue | inconnue | inconnu | inconnu | inconnue | **hors périmètre tant que E1 n'est pas fait** |

## 1.5 Stratégie SAFE — mapping sur l'existant

**P0 — Safe immédiat (session orchestratrice uniquement, aucun contrat touché)**
`superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:test-driven-development`, `superpowers:verification-before-completion`, `architecture-review`, `code-review`, `claude-api`, `plan`, `estimate`, `scope-check`.
→ **Aucune action requise : tous déjà installés et invocables.** Le gain n'est pas d'installer, c'est de *déclarer quand les invoquer*.

**P1 — Sandbox (usage borné, sortie lue mais non décisionnelle)**
`security-review`, `dataviz`, `tech-debt`, `audit-daily`, `superpowers:using-git-worktrees`, `world-scan`.

**P2 — Expérimental (jamais avant que la couche d'audits V2 existe)**
`superpowers:dispatching-parallel-agents`, `superpowers:subagent-driven-development`, `anthropic-skills:mcp-builder`, tout skill tiers.

---

# 2. Architecture actuelle

## 2.1 Surfaces déterministes — correctes, à ne pas toucher

**[M]** `dispatch.py` : `DETERMINISTIC = ("s10a-oracle-code", "s10b-oracle-archi", "s10c-oracle-wiremap", "s12-verdict")`, plus `DEDICATED_DETERMINISTIC_STEPS = ("s10s-oracle-standard",)`.
**[M]** `runtime.py:88` : une étape `provider: forge` est gardée en `RUNNER_ORACLE` — elle ne *peut pas* être routée vers un LLM.

## 2.2 Profil `standard_godot` — la chaîne réellement exécutée

| étape | rôle | modèle | raisonnement | runner | change `software_verdict` ? |
|---|---|---|---|---|---|
| s9-build-godot-standard | `game_forger` | claude-opus-4-8 | `high` | claude | produit le code |
| s10a-oracle-code | `deterministic` | non-llm | — | oracle | **oui** |
| s10s-oracle-standard | `deterministic` | non-llm | — | oracle | **oui** |
| s11-redteam-code | `redteam_code` | claude-opus-4-8 | `high` | claude | **non** |
| s12-verdict | `deterministic` | non-llm | — | oracle | agrège + signe |

**[M]** `verdict.py:300` : « Le red-team n'entre JAMAIS dans le calcul de `software_verdict` ».
**[M]** `verdict.py:391` : `elif redteam_blocked or triage_exception or extra_advisory:` → `DECISION_READY_OBJECTION`.

## 2.3 Structure de dépense — 43 appels, 20 runs, 6 projets

| étape | n | méd. $ | total $ | part |
|---|---:|---:|---:|---:|
| s9-build-godot-standard | 14 | 4,472 | 72,36 | 42,6 % |
| s11-redteam-code | 18 | 3,378 | **57,58** | **33,9 %** |
| s9-build-standard | 2 | 9,883 | 19,77 | 11,7 % |
| s9-build | 3 | 6,225 | 13,25 | 7,8 % |
| conception (s0, s2, s2.5, s3, s4, s5) | 6 | — | **6,71** | **4,0 %** |
| **total** | **43** | | **169,66** | |

**[M] Build + red-team = 96 % de la dépense d'inférence. Toute la couche de conception = 4 %.**

## 2.4 Calibration N=3 — bande de bruit du tronc gelé

**[M]** Chaîne déclarée identique aux 3 runs (mêmes `contract_sha256`, mêmes `model_executed`), `git_head = 24afe7d`, garde `CLEAN | 357 | 9aea255c…`, `games/snake` restauré entre chaque run.

| | run 1 | run 2 | run 3 | étendue/médiane |
|---|---|---|---|---|
| tokens | 73 406 | 82 160 | 66 798 | 20,93 % |
| durée | 1 327,8 s | 1 451,1 s | 1 220,7 s | 17,35 % |
| équiv. tarif API | 7,0616 $ | 7,2358 $ | 5,8187 $ | **20,07 %** |

**[M]** Résultat fonctionnel **strictement identique** aux 3 runs : `OK` / `HUMANGATE_READY_WITH_OBJECTION` / mêmes 4 drapeaux / 0 escalade.
**[M]** Variance concentrée sur s11 (30–32 %) contre s9 (8–22 %).

**Lecture : la sortie est stable, la consommation ne l'est pas.** Toute mutation V2 devra battre une bande de bruit de ~20 % pour être détectable — c'est le seuil de détectabilité de toute expérience proposée plus bas.

---

# 3. Limites actuelles

## L1 — Le red-team consomme 34 % du budget sans pouvoir changer le verdict

**[M]** Dans les 3 runs de calibration, `decision` valait `WITH_OBJECTION` **déjà par `triage_exception`** (survivant de mutation). Retirer s11 n'aurait changé ni `software_verdict` ni `decision`. Coût de sa contribution marginale sur ces 3 runs : **11,17 $ pour zéro bit décisionnel**.

**[H]** Généralisable : dès qu'un oracle est rouge ou qu'un survivant est trié, s11 est décisionnellement muet.
**[E2]** Rejouer les 18 verdicts historiques, compter les cas où s11 est **seul** déterminant de `decision`. Coût inférence : **0**.

## L2 — Le reviewer « indépendant » n'est pas indépendant, et son drapeau est une constante

**[M]** `driver.py:1913` — `redteam_ran = bool(d.get("qwen_ok"))`.
**[M]** `driver.py:521-524` — `qwen_ok` ne passe à `True` que dans la branche `RUNNER_QWEN`.
**[M]** s11 déclare `provider: claude-local` → `runtime.py:92` rend `RUNNER_CLAUDE`, sans jamais atteindre cette branche.
**[M]** `s6-redteam-plan` — seul porteur du rôle `redteam_reviewer` (Qwen) — **n'appartient pas au profil `standard_godot`**.

**Conséquence : dans ce profil, le drapeau « red-team dégradé : reviewer indépendant n'a pas tourné » est allumé à 100 % par construction.** C'est le motif de variance nulle ratifié le 2026-07-21 : un indicateur constant valide le câblage mais ne mesure pas ce que son nom promet.

Au fond, s11 obtient une indépendance **de contexte** (le diff sans les justifications du builder) — réelle et utile. Il n'obtient pas l'indépendance **de modèle** visée par le gate 4 d'ADR-002 : builder et red-team sont le même `claude-opus-4-8`.

## L3 — Le raisonnement est attaché au modèle, jamais au rôle

**[M]** `roles.yaml` déclare `reasoning` **au niveau du modèle**. `claude-opus-4-8` porte **9 rôles** : `run_orchestrator`, `contract_author`, `prisme`, `art_director`, `decompose`, `architect`, `wiremap`, `redteam_code`, `game_forger`.
**[M]** `run_real.py:325` — `_effort_flag_for_model(model)` résout **par modèle**.

**Il est aujourd'hui structurellement impossible de donner un effort différent à `architect` et à `redteam_code`.** Un bouton pour neuf rôles, alors que les contrats déclarent des exigences explicitement opposées — « raisonnement architecture profond, effort élevé » (s4) contre « exécution bornée et déterminisme obsessionnel » (s9-build).

**C'est le verrou principal de toute politique de routage V2.** Rien d'autre ne peut être fait proprement avant lui.

## L4 — L'escalade existe mais n'a aucune prise sur la dépense réelle

**[M]** `escalate.py:19` — `LADDER = ("haiku", "sonnet", "opus")`, périmètre **builders uniquement**.
**[M]** `standard_godot` utilise `game_forger` (opus) et `redteam_code` (opus) : tous deux au sommet de l'échelle.
**[M]** 0 escalade sur les 3 runs, `steps_with_retries: {}`.
**[M]** `roles.yaml` documente lui-même la réserve de Pierre — « l'orchestrateur ne doit pas consommer le tier maximal en permanence » — en la marquant explicitement *« INTENTION, pas une politique active »*.

**Il n'existe aucun mécanisme de dés-escalade.** L'échelle est unidirectionnelle.

## L5 — Le coût de contexte : un plancher mesuré, une décomposition impossible

**[M]** Constante d'environnement, appel-témoin trivial : `cache_creation = 32 775` tokens, `cache_read = 32 824`.
**[M]** `run_real.py:442-449` — `tokens = input_tokens + output_tokens`. **Les champs de cache sont lus puis jetés.**
**[M]** Indice indirect : sur s9, variance en tokens 22,2 % mais en dollars 7,8 % — une composante stable importante amortit le chiffre en dollars.
**[H]** Valorisée aux tarifs Opus (écriture cache 1 h = 2× l'entrée = 10 $/M ; lecture = 0,5 $/M) : **≈ 0,344 $/appel**, ~10 % d'un run à 2 appels. Marqué [H] : la mesure a été prise sur Sonnet, j'extrapole les tarifs.

**Nous ne pouvons pas aujourd'hui séparer coût de contexte et coût de raisonnement.** Toute optimisation faite avant de lever L5 est aveugle.

## L6 — Le champ `skill` est validé mais probablement mal câblé

**[M]** `_declared_tools()` verse les valeurs `skill`/`plugin` remplies dans `--allowedTools`.
**[H]** Un nom de skill dans `--allowedTools` ne charge pas le skill — espaces de noms distincts. Même forme de défaut que le confinement d'outils (boucle 4).
**[M]** 43/46 contrats déclarent `aucun` ; les 3 exceptions sont hors du profil exécuté. **Jamais exercé.**

## L7 — Détection sans prévention sur le périmètre gelé

**[M]** `Write(.claude/**)` est en **allow** ; `.claude/hooks/**` et `CLAUDE.md` sont dans `reference_protected.yaml`. La garde constate, rien n'empêche.
**[M]** `reference_protected.yaml` lui-même n'est couvert par aucune règle deny.

---

# 4. Architecture cible

## 4.1 Principe directeur

> **La diversité des erreurs prime sur la profondeur partout.**
> Un même modèle ne doit pas concevoir, construire **et** critiquer.

*(Correction Pierre, 2026-07-30. Version antérieure de ce document : « un appel LLM se justifie par sa capacité à changer une décision ». Ce critère reste valide — il gouverne §6.2 — mais il est **subordonné** : il dit s'il faut appeler, pas qui appeler.)*

**[M] Le défaut que ce principe nomme est déjà mesuré.** `roles.yaml` fait porter à `claude-opus-4-8` **neuf rôles** simultanés, dont `architect` (conception), `game_forger` (construction) **et** `redteam_code` (critique). Le contradicteur partage donc son entraînement, ses biais et ses angles morts avec l'agent qu'il contredit.

**[H]** Deux modèles de familles différentes ne se trompent pas aux mêmes endroits. C'est l'hypothèse centrale de la V2 — elle est **testable** (§9) et n'est adoptée par aucune section de ce document tant qu'elle ne l'est pas.

**Conséquence sur la lecture de L3 :** le déverrouillage rôle→raisonnement n'est pas un mécanisme d'économie. C'est le **prérequis mécanique de la décorrélation**. Tant qu'un modèle porte neuf rôles, aucune diversité n'est exprimable.

## 4.2 Les cinq corps de métier

```
                       ┌────────────────────────────────┐
                       │    ORCHESTRATEUR  (session)    │
                       │    Opus/Fable · skills libres  │
                       │    choisit QUI, QUAND, POURQUOI│
                       └───────────────┬────────────────┘
                                       │ porte prepare_dispatch (contrat obligatoire)
   ┌──────────┬──────────┬─────────────┼─────────────┬──────────┬────────────┐
   ▼          ▼          ▼             ▼             ▼          ▼            ▼
┌────────┐┌────────┐┌─────────┐┌─────────────┐┌──────────┐┌─────────┐┌────────────┐
│EXPLORER││ARCHITEC││CONCEPTEUR││CONSTRUCTEUR ││CONTRADIC.││AUDITEUR ││  PREUVE    │
│ Gemini ││  Opus  ││  Sonnet  ││ Qwen Coder  ││   Qwen   ││  Qwen   ││  non-LLM   │
│ + web  ││ xhigh  ││  medium  ││  (à tester) ││ indépend.││permanent││déterministe│
├────────┤├────────┤├─────────┤├─────────────┤├──────────┤├─────────┤├────────────┤
│s2 world││s4 archi││s1 prisme ││s9 build     ││s6 plan   ││6 audits ││s10a s10s   │
│  scan  ││s5 wire ││s3 décompo││             ││s11 code  ││primaires││s12 verdict │
│        ││s0 contr││s2.5 art  ││             ││          ││+composés││mutation    │
└────────┘└────────┘└─────────┘└─────────────┘└──────────┘└─────────┘└────────────┘
     │         │          │            │            │           │           │
     └─── advisory ───────┴── produit ─┴────── objection ────────┘           │
                                                                             │
                            seul juge de software_verdict ───────────────────┘
                                       │
                                       ▼
                             HumanGate (Pierre)
```

**Trois familles de modèles distinctes couvrent conception / construction / critique.** C'est la traduction directe du principe §4.1 : `architect` (Anthropic Opus), `game_forger` (Qwen Coder), `redteam_code` (Qwen instruct) ne partagent plus le même entraînement sur les trois fonctions.

**[H] Réserve à porter dans l'expérience :** `game_forger` et `redteam_code` resteraient tous deux de famille Qwen. La décorrélation construction↔critique serait donc **partielle** — `qwen2.5-coder` et `qwen2.5-instruct` partagent une base. E4 et E7 doivent mesurer si cette corrélation résiduelle est visible ; si elle l'est, le contradicteur repasse sur une troisième famille (Sonnet, ou `devstral`/`mistral` déjà présents localement).

**La règle de flux ne change pas** : seule la colonne PREUVE peut écrire `software_verdict`. Les six autres produisent des entrées, des propositions ou des objections. C'est l'invariant V1 et il est **non négociable**.

## 4.3 Ce que la V2 ajoute

| ajout | résout | nature |
|---|---|---|
| Raisonnement porté par le **rôle** | L3 | schéma |
| Red-team **conditionnel** | L1 | politique de routage |
| Indépendance **déclarée et rapportée** | L2 | champ + reçu |
| Échelle **bidirectionnelle** (tier de départ ≠ tier max) | L4 | politique |
| Capture des champs de cache | L5 | branchement |
| Couche d'**auditeurs Qwen permanents** | angles morts | nouvelle capacité |

---

# 5. Matrice rôle → modèle → raisonnement

**Statut des lignes ● : DOCTRINE RATIFIÉE Pierre 2026-07-30.**
**Statut de leur MISE EN ŒUVRE : bloquée par R1, et — pour `game_forger` et `redteam_code` — conditionnée à E7/E4.**

Distinction à ne pas perdre : Pierre a ratifié **où doit aller la diversité**, pas **que le résultat sera meilleur**. Aucune ligne n'est validée par une mesure de qualité — aucune n'existe encore dans le dépôt.

> **Règle d'évolution de la matrice — ratifiée Pierre 2026-07-30 :**
> *« On ne changera la matrice qu'après mesure sur des tâches réelles, jamais sur des benchmarks généraux. »*
>
> Un classement public de modèles n'est **jamais** une preuve recevable ici. La seule preuve admissible est une mesure produite par la chaîne, sur une tâche de ce studio, avec sonde-contrôle (§9.2).

## 5.0 Doctrine d'affectation — ratifiée Pierre 2026-07-30

| famille | domaine | raison |
|---|---|---|
| **Opus** | décisions architecturales critiques, arbitrages, synthèse complexe | l'erreur y coûte le plus cher et contamine l'aval |
| **Sonnet** | conception structurée, lecture produit, documentation | structure et clarté priment sur la profondeur maximale |
| **Qwen** | contradiction, code, red-team, audits indépendants | **indépendance cognitive** — famille distincte de la conception |
| **Gemini** | exploration du monde extérieur, recherche, références | capacité de recherche externe, **jamais décisionnaire** |
| **Haiku** | tâches simples et peu critiques | proportionnalité |

> *« L'objectif n'est pas de remplacer Opus, mais d'éviter qu'un même modèle fasse conception, construction et critique. »*

**Marquage des lignes : ●** arbitré explicitement par Pierre le 2026-07-30 · **○** proposé par extension de la doctrine, **en attente d'arbitrage**.

## 5.1 Matrice

| | rôle | modèle actuel | raisonn. | **modèle cible** | **raisonn.** | criticité | justification |
|---|---|---|---|---|---|---|---|
| ○ | `contract_author` (s0) | opus-4-8 | high | **opus-4-8** | high | haute | le contrat gouverne tout le run — arbitrage, pas production. À trancher. |
| ● | `prisme` (s1) | opus-4-8 | high | **sonnet-5** | medium | haute | *« apporter une lecture différente et structurée, pas la profondeur maximale »*. Option : **second regard Qwen** (§5.2). |
| ● | `worldscan` (s2) | haiku-4-5 | low | **gemini** | n/a | basse | exploration externe. **[M]** le contrat déclare déjà `run: WebSearch, WebFetch` et `advisory: true`. |
| ○ | `art_director` (s2.5) | opus-4-8 | high | **sonnet-5** | medium | moyenne | synthèse créative **bornée par la forme** = production structurée. |
| ○ | `decompose` (s3) | opus-4-8 | high | **sonnet-5** | medium | haute | décomposition Système→Feature = structure. Mais alimente s4 — à trancher. |
| ● | `architect` (s4) | opus-4-8 | high | **opus-4-8** | **xhigh** | **maximale** | *« Opus reste justifié. »* Le contrat déclare « raisonnement architecture profond, effort élevé ». |
| ● | `wiremap` (s5) | opus-4-8 | high | **opus-4-8** | high | **maximale** | *« surface critique : une mauvaise compréhension de l'architecture peut contaminer toute la chaîne »*. |
| ● | `redteam_reviewer` (s6) | **qwen2.5-14b** | false | **qwen2.5-14b** | n/a | moyenne | **[M] déjà correct.** Le problème n'est pas le modèle, c'est que l'étape **est hors du profil `standard_godot`**. |
| ○ | `builder` (s9) | haiku-4-5 | low | **haiku-4-5** | low | basse | brique isolée — inchangé. |
| ● | `game_forger` (s9-std) | opus-4-8 | high | **qwen2.5-coder-14b** → **E7** | n/a | **maximale** | *« Qwen Code est à tester sérieusement »*. **[M] modèle présent localement.** 43 % de la dépense. **Adoption conditionnée à E7.** |
| ● | `redteam_code` (s11) | opus-4-8 | high | **qwen2.5-14b** → **E4** | n/a | **nulle sur le verdict** | *« Qwen est préférable pour challenger le builder »*. Advisory par contrat : une régression ne casse rien mécaniquement. |
| ○ | `run_orchestrator` | opus-4-8 | high | **sonnet-5** | medium | moyenne | conduite de run = coordination. Instrumente la réserve ratifiée du 2026-07-23. |
| ○ | `forge_toolsmith` | sonnet-5 | high | **sonnet-5** | high | moyenne | inchangé. |
| — | `deterministic` | non-llm | — | **non-llm** | — | **maximale** | **intouchable.** |

## 5.2 Le second regard sur s1 — option ouverte par Pierre

*« Sonnet (ou Sonnet + Qwen en second regard) »*.

Deux formes possibles, qui n'ont pas le même coût ni le même sens :

| forme | mécanisme | coût | ce qu'elle apporte |
|---|---|---|---|
| **séquentiel** | Sonnet produit le `product_snapshot`, Qwen le relit et rend des objections advisory | +1 appel local (gratuit) | contradiction sur la lecture produit |
| **parallèle** | Sonnet et Qwen produisent chacun leur lecture, l'orchestrateur synthétise | +1 appel local + 1 synthèse | **diversité de lecture**, plus proche de l'intention « Prisme » |

**[H]** La forme parallèle est plus fidèle à l'intention historique du Prisme (plusieurs points de vue) mais réintroduit un juge — l'orchestrateur — sur une sortie non mécanique.
**[E8]** Trancher par mesure : les deux formes sur un même charter, adjudication à l'aveugle (§9.2). **À faire après E4**, qui aura déjà établi si Qwen produit des objections valides sur ce studio.

## 5.3 Vérification de disponibilité — mesurée

**[M]** LM Studio joignable, modèles chargés le 2026-07-30 :

| modèle | usage proposé | note |
|---|---|---|
| `qwen/qwen2.5-coder-14b` | `game_forger` (E7) | **présent** — l'expérience builder est concrète |
| `qwen2.5-14b-instruct` | `redteam_reviewer`, `redteam_code`, auditeurs | **présent**, déjà déclaré dans `roles.yaml` |
| `qwen/qwen3.6-27b` | — | **[M] à écarter des sorties structurées** : le thinking mode vide le `content` (incident documenté). Les findings exigent un JSON structuré. |
| `devstral-small-2507`, `mistral-7b-instruct-v0.3` | troisième famille de secours | si la corrélation résiduelle Qwen↔Qwen se confirme (§4.2) |

**[M]** `GeminiAdapter` existe : `scripts/council.py:313`, avec `is_available()`. Lane council legacy, **mais le code d'adaptation n'est pas à écrire.**
**[H]** Gemini est une **egress externe nouvelle**. `CLAUDE.md` interdit l'API Anthropic externe mais ne dit rien de Gemini. C'est une **question de gate, pas une décision d'architecte** — à trancher par Pierre avant E9.

## 5.4 Chaîne de repli `s2-worldscan` — ratifiée Pierre 2026-07-30

> *« Gemini pour la recherche pure (diversité cognitive). Le contrat reste advisory uniquement. Aucune décision ne vient de cette étape. Sonnet en fallback si problème de clef API. »*

```
provider: gemini
   ├─ clef présente ET service joignable  → RUNNER_GEMINI    (nominal)
   └─ sinon                               → RUNNER_CLAUDE / sonnet-5
                                            reason: "gemini indisponible — repli sonnet"
                                            worldscan_provider_executed: "sonnet-5"
                                            drapeau: diversité de recherche dégradée
```

**[M] Le patron existe déjà** : `runtime.py:94-104` fait exactement cela pour `PROVIDER_LMSTUDIO` (sonde `qwen_available()` → sinon `RUNNER_CLAUDE_BLIND` avec `reason` explicite). Il n'y a pas de mécanisme à inventer, seulement un provider à déclarer.

### Les deux replis ne dégradent pas la même chose — distinction importante

| repli | propriété perdue | gravité |
|---|---|---|
| **Qwen → claude-blind** (s6/s11) | l'**indépendance de modèle** — le contradicteur redevient un Claude qui critique un Claude | **la raison d'être de l'étape disparaît** ; déjà signalé par `redteam_ran=False` |
| **Gemini → Sonnet** (s2) | la **diversité de la recherche**, pas la capacité | Sonnet dispose de `WebSearch`/`WebFetch` : le dossier `GAME_REFERENCE/` reste produit et conforme au contrat |

Le repli worldscan est donc **préservant la capacité**, là où le repli red-team est **destructeur de propriété**. Les traiter comme équivalents serait une erreur.

**Ce que le repli ne dispense pas de faire :** un run où `s2` a tourné sur Sonnet **n'est pas le même run**. `worldscan_provider_executed` doit figurer au reçu signé, et la dégradation lever un drapeau HumanGate — même règle que R3. Un repli silencieux transformerait une expérience de diversité en mesure de rien.

**[H] Risque propre au repli :** si la clef Gemini est absente durablement, tous les runs tournent sur Sonnet et le drapeau devient une constante — exactement le défaut L2. **Le repli doit être compté**, pas seulement signalé : un compteur d'occurrences dans les preuves de campagne.

## 5.1 Schéma de configuration proposé

**Aujourd'hui [M]** — `roles.yaml`, le raisonnement appartient au modèle :

```yaml
models:
  - id: anthropic/claude-opus-4-8
    reasoning: high              # <-- un seul bouton pour 9 rôles
    roles: [architect, redteam_code, game_forger, ...]
```

**Proposé** — le modèle garde un **défaut**, le rôle peut **surcharger** :

```yaml
models:
  - id: anthropic/claude-opus-4-8
    reasoning_default: high      # rétro-compatible : ancien `reasoning` lu comme défaut
    roles:
      - id: architect
        reasoning: xhigh         # surcharge explicite, motivée dans le contrat
      - id: redteam_code
        reasoning: medium
      - game_forger              # forme courte = hérite du défaut
```

**Migration [H] — sans rupture :** `get_reasoning_for_model()` est conservé pour le défaut ; une fonction sœur `get_reasoning_for_role(role, model)` est ajoutée et interrogée en premier. Une entrée en forme courte (chaîne nue) se comporte exactement comme aujourd'hui.
**Risque [M] :** `roles.yaml` est dans `scripts/forge/**`, donc dans le périmètre gelé — la migration exige une levée de gel explicite. **Elle ne doit pas être faite pendant la campagne de calibration.**

---

# 6. Politique de routing V2

## 6.1 Les quatre règles

**R1 — Le raisonnement appartient au rôle.** Le modèle porte un défaut ; le rôle surcharge, et la surcharge est motivée dans le contrat. *(Lève L3. Prérequis de R2, R4 et de toute expérience d'effort.)*

**R2 — Le contradicteur est conditionnel.** s11 ne s'exécute que si son résultat **peut** modifier `decision` :

```
executer_redteam := software_verdict == OK
                 ET NOT triage_exception
                 ET NOT extra_advisory
```

Sinon : `SKIPPED`, avec **reçu signé disant pourquoi** — jamais un silence. *(Lève L1.)*

**R3 — L'indépendance est un champ déclaré, et le reçu rapporte celle obtenue.** Le contrat déclare `independence: model | context | none`. Le verdict rapporte l'indépendance **réellement obtenue**. Aujourd'hui s11 déclare implicitement `model` et obtient `context` : l'écart doit apparaître dans le reçu, pas dans un drapeau constant. *(Lève L2.)*

**R4 — L'échelle devient bidirectionnelle.** La politique déclare, par rôle, un **tier de départ** distinct du **tier maximal**. Un rôle peut démarrer bas et monter sur oracle rouge. **Aucun rôle ne démarre au sommet sans justification déclarée.** *(Lève L4 et instrumente la réserve de 2026-07-23.)*

## 6.2 Conditions d'appel, escalade, second avis, fallback, budget

| dimension | règle V2 |
|---|---|
| **condition d'appel** | un appel LLM n'est émis que si son résultat peut changer une décision, ou s'il **produit** un artefact requis par une étape aval |
| **escalade** | oracle rouge OU `ESCALATE_REQUEST` explicite → tier+1, borné, tracé, signé (mécanisme V1 conservé) |
| **dés-escalade** | jamais automatique en cours de run. Le tier de départ est une **donnée de politique**, révisée entre campagnes sur preuve. |
| **second avis** | requis **uniquement** quand l'indépendance obtenue est `none` **et** que la décision dépend de l'étape. Sinon : gaspillage. |
| **fallback** | conservé tel quel (`RUNNER_QWEN` → `RUNNER_CLAUDE_BLIND` avec `reason` explicite). **Le fallback doit rester visible dans le reçu.** |
| **budget** | plafond **par run**, appliqué par l'exécuteur, pas par un document. Un plafond qui n'existe pas dans l'exécuteur n'est pas une protection *(règle ratifiée 2026-07-30)*. |

## 6.3 Ce que la politique ne fait pas

Elle ne choisit pas un modèle en dur dans un contrat — **ADR-002 gate 1 l'interdit** et rien ici ne le change. Le contrat déclare un rôle ; le registry force le runtime.

---

# 7. Couche audits

## 7.1 Position dans la chaîne

```
Livrable ──▶ Audits Qwen ──▶ Oracles mécaniques ──▶ Analyse Claude ──▶ HumanGate
             (advisory)      (seuls juges)          (synthèse)         (décide)
```

**Les audits ne remplacent aucune preuve mécanique.** Ils cherchent ce qu'un oracle ne peut pas voir. Leur sortie est **advisory par construction** — même statut que le red-team, même interdiction d'entrer dans `software_verdict`.

## 7.2 Format de sortie commun — obligatoire

```yaml
finding:     <une phrase, un défaut, pas une catégorie>
severity:    critical | major | minor
evidence:    <chemin:ligne ou commande reproductible — jamais une impression>
confidence:  0.0–1.0
audit:       <nom de l'audit>
```

**Un finding sans `evidence` reproductible est rejeté à la lecture, pas discuté.** C'est la transposition de la règle « la preuve ne remplace pas l'exécution, et une affirmation sans preuve n'est pas un finding ».

## 7.3 Les six audits primaires

### A1 — VÉRITÉ · *le système correspond-il aux faits observables ?*

| | |
|---|---|
| **entrée** | déclarations (contrats, `roles.yaml`, docs) + code + reçus du run |
| **sortie** | liste des mécanismes **déclarés sans consommateur** ou **exécutés sans déclaration** |
| **preuve** | pour chaque finding, le symbole déclaré + le résultat du grep de son appelant |
| **fréquence** | à chaque run |
| **coût** | 1 appel Qwen (local) |
| **déclencheur** | fin de s12, systématique |

**Pourquoi celui-là d'abord [M] :** c'est le mode de panne n°1 documenté du studio — *écrivain sans appelant / lecteur sans données*, **6 occurrences enregistrées**. Cette session en a produit deux de plus (L2 : drapeau constant ; L6 : champ `skill` jamais exercé).

### A2 — HYGIÈNE · *dette, fichiers morts, incohérences ?*

| | |
|---|---|
| **entrée** | arbre du dépôt + `git log` + empreinte de la garde de référence |
| **sortie** | orphelins, doublons de fichiers, artefacts résiduels, TODO sans échéance |
| **preuve** | chemin + date du dernier commit touchant le fichier |
| **fréquence** | hebdomadaire, ou sur demande |
| **coût** | 1 appel Qwen |
| **déclencheur** | manuel ou planifié — **pas** à chaque run |

### A3 — FRICTION · *où le workflow va-t-il ralentir ou casser ?*

| | |
|---|---|
| **entrée** | `state.json` des runs récents + durées par étape + `steps_with_retries` |
| **sortie** | points de blocage, étapes à variance anormale, dépendances fragiles |
| **preuve** | la mesure de durée/variance qui l'établit |
| **fréquence** | après chaque campagne (≥3 runs) |
| **coût** | 1 appel Qwen |
| **déclencheur** | fin de campagne |

**[M] Exemple immédiat que cet audit aurait produit :** s11 à 30–32 % de variance contre 8–22 % pour s9.

### A4 — DOUBLONS · *plusieurs systèmes remplissent-ils le même rôle ?*

| | |
|---|---|
| **entrée** | inventaire des mécanismes par fonction |
| **sortie** | paires de systèmes redondants + lequel est réellement consommé |
| **preuve** | les deux chemins de code + le grep de leurs appelants respectifs |
| **fréquence** | mensuelle |
| **coût** | 1 appel Qwen |
| **déclencheur** | manuel |

**[M] Cas connus à ne pas re-signaler :** `ceo-lane-assignment` / `ceo-brief` sont **délibérément découplés** (CLAUDE.md l'interdit explicitement de fusionner). Trois taxonomies d'agents coexistent, dont une legacy (`lab/agent_policy/`). L'audit doit lire les décisions avant de proposer.

### A5 — COHÉRENCE · *contrats, code, doc et runtime racontent-ils la même histoire ?*

| | |
|---|---|
| **entrée** | contrat + code de l'étape + doc associée + reçu du run |
| **sortie** | divergences quadripartites |
| **preuve** | les quatre citations mises côte à côte |
| **fréquence** | à chaque run |
| **coût** | 1 appel Qwen par étape LLM |
| **déclencheur** | fin de s12 |

**[M]** Un précédent mécanique existe déjà : `contract_sync.py` détecte `regle_non_citee` — « aucun symbole de la règle n'apparaît dans le skill ». A5 en est la généralisation assistée.

### A6 — EXPÉRIENCE · *le résultat répond-il au besoin ?*

| | |
|---|---|
| **entrée** | le livrable exécutable + le charter + la Genre Bible |
| **sortie** | écarts entre ce qui est produit et ce qui était promis au joueur |
| **preuve** | capture, log d'exécution, ou trace de démarrage |
| **fréquence** | avant livraison uniquement |
| **coût** | 1 appel Qwen + 1 exécution produit |
| **déclencheur** | avant HumanGate |

**[M] Justification directe :** leçon ratifiée du 2026-07-29 — « un projet peut satisfaire tous ses oracles et ne pas démarrer ». Snake a passé tous les oracles et ne se lançait pas. **A6 est l'audit qui aurait attrapé ça.**

## 7.4 Audits composés — les défauts d'interaction

Un audit composé ne relance pas les deux audits : il **croise leurs sorties**. Coût marginal quasi nul.

| composé | ce qu'il isole | pourquoi ça ne se voit pas autrement |
|---|---|---|
| **vérité × hygiène** | mécanisme déclaré, sans consommateur, **et** code mort → candidat à suppression de haute confiance | séparément : « peut-être utilisé ailleurs » |
| **vérité × friction** | mécanisme déclaré dont le consommateur existe mais sur un **chemin jamais pris** | vérité seule le voit branché ; friction seule ne sait pas qu'il est déclaré |
| **hygiène × friction** | code mort **sur le chemin chaud** — consomme du contexte à chaque appel | hygiène le classe « inoffensif », friction ne sait pas qu'il est mort |
| **doublons × friction** | deux systèmes, un utilisé, l'autre **consulté par erreur** | doublons seul ne dit pas lequel gagne |
| **cohérence × vérité** | la doc dit X, le code fait Y, le runtime fait Z, **et** personne ne lit X | c'est exactement L2 : drapeau correct, câblage correct, promesse fausse |
| **expérience × friction** | le livrable **fonctionne techniquement** mais l'utilisateur ne peut pas l'exécuter | **c'est l'incident Snake, à la virgule près** |

**Le dernier croisement est le plus important de la V2.** C'est le seul qui aurait produit, mécaniquement, la leçon que Pierre a dû tirer à la main.

---

# 8. Architecture oracle V2

## Catégorie A — Oracles mécaniques purs (déterministes, seuls juges)

**[M] Existants, à conserver sans changement :** intégrité code (s10a), six oracles du squelette (s10s : `line_states`, `placement`, `collisions`, `index`, `contract_completeness`, `budget`), mutation + reçu signé, solvabilité, archi (s10b), wiremap AST (s10c), verdict signé HMAC (s12).

**[H] Candidats d'extension, même régime :** lint/AST sécurité, budget de performance, machine d'état, fuzzing d'entrées, pathfinding, simulation, empreinte mémoire.

**Règle absolue : seule la catégorie A écrit `software_verdict`.** Aucune sortie de B ou C n'y touche jamais.

## Catégorie B — Oracles assistés IA (Qwen, advisory)

| oracle B | entrée | ce qu'il cherche | pourquoi pas déterministe |
|---|---|---|---|
| analyse de logs | logs d'oracle et de run | motif d'échec récurrent, cause probable | un log est du texte non structuré |
| cohérence d'architecture | blueprint + code | dérive entre intention et réalisation | l'AST voit la structure, pas l'intention |
| comparaison wiremap ↔ code | wiremap + AST | écart sémantique | s10c couvre l'écart **structurel**, pas sémantique |
| respect du prompt | contrat + livrable | le contrat a-t-il été suivi *en esprit* | pas exprimable en assertion |
| recherche d'anomalies | diff | ce qui « n'a rien à faire là » | définition ouverte |

**Sortie structurée obligatoire** (§7.2). **[E5]** avant adoption : mesurer taux de faux positifs sur un corpus historique.

## Catégorie C — Oracles subjectifs — **ne pas intégrer maintenant**

Vision, game feel, onboarding, accessibilité, audio.

**[M] Raison documentée :** l'audit de falsification `grid-navigator` a établi qu'une métrique qui classe/génère/calibre doit **d'abord prouver qu'elle porte une information variable** (≥2 valeurs distinctes non triviales). Aucune métrique de catégorie C ne satisfait cette condition aujourd'hui. Les intégrer produirait du bruit signé.

**Condition d'entrée en C :** avoir passé la preuve de variance. Pas avant.

---

# 9. Ordre d'expérimentation

**Aucune expérience n'est lancée par ce document.**

L'hypothèse de §4.1 — *la diversité des erreurs prime sur la profondeur* — est une **croyance tant qu'elle n'est pas mesurée**. Cette section est le dispositif qui la rend falsifiable.

## 9.1 Deux classes d'adjudication — l'asymétrie qui gouverne tout

| classe | qui juge la qualité | rôles concernés | conséquence |
|---|---|---|---|
| **M — mécanique** | la chaîne d'oracles **existante** (s10a, s10s, mutation, solvabilité) | `game_forger`, `builder` | **auto-adjugée** : aucun jugement humain requis sur la qualité |
| **H — HumanGate** | Pierre, sur findings anonymisés | `redteam_code`, `redteam_reviewer`, `prisme`, auditeurs | coûte du temps de Pierre → protocole conçu pour le minimiser |

**[M]** L'asymétrie est réelle et déjà câblée : la sortie d'un builder passe par six oracles déterministes plus mutation et solvabilité ; la sortie d'un red-team ne passe par rien — c'est advisory par contrat (`verdict.py:300`).

**Conséquence de conception :** en classe M, on peut conclure sur la qualité **sans Pierre**. En classe H, tout le travail de protocole consiste à rendre son jugement fiable et bon marché.

## 9.2 La sonde-contrôle — ce qui sépare une mesure d'une croyance

**Le piège :** si Qwen et Opus rendent des findings différents, est-ce de la diversité de modèle ou du bruit d'échantillonnage ? **On ne peut pas le savoir sans faire tourner le même modèle deux fois.**

**Dispositif obligatoire — quatre exécutions sur la même entrée :**

```
Opus  run A ─┐
             ├─ Intra(Opus) = différence symétrique  ← plancher de bruit
Opus  run B ─┘

Qwen  run A ─┐
             ├─ Intra(Qwen)                          ← plancher de bruit
Qwen  run B ─┘

Opus A  vs  Qwen A ─── Inter                          ← signal + bruit
```

> **La diversité de modèle n'est établie que si `Inter > max(Intra(Opus), Intra(Qwen))` avec une marge.**
> Sans cette sonde, toute différence observée est **inattribuable** et la conclusion serait de l'intuition déguisée en chiffre.

**Règle d'appariement des findings [H] :** deux findings sont « le même » s'ils désignent le même fichier, à ±5 lignes, dans la même catégorie. Mécanique, donc reproductible. À valider sur les premiers résultats — si l'appariement produit des faux jumeaux, la règle se resserre **avant** de lire les métriques, jamais après.

## 9.3 Adjudication à l'aveugle

Pierre note les findings **sans savoir quel modèle les a produits**.

1. Fusionner les sorties des quatre exécutions.
2. Retirer tout marqueur de style, en-tête, numérotation propre à un modèle.
3. Mélanger selon un ordre fixé d'avance (graine enregistrée).
4. Notation par finding : **valide** / **invalide** / **invérifiable**.
5. Ré-associer aux modèles **après** notation close.

**Pourquoi c'est non négociable :** l'attente contamine le jugement. On sait déjà que Pierre attend de la diversité de Qwen — c'est l'hypothèse. Une notation non aveugle mesurerait cette attente autant que le modèle. Le coût de l'aveugle est nul.

## 9.4 Métriques — et pourquoi ce n'est pas un compte

L'hypothèse porte sur la **diversité**, pas sur la supériorité. Un modèle qui trouve moins mais **autre chose** valide l'hypothèse ; un modèle qui trouve plus mais **la même chose** l'invalide.

| métrique | définition |
|---|---|
| **U(m)** | findings trouvés par le modèle `m` **seul**, ratifiés **valides** |
| **I** | intersection ratifiée valide |
| **FP(m)** | invalides / total pour `m` |
| **Intra(m)** | plancher de bruit intra-modèle (§9.2) |
| coût, durée | secondaires — jamais le critère de décision |

**Critère de succès — fixé AVANT toute lecture de résultat :**

> **(1)** `U(Qwen) ≥ 1` par tranche de N runs · **(2)** `FP(Qwen) ≤ 2 × FP(Opus)` · **(3)** `Inter > max(Intra)`.
>
> Les trois. Deux sur trois = **échec**, pas « résultat encourageant ».

**[M] Discipline appliquée :** gabarit `P1_1_PROTOCOL.md` — hypothèse → contrat → red-team → adjudication → ratification → conclusion limitée. Règles associées déjà ratifiées : *rapporté ≠ démontré* · jamais de tuning post-hoc · toujours une sonde-contrôle.

## 9.5 E7 — builder Qwen Coder : classe M, mais bloquée

**[M]** `qwen/qwen2.5-coder-14b` est chargé localement. Le modèle existe.

**Adjudication entièrement mécanique** — même charter, même squelette gelé, mêmes oracles :

| mesure | source | sensible au bruit de 20 % ? |
|---|---|---|
| build atteint / non atteint | s10a | **non — binaire** |
| six oracles du squelette | s10s | **non — discret** |
| score de mutation | reçu mutation | **non — discret** |
| solvabilité | oracle solvabilité | **non — binaire** |
| itérations jusqu'au vert | `steps_with_retries` | non |
| coût, durée | `state.json` | **oui — exige N≥5** |

**Les métriques de qualité sont discrètes et échappent à la bande de bruit.** E7 peut donc conclure sur la qualité avec peu de runs, tout en exigeant N≥5 pour toute affirmation sur le coût.

### ⚠️ Prérequis bloquant — à résoudre avant toute dépense

**[M] Il n'existe aujourd'hui aucune cible constructible depuis zéro :**

- `games/pong/**` — témoin **gelé**, on ne peut pas reconstruire dedans sans détruire le témoin ;
- `games/snake/` — commité **déjà construit**, aucun état pré-build dans l'historique.

**C'est exactement le mur qui a stoppé la calibration le 2026-07-30** (s9 marqué `NOT_MEASURED` : les 3 runs mesuraient une *vérification*, pas une *fabrication*). Lancer E7 sur Snake reproduirait l'erreur à l'identique.

**Arbitrage Pierre 2026-07-30 :** *« L'objectif n'est pas seulement le coût mais de mesurer la qualité de construction sur un projet neuf. »*

Cela **tranche le choix de cible** : il faut un projet **neuf**, pas un état reconstitué.

| option | statut après arbitrage |
|---|---|
| (a) **prochain nœud non construit du curriculum** | **retenue** — projet neuf, charter et Genre Bible produits par la chaîne, oracles applicables tels quels |
| (b) micro-cible bornée construite deux fois | **repli acceptable** si (a) est trop gros pour une première mesure |
| (c) reconstituer un état pré-build de Snake | **écartée** — ce n'est pas un projet neuf, et c'est le plus coûteux |

**[E10] — préalable à E7, coût nul :** identifier dans le curriculum le prochain nœud non construit et vérifier que son charter est produisible. Tant que ce nœud n'est pas nommé, E7 n'a pas d'entrée.

**Conséquence de conception sur E7 :** sur un projet neuf, `game_forger` **fabrique** au lieu de vérifier. Les métriques discrètes du tableau ci-dessus deviennent alors réellement des mesures de **qualité de construction** — ce qu'elles n'auraient pas été sur Snake. C'est exactement pour cela que le prérequis est bloquant et non cosmétique.

## 9.6 Séquencement

| # | expérience | classe | coût inférence | bloqué par | état |
|---|---|---|---|---|---|
| **E3** | capturer `cache_creation`/`cache_read` | — | **0** | rien | **prêt** |
| **E2** | rejouer les 18 verdicts : quand s11 est-il seul déterminant ? | — | **0** | rien | **prêt** |
| **E4** | **red-team Qwen vs Opus**, 4 exécutions + aveugle | **H** | ~0 (Qwen local) + 2 appels Opus | rien | **prêt** |
| **E0** | un `skill` déclaré est-il réellement chargé ? | — | 1 appel | rien | **prêt** |
| **R1** | raisonnement porté par le rôle | — | 0 | **levée de gel** `scripts/forge/**` | attente Pierre |
| **E8** | Prisme : séquentiel vs parallèle | H | faible (Qwen local) | E4 | après E4 |
| **E7** | **builder Qwen Coder vs Opus** | **M** | **élevé** | **cible constructible (§9.5)** | **bloqué** |
| **E9** | Gemini sur `s2-worldscan` | H | externe | **gate egress Pierre** | attente Pierre |
| **E5** | sweep d'effort par rôle | M/H | moyen | R1 | après R1 |

**E3, E2 et E4 sont prêtes, sans blocage, et E4 est la seule qui teste directement ton hypothèse.** Elle est aussi presque gratuite : Qwen tourne en local, les diffs sont archivés, seuls deux appels Opus sont à payer pour la sonde-contrôle.

**E7 est la plus forte en valeur et la seule vraiment bloquée** — pas par un coût, par l'absence d'une cible constructible.

---

# 10. Risques

| # | risque | probabilité | impact | mitigation |
|---|---|---|---|---|
| R-1 | **La couche d'audits devient une usine à gaz** — 6 audits + 6 composés à chaque run | **élevée** | dérive de coût et de bruit | seul **A1** tourne à chaque run. A2/A4 sont manuels, A3 par campagne, A6 avant livraison uniquement. |
| R-2 | **Qwen produit des findings plausibles mais faux** | moyenne | perte de confiance dans toute la couche | `evidence` reproductible obligatoire ; advisory strict ; E4 mesure les faux positifs avant adoption |
| R-3 | **La dés-escalade de `game_forger` dégrade le produit sans que l'oracle le voie** | **moyenne** | régression silencieuse | **[M]** précédent réel : Snake a passé tous les oracles sans démarrer. E6 exige A6 (expérience) opérationnel **avant** de tourner. |
| R-4 | **La migration de `roles.yaml` casse la résolution de rôle** | faible | chaîne bloquée | forme courte rétro-compatible ; `roles.yaml` est dans le périmètre gelé → levée de gel explicite, jamais pendant une campagne |
| R-5 | **Le bruit de ~20 % masque l'effet mesuré** | **élevée** | conclusion fausse | **[M]** bande établie par la calibration N=3. Toute expérience dont l'effet attendu est < 20 % exige N ≥ 5. |
| R-6 | **Un skill tiers introduit du prompt non versionné dans le périmètre contractualisé** | faible si la frontière §1.1 tient | perte de reproductibilité | skills libres côté session ; côté agents, uniquement par champ `skill` d'un contrat validé |
| R-7 | **L7 — écriture possible sur le périmètre gelé** | moyenne | calibration invalidée sans qu'on le sache au bon moment | poser les règles deny manquantes **avant** d'ouvrir le chantier V2 |
| R-8 | **Optimiser avant E3** | **élevée si on saute l'ordre** | on optimise à l'aveugle | E3 est bloquante, pas recommandée |
| R-9 | **Décorrélation seulement partielle** — `game_forger` et `redteam_code` resteraient tous deux de famille Qwen | **moyenne** | on croit avoir décorrélé construction↔critique sans l'avoir fait | la sonde-contrôle §9.2 la rendrait visible ; troisième famille disponible en repli (`devstral`, `mistral`, Sonnet) |
| R-10 | **Gemini ouvre une egress externe nouvelle** | certaine si adopté | données de charter sortant vers un tiers | **question de gate, pas d'architecte** — arbitrage Pierre avant E9 ; `advisory: true` déjà au contrat |
| R-11 | **E7 lancée sur une cible déjà construite** | **élevée si le prérequis §9.5 est ignoré** | on mesure une vérification en croyant mesurer une fabrication — **erreur déjà commise le 2026-07-30** | prérequis bloquant explicite ; ne pas lever sans cible constructible |

---

# 11. Ce qui doit rester inchangé

**Cette section prime sur toutes les autres. En cas de conflit avec une proposition ci-dessus, c'est la proposition qui tombe.**

1. **`software_verdict` vient UNIQUEMENT des reçus d'oracle vérifiés.** Aucun agent LLM — red-team, auditeur, contradicteur, orchestrateur — n'y touche jamais. **[M]** `verdict.py:300`, `verdict.py:385`.

2. **Aucun sous-agent sans contrat validé.** La porte `prepare_dispatch` et le hook `pretool_forge_guard` restent fail-closed en périmètre Forge. **Un skill, un audit, un contradicteur ne sont pas des exceptions.** **[M]** ADR-002.

3. **Les oracles restent déterministes et non-LLM.** La garde `runtime.py:88` qui empêche de router une étape `provider: forge` vers un LLM ne bouge pas.

4. **Le verdict reste signé HMAC et re-vérifié** par `forge.verify_run`.

5. **HumanGate (Pierre) décide** merge / reject / freeze. La Forge ne décide jamais. Les écritures durables restent propose-only.

6. **`claim_verdict: NO_CLAIM_ALLOWED`** dans tous les rapports.

7. **La règle des trois états** sur les champs de contrat (rempli / `aucun` / absent = refus).

8. **La preuve de variance des métriques** — toute métrique qui classe, génère ou calibre doit d'abord prouver qu'elle porte une information variable. **C'est ce qui maintient la catégorie C hors de la chaîne.**

9. **Le témoin gelé** (`games/pong/**`) et le périmètre `reference_protected`. La V2 ne s'évalue que contre un témoin qui n'a pas bougé.

10. **La séparation `orchestrator` (session, descriptive) / `run_orchestrator` (agent, résolu par le registry).** **[M]** Elle a coûté un défaut réel à identifier le 2026-07-23 ; la refusionner le recréerait.

11. **Un contrat ne fixe jamais un modèle en dur.** Il déclare un rôle ; le registry force le runtime. **[M]** ADR-002 gate 1. La matrice §5 est une proposition de **contenu du registry**, pas une autorisation d'écrire un modèle dans un contrat.

12. **La matrice rôle→modèle ne change qu'après mesure sur une tâche réelle de ce studio.** *(Ratifié Pierre 2026-07-30.)* Un classement public de modèles, un benchmark généraliste ou une annonce de fournisseur ne sont **jamais** des preuves recevables. La seule preuve admissible est produite par la chaîne, avec sonde-contrôle (§9.2) et critères fixés avant lecture.

13. **On raisonne en diversité cognitive, pas en classement de modèles.** *(Ratifié Pierre 2026-07-30 : « une Forge n'a pas besoin d'avoir partout le modèle le plus fort, elle a besoin d'obtenir des points de vue réellement différents. »)* Toute proposition future formulée comme « remplacer X par un modèle plus performant » est hors-doctrine tant qu'elle n'établit pas quel **point de vue distinct** elle apporte.

---

## Résumé exécutif

**La V2 n'est pas un problème de coût, c'est un problème de corrélation.** **[M]** Un seul modèle — `claude-opus-4-8` — porte aujourd'hui neuf rôles, dont la conception (`architect`), la construction (`game_forger`) et la critique (`redteam_code`). Le contradicteur partage ses angles morts avec l'agent qu'il contredit. La cible est une équipe de cinq familles : **Opus** arbitre, **Sonnet** structure, **Qwen** contredit et code, **Gemini** explore, **Haiku** exécute le simple.

**Un verrou structurel empêche d'exprimer cette équipe** : le raisonnement est attaché au modèle, pas au rôle (L3). Neuf rôles, un bouton. **R1 est le prérequis de tout le reste.**

**L'hypothèse « diversité > profondeur » n'est pas adoptée par ce document.** Elle est rendue falsifiable par §9 : quatre exécutions avec sonde-contrôle intra-modèle, adjudication à l'aveugle, trois critères fixés avant lecture. Sans la sonde-contrôle, toute différence observée serait inattribuable — de l'intuition habillée en chiffre.

**Trois expériences sont prêtes et sans blocage** : E3 et E2 (coût nul), E4 (Qwen local + deux appels Opus). **E4 est la seule qui teste directement l'hypothèse.**

**Une expérience est bloquée pour la bonne raison** : E7 (builder Qwen Coder) n'a **aucune cible constructible depuis zéro** — Pong est gelé, Snake est commité déjà construit. C'est le mur exact qui a stoppé la calibration. Le résoudre est un préalable, pas un détail.

`software_verdict: n/a — document de conception`
`evidence_verdict: MECHANICAL_VALIDATION_ONLY`
`claim_verdict: NO_CLAIM_ALLOWED`
