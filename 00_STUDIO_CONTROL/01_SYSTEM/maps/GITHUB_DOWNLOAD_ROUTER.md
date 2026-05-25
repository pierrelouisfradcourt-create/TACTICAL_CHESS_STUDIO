# GITHUB_DOWNLOAD_ROUTER

status: DOCUMENTED_ONLY

Purpose: classify GitHub material before local placement.

Routes:

| source type | status | local placement |
|---|---|---|
| repository clone/fetch | IMPLEMENTED only through git | repos\games\TacticalChessPureLab |
| workflow logs | PASSIVE | archives\github\workflow_logs |
| workflow artifacts | PASSIVE | archives\github\workflow_artifacts |
| PR or issue exports | PASSIVE | archives\github\pull_requests or archives\github\issues |
| patch/diff bundles | PASSIVE | archives\github\patches or archives\bundles |
| control-plane docs | DOCUMENTED_ONLY | 00_STUDIO_CONTROL after HumanGate scope |

Forbidden without explicit approval:

- PR creation, push, merge, ready-for-review, CI billing changes.
- auto-fix security actions.
- importing unknown artifacts into active repo.

Default claim_verdict: NO_CLAIM_ALLOWED.
