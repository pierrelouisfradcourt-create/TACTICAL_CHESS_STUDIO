# AUDIT DE VÉRITÉ — STUDIO_MASTER_SCHEMA.html

**Document audité :** `docs/forge/STUDIO_MASTER_SCHEMA.html` · commit `5ec42be` · 113 265 o · dernière modification 2026-07-28 13:00 · **propre en index** (aucune modification locale)
**Date d'audit :** 2026-07-30 · **Régime :** lecture seule, aucune mutation runtime, aucune activation
**Patron suivi :** `COMPARATIF_SCHEMA_VS_REEL_2026-07-27.md` (audit daté compagnon, pas réécriture du canonique)
`claim_verdict: NO_CLAIM_ALLOWED`

## Convention

**[M]** Mesuré — code, test, manifeste, commit, artefact · **[H]** Hypothèse · **[E]** Expérience

**Statuts :** `IMPLEMENTED` (code actif) · `TESTED` (test dédié trouvé) · `DOCUMENTED_ONLY` (doc sans code) · `PASSIVE` (code présent, aucun consommateur ou non dispatchable) · `BLOCKED` · `NOT_FOUND` · `UNKNOWN` (non vérifié dans cet audit)

## Deux corrections à mes propres relevés — signalées parce qu'elles ont failli fausser l'audit

1. **`RÉCONCILIATION` : premier relevé « 0 occurrence » — FAUX.** Mes greps testaient `RECONCIL`, `Réconcil`, `reconcil` ; le document écrit `RÉCONCILIATION` (É majuscule accentué). **6 occurrences réelles.**
2. **`search.mjs` / `role_sim.mjs` : premier relevé « ABSENT » — FAUX.** Je n'avais cherché que `scripts/forge/`. Ils sont dans `knowledge_base/` — **où le document les situe correctement**.

Dans les deux cas le document avait raison et mon instrument avait tort. Consigné ici parce qu'un audit qui ne rapporte pas ses propres faux négatifs n'est pas un audit.

---

# 1. Audit vérité — composants du document

## 1.1 Code actif

| élément | statut | preuve | écart |
|---|---|---|---|
| Porte de dispatch `prepare_dispatch` | **IMPLEMENTED** | `scripts/forge/dispatch.py:210`, hook `pretool_forge_guard` déclaré actif dans `.claude/settings.json` | aucun |
| Chaîne `ORDER` 13 étapes | **IMPLEMENTED** | `dispatch.py:53` — s0,s1,s2,s3,s4,s5,s6,s9,s10a,s10b,s10c,s11,s12 | **s7 et s8 n'existent pas** dans ORDER |
| Profils de chaîne (`full`,`patch`,`micro`,`review`,`increment`,`standard`,`standard_godot`,`artbible`) | **IMPLEMENTED** | `dispatch.py:123` PROFILES | le doc ne mentionne pas `standard_godot` (postérieur) |
| Oracles déterministes s10a/s10b/s10c/s12 | **IMPLEMENTED** | `dispatch.py:75` `DETERMINISTIC`, garde `runtime.py:88` | aucun |
| `s10s-oracle-standard` (6 oracles squelette) | **IMPLEMENTED** | `standard_oracles.py` : `check_line_states`, `check_placement`, `check_collisions`, `check_observable_coverage`, `check_genre_coverage`, budget | **absent du document** (postérieur au 07-28 pour Godot) |
| Verdict signé HMAC + `verify_run` | **IMPLEMENTED** | `verdict.py`, re-vérification documentée | aucun |
| POOL de builders (best-of-N) | **IMPLEMENTED + TESTED** | `scripts/forge/pool.py` (2 261 o) · **consommé** `driver.py:62 from forge.pool import DEFAULT_POOL_SIZE, pool_decision` · `tests/test_pool.py` | aucun — **le document dit vrai** |
| Escalade haiku→sonnet→opus | **IMPLEMENTED** | `escalate.py:19 LADDER` | **inapplicable au profil réellement exécuté** (voir §4-C1) |
| `search.mjs` (fouille bibliothèque) | **IMPLEMENTED** | `knowledge_base/search.mjs` | aucun |
| `role_sim.mjs` | **IMPLEMENTED** | `knowledge_base/role_sim.mjs` | le doc le marque « cible » puis se corrige au 07-15 — **la correction est juste** |
| `reuse_ratio.mjs`, `knowledge_trace.mjs`, `pending_review.mjs`, `studio_selfaudit.mjs` | **IMPLEMENTED** | `scripts/forge/*.mjs`, tailles 14–17 Ko | aucun |
| Garde de référence (témoin gelé) | **IMPLEMENTED** | `reference_guard.py` + `reference_protected.yaml`, vérifié `CLEAN \| 357 \| 9aea255c…` | **absente du document** (postérieure) |

## 1.2 Artefacts / sorties runtime

| élément | statut | preuve |
|---|---|---|
| `knowledge_base/catalog.json` | **IMPLEMENTED** | 27 228 o |
| `wiremap.json` / `wiremap_frozen.json` par run | **IMPLEMENTED** | présents dans `auto_battler_i1/i2`, `breakout`, `card_engine`, … |
| `state.json` « cœur du plan vivant » | **IMPLEMENTED** | écrit par le driver, mine de 43 appels LLM sur 20 runs |
| `verdict.json` signé | **IMPLEMENTED** | 3 runs de calibration Snake, HMAC re-vérifié |

## 1.3 Documentation canonique / roadmap

| élément | statut | preuve |
|---|---|---|
| Vision A/B/C (Production / Forge / Troisième Cerveau) | **DOCUMENTED_ONLY** | doctrine, pas un mécanisme — correctement présentée comme telle |
| `s8 HABILLAGE` (étage 2 ④) | **NOT_FOUND** | **aucun contrat `s8-*.yaml`** · absent de `ORDER` et de `DEDICATED_PROFILE_STEPS` |
| RÉCONCILIATION 4 sources → squelette | **DOCUMENTED_ONLY** | le document le déclare lui-même « ambre pointillé = **cible, non codée** » — **affirmation honnête** |
| Panel Prisme ×5 (CEO/GD/Front/Back/Joueur) | **PASSIVE / partiel** | voir §2.1 |
| Table des bilans multi-LLM | **DOCUMENTED_ONLY** | le document l'étiquette lui-même « (HYPOTHÈSE) » |

## 1.4 Écarts de premier ordre

**Le document est globalement honnête.** Il porte ses propres marqueurs « cible », « HYPOTHÈSE », « à vérifier au cas par cas », et ses mises à jour datées corrigent ses propres erreurs antérieures. Les écarts réels sont peu nombreux et de nature *chronologique* (le monde a bougé depuis le 07-28) plutôt que de nature *fausse affirmation*.

| # | écart | gravité |
|---|---|---|
| **É1** | **Incohérence interne** : *Détail A* dit « aujourd'hui **1 agent Opus** » et marque les 5 rôles « ambre = cible » ; *Coupe B* et *Nomenclature C* affichent « s1 PRISME — PANEL » / « s1 PRISME (panel ×5) » **sans le marqueur** | **moyenne** — un lecteur des vues B/C croit le panel construit |
| **É2** | **`s8 HABILLAGE`** figure dans l'étage 2 sans marqueur cible, alors qu'aucun contrat n'existe et que l'étape n'est dans aucun profil | **moyenne** |
| **É3** | Le document ne connaît ni `standard_godot`, ni `s10s-oracle-standard`, ni la garde de référence, ni la calibration N=3, ni la doctrine de routage V2 ratifiée le 2026-07-30 | **haute** — 4 mécanismes réels invisibles |
| **É4** | Les 3 contrats `s1-prisme-lens-*` existent depuis le document mais **ne sont dans aucun profil** | **moyenne** |

---

# 2. Surfaces critiques

## 2.1 PRISME — `PASSIVE` (contrats présents, panel non dispatchable)

Distinguer les quatre choses que le mot recouvre :

| couche | statut | preuve |
|---|---|---|
| **doctrine** Prisme (convergence, 4 sources, « exigences de preuve jamais reçus ») | **DOCUMENTED_ONLY** | Détail A du schéma |
| **contrat** `s1-prisme.yaml` | **IMPLEMENTED** | dans `ORDER` · `capability_role: prisme` |
| **contrats de lentille** `s1-prisme-lens-{archidepot,gamedesign,gameplayprog}.yaml` | **PASSIVE** | **[M]** les 3 fichiers existent · **[M]** aucun n'est dans `ORDER` ni `DEDICATED_PROFILE_STEPS` → **non dispatchables** |
| **mécanisme exécuté** panel ×5 | ~~NOT_FOUND~~ **PASSIVE** *(corrigé 2026-07-30 soir — audit délégué)* | **[M]** `scripts/forge/panel.py` existe (5 542 o) : `LENSES=(ceo,game_designer,front,back,joueur)` l.30, `panel_prisme_executor` l.60, câblé `run_real.py:34/803` et activé par `--charter`. MAIS : aucun contrat par lentille (contourne la porte ADR-002), même `payload.model` pour les 5 (l.71/79 — mono-modèle par construction), et les lentilles ne peuvent pas écrire leurs artefacts (`make_panel_claude_call` sans `tools` → méta-rapports, preuve `shmup_slice/prisme/prisme_lens_ceo.md:1`). Mon relevé initial cherchait un orchestrateur *contractualisé* et a conclu NOT_FOUND à tort — le code existe, c'est le régime de contrat qui manque. |

**[M] Écart entre le panel décrit et les contrats écrits :** le document nomme **CEO · Game Designer · Dev Front-End · Dev Back-End · Joueur**. Les contrats existants sont **archidépôt · game design · gameplay programming**. **Ni CEO ni Joueur n'ont de contrat** — or ce sont précisément les deux points de vue les plus éloignés de l'ingénierie, donc ceux qui portaient le plus de diversité.

**[M] Ce que `s1-prisme` produit réellement :** `output_contract` = `product_snapshot.md {ce_que_le_joueur_voit, ce_qu_il_fait, ce_qu_il_ressent, regles_observables[]}`. **Aucune mention d'EXPECTED, d'ADDITIONS, ni de source_role.** L'étape qui tourne produit un instantané produit à 4 sections — pas les 2 sources d'exigence que Détail A lui attribue.

**[M]** `s1-prisme` n'appartient **pas** au profil `standard_godot`. Sur le curriculum de jeux réellement exécuté, le Prisme ne tourne pas du tout.

## 2.2 CORE WIREMAP — `IMPLEMENTED` (le composant le plus solide de la chaîne)

| brique | statut | preuve |
|---|---|---|
| modèle de données | **IMPLEMENTED** | `wiremap.json` / `wiremap_frozen.json` produits par run |
| validation | **IMPLEMENTED** | `run_real.py:489 _validate_wiremap` |
| navigateur / outil | **IMPLEMENTED + TESTED** | `scripts/forge/wiremap_nav.mjs` (33 850 o) + `wiremap_nav.test.mjs` (19 265 o) |
| **consommation runtime** | **IMPLEMENTED** | `mutation_proof.py:70 mutation_scope_from_wiremap` · `:151 logic_files_from_wiremap` · `:402 _wiremap_file_categories` · `driver.py:1417/1444/1450` |
| **intégration oracle** | **IMPLEMENTED** | `static_oracles.py:263 check_wiremap` · `:728 frozen_features_from_wiremap` · `:746 check_feature_set_frozen` · `standard_oracles.py` : `check_line_states`, `check_placement`, `check_collisions`, `check_observable_coverage`, `check_genre_coverage` |
| générateur | **UNKNOWN** | le contrat `s5-wiremap` fait produire la carte par un **agent LLM** ; aucun générateur déterministe cherché ni trouvé dans cet audit |

**Conclusion : ce n'est ni une architecture décrite ni un prototype — c'est un mécanisme actif**, avec au moins **10 consommateurs distincts** répartis sur 4 modules. C'est la surface la mieux câblée du dépôt.

## 2.3 RÉCONCILIATION — deux sens homonymes, un implémenté, un non

**[M] Sens 1 — Détail A : 4 sources d'exigence (CORE · EXPECTED · ADDITIONS · DERIVED) → squelette.**
Statut : **DOCUMENTED_ONLY**. Aucun composant ne collecte ni ne fusionne 4 sources. Le document le déclare lui-même « cible, non codée ».

**[M] Sens 2 — régime STANDARD : application mécanique de `repo_map` / `capabilities` au build.**
Statut : **IMPLEMENTED**.
- `scripts/forge/standard/capabilities.yaml:12` — « Regles verifiees mecaniquement a la reconciliation »
- `scripts/forge/standard/repo_map.yaml:4` — « Le builder ne la pose jamais : la reconciliation applique cette table »
- `repo_map.yaml:108` — « … est un FAIL a la reconciliation, jamais un placement par defaut »
- Porté par `standard_oracles.check_placement(wiremap, repo_map)`

> **Le même mot désigne un mécanisme actif et une cible non codée.** C'est le motif exact que Pierre a ratifié le 2026-07-23 : *quand deux usages partagent un nom, séparer les champs plutôt qu'arbitrer*. À corriger dans le document.

**[M] Découverte annexe — un consommateur sans producteur.** `standard_oracles.check_line_states` (l. 332-415) **valide déjà** le modèle à sources : une ligne `EXPECTED` sans `reference` non vide est une violation ; une ligne `EXPECTED`/`ADDITIONS` sans `source_role` est une violation.

Donc la Forge sait **vérifier** qu'une ligne de wiremap déclare correctement sa source, mais **rien ne produit** cette classification — c'est l'agent wiremap qui l'écrit à la main. C'est l'inverse du mode de panne habituel du studio : ici il y a un **lecteur sans écrivain**, pas un écrivain sans lecteur.

**Boucle corrective : NOT_FOUND.** Aucun composant ne compare déclarations ↔ code ↔ runtime pour produire une correction. Les oracles constatent et bloquent ; ils ne réconcilient pas.

---

# 3. Étage 2 · BUILD — FOUILLE → WEB → POOL

| ① ② ③ ④ | affirmation du document | statut | preuve |
|---|---|---|---|
| ① **FOUILLE BIBLIOTHÈQUE** | `search.mjs` — filtres déterministes · `knowledge_base/catalog.json` | **IMPLEMENTED** | les deux fichiers existent (27 228 o pour le catalogue) |
| ② **RETOUR WEB (delta)** | world-scan ciblé du manquant · cité · ingestion = gate Pierre | **IMPLEMENTED (contrat)** | `s2-worldscan.yaml` dans `ORDER`, `run: WebSearch, WebFetch`, `advisory: true`, sorties `GAME_REFERENCE/` |
| ③ **POOL DE BUILDERS** | « pool.py construit (best-of-N même tier) — 2026-07-13 » | **IMPLEMENTED + TESTED** | `pool.py` · importé `driver.py:62` · `test_pool.py` |
| ④ **s8 HABILLAGE** | assets · agent aveugle · peau sur ancres math | **NOT_FOUND** | **aucun contrat `s8-*`** · absent de `ORDER` et de tout profil |

## Entrées / sorties réellement câblées

| question | réponse mesurée |
|---|---|
| quels agents existent ? | s2 worldscan (haiku), s9 builder (haiku) / game_forger (opus). **Pas d'agent s8.** |
| quels contrats existent ? | `s2-worldscan.yaml`, `s9-build*.yaml` (4 variantes). **Pas de `s8-*`.** |
| quelles données entrent ? | `knowledge_base/catalog.json`, `GAME_REFERENCE/` (worldscan), squelette gelé `scripts/forge/standard/` |
| quelles sorties sont consommées ? | la wiremap → mutation + 6 oracles standard (§2.2). **`GAME_REFERENCE/` : consommateur mécanique non établi dans cet audit** → `UNKNOWN` |
| passage vers le builder | **[M] rompu sur le profil réellement exécuté** : `standard_godot` = (s9-build-godot-standard, s10a, s10s, s11, s12). **Ni fouille, ni world scan, ni pool multi-modules.** L'étage 2 décrit une chaîne que le profil courant ne parcourt pas. |

**[M] Le « fin du from-scratch » annoncé en titre n'est pas atteint sur `standard_godot`** : ce profil part du squelette gelé, sans étape de fouille ni de récupération web.

---

# 4. Capacités promises mais inexistantes

Seuls les écarts importants.

| # | capacité promise | réalité mesurée | type de trou |
|---|---|---|---|
| **C1** | « escalade ×2 max (haiku→sonnet→opus) » comme boucle de rattrapage | **[M]** `escalate.py` ne couvre que les **builders** ; `standard_godot` utilise `game_forger` et `redteam_code`, **tous deux déjà opus** → aucune escalade possible. 0 escalade sur 3 runs. | mécanisme réel, **inapplicable au profil courant** |
| **C2** | Panel Prisme ×5 | **[M]** 3 contrats sur 5, **aucun dispatchable**, CEO et Joueur inexistants | contrat sans dispatch |
| **C3** | RÉCONCILIATION 4 sources | **[M]** aucun code ; mais **le validateur de son résultat existe** (`check_line_states`) | **lecteur sans écrivain** |
| **C4** | s8 HABILLAGE | **[M]** aucun contrat, aucun profil | étape documentée sans existence |
| **C5** | « red-team plan (Qwen) — revue indépendante » | **[M]** `s6-redteam-plan` **hors du profil `standard_godot`** → ne tourne jamais ; et `redteam_ran` est faux **par construction** dans ce profil (`driver.py:1913`, `runtime.py:92`) | garde annoncée, **jamais appliquée sur le curriculum** |
| **C6** | `GAME_REFERENCE/` (sortie worldscan) | **[M]** produit par contrat ; **aucun consommateur mécanique identifié** dans cet audit | sortie produite, usage `UNKNOWN` |
| **C7** | Protection du témoin gelé | **[M]** la garde **détecte** ; `Write(.claude/**)` est en **allow** et `reference_protected.yaml` n'a **aucune règle deny** → rien n'**empêche** | détection sans prévention |

---

# 5. Corrections proposées au document canonique — **NON APPLIQUÉES**

`STUDIO_MASTER_SCHEMA.html` est un document canonique **commité**. Le modifier est une écriture durable, donc **propose-only, ratifiée par Pierre** (invariant ADR-002). Les corrections ci-dessous sont prêtes mais **non appliquées**.

| # | emplacement | correction | justification |
|---|---|---|---|
| **P1** | Coupe B et Nomenclature C | remplacer « s1 PRISME — PANEL » et « s1 PRISME (panel ×5) » par « **s1 PRISME (1 agent ; panel ×5 = cible)** » | aligne B/C sur Détail A, qui dit déjà vrai (É1) |
| **P2** | Étage 2 ④ | marquer **s8 HABILLAGE en « cible »** (ambre pointillé) | aucun contrat, aucun profil (É2, C4) |
| **P3** | Détail A | renommer la cible en « **RÉCONCILIATION D'EXIGENCES** » et ajouter une note : *homonyme distinct de la « réconciliation » du régime STANDARD, elle implémentée* | collision de noms (§2.3) |
| **P4** | Coupe B / Étage 3 | ajouter le profil **`standard_godot`** et l'oracle **`s10s`** | 4 mécanismes réels invisibles (É3) |
| **P5** | Étage 3 | ajouter la **garde de référence** (`reference_guard.py`) et la **calibration N=3** (bande de bruit ~20 %) | É3 |
| **P6** | Détail A | noter que les 3 contrats `s1-prisme-lens-*` existent mais **ne sont dans aucun profil** | É4, C2 |
| **P7** | nouvelle case | renvoyer vers `INFERENCE_ORCHESTRATOR_V2_PROPOSAL.md` (doctrine de routage ratifiée 2026-07-30) | É3 |
| **P8** | Étage 3 | préciser que l'escalade **ne s'applique pas** aux rôles déjà au sommet de l'échelle | C1 |

---

# 6. Planning — prochain jeu

## 6.1 Statut corrigé — ratifié Pierre 2026-07-30

> **Breakout = expérience externe existante, HORS campagne Forge.**
> **Snake = fabriqué avec la Forge, mais dans un état particulier pour la calibration — ne peut pas servir de mesure builder from-scratch.**

### Correction d'une inférence erronée de cet audit

**Ce que j'avais mesuré (exact) :** `games/breakout/` contient 15 fichiers ; `lab/forge_runs/breakout/` contient `charter.yaml` (`run_id: breakout-20260711`), `blueprint.yaml`, `decompo.md`, `product_snapshot.md`, `redteam_plan.md`, `worldscan.json`, `wiremap.json`, `wiremap_frozen.json` ; **aucun `state.json`, aucun `verdict.json`**.

**Ce que j'en avais inféré (faux) :** « la chaîne DESIGN a tourné », « déjà forgé le 2026-07-11 ». La forme des artefacts et leur emplacement dans `lab/forge_runs/` m'ont fait conclure à une campagne Forge.

**Correction Pierre :** ce fut un **essai séparé, hors protocole**. L'absence de `state.json` et de `verdict.json` — relevée mais mal interprétée — était le signal : **le driver instrumenté n'a jamais tourné sur ce projet.**

**Leçon d'audit :** des artefacts de forme Forge dans un répertoire Forge ne prouvent pas une campagne Forge. **Seule la présence d'un `state.json` et d'un `verdict.json` signés atteste qu'une chaîne instrumentée a réellement tourné.** C'est le critère mécanique à utiliser, pas la forme des fichiers.

### Ce que cela change — et ce que cela ne change pas

| point | statut |
|---|---|
| Breakout comme preuve de contamination de la Forge | **RETIRÉ** — l'attribution était infondée |
| Breakout comme cible E7 | **écarté** — non par contamination, mais parce que la décision est de repartir sur un jeu neuf |
| Snake comme cible E7 | **écarté** — état particulier pour la calibration |
| **Risque général de contamination par lecture du dépôt** | **MAINTENU** — voir §6.2 ; c'est un fait de configuration, indépendant de tout projet particulier |

## 6.2 Risque de contamination — général, non attribué

**[M] Fait de configuration, vérifié :** les contrats builder déclarent `read: dépôt entier`. Un agent de build peut donc lire **n'importe quelle implémentation présente dans `games/`**.
**[M] Aucun mécanisme d'exclusion de contexte n'existe** : le confinement d'outils est en défaut de format (boucle 4, non corrigé), et une interdiction posée en `actions_interdites` est **déclarative, non applicable** — c'est un commentaire, pas une garde.

**Ce risque n'est attribué à aucun projet.** Il pèse sur **toute** campagne E7 dont la cible aurait un équivalent déjà présent dans `games/` — quelle qu'en soit l'origine, Forge ou non.

**Contre-mesure disponible aujourd'hui : le choix de cible.** Une cible **vierge**, sans équivalent dans le dépôt, rend la contamination impossible plutôt que de tenter de l'interdire. C'est la seule contre-mesure fiable tant qu'aucun mécanisme d'exclusion n'existe.

## 6.3 Décision — prochaine campagne sur cible vierge

> **Ratifié Pierre 2026-07-30 :** *« Repartir sur un prochain jeu neuf construit avec la Forge depuis zéro, et utiliser cette campagne comme vraie mesure E7. »*

**Critères de la cible :**

| critère | raison |
|---|---|
| **absente de `games/`** | supprime le risque de contamination (§6.2) |
| **construite depuis zéro par la Forge** | `game_forger` doit **fabriquer**, pas vérifier — c'est la condition qui manquait à Snake |
| **passant par le driver instrumenté** | `state.json` + `verdict.json` signés, sans quoi rien n'est mesuré (leçon §6.1) |
| **profil `standard_godot`** | cohérence avec le curriculum ratifié 2026-07-28 |
| **taille bornée** | E7 exige au moins 2 exécutions (Opus + Qwen Coder), et N≥5 pour toute affirmation sur le coût |

**[E10] — préalable, coût nul :** nommer cette cible et vérifier que son charter est produisible. **Tant qu'elle n'est pas nommée, E7 n'a pas d'entrée.**

## 6.4 Planning de campagne — applicable à la cible retenue

| volet | contenu |
|---|---|
| **charter** | produit par la chaîne (s0) sur la cible retenue en E10 — **jamais réutilisé d'un projet existant**. Stack imposée : Godot / GDScript, squelette gelé `scripts/forge/standard/` |
| **périmètre minimal** | une boucle de jeu complète et close : entrée joueur → règle → condition de victoire **et** de défaite explicites · état déterministe et rejouable (seed) · logique pure séparée du rendu et de l'entrée · **hors scope** : multi, réseau, classement en ligne, persistance |
| **agents impliqués** | `game_forger` (s9-build-godot-standard) — **Opus vs Qwen Coder : c'est le comparatif E7** · `redteam_code` (s11, advisory) · oracles non-LLM |
| **étapes Forge** | profil `standard_godot` : s9 → s10a → s10s → s11 → s12, **via le driver instrumenté** (`state.json` + `verdict.json` obligatoires) |
| **oracles attendus** | s10a : tests · e2e · mutation · solvabilité — s10s : les 6 oracles du squelette (line_states, placement, collisions, index, contract_completeness, budget) — s12 : verdict signé HMAC |
| **métriques de succès — discrètes, hors bande de bruit** | build atteint (binaire) · 6 oracles (discret) · score de mutation · solvabilité (binaire) · itérations jusqu'au vert |
| **métriques soumises au bruit ~20 %** | coût, durée → **N≥5** exigé pour toute affirmation (bande établie par la calibration N=3) |
| **critère produit — non négociable** | **[M]** leçon Snake ratifiée 2026-07-29 : *un projet peut satisfaire tous ses oracles et ne pas démarrer*. **Le jeu doit démarrer et afficher**, vérifié hors chaîne d'oracles. |
| **garantie de vierge** | **[M]** vérifier avant lancement qu'aucun équivalent du jeu visé n'existe dans `games/` — c'est la seule contre-mesure de contamination disponible (§6.2) |

---

# 6bis. Précisions de doctrine — ratifiées Pierre 2026-07-30

Ces cinq précisions sont postérieures à l'audit ci-dessus et le **complètent** : elles ne corrigent aucun de ses constats, elles fixent la cible.

**Régime documentaire ratifié :** *« Ne pas corriger le master schema directement. Garder l'audit compagnon comme vérité de l'écart, puis appliquer uniquement après décision les corrections documentaires. »*
→ **Ce document est la source de vérité de l'écart.** `STUDIO_MASTER_SCHEMA.html` reste inchangé ; les 8 corrections de §5 restent proposées, non appliquées, jusqu'à décision séparée.

## 6bis.1 PRISME — le critère est la décorrélation, pas le nombre d'agents

> *« L'objectif n'est pas forcément 5 agents indépendants. Le besoin est la diversité des points de vue. Cible : 1 orchestrateur Prisme, plusieurs lentilles exécutables ; chaque lentille peut être un rôle, un prompt spécialisé ou un modèle différent. Le critère de réussite n'est pas le nombre d'agents, mais la décorrélation des analyses. »*

**Deux lentilles prioritaires :** vision **joueur / fun observable** · vision **produit / valeur marché**.

**[M] Confirmation par la mesure :** ce sont exactement les deux points de vue **sans contrat**. Les 3 contrats de lentille existants — `archidepot`, `gamedesign`, `gameplayprog` — sont tous adjacents à l'ingénierie. Le trou mesuré et la priorité ratifiée coïncident.

### Conséquence analytique : le critère ordonne les trois mécanismes

Les trois formes de lentille autorisées ne sont pas équivalentes **sur le critère de décorrélation** :

| mécanisme | décorrélation attendue | raison |
|---|---|---|
| prompt spécialisé, **même modèle** | **faible** | mêmes poids, mêmes angles morts — l'angle de la question change, pas celui du regard |
| rôle distinct, même modèle | moyenne | le cadrage contraint la sortie, pas la manière de se tromper |
| **modèle différent** | **forte** | seul mécanisme qui change la source des erreurs |

**[H]** Un panel de 5 lentilles toutes servies par le même Opus peut produire une décorrélation proche de zéro tout en ayant l'apparence d'un panel — le défaut que la doctrine de routage V2 combat un étage plus haut.

### Protocole de décorrélation — ratifié Pierre 2026-07-30

| terme | définition |
|---|---|
| **Intra** | la **même lentille rejouée plusieurs fois** (même rôle, même prompt, même modèle) → plancher de bruit |
| **Inter** | comparaison **entre lentilles ou modèles différents** → signal + bruit |

> **Un panel n'est utile que si `Inter > Intra`.**

**[E]** Mécanisme identique à la sonde-contrôle de `INFERENCE_ORCHESTRATOR_V2_PROPOSAL.md` §9.2 — rien de nouveau à concevoir, le protocole existe déjà. Le critère « décorrélation » devient une **quantité mesurée**, pas une intention.

### Ce que la cible n'est pas

> *« Ne pas créer artificiellement 5 agents. »*

La cible est : **plusieurs perspectives exécutables · rôles distincts · éventuellement modèles différents · optimisation du ratio gain informationnel / coût.**

**Conséquence :** ajouter une lentille se justifie par son **gain informationnel marginal mesuré** (`U(lentille)` = éléments qu'elle seule apporte et qui sont retenus), rapporté à son coût. Une lentille dont `Inter ≈ Intra` face aux existantes doit être **retirée**, pas conservée pour compléter un compte. Le nombre 5 du schéma d'origine n'est pas un objectif.

## 6bis.2 WORLD RESEARCH — trois rôles à ne pas confondre

> *« Gemini : exploration externe et diversité de recherche · Sonnet : fallback capacité si Gemini indisponible · aucune autorité de décision produit. Le fallback doit être tracé dans les preuves. Sinon on peut croire mesurer de la diversité alors que tout tourne sur Sonnet. »*

**[M]** Le contrat `s2-worldscan.yaml` porte déjà `advisory: true` et « n'impose aucune décision » — l'absence d'autorité est **déjà contractuelle**, rien à ajouter.
**Reste à câbler :** `worldscan_provider_executed` au reçu signé + **compteur d'occurrences de repli** (un drapeau seul deviendrait une constante si la clef manque durablement — défaut L2).
Spécification complète : `INFERENCE_ORCHESTRATOR_V2_PROPOSAL.md` §5.4.

## 6bis.3 WIREMAP — pas de refonte, connecter les couches documentaires

> *« Confirmé : le Core WireMap est une brique active et critique. Pas de refonte nécessaire. La priorité est plutôt de connecter les couches encore documentaires : réconciliation 4 sources · génération mécanique des classifications EXPECTED / ADDITIONS / DERIVED · boucle corrective. »*

Aligné sur §2.2 (`IMPLEMENTED`, 10+ consommateurs) et §2.3. Les trois chantiers nommés correspondent exactement aux trois statuts non-implémentés de la surface : `DOCUMENTED_ONLY`, **producteur absent**, `NOT_FOUND`.

## 6bis.4 RÉCONCILIATION — créer le producteur, pas durcir la validation

> *« Ne pas confondre : reconciliation standard = déjà implémentée · réconciliation d'exigences 4 sources = encore cible. La prochaine étape n'est pas d'ajouter des validations, mais de créer le producteur qui alimente les champs déjà vérifiés par les oracles. »*

### INVARIANT D'ARCHITECTURE — ratifié Pierre 2026-07-30

> **Si un validateur existe mais qu'aucun producteur mécanique ne génère la donnée attendue :**
> **→ créer le producteur.**
> **→ ne PAS renforcer le validateur.**

Durcir un validateur sur un champ que personne ne produit ne fait que **déplacer le silence** d'un cran : il donne l'illusion d'un contrôle et masque l'absence de la donnée.

**Application au cas courant :** `check_line_states` sait vérifier `EXPECTED` / `ADDITIONS` / `source_role` ; **aucun système ne produit automatiquement cette classification.** Donc **la prochaine évolution est côté génération / réconciliation, pas côté oracle.**

C'est le **symétrique** du mode de panne n°1 du studio (*écrivain sans appelant*, 6 occurrences documentées). Ici : **lecteur sans écrivain**. **[M]** Cas mesuré : `standard_oracles.check_line_states` (l. 332-415) exige déjà `reference` non vide sur `EXPECTED` et `source_role` sur `EXPECTED`/`ADDITIONS` — **aucun composant ne les produit**, c'est l'agent wiremap qui les écrit à la main.

**Le renommage reste requis** (§5 P3) : `réconciliation d'exigences` ≠ `réconciliation STANDARD`. Deux champs, pas un arbitrage — règle ratifiée 2026-07-23.

## 6bis.5 ÉTAGE 2 / E7 — trois préalables, dont un sans mécanisme

> *« Avant E7 : définir une vraie cible from-scratch · empêcher la contamination par l'existant · mesurer la fabrication, pas la récupération. »*

| préalable | état | mécanisme disponible |
|---|---|---|
| définir une vraie cible from-scratch | **à faire** — E10 | choix humain, coût nul |
| **empêcher la contamination par l'existant** | **[M] aucun mécanisme** | les contrats builder déclarent `read: dépôt entier` ; le confinement d'outils est en défaut de format (boucle 4, non corrigé) ; une interdiction en `actions_interdites` est **déclarative, non applicable** |
| mesurer la fabrication, pas la récupération | découle des deux précédents | métriques discrètes §6.3 |

**Le deuxième est le seul bloquant réel : il n'a aucun mécanisme aujourd'hui.** Tant qu'il n'existe pas, la seule contre-mesure fiable est le **choix de cible vierge** (§6.2 / §6.3) — un jeu sans équivalent dans `games/`, ce qui rend la contamination impossible plutôt que de tenter de l'interdire.

**Ce risque n'est attribué à aucun projet particulier** : c'est un fait de configuration (`read: dépôt entier`), pas la conséquence d'une campagne passée.

---

# 7. Rapport final

```yaml
preflight:
  sources_lues:
    - docs/forge/STUDIO_MASTER_SCHEMA.html (commit 5ec42be, 113265 o, propre en index)
    - scripts/forge/dispatch.py (ORDER, PROFILES, DETERMINISTIC, DEDICATED_*)
    - scripts/forge/{runtime,verdict,driver,escalate,pool,run_real,contract}.py
    - scripts/forge/{static_oracles,standard_oracles,mutation_proof}.py
    - scripts/forge/contracts/*.yaml (46) + roles.yaml
    - scripts/forge/standard/{capabilities,repo_map}.yaml
    - knowledge_base/{search.mjs,role_sim.mjs,catalog.json}
    - lab/forge_runs/breakout/*, games/breakout/*
    - .claude/settings.json
  etat_document: >-
    Globalement honnete. Porte ses propres marqueurs cible/HYPOTHESE et corrige
    ses erreurs anterieures par mises a jour datees. Ecarts principalement
    CHRONOLOGIQUES (monde poste-07-28) et non de fausse affirmation.

audit_verite:
  composants: 24 audites — voir sections 1 a 3
  ecarts:
    E1_incoherence_interne_prisme_vues_B_C: moyenne
    E2_s8_habillage_sans_marqueur_cible: moyenne
    E3_4_mecanismes_reels_invisibles_au_document: haute
    E4_contrats_lens_non_dispatchables: moyenne

surfaces:
  prisme: PASSIVE           # 3 contrats de lentille sur 5 nommes, aucun dispatchable ; CEO et Joueur inexistants
  core_wiremap: IMPLEMENTED # 10+ consommateurs sur 4 modules, valide, teste, integre aux oracles
  reconciliation:
    sens_exigences_4_sources: DOCUMENTED_ONLY
    sens_standard_repo_map:   IMPLEMENTED
    boucle_corrective:        NOT_FOUND
  etage_2_build:
    fouille_bibliotheque: IMPLEMENTED
    retour_web:           IMPLEMENTED
    pool_builders:        IMPLEMENTED
    s8_habillage:         NOT_FOUND
    chaine_complete_sur_standard_godot: BLOCKED   # profil ne parcourt ni fouille ni web ni pool
  breakout: HORS_PERIMETRE  # experience externe, hors campagne Forge (ratifie Pierre 2026-07-30)
                            # ni preuve de contamination, ni cible E7
  cible_E7: BLOCKED         # aucune cible vierge nommee — E10 prealable, cout nul

files_changed:
  - docs/forge/MASTER_SCHEMA_TRUTH_AUDIT_2026-07-30.md   # CREE puis MIS A JOUR (ce document)
  - docs/forge/INFERENCE_ORCHESTRATOR_V2_PROPOSAL.md     # MIS A JOUR (doctrine routage V2, protocole E4/E7)
  - memory/forge_cognitive_diversity_routing.md          # CREE (doctrine 5 familles + critere Prisme)
  - memory/validator_without_producer.md                 # CREE (invariant d'architecture)
  - memory/MEMORY.md                                     # 2 lignes d'index ajoutees
  # AUCUNE modification de STUDIO_MASTER_SCHEMA.html — 8 corrections proposees en §5, non appliquees
  # AUCUNE modification de code, contrat, runtime ou configuration
  # AUCUN commit

preuves:
  - dispatch.py:53 ORDER (13 etapes, ni s7 ni s8)
  - dispatch.py:123 PROFILES (standard_godot = s9-godot,s10a,s10s,s11,s12)
  - driver.py:62 from forge.pool import DEFAULT_POOL_SIZE, pool_decision
  - driver.py:1913 redteam_ran = bool(d.get("qwen_ok"))
  - runtime.py:92 provider claude -> RUNNER_CLAUDE (jamais qwen_ok)
  - verdict.py:300 le red-team n'entre JAMAIS dans software_verdict
  - standard_oracles.py:332-415 validation source EXPECTED/ADDITIONS + source_role
  - standard/repo_map.yaml:4,108 "la reconciliation applique cette table"
  - escalate.py:19 LADDER = (haiku, sonnet, opus) — builders uniquement
  - knowledge_base/{search.mjs, role_sim.mjs} presents
  - games/breakout/ 15 fichiers + 3 captures e2e ; charter run_id breakout-20260711
  - .claude/settings.json allow Write(.claude/**) vs reference_protected.yaml

risques:
  - R1: contamination GENERALE par lecture du depot (read: depot entier, aucun mecanisme
        d'exclusion) => si la cible E7 a un equivalent dans games/, on mesure une recopie.
        NON attribue a un projet particulier. Contre-mesure: cible vierge (E10).
  - R2: homonymie "reconciliation" => un lecteur croit la cible implementee
  - R3: vues B/C du schema lues sans le Detail A => panel Prisme cru construit
  - R4: escalade annoncee comme filet alors qu'elle n'a aucune prise sur standard_godot
  - R5: garde de reference detecte sans empecher (Write(.claude/**) en allow)
  - R6: GAME_REFERENCE/ produit sans consommateur mecanique etabli (UNKNOWN, pas NOT_FOUND)

status_by_surface:
  IMPLEMENTED:     [core_wiremap, pool_builders, fouille_bibliotheque, retour_web_contrat,
                    oracles_deterministes, verdict_signe, garde_reference, reconciliation_standard]
  TESTED:          [pool_builders, wiremap_nav]
  DOCUMENTED_ONLY: [vision_ABC, reconciliation_4_sources, table_bilans_multi_llm]
  PASSIVE:         [contrats_prisme_lens, escalade_sur_standard_godot]
  BLOCKED:         [etage_2_complet_sur_standard_godot, cible_E7_non_nommee,
                    R1_raisonnement_par_role_gel_a_lever]
  NOT_FOUND:       [s8_habillage, panel_prisme_5_roles, boucle_corrective_reconciliation]
  UNKNOWN:         [generateur_wiremap_deterministe, consommateur_GAME_REFERENCE]

claim_verdict: NO_CLAIM_ALLOWED
```
