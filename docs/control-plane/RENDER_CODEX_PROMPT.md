# Render Codex Prompt (Dry Run Only)

## Purpose

`scripts/control_plane/render_codex_prompt.py` renders a Codex-ready prompt from a local StudioPilot TaskPacket JSON after schema validation.

This renderer is dry-run only:
- It does not call Codex.
- It does not call OpenAI.
- It does not call GitHub.
- It does not execute tasks from the packet.

The script only transforms validated packet data into deterministic text for manual use.

## Human Authority

- Humans remain responsible for launching Codex.
- Rendered prompt output is not evidence.
- Rendered prompt output is not authority to merge, promote, or claim.
- Claim boundaries remain defined by TaskPacket `claim_scope`.

## Boundary (Non-goals)

- The renderer does not provide autonomy.
- The renderer does not start, train, fine-tune, or update any model.
- The renderer does not mutate prompts, prompt registries, policies, or active workflow rules.
- The rendered prompt is not authority to merge, promote, claim, or execute.
- The human remains responsible for launching Codex and deciding what to do with the rendered prompt.

## Usage

Render to stdout:

```bash
python scripts/control_plane/render_codex_prompt.py docs/control-plane/fixtures/studiopilot_packets/valid/valid_task_packet_docs.json
```

Render to an explicit output path:

```bash
python scripts/control_plane/render_codex_prompt.py docs/control-plane/fixtures/studiopilot_packets/valid/valid_task_packet_docs.json --output lab/control_plane/rendered_prompts/example_codex_prompt.txt
```

Notes:
- The script validates against `schemas/studiopilot_task_packet.schema.json` before rendering.
- Output file writes happen only when `--output` is provided.
- Existing output files are never overwritten.
- If output is repo-relative, forbidden path patterns from the TaskPacket are enforced.

## Verdict Boundaries

- software_verdict: CONTROL_PLANE_PROMPT_RENDERER_ONLY
- evidence_verdict: DRY_RUN_RENDERING_ONLY
- claim_verdict: NO_CLAIM_ALLOWED
