# Source And Archive Map

## Rule Of Thumb

If a file or folder is not listed here as `ACTIVE`, it must not be treated as current runtime truth by default.

## ACTIVE - Runtime Source Of Truth

### Repo root

- `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab`

### Active code

- `src/`
- `ml/`
- `models/`
- `lab/`

### Canonical active markers

- `lab/ACTIVE_DATASET.txt`
- `lab/ACTIVE_EXPERIMENT.txt`
- `models/latest_run.json`
- `MASTER_DOCS/V2_SOURCE_OF_TRUTH.md`
- `MASTER_DOCS/PROJECT_HISTORY.md`
- `MASTER_DOCS/SOURCE_ARCHIVE_MAP.md`
- `MASTER_DOCS/CHATGPT_SHARE_ARCHIVE_MAP.md`

### Canonical active baby source

- `lab/datasets/teacher_v2_baby_source_seed42_g12.jsonl`
- `lab/datasets/teacher_v2_baby_source_seed42_g12.manifest.json`

### Canonical active baby run

- `lab/runs/run_20260417_001525_baby_v2_seed42_g12/`
- `models/best.pt`
- `models/latest.pt`

## REFERENCE - Useful But Not Runtime Truth

These files are important context, but must not override the active repo by default.

### Browser share extracts

- `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\_chatgpt_share_extracts`

Use these for:

- historical reasoning
- project continuity
- architecture intent
- recovering old decisions

Do not use them as executable truth unless the corresponding behavior is also present in the active repo.

### Desktop and download packs

Examples already observed:

- desktop backups
- `backup safe`
- `sauve`
- `TCS_REPRISE_PACK.zip`
- dense data packs
- starter packs
- handoff txt/pdf archives

Use these as reference archives only.

## LEGACY - Keep For Comparison, Not For Promotion

### Legacy datasets still present in repo

- `lab/datasets/teacher_mix_70_30.jsonl`
- `lab/datasets/teacher_tactical_finisher.jsonl`

Status:

- keep for forensic comparison
- do not use as source dataset for Baby V2 or later checkpoints

### Legacy experiment outputs

- `lab/experiments/exp_001_frozen/`
- `lab/experiments/exp_002_test/`

Status:

- preserved for historical context
- not canonical tournament truth

### Active-but-older experiment output

- `lab/experiments/exp_003_aggressive/`

Status:

- canonical location for real tournament outputs before V2 baby rebasing
- still useful for audit
- not the same thing as the new frozen baby training run

## ARCHIVE - Explicitly Quarantined

### Quarantine root

- `archive/quarantine_2026-04-16/`

### Zero-byte noise

- `archive/quarantine_2026-04-16/root_zero_byte_noise/`

These are failed-automation artifacts and must never be restored into the repo root as active files.

### Legacy outputs

- `archive/quarantine_2026-04-16/legacy_lab_outputs/`

These are archived because they created duplicate or misleading tournament truth locations.

## NOT SOURCE OF TRUTH

- root-level files outside `TacticalChessPureLab` unless explicitly imported
- private browser chats by themselves
- copied prompts without matching code
- old screenshots or notes without file-level confirmation
- any checkpoint that does not have a matching run manifest

## Promotion Rules

A file or artifact can only be promoted into `ACTIVE` if:

- it lives under `TacticalChessPureLab`
- its producing code exists in the active repo
- its provenance is recorded
- it does not conflict with an existing canonical active marker
