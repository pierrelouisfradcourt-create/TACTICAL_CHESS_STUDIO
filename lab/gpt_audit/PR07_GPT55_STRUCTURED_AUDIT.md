# PR-07 GPT-5.5 Structured Audit

## Purpose

PR-07 defines a local structured audit contract for future GPT-5.5 anomaly critique. It exists to format bounded inputs, validate simulated outputs, and document the authority boundary.

## Non-Binding Role

GPT audit is non-binding. GPT audit is not canonical evidence by itself. It may critique anomalies in bounded summaries, but it cannot authorize merge, promotion, or scientific claims.

GPT audit cannot override BLOCKED. GPT audit cannot increase claim_scope. GPT audit cannot transform weak evidence into proof. More reasoning does not increase authority. More reasoning does not increase permissions. More reasoning does not increase claim scope.

## Evidence Boundary

Mechanical parser output, input boundary gate output, and claim data gate output are primary structured inputs. Codex report alone is not evidence. Human summary alone is not evidence. latest.json is not evidence.

GPT audit receives bounded summaries, not authority. Any anomaly finding remains a recommendation for human review and cannot become proof.

## Local-Only Constraint

The PR-07 script uses Python standard library only. It does not import OpenAI, does not call the OpenAI API, does not call network, does not require jsonschema, and does not install packages.

## Expected Verdict

- software_verdict: AUDIT_LAYER_ADDED
- evidence_verdict: STRUCTURED_AUDIT_ONLY
- claim_verdict: NO_CLAIM_ALLOWED
