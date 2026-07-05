# Brique 4a — Système de design (tokens + badge unifié + dimensions de statut)

- **Date** : 2026-07-05
- **Source** : brainstorming session Claude Code (Pierre + assistant), 2 recadrages ratifiés en séance.
- **Statut** : design validé sur le principe — en attente relecture Pierre avant plan.
- **Brique** : `4a` (fondation design) du chantier « TCS AI-OS ». La brique 4 se décompose en 4a (design system) / 4b (cockpit accueil) / 4c (cartes nœud + onboarding). Dépend de 0/2/3a — FAITES.

---

## 1. Contexte & but

Le builder a les fonctionnalités d'un outil mûr mais l'habillage d'un prototype (cf. revue UX
initiale) : **monospace partout**, et **4 systèmes de badges dont les couleurs se télescopent**
(le vert veut dire *saved* OU *wired* OU *réel* selon le contexte → illisible).

**But de 4a** : poser un **système de design** (tokens CSS + composant badge unique) qui exprime
**plusieurs dimensions de statut orthogonales** de façon lisible et cohérente, **sans changer leur
sens** (décision de modèle explicite, pas un effet de bord du restyling).

---

## 2. Décision de modèle — les dimensions de statut (recadrage 1)

Les 4 « vocabulaires » actuels ne sont **pas redondants** : ce sont des **axes orthogonaux**. Un même
objet peut être `live` **et** `demo` **et** `PASS` en même temps. On les **GARDE tous** ; on unifie
seulement leur **expression visuelle**.

| Dimension | Objet | Valeurs | Encode | Décision |
|---|---|---|---|---|
| **D1 — provenance** | brique Council | `demo` / `réel` / `cible` | mock vs LM Studio réel vs cible non-construite | **KEEP** |
| **D2 — maturité** | brique Library | `draft` / `saved` / `live` | cycle de vie d'édition | **KEEP** |
| **D3 — câblage** (wiredStatus) | nœud/brique | `unset` / `documented-only` / `wired` / `broken` | vérité runtime (épistémique) | **KEEP** |
| **D4 — suivi** | entrée Wire Map | `todo` / `PASS` / `done` / `blocked` | avancement/preuve du projet | **KEEP** |

**Merge/drop** : **aucun** — chaque dimension répond à une question distincte (d'où ça vient / où
c'en est / est-ce que ça tourne / est-ce prouvé). Les fusionner perdrait de l'information (Pierre :
un nœud peut être live+demo+PASS). Le problème n'est **pas** trop de vocabulaires, c'est **zéro
système visuel** pour les distinguer.

**Ce qui change (visuel, pas données)** : chaque valeur est mappée à une **sévérité sémantique**
partagée, et chaque badge porte un **glyphe de dimension** → plus de collision de sens.

Mapping valeur → sévérité (palette §3) :
- **neutral** : `draft`, `unset`, `todo` (rien à signaler / non commencé)
- **info** : `demo` (mock/démo)
- **good** : `saved`, `wired`, `réel`, `done`, `PASS` (vérifié/positif)
- **warn** : `documented-only`, `cible` (revendiqué mais non prouvé / cible non construite)
- **bad** : `broken`, `blocked` (cassé/bloqué)

Le glyphe de dimension lève l'ambiguïté quand 2 valeurs partagent une sévérité (ex. `saved` et
`wired` sont tous deux *good* mais l'un porte le glyphe maturité, l'autre câblage).

---

## 3. Système visuel (recadrage 2) — livrable

### 3.1 Design tokens (variables CSS sur `:root`)

- **Neutres choisis** (biais indigo léger, pas du gris pur) : `--bg`, `--panel`, `--panel-2`,
  `--line`, `--ink`, `--ink-2`, `--ink-3`.
- **Accent** : `--accent` (indigo `#6366f1`, conservé — c'est l'identité actuelle).
- **Palette sémantique** (distincte de l'accent), chaque sévérité en paire *soft/fg* :
  `--sev-neutral / --sev-neutral-soft`, `--sev-info(-soft)`, `--sev-good(-soft)`,
  `--sev-warn(-soft)`, `--sev-bad(-soft)`.
- **Typo** : `--font-sans` (system-ui / Segoe UI Variable stack) pour l'UI+prose ; `--font-mono`
  (l'actuel Monaco/Courier) **réservé au code / IDs / JSON**. Échelle : `--fs-2xs`..`--fs-xl`.
- **Espacement** : `--sp-1`..`--sp-6` (grille 4/8 px).
- **Badge** : `--badge-radius`, `--badge-fs`, `--badge-pad`.

Les tokens vivent dans le `<style>` inline du builder (pas de fichier externe — contrainte lego).

### 3.2 Composant `Badge`

`Badge({ dim, value })` → une pastille cohérente :
- forme/typo/padding depuis les tokens badge ;
- **couleur = sévérité** (`--sev-*` selon le mapping §2) — fond `-soft`, texte `fg` ;
- **glyphe de dimension** en préfixe (D1 provenance `◆` · D2 maturité `◐` · D3 câblage `⚡` · D4 suivi `✓`) + `title` explicite (« provenance : réel ») ;
- **position/ordre fixes** sur une bande de badges : `provenance · maturité · câblage` (les 3 axes brique) ; D4 sur les lignes Wire Map.

Un composant unique remplace `.badge-real/.badge-target/.badge-demo`, `.lib-maturity[data-maturity]`,
`.lib-wired[data-wired]` et les pastilles PASS.

### 3.3 Application aux surfaces existantes

- **Typo globale** : `body` passe en `--font-sans` ; `--font-mono` appliqué **uniquement** au code,
  aux IDs internes, au JSON (input initial, trace moteur, `producerRef`, `toEngineGraph`).
- **Badges** : remplacer les 4 patrons par `Badge` dans Bibliothèque (maturité/câblage), cartes de
  nœud (câblage/provenance), Council (provenance), Wire Map (suivi).
- **Échelle typo** appliquée : titres/corps/légende/données prennent 4 tailles distinctes (fin du
  « tout en 10-11 px »).

---

## 4. Garde-fous

- **Sens des dimensions préservé** : aucune donnée ne change (`data-maturity`, `wiredStatus`,
  `maturity`, PASS restent les mêmes valeurs) ; seul l'habillage change.
- **testids préservés** : `lib-mat-*`, `lib-maturity`, `lib-wired`, etc. gardés → validateurs verts.
- **Aucune police externe** (stack system pour `--font-sans` ; CSP/lego). Aucune lib.
- **Un seul point** de définition (tokens `:root`) + un seul composant `Badge`.
- `src/` (Rust) et `llm-lego/src/` intacts. Modif : `builder.html` uniquement.

---

## 5. Preuve (evidence — CLAUDE.md)

- **Non-régression DOM briques 2/3a** : vue Mémoire (liste + recall) et vue graphe rendent
  toujours (`mem-note`, `mem-hit`, `mem-graph-svg`, `mem-graph-node`, `mem-degraded` présents).
- **Régression complète** : `run-validators.mjs` (35+ validateurs, dont maturity/wired/palette) et
  `vitest` restent **verts** — les testids et data-attrs sont conservés.
- **Badge unifié prouvé (DOM)** : un nœud/brique montrant 2 dimensions à la fois affiche 2 badges
  `data-testid="badge"` avec `data-dim`/`data-sev` distincts et le bon glyphe.
- **Avant/après visuel** : capture de la Bibliothèque + d'une carte de nœud avant/après (mono→sans,
  badges télescopés → système cohérent).

Verdicts : `software_verdict: OK` · `evidence_verdict: INCLUDES_UX_VALIDATION` · `claim_verdict: NO_CLAIM_ALLOWED`.

---

## 6. Hors périmètre 4a

- **4b** (cockpit accueil single-pane), **4c** (cartes de nœud dégagées + onboarding).
- Refonte du **modèle de données** des dimensions (on les garde telles quelles).
- Refonte de la mise en page / layout des vues (4a = tokens + badges + typo, pas restructuration).

---

## 7. Découpage en unités (pour le plan)

| Unité | Fait quoi | Dépend de | Prouvable seule |
|---|---|---|---|
| U1 — tokens `:root` | couleurs (neutres+accent+sémantique), typo sans/mono, échelle, espacement | — | oui (DOM : var lues) |
| U2 — composant `Badge` + maps | `Badge({dim,value})` + value→sévérité + glyphes + ordre fixe | U1 | oui (rendu 4 dims) |
| U3 — typo globale | `body`→sans ; mono réservé code/IDs/JSON | U1 | oui (DOM/capture) |
| U4 — application badges | remplacer les 4 patrons par `Badge` (Biblio, nœud, Council, Wire Map) | U2 | oui (DOM + validateurs) |
| U5 — non-régression + avant/après | run-validators + vitest + captures Mémoire/graphe | U3,U4 | oui |

Ordre : U1 → U2 → (U3 ∥ U4) → U5.

---

## 8. Questions ouvertes (défauts proposés)

- **Q1** : glyphes de dimension retenus (`◆ ◐ ⚡ ✓`) ou lettres (`S M C ✓`) ? — défaut : **glyphes** (moins de bruit textuel).
- **Q2** : Wire Map D4 — garder le libellé texte (PASS/todo…) **dans** le badge ou glyphe seul ? — défaut : **glyphe + libellé court** (la Wire Map est une table, le texte aide).
- **Q3** : garder l'accent indigo actuel ou en profiter pour le retravailler ? — défaut : **garder** (identité existante ; 4a ne rebrande pas la couleur d'accent).
