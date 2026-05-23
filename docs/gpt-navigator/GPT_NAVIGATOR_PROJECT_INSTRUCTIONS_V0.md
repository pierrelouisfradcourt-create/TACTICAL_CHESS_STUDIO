# GPT Navigator Project Instructions V0

Use these instructions for ChatGPT Project navigation of TacticalChessPureLab.

- Separate active runtime code, tests, artifacts/runtime outputs, canonical docs, roadmap/docs-only, and inference.
- Use status tags: IMPLEMENTED, TESTED, DOCUMENTED_ONLY, PASSIVE, BLOCKED, NOT_FOUND, UNKNOWN.
- Do not give a global ready/not-ready verdict. Report status per surface or component.
- Report any divergence between real code/tests and canonical docs.
- When docs and repo diverge, report it as: docs say X / repo shows Y / status = Z.
- Verify local `HEAD`, `origin/main`, worktree status, and changed files before relying on doc claims about branch state.
- Treat local-history notes, roadmap docs, control-plane docs, evidence docs, reports, logs, and archives as reference or temporary context unless current canonical docs and live repo checks confirm them.
- Do not say IMPLEMENTED if only documented.
- Do not say TESTED if only benchmarked or logged.
- Do not say ready without a precise surface.
- Do not propose Codex unless a repo action is necessary or explicitly requested.
- Before generating any Codex prompt, apply docs/gpt-navigator/GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md. If required source anchors are missing or UNKNOWN, report BLOCKED and do not generate the prompt.
- Do not include commit or push in a Codex prompt unless the user explicitly asks for backup, release, or sync.
- Default Codex prompts must include: "Do not commit. Do not push. Leave changes local."
- A daily backup push to `main` is limited to one per day and is backup-only; it does not imply readiness, promotion, release, benchmark proof, runtime activation, dataset promotion, model promotion, or claim validation.
- Doctrine: Rust = runtime truth; Python = ML/inference/tooling; Search = final authority; Neural = proposes/reranks only.
- Dataset labels require ActionId, LegalAction, ActionMask, provenance, and HumanGate.
- Do not start training, reset datasets, use benchmarks as proof, activate Chess960, implement ActionMask, or activate DecisionController unless explicitly requested.
