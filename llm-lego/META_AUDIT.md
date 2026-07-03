# Méta-audit — Cohérence et fraîcheur de nos audits

> Passe **audit uniquement**. Aucun fichier d'audit existant modifié, fusionné ou
> supprimé. Ce fichier est le seul écrit. Chronologie établie de première main via
> `mtime` (les 6 audits sont **non suivis par git** — aucun `git log`, donc l'ordre
> repose sur l'horodatage filesystem + les références croisées internes). Date : 2026-07-03.

---

## 0. TL;DR

- **6 audits trouvés** dans `llm-lego/`, tous à la racine, aucun ailleurs. Le
  `UX_STUDIO_MATRICES_AUDIT.md` évoqué dans le prompt **n'existe pas encore** — non
  produit à ce stade, je ne l'invente pas.
- **La pratique d'audit fonctionne globalement bien** : chaque audit lit les
  précédents, les cite nommément, et se corrige explicitement (`COMPLETENESS` acte
  que `LIBRARY_AUDIT` est périmé sur la gouvernance ; `LIBRARY_UX` s'auto-corrige en
  2ᵉ passe sur « n=1 »). Ce n'est pas de la dette accumulée en silence.
- **Mais 3 tensions réelles à trancher** avant d'en produire d'autres : (1) une
  reconciliation **mal formulée** autour du CLAIM_MATRIX 4-lanes qui laisse croire
  qu'un audit s'est trompé alors que les deux disent vrai à des couches différentes ;
  (2) **trois plans de passes concurrents** (LIBRARY_AUDIT §4, LIBRARY_UX, ALL_CHAINS
  §6) sans indication de celui qui fait foi ; (3) une **recommandation fondatrice
  ignorée puis re-violée** (« référencer, pas forker »).
- **Verdict** : audits sains, mais on approche le seuil où un **index « quel audit
  fait foi sur quel sujet »** devient nécessaire — pas une fusion.

---

## Inventaire des fichiers d'audit trouvés

| Fichier | Ordre chrono (mtime) | Date contenu | Sujet principal |
|---|---|---|---|
| `LIBRARY_AUDIT.md` | **1** — 07-01 18:20 | 2026-07-01 | Fondations d'une bibliothèque de briques : réutiliser le pattern Wire Map, 7 types, commencer par Agent |
| `MICRO_BRICKS_AUDIT.md` | **2** — 07-02 05:09 | 2026-07-02 | Faut-il extraire mémoire/skill/…/modèle en micro-briques (`kind:"fragment"`) ? |
| `COMPLETENESS_AUDIT.md` | **3** — 07-02 12:21 | 2026-07-02 | Le builder peut-il représenter TOUT TCS ? (Council parallèle, Rocky autorité, 4-lanes, ledger) |
| `AUTOPILOT_MINING_REPORT.md` | **4** — 07-02 13:08 | 2026-07-02 | Fouille d'`autopilot.py` (9029 l) → top-5 pépites (pipeline idée→IMP, prompts, oracles, profil LM) |
| `LIBRARY_UX_IMPORT_AUDIT.md` | **5** — 07-03 05:05 | (implicite 07-03) | Test live 18 briques : UX bibliothèque + solidité import ; découverte `lab/chains/` |
| `ALL_CHAINS_AUDIT.md` | **6** — 07-03 05:25 | (implicite 07-03) | Inventaire exhaustif des **3 familles** de chaînes TCS + 20 matrices |

> Note de méthode : la chronologie mtime **coïncide** avec les références croisées
> internes (chaque audit ne cite que des audits d'index inférieur), ce qui la valide.
> Seule subtilité : `AUTOPILOT_MINING` (#4) a un mtime *postérieur* à `COMPLETENESS`
> (#3) bien que `COMPLETENESS` ne le cite pas — les deux sont du 07-02, produits dans
> la même journée, sans dépendance croisée. Pas de contradiction d'ordre.

---

## Volet 1 — Fraîcheur par audit

### `LIBRARY_AUDIT.md` (#1)

- **Traité depuis** :
  - Recommandation « réutiliser le PATTERN Wire Map dans un espace de noms séparé
    `library/` + schéma enveloppe unique discriminé par `kind` » (§3) → **fait** :
    `COMPLETENESS` et `LIBRARY_UX` observent un store `library/{id}.json` réel avec
    `kind: agent|prompt|chain|oracle|…`, 18 briques.
  - « Commencer par le type Agent, seed depuis `lab/agent_registry/*.json` » (§6) →
    **fait** : les 5 seeds `agent-*-001.json` existent (`LIBRARY_UX` inventaire 1-5).
  - « Champs gouvernance (autonomie/permissions/surfaces) absents du modèle nœud »
    (§1.3, §2) → **traité** : `COMPLETENESS §3.1` acte que la fiche Agent les porte
    et édite désormais (`builder.html:1514-1526`).
- **Toujours d'actualité** :
  - Risque #2 « régression du double-run search/chat si migration EXAMPLES » — non
    ré-audité depuis, statut inconnu.
  - Tensions de typologie Système⟷Roadmap⟷Council non tranchées — confirmées ouvertes
    par `COMPLETENESS` (roadmap/impRef) et `LIBRARY_UX` (0 brique council/roadmap/goal).
- **Rendu faux depuis** :
  - §1.3/§2 « gouvernance absente du modèle nœud » — **rendu faux** par une passe de
    construction ultérieure (voir ci-dessus). `COMPLETENESS` le signale correctement :
    « Ce n'est plus vrai ».
  - §1.6 « 217 IMP » dans `IMPROVEMENT_LEDGER.yaml` — **périmé** : `LIBRARY_UX` et
    `ALL_CHAINS` comptent **244 IMP**. Le ledger a grossi (dérive de fraîcheur mineure).

### `MICRO_BRICKS_AUDIT.md` (#2)

- **Traité depuis** : rien construit. Recommandation « fragments `modèle` d'abord via
  `<datalist>` » **non implémentée** — `COMPLETENESS §7` et `LIBRARY_UX` confirment
  **0 brique fragment**.
- **Toujours d'actualité** : intégralement. Constat central « les 6 champs LLM sont
  vides partout → 0 répétition mesurable, valeur prospective » reste vrai
  (re-vérifié par `COMPLETENESS §7` : « constat inchangé »).
- **Rendu faux depuis** : rien. Audit le plus stable — parce que la matière qu'il
  décrit (fiches vides) n'a pas bougé.

### `COMPLETENESS_AUDIT.md` (#3)

- **Traité depuis** : point 4 (« serveur ne lit jamais le ledger ») et point 3
  (« 4-lanes ») ont depuis reçu une **réponse de disponibilité** (pas une résolution)
  dans `LIBRARY_UX`/`ALL_CHAINS` : les sources existent pour les importer
  (`doc_hygiene_chain.py`, `ROADMAP_PROPOSALS.yaml`, ledger). **Mais aucun import
  n'a été fait** → les trous eux-mêmes restent ouverts.
- **Toujours d'actualité** :
  - Point 5 (Rocky, autorité Search > LLM inexprimable) — **structurel moteur**, rien
    ne l'a touché. Le trou le plus profond, intact.
  - Point 1 (Council parallèle + timeout 120s non exécutable) — moteur séquentiel
    inchangé.
- **Rendu faux depuis** : **partiellement, et c'est la tension-clé** (voir Volet 2).
  Son point 3 dit « les 4 lanes comme label first-class **n'existent pas** [dans le
  builder] ». `LIBRARY_UX`/`ALL_CHAINS` écrivent que le CLAIM_MATRIX 4-lanes « **est
  ici**, en code déterministe » (`doc_hygiene_chain.py`). Formulé ainsi, ça *paraît*
  rendre `COMPLETENESS` faux — mais les deux parlent de **couches différentes** (le
  builder vs la source TCS importable). Voir Volet 2, contradiction #1.

### `AUTOPILOT_MINING_REPORT.md` (#4)

- **Traité depuis** : ses top-5 pépites ont été **partiellement importées** :
  `LIBRARY_UX` constate 4 prompts de rôle + 6 oracles garde-fou + agent charter
  réellement présents en lib, traçables `autopilot.py:ligne`. La pépite #1 (pipeline
  idée→IMP → chain) a été importée **mais dégradée** (chaîne fictive, F7).
- **Toujours d'actualité** : la recommandation « reconstruire le pipeline idée→IMP
  comme Chaîne first-class » reste ouverte (la version importée est partielle).
- **Rendu faux/dépassé depuis** : sa **prémisse de périmètre**. Il traite `autopilot.py`
  comme *le* gisement (« LA séquence », « à ne PAS réinventer — à importer »).
  `LIBRARY_UX` puis `ALL_CHAINS` montrent que `autopilot.py` n'était **qu'une** des
  **trois familles** de chaînes, et **pas la plus facile à importer** : le même
  pipeline idée→IMP existe **déjà semi-structuré en JSON** (`prompt_chain_map.json`,
  lu intégralement par `ALL_CHAINS §3`). Le rapport n'est pas *faux*, il est
  **sous-dimensionné** — voir Volet 2, contradiction #2.

### `LIBRARY_UX_IMPORT_AUDIT.md` (#5)

- **Traité depuis** : rien (il est récent). Ses 7 frictions (F1 recherche absente, F7
  chaîne fictive…) sont toutes **ouvertes**.
- **Toujours d'actualité** : intégralement.
- **Rendu faux depuis** : rien, sauf que `ALL_CHAINS` (#6, 20 min plus tard) **étend
  et confirme** sa découverte `lab/chains/` en trouvant **2 familles de plus** (ps1 +
  UxPilote doc). Sa liste `lab/chains/` (table Volet 2a) est donc **incomplète** mais
  pas fausse.

### `ALL_CHAINS_AUDIT.md` (#6)

- **Traité depuis** : rien (le plus récent).
- **Toujours d'actualité** : intégralement. C'est l'état de l'art courant sur les
  sources importables.
- **Rendu faux depuis** : rien encore.

---

## Volet 2 — Contradictions trouvées

### Contradiction #1 — CLAIM_MATRIX 4-lanes : « absent » vs « il est là » (réconciliable, mais mal formulé)

- `COMPLETENESS_AUDIT.md §3.2` : « Il n'existe **aucune** notion de lane
  SAFE_AUTO/AUDIT_REQUIRED/FORBIDDEN comme **étiquette de premier ordre** sur un nœud
  […] aucun enforcement runtime ».
- `LIBRARY_UX_IMPORT_AUDIT.md` (table 2a) et `ALL_CHAINS_AUDIT.md §4` : « `doc_hygiene_chain.py`
  […] **C'est exactement le CLAIM_MATRIX 4-lanes que `COMPLETENESS_AUDIT` disait
  manquant — et il est ici, en code déterministe.** »

**Verdict : pas une vraie contradiction, mais une formulation trompeuse.**
`COMPLETENESS` parle de ce que le **builder llm-lego** sait *représenter et enforcer*
dans son graphe/moteur. `LIBRARY_UX`/`ALL_CHAINS` parlent d'une **source TCS existante**
(`doc_hygiene_chain.py`) *disponible à l'import*. Importer cette source comme brique
`oracle` donnerait une **donnée** dans la bibliothèque — cela ne rendrait toujours pas
les 4 lanes *first-class sur un nœud* ni *appliquées par le moteur* (`executor.ts` ne
lit rien). Les deux affirmations sont **vraies simultanément**. Le risque : la phrase
« que COMPLETENESS disait manquant » se lit comme « COMPLETENESS s'est trompé », ce qui
est faux et pourrait faire clore à tort le trou #3 de `COMPLETENESS`. **À reformuler
quand on consolidera** : « la *matière* existe (import), le *trou builder* reste ».

### Contradiction #2 — Où est le gisement principal : `autopilot.py` ou `lab/chains/` ? (réordonnancement)

- `AUTOPILOT_MINING_REPORT.md §recommandation` : le pipeline idée→IMP d'`autopilot.py`
  est « valeur max », « système réel, testé en production », « à ne PAS réinventer — à
  importer ». Le rapport centre le gisement sur le monolithe.
- `LIBRARY_UX_IMPORT_AUDIT.md` (⚠ Correction 2e passe) : « ce n'est PAS n=1 : `lab/chains/`
  est une famille entière de chaînes réelles, déjà écrites et testées » ; « **importer
  ≠ fouiller** ». Le vrai remplissage manquant est `lab/chains/`, pas plus de fouille
  d'`autopilot.py`.
- `ALL_CHAINS_AUDIT.md §résumé` : « il n'y a pas *une* famille de chaînes, il y en a
  **trois** » et le pipeline idée→IMP existe **en double** (`autopilot.py:1411` **ET**
  `prompt_chain_map.json`), plus une chaîne **distincte** `run_chain.py` — « décider
  laquelle est canonique » avant d'importer (`§4`).

**Verdict : contradiction réelle de priorisation, déjà en cours de résolution.**
`AUTOPILOT_MINING` a sous-estimé la richesse ailleurs dans TCS — non par erreur
factuelle (ses citations `autopilot.py:ligne` sont bonnes) mais par **périmètre trop
étroit** (il n'a regardé que le monolithe qu'on lui a donné à fouiller). Les deux
audits suivants corrigent le tir. **Point non tranché qui subsiste** : `run_chain.py`
(Translator→Engineer→RedTeam→Formatter) vs le pipeline idée→IMP
(roadmap→redteam→fusion→extract) — « probablement deux générations », canonique **non
décidé** (`ALL_CHAINS §4` et §7). C'est la seule vraie question ouverte que la série
laisse en suspens.

### Contradiction #3 — « Référencer, pas forker » : recommandation posée puis violée par une passe de construction

- `LIBRARY_AUDIT.md §3 & §5 (risque 3)` : « **Ne pas dupliquer les registres TCS.**
  Pour Agent et Roadmap, **référencer** plutôt que forker. […] Double source de vérité
  → divergence. »
- `LIBRARY_UX_IMPORT_AUDIT.md F7` : dans la chaîne idée→IMP importée, « **Prompts
  copiés, pas référencés** : le texte de `llm-1` est **strictement identique** au
  prompt autonome `autopilot-prompt-roadmap-001`. […] Double source de vérité —
  **exactement le risque signalé par `LIBRARY_AUDIT.md`**. »

**Verdict : contradiction entre une recommandation d'audit et ce qui a été construit.**
Ce n'est pas un désaccord *entre audits* (ils sont d'accord) mais une **dérive
build-vs-audit** : le conseil fondateur a été **ignoré à la construction**, et le
2ᵉ audit qui le constate **n'a pas encore été suivi d'une correction**. Reste ouvert.

### Réordonnancements de priorité (contradictions douces)

Trois plans de passes coexistent, **sans indication de celui qui prime** :

| Source | Passe 1 proposée | Logique |
|---|---|---|
| `LIBRARY_AUDIT §4` | Store + type **Agent** (MVP), puis Prompt+Chain, puis Council, puis Système/Roadmap | **bottom-up** : construire l'atome d'abord |
| `LIBRARY_UX` (découpage) | **Réparer la chaîne** vedette, puis **importer `lab/chains/`**, puis navigation | **top-down** : réparer le fictif, importer le structuré |
| `ALL_CHAINS §6` | **Réparer/importer idée→IMP** depuis `prompt_chain_map.json`, puis les 5 `.ps1`, puis oracles | **import-first** : le moins cher d'abord |

Les deux plans récents (`LIBRARY_UX`, `ALL_CHAINS`) sont cohérents entre eux et
**supersèdent de fait** le plan Agent-first de `LIBRARY_AUDIT` (dont les Passes 3
Council et 4 Système/Roadmap **n'ont jamais eu lieu** — `LIBRARY_UX` confirme
roadmap=0, council=0, goal=0). Aucun document ne **dit** que le plan #1 est caduc :
un lecteur qui ouvre `LIBRARY_AUDIT §4` croira que c'est la feuille de route. **C'est
le principal angle mort de consommation.**

---

## Volet 3 — Doublons et oublis

### Sources refouillées (risque de double travail)

| Source TCS | Audits qui la touchent | Nature |
|---|---|---|
| `scripts/council.py` | LIBRARY_AUDIT §1.6 (existence) · COMPLETENESS §1 (params vérifiés) · LIBRARY_UX (kit) · ALL_CHAINS §4 | **Approfondissement progressif** (existence → params → import) — légitime, pas gaspillé |
| `prompt_chain_map.json` | LIBRARY_AUDIT §1.6 (« via agent, non relu ») · COMPLETENESS · LIBRARY_UX (central) · ALL_CHAINS §3 (**lu intégralement, 13 clés**) | **Progressif** : cité de loin puis enfin lu à fond. Bon. |
| `IMPROVEMENT_LEDGER.yaml` | LIBRARY_AUDIT (**217**) · COMPLETENESS (**217**) · LIBRARY_UX (**244**) · ALL_CHAINS (**244**) | **Doublon avec dérive de comptage** — voir ci-dessous |
| `lab/agent_registry/*.json` | LIBRARY_AUDIT §1.3 · MICRO_BRICKS §1.1 · COMPLETENESS §3 · LIBRARY_UX | Re-décrit 4× ; cohérent mais redondant |
| Pipeline idée→IMP | AUTOPILOT_MINING (impl.) · LIBRARY_UX F7 (brique) · ALL_CHAINS §4 (map) | Vu sous 3 angles — utile, mais **canonique non tranché** |

- **Dérive de comptage ledger** : 217 (07-01/02) → 244 (07-03). Réel (le ledger
  grossit). Aucun audit ne le signale comme changement — chacun cite « son » chiffre
  comme s'il était stable. Mineur, mais c'est le genre de chiffre qui finit recopié
  périmé dans une doc dérivée.
- **`autopilot.py` : ~5200 vs 9029 lignes** — `AUTOPILOT_MINING §note` relève que le
  fichier fait **9029 lignes**, alors que `_CHARTER_STACK_MAP` interne **et** `CLAUDE.md`
  disent encore « ~5200 lignes ». Périmé, cosmétique, mais non corrigé.

**Conclusion doublons** : la plupart des re-visites sont du **raffinement légitime**
(chaque passe lit plus profond que la précédente), pas du re-travail aveugle. Le seul
vrai risque de gaspillage serait de **re-fouiller `autopilot.py`** alors que
`prompt_chain_map.json` contient déjà l'extraction — et `LIBRARY_UX`/`ALL_CHAINS`
l'ont explicitement neutralisé (« importer ≠ fouiller »).

### Recommandations jamais traitées ni reprises

| Recommandation | Origine | Statut | Reprise ailleurs ? |
|---|---|---|---|
| « Référencer, pas forker » les registres | LIBRARY_AUDIT §3/§5 | **Violée** (F7 copie les prompts) | Constatée par LIBRARY_UX F7, **pas corrigée** |
| Garder les 3 EXAMPLES comme fixtures seed non supprimables (anti-régression double-run) | LIBRARY_AUDIT §5 risque 2 | **Non re-vérifié** | Jamais repris — angle mort |
| Fragments `modèle` d'abord via `<datalist>` | MICRO_BRICKS §3 | **Non fait** | Repris par LIBRARY_UX (2b) comme « le bon geste » — toujours ouvert |
| Passe 3 Council + Passe 4 Système/Roadmap | LIBRARY_AUDIT §4 | **Jamais exécutées** | Supersédées silencieusement par les plans récents |
| Trancher `run_chain.py` vs idée→IMP canonique | ALL_CHAINS §4/§7 | **Ouvert** | — (question la plus récente) |

Le seul oubli **pur** (posé une fois, jamais repris) : l'**anti-régression du
double-run search/chat** (`LIBRARY_AUDIT §5.2`). Tout le reste est soit tracké, soit
explicitement encore ouvert.

### Ambiguïtés non résolues

- **Le « format de sortie manquant » du prompt « audit UX/matrices »** : ce rapport
  (`UX_STUDIO_MATRICES_AUDIT.md`) **n'existe pas encore**. Son Volet 3 n'a donc jamais
  été produit, et sa question sur « le format de sortie manquant » **n'est ni intégrée
  ni en suspens — elle n'a pas été posée**. Je ne l'invente pas.
  - *Écho le plus proche dans les audits existants* : `ALL_CHAINS §7` note que la
    **compatibilité de schéma** entre `uxpilote_chain_output.v0` / node_types UxPilote
    et l'enveloppe de brique llm-lego est **non vérifiée** ; et le pipeline réel
    *produit* un format (`STAGE → ROADMAP_PROPOSALS.yaml`) que la brique chaîne actuelle
    ne modélise pas (`LIBRARY_UX F7`). Si un audit UX/matrices est produit plus tard,
    c'est là qu'il devra brancher la question du format de sortie.
- **Typologie Système ⟷ Roadmap ⟷ Council** : posée « non tranchée » par
  `LIBRARY_AUDIT §2`, jamais tranchée depuis (HumanGate requis). Toujours ouverte.
- **`run_chain.py` vs idée→IMP** : deux générations probables, canonique non décidé.

---

## Recommandation

**Ne pas fusionner. Ajouter un index de préséance + 3 micro-corrections de formulation.**

1. **Créer un `AUDIT_INDEX.md`** (une page) qui dit, par sujet, **quel audit fait foi**
   et marque les sections périmées. Exemple de lignes :
   - *Gouvernance agent* → `COMPLETENESS §3.1` fait foi ; `LIBRARY_AUDIT §1.3` **périmé**.
   - *Sources importables / gisement* → `ALL_CHAINS` fait foi ; `AUTOPILOT_MINING`
     couvre le seul cas monolithe.
   - *Plan de passes* → `ALL_CHAINS §6` + `LIBRARY_UX` font foi ; `LIBRARY_AUDIT §4`
     **caduc** (Agent-first abandonné).
   - *État live de la lib* → `LIBRARY_UX` fait foi (18 briques testées).
2. **3 notes de bas de page** (dans l'index, sans toucher les audits) : (a) le CLAIM_MATRIX
   4-lanes existe *comme source à importer*, **le trou builder reste** ; (b) ledger =
   **244** IMP (pas 217) ; (c) `autopilot.py` = **9029** lignes (pas ~5200).
3. **Fusion : non.** Les audits ont des périmètres et des dates distincts ; les fondre
   effacerait la traçabilité « qui a constaté quoi, quand » qui est précisément ce qui
   rend la série fiable. Un index préserve cette traçabilité **et** donne la préséance.

Pourquoi index plutôt que fusion : le problème n'est pas la contradiction (rare et
mineure) — c'est qu'un **lecteur ne sait pas quel audit est à jour** quand il en ouvre
un ancien. L'index résout exactement ça, pour un coût d'une page.

---

## Verdict honnête

**Notre pratique d'audit fonctionne — elle n'est pas (encore) en dette.** Les
signaux positifs dominent :

- **Chaînage réel** : chaque audit lit et cite nommément les précédents (`COMPLETENESS`
  cite `LIBRARY_AUDIT` et `MICRO_BRICKS` ; `LIBRARY_UX` cite les quatre d'avant ;
  `ALL_CHAINS` étend `LIBRARY_UX`). Aucun audit n'ignore la série.
- **Auto-correction explicite et datée** : `COMPLETENESS` acte que `LIBRARY_AUDIT` est
  périmé sur la gouvernance ; `LIBRARY_UX` corrige sa propre 1ʳᵉ passe (« ce n'est PAS
  n=1 ») dans le même document. C'est le comportement d'une pratique saine, pas d'une
  dette silencieuse.
- **Discipline de preuve constante** : `fichier:ligne` partout, séparation
  software/evidence/claim + `NO_CLAIM_ALLOWED` respectée dans les 6, zones « survolées
  non lues » déclarées honnêtement.

**Les 3 tensions ne sont pas de la dette — ce sont des coutures normales** entre passes
successives qui approfondissent le même terrain. Aucune n'est une contradiction
factuelle dure : la #1 est une formulation à resserrer, la #2 un réordonnancement déjà
en cours, la #3 un écart build-vs-audit (pas audit-vs-audit).

**Le seul vrai symptôme de début de dette** : **trois plans de passes coexistent sans
préséance déclarée**, et un lecteur qui ouvre le plus ancien (`LIBRARY_AUDIT §4`,
Agent-first) le prendra pour la feuille de route active alors qu'il est caduc. C'est
léger, ça se règle avec **un index d'une page — à faire *avant* de produire le
prochain audit**, pas une remise à plat. Continuer à auditer est sain ; il faut juste
poser le panneau « quel audit fait foi » maintenant, tant qu'il n'y a que 6 fichiers.

---

*Fin du méta-audit — aucun fichier d'audit existant modifié, fusionné ou supprimé.*
*software_verdict: OK (méta-audit produit) · evidence_verdict: MECHANICAL_VALIDATION_ONLY
(6 audits lus intégralement + chronologie mtime vérifiée ; contradictions citées des deux
sources) · claim_verdict: NO_CLAIM_ALLOWED*
