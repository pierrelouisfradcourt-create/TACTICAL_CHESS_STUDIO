// server.mjs — serveur HTTP statique minimal (Node natif, ZÉRO dépendance npm).
// Sert index.html et les modules .mjs de ce dossier pour exécuter le jeu hors-ligne.

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 8123;
const HOST = process.env.HOST || '127.0.0.1';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

/**
 * Résout une URL de requête vers un chemin fichier sûr sous __dirname.
 * @param {string} requestUrl
 * @returns {string}
 */
function resolveRequestPath(requestUrl) {
  const decoded = decodeURIComponent((requestUrl || '/').split('?')[0]);
  const cleaned = decoded === '/' ? '/index.html' : decoded;
  const safeSuffix = path.normalize(cleaned).replace(/^(\.\.[/\\])+/, '');
  return path.join(__dirname, safeSuffix);
}

async function handleRequest(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  const filePath = resolveRequestPath(req.url);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end('Internal Server Error');
    console.error('[server.mjs] erreur non gérée', err);
  });
});

// N'écoute que si ce fichier est exécuté directement (pas lors d'un import en test).
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  server.listen(PORT, HOST, () => {
    console.log(`Breakout control server listening on http://${HOST}:${PORT}`);
  });
}

export { server, PORT, HOST };
