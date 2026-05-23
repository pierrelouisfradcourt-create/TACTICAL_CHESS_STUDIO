# StudioPilot Control-Plane V0 Audit

## 1. Executive verdict

The merged StudioPilot control-plane V0 is coherent as a manual, docs-first, dry-run control plane.

The loop documents, packet schemas, fixture validator, prompt renderer, ExecutionReport intake, ReviewPacket builder, HumanDecision draft builder, smoke runner, operator manual, and first manual loop trial all preserve the same core boundary:

TaskPacket -> rendered Codex prompt -> ExecutionReport -> ReviewPacket -> HumanDecision -> human-owned outcome.

No audited script activates StudioPilot autonomy, calls Codex/OpenAI/GitHub APIs, creates canonical evidence, marks a PR ready, merges, trains, benchmarks, mutates runtime/ML code, or makes a benchmark or capability claim.

Audit validation run:

```powershell
.\.venv312\Scripts\python.exe scripts\control_plane\validate_studiopilot_packets.py --pretty
.\.venv312\Scripts\python.exe scripts\operator\validate_json_artifacts.py
.\.venv312\Scripts\python.exe scripts\control_plane\run_studiopilot_loop_smoke.py --pretty
```

Results:

- `validate_studiopilot_packets.py --pretty`: PASS, with 4 valid fixtures passed and 5 invalid fixtures failed as expected.
- `validate_json_artifacts.py`: PASS, with 41 JSON files checked, 0 invalid JSON files, and schema validation PASS.
- `run_studiopilot_loop_smoke.py --pretty`: PASS, with `claim_verdict = NO_CLAIM_ALLOWED`, `evidence_verdict = DRY_RUN_SMOKE_ONLY`, ReviewPacket schema valid, and HumanDecision schema valid.

Skipped by design: benchmarks, training, holdout use, runtime tests, ML tests, active agents, automation, ready marking, merge, and promotion.

## 2. Current V0 components

Audited docs:

- `docs/control-plane/LOOP_CONTRACT.md`
- `docs/control-plane/AUTHORITY_MATRIX.md`
- `docs/control-plane/LOOP_STATES.md`
- `docs/control-plane/STUDIOPILOT_PACKET_SCHEMAS.md`
- `docs/control-plane/RENDER_CODEX_PROMPT.md`
- `docs/control-plane/EXECUTION_REPORT_INTAKE.md`
- `docs/control-plane/REVIEW_PACKET_DRY_RUN.md`
- `docs/control-plane/HUMAN_DECISION_DRY_RUN.md`
- `docs/control-plane/STUDIOPILOT_LOOP_SMOKE.md`
- `docs/control-plane/STUDIOPILOT_OPERATOR_MANUAL.md`
- `docs/control-plane/STUDIOPILOT_MANUAL_LOOP_TRIAL_001.md`

Audited schemas:

- `schemas/studiopilot_task_packet.schema.json`
- `schemas/studiopilot_execution_report.schema.json`
- `schemas/studiopilot_review_packet.schema.json`
- `schemas/studiopilot_human_decision.schema.json`

Audited scripts:

- `scripts/control_plane/validate_studiopilot_packets.py`
- `scripts/control_plane/render_codex_prompt.py`
- `scripts/control_plane/validate_execution_report.py`
- `scripts/control_plane/build_review_packet.py`
- `scripts/control_plane/build_human_decision.py`
- `scripts/control_plane/run_studiopilot_loop_smoke.py`

Fixture set:

- 4 valid StudioPilot packet fixtures.
- 5 invalid StudioPilot packet fixtures.

## 3. Verified loop order

Contract-level order remains:

IDEA -> WORK_ORDER -> TASK_PACKET_VALIDATED -> CODEX_TASK_CREATED -> BRANCH_READY -> MECHANICAL_CHECKED -> GPT_REVIEWED -> HUMAN_DECIDED -> MERGED / REJECTED / FROZEN -> LEARNING_EVENT_RECORDED.

Current V0 manual-tool order remains:

1. Validate StudioPilot packet fixtures.
2. Render a local Codex prompt from a valid TaskPacket.
3. Validate a local ExecutionReport, optionally against a TaskPacket.
4. Build a non-binding ReviewPacket from the ExecutionReport.
5. Build a dry-run HumanDecision draft from the ReviewPacket.
6. Run the local smoke check to verify the wiring end to end.

The operator manual and smoke script agree on the practical V0 pipeline. The smoke script executes only local validators/builders and validates the generated HumanDecision schema at the end.

## 4. Authority boundary check

Boundary checks passed:

- No self-mutation: docs forbid prompt auto-mutation and StudioPilot self-mutation; scripts only read local inputs and optionally emit explicit dry-run outputs.
- No auto-ready: no audited script calls GitHub, `gh`, git ready transitions, or PR ready APIs.
- No auto-merge: no audited script calls merge tooling or repository mutation APIs.
- No Codex/OpenAI/GitHub API calls from scripts: no audited script imports or calls network/API clients. The smoke script uses `subprocess.run(..., shell=False)` only to invoke sibling local control-plane scripts.
- No canonical evidence creation: docs and scripts frame outputs as dry-run, local, temporary, or non-canonical. Smoke outputs are temporary by default.
- No benchmark claim: docs forbid treating checks or dry runs as proof; smoke reports `DRY_RUN_SMOKE_ONLY`.
- No runtime/ML/training: audited scripts are under `scripts/control_plane/` and do not run training, benchmarks, or runtime/gameplay code.
- HumanGate remains final authority: loop contract, authority matrix, operator manual, ExecutionReport intake, ReviewPacket builder, and HumanDecision builder all preserve human final authority.
- ReviewPacket remains non-binding: schema description and docs state it cannot authorize merge, promotion, or claims; the builder sets `human_action_required = true`.
- HumanDecision draft does not execute decisions: the builder emits JSON only. Even explicit override flags only change draft fields.

## 5. Schema/script/doc consistency check

TaskPacket consistency:

- Schema requires scope fields, `allowed_paths`, `forbidden_paths`, expected outputs, validation commands, `claim_scope`, `human_gate_required`, and rollback plan.
- Renderer validates TaskPacket schema before rendering and includes claim scope, human gate requirement, allowed paths, forbidden paths, validation commands, rollback plan, and final-report verdict requirements.
- Docs correctly frame rendered prompts as manual text, not execution authority.

ExecutionReport consistency:

- Schema records changed files, commands run/skipped, validation results, test counts, risks, scope deviation, and claim verdict.
- Intake validates schema and can check TaskPacket alignment for task id, allowed paths, forbidden paths, claim-scope escalation, validation result presence, and blocking scope deviation.
- Docs correctly state ExecutionReport is not proof or canonical evidence by itself.

ReviewPacket consistency:

- Schema has risk fields, blocking questions, recommendation, and `human_action_required`.
- Schema has no merge, promotion, or claim authorization property. The invalid fixture with `merge_authorized` is rejected.
- Builder computes risk conservatively from scope deviation, claim verdict, runtime path touches, validation status, failed tests, and optional TaskPacket boundary checks.
- Docs correctly frame ReviewPacket as non-binding review guidance.

HumanDecision consistency:

- Schema separates `merge_decision`, `claim_decision`, and `promotion_decision`.
- Builder defaults to `HOLD`, `NO_CLAIM`, and `NO_PROMOTION` unless explicit draft overrides are supplied.
- Builder always includes rollback plan and non-canonical ReviewPacket evidence reference.
- Docs correctly state the builder drafts data only and executes no repository action.

Smoke consistency:

- Smoke script chains only local control-plane validators/builders.
- It validates ReviewPacket and HumanDecision schema outputs.
- It blocks forbidden repo output locations and deletes temporary output directories by default.
- It reports `NO_CLAIM_ALLOWED` and `DRY_RUN_SMOKE_ONLY`.

Known consistency caveats:

- `human_gate_required` is required by the TaskPacket schema, but the schema currently accepts both `true` and `false`. V0 docs require HumanGate as final authority, so a future fixture/schema PR should decide whether this field must be `const: true`.
- The ReviewPacket recommendation vocabulary includes positive advisory labels such as `SAFE_TO_READY`. Docs and scripts keep these non-binding, but future docs should continue emphasizing that these labels do not mark ready or merge.
- Optional explicit output paths can write local dry-run artifacts when requested. This is coherent with current docs, but it remains operator-owned and non-canonical.

## 6. Known gaps

- No single control-plane README/index currently summarizes the V0 docs, schemas, scripts, fixtures, and command order.
- Negative fixture coverage is useful but still narrow.
- Claim-scope escalation is not yet represented by a boundary fixture where a schema-valid ExecutionReport exceeds a TaskPacket claim scope.
- The operator manual is comprehensive, but a short quickstart would reduce operator error.
- The fixture set contains minimal examples, not a realistic TaskPacket example pack.
- The smoke run proves wiring only; it is not evidence of StudioPilot operational capability.
- `validate_json_artifacts.py` reports missing safe directory `scripts/operator/fixtures` while still passing; this is non-blocking for this audit but worth tracking separately if operator fixture layout expands.

## 7. Non-canonical evidence boundary

This audit is non-canonical V0 control-plane evidence only.

The validation outputs show local schema and wiring health. They do not prove model strength, gameplay quality, runtime correctness, benchmark performance, promotion readiness, or scientific claims.

Smoke-generated artifacts are temporary dry-run artifacts and are not committed. The HumanDecision draft records local ReviewPacket input as non-canonical review input only.

No holdout, benchmark, training run, runtime test, canonical evidence package, `lab/runs/RUN_*`, or `latest.json` was created.

## 8. What is still forbidden

Still forbidden through this V0 control plane:

- active StudioPilot runtime
- active agents or automation
- self-mutation
- prompt auto-mutation
- Codex SDK adapter activation
- MCP write tools
- auto-ready
- auto-merge
- HumanGate bypass
- ReviewPacket as authorization
- HumanDecision draft execution
- canonical evidence creation
- benchmark-as-proof
- Elo, strength, promotion, or scientific proof claims
- runtime/search/neural broad refactors
- ML/training/fine-tuning
- holdout use
- dataset reset
- `lab/runs/RUN_*`
- `latest.json`

## 9. Recommended next 5 PRs

Strategic follow-up only, not implemented here:

1. Control-plane README/index update.
2. Negative fixture expansion.
3. Claim-scope escalation fixture.
4. Operator manual quickstart.
5. TaskPacket real example pack.

## 10. Final verdicts

software_verdict: CONTROL_PLANE_AUDIT_DOCS_ONLY

evidence_verdict: NON_CANONICAL_V0_AUDIT_ONLY

claim_verdict: NO_CLAIM_ALLOWED
