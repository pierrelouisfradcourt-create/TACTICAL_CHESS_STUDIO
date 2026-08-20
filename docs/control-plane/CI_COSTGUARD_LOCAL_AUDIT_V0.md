# CI CostGuard Local Audit V0

## Purpose

This document defines a local-only CI CostGuard audit for planned PRs.

The audit reads a changed-paths fixture and an observed CI usage fixture, then emits a deterministic local risk report before a push or draft PR.

It is control-plane reporting only. It does not modify workflows, runtime code, ML/training code, benchmark code, branch protection, or required checks.

## Why The Minutes Were Exhausted

The observed GitHub Actions usage snapshot showed:

- 2000/2000 minutes exhausted.
- About 2016 minutes consumed.
- About 2014 job runs.
- About 602 workflow runs.
- `canonical-ci.yml` was the main observed consumer with about 1698 minutes, 286 workflow runs, and 6 jobs per run.

The local diagnosis is that cost came from too many runs plus job multiplication. It was not explained by one heavy benchmark.

## Why Local-First Batching Exists

The solo-dev workflow needs a cheap classification step before pushing.

Local-first batching keeps iteration in the local workspace, groups coherent PatchPacks, and reserves GitHub Actions for final confirmation instead of exploratory churn.

The CostGuard report is not a merge decision. It is a pre-push warning label that helps the human decide whether the planned PR should remain batched, split, held, or routed through heavier checks.

## Why This PR Does Not Modify Workflows

Workflow throttling changes affect required checks and branch-protection behavior.

This patch only adds local evidence-gathering tools, fixtures, and doctrine. A future workflow patch can use this report format and the observed usage data as input.

No active CI throttling is introduced here.

## Why Naive Required Workflow Path Filters Are Risky

Required checks can remain pending if a required workflow is skipped by naive path filters.

That can block merges even when the skipped work was intentional. Path-aware CI should be introduced carefully, with an always-conclusive final gate or another branch-protection-safe mechanism.

This audit exists to classify PRs locally before changing remote workflow behavior.

## Usage

Run the local report before opening or pushing a PR:

```powershell
.\.venv312\Scripts\python.exe scripts\control_plane\ci_costguard_report.py --changed-paths docs\control-plane\fixtures\ci_costguard\changed_paths_docs_only_v0.json --usage-profile docs\control-plane\fixtures\ci_costguard\ci_usage_observed_v0.json --pretty
```

Runtime-like example:

```powershell
.\.venv312\Scripts\python.exe scripts\control_plane\ci_costguard_report.py --changed-paths docs\control-plane\fixtures\ci_costguard\changed_paths_runtime_v0.json --usage-profile docs\control-plane\fixtures\ci_costguard\ci_usage_observed_v0.json --pretty
```

The report classifies changes as `DOCS_ONLY`, `CONTROL_PLANE`, `RUNTIME`, `ML`, `WORKFLOW`, `BENCHMARK`, or `MIXED`.

It recommends a CI policy and human action, but HumanGate remains final authority.

## Future Canonical CI Throttle Pack

This local audit prepares a future Canonical CI Throttle Pack by separating the evidence step from the workflow-change step.

The future pack can decide how to route docs-only, control-plane, runtime, ML, workflow, benchmark, and mixed changes without guessing from the exhausted quota incident alone.

## Boundaries

- no workflow modification
- no runtime/search/neural modification
- no ML/training modification
- no benchmark automation
- no auto-ready
- no auto-merge
- no GitHub API calls from the script
- no OpenAI/Codex calls from the script
- no subprocess calls from the script
- no file writes from the script

HumanGate remains final authority.

software_verdict: CONTROL_PLANE_CI_COSTGUARD_LOCAL_AUDIT_ONLY

evidence_verdict: LOCAL_CI_RISK_REPORT_ONLY

claim_verdict: NO_CLAIM_ALLOWED
