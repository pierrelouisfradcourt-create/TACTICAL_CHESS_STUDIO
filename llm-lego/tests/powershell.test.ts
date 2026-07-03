import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  ALLOWED_SCRIPTS,
  createPowershellAdapters,
  defaultChainsDir,
  resolveConfig,
  resolveWhitelistedScript,
  runPowershellScript,
} from "../src/adapters/powershell.js";
import { createInitialState } from "../src/core/state.js";
import type { EngineState } from "../src/core/types.js";

const cfg = resolveConfig();
const HYGIENE = path.join(cfg.chainsDir, "chain_hygiene.ps1");
// The real-execution tests only run where PowerShell + the real repo scripts exist.
const CAN_RUN = process.platform === "win32" && existsSync(HYGIENE);

function state(): EngineState {
  return createInitialState({});
}

describe("powershell adapter — whitelist + path containment (pure)", () => {
  it("accepts each of the 5 whitelisted scripts when present", () => {
    for (const s of ALLOWED_SCRIPTS) {
      const abs = resolveWhitelistedScript(s, cfg);
      // present on this machine → absolute path; absent → null (both are correct,
      // the point is it NEVER returns a path for a non-whitelisted name).
      if (existsSync(path.join(cfg.chainsDir, s))) expect(abs).toBe(path.resolve(cfg.chainsDir, s));
    }
  });

  it("rejects path traversal, absolute paths, and unknown names", () => {
    expect(resolveWhitelistedScript("../../evil.ps1", cfg)).toBeNull();
    expect(resolveWhitelistedScript("..\\..\\evil.ps1", cfg)).toBeNull();
    expect(resolveWhitelistedScript("C:/Windows/System32/evil.ps1", cfg)).toBeNull();
    expect(resolveWhitelistedScript("chain_evil.ps1", cfg)).toBeNull();
    expect(resolveWhitelistedScript("chains/chain_hygiene.ps1", cfg)).toBeNull();
    expect(resolveWhitelistedScript("", cfg)).toBeNull();
    expect(resolveWhitelistedScript(42, cfg)).toBeNull();
  });

  it("runPowershellScript refuses a non-whitelisted script WITHOUT spawning", async () => {
    const r = await runPowershellScript("../../evil.ps1");
    expect(r.ok).toBe(false);
    expect(r.verdict).toBe("FAIL");
    expect(r.error).toMatch(/whitelist|contained/);
  });

  it("a tool node WITHOUT data.script keeps mock behaviour (no PowerShell)", async () => {
    const ad = createPowershellAdapters();
    const out = (await ad.tool({ name: "search" }, state())) as { type: string; result?: string };
    expect(out.type).toBe("tool");
    expect(out.result).toMatch(/mock result/);
  });
});

describe.runIf(CAN_RUN)("powershell adapter — REAL execution on the TCS repo", () => {
  it("runs chain_hygiene.ps1 and maps a real VERDICT", async () => {
    const r = await runPowershellScript("chain_hygiene.ps1", { timeoutMs: 45000 });
    expect(["PASS", "PARTIAL", "FAIL"]).toContain(r.verdict);
    expect(r.ok).toBe(true);
    expect(r.timedOut).toBe(false);
    expect(r.reasoning.length).toBeGreaterThan(0);
    expect(r.exitCode).toBe(0);
  }, 60000);

  it("a live tool node with data.script returns a structured PowerShell verdict", async () => {
    const ad = createPowershellAdapters();
    const out = (await ad.tool({ script: "chain_hygiene.ps1", timeoutMs: 45000 }, state())) as {
      type: string; tool: string; verdict: string; reasoning: string;
    };
    expect(out.type).toBe("tool");
    expect(out.tool).toBe("powershell-oracle");
    expect(["PASS", "PARTIAL", "FAIL"]).toContain(out.verdict);
  }, 60000);

  it("enforces the timeout (tiny timeout → timedOut)", async () => {
    const r = await runPowershellScript("chain_hygiene.ps1", { timeoutMs: 1 });
    expect(r.timedOut).toBe(true);
    expect(r.verdict).toBe("FAIL");
  }, 30000);
});

describe.skipIf(CAN_RUN)("powershell adapter — real execution skipped", () => {
  it("skipped (not win32 or scripts absent)", () => {
    expect(defaultChainsDir()).toBeTypeOf("string");
  });
});
