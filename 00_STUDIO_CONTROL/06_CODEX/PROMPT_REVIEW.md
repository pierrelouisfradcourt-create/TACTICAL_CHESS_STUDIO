# PROMPT_REVIEW

status: DOCUMENTED_ONLY

## Checklist Before Codex Prompt

| item | required check |
|---|---|
| model | Specify target model. |
| reasoning | Specify reasoning level. |
| plan_mode | State whether plan mode is on or off. |
| scope | Define bounded task scope. |
| target paths | List paths that may be read or written. |
| allowed actions | List allowed actions explicitly. |
| forbidden actions | List forbidden actions explicitly. |
| validation | Define required validation. |
| stop conditions | Define hard stop conditions. |
| final report fields | Require commands, results, skipped validation, risks, and verdicts. |

## Blocks

- Block broad prompts.
- Block hidden activation.
- Block prompts that imply runtime activation, training, push, PR, CI, dataset promotion, model promotion, or publication claims without HumanGate.
