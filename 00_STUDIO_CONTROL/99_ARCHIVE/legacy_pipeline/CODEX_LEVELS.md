# Codex Levels

status: DOCUMENTED_ONLY

## Level 0 READ_ONLY
Allowed actions: inspect files, inspect git status, summarize evidence.
Forbidden actions: edits, tests, CI, installs, commits, pushes, dataset/model movement.
Validation: readback and command summaries only.
Stop conditions: any need to write, execute unapproved code, or resolve unknown destination.
Final report: include surface_status and the three verdicts.

## Level 1 DOCS_ONLY
Allowed actions: create or edit explicitly authorized documentation.
Forbidden actions: runtime code edits, tests, CI, installs, commits, pushes, runtime outputs.
Validation: verify files exist, read back scoped docs, run `git diff --check` only when repo docs are modified.
Stop conditions: requested change touches code, datasets, models, secrets, or unknown paths.
Final report: list docs files and mark status DOCUMENTED_ONLY.

## Level 2 PACKAGE_ONLY
Allowed actions: package approved docs, manifests, or transfer notes inside authorized package paths.
Forbidden actions: repo mutation, copying venv/Python/target/caches/logs/datasets/models, runtime activation.
Validation: file existence, path containment, package manifest review if present.
Stop conditions: source ambiguity, unknown destination, or old mixed parent content.
Final report: list files copied or created and package path.

## Level 3 TOOLCHAIN_ONLY
Allowed actions: install or verify explicitly approved toolchain components on target machine.
Forbidden actions: training, benchmarks as proof, dataset/model import, runtime authority changes, CI payment.
Validation: version checks and minimal build checks approved by HumanGate.
Stop conditions: network/payment/security prompt, privilege escalation beyond scope, or missing HumanGate decision.
Final report: list commands and toolchain status.

## Level 4 REPO_PATCH_BOUNDED
Allowed actions: minimal bounded code patch in authorized files.
Forbidden actions: broad refactor, Search/Engine/Neural authority changes, ActionMask expansion, activation, promotion.
Validation: smallest relevant targeted test.
Stop conditions: failing unrelated tests, dirty conflicting user changes, scope growth, or HumanGate-only decision.
Final report: component-level software_verdict and evidence_verdict.

## Level 5 BLOCKED_HUMANGATE
Allowed actions: stop, report blocker, request HumanGate decision.
Forbidden actions: workaround, assumption-based mutation, auto-fix security, destructive deletion.
Validation: none beyond evidence capture.
Stop conditions: remains active until HumanGate decision is recorded.
Final report: BLOCKED status, blocker evidence, requested decision.
