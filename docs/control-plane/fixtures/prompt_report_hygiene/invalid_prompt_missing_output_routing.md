human intent: register docs-only control-plane hygiene.
task_class: docs
sources_to_read:
- AGENTS.md
scope_in:
- docs/control-plane/**
scope_out:
- src/**
blocked_actions:
- do not commit
- do not push
validation:
- git diff --check
final_report:
- commands_run
- results
- skipped_validation
- risks
claim_posture: NO_CLAIM_ALLOWED
no_global_ready_verdict: true
