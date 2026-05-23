# ROCKY_TRACE_EVIDENCE_SEED_V0

## Artifact Name

ROCKY_TRACE_EVIDENCE_SEED_V0

## Purpose

This artifact records one bounded Rocky/runtime trace command and its raw captured output for a small legal non-Chess960 chess position.

"This artifact does not prove that Rocky is strong. It only shows that Rocky can produce inspectable decision traces on a bounded case."

## Files

- `README.md` - artifact overview and non-goals.
- `COMMAND.md` - exact execution record.
- `ENVIRONMENT.md` - factual environment facts.
- `INPUT.md` - bounded input description.
- `RAW_OUTPUT.txt` - raw captured stdout/stderr from the actual command.
- `TRACE_EXCERPT.md` - selected raw lines from `RAW_OUTPUT.txt`.
- `INTERPRETATION.md` - cautious reading of what is and is not observed.
- `LIMITATIONS.md` - explicit anti-claim boundary.

## How To Read This Artifact

Read `COMMAND.md` and `INPUT.md` first to understand the execution surface. Treat `RAW_OUTPUT.txt` as the truth source. Use `TRACE_EXCERPT.md` only as a readable selection from that raw output. Use `INTERPRETATION.md` and `LIMITATIONS.md` as claim-boundary notes, not as proof of strength or readiness.

## Non-Goals

- This artifact does not prove Rocky is strong.
- This artifact does not prove Rocky is product-ready.
- This artifact does not validate the full system scientifically.
- This artifact does not prove Chess960 readiness.
- This artifact does not prove meta-discovery.
- This artifact does not authorize claims.
- This artifact does not provide benchmark evidence.
- This artifact does not provide Elo, win-rate, or comparative strength claims.
