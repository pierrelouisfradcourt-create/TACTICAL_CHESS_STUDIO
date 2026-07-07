# Chess TCG Source Inventory

status: DOCUMENTED_ONLY

## Read Boundary

This inventory records the external knowledge drain provided for Chess TCG. It is not a proof of implementation.

## Source Inventory

| source | path | status | role | trust_level | notes |
|---|---|---|---|---|---|
| requested source | `C:\Users\La Cigogne Gamer\Downloads\tactical_chess_max_knowledge_drain_part2.md` | PASSIVE | ability corpus | passive_reference | exists in current Kenpachi environment, exact old-drain path reported NOT_FOUND on old local. |
| found old copy | `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\archive\01_MASTER_BIBLE\tactical_chess_max_knowledge_drain_part2.md` | DOCUMENTED_ONLY | ability/status/terrain archive | passive_reference | huge matrix, not canon alone. |
| requested source | `C:\Users\La Cigogne Gamer\Downloads\Crown v1.odt` | PASSIVE | unknown | unknown | exists in current Kenpachi environment, old local reported NOT_FOUND. |
| found old copy | `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\archive\01_MASTER_BIBLE\MAJ complete formula.txt` | DOCUMENTED_ONLY | lab formula baseline | canonical_candidate | useful but not Chess TCG-specific. |
| found old copy | `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\archive\01_MASTER_BIBLE\formula bible.txt` | DOCUMENTED_ONLY | RNG/card budget | canonical_candidate | strongest RNG drain source per old local. |
| found old copy | `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\archive\01_MASTER_BIBLE\tactical_chess_mega_bible_V1.md` | BLOCKED | mega bible | unknown | old local read denied; current Kenpachi copy exists in Downloads. |
| found old source | `C:\Users\wazou\Downloads\tactical_chess_master_handoff (1).txt` | DOCUMENTED_ONLY | technical handoff | passive_reference | says Python proto is statistical and Rust is target engine. |
| found old source | `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab\MASTER_DOCS\ARCHIVE\CONTEXT\08_REPRISE_PROMPT.md` | DOCUMENTED_ONLY | resume/control context | canonical_candidate | docs disagreeing with code lose. |
| found old source | `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab\MASTER_DOCS\AAA_TACTICAL_CORE_ARCHITECTURE.md` | DOCUMENTED_ONLY | architecture roadmap | canonical_candidate | roadmap, not implementation proof. |
| found old source | `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\archive\01_MASTER_BIBLE\extract V2.txt` | DOCUMENTED_ONLY | consolidated design extracts | canonical_candidate | best rule-drain source per old local. |
| found old source | `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\archive\01_MASTER_BIBLE\game desi.txt` | DOCUMENTED_ONLY | RNG set generation | canonical_candidate | compact card/unit generation matrix. |
| found old source | `C:\Users\wazou\Downloads\TACTICAL_CHESS_AI_CORPUS_PART_2.zip` | PASSIVE | zipped corpus | passive_reference | read/list only; no extraction/copy. |
| studio governance | `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\` | DOCUMENTED_ONLY | governance | canonical_candidate | current Kenpachi studio control exists. |
| TacticalChessPureLab docs | `C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\MASTER_DOCS\` | DOCUMENTED_ONLY | architecture/control context | canonical_candidate | reference only; not Chess TCG implementation. |
| imported GitHub source snapshot | `C:\TACTICAL_CHESS_STUDIO\repos\games\ChessTCG\SOURCE_IMPORTS\TacticalChessPureLab_github_main\` | PASSIVE | reconstruction source pack | passive_reference | copied from `origin/main` at `2cb2863cdbda48717b24672819712117af3d1bf1`; see import manifest. |

## Source Class Verdict

| source class | status | verdict |
|---|---|---|
| active runtime code | NOT_FOUND | no Chess TCG code exists. |
| tests | NOT_FOUND | no Chess TCG test suite exists. |
| outputs/runtime artifacts | PASSIVE | archives, reports, and corpora are passive only. |
| canonical docs | DOCUMENTED_ONLY | current Chess TCG docs are local canon candidates. |
| roadmap/docs-only | DOCUMENTED_ONLY | architecture and bibles are planning inputs. |
| inference | PASSIVE | reconstruction estimates remain non-authoritative. |
