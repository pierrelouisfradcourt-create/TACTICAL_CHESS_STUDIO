# Automation And Evidence Plane

Status: master planning document  
Date: 2026-05-06
Scope: automation workflow, evidence governance, Codex/GPT audit loop, repair loop, decision packets, dry-run runtime packets, non-canonical gameplay observation automation, manual Codex loops, local verification/reporting, PR60 audit state, and PR sequencing
Rule: this document controls workflow direction. It does not create scientific evidence and does not authorize engine, neural, benchmark, dataset, Supabase, or n8n runtime claims.

---

## 0. 2026-05-07 Automation Guard Consolidation

The guard lane is now consolidated through PR #138.

Guard milestone mapping:

- PR68 (`PR #127`): initial `auto_merge_guard` introduction.
- PR68B (`PR #130`): `gh --repo` context fix.
- PR68C (`PR #131`): passive-boundary false-positive fix.
- PR72 (`PR #134`): self-modification hardening.
- PR73 (`PR #135`): verdict/check policy hardening.
- PR75 (`PR #138`): forensic auto-merge evidence comment.

Current guard policy interpretation:

- Any skipped check blocks auto-merge.
- Any missing or invalid verdict block auto-merge.
- `software_verdict`, `evidence_verdict`, and `claim_verdict` are policy-gated in PR body parsing.
- Protected control-plane scripts require manual review and manual merge.
- Guard-performed merges should emit the forensic marker comment `AUTO_MERGED_BY_GUARD`.
- Passive boundary PRs are the intended auto-merge scope when all gates pass.

---

## 1. Purpose

The project has two parallel tracks that must remain separate:

```text
Track A - chess / AI / product runtime
  engine, search, neural, datasets, Chess960, tactical core, cards/effects

Track B - evidence plane / automation
  trust root, CI, immutable runs, parser, gates, audits, repair loop, decision packets, dry-run runtime packets, non-canonical observation, manual loop control, claim control
```

Track B remains priority because Track A cannot be trusted at speed without mechanical evidence.

The goal is not to make Codex "smarter". The goal is to stop making Codex the judge of its own work.

Core operating model:

```text
Codex implements
scripts and CI verify mechanically
GPT critiques / routes only
human decides merge / reject / freeze / promotion / claim scope
```

---

## 2. Source Inputs

This document consolidates the 2026-05-03 workflow discussions and repo state.

Relevant conversation/source surfaces:

```text
C:\Users\wazou\Desktop\chatimpleautoworkflow.txt
ChatGPT - Workflow automatise labo
ChatGPT - Deploiement TacticalChessPureLab
ChatGPT - Non-neural micro gameplay
codex_dev_plan_synthesis_2026-05-03.md
```

Interpretation rule:

- external chats are useful inputs;
- repo code, committed artifacts, and `MASTER_DOCS` remain the durable truth;
- browser ChatGPT audit can help human judgment, but it is not canonical evidence unless its result is captured in a repo artifact with explicit status.

---

## 3. Role Separation

| Actor | Role | Authority |
| --- | --- | --- |
| Codex worker | implement bounded task | no merge authority, no scientific claim authority |
| Local scripts | run validation and produce reports | mechanical PASS/FAIL/UNCERTAIN only |
| GitHub CI | block obvious bad diffs | mechanical checks only, not scientific evidence |
| GPT-5.5 audit | independent critical review | non-binding critique/routing only, no merge authority, no BLOCKED override, no claim-scope increase |
| Human | merge/reject/freeze/promote/claim decision | final decision authority |
| Supabase/no-code cockpit | registry, cockpit, decision log, surface tracker | later work; not current implementation, not evidence, not promotion authority |
| n8n | fail-closed orchestration entry | dispatch/control only, not evidence |

Forbidden role collapse:

```text
Codex writes code and declares its own work validated beyond mechanical checks.
CI passes and someone treats it as scientific evidence.
latest.json points somewhere and someone treats the pointer as evidence.
browser audit replaces canonical evidence.
MERGE_DECISION is treated as CLAIM_DECISION.
dry-run runtime packet is treated as runtime evidence.
```

---

## 4. Current Evidence-Plane Timeline

Observed repo history through PR60 / #119 (historical baseline):

| Commit / PR | Meaning |
| --- | --- |
| `b15013b6` / PR-00A | bootstrap trust root policies |
| `aa22b284` / PR-00B | no-code / Supabase trust root spec |
| `d7f03f5e` / PR-00C | n8n fail-closed entry workflow spec |
| `bb572255` | merge PR-01 canonical mechanical CI into `main` |
| PR-02 | add immutable run bundle contract |
| PR-03 | add mechanical parser plus three verdicts |
| PR-04 | add input boundary and tampering gate |
| PR #52 / PR-05 | add claim/data gates |
| `063927f4` / PR-06 | wire evidence-plane gates into CI example-mode |
| `95e53752` / PR #55 / PR-07 | add GPT-5.5 structured audit scaffold |
| PR #56 | post-PR07 docs/status cleanup |
| PR #57 / PR-08 | add limited repair-loop contract and validator |
| PR #58 / PR-09 | add human governance / decision-packet contract |
| PR #59 / PR-10 | add runtime dry-run packet harness |
| PR-14 through PR-21 | add non-canonical gameplay observation automation chain |
| PR #80 / PR-22 | execute first manual non-canonical Codex loop, prompt index 0 |
| PR #81 / PR-23 | add local workspace hygiene guardrails |
| PR #82 / PR-24 | execute second manual non-canonical Codex loop, prompt index 1 |
| PR #83 / PR-25 | execute third manual non-canonical Codex loop, prompt index 2 |
| PR #103 / PR-45 | add core minimal identity scaffolding |
| PR #115 / PR-57 | add LegalAction adapter scaffold |
| PR #116 | stale draft docs sync (historical; later closed) |
| PR #117 / PR-58 | add passive DecisionTrace bridge |
| PR #118 / PR-59 | add local agent session report; keep but fix later |
| PR #119 / PR60 | add push and automation cleanup audit |

Historical PR60 automation posture:

```text
PR-02 through PR-10:
evidence-plane/control foundation

PR-14 through PR-21:
non-canonical gameplay observation automation chain

PR-22, PR-24, PR-25:
manual non-canonical Codex loops for prompt indices 0, 1, and 2

PR-23:
local workspace hygiene guardrails

PR-56 through PR-60:
local verifier, telemetry smoke, session report, and audit control-plane surfaces

current_status:
CONTROL_PLANE_PARTIAL_NOT_FINISHED

claim_verdict: NO_CLAIM_ALLOWED
```

PR-07 is a local audit scaffold only. It does not call the OpenAI API, wire live GPT audit, authorize merge, authorize promotion, authorize claims, establish truth, override BLOCKED, or increase claim scope.

PR-08 is a repair-loop control surface only. It does not execute real repairs or allow Codex to modify policy, gates, metrics, tests, holdout, or other thermometer surfaces in a repair loop.

PR-09 is a governance contract only. It preserves `MERGE_DECISION != CLAIM_DECISION` and keeps human authority explicit.

PR-10 is a dry-run runtime packet harness only. It is not a real runtime evidence bundle, not a benchmark, not a promotion surface, and not a strength claim.

PR-14 through PR-21 add a non-canonical gameplay observation automation chain only:

- observation surface
- triage
- Codex task queue
- prompt pack
- execution packet
- execution result intake
- orchestration smoke
- automation status report

PR-22, PR-24, and PR-25 executed manual non-canonical Codex loops for prompt indices 0, 1, and 2. PR-23 added local workspace hygiene guardrails.

PR-59 adds a useful local session report, but it is not enough for finished automation. Its `recommended_next_action` is a recommendation, not a validated action packet with bounded write scope, safety gates, and human decision surface.

PR60 audits the push/PR/control-plane state after #117 and #118. It recorded PR #116 as stale draft at that time, PR-59 as `KEEP_BUT_FIX_LATER`, automation as partial control-plane, and AAA/Hybrid as partial scaffolding only.

The current automation status is partial control-plane scaffolding, not autonomous roadmap execution.

None of the automation/control-plane PRs creates canonical evidence, benchmark evidence, promotion authority, Elo or strength claims, or scientific claims.

Live GPT, n8n, Supabase, and full autonomous orchestration remain later work, not current implementation.

---

## 5. PR Sequence

### Phase 0 - Hybrid trust root

Completed in repo history:

```text
PR-00A - Trust root repo
PR-00B - Trust root no-code / Supabase spec
PR-00C - n8n fail-closed entry workflow spec
PR-01  - canonical mechanical CI
```

Meaning:

- policies and boundaries exist;
- no-code surfaces are defined as cockpit/orchestration only;
- canonical CI adds mechanical checks;
- none of this demonstrates engine strength.

### Phase 1 - Mechanical evidence/control foundation

Completed evidence-plane/control foundation:

```text
PR-02 - immutable RUN_ID bundle contract
PR-03 - mechanical parser + three verdicts
PR-04 - input boundary + tampering gate
PR-05 - claim/data gates
PR-06 - evidence-plane gates wired into CI example-mode
```

Structured audit and automation-control layers added after the early foundation:

```text
PR-07 - GPT-5.5 structured audit scaffold
PR-08 - limited repair-loop contract and validator
PR-09 - human governance / decision-packet contract
PR-10 - runtime dry-run packet harness
```

Non-canonical gameplay observation automation chain:

```text
PR-14 - observation surface
PR-15 - triage
PR-16 - Codex task queue
PR-17 - prompt pack
PR-18 - execution packet
PR-19 - execution result intake
PR-20 - orchestration smoke
PR-21 - automation status report
```

Manual non-canonical Codex loops and local hygiene:

```text
PR-22 - prompt index 0 manual loop
PR-23 - local workspace hygiene guardrails
PR-24 - prompt index 1 manual loop
PR-25 - prompt index 2 manual loop
```

Later local control-plane and runtime scaffolding state:

```text
PR-58 / #117 - passive DecisionTrace bridge only
PR-59 / #118 - local agent session report, KEEP_BUT_FIX_LATER
PR60 / #119 - push and automation cleanup audit
```

PR #116 was a stale draft docs sync and has since been closed. It is not part of current `main`.

The three verdicts are the spine:

```json
{
  "software_verdict": "PASS|FAIL|BLOCKED|UNCERTAIN|NOT_RUN",
  "evidence_verdict": "COMPLETE|INCOMPLETE|INVALID|CORRUPT|CONTAMINATED|UNCERTAIN|CONTRACT_ONLY|BOOTSTRAP_ONLY",
  "claim_verdict": "NO_CLAIM_ALLOWED|HEALTH_ONLY|TARGETED_BEHAVIOR_ONLY|EXPLORATORY_ONLY|PROMOTION_REVIEW_CANDIDATE|STRENGTH_CLAIM_CANDIDATE"
}
```

Default posture remains:

```text
claim_verdict: NO_CLAIM_ALLOWED
```

---

## 6. PR-02 Doctrine

PR-02 defines the immutable run bundle contract only.

Allowed area:

```text
lab/run_contracts/
```

PR-02 must not:

- create true scientific runs;
- create `lab/runs/RUN_*`;
- create `lab/runs/latest.json`;
- run benchmarks;
- modify engine/search/neural/runtime code;
- modify tests;
- modify CI;
- modify datasets;
- modify policy lock files;
- make scientific, Elo, strength, neural, search, promotion, or benchmark claims.

Core rule:

```text
PR-02 defines a contract for future immutable run bundles.
It does not create scientific evidence.
It does not authorize claims.
```

`latest.json` rule:

```text
latest.json may be a pointer only.
latest.json is never evidence.
latest.json must be rebuildable.
latest.json must not contain metrics, conclusions, or verdict authority.
```

Example rule:

```text
Examples belong in lab/run_contracts/example_run_bundle_contract_only/
Examples must never live in lab/runs/
```

---

## 7. PR-03 To PR-25 Direction

PR-03 made the PR-02 contract mechanically parseable.

PR-04 protects input boundaries and tampering surfaces.

PR-05 protects claim and data language.

PR-06 wires the evidence-plane parser/gates into canonical CI example-mode.

Primary goal:

```text
bad or incomplete runs fail closed
```

Blocked claim language includes wording that implies:

```text
run-level certainty beyond the recorded bundle
improvement claims from incomplete evidence
benchmark validation beyond the declared protocol
promotion readiness
strength or Elo improvement
search or neural improvement
conversion evidence being treated as strength evidence
CI correctness beyond mechanical validation
latest-pointer evidence
scientific evidence
```

Allowed low-claim language:

```text
health check passed
contract-only
mechanical checks only
targeted behavior observed
exploration only
no claim allowed
```

---

## 8. PR-08 Repair Loop Direction

PR-08 adds a limited repair-loop contract and validator.

Core rule:

```text
Codex must never modify the thermometer in a repair loop.
```

Repair loop constraints:

```text
max_repair_loops <= 2
fail_closed = true
human_review_required = true
claim_verdict = NO_CLAIM_ALLOWED by default
```

Forbidden repair-loop surfaces include:

```text
tests/
.github/workflows/
scripts/check_*.py
scripts/*gate*.py
scripts/parse_run_bundle.py
scripts/check_input_boundary.py
scripts/check_claim_data_gates.py
schemas/
lab/policies/
lab/claim_registry/
lab/metric_registry/
lab/data_ledger/
lab/split_manifests/
lab/surfaces/
lab/registry_events/
holdout/
protocol.lock.json
```

---

## 9. PR-09 Decision Packet Direction

PR-09 adds human governance / decision-packet contracts.

Core rule:

```text
MERGE_DECISION != CLAIM_DECISION
```

A merge decision may accept a governance/control PR into `main`. It does not create scientific evidence, does not authorize promotion, and does not increase claim scope.

A claim decision must remain explicit, typed, and human-controlled.

Codex, GPT-5.5, and CI cannot decide claim authority.

---

## 10. PR-10 Runtime Dry-Run Direction

PR-10 adds the first runtime-facing dry-run packet harness under evidence-plane gates.

It uses one theme only:

```text
dry_run_runtime_validation_harness
```

A PR-10 dry-run packet must:

- be non-destructive;
- avoid holdout access;
- avoid dataset reset;
- avoid real `RUN_*` bundle creation;
- avoid `latest.json` updates;
- use a non-canonical sandbox output location;
- keep Codex, GPT-5.5, and CI from authorizing claims;
- require human review;
- keep claim scope at `NO_CLAIM_ALLOWED` unless a future human claim decision explicitly allows `HEALTH_ONLY`.

Do not interpret PR-10 dry-run packets as:

- benchmark evidence;
- promotion evidence;
- strength evidence;
- Elo evidence;
- search improvement evidence;
- neural improvement evidence;
- AAA validation.

---

## 11. Codex Work Unit Contract

Every Codex implementation task should be bounded:

```text
1 task = 1 branch
1 branch = 1 diff
1 diff = 1 report
1 report = PASS / FAIL / UNCERTAIN
```

Batching is allowed when coherent:

```text
1 batch = 1 theme
1 batch = multiple commits if needed
1 batch = 1 PR
1 PR = 1 report
```

Required final report:

```text
Objective:
Modified files:
Diff summary:
Commands run:
Command results:
Skipped validation and reason:
Behavior risk:
Evidence risk:
Claim risk:
Repair-loop or governance risk:
Verdict: PASS / FAIL / UNCERTAIN
```

Forbidden:

- saying PASS if a required command was not run;
- saying PASS if a required command failed;
- hiding skipped validation;
- merging broad engine + neural + dataset changes into one branch;
- interpreting one benchmark as scientific evidence.

---

## 12. Parallel Worktree Model

Parallel work is allowed only when write scopes are separate.

Recommended worktree pattern:

```powershell
git worktree add ../tcs-validation -b codex/validation
git worktree add ../tcs-conversion -b codex/conversion
git worktree add ../tcs-docs -b codex/docs
git worktree add ../tcs-search-nonconverting -b codex/search-nonconverting
```

Good parallel lanes:

- docs;
- audit scripts;
- conversion suite analysis;
- benchmark reporting;
- validation parser work.

Dangerous parallel lanes:

- `src/engine/engine.rs`;
- `src/chess/search.rs`;
- `src/agents/neural_agent.rs`;
- `ml/train.py`;
- dataset reset/regeneration;
- benchmark runner semantics.

---

## 13. Long-Term Architecture Alignment

This automation plan must serve the long-term architecture, not replace it.

Relevant long-term documents:

```text
MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md
MASTER_DOCS/AAA_TACTICAL_CORE_ARCHITECTURE.md
MASTER_DOCS/03_KNOWN_ISSUES.md
MASTER_DOCS/09_ROCKY_VARIANT_FREEZE.md
MASTER_DOCS/02_ROADMAP_90D.md
```

Relationship:

```text
Evidence-plane PR-02 -> PR-06
  completes the minimal foundation for auditable future changes

Evidence-plane PR-07 -> PR-10
  adds audit, repair-loop, decision-packet, and dry-run packet control surfaces

Non-canonical automation PR-14 -> PR-21
  adds descriptive gameplay observation, triage, task queue, prompt pack, execution packet, result intake, orchestration smoke, and status reporting

Manual non-canonical loops PR-22, PR-24, PR-25
  execute prompt indices 0, 1, and 2 with human-reviewed scope

Workspace hygiene PR-23
  adds local workspace hygiene guardrails

Hybrid roadmap Phase 0 -> Phase 18
  controls implementation order for engine/search/neural/training/evaluation

AAA tactical core architecture
  controls long-term product/runtime destination
```

The evidence-plane/control foundation is complete through PR-10. Automation governance/control surfaces now extend through PR #138 and remain policy-gated and partial. The full Research OS V9.2 is still not complete.

PR-02 through PR-10 are now baseline controls for later Track A work. They still do not replace benchmark evidence, promotion review, or human claim authority.

PR-14 through PR-25 add non-canonical descriptive observation and manual-loop scaffolding only. PR-56 through PR60 add local verification, telemetry, session-report, and audit control-plane surfaces. They do not create canonical evidence, benchmark evidence, promotion authority, Elo or strength claims, or scientific claims.

In particular:

- stable `ActionId` and deterministic legal actions come before dataset reset;
- telemetry comes before training claims;
- evaluation comes before League;
- generic tactical core grows beside chess, not by deleting chess;
- Chess960 remains future/experimental unless a dedicated implementation branch activates it with tests.

---

## 14. Browser GPT-5.5 Use

Browser GPT-5.5 is useful for:

- reading a PR;
- summarizing risk;
- checking whether a Codex report is internally coherent;
- preparing an audit prompt;
- helping the human decide whether a formal audit is needed.

Browser GPT-5.5 is not:

- canonical evidence;
- a mechanical validator;
- merge authority;
- promotion authority;
- authority to validate a benchmark;
- authority to decide that an audit finding is true;
- a BLOCKED override;
- a claim-scope escalator.

Correct separation:

```text
Official evidence
  RUN_ID bundle + hashes + machine_verdict + CI + stored audit artifact

Browser assistance
  human-readable critical review, useful but non-canonical unless captured explicitly
```

---

## 15. Immediate Next Steps

Current next steps after PR #138:

```text
docs/control-plane cleanup
then PR-59 output semantics fix
then bounded runtime/search/neural work only under evidence-plane gates
```

Allowed next runtime-under-gates themes:

```text
A. passive InitialStateFactory boundary for 960-readiness prep
B. conversion benchmark discipline
C. search behavior in non-converting positions
D. conversion row semantic cleanup
```

Recommended first runtime theme:

```text
A. passive InitialStateFactory boundary for 960-readiness prep
```

Reason:

```text
It extends passive extraction safely while preserving active runtime authority.
```

Before any future claim-bearing work:

```text
Use PR-02 through PR-10 controls.
Create or inspect a valid evidence bundle.
Keep claim_verdict scoped to what the bundle actually supports.
Preserve human authority for merge, freeze, promotion, and claim decisions.
```

Rocky/runtime observation and dataset-safety guidance is documented in `docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md`; it is observation/evidence guidance only and does not create dataset, runtime, benchmark, or claim authority.

Do not treat the completed evidence-plane foundation, PR-07 audit scaffold, PR-08 repair-loop validator, PR-09 decision packets, PR-10 dry-run packets, or PR-14 through PR-25 non-canonical automation/manual loops as scientific evidence. They are governance, validation, descriptive observation, and manual-loop infrastructure.
