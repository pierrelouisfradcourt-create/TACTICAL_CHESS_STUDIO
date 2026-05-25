# Codex Stop Conditions

status: DOCUMENTED_ONLY

If any RED condition appears, STOP and request HumanGate decision.

## RED Stop Conditions
- secret/token detected
- mixed parent import
- Python/venv import
- site-packages import
- build output or cache import
- dataset/model in target repo without explicit authorization
- training
- dataset reset
- dataset label promotion
- model promotion
- Chess960 activation
- DecisionController activation
- ActionMask authority expansion
- Search/Engine/Neural runtime authority change
- CI payment
- auto-fix security
- destructive deletion
- unknown destination
- host-specific absolute path used as a target without profile authorization
- Program Files or system toolchain copied into studio workspace
- untrusted driver or toolchain source
- unknown source artifact type
- path resolves inside target repo but file is dataset/model/run/archive/tool

## Default Handling
Status: BLOCKED
Action: stop immediately, preserve evidence, do not mutate beyond the authorized scope.
Report: include surface_status, risks, and final verdicts.
