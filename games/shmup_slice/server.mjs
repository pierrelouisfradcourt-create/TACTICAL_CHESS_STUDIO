// Shmup Slice — serveur statique local minimal (Node http, zéro dépendance).
// Sert index.html + tous les modules .mjs du dossier du jeu (y compris les
// sous-dossiers logic/, data/, bot/ — le jeu N'EST PAS un unique fichier plat).
// Port pris via env.SHMUP_PORT.
//
// Lancer : node server.mjs   (puis ouvrir http://localhost:<SHMUP_PORT|8765>)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, extname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORT = Number(process.env.SHMUP_PORT || 8765);

// logic/collisions.mjs importe knowledge_base/... via un chemin relatif
// FICHIER (../../../knowledge_base/...), résolu par Node depuis le disque en
// tenant compte des 2 niveaux games/shmup_slice/logic -> repo root. Le
// NAVIGATEUR résout la même spécification relative depuis l'URL SERVIE — dont
// la racine EST DÉJÀ games/shmup_slice/ (un cran plus haut que sur disque) —
// et un `../` au-delà de la racine URL est clampé, pas remonté : la même
// chaîne relative atterrit donc sur `/knowledge_base/...` côté navigateur
// (constaté : 404 avant ce fix). On sert donc explicitement ce préfixe,
// mappé vers le VRAI dossier partagé du repo — lecture seule, mêmes garde-fous.
const KB_ROOT = resolve(__dirname, '..', '..', 'knowledge_base');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

function typeFor(path) {
  return MIME[extname(path)] || 'application/octet-stream';
}

// Autorise uniquement des sous-chemins sûrs (lettres/chiffres/-_/. et /) avec
// une extension whitelistée — pas de fichier arbitraire hors du dossier du jeu.
const ALLOWED_PATH = /^\/[a-zA-Z0-9_\-./]+\.(mjs|js|css|json|png)$/;

async function serveFile(res, base, relPath) {
  try {
    const safe = normalize(relPath).replace(/^([.][.][/\\])+/, '');
    const buf = await readFile(join(base, safe));
    res.writeHead(200, { 'Content-Type': typeFor(safe), 'Cache-Control': 'no-store' });
    res.end(buf);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found: ' + relPath);
  }
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('méthode non supportée');
  }

  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;

  if (path === '/' || path === '/index.html') {
    return serveFile(res, ROOT, 'index.html');
  }
  if (path.startsWith('/knowledge_base/') && ALLOWED_PATH.test(path) && !path.includes('..')) {
    return serveFile(res, KB_ROOT, path.slice('/knowledge_base/'.length));
  }
  if (ALLOWED_PATH.test(path) && !path.includes('..')) {
    return serveFile(res, ROOT, path.slice(1));
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('route inconnue: ' + path);
});

server.listen(PORT, () => {
  console.log('interface jouable');
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('serveur arrêté');
    process.exit(0);
  });
});
