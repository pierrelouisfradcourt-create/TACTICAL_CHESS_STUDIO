// hygiene-scan.mjs — capteur d'hygiène code DÉTERMINISTE (Phase 3). LECTURE seule du code,
// écrit UN SEUL rapport : llm-lego/hygiene_report.json. Deux déclencheurs (manuel + cron
// self-hosted) écrivent ce même fichier. AUCUN LLM, AUCUNE écriture au ledger, AUCUN git.
//
// Deux sondes, toutes deux issues d'outils déjà présents (aucun outil ajouté) :
//   1. Rust dead_code / unused  — `cargo build --release --message-format=json` (natif cargo)
//   2. TODO/FIXME orphelins      — marche d'arbre Node + regex (pas de dépendance à ripgrep)
//      « orphelin » = TODO/FIXME SANS référence IMP-/TASK-/KI- (la règle pre-commit ne couvre
//      que les lignes AJOUTÉES dans src/*.rs et ml/*.py ; ici on voit le STOCK, repo-wide).
//
// Usage :  node hygiene-scan.mjs                 # scan complet (rust + todo)
//          node hygiene-scan.mjs --trigger=cron  # idem, étiquette la source
//          HYGIENE_SKIP_RUST=1 node hygiene-scan.mjs   # todo seul (rust marqué skipped)
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(__dirname, "hygiene_report.json");
const SAMPLE_CAP = 10;

const arg = (name) => (process.argv.find((a) => a.startsWith(`--${name}=`)) || "").split("=")[1] || null;
const TRIGGER = arg("trigger") || "manual";

// --- Sonde 1 : Rust dead_code / unused (cargo, message-format=json) ----------------------
// cargo REJOUE les warnings en cache (build no-op → mêmes warnings), donc robuste et rapide
// sur cache chaud. Dédup par (code, fichier:ligne, message) : un warning bâti pour plusieurs
// cibles ne compte qu'une fois.
function scanRust() {
  if (process.env["HYGIENE_SKIP_RUST"] === "1") {
    return { available: false, skipped: true, reason: "HYGIENE_SKIP_RUST=1 (scan léger, rust non exécuté)" };
  }
  const r = spawnSync("cargo", ["build", "--release", "--message-format=json"], {
    cwd: REPO_ROOT, encoding: "utf-8", maxBuffer: 128 * 1024 * 1024, timeout: 300000,
    shell: process.platform === "win32", // résolution PATH de cargo.exe sous Windows
  });
  if (r.error && r.error.code === "ENOENT") {
    return { available: false, skipped: false, reason: "cargo introuvable dans le PATH" };
  }
  const stdout = r.stdout || "";
  const seen = new Set();
  const byCode = {}, byFile = {}, samples = [];
  let total = 0;
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let m; try { m = JSON.parse(line); } catch { continue; }
    if (m.reason !== "compiler-message") continue;
    const msg = m.message || {};
    if (msg.level !== "warning") continue;
    const code = (msg.code && msg.code.code) || "(no-code)";
    // on ne retient que les codes d'hygiène (dead code / unused), pas tous les warnings
    if (!/^(dead_code|unused_)/.test(code)) continue;
    const sp = (msg.spans || []).find((x) => x.is_primary) || (msg.spans || [])[0] || {};
    const file = (sp.file_name || "?").replace(/\\/g, "/");
    const key = `${code}|${file}:${sp.line_start || 0}|${msg.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    total++;
    byCode[code] = (byCode[code] || 0) + 1;
    byFile[file] = (byFile[file] || 0) + 1;
    if (samples.length < SAMPLE_CAP) samples.push({ file, line: sp.line_start || 0, code, message: msg.message });
  }
  // build a réellement tourné ? status 0 attendu ; on garde available=true dès qu'on a du JSON exploitable
  return {
    available: true,
    skipped: false,
    exit: r.status,
    total,
    byCode,
    topFiles: Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([file, n]) => ({ file, n })),
    samples,
  };
}

// --- Sonde 2 : TODO/FIXME orphelins ------------------------------------------------------
// Fichiers SUIVIS par git (`git ls-files`) → respecte .gitignore, ignore les vendorés
// (infra/superpowers, tools/…) et les non-suivis. Pattern RESSERRÉ : le marqueur doit être
// ancré dans un COMMENTAIRE (// # <!-- /*), pas le mot en prose — sinon on capte les fichiers
// qui DÉCRIVENT la convention (grep "TODO|FIXME", tableaux d'audit, la règle pre-commit).
// « orphelin » = tel commentaire SANS référence (IMP|TASK|KI)-… . Le scanner s'exclut lui-même
// (il contient nécessairement les jetons dans ses propres regex).
const SCAN_EXT = new Set([".rs", ".py", ".pyx", ".mjs", ".js", ".ts", ".tsx", ".html", ".sh", ".md", ".yaml", ".yml", ".toml"]);
const SELF = "llm-lego/hygiene-scan.mjs";
const TODO_RE = /(\/\/|#|<!--|\/\*)\s*(TODO|FIXME)\b/;      // marqueur en commentaire
const REF_RE = /(IMP|TASK|KI)-[0-9X]/;                     // référencé (IMP-nnn ou template) → conforme

function trackedFiles() {
  const r = spawnSync("git", ["ls-files"], {
    cwd: REPO_ROOT, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === "win32",
  });
  if (r.error || r.status !== 0 || !r.stdout) return { files: [], gitOk: false };
  const files = r.stdout.split(/\r?\n/).filter(Boolean).filter((f) => SCAN_EXT.has(path.extname(f)) && f !== SELF);
  return { files, gitOk: true };
}

function scanTodo() {
  const { files, gitOk } = trackedFiles();
  const byFile = {}, samples = [];
  let orphans = 0, filesScanned = 0;
  for (const rel of files) {
    let text;
    try { text = readFileSync(path.join(REPO_ROOT, rel), "utf-8"); } catch { continue; }
    filesScanned++;
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i];
      if (!TODO_RE.test(ln) || REF_RE.test(ln)) continue;
      orphans++;
      byFile[rel] = (byFile[rel] || 0) + 1;
      if (samples.length < SAMPLE_CAP) samples.push({ file: rel, line: i + 1, text: ln.trim().slice(0, 160) });
    }
  }
  return {
    gitOk,
    filesScanned,
    orphans,
    topFiles: Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([file, n]) => ({ file, n })),
    samples,
  };
}

// --- Assemblage + écriture (fichier unique) ----------------------------------------------
const report = {
  generated: new Date().toISOString(),
  trigger: TRIGGER,
  deterministic: true,
  writesLedger: false, // invariant affiché : ce capteur ne crée jamais d'IMP. Geste explicite = kaizen_loop.
  sources: {
    rust: "cargo build --release --message-format=json (codes dead_code / unused_*), dédup par span",
    todo: "marche d'arbre Node : \\b(TODO|FIXME)\\b sans réf (IMP|TASK|KI)-… (orphelins), repo-wide",
  },
  rust: scanRust(),
  todo: scanTodo(),
};

writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf-8");

const rz = report.rust.available ? `${report.rust.total} (dead/unused)` : `skipped (${report.rust.reason})`;
console.log(`hygiene-scan (${TRIGGER}) → ${path.relative(REPO_ROOT, REPORT_PATH).replace(/\\/g, "/")}`);
console.log(`  rust : ${rz}`);
console.log(`  todo : ${report.todo.orphans} orphelin(s) sur ${report.todo.filesScanned} fichiers`);
