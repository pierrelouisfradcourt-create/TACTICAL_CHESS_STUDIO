import { it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { cosine, buildOrUpdateIndex, recall, PREFIXES_VERSION, lmStudioEmbed } from "../memory-recall.mjs";

// Embedder mock : bag-of-words sur un vocab fixe → cosinus déterministe. Compte les appels.
const VOCAB = ["chess", "elo", "belote", "memoire"];
let embedCalls: string[][];
const mockEmbed = async (texts: string[]) => {
  embedCalls.push(texts);
  return texts.map((t) => VOCAB.map((w) => (t.toLowerCase().includes(w) ? 1 : 0)));
};

let roots: { brain: string; facts: string }, idx: string;
beforeEach(() => {
  const brain = mkdtempSync(path.join(tmpdir(), "rb-"));
  const facts = mkdtempSync(path.join(tmpdir(), "rf-"));
  writeFileSync(path.join(brain, "a.md"), "# Chess engine\n\nRocky ELO progresse.", "utf-8");
  writeFileSync(path.join(facts, "b.md"), "# Belote\n\nlaboratoire de methode.", "utf-8");
  roots = { brain, facts }; idx = path.join(facts, ".idx.json"); embedCalls = [];
});
afterEach(() => { rmSync(roots.brain, { recursive: true, force: true }); rmSync(roots.facts, { recursive: true, force: true }); });

it("cosine : identiques→1, orthogonaux→0", () => {
  expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
  expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
});
it("buildOrUpdateIndex embeddée les 2 notes avec prefixes v1", async () => {
  const index = await buildOrUpdateIndex(roots, { embed: mockEmbed, indexPath: idx, model: "m" });
  expect(index.prefixes).toBe(PREFIXES_VERSION);
  expect(Object.keys(index.entries).sort()).toEqual(["brain/a", "facts/b"]);
  expect(embedCalls[0].every((t) => t.startsWith("search_document: "))).toBe(true);
});
it("réindex incrémental : note inchangée non ré-embeddée, note modifiée ré-embeddée", async () => {
  await buildOrUpdateIndex(roots, { embed: mockEmbed, indexPath: idx, model: "m" });
  embedCalls = [];
  writeFileSync(path.join(roots.brain, "a.md"), "# Chess engine v2\n\nRocky ELO monte.", "utf-8");
  await buildOrUpdateIndex(roots, { embed: mockEmbed, indexPath: idx, model: "m" });
  const embeddedTexts = embedCalls.flat();
  expect(embeddedTexts.length).toBe(1);
  expect(embeddedTexts[0]).toContain("Chess engine v2");
});
it("changement de model → rebuild complet", async () => {
  await buildOrUpdateIndex(roots, { embed: mockEmbed, indexPath: idx, model: "m1" });
  embedCalls = [];
  await buildOrUpdateIndex(roots, { embed: mockEmbed, indexPath: idx, model: "m2" });
  expect(embedCalls.flat().length).toBe(2);
});
it("recall classe par similarité (requête préfixée search_query)", async () => {
  const r = await recall(roots, "chess elo", { embed: mockEmbed, indexPath: idx, model: "m", k: 2 });
  expect(r.hits[0].id).toBe("a");
  expect(r.hits[0].score).toBeGreaterThan(r.hits[1].score);
  expect(embedCalls.some((c) => c.some((t) => t.startsWith("search_query: ")))).toBe(true);
});
it("lmStudioEmbed sur port mort → EMBED_UNAVAILABLE (rapide)", async () => {
  await expect(
    lmStudioEmbed(["x"], { url: "http://127.0.0.1:59999", timeoutMs: 1500 })
  ).rejects.toMatchObject({ code: "EMBED_UNAVAILABLE" });
});
