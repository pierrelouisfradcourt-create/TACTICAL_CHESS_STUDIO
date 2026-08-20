# Human Compilation - Active Pedagogy DB Contents

## Overview

This document provides a rapid human-readable summary of all active contents in `lab/pedagogy_db/` for quick analysis before dataset expansion. All files are in the active repo only; no archive references.

## Priority Order

Games are organized by pedagogy family priority:
1. **Endgames** (highest priority)
2. **Tactics**
3. **Conversion**

## Compiled Dataset Files

Three JSONL files have been created from the source PGN files for rapid analysis:

### 1. compiled_endgames.jsonl

**Source:** PEDAGOGICAL_DB_ENDGAMES.pgn  
**Games:** 1  
**Priority:** 1 (Endgames)

| ID | White | Black | Event | Result | Tags |
|----|-------|-------|-------|--------|------|
| endgame_wc2023_xu_suleymanli | Xu Yinglun | Suleymanli Aydin | World Cup 2023 | 1/2-1/2 | Build, Defend, Conclude |

### 2. compiled_tactics.jsonl

**Source:** PEDAGOGICAL_DB_TACTICS.pgn  
**Games:** 1  
**Priority:** 2 (Tactics)

| ID | White | Black | Event | Result | Tags |
|----|-------|-------|-------|--------|------|
| tactics_wc2023_smirin_avila | Smirin Ilia (ISR) | Avila Pavas Santiago (COL) | World Cup 2023 Open | 1-0 | Build, Tension, Punish, Convert |

### 3. compiled_conversion.jsonl

**Source:** PEDAGOGICAL_DB_CONVERSION.pgn  
**Games:** 1  
**Priority:** 3 (Conversion)

| ID | White | Black | Event | Result | Tags |
|----|-------|-------|-------|--------|------|
| conversion_wc2023_suleymanli_xu | Suleymanli Aydin (AZE) | Xu Yinglun (CHN) | World Cup 2023 | 1-0 | Tension, Punish, Convert, Conclude |

## Source Files

| File | Type | Content |
|------|------|--------|
| PEDAGOGICAL_DB_ENDGAMES.pgn | Source | Endgame study games |
| PEDAGOGICAL_DB_TACTICS.pgn | Source | Tactical motif games |
| PEDAGOGICAL_DB_CONVERSION.pgn | Source | Conversion technique games |

## Compiled Files

| File | Type | Content |
|------|------|--------|
| compiled_endgames.jsonl | Compiled | 1 endgame (JSONL) |
| compiled_tactics.jsonl | Compiled | 1 tactic (JSONL) |
| compiled_conversion.jsonl | Compiled | 1 conversion (JSONL) |

## Dataset Governance

- **Selection Doctrine:** Preferred narratives are Build, Tension, Punish, Convert, Defend, Conclude
- **Hard Exclusions:** Arbitrary games without pedagogical value
- **Validation:** Manifest present, provenance strong, compatible with dataset validation
- **Confidence Tier:** All compiled games are Tier A (high confidence)

## File Locations

All files are located in: `lab/pedagogy_db/`

- Source PGNs: `PEDAGOGICAL_DB_ENDGAMES.pgn`, `PEDAGOGICAL_DB_TACTICS.pgn`, `PEDAGOGICAL_DB_CONVERSION.pgn`
- Compiled JSONLs: `compiled_endgames.jsonl`, `compiled_tactics.jsonl`, `compiled_conversion.jsonl`
- Documentation: `README.md`, `README_PED.md`, `README_MACHINE_FINAL.md`
- Governance: `PURELAB_DATASET_BALANCE_OPERATIONAL_MASTER_TABLE.md`, `PEDAGOGICAL_DB_DATASET_GOVERNANCE.md`
- Manifests: `dataset_manifest.json`, `teacher_manifest.json`

---
**Generated:** Active PureLab phase  
**Scope:** lab/pedagogy_db/ only (no archives, no redesign)  
**Purpose:** Rapid human analysis before dataset expansion

























































