# STUDIO_MAP

status: DOCUMENTED_ONLY

## Official Kenpachi Tree

```text
C:\TACTICAL_CHESS_STUDIO\
  00_STUDIO_CONTROL\
  repos\
    games\
      TacticalChessPureLab\
      ChessTCG\
    apps\
    agents\
    shared\
  archives\
  datasets\
  models\
  runs\
  tools\
  tmp\
```

## Role

TacticalChessPureLab is the first active game repo in the Kenpachi studio layout.
ChessTCG is a documentation-only game project shell for the future Chess TCG project.

## Studio-Wide Agentic Architecture

`00_STUDIO_CONTROL/01_MAPS/STUDIO_AGENTIC_PYRAMID_ARCHITECTURE_V0.md` records the Studio Agentic Pyramid as a non-runtime architecture map.

It is `DOCUMENTED_ONLY`: it does not activate agents, autonomy, runtime behavior, training, benchmarks, datasets, models, publishing, or claims.

## Boundaries

- apps, agents, datasets, models, runs, archives, tools, and tmp must not be placed inside TacticalChessPureLab.
- TacticalChessPureLab remains a game repo, not a mixed studio parent.
- Do not import the old mixed TACTICAL_CHESS_STUDIO parent blindly.
- Selected historical artifacts may be restored only through reviewed archive or bundle paths.
- `00_STUDIO_CONTROL/` is a local-only control cockpit by HumanGate decision. It is intentionally untracked; GitHub presence is not expected, and `?? 00_STUDIO_CONTROL/` is an `INFO_ONLY`/`PASSIVE` signal rather than a critical sync defect.
- Git tracking, commit, push, branch, or PR actions for `00_STUDIO_CONTROL/` remain `BLOCKED` unless HumanGate explicitly authorizes them later.

## Control Room World Map

A separate `WORLD_MAP.md` was not created because this file already owns the routed `01_MAPS` map role and the noise gate blocks duplicate world maps.

Surface names in machine-facing records follow `STUDIO_OUTPUT_ROUTING_POLICY_V0.md`: `active_runtime_code`, `tests`, `artifacts_runtime_outputs`, `canonical_docs`, `roadmap_docs_only`, and `inference`. Human-readable summaries may say `runtime outputs` for `artifacts_runtime_outputs`, but aliases do not create new surfaces.

| Surface | Current map | Status | Notes |
| --- | --- | --- | --- |
| active runtime code | `repos/games/TacticalChessPureLab` and other repo runtime paths are reference-only for this task. | PASSIVE | No runtime code was modified or activated by the control-room loop. |
| tests | Repo test paths are reference-only unless a later task charter authorizes test work. | PASSIVE | No tests were changed by this docs-only layer. |
| runtime outputs | `outputs`, `runs`, `runtime_outputs`, datasets, models, and generated artifacts are passive unless explicitly promoted by HumanGate. | PASSIVE | Existing untracked outputs remain floating/passive unless registered later. |
| canonical docs | `00_STUDIO_CONTROL` is the active Studio Control surface. | DOCUMENTED_ONLY | The control-room loop is a canonical-doc workflow layer only. |
| roadmap docs only | `00_STUDIO_CONTROL/10_ROADMAP` contains planning material. | DOCUMENTED_ONLY | Roadmap items do not authorize runtime claims or activation. |
| inference | Local LLM, model-assisted analysis, and Codex reasoning are candidate/evidence-bound surfaces. | PASSIVE | Inference does not decide alone. |

## Local Control Room State

| Path | Role | Git policy | GitHub presence | Status | Warning level | Rule |
| --- | --- | --- | --- | --- | --- | --- |
| `00_STUDIO_CONTROL/` | local-only control cockpit | LOCAL_ONLY_UNTRACKED | NOT_EXPECTED | PASSIVE | INFO_ONLY | Do not git add, commit, push, or track unless HumanGate explicitly authorizes it. |

Local cleanliness is still the target: duplicate docs, placeholder records, invalid statuses, unrouted local control files, missing owner/consumer/route evidence, runtime changes, test or CI changes, and model/dataset/LoRA changes remain blocked or unknown as applicable.

## Known Agents

- `local_llm_student`: candidate cartographer only; no truth authority.
- `codex_teacher`: evidence-bound verifier/corrector; no final truth without evidence.
- `local_llm_retry`: revised candidate only.
- `codex_final_validation`: evidence-bound final validation pass.
- `HumanGate`: final authority.

Authoritative agent details live in `00_STUDIO_CONTROL/03_REGISTRIES/AGENT_REGISTRY.yaml`.

## Known Loops

- `LLM_CODEX_CONTROL_ROOM_LOOP_V0`: local LLM -> Codex teacher -> local LLM retry -> Codex final validation -> HumanGate.

Authoritative loop details live in `00_STUDIO_CONTROL/03_REGISTRIES/LOOP_REGISTRY.yaml`.

## Known Gaps

- Required root-level sources `AGENTS.md`, `GPT_NAVIGATOR_CODEX_PROMPT_GATE_V0.md`, `GPT_NAVIGATOR_PROJECT_INSTRUCTIONS_V0.md`, and `GPT_NAVIGATOR_REPO_NOTICE_V0.md` were not found at repo root during this task.
- Root git status before edits showed untracked `00_STUDIO_CONTROL`, `document_work`, and `tools`.
- Several runtime/output-like folders exist at the workspace root; they were not promoted, moved, deleted, or archived.

## Floating Or Unanchored Items

Floating detection reports items that lack route, owner, consumer, status, evidence, or reason for existence. The current control-room layer reports rather than mutates them in `00_STUDIO_CONTROL/04_BOUNDARIES/REPO_HYGIENE.md`.

## Noise Gate Policy

No new floating item may be created. Any new or updated documentation must be routed by `STUDIO_OUTPUT_ROUTING_POLICY_V0.md`, linked from this control surface or a relevant index, registered when needed, statused with the allowed taxonomy, and bounded by evidence.
