# PATCH_REVIEW

status: DOCUMENTED_ONLY

## Checklist

| item | review question |
|---|---|
| files changed | Which files changed, and are they in scope? |
| surface touched | Active code, tests, docs, artifacts, or inference? |
| separation | Are code, tests, docs, and artifacts separated? |
| risk | What can break? |
| rollback | How can the patch be reverted or disabled? |
| HumanGate needed | Does the patch require human approval? |

## Policy

- Forbid auto-merge.
- Forbid activation hidden inside cleanup.
- Forbid runtime claims from patch existence alone.
