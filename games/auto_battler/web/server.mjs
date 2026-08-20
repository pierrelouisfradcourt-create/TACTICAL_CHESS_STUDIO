// web/server.mjs - Static file server for the auto_battler preparation screen. Transport
// ONLY — imports NOTHING from the game (deps_interdites: web -> engine|pool|shop|bench|merge|
// economy|board|preparation|round|layout|renderer|input|app).
//
// Serves index.html + every game module, INCLUDING SUB-FOLDERS (engine/, round/, preparation/,
// board/, renderer/, input/, app/, layout/, pool/, shop/, bench/, merge/, economy/,
// params.v0.mjs). Known trap: the sondes' server pattern
// (fixtures/p1/probe_clean/server.mjs:31, `ALLOWED_FILE = /^\/[a-zA-Z0-9_-]+\.(mjs|js|css|json)$/`)
// only serves ROOT-level files — reusing it verbatim here would make this game unloadable,
// since every logic module lives one folder down from games/auto_battler/.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, resolve, normalize } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..'); // games/auto_battler — web/ is one level below it
const PORT = Number(process.env.AUTO_BATTLER_PORT || 4521);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const ALLOWED_EXT = new Set(['.mjs', '.js', '.css', '.json', '.html']);

function typeFor(path) {
  return MIME[extname(path)] || 'application/octet-stream';
}

async function serveFile(res, absPath) {
  try {
    const buf = await readFile(absPath);
    res.writeHead(200, { 'Content-Type': typeFor(absPath), 'Cache-Control': 'no-store' });
    res.end(buf);
  } catch {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'not found' }));
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'méthode non supportée' }));
    }

    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === '/' || pathname === '/index.html') {
      return serveFile(res, resolve(ROOT, 'web', 'index.html'));
    }

    // No path traversal: normalize the requested path, resolve it against ROOT, then
    // re-verify the resolved absolute path is still INSIDE ROOT before touching the
    // filesystem at all (normalize() alone does not stop a resolved ../.. escape).
    const safeRel = normalize(pathname).replace(/^([/\\])+/, '');
    const absPath = resolve(ROOT, safeRel);
    if (!absPath.startsWith(ROOT)) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'chemin refusé' }));
    }
    if (!ALLOWED_EXT.has(extname(absPath))) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'extension refusée' }));
    }

    const info = await stat(absPath).catch(() => null);
    if (!info || !info.isFile()) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: 'not found: ' + pathname }));
    }

    return serveFile(res, absPath);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'erreur serveur', message: err.message }));
  }
});

server.listen(PORT, () => {
  // R10: exact marker the sensor greps for, before any measurement is attempted.
  console.log(`interface jouable: http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
