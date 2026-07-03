# Sources de Vérité dans le Repo
#reference

> Où lire les données réelles. **Ne jamais inférer depuis la mémoire — aller à la source.**

---

## Stratégie & Vision

| Document | Chemin | Contenu |
|---|---|---|
| Vision & Stratégie V2 | `docs/studio_v2/00_SYNTHESE_VISION_STRATEGIE.md` | Thèse pivot, profil opérationnel, principes directeurs |
| Audit de l'audit | `docs/studio_v2/01_AUDIT_DE_LAUDIT.md` | Verdict KEEP/IMPROVE/DELETE sur tout le plan 100 actions |
| Architecture V2 | `docs/studio_v2/02_GAME_FACTORY_V2_ARCHITECTURE.md` | Architecture cible micro-usine |
| Business Plan | `docs/studio_v2/03_BUSINESS_PLAN.md` | 3 scénarios revenu An1, hypothèses, seuils de décision |
| Risk Register | `docs/studio_v2/05_RISK_REGISTER_ADR_BACKLOG.md` | Risques majeurs |

---

## Snake: Survivor RPG — Genesis

| Document | Chemin | Contenu |
|---|---|---|
| CERFA (manifeste passe 1) | `docs/studio_v2/10_CERFA_SNAKE_SURVIVOR.md` | Spec de build MVP, scope arbitré, champs à creuser |
| Roadmap | `docs/studio_v2/11_ROADMAP_SNAKE_SURVIVOR.md` | Phases 0-4, gates, kill-criteria |
| Plan de build | `docs/studio_v2/12_PLAN_BUILD_SNAKE_SURVIVOR.md` | Slices S1-S7, autonomie, réutilisation |
| CERFA template générique | `docs/studio_v2/08_GAME_MANIFEST_CERFA.md` | Manifeste vierge pour tout nouveau jeu |
| Vision AAA (étoile nord) | `docs/studio_v2/13_PLAN_CONSTRUCTION_AAA.md` | Vision complète, non le MVP |

---

## Compilateur de Design Empirique

| Document | Chemin | Contenu |
|---|---|---|
| Design Compiler | `docs/studio_v2/09_DESIGN_COMPILER_COLDSTART.md` | 4 artefacts : CERFA schema, design vector, retrieval, causal memory |
| CERFA schema v1 | `studio_kit/schemas/cerfa_v1.yaml` (à créer) | Format machine-readable du manifeste |
| Mémoire causale | `studio_kit/memory/causal_rules.yaml` (à créer) | Priors CR-001…CRN |

---

## Balance de Jeu & Simulation

| Source | Chemin | Contenu |
|---|---|---|
| Variants équilibrés | `variants/*.json` | 10 variants (spawn, économie, vitesses) → tables de balance |
| Simulateur headless | `headless_sim.py` | Génère des courbes de survie (oracle de balance) |
| Résultats simulation | `runs/` | Sorties de `headless_sim.py` |

---

## Ledger & Kaizen

| Source | Chemin | Contenu |
|---|---|---|
| Ledger IMP | `lab/chains/IMPROVEMENT_LEDGER.yaml` | 198 entrées IMP ; ne jamais modifier manuellement |
| Exemples LoRA | `lab/chains/golden_examples.jsonl` | Corpus LoRA — **ne jamais supprimer** |
| Carte agents | `lab/chains/prompt_chain_map.json` | Routing agents |

---

## Mémoire & Contexte Session

| Source | Chemin | Contenu |
|---|---|---|
| Mémoire Cowork | `AI_MEMORY/` (dans le repo) | Mémoire persistante entre sessions Cowork |
| Studio context live | `STUDIO_CONTEXT_LIVE.md` | État courant de la session |
| COWORK_CONTEXT | `COWORK_CONTEXT.md` | Contexte de handoff |

---

## Oracles Réels (non-LLM)

| Oracle | Commande / Source | Ce qu'il mesure |
|---|---|---|
| Build Rust | `cargo build --release && cargo test` | Compilabilité + tests moteur |
| Build Python | `.venv312\Scripts\python.exe -m pytest lab/chess_fantasy/tests/ -v` | Tests lane JEUX |
| Headless sim | `python headless_sim.py` | Courbes de survie, balance jeu |
| Télémétrie | PostHog / Plausible (à brancher) | Rétention J1, abandon/min, cause de mort |
| Wishlists Steam | Steamworks analytics | Vélocité wishlists, conversion visite→WL |
| Ventes | Steamworks → `outputs/` | Ventes copie, revenu net |

---

## Ce que le LLM ne sait PAS (aller à la source)

- ELO réel de Rocky → `bench/` ou résultat `cargo test` (ne pas demander au LLM)
- État des IMPs → `lab/chains/IMPROVEMENT_LEDGER.yaml` (ne pas demander au LLM)
- Rétention réelle → télémétrie joueurs (ne pas demander au LLM)
- Fun → Pierre qui joue (ne pas demander au LLM)

---

## Cadence de mise à jour de ce vault

**Revue hebdomadaire (fin de session, ~15 min) :**

1. **[[projects/snake-survivor-genesis|Snake: Survivor RPG]]** : mettre à jour la phase actuelle, les métriques wishlists/ventes, les résultats du playtest de la semaine.
2. **[[decisions/decision-log|Decision Log]]** : ajouter toute décision irréversible prise dans la semaine (HumanGate uniquement).
3. **[[gamedesign/lessons|Lessons]]** : promouvoir un `prior` en `observed` si on a joué et observé quelque chose de concret. Ajouter un prior si une nouvelle règle marché a été découverte.
4. **Ce fichier** : mettre à jour si un nouveau fichier source est créé dans le repo.
5. **[[000_HOME|HOME]]** : mettre à jour le dashboard rapide (phase actuelle, WL, prochaine étape).

**Ne pas mettre à jour :**
- `IMPROVEMENT_LEDGER.yaml` via ce vault (passe par `kaizen_loop.py`)
- `golden_examples.jsonl` (protégé)

**Pruner :**
- Supprimer les notes qui deviennent des stubs vides après 3 semaines sans utilisation
- Marquer les priors causaux invalidés par la télémétrie (ne pas effacer — mettre `status: invalidated + reason`)

---

## Liens
- [[../000_HOME|Home MOC]]
- [[../doctrine/studio-doctrine|Doctrine]]
