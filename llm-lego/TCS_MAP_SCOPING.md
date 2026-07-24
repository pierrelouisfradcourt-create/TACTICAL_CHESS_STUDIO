# Cadrage — Carte complète de TCS

> Passe **cadrage + planification uniquement**. Aucun code écrit, aucune brique créée,
> aucune brique modifiée, aucun commit. Citations `fichier:ligne` et comptes vérifiés
> de première main (`library/`, `git`, arborescence racine) ou repris d'audits datés
> déjà présents dans `llm-lego/`. Date : 2026-07-03.
>
> software_verdict: N/A (cadrage) · evidence_verdict: MECHANICAL_VALIDATION_ONLY ·
> claim_verdict: NO_CLAIM_ALLOWED

---

## TL;DR (à lire d'abord)

- **Ce qui a été cartographié à ce jour ≈ 5–10 % de TCS.** Les 11 audits llm-lego couvrent
  UNE couche : le control-plane agentic (`autopilot.py`, `lab/chains/`, matrices de
  gouvernance, mécanismes d'appel Claude, openclaw). Le **cœur du produit** — le moteur
  Rocky (`src/`, ~105 `.rs`), la ML (`ml/`, 50 fichiers), la gouvernance (`governance/`,
  28), 90 % de `lab/` (~1000 fichiers), `games/` (109), `studio_core/` (33) — **n'a
  jamais été regardé par aucun audit.**
- **La bibliothèque compte 45 briques** (18 agent · 12 oracle · 9 prompt · 3 chain ·
  3 outputformat ; **0 roadmap · 0 goal**). Elle est plus avancée que ne le dit
  `IMPORT_PASS1_REPORT.md` (31) : la Passe 2 (chaînes `.ps1` → 5 oracles) et l'extraction
  openclaw ont eu lieu depuis.
- **La distinction « câblé vs cassé » que Pierre veut ne tient PAS dans `badge`/`maturity`.**
  `badge`=real/target/demo porte l'*intention* (source réelle vs vision) ; `maturity`=
  draft/saved/live porte le *cycle de vie dans llm-lego*. Aucun ne dit si la source TCS
  **tourne réellement au runtime**. Exemple qui casse le modèle : openclaw est `badge:real`
  (le code existe) mais **DORMANT, 0 dispatch câblé** — le badge ment sur le câblage.
- **Recommandation structure** : ajouter **un seul champ scalaire `wiredStatus`** sur
  l'enveloppe commune, rendu comme une pastille informative exactement comme `maturity`
  (ce n'est **pas** un nouveau mécanisme — même enveloppe, même patron de rendu). +
  plusieurs **Chaînes thématiques** plutôt qu'une seule.
- **Verdict** : une carte VRAIMENT complète n'est **pas** atteignable « en quelques
  passes ». C'est un **chantier multi-releases** (~15–25 passes, dominé par le code jamais
  audité). Découper en releases utilisables : R1 « control-plane » (~4–6 passes, presque
  prête), R2 « mémoire + appels LLM » (petite, à haute valeur), R3+ audit progressif du
  moteur/ML/gouvernance, un sous-système par release.

---

## Inventaire de l'existant (déjà audité / importé)

### A. Les audits produits (11 `.md`, pas 9)

`AUDIT_INDEX.md` en liste **9** mais **2 manquent** — l'index est déjà en retard :
`CLAUDE_CALLS_AUDIT.md` et `BACKLOG_FRICTION_AUDIT.md` (tous deux datés 2026-07-03,
vérifiés de première main). *Premier point d'hygiène : l'index n'est pas exhaustif.*

### B. Ce qui a été audité ET/OU importé

| Système TCS | Statut d'audit | Statut d'import (briques) | Source / audit qui fait foi |
|---|---|---|---|
| `autopilot.py` (9029 l) | **Audité** | **Partiel** — 6 oracles + 4 prompts + 1 agent charter + profil LM | `AUTOPILOT_MINING_REPORT` (sous-dimensionné) |
| `lab/chains/*.py` (fam. 1) | **Audité** | **Partiel** — 2 chaînes (idée→IMP, run_chain) + 8 prompts | `ALL_CHAINS §6`, `CHAINS_COMPARISON` |
| Chaînes `.ps1` (fam. 2, 5 chaînes) | **Audité** | **Importé** — 5 oracles `audit-oracle-chain-*` | `ALL_CHAINS §4` (Passe 2 faite) |
| 17–20 matrices gouvernance | **Audité** | **1 seule** (gate `tool_permission` → oracle) | `UX_STUDIO_MATRICES Volet 2` |
| openclaw-workspace (4 agents, 28 skills) | **Audité** | **Extrait** — 4 agents + 1 oracle + 1 prompt worker | `OPENCLAW_CONTENT_AUDIT` (extraction chirurgicale) |
| Mécanismes d'appel Claude (×4) | **Audité** | **Non importé** (documenté seulement) | `CLAUDE_CALLS_AUDIT` (hors index) |
| Frictions builder / UX bibliothèque | **Audité** | N/A (méta-UX) | `LIBRARY_UX`, `BACKLOG_FRICTION` (hors index) |
| « Format de sortie » (Volet 3) | **Audité** | **3 briques** `outputformat-*` | `UX_STUDIO_MATRICES Volet 3` |

**État live de la bibliothèque : 45 briques** — 18 agent · 12 oracle · 9 prompt · 3 chain ·
3 outputformat · **0 roadmap · 0 goal · 0 router/tool/note/artefact** ; 39 `saved` / 6 `draft`.
(Compté ce jour ; `BACKLOG_FRICTION` en voyait 34, `IMPORT_PASS1` 31 — cible mouvante.)

### C. Audité mais NON importé (gisement prêt, rapide)

| Source | Cible brique | Effort | Réf |
|---|---|---|---|
| `IMPROVEMENT_LEDGER.yaml` (244 IMP, 161 Ko) | roadmap ×N | FAIBLE-MOYEN | comble F6 (roadmap=0) |
| `ROADMAP_PROPOSALS.yaml` (PROP-NNN + humangate) | roadmap | FAIBLE | prêt, semi-structuré |
| `doc_hygiene_chain.py` (CLAIM_MATRIX 4-lanes) | chain + 4 oracles | FAIBLE | `ALL_CHAINS §3` |
| `fusion_matrix_chain.py`, `scripts_route_chain.py` | oracles | FAIBLE | agrégateurs |
| `CLAIM_MATRIX.md` + `tool_permission_matrix.json` (données brutes) | matrix/oracle | FAIBLE | 2 ACTIVE-AU-BOOT |
| `run_chain.py` lourd (validation/dedup droppés) | compléter chaîne B | MOYEN | `CHAINS_COMPARISON §fidélité` |

### D. Constaté CASSÉ / CONTRADICTOIRE (vérifié de première main)

| Item | Réalité | Source |
|---|---|---|
| **4 mécanismes Claude dispersés** | 3 chemins LOCAUX vers `claude --print` (subprocess direct `autopilot.py:1238` · `npx @anthropic-ai/claude-code` dans `kaizen_autoloop.py` · proxy HTTP `:8765`) + **1 chemin API PAYANT mort et interdit** `ml/claude_bridge.py` (SDK `anthropic`, `ANTHROPIC_API_KEY`) | `CLAUDE_CALLS_AUDIT` |
| **Systèmes de mémoire contradictoires** | pas 3 mais **≥5** emplacements (voir §suivante) ; contradiction **auto-reconnue** (`00_CURRENT_CONTEXT.md:33-35`, gel CT-4) | vérifié §2 ci-dessous |
| **`CLAUDE.md` corrompu** | contenu **dupliqué** (l.1-79 propre, l.80-186 copie markdown échappée) ; règle « API Anthropic externe = Jamais » présente en double ET **violée** par `ml/claude_bridge.py` | vérifié |
| **`AUTHORITY_MATRIX` « lue au boot »** | **FAUX** — 0 référence code (grep `(?i)matrix` sur autopilot.py = 0). DOCUMENTED_ONLY | `UX_STUDIO_MATRICES:157-160` |
| **openclaw RÉEL mais DORMANT** | 0 dispatch câblé ; statut tiré des docs de décision, **non re-testé par exécution** | `UX_STUDIO_MATRICES:50,320` |
| **`studioctl.py` (3254 l) PASSIVE** | 0 importeur — construit, jamais branché (IMP-133 propose archivage) | `UX_STUDIO_MATRICES:63` |
| **autopilot : aucune boucle d'action fermée** | Council 100 % lecture seule ; `CHAIN_HISTORY.jsonl` gelé 2026-06-04 | ext. `AUDIT_COMPLET_2026-06-27 §3.5` |
| **Post-mortem transversal** | « **surface affichée > surface câblée** » — la leçon centrale pour llm-lego | ext. ×3 docs |
| **Neural ELO régresse** | signalé par Pierre / `MEMORY.md` ; **hors périmètre des audits llm-lego** (touche `ml/`/Rocky, jamais audité) | non vérifié ici |
| **F7 fork** (prompts copiés≠référencés) | corrigé en Passe 1 (producerRef) ; sous-issue oracles non câblés dans les 2 chaînes **reste ouverte** | `CHAINS_COMPARISON:135` |
| **`impRef` lien mort** | le serveur ne lit jamais `IMPROVEMENT_LEDGER.yaml` | `COMPLETENESS §4` |

---

## Ce qui manque pour une carte complète

### Les systèmes de mémoire — explorés de première main (pas seulement signalés)

Le concept « 3 systèmes contradictoires » vient d'un audit externe ; **nous l'avons
vérifié nous-mêmes** ici et la réalité est **≥5 emplacements** :

1. `studio_brain/` — vault Obsidian, **10 sous-dossiers** (architecture, decisions, doctrine,
   gamedesign, meta, state, projects, reference, workflow + `journal/` **VIDE**). Ancre
   temporelle : `00_CURRENT_CONTEXT.md` = 2026-07-03 ; `state/current-state` = 2026-06-28.
2. `~/.claude/.../memory/` — 15 fichiers, `MEMORY.md` index. Ancre `project_overview` = 2026-06-02.
   `matrix_index.md` dit **20 matrices** (les audits en comptent 17).
3. `CLAUDE.md` + `.claude/rules/` (4 fichiers) — gouvernance ; **corrompu/dupliqué**.
4. `AI_MEMORY/` — **stub** (un seul `README.md`, abandonné).
5. `governance/memory_core/` — 5 fichiers (`plans_library.jsonl`, `retrieve.py`…) — un
   sous-système mémoire de plus.

**Contradictions confirmées** : trois « maintenant » différents (07-03 / 06-28 / 06-02) ;
`CLAUDE.md` pointe tier-1 = `studio_brain/`, mais `00_CURRENT_CONTEXT.md` dit que le
canonique devrait devenir `memory/MEMORY.md` et qualifie `CLAUDE.md` de « contradictoire » ;
comptes divergents (20 vs 17 matrices ; « 244+ IMP » vs snapshot « 14 IMP »). **Aucun
système n'est autoritaire.** Ce n'est pas un signalement de seconde main — c'est vérifié.

### Zones majeures JAMAIS auditées (manqueraient à une carte complète)

| Zone | Taille | Audité ? | Importance |
|---|---|---|---|
| **`src/`** (moteur Rocky, Rust) | ~105 `.rs` | **Non** | **Cœur produit** — chess/ engine/ core/ agents/ ai/ search |
| **`ml/`** | 50 | **Non** | Entraînement LoRA, `phi_encoder`, `claude_bridge` (API payante) |
| **`lab/` hors `chains/`** | ~1000 | **Non** | council/ chess_fantasy/ agent_policy/ learning/ parsers/ gates/ … |
| **`scripts/`** | 192 | **Non** | council.py, director.py, canvas_gateway, studio_meta, studioV2/ |
| **`governance/`** | 28 | **Non** | governor, agent_factory, semantic_oracle, ledger_writer — la couche d'enforcement |
| **`studio_core/`** | 33 | **Non** | compiler/ ir/ runtime/ sim/ — backbone « design-compiler » |
| **`games/`** | 109 | **Non** | snake_genesis / snake_survivor — **les produits Steam du pivot** |
| **`docs/`** | 255 | **Non** | sources-of-truth citées par la doctrine |
| **`tools/`** | 204 | **Non** | PowerShell recovery/dedup + cross_engine_match, rocky_uci |
| **`studio/` hors openclaw** | 87 | Partiel | factory/ workflows/ studio_canvas.html |
| **`00_STUDIO_CONTROL/`** | — | Partiel | seules les matrices citées ont été vues |
| `infrastructure/`, `control_plane/`, `worktrees/`, `db/ datasets/ models/` | — | **Non** | déploiement, divergence worktree, actifs |

**Les plus gros trous à haute valeur** : `src/` (le moteur lui-même), `governance/`, `ml/`,
les 90 % de `lab/`, `games/`, `studio_core/`.

---

## Proposition de structure (carte honnête + sous-ensemble exécutable)

### 1. `wiredStatus` : un champ, pas un mécanisme

**Évaluation de la contrainte « ne pas inventer si `badge`/`maturity` suffisent » :**

| Axe existant | Ce qu'il porte | Peut-il porter « câblé vs cassé » ? |
|---|---|---|
| `badge` = real/target/demo | *Intention* : source réelle vs vision vs illustratif | **Non** — 3 slots déjà pris ; « real » devrait se scinder en câblé/passif/cassé sans perdre real≠demo |
| `maturity` = draft/saved/live | *Cycle de vie dans llm-lego* (sauvegarde) | **Non** — orthogonal, ne parle pas de la source TCS |

Les deux répondent à d'autres questions. La **vérité de câblage runtime de la source TCS**
est un **troisième axe**. Preuve par l'exemple : openclaw = `badge:real` + DORMANT ;
`tool_permission_matrix` = ACTIVE-AU-BOOT ; `AUTHORITY_MATRIX` = DOCUMENTED_ONLY ;
`studioctl.py` = PASSIVE/0-importeur. Ces quatre partagent `badge:real` — le badge ne les
distingue pas.

**Recommandation** : ajouter **un champ scalaire `wiredStatus`** sur l'enveloppe commune
(à côté de `maturity`/`badge`/`sourceRef`), **rendu comme la pastille `maturity`** (même
CSS `.lib-maturity[data-*]`, même patron). **Ce n'est pas un nouveau mécanisme** — c'est
une pastille informative de plus sur l'enveloppe existante. Valeurs (qui **réutilisent le
vocabulaire déjà employé par les audits**) :

| `wiredStatus` | = statut audit | Sens |
|---|---|---|
| `wired` | ACTIVE-AU-BOOT / réellement appelé | tourne au runtime |
| `partial` | branché mais lecture-seule / sur-demande | existe, effet incomplet |
| `scaffold` | construit, 0 appelant (PASSIVE) | code mort structurel |
| `documented-only` | spec/MD jamais chargé | vision écrite |
| `broken` | contradictoire / interdit / faux | à ne pas rejouer |

`badge` reste l'intention, `maturity` le cycle de vie, `wiredStatus` la vérité de câblage.
**Option la moins chère** si Pierre refuse même une pastille : encoder la valeur dans
`sourceRef`/`notes` par convention — mais c'est moins rigoureux et non filtrable.
`MICRO_BRICKS`/`UX_STUDIO_MATRICES` recommandaient déjà d'exposer un `runtimeStatus` — ce
champ **unifie** ce besoin déjà identifié plutôt que d'en créer un nouveau.

### 2. Chaînes thématiques, pas une seule carte géante

Une Chaîne unique serait illisible (F4 : le contenu d'une chaîne est déjà invisible depuis
sa fiche). Recommander **N Chaînes thématiques**, chacune une carte d'un sous-système, dans
le `kind:chain` existant. La « carte » = **bricks (portant `wiredStatus`) + Chaînes
thématiques qui les câblent**. Thèmes candidats (par ordre de préparation) :

- **« Appels LLM »** — les 4 mécanismes (3 locaux + 1 payant mort). Prêt (audité).
- **« Mémoire »** — les 5 emplacements + la contradiction CT-4. Prêt (audité ici).
- **« Oracles / Gouvernance »** — matrices + gates ACTIVE/PASSIVE/DOCUMENTED_ONLY. Semi-prêt.
- **« Council / Orchestration »** — council.py, kaizen, boucle autopilot dormante. Semi-prêt.
- **« Chaînes lab/ »** — familles 1/2/3. Semi-prêt.
- **« Moteur Rocky »** — `src/`. **Non prêt** (audit à faire, gros).
- **« Jeux / Produits »** — `games/`. **Non prêt**.

**Sous-ensemble exécutable** : seules les briques `wired` tournent offline aujourd'hui — les
**5 oracles `.ps1`** (audit mécanique pur), le **gate `tool_permission`**, le **council v1**
(`council.py`, avec lignée Gemini → mock pour rester offline). Tout le reste de la carte est
**descriptif** (documenté/scaffold/broken) et ne s'exécute pas.

---

## Découpage en passes recommandé

**Principe** : d'abord ce qui est déjà audité (intégration rapide), avant tout ce qui
demande un nouvel audit. Ne jamais mélanger « importer du connu » et « auditer de l'inconnu »
dans la même passe (l'erreur déjà évitée plusieurs fois).

### Bloc 0 — Fondation transverse (bloquant, 1 passe)
- **P0** : ajouter le champ `wiredStatus` (schéma + pastille + filtre liste) et **rétro-tagger
  les 45 briques existantes**. Petit. Débloque l'honnêteté de tout le reste. Décision Pierre
  requise sur : champ vs convention.

### Bloc 1 — Control-plane (déjà audité → intégration, ~4–6 passes)
- **P1** : Ledger 244 IMP + `ROADMAP_PROPOSALS.yaml` → briques `roadmap` (comble F6). FAIBLE.
- **P2** : `doc_hygiene` (CLAIM_MATRIX 4-lanes) + `fusion_matrix` + `scripts_route` → chaîne
  + oracles. FAIBLE.
- **P3** : Chaîne thématique **« Appels LLM »** (4 mécanismes, `wiredStatus` honnête). FAIBLE.
- **P4** : Chaîne thématique **« Mémoire »** (5 emplacements + contradiction). FAIBLE — mais
  dépend d'une **décision Pierre CT-4** (quel système canonique) pour être plus qu'un constat.
- **P5** : Matrices opérationnelles brutes (CLAIM_MATRIX, tool_permission) comme données
  référencées, pas forkées. FAIBLE-MOYEN.
- **P6** : compléter `run_chain.py` lourd + décider run_chain-vs-idée→IMP (HumanGate). MOYEN.

### Bloc 2 — Nouveaux audits, cœur produit (chacun = mini-chantier, ~2–4 passes/zone)
Ordre par valeur/risque. **Chaque zone = audit AVANT import**, comme les 11 audits l'ont fait.
- **P7–P9** : `src/` moteur Rocky (chess/engine/search/eval) — le plus gros trou, cœur produit.
- **P10–P11** : `governance/` (enforcement : governor, agent_factory, oracles sémantiques).
- **P12–P13** : `ml/` (LoRA, phi_encoder, claude_bridge, le neural ELO qui régresse).
- **P14** : `scripts/` (council, director, studio_meta, studioV2 PASSIVE).
- **P15** : `games/` + `studio_core/` (produits Steam + design-compiler).
- **P16** : `lab/` hors chains (council, chess_fantasy, learning, gates…). Très volumineux.
- **P17+** : `docs/`, `tools/`, `infrastructure/`, worktrees — nettoyage/traçabilité.

### Dépendances
- P0 bloque tout le reste (sans `wiredStatus`, la carte ment).
- P4 (Mémoire) est **bloquée par une décision Pierre** (CT-4), pas par un audit.
- Bloc 2 est indépendant du Bloc 1 et peut démarrer en parallèle si Pierre priorise le
  cœur produit — mais chaque zone doit être auditée avant d'être mappée.

---

## Estimation réaliste

- **Bloc 0** : 1 passe.
- **Bloc 1** (control-plane déjà audité) : **4–6 passes**. C'est le « presque prêt ».
- **Bloc 2** (cœur produit jamais audité) : **~10–18 passes**, dominé par `src/`, `lab/`,
  `governance/`, `ml/`. Chaque zone exige d'abord un audit (comme les 11 déjà faits n'ont
  couvert QUE le control-plane).

**Total pour une carte « vraiment complète » au sens de Pierre : ~15–25 passes.** La
fourchette est large parce que le coût est concentré dans du code jamais regardé, dont on ne
connaît pas encore la complexité (`src/` seul peut valoir 3–5 passes).

---

## Verdict honnête

**Une carte VRAIMENT complète de TCS n'est PAS un objectif atteignable en quelques passes.
C'est un chantier de fond.**

La raison est factuelle, pas pessimiste : **il a fallu 11 audits pour couvrir une seule
couche** — le control-plane agentic. Cette couche est la plus documentée, la plus
semi-structurée, la plus facile. Le **cœur du produit** (moteur Rocky `src/`, ML,
gouvernance, jeux, 90 % de `lab/`) — soit la **grande majorité du volume** — n'a **jamais
reçu un seul audit**. Prétendre le cartographier « en quelques passes » répéterait
exactement l'erreur que la doctrine TCS a elle-même nommée : **« surface affichée > surface
câblée »**.

**Recommandation : découper en releases successives, chacune une carte partielle
utilisable**, plutôt qu'une grande carte bâclée :

- **Release 1 — « Carte du control-plane »** (Bloc 0 + Bloc 1, ~5–7 passes). Immédiatement
  utile : rend honnête et navigable tout ce qui est déjà audité, avec `wiredStatus`. **C'est
  le livrable réaliste à viser d'abord.**
- **Release 2 — « Vérité mémoire + appels LLM »** (P3+P4, extractible de R1). Petite, à très
  haute valeur : matérialise les 2 contradictions les plus coûteuses (5 mémoires, 4 appels
  Claude dont 1 payant interdit) et force la décision CT-4.
- **Release 3+ — Audit progressif du cœur produit**, un sous-système par release
  (`src/`, puis `governance/`, puis `ml/`…). Chaque release ajoute une Chaîne thématique
  réelle et son lot de briques.

Chaque release est un jalon intermédiaire **utilisable seul**. C'est la seule façon de
construire une carte honnête sans la bâcler — et c'est cohérent avec la manière dont les 11
audits ont déjà procédé (un périmètre borné à la fois, daté, auto-corrigé).

---

*Cadrage — ne construit rien, ne modifie aucune brique. À ajouter à `AUDIT_INDEX.md`*
*(qui, au passage, doit aussi rattraper `CLAUDE_CALLS_AUDIT.md` et `BACKLOG_FRICTION_AUDIT.md`).*
*software_verdict: N/A · evidence_verdict: MECHANICAL_VALIDATION_ONLY · claim_verdict: NO_CLAIM_ALLOWED*
