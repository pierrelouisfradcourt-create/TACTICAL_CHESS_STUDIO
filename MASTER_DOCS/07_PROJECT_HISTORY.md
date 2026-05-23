# Project History

## Governance note

Historical governance anchors still matter:
- legacy `V2_SOURCE_OF_TRUTH`
- older `PROJECT_HISTORY`

But they are historical anchors, not the active documentation surface.

Active documentation surface:
- `MASTER_DOCS/00_EXEC_SUMMARY.md`
- `MASTER_DOCS/01_CURRENT_STATE.md`
- `MASTER_DOCS/02_COMMAND_CHEATSHEET.md`
- `MASTER_DOCS/03_KNOWN_ISSUES.md`
- `MASTER_DOCS/04_BENCHMARK_LEDGER.md`
- `MASTER_DOCS/05_ARCHITECTURE.md`
- `MASTER_DOCS/06_DECISION_LOG.md`
- `MASTER_DOCS/07_PROJECT_HISTORY.md`
- `MASTER_DOCS/08_REPRISE_PROMPT.md`
- `MASTER_DOCS/09_ROCKY_VARIANT_FREEZE.md`
- `MASTER_DOCS/10_AUTOMATION_EVIDENCE_PLANE.md`
- `MASTER_DOCS/11_GPT55_BROWSER_REPRISE_PROMPT.md`
- `MASTER_DOCS/HYBRID_GAME_AI_PLATFORM_PLAN.md`
- `MASTER_DOCS/AAA_TACTICAL_CORE_ARCHITECTURE.md`

Rule:
- code and latest committed artifacts beat historical docs

## Phase 0 - Pre-hygiene studio

The wider workspace mixed engine work, AI experiments, notes, prompts, packs, and backups.
The long-term direction was already stable:
- Rust runtime
- teacher-driven dataset generation
- Python training and inference
- tournament evaluation

The weakness was traceability, not ambition.

Recovered local share extracts from the same early wave add useful nuance about this phase:
- `Tactical Chess Studio` confirms the broader studio framing before PureLab was isolated
- `Structuration IA Player Trainer` shows that role separation between player, trainer, and orchestration layers was already being explored
- `IA alliee et entraineur` confirms an early coach/product branch existed, but it did not become current runtime truth
- `Neural Chess System Review` and `Improving Neural Chess Agent` show that neural quality concerns were present from the beginning, not only after V2 cleanup

Historical reading:
- the project started with both lab and product instincts
- the active repo later kept the lab path
- product/deployment and database branches remained secondary or out-of-core

## External discussion artifacts (inputs)

This repo includes (or references) long-form external discussions that were used to steer work.
They are useful as "why we did this" context, but they are not authoritative unless the result is visible in:
- source code (`src/`, `ml/`)
- benchmark artifacts (`lab/reports/`)
- SSOT docs (`MASTER_DOCS/00..08`)

Current notable external artifacts:
- `C:\\Users\\wazou\\Desktop\\grosgpt.txt` (1-day deep discussion; contains "MEGAPATCH V12 search.rs only" doctrine and benchmark-first discipline)
- `C:\\Users\\wazou\\Downloads\\AAA_TACTICAL_CORE_ARCHITECTURE.md` (strategic roadmap; explicitly not proof of implementation)
- `lab/tmp_share_69ee0685.html` (`ChatGPT - Chess Move Analysis`, raw share export)
- `lab/tmp_share_69ee0695.html` (`ChatGPT - Audit moteur de recherche`, raw share export)
- `MASTER_DOCS/AUTOBATTLER_RELECTURE_2026_04_26/` (extracted idea dump / product-roadmap material, non-runtime truth)
- `lab/project_genesis/` (raw genesis extraction and split source material)

Key constraints extracted from these artifacts:
- avoid repo-wide "megapatches"; prefer bounded changes inside one domain/module at a time
- treat benchmarks as the forcing function (code cleanliness without benchmark evidence is not a strength claim)
- do not confuse long-term architecture roadmaps with current code truth
- preserve product/autobattler/RNG/card-game ideas as idea dump unless a dedicated implementation branch makes them code truth

Notes on `grosgpt.txt` quality:
- treat it as a raw capture that degrades near the end: the last ~10% includes repeated recap blocks (verbatim repeats of earlier passages)
- when extracting constraints, prefer earlier occurrences and ignore later repetitions unless they add new concrete, repo-verifiable details

## Phase 1 - PureLab becomes the active lab

`TacticalChessPureLab` became the real working lab.
The core pipeline formed around:
- Rust teacher generation
- Python training
- Python inference bridge
- Rust tournament runtime

This phase also implies a narrowing decision:
- keep the chess/ML lab as the main truth surface
- do not let peripheral service, deployment, or PostgreSQL branches define the active repo story

## Phase 2 - Drift and false confidence

The project accumulated technical and scientific debt.

Runtime drift:
- fragile Python path assumptions
- bridge could appear healthy when it was not
- neural tournament could silently degrade

Dataset drift:
- large datasets existed
- structural quality was poor
- provenance from dataset to checkpoint was weak

## Phase 3 - V2 cleanup

On 2026-04-16 and 2026-04-17 the lab was cleaned in place.

Major outcomes:
- quarantine for misleading files
- stronger dataset validation
- stronger training provenance
- clearer source-of-truth rules

## Phase 4 - First healthy V2 source

Teacher generation was improved to reduce repeated trajectories.
This produced the first frozen V2 baby-quality dataset:
- `lab/datasets/teacher_v2_baby_source_seed42_g12.jsonl`

Historical importance:
- Baby V2 was the first clean frozen scientific baseline
- it established a reference point for traceable training work before the later adaptive-dataset reframing
- it remains a baseline, not the current active dataset truth

## Phase 5 - First traceable baby run

The project trained a canonical baby run:
- `lab/runs/run_20260417_001525_baby_v2_seed42_g12`

This established a traceable end-to-end line from dataset to checkpoint.

Historical reading:
- Baby V2 / V2 should be preserved as the first clean scientific baseline era
- that baseline does not by itself describe the current active learning architecture

## Phase 6 - Benchmark truth recovery

The project hardened benchmark interpretation.
Contamination tracking and cleaner benchmark outputs made "usable benchmark truth" possible.

## Phase 7 - Runtime safety recovery

Setup safety improved:
- invalid placements fail fast
- out-of-bounds setup is rejected
- duplicate collisions are rejected

## Phase 8 - True-chess recovery

The runtime moved from a chess-flavored system toward actual chess.
Recovered rule families include:
- castling
- en passant
- underpromotion
- fifty-move rule
- threefold repetition
- insufficient material

## Phase 9 - Conversion recovery

After rules recovery, the main problem became practical non-conversion.
Symptoms:
- sterile games
- too many draws
- weak neural outcomes
- likely passivity in search or selection

## Phase 10 - Pedagogy curation layer

The repo added a pedagogy database workflow:
- candidate compilation
- triage
- promoted pack

This exposed an important truth boundary:
"curation artifact" and "trainable ML dataset" are not automatically the same thing.

## Phase 11 - AAA runtime bridge

Around 2026-04-22 the project connected decision traces to the teacher and trainer.
AAA metadata now includes alternatives, decision scores, confidence, and search-use metadata.

This was a meaningful capability increase, but not a proof of strength.

## Phase 12 - Current state before adaptive reframing

As of 2026-04-24:
- the active dataset pointer now targets a trainable JSONL, not a CSV
- the latest retained promoted run is `run_20260422_162007_promoted_pedagogy_v1`
- the strongest open problem is still conversion
- the active semantic data problem is dirty conversion labeling
- the active scientific problem is proving useful gains instead of narrating them

This phase is now historical.
It should not be read as the current active dataset shape.

## Phase 13 - Adaptive learning loop becomes the new framing

As of 2026-04-25, the repo framing moved again.

The active project is no longer described only as:
- chess engine
- dataset
- trainer
- benchmark

It is now described as an adaptive learning loop:

`play -> detect weakness -> log -> cluster -> prioritize -> train -> retrieve -> improve`

Confirmed direction changes in the active docs:
- shared practical policy moved closer to the center of runtime truth
- tactical heuristics and neural rerank were tied together more explicitly
- reverse dataset memory and weakness logging became first-class systems
- priority training queue and retrieval-assisted move selection became part of the current project story
- the active dataset pointer now resolves to an adaptive dataset root under `lab/dataset`
- the project moved away from a purely static single-JSONL training story

Current active learning architecture includes:
- `lab/reverse_dataset/weakness_log.jsonl`
- priority training queue
- reverse dataset positives / negatives / mirror samples
- retrieval-assisted move selection
- VLEF execution rule for stable Windows Python invocation

Important caveat:
- this is a real shift in project framing
- it is not yet proof that the adaptive loop improves playing strength over time

## Static-to-adaptive reconciliation

Historical V2 / Baby truth:
- frozen JSONL dataset
- traceable baby run
- first clean scientific baseline

Current active truth:
- active dataset pointer resolves to `lab/dataset`
- training can operate from an adaptive dataset root, not only a single JSONL
- `lab/reverse_dataset/` is now part of the active learning architecture
- weakness logging, prioritization, and retrieval are active operational systems

Interpretation:
- Baby V2 remains historically important
- Baby V2 is not the current active source-of-truth dataset shape

## Historical Claims Superseded

| Historical claim | Preserve as history | Current active correction |
| --- | --- | --- |
| Baby V2 / V2 is the main live dataset truth | Yes | Baby V2 is the first clean frozen scientific baseline, but the active dataset now resolves to `lab/dataset` |
| Older governance docs are the source of truth | Yes | `V2_SOURCE_OF_TRUTH` and older `PROJECT_HISTORY` remain governance anchors, but active docs are `MASTER_DOCS/00..08` |
| Training story is mainly static JSONL based | Yes | The project moved toward an adaptive dataset root under `lab/dataset` plus `lab/reverse_dataset` |
| Latest benchmark wording can be inherited from older successful notes | Yes | The latest committed benchmark artifact can be failed and must override older success wording |
| Conversion suite implies strength | Yes | Conversion suite is a targeted metric, not an Elo claim |
| FEN output is full runtime truth | Yes | FEN serialization is not full runtime truth when en-passant and move clocks are normalized |

## Remaining Proof Gaps

- the latest benchmark artifact may be failed and must override older success wording
- the adaptive loop is not yet proven by repeated Elo gain or repeated error reduction
- the conversion suite is targeted, not Elo
- FEN serialization is not full runtime truth if en-passant or move clocks are normalized
- AAA remains operational plumbing, not proven strength gain

## Phase 14 - Automation and evidence-plane bootstrap

As of 2026-05-03 and 2026-05-04, the project added and closed the first distinct automation/evidence-plane gate sequence.

This phase did not replace the chess/AI/product roadmap. It exists to make future work auditable.

Confirmed sequence:

- PR-00A bootstrapped repo trust-root policies.
- PR-00B documented no-code / Supabase as registry, cockpit and decision surface, not proof.
- PR-00C documented n8n as fail-closed orchestration entry, not proof.
- PR-01 added canonical mechanical CI.
- PR-02 created the immutable run bundle contract under `lab/run_contracts/`.
- PR-03 added the mechanical parser plus three verdicts.
- PR-04 added input-boundary and tampering gates.
- PR-05 added claim/data gates and merged as PR #52, commit `16718d8979bffa8feda6f42799118d551f6a1a3f`.
- PR-06 wired evidence-plane gates into CI example-mode.
- PR-07 added a local GPT-5.5 structured audit scaffold and merged as PR #55, commit `95e53752686eb049267b22d7801c45ab1e500429`.

The operating model changed from:

```text
ChatGPT -> copy/paste -> Codex -> uncertainty
```

to:

```text
roadmap -> bounded ticket -> Codex worker -> diff/report -> local validation -> CI -> GPT-5.5 audit -> human decision -> ledger/docs update
```

Key doctrine:

- Codex implements.
- Scripts and CI verify mechanically.
- GPT-5.5 audits independently.
- Human decides merge, freeze, claim, and promotion.
- Browser audit can help, but it is not canonical evidence.
- `latest.json` is a pointer only and never proof.
- PR-02 through PR-06 are the minimal evidence-plane foundation, not scientific evidence.
- PR-07 is a structured audit scaffold only.
- PR-07 does not call the OpenAI API, wire live GPT audit, establish truth, override BLOCKED, increase claim scope, authorize merge, authorize promotion, or authorize claims.
- PR-07 ended with `software_verdict=AUDIT_LAYER_ADDED`, `evidence_verdict=STRUCTURED_AUDIT_ONLY`, and `claim_verdict=NO_CLAIM_ALLOWED`.
- The full Research OS V9.2 is still not complete.

This phase also clarified the relationship with long-term architecture:

- evidence-plane PR-02 to PR-06 landed as the minimal foundation before high-speed engine/neural/product changes resumed;
- PR-07 added the local audit scaffold needed before any later live GPT integration;
- `HYBRID_GAME_AI_PLATFORM_PLAN.md` remains the implementation roadmap for engine/search/neural/training/evaluation;
- `AAA_TACTICAL_CORE_ARCHITECTURE.md` remains the long-term product/runtime destination;
- generic tactical core must grow beside chess, not through a destructive rewrite.
