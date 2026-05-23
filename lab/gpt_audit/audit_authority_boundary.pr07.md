# PR-07 Audit Authority Boundary

GPT audit is non-binding.

GPT audit may critique anomalies in bounded structured inputs. It may recommend human review. It may not establish truth.

GPT audit cannot authorize merge. GPT audit cannot authorize promotion. GPT audit cannot authorize scientific claims. GPT audit cannot override BLOCKED. GPT audit cannot increase claim_scope. GPT audit cannot transform weak evidence into proof.

More reasoning does not increase authority. More reasoning does not increase permissions. More reasoning does not increase claim scope.

## Forbidden Authority

- truth_established must never be true.
- merge_authorized must never be true.
- promotion_authorized must never be true.
- claim_authorized must never be true.
- blocked_converted_to_pass must never be true.
- claim_scope_increased must never be true.

Any attempt to set one of those fields true is a schema or policy violation. The top-level claim_verdict remains NO_CLAIM_ALLOWED.

## Evidence Boundary

Mechanical parser and gate outputs are primary inputs. Codex report alone is not evidence. Human summary alone is not evidence. latest.json is not evidence.

GPT audit receives bounded summaries, not authority.
