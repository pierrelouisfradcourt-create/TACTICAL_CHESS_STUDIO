# WORKSPACE_HYGIENE

status: DOCUMENTED_ONLY

## Studio Workspace Rules

- tmp is disposable.
- tools are installed or rebuilt tools.
- archives are selected historical artifacts.
- runs are outputs only.
- Do not copy the old mixed parent blindly.
- Do not copy old Python environments, caches, builds, logs, or runtime outputs.

## Placement

| area | policy |
|---|---|
| repos | Source repositories only. |
| datasets | Dataset inputs with provenance and HumanGate. |
| models | Model artifacts with provenance and HumanGate. |
| runs | Runtime outputs, observations only. |
| archives | Curated historical artifacts. |
| tools | Reinstalled or rebuilt tools. |
| tmp | Disposable scratch area. |
