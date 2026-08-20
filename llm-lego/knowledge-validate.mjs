// knowledge-validate.mjs — Phase 5 v0 : valide le contrat world-scan/v0 des knowledge packets.
// Fail-hard : tout pattern SANS citation (source_url) ou advisory_only != true => REJET.
// Deterministe, no LLM, no server. (A) tous les packets reels de knowledge/ passent ;
// (B) un packet non-cite (fixture TEMP, IMP factory) est REJETE. Lecture seule sur knowledge/.
import { readdirSync, readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Meme resolution que l'endpoint board (etape 3) : override par env, defaut llm-lego/knowledge.
const KNOWLEDGE_DIR = process.env["TCS_KNOWLEDGE_DIR"] || path.join(__dirname, "knowledge");

const URL_RE = /^https?:\/\/.+/;
const IMP_RE = /^IMP-\S+$/;
const CLAIM_MAX = 600; // resumes courts reformules — jamais de copie longue d'un texte source.
const nonEmptyStr = (v) => typeof v === "string" && v.trim().length > 0;

// Contrat world-scan/v0. Retourne { ok, errors:[] }. PUR, deterministe.
export function validatePacket(obj, label = "packet") {
  const e = [];
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { ok: false, errors: [`${label}: pas un objet JSON`] };
  if (obj.schema !== "world-scan/v0") e.push(`${label}: schema != "world-scan/v0" (recu: ${JSON.stringify(obj.schema)})`);
  if (!nonEmptyStr(obj.imp) || !IMP_RE.test(obj.imp)) e.push(`${label}: imp invalide (${obj.imp})`);
  if (!nonEmptyStr(obj.imp_title)) e.push(`${label}: imp_title vide`);
  if (!nonEmptyStr(obj.generated_ts)) e.push(`${label}: generated_ts vide`);
  if (!nonEmptyStr(obj.source_tool)) e.push(`${label}: source_tool vide`);
  // GARDE-FOU anti-injection council : le packet est advisory-only, jamais consomme par le graphe.
  if (obj.advisory_only !== true) e.push(`${label}: advisory_only doit etre true (recu: ${JSON.stringify(obj.advisory_only)})`);
  if (!nonEmptyStr(obj.no_decision)) e.push(`${label}: no_decision vide`);
  if (!nonEmptyStr(obj.caveats)) e.push(`${label}: caveats vide`);
  if (!Array.isArray(obj.queries) || obj.queries.length < 1 || !obj.queries.every(nonEmptyStr))
    e.push(`${label}: queries doit etre un tableau non vide de chaines`);
  if (!Array.isArray(obj.patterns) || obj.patterns.length < 1) {
    e.push(`${label}: patterns doit etre un tableau non vide (aucune affirmation sans pattern)`);
  } else {
    obj.patterns.forEach((p, i) => {
      const pl = `${label}.patterns[${i}]`;
      if (!p || typeof p !== "object") { e.push(`${pl}: pas un objet`); return; }
      if (!nonEmptyStr(p.claim)) e.push(`${pl}: claim vide`);
      else if (p.claim.trim().length > CLAIM_MAX) e.push(`${pl}: claim > ${CLAIM_MAX} caracteres (copie longue interdite)`);
      // CITATION OBLIGATOIRE — c'est le coeur du fail-hard.
      if (!nonEmptyStr(p.source_url) || !URL_RE.test(p.source_url)) e.push(`${pl}: source_url manquante/invalide (citation obligatoire)`);
      if (!nonEmptyStr(p.source_title)) e.push(`${pl}: source_title vide`);
      if (!nonEmptyStr(p.accessed_ts)) e.push(`${pl}: accessed_ts vide`);
      if (!nonEmptyStr(p.relevance_note)) e.push(`${pl}: relevance_note vide`);
    });
  }
  return { ok: e.length === 0, errors: e };
}

// Charge + valide tous les *.json d'un dossier (lecture seule). JSON malforme = REJET.
export function validateDir(dir) {
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : [];
  const results = files.map((f) => {
    let obj = null, parseErr = null;
    try { obj = JSON.parse(readFileSync(path.join(dir, f), "utf-8")); } catch (err) { parseErr = String((err && err.message) || err); }
    if (parseErr) return { file: f, ok: false, errors: [`JSON malforme: ${parseErr}`] };
    return { file: f, ...validatePacket(obj, f) };
  });
  return { files, results };
}

let pass = 0, fail = 0;
const check = (n, ok) => { (ok ? pass++ : fail++); console.log(`  ${ok ? "✅" : "❌"} ${n}`); };

// (A) — tous les packets REELS de knowledge/ respectent le contrat (dossier vide = rien a valider = OK).
const real = validateDir(KNOWLEDGE_DIR);
console.log(`  knowledge/ : ${real.files.length} packet(s) reel(s) — ${KNOWLEDGE_DIR}`);
if (real.files.length === 0) check("dossier knowledge/ vide (aucun packet a valider)", true);
for (const r of real.results) check(`packet conforme: ${r.file}${r.ok ? "" : " -> " + r.errors.join(" ; ")}`, r.ok);

// (B) — CAS D'ECHEC : packet NON-CITE (pattern sans source_url) => REJET.
//   Fixture ecrite dans un dossier TEMP (jamais knowledge/), IMP factory IMP-777 (pas rocky/zone gelee).
const TMP = mkdtempSync(path.join(tmpdir(), "kn-badtest-"));
const badPacket = {
  schema: "world-scan/v0", imp: "IMP-777", imp_title: "Fixture test factory (jamais reelle)",
  generated_ts: "2026-07-08T00:00:00Z", source_tool: "test", advisory_only: true,
  no_decision: "test", caveats: "test", queries: ["q"],
  patterns: [{ claim: "affirmation sans source", source_url: "", source_title: "", accessed_ts: "2026-07-08", relevance_note: "x" }],
};
writeFileSync(path.join(TMP, "IMP-777.json"), JSON.stringify(badPacket), "utf-8");
const badRes = validateDir(TMP).results[0] || { ok: true, errors: [] };
check("packet non-cite REJETE (fail-hard)", badRes.ok === false);
check("l'erreur nomme bien la citation manquante (source_url)", badRes.errors.some((m) => /source_url/.test(m)));
try { rmSync(TMP, { recursive: true, force: true }); } catch {}

// (B2) advisory_only=false REJETE (garde-fou anti-injection council).
const ok3 = [{ claim: "x", source_url: "https://a.b/c", source_title: "t", accessed_ts: "2026-07-08", relevance_note: "x" }];
const noAdv = validatePacket({ ...badPacket, advisory_only: false, patterns: ok3 }, "no-adv");
check("advisory_only=false REJETE", noAdv.ok === false && noAdv.errors.some((m) => /advisory_only/.test(m)));

// (B3) claim > 600 (copie longue) REJETE.
const longC = validatePacket({ ...badPacket, patterns: [{ ...ok3[0], claim: "x".repeat(601) }] }, "long");
check("claim > 600 caracteres (copie longue) REJETE", longC.ok === false && longC.errors.some((m) => /600/.test(m)));

// resultat machine + code retour fail-hard (convention *_validation_result.json).
// dir repo-relatif (jamais de chemin absolu dans l'artefact commite — cf. CLAUDE.md).
const dirRel = path.relative(path.join(__dirname, ".."), KNOWLEDGE_DIR).split(path.sep).join("/");
const result = { when: new Date().toISOString(), dir: dirRel, realPackets: real.results, checks: { pass, fail } };
writeFileSync(path.join(__dirname, "knowledge_validation_result.json"), JSON.stringify(result, null, 2), "utf-8");
console.log(`\n  knowledge-validate: ${fail === 0 ? `✅ ${pass}/${pass} PASS` : `❌ ${fail} FAIL`}`);
process.exit(fail === 0 ? 0 : 1);
