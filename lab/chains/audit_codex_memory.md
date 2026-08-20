# Audit mémoire technique Rocky
Date: 2026-06-01
claim_verdict: NO_CLAIM_ALLOWED

Scope: extraction lecture seule — git log, docs maîtres, sources Rust/Python.
Aucune modification de fichier source. Aucun commit.

---

## Positifs (golden examples architecture)

```json
{
  "type": "POSITIVE",
  "situation": "Ambiguïté entre docs et code sur l'état d'une feature",
  "decision": "Le code source actif gagne sur toute documentation ou roadmap. L'ordre d'autorité est : code actif > artefacts de build/runtime > benchmarks > docs actuels > docs historiques.",
  "justification": "Évite les faux positifs où une doc décrit une feature jamais implémentée ou déjà supprimée.",
  "source": "00_STUDIO_CONTROL/00_MASTER_DOCS/05_ARCHITECTURE.md:1-11"
}
```

```json
{
  "type": "POSITIVE",
  "situation": "Toute décision d'architecture sur Search vs Neural",
  "decision": "Search reste l'autorité finale. Neural propose et re-rank ; il ne décide jamais seul.",
  "justification": "Toutes les branches non-Random de decision.rs (Heuristic, Neural, Minimax, Hybrid) routent via search_authority_trace → search_root_via_adapter. La SelectionAuthority est toujours Search dans ce chemin.",
  "source": "src/chess/decision.rs:147-160 + AGENTS.md:53-54 + 05_ARCHITECTURE.md:55-56"
}
```

```json
{
  "type": "POSITIVE",
  "situation": "Séparation des états d'une source dans le control-plane",
  "decision": "created != registered != loaded != enforced != evidenced. Une source doit être registered, loaded, enforced ET evidenced avant de gouverner une tâche active.",
  "justification": "Evite de traiter une mémoire conversationnelle ou un fichier local nouvellement créé comme une vérité chargée dans le projet.",
  "source": "AGENTS.md:27-34"
}
```

```json
{
  "type": "POSITIVE",
  "situation": "Output d'un run de cost_search (Rocky diagnostics)",
  "decision": "Le chemin de sortie est vérifié au moment de l'écriture : rejet de latest.json, de lab/runs/RUN_*, de tout alias 'latest'. Seul le sous-chemin lab/gameplay_observation/sandbox_outputs/rocky_cost_search/<run_id> est autorisé.",
  "justification": "Empêche la création d'artefacts canoniques par accident depuis le code Rust lui-même.",
  "source": "src/chess/cost_search_observability.rs:12-44 + 296-301"
}
```

```json
{
  "type": "POSITIVE",
  "situation": "Séparation Rust / Python dans le runtime",
  "decision": "Rust possède la vérité runtime (board, legal moves, search, decision routing, teacher generation). Python possède ML et l'orchestration (validation, tensorisation, training, inference service).",
  "justification": "Permet de faire évoluer le pipeline ML sans toucher au runtime de jeu, et vice-versa.",
  "source": "AGENTS.md:51-55 + 05_ARCHITECTURE.md:251-288"
}
```

```json
{
  "type": "POSITIVE",
  "situation": "Data flow du pipeline teacher→training→inference",
  "decision": "1. Rust teacher génère des samples → 2. Export JSONL+manifest → 3. Python validate (fail-closed) → 4. Training écrit checkpoints → 5. Rust neural agent charge le modèle via Python bridge → 6. Tournament outputs = surface benchmark.",
  "justification": "Pipeline séquentiel avec porte de validation avant chaque étape critique.",
  "source": "05_ARCHITECTURE.md:352-357"
}
```

```json
{
  "type": "POSITIVE",
  "situation": "HumanGate comme mécanisme de promotion scoped",
  "decision": "HumanGateAuthorization est un struct Rust fail-closed : blocks_dataset_use(), blocks_training_use(), blocks_chess960_activation(), blocks_claim_publication(). Chaque scope est orthogonal (DatasetCandidate n'autorise pas TrainingAdmission).",
  "justification": "Rend impossible de glisser d'une autorisation d'observation à une autorisation de training par défaut.",
  "source": "src/core/human_gate.rs:1-158"
}
```

```json
{
  "type": "POSITIVE",
  "situation": "Suppression du pipeline S-7 (select_root_move + fork detection)",
  "decision": "select_root_move, root_practical_score, apply_root_practical_adjustments, is_root_fork_move, et helpers de fork detection supprimés. La sélection root est maintenant pure argmax sur le score alpha-beta.",
  "justification": "Code mort supprimé ; élimine le risque d'invariant call-order implicite post-simulation (issue #17) et le coût caché opponent_worst_case_value en root (issue #18).",
  "source": "git commit 90fe323 + 06_KNOWN_ISSUES.md:issue17-18"
}
```

```json
{
  "type": "POSITIVE",
  "situation": "Hachage de position pour TT et répétitions",
  "decision": "position_key migré vers Zobrist standard (u64 par (pièce, case, camp) + droits de roque + fichier en-passant). current_repetition_key idem, n'inclut pas halfmove_clock.",
  "justification": "Élimine le risque de collision du hash non-Zobrist (issue #16) et le biais de détection de répétition incluant halfmove_clock (issue #7 résidu).",
  "source": "git commit 28c9cc5 + f758ff4 + 06_KNOWN_ISSUES.md:issue16"
}
```

```json
{
  "type": "POSITIVE",
  "situation": "Convention de score negamax dans l'arbre alpha-beta",
  "decision": "Scores toujours depuis la perspective du joueur to_move. Stalemate et répétition threefold retournent draw_score() (pas evaluate()). Détection checkmate et fenêtre d'aspiration pour mate scores corrigées.",
  "justification": "Bug de convention (scores du point de vue du camp fixe plutôt que du joueur courant) produisait des évaluations inversées.",
  "source": "git commit 6875b43 + 06_KNOWN_ISSUES.md:removed-negamax-bug"
}
```

```json
{
  "type": "POSITIVE",
  "situation": "Validation des verdicts dans chaque rapport final",
  "decision": "Tout output d'automatisation doit séparer software_verdict / evidence_verdict / claim_verdict. claim_verdict reste toujours NO_CLAIM_ALLOWED sauf décision humaine explicite.",
  "justification": "Empêche la confusion entre santé logicielle, preuve expérimentale et claim scientifique.",
  "source": "AGENTS.md:5-10 + AUTOMATION_CONTROLLER_CONTRACT.md:219-234"
}
```

---

## Négatifs (rejets documentés)

```json
{
  "type": "NEGATIVE",
  "situation": "Migration search_root vers &mut Engine pour éliminer le clone",
  "rejection": "Option A (unsafe ptr cast) refusée. Option B (&mut Engine) crée une cascade trop invasive : decision.rs::search_authority_trace prend engine: &Engine, PassiveSearchBackendAdapter stocke &'a Engine, search_root est pub donc tous les consommateurs (cli, neural_agent) cassent, simulation_runner::maybe_log_move_weaknesses se propage.",
  "alternative": "Clone conservé intentionnellement (issue #2 ACTIVE). Prochaine tentative requiert HumanGate.",
  "source": "06_KNOWN_ISSUES.md:issue2 (note 2026-05-30)"
}
```

```json
{
  "type": "NEGATIVE",
  "situation": "Utiliser NeuralPolicyValue comme interface neural active",
  "rejection": "NeuralPolicyValue reste paper-only candidate. Aucune implémentation autorisée. Les adapters PP18 sont docs-only/planning.",
  "alternative": "Neural passe uniquement par NeuralAgent::select_action avec bridge Python. Search reste l'autorité finale.",
  "source": "05_ARCHITECTURE.md:58-59 + 06_KNOWN_ISSUES.md:issue11"
}
```

```json
{
  "type": "NEGATIVE",
  "situation": "Activer Chess960 dans le runtime",
  "rejection": "castling_spec.rs::empty_squares() et attacked_squares() retournent des indices hardcodés (5,6 pour queenside; 1,2,3 pour queenside) — corrects pour castling classique, silencieusement faux pour toute position non-classique. Zero test unitaire pour cette logique.",
  "alternative": "Chess960 runtime : BLOCKED. Activation requiert calcul dynamique depuis king_start/king_final/rook_start/rook_final + tests.",
  "source": "06_KNOWN_ISSUES.md:issue24 + src/chess/castling_spec.rs"
}
```

```json
{
  "type": "NEGATIVE",
  "situation": "Utiliser le benchmark ou le holdout comme preuve",
  "rejection": "latest_benchmark_summary.json rapporte benchmark_status: timeout. Même quand le benchmark tourne, il est health/exploration seulement, pas preuve de force ou d'Elo.",
  "alternative": "Les résultats de benchmark sont des artefacts passifs non-canoniques sous lab/gameplay_observation/.",
  "source": "06_KNOWN_ISSUES.md:issue6 + AUTOMATION_CONTROLLER_CONTRACT.md:claim-policy"
}
```

```json
{
  "type": "NEGATIVE",
  "situation": "Créer lab/runs/RUN_* ou latest.json depuis l'automatisation",
  "rejection": "Actions FORBIDDEN dans tous les contextes (LANE_MATRIX, CONTROLLER_CONTRACT, AGENTS.md). Stop condition immédiate si demandé.",
  "alternative": "Outputs de runs sous lab/gameplay_observation/sandbox_outputs/ uniquement, marqués non-canoniques.",
  "source": "AUTOMATION_LANE_MATRIX.md:107-113 + AGENTS.md:66-69"
}
```

```json
{
  "type": "NEGATIVE",
  "situation": "Broad-refactor engine, search, neural ou runtime",
  "rejection": "Interdit explicitement sans plan de validation séparé et HumanGate. Le risque de régression non détectée est trop élevé.",
  "alternative": "Micro-PR ciblées sur un surface à la fois, avec tests mécaniques ciblés.",
  "source": "AGENTS.md:71 + 06_KNOWN_ISSUES.md:issue11-recommendation"
}
```

```json
{
  "type": "NEGATIVE",
  "situation": "Réinitialiser le dataset avant contrats action/observation stables",
  "rejection": "Dataset reset est FORBIDDEN. Les labels requièrent ActionId, LegalAction, ActionMask, provenance, HumanGate, move_vocab_fingerprint, ruleset, variant, contamination_status.",
  "alternative": "Garder le dataset actif pointé par ACTIVE_DATASET.txt. Valider admissibilité via validate_am_dataset_admission(row) fail-closed.",
  "source": "AGENTS.md:67 + 05_ARCHITECTURE.md:dataset-path-semantics"
}
```

```json
{
  "type": "NEGATIVE",
  "situation": "Dataset router en mode directory-path (dataset root adaptatif)",
  "rejection": "ml/dataset_decision_router.py traite un input directory comme un fichier JSONL → Permission denied. Reproduit : dataset_loader.validate_training_dataset_path(Path('lab/dataset')) accepte le répertoire mais dataset_decision_router.py --input lab/dataset échoue.",
  "alternative": "Router doit déléguer à dataset_loader.load_dataset_rows ou brancher explicitement pour les dataset roots (issue #3 ACTIVE).",
  "source": "06_KNOWN_ISSUES.md:issue3"
}
```

---

## Patterns de code Rocky

### Pattern 1 — Decision routing : Search toujours autorité
```rust
// src/chess/decision.rs:109-123
// Toutes les branches non-Random → search_authority_trace
match resolved_mode {
    DecisionMode::Random => choose_random(...),
    DecisionMode::Heuristic => search_authority_trace(...),
    DecisionMode::Neural    => search_authority_trace(...),
    DecisionMode::Minimax   => search_authority_trace(...),
    DecisionMode::Hybrid    => search_authority_trace(...),
}
// search_authority_trace assigne toujours SelectionAuthority::Search
```
- Rôle : garantit que Neural ne peut jamais être selection_authority dans ce chemin.
- Contrainte clé : NeuralAgent n'est PAS appelé ici. Il est appelé depuis simulation_runner si mode explicitement neural.

### Pattern 2 — HumanGate fail-closed scoped
```rust
// src/core/human_gate.rs:140-158
// blocks_* : true par défaut, false seulement si scope exact + decision exact
pub fn blocks_dataset_use(&self) -> bool {
    !self.approves_downstream_use() || self.scope != HumanGateScope::DatasetLabelPromotion
}
fn approves_downstream_use(&self) -> bool {
    self.authorized && self.decision == HumanDecision::ApproveForDatasetCandidate
}
```
- Rôle : porte de promotion scoped. Chaque niveau (observation, dataset, training, chess960, claim) est orthogonal.
- Contrainte clé : Python ne peut pas être operator_source d'autorité — il est metadata only (test l.438-459).

### Pattern 3 — Output path enforcement Rust
```rust
// src/chess/cost_search_observability.rs:12-17
const SAFE_ROUTE: [&str; 4] = [
    "lab", "gameplay_observation", "sandbox_outputs", "rocky_cost_search",
];
// reject_forbidden_output_path vérifie latest.json, lab/runs/RUN_*, SAFE_ROUTE
```
- Rôle : enforce la politique d'output non-canonique directement dans le code Rust.
- Contrainte clé : ne peut pas être contourné par config ; la vérification est dans la librairie.

### Pattern 4 — NeuralAgent : retour garanti + tracking purity violations
```rust
// src/agents/neural_agent.rs:434-791
// Toujours retourne une Action (jamais panic/None en prod)
// 3 niveaux : Python success → rerank → fallback_action_from_legal
// TCS_BENCHMARK_PURITY=1 : compte les purity_violations via NEURAL_RUNTIME_COUNTERS
```
- Rôle : robustesse — même en cas d'échec bridge Python, le moteur continue.
- Contrainte clé : en mode benchmark purity, chaque fallback est compté comme violation (purity_violations counter).

### Pattern 5 — Feature flags env-var TCS_*
Pattern récurrent dans tout le codebase :
```rust
fn feature_enabled() -> bool {
    std::env::var("TCS_FEATURE_NAME")
        .map(|v| v.trim().to_ascii_lowercase())
        .map(|v| v == "1" || v == "true" || v == "yes" || v == "on")
        .unwrap_or(false) // ou true selon le défaut
}
```
- Flags connus : TCS_DEBUG, TCS_SEARCH_RUNTIME_DIAG, TCS_WEAKNESS_LOG, TCS_TIMING, TCS_VERBOSE_NEURAL, TCS_BENCHMARK_PURITY, TCS_MEMORY_CORE, TCS_RETRIEVAL, TCS_NEURAL_FINISH_MODE, TCS_NEURAL_PRESSURE_MODE, TCS_RULE_ANTI_REPETITION, etc.
- Rôle : opt-in pour diagnostics coûteux, sans recompiler.
- Contrainte clé : TCS_SEARCH_RUNTIME_DIAG gate build_root_diagnostics (résout issue #23).

### Pattern 6 — Simulation/undo pour scoring sans cloner
```rust
// src/agents/neural_agent.rs:1670-1776 (finish_mode_score)
let mut sim = engine.clone(); // clone local pour rerank uniquement
let Some(undo) = sim.simulate_action_for_search(...) else { return out; };
// ... scoring ...
let _ = sim.undo_action_for_search(undo);
```
- Rôle : permet d'évaluer les coups dans le rerank sans modifier l'état racine.
- Contrainte clé : clone ici est intentionnel et local au rerank (≠ clone dans search_root qui est l'issue #2).

---

## Doctrines opérationnelles

Par fréquence d'apparition dans le repo (docs + code + commits) :

### 1. claim_verdict: NO_CLAIM_ALLOWED (fréquence maximale)
Apparaît dans : AGENTS.md, 05_ARCHITECTURE.md, 06_KNOWN_ISSUES.md, AUTOMATION_CONTROLLER_CONTRACT.md, AUTOMATION_LANE_MATRIX.md, et chaque rapport de session.
Règle : aucun output d'automatisation ne peut réclamer Elo, force, promotion, preuve scientifique, holdout, ou benchmark proof.

### 2. Trois verdicts séparés (fréquence très haute)
```
software_verdict:  <état du code seulement>
evidence_verdict:  <preuve mécanique ciblée seulement>
claim_verdict:     NO_CLAIM_ALLOWED
```
Chaque rapport final doit les séparer. La mécanique ne se convertit pas en preuve scientifique.

### 3. Search = autorité finale, Neural = propose seulement (fréquence haute)
- AGENTS.md:53-54
- 05_ARCHITECTURE.md:55-56 (et tableau PP9-PP19 ligne 55)
- decision.rs:147-160 (code)
- Commit historique : tous les modes non-Random routent via search_authority_trace

### 4. created != registered != loaded != enforced != evidenced (fréquence haute)
Source anchoring rule dans AGENTS.md. S'applique à toute source, doc, ou état local.

### 5. Lanes : SAFE_AUTO / AUDIT_REQUIRED / HUMAN_REQUIRED / FORBIDDEN
- SAFE_AUTO : docs, fixtures, schemas, non-canonical reports
- AUDIT_REQUIRED : src/learning, src/puzzle, src/train, validators
- HUMAN_REQUIRED : scripts/, .github/, guard, CI, runtime wiring
- FORBIDDEN : push main, force-push, benchmark as proof, holdout, dataset reset, RUN_*, latest.json, Elo/strength claims

### 6. HumanGate requis pour activation, promotion, merge, claim (fréquence haute)
AGENTS.md + AUTOMATION_CONTROLLER_CONTRACT.md + 05_ARCHITECTURE.md.
HumanDecision = autorité finale pour : politique, guard, CI, merge override, freeze, promotion, claim.

### 7. Stop conditions STOP_AUTOMATION (fréquence moyenne)
Kill switch projet. Toute automatisation → report-only immédiatement. Cleared seulement par instruction humaine explicite.

### 8. Validation discipline (fréquence moyenne)
- Docs-only : git diff --check + readback
- Code : smallest relevant targeted tests
- Skipped validation doit être justifié explicitement
- Ne jamais utiliser les runs de performance comme preuve

---

## Surprises techniques

### S-1 — Contradiction commit #9e17493 vs Issue #2
Commit `9e17493` titre : "perf(search): remove root engine clone, pass &mut Engine to search_root".
Mais Known Issues #2 (ACTIVE) note 2026-05-30 : "clone conservé intentionnellement. Option B (&mut Engine) cascade trop invasive."
**Interprétation** : soit la migration a été tentée puis partiellement annulée, soit elle est plus limitée que son titre ne le suggère. L'issue #2 est la vérité canonique pour l'état actuel : le clone existe encore dans search_root_with_context. Source: 06_KNOWN_ISSUES.md:issue2.

### S-2 — NeuralAgent::select_action est monolithique (3346 lignes)
Le fichier couvre bridge Python, inference, retry, rerank (trade/finish/pressure/anti-stall/retrieval/tactical/memory), modular rules, contextual profiles, telemetry. Issue #9 documente ce fait mais qualifie le refactor de "ticket lecture seule ou plan de split seulement, pas de refactor neural broad". Source: src/agents/neural_agent.rs (3346 lignes) + 06_KNOWN_ISSUES.md:issue9.

### S-3 — validate_selection_authority est dead code (issue #21)
`src/chess/decision_trace.rs::validate_selection_authority` rejette "neural"/"critic"/"llm" comme autorité finale. Mais zéro appelant de production confirmé. La production utilise `chess::decision::DecisionTrace` (different struct) pas `chess::decision_trace::DecisionTrace`. L'invariant tient par architecture, pas par runtime enforcement. Source: 06_KNOWN_ISSUES.md:issue21.

### S-4 — Deux structs DecisionTrace dans chess:: (issue #22)
- `chess::decision::DecisionTrace` : champs selected_action, mode, selection_authority, used_search, root_search. Utilisé en production.
- `chess::decision_trace::DecisionTrace` : champs state_key, legal_action_ids, selection_authority: Option<String>, serializable. Zéro appelant production.
Source: 06_KNOWN_ISSUES.md:issue22.

### S-5 — terminal_score dégrade le bonus mat avec la longueur totale de partie (issue #15 actif)
```rust
// src/chess/eval.rs (non lu directement, mais documenté)
terminal_score = 900_000 - action_log.len() * 10
```
Un mat-en-1 au coup 100 score ~99 000 points de moins qu'au coup 5. Bug de convention : devrait être `900_000 - ply_to_mate * 10`. Source: 06_KNOWN_ISSUES.md:issue15.

### S-6 — Un seul TODO dans tout src/ + ml/ (très propre)
`git grep TODO/FIXME/HACK/XXX` retourne 1 résultat : `ml/claude_bridge.py:40 "TASK-XXX"` (placeholder dans un template). Le codebase Rust ne contient aucun TODO ni FIXME. Source: git grep résultat.

### S-7 — cost_search_observability.rs enforce la politique d'output en Rust
La politique FORBIDDEN (pas de latest.json, pas de lab/runs/RUN_*) est codée directement dans `reject_forbidden_output_path()` appelée au moment de l'écriture. Pas seulement dans les docs ou le guard Python. Source: src/chess/cost_search_observability.rs:296-301.

### S-8 — DecisionMode::Neural route vers Search (pas vers NeuralAgent)
Dans decision.rs, choisir mode "neural" appelle search_authority_trace → search_root_via_adapter. NeuralAgent::select_action n'est PAS appelé dans ce chemin. Le neural agent en production est invoqué directement depuis simulation_runner avec routing explicite (fix commit c0ebf62). Source: src/chess/decision.rs:121 + git commit c0ebf62.

---

## Statistiques
- Commits analysés: 50 (git log -50)
- Positifs extraits: 11
- Négatifs extraits: 8
- Patterns de code extraits: 6
- Doctrines opérationnelles: 8
- Surprises techniques: 8
- TODOs trouvés dans src/: 0
- TODOs trouvés dans ml/: 1 (claude_bridge.py:40 placeholder)
- Issues actives dans 06_KNOWN_ISSUES.md: ~14 (numéros 1-3, 5-6, 8-12, 15, 19-22, 24-25)
- Issues résolues depuis la dernière session: 7 (issues #7 résidu, #16, #17, #18, #23, #26, Rocky explosion)

---

```
Fichier produit: lab/chains/audit_codex_memory.md
Positifs extraits: 11
Négatifs extraits: 8
Surprises: 8
TODOs trouvés: 1 (ml uniquement, placeholder)

software_verdict: DOCS_OK — fichier produit, lecture seule respectée, aucune modification de source
evidence_verdict: MECHANICAL_VALIDATION_ONLY — extraction fidèle depuis git log + lecture fichiers
claim_verdict:    NO_CLAIM_ALLOWED
```

Aucun commit. Pierre valide le contenu avant injection dans golden_examples.jsonl.
