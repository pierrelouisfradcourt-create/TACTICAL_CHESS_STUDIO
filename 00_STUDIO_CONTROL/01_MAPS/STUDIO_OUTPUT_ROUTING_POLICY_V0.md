# Studio Output Routing Policy V0

Status: DOCUMENTED_ONLY  
Owner: HumanGate  
Scope: Output placement and routing rules for Studio Control and TacticalChessPureLab tasks  
Runtime authority: NONE  
Agent activation: BLOCKED  
Training: BLOCKED  
Benchmark: BLOCKED  
Dataset generation: BLOCKED  
Model promotion: BLOCKED  
Claim posture: NO_CLAIM_ALLOWED  

---

## 1. Purpose

This document defines where future produced docs, reports, prompts, templates, and runtime artifacts must be routed.

It exists to block random file creation, duplicate root placement, accidental source promotion, and confusion between canonical docs, roadmap docs, runtime outputs, and inference records.

`00_STUDIO_CONTROL/03_REGISTRIES/FILE_REGISTRY.yaml` is the route, owner, consumer, status, and evidence authority for registered control-room files when a file body omits local metadata.

---

## 2. Routing Rule

```text
Every produced file must have an explicit surface, owner, destination, and authority level before creation.
If the destination is unclear, do not create the file.
Report BLOCKED and request a HumanGate routing decision.
```

---

## 3. Surface Separation

All work must separate these surfaces:

| Surface | Meaning | Default routing |
| --- | --- | --- |
| `active_runtime_code` | Runtime source code and executable behavior. | Reference repo runtime paths only under explicit code task. |
| `tests` | Unit, integration, regression, and validation tests. | Reference repo test paths only under explicit test task. |
| `artifacts_runtime_outputs` | Generated logs, reports, run folders, datasets, checkpoints, models, manifests. | Runtime artifact roots only under explicit artifact task. |
| `canonical_docs` | Stable policies, contracts, source indexes, gates, and architecture docs. | `00_STUDIO_CONTROL` or repo canonical docs as explicitly scoped. |
| `roadmap_docs_only` | Future plans, proposals, non-authoritative notes. | Roadmap docs only; no runtime claim authority. |
| `inference` | ML suggestions, reranking, analysis, model-assisted records. | Passive analysis records only unless separately authorized. |

Use the canonical surface names in this table for machine-facing records. Human-readable summaries may use `runtime_outputs` as an alias for `artifacts_runtime_outputs`, but aliases do not create additional surfaces without an explicit registry and routing-policy mapping.

---

## 4. Studio Control Routing

Use these Studio Control destinations after the unique-prefix topology migration:

`00_STUDIO_CONTROL/` is intentionally local-only and untracked by HumanGate decision. GitHub presence is `NOT_EXPECTED` in prose and is not a required target. Reports must treat `?? 00_STUDIO_CONTROL/` as `INFO_ONLY`/`PASSIVE`, not as a critical sync defect. Git add, commit, push, branch, PR, or tracking actions for the local control room are `BLOCKED` unless HumanGate explicitly authorizes them later.

| Output type | Destination | Rule |
| --- | --- | --- |
| Index/read-first/status legend | `00_INDEX` | Do not copy pipeline core files here unless explicitly authorized. |
| Studio map, path, topology, routing policy | `01_MAPS` | Topology and output-routing docs belong here. |
| Source anchoring and navigation docs | `02_NAVIGATION` | Source loading, registration, and prompt-gate anchors belong here. |
| Registries | `03_REGISTRIES` | Registry docs belong here. Do not create registry copies at root. |
| Boundaries and guardrails | `04_BOUNDARIES` | Policy boundaries belong here. |
| Status reports | `05_STATUS` | Closure/status docs belong here. |
| Topology migration status | `05_STATUS` | Topology migration status records belong here. |
| Codex operating docs | `06_CODEX` | Codex prompts, reports, levels, and stop-condition docs belong here unless they are V0 AutoDev forms. |
| AutoDev contracts and templates | `07_FORMS` | Task charter, executor report, and analysis record templates belong here. |
| Migration docs | `08_MIGRATION` | Migration runbooks and future cleanup plans belong here. |
| Cyberdefense docs | `09_CYBERDEFENSE` | CyberSentinel docs belong here. |
| Roadmap docs | `10_ROADMAP` | Roadmap-only docs belong here. |
| Generic pipeline core | `11_PIPELINE_CORE` | Generic pipeline package only. |
| Legacy opening pipeline | `12_PIPELINE_OPENING_LEGACY` | PASSIVE legacy traceability only. Do not route new active outputs here. |
| Machine profiles | `13_BOOTSTRAP_PROFILES` | Machine-specific bootstrap profiles only. |

---

## 5. Reference Repo Routing

Repository docs and source indexes must stay inside:

```text
C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab
```

Use repo-local routing only when the file is about TacticalChessPureLab repo operation, repo source registration, or repo-local canonical docs.

Do not place Studio-wide control documents inside the game repo unless a task charter explicitly says the repo owns that document.

---

## 6. Forbidden Default Destinations

Do not create new files by default in:

- the root of `00_STUDIO_CONTROL`;
- root-level duplicate canonical Markdown files under `00_STUDIO_CONTROL`;
- `12_PIPELINE_OPENING_LEGACY`;
- `lab`;
- `latest.json`;
- `lab/runs/RUN_*`;
- runtime source directories;
- test directories;
- dataset directories;
- model or checkpoint directories;
- temporary folders that are later treated as canonical.

Any exception requires an explicit task charter and HumanGate.

---

## 7. Root Duplicate Prevention

Root-level duplicate canonical files are BLOCKED.

New `00_STUDIO_CONTROL` root-level Markdown files are BLOCKED unless explicitly routed and HumanGate-approved.

Any Studio Control file-producing task must declare `output_routing` before creation, update, deletion, movement, renaming, archival, or generation.

Any Studio Control file-producing task must run a duplicate-root check before writing and must report whether a canonical nested target already exists.

If a proposed output would recreate a root-level duplicate of a canonical nested file, report `BLOCKED` and do not create it.

---

## 8. Generated Reports

Generated reports are not active truth by default.

They must be classified as one of:

- temporary task evidence;
- passive artifact;
- roadmap-only note;
- canonical doc candidate pending HumanGate.

A generated report does not become canonical because it exists on disk.

---

## 9. Source Registration

New canonical control docs must be:

1. created in the correct destination;
2. registered in the source index or upload checklist when needed;
3. loaded or explicitly read before use;
4. enforced by the active task charter or prompt;
5. evidenced in the executor report.

Use the source-state chain:

```text
created -> registered -> loaded -> enforced -> evidenced
```

---

## 10. Blocked Actions

This policy does not authorize:

- tracking `00_STUDIO_CONTROL/` in Git without explicit HumanGate authorization;
- physical cleanup;
- folder rename;
- file move;
- file deletion;
- archive creation;
- runtime implementation;
- test modification;
- ML code modification;
- dataset generation or reset;
- benchmark;
- training;
- model or checkpoint creation;
- model promotion;
- agent activation;
- Chess960 activation;
- DecisionController activation;
- commit;
- push;
- branch creation;
- pull request creation.

---

## 11. Failure Mode

If a future task cannot determine the correct destination:

```text
status: BLOCKED
reason: output routing unclear
required_action: HumanGate routing decision
```

Do not create a placeholder file to resolve ambiguity.
