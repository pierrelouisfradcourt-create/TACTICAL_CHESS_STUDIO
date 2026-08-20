# StudioPilot HumanDecision Dry-Run Builder

`scripts/control_plane/build_human_decision.py` builds a local `HumanDecision` draft JSON from a local `ReviewPacket` JSON.

This builder is dry-run only:
- It drafts data only.
- It does not execute tasks.
- It does not merge.
- It does not promote.
- It does not authorize claims automatically.
- It does not create pull requests.
- It does not call GPT, OpenAI, Codex, or GitHub APIs.
- It does not perform network actions.

Final authority remains with the Human Founder or designated human approver.

## Decision Axes

`merge_decision`, `claim_decision`, and `promotion_decision` are separate axes.
They are never conflated by this tool.

Default decisions are conservative:
- `merge_decision`: `HOLD` unless the review recommendation is `REQUEST_CHANGES`, in which case default is `REQUEST_CHANGES`.
- `claim_decision`: `NO_CLAIM`.
- `promotion_decision`: `NO_PROMOTION`.

Even when explicit overrides are passed (including `MERGE`, `CANDIDATE`, or `PROMOTE`), this script only emits JSON and executes nothing.

## Input and Validation

The script validates input against:
- `schemas/studiopilot_review_packet.schema.json`

Then it emits a draft that validates against:
- `schemas/studiopilot_human_decision.schema.json`

`rollback_plan` is always present and non-empty.
`evidence_refs` records the local ReviewPacket as non-canonical review input.

## Usage

```powershell
python scripts/control_plane/build_human_decision.py <review_packet.json> --pretty
```

```powershell
python scripts/control_plane/build_human_decision.py <review_packet.json> --merge-decision HOLD --claim-decision NO_CLAIM --promotion-decision NO_PROMOTION --pretty
```

Optional output writing:
- Use `--output <path>` to write a new file.
- Existing files are never overwritten.
- Parent directory must already exist.

## Verdict Boundaries

- software_verdict: `CONTROL_PLANE_HUMAN_DECISION_TOOLING_ONLY`
- evidence_verdict: `HUMAN_DECISION_DRY_RUN_ONLY`
- claim_verdict: `NO_CLAIM_ALLOWED`
