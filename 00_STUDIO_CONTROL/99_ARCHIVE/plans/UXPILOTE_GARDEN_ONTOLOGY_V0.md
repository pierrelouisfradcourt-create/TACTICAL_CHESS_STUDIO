# UxPilote Garden Ontology V0

Status: DOCUMENTED_ONLY
Surface: roadmap_docs_only
Runtime authority: NONE
Claim posture: NO_CLAIM_ALLOWED
Owner authority: HumanGate
Human gate required: true

## Status and authority

This ontology is a roadmap-only documentation record for the UxPilote Garden cognitive map.

- Status: DOCUMENTED_ONLY
- Surface: roadmap_docs_only
- Runtime authority: NONE
- Claim posture: NO_CLAIM_ALLOWED
- HumanGate remains final authority.

The ontology does not authorize implementation, execution, scanning, training, dataset generation, runtime promotion, model promotion, agent activation, backend work, network work, Git activity, or tool execution.

## Purpose

The purpose of this document is to freeze the current garden metaphor before further visual work. It defines the symbols, entities, surfaces, statuses, visual rules, authority boundaries, allowed meanings, forbidden meanings, and Godot representation limits for the UxPilote Garden cognitive map.

The ontology may guide future Codex prompts, Godot visual prompts, and local LLM prompt/RAG work. It must not be used as a training dataset or as evidence of runtime readiness.

## Current French semantic alignment

Current semantic baseline: UXPILOTE-GODOT-GARDEN-SEMANTIC-CLARITY-FRENCH-V1.

- Merle label: `Merle — Auditeur / Hygiène / Vérité`.
- Merle meaning: eyes of the system, observation passive, audit, hygiene, truth, drift detection, and report toward the living human feedback sphere. Merle is human-launched only and not autonomous.
- Build Zone meaning: `Zone Build — bac à sable`, a symbolic sandbox / branche symbolique / branch-like test area outside the living system for patch preparation. It is no real Git branch and no real build execution.
- Tool Zone meaning: `Zone Outils — Godot / Codex`, a logiciels professionnels / professional software area for Godot, Codex, and future tools. It has no tool launch and no tool execution.
- Living Feedback Sphere meaning: `Sphère de feedback vivant`, source/reservoir of feedback humain and reality grounding. It is not an approval engine.
- Flow meaning: flux entrant, flux sortant, symbolic feedback attenuation, perte de signal, and ancrage réel. These are map-reading symbols only.
- Data weight meaning: poids des données / taille symbolique is symbolic and hardcoded only; no file-size scan, no telemetry, no repository scan, and no real metric claim.

## Global map rule

The garden is a cognitive map, not an execution surface.

Every visible object must separate:

- visual metaphor
- status
- surface
- authority
- allowed meaning
- forbidden meaning
- Godot representation

A symbol can orient the human operator, but it cannot approve, mutate, execute, scan, train, benchmark, generate datasets, create models, promote models, or claim readiness.

## Surfaces and statuses

Allowed surfaces:

| Surface | Meaning in this ontology | Status |
| --- | --- | --- |
| active_runtime_code | Runtime source code and executable behavior. | PASSIVE |
| tests | Unit, integration, regression, smoke, and validation tests. | PASSIVE |
| artifacts_runtime_outputs | Generated logs, reports, run folders, datasets, checkpoints, models, and manifests. | PASSIVE |
| canonical_docs | Stable control documents, contracts, policies, and authoritative documentation. | PASSIVE |
| roadmap_docs_only | Planning documents, proposals, future-work notes, and non-authoritative roadmap text. | DOCUMENTED_ONLY |
| inference | ML inference, reranking, passive analysis, and model-assisted suggestions that do not decide alone. | PASSIVE |

Allowed status values remain IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, and UNKNOWN. For this document, the only active output status is DOCUMENTED_ONLY on roadmap_docs_only.

## Core entities

| Entity id | Label | Meaning | Surface | Status | Authority |
| --- | --- | --- | --- | --- | --- |
| central_game_tree | TacticalChessPureLab Tree | current recovered central game organism | roadmap_docs_only | DOCUMENTED_ONLY | NONE |
| living_feedback_sphere | Sphère de feedback vivant | source/reservoir of feedback humain; not an approval engine | roadmap_docs_only | DOCUMENTED_ONLY | NONE |
| merle_scout | Merle — Auditeur / Hygiène / Vérité | eyes of the system; observation passive; human-launched only; not autonomous | inference | PASSIVE | NONE |
| linked_flows | Flux entrants/sortants | symbolic relationships, feedback attenuation, signal loss, and reality grounding | artifacts_runtime_outputs | DOCUMENTED_ONLY | NONE |
| architecture_layer | Architecture Layer | symbolic architecture overlay | roadmap_docs_only | DOCUMENTED_ONLY | NONE |
| roadmap_layer | Roadmap Layer | symbolic future-plan overlay | roadmap_docs_only | DOCUMENTED_ONLY | NONE |
| build_zone | Zone Build — bac à sable | symbolic sandbox / branche symbolique / branch-like test area outside living system; no real Git branch; no real build execution | roadmap_docs_only | DOCUMENTED_ONLY | NONE |
| archive_zone | Archive Zone | outside-system symbolic clean storage / anti-duplicate zone | roadmap_docs_only | DOCUMENTED_ONLY | NONE |
| tool_zone | Zone Outils — Godot / Codex | logiciels professionnels / professional software area; Godot, Codex, future tools; no tool launch | roadmap_docs_only | DOCUMENTED_ONLY | NONE |
| game_forest | Game Forest | one tree per game; multi-game studio map | roadmap_docs_only | DOCUMENTED_ONLY | NONE |
| data_weight | Poids des données | symbolic/hardcoded size cue only; no file-size scan and no real metric | artifacts_runtime_outputs | DOCUMENTED_ONLY | NONE |

## Human feedback sphere

The Living Feedback Sphere / `Sphère de feedback vivant` represents the source and reservoir of feedback humain. It carries observation, decision pressure, feedback return, mental load, and overflow signal as a symbolic map-reading cue only.

Allowed meaning:

- human attention
- human feedback
- human decision pressure
- return path from observation into planning
- visible reminder that HumanGate remains final authority
- reality grounding / ancrage réel

Forbidden meanings:

- execution engine
- autonomous approval
- approval engine
- agent controller
- runtime authority
- background decision system
- hidden automation

Godot representation: a visible sphere or similar central feedback form near the current garden map. Its presence must not imply execution.

## Central game tree

The TacticalChessPureLab Tree represents the current recovered central game organism. It is the center of the garden metaphor for the current game.

Allowed meaning:

- current game identity
- recovered playable organism as a metaphor
- central anchor for surrounding roadmap and architecture zones

Forbidden meanings:

- proof of runtime readiness
- proof of visual quality
- proof of gameplay correctness
- proof of repository status

Godot representation: a central tree object or equivalent visual anchor. It remains candidate-only and read-only in the current Godot prototype.

## Merle — Auditeur / Hygiène / Vérité

The Merle is `Merle — Auditeur / Hygiène / Vérité`: the eyes of the system. It is a passive, human-launched observation symbol for audit, hygiene, truth, drift detection, and reporting toward the living feedback sphere.

Allowed meaning:

- observation passive
- human-launched inspection metaphor
- truth and hygiene attention
- audit / auditeur
- drift detection
- report toward feedback humain
- non-mutating scout perspective

Forbidden meanings:

- autonomous behavior
- background worker
- repo scanner without HumanGate
- mutation
- approval
- authority escalation
- runtime controller

Godot representation: a small scout symbol near the garden and feedback sphere. It may imply observation only. It must never imply autonomous action, tool execution, scanning, approval, or mutation.

## Linked flows

Linked Flows are symbolic relationships emphasized when a zone is selected. Current visible reading prefers French terms: flux entrant, flux sortant, perte de signal, ancrage réel, and feedback humain.

Allowed meaning:

- visual relationship between selected zones
- highlighted dependency, trace, or attention path
- local cognitive relief for understanding the map
- symbolic feedback attenuation
- symbolic signal loss
- symbolic reality grounding

Forbidden meanings:

- active data flow
- backend routing
- network connection
- telemetry
- tool execution
- repository scan

Godot representation: lines, curves, highlights, or relief links that appear or strengthen around selected zones. These are symbolic only, using hardcoded sample values.

## Data weight

Poids des données / taille symbolique is a hardcoded visual cue only.

Allowed meaning:

- symbolic size or weight for map readability
- hardcoded sample value
- visual reminder that some areas may require more human attention

Forbidden meanings:

- file-size scan
- repository scan
- telemetry
- benchmark metric
- runtime metric
- readiness metric
- model, dataset, or checkpoint evidence

Godot representation: scale or inspector text may show symbolic data weight, but it must not read files, inspect repos, measure signals, or claim real metrics.

## Architecture and roadmap layers

The Architecture Layer is the symbolic architecture overlay. The Roadmap Layer is the symbolic future-plan overlay.

Allowed meaning:

- architecture orientation
- future-plan orientation
- separation between current map and future work
- visible distinction between structure and plan

Forbidden meanings:

- implementation authority
- active architecture migration
- automatic roadmap execution
- claim that roadmap items are implemented

Godot representation: visual layers, toggles, map bands, relief overlays, or legend entries that help the human distinguish structure from plan.

## Outside-system zones

Build Zone, Archive Zone, and Tool Zone are outside-system symbolic zones.

Build Zone allowed meaning:

- `Zone Build — bac à sable`
- symbolic sandbox / branche symbolique / branch-like preparation area outside the living system
- test hors système for a patch before HumanGate review
- anti-duplicate / anti-pollution orientation
- no real Git branch
- no real build execution

Archive Zone allowed meaning:

- symbolic clean storage
- anti-duplicate orientation
- preservation metaphor

Tool Zone allowed meaning:

- `Zone Outils — Godot / Codex`
- logiciels professionnels / professional software area for Godot, Codex, and future tools
- tools are human-held and outside the living system
- no tool launch
- no tool execution

Forbidden meanings for all outside-system zones:

- real build execution
- real archive action
- real tool launch
- backend
- network
- telemetry
- mutation
- repository scan

Godot representation: zones outside the central tree and feedback sphere, visually distinct from active runtime surfaces.

## Game forest

The Game Forest means one tree per game; multi-game studio map.

Allowed meaning:

- each game can have its own tree
- TacticalChessPureLab is the current central tree
- future games can be shown as separate organisms in the same studio landscape

Forbidden meanings:

- multi-game runtime activation
- automatic game generation
- Chess960 activation
- DecisionController activation
- model promotion

Godot representation: a surrounding forest or distant tree set. Only the current central game tree is in focus unless HumanGate authorizes another bounded visual task.

## Legend and focus rules

The legend must separate entity type, status, surface, and authority.

Focus rules:

- selected zone focus may highlight one zone at a time
- linked flow relief may appear around the selected zone
- layers may be shown as symbolic map overlays
- labels must avoid duplicate or ambiguous meanings
- visual prominence must not imply authority
- candidate visuals must not be treated as runtime truth

## Forbidden meanings

The garden must not mean or imply:

- agent_activation: BLOCKED
- training: BLOCKED
- dataset_generation: BLOCKED
- dataset_reset: BLOCKED
- benchmark: BLOCKED
- model_or_checkpoint_creation: BLOCKED
- model_promotion: BLOCKED
- repo_scan: BLOCKED unless explicitly authorized by HumanGate
- backend: BLOCKED
- network: BLOCKED
- tool_execution: BLOCKED
- latest_json_creation: BLOCKED
- lab_run_creation: BLOCKED
- commit_push_branch_pr: BLOCKED
- Chess960 activation: BLOCKED
- DecisionController activation: BLOCKED
- real approval workflow: BLOCKED
- decision persistence: BLOCKED
- real audit execution: BLOCKED
- real hygiene scan: BLOCKED
- real truth agent: BLOCKED
- real build execution: BLOCKED
- real archive action: BLOCKED
- real tool launch: BLOCKED

## Future LLM usage

The ontology may be used for prompt/RAG guidance.

Allowed future use:

- prompt grounding
- RAG retrieval context
- symbol glossary
- bounded Codex prompt guidance
- bounded Godot visual prompt guidance
- local LLM context for passive interpretation

Forbidden future use:

- training dataset
- dataset generation seed
- model or checkpoint creation source
- model promotion evidence
- agent activation authority
- autonomous tool policy

## Training and dataset boundary

The ontology is not a training dataset.

Training, dataset generation, model/checkpoint creation, and model promotion remain BLOCKED.

No derived dataset, reset dataset, benchmark set, model, checkpoint, latest manifest, run folder, or promotion record may be created from this document without a separate explicit HumanGate-approved task.

## Godot candidate relationship

The Godot garden is a candidate-only visual artifact.

Godot visuals are not runtime truth. Godot CLI/headless validation proves parse/run only, not visual quality or authority.

Current known candidate status:

| Signal | Status |
| --- | --- |
| godot_import_parse | TESTED |
| bounded_headless_run | TESTED |
| label_dedup_sphere_merle | TESTED |
| selected_zone_focus | TESTED |
| linked_flow_relief | TESTED |
| merle_height_near_sphere | TESTED |
| map_legend_layers | TESTED |
| flow_signal_reading_burst | TESTED |
| semantic_clarity_french_v1 | TESTED |
| visible_ui_mostly_french | TESTED |
| visual_quality_claim | BLOCKED |

The current Godot prototype is candidate-only and read-only. This ontology alignment does not authorize a Godot patch, scene/script modification, Godot run, repo scan, Git action, or promotion claim.

## Status by surface

| Surface | Status | Notes |
| --- | --- | --- |
| active_runtime_code | PASSIVE | Not inspected, modified, executed, or authorized. |
| tests | PASSIVE | Not inspected, modified, or run. |
| artifacts_runtime_outputs | PASSIVE | No run folder, latest manifest, dataset, model, checkpoint, or benchmark output authorized. |
| canonical_docs | PASSIVE | Source anchors were read as reference only; no canonical docs changed. |
| roadmap_docs_only | DOCUMENTED_ONLY | This ontology is the only routed output. |
| inference | PASSIVE | Future prompt/RAG guidance only; no training or activation. |

## Verdicts

software_verdict:

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

evidence_verdict:

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

claim_verdict:

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: PASSIVE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: PASSIVE

no_global_ready_verdict: true

## Non-authorization

This ontology does not authorize:

- runtime implementation
- runtime execution
- test modification
- repo scan
- backend
- network
- telemetry
- tool execution
- agent activation
- training
- benchmarking
- dataset generation
- dataset reset
- latest.json creation
- lab/runs/RUN_* creation
- model or checkpoint creation
- model or checkpoint promotion
- Chess960 activation
- DecisionController activation
- real approval workflow
- decision persistence
- real audit execution
- real hygiene scan
- real truth agent
- real build execution
- real archive action
- real tool launch
- Godot patch
- TacticalChessPureLab repo inspection or modification
- Git branch creation
- Git commit
- Git push
- pull request creation

Any future action beyond roadmap documentation requires a separate explicit HumanGate-approved task.
