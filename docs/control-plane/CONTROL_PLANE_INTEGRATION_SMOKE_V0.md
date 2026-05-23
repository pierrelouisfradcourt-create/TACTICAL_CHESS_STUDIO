# Control-Plane Integration Smoke V0

## Purpose

Control-Plane Integration Smoke V0 is a local integration smoke, not an executor.

It checks that prior PatchPacks work together as a bounded control-plane chain:

`CampaignPlan -> PRQueue -> next TaskPacket draft -> Human Command resolution -> PRDecisionPacket summary -> Local Review Pack -> compact GO / HOLD / BLOCKED decision`

The smoke exists to reduce copy-paste in manual review by validating the chain locally from deterministic fixtures.

## Boundaries

The smoke tool does not:

- call GitHub, Codex, or OpenAI APIs
- mark a pull request ready
- merge a pull request
- run benchmarks
- run training
- modify runtime, ML, gameplay, search, neural, or workflow files
- create datasets
- create lab runs
- create active agents

The script reads JSON inputs and writes only to stdout. It is control-plane only.

The script uses `jsonschema` when available. If `jsonschema` is not installed,
it falls back to the minimal input-shape checks required by this smoke and keeps
the same stdout-only behavior.

## HumanGate

HumanGate remains final authority.

The smoke may summarize `GO_READY_AND_MERGE` when the local control-plane inputs are consistent, required checks are represented as green, scope is control-plane only, and every safety invariant remains intact. That summary is not permission to auto-ready or auto-merge.

Required checks must be green before merge. A human must still decide whether to ready or merge.

## Fixtures

Fixtures live under:

`docs/control-plane/fixtures/integration_smoke/`

The default smoke compares:

- `valid_integration_smoke_input_v0.json` against `expected_integration_smoke_go_v0.json`
- `blocked_infra_integration_smoke_input_v0.json` against `expected_integration_smoke_blocked_infra_v0.json`

## Local Command

```powershell
.\.venv312\Scripts\python.exe scripts\control_plane\smoke_control_plane_integration.py --pretty
```

The tool also accepts a single input and optional expected summary:

```powershell
.\.venv312\Scripts\python.exe scripts\control_plane\smoke_control_plane_integration.py --input docs\control-plane\fixtures\integration_smoke\valid_integration_smoke_input_v0.json --expected docs\control-plane\fixtures\integration_smoke\expected_integration_smoke_go_v0.json --pretty
```

## Adjacent Hygiene Smoke

Prompt and report hygiene has a separate stdout-only smoke:

```powershell
python scripts\control_plane\smoke_prompt_report_hygiene.py --pretty
```

This smoke checks one valid prompt, one intentionally blocked prompt, and one
valid StudioPilot ExecutionReport JSON. It is adjacent to this integration
smoke for now; it is not wired into the integration summary because the
integration smoke has its own fixture comparison contract.

If the hygiene smoke is promoted into the integration smoke later, expected
integration summaries must be updated under HumanGate instead of silently
changing report shape.

Aggregate passive gate smoke:

```powershell
python scripts\control_plane\smoke_passive_control_plane_gates.py --pretty
```

This aggregate smoke runs the integration smoke and the hygiene smoke together
without changing either child smoke's fixture contract.

## Future Work

LearningEvent can consume these summaries later. That future step should remain passive unless a human explicitly approves a separate PatchPack.

## Verdicts

software_verdict: CONTROL_PLANE_INTEGRATION_SMOKE_ONLY

evidence_verdict: LOCAL_INTEGRATION_SMOKE_ONLY

claim_verdict: NO_CLAIM_ALLOWED
