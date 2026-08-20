# Decision Log

## 2026-04-16 to 2026-04-17

Decision:
- treat `TacticalChessPureLab` as the active lab

Reason:
- the workspace had too many branches of truth

Impact:
- active authority narrowed to one repo root

## 2026-04-16 to 2026-04-17

Decision:
- quarantine noisy and duplicate outputs instead of deleting them

Reason:
- preserve history without letting old files pretend to be current truth

Impact:
- archive stays useful for forensics
- active repo became less misleading

## 2026-04-16 to 2026-04-17

Decision:
- gate datasets with stronger validation

Reason:
- earlier datasets created false confidence through row count alone

Impact:
- provenance and dataset health became first-class constraints

## 2026-04-17

Decision:
- freeze the first V2 baby-quality dataset and train a traceable baseline run

Reason:
- establish one known-clean reference path

Impact:
- later work had a real provenance anchor

## 2026-04-22

Decision:
- promote `lab/pedagogy_db/promoted_pedagogy_pack.jsonl` into the active dataset path

Reason:
- the project needed a trainable bridge artifact, not only curation tables

Impact:
- old docs that warned about a CSV pointer became outdated
- the new risk shifted from file format to semantic label quality

## 2026-04-22

Decision:
- wire AAA signals through export, loader, and training

Reason:
- capture more than a single best move from search decisions

Impact:
- the project gained richer supervision
- proof burden increased because the feature can look smarter than it is

## 2026-04-23

Decision:
- keep AAA as exploratory, not proven

Reason:
- small controlled runs improved loss, but the dataset was AB-invalid

Impact:
- AAA remains enabled with caution, not with final confidence

## 2026-04-24

Decision:
- treat conversion labeling in the promoted pedagogy pack as dirty

Reason:
- audit showed opening plies mislabeled as conversion rows

Impact:
- conversion-focused training claims must be qualified
- next cleanup target is semantic dataset repair, not another summary doc

## 2026-04-24

Decision:
- replace scattered truth docs with `MASTER_DOCS/00..08`

Reason:
- restart cost had become too high

Impact:
- new AI or human entry should start from one doc surface instead of many

## 2026-04-26

Decision:
- treat external ChatGPT discussion artifacts as *inputs*, not as repo truth
- encode their useful constraints as explicit doctrine inside `MASTER_DOCS`, not as ad-hoc prompts

Reason:
- long discussions can contain good engineering constraints (scope control, benchmark discipline)
- but they are not authoritative unless reflected in code + latest committed artifacts

Impact:
- "megapatch" guidance is accepted only as a scope rule: prefer bounded, reviewable changes (e.g. `src/chess/search.rs` only) with benchmark before/after
- "AAA tactical core architecture" is accepted only as a long-term roadmap; it must not be confused with current implemented architecture

## 2026-04-26

Decision:
- classify recovered material into three buckets:
  - active bugs / known issues
  - knowledge state / current doctrine
  - idea dump / roadmap

Reason:
- the project has valuable long-form discussion history, but some captures are noisy, repetitive, or speculative
- the docs should preserve useful material without letting speculation become runtime truth

Impact:
- dataset termination triage and search-ceiling notes are promoted into active docs because they match code/artifacts
- autobattler, controlled RNG, card/effect/faction systems, and reusable tactical core are preserved as roadmap/idea-dump material
- external share exports remain evidence/context only until corroborated by source code or committed artifacts

## 2026-05-03

Decision:
- create a distinct automation/evidence-plane track before resuming risky engine/neural/product work at speed

Reason:
- the project had enough Codex/ChatGPT workflow material to automate implementation, but not enough mechanical evidence to safely trust fast iteration
- Codex must implement bounded tasks, not judge its own work
- CI and scripts can block bad states mechanically, while GPT-5.5 audits remain critical but non-decision authority

Impact:
- PR sequence is now explicit:
  - PR-00A trust root repo policies
  - PR-00B no-code / Supabase trust-root spec
  - PR-00C n8n fail-closed entry workflow spec
  - PR-01 canonical mechanical CI
  - PR-02 immutable run bundle contract
  - PR-03 mechanical parser + three verdicts
  - PR-04 input boundary + tampering gate
  - PR-05 claim/data gates
- the three-verdict model becomes central:
  - `software_verdict`
  - `evidence_verdict`
  - `claim_verdict`
- browser GPT-5.5 can assist audit and handoff, but cannot become proof, merge authority, or promotion authority
- long-term architecture remains controlled by `HYBRID_GAME_AI_PLATFORM_PLAN.md` and `AAA_TACTICAL_CORE_ARCHITECTURE.md`

## 2026-05-03

Decision:
- treat PR-02 as contract-only and require a targeted fix audit after commit `5a041e1d`

Reason:
- local `codex_pr02_audit.md` predates the schema-tightening commit
- PR-02 must not be marked ready on an audit that did not inspect the final diff

Impact:
- next safe action is `PR-02 targeted fix audit after commit 5a041e1d`
- if PASS, create a PR-02 merge decision packet for human decision
- if not PASS, fix only PR-02 contract files under `lab/run_contracts/`

## 2026-05-04

Decision:
- record PR-05 as merged and treat PR-02 through PR-05 as the baseline evidence-plane control sequence

Reason:
- PR #52, `PR-05: Add claim and data gates`, was merged as commit `16718d8979bffa8feda6f42799118d551f6a1a3f`
- the verified PR-05 verdicts are:
  - `software_verdict=GATE_ADDED`
  - `evidence_verdict=CLAIM_DATA_GATE_ONLY`
  - `claim_verdict=NO_CLAIM_ALLOWED`

Impact:
- master docs should no longer describe PR-03, PR-04, or PR-05 as future work
- claim/data gates are recognized as controls only
- no scientific, strength, Elo, search, neural, benchmark, promotion, or dataset-quality claim is authorized by the PR-05 merge
- human authority remains required for merge, freeze, promotion, and claim decisions

## 2026-05-04

Decision:
- merged PR-07 structured audit scaffold after PR-06 CI gate wiring.

Reason:
- future GPT audit outputs need schema checking and explicit authority boundaries before any live GPT integration.
- PR-06 completed the minimal evidence-plane foundation by wiring evidence-plane gates into CI example-mode.

Impact:
- GPT audit can later be used as anomaly critique.
- GPT audit is not proof.
- GPT audit has no merge, promotion, or claim authority.
- live GPT wiring remains future work.
- PR-07 merged as PR #55, commit `95e53752686eb049267b22d7801c45ab1e500429`.
- PR-07 verified verdicts are:
  - `software_verdict=AUDIT_LAYER_ADDED`
  - `evidence_verdict=STRUCTURED_AUDIT_ONLY`
  - `claim_verdict=NO_CLAIM_ALLOWED`
- master docs should distinguish the completed minimal evidence-plane foundation through PR-06 from the still-incomplete full Research OS V9.2.
