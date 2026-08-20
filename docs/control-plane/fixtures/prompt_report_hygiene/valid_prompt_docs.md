human intent: register docs-only control-plane hygiene.
task_class: docs
sources_to_read:
- AGENTS.md
- docs/control-plane/PROMPT_AND_REPORT_HYGIENE_CONTRACT_V0.md
scope_in:
- docs/control-plane/**
scope_out:
- src/**
- ml/**
reference_only:
- MASTER_DOCS/**
output_routing:
- docs/control-plane/
blocked_actions:
- do not commit
- do not push
- no runtime activation
- no training
- no dataset generation
- no benchmark proof
validation:
- git diff --check
final_report:
- commands_run
- results
- skipped_validation
- risks
- status_by_surface
- software_verdict
- evidence_verdict
- claim_verdict
claim_posture: NO_CLAIM_ALLOWED
no_global_ready_verdict: true
HumanGate required.
