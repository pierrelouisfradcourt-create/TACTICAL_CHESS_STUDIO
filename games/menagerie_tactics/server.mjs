// server.mjs — serveur statique zéro-dépendance. Sert index.html + les .mjs de la
// racine du jeu. Log "interface jouable" sur stdout quand prêt (contrat de jouabilité,
// attendu par e2e.mjs). Port via MENAGERIE_PORT (défaut 4530).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORT = Number(process.env.MENAGERIE_PORT || 4530);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};
function typeFor(path) {
  const dot = path.lastIndexOf(".");
  const ext = dot >= 0 ? path.slice(dot) : "";
  return MIME[ext] || "application/octet-stream";
}
const ALLOWED_FILE = /^\/[a-zA-Z0-9_-]+\.(mjs|js|css|json)$/;

async function serveFile(res, relPath, type) {
  try {
    const safe = normalize(relPath).replace(/^([.][.][/\\])+/, "");
    const buf = await readFile(join(ROOT, safe));
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    res.end(buf);
  } catch {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "not found: " + relPath }));
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.method !== "GET") {
      res.writeHead(405, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify({ error: "méthode non supportée" }));
    }
    const url = new URL(req.url, "http://localhost");
    const path = url.pathname;
    if (path === "/" || path === "/index.html") { return serveFile(res, "index.html", MIME[".html"]); }
    if (ALLOWED_FILE.test(path)) { return serveFile(res, path.slice(1), typeFor(path)); }
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "route inconnue: " + path }));
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: String(err && err.message ? err.message : err) }));
  }
});

server.listen(PORT, () => {
  console.log(`Menagerie Tactics — http://localhost:${PORT}`);
  console.log("interface jouable");
});
