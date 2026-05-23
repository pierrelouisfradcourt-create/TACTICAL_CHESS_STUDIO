# Studio Control Topology Migration V1

Status: DOCUMENTED_ONLY
Scope: 00_STUDIO_CONTROL top-level unique-prefix migration
Runtime authority: NONE
Agent activation: BLOCKED
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation: BLOCKED
Model promotion: BLOCKED
Claim posture: NO_CLAIM_ALLOWED

---

## 1. Purpose

This record documents the HumanGate-authorized physical migration of `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL` to a unique-prefix top-level architecture.

The migration removes repeated numeric prefixes and non-numbered top-level Studio Control folders while preserving source anchors.

This record is documentation and routing evidence only. It does not authorize runtime implementation, tests, ML changes, training, benchmarks, dataset generation, model or checkpoint creation, agent activation, Chess960 activation, DecisionController activation, commits, pushes, branches, or pull requests.

---

## 2. Final Topology

| Directory | Role | Status |
| --- | --- | --- |
| `00_INDEX` | Index and read-first surface | DOCUMENTED_ONLY |
| `01_MAPS` | Maps, routing, topology, and path contracts | DOCUMENTED_ONLY |
| `02_NAVIGATION` | Source anchoring and navigation | DOCUMENTED_ONLY |
| `03_REGISTRIES` | Registries | DOCUMENTED_ONLY |
| `04_BOUNDARIES` | Boundaries and guardrails | DOCUMENTED_ONLY |
| `05_STATUS` | Status and migration records | DOCUMENTED_ONLY |
| `06_CODEX` | Codex operating documents | DOCUMENTED_ONLY |
| `07_FORMS` | AutoDev forms and templates | DOCUMENTED_ONLY |
| `08_MIGRATION` | Migration runbooks and snapshots | DOCUMENTED_ONLY |
| `09_CYBERDEFENSE` | Cyberdefense control documents | DOCUMENTED_ONLY |
| `10_ROADMAP` | Roadmap-only documents | DOCUMENTED_ONLY |
| `11_PIPELINE_CORE` | Generic pipeline core package | DOCUMENTED_ONLY |
| `12_PIPELINE_OPENING_LEGACY` | Passive legacy opening package | PASSIVE |
| `13_BOOTSTRAP_PROFILES` | Machine bootstrap profiles | DOCUMENTED_ONLY |

---

## 3. Migration Map

| Source role before migration | Canonical directory after migration | Status |
| --- | --- | --- |
| Index surface | `00_INDEX` | PRESERVED |
| Map surface | `01_MAPS` | PRESERVED |
| Navigation surface | `02_NAVIGATION` | PRESERVED |
| Registry surface | `03_REGISTRIES` | MOVED |
| Boundary surface | `04_BOUNDARIES` | MOVED |
| Status surface | `05_STATUS` | MOVED |
| Codex operating surface | `06_CODEX` | MOVED |
| AutoDev forms surface | `07_FORMS` | MOVED |
| Migration surface | `08_MIGRATION` | MOVED |
| Cyberdefense surface | `09_CYBERDEFENSE` | MOVED |
| Roadmap surface | `10_ROADMAP` | MOVED |
| Pipeline core package | `11_PIPELINE_CORE` | MOVED |
| Pipeline opening legacy package | `12_PIPELINE_OPENING_LEGACY` | MOVED |
| Bootstrap profiles package | `13_BOOTSTRAP_PROFILES` | MOVED |

---

## 4. Source Anchors After Migration

| Anchor | Canonical path | Status |
| --- | --- | --- |
| Source anchoring | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md` | DOCUMENTED_ONLY |
| Topology freeze | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/STUDIO_CONTROL_TOPOLOGY_FREEZE_V0.md` | DOCUMENTED_ONLY |
| Output routing policy | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md` | DOCUMENTED_ONLY |
| Cleanup status | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_CLEANUP_APPLY_V0.md` | DOCUMENTED_ONLY |
| Topology migration status | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/05_STATUS/STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md` | DOCUMENTED_ONLY |
| AutoDev I/O contract | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md` | DOCUMENTED_ONLY |
| Task charter template | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/TASK_CHARTER_TEMPLATE_V0.yaml` | DOCUMENTED_ONLY |
| Executor report template | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/EXECUTOR_REPORT_TEMPLATE_V0.yaml` | DOCUMENTED_ONLY |
| Analysis agent record template | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/ANALYSIS_AGENT_RECORD_TEMPLATE_V0.yaml` | DOCUMENTED_ONLY |
| Legacy pipeline read-first | `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/12_PIPELINE_OPENING_LEGACY/READ_FIRST_PIPELINE.md` | PASSIVE |

---

## 5. Path Rewrite Scope

Active references were eligible for rewrite in:

- Studio Control Markdown, YAML, and text files outside snapshot folders;
- repo-local Navigator Markdown files;
- repo-local `AGENTS.md`.

Historical snapshot contents were excluded from rewriting.

Snapshot folders remain historical evidence. A snapshot path may preserve pre-migration content and must not be treated as an active source path unless a later HumanGate task explicitly says so.

---

## 6. Validation Summary

Required validation for this migration:

- verify final root topology;
- verify no repeated numeric prefixes;
- verify no non-numbered top-level directories;
- verify source anchors at migrated paths;
- verify removed active source directories are absent;
- verify active references use migrated paths outside snapshots;
- run docs-only diff validation for the repository.

Detailed command evidence belongs in the executor final report.

---

## 7. Blocked Actions

This migration did not authorize:

- runtime code changes;
- test changes;
- ML or dataset code changes;
- runtime execution;
- tests execution;
- training;
- benchmarks;
- dataset generation or reset;
- `latest.json` creation;
- lab run creation;
- model or checkpoint creation;
- model promotion;
- agent activation;
- Chess960 activation;
- DecisionController activation;
- staging;
- commit;
- push;
- branch creation;
- pull request creation;
- network access;
- Git fetch;
- historical snapshot rewriting.

---

## 8. Final Verdicts

software_verdict:

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: DOCUMENTED_ONLY
- roadmap_docs_only: PASSIVE
- inference: PASSIVE

evidence_verdict:

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: TESTED
- roadmap_docs_only: PASSIVE
- inference: PASSIVE

claim_verdict:

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: DOCUMENTED_ONLY
- roadmap_docs_only: PASSIVE
- inference: PASSIVE

No global ready or not-ready verdict is made.
