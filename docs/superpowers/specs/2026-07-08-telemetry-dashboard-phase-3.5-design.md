# Design — Phase 3.5 : dashboard coût/tokens/verdicts

- **Date** : 2026-07-08
- **Source** : session Claude Code, fil « llm-lego board (suite phases) », ratifié Pierre
- **Statut** : design validé oralement, en attente relecture spec avant plan
- **Projet** : `llm-lego` (board interactif)

## Numérotation — garde-fou de référence

Cette phase est **Phase 3.5**, PAS Phase 6. Dans la carte cible V2, **Phase 6 = Evolution
System (mutation d'agents)**, volontairement laissée dormante. Ne pas réutiliser ce numéro
pour le dashboard, sous peine de confusion pour une session future qui relirait la carte.

## Contexte — la boucle ouverte

Les Phases 3 et 4 **capturent** de l'observabilité mais rien ne la **lit ni ne l'affiche** :

- `telemetry.mjs` écrit `telemetry/llm_calls.jsonl` (coût/tokens/modèle/durée par appel live)
  et `telemetry/council_verdicts.jsonl` (verdicts council), append-only, `telemetry/` gitignored.
- `demo-server.ts` n'a que le côté capture (`appendTelemetry` / `appendVerdict`). **Aucun endpoint
  de lecture.** `builder.html` (le board) a **0 référence** à la télémétrie.

C'est le thème récurrent de l'audit studio : « surface câblée > surface affichée ». Cette phase
ferme la boucle : lire + afficher, honnêtement.

## Volume réel du corpus (vérifié 2026-07-08)

- `llm_calls.jsonl` : **4 lignes** — un seul run council-audit sur IMP-206 (nœuds
  COUT/QUALITE/VITESSE/ARCHITECTURE), `qwen2.5-14b-instruct`.
  Sommes : `total_tokens = 1416` (prompt 989 + completion 427), durée cumulée 5979 ms.
- `council_verdicts.jsonl` : **absent** — le chemin de capture Phase 4 n'a jamais tiré ;
  le fichier n'a même pas été créé.

**Principe directeur** : le dashboard affiche honnêtement ce qui existe, même à 4 lignes / 0 verdict,
avec un état « corpus en cours d'accumulation ». Il ne simule jamais plus de signal qu'il n'y en a.
Ne pas retarder la construction pour attendre un corpus plus gros.

## Scope (verrouillé)

- Vue **globale uniquement**, section dédiée « Télémétrie » sur l'**Accueil** du board.
- **Pas** de filtre par-IMP en v0 (avec 4 lignes sur un seul IMP, rien à filtrer — différé).
- « Coût » = **tokens + durée réels** comme proxy, libellé explicite « modèle local — coût
  monétaire nul ». **Aucun tarif inventé**, aucune projection cloud spéculative.
- **Lecture seule stricte** : on ne touche pas la capture `telemetry.mjs`, on n'écrit rien.

## Approche

Agrégation **côté serveur** (retenue) plutôt que côté navigateur. Raisons : c'est le pattern
déjà en place (`/api/imp-board`, `/api/knowledge`), c'est déterministe et testable sans
navigateur, le client ne fait qu'afficher. Le module d'agrégation reste **pur** (entrée = contenu
fichiers, sortie = objet), donc unit-testable en dossier temp.

## Architecture — 4 unités

### 1. `llm-lego/telemetry-read.mjs` — module pur d'agrégation

Séparé de la capture `telemetry.mjs` (producteur ≠ consommateur). Responsabilité unique : lire les
deux fichiers et retourner un agrégat déterministe.

- Lit `TELEMETRY_DIR/llm_calls.jsonl` et `TELEMETRY_DIR/council_verdicts.jsonl`.
  `TELEMETRY_DIR` = `process.env.TCS_TELEMETRY_DIR || <défaut telemetry.mjs>` (même convention que
  la capture → testable en dossier temp).
- **Tolérance à l'absence** : fichier manquant = 0 enregistrement, jamais une erreur. Les deux
  fichiers sont indépendants (verdicts absent n'empêche pas d'agréger les appels).
- **Parse ligne par ligne** ; ligne vide ignorée ; ligne malformée (JSON invalide ou schéma
  inattendu) **sautée ET comptée** dans `skipped` — jamais de drop silencieux.

Forme de sortie :

```
{
  llm_calls: {
    count,                    // nb enregistrements valides
    total_tokens,            // Σ total_tokens
    prompt_tokens,           // Σ prompt_tokens
    completion_tokens,       // Σ completion_tokens
    total_duration_ms,       // Σ durationMs (null compté 0)
    by_model: { <model>: { calls, tokens } },
    distinct_imps,           // nb d'IMP distincts référencés
    skipped                  // nb lignes rejetées
  },
  verdicts: {
    count,
    distribution: { <verdict>: count },
    skipped
  },
  corpus_state: "accumulating" | "active"
  // "accumulating" si llm_calls.count < 20 OU verdicts.count === 0 ; sinon "active"
}
```

### 2. `GET /api/telemetry` — endpoint read-only (`demo-server.ts`)

- Appelle `telemetry-read.mjs`, renvoie l'agrégat en JSON.
- **Lecture seule.** Chemins fixes, **aucun paramètre** → pas de risque de traversal.
- Ne renvoie **jamais** 500 sur fichier absent (l'absence est un état normal, pas une erreur).

### 3. Section « Télémétrie » sur l'Accueil (`builder.html`)

Fetch `/api/telemetry`, affiche :

- Tuiles de tête : **nb appels · total tokens · durée cumulée · nb modèles · nb verdicts**.
- Tuile **« Coût »** = tokens + durée, sous-libellé **« modèle local — coût monétaire nul »**.
- **Mini-table par modèle** (`by_model` : modèle → appels, tokens).
- **Distribution des verdicts**, ou empty state « 0 verdict capturé » si `verdicts.count === 0`.
- **Bannière low-volume** quand `corpus_state === "accumulating"` :
  « Corpus en cours d'accumulation (N appels, M verdicts) — signal encore faible. »
- États : loading, erreur réseau, empty (0 appel) tous gérés — pas d'écran blanc.

### 4. `llm-lego/telemetry-dashboard-validate.mjs` — validateur

Auto-découvert par `run-validators.mjs`. Preuve d'**exécution**, pas d'existence :

- **Module pur sur le corpus réel actuel** : `count === 4`, `total_tokens === 1416`,
  `prompt_tokens === 989`, `completion_tokens === 427`, `verdicts.count === 0`,
  `by_model["qwen2.5-14b-instruct"].calls === 4`, `corpus_state === "accumulating"`.
- **Tolérance absence** : dossier temp vide (`TCS_TELEMETRY_DIR`) → agrégat à zéro, `skipped === 0`,
  pas de crash.
- **Ligne malformée** : fichier temp avec 1 ligne valide + 1 ligne cassée → `skipped === 1`,
  les valides toujours agrégées.
- **UI** (Playwright, style `impboard-validate`) : section « Télémétrie » présente, bannière
  low-volume affichée, libellé coût honnête présent.

## Gestion d'erreur (synthèse)

| Cas | Comportement |
|---|---|
| Fichier `llm_calls.jsonl` absent | 0 enregistrement, agrégat à zéro, pas d'erreur |
| Fichier `council_verdicts.jsonl` absent | `verdicts.count === 0`, empty state UI |
| Ligne JSON malformée | sautée, comptée dans `skipped`, valides agrégées |
| `durationMs` null | compté 0 dans `total_duration_ms` |
| Réseau KO côté UI | état erreur affiché, pas d'écran blanc |

## Hors scope (YAGNI / verrouillé)

- Filtre par-IMP (différé — B/C de la Q2).
- Tarif cloud / projection € spéculative (différé — B/C de la Q3).
- Graphes temporels, séries dans le temps.
- Toute écriture ; toute modification de `telemetry.mjs` (capture).
- Phase 6 (Evolution System) — reste dormante, numéro non réutilisé.

## Preuve attendue en fin de charter

- `node telemetry-dashboard-validate.mjs` → PASS (assertions module + UI ci-dessus).
- `node run-validators.mjs` → suite complète toujours verte (régression), nouveau validateur inclus.
- Rapport 3-verdicts : `software_verdict` / `evidence_verdict: MECHANICAL_VALIDATION_ONLY` /
  `claim_verdict: NO_CLAIM_ALLOWED`.
- Aucun commit/push sans go explicite Pierre.
