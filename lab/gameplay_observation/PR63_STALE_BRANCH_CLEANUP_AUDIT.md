# PR-63 Stale Branch Cleanup Audit

Date: 2026-05-06

Mode: read-only audit.

No branches were deleted. No pull requests were closed. No GitHub cleanup state was mutated by this audit.

## Scope

This report audits local branches, remote-tracking branches, open pull requests, and recently closed pull requests to identify cleanup candidates for later human review.

The audit is mechanical control-plane evidence only. It is not performance evidence, promotion evidence, Elo evidence, strength evidence, or scientific proof.

## Inputs

Requested commands:

- `git fetch origin --prune`
- `git switch main`
- `git pull --ff-only origin main`
- `git status --porcelain`
- `git log --oneline -20`
- `git switch -c automation-pr63-stale-branch-cleanup-audit`
- `git branch --merged main`
- `git branch -r --merged origin/main`
- `git branch --no-merged main`
- `git branch -r --no-merged origin/main`
- `gh pr list --state open --json number,title,headRefName,isDraft,updatedAt,url`
- `gh pr list --state closed --limit 100 --json number,title,headRefName,mergedAt,url`

## Workspace Baseline

`git fetch origin --prune`: completed.

`git switch main`: completed; pre-existing local modifications remained in the worktree.

`git pull --ff-only origin main`: completed; already up to date.

`git status --porcelain` before the audit branch:

```text
 M MASTER_DOCS/03_KNOWN_ISSUES.md
 M MASTER_DOCS/07_PROJECT_HISTORY.md
 M MASTER_DOCS/CURRENT_CODE_AUDIT_AND_KNOWN_ISSUES.md
 M MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md
 M lab/reports/latest_benchmark_summary.json
```

These files are pre-existing local tracked noise and are not part of this audit change.

Recent `main` history at audit start:

```text
22210d41 Merge pull request #119 from pierrelouisfradcourt-create/automation-pr60-push-automation-cleanup-audit
f7d2702e automation: audit push and automation cleanup state
c81e3748 Merge pull request #118 from pierrelouisfradcourt-create/automation-pr59-local-agent-session-report
ea9e8065 automation: add local agent session report
929d6535 Merge pull request #117 from pierrelouisfradcourt-create/runtime-pr58-passive-decision-trace-bridge
a9c7457a runtime: fix passive DecisionTrace bridge tests
5ef139e2 runtime: add passive DecisionTrace bridge
5c8a3880 Merge pull request #115 from pierrelouisfradcourt-create/runtime-pr57-legal-action-adapter-scaffold
7fab04eb runtime: add LegalAction adapter scaffold
231c7002 Merge pull request #114 from pierrelouisfradcourt-create/automation-pr56-telemetry-smoke-in-local-verify
9960b6c0 automation: add telemetry smoke to local verifier
5e17b685 Merge pull request #113 from pierrelouisfradcourt-create/automation-pr55-telemetry-json-dry-run-smoke
7746cbb0 automation: add telemetry JSON dry-run smoke
3f221f2a Merge pull request #112 from pierrelouisfradcourt-create/automation-pr54-telemetry-json-dry-run-script
4681bf3e automation: add telemetry JSON dry-run script
a2264cd1 Merge pull request #111 from pierrelouisfradcourt-create/runtime-pr53-telemetry-json-sandbox-writer
dfafd69a runtime: add telemetry JSON sandbox writer
b6033033 Merge pull request #110 from pierrelouisfradcourt-create/runtime-pr52-telemetry-json-dry-run-fixture
6fc1b68c runtime: add telemetry JSON dry-run fixture
47846ad4 Merge pull request #109 from pierrelouisfradcourt-create/runtime-pr51-telemetry-json-format
```

## Open Pull Requests

| PR | Classification | Branch | Draft | Updated | URL |
| --- | --- | --- | --- | --- | --- |
| #120 | KEEP_OPEN_PR | `docs-pr61-sync-active-docs-through-pr60` | yes | 2026-05-06T19:12:38Z | https://github.com/pierrelouisfradcourt-create/TacticalChessPureLab/pull/120 |
| #116 | KEEP_OPEN_PR_STALE | `docs-sync-current-truth` | yes | 2026-05-06T17:00:22Z | https://github.com/pierrelouisfradcourt-create/TacticalChessPureLab/pull/116 |

PR #116 is classified as `KEEP_OPEN_PR_STALE` by explicit instruction. No PR was closed.

## Branch Classification Summary

### SAFE_TO_DELETE_LATER_MERGED_LOCAL

Local branches whose tips are already merged into `main`, excluding `main` and the active audit branch:

```text
automation-pr28-add-agents-and-local-verify
automation-pr29-add-pr-readiness-checker
automation-pr30-add-one-shot-loop-runner
automation-pr32-add-next-loop-dispatcher
automation-pr36-refresh-noncanonical-task-source
automation-pr40-close-noncanonical-loop-cycle
automation-pr46-local-verifier-runtime-scopes
automation-pr47-close-phase2-core-minimal
automation-pr50-close-telemetry-prep-schema
automation-pr54-telemetry-json-dry-run-script
automation-pr55-telemetry-json-dry-run-smoke
automation-pr56-telemetry-smoke-in-local-verify
automation-pr59-local-agent-session-report
automation-pr60-push-automation-cleanup-audit
ci-pr27-harden-chess-test
docs-pr26-sync-master-docs-through-pr25
linked-pedagogy-audit
maintenance-pr23-local-workspace-hygiene
maintenance-pr25a-workspace-sync-safety-check
package1-clean
package1-clean.pre-clean-20260429-122207
pr-00c-n8n-fail-closed-entry-spec
pr-01-canonical-ci
runtime-pr14-gameplay-observation-batch
runtime-pr15-observation-triage-batch
runtime-pr16-codex-task-queue-batch
runtime-pr18-codex-executor-scaffold-batch
runtime-pr19-codex-result-intake-batch
runtime-pr21-automation-status-report-batch
runtime-pr22-first-manual-codex-loop
runtime-pr24-second-manual-codex-loop
runtime-pr25-third-manual-codex-loop
runtime-pr31-fourth-manual-codex-loop
runtime-pr33-next-manual-codex-loop
runtime-pr34-next-manual-codex-loop
runtime-pr35-next-manual-codex-loop
runtime-pr36-next-manual-codex-loop
runtime-pr37-next-manual-codex-loop
runtime-pr38-next-manual-codex-loop
runtime-pr39-next-manual-codex-loop
runtime-pr41-deterministic-engine-tests
runtime-pr42-simulate-undo-coverage
runtime-pr43-legal-action-stability-coverage
runtime-pr44-action-key-identity-coverage
runtime-pr45-core-minimal-identity
runtime-pr48-telemetry-prep-schema
runtime-pr49-telemetry-schema-validation
runtime-pr51-telemetry-json-format
runtime-pr52-telemetry-json-dry-run-fixture
runtime-pr53-telemetry-json-sandbox-writer
runtime-pr57-legal-action-adapter-scaffold
runtime-pr58-passive-decision-trace-bridge
```

### SAFE_TO_DELETE_LATER_MERGED_REMOTE

Remote-tracking branches whose tips are already merged into `origin/main`, excluding `origin/main` and `origin/HEAD`:

```text
origin/automation-pr08-limited-repair-loop
origin/automation-pr09-cockpit-reporting
origin/automation-pr10-first-runtime-under-gates
origin/automation-pr28-add-agents-and-local-verify
origin/automation-pr29-add-pr-readiness-checker
origin/automation-pr30-add-one-shot-loop-runner
origin/automation-pr32-add-next-loop-dispatcher
origin/automation-pr36-refresh-noncanonical-task-source
origin/automation-pr40-close-noncanonical-loop-cycle
origin/automation-pr46-local-verifier-runtime-scopes
origin/automation-pr47-close-phase2-core-minimal
origin/automation-pr50-close-telemetry-prep-schema
origin/automation-pr54-telemetry-json-dry-run-script
origin/automation-pr55-telemetry-json-dry-run-smoke
origin/automation-pr56-telemetry-smoke-in-local-verify
origin/automation-pr59-local-agent-session-report
origin/automation-pr60-push-automation-cleanup-audit
origin/ci-pr27-harden-chess-test
origin/dataset/master-balance-spec
origin/docs-post-pr07-evidence-plane
origin/docs-post-pr10-status-reset
origin/docs-pr26-sync-master-docs-through-pr25
origin/linked-pedagogy-audit
origin/maintenance-pr23-local-workspace-hygiene
origin/package1-clean
origin/pr-00c-n8n-fail-closed-entry-spec
origin/pr-01-canonical-ci
origin/runtime-pr12-fast-daily-iteration-harness
origin/runtime-pr13b-search-nonconverting-observation-packet
origin/runtime-pr13c-noncanonical-gameplay-observation-runner
origin/runtime-pr13d-observe-fen-entrypoint
origin/runtime-pr13e-runner-observe-fen
origin/runtime-pr13f-observe-fen-depth-aware
origin/runtime-pr13g-observation-search-metadata
origin/runtime-pr13h-observe-fen-candidates
origin/runtime-pr13i-runner-candidate-diagnostics
origin/runtime-pr13j-depth-sweep-observation
origin/runtime-pr14-gameplay-observation-batch
origin/runtime-pr15-observation-triage-batch
origin/runtime-pr16-codex-task-queue-batch
origin/runtime-pr17-codex-prompt-pack-batch
origin/runtime-pr18-codex-executor-scaffold-batch
origin/runtime-pr19-codex-result-intake-batch
origin/runtime-pr20-orchestration-smoke-runner-batch
origin/runtime-pr21-automation-status-report-batch
origin/runtime-pr22-first-manual-codex-loop
origin/runtime-pr24-second-manual-codex-loop
origin/runtime-pr25-third-manual-codex-loop
origin/runtime-pr31-fourth-manual-codex-loop
origin/runtime-pr33-next-manual-codex-loop
origin/runtime-pr34-next-manual-codex-loop
origin/runtime-pr35-next-manual-codex-loop
origin/runtime-pr37-next-manual-codex-loop
origin/runtime-pr38-next-manual-codex-loop
origin/runtime-pr39-next-manual-codex-loop
origin/runtime-pr41-deterministic-engine-tests
origin/runtime-pr42-simulate-undo-coverage
origin/runtime-pr43-legal-action-stability-coverage
origin/runtime-pr44-action-key-identity-coverage
origin/runtime-pr45-core-minimal-identity
origin/runtime-pr48-telemetry-prep-schema
origin/runtime-pr49-telemetry-schema-validation
origin/runtime-pr51-telemetry-json-format
origin/runtime-pr52-telemetry-json-dry-run-fixture
origin/runtime-pr53-telemetry-json-sandbox-writer
origin/runtime-pr57-legal-action-adapter-scaffold
origin/runtime-pr58-passive-decision-trace-bridge
origin/security-pr13a-ci-gates-hardening
```

### KEEP_OPEN_PR

```text
docs-pr61-sync-active-docs-through-pr60
origin/docs-pr61-sync-active-docs-through-pr60
```

### KEEP_OPEN_PR_STALE

```text
docs-sync-current-truth
origin/docs-sync-current-truth
```

### KEEP_SPIKE_READ_ONLY

```text
spike-aaa-search-neural-engine-split
```

The spike branch is unmerged locally and is explicitly classified as read-only keep state.

### KEEP_UNKNOWN_HISTORICAL

Unmerged local branches without an open PR match in this audit:

```text
action-id-mask-classical-v1
architecture-skeleton-v1
castling-spec-classical-regression-v1
chess360-near-ready-before-big-cut-engine-search-neural
chess960-castling-black-overlap-cases-v1
chess960-castling-blocker-contract-v1
chess960-castling-legality-negative-cases-v1
chess960-castling-overlap-cases-v1
chess960-castling-spec-audit-v1
chess960-castling-spec-v1
chess960-fen-contract-v1
chess960-readiness-audit
chess960-setup-loader-v1
chess960-setup-smoke-v1
codex/benchmark-dry-run-plan-contract
codex/benchmark-runtime-telemetry-consumer-test
codex/big-evaluation-smoke-minimal
codex/big-minimal-dataset-generation
codex/big-pipeline-sanity-smoke
codex/big-selfplay-dataset-foundation
codex/big-training-smoke-minimal
codex/dataset-loader-minimal-contracts
codex/evaluation-protocol-candidate-contract
codex/evaluation-protocol-dry-run
codex/evaluation-protocol-manifest-contract
codex/export-dataset-check-contracts
codex/gameplay-micro-benchmark-target-only-v2
codex/micro-benchmark-target-only-v1
codex/micro-gameplay-smoke-non-neural-target-only-v1
codex/p3-neural-split
codex/post-pr05-evidence-plane-docs
codex/pr-04-input-boundary-tampering-gate
codex/python-telemetry-consumer-contracts
codex/redirect-weakness-log-target-safe
codex/redirect-weakness-log-target-safe-v2
codex/telemetry-contract-neural-match-runtime
codex/telemetry-contract-neural-move-runtime
deterministic-legal-actions-v1
docs-align-reprise-prompts
docs-post-pr07-evidence-plane
docs/chess960-castling-negative-checkpoint-v1
docs/hybrid-roadmap-audit
integration-local-a-b-c-d
legal-action-read-model-classical-v1
legal-action-read-model-mask-classical-v1
micro-gameplay-v2-contract
micro-gameplay-v3-manifest
observation-schema-classical-v0
phase1-5-action-key
phase1-deterministic-engine
phase1-deterministic-engine-clean
pr-00a-trust-root
pr-00a-trust-root-clean
pr-00b-no-code-trust-root
pr-02-run-bundle-contract
pr-03-mechanical-parser
pr-04-input-boundary-tampering-gate
pr-05-claim-data-gates
pr-06-wire-evidence-gates-into-ci
pr-07-gpt55-structured-audit
rocky-freeze-v1
runtime-pr13d-observe-fen-entrypoint
runtime-pr13f-observe-fen-depth-aware
runtime-pr13h-observe-fen-candidates
runtime-pr23-sync-hygiene
save-local-before-sync
simulate-undo-torture-v1
split-a-chess960-setup-foundation
split-b-classical-safety-contracts
split-c-classical-readonly-pipeline
split-d-chess960-castling-explicit-path
strength-recovery-v1
```

Unmerged remote-tracking branches without an open PR match in this audit:

```text
origin/architecture-skeleton-v1
origin/chess960-readiness-audit
origin/codex/post-pr05-evidence-plane-docs
origin/docs-align-reprise-prompts
origin/docs/hybrid-roadmap-audit
origin/docs/perfect-dataset-manifest-v1
origin/integration-local-a-b-c-d
origin/micro-gameplay-v2-contract
origin/micro-gameplay-v3-manifest
origin/phase1-5-action-key
origin/phase1-deterministic-engine
origin/phase1-deterministic-engine-clean
origin/pr-00a-trust-root
origin/pr-00a-trust-root-clean
origin/pr-00b-no-code-trust-root
origin/pr-02-run-bundle-contract
origin/pr-03-mechanical-parser
origin/pr-04-input-boundary-tampering-gate
origin/pr-05-claim-data-gates
origin/pr-06-wire-evidence-gates-into-ci
origin/pr-07-gpt55-structured-audit
origin/pr13c
origin/rocky-freeze-v1
origin/runtime-pr13f-depth-aware-observe-fen
origin/save-local-before-sync
origin/strength-recovery-v1
```

### DO_NOT_TOUCH_WITHOUT_HUMAN

```text
main
origin/main
origin/HEAD -> origin/main
automation-pr63-stale-branch-cleanup-audit
```

`main` is the protected base branch and is never listed for deletion. The active PR-63 branch is the audit delivery branch.

## Recently Closed PR Signals

Recent closed PR metadata was used to cross-check merged branch names. Most recently merged PR heads include:

```text
#119 automation-pr60-push-automation-cleanup-audit merged 2026-05-06T18:23:49Z
#118 automation-pr59-local-agent-session-report merged 2026-05-06T17:30:08Z
#117 runtime-pr58-passive-decision-trace-bridge merged 2026-05-06T17:14:15Z
#115 runtime-pr57-legal-action-adapter-scaffold merged 2026-05-06T16:44:23Z
#114 automation-pr56-telemetry-smoke-in-local-verify merged 2026-05-06T16:27:06Z
#113 automation-pr55-telemetry-json-dry-run-smoke merged 2026-05-06T16:09:15Z
#112 automation-pr54-telemetry-json-dry-run-script merged 2026-05-06T15:55:49Z
#111 runtime-pr53-telemetry-json-sandbox-writer merged 2026-05-06T15:37:47Z
#110 runtime-pr52-telemetry-json-dry-run-fixture merged 2026-05-06T15:23:50Z
#109 runtime-pr51-telemetry-json-format merged 2026-05-06T15:12:17Z
```

Closed but unmerged historical PR heads observed in the last 100 closed PRs include:

```text
#43 pr-00a-trust-root mergedAt null
#38 phase1-deterministic-engine mergedAt null
```

Those branch names remain in keep/unknown classifications unless direct human cleanup approval is given later.

## Cleanup Verdict

Branch cleanup verdict: `REPORT_ONLY_NO_DELETION`

PR116 status: `KEEP_OPEN_PR_STALE`

Spike branch status: `KEEP_SPIKE_READ_ONLY`

Local tracked noise:

```text
MASTER_DOCS/03_KNOWN_ISSUES.md
MASTER_DOCS/07_PROJECT_HISTORY.md
MASTER_DOCS/CURRENT_CODE_AUDIT_AND_KNOWN_ISSUES.md
MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md
lab/reports/latest_benchmark_summary.json
```

Sandbox outputs tracked: checked separately before commit.

Behavior risk: Low; report-only Markdown change, no runtime, source, test, CI, ML, benchmark, branch deletion, or PR closure behavior changed.

Evidence risk: Medium; branch classification is a point-in-time audit from local git refs and GitHub PR list responses after `git fetch origin --prune`.

Claim risk: Low; no performance, strength, Elo, promotion, or proof claim is made.

software_verdict: STALE_BRANCH_CLEANUP_AUDIT_ADDED

evidence_verdict: MECHANICAL_CONTROL_PLANE_AUDIT_ONLY

claim_verdict: NO_CLAIM_ALLOWED
