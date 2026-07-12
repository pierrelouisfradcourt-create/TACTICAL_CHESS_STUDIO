# FORGE 2.0 — AI INDIE GAME STUDIO DESIGN DOCUMENT

- **Date** : 2026-07-11
- **Source** : audit croisé — cartographie interne Forge (agent Explore, fichier:ligne) × référentiel externe pipelines studios (recherche web citée)
- **Statut** : PROPOSED — gate Pierre requis pour ratification
- **Auteur** : Fable 5 (Lead Architect), sous doctrine NO_CLAIM_ALLOWED
- **Critère de succès** : « Forge a produit quelque chose qu'un joueur humain a envie de continuer » — pas « Forge a produit quelque chose ».

---

## 1. ÉTAT ACTUEL PROUVÉ

### 1.1 Code actif (exécuté, preuve à l'appui)

| Composant | Fichier | Preuve d'exécution |
|---|---|---|
| Porte de dispatch (contrat→audit HMAC) | `scripts/forge/dispatch.py:113-138` | `lab/forge_evidence/dispatch_audit.jsonl` (run breakout-20260711, s1→s9 signés) |
| Aiguilleur runtime (qwen/claude/claude-blind/oracle) | `scripts/forge/runtime.py:78-111` | télémétrie `lab/forge_evidence/forge_telemetry.jsonl` (tokens/durées réels) |
| Hook fail-closed anti-spawn-sans-contrat | `scripts/forge/hook_guard.py:56-75` + `.claude/settings.json:33` | hook PreToolUse installé |
| Oracle code (timeout 300s, capture évidence) | `scripts/forge/gate.py:46-66`, `oracle.py:65` | logs `lab/forge_evidence/oracle_*.log` |
| Oracles statiques (archi, wiremap, e2e, gel, mutation) | `scripts/forge/static_oracles.py:195,235,290,369,414` | faux-négatif wiremap détecté et corrigé (`_TS_METHOD`, `static_oracles.py:54`) |
| Mutation testing | `scripts/forge/mutation.py` | gate ROUGE in vivo : claim 100% → réel 10/48=21% (breakout, `forge_error_journal.jsonl`) |
| Escalade builders haiku→sonnet→opus, cap 2 | `scripts/forge/escalate.py:19-20,93-98` | câblée dans `skill.md:90-102` |
| Verdict signé + re-vérification provenance | `scripts/forge/verdict.py:215-345`, `verify_run.py` | `lab/forge_runs/*/verdict.json` (4 runs) |
| Connecteurs studio propose-only | `scripts/forge/studio_link.py` | `lab/reports/forge_*.jsonl` |
| Mémoire inter-runs (pré-mortem) | `studio_link.py:88-118` | 3 leçons `_global_` relues à s0 (`forge_error_journal.jsonl`) |

13 étapes contractualisées (s0→s12), ordre canonique dans `dispatch.py:32-49`, 17 champs de contrat validés fail-hard (`contract.py:41-59,120-132`).

### 1.2 Documentation (intentions non câblées)

- **Le pipeline complet n'existe pas comme artefact exécutable.** `dispatch.main()` ne fait que dry-run (`dispatch.py:152-169`). L'enchaînement s0→s12, l'escalade, les gates et le verdict sont de la prose Python dans `.claude/skills/forge/skill.md:48-181`, exécutée manuellement par l'orchestrateur. Reconnu dans `skill.md:210`.
- Skills `art-bible` et `asset-spec` : existent au niveau studio, **non branchés** dans la chaîne forge.
- `ADR-002` : statut `DOCUMENTED_ONLY`, tableau connecteurs partiellement contredit par l'implémentation réelle (`ADR-002:31-32` vs `contract.py:31`).
- Étapes fantômes s7/s8 référencées par `contracts/s9-build.yaml:92`, absentes de `ORDER`.

### 1.3 Tests

- **Exécutés** : tests unitaires `scripts/forge/tests/` (profil dogfood, `oracles.json:2-5`) ; par jeu : logic/properties/e2e/solvability via `run-oracle.mjs:43-81`.
- **Déclaratifs / non fiables** : le gate mutation n'est PAS dans `run-oracle.mjs` — dépend d'un appel Python manuel (`skill.md:116-130`). `games/breakout/mutation_triage.json` prétend « tous mutants tués » quand le run réel dit 21% : aucun mécanisme n'invalide un triage périmé.

### 1.4 Artefacts

- **Jeux forgés** : collect_runner (+_legacy/_r1/_r2), survival_arena (+_r1), breakout (run en cours), menagerie_tactics (worktree non mergé — seul verdict OK zéro flag), chesscolor (micro), forge-dogfood.
- **Non-forge** : leviathan (Vite/TS, seul jeu avec vrais assets PNG), chess_tcg (Godot), snake_*.
- **Assets** : zéro asset produit par forge. Rendu = code procédural canvas (`render.mjs` par jeu). Aucun contrat s0-s12 ne mentionne sprite, image ou palette.
- **Rapports** : verdicts JSON, journal d'erreurs, télémétrie, audit de dispatch — tous sous `lab/`.

### 1.5 Zones inconnues

- Comportement de l'import headless d'assets dans un moteur (jamais tenté par forge).
- Coût/latence réels d'un juge visuel multimodal par run (jamais mesuré).
- Verdict final breakout-20260711 (run en cours au moment de l'audit).

---

## 2. FORCES CONSERVÉES (intouchables)

Aucun comparable public (GameCraft-Bench, AVR-Agent, Rosebud, Websim) ne possède cette colonne d'intégrité. Tout module nouveau se branche **sur** le système de contrats, jamais à côté.

1. **Contrat = porte** : aucun agent sans contrat validé (`contract.py:120-132` + hook fail-closed `hook_guard.py:47-51`).
2. **Provenance signée** : audit HMAC au dispatch, reçus re-vérifiés au verdict, evidence re-lue, BLOCKED si chaîne rompue (`verdict.py:268-283`).
3. **Oracles non-LLM aux points de preuve** : returncode, pas d'opinion.
4. **Gate solvabilité** : un bot doit GAGNER — a attrapé collect_runner injouable certifié vert (leçon majeure, `forge_error_journal.jsonl`).
5. **Gate mutation** : 100%-ou-triage-justifié — a attrapé un claim mensonger (21% réel).
6. **Gel du jeu de règles** : feature ajoutée/supprimée après s5 = STOP dur (`static_oracles.py:369-396`).
7. **Escalade bornée** : jamais de boucle infinie, sommet+échec → HumanGate (`escalate.py:93-98`).
8. **Red-team advisory** : ne juge pas le code, lève des flags (`verdict.py:322-326`).
9. **HumanGate terminal** : Pierre décide, pas la machine.
10. **Vocabulaire de verdict unique** : OK/FAIL/BLOCKED, `software/evidence/claim` séparés, NO_CLAIM_ALLOWED.

---

## 3. FAIBLESSES (prouvées, pas supposées)

### 3.1 Structurelles

| # | Faiblesse | Preuve |
|---|---|---|
| F1 | Pipeline = prose, pas code. Toute la rigueur repose sur la discipline manuelle de l'orchestrateur | `dispatch.py:160-167` (dry-run only), `skill.md:48-181` |
| F2 | Aucun oracle ne regarde un pixel rendu. Or Art & Presentation est **quasi non corrélé** aux mécaniques (r=0.11, GameCraft-Bench, arxiv 2606.17861) — durcir les gates mécaniques n'améliorera jamais le visuel | contrats s0-s12 : zéro mention art/palette/sprite |
| F3 | Forge s'arrête à « tests verts » = le point où l'industrie considère qu'il reste 15-25% du travail (polish/juice/FTUE) | référentiel externe, axe 1 et 3 |
| F4 | Aucun test « joueur ignorant » : la solvabilité prouve qu'un bot *informé* peut gagner, pas qu'un joueur *naïf* comprend en 5 min | `run-oracle.mjs:64-78` (bot scripté avec connaissance du jeu) |
| F5 | HumanGate uniquement terminal — l'industrie place un kill-gate (vertical slice fun+look) AVANT la production de masse | `skill.md` : gate unique en s12 |
| F6 | Zéro direction artistique, zéro pipeline asset | §1.4 |

### 3.2 Trous d'intégrité (à fermer avant toute capacité nouvelle)

| # | Trou | Preuve |
|---|---|---|
| I1 | Gate mutation contournable : `run-oracle.mjs` seul donne un vert sans mutation | `run-oracle.mjs:43-81` |
| I2 | Triage mutation périmé jamais invalidé | `games/breakout/mutation_triage.json` (100% prétendu) vs journal (21% réel) |
| I3 | Red-team non indépendant en pratique : survival_arena red-teamé par Fable, l'orchestrateur lui-même, `redteam_ran:true` masquant la dégradation | `lab/forge_runs/survival_arena/verdict.json`, `roles.yaml:12` |
| I4 | Prose acceptée comme `allowed_tools` dans l'audit signé | `dispatch_audit.jsonl` breakout s4-archi, `contract.py:173-179` |
| I5 | Étapes fantômes s7/s8 | `s9-build.yaml:92` vs `dispatch.py:32-46` |
| I6 | Meilleur run (menagerie_tactics, OK zéro flag) invisible dans un worktree non mergé | `.claude/worktrees/forge-menagerie-tactics/` |
| I7 | Clé HMAC en clair, producteur peut re-signer (limite infra reconnue) | `verify_run.py:15-19`, `scripts/forge/.forge_key` |

---

## 4. ARCHITECTURE CIBLE

Principe : **des responsabilités, pas une armée d'agents.** Chaque responsabilité est portée par des étapes contractualisées existantes ou nouvelles. L'INTEGRATOR n'est pas un LLM : c'est le driver déterministe + le verdict signé.

```
DIRECTOR (Fable, orchestrateur — spawn via contrats, ne juge jamais)
 |
 +- DESIGN        s0 contrat · s1 prisme+rubrique fun · s2 worldscan+ · s2.5 ART BIBLE (nouveau)
 |                s3 décompo · s4 archi · s5 wiremap+gel
 |
 +- ENGINEERING   s9 build (best-of-k, escalade bornée) · s9.5 PASSE JUICE (nouveau)
 |
 +- ART           s8 ASSETS (nouveau, phase tardive) : style lock → génération → import → validation en jeu
 |
 +- QA            s10a oracle code (mutation intégrée) · s10b archi · s10c wiremap
 |                s10d VISUAL QA (nouveau) — oracle pixels
 |
 +- PLAYER TEST   s10e PLAYER AGENT (nouveau) — bot naïf FTUE, sans accès code
 |
 +- INTEGRATION   DRIVER (nouveau, déterministe) : état persistant, reprise, chaînage des gates
 |                s12 verdict signé (règles renforcées)
 |
 +- HUMANGATE     VERTICAL SLICE GATE (nouveau, mi-parcours, pouvoir de tuer)
                  + HumanGate terminal (existant)
```

Règle de verdict générale (renforcée) : **un résultat non prouvé = UNKNOWN/BLOCKED, jamais OK par défaut.**

---

## 5. NOUVEAUX MODULES

### M1 — Driver exécutable (`scripts/forge/driver.py`)

Transforme la prose de `skill.md` en machine à états.

- État persistant : `lab/forge_runs/<run_id>/state.json` (étape courante, reçus, compteur d'escalade, statut de chaque gate).
- Reprise après erreur : relance au dernier état sain, jamais de re-exécution silencieuse d'une étape signée.
- Chaque étape : `prepare_dispatch` (existant) → spawn → collecte du reçu → gate → transition. Les gates sont appelés EN CODE, plus en copier-coller.
- STOP durs conservés tels quels (`skill.md:158`) ; boucles d'auto-correction bornées conservées telles quelles (`skill.md:109-158`).
- Le driver ne contient AUCUN appel LM : il orchestre, il ne pense pas. Offline-capable (même doctrine que ceo-lane-assignment).

### M2 — Gates fiables (corrections I1-I5)

- Mutation câblée dans `run-oracle.mjs` (ou le driver refuse un vert oracle-code sans reçu mutation frais).
- `mutation_triage.json` horodaté + hash du code testé ; hash divergent → triage AUTO-INVALIDE (UNKNOWN).
- `verdict.py` : si `redteam_reviewer` == identité de l'orchestrateur → **BLOCKED** (pas de flag, un blocage).
- `contract._declared_tools` : refuse toute chaîne qui n'est pas un identifiant d'outil (regex stricte).
- Nettoyage : références s7/s8 purgées, menagerie_tactics mergé (gate Pierre).

### M3 — Visual QA Pipeline (s10d, contrat `s10d-oracle-visual.yaml`)

L'unité de vérification devient le **pixel rendu**, comme l'industrie (revue d'AD) et les meilleurs benchmarks (GameCraft, AVR : juger la sortie rendue, jamais le code seul).

- Entrées : screenshots Playwright aux moments clés du run e2e existant (menu, première action, mi-partie, victoire/défaite) + captures gameplay courtes.
- Couche 1 — **déterministe (gate)** : conformité palette (chaque frame échantillonnée ⊂ `palette.json` de l'art bible, tolérance ΔE), contraste texte/fond minimal, taille minimale des éléments interactifs à résolution cible, densité d'écran vide.
- Couche 2 — **juge multimodal (advisory d'abord)** : Claude vision contre une **rubrique figée à s1** (critères posés AVANT le test — protocole industrie). Scores lisibilité / cohérence / composition / qualité perçue, sortie `visual_report.md`.
- Promotion advisory→gate selon le même chemin que solvabilité : advisory sur 2 runs, gate ensuite.
- Doctrine : le juge multimodal est un LLM — il ne peut donc JAMAIS donner un OK seul. Il peut seulement dégrader (flags) ; le vert visuel exige couche 1 verte.

### M4 — Player Agent (s10e, contrat `s10e-player-test.yaml`)

Différent du bot solvabilité : celui-ci est **ignorant**.

- Contexte vierge, AUCUN accès au code ni au product_snapshot. Entrées : pixels + inputs joueur (Playwright), budget temps fixe.
- Métriques industrie : contrôles compris < 3 min sans explication ; toutes les mécaniques de base utilisées < 5 min ; points de blocage/abandon horodatés ; temps-avant-premier-fun (première boucle de récompense bouclée).
- Sortie : `player_test_report.md` — comprend le but ? trouve les contrôles ? bloque où ? abandonne pourquoi ?
- C'est un test plus dur que la solvabilité : « un bot ignorant progresse vite » ⊃ « un bot informé peut gagner ».

### M5 — Art Bible (s2.5, contrat `s2.5-art-bible.yaml`)

Branche le skill studio `art-bible` existant dans la chaîne, comme étape obligatoire avant s3.

- Interdit : « style fantasy ». Obligatoire : « fantasy pastel, formes rondes, lumière douce, personnages stylisés, palette chaude » — plus, machine-checkable :
  - `palette.json` (couleurs autorisées + tolérance) → consommé par s10d couche 1 ;
  - shape language + do/don't → rubrique du juge s10d couche 2 ;
  - règles UI (tailles minimales, hiérarchie) ; règles d'animation (durées, easing).
- Règle industrie : le style est validé **in-engine en screenshot** (test room), jamais sur asset isolé.
- L'art bible est gelée comme le wiremap : modification post-s5 = STOP dur (même mécanisme que `check_feature_set_frozen`).

### M6 — Passe Juice (s9.5, contrat `s9.5-juice.yaml`)

Étape NOMMÉE du pipeline (industrie : codifiée depuis « Juice it or lose it », 2012), appliquée après oracle code vert.

- Checklist contractuelle : screenshake, particules, tweens, flash d'impact, feedback audio, transitions.
- Contrainte de gel : la passe juice ne touche JAMAIS la logique (le gel des règles la borne — mutation re-testée après).
- Vérifiée par s10d (les événements clés produisent un feedback visible à l'écran).

### M7 — Vertical Slice Gate (HumanGate mi-parcours)

LA boucle industrie n°1 : rien ne part en production de masse avant qu'UNE tranche prouve fun ET look ensemble, jugée par un décideur qui peut tuer le projet.

- Après s9-slice (un niveau, boucle cœur complète, art représentatif, UI, audio, zéro placeholder) et TOUS les gates s10 : dossier soumis à Pierre — build jouable + `visual_report.md` + `player_test_report.md`.
- Question unique : « Est-ce que quelqu'un aurait envie d'y jouer ? »
- Issues : GO production complète / KILL / **RETOUR CONCEPTION** — seule circonstance où le dégel du jeu de règles est autorisé, via un contrat de dégel explicite signé (l'aval corrige l'amont, mais tracé).

### M8 — Bibliothèques Forge (mémoire de production)

Deux bibliothèques, jamais mélangées : **système technique ≠ identité artistique.**

- `forge_library/core/` — systèmes réutilisables (inventaire, combat, dialogue, save, IA, caméra, génération monde). Admission : uniquement des modules extraits de jeux ayant passé TOUS les gates (mutation incluse). Chaque entrée : provenance, licence, jeux d'origine, score de réutilisation.
- `forge_library/visual/` — styles, UI, VFX, gabarits — chaque entrée liée à SON art bible d'origine, jamais réutilisée telle quelle dans un autre style.
- Doctrine anti-asset-flip (piège documenté qui produit exactement « correct mais générique ») : **réutiliser les systèmes (invisibles au joueur), différencier la surface (ce que le joueur voit et touche).** Le processus est REUSE → ADAPT → CREATE, et la surface perçue doit toujours passer par ADAPT au minimum.

### M9 — Research Before Build (extension s2)

Étend `s2-worldscan` (existant, advisory-only — discipline conservée).

- Cherche : GitHub, plugins moteur, frameworks, exemples commerciaux, références visuelles.
- Produit un score par candidat : licence (MIT/CC0 ok, GPL → bloquant pour distribution closed-source), qualité, maintenance, compatibilité, sécurité.
- **JAMAIS d'import automatique.** Le rapport recommande REUSE/ADAPT/CREATE par système ; la décision est prise à s3/s4 et tracée dans le blueprint.
- Gate licence non-LLM : manifest des dépendances/assets avec champ provenance/licence obligatoire, vérifié à s10a.

### M10 — Pipeline Assets IA (s8, phase tardive)

Architecture préparée, activation SEULEMENT quand s10d existe (sinon aucun organe ne peut vérifier les assets).

- **Style Lock avant génération** : un modèle de style PAR JEU (LoRA entraîné sur l'art bible + refs) — jamais de prompt libre par asset (incohérence garantie, consensus de terrain). ControlNet pour figer silhouettes/poses. ComfyUI en workflow scriptable/batché.
- Flux par asset : concept → validation style (s10d couche 1 sur l'asset) → production → import moteur → **validation en jeu** (screenshot in-engine, jamais l'asset isolé).
- Spécialisés : Retro Diffusion pour pixel art (outputs commercialisables, provenance propre). Audio : uniquement plateformes à licence commerciale explicite (contentieux Suno/Sony non résolu en 2026).
- Gate légal : manifest provenance/licence par asset (préparation disclosure Steam dès la production) ; un asset 100% IA sans contrôle humain = pas de copyright (D.C. Circuit 2025) → le flux garde le croquis/la composition humains ou tracés.
- ⚠️ AVR-Agent (2025) : les modèles exploitent MAL les assets de qualité fournis — l'intégration (import → placement → screenshot de vérif) est gatée, pas supposée.

### M11 — Best-of-k au build (modification s9)

AVR-Agent : générer k candidats et sélectionner **bat l'itération longue sur un candidat à budget égal**. À s9 : k=2-3 builds de la slice en parallèle (worktrees isolés — mécanisme /joust existant), l'oracle + s10d sélectionnent, l'escalade ne s'applique qu'au gagnant.

---

## 6. ROADMAP

| Phase | Contenu | Modules | Critère de sortie (prouvable) |
|---|---|---|---|
| **P0 — Fermer les boucles** | driver exécutable, gates fiables, hygiène | M1, M2 | un run complet s0→s12 SANS copier-coller humain, reprise après kill prouvée, mutation non contournable, red-team≠orchestrateur enforced |
| **P1 — Les yeux** | Visual QA advisory, Player Agent | M3, M4 | `visual_report.md` + `player_test_report.md` produits sur 2 jeux existants (breakout, menagerie) ; au moins 1 problème réel détecté que les gates actuels rataient |
| **P2 — La direction** | Art Bible contractualisée, passe juice, rubrique fun à s1 | M5, M6 | un jeu forgé avec palette conforme (s10d couche 1 verte) et checklist juice complète |
| **P3 — Le kill-gate** | Vertical Slice Gate + dégel contractualisé | M7 | une slice soumise à Pierre AVANT production complète ; un RETOUR CONCEPTION exercé au moins une fois |
| **P4 — Réutilisation gouvernée** | bibliothèques + research scoring + best-of-k | M8, M9, M11 | 2e jeu du même genre construit avec ≥1 système REUSE et surface 100% différenciée |
| **P5 — Assets IA** | style lock + génération + import gaté | M10 | un jeu avec assets générés conformes à SON art bible, validés in-engine, manifest licence complet |
| **P6 — Studio en boucle** | mémoire de production notant les squelettes prouvés, amélioration continue | — | le pré-mortem s0 cite des leçons de bibliothèque, pas seulement des erreurs |

Ordre non négociable : P0 avant tout (chaque module ultérieur s'appuie sur le driver et des gates non contournables). P1 avant P2 (l'art bible sans oracle visuel = doc morte). P1+P2 avant P5 (générer des assets sans organe de vérification = slop industrialisé).

---

## 7. RISQUES

| # | Risque | Mitigation |
|---|---|---|
| R1 | **Le juge visuel est un LLM** — friction avec la doctrine « oracles non-LLM aux points de preuve » | couche déterministe (palette/contraste/tailles) = le seul gate dur ; le juge multimodal ne peut que DÉGRADER, jamais valider seul ; rubrique figée avant génération ; advisory 2 runs avant promotion |
| R2 | Le driver (M1) réécrit le cœur — risque de régression sur un système prouvé | le driver APPELLE les fonctions existantes testées (`gate`, `static_oracles`, `escalate`, `verdict`), n'en réimplémente aucune ; dry-run conservé ; premier run driver en parallèle d'un run manuel témoin |
| R3 | Coût/latence : s10d+s10e+best-of-k multiplient les tokens | budgets par étape dans les contrats (champ existant), télémétrie déjà en place (`forge_telemetry.jsonl`) pour mesurer avant de généraliser |
| R4 | Asset flip inversé : la bibliothèque pousse à réutiliser la surface | règle d'admission M8 (surface = ADAPT minimum) + s10d compare au style du jeu courant, pas à celui d'origine |
| R5 | Juridique assets (copyright IA, audio, disclosure Steam) | gate licence non-LLM par asset (M9/M10) ; audio = plateformes licenciées uniquement ; composition humaine tracée |
| R6 | Player Agent « ignorant » contaminé (fuite de contexte) | contrat s10e : contexte vierge type s11 (claude-blind existant, `runtime.py`), interdiction d'accès repo dans allowed_tools, vérifiable dans l'audit de dispatch |
| R7 | Vertical slice gate ralentit chaque forge | proportionné : profil micro/patch (chesscolor) exempté ; profil jeu complet obligatoire |
| R8 | Signataire unique (I7, `.forge_key` en clair) | limite infra reconnue, hors périmètre 2.0 ; ne pas prétendre que la signature protège d'un producteur local malveillant |
| R9 | Modèles exploitent mal les assets fournis (AVR) | validation in-engine par asset (M10) ; échec d'intégration = FAIL visible, pas contournement |

---

## 8. ORDRE D'IMPLÉMENTATION (premier incrément de chaque phase)

### Statut P0 (intégrité du système Forge) — au 2026-07-11

**Deux surfaces distinctes, jamais mélangées dans un verdict** (ratifié Pierre) :
- **Intégrité du système Forge** = le pipeline lui-même (driver, gates, provenance). C'est le périmètre de P0.
- **Qualité des jeux générés par Forge** = les artefacts produits (breakout, menagerie_tactics…). Gate séparé, ne bloque PAS la clôture d'une phase P0.x.

| Incrément | Statut | Preuve |
|---|---|---|
| **P0.1** driver déterministe (state.json, reprise, escalade bornée) | **IMPLEMENTED** | run complet automatisé + kill/resume prouvés, tests verts |
| **P0.2** reçu mutation lié au code (ferme I1/I2 : gate mutation dans le chemin critique, hash code+tests+harnais+triage) | **IMPLEMENTED** | contournements reproduits → BLOCKED |
| **P0.3** baseline verte obligatoire + `verify_run` redescend dans la preuve + `is_game` non-downgradable + **doctrine triage** (survivant → jamais un OK propre, `HUMANGATE_READY_WITH_OBJECTION`) | **IMPLEMENTED** | 269 tests verts + repro node réel des 3 chemins fermés |
| **menagerie_tactics** | **Artefact Forge / gate séparé** | NON bloquant pour P0.x — relève de la *qualité des jeux*, pas de l'*intégrité du système*. À traiter sur son propre gate de qualité de jeu, sauf si une preuve de validation du pipeline dépend explicitement de ce run (ce n'est pas le cas). |

Note : les libellés P0.2/P0.3 ci-dessus reflètent l'implémentation réelle (chemin mutation + intégrité de la preuve), qui a précisé le plan initial de cette section.

### Suite
- **Tranche P1 mécanique-only : CLOSED — expérience FALSIFIÉE** (2026-07-11, `P1_MECHANICAL_RESULTS.md`) : 5 signaux tirés, 0 vrai positif ; lisibilité (A1/A2/A3/A5) saine mais détection non prouvée ; A6 DROP ; FTUE v0 invalide sans notion de genre. **Gate de réouverture : pas de P1 complet tant qu'un signal mécanique n'a pas démontré une détection orthogonale à P0.**
- **P1.1 sondes à défauts injectés : EXÉCUTÉE — SUCCESS** (2026-07-12, protocole v2 ratifié + red-teamé, `P1_1_PROTOCOL.md`/`P1_1_REDTEAM_ADJUDICATION.md`/`P1_1_RESULTS.md`) : 4/4 défauts détectés, 0 faux positif, P0 vert 5/5, gels vérifiés. Démontré (formulation ratifiée) : *A1/A2/A3/A5 détectent des défauts synthétiques connus, orthogonaux à P0, sur Breakout, sans FP observé dans cette expérience* — ni généralisation, ni défauts subtils, ni exhaustivité. **Blocage méthodologique levé → P1 OUVERTE (décision Pierre 2026-07-12).** Les sondes deviennent des **fixtures permanentes de non-régression du capteur** (`fixtures/p1/`).
5. **P1.1** ~~(si go)~~ FAITE (SUCCESS) — prochain candidat : `s10d-oracle-visual.yaml` (couche 1 déterministe advisory nourrie par A1/A2/A3/A5 ; palette attendra M5).
6. **P1.2** `s10e-player-test.yaml` + bot naïf budget 5 min sur breakout. `player_test_report.md`. (Conditionné au gate de réouverture + seuils genre-conscients, cf. résultats.)
7. **P2.1** `s2.5-art-bible.yaml` + `palette.json` machine-checkable + branchement dans s10d couche 1.
8. … (suite conditionnée aux preuves des incréments précédents)

Chaque incrément : contrat → implémentation → oracle non-LLM → preuve d'exécution → entrée ledger via kaizen_loop (sur go explicite).

### Footgun `decision` — risque couvert sur les chemins connus (Forge)
`HUMANGATE_READY` est un préfixe de `HUMANGATE_READY_WITH_OBJECTION` : un consommateur du champ `decision` ne doit utiliser QUE l'égalité stricte, jamais `startswith`/`in`. Le distinguo « OK propre vs OK avec objection » vit dans `decision` + `humangate_flags`, PAS dans `software_verdict` (qui reste OK).

Garde-fou canonique posé (P0.4) : `forge.verdict.is_clean_pass(verdict)` = `software_verdict=="OK"` ET `decision=="HUMANGATE_READY"` (strict) ET aucun flag. **C'est le SEUL prédicat autorisé pour décider une promotion.**

Couverture (audit 2026-07-11 des consommateurs de `software_verdict == OK`) :
- **Périmètre Forge** : `studio_link.propose_ledger_entry` est le seul point de promotion-proposition ; il consomme `is_clean_pass` et embarque `clean_pass`. **Couvert.**
- **Hors périmètre Forge** (lane autopilot/kaizen, surface distincte) : `executor_report.analyse_report` et l'auto-close autopilot décident sur `software_verdict == OK` seul, mais sur des **rapports IMP** (namespace `DOCS_OK`), pas des verdicts Forge. Aucun pont actuel ne route un verdict Forge vers ces gates. Non étendu (règle : décisions de merge de jeu hors Forge) — à ré-évaluer si un tel pont est créé.

---

## Rapport de charter

- software_verdict: OK — document produit, ancré sur cartographie fichier:ligne + sources externes citées ; aucune modification de code effectuée
- evidence_verdict: MECHANICAL_VALIDATION_ONLY — les faits internes sont vérifiés par lecture du repo ; les faits externes sont sourcés mais non répliqués localement
- claim_verdict: NO_CLAIM_ALLOWED — aucune affirmation que Forge 2.0 « fonctionnera » ; seules les preuves d'exécution des incréments P0.x+ feront foi
