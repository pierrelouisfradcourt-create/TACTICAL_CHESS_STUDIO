# LLM Codex Control Room Loop V0

Status: DOCUMENTED_ONLY
Surface: canonical_docs
Runtime authority: NONE
Agent activation: BLOCKED
Training: BLOCKED
LoRA creation: BLOCKED
Dataset creation or promotion: BLOCKED
HumanGate: FINAL

## Loop Purpose

Define a bounded documentation/workflow loop:

```text
LOCAL LLM -> CODEX TEACHER -> LOCAL LLM RETRY -> CODEX FINAL VALIDATION -> HumanGate
```

The loop produces candidate world maps, hygiene reports, truth snapshots, floating-item detection, noise-gate blocks, indexes, and registries. It does not activate runtime systems, train models, create LoRA outputs, promote datasets, run autonomous agents, or issue global ready/not-ready verdicts.

## Local LLM Student Role

The local LLM is a candidate cartographer and student. It may draft candidate maps, registries, claims ledgers, floating-item lists, and unknowns. Its output is candidate-only and cannot be treated as truth.

## Codex Teacher Role

Codex acts as an evidence-bound teacher/verifier. It may correct classifications only with cited source evidence, commands run, route checks, and blocked claims. Codex correction is not final truth without evidence and HumanGate review.

## Local LLM Retry Role

The local LLM retry pass ingests Codex teacher corrections and produces a revised candidate. It must show deltas from the first pass and preserve unresolved unknowns and blocked items.

## Codex Final Validation Role

Codex final validation checks routing, YAML parseability when a parser is available, status taxonomy, claims, floating items, and noise-gate compliance. It remains evidence-bound and does not replace HumanGate.

## HumanGate Role

HumanGate is final authority. Allowed final results are approve, block, or request revision. HumanGate is required for activation, promotion, claims, publication, commits, pushes, pull requests, dataset/model decisions, and runtime authority.

## Evidence Requirements

Every effective claim must include:

- source file or command evidence;
- observed evidence;
- required evidence;
- status from the allowed taxonomy;
- surface separation;
- blocked or unknown status when evidence is missing.

## Floating Detection

A floating item is any repo or workflow element lacking route, owner, consumer, status, evidence, or declared reason for existence.

The loop must detect:

- files not in `FILE_REGISTRY.yaml`;
- docs not linked from `CONTROL_INDEX.md` or relevant indexes;
- agents named but not registered;
- loops named but not registered;
- roadmaps not in `ROADMAP_INDEX.md`;
- architecture plans not in `ARCHITECTURE_PLANS_INDEX.md`;
- outputs not declared in output routing;
- claims without evidence;
- duplicate or competing truth sources;
- stale docs without supersession notes;
- reports without reader or next step.

Allowed handling is report-only, register if route is explicitly allowed, mark `UNKNOWN`, mark `BLOCKED`, mark `PASSIVE`, or mark `DOCUMENTED_ONLY`.

## Noise Gate

The noise gate blocks actions that create or worsen floating items.

Every proposed output must answer:

- Where does this output go?
- Who owns it?
- Who consumes it after creation?
- Which truth or map does it update?
- Which status does it carry?
- Which evidence or reason justifies it?

Pass condition: routed, indexed or registered, owned, consumed, statused, justified, and not a duplicate truth source.

Fail result: status `BLOCKED`; do not create or modify the noisy output; report the blocked action.

## Blocked Actions

- Runtime activation.
- Runtime code edits.
- Test edits.
- CI edits.
- Refactor.
- Model loading integration.
- Training.
- Fine-tuning.
- LoRA creation.
- Dataset creation or promotion.
- Benchmark proof claims.
- Autonomous agent activation.
- Creating documentation noise.
- Creating duplicate maps, indexes, snapshots, roadmaps, or architecture docs.
- Declaring implementation from documentation alone.
- Declaring test coverage from filenames alone.
- Declaring Codex correction as truth without evidence.
- Declaring LLM candidate output as truth.
- Writing outside output routing.
- Global ready/not-ready verdict.

## Status Taxonomy

Use only:

- `IMPLEMENTED`
- `TESTED`
- `DOCUMENTED_ONLY`
- `PASSIVE`
- `BLOCKED`
- `NOT_FOUND`
- `UNKNOWN`

`UNKNOWN => BLOCKED` for actions.

Surfaces must be reported separately: active runtime code, tests, runtime outputs, canonical docs, roadmap docs only, and inference.

## No Global Ready Verdict

This loop never emits a global ready/not-ready verdict. It reports status by surface and leaves final authority with HumanGate.
