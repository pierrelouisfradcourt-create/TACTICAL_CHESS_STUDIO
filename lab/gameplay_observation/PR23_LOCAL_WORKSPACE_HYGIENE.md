# PR-23 Local Workspace Hygiene

Status: local hygiene guardrails only  
Scope: prevent local generated files from polluting PR diffs

## Purpose

This note defines local workspace hygiene boundaries for Codex/local outputs that are non-canonical and must remain untracked.

## Local-only generated paths

The repository ignore rules explicitly treat these as local-only:

- `/codex_*.md`
- `/lab/gameplay_observation/sandbox_outputs/`
- `/lab/tmp_pr03_tests/`
- `/lab/tmp_*/`

`target/` is already ignored for build artifacts.

## Checker

Use:

```powershell
..\venv312\Scripts\python.exe scripts/check_workspace_hygiene.py --pretty
```

The checker:

- inspects `git status --porcelain`;
- separates `tracked_changes` from `local_noise`;
- blocks staged local/generated artifacts for protected categories;
- never deletes files;
- never runs `git clean`.

## Blocked staged categories

The checker returns non-zero when staged changes include:

- `lab/gameplay_observation/sandbox_outputs/**`
- `codex_*.md`
- `lab/runs/**`
- `latest.json`
- `holdout/**`
- benchmark output paths/files

## Output contract

The checker prints machine-readable JSON with:

- `software_verdict`
- `hygiene_verdict`
- `blocked_reasons`
- `warnings`
- `tracked_changes`
- `local_noise`
