# ROCKY_OBSERVATION_PROTOCOL_V0

## Status

- status: observation and dataset-safety protocol
- scope: bounded trace observation and future dataset hygiene
- claim level: very low / safe
- implementation status: documentation only
- schema status: non-schema protocol
- dataset status: no dataset creation
- HumanGate required: yes

## Purpose

This protocol defines how to observe Rocky/runtime behavior on bounded cases while preventing future dataset contamination from current monolith traces.

This protocol extracts existing observation doctrine. It is not a new architecture, not a new SSOT, and not an implementation authority.

This protocol does not prove that Rocky is strong. It defines how Rocky/runtime traces should be observed on bounded cases.

Raw monolith/runtime traces may be archived as observations. They must not become training labels without stable layer attribution, legality provenance, action identity, and HumanGate authorization.

Chess960 readiness depends on decomposition stability: variant/ruleset metadata, FEN/castling contract clarity, legal action identity, action masks, and attribution boundaries must be stable before Chess960 traces can be treated as dataset material.

## Existing Doctrine Sources

Source context only:

- `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md`
- `MASTER_DOCS/09_ROCKY_VARIANT_FREEZE.md`
- `MASTER_DOCS/CURRENT_STATE_INDEX.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_DECOMPOSITION_ROADMAP_V0.md`
- `docs/evidence/ROCKY_TRACE_EVIDENCE_SEED_V0_FORMAT.md`

These sources provide observation, evidence, decomposition, and claim-boundary context. This protocol does not replace them.

## Stable Layer Observation Model

The model below defines stable roles, not permanent file paths.

### Engine Layer

- role: legality, state transition, rules authority.
- observation: legal moves, applied move, state/result if visible.
- forbidden inference: engine strength or full correctness from one trace.

### Search Layer

- role: tactical evaluation / decision authority when applicable.
- observation: selected move, root decision, search diagnostics, depth/budget if visible.
- forbidden inference: global strength, benchmark value, or automatic dataset truth.

### Neural Layer

- role: suggestion, ordering, policy/value assistance, bridge signal where applicable.
- observation: neural status, fallback, candidate/rerank lines if visible.
- forbidden inference: neural superiority, learning quality, or final decision authority from one trace.

### Runtime/Rocky Layer

- role: bounded actor and data producer.
- observation: command execution, selected move, trace lines, runtime counters.
- forbidden inference: product readiness, autonomous agency, or training success.

### HumanGate

- role: final authority for claim, promotion, readiness, activation, dataset inclusion, and training authorization.

## Current Implementation Snapshot

This section is explicitly volatile.

Current implementation snapshot is not doctrine and may be updated after decomposition.

Current surfaces from PACK 7A:

- active runtime router: currently `src/chess/decision.rs`
- active search authority path: currently `search_root_with_context`
- current neural runtime path: currently `NeuralAgent`
- `SearchBackend`: passive
- `DecisionController`: passive
- `LegalAction` / `ActionId`: passive or partial
- `ActionMask`: not authoritative in Rust
- `NeuralPolicyValue`: paper-only candidate

Post Decision Authority Trace patch snapshot:

- `DecisionTrace` now carries explicit `selection_authority` evidence.
- `SelectionAuthority` values are `Search`, `Neural`, `Heuristic`, `Fallback`, and `Unknown`.
- Current active routing tags Minimax, explicit `DecisionMode::Heuristic`, and the Hybrid search branch as `Search`.
- Explicit `DecisionMode::Heuristic` now routes through `search_root_with_context`.
- Current active routing tags `DecisionMode::Neural` as `Neural`; this path still selects through `NeuralAgent`.
- Current active routing tags the Hybrid non-search branch as `Heuristic`.
- Current active routing tags Random mode as `Fallback`.
- `Unknown` remains available as an explicit authority variant for boundary completeness.
- `SearchBackend` remains PASSIVE.
- `DecisionController` remains PASSIVE.
- `ActionMask` remains PASSIVE and is not authoritative in active search.
- `LegalAction` / `ActionId` remain PASSIVE helper identity surfaces.

Current active routing must not be described as universally Search-final. Search authority coverage is stronger than before, but universal Search final authority remains a future/target doctrine unless and until the remaining Neural and Hybrid heuristic exceptions are removed by a later HumanGate-approved runtime patch.

Do not describe these current surfaces as permanent. Future observation should preserve layer roles while remapping implementation surfaces after decomposition.

## Minimal Observation Record

Future bounded observations should record, at minimum:

- command;
- environment;
- input;
- ruleset / variant label if applicable;
- decision mode;
- authority attribution;
- depth/budget;
- selected move if visible;
- legal move source if visible;
- raw output;
- trace excerpt;
- interpretation;
- limitations.

## Dataset Contamination Boundary

Raw trace output is observation, not training truth.

Selected move is not automatically a training label.

Neural suggestion is not final decision authority.

Search result is not proof of strength.

Engine legal move is not "best move".

Fallback/rerank are contamination metadata, not clean labels.

Monolith traces must not be used as canonical dataset rows without decomposition metadata.

Future training rows require explicit authority source and provenance.

Future dataset rows should identify, at minimum:

- input position / FEN / ruleset;
- variant label;
- decision mode;
- legal move source;
- selected move source;
- search authority source if applicable;
- neural suggestion source if applicable;
- fallback or failure reason if applicable;
- rerank status if applicable;
- ActionId / LegalAction version when stable;
- ActionMask / legal mask version when stable;
- move vocabulary / policy index version if applicable;
- trace artifact or command provenance;
- HumanGate authorization for training use.

This is guidance only, not a schema.

## ActionMask Authority Addendum

This addendum is authority guidance only. It does not create a schema, dataset file, evidence artifact, training authorization, or Chess960 activation.

Rust Engine legal action generation is the current legality source. Python `legal_mask` is an ML/training helper, not canonical legality authority. No Rust-side authoritative `ActionMask` contract is currently active.

Future dataset rows must not treat Python masks as proof of Rust legality. Future policy targets require a stable mask authority decision before they can be used as labels.

ActionMask authority must bind:

- Rust legal source;
- ActionId / LegalAction version;
- move_vocab fingerprint;
- policy_index provenance;
- variant / ruleset label;
- fallback/projection contamination metadata;
- HumanGate authorization.

Chess960 masks remain blocked until FEN/castling/action identity contracts are explicit.

| Surface | Current status | Dataset/training implication |
| --- | --- | --- |
| Rust legal move source | TESTED / source authority | usable for legality observation |
| ActionId | TESTED but unversioned / partial identity | not enough for dataset labels |
| LegalAction | TESTED/PASSIVE / bridge only | not active authority |
| Rust ActionMask | NOT_FOUND or BLOCKED | no canonical mask authority |
| Python legal_mask | IMPLEMENTED/PARTIAL | helper only; not canonical authority |
| move_vocab | IMPLEMENTED / policy universe | needs fingerprint persistence |
| policy_index | PASSIVE/PARTIAL / telemetry/compatibility | not label truth |
| fallback/projection behavior | IMPLEMENTED / contamination metadata | not clean labels |
| Chess960 mask identity | BLOCKED | no runtime/training use |

Until ActionMask authority is explicitly decided and versioned, policy targets and training labels remain blocked.

## Attribution Metadata Addendum

This addendum is metadata guidance only. It is not a schema, does not create or authorize dataset files, does not authorize training, and does not authorize Chess960 runtime evidence. HumanGate authorization is required before any observation metadata becomes dataset or training input.

Future observations should preserve these metadata meanings when visible:

| Field | Purpose | Allowed meaning | Forbidden inference |
| --- | --- | --- | --- |
| `decision_mode` | Identify how the move decision was made. | Records the declared route, such as search, neural-assisted, fallback, or manual gate context. | Does not prove quality, readiness, or that the route is stable for training. |
| `authority_source` | Attribute the authority behind the final decision. | Names the layer or gate that selected or authorized the observed move. | Does not turn any move into label truth. |
| `final_selected_move` | Preserve the move emitted by the observed run. | Observation of runtime output only. | Must not be treated as a training label. |
| `search_selected_move` | Preserve the move selected by search when separable. | Candidate future policy target only after gates and provenance checks. | Does not become policy truth without HumanGate and stable action contracts. |
| `search_best_move` | Preserve diagnostic search context. | Search-context evidence if directly visible. | Is not a training label unless explicitly promoted by HumanGate. |
| `neural_predicted_move` | Preserve neural proposal context. | Neural suggestion or proposal context. | Is not final authority or label truth. |
| `neural_policy_index` | Preserve neural compatibility context. | Policy-index compatibility metadata when visible. | Is not label truth or proof of vocabulary stability. |
| `rerank_status` | Identify whether reranking affected selection. | Contamination metadata describing rerank involvement or absence. | Does not create a clean target. |
| `fallback_reason` | Identify fallback involvement. | Contamination metadata describing why fallback was used, if known. | Does not validate the fallback move as quality or truth. |
| `legal_move_source` | Preserve legality provenance. | Source of legal moves or legality validation. | Supports legality provenance, not move quality. |
| `legal_action_version` | Preserve ActionId / LegalAction compatibility. | Version or fingerprint for stable legal-action identity when available. | Without stability, cannot support dataset or training use. |
| `action_mask_version` | Preserve legal-mask compatibility. | Version or fingerprint for the action mask when available. | Without stability, cannot support dataset or training use. |
| `move_vocab_fingerprint` | Preserve policy-vocabulary compatibility. | Fingerprint or version of the move vocabulary / policy index mapping. | Does not prove policy-index truth or training readiness. |
| `ruleset` | Identify the rule contract. | Explicit ruleset label required before Chess960-related evidence can be considered. | Does not authorize Chess960 runtime evidence. |
| `variant` | Identify the variant context. | Explicit variant label required before Chess960-related evidence can be considered. | Does not prove Chess960 readiness or runtime correctness. |
| `human_gate_authorization` | Record whether HumanGate approved dataset or training use. | Explicit HumanGate authorization status for any future promotion. | Absence of authorization blocks dataset/training use; presence does not prove quality. |

Doctrine:

- `final_selected_move` is observation, not a training label.
- `search_selected_move` may become a future policy-target candidate only after gates.
- `search_best_move` is diagnostic/context unless explicitly promoted by HumanGate.
- `neural_predicted_move` is proposal context, not authority.
- `neural_policy_index` is compatibility metadata, not label truth.
- `rerank_status` and `fallback_reason` are contamination metadata.
- `legal_move_source` supports legality provenance, not quality.
- `legal_action_version`, `action_mask_version`, and `move_vocab_fingerprint` are required before dataset/training use.
- `ruleset` and `variant` are mandatory before Chess960-related evidence can be considered.
- `human_gate_authorization` is required before any observation becomes dataset/training material.

| Signal | Default classification | Future use only after gates |
| --- | --- | --- |
| raw trace output | SAFE_OBSERVATION | Evidence context only; not label truth. |
| final selected move | UNSAFE_TRAINING_LABEL | Requires HumanGate, attribution, and stable action contracts. |
| search selected move | POTENTIAL_POLICY_TARGET_AFTER_GATES | Requires HumanGate, search authority attribution, and stable action contracts. |
| search best move | SAFE_EVIDENCE_CONTEXT | May become target material only if explicitly promoted by HumanGate. |
| neural predicted move | UNSAFE_TRAINING_LABEL | Requires HumanGate and separate authority decision; default is proposal context. |
| rerank selected move | CONTAMINATION_METADATA | Requires rerank provenance before any target use. |
| fallback move | CONTAMINATION_METADATA | Requires fallback provenance before any target use. |
| legal move list | POTENTIAL_MASK_CONTEXT_AFTER_GATES | Requires legal provenance and stable mask/action contracts. |
| ActionId / LegalAction | BLOCKED_OR_PARTIAL_UNTIL_STABLE | Requires stable legal-action versioning. |
| ActionMask / legal mask | BLOCKED_OR_PARTIAL_UNTIL_STABLE | Requires stable mask versioning and provenance. |
| policy index | SAFE_EVIDENCE_CONTEXT | Requires move-vocab fingerprint before dataset/training use. |
| game result | POTENTIAL_VALUE_TARGET_AFTER_GATES | Requires HumanGate, ruleset/variant metadata, and value-target policy. |
| search score | SAFE_EVIDENCE_CONTEXT | Context only unless later gated for a defined use. |
| neural value | BLOCKED | Requires explicit future gate and value semantics. |
| GAME_ANALYSIS_SUMMARY | SAFE_OBSERVATION | Observation summary only; not training truth. |
| NEURAL_MATCH_RUNTIME | CONTAMINATION_METADATA | Runtime contamination metadata only. |

## Good Observation Vs Bad Observation

Good observation:

- exact command;
- bounded input;
- raw output preserved;
- trace lines linked to raw output;
- decision mode recorded;
- layer attribution where possible;
- cautious interpretation;
- explicit non-claims.

Bad observation:

- edited raw output;
- missing input;
- missing command;
- missing decision mode;
- collapsing neural/search/engine signals;
- treating selected move as training truth;
- benchmark-like claims from one case;
- strength claims;
- hiding failures;
- interpreting warnings as evidence.

## Relationship To ROCKY_TRACE_EVIDENCE_SEED_V0

`ROCKY_TRACE_EVIDENCE_SEED_V0` is one artifact format using this protocol.

`RAW_OUTPUT.txt` remains the truth source.

`TRACE_EXCERPT.md` is a readable selection.

`INTERPRETATION.md` must not exceed `RAW_OUTPUT.txt`.

`LIMITATIONS.md` blocks claim escalation.

The artifact is trace-format evidence, not dataset truth.

## Relationship To Engine/Search/Neural Decomposition

This protocol observes stable roles, not frozen monolith file paths.

Current file/function mapping is a snapshot only.

After decomposition, observation surfaces should be remapped without changing layer doctrine.

No dataset should be promoted until layer attribution is stable.

## Relationship To Chess960

Chess960 readiness depends on decomposition stability.

Chess960 observation requires explicit metadata before artifact generation.

Chess960 setup-only evidence is different from Chess960 runtime trace evidence.

Chess960 runtime evidence must not be generated until FEN/castling/ruleset contracts are clear.

Chess960 data must not enter training datasets until variant/ruleset/action/mask contracts are stable.

This protocol does not activate Chess960.

## Relationship To Training

Training readiness requires stable observation and stable input/action contracts.

This protocol does not train Rocky.

This protocol does not validate training quality.

Training must not start from ambiguous monolith traces.

Dataset construction must wait for ActionId / LegalAction / ActionMask stability and policy-index compatibility.

## HumanGate

HumanGate / HumanDecision remains required for:

- claim approval;
- promotion;
- readiness labels;
- benchmark framing;
- dataset inclusion;
- training authorization;
- Chess960 activation;
- external presentation.

## Final Non-Goals

- no strength proof;
- no benchmark evidence;
- no Elo/win-rate claim;
- no scientific validation;
- no product-readiness claim;
- no Chess960 readiness claim;
- no dataset creation;
- no training authorization;
- no schema creation;
- no autonomous agent activation.
