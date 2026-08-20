# PLAN_CONVERGENCE_FORGE_V1

**Statut : PROPOSED — aucune mutation runtime, aucune activation, aucun commit.**
Date : 2026-07-30 (soir) · Orchestrateur : session Fable (poste de commande) · Méthode : 6 audits délégués en parallèle (2 Opus : Prisme, Réconciliation · 4 Sonnet : Pipeline, WireMap, Curriculum, Doc Master), **chaque affirmation porteuse re-vérifiée contre le dépôt par l'orchestrateur** avant intégration — aucune n'a été prise sur parole.
Base : tronc `24afe7d` · garde `CLEAN | 357 | 9aea255c…` · s'appuie sur `MASTER_SCHEMA_TRUTH_AUDIT_2026-07-30.md` et `INFERENCE_ORCHESTRATOR_V2_PROPOSAL.md`.
`claim_verdict: NO_CLAIM_ALLOWED`

Convention : **[M]** mesuré (fichier:ligne) · **[H]** hypothèse · **[E]** expérience. Espace de noms des actions : **CV-n** (convergence) — remplace les numérotations locales des 6 rapports, qui se chevauchaient.

---

# 1. État actuel

## 1.1 Statuts par surface (consolidé, post-vérification)

| surface | statut | preuve clé |
|---|---|---|
| Core WireMap (modèle, validation, 10+ consommateurs, nav testée) | **IMPLEMENTED + TESTED** | audit 30/07 §2.2 |
| Réconciliation STANDARD (`repo_map`/`capabilities` → `check_placement`) | **IMPLEMENTED** | `standard_oracles.py:598` |
| Pool best-of-N | **IMPLEMENTED + TESTED, jamais exercé en réel** | `driver.py:62` · condition `oracle_fail` jamais vraie sur les runs récents (0 FAIL observé) |
| Fouille (`knowledge_base/search.mjs` + catalog) | **PASSIVE sur le profil courant** | clause « SEARCH d'abord » présente `s9-build-standard.yaml:47`, **absente du jumeau Godot** (0 occurrence) ; `check_search_consulted` advisory (`driver.py:970`), ne gate jamais |
| Worldscan s2 | **IMPLEMENTED, non parcouru** | dans `full` uniquement — 1 run sur 24 (`shmup_slice`) |
| Panel Prisme ×5 | **PASSIVE — code câblé, régime de contrat absent** *(corrige l'audit du matin : NOT_FOUND était faux)* | `panel.py:30,60,71,79` · `run_real.py:34,803` · mono-modèle par construction · lentilles sans `tools` → méta-rapports (`shmup_slice/prisme/prisme_lens_ceo.md:1`) |
| Lentilles contractualisées (3) | **PASSIVE** | contrats complets 17 champs, dans aucun profil |
| Réconciliation d'exigences 4 sources | **DOCUMENTED_ONLY — producteur absent, validateur présent** | `check_line_states` (l.319-460) valide `source`/`source_role`/`reference` ; production = à la main par l'agent wiremap |
| Gel des règles (`wiremap_frozen.json`) | **BLOCKED — silencieusement inapplicable au schéma v2** | `frozen_features_from_wiremap` lit `features[]` (v1, `static_oracles.py:728-730`) ; Snake est v2 (`lines[]`, 44 lignes) ; **aucun gel posé pour Snake** |
| Étape wiremap dans le régime STANDARD | **NOT_FOUND** | `standard`/`standard_godot` n'ont **aucune** étape wiremap ; Snake = contrat ad hoc `wm1` hors profil |
| s6 red-team plan (Qwen) | **PASSIVE** | hors `standard_godot` → ne tourne jamais sur le curriculum |
| s8 habillage | **NOT_FOUND** | aucun contrat, aucun profil |
| 26 contrats orphelins | **PASSIVE (masse documentaire)** | jamais chargés programmatiquement (grep exhaustif) |
| DERIVED (4e source) | **BLOCKED — matière première absente** | **[M]** 0/32 entrées du catalogue portent `provides` ; 3/6 lignes DERIVED de Snake ont `reused_from.type=="NEW"` (synonyme d'EXPECTED en pratique) |
| Cible E7 | **BLOCKED — non nommée** | grille curriculum prête (MATCH-3 22/25, PAC-MAZE 20/25), choix HumanGate |

## 1.2 Distribution réelle des profils — le fait qui cadre tout

**[M]** Sur 24 runs avec `state.json` : **16× `standard_godot` · 3× `standard` · 3× `patch` · 1× `full` · 1× `artbible`.**

> **Le profil que le master schema décrit (chaîne complète s0→s12, fouille→web→pool) a tourné une fois. Le profil qui tourne réellement (16 fois) ne contient ni Prisme, ni worldscan, ni wiremap, ni red-team plan.** Toute convergence qui n'insère pas ses mécanismes dans `standard_godot` converge vers un chemin mort.

## 1.3 Mesures nouvelles produites par cet audit

- **Première mesure de décorrélation du Prisme** : Jaccard tags `archidepot~gameplayprog = 0,909` sur Snake (3 lentilles Opus, quasi indistinguables) — mais **ininterprétable sans plancher Intra** : aucune lentille n'a jamais été rejouée. [M/E]
- **Écart producteur↔validateur quantifié** : 2 wiremaps sur 19 portent le modèle 4 sources ; Snake 44/44 `source`, 34/44 `source_role` (écrits à la main) ; Pong 5/15. [M]
- **Le matériau de production mécanique existe** : les 38 tags charter cités par Snake résolvent tous littéralement dans `charter.yaml` ; `merge_prisme.mjs:85 resolveSourceRole` produit déjà `source_role` mécaniquement — **sans aucun appelant code**. [M]

---

# 2. Problèmes classés

**Classe A — intégrité de preuve (le plus grave)**
- **A1 · Gel v1/v2** : le mécanisme qui fige les règles produirait un gel **vide, silencieusement** sur le schéma le plus récent ; aucun oracle ne réclame le gel de façon bloquante. Double défaut : lecteur inadapté + absence de garde d'absence (même famille que la leçon Snake « vérifier en ABSENCE »).
- **A2 · Pas de propriétaire d'étape wiremap en STANDARD** : chaque nouveau jeu redemande un contrat ad hoc (`wm1-…-snake`), dispatché hors profil, sans gel, sans `state.json` d'étape.

**Classe B — producteurs manquants (invariant ratifié : créer le producteur, jamais durcir le validateur)**
- **B1 · Réconciliation d'exigences** : validateur complet, producteur absent. Proposition d'outillage déterministe en 3 volets (CORE / EXPECTED / ADDITIONS), DERIVED explicitement **non produit** (rapporté `unproducible`) tant que les briques du catalogue n'ont pas de `provides`.
- **B2 · `source_role` perdu au dernier maillon** : produit par `merge_prisme`, exigé par l'idée « diversité des rôles », absent de `decisions[]` de la Gameplay Review — producteur d'abord (le contrat gr1 l'exige), validateur ensuite.
- **B3 · Budget d'empilement sans lien aux lignes** : `check_budget` compte des **briques** ; « ADDITIONS payées par le budget » n'a aucun correspondant code — 11 lignes ADDITIONS de Snake ne débitent rien.

**Classe C — décorrélation (doctrine routage V2)**
- **C1 · Panel Prisme** : trois corrections nécessaires avant toute mesure — (i) lentilles sous contrat via `prepare_dispatch`, (ii) modèle par lentille via `route_step` (l'aiguilleur existe, `panel.py` le court-circuite), (iii) droit d'écriture des artefacts (sinon on mesure des méta-rapports). Plus : activation implicite par `--charter` à rendre explicite.
- **C2 · Lentilles manquantes** : joueur/fun (sources délibérément appauvries, candidate Qwen local) et produit/marché (**après arbitrage du recouvrement avec s2-worldscan**). CEO : à **ne pas** créer (recouvre marché, `ceo~game_designer=0,443` max du panel shmup).
- **C3 · s6 red-team plan** : le seul rôle Qwen actif de la chaîne ne tourne jamais (hors profil).

**Classe D — instruction et branchement**
- **D1 · Builder Godot jamais instruit de chercher** : clause SEARCH présente côté JS, absente côté Godot — divergence silencieuse entre jumeaux.
- **D2 · 26 contrats orphelins** : risque de dérive doc↔code (croire une étape active en lisant `contracts/`).
- **D3 · Pool jamais exercé en conditions réelles** : premier FAIL futur = premier test non-unitaire du chemin.

**Classe E — campagne suivante**
- **E1 · Cible E7 non nommée** (E10) ; grille prête ; MATCH-3 et PAC-MAZE en tête ; renumérotation du curriculum (insertion Pong/Snake) non faite.

**Classe F — documentation canonique**
- **F1 · Master schema** : 8 corrections P1→P8 spécifiées avec ancres + 1 contradiction interne trouvée (l.1019 : « réconciliation n'existe que dans des commentaires » — faux, `check_placement` l'applique) + éléments post-07-28 absents. Voir `MASTER_SCHEMA_UPDATE_PROPOSAL.md`.

**Classe G — Knowledge Base (audit délégué 2026-07-30 soir, affirmations porteuses re-vérifiées)**
*Intégrée au plan à la demande de Pierre — la KB fait partie de la convergence V2, pas d'un chantier séparé. Même philosophie : terminer les branchements, aucune couche nouvelle.*
- **G1 · Store de leçons fantôme — le finding le plus grave du lot.** **[M]** `lab/reports/lessons.jsonl` (store officiel typé, `DEFAULT_LESSONS_PATH` `learning_memory.py:64`) **n'existe pas sur disque** : `record_lesson_event` n'est appelé que depuis le CLI (`learning_memory.py:655`, sous `__main__`) — jamais automatiquement. La chaîne de consommation est câblée (`fold_lessons` → `premortem_lessons` → `driver.py:702-717`) mais tombe toujours sur le fallback legacy : **3 leçons de méthode figées** de `forge_error_journal.jsonl`. La « mémoire d'apprentissage » du socle V2 n'a jamais été alimentée en production. Consommateur sans producteur — l'invariant s'applique.
- **G2 · `learning_curve.jsonl` : chaîne d'écriture complète, zéro lecteur de consommation.** **[M]** Écrit par driver → `learning_hook.py` → `learning_metrics.mjs` (9 lignes réelles, sujet snake) ; lu uniquement par l'outil de backfill et les tests. Producteur sans consommateur.
- **G3 · Résolveur de connaissances jamais déclenché.** **[M]** `apply_decisions.mjs` importe `pending_review.mjs` (l.57) et n'a **aucun appelant** hors ses tests — le Knowledge Resolver V1 (41 tests verts) est construit de bout en bout et n'a jamais tourné en production.
- **G4 · La fouille n'a jamais rien trouvé.** **[M]** `search_log.jsonl` : 5 recherches réelles, toutes du 2026-07-20, **5/5 `matchCount:0`** — figé depuis. Le catalogue (32 entrées, 0 `provides`) est difficilement interrogeable par intention. Forcer les builders à chercher (CV-4) sans comprendre pourquoi 5/5 échouent brancherait un outil qui ne rend rien.
- **G5 · Réutilisation réelle du catalogue : marginale mais non nulle.** **[M]** kb_tactics : 7 entrées consommées (seul jeu assemblé depuis la KB). Snake : **3/44 lignes** `reused_from` → `knowledge_base/systems/` (grid_nav.gd, run_tests.gd, godot_trial.mjs) contre **25/44** → Pong directement. ~78 % du catalogue jamais réutilisé ; 25 entrées `tier: candidate` jamais promues. *(Corrige le rapport délégué, qui affirmait « jamais vers le catalogue ».)*
- **G6 · `GAME_REFERENCE/` : statut UNKNOWN tranché → PASSIVE.** Grep exhaustif indépendant : aucun consommateur code. Lu uniquement en `mandatory_read` LLM par des contrats Snake-spécifiques. Rejoint le chemin de CV-6 V2 (le producteur de réconciliation le consommera — c'est SON débouché naturel).

---

# 3. Dépendances

```
DÉCISIONS PIERRE (bloquantes, coût nul)
├── D-a  valider MASTER_SCHEMA_UPDATE_PROPOSAL ──────────► CV-1 (appliquer le HTML)
├── D-b  clôturer la calibration (étendre à 5 ou arrêter à 3)
│         └─► conditionne D-c
├── D-c  LEVÉE DE GEL scripts/forge/** (bornée, par lots) ─► TOUT ce qui touche code/contrats :
│         CV-3 gel v1/v2 · CV-4 clause SEARCH godot · CV-5 corrections panel
│         CV-6 producteur réconciliation + insertion profils · CV-7 raisonnement par rôle (R1)
│         CV-8 capture cache (E3) · CV-9 deny rules… (déjà en attente)
├── D-d  nommer la cible E7 (grille fournie) ─────────────► CV-10 charter → campagne E7
├── D-e  s1-prisme entre-t-il dans standard_godot ? (coût par jeu vs valeur)
├── D-f  lentille marché vs s2-worldscan : distincts ou doublon ?
└── D-g  déclasser gamedesign/gameplayprog Opus→Sonnet (doctrine dit oui, mesure dit rien)

SANS GEL NI DÉCISION (immédiatement faisables)
├── CV-0  rejouer les 18 verdicts (E2 — s11 seul déterminant ?) : analyse lecture seule
└── CV-2  mise à jour handoff 00_CURRENT_CONTEXT.md

CHAÎNES
CV-5 (panel corrigé) ──► CV-11 mesures Intra/Inter (E1-E3 Prisme) ──► décisions garder/retirer lentilles
CV-6 (producteur) ────► CV-12 falsification par rejeu sur Snake (44 lignes ratifiées = fixture gratuite)
D-d + CV-10 ─────────► CV-13 campagne E7 (Opus vs Qwen Coder, N=2 qualité, N≥5 coût)
```

**Le nœud unique : D-c.** Quasi tout le travail de convergence touche `scripts/forge/**`, qui est dans le périmètre gelé. La levée doit être **bornée et par lots** (un lot = un chantier vérifiable), jamais une réouverture générale — et la calibration doit être close d'abord (D-b), sinon on invalide la baseline qu'on vient de payer.

---

# 4. Ordre optimal d'exécution

**Phase 0 — sans rien toucher (dès maintenant)**
1. **CV-0** — rejeu des 18 verdicts (lecture seule) : quantifie la valeur décisionnelle réelle de s11 avant tout investissement red-team.
2. **D-a → CV-1** — valider puis appliquer la mise à jour du master schema (docs/, hors périmètre gelé ; propose-only respecté).
3. **D-b** — clore la calibration. **D-d** — nommer la cible E7.

**Phase 1 — premier lot de dégel (petit, à haute valeur d'intégrité)**
4. **CV-3** — réparer le gel v1/v2 **et** ajouter la garde d'absence (un run STANDARD sans `wiremap_frozen.json` doit se voir) — c'est une correction de *lecteur* + une garde, pas un durcissement de validateur sans producteur.
5. **CV-4** — porter la clause « SEARCH d'abord » dans `s9-build-godot-standard.yaml` (alignement de jumeaux, pas une nouveauté).
6. **CV-8** — capturer `cache_creation`/`cache_read` (2 champs à ne plus jeter).
7. **CV-9** — poser les deny rules manquantes (`reference_protected.yaml`, `Write(.claude/**)`).

**Phase 2 — producteurs (l'invariant au travail)**
8. **CV-6** — `reconcile_requirements` V1 (CORE : transformation 1:1 depuis `core_requirements.yaml`) puis V2 (EXPECTED : jointure tags×lentilles×worldscan) puis V3 (ADDITIONS : lien au budget). **Définition de « fini » : inséré dans les profils `standard`/`standard_godot`** — sinon c'est un `merge_prisme` de plus. DERIVED : rapporté `unproducible`, chantier `provides` sur le catalogue à décider séparément.
9. **CV-12** — falsification par rejeu contre les 44 lignes ratifiées de Snake, avec sonde négative (tag cité par personne → `gaps[]`) et preuve de variance (Snake **et** Pong, ≥2 valeurs distinctes).
10. **B2** — `source_role[]` dans les décisions de la Gameplay Review (producteur d'abord, `check_gameplay_review` ensuite).

**Phase 3 — décorrélation**
11. **CV-5** — les 3 corrections du panel (contrats de lentille via la porte, modèle par lentille via `route_step`, droit d'écriture) + drapeau explicite `--panel-prisme`.
12. **CV-11** — mesures dans l'ordre strict : **Intra d'abord** (plancher de bruit, k=3, publié comme constante datée du studio), puis Inter du trio existant (décision pré-engagée : fusion si `Inter ≤ Intra+0,10`), puis lentille joueur Qwen **avec sonde-contrôle Sonnet** (attribuer l'effet au modèle, pas au prompt).
13. **E4 routage** — red-team Qwen vs Opus (protocole déjà écrit, 4 exécutions, adjudication à l'aveugle).

**Phase 4 — campagne**
14. **CV-13** — E7 sur la cible vierge : d'abord N=2 (détection d'échec structurel précoce, leçon « le jeu doit démarrer »), puis extension à N≥5 seulement si on veut conclure sur le coût.

## Lot KB (Classe G) — inséré dans les phases existantes, pas une phase de plus

| CV | branchement | producteur → consommateur | effort | phase d'insertion |
|---|---|---|---|---|
| **CV-14** | **Alimenter le store de leçons** : un appel driver post-verdict écrit `record_lesson_event` dans `lessons.jsonl` (le point d'accroche existe — même patron que `learning_hook`) | fin de run → `premortem_lessons` (consommateur déjà câblé, affamé) | **petit** (1 appel) | **Phase 1** (dégel lot 1 — priorité : c'est le G le plus grave) |
| **CV-15** | Trancher `learning_curve.jsonl` : soit un lecteur de campagne (rapport de métriques par curriculum), soit le documenter **journal-only** explicitement | `learning_metrics` → lecteur à créer OU décision documentée | petit + **décision D-i** | Phase 1 (décision) / Phase 2 (lecteur éventuel) |
| **CV-16** | Donner un appelant à `apply_decisions.mjs` — candidat naturel : le flux `/gate` (les décisions ratifiées déclenchent l'application aux propositions en attente) | `pending_review` → `apply_decisions` → files de propositions | petit | Phase 2 |
| **CV-17** | `GAME_REFERENCE/` consommé mécaniquement — **couvert par CV-6 V2** (le volet EXPECTED de la réconciliation lit `observation_manifest.json`). Pas de chantier séparé : c'est la même jointure. | worldscan → réconciliation → wiremap | inclus CV-6 | Phase 2 |
| **CV-18** | Chantier catalogue `provides`/`requires` — la clé de jointure DERIVED (0/32 aujourd'hui). Change `catalog.json` + `kb-validate`. **Décision Pierre** : c'est le seul CV du lot qui enrichit un schéma. | catalogue → volet DERIVED de CV-6 | **moyen** + décision D-j | Phase 2-3, après E-search (CV-19) |
| **CV-19** | **E-search (expérience, coût nul)** : rejouer les 5 requêtes à zéro résultat, diagnostiquer (vocabulaire ? champs indexés ? catalogue trop maigre ?) — **préalable à CV-4** (imposer la clause SEARCH au builder Godot sans cela brancherait un outil qui ne rend rien) | — | **0** | **Phase 0** (lecture seule) |

**Ordre interne du lot :** CV-19 (diagnostic, phase 0) → CV-14 (leçons, lot de dégel 1, avec CV-3/CV-4/CV-8) → CV-15/CV-16 (phase 2) → CV-18 (après diagnostic et décision).
**Deux décisions ajoutées au fog :** **D-i** (learning_curve : lecteur ou journal-only) · **D-j** (enrichir le catalogue avec `provides`/`requires` — préalable DERIVED).

## Résultat de mesure — CV-0 exécuté (2026-07-30 soir)

**[M] 27 verdicts historiques rejoués** (l'inventaire réel en contient 27, pas 18) : `software OK` 16 · triage mutation 14 · red-team a bloqué **1** · **s11 seul déterminant de `decision` : 1/27** (`survival_arena`). Sous la condition R2, s11 n'aurait tourné que sur **4/27 runs** (~85 % d'économie, zéro perte décisionnelle) — et le cas décisif unique est **précisément le profil que la condition préserve** : survival_arena, où le red-team avait raison (« test kills tautologique », « game-over prouvé via hook debug ») sur le jeu confirmé injouable ensuite. Réserve honnête : les runs sautés perdent 4-6 findings advisory chacun (information HumanGate, pas décision) — c'est le troc que E4 doit évaluer. Détail historique : le verdict survival_arena porte `HUMANGATE_READY` **malgré** le drapeau de blocage — la démotion WITH_OBJECTION n'existait pas encore. **R2 est désormais fondée sur données, plus sur hypothèse.**

**Règle transversale d'ordonnancement :** aucune étape de la phase N+1 ne commence tant que le lot de dégel de la phase N n'est pas re-gelé et sa baseline ré-enregistrée. La garde de référence sert exactement à ça.

---

# 5. Risques

| # | risque | gravité | mitigation |
|---|---|---|---|
| R1 | **Connecteur dormant récidivant** — chaque producteur proposé (réconciliation, source_role, panel corrigé) peut finir comme `merge_prisme` : correct, testé, jamais appelé | **haute** | l'insertion dans un profil fait partie de la définition de « fini » de chaque CV — pas une phase 2 |
| R2 | **Mesurer des méta-rapports** — lancer les mesures Prisme avant CV-5(iii) produit un Intra faussement bas et un verdict faussement favorable | **haute** | E0 bloquant : `check_prisme` exit 0 sur des artefacts réellement écrits, sinon annulation |
| R3 | **Dégel qui déborde** — « pendant qu'on y est » sur un tronc ouvert | **haute** | lots bornés, re-gel + baseline entre chaque, diff-review par lot |
| R4 | **Fallback silencieux** (Qwen→claude-blind, Gemini→Sonnet) transforme une mesure de diversité en mesure de rien | moyenne | compteur d'occurrences au reçu signé ; toute mesure avec repli est **invalide**, pas dégradée |
| R5 | **Métrique saturée** — Jaccard sur 22 tags (0,909) est peut-être un plafond d'instrument ; classer des lentilles avec = faute grid-navigator | moyenne | grille M3 (~506 cellules) comme instrument de décision ; preuve de variance avant tout usage |
| R6 | **DERIVED produit de force** — sans `provides` au catalogue, tout DERIVED généré serait une redite d'EXPECTED | moyenne | volet `unproducible` = livrable honnête ; chantier catalogue séparé, décision Pierre |
| R7 | **La contamination E7 reste sans mécanisme** — `read: dépôt entier`, exclusion inapplicable | moyenne | cible sans équivalent dans `games/` (seule contre-mesure réelle) ; le charter le déclare mais ne l'applique pas |
| R8 | **Le plan lui-même comme couche** — 14 CV peuvent devenir une usine à gaz | moyenne | chaque phase est close par une preuve d'exécution ; aucun CV sans consommateur nommé ; abandon explicite plutôt que report silencieux |

---

## Corrections apportées aux documents antérieurs par ce plan

1. `MASTER_SCHEMA_TRUTH_AUDIT` §2.1 : panel ×5 **NOT_FOUND → PASSIVE** (le code existe, câblé ; c'est le régime de contrat qui manque). Corrigé dans le fichier, daté.
2. Nuance sur la « chaîne DESIGN de Snake » : la wiremap Snake vient d'un dispatch **hors profil** (`wm1`), pas d'un s5 du driver — cohérent avec l'absence de `state.json` d'étape et de gel.

## Fog → HumanGate (récapitulatif des décisions D-a … D-j)

Valider la proposition de mise à jour du schéma (D-a) · clore la calibration (D-b) · borne et calendrier des lots de dégel (D-c) · cible E7 (D-d) · Prisme dans `standard_godot` (D-e) · lentille marché vs worldscan (D-f) · déclassements Opus→Sonnet (D-g) · gate dur ou advisory pour search/reuse (D-h — aujourd'hui advisory par design, l'agent KB pose la question) · `learning_curve` : lecteur ou journal-only (D-i) · enrichir le catalogue `provides`/`requires` (D-j).

`software_verdict: n/a — document de pilotage`
`evidence_verdict: MECHANICAL_VALIDATION_ONLY`
`claim_verdict: NO_CLAIM_ALLOWED`
