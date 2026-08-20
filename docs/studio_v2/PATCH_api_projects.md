# PATCH SPEC — GET /api/projects

**Target file:** `autopilot.py` (~7900 lines)  
**Status:** ready to apply — copy-paste into autopilot.py as instructed below  
**claim_verdict:** NO_CLAIM_ALLOWED

---

## 1. What this patch does

Adds a `GET /api/projects` endpoint that reads
`studio_state/projects.json` (relative to `REPO`) and returns the array
as JSON, with the same CORS header (`Access-Control-Allow-Origin: *`)
that every other endpoint already sets through `send_json()`.

No new files are created inside autopilot.py's scope; the data file
lives at `C:\TACTICAL_CHESS_STUDIO\studio_state\projects.json` which is
separate from the server.

---

## 2. Exact insertion point in autopilot.py

Locate the block at the **end of `do_GET`**, just before the final
`else` clause that returns 404.  The anchor text to find is:

```python
        elif path == "/api/ideas":
            self.send_json(load_ideas())

        elif path.startswith("/ws/terminal/"):
```

Insert the new `elif` block **between** `/api/ideas` and
`/ws/terminal/` (i.e., after the `load_ideas()` branch and before the
WebSocket branch):

```python
        elif path == "/api/projects":
            projects_path = REPO / "studio_state" / "projects.json"
            if projects_path.exists():
                try:
                    self.send_json(json.loads(projects_path.read_text(encoding="utf-8")))
                except Exception as e:
                    self.send_json({"error": str(e)}, 500)
            else:
                self.send_json({"error": "studio_state/projects.json introuvable"}, 404)

```

### After the edit the surrounding block looks like this:

```python
        elif path == "/api/ideas":
            self.send_json(load_ideas())

        # ── NEW: game project board ─────────────────────────────
        elif path == "/api/projects":
            projects_path = REPO / "studio_state" / "projects.json"
            if projects_path.exists():
                try:
                    self.send_json(json.loads(projects_path.read_text(encoding="utf-8")))
                except Exception as e:
                    self.send_json({"error": str(e)}, 500)
            else:
                self.send_json({"error": "studio_state/projects.json introuvable"}, 404)
        # ────────────────────────────────────────────────────────

        elif path.startswith("/ws/terminal/"):
```

---

## 3. Why no other changes are needed

- `REPO` is already defined as `Path(__file__).parent` (or equivalent)
  near the top of autopilot.py — every other file-reading endpoint uses
  the same pattern (`REPO / "lab/chains/..."`, etc.).
- `json` is already imported at the top of the file.
- `send_json()` already injects `Access-Control-Allow-Origin: *` on
  every response — no extra CORS work required.
- The `do_OPTIONS` handler already allows all methods — no changes needed
  there either.

---

## 4. Smoke test after applying

```powershell
# autopilot.py must be running on port 7331
Invoke-RestMethod -Uri 'http://localhost:7331/api/projects' -Method GET
```

Expected: a JSON array of 6 objects, each with keys
`id`, `title`, `genre`, `stage`, `metrics`, `updated`.

Curl equivalent:
```bash
curl -s http://localhost:7331/api/projects | python -m json.tool
```

---

## 5. schema — studio_state/projects.json

Each element:

| field | type | values |
|---|---|---|
| `id` | string | kebab-case slug |
| `title` | string | display name |
| `genre` | string | free text |
| `stage` | string | `idea` \| `scaffold` \| `assets` \| `playtest` \| `patch` \| `published` |
| `metrics.wishlists` | int or null | Steam wishlist count |
| `metrics.retention_d1` | float [0,1] or null | day-1 retention |
| `metrics.bugs` | int | open bug count |
| `updated` | ISO-8601 string | last write timestamp |

To add or update a project: edit `studio_state/projects.json` directly.
The endpoint reads the file fresh on every request — no server restart
required.

---

## 6. Memory graph — live refresh (future)

The memory graph in `studio_cockpit.html` currently uses a **baked
static snapshot** (`GRAPH_NODES` / `GRAPH_EDGES_RAW` JS constants).
This is intentional — the graph is always available offline.

**Upgrade path when `/api/vault-graph` exists** (or when the filesystem
MCP is wired to `studio_brain/`):

1. Add a `GET /api/vault-graph` endpoint in autopilot.py that walks
   `REPO / "studio_brain"`, parses `[[wikilinks]]` from every `.md`
   file, and returns `{nodes: [...], edges: [...]}`.

2. In `studio_cockpit.html`, add a `loadVaultGraph()` function that:
   - Calls `apiFetch('/api/vault-graph')` with the existing
     `AbortController` helper (5 s timeout).
   - On success: replaces `GRAPH_NODES` and `GRAPH_EDGES_RAW` in memory
     and calls `_rebuildGraph()`.
   - On `err` (offline / timeout): silently keeps the baked snapshot —
     the graph still renders, the status-bar Vault pill stays green.

3. Call `loadVaultGraph()` once on graph init and optionally on a
   60-second interval.

No baked data is removed until the live endpoint is validated and
confirmed by HumanGate.

---

software_verdict: BLOCKED (not yet applied — awaiting HumanGate go)  
evidence_verdict: MECHANICAL_VALIDATION_ONLY  
claim_verdict: NO_CLAIM_ALLOWED
