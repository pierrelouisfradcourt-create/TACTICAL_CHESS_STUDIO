# Brique 2 — Recall sémantique sur la mémoire (embeddings LM Studio)

- **Date** : 2026-07-05
- **Source** : brainstorming session Claude Code (Pierre + assistant), décisions ratifiées en séance.
- **Statut** : design validé — en attente relecture Pierre avant plan d'implémentation.
- **Brique** : `2` du chantier « TCS AI-OS ». Dépend de la brique `0` (CT-4, couche mémoire) — **FAITE**.

---

## 1. Contexte & but

CT-4 a posé la couche mémoire (2 racines markdown + face HTTP `/api/memory` + vue « Mémoire »
dans llm-lego). La recherche actuelle est **mot-clé** (sous-chaîne) : `elo` matche « bELOte ».
La brique 2 ajoute le **recall sémantique** — retrouver par le *sens*, pas la sous-chaîne — qui
est le vrai apport « Jarvis » que TCS n'avait pas.

**But** : sur une requête, classer les ~40 notes des 2 racines par proximité sémantique via des
**embeddings locaux** (LM Studio nomic-embed), **sans jamais casser** l'accès mémoire si le modèle
d'embedding n'est pas chargé (dégradation vers le mot-clé).

### Réalité constatée (2026-07-05)
- LM Studio (:1234) tourne ; `text-embedding-nomic-embed-text-v1.5` est **téléchargé** mais **pas
  chargé** (`/v1/embeddings` → « No models loaded »). Il faudra le charger dans LM Studio.
- L'adaptateur `lmstudio` de llm-lego ne fait pas encore d'embeddings.
- Volume : ~40 notes courtes → indexer/chercher est trivial en coût.

---

## 2. Décisions ratifiées (Pierre, en séance)

| # | Décision | Choix |
|---|---|---|
| D1 | Source des embeddings | **LM Studio `nomic-embed`** (local, déjà téléchargé, zéro dép npm). |
| D2 | Approche | **1 — « Recall greffé, fail-soft »** : module + cache incrémental + `search?mode=semantic`, retombe sur mot-clé si indispo. |

**Principe directeur** : le recall est un **bonus opt-in** greffé sur CT-4 ; il **dégrade proprement**
(jamais d'erreur bloquante), et reste **100 % local** (CLAUDE.md : jamais d'API externe).

---

## 3. Architecture

### 3.1 Nouveau module `llm-lego/memory-recall.mjs` (pur, embed injectable)

Réutilise `listNotes`/`readNote` de `memory-store.mjs`. **L'embedder est injecté** (paramètre
`embed`) → testable sans LM Studio.

- `lmStudioEmbed(texts, { url, model }) → Promise<number[][]>`
  Appelle `POST {url}/v1/embeddings` (`{ model, input: texts }`), renvoie les vecteurs.
  Jette une erreur (`.code = "EMBED_UNAVAILABLE"`) si LM Studio injoignable **ou** « No models loaded »
  **ou** dimension incohérente **ou** **timeout ~10 s** (`AbortController` — couvre « LM Studio figé /
  modèle en cours de chargement », que port-mort et no-models-loaded ne couvrent pas).
- `cosine(a, b) → number` — similarité cosinus [−1,1].
- `buildOrUpdateIndex(roots, { embed, indexPath, model }) → Promise<Index>`
  **Lazy incrémental** : charge le cache ; ré-embeddée uniquement les notes **nouvelles ou dont
  `mtimeMs` a changé** ; retire les notes disparues ; **rebuild complet** si `index.model` ≠ `model`
  **ou** `index.prefixes` ≠ version courante. **Persistance atomique** : écrit `indexPath + ".tmp"` puis
  `rename`, **uniquement en fin de build réussi** — jamais d'index partiel.
- `recall(roots, query, { embed, indexPath, model, k = 8, rootFilter = "all" }) → Promise<{ model, hits }>`
  Assure l'index (buildOrUpdateIndex) ; embeddée la requête ; cosinus vs chaque entrée ;
  top-`k` filtré par `rootFilter`. `hits: {root,id,title,snippet,score}[]` — `score` = cosinus arrondi
  à 3 décimales ; `snippet` = **début du corps (~120 car.)** (pas de position de match en sémantique).

**Préfixes de tâche nomic-embed-v1.5 (OBLIGATOIRES — sinon retrieval dégradé)** : texte note embeddé
= `"search_document: " + title + "\n" + body` (tronqué à **4000** car. — fr ≈ 3 car./token, marge sous
les 2048 tokens) ; requête embeddée = `"search_query: " + query`. Convention **versionnée** (`prefixes: "v1"`)
→ **rebuild complet** si elle change.

### 3.2 Format de l'index — `llm-lego/.memory-index.json` (gitignoré)

```json
{
  "model": "text-embedding-nomic-embed-text-v1.5",
  "prefixes": "v1",
  "dim": 768,
  "builtAt": 1783000000000,
  "entries": {
    "brain/000_HOME": { "mtimeMs": 1783000000000, "vector": [0.01, -0.02, "… 768 floats"] },
    "facts/project_overview": { "mtimeMs": 1783000000000, "vector": ["…"] }
  }
}
```
Clé = `${root}/${id}`. Le fichier est un **cache jetable** (reconstructible depuis les notes) → gitignoré.

### 3.3 Face HTTP — extension de `/api/memory/search` (demo-server.ts)

`GET /api/memory/search?q=<terme>&root=<brain|facts|all>&mode=<keyword|semantic>&k=<n>`
- `mode` **défaut `keyword`** → comportement CT-4 inchangé (rétro-compat totale).
- `mode=semantic` → appelle `recall(...)`. **Fail-soft** : si `EMBED_UNAVAILABLE`, exécute la
  recherche mot-clé et renvoie `mode:"keyword-fallback"` + `degraded`.

Réponse :
```json
{ "q": "réglage difficulté", "mode": "semantic", "hits": [
  { "root": "facts", "id": "imp234_depth_not_root_cause", "title": "…", "snippet": "…", "score": 0.71 } ] }
```
Réponse dégradée :
```json
{ "q": "…", "mode": "keyword-fallback", "degraded": { "reason": "No models loaded" }, "hits": [ … ] }
```

Config serveur (env, valeurs par défaut) : `TCS_EMBED_URL=http://localhost:1234`,
`TCS_EMBED_MODEL=text-embedding-nomic-embed-text-v1.5`, index sous `__dirname/.memory-index.json`.

### 3.4 UX — vue « Mémoire » (builder.html)

La barre de la modale Mémoire gagne un **toggle `mot-clé | sémantique`** + champ requête.
- Requête vide → liste groupée par racine (comportement CT-4).
- Requête + `sémantique` → appelle `search?mode=semantic` → **liste classée par score** (badge score),
  clic ouvre la note (inchangé).
- Bandeau discret **« ⚠ mode mot-clé — embeddings indispo »** si `mode:"keyword-fallback"`.

**Lecture seule** (comme CT-4). Le graphe (brique 3) et l'interface pro complète (brique 4) restent hors scope.

---

## 4. Garde-fous

- **Fail-soft absolu** : aucune indisponibilité d'embedding (LM Studio down, modèle non chargé,
  dimension incohérente, **timeout ~10 s**) ne doit renvoyer une erreur au client — toujours mot-clé.
- **100 % local** : embeddings via LM Studio :1234 uniquement. Aucune API externe.
- **Index jetable** : `.memory-index.json` gitignoré, reconstructible ; jamais une source de vérité.
  **Écriture atomique** (`.tmp` + `rename`, jamais d'index partiel sur disque).
- **Écriture** : le recall est **lecture seule** sur les notes ; il n'écrit que le cache d'index.
- **`src/` (Rust) et `llm-lego/src/` (TS)** intacts. Modifs : `demo-server.ts`, `builder.html`,
  nouveaux `memory-recall.mjs` + tests + validateur + `.gitignore`.

---

## 5. Preuve (evidence — CLAUDE.md)

1. **Unit `memory-recall.mjs` (embed MOCKÉ, sans LM Studio)** :
   - `cosine` : vecteurs identiques → 1 ; orthogonaux → 0.
   - `buildOrUpdateIndex` incrémental : note modifiée → ré-embeddée ; note supprimée → retirée ;
     note inchangée → vecteur conservé (pas de ré-embed) ; `model` différent → rebuild complet.
   - `recall` : classe par similarité (la note dont le vecteur mock est le plus proche sort 1ère).
2. **Fail-soft (déterministe, sans LM Studio)** : `search?mode=semantic` avec `TCS_EMBED_URL`
   pointé sur un port mort → réponse `mode:"keyword-fallback"` + `degraded`, `hits` non vides. Testé
   par `memory-recall-validate.mjs` (serveur + racines temp, comme CT-4).
3. **Semantic réel (E2E, LM Studio + nomic-embed chargé)** : requête paraphrasée (ex. « réglage de
   difficulté » vs une note parlant d'`adaptive_depth`) remonte la bonne note en top-k, là où le
   mot-clé échoue. Gaté derrière un flag env (comme `LEGO_RUN_QWEN`) → **non exécuté** dans la
   régression par défaut ; prouvé manuellement + capture.
4. **UX** : toggle sémantique dans la vue Mémoire, résultats classés (preuve DOM/Playwright).
5. **Non-régression** : `run-validators.mjs` (incl. `memory-recall-validate` fail-soft) reste vert ;
   `vitest` reste vert. `search?mode=keyword` (défaut) **identique** à CT-4.

Verdicts attendus : `software_verdict: OK` · `evidence_verdict: INCLUDES_UX_VALIDATION` ·
`claim_verdict: NO_CLAIM_ALLOWED`.

---

## 6. Hors périmètre brique 2

- Chunking des notes (whole-note suffit à ~40 notes courtes — YAGNI).
- Reindex manuel/bouton (le lazy incrémental + rebuild-sur-changement-de-modèle couvrent tout).
- Graphe (brique 3), interface pro complète (brique 4), capture vocale (brique 5).
- Embeddings d'autres sources que la mémoire (code, docs) — plus tard.

---

## 7. Découpage en unités (pour le plan)

| Unité | Fait quoi | Dépend de | Prouvable seule |
|---|---|---|---|
| U1 — `cosine` + `buildOrUpdateIndex` (embed injecté) | index incrémental + persistance | memory-store | oui (embed mock) |
| U2 — `recall` (embed injecté) | requête → top-k cosinus | U1 | oui (embed mock) |
| U3 — `lmStudioEmbed` | appel réel `/v1/embeddings` + erreurs typées | — | oui (fail-soft testable port mort) |
| U4 — route `search?mode=semantic` + fail-soft | greffe HTTP dans demo-server | U2,U3 | oui (curl / validateur) |
| U5 — toggle sémantique vue Mémoire | UX classée + bandeau dégradé | U4 | oui (DOM) |
| U6 — `memory-recall-validate.mjs` + `.gitignore` | preuve fail-soft + non-régression | U4 | oui |

Ordre : U1 → U2 → U3 → U4 → (U5 ∥ U6).

---

## 8. Questions ouvertes (à trancher au plan, non bloquantes)

- **Q1** : `k` par défaut (top-N renvoyé) ? — défaut proposé : **8**.
- **Q2** : seuil de similarité minimal pour afficher un hit ? — défaut : **aucun** (on renvoie top-k
  bruts ; filtrer par seuil risque de masquer des résultats sur un petit corpus).
- **Q3** : flag d'activation du test E2E réel ? — défaut : `TCS_RUN_EMBED=1` (miroir de `LEGO_RUN_QWEN`).
