# WBS Policy V0

WBS Policy V0 defines how Project Breakdown Report artifacts decompose a parent objective without scope drift.

## Hierarchical Decomposition

- Parent objective is split into epics.
- Each epic is split into PatchGroups.
- Each PatchGroup is split into PR candidates.

## 100% Scope Coverage Principle

- Included scope plus excluded scope must fully explain the parent objective boundary.
- No scope gaps are allowed.
- No duplicate scope segments are allowed.
- No unrelated work may be introduced into a PatchGroup or PR candidate.

## Mapping To PatchGroups And PR Candidates

- PatchGroups carry bounded implementation surfaces via allowed/forbidden paths.
- PR candidates carry deliverable-level intent, validation expectations, and director review requirements.
- Dependencies must be explicit so ordering does not depend on hidden assumptions.
- Any unresolved scope fragment triggers a stop condition and human review hold.

software_verdict: CONTROL_PLANE_PROJECT_BREAKDOWN_ONLY
evidence_verdict: LOCAL_PLANNING_STRUCTURE_ONLY
claim_verdict: NO_CLAIM_ALLOWED
