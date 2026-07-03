# Audit de complétude — le builder llm-lego peut-il représenter TOUT TCS ?

> **Note de correction (ajoutée le 2026-07-03, suite à META_AUDIT.md) :**
> Le point 3 de ce document (« les 4 lanes SAFE_AUTO/AUDIT_REQUIRED/… n'existent pas
> comme étiquette de premier ordre, rien n'est appliqué au runtime ») est **toujours
> vrai** et parle du **builder llm-lego lui-même**. Des audits ultérieurs
> (`LIBRARY_UX_IMPORT_AUDIT.md`, `ALL_CHAINS_AUDIT.md`) ont découvert que le CLAIM_MATRIX
> 4-lanes **existe comme source TCS importable** (`doc_hygiene_chain.py`) — ce qui a pu
> se lire comme « COMPLETENESS s'est trompé ». **Ce n'est pas le cas.** Ce sont deux
> couches distinctes : le *builder* (ce que ce document audite) vs une *source externe
> qu'on peut importer*. Importer cette source donnerait une **donnée** dans la
> bibliothèque, sans rendre les 4 lanes first-class sur un nœud ni appliquées par le
> moteur. Le constat original tient : **rien n'a encore été importé/construit ici.**
> Voir AUDIT_INDEX.md pour le contexte complet de cette tension.

> Passe **audit uniquement**. Aucune ligne de code écrite, aucun fichier modifié
> dans `llm-lego/` hors ce fichier. Citations `fichier:ligne` vérifiées de première
> main. Ce qui n'a pu être vérifié qu'en lisant le code (sans exécution empirique)
> est signalé explicitement. Date : 2026-07-02.

---

## 0. TL;DR

Le critère n'est pas « toutes les cases cochées » mais « peut-on dessiner TOUT TCS
fidèlement ». Réponse courte : **non, pas encore — il reste au moins deux trous
structurels qui empêchent une représentation fidèle du système réel.**

1. **Council gate v1 : params fidèles, mais l'exécution parallèle + timeout 120s
   reste non représentable** — le moteur est séquentiel (`engine.ts:120-155`), le
   Council réel tourne 3 voix en parallèle (`council.py:516`, `asyncio.gather`).
   Le trou identifié en passe précédente **existe toujours** et n'est comblé que
   par une **note texte**, pas par le moteur.
2. **Rocky (autorité Search > LLM) : pas représentable du tout.** Aucun mécanisme
   pour exprimer qu'un nœud « a le dernier mot » sur un autre. Tous les nœuds sont
   égaux (`types.ts:8`), seuls `router` (branche) et `humangate` (pause) diffèrent.
   C'est le trou le plus profond : il faudrait un changement **moteur**, pas UI.
3. **CLAIM_MATRIX : progrès réel mais incomplet.** La fiche Agent porte désormais
   `autonomy_level` + `permissions` + `allowed/forbidden_surfaces` éditables
   (`builder.html:1514-1526`) — c'est NOUVEAU depuis `LIBRARY_AUDIT.md`. Mais la
   **taxonomie des 4 lanes** (SAFE_AUTO/AUDIT_REQUIRED/HUMAN_REQUIRED/FORBIDDEN)
   comme étiquette de premier ordre sur un nœud/une action **n'existe pas** ; seul
   HUMAN_REQUIRED est couvert (HumanGate). Rien n'est **appliqué** au runtime.
4. **Roadmap : `impRef` reste du texte libre non connecté.** Le serveur ne lit
   JAMAIS `IMPROVEMENT_LEDGER.yaml` (il ne seed que `lab/agent_registry`,
   `demo-server.ts:74,107`). Les 217 IMP réels ne sont jamais importés.
5. **Council looped (4 boucles) : mécanisme générique OK, mais 1 seule boucle
   modélisée et 4-boucles jamais éprouvé.** Représentable en principe, non prouvé.
6. **Multi-LLM kaizen : dérive de nommage confirmée.** Le vrai `kaizen_autoloop`
   n'a PAS 6 rôles « qwen-coder… » — il délègue au council 3 rôles
   (`kaizen_autoloop.py:399-400,443-445`) puis exécute via Claude Code CLI
   (`kaizen_autoloop.py:533,550-551`). Les 6 rôles « cible » du builder sont une
   **vision**, pas le code réel.
7. **Micro-briques : toujours prospectif.** Les 6 champs LLM restent vides ("")
   dans les 5 fiches seed (`library/agent-code-001.json` etc.) ; je n'en ai rempli
   aucun depuis. Constat de `MICRO_BRICKS_AUDIT.md` inchangé.

---

## 1. Council gate v1 réel — `scripts/council.py` (IMP-198)

### 1.1 Exécution parallèle + timeout — **PARTIEL (trou toujours ouvert)**

Le Council réel lance ses 3 rôles **en parallèle** :

```py
opinions = tuple(await asyncio.gather(*[_call_role(r, adapters, task.brief, timeout) for r in roles]))
```
`council.py:516` — `asyncio.gather` = concurrence réelle. Timeout par rôle
`ROLE_TIMEOUT_S = 120` (`council.py:50`), fallback Qwen par rôle
(`ROLE_ROUTING`, `council.py:101-105`).

Le moteur du builder est **strictement séquentiel** : `runLoop` avance un unique
curseur `current` dans une boucle `while` (`engine.ts:120-155`), un nœud à la fois.
Il n'existe **aucune** primitive « fan-out / join » ni budget de temps par nœud.

Conséquence concrète : le sous-graphe `subgraphGateV1()` dessine les 3 voix comme
une **chaîne** `PLAN_REVIEW → RED_TEAM → DIVERGENCE` (`builder.html:517-520`,
edges `gv1`/`gv2`), ce qui est faux sémantiquement. Le builder l'assume via une
**note texte** :

> « RÉEL: les 3 voix tournent EN PARALLÈLE (timeout 120s, fallback Qwen). Moteur
> séquentiel → chaîne ici. » — `builder.html:340`

→ **Trou inchangé depuis la passe précédente.** La fidélité est documentée, pas
exécutable. Le timeout 120s et le fallback par rôle ne sont représentés nulle part
dans les données du graphe (ni champ nœud, ni edge).

### 1.2 Paramètres du nœud Council gate v1 — **FIDÈLE, aucune dérive**

Vérification croisée builder vs code réel :

| Rôle | Builder (`builder.html:187-189`) | council.py réel | Verdict |
|---|---|---|---|
| PLAN_REVIEW | `claude (proxy :8765)`, temp 0.2, top_p null, max_tokens null | Claude proxy local, temp 0.2 (`council.py:290`), pas de top_p/max_tokens | ✅ |
| RED_TEAM | `qwen2.5-14b (:1234)`, temp 0.2, top_p/max_tokens null | Qwen 14B, temp 0.2 (`council.py:290`) | ✅ |
| DIVERGENCE | `gemini-flash`, temp 0.4, top_p/max_tokens null | Gemini Flash, temp 0.4 (`council.py:331`) | ✅ |

Les params réels (temp 0.2/0.2/0.4, top_p/max_tokens **non paramétrés** = défauts
modèle) sont **fidèlement** reflétés. `withRole` supprime bien les clés null
(`builder.html:207-210`), donc le graphe sérialisé ne porte pas de faux top_p.
**Aucune dérive** depuis la dernière vérification.

**Verdict point 1 : PARTIEL** — params fidèles, mais parallélisme + timeout non
représentables (moteur séquentiel).

---

## 2. Council cible (looped, 6 rôles, 4 boucles)

### 2.1 Les 4 boucles — **PARTIEL**

Le mécanisme de boucle est générique et correct : `Edge.loop` + `maxIterations`
+ `condition` (`types.ts:16-33`), résolu par `resolveNextNode`
(`scheduler.ts:192-219`), `findStartNode` exclut les edges loop (`engine.ts:37`),
`validateGraph` distingue boucle intentionnelle vs cycle accidentel
(`scheduler.ts:159-168`). En principe, **N boucles** sont supportées (chaque edge
loop a son propre compteur, `loopCounts`, `engine.ts:99`).

**Mais** :
- **Une seule boucle est modélisée** : `l6 reviewer→coder condition:'NOK'`
  (`builder.html:539`). Les 4 boucles nommées du diagramme de référence
  (principale / rapide / critique / exploration) ne sont **pas** toutes câblées.
- **Limite structurelle non triviale** : un nœud lit **une seule** clé de décision
  (`decision` → `routeKey` → `intent`, `scheduler.ts:56-68`). Un nœud qui doit à la
  fois **boucler en arrière** ET **brancher en avant** conditionnellement doit être
  un `router` (`validateGraph:149-157` : seuls les routers ont >1 edge forward).
  Représentable, mais chaque point de rétroaction multi-sortie impose un router —
  jamais éprouvé sur une topologie à 4 boucles imbriquées.
- **Non testé à grande échelle** : `COUNCIL_BUILDER_PLAN.md:87-89` ne prévoit que
  des tests boucle-unique (NOK,NOK,OK / max-iterations / cycle rejeté). Aucun test
  4-boucles.

### 2.2 State écrasé / trace versionnée — **suffisant mais non éprouvé à l'échelle**

Le choix « state ÉCRASÉ (latest), trace VERSIONNÉE par `iteration` »
(`types.ts:73-79`, `engine.ts:countsFromTrace:91-103`) permet de suivre une boucle
de raffinement : chaque passe produit un `TraceStep` avec `iteration` 1,2,3…
C'est correct pour **une** boucle. Pour plusieurs boucles concurrentes partageant
des nœuds, la lisibilité de la trace (démêler quelle boucle a produit quelle
itération) n'a **pas** été vérifiée empiriquement dans cette passe.

**Verdict point 2 : PARTIEL** — moteur générique capable en théorie, mais 1 seule
boucle seedée, 4-boucles jamais construit ni testé.

---

## 3. CLAIM_MATRIX (SAFE_AUTO / AUDIT_REQUIRED / HUMAN_REQUIRED / FORBIDDEN)

### 3.1 Progrès depuis `LIBRARY_AUDIT.md` — gouvernance agent NOW présente

`LIBRARY_AUDIT.md` (§1.3, §2) constatait « champs gouvernance absents du modèle
nœud ». **Ce n'est plus vrai au niveau de la fiche Agent (library).** La brique
agent porte et édite désormais :

- `autonomy_level` (`builder.html:1514-1517`)
- `permissions` (JSON éditable : `can_merge`, `can_claim`, `can_write_files`…) —
  `builder.html:1518-1520`, seedées depuis l'agent_registry
  (`library/agent-code-001.json` : `can_merge:false`, `can_claim:false`)
- `allowed_surfaces` / `forbidden_surfaces` (`builder.html:1521-1526`)

C'est une **avancée réelle** vs l'audit initial.

### 3.2 Ce qui manque encore — **la taxonomie 4-lanes elle-même**

- Il n'existe **aucune** notion de lane SAFE_AUTO/AUDIT_REQUIRED/FORBIDDEN comme
  **étiquette de premier ordre** sur un nœud, une edge ou une action du canvas.
  `NodeType` (`types.ts:8`) = `llm|tool|agent|router|humangate` — pas de lane.
- Le seul endroit où « lane » apparaît est une **donnée d'entrée d'exemple** :
  `input: { imp: 'IMP-236', lane: 'AUDIT_REQUIRED' }` (`builder.html:348`) — c'est
  le payload run du Council, pas un attribut de nœud.
- **HUMAN_REQUIRED** est couvert : le nœud HumanGate met en pause avant exécution
  (`engine.ts:124`), résumé approve/reject (`engine.ts:210-283`).
- SAFE_AUTO vs AUDIT_REQUIRED vs FORBIDDEN sur un nœud quelconque : **pas
  représentable visuellement**. Les `permissions` agent en sont un cousin (elles
  encodent des interdits par agent) mais (a) c'est au grain **agent**, pas
  **action/IMP** ; (b) elles ne sont **jamais appliquées** par le moteur (aucun
  check runtime : `executor.ts` ne lit pas `permissions`).

**Verdict point 3 : PARTIEL** — gouvernance agent éditable (nouveau), HUMAN_REQUIRED
via HumanGate ; mais les 4 lanes comme label first-class + application runtime =
absents.

---

## 4. IMPROVEMENT_LEDGER / Roadmap réelle

### 4.1 `impRef` → vrai IMP ? — **NON, texte libre non connecté**

- Sur une entrée Wire Map, `impRef` est un simple `<input>` texte non validé
  (`builder.html:1918` : `updateEntry(e.id, { impRef: ev.target.value || null })`).
- La brique `roadmap` porte `payload {category, milestones}` + un `roadmapRef:null`
  **jamais édité en UI** (`builder.html:470-478`). Les jalons pointent vers un
  `goalRef` (brique Goal), pas vers un IMP.
- **Le serveur ne lit jamais `IMPROVEMENT_LEDGER.yaml`.** `seedLibraryIfEmpty`
  ne moissonne que `lab/agent_registry/*.json` (`demo-server.ts:74,107`). Grep
  `IMPROVEMENT_LEDGER|ledger` dans `demo-server.ts` → **0 résultat** hors seed
  agent. Les 217 IMP réels ne sont ni chargés, ni proposés, ni résolus.

→ On peut **taper** « IMP-236 » à la main, mais rien ne vérifie qu'il existe, ni
n'affiche son titre/statut/lane. C'est un champ de lien **mort**.

### 4.2 Importer la liste réelle des IMP en suggestions ? — **utile, effort modéré**

Oui, clairement utile (évite fautes de frappe, connecte le builder au vrai plan).
Le serveur a déjà un accès repo lecture-seule sûr (`/api/repo/file`, cité
`LIBRARY_AUDIT.md:1.6` → `demo-server.ts:266`) : une route
`GET /api/ledger` (parse YAML → `[{id,title,status,lane}]`) + un `<datalist>` sur
`impRef` (pattern déjà utilisé pour les catégories, `builder.html:1726`) suffirait.
**Passe UI/store + petite lecture serveur**, pas de changement moteur.

**Verdict point 4 : PARTIEL** — écriture texte libre possible, aucune connexion au
ledger réel.

---

## 5. Rocky — autorité Search > LLM

### 5.1 Contrainte d'autorité entre nœuds — **PAS REPRÉSENTABLE**

La doctrine Rocky : **Search a le dernier mot sur les coups, le LLM ne décide
jamais en temps réel.** C'est une relation d'**autorité/priorité** entre deux
composants.

Le graphe du builder ne modélise **aucune** hiérarchie d'autorité :
- `NodeType` (`types.ts:8`) traite tous les nœuds à égalité ; seuls `router`
  (branche) et `humangate` (pause humaine) ont un statut particulier.
- Il n'existe aucun champ « ce nœud override la sortie de tel autre » ni « ce nœud
  est consultatif / advisory ». Une edge exprime un **flux de données**
  (`Edge{from,to,condition,loop}`, `types.ts:16-33`), pas une **préséance**.
- On *pourrait* bricoler un `router` qui ignore l'entrée LLM et suit toujours le
  Search — mais c'est simuler un cas particulier, pas exprimer la **contrainte**
  « le LLM ne décide jamais ». La contrainte elle-même n'est ni déclarable ni
  vérifiable.

Pourquoi ce n'est pas corrigé ici (comme demandé) : ça exige une **nouvelle
sémantique moteur** (types de nœuds advisory vs authoritative, ou un champ
`authority` avec règle de résolution). C'est du niveau HumanGate (modif `src/`),
pas une passe UI. Hors périmètre de cet audit.

**Verdict point 5 : NON** — confirmé, non représentable, cause documentée.

---

## 6. Multi-LLM Council (kaizen_autoloop)

### 6.1 Rôles réels vs builder — **DÉRIVE confirmée**

Le vrai `kaizen_autoloop.py` **ne définit pas** 6 rôles nommés
(planner/redteam/explorer/coder/tester/reviewer). Il :
1. **délègue PLAN/REVUE au council.py** — les mêmes 3 rôles
   (Claude proxy / Qwen 14B / Gemini), `kaizen_autoloop.py:399-400` +
   `443-445` (`ClaudeProxyAdapter`/`QwenAdapter`/`GeminiAdapter`) ;
2. **exécute l'IMP via Claude Code CLI** en subprocess
   (`kaizen_autoloop.py:533`, `550-551` : `npx @anthropic-ai/claude-code --print`).

Donc le pipeline réel = **Council (3 voix) + un exécuteur Claude Code**. Il n'y a
**pas** de rôle « Qwen-Coder » dans le code réel. Le groupe « cible (table) » du
builder (`qwen-coder`, `tester`, `gemini-explorer`…, `builder.html:191-196`) est
une **architecture-cible idéalisée**, pas ce que `kaizen_autoloop` exécute.

Le builder est **honnête** à ce sujet : il étiquette ces rôles « cible (table) »
vs « v1 réel (council.py) » (`builder.html:186,190`, badges RÉEL/CIBLE
`builder.html:2361-2362`). Mais si l'objectif est « représenter TCS réel », le
pipeline kaizen réel (council + subprocess Claude Code) n'a **pas** d'exemple
dédié — il faudrait un sous-graphe `Council gate v1 → nœud tool "Claude Code CLI"`.

**Verdict point 6 : DÉRIVE de nommage entre « cible » builder et code réel** — la
partie *réelle* (council 3 rôles) est fidèle ; la partie *exécuteur* du vrai
kaizen n'est pas modélisée en exemple.

---

## 7. Micro-briques (mémoire/skill/plugin/rôle/objectif/garde-fou/modèle)

### 7.1 Toujours vides ? — **OUI, constat inchangé**

Vérifié de première main : `library/agent-code-001.json` (et les 4 autres seeds)
ont les 6 champs LLM à `""` :
```json
"memoire": "", "skill": "", "plugin": "", "objectif": "", "gardeFou": "", "modele": "",
"temperature": null, "top_p": null, "max_tokens": null
```
`role` = le slug (`"code"`), pas une valeur descriptive.

**Je (Claude Code) n'ai rempli aucun de ces champs depuis `MICRO_BRICKS_AUDIT.md`.**
Le dossier `library/` ne contient que les 5 fiches seed + **une** brique chain
(`chain-mr3b0jxw.json`, `kind:"chain"`, un graphe test avec un nœud `qwen-coder` —
donc des *params* remplis via `withRole`, mais **aucun** des 7 champs micro-brique).
Aucune fiche agent utilisateur, aucune brique `fragment`.

→ La répétition reste **théorique** (prouvée seulement par `ROLE_PRESETS`,
`MICRO_BRICKS_AUDIT.md §1.2`), pas empirique. Rien n'a changé le constat.

**Verdict point 7 : besoin réel TOUJOURS non observé — prospectif.**

---

## 8. Trous priorisés (du plus au moins bloquant)

| # | Trou | Bloque quoi | Passe estimée |
|---|---|---|---|
| **1** | **Autorité Search > LLM (Rocky) non exprimable** | Impossible de dessiner fidèlement la doctrine centrale du moteur de jeu : qui a le dernier mot. Aucun contournement propre. | **MOTEUR** (`src/` : nouvelle sémantique nœud advisory/authoritative) — gros, niveau HumanGate |
| **2** | **Council parallèle + timeout 120s non exécutable** | La forme réelle du gate v1 (3 voix concurrentes, budget temps, fallback par rôle) n'est qu'une note. Toute représentation « fidèle » d'un council reste un mensonge séquentiel. | **MOTEUR** (`src/` : primitive fan-out/join + timeout par nœud) — moyen/gros |
| **3** | **CLAIM_MATRIX : 4 lanes pas first-class + non appliquées** | On ne peut pas taguer un nœud/action SAFE_AUTO vs AUDIT_REQUIRED vs FORBIDDEN. La gouvernance agent existe mais n'est jamais enforced. | **MIXTE** : label lane = UI/store ; enforcement runtime = petit moteur (`executor.ts` lit permissions/lane) |
| **4** | **`impRef` non connecté au vrai ledger** | La roadmap dessinée ne pointe vers rien de réel ; 217 IMP invisibles. | **UI/store** + petite route serveur (lecture YAML) — petit |
| **5** | **Council looped 4-boucles jamais construit/testé** | La cible « 4 boucles » n'est pas prouvée ; risque de limites pratiques (router obligatoire par point multi-sortie). | **UI/store** (seed les 4 boucles) + **tests** — petit/moyen |
| **6** | **Exécuteur kaizen réel (Claude Code CLI) sans exemple** | Le vrai pipeline kaizen (council + subprocess) n'a pas de sous-graphe. | **UI/store** (nouvel exemple `Council → tool Claude Code`) — petit |
| **7** | **Micro-briques (fragments) — champs vides** | Cosmétique/prospectif : aucune donnée réelle à dédupliquer aujourd'hui. | **UI/store** si un jour justifié — mineur |

---

## 9. Verdict honnête

**Non — le builder ne peut PAS représenter tout TCS aujourd'hui. Il reste
structurellement incomplet sur au moins deux points majeurs, tous deux « moteur »,
pas « UI ».**

1. **La doctrine d'autorité de Rocky (Search > LLM) est inexprimable** — le graphe
   n'a pas la notion de préséance entre nœuds. C'est le trou le plus fondamental :
   le cœur du produit (le moteur de jeu) ne peut pas être dessiné fidèlement.
2. **Le parallélisme du Council réel est inexécutable** — le moteur séquentiel
   force à dessiner en chaîne ce qui tourne en concurrence + timeout. La fidélité
   n'est atteinte que par une note en langage naturel.

Tout le reste (lanes, ledger, boucles cible, exemple kaizen, fragments) est
**représentable ou rattrapable par des passes UI/store légères** — ce sont des
manques de couverture, pas des impossibilités structurelles. Deux d'entre eux ont
même **progressé** depuis les audits précédents (gouvernance agent éditable ;
HumanGate couvre HUMAN_REQUIRED).

En clair : le builder est un bon **éditeur de pipelines LLM séquentiels avec gate
humain**. Il n'est pas (encore) un miroir fidèle de TCS tant qu'il ne sait pas
exprimer (a) la **concurrence** et (b) l'**autorité entre composants** — les deux
propriétés qui définissent respectivement le Council réel et le moteur Rocky.

---

```
═══════════════════════════════════════════
Audit de complétude — Rapport
═══════════════════════════════════════════

1. Council gate v1 (réel)       : PARTIEL — params fidèles (temp 0.2/0.2/0.4,
                                   top_p/max_tokens absents), MAIS parallèle +
                                   timeout 120s non exécutables (moteur séquentiel)
2. Council looped (cible)        : PARTIEL — mécanisme N-boucles générique OK en
                                   théorie, mais 1 seule boucle seedée, 4-boucles
                                   jamais construit ni testé
3. CLAIM_MATRIX (lanes)          : PARTIEL — gouvernance agent éditable (NOUVEAU) +
                                   HUMAN_REQUIRED via HumanGate ; mais 4 lanes pas
                                   first-class sur un nœud, aucun enforcement runtime
4. IMPROVEMENT_LEDGER / Roadmap  : PARTIEL — impRef = texte libre ; serveur ne lit
                                   JAMAIS le ledger (seed agent_registry seul)
5. Rocky (autorité Search>LLM)   : NON — aucune notion de préséance entre nœuds ;
                                   exige un changement moteur
6. Multi-LLM Council (kaizen)    : PARTIEL/DÉRIVE — réel = council 3 rôles + Claude
                                   Code CLI ; les 6 rôles « cible » sont vision, pas
                                   code ; exécuteur réel sans exemple
7. Micro-briques                 : TOUJOURS PROSPECTIF — 6 champs LLM vides partout,
                                   aucune donnée remplie depuis MICRO_BRICKS_AUDIT

Trous priorisés (du plus au moins bloquant) :
1. Autorité Search > LLM inexprimable            — passe MOTEUR (gros)
2. Council parallèle + timeout non exécutable    — passe MOTEUR (moyen/gros)
3. CLAIM_MATRIX 4 lanes non first-class/enforced — passe MIXTE (UI + petit moteur)
4. impRef non connecté au vrai ledger            — passe UI/store (petit)
5. Council looped 4-boucles non construit/testé  — passe UI/store + tests (petit/moyen)
6. Exemple exécuteur kaizen (Claude Code CLI)    — passe UI/store (petit)
7. Micro-briques fragments (champs vides)        — passe UI/store (mineur)

Verdict honnête : le builder ne peut PAS représenter tout TCS aujourd'hui.
Il reste structurellement incomplet sur deux points MOTEUR : la concurrence
(Council réel parallèle) et l'autorité entre composants (Rocky Search > LLM).
Tout le reste est rattrapable par des passes UI/store légères.

software_verdict: OK (audit produit)
evidence_verdict: MECHANICAL_VALIDATION_ONLY — citations vérifiées de première main
                   (council.py, engine.ts, scheduler.ts, types.ts, builder.html,
                   library/*.json, kaizen_autoloop.py). NON vérifié empiriquement :
                   comportement d'une topologie à 4 boucles (point 2), lisibilité
                   de la trace multi-boucles — raisonnement code seul, pas d'exécution.
claim_verdict: NO_CLAIM_ALLOWED

Points bloquants : AUCUN pour cette passe (audit, pas implémentation)
═══════════════════════════════════════════
```

*Fin de l'audit — aucune modification de code effectuée hors ce fichier.*
