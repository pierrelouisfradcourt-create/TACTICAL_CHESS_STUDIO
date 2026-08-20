# Report Parser Rules V0

Status: DOCUMENTED_ONLY
Surface: canonical_docs
Authority: PASSIVE / proposal_only
Mutation: BLOCKED by default
Claim posture: NO_CLAIM_ALLOWED

Allowed status values: IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, UNKNOWN.

---

## 1. Purpose

These rules define how the Local Logistic Agent may parse `executor_report_output`.

Parsing is passive synthesis only. The parsed report is evidence for HumanGate review, not promotion, activation, merge approval, benchmark proof, model proof, or claim validation.

---

## 2. Extracted Fields

The Local Logistic Agent may extract:

- task identifier;
- completion statement;
- files changed;
- commands run;
- validation status;
- skipped validation;
- risks;
- source_state;
- route_check;
- output_routing_result;
- status_by_surface;
- software_verdict;
- evidence_verdict;
- claim_verdict;
- claim_posture;
- claim overreach signals.

It must preserve uncertainty with `UNKNOWN`, absence with `NOT_FOUND`, and forbidden or unsafe action state with `BLOCKED`.

---

## 3. parsed_report Schema

```yaml
parsed_report:
  schema_version: "LOCAL_LOGISTIC_AGENT_PARSED_REPORT_V0"
  task_id: ""
  completed: "UNKNOWN"
  files_changed:
    - path: ""
      surface: "canonical_docs"
      change_status: "UNKNOWN"
      operation: ""
      summary: ""
  commands_run:
    - command: ""
      purpose: ""
      surface: "canonical_docs"
      result_status: "UNKNOWN"
      evidence: ""
  validation_status: "UNKNOWN"
  skipped_validation:
    - validation_item: ""
      surface: "canonical_docs"
      status: "UNKNOWN"
      reason: ""
  risks:
    - risk: ""
      surface: "canonical_docs"
      status: "UNKNOWN"
      mitigation: ""
  source_state:
    created: "UNKNOWN"
    registered: "UNKNOWN"
    loaded: "UNKNOWN"
    enforced: "UNKNOWN"
    evidenced: "UNKNOWN"
    rule: "created != registered != loaded != enforced != evidenced"
  route_check:
    status: "UNKNOWN"
    output_routing_required: "UNKNOWN"
    output_routing_present: "UNKNOWN"
    destination_allowed: "UNKNOWN"
    evidence: ""
  output_routing_result:
    produced_file_type: ""
    intended_surface: ""
    canonical_destination: ""
    temporary_destination: ""
    actual_destination: ""
    registration_required: "UNKNOWN"
    project_source_upload_required: "UNKNOWN"
    promotion_gate: "HumanGate"
  status_by_surface:
    active_runtime_code: "UNKNOWN"
    tests: "UNKNOWN"
    artifacts_runtime_outputs: "UNKNOWN"
    canonical_docs: "UNKNOWN"
    roadmap_docs_only: "UNKNOWN"
    inference: "UNKNOWN"
  software_verdict:
    active_runtime_code: "UNKNOWN"
    tests: "UNKNOWN"
    artifacts_runtime_outputs: "UNKNOWN"
    canonical_docs: "UNKNOWN"
    roadmap_docs_only: "UNKNOWN"
    inference: "UNKNOWN"
  evidence_verdict:
    active_runtime_code: "UNKNOWN"
    tests: "UNKNOWN"
    artifacts_runtime_outputs: "UNKNOWN"
    canonical_docs: "UNKNOWN"
    roadmap_docs_only: "UNKNOWN"
    inference: "UNKNOWN"
  claim_verdict:
    active_runtime_code: "UNKNOWN"
    tests: "UNKNOWN"
    artifacts_runtime_outputs: "UNKNOWN"
    canonical_docs: "UNKNOWN"
    roadmap_docs_only: "UNKNOWN"
    inference: "UNKNOWN"
  claim_posture: "NO_CLAIM_ALLOWED"
  claim_overreach_detected: "UNKNOWN"
  no_global_ready_verdict: true
```

---

## 4. Claim Overreach Detection

Set `claim_overreach_detected` to `BLOCKED` or flag a finding when an executor report claims any of the following without explicit HumanGate decision and supporting evidence:

- global ready status;
- Elo, strength, benchmark proof, scientific proof, model proof, or promotion;
- runtime activation;
- training completion;
- dataset generation, reset, or quality proof;
- model or checkpoint creation;
- model promotion;
- agent activation;
- Chess960 activation;
- DecisionController activation;
- commit, push, branch, or pull request completion when not explicitly authorized.

If no such claim is present, use `PASSIVE`. If the report is insufficient, use `UNKNOWN`.

---

## 5. Evidence Handling

Executor reports are evidence, not promotion.

The Local Logistic Agent may prepare synthesis for HumanGate only. It must not:

- edit repository files;
- run commands;
- validate code;
- run tests;
- run benchmarks;
- run training;
- generate datasets;
- promote models;
- activate agents;
- decide readiness;
- decide claim validity.

---

## 6. HumanGate Boundary

HumanGate decides:

- whether parsed evidence is accepted;
- whether tracking matrix candidates are applied;
- whether a next task is authorized;
- whether a file becomes registered, loaded, enforced, or evidenced project truth;
- whether any promotion, activation, merge, release, or claim is valid.

The Local Logistic Agent must keep recommendations bounded, surface-specific, and marked `PASSIVE` / `proposal_only`.
