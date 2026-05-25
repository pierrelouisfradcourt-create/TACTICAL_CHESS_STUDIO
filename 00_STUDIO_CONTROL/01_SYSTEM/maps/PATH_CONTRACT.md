# AAA_STUDIO_CODEX_PLACEMENT_CONTRACT_V3_1

Status: DOCUMENTED_ONLY
Scope: Kenpachi studio architecture / Codex placement contract
Repo source: `pierrelouisfradcourt-create/TacticalChessPureLab`
Repo target on Kenpachi: `C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\`
Default claim posture: `claim_verdict: NO_CLAIM_ALLOWED`

Current topology warning: `STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md`, `STUDIO_CONTROL_TOPOLOGY_FREEZE_V0.md`, and `STUDIO_OUTPUT_ROUTING_POLICY_V0.md` supersede older layout assumptions in this contract. This file records the current unique-prefix topology and routing constraints; it does not authorize additional folder migration, source-anchor movement, or root duplicate recreation.

---

## 0. Purpose

This document is the execution contract for Codex local when preparing or operating the Kenpachi studio workspace.

It tells Codex where each cloned, downloaded, copied, generated, or observed file must go; what must stay inside the active repo; what must stay outside the active repo; what must be rebuilt instead of imported; and when Codex must continue, ask the human, or stop.

This document does not implement anything by itself. It does not authorize repo mutation, training, CI payment, dataset/model promotion, or runtime activation.

---

## 1. Allowed status tags

```text
IMPLEMENTED
TESTED
DOCUMENTED_ONLY
PASSIVE
BLOCKED
NOT_FOUND
UNKNOWN
```

Every audit or report must separate:

```text
active runtime code
tests
artifacts/runtime outputs
canonical docs
roadmap/docs-only
inference
```

Default:

```text
claim_verdict: NO_CLAIM_ALLOWED
```

---

## 2. Root architecture

Official Kenpachi root:

```text
C:\TACTICAL_CHESS_STUDIO\
```

Required root layout:

```text
C:\TACTICAL_CHESS_STUDIO\

  00_STUDIO_CONTROL\

  repos\
    games\
    apps\
    agents\
    shared\
    experiments\

  datasets\
  models\
  runs\
  archives\
  tools\
  inbox_import_quarantine\
  local_backups_optional\
  tmp\
```

Blocked:

```text
Do not import the old mixed TACTICAL_CHESS_STUDIO parent.
Do not use C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab\ as the Kenpachi repo target.
Do not place datasets, models, runs, archives, tools, apps, or agents inside TacticalChessPureLab.
```

---

## 3. GitHub repo placement

Repository:

```text
pierrelouisfradcourt-create/TacticalChessPureLab
```

Official clone target:

```text
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\
```

Codex must clone the whole repo. It must not recreate the repo by manually downloading individual source files.

Command pattern:

```powershell
git clone <repo-url> C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\
```

Post-clone verification:

```powershell
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
git rev-list --left-right --count origin/main...HEAD
```

Expected if using the currently verified pushed state:

```text
HEAD: 9a5cbe367803d7c306843dad9023f2824f00446e
origin/main: 9a5cbe367803d7c306843dad9023f2824f00446e
behind: 0
ahead: 0
```

---

## 4. Active repo internal placement

Everything that belongs to the GitHub repo remains under:

```text
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\
```

### 4.1 Repo root files

```text
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\README.md
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\AGENTS.md
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\Cargo.toml
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\Cargo.lock
```

### 4.2 Rust runtime and modules

Entrypoints:

```text
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\main.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\lib.rs
```

Engine:

```text
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\engine\mod.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\engine\engine.rs

C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\engine\action\mod.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\engine\action\action.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\engine\action\command.rs

C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\engine\board\mod.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\engine\board\board.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\engine\board\cell.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\engine\board\terrain.rs

C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\engine\entity\mod.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\engine\entity\stats.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\engine\entity\unit.rs

C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\engine\event\mod.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\engine\event\event.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\engine\event\event_queue.rs

C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\engine\turn\mod.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\engine\turn\turn_manager.rs
```

Chess:

```text
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\mod.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\castling_spec.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\chess960.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\chess_variant.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\decision.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\decision_controller_adapter.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\decision_trace.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\decision_trace_bridge.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\eval.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\fen.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\legal_action_adapter.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\move_features.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\opponent_response_mask.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\piece_kind.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\practical_policy.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\puzzle.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\root_decision.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\search.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\search_backend_adapter.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\search_diagnostics.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\search_diagnostics_accumulators.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\search_diagnostics_builders.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\search_mirror_ordering.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\search_root_ordering.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\transition_analysis.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\transition_interpretation.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\transition_reply.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\chess\uci.rs
```

Core:

```text
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\core\mod.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\core\action_id.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\core\action_mask.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\core\action_mask_provenance.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\core\deterministic.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\core\game_result.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\core\human_gate.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\core\ids.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\core\legal_action.rs
```

AI/env/agents/prototype/simulation/tournament/tool:

```text
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\ai\mod.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\ai\decision_controller.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\ai\policy_guide.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\ai\search_backend.rs

C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\env\mod.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\env\tactical_env.rs

C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\agents\mod.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\agents\neural_agent.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\agents\retrieval.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\agents\uci_agent.rs

C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\prototype\mod.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\prototype\minimal_ruleset.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\prototype\runtime_ruleset.rs

C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\simulation\mod.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\simulation\cross_test_runner.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\simulation\neural_tournament_runner.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\simulation\selfplay.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\simulation\simulation_runner.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\simulation\teacher_uci_runner.rs

C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\tournament\mod.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\tournament\elo.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\tournament\export.rs

C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\tool\mod.rs
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\src\tool\cli.rs
```

Runtime authority rules:

```text
src\engine\ = board/state/mutation/entities/events/turn
src\chess\ = chess rules/search/decision/FEN/UCI/policy
src\core\ = generic identity/HumanGate/ActionMask/LegalAction
src\ai\ = passive AI interfaces/contracts
src\env\ = tactical environment boundary
src\agents\ = internal game agents only, not studio agents
```

---

## 5. Python / ML code placement

```text
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\ml\
```

Important files:

```text
ml\dataset_loader.py
ml\export_dataset_check.py
ml\train.py
ml\infer_policy.py
ml\move_vocab.py
```

Rules:

```text
Python code stays in ml\.
Datasets do not go in ml\.
Models do not go in ml\.
Runs do not go in ml\.
```

---

## 6. Tests placement

```text
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\tests\
```

Rules:

```text
Rust integration tests -> tests\<name>.rs
Python tests -> tests\test_<name>.py
Fixtures -> tests\fixtures\
Test outputs -> runs\, never tests\
```

---

## 7. Repo docs vs studio docs

Repo docs:

```text
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\MASTER_DOCS\
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\docs\
```

Studio docs:

```text
C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\
```

Rule:

```text
If the document describes TacticalChessPureLab only -> repo docs.
If the document describes the full studio or Codex routing -> 00_STUDIO_CONTROL.
```

---

## 8. 00_STUDIO_CONTROL current unique-prefix topology

```text
C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\

  00_INDEX\
  01_MAPS\
  02_NAVIGATION\
  03_REGISTRIES\
  04_BOUNDARIES\
  05_STATUS\
  06_CODEX\
  07_FORMS\
  08_MIGRATION\
  09_CYBERDEFENSE\
  10_ROADMAP\
  11_PIPELINE_CORE\
  12_PIPELINE_OPENING_LEGACY\
  13_BOOTSTRAP_PROFILES\
```

This is the actual unique-prefix root directory set for `00_STUDIO_CONTROL` after the V1 topology migration.

Historical note:

```text
The pre-migration Studio Control root contained repeated numeric prefixes and non-numbered top-level folders.
That layout was migrated by STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md.
```

The current numbered directories must not be migrated, renamed, deleted, or reorganized without a separate HumanGate-approved migration task.

## 8.1 00_STUDIO_CONTROL routed file placement

```text
  01_MAPS\
    STUDIO_MAP.md
    PATH_CONTRACT.md
    CODEX_FILE_ROUTER.md
    GITHUB_DOWNLOAD_ROUTER.md
    LAB_LEGACY_BOUNDARY.md
    STUDIO_CONTROL_TOPOLOGY_FREEZE_V0.md
    STUDIO_OUTPUT_ROUTING_POLICY_V0.md

  02_NAVIGATION\
    STUDIO_SOURCE_ANCHORING_V0.md

  03_REGISTRIES\
    PROJECT_REGISTRY.md
    REPO_REGISTRY.md
    APP_REGISTRY.md
    AGENT_REGISTRY.md
    SHARED_LIB_REGISTRY.md
    DATASET_REGISTRY.md
    AGENT_DATASET_LINKS.md
    MODEL_REGISTRY.md
    RUN_REGISTRY.md
    TOOL_REGISTRY.md
    ARCHIVE_REGISTRY.md

  04_BOUNDARIES\
    HUMANGATE_POLICY.md
    DATA_BOUNDARY.md
    SECRET_BOUNDARY.md
    NETWORK_BOUNDARY.md
    PATH_BOUNDARY.md
    CLAIM_MATRIX.md
    REPO_HYGIENE.md
    WORKSPACE_HYGIENE.md

  06_CODEX\
    PROMPT_REVIEW.md
    PATCH_REVIEW.md
    PATCH_COST_REVIEW.md
    CODEX_LEVELS.md
    CODEX_STOP_CONDITIONS.md
    CODEX_REPORT_TEMPLATE.md

  08_MIGRATION\
    MIGRATION_GUARD.md
    SYSTEM_BASELINE.md
    BOOTSTRAP_REPORT_TEMPLATE.md

  13_BOOTSTRAP_PROFILES\
    PROFILE_INDEX.md
    KENPACHI\
      PIPELINE_OPENING_CHECKLIST.md

  09_CYBERDEFENSE\
    CYBERSENTINEL.md
    CYBERSENTINEL_SIGNALS.md
    CYBERSENTINEL_DATA_BOUNDARY.md

  10_ROADMAP\
    ROADMAPATCH_MASTER.md
    FUTURE_PROJECTS.md
```

Routing rule:

```text
Root-level duplicate canonical Markdown copies are blocked.
New root-level Markdown files under 00_STUDIO_CONTROL are blocked unless explicitly routed and HumanGate-approved.
Use STUDIO_CONTROL_TOPOLOGY_FREEZE_V0.md and STUDIO_OUTPUT_ROUTING_POLICY_V0.md as the current topology and routing authorities.
Use STUDIO_CONTROL_TOPOLOGY_MIGRATION_V1.md as the current physical topology evidence.
```

---

## 9. Repos apps / agents / shared / experiments

```text
C:\TACTICAL_CHESS_STUDIO\repos\apps\<AppName>\
C:\TACTICAL_CHESS_STUDIO\repos\agents\<AgentName>\
C:\TACTICAL_CHESS_STUDIO\repos\shared\<LibName>\
C:\TACTICAL_CHESS_STUDIO\repos\experiments\<ExperimentName>\
```

Rules:

```text
CyberSentinel -> repos\agents\CyberSentinel\
StudioLauncher -> repos\apps\StudioLauncher\
Shared schemas -> repos\shared\<LibName>\
Prototypes -> repos\experiments\<ExperimentName>\
```

Blocked:

```text
Do not create CyberSentinel inside TacticalChessPureLab\src\agents\.
Do not put apps or agents inside TacticalChessPureLab.
Do not create shared libs without HumanGate.
```

---

## 10. Datasets

```text
C:\TACTICAL_CHESS_STUDIO\datasets\
```

Current project scope:

```text
datasets\chess\...
datasets\tactical_core\...
datasets\cyberdefense\future_only\...
datasets\telemetry_sanitized\future_only\...
datasets\blocked_future_sensitive\...
datasets\quarantine\...
```

Rules:

```text
Current player data: NOT_FOUND
Current payment data: NOT_FOUND
Cyberdefense datasets: DOCUMENTED_ONLY future
Chess datasets: PASSIVE/BLOCKED
Training: BLOCKED
Dataset promotion: BLOCKED
```

No dataset goes inside a repo.

---

## 11. Models

```text
C:\TACTICAL_CHESS_STUDIO\models\
```

Rules:

```text
Model files (*.pt, *.pth, *.ckpt, *.safetensors, *.onnx) go to models\.
Never into TacticalChessPureLab.
Never into repos\agents\.
Model present on disk != approved.
Model approved != claim.
latest/best != truth.
Activation = BLOCKED unless HumanGate.
```

---

## 12. Runs

```text
C:\TACTICAL_CHESS_STUDIO\runs\
```

Examples:

```text
runs\chess\local\
runs\chess\benchmark_observation\
runs\chess\conversion_suite_observation\
runs\bootstrap\kenpachi\
runs\bootstrap\system_update\
runs\bootstrap\driver_update\
runs\ci_observation\github\
runs\cyberdefense\future_only_or_local_audit\
```

Rules:

```text
runs = observation.
Never proof alone.
Never dataset automatically.
Never model automatically.
```

---

## 13. Archives

```text
C:\TACTICAL_CHESS_STUDIO\archives\
```

Examples:

```text
archives\github\workflow_logs\
archives\github\workflow_artifacts\
archives\github\patches\
archives\github\pull_requests\
archives\github\issues\
archives\migration\kenpachi_transfer_packages\
archives\reports\codex\
archives\reports\chatgpt_navigator\
archives\bundles\
```

Rules:

```text
Archive = PASSIVE.
Log/report/benchmark = observation.
Bundle = restore method, not runtime truth.
```

---

## 14. Tools

Installed tools use Windows/vendor paths.

```text
Git/Rust/Python/Codex/NVIDIA/AMD/MSI/VPN -> system/vendor/user install paths
```

Studio tools folder contains only control material:

```text
C:\TACTICAL_CHESS_STUDIO\tools\

  manifests\
  version_reports\
  installers_cache_optional\
  scripts\
  wrappers\
```

Blocked:

```text
Do not copy Program Files into studio.
Do not copy .cargo/.rustup into studio.
Do not install Python/Git/Rust into tools\ as fake Program Files.
```

---

## 15. Python / venv / Rust environment

Hard rule:

```text
Python import: BLOCKED
venv import: BLOCKED
.venv312 import: BLOCKED
site-packages import: BLOCKED
pip cache import: BLOCKED
Cargo target import: BLOCKED
Rust cache import: BLOCKED
```

On Kenpachi:

```text
Install Python cleanly.
Clone repo.
Create fresh .venv312 inside TacticalChessPureLab.
Install dependencies from repo manifests.
Install Rust cleanly.
Let Cargo rebuild target\.
```

---

## 16. lab legacy

Legacy repo-local lab surface:

```text
C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\lab\
```

Classification:

```text
lab\reports\ -> PASSIVE
lab\smoke_benchmark\ -> PASSIVE
lab\reverse_dataset\ -> PASSIVE/BLOCKED for training
lab\ACTIVE_DATASET.txt -> PASSIVE pointer
lab\latest*.json -> PASSIVE pointer
```

Rule:

```text
Do not break lab\.
Do not treat lab\ as final studio storage.
Do not promote lab\ outputs to dataset/model/claim.
```

---

## 17. Absolute paths and environment variables

Blocked legacy path:

```text
C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab\
```

Recommended environment variables:

```text
TCS_STUDIO_ROOT=C:\TACTICAL_CHESS_STUDIO
TCS_REPO_ROOT=C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab
TCS_STOCKFISH_PATH=C:\TACTICAL_CHESS_STUDIO\tools\vendor_tools\stockfish\stockfish.exe
TCS_RUNS_ROOT=C:\TACTICAL_CHESS_STUDIO\runs
TCS_DATASETS_ROOT=C:\TACTICAL_CHESS_STUDIO\datasets
TCS_MODELS_ROOT=C:\TACTICAL_CHESS_STUDIO\models
TCS_ARCHIVES_ROOT=C:\TACTICAL_CHESS_STUDIO\archives
```

---

## 18. GREEN / YELLOW / RED rails

GREEN:

```text
clone repo into repos\games\
write 00_STUDIO_CONTROL docs
write manifests
write reports
classify unknown files into quarantine
rebuild env
install official tools
write outputs to runs\
```

YELLOW:

```text
write inside active repo
UAC/admin
MFA/login
VPN missing
BIOS/firmware update
copy legacy dataset
move raw dataset to curated
associate agent to dataset
run targeted tests
```

RED:

```text
import old mixed parent
copy venv/.venv312/site-packages
copy target/cache
place dataset/model inside repo
training
dataset reset
dataset label promotion
model promotion
runtime authority change
Chess960 activation
DecisionController activation
ActionMask authority expansion
CI payment
auto-fix security
secret printing
destructive deletion
```

---

## 19. Codex read order on Kenpachi

```text
1. C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\00_INDEX\READ_FIRST.md
2. C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\01_MAPS\STUDIO_MAP.md
3. C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\01_MAPS\CODEX_FILE_ROUTER.md
4. C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\01_MAPS\GITHUB_DOWNLOAD_ROUTER.md
5. C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\04_BOUNDARIES\HUMANGATE_POLICY.md
6. C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\04_BOUNDARIES\DATA_BOUNDARY.md
7. C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\04_BOUNDARIES\CLAIM_MATRIX.md
8. C:\TACTICAL_CHESS_STUDIO\00_STUDIO_CONTROL\13_BOOTSTRAP_PROFILES\KENPACHI\PIPELINE_OPENING_CHECKLIST.md
9. C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\README.md
10. C:\TACTICAL_CHESS_STUDIO\repos\games\TacticalChessPureLab\AGENTS.md
```

---

## 20. Codex final report fields

Each Codex task must end with:

```text
commands_run:
files_created:
files_modified:
files_copied:
repo_mutation_status:
validation:
skipped_validation:
risks:
software_verdict:
evidence_verdict:
claim_verdict:
```

---

## 21. Final verdicts

```text
software_verdict: AAA_CODEX_PLACEMENT_CONTRACT_COMPLETE
evidence_verdict: STUDIO_ARCHITECTURE_ROUTER_DEFINED_NO_REPO_MUTATION
claim_verdict: NO_CLAIM_ALLOWED
```
