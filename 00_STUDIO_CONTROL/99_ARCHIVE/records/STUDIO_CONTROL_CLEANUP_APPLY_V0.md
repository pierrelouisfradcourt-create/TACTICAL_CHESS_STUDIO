# Studio Control Cleanup Apply V0

Status: DOCUMENTED_ONLY
Scope: Duplicate root copy cleanup and anti-recurrence policy
Task ID: STUDIO_CONTROL_CLEANUP_APPLY_PHASE_1_V0
Created by: Codex bounded executor
HumanGate: Bounded cleanup authorized for exact root-level Markdown duplicates only
Runtime authority: NONE
Agent activation: BLOCKED
Training: BLOCKED
Benchmark: BLOCKED
Dataset generation: BLOCKED
Model promotion: BLOCKED
Claim posture: NO_CLAIM_ALLOWED

---

## 1. Scope

This record documents Cleanup Phase 1 for `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL`.

Allowed scope:

- delete exact root-level Markdown duplicates only when the expected nested canonical target exists;
- require SHA256 equality before deletion;
- require no active reference dependency on the root copy;
- preserve source anchors;
- update topology, path, routing, and source-registration documents to prevent recurrence.

Blocked scope:

- folder rename, move, or migration;
- duplicate numeric prefix resolution;
- source-anchor move, rename, archive, or deletion;
- runtime code, tests, ML, dataset, training, benchmark, lab run, model, checkpoint, agent, Chess960, or DecisionController changes;
- commit, push, branch, or pull request creation.

---

## 2. Deleted Candidates

All deleted candidates had `root_exists_before: true`, `target_exists: true`, `hash_match: true`, and `active_reference_to_root: false`.

| Root candidate | Canonical nested target | SHA256 evidence | Action |
| --- | --- | --- | --- |
| `AAA_STUDIO_CODEX_PLACEMENT_CONTRACT_V3_1.md` | `01_MAPS/PATH_CONTRACT.md` | `BC65644EA3A78B6D350AA3E242AB4C8EBFF100619A367AEE9FAEA467C8EEACFC` | DELETED |
| `AGENT_REGISTRY.md` | `03_REGISTRIES/AGENT_REGISTRY.md` | `DCA256DD31ED2DB272E3CE0D2AC3F232E4966012C931EC23F8B2B485AE20A395` | DELETED |
| `BOOTSTRAP_REPORT_TEMPLATE.md` | `08_MIGRATION/BOOTSTRAP_REPORT_TEMPLATE.md` | `F446E9EC20D6459178FF013D572256BF01FCD84FC91295A1D79532B142BA7E21` | DELETED |
| `CLAIM_MATRIX.md` | `04_BOUNDARIES/CLAIM_MATRIX.md` | `EAC5AA51D42B0DC63BFAF726F2A0315532F90F1863D5CD8613B0BDE5D2F2A95D` | DELETED |
| `DATA_BOUNDARY.md` | `04_BOUNDARIES/DATA_BOUNDARY.md` | `A2F8EDC3FB1060CC0FA40E1A1CC7E0BE6605DFE2BA54F9202D6AFE6FD463DD0E` | DELETED |
| `HUMANGATE_POLICY.md` | `04_BOUNDARIES/HUMANGATE_POLICY.md` | `E72922010DF51488465E8A5120A7B7BDB79C4726AC04EDBC66B33C67FFEF2414` | DELETED |
| `REPO_HYGIENE.md` | `04_BOUNDARIES/REPO_HYGIENE.md` | `0C3A19983174159875414A25F70ECE018B5189A90C84873D8BE44A6BC36B0932` | DELETED |
| `WORKSPACE_HYGIENE.md` | `04_BOUNDARIES/WORKSPACE_HYGIENE.md` | `83D30F2987AAC6F82D3E4EC0A4720B8E8231B502D0B007971B8FF7030C083FC4` | DELETED |
| `CYBERSENTINEL.md` | `09_CYBERDEFENSE/CYBERSENTINEL.md` | `750F873C5F9F279F052BC37E7B160A36DA1E5A26EFAD27FCE023DC8840555D16` | DELETED |
| `MIGRATION_GUARD.md` | `08_MIGRATION/MIGRATION_GUARD.md` | `DA2F8A845F04ACE2728913A9B68CC560945C7D03E4BBD56D1201B86BF8D7A888` | DELETED |
| `SYSTEM_BASELINE.md` | `08_MIGRATION/SYSTEM_BASELINE.md` | `39FF6548B3E8D94C269CDBCA7BEA13AF50A7D5733F79D798F901B1AE561035AA` | DELETED |
| `PATCH_COST_REVIEW.md` | `06_CODEX/PATCH_COST_REVIEW.md` | `DDDF90C0DEAD4C43B8516C234691315B5F5AA896E7D4BBD9599CB8F306F65142` | DELETED |
| `PATCH_REVIEW.md` | `06_CODEX/PATCH_REVIEW.md` | `B422E863C29391C06A09862DF7E515010951E7B159524DED525CA3009135231D` | DELETED |
| `PROMPT_REVIEW.md` | `06_CODEX/PROMPT_REVIEW.md` | `6ABB0C1C32FB55CFF31B07368DFEF1F04509503B70F0BDDCB66E07784210BDB6` | DELETED |
| `PROJECT_REGISTRY.md` | `03_REGISTRIES/PROJECT_REGISTRY.md` | `1D4DED4F9845DA0E7424C99CFDB2EFD898BAFD1E8C84024A0E25C2DDDD4353AE` | DELETED |
| `ROADMAPATCH_MASTER.md` | `10_ROADMAP/ROADMAPATCH_MASTER.md` | `C3542B9DD52CE14326C565FDDF4C160B76C38E177A0EFAC5D29F8671E7DADDDB` | DELETED |
| `STUDIO_MAP.md` | `01_MAPS/STUDIO_MAP.md` | `D1C87ED4423940557DC20509D91B758CE9FC29F63AE23B23AFE5CCFD8958ED46` | DELETED |

## 3. Blocked Candidates

No candidate was blocked in Phase 1.

## 4. Hash Evidence Summary

Each root candidate was compared with the expected canonical nested target using SHA256 before deletion. Every candidate had identical root and target hashes. The hash listed above is the shared root/target hash captured before root deletion.

## 5. Reference Check Summary

Active source-anchor, Navigator, path-contract, topology, routing, and repo-doc checks found no active dependency on the root copy for any deleted candidate.

One passive legacy reference remains in `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/12_PIPELINE_OPENING_LEGACY/READ_FIRST_PIPELINE.md` to the old root placement contract. `12_PIPELINE_OPENING_LEGACY` is classified as PASSIVE legacy traceability and is not an active pipeline source; this cleanup did not modify that out-of-scope file.

## 6. Source Anchors Preserved

Preserved source anchors:

- `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/02_NAVIGATION/STUDIO_SOURCE_ANCHORING_V0.md`
- `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/STUDIO_CONTROL_TOPOLOGY_FREEZE_V0.md`
- `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/01_MAPS/STUDIO_OUTPUT_ROUTING_POLICY_V0.md`
- `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/STUDIO_AUTODEV_PIPELINE_IO_CONTRACT_V0.md`
- `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/TASK_CHARTER_TEMPLATE_V0.yaml`
- `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/EXECUTOR_REPORT_TEMPLATE_V0.yaml`
- `C:/TACTICAL_CHESS_STUDIO/00_STUDIO_CONTROL/07_FORMS/ANALYSIS_AGENT_RECORD_TEMPLATE_V0.yaml`
- `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab/AGENTS.md`
- `C:/TACTICAL_CHESS_STUDIO/repos/games/TacticalChessPureLab/docs/gpt-navigator/*`

## 7. No Runtime, Test, Or ML Changes

No active runtime code was modified.
No tests were modified.
No ML or dataset code was modified.
No training, benchmark, dataset generation, lab run, `latest.json`, model, or checkpoint was created.
No agent, Chess960, or DecisionController activation occurred.

## 8. Anti-Recurrence Updates

Updated governance sources:

- `PATH_CONTRACT.md` records the actual current frozen topology, known duplicate-prefix drift, non-numbered exceptions, and superseding topology/routing authority.
- `STUDIO_CONTROL_TOPOLOGY_FREEZE_V0.md` records Cleanup Phase 1 status and keeps source-anchor movement, directory migration, and duplicate-prefix resolution blocked.
- `STUDIO_OUTPUT_ROUTING_POLICY_V0.md` blocks root-level duplicate canonical files and requires output routing plus duplicate-root checks for Studio Control file-producing tasks.
- Source registration docs now register this cleanup status source.

## 9. Final Verdicts By Surface

software_verdict:

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: DOCUMENTED_ONLY
- roadmap_docs_only: PASSIVE
- inference: PASSIVE

evidence_verdict:

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: TESTED
- roadmap_docs_only: PASSIVE
- inference: PASSIVE

claim_verdict:

- active_runtime_code: PASSIVE
- tests: PASSIVE
- artifacts_runtime_outputs: PASSIVE
- canonical_docs: DOCUMENTED_ONLY
- roadmap_docs_only: PASSIVE
- inference: PASSIVE

No global ready/not-ready verdict is made.
