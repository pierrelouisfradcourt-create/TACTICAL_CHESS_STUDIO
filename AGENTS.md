# TacticalChessPureLab Agent Doctrine

> **LEGACY PRE-FORGE — FROZEN 2026-08-28 (HumanGate decision: Pierre).**
> Pre-Forge Codex/GPT-Navigator control plane (last substantive update 2026-05,
> scoped to TacticalChessPureLab). NOT current studio truth — do not use as a
> source anchor for Forge-lane work. Current truth: `docs/forge/STUDIO_MASTER_SCHEMA.html`
> (Détail M, 2026-08-28) + `docs/adr/ADR-003-forge-workflow-coherence-audit.md`.

Codex implements bounded tasks in this repository. Scripts and CI verify mechanical behavior. GPT critiques and routes work only. The human decides merge, reject, freeze, promotion, and claim status.

Always separate final judgment into:

- software_verdict
- evidence_verdict
- claim_verdict

Default claim_verdict: NO_CLAIM_ALLOWED.

## Reporting Discipline

For repository analysis, separate active runtime code, tests, generated/runtime outputs, canonical docs, roadmap/docs-only, and inference.

Use status tags: IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, UNKNOWN.

Do not give global ready/not-ready verdicts without component-level status.

## Source Anchoring

For control-doc, Navigator, or source-registration work, separate source state into created, registered, loaded, enforced, and evidenced.

Core rule:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

Do not treat memory, conversational context, or a newly created local file as loaded project truth. A source must be registered, loaded, enforced, and evidenced before it can govern an active task.

## Git Safety

Before edits, report branch, HEAD, worktree status, and changed files.

If the worktree is dirty, identify whether changes are pre-existing before editing.

Never commit, push, create branches, open PRs, or mark PRs ready unless explicitly requested.

Routine Codex tasks must leave changes local by default. Executor reports are local evidence records, not GitHub promotion events.

A daily GitHub backup is a separate HumanGate action. The human may explicitly request one push to `main` per day for backup only. A backup push must not be described as readiness, release status, promotion, benchmark proof, model proof, runtime activation, dataset promotion, or claim validation.

## Runtime Doctrine

- Rust is runtime truth.
- Python is ML, inference, and tooling.
- Search remains final authority.
- Neural proposes and reranks; it does not decide alone.
- Dataset labels require ActionId, LegalAction, ActionMask, provenance, and HumanGate.

## Validation Discipline

- Docs-only changes require git diff --check and readback.
- Code changes require the smallest relevant targeted tests.
- Skipped validation must be justified.

## Guardrails

- Never use performance runs as proof.
- Never use holdout.
- Never reset dataset.
- Never create lab/runs/RUN_*.
- Never create latest.json.
- Never claim Elo, strength, promotion, benchmark proof, or scientific proof.
- Never broad-refactor engine, search, neural, or runtime code.
- Never commit sandbox outputs.
- Never use git clean.
- Do not delete user files blindly.
- Keep generated outputs under lab/gameplay_observation/sandbox_outputs/ as non-canonical.
- Use .\.venv312\Scripts\python.exe directly on Windows.
- Prefer one coherent PR over micro-PRs.

Final reports must include commands run, results, skipped validation, risks, and the three verdicts.
