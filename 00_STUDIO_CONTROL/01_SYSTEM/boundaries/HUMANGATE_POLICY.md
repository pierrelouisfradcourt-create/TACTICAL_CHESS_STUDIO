# HUMANGATE_POLICY

⚠ LEGACY (ratifié Pierre 2026-07-20) — jamais employé ; canonique = decision-log.md + HUMANGATE_*.md par incrément.

status: DOCUMENTED_ONLY

HumanGate is the final authority for sensitive, irreversible, external, or claim-bearing actions.

## Mandatory Human Decisions

- auth/MFA/accounts
- UAC/admin
- GitHub/OpenAI login
- VPN
- drivers and system update policy
- BIOS/firmware flashing
- repo source: GitHub clone vs verified bundle
- push/PR/CI
- datasets/models
- claims/publication

## Decision Record Fields

| field | meaning |
|---|---|
| decision_id | Stable identifier for the decision. |
| date | Decision date. |
| actor | Human or authorized reviewer making the decision. |
| scope | Bounded area covered by the decision. |
| allowed_actions | Actions explicitly allowed. |
| forbidden_actions | Actions explicitly forbidden. |
| expiry | Expiration date or condition. |
| notes | Context, constraints, or evidence links. |
