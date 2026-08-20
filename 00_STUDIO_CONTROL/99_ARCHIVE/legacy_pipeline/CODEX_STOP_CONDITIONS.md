# Codex Stop Conditions

status: DOCUMENTED_ONLY

If any RED condition appears, STOP and request HumanGate decision.

## RED Stop Conditions
- secret/token detected
- old mixed parent import
- Python/venv/.venv312 import
- site-packages import
- target/cache import
- dataset/model in repo
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
- old Windows 10 absolute path used as target
- `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\...` used as Kenpachi target
- Program Files copied into studio
- untrusted driver source
- unknown GitHub artifact type
- path resolves inside TacticalChessPureLab but file is dataset/model/run/archive/tool

## Default Handling
Status: BLOCKED
Action: stop immediately, preserve evidence, do not mutate beyond the authorized scope.
Report: include surface_status, risks, and final verdicts.

