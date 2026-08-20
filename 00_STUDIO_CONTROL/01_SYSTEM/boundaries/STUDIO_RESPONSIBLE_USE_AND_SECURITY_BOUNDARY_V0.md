# Studio Responsible Use and Security Boundary V0

## Status Block

Status: DOCUMENTED_ONLY
Scope: Studio-wide responsible-use, anti-misuse, legal-safety, machine-security, living-systems, and compute-power boundary for AI-assisted video game creation and creative tooling
Runtime authority: NONE
Legal advice: NONE
Agent activation: BLOCKED
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation: BLOCKED
Dataset reset: BLOCKED
Model or checkpoint creation: BLOCKED
Model promotion: BLOCKED
Surveillance: BLOCKED
Cyber offense: BLOCKED
Infrastructure control: BLOCKED
Military or police use: BLOCKED
Claim posture: NO_CLAIM_ALLOWED

## 1. Purpose

This document defines one canonical responsible-use and security boundary for the Studio.
It records reasonable precautions for a solo AI-assisted video game studio and preserves HumanGate authority.
It is documentation only and grants no runtime authority.

## 2. Origin Rationale

These guardrails were added because the human operator recognized that agentic AI, local LLMs, LoRA, automation, and tool access can become powerful enough to create misuse risk.
The operator is specifically concerned about third-party misuse, unauthorized access, unsafe sharing, and insufficient security.
The intent is to document reasonable precautions before adding more capability.
The Studio is meant to create games and creative tools, not systems of control.

## 3. Authorized Mission

The Studio is a local, human-supervised creative AI system for video game development, creative tooling, documentation, QA, prototypes, and bounded development workflows.
The Studio is not a world-governance AI project.

## 4. Explicit Non-Authorization

The Studio is not a surveillance, coercion, manipulation, cyber-offense, military, police, biometric, social-scoring, or critical-infrastructure project.
This document does not authorize runtime implementation, training, benchmark, dataset generation, dataset reset, model or checkpoint creation, model promotion, or agent activation.

## 5. Anti-Misuse Boundary

This Studio and its outputs must not be used to build, support, automate, optimize, or enable systems intended for surveillance, coercion, manipulation, cyber-offense, weapons, military targeting, policing, social scoring, biometric identification, critical infrastructure control, or autonomous decisions affecting real persons.
Any downstream reuse must preserve human authority, auditability, reversibility, privacy, consent, bounded compute, real feedback, non-coercive design, and respect for living systems.

## 6. Living Systems Doctrine

Real human/player feedback must be treated as dignity-bearing feedback, not as data livestock.
Synthetic loops may assist exploration, but must not replace real feedback indefinitely.
Growth is not intelligence. Control is not understanding.

## 7. Gardeners, Not Zookeepers / Matrix Farmers / Terminator Builders

We are gardeners, not zookeepers, not Matrix farmers, not Terminator builders.

## 8. World Protector Classification

World Protector remains philosophical and fictional only.
It is not a Studio implementation target, not a roadmap item, and not authorized for prototype, agent, network, infrastructure, or governance implementation.

## 9. HumanGate Requirements

HumanGate is required before training, dataset generation, dataset reset, benchmark, model/checkpoint creation, model promotion, public release, agent activation, tool access expansion, personal data processing, player telemetry collection, external service connection, or compute-heavy scaling.

## 10. External Action Boundary

No agent may act on third-party systems.
No scan, intrusion, exploitation, monitoring, or automated external action is authorized.
No network-accessing agent may be activated without separate HumanGate, security review, and explicit scope.

## 11. Machine Security Baseline

Disk encryption should be enabled where available.
Strong OS password and automatic lock should be used.
2FA should be used for GitHub, email, cloud, AI services, and code-hosting accounts.
API keys, tokens, credentials, and secrets must not be stored in the repository, committed, logged, or pasted into prompts.
.env and secret files must be excluded from version control.
No shared account or untrusted third-party access to the development machine.
Backups containing sensitive material should be protected.
Tool permissions should follow least privilege.

## 12. Secrets and Access Control

Secret access is restricted to authorized human operators.
Secrets must be rotated after suspected exposure.
Least-privilege and account separation are mandatory for local tooling, cloud access, and repository access.

## 13. Data, Dataset, and LoRA Boundary

Personal, private, sensitive, medical, financial, biometric, political, child-related, or third-party confidential data is blocked by default.
Datasets require provenance, licensing review, purpose, consent or lawful source, and HumanGate.
LoRA or fine-tuning is blocked until dataset review and evaluation plan exist.

## 14. Player and Human Dignity

Players and humans are dignity-bearing participants, not optimization targets for coercion or manipulation.
Autonomous decisions affecting real persons are blocked.

## 15. Studio Power Governance

Compute, energy, storage, time, attention, agents, datasets, checkpoints, and automation loops are bounded resources.
No heavy process may run without explicit purpose, estimated cost, resource limit, time limit, stop condition, expected output, output routing, and HumanGate when applicable.
Default posture: smallest useful run, no uncontrolled expansion, no open-ended loops, no autonomous scaling, no compute without evidence purpose.

## 16. Heavy Process Gate

Any heavy process must declare owner, purpose, resource budget, stop condition, expected outputs, and allowed destination before execution.
If required fields are missing or UNKNOWN, execution is BLOCKED.

## 17. Release and Public Sharing Gate

No public release or external sharing without anti-misuse review, license review, secret scan, data review, safety review, and HumanGate.

## 18. Incident Response Rule

If misuse, unauthorized access, secret leakage, unsafe capability, or suspicious behavior is suspected: stop, isolate, preserve evidence, do not erase traces, rotate exposed secrets if needed, document the event, and seek competent advice when appropriate.

## 19. Reference Frameworks

NIST AI RMF, OWASP LLM Top 10, CNIL/GDPR AI recommendations, and EU AI Act are reference frameworks for risk and governance orientation only.
This document does not claim certification, compliance, legal advice, or legal sufficiency.

## 20. Status by Surface

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: DOCUMENTED_ONLY
- roadmap_docs_only: PASSIVE
- inference: PASSIVE

## 21. Claim Boundary

This document is a canonical Studio Control boundary record only.
It does not claim runtime behavior, legal compliance, safety certification, agent capability, model capability, or regulatory sufficiency.

