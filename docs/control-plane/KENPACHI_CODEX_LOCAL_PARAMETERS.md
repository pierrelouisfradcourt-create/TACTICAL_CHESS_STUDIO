# Kenpachi Codex Local Parameters

Status: DOCUMENTED_ONLY
Scope: Codex local startup parameters for the Kenpachi workstation
Source workspace: `C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab`
Target workspace: `C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab`
GitHub repository: `https://github.com/pierrelouisfradcourt-create/TacticalChessPureLab.git`
Default claim posture: `claim_verdict: NO_CLAIM_ALLOWED`

## 1. Purpose

This document gives the Kenpachi local Codex instance the minimum parameters needed to operate this repository after clone or sync.

It is a routing and startup document only. It does not authorize training, benchmark proof, dataset reset, runtime activation, model promotion, CI spending, destructive cleanup, or claim escalation.

## 2. Required Kenpachi Placement

Official studio root:

```text
C:\TACTICAL_CHESS_STUDIO\
```

Official repo target:

```text
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\
```

Repository source:

```text
https://github.com/pierrelouisfradcourt-create/TacticalChessPureLab.git
```

Clone command:

```powershell
git clone https://github.com/pierrelouisfradcourt-create/TacticalChessPureLab.git C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\
```

Post-clone verification:

```powershell
cd C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\
git status --short --branch
git rev-parse HEAD
```

## 3. Codex Local Startup

Preferred client:

```text
Codex CLI latest
```

Install or update command:

```powershell
npm i -g @openai/codex@latest
```

Run environment:

```text
Windows 11 Pro PowerShell
Native Windows sandbox
```

Model preference:

```text
Prefer gpt-5.5 if available.
Fallback to gpt-5.4 if gpt-5.5 is unavailable.
```

Sandbox policy:

```text
Use read-only for audits.
Use workspace-write only for explicitly authorized docs-only or bounded patch tasks.
Do not use danger-full-access unless the human explicitly authorizes it for a specific task.
Work only inside the selected workspace unless the prompt explicitly authorizes another path.
```

Git policy:

```text
Do not commit, push, create branches, open PRs, or mark PRs ready unless the user explicitly asks.
Before any repo work, report branch, HEAD, worktree status, and changed files.
If the worktree is dirty, identify pre-existing changes before editing.
```

## 4. Required Repo Doctrine

Always read and follow:

```text
AGENTS.md
```

Final reports must separate:

```text
active runtime code
tests
outputs/runtime artifacts
canonical docs
roadmap/docs-only
inference
```

Allowed status tags:

```text
IMPLEMENTED
TESTED
DOCUMENTED_ONLY
PASSIVE
BLOCKED
NOT_FOUND
UNKNOWN
```

Final verdict fields:

```text
software_verdict
evidence_verdict
claim_verdict
```

Default:

```text
claim_verdict: NO_CLAIM_ALLOWED
```

## 5. Runtime Authority Boundaries

Project doctrine:

```text
Rust = runtime truth.
Python = ML, inference, and tooling.
Search remains final authority.
Neural proposes and reranks; it does not decide alone.
Dataset labels require ActionId, LegalAction, ActionMask, provenance, and HumanGate.
```

Blocked unless explicitly authorized:

```text
training
benchmark runs
dataset reset
Chess960 activation
ActionMask implementation or authority expansion
DecisionController activation
dataset label promotion
model promotion
runtime authority changes
CI payment or paid CI expansion
destructive cleanup
```

Never claim:

```text
Elo
strength
promotion readiness
benchmark proof
scientific proof
global ready/not-ready without component-level status
```

## 6. Local Path Boundaries

Inside the active repo, keep only repository-scoped files.

Do not place these inside `TacticalChessPureLab` unless an existing tracked path explicitly owns them:

```text
datasets
models
runs
external archives
tools
apps
agents
Python site-packages
pip cache
Cargo target cache imports
local environment dumps
```

Generated non-canonical outputs must stay under:

```text
lab/gameplay_observation/sandbox_outputs/
```

Do not commit sandbox outputs.

## 7. Validation Policy

Docs-only changes require:

```powershell
git diff --check
```

and a readback of the changed document.

Code changes require the smallest targeted test that covers the changed behavior.

If validation is skipped or blocked, report why.

## 8. Reference Documents

Current local archive reference:

```text
LOCAL_ARCHIVE\KENPACHI_CODEX_REFERENCE_SAVE_2026_05_16\AAA_STUDIO_CODEX_PLACEMENT_CONTRACT_V3_1.md
```

Codex handoff pack reference:

```text
docs\control-plane\CODEX_HANDOFF_PACK.md
```

This document is a concise operational parameter sheet. If it conflicts with `AGENTS.md`, `AGENTS.md` is authoritative inside this repository.

## 9. Status Classification

```text
active runtime code: PASSIVE
tests: PASSIVE
outputs/runtime artifacts: PASSIVE
canonical docs: DOCUMENTED_ONLY
roadmap/docs-only: PASSIVE
inference: PASSIVE
software_verdict: DOCUMENTED_ONLY
evidence_verdict: PARAMETER_HANDOFF_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
