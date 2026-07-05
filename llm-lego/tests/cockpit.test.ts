import { it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseLedger, buildCockpit } from "../cockpit.mjs";

let dir: string, ledger: string, roots: { brain: string; facts: string };
const LEDGER = [
  "- id: IMP-001",
  "  title: Alpha",
  "  status: CLOSED",
  "  lane: SAFE_AUTO",
  "- id: IMP-002",
  "  title: Beta",
  "  status: OPEN",
  "  lane: AUDIT_REQUIRED",
  "- id: IMP-003",           // malformé : pas de status
  "  title: Gamma sans status",
  "  lane: SAFE_AUTO",
  "- id: IMP-004",
  "  title: Delta",
  "  status: FAIL",
  "  lane: HUMAN_REQUIRED",
].join("\n");

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "ck-"));
  ledger = path.join(dir, "LEDGER.yaml");
  writeFileSync(ledger, LEDGER, "utf-8");
  roots = { brain: mkdtempSync(path.join(tmpdir(), "ckb-")), facts: mkdtempSync(path.join(tmpdir(), "ckf-")) };
  writeFileSync(path.join(roots.facts, "note.md"), "# Note\n\nx.", "utf-8");
});
afterEach(() => { for (const d of [dir, roots.brain, roots.facts]) rmSync(d, { recursive: true, force: true }); });

it("agrégats corrects (total/closed/open/fail)", () => {
  const c = buildCockpit({ ledgerPath: ledger, roots });
  expect(c.ledger.total).toBe(3);     // 3 bien-formés (IMP-003 sans status exclu)
  expect(c.ledger.closed).toBe(1);
  expect(c.ledger.open).toBe(1);
  expect(c.ledger.fail).toBe(1);
});
it("bloc malformé → skipped=1", () => {
  const c = buildCockpit({ ledgerPath: ledger, roots });
  expect(c.ledger.skipped).toBe(1);
});
it("invariant anti-mensonge : total + skipped == nb de lignes '- id: IMP-'", () => {
  const c = buildCockpit({ ledgerPath: ledger, roots });
  const idLines = LEDGER.split("\n").filter((l) => /^- id:\s*IMP-/.test(l)).length;
  expect(c.ledger.total + c.ledger.skipped).toBe(idLines);   // 3 + 1 == 4
});
it("byLane dynamique : seulement les lanes des IMPs OPEN présents", () => {
  const c = buildCockpit({ ledgerPath: ledger, roots });
  // OPEN = IMP-002 (AUDIT_REQUIRED) + IMP-004 FAIL (HUMAN_REQUIRED) ; IMP-001 CLOSED exclu
  expect(Object.keys(c.byLane).sort()).toEqual(["AUDIT_REQUIRED", "HUMAN_REQUIRED"]);
  expect(c.byLane.AUDIT_REQUIRED.open).toBe(1);
});
it("recentNotes triées + ledger absent → structure vide sans crash", () => {
  const c = buildCockpit({ ledgerPath: ledger, roots });
  expect(c.recentNotes.length).toBe(1);
  const empty = buildCockpit({ ledgerPath: path.join(dir, "nope.yaml"), roots });
  expect(empty.ledger.total).toBe(0);
  expect(empty.ledger.skipped).toBe(0);
});
