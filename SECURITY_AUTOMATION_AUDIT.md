# Security Automation Audit

Status: PR-13A baseline hardening document  
Scope: GitHub Actions, CODEOWNERS, automation validators, evidence-plane gates, and pre-runtime dry-run safety  
Claim status: no claim allowed

## Purpose

This document records the minimum security posture required before any runtime-under-gates observation packet is attempted.

The Research OS now protects iteration. It does not yet prove science.

Current permitted state:

```text
GOVERNANCE_READY
STATIC_PACKET_VALIDATION_READY
NON_CANONICAL_DRY_RUN_PREP_READY
CANONICAL_EVIDENCE_NOT_READY
CLAIM_NOT_ALLOWED
PROMOTION_NOT_ALLOWED
```

## PR-13A Hardening Baseline

PR-13A applies and documents minimal CI hardening before PR-13B runtime observation work.

Required controls:

```text
- canonical CI keeps top-level permissions: contents: read
- every actions/checkout@v4 step uses persist-credentials: false
- CODEOWNERS covers workflow, gate, policy, evidence, and registry surfaces
- branch protection / rulesets checklist is documented
- workflow/gate/script/policy changes require explicit SECURITY_REVIEW notes
- no secrets are required by canonical CI
- no workflow job creates canonical evidence
- no workflow job writes lab/runs/RUN_*
- no workflow job updates lab/runs/latest.json
- no workflow job accesses holdout/
- no workflow job authorizes claims or promotion
```

## Branch Protection / Rulesets Checklist

Repository settings should enforce, at minimum, for `main`:

```text
- require pull request before merge
- require status checks before merge
- require Canonical CI success
- require Chess Test success when relevant
- require conversation resolution before merge
- require CODEOWNERS review for protected paths if available
- block force pushes
- block branch deletion
- restrict direct pushes where available
```

This checklist is a repository settings requirement. It is not enforceable from this file alone.

## Security Review Requirement

Any PR that modifies one of these surfaces must include a `SECURITY_REVIEW` section in the PR body or report:

```text
.github/workflows/
.github/CODEOWNERS
SECURITY_BOUNDARY.md
SECURITY_AUTOMATION_AUDIT.md
LAB_POLICY_BOOTSTRAP.md
lab/policies/
lab/run_contracts/
lab/claim_data_gates/
lab/gates/
lab/parsers/
lab/repair_loop/
lab/decision_packets/
lab/runtime_dry_run/
lab/daily_iteration/
lab/runs/
lab/claim_registry/
lab/metric_registry/
lab/data_ledger/
lab/split_manifests/
lab/surfaces/
lab/registry_events/
holdout/
protocol.lock.json
**/protocol.lock.json
scripts/parse_run_bundle.py
scripts/check_*.py
scripts/*gate*.py
scripts/audit_gpt55*.py
scripts/limited_repair_loop.py
scripts/check_decision_packets.py
scripts/check_runtime_dry_run_packet.py
scripts/check_daily_iteration_packet.py
```

The security review must state:

```text
- whether permissions changed
- whether secrets were introduced
- whether network access was introduced
- whether subprocess / shell execution was introduced
- whether any packet content can be executed
- whether writes to lab/runs or latest.json are possible
- whether holdout access is possible
- whether claim or promotion authority changed
- whether the change is fail-closed
```

## Automation Script Checklist

Every automation validator should satisfy:

```text
- no network
- no subprocess / shell execution from packet content
- no write into lab/runs
- no latest.json write
- no holdout access
- safe relative path validation when paths are accepted
- fail-closed behavior
- no broad exception swallowing that converts errors into PASS
- outputs non-canonical only unless explicitly part of a future RUN_* contract
```

## Anti-Infra-Loop Rule

After PR-12, every pure-infra PR must state which runtime-under-gates learning it enables.

If it does not enable a concrete runtime-under-gates learning step, it should be treated as:

```text
BLOCKED_INFRA_OVERHEAD
```

Security hardening is allowed when it directly protects future runtime observations or canonical evidence.

## Current Next Step

After PR-13A, the next intended step is:

```text
PR-13B - first non-canonical gameplay observation packet
```

Recommended theme:

```text
search behavior in non-converting positions
```

The PR-13B packet must include:

```json
{
  "learning_value": "What this observation can teach",
  "discard_if": "When this observation is useless",
  "next_decision_enabled": "What future decision this observation can inform"
}
```

Allowed verdict posture:

```text
software_verdict: PASS|FAIL|BLOCKED|UNCERTAIN
evidence_verdict: INCOMPLETE|INVALID
claim_verdict: NO_CLAIM_ALLOWED
```

Forbidden for PR-13B:

```text
canonical benchmark
promotion run
dataset reset
holdout access
Elo / strength claim
TARGETED_BEHAVIOR_ONLY claim
STRENGTH_CLAIM_CANDIDATE
```

## Final Rule

```text
The gates exist and run.
Now the gates themselves must be protected.

The system can start learning under control.
It cannot yet prove under control.
```
