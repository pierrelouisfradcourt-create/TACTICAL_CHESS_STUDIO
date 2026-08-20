import { it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildGraph } from "../memory-graph.mjs";

let roots: { brain: string; facts: string };
beforeEach(() => {
  const brain = mkdtempSync(path.join(tmpdir(), "gb-"));
  const facts = mkdtempSync(path.join(tmpdir(), "gf-"));
  roots = { brain, facts };
});
afterEach(() => { rmSync(roots.brain, { recursive: true, force: true }); rmSync(roots.facts, { recursive: true, force: true }); });

it("arête créée depuis un [[lien]] résolu + degree", () => {
  writeFileSync(path.join(roots.brain, "a.md"), "# A\n\nvoir [[b]].", "utf-8");
  writeFileSync(path.join(roots.brain, "b.md"), "# B\n\nfin.", "utf-8");
  const g = buildGraph(roots);
  expect(g.edges).toContainEqual({ source: "brain/a", target: "brain/b" });
  expect(g.nodes.find((n: any) => n.id === "brain/a").degree).toBe(1);
  expect(g.nodes.find((n: any) => n.id === "brain/b").degree).toBe(1);
});
it("collision basename → ambiguous, pas d'arête", () => {
  mkdirSync(path.join(roots.brain, "d1")); mkdirSync(path.join(roots.brain, "d2"));
  writeFileSync(path.join(roots.brain, "d1", "dup.md"), "# Dup1", "utf-8");
  writeFileSync(path.join(roots.brain, "d2", "dup.md"), "# Dup2", "utf-8");
  writeFileSync(path.join(roots.brain, "src.md"), "# Src\n\nvers [[dup]].", "utf-8");
  const g = buildGraph(roots);
  expect(g.ambiguous).toBe(1);
  expect(g.edges.length).toBe(0);
});
it("self-link → aucune arête", () => {
  writeFileSync(path.join(roots.brain, "self.md"), "# Self\n\nje cite [[self]].", "utf-8");
  const g = buildGraph(roots);
  expect(g.edges.length).toBe(0);
});
it("lien dupliqué → une seule arête", () => {
  writeFileSync(path.join(roots.brain, "a.md"), "# A\n\n[[b]] et encore [[b]].", "utf-8");
  writeFileSync(path.join(roots.brain, "b.md"), "# B", "utf-8");
  const g = buildGraph(roots);
  expect(g.edges.length).toBe(1);
  expect(g.nodes.find((n: any) => n.id === "brain/b").degree).toBe(1);
});
it("wikilink introuvable → dropped", () => {
  writeFileSync(path.join(roots.brain, "a.md"), "# A\n\n[[nexistepas]].", "utf-8");
  const g = buildGraph(roots);
  expect(g.dropped).toBe(1);
  expect(g.edges.length).toBe(0);
});
