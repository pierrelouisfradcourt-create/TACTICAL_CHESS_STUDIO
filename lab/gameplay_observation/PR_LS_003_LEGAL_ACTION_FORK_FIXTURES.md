# PR-LS-003 Legal Action + Fork Fixtures

Status: static fixture/spec assets only
Claim status: `NO_CLAIM_ALLOWED`

## Purpose

PR-LS-003 adds the first Learning System V1A fixture assets for:

- `legal_action`
- `fork`
- one legal-action drill fixture
- one fork drill fixture

The fixtures are deterministic, versioned JSON examples for later post-play trace work. They do not alter runtime behavior, search, engine code, ML, datasets, holdout flow, benchmarks, `lab/runs/**`, or `latest.json`.

## Fixture Map

- `lab/learning/fixtures/concepts/legal_action.json`
- `lab/learning/fixtures/concepts/fork.json`
- `lab/learning/fixtures/drills/legal_action_execution_001.json`
- `lab/learning/fixtures/drills/fork_execution_001.json`

## Boundary

The expected tutorial idea is represented as fixture data only:

```text
fork_available
+ selected_action_not_fork
-> missed_fork
-> feedback_missed_fork
```

The fork drill fixture records this as deterministic observable events. It does not execute a gameplay loop or mutate canonical data.

## Validation

Run JSON validation for each fixture:

```powershell
.\.venv312\Scripts\python.exe -m json.tool lab\learning\fixtures\concepts\legal_action.json
.\.venv312\Scripts\python.exe -m json.tool lab\learning\fixtures\concepts\fork.json
.\.venv312\Scripts\python.exe -m json.tool lab\learning\fixtures\drills\legal_action_execution_001.json
.\.venv312\Scripts\python.exe -m json.tool lab\learning\fixtures\drills\fork_execution_001.json
```

## Verdicts

software_verdict: LEARNING_CONCEPT_DRILL_FIXTURES_ADDED
evidence_verdict: DOCUMENTATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
