# Prompt Generator Rules V0

Status: DOCUMENTED_ONLY
Surface: canonical_docs
Authority: PASSIVE / proposal_only
Mutation: BLOCKED by default
Claim posture: NO_CLAIM_ALLOWED

Allowed status values: IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, UNKNOWN.

Allowed task classes: logistics_only, docs_workflow, audit_repo, patch_runtime, report_analysis.

---

## 1. Purpose

These rules define when the Local Logistic Agent may draft a Codex prompt candidate.

Prompt drafting is passive preparation only. A drafted prompt does not authorize execution, mutation, activation, promotion, commit, push, branch creation, pull request creation, or claims.

---

## 2. When Prompt Drafting Is Allowed

The Local Logistic Agent may draft a prompt only when all conditions are met:

- HumanGate or ChatGPT Navigator explicitly requests a bounded Codex task candidate.
- Required source anchors are loaded by readback or explicitly present in the active task context.
- The task has specific scope_in and scope_out boundaries.
- File-producing work has explicit output_routing.
- Target files and reference-only paths are separated.
- Blocked actions are listed.
- Validation expectations are declared.
- Final report requirements include commands run, results, skipped validation, risks, status_by_surface, software_verdict, evidence_verdict, and claim_verdict.

---

## 3. When Prompt Generation Is BLOCKED

Prompt generation is `BLOCKED` when any required condition is missing:

- no source readback;
- missing required source anchor;
- route or destination unclear;
- file-producing prompt without output_routing;
- no target files for file-scoped work;
- scope_in or scope_out is ambiguous;
- blocked actions are absent;
- validation expectations are absent;
- requested action includes runtime activation, training, benchmark, dataset generation/reset, model/checkpoint creation, model promotion, agent activation, Chess960 activation, DecisionController activation, commit, push, branch, or pull request without explicit HumanGate authorization;
- requested exact runtime claim is unsupported because the exact runtime identifier is hidden or `UNKNOWN`.

---

## 4. Required codex_runtime Block

Every generated Codex prompt candidate must include:

```yaml
codex_runtime:
  requested_model: "gpt-5.5"
  requested_reasoning_effort: "medium"
  task_class: "docs_workflow"
  fallback_policy:
    if_requested_model_unavailable: "STOP_AND_REPORT"
    if_actual_model_identifier_hidden: "actual_runtime: UNKNOWN"
    unknown_runtime_status: "BLOCKED"
  actual_runtime: "UNKNOWN"
  actual_runtime_evidence: "Exact runtime identifier not exposed by Codex unless explicitly visible."
  runtime_status: "BLOCKED"
  runtime_claim_rule: "Do not claim the exact runtime model unless Codex exposes it explicitly."
```

Rule: `UNKNOWN` exact runtime means exact runtime claim is `BLOCKED`.

---

## 5. Preflight Requirements

A Codex prompt candidate must require the executor to report:

- current directory;
- branch;
- HEAD;
- `git status --short --branch`;
- pre-existing modified, untracked, deleted, and staged files;
- dirty-worktree separation before edits;
- AGENTS.md readback before work.

---

## 6. Source Readback Requirements

No source readback means no Codex prompt.

Required prompt language:

```text
Do not infer active truth from memory or conversation.
If required source paths are missing, report NOT_FOUND and continue only where safe.
created != registered != loaded != enforced != evidenced
```

The prompt must separate source state into created, registered, loaded, enforced, and evidenced.

---

## 7. Scope Requirements

Each prompt candidate must include:

- exact scope_in paths;
- explicit scope_out paths and actions;
- locked-lane files that must not be touched;
- reference-only paths;
- allowed actions;
- blocked actions;
- expected output files if any;
- no global ready verdict.

---

## 8. Output Routing Requirement

No output routing means no file-producing prompt.

File-producing prompt candidates must include:

```yaml
output_routing:
  produced_file_type: ""
  intended_surface: ""
  canonical_destination: ""
  temporary_destination: ""
  forbidden_destinations: []
  registration_required: false
  project_source_upload_required: false
  retention_policy: ""
  promotion_gate: "HumanGate"
```

The prompt must require route_check before writing and output_routing_result after writing.

---

## 9. Blocked Actions

Every prompt candidate must block:

- runtime code changes unless explicitly scoped;
- test changes unless explicitly scoped;
- runtime execution unless explicitly scoped;
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
- pull request creation.

---

## 10. Validation Requirements

Docs-only prompts must require:

- `git diff --check`;
- readback of every produced file;
- controlled status value check;
- locked-file change check;
- final `git status --short --branch`.

Runtime tests, benchmarks, training, dataset generation, and performance runs are `BLOCKED` for docs-only prompts.

---

## 11. Final Report Requirements

The prompt must require:

- preflight;
- source_state;
- route_check;
- output_routing_result;
- collision_check_with_active_lane;
- files_changed;
- commands_run;
- skipped_validation;
- risks;
- status_by_surface;
- software_verdict;
- evidence_verdict;
- claim_verdict;
- `no_global_ready_verdict: true`.

Reports are evidence records only. They are not promotion, activation, release, benchmark proof, model proof, or claim validation.
