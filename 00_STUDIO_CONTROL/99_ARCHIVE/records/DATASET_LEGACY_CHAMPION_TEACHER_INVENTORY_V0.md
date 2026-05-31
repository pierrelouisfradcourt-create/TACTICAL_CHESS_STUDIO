# Dataset Legacy Champion Teacher Inventory V0

Task ID: DATASET-LEGACY-CHAMPION-TEACHER-INVENTORY-002
Date: 2026-05-25
Mode: CODEX READ-ONLY LOCAL LEGACY DATASET INVENTORY

## codex_runtime

- requested_model: gpt-5
- actual_runtime: gpt-5
- requested_reasoning_effort: high
- runtime_status: PASSIVE
- runtime_claim_boundary: GPT-5 allowed by task fallback policy; no model, dataset, benchmark, training, or strength claim is made.

## preflight

- cwd: `C:\TACTICAL_CHESS_STUDIO`
- repo_root: `C:/TACTICAL_CHESS_STUDIO`
- branch: `master`
- HEAD: `0133d0b461091782f1ac757e8842086f194604de`
- worktree_status: dirty before task
- pre_existing_untracked:
  - `scripts/uxpilote/`
- pre_existing_modified: none reported
- pre_existing_staged: none reported
- pre_existing_deleted: none reported
- scripts_uxpilote_scope: UNKNOWN / out of scope; contents were not inspected.

## source_state

Source state for this report:

- created: IMPLEMENTED (`00_STUDIO_CONTROL/99_ARCHIVE/records/DATASET_LEGACY_CHAMPION_TEACHER_INVENTORY_V0.md`)
- registered: NOT_FOUND (not added to `FILE_REGISTRY.yaml`)
- loaded: PASSIVE (report readback validation requested below)
- enforced: NOT_FOUND
- evidenced: DOCUMENTED_ONLY (commands and readback recorded in this file)

Rule applied:

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

## route_check

- output route selected: `00_STUDIO_CONTROL/99_ARCHIVE/records/`
- route basis: existing archive records route for local evidence records
- route status: DOCUMENTED_ONLY
- no control-doc registration performed
- no runtime route, dataset route, model route, or training route activated

## output_routing_result

- status: IMPLEMENTED
- created_only: `00_STUDIO_CONTROL/99_ARCHIVE/records/DATASET_LEGACY_CHAMPION_TEACHER_INVENTORY_V0.md`
- other file writes: NOT_FOUND

## current_repo_dataset_inventory

Current repo dataset path existence checks:

| path | exists | status |
| --- | --- | --- |
| `lab/pedagogy_db/promoted_pedagogy_pack.jsonl` | no | NOT_FOUND |
| `lab/dataset` | yes | IMPLEMENTED |
| `lab/datasets` | yes | IMPLEMENTED / mostly untracked local files |
| `lab/reverse_dataset` | yes | IMPLEMENTED |
| `lab/puzzles` | no | NOT_FOUND |

Focused dataset-like files found in current repo:

| path | tracked | ext | size | sha256 | likely category | safe header/sample |
| --- | --- | ---: | ---: | --- | --- | --- |
| `lab/dataset/manifest.json` | yes | json | 309 | `4F713AB152EF6822B9F3B01F62B81115C757AE19B3CB23CB3E5E8097610FF4C2` | UNKNOWN_DATASET | `{`; `"input": "lab\\pedagogy_db\\promoted_pedagogy_pack.jsonl"`; `"rows_before": 1227` |
| `lab/dataset/priority_training_queue_manifest.json` | yes | json | 1167 | `C3589B127A0F52AE282D39D552716FB4CC1B535399DD60BA69BB70C36531D57C` | UNKNOWN_DATASET | training queue manifest |
| `lab/datasets/dataset_index.json` | no | json | 2554 | `59847F8263F6AE8E24821DB570783C324FB1FF0552760A416108693EDD8DF50F` | UNKNOWN_DATASET | references pedagogy-first human tactical dataset and World Cup 2023 selection |
| `lab/datasets/human_attack_patterns.pgn` | no | pgn | 3237 | `70D91715699C7DE7101AD1730A010CE2400616C6F4781CCBCBB301E6B424839B` | WORLD_CHAMPIONSHIP_DATASET | `[Event "World Cup 2023"]` |
| `lab/datasets/human_conversion_patterns.pgn` | no | pgn | 3293 | `7E401D39D39B205F4BBB3E82A43B3126414E9F7F496B9F4486483ECA33D262A0` | WORLD_CHAMPIONSHIP_DATASET | `[Event "World Cup 2023"]` |
| `lab/datasets/human_endgames_masterclass.pgn` | no | pgn | 3610 | `0B31B77EB2FF3E8561D52A9F9AC6532F5C73F3E7FAF6417DAF8D28E7A9139330` | WORLD_CHAMPIONSHIP_DATASET | `[Event "World Cup 2023"]` |
| `lab/datasets/human_endgame_technique_patterns.pgn` | no | pgn | 3678 | `9CCF787EC570FAE0165C084CF6503F18C426876F82BBD3D59410E86356A2D0C5` | WORLD_CHAMPIONSHIP_DATASET | `[Event "World Cup 2023"]` |
| `lab/datasets/human_pedagogical_master_db.md` | no | md | 2722 | `8709F99FC0E2365DF52D2D7922BB9AB4C64E0474D69CDB475292E8490F6B5961` | TEACHER_DATASET | human pedagogical master DB notes |
| `lab/datasets/human_pedagogical_world_cup_2023_selected.pgn` | no | pgn | 5885 | `70C99726D5FCA2F660DE5DB79964C3534ADAED357D4E7C3CF61CAA4AE7CFE201` | WORLD_CHAMPIONSHIP_DATASET | `[Event "World Cup 2023"]`; `[Site "Baku, Azerbaijan"]`; `[Date "2023.08.01"]` |
| `lab/datasets/human_tactics_elite_1000_seed.pgn` | no | pgn | 3190 | `03B5997579FADCAC6285CFAFFAE0997AFCB88BAFD0F7D5185302554616913418` | WORLD_CHAMPIONSHIP_DATASET | `[Event "World Cup 2023 Open"]` |
| `lab/datasets/teacher_manifest.json` | no | json | 1013 | `802CB796ECC2BCF1B6798B3635372F04C4B807004613A29F87C8C0FA172A20D1` | TEACHER_DATASET | teacher manifest |
| `lab/datasets/aaa_ab_validation_small_20260423/teacher_manifest.json` | no | json | 1313 | `D1E9F7E5CFB5F4796E8637D95C5B757240DDC2189C97A3FCFA8673F8BD3AF382` | TEACHER_DATASET | teacher manifest |
| `lab/datasets/linked_pedagogy/2024-fide-chess-world-championship.pgn` | no | pgn | 36291 | `4D4F81C0FE5A7559935276AFE823A60B309832C20BAFAF7E4D3904CAA2346BB6` | WORLD_CHAMPIONSHIP_DATASET | `[Event "2024 FIDE Chess World Championship"]`; `[Site "Singapore"]`; `[Date "2024.11.25"]` |
| `lab/datasets/linked_pedagogy/Ding, Liren_vs_Gukesh D_2024.12.07.pgn` | no | pgn | 2219 | `4889E9EE9C5CA5D56C80AAD3D0237C857EB9F156D66673D8B4334477A4642DE9` | WORLD_CHAMPIONSHIP_DATASET | `[Event "Championnat du Monde FIDE 2024"]`; `[Site "Chess.com"]`; `[Date "2024.12.07"]` |
| `lab/datasets/linked_pedagogy/Ding, Liren_vs_Gukesh D_2024.12.09.pgn` | no | pgn | 2329 | `4D049AC9CC60BC91511044258E6A4D0E98EA286184E45B363D30A9B0CEF79B9F` | WORLD_CHAMPIONSHIP_DATASET | Ding vs Gukesh, 2024-12-09 |
| `lab/datasets/linked_pedagogy/Ding, Liren_vs_Gukesh D_2024.12.12.pgn` | no | pgn | 3376 | `817880285B308FA7D1128862087263CEB60FA3FD7E5B9DD317965F2A11E96B51` | WORLD_CHAMPIONSHIP_DATASET | Ding vs Gukesh, 2024-12-12 |
| `lab/datasets/linked_pedagogy/Gukesh D_vs_Ding, Liren_2024.12.05.pgn` | no | pgn | 3160 | `C2E0B51EEBDAF84C33B3D1E1BDEE76C441F58D7FAF78077718E76DDB672397E4` | WORLD_CHAMPIONSHIP_DATASET | Gukesh vs Ding, 2024-12-05 |
| `lab/datasets/linked_pedagogy/Gukesh D_vs_Ding, Liren_2024.12.08.pgn` | no | pgn | 1805 | `F4620F78C816A1E1A45B1E69863887CDE61492AE7FC03B19AC70AE9BD0E59C60` | WORLD_CHAMPIONSHIP_DATASET | Gukesh vs Ding, 2024-12-08 |
| `lab/datasets/linked_pedagogy/Gukesh D_vs_Ding, Liren_2024.12.11.pgn` | no | pgn | 3920 | `1DA3D389FF923E03C77A2B93DE3911711CC82020E7CF3F41B96314D85CD52C4F` | WORLD_CHAMPIONSHIP_DATASET | Gukesh vs Ding, 2024-12-11 |
| `lab/datasets/linked_pedagogy/lichess_broadcast_game-1_2024.11.08.pgn` | no | pgn | 4462 | `5DD12DDB2893FD295A0333B539137E9A1F8CBF6C6A76F51A20E417A1AB74EB40` | WORLD_CHAMPIONSHIP_DATASET | FIDE World Championship Match 2024 broadcast, Gukesh vs Ding |
| `lab/datasets/linked_pedagogy/4FktECSUMctPekzB8E8C.pgn` | no | pgn | 333258 | `A6801E85834426887F82E5FF8F7FA0EA636FE2F50A67B0989686E10DC16BE7C0` | TEACHER_DATASET | World Cup 2023 linked pedagogy PGN |
| `lab/datasets/linked_pedagogy/Cz8IyXxN2BzZqGr4adFt.pgn` | no | pgn | 30177 | `BBBE1D8D46AC632ED42AA24A8686ED5DB55E30A3832A44088074285A930EC7AD` | TEACHER_DATASET | World Cup 2023 Open; includes Gukesh marker |
| `lab/datasets/linked_pedagogy/h8wmnLgLtZv6UUjHtURQ.pgn` | no | pgn | 31328 | `AF6C5B72B7D6A3F9F8FB3A51BC1AE0480B5E1DA54EC2C8F9FB60706E6CBB9D6C` | TEACHER_DATASET | World Cup 2023 Open; includes Gukesh marker |
| `lab/datasets/linked_pedagogy/m8kaJ1luOPko18Srr77P.pgn` | no | pgn | 301996 | `7823C4DEBDBE87C390B74C4EE38FCA12E37D0D83EEE8BA92013578386DB199DA` | TEACHER_DATASET | World Cup 2023 linked pedagogy PGN |
| `lab/datasets/linked_pedagogy/PS7GrfUcmCyga9ojNFzF.pgn` | no | pgn | 18632 | `22CDA989ECF6F528ADCE4D67E5DD9E5E6F11C2EBB4B4D9CCB9F906B8C042CB60` | TEACHER_DATASET | World Cup 2023 Open linked pedagogy PGN |
| `lab/datasets/linked_pedagogy/WgHLggHwqVbxK8X7JZQS.pgn` | no | pgn | 331798 | `A0883D260AA15914610725F0826E20718C6A9F0386B51E8436F8CDE3265BD010` | TEACHER_DATASET | World Cup 2023 linked pedagogy PGN |
| `lab/datasets/linked_pedagogy/YcwLxM3rSEbb1myXVIRs.pgn` | no | pgn | 8106 | `027B54943B9CCA80F6922046147076E49C92A9C5845D86DE4D5559A6ACC516BE` | TEACHER_DATASET | World Cup 2023 Open linked pedagogy PGN |
| `lab/datasets/linked_pedagogy/linked_examples.json` | no | json | 5692 | `B8908F9D8FC00EE35C8B269FC0F5463C0397F6766E75ECE4B8209FED68423B8F` | TEACHER_DATASET | linked example records |
| `lab/datasets/linked_pedagogy/extracted_candidates.jsonl` | no | jsonl | 0 | `E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855` | TEACHER_DATASET | empty |
| `lab/datasets/linked_pedagogy/rejected_games.jsonl` | no | jsonl | 0 | `E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855` | TEACHER_DATASET | empty |
| `lab/datasets/linked_pedagogy/source_games.pgn` | no | pgn | 1934 | `D6D608BAE0776A779064D171020F561107D0A521393458E9BD74CCFBF302A01B` | TEACHER_DATASET | Tactical Masters Championship sample source |
| `lab/datasets/linked_pedagogy/pilot_manifest.json` | no | json | 910 | `47444B0777F24B447DBC46AAECEB86653E5086C5F4FE84916980D9451E7D6A58` | TEACHER_DATASET | linked pedagogy pilot manifest |
| `lab/datasets/linked_pedagogy/pedagogical_source_filter_notes.md` | no | md | 5735 | `DDC5CBE96AB9A1B1B70909F33B50F80CCC18EEF00EF40F19034802733734C087` | TEACHER_DATASET | World Cup filtering notes |
| `lab/pedagogy_db/candidate_games_for_triage.csv` | yes | csv | 1199282 | `5CE2BEA97EDA767BB76AA35714B40F44C95BCCF76CBE9D7DA704F050D6A8C1DA` | TEACHER_DATASET | CSV header includes source_path/source_file/game_index; rows reference World Cup 2023 |
| `lab/pedagogy_db/compiled_conversion.jsonl` | yes | jsonl | 513 | `480ABB50F6FBED6029EA6F4D1732D236862E09B9781293162186618369DF7FC1` | TEACHER_DATASET | compiled pedagogy row |
| `lab/pedagogy_db/compiled_endgames.jsonl` | yes | jsonl | 486 | `937F5AC965E7F5C2966E65998EB7006FABF8C77C987699ACF369FA57BC280226` | TEACHER_DATASET | compiled pedagogy row |
| `lab/pedagogy_db/compiled_tactics.jsonl` | yes | jsonl | 503 | `5D6AD50AD44A5786B930F41705F900D6776DB62EB3065E2084DF4D2D8F05F525` | TEACHER_DATASET | `{`; `"stable_id": "tactics_wc2023_smirin_avila"`; `"source_file": "PEDAGOGICAL_DB_TACTICS.pgn"` |
| `lab/pedagogy_db/dataset_manifest.json` | yes | json | 1913 | `01601F351316C08234F4EB9C633CCC9A80DD1692D9C4D1FEBA8D909DBA709B85` | TEACHER_DATASET | dataset manifest |
| `lab/pedagogy_db/promoted_pedagogy_pack.csv` | yes | csv | 17693 | `5454213FC30E310FDCDC9A6B7EB2B9FFD617DFBD92373259D2166FFA259E7848` | PROMOTED_PEDAGOGY_PACK | CSV curation pack; explicitly rejected by loader as trainable input |
| `lab/pedagogy_db/PEDAGOGICAL_DB_CONVERSION.pgn` | yes | pgn | 705 | `9B1F8CC3AD64EC7A55A402F22480CC37581B7A2CB5C2F85E7432DD9CE1716C87` | TEACHER_DATASET | World Cup 2023 conversion PGN |
| `lab/pedagogy_db/PEDAGOGICAL_DB_ENDGAMES.pgn` | yes | pgn | 766 | `CFCE1681C22CBAA918BAD076E9A93412A8C6D09AEECB2A92437933997BB5258D` | TEACHER_DATASET | World Cup 2023 endgame PGN |
| `lab/pedagogy_db/PEDAGOGICAL_DB_TACTICS.pgn` | yes | pgn | 535 | `FD3AD7BABD38708DAD29DA78171F4133306F67E3D1DD14229F4295CC06CA9C7F` | TEACHER_DATASET | World Cup 2023 tactics PGN |
| `lab/pedagogy_db/HUMAN_COMPILATION.md` | yes | md | 3305 | `81DAF334B1369F42EA45C223A9C5C5EF12F61C6D1F7A389CD58BD1B14B36D6D5` | TEACHER_DATASET | active pedagogy DB summary |
| `lab/pedagogy_db/PEDAGOGICAL_DB_DATASET_GOVERNANCE.md` | yes | md | 2704 | `64DC238C5629402BC8AE2C43880866435864A2398100888020437C5BB67FB4EB` | TEACHER_DATASET | governance notes |
| `lab/pedagogy_db/PURELAB_DATASET_BALANCE_OPERATIONAL_MASTER_TABLE.md` | yes | md | 8906 | `A23E2480C83CF1288B3B3E46110EEF37BAC9E7CEC1FA88E46AA6E09C98C73DC3` | TEACHER_DATASET | dataset balance table |
| `lab/pedagogy_db/triaged_pedagogy_candidates.csv` | yes | csv | 1219039 | `FA5A95405A28C73136757F556368BB1275C85AEF52149E172E01AEDBBB2EE82E` | TEACHER_DATASET | triage CSV |
| `lab/reverse_dataset/adaptive_state.json` | yes | json | 553 | `A93BF8D9361C1831B6BE820EDD5384027B1652211EC5C160E9B03FE4EC46CD5D` | ADAPTIVE_DATASET | adaptive state |
| `lab/reverse_dataset/balance_stats.json` | yes | json | 3063 | `98080EE9517E0B634E1184DFC30BB7506CA4FAA0C3840C9963219120912A8985` | REVERSE_DATASET | balance stats |
| `lab/reverse_dataset/examples.json` | yes | json | 9881 | `36ACF8AD43A8A4CE4C8F97AE8C265AB076AFC729E49A54AF998DD7B25598AA73` | REVERSE_DATASET | examples |
| `lab/reverse_dataset/manifest.json` | yes | json | 1709 | `BF79DEC2656A1FF4830F91DD6940CED3B4531D86EECF0E629029C3FB5B34E8FF` | REVERSE_DATASET | `{`; `"schema_version": "reverse_dataset_engine_v2_matrix_strict"`; `"input": "lab\\pedagogy_db\\promoted_pedagogy_pack.jsonl"` |
| `lab/reverse_dataset/remaining_imbalance.json` | yes | json | 545 | `F99F3CE0AA5B178CD9EE83A2AE98603F0E011D748C842DD7230CB0D264C980A5` | REVERSE_DATASET | imbalance state |
| `lab/reverse_dataset/schema.json` | yes | json | 1131 | `31196770803654F5C2E12555F373569FB51110ADD50DEB8DB3E3BDD892050BD1` | REVERSE_DATASET | schema |
| `lab/reverse_dataset/validation.json` | yes | json | 450 | `1291C4F79B6A831B22689856883D94AB6569C3CCD2695DA4745E7303D3A0545D` | REVERSE_DATASET | validation state |
| `lab/reverse_dataset/weakness_clusters.json` | yes | json | 4510 | `A2914F34A864E1C767128A36118995036A3C973A20F3BF611AE2C125C3E68642` | REVERSE_DATASET | weakness clusters |
| `lab/suites/conversion_suite_v1.jsonl` | yes | jsonl | 12396 | `821049AB4C320096E9979B2AD44BB2C8DC4AFBFE5D3F7681785779A3072B55AE` | UNKNOWN_DATASET | suite JSONL |
| `tests/fixtures/puzzle_rng_mate1_seed42.jsonl` | yes | jsonl | 249 | `B03AC05E20A09A42419172F60338657E22C9FE3AA1C811AACEDAF988C8C57968` | PUZZLE_DATASET | mate-in-1 fixture row |
| `tests/fixtures/shared_puzzle_candidate_rng_tutorial_v0.json` | yes | json | 1361 | `19BD54B34A139A28B8F23B45F2E6360AFEDB63DC0058A39660A73DA07E640579` | PUZZLE_DATASET | shared puzzle candidate fixture |

## legacy_purelab_dataset_inventory

Checked legacy path: `C:\Users\Studio-Dev\Desktop\pure lab legacy\TacticalChessPureLab`

Other candidate paths:

| path | exists | status |
| --- | --- | --- |
| `C:\Users\Studio-Dev\Desktop\pure lab legacy\TacticalChessPureLab` | yes | IMPLEMENTED |
| `C:\Users\Studio-Dev\Desktop\pure lab legacy` | yes | IMPLEMENTED |
| `C:\TacticalChessPureLab` | no | NOT_FOUND |
| `C:\TACTICAL_CHESS_STUDIO\LOCAL_ARCHIVE` | no | NOT_FOUND |
| `C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\00_MASTER_DOCS\ARCHIVE` | yes | IMPLEMENTED |
| `C:\TACTICAL_CHESS_STUDIO\lab` | yes | IMPLEMENTED |

Legacy PureLab physically contains the same major dataset families found in current repo:

- World Cup 2023 pedagogy PGNs and CSVs.
- 2024 FIDE World Championship / Gukesh / Ding PGNs.
- teacher manifests and pedagogy DB files.
- `promoted_pedagogy_pack.csv`.
- reverse/adaptive dataset JSON files.
- puzzle fixtures.

Legacy selected files with size/hash:

| legacy path suffix | size | sha256 | likely category | current match |
| --- | ---: | --- | --- | --- |
| `lab/datasets/linked_pedagogy/2024-fide-chess-world-championship.pgn` | 36291 | `4D4F81C0FE5A7559935276AFE823A60B309832C20BAFAF7E4D3904CAA2346BB6` | WORLD_CHAMPIONSHIP_DATASET | identical |
| `lab/datasets/linked_pedagogy/Ding, Liren_vs_Gukesh D_2024.12.07.pgn` | 2219 | `4889E9EE9C5CA5D56C80AAD3D0237C857EB9F156D66673D8B4334477A4642DE9` | WORLD_CHAMPIONSHIP_DATASET | identical |
| `lab/datasets/human_pedagogical_world_cup_2023_selected.pgn` | 5885 | `70C99726D5FCA2F660DE5DB79964C3534ADAED357D4E7C3CF61CAA4AE7CFE201` | WORLD_CHAMPIONSHIP_DATASET | identical |
| `lab/datasets/teacher_manifest.json` | 1013 | `802CB796ECC2BCF1B6798B3635372F04C4B807004613A29F87C8C0FA172A20D1` | TEACHER_DATASET | identical |
| `lab/pedagogy_db/promoted_pedagogy_pack.csv` | 17693 | `5454213FC30E310FDCDC9A6B7EB2B9FFD617DFBD92373259D2166FFA259E7848` | PROMOTED_PEDAGOGY_PACK | identical |
| `lab/reverse_dataset/manifest.json` | 1709 | `BF79DEC2656A1FF4830F91DD6940CED3B4531D86EECF0E629029C3FB5B34E8FF` | REVERSE_DATASET | identical |
| `tests/fixtures/puzzle_rng_mate1_seed42.jsonl` | 249 | `B03AC05E20A09A42419172F60338657E22C9FE3AA1C811AACEDAF988C8C57968` | PUZZLE_DATASET | identical |

Legacy-only additional references seen:

- `docs/control-plane/ROCKY_ERROR_TO_PUZZLE_CURRICULUM_V0.md` - PUZZLE_DATASET / documentation reference.
- `docs/control-plane/ROCKY_ERROR_TO_PUZZLE_ROADMAP_V0.md` - PUZZLE_DATASET / documentation reference.
- `src_patch/integration/teacher_dataset_hook.txt` - TEACHER_DATASET / patch reference.

## world_championship_dataset_findings

Status: IMPLEMENTED / local-only for several files.

Current repo physically contains World Championship / Gukesh / Ding material under `lab/datasets/linked_pedagogy/`, but these files are untracked:

- `2024-fide-chess-world-championship.pgn`
- `Ding, Liren_vs_Gukesh D_2024.12.07.pgn`
- `Ding, Liren_vs_Gukesh D_2024.12.09.pgn`
- `Ding, Liren_vs_Gukesh D_2024.12.12.pgn`
- `Gukesh D_vs_Ding, Liren_2024.12.05.pgn`
- `Gukesh D_vs_Ding, Liren_2024.12.08.pgn`
- `Gukesh D_vs_Ding, Liren_2024.12.11.pgn`
- `lichess_broadcast_game-1_2024.11.08.pgn`

Current repo also physically contains World Cup 2023 material:

- tracked: `lab/pedagogy_db/*` curation/manifests/PGNs/CSVs.
- untracked: `lab/datasets/*` World Cup seed/selection PGNs.
- untracked: `lab/datasets/linked_pedagogy/*.pgn` linked World Cup PGN batches.

No admissible champion-reference training dataset was proven. The router has objective strings for `champion_reference`, but no HumanGate-promoted admissible dataset was evidenced.

## teacher_dataset_findings

Status: IMPLEMENTED / BLOCKED for training claims.

Teacher-like datasets and references exist:

- tracked `lab/pedagogy_db/*.jsonl`, `*.pgn`, `*.csv`, and manifests.
- untracked `lab/datasets/teacher_manifest.json`.
- untracked `lab/datasets/aaa_ab_validation_small_20260423/teacher_manifest.json`.
- untracked `lab/datasets/linked_pedagogy/*` source data and manifests.

`ml/dataset_loader.py` defines `TeacherDataset` and passive/fail-closed AM dataset admission helpers. `ml/train.py` imports `TeacherDataset`, but no training was run.

Training readiness remains BLOCKED by doctrine and by the active dataset pointer/reference mismatch described below.

## promoted_pedagogy_pack_findings

Status: PARTIAL / referenced JSONL missing.

Found:

- `lab/pedagogy_db/promoted_pedagogy_pack.csv`
  - exists: yes
  - tracked: yes
  - size: 17693
  - sha256: `5454213FC30E310FDCDC9A6B7EB2B9FFD617DFBD92373259D2166FFA259E7848`
  - category: PROMOTED_PEDAGOGY_PACK
  - sample: CSV header plus World Cup 2023 rows.

Not found:

- `lab/pedagogy_db/promoted_pedagogy_pack.jsonl`

Important code references:

- `ml/dataset_decision_router.py` has `DEFAULT_DATASET = "lab/pedagogy_db/promoted_pedagogy_pack.jsonl"`.
- `ml/dataset_loader.py` explicitly rejects `promoted_pedagogy_pack.csv` as trainable input because training requires per-position JSONL rows.
- `lab/dataset/manifest.json` and `lab/reverse_dataset/manifest.json` reference `lab\\pedagogy_db\\promoted_pedagogy_pack.jsonl`.

No conversion, generation, or repair was performed.

## active_dataset_pointer_check

- pointer path: `lab/ACTIVE_DATASET.txt`
- exists: yes
- raw value: `lab/dataset`
- resolved current repo path: `C:\TACTICAL_CHESS_STUDIO\lab\dataset`
- status: IMPLEMENTED as a directory pointer
- concern: `lab/dataset/manifest.json` references missing `lab\\pedagogy_db\\promoted_pedagogy_pack.jsonl`.

## referenced_but_missing_datasets

Status: NOT_FOUND / BLOCKED for recovery without HumanGate.

Missing referenced dataset:

- `lab/pedagogy_db/promoted_pedagogy_pack.jsonl`

References found:

- `ml/dataset_decision_router.py`
- `lab/dataset/manifest.json`
- `lab/reverse_dataset/manifest.json`

No other missing physical dataset was proven in this pass.

## local_only_datasets

Status: IMPLEMENTED locally / must not be auto-added.

Current repo local-only untracked dataset files include:

- all files under `lab/datasets/`
- all files under `lab/datasets/linked_pedagogy/`
- `lab/datasets/aaa_ab_validation_small_20260423/teacher_manifest.json`

These include World Championship, Gukesh/Ding, World Cup, teacher, and linked pedagogy source material. They should not be auto-added, copied, promoted, or used as claim evidence without HumanGate.

## duplicate_or_matching_files

Status: IMPLEMENTED.

Current repo and the specified legacy PureLab copy contain many byte-identical dataset files by basename, size, and SHA256. Examples:

- `2024-fide-chess-world-championship.pgn`: identical current vs legacy.
- `Ding, Liren_vs_Gukesh D_2024.12.07.pgn`: identical current vs legacy.
- `human_pedagogical_world_cup_2023_selected.pgn`: identical current vs legacy.
- `promoted_pedagogy_pack.csv`: identical current vs legacy.
- `lab/reverse_dataset/*.json`: identical current vs legacy for checked files.
- `tests/fixtures/puzzle_rng_mate1_seed42.jsonl`: identical current vs legacy.

No copy operation was performed.

## safe_recovery_options

HumanGate-only options:

1. Register this inventory record if HumanGate wants it to govern future work.
2. Decide whether local-only `lab/datasets/` files should remain local-only, be archived elsewhere, or be promoted through a scoped data registration task.
3. If `promoted_pedagogy_pack.jsonl` is required, run a separate HumanGate-approved data recovery/generation task. This task did not generate it.
4. Before any training attempt, require a separate admission check proving ActionId, LegalAction, ActionMask/provenance, HumanGate state, move vocab fingerprint, ruleset, variant, and contamination status.

## redownload_needed

- status: NO
- reason: Physical World Championship, World Cup, teacher, promoted CSV, reverse/adaptive, and puzzle files were found locally in current repo and/or legacy copy. The one missing referenced file is a JSONL derived/converted dataset path, not evidence that remote redownload is needed.
- blocked_action: No download performed in this task.

## files_changed

- created: `00_STUDIO_CONTROL/99_ARCHIVE/records/DATASET_LEGACY_CHAMPION_TEACHER_INVENTORY_V0.md`
- modified: none
- deleted: none
- pre-existing untracked unchanged: `scripts/uxpilote/`

## commands_run

Preflight:

- `Get-Location`
- `git rev-parse --show-toplevel`
- `git rev-parse --abbrev-ref HEAD`
- `git rev-parse HEAD`
- `git status --short --branch`

Read-first:

- `Test-Path` for all requested read-first files
- `Get-Content AGENTS.md -TotalCount 200`
- `Get-Content README.md -TotalCount 160`
- `Get-Content 00_STUDIO_CONTROL\00_MASTER_DOCS\DOCS_STATUS.md -TotalCount 160`
- `Get-Content 00_STUDIO_CONTROL\00_MASTER_DOCS\01_CURRENT_STATE.md -TotalCount 160`
- `Get-Content 00_STUDIO_CONTROL\00_MASTER_DOCS\03_KNOWN_ISSUES.md -TotalCount 160`
- `Get-Content 00_STUDIO_CONTROL\00_MASTER_DOCS\05_ARCHITECTURE.md -TotalCount 160`
- `Get-Content 00_STUDIO_CONTROL\01_SYSTEM\registries\FILE_REGISTRY.yaml -TotalCount 220`
- `Get-Content lab\ACTIVE_DATASET.txt -TotalCount 20`
- `Get-Content ml\dataset_loader.py -TotalCount 220`
- `Get-Content ml\train.py -TotalCount 220`
- `Get-Content ml\dataset_decision_router.py -TotalCount 220`
- `Get-Content ml\move_vocab.py -TotalCount 220`

Inventory and search:

- `Test-Path` for current/legacy candidate roots and required dataset directories.
- `git ls-files`
- `Get-ChildItem -Recurse -File` focused on repo and legacy dataset roots.
- `Get-FileHash -Algorithm SHA256` for focused dataset-like files.
- `Get-Content -TotalCount 3` for safe samples.
- `Select-String` for requested content terms over focused ML, dataset, and pedagogy files.

No network, download, training, benchmark, branch, commit, push, PR, `lab/runs/RUN_*`, `latest.json`, checkpoint, or dataset generation command was run.

## validation

Required validation commands to run after file creation:

- `Test-Path 00_STUDIO_CONTROL/99_ARCHIVE/records/DATASET_LEGACY_CHAMPION_TEACHER_INVENTORY_V0.md`
- `Get-Content 00_STUDIO_CONTROL/99_ARCHIVE/records/DATASET_LEGACY_CHAMPION_TEACHER_INVENTORY_V0.md -TotalCount 120`
- `Select-String 00_STUDIO_CONTROL/99_ARCHIVE/records/DATASET_LEGACY_CHAMPION_TEACHER_INVENTORY_V0.md -Pattern "WORLD_CHAMPIONSHIP_DATASET|CHAMPION_REFERENCE_DATASET|TEACHER_DATASET|PROMOTED_PEDAGOGY_PACK|NOT_FOUND|UNKNOWN|BLOCKED|NO_CLAIM_ALLOWED|no_global_ready_verdict"`
- `git diff --check`
- `git status --short --branch`

## skipped_validation

- No code tests run: task is documentation-only inventory and forbids training/benchmark.
- No Python dataset inspection command run: task forbids training/generation and asked for PowerShell search only.
- No content inspection of `scripts/uxpilote/`.

## risks

- Many current repo dataset files are local-only/untracked and should not be treated as shared repository truth.
- `promoted_pedagogy_pack.jsonl` is referenced but absent.
- `promoted_pedagogy_pack.csv` exists but is explicitly not trainable under current Python loader/router contracts.
- Legacy and current files matching by hash does not imply registration, loading, enforcement, admissibility, or HumanGate approval.
- No benchmark, model, strength, Elo, promotion, or scientific proof is created by this inventory.

## status_by_surface

| surface | status | note |
| --- | --- | --- |
| active_runtime_code | PASSIVE | inspected only |
| tests | PASSIVE | fixtures inventoried only |
| artifacts_runtime_outputs | DOCUMENTED_ONLY | report created only |
| canonical_docs | PASSIVE | read-only source context |
| roadmap_docs_only | PASSIVE | read-only source context |
| inference | PASSIVE | no inference route activated |
| datasets | UNKNOWN | physical files found; admissibility and authority not proven |
| scripts_uxpilote | UNKNOWN | out of scope; contents not inspected |

## software_verdict

PASSIVE. Repository and legacy dataset surfaces were inventoried locally. No runtime code, training code, dataset content, branch, commit, push, PR, benchmark, checkpoint, or generated dataset was modified or produced.

## evidence_verdict

DOCUMENTED_ONLY. Evidence consists of local read-only PowerShell listing, hashing, safe samples, and content-term searches. The inventory identifies physical files and missing references only; it does not promote any source.

## claim_verdict

NO_CLAIM_ALLOWED.

## no_global_ready_verdict

true
