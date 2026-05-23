# TacticalChessPureLab

Concise entrypoint for the current repository state.

## Read first

1. `AGENTS.md`
2. `MASTER_DOCS/DOCS_STATUS.md`
3. `MASTER_DOCS/00_EXEC_SUMMARY.md`
4. `MASTER_DOCS/01_CURRENT_STATE.md`
5. `MASTER_DOCS/03_KNOWN_ISSUES.md`
6. `MASTER_DOCS/05_ARCHITECTURE.md`

`docs/gpt-navigator/GPT_NAVIGATOR_REPO_NOTICE_V0.md` is a compact navigation aid for GPT/browser sessions.

## Authority order

Current source code, tests, and committed runtime artifacts outrank stale or historical documentation. If docs disagree with active code or latest committed artifacts, inspect the repo state and treat the docs as outdated until refreshed.

Use this separation when reporting repo state:

- active runtime code
- tests
- outputs/runtime artifacts
- canonical docs
- roadmap/docs-only material
- inference

## Current doctrine

- Rust owns runtime truth.
- Python owns ML, inference, and tooling.
- Search remains final move authority.
- Neural components may propose or rerank; they do not decide alone.
- Dataset labels require ActionId, LegalAction, ActionMask, provenance, and HumanGate.
- HumanGate remains final authority for activation, promotion, merge, reject, freeze, and claim status.

## Claim boundary

Default claim posture:

- `claim_verdict: NO_CLAIM_ALLOWED`

Benchmarks, reports, roadmap docs, and generated artifacts are observations or plans unless a scoped validation packet and HumanGate say otherwise. Keep final reporting split into:

- `software_verdict`
- `evidence_verdict`
- `claim_verdict`

## Notes

Roadmap documents remain useful for direction, but they are not implementation proof. Keep cleanup PRs narrow and avoid changing runtime, tests, workflows, benchmark, training, or dataset behavior unless explicitly requested.
