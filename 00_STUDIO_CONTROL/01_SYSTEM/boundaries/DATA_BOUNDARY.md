# DATA_BOUNDARY

status: DOCUMENTED_ONLY

## Separated Surfaces

| surface | location principle | status | policy |
|---|---|---|---|
| active repo code | C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\ | DOCUMENTED_ONLY | Runtime source only. |
| archives | C:\TACTICAL_CHESS_STUDIO\archives\ | DOCUMENTED_ONLY | Selected historical artifacts only. |
| datasets | C:\TACTICAL_CHESS_STUDIO\datasets\ | DOCUMENTED_ONLY | Require provenance and HumanGate. |
| models | C:\TACTICAL_CHESS_STUDIO\models\ | DOCUMENTED_ONLY | Require provenance and HumanGate. |
| runs | C:\TACTICAL_CHESS_STUDIO\runs\ | DOCUMENTED_ONLY | Runtime outputs only, never proof alone. |
| tools | C:\TACTICAL_CHESS_STUDIO\tools\ | DOCUMENTED_ONLY | Installed or rebuilt tools. |
| tmp | C:\TACTICAL_CHESS_STUDIO\tmp\ | DOCUMENTED_ONLY | Disposable workspace. |

## Dataset And Model Policy

- Dataset labels require ActionId, LegalAction, ActionMask, provenance, and HumanGate.
- Datasets require provenance and HumanGate before promotion.
- Models require provenance and HumanGate before promotion.
- Runs are runtime outputs and never proof alone.
- Dataset reset is forbidden without HumanGate.
- Label promotion is forbidden without HumanGate.
