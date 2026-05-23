# Studio Pro Query Router V0

## Purpose

Studio Pro Query Router V0 defines how the Studio may use ChatGPT Pro as an
external passive architecture and red-team reviewer without turning it into a
source of truth, execution authority, or automatic task generator.

The goal is to strengthen the simple pipeline:

```text
human words
-> Pro Query Packet
-> ChatGPT Pro response
-> local truth intake
-> local red-team review
-> patch-chain and guardrail analysis
-> HumanGate
-> bounded next step, if approved
```

This document is documentation only. It does not create scripts, agents,
workflow automation, API calls, browser automation, ChatGPT calls, Codex calls,
OpenAI calls, GitHub calls, runtime behavior, training, dataset generation,
benchmark logic, Git actions, or claim authority.

Default claim posture: `NO_CLAIM_ALLOWED`.

Default fallback: `UNKNOWN => BLOCKED`.

## Authority Boundary

ChatGPT Pro may be used for:

- architecture critique
- roadmap critique
- contradiction detection
- red-team analysis
- patch-chain risk analysis
- guardrail suggestions
- HumanGate question generation
- simplification and decomposition

ChatGPT Pro may not:

- validate repo truth
- validate runtime truth
- replace `MASTER_DOCS/`
- replace `docs/control-plane/`
- replace HumanGate
- approve Codex execution
- create TaskPackets as authority
- create patches
- stage, commit, push, branch, ready, merge, or open PRs
- activate runtime behavior
- train or fine-tune models
- generate or reset datasets
- run or claim benchmarks
- promote claims beyond `NO_CLAIM_ALLOWED`
- produce executable guidance for cyber-offense, surveillance, coercion,
  biometric identification, social scoring, military or police use, critical
  infrastructure control, public release, secret handling, personal data
  processing, or external system action

Pro output is advisory input only. It must be locally ingested, checked against
repo truth, reviewed for contradictions, and passed to HumanGate before any
bounded downstream work exists.

## Relationship To Existing Contracts

| Existing contract | Relationship |
| --- | --- |
| `PRO_REQUEST_INTAKE_CONTRACT_V0.md` | Receives Pro output as source material and preserves the original human words. |
| `TRUTH_PACKET_AND_CODEX_PACK_CONTRACT_V0.md` | Converts accepted source-backed framing into Truth Packet and Codex Pack candidates. |
| `PROMPT_AND_REPORT_HYGIENE_CONTRACT_V0.md` | Checks the Pro prompt and downstream reports for missing scope, output routing, blocked actions, and claims. |
| `LM_STUDIO_REVIEW_CONTRACT_V0.md` | Local Mistral/Devstral may red-team Pro output passively. |
| `PATCH_CHAIN_ANALYZER_CONTRACT_V0.md` | Reviews proposed patch sequences, ordering, dependencies, collisions, and guardrail risks. |
| `SOURCE_STATE_LEDGER_CONTRACT_V0.md` | Tracks whether Pro-derived concepts are created, registered, loaded, enforced, or evidenced. |
| `V2_REQUIREMENTS_TRACEABILITY_MATRIX_CONTRACT_V0.md` | Links human words, Pro response, local truth checks, HumanGate decisions, and evidence refs. |

The router is an orchestration contract over these surfaces, not a replacement.

## Pro Query Packet Shape

Use this shape before sending a request to ChatGPT Pro:

```yaml
pro_query_packet:
  query_id:
  human_words:
  question_to_pro:
  source_summaries:
  known_repo_truth:
  known_unknowns:
  allowed_use:
    - architecture critique
    - red-team
    - contradiction detection
    - patch-chain risk analysis
    - HumanGate questions
  forbidden_use:
    - truth validation
    - implementation claim
    - runtime activation
    - Codex execution
    - Git action
    - training
    - dataset generation
    - benchmark proof
  required_output:
    - integration_fit
    - contradictions
    - duplicated_authority_risks
    - red_team_failure_modes
    - patch_chain_risks
    - guardrails
    - HumanGate_questions
    - status_by_surface
    - claim_verdict: NO_CLAIM_ALLOWED
  no_global_ready_verdict: true
```

The packet must preserve the user's words. It may summarize repo truth, but it
must not tell Pro that summarized truth is complete unless local source state is
`loaded` and `evidenced`.

## Pro Response Intake Shape

After Pro responds, ingest it locally as:

```yaml
pro_response_intake:
  response_id:
  query_id:
  original_human_words:
  pro_response_source:
  local_source_state:
  extracted_claims:
  extracted_recommendations:
  extracted_patch_chain:
  extracted_guardrails:
  extracted_humangate_questions:
  unsupported_claims:
  contradictions_with_repo:
  contradictions_with_doctrine:
  duplicate_authority_risks:
  required_red_team_review:
  required_patch_chain_review:
  recommended_route:
  claim_posture: NO_CLAIM_ALLOWED
  no_global_ready_verdict: true
```

Unsupported claims are not errors to hide. They are first-class findings and
should usually produce `HOLD`, `BLOCKED`, or `ESCALATE_TO_HUMANGATE`.

## Strong Pipeline

```text
1. Human words captured.
2. Prompt hygiene checks the Pro Query Packet.
3. HumanGate approves sending the bounded query.
4. ChatGPT Pro returns passive critique.
5. Pro Request Intake preserves human words and extracts claims.
6. Local truth analysis checks sources, repo state, and doctrine.
7. Local red-team review attacks authority drift and failure modes.
8. Patch Chain Analyzer reviews order, collisions, dependencies, and scope.
9. Passive gate smoke / hygiene checks run when relevant.
10. HumanGate decides: reject, hold, split, register docs-only, or authorize a bounded TaskPacket candidate.
```

No step may skip HumanGate. No Pro response can directly become a patch, task,
claim, or truth source.

## Red-Team Layer

The red-team step must look for:

- Pro output treated as truth
- missing source anchors
- second source of truth
- duplicated control-plane
- silent replacement of existing contracts
- Codex autonomy leakage
- Git authority leakage
- runtime activation leakage
- model promotion leakage
- training or dataset leakage
- benchmark proof leakage
- broad patch chain hidden behind one task
- missing output routing
- missing validation
- false implementation or test claims
- erased human wording

Allowed red-team verdicts:

- `PASS`
- `HOLD`
- `BLOCKED`
- `SPLIT`
- `REORDER`
- `ESCALATE_TO_HUMANGATE`

## Patch Chain And Guardrail Rail

Any Pro suggestion that implies multiple edits must become a patch-chain review
before a TaskPacket candidate exists.

Patch-chain review must check:

- file collision risk
- order risk
- dependency risk
- owner surface per item
- validation per item
- output route per item
- forbidden path overlap
- hidden runtime/ML/search/neural work
- hidden dataset/training/benchmark work
- hidden Git action
- claim escalation
- whether the chain should split into deployment columns

Guardrails must include:

- `UNKNOWN => BLOCKED`
- `NO_CLAIM_ALLOWED`
- no global ready verdict
- HumanGate before Pro send when scope is ambiguous
- HumanGate after Pro intake before any packet
- local truth readback before accepting recommendations
- local red-team before patch-chain promotion
- output routing before file creation
- no autonomous loop
- security and responsible-use boundary readback before any Pro query touching
  legal-safety, cyber, surveillance, personal data, public release, external
  services, or infrastructure-control topics

## Automatic Blockers

Return `BLOCKED` when the flow includes:

- auto-querying Pro without HumanGate for ambiguous or file-producing work
- accepting Pro output as truth
- creating patches from Pro output directly
- launching Codex from Pro output directly
- runtime activation
- training or fine-tuning
- dataset generation or reset
- benchmark proof
- model promotion
- automatic branch, commit, push, PR, ready, or merge
- writing `latest.json`
- writing `lab/runs/RUN_*`
- replacing `MASTER_DOCS/`
- replacing `docs/control-plane/`
- overwriting `studio_review/`
- missing output route
- missing source state
- missing HumanGate question
- claim escalation beyond `NO_CLAIM_ALLOWED`
- any Pro output touching legal-safety, security, cyber, surveillance,
  coercion, biometric identification, social scoring, military or police use,
  personal data, public release, external services, or real-world systems
  unless it is routed as passive critique and held for HumanGate plus
  legal/security review

## Security And Misuse Stop Rule

If a Pro response asks the Studio to produce actionable instructions, code,
agents, datasets, workflows, or automation for cyber-offense, surveillance,
coercion, biometric identification, social scoring, military or police use,
critical infrastructure control, credential handling, secret extraction,
external system action, or unsafe public release, the response must be treated
as `BLOCKED`.

Allowed handling is limited to:

- record the blocked topic
- preserve the human words
- cite the responsible-use boundary
- ask HumanGate whether the topic should be rejected, narrowed to harmless
  creative tooling, or routed to a separate legal/security review
- do not create a TaskPacket, Codex Pack, patch chain, runtime task, dataset
  task, training task, release task, or agent task

This stop rule is not legal advice and does not claim compliance. It is a
Studio safety boundary that prevents Pro output from becoming an implementation
path for misuse.

## Status By Surface

| Surface | Status | Boundary |
| --- | --- | --- |
| active_runtime_code | BLOCKED | Pro routing cannot authorize runtime work. |
| tests | UNKNOWN | This contract defines review flow; it does not run tests. |
| artifacts_runtime_outputs | BLOCKED | No run folder, latest output, dataset, benchmark, or lab artifact is authorized. |
| canonical_docs | DOCUMENTED_ONLY | This is a control-plane routing contract, not canonical truth. |
| roadmap_docs_only | DOCUMENTED_ONLY | Pro outputs can become roadmap material only after intake and HumanGate. |
| inference | PASSIVE | Pro and local models critique only; they do not decide. |
| local_review_stack | PASSIVE | Mistral/Devstral red-team is advisory only. |
| control_plane | DOCUMENTED_ONLY | This contract coordinates existing passive checks. |
| git_authority | BLOCKED | No branch, commit, push, PR, ready, or merge authority. |
| training_authority | BLOCKED | No training, LoRA, or fine-tuning authority. |
| dataset_authority | BLOCKED | No dataset generation or reset authority. |
| benchmark_authority | BLOCKED | No benchmark proof authority. |

## Verdicts

software_verdict: CONTROL_PLANE_PRO_QUERY_ROUTER_DOCS_ONLY

evidence_verdict: ROUTING_CONTRACT_ONLY

claim_verdict: NO_CLAIM_ALLOWED

no_global_ready_verdict: true
