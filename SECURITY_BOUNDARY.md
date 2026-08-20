# TacticalChessPureLab Security Boundary

PR-00A is a human trust root bootstrap. It defines the repository boundary that automation must respect before any later V9.2 research automation is trusted.

## Protected Trust Root

The protected trust-root surfaces are:

- `.github/CODEOWNERS`
- `THREAT_MODEL.md`
- `SECURITY_BOUNDARY.md`
- `LAB_POLICY_BOOTSTRAP.md`
- `lab/policies/`

Changes to these surfaces require owner review by `@pierrelouisfradcourt-create` and must remain policy-compatible. Human decisions must be verified and policy-compatible. Special review is not a bypass.

## Execution Boundary

All inputs are untrusted. Missing policy, invalid policy schema, gate failure, parser crash, schema invalidity, path traversal, symlink escape, shadow write attempts, undeclared plugins, undeclared environment variables, and best-effort fallback behavior must block.

Codex is constrained execution only. Codex must not decide the rules that control Codex. Codex must not transform weak evidence into a claim, and increased reasoning effort does not increase permissions, authority, or claim scope.

GPT-5.5 is anomaly critique only. Its critiques are non-binding and cannot authorize claims.

n8n is orchestration fail-closed, not proof.

Supabase is registry, cockpit, and decisions, not primary proof.

GitHub, runner, and scripts are the evidence plane. RUN_ID/ is the raw evidence bundle.

## Evidence Boundary

The cockpit can block a bad experiment but cannot turn incomplete evidence into proof.

The system separates:

```txt
ça compile
ça produit un rapport
ça prouve quelque chose
```

These verdicts must remain separate:

```txt
software_verdict
evidence_verdict
claim_verdict
```

A software PASS does not imply scientific evidence. A report does not imply proof. MERGE_DECISION is not CLAIM_DECISION.

No scientific claim is allowed in PR-00A.
