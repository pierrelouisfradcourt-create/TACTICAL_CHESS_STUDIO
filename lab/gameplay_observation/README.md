# PR-13B / PR-14 / PR-15 / PR-16 / PR-17 / PR-18 / PR-19 / PR-20 / PR-21 Gameplay Observation Packet

Status: non-canonical observation packet only  
Theme: search behavior in non-converting positions  
Claim status: no claim allowed

## Purpose

PR-13B prepares the first gameplay-observation surface under the Research OS cage.
PR-14 adds a richer non-canonical gameplay surface so observations are more useful than bare-kings-only examples.
PR-15 adds a non-canonical triage layer that converts PR-14 observation reports into actionable investigation packets for future Codex runtime work.
PR-16 adds a non-canonical Codex task queue generator that turns PR-15 triage output into queue/handoff files for reviewable future implementation work.
PR-17 adds a non-canonical Codex prompt pack generator that turns the PR-16 queue into ready-to-paste Code Mode prompts for one-focused-PR execution.
PR-18 adds a non-canonical Codex execution packet scaffold that selects exactly one PR-17 prompt and emits a manual review packet for local Code Mode execution.
PR-19 adds a non-canonical Codex execution result intake validator that classifies a manual execution summary as PASS/BLOCKED/INVALID without merging, claiming, or promoting.
PR-20 adds a non-canonical end-to-end orchestration smoke runner that executes PR-14 -> PR-19 locally and records sandbox-only smoke reports.
PR-21 adds a non-canonical automation installation status reporter that reads PR-20 smoke output and states whether the manual scaffold is installed enough to use.

It does not run a benchmark, does not execute the chess engine, does not create canonical evidence, and does not authorize any claim.

The immediate objective is to validate that a non-canonical observation can be specified with enough structure to be useful without being mistaken for proof.

## Required learning fields

Every gameplay observation packet must include:

```json
{
  "learning_value": "What this observation can teach",
  "discard_if": "When this observation is useless",
  "next_decision_enabled": "What future decision this observation can inform"
}
```

These fields exist to prevent packet gaming: a packet can pass mechanically while still teaching nothing useful.

## Boundaries

A PR-13B packet must:

- stay non-canonical;
- avoid holdout access;
- avoid dataset reset;
- avoid real `RUN_*` evidence bundle creation;
- avoid `latest.json` updates;
- avoid canonical evidence output;
- avoid claim or promotion authority;
- require human review;
- keep `claim_verdict` at `NO_CLAIM_ALLOWED`.

## Current validators

```text
scripts/check_gameplay_observation_packet.py
scripts/check_codex_execution_result.py
```

## Current runners

```text
scripts/run_gameplay_observation.py
scripts/triage_gameplay_observation.py
scripts/generate_codex_task_queue.py
scripts/generate_codex_prompt_pack.py
scripts/prepare_codex_execution_packet.py
scripts/check_codex_execution_result.py
scripts/run_codex_orchestration_smoke.py
scripts/report_codex_automation_status.py
```

## Current surfaces

```text
lab/gameplay_observation/non_converting_positions/example_surface.pr13b.json
lab/gameplay_observation/non_converting_positions/pr14_gameplay_surface.json
```

`example_surface.pr13b.json` is intentionally tiny and example-only.

`pr14_gameplay_surface.json` is a compact non-canonical gameplay batch (quiet positions, tactical tension, king-safety pressure, piece activity decisions, pawn-vs-piece choice contexts, and positions where shallow depth may change `selected_move`).

Neither surface is benchmark evidence, scientific proof, or promotion evidence.

## Current examples

```text
lab/gameplay_observation/examples/valid_search_nonconverting_observation_packet.pr13b.json
lab/gameplay_observation/examples/invalid_claim_gameplay_observation_packet.pr13b.json
```

## Expected PR-13B interpretation

```text
software_verdict: PASS
evidence_verdict: INCOMPLETE
claim_verdict: NO_CLAIM_ALLOWED
```

## PR-14 report interpretation

- `stable_selected_move` means descriptive stability only.
- `changed_selected_move` means a candidate for future targeted investigation only.
- `score_gap` and `candidates` are observation metadata only.
- No benchmark claim is allowed from this output.
- No scientific proof is established by this output.
- No promotion evidence is produced by this output.

## PR-15 triage output interpretation

`scripts/triage_gameplay_observation.py` reads a non-canonical gameplay observation report and emits a sandbox-only triage report under:

```text
lab/gameplay_observation/sandbox_outputs/pr15_triage/triage_report.pr15.json
```

Per-position triage labels:

- `STABLE_OBSERVATION`
- `DEPTH_SENSITIVE_OBSERVATION`
- `NEEDS_TARGETED_INVESTIGATION`
- `DISCARD_LOW_SIGNAL`
- `INVALID_OBSERVATION`

The triage report includes:

- per-position depth metadata (`selected_by_depth`, `scores_by_depth`, optional `candidate_count_by_depth`, optional `score_gap_by_depth`);
- a summary block with total/count fields and `recommended_next_batch`;
- `task_next` packets for follow-up only in non-canonical mode with `claim_verdict: NO_CLAIM_ALLOWED`.

## Example flow

```powershell
..\venv312\Scripts\python.exe scripts/run_gameplay_observation.py --surface lab/gameplay_observation/non_converting_positions/pr14_gameplay_surface.json --depths 1,2 --execute --pretty
..\venv312\Scripts\python.exe scripts/triage_gameplay_observation.py --report lab/gameplay_observation/sandbox_outputs/pr14_gameplay_surface/observation_report.pr14_gameplay_surface.json --pretty
..\venv312\Scripts\python.exe scripts/generate_codex_task_queue.py --triage-report lab/gameplay_observation/sandbox_outputs/pr15_triage/triage_report.pr15.json --pretty
..\venv312\Scripts\python.exe scripts/generate_codex_prompt_pack.py --queue lab/gameplay_observation/sandbox_outputs/pr16_codex_task_queue/codex_task_queue.pr16.json --pretty
..\venv312\Scripts\python.exe scripts/prepare_codex_execution_packet.py --prompt-pack lab/gameplay_observation/sandbox_outputs/pr17_codex_prompt_pack/codex_prompt_pack.pr17.json --index 0 --pretty
..\venv312\Scripts\python.exe scripts/check_codex_execution_result.py --result lab/gameplay_observation/codex_execution_result/examples/valid_result.pr19.json --pretty
..\venv312\Scripts\python.exe scripts/run_codex_orchestration_smoke.py --pretty
..\venv312\Scripts\python.exe scripts/report_codex_automation_status.py --smoke-report lab/gameplay_observation/sandbox_outputs/pr20_orchestration_smoke/orchestration_smoke.pr20.json --pretty
```

## PR-16 Codex task queue output interpretation

`scripts/generate_codex_task_queue.py` reads PR-15 triage output and writes sandbox-only queue outputs:

```text
lab/gameplay_observation/sandbox_outputs/pr16_codex_task_queue/codex_task_queue.pr16.json
lab/gameplay_observation/sandbox_outputs/pr16_codex_task_queue/codex_task_queue.pr16.md
```

Included task labels:

- `NEEDS_TARGETED_INVESTIGATION`
- `DEPTH_SENSITIVE_OBSERVATION`

Skipped and documented labels:

- `STABLE_OBSERVATION`
- `DISCARD_LOW_SIGNAL`
- `INVALID_OBSERVATION`

Queue metadata enforces non-canonical mode:

- `canonical_evidence: false`
- `promotion_eligible: false`
- `claim_verdict: NO_CLAIM_ALLOWED`
- `recommended_execution_mode: CODEX_CODE_MODE_REVIEWABLE_PR`
- `human_review_required: true`

Codex may implement a future investigation PR, but may not make claims, may not touch holdout, and may not create canonical RUN evidence. Human review is mandatory.

## Next step after PR-16

A future PR may execute selected investigation tasks from the PR-16 queue as reviewable, non-canonical code work.

That future PR must still remain:

```text
claim_verdict: NO_CLAIM_ALLOWED
```

and must not create canonical `RUN_*` evidence unless a separate protocol-lock and run-intent path is implemented first.

## PR-17 Codex prompt pack output interpretation

`scripts/generate_codex_prompt_pack.py` reads PR-16 queue output and writes sandbox-only prompt pack files:

```text
lab/gameplay_observation/sandbox_outputs/pr17_codex_prompt_pack/codex_prompt_pack.pr17.json
lab/gameplay_observation/sandbox_outputs/pr17_codex_prompt_pack/codex_prompt_pack.pr17.md
```

Each prompt item remains non-canonical and includes strict boundaries:

- exactly one focused PR;
- stop and report `BLOCKED` if scope requires broad engine/search/neural refactor;
- no claims (`claim_verdict: NO_CLAIM_ALLOWED`);
- no holdout access;
- no benchmark interpretation;
- no `lab/runs/RUN_*` and no `latest.json`;
- sandbox outputs remain untracked.

## PR-18 Codex execution packet output interpretation

`scripts/prepare_codex_execution_packet.py` reads PR-17 prompt pack output and writes sandbox-only execution packet files:

```text
lab/gameplay_observation/sandbox_outputs/pr18_codex_execution_packet/codex_execution_packet.pr18.json
lab/gameplay_observation/sandbox_outputs/pr18_codex_execution_packet/codex_execution_packet.pr18.md
```

Selection mode is exactly one prompt:

- by `--prompt-id`;
- by `--index`;
- first prompt when neither is provided.

The packet preserves non-canonical boundaries and mandatory review gates:

- `canonical_evidence: false`
- `promotion_eligible: false`
- `claim_verdict: NO_CLAIM_ALLOWED`
- `human_review_required: true`

Manual execution checklist:

- paste prompt into Codex Code Mode
- wait for draft PR
- verify diff scope
- verify checks
- human decides ready/merge/reject

## PR-19 Codex execution result intake interpretation

`scripts/check_codex_execution_result.py` reads a non-canonical Codex execution result summary and returns machine-readable intake classification:

```text
software_verdict
evidence_verdict
claim_verdict
intake_verdict
blocked_reasons
warnings
```

Default input:

```text
lab/gameplay_observation/codex_execution_result/examples/valid_result.pr19.json
```

Guardrails enforced by intake:

- PASS only when `claim_verdict: NO_CLAIM_ALLOWED` and `human_review_required: true`;
- BLOCKED when protected file/path scope or forbidden claim language appears;
- INVALID when required fields are missing or malformed;
- no canonical evidence writes, no merge, no claim, no promotion.

## PR-20 orchestration smoke interpretation

`scripts/run_codex_orchestration_smoke.py` runs the full local non-canonical chain in order and writes:

```text
lab/gameplay_observation/sandbox_outputs/pr20_orchestration_smoke/orchestration_smoke.pr20.json
lab/gameplay_observation/sandbox_outputs/pr20_orchestration_smoke/orchestration_smoke.pr20.md
```

PR-20 smoke expectations:

- valid PR-19 example must PASS;
- blocked PR-19 example must be recorded as `EXPECTED_BLOCKED` (may return non-zero);
- any unexpected non-zero command fails the smoke;
- output remains non-canonical (`canonical_evidence: false`, `promotion_eligible: false`, `claim_verdict: NO_CLAIM_ALLOWED`).

## PR-21 automation status report interpretation

`scripts/report_codex_automation_status.py` reads a PR-20 smoke report and writes:

```text
lab/gameplay_observation/sandbox_outputs/pr21_automation_status/automation_status.pr21.json
lab/gameplay_observation/sandbox_outputs/pr21_automation_status/automation_status.pr21.md
```

PR-21 status expectations:

- classify installation state for PR-14 through PR-20 scaffold components only;
- report readiness for manual non-canonical Codex loops only;
- no autonomous production automation claim;
- no scientific proof claim;
- no promotion claim and no authorization claim;
- human review decides merge/reject;
- generated sandbox outputs remain untracked.

## PR-23 local workspace hygiene

- `lab/gameplay_observation/sandbox_outputs/` content is non-canonical local output and stays untracked.
- `codex_*.md` files are local reports only and must not be committed.
- Generated local files (`lab/tmp_pr03_tests/`, `lab/tmp_*/`, and similar temporary outputs) must not be committed.
- Run `..\venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty` before future PR preparation.
