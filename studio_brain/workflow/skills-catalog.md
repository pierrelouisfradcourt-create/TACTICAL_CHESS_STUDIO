# Skills Catalog — TCS
#workflow #reference

> 33 skills dans `.claude/skills/`, groupées par finalité.
> Invocation : `/skill-name` dans la session Cowork ou Claude Code.
> Source : `.claude/skills/*/skill.md`
> Date de dernière révision : 2026-06-28

---

## Mécanique de délégation

| Cas | Qui exécute | Comment |
|---|---|---|
| Skill **léger** (lecture seule, analyse, court) | Cowork lui-même | Lit `skill.md`, exécute inline |
| Skill **lourd** (écriture, multi-étapes, build) | Sous-agent sonnet | Cowork pilote Claude Code via Agent SDK |
| `claude --print` dans le sandbox | **INTERDIT** | Non authentifié — ne jamais appeler l'API Anthropic externe |

> Règle : si le skill écrit du code ou fait plusieurs appels, déléguer à un sous-agent sonnet. Sinon exécuter localement.

---

## Groupe : Workflow (pilotage de session)

> Couvrent le cycle de vie d'une tâche : planifier, démarrer, finir proprement.

| Skill | Quand l'invoquer |
|---|---|
| `/plan` | Avant toute implémentation — génère le plan + red-team avant de coder |
| `/sprint-plan` | En début de sprint — sélectionne les IMPs à traiter |
| `/sprint-status` | Point d'avancement mid-sprint ou sur demande |
| `/imp-readiness` | Vérifier si un IMP est prêt à être pickup (deps, scope, verdict) |
| `/estimate` | Estimer l'effort et le risque d'un IMP ou feature |
| `/scope-check` | Valider que le scope proposé est réaliste avant de commencer |
| `/start` | Initialise une session de travail sur un IMP (contexte, checklist) |
| `/handoff` | Clôture une session, génère le COWORK_CONTEXT pour la suivante |
| `/release` | Pipeline complet de release (build, test, tag, changelog) |
| `/hotfix` | Correctif urgent en prod sans passer par le cycle normal |
| `/gate` | Soumettre une décision irréversible à HumanGate (Pierre tranche) |
| `/gate-check` | Vérifier si une action nécessite un HumanGate avant d'agir |

---

## Groupe : Game / TCS (exécution technique)

> Couvrent la production directe du jeu et du moteur.

| Skill | Quand l'invoquer |
|---|---|
| `/balance-check` | Analyser les courbes de balance (headless_sim, variants/*.json) |
| `/playtest` | Formaliser une session playtest : protocole, métriques, verdict |
| `/design-review` | Relire une feature game design avant implémentation |
| `/architecture-review` | Revoir une décision d'architecture (Godot/Rust/pipeline) |
| `/perf-profile` | Profiler un goulot identifié avant d'optimiser |
| `/brainstorm` | Session idéation ouverte (hook, mécanique, titre) |
| `/code-review` | Review diff en cours (working branch), avant merge Pierre |
| `/joust` | Tournoi Rocky — confrontation moteur vs référence Stockfish |
| `/league` | Session de league chess ML — batch matchs ELO |
| `/fog` | Analyse brouillard de guerre : identifier les inconnues critiques |
| `/tick` | Avancement cadencé (heartbeat d'un agent long) |

---

## Groupe : Supervision (hygiène & santé du studio)

> Couvrent la surveillance, la dette, et la cohérence de l'ensemble.

| Skill | Quand l'invoquer |
|---|---|
| `/smoke-check` | Oracle rapide : build vert ? tests passent ? ledger cohérent ? |
| `/audit-daily` | Audit quotidien d'hygiène (fichiers orphelins, TODO stale, etc.) |
| `/monitor` | Surveillance continue d'un processus long (entraînement ML, build CI) |
| `/verdict` | Produire un verdict signé (software/evidence/claim) sur un IMP |
| `/council` | Conseil multi-perspectives : red-team d'une décision importante |
| `/autoloop` | Boucle kaizen autonome (désactivée en pré-revenu — HumanGate requis) |
| `/reanchor` | Recalage stratégique quand la direction dérive |
| `/tech-debt` | Inventorier et prioriser la dette technique actuelle |

---

## Liens
- [[studio-operating-flow|Operating Flow]] — boucle complète d'opération du studio
- [[../reference/sources-of-truth|Sources de Vérité]]
- [[../doctrine/studio-doctrine|Doctrine]]
