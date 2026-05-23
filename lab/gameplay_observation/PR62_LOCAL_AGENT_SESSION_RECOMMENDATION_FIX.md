# PR62 Local Agent Session Recommendation Fix

## Scope

This PR updates `scripts/report_local_agent_session.py` only for local control-plane reporting behavior.
No runtime/search/neural/gameplay logic is changed.

## Why PR59 Was KEEP_BUT_FIX_LATER

PR59 introduced a useful local session report surface, but its recommendation output was intentionally simple and remained over-eager:

- `recommended_next_lane: AUTOMATION`
- `recommended_next_action: SPIKE_EXTRACTION_PACKET_GENERATOR`

After PR60 / PR61 / PR63 documentation and control-plane updates, this default was no longer conservative and could misroute the next action.

## What Was Misleading

The report always recommended spike-extraction work regardless of:

- active docs freshness through PR60 / PR61 truth
- stale PR #116 signals in local docs/reports
- current control-plane cleanup priority

So the report could point to automation packet work when docs/control-plane status still required human/docs cleanup first.

## Exact Fix

`scripts/report_local_agent_session.py` now derives recommendation fields from local-only signals:

1. Docs freshness detection (no network, no `gh`, no mutation):
   - scans `README.md`
   - scans active `MASTER_DOCS/**/*.md` excluding archive
   - checks PR60/PR61 truth tokens (`PR60/#119` and `PR61/#120`) in both README and MASTER_DOCS corpus
2. Stale PR116 detection from local docs/report references only:
   - scans README, active MASTER_DOCS, PR60 audit, PR63 audit
   - classifies `PR116_STALE_OPEN_REFERENCED_IN_LOCAL_DOCS` when PR116 and stale/open signals are present
3. Derived recommendation logic:
   - docs stale -> `DOCS` / `SYNC_ACTIVE_DOCS_WITH_PR60_PR61_TRUTH`
   - docs current + stale PR116 referenced -> `CONTROL_PLANE` / `HUMAN_DECISION_ON_STALE_PR116`
   - otherwise -> `AUTOMATION` / `ADD_SPIKE_EXTRACTION_PACKET_GENERATOR_OR_FIX_CONTROL_PLANE`
4. Spike branch handling:
   - adds `spike_status`
   - reports `PRESENT_READ_ONLY` when found
   - does not force recommendation by itself
5. Added required report fields:
   - `docs_freshness_status`
   - `stale_pr116_status`
   - `spike_status`
   - plus existing control-plane/session fields
6. Verdict update:
   - `software_verdict: LOCAL_AGENT_SESSION_RECOMMENDATION_FIXED`
   - `evidence_verdict: MECHANICAL_CONTROL_PLANE_ONLY`
   - `claim_verdict: NO_CLAIM_ALLOWED`

## Before / After Recommendation Behavior

Before:

- hardcoded next lane/action
- defaulted to spike extraction packet generator every run

After:

- recommendation is local-state-derived
- docs/control-plane cleanup is prioritized when docs truth or stale PR116 references indicate blockers
- automation recommendation appears only when docs/control-plane blockers are not immediate

## No Runtime Behavior Change

This PR modifies only `scripts/report_local_agent_session.py` and this audit markdown.
No `src/**`, `tests/**`, `ml/**`, `.github/**`, benchmark outputs, run outputs, holdout, or dataset state were changed.

## No Claim Authority

The report remains mechanical control-plane metadata.
It does not assert Elo, strength, promotion, scientific proof, or canonical evidence.
`claim_verdict` remains `NO_CLAIM_ALLOWED`.

## Validation Results

Commands run:

- `.\.venv312\Scripts\python.exe -m py_compile scripts/report_local_agent_session.py` -> PASS
- `.\.venv312\Scripts\python.exe scripts/report_local_agent_session.py --pretty` -> PASS
  - observed:
    - `docs_freshness_status: DOCS_NEED_PR60_PR61_TRUTH_SYNC`
    - `stale_pr116_status: PR116_STALE_OPEN_REFERENCED_IN_LOCAL_DOCS`
    - `recommended_next_lane: DOCS`
    - `recommended_next_action: SYNC_ACTIVE_DOCS_WITH_PR60_PR61_TRUTH`
    - `spike_status: PRESENT_READ_ONLY`
- `.\.venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty` -> PASS (`software_verdict: PASS`, no blocked reasons)
- `.\.venv312\Scripts\python.exe scripts/run_local_agent_verify.py --pretty` -> PASS
- `.\.venv312\Scripts\python.exe scripts/run_local_agent_verify.py --run-checks --pretty` -> PASS
- `cargo check` -> PASS (warnings only)
- `cargo test fen_round_trip -- --nocapture` -> PASS
- `cargo test root_decision -- --nocapture` -> PASS

Skipped validation:

- none
