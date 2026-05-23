# MIGRATION_GUARD

status: DOCUMENTED_ONLY

## Truth Classes

| class | definition | status |
|---|---|---|
| active repo truth | Current intended source repository state. | UNKNOWN until Kenpachi source is selected and verified. |
| archive truth | Curated historical artifacts selected by HumanGate. | DOCUMENTED_ONLY |
| generated/runtime outputs | Logs, reports, benchmark outputs, latest.json, and run artifacts. | PASSIVE |

## Forbidden Copy List

- Old venv directories.
- Caches.
- Builds.
- Logs.
- Runtime outputs.
- Unreviewed datasets.
- Unreviewed models.
- Old mixed parent layout copied blindly.

## Rebuild List

- Python environment.
- Rust build outputs.
- Tool caches.
- Local generated reports.
- Runtime run directories.

## Restore Verification

- GitHub clone is valid only after origin/main contains final intended HEAD.
- Bundle restore is the backup path if GitHub is incomplete.
- External bundle copy must be verified before migration if used.
- Restore must verify path boundaries before any active use.

## Stop Conditions

- Target path resolves inside the active repo.
- Source bundle is incomplete or unverified.
- GitHub origin/main does not contain the intended final HEAD and no verified bundle is approved.
- Any restore would copy forbidden runtime outputs into active repo.
- Any step requires push, PR, CI, training, dataset promotion, model promotion, or runtime activation without HumanGate.
