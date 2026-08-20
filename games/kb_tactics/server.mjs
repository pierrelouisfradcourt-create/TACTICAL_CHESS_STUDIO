// kb_tactics — serveur statique local (Node http, zéro dépendance).
// Sert (a) les fichiers racine du jeu, ET (b) en LECTURE SEULE les briques/assets ingérés
// depuis knowledge_base/ — c'est ce qui permet à main.mjs/game.mjs d'IMPORTER RÉELLEMENT
// les systems et de charger les ASSETS ingérés dans le navigateur (pas de copie).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, resolve, sep } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const REPO_ROOT = resolve(__dirname, "..", "..");
const KB_ROOT = join(REPO_ROOT, "knowledge_base");
const PORT = Number(process.env.KB_TACTICS_PORT || 4611);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

function typeFor(path) {
  const dot = path.lastIndexOf(".");
  const ext = dot >= 0 ? path.slice(dot) : "";
  return MIME[ext] || "application/octet-stream";
}

// Fichiers racine du jeu (mjs/js/css/json/png), pas de sous-dossier.
const GAME_FILE = /^\/[a-zA-Z0-9_-]+\.(mjs|js|css|json|png)$/;
// Briques/assets ingérés : uniquement sous systems/ ou assets/, extensions restreintes, pas de '..'.
const KB_FILE = /^\/knowledge_base\/(systems|assets)\/[a-zA-Z0-9_\/-]+\.(mjs|png)$/;

async function serveAbs(res, absPath, type) {
  try {
    const buf = await readFile(absPath);
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(buf);
  } catch {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "not found" }));
  }
}

// Garde anti-traversée : le chemin résolu doit rester DANS baseDir.
function safeJoin(baseDir, relPath) {
  const abs = resolve(baseDir, "." + normalize(relPath).replace(/^([.][.][/\\])+/, "/"));
  if (abs !== baseDir && !abs.startsWith(baseDir + sep)) return null;
  return abs;
}

const server = createServer(async (req, res) => {
  try {
    if (req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ error: "méthode non supportée" }));
    }
    const path = new URL(req.url, "http://localhost").pathname;

    if (path === "/" || path === "/index.html") {
      return serveAbs(res, join(ROOT, "index.html"), MIME[".html"]);
    }
    if (KB_FILE.test(path)) {
      // strip "/knowledge_base" et rejoindre sous KB_ROOT avec garde
      const rel = path.replace(/^\/knowledge_base/, "");
      const abs = safeJoin(KB_ROOT, rel);
      if (!abs) { res.writeHead(403); return res.end("forbidden"); }
      return serveAbs(res, abs, typeFor(path));
    }
    if (GAME_FILE.test(path)) {
      const abs = safeJoin(ROOT, path);
      if (!abs) { res.writeHead(403); return res.end("forbidden"); }
      return serveAbs(res, abs, typeFor(path));
    }
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "route inconnue: " + path }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "erreur serveur", message: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`interface jouable: http://localhost:${PORT}`);
});

process.on("SIGTERM", () => {
  server.close(() => { console.log("serveur arrêté"); process.exit(0); });
});
