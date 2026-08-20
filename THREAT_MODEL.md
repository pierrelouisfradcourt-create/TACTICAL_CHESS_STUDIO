# TacticalChessPureLab Trust Root Threat Model

PR-00A is a human trust root bootstrap for V9.2 TacticalChessPureLab Research OS. It installs the initial policy surfaces that constrain automation before any later research, repair, or promotion workflow can rely on them. PR-00A is bootstrap-only and allows no scientific claim.

## Core Separation

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

A software PASS does not imply scientific evidence. A report does not imply proof. A merge decision is not a claim decision. MERGE_DECISION is not CLAIM_DECISION.

Expected PR-00A verdict:

```json
{
  "software_verdict": "NOT_RUN",
  "evidence_verdict": "BOOTSTRAP_ONLY",
  "claim_verdict": "NO_CLAIM_ALLOWED"
}
```

## Threats

- Treating repository files, prompts, dashboards, model output, copied reports, or latest files as trusted evidence.
- Confusing successful execution with scientific support.
- Confusing generated summaries, anomaly critiques, or cockpit state with primary proof.
- Allowing Codex, GPT-5.5, plugins, no-code systems, or runner scripts to increase their own authority.
- Allowing repair loops to modify the thermometer: tests, gates, workflows, policies, protocol locks, benchmark logic, registries, or holdouts.
- Allowing path traversal, symlink escape, shadow writes, undeclared plugins, undeclared environment variables, or best-effort fallback behavior to bypass protected surfaces.
- Allowing human decisions that are not verified through a policy-compatible decision channel.

## Evidence Planes

GitHub, runner, and scripts are the evidence plane. RUN_ID/ is the raw evidence bundle. A run bundle is evidence only when it is complete, schema-valid, policy-compatible, and traceable.

Supabase is registry, cockpit, and decisions. It is not primary proof. The cockpit can block a bad experiment but cannot turn incomplete evidence into proof.

n8n is orchestration fail-closed. It is not proof.

GPT-5.5 is anomaly critique only. GPT-5.5 output is non-binding and cannot authorize claims.

Codex is constrained execution only. Codex cannot decide policy, authorize scientific claims, or promote evidence strength by reasoning longer.

## Human Authority

The human remains the scientific authority only through a verified decision channel that is compatible with policy. Human review is required for trust-root policy changes, but special review is not a bypass.

No scientific claim is allowed in PR-00A.
