# Pipeline Core Index

status: DOCUMENTED_ONLY

## Purpose
The pipeline core is a generic studio workspace control package. It defines Codex operating discipline for a target machine, target repo, and target profile without assuming a specific computer, operating system, source host, programming stack, or migration context.

## Core Scope
- Generic pipeline: AUDIT -> DECISION -> ACTION_BOUNDED -> VALIDATION -> REPORT -> NEXT.
- Applies to a studio workspace and an authorized target repo or package path.
- Uses bootstrap profiles for machine-specific setup details.
- Does not assume a specific target machine exists.

## Profile Separation
Bootstrap profiles are machine-specific. Kenpachi is one profile only, stored outside the generic core under `13_BOOTSTRAP_PROFILES\KENPACHI\`.

Future profiles may include:
- laptop
- local server
- build machine

## Preserved Doctrine
- Open systems over closed systems: preserve feedback, contradiction, review, provenance, living systems, and bounded change.
- Rust = runtime truth.
- Python = ML / inference / tooling.
- Search = final gameplay authority.
- Neural = propose/rerank only.
- Dataset labels require ActionId, LegalAction, ActionMask, provenance, HumanGate.
- Logs, reports, latest.json, benchmarks, and runs are observations only.
- HumanGate decides activation, promotion, merge, reject, freeze, push, PR, CI, datasets, models, and claims.
- Default claim_verdict: NO_CLAIM_ALLOWED.

## Structural Doctrine

`00_STUDIO_CONTROL\04_BOUNDARIES\OPEN_SYSTEM_DOCTRINE.md` records the studio-wide open-system doctrine.

It is `DOCUMENTED_ONLY`: it does not activate agents, runtime behavior, training, benchmarks, datasets, models, publishing, claims, or autonomous decisions.
