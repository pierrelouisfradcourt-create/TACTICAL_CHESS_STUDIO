# Rocky Error-To-Puzzle Roadmap V0

Status: DOCUMENTED_ONLY
Surface: roadmap_docs_only
Runtime authority: NONE
Implementation claim: NO
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation: BLOCKED
Agent activation: BLOCKED
Claim posture: NO_CLAIM_ALLOWED

Spec source: `docs/control-plane/ROCKY_ERROR_TO_PUZZLE_CURRICULUM_V0.md`

Chaine V0 preservee:

`error -> position -> puzzle -> replay test -> human explanation -> correction tracking`

Ce document transforme la spec V0 en roadmap phasee. Il est docs-only. Il ne modifie pas le runtime, les tests, le training, les benchmarks, les datasets, Chess960, ni DecisionController.

## 1. Statut par surface

| Surface | Status | Notes |
|---|---:|---|
| V0 spec | DOCUMENTED_ONLY | Spec curriculum existante preservee comme source. |
| Roadmap | DOCUMENTED_ONLY | Ce fichier definit phases et garde-fous seulement. |
| Puzzle RNG / puzzle lab | PASSIVE | Reference brick for future verification; no auto-puzzle from Rocky errors is claimed here. |
| `puzzle_eval` | PASSIVE | Reference brick for future verification; no training signal is claimed here. |
| Auto-puzzle depuis vraies erreurs Rocky | NOT_FOUND | Boucle end-to-end absente. |
| Weakness/adaptive mix bricks | PASSIVE | Surfaces utiles pour audit; aucune promotion ici. |
| ActionMask / LegalAction / HumanGate | PASSIVE | Guardrail references for any future training candidate; no activation here. |
| Dataset non-mutating safety | BLOCKED | Requis avant tout usage dataset-facing. |
| Training / dataset promotion | BLOCKED | Hors scope et interdit. |
| Chess960 activation | BLOCKED | Demande explicite separee requise. |
| DecisionController activation | BLOCKED | Demande explicite separee requise. |

## 2. Decoupage scope

### Code actif

Status: DOCUMENTED_ONLY

Aucun code runtime n'est modifie par cette roadmap.

### Tests

Status: DOCUMENTED_ONLY

Aucun test n'est modifie. La phase 1 est une voie future tests-only, non implementee ici.

### Outputs / runtime artifacts

Status: BLOCKED

Cette roadmap ne genere aucun output runtime, dataset, `latest.json`, ni `lab/runs/RUN_*`.

### Docs canoniques

Status: DOCUMENTED_ONLY

Cette roadmap est un document control-plane derive de la spec V0.

### Roadmap / docs-only

Status: DOCUMENTED_ONLY

La roadmap phasee est le seul output prevu.

### Inference

Status: PASSIVE

Les surfaces Python ML / inference peuvent proposer ou rerank plus tard. Elles ne decident pas seules la verite label ni l'admissibilite training.

## 3. Actions interdites

- Modifier le code runtime.
- Modifier les tests.
- Lancer `cargo run`.
- Lancer training.
- Lancer benchmark.
- Generer datasets.
- Creer `latest.json`.
- Creer `lab/runs/RUN_*`.
- Activer Chess960.
- Activer DecisionController.
- Promouvoir des puzzles en labels dataset.
- Traiter neural, search, report ou log comme label truth sans HumanGate.

Chemin output futur sur demande explicite seulement:

- `lab/gameplay_observation/sandbox_outputs/error_puzzles/`

Chemins interdits pour cette roadmap:

- `latest.json`
- `lab/runs/RUN_*`
- Tout chemin dataset.
- Tout chemin training.
- Tout chemin benchmark canonique.

## 4. Regles d'autorite

Puzzle != dataset:

- Un ErrorPuzzle est un artefact diagnostic.
- Il n'est pas une ligne dataset.
- Il n'est pas training-ready.
- Il garde `dataset_admissible: false` jusqu'a un gate separe.

Puzzle != label truth:

- `observed_bad_move` enregistre le coup joue par Rocky.
- `candidate_better_move` est une correction candidate, pas une verite automatique.
- Le statut replay est une evidence de correction, pas une autorite dataset.

Source d'autorite de `candidate_better_move`:

- Autorite primaire: legal move generation plus evaluation search depuis la position capturee.
- Neural peut proposer ou rerank seulement.
- HumanGate est requis avant tout usage training-facing.
- Search reste l'autorite technique finale pour legalite et correction tactique, mais search seul n'est pas label truth dataset.

Criteres `solved` / `failed` / `regressed`:

- `solved`: le HEAD courant choisit ou atteint la correction acceptee dans la fenetre replay declaree.
- `failed`: le HEAD courant repete l'erreur observee ou n'atteint pas la correction acceptee.
- `regressed`: un puzzle precedemment solved devient failed sur un HEAD ulterieur.
- `rejected`: evidence source invalide, ambigue, illegale, contaminee, ou rejetee par HumanGate.
- `accepted`: puzzle candidat passe schema, legalite, provenance et revue, sans impliquer solved.
- `candidate`: extrait mais non accepte.

Signaux de difficulte:

- Delta search entre coup observe et correction candidate.
- Motif tactique.
- Longueur de ligne solution.
- Nombre d'alternatives legales proches du meilleur coup.
- Stabilite replay entre HEADs.
- Frequence des echecs apparentes.
- Complexite de l'explication humaine.

## 5. Relation avec observabilite A/B/C

Status: DOCUMENTED_ONLY

Les couches observabilite existantes ou futures sont des inputs read-only:

- A: resume leger pour tous les games.
- B: details pour game IDs selectionnes.
- C: anomaly reports.
- D: futur curriculum error-to-puzzle depuis echecs selectionnes.

Layer D consomme A/B/C en lecture seule. Elle ne mute pas les rapports, ne publie pas de runtime truth, ne cree pas de labels training, et ne cree pas de lignes dataset. Les rapports A/B/C peuvent identifier des states of interest, mais ne peuvent pas autoriser seuls acceptance puzzle ou promotion training.

## 6. Phases

### Phase 0 - Spec hardening

Status: DOCUMENTED_ONLY

Definir:

- Puzzle != dataset.
- Puzzle != label truth.
- `candidate_better_move` requiert legalite plus evidence search.
- Neural propose/rerank seulement.
- HumanGate requis avant usage dataset-facing.
- Semantique `candidate`, `accepted`, `solved`, `failed`, `regressed`, `rejected`.
- Signaux difficulte: search delta, motif, longueur, ambiguite, stabilite replay, frequence, explication.

Exit evidence:

- Roadmap control-plane existe.
- Actions et chemins interdits explicites.

### Phase 1 - Schema fixture, tests-only

Status: DOCUMENTED_ONLY

Travail futur:

- Fixture JSON `ErrorPuzzle`.
- Fixture Markdown explanation.
- Statuts lifecycle:
  - `candidate`
  - `accepted`
  - `solved`
  - `failed`
  - `regressed`
  - `rejected`

Contraintes:

- Tests-only.
- Aucun generateur runtime.
- Aucune mutation dataset.
- Aucun training.

### Phase 2 - Read-only extractor audit

Status: DOCUMENTED_ONLY

Sources a inspecter:

- `weakness_log`
- Echecs `puzzle_eval`
- Echecs `conversion_suite`
- Futurs anomaly reports A/B/C

Output autorise:

- Rapport d'audit seulement.

Outputs interdits:

- Puzzle JSON.
- Dataset output.
- `latest.json`.
- `lab/runs/RUN_*`.

### Phase 3 - Level 1 generator

Status: DOCUMENTED_ONLY

Scope futur:

- Erreurs tactiques locales seulement.
- Mate in 1.
- Piece en prise.
- Capture evidente.
- Tactique defensive simple.

Output autorise:

- `lab/gameplay_observation/sandbox_outputs/error_puzzles/`

Interdit:

- `latest.json`
- `lab/runs/RUN_*`
- Chemins dataset.
- Chemins training.

### Phase 4 - Replay runner

Status: DOCUMENTED_ONLY

Scope futur:

- Rejouer les puzzles generes.
- Suivre `solved`, `failed`, `regressed` par git HEAD.
- Preserver puzzle ID source et provenance.

Interdit:

- Training.
- Promotion dataset.
- Claim benchmark.

### Phase 5 - Human explanation Markdown

Status: DOCUMENTED_ONLY

Scope futur:

- Expliquer l'erreur observee.
- Expliquer la correction attendue.
- Lier le rapport source.
- Marquer `HumanGate required`.
- Preserver l'incertitude si evidence incomplete.

Statuts requis:

- `humangate_required: true`
- `dataset_admissible: false`

### Phase 6 - Level 2 clusters

Status: DOCUMENTED_ONLY

Scope futur:

- Echecs conversion repetes.
- Patterns drawish.
- Bad exchange patterns.
- Patterns rerank/fallback.
- Priority queue pour ordre de revue.

Contraintes:

- Non-training.
- Priority queue = triage seulement.
- Search reste autorite finale.

### Phase 7 - Level 3 scenarios

Status: DOCUMENTED_ONLY

Scope futur:

- Echecs strategiques longs.
- Faiblesse style exploiter/adversary.
- Explication humaine requise.

Interdit:

- Ligue autonome.
- Activation training.
- Promotion dataset.

### Phase 8 - Training candidate gate, blocked

Status: BLOCKED

Pre-requis avant deblocage futur:

- ActionId.
- LegalAction.
- ActionMask.
- Provenance.
- HumanGate.
- Contamination status.
- Dataset non-mutating safety.

Regle courante:

- Reste BLOCKED.
- Aucun puzzle output n'est training-ready.
- Aucun replay result n'est label truth seul.

## 7. Rationale scientifique

Prioritized replay:

- Les erreurs reelles Rocky sont des states of interest plus utiles que positions aleatoires.
- Les rejouer detecte solved, failed, regressed sur faiblesses connues.
- La priorite controle l'ordre de revue, pas l'autorite training.

Teacher-student curriculum:

- Search peut servir de teacher pour corrections tactiques candidates.
- Rocky est le student dont les erreurs definissent le curriculum.
- HumanGate empeche la sortie teacher de devenir label dataset non verifie.

Search-control from states of interest:

- Observabilite A/B/C et failure reports identifient les positions a approfondir.
- Search evalue les corrections locales depuis ces positions.
- Le processus reste diagnostic jusqu'a un gate training separe.

AlphaStar exploiter idea, scaled down for solo studio:

- Au lieu d'une ligue autonome, les classes d'echecs repetes deviennent des probes type exploiter.
- Forme reduite: offline, inspectee, puzzle-based.
- Requiert explication humaine et ne lance aucun training adversarial autonome.

## 8. Drift documentaire

Status: DOCUMENTED_ONLY

Decalage possible:

- Puzzle RNG et `puzzle_eval` sont des references passives a verifier dans une tache separee.
- Auto-puzzle depuis vraies erreurs Rocky end-to-end reste NOT_FOUND.
- Tout master doc indiquant aucune implementation puzzle peut etre stale ou scope differemment.
- Cette roadmap ne modifie pas les master docs.

## 9. Final status block

software_verdict: ROCKY_ERROR_TO_PUZZLE_ROADMAP_DOCS_ONLY

evidence_verdict: V0_SPEC_HARDENED_INTO_PHASED_ROADMAP_NO_RUNTIME_CHANGE

claim_verdict: NO_CLAIM_ALLOWED
