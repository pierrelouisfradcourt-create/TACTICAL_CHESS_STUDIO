# Studio Control Topology Freeze V0

Status: DOCUMENTED_ONLY  
Scope: Temporary topology freeze and structure-drift register for 00_STUDIO_CONTROL  
Runtime authority: NONE  
Agent activation: BLOCKED  
Training: BLOCKED  
Benchmark: BLOCKED  
Dataset generation: BLOCKED  
Model promotion: BLOCKED  
Claim posture: NO_CLAIM_ALLOWED  

---

## 1. Purpose

This document is superseded for current topology by `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md`.

It remains as historical governance for the freeze period and for the anti-drift rules that led to the migration.

This document freezes the current 00_STUDIO_CONTROL topology as the temporary operational source layout.

It does not declare the current topology ideal.

It exists to prevent accidental drift, random file placement, premature folder renames, and source-anchor breakage while a future migration policy is designed.

---

## 2. Freeze Rule

```text
Current paths are the migrated unique-prefix anchors recorded by STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md.
No further rename, move, delete, archive, or cleanup is allowed without a separate HumanGate-approved migration task.
```

The freeze protects current references. It does not authorize new duplicate paths, duplicate filenames, or repeated numeric prefixes.

---

## 3. Frozen Root

Canonical frozen root:

```text
C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL
```

The current top-level directories are frozen as observed:

| Directory | Status | Freeze note |
| --- | --- | --- |
| `00_INDEX` | DOCUMENTED_ONLY | Current index/read-first surface. |
| `01_MAPS` | DOCUMENTED_ONLY | Current map, path, routing, and topology-policy surface. |
| `02_NAVIGATION` | DOCUMENTED_ONLY | Current source anchoring and navigation surface. |
| `03_REGISTRIES` | DOCUMENTED_ONLY | Current registry surface. |
| `04_BOUNDARIES` | DOCUMENTED_ONLY | Current boundary and policy surface. |
| `05_STATUS` | DOCUMENTED_ONLY | Current status surface. |
| `06_CODEX` | DOCUMENTED_ONLY | Current Codex operating-doc surface. |
| `07_FORMS` | DOCUMENTED_ONLY | Current AutoDev contract/template surface. |
| `08_MIGRATION` | DOCUMENTED_ONLY | Current migration and bootstrap surface. |
| `09_CYBERDEFENSE` | DOCUMENTED_ONLY | Current CyberSentinel surface. |
| `10_ROADMAP` | DOCUMENTED_ONLY | Current roadmap-only surface. |
| `11_PIPELINE_CORE` | DOCUMENTED_ONLY | Current generic AutoDev pipeline core exception. |
| `12_PIPELINE_OPENING_LEGACY` | PASSIVE | Current legacy traceability package. Do not use as active pipeline source. |
| `13_BOOTSTRAP_PROFILES` | DOCUMENTED_ONLY | Current machine-profile package. |

---

## 4. Drift Register

The earlier duplicate-prefix root topology is superseded by the V1 migration status record. Current drift handling is:

| Drift | Status | Rule |
| --- | --- | --- |
| Superseded duplicate-prefix topology | DOCUMENTED_ONLY | Do not recreate repeated numeric prefixes. |
| Superseded non-numbered top-level folders | DOCUMENTED_ONLY | Do not recreate non-numbered top-level Studio Control folders. |
| Root-level duplicate files | DOCUMENTED_ONLY | Do not create more root-level copies. Exact duplicate root cleanup is allowed only by a bounded HumanGate cleanup task with hash and reference evidence. |
| Stale layout contracts | DOCUMENTED_ONLY | Treat older layout sections as historical until rewritten by a migration task. |
| Studio Control anchors outside the repo | DOCUMENTED_ONLY | Keep explicit source registration, readback, and evidence. |

---

## 5. Numbering Policy

During this freeze:

- no new top-level numeric prefix may reuse an existing prefix;
- no existing top-level folder may be renamed after V1 without a new HumanGate migration task;
- no existing top-level folder may be moved under another folder;
- no new top-level unnumbered folder may be created;
- future top-level folders require a separate topology task charter and HumanGate.

Recommended future numbering must be documented before migration. A numbering proposal is not authorization to rename.

---

## 6. Canonical Temporary Anchors

The following paths remain valid temporary anchors:

| Anchor | Path |
| --- | --- |
| Source anchoring | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md` |
| AutoDev I/O contract | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md` |
| Task charter template | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/TASK_CHARTER_TEMPLATE_V0.yaml` |
| Executor report template | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/EXECUTOR_REPORT_TEMPLATE_V0.yaml` |
| Analysis agent record template | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/ANALYSIS_AGENT_RECORD_TEMPLATE_V0.yaml` |
| Topology freeze | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/STUDIO_CONTROL_TOPOLOGY_FREEZE_V0.md` |
| Output routing policy | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` |

---

## 7. Stale Contract Handling

Older topology and placement contracts may contain stale layout sections.

Until a future docs-only migration task updates them:

- do not treat stale layout lists as complete;
- do not delete or rewrite them as part of normal task work;
- add only short stale-layout warnings when authorized;
- prefer this freeze document for current root topology;
- preserve old contracts as historical placement evidence unless a bounded task updates active references.

---

## 8. Future Cleanup Order

Future cleanup must use this order:

1. HumanGate approves a docs-only topology migration charter.
2. Update source indexes and upload checklists first.
3. Update topology/path/placement contracts.
4. Update prompt gates and AGENTS references if required.
5. Only then consider folder renames or file moves in a separate migration task.
6. Validate all source-anchor paths after any physical migration.

Physical cleanup is BLOCKED until the future task explicitly authorizes it.

---

## 9. Cleanup Phase 1 Status

Status: DOCUMENTED_ONLY

HumanGate authorized one bounded cleanup phase for exact root-level Markdown duplicates under `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL`.

Phase 1 rules:

- exact root duplicate cleanup is allowed only when the root copy and expected nested canonical target have identical SHA256 hashes;
- source anchors must not move;
- source anchors must not be deleted, renamed, archived, or replaced;
- the duplicate-prefix drift was later superseded by `STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md`;
- additional directory migration remains BLOCKED;
- additional folder renames and folder moves remain BLOCKED;
- future recurrence prevention depends on `STUDIO_OUTPUT_ROUTING_POLICY_V0.md`, `PATH_CONTRACT.md`, and duplicate-root checks before Studio Control file creation.

This status did not migrate numbered directories by itself. The later V1 migration record is the current topology evidence.

---

## 10. Non-Authorization

This freeze does not authorize:

- folder rename;
- file move;
- file deletion outside the bounded exact-duplicate cleanup authorized by HumanGate for Cleanup Phase 1;
- archive creation;
- root duplicate cleanup outside the bounded exact-duplicate cleanup authorized by HumanGate for Cleanup Phase 1;
- runtime implementation;
- test modification;
- training;
- benchmarking;
- dataset generation or reset;
- `latest.json` creation;
- lab run creation;
- model or checkpoint creation;
- model promotion;
- agent activation;
- Chess960 activation;
- DecisionController activation;
- commit;
- push;
- branch creation;
- pull request creation.

Any such action requires a separate explicit HumanGate-approved task.
