# PureLab Pedagogy DB

## Role

This folder is the operational home for curated pedagogy-facing dataset material.
It exists to support the active PureLab phase:

**conversion recovery**

The goal is not to store arbitrary games.
The goal is to store chess material that teaches the behaviors the lab explicitly wants:

- Build
- Tension
- Punish
- Convert
- Defend
- Conclude

and to reject:

- hard-cap pseudo-truth
- random trajectory contamination
- sterile repetition
- drift without story
- passive non-conversion

## Authority

Use this folder only under the active authority order described in:

- `MASTER_DOCS/V2_SOURCE_OF_TRUTH.md`
- `MASTER_DOCS/PROJECT_HISTORY.md`
- `lab/pedagogy_db/PURELAB_DATASET_BALANCE_OPERATIONAL_MASTER_TABLE.md`
- 



If a future file disagrees with active runtime truth, active code wins.

## Current intended contents

This folder should progressively contain:

- curated source manifests
- pedagogy selection rules
- filtered game collections
- tactical subsets
- conversion subsets
- technical ending subsets
- audit summaries

## Required hygiene

Any dataset candidate placed here should satisfy the operational doctrine:

- manifest present
- provenance strong
- hard cap count = 0 for main-candidate material
- random trajectory count = 0 for main-candidate material
- identifiable narrative class
- pedagogical usefulness visible
- compatible with dataset validation

## Priority order for curation

1. endgames
2. tactics
3. conversion

This order is intentional and follows the active request priority.

## File Index

### Active Dataset Files

| Filename | Role | Status | Description |
|----------|------|--------|-------------|
| `PEDAGOGICAL_DB_CONVERSION.pgn` | Source | Active | Conversion patterns for tactical chess |
| `PEDAGOGICAL_DB_ENDGAMES.pgn` | Source | Active | Endgame technique patterns |
| `PEDAGOGICAL_DB_TACTICS.pgn` | Source | Active | Tactical motifs and patterns |
| `teacher_manifest.json` | Manifest | Active | Game manifest for curation pipeline |
| `../datasets/clean_conversion_pack.jsonl` | Export | Active | Final-phase decisive conversion rows exported from the promoted pack |

### Documentation Files

| Filename | Role | Status | Description |
|----------|------|--------|-------------|
| `README.md` | Documentation | Active | This file - folder overview |
| `README_PED.md` | Documentation | Active | Machine-readable schema documentation |
| `README_MACHINE_FINAL.md` | Documentation | Active | Final machine-readable documentation |
| `PURELAB_DATASET_BALANCE_OPERATIONAL_MASTER_TABLE.md` | Governance | Active | Dataset balance governance table |

## Clean conversion export

Use `scripts/export_clean_conversion_pack.py` or `scripts/export_clean_conversion_pack.ps1` to build the stable clean conversion pack.

Default behavior:

- no opening plies
- no early middlegame plies
- decisive games only
- final phase rows only
- configurable final N plies
- emits before/after stats

### Index Files

| Filename | Role | Status | Description |
|----------|------|--------|-------------|
| `dataset_index.json` | Index | Active | Complete dataset index |
| `dataset_manifest.json` | Manifest | Active | Manifest for dataset operations |

---
**Last updated:** Active PureLab phase  
**Authority:** See `MASTER_DOCS/V2_SOURCE_OF_TRUTH.md` for complete authority order






















