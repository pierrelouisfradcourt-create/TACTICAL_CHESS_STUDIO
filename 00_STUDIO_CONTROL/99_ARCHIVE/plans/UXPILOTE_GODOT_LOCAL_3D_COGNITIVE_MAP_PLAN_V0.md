# UXPILOTE Godot Local 3D Cognitive Map Plan V0

## 1. Header

Status: DOCUMENTED_ONLY

Runtime authority: NONE

Godot project creation: BLOCKED

Runtime execution: BLOCKED

Recursive scan: BLOCKED

PureLab content inspection: BLOCKED

Agent activation: BLOCKED

Claim posture: NO_CLAIM_ALLOWED

## 2. Intent

This roadmap describes a possible future local Godot 3D cognitive map for the Studio Garden / UxPilote system. The goal is cognitive visualization: helping a human understand authority, boundaries, flows, evidence posture, and mental load in spatial form.

This is not a game production plan yet. It does not authorize Godot installation, Godot project creation, scene creation, scripting, asset generation, runtime execution, filesystem inspection, or connection to live agents or repositories.

The map is treated as an illustrative planning surface only. It may describe what a future Godot project could represent, but it makes no claim that such a project exists, runs, or has inspected any real source material.

## 3. Visual Model

The proposed metaphor is a local 3D city-machine / garden / pyramid map.

Studio Core / Root Substrate appears as the foundation layer: a stable base plane or root bed that all other visual zones are positioned relative to. It represents the studio control substrate and canonical orientation, not an executable runtime.

HumanGate appears as an apex / final authority tower above the map. It is visually elevated to make clear that human approval is the final authority for activation, escalation, interpretation, and publication.

TacticalChessPureLab appears as a recovered organism zone. It is not represented as the ecosystem root. It is bounded, living, historically meaningful, and potentially rich, but it does not override the Studio Core or HumanGate.

Datasets, models, scripts, and outputs appear as visible but bounded zones. These can be shown as neighborhoods, terraces, vaults, orchards, workshops, or containers, but they remain spatially separated from authority structures and sensitive areas.

Flows between zones appear as illuminated paths, rails, irrigation lines, energy conduits, or evidence streams. These flows are illustrative only and must not imply verified runtime data movement.

Blocked or sensitive zones appear as sealed structures, glass barriers, hazard fields, cold storage, or quarantined terrain. They should be visible enough to reduce uncertainty, while remaining clearly non-inspectable.

Mental-load reduction modes are represented as alternate views that simplify the map: authority-only, evidence-only, blocked-zone view, recovery view, flow view, and low-stimulus focus view.

## 4. Godot Scene Concept

The following nodes are proposed only as planning vocabulary for a future Godot scene. They are not files to create and do not authorize any `.tscn`, `.gd`, import, asset, or runtime file.

- `Root3D`: conceptual parent node for the local 3D cognitive map.
- `StudioCore`: foundation substrate that anchors the map.
- `HumanGateApex`: elevated final authority tower.
- `RecoveredOrganismZone`: bounded representation of TacticalChessPureLab as recovered organism zone.
- `SourceMemory`: symbolic zone for source history, canonical notes, and orientation memory.
- `EvidenceStream`: visual route layer for evidence movement and traceability posture.
- `ClimateEnergyLayer`: ambient layer for cognitive load, system weather, pressure, and energy state.
- `ToxicBlockedZone`: sealed representation of sensitive, blocked, unsafe, or non-inspectable areas.
- `MyceliumScoutLayer`: exploratory planning layer for future scouts, probes, or discovery routes, without activating agents.

Possible high-level hierarchy, for planning only:

```text
Root3D
  StudioCore
  HumanGateApex
  RecoveredOrganismZone
  SourceMemory
  EvidenceStream
  ClimateEnergyLayer
  ToxicBlockedZone
  MyceliumScoutLayer
```

## 5. Interaction Model

The future interaction model should prioritize orientation and reduced mental load.

- Orbit camera around the full map.
- Zoom from global overview to individual zones.
- Focus zone mode to center one region and dim the rest.
- Isolate layer mode for authority, evidence, blocked zones, recovery, or climate.
- Show/hide flows without implying live data access.
- No file reads.
- Hardcoded sample data only.

Every interactive control must remain local, illustrative, and disconnected from filesystem, network, Git, agents, tests, schemas, datasets, models, and runtime outputs unless later approved by HumanGate.

## 6. Data Model

The only permitted data model for this planning phase is hardcoded illustrative sample data.

No filesystem measurements are allowed. No counts, sizes, timestamps, file paths discovered by scanning, dependency graphs, import graphs, model inventories, dataset inventories, or runtime output summaries may be inferred or displayed.

Example illustrative data shape, for future planning only:

```text
zones:
  - id: studio_core
    label: Studio Core
    role: foundation
    authority: substrate
    sample_position: center_base

  - id: human_gate
    label: HumanGate
    role: final_authority
    authority: apex
    sample_position: top

  - id: purelab_recovered
    label: TacticalChessPureLab
    role: recovered_organism_zone
    authority: bounded_zone
    sample_position: side_garden

  - id: source_memory
    label: Source Memory
    role: orientation_memory
    authority: passive
    sample_position: archive_terrace

flows:
  - from: studio_core
    to: human_gate
    type: authority_orientation
    status: illustrative_only

  - from: source_memory
    to: evidence_stream
    type: evidence_context
    status: illustrative_only

blocked_zones:
  - id: toxic_blocked_zone
    label: Blocked / Sensitive
    access: blocked
    reason: no_inspection_without_humangate
```

This sample data is not evidence. It is only a planning placeholder.

## 7. Boundaries

No scan.

No repo read.

No runtime connection.

No agents.

No network.

No Git.

No Godot installation.

No Godot project creation.

No `.tscn` files.

No `.gd` files.

No import files.

No generated assets.

No runtime files.

No tests.

No schema changes.

No dataset inspection.

No model inspection.

No script inspection.

No outputs inspection.

No PureLab content inspection.

No claim that any live system state has been measured.

## 8. Future HumanGate Requirements

Before any real Godot project creation, HumanGate must explicitly approve all of the following:

- Whether Godot may be installed or used locally.
- Where a Godot project may be created.
- Whether `.tscn`, `.gd`, import files, assets, or runtime files may be created.
- Whether sample data must remain hardcoded or may be generated from approved manifests.
- Whether any filesystem reads are allowed.
- Whether any repo scanning is allowed.
- Whether TacticalChessPureLab may be inspected, and at what depth.
- Whether datasets, models, scripts, or outputs may be inventoried.
- Whether network access is allowed.
- Whether Git status, branch, commit, or diff operations are allowed.
- Whether agents or scouts may be activated.
- Which surfaces are allowed to move from passive/documented-only into active runtime behavior.
- What evidence standard is required before visual claims may be displayed.
- What rollback and audit requirements apply to any generated project.

Approval must be concrete, bounded, and surface-specific. Absence of approval means blocked.

## 9. Status By Surface

active_runtime_code: PASSIVE

tests: PASSIVE

artifacts_runtime_outputs: PASSIVE

canonical_docs: PASSIVE

roadmap_docs_only: DOCUMENTED_ONLY

inference: PASSIVE

## 10. Verdicts

software_verdict by surface:

- active_runtime_code: NO_CHANGE
- tests: NO_CHANGE
- artifacts_runtime_outputs: NO_CHANGE
- canonical_docs: NO_CHANGE
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: NO_RUNTIME_SOFTWARE_CLAIM

evidence_verdict by surface:

- active_runtime_code: NO_EVIDENCE_COLLECTED
- tests: NO_EVIDENCE_COLLECTED
- artifacts_runtime_outputs: NO_EVIDENCE_COLLECTED
- canonical_docs: NO_EVIDENCE_COLLECTED
- roadmap_docs_only: PLAN_TEXT_ONLY
- inference: NO_FILESYSTEM_MEASUREMENT

claim_verdict by surface:

- active_runtime_code: NO_CLAIM_ALLOWED
- tests: NO_CLAIM_ALLOWED
- artifacts_runtime_outputs: NO_CLAIM_ALLOWED
- canonical_docs: NO_CLAIM_ALLOWED
- roadmap_docs_only: DOCUMENTED_ONLY
- inference: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
