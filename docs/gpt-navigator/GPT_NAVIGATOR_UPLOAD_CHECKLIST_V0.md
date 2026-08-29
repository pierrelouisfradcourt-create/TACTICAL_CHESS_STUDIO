# GPT Navigator Upload Checklist V0

> **LEGACY PRE-FORGE — FROZEN 2026-08-28 (HumanGate decision: Pierre).**
> Pre-Forge Codex/GPT-Navigator control plane (last substantive update 2026-05,
> scoped to TacticalChessPureLab). NOT current studio truth — do not use as a
> source anchor for Forge-lane work. Current truth: `docs/forge/STUDIO_MASTER_SCHEMA.html`
> (Détail M, 2026-08-28) + `docs/adr/ADR-003-forge-workflow-coherence-audit.md`.

## Setup
- Create a ChatGPT Project named TacticalChessPureLab / Rocky Studio.
- Add project instructions from docs/gpt-navigator/GPT_NAVIGATOR_PROJECT_INSTRUCTIONS_V0.md.
- Upload is manual only. Do not assume any file is loaded just because it is listed here.
- Upload all permanent project sources from docs/gpt-navigator/GPT_NAVIGATOR_SOURCE_INDEX_V0.md.
- Keep the permanent upload set compact: navigator guard sources plus the nine-file main truth set. Do not treat all non-archive Markdown as main truth.
- Upload these main truth sources for daily navigation:
  - C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/index/READ_FIRST.md
  - C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/00_MASTER_DOCS/DOCS_STATUS.md
  - C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/00_MASTER_DOCS/CURRENT_STATE_INDEX.md
  - C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/00_MASTER_DOCS/01_CURRENT_STATE.md
  - C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/00_MASTER_DOCS/03_KNOWN_ISSUES.md
  - C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/00_MASTER_DOCS/05_ARCHITECTURE.md
  - C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/navigation/STUDIO_SOURCE_ANCHORING_V0.md
  - C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/maps/STUDIO_OUTPUT_ROUTING_POLICY_V0.md
  - C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/index/CONTROL_INDEX.md
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/00_MASTER_DOCS/00_EXEC_SUMMARY.md only when a task needs the high-level summary.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/00_MASTER_DOCS/02_COMMAND_CHEATSHEET.md only when a task needs command reference.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/00_MASTER_DOCS/06_DECISION_LOG.md only when a task needs decision-history context.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/00_MASTER_DOCS/07_PROJECT_HISTORY.md only when a task needs historical narrative.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/00_MASTER_DOCS/DOC_ARCHIVE_DEMOTION_MAP.md only when a task needs demotion or archive classification context; it does not authorize move, delete, rename, or archive actions.
- Upload docs/gpt-navigator/GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md before asking GPT Navigator to generate Codex prompts.
- Upload reference sources only when the current task needs their extra context.
- Upload Studio control sources only when the current task depends on Studio Control topology, routing, cleanup status, or form contracts.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/forms/LOCAL_LOGISTIC_AGENT_SPEC_V0.md only when a task needs Local Logistic Agent authority boundaries or pipeline roles.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/forms/TASK_QUEUE_TEMPLATE_V0.yaml only when a task needs Local Logistic Agent queue schema context.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/forms/TASK_MATRIX_TEMPLATE_V0.yaml only when a task needs Local Logistic Agent task-matrix schema context.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/forms/PROMPT_GENERATOR_RULES_V0.md only when a task needs prompt-generation gate context.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/forms/REPORT_PARSER_RULES_V0.md only when a task needs executor-report parser context.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/forms/LOCAL_RAG_SOURCE_PACK_V0.md only when a task needs Local RAG retrieval or source-pack context.
- Upload/read C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/99_ARCHIVE/records/RAG_SOURCE_PACK_MANIFEST_V0.yaml only when a task depends on RAG source-pack manifest context.
- Upload/read C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/rag/RAG_INDEX_ROUTE_AND_BACKEND_POLICY_V0.md only when a task depends on RAG route/backend policy context.
- Upload/read of RAG manifest or policy sources does not authorize RAG activation, source promotion, indexing, embeddings, vector DB, LLM/model calls, model downloads, runtime execution, benchmark, training, dataset/model actions, Git actions, or claims.
- For RAG manifest or policy source use, report source_state separately: created, registered, loaded, enforced, evidenced.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/forms/EXECUTOR_REPORT_SUMMARY_TEMPLATE_V0.yaml only when a task needs executor-report summary schema context.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/forms/NEXT_STEP_PROPOSAL_TEMPLATE_V0.yaml only when a task needs next-step proposal schema context.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/forms/TASK_PRIORITY_MATRIX_V0.yaml only when a task needs task-priority matrix schema context.
- Treat Local Logistic Agent pipeline forms as reference sources only; upload does not authorize mutation, execution, activation, promotion, training, benchmark, dataset generation, model promotion, or claim validation.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/99_ARCHIVE/records/STUDIO_ROUTING_PLAN_CORRECTION_V0.md only when a task needs Studio routing correction context.
- Do not treat STUDIO_ROUTING_PLAN_CORRECTION_V0.md as active truth merely because it was uploaded; report its source state as created, registered, loaded, enforced, and evidenced.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/99_ARCHIVE/records/UXPILOTE_LOCAL_FREEZE_V0.md only when a task needs UxPilote local freeze status evidence; it is DOCUMENTED_ONLY status evidence, scripts/uxpilote remains keep_local_only and is not source truth, and it grants no runtime authority, no agent activation, NO_CLAIM_ALLOWED, and no global ready verdict.
- Do not upload or register scripts/uxpilote, uxpilote_readonly.py, UXPILOTE_READONLY_BOUNDED_EXECUTION_PREVIEW_V0.html, .venv312, __pycache__, or Godot/editor cache artifacts as source truth from the local freeze record.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/maps/UXPILOTE_READONLY_DATA_CONTRACT_V0.md only when a task needs the selected UxPilote read-only data contract context; treat it as reference/status evidence only, DOCUMENTED_ONLY, with no runtime authority, no agent activation, no benchmark/training/dataset/model authority, NO_CLAIM_ALLOWED, and no global ready verdict.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/maps/UXPILOTE_AUDIT_CHAIN_CATALOG_V0.md only when a task needs the selected audit-chain catalog context; treat it as reference/status evidence only, DOCUMENTED_ONLY, with no audit execution, no mutation, no runtime authority, no agent activation, NO_CLAIM_ALLOWED, and no global ready verdict.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/maps/UXPILOTE_HUMANGATE_QUEUE_SPEC_V0.md only when a task needs the selected HumanGate queue spec context; treat it as reference/status evidence only, DOCUMENTED_ONLY, with no approval authority, no execution authority, no agent activation, NO_CLAIM_ALLOWED, and no global ready verdict.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/maps/SCRIPTS_ROUTE_ALIGNMENT_CHARTER_V0.md only when a task needs scripts route-alignment context; treat it as reference/status evidence only, DOCUMENTED_ONLY, with no script, CI, CODEOWNERS, cleanup, execution, Git, runtime, dataset, model, or claim authority.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/maps/UXPILOTE_3D_WORLD_GRAPH_MODEL_V0.md only when a task needs UxPilote world-graph model context; treat it as reference/status evidence only, DOCUMENTED_ONLY, with no Godot, frontend, runtime, data-loader, agent, controller, benchmark, training, dataset, model, or claim authority.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/maps/UXPILOTE_FUSION_MATRIX_VISUAL_SPEC_V0.md only when a task needs Fusion Matrix visual-spec context; treat it as reference/status evidence only, DOCUMENTED_ONLY, with no UI, prototype, renderer, data-loader, agent, script, workflow, runtime, test, automation, or claim authority.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/99_ARCHIVE/records/STUDIO_MASTER_TASK_MATRIX_V0.yaml only when a task needs the selected passive studio task matrix context; treat it as reference/status evidence only, DOCUMENTED_ONLY, proposal-only, with no runtime authority, no agent activation, NO_CLAIM_ALLOWED, and no global ready verdict.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/99_ARCHIVE/records/STUDIO_SOURCE_REGISTRATION_PLAN_V0.yaml only when a task needs the selected source-registration planning context; treat it as reference/status evidence only, DOCUMENTED_ONLY, with HumanGate required, no bulk registration authority, NO_CLAIM_ALLOWED, and no global ready verdict.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/99_ARCHIVE/records/STUDIO_TASK_DASHBOARD_INDEX_V0.yaml only when a task needs the selected dashboard/status index context; treat it as reference/status evidence only, DOCUMENTED_ONLY, status-summary-only, with no task execution, registration authority, runtime authority, Git authority, or claim authority.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/boundaries/STUDIO_LIVING_SYSTEMS_AND_POWER_GUARDRAILS_V0.md when a task depends on living-systems, legal-safety, player-dignity, World Protector exclusion, or power-governance guardrails.
- Do not treat STUDIO_LIVING_SYSTEMS_AND_POWER_GUARDRAILS_V0.md as runtime, legal-compliance, training, dataset, benchmark, model-promotion, or agent-activation authority merely because it was uploaded.
- Upload C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_SYSTEM/boundaries/STUDIO_RESPONSIBLE_USE_AND_SECURITY_BOUNDARY_V0.md when a task depends on responsible-use, anti-misuse, machine-security, secrets, personal data, public release, external services, cyber, surveillance, or infrastructure-control boundaries.
- Do not treat STUDIO_RESPONSIBLE_USE_AND_SECURITY_BOUNDARY_V0.md as runtime, cyber-offense, surveillance, infrastructure-control, legal-compliance, training, dataset, benchmark, model-promotion, or agent-activation authority merely because it was uploaded.
- Keep recent correction reports task-specific or reference-only unless HumanGate promotes them.
- Upload Studio Agentic Pyramid sources only when the current task needs agentic architecture or activation-roadmap context; treat them as reference sources, not runtime authority.
- Upload ROCKY, control-plane, roadmap, evidence, report, benchmark, or archive docs only as reference or temporary context.
- Remove temporary sources after the task that required them.
- Do not treat reference sources as active truth by themselves.
- Do not treat temporary sources as active truth.
- Most contracts, forms, registries, policies, passive specs, and roadmaps are on-demand reference sources.
- Temporary task reports and Codex audit reports remain task-specific unless HumanGate promotes them.
- Classic/Rocky runtime claims require code/test evidence, not docs-only evidence.
- Do not upload lab/* or latest.json as permanent or reference truth.
- Start critical repo chats with a short reprise line.
- Periodically refresh the sources after major doc updates.
- After daily backup workflow policy updates, refresh AGENTS.md, GPT_NAVIGATOR_PROJECT_INSTRUCTIONS_V0.md, and GPT_NAVIGATOR_REPO_NOTICE_V0.md before generating Codex prompts.
- Do not treat a daily backup push as source promotion, readiness, release, benchmark proof, runtime activation, dataset promotion, model promotion, or claim validation.
- Before using a newly created contract, template, or report as project truth, verify and report source state separately: created, registered, loaded, enforced, evidenced.
- Created != registered != loaded != enforced != evidenced.
- `no_global_ready_verdict: true`
- If docs mention a local/GitHub split, verify it live with Git before relying on the text.
- If `MASTER_DOCS` still mention an older local stack split, keep that as reference/local-history only.

## Reprise Line
MODE REPO - apply TacticalChessPureLab rules: separate surfaces, status per surface, current repo/docs truth, no global ready verdict, no Codex prompt unless necessary.

## Mobile reprise line
MODE REPO - verifier repo reel, separer code/tests/docs/artifacts/inference, statut par surface, no global ready verdict, no Codex unless needed.
