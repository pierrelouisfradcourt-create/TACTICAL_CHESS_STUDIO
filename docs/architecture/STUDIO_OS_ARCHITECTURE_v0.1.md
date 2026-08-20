# Studio OS Architecture — v0.1

status: DRAFT_FOR_REVIEW
version: 0.1
date: 2026-06-26
authority: HumanGate (ratification pending)
claim_posture: NO_CLAIM_ALLOWED
ledger_ref: IMP-122

> **Lecture d'autorité.** Ce document est une *synthèse de planification*. Il
> n'établit aucune preuve scientifique, ni de force moteur, ni de dataset, ni de
> benchmark. Si le code ou un artefact courant contredit ce document, **le code
> gagne** (voir §3). Tant que HumanGate n'a pas ratifié cette v0.1, elle reste un
> brouillon de référence, pas une vérité dépôt.

---

## 1. Objet — qu'est-ce que le « Studio OS »

Le **Studio OS** est le système d'exploitation du studio : l'ensemble des règles,
plans et boucles qui gouvernent *comment* le Tactical Chess Studio produit, vérifie
et fait évoluer son travail. Il ne s'agit pas du moteur d'échecs lui-même, mais de
la couche de gouvernance et d'automatisation qui l'encadre.

Le studio est un **studio de création de jeux AI-gouverné**, piloté par un opérateur
humain solo (Pierre / HumanGate), avec une IA joueur/coach/meta-testeur (**Rocky**)
au centre. Il produit des jeux, des outils et des modules commercialisables.

Source canonique : `00_STUDIO_CONTROL/00_MASTER_DOCS/00_VISION.md`.

---

## 2. Doctrine fondatrice

Tirée du *Paradoxe Skynet* :

```
IA-jardinier, pas Skynet-ingénieur.
Le studio reste ouvert, adaptatif, nourri par du feedback réel.
L'humain (HumanGate) reste autorité finale.
```

Conséquences structurantes :

- Rocky apprend des vrais joueurs, pas seulement de lui-même.
- Le studio s'auto-améliore mais **ne décide jamais seul**.
- Les jeux sont des systèmes vivants, pas des produits figés.

---

## 3. Ordre d'autorité

En cas de désaccord entre sources, l'ordre de vérité est :

1. Code source actif
2. Build files, manifests, sorties runtime les plus récentes
3. Sorties benchmark courantes
4. Docs courantes
5. Docs historiques (archive uniquement)

Règle d'audit appliquée : *les artefacts committés les plus récents l'emportent
sur des affirmations de ledger plus anciennes, même quand l'artefact récent est un
échec.* Les roadmaps (`AAA_TACTICAL_CORE_ARCHITECTURE.md`, fusions PP9-PP19, etc.)
guident la direction long terme mais **ne sont pas** vérité implémentée tant
qu'elles ne sont pas reflétées dans le code + les artefacts courants.

Source : `00_STUDIO_CONTROL/00_MASTER_DOCS/05_ARCHITECTURE.md`.

---

## 4. Modèle à deux pistes

Le studio sépare strictement deux pistes parallèles
(`10_AUTOMATION_EVIDENCE_PLANE.md`) :

```
Track A — runtime jeu / IA / produit
  moteur, search, neural, datasets, Chess960, tactical core, cartes/effets

Track B — plan d'évidence / automation
  trust root, CI, runs immuables, parser, gates, audits, repair loop,
  decision packets, dry-run packets, observation non-canonique, contrôle de claim
```

**Track B reste prioritaire** : Track A ne peut pas être cru à vitesse sans évidence
mécanique. Le but n'est pas de rendre l'automate « plus intelligent » — c'est de
**cesser de faire de l'automate le juge de son propre travail** :

```
L'agent implémente
scripts + CI vérifient mécaniquement
le LLM critique / route uniquement
HumanGate tranche
```

---

## 5. Plan de contrôle (control plane)

### 5.1 HumanGate — autorité finale

`src/core/human_gate.rs` matérialise une barrière d'autorisation humaine dans le
runtime lui-même. `HumanDecision` reste autorité finale pour : activation, promotion,
merge, reject, freeze, et statut de claim. Le HumanGate **n'a aucune autorité Python**
et ne crée pas de dataset admission gate par lui-même (invariants testés,
`core::human_gate::tests::*`).

### 5.2 Lanes (couloirs de risque)

Chaque unité de travail est routée dans un couloir :

| Lane | Sens | Exécution |
|---|---|---|
| `SAFE_AUTO` | passif / borné / réversible | automatisable, merge sur gates vertes |
| `AUDIT_REQUIRED` | impact runtime/dataset/benchmark | revue + sign-off requis |
| `FORBIDDEN` | zones protégées | gate HumanGate explicite obligatoire |

Zones **FORBIDDEN** (jamais modifiées par un agent sans gate) :
`tests/`, `eval/`, `oracle/`, `bench/`, `puzzles/`, `.github/` (voir `CLAUDE.md` et
`.claude/rules/`).

### 5.3 Kaizen Loop — le ledger

`lab/chains/IMPROVEMENT_LEDGER.yaml` est le SSOT d'amélioration continue. Posture de
claim : `NO_CLAIM_ALLOWED` ; read-only sauf `--add` / `--close`. Chaque entrée
(`IMP-xxx`) porte : type, impact, effort, lane, `acceptance`, `blocked_by`,
sessions ouverture/fermeture, et `notes` (preuve d'oracle). Le ledger est l'interface
d'entrée de l'usine (`sprint-plan` : ledger → sprint actionnable).

---

## 6. Architecture Rocky — deux vitesses

Inspirée d'AlphaStar (agile, multi-jeux). Source : `00_VISION.md`.

### 6.1 Fast path (temps réel — boucle de coups)

```
GameState
→ LegalActions
→ NeuralProposal      (intuition, guidance)
→ SearchResult        (calcul tactique, autorité finale)
→ CriticVerdict       (filtre — bloque les incohérences)
→ AuthorityDecision   (tranche une seule action)
→ ValidatedAction
→ Executor.apply()
→ Telemetry
```

### 6.2 Slow path (hors temps réel — apprentissage)

```
Telemetry / Replays / Errors
→ LLM analyst (LM Studio — Devstral/Mistral)
→ explications / curriculum / tâches
→ HumanGate
→ amélioration bornée
→ Feedback / Memory
```

### 6.3 Règle d'autorité centrale (invariants)

- **Search = autorité tactique finale.**
- **Neural propose, ne décide jamais seul.**
- **Critic filtre, ne joue pas.**
- **LLM = slow path uniquement — jamais dans la boucle de coups.**
- `SearchBackend` et `DecisionController` restent **passifs**.
- `NeuralPolicyValue` reste **paper-only** jusqu'à une `HumanDecision` séparée
  autorisant une implémentation bornée.

(Source des invariants : consolidation PP9-PP19, `05_ARCHITECTURE.md`.)

---

## 7. Topologie du dépôt (Track A)

Crate `tactical_chess_pure_lab` v0.1.0 (Rust 2021). Cartographie :
`SYSTEM_MAP.md` (généré 2026-06-01).

| Module | Responsabilité |
|---|---|
| `src/chess/` | Moteur d'échecs : negamax α-β, eval, FEN/Chess960, puzzles, UCI |
| `src/engine/` | Représentation plateau générique (board/entity/action/event/turn) |
| `src/agents/` | NeuralAgent (+ bridge Python subprocess), UciAgent, retrieval |
| `src/simulation/` | Self-play, teacher UCI runner, **neural_tournament_runner**, cross-test |
| `src/tool/` | CLI (`run_cli`), puzzle-eval, conversion/balance datasets |
| `src/core/` | Types partagés : ActionMask, HumanGate, LegalAction, episode_trace |
| `src/ai/` | Abstractions : PolicyGuide, DecisionController, SearchBackend |

Couche ML (Track A, lab) : `lab/` (≈25 fichiers Python) — entraînement PyTorch,
dataset loaders, `infer_policy.py` (bridge d'inférence appelé depuis Rust).

**Frontière d'implémentation** : le runtime implémenté reste *chess-first*. Une
architecture tactique/cartes générique doit croître *à côté* du runtime échecs, pas le
remplacer en un refactor destructeur. Python reste acceptable pour
lab/training/orchestration ; les règles de runtime-jeu final visent un Rust
déterministe.

---

## 8. Plan d'évidence & CI guard (Track B)

- `auto_merge_guard` (consolidé via PR #138) : tout check *skipped* bloque
  l'auto-merge ; tout verdict manquant/invalide bloque.
- Verdicts policy-gated dans le corps de PR : `software_verdict`,
  `evidence_verdict`, `claim_verdict`.
- Les scripts de control-plane protégés exigent revue + merge manuels.
- Périmètre d'auto-merge visé : PRs à frontière *passive*, toutes gates vertes.
- Marqueur forensique des merges du guard : `AUTO_MERGED_BY_GUARD`.

Oracles (jamais modifiés) : `cargo test`, `pytest`, `./bench/elo_match.sh`,
`./bench/lichess_eval.sh`. **Merge = oracle vert + sign-off HumanGate.**

---

## 9. Instantané d'état (non-canonique, daté)

> Valeurs reportées des docs source à leur date. **Aucune** n'est une preuve de
> force courante (`NO_CLAIM_ALLOWED`).

- **ELO** (benchmark 110 parties, 2026-06-03, `07_CURRENT_STATE.md`) :
  teacher_uci 1351 · hybrid 1188 · heuristic 1183 · neural 1079 ; draw_rate 0.68.
- **Ledger** (état 2026-06-04) : 103 IMPs totaux, bloqueur critique **IMP-008**
  (dataset rebuild, lane FORBIDDEN).
- **Freeze Studio Loop V1** (2026-05-19) : runtime activation **BLOCKED** ; pas de
  boucle studio autonome ; dataset/training/benchmark/model **BLOCKED**.

---

## 10. Frontières ouvertes & roadmap

- Surfaces PP9-PP19 classées *docs-only / tests-only / passive* — pas d'activation
  runtime tant qu'une `HumanDecision` ne l'autorise pas.
- `NeuralPolicyValue` : candidat *paper-only*.
- Architecture tactique/cartes générique : croissance latérale, non destructive.
- Track B reste prioritaire sur Track A jusqu'à évidence mécanique suffisante.

---

## 11. Glossaire

| Terme | Sens |
|---|---|
| **HumanGate** | Barrière d'autorisation humaine ; autorité finale runtime |
| **Rocky** | IA joueur/coach/meta-testeur au centre du studio |
| **Fast / Slow path** | Boucle de coups temps réel / boucle d'apprentissage hors-ligne |
| **Lane** | Couloir de risque (SAFE_AUTO / AUDIT_REQUIRED / FORBIDDEN) |
| **Kaizen Loop** | Boucle d'amélioration continue pilotée par le ledger IMP |
| **Oracle** | Vérificateur mécanique non modifiable (cargo test, pytest, bench) |
| **Evidence plane** | Track B : CI, gates, audits, contrôle de claim |

---

## 12. Provenance

Synthétisé à partir des sources canoniques :
`CLAUDE.md`, `.claude/rules/*`, `SYSTEM_MAP.md`,
`00_STUDIO_CONTROL/00_MASTER_DOCS/{00_VISION,05_ARCHITECTURE,07_CURRENT_STATE,10_AUTOMATION_EVIDENCE_PLANE}.md`,
`lab/chains/IMPROVEMENT_LEDGER.yaml`.

## Changelog

- **v0.1 (2026-06-26)** — première rédaction, depuis le contexte studio. Brouillon
  en attente de ratification HumanGate. Ledger : IMP-122.
