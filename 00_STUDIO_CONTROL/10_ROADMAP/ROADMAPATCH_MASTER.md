# ROADMAPATCH_MASTER

status: DOCUMENTED_ONLY

## Ordered Patch Queue Format

| item_id | title | surface | status | allowed_actions | blocked_actions | validation | HumanGate | rollback | notes |
|---|---|---|---|---|---|---|---|---|---|
| TEMPLATE-001 | Example queued patch | roadmap/docs-only | DOCUMENTED_ONLY | Document scope | Execute automatically | Readback | Required before execution | Remove queue item | Template row only |
| STUDIO-AGENTIC-PYRAMID-V0 | Integrate Studio Agentic Pyramid architecture and activation roadmap | canonical_docs; roadmap_docs_only | DOCUMENTED_ONLY | Register docs-only Studio Control sources and GPT Navigator reference sources | Runtime activation; agent activation; training; benchmark; dataset generation; model promotion; commit; push; PR creation | Readback; `rg STUDIO_AGENTIC_PYRAMID`; `git diff --check` | Required before any activation or executable follow-up | Revert docs-only entries and remove copied docs in a separately approved task | Architecture is a map; roadmap is planning only; no runtime authority |

## Policy

- No automatic execution.
- Queue entries are planning records, not approval.
- HumanGate must approve execution for sensitive or runtime-affecting changes.
