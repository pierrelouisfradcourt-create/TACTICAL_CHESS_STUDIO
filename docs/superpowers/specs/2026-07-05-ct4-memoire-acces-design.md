# CT-4 — Couche d'accès mémoire (réconciliation + faces MCP/HTTP)

- **Date** : 2026-07-05
- **Source** : brainstorming session Claude Code (Pierre + assistant), décisions ratifiées par Pierre en séance.
- **Statut** : design validé — en attente relecture Pierre avant plan d'implémentation.
- **Brique** : `0` (fondation) du chantier « TCS AI-OS ». Débloque les briques 1-5.

---

## 1. Contexte & but

Pierre veut intégrer les patterns « build your own Jarvis » (mémoire-vault, lanes,
recall, gates) dans TCS et livrer une **interface pro**. La décomposition retenue :

```
0. CT-4 — Réconciliation mémoire  (CE SPEC)
1. Pont Obsidian + MCP            (dépend de 0)
2. Recall sémantique             (dépend de 0)
3. Graphify live                 (dépend de 0)
4. Interface pro = llm-lego      (intègre 0-3)
(5. Capture vocale — plus tard, YAGNI)
```

Pierre a **levé le gel** (Phases 2/3 étaient gelées jusqu'à CT-4 par l'audit ROI) et
choisi d'**attaquer par la fondation CT-4**. Ce spec ne couvre **que CT-4**.

**But de CT-4** : faire qu'une **seule mémoire cohérente** soit accessible à tous les
consommateurs (agents du studio, Claude Desktop, Claude Code, interface llm-lego),
**sans** casser le mécanisme auto-mémoire du harness ni réécrire les notes humaines.

### Ce qui est DÉJÀ fait (ne pas refaire)
- **Rôles réconciliés (2026-07-03)** : `reference/sources-of-truth.md` formalise 3 référents
  canoniques ; `AI_MEMORY/`, `STUDIO_CONTEXT_LIVE.md`, `COWORK_CONTEXT.md` archivés dans
  `studio_brain/journal/archived-memory-referents-2026-07-03/`.
- **Recette MCP écrite** : `studio_brain/meta/mcp-setup.md` (IMP-178) — MCP filesystem +
  option Obsidian REST. Rien n'est branché encore.

### Le vrai reste de CT-4
La mémoire **machine** (`memory/`) vit **hors du vault**, à un chemin **imposé par le
harness** (`C:\Users\<utilisateur>\.claude\projects\C--TACTICAL-CHESS-STUDIO\memory\`). Un
Obsidian/MCP branché sur `studio_brain/` seul ne la verrait pas. → fracture à combler.

---

## 2. Décisions ratifiées (Pierre, en séance)

| # | Décision | Choix retenu |
|---|---|---|
| D1 | Séquençage | Lever le gel, câbler pour de vrai ; **attaquer par CT-4**. |
| D2 | Topologie mémoire | **Deux racines, MCP sur les deux** (pas de fusion, respecte le harness). |
| D3 | Consommateurs | **Les quatre** : agents studio, Claude Desktop, Claude Code, interface. |
| D4 | Approche d'accès | **A — « Mêmes fichiers, deux faces »** (unifier au niveau *données*, pas *protocole*). |
| D5 | Interface | **llm-lego uniquement.** Pas de nouveau cockpit. → face HTTP dans `demo-server.ts`. |

**Principe directeur** : une donnée (les fichiers markdown), plusieurs visages (MCP + HTTP).
**Source de vérité = les fichiers.** Zéro sync, zéro duplication.

---

## 3. Architecture

### 3.1 Données — source de vérité (inchangée, aucune migration)

| Racine (slug) | Chemin | Rôle | Format |
|---|---|---|---|
| `brain` | `studio_brain/` (repo) | Vault humain (doctrine, décisions, vision, handoff) | Obsidian : MOC `000_HOME`, `#tags`, `[[wikilinks]]`, prose |
| `facts` | `…\.claude\projects\C--TACTICAL-CHESS-STUDIO\memory\` (profil, hors repo) | Faits durables machine, auto-chargés au boot | frontmatter `name/description/metadata.type` + corps |

Les deux faces (§3.2, §3.3) opèrent sur **ces mêmes fichiers**.

### 3.2 Face MCP — pour Claude Desktop + Claude Code

`@modelcontextprotocol/server-filesystem` (off-the-shelf), **une entrée par racine**.

- **Claude Desktop** → `%APPDATA%\Claude\claude_desktop_config.json`, **fusionner** dans
  `mcpServers` sans écraser l'existant :

  ```json
  {
    "mcpServers": {
      "tcs-brain": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\TACTICAL_CHESS_STUDIO\\studio_brain"]
      },
      "tcs-facts": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\Users\\<utilisateur>\\.claude\\projects\\C--TACTICAL-CHESS-STUDIO\\memory"]
      }
    }
  }
  ```

- **Claude Code** → `.mcp.json` projet, **optionnel**. Signalé **redondant** (accès fichier
  natif + `memory/` déjà auto-chargé). Posé seulement si Pierre veut l'uniformité d'outil.

Le MCP filesystem apporte son propre scoping (lecture/écriture bornées à la racine).

### 3.3 Face HTTP — pour agents Python + interface llm-lego

Nouvelles routes dans **`llm-lego/demo-server.ts`** (serveur `node:http`, port 3000, **même
origine** que `builder.html` et `/api/execute`). Deux racines configurées en tête de fichier
(constantes `MEM_ROOTS = { brain: <abs>, facts: <abs> }`).

#### Contrats

**`GET /api/memory`** — liste plate des notes des 2 racines.
```json
{
  "roots": { "brain": "C:\\...\\studio_brain", "facts": "C:\\...\\memory" },
  "notes": [
    { "root": "facts", "id": "project-overview", "relpath": "project-overview.md",
      "title": "project-overview", "tags": [], "type": "project",
      "mtimeMs": 1783000000000 }
  ]
}
```

**`GET /api/memory/:root/:id`** — une note.
```json
{ "root": "brain", "id": "000_HOME", "relpath": "000_HOME.md",
  "frontmatter": { "tags": ["moc","reference"] },
  "tags": ["moc","reference"],
  "wikilinks": ["doctrine/studio-doctrine", "000_HOME"],
  "body": "# 🧠 Studio Brain …",
  "mtimeMs": 1783000000000 }
```

**`GET /api/memory/search?q=<terme>&root=<brain|facts|all>`** — recherche **mot-clé**
(sous-chaîne insensible à la casse sur titre + corps + tags ; `root` optionnel, défaut
`all`). Le recall **sémantique** est la brique 2, **hors CT-4**.
```json
{ "q": "elo", "hits": [ { "root":"facts","id":"lichess-oracle-stale",
  "title":"…","snippet":"…contexte du terme…","score": 3 } ] }
```

**`POST /api/memory`** — écrire/mettre à jour une note (voir garde-fous §4).
```json
// requête
{ "root": "facts", "id": "ma-note", "frontmatter": { "type": "feedback" },
  "body": "…", "mode": "create" }
// réponse
{ "ok": true, "root": "facts", "id": "ma-note", "relpath": "ma-note.md", "created": true }
```

Les **agents Python** (autopilot/cockpit/llm-lego) consomment `:3000/api/memory` **ou**
lisent les fichiers en direct (même machine) — au choix, aucune dépendance dure au Node.

### 3.4 Interface — amorce minimale dans llm-lego (le gros = brique 4)

`builder.html` gagne une vue **« Mémoire »** (nouvel onglet, à côté de Canvas/Wire Map/
Bibliothèque/Calques/Roadmap) :
- liste les notes (`GET /api/memory`), groupées par racine, filtre texte ;
- ouvre une note (`GET /api/memory/:root/:id`) : corps rendu, tags + wikilinks affichés.

**Lecture seule** dans CT-4. Le **graphe** (brique 3), le **recall sémantique** (brique 2)
et l'**écriture/édition riche** (brique 4) sont hors périmètre. Cette vue sert de **preuve
de bout-en-bout** de la face HTTP, pas d'interface finale.

---

## 4. Garde-fous

- **Vault humain protégé** : `brain` (`studio_brain/`) est **lecture seule** via la face HTTP
  (`POST` sur `root=brain` → **403**). Règle studio : *« notes brutes de Pierre jamais
  réécrites ; synthèse IA vit à côté »*. (La mise à jour de `00_CURRENT_CONTEXT.md` reste le
  fait de Claude Code nativement, pas de cette API.)
- **Écriture bornée à `facts`** (`memory/`), la mémoire machine prévue pour l'écriture.
- **Anti-traversée** : `id`/`relpath` validés (pas de `..`, pas de séparateur, `.md` only) ;
  le chemin résolu doit rester **sous** la racine déclarée, sinon **400**.
- **Encodage** : `utf-8` explicite sur toute lecture/écriture.
- **Fichiers protégés** : hors des 2 racines par construction (`golden_examples.jsonl`,
  `IMPROVEMENT_LEDGER.yaml` vivent dans `lab/chains/`) → jamais atteignables par cette API.
- **`src/` (moteur Rust) et `llm-lego/src/`** : intacts. CT-4 ne touche que `demo-server.ts`
  + `builder.html` + configs MCP.

---

## 5. Preuve (evidence, non-négociable — CLAUDE.md)

1. **Face HTTP (unit/intégration)** : `GET /api/memory` renvoie les 2 racines ; `GET
   /api/memory/:root/:id` round-trip d'une note existante de **chaque** racine ; traversée
   `..` → 400 ; `POST root=brain` → 403 ; `POST root=facts` crée un fichier relisible.
2. **Cohérence des faces** : un `POST` HTTP dans `facts` est ensuite **lu via le MCP
   filesystem** (même fichier, même contenu) → prouve « une donnée, deux visages ».
3. **Interface** : vue « Mémoire » liste ≥1 note de chaque racine et en ouvre une (preuve
   DOM/Playwright, capture nommée).
4. **Non-régression llm-lego** : `run-validators.mjs` **741 ✅ / 0 ❌** + `vitest` **56 ✅**
   restent verts. Ajout d'un `memory-validate.mjs` (facultatif) pour verrouiller la face HTTP.
5. **Nettoyage** : la note de test créée dans `facts` est supprimée en fin de preuve (net
   effet nul), comme le fait déjà `run-validators.mjs` avec sa sentinelle.

Verdicts attendus : `software_verdict: OK` · `evidence_verdict: INCLUDES_UX_VALIDATION` ·
`claim_verdict: NO_CLAIM_ALLOWED`.

---

## 6. Hors périmètre CT-4 (briques suivantes)

- **Brique 1** — Obsidian app (Local REST API + obsidian-mcp-server) pour graphe/recherche natifs.
- **Brique 2** — Recall **sémantique** (embeddings) sur les 2 racines.
- **Brique 3** — Graphify live (graphe de connaissances rebranché).
- **Brique 4** — Interface pro complète dans llm-lego (édition, graphe, recall, lanes, ledger, gates).
- **Brique 5** — Capture vocale/rapide → mémoire.
- **Fusion des racines / graphe unifié humain+machine** : écarté par D2 (deux racines).

---

## 7. Découpage en unités (pour le futur plan)

| Unité | Fait quoi | Dépend de | Prouvable seule |
|---|---|---|---|
| U1 — lib mémoire | lire/lister/parser (frontmatter, tags, wikilinks) les 2 racines | — | oui (tests purs) |
| U2 — routes HTTP | `/api/memory[...]` dans `demo-server.ts` sur U1 + garde-fous §4 | U1 | oui (curl/tests) |
| U3 — config MCP | 2 entrées filesystem (Desktop ; Code optionnel) | — | oui (lecture note via MCP) |
| U4 — vue Mémoire | onglet lecture seule dans `builder.html` sur U2 | U2 | oui (DOM/Playwright) |
| U5 — preuve croisée | POST HTTP → lu via MCP ; régression ; cleanup | U2, U3 | oui |

Ordre suggéré : U1 → U2 → (U3 ∥ U4) → U5.

---

## 8. Questions ouvertes (à trancher au plan, non bloquantes)

- **Q1** : `.mcp.json` Claude Code posé ou non (redondant) ? — défaut proposé : **non**.
- **Q2** : `memory-validate.mjs` de régression ajouté ? — défaut proposé : **oui** (léger, verrouille la face HTTP), zone validateurs = pas la zone `tests/` protégée.
- **Q3** : la recherche mot-clé indexe-t-elle le corps entier ou titre+tags seulement (perf) ? — défaut : **corps entier** (volume mémoire faible, ~18 + ~20 notes).
