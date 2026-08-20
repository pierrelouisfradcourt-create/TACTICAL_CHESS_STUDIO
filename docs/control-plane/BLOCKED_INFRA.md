# BLOCKED_INFRA PR Decision State

## 1. Purpose

Define `BLOCKED_INFRA` as a formal PR decision state for infrastructure or platform failures that prevent validation from running.

## 2. Definition

`BLOCKED_INFRA` means:

- the PR cannot be merged
- the PR should not be patched automatically
- the failure is not currently attributable to changed repo code
- the correct action is to fix or retry infrastructure, then rerun checks

## 3. GitHub Actions Pre-Step Failure Pattern (Observed)

Typical pattern:

- GitHub annotation reports recent account payments failed or spending limit must be increased
- jobs never start
- `steps: []`
- `runner_id: 0`
- `runner_name: ""`
- logs unavailable or `log not found`
- local validations may pass
- remote CI remains unverified

This is a control-plane infrastructure blocker, not a repository code failure by default.

## 4. Classification Table

| State | Typical Trigger | Action |
| --- | --- | --- |
| `BLOCKED_INFRA` | Billing issue, runner outage, quota/spending-limit cap, platform pre-step failure | Hold PR, resolve infra, rerun checks |
| `BLOCKED_CODE` | Code/test/script failure after job starts | Investigate and patch repository code |
| `BLOCKED_SCOPE` | Unexpected files or forbidden paths in diff | Restrict scope, remove forbidden changes |
| `BLOCKED_CLAIM` | `claim_verdict` missing, invalid, or escalated | Block until claim gate is compliant |
| `BLOCKED_CHECKS` | Checks execute and fail | Fix failing checks, rerun |
| `WAITING_FOR_CHECKS` | Checks pending, queued, or in progress | Wait and re-evaluate |
| `SAFE_TO_READY` | Checks passed, scope valid, no blockers | Eligible for ready decision by human authority |

## 5. Decision Rule

If jobs do not start and no commands execute:

- do not patch code
- do not modify workflows
- do not merge
- mark PR as `HOLD_INFRA` or `BLOCKED_INFRA`
- fix billing, quota, or platform issue
- rerun failed workflows
- only then re-review the PR

## 6. Required PR Decision Output

Use this compact decision header:

`PR DECISION: GO / HOLD / BLOCKED / BLOCKED_INFRA`

Evaluate five gates:

- Scope files
- Checks
- Technical verdict
- Claim verdict
- Product objective

Suggested compact format:

```text
PR DECISION: BLOCKED_INFRA
Scope files: PASS
Checks: BLOCKED_INFRA (pre-step platform failure; no steps executed)
Technical verdict: UNVERIFIED_REMOTE
Claim verdict: NO_CLAIM_ALLOWED
Product objective: PENDING_CHECKS
```

## 7. PR #214 Case Note (Non-Canonical)

- PR `#214` Codex Handoff Pack had local `PASS`
- GitHub Actions failed before runner start due billing/spending-limit annotation
- classification: `BLOCKED_INFRA`
- patch_needed: `no`
- merge_allowed: `no`
- next_action: fix GitHub billing/spending limit and rerun checks

This note is operational context only and is not canonical evidence.

## 8. Boundaries

- `BLOCKED_INFRA` is not evidence of code correctness
- local `PASS` does not replace remote checks
- no benchmark proof
- no capability claim
- no merge without successful remote checks or explicit future policy
- HumanGate remains final authority

## 9. Verdicts

software_verdict: CONTROL_PLANE_DOCS_ONLY

evidence_verdict: INFRA_BLOCKER_CLASSIFICATION_ONLY

claim_verdict: NO_CLAIM_ALLOWED
