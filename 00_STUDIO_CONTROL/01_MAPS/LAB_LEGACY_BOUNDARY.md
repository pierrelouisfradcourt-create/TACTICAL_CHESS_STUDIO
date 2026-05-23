# LAB_LEGACY_BOUNDARY

status: DOCUMENTED_ONLY

The repo-local lab surface is legacy-compatible and passive unless explicitly scoped.

Allowed:

- Read existing lab reports and fixtures.
- Preserve lab compatibility when working inside TacticalChessPureLab.

Blocked:

- Do not treat lab outputs, latest.json, benchmark logs, runs, or reports as proof.
- Do not promote lab datasets into training.
- Do not move lab runtime outputs into canonical dataset/model storage without HumanGate.

Preferred future placement:

- New run observations: C:\TACTICAL_CHESS_STUDIO\runs
- Studio archives: C:\TACTICAL_CHESS_STUDIO\archives
- Curated datasets/models: C:\TACTICAL_CHESS_STUDIO\datasets and models after provenance review.

Default claim_verdict: NO_CLAIM_ALLOWED.
