# PR-09 Decision Packets

Status: human governance contract only  
Scope: merge/claim decision packet contracts and mechanical example validation  
Claim status: no claim allowed

## Purpose

PR-09 separates human governance decisions from evidence and claim authority.

It defines contract-only decision packets for:

```text
MERGE_DECISION
CLAIM_DECISION
```

The core rule is:

```text
MERGE_DECISION != CLAIM_DECISION
```

A merge decision may accept a governance/control PR into `main`. It does not create scientific evidence, does not authorize promotion, and does not increase claim scope.

A claim decision must remain explicit, typed, and human-controlled.

## Authority boundaries

Codex may not decide merge or claim authority.
GPT-5.5 may critique anomalies but may not decide merge or claim authority.
CI may provide mechanical checks but may not decide claim authority.
Human review remains final authority.

## Current validator

```text
scripts/check_decision_packets.py
```

The validator checks decision packet examples for:

- schema version;
- contract-only status;
- no-evidence and no-promotion markers;
- human decision requirement;
- merge/claim decision separation;
- forbidden promotion or strength claim candidate scope;
- authority boundaries.

## Current examples

```text
lab/decision_packets/examples/valid_merge_decision_packet.pr09.json
lab/decision_packets/examples/invalid_role_collapse_packet.pr09.json
```

The examples are not real decisions. They are contract examples for mechanical validation.

## Expected PR-09 interpretation

```text
software_verdict: DECISION_PACKET_ADDED
evidence_verdict: HUMAN_GOVERNANCE_CONTRACT_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
