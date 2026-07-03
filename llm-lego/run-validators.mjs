// run-validators.mjs — isolated full-regression harness (Library test isolation, Option B).
//
// THE safe way to run the *-validate.mjs suites. It:
//   1. starts demo-server.ts with LEGO_LIBRARY_DIR=library-test on an isolated port,
//      so EVERY validator targets a throwaway store — the real library/ is never
//      touched, no matter what a validator deletes;
//   2. drops a sentinel "manual" brick into the REAL library/ first, to prove a
//      hand-created brick survives a full regression;
//   3. runs each validator with BASE pointed at the isolated server;
//   4. tears the server down and asserts the real library/ is byte-for-byte the
//      same set of bricks it started with (+ the sentinel survived), then removes
//      the sentinel so net effect on library/ is zero.
//
// Usage:  node run-validators.mjs            # skips the Qwen/LM-Studio oracle harness
//         LEGO_RUN_QWEN=1 node run-validators.mjs   # also runs oracle-validate.mjs (needs :1234)
//
import { spawn, spawnSync } from "node:child_process";
import { readdirSync, existsSync, rmSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env["LEGO_TEST_PORT"] ?? "3117";
const BASE = `http://localhost:${PORT}`;
const TEST_DIR = "library-test"; // relative → demo-server resolves it under __dirname
const REAL_LIB = path.join(__dirname, "library");
const TEST_LIB = path.join(__dirname, TEST_DIR);
const SENTINEL_ID = "manual-sentinel-brick-001";
const SENTINEL_FILE = path.join(REAL_LIB, `${SENTINEL_ID}.json`);

const snapshot = (dir) =>
  existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];

// oracle-validate.mjs is the pre-existing Qwen harness (needs LM Studio :1234); it is
// NOT part of the library isolation surface. corrections-validate.mjs needs the REAL
// library (autopilot bricks + the saved Chaîne idée→IMP) so it runs separately via
// run-corrections.mjs — it CANNOT run against the isolated library-test store. Skip
// both here and log the skip (no silent cap).
const NEEDS_REAL_LIBRARY = ["corrections-validate.mjs"];
const SKIP = [...NEEDS_REAL_LIBRARY, ...(process.env["LEGO_RUN_QWEN"] === "1" ? [] : ["oracle-validate.mjs"])];
const ALL = readdirSync(__dirname).filter((f) => f.endsWith("-validate.mjs")).sort();
const validators = ALL.filter((f) => !SKIP.includes(f));

function log(m) { console.log(m); }

async function waitReady(timeoutMs = 25000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/api/library`);
      if (r.ok) {
        const j = await r.json();
        if (j && j.isTestLibrary === true) return true; // confirms we hit the TEST store
      }
    } catch { /* not up yet */ }
    await new Promise((res) => setTimeout(res, 200));
  }
  return false;
}

async function main() {
  // --- pristine test dir + sentinel in the REAL library ---------------------
  if (existsSync(TEST_LIB)) rmSync(TEST_LIB, { recursive: true, force: true });
  const before = snapshot(REAL_LIB); // the bricks we must never lose
  log(`Real library/ before run: ${before.length} bricks`);

  writeFileSync(
    SENTINEL_FILE,
    JSON.stringify(
      { id: SENTINEL_ID, kind: "agent", name: "Manual sentinel (survival test)",
        maturity: "draft", badge: "demo", roadmapRef: null, sourceRef: null,
        payload: { role: "sentinel" }, created: "2026-01-01T00:00:00Z", updated: "2026-01-01T00:00:00Z" },
      null, 2,
    ),
    "utf-8",
  );
  log(`Dropped sentinel manual brick into library/: ${SENTINEL_ID}.json`);

  // --- start isolated server -------------------------------------------------
  const server = spawn(process.execPath, ["demo-server.ts"], {
    cwd: __dirname,
    env: { ...process.env, LEGO_LIBRARY_DIR: TEST_DIR, PORT },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverErr = "";
  server.stderr.on("data", (d) => (serverErr += d.toString()));
  server.stdout.on("data", () => {});

  const results = [];
  let ready = false;
  try {
    ready = await waitReady();
    if (!ready) throw new Error(`server not ready on ${BASE}\n--- server stderr ---\n${serverErr}`);
    log(`Isolated server ready on ${BASE} (store=${TEST_DIR})\n`);

    // --- run each validator against the isolated server ----------------------
    for (const v of validators) {
      log(`▶ ${v}`);
      const r = spawnSync(process.execPath, [v], {
        cwd: __dirname,
        env: { ...process.env, BASE },
        encoding: "utf-8",
        timeout: 300000,
      });
      const out = (r.stdout || "") + (r.stderr || "");
      const pass = (out.match(/✅/g) || []).length;
      const fail = (out.match(/❌/g) || []).length;
      const ok = r.status === 0 && fail === 0;
      // Surface the last non-empty line (usually the ALL/FAILED summary) for context.
      const tail = out.trim().split("\n").filter(Boolean).slice(-1)[0] || "";
      results.push({ validator: v, exit: r.status, pass, fail, ok, timedOut: !!r.error, tail });
      log(`   ${ok ? "OK" : "FAIL"}  exit=${r.status} ✅${pass} ❌${fail}${r.error ? " [" + r.error.code + "]" : ""}  ${tail.slice(0, 80)}`);
    }
  } finally {
    server.kill();
    await new Promise((res) => setTimeout(res, 800)); // let the port free
  }

  // --- isolation assertions --------------------------------------------------
  const afterWithSentinel = snapshot(REAL_LIB);
  const sentinelSurvived = afterWithSentinel.includes(`${SENTINEL_ID}.json`);
  const lost = before.filter((f) => !afterWithSentinel.includes(f));
  const added = afterWithSentinel.filter((f) => !before.includes(f) && f !== `${SENTINEL_ID}.json`);

  // remove the sentinel → net effect on real library/ is zero
  if (existsSync(SENTINEL_FILE)) unlinkSync(SENTINEL_FILE);
  const finalReal = snapshot(REAL_LIB);
  const finalMatches = finalReal.length === before.length && before.every((f) => finalReal.includes(f));

  const totalPass = results.reduce((a, r) => a + r.pass, 0);
  const totalFail = results.reduce((a, r) => a + r.fail, 0);
  const failedSuites = results.filter((r) => !r.ok).map((r) => r.validator);
  const noLoss = lost.length === 0 && added.length === 0;

  log(`\n═══════════════════════════════════════════`);
  log(`Isolation harness — summary`);
  log(`═══════════════════════════════════════════`);
  log(`Validators run   : ${results.length}  (skipped: ${SKIP.join(", ") || "none"})`);
  log(`Suite pass/fail  : ✅${totalPass}  ❌${totalFail}`);
  log(`Failed suites    : ${failedSuites.length ? failedSuites.join(", ") : "none"}`);
  log(`Real library/    : before=${before.length}  after(+sentinel)=${afterWithSentinel.length}  final=${finalReal.length}`);
  log(`Sentinel survived: ${sentinelSurvived ? "✅" : "❌"}   (manual brick not wiped)`);
  log(`No brick lost    : ${noLoss ? "✅" : "❌"}${lost.length ? "  LOST: " + lost.join(",") : ""}${added.length ? "  UNEXPECTED: " + added.join(",") : ""}`);
  log(`library/ restored: ${finalMatches ? "✅" : "❌"}  (sentinel removed, original set intact)`);

  const result = {
    when: new Date().toISOString(),
    option: "B — separate LEGO_LIBRARY_DIR (library-test) + isTestLibrary guard",
    port: PORT,
    validators: results,
    skipped: SKIP,
    realLibrary: { before, afterWithSentinel, final: finalReal, lost, added },
    sentinelSurvived,
    noLoss,
    libraryRestored: finalMatches,
    totals: { pass: totalPass, fail: totalFail, failedSuites },
    isolationOK: noLoss && sentinelSurvived && finalMatches,
  };
  writeFileSync(path.join(__dirname, "isolation_result.json"), JSON.stringify(result, null, 2), "utf-8");

  const green = result.isolationOK;
  log(`\nISOLATION ${green ? "✅ PROVEN" : "❌ VIOLATED"} — see isolation_result.json`);
  process.exit(green ? 0 : 1);
}

main().catch((e) => {
  console.error("harness crashed:", e);
  // best-effort sentinel cleanup so we never leave junk in the real library
  try { if (existsSync(SENTINEL_FILE)) unlinkSync(SENTINEL_FILE); } catch {}
  process.exit(2);
});
