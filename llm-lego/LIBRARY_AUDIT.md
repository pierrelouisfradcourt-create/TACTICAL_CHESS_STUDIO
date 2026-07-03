# Audit — Bibliothèque de briques persistantes

> **Note de correction (ajoutée le 2026-07-03, suite à META_AUDIT.md) :**
> La recommandation §3 de ce document (« **référencer, pas forker** » les registres TCS,
> pour éviter une double source de vérité) a été **violée** lors de la première
> construction de contenu réel : la chaîne idée→IMP originale **copiait** des prompts au
> lieu de les attacher par référence (constaté plus tard par `LIBRARY_UX_IMPORT_AUDIT.md`,
> friction F7 — texte de `llm-1` strictement identique au prompt autonome
> `autopilot-prompt-roadmap-001`). Cette violation est **en cours de correction** : la
> Passe 1 d'import (`IMPORT_PASS1_REPORT.md`) attache désormais les 4 briques prompt
> réelles au lieu d'en fabriquer. Cette note sert de rappel : la règle « référencer, pas
> forker » doit être **vérifiée activement à CHAQUE nouvelle construction de contenu**,
> pas seulement posée une fois et oubliée.
> Voir AUDIT_INDEX.md pour le contexte complet de cette tension.

> Passe **audit uniquement**. Aucun code écrit. Toutes les affirmations sur l'état
> du repo sont citées `fichier:ligne` et vérifiées de première main sauf mention
> contraire. Date : 2026-07-01.

---

## 0. TL;DR (à lire d'abord)

1. La **fondation de stockage existe déjà** et est bonne : le mécanisme Wire Map
   (`demo-server.ts:200-255`) est un store JSON générique offline (list / get /
   save, id validé, garde path-traversal). Réutiliser le **pattern**, pas le
   **schéma** (le schéma Wire Map est une checklist de tests, pas un catalogue).
2. Le repo TCS regorge déjà de registres pertinents **hors llm-lego** :
   `lab/agent_registry/*.json` (fiches agent réelles), `scripts/council.py`
   (Council réel), `lab/chains/IMPROVEMENT_LEDGER.yaml` (Roadmap),
   `lab/claim_data_gates/` (doctrine verdicts pour Test/Oracle). **Le risque
   principal n'est pas de manquer de matière — c'est la duplication / double
   source de vérité.**
3. Le module `src/library/registry.ts` + `src/feeder/feeder.ts` est un **embryon
   dormant** : jamais câblé au builder ni au serveur, utilisé seulement dans un
   test (`tests/engine.test.ts:63`). Il pré-nomme les bonnes buckets
   (agents / prompts / tools) mais son modèle est trop pauvre pour servir de base.
4. Sur les 7 types demandés, **2 se chevauchent avec l'existant** (Système ≈
   Roadmap ≈ en-tête projet Wire Map) et **1 est un sur-ensemble d'un autre**
   (Council ⊂ Chaîne). Ne pas construire 7 stores dès le départ.
5. **Point de départ recommandé : le type Agent.** Il a déjà le modèle le plus
   riche (à deux endroits), la CRUD palette était déjà cadrée et repoussée, il
   s'attache directement à un type de nœud existant, et c'est l'atome dont Council
   et Chaîne sont composés.

---

## 1. Existant réutilisable

### 1.1 Mécanisme de stockage Wire Map — RÉUTILISABLE (le pattern)

Un store document-par-id, JSON, offline, déjà éprouvé :

- **Route liste** `GET /api/wireframes` — `demo-server.ts:201-222` (scanne
  `WIREFRAMES_DIR`, renvoie `{projects:[{id,name}]}`).
- **Route get/save** `GET|POST /api/wireframes/:id` — `demo-server.ts:225-255`,
  avec **validation d'id** `^[a-zA-Z0-9_-]+$` (`demo-server.ts:227`) et écriture
  `JSON.stringify(doc,null,2)` (`demo-server.ts:247`).
- **Répertoire** `WIREFRAMES_DIR = path.join(__dirname,"wireframes")`
  (`demo-server.ts:27`) → fichiers `wireframes/{id}.json`.
- **Garde path-traversal** réutilisable : `safeResolve()` (`demo-server.ts:40`),
  utilisée par `/api/repo/file` (`demo-server.ts:266-280`).
- **Côté client** : cycle load/save/commit complet déjà écrit —
  `loadWmProjects` (`builder.html:632`), `loadWmProject` (`builder.html:641`),
  `saveWm` (`builder.html:652`), `commitWm` (`builder.html:663`),
  `createProject` (`builder.html:672`).

C'est **le squelette exact** d'une bibliothèque persistante : list, load, mutate,
save, offline-safe. Un store `library/` calqué dessus est un copier-adapter, pas
une invention.

### 1.2 Tableau `EXAMPLES` — le point de bascule vers le dynamique

- `EXAMPLES` (`builder.html:316-320`) + `EXAMPLE_BADGE` (`builder.html:315`) :
  3 entrées data-driven `{key,label,status,make,loadedMsg}`, chargées par
  `loadInto` (`builder.html:~468`) via le sélecteur de vue.
- **Statut** : en mémoire JS, non persistant. C'est **exactement la maquette** de
  ce qu'une "bibliothèque de Chaînes" doit remplacer : mêmes champs (nom, badge de
  maturité, payload graphe). La migration EXAMPLES → store dynamique est le
  chemin naturel pour le type **Chaîne**.

### 1.3 Modèle de données Agent — déjà riche (à DEUX endroits)

- Côté builder : `ROLE_PRESETS` (`builder.html:169-181`) — chaque rôle porte
  `{group, model, temperature, top_p, max_tokens, color}` ; `withRole()`
  (`builder.html:186`) applique un preset sur `node.data`. Deux groupes déjà
  distingués : `v1 réel (council.py)` vs `cible (table)`.
- Facettes agent déjà esquissées : `LLM_FIELDS = ['mémoire','skill','plugin',
  'rôle','objectif','garde-fou','modèle']` (`builder.html:348`) — **c'est la
  chaîne "fiche agent" exacte** mentionnée dans la demande, dont la CRUD palette
  avait été repoussée.
- Côté TCS (réel, vérifié) : `lab/agent_registry/*.json` — 5 fiches
  (`code`, `docs`, `producer`, `qa`, `review`). Schéma
  (`lab/agent_registry/code.agent.json:1-27`) :
  `{agent_id, display_name, role, autonomy_level, permissions{...}, allowed_surfaces[], forbidden_surfaces[]}`.

→ Une fiche "Agent-brique" = **fusion** des params LLM (ROLE_PRESETS) + de la
gouvernance (agent_registry). Le modèle nœud actuel couvre les params mais **pas**
autonomie/permissions/surfaces — voir §1.6.

### 1.4 Embryon library/feeder — DORMANT, trop pauvre

- `registry.ts:8-21` : `Library = {agents, prompts, tools}` où chaque entrée est
  `{nodeId, output:unknown}` (`registry.ts:8-11`).
- `feeder.ts:16-40` : moissonne les steps réussis d'une trace vers ces buckets.
- **Câblage réel : aucun.** Exporté (`src/index.ts:44-46`) mais consommé
  uniquement par `tests/engine.test.ts:63`. Aucune référence dans `builder.html`
  ni `demo-server.ts` (vérifié : grep hors `src/` → seulement tests + README +
  lock).
- Verdict : **conceptuellement juste** (il nomme agents/prompts/tools comme
  buckets réutilisables) mais **dépassé par le Wire Map** comme mécanisme, et son
  modèle `{nodeId, output}` est un *cache de sorties de run*, pas un *catalogue de
  définitions éditables*. À garder comme inspiration de nommage, pas comme base.

### 1.5 Contrat d'exécution (moteur) — la cible d'attachement

- `Node = {id, type, data}` avec `NodeType = "llm"|"tool"|"agent"|"router"`
  (`src/core/types.ts:8-14`). Le `data` est un sac `Record<string,unknown>` — donc
  **une brique peut y injecter n'importe quel champ** sans changer le moteur.
- Point de bascule mock → réel : `mockAdapters` "drop-in replaceable by real
  API-backed adapters implementing the same interface" (`src/adapters/mock.ts:6-8`)
  ; le serveur surcharge déjà via `demoAdapters` (`demo-server.ts:94-131`). C'est
  le socle technique du cycle **draft → sauvegardé → appel réel** : la forme de la
  brique ne change pas, seul l'adapter change.

### 1.6 Registres TCS hors llm-lego (matière + doctrine)

Vérifiés de première main pour existence (`find`) ; détails de schéma issus de
l'agent d'exploration, cités mais **non tous relus ligne à ligne** :

| Registre | Fichier | Rôle | Mappe vers type |
|---|---|---|---|
| Roadmap IMP | `lab/chains/IMPROVEMENT_LEDGER.yaml` (existence ✓) | 217 IMP, champs id/status/lane/impact/effort/files/acceptance/blocked_by | **Roadmap** |
| Fiches agent | `lab/agent_registry/*.json` (relu ✓) | rôle/autonomie/permissions/surfaces | **Agent** |
| Council réel | `scripts/council.py` (existence ✓) | 3 rôles (PLAN_REVIEW/RED_TEAM/DIVERGENCE), gate parallèle, fallback, timeout 120s | **Council** |
| Doctrine verdicts | `lab/claim_data_gates/claim_language_contract.pr05.json` (existence ✓) | software/evidence/claim verdicts, NO_CLAIM_ALLOWED | **Test/Oracle** |
| Chaîne de prompts | `lab/chains/prompt_chain_map.json` (existence ✓, via agent) | pipeline 5 étapes + catalogue 6 agents | **Prompt** + **Chaîne** |
| Corpus LoRA | `lab/chains/golden_examples.jsonl` (existence ✓) | exemples d'entraînement | (hors périmètre brique) |

> ⚠️ Ces fichiers existent aussi dans des worktrees (`.claude/worktrees/`,
> `worktrees/`, `repos/games/studioV2_MIGRATED_HOLD/`). **La source de vérité est
> la copie racine `C:\TACTICAL_CHESS_STUDIO\lab\...`**, pas les copies worktree.

---

## 2. Les 7 types — état actuel

| Type | Équivalent existant | Manque | Ambiguïté |
|---|---|---|---|
| **Système** | En-tête projet Wire Map `project{id,name,repoRoot,created,roadmapRef}` (`wireframes/llm-lego.json:2-8`) | Pas de notion "environnement d'exécution" (quel adapter/proxy/port) distincte du projet | **Forte** : recouvre l'en-tête projet Wire Map ET la "Roadmap" (roadmapRef y est déjà). Mal délimité — est-ce un projet, un env, ou les deux ? |
| **Prompt** | `prompt` inline sur nœud LLM (`NODE_TYPES.llm`, `builder.html:157`) ; bucket `prompts` dormant (`registry.ts:16`) ; templates dans `prompt_chain_map.json` | Entité **versionnée, réutilisable, attachable** : n'existe pas | Faible. Type clair. Question : versioning dans la brique ou via git ? |
| **Agent** | Le plus couvert : `ROLE_PRESETS` (`builder.html:169-181`) + `withRole` (`builder.html:186`) + facettes `LLM_FIELDS` (`builder.html:348`) + `lab/agent_registry/*.json` | Champs gouvernance (autonomie, permissions, surfaces autorisées/interdites) absents du modèle nœud | Faible. Le mieux défini des 7. |
| **Council** | `subgraphGateV1`/`subgraphLooped` (`builder.html:352,365`) ; exemples `exampleCouncilGate`/`Looped` ; réel `scripts/council.py` | Council comme **entité nommée sauvegardable et extensible** (au-delà des 2 formats hardcodés) | **Forte** : un Council = une **Chaîne** dont les nœuds sont des agents + une règle d'orchestration. Pas nettement distinct de "Chaîne". |
| **Test/Oracle** | Sous-objet `test{description,file,line,status,color,type}` **inline** dans une entrée Wire Map (`builder.html:707`, `wireframes/llm-lego.json:25-32`) ; doctrine `lab/claim_data_gates/` ; `governance/semantic_oracle.py` (via agent) | Entité **first-class, créée une fois, attachable à plusieurs nœuds** : n'existe pas (aujourd'hui 1 test ⊂ 1 entrée) | Moyenne. "Oracle réel non-LLM" (doctrine) vs "test attaché à un nœud" (Wire Map) sont deux granularités à réconcilier. |
| **Roadmap** | `roadmapRef` (`wireframes/llm-lego.json:7`) + champ `impRef` par entrée (`builder.html:709` `impRef:null`) ; cible `IMPROVEMENT_LEDGER.yaml` | Résolution réelle d'un IMP-NNN (lire le ledger, afficher titre/statut/lane) | **Forte** : chevauche "Système" (roadmapRef vit dans l'en-tête projet). Est-ce un type de brique ou juste un **champ de lien** sur les autres briques ? |
| **Chaîne** | `EXAMPLES` (`builder.html:316`) = graphes nommés ; le graphe canvas lui-même ; `toEngineGraph` (`builder.html:210`) sérialise déjà nodes+edges | Sauvegarder/nommer/retrouver un graphe dessiné comme entité | Moyenne. Claire en soi, mais **absorbe Council** (§Council) et recoupe EXAMPLES. |

### Tensions honnêtes (demandées explicitement)

- **Système ⟷ Roadmap ⟷ en-tête projet Wire Map se chevauchent à trois.**
  `project{id,name,repoRoot,roadmapRef}` (`wireframes/llm-lego.json:2-8`) est déjà
  un "Système" *et* porte déjà le lien "Roadmap". Traiter les trois comme des
  types de briques séparés créerait de la redondance immédiate. **Recommandation :
  "Système" = l'en-tête projet (existant, à généraliser) ; "Roadmap" = un *champ
  de lien* (impRef/roadmapRef), pas un type de brique à part entière.**
- **Council n'est pas distinct de Chaîne** dans les données. `subgraphLooped`
  (`builder.html:365`) est un graphe ; un Council *est* une Chaîne d'agents + une
  règle (gate parallèle vs boucle). **Recommandation : "Chaîne" = type de base ;
  "Council" = une Chaîne **taguée** `kind:council` avec des métadonnées
  d'orchestration.** Ne pas créer deux stores.
- **Test/Oracle a deux granularités qui ne coïncident pas.** La doctrine impose
  des oracles **non-LLM** (`studio-doctrine.md`, via agent) ; le Wire Map stocke
  un pointeur de test par entrée (`builder.html:707`). Promouvoir Test/Oracle en
  entité attachable est cohérent, mais il faudra décider si une brique Oracle
  *exécute* quelque chose ou *pointe* vers un oracle existant (cargo/pytest/elo).
  Aujourd'hui c'est un pointeur ; en faire un exécuteur = gros périmètre + risque
  doctrine.

---

## 3. Recommandation d'architecture de stockage

**Réutiliser le PATTERN Wire Map, dans un espace de noms SÉPARÉ.**

- **Ne pas** surcharger `wireframes/*.json`. Ce schéma est
  `{project, entries[]}` orienté checklist-de-tests ; `runAudit`
  (`builder.html:751`) compte les `entries` et leur `test.status`. Y injecter
  7 types de briques casserait l'audit et confondrait "QA d'un projet" avec
  "catalogue de composants".
- **Créer** un store parallèle `library/{id}.json` servi par une famille de routes
  calquée sur `/api/wireframes` (`demo-server.ts:200-255`) : `GET /api/library`
  (liste), `GET|POST /api/library/:id`. Réutiliser tel quel la regex d'id
  (`demo-server.ts:227`) et le pattern d'écriture (`demo-server.ts:247`).
- **Schéma de brique unifié** (un seul type de document, discriminé par `kind`) :

  ```
  {
    id, kind: "agent"|"prompt"|"chain"|"council"|"oracle"|"system",
    name, maturity: "draft"|"saved"|"live",   // le cycle demandé
    badge: "demo"|"real"|"target",            // réutilise EXAMPLE_BADGE
    roadmapRef: "IMP-NNN"|null,               // "Roadmap" = champ, pas type
    payload: { ... },                          // spécifique au kind
    created, updated
  }
  ```

  Justification : **un store, un schéma enveloppe, N payloads**. Évite N stores à
  maintenir, garde la liste/recherche triviale (filtrer par `kind`), et le champ
  `maturity` matérialise draft→saved→live sans changer la forme (aligné sur le
  swap mock→real, `mock.ts:6-8`).

- **Ne pas dupliquer les registres TCS.** Pour Agent et Roadmap, **référencer**
  (`lab/agent_registry/*.json`, `IMPROVEMENT_LEDGER.yaml`) plutôt que forker. Le
  serveur a déjà une lecture repo sûre (`/api/repo/file`, `demo-server.ts:266`) —
  l'étendre en lecture seule vers `lab/` est préférable à recopier des fiches qui
  divergeront.

- **Doctrine.** `maturity:"live"` (appel LLM réel) ne doit jamais court-circuiter
  `claim_verdict: NO_CLAIM_ALLOWED`. Défaut = `draft`/mock ; passage à `live`
  derrière gate humain (cohérent avec le pattern `governor.check` de council.py).

---

## 4. Découpage en passes proposé

Aligné sur la granularité des passes précédentes (Wire Map = 1 passe, sélecteur =
1 passe).

- **Passe 1 — Store + type Agent (MVP).**
  Minimal : (a) routes `/api/library` + `library/{id}.json` (copie du pattern
  wireframes) ; (b) UN seul `kind: "agent"` ; (c) CRUD fiche agent (les facettes
  `LLM_FIELDS` déjà listées, `builder.html:348`, + params ROLE_PRESETS) ; (d)
  attacher une fiche agent sauvegardée à un nœud `agent` via un dropdown badgé
  (réutilise le composant sélecteur qu'on vient de livrer). Seed : importer les
  5 fiches `lab/agent_registry/*.json` en lecture.
  *Ne PAS faire dans la passe 1* : les 6 autres types, l'appel réel, le versioning.

- **Passe 2 — Prompt + Chaîne.**
  `kind:"prompt"` (attachable à LLM/agent) ; `kind:"chain"` = **migration de
  `EXAMPLES`** (`builder.html:316`) vers le store : les 3 exemples deviennent des
  briques Chaîne seed (garder routing comme fixture — cf. risque régression §5).

- **Passe 3 — Council + Test/Oracle.**
  `kind:"council"` = Chaîne taguée (seed depuis `subgraphGateV1/Looped`,
  `builder.html:352,365`) ; `kind:"oracle"` = promotion du sous-objet `test`
  (`builder.html:707`) en entité référencée par id, attachable à N nœuds.

- **Passe 4 — Système + Roadmap (liens).**
  Généraliser l'en-tête projet Wire Map en `kind:"system"` ; résoudre `impRef`
  contre `IMPROVEMENT_LEDGER.yaml` (afficher titre/statut/lane). Surtout des
  **cross-références**, peu de neuf.

- **Passe 5 (plus tard) — cycle "appel réel".**
  Adapter réel drop-in (`mock.ts:6-8`, `demoAdapters` `demo-server.ts:94`) ;
  `maturity:"live"` derrière HumanGate ; NO_CLAIM_ALLOWED maintenu.

---

## 5. Risques identifiés

1. **Sur-ingénierie des 7 types.** 2 chevauchent (Système/Roadmap), 1 est un
   sous-cas (Council ⊂ Chaîne). Construire 7 stores/écrans dès le départ =
   complexité pour des distinctions non tranchées. → Schéma enveloppe unique + un
   `kind` à la fois.
2. **Régression du double-run search/chat.** `EXAMPLES` (`builder.html:316`)
   alimente l'exemple `routing`, socle du test critique. Migrer EXAMPLES vers un
   store dynamique risque de casser le chargement de cet exemple. → Garder les 3
   exemples comme **fixtures seed** écrites au premier lancement, jamais
   supprimables ; le test Playwright doit rester vert après migration.
3. **Double source de vérité.** Fiches agent en double (`lab/agent_registry/*.json`
   vs futures briques agent) → divergence. Idem Roadmap (ledger vs copies). →
   **Référencer, pas forker.**
4. **Lock-in de schéma de stockage.** Overload de `wireframes/*.json` casserait
   `runAudit` (`builder.html:751`) et confondrait QA et catalogue. → Store séparé
   `library/` dès le départ.
5. **Collision doctrine sur "appel réel".** Une brique `live` déclenchant un LLM
   pourrait produire des claims interdits. → mock par défaut, `live` gated,
   NO_CLAIM_ALLOWED (doctrine `lab/claim_data_gates/`).
6. **Copies worktree trompeuses.** `find` renvoie les mêmes fichiers sous
   `.claude/worktrees/`, `worktrees/`, `repos/.../studioV2_MIGRATED_HOLD/`. Lire
   uniquement la copie racine `lab/...` pour éviter d'ancrer la brique sur une
   version périmée.
7. **Embryon registry.ts trompeur.** Il ressemble à la solution mais c'est un
   cache de sorties de run (`{nodeId,output}`, `registry.ts:8-11`), pas un
   catalogue éditable. Le prendre pour base ferait fausse route. → S'en inspirer
   pour le nommage des buckets seulement.

---

## 6. Point de départ recommandé

**Type Agent** (le plus de valeur, le moins de complexité).

Pourquoi :
- **Modèle déjà le plus riche**, à deux endroits : `ROLE_PRESETS`
  (`builder.html:169-181`) + `LLM_FIELDS` (`builder.html:348`) côté builder, et
  `lab/agent_registry/*.json` côté TCS (relu). Peu à inventer.
- **CRUD déjà cadrée et repoussée** : la "palette CRUD agent" était explicitement
  reportée jusqu'ici (facettes mémoire/skill/plugin/rôle/objectif/garde-fou/modèle
  déjà énumérées). C'est la suite naturelle.
- **Valeur immédiate sans machinerie lourde** : une fiche Agent s'attache à un
  type de nœud qui existe déjà (`agent`, `types.ts:8`) via un dropdown identique
  au sélecteur de vue livré la passe précédente — pas besoin de save-graph.
- **C'est l'atome composable** : Council et Chaîne sont *faits d'*agents. Construire
  l'atome d'abord rend les passes 2-3 additives, pas des refontes.
- **Faible ambiguïté** (contrairement à Système/Roadmap/Council), donc pas de
  décision de design bloquée en attente de HumanGate.

Capacité minimale de la première brique : **créer / éditer / sauvegarder une fiche
Agent dans `library/`, l'attacher à un nœud agent du canvas, avec un badge de
maturité `draft` réutilisant le vocabulaire démo/réel/cible existant.**

---

*Fin de l'audit — aucune modification de code effectuée dans cette passe.*
*software_verdict: N/A (audit) · evidence_verdict: MECHANICAL_VALIDATION_ONLY (citations vérifiées) · claim_verdict: NO_CLAIM_ALLOWED*
