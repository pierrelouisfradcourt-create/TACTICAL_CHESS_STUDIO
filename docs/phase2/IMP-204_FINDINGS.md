# IMP-204 — Graphify : due diligence READ-ONLY + zones grises (décision Pierre)

**Lane:** SAFE_AUTO · **type:** tooling · **deps:** [] · **acceptance:** `uv tool install graphifyy` +
`graphify install --project` + `/graphify .` code-only OFFLINE + `graphify-out/` (graph.json +
GRAPH_REPORT.md + graph.html) + query OK ; aucune zone FORBIDDEN ; aucun git commit/push.

**Verdict de cette session : NON installé, NON exécuté, NON fermé — flag pour décision Pierre.**
Raison : l'acceptance impose d'**installer et exécuter un outil tiers** sur la machine + sur tout le
dépôt. C'est une action d'approvisionnement (supply chain) + exécution de code étranger, pas une
écriture de module gouverné. La consigne de mission est explicite : *« Si le spec est ambigu,
n'invente pas : implémente le strict décrit, signale les zones grises pour décision Pierre. »*

## Ce qui a été fait (READ ONLY uniquement)

1. Lecture `docs/studio_v2/RECO_GRAPHIFY.md` + entrée ledger IMP-204.
2. Vérification d'existence du paquet sur PyPI (HTTP GET read-only, aucune installation) :

| Champ PyPI (`pypi.org/pypi/graphifyy/json`) | Valeur observée |
|---|---|
| nom paquet | `graphifyy` (le `graphify` simple → **404**, n'existe pas) |
| version | **0.9.1** (pré-1.0) |
| releases | 169 |
| `author` | **None** |
| `home_page` | **None** |
| `summary` | "AI coding assistant skill … turn any folder of code, docs, papers, images, or videos into a queryable knowledge graph" |

3. Vérification outillage local : **`uv` ABSENT** (`command -v uv` → rien) ; `graphify` non installé.

## Zones grises (→ décision Pierre)

- **ZG-1 — Signaux de confiance NON corroborés.** La reco annonce « ~58k★, ~1.2M downloads, MIT,
  graphify.net ». PyPI montre `author=None`, `home_page=None`, **v0.9.1** (pré-1.0). Rien ne
  corrobore les 58k★/MIT côté métadonnées PyPI. Écart fort reco↔registre → prudence supply chain.
- **ZG-2 — `uv` absent.** La commande d'acceptance exacte `uv tool install graphifyy` **ne peut pas
  s'exécuter** telle quelle. Fallbacks (`pipx`/`pip`) installeraient dans un environnement à décider
  (global vs `.venv312` vs venv dédié) — choix d'install = décision Pierre.
- **ZG-3 — Exécution de code tiers sur tout le dépôt.** `/graphify .` lit l'intégralité du repo et
  écrit `graphify-out/`. Même en « code-only offline », c'est l'exécution d'un binaire tiers v0.9.1.
  Action outward / difficilement réversible côté confiance → go explicite requis.
- **ZG-4 — Périmètre FORBIDDEN.** L'acceptance exige « aucun fichier en zone FORBIDDEN
  (tests/ eval/ oracle/ bench/ puzzles/ .github/) ». Graphify écrit normalement **seulement**
  `graphify-out/`, mais le `graphify hook install` (rebuild auto au commit git) **toucherait
  `.git/hooks`** et l'analyse pourrait *lire* (pas écrire) les zones FORBIDDEN. À cadrer.

## Plan d'exécution sûr et borné (si Pierre donne le go)

> À lancer par Pierre (ou sur go explicite), pas en autonome. Étapes ordonnées, vérifiables.

1. **Installer l'installeur** (au choix de Pierre) — soit `uv` puis `uv tool install graphifyy`, soit
   isolé : `python -m venv .venv_graphify && .venv_graphify/Scripts/pip install graphifyy==0.9.1`
   (épingler la version ; éviter une install globale).
2. **Vérifier l'intégrité** : `pip download graphifyy==0.9.1` + inspection du wheel avant exécution
   (hash, contenu) — défense supply chain minimale.
3. **Enregistrer le skill scoped projet** : `graphify install --project` (vérifier qu'il n'écrit que
   `.claude/` projet + son propre dossier ; **ne pas** lancer `graphify hook install` → touche `.git`).
4. **Premier graphe code-only OFFLINE** : `graphify .` **sans** clé API ni `OLLAMA_BASE_URL`
   (zéro appel LLM/réseau ; échouer sinon — l'offline est une garantie, pas un défaut).
5. **Contrôler la sortie** : `graphify-out/` contient `graph.json` + `GRAPH_REPORT.md` + `graph.html` ;
   confirmer **aucune écriture** hors `graphify-out/` (et hors zones FORBIDDEN) via `git status`.
6. **Une query** : `graphify query "qu'est-ce qui relie autopilot.py au ledger ?"` → réponse non vide.
7. **Aucun commit/push** (acceptance). Décision close = Pierre (SAFE_AUTO → close possible une fois
   prouvé, mais l'exécution initiale d'un tiers reste son go).

## Oracle proposé (mécanique, une fois exécuté par Pierre)

`graphify-out/{graph.json,GRAPH_REPORT.md,graph.html}` existent ∧ `git status` ne montre **aucun**
fichier hors `graphify-out/` ∧ aucune entrée en zone FORBIDDEN ∧ une query renvoie un résultat.
→ scriptable en pytest une fois la sortie présente (test d'existence + scan `git status` parsé).

## Décision attendue de Pierre
- [ ] Go installation ? Si oui : `uv` ou venv isolé épinglé `graphifyy==0.9.1` ?
- [ ] Accepter l'exécution d'un tiers v0.9.1 sur le dépôt (code-only offline) malgré ZG-1 ?
- [ ] `graphify hook install` (touche `.git/hooks`) : **non** par défaut — confirmer.
