# ROCKY_TRACE_EVIDENCE_SEED_V0 Format

## Status

- status: format spec only
- scope: trace evidence seed
- claim level: very low / safe
- implementation status: no runtime execution
- schema status: non-schema format guide
- HumanGate required: yes

## Purpose

Show that Rocky/runtime can produce inspectable decision traces on a bounded case.

Dataset-safe observation guidance for this trace format is documented in `docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md`; it does not turn trace artifacts into dataset labels.

## Canonical Claim Boundary

"This artifact does not prove that Rocky is strong. It only shows that Rocky can produce inspectable decision traces on a bounded case."

## Non-Goals

This format:

- does not prove Rocky is strong;
- does not prove Rocky is product-ready;
- does not validate the full system scientifically;
- does not prove Chess960 readiness;
- does not prove meta-discovery;
- does not authorize claims;
- does not provide benchmark evidence;
- does not provide Elo, win-rate, or comparative strength claims.

## Canonical Future Artifact Layout

This task defines the format only. The actual artifact directory must be created later in PACK 6B or another explicitly authorized artifact-generation pack. `RAW_OUTPUT.txt` must never be faked, prefilled, templated as evidence, or created before real bounded runtime execution is authorized.

Future artifact shape:

```text
ROCKY_TRACE_EVIDENCE_SEED_V0/
├── README.md
├── COMMAND.md
├── ENVIRONMENT.md
├── INPUT.md
├── RAW_OUTPUT.txt
├── TRACE_EXCERPT.md
├── INTERPRETATION.md
└── LIMITATIONS.md
```

## File Role Definitions

### README.md

Defines:

- purpose;
- claim boundary;
- file list;
- non-goals;
- how to read the artifact.

### COMMAND.md

Records:

- exact command launched;
- working directory;
- stdout/stderr capture method;
- env vars used;
- whether the command writes files;
- whether the command is benchmark-like.

Rule: `COMMAND.md` records execution. It does not interpret results.

### ENVIRONMENT.md

Records:

- date/time;
- OS;
- machine class if relevant;
- git branch;
- git commit SHA;
- Rust version;
- Python version if used;
- relevant env vars;
- neural/model mode if used.

Rule: environment facts must be factual, not claims.

### INPUT.md

Records:

- input type;
- FEN or position;
- ruleset;
- depth / budget if used;
- side to move;
- why this input was chosen.

Rule: input must be small, legal, and non-Chess960 unless Chess960 is explicitly authorized later.

### RAW_OUTPUT.txt

Contains raw output only:

- no reformatting;
- no cleanup;
- no commentary;
- no interpretation;
- no selective rewriting.

Rule: `RAW_OUTPUT.txt` is the truth source for the artifact. It must come from real authorized execution and must never be faked, beautified, or prefilled with generated placeholder output.

### TRACE_EXCERPT.md

Contains:

- selected raw lines;
- why these lines were selected;
- pointer back to `RAW_OUTPUT.txt`.

Rule: `TRACE_EXCERPT.md` may select and explain raw lines. It must not invent missing context.

### INTERPRETATION.md

Records:

- what is observed;
- what is not observed;
- what cannot be inferred.

It must include the canonical claim boundary:

"This artifact does not prove that Rocky is strong. It only shows that Rocky can produce inspectable decision traces on a bounded case."

Rules:

- `INTERPRETATION.md` is cautious human reading.
- `INTERPRETATION.md` must never infer more than `RAW_OUTPUT.txt` supports.
- `INTERPRETATION.md` must not claim strength, improvement, validation, readiness, or superiority.

### LIMITATIONS.md

Must state:

- single-case limitation;
- no benchmark;
- no win-rate;
- no Elo;
- no scientific validation;
- no Chess960 proof;
- no generalization;
- no product-readiness claim.

It must include:

"This artifact should be treated as a trace-format seed, not as performance evidence."

Rule: `LIMITATIONS.md` is the anti-claim boundary for the artifact.

## Future Chess960 Evidence Metadata Addendum

This addendum is future metadata guidance only. It is not a schema, does not activate Chess960 evidence, does not create a new artifact, and does not authorize setup-only or runtime trace generation. HumanGate authorization is required before any Chess960 artifact generation.

Before any future setup-only or runtime Chess960 trace artifact, the evidence must include explicit metadata for:

- variant label, such as Standard or Chess960;
- Chess960 position id or seed, if applicable;
- generated white backrank;
- generated black backrank;
- mirror mode, if applicable;
- ruleset label;
- FEN contract label;
- castling-right interpretation;
- legality validation source;
- explicit note that the initial setup is non-standard relative to classical chess;
- whether the artifact is setup-only evidence or runtime trace evidence.

Future `INPUT.md` guidance for Chess960 evidence:

- variant label;
- position id or seed;
- generated backrank;
- side to move;
- FEN or board representation;
- castling-right interpretation;
- legality validation source;
- note that the setup is non-standard relative to classical chess.

Future `ENVIRONMENT.md` guidance for Chess960 evidence:

- ruleset label;
- FEN contract label;
- relevant variant flags;
- branch and commit;
- whether Chess960 support is setup-only or runtime-enabled.

Future `INTERPRETATION.md` guidance for Chess960 evidence:

- no Chess960 strength claim;
- no Chess960 readiness claim;
- no castling correctness claim unless directly shown;
- no runtime readiness claim from setup-only evidence.

Future `LIMITATIONS.md` guidance for Chess960 evidence:

- Chess960 metadata ambiguity if unresolved;
- FEN/castling contract limitations;
- setup-only evidence does not prove runtime playability;
- runtime trace evidence does not prove benchmark strength.

## Global Rules

- `RAW_OUTPUT.txt` = truth source.
- `TRACE_EXCERPT.md` = readable selection.
- `INTERPRETATION.md` = cautious human reading.
- `LIMITATIONS.md` = anti-claim boundary.
- `INTERPRETATION.md` must never infer more than `RAW_OUTPUT.txt` supports.

## Forbidden Content

The format explicitly forbids:

- strength claims;
- product-readiness claims;
- benchmark claims;
- scientific validation claims;
- Chess960 readiness claims;
- Elo or win-rate claims;
- edited or beautified raw output;
- generated placeholder raw output;
- schema creation;
- autonomous agent/reader activation.

## Future Generation Step

PACK 6B may later create and fill the actual `ROCKY_TRACE_EVIDENCE_SEED_V0/` artifact from a real bounded runtime command, but only after HumanGate authorization.

Until that authorization exists, this document remains a format specification only. It does not create evidence, authorize runtime execution, activate readers or agents, define a schema, or start PACK 6B.
