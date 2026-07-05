# Brique 3a — Graphe mémoire (vault) dans le builder

- **Date** : 2026-07-05
- **Source** : brainstorming session Claude Code (Pierre + assistant), décisions + 3 amendements ratifiés en séance.
- **Statut** : design validé — en attente relecture Pierre avant plan d'implémentation.
- **Brique** : `3a` du chantier « TCS AI-OS » (la brique 3 s'est scindée en 3a mémoire / 3b codebase). Dépend de `0` (CT-4) et `2` (recall) — FAITES.

---

## 1. Contexte & but

Rendre la mémoire navigable comme un **graphe « cerveau »** façon Obsidian : nœuds = notes des
2 racines, arêtes = `[[wikilinks]]`, dans la seule interface (llm-lego), live depuis les fichiers.

**But** : une vue graphe force-directed dans la modale Mémoire, où l'on voit les liens qu'on a
explicitement tracés entre notes, et où un clic ouvre la note.

---

## 2. Décisions ratifiées (Pierre)

| # | Décision | Choix |
|---|---|---|
| D1 | Arêtes | **Wikilinks seuls** (tags = couleur des nœuds). |
| D2 | Rendu | **Force-directed SVG maison** (aucune lib externe), **converge-puis-fige**. |
| D3 | Emplacement | **Toggle `liste \| graphe`** dans la modale Mémoire (panneau détail partagé). |

**Amendements ratifiés :**
- **A1 [fondation] : memory-store devient RÉCURSIF.** `listNotes`/`readNote` descendent dans les
  sous-dossiers des 2 racines. Graphe, `search?mode=keyword` et `mode=semantic` voient **exactement
  les mêmes notes**. ids = `"root/relpath-sans-.md"` **partout**.
- **A2 : résolution wikilink déterministe.** Match relpath exact (même racine) → sinon basename ; si
  **>1** note partage le basename → **AMBIGU** (droppé, compté `ambiguous`) ; si 0 → `dropped`.
- **A3 : hygiène des arêtes.** Self-link (`[[soi-même]]`) droppé ; liens dupliqués (A→B ×2)
  **dédupliqués** en une seule arête ; `degree` reflète les arêtes dédupliquées.

---

## 3. Architecture

### 3.1 [A1] memory-store récursif (modif brique 0)

`llm-lego/memory-store.mjs` :
- `listNotes(roots)` : **parcours récursif** de chaque racine (skip dot-dirs/dot-files `.*` **et le
  dossier d'archive `journal/`** — cf. décision Q1, unique point d'exclusion `EXCLUDE_DIRS = ['journal']`). Pour
  chaque `.md` à `relpath` (séparateurs `/`, relatif à la racine) → note `{root, id, relpath, title,
  tags, type, mtimeMs}` avec **`id = relpath sans .md`** (ex. `doctrine/studio-doctrine`). Racine plate
  (`memory/`) → ids inchangés (`relpath == basename`).
- `readNote(roots, root, id)` : `id` = relpath (peut contenir `/`). **Anti-traversée** : découper `id`
  en segments ; rejeter si un segment est `""`, `"."` ou `".."` (400) ; résoudre `rootDir/…/segments.md`
  et exiger `startsWith(rootDir + sep)`.
- `writeNote` : inchangé côté règles (`brain` lecture seule 403) ; validation relpath idem `readNote`.

**Conséquences (spécifiées) :**
- **`/api/memory` (CT-4)** : renvoie désormais aussi les notes en sous-dossiers de `brain`. Le
  routing `:root/:id` (regex `([A-Za-z]+)/(.+)`) capture déjà les `/` de l'id ; le front encode l'id
  (`encodeURIComponent`) → OK.
- **`.memory-index.json` (brique 2)** : cache **jetable**. Les clés des notes plates sont **stables**
  (`root/basename` inchangé) ; les notes de sous-dossier s'**ajoutent** au prochain build incrémental.
  En cas de doute, supprimer le fichier force un rebuild propre — **aucune migration**.
- **Vue Mémoire (`open`/`sel`)** : fonctionne avec les nouveaux ids (l'id vient de `/api/memory`,
  jamais reconstruit à la main).
- **Recherche** : `keyword` et `semantic` retrouvent maintenant les notes en sous-dossiers (nouveau test).

### 3.2 Nouveau module `llm-lego/memory-graph.mjs`

`buildGraph(roots) → { nodes, edges, dropped, ambiguous }` :
1. `listNotes(roots)` (récursif) → pour chaque note, `readNote` → `{key: "root/id", title, root, tags, wikilinks}`.
   `nodeKeys` = Set des clés ; `basenameIndex` = Map basename → [clés].
2. **Résolution [A2]** `resolveWikilink(w, srcRoot)` : `clean = w.replace(/\.md$/i,'').replace(/^\.\//,'')` ;
   (a) clé relpath même racine `${srcRoot}/${clean sans ../}` ∈ nodeKeys → résolu ; (b) sinon
   basename = dernier segment → `basenameIndex` : 1 match → résolu ; **>1 → ambiguous** ; 0 → dropped.
3. **Hygiène [A3]** : `target === source` → skip (self-link) ; arêtes dans un Set `"src|tgt"` → dédup.
4. `degree[key]` = nb d'arêtes (dédupliquées) touchant la note.
5. Retour : `nodes: [{id, root, title, tags, degree}]`, `edges: [{source, target}]`, `dropped: N`,
   `ambiguous: N`.

### 3.3 Endpoint `GET /api/memory/graph` (demo-server.ts)

`try { sendJson(200, buildGraph(MEM_ROOTS)) } catch { sendJson(500, {error}) }`. Lecture seule.

### 3.4 Rendu — composant `MemoryGraph` (SVG force-directed maison)

- **Sim** (~70 lignes) : positions init sur un cercle ; ~150 itérations de {répulsion O(n²) entre tous
  les nœuds, attraction le long des arêtes, léger recentrage} ; puis **fige** (pas de rAF perpétuel).
- **Rendu SVG** : arêtes = `<line>` ; nœuds = `<circle>` **coloré par racine+1ᵉʳ tag**, `r ∝ degree` ;
  labels au survol/zoom. **Nœuds déplaçables** (drag met à jour la position, pas de re-sim). **Pan/zoom
  molette**. État vide (« aucun lien ») géré.
- **Clic nœud → `open(node)`** (réutilise la logique `sel` de la vue Mémoire).

### 3.5 UX — toggle dans la modale Mémoire

Bouton **`liste | graphe`** en haut. Mode `liste` = actuel (`300px liste | détail`). Mode `graphe` =
`graphe (grande zone) | détail` — clic nœud remplit le panneau détail à droite (`sel` partagé). Aucune
nouvelle modale. Le mode `semantic`/recall reste dans le mode liste.

---

## 4. Garde-fous

- **Lecture seule** partout (graphe n'écrit rien).
- **Anti-traversée** (A1) : relpath validé segment par segment, jamais `..`, résolu sous la racine.
- **Résolution déterministe** (A2) : jamais de choix arbitraire sur collision → `ambiguous`.
- **Hygiène** (A3) : pas de self-loop, pas d'arête dupliquée.
- **Aucune lib externe** ; sim bornée (O(n²) trivial <200 nœuds).
- **`src/` (Rust) / `llm-lego/src/`** intacts. Modifs : `memory-store.mjs` (récursif), `demo-server.ts`
  (route graph), `builder.html` (toggle+MemoryGraph) ; nouveaux `memory-graph.mjs`, tests, validateur.

---

## 5. Preuve (evidence — CLAUDE.md)

**Unit `memory-store` récursif** :
- note en **sous-dossier** listée par `listNotes` (id = `sub/x`) ; lue par `readNote(root,"sub/x")`.
- `readNote` refuse `"../secret"` et `"a/../../b"` (400).
- **exclusion archive (Q1/Option B)** : une note sous `journal/…` est **absente** de `listNotes` (donc
  du graphe ET de la recherche) — un seul point d'exclusion.

**Unit recherche (récursif)** :
- `searchNotes` (keyword) trouve une note en sous-dossier ; `recall` (embed mocké) idem.
- **incrémental (A1)** : ajouter une note en sous-dossier ne **ré-embeddée PAS** les notes racine
  inchangées (clé `root/basename` stable → pas de ré-embed) ; seule la nouvelle note est embeddée.

**Unit `memory-graph`** :
- arête créée depuis un `[[lien]]` résolu ; `degree` correct.
- **collision basename** (2 notes même basename, lien par basename) → `ambiguous` +1, pas d'arête.
- **self-link** (`[[soi]]`) → aucune arête.
- **lien dupliqué** (A cite B deux fois) → **une seule** arête.
- wikilink introuvable → `dropped` +1.

**Validateur** : `/api/memory/graph` renvoie `{nodes,edges,dropped,ambiguous}` cohérent (serveur+racines
temp avec un sous-dossier + un lien). `memory-graph-validate.mjs`.

**UI (DOM)** : toggle `graphe` → SVG avec N `<circle>` + arêtes ; clic nœud → note ouverte (`sel`). Capture.

**Non-régression** : `run-validators` + `vitest` verts ; CT-4 (`/api/memory`, garde-fous) et brique 2
(`search` keyword/semantic) **toujours OK** avec ids relpath.

Verdicts : `software_verdict: OK` · `evidence_verdict: INCLUDES_UX_VALIDATION` · `claim_verdict: NO_CLAIM_ALLOWED`.

---

## 6. Hors périmètre 3a

- **3b** (graphe codebase Graphify). Arêtes tags/sémantiques, tags-comme-nœuds, édition depuis le graphe.
- Layout persistant (positions non sauvegardées — recalculées à l'ouverture).

---

## 7. Découpage en unités (pour le plan)

| Unité | Fait quoi | Dépend de | Prouvable seule |
|---|---|---|---|
| U1 — memory-store récursif | listNotes/readNote descendent, id=relpath, anti-traversée | — | oui (temp roots + sous-dossier) |
| U2 — non-régression recherche | keyword+semantic voient les sous-dossiers | U1 | oui (unit) |
| U3 — `memory-graph.mjs` | buildGraph : résolution A2 + hygiène A3 + degree | U1 | oui (unit) |
| U4 — endpoint `/api/memory/graph` | greffe HTTP | U3 | oui (curl/validateur) |
| U5 — `MemoryGraph` + toggle | rendu force-directed + liste↔graphe | U4 | oui (DOM) |
| U6 — validateur + non-régression | memory-graph-validate + run-validators + vitest | U4 | oui |

Ordre : U1 → U2 → U3 → U4 → U5 → U6.

---

## 8. Questions ouvertes (défauts proposés)

- **Q1 [DÉCIDÉ — Option B]** : les notes **archivées** (`studio_brain/journal/`) sont **EXCLUES partout**
  (graphe + recherche keyword + semantic), via un **unique point d'exclusion** dans `memory-store`
  (`EXCLUDE_DIRS = ['journal']`), testé unit. Raison : ce sont les référents morts retirés à la
  réconciliation CT-4 — les inclure resurgirait du bruit périmé dans la vue unique (A1).
- **Q2 [validé]** : basename cherché **dans les 2 racines** ; un basename présent à la fois dans `brain`
  ET `facts` compte comme **ambiguous** (A2 s'applique globalement).
- **Q3 [validé]** : labels au survol + zoom (évite l'encombrement).
