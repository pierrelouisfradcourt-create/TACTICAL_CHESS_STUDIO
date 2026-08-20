# Studio State Local Hygiene

`.studio_state/current_state.json` is local operational state for the Studio control plane.

It is generated only through an explicit `--write` invocation of the Studio current-state tooling. It is not canonical evidence by itself, not runtime output, not a public claim, and not proof of readiness, strength, benchmark status, model quality, or release status.

The file must preserve:

- `claim_posture: NO_CLAIM_ALLOWED`
- `no_global_ready_verdict: true`

This local state does not authorize runtime activation, agent activation, dataset generation, dataset reset, training, benchmark, model checkpoint creation, model promotion, release automation, or public claims.

The current state may be regenerated from validated reports or snapshots. HumanGate is required before treating it as canonical state, shared state, evidence, or any claim artifact.
