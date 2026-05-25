# 19 - Agent Guardrail Policy (Baseline)

## Scope

This policy defines machine-readable baseline guardrails for the TacticalChessPureLab multi-agent control plane.
It is docs/control-plane only and grants no active runner authority.

## Core Principles

1. Deny by default: any action not explicitly allowed is denied.
2. No agent can merge pull requests.
3. No agent can decide claim authority.
4. No agent can modify its own rules.
5. No agent can modify branch protection.
6. No agent can modify runtime/tests/CI without explicit human review.

## Immediate Freeze Triggers

Freeze immediately when any condition is true:

- forbidden file or forbidden surface touched
- tests or CI modified to mask failures
- invented performance claim
- benchmark treated as proof
- agent self-scores
- autonomy level exceeded

## Strike Rules

- Minor strike: policy drift or non-critical process violation.
- Major strike: serious policy violation, evidence misuse, or prohibited write attempt.
- Immediate freeze: critical violation trigger, no strike accumulation required.
- Unfreeze is human-only.

## Autonomy Levels

- 0 READ_ONLY
- 1 DOCS_ONLY
- 2 CONTROL_PLANE_ONLY
- 3 PATCH_PROPOSAL_ONLY
- 4 HUMAN_APPROVED_WRITE_ONLY

No autonomy level grants merge or claim authority.

## Governance Notes

- These files are metadata-only policy artifacts.
- Human authority remains final for merge, freeze, unfreeze, and claim decisions.
- claim_verdict default remains NO_CLAIM_ALLOWED.

## Audit #190 hardening notes

- forbidden surfaces extended to include control-plane, schema, CI/tests/src/scripts, dataset, holdout, and run artifacts boundaries.
- tool taxonomy converted to a closed enum list in schema, with no wildcard permission patterns.
- explicit `DENY` policy rows enforced for merge, claim, self-policy, self-score, branch protection edits, runtime/tests/CI modifications, benchmark, gameplay loop, and canonical evidence creation.
- strike reset contract is human-only (`auto_reset=false`, `strike_reset=HUMAN_ONLY`, decision record and reason required).
- autonomy promotion contract is human-only, machine-readable, and disallows self-promotion.
- no autonomy level grants merge authority, claim authority, branch protection edit authority, or self-policy edit authority.
- PR #190 remains control-plane docs/policy only: no active runner, no CI change, no runtime change, no benchmark activity, and no claim authority.
