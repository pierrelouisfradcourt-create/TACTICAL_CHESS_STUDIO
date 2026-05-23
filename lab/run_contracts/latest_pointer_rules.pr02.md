# PR-02 latest.json Pointer Rules

PR-02 defines a contract for future immutable run bundles.
It does not create scientific evidence.
It does not authorize claims.

latest.json may point to a run_id.
latest.json must never be cited as evidence.
latest.json must be rebuildable.
latest.json must contain only pointer metadata.
latest.json corruption must not corrupt RUN_ID evidence.
latest.json is never proof.
latest.json cannot be cited in claim_decision.
latest.json may be deleted without loss of proof.
latest.json must not contain metrics or conclusions.
latest.json must not contain scientific verdicts.

Future allowed `latest.json` shape, as documentation only:

```json
{
  "pointer_only": true,
  "not_evidence": true,
  "current_run_id": "RUN_...",
  "current_run_path": "lab/runs/RUN_...",
  "updated_at": "...",
  "updated_by": "script",
  "source": "rebuild_from_registry_or_runs"
}
```

PR-02 does not create `lab/runs/latest.json`.
