# Brique 4c — Cartes de nœud dégagées + onboarding

- **Date** : 2026-07-05
- **Source** : brainstorming session Claude Code (Pierre + assistant), design approuvé en séance ; exécution inline directe (spec → build, pas de plan-doc séparé, sur consigne Pierre).
- **Brique** : `4c` du chantier « TCS AI-OS ». Dépend de `4a` (design system) — FAITE.

---

## 1. But

Réduire la densité « prototype » des cartes de nœud et rendre le builder découvrable, en réutilisant
les tokens/composants de 4a. Trois volets : cartes de nœud, empty-state, tooltips palette.

---

## 2. Décisions (approuvées)

- **Cartes de nœud : restructuration complète.** Titre = label humain, prompt en aperçu, méta en puces,
  IDs internes → inspecteur.
- **Empty-state pédagogique** centré (modèles + pointeur palette).
- **Tooltips** d'une ligne sur chaque brique de la palette gauche.

---

## 3. Architecture (builder.html uniquement)

### 3.1 Carte de nœud restructurée
- **Titre `.nhead`** = **label humain** dans cet ordre : `n.attachedPrompt?.name` → `n.attachedBrick?.name`
  → (`n.type==='agent'` ? `n.data.role`) → dérivé du prompt (`data.prompt`, ≤ 40 car., 1ʳᵉ ligne) →
  `meta.label`. **`n.id`** rétrogradé en **sous-titre discret** (`font-size:var(--fs-2xs)`, `color:var(--ink-3)`).
- **Aperçu prompt** : 1 ligne tronquée du `data.prompt` effectif (`--font-mono`, `--ink-2`, `text-overflow:ellipsis`).
- **Méta en puces** (chips tokens 4a) : `data.model` si présent · `→ {data.outputKey}` si présent.
- **Retiré de la carte** : `producerRef` et toute clé machine brute. **Déplacé vers l'inspecteur** :
  une section « Technique » (id, `producerRef`, `outputKey` brut) dans le panneau Inspecteur du nœud.
- **Conservés** : badges 4a (câblage/provenance), lignes de fiches liées (🔗 `node-brick`/`node-prompt`/
  `node-oracle`/`node-goal`/`node-gate`) — déjà propres, testids intacts.

### 3.2 Empty-state pédagogique
Quand le canvas **Actif** est vide (`nodes.length === 0`, hors Sandbox), remplacer le texte
« Canvas vide. Charge… » par une **carte centrée** : titre « Commence par un modèle », **3 boutons**
raccourcis (`routing (search|chat)`, `Council gate v1`, `Validation loop`) qui appellent la **logique
de chargement d'exemple existante**, + ligne « ou glisse un nœud depuis la palette → ». testid `empty-cta`.

### 3.3 Tooltips palette
`title` d'une ligne sur chaque bouton de brique de la palette gauche. Table (extrait) :
LLM « appel modèle : prompt → sortie » · Tool « exécute une commande/outil externe » · Router
« aiguille selon une condition » · Join « fusionne plusieurs branches » · Chat « conversation multi-tours
2 voix » · Agent « rôle + mémoire + garde-fous » · Prompt « gabarit de prompt réutilisable » · Oracle
« vérifie une sortie contre une règle (PASS/FAIL) » · Goal « objectif de la chaîne » · Council
« délégation à un panel » · HumanGate « point d'arrêt : approbation humaine » · Artefact « livrable
produit (fichier, doc) » · Note « annotation, ignorée par le moteur ».

---

## 4. Garde-fous

- **testids de nœud préservés** (`node-brick-*`, `node-prompt-*`, `node-oracle-*`, `node-goal-*`,
  `node-gate-*`, `node-prompt-{id}`) → validateurs verts. `.badge-real/.badge-target` (council) intacts.
- **Aucune donnée changée** : seul l'affichage bouge ; l'inspecteur reçoit les champs déplacés.
- Réutilise tokens/`Badge`/échelles de 4a. `src/` (Rust)/`llm-lego/src/` intacts. Modif : `builder.html`.

---

## 5. Preuve

- **DOM cartes** : titre de carte = label humain (≠ `llm-8`) ; `producerRef` **absent** du corps de carte,
  **présent** dans l'inspecteur (section Technique) ; aperçu prompt 1 ligne + chips présents.
- **DOM onboarding** : canvas Actif vide → `empty-cta` avec 3 raccourcis ; un raccourci charge un exemple.
- **DOM tooltips** : chaque brique palette porte un `title` non vide.
- **Non-régression** : `run-validators.mjs` (dont `builder-validate`) + `vitest` verts ; Mémoire/graphe intacts.
- **Captures avant/après** d'une carte de nœud + du canvas vide.

Verdicts : `software_verdict: OK` · `evidence_verdict: INCLUDES_UX_VALIDATION` · `claim_verdict: NO_CLAIM_ALLOWED`.

---

## 6. Hors scope

4b (cockpit accueil), moteur de rendu canvas (pan/zoom déjà OK), autres vues.

---

## 7. Unités (exécution inline)

| U | Fait quoi | Prouvable |
|---|---|---|
| U1 | Titre carte = label humain + `n.id` en sous-titre | DOM titre |
| U2 | Aperçu prompt 1 ligne + chips méta ; `producerRef`/clés → hors carte | DOM carte |
| U3 | Section « Technique » dans l'inspecteur (id/producerRef/outputKey) | DOM inspecteur |
| U4 | Empty-state centré `empty-cta` (3 raccourcis) | DOM canvas vide |
| U5 | Tooltips palette | DOM titles |
| U6 | Non-régression + captures | run-validators + vitest |
