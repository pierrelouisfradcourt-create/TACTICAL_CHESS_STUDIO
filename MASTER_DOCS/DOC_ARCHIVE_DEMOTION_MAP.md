# Doc Archive Demotion Map

## 1. Purpose and limits

This file is a classification proposal only.

It does not move, delete, rename, or physically archive any file. It does not create a new control-plane. It does not create a new SSOT family. It does not authorize implementation, runtime, neural, ML, benchmark, readiness, strength, performance, promotion, or scientific-proof claims.

claim_verdict: NO_CLAIM_ALLOWED

## 2. Classification taxonomy

- ACTIVE_CANONICAL: current entry points and current truth summaries that future Codex should read first.
- ACTIVE_REFERENCE: useful active references, but not the first authority surface.
- PASSIVE_BOUNDARY_DOC: docs that describe passive boundaries, contracts, adapters, or gate packets.
- PLANNING_ROADMAP: roadmap or future direction only; not proof of implementation.
- STALE_DO_NOT_USE: docs with outdated state that should not guide future work except as historical trace.
- ARCHIVE_CONTEXT_ONLY: historical context, old audit, old reprise, old local notes, or pointer docs.
- GENERATED_OR_EVIDENCE: generated reports, benchmark artifacts, lab outputs, evidence packs, or ledgers.

## 3. Demotion map table

| path or pattern | classification | reason | replacement / read-before doc | proposed action | move/delete now |
| --- | --- | --- | --- | --- | --- |
| `AGENTS.md` | ACTIVE_CANONICAL | Agent doctrine and guardrails for this repo. | `MASTER_DOCS/CURRENT_STATE_INDEX.md` | KEEP_ACTIVE | NO |
| `README.md` | ACTIVE_CANONICAL | Root project entry point and current orientation. | `AGENTS.md` | KEEP_ACTIVE | NO |
| `MASTER_DOCS/DOCS_STATUS.md` | ACTIVE_CANONICAL | Active documentation index and PP9-PP19 status. | `README.md` | KEEP_ACTIVE | NO |
| `MASTER_DOCS/00_EXEC_SUMMARY.md` | ACTIVE_CANONICAL | Current executive summary surface. | `MASTER_DOCS/DOCS_STATUS.md` | KEEP_ACTIVE | NO |
| `MASTER_DOCS/01_CURRENT_STATE.md` | ACTIVE_CANONICAL | Current state summary. | `MASTER_DOCS/DOCS_STATUS.md` | KEEP_ACTIVE | NO |
| `MASTER_DOCS/02_COMMAND_CHEATSHEET.md` | ACTIVE_CANONICAL | Official command reference. | `MASTER_DOCS/DOCS_STATUS.md` | KEEP_ACTIVE | NO |
| `MASTER_DOCS/03_KNOWN_ISSUES.md` | ACTIVE_CANONICAL | Canonical active issue list. | `MASTER_DOCS/DOCS_STATUS.md` | KEEP_ACTIVE | NO |
| `MASTER_DOCS/05_ARCHITECTURE.md` | ACTIVE_CANONICAL | Current architecture orientation and authority order. | `MASTER_DOCS/01_CURRENT_STATE.md` | KEEP_ACTIVE | NO |
| `MASTER_DOCS/06_DECISION_LOG.md` | ACTIVE_REFERENCE | Decision trace, not first-read authority. | `MASTER_DOCS/DOCS_STATUS.md` | KEEP_REFERENCE | NO |
| `MASTER_DOCS/07_PROJECT_HISTORY.md` | ACTIVE_REFERENCE | Historical narrative with current guardrails. | `MASTER_DOCS/01_CURRENT_STATE.md` | KEEP_REFERENCE | NO |
| `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md` | ACTIVE_REFERENCE | Automation/evidence-plane reference with older PR-era context. | `MASTER_DOCS/DOCS_STATUS.md` | KEEP_REFERENCE | NO |
| `MASTER_DOCS/AUTOMATION_OPERATING_NOTICE.md` | ACTIVE_REFERENCE | Operational automation reference. | `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md` | KEEP_REFERENCE | NO |
| `MASTER_DOCS/TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md` | ACTIVE_REFERENCE | Canonical docs-only control-plane interpretation. | `MASTER_DOCS/DOCS_STATUS.md` | KEEP_REFERENCE | NO |
| `docs/control-plane/README.md` | ACTIVE_REFERENCE | Navigation index for manual dry-run control-plane docs. | `MASTER_DOCS/TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md` | KEEP_REFERENCE | NO |
| `AI_MEMORY/README.md` | ACTIVE_REFERENCE | Lightweight memory workspace note. | `README.md` | KEEP_REFERENCE | NO |
| `templates/README.md` | ACTIVE_REFERENCE | Template workspace note. | `README.md` | KEEP_REFERENCE | NO |
| `LAB_POLICY_BOOTSTRAP.md` | PASSIVE_BOUNDARY_DOC | Trust-root bootstrap boundary. | `AGENTS.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `SECURITY_BOUNDARY.md` | PASSIVE_BOUNDARY_DOC | Security and evidence boundary. | `AGENTS.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `THREAT_MODEL.md` | PASSIVE_BOUNDARY_DOC | Trust-root threat model. | `SECURITY_BOUNDARY.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `MASTER_DOCS/AUTOMATION_CONTROLLER_CONTRACT.md` | PASSIVE_BOUNDARY_DOC | Automation contract only. | `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `MASTER_DOCS/AUTOMATION_BATCH_CONTROLLER.md` | PASSIVE_BOUNDARY_DOC | Batch controller contract only. | `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `MASTER_DOCS/AUTOMATION_GPT_PLATFORM_BRIDGE.md` | PASSIVE_BOUNDARY_DOC | Future bridge contract only. | `MASTER_DOCS/AUTOMATION_OPERATING_NOTICE.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `MASTER_DOCS/AUTOMATION_LANE_MATRIX.md` | PASSIVE_BOUNDARY_DOC | Automation lane policy matrix. | `MASTER_DOCS/AUTOMATION_OPERATING_NOTICE.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `MASTER_DOCS/AUTOMATION_SMOKE_MATRIX.md` | PASSIVE_BOUNDARY_DOC | Smoke matrix for automation lanes. | `MASTER_DOCS/AUTOMATION_OPERATING_NOTICE.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `MASTER_DOCS/LEARNING_TRACE_V1_STANDARD.md` | PASSIVE_BOUNDARY_DOC | Learning trace schema standard, not active ML implementation. | `MASTER_DOCS/LEARNING_SYSTEM_FOUNDATIONS_EVIDENCE_INDEX.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `docs/control-plane/ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md` | PASSIVE_BOUNDARY_DOC | PP10 inventory, not implementation. | `docs/control-plane/ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `docs/control-plane/ENGINE_SEARCH_NEURAL_DECISION_ROUTING_CONTRACT_PLAN_V0.md` | PASSIVE_BOUNDARY_DOC | PP15 docs-only routing contract plan. | `docs/control-plane/ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `docs/control-plane/ENGINE_SEARCH_NEURAL_SPLIT_INVENTORY_GATE_PACKET_V0.md` | PASSIVE_BOUNDARY_DOC | PP17 inventory and gate packet only. | `docs/control-plane/ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `docs/control-plane/ENGINE_SEARCH_NEURAL_POLICY_VALUE_PASSIVE_INTERFACE_DECISION_V0.md` | PASSIVE_BOUNDARY_DOC | PP18 paper-only/passive interface decision. | `docs/control-plane/ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `docs/control-plane/*CONTRACT*` | PASSIVE_BOUNDARY_DOC | Contract docs; not activation. | `docs/control-plane/README.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `docs/control-plane/*POLICY*` | PASSIVE_BOUNDARY_DOC | Policy docs; not activation. | `docs/control-plane/README.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `docs/control-plane/*MATRIX*` | PASSIVE_BOUNDARY_DOC | Matrix docs; not activation. | `docs/control-plane/README.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `docs/control-plane/*BOUNDARY*` | PASSIVE_BOUNDARY_DOC | Boundary docs; not activation. | `docs/control-plane/README.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `docs/control-plane/*PACKET*` | PASSIVE_BOUNDARY_DOC | Packet docs; not active runtime authority. | `docs/control-plane/README.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `docs/control-plane/*SCHEMA*` | PASSIVE_BOUNDARY_DOC | Schema docs; not runtime behavior. | `docs/control-plane/README.md` | KEEP_PASSIVE_BOUNDARY | NO |
| `MASTER_DOCS/02_ROADMAP_90D.md` | PLANNING_ROADMAP | 90-day direction only. | `MASTER_DOCS/01_CURRENT_STATE.md` | KEEP_ROADMAP | NO |
| `MASTER_DOCS/09_ROCKY_VARIANT_FREEZE.md` | PLANNING_ROADMAP | Documentation-only variant freeze. | `MASTER_DOCS/05_ARCHITECTURE.md` | KEEP_ROADMAP | NO |
| `MASTER_DOCS/AAA_TACTICAL_CORE_ARCHITECTURE.md` | PLANNING_ROADMAP | Architecture consolidation and future direction only. | `MASTER_DOCS/05_ARCHITECTURE.md` | KEEP_ROADMAP | NO |
| `MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md` | PLANNING_ROADMAP | Implementation-order roadmap; source remains authority. | `MASTER_DOCS/05_ARCHITECTURE.md` | KEEP_ROADMAP | NO |
| `MASTER_DOCS/29_FREE_CLEAN_OPERATOR_PACK.md` | PLANNING_ROADMAP | Future operator pack direction. | `MASTER_DOCS/DOCS_STATUS.md` | KEEP_ROADMAP | NO |
| `MASTER_DOCS/LEARNING_SYSTEM_FOUNDATIONS_EVIDENCE_INDEX.md` | PLANNING_ROADMAP | Learning-system evidence index and future work order. | `MASTER_DOCS/01_CURRENT_STATE.md` | KEEP_ROADMAP | NO |
| `docs/control-plane/ENGINE_SEARCH_NEURAL_DECOMPOSITION_ROADMAP_V0.md` | PLANNING_ROADMAP | PP9 decomposition roadmap superseded for reading order by PP19 fusion. | `docs/control-plane/ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md` | KEEP_ROADMAP | NO |
| `docs/control-plane/ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md` | PLANNING_ROADMAP | PP19 docs-only fusion for PP9-PP18. | `MASTER_DOCS/DOCS_STATUS.md` | KEEP_ROADMAP | NO |
| `docs/control-plane/CHESS960_CAMPAIGNPLAN_DRAFT_V0.md` | PLANNING_ROADMAP | Chess960 campaign planning only. | `MASTER_DOCS/09_ROCKY_VARIANT_FREEZE.md` | KEEP_ROADMAP | NO |
| `docs/control-plane/PATCHPACK_CAMPAIGN_PLAN_V0.md` | PLANNING_ROADMAP | PatchPack planning object only. | `docs/control-plane/README.md` | KEEP_ROADMAP | NO |
| `MASTER_DOCS/ARCHIVE/LEGACY_ROOT_DOCS/*.md` | STALE_DO_NOT_USE | Legacy root docs can conflict with current docs. | `MASTER_DOCS/CURRENT_STATE_INDEX.md` | ARCHIVE_LATER | NO |
| `MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/V2_SOURCE_OF_TRUTH.md` | STALE_DO_NOT_USE | Legacy source-of-truth wording can mislead current work. | `MASTER_DOCS/01_CURRENT_STATE.md` | ARCHIVE_LATER | NO |
| `MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/AAA_RUNTIME_UPDATE.md` | STALE_DO_NOT_USE | Older runtime update context, not current authority. | `MASTER_DOCS/05_ARCHITECTURE.md` | ARCHIVE_LATER | NO |
| `MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/PROJECT_HISTORY.md` | STALE_DO_NOT_USE | Superseded by current project history. | `MASTER_DOCS/07_PROJECT_HISTORY.md` | ARCHIVE_LATER | NO |
| `PR #116 draft docs if reintroduced locally` | STALE_DO_NOT_USE | Draft docs based before current state. | `MASTER_DOCS/DOCS_STATUS.md` | ARCHIVE_LATER | NO |
| `MASTER_DOCS/CURRENT_CODE_AUDIT_AND_KNOWN_ISSUES.md` | ARCHIVE_CONTEXT_ONLY | Pointer only; active issues live elsewhere. | `MASTER_DOCS/03_KNOWN_ISSUES.md` | POINTER_ONLY | NO |
| `MASTER_DOCS/08_REPRISE_PROMPT.md` | ARCHIVE_CONTEXT_ONLY | Old reprise prompt; useful context only. | `MASTER_DOCS/CURRENT_STATE_INDEX.md` | DEMOTE_TO_CONTEXT | NO |
| `MASTER_DOCS/11_GPT55_BROWSER_REPRISE_PROMPT.md` | ARCHIVE_CONTEXT_ONLY | Old browser handoff prompt; useful context only. | `MASTER_DOCS/CURRENT_STATE_INDEX.md` | DEMOTE_TO_CONTEXT | NO |
| `MASTER_DOCS/16_MULTI_AGENT_STUDIO_CONSTITUTION.md` | ARCHIVE_CONTEXT_ONLY | Older multi-agent concept surface. | `MASTER_DOCS/TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md` | DEMOTE_TO_CONTEXT | NO |
| `MASTER_DOCS/17_PR_AGENT_TUTORIAL.md` | ARCHIVE_CONTEXT_ONLY | Older tutorial context. | `MASTER_DOCS/TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md` | DEMOTE_TO_CONTEXT | NO |
| `MASTER_DOCS/18_AGENT_REGISTRY.md` | ARCHIVE_CONTEXT_ONLY | Older agent registry context. | `MASTER_DOCS/TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md` | DEMOTE_TO_CONTEXT | NO |
| `MASTER_DOCS/19_AGENT_GUARDRAIL_POLICY.md` | ARCHIVE_CONTEXT_ONLY | Older guardrail context. | `MASTER_DOCS/TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md` | DEMOTE_TO_CONTEXT | NO |
| `MASTER_DOCS/20_LOCAL_AGENT_PR_OPERATOR.md` | ARCHIVE_CONTEXT_ONLY | Older local operator context. | `MASTER_DOCS/TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md` | DEMOTE_TO_CONTEXT | NO |
| `MASTER_DOCS/28_AI_REVIEW_COUNCIL.md` | ARCHIVE_CONTEXT_ONLY | Review council contract context, not first-read authority. | `MASTER_DOCS/DOCS_STATUS.md` | DEMOTE_TO_CONTEXT | NO |
| `MASTER_DOCS/AUTOBATTLER_RELECTURE_2026_04_26/*.md` | ARCHIVE_CONTEXT_ONLY | Product-roadmap/idea context only. | `MASTER_DOCS/05_ARCHITECTURE.md` | DEMOTE_TO_CONTEXT | NO |
| `MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/CHATGPT_SHARE_ARCHIVE_MAP.md` | ARCHIVE_CONTEXT_ONLY | Archive map only. | `MASTER_DOCS/CURRENT_STATE_INDEX.md` | DEMOTE_TO_CONTEXT | NO |
| `MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/SOURCE_ARCHIVE_MAP.md` | ARCHIVE_CONTEXT_ONLY | Source archive map only. | `MASTER_DOCS/CURRENT_STATE_INDEX.md` | DEMOTE_TO_CONTEXT | NO |
| `MASTER_DOCS/04_BENCHMARK_LEDGER.md` | GENERATED_OR_EVIDENCE | Benchmark ledger is diagnostic/evidence context, not proof. | `MASTER_DOCS/03_KNOWN_ISSUES.md` | GENERATED_OR_EVIDENCE_ONLY | NO |
| `SECURITY_AUTOMATION_AUDIT.md` | GENERATED_OR_EVIDENCE | Audit evidence/context surface. | `SECURITY_BOUNDARY.md` | GENERATED_OR_EVIDENCE_ONLY | NO |
| `lab/**/*.md` | GENERATED_OR_EVIDENCE | Lab reports and evidence packs are not active authority. | `MASTER_DOCS/CURRENT_STATE_INDEX.md` | GENERATED_OR_EVIDENCE_ONLY | NO |
| `lab/reports/*.md` | GENERATED_OR_EVIDENCE | Generated/reporting surface. | `MASTER_DOCS/04_BENCHMARK_LEDGER.md` | GENERATED_OR_EVIDENCE_ONLY | NO |
| `lab/gameplay_observation/*.md` | GENERATED_OR_EVIDENCE | Non-canonical observation/reporting surface. | `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md` | GENERATED_OR_EVIDENCE_ONLY | NO |
| `lab/ci/*.md` | GENERATED_OR_EVIDENCE | CI evidence/reporting context. | `LAB_POLICY_BOOTSTRAP.md` | GENERATED_OR_EVIDENCE_ONLY | NO |
| `lab/gates/**/*.md` | GENERATED_OR_EVIDENCE | Gate evidence/context docs. | `LAB_POLICY_BOOTSTRAP.md` | GENERATED_OR_EVIDENCE_ONLY | NO |
| `lab/claim_data_gates/**/*.md` | GENERATED_OR_EVIDENCE | Claim/data gate evidence context. | `LAB_POLICY_BOOTSTRAP.md` | GENERATED_OR_EVIDENCE_ONLY | NO |
| `lab/gpt_audit/**/*.md` | GENERATED_OR_EVIDENCE | GPT audit context, not authority. | `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md` | GENERATED_OR_EVIDENCE_ONLY | NO |
| `lab/run_contracts/**/*.md` | GENERATED_OR_EVIDENCE | Run contract/evidence context. | `LAB_POLICY_BOOTSTRAP.md` | GENERATED_OR_EVIDENCE_ONLY | NO |

## 4. Active canonical group

- `AGENTS.md`
- `README.md`
- `MASTER_DOCS/DOCS_STATUS.md`
- `MASTER_DOCS/00_EXEC_SUMMARY.md`
- `MASTER_DOCS/01_CURRENT_STATE.md`
- `MASTER_DOCS/02_COMMAND_CHEATSHEET.md`
- `MASTER_DOCS/03_KNOWN_ISSUES.md`
- `MASTER_DOCS/05_ARCHITECTURE.md`

## 5. Active reference group

- `MASTER_DOCS/06_DECISION_LOG.md`
- `MASTER_DOCS/07_PROJECT_HISTORY.md`
- `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md`
- `MASTER_DOCS/AUTOMATION_OPERATING_NOTICE.md`
- `MASTER_DOCS/TACTICAL_CHESS_CONTROL_PLANE_CANONIZATION_V1_1.md`
- `docs/control-plane/README.md`
- `AI_MEMORY/README.md`
- `templates/README.md`

## 6. Passive boundary group

- `LAB_POLICY_BOOTSTRAP.md`
- `SECURITY_BOUNDARY.md`
- `THREAT_MODEL.md`
- `MASTER_DOCS/AUTOMATION_CONTROLLER_CONTRACT.md`
- `MASTER_DOCS/AUTOMATION_BATCH_CONTROLLER.md`
- `MASTER_DOCS/AUTOMATION_GPT_PLATFORM_BRIDGE.md`
- `MASTER_DOCS/AUTOMATION_LANE_MATRIX.md`
- `MASTER_DOCS/AUTOMATION_SMOKE_MATRIX.md`
- `MASTER_DOCS/LEARNING_TRACE_V1_STANDARD.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_SURFACE_INVENTORY_V0.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_DECISION_ROUTING_CONTRACT_PLAN_V0.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_SPLIT_INVENTORY_GATE_PACKET_V0.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_POLICY_VALUE_PASSIVE_INTERFACE_DECISION_V0.md`
- `docs/control-plane/*CONTRACT*`
- `docs/control-plane/*POLICY*`
- `docs/control-plane/*MATRIX*`
- `docs/control-plane/*BOUNDARY*`
- `docs/control-plane/*PACKET*`
- `docs/control-plane/*SCHEMA*`

## 7. Planning roadmap group

- `MASTER_DOCS/02_ROADMAP_90D.md`
- `MASTER_DOCS/09_ROCKY_VARIANT_FREEZE.md`
- `MASTER_DOCS/AAA_TACTICAL_CORE_ARCHITECTURE.md`
- `MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md`
- `MASTER_DOCS/29_FREE_CLEAN_OPERATOR_PACK.md`
- `MASTER_DOCS/LEARNING_SYSTEM_FOUNDATIONS_EVIDENCE_INDEX.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_DECOMPOSITION_ROADMAP_V0.md`
- `docs/control-plane/ENGINE_SEARCH_NEURAL_MASTER_ROADMAP_FUSION_V0.md`
- `docs/control-plane/CHESS960_CAMPAIGNPLAN_DRAFT_V0.md`
- `docs/control-plane/PATCHPACK_CAMPAIGN_PLAN_V0.md`

## 8. Stale/do-not-use group

- `MASTER_DOCS/ARCHIVE/LEGACY_ROOT_DOCS/*.md`
- `MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/V2_SOURCE_OF_TRUTH.md`
- `MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/AAA_RUNTIME_UPDATE.md`
- `MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/PROJECT_HISTORY.md`
- `PR #116 draft docs if reintroduced locally`

## 9. Archive/context-only group

- `MASTER_DOCS/CURRENT_CODE_AUDIT_AND_KNOWN_ISSUES.md`
- `MASTER_DOCS/08_REPRISE_PROMPT.md`
- `MASTER_DOCS/11_GPT55_BROWSER_REPRISE_PROMPT.md`
- `MASTER_DOCS/16_MULTI_AGENT_STUDIO_CONSTITUTION.md`
- `MASTER_DOCS/17_PR_AGENT_TUTORIAL.md`
- `MASTER_DOCS/18_AGENT_REGISTRY.md`
- `MASTER_DOCS/19_AGENT_GUARDRAIL_POLICY.md`
- `MASTER_DOCS/20_LOCAL_AGENT_PR_OPERATOR.md`
- `MASTER_DOCS/28_AI_REVIEW_COUNCIL.md`
- `MASTER_DOCS/AUTOBATTLER_RELECTURE_2026_04_26/*.md`
- `MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/CHATGPT_SHARE_ARCHIVE_MAP.md`
- `MASTER_DOCS/ARCHIVE/LEGACY_MASTER_DOCS/SOURCE_ARCHIVE_MAP.md`

## 10. Generated/evidence group

- `MASTER_DOCS/04_BENCHMARK_LEDGER.md`
- `SECURITY_AUTOMATION_AUDIT.md`
- `lab/**/*.md`
- `lab/reports/*.md`
- `lab/gameplay_observation/*.md`
- `lab/ci/*.md`
- `lab/gates/**/*.md`
- `lab/claim_data_gates/**/*.md`
- `lab/gpt_audit/**/*.md`
- `lab/run_contracts/**/*.md`

## 11. Later physical archive candidates

These are candidates for later physical archive consideration only:

- old reprise prompts
- `MASTER_DOCS/CURRENT_CODE_AUDIT_AND_KNOWN_ISSUES.md`
- `MASTER_DOCS/16_MULTI_AGENT_STUDIO_CONSTITUTION.md`
- `MASTER_DOCS/17_PR_AGENT_TUTORIAL.md`
- `MASTER_DOCS/18_AGENT_REGISTRY.md`
- `MASTER_DOCS/19_AGENT_GUARDRAIL_POLICY.md`
- `MASTER_DOCS/20_LOCAL_AGENT_PR_OPERATOR.md`
- `MASTER_DOCS/28_AI_REVIEW_COUNCIL.md`
- `MASTER_DOCS/29_FREE_CLEAN_OPERATOR_PACK.md`
- `MASTER_DOCS/AUTOBATTLER_RELECTURE_2026_04_26/`

Physical archive requires a separate HumanDecision.

## 12. Stop conditions

- Any file move.
- Any file deletion.
- Any existing doc rewrite.
- Any source, test, ML, or runtime change.
- Any new control-plane creation.
- Any claim escalation.

## 13. Final verdicts

implementation_allowed_now: NO
runtime_changes_allowed_now: NO
neural_changes_allowed_now: NO
ml_changes_allowed_now: NO
new_control_plane_allowed_now: NO
file_moves_allowed_now: NO
file_deletions_allowed_now: NO
physical_archive_allowed_now: NO
claim_verdict: NO_CLAIM_ALLOWED
