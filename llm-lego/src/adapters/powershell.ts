/**
 * PowerShell audit-script adapter — makes the 5 "mécanique" audit oracles (C1)
 * actually RUN. It executes one of a fixed WHITELIST of read-only PowerShell audit
 * scripts on the real TCS repo and maps the script's own `VERDICT :` line onto the
 * established Oracle verdict shape ({ verdict, reasoning }).
 *
 * HARD CONSTRAINTS (mirror A1 / TCS doctrine):
 *   - WHITELIST ONLY. The script name must be one of the 5 known basenames; the
 *     resolved path must stay under the audit chains dir (safeResolve-style). No
 *     free-text path is ever executed.
 *   - NO SHELL STRING. Uses execFile with an argv array (never `exec` with string
 *     concatenation) → no command injection.
 *   - OPT-IN ONLY. Wired only as the `tool` adapter of the "live" set, and only
 *     fires when a tool node carries a whitelisted `data.script`. Any other tool
 *     node falls back to the mock — existing graphs never spawn PowerShell.
 *   - READ-ONLY scripts. The 5 whitelisted scripts were verified to perform no
 *     file/git mutation (only build-cache side effects for cargo/py_compile).
 *   - TIMEOUT. Default 60s (chain_rust runs cargo test → override for it).
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";

import type { EngineState } from "../core/types.js";
import type { AdapterFn, Adapters } from "./types.js";
import { mockAdapters } from "./mock.js";

/** The ONLY scripts this adapter may ever run (audit chains, read-only). */
export const ALLOWED_SCRIPTS: readonly string[] = [
  "chain_hygiene.ps1",
  "chain_lab.ps1",
  "chain_models.ps1",
  "chain_python.ps1",
  "chain_rust.ps1",
];

const DEFAULT_TIMEOUT_MS = 60000;
const MAX_BUFFER = 16 * 1024 * 1024; // cargo test output can be large

export interface PowershellConfig {
  /** Directory the whitelisted scripts live in. */
  chainsDir: string;
  /** Kill the script after this many ms. */
  timeoutMs: number;
}

/**
 * Resolve the audit chains dir: env override first, else repo-relative from this
 * module (dist/adapters → up 3 → repo root → 00_STUDIO_CONTROL/05_AUDIT/chains).
 */
export function defaultChainsDir(): string {
  const env = process.env["TCS_AUDIT_CHAINS_DIR"];
  if (env !== undefined && env.trim() !== "") return path.resolve(env);
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../00_STUDIO_CONTROL/05_AUDIT/chains");
}

export function resolveConfig(overrides: Partial<PowershellConfig> = {}): PowershellConfig {
  const envTimeout = Number(process.env["TCS_PS_TIMEOUT_MS"]);
  return {
    chainsDir: overrides.chainsDir ?? defaultChainsDir(),
    timeoutMs: overrides.timeoutMs ?? (Number.isFinite(envTimeout) && envTimeout > 0 ? envTimeout : DEFAULT_TIMEOUT_MS),
  };
}

export interface ScriptRunResult {
  ok: boolean;
  verdict: "PASS" | "PARTIAL" | "FAIL" | "UNKNOWN";
  reasoning: string;
  exitCode: number | null;
  timedOut: boolean;
  script: string;
  error?: string;
}

/** Validate a script name against the whitelist AND path containment. Returns the
 * absolute path, or null if it is not an allowed, contained, existing script. */
export function resolveWhitelistedScript(script: unknown, cfg: PowershellConfig): string | null {
  if (typeof script !== "string" || script.length === 0) return null;
  // Reject anything that is not exactly a whitelisted basename (blocks traversal,
  // absolute paths, and any name outside the fixed set).
  if (path.basename(script) !== script) return null;
  if (!ALLOWED_SCRIPTS.includes(script)) return null;
  const resolved = path.resolve(cfg.chainsDir, script);
  const root = cfg.chainsDir + path.sep;
  if (!resolved.startsWith(root)) return null; // safeResolve-style containment
  if (!existsSync(resolved)) return null;
  return resolved;
}

/** Parse the script's own `VERDICT : X` line and a compact reasoning tail. */
function parseVerdict(stdout: string): { verdict: ScriptRunResult["verdict"]; reasoning: string } {
  const m = stdout.match(/VERDICT\s*:\s*(PASS|PARTIAL|FAIL)/);
  const verdict = (m?.[1] as ScriptRunResult["verdict"]) ?? "UNKNOWN";
  // Prefer the RÉSUMÉ/RESUME block (findings + counts) as reasoning; else tail.
  const summaryIdx = Math.max(stdout.lastIndexOf("=== RÉSUMÉ"), stdout.lastIndexOf("=== RESUME"));
  const tail = summaryIdx >= 0 ? stdout.slice(summaryIdx) : stdout.slice(-800);
  const reasoning = tail.replace(/\s+$/g, "").split("\n").filter((l) => l.trim() !== "").slice(0, 12).join("\n").slice(0, 800);
  return { verdict, reasoning: reasoning || "(pas de sortie)" };
}

/**
 * Run ONE whitelisted audit script and map its result. Never throws for an
 * operational failure — returns a structured `ScriptRunResult`.
 */
export function runPowershellScript(
  script: unknown,
  overrides: Partial<PowershellConfig> = {},
): Promise<ScriptRunResult> {
  const cfg = resolveConfig(overrides);
  const scriptName = typeof script === "string" ? script : String(script);
  const abs = resolveWhitelistedScript(script, cfg);
  if (abs === null) {
    return Promise.resolve({
      ok: false, verdict: "FAIL", timedOut: false, exitCode: null, script: scriptName,
      reasoning: `Script refusé : « ${scriptName} » n'est pas dans la whitelist ou sort de ${cfg.chainsDir}.`,
      error: "script not whitelisted / not contained",
    });
  }
  return new Promise((resolve) => {
    // execFile with an argv ARRAY — no shell, no string concatenation → no injection.
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", abs],
      { timeout: cfg.timeoutMs, maxBuffer: MAX_BUFFER, windowsHide: true },
      (err, stdout, stderr) => {
        const timedOut = !!(err && (err as NodeJS.ErrnoException & { killed?: boolean }).killed);
        const exitCode = err && typeof (err as { code?: unknown }).code === "number" ? (err as { code: number }).code : (err ? null : 0);
        if (timedOut) {
          resolve({ ok: false, verdict: "FAIL", timedOut: true, exitCode: null, script: scriptName,
            reasoning: `Script interrompu (timeout ${cfg.timeoutMs}ms).`, error: "timeout" });
          return;
        }
        const out = String(stdout ?? "");
        const { verdict, reasoning } = parseVerdict(out);
        if (verdict === "UNKNOWN") {
          resolve({ ok: false, verdict: "UNKNOWN", timedOut: false, exitCode, script: scriptName,
            reasoning: reasoning || String(stderr ?? "").slice(0, 400) || "(aucun VERDICT dans la sortie)",
            error: "no VERDICT line parsed" });
          return;
        }
        resolve({ ok: true, verdict, timedOut: false, exitCode, script: scriptName, reasoning });
      },
    );
  });
}

/**
 * Build the adapter set. Only `tool` is real: a tool node whose `data.script` is a
 * whitelisted audit script runs it; every other tool (and llm/agent) stays mock.
 */
export function createPowershellAdapters(overrides: Partial<PowershellConfig> = {}): Adapters {
  const cfg = resolveConfig(overrides);
  const tool: AdapterFn = async (data: Record<string, unknown>, state: EngineState) => {
    const script = data["script"];
    if (typeof script !== "string" || script.length === 0) {
      // Not a PowerShell tool node → keep the plain mock behaviour.
      return mockAdapters.tool(data, state);
    }
    const timeoutOverride = typeof data["timeoutMs"] === "number" ? { timeoutMs: data["timeoutMs"] as number } : {};
    const r = await runPowershellScript(script, { ...cfg, ...timeoutOverride });
    return {
      type: "tool",
      tool: "powershell-oracle",
      script: r.script,
      verdict: r.verdict,
      reasoning: r.reasoning,
      exitCode: r.exitCode,
      timedOut: r.timedOut,
      ...(r.error !== undefined ? { error: r.error } : {}),
    };
  };
  return { llm: mockAdapters.llm, agent: mockAdapters.agent, tool };
}

/** Default PowerShell tool adapter (repo-relative chains dir, 60s timeout). */
export const powershellAdapters: Adapters = createPowershellAdapters();
