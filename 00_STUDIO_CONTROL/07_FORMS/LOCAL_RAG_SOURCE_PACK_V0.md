# Local RAG Source Pack V0

Status: DOCUMENTED_ONLY
Surface: canonical_docs
Authority: PASSIVE / proposal_only
Mutation: BLOCKED by default
Runtime authority: NONE
Agent activation: BLOCKED
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation: BLOCKED
Model promotion: BLOCKED
Claim posture: NO_CLAIM_ALLOWED

Allowed status values: IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, UNKNOWN.

---

## 1. Purpose

This document defines compact Local RAG source packs for the passive Local Logistic Agent Mistral/Devstral.

The source pack is a retrieval and context-loading specification only. It helps the local agent select, order, chunk, and cite source material for task intake, prompt drafting, report parsing, routing checks, and HumanGate review preparation.

It does not authorize file mutation, runtime execution, training, benchmark, dataset generation, model creation, model promotion, agent activation, commit, push, branch creation, pull request creation, or claim validation.

---

## 2. Authority Boundary

```yaml
agent_name: "Local Logistic Agent Mistral/Devstral"
analysis_mode: "PASSIVE"
authority: "proposal_only"
mutation: "BLOCKED"
runtime_authority: "NONE"
human_gate_required: true
claim_posture: "NO_CLAIM_ALLOWED"
```

HumanGate preserves final authority over merge, reject, freeze, promotion, activation, source registration, source loading, source enforcement, and claim status.

The Local Logistic Agent may retrieve, summarize, classify, and propose only. It must not decide readiness, validate claims, or treat retrieved text as promotion evidence.

---

## 3. Source State Rule

```text
created != registered
registered != loaded
loaded != enforced
enforced != evidenced
```

Expanded source-state requirements:

| State | Meaning | Minimum evidence |
| --- | --- | --- |
| created | The file exists on disk. | Path and readback. |
| registered | The file appears in a source registry, source index, upload checklist, task charter, or approved pack manifest. | Registry, checklist, or manifest entry. |
| loaded | The file was explicitly read into the active task context or is present in the active project source set. | Readback command, tool output, or project source evidence. |
| enforced | The active prompt, task charter, report, or parser applies the source rules. | Reported rule application and source citation. |
| evidenced | The final report records commands, results, validation, skipped validation, risks, and verdicts. | Executor report or analysis record evidence. |

Anti-memory rule:

```text
No source readback -> no authority.
```

Memory, conversational context, filenames, embeddings, stale cached chunks, or a newly created local file do not become loaded project truth without readback or explicit active-source evidence.

---

## 4. Source Types

### Permanent Sources

Permanent sources are stable control, doctrine, contract, template, registry, and runtime-reference files approved by HumanGate or listed in a source index, upload checklist, or pack manifest.

Permanent source use still requires current task readback or active project-source evidence. Permanent does not mean loaded, enforced, or evidenced.

### Temporary Sources

Temporary sources are task-specific executor reports, diffs, logs, local observations, or one-off files provided for a bounded review.

Temporary sources may support passive synthesis, but they do not become active truth, canonical docs, benchmark proof, model proof, runtime proof, or claim proof unless HumanGate promotes and registers them.

---

## 5. Source Priority

Use this priority order when sources conflict:

| Priority | Source class | Rule |
| --- | --- | --- |
| 1 | Active HumanGate instruction in the current task | Governs scope and blocked actions when compatible with repository doctrine. |
| 2 | `AGENTS.md` and loaded control gates | Governs Codex behavior, verdict split, source anchoring, and validation discipline. |
| 3 | Output routing, source anchoring, and AutoDev forms | Governs destination, source-state, task charter, report, parser, and queue/matrix records. |
| 4 | Active task charter or prompt | Governs the bounded task only after source readback and route check. |
| 5 | Current git/readback evidence | Governs actual local state for changed files, diffs, and status. |
| 6 | Executor reports and analysis records | Evidence records only; not promotion or claim proof. |
| 7 | Roadmap docs | Planning only unless explicitly promoted by HumanGate. |

If priority cannot be resolved from loaded evidence, report `UNKNOWN` or `BLOCKED`; do not infer from memory.

---

## 6. Source Freshness Rules

- Prefer current readback over cached chunks.
- Prefer current git status, diff, and file readback over prior reports.
- Treat unregistered or unread local files as `created` or `UNKNOWN`, not loaded authority.
- Treat stale roadmap-only docs as `roadmap_docs_only` and `DOCUMENTED_ONLY` or `PASSIVE`.
- Treat executor reports as evidence records tied to their task date and scope.
- Treat benchmark summaries as blocked for claim authority unless HumanGate explicitly authorizes benchmark analysis and supplies admissible evidence.
- If source freshness is uncertain, mark freshness `UNKNOWN` and avoid claims.

---

## 7. Blocked Sources

The Local RAG layer must not use these as active authority or claim proof:

- `lab/*`
- `latest.json`
- benchmark summaries
- stale roadmap-only docs used as truth
- generated runtime outputs treated as canonical docs
- performance runs used as proof
- holdout references used as validation proof
- unregistered local files treated as loaded sources
- memory-only summaries without readback

Blocked sources may be mentioned as `BLOCKED`, `PASSIVE`, `DOCUMENTED_ONLY`, or `UNKNOWN` observations if the task explicitly requires source risk analysis.

---

## 8. Max Context Strategy

Use a compact pack before loading broad context.

Default loading order:

1. Doctrine and authority boundary.
2. Source anchoring and routing.
3. Task-specific forms or templates.
4. Current task charter, report, diff, or target file readback.
5. Narrow supporting references.

If context is limited:

- load required anchors first;
- load table-of-contents or headings before full files when safe;
- retrieve exact sections by heading or keyword;
- prefer current file readback for target files over historical summaries;
- drop roadmap and passive records unless the task class requires them;
- preserve final-report requirements, blocked actions, and verdict split.

---

## 9. Chunking Strategy

Chunk sources by semantic boundaries, not arbitrary token windows.

Recommended chunk order:

1. Metadata block: status, surface, authority, blocked actions, claim posture.
2. Purpose and scope.
3. Required gates and source-state rules.
4. Routing and destination rules.
5. Validation and report requirements.
6. Task-specific schema fields.
7. Non-authorization and blocked actions.

Each chunk should retain:

- source path;
- heading path;
- source-state known at retrieval time;
- surface classification;
- authority posture;
- freshness evidence;
- whether HumanGate is required.

Chunks without source path and readback evidence have no authority.

---

## 10. Retrieval Strategy

Retrieve narrowly and cite source state.

For every retrieval result, the local agent should record:

```yaml
retrieved_source:
  path: ""
  surface: "canonical_docs"
  state:
    created: "UNKNOWN"
    registered: "UNKNOWN"
    loaded: "UNKNOWN"
    enforced: "UNKNOWN"
    evidenced: "UNKNOWN"
  freshness: "UNKNOWN"
  authority: "PASSIVE"
  use_allowed: "UNKNOWN"
  reason: ""
```

Use `BLOCKED` when the source is forbidden, stale, missing readback, or outside the allowed lane.

---

## 11. Routing-Aware Retrieval

Before proposing file-producing work, retrieve:

- `AGENTS.md`;
- `STUDIO_OUTPUT_ROUTING_POLICY_V0.md`;
- source anchoring rules;
- the relevant task charter or prompt rules;
- target destination readback or duplicate-name search evidence.

Routing-aware retrieval must identify:

- intended surface;
- owner;
- canonical destination;
- forbidden destinations;
- duplicate-root risk;
- locked-lane files;
- output_routing_required;
- output_routing_result fields required for the final report.

If routing is unclear, report `BLOCKED` and require HumanGate routing decision.

---

## 12. Report-Aware Retrieval

Before parsing an executor report, retrieve:

- `REPORT_PARSER_RULES_V0.md`;
- source anchoring rules;
- routing policy;
- the executor report text;
- any referenced changed files only if readback is needed.

Report-aware retrieval must preserve:

- files_changed;
- commands_run;
- validation;
- skipped_validation;
- risks;
- route_check;
- output_routing_result;
- status_by_surface;
- software_verdict;
- evidence_verdict;
- claim_verdict;
- claim_overreach_detected;
- no_global_ready_verdict.

Executor reports remain evidence records only. They are not HumanGate decisions.

---

## 13. Task-Aware Retrieval

Before drafting or slicing a task, retrieve:

- `LOCAL_LOGISTIC_AGENT_SPEC_V0.md`;
- `TASK_QUEUE_TEMPLATE_V0.yaml`;
- `TASK_MATRIX_TEMPLATE_V0.yaml`;
- `PROMPT_GENERATOR_RULES_V0.md`;
- routing policy;
- source anchoring rules;
- current task text;
- exact target or reference files named by the task.

Task-aware retrieval must classify:

- task_class;
- primary_surface;
- secondary_surfaces;
- scope_in;
- scope_out;
- target_files;
- reference_only_paths;
- validation_required;
- blocked_actions;
- HumanGate requirements.

If required source readback is missing, the prompt candidate is `BLOCKED`.

---

## 14. Anti-Claim Rule

The Local RAG layer must not retrieve or summarize sources into claims of:

- global readiness;
- Elo or playing strength;
- benchmark proof;
- scientific proof;
- model proof;
- promotion;
- runtime activation;
- agent activation;
- dataset quality proof;
- release status.

Default claim posture:

```yaml
claim_posture: "NO_CLAIM_ALLOWED"
no_global_ready_verdict: true
```

Claims require explicit HumanGate decision and admissible source evidence outside this passive source-pack specification.

---

## 15. Minimal Source Pack

Use this pack for basic local task intake, classification, and safety checks.

Required sources:

- `AGENTS.md`
- `00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md`
- `00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md`
- `00_STUDIO_CONTROL/07_FORMS/LOCAL_LOGISTIC_AGENT_SPEC_V0.md`

Purpose:

- establish authority boundary;
- enforce source-state separation;
- classify surfaces;
- preserve HumanGate authority;
- block claims and mutation.

Default status:

```yaml
active_runtime_code: "PASSIVE"
tests: "PASSIVE"
artifacts_runtime_outputs: "PASSIVE"
canonical_docs: "DOCUMENTED_ONLY"
roadmap_docs_only: "PASSIVE"
inference: "PASSIVE"
```

---

## 16. Runtime Audit Source Pack

Use this pack only for passive runtime audit planning or source-backed audit intake. It does not authorize runtime execution or code mutation.

Required sources:

- Minimal source pack
- current task charter or audit request
- explicitly scoped runtime files by readback
- relevant executor report or status record, if supplied

Blocked sources:

- `lab/*` as claim authority
- `latest.json`
- benchmark summaries as proof
- stale roadmap-only docs as truth

Required outputs:

- component-level runtime status;
- source-state table;
- risks and unknowns;
- `software_verdict`, `evidence_verdict`, and `claim_verdict`.

---

## 17. Docs Workflow Source Pack

Use this pack for docs-only creation, update, and review tasks.

Required sources:

- Minimal source pack
- `docs/gpt-navigator/GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md` when prompt gating is relevant
- `00_STUDIO_CONTROL/07_FORMS/PROMPT_GENERATOR_RULES_V0.md` when drafting Codex prompts
- target docs by readback
- duplicate-name and route-check evidence

Required validation:

- `git diff --check`
- readback of changed docs
- `git diff --name-only`
- `git status --short --branch`

Runtime tests, training, benchmarks, dataset actions, and model actions are `BLOCKED`.

---

## 18. Patch-Runtime Source Pack

Use this pack only when HumanGate explicitly authorizes runtime patch planning or Codex execution.

Required sources:

- Minimal source pack
- current task charter with explicit runtime scope
- relevant runtime files by readback
- relevant tests by readback
- smallest targeted validation command list
- active git status and diff evidence

Constraints:

- Rust remains runtime truth.
- Python remains ML, inference, and tooling.
- Search remains final authority.
- Neural proposes and reranks only.
- No broad runtime refactor.
- No performance run as proof.
- No holdout.

If HumanGate authorization is absent, status is `BLOCKED`.

---

## 19. LoRA-Readiness Source Pack

Use this pack only for passive LoRA-readiness planning, requirements inventory, or report analysis.

Required sources:

- Minimal source pack
- explicit LoRA task charter or HumanGate request
- dataset-label requirements by readback
- model/checkpoint policy source by readback, if available
- relevant passive reports, if supplied

Blocked actions:

- training;
- dataset generation;
- dataset reset;
- benchmark;
- model or checkpoint creation;
- model promotion;
- claim validation.

Dataset labels require ActionId, LegalAction, ActionMask, provenance, and HumanGate. Missing evidence must be `UNKNOWN` or `BLOCKED`, not inferred.

---

## 20. Report-Analysis Source Pack

Use this pack for passive parsing of Codex executor reports or analysis records.

Required sources:

- Minimal source pack
- `00_STUDIO_CONTROL/07_FORMS/REPORT_PARSER_RULES_V0.md`
- executor report text by readback
- referenced changed files only when needed for evidence checks
- current git status or diff evidence when the report discusses local changes

Required extraction:

- route_check;
- output_routing_result;
- files_changed;
- commands_run;
- validation;
- skipped_validation;
- risks;
- status_by_surface;
- software_verdict;
- evidence_verdict;
- claim_verdict;
- no_global_ready_verdict.

Reports are local evidence records for HumanGate review. They are not merge approval, source registration, source loading, model proof, benchmark proof, promotion proof, or claim validation.

---

## 21. Non-Authorization

This source-pack specification is documentation only.

It does not authorize:

- runtime implementation;
- runtime execution;
- test changes;
- training;
- benchmark;
- dataset generation;
- dataset reset;
- `latest.json` creation;
- `lab/runs/RUN_*` creation;
- model or checkpoint creation;
- model promotion;
- agent activation;
- Chess960 activation;
- DecisionController activation;
- commit;
- push;
- branch creation;
- pull request creation;
- global ready verdicts;
- Elo, strength, promotion, benchmark proof, model proof, or scientific proof claims.

Any such action requires explicit HumanGate authorization and separate source-backed task scope.
