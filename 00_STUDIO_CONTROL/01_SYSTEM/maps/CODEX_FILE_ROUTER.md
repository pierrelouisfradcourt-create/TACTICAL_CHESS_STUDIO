# CODEX_FILE_ROUTER

status: DOCUMENTED_ONLY

Purpose: route files created, copied, downloaded, or observed by Codex inside the Kenpachi studio.

Rules:

| material | target |
|---|---|
| TacticalChessPureLab repo code/docs/tests | C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab |
| Chess TCG docs-only project shell | C:\TACTICAL_CHESS_STUDIO\repos\games\ChessTCG |
| studio control docs | C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL |
| Codex reports | C:\TACTICAL_CHESS_STUDIO\archives\reports\codex |
| GitHub logs/artifacts/patches | C:\TACTICAL_CHESS_STUDIO\archives\github |
| passive bundles | C:\TACTICAL_CHESS_STUDIO\archives\bundles |
| run observations | C:\TACTICAL_CHESS_STUDIO\runs |
| tools manifests/reports/wrappers | C:\TACTICAL_CHESS_STUDIO\tools |
| datasets | C:\TACTICAL_CHESS_STUDIO\datasets, HumanGate required |
| models/checkpoints | C:\TACTICAL_CHESS_STUDIO\models, HumanGate required |
| unknown imports | C:\TACTICAL_CHESS_STUDIO\inbox_import_quarantine, HumanGate required |

Blocked:

- Do not place datasets, models, runs, archives, tools, apps, or studio agents inside TacticalChessPureLab.
- Do not copy venv, site-packages, target, caches, secrets, tokens, browser sessions, or old parent .git metadata.
- Do not apply Codex settings automatically.

Default claim_verdict: NO_CLAIM_ALLOWED.
