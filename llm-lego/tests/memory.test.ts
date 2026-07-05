import { it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseNote, listNotes, readNote, searchNotes, writeNote } from "../memory-store.mjs";

let roots: { brain: string; facts: string };
beforeEach(() => {
  const brain = mkdtempSync(path.join(tmpdir(), "brain-"));
  const facts = mkdtempSync(path.join(tmpdir(), "facts-"));
  writeFileSync(path.join(brain, "000_HOME.md"), "# 🧠 Home\n#moc #reference\n\nVoir [[doctrine/studio-doctrine]].", "utf-8");
  writeFileSync(path.join(facts, "proj.md"), "---\nname: proj\nmetadata:\n  type: project\n---\n\nELO hybride 1211.", "utf-8");
  roots = { brain, facts };
});
afterEach(() => { rmSync(roots.brain, { recursive: true, force: true }); rmSync(roots.facts, { recursive: true, force: true }); });

it("parseNote extrait frontmatter, tags inline, wikilinks, titre", () => {
  const p = parseNote("# 🧠 Home\n#moc #reference\n\nVoir [[a/b]] et [[c|alias]].");
  expect(p.title).toBe("🧠 Home");
  expect(p.tags).toEqual(["moc", "reference"]);
  expect(p.wikilinks).toEqual(["a/b", "c"]);
});
it("parseNote lit metadata.type du frontmatter", () => {
  const p = parseNote("---\nname: proj\nmetadata:\n  type: project\n---\nbody");
  expect(p.type).toBe("project");
  expect(p.title).toBe("proj");
});
it("listNotes couvre les 2 racines", () => {
  const { notes } = listNotes(roots);
  expect(notes.map((n: any) => n.root).sort()).toEqual(["brain", "facts"]);
  expect(notes.find((n: any) => n.root === "facts")!.type).toBe("project");
});
it("readNote round-trip d'une note", () => {
  const n = readNote(roots, "facts", "proj");
  expect(n.title).toBe("proj");
  expect(n.body).toContain("ELO hybride");
});
it("readNote refuse la traversée de chemin", () => {
  expect(() => readNote(roots, "facts", "../secret")).toThrowError();
});
it("searchNotes trouve par mot-clé et renvoie un snippet", () => {
  const r = searchNotes(roots, "elo");
  expect(r.hits.length).toBe(1);
  expect(r.hits[0].snippet.toLowerCase()).toContain("elo");
});
it("writeNote crée dans facts et refuse brain (403)", () => {
  const w = writeNote(roots, { root: "facts", id: "new-note", frontmatter: { type: "feedback" }, body: "hello", mode: "create" });
  expect(w.created).toBe(true);
  expect(existsSync(path.join(roots.facts, "new-note.md"))).toBe(true);
  expect(readFileSync(path.join(roots.facts, "new-note.md"), "utf-8")).toContain("hello");
  expect(() => writeNote(roots, { root: "brain", id: "x", body: "y", mode: "create" })).toThrowError(/lecture seule/);
});
