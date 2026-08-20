# Rocky Variant Freeze (Issue #22)

## Scope

This document defines a documentation-only freeze for Rocky in this repository. It is a strategy freeze for variant policy and integration sequencing, **not a runtime implementation plan**. The plan explicitly forbids runtime code changes and chess960 gameplay implementation at this stage.

- Source issue: `#22 — Codex: Freeze Rocky Classical + Chess960-ready development plan`
- Current status: documentation-only planning and constraints
- Enforced constraint: no changes to runtime source (`src`, `ml`, `scripts`, or generated artifacts) under this plan

## 1) Doctrine: Rocky one-engine, two-variant

Rocky will run on a single chess engine and game stack, with exactly two variant identities:

1. **`classical`** — primary, active, shipped variant
2. **`chess960`** — future, experimental, pre-activated variant track

### Principles

- One runtime engine remains the authoritative implementation baseline.
- Variant behavior is selected by **metadata/state** (not by separate runtime binaries).
- Classical remains the operational default and the only variant with full active obligations.
- Chess960 work is constrained to preparation and planning so this repository can preserve stability while unblocking future enablement.

Boundary note: Rocky is a product/runtime actor and data producer only. Rocky may play games, produce traces, and emit match outputs. Rocky is not a studio agent, not a reader, not an analyst, not a director, not StudioPilot, and not HumanGate. Rocky output may be normalized into `ROCKY_MATCH_SUMMARY` or equivalent match summaries as context records only; those summaries do not tune Rocky, mutate rules, prove strength, authorize claims, promote variants, or activate future readers. Any future explanation surface over Rocky traces is separate from Rocky, non-authoritative, and cannot modify runtime, rules, claims, PR state, roadmap, or HumanDecision. Rocky batch match production means gameplay execution that emits match data; it is not an autonomous tester, not an analyst, and not a control-plane actor. All interpretation, promotion, claim, merge, roadmap, readiness, and activation decisions remain outside Rocky and require HumanGate / HumanDecision.

## 2) Variant assignment and defaults

### Classical (active/default)

- Default mode for all default UX, benchmarks, and automation flows.
- All existing behavior, scripts, and docs should remain unchanged under this freeze.
- Every current integration surface that assumes standard chess remains valid.

### Chess960 (future/experimental)

- Marked as “future” and “experimental” in docs and metadata.
- No new game logic is executed from docs-only changes; no user-facing activation in runtime.
- Future scope is prepared via clean metadata interfaces and isolated generation design only (no implementation in this freeze).

## 3) Invariant and state-based decision logic

Decision-making in this freeze is restricted to invariant/state transitions, not hard-coded path checks.

### Decision invariant

For any given move sequence or game event:

1. Decision context derives from current game state + declared variant metadata.
2. Variant choice is represented as normalized metadata read from state/config, then resolved into execution policies via declared constraints.
3. Engine calls remain single-source but variant-sensitive behavior is modeled through documented boundaries only (no code changes now).

### Decision state contract (documentation)

- `variant_state`: `classical` or `chess960`
- `active_ruleset`: pointer/reference to rules bundle used for evaluation and legality interpretation
- `opening_policy`: must be `null` for frozen runtime; no opening script dependency in this freeze
- `generation_profile`: where variant-specific generation behavior is described, not executed

## 4) Opening script dependency prohibition

No opening-script dependency is allowed during this freeze.

### What this means

- No script-driven mode switching for variant behavior.
- No assumptions that move-opening lists imply legality or variant selection.
- No frozen branching into experimental behavior based on opening phase markers.
- All strategy and variant transitions are documented as state/metadata transitions only.

## 5) No battler runtime in this freeze

Rocky battler/runtime extensions are explicitly out of scope.

### Exclusions

- No battler runtime, no effect-resolution system rollout.
- No card/effect mutation.
- No new rule-change engine.
- No search/eval/root decision runtime changes.

## 6) Current active systems (frozen baseline)

The active, unchanged baseline remains the existing chess stack and associated orchestration:

- Standard chess legality + move generation pipeline
- Existing search / evaluation / root decision flow
- Existing dataset generation and validation tools
- Existing benchmark execution and scoring pipeline
- Existing CLI + automation entry points and experiment registry workflows

## 7) Required additions to be documented (planned interfaces)

These are documentation requirements to prepare later implementation while keeping this freeze runtime-safe:

### 7.1 CastlingSpec

A compact castling specification model describing:

- Side context
- Castling-right eligibility constraints
- Piece placement interpretation for classical compatibility
- Future extension fields for chess960 castling destination/source semantics

### 7.2 ChessVariant metadata

A minimal metadata model (state-level) to describe variant class and policy context:

- `variant_id`: `classical` | `chess960`
- `variant_status`: `active` | `experimental`
- `capabilities`: capability flags used by documentation and tooling
- `version`: metadata schema version for forward compatibility
- `invariant_profile`: references for decision constraints

### 7.3 Isolated chess960 generator

A documented, isolated generator seam for future work:

- Separate from live runtime loops
- Produces and stores validated variant-specific setup samples
- Compatible with a non-productive path in this freeze
- No integration into live play until a later issue

## 8) Variant freeze sprint plan

### Sprint A — Canonicalization and Doctrine

- Publish this doctrine and freeze boundaries.
- Formalize default/classical status and experimental/chess960 status.
- Record all runtime prohibition list and invariants.

### Sprint B — Metadata + interface schema draft

- Define authoritative docs for:
  - `CastlingSpec`
  - `ChessVariant` metadata
  - state contract for invariant-based decisions
- Publish migration notes for docs and tooling owners.

### Sprint C — Isolation plan for chess960 generator

- Define generator boundaries (input/output formats, validation checks, reproducibility, storage location).
- Add non-executing documentation for how it plugs into existing pipelines.
- Keep execution disabled in code paths.

### Sprint D — Validation & sign-off

- Execute review pass against hard constraints.
- Confirm no code is changed.
- Finalize done criteria and risk acceptance.

## 9) Validation gates (documentation freeze)

Before closing this freeze, confirm each gate verbally in the docs log:

1. **Scope gate**: Only documentation touched; runtime files unchanged.
2. **Doctrine gate**: One-engine/two-variant model explicitly stated and signed by maintainers.
3. **Default gate**: Classical is default and active; chess960 explicitly experimental/future.
4. **Invariant gate**: Decision logic described as state-based (no opening-script dependency).
5. **Runtime exclusion gate**: search/eval/root_decision/search/runtime remains unchanged.
6. **Interface gate**: `CastlingSpec`, `ChessVariant`, and isolated chess960 generator are fully specified.
7. **Risk gate**: documented risks and mitigation have owners and review notes.
8. **Release gate**: DOD checklist complete.

## 10) Hard constraints

- **Docs-only change only**: no source edits in runtime directories.
- **No Chess960 gameplay implementation**: no active move-generation branch for chess960.
- **No search/eval/root_decision edits**.
- **No battler runtime additions**.
- **No card/effect/rule mutations**.
- **No dependency on opening scripts for variant decisions**.
- **No behavior change in current classical flow**.

## 11) Risks

1. **Scope drift**: documentation can be interpreted as implementation-ready too early.
   - Mitigation: explicit “implemented? no” markers on all future-facing sections.
2. **Variant ambiguity**: classical/chess960 semantics may overlap without a strict state contract.
   - Mitigation: canonical metadata vocabulary with required defaults.
3. **Premature integration**: accidental runtime wiring before interfaces stabilize.
   - Mitigation: hard constraint requiring code owner review before any non-doc PR touches runtime.
4. **Benchmarks misalignment**: users may run experiments assuming chess960 is active.
   - Mitigation: docs-only warning banners in project-facing docs, including default behavior.

## 12) Definition of done

- This document exists at `MASTER_DOCS/09_ROCKY_VARIANT_FREEZE.md`.
- It explicitly contains all sections required by Issue #22.
- It states the active/default variant and experimental/future variant clearly.
- It enumerates all hard constraints and required additions.
- It documents the no-opening-script and no-battler-runtime restrictions.
- It lists sprint plan, validation gates, risks, and completion criteria.
- No runtime files were changed.
- Validation scope remains `docs-only` and no tests are executed.

## 13) Closure statement

Issue #22 is treated as a **documentation freeze**. The project maintains existing chess behavior during this phase and records a clean, reviewable path for future two-variant support without introducing runtime variance.

## 14) Follow-up CampaignPlan Reference

`docs/control-plane/CHESS960_CAMPAIGNPLAN_DRAFT_V0.md` is the current control-plane planning draft for Chess960 sequencing after the Rocky / Chess960 read-only audit.

`docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md` records dataset-safe Rocky trace observation guidance only; it does not activate Chess960, runtime evidence, datasets, training, or claims.

This follow-up remains docs-only. It does not implement Chess960, does not authorize runtime edits, does not authorize FEN or castling changes, does not authorize search or neural changes, does not authorize ML or training changes, does not authorize benchmarks, and does not authorize readiness or strength claims.

HumanGate remains mandatory before any future runtime, test, FEN, castling, search, neural, ML, benchmark, ready, merge, or claim decision.

claim_verdict: NO_CLAIM_ALLOWED
