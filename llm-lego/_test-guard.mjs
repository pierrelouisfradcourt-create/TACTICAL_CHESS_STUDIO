// Shared safety guard for destructive validators (Library test isolation, Option B).
//
// Any suite that bulk-deletes bricks (delete-all, or delete-by-kind) can wipe real
// user bricks in library/ if pointed at a real server. This guard makes that
// impossible: it throws unless the server reports it is serving an ISOLATED test
// library (LIBRARY_IS_TEST → GET /api/library returns isTestLibrary === true).
//
// The real isolation is Option B: run-validators.mjs starts the server with
// LEGO_LIBRARY_DIR=library-test so validators target a throwaway dir. This guard is
// the belt-and-suspenders — it also protects against running a validator by hand
// against a default :3000 server that is serving the real library/.
//
// Usage inside a destructive validator, BEFORE the delete loop:
//   const cur = await api("/api/library");
//   assertTestLibrary(cur.json, "prompt");
//   for (const b of (cur.json?.bricks || [])) if (...) await api(... DELETE);

export function assertTestLibrary(libraryJson, suiteName = "this suite") {
  if (!libraryJson || libraryJson.isTestLibrary !== true) {
    const dir = libraryJson && libraryJson.libraryDir ? ` (server store: ${libraryJson.libraryDir})` : "";
    throw new Error(
      `[${suiteName}] REFUSING to delete bricks: the server is serving the real ` +
      `library/ store, not an isolated test library${dir}. Run the full regression ` +
      `via \`node run-validators.mjs\` (it sets LEGO_LIBRARY_DIR=library-test on an ` +
      `isolated port), or start the server yourself with LEGO_LIBRARY_DIR pointed at ` +
      `a throwaway dir. Persistent bricks in library/ are protected.`,
    );
  }
}
