# Chess960 CampaignPlan Draft V0

Issue scope: `#232 - Chess960 CampaignPlan Draft`

This document is a docs-only control-plane planning artifact for Chess960 implementation sequencing. It converts the Rocky / Chess960 read-only audit into a CampaignPlan, PRQueue draft, Director review map, Specialist review map, HumanGate checklist, blocker policy, local-first validation policy, and next-decision packet.

It does not implement Chess960. It does not authorize runtime edits, FEN edits, castling implementation, search changes, neural changes, ML changes, benchmark runs, readiness claims, PR ready actions, merge actions, or claim escalation.

## Source Evidence Freeze

STAGE 0 - Evidence freeze:

- Current evidence source is a source-only/read-only audit.
- No runtime validation proof was produced by the audit.
- Chess960 generator code exists and is tested in isolation.
- Chess960 is not wired into runtime gameplay.
- Runtime gameplay remains classical.
- Castling runtime is classical-only.
- FEN castling rights are classical-only through `KQkq` assumptions.
- Initial setup has classical assumptions.
- Search mostly consumes legal moves, but variant metadata is not part of runtime state or keying.
- Neural/Rocky bridge validates against Rust legal moves, but Python ML/data paths have no Chess960 variant contract.
- Rocky appears mainly as pipeline, docs, and orchestration direction, not as a distinct runtime module.
- `claim_verdict` remains `NO_CLAIM_ALLOWED`.

Evidence boundary:

- This CampaignPlan is planning evidence only.
- It is not runtime evidence.
- It is not gameplay evidence.
- It is not benchmark evidence.
- It is not proof of Chess960 readiness.
- It is not proof that Rocky is Chess960-ready.

Rocky runtime boundary note:

- Rocky is a product/runtime actor and data producer only. Rocky may play games, produce traces, and emit match outputs. Rocky is not a studio agent, not a reader, not an analyst, not a director, not StudioPilot, and not HumanGate.
- Rocky output may be normalized into `ROCKY_MATCH_SUMMARY` or equivalent match summaries. These summaries are context records only. They do not tune Rocky, mutate rules, prove strength, authorize claims, promote variants, or activate future readers.
- A future explanation surface may verbalize Rocky decision traces. That surface is separate from Rocky, non-authoritative, and cannot modify runtime, rules, claims, PR state, roadmap, or HumanDecision.
- Rocky batch match production means gameplay execution that emits match data. It is not an autonomous tester, not an analyst, and not a control-plane actor.
- All interpretation, promotion, claim, merge, roadmap, readiness, and activation decisions remain outside Rocky and require HumanGate / HumanDecision.

## CampaignPlan

campaign_id: `CHESS960-CAMPAIGNPLAN-DRAFT-V0`

campaign_title: `Chess960 implementation campaign planning`

campaign_status: `DRAFT_PLANNING_ONLY`

parent_objective: prepare a safe, human-gated implementation path for Chess960 without touching runtime, FEN, castling, search, neural, ML, benchmarks, datasets, tests, workflows, or generated run outputs in this patch.

allowed_paths_for_this_patch:

- `docs/control-plane/`
- `MASTER_DOCS/`

forbidden_paths_for_this_patch:

- `src/`
- `ml/`
- `tests/`
- `benches/`
- `lab/runs/`
- `lab/datasets/`
- `.github/`
- scripts that call external APIs
- runtime, search, neural, gameplay, benchmark, workflow, training, dataset, or generated-output paths

campaign_goals:

- Formalize the Chess960 planning sequence before implementation.
- Make the next human decision easy and explicit.
- Preserve Rocky classical behavior as current runtime truth.
- Preserve Chess960 as future/experimental until a later approved runtime/test patch exists.
- Keep HumanGate mandatory for each future implementation boundary.
- Keep `NO_CLAIM_ALLOWED` mandatory.

campaign_non_goals:

- No Chess960 gameplay implementation.
- No runtime integration.
- No FEN contract mutation.
- No castling implementation.
- No search or repetition/keying mutation.
- No neural bridge mutation.
- No ML, training, inference, or policy indexing mutation.
- No benchmark runs.
- No benchmark, strength, promotion, production-readiness, or scientific claims.

## Stage Plan

### STAGE 0 - Evidence Freeze

Purpose: preserve the audit boundary before implementation planning expands.

Required evidence:

- Read-only audit summary.
- Explicit statement that no runtime validation proof exists.
- Explicit `NO_CLAIM_ALLOWED` posture.

Exit criteria:

- Human accepts the audit as planning input only.
- No implementation work is authorized by this stage.

Blocked if:

- Any claim says Chess960 is implemented.
- Any claim says Rocky is Chess960-ready.
- Any runtime, ML, benchmark, or workflow edit appears in this docs-only patch.

### STAGE 1 - Engine Impact Map

Purpose: identify runtime files, classical assumptions, and first safe implementation seams.

Required focus:

- Initial setup assumptions.
- Castling assumptions.
- FEN assumptions.
- Legal move generation assumptions.
- Search/repetition/keying assumptions.
- Runtime state and variant metadata assumptions.

Allowed future output:

- Docs-only or read-only impact map.

Forbidden during this stage:

- Runtime edits.
- FEN contract edits.
- Castling implementation.
- Search edits.
- Test additions unless separately approved by HumanGate.

Recommended next PR title:

- `Engine Chess960 Impact Map`

### STAGE 2 - Rocky Impact Map

Purpose: identify Rocky, neural bridge, Python ML, policy, data, and orchestration implications.

Required focus:

- Rust neural bridge payload and legal-move validation.
- Python inference and tensorization assumptions.
- Dataset loader and policy-indexing assumptions.
- Orchestration and telemetry assumptions.
- Whether future compatibility is legal-mask-only, retraining, or a separate variant contract.

Allowed future output:

- Docs-only or read-only impact map.

Forbidden during this stage:

- ML edits.
- Training edits.
- Inference changes.
- Dataset generation.
- Policy indexing changes.
- Neural readiness claims.

Recommended next PR title:

- `Rocky Chess960 Impact Map`

### STAGE 3 - PatchPlan Approval

Purpose: convert impact maps into a human-approved patch plan.

Required HumanGate decision:

- Select exact first runtime/test candidate.
- Confirm allowed paths.
- Confirm forbidden paths.
- Confirm validation budget.
- Confirm director reviews required before execution.
- Confirm claim boundary remains `NO_CLAIM_ALLOWED`.

No implementation is allowed before this approval.

Recommended next PR title:

- `Chess960 PatchPlan Approval`

### STAGE 4 - First Tiny Runtime/Test Patch

Purpose: execute the smallest approved runtime/test step after HumanGate.

Preferred safe direction:

- `CH960-P1-SETUP-TESTS`
- `CH960-P2-PASSIVE-INITIAL-STATE-FACTORY`

Do not start with:

- FEN contract edits.
- Castling runtime.
- Search changes.
- Neural bridge changes.
- ML/training changes.
- Policy indexing changes.

Recommended next PR title:

- `First tiny Chess960 runtime/test patch`

## PRQueue Draft

The queue is planning state only. It does not create branches, call Codex, call GitHub, call OpenAI, mark ready, merge, or mutate repository files.

| queue_order | pr_candidate_id | title | type | status | dependencies | risk | HumanGate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | `#232` | Chess960 CampaignPlan Draft | DOCS_ONLY | CURRENT | none | LOW | YES |
| 1 | `#233` | Engine Chess960 Impact Map | READ_ONLY | QUEUED | `#232` | MEDIUM | YES |
| 2 | `#234` | Rocky Chess960 Impact Map | READ_ONLY | QUEUED | `#232` | HIGH | YES |
| 3 | `#235` | Chess960 PatchPlan Approval | DOCS_ONLY | QUEUED | `#233`, `#234` | HIGH | YES |
| 4 | `#236` | First tiny runtime/test patch | RUNTIME_OR_TESTS | HELD | `#235` | HIGH | YES |

Queue policy:

- `current_index`: `0`
- `queue_verdict`: `GO_PLANNING`
- `auto_ready_allowed`: false
- `auto_merge_allowed`: false
- `auto_pr_creation_allowed`: false
- `claim_verdict`: `NO_CLAIM_ALLOWED`
- `learning_event_required_on_block`: true

## First Safe Candidate Guidance

Preferred first implementation candidates after planning:

- `CH960-P1-SETUP-TESTS`: targeted setup tests only, after HumanGate approves test scope.
- `CH960-P2-PASSIVE-INITIAL-STATE-FACTORY`: passive initial-state factory only, after HumanGate approves runtime scope.

Hold candidates:

- `CH960-P3-FEN-CONTRACT`: hold until rules contract is reviewed and approved.
- `CH960-P4-CASTLING-RUNTIME`: hold until FEN/castling contract and tests are approved.

Blocked-for-now candidates:

- Search changes.
- Neural bridge changes.
- ML/training changes.
- Policy indexing changes.
- Benchmark claims.
- Chess960 readiness claims.

## Risk Register

| area | risk | current planning evidence | required gate |
| --- | --- | --- | --- |
| initial setup | MEDIUM | Generator exists, but runtime setup remains classical | Architecture and Runtime review |
| castling | HIGH | Classical-only castling runtime assumptions | FEN/castling contract approval |
| FEN contract | HIGH | Current rights model assumes `KQkq` | Rules, Architecture, Evidence review |
| legal move generation | HIGH | Castling path is classical even if ordinary moves are board-state based | Runtime and QA review |
| search/repetition/keying | MEDIUM | Search consumes legal moves, but variant metadata is not keying state | Search and Architecture review |
| neural/Rocky bridge | HIGH | Bridge masks to Rust legal moves, but no Chess960 variant contract exists | Runtime, ML, Evidence review |
| ML/data/policy indexing | HIGH | Python data/inference paths have no Chess960 contract | ML and Data review |
| tests | HIGH | No Chess960 integration tests exist yet | QA review |
| docs/governance | LOW | Control-plane doctrine exists | Governance review |

## Director Review Requirements

### RESOURCE_DIRECTOR

responsibility: confirm compute, validation cost, local-first policy, and no benchmark/training budget activation.

required evidence:

- Planned validation commands.
- Confirmation that no benchmark, training, dataset generation, or cloud compute is required.
- Confirmation that `#236` does not start without bounded budget and HumanGate.

GO criteria:

- Validation is cheap and local.
- No sustained compute is required.
- No benchmark or training budget is activated.

HOLD criteria:

- Validation cost is unclear.
- Runtime/test scope implies longer execution than approved.

BLOCKED criteria:

- Benchmark, training, external service, or paid compute appears without explicit HumanGate.

claim constraints:

- Resource health does not support strength, readiness, or performance claims.

### ARCHITECTURE_DIRECTOR

responsibility: own runtime architecture, variant metadata boundaries, FEN/castling sequencing, and search/keying implications.

required evidence:

- Engine impact map.
- Variant metadata assumptions.
- Castling/FEN contract proposal before implementation.
- Search/repetition/keying impact notes.

GO criteria:

- First patch is narrow and does not cross uncontrolled runtime surfaces.
- FEN/castling/search sequencing is explicit.

HOLD criteria:

- Runtime files are identified but coupling is unresolved.

BLOCKED criteria:

- Patch starts castling, FEN, or search mutation before contract approval.

claim constraints:

- Architecture approval is not Chess960 readiness.

### PRODUCT_GAME_DIRECTOR

responsibility: preserve Rocky classical default, Chess960 future/experimental framing, and game-rule intent.

required evidence:

- User-facing variant status.
- Rules intent for Chess960 castling and setup.
- Default-classical preservation statement.

GO criteria:

- Classical remains active/default.
- Chess960 remains future/experimental until implementation and tests exist.

HOLD criteria:

- Variant status or UX exposure is ambiguous.

BLOCKED criteria:

- Patch implies user-facing Chess960 availability before implementation.

claim constraints:

- No product readiness, launch readiness, or gameplay support claim.

### QUALITY_DIRECTOR

responsibility: define local-first validation, missing test inventory, and blocker criteria.

required evidence:

- Test gap list.
- Targeted validation commands.
- Scope check results.

GO criteria:

- Validation matches patch scope.
- Forbidden validation is excluded.
- Missing tests are named without pretending they exist.

HOLD criteria:

- Test scope is too broad or underdefined.

BLOCKED criteria:

- Full cargo suite, benchmarks, training, or runtime tests are used as proof without approval.

claim constraints:

- Passing docs validation is docs health only.

### MEMORY_EVIDENCE_DIRECTOR

responsibility: preserve evidence boundaries, LearningEvent hygiene, claim language, and audit trace.

required evidence:

- Source audit references summarized as planning evidence.
- `NO_CLAIM_ALLOWED` present.
- LearningEvent trigger policy for blocked or scope-violating future work.

GO criteria:

- Evidence is described as source-only/read-only.
- Claims are explicitly denied.

HOLD criteria:

- Evidence source is ambiguous.

BLOCKED criteria:

- Claim scope escalates beyond `NO_CLAIM_ALLOWED`.

claim constraints:

- No evidence in this campaign authorizes strength, promotion, scientific proof, benchmark proof, production readiness, or Chess960 readiness.

## Specialist Review Requirements

Each Specialist is advisory only. Specialists do not self-assign, execute, merge, mark ready, call external APIs, run benchmarks, train models, weaken HumanGate, weaken `NO_CLAIM_ALLOWED`, or expand their own authority.

| specialist | scoped role | allowed review area | forbidden actions | expected output | HumanGate dependency |
| --- | --- | --- | --- | --- | --- |
| Runtime/Rust Specialist | Identify Rust runtime assumptions | Engine setup, castling, FEN, legal moves, search keying | Runtime edits, broad refactor, benchmarks | Impact notes and first-safe-candidate risks | Required before runtime/test patch |
| ML/Python Specialist | Identify ML and inference assumptions | Python tensorization, inference, legal mask, policy vocab, datasets | ML edits, training, dataset generation, inference runs | Rocky/ML impact notes | Required before ML or neural work |
| Game Design Specialist | Clarify rules and UX intent | Chess960 setup, castling semantics, variant status | Runtime rule mutation, launch claims | Rules-intent memo | Required before FEN/castling contract |
| Balance/Simulation Specialist | Protect simulation and benchmark boundaries | Future validation shape only | Benchmark runs, performance claims, simulation claims | Non-benchmark validation warning | Required before any simulation plan |
| QA/Review Specialist | Define tests and blockers | Missing tests, targeted validation, scope checks | Full suite without scope, benchmark proof | Test-gap and validation checklist | Required before implementation patch |
| Docs Specialist | Maintain control-plane consistency | CampaignPlan, PRQueue, Director/Specialist docs | Runtime docs that imply implementation | Docs consistency review | Required for docs patch readiness |
| Memory/Learning Specialist | Preserve evidence and LearningEvent boundaries | Evidence freeze, blocker events, claim wording | Memory promotion, claim escalation | Evidence-boundary note | Required on HOLD/BLOCKED transitions |
| Finance/Compute Specialist | Guard compute and cost | Local-first validation, budget need | Paid compute, cloud jobs, training runs | Compute-cost note | Required before compute activation |
| Security/IP Specialist | Guard secrets, IP, and external calls | External API avoidance, private data handling | Secret use, external API scripts, repo mutation APIs | Security/IP note | Required before external integration |

## HumanGate Rules

HumanGate must approve before:

- Runtime edits.
- FEN contract edits.
- Castling implementation.
- Search changes.
- Neural bridge changes.
- ML changes.
- Training changes.
- Dataset generation.
- Benchmark runs.
- Claims.
- PR ready.
- Merge.
- Freeze removal.
- Budget activation.
- External API use.

HumanGate cannot be replaced by:

- CampaignPlan.
- PRQueue.
- Director Report.
- Specialist report.
- LearningEvent.
- PRDecisionPacket.
- Local validation.
- CI checks.
- Codex output.
- GPT review.

## Local-First Validation Policy

Allowed for this docs-only patch:

- Markdown/doc review.
- `git status --porcelain`.
- `git diff --stat`.
- `git diff -- docs/control-plane MASTER_DOCS`.
- `rg` checks for required terms.
- Existing cheap local schema/doc validator only if already available and explicitly local.

Forbidden for this docs-only patch:

- Full cargo suite.
- Benchmarks.
- Training.
- Inference performance runs.
- Dataset generation.
- GitHub Actions triggering.
- External API scripts.

Future validation principle:

- Each future PR candidate must declare its own local-first validation.
- Validation must match scope.
- Passing validation is not a strength claim.
- Performance runs are never proof.

## Blocker Criteria

Use these blocking states for campaign decisions:

- `BLOCKED_CODE`: future checks start and fail because of repository code under the approved scope.
- `BLOCKED_INFRA`: validation cannot run because infrastructure, billing, runner, quota, or platform setup failed.
- `BLOCKED_SCOPE`: forbidden paths are touched or scope expands without HumanGate.
- `BLOCKED_CLAIM`: `claim_verdict` is missing, invalid, or escalated.
- `BLOCKED_VALIDATION`: required local validation is skipped, too broad, or inconsistent with the task.
- `BLOCKED_RUNTIME`: runtime/search/neural/ML/gameplay path is touched before explicit HumanGate.
- `BLOCKED_EVIDENCE`: evidence is treated as proof beyond its source-only boundary.

Stop conditions:

- Dirty worktree at startup.
- Forbidden path touch.
- Runtime edit in docs-only stage.
- ML/training edit in docs-only stage.
- Benchmark attempt.
- Dataset generation attempt.
- External API attempt.
- Auto-ready attempt.
- Auto-merge attempt.
- Claim escalation.

## Claim Policy

Mandatory statements:

- Chess960 is not implemented.
- Rocky is not Chess960-ready.
- No strength improvement claim is allowed.
- No benchmark proof is allowed.
- No production readiness claim is allowed.
- No scientific proof claim is allowed.
- `claim_verdict: NO_CLAIM_ALLOWED`.

Allowed language:

- planning-only
- docs-only
- source-only audit input
- future/experimental
- candidate
- risk
- impact map
- HumanGate required

Forbidden language:

- Chess960-ready
- implemented
- production-ready
- strength improved
- benchmark proves
- promotion candidate
- Rocky supports Chess960

## Final Recommended Decision Packet

recommended_next_patchpack: `Engine Chess960 Impact Map`

recommended_next_PR_title: `Engine Chess960 Impact Map`

recommended_next_candidate_id: `#233`

implementation_allowed_now: `NO`

human_gate_required: `YES`

auto_ready_allowed: false

auto_merge_allowed: false

claim_verdict: `NO_CLAIM_ALLOWED`

decision_summary:

- GO to planning for the next read-only engine impact map if the human accepts this docs-only campaign draft.
- HOLD any implementation until `#233`, `#234`, and `#235` clarify scope and HumanGate chooses the first patch.
- BLOCK runtime, FEN, castling, search, neural, ML, benchmark, dataset, workflow, or claim work until explicitly approved.

## Verdicts

software_verdict: CONTROL_PLANE_CHESS960_CAMPAIGNPLAN_DRAFT_ONLY

evidence_verdict: SOURCE_AUDIT_TO_PLANNING_ONLY

claim_verdict: NO_CLAIM_ALLOWED
